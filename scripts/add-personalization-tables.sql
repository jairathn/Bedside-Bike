-- Add missing personalization tables to local.db

-- Patient personalization profiles
CREATE TABLE IF NOT EXISTS patient_personalization_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    personality_type TEXT,
    personality_confidence REAL DEFAULT 0,
    best_performance_window TEXT,
    avg_morning_power REAL,
    avg_afternoon_power REAL,
    avg_evening_power REAL,
    responds_to_competition INTEGER DEFAULT 0,
    responds_to_badges INTEGER DEFAULT 0,
    responds_to_health_messages INTEGER DEFAULT 0,
    responds_to_caregiver_sharing INTEGER DEFAULT 0,
    baseline_fatigue_threshold REAL,
    typical_recovery_time_minutes INTEGER,
    overexertion_event_count INTEGER DEFAULT 0,
    preferred_resistance_level REAL,
    avg_resistance_preference REAL,
    preferred_session_duration_minutes INTEGER,
    resistance_adaptability_score REAL,
    max_comfortable_resistance REAL,
    optimal_progression_rate REAL DEFAULT 1.0,
    setback_frequency REAL DEFAULT 0,
    recovery_responsiveness REAL,
    typical_adaptation_days INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Session performance metrics
CREATE TABLE IF NOT EXISTS session_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES exercise_sessions(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    avg_power REAL,
    max_power REAL,
    power_variability REAL,
    avg_cadence REAL,
    cadence_consistency REAL,
    resistance_level REAL,
    resistance_changes INTEGER DEFAULT 0,
    performance_score REAL,
    fatigue_detected INTEGER DEFAULT 0,
    fatigue_onset_minute INTEGER,
    power_drop_percentage REAL,
    recovery_observed INTEGER DEFAULT 0,
    symmetry_score REAL,
    left_right_imbalance REAL,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Fatigue events
CREATE TABLE IF NOT EXISTS fatigue_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES exercise_sessions(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    detection_timestamp INTEGER NOT NULL,
    power_before REAL NOT NULL,
    power_after REAL NOT NULL,
    power_drop_percentage REAL NOT NULL,
    cadence_before REAL,
    cadence_after REAL,
    resistance_before REAL NOT NULL,
    resistance_after REAL,
    auto_reduced INTEGER DEFAULT 0,
    resistance_reduction_amount REAL,
    recovery_duration_minutes INTEGER,
    session_continued INTEGER DEFAULT 1,
    provider_notified INTEGER DEFAULT 0,
    notes TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Medication interactions
CREATE TABLE IF NOT EXISTS medication_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_name TEXT NOT NULL UNIQUE,
    generic_name TEXT,
    medication_class TEXT NOT NULL,
    exercise_interaction TEXT NOT NULL CHECK(exercise_interaction IN ('safe', 'caution', 'contraindicated')),
    interaction_type TEXT,
    physiological_effects TEXT,
    recommended_modifications TEXT,
    monitoring_required TEXT,
    intensity_impact TEXT,
    hr_impact TEXT CHECK(hr_impact IN ('increases', 'decreases', 'blunts', 'none')),
    bp_impact TEXT CHECK(bp_impact IN ('increases', 'decreases', 'hypotension_risk', 'none')),
    arrhythmia_risk INTEGER DEFAULT 0,
    fall_risk_increase INTEGER DEFAULT 0,
    coordination_impairment INTEGER DEFAULT 0,
    endurance_impact TEXT,
    notes TEXT,
    evidence_citation TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Contraindication verifications
CREATE TABLE IF NOT EXISTS contraindication_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    medication_id INTEGER NOT NULL REFERENCES medication_interactions(id),
    verified_by INTEGER NOT NULL REFERENCES users(id),
    verification_date INTEGER NOT NULL,
    interaction_severity TEXT NOT NULL CHECK(interaction_severity IN ('none', 'mild', 'moderate', 'severe')),
    recommended_action TEXT NOT NULL,
    goal_adjustments TEXT,
    provider_acknowledged INTEGER DEFAULT 0,
    acknowledged_at INTEGER,
    notes TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Mobility scores
CREATE TABLE IF NOT EXISTS mobility_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    scored_at INTEGER NOT NULL,
    bike_score REAL,
    ambulation_score REAL,
    pt_score REAL,
    nursing_score REAL,
    adl_score REAL,
    component_weights TEXT,
    unified_score REAL NOT NULL,
    score_confidence REAL,
    barthel_index INTEGER,
    functional_independence_measure INTEGER,
    score_trend TEXT,
    trend_magnitude REAL,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Cohort comparisons
CREATE TABLE IF NOT EXISTS cohort_comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    comparison_date INTEGER NOT NULL,
    cohort_definition TEXT NOT NULL,
    cohort_size INTEGER NOT NULL,
    patient_percentile INTEGER,
    patient_duration_avg REAL,
    cohort_duration_avg REAL,
    patient_power_avg REAL,
    cohort_power_avg REAL,
    patient_consistency_score REAL,
    cohort_consistency_avg REAL,
    patient_progression_rate REAL,
    cohort_progression_avg REAL,
    insights TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Virtual competitions
CREATE TABLE IF NOT EXISTS virtual_competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_name TEXT NOT NULL,
    competition_type TEXT NOT NULL CHECK(competition_type IN ('distance', 'duration', 'consistency', 'power')),
    description TEXT,
    start_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    eligibility_criteria TEXT,
    min_participants INTEGER DEFAULT 2,
    max_participants INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Competition participants
CREATE TABLE IF NOT EXISTS competition_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_id INTEGER NOT NULL REFERENCES virtual_competitions(id),
    patient_id INTEGER NOT NULL REFERENCES users(id),
    display_name TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    current_score REAL DEFAULT 0,
    current_rank INTEGER,
    last_activity INTEGER,
    sessions_completed INTEGER DEFAULT 0,
    total_distance_meters REAL DEFAULT 0,
    total_duration_minutes REAL DEFAULT 0,
    avg_power REAL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Insurance reports
CREATE TABLE IF NOT EXISTS insurance_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    generated_by INTEGER NOT NULL REFERENCES users(id),
    report_date INTEGER NOT NULL,
    report_type TEXT NOT NULL CHECK(report_type IN ('medicare', 'medicaid', 'commercial', 'other')),
    report_period_start INTEGER NOT NULL,
    report_period_end INTEGER NOT NULL,
    medical_necessity_justification TEXT NOT NULL,
    icd_codes TEXT NOT NULL,
    cpt_codes TEXT NOT NULL,
    total_sessions INTEGER NOT NULL,
    total_minutes INTEGER NOT NULL,
    progress_summary TEXT NOT NULL,
    functional_outcomes TEXT NOT NULL,
    adherence_rate REAL,
    complications TEXT,
    continued_need_justification TEXT,
    discharge_plan TEXT,
    report_data TEXT NOT NULL,
    submitted_to_payer INTEGER DEFAULT 0,
    submitted_at INTEGER,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'denied')),
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

