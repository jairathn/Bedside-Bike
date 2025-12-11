-- Fix insurance_reports table to match Drizzle schema

DROP TABLE IF EXISTS insurance_reports;

CREATE TABLE insurance_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES users(id),

    -- Report details
    report_type TEXT NOT NULL,
    generated_at INTEGER NOT NULL,
    generated_by INTEGER REFERENCES users(id),

    -- Functional capacity data
    functional_capacity_data TEXT NOT NULL,
    progress_trajectory TEXT NOT NULL,
    comparison_to_thresholds TEXT,

    -- Predictions
    predicted_time_to_independence INTEGER,
    predicted_discharge_disposition TEXT,
    prediction_confidence REAL,

    -- Report content
    report_content TEXT NOT NULL,
    report_pdf TEXT,

    -- Approval workflow
    clinician_approved INTEGER DEFAULT 0,
    approved_by INTEGER REFERENCES users(id),
    approved_at INTEGER,

    -- Submission tracking
    submitted_to_insurance INTEGER DEFAULT 0,
    submitted_at INTEGER,
    insurance_response TEXT,

    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_insurance_reports_patient_id ON insurance_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_reports_generated_at ON insurance_reports(generated_at);
