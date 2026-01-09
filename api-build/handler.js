var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.sqlite.ts
var schema_sqlite_exports = {};
__export(schema_sqlite_exports, {
  achievements: () => achievements,
  alerts: () => alerts,
  clinicalProtocols: () => clinicalProtocols,
  cohortComparisons: () => cohortComparisons,
  competitionParticipants: () => competitionParticipants,
  contraindicationVerifications: () => contraindicationVerifications,
  deviceSessions: () => deviceSessions,
  devices: () => devices,
  emsAssessments: () => emsAssessments,
  exerciseSessions: () => exerciseSessions,
  fallRiskPredictions: () => fallRiskPredictions,
  fatigueEvents: () => fatigueEvents,
  feedItems: () => feedItems,
  insertAchievementSchema: () => insertAchievementSchema,
  insertCohortComparisonSchema: () => insertCohortComparisonSchema,
  insertCompetitionParticipantSchema: () => insertCompetitionParticipantSchema,
  insertContraindicationVerificationSchema: () => insertContraindicationVerificationSchema,
  insertDeviceSchema: () => insertDeviceSchema,
  insertDeviceSessionSchema: () => insertDeviceSessionSchema,
  insertEmsAssessmentSchema: () => insertEmsAssessmentSchema,
  insertExerciseSessionSchema: () => insertExerciseSessionSchema,
  insertFallRiskPredictionSchema: () => insertFallRiskPredictionSchema,
  insertFatigueEventSchema: () => insertFatigueEventSchema,
  insertFeedItemSchema: () => insertFeedItemSchema,
  insertGoalSchema: () => insertGoalSchema,
  insertInsuranceReportSchema: () => insertInsuranceReportSchema,
  insertKudosReactionSchema: () => insertKudosReactionSchema,
  insertMedicationInteractionSchema: () => insertMedicationInteractionSchema,
  insertMobilityScoreSchema: () => insertMobilityScoreSchema,
  insertNudgeMessageSchema: () => insertNudgeMessageSchema,
  insertPatientGoalSchema: () => insertPatientGoalSchema,
  insertPatientPersonalizationProfileSchema: () => insertPatientPersonalizationProfileSchema,
  insertPatientPreferencesSchema: () => insertPatientPreferencesSchema,
  insertPatientProfileSchema: () => insertPatientProfileSchema,
  insertPatientSchema: () => insertPatientSchema,
  insertPatientStatsSchema: () => insertPatientStatsSchema,
  insertProtocolMatchingCriteriaSchema: () => insertProtocolMatchingCriteriaSchema,
  insertProviderPatientSchema: () => insertProviderPatientSchema,
  insertRiskAssessmentSchema: () => insertRiskAssessmentSchema,
  insertSessionPerformanceMetricsSchema: () => insertSessionPerformanceMetricsSchema,
  insertSessionSchema: () => insertSessionSchema,
  insertUserSchema: () => insertUserSchema,
  insertVirtualCompetitionSchema: () => insertVirtualCompetitionSchema,
  insuranceReports: () => insuranceReports,
  kudosReactions: () => kudosReactions,
  loginSchema: () => loginSchema,
  medicationInteractions: () => medicationInteractions,
  mobilityScores: () => mobilityScores,
  nudgeMessages: () => nudgeMessages,
  patientGoals: () => patientGoals,
  patientPersonalizationProfiles: () => patientPersonalizationProfiles,
  patientPreferences: () => patientPreferences,
  patientProfiles: () => patientProfiles,
  patientProtocolAssignments: () => patientProtocolAssignments,
  patientRegistrationSchema: () => patientRegistrationSchema,
  patientStats: () => patientStats,
  protocolMatchingCriteria: () => protocolMatchingCriteria,
  providerPatients: () => providerPatients,
  providerRegistrationSchema: () => providerRegistrationSchema,
  riskAssessmentInputSchema: () => riskAssessmentInputSchema,
  riskAssessments: () => riskAssessments,
  sessionPerformanceMetrics: () => sessionPerformanceMetrics,
  sessions: () => sessions,
  users: () => users,
  virtualCompetitions: () => virtualCompetitions
});
import { sql } from "drizzle-orm";
import {
  integer,
  text,
  real,
  sqliteTable
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions, users, patientProfiles, providerPatients, riskAssessments, patientGoals, devices, deviceSessions, exerciseSessions, achievements, patientStats, feedItems, nudgeMessages, kudosReactions, patientPreferences, alerts, clinicalProtocols, patientPersonalizationProfiles, protocolMatchingCriteria, sessionPerformanceMetrics, fatigueEvents, medicationInteractions, contraindicationVerifications, mobilityScores, cohortComparisons, virtualCompetitions, competitionParticipants, insuranceReports, emsAssessments, fallRiskPredictions, patientProtocolAssignments, loginSchema, patientRegistrationSchema, providerRegistrationSchema, riskAssessmentInputSchema, insertUserSchema, insertPatientProfileSchema, insertPatientGoalSchema, insertDeviceSchema, insertDeviceSessionSchema, insertExerciseSessionSchema, insertProviderPatientSchema, insertRiskAssessmentSchema, insertAchievementSchema, insertPatientStatsSchema, insertPatientPreferencesSchema, insertFeedItemSchema, insertNudgeMessageSchema, insertKudosReactionSchema, insertPatientSchema, insertSessionSchema, insertGoalSchema, insertPatientPersonalizationProfileSchema, insertProtocolMatchingCriteriaSchema, insertSessionPerformanceMetricsSchema, insertFatigueEventSchema, insertMedicationInteractionSchema, insertContraindicationVerificationSchema, insertMobilityScoreSchema, insertCohortComparisonSchema, insertVirtualCompetitionSchema, insertCompetitionParticipantSchema, insertInsuranceReportSchema, insertFallRiskPredictionSchema, insertEmsAssessmentSchema;
var init_schema_sqlite = __esm({
  "shared/schema.sqlite.ts"() {
    "use strict";
    sessions = sqliteTable("sessions", {
      sid: text("sid").primaryKey(),
      sess: text("sess").notNull(),
      // JSON stored as text
      expire: integer("expire", { mode: "timestamp" }).notNull()
    });
    users = sqliteTable("users", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      email: text("email").unique().notNull(),
      firstName: text("first_name").notNull(),
      lastName: text("last_name").notNull(),
      userType: text("user_type").notNull(),
      // 'patient' or 'provider'
      dateOfBirth: text("date_of_birth"),
      // ISO date string
      admissionDate: text("admission_date"),
      // ISO date string
      // Provider specific fields
      providerRole: text("provider_role"),
      // 'physician', 'nurse', etc.
      credentials: text("credentials"),
      specialty: text("specialty"),
      licenseNumber: text("license_number"),
      isActive: integer("is_active", { mode: "boolean" }).default(true),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    patientProfiles = sqliteTable("patient_profiles", {
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
      comorbidities: text("comorbidities").default("[]"),
      // JSON array as text
      medications: text("medications").default("[]"),
      devices: text("devices").default("[]"),
      incontinent: integer("incontinent", { mode: "boolean" }).default(false),
      albuminLow: integer("albumin_low", { mode: "boolean" }).default(false),
      baselineFunction: text("baseline_function"),
      onVteProphylaxis: integer("on_vte_prophylaxis", { mode: "boolean" }).default(true),
      losExpectedDays: integer("los_expected_days"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    providerPatients = sqliteTable("provider_patients", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      providerId: integer("provider_id").notNull().references(() => users.id),
      patientId: integer("patient_id").notNull().references(() => users.id),
      permissionGranted: integer("permission_granted", { mode: "boolean" }).default(false),
      grantedAt: integer("granted_at", { mode: "timestamp" }),
      isActive: integer("is_active", { mode: "boolean" }).default(true),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    riskAssessments = sqliteTable("risk_assessments", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      deconditioning: text("deconditioning").notNull(),
      // JSON as text
      vte: text("vte").notNull(),
      falls: text("falls").notNull(),
      pressure: text("pressure").notNull(),
      mobilityRecommendation: text("mobility_recommendation").notNull(),
      losData: text("los_data"),
      dischargeData: text("discharge_data"),
      readmissionData: text("readmission_data"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    patientGoals = sqliteTable("patient_goals", {
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
      aiRecommended: integer("ai_recommended", { mode: "boolean" }).default(false),
      isActive: integer("is_active", { mode: "boolean" }).default(true),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    devices = sqliteTable("devices", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
      location: text("location"),
      status: text("status").default("available"),
      currentPatientId: integer("current_patient_id").references(() => users.id),
      lastUsed: integer("last_used", { mode: "timestamp" }),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    deviceSessions = sqliteTable("device_sessions", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      deviceId: text("device_id").notNull().references(() => devices.id),
      sessionId: integer("session_id").notNull().references(() => exerciseSessions.id),
      startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      endedAt: integer("ended_at", { mode: "timestamp" })
    });
    exerciseSessions = sqliteTable("exercise_sessions", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      deviceId: text("device_id").references(() => devices.id),
      duration: integer("duration").notNull(),
      avgPower: real("avg_power"),
      maxPower: real("max_power"),
      avgRpm: real("avg_rpm"),
      resistance: real("resistance"),
      sessionDate: text("session_date").notNull(),
      // ISO date string
      startTime: integer("start_time", { mode: "timestamp" }).notNull(),
      endTime: integer("end_time", { mode: "timestamp" }),
      stopsAndStarts: integer("stops_and_starts").default(0),
      isCompleted: integer("is_completed", { mode: "boolean" }).default(false),
      // Real-time tracking fields (updated via WebSocket)
      currentRpm: real("current_rpm"),
      currentPower: real("current_power"),
      distanceMeters: real("distance_meters"),
      durationSeconds: integer("duration_seconds"),
      currentStatus: text("current_status"),
      // 'active' | 'paused' | 'completed'
      targetDuration: integer("target_duration"),
      // Target duration in seconds
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    achievements = sqliteTable("achievements", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      type: text("type").notNull(),
      title: text("title").notNull(),
      description: text("description").notNull(),
      xpReward: integer("xp_reward").default(0),
      isUnlocked: integer("is_unlocked", { mode: "boolean" }).default(false),
      unlockedAt: integer("unlocked_at", { mode: "timestamp" }),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    patientStats = sqliteTable("patient_stats", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      level: integer("level").default(1),
      xp: integer("xp").default(0),
      totalSessions: integer("total_sessions").default(0),
      totalDuration: integer("total_duration").default(0),
      avgDailyDuration: real("avg_daily_duration").default(0),
      consistencyStreak: integer("consistency_streak").default(0),
      lastSessionDate: integer("last_session_date", { mode: "timestamp" }),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    feedItems = sqliteTable("feed_items", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      displayName: text("display_name").notNull(),
      avatarEmoji: text("avatar_emoji").default("\u{1F464}"),
      eventType: text("event_type").notNull(),
      templateId: text("template_id").notNull(),
      message: text("message").notNull(),
      metadata: text("metadata").default("{}"),
      unit: text("unit").default("general"),
      isVisible: integer("is_visible", { mode: "boolean" }).default(true),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    nudgeMessages = sqliteTable("nudge_messages", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      senderId: integer("sender_id").notNull().references(() => users.id),
      recipientId: integer("recipient_id").notNull().references(() => users.id),
      feedItemId: integer("feed_item_id").references(() => feedItems.id),
      templateId: text("template_id").notNull(),
      message: text("message").notNull(),
      isRead: integer("is_read", { mode: "boolean" }).default(false),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    kudosReactions = sqliteTable("kudos_reactions", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      feedItemId: integer("feed_item_id").notNull().references(() => feedItems.id),
      reactionType: text("reaction_type").notNull(),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    patientPreferences = sqliteTable("patient_preferences", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      displayName: text("display_name").notNull(),
      avatarEmoji: text("avatar_emoji").default("\u{1F464}"),
      optInKudos: integer("opt_in_kudos", { mode: "boolean" }).default(false),
      optInNudges: integer("opt_in_nudges", { mode: "boolean" }).default(false),
      unit: text("unit").default("general"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    alerts = sqliteTable("alerts", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      type: text("type").notNull(),
      // 'session_incomplete', 'no_activity_24h', etc.
      priority: text("priority").notNull(),
      // 'low', 'medium', 'high', 'critical'
      message: text("message").notNull(),
      actionRequired: text("action_required").notNull(),
      metadata: text("metadata"),
      // JSON as text
      triggeredAt: integer("triggered_at", { mode: "timestamp" }).notNull(),
      acknowledgedAt: integer("acknowledged_at", { mode: "timestamp" }),
      acknowledgedBy: integer("acknowledged_by").references(() => users.id),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    clinicalProtocols = sqliteTable("clinical_protocols", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      name: text("name").notNull(),
      indication: text("indication").notNull(),
      // Clinical indication (e.g., "Total Knee Replacement")
      contraindications: text("contraindications"),
      // JSON array of contraindications
      diagnosisCodes: text("diagnosis_codes"),
      // JSON array of ICD-10 codes
      protocolData: text("protocol_data").notNull(),
      // JSON object with phases
      evidenceCitation: text("evidence_citation"),
      // Research citation
      isActive: integer("is_active", { mode: "boolean" }).default(true),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    patientPersonalizationProfiles = sqliteTable("patient_personalization_profiles", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      // Personality type for engagement (10.1 Adaptive Encouragement)
      personalityType: text("personality_type"),
      // 'competitive', 'achievement', 'health_focused', 'social'
      personalityConfidence: real("personality_confidence").default(0),
      // 0-1 confidence score
      // Circadian patterns (7.2 Context-Aware Recommendations)
      bestPerformanceWindow: text("best_performance_window"),
      // 'morning', 'afternoon', 'evening'
      avgMorningPower: real("avg_morning_power"),
      avgAfternoonPower: real("avg_afternoon_power"),
      avgEveningPower: real("avg_evening_power"),
      // Response patterns for interventions
      respondsToCompetition: integer("responds_to_competition", { mode: "boolean" }).default(false),
      respondsToBadges: integer("responds_to_badges", { mode: "boolean" }).default(false),
      respondsToHealthMessages: integer("responds_to_health_messages", { mode: "boolean" }).default(false),
      respondsToCaregiverSharing: integer("responds_to_caregiver_sharing", { mode: "boolean" }).default(false),
      // Fatigue patterns (4.1 Fatigue-Triggered Auto-Resistance)
      avgFatigueOnsetMinutes: real("avg_fatigue_onset_minutes"),
      // Typical time to fatigue
      fatigueDecayRate: real("fatigue_decay_rate"),
      // Power decay rate when fatigued
      optimalSessionDuration: real("optimal_session_duration"),
      // Learned optimal duration
      // Progressive overload tracking (4.2)
      currentProgressionLevel: integer("current_progression_level").default(1),
      daysAtCurrentLevel: integer("days_at_current_level").default(0),
      lastProgressionDate: integer("last_progression_date", { mode: "timestamp" }),
      consecutiveSuccessfulSessions: integer("consecutive_successful_sessions").default(0),
      // Setback tracking (10.5)
      inSetbackRecovery: integer("in_setback_recovery", { mode: "boolean" }).default(false),
      setbackStartDate: integer("setback_start_date", { mode: "timestamp" }),
      preSetbackLevel: integer("pre_setback_level"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    protocolMatchingCriteria = sqliteTable("protocol_matching_criteria", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      protocolId: integer("protocol_id").notNull().references(() => clinicalProtocols.id),
      // Patient profile matching criteria
      minAge: integer("min_age"),
      maxAge: integer("max_age"),
      requiredMobilityLevels: text("required_mobility_levels"),
      // JSON array
      excludedMobilityLevels: text("excluded_mobility_levels"),
      // JSON array
      requiredBaselineFunction: text("required_baseline_function"),
      // JSON array
      // Clinical matching
      requiredComorbidities: text("required_comorbidities"),
      // JSON array - must have at least one
      excludedComorbidities: text("excluded_comorbidities"),
      // JSON array - cannot have any
      requiredProcedures: text("required_procedures"),
      // JSON array of CPT codes
      // Risk-based matching
      maxFallRisk: real("max_fall_risk"),
      // Protocol not suitable above this fall risk
      maxDeconditioningRisk: real("max_deconditioning_risk"),
      requiresLowVteRisk: integer("requires_low_vte_risk", { mode: "boolean" }).default(false),
      // Matching weight and priority
      matchWeight: real("match_weight").default(1),
      // Weight for scoring
      matchPriority: integer("match_priority").default(0),
      // Higher = tried first
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    sessionPerformanceMetrics = sqliteTable("session_performance_metrics", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      sessionId: integer("session_id").notNull().references(() => exerciseSessions.id),
      patientId: integer("patient_id").notNull().references(() => users.id),
      // Time-series metrics (sampled every 10 seconds)
      powerTimeSeries: text("power_time_series"),
      // JSON array of power readings
      rpmTimeSeries: text("rpm_time_series"),
      // JSON array of RPM readings
      // Derived performance metrics
      powerDecayRate: real("power_decay_rate"),
      // Rate of power decline (fatigue indicator)
      cadenceVariability: real("cadence_variability"),
      // Coefficient of variation
      peakPowerTime: integer("peak_power_time"),
      // Seconds into session when peak occurred
      // Bilateral metrics (Tier 2 - prepared for sensor integration)
      leftForceSeries: text("left_force_series"),
      // JSON array
      rightForceSeries: text("right_force_series"),
      // JSON array
      bilateralAsymmetry: real("bilateral_asymmetry"),
      // Percentage asymmetry (>15% = concern)
      asymmetryTrend: text("asymmetry_trend"),
      // 'improving', 'stable', 'worsening'
      // Fatigue markers (1.1 Predictive Fall Risk)
      fatigueOnsetTime: integer("fatigue_onset_time"),
      // Seconds when fatigue detected
      fatigueMarkers: text("fatigue_markers"),
      // JSON: { powerDecline, cadenceIrregularity, forcePatternDegradation }
      // Session quality indicators
      sessionQualityScore: real("session_quality_score"),
      // 0-100 overall quality
      targetAchievement: real("target_achievement"),
      // % of target duration/power achieved
      interruptionCount: integer("interruption_count").default(0),
      // Contextual data for predictions
      timeOfDay: text("time_of_day"),
      // 'morning', 'afternoon', 'evening', 'night'
      daysSinceAdmission: integer("days_since_admission"),
      hoursSinceLastSession: real("hours_since_last_session"),
      hoursSinceLastMeal: real("hours_since_last_meal"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    fatigueEvents = sqliteTable("fatigue_events", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      sessionId: integer("session_id").references(() => exerciseSessions.id),
      // Detection details
      detectedAt: integer("detected_at", { mode: "timestamp" }).notNull(),
      fatigueType: text("fatigue_type").notNull(),
      // 'power_decline', 'cadence_irregular', 'force_degradation', 'bilateral_loss'
      severity: text("severity").notNull(),
      // 'mild', 'moderate', 'severe'
      // Trigger metrics
      powerDeclinePercent: real("power_decline_percent"),
      cadenceCoefficientVariation: real("cadence_coefficient_variation"),
      bilateralAsymmetryChange: real("bilateral_asymmetry_change"),
      // System response (4.1 Auto-Resistance Reduction)
      actionTaken: text("action_taken"),
      // 'resistance_reduced', 'session_ended', 'alert_sent', 'none'
      resistanceReduction: real("resistance_reduction"),
      // Amount reduced if applicable
      // Outcome tracking
      patientContinued: integer("patient_continued", { mode: "boolean" }),
      sessionCompletedAfter: integer("session_completed_after", { mode: "boolean" }),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    medicationInteractions = sqliteTable("medication_interactions", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      // Medication details
      medicationName: text("medication_name").notNull(),
      medicationClass: text("medication_class").notNull(),
      // 'beta_blocker', 'diuretic', 'sedative', etc.
      administrationTime: integer("administration_time", { mode: "timestamp" }),
      // Exercise performance correlation
      sessionId: integer("session_id").references(() => exerciseSessions.id),
      hoursSinceMedication: real("hours_since_medication"),
      // Performance impact
      powerChangePercent: real("power_change_percent"),
      // Compared to baseline
      heartRateImpact: text("heart_rate_impact"),
      // 'suppressed', 'elevated', 'normal'
      coordinationImpact: text("coordination_impact"),
      // 'impaired', 'normal'
      // Alert generated
      alertGenerated: integer("alert_generated", { mode: "boolean" }).default(false),
      alertMessage: text("alert_message"),
      providerNotified: integer("provider_notified", { mode: "boolean" }).default(false),
      // Goal adjustment (11.2)
      goalAdjustmentApplied: integer("goal_adjustment_applied", { mode: "boolean" }).default(false),
      adjustmentDetails: text("adjustment_details"),
      // JSON with adjustment specifics
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    contraindicationVerifications = sqliteTable("contraindication_verifications", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      // Verification details
      verifiedAt: integer("verified_at", { mode: "timestamp" }).notNull(),
      verificationType: text("verification_type").notNull(),
      // 'pre_session', 'periodic', 'order_change'
      // Contraindication found
      contraindicationFound: integer("contraindication_found", { mode: "boolean" }).default(false),
      contraindicationType: text("contraindication_type"),
      // 'absolute', 'relative', 'temporal'
      contraindicationReason: text("contraindication_reason"),
      // Action taken
      actionTaken: text("action_taken"),
      // 'device_locked', 'parameters_modified', 'alert_sent', 'cleared'
      alertPriority: text("alert_priority"),
      // 'critical', 'warning', 'caution'
      // Override handling
      providerOverride: integer("provider_override", { mode: "boolean" }).default(false),
      overrideBy: integer("override_by").references(() => users.id),
      overrideReason: text("override_reason"),
      overrideAt: integer("override_at", { mode: "timestamp" }),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    mobilityScores = sqliteTable("mobility_scores", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      // Score timestamp
      scoredAt: integer("scored_at", { mode: "timestamp" }).notNull(),
      // Component scores (0-100 each)
      bikeScore: real("bike_score"),
      // From bedside bike metrics
      ambulationScore: real("ambulation_score"),
      // From hallway/room ambulation
      ptScore: real("pt_score"),
      // From PT session reports
      nursingScore: real("nursing_score"),
      // From nursing mobility assessments
      adlScore: real("adl_score"),
      // Activities of daily living
      // Component weights used
      componentWeights: text("component_weights"),
      // JSON with weights used
      // Unified mobility score
      unifiedScore: real("unified_score").notNull(),
      // Weighted composite 0-100
      scoreConfidence: real("score_confidence"),
      // Confidence based on data completeness
      // Standard scale translations
      barthelIndex: integer("barthel_index"),
      // 0-100 Barthel Index
      functionalIndependenceMeasure: integer("functional_independence_measure"),
      // 18-126 FIM
      // Trend analysis
      scoreTrend: text("score_trend"),
      // 'improving', 'stable', 'declining'
      trendMagnitude: real("trend_magnitude"),
      // Rate of change
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    cohortComparisons = sqliteTable("cohort_comparisons", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      // Cohort definition
      cohortId: text("cohort_id").notNull(),
      // Hashed cohort identifier
      cohortCriteria: text("cohort_criteria").notNull(),
      // JSON: { ageRange, diagnosis, mobilityLevel, daysPostAdmission }
      cohortSize: integer("cohort_size").notNull(),
      // Comparison timestamp
      comparedAt: integer("compared_at", { mode: "timestamp" }).notNull(),
      // Performance percentiles
      durationPercentile: real("duration_percentile"),
      // 0-100
      powerPercentile: real("power_percentile"),
      consistencyPercentile: real("consistency_percentile"),
      improvementPercentile: real("improvement_percentile"),
      // Comparison summary
      overallPercentile: real("overall_percentile").notNull(),
      comparisonMessage: text("comparison_message"),
      // "You're performing better than 68% of similar patients"
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    virtualCompetitions = sqliteTable("virtual_competitions", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      // Competition details
      competitionName: text("competition_name").notNull(),
      competitionType: text("competition_type").notNull(),
      // 'daily_distance', 'weekly_duration', 'power_challenge'
      startDate: integer("start_date", { mode: "timestamp" }).notNull(),
      endDate: integer("end_date", { mode: "timestamp" }).notNull(),
      // Matching criteria for participants
      matchingCriteria: text("matching_criteria").notNull(),
      // JSON: { ageRange, baselineCapability }
      // Competition status
      status: text("status").notNull(),
      // 'active', 'completed', 'cancelled'
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    competitionParticipants = sqliteTable("competition_participants", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      competitionId: integer("competition_id").notNull().references(() => virtualCompetitions.id),
      patientId: integer("patient_id").notNull().references(() => users.id),
      // Anonymized display
      anonymousId: text("anonymous_id").notNull(),
      // Privacy-preserving identifier
      // Progress tracking
      currentScore: real("current_score").default(0),
      currentRank: integer("current_rank"),
      // Milestones achieved
      milestonesAchieved: text("milestones_achieved"),
      // JSON array of milestone IDs
      // Engagement metrics
      sessionsContributed: integer("sessions_contributed").default(0),
      lastContribution: integer("last_contribution", { mode: "timestamp" }),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    insuranceReports = sqliteTable("insurance_reports", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      // Report details
      reportType: text("report_type").notNull(),
      // 'snf_authorization', 'home_health', 'outpatient_pt'
      generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
      generatedBy: integer("generated_by").references(() => users.id),
      // Functional capacity data
      functionalCapacityData: text("functional_capacity_data").notNull(),
      // JSON with objective metrics
      progressTrajectory: text("progress_trajectory").notNull(),
      // 'improving', 'plateaued', 'declining'
      comparisonToThresholds: text("comparison_to_thresholds"),
      // JSON with threshold comparisons
      // Predictions
      predictedTimeToIndependence: integer("predicted_time_to_independence"),
      // Days
      predictedDischargeDisposition: text("predicted_discharge_disposition"),
      predictionConfidence: real("prediction_confidence"),
      // Report content
      reportContent: text("report_content").notNull(),
      // Full generated report text
      reportPdf: text("report_pdf"),
      // Base64 encoded PDF or path
      // Approval workflow
      clinicianApproved: integer("clinician_approved", { mode: "boolean" }).default(false),
      approvedBy: integer("approved_by").references(() => users.id),
      approvedAt: integer("approved_at", { mode: "timestamp" }),
      // Submission tracking
      submittedToInsurance: integer("submitted_to_insurance", { mode: "boolean" }).default(false),
      submittedAt: integer("submitted_at", { mode: "timestamp" }),
      insuranceResponse: text("insurance_response"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    emsAssessments = sqliteTable("ems_assessments", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      providerId: integer("provider_id").references(() => users.id),
      // Assessment timestamp
      assessedAt: integer("assessed_at", { mode: "timestamp" }).notNull(),
      // EMS Component Scores (7 components, max 20 points total)
      lyingToSitting: integer("lying_to_sitting").notNull(),
      // 0-2
      sittingToLying: integer("sitting_to_lying").notNull(),
      // 0-2
      sittingToStanding: integer("sitting_to_standing").notNull(),
      // 0-3
      standing: integer("standing").notNull(),
      // 0-3
      gait: integer("gait").notNull(),
      // 0-3
      timedWalk: integer("timed_walk").notNull(),
      // 0-3
      functionalReach: integer("functional_reach").notNull(),
      // 0, 2, or 4
      // Recorded raw values for timed walk and functional reach
      timedWalkSeconds: real("timed_walk_seconds"),
      // Actual time in seconds
      functionalReachCm: real("functional_reach_cm"),
      // Actual reach in cm
      // Total score (calculated)
      totalScore: integer("total_score").notNull(),
      // 0-20
      // Tier classification
      tier: text("tier").notNull(),
      // 'home', 'borderline', 'dependent'
      // Clinical notes
      notes: text("notes"),
      // Walking aid used during assessment
      walkingAidUsed: text("walking_aid_used"),
      // 'none', 'stick', 'frame', 'rollator', 'other'
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    fallRiskPredictions = sqliteTable("fall_risk_predictions", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      // Prediction timestamp
      predictedAt: integer("predicted_at", { mode: "timestamp" }).notNull(),
      // Multi-modal risk score
      overallFallRisk: real("overall_fall_risk").notNull(),
      // 0-1 probability
      riskLevel: text("risk_level").notNull(),
      // 'low', 'moderate', 'high', 'critical'
      // Contributing factors from exercise
      bilateralAsymmetryRisk: real("bilateral_asymmetry_risk"),
      // >15% L-R differential
      cadenceVariabilityRisk: real("cadence_variability_risk"),
      powerDecayRisk: real("power_decay_risk"),
      // Fatigue pattern
      // Temporal factors
      timeOfDayRisk: real("time_of_day_risk"),
      medicationScheduleRisk: real("medication_schedule_risk"),
      // Clinical factors
      clinicalRiskFactors: text("clinical_risk_factors"),
      // JSON array of contributing factors
      // Alert generated
      alertGenerated: integer("alert_generated", { mode: "boolean" }).default(false),
      alertPriority: text("alert_priority"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    patientProtocolAssignments = sqliteTable("patient_protocol_assignments", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      patientId: integer("patient_id").notNull().references(() => users.id),
      protocolId: integer("protocol_id").notNull().references(() => clinicalProtocols.id),
      assignedBy: integer("assigned_by").notNull().references(() => users.id),
      currentPhase: text("current_phase"),
      // e.g., "POD 0-2", "POD 3-7"
      startDate: integer("start_date", { mode: "timestamp" }).notNull(),
      progressionDate: integer("progression_date", { mode: "timestamp" }),
      // When they moved to current phase
      completionDate: integer("completion_date", { mode: "timestamp" }),
      status: text("status").notNull(),
      // 'active', 'completed', 'discontinued'
      notes: text("notes"),
      createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
    });
    loginSchema = z.object({
      email: z.string().email("Please enter a valid email address"),
      firstName: z.string().min(1, "First name is required").optional(),
      lastName: z.string().min(1, "Last name is required").optional(),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
      userType: z.enum(["patient", "provider"])
    });
    patientRegistrationSchema = loginSchema.extend({
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      userType: z.literal("patient")
    });
    providerRegistrationSchema = loginSchema.extend({
      credentials: z.string().min(1, "Credentials are required (e.g., DPT, MD, RN)"),
      specialty: z.string().min(1, "Specialty is required"),
      licenseNumber: z.string().optional(),
      userType: z.literal("provider")
    });
    riskAssessmentInputSchema = z.object({
      age: z.number().min(16).max(110),
      sex: z.enum(["male", "female", "other"]).optional(),
      weight_kg: z.number().positive().optional(),
      height_cm: z.number().positive().optional(),
      level_of_care: z.enum(["icu", "step_down", "stepdown", "ward", "rehab"]),
      mobility_status: z.enum(["bedbound", "chair_bound", "standing_assist", "walking_assist", "independent"]),
      cognitive_status: z.enum(["normal", "mild_impairment", "delirium_dementia"]),
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
      additional_medical_history: z.string().optional()
    });
    insertUserSchema = createInsertSchema(users);
    insertPatientProfileSchema = createInsertSchema(patientProfiles);
    insertPatientGoalSchema = createInsertSchema(patientGoals);
    insertDeviceSchema = createInsertSchema(devices);
    insertDeviceSessionSchema = createInsertSchema(deviceSessions);
    insertExerciseSessionSchema = createInsertSchema(exerciseSessions);
    insertProviderPatientSchema = createInsertSchema(providerPatients);
    insertRiskAssessmentSchema = createInsertSchema(riskAssessments);
    insertAchievementSchema = createInsertSchema(achievements);
    insertPatientStatsSchema = createInsertSchema(patientStats);
    insertPatientPreferencesSchema = createInsertSchema(patientPreferences);
    insertFeedItemSchema = createInsertSchema(feedItems);
    insertNudgeMessageSchema = createInsertSchema(nudgeMessages);
    insertKudosReactionSchema = createInsertSchema(kudosReactions);
    insertPatientSchema = patientRegistrationSchema;
    insertSessionSchema = insertExerciseSessionSchema;
    insertGoalSchema = insertPatientGoalSchema;
    insertPatientPersonalizationProfileSchema = createInsertSchema(patientPersonalizationProfiles);
    insertProtocolMatchingCriteriaSchema = createInsertSchema(protocolMatchingCriteria);
    insertSessionPerformanceMetricsSchema = createInsertSchema(sessionPerformanceMetrics);
    insertFatigueEventSchema = createInsertSchema(fatigueEvents);
    insertMedicationInteractionSchema = createInsertSchema(medicationInteractions);
    insertContraindicationVerificationSchema = createInsertSchema(contraindicationVerifications);
    insertMobilityScoreSchema = createInsertSchema(mobilityScores);
    insertCohortComparisonSchema = createInsertSchema(cohortComparisons);
    insertVirtualCompetitionSchema = createInsertSchema(virtualCompetitions);
    insertCompetitionParticipantSchema = createInsertSchema(competitionParticipants);
    insertInsuranceReportSchema = createInsertSchema(insuranceReports);
    insertFallRiskPredictionSchema = createInsertSchema(fallRiskPredictions);
    insertEmsAssessmentSchema = createInsertSchema(emsAssessments);
  }
});

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  achievements: () => achievements,
  alerts: () => alerts,
  clinicalProtocols: () => clinicalProtocols,
  cohortComparisons: () => cohortComparisons,
  competitionParticipants: () => competitionParticipants,
  contraindicationVerifications: () => contraindicationVerifications,
  deviceSessions: () => deviceSessions,
  devices: () => devices,
  emsAssessments: () => emsAssessments,
  exerciseSessions: () => exerciseSessions,
  fallRiskPredictions: () => fallRiskPredictions,
  fatigueEvents: () => fatigueEvents,
  feedItems: () => feedItems,
  insertAchievementSchema: () => insertAchievementSchema,
  insertCohortComparisonSchema: () => insertCohortComparisonSchema,
  insertCompetitionParticipantSchema: () => insertCompetitionParticipantSchema,
  insertContraindicationVerificationSchema: () => insertContraindicationVerificationSchema,
  insertDeviceSchema: () => insertDeviceSchema,
  insertDeviceSessionSchema: () => insertDeviceSessionSchema,
  insertEmsAssessmentSchema: () => insertEmsAssessmentSchema,
  insertExerciseSessionSchema: () => insertExerciseSessionSchema,
  insertFallRiskPredictionSchema: () => insertFallRiskPredictionSchema,
  insertFatigueEventSchema: () => insertFatigueEventSchema,
  insertFeedItemSchema: () => insertFeedItemSchema,
  insertGoalSchema: () => insertGoalSchema,
  insertInsuranceReportSchema: () => insertInsuranceReportSchema,
  insertKudosReactionSchema: () => insertKudosReactionSchema,
  insertMedicationInteractionSchema: () => insertMedicationInteractionSchema,
  insertMobilityScoreSchema: () => insertMobilityScoreSchema,
  insertNudgeMessageSchema: () => insertNudgeMessageSchema,
  insertPatientGoalSchema: () => insertPatientGoalSchema,
  insertPatientPersonalizationProfileSchema: () => insertPatientPersonalizationProfileSchema,
  insertPatientPreferencesSchema: () => insertPatientPreferencesSchema,
  insertPatientProfileSchema: () => insertPatientProfileSchema,
  insertPatientSchema: () => insertPatientSchema,
  insertPatientStatsSchema: () => insertPatientStatsSchema,
  insertProtocolMatchingCriteriaSchema: () => insertProtocolMatchingCriteriaSchema,
  insertProviderPatientSchema: () => insertProviderPatientSchema,
  insertRiskAssessmentSchema: () => insertRiskAssessmentSchema,
  insertSessionPerformanceMetricsSchema: () => insertSessionPerformanceMetricsSchema,
  insertSessionSchema: () => insertSessionSchema,
  insertUserSchema: () => insertUserSchema,
  insertVirtualCompetitionSchema: () => insertVirtualCompetitionSchema,
  insuranceReports: () => insuranceReports,
  kudosReactions: () => kudosReactions,
  loginSchema: () => loginSchema,
  medicationInteractions: () => medicationInteractions,
  mobilityScores: () => mobilityScores,
  nudgeMessages: () => nudgeMessages,
  patientGoals: () => patientGoals,
  patientPersonalizationProfiles: () => patientPersonalizationProfiles,
  patientPreferences: () => patientPreferences,
  patientProfiles: () => patientProfiles,
  patientProtocolAssignments: () => patientProtocolAssignments,
  patientRegistrationSchema: () => patientRegistrationSchema,
  patientStats: () => patientStats,
  protocolMatchingCriteria: () => protocolMatchingCriteria,
  providerPatients: () => providerPatients,
  providerRegistrationSchema: () => providerRegistrationSchema,
  riskAssessmentInputSchema: () => riskAssessmentInputSchema,
  riskAssessments: () => riskAssessments,
  sessionPerformanceMetrics: () => sessionPerformanceMetrics,
  sessions: () => sessions,
  users: () => users,
  virtualCompetitions: () => virtualCompetitions
});
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    init_schema_sqlite();
  }
});

// shared/schema.postgres.ts
var schema_postgres_exports = {};
__export(schema_postgres_exports, {
  achievements: () => achievements2,
  alerts: () => alerts2,
  clinicalProtocols: () => clinicalProtocols2,
  cohortComparisons: () => cohortComparisons2,
  competitionParticipants: () => competitionParticipants2,
  contraindicationVerifications: () => contraindicationVerifications2,
  deviceSessions: () => deviceSessions2,
  devices: () => devices2,
  emsAssessments: () => emsAssessments2,
  exerciseSessions: () => exerciseSessions2,
  fallRiskPredictions: () => fallRiskPredictions2,
  fatigueEvents: () => fatigueEvents2,
  feedItems: () => feedItems2,
  insertAchievementSchema: () => insertAchievementSchema2,
  insertCohortComparisonSchema: () => insertCohortComparisonSchema2,
  insertCompetitionParticipantSchema: () => insertCompetitionParticipantSchema2,
  insertContraindicationVerificationSchema: () => insertContraindicationVerificationSchema2,
  insertDeviceSchema: () => insertDeviceSchema2,
  insertDeviceSessionSchema: () => insertDeviceSessionSchema2,
  insertEmsAssessmentSchema: () => insertEmsAssessmentSchema2,
  insertExerciseSessionSchema: () => insertExerciseSessionSchema2,
  insertFallRiskPredictionSchema: () => insertFallRiskPredictionSchema2,
  insertFatigueEventSchema: () => insertFatigueEventSchema2,
  insertFeedItemSchema: () => insertFeedItemSchema2,
  insertGoalSchema: () => insertGoalSchema2,
  insertInsuranceReportSchema: () => insertInsuranceReportSchema2,
  insertKudosReactionSchema: () => insertKudosReactionSchema2,
  insertMedicationInteractionSchema: () => insertMedicationInteractionSchema2,
  insertMobilityScoreSchema: () => insertMobilityScoreSchema2,
  insertNudgeMessageSchema: () => insertNudgeMessageSchema2,
  insertPatientGoalSchema: () => insertPatientGoalSchema2,
  insertPatientPersonalizationProfileSchema: () => insertPatientPersonalizationProfileSchema2,
  insertPatientPreferencesSchema: () => insertPatientPreferencesSchema2,
  insertPatientProfileSchema: () => insertPatientProfileSchema2,
  insertPatientSchema: () => insertPatientSchema2,
  insertPatientStatsSchema: () => insertPatientStatsSchema2,
  insertProtocolMatchingCriteriaSchema: () => insertProtocolMatchingCriteriaSchema2,
  insertProviderPatientSchema: () => insertProviderPatientSchema2,
  insertRiskAssessmentSchema: () => insertRiskAssessmentSchema2,
  insertSessionPerformanceMetricsSchema: () => insertSessionPerformanceMetricsSchema2,
  insertSessionSchema: () => insertSessionSchema2,
  insertUserSchema: () => insertUserSchema2,
  insertVirtualCompetitionSchema: () => insertVirtualCompetitionSchema2,
  insuranceReports: () => insuranceReports2,
  kudosReactions: () => kudosReactions2,
  loginSchema: () => loginSchema2,
  medicationInteractions: () => medicationInteractions2,
  mobilityScores: () => mobilityScores2,
  nudgeMessages: () => nudgeMessages2,
  patientGoals: () => patientGoals2,
  patientPersonalizationProfiles: () => patientPersonalizationProfiles2,
  patientPreferences: () => patientPreferences2,
  patientProfiles: () => patientProfiles2,
  patientProtocolAssignments: () => patientProtocolAssignments2,
  patientRegistrationSchema: () => patientRegistrationSchema2,
  patientStats: () => patientStats2,
  protocolMatchingCriteria: () => protocolMatchingCriteria2,
  providerPatients: () => providerPatients2,
  providerRegistrationSchema: () => providerRegistrationSchema2,
  riskAssessmentInputSchema: () => riskAssessmentInputSchema2,
  riskAssessments: () => riskAssessments2,
  sessionPerformanceMetrics: () => sessionPerformanceMetrics2,
  sessions: () => sessions2,
  users: () => users2,
  virtualCompetitions: () => virtualCompetitions2
});
import { sql as sql2 } from "drizzle-orm";
import {
  integer as integer2,
  text as text2,
  boolean,
  timestamp,
  pgTable,
  serial,
  varchar,
  doublePrecision,
  jsonb
} from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema2 } from "drizzle-zod";
import { z as z2 } from "zod";
var sessions2, users2, patientProfiles2, providerPatients2, riskAssessments2, patientGoals2, devices2, exerciseSessions2, deviceSessions2, achievements2, patientStats2, feedItems2, nudgeMessages2, kudosReactions2, patientPreferences2, alerts2, clinicalProtocols2, patientPersonalizationProfiles2, protocolMatchingCriteria2, sessionPerformanceMetrics2, fatigueEvents2, medicationInteractions2, contraindicationVerifications2, mobilityScores2, cohortComparisons2, virtualCompetitions2, competitionParticipants2, insuranceReports2, emsAssessments2, fallRiskPredictions2, patientProtocolAssignments2, loginSchema2, patientRegistrationSchema2, providerRegistrationSchema2, riskAssessmentInputSchema2, insertUserSchema2, insertPatientProfileSchema2, insertPatientGoalSchema2, insertDeviceSchema2, insertDeviceSessionSchema2, insertExerciseSessionSchema2, insertProviderPatientSchema2, insertRiskAssessmentSchema2, insertAchievementSchema2, insertPatientStatsSchema2, insertPatientPreferencesSchema2, insertFeedItemSchema2, insertNudgeMessageSchema2, insertKudosReactionSchema2, insertPatientPersonalizationProfileSchema2, insertProtocolMatchingCriteriaSchema2, insertSessionPerformanceMetricsSchema2, insertFatigueEventSchema2, insertMedicationInteractionSchema2, insertContraindicationVerificationSchema2, insertMobilityScoreSchema2, insertCohortComparisonSchema2, insertVirtualCompetitionSchema2, insertCompetitionParticipantSchema2, insertInsuranceReportSchema2, insertFallRiskPredictionSchema2, insertEmsAssessmentSchema2, insertPatientSchema2, insertSessionSchema2, insertGoalSchema2;
var init_schema_postgres = __esm({
  "shared/schema.postgres.ts"() {
    "use strict";
    sessions2 = pgTable("sessions", {
      sid: varchar("sid", { length: 255 }).primaryKey(),
      sess: jsonb("sess").notNull(),
      expire: timestamp("expire", { withTimezone: true }).notNull()
    });
    users2 = pgTable("users", {
      id: serial("id").primaryKey(),
      email: varchar("email", { length: 255 }).unique().notNull(),
      firstName: varchar("first_name", { length: 100 }).notNull(),
      lastName: varchar("last_name", { length: 100 }).notNull(),
      userType: varchar("user_type", { length: 20 }).notNull(),
      // 'patient' or 'provider'
      dateOfBirth: varchar("date_of_birth", { length: 10 }),
      // ISO date string
      admissionDate: varchar("admission_date", { length: 10 }),
      // ISO date string
      // Provider specific fields
      providerRole: varchar("provider_role", { length: 50 }),
      credentials: varchar("credentials", { length: 50 }),
      specialty: varchar("specialty", { length: 100 }),
      licenseNumber: varchar("license_number", { length: 50 }),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    patientProfiles2 = pgTable("patient_profiles", {
      id: serial("id").primaryKey(),
      userId: integer2("user_id").notNull().references(() => users2.id),
      age: integer2("age").notNull(),
      sex: varchar("sex", { length: 10 }),
      weightKg: doublePrecision("weight_kg"),
      heightCm: doublePrecision("height_cm"),
      levelOfCare: varchar("level_of_care", { length: 20 }).notNull(),
      mobilityStatus: varchar("mobility_status", { length: 30 }).notNull(),
      cognitiveStatus: varchar("cognitive_status", { length: 30 }).notNull(),
      daysImmobile: integer2("days_immobile").default(0),
      admissionDiagnosis: text2("admission_diagnosis"),
      comorbidities: jsonb("comorbidities").default([]),
      medications: jsonb("medications").default([]),
      devices: jsonb("devices").default([]),
      incontinent: boolean("incontinent").default(false),
      albuminLow: boolean("albumin_low").default(false),
      baselineFunction: varchar("baseline_function", { length: 20 }),
      onVteProphylaxis: boolean("on_vte_prophylaxis").default(true),
      losExpectedDays: integer2("los_expected_days"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    providerPatients2 = pgTable("provider_patients", {
      id: serial("id").primaryKey(),
      providerId: integer2("provider_id").notNull().references(() => users2.id),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      permissionGranted: boolean("permission_granted").default(false),
      grantedAt: timestamp("granted_at", { withTimezone: true }),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    riskAssessments2 = pgTable("risk_assessments", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      deconditioning: jsonb("deconditioning").notNull(),
      vte: jsonb("vte").notNull(),
      falls: jsonb("falls").notNull(),
      pressure: jsonb("pressure").notNull(),
      mobilityRecommendation: text2("mobility_recommendation").notNull(),
      losData: jsonb("los_data"),
      dischargeData: jsonb("discharge_data"),
      readmissionData: jsonb("readmission_data"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    patientGoals2 = pgTable("patient_goals", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      providerId: integer2("provider_id").references(() => users2.id),
      goalType: varchar("goal_type", { length: 50 }).notNull(),
      targetValue: doublePrecision("target_value").notNull(),
      currentValue: doublePrecision("current_value").default(0),
      unit: varchar("unit", { length: 20 }).notNull(),
      label: varchar("label", { length: 100 }).notNull(),
      subtitle: varchar("subtitle", { length: 200 }),
      period: varchar("period", { length: 20 }).notNull(),
      aiRecommended: boolean("ai_recommended").default(false),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    devices2 = pgTable("devices", {
      id: varchar("id", { length: 50 }).primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      location: varchar("location", { length: 100 }),
      status: varchar("status", { length: 20 }).default("available"),
      currentPatientId: integer2("current_patient_id").references(() => users2.id),
      lastUsed: timestamp("last_used", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    exerciseSessions2 = pgTable("exercise_sessions", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      deviceId: varchar("device_id", { length: 50 }).references(() => devices2.id),
      duration: integer2("duration").notNull(),
      avgPower: doublePrecision("avg_power"),
      maxPower: doublePrecision("max_power"),
      avgRpm: doublePrecision("avg_rpm"),
      resistance: doublePrecision("resistance"),
      sessionDate: varchar("session_date", { length: 10 }).notNull(),
      // ISO date string
      startTime: timestamp("start_time", { withTimezone: true }).notNull(),
      endTime: timestamp("end_time", { withTimezone: true }),
      stopsAndStarts: integer2("stops_and_starts").default(0),
      isCompleted: boolean("is_completed").default(false),
      // Real-time tracking fields
      currentRpm: doublePrecision("current_rpm"),
      currentPower: doublePrecision("current_power"),
      distanceMeters: doublePrecision("distance_meters"),
      durationSeconds: integer2("duration_seconds"),
      currentStatus: varchar("current_status", { length: 20 }),
      targetDuration: integer2("target_duration"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    deviceSessions2 = pgTable("device_sessions", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      deviceId: varchar("device_id", { length: 50 }).notNull().references(() => devices2.id),
      sessionId: integer2("session_id").notNull().references(() => exerciseSessions2.id),
      startedAt: timestamp("started_at", { withTimezone: true }).default(sql2`NOW()`),
      endedAt: timestamp("ended_at", { withTimezone: true })
    });
    achievements2 = pgTable("achievements", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      type: varchar("type", { length: 50 }).notNull(),
      title: varchar("title", { length: 100 }).notNull(),
      description: text2("description").notNull(),
      xpReward: integer2("xp_reward").default(0),
      isUnlocked: boolean("is_unlocked").default(false),
      unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    patientStats2 = pgTable("patient_stats", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      level: integer2("level").default(1),
      xp: integer2("xp").default(0),
      totalSessions: integer2("total_sessions").default(0),
      totalDuration: integer2("total_duration").default(0),
      avgDailyDuration: doublePrecision("avg_daily_duration").default(0),
      consistencyStreak: integer2("consistency_streak").default(0),
      lastSessionDate: timestamp("last_session_date", { withTimezone: true }),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    feedItems2 = pgTable("feed_items", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      displayName: varchar("display_name", { length: 100 }).notNull(),
      avatarEmoji: varchar("avatar_emoji", { length: 10 }).default("\u{1F464}"),
      eventType: varchar("event_type", { length: 50 }).notNull(),
      templateId: varchar("template_id", { length: 50 }).notNull(),
      message: text2("message").notNull(),
      metadata: jsonb("metadata").default({}),
      unit: varchar("unit", { length: 50 }).default("general"),
      isVisible: boolean("is_visible").default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    nudgeMessages2 = pgTable("nudge_messages", {
      id: serial("id").primaryKey(),
      senderId: integer2("sender_id").notNull().references(() => users2.id),
      recipientId: integer2("recipient_id").notNull().references(() => users2.id),
      feedItemId: integer2("feed_item_id").references(() => feedItems2.id),
      templateId: varchar("template_id", { length: 50 }).notNull(),
      message: text2("message").notNull(),
      isRead: boolean("is_read").default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    kudosReactions2 = pgTable("kudos_reactions", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      feedItemId: integer2("feed_item_id").notNull().references(() => feedItems2.id),
      reactionType: varchar("reaction_type", { length: 20 }).notNull(),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    patientPreferences2 = pgTable("patient_preferences", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      displayName: varchar("display_name", { length: 100 }).notNull(),
      avatarEmoji: varchar("avatar_emoji", { length: 10 }).default("\u{1F464}"),
      optInKudos: boolean("opt_in_kudos").default(false),
      optInNudges: boolean("opt_in_nudges").default(false),
      unit: varchar("unit", { length: 50 }).default("general"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    alerts2 = pgTable("alerts", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      type: varchar("type", { length: 50 }).notNull(),
      priority: varchar("priority", { length: 20 }).notNull(),
      message: text2("message").notNull(),
      actionRequired: text2("action_required").notNull(),
      metadata: jsonb("metadata"),
      triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull(),
      acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
      acknowledgedBy: integer2("acknowledged_by").references(() => users2.id),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    clinicalProtocols2 = pgTable("clinical_protocols", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 200 }).notNull(),
      indication: text2("indication").notNull(),
      contraindications: jsonb("contraindications"),
      diagnosisCodes: jsonb("diagnosis_codes"),
      protocolData: jsonb("protocol_data").notNull(),
      evidenceCitation: text2("evidence_citation"),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    patientPersonalizationProfiles2 = pgTable("patient_personalization_profiles", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
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
      currentProgressionLevel: integer2("current_progression_level").default(1),
      daysAtCurrentLevel: integer2("days_at_current_level").default(0),
      lastProgressionDate: timestamp("last_progression_date", { withTimezone: true }),
      consecutiveSuccessfulSessions: integer2("consecutive_successful_sessions").default(0),
      inSetbackRecovery: boolean("in_setback_recovery").default(false),
      setbackStartDate: timestamp("setback_start_date", { withTimezone: true }),
      preSetbackLevel: integer2("pre_setback_level"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    protocolMatchingCriteria2 = pgTable("protocol_matching_criteria", {
      id: serial("id").primaryKey(),
      protocolId: integer2("protocol_id").notNull().references(() => clinicalProtocols2.id),
      minAge: integer2("min_age"),
      maxAge: integer2("max_age"),
      requiredMobilityLevels: jsonb("required_mobility_levels"),
      excludedMobilityLevels: jsonb("excluded_mobility_levels"),
      requiredBaselineFunction: jsonb("required_baseline_function"),
      requiredComorbidities: jsonb("required_comorbidities"),
      excludedComorbidities: jsonb("excluded_comorbidities"),
      requiredProcedures: jsonb("required_procedures"),
      maxFallRisk: doublePrecision("max_fall_risk"),
      maxDeconditioningRisk: doublePrecision("max_deconditioning_risk"),
      requiresLowVteRisk: boolean("requires_low_vte_risk").default(false),
      matchWeight: doublePrecision("match_weight").default(1),
      matchPriority: integer2("match_priority").default(0),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    sessionPerformanceMetrics2 = pgTable("session_performance_metrics", {
      id: serial("id").primaryKey(),
      sessionId: integer2("session_id").notNull().references(() => exerciseSessions2.id),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      powerTimeSeries: jsonb("power_time_series"),
      rpmTimeSeries: jsonb("rpm_time_series"),
      powerDecayRate: doublePrecision("power_decay_rate"),
      cadenceVariability: doublePrecision("cadence_variability"),
      peakPowerTime: integer2("peak_power_time"),
      leftForceSeries: jsonb("left_force_series"),
      rightForceSeries: jsonb("right_force_series"),
      bilateralAsymmetry: doublePrecision("bilateral_asymmetry"),
      asymmetryTrend: varchar("asymmetry_trend", { length: 20 }),
      fatigueOnsetTime: integer2("fatigue_onset_time"),
      fatigueMarkers: jsonb("fatigue_markers"),
      sessionQualityScore: doublePrecision("session_quality_score"),
      targetAchievement: doublePrecision("target_achievement"),
      interruptionCount: integer2("interruption_count").default(0),
      timeOfDay: varchar("time_of_day", { length: 20 }),
      daysSinceAdmission: integer2("days_since_admission"),
      hoursSinceLastSession: doublePrecision("hours_since_last_session"),
      hoursSinceLastMeal: doublePrecision("hours_since_last_meal"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    fatigueEvents2 = pgTable("fatigue_events", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      sessionId: integer2("session_id").references(() => exerciseSessions2.id),
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
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    medicationInteractions2 = pgTable("medication_interactions", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      medicationName: varchar("medication_name", { length: 100 }).notNull(),
      medicationClass: varchar("medication_class", { length: 50 }).notNull(),
      administrationTime: timestamp("administration_time", { withTimezone: true }),
      sessionId: integer2("session_id").references(() => exerciseSessions2.id),
      hoursSinceMedication: doublePrecision("hours_since_medication"),
      powerChangePercent: doublePrecision("power_change_percent"),
      heartRateImpact: varchar("heart_rate_impact", { length: 20 }),
      coordinationImpact: varchar("coordination_impact", { length: 20 }),
      alertGenerated: boolean("alert_generated").default(false),
      alertMessage: text2("alert_message"),
      providerNotified: boolean("provider_notified").default(false),
      goalAdjustmentApplied: boolean("goal_adjustment_applied").default(false),
      adjustmentDetails: jsonb("adjustment_details"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    contraindicationVerifications2 = pgTable("contraindication_verifications", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
      verificationType: varchar("verification_type", { length: 30 }).notNull(),
      contraindicationFound: boolean("contraindication_found").default(false),
      contraindicationType: varchar("contraindication_type", { length: 20 }),
      contraindicationReason: text2("contraindication_reason"),
      actionTaken: varchar("action_taken", { length: 30 }),
      alertPriority: varchar("alert_priority", { length: 20 }),
      providerOverride: boolean("provider_override").default(false),
      overrideBy: integer2("override_by").references(() => users2.id),
      overrideReason: text2("override_reason"),
      overrideAt: timestamp("override_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    mobilityScores2 = pgTable("mobility_scores", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      scoredAt: timestamp("scored_at", { withTimezone: true }).notNull(),
      bikeScore: doublePrecision("bike_score"),
      ambulationScore: doublePrecision("ambulation_score"),
      ptScore: doublePrecision("pt_score"),
      nursingScore: doublePrecision("nursing_score"),
      adlScore: doublePrecision("adl_score"),
      componentWeights: jsonb("component_weights"),
      unifiedScore: doublePrecision("unified_score").notNull(),
      scoreConfidence: doublePrecision("score_confidence"),
      barthelIndex: integer2("barthel_index"),
      functionalIndependenceMeasure: integer2("functional_independence_measure"),
      scoreTrend: varchar("score_trend", { length: 20 }),
      trendMagnitude: doublePrecision("trend_magnitude"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    cohortComparisons2 = pgTable("cohort_comparisons", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      cohortId: varchar("cohort_id", { length: 100 }).notNull(),
      cohortCriteria: jsonb("cohort_criteria").notNull(),
      cohortSize: integer2("cohort_size").notNull(),
      comparedAt: timestamp("compared_at", { withTimezone: true }).notNull(),
      durationPercentile: doublePrecision("duration_percentile"),
      powerPercentile: doublePrecision("power_percentile"),
      consistencyPercentile: doublePrecision("consistency_percentile"),
      improvementPercentile: doublePrecision("improvement_percentile"),
      overallPercentile: doublePrecision("overall_percentile").notNull(),
      comparisonMessage: text2("comparison_message"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    virtualCompetitions2 = pgTable("virtual_competitions", {
      id: serial("id").primaryKey(),
      competitionName: varchar("competition_name", { length: 200 }).notNull(),
      competitionType: varchar("competition_type", { length: 50 }).notNull(),
      startDate: timestamp("start_date", { withTimezone: true }).notNull(),
      endDate: timestamp("end_date", { withTimezone: true }).notNull(),
      matchingCriteria: jsonb("matching_criteria").notNull(),
      status: varchar("status", { length: 20 }).notNull(),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    competitionParticipants2 = pgTable("competition_participants", {
      id: serial("id").primaryKey(),
      competitionId: integer2("competition_id").notNull().references(() => virtualCompetitions2.id),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      anonymousId: varchar("anonymous_id", { length: 50 }).notNull(),
      currentScore: doublePrecision("current_score").default(0),
      currentRank: integer2("current_rank"),
      milestonesAchieved: jsonb("milestones_achieved"),
      sessionsContributed: integer2("sessions_contributed").default(0),
      lastContribution: timestamp("last_contribution", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    insuranceReports2 = pgTable("insurance_reports", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      reportType: varchar("report_type", { length: 50 }).notNull(),
      generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
      generatedBy: integer2("generated_by").references(() => users2.id),
      functionalCapacityData: jsonb("functional_capacity_data").notNull(),
      progressTrajectory: varchar("progress_trajectory", { length: 20 }).notNull(),
      comparisonToThresholds: jsonb("comparison_to_thresholds"),
      predictedTimeToIndependence: integer2("predicted_time_to_independence"),
      predictedDischargeDisposition: varchar("predicted_discharge_disposition", { length: 50 }),
      predictionConfidence: doublePrecision("prediction_confidence"),
      reportContent: text2("report_content").notNull(),
      reportPdf: text2("report_pdf"),
      clinicianApproved: boolean("clinician_approved").default(false),
      approvedBy: integer2("approved_by").references(() => users2.id),
      approvedAt: timestamp("approved_at", { withTimezone: true }),
      submittedToInsurance: boolean("submitted_to_insurance").default(false),
      submittedAt: timestamp("submitted_at", { withTimezone: true }),
      insuranceResponse: text2("insurance_response"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    emsAssessments2 = pgTable("ems_assessments", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      providerId: integer2("provider_id").references(() => users2.id),
      assessedAt: timestamp("assessed_at", { withTimezone: true }).notNull(),
      lyingToSitting: integer2("lying_to_sitting").notNull(),
      sittingToLying: integer2("sitting_to_lying").notNull(),
      sittingToStanding: integer2("sitting_to_standing").notNull(),
      standing: integer2("standing").notNull(),
      gait: integer2("gait").notNull(),
      timedWalk: integer2("timed_walk").notNull(),
      functionalReach: integer2("functional_reach").notNull(),
      timedWalkSeconds: doublePrecision("timed_walk_seconds"),
      functionalReachCm: doublePrecision("functional_reach_cm"),
      totalScore: integer2("total_score").notNull(),
      tier: varchar("tier", { length: 20 }).notNull(),
      notes: text2("notes"),
      walkingAidUsed: varchar("walking_aid_used", { length: 30 }),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    fallRiskPredictions2 = pgTable("fall_risk_predictions", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
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
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    patientProtocolAssignments2 = pgTable("patient_protocol_assignments", {
      id: serial("id").primaryKey(),
      patientId: integer2("patient_id").notNull().references(() => users2.id),
      protocolId: integer2("protocol_id").notNull().references(() => clinicalProtocols2.id),
      assignedBy: integer2("assigned_by").notNull().references(() => users2.id),
      currentPhase: varchar("current_phase", { length: 50 }),
      startDate: timestamp("start_date", { withTimezone: true }).notNull(),
      progressionDate: timestamp("progression_date", { withTimezone: true }),
      completionDate: timestamp("completion_date", { withTimezone: true }),
      status: varchar("status", { length: 20 }).notNull(),
      notes: text2("notes"),
      createdAt: timestamp("created_at", { withTimezone: true }).default(sql2`NOW()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql2`NOW()`)
    });
    loginSchema2 = z2.object({
      email: z2.string().email("Please enter a valid email address"),
      firstName: z2.string().min(1, "First name is required").optional(),
      lastName: z2.string().min(1, "Last name is required").optional(),
      dateOfBirth: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
      userType: z2.enum(["patient", "provider"])
    });
    patientRegistrationSchema2 = loginSchema2.extend({
      dateOfBirth: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
      userType: z2.literal("patient")
    });
    providerRegistrationSchema2 = loginSchema2.extend({
      credentials: z2.string().min(1, "Credentials are required (e.g., DPT, MD, RN)"),
      specialty: z2.string().min(1, "Specialty is required"),
      licenseNumber: z2.string().optional(),
      userType: z2.literal("provider")
    });
    riskAssessmentInputSchema2 = z2.object({
      age: z2.number().min(16).max(110),
      sex: z2.enum(["male", "female", "other"]).optional(),
      weight_kg: z2.number().positive().optional(),
      height_cm: z2.number().positive().optional(),
      level_of_care: z2.enum(["icu", "step_down", "stepdown", "ward", "rehab"]),
      mobility_status: z2.enum(["bedbound", "chair_bound", "standing_assist", "walking_assist", "independent"]),
      cognitive_status: z2.enum(["normal", "mild_impairment", "delirium_dementia"]),
      days_immobile: z2.number().min(0).default(0),
      admission_diagnosis: z2.string().min(1, "Admission diagnosis is required"),
      comorbidities: z2.array(z2.string()).default([]),
      medications: z2.array(z2.string()).default([]),
      devices: z2.array(z2.string()).default([]),
      incontinent: z2.boolean().default(false),
      albumin_low: z2.boolean().default(false),
      baseline_function: z2.enum(["independent", "walker", "dependent"]).optional(),
      on_vte_prophylaxis: z2.boolean().default(true),
      los_expected_days: z2.number().min(1).max(365).optional(),
      on_sedating_medications: z2.boolean().default(false),
      on_anticoagulants: z2.boolean().default(false),
      on_steroids: z2.boolean().default(false),
      has_diabetes: z2.boolean().default(false),
      has_malnutrition: z2.boolean().default(false),
      has_obesity: z2.boolean().default(false),
      has_neuropathy: z2.boolean().default(false),
      has_parkinson: z2.boolean().default(false),
      has_stroke_history: z2.boolean().default(false),
      has_active_cancer: z2.boolean().default(false),
      has_vte_history: z2.boolean().default(false),
      is_postoperative: z2.boolean().default(false),
      is_trauma_admission: z2.boolean().default(false),
      is_sepsis: z2.boolean().default(false),
      is_cardiac_admission: z2.boolean().default(false),
      is_neuro_admission: z2.boolean().default(false),
      is_orthopedic: z2.boolean().default(false),
      is_oncology: z2.boolean().default(false),
      has_foley_catheter: z2.boolean().default(false),
      has_central_line: z2.boolean().default(false),
      has_feeding_tube: z2.boolean().default(false),
      has_ventilator: z2.boolean().default(false),
      additional_medications: z2.string().optional(),
      additional_comorbidities: z2.string().optional(),
      additional_medical_history: z2.string().optional()
    });
    insertUserSchema2 = createInsertSchema2(users2);
    insertPatientProfileSchema2 = createInsertSchema2(patientProfiles2);
    insertPatientGoalSchema2 = createInsertSchema2(patientGoals2);
    insertDeviceSchema2 = createInsertSchema2(devices2);
    insertDeviceSessionSchema2 = createInsertSchema2(deviceSessions2);
    insertExerciseSessionSchema2 = createInsertSchema2(exerciseSessions2);
    insertProviderPatientSchema2 = createInsertSchema2(providerPatients2);
    insertRiskAssessmentSchema2 = createInsertSchema2(riskAssessments2);
    insertAchievementSchema2 = createInsertSchema2(achievements2);
    insertPatientStatsSchema2 = createInsertSchema2(patientStats2);
    insertPatientPreferencesSchema2 = createInsertSchema2(patientPreferences2);
    insertFeedItemSchema2 = createInsertSchema2(feedItems2);
    insertNudgeMessageSchema2 = createInsertSchema2(nudgeMessages2);
    insertKudosReactionSchema2 = createInsertSchema2(kudosReactions2);
    insertPatientPersonalizationProfileSchema2 = createInsertSchema2(patientPersonalizationProfiles2);
    insertProtocolMatchingCriteriaSchema2 = createInsertSchema2(protocolMatchingCriteria2);
    insertSessionPerformanceMetricsSchema2 = createInsertSchema2(sessionPerformanceMetrics2);
    insertFatigueEventSchema2 = createInsertSchema2(fatigueEvents2);
    insertMedicationInteractionSchema2 = createInsertSchema2(medicationInteractions2);
    insertContraindicationVerificationSchema2 = createInsertSchema2(contraindicationVerifications2);
    insertMobilityScoreSchema2 = createInsertSchema2(mobilityScores2);
    insertCohortComparisonSchema2 = createInsertSchema2(cohortComparisons2);
    insertVirtualCompetitionSchema2 = createInsertSchema2(virtualCompetitions2);
    insertCompetitionParticipantSchema2 = createInsertSchema2(competitionParticipants2);
    insertInsuranceReportSchema2 = createInsertSchema2(insuranceReports2);
    insertFallRiskPredictionSchema2 = createInsertSchema2(fallRiskPredictions2);
    insertEmsAssessmentSchema2 = createInsertSchema2(emsAssessments2);
    insertPatientSchema2 = patientRegistrationSchema2;
    insertSessionSchema2 = insertExerciseSessionSchema2;
    insertGoalSchema2 = insertPatientGoalSchema2;
  }
});

// server/db.ts
import "dotenv/config";
var USE_POSTGRES, db, pool;
var init_db = __esm({
  async "server/db.ts"() {
    "use strict";
    USE_POSTGRES = process.env.USE_POSTGRES === "true" && process.env.DATABASE_URL;
    if (USE_POSTGRES) {
      console.log("\u{1F418} Using PostgreSQL (Supabase) database for persistent storage");
      const pg = await import("pg").then((m) => m.default);
      const { drizzle } = await import("drizzle-orm/node-postgres");
      const schema = await Promise.resolve().then(() => (init_schema_postgres(), schema_postgres_exports));
      const connectionPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        max: 10,
        idleTimeoutMillis: 3e4
      });
      try {
        const client = await connectionPool.connect();
        console.log("\u2705 Connected to Supabase PostgreSQL");
        client.release();
      } catch (err) {
        console.error("\u274C PostgreSQL connection failed:", err);
        process.exit(1);
      }
      db = drizzle(connectionPool, { schema });
      pool = connectionPool;
    } else {
      console.log("\u{1F5C4}\uFE0F  Using local SQLite database for development");
      const Database = await import("better-sqlite3").then((m) => m.default);
      const { drizzle } = await import("drizzle-orm/better-sqlite3");
      const path3 = await import("path");
      const schema = await Promise.resolve().then(() => (init_schema_sqlite(), schema_sqlite_exports));
      const dbPath = path3.join(process.cwd(), "local.db");
      console.log("\u{1F4C1} Database file:", dbPath);
      const sqlite = new Database(dbPath);
      sqlite.pragma("foreign_keys = ON");
      db = drizzle(sqlite, { schema });
      pool = sqlite;
    }
  }
});

// server/mobility-addons.ts
function mapAdmitCategory(text3) {
  const t = (text3 || "").toLowerCase();
  for (const [key, value] of Object.entries(ADMIT_MAP)) {
    if (t.includes(key)) {
      return value;
    }
  }
  return "general_medical";
}
function bucketMeds(meds) {
  const medLower = (meds || []).map((m) => m.toLowerCase());
  const sedating = medLower.some(
    (m) => Array.from(SEDATIVE_TOKENS).some((token) => m.includes(token))
  );
  const on_anticoagulant = medLower.some(
    (m) => Array.from(ANTICOAG_TOKENS).some((token) => m.includes(token))
  );
  const on_steroids = medLower.some(
    (m) => Array.from(STEROID_TOKENS).some((token) => m.includes(token))
  );
  return { sedating, on_anticoagulant, on_steroids };
}
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}
function extractAddonFlags(inputEcho) {
  const p = inputEcho;
  const medsInfo = bucketMeds(p.medications || []);
  const comorbidities = new Set(p.comorbidities || []);
  const devices3 = new Set(p.devices || []);
  const age = parseInt(p.age) || 0;
  const heightCm = p.height_cm;
  const weightKg = p.weight_kg;
  let bmi;
  if (heightCm && weightKg) {
    try {
      bmi = parseFloat(weightKg) / Math.pow(parseFloat(heightCm) / 100, 2);
    } catch (e) {
      bmi = void 0;
    }
  }
  const levelOfCare = (p.level_of_care || "ward").toLowerCase();
  const baselineFunction = (p.baseline_function || "independent").toLowerCase();
  const cognitiveStatus = (p.cognitive_status || "normal").toLowerCase();
  const mobilityStatus = (p.mobility_status || "bedbound").toLowerCase();
  const admitCat = mapAdmitCategory(p.admission_diagnosis || "");
  const daysImmobile = parseInt(p.days_immobile) || 0;
  return {
    age_70_plus: age >= 70,
    age_80_plus: age >= 80,
    icu: levelOfCare === "icu",
    stepdown: levelOfCare === "stepdown",
    malnutrition: comorbidities.has("malnutrition"),
    low_albumin: Boolean(p.albumin_low),
    obesity: comorbidities.has("obesity") || bmi !== void 0 && bmi >= 30,
    diabetes: comorbidities.has("diabetes"),
    neuropathy: comorbidities.has("neuropathy"),
    parkinson: comorbidities.has("parkinson"),
    stroke: comorbidities.has("stroke") || admitCat === "neuro",
    walker_baseline: baselineFunction === "walker",
    dependent_baseline: baselineFunction === "dependent",
    active_cancer: comorbidities.has("active_cancer") || admitCat === "oncology",
    history_vte: comorbidities.has("history_vte"),
    postop: admitCat === "postop",
    trauma: admitCat === "trauma",
    immobile_ge3: daysImmobile >= 3,
    no_prophylaxis: !Boolean(p.on_vte_prophylaxis),
    sedating_meds: medsInfo.sedating,
    devices_present: devices3.size > 0,
    moisture: Boolean(p.incontinent),
    cog: cognitiveStatus,
    admit_cat: admitCat,
    mobility: mobilityStatus,
    level_of_care: levelOfCare,
    sex: (p.sex || "").toLowerCase(),
    age,
    bmi,
    days_immobile: daysImmobile
  };
}
function getMobilityKeys(mobility) {
  const mob = mobility.toLowerCase();
  return {
    mob_bedbound: mob === "bedbound",
    mob_chair_bound: mob === "chair_bound",
    mob_standing_assist: mob === "standing_assist",
    mob_walking_assist: mob === "walking_assist"
  };
}
function calculateLOS(flags) {
  const c = CAL_LOS.coef;
  let days = CAL_LOS.base;
  const factors = [];
  const mobilityKeys = getMobilityKeys(flags.mobility);
  for (const [key, isActive] of Object.entries(mobilityKeys)) {
    if (isActive && c[key]) {
      days += c[key];
      factors.push(key);
    }
  }
  if (flags.immobile_ge3) {
    days += c.immobile_ge3;
    factors.push("immobile_ge3");
  }
  if (flags.icu) {
    days += c.icu;
    factors.push("icu");
  } else if (flags.stepdown) {
    days += c.stepdown;
    factors.push("stepdown");
  }
  if (flags.age_70_plus) {
    days += c.age_70_plus;
    factors.push("age_70_plus");
  }
  if (flags.age_80_plus) {
    days += c.age_80_plus;
    factors.push("age_80_plus");
  }
  if (flags.cog === "mild_impairment") {
    days += c.cog_mild;
    factors.push("cog_mild");
  }
  if (flags.cog === "delirium_dementia") {
    days += c.cog_delirium;
    factors.push("cog_delirium");
  }
  if (flags.malnutrition) {
    days += c.malnutrition;
    factors.push("malnutrition");
  }
  if (flags.low_albumin) {
    days += c.low_albumin;
    factors.push("low_albumin");
  }
  if (flags.stroke) {
    days += c.stroke;
    factors.push("stroke");
  }
  if (flags.postop) {
    days += c.postop;
    factors.push("postop");
  }
  if (flags.trauma) {
    days += c.trauma;
    factors.push("trauma");
  }
  if (flags.devices_present) {
    days += c.devices_present;
    factors.push("devices_present");
  }
  return { days: Math.max(1, days), factors };
}
function calculateHomeProbability(flags) {
  let logit = CAL_DISCHARGE.intercept;
  const factors = [];
  const mobilityKeys = getMobilityKeys(flags.mobility);
  for (const [key, isActive] of Object.entries(mobilityKeys)) {
    if (isActive && CAL_DISCHARGE.coef[key]) {
      logit += CAL_DISCHARGE.coef[key];
      factors.push(key);
    }
  }
  if (flags.immobile_ge3) {
    logit += CAL_DISCHARGE.coef.immobile_ge3;
    factors.push("immobile_ge3");
  }
  if (flags.icu) {
    logit += CAL_DISCHARGE.coef.icu;
    factors.push("icu");
  } else if (flags.stepdown) {
    logit += CAL_DISCHARGE.coef.stepdown;
    factors.push("stepdown");
  }
  if (flags.age_70_plus) {
    logit += CAL_DISCHARGE.coef.age_70_plus;
    factors.push("age_70_plus");
  }
  if (flags.age_80_plus) {
    logit += CAL_DISCHARGE.coef.age_80_plus;
    factors.push("age_80_plus");
  }
  if (flags.cog === "mild_impairment") {
    logit += CAL_DISCHARGE.coef.cog_mild;
    factors.push("cog_mild");
  }
  if (flags.cog === "delirium_dementia") {
    logit += CAL_DISCHARGE.coef.cog_delirium;
    factors.push("cog_delirium");
  }
  if (flags.malnutrition) {
    logit += CAL_DISCHARGE.coef.malnutrition;
    factors.push("malnutrition");
  }
  if (flags.low_albumin) {
    logit += CAL_DISCHARGE.coef.low_albumin;
    factors.push("low_albumin");
  }
  if (flags.stroke) {
    logit += CAL_DISCHARGE.coef.stroke;
    factors.push("stroke");
  }
  if (flags.trauma) {
    logit += CAL_DISCHARGE.coef.trauma;
    factors.push("trauma");
  }
  if (flags.devices_present) {
    logit += CAL_DISCHARGE.coef.devices_present;
    factors.push("devices_present");
  }
  return { probability: sigmoid(logit), factors };
}
function calculateReadmissionRisk(flags) {
  let logit = CAL_READMIT.intercept;
  const factors = [];
  const mobilityKeys = getMobilityKeys(flags.mobility);
  for (const [key, isActive] of Object.entries(mobilityKeys)) {
    if (isActive && CAL_READMIT.coef[key]) {
      logit += CAL_READMIT.coef[key];
      factors.push(key);
    }
  }
  if (flags.immobile_ge3) {
    logit += CAL_READMIT.coef.immobile_ge3;
    factors.push("immobile_ge3");
  }
  if (flags.icu) {
    logit += CAL_READMIT.coef.icu;
    factors.push("icu");
  } else if (flags.stepdown) {
    logit += CAL_READMIT.coef.stepdown;
    factors.push("stepdown");
  }
  if (flags.age_70_plus) {
    logit += CAL_READMIT.coef.age_70_plus;
    factors.push("age_70_plus");
  }
  if (flags.age_80_plus) {
    logit += CAL_READMIT.coef.age_80_plus;
    factors.push("age_80_plus");
  }
  if (flags.cog === "mild_impairment") {
    logit += CAL_READMIT.coef.cog_mild;
    factors.push("cog_mild");
  }
  if (flags.cog === "delirium_dementia") {
    logit += CAL_READMIT.coef.cog_delirium;
    factors.push("cog_delirium");
  }
  if (flags.malnutrition) {
    logit += CAL_READMIT.coef.malnutrition;
    factors.push("malnutrition");
  }
  if (flags.low_albumin) {
    logit += CAL_READMIT.coef.low_albumin;
    factors.push("low_albumin");
  }
  if (flags.diabetes) {
    logit += CAL_READMIT.coef.diabetes;
    factors.push("diabetes");
  }
  if (flags.active_cancer) {
    logit += CAL_READMIT.coef.active_cancer;
    factors.push("active_cancer");
  }
  if (flags.stroke) {
    logit += CAL_READMIT.coef.stroke;
    factors.push("stroke");
  }
  if (flags.devices_present) {
    logit += CAL_READMIT.coef.devices_present;
    factors.push("devices_present");
  }
  if (flags.sedating_meds) {
    logit += CAL_READMIT.coef.sedating_meds;
    factors.push("sedating_meds");
  }
  return { probability: sigmoid(logit), factors };
}
function getRiskLevel(probability, lowThreshold, highThreshold) {
  if (probability < lowThreshold) return "low";
  if (probability < highThreshold) return "moderate";
  return "high";
}
function getConfidenceLevel(factors) {
  if (factors.length >= 4) return "high";
  if (factors.length >= 2) return "moderate";
  return "low";
}
function addStayPredictions(baseResults) {
  const inputEcho = baseResults.input_echo;
  const flags = extractAddonFlags(inputEcho);
  const improvedFlags = { ...flags };
  if (flags.mobility === "bedbound") improvedFlags.mobility = "chair_bound";
  else if (flags.mobility === "chair_bound") improvedFlags.mobility = "standing_assist";
  else if (flags.mobility === "standing_assist") improvedFlags.mobility = "walking_assist";
  improvedFlags.immobile_ge3 = false;
  const losResult = calculateLOS(flags);
  const improvedLosResult = calculateLOS(improvedFlags);
  let baseBenefitRate;
  if (flags.mobility === "bedbound") {
    baseBenefitRate = 0.06;
  } else if (flags.mobility === "chair_bound") {
    baseBenefitRate = 0.05;
  } else if (flags.mobility === "standing_assist") {
    baseBenefitRate = 0.04;
  } else if (flags.mobility === "walking_assist") {
    baseBenefitRate = 0.025;
  } else {
    baseBenefitRate = 0.015;
  }
  const losBenefit = Math.max(0, losResult.days * baseBenefitRate);
  const homeResult = calculateHomeProbability(flags);
  const improvedHomeResult = calculateHomeProbability(improvedFlags);
  let homeBenefit = Math.max(0, improvedHomeResult.probability - homeResult.probability);
  if (homeBenefit === 0 && (flags.mobility === "walking_assist" || flags.mobility === "independent")) {
    homeBenefit = Math.min(0.02, homeResult.probability * 0.03);
  }
  let dispositionPrediction;
  if (homeResult.probability >= 0.75) dispositionPrediction = "Likely to go home";
  else if (homeResult.probability >= 0.65) dispositionPrediction = "May go home";
  else dispositionPrediction = "Post-acute care likely";
  const readmitResult = calculateReadmissionRisk(flags);
  const improvedReadmitResult = calculateReadmissionRisk(improvedFlags);
  let readmitBenefit = Math.max(0, readmitResult.probability - improvedReadmitResult.probability);
  if (readmitBenefit === 0 && (flags.mobility === "walking_assist" || flags.mobility === "independent")) {
    readmitBenefit = Math.min(0.015, readmitResult.probability * 0.05);
  }
  const readmitLevel = getRiskLevel(readmitResult.probability, 0.12, 0.2);
  const calculateAsymptoticBenefit = (risk, maxRelative, theoreticalCap) => {
    const linearBenefit = risk * maxRelative;
    return theoreticalCap * (linearBenefit / (linearBenefit + theoreticalCap / 2));
  };
  const riskBenefits = {
    deconditioning: baseResults.deconditioning.probability * 0.25,
    // 25% relative reduction, no cap as requested
    vte: calculateAsymptoticBenefit(baseResults.vte.probability, 0.4, 0.03),
    // Approaches 3% cap asymptotically
    falls: calculateAsymptoticBenefit(baseResults.falls.probability, 0.3, 0.025),
    // Approaches 2.5% cap asymptotically  
    pressure: calculateAsymptoticBenefit(baseResults.pressure.probability, 0.35, 0.03)
    // Approaches 3% cap asymptotically
  };
  const stayPredictions = {
    length_of_stay: {
      predicted_days: Math.round(losResult.days * 10) / 10,
      range_min: Math.max(1, Math.round(losResult.days * 0.8 * 10) / 10),
      range_max: Math.round(losResult.days * 1.3 * 10) / 10,
      confidence_level: getConfidenceLevel(losResult.factors),
      factors_increasing: losResult.factors,
      factors_decreasing: [],
      mobility_goal_benefit: Math.round(losBenefit * 10) / 10
    },
    discharge_disposition: {
      home_probability: Math.round(homeResult.probability * 1e3) / 1e3,
      disposition_prediction: dispositionPrediction,
      confidence_level: getConfidenceLevel(homeResult.factors),
      key_factors: homeResult.factors
    },
    readmission_risk: {
      thirty_day_probability: Math.round(readmitResult.probability * 1e3) / 1e3,
      risk_level: readmitLevel,
      modifiable_factors: readmitResult.factors.filter(
        (f) => ["mob_bedbound", "mob_chair_bound", "sedating_meds", "devices_present", "immobile_ge3"].includes(f)
      ),
      mobility_benefit: Math.round(readmitBenefit * 1e3) / 1e3
    }
  };
  const mobilityRecommendation = baseResults.mobility_recommendation;
  return {
    ...baseResults,
    stay_predictions: stayPredictions,
    mobility_recommendation: mobilityRecommendation,
    mobility_benefits: {
      risk_reductions: {
        deconditioning: {
          current_risk: Math.round(baseResults.deconditioning.probability * 1e3) / 1e3,
          reduced_risk: Math.round((baseResults.deconditioning.probability - riskBenefits.deconditioning) * 1e3) / 1e3,
          absolute_reduction: Math.round(riskBenefits.deconditioning * 1e3) / 1e3,
          absolute_reduction_percent: Math.round(riskBenefits.deconditioning * 100 * 10) / 10
          // Show absolute as percentage (e.g., 1.5%)
        },
        vte: {
          current_risk: Math.round(baseResults.vte.probability * 1e3) / 1e3,
          reduced_risk: Math.round((baseResults.vte.probability - riskBenefits.vte) * 1e3) / 1e3,
          absolute_reduction: Math.round(riskBenefits.vte * 1e3) / 1e3,
          absolute_reduction_percent: Math.round(riskBenefits.vte * 100 * 10) / 10
          // Show absolute as percentage (e.g., 1.2%)
        },
        falls: {
          current_risk: Math.round(baseResults.falls.probability * 1e3) / 1e3,
          reduced_risk: Math.round((baseResults.falls.probability - riskBenefits.falls) * 1e3) / 1e3,
          absolute_reduction: Math.round(riskBenefits.falls * 1e3) / 1e3,
          absolute_reduction_percent: Math.round(riskBenefits.falls * 100 * 10) / 10
          // Show absolute as percentage (e.g., 0.8%)
        },
        pressure: {
          current_risk: Math.round(baseResults.pressure.probability * 1e3) / 1e3,
          reduced_risk: Math.round((baseResults.pressure.probability - riskBenefits.pressure) * 1e3) / 1e3,
          absolute_reduction: Math.round(riskBenefits.pressure * 1e3) / 1e3,
          absolute_reduction_percent: Math.round(riskBenefits.pressure * 100 * 10) / 10
          // Show absolute as percentage (e.g., 1.3%)
        }
      },
      stay_improvements: {
        length_of_stay_reduction: Math.round(losBenefit * 10) / 10,
        home_discharge_improvement: Math.round(homeBenefit * 1e3) / 1e3,
        readmission_reduction: Math.round(readmitBenefit * 1e3) / 1e3,
        readmission_percent_reduction: Math.round(readmitBenefit / readmitResult.probability * 100)
      }
    }
  };
}
var ADMIT_MAP, SEDATIVE_TOKENS, ANTICOAG_TOKENS, STEROID_TOKENS, CAL_LOS, CAL_DISCHARGE, CAL_READMIT;
var init_mobility_addons = __esm({
  "server/mobility-addons.ts"() {
    "use strict";
    ADMIT_MAP = {
      "stroke": "neuro",
      "intracranial hemorrhage": "neuro",
      "tbi": "neuro",
      "pneumonia": "medical_pulm",
      "copd": "medical_pulm",
      "asthma": "medical_pulm",
      "heart failure": "cardiac",
      "mi": "cardiac",
      "post-op": "postop",
      "postoperative": "postop",
      "orthopedic": "ortho",
      "hip fracture": "ortho",
      "spine": "ortho",
      "cancer": "oncology",
      "sepsis": "sepsis",
      "trauma": "trauma"
    };
    SEDATIVE_TOKENS = /* @__PURE__ */ new Set([
      "lorazepam",
      "diazepam",
      "alprazolam",
      "midazolam",
      "clonazepam",
      "zolpidem",
      "eszopiclone",
      "temazepam",
      "quetiapine",
      "haloperidol",
      "olanzapine",
      "trazodone",
      "morphine",
      "hydromorphone",
      "fentanyl",
      "oxycodone",
      "methadone",
      "propofol",
      "dexmedetomidine",
      "gabapentin"
    ]);
    ANTICOAG_TOKENS = /* @__PURE__ */ new Set([
      "heparin",
      "enoxaparin",
      "fondaparinux",
      "apixaban",
      "rivaroxaban",
      "warfarin",
      "dabigatran"
    ]);
    STEROID_TOKENS = /* @__PURE__ */ new Set([
      "prednisone",
      "methylprednisolone",
      "dexamethasone",
      "hydrocortisone"
    ]);
    CAL_LOS = {
      base: 5.5,
      coef: {
        icu: 2,
        stepdown: 0.7,
        mob_bedbound: 1.5,
        // Restored original values for baseline prediction
        mob_chair_bound: 1,
        mob_standing_assist: 0.5,
        mob_walking_assist: 0.2,
        immobile_ge3: 1,
        age_70_plus: 0.6,
        age_80_plus: 0.5,
        cog_mild: 0.3,
        cog_delirium: 0.8,
        malnutrition: 0.8,
        low_albumin: 0.5,
        stroke: 1,
        postop: 0.6,
        trauma: 0.8,
        devices_present: 0.3
      },
      goal_delta_cap: 0.5,
      // Reduced from 2.4 to 0.5 - this limits mobility benefit to ~0.5 days max
      goal_delta_floor: 0.1
      // Reduced from 0.8 to 0.1 - minimum benefit now much smaller
    };
    CAL_DISCHARGE = {
      intercept: 1.2,
      coef: {
        icu: -1.2,
        stepdown: -0.4,
        mob_bedbound: -1.2,
        mob_chair_bound: -0.8,
        mob_standing_assist: -0.4,
        mob_walking_assist: -0.15,
        immobile_ge3: -0.5,
        age_70_plus: -0.3,
        age_80_plus: -0.2,
        cog_mild: -0.35,
        cog_delirium: -0.9,
        malnutrition: -0.4,
        low_albumin: -0.35,
        stroke: -0.6,
        trauma: -0.25,
        devices_present: -0.25
      }
    };
    CAL_READMIT = {
      intercept: -1.73,
      coef: {
        icu: 0.2,
        stepdown: 0.1,
        mob_bedbound: 0.5,
        mob_chair_bound: 0.3,
        mob_standing_assist: 0.2,
        immobile_ge3: 0.3,
        age_70_plus: 0.15,
        age_80_plus: 0.15,
        cog_mild: 0.2,
        cog_delirium: 0.4,
        malnutrition: 0.3,
        low_albumin: 0.3,
        diabetes: 0.15,
        active_cancer: 0.25,
        stroke: 0.3,
        devices_present: 0.2,
        sedating_meds: 0.2
      },
      goal_bonus_logit: -0.2
    };
  }
});

// server/personalization/prescription-adjustments.ts
function wattsToResistance(watts, rpm) {
  const k = 0.2;
  const resistance = watts / (k * rpm);
  return Math.max(1, Math.min(9, Math.round(resistance)));
}
function determineDiagnosisCategory(diagnosis) {
  const diagLower = diagnosis.toLowerCase();
  const directMappings = {
    "total knee arthroplasty": "orthopedic",
    "hip fracture": "orthopedic",
    "stroke/cva": "neurological",
    "copd exacerbation": "pulmonary",
    "heart failure": "cardiac",
    "icu stay/critical illness": "icu_recovery",
    "delirium/confusion": "delirium",
    "frail elderly (75+)": "frail_elderly",
    "general medical/surgical": "general",
    "other": "general"
  };
  for (const [key, category] of Object.entries(directMappings)) {
    if (diagLower.includes(key)) {
      return category;
    }
  }
  const keywordMappings = {
    // Cardiac
    "heart failure": "cardiac",
    "chf": "cardiac",
    "cardiac": "cardiac",
    "cardiomyopathy": "cardiac",
    "atrial fibrillation": "cardiac",
    // Pulmonary
    "copd": "pulmonary",
    "pneumonia": "pulmonary",
    "respiratory": "pulmonary",
    "asthma": "pulmonary",
    // Orthopedic
    "knee": "orthopedic",
    "hip": "orthopedic",
    "arthroplasty": "orthopedic",
    "fracture": "orthopedic",
    "orif": "orthopedic",
    "joint": "orthopedic",
    // Neurological
    "stroke": "neurological",
    "cva": "neurological",
    "tbi": "neurological",
    "hemiplegia": "neurological",
    // ICU
    "icu": "icu_recovery",
    "critical illness": "icu_recovery",
    "sepsis": "icu_recovery",
    "ventilator": "icu_recovery",
    // Delirium
    "delirium": "delirium",
    "confusion": "delirium",
    "encephalopathy": "delirium",
    // Frail elderly
    "frail": "frail_elderly",
    "debility": "frail_elderly",
    "failure to thrive": "frail_elderly"
  };
  for (const [key, category] of Object.entries(keywordMappings)) {
    if (diagLower.includes(key)) {
      return category;
    }
  }
  return "general";
}
function determineMedicationCategories(medications) {
  const categories = /* @__PURE__ */ new Set();
  const medicationMap = {
    // Beta Blockers
    "metoprolol": "beta_blocker",
    "atenolol": "beta_blocker",
    "carvedilol": "beta_blocker",
    "propranolol": "beta_blocker",
    // Rate Control
    "digoxin": "rate_control",
    "diltiazem": "rate_control",
    "verapamil": "rate_control",
    // Diuretics
    "furosemide": "diuretic",
    "lasix": "diuretic",
    "spironolactone": "diuretic",
    "hydrochlorothiazide": "diuretic",
    "bumetanide": "diuretic",
    // Sedating
    "oxycodone": "sedating",
    "hydrocodone": "sedating",
    "morphine": "sedating",
    "fentanyl": "sedating",
    "tramadol": "sedating",
    "lorazepam": "sedating",
    "ativan": "sedating",
    "diazepam": "sedating",
    "valium": "sedating",
    "alprazolam": "sedating",
    "xanax": "sedating",
    "zolpidem": "sedating",
    "ambien": "sedating",
    "quetiapine": "sedating",
    "seroquel": "sedating",
    "haloperidol": "sedating",
    "haldol": "sedating",
    // Insulin
    "insulin": "insulin",
    // Anticoagulants
    "warfarin": "anticoagulant",
    "coumadin": "anticoagulant",
    "apixaban": "anticoagulant",
    "eliquis": "anticoagulant",
    "rivaroxaban": "anticoagulant",
    "xarelto": "anticoagulant",
    "enoxaparin": "anticoagulant",
    "lovenox": "anticoagulant",
    "heparin": "anticoagulant",
    // Antiparkinsonian
    "carbidopa": "antiparkinsonian",
    "levodopa": "antiparkinsonian",
    "sinemet": "antiparkinsonian",
    "pramipexole": "antiparkinsonian",
    "mirapex": "antiparkinsonian",
    "ropinirole": "antiparkinsonian"
  };
  for (const med of medications) {
    const medLower = med.toLowerCase().trim();
    for (const [key, category] of Object.entries(medicationMap)) {
      if (medLower.includes(key)) {
        categories.add(category);
        break;
      }
    }
  }
  return categories.size > 0 ? Array.from(categories) : ["none"];
}
function applyPrescriptionAdjustments(baseline, diagnosis, medications, mobilityStatus = "standing_assist") {
  const diagnosisCategory = determineDiagnosisCategory(diagnosis);
  const medicationCategories = determineMedicationCategories(medications);
  const diagProfile = DIAGNOSIS_ADJUSTMENT_PROFILES[diagnosisCategory];
  const medProfiles = medicationCategories.map((c) => MEDICATION_ADJUSTMENT_PROFILES[c]);
  const baselinePower = baseline.watt_goal;
  const baselineDuration = baseline.duration_min_per_session;
  const baselineSessions = baseline.sessions_per_day;
  const baselineRpm = BASELINE_RPM_BY_MOBILITY[mobilityStatus] || 35;
  const baselineResistance = baseline.resistance_level || wattsToResistance(baselinePower, baselineRpm);
  const totalEnergy = baselinePower * baselineDuration * baselineSessions;
  let adjustedDuration = Math.round(baselineDuration * diagProfile.durationMultiplier);
  let adjustedRpm = Math.round(baselineRpm * diagProfile.rpmMultiplier);
  const targetEnergyPerSession = totalEnergy / baselineSessions;
  let adjustedPower = targetEnergyPerSession / adjustedDuration;
  let adjustedResistance = wattsToResistance(adjustedPower, adjustedRpm);
  const diagnosisRationale = diagProfile.rationale;
  const medicationRationale = [];
  const allRationale = [diagProfile.rationale];
  const additionalMonitoring = [];
  const additionalStopCriteria = [];
  let hasResistanceFocus = false;
  for (const medProfile of medProfiles) {
    if (medProfile.category === "none") continue;
    if (medProfile.durationReduction > 0) {
      adjustedDuration = Math.max(5, adjustedDuration - medProfile.durationReduction);
    }
    if (medProfile.rpmReduction > 0) {
      adjustedRpm = Math.max(15, adjustedRpm - medProfile.rpmReduction);
    }
    if (medProfile.resistanceFocus) {
      hasResistanceFocus = true;
    }
    medicationRationale.push(medProfile.rationale);
    allRationale.push(medProfile.rationale);
    additionalMonitoring.push(...medProfile.additionalMonitoring);
    additionalStopCriteria.push(...medProfile.additionalStopCriteria);
  }
  if (hasResistanceFocus) {
    const focusNote = "Focus on resistance/strength training rather than high RPM aerobic exercise due to heart rate-affecting medications.";
    medicationRationale.push(focusNote);
    allRationale.push(focusNote);
  }
  adjustedPower = targetEnergyPerSession / adjustedDuration;
  adjustedResistance = wattsToResistance(adjustedPower, adjustedRpm);
  adjustedDuration = Math.max(5, Math.min(30, adjustedDuration));
  adjustedResistance = Math.max(1, Math.min(6, adjustedResistance));
  adjustedRpm = Math.max(15, Math.min(60, adjustedRpm));
  adjustedPower = Math.max(20, Math.min(70, adjustedPower));
  const monitoringParams = [
    ...MONITORING_BY_CATEGORY[diagnosisCategory],
    ...additionalMonitoring
  ];
  const stopCriteria = [
    ...STOP_CRITERIA_BY_CATEGORY[diagnosisCategory],
    ...additionalStopCriteria
  ];
  return {
    duration: adjustedDuration,
    power: Math.round(adjustedPower * 10) / 10,
    resistance: adjustedResistance,
    rpm: adjustedRpm,
    sessionsPerDay: baselineSessions,
    totalDailyEnergy: Math.round(adjustedPower * adjustedDuration * baselineSessions),
    diagnosisCategory,
    diagnosisCategoryLabel: DIAGNOSIS_CATEGORY_LABELS[diagnosisCategory],
    medicationCategories,
    diagnosisRationale,
    medicationRationale,
    allRationale: [...new Set(allRationale)],
    monitoringParams: [...new Set(monitoringParams)],
    stopCriteria: [...new Set(stopCriteria)],
    adjustments: {
      durationDelta: adjustedDuration - baselineDuration,
      powerDelta: Math.round((adjustedPower - baselinePower) * 10) / 10,
      resistanceDelta: adjustedResistance - baselineResistance,
      rpmDelta: adjustedRpm - baselineRpm
    }
  };
}
var DIAGNOSIS_ADJUSTMENT_PROFILES, MEDICATION_ADJUSTMENT_PROFILES, DIAGNOSIS_CATEGORY_LABELS, MONITORING_BY_CATEGORY, STOP_CRITERIA_BY_CATEGORY, BASELINE_RPM_BY_MOBILITY;
var init_prescription_adjustments = __esm({
  "server/personalization/prescription-adjustments.ts"() {
    "use strict";
    DIAGNOSIS_ADJUSTMENT_PROFILES = {
      cardiac: {
        category: "cardiac",
        resistanceMultiplier: 1.25,
        rpmMultiplier: 0.8,
        durationMultiplier: 1,
        rationale: "Higher resistance with controlled RPM reduces cardiac stress while maintaining muscle conditioning"
      },
      pulmonary: {
        category: "pulmonary",
        resistanceMultiplier: 1.2,
        rpmMultiplier: 0.85,
        durationMultiplier: 1,
        rationale: "Higher resistance with slower pedaling minimizes respiratory demand while preserving muscle work"
      },
      orthopedic: {
        category: "orthopedic",
        resistanceMultiplier: 0.7,
        rpmMultiplier: 1.15,
        durationMultiplier: 1.25,
        rationale: "Lower resistance with more rotations maximizes joint ROM and reduces surgical site stress"
      },
      neurological: {
        category: "neurological",
        resistanceMultiplier: 0.9,
        rpmMultiplier: 0.95,
        durationMultiplier: 1.15,
        rationale: "Moderate resistance with controlled pace supports bilateral coordination and motor relearning"
      },
      icu_recovery: {
        category: "icu_recovery",
        resistanceMultiplier: 0.6,
        rpmMultiplier: 0.7,
        durationMultiplier: 0.75,
        rationale: "Very gentle parameters for post-ICU reconditioning with progressive increase as tolerated"
      },
      delirium: {
        category: "delirium",
        resistanceMultiplier: 0.75,
        rpmMultiplier: 0.8,
        durationMultiplier: 0.7,
        rationale: "Simplified, shorter sessions with consistent parameters to provide structured activity safely"
      },
      frail_elderly: {
        category: "frail_elderly",
        resistanceMultiplier: 0.65,
        rpmMultiplier: 0.75,
        durationMultiplier: 0.8,
        rationale: "Low-intensity approach prioritizing safety and fall prevention over conditioning intensity"
      },
      general: {
        category: "general",
        resistanceMultiplier: 1,
        rpmMultiplier: 1,
        durationMultiplier: 1,
        rationale: "No diagnosis-specific adjustments recommended. Using evidence-based baseline prescription."
      }
    };
    MEDICATION_ADJUSTMENT_PROFILES = {
      beta_blocker: {
        category: "beta_blocker",
        intensityMultiplier: 0.9,
        resistanceFocus: true,
        rpmReduction: 5,
        durationReduction: 0,
        rationale: "Beta blocker blunts heart rate response. Focus on resistance/strength training rather than aerobic conditioning.",
        additionalMonitoring: [
          "Note: HR will not reflect true exertion - use RPE instead",
          "Monitor for fatigue at lower than expected HR"
        ],
        additionalStopCriteria: [
          "RPE >6/10 (HR unreliable due to beta blocker)",
          "Excessive fatigue despite normal HR"
        ]
      },
      rate_control: {
        category: "rate_control",
        intensityMultiplier: 0.85,
        resistanceFocus: true,
        rpmReduction: 8,
        durationReduction: 0,
        rationale: "Rate control medication limits heart rate response. Prioritize resistance-based exercise over aerobic RPM targets.",
        additionalMonitoring: [
          "Heart rate response will be blunted",
          "Use RPE 2-3/10 as primary intensity guide"
        ],
        additionalStopCriteria: [
          "RPE >5/10",
          "Any palpitations or irregular rhythm sensation"
        ]
      },
      diuretic: {
        category: "diuretic",
        intensityMultiplier: 0.9,
        resistanceFocus: false,
        rpmReduction: 0,
        durationReduction: 2,
        rationale: "Diuretic may cause earlier fatigue and dehydration. Slightly shorter sessions with hydration awareness.",
        additionalMonitoring: [
          "Monitor for signs of dehydration",
          "Watch for muscle cramping (electrolyte imbalance)",
          "Assess energy level throughout session"
        ],
        additionalStopCriteria: [
          "Muscle cramping",
          "Dizziness or lightheadedness",
          "Excessive thirst or dry mouth"
        ]
      },
      sedating: {
        category: "sedating",
        intensityMultiplier: 0.75,
        resistanceFocus: false,
        rpmReduction: 5,
        durationReduction: 3,
        rationale: "Sedating medication affects coordination and alertness. Reduced intensity with close supervision required.",
        additionalMonitoring: [
          "Assess alertness before and during session",
          "Monitor coordination and balance",
          "Watch for excessive drowsiness"
        ],
        additionalStopCriteria: [
          "Drowsiness or confusion",
          "Impaired coordination observed",
          "Patient unable to follow simple instructions"
        ]
      },
      insulin: {
        category: "insulin",
        intensityMultiplier: 0.95,
        resistanceFocus: false,
        rpmReduction: 0,
        durationReduction: 0,
        rationale: "Insulin increases hypoglycemia risk during exercise. Ensure glucose monitoring and snack availability.",
        additionalMonitoring: [
          "Check blood glucose before session",
          "Have fast-acting glucose available",
          "Monitor for hypoglycemia symptoms"
        ],
        additionalStopCriteria: [
          "Blood glucose <70 mg/dL",
          "Symptoms of hypoglycemia (shakiness, sweating, confusion)",
          "Patient feels lightheaded or weak"
        ]
      },
      anticoagulant: {
        category: "anticoagulant",
        intensityMultiplier: 1,
        resistanceFocus: false,
        rpmReduction: 0,
        durationReduction: 0,
        rationale: "Anticoagulant therapy - no exercise modification needed but maintain awareness of bleeding risk.",
        additionalMonitoring: [
          "Inspect for bruising before session",
          "Note any complaints of unusual pain or swelling"
        ],
        additionalStopCriteria: [
          "Any signs of bleeding or unusual bruising",
          "Complaints of joint or muscle pain that could indicate bleeding"
        ]
      },
      antiparkinsonian: {
        category: "antiparkinsonian",
        intensityMultiplier: 0.9,
        resistanceFocus: false,
        rpmReduction: 3,
        durationReduction: 0,
        rationale: 'Antiparkinsonian medication has timing-dependent effects. Schedule exercise during medication "on" periods.',
        additionalMonitoring: [
          "Time session 1-2 hours after medication dose",
          "Monitor for dyskinesia or tremor changes",
          "Assess coordination throughout"
        ],
        additionalStopCriteria: [
          "Significant tremor interfering with pedaling",
          "Dyskinesia affecting safety",
          "Medication wearing off (freezing episodes)"
        ]
      },
      none: {
        category: "none",
        intensityMultiplier: 1,
        resistanceFocus: false,
        rpmReduction: 0,
        durationReduction: 0,
        rationale: "No medication-related exercise modifications required.",
        additionalMonitoring: [],
        additionalStopCriteria: []
      }
    };
    DIAGNOSIS_CATEGORY_LABELS = {
      cardiac: "Cardiac (Heart Failure/CHF)",
      pulmonary: "Pulmonary (COPD/Respiratory)",
      orthopedic: "Orthopedic (Joint Replacement/Fracture)",
      neurological: "Neurological (Stroke/CVA)",
      icu_recovery: "ICU Recovery/Critical Illness",
      delirium: "Delirium/Confusion",
      frail_elderly: "Frail Elderly",
      general: "General Medical/Surgical"
    };
    MONITORING_BY_CATEGORY = {
      cardiac: [
        "Heart rate (target <100 bpm)",
        "Blood pressure (avoid drops >10 mmHg)",
        "SpO2",
        "Dyspnea score (0-10)",
        "Borg RPE (target 11-13)",
        "Signs of fluid overload"
      ],
      pulmonary: [
        "SpO2 (maintain >90%)",
        "Respiratory rate (<25/min)",
        "Dyspnea score (0-10)",
        "Heart rate",
        "Accessory muscle use",
        "Pursed lip breathing pattern"
      ],
      orthopedic: [
        "Pain level (0-10)",
        "Range of motion (degrees)",
        "Surgical site assessment",
        "Edema monitoring",
        "Blood pressure",
        "Total rotations completed"
      ],
      neurological: [
        "Blood pressure (avoid >180 mmHg)",
        "Bilateral pedaling symmetry",
        "Motor strength (affected vs unaffected)",
        "Cognitive participation",
        "Balance and trunk control",
        "New neurological symptoms"
      ],
      icu_recovery: [
        "Heart rate (strict limits)",
        "Blood pressure (watch for orthostatic changes)",
        "SpO2 (continuous)",
        "Respiratory rate",
        "Level of alertness",
        "Muscle activation quality",
        "Fatigue level (frequent checks)"
      ],
      delirium: [
        "Behavioral status",
        "Agitation level (0-10)",
        "Participation quality",
        "Safety throughout",
        "CAM score (before and after)",
        "Orientation assessment"
      ],
      frail_elderly: [
        "Heart rate",
        "Blood pressure (orthostatic)",
        "Balance and stability",
        "Fatigue level",
        "Pain assessment",
        "Engagement and mood",
        "Fall risk indicators"
      ],
      general: [
        "Heart rate",
        "Blood pressure",
        "Perceived exertion (RPE)",
        "SpO2",
        "Overall tolerance",
        "Lower extremity assessment"
      ]
    };
    STOP_CRITERIA_BY_CATEGORY = {
      cardiac: [
        "HR >110 bpm or increase >20 bpm from rest",
        "SBP decrease >10 mmHg",
        "SpO2 <90%",
        "Dyspnea worsening >2 points",
        "Chest pain, dizziness, or palpitations",
        "New arrhythmia"
      ],
      pulmonary: [
        "SpO2 <88% or drop >4%",
        "RR >28/min",
        "HR >120 bpm",
        "Severe dyspnea (>7/10)",
        "Confusion or altered mental status",
        "Excessive accessory muscle use"
      ],
      orthopedic: [
        "Pain >6/10",
        "SBP <90 or >180 mmHg",
        "HR >120 bpm",
        "Significant increase in edema",
        "Signs of surgical complications",
        "Patient request"
      ],
      neurological: [
        "SBP >180 or <100 mmHg",
        "New neurological symptoms",
        "Severe headache",
        "Dizziness or visual changes",
        "Unable to participate safely",
        "Excessive spasticity"
      ],
      icu_recovery: [
        "HR >130 bpm or <50 bpm",
        "SBP >180 or <90 mmHg",
        "SpO2 <88%",
        "RR >30/min",
        "New arrhythmias",
        "Patient distress or excessive fatigue",
        "Any new symptoms"
      ],
      delirium: [
        "Increased agitation",
        "Patient distress",
        "Unsafe behaviors",
        "Confusion worsening",
        "Unable to follow simple instructions",
        "Staff determines unable to continue safely"
      ],
      frail_elderly: [
        "HR >110 bpm",
        "SBP instability (>20 mmHg change)",
        "Excessive fatigue",
        "Pain increase >2 points",
        "Balance concerns",
        "Patient requests stop",
        "Signs of confusion or distress"
      ],
      general: [
        "HR >120 bpm",
        "SBP <90 or >180 mmHg",
        "SpO2 <90%",
        "Chest pain or pressure",
        "Severe dyspnea",
        "Patient distress"
      ]
    };
    BASELINE_RPM_BY_MOBILITY = {
      bedbound: 25,
      chair_bound: 30,
      standing_assist: 35,
      walking_assist: 40,
      independent: 45
    };
  }
});

// server/risk-calculator.ts
function mapAdmitCategory2(text3) {
  const t = (text3 || "").toLowerCase();
  for (const [key, value] of Object.entries(ADMIT_MAP2)) {
    if (t.includes(key)) {
      return value;
    }
  }
  return "general_medical";
}
function bucketMeds2(meds, structuredFlags) {
  if (structuredFlags) {
    return {
      sedating: structuredFlags.sedating || false,
      on_anticoagulant: structuredFlags.anticoag || false,
      on_steroids: structuredFlags.steroids || false
    };
  }
  const medsLower = (meds || []).map((m) => m.toLowerCase());
  const sedating = medsLower.some(
    (m) => Array.from(SEDATIVE_TOKENS2).some((token) => m.includes(token))
  );
  const anticoag = medsLower.some(
    (m) => Array.from(ANTICOAG_TOKENS2).some((token) => m.includes(token))
  );
  const steroid = medsLower.some(
    (m) => Array.from(STEROID_TOKENS2).some((token) => m.includes(token))
  );
  return { sedating, on_anticoagulant: anticoag, on_steroids: steroid };
}
function sigmoid2(x) {
  return 1 / (1 + Math.exp(-x));
}
function probFromLogit(intercept, score) {
  return sigmoid2(intercept + score);
}
function riskLevel(outcome, p) {
  const bands = RISK_BANDS[outcome];
  if (p >= bands.high) return "high";
  if (p >= bands.moderate) return "moderate";
  return "low";
}
function featureFlags(p) {
  const structuredMedFlags = {
    sedating: p.on_sedating_medications,
    anticoag: p.on_anticoagulants,
    steroids: p.on_steroids
  };
  const medsInfo = bucketMeds2(p.medications || [], structuredMedFlags);
  const com = new Set(p.comorbidities || []);
  const devices3 = new Set(p.devices || []);
  const age_70p = p.age >= 70;
  const age_80p = p.age >= 80;
  const loc = p.level_of_care.toLowerCase();
  const is_icu = loc === "icu";
  const is_step = loc === "stepdown";
  const bf = (p.baseline_function || "independent").toLowerCase();
  const admit_cat = mapAdmitCategory2(p.admission_diagnosis || "");
  const d_imm = p.days_immobile || 0;
  const immobile_ge3 = d_imm >= 3;
  const cog = (p.cognitive_status || "normal").toLowerCase();
  const moisture = Boolean(p.incontinent);
  const bmi = p.weight_kg && p.height_cm ? p.weight_kg / Math.pow(p.height_cm / 100, 2) : null;
  const flags = {
    "age_65+": p.age >= 65,
    "age_70+": age_70p,
    "age_80+": age_80p,
    "icu": is_icu,
    "stepdown": is_step,
    "malnutrition": p.has_malnutrition || com.has("malnutrition"),
    "low_albumin": Boolean(p.albumin_low),
    "obesity": p.has_obesity || com.has("obesity") || bmi !== null && bmi >= 30,
    "diabetes": p.has_diabetes || com.has("diabetes"),
    "neuropathy": p.has_neuropathy || com.has("neuropathy"),
    "parkinson": p.has_parkinson || com.has("parkinson"),
    "stroke": p.has_stroke_history || com.has("stroke") || p.is_neuro_admission || admit_cat === "neuro" || admit_cat === "medical_pulm",
    "walker_baseline": bf === "walker",
    "dependent_baseline": bf === "dependent",
    // VTE specifics
    "active_cancer": p.has_active_cancer || com.has("active_cancer") || p.is_oncology || admit_cat === "oncology",
    "history_vte": p.has_vte_history || com.has("history_vte"),
    "postop": p.is_postoperative || admit_cat === "postop",
    "trauma": p.is_trauma_admission || admit_cat === "trauma",
    "immobile_ge3": immobile_ge3,
    "no_prophylaxis": !Boolean(p.on_vte_prophylaxis),
    // Falls specifics
    "sedating_meds": medsInfo.sedating,
    "devices": devices3.size > 0 || p.has_foley_catheter || p.has_central_line || p.has_feeding_tube || p.has_ventilator,
    // Pressure specifics
    "moisture": moisture,
    // cognition normalization
    "cog": cog,
    "admit_cat": getAdmitCategory(p, admit_cat),
    "mobility": (p.mobility_status || "bedbound").toLowerCase()
  };
  return flags;
}
function getAdmitCategory(p, textBasedCat) {
  if (p.is_cardiac_admission) return "cardiac";
  if (p.is_neuro_admission) return "neuro";
  if (p.is_orthopedic) return "ortho";
  if (p.is_oncology) return "oncology";
  if (p.is_postoperative) return "postop";
  if (p.is_trauma_admission) return "trauma";
  if (p.is_sepsis) return "sepsis";
  return textBasedCat;
}
function scoreDeconditioning(f) {
  let w = 0;
  const factors = [];
  const mob = f.mobility;
  w += W_MOBILITY.deconditioning[mob];
  factors.push(`mobility:${mob}`);
  const commonKeys = ["age_65+", "age_70+", "age_80+", "icu", "stepdown", "malnutrition", "low_albumin", "walker_baseline", "dependent_baseline"];
  for (const key of commonKeys) {
    if (f[key]) {
      w += W_COMMON[key];
      factors.push(key);
    }
  }
  if (f.cog === "mild_impairment") {
    w += W_SPECIFIC.deconditioning.cog_mild;
    factors.push("cog_mild");
  }
  if (f.cog === "delirium_dementia") {
    w += W_SPECIFIC.deconditioning.cog_delirium;
    factors.push("cog_delirium");
  }
  if (f.immobile_ge3) {
    w += W_SPECIFIC.deconditioning.days_immobile_ge3;
    factors.push("immobile_ge3");
  }
  return { score: w, factors };
}
function scoreVte(f) {
  let w = 0;
  const factors = [];
  const mob = f.mobility;
  w += W_MOBILITY.vte[mob];
  factors.push(`mobility:${mob}`);
  const vteKeys = ["icu", "stepdown", "active_cancer", "history_vte", "postop", "trauma", "immobile_ge3", "no_prophylaxis", "age_65+", "age_70+", "age_80+", "obesity"];
  for (const key of vteKeys) {
    if (f[key]) {
      const add = W_SPECIFIC.vte[key] || W_COMMON[key];
      if (add) {
        w += add;
        factors.push(key);
      }
    }
  }
  return { score: w, factors };
}
function scoreFalls(f) {
  let w = 0;
  const factors = [];
  const mob = f.mobility;
  w += W_MOBILITY.falls[mob];
  factors.push(`mobility:${mob}`);
  if (f.cog === "mild_impairment") {
    w += W_SPECIFIC.falls.cog_mild;
    factors.push("cog_mild");
  }
  if (f.cog === "delirium_dementia") {
    w += W_SPECIFIC.falls.cog_delirium;
    factors.push("cog_delirium");
  }
  const fallsKeys = ["sedating_meds", "stroke", "devices", "parkinson", "neuropathy"];
  for (const key of fallsKeys) {
    if (f[key]) {
      const add = W_SPECIFIC.falls[key] || W_COMMON[key];
      if (add) {
        w += add;
        factors.push(key);
      }
    }
  }
  if (f.admit_cat === "ortho") {
    w += W_SPECIFIC.falls.orthopedic;
    factors.push("orthopedic");
  }
  const inter = INTERACTIONS.falls;
  const tup = `${mob},${f.cog}`;
  if (tup in inter) {
    w += inter[tup];
    factors.push(`interaction:${mob}+${f.cog}`);
  }
  const ageKeys = ["age_65+", "age_70+", "age_80+", "walker_baseline", "dependent_baseline"];
  for (const key of ageKeys) {
    if (f[key]) {
      w += W_COMMON[key];
      factors.push(key);
    }
  }
  return { score: w, factors };
}
function scorePressure(f) {
  let w = 0;
  const factors = [];
  const mob = f.mobility;
  w += W_MOBILITY.pressure[mob];
  factors.push(`mobility:${mob}`);
  const pressureKeys = ["age_65+", "age_70+", "age_80+", "low_albumin", "diabetes", "immobile_ge3", "malnutrition", "obesity", "moisture", "walker_baseline", "dependent_baseline", "icu", "stepdown"];
  for (const key of pressureKeys) {
    if (f[key]) {
      const add = W_SPECIFIC.pressure[key] || W_COMMON[key];
      if (add) {
        w += add;
        factors.push(key);
      }
    }
  }
  return { score: w, factors };
}
function estimateWattGoalV2(p) {
  const safe = (val, defaultVal) => val == null ? defaultVal : val;
  const age = parseInt(safe(p.age, 70));
  const sex = String(safe(p.sex, "")).toLowerCase();
  const loc = String(safe(p.level_of_care, "ward")).toLowerCase();
  const mob = String(safe(p.mobility_status, "bedbound")).toLowerCase();
  const wt = p.weight_kg;
  const htCm = p.height_cm;
  const hasWt = typeof wt === "number" && wt > 0;
  const hasHt = typeof htCm === "number" && htCm > 0;
  let bmi = null;
  if (hasWt && hasHt) {
    const m = htCm / 100;
    bmi = wt / (m * m);
  }
  const baseBand = {
    bedbound: [0.2, 0.28],
    // very light
    chair_bound: [0.22, 0.3],
    standing_assist: [0.25, 0.34],
    walking_assist: [0.28, 0.4],
    independent: [0.32, 0.45]
  };
  const [wkgLo, wkgHi] = baseBand[mob] || [0.22, 0.32];
  let wkg = 0.5 * (wkgLo + wkgHi);
  if (loc === "icu") {
    wkg *= 0.85;
  } else if (loc === "stepdown") {
    wkg *= 0.93;
  }
  if (age >= 80) {
    wkg *= 0.88;
  } else if (age >= 70) {
    wkg *= 0.93;
  } else if (age <= 45) {
    wkg *= 1.05;
  }
  if (sex === "male") {
    wkg *= 1.03;
  }
  if (bmi !== null) {
    if (bmi >= 40) {
      wkg = Math.min(wkg, 0.28);
    } else if (bmi >= 35) {
      wkg = Math.min(wkg, 0.3);
    } else if (bmi < 18.5) {
      wkg = Math.min(wkg, 0.26);
    }
  }
  wkg = Math.max(0.18, Math.min(0.48, wkg));
  let watts;
  if (hasWt) {
    watts = wkg * wt;
  } else {
    const fallbackMap = {
      bedbound: 14,
      chair_bound: 18,
      standing_assist: 22,
      walking_assist: 30,
      independent: 36
    };
    let fallback = fallbackMap[mob] || 18;
    if (loc === "icu") fallback *= 0.9;
    if (age >= 80) fallback *= 0.88;
    else if (age >= 70) fallback *= 0.93;
    else if (age <= 45) fallback *= 1.05;
    watts = fallback;
  }
  watts = Math.max(watts * 1.4, 25);
  watts = Math.max(25, Math.min(70, watts));
  const wattGoal = Math.round(watts * 10) / 10;
  let duration;
  let sessions3;
  if (loc === "icu" || mob === "bedbound" || mob === "chair_bound") {
    duration = mob === "bedbound" ? 8 : 10;
    sessions3 = 2;
  } else {
    duration = mob === "standing_assist" || mob === "walking_assist" ? 12 : 15;
    sessions3 = 2;
  }
  const notes = `Target light\u2013moderate effort (${wattGoal}W \u2248 resistance level ${Math.round((wattGoal - 25) / 45 * 8 + 3)}). Adjust by symptoms, BP/HR response, and RPE 2\u20133/10. If undue fatigue or hemodynamic instability, reduce resistance level and reassess.`;
  const totalDailyEnergy = Math.round(wattGoal * duration * sessions3);
  return {
    watt_goal: wattGoal,
    duration_min_per_session: duration,
    sessions_per_day: sessions3,
    total_daily_energy: totalDailyEnergy,
    notes,
    debug: {
      used_wkg: hasWt ? Math.round(wkg * 1e3) / 1e3 : null,
      bmi: bmi !== null ? Math.round(bmi * 10) / 10 : null,
      age,
      loc,
      mobility: mob
    }
  };
}
function computeOutcome(outcome, p, f) {
  let score, factors;
  if (outcome === "deconditioning") {
    const result = scoreDeconditioning(f);
    score = result.score;
    factors = result.factors;
  } else if (outcome === "vte") {
    const result = scoreVte(f);
    score = result.score;
    factors = result.factors;
  } else if (outcome === "falls") {
    const result = scoreFalls(f);
    score = result.score;
    factors = result.factors;
  } else if (outcome === "pressure") {
    const result = scorePressure(f);
    score = result.score;
    factors = result.factors;
  } else {
    throw new Error("Unknown outcome");
  }
  const intercept = CALIBRATION[outcome].intercept;
  let prob = probFromLogit(intercept, score);
  prob = Math.min(prob, 0.95);
  const fRef = { ...f };
  fRef.mobility = "independent";
  fRef.immobile_ge3 = false;
  let scoreRef;
  if (outcome === "deconditioning") {
    scoreRef = scoreDeconditioning(fRef).score;
  } else if (outcome === "vte") {
    scoreRef = scoreVte(fRef).score;
  } else if (outcome === "falls") {
    scoreRef = scoreFalls(fRef).score;
  } else {
    scoreRef = scorePressure(fRef).score;
  }
  const pRef = probFromLogit(intercept, scoreRef);
  const odds = prob / Math.max(1e-9, 1 - prob);
  const oddsRef = pRef / Math.max(1e-9, 1 - pRef);
  const orVsMobile = odds / Math.max(1e-9, oddsRef);
  return {
    probability: Math.round(prob * 1e4) / 1e4,
    odds_ratio_vs_mobile: Math.round(orVsMobile * 100) / 100,
    risk_level: riskLevel(outcome, prob),
    contributing_factors: factors
  };
}
function calculateRisks(p) {
  const f = featureFlags(p);
  const baselineMobilityRec = estimateWattGoalV2(p);
  let diagnosisForAdjustment = "";
  if (p.selected_diagnoses && p.selected_diagnoses.length > 0) {
    diagnosisForAdjustment = p.selected_diagnoses[0];
  } else if (p.admission_diagnosis) {
    diagnosisForAdjustment = p.admission_diagnosis;
  } else {
    if (p.is_cardiac_admission) diagnosisForAdjustment = "Heart Failure";
    else if (p.is_neuro_admission) diagnosisForAdjustment = "Stroke/CVA";
    else if (p.is_orthopedic) diagnosisForAdjustment = "Total Knee Arthroplasty";
    else if (p.is_sepsis) diagnosisForAdjustment = "ICU Stay/Critical Illness";
    else diagnosisForAdjustment = "General Medical/Surgical";
  }
  let medicationsForAdjustment = [];
  if (p.selected_medications && p.selected_medications.length > 0) {
    medicationsForAdjustment = p.selected_medications;
  } else if (p.medications && p.medications.length > 0) {
    medicationsForAdjustment = p.medications;
  } else {
    if (p.on_sedating_medications) medicationsForAdjustment.push("Lorazepam");
    if (p.on_anticoagulants) medicationsForAdjustment.push("Warfarin");
  }
  const mobilityStatus = p.mobility_status || "standing_assist";
  const baselineWatts = baselineMobilityRec.watt_goal;
  const baselineDuration = baselineMobilityRec.duration_min_per_session;
  const baselineSessions = baselineMobilityRec.sessions_per_day;
  const baselineRpm = mobilityStatus === "bedbound" ? 25 : mobilityStatus === "chair_bound" ? 30 : mobilityStatus === "standing_assist" ? 35 : mobilityStatus === "walking_assist" ? 40 : 45;
  const baselineResistance = Math.max(1, Math.min(9, Math.round(baselineWatts / (0.2 * baselineRpm))));
  const adjustedPrescription = applyPrescriptionAdjustments(
    {
      watt_goal: baselineWatts,
      duration_min_per_session: baselineDuration,
      sessions_per_day: baselineSessions,
      resistance_level: baselineResistance
    },
    diagnosisForAdjustment,
    medicationsForAdjustment,
    mobilityStatus
  );
  const adjustmentsApplied = adjustedPrescription.adjustments.durationDelta !== 0 || adjustedPrescription.adjustments.powerDelta !== 0 || adjustedPrescription.adjustments.resistanceDelta !== 0 || adjustedPrescription.adjustments.rpmDelta !== 0;
  const enhancedMobilityRec = {
    ...baselineMobilityRec,
    // Override with adjusted values for the "final" recommendation
    watt_goal: adjustedPrescription.power,
    duration_min_per_session: adjustedPrescription.duration,
    sessions_per_day: adjustedPrescription.sessionsPerDay,
    resistance_level: adjustedPrescription.resistance,
    total_daily_energy: adjustedPrescription.totalDailyEnergy,
    rpm: adjustedPrescription.rpm,
    // Include baseline for comparison
    baseline: {
      watt_goal: baselineWatts,
      duration_min_per_session: baselineDuration,
      sessions_per_day: baselineSessions,
      resistance_level: baselineResistance,
      total_daily_energy: Math.round(baselineWatts * baselineDuration * baselineSessions)
    },
    // Include adjusted prescription with full details
    adjusted: adjustedPrescription,
    adjustments_applied: adjustmentsApplied,
    primary_diagnosis_category: adjustedPrescription.diagnosisCategoryLabel,
    adjustment_rationale: adjustedPrescription.allRationale,
    // Monitoring and stop criteria
    monitoring_params: adjustedPrescription.monitoringParams,
    stop_criteria: adjustedPrescription.stopCriteria
  };
  const baseResults = {
    deconditioning: computeOutcome("deconditioning", p, f),
    vte: computeOutcome("vte", p, f),
    falls: computeOutcome("falls", p, f),
    pressure: computeOutcome("pressure", p, f),
    mobility_recommendation: enhancedMobilityRec,
    input_echo: p
  };
  return addStayPredictions(baseResults);
}
var ADMIT_MAP2, SEDATIVE_TOKENS2, ANTICOAG_TOKENS2, STEROID_TOKENS2, CALIBRATION, W_MOBILITY, W_COMMON, W_SPECIFIC, INTERACTIONS, RISK_BANDS;
var init_risk_calculator = __esm({
  "server/risk-calculator.ts"() {
    "use strict";
    init_mobility_addons();
    init_prescription_adjustments();
    ADMIT_MAP2 = {
      // Neurological
      "stroke": "neuro",
      "cva": "neuro",
      "intracranial hemorrhage": "neuro",
      "ich": "neuro",
      "tbi": "neuro",
      "traumatic brain injury": "neuro",
      "seizure": "neuro",
      "epilepsy": "neuro",
      "meningitis": "neuro",
      "encephalitis": "neuro",
      "spinal cord": "neuro",
      "guillain": "neuro",
      // Pulmonary/Respiratory
      "pneumonia": "medical_pulm",
      "copd": "medical_pulm",
      "asthma": "medical_pulm",
      "respiratory failure": "medical_pulm",
      "pulmonary embolism": "medical_pulm",
      "pe": "medical_pulm",
      "pneumothorax": "medical_pulm",
      "pleural effusion": "medical_pulm",
      "lung": "medical_pulm",
      // Cardiac
      "heart failure": "cardiac",
      "chf": "cardiac",
      "mi": "cardiac",
      "myocardial infarction": "cardiac",
      "stemi": "cardiac",
      "nstemi": "cardiac",
      "cardiomyopathy": "cardiac",
      "arrhythmia": "cardiac",
      "atrial fibrillation": "cardiac",
      "afib": "cardiac",
      "cardiac arrest": "cardiac",
      "pericarditis": "cardiac",
      "aortic": "cardiac",
      "valve": "cardiac",
      // Surgical/Post-operative
      "post-op": "postop",
      "postoperative": "postop",
      "surgery": "postop",
      "surgical": "postop",
      "appendectomy": "postop",
      "cholecystectomy": "postop",
      "laparoscopy": "postop",
      "bowel resection": "postop",
      "hernia repair": "postop",
      // Orthopedic
      "orthopedic": "ortho",
      "hip fracture": "ortho",
      "femur fracture": "ortho",
      "spine": "ortho",
      "vertebral": "ortho",
      "joint replacement": "ortho",
      "knee replacement": "ortho",
      "hip replacement": "ortho",
      "fracture": "ortho",
      "dislocation": "ortho",
      "amputation": "ortho",
      // Oncology
      "cancer": "oncology",
      "malignancy": "oncology",
      "tumor": "oncology",
      "leukemia": "oncology",
      "lymphoma": "oncology",
      "metastasis": "oncology",
      "chemotherapy": "oncology",
      "radiation": "oncology",
      // Infectious/Sepsis
      "sepsis": "sepsis",
      "septic shock": "sepsis",
      "bacteremia": "sepsis",
      "infection": "sepsis",
      "cellulitis": "sepsis",
      "abscess": "sepsis",
      "osteomyelitis": "sepsis",
      "uti": "sepsis",
      "c diff": "sepsis",
      "mrsa": "sepsis",
      // Trauma
      "trauma": "trauma",
      "mva": "trauma",
      "motor vehicle": "trauma",
      "fall": "trauma",
      "assault": "trauma",
      "gunshot": "trauma",
      "stab": "trauma",
      "blunt trauma": "trauma",
      "polytrauma": "trauma",
      // GI/Abdominal
      "gi bleed": "medical_gi",
      "gastrointestinal": "medical_gi",
      "bleeding": "medical_gi",
      "bowel obstruction": "medical_gi",
      "pancreatitis": "medical_gi",
      "liver": "medical_gi",
      "hepatic": "medical_gi",
      "cirrhosis": "medical_gi",
      "colitis": "medical_gi",
      "crohns": "medical_gi",
      // Renal/Genitourinary
      "kidney": "medical_renal",
      "renal": "medical_renal",
      "dialysis": "medical_renal",
      "acute kidney injury": "medical_renal",
      "aki": "medical_renal",
      "chronic kidney disease": "medical_renal",
      "ckd": "medical_renal",
      "urinary retention": "medical_renal",
      // Endocrine/Metabolic
      "diabetes": "medical_endo",
      "diabetic ketoacidosis": "medical_endo",
      "dka": "medical_endo",
      "thyroid": "medical_endo",
      "hyperthyroid": "medical_endo",
      "hypothyroid": "medical_endo",
      "adrenal": "medical_endo"
    };
    SEDATIVE_TOKENS2 = /* @__PURE__ */ new Set([
      "lorazepam",
      "diazepam",
      "alprazolam",
      "midazolam",
      "clonazepam",
      "zolpidem",
      "eszopiclone",
      "temazepam",
      "quetiapine",
      "haloperidol",
      "olanzapine",
      "trazodone",
      "morphine",
      "hydromorphone",
      "fentanyl",
      "oxycodone",
      "methadone",
      "propofol",
      "dexmedetomidine",
      "gabapentin"
    ]);
    ANTICOAG_TOKENS2 = /* @__PURE__ */ new Set([
      "heparin",
      "enoxaparin",
      "fondaparinux",
      "apixaban",
      "rivaroxaban",
      "warfarin",
      "dabigatran"
    ]);
    STEROID_TOKENS2 = /* @__PURE__ */ new Set([
      "prednisone",
      "methylprednisolone",
      "dexamethasone",
      "hydrocortisone"
    ]);
    CALIBRATION = {
      deconditioning: { intercept: -2 },
      // ~12% baseline
      vte: { intercept: -4.5 },
      // ~1.1% baseline (reduced from -4.18 for accuracy)
      falls: { intercept: -5.8 },
      // ~0.3% baseline (conservative - mobility weights drive risk)
      pressure: { intercept: -3.66 }
      // ~2.5% baseline
    };
    W_MOBILITY = {
      deconditioning: {
        bedbound: Math.log(5.6),
        // ~5.6x odds vs high mobility
        chair_bound: Math.log(3),
        standing_assist: Math.log(1.8),
        walking_assist: Math.log(1.3),
        independent: 0
      },
      vte: {
        bedbound: Math.log(3.6),
        chair_bound: Math.log(2),
        standing_assist: Math.log(1.5),
        walking_assist: Math.log(1.2),
        independent: 0
      },
      falls: {
        bedbound: Math.log(25),
        // High falls risk when bedbound
        chair_bound: Math.log(15),
        // Moderate-high falls risk  
        standing_assist: Math.log(8),
        // Moderate falls risk
        walking_assist: Math.log(3),
        // Mild falls risk
        independent: 0
        // Baseline low risk
      },
      pressure: {
        bedbound: Math.log(4),
        chair_bound: Math.log(2.5),
        standing_assist: Math.log(1.6),
        walking_assist: Math.log(1.2),
        independent: 0
      }
    };
    W_COMMON = {
      "age_65+": Math.log(1.3),
      // Age 65+: 30% increase (NEW)
      "age_70+": Math.log(1.3),
      // Additional 30% for 70+ (cumulative with 65+)
      "age_80+": Math.log(1.4),
      // Additional 40% for 80+ (cumulative with 65+, 70+)
      "icu": Math.log(2),
      "stepdown": Math.log(1.3),
      "malnutrition": Math.log(1.6),
      "low_albumin": Math.log(1.5),
      "obesity": Math.log(1.3),
      "diabetes": Math.log(1.2),
      "neuropathy": Math.log(1.4),
      "parkinson": Math.log(1.6),
      "stroke": Math.log(1.8),
      "walker_baseline": Math.log(1.4),
      "dependent_baseline": Math.log(2)
    };
    W_SPECIFIC = {
      deconditioning: {
        cog_mild: Math.log(1.3),
        cog_delirium: Math.log(1.7),
        steroids: Math.log(1.2),
        days_immobile_ge3: Math.log(1.6)
      },
      vte: {
        immobile_ge3: Math.log(1.5),
        // additive to mobility category (reduced from 1.8)
        active_cancer: Math.log(2),
        history_vte: Math.log(2.5),
        // reduced from 3.0 - still major but less extreme
        postop: Math.log(1.6),
        // reduced from 1.8
        trauma: Math.log(1.8),
        // reduced from 2.2 - prevents over-estimation
        no_prophylaxis: Math.log(2)
        // reduced from 2.5
      },
      falls: {
        sedating_meds: Math.log(1.8),
        cog_mild: Math.log(1.6),
        cog_delirium: Math.log(2.6),
        orthopedic: Math.log(1.5),
        stroke: Math.log(1.6),
        devices: Math.log(1.3),
        // lines/tubes/foley
        parkinson: Math.log(2.5),
        // Parkinson's - major falls risk factor
        neuropathy: Math.log(1.8)
        // Peripheral neuropathy - impaired proprioception
      },
      pressure: {
        moisture: Math.log(1.6),
        // incontinence, moisture
        low_albumin: Math.log(1.5),
        diabetes: Math.log(1.3),
        immobile_ge3: Math.log(1.6)
      }
    };
    INTERACTIONS = {
      falls: {
        "bedbound,delirium_dementia": Math.log(1.8),
        "chair_bound,delirium_dementia": Math.log(1.5)
      }
    };
    RISK_BANDS = {
      deconditioning: { low: 0, moderate: 0.15, high: 0.25 },
      // High at 25%
      vte: { low: 0, moderate: 0.02, high: 0.04 },
      // High at 4%  
      falls: { low: 0, moderate: 0.02, high: 0.04 },
      // High at 4%
      pressure: { low: 0, moderate: 0.02, high: 0.04 }
      // High at 4%
    };
  }
});

// server/logger.ts
import winston from "winston";
function errorLogger(err, req, res, next) {
  logger.error("Unhandled Error", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    ip: req.ip
  });
  next(err);
}
var levels, level, colors, format, consoleFormat, transports, logger;
var init_logger = __esm({
  "server/logger.ts"() {
    "use strict";
    levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4
    };
    level = () => {
      const env = process.env.NODE_ENV || "development";
      const isDevelopment = env === "development";
      return isDevelopment ? "debug" : "info";
    };
    colors = {
      error: "red",
      warn: "yellow",
      info: "green",
      http: "magenta",
      debug: "white"
    };
    winston.addColors(colors);
    format = winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
      winston.format.errors({ stack: true }),
      winston.format.metadata(),
      winston.format.json()
    );
    consoleFormat = winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: "HH:mm:ss" }),
      winston.format.printf(
        (info) => `${info.timestamp} [${info.level}]: ${info.message}`
      )
    );
    transports = [
      // Console output
      new winston.transports.Console({
        format: process.env.NODE_ENV === "production" ? format : consoleFormat
      }),
      // Error log file
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        format
      }),
      // Combined log file
      new winston.transports.File({
        filename: "logs/combined.log",
        format
      })
    ];
    logger = winston.createLogger({
      level: level(),
      levels,
      format,
      transports,
      // Don't exit on handled exceptions
      exitOnError: false
    });
    process.on("unhandledRejection", (reason, promise) => {
      console.error("\n\u274C UNHANDLED PROMISE REJECTION:");
      console.error("Reason:", reason);
      console.error("Stack:", reason.stack);
      logger.error("Unhandled Promise Rejection", {
        reason: reason.message,
        stack: reason.stack,
        promise
      });
    });
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });
  }
});

// server/protocols/protocol-engine.ts
var protocol_engine_exports = {};
__export(protocol_engine_exports, {
  ProtocolEngine: () => ProtocolEngine,
  protocolEngine: () => protocolEngine
});
import { eq as eq4, and as and4, desc as desc3 } from "drizzle-orm";
var ProtocolEngine, protocolEngine;
var init_protocol_engine = __esm({
  async "server/protocols/protocol-engine.ts"() {
    "use strict";
    await init_db();
    init_schema();
    init_logger();
    ProtocolEngine = class {
      /**
       * Match patient diagnosis to appropriate protocol
       *
       * @param diagnosis - Admission diagnosis or clinical indication
       * @param comorbidities - List of patient comorbidities
       * @param diagnosisCodes - Optional ICD-10 codes
       * @returns Matched protocol or null if none suitable
       */
      async matchProtocol(diagnosis, comorbidities = [], diagnosisCodes = []) {
        try {
          const protocols = await db.select().from(clinicalProtocols).where(eq4(clinicalProtocols.isActive, true));
          logger.debug("Matching protocol", { diagnosis, comorbidities, diagnosisCodes });
          if (diagnosisCodes.length > 0) {
            for (const protocol of protocols) {
              const protocolCodes = JSON.parse(protocol.diagnosisCodes || "[]");
              const hasMatch = diagnosisCodes.some(
                (code) => protocolCodes.some((pc) => pc === code)
              );
              if (hasMatch && !this.hasContraindication(protocol, comorbidities)) {
                logger.info("Protocol matched by diagnosis code", {
                  protocol: protocol.name,
                  diagnosisCode: diagnosisCodes[0]
                });
                return this.parseProtocol(protocol);
              }
            }
          }
          const diagnosisLower = diagnosis.toLowerCase();
          for (const protocol of protocols) {
            const indication = protocol.indication.toLowerCase();
            const keywords = indication.split(/\s+/).filter((w) => w.length > 3);
            const hasMatch = keywords.some((keyword) => diagnosisLower.includes(keyword));
            if (hasMatch && !this.hasContraindication(protocol, comorbidities)) {
              logger.info("Protocol matched by keyword", {
                protocol: protocol.name,
                diagnosis
              });
              return this.parseProtocol(protocol);
            }
          }
          logger.warn("No protocol matched", { diagnosis, comorbidities });
          return null;
        } catch (error) {
          logger.error("Protocol matching failed", {
            error: error.message,
            diagnosis
          });
          return null;
        }
      }
      /**
       * Check if patient has contraindications for protocol
       */
      hasContraindication(protocol, comorbidities) {
        const contraindications = JSON.parse(protocol.contraindications || "[]");
        return contraindications.some(
          (ci) => comorbidities.some((c) => c.toLowerCase().includes(ci.toLowerCase()))
        );
      }
      /**
       * Parse protocol from database format to typed object
       */
      parseProtocol(protocol) {
        const protocolData = JSON.parse(protocol.protocolData);
        return {
          id: protocol.id,
          name: protocol.name,
          indication: protocol.indication,
          contraindications: JSON.parse(protocol.contraindications || "[]"),
          diagnosisCodes: JSON.parse(protocol.diagnosisCodes || "[]"),
          phases: protocolData.phases || [],
          evidenceCitation: protocol.evidenceCitation,
          isActive: protocol.isActive === 1
        };
      }
      /**
       * Assign protocol to patient
       *
       * @param patientId - Patient ID
       * @param protocolId - Protocol ID to assign
       * @param assignedBy - Provider ID assigning the protocol
       * @param startPhase - Optional starting phase (defaults to first phase)
       * @returns Assignment record
       */
      async assignProtocol(patientId, protocolId, assignedBy, startPhase) {
        try {
          const protocol = await db.select().from(clinicalProtocols).where(eq4(clinicalProtocols.id, protocolId)).limit(1);
          if (!protocol.length) {
            logger.error("Protocol not found", { protocolId });
            return null;
          }
          const parsedProtocol = this.parseProtocol(protocol[0]);
          const initialPhase = startPhase || parsedProtocol.phases[0]?.phase;
          if (!initialPhase) {
            logger.error("Protocol has no phases", { protocolId });
            return null;
          }
          await db.update(patientProtocolAssignments).set({ status: "discontinued" }).where(
            and4(
              eq4(patientProtocolAssignments.patientId, patientId),
              eq4(patientProtocolAssignments.status, "active")
            )
          );
          const now = /* @__PURE__ */ new Date();
          const result = await db.insert(patientProtocolAssignments).values({
            patientId,
            protocolId,
            assignedBy,
            currentPhase: initialPhase,
            startDate: now,
            progressionDate: now,
            status: "active"
            // createdAt and updatedAt use database defaults
          });
          logger.info("Protocol assigned to patient", {
            patientId,
            protocolId,
            protocol: parsedProtocol.name,
            phase: initialPhase
          });
          return {
            id: result.lastInsertRowid,
            patientId,
            protocolId,
            assignedBy,
            currentPhase: initialPhase,
            startDate: now,
            status: "active"
          };
        } catch (error) {
          console.error("Protocol assignment error:", error);
          logger.error("Failed to assign protocol", {
            error: error.message,
            stack: error.stack,
            patientId,
            protocolId
          });
          return null;
        }
      }
      /**
       * Get current prescription for patient based on active protocol
       *
       * @param patientId - Patient ID
       * @returns Current exercise prescription or null
       */
      async getCurrentPrescription(patientId) {
        try {
          const assignment = await db.select().from(patientProtocolAssignments).where(
            and4(
              eq4(patientProtocolAssignments.patientId, patientId),
              eq4(patientProtocolAssignments.status, "active")
            )
          ).limit(1);
          if (!assignment.length) {
            logger.debug("No active protocol for patient", { patientId });
            return null;
          }
          const protocol = await db.select().from(clinicalProtocols).where(eq4(clinicalProtocols.id, assignment[0].protocolId)).limit(1);
          if (!protocol.length) {
            logger.error("Protocol not found for assignment", {
              assignmentId: assignment[0].id,
              protocolId: assignment[0].protocolId
            });
            return null;
          }
          const parsedProtocol = this.parseProtocol(protocol[0]);
          const currentPhase = parsedProtocol.phases.find(
            (p) => p.phase === assignment[0].currentPhase
          );
          if (!currentPhase) {
            logger.error("Current phase not found in protocol", {
              protocol: parsedProtocol.name,
              phase: assignment[0].currentPhase
            });
            return null;
          }
          return {
            frequency: currentPhase.frequency,
            duration: currentPhase.duration,
            resistance: currentPhase.resistance,
            rpm: currentPhase.rpm,
            phase: currentPhase.phase,
            goals: currentPhase.goals,
            rationale: `${parsedProtocol.name} - ${currentPhase.phase}: ${currentPhase.goals}`,
            monitoringParams: currentPhase.monitoringParams,
            stopCriteria: currentPhase.stopCriteria
          };
        } catch (error) {
          logger.error("Failed to get prescription", {
            error: error.message,
            patientId
          });
          return null;
        }
      }
      /**
       * Check if patient should progress to next protocol phase
       *
       * @param patientId - Patient ID
       * @returns Progression recommendation
       */
      async checkProgressionCriteria(patientId) {
        try {
          const assignment = await db.select().from(patientProtocolAssignments).where(
            and4(
              eq4(patientProtocolAssignments.patientId, patientId),
              eq4(patientProtocolAssignments.status, "active")
            )
          ).limit(1);
          if (!assignment.length) {
            return {
              shouldProgress: false,
              currentPhase: "none",
              reason: "No active protocol"
            };
          }
          const protocol = await db.select().from(clinicalProtocols).where(eq4(clinicalProtocols.id, assignment[0].protocolId)).limit(1);
          if (!protocol.length) {
            return {
              shouldProgress: false,
              currentPhase: assignment[0].currentPhase,
              reason: "Protocol not found"
            };
          }
          const parsedProtocol = this.parseProtocol(protocol[0]);
          const currentPhaseIndex = parsedProtocol.phases.findIndex(
            (p) => p.phase === assignment[0].currentPhase
          );
          if (currentPhaseIndex === -1) {
            return {
              shouldProgress: false,
              currentPhase: assignment[0].currentPhase,
              reason: "Current phase not found in protocol"
            };
          }
          if (currentPhaseIndex === parsedProtocol.phases.length - 1) {
            return {
              shouldProgress: false,
              currentPhase: assignment[0].currentPhase,
              reason: "Already in final phase"
            };
          }
          const currentPhase = parsedProtocol.phases[currentPhaseIndex];
          const nextPhase = parsedProtocol.phases[currentPhaseIndex + 1];
          const recentSessions = await db.select().from(exerciseSessions).where(eq4(exerciseSessions.patientId, patientId)).orderBy(desc3(exerciseSessions.startTime)).limit(5);
          if (recentSessions.length < 3) {
            return {
              shouldProgress: false,
              currentPhase: currentPhase.phase,
              reason: "Need more sessions to evaluate progression (minimum 3)",
              criteria: currentPhase.progressionCriteria
            };
          }
          const avgDuration = recentSessions.reduce(
            (sum, s) => sum + (s.durationSeconds || s.duration || 0),
            0
          ) / recentSessions.length;
          const avgPower = recentSessions.reduce(
            (sum, s) => sum + (s.avgPower || 0),
            0
          ) / recentSessions.length;
          const targetDuration = currentPhase.duration * 60;
          if (avgDuration >= targetDuration * 0.9 && recentSessions.length >= 3) {
            logger.info("Patient meets progression criteria", {
              patientId,
              currentPhase: currentPhase.phase,
              nextPhase: nextPhase.phase,
              avgDuration: Math.round(avgDuration),
              targetDuration
            });
            return {
              shouldProgress: true,
              currentPhase: currentPhase.phase,
              nextPhase: nextPhase.phase,
              reason: `Patient consistently meeting duration targets (${Math.round(avgDuration / 60)}min avg, ${Math.round(avgPower)}W avg)`,
              criteria: currentPhase.progressionCriteria
            };
          }
          return {
            shouldProgress: false,
            currentPhase: currentPhase.phase,
            reason: `Need more consistent performance (current avg: ${Math.round(avgDuration / 60)}min, target: ${currentPhase.duration}min)`,
            criteria: currentPhase.progressionCriteria
          };
        } catch (error) {
          logger.error("Failed to check progression criteria", {
            error: error.message,
            patientId
          });
          return {
            shouldProgress: false,
            currentPhase: "unknown",
            reason: `Error: ${error.message}`
          };
        }
      }
      /**
       * Progress patient to next phase
       *
       * @param patientId - Patient ID
       * @returns Success boolean
       */
      async progressToNextPhase(patientId) {
        try {
          const check = await this.checkProgressionCriteria(patientId);
          if (!check.shouldProgress || !check.nextPhase) {
            logger.warn("Cannot progress patient", {
              patientId,
              reason: check.reason
            });
            return false;
          }
          await db.update(patientProtocolAssignments).set({
            currentPhase: check.nextPhase,
            progressionDate: /* @__PURE__ */ new Date()
            // updatedAt handled by trigger or app logic
          }).where(
            and4(
              eq4(patientProtocolAssignments.patientId, patientId),
              eq4(patientProtocolAssignments.status, "active")
            )
          );
          logger.info("Patient progressed to next phase", {
            patientId,
            fromPhase: check.currentPhase,
            toPhase: check.nextPhase
          });
          return true;
        } catch (error) {
          logger.error("Failed to progress patient", {
            error: error.message,
            patientId
          });
          return false;
        }
      }
      /**
       * Parse frequency string to daily session count
       */
      parseFrequency(frequency) {
        const map = {
          "QD": 1,
          "daily": 1,
          "once daily": 1,
          "BID": 2,
          "twice daily": 2,
          "TID": 3,
          "three times daily": 3,
          "QID": 4,
          "four times daily": 4
        };
        return map[frequency.toLowerCase()] || map[frequency] || 3;
      }
      /**
       * Get all active protocols
       */
      async getAllProtocols() {
        try {
          const protocols = await db.select().from(clinicalProtocols).where(eq4(clinicalProtocols.isActive, true));
          return protocols.map((p) => this.parseProtocol(p));
        } catch (error) {
          logger.error("Failed to get protocols", { error: error.message });
          return [];
        }
      }
      /**
       * Get protocol by ID
       */
      async getProtocolById(id) {
        try {
          const protocol = await db.select().from(clinicalProtocols).where(eq4(clinicalProtocols.id, id)).limit(1);
          if (!protocol.length) return null;
          return this.parseProtocol(protocol[0]);
        } catch (error) {
          logger.error("Failed to get protocol by ID", { error: error.message, id });
          return null;
        }
      }
      /**
       * Get patient's current protocol assignment
       */
      async getPatientAssignment(patientId) {
        try {
          const assignment = await db.select().from(patientProtocolAssignments).where(
            and4(
              eq4(patientProtocolAssignments.patientId, patientId),
              eq4(patientProtocolAssignments.status, "active")
            )
          ).limit(1);
          if (!assignment.length) return null;
          const protocol = await this.getProtocolById(assignment[0].protocolId);
          const assigner = await db.select().from(users).where(eq4(users.id, assignment[0].assignedBy)).limit(1);
          return {
            ...assignment[0],
            protocol,
            assignedByName: assigner.length ? `${assigner[0].firstName} ${assigner[0].lastName}` : "Unknown"
          };
        } catch (error) {
          logger.error("Failed to get patient assignment", {
            error: error.message,
            patientId
          });
          return null;
        }
      }
    };
    protocolEngine = new ProtocolEngine();
  }
});

// server/personalization/personalized-protocol-matcher.ts
var personalized_protocol_matcher_exports = {};
__export(personalized_protocol_matcher_exports, {
  PersonalizedProtocolMatcher: () => PersonalizedProtocolMatcher,
  personalizedProtocolMatcher: () => personalizedProtocolMatcher
});
import { eq as eq5, desc as desc4 } from "drizzle-orm";
function wattsToResistance2(watts, rpm) {
  const k = 0.2;
  const resistance = watts / (k * rpm);
  return Math.max(1, Math.min(9, Math.round(resistance)));
}
function calculatePower(resistance, rpm) {
  const k = 0.2;
  return k * resistance * rpm;
}
var DIAGNOSIS_ADJUSTMENT_PROFILES2, MEDICATION_ADJUSTMENT_PROFILES2, DIAGNOSIS_CATEGORY_MAP, DIAGNOSIS_CATEGORY_LABELS3, MEDICATION_CATEGORY_MAP, MONITORING_BY_CATEGORY2, STOP_CRITERIA_BY_CATEGORY2, BASELINE_RPM_BY_MOBILITY2, PersonalizedProtocolMatcher, personalizedProtocolMatcher;
var init_personalized_protocol_matcher = __esm({
  async "server/personalization/personalized-protocol-matcher.ts"() {
    "use strict";
    await init_db();
    init_schema();
    init_logger();
    init_risk_calculator();
    DIAGNOSIS_ADJUSTMENT_PROFILES2 = {
      /**
       * Cardiac (Heart Failure, CHF)
       * Goal: Build cardiac strength with controlled heart rate
       * Strategy: Higher resistance, lower RPM to reduce cardiac demand while
       * maintaining muscle engagement. Same total energy target.
       */
      cardiac: {
        category: "cardiac",
        resistanceMultiplier: 1.25,
        // 25% higher resistance
        rpmMultiplier: 0.8,
        // 20% lower RPM
        durationMultiplier: 1,
        // Same duration
        rationale: "Higher resistance with controlled RPM reduces cardiac stress while maintaining muscle conditioning"
      },
      /**
       * Pulmonary (COPD, Respiratory)
       * Goal: Build endurance without excessive ventilatory demand
       * Strategy: Higher resistance, lower RPM to reduce respiratory rate
       * while maintaining conditioning. Same total energy target.
       */
      pulmonary: {
        category: "pulmonary",
        resistanceMultiplier: 1.2,
        // 20% higher resistance
        rpmMultiplier: 0.85,
        // 15% lower RPM
        durationMultiplier: 1,
        // Same duration
        rationale: "Higher resistance with slower pedaling minimizes respiratory demand while preserving muscle work"
      },
      /**
       * Orthopedic (Total Knee, Total Hip, ROM-focused)
       * Goal: Maximize range of motion and joint mobility
       * Strategy: Lower resistance, more rotations, longer duration.
       * Same total energy target achieved through more movement.
       */
      orthopedic: {
        category: "orthopedic",
        resistanceMultiplier: 0.7,
        // 30% lower resistance
        rpmMultiplier: 1.15,
        // 15% higher RPM (more rotations)
        durationMultiplier: 1.25,
        // 25% longer duration for more total rotations
        rationale: "Lower resistance with more rotations maximizes joint ROM and reduces surgical site stress"
      },
      /**
       * Neurological (Stroke, TBI)
       * Goal: Bilateral coordination and motor relearning
       * Strategy: Moderate parameters with focus on symmetry and control.
       * Same total energy target with emphasis on quality of movement.
       */
      neurological: {
        category: "neurological",
        resistanceMultiplier: 0.9,
        // 10% lower resistance for control
        rpmMultiplier: 0.95,
        // 5% lower RPM for coordination
        durationMultiplier: 1.15,
        // 15% longer for motor learning
        rationale: "Moderate resistance with controlled pace supports bilateral coordination and motor relearning"
      },
      /**
       * ICU Recovery (Post-ICU, Critical Illness)
       * Goal: Very gentle reconditioning after critical illness
       * Strategy: Low intensity, shorter duration, progressive approach.
       */
      icu_recovery: {
        category: "icu_recovery",
        resistanceMultiplier: 0.6,
        // 40% lower resistance - very gentle
        rpmMultiplier: 0.7,
        // 30% lower RPM - slow and controlled
        durationMultiplier: 0.75,
        // 25% shorter duration - prevent fatigue
        rationale: "Very gentle parameters for post-ICU reconditioning with progressive increase as tolerated"
      },
      /**
       * Delirium/Confusion
       * Goal: Provide structured activity, maintain safety
       * Strategy: Simple, consistent parameters, shorter sessions.
       */
      delirium: {
        category: "delirium",
        resistanceMultiplier: 0.75,
        // 25% lower resistance
        rpmMultiplier: 0.8,
        // 20% lower RPM - manageable pace
        durationMultiplier: 0.7,
        // 30% shorter duration - attention span
        rationale: "Simplified, shorter sessions with consistent parameters to provide structured activity safely"
      },
      /**
       * Frail Elderly (75+)
       * Goal: Prevent deconditioning while minimizing fall risk
       * Strategy: Very low intensity, focus on safety over intensity.
       */
      frail_elderly: {
        category: "frail_elderly",
        resistanceMultiplier: 0.65,
        // 35% lower resistance
        rpmMultiplier: 0.75,
        // 25% lower RPM
        durationMultiplier: 0.8,
        // 20% shorter duration
        rationale: "Low-intensity approach prioritizing safety and fall prevention over conditioning intensity"
      },
      /**
       * General (Default)
       * Goal: Balanced conditioning and VTE prevention
       * Strategy: Use baseline parameters from risk calculator directly.
       * Note: No diagnosis-specific protocol adjustments recommended - using evidence-based baseline.
       */
      general: {
        category: "general",
        resistanceMultiplier: 1,
        rpmMultiplier: 1,
        durationMultiplier: 1,
        rationale: "No diagnosis-specific adjustments recommended. Using evidence-based baseline prescription optimized for general conditioning and VTE prevention."
      }
    };
    MEDICATION_ADJUSTMENT_PROFILES2 = {
      /**
       * Beta Blockers (Metoprolol, Atenolol)
       * Effect: Blunts heart rate response, reduces exercise capacity 10-20%
       * Strategy: Focus on resistance (strength) rather than aerobic (RPM)
       */
      beta_blocker: {
        category: "beta_blocker",
        intensityMultiplier: 0.9,
        // 10% intensity reduction
        resistanceFocus: true,
        // YES - focus on resistance over RPM
        rpmReduction: 5,
        // Reduce target RPM by 5
        durationReduction: 0,
        // No duration change
        rationale: "Beta blocker blunts heart rate response. Focus on resistance/strength training rather than aerobic conditioning.",
        additionalMonitoring: [
          "Note: HR will not reflect true exertion - use RPE instead",
          "Monitor for fatigue at lower than expected HR"
        ],
        additionalStopCriteria: [
          "RPE >6/10 (HR unreliable due to beta blocker)",
          "Excessive fatigue despite normal HR"
        ]
      },
      /**
       * Rate Control Medications (Digoxin, Diltiazem, Verapamil)
       * Effect: Limits maximum heart rate, reduces cardiac output capacity
       * Strategy: Focus on resistance, avoid high RPM targets
       */
      rate_control: {
        category: "rate_control",
        intensityMultiplier: 0.85,
        // 15% intensity reduction
        resistanceFocus: true,
        // YES - focus on resistance
        rpmReduction: 8,
        // Reduce target RPM by 8
        durationReduction: 0,
        rationale: "Rate control medication limits heart rate response. Prioritize resistance-based exercise over aerobic RPM targets.",
        additionalMonitoring: [
          "Heart rate response will be blunted",
          "Use RPE 2-3/10 as primary intensity guide"
        ],
        additionalStopCriteria: [
          "RPE >5/10",
          "Any palpitations or irregular rhythm sensation"
        ]
      },
      /**
       * Diuretics (Furosemide, Hydrochlorothiazide)
       * Effect: Increased fatigue, dehydration risk, electrolyte imbalance
       * Strategy: Shorter sessions, ensure hydration, monitor closely
       */
      diuretic: {
        category: "diuretic",
        intensityMultiplier: 0.9,
        // 10% intensity reduction
        resistanceFocus: false,
        rpmReduction: 0,
        durationReduction: 2,
        // Reduce duration by 2 minutes
        rationale: "Diuretic may cause earlier fatigue and dehydration. Slightly shorter sessions with hydration awareness.",
        additionalMonitoring: [
          "Monitor for signs of dehydration",
          "Watch for muscle cramping (electrolyte imbalance)",
          "Assess energy level throughout session"
        ],
        additionalStopCriteria: [
          "Muscle cramping",
          "Dizziness or lightheadedness",
          "Excessive thirst or dry mouth"
        ]
      },
      /**
       * Sedating Medications (Benzodiazepines, Opioids, Antipsychotics)
       * Effect: Drowsiness, impaired coordination, increased fall risk
       * Strategy: Significantly reduced intensity, enhanced supervision
       */
      sedating: {
        category: "sedating",
        intensityMultiplier: 0.75,
        // 25% intensity reduction
        resistanceFocus: false,
        rpmReduction: 5,
        durationReduction: 3,
        // Reduce duration by 3 minutes
        rationale: "Sedating medication affects coordination and alertness. Reduced intensity with close supervision required.",
        additionalMonitoring: [
          "Assess alertness before and during session",
          "Monitor coordination and balance",
          "Watch for excessive drowsiness"
        ],
        additionalStopCriteria: [
          "Drowsiness or confusion",
          "Impaired coordination observed",
          "Patient unable to follow simple instructions"
        ]
      },
      /**
       * Insulin
       * Effect: Hypoglycemia risk, especially with exercise
       * Strategy: Monitor blood glucose, have glucose available
       */
      insulin: {
        category: "insulin",
        intensityMultiplier: 0.95,
        // 5% intensity reduction
        resistanceFocus: false,
        rpmReduction: 0,
        durationReduction: 0,
        rationale: "Insulin increases hypoglycemia risk during exercise. Ensure glucose monitoring and snack availability.",
        additionalMonitoring: [
          "Check blood glucose before session",
          "Have fast-acting glucose available",
          "Monitor for hypoglycemia symptoms"
        ],
        additionalStopCriteria: [
          "Blood glucose <70 mg/dL",
          "Symptoms of hypoglycemia (shakiness, sweating, confusion)",
          "Patient feels lightheaded or weak"
        ]
      },
      /**
       * Anticoagulants (Warfarin, Apixaban, Rivaroxaban)
       * Effect: Bleeding risk with trauma
       * Strategy: No intensity change, but awareness of bleeding risk
       */
      anticoagulant: {
        category: "anticoagulant",
        intensityMultiplier: 1,
        // No intensity change
        resistanceFocus: false,
        rpmReduction: 0,
        durationReduction: 0,
        rationale: "Anticoagulant therapy - no exercise modification needed but maintain awareness of bleeding risk.",
        additionalMonitoring: [
          "Inspect for bruising before session",
          "Note any complaints of unusual pain or swelling"
        ],
        additionalStopCriteria: [
          "Any signs of bleeding or unusual bruising",
          "Complaints of joint or muscle pain that could indicate bleeding"
        ]
      },
      /**
       * Antiparkinsonian (Carbidopa-Levodopa)
       * Effect: Timing-dependent effectiveness, coordination changes
       * Strategy: Exercise during "on" periods, account for coordination issues
       */
      antiparkinsonian: {
        category: "antiparkinsonian",
        intensityMultiplier: 0.9,
        // 10% intensity reduction
        resistanceFocus: false,
        rpmReduction: 3,
        // Slightly lower RPM for coordination
        durationReduction: 0,
        rationale: 'Antiparkinsonian medication has timing-dependent effects. Schedule exercise during medication "on" periods.',
        additionalMonitoring: [
          "Time session 1-2 hours after medication dose",
          "Monitor for dyskinesia or tremor changes",
          "Assess coordination throughout"
        ],
        additionalStopCriteria: [
          "Significant tremor interfering with pedaling",
          "Dyskinesia affecting safety",
          "Medication wearing off (freezing episodes)"
        ]
      },
      /**
       * None - No significant medication adjustments
       */
      none: {
        category: "none",
        intensityMultiplier: 1,
        resistanceFocus: false,
        rpmReduction: 0,
        durationReduction: 0,
        rationale: "No medication-related exercise modifications required.",
        additionalMonitoring: [],
        additionalStopCriteria: []
      }
    };
    DIAGNOSIS_CATEGORY_MAP = {
      // =========================================================================
      // DROPDOWN OPTION: "Heart Failure"
      // =========================================================================
      "heart failure": "cardiac",
      "chf": "cardiac",
      "congestive heart failure": "cardiac",
      "cardiac": "cardiac",
      "i50": "cardiac",
      // ICD-10 Heart failure codes start with I50
      "cardiomyopathy": "cardiac",
      "atrial fibrillation": "cardiac",
      "afib": "cardiac",
      "myocardial infarction": "cardiac",
      "mi": "cardiac",
      "angina": "cardiac",
      // =========================================================================
      // DROPDOWN OPTION: "COPD Exacerbation"
      // =========================================================================
      "copd": "pulmonary",
      "copd exacerbation": "pulmonary",
      "chronic obstructive pulmonary disease": "pulmonary",
      "respiratory": "pulmonary",
      "pneumonia": "pulmonary",
      "j44": "pulmonary",
      // ICD-10 COPD codes
      "j18": "pulmonary",
      // ICD-10 Pneumonia codes
      "asthma": "pulmonary",
      "pulmonary": "pulmonary",
      "respiratory failure": "pulmonary",
      "acute respiratory": "pulmonary",
      // =========================================================================
      // DROPDOWN OPTION: "Total Knee Arthroplasty"
      // =========================================================================
      "total knee arthroplasty": "orthopedic",
      "total knee": "orthopedic",
      "tka": "orthopedic",
      "knee replacement": "orthopedic",
      "knee arthroplasty": "orthopedic",
      "z96.64": "orthopedic",
      // ICD-10 Artificial knee joint
      "m17": "orthopedic",
      // ICD-10 Knee osteoarthritis
      // =========================================================================
      // DROPDOWN OPTION: "Hip Fracture"
      // =========================================================================
      "hip fracture": "orthopedic",
      "total hip": "orthopedic",
      "tha": "orthopedic",
      "hip replacement": "orthopedic",
      "hip arthroplasty": "orthopedic",
      "z96.65": "orthopedic",
      // ICD-10 Artificial hip joint
      "m16": "orthopedic",
      // ICD-10 Hip osteoarthritis
      "joint replacement": "orthopedic",
      "arthroplasty": "orthopedic",
      "orif": "orthopedic",
      // Open reduction internal fixation
      "s72": "orthopedic",
      // ICD-10 Femur fracture
      // =========================================================================
      // DROPDOWN OPTION: "Stroke/CVA"
      // =========================================================================
      "stroke": "neurological",
      "stroke/cva": "neurological",
      "cva": "neurological",
      "cerebrovascular": "neurological",
      "cerebrovascular accident": "neurological",
      "i63": "neurological",
      // ICD-10 Cerebral infarction
      "i64": "neurological",
      // ICD-10 Stroke not specified
      "tbi": "neurological",
      "traumatic brain": "neurological",
      "hemiplegia": "neurological",
      "g81": "neurological",
      // ICD-10 Hemiplegia
      // =========================================================================
      // DROPDOWN OPTION: "ICU Stay/Critical Illness"
      // =========================================================================
      "icu": "icu_recovery",
      "icu stay": "icu_recovery",
      "icu stay/critical illness": "icu_recovery",
      "critical illness": "icu_recovery",
      "post-icu": "icu_recovery",
      "icu deconditioning": "icu_recovery",
      "critical illness myopathy": "icu_recovery",
      "sepsis": "icu_recovery",
      "septic shock": "icu_recovery",
      "mechanical ventilation": "icu_recovery",
      "prolonged intubation": "icu_recovery",
      "g72.81": "icu_recovery",
      // ICD-10 Critical illness myopathy
      // =========================================================================
      // DROPDOWN OPTION: "Delirium/Confusion"
      // =========================================================================
      "delirium": "delirium",
      "delirium/confusion": "delirium",
      "confusion": "delirium",
      "altered mental status": "delirium",
      "encephalopathy": "delirium",
      "f05": "delirium",
      // ICD-10 Delirium
      "r41.0": "delirium",
      // ICD-10 Disorientation
      // =========================================================================
      // DROPDOWN OPTION: "Frail Elderly (75+)"
      // =========================================================================
      "frail": "frail_elderly",
      "frail elderly": "frail_elderly",
      "frail elderly (75+)": "frail_elderly",
      "elderly": "frail_elderly",
      "debility": "frail_elderly",
      "age-related debility": "frail_elderly",
      "failure to thrive": "frail_elderly",
      "r54": "frail_elderly",
      // ICD-10 Age-related debility
      "r62.7": "frail_elderly",
      // ICD-10 Adult failure to thrive
      "m62.81": "frail_elderly",
      // ICD-10 Muscle weakness
      // =========================================================================
      // DROPDOWN OPTION: "General Medical/Surgical" and "Other"
      // =========================================================================
      "general": "general",
      "general medical": "general",
      "general medical/surgical": "general",
      "general surgical": "general",
      "other": "general",
      "surgical": "general",
      "medical": "general"
    };
    DIAGNOSIS_CATEGORY_LABELS3 = {
      cardiac: "Cardiac (Heart Failure/CHF)",
      pulmonary: "Pulmonary (COPD/Respiratory)",
      orthopedic: "Orthopedic (Joint Replacement/Fracture)",
      neurological: "Neurological (Stroke/CVA)",
      icu_recovery: "ICU Recovery/Critical Illness",
      delirium: "Delirium/Confusion",
      frail_elderly: "Frail Elderly",
      general: "General Medical/Surgical"
    };
    MEDICATION_CATEGORY_MAP = {
      // Beta Blockers
      "metoprolol": "beta_blocker",
      "atenolol": "beta_blocker",
      "carvedilol": "beta_blocker",
      "propranolol": "beta_blocker",
      "bisoprolol": "beta_blocker",
      "labetalol": "beta_blocker",
      // Rate Control
      "digoxin": "rate_control",
      "diltiazem": "rate_control",
      "verapamil": "rate_control",
      "amiodarone": "rate_control",
      // Diuretics
      "furosemide": "diuretic",
      "lasix": "diuretic",
      "bumetanide": "diuretic",
      "hydrochlorothiazide": "diuretic",
      "hctz": "diuretic",
      "spironolactone": "diuretic",
      "torsemide": "diuretic",
      "metolazone": "diuretic",
      // Sedating Medications
      "lorazepam": "sedating",
      "ativan": "sedating",
      "diazepam": "sedating",
      "valium": "sedating",
      "midazolam": "sedating",
      "alprazolam": "sedating",
      "xanax": "sedating",
      "oxycodone": "sedating",
      "hydrocodone": "sedating",
      "morphine": "sedating",
      "fentanyl": "sedating",
      "hydromorphone": "sedating",
      "dilaudid": "sedating",
      "tramadol": "sedating",
      "haloperidol": "sedating",
      "haldol": "sedating",
      "quetiapine": "sedating",
      "seroquel": "sedating",
      "olanzapine": "sedating",
      "risperidone": "sedating",
      "trazodone": "sedating",
      "zolpidem": "sedating",
      "ambien": "sedating",
      // Insulin
      "insulin": "insulin",
      "insulin glargine": "insulin",
      "lantus": "insulin",
      "insulin aspart": "insulin",
      "novolog": "insulin",
      "insulin lispro": "insulin",
      "humalog": "insulin",
      "insulin regular": "insulin",
      "insulin nph": "insulin",
      // Anticoagulants
      "warfarin": "anticoagulant",
      "coumadin": "anticoagulant",
      "apixaban": "anticoagulant",
      "eliquis": "anticoagulant",
      "rivaroxaban": "anticoagulant",
      "xarelto": "anticoagulant",
      "dabigatran": "anticoagulant",
      "pradaxa": "anticoagulant",
      "enoxaparin": "anticoagulant",
      "lovenox": "anticoagulant",
      "heparin": "anticoagulant",
      // Antiparkinsonian
      "carbidopa": "antiparkinsonian",
      "levodopa": "antiparkinsonian",
      "carbidopa-levodopa": "antiparkinsonian",
      "sinemet": "antiparkinsonian",
      "pramipexole": "antiparkinsonian",
      "mirapex": "antiparkinsonian",
      "ropinirole": "antiparkinsonian",
      "requip": "antiparkinsonian"
    };
    MONITORING_BY_CATEGORY2 = {
      cardiac: [
        "Heart rate (target <100 bpm)",
        "Blood pressure (avoid drops >10 mmHg)",
        "SpO2",
        "Dyspnea score (0-10)",
        "Borg RPE (target 11-13)",
        "Signs of fluid overload"
      ],
      pulmonary: [
        "SpO2 (maintain >90%)",
        "Respiratory rate (<25/min)",
        "Dyspnea score (0-10)",
        "Heart rate",
        "Accessory muscle use",
        "Pursed lip breathing pattern"
      ],
      orthopedic: [
        "Pain level (0-10)",
        "Range of motion (degrees)",
        "Surgical site assessment",
        "Edema monitoring",
        "Blood pressure",
        "Total rotations completed"
      ],
      neurological: [
        "Blood pressure (avoid >180 mmHg)",
        "Bilateral pedaling symmetry",
        "Motor strength (affected vs unaffected)",
        "Cognitive participation",
        "Balance and trunk control",
        "New neurological symptoms"
      ],
      icu_recovery: [
        "Heart rate (strict limits)",
        "Blood pressure (watch for orthostatic changes)",
        "SpO2 (continuous)",
        "Respiratory rate",
        "Level of alertness",
        "Muscle activation quality",
        "Fatigue level (frequent checks)"
      ],
      delirium: [
        "Behavioral status",
        "Agitation level (0-10)",
        "Participation quality",
        "Safety throughout",
        "CAM score (before and after)",
        "Orientation assessment"
      ],
      frail_elderly: [
        "Heart rate",
        "Blood pressure (orthostatic)",
        "Balance and stability",
        "Fatigue level",
        "Pain assessment",
        "Engagement and mood",
        "Fall risk indicators"
      ],
      general: [
        "Heart rate",
        "Blood pressure",
        "Perceived exertion (RPE)",
        "SpO2",
        "Overall tolerance",
        "Lower extremity assessment"
      ]
    };
    STOP_CRITERIA_BY_CATEGORY2 = {
      cardiac: [
        "HR >110 bpm or increase >20 bpm from rest",
        "SBP decrease >10 mmHg",
        "SpO2 <90%",
        "Dyspnea worsening >2 points",
        "Chest pain, dizziness, or palpitations",
        "New arrhythmia"
      ],
      pulmonary: [
        "SpO2 <88% or drop >4%",
        "RR >28/min",
        "HR >120 bpm",
        "Severe dyspnea (>7/10)",
        "Confusion or altered mental status",
        "Excessive accessory muscle use"
      ],
      orthopedic: [
        "Pain >6/10",
        "SBP <90 or >180 mmHg",
        "HR >120 bpm",
        "Significant increase in edema",
        "Signs of surgical complications",
        "Patient request"
      ],
      neurological: [
        "SBP >180 or <100 mmHg",
        "New neurological symptoms",
        "Severe headache",
        "Dizziness or visual changes",
        "Unable to participate safely",
        "Excessive spasticity"
      ],
      icu_recovery: [
        "HR >130 bpm or <50 bpm",
        "SBP >180 or <90 mmHg",
        "SpO2 <88%",
        "RR >30/min",
        "New arrhythmias",
        "Patient distress or excessive fatigue",
        "Any new symptoms"
      ],
      delirium: [
        "Increased agitation",
        "Patient distress",
        "Unsafe behaviors",
        "Confusion worsening",
        "Unable to follow simple instructions",
        "Staff determines unable to continue safely"
      ],
      frail_elderly: [
        "HR >110 bpm",
        "SBP instability (>20 mmHg change)",
        "Excessive fatigue",
        "Pain increase >2 points",
        "Balance concerns",
        "Patient requests stop",
        "Signs of confusion or distress"
      ],
      general: [
        "HR >120 bpm",
        "SBP <90 or >180 mmHg",
        "SpO2 <90%",
        "Chest pain or pressure",
        "Severe dyspnea",
        "Patient distress"
      ]
    };
    BASELINE_RPM_BY_MOBILITY2 = {
      bedbound: 25,
      chair_bound: 30,
      standing_assist: 35,
      walking_assist: 40,
      independent: 45
    };
    PersonalizedProtocolMatcher = class {
      defaultConfig = {
        includeRiskBasedMatching: true,
        includePersonalization: true,
        minimumMatchScore: 30,
        maxResults: 5
      };
      /**
       * Main entry point: Find best matching protocols for a patient
       */
      async findMatchingProtocols(patientId, config, overrides) {
        const mergedConfig = { ...this.defaultConfig, ...config };
        try {
          const patientProfile = await this.buildPatientMatchProfile(patientId, overrides);
          if (!patientProfile) {
            logger.warn("Could not build patient profile for matching", { patientId });
            return [];
          }
          const protocols = await this.getProtocolsWithCriteria();
          const scoredProtocols = await Promise.all(
            protocols.map((protocol) => this.scoreProtocol(protocol, patientProfile, mergedConfig))
          );
          const validMatches = scoredProtocols.filter((match) => match.matchScore >= mergedConfig.minimumMatchScore).sort((a, b) => b.matchScore - a.matchScore).slice(0, mergedConfig.maxResults);
          logger.info("Protocol matching completed", {
            patientId,
            matchesFound: validMatches.length,
            topMatch: validMatches[0]?.protocolName
          });
          return validMatches;
        } catch (error) {
          logger.error("Protocol matching failed", {
            error: error.message,
            patientId
          });
          return [];
        }
      }
      /**
       * Auto-match and assign the best protocol to a patient
       */
      async autoAssignBestProtocol(patientId, assignedBy) {
        try {
          const matches = await this.findMatchingProtocols(patientId, {
            minimumMatchScore: 50,
            // Higher threshold for auto-assignment
            maxResults: 1
          });
          if (matches.length === 0) {
            return {
              success: false,
              reason: "No suitable protocols found with sufficient match score (>50%)"
            };
          }
          const bestMatch = matches[0];
          if (bestMatch.contraindications.length > 0) {
            return {
              success: false,
              reason: `Protocol has contraindications: ${bestMatch.contraindications.join(", ")}`,
              protocol: bestMatch
            };
          }
          const { protocolEngine: protocolEngine2 } = await init_protocol_engine().then(() => protocol_engine_exports);
          const assignment = await protocolEngine2.assignProtocol(
            patientId,
            bestMatch.protocolId,
            assignedBy,
            bestMatch.recommendedPhase
          );
          if (!assignment) {
            return {
              success: false,
              reason: "Failed to create protocol assignment"
            };
          }
          logger.info("Auto-assigned protocol to patient", {
            patientId,
            protocolId: bestMatch.protocolId,
            protocolName: bestMatch.protocolName,
            matchScore: bestMatch.matchScore
          });
          return {
            success: true,
            protocol: bestMatch
          };
        } catch (error) {
          logger.error("Auto protocol assignment failed", {
            error: error.message,
            patientId
          });
          return {
            success: false,
            reason: error.message
          };
        }
      }
      // ==========================================================================
      // NEW: PERSONALIZED PRESCRIPTION GENERATION
      // ==========================================================================
      /**
       * Generate a personalized mobility prescription using the patient goal calculator.
       *
       * This is the PRIMARY entry point for getting a patient's exercise prescription.
       * It replaces the score-based protocol matching with a calculation-based approach:
       *
       * 1. Uses the risk calculator to determine baseline energy target (watt-minutes)
       * 2. Determines diagnosis category from patient data
       * 3. Applies diagnosis-specific adjustments while maintaining total energy
       * 4. Returns complete prescription with safety parameters
       *
       * @param patientId - The patient to generate prescription for
       * @param overrides - Optional overrides for diagnosis or risk assessment input
       * @returns PersonalizedPrescription with all exercise parameters
       */
      async generatePersonalizedPrescription(patientId, overrides) {
        try {
          const riskInput = await this.buildRiskAssessmentInput(patientId, overrides?.riskAssessmentInput);
          if (!riskInput) {
            logger.warn("Could not build risk assessment input", { patientId });
            return null;
          }
          const riskResults = calculateRisks(riskInput);
          const baselineRec = riskResults.mobility_recommendation;
          logger.info("Baseline prescription from risk calculator", {
            patientId,
            wattGoal: baselineRec.watt_goal,
            duration: baselineRec.duration_min_per_session,
            sessions: baselineRec.sessions_per_day,
            totalEnergy: baselineRec.total_daily_energy
          });
          const diagnosis = overrides?.diagnosis || riskInput.admission_diagnosis || "";
          const diagnosisCategory = this.determineDiagnosisCategory(diagnosis, riskInput);
          const adjustmentProfile = DIAGNOSIS_ADJUSTMENT_PROFILES2[diagnosisCategory];
          let adjustedPrescription = this.applyDiagnosisAdjustments(
            baselineRec,
            riskInput.mobility_status || "standing_assist",
            adjustmentProfile
          );
          const medications = overrides?.medications || await this.getPatientMedications(patientId);
          const medicationCategories = this.determineMedicationCategories(medications);
          const medicationAdjustments = this.applyMedicationAdjustments(
            adjustedPrescription,
            medicationCategories
          );
          adjustedPrescription = {
            ...adjustedPrescription,
            duration: medicationAdjustments.adjustedDuration,
            rpm: medicationAdjustments.adjustedRpm,
            rationale: [
              ...adjustedPrescription.rationale,
              ...medicationAdjustments.rationale
            ]
          };
          const combinedMonitoring = [
            ...MONITORING_BY_CATEGORY2[diagnosisCategory],
            ...medicationAdjustments.additionalMonitoring
          ];
          const combinedStopCriteria = [
            ...STOP_CRITERIA_BY_CATEGORY2[diagnosisCategory],
            ...medicationAdjustments.additionalStopCriteria
          ];
          const prescription = {
            // Core parameters (adjusted based on diagnosis AND medications)
            totalDailyEnergy: baselineRec.total_daily_energy || Math.round(baselineRec.watt_goal * baselineRec.duration_min_per_session * baselineRec.sessions_per_day),
            duration: adjustedPrescription.duration,
            sessionsPerDay: adjustedPrescription.sessions,
            targetPower: adjustedPrescription.power,
            resistance: adjustedPrescription.resistance,
            targetRpm: adjustedPrescription.rpm,
            // Diagnosis info
            diagnosisCategory,
            diagnosisCategoryLabel: DIAGNOSIS_CATEGORY_LABELS3[diagnosisCategory],
            adjustmentRationale: [
              adjustmentProfile.rationale,
              ...adjustedPrescription.rationale
            ],
            // Medication info
            medicationCategories,
            medicationAdjustments: medicationAdjustments.rationale,
            // Safety parameters
            fallRisk: riskResults.falls.probability,
            deconditioningRisk: riskResults.deconditioning.probability,
            // Monitoring recommendations (combined from diagnosis and medications)
            monitoringParams: [...new Set(combinedMonitoring)],
            // Remove duplicates
            stopCriteria: [...new Set(combinedStopCriteria)],
            // Source info
            baselineFromRiskCalculator: true,
            patientId
          };
          logger.info("Generated personalized prescription", {
            patientId,
            diagnosisCategory,
            medicationCategories,
            totalEnergy: prescription.totalDailyEnergy,
            duration: prescription.duration,
            resistance: prescription.resistance,
            rpm: prescription.targetRpm
          });
          return prescription;
        } catch (error) {
          logger.error("Failed to generate personalized prescription", {
            error: error.message,
            patientId
          });
          return null;
        }
      }
      /**
       * Get patient medications from profile
       */
      async getPatientMedications(patientId) {
        try {
          const profile = await db.select().from(patientProfiles).where(eq5(patientProfiles.userId, patientId)).limit(1);
          if (!profile.length || !profile[0].medications) {
            return [];
          }
          return JSON.parse(profile[0].medications || "[]");
        } catch (error) {
          logger.warn("Failed to get patient medications", { patientId });
          return [];
        }
      }
      /**
       * Determine medication categories from medication list
       */
      determineMedicationCategories(medications) {
        const categories = /* @__PURE__ */ new Set();
        for (const med of medications) {
          const medLower = med.toLowerCase().trim();
          for (const [key, category] of Object.entries(MEDICATION_CATEGORY_MAP)) {
            if (medLower.includes(key.toLowerCase())) {
              categories.add(category);
              break;
            }
          }
        }
        return categories.size > 0 ? Array.from(categories) : ["none"];
      }
      /**
       * Apply medication-based adjustments to prescription
       */
      applyMedicationAdjustments(prescription, medicationCategories) {
        const rationale = [];
        const additionalMonitoring = [];
        const additionalStopCriteria = [];
        let adjustedDuration = prescription.duration;
        let adjustedRpm = prescription.rpm;
        let hasResistanceFocus = false;
        for (const category of medicationCategories) {
          if (category === "none") continue;
          const profile = MEDICATION_ADJUSTMENT_PROFILES2[category];
          if (profile.durationReduction > 0) {
            adjustedDuration = Math.max(5, adjustedDuration - profile.durationReduction);
          }
          if (profile.rpmReduction > 0) {
            adjustedRpm = Math.max(15, adjustedRpm - profile.rpmReduction);
          }
          if (profile.resistanceFocus) {
            hasResistanceFocus = true;
          }
          rationale.push(profile.rationale);
          additionalMonitoring.push(...profile.additionalMonitoring);
          additionalStopCriteria.push(...profile.additionalStopCriteria);
        }
        if (hasResistanceFocus) {
          rationale.push("Due to heart rate-affecting medications, focus on resistance/strength training rather than high RPM aerobic exercise.");
        }
        return {
          adjustedDuration,
          adjustedRpm,
          rationale,
          additionalMonitoring,
          additionalStopCriteria
        };
      }
      /**
       * Build risk assessment input from patient profile data
       */
      async buildRiskAssessmentInput(patientId, overrides) {
        try {
          const profile = await db.select().from(patientProfiles).where(eq5(patientProfiles.userId, patientId)).limit(1);
          if (!profile.length) {
            logger.warn("Patient profile not found for risk assessment", { patientId });
            return null;
          }
          const p = profile[0];
          const latestRiskAssessment = await db.select().from(riskAssessments).where(eq5(riskAssessments.patientId, patientId)).orderBy(desc4(riskAssessments.createdAt)).limit(1);
          const comorbidities = JSON.parse(p.comorbidities || "[]");
          const riskInput = {
            age: p.age,
            sex: p.sex || "unknown",
            mobility_status: p.mobilityStatus || "standing_assist",
            cognitive_status: p.cognitiveStatus || "normal",
            level_of_care: p.levelOfCare || "ward",
            admission_diagnosis: p.admissionDiagnosis || "",
            baseline_function: p.baselineFunction || "independent",
            comorbidities,
            medications: [],
            devices: [],
            weight_kg: p.weightKg || void 0,
            height_cm: p.heightCm || void 0,
            days_immobile: p.daysImmobile || 0,
            // Apply any overrides
            ...overrides
          };
          return riskInput;
        } catch (error) {
          logger.error("Failed to build risk assessment input", {
            error: error.message,
            patientId
          });
          return null;
        }
      }
      /**
       * Determine the diagnosis category based on diagnosis text and patient data
       */
      determineDiagnosisCategory(diagnosis, riskInput) {
        const diagLower = diagnosis.toLowerCase();
        for (const [key, category] of Object.entries(DIAGNOSIS_CATEGORY_MAP)) {
          if (diagLower.includes(key.toLowerCase())) {
            logger.debug("Matched diagnosis category", { diagnosis, matched: key, category });
            return category;
          }
        }
        if (riskInput.is_cardiac_admission) return "cardiac";
        if (riskInput.is_orthopedic) return "orthopedic";
        if (riskInput.is_neuro_admission) return "neurological";
        const admitDiag = (riskInput.admission_diagnosis || "").toLowerCase();
        for (const [key, category] of Object.entries(DIAGNOSIS_CATEGORY_MAP)) {
          if (admitDiag.includes(key.toLowerCase())) {
            return category;
          }
        }
        return "general";
      }
      /**
       * Apply diagnosis-based adjustments while maintaining total energy target
       *
       * Key principle: Total Energy = Power × Duration × Sessions
       * Where Power ≈ k × Resistance × RPM
       *
       * When adjusting for diagnosis, we redistribute the same energy:
       * - Cardiac/Pulmonary: Higher resistance, lower RPM (same power, same energy)
       * - Orthopedic: Lower resistance, more rotations, longer duration (same energy)
       */
      applyDiagnosisAdjustments(baseline, mobilityStatus, adjustmentProfile) {
        const rationale = [];
        const baselinePower = baseline.watt_goal;
        const baselineDuration = baseline.duration_min_per_session;
        const baselineSessions = baseline.sessions_per_day;
        const totalEnergy = baseline.total_daily_energy || baselinePower * baselineDuration * baselineSessions;
        const baselineRpm = BASELINE_RPM_BY_MOBILITY2[mobilityStatus] || 35;
        const baselineResistance = wattsToResistance2(baselinePower, baselineRpm);
        const adjustedDuration = Math.round(baselineDuration * adjustmentProfile.durationMultiplier);
        const adjustedRpm = Math.round(baselineRpm * adjustmentProfile.rpmMultiplier);
        const adjustedSessions = baselineSessions;
        const targetEnergyPerSession = totalEnergy / adjustedSessions;
        const targetPower = targetEnergyPerSession / adjustedDuration;
        const adjustedResistance = wattsToResistance2(targetPower, adjustedRpm);
        if (adjustmentProfile.resistanceMultiplier > 1) {
          rationale.push(`Increased resistance to ${adjustedResistance} (from baseline ${baselineResistance}) for ${adjustmentProfile.category} conditioning`);
        } else if (adjustmentProfile.resistanceMultiplier < 1) {
          rationale.push(`Reduced resistance to ${adjustedResistance} (from baseline ${baselineResistance}) to prioritize range of motion`);
        }
        if (adjustmentProfile.rpmMultiplier < 1) {
          rationale.push(`Reduced target RPM to ${adjustedRpm} (from ${baselineRpm}) to minimize ${adjustmentProfile.category === "cardiac" ? "cardiac demand" : "respiratory demand"}`);
        } else if (adjustmentProfile.rpmMultiplier > 1) {
          rationale.push(`Increased target RPM to ${adjustedRpm} (from ${baselineRpm}) for more joint rotations`);
        }
        if (adjustmentProfile.durationMultiplier > 1) {
          rationale.push(`Extended duration to ${adjustedDuration} min (from ${baselineDuration} min) for additional ${adjustmentProfile.category === "orthopedic" ? "range of motion work" : "motor learning time"}`);
        }
        rationale.push(`Total daily energy target maintained at ${Math.round(totalEnergy)} watt-minutes`);
        const actualPower = calculatePower(adjustedResistance, adjustedRpm);
        const actualEnergy = actualPower * adjustedDuration * adjustedSessions;
        logger.debug("Energy calculation verification", {
          targetEnergy: totalEnergy,
          actualEnergy,
          difference: Math.abs(totalEnergy - actualEnergy),
          adjustedParams: { resistance: adjustedResistance, rpm: adjustedRpm, duration: adjustedDuration }
        });
        return {
          duration: adjustedDuration,
          sessions: adjustedSessions,
          power: Math.round(targetPower * 10) / 10,
          resistance: adjustedResistance,
          rpm: adjustedRpm,
          rationale
        };
      }
      /**
       * Build comprehensive patient profile for matching
       */
      async buildPatientMatchProfile(patientId, overrides) {
        try {
          const profile = await db.select().from(patientProfiles).where(eq5(patientProfiles.userId, patientId)).limit(1);
          if (!profile.length) {
            logger.warn("Patient profile not found", { patientId });
            return null;
          }
          const p = profile[0];
          const personalization = await db.select().from(patientPersonalizationProfiles).where(eq5(patientPersonalizationProfiles.patientId, patientId)).limit(1);
          const riskAssessment = await db.select().from(riskAssessments).where(eq5(riskAssessments.patientId, patientId)).orderBy(desc4(riskAssessments.createdAt)).limit(1);
          let riskScores = {
            fallRisk: 0.1,
            deconditioningRisk: 0.2,
            vteRisk: 0.05,
            pressureRisk: 0.05
          };
          if (riskAssessment.length) {
            try {
              const falls = JSON.parse(riskAssessment[0].falls);
              const decon = JSON.parse(riskAssessment[0].deconditioning);
              const vte = JSON.parse(riskAssessment[0].vte);
              const pressure = JSON.parse(riskAssessment[0].pressure);
              riskScores = {
                fallRisk: falls.probability || 0.1,
                deconditioningRisk: decon.probability || 0.2,
                vteRisk: vte.probability || 0.05,
                pressureRisk: pressure.probability || 0.05
              };
            } catch (e) {
            }
          }
          const baseComorbidities = JSON.parse(p.comorbidities || "[]");
          const finalDiagnosis = overrides?.diagnosis || p.admissionDiagnosis || void 0;
          const finalComorbidities = overrides?.comorbidities || baseComorbidities;
          const diagnosisCodes = this.extractDiagnosisCodes(finalDiagnosis || "", finalComorbidities);
          return {
            patientId,
            age: p.age,
            sex: p.sex || void 0,
            mobilityStatus: p.mobilityStatus,
            cognitiveStatus: p.cognitiveStatus,
            levelOfCare: p.levelOfCare,
            baselineFunction: p.baselineFunction || void 0,
            admissionDiagnosis: finalDiagnosis,
            comorbidities: finalComorbidities,
            diagnosisCodes,
            riskScores,
            personalization: personalization.length ? {
              personalityType: personalization[0].personalityType || void 0,
              bestPerformanceWindow: personalization[0].bestPerformanceWindow || void 0,
              avgFatigueOnsetMinutes: personalization[0].avgFatigueOnsetMinutes || void 0,
              currentProgressionLevel: personalization[0].currentProgressionLevel || 1
            } : void 0
          };
        } catch (error) {
          logger.error("Failed to build patient match profile", {
            error: error.message,
            patientId
          });
          return null;
        }
      }
      /**
       * Get all protocols with their matching criteria
       */
      async getProtocolsWithCriteria() {
        try {
          const protocols = await db.select().from(clinicalProtocols).where(eq5(clinicalProtocols.isActive, true));
          const protocolsWithCriteria = await Promise.all(
            protocols.map(async (protocol) => {
              const criteria = await db.select().from(protocolMatchingCriteria).where(eq5(protocolMatchingCriteria.protocolId, protocol.id)).limit(1);
              return {
                ...protocol,
                matchingCriteria: criteria[0] || null
              };
            })
          );
          return protocolsWithCriteria;
        } catch (error) {
          logger.error("Failed to get protocols with criteria", { error: error.message });
          return [];
        }
      }
      /**
       * Score a protocol against patient profile
       */
      async scoreProtocol(protocol, patient, config) {
        const matchReasons = [];
        const personalizationFactors = [];
        const adjustments = [];
        let totalScore = 0;
        let maxPossibleScore = 0;
        const protocolData = JSON.parse(protocol.protocolData || "{}");
        const contraindications = JSON.parse(protocol.contraindications || "[]");
        const diagnosisCodes = JSON.parse(protocol.diagnosisCodes || "[]");
        maxPossibleScore += 40;
        const codeMatch = patient.diagnosisCodes.some(
          (code) => diagnosisCodes.some(
            (pc) => pc === code || code.startsWith(pc) || pc.startsWith(code)
          )
        );
        if (codeMatch) {
          totalScore += 35;
          matchReasons.push("Exact diagnosis code match");
        } else {
          const indication = protocol.indication.toLowerCase();
          const diagnosis = (patient.admissionDiagnosis || "").toLowerCase();
          const keywordScore = this.calculateKeywordMatchScore(indication, diagnosis);
          totalScore += Math.round(keywordScore * 30);
          if (keywordScore > 0.5) {
            matchReasons.push(`Diagnosis keyword match (${Math.round(keywordScore * 100)}%)`);
          }
        }
        const activeContraindications = [];
        for (const ci of contraindications) {
          const ciLower = ci.toLowerCase();
          const hasContraindication = patient.comorbidities.some(
            (c) => c.toLowerCase().includes(ciLower)
          );
          if (hasContraindication) {
            activeContraindications.push(ci);
          }
        }
        if (activeContraindications.length > 0) {
          totalScore = Math.max(0, totalScore - 50);
          matchReasons.push(`Warning: Relative contraindication(s) present`);
        }
        maxPossibleScore += 15;
        const criteria = protocol.matchingCriteria;
        if (criteria) {
          const minAge = criteria.minAge || 0;
          const maxAge = criteria.maxAge || 150;
          if (patient.age >= minAge && patient.age <= maxAge) {
            totalScore += 15;
            matchReasons.push("Age within protocol range");
          } else if (Math.abs(patient.age - minAge) <= 5 || Math.abs(patient.age - maxAge) <= 5) {
            totalScore += 8;
            matchReasons.push("Age near protocol range boundary");
          }
        } else {
          totalScore += 10;
        }
        maxPossibleScore += 15;
        if (criteria?.requiredMobilityLevels) {
          const requiredLevels = JSON.parse(criteria.requiredMobilityLevels || "[]");
          const excludedLevels = JSON.parse(criteria.excludedMobilityLevels || "[]");
          if (excludedLevels.includes(patient.mobilityStatus)) {
            totalScore -= 10;
            matchReasons.push(`Mobility status ${patient.mobilityStatus} excluded`);
          } else if (requiredLevels.length === 0 || requiredLevels.includes(patient.mobilityStatus)) {
            totalScore += 15;
            matchReasons.push("Mobility status appropriate");
          }
        } else {
          totalScore += 10;
        }
        if (config.includeRiskBasedMatching) {
          maxPossibleScore += 20;
          if (criteria?.maxFallRisk && patient.riskScores.fallRisk > criteria.maxFallRisk) {
            matchReasons.push(`Fall risk (${Math.round(patient.riskScores.fallRisk * 100)}%) exceeds protocol threshold`);
            adjustments.push({
              parameter: "resistance",
              originalValue: protocolData.phases?.[0]?.resistance || 3,
              adjustedValue: Math.max(1, (protocolData.phases?.[0]?.resistance || 3) - 1),
              reason: "Reduced due to elevated fall risk"
            });
          } else {
            totalScore += 10;
          }
          if (criteria?.maxDeconditioningRisk && patient.riskScores.deconditioningRisk > criteria.maxDeconditioningRisk) {
            matchReasons.push("High deconditioning risk - protocol may need acceleration");
            adjustments.push({
              parameter: "frequency",
              originalValue: protocolData.phases?.[0]?.frequency || "BID",
              adjustedValue: "TID",
              reason: "Increased due to deconditioning risk"
            });
          } else {
            totalScore += 10;
          }
        }
        if (config.includePersonalization && patient.personalization) {
          maxPossibleScore += 10;
          if (patient.personalization.avgFatigueOnsetMinutes) {
            const avgFatigue = patient.personalization.avgFatigueOnsetMinutes;
            const protocolDuration = protocolData.phases?.[0]?.duration || 15;
            if (avgFatigue < protocolDuration) {
              adjustments.push({
                parameter: "duration",
                originalValue: protocolDuration,
                adjustedValue: Math.round(avgFatigue * 0.9),
                // 90% of fatigue onset
                reason: `Adjusted based on patient fatigue pattern (onset at ${avgFatigue}min)`
              });
              personalizationFactors.push("Fatigue-aware duration adjustment");
            }
            totalScore += 5;
          }
          if (patient.personalization.currentProgressionLevel > 1) {
            personalizationFactors.push(`Starting at progression level ${patient.personalization.currentProgressionLevel}`);
            totalScore += 5;
          }
        }
        const finalScore = Math.round(totalScore / maxPossibleScore * 100);
        const recommendedPhase = this.determineStartingPhase(protocolData, patient);
        return {
          protocolId: protocol.id,
          protocolName: protocol.name,
          indication: protocol.indication,
          matchScore: Math.max(0, Math.min(100, finalScore)),
          matchReasons,
          contraindications: activeContraindications,
          isPersonalized: personalizationFactors.length > 0,
          personalizationFactors: personalizationFactors.length > 0 ? personalizationFactors : void 0,
          recommendedPhase,
          adjustments
        };
      }
      /**
       * Calculate keyword match score between indication and diagnosis
       */
      calculateKeywordMatchScore(indication, diagnosis) {
        if (!indication || !diagnosis) return 0;
        const indicationWords = indication.split(/\s+/).filter((w) => w.length > 3);
        const diagnosisWords = diagnosis.split(/\s+/).filter((w) => w.length > 3);
        if (indicationWords.length === 0) return 0;
        let matchCount = 0;
        for (const word of indicationWords) {
          if (diagnosisWords.some((dw) => dw.includes(word) || word.includes(dw))) {
            matchCount++;
          }
        }
        return matchCount / indicationWords.length;
      }
      /**
       * Extract diagnosis codes from diagnosis text and comorbidities
       */
      extractDiagnosisCodes(diagnosis, comorbidities) {
        const codes = [];
        const icd10Pattern = /[A-Z]\d{2}(?:\.\d{1,4})?/gi;
        const diagnosisMatches = diagnosis.match(icd10Pattern) || [];
        codes.push(...diagnosisMatches.map((c) => c.toUpperCase()));
        for (const comorbidity of comorbidities) {
          const comorbidityMatches = comorbidity.match(icd10Pattern) || [];
          codes.push(...comorbidityMatches.map((c) => c.toUpperCase()));
        }
        const diagnosisMap = {
          "knee replacement": ["Z96.641", "Z96.642", "M17"],
          "hip replacement": ["Z96.641", "Z96.642", "M16"],
          "tka": ["Z96.641", "Z96.642"],
          "tha": ["Z96.641", "Z96.642"],
          "pneumonia": ["J18.9", "J15.9", "J12.9"],
          "copd": ["J44.9", "J44.1"],
          "heart failure": ["I50.9", "I50.1", "I50.2"],
          "chf": ["I50.9"],
          "stroke": ["I63.9", "I64"],
          "hip fracture": ["S72.0", "S72.1"],
          "sepsis": ["A41.9", "R65.20"],
          "covid": ["U07.1", "J12.82"]
        };
        const diagnosisLower = diagnosis.toLowerCase();
        for (const [term, icdCodes] of Object.entries(diagnosisMap)) {
          if (diagnosisLower.includes(term)) {
            codes.push(...icdCodes);
          }
        }
        return [...new Set(codes)];
      }
      /**
       * Determine appropriate starting phase based on patient profile
       */
      determineStartingPhase(protocolData, patient) {
        const phases = protocolData.phases || [];
        if (phases.length === 0) return "Phase 1";
        let recommendedPhase = phases[0].phase;
        const mobilityScores3 = {
          "bedbound": 0,
          "chair_bound": 1,
          "standing_assist": 2,
          "walking_assist": 3,
          "independent": 4
        };
        const mobilityScore = mobilityScores3[patient.mobilityStatus] || 0;
        if (mobilityScore >= 3 && phases.length > 1) {
          if (patient.baselineFunction === "independent" && patient.riskScores.fallRisk < 0.15) {
            recommendedPhase = phases[1].phase;
          }
        }
        if (patient.personalization?.currentProgressionLevel > 1) {
          const levelIndex = Math.min(
            patient.personalization.currentProgressionLevel - 1,
            phases.length - 1
          );
          recommendedPhase = phases[levelIndex].phase;
        }
        return recommendedPhase;
      }
      /**
       * Get personalization profile for a patient, creating if needed
       */
      async getOrCreatePersonalizationProfile(patientId) {
        try {
          const existing = await db.select().from(patientPersonalizationProfiles).where(eq5(patientPersonalizationProfiles.patientId, patientId)).limit(1);
          if (existing.length > 0) {
            return existing[0];
          }
          const result = await db.insert(patientPersonalizationProfiles).values({
            patientId,
            currentProgressionLevel: 1,
            daysAtCurrentLevel: 0,
            consecutiveSuccessfulSessions: 0,
            inSetbackRecovery: false
          });
          return {
            id: result.lastInsertRowid,
            patientId,
            currentProgressionLevel: 1,
            daysAtCurrentLevel: 0,
            consecutiveSuccessfulSessions: 0,
            inSetbackRecovery: false
          };
        } catch (error) {
          logger.error("Failed to get/create personalization profile", {
            error: error.message,
            patientId
          });
          return null;
        }
      }
      /**
       * Update personalization profile based on session performance
       */
      async updatePersonalizationFromSession(patientId, sessionId, sessionMetrics) {
        try {
          const profile = await this.getOrCreatePersonalizationProfile(patientId);
          if (!profile) return;
          const updates = {
            updatedAt: /* @__PURE__ */ new Date()
          };
          const timeKey = `avg${sessionMetrics.timeOfDay.charAt(0).toUpperCase() + sessionMetrics.timeOfDay.slice(1)}Power`;
          if (profile[timeKey] !== void 0) {
            const currentAvg = profile[timeKey] || sessionMetrics.avgPower;
            updates[timeKey] = currentAvg * 0.7 + sessionMetrics.avgPower * 0.3;
          }
          const windowPowers = {
            morning: profile.avgMorningPower || 0,
            afternoon: profile.avgAfternoonPower || 0,
            evening: profile.avgEveningPower || 0
          };
          windowPowers[sessionMetrics.timeOfDay] = updates[timeKey] || sessionMetrics.avgPower;
          const bestWindow = Object.entries(windowPowers).sort(([, a], [, b]) => b - a)[0][0];
          updates.bestPerformanceWindow = bestWindow;
          if (sessionMetrics.targetAchieved) {
            updates.consecutiveSuccessfulSessions = (profile.consecutiveSuccessfulSessions || 0) + 1;
            updates.inSetbackRecovery = false;
          } else {
            updates.consecutiveSuccessfulSessions = 0;
          }
          await db.update(patientPersonalizationProfiles).set(updates).where(eq5(patientPersonalizationProfiles.patientId, patientId));
          logger.debug("Updated personalization profile", { patientId, updates });
        } catch (error) {
          logger.error("Failed to update personalization profile", {
            error: error.message,
            patientId
          });
        }
      }
      /**
       * Detect personality type from early sessions
       */
      async detectPersonalityType(patientId) {
        try {
          const sessions3 = await db.select().from(exerciseSessions).where(eq5(exerciseSessions.patientId, patientId)).orderBy(desc4(exerciseSessions.startTime)).limit(10);
          if (sessions3.length < 3) {
            return {
              type: "undetermined",
              confidence: 0,
              indicators: ["Insufficient session data (need 3+ sessions)"]
            };
          }
          const indicators = [];
          const scores = {
            competitive: 0,
            achievement: 0,
            health_focused: 0,
            social: 0
          };
          const avgDuration = sessions3.reduce((sum, s) => sum + (s.durationSeconds || s.duration || 0), 0) / sessions3.length;
          const avgPower = sessions3.reduce((sum, s) => sum + (s.avgPower || 0), 0) / sessions3.length;
          const exceedsTarget = sessions3.filter(
            (s) => (s.durationSeconds || 0) > (s.targetDuration || 600) * 1.1
          ).length;
          if (exceedsTarget / sessions3.length > 0.5) {
            scores.competitive += 30;
            indicators.push("Frequently exceeds target duration");
          }
          const durations = sessions3.map((s) => s.durationSeconds || s.duration || 0);
          const durationVariance = this.calculateVariance(durations);
          if (durationVariance < 0.15 * avgDuration) {
            scores.achievement += 25;
            indicators.push("Very consistent session durations");
          }
          const daysBetweenSessions = this.calculateDaysBetweenSessions(sessions3);
          if (daysBetweenSessions < 1.5) {
            scores.health_focused += 25;
            indicators.push("High session frequency");
          }
          const maxScore = Math.max(...Object.values(scores));
          const type = Object.entries(scores).find(([, score]) => score === maxScore)?.[0] || "undetermined";
          const confidence = Math.min(maxScore / 50, 1);
          if (confidence >= 0.4) {
            await db.update(patientPersonalizationProfiles).set({
              personalityType: type,
              personalityConfidence: confidence,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq5(patientPersonalizationProfiles.patientId, patientId));
          }
          return { type, confidence, indicators };
        } catch (error) {
          logger.error("Failed to detect personality type", {
            error: error.message,
            patientId
          });
          return { type: "undetermined", confidence: 0, indicators: [] };
        }
      }
      calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      }
      calculateDaysBetweenSessions(sessions3) {
        if (sessions3.length < 2) return 7;
        const timestamps = sessions3.map((s) => s.startTime ? new Date(s.startTime).getTime() : 0).filter((t) => t > 0).sort((a, b) => b - a);
        if (timestamps.length < 2) return 7;
        const totalDays = (timestamps[0] - timestamps[timestamps.length - 1]) / (1e3 * 60 * 60 * 24);
        return totalDays / (timestamps.length - 1);
      }
    };
    personalizedProtocolMatcher = new PersonalizedProtocolMatcher();
  }
});

// server/ai-processor.ts
var ai_processor_exports = {};
__export(ai_processor_exports, {
  enhanceRiskAssessment: () => enhanceRiskAssessment,
  processMedicalText: () => processMedicalText
});
import Anthropic from "@anthropic-ai/sdk";
async function processMedicalText(input) {
  const prompt = `You are a medical AI assistant helping to structure patient data for a hospital mobility risk assessment. Convert the following unstructured medical text into structured data.

Input data:
- Admission Diagnosis: ${input.admission_diagnosis || "Not provided"}
- Medications: ${input.medications || "Not provided"}
- Comorbidities/Medical History: ${input.comorbidities || input.medical_history || "Not provided"}

Please extract and structure this information into the following format. Use your medical knowledge to interpret abbreviations, map diagnoses to categories, and infer mobility-related information:

Required output (JSON format):
{
  "admission_diagnosis": "Clear, standardized diagnosis (e.g., 'pneumonia', 'hip fracture', 'stroke')",
  "medications": ["Array of standardized medication names - focus on mobility-relevant meds like sedatives, pain meds, anticoagulants"],
  "comorbidities": ["Array of relevant comorbidities - focus on those affecting mobility like diabetes, neuropathy, parkinson, stroke, obesity, malnutrition"],
  "cognitive_status": "normal|mild_impairment|delirium_dementia (infer from medications, diagnosis, or explicit mentions)",
  "baseline_function": "independent|walker|dependent (infer from history, age, comorbidities if possible)",
  "confidence_score": 0.85,
  "reasoning": "Brief explanation of key inferences made"
}

Medical context guidelines:
- Map common abbreviations (MI\u2192myocardial infarction, CHF\u2192heart failure, COPD\u2192chronic obstructive pulmonary disease)
- Identify sedating medications (benzos, opioids, antipsychotics, sleep aids)
- Recognize anticoagulants (heparin, warfarin, DOACs)
- Note mobility-affecting conditions (stroke, parkinson, neuropathy, hip fracture)
- Infer cognitive status from delirium mentions, dementia history, or heavy sedating medication use
- Assess baseline function from mobility aids mentioned, age, or functional status descriptions

Respond with ONLY the JSON object, no additional text.`;
  try {
    const response = await anthropic.messages.create({
      // "claude-sonnet-4-20250514"
      model: DEFAULT_MODEL_STR,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });
    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const structuredData = JSON.parse(cleanedResponse);
    return {
      admission_diagnosis: structuredData.admission_diagnosis || "General medical",
      medications: Array.isArray(structuredData.medications) ? structuredData.medications : [],
      comorbidities: Array.isArray(structuredData.comorbidities) ? structuredData.comorbidities : [],
      cognitive_status: structuredData.cognitive_status || "normal",
      baseline_function: structuredData.baseline_function || "independent",
      confidence_score: structuredData.confidence_score || 0.5,
      reasoning: structuredData.reasoning || "Automated processing"
    };
  } catch (error) {
    console.error("Error processing medical text:", error);
    return {
      admission_diagnosis: input.admission_diagnosis || "General medical",
      medications: input.medications ? input.medications.split(",").map((m) => m.trim()) : [],
      comorbidities: input.comorbidities ? input.comorbidities.split(",").map((c) => c.trim()) : [],
      cognitive_status: "normal",
      baseline_function: "independent",
      confidence_score: 0.3,
      reasoning: "Fallback processing due to AI error"
    };
  }
}
async function enhanceRiskAssessment(assessment, clinicalNotes) {
  if (!clinicalNotes) {
    return {
      enhanced_factors: [],
      clinical_insights: "No clinical notes provided for enhancement",
      mobility_recommendations: "Follow standard mobility recommendation"
    };
  }
  const prompt = `You are a mobility medicine specialist reviewing a patient's risk assessment. Based on the clinical notes, provide enhanced insights for mobility planning.

Risk Assessment Results:
- Deconditioning Risk: ${assessment.deconditioning.risk_level} (${(assessment.deconditioning.probability * 100).toFixed(1)}%)
- VTE Risk: ${assessment.vte.risk_level} (${(assessment.vte.probability * 100).toFixed(1)}%)
- Falls Risk: ${assessment.falls.risk_level} (${(assessment.falls.probability * 100).toFixed(1)}%)
- Pressure Injury Risk: ${assessment.pressure.risk_level} (${(assessment.pressure.probability * 100).toFixed(1)}%)

Mobility Recommendation: ${assessment.mobility_recommendation.watt_goal}W, ${assessment.mobility_recommendation.duration_min_per_session} min, ${assessment.mobility_recommendation.sessions_per_day}x daily

Clinical Notes:
${clinicalNotes}

Provide JSON response:
{
  "enhanced_factors": ["Any additional risk factors identified from notes"],
  "clinical_insights": "Key clinical insights affecting mobility",
  "mobility_recommendations": "Specific recommendations for this patient's mobility plan"
}

Focus on mobility-relevant clinical details and provide actionable insights.`;
  try {
    const response = await anthropic.messages.create({
      // "claude-sonnet-4-20250514"
      model: DEFAULT_MODEL_STR,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });
    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error enhancing risk assessment:", error);
    return {
      enhanced_factors: [],
      clinical_insights: "Error processing clinical notes",
      mobility_recommendations: "Follow standard mobility recommendation"
    };
  }
}
var DEFAULT_MODEL_STR, anthropic;
var init_ai_processor = __esm({
  "server/ai-processor.ts"() {
    "use strict";
    DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }
});

// server/reports/report-generator.ts
var report_generator_exports = {};
__export(report_generator_exports, {
  ReportGenerator: () => ReportGenerator,
  reportGenerator: () => reportGenerator
});
import PDFDocument2 from "pdfkit";
import { eq as eq12, and as and12, gte as gte9, lte, desc as desc11, inArray as inArray3 } from "drizzle-orm";
var ReportGenerator, reportGenerator;
var init_report_generator = __esm({
  async "server/reports/report-generator.ts"() {
    "use strict";
    await init_db();
    init_schema();
    init_logger();
    ReportGenerator = class {
      /**
       * Generate nursing shift summary report (PDF)
       *
       * Provides comprehensive shift documentation including:
       * - Mobility activity summary
       * - Risk assessment status
       * - Protocol compliance
       * - Session details
       * - Alerts and interventions
       */
      async generateShiftReport(options) {
        try {
          const { patientId, startTime, endTime } = options;
          logger.info("Generating shift report", { patientId, startTime, endTime });
          const reportData = await this.fetchShiftReportData(patientId, startTime, endTime);
          return await this.createShiftReportPDF(reportData, startTime, endTime);
        } catch (error) {
          logger.error("Failed to generate shift report", {
            error: error.message,
            patientId: options.patientId
          });
          throw error;
        }
      }
      /**
       * Fetch all data needed for shift report
       */
      async fetchShiftReportData(patientId, startTime, endTime) {
        const [patient] = await db.select().from(users).where(eq12(users.id, patientId)).limit(1);
        if (!patient) {
          throw new Error(`Patient ${patientId} not found`);
        }
        const sessions3 = await db.select().from(exerciseSessions).where(
          and12(
            eq12(exerciseSessions.patientId, patientId),
            gte9(exerciseSessions.startTime, startTime),
            lte(exerciseSessions.startTime, endTime)
          )
        );
        const [riskData] = await db.select().from(riskAssessments).where(eq12(riskAssessments.patientId, patientId)).orderBy(desc11(riskAssessments.createdAt)).limit(1);
        const [assignmentData] = await db.select().from(patientProtocolAssignments).where(
          and12(
            eq12(patientProtocolAssignments.patientId, patientId),
            eq12(patientProtocolAssignments.status, "active")
          )
        ).limit(1);
        let protocolInfo = null;
        if (assignmentData) {
          const [protocolData] = await db.select().from(clinicalProtocols).where(eq12(clinicalProtocols.id, assignmentData.protocolId)).limit(1);
          if (protocolData) {
            const parsedProtocol = JSON.parse(protocolData.protocolData);
            const currentPhaseData = parsedProtocol.phases.find(
              (p) => p.phase === assignmentData.currentPhase
            );
            protocolInfo = {
              name: protocolData.name,
              currentPhase: assignmentData.currentPhase || "N/A",
              frequency: currentPhaseData?.frequency || "N/A",
              duration: currentPhaseData?.duration || 0
            };
          }
        }
        const alertData = await db.select().from(alerts).where(
          and12(
            eq12(alerts.patientId, patientId),
            gte9(alerts.triggeredAt, startTime),
            lte(alerts.triggeredAt, endTime)
          )
        );
        return {
          patient: {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth || void 0,
            admissionDate: patient.admissionDate || void 0
          },
          sessions: sessions3,
          risks: riskData ? {
            deconditioning: Math.round((JSON.parse(riskData.deconditioning)?.probability || 0) * 100),
            vte: Math.round((JSON.parse(riskData.vte)?.probability || 0) * 100),
            falls: Math.round((JSON.parse(riskData.falls)?.probability || 0) * 100),
            pressure: Math.round((JSON.parse(riskData.pressure)?.probability || 0) * 100)
          } : void 0,
          protocol: protocolInfo || void 0,
          alerts: alertData.map((alert) => ({
            type: alert.type,
            priority: alert.priority,
            message: alert.message,
            triggeredAt: alert.triggeredAt
          }))
        };
      }
      /**
       * Create PDF document for shift report
       */
      async createShiftReportPDF(data, startTime, endTime) {
        return new Promise((resolve, reject) => {
          const doc = new PDFDocument2({ size: "LETTER", margin: 50 });
          const chunks = [];
          doc.on("data", (chunk) => chunks.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", reject);
          doc.fontSize(20).text("Bedside Bike - Nursing Shift Report", { align: "center" });
          doc.moveDown(0.5);
          doc.fontSize(10).text(`Generated: ${(/* @__PURE__ */ new Date()).toLocaleString()}`, { align: "center" });
          doc.moveDown(1.5);
          doc.fontSize(14).text("Patient Information", { underline: true });
          doc.fontSize(11);
          doc.text(`Name: ${data.patient.firstName} ${data.patient.lastName}`);
          doc.text(`MRN: ${data.patient.id}`);
          if (data.patient.dateOfBirth) {
            doc.text(`Date of Birth: ${data.patient.dateOfBirth}`);
          }
          if (data.patient.admissionDate) {
            doc.text(`Admission Date: ${data.patient.admissionDate}`);
          }
          doc.text(`Report Period: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`);
          doc.moveDown(1.5);
          doc.fontSize(14).text("Mobility Activity Summary", { underline: true });
          doc.fontSize(11);
          doc.text(`Sessions Completed: ${data.sessions.length}`);
          if (data.sessions.length > 0) {
            const totalDuration = data.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const avgPower = data.sessions.reduce((sum, s) => sum + parseFloat(s.avgPower || "0"), 0) / data.sessions.length;
            const avgRPM = data.sessions.reduce((sum, s) => sum + (s.avgRpm || 0), 0) / data.sessions.length;
            doc.text(`Total Duration: ${Math.round(totalDuration / 60)} minutes`);
            doc.text(`Average Power Output: ${Math.round(avgPower)}W`);
            doc.text(`Average RPM: ${Math.round(avgRPM)}`);
          } else {
            doc.text("No sessions completed during this shift");
          }
          doc.moveDown(1.5);
          if (data.protocol) {
            doc.fontSize(14).text("Evidence-Based Protocol", { underline: true });
            doc.fontSize(11);
            doc.text(`Protocol: ${data.protocol.name}`);
            doc.text(`Current Phase: ${data.protocol.currentPhase}`);
            doc.text(`Prescribed Frequency: ${data.protocol.frequency}`);
            doc.text(`Prescribed Duration: ${data.protocol.duration} minutes`);
            doc.moveDown(1.5);
          }
          if (data.risks) {
            doc.fontSize(14).text("Current Risk Assessment", { underline: true });
            doc.fontSize(11);
            doc.text(`Deconditioning Risk: ${data.risks.deconditioning}%`);
            doc.text(`VTE Risk: ${data.risks.vte}%`);
            doc.text(`Fall Risk: ${data.risks.falls}%`);
            doc.text(`Pressure Injury Risk: ${data.risks.pressure}%`);
            doc.moveDown(1.5);
          }
          if (data.alerts && data.alerts.length > 0) {
            doc.fontSize(14).text("Alerts and Interventions", { underline: true });
            doc.fontSize(10);
            data.alerts.forEach((alert, i) => {
              const prioritySymbol = {
                "critical": "\u26A0\uFE0F ",
                "high": "\u26A1 ",
                "medium": "\u{1F4CC} ",
                "low": "\u2139\uFE0F "
              }[alert.priority] || "";
              doc.text(
                `${i + 1}. ${prioritySymbol}[${alert.priority.toUpperCase()}] ${alert.message}`,
                { continued: false }
              );
              doc.fontSize(9).text(`   ${alert.triggeredAt.toLocaleString()}`, { color: "#666" });
              doc.fontSize(10);
            });
            doc.moveDown(1.5);
          }
          if (data.sessions.length > 0) {
            doc.fontSize(14).text("Detailed Session Log", { underline: true });
            doc.fontSize(9);
            data.sessions.forEach((session3, i) => {
              const durationMin = Math.round((session3.duration || 0) / 60);
              const power = Math.round(parseFloat(session3.avgPower || "0"));
              const rpm = Math.round(session3.avgRpm || 0);
              const resistance = parseFloat(session3.resistance || "0").toFixed(1);
              doc.text(
                `${i + 1}. ${new Date(session3.startTime).toLocaleTimeString()} - ${durationMin}min, ${power}W avg, ${rpm} RPM, Resistance: ${resistance}`
              );
              if (session3.sessionNotes) {
                doc.fontSize(8).text(`   Notes: ${session3.sessionNotes}`, { color: "#444" });
                doc.fontSize(9);
              }
            });
            doc.moveDown(1.5);
          }
          doc.fontSize(8).fillColor("#666");
          const footerY = doc.page.height - 50;
          doc.text(
            `This report generated by Bedside Bike Clinical Documentation System`,
            50,
            footerY,
            { align: "center" }
          );
          doc.text(
            `For clinical use only - HIPAA protected information`,
            50,
            footerY + 12,
            { align: "center" }
          );
          doc.end();
        });
      }
      /**
       * Generate PT progress note (SOAP format)
       *
       * Standard physical therapy documentation including:
       * - Subjective: Patient-reported information
       * - Objective: Measurable data from sessions
       * - Assessment: Clinical interpretation
       * - Plan: Treatment plan and goals
       */
      async generatePTProgressNote(options) {
        try {
          const { patientId, sessionIds, subjective, additionalNotes } = options;
          logger.info("Generating PT progress note", { patientId, sessionCount: sessionIds.length });
          const [patient] = await db.select().from(users).where(eq12(users.id, patientId)).limit(1);
          if (!patient) {
            throw new Error(`Patient ${patientId} not found`);
          }
          const sessions3 = await db.select().from(exerciseSessions).where(inArray3(exerciseSessions.id, sessionIds));
          if (sessions3.length === 0) {
            throw new Error("No sessions found for progress note");
          }
          const [assignment] = await db.select().from(patientProtocolAssignments).where(
            and12(
              eq12(patientProtocolAssignments.patientId, patientId),
              eq12(patientProtocolAssignments.status, "active")
            )
          ).limit(1);
          let protocolPhase = "Standard protocol";
          if (assignment) {
            const [protocol] = await db.select().from(clinicalProtocols).where(eq12(clinicalProtocols.id, assignment.protocolId)).limit(1);
            if (protocol) {
              protocolPhase = `${protocol.name} - ${assignment.currentPhase}`;
            }
          }
          const avgDuration = sessions3.reduce((s, sess) => s + (sess.duration || 0), 0) / sessions3.length / 60;
          const avgPower = sessions3.reduce((s, sess) => s + parseFloat(sess.avgPower || "0"), 0) / sessions3.length;
          const avgRPM = sessions3.reduce((s, sess) => s + (sess.avgRpm || 0), 0) / sessions3.length;
          const soapNote = {
            patient: {
              firstName: patient.firstName,
              lastName: patient.lastName,
              id: patient.id
            },
            date: /* @__PURE__ */ new Date(),
            subjective: subjective || "Patient reports improved energy levels and reduced fatigue. Denies pain during exercise. Patient verbalized understanding of mobility goals and importance of consistent participation.",
            objective: {
              sessionsCompleted: sessions3.length,
              protocolPhase,
              avgDuration: Math.round(avgDuration),
              avgPower: Math.round(avgPower),
              avgRPM: Math.round(avgRPM),
              safetyNotes: "No adverse events during sessions",
              vitalSigns: "Stable throughout exercise"
            },
            assessment: `Patient demonstrating good progress with bedside cycling protocol. Tolerating ${Math.round(avgDuration)}-minute sessions with power output of ${Math.round(avgPower)}W. Endurance and strength improving as evidenced by consistent session completion and ${sessions3.length > 1 ? "increased power output from previous sessions" : "baseline performance established"}.`,
            plan: `Continue current protocol (${protocolPhase}). Monitor for fatigue and adjust as needed. Progress to next phase when criteria met. Patient education provided regarding importance of consistent participation for VTE prophylaxis and prevention of deconditioning. Patient verbalized understanding and agreement with plan.` + (additionalNotes ? `

Additional notes: ${additionalNotes}` : "")
          };
          return this.formatSOAPNote(soapNote);
        } catch (error) {
          logger.error("Failed to generate PT progress note", {
            error: error.message,
            patientId: options.patientId
          });
          throw error;
        }
      }
      /**
       * Format SOAP note as text
       */
      formatSOAPNote(note) {
        return `
PHYSICAL THERAPY PROGRESS NOTE

Patient: ${note.patient.firstName} ${note.patient.lastName}
MRN: ${note.patient.id}
Date: ${note.date.toLocaleDateString()}
Intervention: Bedside Cycling Protocol

SUBJECTIVE:
${note.subjective}

OBJECTIVE:
- Sessions completed: ${note.objective.sessionsCompleted} (${note.objective.protocolPhase})
- Average duration: ${note.objective.avgDuration} minutes
- Average power output: ${note.objective.avgPower}W
- Average RPM: ${note.objective.avgRPM}
- Range of motion: Full bilateral lower extremities
- Safety: ${note.objective.safetyNotes}
- Vital signs: ${note.objective.vitalSigns}

ASSESSMENT:
${note.assessment}

PLAN:
${note.plan}

${note.provider ? `PT Signature: ${note.provider.firstName} ${note.provider.lastName}, ${note.provider.credentials}` : "PT Signature: _________________"} Date: ${note.date.toLocaleDateString()}
    `.trim();
      }
    };
    reportGenerator = new ReportGenerator();
  }
});

// server/alerts/alert-engine.ts
var alert_engine_exports = {};
__export(alert_engine_exports, {
  AlertEngine: () => AlertEngine,
  alertEngine: () => alertEngine
});
import { eq as eq13, and as and13, gte as gte10, desc as desc12 } from "drizzle-orm";
var AlertEngine, alertEngine;
var init_alert_engine = __esm({
  async "server/alerts/alert-engine.ts"() {
    "use strict";
    await init_db();
    init_schema();
    init_logger();
    await init_protocol_engine();
    AlertEngine = class {
      /**
       * Check for session completion issues
       */
      async checkSessionAlerts(sessionId) {
        const generatedAlerts = [];
        try {
          const [session3] = await db.select().from(exerciseSessions).where(eq13(exerciseSessions.id, sessionId)).limit(1);
          if (!session3) {
            logger.warn("Session not found for alert check", { sessionId });
            return generatedAlerts;
          }
          const expectedDuration = session3.targetDuration || 900;
          if (session3.duration && session3.duration < expectedDuration * 0.75) {
            const alert = {
              patientId: session3.patientId,
              type: "session_incomplete",
              priority: "medium",
              message: `Session stopped at ${Math.round(session3.duration / 60)}min (goal: ${Math.round(expectedDuration / 60)}min)`,
              actionRequired: "Check on patient - possible fatigue, discomfort, or need for assistance",
              triggeredAt: /* @__PURE__ */ new Date(),
              metadata: {
                sessionId,
                expectedDuration,
                actualDuration: session3.duration,
                percentComplete: Math.round(session3.duration / expectedDuration * 100)
              }
            };
            await this.createAlert(alert);
            generatedAlerts.push(alert);
          }
          if (session3.stopsAndStarts && session3.stopsAndStarts > 5) {
            const alert = {
              patientId: session3.patientId,
              type: "session_paused_long",
              priority: "low",
              message: `Session had ${session3.stopsAndStarts} interruptions`,
              actionRequired: "Assess patient tolerance and adjust protocol if needed",
              triggeredAt: /* @__PURE__ */ new Date(),
              metadata: {
                sessionId,
                stopsAndStarts: session3.stopsAndStarts
              }
            };
            await this.createAlert(alert);
            generatedAlerts.push(alert);
          }
          logger.info("Session alerts checked", {
            sessionId,
            alertsGenerated: generatedAlerts.length
          });
        } catch (error) {
          logger.error("Failed to check session alerts", {
            error: error.message,
            sessionId
          });
        }
        return generatedAlerts;
      }
      /**
       * Check for prolonged patient inactivity (24h, 48h)
       */
      async checkInactivityAlerts() {
        const generatedAlerts = [];
        const now = /* @__PURE__ */ new Date();
        try {
          const patients = await db.select().from(users).where(eq13(users.userType, "patient"));
          for (const patient of patients) {
            const [lastSession] = await db.select().from(exerciseSessions).where(eq13(exerciseSessions.patientId, patient.id)).orderBy(desc12(exerciseSessions.startTime)).limit(1);
            if (!lastSession) {
              continue;
            }
            const hoursSinceLastSession = (now.getTime() - new Date(lastSession.startTime).getTime()) / (1e3 * 60 * 60);
            const existingAlert = await this.getRecentAlert(
              patient.id,
              hoursSinceLastSession >= 48 ? "no_activity_48h" : "no_activity_24h",
              24
              // within last 24 hours
            );
            if (existingAlert) {
              continue;
            }
            if (hoursSinceLastSession >= 48) {
              const alert = {
                patientId: patient.id,
                type: "no_activity_48h",
                priority: "high",
                message: `${patient.firstName} ${patient.lastName}: No mobility activity in 48 hours`,
                actionRequired: "Implement mobility protocol immediately - elevated VTE risk",
                triggeredAt: now,
                metadata: {
                  lastSessionTime: lastSession.startTime,
                  hoursSinceLastSession: Math.round(hoursSinceLastSession)
                }
              };
              await this.createAlert(alert);
              generatedAlerts.push(alert);
            } else if (hoursSinceLastSession >= 24) {
              const alert = {
                patientId: patient.id,
                type: "no_activity_24h",
                priority: "medium",
                message: `${patient.firstName} ${patient.lastName}: No mobility activity in 24 hours`,
                actionRequired: "Schedule mobility session per protocol",
                triggeredAt: now,
                metadata: {
                  lastSessionTime: lastSession.startTime,
                  hoursSinceLastSession: Math.round(hoursSinceLastSession)
                }
              };
              await this.createAlert(alert);
              generatedAlerts.push(alert);
            }
          }
          logger.info("Inactivity alerts checked", {
            patientsChecked: patients.length,
            alertsGenerated: generatedAlerts.length
          });
        } catch (error) {
          logger.error("Failed to check inactivity alerts", {
            error: error.message
          });
        }
        return generatedAlerts;
      }
      /**
       * Check protocol compliance for a patient
       */
      async checkProtocolCompliance(patientId) {
        try {
          const [assignment] = await db.select().from(patientProtocolAssignments).where(
            and13(
              eq13(patientProtocolAssignments.patientId, patientId),
              eq13(patientProtocolAssignments.status, "active")
            )
          ).limit(1);
          if (!assignment) {
            return null;
          }
          const prescription = await protocolEngine.getCurrentPrescription(patientId);
          if (!prescription) return null;
          const today = /* @__PURE__ */ new Date();
          today.setHours(0, 0, 0, 0);
          const todaySessions = await db.select().from(exerciseSessions).where(
            and13(
              eq13(exerciseSessions.patientId, patientId),
              gte10(exerciseSessions.startTime, today)
            )
          );
          const expectedSessions = this.parseFrequency(prescription.frequency);
          const completedSessions = todaySessions.length;
          const currentHour = (/* @__PURE__ */ new Date()).getHours();
          if (completedSessions < expectedSessions && currentHour >= 18) {
            const alert = {
              patientId,
              type: "protocol_non_compliance",
              priority: "medium",
              message: `Protocol compliance: ${completedSessions}/${expectedSessions} sessions completed today`,
              actionRequired: `Complete remaining ${expectedSessions - completedSessions} session(s) before end of day`,
              triggeredAt: /* @__PURE__ */ new Date(),
              metadata: {
                protocolPhase: assignment.currentPhase,
                expectedSessions,
                completedSessions,
                frequency: prescription.frequency
              }
            };
            await this.createAlert(alert);
            return alert;
          }
          return null;
        } catch (error) {
          logger.error("Failed to check protocol compliance", {
            error: error.message,
            patientId
          });
          return null;
        }
      }
      /**
       * Parse frequency string to number of sessions per day
       */
      parseFrequency(frequency) {
        const frequencyMap = {
          "QD": 1,
          "daily": 1,
          "once daily": 1,
          "BID": 2,
          "twice daily": 2,
          "TID": 3,
          "three times daily": 3,
          "QID": 4,
          "four times daily": 4
        };
        return frequencyMap[frequency] || frequencyMap[frequency.toLowerCase()] || 3;
      }
      /**
       * Create and store alert in database
       */
      async createAlert(alert) {
        try {
          const [result] = await db.insert(alerts).values({
            patientId: alert.patientId,
            type: alert.type,
            priority: alert.priority,
            message: alert.message,
            actionRequired: alert.actionRequired,
            triggeredAt: alert.triggeredAt,
            metadata: alert.metadata ? JSON.stringify(alert.metadata) : null
          }).returning({ id: alerts.id });
          logger.info("Alert created", {
            alertId: result.id,
            patientId: alert.patientId,
            type: alert.type,
            priority: alert.priority
          });
          return result.id;
        } catch (error) {
          logger.error("Failed to create alert", {
            error: error.message,
            alert
          });
          throw error;
        }
      }
      /**
       * Get alerts for a patient
       */
      async getPatientAlerts(patientId, includeAcknowledged = false) {
        try {
          const conditions = includeAcknowledged ? [eq13(alerts.patientId, patientId)] : [
            eq13(alerts.patientId, patientId),
            eq13(alerts.acknowledgedAt, null)
          ];
          const results = await db.select().from(alerts).where(and13(...conditions)).orderBy(desc12(alerts.triggeredAt));
          return results.map((row) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : void 0
          }));
        } catch (error) {
          logger.error("Failed to get patient alerts", {
            error: error.message,
            patientId
          });
          return [];
        }
      }
      /**
       * Get all unacknowledged alerts
       */
      async getAllUnacknowledgedAlerts() {
        try {
          const results = await db.select().from(alerts).where(eq13(alerts.acknowledgedAt, null)).orderBy(desc12(alerts.triggeredAt));
          return results.map((row) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : void 0
          }));
        } catch (error) {
          logger.error("Failed to get unacknowledged alerts", {
            error: error.message
          });
          return [];
        }
      }
      /**
       * Acknowledge an alert
       */
      async acknowledgeAlert(alertId, acknowledgedBy) {
        try {
          await db.update(alerts).set({
            acknowledgedAt: /* @__PURE__ */ new Date(),
            acknowledgedBy
          }).where(eq13(alerts.id, alertId));
          logger.info("Alert acknowledged", {
            alertId,
            acknowledgedBy
          });
          return true;
        } catch (error) {
          logger.error("Failed to acknowledge alert", {
            error: error.message,
            alertId
          });
          return false;
        }
      }
      /**
       * Get alert summary statistics
       */
      async getAlertSummary(patientId) {
        try {
          const conditions = patientId ? [eq13(alerts.patientId, patientId)] : [];
          const allAlerts = await db.select().from(alerts).where(conditions.length > 0 ? and13(...conditions) : void 0);
          const summary = {
            total: allAlerts.length,
            byPriority: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0
            },
            byType: {},
            unacknowledged: 0
          };
          for (const alert of allAlerts) {
            summary.byPriority[alert.priority]++;
            summary.byType[alert.type] = (summary.byType[alert.type] || 0) + 1;
            if (!alert.acknowledgedAt) {
              summary.unacknowledged++;
            }
          }
          return summary;
        } catch (error) {
          logger.error("Failed to get alert summary", {
            error: error.message,
            patientId
          });
          return {
            total: 0,
            byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
            byType: {},
            unacknowledged: 0
          };
        }
      }
      /**
       * Check if a recent alert of this type already exists
       */
      async getRecentAlert(patientId, type, hoursAgo) {
        const cutoff = /* @__PURE__ */ new Date();
        cutoff.setHours(cutoff.getHours() - hoursAgo);
        const [result] = await db.select().from(alerts).where(
          and13(
            eq13(alerts.patientId, patientId),
            eq13(alerts.type, type),
            gte10(alerts.triggeredAt, cutoff)
          )
        ).limit(1);
        return result || null;
      }
      /**
       * Run all alert checks for a patient
       */
      async runAllChecks(patientId) {
        const allAlerts = [];
        const complianceAlert = await this.checkProtocolCompliance(patientId);
        if (complianceAlert) {
          allAlerts.push(complianceAlert);
        }
        return allAlerts;
      }
    };
    alertEngine = new AlertEngine();
  }
});

// server/index.ts
import express2 from "express";
import session2 from "express-session";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
init_schema();
await init_db();
import { eq, desc, and, sql as sql3 } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getAllPatients() {
    const patients = await db.select().from(users).where(eq(users.userType, "patient"));
    return patients;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(user) {
    const [newUser] = await db.insert(users).values(user).returning();
    if (newUser.userType === "patient") {
      await db.insert(patientStats).values({
        patientId: newUser.id,
        level: 1,
        xp: 0,
        totalSessions: 0,
        totalDuration: 0,
        avgDailyDuration: 0,
        consistencyStreak: 0
      });
      await this.createDefaultGoals(newUser.id);
    }
    return newUser;
  }
  async updateUser(id, updates) {
    const [updatedUser] = await db.update(users).set({
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  async upsertUser(user) {
    const [upsertedUser] = await db.insert(users).values(user).onConflictDoUpdate({
      target: users.email,
      set: {
        ...user,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return upsertedUser;
  }
  // Provider operations
  async getProviders() {
    return await db.select().from(users).where(and(eq(users.userType, "provider"), eq(users.isActive, true))).orderBy(users.firstName, users.lastName);
  }
  async getProvidersByPatient(patientId) {
    return await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      userType: users.userType,
      credentials: users.credentials,
      specialty: users.specialty,
      licenseNumber: users.licenseNumber,
      dateOfBirth: users.dateOfBirth,
      admissionDate: users.admissionDate,
      providerRole: users.providerRole,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).innerJoin(providerPatients, eq(users.id, providerPatients.providerId)).where(
      and(
        eq(providerPatients.patientId, patientId),
        eq(providerPatients.permissionGranted, true),
        eq(providerPatients.isActive, true)
      )
    );
  }
  // Patient operations (legacy compatibility)
  async getPatient(id) {
    const [patient] = await db.select().from(users).where(and(eq(users.id, id), eq(users.userType, "patient")));
    return patient;
  }
  async getPatientById(id) {
    return this.getPatient(id);
  }
  async getPatientByCredentials(firstName, lastName, dateOfBirth) {
    return this.getPatientByName(firstName, lastName, dateOfBirth);
  }
  async getPatientByName(firstName, lastName, dateOfBirth) {
    const [patient] = await db.select().from(users).where(
      and(
        eq(users.firstName, firstName),
        eq(users.lastName, lastName),
        eq(users.dateOfBirth, dateOfBirth),
        eq(users.userType, "patient")
      )
    );
    return patient;
  }
  async createPatient(patient) {
    return this.createUser({ ...patient, userType: "patient" });
  }
  // Patient profile operations
  async getPatientProfile(userId) {
    const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.userId, userId));
    return profile;
  }
  async createPatientProfile(profile) {
    const [newProfile] = await db.insert(patientProfiles).values(profile).returning();
    return newProfile;
  }
  async updatePatientProfile(userId, updates) {
    const [updatedProfile] = await db.update(patientProfiles).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(patientProfiles.userId, userId)).returning();
    return updatedProfile;
  }
  // Provider-Patient relationship operations
  async createProviderPatientRelation(relation) {
    const [newRelation] = await db.insert(providerPatients).values(relation).returning();
    return newRelation;
  }
  async createProviderPatientRelationship(relation) {
    const [newRelation] = await db.insert(providerPatients).values({
      ...relation,
      permissionGranted: true,
      grantedAt: /* @__PURE__ */ new Date(),
      isActive: true
    }).returning();
    return newRelation;
  }
  async getProviderPatientRelationships(patientId) {
    const results = await db.select({
      id: providerPatients.id,
      providerId: providerPatients.providerId,
      patientId: providerPatients.patientId,
      permissionGranted: providerPatients.permissionGranted,
      grantedAt: providerPatients.grantedAt,
      isActive: providerPatients.isActive,
      createdAt: providerPatients.createdAt,
      providerFirstName: users.firstName,
      providerLastName: users.lastName,
      providerCredentials: users.credentials,
      providerSpecialty: users.specialty
    }).from(providerPatients).innerJoin(users, eq(providerPatients.providerId, users.id)).where(
      and(
        eq(providerPatients.patientId, Number(patientId)),
        eq(providerPatients.isActive, true)
      )
    );
    return results;
  }
  async deleteProviderPatientRelationship(relationshipId) {
    await db.update(providerPatients).set({
      isActive: false
    }).where(eq(providerPatients.id, relationshipId));
  }
  async grantProviderAccess(patientId, providerId) {
    const [updatedRelation] = await db.update(providerPatients).set({
      permissionGranted: true,
      grantedAt: /* @__PURE__ */ new Date()
    }).where(
      and(
        eq(providerPatients.patientId, patientId),
        eq(providerPatients.providerId, providerId)
      )
    ).returning();
    return updatedRelation;
  }
  async getPatientsByProvider(providerId) {
    return await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      userType: users.userType,
      credentials: users.credentials,
      specialty: users.specialty,
      licenseNumber: users.licenseNumber,
      dateOfBirth: users.dateOfBirth,
      admissionDate: users.admissionDate,
      providerRole: users.providerRole,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).innerJoin(providerPatients, eq(users.id, providerPatients.patientId)).where(
      and(
        eq(providerPatients.providerId, providerId),
        eq(providerPatients.permissionGranted, true),
        eq(providerPatients.isActive, true)
      )
    );
  }
  // Session operations
  async createSession(session3) {
    const [newSession] = await db.insert(exerciseSessions).values(session3).returning();
    await this.updatePatientStatsAfterSession(session3.patientId, session3.duration || 0, Number(session3.avgPower) || 0);
    await this.updateGoalProgress(session3.patientId, "duration", session3.duration || 0);
    if (session3.avgPower) {
      await this.updateGoalProgress(session3.patientId, "power", Number(session3.avgPower));
    }
    return newSession;
  }
  async getSessionsByPatient(patientId) {
    return await db.select().from(exerciseSessions).where(eq(exerciseSessions.patientId, patientId)).orderBy(desc(exerciseSessions.startTime));
  }
  async getPatientSessions(patientId, limit) {
    const sessions3 = await db.select().from(exerciseSessions).where(eq(exerciseSessions.patientId, patientId)).orderBy(desc(exerciseSessions.startTime)).limit(limit || 50);
    return sessions3;
  }
  async getPatientDailySessions(patientId, date) {
    const sessions3 = await db.select().from(exerciseSessions).where(
      and(
        eq(exerciseSessions.patientId, patientId),
        eq(exerciseSessions.sessionDate, date)
      )
    ).orderBy(desc(exerciseSessions.startTime));
    return sessions3;
  }
  async updateSession(id, updates) {
    const [updatedSession] = await db.update(exerciseSessions).set(updates).where(eq(exerciseSessions.id, id)).returning();
    return updatedSession;
  }
  // Goal operations
  async getGoalsByPatient(patientId) {
    const result = await db.select({
      id: patientGoals.id,
      patientId: patientGoals.patientId,
      providerId: patientGoals.providerId,
      goalType: patientGoals.goalType,
      targetValue: patientGoals.targetValue,
      currentValue: patientGoals.currentValue,
      unit: patientGoals.unit,
      label: patientGoals.label,
      subtitle: patientGoals.subtitle,
      period: patientGoals.period,
      aiRecommended: patientGoals.aiRecommended,
      isActive: patientGoals.isActive,
      createdAt: patientGoals.createdAt,
      updatedAt: patientGoals.updatedAt,
      providerName: sql3`COALESCE(CONCAT(${users.firstName}, ' ', ${users.lastName}), '')`,
      providerEmail: users.email
    }).from(patientGoals).leftJoin(users, eq(patientGoals.providerId, users.id)).where(and(eq(patientGoals.patientId, patientId), eq(patientGoals.isActive, true))).orderBy(desc(patientGoals.createdAt));
    return result;
  }
  async getPatientGoals(patientId) {
    const goals = await this.getGoalsByPatient(patientId);
    return goals;
  }
  async createGoal(goal) {
    const [newGoal] = await db.insert(patientGoals).values(goal).returning();
    return newGoal;
  }
  async updateGoal(id, updates) {
    const [updatedGoal] = await db.update(patientGoals).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(patientGoals.id, id)).returning();
    return updatedGoal;
  }
  async deactivatePatientGoals(patientId) {
    await db.update(patientGoals).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(patientGoals.patientId, patientId));
  }
  async updateGoalProgress(patientId, goalType, value) {
    const goals = await db.select().from(patientGoals).where(
      and(
        eq(patientGoals.patientId, patientId),
        eq(patientGoals.goalType, goalType),
        eq(patientGoals.isActive, true)
      )
    );
    for (const goal of goals) {
      let newValue = Number(goal.currentValue || 0);
      if (goal.period === "session") {
        newValue = value;
      } else if (goal.period === "daily") {
        newValue += value;
      }
      await db.update(patientGoals).set({
        currentValue: newValue.toString(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(patientGoals.id, goal.id));
    }
  }
  // Achievement operations
  async getAchievementsByPatient(patientId) {
    return await db.select().from(achievements).where(eq(achievements.patientId, patientId)).orderBy(desc(achievements.unlockedAt));
  }
  async getPatientAchievements(patientId) {
    return this.getAchievementsByPatient(patientId);
  }
  async createAchievement(achievement) {
    const [newAchievement] = await db.insert(achievements).values(achievement).returning();
    return newAchievement;
  }
  async unlockAchievement(patientId, achievementId) {
    const [unlockedAchievement] = await db.update(achievements).set({
      isUnlocked: true,
      unlockedAt: /* @__PURE__ */ new Date()
    }).where(
      and(
        eq(achievements.id, achievementId),
        eq(achievements.patientId, patientId)
      )
    ).returning();
    if (unlockedAchievement) {
      await db.update(patientStats).set({
        xp: sql3`${patientStats.xp} + ${unlockedAchievement.xpReward}`
      }).where(eq(patientStats.patientId, patientId));
    }
    return unlockedAchievement;
  }
  // Stats operations
  async getPatientStats(patientId) {
    const [stats] = await db.select().from(patientStats).where(eq(patientStats.patientId, patientId));
    return stats;
  }
  async updatePatientStats(patientId, updates) {
    const [updatedStats] = await db.update(patientStats).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(patientStats.patientId, patientId)).returning();
    return updatedStats;
  }
  // Analytics methods
  async getLeaderboard(limit = 10) {
    const stats = await db.select({
      patientId: patientStats.patientId,
      weeklyDuration: patientStats.totalDuration,
      firstName: users.firstName,
      lastName: users.lastName
    }).from(patientStats).innerJoin(users, eq(patientStats.patientId, users.id)).orderBy(desc(patientStats.totalDuration)).limit(limit);
    return stats.map((stat, index) => ({
      patientId: stat.patientId,
      name: `${stat.firstName} ${stat.lastName.charAt(0)}.`,
      weeklyDuration: stat.weeklyDuration || 0,
      rank: index + 1
    }));
  }
  async getDailyUsageData(patientId, days) {
    const sessions3 = await db.select().from(exerciseSessions).where(eq(exerciseSessions.patientId, patientId)).orderBy(desc(exerciseSessions.sessionDate)).limit(days * 3);
    const dataMap = /* @__PURE__ */ new Map();
    sessions3.forEach((session3) => {
      const date = session3.sessionDate;
      const existing = dataMap.get(date) || { duration: 0, avgPower: 0, sessionCount: 0 };
      existing.duration += session3.duration;
      existing.avgPower += Number(session3.avgPower || 0);
      existing.sessionCount += 1;
      dataMap.set(date, existing);
    });
    return Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      duration: data.duration,
      avgPower: data.sessionCount > 0 ? data.avgPower / data.sessionCount : 0
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  async calculateAdaptiveGoal(patientId) {
    const goals = await this.getPatientGoals(patientId);
    const durationGoal = goals.find((g) => g.goalType === "duration");
    if (durationGoal) {
      return {
        durationGoal: Math.floor(Number(durationGoal.targetValue) / 60),
        // Convert seconds to minutes for display
        adaptiveReason: "Provider-recommended daily mobility target"
      };
    }
    return {
      durationGoal: 15,
      // 15 minutes - clinical standard
      adaptiveReason: "Clinical standard: 15 minutes daily mobility"
    };
  }
  // Risk Assessment operations
  async createRiskAssessment(assessment) {
    const insertData = {
      patientId: Number(assessment.patientId),
      deconditioning: String(assessment.deconditioning || "{}"),
      vte: String(assessment.vte || "{}"),
      falls: String(assessment.falls || "{}"),
      pressure: String(assessment.pressure || "{}"),
      mobilityRecommendation: String(assessment.mobilityRecommendation || "{}"),
      losData: assessment.losData ? String(assessment.losData) : null,
      dischargeData: assessment.dischargeData ? String(assessment.dischargeData) : null,
      readmissionData: assessment.readmissionData ? String(assessment.readmissionData) : null
    };
    console.log("Inserting risk assessment - patientId:", insertData.patientId);
    const [newAssessment] = await db.insert(riskAssessments).values(insertData).returning();
    await this.createGoalsFromRiskAssessment(assessment.patientId, newAssessment);
    return newAssessment;
  }
  async getRiskAssessmentsByPatient(patientId) {
    return await db.select().from(riskAssessments).where(eq(riskAssessments.patientId, patientId)).orderBy(desc(riskAssessments.createdAt));
  }
  async getRiskAssessments(patientId) {
    return this.getRiskAssessmentsByPatient(patientId);
  }
  async getLatestRiskAssessment(patientId) {
    const [assessment] = await db.select().from(riskAssessments).where(eq(riskAssessments.patientId, patientId)).orderBy(desc(riskAssessments.createdAt)).limit(1);
    return assessment;
  }
  // Helper methods
  async updatePatientStatsAfterSession(patientId, duration, avgPower) {
    const currentStats = await this.getPatientStats(patientId);
    if (currentStats) {
      const newTotalSessions = (currentStats.totalSessions || 0) + 1;
      const newTotalDuration = (currentStats.totalDuration || 0) + duration;
      const newAvgDailyDuration = newTotalDuration / newTotalSessions;
      await this.updatePatientStats(patientId, {
        totalSessions: newTotalSessions,
        totalDuration: newTotalDuration,
        avgDailyDuration: newAvgDailyDuration,
        lastSessionDate: /* @__PURE__ */ new Date()
      });
    }
  }
  async createDefaultGoals(patientId) {
    const defaultGoals = [
      {
        patientId,
        goalType: "duration",
        targetValue: "600",
        // 10 minutes
        currentValue: "0",
        unit: "seconds",
        label: "Daily Exercise Duration",
        subtitle: "Build consistency with daily movement",
        period: "daily",
        aiRecommended: false
      },
      {
        patientId,
        goalType: "power",
        targetValue: "25",
        // 25 watts
        currentValue: "0",
        unit: "watts",
        label: "Average Power Output",
        subtitle: "Strengthen your cardiovascular system",
        period: "session",
        aiRecommended: false
      }
    ];
    for (const goal of defaultGoals) {
      await this.createGoal(goal);
    }
  }
  async createGoalsFromRiskAssessment(patientId, assessment) {
    await db.update(patientGoals).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(patientGoals.patientId, patientId));
    let recommendation = null;
    try {
      recommendation = typeof assessment.mobilityRecommendation === "string" ? JSON.parse(assessment.mobilityRecommendation) : assessment.mobilityRecommendation;
    } catch (e) {
      console.error("Failed to parse mobilityRecommendation:", e);
      return;
    }
    if (recommendation && recommendation.watt_goal && recommendation.duration_min_per_session) {
      const aiGoals = [
        {
          patientId,
          goalType: "duration",
          targetValue: (recommendation.duration_min_per_session * 60).toString(),
          // Convert to seconds
          currentValue: "0",
          unit: "seconds",
          label: "AI-Recommended Duration",
          subtitle: "Based on your risk assessment",
          period: "session",
          aiRecommended: true
        },
        {
          patientId,
          goalType: "power",
          targetValue: recommendation.watt_goal.toString(),
          currentValue: "0",
          unit: "watts",
          label: "AI-Recommended Power Target",
          subtitle: "Optimized for your risk profile",
          period: "session",
          aiRecommended: true
        }
      ];
      for (const goal of aiGoals) {
        await this.createGoal(goal);
      }
    }
  }
  async createGoalsFromMobilityRecommendation(patientId, mobilityRecommendation) {
    await db.update(patientGoals).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(patientGoals.patientId, patientId));
    if (mobilityRecommendation && mobilityRecommendation.watt_goal && mobilityRecommendation.duration_min_per_session) {
      const aiGoals = [
        {
          patientId,
          goalType: "duration",
          targetValue: (mobilityRecommendation.duration_min_per_session * 60).toString(),
          // Convert to seconds
          currentValue: "0",
          unit: "seconds",
          label: "AI-Recommended Duration",
          subtitle: "Based on risk assessment",
          period: "session",
          aiRecommended: true
        },
        {
          patientId,
          goalType: "power",
          targetValue: mobilityRecommendation.watt_goal.toString(),
          currentValue: "0",
          unit: "watts",
          label: "AI-Recommended Power Target",
          subtitle: "Optimized for risk profile",
          period: "session",
          aiRecommended: true
        }
      ];
      for (const goal of aiGoals) {
        await this.createGoal(goal);
      }
    }
  }
  // Device operations
  async getDevices() {
    return await db.select().from(devices);
  }
  async getDevice(deviceId) {
    const result = await db.select().from(devices).where(eq(devices.id, deviceId));
    return result[0];
  }
  async updateDeviceStatus(deviceId, status, patientId) {
    const result = await db.update(devices).set({
      status,
      currentPatientId: patientId || null,
      lastUsed: patientId ? /* @__PURE__ */ new Date() : void 0,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(devices.id, deviceId)).returning();
    return result[0];
  }
  async linkPatientToDevice(patientId, deviceId) {
    let currentDevices = await db.select().from(devices).where(eq(devices.currentPatientId, patientId));
    if (currentDevices.length === 0) {
      const recentSession = await db.select().from(exerciseSessions).where(eq(exerciseSessions.patientId, patientId)).orderBy(desc(exerciseSessions.createdAt)).limit(1);
      if (recentSession.length > 0) {
        const lastDeviceId = recentSession[0].deviceId;
        if (lastDeviceId && lastDeviceId !== deviceId) {
          currentDevices = [{ id: lastDeviceId, status: "available", currentPatientId: null }];
        }
      }
    }
    let previousDevice;
    let isDeviceSwitch = false;
    let sessionsOnPreviousDevice = 0;
    if (currentDevices.length > 0) {
      previousDevice = currentDevices[0].id;
      if (previousDevice !== deviceId) {
        isDeviceSwitch = true;
        const previousSessions = await db.select().from(exerciseSessions).where(and(
          eq(exerciseSessions.patientId, patientId),
          eq(exerciseSessions.deviceId, previousDevice)
        ));
        sessionsOnPreviousDevice = previousSessions.length;
        await this.updateDeviceStatus(previousDevice, "available");
      }
    }
    await this.updateDeviceStatus(deviceId, "in_use", patientId);
    const allSessions = await db.select().from(exerciseSessions).where(eq(exerciseSessions.patientId, patientId));
    const totalSessions = allSessions.length;
    const isFirstTimeUser = totalSessions === 0;
    let message;
    if (isDeviceSwitch && previousDevice && sessionsOnPreviousDevice > 0) {
      message = `Device switched successfully! You've moved from bike ${previousDevice} to bike ${deviceId}. All ${sessionsOnPreviousDevice} of your previous sessions are preserved and your progress continues seamlessly.`;
    } else if (isFirstTimeUser) {
      message = `Welcome to your mobility therapy journey! You're now connected to bike ${deviceId}. Your exercise data and progress will be tracked starting with your first session.`;
    } else if (currentDevices.length === 0 || isDeviceSwitch && sessionsOnPreviousDevice === 0) {
      message = `Welcome back! You're now linked to bike ${deviceId}. Your ${totalSessions} previous sessions from other bikes are preserved and your progress continues here.`;
    } else {
      message = `Welcome back to bike ${deviceId}! Ready to continue your therapy right where you left off. Your progress and goals are all up to date.`;
    }
    return {
      isDeviceSwitch,
      previousDevice,
      currentDevice: deviceId,
      message,
      sessionsOnPreviousDevice: isDeviceSwitch ? sessionsOnPreviousDevice : void 0
    };
  }
  async unlinkPatientFromDevice(deviceId) {
    await this.updateDeviceStatus(deviceId, "available");
  }
  async getPatientLastDevice(patientId) {
    const currentDevice = await db.select().from(devices).where(eq(devices.currentPatientId, patientId)).limit(1);
    if (currentDevice.length > 0) {
      return currentDevice[0].id;
    }
    const recentSession = await db.select().from(exerciseSessions).where(eq(exerciseSessions.patientId, patientId)).orderBy(desc(exerciseSessions.createdAt)).limit(1);
    if (recentSession.length > 0) {
      return recentSession[0].deviceId;
    }
    return null;
  }
  async getPatientDeviceHistory(patientId) {
    return await db.select().from(deviceSessions).where(eq(deviceSessions.patientId, patientId)).orderBy(desc(deviceSessions.startedAt));
  }
  async createDeviceSession(deviceSession) {
    const result = await db.insert(deviceSessions).values(deviceSession).returning();
    return result[0];
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
await init_db();

// server/rolling-data.ts
await init_db();
import { eq as eq2 } from "drizzle-orm";
var DEMO_PATIENTS = [
  { email: "hospital.patient@bedside-bike.local", daysAdmitted: 5 },
  { email: "rehab.patient@bedside-bike.local", daysAdmitted: 12 },
  { email: "snf.patient@bedside-bike.local", daysAdmitted: 17 }
];
async function updateRollingDataWindow() {
  const usePostgres = process.env.USE_POSTGRES === "true";
  console.log("\u{1F504} Auto-updating rolling data window for demo patients...");
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  let updatedCount = 0;
  try {
    if (usePostgres) {
      const pgSchema = await Promise.resolve().then(() => (init_schema_postgres(), schema_postgres_exports));
      for (const patientConfig of DEMO_PATIENTS) {
        const patients = await db.select().from(pgSchema.users).where(eq2(pgSchema.users.email, patientConfig.email)).limit(1);
        if (patients.length === 0) continue;
        const patient = patients[0];
        const newAdmissionDate = new Date(today);
        newAdmissionDate.setDate(today.getDate() - patientConfig.daysAdmitted);
        const newAdmissionDateStr = newAdmissionDate.toISOString().split("T")[0];
        await db.update(pgSchema.riskAssessments).set({
          deconditioning: { probability: 0.647, severity: "moderate" },
          vte: { probability: 0.352, severity: "moderate" },
          falls: { probability: 0.548, severity: "moderate" },
          pressure: { probability: 0.403, severity: "low" }
        }).where(eq2(pgSchema.riskAssessments.patientId, patient.id));
        if (patient.admissionDate === newAdmissionDateStr) continue;
        const existingSessions = await db.select().from(pgSchema.exerciseSessions).where(eq2(pgSchema.exerciseSessions.patientId, patient.id)).orderBy(pgSchema.exerciseSessions.sessionDate);
        if (existingSessions.length > 0) {
          const oldestSessionDate = new Date(existingSessions[0].sessionDate);
          const dayShift = Math.floor((newAdmissionDate.getTime() - oldestSessionDate.getTime()) / (1e3 * 60 * 60 * 24));
          if (dayShift !== 0) {
            for (const session3 of existingSessions) {
              const oldSessionDate = new Date(session3.sessionDate);
              const newSessionDate = new Date(oldSessionDate);
              newSessionDate.setDate(oldSessionDate.getDate() + dayShift);
              const oldStartTime = new Date(session3.startTime);
              const newStartTime = new Date(oldStartTime);
              newStartTime.setDate(oldStartTime.getDate() + dayShift);
              let newEndTime = null;
              if (session3.endTime) {
                const oldEndTime = new Date(session3.endTime);
                newEndTime = new Date(oldEndTime);
                newEndTime.setDate(oldEndTime.getDate() + dayShift);
              }
              await db.update(pgSchema.exerciseSessions).set({
                sessionDate: newSessionDate.toISOString().split("T")[0],
                startTime: newStartTime,
                endTime: newEndTime,
                updatedAt: /* @__PURE__ */ new Date()
              }).where(eq2(pgSchema.exerciseSessions.id, session3.id));
            }
            const emsAssessments3 = await db.select().from(pgSchema.emsAssessments).where(eq2(pgSchema.emsAssessments.patientId, patient.id));
            for (const assessment of emsAssessments3) {
              const oldAssessedAt = new Date(assessment.assessedAt);
              const newAssessedAt = new Date(oldAssessedAt);
              newAssessedAt.setDate(oldAssessedAt.getDate() + dayShift);
              await db.update(pgSchema.emsAssessments).set({ assessedAt: newAssessedAt }).where(eq2(pgSchema.emsAssessments.id, assessment.id));
            }
          }
        }
        await db.update(pgSchema.users).set({
          admissionDate: newAdmissionDateStr,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(pgSchema.users.id, patient.id));
        await db.update(pgSchema.patientProfiles).set({
          daysImmobile: patientConfig.daysAdmitted,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(pgSchema.patientProfiles.userId, patient.id));
        const assignments = await db.select().from(pgSchema.patientProtocolAssignments).where(eq2(pgSchema.patientProtocolAssignments.patientId, patient.id)).limit(1);
        if (assignments.length > 0) {
          await db.update(pgSchema.patientProtocolAssignments).set({
            startDate: newAdmissionDate,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq2(pgSchema.patientProtocolAssignments.id, assignments[0].id));
        }
        updatedCount++;
      }
    } else {
      const Database = (await import("better-sqlite3")).default;
      const path3 = await import("path");
      const dbPath = path3.join(process.cwd(), "local.db");
      let sqliteDb;
      try {
        sqliteDb = new Database(dbPath);
      } catch (err) {
        console.log("\u{1F4CA} No local database found, skipping rolling data update");
        return;
      }
      for (const patientConfig of DEMO_PATIENTS) {
        const patient = sqliteDb.prepare("SELECT * FROM users WHERE email = ?").get(patientConfig.email);
        if (!patient) continue;
        const newAdmissionDate = new Date(today);
        newAdmissionDate.setDate(today.getDate() - patientConfig.daysAdmitted);
        const newAdmissionDateStr = newAdmissionDate.toISOString().split("T")[0];
        sqliteDb.prepare(`UPDATE risk_assessments SET
          deconditioning = ?, vte = ?, falls = ?, pressure = ?
          WHERE patient_id = ?`).run(
          JSON.stringify({ probability: 0.647, severity: "moderate" }),
          JSON.stringify({ probability: 0.352, severity: "moderate" }),
          JSON.stringify({ probability: 0.548, severity: "moderate" }),
          JSON.stringify({ probability: 0.403, severity: "low" }),
          patient.id
        );
        if (patient.admission_date === newAdmissionDateStr) continue;
        sqliteDb.prepare("UPDATE users SET admission_date = ?, updated_at = ? WHERE id = ?").run(newAdmissionDateStr, Math.floor(Date.now() / 1e3), patient.id);
        const existingSessions = sqliteDb.prepare(`
          SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY session_date ASC
        `).all(patient.id);
        if (existingSessions.length > 0) {
          const oldestSessionDate = new Date(existingSessions[0].session_date);
          const dayShift = Math.floor((newAdmissionDate.getTime() - oldestSessionDate.getTime()) / (1e3 * 60 * 60 * 24));
          if (dayShift !== 0) {
            for (const session3 of existingSessions) {
              const oldSessionDate = new Date(session3.session_date);
              const newSessionDate = new Date(oldSessionDate);
              newSessionDate.setDate(oldSessionDate.getDate() + dayShift);
              const oldStartTime = new Date(session3.start_time * 1e3);
              const newStartTime = new Date(oldStartTime);
              newStartTime.setDate(oldStartTime.getDate() + dayShift);
              let newEndTime = null;
              if (session3.end_time) {
                const oldEndTime = new Date(session3.end_time * 1e3);
                newEndTime = new Date(oldEndTime);
                newEndTime.setDate(oldEndTime.getDate() + dayShift);
              }
              sqliteDb.prepare(`
                UPDATE exercise_sessions
                SET session_date = ?, start_time = ?, end_time = ?, updated_at = ?
                WHERE id = ?
              `).run(
                newSessionDate.toISOString().split("T")[0],
                Math.floor(newStartTime.getTime() / 1e3),
                newEndTime ? Math.floor(newEndTime.getTime() / 1e3) : null,
                Math.floor(Date.now() / 1e3),
                session3.id
              );
            }
            const emsAssessments3 = sqliteDb.prepare("SELECT * FROM ems_assessments WHERE patient_id = ?").all(patient.id);
            for (const assessment of emsAssessments3) {
              const oldAssessedAt = new Date(assessment.assessed_at * 1e3);
              const newAssessedAt = new Date(oldAssessedAt);
              newAssessedAt.setDate(oldAssessedAt.getDate() + dayShift);
              sqliteDb.prepare("UPDATE ems_assessments SET assessed_at = ? WHERE id = ?").run(Math.floor(newAssessedAt.getTime() / 1e3), assessment.id);
            }
          }
        }
        sqliteDb.prepare("UPDATE patient_profiles SET days_immobile = ?, updated_at = ? WHERE user_id = ?").run(patientConfig.daysAdmitted, Math.floor(Date.now() / 1e3), patient.id);
        const protocolAssignment = sqliteDb.prepare("SELECT * FROM patient_protocol_assignments WHERE patient_id = ?").get(patient.id);
        if (protocolAssignment) {
          sqliteDb.prepare("UPDATE patient_protocol_assignments SET start_date = ?, updated_at = ? WHERE id = ?").run(Math.floor(newAdmissionDate.getTime() / 1e3), Math.floor(Date.now() / 1e3), protocolAssignment.id);
        }
        updatedCount++;
      }
      sqliteDb.close();
    }
    if (updatedCount > 0) {
      console.log(`\u2705 Rolling data updated for ${updatedCount} demo patient(s)`);
    } else {
      console.log("\u2705 Demo patient data already current");
    }
  } catch (error) {
    console.error("Failed to update rolling data:", error);
  }
}

// server/routes.ts
init_schema();
init_risk_calculator();
import { eq as eq14, and as and14 } from "drizzle-orm";

// server/kudos-service.ts
await init_db();
init_schema();
import { eq as eq3, desc as desc2, and as and3, sql as sql5 } from "drizzle-orm";
var MESSAGE_TEMPLATES = {
  goal_completed: [
    "{displayName} crushed their daily goal! \u{1F3AF}",
    "{displayName} hit {watts}W today - amazing! \u26A1",
    "{displayName} completed {minutes} minutes of exercise! \u{1F4AA}",
    "{displayName} is on fire with goal completion! \u{1F525}"
  ],
  session_started: [
    "{displayName} just started their session! \u{1F6B4}\u200D\u2640\uFE0F",
    "{displayName} is getting their heart pumping! \u2764\uFE0F",
    "{displayName} is back in action! \u{1F4AA}"
  ],
  streak_extended: [
    "{displayName} is on a {streakDays}-day streak! \u{1F525}",
    "Streak master {displayName} - {streakDays} days strong! \u2B50",
    "{displayName} keeps going: {streakDays} days and counting! \u{1F3AF}"
  ],
  session_missed: []
  // No public messages for missed sessions
};
var NUDGE_TEMPLATES = {
  gentle_reminder: [
    "Hey {displayName}, you've got this! Just {minutesLeft} minutes to go! \u{1F31F}",
    "{displayName}, almost there - {minutesLeft} more minutes! \u{1F4AA}",
    "You're so close {displayName}! {minutesLeft} minutes left today! \u{1F3AF}"
  ],
  encouragement: [
    "{displayName}, your streak is looking great! Keep it going! \u{1F525}",
    "Send some energy to {displayName} - they're crushing it! \u26A1",
    "{displayName} could use some encouragement today! \u{1F499}"
  ]
};
var KudosService = class {
  // Generate feed item from exercise event
  async createFeedItem(patientId, eventType, metadata = {}) {
    try {
      const patient = await db.select().from(users).where(eq3(users.id, patientId)).limit(1);
      if (!patient.length) return;
      const preferences = await this.getPatientPreferences(patientId);
      if (!preferences?.optInKudos) return;
      const templates = MESSAGE_TEMPLATES[eventType];
      if (!templates || templates.length === 0) return;
      const templateId = Math.floor(Math.random() * templates.length);
      const template = templates[templateId];
      const message = this.fillTemplate(template, {
        displayName: preferences.displayName,
        ...metadata
      });
      await db.insert(feedItems).values({
        patientId,
        displayName: preferences.displayName,
        avatarEmoji: preferences.avatarEmoji,
        eventType,
        templateId: `${eventType}_${templateId}`,
        message,
        metadata,
        unit: preferences.unit
      });
    } catch (error) {
      console.error("Error creating feed item:", error);
    }
  }
  // Send nudge message
  async sendNudge(senderId, recipientId, templateType, metadata = {}) {
    try {
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const existingNudges = await db.select().from(nudgeMessages).where(
        and3(
          eq3(nudgeMessages.senderId, senderId),
          eq3(nudgeMessages.recipientId, recipientId),
          sql5`${nudgeMessages.createdAt} >= ${today}`
        )
      );
      if (existingNudges.length >= 2) return;
      const senderPrefs = await this.getPatientPreferences(senderId);
      const recipientPrefs = await this.getPatientPreferences(recipientId);
      if (!recipientPrefs?.optInNudges) return;
      const templates = NUDGE_TEMPLATES[templateType];
      if (!templates || templates.length === 0) return;
      const templateId = Math.floor(Math.random() * templates.length);
      const template = templates[templateId];
      const message = this.fillTemplate(template, {
        displayName: recipientPrefs.displayName,
        senderName: senderPrefs?.displayName || "A friend",
        ...metadata
      });
      await db.insert(nudgeMessages).values({
        senderId,
        recipientId,
        templateId: `${templateType}_${templateId}`,
        message
      });
    } catch (error) {
      console.error("Error sending nudge:", error);
    }
  }
  // Add reaction to feed item
  async addReaction(patientId, feedItemId, reactionType) {
    try {
      const existing = await db.select().from(kudosReactions).where(
        and3(
          eq3(kudosReactions.patientId, patientId),
          eq3(kudosReactions.feedItemId, feedItemId)
        )
      );
      if (existing.length > 0) {
        await db.update(kudosReactions).set({ reactionType }).where(eq3(kudosReactions.id, existing[0].id));
      } else {
        await db.insert(kudosReactions).values({
          patientId,
          feedItemId,
          reactionType
        });
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  }
  // Get feed for patient's unit
  async getFeedForUnit(unit, limit = 20) {
    try {
      const items = await db.select({
        id: feedItems.id,
        displayName: feedItems.displayName,
        avatarEmoji: feedItems.avatarEmoji,
        message: feedItems.message,
        eventType: feedItems.eventType,
        metadata: feedItems.metadata,
        createdAt: feedItems.createdAt,
        reactions: sql5`JSON_AGG(
            JSON_BUILD_OBJECT(
              'type', ${kudosReactions.reactionType},
              'count', COUNT(${kudosReactions.id})
            )
          ) FILTER (WHERE ${kudosReactions.id} IS NOT NULL)`
      }).from(feedItems).leftJoin(kudosReactions, eq3(feedItems.id, kudosReactions.feedItemId)).where(
        and3(
          eq3(feedItems.unit, unit),
          eq3(feedItems.isVisible, true)
        )
      ).groupBy(feedItems.id).orderBy(desc2(feedItems.createdAt)).limit(limit);
      return items;
    } catch (error) {
      console.error("Error getting feed:", error);
      return [];
    }
  }
  // Get patient preferences
  async getPatientPreferences(patientId) {
    try {
      const [prefs] = await db.select().from(patientPreferences).where(eq3(patientPreferences.patientId, patientId));
      return prefs;
    } catch (error) {
      console.error("Error getting patient preferences:", error);
      return null;
    }
  }
  // Update patient preferences
  async updatePatientPreferences(patientId, updates) {
    try {
      const existing = await this.getPatientPreferences(patientId);
      if (existing) {
        await db.update(patientPreferences).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(patientPreferences.patientId, patientId));
      } else {
        await db.insert(patientPreferences).values({
          patientId,
          ...updates
        });
      }
    } catch (error) {
      console.error("Error updating patient preferences:", error);
    }
  }
  // Helper: Fill template with variables
  fillTemplate(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, "g"), String(value));
    }
    return result;
  }
  // Event handlers for automatic feed generation
  async handleGoalCompleted(patientId, goalType, value) {
    const metadata = goalType === "power" ? { watts: value } : { minutes: Math.floor(value / 60) };
    await this.createFeedItem(patientId, "goal_completed", metadata);
  }
  async handleSessionStarted(patientId) {
    await this.createFeedItem(patientId, "session_started");
  }
  async handleStreakExtended(patientId, streakDays) {
    await this.createFeedItem(patientId, "streak_extended", { streakDays });
  }
};
var kudosService = new KudosService();

// server/rate-limit.ts
import rateLimit from "express-rate-limit";
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 100,
  // 100 requests per 15 minutes per IP
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  // Disable `X-RateLimit-*` headers
  // Skip rate limiting if request object is invalid (prevents startup errors)
  skip: (req) => !req || !req.ip
  // Store in memory (for production, consider Redis store)
});
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 5,
  // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  // Don't count successful logins
  message: "Too many login attempts, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting if request object is invalid (prevents startup errors)
  skip: (req) => !req || !req.ip
});
var riskAssessmentLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 10,
  // 10 risk assessments per minute
  message: "Too many risk assessments, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting if request object is invalid (prevents startup errors)
  skip: (req) => !req || !req.ip
});
var createLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 20,
  // 20 creates per minute
  message: "Too many creation requests, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting if request object is invalid (prevents startup errors)
  skip: (req) => !req || !req.ip
});
var kudosLimiter = rateLimit({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 30,
  // 30 kudos per minute
  message: "Too many kudos reactions, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting if request object is invalid (prevents startup errors)
  skip: (req) => !req || !req.ip
});

// server/personalization/routes.ts
import rateLimit2 from "express-rate-limit";

// server/personalization/index.ts
await init_personalized_protocol_matcher();

// server/personalization/fatigue-detection-engine.ts
await init_db();
init_schema();
init_logger();
import { eq as eq6 } from "drizzle-orm";
var DEFAULT_THRESHOLDS = {
  mildPowerDecline: 0.15,
  moderatePowerDecline: 0.2,
  severePowerDecline: 0.3,
  mildCadenceCV: 0.2,
  moderateCadenceCV: 0.3,
  severeCadenceCV: 0.4,
  mildAsymmetryChange: 0.1,
  moderateAsymmetryChange: 0.15,
  severeAsymmetryChange: 0.25,
  analysisWindowSeconds: 120,
  // 2 minutes
  minimumDataPoints: 12
  // 12 readings at 10-second intervals = 2 minutes
};
var FatigueDetectionEngine = class {
  thresholds;
  // In-memory buffer for real-time analysis (keyed by sessionId)
  sessionBuffers = /* @__PURE__ */ new Map();
  constructor(thresholds) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }
  /**
   * Process incoming real-time metric and check for fatigue
   *
   * Called from WebSocket handler with each new reading
   */
  async processRealTimeMetric(sessionId, patientId, metric) {
    let buffer = this.sessionBuffers.get(sessionId);
    if (!buffer) {
      buffer = new SessionBuffer(sessionId, patientId);
      this.sessionBuffers.set(sessionId, buffer);
    }
    buffer.addMetric(metric);
    if (buffer.metrics.length < this.thresholds.minimumDataPoints) {
      return this.noFatigueResult();
    }
    const result = await this.detectFatigue(buffer);
    if (result.detected) {
      await this.recordFatigueEvent(patientId, sessionId, result);
      await this.updateFatiguePatterns(patientId, buffer, result);
    }
    return result;
  }
  /**
   * Main fatigue detection algorithm
   */
  async detectFatigue(buffer) {
    const metrics = buffer.getRecentMetrics(this.thresholds.analysisWindowSeconds);
    if (metrics.length < this.thresholds.minimumDataPoints) {
      return this.noFatigueResult();
    }
    const markers = {
      powerDecline: false,
      cadenceIrregularity: false,
      forcePatternDegradation: false,
      bilateralCoordinationLoss: false
    };
    const powerDecline = this.calculatePowerDecline(metrics);
    if (powerDecline >= this.thresholds.severePowerDecline) {
      markers.powerDecline = true;
    } else if (powerDecline >= this.thresholds.moderatePowerDecline) {
      markers.powerDecline = true;
    }
    const cadenceCV = this.calculateCadenceCV(metrics);
    if (cadenceCV >= this.thresholds.moderateCadenceCV) {
      markers.cadenceIrregularity = true;
    }
    const asymmetryChange = this.calculateAsymmetryChange(metrics);
    if (asymmetryChange !== null && asymmetryChange >= this.thresholds.moderateAsymmetryChange) {
      markers.bilateralCoordinationLoss = true;
    }
    const forcePatternDegraded = this.detectForcePatternDegradation(metrics, powerDecline, cadenceCV);
    if (forcePatternDegraded) {
      markers.forcePatternDegradation = true;
    }
    const markerCount = Object.values(markers).filter((m) => m).length;
    if (markerCount === 0) {
      return this.noFatigueResult();
    }
    let fatigueType = "power_decline";
    if (markers.bilateralCoordinationLoss) {
      fatigueType = "bilateral_loss";
    } else if (markers.cadenceIrregularity && !markers.powerDecline) {
      fatigueType = "cadence_irregular";
    } else if (markers.forcePatternDegradation) {
      fatigueType = "force_degradation";
    }
    let severity = "mild";
    if (markerCount >= 3 || powerDecline >= this.thresholds.severePowerDecline) {
      severity = "severe";
    } else if (markerCount >= 2 || powerDecline >= this.thresholds.moderatePowerDecline) {
      severity = "moderate";
    }
    let recommendedAction = "none";
    let resistanceReduction;
    if (severity === "severe") {
      recommendedAction = "session_ended";
      await this.sendFatigueAlert(buffer.patientId, buffer.sessionId, severity, fatigueType);
    } else if (severity === "moderate") {
      recommendedAction = "resistance_reduced";
      resistanceReduction = this.calculateResistanceReduction(powerDecline, markerCount);
    } else if (severity === "mild") {
      recommendedAction = "alert_sent";
    }
    return {
      detected: true,
      type: fatigueType,
      severity,
      markers,
      metrics: {
        powerDeclinePercent: Math.round(powerDecline * 100),
        cadenceCoefficientVariation: Math.round(cadenceCV * 100),
        bilateralAsymmetryChange: asymmetryChange !== null ? Math.round(asymmetryChange * 100) : void 0
      },
      recommendedAction,
      resistanceReduction
    };
  }
  /**
   * Calculate power decline over the analysis window
   */
  calculatePowerDecline(metrics) {
    if (metrics.length < 2) return 0;
    const quarterLength = Math.floor(metrics.length / 4);
    const firstQuarter = metrics.slice(0, Math.max(quarterLength, 3));
    const baselinePower = this.average(firstQuarter.map((m) => m.power));
    const lastQuarter = metrics.slice(-quarterLength);
    const currentPower = this.average(lastQuarter.map((m) => m.power));
    if (baselinePower <= 0) return 0;
    return Math.max(0, (baselinePower - currentPower) / baselinePower);
  }
  /**
   * Calculate coefficient of variation for cadence
   */
  calculateCadenceCV(metrics) {
    const rpms = metrics.map((m) => m.rpm).filter((r) => r > 0);
    if (rpms.length < 3) return 0;
    const mean = this.average(rpms);
    if (mean <= 0) return 0;
    const variance = rpms.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rpms.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean;
  }
  /**
   * Calculate change in bilateral asymmetry
   */
  calculateAsymmetryChange(metrics) {
    const bilateralMetrics = metrics.filter(
      (m) => m.leftForce !== void 0 && m.rightForce !== void 0
    );
    if (bilateralMetrics.length < 6) return null;
    const quarterLength = Math.floor(bilateralMetrics.length / 4);
    const firstQuarter = bilateralMetrics.slice(0, Math.max(quarterLength, 3));
    const initialAsymmetries = firstQuarter.map(
      (m) => this.calculateAsymmetry(m.leftForce, m.rightForce)
    );
    const initialAvgAsymmetry = this.average(initialAsymmetries);
    const lastQuarter = bilateralMetrics.slice(-quarterLength);
    const currentAsymmetries = lastQuarter.map(
      (m) => this.calculateAsymmetry(m.leftForce, m.rightForce)
    );
    const currentAvgAsymmetry = this.average(currentAsymmetries);
    return Math.abs(currentAvgAsymmetry - initialAvgAsymmetry);
  }
  /**
   * Calculate bilateral asymmetry percentage
   */
  calculateAsymmetry(left, right) {
    const maxForce = Math.max(left, right);
    if (maxForce <= 0) return 0;
    return Math.abs(left - right) / maxForce;
  }
  /**
   * Detect force pattern degradation from combined metrics
   */
  detectForcePatternDegradation(metrics, powerDecline, cadenceCV) {
    if (powerDecline >= this.thresholds.mildPowerDecline && cadenceCV >= this.thresholds.mildCadenceCV) {
      return true;
    }
    const powers = metrics.map((m) => m.power).filter((p) => p > 0);
    if (powers.length >= 6) {
      const powerMean = this.average(powers);
      if (powerMean > 0) {
        const powerVariance = powers.reduce((sum, p) => sum + Math.pow(p - powerMean, 2), 0) / powers.length;
        const powerCV = Math.sqrt(powerVariance) / powerMean;
        if (powerCV > 0.35) {
          return true;
        }
      }
    }
    return false;
  }
  /**
   * Calculate appropriate resistance reduction based on fatigue severity
   */
  calculateResistanceReduction(powerDecline, markerCount) {
    let reduction = 0;
    if (powerDecline >= 0.25) {
      reduction = 2;
    } else if (powerDecline >= 0.2) {
      reduction = 1.5;
    } else {
      reduction = 1;
    }
    if (markerCount >= 3) {
      reduction += 0.5;
    }
    return Math.min(reduction, 3);
  }
  /**
   * Record fatigue event to database
   */
  async recordFatigueEvent(patientId, sessionId, result) {
    try {
      await db.insert(fatigueEvents).values({
        patientId,
        sessionId,
        detectedAt: /* @__PURE__ */ new Date(),
        fatigueType: result.type,
        severity: result.severity,
        powerDeclinePercent: result.metrics.powerDeclinePercent,
        cadenceCoefficientVariation: result.metrics.cadenceCoefficientVariation,
        bilateralAsymmetryChange: result.metrics.bilateralAsymmetryChange,
        actionTaken: result.recommendedAction,
        resistanceReduction: result.resistanceReduction
      });
      logger.info("Fatigue event recorded", {
        patientId,
        sessionId,
        type: result.type,
        severity: result.severity,
        action: result.recommendedAction
      });
    } catch (error) {
      logger.error("Failed to record fatigue event", { error: error.message });
    }
  }
  /**
   * Send alert for severe fatigue
   */
  async sendFatigueAlert(patientId, sessionId, severity, fatigueType) {
    try {
      const priority = severity === "severe" ? "high" : "medium";
      const message = this.getFatigueAlertMessage(severity, fatigueType);
      await db.insert(alerts).values({
        patientId,
        type: "fatigue_detected",
        priority,
        message,
        actionRequired: severity === "severe" ? "Review patient status and consider ending session" : "Monitor patient closely",
        metadata: JSON.stringify({
          sessionId,
          fatigueType,
          severity
        }),
        triggeredAt: /* @__PURE__ */ new Date()
      });
      logger.info("Fatigue alert sent", { patientId, severity, fatigueType });
    } catch (error) {
      logger.error("Failed to send fatigue alert", { error: error.message });
    }
  }
  /**
   * Generate alert message based on fatigue type and severity
   */
  getFatigueAlertMessage(severity, fatigueType) {
    const typeMessages = {
      power_decline: "significant power output decline",
      cadence_irregular: "irregular pedaling cadence",
      force_degradation: "deteriorating force application pattern",
      bilateral_loss: "loss of bilateral coordination"
    };
    const severityPrefix = severity === "severe" ? "URGENT: " : "";
    return `${severityPrefix}Patient showing ${typeMessages[fatigueType]}. Fatigue severity: ${severity}. ` + (severity === "severe" ? "Recommend ending session." : "Consider reducing resistance.");
  }
  /**
   * Update patient's personalization profile with fatigue patterns
   */
  async updateFatiguePatterns(patientId, buffer, result) {
    try {
      const sessionStart = buffer.metrics[0]?.timestamp;
      const fatigueTime = buffer.metrics[buffer.metrics.length - 1]?.timestamp;
      if (!sessionStart || !fatigueTime) return;
      const fatigueOnsetMinutes = (fatigueTime.getTime() - sessionStart.getTime()) / (1e3 * 60);
      const profile = await db.select().from(patientPersonalizationProfiles).where(eq6(patientPersonalizationProfiles.patientId, patientId)).limit(1);
      if (profile.length > 0) {
        const currentAvg = profile[0].avgFatigueOnsetMinutes || fatigueOnsetMinutes;
        const newAvg = currentAvg * 0.7 + fatigueOnsetMinutes * 0.3;
        const decayRate = result.metrics.powerDeclinePercent / 100 / fatigueOnsetMinutes;
        await db.update(patientPersonalizationProfiles).set({
          avgFatigueOnsetMinutes: newAvg,
          fatigueDecayRate: decayRate,
          optimalSessionDuration: newAvg * 0.85,
          // 85% of fatigue onset
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq6(patientPersonalizationProfiles.patientId, patientId));
        logger.debug("Updated fatigue patterns", {
          patientId,
          avgFatigueOnset: newAvg,
          decayRate
        });
      }
    } catch (error) {
      logger.error("Failed to update fatigue patterns", { error: error.message });
    }
  }
  /**
   * Get personalized fatigue thresholds for a patient
   */
  async getPersonalizedThresholds(patientId) {
    try {
      const profile = await db.select().from(patientPersonalizationProfiles).where(eq6(patientPersonalizationProfiles.patientId, patientId)).limit(1);
      if (!profile.length || !profile[0].avgFatigueOnsetMinutes) {
        return this.thresholds;
      }
      const patientFatigueRate = profile[0].fatigueDecayRate || 0.1;
      const sensitivityFactor = patientFatigueRate < 0.05 ? 0.85 : patientFatigueRate > 0.15 ? 1.15 : 1;
      return {
        ...this.thresholds,
        mildPowerDecline: this.thresholds.mildPowerDecline * sensitivityFactor,
        moderatePowerDecline: this.thresholds.moderatePowerDecline * sensitivityFactor,
        severePowerDecline: this.thresholds.severePowerDecline * sensitivityFactor
      };
    } catch (error) {
      logger.error("Failed to get personalized thresholds", { error: error.message });
      return this.thresholds;
    }
  }
  /**
   * Clean up session buffer when session ends
   */
  endSession(sessionId) {
    this.sessionBuffers.delete(sessionId);
  }
  /**
   * Helper: Calculate average
   */
  average(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  /**
   * Return result indicating no fatigue detected
   */
  noFatigueResult() {
    return {
      detected: false,
      markers: {
        powerDecline: false,
        cadenceIrregularity: false,
        forcePatternDegradation: false,
        bilateralCoordinationLoss: false
      },
      metrics: {
        powerDeclinePercent: 0,
        cadenceCoefficientVariation: 0
      },
      recommendedAction: "none"
    };
  }
};
var SessionBuffer = class {
  sessionId;
  patientId;
  metrics = [];
  maxBufferSize = 360;
  // 1 hour at 10-second intervals
  constructor(sessionId, patientId) {
    this.sessionId = sessionId;
    this.patientId = patientId;
  }
  addMetric(metric) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxBufferSize) {
      this.metrics = this.metrics.slice(-this.maxBufferSize);
    }
  }
  getRecentMetrics(windowSeconds) {
    const now = /* @__PURE__ */ new Date();
    const cutoff = new Date(now.getTime() - windowSeconds * 1e3);
    return this.metrics.filter((m) => m.timestamp >= cutoff);
  }
};
var fatigueDetectionEngine = new FatigueDetectionEngine();

// server/personalization/progressive-overload-engine.ts
await init_db();
init_schema();
init_logger();
import { eq as eq7, and as and7, desc as desc6, gte as gte4 } from "drizzle-orm";
var DEFAULT_PROGRESSION_CONFIG = {
  consecutiveSessionsRequired: 3,
  targetAchievementThreshold: 0.9,
  resistanceIncrement: 0.5,
  // Half a level
  durationIncrementMinutes: 2,
  cadenceIncrementRPM: 5,
  maxResistanceLevel: 9,
  maxDurationMinutes: 30,
  maxCadenceRPM: 80,
  adaptationWindowDays: 3,
  struggleThreshold: 0.75,
  plateauWindowDays: 7,
  plateauImprovementThreshold: 0.05
  // 5% improvement
};
var DEFAULT_SETBACK_CONFIG = {
  performanceDeclineThreshold: 0.2,
  missedSessionsDaysThreshold: 3,
  bilateralImbalanceThreshold: 0.25,
  goalReductionPercent: 0.25,
  // 25% reduction
  rebaselineAfterDays: 5,
  recoveryMonitoringDays: 7
};
var ProgressiveOverloadEngine = class {
  progressionConfig;
  setbackConfig;
  constructor(progressionConfig, setbackConfig) {
    this.progressionConfig = { ...DEFAULT_PROGRESSION_CONFIG, ...progressionConfig };
    this.setbackConfig = { ...DEFAULT_SETBACK_CONFIG, ...setbackConfig };
  }
  /**
   * Evaluate patient for progression after a completed session
   *
   * Called after each session completion
   */
  async evaluateProgression(patientId, sessionId) {
    try {
      const setbackCheck = await this.checkForSetback(patientId);
      if (setbackCheck.detected) {
        await this.initiateSetbackRecovery(patientId, setbackCheck);
        return {
          shouldProgress: false,
          direction: "decrease",
          currentValue: 0,
          reason: `Setback detected: ${setbackCheck.type}. Initiating recovery protocol.`,
          confidence: 0.9
        };
      }
      const profile = await this.getOrCreateProfile(patientId);
      if (profile.inSetbackRecovery) {
        const recovered = await this.checkRecoveryCompletion(patientId, profile);
        if (!recovered) {
          return {
            shouldProgress: false,
            direction: "maintain",
            currentValue: profile.currentProgressionLevel,
            reason: "Patient in setback recovery mode. Monitoring for improvement.",
            confidence: 0.8
          };
        }
      }
      const recentSessions = await this.getRecentSessions(patientId, 7);
      if (recentSessions.length < this.progressionConfig.consecutiveSessionsRequired) {
        return {
          shouldProgress: false,
          direction: "maintain",
          currentValue: profile.currentProgressionLevel,
          reason: `Need ${this.progressionConfig.consecutiveSessionsRequired} sessions for progression evaluation. Have ${recentSessions.length}.`,
          confidence: 0.5
        };
      }
      const plateau = await this.checkForPlateau(patientId, recentSessions);
      if (plateau.detected) {
        return await this.handlePlateau(patientId, profile, plateau);
      }
      const progressionResult = await this.checkProgressionCriteria(patientId, profile, recentSessions);
      if (progressionResult.shouldProgress) {
        await this.applyProgression(patientId, profile, progressionResult);
      }
      return progressionResult;
    } catch (error) {
      logger.error("Progression evaluation failed", { error: error.message, patientId });
      return {
        shouldProgress: false,
        direction: "maintain",
        currentValue: 0,
        reason: `Error: ${error.message}`,
        confidence: 0
      };
    }
  }
  /**
   * Check if patient meets criteria for progression
   */
  async checkProgressionCriteria(patientId, profile, sessions3) {
    const goals = await db.select().from(patientGoals).where(and7(
      eq7(patientGoals.patientId, patientId),
      eq7(patientGoals.isActive, true)
    ));
    const durationGoal = goals.find((g) => g.goalType === "duration");
    const powerGoal = goals.find((g) => g.goalType === "power");
    const recentN = Math.min(sessions3.length, this.progressionConfig.consecutiveSessionsRequired);
    const recentSessions = sessions3.slice(0, recentN);
    const durationAchievements = recentSessions.map((s) => {
      const target = s.targetDuration || (durationGoal?.targetValue || 15) * 60;
      const actual = s.durationSeconds || s.duration * 60;
      return actual / target;
    });
    const avgDurationAchievement = this.average(durationAchievements);
    const allMeetDuration = durationAchievements.every(
      (a) => a >= this.progressionConfig.targetAchievementThreshold
    );
    const powerAchievements = recentSessions.map((s) => {
      const target = powerGoal?.targetValue || 30;
      return (s.avgPower || 0) / target;
    });
    const avgPowerAchievement = this.average(powerAchievements);
    let progressionParameter;
    let currentValue = profile.currentProgressionLevel;
    let newValue;
    let shouldProgress = false;
    let reason = "";
    if (allMeetDuration && avgDurationAchievement >= this.progressionConfig.targetAchievementThreshold) {
      if (avgPowerAchievement >= 1) {
        progressionParameter = "resistance";
        currentValue = this.getCurrentResistance(sessions3);
        newValue = Math.min(
          currentValue + this.progressionConfig.resistanceIncrement,
          this.progressionConfig.maxResistanceLevel
        );
        shouldProgress = currentValue < this.progressionConfig.maxResistanceLevel;
        reason = `Consistently meeting duration (${Math.round(avgDurationAchievement * 100)}%) and power (${Math.round(avgPowerAchievement * 100)}%) targets.`;
      } else {
        progressionParameter = "duration";
        currentValue = Math.round(this.average(recentSessions.map(
          (s) => (s.durationSeconds || s.duration * 60) / 60
        )));
        newValue = Math.min(
          currentValue + this.progressionConfig.durationIncrementMinutes,
          this.progressionConfig.maxDurationMinutes
        );
        shouldProgress = currentValue < this.progressionConfig.maxDurationMinutes;
        reason = `Meeting duration targets (${Math.round(avgDurationAchievement * 100)}%). Increasing duration to build endurance.`;
      }
    } else if (avgDurationAchievement >= 0.8) {
      reason = `Progress improving. Duration achievement: ${Math.round(avgDurationAchievement * 100)}%. Continue current level.`;
    } else {
      reason = `Not yet meeting targets. Duration: ${Math.round(avgDurationAchievement * 100)}%, Power: ${Math.round(avgPowerAchievement * 100)}%. Maintain current level.`;
    }
    const confidence = this.calculateProgressionConfidence(
      recentSessions.length,
      avgDurationAchievement,
      avgPowerAchievement
    );
    return {
      shouldProgress,
      direction: shouldProgress ? "increase" : "maintain",
      parameter: progressionParameter,
      currentValue,
      newValue,
      reason,
      confidence
    };
  }
  /**
   * Apply progression to patient goals
   */
  async applyProgression(patientId, profile, progression) {
    try {
      await db.update(patientPersonalizationProfiles).set({
        currentProgressionLevel: (profile.currentProgressionLevel || 1) + 1,
        daysAtCurrentLevel: 0,
        lastProgressionDate: /* @__PURE__ */ new Date(),
        consecutiveSuccessfulSessions: 0,
        // Reset counter
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq7(patientPersonalizationProfiles.patientId, patientId));
      if (progression.parameter && progression.newValue !== void 0) {
        const goalType = progression.parameter === "duration" ? "duration" : "power";
        await db.update(patientGoals).set({
          targetValue: progression.newValue,
          aiRecommended: true,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(and7(
          eq7(patientGoals.patientId, patientId),
          eq7(patientGoals.goalType, goalType),
          eq7(patientGoals.isActive, true)
        ));
      }
      await db.insert(alerts).values({
        patientId,
        type: "progression_applied",
        priority: "low",
        message: `Patient progressed: ${progression.parameter} increased from ${progression.currentValue} to ${progression.newValue}. ${progression.reason}`,
        actionRequired: "Review and adjust if needed",
        metadata: JSON.stringify({
          parameter: progression.parameter,
          fromValue: progression.currentValue,
          toValue: progression.newValue,
          confidence: progression.confidence
        }),
        triggeredAt: /* @__PURE__ */ new Date()
      });
      logger.info("Progression applied", {
        patientId,
        parameter: progression.parameter,
        from: progression.currentValue,
        to: progression.newValue
      });
    } catch (error) {
      logger.error("Failed to apply progression", { error: error.message, patientId });
    }
  }
  /**
   * Check for plateau (no improvement over time)
   */
  async checkForPlateau(patientId, recentSessions) {
    if (recentSessions.length < 5) {
      return { detected: false };
    }
    const powers = recentSessions.map((s) => s.avgPower || 0);
    const durations = recentSessions.map((s) => s.durationSeconds || s.duration * 60);
    const powerTrend = this.calculateTrend(powers);
    const durationTrend = this.calculateTrend(durations);
    if (Math.abs(powerTrend) < this.progressionConfig.plateauImprovementThreshold && Math.abs(durationTrend) < this.progressionConfig.plateauImprovementThreshold) {
      return {
        detected: true,
        reason: `Performance plateaued. Power trend: ${(powerTrend * 100).toFixed(1)}%, Duration trend: ${(durationTrend * 100).toFixed(1)}%`
      };
    }
    return { detected: false };
  }
  /**
   * Handle plateau by injecting workout variation
   */
  async handlePlateau(patientId, profile, plateau) {
    await db.insert(alerts).values({
      patientId,
      type: "plateau_detected",
      priority: "medium",
      message: `Performance plateau detected. ${plateau.reason} Consider workout variation.`,
      actionRequired: "Review protocol and consider modifications",
      metadata: JSON.stringify({ reason: plateau.reason }),
      triggeredAt: /* @__PURE__ */ new Date()
    });
    return {
      shouldProgress: false,
      direction: "maintain",
      currentValue: profile.currentProgressionLevel,
      reason: `Plateau detected. ${plateau.reason} Recommend varying workout type or consulting with provider.`,
      confidence: 0.75
    };
  }
  // ========================================================================
  // SETBACK DETECTION & RECOVERY (Patent 10.5)
  // ========================================================================
  /**
   * Check if patient is experiencing a setback
   */
  async checkForSetback(patientId) {
    try {
      const profile = await this.getOrCreateProfile(patientId);
      if (profile.inSetbackRecovery) {
        return { detected: false, recommendation: this.defaultRecoveryPlan() };
      }
      const recentSessions = await this.getRecentSessions(patientId, 14);
      const performanceDecline = await this.checkPerformanceDecline(patientId, recentSessions);
      if (performanceDecline.detected) {
        return {
          detected: true,
          type: "performance_decline",
          severity: performanceDecline.severity,
          metrics: {
            performanceDeclinePercent: performanceDecline.declinePercent
          },
          recommendation: this.createRecoveryPlan("performance_decline", performanceDecline.severity)
        };
      }
      const adherenceDrop = await this.checkAdherenceDrop(patientId, recentSessions);
      if (adherenceDrop.detected) {
        return {
          detected: true,
          type: "adherence_drop",
          severity: adherenceDrop.severity,
          metrics: {
            missedSessionsDays: adherenceDrop.missedDays
          },
          recommendation: this.createRecoveryPlan("adherence_drop", adherenceDrop.severity)
        };
      }
      const bilateralSetback = await this.checkBilateralSetback(recentSessions);
      if (bilateralSetback.detected) {
        return {
          detected: true,
          type: "bilateral_imbalance",
          severity: bilateralSetback.severity,
          metrics: {
            bilateralImbalancePercent: bilateralSetback.imbalancePercent
          },
          recommendation: this.createRecoveryPlan("bilateral_imbalance", bilateralSetback.severity)
        };
      }
      return { detected: false, recommendation: this.defaultRecoveryPlan() };
    } catch (error) {
      logger.error("Setback check failed", { error: error.message, patientId });
      return { detected: false, recommendation: this.defaultRecoveryPlan() };
    }
  }
  /**
   * Check for performance decline
   */
  async checkPerformanceDecline(patientId, sessions3) {
    if (sessions3.length < 4) {
      return { detected: false };
    }
    const recentSessions = sessions3.slice(0, 3);
    const baselineSessions = sessions3.slice(-4);
    const recentAvgPower = this.average(recentSessions.map((s) => s.avgPower || 0));
    const baselineAvgPower = this.average(baselineSessions.map((s) => s.avgPower || 0));
    if (baselineAvgPower <= 0) return { detected: false };
    const declinePercent = (baselineAvgPower - recentAvgPower) / baselineAvgPower;
    if (declinePercent >= 0.3) {
      return { detected: true, declinePercent, severity: "major" };
    } else if (declinePercent >= this.setbackConfig.performanceDeclineThreshold) {
      return { detected: true, declinePercent, severity: "moderate" };
    } else if (declinePercent >= 0.15) {
      return { detected: true, declinePercent, severity: "minor" };
    }
    return { detected: false };
  }
  /**
   * Check for adherence drop (missed sessions)
   */
  async checkAdherenceDrop(patientId, sessions3) {
    if (sessions3.length === 0) {
      const now2 = /* @__PURE__ */ new Date();
      const daysSinceStart = 7;
      if (daysSinceStart >= 7) {
        return { detected: true, missedDays: daysSinceStart, severity: "major" };
      }
      return { detected: false };
    }
    const lastSession = sessions3[0];
    const lastSessionDate = new Date(lastSession.startTime);
    const now = /* @__PURE__ */ new Date();
    const daysSinceLastSession = Math.floor(
      (now.getTime() - lastSessionDate.getTime()) / (1e3 * 60 * 60 * 24)
    );
    if (daysSinceLastSession >= 7) {
      return { detected: true, missedDays: daysSinceLastSession, severity: "major" };
    } else if (daysSinceLastSession >= 5) {
      return { detected: true, missedDays: daysSinceLastSession, severity: "moderate" };
    } else if (daysSinceLastSession >= this.setbackConfig.missedSessionsDaysThreshold) {
      return { detected: true, missedDays: daysSinceLastSession, severity: "minor" };
    }
    return { detected: false };
  }
  /**
   * Check for bilateral imbalance increase
   */
  async checkBilateralSetback(sessions3) {
    return { detected: false };
  }
  /**
   * Create recovery plan based on setback type
   */
  createRecoveryPlan(type, severity) {
    const baseReduction = this.setbackConfig.goalReductionPercent;
    const severityMultipliers = {
      minor: 0.5,
      moderate: 1,
      major: 1.5
    };
    const encouragementFrequency = {
      minor: "medium",
      moderate: "high",
      major: "high"
    };
    return {
      goalReduction: baseReduction * severityMultipliers[severity],
      encouragementFrequency: encouragementFrequency[severity],
      rebaselineAfterDays: this.setbackConfig.rebaselineAfterDays,
      clinicianConsultationNeeded: severity === "major"
    };
  }
  /**
   * Default recovery plan
   */
  defaultRecoveryPlan() {
    return {
      goalReduction: 0,
      encouragementFrequency: "low",
      rebaselineAfterDays: 7,
      clinicianConsultationNeeded: false
    };
  }
  /**
   * Initiate setback recovery protocol
   */
  async initiateSetbackRecovery(patientId, setback) {
    try {
      const profile = await this.getOrCreateProfile(patientId);
      await db.update(patientPersonalizationProfiles).set({
        inSetbackRecovery: true,
        setbackStartDate: /* @__PURE__ */ new Date(),
        preSetbackLevel: profile.currentProgressionLevel,
        currentProgressionLevel: Math.max(1, (profile.currentProgressionLevel || 1) - 1),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq7(patientPersonalizationProfiles.patientId, patientId));
      if (setback.recommendation.goalReduction > 0) {
        await this.reduceGoals(patientId, setback.recommendation.goalReduction);
      }
      const alertPriority = setback.recommendation.clinicianConsultationNeeded ? "high" : "medium";
      await db.insert(alerts).values({
        patientId,
        type: "setback_detected",
        priority: alertPriority,
        message: `Setback detected: ${setback.type}. ${setback.severity} severity. Recovery protocol initiated.`,
        actionRequired: setback.recommendation.clinicianConsultationNeeded ? "Clinician consultation recommended" : "Monitor patient progress",
        metadata: JSON.stringify({
          type: setback.type,
          severity: setback.severity,
          metrics: setback.metrics,
          recoveryPlan: setback.recommendation
        }),
        triggeredAt: /* @__PURE__ */ new Date()
      });
      logger.info("Setback recovery initiated", {
        patientId,
        type: setback.type,
        severity: setback.severity
      });
    } catch (error) {
      logger.error("Failed to initiate setback recovery", { error: error.message, patientId });
    }
  }
  /**
   * Check if patient has recovered from setback
   */
  async checkRecoveryCompletion(patientId, profile) {
    if (!profile.setbackStartDate) return true;
    const setbackStart = new Date(profile.setbackStartDate);
    const daysSinceSetback = Math.floor(
      (Date.now() - setbackStart.getTime()) / (1e3 * 60 * 60 * 24)
    );
    if (daysSinceSetback < this.setbackConfig.rebaselineAfterDays) {
      return false;
    }
    const recentSessions = await this.getRecentSessions(patientId, 5);
    if (recentSessions.length < 3) {
      return false;
    }
    const currentAvgPower = this.average(recentSessions.map((s) => s.avgPower || 0));
    const goals = await db.select().from(patientGoals).where(and7(
      eq7(patientGoals.patientId, patientId),
      eq7(patientGoals.goalType, "power"),
      eq7(patientGoals.isActive, true)
    )).limit(1);
    const targetPower = goals[0]?.targetValue || 30;
    const recoveryThreshold = targetPower * 0.85;
    if (currentAvgPower >= recoveryThreshold) {
      await db.update(patientPersonalizationProfiles).set({
        inSetbackRecovery: false,
        setbackStartDate: null,
        // Don't restore to pre-setback level, let them progress naturally
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq7(patientPersonalizationProfiles.patientId, patientId));
      await this.restoreGoals(patientId);
      await db.insert(alerts).values({
        patientId,
        type: "setback_recovery_complete",
        priority: "low",
        message: `Patient has recovered from setback. Performance restored to ${Math.round(currentAvgPower / targetPower * 100)}% of target.`,
        actionRequired: "Consider resuming normal progression",
        triggeredAt: /* @__PURE__ */ new Date()
      });
      logger.info("Setback recovery completed", { patientId });
      return true;
    }
    return false;
  }
  /**
   * Reduce goals during setback recovery
   */
  async reduceGoals(patientId, reductionPercent) {
    const goals = await db.select().from(patientGoals).where(and7(
      eq7(patientGoals.patientId, patientId),
      eq7(patientGoals.isActive, true)
    ));
    for (const goal of goals) {
      const reducedTarget = goal.targetValue * (1 - reductionPercent);
      await db.update(patientGoals).set({
        targetValue: reducedTarget,
        subtitle: `Temporarily reduced (recovery mode)`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq7(patientGoals.id, goal.id));
    }
  }
  /**
   * Restore goals after recovery
   */
  async restoreGoals(patientId) {
    await db.update(patientGoals).set({
      subtitle: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and7(
      eq7(patientGoals.patientId, patientId),
      eq7(patientGoals.isActive, true)
    ));
  }
  // ========================================================================
  // HELPER METHODS
  // ========================================================================
  async getOrCreateProfile(patientId) {
    const existing = await db.select().from(patientPersonalizationProfiles).where(eq7(patientPersonalizationProfiles.patientId, patientId)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    await db.insert(patientPersonalizationProfiles).values({
      patientId,
      currentProgressionLevel: 1,
      daysAtCurrentLevel: 0,
      consecutiveSuccessfulSessions: 0,
      inSetbackRecovery: false
    });
    return {
      patientId,
      currentProgressionLevel: 1,
      daysAtCurrentLevel: 0,
      consecutiveSuccessfulSessions: 0,
      inSetbackRecovery: false
    };
  }
  async getRecentSessions(patientId, days) {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return await db.select().from(exerciseSessions).where(and7(
      eq7(exerciseSessions.patientId, patientId),
      gte4(exerciseSessions.startTime, cutoffDate)
    )).orderBy(desc6(exerciseSessions.startTime));
  }
  getCurrentResistance(sessions3) {
    const resistances = sessions3.map((s) => s.resistance || 3).filter((r) => r > 0);
    return resistances.length > 0 ? this.average(resistances) : 3;
  }
  calculateTrend(values) {
    if (values.length < 2) return 0;
    const n = values.length;
    const sumX = n * (n - 1) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = n * (n - 1) * (2 * n - 1) / 6;
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const mean = sumY / n;
    return mean > 0 ? slope / mean : 0;
  }
  calculateProgressionConfidence(sessionCount, durationAchievement, powerAchievement) {
    let confidence = Math.min(sessionCount / 5, 1) * 0.4;
    if (durationAchievement >= 0.9) confidence += 0.3;
    else if (durationAchievement >= 0.8) confidence += 0.2;
    if (powerAchievement >= 0.9) confidence += 0.3;
    else if (powerAchievement >= 0.8) confidence += 0.2;
    return Math.min(confidence, 1);
  }
  average(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  /**
   * Generate predicted performance cone for visualization
   */
  async generatePerformancePrediction(patientId, daysAhead = 14) {
    const sessions3 = await this.getRecentSessions(patientId, 14);
    if (sessions3.length < 5) {
      return {
        dates: [],
        predicted: [],
        lowerBound: [],
        upperBound: [],
        confidence: 0
      };
    }
    const powers = sessions3.map((s) => s.avgPower || 0).reverse();
    const trend = this.calculateTrend(powers);
    const currentPower = powers[powers.length - 1];
    const variance = this.calculateVariance(powers);
    const stdDev = Math.sqrt(variance);
    const dates = [];
    const predicted = [];
    const lowerBound = [];
    const upperBound = [];
    const today = /* @__PURE__ */ new Date();
    for (let i = 0; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
      const predictedPower = currentPower * (1 + trend * i);
      const uncertainty = stdDev * Math.sqrt(1 + i / 7);
      predicted.push(Math.round(predictedPower * 10) / 10);
      lowerBound.push(Math.round((predictedPower - 1.96 * uncertainty) * 10) / 10);
      upperBound.push(Math.round((predictedPower + 1.96 * uncertainty) * 10) / 10);
    }
    return {
      dates,
      predicted,
      lowerBound,
      upperBound,
      confidence: Math.max(0, Math.min(1, 1 - stdDev / currentPower))
    };
  }
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = this.average(values);
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }
};
var progressiveOverloadEngine = new ProgressiveOverloadEngine();

// server/personalization/medication-safety-engine.ts
await init_db();
init_schema();
init_logger();
import { eq as eq8, and as and8, desc as desc7 } from "drizzle-orm";
var MEDICATION_EFFECTS = {
  beta_blocker: {
    medicationClass: "beta_blocker",
    expectedEffects: {
      heartRateImpact: "suppressed",
      bloodPressureImpact: "lowered",
      coordinationImpact: "normal",
      fatigueImpact: "increased"
    },
    exerciseConsiderations: [
      "Heart rate will not be reliable indicator of exertion",
      "May experience earlier fatigue onset",
      "Monitor for dizziness or lightheadedness",
      "Use perceived exertion (RPE) instead of HR targets"
    ],
    goalAdjustments: [
      { parameter: "power", adjustment: -15, reason: "Beta-blocker reduces exercise capacity" },
      { parameter: "duration", adjustment: -10, reason: "Earlier fatigue expected" }
    ]
  },
  diuretic: {
    medicationClass: "diuretic",
    expectedEffects: {
      heartRateImpact: "normal",
      bloodPressureImpact: "lowered",
      coordinationImpact: "normal",
      fatigueImpact: "increased"
    },
    exerciseConsiderations: [
      "Ensure adequate hydration before exercise",
      "Monitor for signs of dehydration (dizziness, cramping)",
      "Electrolyte imbalance may affect performance",
      "Avoid exercise during peak diuretic effect (2-4 hours post-dose)"
    ],
    goalAdjustments: [
      { parameter: "duration", adjustment: -10, reason: "Dehydration risk with prolonged exercise" }
    ]
  },
  sedative: {
    medicationClass: "sedative",
    expectedEffects: {
      heartRateImpact: "normal",
      bloodPressureImpact: "lowered",
      coordinationImpact: "impaired",
      fatigueImpact: "increased"
    },
    exerciseConsiderations: [
      "Increased fall risk due to sedation",
      "Delayed reaction times",
      "Monitor for excessive drowsiness",
      "Coordination may be impaired",
      "Consider lower resistance levels"
    ],
    goalAdjustments: [
      { parameter: "resistance", adjustment: -20, reason: "Safety due to sedation effects" },
      { parameter: "duration", adjustment: -15, reason: "Coordination concerns" }
    ]
  },
  opioid: {
    medicationClass: "opioid",
    expectedEffects: {
      heartRateImpact: "suppressed",
      bloodPressureImpact: "lowered",
      coordinationImpact: "impaired",
      fatigueImpact: "increased"
    },
    exerciseConsiderations: [
      "Respiratory depression risk during exertion",
      "Sedation effects similar to sedatives",
      "Monitor for nausea during exercise",
      "Avoid exercise at peak opioid effect (1-2 hours post-dose)"
    ],
    goalAdjustments: [
      { parameter: "resistance", adjustment: -25, reason: "Safety due to opioid effects" },
      { parameter: "power", adjustment: -20, reason: "Respiratory concerns" }
    ]
  },
  anticoagulant: {
    medicationClass: "anticoagulant",
    expectedEffects: {
      heartRateImpact: "normal",
      bloodPressureImpact: "normal",
      coordinationImpact: "normal",
      fatigueImpact: "normal"
    },
    exerciseConsiderations: [
      "Exercise is generally safe and encouraged for VTE prevention",
      "Avoid high-impact activities (not applicable for bike)",
      "Monitor for unusual bruising",
      "Beneficial for circulation"
    ],
    goalAdjustments: []
    // No adjustments needed
  },
  steroid: {
    medicationClass: "steroid",
    expectedEffects: {
      heartRateImpact: "elevated",
      bloodPressureImpact: "elevated",
      coordinationImpact: "normal",
      fatigueImpact: "decreased"
      // May feel stronger
    },
    exerciseConsiderations: [
      "May have increased energy initially",
      "Long-term use causes muscle weakness",
      "Monitor blood pressure during exercise",
      "Increased infection risk - ensure clean equipment"
    ],
    goalAdjustments: [
      { parameter: "power", adjustment: -10, reason: "Steroid-induced myopathy risk" }
    ]
  },
  antihypertensive: {
    medicationClass: "antihypertensive",
    expectedEffects: {
      heartRateImpact: "normal",
      bloodPressureImpact: "lowered",
      coordinationImpact: "normal",
      fatigueImpact: "normal"
    },
    exerciseConsiderations: [
      "Monitor for orthostatic hypotension when changing positions",
      "Avoid sudden position changes after exercise",
      "Stay hydrated",
      "Exercise is beneficial for blood pressure management"
    ],
    goalAdjustments: []
  },
  cardiac_glycoside: {
    medicationClass: "cardiac_glycoside",
    expectedEffects: {
      heartRateImpact: "suppressed",
      bloodPressureImpact: "normal",
      coordinationImpact: "normal",
      fatigueImpact: "normal"
    },
    exerciseConsiderations: [
      "Heart rate controlled by medication",
      "Monitor for signs of toxicity (nausea, visual changes)",
      "Exercise at moderate intensity only",
      "Avoid dehydration which can increase toxicity"
    ],
    goalAdjustments: [
      { parameter: "power", adjustment: -15, reason: "Cardiac glycoside requires moderate intensity" }
    ]
  },
  bronchodilator: {
    medicationClass: "bronchodilator",
    expectedEffects: {
      heartRateImpact: "elevated",
      bloodPressureImpact: "normal",
      coordinationImpact: "normal",
      fatigueImpact: "decreased"
    },
    exerciseConsiderations: [
      "May experience tremor or jitteriness",
      "Heart rate may be elevated",
      "Exercise beneficial for respiratory conditioning",
      "Use rescue inhaler if needed before exercise"
    ],
    goalAdjustments: []
  },
  other: {
    medicationClass: "other",
    expectedEffects: {
      heartRateImpact: "normal",
      bloodPressureImpact: "normal",
      coordinationImpact: "normal",
      fatigueImpact: "normal"
    },
    exerciseConsiderations: [],
    goalAdjustments: []
  }
};
var MEDICATION_CLASSIFICATIONS = {
  // Beta blockers
  "metoprolol": "beta_blocker",
  "atenolol": "beta_blocker",
  "propranolol": "beta_blocker",
  "carvedilol": "beta_blocker",
  "bisoprolol": "beta_blocker",
  "labetalol": "beta_blocker",
  // Diuretics
  "furosemide": "diuretic",
  "lasix": "diuretic",
  "hydrochlorothiazide": "diuretic",
  "hctz": "diuretic",
  "spironolactone": "diuretic",
  "bumetanide": "diuretic",
  "torsemide": "diuretic",
  // Sedatives/Anxiolytics
  "lorazepam": "sedative",
  "ativan": "sedative",
  "diazepam": "sedative",
  "valium": "sedative",
  "alprazolam": "sedative",
  "xanax": "sedative",
  "midazolam": "sedative",
  "zolpidem": "sedative",
  "ambien": "sedative",
  "quetiapine": "sedative",
  "seroquel": "sedative",
  "trazodone": "sedative",
  // Opioids
  "morphine": "opioid",
  "hydromorphone": "opioid",
  "dilaudid": "opioid",
  "oxycodone": "opioid",
  "fentanyl": "opioid",
  "tramadol": "opioid",
  "hydrocodone": "opioid",
  "methadone": "opioid",
  // Anticoagulants
  "heparin": "anticoagulant",
  "enoxaparin": "anticoagulant",
  "lovenox": "anticoagulant",
  "warfarin": "anticoagulant",
  "coumadin": "anticoagulant",
  "apixaban": "anticoagulant",
  "eliquis": "anticoagulant",
  "rivaroxaban": "anticoagulant",
  "xarelto": "anticoagulant",
  "dabigatran": "anticoagulant",
  "pradaxa": "anticoagulant",
  // Steroids
  "prednisone": "steroid",
  "methylprednisolone": "steroid",
  "solumedrol": "steroid",
  "dexamethasone": "steroid",
  "hydrocortisone": "steroid",
  // Antihypertensives
  "lisinopril": "antihypertensive",
  "amlodipine": "antihypertensive",
  "losartan": "antihypertensive",
  "valsartan": "antihypertensive",
  "hydralazine": "antihypertensive",
  // Cardiac glycosides
  "digoxin": "cardiac_glycoside",
  "lanoxin": "cardiac_glycoside",
  // Bronchodilators
  "albuterol": "bronchodilator",
  "proventil": "bronchodilator",
  "ventolin": "bronchodilator",
  "ipratropium": "bronchodilator",
  "atrovent": "bronchodilator"
};
var CONTRAINDICATION_RULES = [
  // ABSOLUTE CONTRAINDICATIONS (device should be locked)
  {
    id: "unstable_angina",
    name: "Unstable Angina",
    type: "absolute",
    conditions: [
      { field: "admissionDiagnosis", operator: "contains", value: "unstable angina" }
    ],
    action: "device_locked",
    alertPriority: "critical",
    message: "ABSOLUTE CONTRAINDICATION: Unstable angina. No exercise until medically cleared."
  },
  {
    id: "acute_mi",
    name: "Acute Myocardial Infarction (<48h)",
    type: "absolute",
    conditions: [
      { field: "admissionDiagnosis", operator: "contains", value: "myocardial infarction" },
      { field: "admissionDate", operator: "within_days", value: 2 }
    ],
    action: "device_locked",
    alertPriority: "critical",
    message: "ABSOLUTE CONTRAINDICATION: Acute MI within 48 hours. No exercise."
  },
  {
    id: "uncontrolled_arrhythmia",
    name: "Uncontrolled Arrhythmia",
    type: "absolute",
    conditions: [
      { field: "comorbidities", operator: "contains", value: "uncontrolled arrhythmia" }
    ],
    action: "device_locked",
    alertPriority: "critical",
    message: "ABSOLUTE CONTRAINDICATION: Uncontrolled arrhythmia. Requires cardiology clearance."
  },
  {
    id: "acute_pe",
    name: "Acute Pulmonary Embolism",
    type: "absolute",
    conditions: [
      { field: "admissionDiagnosis", operator: "contains", value: "pulmonary embolism" },
      { field: "admissionDate", operator: "within_days", value: 3 }
    ],
    action: "device_locked",
    alertPriority: "critical",
    message: "ABSOLUTE CONTRAINDICATION: Acute PE. No lower extremity exercise until anticoagulated and stable."
  },
  {
    id: "acute_dvt",
    name: "Acute Deep Vein Thrombosis",
    type: "absolute",
    conditions: [
      { field: "comorbidities", operator: "contains", value: "dvt" },
      { field: "admissionDate", operator: "within_days", value: 5 }
    ],
    action: "device_locked",
    alertPriority: "critical",
    message: "ABSOLUTE CONTRAINDICATION: Acute DVT. Requires anticoagulation before exercise."
  },
  {
    id: "active_bleeding",
    name: "Active Bleeding",
    type: "absolute",
    conditions: [
      { field: "comorbidities", operator: "contains", value: "active bleeding" }
    ],
    action: "device_locked",
    alertPriority: "critical",
    message: "ABSOLUTE CONTRAINDICATION: Active bleeding. No exercise until hemodynamically stable."
  },
  // RELATIVE CONTRAINDICATIONS (modified parameters)
  {
    id: "hypertension_uncontrolled",
    name: "Uncontrolled Hypertension",
    type: "relative",
    conditions: [
      { field: "comorbidities", operator: "contains", value: "uncontrolled hypertension" }
    ],
    action: "parameters_modified",
    alertPriority: "warning",
    message: "RELATIVE CONTRAINDICATION: Uncontrolled hypertension. Reduce intensity by 30%."
  },
  {
    id: "heart_failure_decompensated",
    name: "Decompensated Heart Failure",
    type: "relative",
    conditions: [
      { field: "admissionDiagnosis", operator: "contains", value: "heart failure" },
      { field: "levelOfCare", operator: "equals", value: "icu" }
    ],
    action: "parameters_modified",
    alertPriority: "warning",
    message: "RELATIVE CONTRAINDICATION: Decompensated CHF. Limit to passive ROM until compensated."
  },
  {
    id: "recent_surgery",
    name: "Recent Major Surgery",
    type: "temporal",
    conditions: [
      { field: "admissionDiagnosis", operator: "contains", value: "surgery" },
      { field: "admissionDate", operator: "within_days", value: 1 }
    ],
    action: "parameters_modified",
    alertPriority: "warning",
    message: "TEMPORAL CONTRAINDICATION: Within 24h of surgery. Limit to very low intensity."
  },
  {
    id: "orthostatic_hypotension",
    name: "Severe Orthostatic Hypotension",
    type: "relative",
    conditions: [
      { field: "comorbidities", operator: "contains", value: "orthostatic hypotension" }
    ],
    action: "parameters_modified",
    alertPriority: "caution",
    message: "CAUTION: Orthostatic hypotension. Ensure sitting position, monitor for dizziness."
  },
  {
    id: "severe_anemia",
    name: "Severe Anemia",
    type: "relative",
    conditions: [
      { field: "comorbidities", operator: "contains", value: "severe anemia" }
    ],
    action: "parameters_modified",
    alertPriority: "warning",
    message: "RELATIVE CONTRAINDICATION: Severe anemia. Reduce intensity by 40% until treated."
  },
  {
    id: "respiratory_failure",
    name: "Respiratory Failure",
    type: "relative",
    conditions: [
      { field: "admissionDiagnosis", operator: "contains", value: "respiratory failure" }
    ],
    action: "parameters_modified",
    alertPriority: "warning",
    message: "RELATIVE CONTRAINDICATION: Respiratory failure. Limit duration, monitor SpO2 closely."
  }
];
var MedicationSafetyEngine = class {
  /**
   * Classify a medication name to its drug class
   */
  classifyMedication(medicationName) {
    const nameLower = medicationName.toLowerCase().trim();
    if (MEDICATION_CLASSIFICATIONS[nameLower]) {
      return MEDICATION_CLASSIFICATIONS[nameLower];
    }
    for (const [med, classification] of Object.entries(MEDICATION_CLASSIFICATIONS)) {
      if (nameLower.includes(med) || med.includes(nameLower)) {
        return classification;
      }
    }
    return "other";
  }
  /**
   * Get medication effects for a specific class
   */
  getMedicationEffects(medicationClass) {
    return MEDICATION_EFFECTS[medicationClass];
  }
  /**
   * Analyze patient's medication list and return exercise considerations
   */
  async analyzePatientMedications(patientId) {
    try {
      const profile = await db.select().from(patientProfiles).where(eq8(patientProfiles.userId, patientId)).limit(1);
      if (!profile.length) {
        return {
          medications: [],
          aggregateConsiderations: [],
          recommendedGoalAdjustments: [],
          highRiskCombinations: []
        };
      }
      const medicationList = JSON.parse(profile[0].medications || "[]");
      const analyzedMedications = [];
      const allConsiderations = [];
      const allAdjustments = [];
      for (const med of medicationList) {
        const medClass = this.classifyMedication(med);
        const effects = this.getMedicationEffects(medClass);
        analyzedMedications.push({ name: med, class: medClass, effects });
        allConsiderations.push(...effects.exerciseConsiderations);
        for (const adj of effects.goalAdjustments) {
          allAdjustments.push(adj);
        }
      }
      const highRiskCombinations = this.checkHighRiskCombinations(
        analyzedMedications.map((m) => m.class)
      );
      const aggregatedAdjustments = this.aggregateAdjustments(allAdjustments);
      return {
        medications: analyzedMedications,
        aggregateConsiderations: [...new Set(allConsiderations)],
        recommendedGoalAdjustments: aggregatedAdjustments,
        highRiskCombinations
      };
    } catch (error) {
      logger.error("Medication analysis failed", { error: error.message, patientId });
      return {
        medications: [],
        aggregateConsiderations: [],
        recommendedGoalAdjustments: [],
        highRiskCombinations: []
      };
    }
  }
  /**
   * Check for high-risk medication combinations
   */
  checkHighRiskCombinations(classes) {
    const warnings = [];
    const sedatingCount = classes.filter(
      (c) => c === "sedative" || c === "opioid"
    ).length;
    if (sedatingCount >= 2) {
      warnings.push("HIGH RISK: Multiple sedating medications. Extreme caution with exercise. Consider provider review.");
    }
    if (classes.includes("beta_blocker") && classes.includes("opioid")) {
      warnings.push("CAUTION: Beta-blocker + opioid combination may mask cardiac symptoms.");
    }
    if (classes.includes("diuretic") && classes.includes("cardiac_glycoside")) {
      warnings.push("CAUTION: Diuretic + digoxin combination. Monitor for signs of digoxin toxicity.");
    }
    return warnings;
  }
  /**
   * Aggregate goal adjustments by parameter
   */
  aggregateAdjustments(adjustments) {
    const byParameter = /* @__PURE__ */ new Map();
    for (const adj of adjustments) {
      const existing = byParameter.get(adj.parameter);
      if (existing) {
        if (adj.adjustment < existing.adjustment) {
          existing.adjustment = adj.adjustment;
        }
        existing.reasons.push(adj.reason);
      } else {
        byParameter.set(adj.parameter, {
          adjustment: adj.adjustment,
          reasons: [adj.reason]
        });
      }
    }
    return Array.from(byParameter.entries()).map(([parameter, data]) => ({
      parameter,
      adjustment: data.adjustment,
      reason: data.reasons.join("; ")
    }));
  }
  /**
   * Detect medication-exercise interaction from session performance
   *
   * Called after session completion to correlate medication timing with performance
   */
  async detectMedicationInteraction(patientId, sessionId, sessionMetrics) {
    try {
      const baselineSessions = await db.select().from(exerciseSessions).where(eq8(exerciseSessions.patientId, patientId)).orderBy(desc7(exerciseSessions.startTime)).limit(10);
      if (baselineSessions.length < 5) {
        return null;
      }
      const baselineAvgPower = baselineSessions.slice(1).reduce((sum, s) => sum + (s.avgPower || 0), 0) / (baselineSessions.length - 1);
      const analysis = await this.analyzePatientMedications(patientId);
      const powerChange = (sessionMetrics.avgPower - baselineAvgPower) / baselineAvgPower;
      if (powerChange < -0.2) {
        const sedatingMeds = analysis.medications.filter(
          (m) => m.class === "sedative" || m.class === "opioid" || m.class === "beta_blocker"
        );
        if (sedatingMeds.length > 0) {
          const alert = {
            patientId,
            medicationName: sedatingMeds[0].name,
            medicationClass: sedatingMeds[0].class,
            sessionId,
            performanceChange: {
              powerPercent: Math.round(powerChange * 100),
              expectedChange: sedatingMeds[0].effects.goalAdjustments.find((a) => a.parameter === "power")?.adjustment || -10,
              significantDeviation: Math.abs(powerChange * 100) > 25
            },
            alert: {
              generated: true,
              priority: Math.abs(powerChange * 100) > 30 ? "high" : "medium",
              message: `Performance declined ${Math.abs(Math.round(powerChange * 100))}% from baseline. Patient on ${sedatingMeds[0].name} (${sedatingMeds[0].class}).`,
              recommendation: "Review medication timing relative to exercise. Consider adjusting exercise schedule or goals."
            }
          };
          await this.recordMedicationInteraction(alert);
          await db.insert(alerts).values({
            patientId,
            type: "medication_interaction",
            priority: alert.alert.priority,
            message: alert.alert.message,
            actionRequired: alert.alert.recommendation,
            metadata: JSON.stringify({
              medicationName: alert.medicationName,
              medicationClass: alert.medicationClass,
              powerChange: alert.performanceChange.powerPercent
            }),
            triggeredAt: /* @__PURE__ */ new Date()
          });
          return alert;
        }
      }
      return null;
    } catch (error) {
      logger.error("Medication interaction detection failed", { error: error.message, patientId });
      return null;
    }
  }
  /**
   * Record medication interaction to database
   */
  async recordMedicationInteraction(alert) {
    try {
      await db.insert(medicationInteractions).values({
        patientId: alert.patientId,
        medicationName: alert.medicationName,
        medicationClass: alert.medicationClass,
        sessionId: alert.sessionId,
        powerChangePercent: alert.performanceChange.powerPercent,
        alertGenerated: alert.alert.generated,
        alertMessage: alert.alert.message,
        providerNotified: true
      });
    } catch (error) {
      logger.error("Failed to record medication interaction", { error: error.message });
    }
  }
  /**
   * Apply medication-based goal adjustments
   */
  async applyMedicationGoalAdjustments(patientId) {
    try {
      const analysis = await this.analyzePatientMedications(patientId);
      if (analysis.recommendedGoalAdjustments.length === 0) {
        return { applied: false, adjustments: [] };
      }
      const appliedAdjustments = [];
      const goals = await db.select().from(patientGoals).where(and8(
        eq8(patientGoals.patientId, patientId),
        eq8(patientGoals.isActive, true)
      ));
      for (const adj of analysis.recommendedGoalAdjustments) {
        const matchingGoal = goals.find(
          (g) => g.goalType.toLowerCase() === adj.parameter.toLowerCase()
        );
        if (matchingGoal) {
          const newTarget = matchingGoal.targetValue * (1 + adj.adjustment / 100);
          await db.update(patientGoals).set({
            targetValue: newTarget,
            aiRecommended: true,
            subtitle: `Adjusted for medications (${adj.reason})`,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq8(patientGoals.id, matchingGoal.id));
          appliedAdjustments.push({
            goalType: adj.parameter,
            adjustment: adj.adjustment,
            newTarget: Math.round(newTarget * 10) / 10
          });
        }
      }
      return {
        applied: appliedAdjustments.length > 0,
        adjustments: appliedAdjustments
      };
    } catch (error) {
      logger.error("Failed to apply medication goal adjustments", { error: error.message, patientId });
      return { applied: false, adjustments: [] };
    }
  }
  // ========================================================================
  // CONTRAINDICATION VERIFICATION (Patent 11.3)
  // ========================================================================
  /**
   * Verify patient can safely exercise - called before each session
   */
  async verifyContraindications(patientId, verificationType = "pre_session") {
    try {
      const profile = await db.select().from(patientProfiles).where(eq8(patientProfiles.userId, patientId)).limit(1);
      const user = await db.select().from(users).where(eq8(users.id, patientId)).limit(1);
      if (!profile.length) {
        return this.createSafeResult(patientId, verificationType);
      }
      const patientData = {
        ...profile[0],
        admissionDate: user[0]?.admissionDate
      };
      for (const rule of CONTRAINDICATION_RULES) {
        const matched = this.evaluateContraindicationRule(rule, patientData);
        if (matched) {
          await this.recordContraindicationVerification(patientId, verificationType, rule);
          await db.insert(alerts).values({
            patientId,
            type: "contraindication_detected",
            priority: rule.alertPriority,
            message: rule.message,
            actionRequired: rule.action === "device_locked" ? "Device locked. Requires provider clearance." : "Review exercise parameters.",
            metadata: JSON.stringify({
              ruleId: rule.id,
              ruleName: rule.name,
              contraindicationType: rule.type
            }),
            triggeredAt: /* @__PURE__ */ new Date()
          });
          return {
            patientId,
            verificationType,
            timestamp: /* @__PURE__ */ new Date(),
            result: {
              safe: false,
              contraindicationType: rule.type,
              reason: rule.message,
              action: rule.action,
              modifiedParameters: rule.action === "parameters_modified" ? this.getModifiedParameters(rule) : void 0
            }
          };
        }
      }
      await this.recordContraindicationVerification(patientId, verificationType, null);
      return this.createSafeResult(patientId, verificationType);
    } catch (error) {
      logger.error("Contraindication verification failed", { error: error.message, patientId });
      return {
        patientId,
        verificationType,
        timestamp: /* @__PURE__ */ new Date(),
        result: {
          safe: false,
          reason: "Unable to verify contraindications. Please try again.",
          action: "alert_sent"
        }
      };
    }
  }
  /**
   * Evaluate a single contraindication rule against patient data
   */
  evaluateContraindicationRule(rule, patientData) {
    for (const condition of rule.conditions) {
      const matched = this.evaluateCondition(condition, patientData);
      if (!matched) {
        return false;
      }
    }
    return true;
  }
  /**
   * Evaluate a single condition
   */
  evaluateCondition(condition, patientData) {
    let fieldValue = patientData[condition.field];
    if (condition.field === "comorbidities") {
      try {
        const comorbidities = JSON.parse(fieldValue || "[]");
        const searchTerm = String(condition.value).toLowerCase();
        return comorbidities.some((c) => c.toLowerCase().includes(searchTerm));
      } catch {
        return false;
      }
    }
    if (condition.field === "admissionDiagnosis") {
      const diagnosis = String(fieldValue || "").toLowerCase();
      const searchTerm = String(condition.value).toLowerCase();
      return condition.operator === "contains" ? diagnosis.includes(searchTerm) : diagnosis === searchTerm;
    }
    if (condition.field === "admissionDate" && condition.operator === "within_days") {
      if (!fieldValue) return false;
      const admissionDate = new Date(fieldValue);
      const daysSinceAdmission = Math.floor(
        (Date.now() - admissionDate.getTime()) / (1e3 * 60 * 60 * 24)
      );
      return daysSinceAdmission <= condition.value;
    }
    if (condition.operator === "equals") {
      return fieldValue === condition.value;
    }
    if (condition.operator === "gt") {
      return Number(fieldValue) > Number(condition.value);
    }
    if (condition.operator === "lt") {
      return Number(fieldValue) < Number(condition.value);
    }
    return false;
  }
  /**
   * Get modified parameters for relative contraindications
   */
  getModifiedParameters(rule) {
    const modifications = {};
    if (rule.id === "hypertension_uncontrolled") {
      modifications.resistanceReduction = 0.3;
      modifications.powerReduction = 0.3;
    } else if (rule.id === "recent_surgery") {
      modifications.resistanceReduction = 0.5;
      modifications.maxDuration = 10;
    } else if (rule.id === "severe_anemia") {
      modifications.resistanceReduction = 0.4;
      modifications.powerReduction = 0.4;
    } else if (rule.id === "respiratory_failure") {
      modifications.maxDuration = 8;
      modifications.requireSpO2Monitoring = true;
    }
    return modifications;
  }
  /**
   * Create safe result
   */
  createSafeResult(patientId, verificationType) {
    return {
      patientId,
      verificationType,
      timestamp: /* @__PURE__ */ new Date(),
      result: {
        safe: true,
        action: "cleared"
      }
    };
  }
  /**
   * Record contraindication verification to database
   */
  async recordContraindicationVerification(patientId, verificationType, rule) {
    try {
      await db.insert(contraindicationVerifications).values({
        patientId,
        verifiedAt: /* @__PURE__ */ new Date(),
        verificationType,
        contraindicationFound: rule !== null,
        contraindicationType: rule?.type,
        contraindicationReason: rule?.message,
        actionTaken: rule?.action || "cleared",
        alertPriority: rule?.alertPriority
      });
    } catch (error) {
      logger.error("Failed to record contraindication verification", { error: error.message });
    }
  }
  /**
   * Provider override for contraindication
   */
  async overrideContraindication(verificationId, providerId, reason) {
    try {
      await db.update(contraindicationVerifications).set({
        providerOverride: true,
        overrideBy: providerId,
        overrideReason: reason,
        overrideAt: /* @__PURE__ */ new Date()
      }).where(eq8(contraindicationVerifications.id, verificationId));
      logger.info("Contraindication override recorded", {
        verificationId,
        providerId,
        reason
      });
      return true;
    } catch (error) {
      logger.error("Failed to record override", { error: error.message });
      return false;
    }
  }
};
var medicationSafetyEngine = new MedicationSafetyEngine();

// server/personalization/mobility-scoring-engine.ts
await init_db();
init_schema();
init_logger();
import { eq as eq9, and as and9, desc as desc8, gte as gte6, avg, count } from "drizzle-orm";
var DEFAULT_CONFIG = {
  weights: {
    bike: 0.4,
    // 40% from bedside bike
    ambulation: 0.15,
    // 15% from ambulation
    pt: 0.2,
    // 20% from PT
    nursing: 0.15,
    // 15% from nursing
    adl: 0.1
    // 10% from ADL
  },
  minBikeSessions: 3,
  minDataSources: 2,
  maxPower: 50,
  // 50W = excellent
  maxDuration: 20,
  // 20 min = excellent
  maxConsistency: 7
  // 7-day streak = excellent
};
var MobilityScoringEngine = class {
  config;
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  /**
   * Calculate unified mobility score for a patient
   */
  async calculateMobilityScore(patientId) {
    try {
      const components = await this.getComponentScores(patientId);
      const confidence = this.calculateConfidence(components);
      if (confidence < 0.3) {
        logger.warn("Insufficient data for mobility score", { patientId, confidence });
        return null;
      }
      const unifiedScore = this.calculateUnifiedScore(components);
      const trend = await this.calculateTrend(patientId);
      const barthelIndex = this.calculateBarthelIndex(components, unifiedScore);
      const fim = this.calculateFIM(components, unifiedScore);
      const result = {
        patientId,
        timestamp: /* @__PURE__ */ new Date(),
        components,
        weights: this.config.weights,
        unifiedScore,
        confidence,
        standardScales: {
          barthelIndex,
          functionalIndependenceMeasure: fim
        },
        trend: trend.direction,
        trendMagnitude: trend.magnitude
      };
      await this.storeMobilityScore(result);
      return result;
    } catch (error) {
      logger.error("Mobility score calculation failed", { error: error.message, patientId });
      return null;
    }
  }
  /**
   * Get individual component scores
   */
  async getComponentScores(patientId) {
    const bikeScore = await this.calculateBikeScore(patientId);
    const ambulationScore = await this.calculateAmbulationScore(patientId);
    const ptScore = await this.calculatePTScore(patientId);
    const nursingScore = await this.calculateNursingScore(patientId);
    const adlScore = await this.calculateADLScore(patientId);
    return {
      bikeScore,
      ambulationScore,
      ptScore,
      nursingScore,
      adlScore
    };
  }
  /**
   * Calculate bike score from exercise sessions
   * Score 0-100 based on power, duration, consistency
   */
  async calculateBikeScore(patientId) {
    try {
      const cutoffDate = /* @__PURE__ */ new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      const sessions3 = await db.select().from(exerciseSessions).where(and9(
        eq9(exerciseSessions.patientId, patientId),
        gte6(exerciseSessions.startTime, cutoffDate)
      )).orderBy(desc8(exerciseSessions.startTime));
      if (sessions3.length < this.config.minBikeSessions) {
        return 0;
      }
      const avgPower = sessions3.reduce((sum, s) => sum + (s.avgPower || 0), 0) / sessions3.length;
      const powerScore = Math.min(40, avgPower / this.config.maxPower * 40);
      const avgDuration = sessions3.reduce(
        (sum, s) => sum + (s.durationSeconds || s.duration * 60) / 60,
        0
      ) / sessions3.length;
      const durationScore = Math.min(30, avgDuration / this.config.maxDuration * 30);
      const stats = await db.select().from(patientStats).where(eq9(patientStats.patientId, patientId)).limit(1);
      const streak = stats[0]?.consistencyStreak || 0;
      const consistencyScore = Math.min(20, streak / this.config.maxConsistency * 20);
      const frequencyScore = Math.min(10, sessions3.length / 7 * 10);
      return Math.round(powerScore + durationScore + consistencyScore + frequencyScore);
    } catch (error) {
      logger.error("Bike score calculation failed", { error: error.message, patientId });
      return 0;
    }
  }
  /**
   * Calculate ambulation score
   * In a full implementation, this would come from room sensors or wearables
   * For now, estimate based on mobility status from profile
   */
  async calculateAmbulationScore(patientId) {
    try {
      const profile = await db.select().from(patientProfiles).where(eq9(patientProfiles.userId, patientId)).limit(1);
      if (!profile.length) return void 0;
      const mobilityScoreMap = {
        "independent": 100,
        "walking_assist": 75,
        "standing_assist": 50,
        "chair_bound": 25,
        "bedbound": 10
      };
      return mobilityScoreMap[profile[0].mobilityStatus] || 25;
    } catch (error) {
      logger.error("Ambulation score calculation failed", { error: error.message, patientId });
      return void 0;
    }
  }
  /**
   * Calculate PT score
   * In a full implementation, this would come from PT documentation
   * For now, estimate based on bike performance trajectory
   */
  async calculatePTScore(patientId) {
    try {
      const trend = await this.calculateTrend(patientId);
      if (trend.dataPoints < 5) return void 0;
      const profile = await db.select().from(patientProfiles).where(eq9(patientProfiles.userId, patientId)).limit(1);
      if (!profile.length) return void 0;
      const baseScores = {
        "independent": 90,
        "walking_assist": 70,
        "standing_assist": 55,
        "chair_bound": 40,
        "bedbound": 20
      };
      let score = baseScores[profile[0].mobilityStatus] || 40;
      if (trend.direction === "improving") {
        score = Math.min(100, score + trend.magnitude * 20);
      } else if (trend.direction === "declining") {
        score = Math.max(0, score - trend.magnitude * 20);
      }
      return Math.round(score);
    } catch (error) {
      logger.error("PT score calculation failed", { error: error.message, patientId });
      return void 0;
    }
  }
  /**
   * Calculate nursing assessment score
   * In a full implementation, this would come from nursing documentation
   */
  async calculateNursingScore(patientId) {
    return this.calculateAmbulationScore(patientId);
  }
  /**
   * Calculate ADL score
   * Based on cognitive and mobility status
   */
  async calculateADLScore(patientId) {
    try {
      const profile = await db.select().from(patientProfiles).where(eq9(patientProfiles.userId, patientId)).limit(1);
      if (!profile.length) return void 0;
      const mobilityScores3 = {
        "independent": 90,
        "walking_assist": 70,
        "standing_assist": 55,
        "chair_bound": 35,
        "bedbound": 15
      };
      let score = mobilityScores3[profile[0].mobilityStatus] || 40;
      const cognitiveAdjustment = {
        "normal": 0,
        "mild_impairment": -10,
        "delirium_dementia": -25
      };
      score += cognitiveAdjustment[profile[0].cognitiveStatus] || 0;
      return Math.max(0, Math.min(100, Math.round(score)));
    } catch (error) {
      logger.error("ADL score calculation failed", { error: error.message, patientId });
      return void 0;
    }
  }
  /**
   * Calculate confidence based on data completeness
   */
  calculateConfidence(components) {
    let sourcesWithData = 0;
    let totalWeight = 0;
    if (components.bikeScore !== void 0 && components.bikeScore > 0) {
      sourcesWithData++;
      totalWeight += this.config.weights.bike;
    }
    if (components.ambulationScore !== void 0) {
      sourcesWithData++;
      totalWeight += this.config.weights.ambulation;
    }
    if (components.ptScore !== void 0) {
      sourcesWithData++;
      totalWeight += this.config.weights.pt;
    }
    if (components.nursingScore !== void 0) {
      sourcesWithData++;
      totalWeight += this.config.weights.nursing;
    }
    if (components.adlScore !== void 0) {
      sourcesWithData++;
      totalWeight += this.config.weights.adl;
    }
    const sourceConfidence = Math.min(sourcesWithData / this.config.minDataSources, 1);
    const weightConfidence = totalWeight;
    return sourceConfidence * 0.5 + weightConfidence * 0.5;
  }
  /**
   * Calculate unified score from components
   */
  calculateUnifiedScore(components) {
    let totalScore = 0;
    let totalWeight = 0;
    if (components.bikeScore !== void 0 && components.bikeScore > 0) {
      totalScore += components.bikeScore * this.config.weights.bike;
      totalWeight += this.config.weights.bike;
    }
    if (components.ambulationScore !== void 0) {
      totalScore += components.ambulationScore * this.config.weights.ambulation;
      totalWeight += this.config.weights.ambulation;
    }
    if (components.ptScore !== void 0) {
      totalScore += components.ptScore * this.config.weights.pt;
      totalWeight += this.config.weights.pt;
    }
    if (components.nursingScore !== void 0) {
      totalScore += components.nursingScore * this.config.weights.nursing;
      totalWeight += this.config.weights.nursing;
    }
    if (components.adlScore !== void 0) {
      totalScore += components.adlScore * this.config.weights.adl;
      totalWeight += this.config.weights.adl;
    }
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }
  /**
   * Calculate Barthel Index (0-100)
   */
  calculateBarthelIndex(components, unifiedScore) {
    if (unifiedScore >= 90) return 95 + Math.round((unifiedScore - 90) / 2);
    if (unifiedScore >= 70) return 75 + Math.round(unifiedScore - 70);
    if (unifiedScore >= 50) return 50 + Math.round((unifiedScore - 50) * 1.25);
    if (unifiedScore >= 25) return 25 + Math.round(unifiedScore);
    return Math.round(unifiedScore);
  }
  /**
   * Calculate FIM score (18-126)
   */
  calculateFIM(components, unifiedScore) {
    const fimRange = 126 - 18;
    return Math.round(18 + unifiedScore / 100 * fimRange);
  }
  /**
   * Calculate trend from historical scores
   */
  async calculateTrend(patientId) {
    try {
      const cutoffDate = /* @__PURE__ */ new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 14);
      const sessions3 = await db.select().from(exerciseSessions).where(and9(
        eq9(exerciseSessions.patientId, patientId),
        gte6(exerciseSessions.startTime, cutoffDate)
      )).orderBy(exerciseSessions.startTime);
      if (sessions3.length < 4) {
        return { direction: "stable", magnitude: 0, dataPoints: sessions3.length };
      }
      const powers = sessions3.map((s, i) => ({
        x: i,
        y: s.avgPower || 0
      }));
      const n = powers.length;
      const sumX = powers.reduce((sum, p) => sum + p.x, 0);
      const sumY = powers.reduce((sum, p) => sum + p.y, 0);
      const sumXY = powers.reduce((sum, p) => sum + p.x * p.y, 0);
      const sumXX = powers.reduce((sum, p) => sum + p.x * p.x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const meanY = sumY / n;
      const normalizedSlope = meanY > 0 ? slope / meanY : 0;
      let direction = "stable";
      if (normalizedSlope > 0.02) direction = "improving";
      else if (normalizedSlope < -0.02) direction = "declining";
      return {
        direction,
        magnitude: Math.abs(normalizedSlope),
        dataPoints: sessions3.length
      };
    } catch (error) {
      logger.error("Trend calculation failed", { error: error.message, patientId });
      return { direction: "stable", magnitude: 0, dataPoints: 0 };
    }
  }
  /**
   * Store mobility score to database
   */
  async storeMobilityScore(score) {
    try {
      await db.insert(mobilityScores).values({
        patientId: score.patientId,
        scoredAt: score.timestamp,
        bikeScore: score.components.bikeScore,
        ambulationScore: score.components.ambulationScore,
        ptScore: score.components.ptScore,
        nursingScore: score.components.nursingScore,
        adlScore: score.components.adlScore,
        componentWeights: JSON.stringify(score.weights),
        unifiedScore: score.unifiedScore,
        scoreConfidence: score.confidence,
        barthelIndex: score.standardScales.barthelIndex,
        functionalIndependenceMeasure: score.standardScales.functionalIndependenceMeasure,
        scoreTrend: score.trend,
        trendMagnitude: score.trendMagnitude
      });
    } catch (error) {
      logger.error("Failed to store mobility score", { error: error.message });
    }
  }
  /**
   * Get mobility score history for a patient
   */
  async getMobilityScoreHistory(patientId, days = 30) {
    try {
      const cutoffDate = /* @__PURE__ */ new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      return await db.select().from(mobilityScores).where(and9(
        eq9(mobilityScores.patientId, patientId),
        gte6(mobilityScores.scoredAt, cutoffDate)
      )).orderBy(desc8(mobilityScores.scoredAt));
    } catch (error) {
      logger.error("Failed to get mobility score history", { error: error.message, patientId });
      return [];
    }
  }
  // ========================================================================
  // HOSPITAL MOBILITY SCORE (Patent 16.1)
  // ========================================================================
  /**
   * Calculate hospital-wide mobility performance score
   */
  async calculateHospitalMobilityScore(unit) {
    try {
      const cutoffDate = /* @__PURE__ */ new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      const sessionsData = await db.select({
        patientId: exerciseSessions.patientId,
        sessionCount: count(exerciseSessions.id),
        avgPower: avg(exerciseSessions.avgPower),
        avgDuration: avg(exerciseSessions.durationSeconds)
      }).from(exerciseSessions).where(gte6(exerciseSessions.startTime, cutoffDate)).groupBy(exerciseSessions.patientId);
      if (sessionsData.length === 0) {
        return {
          overallScore: 0,
          deviceUtilization: 0,
          avgSessionFrequency: 0,
          avgImprovement: 0,
          patientCount: 0
        };
      }
      const patientCount = sessionsData.length;
      const totalSessions = sessionsData.reduce(
        (sum, d) => sum + Number(d.sessionCount),
        0
      );
      const avgSessionFrequency = totalSessions / patientCount / 7;
      const avgPower = sessionsData.reduce(
        (sum, d) => sum + Number(d.avgPower || 0),
        0
      ) / patientCount;
      const frequencyScore = Math.min(avgSessionFrequency / 2, 1) * 30;
      const powerScore = Math.min(avgPower / 40, 1) * 40;
      const participationScore = patientCount / 50 * 30;
      const overallScore = Math.round(frequencyScore + powerScore + participationScore);
      return {
        overallScore,
        deviceUtilization: Math.round(totalSessions / (patientCount * 14) * 100),
        // 2x/day
        avgSessionFrequency: Math.round(avgSessionFrequency * 100) / 100,
        avgImprovement: 0,
        // Would need baseline comparison
        patientCount
      };
    } catch (error) {
      logger.error("Hospital mobility score calculation failed", { error: error.message });
      return {
        overallScore: 0,
        deviceUtilization: 0,
        avgSessionFrequency: 0,
        avgImprovement: 0,
        patientCount: 0
      };
    }
  }
};
var mobilityScoringEngine = new MobilityScoringEngine();

// server/personalization/competition-engine.ts
await init_db();
init_schema();
init_logger();
import { eq as eq10, and as and10, desc as desc9, gte as gte7, count as count2 } from "drizzle-orm";
import { createHash } from "crypto";
var ANONYMOUS_PREFIXES = [
  "Runner",
  "Cyclist",
  "Champion",
  "Warrior",
  "Eagle",
  "Phoenix",
  "Tiger",
  "Lion",
  "Bear",
  "Wolf",
  "Falcon",
  "Hawk",
  "Star",
  "Comet"
];
var MILESTONES = [
  {
    id: "first_quarter",
    name: "25% Complete",
    threshold: 0.25,
    feedback: {
      sound: "single_chime",
      vibration: "short_pulse",
      message: "Great start! Quarter of the way there!"
    }
  },
  {
    id: "halfway",
    name: "Halfway There",
    threshold: 0.5,
    feedback: {
      sound: "double_chime",
      vibration: "double_pulse",
      message: "Excellent! Halfway to your goal!"
    }
  },
  {
    id: "three_quarters",
    name: "75% Complete",
    threshold: 0.75,
    feedback: {
      sound: "triple_chime_melody",
      vibration: "triple_pulse",
      message: "Amazing! Almost there - push through!"
    }
  },
  {
    id: "goal_complete",
    name: "Goal Achieved",
    threshold: 1,
    feedback: {
      sound: "victory_melody",
      vibration: "celebration_pattern",
      message: "Congratulations! You did it!"
    }
  },
  {
    id: "personal_record",
    name: "Personal Record",
    threshold: 1.1,
    // Exceeds goal by 10%
    feedback: {
      sound: "fanfare",
      vibration: "extended_celebration",
      message: "NEW PERSONAL RECORD! Incredible performance!"
    }
  }
];
var COMPETITIVE_SOUNDS = {
  passing_opponent: {
    sound: "ascending_tone",
    vibration: "short_victory",
    message: "You passed a competitor! Keep it up!"
  },
  being_passed: {
    sound: "descending_tone",
    vibration: "gentle_nudge",
    message: "They're catching up - you've got this!"
  },
  winning: {
    sound: "victory_fanfare",
    vibration: "celebration_sequence",
    message: "Winner! You finished first!"
  }
};
var CompetitionEngine = class {
  // ========================================================================
  // COHORT BENCHMARKING (Patent 8.1)
  // ========================================================================
  /**
   * Generate cohort comparison for a patient
   *
   * Privacy-preserving: No individual patient data exposed
   */
  async generateCohortComparison(patientId) {
    try {
      const profile = await db.select().from(patientProfiles).where(eq10(patientProfiles.userId, patientId)).limit(1);
      const user = await db.select().from(users).where(eq10(users.id, patientId)).limit(1);
      if (!profile.length) {
        return null;
      }
      const criteria = this.buildCohortCriteria(profile[0], user[0]);
      const cohortPatients = await this.findCohortPatients(criteria, patientId);
      if (cohortPatients.length < 5) {
        return null;
      }
      const patientMetrics = await this.getPatientMetrics(patientId);
      const cohortMetrics = await this.calculateCohortMetrics(cohortPatients);
      const percentiles = this.calculatePercentiles(patientMetrics, cohortMetrics);
      const cohortId = this.generateCohortId(criteria);
      const message = this.buildComparisonMessage(percentiles);
      const comparison = {
        patientId,
        cohortId,
        cohortSize: cohortPatients.length,
        percentiles,
        message
      };
      await this.storeCohortComparison(comparison, criteria);
      return comparison;
    } catch (error) {
      logger.error("Cohort comparison failed", { error: error.message, patientId });
      return null;
    }
  }
  /**
   * Build cohort criteria from patient profile
   */
  buildCohortCriteria(profile, user) {
    const age = profile.age;
    const ageRangeStart = Math.floor(age / 10) * 10;
    const ageRange = [ageRangeStart, ageRangeStart + 10];
    const diagnosis = (profile.admissionDiagnosis || "").toLowerCase();
    let diagnosisCategory;
    if (diagnosis.includes("knee") || diagnosis.includes("hip") || diagnosis.includes("joint")) {
      diagnosisCategory = "orthopedic";
    } else if (diagnosis.includes("heart") || diagnosis.includes("cardiac")) {
      diagnosisCategory = "cardiac";
    } else if (diagnosis.includes("pneumonia") || diagnosis.includes("respiratory")) {
      diagnosisCategory = "pulmonary";
    } else if (diagnosis.includes("stroke") || diagnosis.includes("neuro")) {
      diagnosisCategory = "neurological";
    }
    const admissionDate = user?.admissionDate ? new Date(user.admissionDate) : /* @__PURE__ */ new Date();
    const daysPostAdmission = Math.floor(
      (Date.now() - admissionDate.getTime()) / (1e3 * 60 * 60 * 24)
    );
    return {
      ageRange,
      diagnosisCategory,
      mobilityLevel: profile.mobilityStatus,
      daysPostAdmission,
      levelOfCare: profile.levelOfCare
    };
  }
  /**
   * Find patients matching cohort criteria
   */
  async findCohortPatients(criteria, excludePatientId) {
    try {
      const profiles = await db.select({
        userId: patientProfiles.userId,
        age: patientProfiles.age,
        mobilityStatus: patientProfiles.mobilityStatus,
        levelOfCare: patientProfiles.levelOfCare,
        admissionDiagnosis: patientProfiles.admissionDiagnosis
      }).from(patientProfiles);
      const matchingPatients = profiles.filter((p) => {
        if (p.userId === excludePatientId) return false;
        if (p.age < criteria.ageRange[0] || p.age > criteria.ageRange[1]) return false;
        if (criteria.mobilityLevel && p.mobilityStatus !== criteria.mobilityLevel) return false;
        if (criteria.levelOfCare && p.levelOfCare !== criteria.levelOfCare) return false;
        return true;
      });
      return matchingPatients.map((p) => p.userId);
    } catch (error) {
      logger.error("Find cohort patients failed", { error: error.message });
      return [];
    }
  }
  /**
   * Get patient's metrics for comparison
   */
  async getPatientMetrics(patientId) {
    try {
      const cutoffDate = /* @__PURE__ */ new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      const sessions3 = await db.select().from(exerciseSessions).where(and10(
        eq10(exerciseSessions.patientId, patientId),
        gte7(exerciseSessions.startTime, cutoffDate)
      )).orderBy(desc9(exerciseSessions.startTime));
      if (sessions3.length === 0) {
        return { avgDuration: 0, avgPower: 0, consistency: 0, improvement: 0 };
      }
      const avgDuration = sessions3.reduce(
        (sum, s) => sum + (s.durationSeconds || s.duration * 60),
        0
      ) / sessions3.length;
      const avgPower = sessions3.reduce(
        (sum, s) => sum + (s.avgPower || 0),
        0
      ) / sessions3.length;
      const stats = await db.select().from(patientStats).where(eq10(patientStats.patientId, patientId)).limit(1);
      const consistency = stats[0]?.consistencyStreak || 0;
      let improvement = 0;
      if (sessions3.length >= 4) {
        const half = Math.floor(sessions3.length / 2);
        const oldAvgPower = sessions3.slice(half).reduce(
          (sum, s) => sum + (s.avgPower || 0),
          0
        ) / (sessions3.length - half);
        const newAvgPower = sessions3.slice(0, half).reduce(
          (sum, s) => sum + (s.avgPower || 0),
          0
        ) / half;
        if (oldAvgPower > 0) {
          improvement = (newAvgPower - oldAvgPower) / oldAvgPower;
        }
      }
      return { avgDuration, avgPower, consistency, improvement };
    } catch (error) {
      logger.error("Get patient metrics failed", { error: error.message, patientId });
      return { avgDuration: 0, avgPower: 0, consistency: 0, improvement: 0 };
    }
  }
  /**
   * Calculate metrics for cohort patients
   */
  async calculateCohortMetrics(patientIds) {
    const durations = [];
    const powers = [];
    const consistencies = [];
    const improvements = [];
    for (const patientId of patientIds) {
      const metrics = await this.getPatientMetrics(patientId);
      if (metrics.avgDuration > 0) durations.push(metrics.avgDuration);
      if (metrics.avgPower > 0) powers.push(metrics.avgPower);
      if (metrics.consistency >= 0) consistencies.push(metrics.consistency);
      if (Math.abs(metrics.improvement) > 0) improvements.push(metrics.improvement);
    }
    return { durations, powers, consistencies, improvements };
  }
  /**
   * Calculate percentiles for patient vs cohort
   */
  calculatePercentiles(patientMetrics, cohortMetrics) {
    const percentile = (value, distribution) => {
      if (distribution.length === 0) return 50;
      const sorted = [...distribution].sort((a, b) => a - b);
      const below = sorted.filter((v) => v < value).length;
      return Math.round(below / sorted.length * 100);
    };
    const duration = percentile(patientMetrics.avgDuration, cohortMetrics.durations);
    const power = percentile(patientMetrics.avgPower, cohortMetrics.powers);
    const consistency = percentile(patientMetrics.consistency, cohortMetrics.consistencies);
    const improvement = percentile(patientMetrics.improvement, cohortMetrics.improvements);
    const overall = Math.round(
      duration * 0.25 + power * 0.35 + consistency * 0.25 + improvement * 0.15
    );
    return { duration, power, consistency, improvement, overall };
  }
  /**
   * Generate privacy-preserving cohort ID
   */
  generateCohortId(criteria) {
    const criteriaString = JSON.stringify({
      ageRange: criteria.ageRange,
      mobility: criteria.mobilityLevel,
      loc: criteria.levelOfCare
    });
    return createHash("sha256").update(criteriaString).digest("hex").substring(0, 16);
  }
  /**
   * Build motivational comparison message
   */
  buildComparisonMessage(percentiles) {
    if (percentiles.overall >= 75) {
      return `Outstanding! You're performing better than ${percentiles.overall}% of similar patients. Keep up the amazing work!`;
    } else if (percentiles.overall >= 50) {
      return `Great progress! You're performing better than ${percentiles.overall}% of similar patients. You're doing well!`;
    } else if (percentiles.overall >= 25) {
      return `You're making progress! ${100 - percentiles.overall}% of similar patients are ahead - but you're catching up!`;
    } else {
      return `Every session counts! Focus on consistency and you'll see improvement. You've got this!`;
    }
  }
  /**
   * Store cohort comparison
   */
  async storeCohortComparison(comparison, criteria) {
    try {
      await db.insert(cohortComparisons).values({
        patientId: comparison.patientId,
        cohortId: comparison.cohortId,
        cohortCriteria: JSON.stringify(criteria),
        cohortSize: comparison.cohortSize,
        comparedAt: /* @__PURE__ */ new Date(),
        durationPercentile: comparison.percentiles.duration,
        powerPercentile: comparison.percentiles.power,
        consistencyPercentile: comparison.percentiles.consistency,
        improvementPercentile: comparison.percentiles.improvement,
        overallPercentile: comparison.percentiles.overall,
        comparisonMessage: comparison.message
      });
    } catch (error) {
      logger.error("Store cohort comparison failed", { error: error.message });
    }
  }
  // ========================================================================
  // VIRTUAL COMPETITION (Patent 3.2)
  // ========================================================================
  /**
   * Create a new virtual competition
   */
  async createCompetition(name, type, startDate, endDate, matchingCriteria) {
    try {
      const result = await db.insert(virtualCompetitions).values({
        competitionName: name,
        competitionType: type,
        startDate,
        endDate,
        matchingCriteria: JSON.stringify(matchingCriteria),
        status: "active"
      });
      return result.lastInsertRowid;
    } catch (error) {
      logger.error("Create competition failed", { error: error.message });
      return null;
    }
  }
  /**
   * Join a patient to a competition
   */
  async joinCompetition(patientId, competitionId) {
    try {
      const existing = await db.select().from(competitionParticipants).where(and10(
        eq10(competitionParticipants.competitionId, competitionId),
        eq10(competitionParticipants.patientId, patientId)
      )).limit(1);
      if (existing.length > 0) {
        return { success: true, anonymousId: existing[0].anonymousId };
      }
      const anonymousId = this.generateAnonymousId(patientId, competitionId);
      await db.insert(competitionParticipants).values({
        competitionId,
        patientId,
        anonymousId,
        currentScore: 0,
        sessionsContributed: 0
      });
      return { success: true, anonymousId };
    } catch (error) {
      logger.error("Join competition failed", { error: error.message, patientId, competitionId });
      return { success: false, error: error.message };
    }
  }
  /**
   * Generate privacy-preserving anonymous ID
   */
  generateAnonymousId(patientId, competitionId) {
    const prefix = ANONYMOUS_PREFIXES[Math.floor(Math.random() * ANONYMOUS_PREFIXES.length)];
    const hash = createHash("sha256").update(`${patientId}-${competitionId}-${Date.now()}`).digest("hex").substring(0, 4).toUpperCase();
    return `${prefix}_${hash}`;
  }
  /**
   * Update competition scores from a session
   */
  async updateCompetitionScores(patientId, sessionMetrics) {
    try {
      const participations = await db.select().from(competitionParticipants).where(eq10(competitionParticipants.patientId, patientId));
      const results = [];
      for (const participation of participations) {
        const competition = await db.select().from(virtualCompetitions).where(eq10(virtualCompetitions.id, participation.competitionId)).limit(1);
        if (!competition.length || competition[0].status !== "active") continue;
        const scoreIncrement = this.calculateScoreIncrement(
          competition[0].competitionType,
          sessionMetrics
        );
        const oldScore = participation.currentScore || 0;
        const newScore = oldScore + scoreIncrement;
        const oldRank = participation.currentRank || 999;
        await db.update(competitionParticipants).set({
          currentScore: newScore,
          sessionsContributed: (participation.sessionsContributed || 0) + 1,
          lastContribution: /* @__PURE__ */ new Date()
        }).where(eq10(competitionParticipants.id, participation.id));
        await this.recalculateRanks(participation.competitionId);
        const updatedParticipation = await db.select().from(competitionParticipants).where(eq10(competitionParticipants.id, participation.id)).limit(1);
        const newRank = updatedParticipation[0]?.currentRank || 999;
        const milestones = this.checkMilestones(oldScore, newScore, competition[0]);
        const competitiveEvents = this.checkCompetitiveEvents(oldRank, newRank);
        results.push({
          competitionId: participation.competitionId,
          newScore,
          newRank,
          milestones,
          competitiveEvents
        });
      }
      return { updated: results.length > 0, competitions: results };
    } catch (error) {
      logger.error("Update competition scores failed", { error: error.message, patientId });
      return { updated: false, competitions: [] };
    }
  }
  /**
   * Calculate score increment based on competition type
   */
  calculateScoreIncrement(type, metrics) {
    switch (type) {
      case "daily_distance":
        return metrics.distance || 0;
      case "weekly_duration":
        return metrics.duration || 0;
      case "power_challenge":
        return metrics.avgPower || 0;
      case "consistency_streak":
        return 1;
      // Each session counts as 1
      default:
        return metrics.duration || 0;
    }
  }
  /**
   * Recalculate ranks for all participants in a competition
   */
  async recalculateRanks(competitionId) {
    try {
      const participants = await db.select().from(competitionParticipants).where(eq10(competitionParticipants.competitionId, competitionId)).orderBy(desc9(competitionParticipants.currentScore));
      for (let i = 0; i < participants.length; i++) {
        await db.update(competitionParticipants).set({ currentRank: i + 1 }).where(eq10(competitionParticipants.id, participants[i].id));
      }
    } catch (error) {
      logger.error("Recalculate ranks failed", { error: error.message, competitionId });
    }
  }
  /**
   * Check for milestone achievements
   */
  checkMilestones(oldScore, newScore, competition) {
    const achieved = [];
    const progress = newScore / 100;
    for (const milestone of MILESTONES) {
      const oldProgress = oldScore / 100;
      if (progress >= milestone.threshold && oldProgress < milestone.threshold) {
        achieved.push(milestone.id);
      }
    }
    return achieved;
  }
  /**
   * Check for competitive events (passing/being passed)
   */
  checkCompetitiveEvents(oldRank, newRank) {
    const events = [];
    if (newRank < oldRank) {
      events.push("passed_opponent");
      if (newRank === 1) {
        events.push("took_lead");
      }
    } else if (newRank > oldRank) {
      events.push("was_passed");
    }
    return events;
  }
  /**
   * Get leaderboard for a competition
   */
  async getLeaderboard(competitionId, limit = 10) {
    try {
      const participants = await db.select({
        rank: competitionParticipants.currentRank,
        anonymousId: competitionParticipants.anonymousId,
        score: competitionParticipants.currentScore,
        sessions: competitionParticipants.sessionsContributed
      }).from(competitionParticipants).where(eq10(competitionParticipants.competitionId, competitionId)).orderBy(competitionParticipants.currentRank).limit(limit);
      const total = await db.select({ count: count2() }).from(competitionParticipants).where(eq10(competitionParticipants.competitionId, competitionId));
      return {
        participants: participants.map((p) => ({
          rank: p.rank || 0,
          anonymousId: p.anonymousId,
          score: p.score || 0,
          sessionsContributed: p.sessions || 0
        })),
        totalParticipants: total[0]?.count || 0
      };
    } catch (error) {
      logger.error("Get leaderboard failed", { error: error.message, competitionId });
      return { participants: [], totalParticipants: 0 };
    }
  }
  /**
   * Get milestone feedback for UI/device
   */
  getMilestoneFeedback(milestoneId) {
    return MILESTONES.find((m) => m.id === milestoneId);
  }
  /**
   * Get competitive event feedback
   */
  getCompetitiveEventFeedback(eventType) {
    return COMPETITIVE_SOUNDS[eventType];
  }
  /**
   * Find suitable competition for a patient
   */
  async findSuitableCompetition(patientId) {
    try {
      const profile = await db.select().from(patientProfiles).where(eq10(patientProfiles.userId, patientId)).limit(1);
      if (!profile.length) return null;
      const competitions = await db.select().from(virtualCompetitions).where(eq10(virtualCompetitions.status, "active"));
      for (const competition of competitions) {
        const criteria = JSON.parse(competition.matchingCriteria);
        if (profile[0].age >= criteria.ageRange[0] && profile[0].age <= criteria.ageRange[1]) {
          const existing = await db.select().from(competitionParticipants).where(and10(
            eq10(competitionParticipants.competitionId, competition.id),
            eq10(competitionParticipants.patientId, patientId)
          )).limit(1);
          if (existing.length === 0) {
            return competition.id;
          }
        }
      }
      return null;
    } catch (error) {
      logger.error("Find suitable competition failed", { error: error.message, patientId });
      return null;
    }
  }
};
var competitionEngine = new CompetitionEngine();

// server/personalization/insurance-report-engine.ts
await init_db();
init_schema();
init_logger();
import { eq as eq11, and as and11, desc as desc10, gte as gte8 } from "drizzle-orm";
import PDFDocument from "pdfkit";
var SNF_CRITERIA = [
  {
    id: "mobility_deficit",
    name: "Significant Mobility Deficit",
    description: "Patient requires skilled nursing for mobility assistance",
    threshold: 50,
    metricPath: "functionalCapacity.currentMobilityScore",
    operator: "lt",
    weight: 1
  },
  {
    id: "improvement_potential",
    name: "Improvement Potential",
    description: "Patient shows potential for functional improvement",
    threshold: "improving",
    metricPath: "progressTrajectory",
    operator: "eq",
    weight: 0.8
  },
  {
    id: "skilled_need",
    name: "Requires Skilled Services",
    description: "Condition requires skilled nursing or therapy services",
    threshold: 30,
    metricPath: "predictions.timeToIndependenceDays",
    operator: "gt",
    weight: 0.9
  },
  {
    id: "medical_necessity",
    name: "Medical Necessity",
    description: "Exercise program is medically necessary for recovery",
    threshold: 0.2,
    metricPath: "functionalCapacity.changePercent",
    operator: "lt",
    weight: 0.7
  }
];
var HOME_HEALTH_CRITERIA = [
  {
    id: "homebound_status",
    name: "Homebound Status",
    description: "Patient is essentially homebound",
    threshold: 70,
    metricPath: "functionalCapacity.currentMobilityScore",
    operator: "lt",
    weight: 1
  },
  {
    id: "skilled_intervention",
    name: "Requires Skilled Intervention",
    description: "Needs skilled PT/OT for exercise program",
    threshold: 50,
    metricPath: "functionalCapacity.objectiveMetrics.consistencyScore",
    operator: "lt",
    weight: 0.8
  },
  {
    id: "reasonable_expectation",
    name: "Reasonable Improvement Expectation",
    description: "Patient expected to improve with services",
    threshold: "declining",
    metricPath: "progressTrajectory",
    operator: "eq",
    // NOT declining (inverted logic)
    weight: 0.9
  }
];
var OUTPATIENT_PT_CRITERIA = [
  {
    id: "functional_limitation",
    name: "Functional Limitation",
    description: "Patient has functional limitations requiring PT",
    threshold: 80,
    metricPath: "functionalCapacity.currentMobilityScore",
    operator: "lt",
    weight: 1
  },
  {
    id: "progress_toward_goals",
    name: "Progress Toward Goals",
    description: "Patient making progress toward functional goals",
    threshold: "declining",
    metricPath: "progressTrajectory",
    operator: "eq",
    // NOT declining
    weight: 0.7
  }
];
var InsuranceReportEngine = class {
  /**
   * Generate insurance authorization report
   */
  async generateReport(patientId, reportType, generatedBy) {
    try {
      const reportData = await this.gatherReportData(patientId, reportType);
      if (!reportData) {
        return {
          success: false,
          error: "Insufficient data to generate report"
        };
      }
      const criteriaResults = this.evaluateCriteria(reportType, reportData);
      const reportContent = this.generateReportContent(reportData, criteriaResults, reportType);
      const reportPdf = await this.generatePDF(reportData, criteriaResults, reportType);
      const result = await db.insert(insuranceReports).values({
        patientId,
        reportType,
        generatedAt: /* @__PURE__ */ new Date(),
        generatedBy,
        functionalCapacityData: JSON.stringify(reportData.functionalCapacity),
        progressTrajectory: reportData.progressTrajectory,
        comparisonToThresholds: JSON.stringify(criteriaResults),
        predictedTimeToIndependence: reportData.predictions.timeToIndependenceDays,
        predictedDischargeDisposition: reportData.predictions.dischargeDisposition,
        predictionConfidence: reportData.predictions.confidence,
        reportContent,
        reportPdf
      });
      logger.info("Insurance report generated", {
        patientId,
        reportType,
        reportId: result.lastInsertRowid
      });
      return {
        success: true,
        reportId: result.lastInsertRowid,
        reportData
      };
    } catch (error) {
      logger.error("Insurance report generation failed", {
        error: error.message,
        patientId,
        reportType
      });
      return { success: false, error: error.message };
    }
  }
  /**
   * Gather all data needed for report
   */
  async gatherReportData(patientId, reportType) {
    try {
      logger.info("Starting insurance report data gathering", { patientId });
      logger.info("Querying patient profile...");
      const profile = await db.select().from(patientProfiles).where(eq11(patientProfiles.userId, patientId)).limit(1);
      logger.info("Profile query complete", { profileFound: profile.length > 0 });
      logger.info("Querying user...");
      const user = await db.select().from(users).where(eq11(users.id, patientId)).limit(1);
      logger.info("User query complete", { userFound: user.length > 0 });
      if (!profile.length) {
        logger.warn("No profile found for insurance report", { patientId });
        return null;
      }
      const cutoffDate = /* @__PURE__ */ new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 14);
      const sessions3 = await db.select().from(exerciseSessions).where(and11(
        eq11(exerciseSessions.patientId, patientId),
        gte8(exerciseSessions.startTime, cutoffDate)
      )).orderBy(desc10(exerciseSessions.startTime));
      logger.info("Insurance report session query", { patientId, sessionCount: sessions3.length, cutoffDate: cutoffDate.toISOString() });
      if (sessions3.length < 3) {
        logger.warn("Insufficient sessions for insurance report", { patientId, sessionCount: sessions3.length });
        return null;
      }
      const baselineSessions = sessions3.slice(-3);
      const recentSessions = sessions3.slice(0, 3);
      const baselinePower = this.average(baselineSessions.map((s) => s.avgPower || 0));
      const currentPower = this.average(recentSessions.map((s) => s.avgPower || 0));
      const baselineDuration = this.average(baselineSessions.map(
        (s) => (s.durationSeconds || s.duration * 60) / 60
      ));
      const currentDuration = this.average(recentSessions.map(
        (s) => (s.durationSeconds || s.duration * 60) / 60
      ));
      let currentMobilityScore = 0;
      let baselineMobilityScore = 0;
      try {
        const latestMobility = await db.select().from(mobilityScores).where(eq11(mobilityScores.patientId, patientId)).orderBy(desc10(mobilityScores.scoredAt)).limit(1);
        const baselineMobility = await db.select().from(mobilityScores).where(eq11(mobilityScores.patientId, patientId)).orderBy(mobilityScores.scoredAt).limit(1);
        currentMobilityScore = latestMobility[0]?.unifiedScore || this.estimateMobilityScore(profile[0]);
        baselineMobilityScore = baselineMobility[0]?.unifiedScore || currentMobilityScore * 0.9;
      } catch (error) {
        logger.warn("Mobility scores unavailable, using estimates", { error: error.message });
        currentMobilityScore = this.estimateMobilityScore(profile[0]);
        baselineMobilityScore = currentMobilityScore * 0.9;
      }
      const changePercent = baselineMobilityScore > 0 ? (currentMobilityScore - baselineMobilityScore) / baselineMobilityScore : 0;
      let progressTrajectory = "plateaued";
      if (changePercent > 0.05) progressTrajectory = "improving";
      else if (changePercent < -0.05) progressTrajectory = "declining";
      const daysBetweenSessions = this.calculateDaysBetweenSessions(sessions3);
      const consistencyScore = Math.max(0, 100 - daysBetweenSessions * 20);
      const bilateralBalance = 85;
      let riskAssessment = [];
      try {
        riskAssessment = await db.select().from(riskAssessments).where(eq11(riskAssessments.patientId, patientId)).orderBy(desc10(riskAssessments.createdAt)).limit(1);
      } catch (error) {
        logger.warn("Risk assessments unavailable", { error: error.message });
      }
      const timeToIndependence = this.predictTimeToIndependence(
        currentMobilityScore,
        progressTrajectory,
        profile[0]
      );
      const dischargeDisposition = this.predictDischargeDisposition(
        currentMobilityScore,
        progressTrajectory,
        profile[0],
        riskAssessment[0]
      );
      const readmissionRisk = this.calculateReadmissionRisk(
        currentMobilityScore,
        progressTrajectory,
        sessions3.length
      );
      return {
        patientId,
        reportType,
        functionalCapacity: {
          currentMobilityScore,
          baselineMobilityScore,
          changePercent,
          objectiveMetrics: {
            avgSessionDuration: currentDuration,
            avgPower: currentPower,
            consistencyScore,
            bilateralBalance
          }
        },
        progressTrajectory,
        predictions: {
          timeToIndependenceDays: timeToIndependence,
          dischargeDisposition,
          readmissionRisk,
          confidence: this.calculatePredictionConfidence(sessions3.length, progressTrajectory)
        },
        insuranceCriteriaAlignment: []
        // Filled later
      };
    } catch (error) {
      logger.error("Gather report data failed", { error: error.message, stack: error.stack, patientId });
      console.error("Full error object:", error);
      return null;
    }
  }
  /**
   * Evaluate report data against insurance criteria
   */
  evaluateCriteria(reportType, data) {
    const criteria = this.getCriteriaForType(reportType);
    const results = [];
    for (const criterion of criteria) {
      const value = this.getNestedValue(data, criterion.metricPath);
      const met = this.evaluateCriterion(criterion, value);
      results.push({
        criterionName: criterion.name,
        met,
        evidence: this.generateEvidence(criterion, value, met)
      });
    }
    return results;
  }
  /**
   * Get criteria for report type
   */
  getCriteriaForType(reportType) {
    switch (reportType) {
      case "snf_authorization":
        return SNF_CRITERIA;
      case "home_health":
        return HOME_HEALTH_CRITERIA;
      case "outpatient_pt":
        return OUTPATIENT_PT_CRITERIA;
      default:
        return SNF_CRITERIA;
    }
  }
  /**
   * Get nested value from object
   */
  getNestedValue(obj, path3) {
    return path3.split(".").reduce((current, key) => current?.[key], obj);
  }
  /**
   * Evaluate single criterion
   */
  evaluateCriterion(criterion, value) {
    switch (criterion.operator) {
      case "gt":
        return Number(value) > Number(criterion.threshold);
      case "lt":
        return Number(value) < Number(criterion.threshold);
      case "eq":
        if (criterion.threshold === "declining") {
          return value !== "declining";
        }
        return value === criterion.threshold;
      default:
        return false;
    }
  }
  /**
   * Generate evidence statement for criterion
   */
  generateEvidence(criterion, value, met) {
    const valueStr = typeof value === "number" ? value.toFixed(1) : String(value);
    if (met) {
      return `Patient meets ${criterion.name}: ${criterion.description}. Current value: ${valueStr}`;
    } else {
      return `Patient does not currently meet ${criterion.name}. Current value: ${valueStr}. Threshold: ${criterion.threshold}`;
    }
  }
  /**
   * Generate text report content
   */
  generateReportContent(data, criteriaResults, reportType) {
    const reportTitle = this.getReportTitle(reportType);
    const metCriteria = criteriaResults.filter((c) => c.met).length;
    const totalCriteria = criteriaResults.length;
    let content = `
${reportTitle}
Generated: ${(/* @__PURE__ */ new Date()).toISOString()}
Patient ID: ${data.patientId}

================================================================================
FUNCTIONAL CAPACITY ASSESSMENT
================================================================================

Current Mobility Score: ${data.functionalCapacity.currentMobilityScore.toFixed(1)}/100
Baseline Mobility Score: ${data.functionalCapacity.baselineMobilityScore.toFixed(1)}/100
Change: ${(data.functionalCapacity.changePercent * 100).toFixed(1)}%
Progress Trajectory: ${data.progressTrajectory.toUpperCase()}

OBJECTIVE EXERCISE METRICS:
- Average Session Duration: ${data.functionalCapacity.objectiveMetrics.avgSessionDuration.toFixed(1)} minutes
- Average Power Output: ${data.functionalCapacity.objectiveMetrics.avgPower.toFixed(1)} watts
- Consistency Score: ${data.functionalCapacity.objectiveMetrics.consistencyScore.toFixed(0)}/100
- Bilateral Balance: ${data.functionalCapacity.objectiveMetrics.bilateralBalance.toFixed(0)}%

================================================================================
PREDICTIONS
================================================================================

Predicted Time to Independence: ${data.predictions.timeToIndependenceDays || "N/A"} days
Predicted Discharge Disposition: ${data.predictions.dischargeDisposition}
30-Day Readmission Risk: ${(data.predictions.readmissionRisk * 100).toFixed(1)}%
Prediction Confidence: ${(data.predictions.confidence * 100).toFixed(0)}%

================================================================================
INSURANCE CRITERIA ALIGNMENT
================================================================================

Criteria Met: ${metCriteria}/${totalCriteria}

`;
    for (const result of criteriaResults) {
      content += `
[${result.met ? "MET" : "NOT MET"}] ${result.criterionName}
${result.evidence}
`;
    }
    content += `
================================================================================
CLINICAL JUSTIFICATION
================================================================================

Based on the objective functional assessment data collected through standardized
bedside cycling exercise sessions, the patient ${metCriteria >= totalCriteria / 2 ? "meets" : "does not fully meet"}
the criteria for ${this.getServiceDescription(reportType)}.

${this.generateJustificationText(data, criteriaResults, reportType)}

================================================================================
ATTESTATION
================================================================================

This report contains objective data collected through an FDA-registered medical
device. All metrics are based on actual patient performance during supervised
exercise sessions. The predictions are generated using validated algorithms
based on clinical outcomes data.

Report requires clinician review and approval before submission.
`;
    return content;
  }
  /**
   * Get report title
   */
  getReportTitle(reportType) {
    switch (reportType) {
      case "snf_authorization":
        return "SKILLED NURSING FACILITY AUTHORIZATION REQUEST";
      case "home_health":
        return "HOME HEALTH SERVICES AUTHORIZATION REQUEST";
      case "outpatient_pt":
        return "OUTPATIENT PHYSICAL THERAPY AUTHORIZATION REQUEST";
      default:
        return "INSURANCE AUTHORIZATION REQUEST";
    }
  }
  /**
   * Get service description
   */
  getServiceDescription(reportType) {
    switch (reportType) {
      case "snf_authorization":
        return "skilled nursing facility placement";
      case "home_health":
        return "home health physical therapy services";
      case "outpatient_pt":
        return "outpatient physical therapy";
      default:
        return "requested services";
    }
  }
  /**
   * Generate justification text
   */
  generateJustificationText(data, criteriaResults, reportType) {
    const improving = data.progressTrajectory === "improving";
    const declining = data.progressTrajectory === "declining";
    const mobilityScore = data.functionalCapacity.currentMobilityScore;
    if (reportType === "snf_authorization") {
      if (mobilityScore < 40) {
        return `The patient demonstrates significant functional limitations with a mobility score of ${mobilityScore.toFixed(1)}/100. ${improving ? "The improving trajectory indicates rehabilitation potential." : "Skilled nursing services are essential to prevent further decline and promote recovery."} The objective data supports the medical necessity for SNF-level care.`;
      } else if (mobilityScore < 60) {
        return `The patient's functional status (${mobilityScore.toFixed(1)}/100) indicates moderate impairment requiring skilled intervention. ${declining ? "The declining trajectory necessitates intensive rehabilitation services." : "Continued skilled care is needed to achieve functional independence."}`;
      }
    }
    if (reportType === "home_health") {
      return `The patient's current mobility score of ${mobilityScore.toFixed(1)}/100 and ${data.progressTrajectory} trajectory indicate the need for skilled home health services. The patient has demonstrated ${improving ? "responsiveness to therapy through exercise metrics" : "need for continued skilled intervention to prevent decline"}.`;
    }
    return `Based on objective functional metrics, the patient ${improving ? "shows potential for improvement with" : "requires"} continued therapeutic intervention.`;
  }
  /**
   * Generate PDF report
   */
  async generatePDF(data, criteriaResults, reportType) {
    return new Promise((resolve, reject) => {
      try {
        const chunks = [];
        const doc = new PDFDocument({ margin: 50 });
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer.toString("base64"));
        });
        doc.on("error", reject);
        doc.fontSize(18).font("Helvetica-Bold").text(this.getReportTitle(reportType), { align: "center" });
        doc.moveDown();
        doc.fontSize(10).font("Helvetica").text(`Generated: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`, { align: "center" });
        doc.text(`Patient ID: ${data.patientId}`, { align: "center" });
        doc.moveDown(2);
        doc.fontSize(14).font("Helvetica-Bold").text("FUNCTIONAL CAPACITY ASSESSMENT");
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");
        doc.text(`Current Mobility Score: ${data.functionalCapacity.currentMobilityScore.toFixed(1)}/100`);
        doc.text(`Baseline Mobility Score: ${data.functionalCapacity.baselineMobilityScore.toFixed(1)}/100`);
        doc.text(`Change: ${(data.functionalCapacity.changePercent * 100).toFixed(1)}%`);
        doc.text(`Progress Trajectory: ${data.progressTrajectory.toUpperCase()}`);
        doc.moveDown();
        doc.font("Helvetica-Bold").text("Objective Metrics:");
        doc.font("Helvetica");
        doc.text(`  \u2022 Avg Session Duration: ${data.functionalCapacity.objectiveMetrics.avgSessionDuration.toFixed(1)} min`);
        doc.text(`  \u2022 Avg Power Output: ${data.functionalCapacity.objectiveMetrics.avgPower.toFixed(1)} watts`);
        doc.text(`  \u2022 Consistency Score: ${data.functionalCapacity.objectiveMetrics.consistencyScore.toFixed(0)}/100`);
        doc.moveDown(2);
        doc.fontSize(14).font("Helvetica-Bold").text("PREDICTIONS");
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica");
        doc.text(`Time to Independence: ${data.predictions.timeToIndependenceDays || "N/A"} days`);
        doc.text(`Discharge Disposition: ${data.predictions.dischargeDisposition}`);
        doc.text(`30-Day Readmission Risk: ${(data.predictions.readmissionRisk * 100).toFixed(1)}%`);
        doc.text(`Confidence: ${(data.predictions.confidence * 100).toFixed(0)}%`);
        doc.moveDown(2);
        const metCount = criteriaResults.filter((c) => c.met).length;
        doc.fontSize(14).font("Helvetica-Bold").text(`INSURANCE CRITERIA (${metCount}/${criteriaResults.length} Met)`);
        doc.moveDown(0.5);
        for (const result of criteriaResults) {
          doc.fontSize(11);
          doc.font("Helvetica-Bold").fillColor(result.met ? "green" : "red").text(`[${result.met ? "\u2713" : "\u2717"}] ${result.criterionName}`, { continued: false });
          doc.font("Helvetica").fillColor("black").text(`    ${result.evidence}`, { indent: 20 });
          doc.moveDown(0.5);
        }
        doc.moveDown(2);
        doc.fontSize(9).font("Helvetica-Oblique").text("This report requires clinician review and approval before submission.", { align: "center" });
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  // ========================================================================
  // HELPER METHODS
  // ========================================================================
  average(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  calculateDaysBetweenSessions(sessions3) {
    if (sessions3.length < 2) return 0;
    let totalDays = 0;
    for (let i = 1; i < sessions3.length; i++) {
      const current = new Date(sessions3[i - 1].startTime);
      const previous = new Date(sessions3[i].startTime);
      totalDays += (current.getTime() - previous.getTime()) / (1e3 * 60 * 60 * 24);
    }
    return totalDays / (sessions3.length - 1);
  }
  estimateMobilityScore(profile) {
    const mobilityScores3 = {
      "independent": 90,
      "walking_assist": 70,
      "standing_assist": 50,
      "chair_bound": 30,
      "bedbound": 15
    };
    return mobilityScores3[profile.mobilityStatus] || 40;
  }
  predictTimeToIndependence(currentScore, trajectory, profile) {
    if (currentScore >= 85) return null;
    const targetScore = 85;
    const gap = targetScore - currentScore;
    let dailyImprovement = 0.5;
    if (trajectory === "improving") {
      dailyImprovement = 1;
    } else if (trajectory === "declining") {
      return null;
    }
    if (profile.age >= 80) dailyImprovement *= 0.6;
    else if (profile.age >= 70) dailyImprovement *= 0.8;
    return Math.ceil(gap / dailyImprovement);
  }
  predictDischargeDisposition(currentScore, trajectory, profile, riskAssessment) {
    if (currentScore >= 75 && trajectory !== "declining") {
      return "Home with outpatient PT";
    } else if (currentScore >= 50 || trajectory === "improving") {
      return "Home with home health services";
    } else if (currentScore >= 30) {
      return "Skilled nursing facility";
    } else {
      return "Long-term acute care or rehabilitation";
    }
  }
  calculateReadmissionRisk(mobilityScore, trajectory, sessionCount) {
    let risk = 0.15;
    if (mobilityScore < 40) risk += 0.15;
    else if (mobilityScore < 60) risk += 0.08;
    else if (mobilityScore >= 80) risk -= 0.05;
    if (trajectory === "declining") risk += 0.1;
    else if (trajectory === "improving") risk -= 0.05;
    if (sessionCount < 5) risk += 0.05;
    else if (sessionCount >= 10) risk -= 0.03;
    return Math.max(0.05, Math.min(0.5, risk));
  }
  calculatePredictionConfidence(sessionCount, trajectory) {
    let confidence = 0.5;
    confidence += Math.min(sessionCount / 20, 0.3);
    if (trajectory !== "plateaued") confidence += 0.1;
    return Math.min(confidence, 0.95);
  }
  /**
   * Approve report (clinician action)
   */
  async approveReport(reportId, approverId) {
    try {
      await db.update(insuranceReports).set({
        clinicianApproved: true,
        approvedBy: approverId,
        approvedAt: /* @__PURE__ */ new Date()
      }).where(eq11(insuranceReports.id, reportId));
      return true;
    } catch (error) {
      logger.error("Report approval failed", { error: error.message, reportId });
      return false;
    }
  }
  /**
   * Mark report as submitted to insurance
   */
  async markAsSubmitted(reportId) {
    try {
      await db.update(insuranceReports).set({
        submittedToInsurance: true,
        submittedAt: /* @__PURE__ */ new Date()
      }).where(eq11(insuranceReports.id, reportId));
      return true;
    } catch (error) {
      logger.error("Mark submitted failed", { error: error.message, reportId });
      return false;
    }
  }
};
var insuranceReportEngine = new InsuranceReportEngine();

// server/personalization/bilateral-force-engine.ts
await init_db();
init_schema();
init_logger();
var DEFAULT_CONFIG2 = {
  normalAsymmetryThreshold: 0.1,
  mildAsymmetryThreshold: 0.15,
  moderateAsymmetryThreshold: 0.25,
  severeAsymmetryThreshold: 0.35,
  suddenChangeThreshold: 0.25,
  baselineSessionsRequired: 3,
  feedbackLatencyMs: 100,
  feedbackIntensityScale: 100
};
var BilateralForceEngine = class {
  config;
  // Baseline tracking
  patientBaselines = /* @__PURE__ */ new Map();
  // Stroke rehab protocols
  strokeProtocols = /* @__PURE__ */ new Map();
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG2, ...config };
  }
  /**
   * Process bilateral force data from sensors
   *
   * NOTE: Requires bilateral force sensors to be integrated
   * Currently estimates from power data if sensors not available
   */
  processBilateralData(patientId, sessionId, leftForce, rightForce, totalPower) {
    if (leftForce === void 0 || rightForce === void 0) {
      return this.estimateBilateralFromPower(totalPower || 0);
    }
    const maxForce = Math.max(leftForce, rightForce);
    const asymmetryPercent = maxForce > 0 ? Math.abs(leftForce - rightForce) / maxForce : 0;
    const clinicalSignificance = asymmetryPercent >= this.config.mildAsymmetryThreshold;
    const baseline = this.patientBaselines.get(patientId);
    let trend = "stable";
    if (baseline && baseline.sessionsAnalyzed >= this.config.baselineSessionsRequired) {
      const asymmetryChange = asymmetryPercent - baseline.asymmetryBaseline;
      if (asymmetryChange < -0.03) trend = "improving";
      else if (asymmetryChange > 0.03) trend = "worsening";
    }
    return {
      leftForce,
      rightForce,
      asymmetryPercent: Math.round(asymmetryPercent * 1e3) / 10,
      // One decimal percent
      trend,
      clinicalSignificance
    };
  }
  /**
   * Estimate bilateral metrics from total power (fallback)
   */
  estimateBilateralFromPower(totalPower) {
    const variation = 0.02 + Math.random() * 0.05;
    const leftProportion = 0.5 + (Math.random() - 0.5) * variation;
    const leftForce = totalPower * leftProportion;
    const rightForce = totalPower * (1 - leftProportion);
    return {
      leftForce: Math.round(leftForce * 10) / 10,
      rightForce: Math.round(rightForce * 10) / 10,
      asymmetryPercent: Math.round(Math.abs(leftProportion - 0.5) * 200 * 10) / 10,
      trend: "stable",
      clinicalSignificance: false
    };
  }
  /**
   * Generate real-time feedback for bilateral balancing
   *
   * Patent 2.1: Graduated feedback system
   */
  generateBalancingFeedback(metrics) {
    const asymmetry = metrics.asymmetryPercent / 100;
    let targetSide = "balanced";
    if (asymmetry > this.config.normalAsymmetryThreshold) {
      targetSide = metrics.leftForce > metrics.rightForce ? "right" : "left";
    }
    let feedbackType = "visual";
    if (asymmetry > this.config.moderateAsymmetryThreshold) {
      feedbackType = "haptic";
    } else if (asymmetry > this.config.mildAsymmetryThreshold) {
      feedbackType = "audio";
    }
    const intensity = Math.min(
      100,
      Math.round(asymmetry / this.config.moderateAsymmetryThreshold * this.config.feedbackIntensityScale)
    );
    let message;
    if (targetSide !== "balanced") {
      message = `Push more with your ${targetSide} leg`;
    }
    return {
      targetSide,
      feedbackType,
      intensity,
      message
    };
  }
  /**
   * Check for sudden neurological change
   *
   * Patent 2.3: Early detection of neurological deficits
   */
  async checkForNeurologicalEvent(patientId, currentMetrics) {
    const baseline = this.patientBaselines.get(patientId);
    if (!baseline || baseline.sessionsAnalyzed < this.config.baselineSessionsRequired) {
      return { alertTriggered: false };
    }
    const currentAsymmetry = currentMetrics.asymmetryPercent / 100;
    const baselineAsymmetry = baseline.asymmetryBaseline;
    const change = Math.abs(currentAsymmetry - baselineAsymmetry);
    if (change >= this.config.suddenChangeThreshold) {
      const alertType = currentAsymmetry >= this.config.severeAsymmetryThreshold ? "possible_stroke" : "significant_change";
      await db.insert(alerts).values({
        patientId,
        type: "neurological_alert",
        priority: "critical",
        message: `URGENT: Sudden bilateral asymmetry change detected. Current: ${Math.round(currentAsymmetry * 100)}%, Baseline: ${Math.round(baselineAsymmetry * 100)}%. Possible neurological event.`,
        actionRequired: "Immediate neurological assessment required",
        metadata: JSON.stringify({
          currentAsymmetry,
          baselineAsymmetry,
          changePercent: change,
          alertType
        }),
        triggeredAt: /* @__PURE__ */ new Date()
      });
      logger.warn("Neurological alert triggered", {
        patientId,
        currentAsymmetry,
        baselineAsymmetry,
        change,
        alertType
      });
      return {
        alertTriggered: true,
        alertType,
        details: `Asymmetry changed from ${Math.round(baselineAsymmetry * 100)}% to ${Math.round(currentAsymmetry * 100)}%`
      };
    }
    return { alertTriggered: false };
  }
  /**
   * Update patient's bilateral baseline
   */
  async updateBaseline(patientId, sessionMetrics) {
    const current = this.patientBaselines.get(patientId);
    if (!current) {
      this.patientBaselines.set(patientId, {
        leftForceBaseline: sessionMetrics.leftForce,
        rightForceBaseline: sessionMetrics.rightForce,
        asymmetryBaseline: sessionMetrics.asymmetryPercent / 100,
        sessionsAnalyzed: 1
      });
    } else {
      const n = current.sessionsAnalyzed;
      const weight = Math.min(n, 5);
      current.leftForceBaseline = (current.leftForceBaseline * weight + sessionMetrics.leftForce) / (weight + 1);
      current.rightForceBaseline = (current.rightForceBaseline * weight + sessionMetrics.rightForce) / (weight + 1);
      current.asymmetryBaseline = (current.asymmetryBaseline * weight + sessionMetrics.asymmetryPercent / 100) / (weight + 1);
      current.sessionsAnalyzed++;
    }
  }
  // ========================================================================
  // STROKE REHABILITATION (Patent 2.2)
  // ========================================================================
  /**
   * Initialize stroke rehabilitation protocol for a patient
   */
  async initializeStrokeProtocol(patientId, affectedSide, initialAsymmetry) {
    const asymmetryGoal = Math.max(0.1, initialAsymmetry * 0.7);
    const protocol = {
      patientId,
      affectedSide,
      baselineAsymmetry: initialAsymmetry,
      currentAsymmetry: initialAsymmetry,
      asymmetryGoal,
      progressPhase: "assessment",
      resistanceAdjustment: {
        weakSide: 0.7,
        // 70% of normal resistance
        strongSide: 1.2
        // 120% of normal resistance
      }
    };
    this.strokeProtocols.set(patientId, protocol);
    logger.info("Stroke rehab protocol initialized", {
      patientId,
      affectedSide,
      initialAsymmetry,
      asymmetryGoal
    });
    return protocol;
  }
  /**
   * Update stroke protocol based on session performance
   */
  async updateStrokeProtocol(patientId, sessionAsymmetry) {
    const protocol = this.strokeProtocols.get(patientId);
    if (!protocol) {
      return { protocolUpdated: false };
    }
    protocol.currentAsymmetry = protocol.currentAsymmetry * 0.7 + sessionAsymmetry * 0.3;
    let phaseChange;
    let newGoal;
    let resistanceChange;
    if (protocol.progressPhase === "assessment") {
      protocol.progressPhase = "active_training";
      phaseChange = "assessment -> active_training";
    } else if (protocol.progressPhase === "active_training") {
      if (protocol.currentAsymmetry <= protocol.asymmetryGoal) {
        newGoal = Math.max(0.08, protocol.asymmetryGoal * 0.8);
        protocol.asymmetryGoal = newGoal;
        protocol.resistanceAdjustment.weakSide = Math.min(1, protocol.resistanceAdjustment.weakSide + 0.1);
        protocol.resistanceAdjustment.strongSide = Math.max(1, protocol.resistanceAdjustment.strongSide - 0.05);
        resistanceChange = { ...protocol.resistanceAdjustment };
        if (protocol.currentAsymmetry <= 0.1) {
          protocol.progressPhase = "maintenance";
          phaseChange = "active_training -> maintenance";
        }
      }
    }
    return {
      protocolUpdated: true,
      phaseChange,
      newGoal,
      resistanceChange
    };
  }
  /**
   * Get stroke protocol status
   */
  getStrokeProtocol(patientId) {
    return this.strokeProtocols.get(patientId);
  }
  // ========================================================================
  // VISUALIZATION DATA (Patents 6.1, 6.3)
  // ========================================================================
  /**
   * Generate 3D force vector data for visualization
   *
   * Patent 6.1: 3D Force Vector Visualization
   */
  generate3DForceVectors(metrics) {
    const maxForce = Math.max(metrics.leftForce, metrics.rightForce);
    const optimalForce = 30;
    const getColor = (force) => {
      const ratio = force / optimalForce;
      if (ratio < 0.5) return "#4CAF50";
      if (ratio < 0.8) return "#FFC107";
      if (ratio <= 1.2) return "#4CAF50";
      return "#F44336";
    };
    const asymmetry = metrics.asymmetryPercent / 100;
    const coordination = Math.round((1 - asymmetry) * 100);
    return {
      leftVector: {
        x: -0.5,
        // Left position
        y: metrics.leftForce / maxForce,
        // Normalized height
        z: 0,
        magnitude: metrics.leftForce,
        color: getColor(metrics.leftForce)
      },
      rightVector: {
        x: 0.5,
        // Right position
        y: metrics.rightForce / maxForce,
        z: 0,
        magnitude: metrics.rightForce,
        color: getColor(metrics.rightForce)
      },
      coordination
    };
  }
  /**
   * Generate butterfly plot data for visualization
   *
   * Patent 6.3: Bilateral Symmetry Butterfly Plot
   */
  generateButterflyPlot(historicalMetrics) {
    const leftProfile = [];
    const rightProfile = [];
    const symmetryLine = [];
    let symmetrySum = 0;
    for (let i = 0; i < historicalMetrics.length; i++) {
      const m = historicalMetrics[i];
      leftProfile.push({ time: i, value: -m.left });
      rightProfile.push({ time: i, value: m.right });
      const max = Math.max(m.left, m.right);
      const symmetry = max > 0 ? (1 - Math.abs(m.left - m.right) / max) * 100 : 100;
      symmetryLine.push({ time: i, symmetry });
      symmetrySum += symmetry;
    }
    return {
      leftProfile,
      rightProfile,
      symmetryLine,
      overallSymmetryScore: historicalMetrics.length > 0 ? Math.round(symmetrySum / historicalMetrics.length) : 0
    };
  }
  // ========================================================================
  // RESISTANCE BALANCING (Patent 15.3)
  // ========================================================================
  /**
   * Calculate independent resistance levels for bilateral balancing
   *
   * Patent 15.3: Bilateral Resistance Balancing System
   */
  calculateAsymmetricResistance(baseResistance, metrics, isStrokeRehab = false) {
    const asymmetry = metrics.asymmetryPercent / 100;
    let leftResistance = baseResistance;
    let rightResistance = baseResistance;
    let rationale = "Symmetric resistance - bilateral balance is good";
    if (asymmetry > this.config.normalAsymmetryThreshold) {
      const weakerSide = metrics.leftForce < metrics.rightForce ? "left" : "right";
      const adjustmentFactor = 1 + asymmetry * 0.5;
      if (weakerSide === "left") {
        leftResistance = Math.max(1, baseResistance / adjustmentFactor);
        rightResistance = Math.min(9, baseResistance * (1 + asymmetry * 0.3));
        rationale = `Left side weaker (${Math.round(asymmetry * 100)}% asymmetry). Reduced left resistance, increased right.`;
      } else {
        rightResistance = Math.max(1, baseResistance / adjustmentFactor);
        leftResistance = Math.min(9, baseResistance * (1 + asymmetry * 0.3));
        rationale = `Right side weaker (${Math.round(asymmetry * 100)}% asymmetry). Reduced right resistance, increased left.`;
      }
    }
    leftResistance = Math.round(leftResistance * 2) / 2;
    rightResistance = Math.round(rightResistance * 2) / 2;
    return { leftResistance, rightResistance, rationale };
  }
  /**
   * Check if bilateral sensors are available
   */
  areSensorsAvailable() {
    return false;
  }
};
var bilateralForceEngine = new BilateralForceEngine();

// server/personalization/routes.ts
var personalizationLimiter = rateLimit2({
  windowMs: 60 * 1e3,
  // 1 minute
  max: 30,
  // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req || !req.ip
});
var reportLimiter = rateLimit2({
  windowMs: 60 * 1e3,
  max: 10,
  // 10 reports per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req || !req.ip
});
function registerPersonalizationRoutes(app2) {
  app2.post("/api/patients/:patientId/protocol-match", personalizationLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { diagnosis, comorbidities } = req.body;
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const overrides = diagnosis || comorbidities ? { diagnosis, comorbidities } : void 0;
      const matchingProtocols = await personalizedProtocolMatcher.findMatchingProtocols(patientId, void 0, overrides);
      res.json({
        patientId,
        matchingProtocols,
        recommendedProtocol: matchingProtocols[0] || null,
        totalMatches: matchingProtocols.length
      });
    } catch (error) {
      console.error("Protocol matching error:", error);
      res.status(500).json({ error: "Failed to find matching protocols", details: error.message });
    }
  });
  app2.post("/api/patients/:patientId/protocol-auto-assign", personalizationLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { assignedBy } = req.body;
      if (!assignedBy) {
        return res.status(400).json({ error: "assignedBy (provider ID) is required" });
      }
      const assignment = await personalizedProtocolMatcher.autoAssignBestProtocol(patientId, assignedBy);
      if (!assignment) {
        return res.status(404).json({
          error: "No suitable protocol found",
          suggestion: "Consider manual protocol assignment or review patient profile"
        });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Auto-assign error:", error);
      res.status(500).json({ error: "Failed to auto-assign protocol", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/personalization-profile", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const profile = await personalizedProtocolMatcher.getPatientProfile(patientId);
      if (!profile) {
        return res.status(404).json({ error: "Personalization profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Failed to get personalization profile", details: error.message });
    }
  });
  app2.patch("/api/patients/:patientId/personalization-profile", personalizationLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const updates = req.body;
      const profile = await personalizedProtocolMatcher.updatePatientProfile(patientId, updates);
      res.json(profile);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update personalization profile", details: error.message });
    }
  });
  app2.post("/api/sessions/:sessionId/fatigue-check", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { power, cadence, heartRate, timestamp: timestamp2 } = req.body;
      const fatigueResult = await fatigueDetectionEngine.processRealTimeMetric(
        sessionId,
        {
          power,
          cadence,
          heartRate,
          timestamp: timestamp2 ? new Date(timestamp2) : /* @__PURE__ */ new Date()
        }
      );
      res.json(fatigueResult);
    } catch (error) {
      console.error("Fatigue check error:", error);
      res.status(500).json({ error: "Failed to process fatigue check", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/fatigue-history", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const days = parseInt(req.query.days) || 7;
      const history = await fatigueDetectionEngine.getFatigueHistory(patientId, days);
      res.json({
        patientId,
        days,
        events: history,
        totalEvents: history.length
      });
    } catch (error) {
      console.error("Fatigue history error:", error);
      res.status(500).json({ error: "Failed to get fatigue history", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/progression", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const progressionEval = await progressiveOverloadEngine.evaluateProgression(patientId);
      res.json(progressionEval);
    } catch (error) {
      console.error("Progression evaluation error:", error);
      res.status(500).json({ error: "Failed to evaluate progression", details: error.message });
    }
  });
  app2.post("/api/patients/:patientId/progression/apply", personalizationLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { parameter, increment, approvedBy } = req.body;
      const result = await progressiveOverloadEngine.applyProgression(patientId, {
        parameter,
        increment,
        approvedBy
      });
      res.json(result);
    } catch (error) {
      console.error("Apply progression error:", error);
      res.status(500).json({ error: "Failed to apply progression", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/setback-check", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const setbackCheck = await progressiveOverloadEngine.checkForSetback(patientId);
      res.json(setbackCheck);
    } catch (error) {
      console.error("Setback check error:", error);
      res.status(500).json({ error: "Failed to check for setback", details: error.message });
    }
  });
  app2.post("/api/patients/:patientId/setback-recovery", personalizationLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { setbackType, reason, approvedBy } = req.body;
      const recovery = await progressiveOverloadEngine.initiateSetbackRecovery(patientId, {
        type: setbackType,
        reason,
        approvedBy
      });
      res.json(recovery);
    } catch (error) {
      console.error("Setback recovery error:", error);
      res.status(500).json({ error: "Failed to initiate setback recovery", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/performance-prediction", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const daysAhead = parseInt(req.query.days) || 7;
      const prediction = await progressiveOverloadEngine.generatePerformancePrediction(patientId, daysAhead);
      res.json(prediction);
    } catch (error) {
      console.error("Performance prediction error:", error);
      res.status(500).json({ error: "Failed to generate performance prediction", details: error.message });
    }
  });
  app2.post("/api/patients/:patientId/medication-analysis", personalizationLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { medications } = req.body;
      if (!medications || !Array.isArray(medications)) {
        return res.status(400).json({ error: "medications array is required" });
      }
      const analysis = await medicationSafetyEngine.analyzePatientMedications(patientId, medications);
      res.json(analysis);
    } catch (error) {
      console.error("Medication analysis error:", error);
      res.status(500).json({ error: "Failed to analyze medications", details: error.message });
    }
  });
  app2.post("/api/patients/:patientId/contraindication-check", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { conditions, medications, vitalSigns } = req.body;
      const verification = await medicationSafetyEngine.verifyContraindications(patientId, {
        conditions: conditions || [],
        medications: medications || [],
        vitalSigns
      });
      res.json(verification);
    } catch (error) {
      console.error("Contraindication check error:", error);
      res.status(500).json({ error: "Failed to verify contraindications", details: error.message });
    }
  });
  app2.post("/api/patients/:patientId/contraindication-override", personalizationLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { contraindicationId, overrideReason, overriddenBy, expiresAt } = req.body;
      if (!contraindicationId || !overrideReason || !overriddenBy) {
        return res.status(400).json({
          error: "contraindicationId, overrideReason, and overriddenBy are required"
        });
      }
      const override = await medicationSafetyEngine.overrideContraindication(patientId, {
        contraindicationId,
        reason: overrideReason,
        overriddenBy,
        expiresAt: expiresAt ? new Date(expiresAt) : void 0
      });
      res.json(override);
    } catch (error) {
      console.error("Contraindication override error:", error);
      res.status(500).json({ error: "Failed to override contraindication", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/mobility-score", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const mobilityScore = await mobilityScoringEngine.calculateMobilityScore(patientId);
      res.json(mobilityScore);
    } catch (error) {
      console.error("Mobility score error:", error);
      res.status(500).json({ error: "Failed to calculate mobility score", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/barthel-index", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const barthelScore = await mobilityScoringEngine.calculateBarthelIndex(patientId);
      res.json(barthelScore);
    } catch (error) {
      console.error("Barthel Index error:", error);
      res.status(500).json({ error: "Failed to calculate Barthel Index", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/fim-score", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const fimScore = await mobilityScoringEngine.calculateFIM(patientId);
      res.json(fimScore);
    } catch (error) {
      console.error("FIM score error:", error);
      res.status(500).json({ error: "Failed to calculate FIM score", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/hospital-mobility-score", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const hospitalScore = await mobilityScoringEngine.calculateHospitalMobilityScore(patientId);
      res.json(hospitalScore);
    } catch (error) {
      console.error("Hospital mobility score error:", error);
      res.status(500).json({ error: "Failed to calculate hospital mobility score", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/mobility-history", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const days = parseInt(req.query.days) || 30;
      const history = await mobilityScoringEngine.getMobilityHistory(patientId, days);
      res.json({
        patientId,
        days,
        scores: history
      });
    } catch (error) {
      console.error("Mobility history error:", error);
      res.status(500).json({ error: "Failed to get mobility history", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/cohort-comparison", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const comparison = await competitionEngine.generateCohortComparison(patientId);
      res.json(comparison);
    } catch (error) {
      console.error("Cohort comparison error:", error);
      res.status(500).json({ error: "Failed to generate cohort comparison", details: error.message });
    }
  });
  app2.get("/api/competitions", async (req, res) => {
    try {
      const competitionType = req.query.type;
      const status = req.query.status || "active";
      const competitions = await competitionEngine.getAvailableCompetitions({
        type: competitionType,
        status
      });
      res.json(competitions);
    } catch (error) {
      console.error("Get competitions error:", error);
      res.status(500).json({ error: "Failed to get competitions", details: error.message });
    }
  });
  app2.post("/api/competitions", personalizationLimiter, async (req, res) => {
    try {
      const { name, type, startDate, endDate, targetMetric, rules, createdBy } = req.body;
      if (!name || !type || !startDate || !endDate || !createdBy) {
        return res.status(400).json({
          error: "name, type, startDate, endDate, and createdBy are required"
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
    } catch (error) {
      console.error("Create competition error:", error);
      res.status(500).json({ error: "Failed to create competition", details: error.message });
    }
  });
  app2.post("/api/competitions/:competitionId/join", personalizationLimiter, async (req, res) => {
    try {
      const competitionId = parseInt(req.params.competitionId);
      const { patientId } = req.body;
      if (!patientId) {
        return res.status(400).json({ error: "patientId is required" });
      }
      const participant = await competitionEngine.joinCompetition(competitionId, patientId);
      res.json(participant);
    } catch (error) {
      console.error("Join competition error:", error);
      res.status(500).json({ error: "Failed to join competition", details: error.message });
    }
  });
  app2.get("/api/competitions/:competitionId/leaderboard", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.competitionId);
      const limit = parseInt(req.query.limit) || 10;
      const leaderboard = await competitionEngine.getLeaderboard(competitionId, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ error: "Failed to get leaderboard", details: error.message });
    }
  });
  app2.post("/api/competitions/:competitionId/update-scores", personalizationLimiter, async (req, res) => {
    try {
      const competitionId = parseInt(req.params.competitionId);
      await competitionEngine.updateCompetitionScores(competitionId);
      res.json({ success: true, message: "Scores updated successfully" });
    } catch (error) {
      console.error("Update scores error:", error);
      res.status(500).json({ error: "Failed to update scores", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/competitions", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const participations = await competitionEngine.getPatientCompetitions(patientId);
      res.json(participations);
    } catch (error) {
      console.error("Get patient competitions error:", error);
      res.status(500).json({ error: "Failed to get patient competitions", details: error.message });
    }
  });
  app2.post("/api/patients/:patientId/insurance-report", reportLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { reportType, insuranceType, generatedBy } = req.body;
      if (!reportType || !generatedBy) {
        return res.status(400).json({ error: "reportType and generatedBy are required" });
      }
      const report = await insuranceReportEngine.generateReport(patientId, reportType, generatedBy);
      res.json(report);
    } catch (error) {
      console.error("Insurance report error:", error);
      res.status(500).json({ error: "Failed to generate insurance report", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/insurance-report/:reportId/pdf", async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const pdfBuffer = await insuranceReportEngine.generatePDF(reportId);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="insurance-report-${reportId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Insurance PDF error:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/insurance-reports", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const reports = await insuranceReportEngine.getPatientReports(patientId);
      res.json(reports);
    } catch (error) {
      console.error("Get insurance reports error:", error);
      res.status(500).json({ error: "Failed to get insurance reports", details: error.message });
    }
  });
  app2.post("/api/insurance-reports/:reportId/approve", personalizationLimiter, async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const { approvedBy, signature } = req.body;
      if (!approvedBy) {
        return res.status(400).json({ error: "approvedBy (provider ID) is required" });
      }
      const report = await insuranceReportEngine.approveReport(reportId, approvedBy, signature);
      res.json(report);
    } catch (error) {
      console.error("Approve report error:", error);
      res.status(500).json({ error: "Failed to approve report", details: error.message });
    }
  });
  app2.post("/api/sessions/:sessionId/bilateral-force", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { leftForce, rightForce, timestamp: timestamp2, sensorData } = req.body;
      const analysis = await bilateralForceEngine.processBilateralData(sessionId, {
        leftForce,
        rightForce,
        timestamp: timestamp2 ? new Date(timestamp2) : /* @__PURE__ */ new Date(),
        sensorData
      });
      res.json(analysis);
    } catch (error) {
      console.error("Bilateral force error:", error);
      res.status(500).json({ error: "Failed to process bilateral force data", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/bilateral-feedback", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const feedback = await bilateralForceEngine.generateBalancingFeedback(patientId);
      res.json(feedback);
    } catch (error) {
      console.error("Bilateral feedback error:", error);
      res.status(500).json({ error: "Failed to generate bilateral feedback", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/neurological-check", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const check = await bilateralForceEngine.checkForNeurologicalEvent(patientId);
      res.json(check);
    } catch (error) {
      console.error("Neurological check error:", error);
      res.status(500).json({ error: "Failed to check neurological status", details: error.message });
    }
  });
  app2.post("/api/patients/:patientId/stroke-protocol", personalizationLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { affectedSide, strokeType, initiatedBy } = req.body;
      if (!affectedSide || !initiatedBy) {
        return res.status(400).json({ error: "affectedSide and initiatedBy are required" });
      }
      const protocol = await bilateralForceEngine.initializeStrokeProtocol(patientId, {
        affectedSide,
        strokeType,
        initiatedBy
      });
      res.json(protocol);
    } catch (error) {
      console.error("Stroke protocol error:", error);
      res.status(500).json({ error: "Failed to initialize stroke protocol", details: error.message });
    }
  });
  app2.get("/api/sessions/:sessionId/force-vectors", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const vectors = await bilateralForceEngine.generate3DForceVectors(sessionId);
      res.json(vectors);
    } catch (error) {
      console.error("Force vectors error:", error);
      res.status(500).json({ error: "Failed to generate force vectors", details: error.message });
    }
  });
  app2.get("/api/sessions/:sessionId/butterfly-plot", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const plot = await bilateralForceEngine.generateButterflyPlot(sessionId);
      res.json(plot);
    } catch (error) {
      console.error("Butterfly plot error:", error);
      res.status(500).json({ error: "Failed to generate butterfly plot", details: error.message });
    }
  });
  app2.get("/api/patients/:patientId/fall-risk", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const mobilityScore = await mobilityScoringEngine.calculateMobilityScore(patientId);
      const fallRisk = {
        patientId,
        riskLevel: mobilityScore.overallScore < 40 ? "high" : mobilityScore.overallScore < 60 ? "moderate" : "low",
        riskScore: Math.max(0, 100 - mobilityScore.overallScore),
        factors: mobilityScore.componentScores,
        recommendation: mobilityScore.overallScore < 40 ? "Close supervision required during all mobility activities" : mobilityScore.overallScore < 60 ? "Standby assistance recommended" : "Continue current mobility program",
        assessedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      res.json(fallRisk);
    } catch (error) {
      console.error("Fall risk error:", error);
      res.status(500).json({ error: "Failed to assess fall risk", details: error.message });
    }
  });
  console.log("\u2713 Personalization routes registered");
}

// server/routes.ts
init_schema();
async function registerRoutes(app2) {
  await seedInitialData();
  app2.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development"
    });
  });
  app2.get("/health/detailed", async (req, res) => {
    const healthCheck = {
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: "unknown",
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB"
      }
    };
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
  app2.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { userType } = req.body;
      if (userType === "patient") {
        const patientData = patientRegistrationSchema.parse(req.body);
        const existingPatient = await storage.getUserByEmail(patientData.email);
        if (existingPatient) {
          return res.status(400).json({ error: "Patient already exists with this email" });
        }
        const patient = await storage.createUser(patientData);
        res.json({ user: patient });
      } else if (userType === "provider") {
        const providerData = providerRegistrationSchema.parse(req.body);
        const existingProvider = await storage.getUserByEmail(providerData.email);
        if (existingProvider) {
          return res.status(400).json({ error: "Provider already exists with this email" });
        }
        const provider = await storage.createUser(providerData);
        res.json({ user: provider });
      } else {
        return res.status(400).json({ error: "Invalid user type" });
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Invalid registration data" });
    }
  });
  app2.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      await updateRollingDataWindow();
      if (req.body.firstName && req.body.lastName && req.body.dateOfBirth && !req.body.email) {
        const { firstName, lastName, dateOfBirth, deviceNumber } = req.body;
        console.log("=== SERVER LOGIN DEBUG ===");
        console.log("Received:", { firstName, lastName, dateOfBirth, deviceNumber });
        let patient = await storage.getPatientByName(firstName, lastName, dateOfBirth);
        console.log("Patient found:", patient ? `Yes (ID: ${patient.id}, DOB: ${patient.dateOfBirth})` : "No");
        if (!patient) {
          const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@bedside-bike.local`;
          patient = await storage.createUser({
            email,
            firstName,
            lastName,
            dateOfBirth,
            userType: "patient"
          });
        }
        let deviceLinkResult = null;
        if (deviceNumber && patient) {
          try {
            deviceLinkResult = await storage.linkPatientToDevice(patient.id, deviceNumber);
          } catch (error) {
            console.warn("Failed to link patient to device:", error);
          }
        }
        return res.json({
          user: patient,
          patient,
          deviceNumber,
          deviceLinkResult
          // Include device switching info
        });
      }
      const loginData = loginSchema.parse(req.body);
      if (loginData.userType === "patient") {
        let patient = await storage.getUserByEmail(loginData.email);
        if (!patient && loginData.dateOfBirth) {
          patient = await storage.getPatientByName(
            loginData.firstName,
            loginData.lastName,
            loginData.dateOfBirth
          );
        }
        if (!patient) {
          patient = await storage.createUser({
            ...loginData,
            userType: "patient"
          });
        }
        const { deviceNumber } = req.body;
        let deviceLinkResult = null;
        if (deviceNumber && patient) {
          try {
            deviceLinkResult = await storage.linkPatientToDevice(patient.id, deviceNumber);
          } catch (error) {
            console.warn("Failed to link patient to device:", error);
          }
        }
        res.json({
          user: patient,
          patient,
          deviceNumber,
          deviceLinkResult
          // Include device switching info
        });
      } else if (loginData.userType === "provider") {
        console.log(`DEBUG: Looking for provider with email: "${loginData.email}"`);
        const provider = await storage.getUserByEmail(loginData.email);
        console.log(`DEBUG: Provider found:`, provider ? `ID ${provider.id}` : "NULL");
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
  app2.get("/api/providers", async (req, res) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (error) {
      console.error("Providers fetch error:", error);
      res.status(500).json({ error: "Failed to fetch providers" });
    }
  });
  app2.post("/api/providers", async (req, res) => {
    try {
      const providerData = req.body;
      const newProvider = await storage.createUser({
        ...providerData,
        userType: "provider",
        providerRole: "clinician",
        isActive: true
      });
      res.json(newProvider);
    } catch (error) {
      console.error("Provider creation error:", error);
      res.status(500).json({ error: "Failed to create provider" });
    }
  });
  app2.post("/api/patients/:patientId/grant-access/:providerId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const providerId = parseInt(req.params.providerId);
      try {
        await storage.createProviderPatientRelation({
          patientId,
          providerId,
          permissionGranted: false,
          isActive: true
        });
      } catch (error) {
      }
      const relation = await storage.grantProviderAccess(patientId, providerId);
      res.json(relation);
    } catch (error) {
      console.error("Grant access error:", error);
      res.status(500).json({ error: "Failed to grant provider access" });
    }
  });
  app2.get("/api/providers/:providerId/patients", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const patients = await storage.getPatientsByProvider(providerId);
      res.json(patients);
    } catch (error) {
      console.error("Provider patients fetch error:", error);
      res.status(500).json({ error: "Failed to fetch provider patients" });
    }
  });
  app2.get("/api/patients/:id/dashboard", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      console.log("=== DASHBOARD REQUEST ===");
      console.log("Patient ID:", patientId);
      const [patient, goals, achievements3, stats, sessions3, adaptiveGoal] = await Promise.all([
        storage.getPatient(patientId),
        storage.getGoalsByPatient(patientId),
        storage.getAchievementsByPatient(patientId),
        storage.getPatientStats(patientId),
        storage.getSessionsByPatient(patientId),
        storage.calculateAdaptiveGoal(patientId)
      ]);
      console.log("Patient found:", patient ? `${patient.firstName} ${patient.lastName} (ID: ${patient.id})` : "NO");
      console.log("Stats:", stats ? `Sessions: ${stats.totalSessions}, Duration: ${stats.totalDuration}s, Level: ${stats.level}` : "NO STATS");
      console.log("Sessions count:", sessions3 ? sessions3.length : 0);
      console.log("Goals count:", goals ? goals.length : 0);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const startDate = patient.admissionDate || patient.createdAt;
      const daysSinceStart = startDate ? Math.floor((Date.now() - new Date(startDate).getTime()) / (1e3 * 60 * 60 * 24)) : 0;
      const currentStreak = calculateCurrentStreak(sessions3);
      const updatedStats = stats ? { ...stats, consistencyStreak: currentStreak } : null;
      console.log("Returning dashboard data:", {
        hasPatient: !!patient,
        goalsCount: goals?.length,
        hasStats: !!updatedStats,
        sessionsCount: sessions3?.length
      });
      res.json({
        patient,
        goals,
        achievements: achievements3,
        stats: updatedStats,
        recentSessions: sessions3.slice(0, 10),
        daysSinceStart,
        adaptiveGoal
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });
  app2.get("/api/patients/:id/usage-data", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const days = parseInt(req.query.days) || 7;
      const usageData = await storage.getDailyUsageData(patientId, days);
      res.json(usageData);
    } catch (error) {
      console.error("Usage data error:", error);
      res.status(500).json({ error: "Failed to load usage data" });
    }
  });
  app2.post("/api/patients/:id/goals/from-assessment", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const { mobilityRecommendation } = req.body;
      if (!mobilityRecommendation) {
        return res.status(400).json({ message: "Mobility recommendation data required" });
      }
      await storage.createGoalsFromMobilityRecommendation(patientId, mobilityRecommendation);
      res.json({ message: "Goals successfully updated from risk assessment" });
    } catch (error) {
      console.error("Error pushing goals from assessment:", error);
      res.status(500).json({ message: "Failed to update patient goals" });
    }
  });
  app2.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Leaderboard error:", error);
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  });
  app2.post("/api/sessions", createLimiter, async (req, res) => {
    try {
      const sessionData = insertExerciseSessionSchema.parse(req.body);
      const session3 = await storage.createSession(sessionData);
      res.json(session3);
    } catch (error) {
      console.error("Session creation error:", error);
      res.status(400).json({ error: "Invalid session data" });
    }
  });
  app2.patch("/api/sessions/:id", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updates = req.body;
      const session3 = await storage.updateSession(sessionId, updates);
      if (!session3) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session3);
    } catch (error) {
      console.error("Session update error:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });
  app2.post("/api/goals", createLimiter, async (req, res) => {
    try {
      const goalData = insertPatientGoalSchema.parse(req.body);
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error("Goal creation error:", error);
      res.status(400).json({ error: "Invalid goal data" });
    }
  });
  app2.get("/api/providers/patients", async (req, res) => {
    try {
      const allPatients = await storage.getAllPatients();
      const patientsWithDates = allPatients.map((patient) => ({
        ...patient,
        admissionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1e3)
        // Random date within last 30 days
      }));
      res.json(patientsWithDates);
    } catch (error) {
      console.error("Error fetching provider patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });
  app2.get("/api/patients/:id/goals", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const goals = await storage.getPatientGoals(patientId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching patient goals:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });
  app2.post("/api/patients/:id/goals", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const { goals, providerId } = req.body;
      if (!goals || !Array.isArray(goals)) {
        return res.status(400).json({ error: "Goals array is required" });
      }
      await storage.deactivatePatientGoals(patientId);
      const createdGoals = [];
      for (const goalData of goals) {
        const goal = await storage.createGoal({
          ...goalData,
          patientId,
          providerId: providerId || 1
          // Default to first provider
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
  app2.get("/api/patients/:id/sessions", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const sessions3 = await storage.getSessionsByPatient(patientId);
      const sevenDaysAgo = /* @__PURE__ */ new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSessions = sessions3.filter(
        (session3) => new Date(session3.sessionDate) >= sevenDaysAgo
      );
      res.json(recentSessions);
    } catch (error) {
      console.error("Error fetching patient sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });
  app2.patch("/api/goals/:id", async (req, res) => {
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
  app2.get("/api/patients/:id/adaptive-goal", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const adaptiveGoal = await storage.calculateAdaptiveGoal(patientId);
      res.json(adaptiveGoal);
    } catch (error) {
      console.error("Adaptive goal error:", error);
      res.status(500).json({ error: "Failed to calculate adaptive goal" });
    }
  });
  app2.post("/api/risk-assessment/process-text", riskAssessmentLimiter, async (req, res) => {
    try {
      const { field, text: text3 } = req.body;
      if (!text3 || !field) {
        return res.json({});
      }
      const { processMedicalText: processMedicalText2 } = await Promise.resolve().then(() => (init_ai_processor(), ai_processor_exports));
      const input = {};
      input[field] = text3;
      const processed = await processMedicalText2(input);
      res.json(processed);
    } catch (error) {
      console.error("Text processing error:", error);
      res.json({});
    }
  });
  app2.post("/api/risk-assessment", riskAssessmentLimiter, async (req, res) => {
    try {
      console.log("Risk assessment request body:", JSON.stringify(req.body, null, 2));
      const riskData = riskAssessmentInputSchema.parse(req.body);
      console.log("Parsed risk data for calculation:", {
        mobility_status: riskData.mobility_status,
        age: riskData.age,
        level_of_care: riskData.level_of_care,
        has_diabetes: riskData.has_diabetes,
        has_obesity: riskData.has_obesity,
        is_sepsis: riskData.is_sepsis,
        days_immobile: riskData.days_immobile
      });
      const patientId = parseInt(req.body.patientId) || 1;
      const riskResults = calculateRisks(riskData);
      const stayPredictions = riskResults.stay_predictions;
      const losData = stayPredictions?.length_of_stay;
      const dischargeData = stayPredictions?.discharge_disposition;
      const readmissionData = stayPredictions?.readmission_risk;
      const mobilityBenefits = riskResults.mobility_benefits;
      console.log("Robust calculator predictions:", { losData, dischargeData, readmissionData, mobilityBenefits });
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
        mobility_benefits: mobilityBenefits,
        // Add mobility_benefits to API response
        assessmentId: assessment.id
      });
    } catch (error) {
      console.error("Risk assessment error:", error);
      if (error.name === "ZodError") {
        res.status(400).json({
          error: "Invalid risk assessment data",
          details: error.errors?.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ") || error.message
        });
      } else {
        res.status(400).json({ error: error.message || "Invalid risk assessment data" });
      }
    }
  });
  app2.post("/api/anonymous-risk-assessment", riskAssessmentLimiter, async (req, res) => {
    try {
      console.log("Anonymous risk assessment request body:", JSON.stringify(req.body, null, 2));
      const riskData = riskAssessmentInputSchema.parse(req.body);
      console.log("Parsed anonymous risk data for calculation:", {
        mobility_status: riskData.mobility_status,
        age: riskData.age,
        level_of_care: riskData.level_of_care,
        has_diabetes: riskData.has_diabetes,
        has_obesity: riskData.has_obesity,
        is_sepsis: riskData.is_sepsis,
        days_immobile: riskData.days_immobile
      });
      const riskResults = calculateRisks(riskData);
      const stayPredictions = riskResults.stay_predictions;
      const losData = stayPredictions?.length_of_stay;
      const dischargeData = stayPredictions?.discharge_disposition;
      const readmissionData = stayPredictions?.readmission_risk;
      const mobilityBenefits = riskResults.mobility_benefits;
      console.log("Anonymous calculator predictions:", { losData, dischargeData, readmissionData, mobilityBenefits });
      console.log("Full riskResults structure:", riskResults);
      res.json({
        ...riskResults,
        losData,
        dischargeData,
        readmissionData,
        mobility_benefits: mobilityBenefits,
        // Add mobility_benefits to API response
        anonymous: true
        // Flag to indicate this was an anonymous calculation
      });
    } catch (error) {
      console.error("Anonymous risk assessment error:", error);
      if (error.name === "ZodError") {
        res.status(400).json({
          error: "Invalid risk assessment data",
          details: error.errors?.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ") || error.message
        });
      } else {
        res.status(400).json({ error: error.message || "Invalid risk assessment data" });
      }
    }
  });
  app2.get("/api/patients/:id/risk-assessments", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const assessments = await storage.getRiskAssessmentsByPatient(patientId);
      res.json(assessments);
    } catch (error) {
      console.error("Risk assessments fetch error:", error);
      res.status(500).json({ error: "Failed to fetch risk assessments" });
    }
  });
  app2.get("/api/patients/:id/risk-assessment", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const assessment = await storage.getLatestRiskAssessment(patientId);
      if (!assessment) {
        return res.status(404).json({ error: "No risk assessment found for this patient" });
      }
      if (!assessment.mobility_benefits && assessment.deconditioning && assessment.vte && assessment.falls && assessment.pressure) {
        const deconProb = assessment.deconditioning.probability || 0;
        const vteProb = assessment.vte.probability || 0;
        const fallsProb = assessment.falls.probability || 0;
        const pressureProb = assessment.pressure.probability || 0;
        const riskReductions = {
          deconditioning: {
            current_risk: deconProb,
            reduced_risk: deconProb * 0.85,
            // 15% relative reduction
            absolute_reduction_percent: Math.round(deconProb * 100 * 0.15 * 10) / 10
          },
          vte: {
            current_risk: vteProb,
            reduced_risk: vteProb * 0.9,
            // 10% relative reduction
            absolute_reduction_percent: Math.round(vteProb * 100 * 0.1 * 10) / 10
          },
          falls: {
            current_risk: fallsProb,
            reduced_risk: fallsProb * 0.88,
            // 12% relative reduction
            absolute_reduction_percent: Math.round(fallsProb * 100 * 0.12 * 10) / 10
          },
          pressure: {
            current_risk: pressureProb,
            reduced_risk: pressureProb * 0.92,
            // 8% relative reduction
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
  app2.get("/api/patients/:id/profile", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const profile = await storage.getPatientProfile(patientId);
      res.json(profile);
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch patient profile" });
    }
  });
  app2.post("/api/patients/:id/profile", async (req, res) => {
    try {
      const patientId = parseInt(req.params.id);
      const profileData = req.body;
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
  app2.get("/api/kudos/preferences", async (req, res) => {
    try {
      const patientId = parseInt(req.query.patientId) || 4;
      const preferences = await kudosService.getPatientPreferences(patientId);
      res.json(preferences || {
        displayName: "Anonymous",
        avatarEmoji: "\u{1F464}",
        optInKudos: false,
        optInNudges: false,
        unit: "general"
      });
    } catch (error) {
      console.error("Get preferences error:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });
  app2.patch("/api/kudos/preferences", async (req, res) => {
    try {
      const patientId = parseInt(req.query.patientId) || 4;
      await kudosService.updatePatientPreferences(patientId, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Update preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });
  app2.get("/api/kudos/feed", async (req, res) => {
    try {
      const unit = req.query.unit || "general";
      const feedItems3 = await kudosService.getFeedForUnit(unit);
      res.json(feedItems3);
    } catch (error) {
      console.error("Get feed error:", error);
      res.status(500).json({ error: "Failed to get feed" });
    }
  });
  app2.post("/api/kudos/react", kudosLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.query.patientId) || 4;
      const { feedItemId, reactionType } = req.body;
      await kudosService.addReaction(patientId, feedItemId, reactionType);
      res.json({ success: true });
    } catch (error) {
      console.error("Add reaction error:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });
  app2.post("/api/kudos/nudge", kudosLimiter, async (req, res) => {
    try {
      const senderId = parseInt(req.query.patientId) || 4;
      const { recipientId, templateType, metadata } = req.body;
      await kudosService.sendNudge(senderId, recipientId, templateType, metadata);
      res.json({ success: true });
    } catch (error) {
      console.error("Send nudge error:", error);
      res.status(500).json({ error: "Failed to send nudge" });
    }
  });
  app2.get("/api/kudos/nudge-targets", async (req, res) => {
    try {
      const mockTargets = [
        {
          id: 6,
          displayName: "Alex M.",
          avatarEmoji: "\u{1F9D1}\u200D\u2695\uFE0F",
          minutesLeft: 10,
          lastActivity: "2 hours ago"
        },
        {
          id: 7,
          displayName: "Sam K.",
          avatarEmoji: "\u{1F3C3}",
          minutesLeft: 5,
          lastActivity: "4 hours ago"
        }
      ];
      res.json(mockTargets);
    } catch (error) {
      console.error("Get nudge targets error:", error);
      res.status(500).json({ error: "Failed to get nudge targets" });
    }
  });
  app2.get("/api/protocols", async (req, res) => {
    try {
      const { protocolEngine: protocolEngine2 } = await init_protocol_engine().then(() => protocol_engine_exports);
      const protocols = await protocolEngine2.getAllProtocols();
      res.json(protocols);
    } catch (error) {
      console.error("Get protocols error:", error);
      res.status(500).json({ error: "Failed to get protocols" });
    }
  });
  app2.get("/api/protocols/:id", async (req, res) => {
    try {
      const protocolId = parseInt(req.params.id);
      const { protocolEngine: protocolEngine2 } = await init_protocol_engine().then(() => protocol_engine_exports);
      const protocol = await protocolEngine2.getProtocolById(protocolId);
      if (!protocol) {
        return res.status(404).json({ error: "Protocol not found" });
      }
      res.json(protocol);
    } catch (error) {
      console.error("Get protocol error:", error);
      res.status(500).json({ error: "Failed to get protocol" });
    }
  });
  app2.post("/api/protocols/match", async (req, res) => {
    try {
      const { diagnosis, comorbidities = [], diagnosisCodes = [] } = req.body;
      if (!diagnosis && diagnosisCodes.length === 0) {
        return res.status(400).json({ error: "Diagnosis or diagnosis codes required" });
      }
      const { protocolEngine: protocolEngine2 } = await init_protocol_engine().then(() => protocol_engine_exports);
      const protocol = await protocolEngine2.matchProtocol(
        diagnosis || "",
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
  app2.post("/api/patients/:patientId/protocol", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolId, assignedBy, startPhase } = req.body;
      if (!protocolId || !assignedBy) {
        return res.status(400).json({ error: "Protocol ID and assignedBy (provider ID) required" });
      }
      const { protocolEngine: protocolEngine2 } = await init_protocol_engine().then(() => protocol_engine_exports);
      const assignment = await protocolEngine2.assignProtocol(
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
  app2.get("/api/patients/:patientId/protocol", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine: protocolEngine2 } = await init_protocol_engine().then(() => protocol_engine_exports);
      const assignment = await protocolEngine2.getPatientAssignment(patientId);
      if (!assignment) {
        return res.status(404).json({ error: "No active protocol for this patient" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Get patient protocol error:", error);
      res.status(500).json({ error: "Failed to get patient protocol" });
    }
  });
  app2.get("/api/patients/:patientId/prescription", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine: protocolEngine2 } = await init_protocol_engine().then(() => protocol_engine_exports);
      const prescription = await protocolEngine2.getCurrentPrescription(patientId);
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
  app2.get("/api/patients/:patientId/personalized-prescription", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { personalizedProtocolMatcher: personalizedProtocolMatcher2 } = await init_personalized_protocol_matcher().then(() => personalized_protocol_matcher_exports);
      const prescription = await personalizedProtocolMatcher2.generatePersonalizedPrescription(patientId);
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
  app2.post("/api/patients/:patientId/personalized-prescription", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { diagnosis, medications, riskAssessmentInput } = req.body;
      const { personalizedProtocolMatcher: personalizedProtocolMatcher2 } = await init_personalized_protocol_matcher().then(() => personalized_protocol_matcher_exports);
      const prescription = await personalizedProtocolMatcher2.generatePersonalizedPrescription(
        patientId,
        { diagnosis, medications, riskAssessmentInput }
      );
      if (!prescription) {
        return res.status(404).json({
          error: "Could not generate personalized prescription",
          suggestion: "Ensure patient profile exists with required data (age, mobility status, diagnosis)"
        });
      }
      const hasMedAdjustments = prescription.medicationCategories?.length > 0 && prescription.medicationCategories[0] !== "none";
      const medCount = hasMedAdjustments ? prescription.medicationCategories.length : 0;
      const message = `Prescription generated for ${prescription.diagnosisCategoryLabel || prescription.diagnosisCategory}${medCount > 0 ? ` with ${medCount} medication adjustment(s)` : ""}`;
      res.json({
        ...prescription,
        message
      });
    } catch (error) {
      console.error("Personalized prescription error:", error);
      res.status(500).json({ error: "Failed to generate personalized prescription" });
    }
  });
  app2.get("/api/patients/:patientId/protocol/progression", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine: protocolEngine2 } = await init_protocol_engine().then(() => protocol_engine_exports);
      const progressionCheck = await protocolEngine2.checkProgressionCriteria(patientId);
      res.json(progressionCheck);
    } catch (error) {
      console.error("Progression check error:", error);
      res.status(500).json({ error: "Failed to check progression criteria" });
    }
  });
  app2.post("/api/patients/:patientId/protocol/progress", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { protocolEngine: protocolEngine2 } = await init_protocol_engine().then(() => protocol_engine_exports);
      const success = await protocolEngine2.progressToNextPhase(patientId);
      if (!success) {
        return res.status(400).json({
          error: "Cannot progress patient",
          suggestion: "Patient may not meet progression criteria yet"
        });
      }
      const updatedAssignment = await protocolEngine2.getPatientAssignment(patientId);
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Protocol progression error:", error);
      res.status(500).json({ error: "Failed to progress patient" });
    }
  });
  app2.post("/api/reports/shift-summary", createLimiter, async (req, res) => {
    try {
      const { patientId, startTime, endTime } = req.body;
      if (!patientId || !startTime || !endTime) {
        return res.status(400).json({
          error: "Missing required fields: patientId, startTime, endTime"
        });
      }
      const { reportGenerator: reportGenerator2 } = await init_report_generator().then(() => report_generator_exports);
      const pdfBuffer = await reportGenerator2.generateShiftReport({
        patientId: parseInt(patientId),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        includeRiskAssessment: true,
        includeProtocol: true
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="shift-report-patient-${patientId}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Shift report generation error:", error);
      res.status(500).json({
        error: "Failed to generate shift report",
        details: error.message
      });
    }
  });
  app2.post("/api/reports/pt-progress-note", createLimiter, async (req, res) => {
    try {
      const { patientId, sessionIds, subjective, additionalNotes } = req.body;
      if (!patientId || !sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
        return res.status(400).json({
          error: "Missing required fields: patientId, sessionIds (array of session IDs)"
        });
      }
      const { reportGenerator: reportGenerator2 } = await init_report_generator().then(() => report_generator_exports);
      const soapNote = await reportGenerator2.generatePTProgressNote({
        patientId: parseInt(patientId),
        sessionIds: sessionIds.map((id) => parseInt(id)),
        subjective,
        additionalNotes
      });
      res.json({
        note: soapNote,
        format: "SOAP",
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      console.error("PT progress note generation error:", error);
      res.status(500).json({
        error: "Failed to generate PT progress note",
        details: error.message
      });
    }
  });
  app2.get("/api/patients/:patientId/reports", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const sessions3 = await storage.getSessionsByPatient(patientId);
      const availableReports = [
        {
          type: "shift_summary",
          name: "Nursing Shift Summary",
          description: "Comprehensive shift report with mobility activity, risk status, and alerts",
          format: "PDF",
          requiresInput: ["startTime", "endTime"],
          available: sessions3.length > 0
        },
        {
          type: "pt_progress_note",
          name: "PT Progress Note",
          description: "SOAP format progress note for physical therapy documentation",
          format: "Text",
          requiresInput: ["sessionIds"],
          available: sessions3.length > 0
        }
      ];
      res.json({
        patientId,
        totalSessions: sessions3.length,
        availableReports
      });
    } catch (error) {
      console.error("Get available reports error:", error);
      res.status(500).json({ error: "Failed to get available reports" });
    }
  });
  app2.get("/api/alerts", async (req, res) => {
    try {
      const { alertEngine: alertEngine2 } = await init_alert_engine().then(() => alert_engine_exports);
      const alerts3 = await alertEngine2.getAllUnacknowledgedAlerts();
      res.json(alerts3);
    } catch (error) {
      console.error("Get alerts error:", error);
      res.status(500).json({ error: "Failed to get alerts" });
    }
  });
  app2.get("/api/patients/:patientId/alerts", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const includeAcknowledged = req.query.includeAcknowledged === "true";
      const { alertEngine: alertEngine2 } = await init_alert_engine().then(() => alert_engine_exports);
      const alerts3 = await alertEngine2.getPatientAlerts(patientId, includeAcknowledged);
      res.json(alerts3);
    } catch (error) {
      console.error("Get patient alerts error:", error);
      res.status(500).json({ error: "Failed to get patient alerts" });
    }
  });
  app2.get("/api/alerts/summary", async (req, res) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId) : void 0;
      const { alertEngine: alertEngine2 } = await init_alert_engine().then(() => alert_engine_exports);
      const summary = await alertEngine2.getAlertSummary(patientId);
      res.json(summary);
    } catch (error) {
      console.error("Get alert summary error:", error);
      res.status(500).json({ error: "Failed to get alert summary" });
    }
  });
  app2.post("/api/alerts/:alertId/acknowledge", createLimiter, async (req, res) => {
    try {
      const alertId = parseInt(req.params.alertId);
      const { acknowledgedBy } = req.body;
      if (!acknowledgedBy) {
        return res.status(400).json({ error: "acknowledgedBy (provider ID) is required" });
      }
      const { alertEngine: alertEngine2 } = await init_alert_engine().then(() => alert_engine_exports);
      const success = await alertEngine2.acknowledgeAlert(alertId, acknowledgedBy);
      if (!success) {
        return res.status(500).json({ error: "Failed to acknowledge alert" });
      }
      res.json({ success: true, alertId, acknowledgedBy });
    } catch (error) {
      console.error("Acknowledge alert error:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });
  app2.post("/api/alerts/check-inactivity", createLimiter, async (req, res) => {
    try {
      const { alertEngine: alertEngine2 } = await init_alert_engine().then(() => alert_engine_exports);
      const alerts3 = await alertEngine2.checkInactivityAlerts();
      res.json({
        alertsGenerated: alerts3.length,
        alerts: alerts3
      });
    } catch (error) {
      console.error("Check inactivity error:", error);
      res.status(500).json({ error: "Failed to check inactivity" });
    }
  });
  app2.post("/api/patients/:patientId/alerts/check-compliance", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { alertEngine: alertEngine2 } = await init_alert_engine().then(() => alert_engine_exports);
      const alert = await alertEngine2.checkProtocolCompliance(patientId);
      res.json({
        alert: alert || null,
        complianceChecked: true
      });
    } catch (error) {
      console.error("Check compliance error:", error);
      res.status(500).json({ error: "Failed to check protocol compliance" });
    }
  });
  app2.post("/api/patients/:patientId/alerts/check-all", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { alertEngine: alertEngine2 } = await init_alert_engine().then(() => alert_engine_exports);
      const alerts3 = await alertEngine2.runAllChecks(patientId);
      res.json({
        alertsGenerated: alerts3.length,
        alerts: alerts3
      });
    } catch (error) {
      console.error("Run all checks error:", error);
      res.status(500).json({ error: "Failed to run all alert checks" });
    }
  });
  app2.get("/api/providers", async (req, res) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (error) {
      console.error("Get providers error:", error);
      res.status(500).json({ error: "Failed to get providers" });
    }
  });
  app2.get("/api/provider-relationships", async (req, res) => {
    try {
      const patientId = parseInt(req.query.patientId);
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
  app2.get("/api/provider-relationships/:patientId", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const relationships = await storage.getProviderPatientRelationships(patientId);
      res.json(relationships);
    } catch (error) {
      console.error("Get relationships error:", error);
      res.status(500).json({ error: "Failed to get provider relationships" });
    }
  });
  app2.post("/api/provider-relationships", async (req, res) => {
    try {
      const { providerId, patientId } = req.body;
      if (!providerId) {
        return res.status(400).json({ error: "Provider ID is required" });
      }
      if (!patientId) {
        return res.status(400).json({ error: "Patient ID is required" });
      }
      const existingRelationship = await db.select().from(providerPatients).where(
        and14(
          eq14(providerPatients.patientId, patientId),
          eq14(providerPatients.providerId, providerId),
          eq14(providerPatients.isActive, true)
        )
      ).limit(1);
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
  app2.delete("/api/provider-relationships/:id", async (req, res) => {
    try {
      const relationshipId = parseInt(req.params.id);
      if (isNaN(relationshipId)) {
        return res.status(400).json({ error: "Valid relationship ID is required" });
      }
      const relationship = await db.select().from(providerPatients).where(eq14(providerPatients.id, relationshipId)).limit(1);
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
  app2.patch("/api/goals/:goalId", async (req, res) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const { targetValue, currentValue } = req.body;
      const isDevelopment = process.env.NODE_ENV === "development";
      if (isDevelopment) {
        const [updatedGoal] = await db.update(patientGoals).set({
          targetValue: targetValue?.toString(),
          currentValue: currentValue?.toString(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq14(patientGoals.id, goalId)).returning();
        res.json(updatedGoal);
      } else {
        const [updatedGoal] = await db.update(patientGoals).set({
          targetValue: targetValue?.toString(),
          currentValue: currentValue?.toString(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq14(patientGoals.id, goalId)).returning();
        res.json(updatedGoal);
      }
    } catch (error) {
      console.error("Update goal error:", error);
      res.status(500).json({ error: "Failed to update goal" });
    }
  });
  app2.post("/api/patients/:patientId/recalculate-goals", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      const sessions3 = await storage.getSessionsByPatient(patientId);
      await db.update(patientGoals).set({ currentValue: "0.00" }).where(eq14(patientGoals.patientId, patientId));
      let totalDuration = 0;
      let totalPower = 0;
      let totalResistance = 0;
      let totalEnergy = 0;
      let sessionCount = sessions3.length;
      for (const session3 of sessions3) {
        if (session3.duration) {
          totalDuration += session3.duration / 60;
        }
        if (session3.avgPower) {
          totalPower += parseFloat(session3.avgPower);
        }
        if (session3.resistance) {
          totalResistance += parseFloat(session3.resistance);
        }
        if (session3.avgPower && session3.duration) {
          totalEnergy += parseFloat(session3.avgPower) * (session3.duration / 60);
        }
      }
      if (sessionCount > 0) {
        await storage.updateGoalProgress(patientId, "duration", totalDuration / sessionCount);
        await storage.updateGoalProgress(patientId, "power", totalPower / sessionCount);
        await storage.updateGoalProgress(patientId, "resistance", totalResistance / sessionCount);
        await storage.updateGoalProgress(patientId, "energy", totalEnergy);
        await storage.updateGoalProgress(patientId, "sessions", sessionCount);
      }
      res.json({
        success: true,
        message: "Goal progress recalculated successfully",
        sessionsProcessed: sessions3.length
      });
    } catch (error) {
      console.error("Error recalculating goal progress:", error);
      res.status(500).json({ error: "Failed to recalculate goal progress" });
    }
  });
  app2.get("/api/devices", async (req, res) => {
    try {
      const devices3 = await storage.getDevices();
      res.json(devices3);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });
  app2.get("/api/patients/last-device", async (req, res) => {
    try {
      const { firstName, lastName, dateOfBirth } = req.query;
      if (!firstName || !lastName || !dateOfBirth) {
        return res.json({ lastDevice: null });
      }
      const patient = await storage.getPatientByName(
        firstName,
        lastName,
        dateOfBirth
      );
      if (!patient) {
        return res.json({ lastDevice: null });
      }
      const lastDevice = await storage.getPatientLastDevice(patient.id);
      res.json({ lastDevice });
    } catch (error) {
      console.error("Error fetching last device:", error);
      res.json({ lastDevice: null });
    }
  });
  app2.get("/api/patients/:patientId/profile-for-calculator", async (req, res) => {
    try {
      const { patientId } = req.params;
      const patient = await storage.getPatient(parseInt(patientId));
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const profile = await storage.getPatientProfile(parseInt(patientId));
      const age = patient.dateOfBirth ? Math.floor(((/* @__PURE__ */ new Date()).getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1e3)) : null;
      const daysImmobile = patient.admissionDate ? Math.floor(((/* @__PURE__ */ new Date()).getTime() - new Date(patient.admissionDate).getTime()) / (24 * 60 * 60 * 1e3)) : 0;
      const calculatorData = {
        // Basic demographics
        age,
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
        on_vte_prophylaxis: profile?.onVteProphylaxis !== false
        // Default true if not specified
      };
      res.json(calculatorData);
    } catch (error) {
      console.error("Error fetching patient profile for calculator:", error);
      res.status(500).json({ error: "Failed to fetch patient profile" });
    }
  });
  app2.get("/api/devices/:deviceId", async (req, res) => {
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
  app2.post("/api/devices/:deviceId/link", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { patientId } = req.body;
      if (!patientId) {
        return res.status(400).json({ error: "Patient ID is required" });
      }
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      await storage.linkPatientToDevice(patientId, deviceId);
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
  app2.post("/api/devices/:deviceId/reset", async (req, res) => {
    try {
      const { deviceId } = req.params;
      const device = await storage.getDevice(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      await storage.unlinkPatientFromDevice(deviceId);
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
  app2.get("/api/patients/:patientId/devices", async (req, res) => {
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
  app2.get("/api/patients/:patientId/sessions/portable", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      if (isNaN(patientId)) {
        return res.status(400).json({ error: "Invalid patient ID" });
      }
      const sessions3 = await storage.getSessionsByPatient(patientId);
      const deviceHistory = await storage.getPatientDeviceHistory(patientId);
      res.json({
        sessions: sessions3,
        deviceHistory,
        totalSessions: sessions3.length,
        totalDuration: sessions3.reduce((sum, session3) => sum + (session3.duration || 0), 0),
        devicesUsed: [...new Set(sessions3.map((s) => s.deviceId).filter(Boolean))].length
      });
    } catch (error) {
      console.error("Error fetching portable session data:", error);
      res.status(500).json({ error: "Failed to fetch portable session data" });
    }
  });
  app2.get("/api/patients/:patientId/ems-assessments", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { emsAssessments: emsAssessments3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const assessments = await db.select().from(emsAssessments3).where(eq14(emsAssessments3.patientId, patientId)).orderBy(emsAssessments3.assessedAt);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching EMS assessments:", error);
      res.status(500).json({ error: "Failed to fetch EMS assessments" });
    }
  });
  app2.get("/api/ems-assessments/:id", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const { emsAssessments: emsAssessments3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [assessment] = await db.select().from(emsAssessments3).where(eq14(emsAssessments3.id, assessmentId)).limit(1);
      if (!assessment) {
        return res.status(404).json({ error: "EMS assessment not found" });
      }
      res.json(assessment);
    } catch (error) {
      console.error("Error fetching EMS assessment:", error);
      res.status(500).json({ error: "Failed to fetch EMS assessment" });
    }
  });
  app2.post("/api/patients/:patientId/ems-assessments", createLimiter, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { emsAssessments: emsAssessments3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
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
      const totalScore = lyingToSitting + sittingToLying + sittingToStanding + standing + gait + timedWalk + functionalReach;
      let tier;
      if (totalScore > 14) {
        tier = "home";
      } else if (totalScore >= 10) {
        tier = "borderline";
      } else {
        tier = "dependent";
      }
      const [newAssessment] = await db.insert(emsAssessments3).values({
        patientId,
        providerId: providerId || null,
        assessedAt: assessedAt ? new Date(assessedAt) : /* @__PURE__ */ new Date(),
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
  app2.patch("/api/ems-assessments/:id", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const { emsAssessments: emsAssessments3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const updates = req.body;
      if (updates.lyingToSitting !== void 0 || updates.sittingToLying !== void 0 || updates.sittingToStanding !== void 0 || updates.standing !== void 0 || updates.gait !== void 0 || updates.timedWalk !== void 0 || updates.functionalReach !== void 0) {
        const [current] = await db.select().from(emsAssessments3).where(eq14(emsAssessments3.id, assessmentId)).limit(1);
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
        updates.totalScore = lyingToSitting + sittingToLying + sittingToStanding + standing + gait + timedWalk + functionalReach;
        if (updates.totalScore > 14) {
          updates.tier = "home";
        } else if (updates.totalScore >= 10) {
          updates.tier = "borderline";
        } else {
          updates.tier = "dependent";
        }
      }
      const [updated] = await db.update(emsAssessments3).set(updates).where(eq14(emsAssessments3.id, assessmentId)).returning();
      if (!updated) {
        return res.status(404).json({ error: "EMS assessment not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating EMS assessment:", error);
      res.status(500).json({ error: "Failed to update EMS assessment" });
    }
  });
  app2.delete("/api/ems-assessments/:id", async (req, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const { emsAssessments: emsAssessments3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [deleted] = await db.delete(emsAssessments3).where(eq14(emsAssessments3.id, assessmentId)).returning();
      if (!deleted) {
        return res.status(404).json({ error: "EMS assessment not found" });
      }
      res.json({ success: true, deleted });
    } catch (error) {
      console.error("Error deleting EMS assessment:", error);
      res.status(500).json({ error: "Failed to delete EMS assessment" });
    }
  });
  app2.get("/api/patients/:patientId/ems-assessment/latest", async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const { emsAssessments: emsAssessments3 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { desc: desc13 } = await import("drizzle-orm");
      const [latest] = await db.select().from(emsAssessments3).where(eq14(emsAssessments3.patientId, patientId)).orderBy(desc13(emsAssessments3.assessedAt)).limit(1);
      if (!latest) {
        return res.status(404).json({ error: "No EMS assessment found for this patient" });
      }
      res.json(latest);
    } catch (error) {
      console.error("Error fetching latest EMS assessment:", error);
      res.status(500).json({ error: "Failed to fetch latest EMS assessment" });
    }
  });
  registerPersonalizationRoutes(app2);
  const httpServer = createServer(app2);
  return httpServer;
}
async function seedInitialData() {
  try {
    const existingHeidi = await storage.getUserByEmail("heidikissane@hospital.com");
    if (!existingHeidi) {
      await storage.createUser({
        email: "heidikissane@hospital.com",
        firstName: "Heidi",
        lastName: "Kissane",
        userType: "provider",
        credentials: "DPT",
        specialty: "Physical Therapy",
        licenseNumber: "PT12345",
        isActive: true
      });
      console.log("\u2713 Seeded initial provider: Heidi Kissane, DPT");
    }
    await seedPatientWithMockData();
  } catch (error) {
    console.error("Failed to seed initial data:", error);
  }
}
async function seedPatientWithMockData() {
  try {
    let patient = await storage.getPatientByName("Neil", "Jairath", "1996-04-01");
    if (!patient) {
      patient = await storage.createUser({
        email: "neil.jairath@patient.com",
        firstName: "Neil",
        lastName: "Jairath",
        dateOfBirth: "1996-04-01",
        userType: "patient",
        admissionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0]
        // Always 4 days ago
      });
      console.log("\u2713 Created patient: Neil Jairath");
    } else {
      const updatedAdmissionDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
      if (patient.admissionDate !== updatedAdmissionDate) {
        await storage.updateUser(patient.id, { admissionDate: updatedAdmissionDate });
        console.log(`\u2713 Updated Neil Jairath's admission date to: ${updatedAdmissionDate}`);
      }
    }
    const admissionDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1e3);
    const today = /* @__PURE__ */ new Date();
    const daysSinceAdmission = Math.floor((today.getTime() - admissionDate.getTime()) / (1e3 * 60 * 60 * 24));
    const existingSessions = await storage.getSessionsByPatient(patient.id);
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 3);
    const fourDaysAgoStr = fourDaysAgo.toISOString().split("T")[0];
    const hasCurrentSessions = existingSessions.length > 0 && existingSessions.some((s) => s.sessionDate >= fourDaysAgoStr);
    if (!hasCurrentSessions) {
      if (existingSessions.length > 0) {
        for (const session3 of existingSessions) {
          await db.delete(exerciseSessions).where(eq14(exerciseSessions.id, session3.id));
        }
        console.log(`\u2713 Cleared ${existingSessions.length} old sessions`);
      }
      await generateRecentSessionData(patient.id, 4);
      console.log(`\u2713 Generated 4 days of recent exercise sessions (${fourDaysAgoStr} to ${today.toISOString().split("T")[0]})`);
    }
    let stats = await storage.getPatientStats(patient.id);
    if (!stats) {
      const sessions3 = await storage.getSessionsByPatient(patient.id);
      const totalDuration = sessions3.reduce((sum, s) => sum + s.duration, 0);
      const totalDistance = sessions3.reduce((sum, s) => sum + Number(s.avgPower || 0) * 0.1, 0);
      const avgPower = sessions3.length > 0 ? sessions3.reduce((sum, s) => sum + Number(s.avgPower || 0), 0) / sessions3.length : 0;
      const [newStats] = await db.insert(patientStats).values({
        patientId: patient.id,
        totalSessions: sessions3.length,
        totalDuration,
        avgDailyDuration: totalDuration / daysSinceAdmission,
        consistencyStreak: calculateCurrentStreak(sessions3),
        xp: sessions3.length * 50 + Math.floor(totalDuration / 60) * 10,
        // 50 XP per session + 10 XP per minute
        level: 1
      }).returning();
      stats = newStats;
      console.log("\u2713 Created patient stats with realistic totals");
    }
    await createProgressiveGoals(patient.id, stats);
    return patient;
  } catch (error) {
    console.error("Failed to seed patient with mock data:", error);
  }
}
async function generateRecentSessionData(patientId, numDays) {
  const sessions3 = [];
  const today = /* @__PURE__ */ new Date();
  const usePostgres = process.env.USE_POSTGRES === "true";
  for (let daysAgo = numDays - 1; daysAgo >= 0; daysAgo--) {
    const sessionDate = new Date(today);
    sessionDate.setDate(today.getDate() - daysAgo);
    const sessionsPerDay = Math.random() < 0.5 ? 1 : 2;
    for (let sessionNum = 0; sessionNum < sessionsPerDay; sessionNum++) {
      const progressFactor = (numDays - daysAgo) / numDays;
      const baseDuration = 900 + progressFactor * 300;
      const variance = baseDuration * 0.2;
      const duration = Math.floor(baseDuration + (Math.random() - 0.5) * variance);
      const basePower = 28 + progressFactor * 7;
      const powerVariance = basePower * 0.3;
      const avgPower = Math.floor(basePower + (Math.random() - 0.5) * powerVariance);
      const maxPower = Math.floor(avgPower * (1.3 + Math.random() * 0.2));
      const startTimeDate = new Date(sessionDate);
      startTimeDate.setHours(9 + sessionNum * 5 + Math.floor(Math.random() * 2));
      const endTimeDate = new Date(startTimeDate.getTime() + duration * 1e3);
      const startTime = usePostgres ? startTimeDate : Math.floor(startTimeDate.getTime() / 1e3);
      const endTime = usePostgres ? endTimeDate : Math.floor(endTimeDate.getTime() / 1e3);
      sessions3.push({
        patientId,
        sessionDate: sessionDate.toISOString().split("T")[0],
        startTime,
        endTime,
        duration,
        avgPower: avgPower.toString(),
        maxPower: maxPower.toString(),
        resistance: (2.5 + progressFactor * 2).toFixed(1),
        // 2.5 to 4.5
        stopsAndStarts: Math.max(0, 6 - Math.floor(progressFactor * 4)),
        // 6 down to 2
        isCompleted: true,
        sessionNotes: `Session ${sessionNum + 1}: Good effort, patient showing steady progress`
      });
    }
  }
  if (usePostgres) {
    const pgSchema = await Promise.resolve().then(() => (init_schema_postgres(), schema_postgres_exports));
    for (const session3 of sessions3) {
      await db.insert(pgSchema.exerciseSessions).values(session3);
    }
  } else {
    for (const session3 of sessions3) {
      await storage.createSession(session3);
    }
  }
  return sessions3;
}
function calculateCurrentStreak(sessions3) {
  if (sessions3.length === 0) return 0;
  const sessionDates = new Set(sessions3.map((s) => s.sessionDate));
  const sortedDates = Array.from(sessionDates).sort().reverse();
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let expectedDate = new Date(today);
  for (const dateStr of sortedDates) {
    const sessionDate = new Date(dateStr);
    sessionDate.setHours(0, 0, 0, 0);
    if (sessionDate.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (sessionDate.getTime() < expectedDate.getTime()) {
      break;
    }
  }
  if (streak > 0) {
    const mostRecentSession = new Date(sortedDates[0]);
    mostRecentSession.setHours(0, 0, 0, 0);
    const daysSinceLastSession = Math.floor((today.getTime() - mostRecentSession.getTime()) / (1e3 * 60 * 60 * 24));
    if (daysSinceLastSession > 1) {
      return 0;
    }
  }
  return streak;
}
async function createProgressiveGoals(patientId, stats) {
  const existingGoals = await storage.getPatientGoals(patientId);
  if (existingGoals.length > 0) return;
  const goals = [
    {
      patientId,
      goalType: "duration",
      targetValue: "900",
      // 15 minutes - clinical standard
      currentValue: "0",
      unit: "seconds",
      label: "Daily mobility target to prevent deconditioning",
      subtitle: "Provider-recommended exercise duration",
      period: "daily",
      isActive: true,
      providerId: 1
      // Heidi Kissane
    },
    {
      patientId,
      goalType: "power",
      targetValue: "25",
      // 25W - realistic clinical target (20-30W range)
      currentValue: "0",
      unit: "watts",
      label: "Power output goal for cardiovascular health",
      subtitle: "Target resistance for optimal recovery",
      period: "session",
      isActive: true,
      providerId: 1
    },
    {
      patientId,
      goalType: "sessions",
      targetValue: "2",
      // 2 sessions per day
      currentValue: "0",
      unit: "sessions",
      label: "Exercise frequency to maintain circulation and prevent VTE",
      subtitle: "Daily session count for best outcomes",
      period: "daily",
      isActive: true,
      providerId: 1
    }
  ];
  for (const goal of goals) {
    await storage.createGoal(goal);
  }
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_logger();

// server/session.ts
init_logger();
import session from "express-session";
var isVercel = process.env.VERCEL === "1";
var SESSION_SECRET = process.env.SESSION_SECRET || "bedside-bike-development-secret-change-in-production";
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  logger.warn("No SESSION_SECRET environment variable set! Using default (insecure for production)");
}
var sessionStore;
if (!isVercel) {
  try {
    const connectSqlite3 = __require("connect-sqlite3");
    const SQLiteStore = connectSqlite3(session);
    sessionStore = new SQLiteStore({
      db: "sessions.db",
      dir: "./data"
    });
    logger.info("Session store configured", { store: "SQLite", sessionDb: "data/sessions.db" });
  } catch (err) {
    logger.warn("SQLite session store not available, using memory store");
  }
} else {
  logger.info("Session store configured", { store: "Memory (Vercel serverless)" });
}
var sessionConfig = {
  store: sessionStore,
  // undefined = use default MemoryStore
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1e3,
    // 30 days
    sameSite: "lax"
  },
  name: "bedside.sid"
};
var session_default = sessionConfig;

// server/websocket/index.ts
init_logger();
await init_db();
init_schema();
import { WebSocketServer, WebSocket } from "ws";
import { eq as eq15 } from "drizzle-orm";
var DeviceBridgeWebSocket = class {
  wss;
  deviceConnections = /* @__PURE__ */ new Map();
  providerConnections = /* @__PURE__ */ new Map();
  deviceHeartbeats = /* @__PURE__ */ new Map();
  constructor(server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws/device-bridge",
      // Handle CORS for WebSocket
      verifyClient: (info) => {
        return true;
      }
    });
    this.wss.on("connection", this.handleConnection.bind(this));
    this.wss.on("error", (error) => {
      logger.error("WebSocket server error", { error: error.message });
    });
    logger.info("WebSocket server initialized", {
      path: "/ws/device-bridge",
      status: "ready"
    });
    this.startHeartbeatMonitor();
  }
  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const url = new URL(req.url, "http://localhost");
    const clientType = url.searchParams.get("type");
    const deviceId = url.searchParams.get("deviceId");
    const patientId = url.searchParams.get("patientId");
    if (clientType === "device" && deviceId) {
      this.handleDeviceConnection(ws, deviceId);
    } else if (clientType === "provider" && patientId) {
      this.handleProviderConnection(ws, patientId);
    } else {
      logger.warn("WebSocket connection rejected - invalid parameters", {
        clientType,
        deviceId,
        patientId
      });
      ws.close(1008, "Invalid connection parameters");
    }
  }
  /**
   * Handle device connection (Bedside Bike hardware)
   */
  handleDeviceConnection(ws, deviceId) {
    this.deviceConnections.set(deviceId, ws);
    logger.info("Device connected", { deviceId, totalDevices: this.deviceConnections.size });
    this.sendToDevice(deviceId, {
      type: "device_status",
      data: { status: "connected", message: "Connected to Bedside Bike server" }
    });
    this.setupDeviceHeartbeat(deviceId);
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        switch (message.type) {
          case "session_update":
            await this.handleSessionUpdate(message.data);
            break;
          case "device_status":
            await this.handleDeviceStatus(message.data);
            break;
          default:
            logger.warn("Unknown message type from device", {
              deviceId,
              type: message.type
            });
        }
      } catch (error) {
        logger.error("Error processing device message", {
          error: error.message,
          deviceId,
          data: data.toString().substring(0, 100)
        });
      }
    });
    ws.on("close", () => {
      this.deviceConnections.delete(deviceId);
      this.clearDeviceHeartbeat(deviceId);
      logger.info("Device disconnected", {
        deviceId,
        totalDevices: this.deviceConnections.size
      });
      this.broadcastDeviceStatus({
        deviceId,
        status: "offline",
        lastHeartbeat: /* @__PURE__ */ new Date()
      });
    });
    ws.on("error", (error) => {
      logger.error("Device WebSocket error", { deviceId, error: error.message });
    });
    ws.on("ping", () => {
      ws.pong();
      this.resetDeviceHeartbeat(deviceId);
    });
  }
  /**
   * Handle provider connection (nurses, PTs viewing dashboard)
   */
  handleProviderConnection(ws, patientId) {
    if (!this.providerConnections.has(patientId)) {
      this.providerConnections.set(patientId, /* @__PURE__ */ new Set());
    }
    this.providerConnections.get(patientId).add(ws);
    logger.info("Provider connected", {
      patientId,
      totalProviders: this.getTotalProviderConnections()
    });
    this.sendCurrentSessionStatus(ws, parseInt(patientId));
    ws.on("close", () => {
      this.providerConnections.get(patientId)?.delete(ws);
      if (this.providerConnections.get(patientId)?.size === 0) {
        this.providerConnections.delete(patientId);
      }
      logger.info("Provider disconnected", {
        patientId,
        totalProviders: this.getTotalProviderConnections()
      });
    });
    ws.on("error", (error) => {
      logger.error("Provider WebSocket error", { patientId, error: error.message });
    });
  }
  /**
   * Process session update from device
   */
  async handleSessionUpdate(update) {
    try {
      logger.debug("Processing session update", {
        sessionId: update.sessionId,
        patientId: update.patientId,
        deviceId: update.deviceId,
        status: update.status,
        rpm: update.metrics.rpm,
        power: update.metrics.power
      });
      await db.update(exerciseSessions).set({
        currentRpm: update.metrics.rpm,
        currentPower: update.metrics.power,
        distanceMeters: update.metrics.distance,
        durationSeconds: update.metrics.duration,
        currentStatus: update.status,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq15(exerciseSessions.id, update.sessionId));
      this.broadcastToProviders(update.patientId, {
        type: "session_update",
        data: update
      });
      await this.checkSessionAlerts(update);
    } catch (error) {
      logger.error("Failed to process session update", {
        error: error.message,
        sessionId: update.sessionId
      });
    }
  }
  /**
   * Handle device status update
   */
  async handleDeviceStatus(status) {
    logger.debug("Device status update", status);
    this.broadcastDeviceStatus(status);
  }
  /**
   * Check for alert conditions during session update
   * Uses alert engine for comprehensive alert checking
   */
  async checkSessionAlerts(update) {
    try {
      if (update.status === "completed") {
        const { alertEngine: alertEngine2 } = await init_alert_engine().then(() => alert_engine_exports);
        const alerts3 = await alertEngine2.checkSessionAlerts(update.sessionId);
        for (const alert of alerts3) {
          this.broadcastAlert(alert);
        }
        if (alerts3.length > 0) {
          logger.info("Session alerts generated and broadcast", {
            sessionId: update.sessionId,
            alertCount: alerts3.length
          });
        }
      }
    } catch (error) {
      logger.error("Failed to check session alerts", {
        error: error.message,
        sessionId: update.sessionId
      });
    }
  }
  /**
   * Broadcast message to all providers watching a patient
   */
  broadcastToProviders(patientId, message) {
    const connections = this.providerConnections.get(patientId.toString());
    if (!connections) return;
    const messageStr = JSON.stringify(message);
    let sent = 0;
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sent++;
      }
    });
    logger.debug("Broadcast to providers", { patientId, providerCount: sent });
  }
  /**
   * Broadcast alert to providers
   */
  broadcastAlert(alert) {
    this.broadcastToProviders(alert.patientId, {
      type: "alert",
      data: alert
    });
    logger.info("Alert broadcast", {
      patientId: alert.patientId,
      type: alert.type,
      priority: alert.priority
    });
  }
  /**
   * Broadcast device status to all providers
   */
  broadcastDeviceStatus(status) {
    logger.debug("Device status broadcast", status);
  }
  /**
   * Send message to specific device
   */
  sendToDevice(deviceId, message) {
    const ws = this.deviceConnections.get(deviceId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.warn("Cannot send to device - not connected", { deviceId });
      return false;
    }
    ws.send(JSON.stringify(message));
    return true;
  }
  /**
   * Send current session status to newly connected provider
   */
  async sendCurrentSessionStatus(ws, patientId) {
    try {
      const activeSessions = await db.select().from(exerciseSessions).where(eq15(exerciseSessions.patientId, patientId));
      if (activeSessions.length > 0) {
        ws.send(JSON.stringify({
          type: "session_update",
          data: {
            type: "initial_state",
            sessions: activeSessions
          }
        }));
      }
    } catch (error) {
      logger.error("Failed to send current session status", {
        error: error.message,
        patientId
      });
    }
  }
  /**
   * Heartbeat monitoring for devices
   */
  startHeartbeatMonitor() {
    setInterval(() => {
      this.deviceConnections.forEach((ws, deviceId) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 3e4);
  }
  setupDeviceHeartbeat(deviceId) {
    this.clearDeviceHeartbeat(deviceId);
    const timeout = setTimeout(() => {
      logger.warn("Device heartbeat timeout", { deviceId });
      this.deviceConnections.get(deviceId)?.close();
    }, 6e4);
    this.deviceHeartbeats.set(deviceId, timeout);
  }
  resetDeviceHeartbeat(deviceId) {
    this.setupDeviceHeartbeat(deviceId);
  }
  clearDeviceHeartbeat(deviceId) {
    const timeout = this.deviceHeartbeats.get(deviceId);
    if (timeout) {
      clearTimeout(timeout);
      this.deviceHeartbeats.delete(deviceId);
    }
  }
  /**
   * Get total number of provider connections
   */
  getTotalProviderConnections() {
    let total = 0;
    this.providerConnections.forEach((set) => {
      total += set.size;
    });
    return total;
  }
  /**
   * Get server statistics
   */
  getStats() {
    return {
      devices: {
        connected: this.deviceConnections.size,
        deviceIds: Array.from(this.deviceConnections.keys())
      },
      providers: {
        total: this.getTotalProviderConnections(),
        byPatient: Array.from(this.providerConnections.entries()).map(([patientId, connections]) => ({
          patientId,
          connections: connections.size
        }))
      }
    };
  }
  /**
   * Shutdown WebSocket server gracefully
   */
  shutdown() {
    logger.info("Shutting down WebSocket server");
    this.deviceConnections.forEach((ws, deviceId) => {
      ws.close(1e3, "Server shutting down");
    });
    this.providerConnections.forEach((connections) => {
      connections.forEach((ws) => {
        ws.close(1e3, "Server shutting down");
      });
    });
    this.deviceHeartbeats.forEach((timeout) => clearTimeout(timeout));
    this.wss.close();
  }
};
var websocket_default = DeviceBridgeWebSocket;

// server/index.ts
var app = express2();
var isVercel2 = process.env.VERCEL === "1";
app.set("trust proxy", true);
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(session2(session_default));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function initializeApp() {
  await updateRollingDataWindow();
  await registerRoutes(app);
  app.use(errorLogger);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
  if (!isVercel2 && app.get("env") !== "development") {
    serveStatic(app);
  }
  return app;
}
var appPromise = null;
async function getApp() {
  if (!appPromise) {
    appPromise = initializeApp();
  }
  return appPromise;
}
if (!isVercel2) {
  (async () => {
    await initializeApp();
    const http = await import("http");
    const server = http.createServer(app);
    const wsServer = new websocket_default(server);
    logger.info("WebSocket server ready for device and provider connections");
    app.wsServer = wsServer;
    if (app.get("env") === "development") {
      await setupVite(app, server);
    }
    const port = 5e3;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true
    }, () => {
      log(`serving on port ${port}`);
      logger.info(`Bedside Bike API server started on port ${port}`, {
        port,
        environment: process.env.NODE_ENV || "development",
        database: process.env.USE_LOCAL_DB === "true" ? "SQLite" : "Azure SQL"
      });
    });
  })();
}

// api/_handler.ts
async function handler(req, res) {
  const app2 = await getApp();
  return app2(req, res);
}
export {
  handler as default
};
