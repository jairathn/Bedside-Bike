/**
 * Rolling Data Window - Auto-update on Server Startup
 *
 * This module automatically updates DEMO patient data to maintain a "rolling window"
 * relative to today's date. It runs on every server startup, keeping demo data current.
 *
 * Only affects demo patients (@bedside-bike.local emails).
 */

import { db } from './db';
import { eq, and, sql } from 'drizzle-orm';

// Demo patient configuration - only these patients get rolling updates
const DEMO_PATIENTS = [
  { email: 'hospital.patient@bedside-bike.local', daysAdmitted: 5 },
  { email: 'rehab.patient@bedside-bike.local', daysAdmitted: 12 },
  { email: 'snf.patient@bedside-bike.local', daysAdmitted: 17 }
];

export async function updateRollingDataWindow(): Promise<void> {
  const usePostgres = process.env.USE_POSTGRES === 'true';

  console.log('🔄 Auto-updating rolling data window for demo patients...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let updatedCount = 0;

  try {
    if (usePostgres) {
      // PostgreSQL mode - use drizzle with PostgreSQL schema
      const pgSchema = await import('@shared/schema.postgres');

      for (const patientConfig of DEMO_PATIENTS) {
        // Find the demo patient
        const patients = await db
          .select()
          .from(pgSchema.users)
          .where(eq(pgSchema.users.email, patientConfig.email))
          .limit(1);

        if (patients.length === 0) continue;
        const patient = patients[0];

        // Calculate new admission date
        const newAdmissionDate = new Date(today);
        newAdmissionDate.setDate(today.getDate() - patientConfig.daysAdmitted);
        const newAdmissionDateStr = newAdmissionDate.toISOString().split('T')[0];

        // Check if already up to date
        if (patient.admissionDate === newAdmissionDateStr) continue;

        // Get existing sessions to calculate day shift
        const existingSessions = await db
          .select()
          .from(pgSchema.exerciseSessions)
          .where(eq(pgSchema.exerciseSessions.patientId, patient.id))
          .orderBy(pgSchema.exerciseSessions.sessionDate);

        if (existingSessions.length > 0) {
          const oldestSessionDate = new Date(existingSessions[0].sessionDate);
          const dayShift = Math.floor((newAdmissionDate.getTime() - oldestSessionDate.getTime()) / (1000 * 60 * 60 * 24));

          if (dayShift !== 0) {
            // Update each session's dates
            for (const session of existingSessions) {
              const oldSessionDate = new Date(session.sessionDate);
              const newSessionDate = new Date(oldSessionDate);
              newSessionDate.setDate(oldSessionDate.getDate() + dayShift);

              const oldStartTime = new Date(session.startTime);
              const newStartTime = new Date(oldStartTime);
              newStartTime.setDate(oldStartTime.getDate() + dayShift);

              let newEndTime: Date | null = null;
              if (session.endTime) {
                const oldEndTime = new Date(session.endTime);
                newEndTime = new Date(oldEndTime);
                newEndTime.setDate(oldEndTime.getDate() + dayShift);
              }

              await db
                .update(pgSchema.exerciseSessions)
                .set({
                  sessionDate: newSessionDate.toISOString().split('T')[0],
                  startTime: newStartTime,
                  endTime: newEndTime,
                  updatedAt: new Date()
                })
                .where(eq(pgSchema.exerciseSessions.id, session.id));
            }

            // Update EMS assessments
            const emsAssessments = await db
              .select()
              .from(pgSchema.emsAssessments)
              .where(eq(pgSchema.emsAssessments.patientId, patient.id));

            for (const assessment of emsAssessments) {
              const oldAssessedAt = new Date(assessment.assessedAt);
              const newAssessedAt = new Date(oldAssessedAt);
              newAssessedAt.setDate(oldAssessedAt.getDate() + dayShift);

              await db
                .update(pgSchema.emsAssessments)
                .set({ assessedAt: newAssessedAt })
                .where(eq(pgSchema.emsAssessments.id, assessment.id));
            }
          }
        }

        // Update user's admission date
        await db
          .update(pgSchema.users)
          .set({
            admissionDate: newAdmissionDateStr,
            updatedAt: new Date()
          })
          .where(eq(pgSchema.users.id, patient.id));

        // Update patient profile
        await db
          .update(pgSchema.patientProfiles)
          .set({
            daysImmobile: patientConfig.daysAdmitted,
            updatedAt: new Date()
          })
          .where(eq(pgSchema.patientProfiles.userId, patient.id));

        // Update risk assessment
        await db
          .update(pgSchema.riskAssessments)
          .set({ createdAt: new Date() })
          .where(eq(pgSchema.riskAssessments.patientId, patient.id));

        // Update protocol assignment
        const assignments = await db
          .select()
          .from(pgSchema.patientProtocolAssignments)
          .where(eq(pgSchema.patientProtocolAssignments.patientId, patient.id))
          .limit(1);

        if (assignments.length > 0) {
          await db
            .update(pgSchema.patientProtocolAssignments)
            .set({
              startDate: newAdmissionDate,
              updatedAt: new Date()
            })
            .where(eq(pgSchema.patientProtocolAssignments.id, assignments[0].id));
        }

        updatedCount++;
      }
    } else {
      // SQLite mode - use better-sqlite3 directly
      const Database = (await import('better-sqlite3')).default;
      const path = await import('path');
      const dbPath = path.join(process.cwd(), 'local.db');

      let sqliteDb;
      try {
        sqliteDb = new Database(dbPath);
      } catch (err) {
        console.log('📊 No local database found, skipping rolling data update');
        return;
      }

      for (const patientConfig of DEMO_PATIENTS) {
        const patient = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(patientConfig.email) as any;
        if (!patient) continue;

        // Calculate new admission date
        const newAdmissionDate = new Date(today);
        newAdmissionDate.setDate(today.getDate() - patientConfig.daysAdmitted);
        const newAdmissionDateStr = newAdmissionDate.toISOString().split('T')[0];

        if (patient.admission_date === newAdmissionDateStr) continue;

        // Update user's admission date
        sqliteDb.prepare('UPDATE users SET admission_date = ?, updated_at = ? WHERE id = ?')
          .run(newAdmissionDateStr, Math.floor(Date.now() / 1000), patient.id);

        // Get existing sessions
        const existingSessions = sqliteDb.prepare(`
          SELECT * FROM exercise_sessions WHERE patient_id = ? ORDER BY session_date ASC
        `).all(patient.id) as any[];

        if (existingSessions.length > 0) {
          const oldestSessionDate = new Date(existingSessions[0].session_date);
          const dayShift = Math.floor((newAdmissionDate.getTime() - oldestSessionDate.getTime()) / (1000 * 60 * 60 * 24));

          if (dayShift !== 0) {
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

              sqliteDb.prepare(`
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
            const emsAssessments = sqliteDb.prepare('SELECT * FROM ems_assessments WHERE patient_id = ?').all(patient.id) as any[];
            for (const assessment of emsAssessments) {
              const oldAssessedAt = new Date(assessment.assessed_at * 1000);
              const newAssessedAt = new Date(oldAssessedAt);
              newAssessedAt.setDate(oldAssessedAt.getDate() + dayShift);

              sqliteDb.prepare('UPDATE ems_assessments SET assessed_at = ? WHERE id = ?')
                .run(Math.floor(newAssessedAt.getTime() / 1000), assessment.id);
            }
          }
        }

        // Update related records
        sqliteDb.prepare('UPDATE patient_profiles SET days_immobile = ?, updated_at = ? WHERE user_id = ?')
          .run(patientConfig.daysAdmitted, Math.floor(Date.now() / 1000), patient.id);

        sqliteDb.prepare('UPDATE risk_assessments SET created_at = ? WHERE patient_id = ?')
          .run(Math.floor(Date.now() / 1000), patient.id);

        const protocolAssignment = sqliteDb.prepare('SELECT * FROM patient_protocol_assignments WHERE patient_id = ?').get(patient.id) as any;
        if (protocolAssignment) {
          sqliteDb.prepare('UPDATE patient_protocol_assignments SET start_date = ?, updated_at = ? WHERE id = ?')
            .run(Math.floor(newAdmissionDate.getTime() / 1000), Math.floor(Date.now() / 1000), protocolAssignment.id);
        }

        updatedCount++;
      }

      sqliteDb.close();
    }

    if (updatedCount > 0) {
      console.log(`✅ Rolling data updated for ${updatedCount} demo patient(s)`);
    } else {
      console.log('✅ Demo patient data already current');
    }
  } catch (error) {
    console.error('Failed to update rolling data:', error);
  }
}
