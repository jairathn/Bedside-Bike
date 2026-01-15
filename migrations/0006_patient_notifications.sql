-- Migration: Add patient_notifications table
-- Allows patients to receive notifications when providers/caregivers respond to invitations

CREATE TABLE IF NOT EXISTS patient_notifications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id),
    sender_id INTEGER REFERENCES users(id),
    sender_type VARCHAR(20), -- 'provider', 'caregiver'
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'provider_accepted', 'provider_declined',
        'caregiver_accepted', 'caregiver_declined',
        'access_revoked', 'general'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_notifications_patient_id ON patient_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notifications_is_read ON patient_notifications(patient_id, is_read);

COMMENT ON TABLE patient_notifications IS 'In-app notifications for patients (e.g., when providers/caregivers accept or decline invitations)';
COMMENT ON COLUMN patient_notifications.sender_type IS 'Type of user who triggered the notification: provider or caregiver';
COMMENT ON COLUMN patient_notifications.notification_type IS 'Type of notification: provider_accepted, provider_declined, caregiver_accepted, caregiver_declined, access_revoked, general';
