import winston from 'winston';
import type { Request, Response, NextFunction } from 'express';

/**
 * Structured logging system for Bedside Bike
 * Uses Winston for flexible, production-ready logging
 */

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Console format for development (more readable)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console output
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? format : consoleFormat,
  }),
  // Error log file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format,
  }),
  // Combined log file
  new winston.transports.File({
    filename: 'logs/combined.log',
    format,
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * HTTP Request Logger Middleware
 * Logs all incoming HTTP requests with timing information
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    // Log as http level
    if (res.statusCode >= 500) {
      logger.error('HTTP Request Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request Warning', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });

  next();
}

/**
 * Error Logger Middleware
 * Catches and logs all unhandled errors in Express
 */
export function errorLogger(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    ip: req.ip,
  });

  // Pass to next error handler
  next(err);
}

/**
 * Stream for Morgan HTTP logger
 * Redirects Morgan logs to Winston
 */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Log unhandled promise rejections
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  console.error('\n❌ UNHANDLED PROMISE REJECTION:');
  console.error('Reason:', reason);
  console.error('Stack:', reason.stack);
  logger.error('Unhandled Promise Rejection', {
    reason: reason.message,
    stack: reason.stack,
    promise,
  });
});

// Log uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  // Exit process after logging
  process.exit(1);
});

// Export convenience methods
export default logger;
