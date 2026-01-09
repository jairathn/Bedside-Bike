import session from 'express-session';
import { logger } from './logger';

/**
 * Session configuration for Bedside Bike
 * Uses memory store for Vercel/serverless, SQLite for local development
 */

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL === '1';

// Generate a secure session secret (in production, use environment variable)
const SESSION_SECRET = process.env.SESSION_SECRET || 'bedside-bike-development-secret-change-in-production';

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  logger.warn('No SESSION_SECRET environment variable set! Using default (insecure for production)');
}

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

export const sessionConfig: session.SessionOptions = {
  store: sessionStore, // undefined = use default MemoryStore
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax',
  },
  name: 'bedside.sid',
};

export default sessionConfig;
