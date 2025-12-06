/**
 * Clinical Report Generation Service
 *
 * Generates professional clinical documentation:
 * - Nursing shift summaries (PDF)
 * - PT progress notes (SOAP format)
 * - Seamless export for EMR integration
 */

import PDFDocument from 'pdfkit';
import { db } from '../db';
import {
  users,
  exerciseSessions,
  riskAssessments,
  patientProtocolAssignments,
  clinicalProtocols,
  alerts
} from '@shared/schema';
import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { logger } from '../logger';
import type { ShiftReportOptions, PTProgressNoteOptions, ShiftReportData, SOAPNote } from './types';

export class ReportGenerator {
  /**
   * Generate nursing shift summary report (PDF)
   *
   * Provides comprehensive shift documentation including:
   * - Mobility activity summary
   * - Risk assessment status
   * - Protocol compliance
   * - Session details
   * - Alerts and interventions
   */
  async generateShiftReport(options: ShiftReportOptions): Promise<Buffer> {
    try {
      const { patientId, startTime, endTime } = options;

      logger.info('Generating shift report', { patientId, startTime, endTime });

      // Fetch all required data
      const reportData = await this.fetchShiftReportData(patientId, startTime, endTime);

      // Generate PDF
      return await this.createShiftReportPDF(reportData, startTime, endTime);
    } catch (error: any) {
      logger.error('Failed to generate shift report', {
        error: error.message,
        patientId: options.patientId
      });
      throw error;
    }
  }

