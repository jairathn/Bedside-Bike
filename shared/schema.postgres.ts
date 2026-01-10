import { sql } from 'drizzle-orm';
import {
  integer,
  text,
  real,
  boolean,
  timestamp,
  pgTable,
  serial,
  varchar,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// PostgreSQL version of the schema for Supabase persistent storage

// Session storage table for authentication
export const sessions = pgTable("sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

// Users table - supports both patients and providers
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  userType: varchar("user_type", { length: 20 }).notNull(), // 'patient' or 'provider'
  dateOfBirth: varchar("date_of_birth", { length: 10 }), // ISO date string
  admissionDate: varchar("admission_date", { length: 10 }), // ISO date string
  // Provider specific fields
  providerRole: varchar("provider_role", { length: 50 }),
  credentials: varchar("credentials", { length: 50 }),
  specialty: varchar("specialty", { length: 100 }),
  licenseNumber: varchar("license_number", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// Patient profiles for risk assessment data
export const patientProfiles = pgTable("patient_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  age: integer("age").notNull(),
  sex: varchar("sex", { length: 10 }),
  weightKg: doublePrecision("weight_kg"),
  heightCm: doublePrecision("height_cm"),
  levelOfCare: varchar("level_of_care", { length: 20 }).notNull(),
  mobilityStatus: varchar("mobility_status", { length: 30 }).notNull(),
  cognitiveStatus: varchar("cognitive_status", { length: 30 }).notNull(),
  daysImmobile: integer("days_immobile").default(0),
  admissionDiagnosis: text("admission_diagnosis"),
  comorbidities: jsonb("comorbidities").default([]),
  medications: jsonb("medications").default([]),
  devices: jsonb("devices").default([]),
  incontinent: boolean("incontinent").default(false),
  albuminLow: boolean("albumin_low").default(false),
  baselineFunction: varchar("baseline_function", { length: 20 }),
  onVteProphylaxis: boolean("on_vte_prophylaxis").default(true),
  losExpectedDays: integer("los_expected_days"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// Provider-Patient relationships
export const providerPatients = pgTable("provider_patients", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  permissionGranted: boolean("permission_granted").default(false),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Risk assessments
export const riskAssessments = pgTable("risk_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  deconditioning: jsonb("deconditioning").notNull(),
  vte: jsonb("vte").notNull(),
  falls: jsonb("falls").notNull(),
  pressure: jsonb("pressure").notNull(),
  mobilityRecommendation: text("mobility_recommendation").notNull(),
  losData: jsonb("los_data"),
  dischargeData: jsonb("discharge_data"),
  readmissionData: jsonb("readmission_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Patient goals
export const patientGoals = pgTable("patient_goals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  providerId: integer("provider_id").references(() => users.id),
  goalType: varchar("goal_type", { length: 50 }).notNull(),
  targetValue: doublePrecision("target_value").notNull(),
  currentValue: doublePrecision("current_value").default(0),
  unit: varchar("unit", { length: 20 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  subtitle: varchar("subtitle", { length: 200 }),
  period: varchar("period", { length: 20 }).notNull(),
  aiRecommended: boolean("ai_recommended").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// Devices
export const devices = pgTable("devices", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  location: varchar("location", { length: 100 }),
  status: varchar("status", { length: 20 }).default('available'),
  currentPatientId: integer("current_patient_id").references(() => users.id),
  lastUsed: timestamp("last_used", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// Exercise sessions
export const exerciseSessions = pgTable("exercise_sessions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  deviceId: varchar("device_id", { length: 50 }).references(() => devices.id),
  duration: integer("duration").notNull(),
  avgPower: doublePrecision("avg_power"),
  maxPower: doublePrecision("max_power"),
  avgRpm: doublePrecision("avg_rpm"),
  resistance: doublePrecision("resistance"),
  sessionDate: varchar("session_date", { length: 10 }).notNull(), // ISO date string
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  stopsAndStarts: integer("stops_and_starts").default(0),
  isCompleted: boolean("is_completed").default(false),
  isManual: boolean("is_manual").default(false), // true = manually recorded, false = auto-generated/device
  // Real-time tracking fields
  currentRpm: doublePrecision("current_rpm"),
  currentPower: doublePrecision("current_power"),
  distanceMeters: doublePrecision("distance_meters"),
  durationSeconds: integer("duration_seconds"),
  currentStatus: varchar("current_status", { length: 20 }),
  targetDuration: integer("target_duration"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// Device sessions
export const deviceSessions = pgTable("device_sessions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  deviceId: varchar("device_id", { length: 50 }).notNull().references(() => devices.id),
  sessionId: integer("session_id").notNull().references(() => exerciseSessions.id),
  startedAt: timestamp("started_at", { withTimezone: true }).default(sql`NOW()`),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

// Achievements
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").default(0),
  isUnlocked: boolean("is_unlocked").default(false),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Patient stats
export const patientStats = pgTable("patient_stats", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  level: integer("level").default(1),
  xp: integer("xp").default(0),
  totalSessions: integer("total_sessions").default(0),
  totalDuration: integer("total_duration").default(0),
  avgDailyDuration: doublePrecision("avg_daily_duration").default(0),
  consistencyStreak: integer("consistency_streak").default(0),
  lastSessionDate: timestamp("last_session_date", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// Feed items
export const feedItems = pgTable("feed_items", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarEmoji: varchar("avatar_emoji", { length: 10 }).default('👤'),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  templateId: varchar("template_id", { length: 50 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").default({}),
  unit: varchar("unit", { length: 50 }).default('general'),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Nudge messages
export const nudgeMessages = pgTable("nudge_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  feedItemId: integer("feed_item_id").references(() => feedItems.id),
  templateId: varchar("template_id", { length: 50 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Kudos reactions
export const kudosReactions = pgTable("kudos_reactions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  feedItemId: integer("feed_item_id").notNull().references(() => feedItems.id),
  reactionType: varchar("reaction_type", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Patient preferences
export const patientPreferences = pgTable("patient_preferences", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarEmoji: varchar("avatar_emoji", { length: 10 }).default('👤'),
  optInKudos: boolean("opt_in_kudos").default(false),
  optInNudges: boolean("opt_in_nudges").default(false),
  unit: varchar("unit", { length: 50 }).default('general'),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// Alerts for smart monitoring system
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull(),
  message: text("message").notNull(),
  actionRequired: text("action_required").notNull(),
  metadata: jsonb("metadata"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Clinical protocols
export const clinicalProtocols = pgTable("clinical_protocols", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  indication: text("indication").notNull(),
  contraindications: jsonb("contraindications"),
  diagnosisCodes: jsonb("diagnosis_codes"),
  protocolData: jsonb("protocol_data").notNull(),
  evidenceCitation: text("evidence_citation"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// ============================================================================
// PERSONALIZED PROTOCOL MATCHING SYSTEM
// ============================================================================

// Patient personalization profiles
export const patientPersonalizationProfiles = pgTable("patient_personalization_profiles", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  personalityType: varchar("personality_type", { length: 30 }),
  personalityConfidence: doublePrecision("personality_confidence").default(0),
  bestPerformanceWindow: varchar("best_performance_window", { length: 20 }),
  avgMorningPower: doublePrecision("avg_morning_power"),
  avgAfternoonPower: doublePrecision("avg_afternoon_power"),
  avgEveningPower: doublePrecision("avg_evening_power"),
  respondsToCompetition: boolean("responds_to_competition").default(false),
  respondsToBadges: boolean("responds_to_badges").default(false),
  respondsToHealthMessages: boolean("responds_to_health_messages").default(false),
  respondsToCaregiverSharing: boolean("responds_to_caregiver_sharing").default(false),
  avgFatigueOnsetMinutes: doublePrecision("avg_fatigue_onset_minutes"),
  fatigueDecayRate: doublePrecision("fatigue_decay_rate"),
  optimalSessionDuration: doublePrecision("optimal_session_duration"),
  currentProgressionLevel: integer("current_progression_level").default(1),
  daysAtCurrentLevel: integer("days_at_current_level").default(0),
  lastProgressionDate: timestamp("last_progression_date", { withTimezone: true }),
  consecutiveSuccessfulSessions: integer("consecutive_successful_sessions").default(0),
  inSetbackRecovery: boolean("in_setback_recovery").default(false),
  setbackStartDate: timestamp("setback_start_date", { withTimezone: true }),
  preSetbackLevel: integer("pre_setback_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// Protocol matching criteria
export const protocolMatchingCriteria = pgTable("protocol_matching_criteria", {
  id: serial("id").primaryKey(),
  protocolId: integer("protocol_id").notNull().references(() => clinicalProtocols.id),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  requiredMobilityLevels: jsonb("required_mobility_levels"),
  excludedMobilityLevels: jsonb("excluded_mobility_levels"),
  requiredBaselineFunction: jsonb("required_baseline_function"),
  requiredComorbidities: jsonb("required_comorbidities"),
  excludedComorbidities: jsonb("excluded_comorbidities"),
  requiredProcedures: jsonb("required_procedures"),
  maxFallRisk: doublePrecision("max_fall_risk"),
  maxDeconditioningRisk: doublePrecision("max_deconditioning_risk"),
  requiresLowVteRisk: boolean("requires_low_vte_risk").default(false),
  matchWeight: doublePrecision("match_weight").default(1.0),
  matchPriority: integer("match_priority").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Session performance metrics
export const sessionPerformanceMetrics = pgTable("session_performance_metrics", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => exerciseSessions.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  powerTimeSeries: jsonb("power_time_series"),
  rpmTimeSeries: jsonb("rpm_time_series"),
  powerDecayRate: doublePrecision("power_decay_rate"),
  cadenceVariability: doublePrecision("cadence_variability"),
  peakPowerTime: integer("peak_power_time"),
  leftForceSeries: jsonb("left_force_series"),
  rightForceSeries: jsonb("right_force_series"),
  bilateralAsymmetry: doublePrecision("bilateral_asymmetry"),
  asymmetryTrend: varchar("asymmetry_trend", { length: 20 }),
  fatigueOnsetTime: integer("fatigue_onset_time"),
  fatigueMarkers: jsonb("fatigue_markers"),
  sessionQualityScore: doublePrecision("session_quality_score"),
  targetAchievement: doublePrecision("target_achievement"),
  interruptionCount: integer("interruption_count").default(0),
  timeOfDay: varchar("time_of_day", { length: 20 }),
  daysSinceAdmission: integer("days_since_admission"),
  hoursSinceLastSession: doublePrecision("hours_since_last_session"),
  hoursSinceLastMeal: doublePrecision("hours_since_last_meal"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Fatigue events
export const fatigueEvents = pgTable("fatigue_events", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => exerciseSessions.id),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
  fatigueType: varchar("fatigue_type", { length: 30 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  powerDeclinePercent: doublePrecision("power_decline_percent"),
  cadenceCoefficientVariation: doublePrecision("cadence_coefficient_variation"),
  bilateralAsymmetryChange: doublePrecision("bilateral_asymmetry_change"),
  actionTaken: varchar("action_taken", { length: 30 }),
  resistanceReduction: doublePrecision("resistance_reduction"),
  patientContinued: boolean("patient_continued"),
  sessionCompletedAfter: boolean("session_completed_after"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Medication interactions
export const medicationInteractions = pgTable("medication_interactions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  medicationName: varchar("medication_name", { length: 100 }).notNull(),
  medicationClass: varchar("medication_class", { length: 50 }).notNull(),
  administrationTime: timestamp("administration_time", { withTimezone: true }),
  sessionId: integer("session_id").references(() => exerciseSessions.id),
  hoursSinceMedication: doublePrecision("hours_since_medication"),
  powerChangePercent: doublePrecision("power_change_percent"),
  heartRateImpact: varchar("heart_rate_impact", { length: 20 }),
  coordinationImpact: varchar("coordination_impact", { length: 20 }),
  alertGenerated: boolean("alert_generated").default(false),
  alertMessage: text("alert_message"),
  providerNotified: boolean("provider_notified").default(false),
  goalAdjustmentApplied: boolean("goal_adjustment_applied").default(false),
  adjustmentDetails: jsonb("adjustment_details"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Contraindication verifications
export const contraindicationVerifications = pgTable("contraindication_verifications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  verificationType: varchar("verification_type", { length: 30 }).notNull(),
  contraindicationFound: boolean("contraindication_found").default(false),
  contraindicationType: varchar("contraindication_type", { length: 20 }),
  contraindicationReason: text("contraindication_reason"),
  actionTaken: varchar("action_taken", { length: 30 }),
  alertPriority: varchar("alert_priority", { length: 20 }),
  providerOverride: boolean("provider_override").default(false),
  overrideBy: integer("override_by").references(() => users.id),
  overrideReason: text("override_reason"),
  overrideAt: timestamp("override_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Multi-modal mobility scores
export const mobilityScores = pgTable("mobility_scores", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  scoredAt: timestamp("scored_at", { withTimezone: true }).notNull(),
  bikeScore: doublePrecision("bike_score"),
  ambulationScore: doublePrecision("ambulation_score"),
  ptScore: doublePrecision("pt_score"),
  nursingScore: doublePrecision("nursing_score"),
  adlScore: doublePrecision("adl_score"),
  componentWeights: jsonb("component_weights"),
  unifiedScore: doublePrecision("unified_score").notNull(),
  scoreConfidence: doublePrecision("score_confidence"),
  barthelIndex: integer("barthel_index"),
  functionalIndependenceMeasure: integer("functional_independence_measure"),
  scoreTrend: varchar("score_trend", { length: 20 }),
  trendMagnitude: doublePrecision("trend_magnitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Cohort comparisons
export const cohortComparisons = pgTable("cohort_comparisons", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  cohortId: varchar("cohort_id", { length: 100 }).notNull(),
  cohortCriteria: jsonb("cohort_criteria").notNull(),
  cohortSize: integer("cohort_size").notNull(),
  comparedAt: timestamp("compared_at", { withTimezone: true }).notNull(),
  durationPercentile: doublePrecision("duration_percentile"),
  powerPercentile: doublePrecision("power_percentile"),
  consistencyPercentile: doublePrecision("consistency_percentile"),
  improvementPercentile: doublePrecision("improvement_percentile"),
  overallPercentile: doublePrecision("overall_percentile").notNull(),
  comparisonMessage: text("comparison_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Virtual competitions
export const virtualCompetitions = pgTable("virtual_competitions", {
  id: serial("id").primaryKey(),
  competitionName: varchar("competition_name", { length: 200 }).notNull(),
  competitionType: varchar("competition_type", { length: 50 }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  matchingCriteria: jsonb("matching_criteria").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Competition participants
export const competitionParticipants = pgTable("competition_participants", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => virtualCompetitions.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  anonymousId: varchar("anonymous_id", { length: 50 }).notNull(),
  currentScore: doublePrecision("current_score").default(0),
  currentRank: integer("current_rank"),
  milestonesAchieved: jsonb("milestones_achieved"),
  sessionsContributed: integer("sessions_contributed").default(0),
  lastContribution: timestamp("last_contribution", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Insurance authorization reports
export const insuranceReports = pgTable("insurance_reports", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  reportType: varchar("report_type", { length: 50 }).notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  generatedBy: integer("generated_by").references(() => users.id),
  functionalCapacityData: jsonb("functional_capacity_data").notNull(),
  progressTrajectory: varchar("progress_trajectory", { length: 20 }).notNull(),
  comparisonToThresholds: jsonb("comparison_to_thresholds"),
  predictedTimeToIndependence: integer("predicted_time_to_independence"),
  predictedDischargeDisposition: varchar("predicted_discharge_disposition", { length: 50 }),
  predictionConfidence: doublePrecision("prediction_confidence"),
  reportContent: text("report_content").notNull(),
  reportPdf: text("report_pdf"),
  clinicianApproved: boolean("clinician_approved").default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  submittedToInsurance: boolean("submitted_to_insurance").default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  insuranceResponse: text("insurance_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Elderly Mobility Scale (EMS) / Discharge Readiness Assessments
export const emsAssessments = pgTable("ems_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  providerId: integer("provider_id").references(() => users.id),
  assessedAt: timestamp("assessed_at", { withTimezone: true }).notNull(),
  lyingToSitting: integer("lying_to_sitting").notNull(),
  sittingToLying: integer("sitting_to_lying").notNull(),
  sittingToStanding: integer("sitting_to_standing").notNull(),
  standing: integer("standing").notNull(),
  gait: integer("gait").notNull(),
  timedWalk: integer("timed_walk").notNull(),
  functionalReach: integer("functional_reach").notNull(),
  timedWalkSeconds: doublePrecision("timed_walk_seconds"),
  functionalReachCm: doublePrecision("functional_reach_cm"),
  totalScore: integer("total_score").notNull(),
  tier: varchar("tier", { length: 20 }).notNull(),
  notes: text("notes"),
  walkingAidUsed: varchar("walking_aid_used", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Fall risk predictions
export const fallRiskPredictions = pgTable("fall_risk_predictions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  predictedAt: timestamp("predicted_at", { withTimezone: true }).notNull(),
  overallFallRisk: doublePrecision("overall_fall_risk").notNull(),
  riskLevel: varchar("risk_level", { length: 20 }).notNull(),
  bilateralAsymmetryRisk: doublePrecision("bilateral_asymmetry_risk"),
  cadenceVariabilityRisk: doublePrecision("cadence_variability_risk"),
  powerDecayRisk: doublePrecision("power_decay_risk"),
  timeOfDayRisk: doublePrecision("time_of_day_risk"),
  medicationScheduleRisk: doublePrecision("medication_schedule_risk"),
  clinicalRiskFactors: jsonb("clinical_risk_factors"),
  alertGenerated: boolean("alert_generated").default(false),
  alertPriority: varchar("alert_priority", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
});

// Patient protocol assignments
export const patientProtocolAssignments = pgTable("patient_protocol_assignments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id),
  protocolId: integer("protocol_id").notNull().references(() => clinicalProtocols.id),
  assignedBy: integer("assigned_by").notNull().references(() => users.id),
  currentPhase: varchar("current_phase", { length: 50 }),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  progressionDate: timestamp("progression_date", { withTimezone: true }),
  completionDate: timestamp("completion_date", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`NOW()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`NOW()`),
});

// ============================================================================
// Validation schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  userType: z.enum(["patient", "provider"]),
});

export const patientRegistrationSchema = loginSchema.extend({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  userType: z.literal("patient"),
});

export const providerRegistrationSchema = loginSchema.extend({
  credentials: z.string().min(1, "Credentials are required (e.g., DPT, MD, RN)"),
  specialty: z.string().min(1, "Specialty is required"),
  licenseNumber: z.string().optional(),
  userType: z.literal("provider"),
});

export const riskAssessmentInputSchema = z.object({
  age: z.number().min(16).max(110),
  sex: z.enum(["male", "female", "other"]).optional(),
  weight_kg: z.number().positive().optional(),
  height_cm: z.number().positive().optional(),
  level_of_care: z.enum(['icu', 'step_down', 'stepdown', 'ward', 'rehab']),
  mobility_status: z.enum(['bedbound', 'chair_bound', 'standing_assist', 'walking_assist', 'independent']),
  cognitive_status: z.enum(['normal', 'mild_impairment', 'delirium_dementia']),
  days_immobile: z.number().min(0).default(0),
  admission_diagnosis: z.string().min(1, "Admission diagnosis is required"),
  comorbidities: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  devices: z.array(z.string()).default([]),
  incontinent: z.boolean().default(false),
  albumin_low: z.boolean().default(false),
  baseline_function: z.enum(["independent", "walker", "dependent"]).optional(),
  on_vte_prophylaxis: z.boolean().default(true),
  los_expected_days: z.number().min(1).max(365).optional(),
  on_sedating_medications: z.boolean().default(false),
  on_anticoagulants: z.boolean().default(false),
  on_steroids: z.boolean().default(false),
  has_diabetes: z.boolean().default(false),
  has_malnutrition: z.boolean().default(false),
  has_obesity: z.boolean().default(false),
  has_neuropathy: z.boolean().default(false),
  has_parkinson: z.boolean().default(false),
  has_stroke_history: z.boolean().default(false),
  has_active_cancer: z.boolean().default(false),
  has_vte_history: z.boolean().default(false),
  is_postoperative: z.boolean().default(false),
  is_trauma_admission: z.boolean().default(false),
  is_sepsis: z.boolean().default(false),
  is_cardiac_admission: z.boolean().default(false),
  is_neuro_admission: z.boolean().default(false),
  is_orthopedic: z.boolean().default(false),
  is_oncology: z.boolean().default(false),
  has_foley_catheter: z.boolean().default(false),
  has_central_line: z.boolean().default(false),
  has_feeding_tube: z.boolean().default(false),
  has_ventilator: z.boolean().default(false),
  additional_medications: z.string().optional(),
  additional_comorbidities: z.string().optional(),
  additional_medical_history: z.string().optional(),
});

// ============================================================================
// Insert schemas
// ============================================================================

export const insertUserSchema = createInsertSchema(users);
export const insertPatientProfileSchema = createInsertSchema(patientProfiles);
export const insertPatientGoalSchema = createInsertSchema(patientGoals);
export const insertDeviceSchema = createInsertSchema(devices);
export const insertDeviceSessionSchema = createInsertSchema(deviceSessions);
export const insertExerciseSessionSchema = createInsertSchema(exerciseSessions);
export const insertProviderPatientSchema = createInsertSchema(providerPatients);
export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments);
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertPatientStatsSchema = createInsertSchema(patientStats);
export const insertPatientPreferencesSchema = createInsertSchema(patientPreferences);
export const insertFeedItemSchema = createInsertSchema(feedItems);
export const insertNudgeMessageSchema = createInsertSchema(nudgeMessages);
export const insertKudosReactionSchema = createInsertSchema(kudosReactions);
export const insertPatientPersonalizationProfileSchema = createInsertSchema(patientPersonalizationProfiles);
export const insertProtocolMatchingCriteriaSchema = createInsertSchema(protocolMatchingCriteria);
export const insertSessionPerformanceMetricsSchema = createInsertSchema(sessionPerformanceMetrics);
export const insertFatigueEventSchema = createInsertSchema(fatigueEvents);
export const insertMedicationInteractionSchema = createInsertSchema(medicationInteractions);
export const insertContraindicationVerificationSchema = createInsertSchema(contraindicationVerifications);
export const insertMobilityScoreSchema = createInsertSchema(mobilityScores);
export const insertCohortComparisonSchema = createInsertSchema(cohortComparisons);
export const insertVirtualCompetitionSchema = createInsertSchema(virtualCompetitions);
export const insertCompetitionParticipantSchema = createInsertSchema(competitionParticipants);
export const insertInsuranceReportSchema = createInsertSchema(insuranceReports);
export const insertFallRiskPredictionSchema = createInsertSchema(fallRiskPredictions);
export const insertEmsAssessmentSchema = createInsertSchema(emsAssessments);

// ============================================================================
// Type exports
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UpsertUser = typeof users.$inferInsert;

export type PatientProfile = typeof patientProfiles.$inferSelect;
export type InsertPatientProfile = typeof patientProfiles.$inferInsert;

export type ProviderPatient = typeof providerPatients.$inferSelect;
export type InsertProviderPatient = typeof providerPatients.$inferInsert;

export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertRiskAssessment = typeof riskAssessments.$inferInsert;

export type PatientGoal = typeof patientGoals.$inferSelect;
export type InsertPatientGoal = typeof patientGoals.$inferInsert;

export type ExerciseSession = typeof exerciseSessions.$inferSelect;
export type InsertExerciseSession = typeof exerciseSessions.$inferInsert;

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

export type PatientStats = typeof patientStats.$inferSelect;
export type InsertPatientStats = typeof patientStats.$inferInsert;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

export type DeviceSession = typeof deviceSessions.$inferSelect;
export type InsertDeviceSession = typeof deviceSessions.$inferInsert;

export type PatientPreferences = typeof patientPreferences.$inferSelect;
export type InsertPatientPreferences = typeof patientPreferences.$inferInsert;

export type FeedItem = typeof feedItems.$inferSelect;
export type InsertFeedItem = typeof feedItems.$inferInsert;

export type NudgeMessage = typeof nudgeMessages.$inferSelect;
export type InsertNudgeMessage = typeof nudgeMessages.$inferInsert;

export type KudosReaction = typeof kudosReactions.$inferSelect;
export type InsertKudosReaction = typeof kudosReactions.$inferInsert;

export type LoginData = z.infer<typeof loginSchema>;
export type PatientRegistration = z.infer<typeof patientRegistrationSchema>;
export type ProviderRegistration = z.infer<typeof providerRegistrationSchema>;
export type RiskAssessmentInput = z.infer<typeof riskAssessmentInputSchema>;

export type InsertPatient = InsertUser & { userType: 'patient' };
export type InsertSession = InsertExerciseSession;
export type InsertGoal = InsertPatientGoal;

export const insertPatientSchema = patientRegistrationSchema;
export const insertSessionSchema = insertExerciseSessionSchema;
export const insertGoalSchema = insertPatientGoalSchema;

export type PatientPersonalizationProfile = typeof patientPersonalizationProfiles.$inferSelect;
export type InsertPatientPersonalizationProfile = typeof patientPersonalizationProfiles.$inferInsert;

export type ProtocolMatchingCriteria = typeof protocolMatchingCriteria.$inferSelect;
export type InsertProtocolMatchingCriteria = typeof protocolMatchingCriteria.$inferInsert;

export type SessionPerformanceMetrics = typeof sessionPerformanceMetrics.$inferSelect;
export type InsertSessionPerformanceMetrics = typeof sessionPerformanceMetrics.$inferInsert;

export type FatigueEvent = typeof fatigueEvents.$inferSelect;
export type InsertFatigueEvent = typeof fatigueEvents.$inferInsert;

export type MedicationInteraction = typeof medicationInteractions.$inferSelect;
export type InsertMedicationInteraction = typeof medicationInteractions.$inferInsert;

export type ContraindicationVerification = typeof contraindicationVerifications.$inferSelect;
export type InsertContraindicationVerification = typeof contraindicationVerifications.$inferInsert;

export type MobilityScore = typeof mobilityScores.$inferSelect;
export type InsertMobilityScore = typeof mobilityScores.$inferInsert;

export type CohortComparison = typeof cohortComparisons.$inferSelect;
export type InsertCohortComparison = typeof cohortComparisons.$inferInsert;

export type VirtualCompetition = typeof virtualCompetitions.$inferSelect;
export type InsertVirtualCompetition = typeof virtualCompetitions.$inferInsert;

export type CompetitionParticipant = typeof competitionParticipants.$inferSelect;
export type InsertCompetitionParticipant = typeof competitionParticipants.$inferInsert;

export type InsuranceReport = typeof insuranceReports.$inferSelect;
export type InsertInsuranceReport = typeof insuranceReports.$inferInsert;

export type FallRiskPrediction = typeof fallRiskPredictions.$inferSelect;
export type InsertFallRiskPrediction = typeof fallRiskPredictions.$inferInsert;

export type EmsAssessment = typeof emsAssessments.$inferSelect;
export type InsertEmsAssessment = typeof emsAssessments.$inferInsert;

export type ClinicalProtocol = typeof clinicalProtocols.$inferSelect;
export type InsertClinicalProtocol = typeof clinicalProtocols.$inferInsert;

export type PatientProtocolAssignment = typeof patientProtocolAssignments.$inferSelect;
export type InsertPatientProtocolAssignment = typeof patientProtocolAssignments.$inferInsert;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;
