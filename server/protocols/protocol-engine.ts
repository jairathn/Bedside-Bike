import { db } from '../db';
import { clinicalProtocols, patientProtocolAssignments, exerciseSessions, users } from '@shared/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { logger } from '../logger';
import type {
  ClinicalProtocol,
  ProtocolPhase,
  ProtocolPrescription,
  ProgressionCheck,
  ProtocolAssignment
} from './types';

/**
 * Evidence-Based Clinical Protocol Engine
 *
 * Provides automated protocol matching, prescription generation,
 * and progression logic based on diagnosis and patient progress.
 */
export class ProtocolEngine {
  /**
   * Match patient diagnosis to appropriate protocol
   *
   * @param diagnosis - Admission diagnosis or clinical indication
   * @param comorbidities - List of patient comorbidities
   * @param diagnosisCodes - Optional ICD-10 codes
   * @returns Matched protocol or null if none suitable
   */
  async matchProtocol(
    diagnosis: string,
    comorbidities: string[] = [],
    diagnosisCodes: string[] = []
  ): Promise<ClinicalProtocol | null> {
    try {
      // Get all active protocols
      const protocols = await db.select()
        .from(clinicalProtocols)
        .where(eq(clinicalProtocols.isActive, true));

      logger.debug('Matching protocol', { diagnosis, comorbidities, diagnosisCodes });

      // Try exact diagnosis code match first
      if (diagnosisCodes.length > 0) {
        for (const protocol of protocols) {
          const protocolCodes = JSON.parse(protocol.diagnosisCodes || '[]');
          const hasMatch = diagnosisCodes.some(code =>
            protocolCodes.some((pc: string) => pc === code)
          );

          if (hasMatch && !this.hasContraindication(protocol, comorbidities)) {
            logger.info('Protocol matched by diagnosis code', {
              protocol: protocol.name,
              diagnosisCode: diagnosisCodes[0]
            });
            return this.parseProtocol(protocol);
          }
        }
      }

      // Fall back to keyword matching in indication
      const diagnosisLower = diagnosis.toLowerCase();

      for (const protocol of protocols) {
        const indication = protocol.indication.toLowerCase();

        // Check if diagnosis contains key terms from protocol indication
        const keywords = indication.split(/\s+/).filter(w => w.length > 3);
        const hasMatch = keywords.some(keyword => diagnosisLower.includes(keyword));

        if (hasMatch && !this.hasContraindication(protocol, comorbidities)) {
          logger.info('Protocol matched by keyword', {
            protocol: protocol.name,
            diagnosis
          });
          return this.parseProtocol(protocol);
        }
      }

      logger.warn('No protocol matched', { diagnosis, comorbidities });
      return null;

    } catch (error: any) {
      logger.error('Protocol matching failed', {
        error: error.message,
        diagnosis
      });
      return null;
    }
  }

  /**
   * Check if patient has contraindications for protocol
   */
  private hasContraindication(protocol: any, comorbidities: string[]): boolean {
    const contraindications = JSON.parse(protocol.contraindications || '[]');

    return contraindications.some((ci: string) =>
      comorbidities.some(c => c.toLowerCase().includes(ci.toLowerCase()))
    );
  }

  /**
   * Parse protocol from database format to typed object
   */
  private parseProtocol(protocol: any): ClinicalProtocol {
    const protocolData = JSON.parse(protocol.protocolData);

    return {
      id: protocol.id,
      name: protocol.name,
      indication: protocol.indication,
      contraindications: JSON.parse(protocol.contraindications || '[]'),
      diagnosisCodes: JSON.parse(protocol.diagnosisCodes || '[]'),
      phases: protocolData.phases || [],
      evidenceCitation: protocol.evidenceCitation,
      isActive: protocol.isActive === 1
    };
  }

  /**
   * Assign protocol to patient
   *
   * @param patientId - Patient ID
   * @param protocolId - Protocol ID to assign
   * @param assignedBy - Provider ID assigning the protocol
   * @param startPhase - Optional starting phase (defaults to first phase)
   * @returns Assignment record
   */
  async assignProtocol(
    patientId: number,
    protocolId: number,
    assignedBy: number,
    startPhase?: string
  ): Promise<ProtocolAssignment | null> {
    try {
      // Get protocol to determine starting phase
      const protocol = await db.select()
        .from(clinicalProtocols)
        .where(eq(clinicalProtocols.id, protocolId))
        .limit(1);

      if (!protocol.length) {
        logger.error('Protocol not found', { protocolId });
        return null;
      }

      const parsedProtocol = this.parseProtocol(protocol[0]);
      const initialPhase = startPhase || parsedProtocol.phases[0]?.phase;

      if (!initialPhase) {
        logger.error('Protocol has no phases', { protocolId });
        return null;
      }

      // Deactivate any existing active protocols for this patient
      await db.update(patientProtocolAssignments)
        .set({ status: 'discontinued' })
        .where(
          and(
            eq(patientProtocolAssignments.patientId, patientId),
            eq(patientProtocolAssignments.status, 'active')
          )
        );

      // Create new assignment
      const now = new Date();
      const result = await db.insert(patientProtocolAssignments)
        .values({
          patientId,
          protocolId,
          assignedBy,
          currentPhase: initialPhase,
          startDate: now,
          progressionDate: now,
          status: 'active'
          // createdAt and updatedAt use database defaults
        });

      logger.info('Protocol assigned to patient', {
        patientId,
        protocolId,
        protocol: parsedProtocol.name,
        phase: initialPhase
      });

      return {
        id: result.lastInsertRowid as number,
        patientId,
        protocolId,
        assignedBy,
        currentPhase: initialPhase,
        startDate: now,
        status: 'active'
      };

    } catch (error: any) {
      console.error('Protocol assignment error:', error);
      logger.error('Failed to assign protocol', {
        error: error.message,
        stack: error.stack,
        patientId,
        protocolId
      });
      return null;
    }
  }

