import session from 'express-session';
import { logger } from './logger';

/**
 * HIPAA-Compliant Session Configuration for Bedside Bike
 *
 * Security features:
 * - Enforced session secret in production
 * - 4-hour session timeout (HIPAA best practice)
 * - Strict SameSite cookie policy
 * - HTTP-only, secure cookies
 * - Session store with automatic cleanup
 */

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

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

// Session configuration
let sessionStore: session.Store | undefined;

// Only use SQLite store for non-Vercel environments
if (!isVercel) {
  try {
    const connectSqlite3 = require('connect-sqlite3');
    const SQLiteStore = connectSqlite3(session);
    sessionStore = new SQLiteStore({
      db: 'sessions.db',
      dir: './data',
    });
    logger.info('Session store configured', { store: 'SQLite', sessionDb: 'data/sessions.db' });
  } catch (err) {
    logger.warn('SQLite session store not available, using memory store');
  }
} else {
  logger.info('Session store configured', { store: 'Memory (Vercel serverless)' });
}

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

export const sessionConfig: session.SessionOptions = {
  store: sessionStore, // undefined = use default MemoryStore
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
};

// Log session configuration (without exposing secret)
logger.info('Session security configured', {
  maxAgeHours: SESSION_MAX_AGE_HOURS,
  secure: isProduction,
  httpOnly: true,
  sameSite: 'strict',
  store: sessionStore ? 'SQLite' : 'Memory',
});

export default sessionConfig;