-- Fall risk predictions
CREATE TABLE IF NOT EXISTS fall_risk_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    prediction_date INTEGER NOT NULL,
    risk_score REAL NOT NULL,
    risk_category TEXT NOT NULL CHECK(risk_category IN ('low', 'moderate', 'high', 'very_high')),
    contributing_factors TEXT NOT NULL,
    bike_performance_factor REAL,
    medication_factor REAL,
    cognitive_factor REAL,
    history_factor REAL,
    environmental_factor REAL,
    recommendations TEXT NOT NULL,
    confidence REAL NOT NULL,
    model_version TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

-- Create indexes for personalization tables
CREATE INDEX IF NOT EXISTS idx_personalization_profiles_patient_id ON patient_personalization_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_performance_session_id ON session_performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_session_performance_patient_id ON session_performance_metrics(patient_id);
CREATE INDEX IF NOT EXISTS idx_fatigue_events_session_id ON fatigue_events(session_id);
CREATE INDEX IF NOT EXISTS idx_fatigue_events_patient_id ON fatigue_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_contraindication_verifications_patient_id ON contraindication_verifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_mobility_scores_patient_id ON mobility_scores(patient_id);
CREATE INDEX IF NOT EXISTS idx_mobility_scores_timestamp ON mobility_scores(score_timestamp);
CREATE INDEX IF NOT EXISTS idx_cohort_comparisons_patient_id ON cohort_comparisons(patient_id);
CREATE INDEX IF NOT EXISTS idx_competition_participants_competition_id ON competition_participants(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_participants_patient_id ON competition_participants(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_reports_patient_id ON insurance_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_fall_risk_predictions_patient_id ON fall_risk_predictions(patient_id);