  /**
   * Get current prescription for patient based on active protocol
   *
   * @param patientId - Patient ID
   * @returns Current exercise prescription or null
   */
  async getCurrentPrescription(patientId: number): Promise<ProtocolPrescription | null> {
    try {
      // Get active protocol assignment
      const assignment = await db.select()
        .from(patientProtocolAssignments)
        .where(
          and(
            eq(patientProtocolAssignments.patientId, patientId),
            eq(patientProtocolAssignments.status, 'active')
          )
        )
        .limit(1);

      if (!assignment.length) {
        logger.debug('No active protocol for patient', { patientId });
        return null;
      }

      // Get protocol details
      const protocol = await db.select()
        .from(clinicalProtocols)
        .where(eq(clinicalProtocols.id, assignment[0].protocolId))
        .limit(1);

      if (!protocol.length) {
        logger.error('Protocol not found for assignment', {
          assignmentId: assignment[0].id,
          protocolId: assignment[0].protocolId
        });
        return null;
      }

      const parsedProtocol = this.parseProtocol(protocol[0]);
      const currentPhase = parsedProtocol.phases.find(
        p => p.phase === assignment[0].currentPhase
      );

      if (!currentPhase) {
        logger.error('Current phase not found in protocol', {
          protocol: parsedProtocol.name,
          phase: assignment[0].currentPhase
        });
        return null;
      }

      return {
        frequency: currentPhase.frequency,
        duration: currentPhase.duration,
        resistance: currentPhase.resistance,
        rpm: currentPhase.rpm,
        phase: currentPhase.phase,
        goals: currentPhase.goals,
        rationale: `${parsedProtocol.name} - ${currentPhase.phase}: ${currentPhase.goals}`,
        monitoringParams: currentPhase.monitoringParams,
        stopCriteria: currentPhase.stopCriteria
      };

    } catch (error: any) {
      logger.error('Failed to get prescription', {
        error: error.message,
        patientId
      });
      return null;
    }
  }

  /**
   * Check if patient should progress to next protocol phase
   *
   * @param patientId - Patient ID
   * @returns Progression recommendation
   */
  async checkProgressionCriteria(patientId: number): Promise<ProgressionCheck> {
    try {
      // Get active protocol assignment
      const assignment = await db.select()
        .from(patientProtocolAssignments)
        .where(
          and(
            eq(patientProtocolAssignments.patientId, patientId),
            eq(patientProtocolAssignments.status, 'active')
          )
        )
        .limit(1);

      if (!assignment.length) {
        return {
          shouldProgress: false,
          currentPhase: 'none',
          reason: 'No active protocol'
        };
      }

      // Get protocol details
      const protocol = await db.select()
        .from(clinicalProtocols)
        .where(eq(clinicalProtocols.id, assignment[0].protocolId))
        .limit(1);

      if (!protocol.length) {
        return {
          shouldProgress: false,
          currentPhase: assignment[0].currentPhase,
          reason: 'Protocol not found'
        };
      }

      const parsedProtocol = this.parseProtocol(protocol[0]);
      const currentPhaseIndex = parsedProtocol.phases.findIndex(
        p => p.phase === assignment[0].currentPhase
      );

      if (currentPhaseIndex === -1) {
        return {
          shouldProgress: false,
          currentPhase: assignment[0].currentPhase,
          reason: 'Current phase not found in protocol'
        };
      }

      // Check if already in final phase
      if (currentPhaseIndex === parsedProtocol.phases.length - 1) {
        return {
          shouldProgress: false,
          currentPhase: assignment[0].currentPhase,
          reason: 'Already in final phase'
        };
      }

      const currentPhase = parsedProtocol.phases[currentPhaseIndex];
      const nextPhase = parsedProtocol.phases[currentPhaseIndex + 1];

      // Get recent sessions (last 5)
      const recentSessions = await db.select()
        .from(exerciseSessions)
        .where(eq(exerciseSessions.patientId, patientId))
        .orderBy(desc(exerciseSessions.startTime))
        .limit(5);

      if (recentSessions.length < 3) {
        return {
          shouldProgress: false,
          currentPhase: currentPhase.phase,
          reason: 'Need more sessions to evaluate progression (minimum 3)',
          criteria: currentPhase.progressionCriteria
        };
      }

      // Calculate average performance
      const avgDuration = recentSessions.reduce(
        (sum, s) => sum + (s.durationSeconds || s.duration || 0), 0
      ) / recentSessions.length;

      const avgPower = recentSessions.reduce(
        (sum, s) => sum + (s.avgPower || 0), 0
      ) / recentSessions.length;

      const targetDuration = currentPhase.duration * 60; // Convert minutes to seconds

      // Progression logic: Patient must consistently meet duration targets
      // (achieving 90% or more of target duration)
      if (avgDuration >= targetDuration * 0.9 && recentSessions.length >= 3) {
        logger.info('Patient meets progression criteria', {
          patientId,
          currentPhase: currentPhase.phase,
          nextPhase: nextPhase.phase,
          avgDuration: Math.round(avgDuration),
          targetDuration
        });

        return {
          shouldProgress: true,
          currentPhase: currentPhase.phase,
          nextPhase: nextPhase.phase,
          reason: `Patient consistently meeting duration targets (${Math.round(avgDuration/60)}min avg, ${Math.round(avgPower)}W avg)`,
          criteria: currentPhase.progressionCriteria
        };
      }

      return {
        shouldProgress: false,
        currentPhase: currentPhase.phase,
        reason: `Need more consistent performance (current avg: ${Math.round(avgDuration/60)}min, target: ${currentPhase.duration}min)`,
        criteria: currentPhase.progressionCriteria
      };

    } catch (error: any) {
      logger.error('Failed to check progression criteria', {
        error: error.message,
        patientId
      });
      return {
        shouldProgress: false,
        currentPhase: 'unknown',
        reason: `Error: ${error.message}`
      };
    }
  }