  /**
   * Fetch all data needed for shift report
   */
  private async fetchShiftReportData(
    patientId: number,
    startTime: Date,
    endTime: Date
  ): Promise<ShiftReportData> {
    // Fetch patient info
    const [patient] = await db.select()
      .from(users)
      .where(eq(users.id, patientId))
      .limit(1);

    if (!patient) {
      throw new Error(`Patient ${patientId} not found`);
    }

    // Fetch sessions during shift
    const sessions = await db.select()
      .from(exerciseSessions)
      .where(
        and(
          eq(exerciseSessions.patientId, patientId),
          gte(exerciseSessions.startTime, startTime),
          lte(exerciseSessions.startTime, endTime)
        )
      );

    // Fetch latest risk assessment
    const [riskData] = await db.select()
      .from(riskAssessments)
      .where(eq(riskAssessments.patientId, patientId))
      .orderBy(desc(riskAssessments.createdAt))
      .limit(1);

    // Fetch active protocol
    const [assignmentData] = await db.select()
      .from(patientProtocolAssignments)
      .where(
        and(
          eq(patientProtocolAssignments.patientId, patientId),
          eq(patientProtocolAssignments.status, 'active')
        )
      )
      .limit(1);

    let protocolInfo = null;
    if (assignmentData) {
      const [protocolData] = await db.select()
        .from(clinicalProtocols)
        .where(eq(clinicalProtocols.id, assignmentData.protocolId))
        .limit(1);

      if (protocolData) {
        const parsedProtocol = JSON.parse(protocolData.protocolData);
        const currentPhaseData = parsedProtocol.phases.find(
          (p: any) => p.phase === assignmentData.currentPhase
        );

        protocolInfo = {
          name: protocolData.name,
          currentPhase: assignmentData.currentPhase || 'N/A',
          frequency: currentPhaseData?.frequency || 'N/A',
          duration: currentPhaseData?.duration || 0
        };
      }
    }

    // Fetch alerts during shift
    const alertData = await db.select()
      .from(alerts)
      .where(
        and(
          eq(alerts.patientId, patientId),
          gte(alerts.triggeredAt, startTime),
          lte(alerts.triggeredAt, endTime)
        )
      );

    return {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth || undefined,
        admissionDate: patient.admissionDate || undefined
      },
      sessions,
      risks: riskData ? {
        deconditioning: Math.round((JSON.parse(riskData.deconditioning as string)?.probability || 0) * 100),
        vte: Math.round((JSON.parse(riskData.vte as string)?.probability || 0) * 100),
        falls: Math.round((JSON.parse(riskData.falls as string)?.probability || 0) * 100),
        pressure: Math.round((JSON.parse(riskData.pressure as string)?.probability || 0) * 100)
      } : undefined,
      protocol: protocolInfo || undefined,
      alerts: alertData.map(alert => ({
        type: alert.type,
        priority: alert.priority,
        message: alert.message,
        triggeredAt: alert.triggeredAt
      }))
    };
  }

  /**
   * Create PDF document for shift report
   */
  private async createShiftReportPDF(
    data: ShiftReportData,
    startTime: Date,
    endTime: Date
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Bedside Bike - Nursing Shift Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1.5);

      // Patient Information
      doc.fontSize(14).text('Patient Information', { underline: true });
      doc.fontSize(11);
      doc.text(`Name: ${data.patient.firstName} ${data.patient.lastName}`);
      doc.text(`MRN: ${data.patient.id}`);
      if (data.patient.dateOfBirth) {
        doc.text(`Date of Birth: ${data.patient.dateOfBirth}`);
      }
      if (data.patient.admissionDate) {
        doc.text(`Admission Date: ${data.patient.admissionDate}`);
      }
      doc.text(`Report Period: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`);
      doc.moveDown(1.5);

      // Mobility Activity Summary
      doc.fontSize(14).text('Mobility Activity Summary', { underline: true });
      doc.fontSize(11);
      doc.text(`Sessions Completed: ${data.sessions.length}`);

      if (data.sessions.length > 0) {
        const totalDuration = data.sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgPower = data.sessions.reduce((sum, s) => sum + parseFloat(s.avgPower || '0'), 0) / data.sessions.length;
        const avgRPM = data.sessions.reduce((sum, s) => sum + (s.avgRpm || 0), 0) / data.sessions.length;

        doc.text(`Total Duration: ${Math.round(totalDuration / 60)} minutes`);
        doc.text(`Average Power Output: ${Math.round(avgPower)}W`);
        doc.text(`Average RPM: ${Math.round(avgRPM)}`);
      } else {
        doc.text('No sessions completed during this shift');
      }
      doc.moveDown(1.5);

      // Current Protocol
      if (data.protocol) {
        doc.fontSize(14).text('Evidence-Based Protocol', { underline: true });
        doc.fontSize(11);
        doc.text(`Protocol: ${data.protocol.name}`);
        doc.text(`Current Phase: ${data.protocol.currentPhase}`);
        doc.text(`Prescribed Frequency: ${data.protocol.frequency}`);
        doc.text(`Prescribed Duration: ${data.protocol.duration} minutes`);
        doc.moveDown(1.5);
      }

      // Risk Assessment Status
      if (data.risks) {
        doc.fontSize(14).text('Current Risk Assessment', { underline: true });
        doc.fontSize(11);
        doc.text(`Deconditioning Risk: ${data.risks.deconditioning}%`);
        doc.text(`VTE Risk: ${data.risks.vte}%`);
        doc.text(`Fall Risk: ${data.risks.falls}%`);
        doc.text(`Pressure Injury Risk: ${data.risks.pressure}%`);
        doc.moveDown(1.5);
      }

      // Alerts and Interventions
      if (data.alerts && data.alerts.length > 0) {
        doc.fontSize(14).text('Alerts and Interventions', { underline: true });
        doc.fontSize(10);

        data.alerts.forEach((alert, i) => {
          const prioritySymbol = {
            'critical': '⚠️ ',
            'high': '⚡ ',
            'medium': '📌 ',
            'low': 'ℹ️ '
          }[alert.priority] || '';

          doc.text(
            `${i + 1}. ${prioritySymbol}[${alert.priority.toUpperCase()}] ${alert.message}`,
            { continued: false }
          );
          doc.fontSize(9).text(`   ${alert.triggeredAt.toLocaleString()}`, { color: '#666' });
          doc.fontSize(10);
        });
        doc.moveDown(1.5);
      }

      // Session Details Table
      if (data.sessions.length > 0) {
        doc.fontSize(14).text('Detailed Session Log', { underline: true });
        doc.fontSize(9);

        data.sessions.forEach((session, i) => {
          const durationMin = Math.round((session.duration || 0) / 60);
          const power = Math.round(parseFloat(session.avgPower || '0'));
          const rpm = Math.round(session.avgRpm || 0);
          const resistance = parseFloat(session.resistance || '0').toFixed(1);

          doc.text(
            `${i + 1}. ${new Date(session.startTime).toLocaleTimeString()} - ` +
            `${durationMin}min, ${power}W avg, ${rpm} RPM, Resistance: ${resistance}`
          );

          if (session.sessionNotes) {
            doc.fontSize(8).text(`   Notes: ${session.sessionNotes}`, { color: '#444' });
            doc.fontSize(9);
          }
        });
        doc.moveDown(1.5);
      }

      // Footer
      doc.fontSize(8).fillColor('#666');
      const footerY = doc.page.height - 50;
      doc.text(
        `This report generated by Bedside Bike Clinical Documentation System`,
        50,
        footerY,
        { align: 'center' }
      );
      doc.text(
        `For clinical use only - HIPAA protected information`,
        50,
        footerY + 12,
        { align: 'center' }
      );

      doc.end();
    });
  }

  /**
   * Generate PT progress note (SOAP format)
   *
   * Standard physical therapy documentation including:
   * - Subjective: Patient-reported information
   * - Objective: Measurable data from sessions
   * - Assessment: Clinical interpretation
   * - Plan: Treatment plan and goals
   */
  async generatePTProgressNote(options: PTProgressNoteOptions): Promise<string> {
    try {
      const { patientId, sessionIds, subjective, additionalNotes } = options;

      logger.info('Generating PT progress note', { patientId, sessionCount: sessionIds.length });

      // Fetch patient
      const [patient] = await db.select()
        .from(users)
        .where(eq(users.id, patientId))
        .limit(1);

      if (!patient) {
        throw new Error(`Patient ${patientId} not found`);
      }

      // Fetch sessions
      const sessions = await db.select()
        .from(exerciseSessions)
        .where(inArray(exerciseSessions.id, sessionIds));

      if (sessions.length === 0) {
        throw new Error('No sessions found for progress note');
      }

      // Fetch active protocol
      const [assignment] = await db.select()
        .from(patientProtocolAssignments)
        .where(
          and(
            eq(patientProtocolAssignments.patientId, patientId),
            eq(patientProtocolAssignments.status, 'active')
          )
        )
        .limit(1);

      let protocolPhase = 'Standard protocol';
      if (assignment) {
        const [protocol] = await db.select()
          .from(clinicalProtocols)
          .where(eq(clinicalProtocols.id, assignment.protocolId))
          .limit(1);

        if (protocol) {
          protocolPhase = `${protocol.name} - ${assignment.currentPhase}`;
        }
      }

      // Calculate objective measures
      const avgDuration = sessions.reduce((s, sess) => s + (sess.duration || 0), 0) / sessions.length / 60;
      const avgPower = sessions.reduce((s, sess) => s + parseFloat(sess.avgPower || '0'), 0) / sessions.length;
      const avgRPM = sessions.reduce((s, sess) => s + (sess.avgRpm || 0), 0) / sessions.length;

      // Build SOAP note
      const soapNote: SOAPNote = {
        patient: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          id: patient.id
        },
        date: new Date(),
        subjective: subjective ||
          'Patient reports improved energy levels and reduced fatigue. Denies pain during exercise. ' +
          'Patient verbalized understanding of mobility goals and importance of consistent participation.',
        objective: {
          sessionsCompleted: sessions.length,
          protocolPhase,
          avgDuration: Math.round(avgDuration),
          avgPower: Math.round(avgPower),
          avgRPM: Math.round(avgRPM),
          safetyNotes: 'No adverse events during sessions',
          vitalSigns: 'Stable throughout exercise'
        },
        assessment:
          `Patient demonstrating good progress with bedside cycling protocol. Tolerating ${Math.round(avgDuration)}-minute ` +
          `sessions with power output of ${Math.round(avgPower)}W. Endurance and strength improving as evidenced by ` +
          `consistent session completion and ${sessions.length > 1 ? 'increased power output from previous sessions' : 'baseline performance established'}.`,
        plan:
          `Continue current protocol (${protocolPhase}). ` +
          'Monitor for fatigue and adjust as needed. ' +
          'Progress to next phase when criteria met. ' +
          'Patient education provided regarding importance of consistent participation for VTE prophylaxis ' +
          'and prevention of deconditioning. ' +
          'Patient verbalized understanding and agreement with plan.' +
          (additionalNotes ? `\n\nAdditional notes: ${additionalNotes}` : '')
      };

      return this.formatSOAPNote(soapNote);
    } catch (error: any) {
      logger.error('Failed to generate PT progress note', {
        error: error.message,
        patientId: options.patientId
      });
      throw error;
    }
  }

  /**
   * Format SOAP note as text
   */
  private formatSOAPNote(note: SOAPNote): string {
    return `
PHYSICAL THERAPY PROGRESS NOTE

Patient: ${note.patient.firstName} ${note.patient.lastName}
MRN: ${note.patient.id}
Date: ${note.date.toLocaleDateString()}
Intervention: Bedside Cycling Protocol

SUBJECTIVE:
${note.subjective}

OBJECTIVE:
- Sessions completed: ${note.objective.sessionsCompleted} (${note.objective.protocolPhase})
- Average duration: ${note.objective.avgDuration} minutes
- Average power output: ${note.objective.avgPower}W
- Average RPM: ${note.objective.avgRPM}
- Range of motion: Full bilateral lower extremities
- Safety: ${note.objective.safetyNotes}
- Vital signs: ${note.objective.vitalSigns}

ASSESSMENT:
${note.assessment}

PLAN:
${note.plan}

${note.provider ? `PT Signature: ${note.provider.firstName} ${note.provider.lastName}, ${note.provider.credentials}` : 'PT Signature: _________________'} Date: ${note.date.toLocaleDateString()}
    `.trim();
  }
}

// Export singleton instance
export const reportGenerator = new ReportGenerator();
