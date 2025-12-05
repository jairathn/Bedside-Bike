import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  int,
  text,
  varchar,
  decimal,
  date,
  real,
  datetime2,
} from "drizzle-orm/mssql-core";
import { mssqlTable } from "drizzle-orm/mssql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// MS SQL doesn't support native enums, so we use CHECK constraints via varchar
// Enum types defined as Zod schemas for validation
export const userTypeEnum = z.enum(['patient', 'provider']);
export const providerRoleEnum = z.enum(['physician', 'nurse', 'physical_therapist', 'mobility_tech', 'other']);
export const levelOfCareEnum = z.enum(['icu', 'stepdown', 'ward', 'rehab']);
export const mobilityStatusEnum = z.enum(['bedbound', 'chair_bound', 'standing_assist', 'walking_assist', 'independent']);
export const cognitiveStatusEnum = z.enum(['normal', 'mild_impairment', 'delirium_dementia']);

// Session storage table for authentication
export const sessions = mssqlTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: varchar("sess", { length: "max" }).notNull(),
    expire: datetime2("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - supports both patients and providers
export const users = mssqlTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  email: varchar("email", { length: 255 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  userType: varchar("user_type", { length: 20 }).notNull(), // 'patient' or 'provider'
  dateOfBirth: date("date_of_birth"), // Required for patients
  admissionDate: date("admission_date"), // For patients
  // Provider specific fields
  providerRole: varchar("provider_role", { length: 50 }), // For access control
  credentials: varchar("credentials", { length: 100 }), // e.g., "DPT", "MD", "RN"
  specialty: varchar("specialty", { length: 100 }), // e.g., "Physical Therapy"
  licenseNumber: varchar("license_number", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
});

// Patient profiles for risk assessment data
export const patientProfiles = mssqlTable("patient_profiles", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("user_id").references(() => users.id).notNull(),
  age: int("age").notNull(),
  sex: varchar("sex", { length: 10 }),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  heightCm: decimal("height_cm", { precision: 5, scale: 2 }),
  levelOfCare: varchar("level_of_care", { length: 20 }).notNull(),
  mobilityStatus: varchar("mobility_status", { length: 30 }).notNull(),
  cognitiveStatus: varchar("cognitive_status", { length: 30 }).notNull(),
  daysImmobile: int("days_immobile").default(0),
  admissionDiagnosis: text("admission_diagnosis"),
  comorbidities: varchar("comorbidities", { length: "max" }).default('[]'),
  medications: varchar("medications", { length: "max" }).default('[]'),
  devices: varchar("devices", { length: "max" }).default('[]'),
  // Additional risk factors
  incontinent: boolean("incontinent").default(false),
  albuminLow: boolean("albumin_low").default(false),
  baselineFunction: varchar("baseline_function", { length: 20 }),
  onVteProphylaxis: boolean("on_vte_prophylaxis").default(true),
  losExpectedDays: int("los_expected_days"),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
});

// Provider-Patient relationships
export const providerPatients = mssqlTable("provider_patients", {
  id: int("id").primaryKey({ autoIncrement: true }),
  providerId: int("provider_id").references(() => users.id).notNull(),
  patientId: int("patient_id").references(() => users.id).notNull(),
  permissionGranted: boolean("permission_granted").default(false),
  grantedAt: datetime2("granted_at"),
  isActive: boolean("is_active").default(true),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// Risk assessments
export const riskAssessments = mssqlTable("risk_assessments", {
  id: int("id").primaryKey({ autoIncrement: true }),
  patientId: int("patient_id").references(() => users.id).notNull(),
  // Risk scores as JSON objects with detailed data
  deconditioning: varchar("deconditioning", { length: "max" }).notNull(),
  vte: varchar("vte", { length: "max" }).notNull(),
  falls: varchar("falls", { length: "max" }).notNull(),
  pressure: varchar("pressure", { length: "max" }).notNull(),
  // Mobility recommendation
  mobilityRecommendation: varchar("mobility_recommendation", { length: "max" }).notNull(),
  // Benefit calculations
  losData: varchar("los_data", { length: "max" }),
  dischargeData: varchar("discharge_data", { length: "max" }),
  readmissionData: varchar("readmission_data", { length: "max" }),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// Patient goals - set by providers based on risk assessment
export const patientGoals = mssqlTable("patient_goals", {
  id: int("id").primaryKey({ autoIncrement: true }),
  patientId: int("patient_id").references(() => users.id).notNull(),
  providerId: int("provider_id").references(() => users.id),
  goalType: varchar("goal_type", { length: 50 }).notNull(), // 'duration', 'power', 'resistance'
  targetValue: decimal("target_value", { precision: 8, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 8, scale: 2 }).default('0'),
  unit: varchar("unit", { length: 20 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  subtitle: varchar("subtitle", { length: 200 }),
  period: varchar("period", { length: 20 }).notNull(), // 'daily', 'session'
  aiRecommended: boolean("ai_recommended").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
});

// Bedside Bike devices
export const devices = mssqlTable("devices", {
  id: varchar("id", { length: 10 }).primaryKey(), // "121", "122", etc.
  name: varchar("name", { length: 100 }).notNull(), // "Bedside Bike 121"
  location: varchar("location", { length: 100 }), // "Room 305", "ICU Bay 3"
  status: varchar("status", { length: 20 }).default('available'), // available, in_use, maintenance
  currentPatientId: int("current_patient_id").references(() => users.id),
  lastUsed: datetime2("last_used"),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
});

// Device session links - which patient used which device when
export const deviceSessions = mssqlTable("device_sessions", {
  id: int("id").primaryKey({ autoIncrement: true }),
  patientId: int("patient_id").references(() => users.id).notNull(),
  deviceId: varchar("device_id", { length: 10 }).references(() => devices.id).notNull(),
  sessionId: int("session_id").references(() => exerciseSessions.id).notNull(),
  startedAt: datetime2("started_at").default(sql`GETDATE()`),
  endedAt: datetime2("ended_at"),
});

// Exercise sessions
export const exerciseSessions = mssqlTable("exercise_sessions", {
  id: int("id").primaryKey({ autoIncrement: true }),
  patientId: int("patient_id").references(() => users.id).notNull(),
  deviceId: varchar("device_id", { length: 10 }).references(() => devices.id), // NEW: which bike was used
  duration: int("duration").notNull(), // in seconds
  avgPower: decimal("avg_power", { precision: 5, scale: 2 }),
  maxPower: decimal("max_power", { precision: 5, scale: 2 }),
  resistance: decimal("resistance", { precision: 3, scale: 1 }),
  sessionDate: date("session_date").notNull(),
  startTime: datetime2("start_time").notNull(),
  endTime: datetime2("end_time"),
  stopsAndStarts: int("stops_and_starts").default(0),
  isCompleted: boolean("is_completed").default(false),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// Achievements
export const achievements = mssqlTable("achievements", {
  id: int("id").primaryKey({ autoIncrement: true }),
  patientId: int("patient_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  xpReward: int("xp_reward").default(0),
  isUnlocked: boolean("is_unlocked").default(false),
  unlockedAt: datetime2("unlocked_at"),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

// Patient stats
export const patientStats = mssqlTable("patient_stats", {
  id: int("id").primaryKey({ autoIncrement: true }),
  patientId: int("patient_id").references(() => users.id).notNull(),
  level: int("level").default(1),
  xp: int("xp").default(0),
  totalSessions: int("total_sessions").default(0),
  totalDuration: int("total_duration").default(0), // in seconds
  avgDailyDuration: real("avg_daily_duration").default(0),
  consistencyStreak: int("consistency_streak").default(0),
  lastSessionDate: datetime2("last_session_date"),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
});

// Kudos & Nudge Wall Tables
export const feedItems = mssqlTable("feed_items", {
  id: int("id").primaryKey({ autoIncrement: true }),
  patientId: int("patient_id").references(() => users.id).notNull(),
  displayName: varchar("display_name", { length: 50 }).notNull(),
  avatarEmoji: varchar("avatar_emoji", { length: 10 }).default('👤'),
  eventType: varchar("event_type", { length: 50 }).notNull(), // goal_completed, session_started, session_missed, streak_extended
  templateId: varchar("template_id", { length: 50 }).notNull(),
  message: text("message").notNull(),
  metadata: varchar("metadata", { length: "max" }).default('{}'), // watts, minutes, streak count etc
  unit: varchar("unit", { length: 50 }).default('general'), // hospital unit for cohort filtering
  isVisible: boolean("is_visible").default(true),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

export const nudgeMessages = mssqlTable("nudge_messages", {
  id: int("id").primaryKey({ autoIncrement: true }),
  senderId: int("sender_id").references(() => users.id).notNull(),
  recipientId: int("recipient_id").references(() => users.id).notNull(),
  feedItemId: int("feed_item_id").references(() => feedItems.id),
  templateId: varchar("template_id", { length: 50 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

export const kudosReactions = mssqlTable("kudos_reactions", {
  id: int("id").primaryKey({ autoIncrement: true }),
  patientId: int("patient_id").references(() => users.id).notNull(),
  feedItemId: int("feed_item_id").references(() => feedItems.id).notNull(),
  reactionType: varchar("reaction_type", { length: 20 }).notNull(), // 👏, 💪, 🎉, ❤️
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
});

export const patientPreferences = mssqlTable("patient_preferences", {
  id: int("id").primaryKey({ autoIncrement: true }),
  patientId: int("patient_id").references(() => users.id).notNull(),
  displayName: varchar("display_name", { length: 50 }).notNull(),
  avatarEmoji: varchar("avatar_emoji", { length: 10 }).default('👤'),
  optInKudos: boolean("opt_in_kudos").default(false),
  optInNudges: boolean("opt_in_nudges").default(false),
  unit: varchar("unit", { length: 50 }).default('general'),
  createdAt: datetime2("created_at").default(sql`GETDATE()`),
  updatedAt: datetime2("updated_at").default(sql`GETDATE()`),
});

// Authentication schemas
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

// Zod schemas for inserts
export const insertUserSchema = createInsertSchema(users);
export const insertPatientProfileSchema = createInsertSchema(patientProfiles);
export const insertPatientGoalSchema = createInsertSchema(patientGoals);
export const insertDeviceSchema = createInsertSchema(devices);
export const insertDeviceSessionSchema = createInsertSchema(deviceSessions);
export const insertExerciseSessionSchema = createInsertSchema(exerciseSessions);
export const insertProviderPatientSchema = createInsertSchema(providerPatients);
export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments);

// Risk Assessment Input Schema
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
  
  // Structured medication risk factors (equally weighted groups)
  on_sedating_medications: z.boolean().default(false),
  on_anticoagulants: z.boolean().default(false),
  on_steroids: z.boolean().default(false),
  
  // Structured comorbidity risk factors
  has_diabetes: z.boolean().default(false),
  has_malnutrition: z.boolean().default(false),
  has_obesity: z.boolean().default(false),
  has_neuropathy: z.boolean().default(false),
  has_parkinson: z.boolean().default(false),
  has_stroke_history: z.boolean().default(false),
  has_active_cancer: z.boolean().default(false),
  has_vte_history: z.boolean().default(false),
  
  // Structured admission category risk factors
  is_postoperative: z.boolean().default(false),
  is_trauma_admission: z.boolean().default(false),
  is_sepsis: z.boolean().default(false),
  is_cardiac_admission: z.boolean().default(false),
  is_neuro_admission: z.boolean().default(false),
  is_orthopedic: z.boolean().default(false),
  is_oncology: z.boolean().default(false),
  
  // Structured device/line risk factors
  has_foley_catheter: z.boolean().default(false),
  has_central_line: z.boolean().default(false),
  has_feeding_tube: z.boolean().default(false),
  has_ventilator: z.boolean().default(false),
  
  // Free text fields (now optional if structured inputs are used)
  additional_medications: z.string().optional(),
  additional_comorbidities: z.string().optional(),
  additional_medical_history: z.string().optional(),
});

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

export type RiskAssessmentInput = z.infer<typeof riskAssessmentInputSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PatientRegistration = z.infer<typeof patientRegistrationSchema>;
export type ProviderRegistration = z.infer<typeof providerRegistrationSchema>;

// Legacy exports for compatibility
export type Patient = User & { userType: 'patient' };
export type InsertPatient = InsertUser & { userType: 'patient' };
export type Session = ExerciseSession;
export type InsertSession = InsertExerciseSession;
export type Goal = PatientGoal;
export type InsertGoal = InsertPatientGoal;

// Legacy schemas for compatibility
export const insertPatientSchema = patientRegistrationSchema;
export const insertSessionSchema = insertExerciseSessionSchema;
export const insertGoalSchema = insertPatientGoalSchema;
export const riskAssessmentSchema = riskAssessmentInputSchema;