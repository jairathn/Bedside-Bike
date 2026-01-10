/**
 * Rolling Data Window - Auto-update on Server Startup
 *
 * This module automatically updates DEMO patient data to maintain a "rolling window"
 * relative to today's date. It runs on every server startup, keeping demo data current.
 *
 * Rolling Window Logic:
 * 1. Delete ALL sessions outside the rolling window (configurable days per patient)
 * 2. Keep manual sessions (is_manual = true) within the window
 * 3. Generate fresh auto-sessions for days without manual sessions
 *
 * Only affects demo patients (@bedside-bike.local emails).
 */

import { db } from './db';
import { eq, and, sql, lt, or } from 'drizzle-orm';

// Demo patient configuration - only these patients get rolling updates
// windowDays: how many days of sessions to show (rolling window size)
const DEMO_PATIENTS = [
  { email: 'hospital.patient@bedside-bike.local', daysAdmitted: 5, windowDays: 5 },
  { email: 'rehab.patient@bedside-bike.local', daysAdmitted: 12, windowDays: 5 },
  { email: 'snf.patient@bedside-bike.local', daysAdmitted: 17, windowDays: 5 }
];

export async function updateRollingDataWindow(): Promise<void> {
  const usePostgres = process.env.USE_POSTGRES === 'true';

  console.log('🔄 Auto-updating rolling data window for demo patients...');

  // Use configured timezone (default to US Eastern for healthcare app)
  // Set TIMEZONE env var to override (e.g., "America/Los_Angeles" for Pacific)
  const timezone = process.env.TIMEZONE || 'America/New_York';

  // Helper to format any date in the configured timezone as YYYY-MM-DD
  const formatDateInTimezone = (date: Date): string => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };

  // Get current date in the user's timezone
  const now = new Date();
  const todayStr = formatDateInTimezone(now);

  console.log(`📅 Today's date: ${todayStr} (timezone: ${timezone}, UTC: ${now.toISOString()})`);

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

        console.log(`📊 Processing ${patient.firstName} ${patient.lastName} (${patientConfig.email})`);

        // Calculate dates relative to today using milliseconds (timezone-independent)
        const MS_PER_DAY = 24 * 60 * 60 * 1000;

        // Calculate admission date (daysAdmitted days ago)
        const newAdmissionDate = new Date(now.getTime() - patientConfig.daysAdmitted * MS_PER_DAY);
        const newAdmissionDateStr = formatDateInTimezone(newAdmissionDate);

        // Calculate rolling window start (windowDays-1 days ago)
        const windowStart = new Date(now.getTime() - (patientConfig.windowDays - 1) * MS_PER_DAY);
        const windowStartStr = formatDateInTimezone(windowStart);

        console.log(`  Rolling window: ${windowStartStr} to ${todayStr}`);

        // Always ensure risk assessment has non-round probabilities
        await db
          .update(pgSchema.riskAssessments)
          .set({
            deconditioning: { probability: 0.647, severity: 'moderate' },
            vte: { probability: 0.352, severity: 'moderate' },
            falls: { probability: 0.548, severity: 'moderate' },
            pressure: { probability: 0.403, severity: 'low' }
          })
          .where(eq(pgSchema.riskAssessments.patientId, patient.id));

        // Get ALL existing sessions for this patient
        const existingSessions = await db
          .select()
          .from(pgSchema.exerciseSessions)
          .where(eq(pgSchema.exerciseSessions.patientId, patient.id));

        // Categorize sessions
        const sessionsOutsideWindow: typeof existingSessions = [];
        const manualSessionsInWindow: typeof existingSessions = [];
        const autoSessionsInWindow: typeof existingSessions = [];
        const manualSessionDates = new Set<string>();

        for (const session of existingSessions) {
          const isWithinWindow = session.sessionDate >= windowStartStr && session.sessionDate <= todayStr;
          const isManual = (session as any).isManual === true;

          if (isWithinWindow) {
            if (isManual) {
              manualSessionsInWindow.push(session);
              manualSessionDates.add(session.sessionDate);
            } else {
              autoSessionsInWindow.push(session);
            }
          } else {
            sessionsOutsideWindow.push(session);
          }
        }

        console.log(`  Found: ${sessionsOutsideWindow.length} outside window, ${manualSessionsInWindow.length} manual in window, ${autoSessionsInWindow.length} auto in window`);

        // Delete ALL sessions outside the rolling window
        for (const session of sessionsOutsideWindow) {
          await db
            .delete(pgSchema.exerciseSessions)
            .where(eq(pgSchema.exerciseSessions.id, session.id));
        }
        if (sessionsOutsideWindow.length > 0) {
          console.log(`  ✗ Deleted ${sessionsOutsideWindow.length} sessions outside window`);
        }

        // Delete auto-generated sessions within window (to regenerate fresh ones)
        for (const session of autoSessionsInWindow) {
          await db
            .delete(pgSchema.exerciseSessions)
            .where(eq(pgSchema.exerciseSessions.id, session.id));
        }
        if (autoSessionsInWindow.length > 0) {
          console.log(`  ✗ Deleted ${autoSessionsInWindow.length} auto sessions to refresh`);
        }

        // Generate fresh auto-sessions for days WITHOUT manual sessions
        let generatedCount = 0;
        const generatedDates: string[] = [];
        for (let daysAgo = patientConfig.windowDays - 1; daysAgo >= 0; daysAgo--) {
          // Calculate this day's date using timezone-aware formatting
          const sessionDateTime = new Date(now.getTime() - daysAgo * MS_PER_DAY);
          const sessionDateStr = formatDateInTimezone(sessionDateTime);

          console.log(`  → Processing daysAgo=${daysAgo}, date=${sessionDateStr}`);

          // Skip if this date has a manual session
          if (manualSessionDates.has(sessionDateStr)) {
            console.log(`  → Skipping ${sessionDateStr} (has manual session)`);
            continue;
          }

          generatedDates.push(sessionDateStr);

          // Generate 1-2 sessions for this day
          const sessionsPerDay = Math.random() < 0.5 ? 1 : 2;
          const progressFactor = (patientConfig.windowDays - daysAgo) / patientConfig.windowDays;

          for (let sessionNum = 0; sessionNum < sessionsPerDay; sessionNum++) {
            const baseHour = sessionNum === 0 ? 9 : 14;
            const startTime = new Date(sessionDateTime);
            startTime.setHours(baseHour + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

            // Progressive improvement - duration stored in MINUTES
            const baseDuration = 8 + Math.floor(progressFactor * 12);
            const duration = baseDuration + Math.floor(Math.random() * 5); // 8-25 minutes

            const baseResistance = 2 + Math.floor(progressFactor * 3);
            const resistance = baseResistance + Math.floor(Math.random() * 2);

            const avgRpm = 45 + Math.floor(progressFactor * 20) + Math.floor(Math.random() * 10);
            const avgPower = Math.floor(avgRpm * resistance * 0.15);

            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + duration);

            await db
              .insert(pgSchema.exerciseSessions)
              .values({
                patientId: patient.id,
                sessionDate: sessionDateStr,
                startTime: startTime,
                endTime: endTime,
                duration: duration, // Stored in MINUTES
                resistance: resistance,
                avgRpm: avgRpm,
                maxRpm: avgRpm + Math.floor(Math.random() * 15) + 5,
                avgPower: avgPower,
                maxPower: avgPower + Math.floor(Math.random() * 20) + 10,
                caloriesBurned: Math.floor(duration * avgPower * 0.05),
                isCompleted: true,
                isManual: false,
                createdAt: new Date(),
                updatedAt: new Date()
              });

            generatedCount++;
          }
        }
        console.log(`  ✓ Generated ${generatedCount} fresh auto-sessions for dates: ${generatedDates.join(', ')}`);

        // Update admission date if needed
        if (patient.admissionDate !== newAdmissionDateStr) {
          await db
            .update(pgSchema.users)
            .set({
              admissionDate: newAdmissionDateStr,
              updatedAt: new Date()
            })
            .where(eq(pgSchema.users.id, patient.id));
          console.log(`  ✓ Updated admission date to ${newAdmissionDateStr}`);
        }

        // Update patient profile
        await db
          .update(pgSchema.patientProfiles)
          .set({
            daysImmobile: patientConfig.daysAdmitted,
            updatedAt: new Date()
          })
          .where(eq(pgSchema.patientProfiles.userId, patient.id));

        // Update EMS assessments to current dates
        const emsAssessments = await db
          .select()
          .from(pgSchema.emsAssessments)
          .where(eq(pgSchema.emsAssessments.patientId, patient.id))
          .orderBy(pgSchema.emsAssessments.assessedAt);

        if (emsAssessments.length > 0) {
          // Spread EMS assessments across the admission period
          const assessmentSpacing = Math.floor(patientConfig.daysAdmitted / (emsAssessments.length + 1));

          for (let i = 0; i < emsAssessments.length; i++) {
            const assessment = emsAssessments[i];
            const daysFromAdmission = assessmentSpacing * (i + 1);
            const newAssessedAt = new Date(newAdmissionDate);
            newAssessedAt.setDate(newAdmissionDate.getDate() + daysFromAdmission);
            newAssessedAt.setHours(10, 0, 0, 0);

            await db
              .update(pgSchema.emsAssessments)
              .set({ assessedAt: newAssessedAt })
              .where(eq(pgSchema.emsAssessments.id, assessment.id));
          }
          console.log(`  ✓ Updated ${emsAssessments.length} EMS assessment dates`);
        }

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

        // Recalculate patient stats from actual sessions
        const allPatientSessions = await db
          .select()
          .from(pgSchema.exerciseSessions)
          .where(eq(pgSchema.exerciseSessions.patientId, patient.id));

        const totalSessions = allPatientSessions.length;
        const totalDuration = allPatientSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

        await db
          .update(pgSchema.patientStats)
          .set({
            totalSessions: totalSessions,
            totalDuration: totalDuration, // Stored in MINUTES
            avgDailyDuration: avgSessionDuration,
            updatedAt: new Date()
          })
          .where(eq(pgSchema.patientStats.patientId, patient.id));

        console.log(`  ✓ Reset stats: ${totalSessions} sessions, ${totalDuration} total min, ${avgSessionDuration} avg min`);

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

        console.log(`📊 Processing ${patient.first_name} ${patient.last_name} (${patientConfig.email})`);

        // Calculate dates relative to today using milliseconds (timezone-independent)
        const MS_PER_DAY = 24 * 60 * 60 * 1000;

        // Calculate admission date (daysAdmitted days ago)
        const newAdmissionDate = new Date(now.getTime() - patientConfig.daysAdmitted * MS_PER_DAY);
        const newAdmissionDateStr = formatDateInTimezone(newAdmissionDate);

        // Calculate rolling window start (windowDays-1 days ago)
        const windowStart = new Date(now.getTime() - (patientConfig.windowDays - 1) * MS_PER_DAY);
        const windowStartStr = formatDateInTimezone(windowStart);

        console.log(`  Rolling window: ${windowStartStr} to ${todayStr}`);

        // Update risk assessment
        sqliteDb.prepare(`UPDATE risk_assessments SET
          deconditioning = ?, vte = ?, falls = ?, pressure = ?
          WHERE patient_id = ?`).run(
          JSON.stringify({ probability: 0.647, severity: 'moderate' }),
          JSON.stringify({ probability: 0.352, severity: 'moderate' }),
          JSON.stringify({ probability: 0.548, severity: 'moderate' }),
          JSON.stringify({ probability: 0.403, severity: 'low' }),
          patient.id
        );

        // Get all sessions
        const existingSessions = sqliteDb.prepare(
          'SELECT * FROM exercise_sessions WHERE patient_id = ?'
        ).all(patient.id) as any[];

        // Categorize sessions
        const sessionsOutsideWindow: any[] = [];
        const autoSessionsInWindow: any[] = [];
        const manualSessionDates = new Set<string>();

        for (const session of existingSessions) {
          const isWithinWindow = session.session_date >= windowStartStr && session.session_date <= todayStr;
          const isManual = session.is_manual === 1;

          if (isWithinWindow) {
            if (isManual) {
              manualSessionDates.add(session.session_date);
            } else {
              autoSessionsInWindow.push(session);
            }
          } else {
            sessionsOutsideWindow.push(session);
          }
        }

        // Delete sessions outside window
        for (const session of sessionsOutsideWindow) {
          sqliteDb.prepare('DELETE FROM exercise_sessions WHERE id = ?').run(session.id);
        }

        // Delete auto sessions in window (to regenerate)
        for (const session of autoSessionsInWindow) {
          sqliteDb.prepare('DELETE FROM exercise_sessions WHERE id = ?').run(session.id);
        }

        // Generate fresh sessions
        for (let daysAgo = patientConfig.windowDays - 1; daysAgo >= 0; daysAgo--) {
          // Calculate this day's date using timezone-aware formatting
          const sessionDateTime = new Date(now.getTime() - daysAgo * MS_PER_DAY);
          const sessionDateStr = formatDateInTimezone(sessionDateTime);

          // Skip if this date has a manual session
          if (manualSessionDates.has(sessionDateStr)) continue;

          const sessionsPerDay = Math.random() < 0.5 ? 1 : 2;
          const progressFactor = (patientConfig.windowDays - daysAgo) / patientConfig.windowDays;

          for (let sessionNum = 0; sessionNum < sessionsPerDay; sessionNum++) {
            const baseHour = sessionNum === 0 ? 9 : 14;
            const startTime = new Date(sessionDateTime);
            startTime.setHours(baseHour + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

            // Duration stored in MINUTES
            const baseDuration = 8 + Math.floor(progressFactor * 12);
            const duration = baseDuration + Math.floor(Math.random() * 5); // 8-25 minutes

            const baseResistance = 2 + Math.floor(progressFactor * 3);
            const resistance = baseResistance + Math.floor(Math.random() * 2);

            const avgRpm = 45 + Math.floor(progressFactor * 20) + Math.floor(Math.random() * 10);
            const avgPower = Math.floor(avgRpm * resistance * 0.15);

            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + duration);

            sqliteDb.prepare(`
              INSERT INTO exercise_sessions
              (patient_id, session_date, start_time, end_time, duration, resistance, avg_rpm, max_rpm, avg_power, max_power, calories_burned, is_completed, is_manual, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
            `).run(
              patient.id,
              sessionDateStr,
              Math.floor(startTime.getTime() / 1000),
              Math.floor(endTime.getTime() / 1000),
              duration, // Stored in MINUTES
              resistance,
              avgRpm,
              avgRpm + Math.floor(Math.random() * 15) + 5,
              avgPower,
              avgPower + Math.floor(Math.random() * 20) + 10,
              Math.floor(duration * avgPower * 0.05),
              Math.floor(Date.now() / 1000),
              Math.floor(Date.now() / 1000)
            );
          }
        }

        // Update admission date
        sqliteDb.prepare('UPDATE users SET admission_date = ?, updated_at = ? WHERE id = ?')
          .run(newAdmissionDateStr, Math.floor(Date.now() / 1000), patient.id);

        // Update patient profile
        sqliteDb.prepare('UPDATE patient_profiles SET days_immobile = ?, updated_at = ? WHERE user_id = ?')
          .run(patientConfig.daysAdmitted, Math.floor(Date.now() / 1000), patient.id);

        // Update EMS assessments
        const emsAssessments = sqliteDb.prepare('SELECT * FROM ems_assessments WHERE patient_id = ? ORDER BY assessed_at').all(patient.id) as any[];
        if (emsAssessments.length > 0) {
          const assessmentSpacing = Math.floor(patientConfig.daysAdmitted / (emsAssessments.length + 1));
          for (let i = 0; i < emsAssessments.length; i++) {
            const daysFromAdmission = assessmentSpacing * (i + 1);
            const newAssessedAt = new Date(newAdmissionDate);
            newAssessedAt.setDate(newAdmissionDate.getDate() + daysFromAdmission);
            newAssessedAt.setHours(10, 0, 0, 0);

            sqliteDb.prepare('UPDATE ems_assessments SET assessed_at = ? WHERE id = ?')
              .run(Math.floor(newAssessedAt.getTime() / 1000), emsAssessments[i].id);
          }
        }

        // Update protocol assignment
        const protocolAssignment = sqliteDb.prepare('SELECT * FROM patient_protocol_assignments WHERE patient_id = ?').get(patient.id) as any;
        if (protocolAssignment) {
          sqliteDb.prepare('UPDATE patient_protocol_assignments SET start_date = ?, updated_at = ? WHERE id = ?')
            .run(Math.floor(newAdmissionDate.getTime() / 1000), Math.floor(Date.now() / 1000), protocolAssignment.id);
        }

        // Recalculate patient stats from actual sessions
        const allPatientSessions = sqliteDb.prepare('SELECT * FROM exercise_sessions WHERE patient_id = ?').all(patient.id) as any[];
        const totalSessions = allPatientSessions.length;
        const totalDuration = allPatientSessions.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
        const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

        sqliteDb.prepare('UPDATE patient_stats SET total_sessions = ?, total_duration = ?, avg_daily_duration = ?, updated_at = ? WHERE patient_id = ?')
          .run(totalSessions, totalDuration, avgSessionDuration, Math.floor(Date.now() / 1000), patient.id);

        console.log(`  ✓ Reset stats: ${totalSessions} sessions, ${totalDuration} total min, ${avgSessionDuration} avg min`);

        updatedCount++;
      }

      sqliteDb.close();
    }

    if (updatedCount > 0) {
      console.log(`✅ Rolling data updated for ${updatedCount} demo patient(s)`);
    } else {
      console.log('✅ No demo patients found to update');
    }
  } catch (error) {
    console.error('Failed to update rolling data:', error);
  }
}
