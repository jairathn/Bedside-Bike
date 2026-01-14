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

// Delete existing demo patients if they exist
console.log('Cleaning up existing demo patients...');
const demoEmails = [
  'hospital.patient@bedside-bike.local',
  'rehab.patient@bedside-bike.local',
  'snf.patient@bedside-bike.local'
];

for (const email of demoEmails) {
  const existingPatient = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
  if (existingPatient) {
    // Delete in reverse order of foreign key dependencies (only core tables that exist)
    db.prepare('DELETE FROM provider_patients WHERE patient_id = ?').run(existingPatient.id);
    db.prepare('DELETE FROM patient_stats WHERE patient_id = ?').run(existingPatient.id);
    db.prepare('DELETE FROM patient_goals WHERE patient_id = ?').run(existingPatient.id);
    db.prepare('DELETE FROM exercise_sessions WHERE patient_id = ?').run(existingPatient.id);
    db.prepare('DELETE FROM patient_protocol_assignments WHERE patient_id = ?').run(existingPatient.id);
    db.prepare('DELETE FROM risk_assessments WHERE patient_id = ?').run(existingPatient.id);
    db.prepare('DELETE FROM patient_profiles WHERE user_id = ?').run(existingPatient.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(existingPatient.id);
    console.log(`  Deleted existing patient: ${email}`);
  }
}
console.log('✅ Cleanup complete\n');

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
    email, first_name, last_name, date_of_birth, user_type,
    admission_date, is_active
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  'hospital.patient@bedside-bike.local',
  'Robert',
  'Martinez',
  hospitalPatientDOB,
  'patient',
  hospitalAdmissionDate.toISOString().split('T')[0],
  1
) as any;

