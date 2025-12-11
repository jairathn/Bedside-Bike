-- Fix mobility_scores table to match Drizzle schema

DROP TABLE IF EXISTS mobility_scores;

CREATE TABLE mobility_scores (
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

CREATE INDEX IF NOT EXISTS idx_mobility_scores_patient_id ON mobility_scores(patient_id);
CREATE INDEX IF NOT EXISTS idx_mobility_scores_scored_at ON mobility_scores(scored_at);
