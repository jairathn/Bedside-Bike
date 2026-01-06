/**
 * Rolling Data Window - Auto-update on Server Startup
 *
 * This module automatically updates sample patient data to maintain a "rolling window"
 * relative to today's date. It runs on every server startup, keeping demo data current.
 */

import Database from 'better-sqlite3';
import { join } from 'path';

// Demo patient configuration
const DEMO_PATIENTS = [
  { email: 'hospital.patient@bedside-bike.local', daysAdmitted: 5 },
  { email: 'rehab.patient@bedside-bike.local', daysAdmitted: 12 },
  { email: 'snf.patient@bedside-bike.local', daysAdmitted: 17 }
];

export async function updateRollingDataWindow(): Promise<void> {
  // Only run for SQLite (local development)
  if (process.env.USE_POSTGRES === 'true') {
    console.log('📊 Skipping rolling data update (PostgreSQL mode)');
    return;
  }

  const dbPath = join(process.cwd(), 'local.db');

  let db: Database.Database;
  try {
    db = new Database(dbPath);
  } catch (err) {
    console.log('📊 No local database found, skipping rolling data update');
    return;
  }

  console.log('🔄 Auto-updating rolling data window...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let updatedCount = 0;

  for (const patientConfig of DEMO_PATIENTS) {
    const patient = db.prepare('SELECT * FROM users WHERE email = ?').get(patientConfig.email) as any;

    if (!patient) {
      continue;
    }

    // Calculate new admission date
    const newAdmissionDate = new Date(today);
    newAdmissionDate.setDate(today.getDate() - patientConfig.daysAdmitted);
    const newAdmissionDateStr = newAdmissionDate.toISOString().split('T')[0];

    // Check if already up to date
    if (patient.admission_date === newAdmissionDateStr) {
      continue;
    }

    // Update user's admission date
    db.prepare('UPDATE users SET admission_date = ?, updated_at = ? WHERE id = ?')
      .run(newAdmissionDateStr, Math.floor(Date.now() / 1000), patient.id);

    // Get existing sessions
    const existingSessions = db.prepare(`
      SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY session_date ASC
    `).all(patient.id) as any[];

    if (existingSessions.length > 0) {
      const oldestSessionDate = new Date(existingSessions[0].session_date);
      const dayShift = Math.floor((newAdmissionDate.getTime() - oldestSessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayShift !== 0) {
        // Update each session
        for (const session of existingSessions) {
          const oldSessionDate = new Date(session.session_date);
          const newSessionDate = new Date(oldSessionDate);
          newSessionDate.setDate(oldSessionDate.getDate() + dayShift);

          const oldStartTime = new Date(session.start_time * 1000);
          const newStartTime = new Date(oldStartTime);
          newStartTime.setDate(oldStartTime.getDate() + dayShift);

          let newEndTime = null;
          if (session.end_time) {
            const oldEndTime = new Date(session.end_time * 1000);
            newEndTime = new Date(oldEndTime);
            newEndTime.setDate(oldEndTime.getDate() + dayShift);
          }

          db.prepare(`
            UPDATE exercise_sessions
            SET session_date = ?, start_time = ?, end_time = ?, updated_at = ?
            WHERE id = ?
          `).run(
            newSessionDate.toISOString().split('T')[0],
            Math.floor(newStartTime.getTime() / 1000),
            newEndTime ? Math.floor(newEndTime.getTime() / 1000) : null,
            Math.floor(Date.now() / 1000),
            session.id
          );
        }

        // Update EMS assessments
        const emsAssessments = db.prepare('SELECT * FROM ems_assessments WHERE patient_id = ?').all(patient.id) as any[];
        for (const assessment of emsAssessments) {
          const oldAssessedAt = new Date(assessment.assessed_at * 1000);
          const newAssessedAt = new Date(oldAssessedAt);
          newAssessedAt.setDate(oldAssessedAt.getDate() + dayShift);

          db.prepare('UPDATE ems_assessments SET assessed_at = ? WHERE id = ?')
            .run(Math.floor(newAssessedAt.getTime() / 1000), assessment.id);
        }
      }
    }

    // Update related records
    db.prepare('UPDATE patient_profiles SET days_immobile = ?, updated_at = ? WHERE user_id = ?')
      .run(patientConfig.daysAdmitted, Math.floor(Date.now() / 1000), patient.id);

    db.prepare('UPDATE risk_assessments SET created_at = ? WHERE patient_id = ?')
      .run(Math.floor(Date.now() / 1000), patient.id);

    const protocolAssignment = db.prepare('SELECT * FROM patient_protocol_assignments WHERE patient_id = ?').get(patient.id) as any;
    if (protocolAssignment) {
      db.prepare('UPDATE patient_protocol_assignments SET start_date = ?, updated_at = ? WHERE id = ?')
        .run(Math.floor(newAdmissionDate.getTime() / 1000), Math.floor(Date.now() / 1000), protocolAssignment.id);
    }

    updatedCount++;
  }

  db.close();

  if (updatedCount > 0) {
    console.log(`✅ Rolling data updated for ${updatedCount} demo patient(s)`);
  } else {
    console.log('✅ Demo patient data already current');
  }
}
