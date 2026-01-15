-- Bedside Bike - Patient Physical Measurements and Risk Assessment Persistence Migration
-- Generated: 2026-01-15
-- For: PostgreSQL (Supabase)
-- Description: Adds sex field to users table, provider tracking and input persistence to risk assessments

-- =====================================================
-- 1. ADD SEX FIELD TO USERS TABLE
-- =====================================================

-- Add sex column for patient physical measurements
-- Required for new patient registrations
ALTER TABLE users ADD COLUMN IF NOT EXISTS sex VARCHAR(10)
  CHECK (sex IN ('male', 'female', 'other'));

-- Index for sex-based queries
CREATE INDEX IF NOT EXISTS idx_users_sex ON users(sex);

-- =====================================================
-- 2. ADD PROVIDER TRACKING TO RISK ASSESSMENTS
-- =====================================================

-- Add provider_id to track which provider created the assessment
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES users(id);

-- Add input_data column to store all calculator input values
-- This enables persistence of provider-entered data for patient auto-population
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS input_data JSONB;

-- Index for provider-generated assessments
CREATE INDEX IF NOT EXISTS idx_risk_assessments_provider_id ON risk_assessments(provider_id);

-- Index for finding assessments with provider data
CREATE INDEX IF NOT EXISTS idx_risk_assessments_has_input_data ON risk_assessments(patient_id)
  WHERE input_data IS NOT NULL;

-- =====================================================
-- 3. UPDATE EXISTING DEMO PATIENTS (OPTIONAL)
-- =====================================================

-- Update Robert Martinez (Hospital Patient - COPD + Parkinson's)
UPDATE users
SET sex = 'male', height_cm = 172, weight_kg = 78.5
WHERE email = 'hospital.patient@bedside-bike.local'
  AND (sex IS NULL OR height_cm IS NULL OR weight_kg IS NULL);

-- Update Dorothy Chen (Inpatient Rehab - Hip Fracture + Diabetes)
UPDATE users
SET sex = 'female', height_cm = 160, weight_kg = 68.2
WHERE email = 'rehab.patient@bedside-bike.local'
  AND (sex IS NULL OR height_cm IS NULL OR weight_kg IS NULL);

-- Update James Thompson (SNF - Sepsis + CHF)
UPDATE users
SET sex = 'male', height_cm = 175, weight_kg = 92.5
WHERE email = 'snf.patient@bedside-bike.local'
  AND (sex IS NULL OR height_cm IS NULL OR weight_kg IS NULL);

-- =====================================================
-- 4. HELPFUL COMMENTS
-- =====================================================

COMMENT ON COLUMN users.sex IS 'Patient biological sex: male, female, or other (required for risk calculations)';
COMMENT ON COLUMN risk_assessments.provider_id IS 'The provider who created this assessment (null for patient-generated)';
COMMENT ON COLUMN risk_assessments.input_data IS 'All calculator input values saved when provider generates assessment - used to auto-populate patient calculator view';
