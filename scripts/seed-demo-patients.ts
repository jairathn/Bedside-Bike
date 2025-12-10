/**
 * Seed 3 comprehensive demo patients for demonstration
 *
 * Hospital Patient: 70yo with COPD exacerbation and Parkinson's, 5 days admitted
 * Inpatient Rehab Patient: 82yo hip fracture with diabetes, 12 days admitted
 * SNF Patient: 65yo recovering from sepsis with heart failure, 17 days admitted
 */

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'local.db');
const db = new Database(dbPath);

// Calculate birth dates (Jan 1, backdated to match age)
const currentYear = new Date().getFullYear();
const hospitalPatientDOB = `${currentYear - 70}-01-01`;
const rehabPatientDOB = `${currentYear - 82}-01-01`;
const snfPatientDOB = `${currentYear - 65}-01-01`;

// Calculate admission dates
const today = new Date();
const hospitalAdmissionDate = new Date(today);
hospitalAdmissionDate.setDate(today.getDate() - 5);

const rehabAdmissionDate = new Date(today);
rehabAdmissionDate.setDate(today.getDate() - 12);

const snfAdmissionDate = new Date(today);
snfAdmissionDate.setDate(today.getDate() - 17);

console.log('🏥 Seeding comprehensive demo patients...\n');

// Get Heidi Kissane's provider ID
const heidi = db.prepare('SELECT id FROM users WHERE email = ?').get('heidikissane@hospital.com') as any;
if (!heidi) {
  console.error('❌ Provider Heidi Kissane not found. Please run db:init first.');
  process.exit(1);
}
const providerId = heidi.id;

// ==========================================
// 1. HOSPITAL PATIENT - COPD & Parkinson's
// ==========================================

console.log('Creating Hospital Patient (COPD + Parkinson\'s)...');

