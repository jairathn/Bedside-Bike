/**
 * Smart Alert Engine
 *
 * Intelligent clinical alert system that monitors patient activity,
 * protocol compliance, and safety parameters in real-time.
 *
 * Key Features:
 * - Session completion monitoring
 * - Inactivity alerts (24h, 48h)
 * - Protocol compliance checking
 * - Automated alert generation and broadcasting
 */

import { db } from '../db';
import {
  users,
  exerciseSessions,
  patientProtocolAssignments,
  alerts as alertsTable
} from '@shared/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { logger } from '../logger';
import type { Alert, AlertType, AlertContext, AlertSummary } from './types';
import { protocolEngine } from '../protocols/protocol-engine';

export class AlertEngine {
  /**
   * Check for session completion issues
   */
  async checkSessionAlerts(sessionId: number): Promise<Alert[]> {
    const generatedAlerts: Alert[] = [];

    try {
      const [session] = await db.select()
        .from(exerciseSessions)
        .where(eq(exerciseSessions.id, sessionId))
        .limit(1);

      if (!session) {
        logger.warn('Session not found for alert check', { sessionId });
        return generatedAlerts;
      }

      // Get expected duration from protocol or use default
      const expectedDuration = session.targetDuration || 900; // 15min default

      // Alert if session stopped significantly early
      if (session.duration && session.duration < expectedDuration * 0.75) {
        const alert: Alert = {
          patientId: session.patientId,
          type: 'session_incomplete',
          priority: 'medium',
          message: `Session stopped at ${Math.round(session.duration / 60)}min (goal: ${Math.round(expectedDuration / 60)}min)`,
          actionRequired: 'Check on patient - possible fatigue, discomfort, or need for assistance',
          triggeredAt: new Date(),
          metadata: {
            sessionId,
            expectedDuration,
            actualDuration: session.duration,
            percentComplete: Math.round((session.duration / expectedDuration) * 100)
          }
        };

        await this.createAlert(alert);
        generatedAlerts.push(alert);
      }

      // Alert if session had many interruptions
      if (session.stopsAndStarts && session.stopsAndStarts > 5) {
        const alert: Alert = {
          patientId: session.patientId,
          type: 'session_paused_long',
          priority: 'low',
          message: `Session had ${session.stopsAndStarts} interruptions`,
          actionRequired: 'Assess patient tolerance and adjust protocol if needed',
          triggeredAt: new Date(),
          metadata: {
            sessionId,
            stopsAndStarts: session.stopsAndStarts
          }
        };

        await this.createAlert(alert);
        generatedAlerts.push(alert);
      }

      logger.info('Session alerts checked', {
        sessionId,
        alertsGenerated: generatedAlerts.length
      });
    } catch (error: any) {
      logger.error('Failed to check session alerts', {
        error: error.message,
        sessionId
      });
    }

    return generatedAlerts;
  }

