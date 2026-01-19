import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { logger } from "./logger";
// HIPAA-Compliant Authentication & Audit Middleware
import {
  requireAuth,
  requireProvider,
  requirePatient,
  requireCaregiver,
  authorizePatientAccess,
  authorizePatientOrProvider,
  setAuthSession,
  clearAuthSession,
} from "./middleware/auth";
import {
  auditLog,
  auditAuthEvent,
  createAuditMiddleware,
  AuditAction,
  ResourceType,
} from "./middleware/audit";
import { updateRollingDataWindow } from "./rolling-data";
import { patientStats, users, providerPatients, patientGoals, exerciseSessions, patientPreferences, feedItems, nudgeMessages, kudosReactions, caregiverPatients } from "@shared/schema";
import { eq, and, desc, gte, inArray, sql } from "drizzle-orm";
import { calculateRisks } from "./risk-calculator";
// Removed duplicate calculator - using only central risk calculator
import { kudosService } from "./kudos-service";
import {
  apiLimiter,
  authLimiter,
  riskAssessmentLimiter,
  createLimiter,
  kudosLimiter
} from "./rate-limit";
import { registerPersonalizationRoutes } from "./personalization/routes";
import { calculateEquivalentWatts, feetInchesToCm, lbsToKg } from "./watts-calculator";
import {
  loginSchema,
  patientRegistrationSchema,
  providerRegistrationSchema,
  caregiverRegistrationSchema,
  caregiverObservationSchema,
  observationSchema,
  caregiverAccessRequestSchema,
  caregiverInviteSchema,
  providerAccessRequestSchema,
  riskAssessmentInputSchema,
  insertExerciseSessionSchema,
  insertPatientGoalSchema,
  caregiverPatients,
  caregiverObservations,
  observations,
  caregiverNotifications,
  type LoginData,
  type PatientRegistration,
  type ProviderRegistration,
  type CaregiverRegistration,
  type RiskAssessmentInput,
  type InsertExerciseSession,
  type InsertPatientGoal
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication system already configured

  // Seed initial provider data
  await seedInitialData();

  // Health Check Endpoints

  // Basic health check - returns 200 OK if server is running
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Detailed health check - includes database connectivity
  app.get("/health/detailed", async (req, res) => {
    const healthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: "unknown",
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB"
      }
    };

    // Check database connectivity
    try {
      await db.select().from(users).limit(1);
      healthCheck.database = "connected";
    } catch (error) {
      healthCheck.status = "degraded";
      healthCheck.database = "disconnected";
    }

    const statusCode = healthCheck.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  });

  // Auth Routes

  // Patient/Provider Registration
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { userType, tosAccepted, tosVersion } = req.body;

      // Require Terms of Service acceptance for all registrations
      if (!tosAccepted) {
        return res.status(400).json({ error: "You must accept the Terms of Service to create an account" });
      }

      if (userType === 'patient') {
        const patientData = patientRegistrationSchema.parse(req.body) as PatientRegistration;

        // Check if patient already exists
        const existingPatient = await storage.getUserByEmail(patientData.email);
        if (existingPatient) {
          return res.status(400).json({ error: "Patient already exists with this email" });
        }

        // Convert height/weight to metric if provided in imperial
        let heightCm = patientData.heightCm;
        let weightKg = patientData.weightKg;

        if (patientData.heightUnit === 'imperial' && patientData.heightFeet !== undefined) {
          heightCm = feetInchesToCm(patientData.heightFeet, patientData.heightInches || 0);
        }

        if (patientData.weightUnit === 'imperial' && patientData.weightLbs !== undefined) {
          weightKg = lbsToKg(patientData.weightLbs);
        }

        // Create patient with ToS acceptance timestamp and physical measurements
        const { tosAccepted: _, heightFeet, heightInches, weightLbs, ...patientDataWithoutTos } = patientData as any;
        const patient = await storage.createUser({
          ...patientDataWithoutTos,
          heightCm,
          weightKg,
          tosAcceptedAt: new Date(),
          tosVersion: tosVersion || '1.0.0',
        });

        // HIPAA: Set server-side session after registration
        await setAuthSession(req, patient);
        auditAuthEvent(req, AuditAction.LOGIN_SUCCESS, patient.id, true, { method: 'registration', userType: 'patient' });

        res.json({ user: patient });

      } else if (userType === 'provider') {
        const providerData = providerRegistrationSchema.parse(req.body) as ProviderRegistration;

        // Check if provider already exists
        const existingProvider = await storage.getUserByEmail(providerData.email);
        if (existingProvider) {
          return res.status(400).json({ error: "Provider already exists with this email" });
        }

        // Create provider with ToS acceptance timestamp
        const { tosAccepted: _, ...providerDataWithoutTos } = providerData;
        const provider = await storage.createUser({
          ...providerDataWithoutTos,
          tosAcceptedAt: new Date(),
          tosVersion: tosVersion || '1.0.0',
        });

        // HIPAA: Set server-side session after registration
        await setAuthSession(req, provider);
        auditAuthEvent(req, AuditAction.LOGIN_SUCCESS, provider.id, true, { method: 'registration', userType: 'provider' });

        res.json({ user: provider });

      } else {
        return res.status(400).json({ error: "Invalid user type" });
      }
    } catch (error) {
      logger.error("Registration error", { error: (error as Error).message });
      res.status(400).json({ error: "Invalid registration data" });
    }
  });

  // Patient/Provider Login
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      // Update rolling data for demo patients on any login
      await updateRollingDataWindow();

      // Legacy patient login support (name + DOB)
      if (req.body.firstName && req.body.lastName && req.body.dateOfBirth && !req.body.email) {
        const { firstName, lastName, dateOfBirth, deviceNumber } = req.body;

        // HIPAA: Don't log PHI (names, DOB)
        logger.debug('Patient login attempt via legacy method');

        const patient = await storage.getPatientByName(firstName, lastName, dateOfBirth);
        logger.debug('Patient lookup result', { found: !!patient, patientId: patient?.id });

        // If patient doesn't exist, return error - they need to register first
        if (!patient) {
          // HIPAA: Audit failed login attempt
          auditAuthEvent(req, AuditAction.LOGIN_FAILED, null, false, { method: 'legacy' });
          return res.status(401).json({
            error: "Account not found. Please register first using the Register tab."
          });
        }

        // HIPAA: Set server-side session (await to ensure session is saved before response)
        await setAuthSession(req, patient);

        // HIPAA: Audit successful login
        auditAuthEvent(req, AuditAction.LOGIN_SUCCESS, patient.id, true, { method: 'legacy', userType: 'patient' });

        // Link patient to device if device number provided
        let deviceLinkResult = null;
        if (deviceNumber && patient) {
          try {
            deviceLinkResult = await storage.linkPatientToDevice(patient.id, deviceNumber);
          } catch (error) {
            logger.warn('Failed to link patient to device', { patientId: patient.id, deviceNumber });
          }
        }

        return res.json({
          user: patient,
          patient,
          deviceNumber,
          deviceLinkResult // Include device switching info
        });
      }
      
      // Modern email-based login
      const loginData = loginSchema.parse(req.body) as LoginData;

      if (loginData.userType === 'patient') {
        let patient = await storage.getUserByEmail(loginData.email);

        // Also try name + DOB lookup if email not found
        if (!patient && loginData.dateOfBirth && loginData.firstName && loginData.lastName) {
          patient = await storage.getPatientByName(
            loginData.firstName,
            loginData.lastName,
            loginData.dateOfBirth
          );
        }

        // If patient doesn't exist, return error - they need to register first
        if (!patient) {
          // HIPAA: Audit failed login attempt (don't log email for privacy)
          auditAuthEvent(req, AuditAction.LOGIN_FAILED, null, false, { userType: 'patient' });
          return res.status(401).json({
            error: "Account not found. Please register first using the Register tab."
          });
        }

        // HIPAA: Set server-side session (await to ensure session is saved before response)
        await setAuthSession(req, patient);

        // HIPAA: Audit successful login
        auditAuthEvent(req, AuditAction.LOGIN_SUCCESS, patient.id, true, { userType: 'patient' });

        // Link patient to device if device number provided
        const { deviceNumber } = req.body;
        let deviceLinkResult = null;
        if (deviceNumber && patient) {
          try {
            deviceLinkResult = await storage.linkPatientToDevice(patient.id, deviceNumber);
          } catch (error) {
            logger.warn('Failed to link patient to device', { patientId: patient.id, deviceNumber });
          }
        }

        res.json({
          user: patient,
          patient,
          deviceNumber,
          deviceLinkResult // Include device switching info
        });

      } else if (loginData.userType === 'provider') {
        // HIPAA: Don't log email addresses
        logger.debug('Provider login attempt');
        const provider = await storage.getUserByEmail(loginData.email);
        logger.debug('Provider lookup result', { found: !!provider, providerId: provider?.id });

        if (!provider) {
          // HIPAA: Audit failed login attempt
          auditAuthEvent(req, AuditAction.LOGIN_FAILED, null, false, { userType: 'provider' });
          return res.status(401).json({ error: "Provider not found. Please register first." });
        }

        // HIPAA: Set server-side session (await to ensure session is saved before response)
        await setAuthSession(req, provider);

        // HIPAA: Audit successful login
        auditAuthEvent(req, AuditAction.LOGIN_SUCCESS, provider.id, true, { userType: 'provider' });

        res.json({ user: provider });

      } else {
        return res.status(400).json({ error: "Invalid user type" });
      }
    } catch (error) {
      logger.error("Login error occurred", { error: (error as Error).message });
      res.status(400).json({ error: "Invalid login credentials" });
    }
  });

  // HIPAA-Compliant Session Management Endpoints

  /**
   * Get current authenticated user
   * Used for session restoration without storing PHI client-side
   */
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = req.authenticatedUser!.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Audit the session restoration
      auditLog({
        userId,
        action: AuditAction.READ,
        resourceType: ResourceType.PATIENT,
        resourceId: userId,
        details: { action: 'session_restore' },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      // If caregiver, also fetch their approved patients (not pending)
      if (user.userType === 'caregiver') {
        const caregiverPatientsData = await db
          .select()
          .from(users)
          .innerJoin(
            caregiverPatients,
            eq(users.id, caregiverPatients.patientId)
          )
          .where(
            and(
              eq(caregiverPatients.caregiverId, userId),
              eq(caregiverPatients.accessStatus, 'approved')
            )
          );

        return res.json({
          user,
          caregiverPatients: caregiverPatientsData.map(r => ({
            ...r.users,
            relationship: r.caregiver_patients
          })),
        });
      }

      res.json({ user });
    } catch (error) {
      logger.error("Session restore error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to restore session" });
    }
  });

  /**
   * Logout - Destroy session
   * HIPAA requires secure session termination
   */
  app.post("/api/auth/logout", async (req, res) => {
    const userId = req.session?.userId;

    try {
      // Audit the logout
      if (userId) {
        auditAuthEvent(req, AuditAction.LOGOUT, userId, true);
      }

      await clearAuthSession(req);
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      logger.error("Logout error", { error: (error as Error).message });
      // Still return success - user is effectively logged out even if session destruction fails
      res.json({ success: true, message: "Logged out" });
    }
  });

  // Provider Routes

  // Get all providers (for patient dropdown)
  app.get("/api/providers", async (req, res) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (error) {
      logger.error("Providers fetch error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch providers" });
    }
  });

  // Create new provider
  app.post("/api/providers", async (req, res) => {
    try {
      const providerData = req.body;
      const newProvider = await storage.createUser({
        ...providerData,
        userType: 'provider',
        providerRole: 'clinician',
        isActive: true
      });
      res.json(newProvider);
    } catch (error) {
      logger.error("Provider creation error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to create provider" });
    }
  });

  // Grant provider access to patient (patient must authorize)
  app.post("/api/patients/:patientId/grant-access/:providerId", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const providerId = parseInt(req.params.providerId);

      // Create the relationship if it doesn't exist
      try {
        await storage.createProviderPatientRelation({
          patientId,
          providerId,
          permissionGranted: false,
          isActive: true
        });
      } catch (error) {
        // Relation might already exist, that's ok
      }

      // Grant permission
      const relation = await storage.grantProviderAccess(patientId, providerId);
      res.json(relation);
    } catch (error) {
      logger.error("Grant access error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to grant provider access" });
    }
  });

  // Get patients for a provider
  app.get("/api/providers/:providerId/patients", requireAuth, requireProvider, async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const patients = await storage.getPatientsByProvider(providerId);
      res.json(patients);
    } catch (error) {
      logger.error("Provider patients fetch error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch provider patients" });
    }
  });

  // Patient Dashboard and Data Routes
  // HIPAA: These routes require authentication and patient access authorization

  // Get patient dashboard data
  app.get("/api/patients/:id/dashboard", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);

      // HIPAA: Log request without PHI
      logger.debug('Dashboard request', { patientId });

      const [patient, goals, achievements, stats, sessions, adaptiveGoal] = await Promise.all([
        storage.getPatient(patientId),
        storage.getGoalsByPatient(patientId),
        storage.getAchievementsByPatient(patientId),
        storage.getPatientStats(patientId),
        storage.getSessionsByPatient(patientId),
        storage.calculateAdaptiveGoal(patientId)
      ]);

      // HIPAA: Don't log patient names or PHI - only IDs and counts
      logger.debug('Dashboard data retrieved', {
        patientId,
        found: !!patient,
        sessionsCount: sessions?.length || 0,
        goalsCount: goals?.length || 0
      });

      if (!patient) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Calculate days since start for legacy compatibility
      const startDate = patient.admissionDate || patient.createdAt;
      const daysSinceStart = startDate ? Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Auto-recalculate stats if they seem stale
      // Trigger if: has sessions AND (no stats OR avgDailyDuration would display as 0 minutes)
      // avgDailyDuration is in SECONDS, so < 60 means it displays as 0 minutes
      let finalStats = stats;
      if (sessions.length > 0 && (!stats?.avgDailyDuration || stats.avgDailyDuration < 60)) {
        logger.info('Auto-recalculating stale patient stats', { patientId, sessionsCount: sessions.length, currentAvg: stats?.avgDailyDuration });
        const recalculatedStats = await storage.recalculatePatientStats(patientId);
        if (recalculatedStats) {
          finalStats = recalculatedStats;
        }
      }

      // Recalculate consistency streak based on current sessions
      const currentStreak = calculateCurrentStreak(sessions);
      const updatedStats = finalStats ? { ...finalStats, consistencyStreak: currentStreak } : null;

      res.json({
        patient,
        goals,
        achievements,
        stats: updatedStats,
        recentSessions: sessions.slice(0, 10),
        daysSinceStart,
        adaptiveGoal
      });
    } catch (error) {
      logger.error("Dashboard error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  // Get patient usage data for charts
  app.get("/api/patients/:id/usage-data", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const days = parseInt(req.query.days as string) || 7;
      
      const usageData = await storage.getDailyUsageData(patientId, days);
      res.json(usageData);
    } catch (error) {
      logger.error("Usage data error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to load usage data" });
    }
  });

  // Push goals from risk assessment (Provider-only endpoint)
  app.post("/api/patients/:id/goals/from-assessment", requireAuth, requireProvider, authorizePatientAccess, createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const { mobilityRecommendation } = req.body;
      
      if (!mobilityRecommendation) {
        return res.status(400).json({ message: "Mobility recommendation data required" });
      }

      // Create goals from the mobility recommendation
      await storage.createGoalsFromMobilityRecommendation(patientId, mobilityRecommendation);
      
      res.json({ message: "Goals successfully updated from risk assessment" });
    } catch (error) {
      logger.error("Error pushing goals from assessment", { error: (error as Error).message });
      res.status(500).json({ message: "Failed to update patient goals" });
    }
  });

  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      logger.error("Leaderboard error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  });

  // Session Routes

  // Create exercise session
  app.post("/api/sessions", createLimiter, async (req, res) => {
    try {
      // HIPAA: Don't log PHI in request body
      logger.debug('Creating session', { patientId: req.body.patientId });

      // Convert startTime string to Date object if needed
      const body = { ...req.body };
      if (typeof body.startTime === 'string') {
        body.startTime = new Date(body.startTime);
      }
      if (typeof body.endTime === 'string') {
        body.endTime = new Date(body.endTime);
      }

      // Set default activity type if not provided
      if (!body.activityType) {
        body.activityType = 'ride';
      }

      // Calculate equivalent watts for walking/sitting based on patient weight
      if (body.activityType === 'walk' || body.activityType === 'sit') {
        const patient = await storage.getUser(body.patientId);
        if (patient?.weightKg) {
          body.equivalentWatts = calculateEquivalentWatts(body.activityType, patient.weightKg);
        } else {
          // Use default weight of 70kg if not set
          body.equivalentWatts = calculateEquivalentWatts(body.activityType, 70);
        }
      }

      logger.debug('Session data parsed', { patientId: body.patientId, activityType: body.activityType });

      const sessionData = insertExerciseSessionSchema.parse(body) as InsertExerciseSession;
      logger.debug('Session data validated, creating');

      const session = await storage.createSession(sessionData);
      logger.debug('Session created', { sessionId: session.id });
      res.json(session);
    } catch (error) {
      logger.error("Session creation error", { error: (error as Error).message });
      // For Zod errors, get the detailed message
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: string[]; message: string }> };
        const details = zodError.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        logger.error("Zod validation errors", { error: details });
        return res.status(400).json({ error: `Validation failed: ${details}` });
      }
      const errorMessage = error instanceof Error ? error.message : "Invalid session data";
      res.status(400).json({ error: errorMessage });
    }
  });

  // Update exercise session
  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updates = req.body;
      const session = await storage.updateSession(sessionId, updates);
      
      if (!session) {
        return res.status(404).json({ error: "Resource not found" });
      }
      
      res.json(session);
    } catch (error) {
      logger.error("Session update error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // Goal Routes

  // Create goal (providers only)
  app.post("/api/goals", createLimiter, async (req, res) => {
    try {
      const goalData = insertPatientGoalSchema.parse(req.body) as InsertPatientGoal;
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error) {
      logger.error("Goal creation error", { error: (error as Error).message });
      res.status(400).json({ error: "Invalid goal data" });
    }
  });

  // Provider API endpoints
  app.get("/api/providers/patients", async (req, res) => {
    try {
      // Get all patients that have granted permission to providers
      // For now, return all patients with mock admission dates
      const allPatients = await storage.getAllPatients();
      const patientsWithDates = allPatients.map(patient => ({
        ...patient,
        admissionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
      }));
      res.json(patientsWithDates);
    } catch (error) {
      logger.error("Error fetching provider patients", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id/goals", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const goals = await storage.getPatientGoals(patientId);
      res.json(goals);
    } catch (error) {
      logger.error("Error fetching patient goals", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  // Get goal history for accurate historical reporting (goals at each date)
  app.get("/api/patients/:id/goals/history", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const history = await storage.getGoalHistory(patientId);
      res.json(history);
    } catch (error) {
      logger.error("Error fetching goal history", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch goal history" });
    }
  });

  // Provider saves goals to patient profile
  app.post("/api/patients/:id/goals", requireAuth, requireProvider, authorizePatientAccess, createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const { goals, providerId } = req.body;

      if (!goals || !Array.isArray(goals)) {
        return res.status(400).json({ error: "Goals array is required" });
      }

      // HIPAA: Don't log goal details which may contain PHI
      logger.debug('Saving goals', { patientId, goalsCount: goals.length });

      // Deactivate existing goals for this patient
      await storage.deactivatePatientGoals(patientId);

      // Create new goals
      const createdGoals = [];
      for (const goalData of goals) {
        // Ensure numeric fields are proper numbers (not strings)
        const goal = await storage.createGoal({
          ...goalData,
          patientId,
          providerId: providerId || 1,
          targetValue: parseFloat(goalData.targetValue) || 0,
          currentValue: parseFloat(goalData.currentValue) || 0,
        });
        createdGoals.push(goal);
      }

      res.json({
        message: "Goals successfully sent to patient",
        goals: createdGoals
      });
    } catch (error) {
      logger.error("Error saving patient goals", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to save goals" });
    }
  });

  app.get("/api/patients/:id/sessions", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const sessions = await storage.getSessionsByPatient(patientId);
      // Return recent 7 days of sessions
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSessions = sessions.filter(session => 
        new Date(session.sessionDate) >= sevenDaysAgo
      );
      res.json(recentSessions);
    } catch (error) {
      logger.error("Error fetching patient sessions", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Update goal (providers only)
  app.patch("/api/goals/:id", async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const updates = req.body;
      const goal = await storage.updateGoal(goalId, updates);

      if (!goal) {
        return res.status(404).json({ error: "Resource not found" });
      }

      res.json(goal);
    } catch (error) {
      logger.error("Goal update error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  // Get adaptive goal suggestion
  app.get("/api/patients/:id/adaptive-goal", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const adaptiveGoal = await storage.calculateAdaptiveGoal(patientId);
      res.json(adaptiveGoal);
    } catch (error) {
      logger.error("Adaptive goal error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to calculate adaptive goal" });
    }
  });

  // Risk Assessment Routes

  // Process text input using AI (requires auth for PHI processing)
  app.post("/api/risk-assessment/process-text", requireAuth, riskAssessmentLimiter, async (req, res) => {
    try {
      const { field, text } = req.body;

      if (!text || !field) {
        return res.json({}); // Return empty object if no text to process
      }

      // Import the AI processor
      const { processMedicalText } = await import('./ai-processor.js');

      // Create input object based on field
      const input: any = {};
      input[field] = text;

      // Process the medical text
      const processed = await processMedicalText(input);

      // Return the structured data
      res.json(processed);
    } catch (error) {
      logger.error("Text processing error", { error: (error as Error).message });
      res.json({}); // Return empty object on error to not break the flow
    }
  });

  app.post("/api/risk-assessment", riskAssessmentLimiter, async (req, res) => {
    try {
      // HIPAA: Don't log PHI in risk assessment request
      logger.debug('Risk assessment request', { patientId: req.body.patientId });
      const riskData = riskAssessmentInputSchema.parse(req.body) as RiskAssessmentInput;
      // HIPAA: Log only non-PHI metadata
      logger.debug('Risk assessment data parsed', { mobilityStatus: riskData.mobility_status });
      const patientId = parseInt(req.body.patientId) || 1; // Should come from authenticated session

      // Get provider ID from session if authenticated as a provider
      const providerId = (req as any).session?.user?.userType === 'provider'
        ? (req as any).session?.user?.id
        : undefined;

      // Calculate risks using the risk calculator
      const riskResults = calculateRisks(riskData);

      // Extract robust stay predictions from the comprehensive risk calculator (no literature-based fallbacks)
      const stayPredictions = (riskResults as any).stay_predictions;
      const losData = stayPredictions?.length_of_stay;
      const dischargeData = stayPredictions?.discharge_disposition;
      const readmissionData = stayPredictions?.readmission_risk;
      // mobility_benefits is at the top level, not nested under stay_predictions
      const mobilityBenefits = (riskResults as any).mobility_benefits;

      logger.debug('Risk assessment calculated', { assessmentComplete: true });

      // Store the assessment - serialize all JSON objects to text for database storage
      // Only save inputData when a provider generates the assessment (not for patient exploration)
      const assessment = await storage.createRiskAssessment({
        patientId,
        providerId, // Track which provider created this assessment
        deconditioning: JSON.stringify(riskResults.deconditioning),
        vte: JSON.stringify(riskResults.vte),
        falls: JSON.stringify(riskResults.falls),
        pressure: JSON.stringify(riskResults.pressure),
        mobilityRecommendation: JSON.stringify(riskResults.mobility_recommendation),
        losData: losData ? JSON.stringify(losData) : null,
        dischargeData: dischargeData ? JSON.stringify(dischargeData) : null,
        readmissionData: readmissionData ? JSON.stringify(readmissionData) : null,
        // Only save input values when provider generates assessment - patient changes are for exploration only
        inputData: providerId ? req.body : undefined
      });

      res.json({
        ...riskResults,
        losData,
        dischargeData,
        readmissionData,
        mobility_benefits: mobilityBenefits, // Add mobility_benefits to API response
        assessmentId: assessment.id,
        providerId // Include providerId in response so client knows this was a provider-generated assessment
      });
    } catch (error) {
      logger.error("Risk assessment error", { error: (error as Error).message });
      if (error.name === 'ZodError') {
        res.status(400).json({
          error: "Invalid risk assessment data",
          details: (error as any).errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || (error as any).message
        });
      } else {
        res.status(400).json({ error: (error as any).message || "Invalid risk assessment data" });
      }
    }
  });

  // Anonymous risk assessment endpoint - same calculation but no data storage
  app.post("/api/anonymous-risk-assessment", riskAssessmentLimiter, async (req, res) => {
    try {
      // HIPAA: Anonymous assessments - no PHI logging needed
      logger.debug('Anonymous risk assessment request');
      const riskData = riskAssessmentInputSchema.parse(req.body) as RiskAssessmentInput;
      logger.debug('Anonymous risk data parsed', { mobilityStatus: riskData.mobility_status });
      
      // Calculate risks using the risk calculator (same calculation as authenticated users)
      const riskResults = calculateRisks(riskData);
      
      // Extract robust stay predictions from the comprehensive risk calculator
      const stayPredictions = (riskResults as any).stay_predictions;
      const losData = stayPredictions?.length_of_stay;
      const dischargeData = stayPredictions?.discharge_disposition;
      const readmissionData = stayPredictions?.readmission_risk;
      
      // mobility_benefits is at the top level, not nested under stay_predictions
      const mobilityBenefits = (riskResults as any).mobility_benefits;

      logger.debug('Anonymous risk assessment calculated', { assessmentComplete: true });
      
      // NO DATA STORAGE - return results directly without saving to database
      res.json({
        ...riskResults,
        losData,
        dischargeData,
        readmissionData,
        mobility_benefits: mobilityBenefits, // Add mobility_benefits to API response
        anonymous: true // Flag to indicate this was an anonymous calculation
      });
    } catch (error) {
      logger.error("Anonymous risk assessment error", { error: (error as Error).message });
      if (error.name === 'ZodError') {
        res.status(400).json({ 
          error: "Invalid risk assessment data", 
          details: (error as any).errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || (error as any).message 
        });
      } else {
        res.status(400).json({ error: (error as any).message || "Invalid risk assessment data" });
      }
    }
  });

  // Get latest provider-generated risk assessment input data for auto-population
  // Returns the saved input data from the most recent provider-generated assessment
  app.get("/api/patients/:patientId/provider-assessment-data", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }

      // Get the latest risk assessment that has inputData (provider-generated)
      const assessment = await storage.getLatestRiskAssessment(patientId);

      if (!assessment || !(assessment as any).inputData) {
        return res.json({
          hasProviderData: false,
          inputData: null,
          providerId: null,
          createdAt: null
        });
      }

      // Parse the inputData if it's stored as a string
      let inputData = (assessment as any).inputData;
      if (typeof inputData === 'string') {
        try {
          inputData = JSON.parse(inputData);
        } catch (e) {
          inputData = null;
        }
      }

      res.json({
        hasProviderData: !!(assessment as any).providerId,
        inputData,
        providerId: (assessment as any).providerId,
        createdAt: assessment.createdAt
      });
    } catch (error) {
      logger.error("Error fetching provider assessment data", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch provider assessment data" });
    }
  });

  // Get patient's risk assessments
  app.get("/api/patients/:id/risk-assessments", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const assessments = await storage.getRiskAssessmentsByPatient(patientId);
      res.json(assessments);
    } catch (error) {
      logger.error("Risk assessments fetch error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch risk assessments" });
    }
  });

  // Get the latest risk assessment for a patient (for pre-filling provider forms)
  app.get("/api/patients/:id/risk-assessment", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const assessment = await storage.getLatestRiskAssessment(patientId);
      
      if (!assessment) {
        return res.status(404).json({ error: "No risk assessment found for this patient" });
      }
      
      // If assessment is missing mobility_benefits (legacy assessments), generate them
      if (!assessment.mobility_benefits && assessment.deconditioning && assessment.vte && assessment.falls && assessment.pressure) {
        // Generate mobility benefits based on existing risk data
        const deconProb = assessment.deconditioning.probability || 0;
        const vteProb = assessment.vte.probability || 0;
        const fallsProb = assessment.falls.probability || 0;
        const pressureProb = assessment.pressure.probability || 0;

        const riskReductions = {
          deconditioning: {
            current_risk: deconProb,
            reduced_risk: deconProb * 0.85, // 15% relative reduction
            absolute_reduction_percent: Math.round(deconProb * 100 * 0.15 * 10) / 10
          },
          vte: {
            current_risk: vteProb,
            reduced_risk: vteProb * 0.90, // 10% relative reduction
            absolute_reduction_percent: Math.round(vteProb * 100 * 0.10 * 10) / 10
          },
          falls: {
            current_risk: fallsProb,
            reduced_risk: fallsProb * 0.88, // 12% relative reduction
            absolute_reduction_percent: Math.round(fallsProb * 100 * 0.12 * 10) / 10
          },
          pressure: {
            current_risk: pressureProb,
            reduced_risk: pressureProb * 0.92, // 8% relative reduction
            absolute_reduction_percent: Math.round(pressureProb * 100 * 0.08 * 10) / 10
          }
        };

        assessment.mobility_benefits = {
          risk_reductions: riskReductions
        };
      }
      
      res.json(assessment);
    } catch (error) {
      logger.error("Latest risk assessment fetch error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch latest risk assessment" });
    }
  });

  // Patient Profile Routes
  // HIPAA: Protected patient data endpoints

  // Get patient profile
  app.get("/api/patients/:id/profile", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const profile = await storage.getPatientProfile(patientId);
      res.json(profile);
    } catch (error) {
      logger.error("Profile fetch error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch patient profile" });
    }
  });

  // Create/Update patient profile
  app.post("/api/patients/:id/profile", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const profileData = req.body;

      // Check if profile exists
      const existingProfile = await storage.getPatientProfile(patientId);

      let profile;
      if (existingProfile) {
        profile = await storage.updatePatientProfile(patientId, profileData);
      } else {
        profile = await storage.createPatientProfile({
          userId: patientId,
          ...profileData
        });
      }

      res.json(profile);
    } catch (error) {
      logger.error("Profile save error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to save patient profile" });
    }
  });

  // Kudos & Nudge Wall Routes
  
  // Get patient preferences
  app.get("/api/kudos/preferences", async (req, res) => {
    try {
      const patientId = parseInt(req.query.patientId as string) || 4; // Default to Neil for testing
      const preferences = await kudosService.getPatientPreferences(patientId);
      res.json(preferences || {
        displayName: "Anonymous",
        avatarEmoji: "👤", 
        optInKudos: false,
        optInNudges: false,
        unit: "general"
      });
    } catch (error) {
      logger.error("Get preferences error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  // Update patient preferences
  app.patch("/api/kudos/preferences", async (req, res) => {
    try {
      const patientId = parseInt(req.query.patientId as string) || 4; // Default to Neil for testing
      await kudosService.updatePatientPreferences(patientId, req.body);
      res.json({ success: true });
    } catch (error) {
      logger.error("Update preferences error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Get feed items for unit
  app.get("/api/kudos/feed", async (req, res) => {
    try {
      const unit = req.query.unit as string || "general";
      const feedItems = await kudosService.getFeedForUnit(unit);
      res.json(feedItems);
    } catch (error) {
      logger.error("Get feed error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get feed" });
    }
  });

  // Add reaction to feed item
  app.post("/api/kudos/react", kudosLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.query.patientId as string) || 4; // Default to Neil for testing
      const { feedItemId, reactionType } = req.body;
      await kudosService.addReaction(patientId, feedItemId, reactionType);
      res.json({ success: true });
    } catch (error) {
      logger.error("Add reaction error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  // Send nudge
  app.post("/api/kudos/nudge", kudosLimiter, async (req, res) => {
    try {
      const senderId = parseInt(req.query.patientId as string) || 4; // Default to Neil for testing
      const { recipientId, templateType, metadata } = req.body;
      await kudosService.sendNudge(senderId, recipientId, templateType, metadata);
      res.json({ success: true });
    } catch (error) {
      logger.error("Send nudge error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to send nudge" });
    }
  });

  // Get nudge targets (patients who could use encouragement)
  app.get("/api/kudos/nudge-targets", async (req, res) => {
    try {
      const currentPatientId = parseInt(req.query.patientId as string) || 0;

      // Get all patients who have opted in to nudges
      const allPatients = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .leftJoin(patientPreferences, eq(users.id, patientPreferences.patientId))
        .where(
          and(
            eq(users.userType, 'patient'),
            eq(users.isActive, true)
          )
        );

      // Get today's date in user's timezone
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      // Calculate who needs encouragement (hasn't met daily goal)
      const nudgeTargets = [];
      for (const patient of allPatients) {
        if (patient.id === currentPatientId) continue; // Don't show current user

        // Get patient's preferences
        const [prefs] = await db
          .select()
          .from(patientPreferences)
          .where(eq(patientPreferences.patientId, patient.id));

        // Get patient's daily goal
        const [durationGoal] = await db
          .select()
          .from(patientGoals)
          .where(
            and(
              eq(patientGoals.patientId, patient.id),
              eq(patientGoals.goalType, 'duration'),
              eq(patientGoals.isActive, true)
            )
          );

        // Get today's sessions
        const todaySessions = await db
          .select()
          .from(exerciseSessions)
          .where(
            and(
              eq(exerciseSessions.patientId, patient.id),
              eq(exerciseSessions.sessionDate, today)
            )
          );

        const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

        // Calculate daily target
        let dailyTarget = 30; // Default
        if (durationGoal) {
          const goalMinutes = durationGoal.targetValue > 60
            ? durationGoal.targetValue / 60
            : durationGoal.targetValue;

          if (durationGoal.period === 'daily') {
            dailyTarget = goalMinutes;
          } else {
            // Per-session - multiply by sessions goal
            const [sessionsGoal] = await db
              .select()
              .from(patientGoals)
              .where(
                and(
                  eq(patientGoals.patientId, patient.id),
                  eq(patientGoals.goalType, 'sessions'),
                  eq(patientGoals.isActive, true)
                )
              );
            const sessionsPerDay = sessionsGoal ? sessionsGoal.targetValue : 2;
            dailyTarget = goalMinutes * sessionsPerDay;
          }
        }

        const minutesLeft = Math.max(0, Math.round(dailyTarget - todayMinutes));

        // Only show patients who haven't met their goal yet and have minutes left
        if (minutesLeft > 0) {
          nudgeTargets.push({
            id: patient.id,
            displayName: prefs?.displayName || `${patient.firstName} ${patient.lastName?.charAt(0)}.`,
            avatarEmoji: prefs?.avatarEmoji || "👤",
            minutesLeft,
            dailyTarget: Math.round(dailyTarget),
            todayMinutes: Math.round(todayMinutes),
            optedIn: prefs?.optInNudges || false
          });
        }
      }

      // Sort by minutes left (most needed first) and limit
      nudgeTargets.sort((a, b) => b.minutesLeft - a.minutesLeft);
      res.json(nudgeTargets.slice(0, 10));
    } catch (error) {
      logger.error("Get nudge targets error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get nudge targets" });
    }
  });

  // Get leaderboard with fair metrics
  app.get("/api/kudos/leaderboard", async (req, res) => {
    try {
      const currentPatientId = parseInt(req.query.patientId as string) || 0;

      // Get today's date in America/New_York timezone
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      // Calculate date 3 days ago for activity filter
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(threeDaysAgo);

      // Get patient IDs who have been active in the past 3 days
      const activePatients = await db
        .selectDistinct({ patientId: exerciseSessions.patientId })
        .from(exerciseSessions)
        .where(gte(exerciseSessions.sessionDate, threeDaysAgoStr));

      const activePatientIds = activePatients.map(p => p.patientId);

      // If no active patients, return empty leaderboards
      if (activePatientIds.length === 0) {
        return res.json({ todayLeaders: [], goalCrushers: [] });
      }

      // Get all active patients with their info
      const patients = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          consistencyStreak: patientStats.consistencyStreak,
        })
        .from(users)
        .leftJoin(patientStats, eq(users.id, patientStats.patientId))
        .where(
          and(
            eq(users.userType, 'patient'),
            eq(users.isActive, true),
            inArray(users.id, activePatientIds)
          )
        );

      // Build leaderboard data for each patient
      const leaderboardData = [];
      for (const patient of patients) {
        // Get preferences
        const [prefs] = await db
          .select()
          .from(patientPreferences)
          .where(eq(patientPreferences.patientId, patient.id));

        // Get today's minutes
        const todaySessions = await db
          .select({ duration: exerciseSessions.duration })
          .from(exerciseSessions)
          .where(
            and(
              eq(exerciseSessions.patientId, patient.id),
              eq(exerciseSessions.sessionDate, todayStr)
            )
          );
        const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

        // Get session duration goal and sessions per day to calculate daily target
        const [sessionDurationGoal] = await db
          .select({ targetValue: patientGoals.targetValue })
          .from(patientGoals)
          .where(
            and(
              eq(patientGoals.patientId, patient.id),
              eq(patientGoals.goalType, 'duration'),
              eq(patientGoals.period, 'session'),
              eq(patientGoals.isActive, true)
            )
          );

        const [sessionsGoal] = await db
          .select({ targetValue: patientGoals.targetValue })
          .from(patientGoals)
          .where(
            and(
              eq(patientGoals.patientId, patient.id),
              eq(patientGoals.goalType, 'sessions'),
              eq(patientGoals.isActive, true)
            )
          );

        // Calculate daily goal: session duration × sessions per day
        const sessionDuration = parseFloat(sessionDurationGoal?.targetValue || '15');
        const sessionsPerDay = parseFloat(sessionsGoal?.targetValue || '2');
        const dailyGoal = sessionDuration * sessionsPerDay; // e.g., 15 min × 2 = 30 min daily
        const goalPercent = Math.round((todayMinutes / dailyGoal) * 100);

        leaderboardData.push({
          id: patient.id,
          displayName: prefs?.displayName || `${patient.firstName} ${patient.lastName?.charAt(0)}.`,
          avatarEmoji: prefs?.avatarEmoji || "👤",
          todayMinutes,
          dailyGoal,
          goalPercent,
          streak: patient.consistencyStreak || 0,
          isCurrentUser: patient.id === currentPatientId,
          optedIn: prefs?.optInKudos || false
        });
      }

      // Only include patients who have actually exercised today
      const activeToday = leaderboardData.filter(p => p.todayMinutes > 0);

      // Today's Leaders - sorted by today's minutes
      const todayLeaders = [...activeToday]
        .sort((a, b) => b.todayMinutes - a.todayMinutes)
        .slice(0, 10)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      // Goal Crushers - sorted by goal achievement percentage
      const goalCrushers = [...activeToday]
        .sort((a, b) => b.goalPercent - a.goalPercent)
        .slice(0, 10)
        .map((p, i) => ({ ...p, rank: i + 1 }));

      res.json({ todayLeaders, goalCrushers });
    } catch (error) {
      logger.error("Get leaderboard error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  // Get received kudos and nudges for a patient
  app.get("/api/kudos/received", async (req, res) => {
    try {
      const patientId = parseInt(req.query.patientId as string);
      if (!patientId) {
        return res.status(400).json({ error: "Patient ID required" });
      }

      // Get nudges received
      const nudgesReceived = await db
        .select({
          id: nudgeMessages.id,
          message: nudgeMessages.message,
          createdAt: nudgeMessages.createdAt,
          senderId: nudgeMessages.senderId,
        })
        .from(nudgeMessages)
        .where(eq(nudgeMessages.recipientId, patientId))
        .orderBy(desc(nudgeMessages.createdAt))
        .limit(20);

      // Get sender info for each nudge
      const nudgesWithSenders = await Promise.all(
        nudgesReceived.map(async (nudge) => {
          const [sender] = await db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, nudge.senderId));

          const [senderPrefs] = await db
            .select()
            .from(patientPreferences)
            .where(eq(patientPreferences.patientId, nudge.senderId));

          return {
            ...nudge,
            senderName: senderPrefs?.displayName || `${sender?.firstName || 'Anonymous'} ${sender?.lastName?.charAt(0) || ''}.`,
            senderEmoji: senderPrefs?.avatarEmoji || "👤"
          };
        })
      );

      // Get feed items (achievements) that belong to this patient and their reactions
      const achievements = await db
        .select({
          id: feedItems.id,
          message: feedItems.message,
          eventType: feedItems.eventType,
          createdAt: feedItems.createdAt,
        })
        .from(feedItems)
        .where(eq(feedItems.patientId, patientId))
        .orderBy(desc(feedItems.createdAt))
        .limit(10);

      // Get reactions for each achievement
      const achievementsWithReactions = await Promise.all(
        achievements.map(async (item) => {
          const reactions = await db
            .select({
              reactionType: kudosReactions.reactionType,
            })
            .from(kudosReactions)
            .where(eq(kudosReactions.feedItemId, item.id));

          return {
            ...item,
            reactions: reactions.map(r => r.reactionType),
            reactionCount: reactions.length
          };
        })
      );

      res.json({
        nudges: nudgesWithSenders,
        achievements: achievementsWithReactions,
        summary: {
          totalNudgesReceived: nudgesReceived.length,
          totalReactionsReceived: achievementsWithReactions.reduce((sum, a) => sum + a.reactionCount, 0)
        }
      });
    } catch (error) {
      logger.error("Get received kudos error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get received kudos" });
    }
  });

  // Protocol Engine Routes

  // Get all active protocols
  app.get("/api/protocols", async (req, res) => {
    try {
      const { protocolEngine } = await import('./protocols/protocol-engine');
      const protocols = await protocolEngine.getAllProtocols();
      res.json(protocols);
    } catch (error) {
      logger.error("Get protocols error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get protocols" });
    }
  });

  // Get specific protocol by ID
  app.get("/api/protocols/:id", async (req, res) => {
    try {
      const protocolId = parseInt(req.params.id);
      const { protocolEngine } = await import('./protocols/protocol-engine');
      const protocol = await protocolEngine.getProtocolById(protocolId);

      if (!protocol) {
        return res.status(404).json({ error: "Resource not found" });
      }

      res.json(protocol);
    } catch (error) {
      logger.error("Get protocol error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get protocol" });
    }
  });

  // Match protocol for patient based on diagnosis
  app.post("/api/protocols/match", async (req, res) => {
    try {
      const { diagnosis, comorbidities = [], diagnosisCodes = [] } = req.body;

      if (!diagnosis && diagnosisCodes.length === 0) {
        return res.status(400).json({ error: "Diagnosis or diagnosis codes required" });
      }

      const { protocolEngine } = await import('./protocols/protocol-engine');
      const protocol = await protocolEngine.matchProtocol(
        diagnosis || '',
        comorbidities,
        diagnosisCodes
      );

      if (!protocol) {
        return res.status(404).json({
          error: "No matching protocol found",
          suggestion: "Consider using a general medical/surgical protocol or consult with PT"
        });
      }

      res.json(protocol);
    } catch (error) {
      logger.error("Protocol matching error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to match protocol" });
    }
  });

  // Assign protocol to patient
  app.post("/api/patients/:patientId/protocol", requireAuth, authorizePatientAccess, createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolId, assignedBy, startPhase } = req.body;

      if (!protocolId || !assignedBy) {
        return res.status(400).json({ error: "Protocol ID and assignedBy (provider ID) required" });
      }

      const { protocolEngine } = await import('./protocols/protocol-engine');
      const assignment = await protocolEngine.assignProtocol(
        patientId,
        protocolId,
        assignedBy,
        startPhase
      );

      if (!assignment) {
        return res.status(500).json({ error: "Failed to assign protocol" });
      }

      res.json(assignment);
    } catch (error) {
      logger.error("Protocol assignment error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to assign protocol" });
    }
  });

  // Get patient's current protocol assignment
  app.get("/api/patients/:patientId/protocol", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine } = await import('./protocols/protocol-engine');
      const assignment = await protocolEngine.getPatientAssignment(patientId);

      if (!assignment) {
        return res.status(404).json({ error: "No active protocol for this patient" });
      }

      res.json(assignment);
    } catch (error) {
      logger.error("Get patient protocol error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get patient protocol" });
    }
  });

  // Get current exercise prescription for patient
  app.get("/api/patients/:patientId/prescription", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine } = await import('./protocols/protocol-engine');
      const prescription = await protocolEngine.getCurrentPrescription(patientId);

      if (!prescription) {
        return res.status(404).json({
          error: "No active prescription",
          suggestion: "Assign a protocol to this patient first"
        });
      }

      res.json(prescription);
    } catch (error) {
      logger.error("Get prescription error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get prescription" });
    }
  });

  // Get personalized prescription using patient goal calculator + diagnosis adjustments
  // This is the NEW approach that calculates baseline from risk calculator and adjusts for diagnosis
  app.get("/api/patients/:patientId/personalized-prescription", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { personalizedProtocolMatcher } = await import('./personalization/personalized-protocol-matcher');

      const prescription = await personalizedProtocolMatcher.generatePersonalizedPrescription(patientId);

      if (!prescription) {
        return res.status(404).json({
          error: "Could not generate personalized prescription",
          suggestion: "Ensure patient profile exists with required data (age, mobility status, diagnosis)"
        });
      }

      res.json(prescription);
    } catch (error) {
      logger.error("Personalized prescription error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to generate personalized prescription" });
    }
  });

  // Generate personalized prescription with diagnosis and medication overrides
  app.post("/api/patients/:patientId/personalized-prescription", requireAuth, authorizePatientAccess, createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { diagnosis, medications, riskAssessmentInput } = req.body;

      const { personalizedProtocolMatcher } = await import('./personalization/personalized-protocol-matcher');

      const prescription = await personalizedProtocolMatcher.generatePersonalizedPrescription(
        patientId,
        { diagnosis, medications, riskAssessmentInput }
      );

      if (!prescription) {
        return res.status(404).json({
          error: "Could not generate personalized prescription",
          suggestion: "Ensure patient profile exists with required data (age, mobility status, diagnosis)"
        });
      }

      // Build descriptive message
      const hasMedAdjustments = prescription.medicationCategories?.length > 0 &&
        prescription.medicationCategories[0] !== 'none';
      const medCount = hasMedAdjustments ? prescription.medicationCategories.length : 0;
      const message = `Prescription generated for ${prescription.diagnosisCategoryLabel || prescription.diagnosisCategory}${medCount > 0 ? ` with ${medCount} medication adjustment(s)` : ''}`;

      res.json({
        ...prescription,
        message
      });
    } catch (error) {
      logger.error("Personalized prescription error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to generate personalized prescription" });
    }
  });

  // Check if patient should progress to next phase
  app.get("/api/patients/:patientId/protocol/progression", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine } = await import('./protocols/protocol-engine');
      const progressionCheck = await protocolEngine.checkProgressionCriteria(patientId);

      res.json(progressionCheck);
    } catch (error) {
      logger.error("Progression check error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to check progression criteria" });
    }
  });

  // Advance patient to next protocol phase
  app.post("/api/patients/:patientId/protocol/progress", requireAuth, authorizePatientAccess, createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine } = await import('./protocols/protocol-engine');
      const success = await protocolEngine.progressToNextPhase(patientId);

      if (!success) {
        return res.status(400).json({
          error: "Cannot progress patient",
          suggestion: "Patient may not meet progression criteria yet"
        });
      }

      // Get updated assignment
      const updatedAssignment = await protocolEngine.getPatientAssignment(patientId);
      res.json(updatedAssignment);
    } catch (error) {
      logger.error("Protocol progression error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to progress patient" });
    }
  });

  // Clinical Documentation Routes

  // Generate nursing shift summary report (PDF)
  app.post("/api/reports/shift-summary", createLimiter, async (req, res) => {
    try {
      const { patientId, startTime, endTime } = req.body;

      if (!patientId || !startTime || !endTime) {
        return res.status(400).json({
          error: "Missing required fields: patientId, startTime, endTime"
        });
      }

      const { reportGenerator } = await import('./reports/report-generator');
      const pdfBuffer = await reportGenerator.generateShiftReport({
        patientId: parseInt(patientId),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        includeRiskAssessment: true,
        includeProtocol: true
      });

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="shift-report-patient-${patientId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error: any) {
      logger.error("Shift report generation error", { error: (error as Error).message });
      res.status(500).json({
        error: "Failed to generate shift report",
        details: error.message
      });
    }
  });

  // Generate PT progress note (SOAP format)
  app.post("/api/reports/pt-progress-note", createLimiter, async (req, res) => {
    try {
      const { patientId, sessionIds, subjective, additionalNotes } = req.body;

      if (!patientId || !sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
        return res.status(400).json({
          error: "Missing required fields: patientId, sessionIds (array of session IDs)"
        });
      }

      const { reportGenerator } = await import('./reports/report-generator');
      const soapNote = await reportGenerator.generatePTProgressNote({
        patientId: parseInt(patientId),
        sessionIds: sessionIds.map((id: any) => parseInt(id)),
        subjective,
        additionalNotes
      });

      res.json({
        note: soapNote,
        format: 'SOAP',
        generatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error("PT progress note generation error", { error: (error as Error).message });
      res.status(500).json({
        error: "Failed to generate PT progress note",
        details: error.message
      });
    }
  });

  // Get available reports for patient
  app.get("/api/patients/:patientId/reports", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);

      // Get session count to determine if reports can be generated
      const sessions = await storage.getSessionsByPatient(patientId);

      const availableReports = [
        {
          type: 'shift_summary',
          name: 'Nursing Shift Summary',
          description: 'Comprehensive shift report with mobility activity, risk status, and alerts',
          format: 'PDF',
          requiresInput: ['startTime', 'endTime'],
          available: sessions.length > 0
        },
        {
          type: 'pt_progress_note',
          name: 'PT Progress Note',
          description: 'SOAP format progress note for physical therapy documentation',
          format: 'Text',
          requiresInput: ['sessionIds'],
          available: sessions.length > 0
        }
      ];

      res.json({
        patientId,
        totalSessions: sessions.length,
        availableReports
      });
    } catch (error) {
      logger.error("Get available reports error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get available reports" });
    }
  });

  // Smart Alert System Routes

  // Get all unacknowledged alerts (nurse monitoring dashboard)
  app.get("/api/alerts", async (req, res) => {
    try {
      const { alertEngine } = await import('./alerts/alert-engine');
      const alerts = await alertEngine.getAllUnacknowledgedAlerts();
      res.json(alerts);
    } catch (error) {
      logger.error("Get alerts error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get alerts" });
    }
  });

  // Get alerts for specific patient
  app.get("/api/patients/:patientId/alerts", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const includeAcknowledged = req.query.includeAcknowledged === 'true';

      const { alertEngine } = await import('./alerts/alert-engine');
      const alerts = await alertEngine.getPatientAlerts(patientId, includeAcknowledged);

      res.json(alerts);
    } catch (error) {
      logger.error("Get patient alerts error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get patient alerts" });
    }
  });

  // Get alert summary statistics
  app.get("/api/alerts/summary", async (req, res) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;

      const { alertEngine } = await import('./alerts/alert-engine');
      const summary = await alertEngine.getAlertSummary(patientId);

      res.json(summary);
    } catch (error) {
      logger.error("Get alert summary error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get alert summary" });
    }
  });

  // Acknowledge an alert
  app.post("/api/alerts/:alertId/acknowledge", createLimiter, async (req, res) => {
    try {
      const alertId = parseInt(req.params.alertId);
      const { acknowledgedBy } = req.body;

      if (!acknowledgedBy) {
        return res.status(400).json({ error: "acknowledgedBy (provider ID) is required" });
      }

      const { alertEngine } = await import('./alerts/alert-engine');
      const success = await alertEngine.acknowledgeAlert(alertId, acknowledgedBy);

      if (!success) {
        return res.status(500).json({ error: "Failed to acknowledge alert" });
      }

      res.json({ success: true, alertId, acknowledgedBy });
    } catch (error) {
      logger.error("Acknowledge alert error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  // Check inactivity alerts for all patients (run periodically)
  app.post("/api/alerts/check-inactivity", createLimiter, async (req, res) => {
    try {
      const { alertEngine } = await import('./alerts/alert-engine');
      const alerts = await alertEngine.checkInactivityAlerts();

      res.json({
        alertsGenerated: alerts.length,
        alerts
      });
    } catch (error) {
      logger.error("Check inactivity error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to check inactivity" });
    }
  });

  // Check protocol compliance for patient
  app.post("/api/patients/:patientId/alerts/check-compliance", requireAuth, authorizePatientAccess, createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const { alertEngine } = await import('./alerts/alert-engine');
      const alert = await alertEngine.checkProtocolCompliance(patientId);

      res.json({
        alert: alert || null,
        complianceChecked: true
      });
    } catch (error) {
      logger.error("Check compliance error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to check protocol compliance" });
    }
  });

  // Run all alert checks for a patient
  app.post("/api/patients/:patientId/alerts/check-all", requireAuth, authorizePatientAccess, createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const { alertEngine } = await import('./alerts/alert-engine');
      const alerts = await alertEngine.runAllChecks(patientId);

      res.json({
        alertsGenerated: alerts.length,
        alerts
      });
    } catch (error) {
      logger.error("Run all checks error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to run all alert checks" });
    }
  });

  // Provider Relationships Routes
  
  // Get all providers for selection
  app.get("/api/providers", async (req, res) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (error) {
      logger.error("Get providers error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get providers" });
    }
  });

  // Get provider relationships for current user
  app.get("/api/provider-relationships", async (req, res) => {
    try {
      // Get patient ID from query parameter
      const patientId = parseInt(req.query.patientId as string);

      if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: "Valid patient ID is required" });
      }

      const relationships = await storage.getProviderPatientRelationships(patientId);
      res.json(relationships);
    } catch (error) {
      logger.error("Get relationships error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get provider relationships" });
    }
  });

  // Get provider relationships for a specific patient (for provider dashboard)
  app.get("/api/provider-relationships/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const relationships = await storage.getProviderPatientRelationships(patientId);
      res.json(relationships);
    } catch (error) {
      logger.error("Get relationships error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to get provider relationships" });
    }
  });

  // Send provider access invitation (creates pending request for provider to accept)
  app.post("/api/provider-relationships", async (req, res) => {
    try {
      // Get patient ID from request body (sent from frontend based on logged-in user)
      const { providerId, patientId } = req.body;

      if (!providerId) {
        return res.status(400).json({ error: "Provider ID is required" });
      }

      if (!patientId) {
        return res.status(400).json({ error: "Patient ID is required" });
      }

      // Check for any existing relationship (including inactive ones)
      const existingRelation = await storage.getProviderPatientRelation(providerId, patientId);

      if (existingRelation) {
        // If relationship was deactivated/revoked, reactivate it
        if (!existingRelation.isActive || existingRelation.accessStatus === 'revoked') {
          const reactivatedRelation = await storage.reactivateProviderPatientRelation(existingRelation.id, 'patient');

          // Create notification for provider
          const patient = await storage.getUser(patientId);
          await storage.createProviderNotification({
            providerId,
            patientId,
            notificationType: 'access_request',
            title: 'Patient Access Invitation',
            message: `${patient?.firstName} ${patient?.lastName} has invited you to view their mobility data.`,
            metadata: JSON.stringify({ patientName: `${patient?.firstName} ${patient?.lastName}` })
          });

          logger.info("Patient re-sent provider invitation", {
            patientId,
            providerId,
            relationId: reactivatedRelation?.id || existingRelation.id
          });

          return res.json(reactivatedRelation || existingRelation);
        }

        // If there's already an active pending request
        if (existingRelation.accessStatus === 'pending') {
          return res.status(400).json({ error: "A pending invitation already exists for this provider" });
        }
        // If already approved and active
        if (existingRelation.accessStatus === 'approved' && existingRelation.permissionGranted) {
          return res.status(400).json({ error: "Provider already has access to this patient" });
        }
        // If denied
        if (existingRelation.accessStatus === 'denied') {
          return res.status(400).json({ error: "Your previous invitation was declined by the provider." });
        }
      }

      // Create a pending invitation instead of immediately granting access
      const relationship = await storage.createPatientAccessRequest(providerId, patientId);

      // Create notification for provider
      const patient = await storage.getUser(patientId);
      await storage.createProviderNotification({
        providerId,
        patientId,
        notificationType: 'access_request',
        title: 'Patient Access Invitation',
        message: `${patient?.firstName} ${patient?.lastName} has invited you to view their mobility data.`,
        metadata: JSON.stringify({ patientName: `${patient?.firstName} ${patient?.lastName}` })
      });

      logger.info("Patient sent provider invitation", {
        patientId,
        providerId,
        relationId: relationship.id
      });

      res.json(relationship);
    } catch (error) {
      logger.error("Send invitation error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to send provider invitation" });
    }
  });

  // Revoke provider access
  app.delete("/api/provider-relationships/:id", async (req, res) => {
    try {
      const relationshipId = parseInt(req.params.id);

      if (isNaN(relationshipId)) {
        return res.status(400).json({ error: "Valid relationship ID is required" });
      }

      // Verify relationship exists
      const relationship = await db.select()
        .from(providerPatients)
        .where(eq(providerPatients.id, relationshipId))
        .limit(1);

      if (!relationship[0]) {
        return res.status(404).json({ error: "Resource not found" });
      }

      await storage.deleteProviderPatientRelationship(relationshipId);
      res.json({ success: true });
    } catch (error) {
      logger.error("Revoke access error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to revoke provider access" });
    }
  });

  // Provider goal management endpoints
  app.patch('/api/goals/:goalId', async (req, res) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const { targetValue, currentValue } = req.body;
      
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (isDevelopment) {
        // Development mode: Allow goal updates for testing
        const [updatedGoal] = await db.update(patientGoals)
          .set({ 
            targetValue: targetValue?.toString(),
            currentValue: currentValue?.toString(),
            updatedAt: new Date()
          })
          .where(eq(patientGoals.id, goalId))
          .returning();
        
        res.json(updatedGoal);
      } else {
        // Production: For now, allow goal updates without auth until proper auth is set up
        
        // Update the goal
        const [updatedGoal] = await db.update(patientGoals)
          .set({ 
            targetValue: targetValue?.toString(),
            currentValue: currentValue?.toString(),
            updatedAt: new Date()
          })
          .where(eq(patientGoals.id, goalId))
          .returning();
        
        res.json(updatedGoal);
      }
    } catch (error) {
      logger.error("Update goal error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  // Recalculate goal progress from existing sessions
  app.post("/api/patients/:patientId/recalculate-goals", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      
      // Get all sessions for this patient
      const sessions = await storage.getSessionsByPatient(patientId);
      
      // Reset all goal current values to 0
      await db.update(patientGoals)
        .set({ currentValue: "0.00" })
        .where(eq(patientGoals.patientId, patientId));
      
      // Calculate average values for session-based goals
      let totalDuration = 0;
      let totalPower = 0;
      let totalResistance = 0;
      let totalEnergy = 0;
      let sessionCount = sessions.length;
      
      for (const session of sessions) {
        if (session.duration) {
          totalDuration += session.duration / 60; // Convert to minutes
        }
        if (session.avgPower) {
          totalPower += parseFloat(session.avgPower);
        }
        if (session.resistance) {
          totalResistance += parseFloat(session.resistance);
        }
        // Calculate energy (power * duration in minutes)
        if (session.avgPower && session.duration) {
          totalEnergy += parseFloat(session.avgPower) * (session.duration / 60);
        }
      }
      
      // Update goals with average values
      if (sessionCount > 0) {
        await storage.updateGoalProgress(patientId, 'duration', totalDuration / sessionCount);
        await storage.updateGoalProgress(patientId, 'power', totalPower / sessionCount);
        await storage.updateGoalProgress(patientId, 'resistance', totalResistance / sessionCount);
        await storage.updateGoalProgress(patientId, 'energy', totalEnergy); // Total energy, not average
        await storage.updateGoalProgress(patientId, 'sessions', sessionCount);
      }
      
      res.json({
        success: true,
        message: "Goal progress recalculated successfully",
        sessionsProcessed: sessions.length
      });
    } catch (error) {
      logger.error("Error recalculating goal progress", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to recalculate goal progress" });
    }
  });

  // Recalculate patient stats from existing sessions (fixes avgDailyDuration)
  app.post("/api/patients/:patientId/recalculate-stats", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);

      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }

      const updatedStats = await storage.recalculatePatientStats(patientId);

      if (!updatedStats) {
        return res.status(404).json({ error: "Patient stats not found" });
      }

      res.json({
        success: true,
        message: "Patient stats recalculated successfully",
        stats: updatedStats
      });
    } catch (error) {
      logger.error("Error recalculating patient stats", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to recalculate patient stats" });
    }
  });

  // Recalculate stats for all patients (provider-only, fixes avgDailyDuration for all)
  app.post("/api/admin/recalculate-all-stats", requireAuth, requireProvider, async (req, res) => {
    try {
      const allPatients = await storage.getAllPatients();
      const results: Array<{patientId: number, name: string, success: boolean, avgDailyMinutes?: number}> = [];

      for (const patient of allPatients) {
        try {
          const updatedStats = await storage.recalculatePatientStats(patient.id);
          results.push({
            patientId: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
            success: !!updatedStats,
            avgDailyMinutes: updatedStats ? Math.round((updatedStats.avgDailyDuration || 0) / 60) : undefined
          });
        } catch (err) {
          results.push({
            patientId: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
            success: false
          });
        }
      }

      res.json({
        success: true,
        message: `Recalculated stats for ${results.filter(r => r.success).length}/${allPatients.length} patients`,
        results
      });
    } catch (error) {
      logger.error("Error recalculating all patient stats", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to recalculate patient stats" });
    }
  });

  // Device Management Endpoints
  
  // Get all devices
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      logger.error("Error fetching devices", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  // Get last used device for a patient by name and DOB
  app.get("/api/patients/last-device", async (req, res) => {
    try {
      const { firstName, lastName, dateOfBirth } = req.query;
      
      if (!firstName || !lastName || !dateOfBirth) {
        return res.json({ lastDevice: null }); // Return null for incomplete info
      }
      
      // Find patient by credentials
      const patient = await storage.getPatientByName(
        firstName as string,
        lastName as string,
        dateOfBirth as string
      );
      
      if (!patient) {
        return res.json({ lastDevice: null }); // No patient found, return null
      }
      
      // Get their most recent device
      const lastDevice = await storage.getPatientLastDevice(patient.id);
      
      res.json({ lastDevice });
    } catch (error) {
      logger.error("Error fetching last device", { error: (error as Error).message });
      res.json({ lastDevice: null }); // Return null on error to avoid breaking the form
    }
  });

  // Get patient profile for risk calculator auto-population
  app.get("/api/patients/:patientId/profile-for-calculator", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const { patientId } = req.params;
      
      // Get patient basic info
      const patient = await storage.getPatient(parseInt(patientId));
      if (!patient) {
        return res.status(404).json({ error: "Resource not found" });
      }
      
      // Get patient profile
      const profile = await storage.getPatientProfile(parseInt(patientId));
      
      // Calculate age from date of birth
      const age = patient.dateOfBirth ? 
        Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 
        null;
      
      // Calculate days immobile from admission date  
      const daysImmobile = patient.admissionDate ?
        Math.floor((new Date().getTime() - new Date(patient.admissionDate).getTime()) / (24 * 60 * 60 * 1000)) :
        0;
      
      const calculatorData = {
        // Basic demographics (fall back to user record if no profile)
        age: age,
        sex: profile?.sex || patient.sex || null,
        weight_kg: profile?.weightKg ? parseFloat(profile.weightKg.toString()) : (patient.weightKg || null),
        height_cm: profile?.heightCm ? parseFloat(profile.heightCm.toString()) : (patient.heightCm || null),
        
        // Care settings
        level_of_care: profile?.levelOfCare || null,
        mobility_status: profile?.mobilityStatus || null,
        cognitive_status: profile?.cognitiveStatus || null,
        baseline_function: profile?.baselineFunction || null,
        
        // Medical history
        admission_diagnosis: profile?.admissionDiagnosis || "",
        comorbidities: profile?.comorbidities || [],
        medications: profile?.medications || [],
        devices: profile?.devices || [],
        
        // Risk factors
        days_immobile: daysImmobile,
        incontinent: profile?.incontinent || false,
        albumin_low: profile?.albuminLow || false,
        on_vte_prophylaxis: profile?.onVteProphylaxis !== false, // Default true if not specified
      };
      
      res.json(calculatorData);
    } catch (error) {
      logger.error("Error fetching patient profile for calculator", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch patient profile" });
    }
  });

  // Get device details
  app.get("/api/devices/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ error: "Resource not found" });
      }
      
      res.json(device);
    } catch (error) {
      logger.error("Error fetching device", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch device" });
    }
  });

  // Link patient to device
  app.post("/api/devices/:deviceId/link", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { patientId } = req.body;
      
      if (!patientId) {
        return res.status(400).json({ error: "Patient ID is required" });
      }
      
      // Check if device exists
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Resource not found" });
      }
      
      // Link patient to device
      await storage.linkPatientToDevice(patientId, deviceId);
      
      // Get updated device info
      const updatedDevice = await storage.getDevice(deviceId);
      
      res.json({ 
        success: true, 
        message: `Patient linked to device ${deviceId}`,
        device: updatedDevice 
      });
    } catch (error) {
      logger.error("Error linking patient to device", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to link patient to device" });
    }
  });

  // Reset device (end current session)
  app.post("/api/devices/:deviceId/reset", async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      // Check if device exists
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Resource not found" });
      }
      
      // Unlink patient from device
      await storage.unlinkPatientFromDevice(deviceId);
      
      // Get updated device info
      const updatedDevice = await storage.getDevice(deviceId);
      
      res.json({ 
        success: true, 
        message: `Device ${deviceId} reset and available`,
        device: updatedDevice 
      });
    } catch (error) {
      logger.error("Error resetting device", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to reset device" });
    }
  });

  // Get patient's device usage history
  app.get("/api/patients/:patientId/devices", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      
      const deviceHistory = await storage.getPatientDeviceHistory(patientId);
      res.json(deviceHistory);
    } catch (error) {
      logger.error("Error fetching patient device history", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch device history" });
    }
  });

  // Get all sessions across all devices for a patient (data portability)
  app.get("/api/patients/:patientId/sessions/portable", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      
      const sessions = await storage.getSessionsByPatient(patientId);
      const deviceHistory = await storage.getPatientDeviceHistory(patientId);
      
      res.json({ 
        sessions,
        deviceHistory,
        totalSessions: sessions.length,
        totalDuration: sessions.reduce((sum, session) => sum + (session.duration || 0), 0),
        devicesUsed: [...new Set(sessions.map(s => s.deviceId).filter(Boolean))].length
      });
    } catch (error) {
      logger.error("Error fetching portable session data", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch portable session data" });
    }
  });

  // ============================================================================
  // DISCHARGE READINESS SCORE (Elderly Mobility Scale) ROUTES
  // ============================================================================

  // Get all EMS assessments for a patient
  app.get("/api/patients/:patientId/ems-assessments", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { emsAssessments } = await import("@shared/schema");
      const assessments = await db.select()
        .from(emsAssessments)
        .where(eq(emsAssessments.patientId, patientId))
        .orderBy(emsAssessments.assessedAt);
      res.json(assessments);
    } catch (error) {
      logger.error("Error fetching EMS assessments", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch EMS assessments" });
    }
  });

  // Get a specific EMS assessment by ID
  app.get("/api/ems-assessments/:id", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const { emsAssessments } = await import("@shared/schema");
      const [assessment] = await db.select()
        .from(emsAssessments)
        .where(eq(emsAssessments.id, assessmentId))
        .limit(1);

      if (!assessment) {
        return res.status(404).json({ error: "Resource not found" });
      }

      res.json(assessment);
    } catch (error) {
      logger.error("Error fetching EMS assessment", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch EMS assessment" });
    }
  });

  // Create a new EMS assessment
  app.post("/api/patients/:patientId/ems-assessments", requireAuth, authorizePatientAccess, createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { emsAssessments } = await import("@shared/schema");
      const {
        providerId,
        lyingToSitting,
        sittingToLying,
        sittingToStanding,
        standing,
        gait,
        timedWalk,
        functionalReach,
        timedWalkSeconds,
        functionalReachCm,
        notes,
        walkingAidUsed,
        assessedAt
      } = req.body;

      // Calculate total score
      const totalScore = lyingToSitting + sittingToLying + sittingToStanding +
                        standing + gait + timedWalk + functionalReach;

      // Determine tier based on score
      let tier: string;
      if (totalScore > 14) {
        tier = 'home';
      } else if (totalScore >= 10) {
        tier = 'borderline';
      } else {
        tier = 'dependent';
      }

      const [newAssessment] = await db.insert(emsAssessments).values({
        patientId,
        providerId: providerId || null,
        assessedAt: assessedAt ? new Date(assessedAt) : new Date(),
        lyingToSitting,
        sittingToLying,
        sittingToStanding,
        standing,
        gait,
        timedWalk,
        functionalReach,
        timedWalkSeconds: timedWalkSeconds || null,
        functionalReachCm: functionalReachCm || null,
        totalScore,
        tier,
        notes: notes || null,
        walkingAidUsed: walkingAidUsed || null
      }).returning();

      res.json(newAssessment);
    } catch (error) {
      logger.error("Error creating EMS assessment", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to create EMS assessment" });
    }
  });

  // Update an existing EMS assessment
  app.patch("/api/ems-assessments/:id", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const { emsAssessments } = await import("@shared/schema");
      const updates = req.body;

      // If score components are being updated, recalculate total and tier
      if (updates.lyingToSitting !== undefined || updates.sittingToLying !== undefined ||
          updates.sittingToStanding !== undefined || updates.standing !== undefined ||
          updates.gait !== undefined || updates.timedWalk !== undefined ||
          updates.functionalReach !== undefined) {

        // Get current assessment to fill in missing values
        const [current] = await db.select()
          .from(emsAssessments)
          .where(eq(emsAssessments.id, assessmentId))
          .limit(1);

        if (!current) {
          return res.status(404).json({ error: "Resource not found" });
        }

        const lyingToSitting = updates.lyingToSitting ?? current.lyingToSitting;
        const sittingToLying = updates.sittingToLying ?? current.sittingToLying;
        const sittingToStanding = updates.sittingToStanding ?? current.sittingToStanding;
        const standing = updates.standing ?? current.standing;
        const gait = updates.gait ?? current.gait;
        const timedWalk = updates.timedWalk ?? current.timedWalk;
        const functionalReach = updates.functionalReach ?? current.functionalReach;

        updates.totalScore = lyingToSitting + sittingToLying + sittingToStanding +
                            standing + gait + timedWalk + functionalReach;

        if (updates.totalScore > 14) {
          updates.tier = 'home';
        } else if (updates.totalScore >= 10) {
          updates.tier = 'borderline';
        } else {
          updates.tier = 'dependent';
        }
      }

      const [updated] = await db.update(emsAssessments)
        .set(updates)
        .where(eq(emsAssessments.id, assessmentId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Resource not found" });
      }

      res.json(updated);
    } catch (error) {
      logger.error("Error updating EMS assessment", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to update EMS assessment" });
    }
  });

  // Delete an EMS assessment
  app.delete("/api/ems-assessments/:id", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const { emsAssessments } = await import("@shared/schema");

      const [deleted] = await db.delete(emsAssessments)
        .where(eq(emsAssessments.id, assessmentId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Resource not found" });
      }

      res.json({ success: true, deleted });
    } catch (error) {
      logger.error("Error deleting EMS assessment", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to delete EMS assessment" });
    }
  });

  // Get latest EMS assessment for a patient
  app.get("/api/patients/:patientId/ems-assessment/latest", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { emsAssessments } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");

      const [latest] = await db.select()
        .from(emsAssessments)
        .where(eq(emsAssessments.patientId, patientId))
        .orderBy(desc(emsAssessments.assessedAt))
        .limit(1);

      if (!latest) {
        return res.status(404).json({ error: "No EMS assessment found for this patient" });
      }

      res.json(latest);
    } catch (error) {
      logger.error("Error fetching latest EMS assessment", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch latest EMS assessment" });
    }
  });

  // Register Personalization Routes (Tier 1 & Tier 2 Patent Features)
  registerPersonalizationRoutes(app);

  // ============================================================================
  // CAREGIVER ENGAGEMENT SYSTEM ROUTES
  // ============================================================================

  // Caregiver Registration (self-registration with access request)
  app.post("/api/auth/register/caregiver", authLimiter, async (req, res) => {
    try {
      const parsed = caregiverRegistrationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const data = parsed.data;

      // Check if caregiver email already exists
      const existingCaregiver = await storage.getUserByEmail(data.email);
      if (existingCaregiver) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // Find the patient by name and DOB
      const patient = await storage.getPatientByName(
        data.patientFirstName,
        data.patientLastName,
        data.patientDateOfBirth
      );

      if (!patient) {
        return res.status(404).json({ error: "No patient found with the provided information" });
      }

      // Create caregiver user
      const newCaregiver = await storage.createUser({
        email: data.email,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        userType: 'caregiver',
        isActive: true
      });

      // Create pending access request
      await storage.createCaregiverPatientRelation({
        caregiverId: newCaregiver.id,
        patientId: patient.id,
        relationshipType: data.relationshipType,
        accessStatus: 'pending'
      });

      // Create notification for patient about access request
      await storage.createCaregiverNotification({
        caregiverId: newCaregiver.id,
        patientId: patient.id,
        notificationType: 'access_request',
        title: 'Caregiver Access Request',
        message: `${data.firstName} ${data.lastName} (${data.relationshipType}) has requested access to view your progress.`,
        metadata: JSON.stringify({ caregiverName: `${data.firstName} ${data.lastName}`, relationshipType: data.relationshipType })
      });

      res.status(201).json({
        message: "Registration successful. Access request sent to patient.",
        userId: newCaregiver.id,
        patientId: patient.id,
        accessStatus: 'pending'
      });
    } catch (error) {
      logger.error("Caregiver registration error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to register caregiver" });
    }
  });

  // Caregiver Login
  app.post("/api/auth/login/caregiver", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const caregiver = await storage.getUserByEmail(email);
      if (!caregiver || caregiver.userType !== 'caregiver') {
        auditAuthEvent(req, AuditAction.LOGIN_FAILED, null, false, { userType: 'caregiver' });
        return res.status(401).json({ error: "Invalid caregiver credentials" });
      }

      // HIPAA: Set server-side session (await to ensure session is saved before response)
      await setAuthSession(req, caregiver);

      // HIPAA: Audit successful login
      auditAuthEvent(req, AuditAction.LOGIN_SUCCESS, caregiver.id, true, { userType: 'caregiver' });

      // Get patients this caregiver has access to
      const patients = await storage.getPatientsByCaregiverId(caregiver.id);

      // Get unread notifications
      const notifications = await storage.getCaregiverNotifications(caregiver.id, true);

      res.json({
        user: caregiver,
        patients,
        unreadNotifications: notifications.length
      });
    } catch (error) {
      logger.error("Caregiver login error", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Patient invites caregiver (patient-initiated)
  app.post("/api/patients/:patientId/invite-caregiver", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const parsed = caregiverInviteSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const data = parsed.data;

      // Check if caregiver already exists
      let caregiver = await storage.getUserByEmail(data.caregiverEmail);

      if (!caregiver) {
        // Create new caregiver user (pre-approved since patient initiated)
        caregiver = await storage.createUser({
          email: data.caregiverEmail,
          firstName: data.caregiverFirstName,
          lastName: data.caregiverLastName,
          userType: 'caregiver',
          isActive: true
        });
      }

      // Check if relationship already exists
      const existingRelation = await storage.getCaregiverPatientRelation(caregiver.id, patientId);
      if (existingRelation) {
        // If revoked/denied, reactivate as pending
        if (existingRelation.accessStatus === 'revoked' || existingRelation.accessStatus === 'denied') {
          await storage.updateCaregiverAccessStatus(existingRelation.id, 'pending' as any);

          // Create notification for caregiver
          const patient = await storage.getPatient(patientId);
          await storage.createCaregiverNotification({
            caregiverId: caregiver.id,
            patientId,
            notificationType: 'access_request',
            title: 'Caregiver Invitation',
            message: `${patient?.firstName} ${patient?.lastName} has invited you to be their caregiver. Please accept or decline the invitation.`,
            metadata: JSON.stringify({ patientName: `${patient?.firstName} ${patient?.lastName}` })
          });

          return res.status(201).json({
            message: "Caregiver invitation sent. They will be notified on their next login.",
            caregiverId: caregiver.id,
            relationshipId: existingRelation.id
          });
        }
        // If pending, return error
        if (existingRelation.accessStatus === 'pending') {
          return res.status(400).json({ error: "A pending invitation already exists for this caregiver" });
        }
        // If approved, return error
        if (existingRelation.accessStatus === 'approved') {
          return res.status(400).json({ error: "This caregiver already has access to this patient" });
        }
      }

      // Create pending relationship (caregiver needs to accept the invitation)
      const relation = await storage.createCaregiverPatientRelation({
        caregiverId: caregiver.id,
        patientId,
        relationshipType: data.relationshipType,
        accessStatus: 'pending',
        requestedBy: 'patient' // Patient initiated the invitation
      });

      // Create notification for caregiver
      const patient = await storage.getPatient(patientId);
      await storage.createCaregiverNotification({
        caregiverId: caregiver.id,
        patientId,
        notificationType: 'access_request',
        title: 'Caregiver Invitation',
        message: `${patient?.firstName} ${patient?.lastName} has invited you to be their caregiver. Please accept or decline the invitation.`,
        metadata: JSON.stringify({ patientName: `${patient?.firstName} ${patient?.lastName}` })
      });

      res.status(201).json({
        message: "Caregiver invitation sent. They will be notified on their next login.",
        caregiverId: caregiver.id,
        relationshipId: relation.id
      });
    } catch (error) {
      logger.error("Error inviting caregiver", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to invite caregiver" });
    }
  });

  // Get pending access requests for a patient
  app.get("/api/patients/:patientId/caregiver-requests", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const requests = await storage.getPendingCaregiverRequests(patientId);
      res.json(requests);
    } catch (error) {
      logger.error("Error fetching caregiver requests", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch caregiver requests" });
    }
  });

  // Get all caregivers for a patient
  app.get("/api/patients/:patientId/caregivers", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const caregivers = await storage.getCaregiversByPatientId(patientId);
      res.json(caregivers);
    } catch (error) {
      logger.error("Error fetching caregivers", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch caregivers" });
    }
  });

  // Approve/Deny/Revoke caregiver access (patient must authorize)
  app.patch("/api/caregiver-relations/:relationId/status", requireAuth, async (req, res) => {
    try {
      const relationId = parseInt(req.params.relationId);
      const { status } = req.body;

      if (!['approved', 'denied', 'revoked'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'approved', 'denied', or 'revoked'" });
      }

      const updated = await storage.updateCaregiverAccessStatus(relationId, status);
      if (!updated) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Create notification for caregiver
      const notificationType = status === 'approved' ? 'access_approved' : 'access_denied';
      const title = status === 'approved' ? 'Access Approved' : 'Access Request Update';
      const message = status === 'approved'
        ? 'Your request to view patient progress has been approved.'
        : 'Your access request was not approved at this time.';

      await storage.createCaregiverNotification({
        caregiverId: updated.caregiverId,
        patientId: updated.patientId,
        notificationType,
        title,
        message,
        metadata: '{}'
      });

      res.json(updated);
    } catch (error) {
      logger.error("Error updating caregiver status", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to update caregiver status" });
    }
  });

  // Get caregiver's patients and their data (caregiver dashboard)
  app.get("/api/caregivers/:caregiverId/patients", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const patients = await storage.getPatientsByCaregiverId(caregiverId);
      res.json(patients);
    } catch (error) {
      logger.error("Error fetching caregiver's patients", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  // Caregiver removes their access to a patient
  app.delete("/api/caregivers/:caregiverId/patients/:patientId", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const patientId = parseInt(req.params.patientId);

      // Ensure caregiver can only remove their own relationships
      if (req.authenticatedUser!.id !== caregiverId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteCaregiverPatientRelationship(caregiverId, patientId);

      logger.info("Caregiver removed patient access", { caregiverId, patientId });
      res.json({ success: true });
    } catch (error) {
      logger.error("Error removing caregiver patient access", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to remove patient access" });
    }
  });

  // Get pending patient invitations for a caregiver (patients who invited this caregiver)
  app.get("/api/caregivers/:caregiverId/patient-invitations", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);

      // Ensure caregiver can only see their own invitations
      if (req.authenticatedUser!.id !== caregiverId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const invitations = await storage.getPendingPatientInvitations(caregiverId);
      res.json(invitations);
    } catch (error) {
      logger.error("Error fetching patient invitations", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch patient invitations" });
    }
  });

  // Caregiver accepts/denies patient invitation
  app.patch("/api/caregivers/:caregiverId/patient-invitations/:relationId", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const relationId = parseInt(req.params.relationId);
      const { status } = req.body;

      // Ensure caregiver can only respond to their own invitations
      if (req.authenticatedUser!.id !== caregiverId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'denied'" });
      }

      const updated = await storage.updateCaregiverAccessStatus(relationId, status);
      if (!updated) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      // Create notification for patient (patient gets notified about caregiver's response)
      if (status === 'approved' || status === 'denied') {
        const caregiver = await storage.getUser(caregiverId);
        const caregiverName = caregiver ? `${caregiver.firstName} ${caregiver.lastName}` : 'Your caregiver';

        const notificationType = status === 'approved' ? 'caregiver_accepted' : 'caregiver_declined';
        const title = status === 'approved' ? 'Caregiver Accepted' : 'Caregiver Declined';
        const message = status === 'approved'
          ? `${caregiverName} has accepted your invitation and can now view your progress.`
          : `${caregiverName} has declined your invitation.`;

        await storage.createPatientNotification({
          patientId: updated.patientId,
          senderId: caregiverId,
          senderType: 'caregiver',
          notificationType,
          title,
          message,
          metadata: JSON.stringify({ caregiverName })
        });
      }

      logger.info("Caregiver responded to patient invitation", {
        caregiverId,
        relationId,
        status
      });

      res.json(updated);
    } catch (error) {
      logger.error("Error responding to patient invitation", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to respond to invitation" });
    }
  });

  // Get caregiver dashboard data for specific patient
  app.get("/api/caregivers/:caregiverId/patients/:patientId/dashboard", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const patientId = parseInt(req.params.patientId);

      logger.debug('Caregiver Dashboard: Fetching data', { caregiverId, patientId });

      // Verify caregiver has access to this patient
      let relation;
      try {
        relation = await storage.getCaregiverPatientRelation(caregiverId, patientId);
        logger.debug('Caregiver Dashboard: Relation lookup', { found: !!relation, accessStatus: relation?.accessStatus });
      } catch (e) {
        logger.error("Caregiver Dashboard: Error in getCaregiverPatientRelation", { error: (e as Error).message });
        throw e;
      }

      if (!relation || relation.accessStatus !== 'approved') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get patient data with individual error handling
      let patient, goals, stats, sessions, usageData;

      try {
        patient = await storage.getPatient(patientId);
        logger.debug('Caregiver Dashboard: Patient lookup', { found: !!patient });
      } catch (e) {
        logger.error("Caregiver Dashboard: Error in getPatient", { error: (e as Error).message });
        throw e;
      }

      try {
        goals = await storage.getGoalsByPatient(patientId);
        logger.debug('Caregiver Dashboard: Goals lookup', { goalsCount: goals?.length || 0 });
      } catch (e) {
        logger.error("Caregiver Dashboard: Error in getGoalsByPatient", { error: (e as Error).message });
        throw e;
      }

      try {
        stats = await storage.getPatientStats(patientId);
        logger.debug('Caregiver Dashboard: Stats lookup', { found: !!stats });
      } catch (e) {
        logger.error("Caregiver Dashboard: Error in getPatientStats", { error: (e as Error).message });
        throw e;
      }

      try {
        sessions = await storage.getSessionsByPatient(patientId);
        logger.debug('Caregiver Dashboard: Sessions lookup', { sessionsCount: sessions?.length || 0 });
      } catch (e) {
        logger.error("Caregiver Dashboard: Error in getSessionsByPatient", { error: (e as Error).message });
        throw e;
      }

      const recentSessions = sessions?.slice(0, 10) || [];

      try {
        usageData = await storage.getDailyUsageData(patientId, 30);
        logger.debug('Caregiver Dashboard: Usage data lookup', { entriesCount: usageData?.length || 0 });
      } catch (e) {
        logger.error("Caregiver Dashboard: Error in getDailyUsageData", { error: (e as Error).message });
        throw e;
      }

      res.json({
        patient,
        goals: goals || [],
        stats: stats || null,
        recentSessions,
        usageData: usageData || [],
        caregiverRelation: relation
      });
    } catch (error) {
      logger.error("Error fetching caregiver dashboard", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Caregiver Observations
  app.post("/api/caregivers/:caregiverId/observations", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const parsed = caregiverObservationSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const data = parsed.data;

      // Verify caregiver has access to this patient
      const relation = await storage.getCaregiverPatientRelation(caregiverId, data.patientId);
      if (!relation || relation.accessStatus !== 'approved') {
        return res.status(403).json({ error: "Access denied" });
      }

      // Create observation
      const observation = await storage.createCaregiverObservation({
        caregiverId,
        patientId: data.patientId,
        observationDate: data.observationDate,
        moodLevel: data.moodLevel || null,
        painLevel: data.painLevel || null,
        energyLevel: data.energyLevel || null,
        appetite: data.appetite || null,
        sleepQuality: data.sleepQuality || null,
        mobilityObservations: data.mobilityObservations || null,
        notes: data.notes || null,
        concerns: data.concerns || null,
        questionsForProvider: data.questionsForProvider || null
      });

      // Generate AI summary
      const summaryParts = [];
      if (data.moodLevel) summaryParts.push(`Mood: ${data.moodLevel}`);
      if (data.painLevel !== undefined) summaryParts.push(`Pain level: ${data.painLevel}/10`);
      if (data.energyLevel) summaryParts.push(`Energy: ${data.energyLevel}`);
      if (data.appetite) summaryParts.push(`Appetite: ${data.appetite}`);
      if (data.sleepQuality) summaryParts.push(`Sleep: ${data.sleepQuality}`);
      if (data.mobilityObservations) summaryParts.push(`Mobility notes: ${data.mobilityObservations}`);
      if (data.concerns) summaryParts.push(`Concerns: ${data.concerns}`);
      if (data.questionsForProvider) summaryParts.push(`Questions for provider: ${data.questionsForProvider}`);

      const aiSummary = `Caregiver observation from ${data.observationDate}: ${summaryParts.join('. ')}`;

      await storage.updateObservationAiSummary(observation.id, aiSummary);

      // Award XP for observation
      await storage.updateCaregiverXp(relation.id, 10);

      res.status(201).json({
        ...observation,
        aiSummary
      });
    } catch (error) {
      logger.error("Error creating observation", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to create observation" });
    }
  });

  // Get observations for a patient
  app.get("/api/patients/:patientId/observations", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const limit = parseInt(req.query.limit as string) || 10;
      const observations = await storage.getCaregiverObservationsByPatient(patientId, limit);
      res.json(observations);
    } catch (error) {
      logger.error("Error fetching observations", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch observations" });
    }
  });

  // Patient or caregiver logs an observation (unified observations table)
  app.post("/api/patients/:patientId/observations", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const userId = req.session.user?.id;
      const userType = req.session.user?.userType;

      // Determine observer type and ID based on who's making the request
      let observerId: number;
      let observerType: 'patient' | 'caregiver';

      if (userType === 'patient' && userId === patientId) {
        // Patient logging for themselves
        observerId = patientId;
        observerType = 'patient';
      } else if (userType === 'caregiver') {
        // Caregiver logging for their linked patient (authorizePatientAccess already verified access)
        observerId = userId!;
        observerType = 'caregiver';
      } else {
        return res.status(403).json({ error: "You don't have permission to log observations for this patient" });
      }

      const parsed = observationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const data = parsed.data;

      // Create observation
      const observation = await storage.createObservation({
        patientId,
        observerId,
        observerType,
        observationDate: data.observationDate,
        moodLevel: data.moodLevel || null,
        painLevel: data.painLevel !== undefined ? data.painLevel : null,
        energyLevel: data.energyLevel || null,
        appetite: data.appetite || null,
        sleepQuality: data.sleepQuality || null,
        mobilityObservations: data.mobilityObservations || null,
        notes: data.notes || null,
        concerns: data.concerns || null,
        questionsForProvider: data.questionsForProvider || null,
      });

      // Generate a simple AI summary
      const summaryParts: string[] = [];
      if (data.moodLevel) summaryParts.push(`Mood: ${data.moodLevel}`);
      if (data.painLevel !== undefined) summaryParts.push(`Pain: ${data.painLevel}/10`);
      if (data.energyLevel) summaryParts.push(`Energy: ${data.energyLevel}`);
      if (data.appetite) summaryParts.push(`Appetite: ${data.appetite}`);
      if (data.sleepQuality) summaryParts.push(`Sleep: ${data.sleepQuality}`);
      if (data.mobilityObservations) summaryParts.push(`Mobility notes: ${data.mobilityObservations}`);
      if (data.notes) summaryParts.push(`Notes: ${data.notes}`);
      if (data.concerns) summaryParts.push(`Concerns: ${data.concerns}`);
      if (data.questionsForProvider) summaryParts.push(`Questions for provider: ${data.questionsForProvider}`);

      const observerLabel = observerType === 'patient' ? 'Patient self-reported' : 'Caregiver-reported';
      const aiSummary = `${observerLabel} observation from ${data.observationDate}: ${summaryParts.join('. ')}`;

      await storage.updateUnifiedObservationAiSummary(observation.id, aiSummary);

      res.status(201).json({
        ...observation,
        aiSummary
      });
    } catch (error) {
      logger.error("Error creating patient observation", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to create observation" });
    }
  });

  // Get AI-summarized daily observations for a patient (for providers)
  app.get("/api/patients/:patientId/observations/daily-summary", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const date = req.query.date as string || new Date().toISOString().split('T')[0];

      // Get all observations for this date
      const allObservations = await storage.getAllObservationsForDate(patientId, date);

      if (allObservations.length === 0) {
        return res.json({
          date,
          observationCount: 0,
          observations: [],
          aiSummary: `No observations recorded for ${date}.`,
          copyPasteText: `Daily Observations (${date}): No observations recorded.`
        });
      }

      // Build copy-pasteable text for EMR
      const obsText = allObservations.map((obs, i) => {
        const parts: string[] = [];
        parts.push(`Observation ${i + 1} (by ${obs.observerName}, ${obs.observerType}):`);
        if (obs.moodLevel) parts.push(`  Mood: ${obs.moodLevel}`);
        if (obs.painLevel !== null) parts.push(`  Pain: ${obs.painLevel}/10`);
        if (obs.energyLevel) parts.push(`  Energy: ${obs.energyLevel}`);
        if (obs.appetite) parts.push(`  Appetite: ${obs.appetite}`);
        if (obs.sleepQuality) parts.push(`  Sleep: ${obs.sleepQuality}`);
        if (obs.mobilityObservations) parts.push(`  Mobility: ${obs.mobilityObservations}`);
        if (obs.notes) parts.push(`  Notes: ${obs.notes}`);
        if (obs.concerns) parts.push(`  Concerns: ${obs.concerns}`);
        if (obs.questionsForProvider) parts.push(`  Questions: ${obs.questionsForProvider}`);
        return parts.join('\n');
      }).join('\n\n');

      const copyPasteText = `DAILY OBSERVATIONS (${date})\n${'='.repeat(40)}\n${allObservations.length} observation(s) recorded\n\n${obsText}`;

      // Generate a concise AI summary
      const summaryItems: string[] = [];

      // Aggregate mood - find most common or notable
      const moods = allObservations.filter(o => o.moodLevel).map(o => o.moodLevel);
      if (moods.length > 0) {
        const moodCounts = moods.reduce((acc, m) => { acc[m!] = (acc[m!] || 0) + 1; return acc; }, {} as Record<string, number>);
        const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];
        summaryItems.push(`Mood: primarily ${dominantMood}`);
      }

      // Aggregate pain - show range
      const painLevels = allObservations.filter(o => o.painLevel !== null).map(o => o.painLevel!);
      if (painLevels.length > 0) {
        const minPain = Math.min(...painLevels);
        const maxPain = Math.max(...painLevels);
        summaryItems.push(minPain === maxPain ? `Pain: ${minPain}/10` : `Pain: ${minPain}-${maxPain}/10`);
      }

      // Aggregate energy
      const energyLevels = allObservations.filter(o => o.energyLevel).map(o => o.energyLevel);
      if (energyLevels.length > 0) {
        const energyCounts = energyLevels.reduce((acc, e) => { acc[e!] = (acc[e!] || 0) + 1; return acc; }, {} as Record<string, number>);
        const dominantEnergy = Object.entries(energyCounts).sort((a, b) => b[1] - a[1])[0][0];
        summaryItems.push(`Energy: ${dominantEnergy}`);
      }

      // Note any concerns
      const allConcerns = allObservations.filter(o => o.concerns).map(o => o.concerns);
      if (allConcerns.length > 0) {
        summaryItems.push(`Concerns flagged: ${allConcerns.length}`);
      }

      // Note any questions
      const allQuestions = allObservations.filter(o => o.questionsForProvider).map(o => o.questionsForProvider);
      if (allQuestions.length > 0) {
        summaryItems.push(`Questions for provider: ${allQuestions.length}`);
      }

      const aiSummary = summaryItems.length > 0
        ? `Daily summary for ${date}: ${summaryItems.join('; ')}.`
        : `${allObservations.length} observation(s) recorded for ${date}.`;

      res.json({
        date,
        observationCount: allObservations.length,
        observations: allObservations,
        aiSummary,
        copyPasteText
      });
    } catch (error) {
      logger.error("Error fetching daily observations summary", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch daily observations summary" });
    }
  });

  // Caregiver Notifications
  app.get("/api/caregivers/:caregiverId/notifications", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await storage.getCaregiverNotifications(caregiverId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      logger.error("Error fetching notifications", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/caregiver-notifications/:notificationId/read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.notificationId);
      const updated = await storage.markCaregiverNotificationRead(notificationId);
      res.json(updated);
    } catch (error) {
      logger.error("Error marking notification read", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  app.post("/api/caregivers/:caregiverId/notifications/read-all", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      await storage.markAllCaregiverNotificationsRead(caregiverId);
      res.json({ success: true });
    } catch (error) {
      logger.error("Error marking all notifications read", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to mark notifications read" });
    }
  });

  // Discharge Checklist
  app.get("/api/patients/:patientId/discharge-checklist", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const caregiverId = req.query.caregiverId ? parseInt(req.query.caregiverId as string) : undefined;
      const checklist = await storage.getOrCreateDischargeChecklist(patientId, caregiverId);
      res.json(checklist);
    } catch (error) {
      logger.error("Error fetching discharge checklist", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch discharge checklist" });
    }
  });

  app.patch("/api/discharge-checklists/:checklistId", async (req, res) => {
    try {
      const checklistId = parseInt(req.params.checklistId);
      const updates = req.body;

      // Calculate completion percentage
      const fields = ['equipmentNeeds', 'homeModifications', 'medicationReview',
                      'followUpAppointments', 'emergencyContacts', 'warningSigns',
                      'homeExercisePlan', 'dietRestrictions'];

      let completedCount = 0;
      for (const field of fields) {
        if (updates[field]) {
          const data = typeof updates[field] === 'string' ? JSON.parse(updates[field]) : updates[field];
          if (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0) {
            completedCount++;
          }
        }
      }
      updates.completionPercent = Math.round((completedCount / fields.length) * 100);

      const updated = await storage.updateDischargeChecklist(checklistId, updates);
      res.json(updated);
    } catch (error) {
      logger.error("Error updating discharge checklist", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to update discharge checklist" });
    }
  });

  // Check for active session (conflict detection)
  app.get("/api/patients/:patientId/active-session", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const activeSession = await storage.getActiveSessionForPatient(patientId);
      res.json({ hasActiveSession: !!activeSession, session: activeSession || null });
    } catch (error) {
      logger.error("Error checking active session", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to check active session" });
    }
  });

  // Caregiver Achievements
  app.get("/api/caregivers/:caregiverId/achievements", requireAuth, requireCaregiver, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      const achievements = await storage.getCaregiverAchievements(caregiverId, patientId);
      res.json(achievements);
    } catch (error) {
      logger.error("Error fetching caregiver achievements", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  // Caregiver nudge to patient
  app.post("/api/caregivers/:caregiverId/nudge/:patientId", requireAuth, requireCaregiver, kudosLimiter, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const patientId = parseInt(req.params.patientId);
      const { message } = req.body;

      // Verify caregiver has access
      const relation = await storage.getCaregiverPatientRelation(caregiverId, patientId);
      if (!relation || relation.accessStatus !== 'approved' || !relation.canSendNudges) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get caregiver info for the nudge
      const caregiver = await storage.getUser(caregiverId);

      // Create nudge using existing nudge system
      const nudge = await kudosService.sendNudge(
        caregiverId,
        patientId,
        'caregiver_encouragement',
        message || `${caregiver?.firstName} is cheering you on!`
      );

      // Award XP for sending nudge
      await storage.updateCaregiverXp(relation.id, 5);

      res.status(201).json(nudge);
    } catch (error) {
      logger.error("Error sending caregiver nudge", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to send nudge" });
    }
  });

  // ============================================================================
  // PROVIDER ACCESS REQUEST SYSTEM ROUTES
  // ============================================================================

  // Provider requests access to a patient (provider initiates)
  app.post("/api/provider-access-requests", requireAuth, requireProvider, async (req, res) => {
    try {
      const providerId = req.authenticatedUser!.id;
      const parsed = providerAccessRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { patientFirstName, patientLastName, patientDateOfBirth } = parsed.data;

      // Find the patient by name and DOB
      const patient = await storage.getPatientByName(patientFirstName, patientLastName, patientDateOfBirth);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found. Please verify the patient's name and date of birth." });
      }

      // Check if relationship already exists
      const existingRelation = await storage.getProviderPatientRelation(providerId, patient.id);
      if (existingRelation) {
        // First check if relationship was deactivated/revoked - allow re-requesting
        if (!existingRelation.isActive || existingRelation.accessStatus === 'revoked') {
          // Reactivate and set to pending for provider request
          const reactivatedRelation = await storage.reactivateProviderPatientRelation(existingRelation.id, 'provider');
          return res.status(201).json({
            message: "Access request sent successfully. The patient will be notified on their next login.",
            relationId: reactivatedRelation?.id || existingRelation.id,
            patientId: patient.id
          });
        }
        // If there's already a pending request from either party
        if (existingRelation.accessStatus === 'pending') {
          if (existingRelation.requestedBy === 'patient') {
            return res.status(400).json({ error: "This patient has already invited you. Please check your pending requests." });
          }
          return res.status(400).json({ error: "You already have a pending access request for this patient." });
        }
        // If already approved and active
        if (existingRelation.accessStatus === 'approved' && existingRelation.permissionGranted) {
          return res.status(400).json({ error: "You already have access to this patient." });
        }
        // If denied
        if (existingRelation.accessStatus === 'denied') {
          return res.status(400).json({ error: "Your previous access request was denied. Please contact the patient directly." });
        }
      }

      // Create the access request
      const relation = await storage.createProviderAccessRequest(providerId, patient.id);

      logger.info("Provider requested patient access", {
        providerId,
        patientId: patient.id,
        relationId: relation.id
      });

      res.status(201).json({
        message: "Access request sent successfully. The patient will be notified on their next login.",
        relationId: relation.id,
        patientId: patient.id
      });
    } catch (error) {
      logger.error("Error creating provider access request", { error: (error as Error).message, stack: (error as Error).stack });
      res.status(500).json({ error: "Failed to create access request" });
    }
  });

  // Get pending provider requests for a patient (requests FROM providers TO patient)
  app.get("/api/patients/:patientId/provider-requests", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const requests = await storage.getPendingProviderRequests(patientId);
      res.json(requests);
    } catch (error) {
      logger.error("Error fetching provider requests", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch provider requests" });
    }
  });

  // Get pending patient requests for a provider (requests FROM patients TO provider)
  app.get("/api/providers/:providerId/patient-requests", requireAuth, requireProvider, async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);

      // Ensure provider can only see their own requests
      if (req.authenticatedUser!.id !== providerId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const requests = await storage.getPendingPatientRequests(providerId);
      res.json(requests);
    } catch (error) {
      logger.error("Error fetching patient requests", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch patient requests" });
    }
  });

  // Approve/Deny/Revoke provider access (patient action)
  app.patch("/api/provider-relations/:relationId/status", requireAuth, async (req, res) => {
    try {
      const relationId = parseInt(req.params.relationId);
      const { status } = req.body;

      if (!['approved', 'denied', 'revoked'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'approved', 'denied', or 'revoked'" });
      }

      const updated = await storage.updateProviderAccessStatus(relationId, status);
      if (!updated) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Create notification for provider
      const notificationType = status === 'approved' ? 'access_approved' : status === 'denied' ? 'access_denied' : 'access_revoked';
      const title = status === 'approved' ? 'Access Approved' : status === 'denied' ? 'Access Request Denied' : 'Access Revoked';
      const message = status === 'approved'
        ? 'Your request to view patient data has been approved.'
        : status === 'denied'
        ? 'Your access request was not approved at this time.'
        : 'Your access to this patient has been revoked.';

      await storage.createProviderNotification({
        providerId: updated.providerId,
        patientId: updated.patientId,
        notificationType,
        title,
        message,
        metadata: '{}'
      });

      logger.info("Provider access status updated", {
        relationId,
        status,
        providerId: updated.providerId,
        patientId: updated.patientId
      });

      res.json(updated);
    } catch (error) {
      logger.error("Error updating provider access status", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to update provider access status" });
    }
  });

  // Patient invites a provider (creates pending request for provider to accept)
  app.post("/api/patients/:patientId/invite-provider", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { providerEmail } = req.body;

      if (!providerEmail) {
        return res.status(400).json({ error: "Provider email is required" });
      }

      // Find the provider by email
      const provider = await storage.getUserByEmail(providerEmail);
      if (!provider || provider.userType !== 'provider') {
        return res.status(404).json({ error: "Provider not found. Please verify the email address." });
      }

      // Check if relationship already exists
      const existingRelation = await storage.getProviderPatientRelation(provider.id, patientId);
      if (existingRelation) {
        if (existingRelation.accessStatus === 'pending') {
          return res.status(400).json({ error: "A pending request already exists with this provider." });
        }
        if (existingRelation.accessStatus === 'approved' && existingRelation.permissionGranted) {
          return res.status(400).json({ error: "This provider already has access to your data." });
        }
      }

      // Create the access request (patient inviting provider)
      const relation = await storage.createPatientAccessRequest(provider.id, patientId);

      // Create notification for provider
      const patient = await storage.getUser(patientId);
      await storage.createProviderNotification({
        providerId: provider.id,
        patientId: patientId,
        notificationType: 'access_request',
        title: 'Patient Access Request',
        message: `${patient?.firstName} ${patient?.lastName} has invited you to view their mobility data.`,
        metadata: JSON.stringify({ patientName: `${patient?.firstName} ${patient?.lastName}` })
      });

      logger.info("Patient invited provider", {
        patientId,
        providerId: provider.id,
        relationId: relation.id
      });

      res.status(201).json({
        message: "Invitation sent successfully. The provider will be notified on their next login.",
        relationId: relation.id,
        providerId: provider.id
      });
    } catch (error) {
      logger.error("Error inviting provider", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to invite provider" });
    }
  });

  // Provider accepts/denies patient invitation
  app.patch("/api/providers/:providerId/patient-requests/:relationId", requireAuth, requireProvider, async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const relationId = parseInt(req.params.relationId);
      const { status } = req.body;

      // Ensure provider can only respond to their own requests
      if (req.authenticatedUser!.id !== providerId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!['approved', 'denied'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be 'approved' or 'denied'" });
      }

      const updated = await storage.updateProviderAccessStatus(relationId, status);
      if (!updated) {
        return res.status(404).json({ error: "Resource not found" });
      }

      // Notify the patient about the provider's response
      const provider = await storage.getUser(providerId);
      const providerName = provider ? `${provider.credentials || ''} ${provider.firstName} ${provider.lastName}`.trim() : 'Your provider';

      const notificationType = status === 'approved' ? 'provider_accepted' : 'provider_declined';
      const title = status === 'approved' ? 'Provider Accepted' : 'Provider Declined';
      const message = status === 'approved'
        ? `${providerName} has accepted your invitation and can now view your mobility data.`
        : `${providerName} has declined your invitation.`;

      await storage.createPatientNotification({
        patientId: updated.patientId,
        senderId: providerId,
        senderType: 'provider',
        notificationType,
        title,
        message,
        metadata: JSON.stringify({ providerName })
      });

      logger.info("Provider responded to patient invitation", {
        providerId,
        relationId,
        status
      });

      res.json(updated);
    } catch (error) {
      logger.error("Error responding to patient invitation", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to respond to invitation" });
    }
  });

  // Provider Notifications
  app.get("/api/providers/:providerId/notifications", requireAuth, requireProvider, async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);

      // Ensure provider can only see their own notifications
      if (req.authenticatedUser!.id !== providerId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await storage.getProviderNotifications(providerId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      logger.error("Error fetching provider notifications", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/provider-notifications/:notificationId/read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.notificationId);
      const updated = await storage.markProviderNotificationRead(notificationId);
      res.json(updated);
    } catch (error) {
      logger.error("Error marking provider notification read", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  app.post("/api/providers/:providerId/notifications/read-all", requireAuth, requireProvider, async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);

      // Ensure provider can only mark their own notifications as read
      if (req.authenticatedUser!.id !== providerId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.markAllProviderNotificationsRead(providerId);
      res.json({ success: true });
    } catch (error) {
      logger.error("Error marking all provider notifications read", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to mark notifications read" });
    }
  });

  // =========================================================================
  // Patient Notifications
  // =========================================================================

  // Get patient notifications
  app.get("/api/patients/:patientId/notifications", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await storage.getPatientNotifications(patientId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      logger.error("Error fetching patient notifications", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark patient notification as read
  app.patch("/api/patient-notifications/:notificationId/read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.notificationId);
      const updated = await storage.markPatientNotificationRead(notificationId);
      res.json(updated);
    } catch (error) {
      logger.error("Error marking patient notification read", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to mark notification read" });
    }
  });

  // Mark all patient notifications as read
  app.post("/api/patients/:patientId/notifications/read-all", requireAuth, authorizePatientAccess, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      await storage.markAllPatientNotificationsRead(patientId);
      res.json({ success: true });
    } catch (error) {
      logger.error("Error marking all patient notifications read", { error: (error as Error).message });
      res.status(500).json({ error: "Failed to mark notifications read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Seed initial data
async function seedInitialData() {
  try {
    // Check if Heidi Kissane already exists
    const existingHeidi = await storage.getUserByEmail('heidikissane@hospital.com');
    
    if (!existingHeidi) {
      // Create Heidi Kissane, DPT as the first provider
      await storage.createUser({
        email: 'heidikissane@hospital.com',
        firstName: 'Heidi',
        lastName: 'Kissane',
        userType: 'provider',
        credentials: 'DPT',
        specialty: 'Physical Therapy',
        licenseNumber: 'PT12345',
        isActive: true
      });
      
      logger.debug('Seeded initial provider', { name: 'Heidi Kissane, DPT' });
    }
    
    // Create comprehensive patient data with realistic mock sessions
    await seedPatientWithMockData();
  } catch (error) {
    logger.error('Failed to seed initial data', { error: (error as Error).message });
  }
}

// Comprehensive patient seeding with believable mock data
async function seedPatientWithMockData() {
  try {
    // Check if Neil Jairath (existing patient from localStorage) exists
    let patient = await storage.getPatientByName('Neil', 'Jairath', '1996-04-01');
    
    if (!patient) {
      // Create the patient that matches the localStorage data
      patient = await storage.createUser({
        email: 'neil.jairath@patient.com',
        firstName: 'Neil',
        lastName: 'Jairath',
        dateOfBirth: '1996-04-01',
        userType: 'patient',
        admissionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Always 4 days ago
      });
      
      logger.debug('Created patient', { name: 'Neil Jairath' });
    } else {
      // Update existing patient's admission date to always be 4 days ago
      const updatedAdmissionDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (patient.admissionDate !== updatedAdmissionDate) {
        await storage.updateUser(patient.id, { admissionDate: updatedAdmissionDate });
        logger.debug('Updated patient admission date', { admissionDate: updatedAdmissionDate });
      }
    }

    // Calculate days since admission (4 days ago to now)
    const admissionDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const daysSinceAdmission = Math.floor((today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if we already have session data
    const existingSessions = await storage.getSessionsByPatient(patient.id);

    // Calculate the date range for the last 4 days (rolling window)
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 3); // Last 4 days including today
    const fourDaysAgoStr = fourDaysAgo.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Separate sessions into categories
    const sessionsWithinWindow: typeof existingSessions = [];
    const sessionsOutsideWindow: typeof existingSessions = [];
    const manualSessionDatesWithinWindow = new Set<string>();

    for (const session of existingSessions) {
      const isWithinWindow = session.sessionDate >= fourDaysAgoStr && session.sessionDate <= todayStr;
      if (isWithinWindow) {
        sessionsWithinWindow.push(session);
        // Track dates that have manual sessions (so we don't overwrite them)
        if ((session as any).isManual === true) {
          manualSessionDatesWithinWindow.add(session.sessionDate);
        }
      } else {
        sessionsOutsideWindow.push(session);
      }
    }

    // Check if TODAY already has sessions - if so, skip regeneration to prevent duplicates
    const todaysSessions = existingSessions.filter(s => s.sessionDate === todayStr);
    if (todaysSessions.length > 0) {
      logger.debug('Patient already has sessions today, skipping regeneration', { sessionsCount: todaysSessions.length });

      // Still clean up sessions outside window
      if (sessionsOutsideWindow.length > 0) {
        for (const session of sessionsOutsideWindow) {
          await db.delete(exerciseSessions).where(eq(exerciseSessions.id, session.id));
        }
        logger.debug('Cleared sessions outside rolling window', { count: sessionsOutsideWindow.length });
      }
    } else {
      // Delete ALL sessions outside the rolling window (both manual and auto-generated)
      if (sessionsOutsideWindow.length > 0) {
        for (const session of sessionsOutsideWindow) {
          await db.delete(exerciseSessions).where(eq(exerciseSessions.id, session.id));
        }
        logger.debug('Cleared sessions outside rolling window', { count: sessionsOutsideWindow.length });
      }

      // Delete auto-generated sessions within window (to regenerate fresh ones)
      // But KEEP manual sessions within window
      const autoSessionsWithinWindow = sessionsWithinWindow.filter(s => (s as any).isManual !== true);
      if (autoSessionsWithinWindow.length > 0) {
        for (const session of autoSessionsWithinWindow) {
          await db.delete(exerciseSessions).where(eq(exerciseSessions.id, session.id));
        }
        logger.debug('Cleared auto-generated sessions to refresh', { count: autoSessionsWithinWindow.length });
      }

      // Generate new auto sessions for days that don't have manual sessions
      // This ensures we always have fresh demo data while preserving user inputs
      await generateRecentSessionData(patient.id, 4, manualSessionDatesWithinWindow);
      logger.debug('Generated rolling window sessions', { from: fourDaysAgoStr, to: todayStr, preservedManualDates: manualSessionDatesWithinWindow.size });
    }

    // Ensure patient stats exist
    let stats = await storage.getPatientStats(patient.id);
    if (!stats) {
      // Calculate totals from generated sessions
      const sessions = await storage.getSessionsByPatient(patient.id);
      const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
      const totalDistance = sessions.reduce((sum, s) => sum + Number(s.avgPower || 0) * 0.1, 0); // Approximate distance
      const avgPower = sessions.length > 0 ? sessions.reduce((sum, s) => sum + Number(s.avgPower || 0), 0) / sessions.length : 0;

      // Create patient stats manually since createPatientStats doesn't exist
      const [newStats] = await db.insert(patientStats).values({
        patientId: patient.id,
        totalSessions: sessions.length,
        totalDuration,
        avgDailyDuration: totalDuration / daysSinceAdmission,
        consistencyStreak: calculateCurrentStreak(sessions),
        xp: sessions.length * 50 + Math.floor(totalDuration / 60) * 10, // 50 XP per session + 10 XP per minute
        level: 1
      }).returning();
      
      stats = newStats;
      
      logger.debug('Created patient stats with realistic totals');
    }

    // Create realistic goals based on patient progress
    await createProgressiveGoals(patient.id, stats);

    return patient;
  } catch (error) {
    logger.error('Failed to seed patient with mock data', { error: (error as Error).message });
  }
}

// Generate sessions for the last N days from today
// skipDates: Set of date strings (YYYY-MM-DD) to skip (e.g., days with manual sessions)
async function generateRecentSessionData(patientId: number, numDays: number, skipDates: Set<string> = new Set()) {
  const sessions = [];
  const today = new Date();
  const usePostgres = process.env.USE_POSTGRES === 'true';

  // Generate sessions for the last numDays days
  for (let daysAgo = numDays - 1; daysAgo >= 0; daysAgo--) {
    const sessionDate = new Date(today);
    sessionDate.setDate(today.getDate() - daysAgo);
    const sessionDateStr = sessionDate.toISOString().split('T')[0];

    // Skip dates that have manual sessions (don't overwrite user input)
    if (skipDates.has(sessionDateStr)) {
      continue;
    }

    // 1-2 sessions per day with realistic progression
    const sessionsPerDay = Math.random() < 0.5 ? 1 : 2;

    for (let sessionNum = 0; sessionNum < sessionsPerDay; sessionNum++) {
      // Progressive improvement over the 4 days
      const progressFactor = (numDays - daysAgo) / numDays; // 0.25, 0.5, 0.75, 1.0

      // Duration: 15-20 minutes, increasing slightly each day (stored in MINUTES)
      const baseDuration = 15 + (progressFactor * 5); // 15-20 minutes
      const variance = baseDuration * 0.2;
      const duration = Math.floor(baseDuration + (Math.random() - 0.5) * variance);

      // Power: 28-35W, increasing with progress
      const basePower = 28 + (progressFactor * 7);
      const powerVariance = basePower * 0.3;
      const avgPower = Math.floor(basePower + (Math.random() - 0.5) * powerVariance);
      const maxPower = Math.floor(avgPower * (1.3 + Math.random() * 0.2));

      // Create proper timestamps
      const startTimeDate = new Date(sessionDate);
      startTimeDate.setHours(9 + sessionNum * 5 + Math.floor(Math.random() * 2)); // Morning and afternoon sessions
      const endTimeDate = new Date(startTimeDate.getTime() + duration * 60 * 1000); // Convert minutes to ms for timestamp

      // PostgreSQL expects Date objects or ISO strings, SQLite expects Unix timestamps
      const startTime = usePostgres ? startTimeDate : Math.floor(startTimeDate.getTime() / 1000);
      const endTime = usePostgres ? endTimeDate : Math.floor(endTimeDate.getTime() / 1000);

      sessions.push({
        patientId,
        sessionDate: sessionDateStr,
        startTime: startTime as any,
        endTime: endTime as any,
        duration,
        avgPower: avgPower.toString(),
        maxPower: maxPower.toString(),
        resistance: (2.5 + progressFactor * 2).toFixed(1), // 2.5 to 4.5
        stopsAndStarts: Math.max(0, 6 - Math.floor(progressFactor * 4)), // 6 down to 2
        isCompleted: true,
        isManual: false, // Mark as auto-generated (not manual)
        sessionNotes: `Session ${sessionNum + 1}: Good effort, patient showing steady progress`
      } as any);
    }
  }

  // Create all sessions in database
  if (usePostgres) {
    // For PostgreSQL, use PostgreSQL schema to avoid SQLite timestamp conversion
    const pgSchema = await import('@shared/schema.postgres');
    for (const session of sessions) {
      await db.insert(pgSchema.exerciseSessions).values(session);
    }
  } else {
    // For SQLite, use storage layer
    for (const session of sessions) {
      await storage.createSession(session);
    }
  }

  return sessions;
}

// Generate realistic progressive session data
async function generateRealisticSessionData(patientId: number, daysSinceAdmission: number) {
  const sessions = [];
  
  // Progressive improvement model: starts low, gradually increases
  for (let day = 0; day < daysSinceAdmission; day++) {
    const sessionDate = new Date('2025-06-16');
    sessionDate.setDate(sessionDate.getDate() + day);
    
    // Skip some days early on (patient too weak) and occasional rest days
    const skipProbability = Math.max(0.3 - (day * 0.02), 0.05); // 30% initially, down to 5%
    if (Math.random() < skipProbability) continue;
    
    // 1-3 sessions per day, more as patient improves
    const sessionsPerDay = day < 3 ? 1 : (day < 10 ? 1 + Math.random() < 0.5 ? 1 : 0 : Math.floor(Math.random() * 2) + 1);
    
    for (let sessionNum = 0; sessionNum < sessionsPerDay; sessionNum++) {
      // Progressive improvement: duration and power increase over time
      const progressFactor = Math.min(day / 30, 1); // Plateau after 30 days
      
      // Duration: 3-5 minutes initially, up to 15-25 minutes
      const baseDuration = 180 + (progressFactor * 900); // 3-18 minutes base
      const variance = baseDuration * 0.3; // ±30% variance
      const duration = Math.floor(baseDuration + (Math.random() - 0.5) * variance);
      
      // Power: 15-25W initially, up to 40-80W
      const basePower = 20 + (progressFactor * 40); // 20-60W base
      const powerVariance = basePower * 0.4; // ±40% variance
      const avgPower = Math.floor(basePower + (Math.random() - 0.5) * powerVariance);
      const maxPower = Math.floor(avgPower * (1.2 + Math.random() * 0.3)); // 20-50% higher than avg
      
      // Distance based on duration and steady pace
      const distanceKm = (duration / 3600) * (12 + progressFactor * 8); // 12-20 km/h equivalent
      
      // RPE based on effort level
      const rpe = Math.floor(11 + progressFactor * 4 + Math.random() * 2); // 11-17, higher as they get stronger
      
      // Create proper timestamps
      const startTime = new Date(sessionDate);
      startTime.setHours(8 + sessionNum * 4 + Math.floor(Math.random() * 3)); // 8am, 12pm, 4pm +/- random
      const endTime = new Date(startTime.getTime() + duration * 1000);

      sessions.push({
        patientId,
        sessionDate: sessionDate.toISOString().split('T')[0],
        startTime,
        endTime,
        duration,
        avgPower: avgPower.toString(),
        maxPower: maxPower.toString(),
        resistance: '3', // Default resistance level
        stopsAndStarts: Math.floor(Math.random() * 3), // 0-2 stops
        isCompleted: true,
        sessionNotes: getRandomSessionNote(day, sessionNum, progressFactor)
      });
    }
  }
  
  // Create all sessions in database using the correct method
  for (const session of sessions) {
    await storage.createSession(session);
  }
  
  return sessions;
}

// Calculate current streak of consecutive days with sessions
function calculateCurrentStreak(sessions: any[]): number {
  if (sessions.length === 0) return 0;

  // Group sessions by date (unique dates only)
  const sessionDates = new Set(sessions.map(s => s.sessionDate).filter(d => d));
  const sortedDates = Array.from(sessionDates).sort().reverse(); // Most recent first

  if (sortedDates.length === 0) return 0;

  // Get today in America/New_York timezone as YYYY-MM-DD
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  // Helper to subtract days from a YYYY-MM-DD string
  const subtractDay = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // Local date, no UTC shift
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  let streak = 0;
  let expectedDate = todayStr;

  for (const dateStr of sortedDates) {
    // Compare as strings (both are YYYY-MM-DD format)
    if (dateStr === expectedDate) {
      streak++;
      expectedDate = subtractDay(expectedDate);
    } else if (dateStr < expectedDate) {
      // Gap in streak found
      break;
    }
    // If dateStr > expectedDate, skip it (future date, shouldn't happen)
  }

  // If we didn't find any sessions today or yesterday, streak is 0
  // (streak must be current to count)
  if (streak > 0) {
    const mostRecentDate = sortedDates[0];
    // Check if most recent session is today or yesterday
    const yesterdayStr = subtractDay(todayStr);
    if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
      // Streak is broken if last session was more than yesterday
      return 0;
    }
  }

  return streak;
}

// Create progressive goals that match patient's journey
async function createProgressiveGoals(patientId: number, stats: any) {
  const existingGoals = await storage.getPatientGoals(patientId);
  if (existingGoals.length > 0) return; // Goals already exist
  
  // Goals that reflect realistic progression and risk mitigation
  const goals = [
    {
      patientId,
      goalType: 'duration',
      targetValue: '900', // 15 minutes - clinical standard
      currentValue: '0',
      unit: 'seconds',
      label: 'Daily mobility target to prevent deconditioning',
      subtitle: 'Provider-recommended exercise duration',
      period: 'daily',
      isActive: true,
      providerId: 1 // Heidi Kissane
    },
    {
      patientId,
      goalType: 'power',
      targetValue: '25', // 25W - realistic clinical target (20-30W range)
      currentValue: '0',
      unit: 'watts',
      label: 'Power output goal for cardiovascular health', 
      subtitle: 'Target resistance for optimal recovery',
      period: 'session',
      isActive: true,
      providerId: 1
    },
    {
      patientId,
      goalType: 'sessions',
      targetValue: '2', // 2 sessions per day
      currentValue: '0',
      unit: 'sessions',
      label: 'Exercise frequency to maintain circulation and prevent VTE',
      subtitle: 'Daily session count for best outcomes',
      period: 'daily',
      isActive: true,
      providerId: 1
    }
  ];
  
  for (const goal of goals) {
    await storage.createGoal(goal);
  }
}

// Generate realistic session notes
function getRandomSessionNote(day: number, sessionNum: number, progressFactor: number): string {
  const earlyNotes = [
    "Patient tolerated exercise well, minimal fatigue",
    "Good compliance, some shortness of breath",
    "Steady pace maintained throughout session",
    "Patient reports feeling stronger today"
  ];
  
  const midNotes = [
    "Excellent progress, increased resistance well-tolerated",
    "Patient motivated and engaged throughout session",
    "Good endurance, able to maintain target heart rate",
    "Reports improved energy levels"
  ];
  
  const lateNotes = [
    "Outstanding session, patient exceeded targets",
    "Consistent performance, ready for discharge planning",
    "Strong cardiovascular response, excellent recovery",
    "Patient confident and enthusiastic about progress"
  ];
  
  if (progressFactor < 0.3) {
    return earlyNotes[Math.floor(Math.random() * earlyNotes.length)];
  } else if (progressFactor < 0.7) {
    return midNotes[Math.floor(Math.random() * midNotes.length)];
  } else {
    return lateNotes[Math.floor(Math.random() * lateNotes.length)];
  }
}

  // Device Management Endpoints
  