// Create user
const hospitalPatient = db.prepare(`
  INSERT INTO users (
    email, firstName, lastName, dateOfBirth, userType,
    admissionDate, mrn, roomNumber, unit, isActive, createdAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  'hospital.patient@bedside-bike.local',
  'Robert',
  'Martinez',
  hospitalPatientDOB,
  'patient',
  hospitalAdmissionDate.toISOString().split('T')[0],
  'MRN-2025-001',
  '512A',
  'Medical ICU',
  1,
  Date.now()
) as any;

// Create comprehensive patient profile
db.prepare(`
  INSERT INTO patient_profiles (
    user_id, sex, weight_kg, height_cm, bmi,
    level_of_care, mobility_status, cognitive_status, baseline_function,
    admission_diagnosis, comorbidities, medications, devices,
    incontinent, albumin_low, on_vte_prophylaxis, risk_level,
    fall_risk_score, deconditioning_risk_score,
    frailty_index, barthel_index, fim_score, hospital_mobility_score,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  hospitalPatient.id,
  'M',
  78.5,
  172,
  26.5,
  'ICU',
  'bed_bound',
  'alert_oriented',
  'independent',
  'COPD exacerbation with acute respiratory failure',
  JSON.stringify(['COPD', 'Parkinson\'s Disease', 'Hypertension']),
  JSON.stringify([
    'Albuterol inhaler 90mcg q4h PRN',
    'Ipratropium nebulizer q6h',
    'Carbidopa-Levodopa 25-100mg TID',
    'Lisinopril 10mg daily',
    'Heparin 5000 units SQ q12h'
  ]),
  JSON.stringify(['oxygen_therapy', 'telemetry']),
  0,
  0,
  1,
  'high',
  65,
  75,
  0.35,
  45,
  48,
  12,
  Date.now()
);

// Create risk assessment
const hospitalRiskAssessment = db.prepare(`
  INSERT INTO risk_assessments (
    patient_id, deconditioning, vte, falls, pressure,
    mobility_recommendation, los_data, discharge_data, readmission_data,
    mobility_benefits, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  hospitalPatient.id,
  JSON.stringify({ probability: 0.78, severity: 'high', factors: ['bed_bound', 'ICU_stay', 'age_over_65'] }),
  JSON.stringify({ probability: 0.42, severity: 'moderate', factors: ['immobile', 'on_prophylaxis'] }),
  JSON.stringify({ probability: 0.68, severity: 'high', factors: ['parkinsons', 'mobility_impaired'] }),
  JSON.stringify({ probability: 0.55, severity: 'moderate', factors: ['bed_bound', 'poor_nutrition'] }),
  JSON.stringify({
    protocol: 'COPD/Respiratory - Modified Protocol',
    startDuration: 5,
    targetDuration: 10,
    frequency: 'BID',
    progressionCriteria: ['SpO2 > 90% on room air', 'No dyspnea at rest', 'Tolerates 5min sessions']
  }),
  JSON.stringify({ predicted_days: 8, confidence: 0.75 }),
  JSON.stringify({ home_likely: 0.45, rehab_likely: 0.40, snf_likely: 0.15 }),
  JSON.stringify({ risk_30day: 0.28 }),
  JSON.stringify({
    risk_reductions: {
      deconditioning: { absolute_reduction_percent: 12 },
      vte: { absolute_reduction_percent: 4 },
      falls: { absolute_reduction_percent: 8 }
    }
  }),
  Date.now()
) as any;

// Assign protocol (COPD)
const copdProtocol = db.prepare('SELECT id FROM clinical_protocols WHERE name LIKE ?').get('%COPD%') as any;
if (copdProtocol) {
  db.prepare(`
    INSERT INTO patient_protocol_assignments (
      patient_id, protocol_id, assigned_by, current_phase,
      start_date, is_active, assigned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    hospitalPatient.id,
    copdProtocol.id,
    providerId,
    0,
    hospitalAdmissionDate.toISOString().split('T')[0],
    1,
    Date.now()
  );
}

// Create exercise sessions (5 days, showing early progression)
const hospitalSessions = [];
for (let day = 0; day < 5; day++) {
  const sessionDate = new Date(hospitalAdmissionDate);
  sessionDate.setDate(sessionDate.getDate() + day);

  // BID sessions
  for (let sessionNum = 0; sessionNum < 2; sessionNum++) {
    const duration = 5 * 60 + (day * 30); // 5min → 7min progression
    const avgPower = 12 + day; // 12W → 16W
    const startTime = new Date(sessionDate);
    startTime.setHours(9 + sessionNum * 7); // 9am and 4pm
    const endTime = new Date(startTime.getTime() + duration * 1000);

    db.prepare(`
      INSERT INTO exercise_sessions (
        patient_id, session_date, start_time, end_time, duration,
        avg_power, max_power, avg_rpm, resistance, stops_and_starts,
        is_completed, session_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      hospitalPatient.id,
      sessionDate.toISOString().split('T')[0],
      startTime.toISOString(),
      endTime.toISOString(),
      duration,
      avgPower.toString(),
      (avgPower * 1.3).toString(),
      (35 + day * 2).toString(),
      (1.5 + day * 0.2).toFixed(1),
      Math.max(4 - day, 0),
      1,
      day < 2 ? 'Patient fatigued, SpO2 monitored closely' : 'Good tolerance, improving endurance',
      Date.now()
    );
  }
}

// Create goals
db.prepare(`
  INSERT INTO patient_goals (
    patient_id, provider_id, goal_type, target_value, current_value,
    unit, label, subtitle, period, is_active, created_at
  ) VALUES
  (?, ?, 'duration', '600', '0', 'seconds', 'Daily mobility target', 'COPD protocol - 10min sessions', 'daily', 1, ?),
  (?, ?, 'power', '15', '0', 'watts', 'Power output goal', 'Low intensity for respiratory recovery', 'session', 1, ?),
  (?, ?, 'sessions', '2', '0', 'sessions', 'Exercise frequency', 'BID sessions for optimal benefit', 'daily', 1, ?)
`).run(
  hospitalPatient.id, providerId, Date.now(),
  hospitalPatient.id, providerId, Date.now(),
  hospitalPatient.id, providerId, Date.now()
);

// Create patient stats
const hospitalSessionCount = 10; // 5 days × 2 sessions
db.prepare(`
  INSERT INTO patient_stats (
    patient_id, total_sessions, total_duration, avg_daily_duration,
    consistency_streak, xp, level, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  hospitalPatient.id,
  hospitalSessionCount,
  hospitalSessionCount * 5.5 * 60, // avg 5.5 min
  (hospitalSessionCount * 5.5 * 60) / 5, // per day
  5,
  hospitalSessionCount * 50 + 250, // sessions + time bonus
  2,
  Date.now()
);

// Assign to Heidi Kissane
db.prepare(`
  INSERT INTO provider_patients (
    patient_id, provider_id, permission_granted, granted_at, is_active, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`).run(hospitalPatient.id, providerId, 1, Date.now(), 1, Date.now());

console.log(`✅ Hospital Patient: ${hospitalPatient.firstName} ${hospitalPatient.lastName} (ID: ${hospitalPatient.id})`);

// ==========================================
// 2. INPATIENT REHAB - Hip Fracture + Diabetes
// ==========================================

console.log('\nCreating Inpatient Rehab Patient (Hip Fracture + Diabetes)...');

const rehabPatient = db.prepare(`
  INSERT INTO users (
    email, firstName, lastName, dateOfBirth, userType,
    admissionDate, mrn, roomNumber, unit, isActive, createdAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  'rehab.patient@bedside-bike.local',
  'Dorothy',
  'Chen',
  rehabPatientDOB,
  'patient',
  rehabAdmissionDate.toISOString().split('T')[0],
  'MRN-2025-002',
  '204B',
  'Inpatient Rehab',
  1,
  Date.now()
) as any;

// Create comprehensive patient profile
db.prepare(`
  INSERT INTO patient_profiles (
    user_id, sex, weight_kg, height_cm, bmi,
    level_of_care, mobility_status, cognitive_status, baseline_function,
    admission_diagnosis, comorbidities, medications, devices,
    incontinent, albumin_low, on_vte_prophylaxis, risk_level,
    fall_risk_score, deconditioning_risk_score,
    frailty_index, barthel_index, fim_score, hospital_mobility_score,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  rehabPatient.id,
  'F',
  68.2,
  160,
  26.6,
  'acute_rehab',
  'requires_walker',
  'alert_oriented',
  'requires_assistance',
  'Right hip fracture s/p ORIF',
  JSON.stringify(['Hip Fracture', 'Type 2 Diabetes', 'Osteoporosis', 'Hypertension']),
  JSON.stringify([
    'Metformin 1000mg BID',
    'Insulin glargine 20 units qHS',
    'Alendronate 70mg weekly',
    'Vitamin D 2000 IU daily',
    'Oxycodone 5mg q6h PRN pain',
    'Enoxaparin 40mg SQ daily'
  ]),
  JSON.stringify(['walker', 'glucose_monitor']),
  0,
  0,
  1,
  'moderate',
  45,
  58,
  0.42,
  62,
  75,
  28,
  Date.now()
);

// Create risk assessment
db.prepare(`
  INSERT INTO risk_assessments (
    patient_id, deconditioning, vte, falls, pressure,
    mobility_recommendation, los_data, discharge_data, readmission_data,
    mobility_benefits, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  rehabPatient.id,
  JSON.stringify({ probability: 0.62, severity: 'moderate', factors: ['post_surgical', 'age_over_80'] }),
  JSON.stringify({ probability: 0.35, severity: 'moderate', factors: ['post_hip_surgery', 'on_prophylaxis'] }),
  JSON.stringify({ probability: 0.72, severity: 'high', factors: ['hip_surgery', 'walker_dependent', 'age_82'] }),
  JSON.stringify({ probability: 0.38, severity: 'low', factors: ['mobile_with_walker'] }),
  JSON.stringify({
    protocol: 'Hip Fracture - Post-Surgical Protocol',
    startDuration: 10,
    targetDuration: 15,
    frequency: 'BID',
    progressionCriteria: ['Weight bearing as tolerated', 'Pain < 4/10', 'Completes 10min without rest']
  }),
  JSON.stringify({ predicted_days: 18, confidence: 0.82 }),
  JSON.stringify({ home_likely: 0.65, rehab_likely: 0.10, snf_likely: 0.25 }),
  JSON.stringify({ risk_30day: 0.18 }),
  JSON.stringify({
    risk_reductions: {
      deconditioning: { absolute_reduction_percent: 10 },
      vte: { absolute_reduction_percent: 3 },
      falls: { absolute_reduction_percent: 9 }
    }
  }),
  Date.now()
);

// Assign protocol (Hip Fracture)
const hipProtocol = db.prepare('SELECT id FROM clinical_protocols WHERE name LIKE ?').get('%Hip Fracture%') as any;
if (hipProtocol) {
  db.prepare(`
    INSERT INTO patient_protocol_assignments (
      patient_id, protocol_id, assigned_by, current_phase,
      start_date, is_active, assigned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    rehabPatient.id,
    hipProtocol.id,
    providerId,
    2, // Advanced phase
    rehabAdmissionDate.toISOString().split('T')[0],
    1,
    Date.now()
  );
}

// Create exercise sessions (12 days, strong progression)
for (let day = 0; day < 12; day++) {
  const sessionDate = new Date(rehabAdmissionDate);
  sessionDate.setDate(sessionDate.getDate() + day);

  // BID sessions, progressing well
  const sessionsPerDay = day < 3 ? 2 : 2;
  for (let sessionNum = 0; sessionNum < sessionsPerDay; sessionNum++) {
    const baseDuration = day < 3 ? 5 : (day < 7 ? 10 : 15);
    const duration = (baseDuration * 60) + (Math.random() * 60); // Some variation
    const avgPower = 18 + (day * 1.2); // 18W → 32W strong progression
    const startTime = new Date(sessionDate);
    startTime.setHours(10 + sessionNum * 6);
    const endTime = new Date(startTime.getTime() + duration * 1000);

    db.prepare(`
      INSERT INTO exercise_sessions (
        patient_id, session_date, start_time, end_time, duration,
        avg_power, max_power, avg_rpm, resistance, stops_and_starts,
        is_completed, session_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rehabPatient.id,
      sessionDate.toISOString().split('T')[0],
      startTime.toISOString(),
      endTime.toISOString(),
      Math.floor(duration),
      avgPower.toFixed(1),
      (avgPower * 1.25).toFixed(1),
      (40 + day * 1.5).toFixed(0),
      (2 + day * 0.15).toFixed(1),
      Math.max(3 - Math.floor(day / 2), 0),
      1,
      day < 3 ? 'Pain well-controlled, cautious progression' :
      day < 7 ? 'Excellent compliance, patient motivated' :
      'Outstanding progress, nearing discharge goals',
      Date.now()
    );
  }
}

// Create goals
db.prepare(`
  INSERT INTO patient_goals (
    patient_id, provider_id, goal_type, target_value, current_value,
    unit, label, subtitle, period, is_active, created_at
  ) VALUES
  (?, ?, 'duration', '900', '0', 'seconds', 'Daily mobility target', 'Hip protocol - 15min sessions', 'daily', 1, ?),
  (?, ?, 'power', '30', '0', 'watts', 'Power output goal', 'Progressive loading for strength', 'session', 1, ?),
  (?, ?, 'sessions', '2', '0', 'sessions', 'Exercise frequency', 'BID sessions for recovery', 'daily', 1, ?)
`).run(
  rehabPatient.id, providerId, Date.now(),
  rehabPatient.id, providerId, Date.now(),
  rehabPatient.id, providerId, Date.now()
);

// Create patient stats
const rehabSessionCount = 24; // 12 days × 2
db.prepare(`
  INSERT INTO patient_stats (
    patient_id, total_sessions, total_duration, avg_daily_duration,
    consistency_streak, xp, level, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  rehabPatient.id,
  rehabSessionCount,
  rehabSessionCount * 11 * 60, // avg 11 min
  (rehabSessionCount * 11 * 60) / 12,
  12,
  rehabSessionCount * 50 + 600,
  3,
  Date.now()
);

// Assign to Heidi Kissane
db.prepare(`
  INSERT INTO provider_patients (
    patient_id, provider_id, permission_granted, granted_at, is_active, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`).run(rehabPatient.id, providerId, 1, Date.now(), 1, Date.now());

console.log(`✅ Inpatient Rehab Patient: ${rehabPatient.firstName} ${rehabPatient.lastName} (ID: ${rehabPatient.id})`);

// ==========================================
// 3. SNF PATIENT - Sepsis + CHF (with setback)
// ==========================================

console.log('\nCreating SNF Patient (Sepsis + CHF with setback)...');

const snfPatient = db.prepare(`
  INSERT INTO users (
    email, firstName, lastName, dateOfBirth, userType,
    admissionDate, mrn, roomNumber, unit, isActive, createdAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  'snf.patient@bedside-bike.local',
  'James',
  'Thompson',
  snfPatientDOB,
  'patient',
  snfAdmissionDate.toISOString().split('T')[0],
  'MRN-2025-003',
  '118',
  'Skilled Nursing',
  1,
  Date.now()
) as any;

// Create comprehensive patient profile
db.prepare(`
  INSERT INTO patient_profiles (
    user_id, sex, weight_kg, height_cm, bmi,
    level_of_care, mobility_status, cognitive_status, baseline_function,
    admission_diagnosis, comorbidities, medications, devices,
    incontinent, albumin_low, on_vte_prophylaxis, risk_level,
    fall_risk_score, deconditioning_risk_score,
    frailty_index, barthel_index, fim_score, hospital_mobility_score,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  snfPatient.id,
  'M',
  92.5,
  175,
  30.2,
  'skilled_nursing',
  'requires_walker',
  'mild_confusion',
  'requires_assistance',
  'Sepsis resolved, recovering from critical illness',
  JSON.stringify(['CHF (EF 35%)', 'Sepsis (resolved)', 'CKD Stage 3', 'Obesity', 'Diabetes Type 2']),
  JSON.stringify([
    'Furosemide 40mg BID',
    'Metoprolol 50mg BID',
    'Lisinopril 20mg daily',
    'Metformin 500mg BID',
    'Insulin aspart sliding scale',
    'Aspirin 81mg daily'
  ]),
  JSON.stringify(['walker', 'oxygen_prn']),
  0,
  1,
  0,
  'high',
  58,
  82,
  0.48,
  52,
  58,
  18,
  Date.now()
);

// Create risk assessment
db.prepare(`
  INSERT INTO risk_assessments (
    patient_id, deconditioning, vte, falls, pressure,
    mobility_recommendation, los_data, discharge_data, readmission_data,
    mobility_benefits, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  snfPatient.id,
  JSON.stringify({ probability: 0.88, severity: 'high', factors: ['post_ICU', 'critical_illness_myopathy', 'prolonged_bedrest'] }),
  JSON.stringify({ probability: 0.48, severity: 'moderate', factors: ['CHF', 'obesity', 'limited_mobility'] }),
  JSON.stringify({ probability: 0.62, severity: 'moderate', factors: ['deconditioning', 'mild_confusion', 'walker_needed'] }),
  JSON.stringify({ probability: 0.52, severity: 'moderate', factors: ['obesity', 'albumin_low', 'limited_mobility'] }),
  JSON.stringify({
    protocol: 'ICU Deconditioning - Progressive Mobilization',
    startDuration: 5,
    targetDuration: 10,
    frequency: 'BID',
    progressionCriteria: ['No dyspnea', 'HR < 120', 'Tolerates 10min sessions']
  }),
  JSON.stringify({ predicted_days: 25, confidence: 0.68 }),
  JSON.stringify({ home_likely: 0.25, rehab_likely: 0.15, snf_likely: 0.60 }),
  JSON.stringify({ risk_30day: 0.42 }),
  JSON.stringify({
    risk_reductions: {
      deconditioning: { absolute_reduction_percent: 15 },
      vte: { absolute_reduction_percent: 5 },
      falls: { absolute_reduction_percent: 7 }
    }
  }),
  Date.now()
);

// Assign protocol (ICU Deconditioning)
const icuProtocol = db.prepare('SELECT id FROM clinical_protocols WHERE name LIKE ?').get('%ICU%') as any;
if (icuProtocol) {
  db.prepare(`
    INSERT INTO patient_protocol_assignments (
      patient_id, protocol_id, assigned_by, current_phase,
      start_date, is_active, assigned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    snfPatient.id,
    icuProtocol.id,
    providerId,
    1, // Progressive phase
    snfAdmissionDate.toISOString().split('T')[0],
    1,
    Date.now()
  );
}

// Create exercise sessions (17 days with setback on days 10-12)
for (let day = 0; day < 17; day++) {
  const sessionDate = new Date(snfAdmissionDate);
  sessionDate.setDate(sessionDate.getDate() + day);

  // Setback period (days 10-12): CHF exacerbation, limited sessions
  const isSetback = day >= 10 && day <= 12;
  const sessionsPerDay = isSetback ? 1 : 2;

  for (let sessionNum = 0; sessionNum < sessionsPerDay; sessionNum++) {
    let duration, avgPower, notes;

    if (isSetback) {
      // Setback: reduced performance
      duration = 3 * 60 + Math.random() * 60;
      avgPower = 8 + Math.random() * 2;
      notes = 'CHF exacerbation - session shortened, dyspnea noted';
    } else if (day < 10) {
      // Before setback: good progression
      duration = (5 + day * 0.5) * 60;
      avgPower = 10 + day * 0.8;
      notes = day < 4 ? 'Slow start, patient fatigued from sepsis' : 'Gradual improvement, good compliance';
    } else {
      // After setback: recovery
      const recoveryDay = day - 13;
      duration = (5 + recoveryDay * 0.6) * 60;
      avgPower = 10 + recoveryDay * 1.0;
      notes = 'Recovering from CHF exacerbation, cautious progression';
    }

    const startTime = new Date(sessionDate);
    startTime.setHours(10 + sessionNum * 6);
    const endTime = new Date(startTime.getTime() + duration * 1000);

    db.prepare(`
      INSERT INTO exercise_sessions (
        patient_id, session_date, start_time, end_time, duration,
        avg_power, max_power, avg_rpm, resistance, stops_and_starts,
        is_completed, session_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snfPatient.id,
      sessionDate.toISOString().split('T')[0],
      startTime.toISOString(),
      endTime.toISOString(),
      Math.floor(duration),
      avgPower.toFixed(1),
      (avgPower * 1.3).toFixed(1),
      (30 + (isSetback ? 0 : day * 1)).toFixed(0),
      (1.5 + (isSetback ? 0 : day * 0.1)).toFixed(1),
      isSetback ? 6 : Math.max(5 - Math.floor(day / 3), 1),
      1,
      notes,
      Date.now()
    );
  }
}

// Create goals
db.prepare(`
  INSERT INTO patient_goals (
    patient_id, provider_id, goal_type, target_value, current_value,
    unit, label, subtitle, period, is_active, created_at
  ) VALUES
  (?, ?, 'duration', '600', '0', 'seconds', 'Daily mobility target', 'ICU recovery - 10min sessions', 'daily', 1, ?),
  (?, ?, 'power', '15', '0', 'watts', 'Power output goal', 'Low intensity for CHF management', 'session', 1, ?),
  (?, ?, 'sessions', '2', '0', 'sessions', 'Exercise frequency', 'BID for deconditioning prevention', 'daily', 1, ?)
`).run(
  snfPatient.id, providerId, Date.now(),
  snfPatient.id, providerId, Date.now(),
  snfPatient.id, providerId, Date.now()
);

// Create patient stats
const snfSessionCount = 31; // 17 days minus setback losses
db.prepare(`
  INSERT INTO patient_stats (
    patient_id, total_sessions, total_duration, avg_daily_duration,
    consistency_streak, xp, level, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  snfPatient.id,
  snfSessionCount,
  snfSessionCount * 7 * 60, // avg 7 min
  (snfSessionCount * 7 * 60) / 17,
  4, // Broken by setback
  snfSessionCount * 50 + 350,
  2,
  Date.now()
);

// Assign to Heidi Kissane
db.prepare(`
  INSERT INTO provider_patients (
    patient_id, provider_id, permission_granted, granted_at, is_active, created_at
  ) VALUES (?, ?, ?, ?, ?, ?)
`).run(snfPatient.id, providerId, 1, Date.now(), 1, Date.now());

console.log(`✅ SNF Patient: ${snfPatient.firstName} ${snfPatient.lastName} (ID: ${snfPatient.id})`);

// ==========================================
// CROSS-PATIENT INTERACTIONS
// ==========================================

console.log('\n🤝 Creating cross-patient interactions (kudos, leaderboard)...');

// Create kudos preferences for all 3 patients
for (const patient of [hospitalPatient, rehabPatient, snfPatient]) {
  db.prepare(`
    INSERT INTO kudos_preferences (
      patient_id, display_name, avatar_emoji, opt_in_kudos,
      opt_in_nudges, unit, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    patient.id,
    `${patient.firstName} ${patient.lastName.charAt(0)}.`,
    patient.id === hospitalPatient.id ? '🏥' : patient.id === rehabPatient.id ? '🦴' : '💪',
    1,
    1,
    patient.unit,
    Date.now()
  );
}

// Create feed items (achievements and nudges between patients)
const feedItems = [
  // Rehab patient achievement
  {
    patientId: rehabPatient.id,
    type: 'achievement',
    content: 'Completed 24 sessions in 12 days! 🎉',
    metadata: JSON.stringify({ achievement_type: 'consistency', sessions: 24 })
  },
  // Hospital patient achievement
  {
    patientId: hospitalPatient.id,
    type: 'achievement',
    content: 'First week complete - 5 days strong! 💪',
    metadata: JSON.stringify({ achievement_type: 'milestone', days: 5 })
  },
  // Nudge from rehab to hospital patient
  {
    patientId: rehabPatient.id,
    type: 'nudge',
    content: `${rehabPatient.firstName} sent you encouragement: "Keep going! You're doing great!" 🌟`,
    metadata: JSON.stringify({ from: rehabPatient.id, to: hospitalPatient.id, template: 'encouragement' })
  },
  // SNF patient milestone
  {
    patientId: snfPatient.id,
    type: 'achievement',
    content: 'Bounced back after setback - 4 days strong! 🎯',
    metadata: JSON.stringify({ achievement_type: 'recovery', streak: 4 })
  }
];

for (const item of feedItems) {
  db.prepare(`
    INSERT INTO feed_items (
      patient_id, type, content, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(item.patientId, item.type, item.content, item.metadata, Date.now());
}

// Create reactions to feed items
db.prepare(`
  INSERT INTO feed_reactions (
    feed_item_id, patient_id, reaction_type, created_at
  ) VALUES
  (1, ?, 'fire', ?),
  (1, ?, 'heart', ?),
  (2, ?, 'celebrate', ?),
  (4, ?, 'strong', ?)
`).run(
  hospitalPatient.id, Date.now(),
  snfPatient.id, Date.now(),
  rehabPatient.id, Date.now(),
  rehabPatient.id, Date.now()
);

console.log('✅ Feed items and reactions created');

db.close();

console.log('\n🎉 Demo ecosystem complete!');
console.log('\n📋 Summary:');
console.log('   • Hospital Patient: Robert Martinez (70yo, COPD + Parkinson\'s, 5 days)');
console.log('   • Inpatient Rehab: Dorothy Chen (82yo, Hip Fracture + Diabetes, 12 days)');
console.log('   • SNF Patient: James Thompson (65yo, Sepsis + CHF, 17 days with setback)');
console.log('\n   All patients assigned to Heidi Kissane, DPT');
console.log('   Full schema populated with realistic data');
console.log('   Cross-patient interactions enabled');
console.log('\n🔑 Login credentials:');
console.log('   Provider: heidikissane@hospital.com');
console.log('   Hospital Patient: Robert Martinez, DOB: ' + hospitalPatientDOB);
console.log('   Rehab Patient: Dorothy Chen, DOB: ' + rehabPatientDOB);
console.log('   SNF Patient: James Thompson, DOB: ' + snfPatientDOB);