  /**
   * Progress patient to next phase
   *
   * @param patientId - Patient ID
   * @returns Success boolean
   */
  async progressToNextPhase(patientId: number): Promise<boolean> {
    try {
      const check = await this.checkProgressionCriteria(patientId);

      if (!check.shouldProgress || !check.nextPhase) {
        logger.warn('Cannot progress patient', {
          patientId,
          reason: check.reason
        });
        return false;
      }

      // Update assignment to next phase
      await db.update(patientProtocolAssignments)
        .set({
          currentPhase: check.nextPhase,
          progressionDate: new Date()
          // updatedAt handled by trigger or app logic
        })
        .where(
          and(
            eq(patientProtocolAssignments.patientId, patientId),
            eq(patientProtocolAssignments.status, 'active')
          )
        );

      logger.info('Patient progressed to next phase', {
        patientId,
        fromPhase: check.currentPhase,
        toPhase: check.nextPhase
      });

      return true;

    } catch (error: any) {
      logger.error('Failed to progress patient', {
        error: error.message,
        patientId
      });
      return false;
    }
  }

  /**
   * Parse frequency string to daily session count
   */
  parseFrequency(frequency: string): number {
    const map: Record<string, number> = {
      'QD': 1, 'daily': 1, 'once daily': 1,
      'BID': 2, 'twice daily': 2,
      'TID': 3, 'three times daily': 3,
      'QID': 4, 'four times daily': 4
    };
    return map[frequency.toLowerCase()] || map[frequency] || 3;
  }

  /**
   * Get all active protocols
   */
  async getAllProtocols(): Promise<ClinicalProtocol[]> {
    try {
      const protocols = await db.select()
        .from(clinicalProtocols)
        .where(eq(clinicalProtocols.isActive, true));

      return protocols.map(p => this.parseProtocol(p));
    } catch (error: any) {
      logger.error('Failed to get protocols', { error: error.message });
      return [];
    }
  }

  /**
   * Get protocol by ID
   */
  async getProtocolById(id: number): Promise<ClinicalProtocol | null> {
    try {
      const protocol = await db.select()
        .from(clinicalProtocols)
        .where(eq(clinicalProtocols.id, id))
        .limit(1);

      if (!protocol.length) return null;
      return this.parseProtocol(protocol[0]);
    } catch (error: any) {
      logger.error('Failed to get protocol by ID', { error: error.message, id });
      return null;
    }
  }

  /**
   * Get patient's current protocol assignment
   */
  async getPatientAssignment(patientId: number): Promise<any | null> {
    try {
      const assignment = await db.select()
        .from(patientProtocolAssignments)
        .where(
          and(
            eq(patientProtocolAssignments.patientId, patientId),
            eq(patientProtocolAssignments.status, 'active')
          )
        )
        .limit(1);

      if (!assignment.length) return null;

      // Get protocol details
      const protocol = await this.getProtocolById(assignment[0].protocolId);

      // Get assigner details
      const assigner = await db.select()
        .from(users)
        .where(eq(users.id, assignment[0].assignedBy))
        .limit(1);

      return {
        ...assignment[0],
        protocol,
        assignedByName: assigner.length ?
          `${assigner[0].firstName} ${assigner[0].lastName}` :
          'Unknown'
      };
    } catch (error: any) {
      logger.error('Failed to get patient assignment', {
        error: error.message,
        patientId
      });
      return null;
    }
  }
}

// Singleton instance
export const protocolEngine = new ProtocolEngine();
