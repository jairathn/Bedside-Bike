/**
 * HIPAA-Compliant Authentication Middleware
 *
 * This module provides authentication and authorization middleware for protecting
 * PHI (Protected Health Information) endpoints according to HIPAA requirements.
 *
 * Key features:
 * - Session-based authentication verification
 * - Role-based access control (patient, provider, caregiver)
 * - Patient data access authorization
 * - Provider-patient relationship verification
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { auditLog, AuditAction } from './audit';

// Extend Express Session to include user data
declare module 'express-session' {
  interface SessionData {
    userId: number;
    userType: 'patient' | 'provider' | 'caregiver';
    email: string;
    firstName: string;
    lastName: string;
  }
}

// Extend Express Request to include authenticated user info
declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: {
        id: number;
        userType: 'patient' | 'provider' | 'caregiver';
        email: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}

/**
 * Middleware that requires a valid authenticated session.
 * Returns 401 Unauthorized if no valid session exists.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Attach user info to request for downstream use
  req.authenticatedUser = {
    id: req.session.userId,
    userType: req.session.userType,
    email: req.session.email,
    firstName: req.session.firstName,
    lastName: req.session.lastName,
  };

  next();
};

/**
 * Middleware that requires the user to be a provider.
 * Must be used after requireAuth middleware.
 */
export const requireProvider = (req: Request, res: Response, next: NextFunction) => {
  if (!req.authenticatedUser) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.authenticatedUser.userType !== 'provider') {
    // Log unauthorized access attempt
    auditLog({
      userId: req.authenticatedUser.id,
      action: AuditAction.ACCESS_DENIED,
      resourceType: 'PROVIDER_ENDPOINT',
      resourceId: null,
      details: {
        endpoint: req.path,
        userType: req.authenticatedUser.userType,
        reason: 'Provider access required'
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    });

    return res.status(403).json({
      error: 'Provider access required',
      code: 'PROVIDER_REQUIRED'
    });
  }

  next();
};

/**
 * Middleware that requires the user to be a patient.
 * Must be used after requireAuth middleware.
 */
export const requirePatient = (req: Request, res: Response, next: NextFunction) => {
  if (!req.authenticatedUser) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.authenticatedUser.userType !== 'patient') {
    return res.status(403).json({
      error: 'Patient access required',
      code: 'PATIENT_REQUIRED'
    });
  }

  next();
};

/**
 * Middleware that requires the user to be a caregiver.
 * Must be used after requireAuth middleware.
 */
export const requireCaregiver = (req: Request, res: Response, next: NextFunction) => {
  if (!req.authenticatedUser) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.authenticatedUser.userType !== 'caregiver') {
    return res.status(403).json({
      error: 'Caregiver access required',
      code: 'CAREGIVER_REQUIRED'
    });
  }

  next();
};

/**
 * Middleware that authorizes access to a specific patient's data.
 * Allows access if:
 * - User is the patient themselves
 * - User is a provider with an active relationship to the patient
 * - User is a caregiver with an active relationship to the patient
 *
 * Must be used after requireAuth middleware.
 * Expects :patientId or :id parameter in the route.
 */
export const authorizePatientAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.authenticatedUser) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const patientId = parseInt(req.params.patientId || req.params.id);

  if (isNaN(patientId)) {
    return res.status(400).json({
      error: 'Invalid patient identifier',
      code: 'INVALID_PATIENT_ID'
    });
  }

  const { id: userId, userType } = req.authenticatedUser;

  // Patient accessing their own data
  if (userType === 'patient' && userId === patientId) {
    return next();
  }

  // Provider accessing patient data - verify relationship
  if (userType === 'provider') {
    try {
      const hasAccess = await storage.hasProviderAccessToPatient(userId, patientId);
      if (hasAccess) {
        return next();
      }
    } catch (error) {
      console.error('Error checking provider access:', error);
    }

    // Log unauthorized access attempt
    auditLog({
      userId,
      action: AuditAction.ACCESS_DENIED,
      resourceType: 'PATIENT_DATA',
      resourceId: patientId,
      details: {
        endpoint: req.path,
        reason: 'No provider-patient relationship'
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    });

    return res.status(403).json({
      error: 'Access denied to this patient\'s data',
      code: 'PATIENT_ACCESS_DENIED'
    });
  }

  // Caregiver accessing patient data - verify relationship
  if (userType === 'caregiver') {
    try {
      const hasAccess = await storage.hasCaregiverAccessToPatient(userId, patientId);
      if (hasAccess) {
        return next();
      }
    } catch (error) {
      console.error('Error checking caregiver access:', error);
    }

    // Log unauthorized access attempt
    auditLog({
      userId,
      action: AuditAction.ACCESS_DENIED,
      resourceType: 'PATIENT_DATA',
      resourceId: patientId,
      details: {
        endpoint: req.path,
        reason: 'No caregiver-patient relationship'
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    });

    return res.status(403).json({
      error: 'Access denied to this patient\'s data',
      code: 'PATIENT_ACCESS_DENIED'
    });
  }

  // Default deny
  auditLog({
    userId,
    action: AuditAction.ACCESS_DENIED,
    resourceType: 'PATIENT_DATA',
    resourceId: patientId,
    details: {
      endpoint: req.path,
      userType,
      reason: 'Unauthorized user type'
    },
    ipAddress: req.ip || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  });

  return res.status(403).json({
    error: 'Access denied',
    code: 'ACCESS_DENIED'
  });
};

/**
 * Middleware that allows access to patient's own data or any authenticated provider.
 * Less restrictive than authorizePatientAccess - used for endpoints where any provider
 * should have access (e.g., viewing available patients).
 */
export const authorizePatientOrProvider = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.authenticatedUser) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const patientId = parseInt(req.params.patientId || req.params.id);
  const { id: userId, userType } = req.authenticatedUser;

  // Patient accessing their own data
  if (userType === 'patient' && userId === patientId) {
    return next();
  }

  // Any provider can access (for listing, assignment, etc.)
  if (userType === 'provider') {
    return next();
  }

  // Caregiver accessing patient data - verify relationship
  if (userType === 'caregiver') {
    try {
      const hasAccess = await storage.hasCaregiverAccessToPatient(userId, patientId);
      if (hasAccess) {
        return next();
      }
    } catch (error) {
      console.error('Error checking caregiver access:', error);
    }
  }

  return res.status(403).json({
    error: 'Access denied',
    code: 'ACCESS_DENIED'
  });
};

/**
 * Helper function to set session data after successful authentication.
 * Should be called in login routes after validating credentials.
 * Returns a Promise that resolves when the session is saved.
 */
export const setAuthSession = (
  req: Request,
  user: { id: number; userType: string; email: string; firstName: string; lastName: string }
): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.userId = user.id;
    req.session.userType = user.userType as 'patient' | 'provider' | 'caregiver';
    req.session.email = user.email || '';
    req.session.firstName = user.firstName;
    req.session.lastName = user.lastName;

    // Explicitly save the session to ensure it's persisted before response
    req.session.save((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Helper function to clear session data on logout.
 */
export const clearAuthSession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