  /**
   * Check for prolonged patient inactivity (24h, 48h)
   */
  async checkInactivityAlerts(): Promise<Alert[]> {
    const generatedAlerts: Alert[] = [];
    const now = new Date();

    try {
      // Get all active patients
      const patients = await db.select()
        .from(users)
        .where(eq(users.userType, 'patient'));

      for (const patient of patients) {
        const [lastSession] = await db.select()
          .from(exerciseSessions)
          .where(eq(exerciseSessions.patientId, patient.id))
          .orderBy(desc(exerciseSessions.startTime))
          .limit(1);

        if (!lastSession) {
          // No sessions ever - patient just admitted
          continue;
        }

        const hoursSinceLastSession =
          (now.getTime() - new Date(lastSession.startTime).getTime()) / (1000 * 60 * 60);

        // Check if alert already exists for this patient today
        const existingAlert = await this.getRecentAlert(
          patient.id,
          hoursSinceLastSession >= 48 ? 'no_activity_48h' : 'no_activity_24h',
          24 // within last 24 hours
        );

        if (existingAlert) {
          // Alert already sent, don't spam
          continue;
        }

        // 48-hour inactivity - high priority
        if (hoursSinceLastSession >= 48) {
          const alert: Alert = {
            patientId: patient.id,
            type: 'no_activity_48h',
            priority: 'high',
            message: `${patient.firstName} ${patient.lastName}: No mobility activity in 48 hours`,
            actionRequired: 'Implement mobility protocol immediately - elevated VTE risk',
            triggeredAt: now,
            metadata: {
              lastSessionTime: lastSession.startTime,
              hoursSinceLastSession: Math.round(hoursSinceLastSession)
            }
          };

          await this.createAlert(alert);
          generatedAlerts.push(alert);
        }
        // 24-hour inactivity - medium priority
        else if (hoursSinceLastSession >= 24) {
          const alert: Alert = {
            patientId: patient.id,
            type: 'no_activity_24h',
            priority: 'medium',
            message: `${patient.firstName} ${patient.lastName}: No mobility activity in 24 hours`,
            actionRequired: 'Schedule mobility session per protocol',
            triggeredAt: now,
            metadata: {
              lastSessionTime: lastSession.startTime,
              hoursSinceLastSession: Math.round(hoursSinceLastSession)
            }
          };

          await this.createAlert(alert);
          generatedAlerts.push(alert);
        }
      }

      logger.info('Inactivity alerts checked', {
        patientsChecked: patients.length,
        alertsGenerated: generatedAlerts.length
      });
    } catch (error: any) {
      logger.error('Failed to check inactivity alerts', {
        error: error.message
      });
    }

    return generatedAlerts;
  }

