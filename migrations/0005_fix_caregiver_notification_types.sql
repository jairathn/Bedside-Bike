-- Migration: Add 'access_request' to caregiver_notifications notification_type constraint
-- This allows caregivers to receive invitation notifications from patients

-- Drop the old constraint and add the new one with 'access_request' included
ALTER TABLE caregiver_notifications
DROP CONSTRAINT IF EXISTS caregiver_notifications_notification_type_check;

ALTER TABLE caregiver_notifications
ADD CONSTRAINT caregiver_notifications_notification_type_check
CHECK (notification_type IN (
    'session_logged', 'goal_completed', 'streak_extended',
    'milestone_reached', 'observation_reminder', 'nudge_response',
    'access_approved', 'access_denied', 'access_revoked', 'access_request'
));
