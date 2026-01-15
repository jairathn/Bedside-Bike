import { sql } from 'drizzle-orm';
import {
  integer,
  text,
  real,
  sqliteTable,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// SQLite version of the schema for local development
// Enums stored as TEXT with validation at the application layer

// Session storage table for authentication
export const sessions = sqliteTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(), // JSON stored as text
  expire: integer("expire", { mode: 'timestamp' }).notNull(),
});

// Users table - supports both patients and providers
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").unique().notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  userType: text("user_type").notNull(), // 'patient' or 'provider'
  dateOfBirth: text("date_of_birth"), // ISO date string
  admissionDate: text("admission_date"), // ISO date string
  // Provider specific fields
  providerRole: text("provider_role"), // 'physician', 'nurse', etc.
  credentials: text("credentials"),
  specialty: text("specialty"),
  licenseNumber: text("license_number"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Patient profiles for risk assessment data
export const patientProfiles = sqliteTable("patient_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  age: integer("age").notNull(),
  sex: text("sex"),
  weightKg: real("weight_kg"),
  heightCm: real("height_cm"),
  levelOfCare: text("level_of_care").notNull(),
  mobilityStatus: text("mobility_status").notNull(),
  cognitiveStatus: text("cognitive_status").notNull(),
  daysImmobile: integer("days_immobile").default(0),
  admissionDiagnosis: text("admission_diagnosis"),
  comorbidities: text("comorbidities").default('[]'), // JSON array as text
  medications: text("medications").default('[]'),
  devices: text("devices").default('[]'),
  incontinent: integer("incontinent", { mode: 'boolean' }).default(false),
  albuminLow: integer("albumin_low", { mode: 'boolean' }).default(false),
  baselineFunction: text("baseline_function"),
  onVteProphylaxis: integer("on_vte_prophylaxis", { mode: 'boolean' }).default(true),
  losExpectedDays: integer("los_expected_days"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Provider-Patient relationships
export const providerPatients = sqliteTable("provider_patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: integer("provider_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  permissionGranted: integer("permission_granted", { mode: 'boolean' }).default(false),
  grantedAt: integer("granted_at", { mode: 'timestamp' }),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Risk assessments
export const riskAssessments = sqliteTable("risk_assessments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  deconditioning: text("deconditioning").notNull(), // JSON as text
  vte: text("vte").notNull(),
  falls: text("falls").notNull(),
  pressure: text("pressure").notNull(),
  mobilityRecommendation: text("mobility_recommendation").notNull(),
  losData: text("los_data"),
  dischargeData: text("discharge_data"),
  readmissionData: text("readmission_data"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Patient goals
export const patientGoals = sqliteTable("patient_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  providerId: integer("provider_id").references(() => users.id),
  goalType: text("goal_type").notNull(),
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value").default(0),
  unit: text("unit").notNull(),
  label: text("label").notNull(),
  subtitle: text("subtitle"),
  period: text("period").notNull(),
  aiRecommended: integer("ai_recommended", { mode: 'boolean' }).default(false),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Goal history - tracks changes to goals over time for accurate historical reporting
export const goalHistory = sqliteTable("goal_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  goalType: text("goal_type").notNull(),
  targetValue: real("target_value").notNull(),
  unit: text("unit").notNull(),
  effectiveDate: text("effective_date").notNull(), // YYYY-MM-DD
  providerId: integer("provider_id").references(() => users.id),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Devices
export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  status: text("status").default('available'),
  currentPatientId: integer("current_patient_id").references(() => users.id),
  lastUsed: integer("last_used", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Device sessions
export const deviceSessions = sqliteTable("device_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  deviceId: text("device_id").notNull().references(() => devices.id),
  sessionId: integer("session_id").notNull().references(() => exerciseSessions.id),
  startedAt: integer("started_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  endedAt: integer("ended_at", { mode: 'timestamp' }),
});

// Exercise sessions
export const exerciseSessions = sqliteTable("exercise_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  deviceId: text("device_id").references(() => devices.id),
  duration: integer("duration").notNull(),
  avgPower: real("avg_power"),
  maxPower: real("max_power"),
  avgRpm: real("avg_rpm"),
  resistance: real("resistance"),
  sessionDate: text("session_date").notNull(), // ISO date string
  startTime: integer("start_time", { mode: 'timestamp' }).notNull(),
  endTime: integer("end_time", { mode: 'timestamp' }),
  stopsAndStarts: integer("stops_and_starts").default(0),
  isCompleted: integer("is_completed", { mode: 'boolean' }).default(false),
  // Real-time tracking fields (updated via WebSocket)
  currentRpm: real("current_rpm"),
  currentPower: real("current_power"),
  distanceMeters: real("distance_meters"),
  durationSeconds: integer("duration_seconds"),
  currentStatus: text("current_status"), // 'active' | 'paused' | 'completed'
  targetDuration: integer("target_duration"), // Target duration in seconds
  // Session logging attribution (caregiver feature)
  loggedById: integer("logged_by_id").references(() => users.id), // Who logged the session
  loggerType: text("logger_type"), // 'patient', 'caregiver', 'provider', 'device'
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Achievements
export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").default(0),
  isUnlocked: integer("is_unlocked", { mode: 'boolean' }).default(false),
  unlockedAt: integer("unlocked_at", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Patient stats
export const patientStats = sqliteTable("patient_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  level: integer("level").default(1),
  xp: integer("xp").default(0),
  totalSessions: integer("total_sessions").default(0),
  totalDuration: integer("total_duration").default(0),
  avgDailyDuration: real("avg_daily_duration").default(0),
  consistencyStreak: integer("consistency_streak").default(0),
  lastSessionDate: integer("last_session_date", { mode: 'timestamp' }),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Feed items
export const feedItems = sqliteTable("feed_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  displayName: text("display_name").notNull(),
  avatarEmoji: text("avatar_emoji").default('👤'),
  eventType: text("event_type").notNull(),
  templateId: text("template_id").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata").default('{}'),
  unit: text("unit").default('general'),
  isVisible: integer("is_visible", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Nudge messages
export const nudgeMessages = sqliteTable("nudge_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  recipientId: integer("recipient_id").notNull().references(() => users.id),
  feedItemId: integer("feed_item_id").references(() => feedItems.id),
  templateId: text("template_id").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Kudos reactions
export const kudosReactions = sqliteTable("kudos_reactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  feedItemId: integer("feed_item_id").notNull().references(() => feedItems.id),
  reactionType: text("reaction_type").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Patient preferences
export const patientPreferences = sqliteTable("patient_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  displayName: text("display_name").notNull(),
  avatarEmoji: text("avatar_emoji").default('👤'),
  optInKudos: integer("opt_in_kudos", { mode: 'boolean' }).default(false),
  optInNudges: integer("opt_in_nudges", { mode: 'boolean' }).default(false),
  unit: text("unit").default('general'),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Alerts for smart monitoring system
export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'session_incomplete', 'no_activity_24h', etc.
  priority: text("priority").notNull(), // 'low', 'medium', 'high', 'critical'
  message: text("message").notNull(),
  actionRequired: text("action_required").notNull(),
  metadata: text("metadata"), // JSON as text
  triggeredAt: integer("triggered_at", { mode: 'timestamp' }).notNull(),
  acknowledgedAt: integer("acknowledged_at", { mode: 'timestamp' }),
  acknowledgedBy: integer("acknowledged_by").references(() => users.id),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Clinical protocols - Evidence-based exercise prescriptions
export const clinicalProtocols = sqliteTable("clinical_protocols", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  indication: text("indication").notNull(), // Clinical indication (e.g., "Total Knee Replacement")
  contraindications: text("contraindications"), // JSON array of contraindications
  diagnosisCodes: text("diagnosis_codes"), // JSON array of ICD-10 codes
  protocolData: text("protocol_data").notNull(), // JSON object with phases
  evidenceCitation: text("evidence_citation"), // Research citation
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// ============================================================================
// PERSONALIZED PROTOCOL MATCHING SYSTEM - Patent Features
// ============================================================================

// Patient personalization profiles - stores learned preferences and patterns
export const patientPersonalizationProfiles = sqliteTable("patient_personalization_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),

  // Personality type for engagement (10.1 Adaptive Encouragement)
  personalityType: text("personality_type"), // 'competitive', 'achievement', 'health_focused', 'social'
  personalityConfidence: real("personality_confidence").default(0), // 0-1 confidence score

  // Circadian patterns (7.2 Context-Aware Recommendations)
  bestPerformanceWindow: text("best_performance_window"), // 'morning', 'afternoon', 'evening'
  avgMorningPower: real("avg_morning_power"),
  avgAfternoonPower: real("avg_afternoon_power"),
  avgEveningPower: real("avg_evening_power"),

  // Response patterns for interventions
  respondsToCompetition: integer("responds_to_competition", { mode: 'boolean' }).default(false),
  respondsToBadges: integer("responds_to_badges", { mode: 'boolean' }).default(false),
  respondsToHealthMessages: integer("responds_to_health_messages", { mode: 'boolean' }).default(false),
  respondsToCaregiverSharing: integer("responds_to_caregiver_sharing", { mode: 'boolean' }).default(false),

  // Fatigue patterns (4.1 Fatigue-Triggered Auto-Resistance)
  avgFatigueOnsetMinutes: real("avg_fatigue_onset_minutes"), // Typical time to fatigue
  fatigueDecayRate: real("fatigue_decay_rate"), // Power decay rate when fatigued
  optimalSessionDuration: real("optimal_session_duration"), // Learned optimal duration

  // Progressive overload tracking (4.2)
  currentProgressionLevel: integer("current_progression_level").default(1),
  daysAtCurrentLevel: integer("days_at_current_level").default(0),
  lastProgressionDate: integer("last_progression_date", { mode: 'timestamp' }),
  consecutiveSuccessfulSessions: integer("consecutive_successful_sessions").default(0),

  // Setback tracking (10.5)
  inSetbackRecovery: integer("in_setback_recovery", { mode: 'boolean' }).default(false),
  setbackStartDate: integer("setback_start_date", { mode: 'timestamp' }),
  preSetbackLevel: integer("pre_setback_level"),

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Protocol matching criteria - defines detailed matching rules for personalization
export const protocolMatchingCriteria = sqliteTable("protocol_matching_criteria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  protocolId: integer("protocol_id").notNull().references(() => clinicalProtocols.id),

  // Patient profile matching criteria
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  requiredMobilityLevels: text("required_mobility_levels"), // JSON array
  excludedMobilityLevels: text("excluded_mobility_levels"), // JSON array
  requiredBaselineFunction: text("required_baseline_function"), // JSON array

  // Clinical matching
  requiredComorbidities: text("required_comorbidities"), // JSON array - must have at least one
  excludedComorbidities: text("excluded_comorbidities"), // JSON array - cannot have any
  requiredProcedures: text("required_procedures"), // JSON array of CPT codes

  // Risk-based matching
  maxFallRisk: real("max_fall_risk"), // Protocol not suitable above this fall risk
  maxDeconditioningRisk: real("max_deconditioning_risk"),
  requiresLowVteRisk: integer("requires_low_vte_risk", { mode: 'boolean' }).default(false),

  // Matching weight and priority
  matchWeight: real("match_weight").default(1.0), // Weight for scoring
  matchPriority: integer("match_priority").default(0), // Higher = tried first

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Session performance metrics - ML-ready data for training predictive models
export const sessionPerformanceMetrics = sqliteTable("session_performance_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => exerciseSessions.id),
  patientId: integer("patient_id").notNull().references(() => users.id),

  // Time-series metrics (sampled every 10 seconds)
  powerTimeSeries: text("power_time_series"), // JSON array of power readings
  rpmTimeSeries: text("rpm_time_series"), // JSON array of RPM readings

  // Derived performance metrics
  powerDecayRate: real("power_decay_rate"), // Rate of power decline (fatigue indicator)
  cadenceVariability: real("cadence_variability"), // Coefficient of variation
  peakPowerTime: integer("peak_power_time"), // Seconds into session when peak occurred

  // Bilateral metrics (Tier 2 - prepared for sensor integration)
  leftForceSeries: text("left_force_series"), // JSON array
  rightForceSeries: text("right_force_series"), // JSON array
  bilateralAsymmetry: real("bilateral_asymmetry"), // Percentage asymmetry (>15% = concern)
  asymmetryTrend: text("asymmetry_trend"), // 'improving', 'stable', 'worsening'

  // Fatigue markers (1.1 Predictive Fall Risk)
  fatigueOnsetTime: integer("fatigue_onset_time"), // Seconds when fatigue detected
  fatigueMarkers: text("fatigue_markers"), // JSON: { powerDecline, cadenceIrregularity, forcePatternDegradation }

  // Session quality indicators
  sessionQualityScore: real("session_quality_score"), // 0-100 overall quality
  targetAchievement: real("target_achievement"), // % of target duration/power achieved
  interruptionCount: integer("interruption_count").default(0),

  // Contextual data for predictions
  timeOfDay: text("time_of_day"), // 'morning', 'afternoon', 'evening', 'night'
  daysSinceAdmission: integer("days_since_admission"),
  hoursSinceLastSession: real("hours_since_last_session"),
  hoursSinceLastMeal: real("hours_since_last_meal"),

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Fatigue events - tracks detected fatigue for pattern analysis
export const fatigueEvents = sqliteTable("fatigue_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => exerciseSessions.id),

  // Detection details
  detectedAt: integer("detected_at", { mode: 'timestamp' }).notNull(),
  fatigueType: text("fatigue_type").notNull(), // 'power_decline', 'cadence_irregular', 'force_degradation', 'bilateral_loss'
  severity: text("severity").notNull(), // 'mild', 'moderate', 'severe'

  // Trigger metrics
  powerDeclinePercent: real("power_decline_percent"),
  cadenceCoefficientVariation: real("cadence_coefficient_variation"),
  bilateralAsymmetryChange: real("bilateral_asymmetry_change"),

  // System response (4.1 Auto-Resistance Reduction)
  actionTaken: text("action_taken"), // 'resistance_reduced', 'session_ended', 'alert_sent', 'none'
  resistanceReduction: real("resistance_reduction"), // Amount reduced if applicable

  // Outcome tracking
  patientContinued: integer("patient_continued", { mode: 'boolean' }),
  sessionCompletedAfter: integer("session_completed_after", { mode: 'boolean' }),

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Medication interactions - tracks medication-exercise interactions (11.2)
export const medicationInteractions = sqliteTable("medication_interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),

  // Medication details
  medicationName: text("medication_name").notNull(),
  medicationClass: text("medication_class").notNull(), // 'beta_blocker', 'diuretic', 'sedative', etc.
  administrationTime: integer("administration_time", { mode: 'timestamp' }),

  // Exercise performance correlation
  sessionId: integer("session_id").references(() => exerciseSessions.id),
  hoursSinceMedication: real("hours_since_medication"),

  // Performance impact
  powerChangePercent: real("power_change_percent"), // Compared to baseline
  heartRateImpact: text("heart_rate_impact"), // 'suppressed', 'elevated', 'normal'
  coordinationImpact: text("coordination_impact"), // 'impaired', 'normal'

  // Alert generated
  alertGenerated: integer("alert_generated", { mode: 'boolean' }).default(false),
  alertMessage: text("alert_message"),
  providerNotified: integer("provider_notified", { mode: 'boolean' }).default(false),

  // Goal adjustment (11.2)
  goalAdjustmentApplied: integer("goal_adjustment_applied", { mode: 'boolean' }).default(false),
  adjustmentDetails: text("adjustment_details"), // JSON with adjustment specifics

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Contraindication verifications - tracks contraindication checks (11.3)
export const contraindicationVerifications = sqliteTable("contraindication_verifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),

  // Verification details
  verifiedAt: integer("verified_at", { mode: 'timestamp' }).notNull(),
  verificationType: text("verification_type").notNull(), // 'pre_session', 'periodic', 'order_change'

  // Contraindication found
  contraindicationFound: integer("contraindication_found", { mode: 'boolean' }).default(false),
  contraindicationType: text("contraindication_type"), // 'absolute', 'relative', 'temporal'
  contraindicationReason: text("contraindication_reason"),

  // Action taken
  actionTaken: text("action_taken"), // 'device_locked', 'parameters_modified', 'alert_sent', 'cleared'
  alertPriority: text("alert_priority"), // 'critical', 'warning', 'caution'

  // Override handling
  providerOverride: integer("provider_override", { mode: 'boolean' }).default(false),
  overrideBy: integer("override_by").references(() => users.id),
  overrideReason: text("override_reason"),
  overrideAt: integer("override_at", { mode: 'timestamp' }),

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Multi-modal mobility scores - unified mobility scoring (1.5)
export const mobilityScores = sqliteTable("mobility_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),

  // Score timestamp
  scoredAt: integer("scored_at", { mode: 'timestamp' }).notNull(),

  // Component scores (0-100 each)
  bikeScore: real("bike_score"), // From bedside bike metrics
  ambulationScore: real("ambulation_score"), // From hallway/room ambulation
  ptScore: real("pt_score"), // From PT session reports
  nursingScore: real("nursing_score"), // From nursing mobility assessments
  adlScore: real("adl_score"), // Activities of daily living

  // Component weights used
  componentWeights: text("component_weights"), // JSON with weights used

  // Unified mobility score
  unifiedScore: real("unified_score").notNull(), // Weighted composite 0-100
  scoreConfidence: real("score_confidence"), // Confidence based on data completeness

  // Standard scale translations
  barthelIndex: integer("barthel_index"), // 0-100 Barthel Index
  functionalIndependenceMeasure: integer("functional_independence_measure"), // 18-126 FIM

  // Trend analysis
  scoreTrend: text("score_trend"), // 'improving', 'stable', 'declining'
  trendMagnitude: real("trend_magnitude"), // Rate of change

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Cohort comparisons - privacy-preserving benchmarking (8.1)
export const cohortComparisons = sqliteTable("cohort_comparisons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),

  // Cohort definition
  cohortId: text("cohort_id").notNull(), // Hashed cohort identifier
  cohortCriteria: text("cohort_criteria").notNull(), // JSON: { ageRange, diagnosis, mobilityLevel, daysPostAdmission }
  cohortSize: integer("cohort_size").notNull(),

  // Comparison timestamp
  comparedAt: integer("compared_at", { mode: 'timestamp' }).notNull(),

  // Performance percentiles
  durationPercentile: real("duration_percentile"), // 0-100
  powerPercentile: real("power_percentile"),
  consistencyPercentile: real("consistency_percentile"),
  improvementPercentile: real("improvement_percentile"),

  // Comparison summary
  overallPercentile: real("overall_percentile").notNull(),
  comparisonMessage: text("comparison_message"), // "You're performing better than 68% of similar patients"

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Virtual competitions - async competition system (3.2)
export const virtualCompetitions = sqliteTable("virtual_competitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Competition details
  competitionName: text("competition_name").notNull(),
  competitionType: text("competition_type").notNull(), // 'daily_distance', 'weekly_duration', 'power_challenge'
  startDate: integer("start_date", { mode: 'timestamp' }).notNull(),
  endDate: integer("end_date", { mode: 'timestamp' }).notNull(),

  // Matching criteria for participants
  matchingCriteria: text("matching_criteria").notNull(), // JSON: { ageRange, baselineCapability }

  // Competition status
  status: text("status").notNull(), // 'active', 'completed', 'cancelled'

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Competition participants - links patients to competitions
export const competitionParticipants = sqliteTable("competition_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  competitionId: integer("competition_id").notNull().references(() => virtualCompetitions.id),
  patientId: integer("patient_id").notNull().references(() => users.id),

  // Anonymized display
  anonymousId: text("anonymous_id").notNull(), // Privacy-preserving identifier

  // Progress tracking
  currentScore: real("current_score").default(0),
  currentRank: integer("current_rank"),

  // Milestones achieved
  milestonesAchieved: text("milestones_achieved"), // JSON array of milestone IDs

  // Engagement metrics
  sessionsContributed: integer("sessions_contributed").default(0),
  lastContribution: integer("last_contribution", { mode: 'timestamp' }),

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Insurance authorization reports (5.3)
export const insuranceReports = sqliteTable("insurance_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),

  // Report details
  reportType: text("report_type").notNull(), // 'snf_authorization', 'home_health', 'outpatient_pt'
  generatedAt: integer("generated_at", { mode: 'timestamp' }).notNull(),
  generatedBy: integer("generated_by").references(() => users.id),

  // Functional capacity data
  functionalCapacityData: text("functional_capacity_data").notNull(), // JSON with objective metrics
  progressTrajectory: text("progress_trajectory").notNull(), // 'improving', 'plateaued', 'declining'
  comparisonToThresholds: text("comparison_to_thresholds"), // JSON with threshold comparisons

  // Predictions
  predictedTimeToIndependence: integer("predicted_time_to_independence"), // Days
  predictedDischargeDisposition: text("predicted_discharge_disposition"),
  predictionConfidence: real("prediction_confidence"),

  // Report content
  reportContent: text("report_content").notNull(), // Full generated report text
  reportPdf: text("report_pdf"), // Base64 encoded PDF or path

  // Approval workflow
  clinicianApproved: integer("clinician_approved", { mode: 'boolean' }).default(false),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: integer("approved_at", { mode: 'timestamp' }),

  // Submission tracking
  submittedToInsurance: integer("submitted_to_insurance", { mode: 'boolean' }).default(false),
  submittedAt: integer("submitted_at", { mode: 'timestamp' }),
  insuranceResponse: text("insurance_response"),

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Elderly Mobility Scale (EMS) / Discharge Readiness Assessments
export const emsAssessments = sqliteTable("ems_assessments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  providerId: integer("provider_id").references(() => users.id),

  // Assessment timestamp
  assessedAt: integer("assessed_at", { mode: 'timestamp' }).notNull(),

  // EMS Component Scores (7 components, max 20 points total)
  lyingToSitting: integer("lying_to_sitting").notNull(), // 0-2
  sittingToLying: integer("sitting_to_lying").notNull(), // 0-2
  sittingToStanding: integer("sitting_to_standing").notNull(), // 0-3
  standing: integer("standing").notNull(), // 0-3
  gait: integer("gait").notNull(), // 0-3
  timedWalk: integer("timed_walk").notNull(), // 0-3
  functionalReach: integer("functional_reach").notNull(), // 0, 2, or 4

  // Recorded raw values for timed walk and functional reach
  timedWalkSeconds: real("timed_walk_seconds"), // Actual time in seconds
  functionalReachCm: real("functional_reach_cm"), // Actual reach in cm

  // Total score (calculated)
  totalScore: integer("total_score").notNull(), // 0-20

  // Tier classification
  tier: text("tier").notNull(), // 'home', 'borderline', 'dependent'

  // Clinical notes
  notes: text("notes"),

  // Walking aid used during assessment
  walkingAidUsed: text("walking_aid_used"), // 'none', 'stick', 'frame', 'rollator', 'other'

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Fall risk predictions - enhanced fall risk with exercise data (1.1)
export const fallRiskPredictions = sqliteTable("fall_risk_predictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),

  // Prediction timestamp
  predictedAt: integer("predicted_at", { mode: 'timestamp' }).notNull(),

  // Multi-modal risk score
  overallFallRisk: real("overall_fall_risk").notNull(), // 0-1 probability
  riskLevel: text("risk_level").notNull(), // 'low', 'moderate', 'high', 'critical'

  // Contributing factors from exercise
  bilateralAsymmetryRisk: real("bilateral_asymmetry_risk"), // >15% L-R differential
  cadenceVariabilityRisk: real("cadence_variability_risk"),
  powerDecayRisk: real("power_decay_risk"), // Fatigue pattern

  // Temporal factors
  timeOfDayRisk: real("time_of_day_risk"),
  medicationScheduleRisk: real("medication_schedule_risk"),

  // Clinical factors
  clinicalRiskFactors: text("clinical_risk_factors"), // JSON array of contributing factors

  // Alert generated
  alertGenerated: integer("alert_generated", { mode: 'boolean' }).default(false),
  alertPriority: text("alert_priority"),

  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Patient protocol assignments - Track which protocol a patient is following
export const patientProtocolAssignments = sqliteTable("patient_protocol_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  protocolId: integer("protocol_id").notNull().references(() => clinicalProtocols.id),
  assignedBy: integer("assigned_by").notNull().references(() => users.id),
  currentPhase: text("current_phase"), // e.g., "POD 0-2", "POD 3-7"
  startDate: integer("start_date", { mode: 'timestamp' }).notNull(),
  progressionDate: integer("progression_date", { mode: 'timestamp' }), // When they moved to current phase
  completionDate: integer("completion_date", { mode: 'timestamp' }),
  status: text("status").notNull(), // 'active', 'completed', 'discontinued'
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// ============================================================================
// CAREGIVER ENGAGEMENT SYSTEM
// ============================================================================

// Caregiver-Patient relationships
export const caregiverPatients = sqliteTable("caregiver_patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caregiverId: integer("caregiver_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  relationshipType: text("relationship_type").notNull(), // 'spouse', 'child', 'parent', 'sibling', 'friend', 'other_family', 'professional_caregiver'
  accessStatus: text("access_status").default('pending'), // 'pending', 'approved', 'denied', 'revoked'
  requestedAt: integer("requested_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  approvedAt: integer("approved_at", { mode: 'timestamp' }),
  revokedAt: integer("revoked_at", { mode: 'timestamp' }),
  // Permissions
  canLogSessions: integer("can_log_sessions", { mode: 'boolean' }).default(true),
  canViewReports: integer("can_view_reports", { mode: 'boolean' }).default(true),
  canSendNudges: integer("can_send_nudges", { mode: 'boolean' }).default(true),
  // Gamification for caregivers
  supporterXp: integer("supporter_xp").default(0),
  supporterLevel: integer("supporter_level").default(1),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Caregiver observations - structured feedback from family members
export const caregiverObservations = sqliteTable("caregiver_observations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caregiverId: integer("caregiver_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  observationDate: text("observation_date").notNull(), // ISO date string
  // Structured observations
  moodLevel: text("mood_level"), // 'great', 'good', 'fair', 'poor'
  painLevel: integer("pain_level"), // 0-10
  energyLevel: text("energy_level"), // 'high', 'medium', 'low'
  appetite: text("appetite"), // 'good', 'fair', 'poor'
  sleepQuality: text("sleep_quality"), // 'good', 'fair', 'poor'
  mobilityObservations: text("mobility_observations"), // Free text
  // Free text fields
  notes: text("notes"),
  concerns: text("concerns"),
  questionsForProvider: text("questions_for_provider"),
  // AI-generated copy-pasteable summary for provider notes
  aiSummary: text("ai_summary"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Discharge checklists - preparation for going home
export const dischargeChecklists = sqliteTable("discharge_checklists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => users.id),
  caregiverId: integer("caregiver_id").references(() => users.id),
  // Checklist items stored as JSON text for flexibility
  equipmentNeeds: text("equipment_needs").default('{}'), // { wheelchair: { needed: true, acquired: false }, ... }
  homeModifications: text("home_modifications").default('{}'), // { grab_bars: { needed: true, installed: false }, ... }
  medicationReview: text("medication_review").default('{}'), // { understood: true, pharmacy_confirmed: true, ... }
  followUpAppointments: text("follow_up_appointments").default('[]'), // [{ type: 'PT', scheduled: true, date: '...' }, ...]
  emergencyContacts: text("emergency_contacts").default('[]'), // [{ name: '...', phone: '...', relationship: '...' }]
  warningSigns: text("warning_signs").default('{}'), // { reviewed: true, understood: true }
  homeExercisePlan: text("home_exercise_plan").default('{}'), // { reviewed: true, printed: false }
  dietRestrictions: text("diet_restrictions").default('{}'), // { reviewed: true, understood: true }
  // Completion tracking
  completionPercent: integer("completion_percent").default(0),
  completedAt: integer("completed_at", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Caregiver notifications - in-app notifications for caregivers
export const caregiverNotifications = sqliteTable("caregiver_notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caregiverId: integer("caregiver_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  notificationType: text("notification_type").notNull(), // 'goal_completed', 'streak_extended', 'session_logged', 'access_approved', 'access_request'
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata").default('{}'),
  isRead: integer("is_read", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Caregiver achievements - gamification badges for supporters
export const caregiverAchievements = sqliteTable("caregiver_achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caregiverId: integer("caregiver_id").notNull().references(() => users.id),
  patientId: integer("patient_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'first_checkin', 'consistent_supporter', 'encouragement_champion', 'discharge_ready', 'super_supporter'
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").default(0),
  isUnlocked: integer("is_unlocked", { mode: 'boolean' }).default(false),
  unlockedAt: integer("unlocked_at", { mode: 'timestamp' }),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Validation schemas (reuse from main schema)
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  userType: z.enum(["patient", "provider", "caregiver"]),
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

export const caregiverRegistrationSchema = loginSchema.extend({
  userType: z.literal("caregiver"),
  tosAccepted: z.boolean().refine(val => val === true, "You must accept the Terms of Service"),
  tosVersion: z.string().optional(),
  // Patient identification for access request
  patientFirstName: z.string().min(1, "Patient first name is required"),
  patientLastName: z.string().min(1, "Patient last name is required"),
  patientDateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  relationshipType: z.enum(["spouse", "partner", "child", "parent", "sibling", "friend", "other_family", "professional_caregiver"]),
  phoneNumber: z.string().optional(),
});

export const caregiverObservationSchema = z.object({
  patientId: z.number().int().positive(),
  observationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  moodLevel: z.enum(["great", "good", "fair", "poor"]).optional(),
  painLevel: z.number().min(0).max(10).optional(),
  energyLevel: z.enum(["high", "medium", "low"]).optional(),
  appetite: z.enum(["good", "fair", "poor"]).optional(),
  sleepQuality: z.enum(["good", "fair", "poor"]).optional(),
  mobilityObservations: z.string().optional(),
  notes: z.string().optional(),
  concerns: z.string().optional(),
  questionsForProvider: z.string().optional(),
});

export const caregiverAccessRequestSchema = z.object({
  patientFirstName: z.string().min(1, "Patient first name is required"),
  patientLastName: z.string().min(1, "Patient last name is required"),
  patientDateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  relationshipType: z.enum(["spouse", "partner", "child", "parent", "sibling", "friend", "other_family", "professional_caregiver"]),
});

export const caregiverInviteSchema = z.object({
  caregiverEmail: z.string().email("Please enter a valid email address"),
  caregiverFirstName: z.string().min(1, "First name is required"),
  caregiverLastName: z.string().min(1, "Last name is required"),
  relationshipType: z.enum(["spouse", "partner", "child", "parent", "sibling", "friend", "other_family", "professional_caregiver"]),
  phoneNumber: z.string().optional(),
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

// Insert schemas using drizzle-zod
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

// Type exports
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

// Zod schema type exports
export type LoginData = z.infer<typeof loginSchema>;
export type PatientRegistration = z.infer<typeof patientRegistrationSchema>;
export type ProviderRegistration = z.infer<typeof providerRegistrationSchema>;
export type RiskAssessmentInput = z.infer<typeof riskAssessmentInputSchema>;

// Convenience aliases
export type InsertPatient = InsertUser & { userType: 'patient' };
export type InsertSession = InsertExerciseSession;
export type InsertGoal = InsertPatientGoal;

export const insertPatientSchema = patientRegistrationSchema;
export const insertSessionSchema = insertExerciseSessionSchema;
export const insertGoalSchema = insertPatientGoalSchema;

// ============================================================================
// PERSONALIZED PROTOCOL MATCHING SYSTEM - Type Exports
// ============================================================================

// Insert schemas for new tables
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

// Type exports for new tables
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

// Clinical protocol types
export type ClinicalProtocol = typeof clinicalProtocols.$inferSelect;
export type InsertClinicalProtocol = typeof clinicalProtocols.$inferInsert;

export type PatientProtocolAssignment = typeof patientProtocolAssignments.$inferSelect;
export type InsertPatientProtocolAssignment = typeof patientProtocolAssignments.$inferInsert;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

// ============================================================================
// CAREGIVER ENGAGEMENT SYSTEM - Insert Schemas and Types
// ============================================================================

export const insertCaregiverPatientSchema = createInsertSchema(caregiverPatients);
export const insertCaregiverObservationSchema = createInsertSchema(caregiverObservations);
export const insertDischargeChecklistSchema = createInsertSchema(dischargeChecklists);
export const insertCaregiverNotificationSchema = createInsertSchema(caregiverNotifications);
export const insertCaregiverAchievementSchema = createInsertSchema(caregiverAchievements);

export type CaregiverPatient = typeof caregiverPatients.$inferSelect;
export type InsertCaregiverPatient = typeof caregiverPatients.$inferInsert;

export type CaregiverObservation = typeof caregiverObservations.$inferSelect;
export type InsertCaregiverObservation = typeof caregiverObservations.$inferInsert;

export type DischargeChecklist = typeof dischargeChecklists.$inferSelect;
export type InsertDischargeChecklist = typeof dischargeChecklists.$inferInsert;

export type CaregiverNotification = typeof caregiverNotifications.$inferSelect;
export type InsertCaregiverNotification = typeof caregiverNotifications.$inferInsert;

export type CaregiverAchievement = typeof caregiverAchievements.$inferSelect;
export type InsertCaregiverAchievement = typeof caregiverAchievements.$inferInsert;

export type CaregiverRegistration = z.infer<typeof caregiverRegistrationSchema>;
export type CaregiverObservationInput = z.infer<typeof caregiverObservationSchema>;
export type CaregiverAccessRequest = z.infer<typeof caregiverAccessRequestSchema>;
export type CaregiverInvite = z.infer<typeof caregiverInviteSchema>;