// Create comprehensive patient profile
db.prepare(`
  INSERT INTO patient_profiles (
    user_id, age, sex, weight_kg, height_cm,
    level_of_care, mobility_status, cognitive_status, baseline_function,
    admission_diagnosis, comorbidities, medications, devices,
    incontinent, albumin_low, on_vte_prophylaxis, days_immobile
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  hospitalPatient.id,
  70, // age
  'M',
  78.5,
  172,
  'icu',
  'bedbound',
  'normal',
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
  5 // days immobile
);

// Create risk assessment
const hospitalRiskAssessment = db.prepare(`
  INSERT INTO risk_assessments (
    patient_id, deconditioning, vte, falls, pressure,
    mobility_recommendation, los_data, discharge_data, readmission_data,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  Date.now()
) as any;

// Assign protocol (COPD)
const copdProtocol = db.prepare('SELECT id FROM clinical_protocols WHERE name LIKE ?').get('%COPD%') as any;
if (copdProtocol) {
  db.prepare(`
    INSERT INTO patient_protocol_assignments (
      patient_id, protocol_id, assigned_by, current_phase,
      start_date, status
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    hospitalPatient.id,
    copdProtocol.id,
    providerId,
    'Initial',
    Math.floor(hospitalAdmissionDate.getTime() / 1000),
    'active'
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

    const startTimeUnix = Math.floor(startTime.getTime() / 1000);
    const endTimeUnix = Math.floor(endTime.getTime() / 1000);

    db.prepare(`
      INSERT INTO exercise_sessions (
        patient_id, session_date, start_time, end_time, duration,
        avg_power, max_power, avg_rpm, resistance, stops_and_starts,
        is_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      hospitalPatient.id,
      sessionDate.toISOString().split('T')[0],
      startTimeUnix,
      endTimeUnix,
      duration,
      avgPower.toString(),
      (avgPower * 1.3).toString(),
      (35 + day * 2).toString(),
      (1.5 + day * 0.2).toFixed(1),
      Math.max(4 - day, 0),
      1
    );
  }
}

// Create goals
db.prepare(`
  INSERT INTO patient_goals (
    patient_id, provider_id, goal_type, target_value, current_value,
    unit, label, subtitle, period, is_active
  ) VALUES
  (?, ?, 'duration', '600', '0', 'seconds', 'Daily mobility target', 'COPD protocol - 10min sessions', 'daily', 1),
  (?, ?, 'power', '15', '0', 'watts', 'Power output goal', 'Low intensity for respiratory recovery', 'session', 1),
  (?, ?, 'sessions', '2', '0', 'sessions', 'Exercise frequency', 'BID sessions for optimal benefit', 'daily', 1)
`).run(
  hospitalPatient.id, providerId,
  hospitalPatient.id, providerId,
  hospitalPatient.id, providerId
);

// Create patient stats
const hospitalSessionCount = 10; // 5 days × 2 sessions
db.prepare(`
  INSERT INTO patient_stats (
    patient_id, total_sessions, total_duration, avg_daily_duration,
    consistency_streak, xp, level
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  hospitalPatient.id,
  hospitalSessionCount,
  hospitalSessionCount * 5.5 * 60, // avg 5.5 min
  (hospitalSessionCount * 5.5 * 60) / 5, // per day
  5,
  hospitalSessionCount * 50 + 250, // sessions + time bonus
  2
);

// Assign to Heidi Kissane
db.prepare(`
  INSERT INTO provider_patients (
    patient_id, provider_id, permission_granted, granted_at, is_active
  ) VALUES (?, ?, ?, ?, ?)
`).run(hospitalPatient.id, providerId, 1, Date.now(), 1);

console.log(`✅ Hospital Patient: ${hospitalPatient.first_name} ${hospitalPatient.last_name} (ID: ${hospitalPatient.id})`);

// ==========================================
// 2. INPATIENT REHAB - Hip Fracture + Diabetes
// ==========================================

console.log('\nCreating Inpatient Rehab Patient (Hip Fracture + Diabetes)...');

const rehabPatient = db.prepare(`
  INSERT INTO users (
    email, first_name, last_name, date_of_birth, user_type,
    admission_date, is_active
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  'rehab.patient@bedside-bike.local',
  'Dorothy',
  'Chen',
  rehabPatientDOB,
  'patient',
  rehabAdmissionDate.toISOString().split('T')[0],
  1
) as any;

// Create comprehensive patient profile
db.prepare(`
  INSERT INTO patient_profiles (
    user_id, age, sex, weight_kg, height_cm,
    level_of_care, mobility_status, cognitive_status, baseline_function,
    admission_diagnosis, comorbidities, medications, devices,
    incontinent, albumin_low, on_vte_prophylaxis, days_immobile
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  rehabPatient.id,
  82, // age
  'F',
  68.2,
  160,
  'rehab',
  'walking_assist',
  'normal',
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
  12 // days immobile
);

// Create risk assessment
db.prepare(`
  INSERT INTO risk_assessments (
    patient_id, deconditioning, vte, falls, pressure,
    mobility_recommendation, los_data, discharge_data, readmission_data,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  Date.now()
);

// Assign protocol (Hip Fracture)
const hipProtocol = db.prepare('SELECT id FROM clinical_protocols WHERE name LIKE ?').get('%Hip Fracture%') as any;
if (hipProtocol) {
  db.prepare(`
    INSERT INTO patient_protocol_assignments (
      patient_id, protocol_id, assigned_by, current_phase,
      start_date, status
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    rehabPatient.id,
    hipProtocol.id,
    providerId,
    'Advanced', // Advanced phase
    Math.floor(rehabAdmissionDate.getTime() / 1000),
    'active'
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
    const startTimeUnix = Math.floor(startTime.getTime() / 1000);
    const endTimeUnix = Math.floor(endTime.getTime() / 1000);

    db.prepare(`
      INSERT INTO exercise_sessions (
        patient_id, session_date, start_time, end_time, duration,
        avg_power, max_power, avg_rpm, resistance, stops_and_starts,
        is_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      rehabPatient.id,
      sessionDate.toISOString().split('T')[0],
      startTimeUnix,
      endTimeUnix,
      Math.floor(duration),
      avgPower.toFixed(1),
      (avgPower * 1.25).toFixed(1),
      (40 + day * 1.5).toFixed(0),
      (2 + day * 0.15).toFixed(1),
      Math.max(3 - Math.floor(day / 2), 0),
      1
    );
  }
}

// Create goals
db.prepare(`
  INSERT INTO patient_goals (
    patient_id, provider_id, goal_type, target_value, current_value,
    unit, label, subtitle, period, is_active
  ) VALUES
  (?, ?, 'duration', '900', '0', 'seconds', 'Daily mobility target', 'Hip protocol - 15min sessions', 'daily', 1),
  (?, ?, 'power', '30', '0', 'watts', 'Power output goal', 'Progressive loading for strength', 'session', 1),
  (?, ?, 'sessions', '2', '0', 'sessions', 'Exercise frequency', 'BID sessions for recovery', 'daily', 1)
`).run(
  rehabPatient.id, providerId,
  rehabPatient.id, providerId,
  rehabPatient.id, providerId
);

// Create patient stats
const rehabSessionCount = 24; // 12 days × 2
db.prepare(`
  INSERT INTO patient_stats (
    patient_id, total_sessions, total_duration, avg_daily_duration,
    consistency_streak, xp, level
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  rehabPatient.id,
  rehabSessionCount,
  rehabSessionCount * 11 * 60, // avg 11 min
  (rehabSessionCount * 11 * 60) / 12,
  12,
  rehabSessionCount * 50 + 600,
  3
);

// Assign to Heidi Kissane
db.prepare(`
  INSERT INTO provider_patients (
    patient_id, provider_id, permission_granted, granted_at, is_active
  ) VALUES (?, ?, ?, ?, ?)
`).run(rehabPatient.id, providerId, 1, Date.now(), 1);

console.log(`✅ Inpatient Rehab Patient: ${rehabPatient.first_name} ${rehabPatient.last_name} (ID: ${rehabPatient.id})`);

// ==========================================
// 3. SNF PATIENT - Sepsis + CHF (with setback)
// ==========================================

console.log('\nCreating SNF Patient (Sepsis + CHF with setback)...');

const snfPatient = db.prepare(`
  INSERT INTO users (
    email, first_name, last_name, date_of_birth, user_type,
    admission_date, is_active
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  'snf.patient@bedside-bike.local',
  'James',
  'Thompson',
  snfPatientDOB,
  'patient',
  snfAdmissionDate.toISOString().split('T')[0],
  1
) as any;

// Create comprehensive patient profile
db.prepare(`
  INSERT INTO patient_profiles (
    user_id, age, sex, weight_kg, height_cm,
    level_of_care, mobility_status, cognitive_status, baseline_function,
    admission_diagnosis, comorbidities, medications, devices,
    incontinent, albumin_low, on_vte_prophylaxis, days_immobile
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  snfPatient.id,
  65, // age
  'M',
  92.5,
  175,
  'ward',
  'walking_assist',
  'mild_impairment',
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
  1,
  17 // days immobile
);

// Create risk assessment
db.prepare(`
  INSERT INTO risk_assessments (
    patient_id, deconditioning, vte, falls, pressure,
    mobility_recommendation, los_data, discharge_data, readmission_data,
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  Date.now()
);

// Assign protocol (ICU Deconditioning)
const icuProtocol = db.prepare('SELECT id FROM clinical_protocols WHERE name LIKE ?').get('%ICU%') as any;
if (icuProtocol) {
  db.prepare(`
    INSERT INTO patient_protocol_assignments (
      patient_id, protocol_id, assigned_by, current_phase,
      start_date, status
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    snfPatient.id,
    icuProtocol.id,
    providerId,
    'Progressive', // Progressive phase
    Math.floor(snfAdmissionDate.getTime() / 1000),
    'active'
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
    const startTimeUnix = Math.floor(startTime.getTime() / 1000);
    const endTimeUnix = Math.floor(endTime.getTime() / 1000);

    db.prepare(`
      INSERT INTO exercise_sessions (
        patient_id, session_date, start_time, end_time, duration,
        avg_power, max_power, avg_rpm, resistance, stops_and_starts,
        is_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snfPatient.id,
      sessionDate.toISOString().split('T')[0],
      startTimeUnix,
      endTimeUnix,
      Math.floor(duration),
      avgPower.toFixed(1),
      (avgPower * 1.3).toFixed(1),
      (30 + (isSetback ? 0 : day * 1)).toFixed(0),
      (1.5 + (isSetback ? 0 : day * 0.1)).toFixed(1),
      isSetback ? 6 : Math.max(5 - Math.floor(day / 3), 1),
      1
    );
  }
}

// Create goals
db.prepare(`
  INSERT INTO patient_goals (
    patient_id, provider_id, goal_type, target_value, current_value,
    unit, label, subtitle, period, is_active
  ) VALUES
  (?, ?, 'duration', '600', '0', 'seconds', 'Daily mobility target', 'ICU recovery - 10min sessions', 'daily', 1),
  (?, ?, 'power', '15', '0', 'watts', 'Power output goal', 'Low intensity for CHF management', 'session', 1),
  (?, ?, 'sessions', '2', '0', 'sessions', 'Exercise frequency', 'BID for deconditioning prevention', 'daily', 1)
`).run(
  snfPatient.id, providerId,
  snfPatient.id, providerId,
  snfPatient.id, providerId
);

// Create patient stats
const snfSessionCount = 31; // 17 days minus setback losses
db.prepare(`
  INSERT INTO patient_stats (
    patient_id, total_sessions, total_duration, avg_daily_duration,
    consistency_streak, xp, level
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  snfPatient.id,
  snfSessionCount,
  snfSessionCount * 7 * 60, // avg 7 min
  (snfSessionCount * 7 * 60) / 17,
  4, // Broken by setback
  snfSessionCount * 50 + 350,
  2
);

// Assign to Heidi Kissane
db.prepare(`
  INSERT INTO provider_patients (
    patient_id, provider_id, permission_granted, granted_at, is_active
  ) VALUES (?, ?, ?, ?, ?)
`).run(snfPatient.id, providerId, 1, Date.now(), 1);

console.log(`✅ SNF Patient: ${snfPatient.first_name} ${snfPatient.last_name} (ID: ${snfPatient.id})`);

// ==========================================
// CROSS-PATIENT INTERACTIONS
// ==========================================
// NOTE: Kudos, feed items, and reactions tables don't exist in SQLite schema yet
// These will be added when those features are implemented
console.log('\n✅ Skipping cross-patient interactions (tables not yet created)');

// ==========================================
// CAREGIVER USERS
// ==========================================

console.log('\n👪 Creating demo caregivers...');

// Clean up existing demo caregivers
const caregiverEmails = [
  'maria.martinez@caregiver.local',
  'michael.chen@caregiver.local',
  'sarah.thompson@caregiver.local'
];

for (const email of caregiverEmails) {
  const existingCaregiver = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
  if (existingCaregiver) {
    db.prepare('DELETE FROM caregiver_achievements WHERE caregiver_id = ?').run(existingCaregiver.id);
    db.prepare('DELETE FROM caregiver_notifications WHERE caregiver_id = ?').run(existingCaregiver.id);
    db.prepare('DELETE FROM discharge_checklists WHERE caregiver_id = ?').run(existingCaregiver.id);
    db.prepare('DELETE FROM caregiver_observations WHERE caregiver_id = ?').run(existingCaregiver.id);
    db.prepare('DELETE FROM caregiver_patients WHERE caregiver_id = ?').run(existingCaregiver.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(existingCaregiver.id);
    console.log(`  Deleted existing caregiver: ${email}`);
  }
}

// 1. Maria Martinez - Robert's spouse
const mariaDOB = `${currentYear - 68}-05-15`;
const mariaCaregiver = db.prepare(`
  INSERT INTO users (
    email, first_name, last_name, date_of_birth, user_type,
    phone_number, is_active, tos_accepted_at, tos_version
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  'maria.martinez@caregiver.local',
  'Maria',
  'Martinez',
  mariaDOB,
  'caregiver',
  '555-0101',
  1,
  Math.floor(Date.now() / 1000),
  '1.0'
) as any;

// Create caregiver-patient relationship (approved)
db.prepare(`
  INSERT INTO caregiver_patients (
    caregiver_id, patient_id, relationship_type, access_status,
    requested_at, approved_at, can_log_sessions, can_view_reports,
    can_send_nudges, supporter_xp, supporter_level
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  mariaCaregiver.id,
  hospitalPatient.id,
  'spouse',
  'approved',
  Math.floor((Date.now() - 5 * 24 * 60 * 60 * 1000) / 1000), // 5 days ago
  Math.floor((Date.now() - 5 * 24 * 60 * 60 * 1000) / 1000), // same day
  1, 1, 1,
  150, // Some XP from engagement
  1
);

// Add some caregiver observations for Maria
const mariaNow = new Date();
const mariaObsDate = new Date(mariaNow);
mariaObsDate.setDate(mariaObsDate.getDate() - 1);

db.prepare(`
  INSERT INTO caregiver_observations (
    caregiver_id, patient_id, observation_date, mood_level,
    pain_level, energy_level, appetite, sleep_quality,
    mobility_observations, notes, concerns
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  mariaCaregiver.id,
  hospitalPatient.id,
  mariaObsDate.toISOString().split('T')[0],
  'fair',
  4,
  'low',
  'fair',
  'poor',
  'Robert needed more help getting to chair today. Shakiness seems worse in morning.',
  'He is trying hard but gets frustrated. The Parkinson tremors make the biking harder.',
  'Worried about his breathing - seems more labored after exercise.'
);

// Add notification for Maria
db.prepare(`
  INSERT INTO caregiver_notifications (
    caregiver_id, patient_id, notification_type, title, message,
    metadata, is_read
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  mariaCaregiver.id,
  hospitalPatient.id,
  'session_logged',
  'Robert completed a session!',
  'Robert just finished a 7-minute cycling session. Great progress!',
  JSON.stringify({ session_duration: 420, session_date: mariaObsDate.toISOString().split('T')[0] }),
  0
);

console.log(`✅ Caregiver: Maria Martinez (spouse to Robert) - ID: ${mariaCaregiver.id}`);

// 2. Michael Chen - Dorothy's adult son
const michaelDOB = `${currentYear - 55}-08-22`;
const michaelCaregiver = db.prepare(`
  INSERT INTO users (
    email, first_name, last_name, date_of_birth, user_type,
    phone_number, is_active, tos_accepted_at, tos_version
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  'michael.chen@caregiver.local',
  'Michael',
  'Chen',
  michaelDOB,
  'caregiver',
  '555-0202',
  1,
  Math.floor(Date.now() / 1000),
  '1.0'
) as any;

// Create caregiver-patient relationship (approved)
db.prepare(`
  INSERT INTO caregiver_patients (
    caregiver_id, patient_id, relationship_type, access_status,
    requested_at, approved_at, can_log_sessions, can_view_reports,
    can_send_nudges, supporter_xp, supporter_level
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  michaelCaregiver.id,
  rehabPatient.id,
  'child',
  'approved',
  Math.floor((Date.now() - 12 * 24 * 60 * 60 * 1000) / 1000), // 12 days ago
  Math.floor((Date.now() - 12 * 24 * 60 * 60 * 1000) / 1000),
  1, 1, 1,
  450, // More XP - longer engagement
  2
);

// Add caregiver observations for Michael
const michaelObsDate = new Date();
michaelObsDate.setDate(michaelObsDate.getDate() - 2);

db.prepare(`
  INSERT INTO caregiver_observations (
    caregiver_id, patient_id, observation_date, mood_level,
    pain_level, energy_level, appetite, sleep_quality,
    mobility_observations, notes, concerns, questions_for_provider
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  michaelCaregiver.id,
  rehabPatient.id,
  michaelObsDate.toISOString().split('T')[0],
  'good',
  3,
  'medium',
  'good',
  'fair',
  'Mom is walking further with the walker. She got from bed to bathroom independently today.',
  'Very motivated - she wants to go home and see her grandchildren. The PT sessions seem to be helping.',
  'Blood sugar was 180 before lunch - should we adjust insulin?',
  'When can she start bearing more weight? She wants to try without the walker.'
);

// Add achievement for Michael
db.prepare(`
  INSERT INTO caregiver_achievements (
    caregiver_id, patient_id, type, title, description,
    xp_reward, is_unlocked, unlocked_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  michaelCaregiver.id,
  rehabPatient.id,
  'week_streak',
  'Week of Support',
  'Checked in on your loved one for 7 consecutive days',
  100,
  1,
  Math.floor(Date.now() / 1000) - 5 * 24 * 60 * 60
);

// Add notifications for Michael (read)
db.prepare(`
  INSERT INTO caregiver_notifications (
    caregiver_id, patient_id, notification_type, title, message,
    metadata, is_read
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  michaelCaregiver.id,
  rehabPatient.id,
  'goal_completed',
  'Dorothy reached her daily goal!',
  'Dorothy completed 15 minutes of cycling today - meeting her target!',
  JSON.stringify({ goal_type: 'duration', target: 900, achieved: 920 }),
  1
);

console.log(`✅ Caregiver: Michael Chen (son to Dorothy) - ID: ${michaelCaregiver.id}`);

// 3. Sarah Thompson - James's daughter
const sarahDOB = `${currentYear - 38}-11-03`;
const sarahCaregiver = db.prepare(`
  INSERT INTO users (
    email, first_name, last_name, date_of_birth, user_type,
    phone_number, is_active, tos_accepted_at, tos_version
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  RETURNING *
`).get(
  'sarah.thompson@caregiver.local',
  'Sarah',
  'Thompson',
  sarahDOB,
  'caregiver',
  '555-0303',
  1,
  Math.floor(Date.now() / 1000),
  '1.0'
) as any;

// Create caregiver-patient relationship (approved)
db.prepare(`
  INSERT INTO caregiver_patients (
    caregiver_id, patient_id, relationship_type, access_status,
    requested_at, approved_at, can_log_sessions, can_view_reports,
    can_send_nudges, supporter_xp, supporter_level
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  sarahCaregiver.id,
  snfPatient.id,
  'child',
  'approved',
  Math.floor((Date.now() - 17 * 24 * 60 * 60 * 1000) / 1000), // 17 days ago
  Math.floor((Date.now() - 17 * 24 * 60 * 60 * 1000) / 1000),
  1, 1, 1,
  680, // Most XP - longest engagement
  3
);

// Add multiple observations for Sarah (more engaged caregiver)
const sarahObsDate1 = new Date();
sarahObsDate1.setDate(sarahObsDate1.getDate() - 3);

db.prepare(`
  INSERT INTO caregiver_observations (
    caregiver_id, patient_id, observation_date, mood_level,
    pain_level, energy_level, appetite, sleep_quality,
    mobility_observations, notes, concerns, questions_for_provider
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  sarahCaregiver.id,
  snfPatient.id,
  sarahObsDate1.toISOString().split('T')[0],
  'fair',
  2,
  'low',
  'fair',
  'fair',
  'Dad is recovering from the setback. Walking shorter distances but less winded.',
  'The CHF flare-up scared him. He is being more careful about salt intake now.',
  'His legs are more swollen than usual - is this from the CHF or lack of movement?',
  'Should we be worried about readmission? What warning signs should I watch for?'
);

const sarahObsDate2 = new Date();
sarahObsDate2.setDate(sarahObsDate2.getDate() - 1);

db.prepare(`
  INSERT INTO caregiver_observations (
    caregiver_id, patient_id, observation_date, mood_level,
    pain_level, energy_level, appetite, sleep_quality,
    mobility_observations, notes, concerns
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  sarahCaregiver.id,
  snfPatient.id,
  sarahObsDate2.toISOString().split('T')[0],
  'good',
  2,
  'medium',
  'good',
  'good',
  'Better day today! Dad walked to the dayroom and back with his walker.',
  'His spirits are up. He video called with the grandkids and that motivated him.',
  'Still watching the leg swelling but it seems better today.'
);

// Add discharge checklist for Sarah (partially started)
db.prepare(`
  INSERT INTO discharge_checklists (
    patient_id, caregiver_id, equipment_needs, home_modifications,
    medication_review, follow_up_appointments, emergency_contacts,
    warning_signs, home_exercise_plan, completion_percent
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  snfPatient.id,
  sarahCaregiver.id,
  JSON.stringify({
    walker: { needed: true, acquired: true },
    shower_chair: { needed: true, acquired: false },
    hospital_bed: { needed: false, acquired: false },
    oxygen: { needed: true, acquired: true, notes: 'PRN only' }
  }),
  JSON.stringify({
    grab_bars: { needed: true, installed: false },
    ramp: { needed: false, installed: false },
    bedroom_on_first_floor: { needed: true, arranged: true }
  }),
  JSON.stringify({
    reviewed: true,
    questions: ['Furosemide timing with other meds?'],
    pillbox_organized: false
  }),
  JSON.stringify([
    { type: 'PCP', scheduled: true, date: null },
    { type: 'Cardiology', scheduled: false, date: null },
    { type: 'Physical Therapy', scheduled: true, date: null }
  ]),
  JSON.stringify([
    { name: 'Sarah Thompson', phone: '555-0303', relationship: 'daughter', primary: true },
    { name: 'Mark Thompson', phone: '555-0304', relationship: 'son', primary: false }
  ]),
  JSON.stringify({
    call_911: ['Chest pain', 'Severe shortness of breath', 'Sudden confusion'],
    call_doctor: ['Weight gain >3 lbs overnight', 'Increased leg swelling', 'Fever >101']
  }),
  JSON.stringify({
    understood: true,
    equipment_at_home: false,
    caregiver_trained: false
  }),
  45 // 45% complete
);

// Add achievements for Sarah
db.prepare(`
  INSERT INTO caregiver_achievements (
    caregiver_id, patient_id, type, title, description,
    xp_reward, is_unlocked, unlocked_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  sarahCaregiver.id,
  snfPatient.id,
  'consistent_supporter',
  'Consistent Supporter',
  'Logged observations for 14 consecutive days',
  200,
  1,
  Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60
);

db.prepare(`
  INSERT INTO caregiver_achievements (
    caregiver_id, patient_id, type, title, description,
    xp_reward, is_unlocked, unlocked_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  sarahCaregiver.id,
  snfPatient.id,
  'first_checkin',
  'First Check-in',
  'Completed your first daily observation',
  50,
  1,
  Math.floor(Date.now() / 1000) - 17 * 24 * 60 * 60
);

// Add notifications for Sarah
db.prepare(`
  INSERT INTO caregiver_notifications (
    caregiver_id, patient_id, notification_type, title, message,
    metadata, is_read
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  sarahCaregiver.id,
  snfPatient.id,
  'streak_extended',
  'Keep it up!',
  'James has been cycling consistently for 4 days in a row!',
  JSON.stringify({ streak_days: 4 }),
  0
);

console.log(`✅ Caregiver: Sarah Thompson (daughter to James) - ID: ${sarahCaregiver.id}`);

db.close();

console.log('\n🎉 Demo ecosystem complete!');
console.log('\n📋 Summary:');
console.log('   • Hospital Patient: Robert Martinez (70yo, COPD + Parkinson\'s, 5 days)');
console.log('   • Inpatient Rehab: Dorothy Chen (82yo, Hip Fracture + Diabetes, 12 days)');
console.log('   • SNF Patient: James Thompson (65yo, Sepsis + CHF, 17 days with setback)');
console.log('\n   All patients assigned to Heidi Kissane, DPT');
console.log('   Full schema populated with realistic data');
console.log('   Cross-patient interactions enabled');
console.log('\n👪 Demo Caregivers:');
console.log('   • Maria Martinez (spouse) → Robert Martinez');
console.log('   • Michael Chen (son) → Dorothy Chen');
console.log('   • Sarah Thompson (daughter) → James Thompson');
console.log('\n🔑 Login credentials:');
console.log('   Provider: heidikissane@hospital.com');
console.log('   Hospital Patient: Robert Martinez, DOB: ' + hospitalPatientDOB);
console.log('   Rehab Patient: Dorothy Chen, DOB: ' + rehabPatientDOB);
console.log('   SNF Patient: James Thompson, DOB: ' + snfPatientDOB);
console.log('\n   Caregiver: Maria Martinez, DOB: ' + mariaDOB);
console.log('   Caregiver: Michael Chen, DOB: ' + michaelDOB);
console.log('   Caregiver: Sarah Thompson, DOB: ' + sarahDOB);
