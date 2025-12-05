-- Bedside Bike - Azure SQL Database Schema Migration
-- Generated: 2025-12-05
-- Database: BesideBikeDB
-- Server: beside-bike-server.database.windows.net

-- Drop existing tables if they exist (in reverse dependency order)
IF OBJECT_ID('kudos_reactions', 'U') IS NOT NULL DROP TABLE kudos_reactions;
IF OBJECT_ID('nudge_messages', 'U') IS NOT NULL DROP TABLE nudge_messages;
IF OBJECT_ID('feed_items', 'U') IS NOT NULL DROP TABLE feed_items;
IF OBJECT_ID('patient_preferences', 'U') IS NOT NULL DROP TABLE patient_preferences;
IF OBJECT_ID('patient_stats', 'U') IS NOT NULL DROP TABLE patient_stats;
IF OBJECT_ID('achievements', 'U') IS NOT NULL DROP TABLE achievements;
IF OBJECT_ID('device_sessions', 'U') IS NOT NULL DROP TABLE device_sessions;
IF OBJECT_ID('exercise_sessions', 'U') IS NOT NULL DROP TABLE exercise_sessions;
IF OBJECT_ID('devices', 'U') IS NOT NULL DROP TABLE devices;
IF OBJECT_ID('patient_goals', 'U') IS NOT NULL DROP TABLE patient_goals;
IF OBJECT_ID('risk_assessments', 'U') IS NOT NULL DROP TABLE risk_assessments;
IF OBJECT_ID('provider_patients', 'U') IS NOT NULL DROP TABLE provider_patients;
IF OBJECT_ID('patient_profiles', 'U') IS NOT NULL DROP TABLE patient_profiles;
IF OBJECT_ID('sessions', 'U') IS NOT NULL DROP TABLE sessions;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;

-- =====================================================
-- 1. AUTHENTICATION & SESSION STORAGE
-- =====================================================

-- Sessions table for Express session storage
CREATE TABLE sessions (
    sid VARCHAR(255) PRIMARY KEY NOT NULL,
    sess VARCHAR(MAX) NOT NULL,
    expire DATETIME2 NOT NULL
);

CREATE INDEX IDX_session_expire ON sessions(expire);

-- =====================================================
-- 2. USERS TABLE (Unified for Patients & Providers)
-- =====================================================

CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('patient', 'provider')),
    date_of_birth DATE NULL,
    admission_date DATE NULL,
    -- Provider specific fields
    provider_role VARCHAR(50) NULL CHECK (provider_role IN ('physician', 'nurse', 'physical_therapist', 'mobility_tech', 'other')),
    credentials VARCHAR(100) NULL,
    specialty VARCHAR(100) NULL,
    license_number VARCHAR(50) NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 3. PATIENT PROFILES (Risk Assessment Data)
-- =====================================================

