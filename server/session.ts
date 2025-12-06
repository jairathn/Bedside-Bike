import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import { logger } from './logger';

/**
 * Session configuration for Bedside Bike
 * Uses SQLite-backed sessions for persistence across server restarts
 */

const SQLiteStore = connectSqlite3(session);

// Generate a secure session secret (in production, use environment variable)
const SESSION_SECRET = process.env.SESSION_SECRET || 'bedside-bike-development-secret-change-in-production';

if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  logger.warn('No SESSION_SECRET environment variable set! Using default (insecure for production)');
}

// Session configuration
export const sessionConfig: session.SessionOptions = {
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './data',
  }),
  secret: SESSION_SECRET,
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax', // CSRF protection
  },
  name: 'bedside.sid', // Custom session cookie name
};

logger.info('Session store configured', {
  store: 'SQLite',
  sessionDb: 'data/sessions.db',
  cookieMaxAge: '30 days',
  secure: sessionConfig.cookie?.secure,
});

export default sessionConfig;