  /**
   * Check protocol compliance for a patient
   */
  async checkProtocolCompliance(patientId: number): Promise<Alert | null> {
    try {
      // Get active protocol assignment
      const [assignment] = await db.select()
        .from(patientProtocolAssignments)
        .where(
          and(
            eq(patientProtocolAssignments.patientId, patientId),
            eq(patientProtocolAssignments.status, 'active')
          )
        )
        .limit(1);

      if (!assignment) {
        // No protocol assigned, no compliance to check
        return null;
      }

      // Get current prescription
      const prescription = await protocolEngine.getCurrentPrescription(patientId);
      if (!prescription) return null;

      // Count today's sessions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySessions = await db.select()
        .from(exerciseSessions)
        .where(
          and(
            eq(exerciseSessions.patientId, patientId),
            gte(exerciseSessions.startTime, today)
          )
        );

      const expectedSessions = this.parseFrequency(prescription.frequency);
      const completedSessions = todaySessions.length;

      // Only alert after 6pm if behind schedule
      const currentHour = new Date().getHours();
      if (completedSessions < expectedSessions && currentHour >= 18) {
        const alert: Alert = {
          patientId,
          type: 'protocol_non_compliance',
          priority: 'medium',
          message: `Protocol compliance: ${completedSessions}/${expectedSessions} sessions completed today`,
          actionRequired: `Complete remaining ${expectedSessions - completedSessions} session(s) before end of day`,
          triggeredAt: new Date(),
          metadata: {
            protocolPhase: assignment.currentPhase,
            expectedSessions,
            completedSessions,
            frequency: prescription.frequency
          }
        };

        await this.createAlert(alert);
        return alert;
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to check protocol compliance', {
        error: error.message,
        patientId
      });
      return null;
    }
  }

  /**
   * Parse frequency string to number of sessions per day
   */
  private parseFrequency(frequency: string): number {
    const frequencyMap: Record<string, number> = {
      'QD': 1,
      'daily': 1,
      'once daily': 1,
      'BID': 2,
      'twice daily': 2,
      'TID': 3,
      'three times daily': 3,
      'QID': 4,
      'four times daily': 4
    };

    return frequencyMap[frequency] || frequencyMap[frequency.toLowerCase()] || 3;
  }

  /**
   * Create and store alert in database
   */
  async createAlert(alert: Alert): Promise<number> {
    try {
      const [result] = await db.insert(alertsTable)
        .values({
          patientId: alert.patientId,
          type: alert.type,
          priority: alert.priority,
          message: alert.message,
          actionRequired: alert.actionRequired,
          triggeredAt: alert.triggeredAt,
          metadata: alert.metadata ? JSON.stringify(alert.metadata) : null
        })
        .returning({ id: alertsTable.id });

      logger.info('Alert created', {
        alertId: result.id,
        patientId: alert.patientId,
        type: alert.type,
        priority: alert.priority
      });

      return result.id;
    } catch (error: any) {
      logger.error('Failed to create alert', {
        error: error.message,
        alert
      });
      throw error;
    }
  }

  /**
   * Get alerts for a patient
   */
  async getPatientAlerts(
    patientId: number,
    includeAcknowledged: boolean = false
  ): Promise<Alert[]> {
    try {
      const conditions = includeAcknowledged
        ? [eq(alertsTable.patientId, patientId)]
        : [
            eq(alertsTable.patientId, patientId),
            eq(alertsTable.acknowledgedAt, null as any)
          ];

      const results = await db.select()
        .from(alertsTable)
        .where(and(...conditions))
        .orderBy(desc(alertsTable.triggeredAt));

      return results.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
      }));
    } catch (error: any) {
      logger.error('Failed to get patient alerts', {
        error: error.message,
        patientId
      });
      return [];
    }
  }

  /**
   * Get all unacknowledged alerts
   */
  async getAllUnacknowledgedAlerts(): Promise<Alert[]> {
    try {
      const results = await db.select()
        .from(alertsTable)
        .where(eq(alertsTable.acknowledgedAt, null as any))
        .orderBy(desc(alertsTable.triggeredAt));

      return results.map(row => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
      }));
    } catch (error: any) {
      logger.error('Failed to get unacknowledged alerts', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: number, acknowledgedBy: number): Promise<boolean> {
    try {
      await db.update(alertsTable)
        .set({
          acknowledgedAt: new Date(),
          acknowledgedBy
        })
        .where(eq(alertsTable.id, alertId));

      logger.info('Alert acknowledged', {
        alertId,
        acknowledgedBy
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to acknowledge alert', {
        error: error.message,
        alertId
      });
      return false;
    }
  }

  /**
   * Get alert summary statistics
   */
  async getAlertSummary(patientId?: number): Promise<AlertSummary> {
    try {
      const conditions = patientId
        ? [eq(alertsTable.patientId, patientId)]
        : [];

      const allAlerts = await db.select()
        .from(alertsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const summary: AlertSummary = {
        total: allAlerts.length,
        byPriority: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        byType: {},
        unacknowledged: 0
      };

      for (const alert of allAlerts) {
        // Count by priority
        summary.byPriority[alert.priority as keyof typeof summary.byPriority]++;

        // Count by type
        summary.byType[alert.type] = (summary.byType[alert.type] || 0) + 1;

        // Count unacknowledged
        if (!alert.acknowledgedAt) {
          summary.unacknowledged++;
        }
      }

      return summary;
    } catch (error: any) {
      logger.error('Failed to get alert summary', {
        error: error.message,
        patientId
      });

      return {
        total: 0,
        byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
        byType: {},
        unacknowledged: 0
      };
    }
  }

  /**
   * Check if a recent alert of this type already exists
   */
  private async getRecentAlert(
    patientId: number,
    type: AlertType,
    hoursAgo: number
  ): Promise<Alert | null> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursAgo);

    const [result] = await db.select()
      .from(alertsTable)
      .where(
        and(
          eq(alertsTable.patientId, patientId),
          eq(alertsTable.type, type),
          gte(alertsTable.triggeredAt, cutoff)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Run all alert checks for a patient
   */
  async runAllChecks(patientId: number): Promise<Alert[]> {
    const allAlerts: Alert[] = [];

    // Check protocol compliance
    const complianceAlert = await this.checkProtocolCompliance(patientId);
    if (complianceAlert) {
      allAlerts.push(complianceAlert);
    }

    return allAlerts;
  }
}

// Export singleton instance
export const alertEngine = new AlertEngine();
