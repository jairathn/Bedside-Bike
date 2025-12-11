/**
 * Personalization API Routes
 *
 * Implements the API endpoints for all personalization features:
 * - Protocol matching and assignment
 * - Fatigue detection and real-time monitoring
 * - Progressive overload and setback recovery
 * - Medication safety and contraindications
 * - Mobility scoring with Barthel/FIM translations
 * - Cohort comparison and virtual competition
 * - Insurance authorization reports
 * - Bilateral force analysis (Tier 2)
 */

import type { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { storage } from '../storage';
import { db } from '../db';
import {
  personalizedProtocolMatcher,
  fatigueDetectionEngine,
  progressiveOverloadEngine,
  medicationSafetyEngine,
  mobilityScoringEngine,
  competitionEngine,
  insuranceReportEngine,
  bilateralForceEngine
} from './index';

// Rate limiters for personalization endpoints
const personalizationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req || !req.ip,
});

const reportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 reports per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req || !req.ip,
});

export function registerPersonalizationRoutes(app: Express): void {

  // ============================================
  // PERSONALIZED PROTOCOL MATCHING
  // ============================================

  /**
   * Find matching protocols for a patient
   * POST /api/patients/:patientId/protocol-match
   */
  app.post('/api/patients/:patientId/protocol-match', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      // Get patient profile to verify they exist
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Find matching protocols using the patient ID
      const matchingProtocols = await personalizedProtocolMatcher.findMatchingProtocols(patientId);

      res.json({
        patientId,
        matchingProtocols,
        recommendedProtocol: matchingProtocols[0] || null,
        totalMatches: matchingProtocols.length
      });
    } catch (error: any) {
      console.error('Protocol matching error:', error);
      res.status(500).json({ error: 'Failed to find matching protocols', details: error.message });
    }
  });

  /**
   * Auto-assign best protocol for patient
   * POST /api/patients/:patientId/protocol-auto-assign
   */
  app.post('/api/patients/:patientId/protocol-auto-assign', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { assignedBy } = req.body;

      if (!assignedBy) {
        return res.status(400).json({ error: 'assignedBy (provider ID) is required' });
      }

      const assignment = await personalizedProtocolMatcher.autoAssignBestProtocol(patientId, assignedBy);

      if (!assignment) {
        return res.status(404).json({
          error: 'No suitable protocol found',
          suggestion: 'Consider manual protocol assignment or review patient profile'
        });
      }

      res.json(assignment);
    } catch (error: any) {
      console.error('Auto-assign error:', error);
      res.status(500).json({ error: 'Failed to auto-assign protocol', details: error.message });
    }
  });

  /**
   * Get patient's personalization profile
   * GET /api/patients/:patientId/personalization-profile
   */
  app.get('/api/patients/:patientId/personalization-profile', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const profile = await personalizedProtocolMatcher.getPatientProfile(patientId);

      if (!profile) {
        return res.status(404).json({ error: 'Personalization profile not found' });
      }

      res.json(profile);
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get personalization profile', details: error.message });
    }
  });

  /**
   * Update patient's personalization profile
   * PATCH /api/patients/:patientId/personalization-profile
   */
  app.patch('/api/patients/:patientId/personalization-profile', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const updates = req.body;

      const profile = await personalizedProtocolMatcher.updatePatientProfile(patientId, updates);

      res.json(profile);
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update personalization profile', details: error.message });
    }
  });

  // ============================================
  // FATIGUE DETECTION
  // ============================================

  /**
   * Process real-time metrics for fatigue detection
   * POST /api/sessions/:sessionId/fatigue-check
   */
  app.post('/api/sessions/:sessionId/fatigue-check', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { power, cadence, heartRate, timestamp } = req.body;

      const fatigueResult = await fatigueDetectionEngine.processRealTimeMetric(
        sessionId,
        {
          power,
          cadence,
          heartRate,
          timestamp: timestamp ? new Date(timestamp) : new Date()
        }
      );

      res.json(fatigueResult);
    } catch (error: any) {
      console.error('Fatigue check error:', error);
      res.status(500).json({ error: 'Failed to process fatigue check', details: error.message });
    }
  });

  /**
   * Get fatigue history for a patient
   * GET /api/patients/:patientId/fatigue-history
   */
  app.get('/api/patients/:patientId/fatigue-history', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const days = parseInt(req.query.days as string) || 7;

      const history = await fatigueDetectionEngine.getFatigueHistory(patientId, days);

      res.json({
        patientId,
        days,
        events: history,
        totalEvents: history.length
      });
    } catch (error: any) {
      console.error('Fatigue history error:', error);
      res.status(500).json({ error: 'Failed to get fatigue history', details: error.message });
    }
  });

  // ============================================
  // PROGRESSIVE OVERLOAD
  // ============================================

  /**
   * Evaluate progression for a patient
   * GET /api/patients/:patientId/progression
   */
  app.get('/api/patients/:patientId/progression', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const progressionEval = await progressiveOverloadEngine.evaluateProgression(patientId);

      res.json(progressionEval);
    } catch (error: any) {
      console.error('Progression evaluation error:', error);
      res.status(500).json({ error: 'Failed to evaluate progression', details: error.message });
    }
  });

  /**
   * Apply progression (increase difficulty)
   * POST /api/patients/:patientId/progression/apply
   */
  app.post('/api/patients/:patientId/progression/apply', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { parameter, increment, approvedBy } = req.body;

      const result = await progressiveOverloadEngine.applyProgression(patientId, {
        parameter,
        increment,
        approvedBy
      });

      res.json(result);
    } catch (error: any) {
      console.error('Apply progression error:', error);
      res.status(500).json({ error: 'Failed to apply progression', details: error.message });
    }
  });

  /**
   * Check for setback conditions
   * GET /api/patients/:patientId/setback-check
   */
  app.get('/api/patients/:patientId/setback-check', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const setbackCheck = await progressiveOverloadEngine.checkForSetback(patientId);

      res.json(setbackCheck);
    } catch (error: any) {
      console.error('Setback check error:', error);
      res.status(500).json({ error: 'Failed to check for setback', details: error.message });
    }
  });

  /**
   * Initiate setback recovery protocol
   * POST /api/patients/:patientId/setback-recovery
   */
  app.post('/api/patients/:patientId/setback-recovery', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { setbackType, reason, approvedBy } = req.body;

      const recovery = await progressiveOverloadEngine.initiateSetbackRecovery(patientId, {
        type: setbackType,
        reason,
        approvedBy
      });

      res.json(recovery);
    } catch (error: any) {
      console.error('Setback recovery error:', error);
      res.status(500).json({ error: 'Failed to initiate setback recovery', details: error.message });
    }
  });

  /**
   * Get performance prediction
   * GET /api/patients/:patientId/performance-prediction
   */
  app.get('/api/patients/:patientId/performance-prediction', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const daysAhead = parseInt(req.query.days as string) || 7;

      const prediction = await progressiveOverloadEngine.generatePerformancePrediction(patientId, daysAhead);

      res.json(prediction);
    } catch (error: any) {
      console.error('Performance prediction error:', error);
      res.status(500).json({ error: 'Failed to generate performance prediction', details: error.message });
    }
  });

  // ============================================
  // MEDICATION SAFETY
  // ============================================

  /**
   * Analyze patient medications for exercise interactions
   * POST /api/patients/:patientId/medication-analysis
   */
  app.post('/api/patients/:patientId/medication-analysis', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { medications } = req.body;

      if (!medications || !Array.isArray(medications)) {
        return res.status(400).json({ error: 'medications array is required' });
      }

      const analysis = await medicationSafetyEngine.analyzePatientMedications(patientId, medications);

      res.json(analysis);
    } catch (error: any) {
      console.error('Medication analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze medications', details: error.message });
    }
  });

  /**
   * Verify contraindications before exercise
   * POST /api/patients/:patientId/contraindication-check
   */
  app.post('/api/patients/:patientId/contraindication-check', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { conditions, medications, vitalSigns } = req.body;

      const verification = await medicationSafetyEngine.verifyContraindications(patientId, {
        conditions: conditions || [],
        medications: medications || [],
        vitalSigns
      });

      res.json(verification);
    } catch (error: any) {
      console.error('Contraindication check error:', error);
      res.status(500).json({ error: 'Failed to verify contraindications', details: error.message });
    }
  });

  /**
   * Override a contraindication with clinical justification
   * POST /api/patients/:patientId/contraindication-override
   */
  app.post('/api/patients/:patientId/contraindication-override', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { contraindicationId, overrideReason, overriddenBy, expiresAt } = req.body;

      if (!contraindicationId || !overrideReason || !overriddenBy) {
        return res.status(400).json({
          error: 'contraindicationId, overrideReason, and overriddenBy are required'
        });
      }

      const override = await medicationSafetyEngine.overrideContraindication(patientId, {
        contraindicationId,
        reason: overrideReason,
        overriddenBy,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      res.json(override);
    } catch (error: any) {
      console.error('Contraindication override error:', error);
      res.status(500).json({ error: 'Failed to override contraindication', details: error.message });
    }
  });

  // ============================================
  // MOBILITY SCORING
  // ============================================

  /**
   * Calculate comprehensive mobility score
   * GET /api/patients/:patientId/mobility-score
   */
  app.get('/api/patients/:patientId/mobility-score', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const mobilityScore = await mobilityScoringEngine.calculateMobilityScore(patientId);

      res.json(mobilityScore);
    } catch (error: any) {
      console.error('Mobility score error:', error);
      res.status(500).json({ error: 'Failed to calculate mobility score', details: error.message });
    }
  });

  /**
   * Get Barthel Index translation
   * GET /api/patients/:patientId/barthel-index
   */
  app.get('/api/patients/:patientId/barthel-index', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const barthelScore = await mobilityScoringEngine.calculateBarthelIndex(patientId);

      res.json(barthelScore);
    } catch (error: any) {
      console.error('Barthel Index error:', error);
      res.status(500).json({ error: 'Failed to calculate Barthel Index', details: error.message });
    }
  });

  /**
   * Get FIM translation
   * GET /api/patients/:patientId/fim-score
   */
  app.get('/api/patients/:patientId/fim-score', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const fimScore = await mobilityScoringEngine.calculateFIM(patientId);

      res.json(fimScore);
    } catch (error: any) {
      console.error('FIM score error:', error);
      res.status(500).json({ error: 'Failed to calculate FIM score', details: error.message });
    }
  });

  /**
   * Get hospital mobility score
   * GET /api/patients/:patientId/hospital-mobility-score
   */
  app.get('/api/patients/:patientId/hospital-mobility-score', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const hospitalScore = await mobilityScoringEngine.calculateHospitalMobilityScore(patientId);

      res.json(hospitalScore);
    } catch (error: any) {
      console.error('Hospital mobility score error:', error);
      res.status(500).json({ error: 'Failed to calculate hospital mobility score', details: error.message });
    }
  });

  /**
   * Get mobility score history
   * GET /api/patients/:patientId/mobility-history
   */
  app.get('/api/patients/:patientId/mobility-history', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const days = parseInt(req.query.days as string) || 30;

      const history = await mobilityScoringEngine.getMobilityHistory(patientId, days);

      res.json({
        patientId,
        days,
        scores: history
      });
    } catch (error: any) {
      console.error('Mobility history error:', error);
      res.status(500).json({ error: 'Failed to get mobility history', details: error.message });
    }
  });

  // ============================================
  // COHORT COMPARISON & VIRTUAL COMPETITION
  // ============================================

  /**
   * Generate cohort comparison for patient
   * GET /api/patients/:patientId/cohort-comparison
   */
  app.get('/api/patients/:patientId/cohort-comparison', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const comparison = await competitionEngine.generateCohortComparison(patientId);

      res.json(comparison);
    } catch (error: any) {
      console.error('Cohort comparison error:', error);
      res.status(500).json({ error: 'Failed to generate cohort comparison', details: error.message });
    }
  });

  /**
   * Get available competitions
   * GET /api/competitions
   */
  app.get('/api/competitions', async (req: Request, res: Response) => {
    try {
      const competitionType = req.query.type as string;
      const status = req.query.status as string || 'active';

      const competitions = await competitionEngine.getAvailableCompetitions({
        type: competitionType,
        status
      });

      res.json(competitions);
    } catch (error: any) {
      console.error('Get competitions error:', error);
      res.status(500).json({ error: 'Failed to get competitions', details: error.message });
    }
  });

  /**
   * Create a new competition
   * POST /api/competitions
   */
  app.post('/api/competitions', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const { name, type, startDate, endDate, targetMetric, rules, createdBy } = req.body;

      if (!name || !type || !startDate || !endDate || !createdBy) {
        return res.status(400).json({
          error: 'name, type, startDate, endDate, and createdBy are required'
        });
      }

      const competition = await competitionEngine.createCompetition({
        name,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        targetMetric,
        rules,
        createdBy
      });

      res.json(competition);
    } catch (error: any) {
      console.error('Create competition error:', error);
      res.status(500).json({ error: 'Failed to create competition', details: error.message });
    }
  });

  /**
   * Join a competition
   * POST /api/competitions/:competitionId/join
   */
  app.post('/api/competitions/:competitionId/join', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const competitionId = parseInt(req.params.competitionId);
      const { patientId } = req.body;

      if (!patientId) {
        return res.status(400).json({ error: 'patientId is required' });
      }

      const participant = await competitionEngine.joinCompetition(competitionId, patientId);

      res.json(participant);
    } catch (error: any) {
      console.error('Join competition error:', error);
      res.status(500).json({ error: 'Failed to join competition', details: error.message });
    }
  });

  /**
   * Get competition leaderboard
   * GET /api/competitions/:competitionId/leaderboard
   */
  app.get('/api/competitions/:competitionId/leaderboard', async (req: Request, res: Response) => {
    try {
      const competitionId = parseInt(req.params.competitionId);
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await competitionEngine.getLeaderboard(competitionId, limit);

      res.json(leaderboard);
    } catch (error: any) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({ error: 'Failed to get leaderboard', details: error.message });
    }
  });

  /**
   * Update competition scores (called after session completion)
   * POST /api/competitions/:competitionId/update-scores
   */
  app.post('/api/competitions/:competitionId/update-scores', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const competitionId = parseInt(req.params.competitionId);

      await competitionEngine.updateCompetitionScores(competitionId);

      res.json({ success: true, message: 'Scores updated successfully' });
    } catch (error: any) {
      console.error('Update scores error:', error);
      res.status(500).json({ error: 'Failed to update scores', details: error.message });
    }
  });

  /**
   * Get patient's competition participation
   * GET /api/patients/:patientId/competitions
   */
  app.get('/api/patients/:patientId/competitions', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const participations = await competitionEngine.getPatientCompetitions(patientId);

      res.json(participations);
    } catch (error: any) {
      console.error('Get patient competitions error:', error);
      res.status(500).json({ error: 'Failed to get patient competitions', details: error.message });
    }
  });

  // ============================================
  // INSURANCE AUTHORIZATION REPORTS
  // ============================================

  /**
   * Generate insurance authorization report
   * POST /api/patients/:patientId/insurance-report
   */
  app.post('/api/patients/:patientId/insurance-report', reportLimiter, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { reportType, insuranceType, generatedBy } = req.body;

      if (!reportType || !generatedBy) {
        return res.status(400).json({ error: 'reportType and generatedBy are required' });
      }

      const report = await insuranceReportEngine.generateReport(patientId, {
        reportType,
        insuranceType,
        generatedBy
      });

      res.json(report);
    } catch (error: any) {
      console.error('Insurance report error:', error);
      res.status(500).json({ error: 'Failed to generate insurance report', details: error.message });
    }
  });

  /**
   * Generate PDF version of insurance report
   * GET /api/patients/:patientId/insurance-report/:reportId/pdf
   */
  app.get('/api/patients/:patientId/insurance-report/:reportId/pdf', async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.reportId);

      const pdfBuffer = await insuranceReportEngine.generatePDF(reportId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="insurance-report-${reportId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Insurance PDF error:', error);
      res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
  });

  /**
   * Get patient's insurance reports
   * GET /api/patients/:patientId/insurance-reports
   */
  app.get('/api/patients/:patientId/insurance-reports', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const reports = await insuranceReportEngine.getPatientReports(patientId);

      res.json(reports);
    } catch (error: any) {
      console.error('Get insurance reports error:', error);
      res.status(500).json({ error: 'Failed to get insurance reports', details: error.message });
    }
  });

  /**
   * Approve/sign insurance report
   * POST /api/insurance-reports/:reportId/approve
   */
  app.post('/api/insurance-reports/:reportId/approve', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const { approvedBy, signature } = req.body;

      if (!approvedBy) {
        return res.status(400).json({ error: 'approvedBy (provider ID) is required' });
      }

      const report = await insuranceReportEngine.approveReport(reportId, approvedBy, signature);

      res.json(report);
    } catch (error: any) {
      console.error('Approve report error:', error);
      res.status(500).json({ error: 'Failed to approve report', details: error.message });
    }
  });

  // ============================================
  // BILATERAL FORCE ANALYSIS (Tier 2)
  // ============================================

  /**
   * Process bilateral force data from sensors
   * POST /api/sessions/:sessionId/bilateral-force
   */
  app.post('/api/sessions/:sessionId/bilateral-force', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { leftForce, rightForce, timestamp, sensorData } = req.body;

      const analysis = await bilateralForceEngine.processBilateralData(sessionId, {
        leftForce,
        rightForce,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        sensorData
      });

      res.json(analysis);
    } catch (error: any) {
      console.error('Bilateral force error:', error);
      res.status(500).json({ error: 'Failed to process bilateral force data', details: error.message });
    }
  });

  /**
   * Get bilateral balancing feedback
   * GET /api/patients/:patientId/bilateral-feedback
   */
  app.get('/api/patients/:patientId/bilateral-feedback', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const feedback = await bilateralForceEngine.generateBalancingFeedback(patientId);

      res.json(feedback);
    } catch (error: any) {
      console.error('Bilateral feedback error:', error);
      res.status(500).json({ error: 'Failed to generate bilateral feedback', details: error.message });
    }
  });

  /**
   * Check for neurological events (asymmetry detection)
   * GET /api/patients/:patientId/neurological-check
   */
  app.get('/api/patients/:patientId/neurological-check', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      const check = await bilateralForceEngine.checkForNeurologicalEvent(patientId);

      res.json(check);
    } catch (error: any) {
      console.error('Neurological check error:', error);
      res.status(500).json({ error: 'Failed to check neurological status', details: error.message });
    }
  });

  /**
   * Initialize stroke rehab protocol
   * POST /api/patients/:patientId/stroke-protocol
   */
  app.post('/api/patients/:patientId/stroke-protocol', personalizationLimiter, async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { affectedSide, strokeType, initiatedBy } = req.body;

      if (!affectedSide || !initiatedBy) {
        return res.status(400).json({ error: 'affectedSide and initiatedBy are required' });
      }

      const protocol = await bilateralForceEngine.initializeStrokeProtocol(patientId, {
        affectedSide,
        strokeType,
        initiatedBy
      });

      res.json(protocol);
    } catch (error: any) {
      console.error('Stroke protocol error:', error);
      res.status(500).json({ error: 'Failed to initialize stroke protocol', details: error.message });
    }
  });

  /**
   * Generate 3D force vectors for visualization
   * GET /api/sessions/:sessionId/force-vectors
   */
  app.get('/api/sessions/:sessionId/force-vectors', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.sessionId);

      const vectors = await bilateralForceEngine.generate3DForceVectors(sessionId);

      res.json(vectors);
    } catch (error: any) {
      console.error('Force vectors error:', error);
      res.status(500).json({ error: 'Failed to generate force vectors', details: error.message });
    }
  });

  /**
   * Generate butterfly plot data
   * GET /api/sessions/:sessionId/butterfly-plot
   */
  app.get('/api/sessions/:sessionId/butterfly-plot', async (req: Request, res: Response) => {
    try {
      const sessionId = parseInt(req.params.sessionId);

      const plot = await bilateralForceEngine.generateButterflyPlot(sessionId);

      res.json(plot);
    } catch (error: any) {
      console.error('Butterfly plot error:', error);
      res.status(500).json({ error: 'Failed to generate butterfly plot', details: error.message });
    }
  });

  // ============================================
  // FALL RISK PREDICTION
  // ============================================

  /**
   * Get fall risk prediction
   * GET /api/patients/:patientId/fall-risk
   */
  app.get('/api/patients/:patientId/fall-risk', async (req: Request, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId);

      // Use mobility scoring engine for fall risk assessment
      const mobilityScore = await mobilityScoringEngine.calculateMobilityScore(patientId);

      // Calculate fall risk based on mobility score and other factors
      const fallRisk = {
        patientId,
        riskLevel: mobilityScore.overallScore < 40 ? 'high' :
                   mobilityScore.overallScore < 60 ? 'moderate' : 'low',
        riskScore: Math.max(0, 100 - mobilityScore.overallScore),
        factors: mobilityScore.componentScores,
        recommendation: mobilityScore.overallScore < 40 ?
          'Close supervision required during all mobility activities' :
          mobilityScore.overallScore < 60 ?
          'Standby assistance recommended' :
          'Continue current mobility program',
        assessedAt: new Date().toISOString()
      };

      res.json(fallRisk);
    } catch (error: any) {
      console.error('Fall risk error:', error);
      res.status(500).json({ error: 'Failed to assess fall risk', details: error.message });
    }
  });

  console.log('✓ Personalization routes registered');
}