CREATE TABLE patient_profiles (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    age INT NOT NULL,
    sex VARCHAR(10) NULL,
    weight_kg DECIMAL(5,2) NULL,
    height_cm DECIMAL(5,2) NULL,
    level_of_care VARCHAR(20) NOT NULL CHECK (level_of_care IN ('icu', 'stepdown', 'ward', 'rehab')),
    mobility_status VARCHAR(30) NOT NULL CHECK (mobility_status IN ('bedbound', 'chair_bound', 'standing_assist', 'walking_assist', 'independent')),
    cognitive_status VARCHAR(30) NOT NULL CHECK (cognitive_status IN ('normal', 'mild_impairment', 'delirium_dementia')),
    days_immobile INT DEFAULT 0,
    admission_diagnosis VARCHAR(MAX) NULL,
    comorbidities VARCHAR(MAX) DEFAULT '[]',
    medications VARCHAR(MAX) DEFAULT '[]',
    devices VARCHAR(MAX) DEFAULT '[]',
    incontinent BIT DEFAULT 0,
    albumin_low BIT DEFAULT 0,
    baseline_function VARCHAR(20) NULL,
    on_vte_prophylaxis BIT DEFAULT 1,
    los_expected_days INT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 4. PROVIDER-PATIENT RELATIONSHIPS
-- =====================================================

CREATE TABLE provider_patients (
    id INT IDENTITY(1,1) PRIMARY KEY,
    provider_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    permission_granted BIT DEFAULT 0,
    granted_at DATETIME2 NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 5. RISK ASSESSMENTS
-- =====================================================

CREATE TABLE risk_assessments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    deconditioning VARCHAR(MAX) NOT NULL,
    vte VARCHAR(MAX) NOT NULL,
    falls VARCHAR(MAX) NOT NULL,
    pressure VARCHAR(MAX) NOT NULL,
    mobility_recommendation VARCHAR(MAX) NOT NULL,
    los_data VARCHAR(MAX) NULL,
    discharge_data VARCHAR(MAX) NULL,
    readmission_data VARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 6. PATIENT GOALS
-- =====================================================

CREATE TABLE patient_goals (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    provider_id INT NULL FOREIGN KEY REFERENCES users(id),
    goal_type VARCHAR(50) NOT NULL,
    target_value DECIMAL(8,2) NOT NULL,
    current_value DECIMAL(8,2) DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    label VARCHAR(100) NOT NULL,
    subtitle VARCHAR(200) NULL,
    period VARCHAR(20) NOT NULL,
    ai_recommended BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 7. DEVICES (Bedside Bikes)
-- =====================================================

CREATE TABLE devices (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NULL,
    status VARCHAR(20) DEFAULT 'available',
    current_patient_id INT NULL FOREIGN KEY REFERENCES users(id),
    last_used DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 8. EXERCISE SESSIONS
-- =====================================================

CREATE TABLE exercise_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    device_id VARCHAR(10) NULL FOREIGN KEY REFERENCES devices(id),
    duration INT NOT NULL,
    avg_power DECIMAL(5,2) NULL,
    max_power DECIMAL(5,2) NULL,
    resistance DECIMAL(3,1) NULL,
    session_date DATE NOT NULL,
    start_time DATETIME2 NOT NULL,
    end_time DATETIME2 NULL,
    stops_and_starts INT DEFAULT 0,
    is_completed BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 9. DEVICE SESSIONS (Tracking)
-- =====================================================

CREATE TABLE device_sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    device_id VARCHAR(10) NOT NULL FOREIGN KEY REFERENCES devices(id),
    session_id INT NOT NULL FOREIGN KEY REFERENCES exercise_sessions(id),
    started_at DATETIME2 DEFAULT GETDATE(),
    ended_at DATETIME2 NULL
);

-- =====================================================
-- 10. ACHIEVEMENTS
-- =====================================================

CREATE TABLE achievements (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    type VARCHAR(MAX) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(MAX) NOT NULL,
    xp_reward INT DEFAULT 0,
    is_unlocked BIT DEFAULT 0,
    unlocked_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 11. PATIENT STATISTICS
-- =====================================================

CREATE TABLE patient_stats (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    level INT DEFAULT 1,
    xp INT DEFAULT 0,
    total_sessions INT DEFAULT 0,
    total_duration INT DEFAULT 0,
    avg_daily_duration REAL DEFAULT 0,
    consistency_streak INT DEFAULT 0,
    last_session_date DATETIME2 NULL,
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 12. PATIENT PREFERENCES
-- =====================================================

CREATE TABLE patient_preferences (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    display_name VARCHAR(50) NOT NULL,
    avatar_emoji VARCHAR(10) DEFAULT '👤',
    opt_in_kudos BIT DEFAULT 0,
    opt_in_nudges BIT DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'general',
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 13. FEED ITEMS (Kudos Wall)
-- =====================================================

CREATE TABLE feed_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    display_name VARCHAR(50) NOT NULL,
    avatar_emoji VARCHAR(10) DEFAULT '👤',
    event_type VARCHAR(50) NOT NULL,
    template_id VARCHAR(50) NOT NULL,
    message VARCHAR(MAX) NOT NULL,
    metadata VARCHAR(MAX) DEFAULT '{}',
    unit VARCHAR(50) DEFAULT 'general',
    is_visible BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 14. NUDGE MESSAGES
-- =====================================================

CREATE TABLE nudge_messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sender_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    recipient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    feed_item_id INT NULL FOREIGN KEY REFERENCES feed_items(id),
    template_id VARCHAR(50) NOT NULL,
    message VARCHAR(MAX) NOT NULL,
    is_read BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- 15. KUDOS REACTIONS
-- =====================================================

CREATE TABLE kudos_reactions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    feed_item_id INT NOT NULL FOREIGN KEY REFERENCES feed_items(id),
    reaction_type VARCHAR(20) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

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

-- =====================================================
-- SEED DATA (Optional - for testing)
-- =====================================================

-- Insert default provider (Heidi Kissane, DPT)
INSERT INTO users (email, first_name, last_name, user_type, provider_role, credentials, specialty, is_active)
VALUES ('heidikissane@hospital.com', 'Heidi', 'Kissane', 'provider', 'physical_therapist', 'DPT', 'Physical Therapy', 1);

-- Insert default patient (Neil Jairath)
INSERT INTO users (email, first_name, last_name, user_type, date_of_birth, is_active)
VALUES ('neil.jairath@patient.com', 'Neil', 'Jairath', 'patient', '1996-04-01', 1);

-- Insert default devices
INSERT INTO devices (id, name, status) VALUES ('121', 'Bedside Bike 121', 'available');
INSERT INTO devices (id, name, status) VALUES ('122', 'Bedside Bike 122', 'available');
INSERT INTO devices (id, name, status) VALUES ('123', 'Bedside Bike 123', 'available');

PRINT 'Bedside Bike schema created successfully!';
