#!/usr/bin/env tsx

/**
 * Initialize local SQLite database with schema and seed data
 * Usage: tsx scripts/init-local-db.ts
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../shared/schema.sqlite';

const sqlite = new Database('local.db');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite, { schema });

console.log('🗄️  Initializing local SQLite database...\n');

// Drop all tables (in reverse dependency order)
const dropTables = `
DROP TABLE IF EXISTS caregiver_achievements;
DROP TABLE IF EXISTS caregiver_notifications;
DROP TABLE IF EXISTS discharge_checklists;
DROP TABLE IF EXISTS caregiver_observations;
DROP TABLE IF EXISTS caregiver_patients;
DROP TABLE IF EXISTS protocol_matching_criteria;
DROP TABLE IF EXISTS patient_protocol_assignments;
DROP TABLE IF EXISTS clinical_protocols;
DROP TABLE IF EXISTS kudos_reactions;
DROP TABLE IF EXISTS nudge_messages;
DROP TABLE IF EXISTS feed_items;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS patient_preferences;
DROP TABLE IF EXISTS patient_stats;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS device_sessions;
DROP TABLE IF EXISTS exercise_sessions;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS patient_goals;
DROP TABLE IF EXISTS risk_assessments;
DROP TABLE IF EXISTS provider_patients;
DROP TABLE IF EXISTS patient_profiles;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
`;

console.log('🗑️  Dropping existing tables...');
sqlite.exec(dropTables);

// Create all tables
const createTables = `
-- Sessions table
CREATE TABLE sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expire INTEGER NOT NULL
);

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('patient', 'provider', 'caregiver')),
    date_of_birth TEXT,
    admission_date TEXT,
    phone_number TEXT,
    provider_role TEXT CHECK(provider_role IN ('physician', 'nurse', 'physical_therapist', 'mobility_tech', 'other')),
    credentials TEXT,
    specialty TEXT,
    license_number TEXT,
    is_active INTEGER DEFAULT 1,
    tos_accepted_at INTEGER,
    tos_version TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Patient profiles
CREATE TABLE patient_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    age INTEGER NOT NULL,
    sex TEXT,
    weight_kg REAL,
    height_cm REAL,
    level_of_care TEXT NOT NULL CHECK(level_of_care IN ('icu', 'stepdown', 'ward', 'rehab')),
    mobility_status TEXT NOT NULL CHECK(mobility_status IN ('bedbound', 'chair_bound', 'standing_assist', 'walking_assist', 'independent')),
    cognitive_status TEXT NOT NULL CHECK(cognitive_status IN ('normal', 'mild_impairment', 'delirium_dementia')),
    days_immobile INTEGER DEFAULT 0,
    admission_diagnosis TEXT,
    comorbidities TEXT DEFAULT '[]',
    medications TEXT DEFAULT '[]',
    devices TEXT DEFAULT '[]',
    incontinent INTEGER DEFAULT 0,
    albumin_low INTEGER DEFAULT 0,
    baseline_function TEXT,
    on_vte_prophylaxis INTEGER DEFAULT 1,
    los_expected_days INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Provider-patient relationships
CREATE TABLE provider_patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES users(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    permission_granted INTEGER DEFAULT 0,
    granted_at INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Risk assessments
CREATE TABLE risk_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    deconditioning TEXT NOT NULL,
    vte TEXT NOT NULL,
    falls TEXT NOT NULL,
    pressure TEXT NOT NULL,
    mobility_recommendation TEXT NOT NULL,
    los_data TEXT,
    discharge_data TEXT,
    readmission_data TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Patient goals
CREATE TABLE patient_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    provider_id INTEGER REFERENCES users(id),
    goal_type TEXT NOT NULL,
    target_value REAL NOT NULL,
    current_value REAL DEFAULT 0,
    unit TEXT NOT NULL,
    label TEXT NOT NULL,
    subtitle TEXT,
    period TEXT NOT NULL,
    ai_recommended INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Devices
CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'available',
    current_patient_id INTEGER REFERENCES users(id),
    last_used INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Exercise sessions
CREATE TABLE exercise_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    device_id TEXT REFERENCES devices(id),
    duration INTEGER NOT NULL,
    avg_power REAL,
    max_power REAL,
    avg_rpm REAL,
    resistance REAL,
    session_date TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    stops_and_starts INTEGER DEFAULT 0,
    is_completed INTEGER DEFAULT 0,
    is_manual INTEGER DEFAULT 0,
    -- Real-time tracking fields
    current_rpm REAL,
    current_power REAL,
    distance_meters REAL,
    duration_seconds INTEGER,
    current_status TEXT CHECK(current_status IN ('active', 'paused', 'completed')),
    target_duration INTEGER,
    -- Session logging attribution (caregiver feature)
    logged_by_id INTEGER REFERENCES users(id),
    logger_type TEXT CHECK(logger_type IN ('patient', 'caregiver', 'provider', 'device')),
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Device sessions
CREATE TABLE device_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    device_id TEXT NOT NULL REFERENCES devices(id),
    session_id INTEGER NOT NULL REFERENCES exercise_sessions(id),
    started_at INTEGER DEFAULT (unixepoch()),
    ended_at INTEGER
);

-- Achievements
CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    is_unlocked INTEGER DEFAULT 0,
    unlocked_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Patient stats
CREATE TABLE patient_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    avg_daily_duration REAL DEFAULT 0,
    consistency_streak INTEGER DEFAULT 0,
    last_session_date INTEGER,
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Patient preferences
CREATE TABLE patient_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    display_name TEXT NOT NULL,
    avatar_emoji TEXT DEFAULT '👤',
    opt_in_kudos INTEGER DEFAULT 0,
    opt_in_nudges INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'general',
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Alerts for smart monitoring
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    action_required TEXT NOT NULL,
    metadata TEXT,
    triggered_at INTEGER NOT NULL,
    acknowledged_at INTEGER,
    acknowledged_by INTEGER REFERENCES users(id),
    created_at INTEGER DEFAULT (unixepoch())
);

-- Clinical protocols - Evidence-based exercise prescriptions
CREATE TABLE clinical_protocols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    indication TEXT NOT NULL,
    contraindications TEXT,
    diagnosis_codes TEXT,
    protocol_data TEXT NOT NULL,
    evidence_citation TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Patient protocol assignments
CREATE TABLE patient_protocol_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    protocol_id INTEGER NOT NULL REFERENCES clinical_protocols(id),
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    current_phase TEXT,
    start_date INTEGER NOT NULL,
    progression_date INTEGER,
    completion_date INTEGER,
    status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'discontinued')),
    notes TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Protocol matching criteria - defines detailed matching rules for personalization
CREATE TABLE protocol_matching_criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol_id INTEGER NOT NULL REFERENCES clinical_protocols(id),
    min_age INTEGER,
    max_age INTEGER,
    required_mobility_levels TEXT,
    excluded_mobility_levels TEXT,
    required_baseline_function TEXT,
    required_comorbidities TEXT,
    excluded_comorbidities TEXT,
    required_procedures TEXT,
    max_fall_risk REAL,
    max_deconditioning_risk REAL,
    requires_low_vte_risk INTEGER DEFAULT 0,
    match_weight REAL DEFAULT 1.0,
    match_priority INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Feed items
CREATE TABLE feed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    display_name TEXT NOT NULL,
    avatar_emoji TEXT DEFAULT '👤',
    event_type TEXT NOT NULL,
    template_id TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    unit TEXT DEFAULT 'general',
    is_visible INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Nudge messages
CREATE TABLE nudge_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    recipient_id INTEGER NOT NULL REFERENCES users(id),
    feed_item_id INTEGER REFERENCES feed_items(id),
    template_id TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Kudos reactions
CREATE TABLE kudos_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    feed_item_id INTEGER NOT NULL REFERENCES feed_items(id),
    reaction_type TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
);

-- =====================================================
-- CAREGIVER ENGAGEMENT SYSTEM
-- =====================================================

-- Caregiver-Patient relationships
CREATE TABLE caregiver_patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caregiver_id INTEGER NOT NULL REFERENCES users(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    relationship_type TEXT NOT NULL CHECK(relationship_type IN ('spouse', 'partner', 'child', 'parent', 'sibling', 'friend', 'other_family', 'professional_caregiver')),
    access_status TEXT DEFAULT 'pending' CHECK(access_status IN ('pending', 'approved', 'denied', 'revoked')),
    requested_at INTEGER DEFAULT (unixepoch()),
    approved_at INTEGER,
    revoked_at INTEGER,
    can_log_sessions INTEGER DEFAULT 1,
    can_view_reports INTEGER DEFAULT 1,
    can_send_nudges INTEGER DEFAULT 1,
    supporter_xp INTEGER DEFAULT 0,
    supporter_level INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Caregiver observations
CREATE TABLE caregiver_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caregiver_id INTEGER NOT NULL REFERENCES users(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    observation_date TEXT NOT NULL,
    mood_level TEXT CHECK(mood_level IN ('great', 'good', 'fair', 'poor')),
    pain_level INTEGER CHECK(pain_level >= 0 AND pain_level <= 10),
    energy_level TEXT CHECK(energy_level IN ('high', 'medium', 'low')),
    appetite TEXT CHECK(appetite IN ('good', 'fair', 'poor')),
    sleep_quality TEXT CHECK(sleep_quality IN ('good', 'fair', 'poor')),
    mobility_observations TEXT,
    notes TEXT,
    concerns TEXT,
    questions_for_provider TEXT,
    ai_summary TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Discharge checklists
CREATE TABLE discharge_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    caregiver_id INTEGER REFERENCES users(id),
    equipment_needs TEXT DEFAULT '{}',
    home_modifications TEXT DEFAULT '{}',
    medication_review TEXT DEFAULT '{}',
    follow_up_appointments TEXT DEFAULT '[]',
    emergency_contacts TEXT DEFAULT '[]',
    warning_signs TEXT DEFAULT '{}',
    home_exercise_plan TEXT DEFAULT '{}',
    diet_restrictions TEXT DEFAULT '{}',
    completion_percent INTEGER DEFAULT 0,
    completed_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Caregiver notifications
CREATE TABLE caregiver_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caregiver_id INTEGER NOT NULL REFERENCES users(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    notification_type TEXT NOT NULL CHECK(notification_type IN ('goal_completed', 'streak_extended', 'session_logged', 'access_approved', 'access_request', 'access_denied')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    is_read INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Caregiver achievements
CREATE TABLE caregiver_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caregiver_id INTEGER NOT NULL REFERENCES users(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('first_checkin', 'consistent_supporter', 'encouragement_champion', 'discharge_ready', 'super_supporter', 'week_streak', 'observation_master')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    is_unlocked INTEGER DEFAULT 0,
    unlocked_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Create indexes
CREATE INDEX idx_sessions_expire ON sessions(expire);
CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX idx_provider_patients_provider_id ON provider_patients(provider_id);
CREATE INDEX idx_provider_patients_patient_id ON provider_patients(patient_id);
CREATE INDEX idx_risk_assessments_patient_id ON risk_assessments(patient_id);
CREATE INDEX idx_patient_goals_patient_id ON patient_goals(patient_id);
CREATE INDEX idx_exercise_sessions_patient_id ON exercise_sessions(patient_id);
CREATE INDEX idx_exercise_sessions_date ON exercise_sessions(session_date);
CREATE INDEX idx_patient_stats_patient_id ON patient_stats(patient_id);
CREATE INDEX idx_feed_items_patient_id ON feed_items(patient_id);
CREATE INDEX idx_feed_items_unit ON feed_items(unit);
CREATE INDEX idx_kudos_reactions_feed_item_id ON kudos_reactions(feed_item_id);

-- Caregiver indexes
CREATE INDEX idx_caregiver_patients_caregiver_id ON caregiver_patients(caregiver_id);
CREATE INDEX idx_caregiver_patients_patient_id ON caregiver_patients(patient_id);
CREATE INDEX idx_caregiver_patients_access_status ON caregiver_patients(access_status);
CREATE INDEX idx_caregiver_observations_patient_id ON caregiver_observations(patient_id);
CREATE INDEX idx_caregiver_observations_date ON caregiver_observations(observation_date);
CREATE INDEX idx_caregiver_notifications_caregiver_id ON caregiver_notifications(caregiver_id);
CREATE INDEX idx_caregiver_notifications_is_read ON caregiver_notifications(is_read);
CREATE INDEX idx_discharge_checklists_patient_id ON discharge_checklists(patient_id);
`;

console.log('📊 Creating tables...');
sqlite.exec(createTables);

// Insert seed data
console.log('🌱 Inserting seed data...');

// Insert default provider (Heidi Kissane, DPT)
sqlite.exec(`
INSERT INTO users (email, first_name, last_name, user_type, provider_role, credentials, specialty, is_active)
VALUES ('heidikissane@hospital.com', 'Heidi', 'Kissane', 'provider', 'physical_therapist', 'DPT', 'Physical Therapy', 1);
`);

// Insert default patient (Neil Jairath)
sqlite.exec(`
INSERT INTO users (email, first_name, last_name, user_type, date_of_birth, is_active)
VALUES ('neil.jairath@patient.com', 'Neil', 'Jairath', 'patient', '1996-04-01', 1);
`);

// Insert default devices
sqlite.exec(`
INSERT INTO devices (id, name, status) VALUES
  ('121', 'Bedside Bike 121', 'available'),
  ('122', 'Bedside Bike 122', 'available'),
  ('123', 'Bedside Bike 123', 'available');
`);

console.log('\n✅ Local database initialized successfully!');
console.log('📁 Database file: local.db');
console.log('\n👤 Seed users created:');
console.log('   Provider: heidikissane@hospital.com (Heidi Kissane, DPT)');
console.log('   Patient: neil.jairath@patient.com (Neil Jairath)');
console.log('\n🚴 Devices created: 121, 122, 123');
console.log('\n🚀 Ready to start development with: npm run dev\n');

sqlite.close();
