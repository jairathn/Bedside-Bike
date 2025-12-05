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
DROP TABLE IF EXISTS kudos_reactions;
DROP TABLE IF EXISTS nudge_messages;
DROP TABLE IF EXISTS feed_items;
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
    user_type TEXT NOT NULL CHECK(user_type IN ('patient', 'provider')),
    date_of_birth TEXT,
    admission_date TEXT,
    provider_role TEXT CHECK(provider_role IN ('physician', 'nurse', 'physical_therapist', 'mobility_tech', 'other')),
    credentials TEXT,
    specialty TEXT,
    license_number TEXT,
    is_active INTEGER DEFAULT 1,
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
    resistance REAL,
    session_date TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    stops_and_starts INTEGER DEFAULT 0,
    is_completed INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
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
