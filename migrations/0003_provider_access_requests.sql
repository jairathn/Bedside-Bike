-- Bedside Bike - Provider Access Request System Migration
-- Generated: 2026-01-15
-- For: PostgreSQL (Supabase)
-- Description: Adds bidirectional access request workflow for providers and patients

-- =====================================================
-- 1. UPDATE PROVIDER_PATIENTS TABLE - Add access request workflow
-- =====================================================

-- Add access request workflow columns to provider_patients table
ALTER TABLE provider_patients ADD COLUMN IF NOT EXISTS access_status VARCHAR(20) DEFAULT 'pending'
  CHECK (access_status IN ('pending', 'approved', 'denied', 'revoked'));
ALTER TABLE provider_patients ADD COLUMN IF NOT EXISTS requested_by VARCHAR(20) DEFAULT 'patient'
  CHECK (requested_by IN ('patient', 'provider'));
ALTER TABLE provider_patients ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE provider_patients ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE provider_patients ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ;

-- Index for access request queries
CREATE INDEX IF NOT EXISTS idx_provider_patients_access_status ON provider_patients(access_status);
CREATE INDEX IF NOT EXISTS idx_provider_patients_requested_by ON provider_patients(requested_by);

-- =====================================================
-- 2. PROVIDER NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS provider_notifications (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'access_request', 'access_approved', 'access_denied', 'access_revoked'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for provider notification queries
CREATE INDEX IF NOT EXISTS idx_provider_notifications_provider ON provider_notifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_patient ON provider_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_unread ON provider_notifications(provider_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_provider_notifications_type ON provider_notifications(notification_type);

-- =====================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on provider_notifications
ALTER TABLE provider_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Providers can view their own notifications
DROP POLICY IF EXISTS provider_notifications_select_own ON provider_notifications;
CREATE POLICY provider_notifications_select_own ON provider_notifications
    FOR SELECT
    USING (
        provider_id IN (
            SELECT id FROM users WHERE email = current_user
        )
    );

-- Policy: System can insert notifications
DROP POLICY IF EXISTS provider_notifications_insert ON provider_notifications;
CREATE POLICY provider_notifications_insert ON provider_notifications
    FOR INSERT
    WITH CHECK (true);

-- Policy: Providers can update their own notifications (mark as read)
DROP POLICY IF EXISTS provider_notifications_update_own ON provider_notifications;
CREATE POLICY provider_notifications_update_own ON provider_notifications
    FOR UPDATE
    USING (
        provider_id IN (
            SELECT id FROM users WHERE email = current_user
        )
    );

-- =====================================================
-- 4. UPDATE EXISTING PROVIDER_PATIENTS DATA
-- =====================================================

-- Set existing relationships (where permission_granted = true) to 'approved' status
UPDATE provider_patients
SET access_status = 'approved',
    requested_by = 'patient',
    approved_at = COALESCE(granted_at, created_at)
WHERE permission_granted = true AND access_status IS NULL;

-- Set existing relationships (where permission_granted = false) to 'pending' status
UPDATE provider_patients
SET access_status = 'pending',
    requested_by = 'patient'
WHERE permission_granted = false AND access_status IS NULL;

-- =====================================================
-- 5. UPDATE CAREGIVER_PATIENTS TABLE - Add requested_by field
-- =====================================================

-- Add requested_by column to caregiver_patients table for bidirectional flow
ALTER TABLE caregiver_patients ADD COLUMN IF NOT EXISTS requested_by VARCHAR(20) DEFAULT 'caregiver'
  CHECK (requested_by IN ('caregiver', 'patient'));

-- Index for caregiver request queries
CREATE INDEX IF NOT EXISTS idx_caregiver_patients_requested_by ON caregiver_patients(requested_by);

-- =====================================================
-- 6. HELPFUL COMMENTS
-- =====================================================

COMMENT ON COLUMN provider_patients.access_status IS 'Access request status: pending, approved, denied, or revoked';
COMMENT ON COLUMN provider_patients.requested_by IS 'Who initiated the access request: patient or provider';
COMMENT ON COLUMN provider_patients.requested_at IS 'When the access request was made';
COMMENT ON COLUMN provider_patients.approved_at IS 'When the access was approved';
COMMENT ON COLUMN provider_patients.denied_at IS 'When the access was denied';

COMMENT ON TABLE provider_notifications IS 'In-app notifications for providers about patient access requests';
COMMENT ON COLUMN provider_notifications.notification_type IS 'Type of notification: access_request, access_approved, access_denied, access_revoked';

COMMENT ON COLUMN caregiver_patients.requested_by IS 'Who initiated the access request: patient or caregiver';
