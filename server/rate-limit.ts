import rateLimit from 'express-rate-limit';

/**
 * Rate limiting configuration for Bedside Bike API
 * Protects against abuse, DoS attacks, and excessive API usage
 */

// General API rate limit - applies to all API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Store in memory (for production, consider Redis store)
});

// Strict rate limit for authentication endpoints
// Prevents brute force attacks on login
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for risk assessment endpoint
// This is computationally expensive and calls external AI services
export const riskAssessmentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 risk assessments per minute
  message: 'Too many risk assessments, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for goal/session creation
// Prevents spam creation of records
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 creates per minute
  message: 'Too many creation requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for kudos/reactions
// Prevents spam reactions
export const kudosLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 kudos per minute
  message: 'Too many kudos reactions, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});
