import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Authentication will be handled by existing auth system
import { db } from "./db";
import { updateRollingDataWindow } from "./rolling-data";
import { patientStats, users, providerPatients, patientGoals, exerciseSessions, patientPreferences, feedItems, nudgeMessages, kudosReactions } from "@shared/schema";
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
import { 
  loginSchema,
  patientRegistrationSchema,
  providerRegistrationSchema,
  riskAssessmentInputSchema,
  insertExerciseSessionSchema,
  insertPatientGoalSchema,
  type LoginData,
  type PatientRegistration,
  type ProviderRegistration,
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

        // Create patient with ToS acceptance timestamp
        const { tosAccepted: _, ...patientDataWithoutTos } = patientData;
        const patient = await storage.createUser({
          ...patientDataWithoutTos,
          tosAcceptedAt: new Date(),
          tosVersion: tosVersion || '1.0.0',
        });
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
        res.json({ user: provider });

      } else {
        return res.status(400).json({ error: "Invalid user type" });
      }
    } catch (error) {
      console.error("Registration error:", error);
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

        console.log('=== SERVER LOGIN DEBUG ===');
        console.log('Received:', { firstName, lastName, dateOfBirth, deviceNumber });

        const patient = await storage.getPatientByName(firstName, lastName, dateOfBirth);
        console.log('Patient found:', patient ? `Yes (ID: ${patient.id}, DOB: ${patient.dateOfBirth})` : 'No');

        // If patient doesn't exist, return error - they need to register first
        if (!patient) {
          return res.status(401).json({
            error: "Account not found. Please register first using the Register tab."
          });
        }

        // Link patient to device if device number provided
        let deviceLinkResult = null;
        if (deviceNumber && patient) {
          try {
            deviceLinkResult = await storage.linkPatientToDevice(patient.id, deviceNumber);
          } catch (error) {
            console.warn('Failed to link patient to device:', error);
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
          return res.status(401).json({
            error: "Account not found. Please register first using the Register tab."
          });
        }

        // Link patient to device if device number provided
        const { deviceNumber } = req.body;
        let deviceLinkResult = null;
        if (deviceNumber && patient) {
          try {
            deviceLinkResult = await storage.linkPatientToDevice(patient.id, deviceNumber);
          } catch (error) {
            console.warn('Failed to link patient to device:', error);
          }
        }

        res.json({
          user: patient,
          patient,
          deviceNumber,
          deviceLinkResult // Include device switching info
        });
        
      } else if (loginData.userType === 'provider') {
        console.log(`DEBUG: Looking for provider with email: "${loginData.email}"`);
        const provider = await storage.getUserByEmail(loginData.email);
        console.log(`DEBUG: Provider found:`, provider ? `ID ${provider.id}` : 'NULL');
        
        if (!provider) {
          return res.status(401).json({ error: "Provider not found. Please register first." });
        }
        
        res.json({ user: provider });
        
      } else {
        return res.status(400).json({ error: "Invalid user type" });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ error: "Invalid login credentials" });
    }
  });

  // Provider Routes

  // Get all providers (for patient dropdown)
  app.get("/api/providers", async (req, res) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (error) {
      console.error("Providers fetch error:", error);
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
      console.error("Provider creation error:", error);
      res.status(500).json({ error: "Failed to create provider" });
    }
  });

  // Grant provider access to patient
  app.post("/api/patients/:patientId/grant-access/:providerId", async (req, res) => {
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
      console.error("Grant access error:", error);
      res.status(500).json({ error: "Failed to grant provider access" });
    }
  });

  // Get patients for a provider
  app.get("/api/providers/:providerId/patients", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const patients = await storage.getPatientsByProvider(providerId);
      res.json(patients);
    } catch (error) {
      console.error("Provider patients fetch error:", error);
      res.status(500).json({ error: "Failed to fetch provider patients" });
    }
  });

  // Patient Dashboard and Data Routes

  // Get patient dashboard data
  app.get("/api/patients/:id/dashboard", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);

      console.log('=== DASHBOARD REQUEST ===');
      console.log('Patient ID:', patientId);

      const [patient, goals, achievements, stats, sessions, adaptiveGoal] = await Promise.all([
        storage.getPatient(patientId),
        storage.getGoalsByPatient(patientId),
        storage.getAchievementsByPatient(patientId),
        storage.getPatientStats(patientId),
        storage.getSessionsByPatient(patientId),
        storage.calculateAdaptiveGoal(patientId)
      ]);

      console.log('Patient found:', patient ? `${patient.firstName} ${patient.lastName} (ID: ${patient.id})` : 'NO');
      console.log('Stats:', stats ? `Sessions: ${stats.totalSessions}, Duration: ${stats.totalDuration} min, Level: ${stats.level}` : 'NO STATS');
      console.log('Sessions count:', sessions ? sessions.length : 0);
      console.log('Goals count:', goals ? goals.length : 0);

      // Debug: Show session dates
      const sessionDates = sessions?.slice(0, 10).map(s => s.sessionDate) || [];
      console.log('📅 Recent session dates:', sessionDates.join(', '));
      const uniqueDates = [...new Set(sessionDates)].sort();
      console.log('📅 Unique dates in sessions:', uniqueDates.join(', '));

      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Calculate days since start for legacy compatibility
      const startDate = patient.admissionDate || patient.createdAt;
      const daysSinceStart = startDate ? Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Recalculate consistency streak based on current sessions
      const currentStreak = calculateCurrentStreak(sessions);
      const updatedStats = stats ? { ...stats, consistencyStreak: currentStreak } : null;

      console.log('Returning dashboard data:', {
        hasPatient: !!patient,
        goalsCount: goals?.length,
        hasStats: !!updatedStats,
        sessionsCount: sessions?.length
      });

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
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  // Get patient usage data for charts
  app.get("/api/patients/:id/usage-data", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const days = parseInt(req.query.days as string) || 7;
      
      const usageData = await storage.getDailyUsageData(patientId, days);
      res.json(usageData);
    } catch (error) {
      console.error("Usage data error:", error);
      res.status(500).json({ error: "Failed to load usage data" });
    }
  });

  // Push goals from risk assessment (Provider-only endpoint)
  app.post("/api/patients/:id/goals/from-assessment", createLimiter, async (req, res) => {
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
      console.error("Error pushing goals from assessment:", error);
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
      console.error("Leaderboard error:", error);
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  });

  // Session Routes

  // Create exercise session
  app.post("/api/sessions", createLimiter, async (req, res) => {
    try {
      console.log("Creating session with body:", JSON.stringify(req.body, null, 2));

      // Convert startTime string to Date object if needed
      const body = { ...req.body };
      if (typeof body.startTime === 'string') {
        body.startTime = new Date(body.startTime);
      }
      if (typeof body.endTime === 'string') {
        body.endTime = new Date(body.endTime);
      }

      console.log("Parsed body:", JSON.stringify({ ...body, startTime: body.startTime?.toISOString?.() }, null, 2));

      const sessionData = insertExerciseSessionSchema.parse(body) as InsertExerciseSession;
      console.log("Validated session data, creating...");

      const session = await storage.createSession(sessionData);
      console.log("Session created successfully:", session.id);
      res.json(session);
    } catch (error) {
      console.error("Session creation error:", error);
      // For Zod errors, get the detailed message
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as { issues: Array<{ path: string[]; message: string }> };
        const details = zodError.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        console.error("Zod validation errors:", details);
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
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Session update error:", error);
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
      console.error("Goal creation error:", error);
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
      console.error("Error fetching provider patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/:id/goals", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const goals = await storage.getPatientGoals(patientId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching patient goals:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  // Provider saves goals to patient profile
  app.post("/api/patients/:id/goals", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const { goals, providerId } = req.body;

      if (!goals || !Array.isArray(goals)) {
        return res.status(400).json({ error: "Goals array is required" });
      }

      console.log('Saving goals for patient:', patientId, 'Goals:', JSON.stringify(goals, null, 2));

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
      console.error("Error saving patient goals:", error);
      res.status(500).json({ error: "Failed to save goals" });
    }
  });

  app.get("/api/patients/:id/sessions", async (req, res) => {
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
      console.error("Error fetching patient sessions:", error);
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
        return res.status(404).json({ error: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Goal update error:", error);
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  // Get adaptive goal suggestion
  app.get("/api/patients/:id/adaptive-goal", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const adaptiveGoal = await storage.calculateAdaptiveGoal(patientId);
      res.json(adaptiveGoal);
    } catch (error) {
      console.error("Adaptive goal error:", error);
      res.status(500).json({ error: "Failed to calculate adaptive goal" });
    }
  });

  // Risk Assessment Routes

  // Process text input using AI
  app.post("/api/risk-assessment/process-text", riskAssessmentLimiter, async (req, res) => {
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
      console.error("Text processing error:", error);
      res.json({}); // Return empty object on error to not break the flow
    }
  });

  app.post("/api/risk-assessment", riskAssessmentLimiter, async (req, res) => {
    try {
      console.log("Risk assessment request body:", JSON.stringify(req.body, null, 2));
      const riskData = riskAssessmentInputSchema.parse(req.body) as RiskAssessmentInput;
      console.log("Parsed risk data for calculation:", {
        mobility_status: riskData.mobility_status,
        age: riskData.age,
        level_of_care: riskData.level_of_care,
        has_diabetes: riskData.has_diabetes,
        has_obesity: riskData.has_obesity,
        is_sepsis: riskData.is_sepsis,
        days_immobile: riskData.days_immobile
      });
      const patientId = parseInt(req.body.patientId) || 1; // Should come from authenticated session
      
      // Calculate risks using the risk calculator
      const riskResults = calculateRisks(riskData);
      
      // Extract robust stay predictions from the comprehensive risk calculator (no literature-based fallbacks)
      const stayPredictions = (riskResults as any).stay_predictions;
      const losData = stayPredictions?.length_of_stay;
      const dischargeData = stayPredictions?.discharge_disposition;
      const readmissionData = stayPredictions?.readmission_risk;
      // mobility_benefits is at the top level, not nested under stay_predictions
      const mobilityBenefits = (riskResults as any).mobility_benefits;

      console.log("Robust calculator predictions:", { losData, dischargeData, readmissionData, mobilityBenefits });
      
      // Store the assessment - serialize all JSON objects to text for database storage
      const assessment = await storage.createRiskAssessment({
        patientId,
        deconditioning: JSON.stringify(riskResults.deconditioning),
        vte: JSON.stringify(riskResults.vte),
        falls: JSON.stringify(riskResults.falls),
        pressure: JSON.stringify(riskResults.pressure),
        mobilityRecommendation: JSON.stringify(riskResults.mobility_recommendation),
        losData: losData ? JSON.stringify(losData) : null,
        dischargeData: dischargeData ? JSON.stringify(dischargeData) : null,
        readmissionData: readmissionData ? JSON.stringify(readmissionData) : null
      });
      
      res.json({
        ...riskResults,
        losData,
        dischargeData,
        readmissionData,
        mobility_benefits: mobilityBenefits, // Add mobility_benefits to API response
        assessmentId: assessment.id
      });
    } catch (error) {
      console.error("Risk assessment error:", error);
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
      console.log("Anonymous risk assessment request body:", JSON.stringify(req.body, null, 2));
      const riskData = riskAssessmentInputSchema.parse(req.body) as RiskAssessmentInput;
      console.log("Parsed anonymous risk data for calculation:", {
        mobility_status: riskData.mobility_status,
        age: riskData.age,
        level_of_care: riskData.level_of_care,
        has_diabetes: riskData.has_diabetes,
        has_obesity: riskData.has_obesity,
        is_sepsis: riskData.is_sepsis,
        days_immobile: riskData.days_immobile
      });
      
      // Calculate risks using the risk calculator (same calculation as authenticated users)
      const riskResults = calculateRisks(riskData);
      
      // Extract robust stay predictions from the comprehensive risk calculator
      const stayPredictions = (riskResults as any).stay_predictions;
      const losData = stayPredictions?.length_of_stay;
      const dischargeData = stayPredictions?.discharge_disposition;
      const readmissionData = stayPredictions?.readmission_risk;
      
      // mobility_benefits is at the top level, not nested under stay_predictions
      const mobilityBenefits = (riskResults as any).mobility_benefits;

      console.log("Anonymous calculator predictions:", { losData, dischargeData, readmissionData, mobilityBenefits });
      console.log("Full riskResults structure:", riskResults);
      
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
      console.error("Anonymous risk assessment error:", error);
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

  // Get patient's risk assessments
  app.get("/api/patients/:id/risk-assessments", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const assessments = await storage.getRiskAssessmentsByPatient(patientId);
      res.json(assessments);
    } catch (error) {
      console.error("Risk assessments fetch error:", error);
      res.status(500).json({ error: "Failed to fetch risk assessments" });
    }
  });

  // Get the latest risk assessment for a patient (for pre-filling provider forms)
  app.get("/api/patients/:id/risk-assessment", async (req, res) => {
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
      console.error("Latest risk assessment fetch error:", error);
      res.status(500).json({ error: "Failed to fetch latest risk assessment" });
    }
  });

  // Patient Profile Routes

  // Get patient profile
  app.get("/api/patients/:id/profile", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const profile = await storage.getPatientProfile(patientId);
      res.json(profile);
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient profile" });
    }
  });

  // Create/Update patient profile
  app.post("/api/patients/:id/profile", async (req, res) => {
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
      console.error("Profile save error:", error);
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
      console.error("Get preferences error:", error);
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
      console.error("Update preferences error:", error);
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
      console.error("Get feed error:", error);
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
      console.error("Add reaction error:", error);
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
      console.error("Send nudge error:", error);
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
      console.error("Get nudge targets error:", error);
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

        // Get daily goal (duration goal with period='daily')
        const [durationGoal] = await db
          .select({ targetValue: patientGoals.targetValue })
          .from(patientGoals)
          .where(
            and(
              eq(patientGoals.patientId, patient.id),
              eq(patientGoals.goalType, 'duration'),
              eq(patientGoals.period, 'daily'),
              eq(patientGoals.isActive, true)
            )
          );
        const dailyGoal = durationGoal?.targetValue || 15; // Default 15 min if no goal set
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
      console.error("Get leaderboard error:", error);
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
      console.error("Get received kudos error:", error);
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
      console.error("Get protocols error:", error);
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
        return res.status(404).json({ error: "Protocol not found" });
      }

      res.json(protocol);
    } catch (error) {
      console.error("Get protocol error:", error);
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
      console.error("Protocol matching error:", error);
      res.status(500).json({ error: "Failed to match protocol" });
    }
  });

  // Assign protocol to patient
  app.post("/api/patients/:patientId/protocol", createLimiter, async (req, res) => {
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
      console.error("Protocol assignment error:", error);
      res.status(500).json({ error: "Failed to assign protocol" });
    }
  });

  // Get patient's current protocol assignment
  app.get("/api/patients/:patientId/protocol", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine } = await import('./protocols/protocol-engine');
      const assignment = await protocolEngine.getPatientAssignment(patientId);

      if (!assignment) {
        return res.status(404).json({ error: "No active protocol for this patient" });
      }

      res.json(assignment);
    } catch (error) {
      console.error("Get patient protocol error:", error);
      res.status(500).json({ error: "Failed to get patient protocol" });
    }
  });

  // Get current exercise prescription for patient
  app.get("/api/patients/:patientId/prescription", async (req, res) => {
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
      console.error("Get prescription error:", error);
      res.status(500).json({ error: "Failed to get prescription" });
    }
  });

  // Get personalized prescription using patient goal calculator + diagnosis adjustments
  // This is the NEW approach that calculates baseline from risk calculator and adjusts for diagnosis
  app.get("/api/patients/:patientId/personalized-prescription", async (req, res) => {
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
      console.error("Personalized prescription error:", error);
      res.status(500).json({ error: "Failed to generate personalized prescription" });
    }
  });

  // Generate personalized prescription with diagnosis and medication overrides
  app.post("/api/patients/:patientId/personalized-prescription", createLimiter, async (req, res) => {
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
      console.error("Personalized prescription error:", error);
      res.status(500).json({ error: "Failed to generate personalized prescription" });
    }
  });

  // Check if patient should progress to next phase
  app.get("/api/patients/:patientId/protocol/progression", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine } = await import('./protocols/protocol-engine');
      const progressionCheck = await protocolEngine.checkProgressionCriteria(patientId);

      res.json(progressionCheck);
    } catch (error) {
      console.error("Progression check error:", error);
      res.status(500).json({ error: "Failed to check progression criteria" });
    }
  });

  // Advance patient to next protocol phase
  app.post("/api/patients/:patientId/protocol/progress", createLimiter, async (req, res) => {
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
      console.error("Protocol progression error:", error);
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
      console.error("Shift report generation error:", error);
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
      console.error("PT progress note generation error:", error);
      res.status(500).json({
        error: "Failed to generate PT progress note",
        details: error.message
      });
    }
  });

  // Get available reports for patient
  app.get("/api/patients/:patientId/reports", async (req, res) => {
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
      console.error("Get available reports error:", error);
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
      console.error("Get alerts error:", error);
      res.status(500).json({ error: "Failed to get alerts" });
    }
  });

  // Get alerts for specific patient
  app.get("/api/patients/:patientId/alerts", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const includeAcknowledged = req.query.includeAcknowledged === 'true';

      const { alertEngine } = await import('./alerts/alert-engine');
      const alerts = await alertEngine.getPatientAlerts(patientId, includeAcknowledged);

      res.json(alerts);
    } catch (error) {
      console.error("Get patient alerts error:", error);
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
      console.error("Get alert summary error:", error);
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
      console.error("Acknowledge alert error:", error);
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
      console.error("Check inactivity error:", error);
      res.status(500).json({ error: "Failed to check inactivity" });
    }
  });

  // Check protocol compliance for patient
  app.post("/api/patients/:patientId/alerts/check-compliance", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const { alertEngine } = await import('./alerts/alert-engine');
      const alert = await alertEngine.checkProtocolCompliance(patientId);

      res.json({
        alert: alert || null,
        complianceChecked: true
      });
    } catch (error) {
      console.error("Check compliance error:", error);
      res.status(500).json({ error: "Failed to check protocol compliance" });
    }
  });

  // Run all alert checks for a patient
  app.post("/api/patients/:patientId/alerts/check-all", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const { alertEngine } = await import('./alerts/alert-engine');
      const alerts = await alertEngine.runAllChecks(patientId);

      res.json({
        alertsGenerated: alerts.length,
        alerts
      });
    } catch (error) {
      console.error("Run all checks error:", error);
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
      console.error("Get providers error:", error);
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
      console.error("Get relationships error:", error);
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
      console.error("Get relationships error:", error);
      res.status(500).json({ error: "Failed to get provider relationships" });
    }
  });

  // Grant provider access
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

      // Check for existing relationship
      const existingRelationship = await db.select()
        .from(providerPatients)
        .where(
          and(
            eq(providerPatients.patientId, patientId),
            eq(providerPatients.providerId, providerId),
            eq(providerPatients.isActive, true)
          )
        )
        .limit(1);

      if (existingRelationship.length > 0) {
        return res.status(400).json({ error: "Provider already has access to this patient" });
      }

      const relationship = await storage.createProviderPatientRelationship({
        patientId,
        providerId
      });
      res.json(relationship);
    } catch (error) {
      console.error("Grant access error:", error);
      res.status(500).json({ error: "Failed to grant provider access" });
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
        return res.status(404).json({ error: "Provider relationship not found" });
      }

      await storage.deleteProviderPatientRelationship(relationshipId);
      res.json({ success: true });
    } catch (error) {
      console.error("Revoke access error:", error);
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
      console.error("Update goal error:", error);
      res.status(500).json({ error: "Failed to update goal" });
    }
  });

  // Recalculate goal progress from existing sessions
  app.post("/api/patients/:patientId/recalculate-goals", async (req, res) => {
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
      console.error("Error recalculating goal progress:", error);
      res.status(500).json({ error: "Failed to recalculate goal progress" });
    }
  });

  // Device Management Endpoints
  
  // Get all devices
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
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
      console.error("Error fetching last device:", error);
      res.json({ lastDevice: null }); // Return null on error to avoid breaking the form
    }
  });

  // Get patient profile for risk calculator auto-population
  app.get("/api/patients/:patientId/profile-for-calculator", async (req, res) => {
    try {
      const { patientId } = req.params;
      
      // Get patient basic info
      const patient = await storage.getPatient(parseInt(patientId));
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
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
        // Basic demographics
        age: age,
        sex: profile?.sex || null,
        weight_kg: profile?.weightKg ? parseFloat(profile.weightKg.toString()) : null,
        height_cm: profile?.heightCm ? parseFloat(profile.heightCm.toString()) : null,
        
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
      console.error("Error fetching patient profile for calculator:", error);
      res.status(500).json({ error: "Failed to fetch patient profile" });
    }
  });

  // Get device details
  app.get("/api/devices/:deviceId", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      console.error("Error fetching device:", error);
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
        return res.status(404).json({ error: "Device not found" });
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
      console.error("Error linking patient to device:", error);
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
        return res.status(404).json({ error: "Device not found" });
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
      console.error("Error resetting device:", error);
      res.status(500).json({ error: "Failed to reset device" });
    }
  });

  // Get patient's device usage history
  app.get("/api/patients/:patientId/devices", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      
      const deviceHistory = await storage.getPatientDeviceHistory(patientId);
      res.json(deviceHistory);
    } catch (error) {
      console.error("Error fetching patient device history:", error);
      res.status(500).json({ error: "Failed to fetch device history" });
    }
  });

  // Get all sessions across all devices for a patient (data portability)
  app.get("/api/patients/:patientId/sessions/portable", async (req, res) => {
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
      console.error("Error fetching portable session data:", error);
      res.status(500).json({ error: "Failed to fetch portable session data" });
    }
  });

  // ============================================================================
  // DISCHARGE READINESS SCORE (Elderly Mobility Scale) ROUTES
  // ============================================================================

  // Get all EMS assessments for a patient
  app.get("/api/patients/:patientId/ems-assessments", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { emsAssessments } = await import("@shared/schema");
      const assessments = await db.select()
        .from(emsAssessments)
        .where(eq(emsAssessments.patientId, patientId))
        .orderBy(emsAssessments.assessedAt);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching EMS assessments:", error);
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
        return res.status(404).json({ error: "EMS assessment not found" });
      }

      res.json(assessment);
    } catch (error) {
      console.error("Error fetching EMS assessment:", error);
      res.status(500).json({ error: "Failed to fetch EMS assessment" });
    }
  });

  // Create a new EMS assessment
  app.post("/api/patients/:patientId/ems-assessments", createLimiter, async (req, res) => {
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
      console.error("Error creating EMS assessment:", error);
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
          return res.status(404).json({ error: "EMS assessment not found" });
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
        return res.status(404).json({ error: "EMS assessment not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating EMS assessment:", error);
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
        return res.status(404).json({ error: "EMS assessment not found" });
      }

      res.json({ success: true, deleted });
    } catch (error) {
      console.error("Error deleting EMS assessment:", error);
      res.status(500).json({ error: "Failed to delete EMS assessment" });
    }
  });

  // Get latest EMS assessment for a patient
  app.get("/api/patients/:patientId/ems-assessment/latest", async (req, res) => {
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
      console.error("Error fetching latest EMS assessment:", error);
      res.status(500).json({ error: "Failed to fetch latest EMS assessment" });
    }
  });

  // Register Personalization Routes (Tier 1 & Tier 2 Patent Features)
  registerPersonalizationRoutes(app);

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
      
      console.log('✓ Seeded initial provider: Heidi Kissane, DPT');
    }
    
    // Create comprehensive patient data with realistic mock sessions
    await seedPatientWithMockData();
  } catch (error) {
    console.error('Failed to seed initial data:', error);
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
      
      console.log('✓ Created patient: Neil Jairath');
    } else {
      // Update existing patient's admission date to always be 4 days ago
      const updatedAdmissionDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (patient.admissionDate !== updatedAdmissionDate) {
        await storage.updateUser(patient.id, { admissionDate: updatedAdmissionDate });
        console.log(`✓ Updated Neil Jairath's admission date to: ${updatedAdmissionDate}`);
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

    // Delete ALL sessions outside the rolling window (both manual and auto-generated)
    if (sessionsOutsideWindow.length > 0) {
      for (const session of sessionsOutsideWindow) {
        await db.delete(exerciseSessions).where(eq(exerciseSessions.id, session.id));
      }
      console.log(`✓ Cleared ${sessionsOutsideWindow.length} sessions outside rolling window`);
    }

    // Delete auto-generated sessions within window (to regenerate fresh ones)
    // But KEEP manual sessions within window
    const autoSessionsWithinWindow = sessionsWithinWindow.filter(s => (s as any).isManual !== true);
    if (autoSessionsWithinWindow.length > 0) {
      for (const session of autoSessionsWithinWindow) {
        await db.delete(exerciseSessions).where(eq(exerciseSessions.id, session.id));
      }
      console.log(`✓ Cleared ${autoSessionsWithinWindow.length} auto-generated sessions to refresh`);
    }

    // Generate new auto sessions for days that don't have manual sessions
    // This ensures we always have fresh demo data while preserving user inputs
    await generateRecentSessionData(patient.id, 4, manualSessionDatesWithinWindow);
    console.log(`✓ Generated rolling window sessions (${fourDaysAgoStr} to ${todayStr}), preserved ${manualSessionDatesWithinWindow.size} manual session date(s)`)

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
      
      console.log('✓ Created patient stats with realistic totals');
    }

    // Create realistic goals based on patient progress
    await createProgressiveGoals(patient.id, stats);

    return patient;
  } catch (error) {
    console.error('Failed to seed patient with mock data:', error);
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
  const sessionDates = new Set(sessions.map(s => s.sessionDate));
  const sortedDates = Array.from(sessionDates).sort().reverse(); // Most recent first

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  let streak = 0;
  let expectedDate = new Date(today);

  for (const dateStr of sortedDates) {
    const sessionDate = new Date(dateStr);
    sessionDate.setHours(0, 0, 0, 0); // Normalize to start of day

    // Check if session date matches expected date
    if (sessionDate.getTime() === expectedDate.getTime()) {
      streak++;
      // Move expected date back one day
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (sessionDate.getTime() < expectedDate.getTime()) {
      // Gap in streak found
      break;
    }
    // If sessionDate > expectedDate, skip it (future date, shouldn't happen)
  }

  // If we didn't find any sessions today or yesterday, streak is 0
  // (streak must be current to count)
  if (streak > 0) {
    const mostRecentSession = new Date(sortedDates[0]);
    mostRecentSession.setHours(0, 0, 0, 0);
    const daysSinceLastSession = Math.floor((today.getTime() - mostRecentSession.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastSession > 1) {
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
  
