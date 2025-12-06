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

// Validation schemas (reuse from main schema)
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
