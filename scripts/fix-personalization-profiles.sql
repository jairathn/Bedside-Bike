-- Fix patient_personalization_profiles table to match schema

DROP TABLE IF EXISTS patient_personalization_profiles;

CREATE TABLE patient_personalization_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),

    -- Personality type for engagement
    personality_type TEXT,
    personality_confidence REAL DEFAULT 0,

    -- Circadian patterns
    best_performance_window TEXT,
    avg_morning_power REAL,
    avg_afternoon_power REAL,
    avg_evening_power REAL,

    -- Response patterns for interventions
    responds_to_competition INTEGER DEFAULT 0,
    responds_to_badges INTEGER DEFAULT 0,
    responds_to_health_messages INTEGER DEFAULT 0,
    responds_to_caregiver_sharing INTEGER DEFAULT 0,

    -- Fatigue patterns
    avg_fatigue_onset_minutes REAL,
    fatigue_decay_rate REAL,
    optimal_session_duration REAL,

    -- Progressive overload tracking
    current_progression_level INTEGER DEFAULT 1,
    days_at_current_level INTEGER DEFAULT 0,
    last_progression_date INTEGER,
    consecutive_successful_sessions INTEGER DEFAULT 0,

    -- Setback tracking
    in_setback_recovery INTEGER DEFAULT 0,
    setback_start_date INTEGER,
    pre_setback_level INTEGER,

    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_personalization_profiles_patient_id ON patient_personalization_profiles(patient_id);
