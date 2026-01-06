/**
 * Rolling Data Window Update Script
 *
 * This script updates sample patient data to maintain a "rolling window" relative to today's date.
 * When run, it shifts all dates (admission dates, session dates, timestamps) forward to keep
 * the demo data current.
 *
 * Example: If Robert Martinez should have 5 days of data:
 * - On 1/6/2026: data spans 1/2-1/6
 * - On 1/7/2026: data spans 1/3-1/7
 * - On 1/8/2026: data spans 1/4-1/8
 *
 * Run with: npm run db:rolling-update
 */

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'local.db');
const db = new Database(dbPath);

// Demo patient emails to update
const DEMO_PATIENTS = [
  {
    email: 'hospital.patient@bedside-bike.local',
    daysAdmitted: 5, // Robert Martinez - 5 days of data
    sessionsPerDay: 2,
  },
  {
    email: 'rehab.patient@bedside-bike.local',
    daysAdmitted: 12, // Dorothy Chen - 12 days of data
    sessionsPerDay: 2,
  },
  {
    email: 'snf.patient@bedside-bike.local',
    daysAdmitted: 17, // James Thompson - 17 days of data
    sessionsPerDay: 2, // Reduced during setback
  }
];

console.log('🔄 Updating rolling data window...\n');
console.log(`📅 Today's date: ${new Date().toISOString().split('T')[0]}\n`);

const today = new Date();
today.setHours(0, 0, 0, 0);

for (const patientConfig of DEMO_PATIENTS) {
  const patient = db.prepare('SELECT * FROM users WHERE email = ?').get(patientConfig.email) as any;

  if (!patient) {
    console.log(`⚠️  Patient not found: ${patientConfig.email}`);
    continue;
  }

  console.log(`📊 Updating ${patient.first_name} ${patient.last_name}...`);

  // Calculate new admission date (daysAdmitted days ago)
  const newAdmissionDate = new Date(today);
  newAdmissionDate.setDate(today.getDate() - patientConfig.daysAdmitted);
  const newAdmissionDateStr = newAdmissionDate.toISOString().split('T')[0];

  // Update user's admission date
  db.prepare('UPDATE users SET admission_date = ?, updated_at = ? WHERE id = ?')
    .run(newAdmissionDateStr, Math.floor(Date.now() / 1000), patient.id);

  console.log(`   Admission date: ${newAdmissionDateStr}`);

  // Get existing sessions to understand the pattern
  const existingSessions = db.prepare(`
    SELECT * FROM exercise_sessions
    WHERE patient_id = ?
    ORDER BY session_date ASC
  `).all(patient.id) as any[];

  if (existingSessions.length === 0) {
    console.log(`   No sessions found, skipping session update`);
    continue;
  }

  // Calculate the day offset to shift sessions
  const oldestSessionDate = new Date(existingSessions[0].session_date);
  const dayShift = Math.floor((newAdmissionDate.getTime() - oldestSessionDate.getTime()) / (1000 * 60 * 60 * 24));

  console.log(`   Shifting ${existingSessions.length} sessions by ${dayShift} days...`);

  // Update each session
  for (const session of existingSessions) {
    const oldSessionDate = new Date(session.session_date);
    const newSessionDate = new Date(oldSessionDate);
    newSessionDate.setDate(oldSessionDate.getDate() + dayShift);

    // Calculate new timestamps
    const oldStartTime = new Date(session.start_time * 1000);
    const oldEndTime = session.end_time ? new Date(session.end_time * 1000) : null;

    const newStartTime = new Date(oldStartTime);
    newStartTime.setDate(oldStartTime.getDate() + dayShift);

    const newEndTime = oldEndTime ? new Date(oldEndTime) : null;
    if (newEndTime) {
      newEndTime.setDate(oldEndTime!.getDate() + dayShift);
    }

    db.prepare(`
      UPDATE exercise_sessions
      SET session_date = ?,
          start_time = ?,
          end_time = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      newSessionDate.toISOString().split('T')[0],
      Math.floor(newStartTime.getTime() / 1000),
      newEndTime ? Math.floor(newEndTime.getTime() / 1000) : null,
      Math.floor(Date.now() / 1000),
      session.id
    );
  }

  // Update patient profile days_immobile
  db.prepare('UPDATE patient_profiles SET days_immobile = ?, updated_at = ? WHERE user_id = ?')
    .run(patientConfig.daysAdmitted, Math.floor(Date.now() / 1000), patient.id);

  // Update risk assessment created_at
  db.prepare('UPDATE risk_assessments SET created_at = ? WHERE patient_id = ?')
    .run(Math.floor(Date.now() / 1000), patient.id);

  // Update protocol assignment start_date
  const protocolAssignment = db.prepare('SELECT * FROM patient_protocol_assignments WHERE patient_id = ?').get(patient.id) as any;
  if (protocolAssignment) {
    db.prepare('UPDATE patient_protocol_assignments SET start_date = ?, updated_at = ? WHERE id = ?')
      .run(Math.floor(newAdmissionDate.getTime() / 1000), Math.floor(Date.now() / 1000), protocolAssignment.id);
  }

  // Update patient stats
  const sessionsAfterUpdate = db.prepare('SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY session_date DESC LIMIT 1').get(patient.id) as any;
  if (sessionsAfterUpdate) {
    db.prepare('UPDATE patient_stats SET last_session_date = ?, updated_at = ? WHERE patient_id = ?')
      .run(Math.floor(new Date(sessionsAfterUpdate.session_date).getTime() / 1000), Math.floor(Date.now() / 1000), patient.id);
  }

  // Update EMS assessments if any
  const emsAssessments = db.prepare('SELECT * FROM ems_assessments WHERE patient_id = ? ORDER BY assessed_at ASC').all(patient.id) as any[];
  for (let i = 0; i < emsAssessments.length; i++) {
    const assessment = emsAssessments[i];
    const oldAssessedAt = new Date(assessment.assessed_at * 1000);
    const newAssessedAt = new Date(oldAssessedAt);
    newAssessedAt.setDate(oldAssessedAt.getDate() + dayShift);

    db.prepare('UPDATE ems_assessments SET assessed_at = ? WHERE id = ?')
      .run(Math.floor(newAssessedAt.getTime() / 1000), assessment.id);
  }

  console.log(`   ✅ Updated ${patient.first_name} ${patient.last_name}`);
}

// Also update provider_patients granted_at timestamps
db.prepare(`
  UPDATE provider_patients
  SET granted_at = ?
  WHERE patient_id IN (
    SELECT id FROM users WHERE email LIKE '%@bedside-bike.local'
  )
`).run(Math.floor(Date.now() / 1000));

db.close();

console.log('\n🎉 Rolling data window update complete!');
console.log('\n📋 Summary:');
console.log('   • All demo patient dates shifted to be relative to today');
console.log('   • Exercise sessions dates updated');
console.log('   • Admission dates updated');
console.log('   • Risk assessments and protocol assignments updated');
console.log('   • EMS assessments updated');
console.log('\n💡 Tip: Run this script daily to keep demo data current:');
console.log('   npm run db:rolling-update');
