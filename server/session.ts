import session from 'express-session';
import { logger } from './logger';
import pg from 'pg';

/**
 * HIPAA-Compliant Session Configuration for Bedside Bike
 *
 * Security features:
 * - Enforced session secret in production
 * - 4-hour session timeout (HIPAA best practice)
 * - Strict SameSite cookie policy
 * - HTTP-only, secure cookies
 * - PostgreSQL session store for Vercel (persists across serverless invocations)
 * - SQLite session store for local development
 */

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL?.includes('postgres');

// HIPAA Requirement: Enforce secure session secret in production
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  if (isProduction) {
    // In production, SESSION_SECRET is REQUIRED for HIPAA compliance
    logger.error('CRITICAL: SESSION_SECRET environment variable is required in production for HIPAA compliance');
    throw new Error('SESSION_SECRET environment variable is required in production');
  } else {
    // In development, use a default but log a warning
    logger.warn('SECURITY WARNING: No SESSION_SECRET set. Using development default. Set SESSION_SECRET before production deployment.');
  }
}

// Use the environment variable or a development-only default
const secret = SESSION_SECRET || 'bedside-bike-dev-secret-DO-NOT-USE-IN-PROD';

/**
 * HIPAA-Compliant Session Timeouts:
 * - 4 hours maximum session duration (reduces risk of unauthorized access)
 * - In production, consider implementing idle timeout as well
 *
 * HIPAA Security Rule 164.312(a)(2)(iii) requires automatic logoff
 * after a period of inactivity.
 */
const SESSION_MAX_AGE_HOURS = 4;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_HOURS * 60 * 60 * 1000;

// Session configuration - store will be set asynchronously
let sessionStore: session.Store | undefined;
let sessionStoreType = 'Memory';

/**
 * Initialize session store based on environment
 * - Vercel/Production with Postgres: Use PostgreSQL store (persists across serverless invocations)
 * - Local development: Use SQLite store
 * - Fallback: Memory store (not recommended for production)
 */
async function initializeSessionStore(): Promise<session.Store | undefined> {
  // For Vercel or when using PostgreSQL, use connect-pg-simple
  if ((isVercel || isProduction) && usePostgres && process.env.DATABASE_URL) {
    try {
      const connectPgSimple = require('connect-pg-simple');
      const PgStore = connectPgSimple(session);

      // Create a dedicated pool for sessions
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
        },
        max: 5, // Limit connections for session store
      });

      // Create sessions table if it doesn't exist
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
          );
          CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);
        logger.info('Session table verified/created in PostgreSQL');
      } catch (tableErr) {
        logger.warn('Could not create session table (may already exist)', { error: (tableErr as Error).message });
      }

      const store = new PgStore({
        pool,
        tableName: 'session',
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
      });

      sessionStoreType = 'PostgreSQL';
      logger.info('Session store configured', { store: 'PostgreSQL', pruneInterval: '15 minutes' });
      return store;
    } catch (err) {
      logger.error('Failed to initialize PostgreSQL session store', { error: (err as Error).message });
      // Fall through to memory store
    }
  }

  // For local development without Postgres, use SQLite
  if (!isVercel && !usePostgres) {
    try {
      const connectSqlite3 = require('connect-sqlite3');
      const SQLiteStore = connectSqlite3(session);
      const store = new SQLiteStore({
        db: 'sessions.db',
        dir: './data',
      });
      sessionStoreType = 'SQLite';
      logger.info('Session store configured', { store: 'SQLite', sessionDb: 'data/sessions.db' });
      return store;
    } catch (err) {
      logger.warn('SQLite session store not available', { error: (err as Error).message });
    }
  }

  // Fallback to memory store (WARNING: not suitable for production/serverless!)
  if (isVercel || isProduction) {
    logger.error('CRITICAL: Using MemoryStore in production/Vercel - sessions will NOT persist between requests!');
  } else {
    logger.warn('Using in-memory session store (development only)');
  }
  sessionStoreType = 'Memory';
  return undefined;
}

// Initialize store immediately
const storePromise = initializeSessionStore().then(store => {
  sessionStore = store;
  return store;
});

// Export a function to get the configured session middleware
export async function getSessionMiddleware(): Promise<ReturnType<typeof session>> {
  const store = await storePromise;

  return session({
    store: store,
    secret: secret,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset session expiration on activity
    cookie: {
      // HIPAA: Always use secure cookies in production
      secure: isProduction,
      // HIPAA: Prevent client-side JavaScript access to session cookie
      httpOnly: true,
      // HIPAA-compliant session timeout: 4 hours max
      maxAge: SESSION_MAX_AGE_MS,
      // HIPAA: Strict SameSite policy prevents CSRF attacks
      sameSite: 'strict',
    },
    name: 'bedside.sid',
  });
}

// For backwards compatibility, also export a synchronous config
// (will use whatever store is available at the time)
export const sessionConfig: session.SessionOptions = {
  store: sessionStore, // May be undefined initially
  secret: secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_MS,
    sameSite: 'strict',
  },
  name: 'bedside.sid',
};

// Log session configuration (without exposing secret)
logger.info('Session security configured', {
  maxAgeHours: SESSION_MAX_AGE_HOURS,
  secure: isProduction,
  httpOnly: true,
  sameSite: 'strict',
  isVercel,
  usePostgres,
});

export default sessionConfig;
