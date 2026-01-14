-- Bedside Bike - Caregiver Engagement System Migration
-- Generated: 2026-01-14
-- For: PostgreSQL (Supabase)

-- =====================================================
-- 1. UPDATE USERS TABLE - Add caregiver support
-- =====================================================

-- Add caregiver to user_type check constraint
-- First, drop the existing constraint and recreate with caregiver
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('patient', 'provider', 'caregiver'));

-- Add caregiver-specific columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tos_version VARCHAR(10);

-- =====================================================
-- 2. CAREGIVER-PATIENT RELATIONSHIPS
-- =====================================================

CREATE TABLE IF NOT EXISTS caregiver_patients (
    id SERIAL PRIMARY KEY,
    caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
        'spouse', 'partner', 'child', 'parent', 'sibling',
        'friend', 'other_family', 'professional_caregiver'
    )),
    access_status VARCHAR(20) DEFAULT 'pending' CHECK (access_status IN (
        'pending', 'approved', 'denied', 'revoked'
    )),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    can_log_sessions BOOLEAN DEFAULT true,
    can_view_reports BOOLEAN DEFAULT true,
    can_send_nudges BOOLEAN DEFAULT true,
    supporter_xp INTEGER DEFAULT 0,
    supporter_level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(caregiver_id, patient_id)
);

-- Indexes for caregiver queries
CREATE INDEX IF NOT EXISTS idx_caregiver_patients_caregiver ON caregiver_patients(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_patients_patient ON caregiver_patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_patients_status ON caregiver_patients(access_status);

-- =====================================================
-- 3. CAREGIVER OBSERVATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS caregiver_observations (
    id SERIAL PRIMARY KEY,
    caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    mood_level VARCHAR(20) CHECK (mood_level IN ('great', 'good', 'fair', 'poor')),
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    energy_level VARCHAR(20) CHECK (energy_level IN ('high', 'medium', 'low')),
    appetite VARCHAR(20) CHECK (appetite IN ('good', 'fair', 'poor')),
    sleep_quality VARCHAR(20) CHECK (sleep_quality IN ('good', 'fair', 'poor')),
    mobility_observations TEXT,
    notes TEXT,
    concerns TEXT,
    questions_for_provider TEXT,
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for observation queries
CREATE INDEX IF NOT EXISTS idx_caregiver_observations_patient ON caregiver_observations(patient_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_observations_date ON caregiver_observations(observation_date);
CREATE INDEX IF NOT EXISTS idx_caregiver_observations_caregiver ON caregiver_observations(caregiver_id);

-- =====================================================
-- 4. DISCHARGE CHECKLISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS discharge_checklists (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caregiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    equipment_needs JSONB DEFAULT '{}',
    home_modifications JSONB DEFAULT '{}',
    medication_review JSONB DEFAULT '{}',
    follow_up_appointments JSONB DEFAULT '[]',
    emergency_contacts JSONB DEFAULT '[]',
    warning_signs JSONB DEFAULT '{}',
    home_exercise_plan JSONB DEFAULT '{}',
    completion_percent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(patient_id)
);

-- =====================================================
-- 5. CAREGIVER NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS caregiver_notifications (
    id SERIAL PRIMARY KEY,
    caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'session_logged', 'goal_completed', 'streak_extended',
        'milestone_reached', 'observation_reminder', 'nudge_response',
        'access_approved', 'access_denied', 'access_revoked'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_caregiver_notifications_caregiver ON caregiver_notifications(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_notifications_read ON caregiver_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_caregiver_notifications_created ON caregiver_notifications(created_at DESC);

-- =====================================================
-- 6. CAREGIVER ACHIEVEMENTS / GAMIFICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS caregiver_achievements (
    id SERIAL PRIMARY KEY,
    caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    xp_reward INTEGER DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for achievement queries
CREATE INDEX IF NOT EXISTS idx_caregiver_achievements_caregiver ON caregiver_achievements(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_achievements_unlocked ON caregiver_achievements(is_unlocked);

-- =====================================================
-- 7. SESSION ATTRIBUTION (extend exercise_sessions)
-- =====================================================

-- Add columns to track who logged the session
-- Note: Column names must match Drizzle schema: logged_by_id, logger_type
ALTER TABLE exercise_sessions ADD COLUMN IF NOT EXISTS logged_by_id INTEGER REFERENCES users(id);
ALTER TABLE exercise_sessions ADD COLUMN IF NOT EXISTS logger_type VARCHAR(20)
  CHECK (logger_type IN ('patient', 'provider', 'caregiver', 'device'));

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- =====================================================

-- Enable RLS on caregiver tables
ALTER TABLE caregiver_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharge_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_achievements ENABLE ROW LEVEL SECURITY;

-- Note: You may want to add specific RLS policies based on your auth setup
-- Example policy for caregivers to see only their own relationships:
-- CREATE POLICY "Caregivers can view their own relationships"
--   ON caregiver_patients FOR SELECT
--   USING (caregiver_id = auth.uid());

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE caregiver_patients IS 'Relationships between caregivers and patients they support';
COMMENT ON TABLE caregiver_observations IS 'Daily observations logged by caregivers about patient status';
COMMENT ON TABLE discharge_checklists IS 'Discharge preparation checklists for patients';
COMMENT ON TABLE caregiver_notifications IS 'Notifications for caregivers about patient progress';
COMMENT ON TABLE caregiver_achievements IS 'Gamification achievements for caregiver engagement';

COMMENT ON COLUMN caregiver_patients.supporter_xp IS 'Experience points earned through engagement activities';
COMMENT ON COLUMN caregiver_patients.supporter_level IS 'Caregiver supporter level (1-10+)';
COMMENT ON COLUMN caregiver_observations.ai_summary IS 'AI-generated summary for provider review';
