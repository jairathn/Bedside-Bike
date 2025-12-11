/**
 * Personalized Protocol Matcher
 *
 * Patent Feature: Personalized Protocol Matching System
 *
 * This system implements personalized medicine approach for exercise protocols by:
 * 1. Multi-factor matching (diagnosis, comorbidities, age, mobility, preferences)
 * 2. Risk-based protocol selection (fall risk, deconditioning risk)
 * 3. Learned patient patterns integration
 * 4. Confidence scoring for recommendations
 * 5. Continuous adaptation based on outcomes
 */

import { db } from '../db';
import {
  clinicalProtocols,
  patientProfiles,
  patientPersonalizationProfiles,
  protocolMatchingCriteria,
  riskAssessments,
  exerciseSessions,
  users
} from '@shared/schema';
import { eq, and, desc, gte, sql, inArray } from 'drizzle-orm';
import { logger } from '../logger';
import { calculateRisks } from '../risk-calculator';
import type { RiskAssessmentInput } from '@shared/schema';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PatientMatchProfile {
  patientId: number;
  age: number;
  sex?: string;
  mobilityStatus: string;
  cognitiveStatus: string;
  levelOfCare: string;
  baselineFunction?: string;
  admissionDiagnosis?: string;
  comorbidities: string[];
  diagnosisCodes: string[];
  riskScores: {
    fallRisk: number;
    deconditioningRisk: number;
    vteRisk: number;
    pressureRisk: number;
  };
  personalization?: {
    personalityType?: string;
    bestPerformanceWindow?: string;
    avgFatigueOnsetMinutes?: number;
    currentProgressionLevel: number;
  };
}

export interface ProtocolMatch {
  protocolId: number;
  protocolName: string;
  indication: string;
  matchScore: number;         // 0-100 confidence score
  matchReasons: string[];     // Why this protocol was selected
  contraindications: string[];
  isPersonalized: boolean;    // Whether personalization influenced the match
  personalizationFactors?: string[];
  recommendedPhase: string;   // Starting phase based on patient profile
  adjustments: ProtocolAdjustment[];  // Personalized adjustments
}

export interface ProtocolAdjustment {
  parameter: string;          // 'duration', 'resistance', 'frequency', etc.
  originalValue: number | string;
  adjustedValue: number | string;
  reason: string;
}

export interface MatchingConfig {
  includeRiskBasedMatching: boolean;
  includePersonalization: boolean;
  minimumMatchScore: number;
  maxResults: number;
}

// ============================================================================
// PERSONALIZED PROTOCOL MATCHER CLASS
// ============================================================================

export class PersonalizedProtocolMatcher {
  private defaultConfig: MatchingConfig = {
    includeRiskBasedMatching: true,
    includePersonalization: true,
    minimumMatchScore: 30,
    maxResults: 5
  };

  /**
   * Main entry point: Find best matching protocols for a patient
   */
  async findMatchingProtocols(
    patientId: number,
    config?: Partial<MatchingConfig>,
    overrides?: { diagnosis?: string; comorbidities?: string[] }
  ): Promise<ProtocolMatch[]> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    try {
      // Step 1: Build comprehensive patient match profile
      const patientProfile = await this.buildPatientMatchProfile(patientId, overrides);
      if (!patientProfile) {
        logger.warn('Could not build patient profile for matching', { patientId });
        return [];
      }

      // Step 2: Get all active protocols with matching criteria
      const protocols = await this.getProtocolsWithCriteria();

      // Step 3: Score each protocol against patient profile
      const scoredProtocols = await Promise.all(
        protocols.map(protocol => this.scoreProtocol(protocol, patientProfile, mergedConfig))
      );

      // Step 4: Filter by minimum score and sort by match score
      const validMatches = scoredProtocols
        .filter(match => match.matchScore >= mergedConfig.minimumMatchScore)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, mergedConfig.maxResults);

      logger.info('Protocol matching completed', {
        patientId,
        matchesFound: validMatches.length,
        topMatch: validMatches[0]?.protocolName
      });

      return validMatches;

    } catch (error: any) {
      logger.error('Protocol matching failed', {
        error: error.message,
        patientId
      });
      return [];
    }
  }

  /**
   * Auto-match and assign the best protocol to a patient
   */
  async autoAssignBestProtocol(
    patientId: number,
    assignedBy: number
  ): Promise<{ success: boolean; protocol?: ProtocolMatch; reason?: string }> {
    try {
      const matches = await this.findMatchingProtocols(patientId, {
        minimumMatchScore: 50,  // Higher threshold for auto-assignment
        maxResults: 1
      });

      if (matches.length === 0) {
        return {
          success: false,
          reason: 'No suitable protocols found with sufficient match score (>50%)'
        };
      }

      const bestMatch = matches[0];

      // Check for any absolute contraindications
      if (bestMatch.contraindications.length > 0) {
        return {
          success: false,
          reason: `Protocol has contraindications: ${bestMatch.contraindications.join(', ')}`,
          protocol: bestMatch
        };
      }

      // Import protocol engine for assignment
      const { protocolEngine } = await import('../protocols/protocol-engine');

      const assignment = await protocolEngine.assignProtocol(
        patientId,
        bestMatch.protocolId,
        assignedBy,
        bestMatch.recommendedPhase
      );

      if (!assignment) {
        return {
          success: false,
          reason: 'Failed to create protocol assignment'
        };
      }

      logger.info('Auto-assigned protocol to patient', {
        patientId,
        protocolId: bestMatch.protocolId,
        protocolName: bestMatch.protocolName,
        matchScore: bestMatch.matchScore
      });

      return {
        success: true,
        protocol: bestMatch
      };

    } catch (error: any) {
      logger.error('Auto protocol assignment failed', {
        error: error.message,
        patientId
      });
      return {
        success: false,
        reason: error.message
      };
    }
  }

  /**
   * Build comprehensive patient profile for matching
   */
  private async buildPatientMatchProfile(
    patientId: number,
    overrides?: { diagnosis?: string; comorbidities?: string[] }
  ): Promise<PatientMatchProfile | null> {
    try {
      // Get patient profile
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      if (!profile.length) {
        logger.warn('Patient profile not found', { patientId });
        return null;
      }

      const p = profile[0];

      // Get personalization profile if exists
      const personalization = await db.select()
        .from(patientPersonalizationProfiles)
        .where(eq(patientPersonalizationProfiles.patientId, patientId))
        .limit(1);

      // Get latest risk assessment
      const riskAssessment = await db.select()
        .from(riskAssessments)
        .where(eq(riskAssessments.patientId, patientId))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(1);

      // Parse risk scores
      let riskScores = {
        fallRisk: 0.1,
        deconditioningRisk: 0.2,
        vteRisk: 0.05,
        pressureRisk: 0.05
      };

      if (riskAssessment.length) {
        try {
          const falls = JSON.parse(riskAssessment[0].falls);
          const decon = JSON.parse(riskAssessment[0].deconditioning);
          const vte = JSON.parse(riskAssessment[0].vte);
          const pressure = JSON.parse(riskAssessment[0].pressure);

          riskScores = {
            fallRisk: falls.probability || 0.1,
            deconditioningRisk: decon.probability || 0.2,
            vteRisk: vte.probability || 0.05,
            pressureRisk: pressure.probability || 0.05
          };
        } catch (e) {
          // Use defaults if parsing fails
        }
      }

      // Parse comorbidities and diagnosis codes
      const baseComorbidities = JSON.parse(p.comorbidities || '[]');
      const finalDiagnosis = overrides?.diagnosis || p.admissionDiagnosis || undefined;
      const finalComorbidities = overrides?.comorbidities || baseComorbidities;
      const diagnosisCodes = this.extractDiagnosisCodes(finalDiagnosis || '', finalComorbidities);

      return {
        patientId,
        age: p.age,
        sex: p.sex || undefined,
        mobilityStatus: p.mobilityStatus,
        cognitiveStatus: p.cognitiveStatus,
        levelOfCare: p.levelOfCare,
        baselineFunction: p.baselineFunction || undefined,
        admissionDiagnosis: finalDiagnosis,
        comorbidities: finalComorbidities,
        diagnosisCodes,
        riskScores,
        personalization: personalization.length ? {
          personalityType: personalization[0].personalityType || undefined,
          bestPerformanceWindow: personalization[0].bestPerformanceWindow || undefined,
          avgFatigueOnsetMinutes: personalization[0].avgFatigueOnsetMinutes || undefined,
          currentProgressionLevel: personalization[0].currentProgressionLevel || 1
        } : undefined
      };

    } catch (error: any) {
      logger.error('Failed to build patient match profile', {
        error: error.message,
        patientId
      });
      return null;
    }
  }

  /**
   * Get all protocols with their matching criteria
   */
  private async getProtocolsWithCriteria(): Promise<any[]> {
    try {
      const protocols = await db.select()
        .from(clinicalProtocols)
        .where(eq(clinicalProtocols.isActive, true));

      // Get matching criteria for each protocol
      const protocolsWithCriteria = await Promise.all(
        protocols.map(async (protocol) => {
          const criteria = await db.select()
            .from(protocolMatchingCriteria)
            .where(eq(protocolMatchingCriteria.protocolId, protocol.id))
            .limit(1);

          return {
            ...protocol,
            matchingCriteria: criteria[0] || null
          };
        })
      );

      return protocolsWithCriteria;

    } catch (error: any) {
      logger.error('Failed to get protocols with criteria', { error: error.message });
      return [];
    }
  }

  /**
   * Score a protocol against patient profile
   */
  private async scoreProtocol(
    protocol: any,
    patient: PatientMatchProfile,
    config: MatchingConfig
  ): Promise<ProtocolMatch> {
    const matchReasons: string[] = [];
    const personalizationFactors: string[] = [];
    const adjustments: ProtocolAdjustment[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Parse protocol data
    const protocolData = JSON.parse(protocol.protocolData || '{}');
    const contraindications = JSON.parse(protocol.contraindications || '[]');
    const diagnosisCodes = JSON.parse(protocol.diagnosisCodes || '[]');

    // ========================================================================
    // DIAGNOSIS MATCHING (40% weight)
    // ========================================================================
    maxPossibleScore += 40;

    // Check ICD-10 code match (bidirectional prefix matching)
    const codeMatch = patient.diagnosisCodes.some(code =>
      diagnosisCodes.some((pc: string) =>
        pc === code || code.startsWith(pc) || pc.startsWith(code)
      )
    );

    if (codeMatch) {
      totalScore += 35;
      matchReasons.push('Exact diagnosis code match');
    } else {
      // Keyword matching
      const indication = protocol.indication.toLowerCase();
      const diagnosis = (patient.admissionDiagnosis || '').toLowerCase();

      const keywordScore = this.calculateKeywordMatchScore(indication, diagnosis);
      totalScore += Math.round(keywordScore * 30);

      if (keywordScore > 0.5) {
        matchReasons.push(`Diagnosis keyword match (${Math.round(keywordScore * 100)}%)`);
      }
    }

    // ========================================================================
    // CONTRAINDICATION CHECK (-100 if matched)
    // ========================================================================
    const activeContraindications: string[] = [];
    for (const ci of contraindications) {
      const ciLower = ci.toLowerCase();
      const hasContraindication = patient.comorbidities.some(
        c => c.toLowerCase().includes(ciLower)
      );
      if (hasContraindication) {
        activeContraindications.push(ci);
      }
    }

    if (activeContraindications.length > 0) {
      // Don't completely zero out - allow clinician override
      totalScore = Math.max(0, totalScore - 50);
      matchReasons.push(`Warning: Relative contraindication(s) present`);
    }

    // ========================================================================
    // AGE APPROPRIATENESS (15% weight)
    // ========================================================================
    maxPossibleScore += 15;
    const criteria = protocol.matchingCriteria;

    if (criteria) {
      const minAge = criteria.minAge || 0;
      const maxAge = criteria.maxAge || 150;

      if (patient.age >= minAge && patient.age <= maxAge) {
        totalScore += 15;
        matchReasons.push('Age within protocol range');
      } else if (Math.abs(patient.age - minAge) <= 5 || Math.abs(patient.age - maxAge) <= 5) {
        totalScore += 8;
        matchReasons.push('Age near protocol range boundary');
      }
    } else {
      // No age restrictions
      totalScore += 10;
    }

    // ========================================================================
    // MOBILITY STATUS MATCHING (15% weight)
    // ========================================================================
    maxPossibleScore += 15;

    if (criteria?.requiredMobilityLevels) {
      const requiredLevels = JSON.parse(criteria.requiredMobilityLevels || '[]');
      const excludedLevels = JSON.parse(criteria.excludedMobilityLevels || '[]');

      if (excludedLevels.includes(patient.mobilityStatus)) {
        totalScore -= 10;
        matchReasons.push(`Mobility status ${patient.mobilityStatus} excluded`);
      } else if (requiredLevels.length === 0 || requiredLevels.includes(patient.mobilityStatus)) {
        totalScore += 15;
        matchReasons.push('Mobility status appropriate');
      }
    } else {
      totalScore += 10;
    }

    // ========================================================================
    // RISK-BASED MATCHING (20% weight)
    // ========================================================================
    if (config.includeRiskBasedMatching) {
      maxPossibleScore += 20;

      // Fall risk consideration
      if (criteria?.maxFallRisk && patient.riskScores.fallRisk > criteria.maxFallRisk) {
        matchReasons.push(`Fall risk (${Math.round(patient.riskScores.fallRisk * 100)}%) exceeds protocol threshold`);

        // Add resistance adjustment instead of rejection
        adjustments.push({
          parameter: 'resistance',
          originalValue: protocolData.phases?.[0]?.resistance || 3,
          adjustedValue: Math.max(1, (protocolData.phases?.[0]?.resistance || 3) - 1),
          reason: 'Reduced due to elevated fall risk'
        });
      } else {
        totalScore += 10;
      }

      // Deconditioning risk consideration
      if (criteria?.maxDeconditioningRisk &&
          patient.riskScores.deconditioningRisk > criteria.maxDeconditioningRisk) {
        matchReasons.push('High deconditioning risk - protocol may need acceleration');

        // Add frequency adjustment
        adjustments.push({
          parameter: 'frequency',
          originalValue: protocolData.phases?.[0]?.frequency || 'BID',
          adjustedValue: 'TID',
          reason: 'Increased due to deconditioning risk'
        });
      } else {
        totalScore += 10;
      }
    }

    // ========================================================================
    // PERSONALIZATION FACTORS (10% weight)
    // ========================================================================
    if (config.includePersonalization && patient.personalization) {
      maxPossibleScore += 10;

      // Fatigue pattern adjustment
      if (patient.personalization.avgFatigueOnsetMinutes) {
        const avgFatigue = patient.personalization.avgFatigueOnsetMinutes;
        const protocolDuration = protocolData.phases?.[0]?.duration || 15;

        if (avgFatigue < protocolDuration) {
          adjustments.push({
            parameter: 'duration',
            originalValue: protocolDuration,
            adjustedValue: Math.round(avgFatigue * 0.9),  // 90% of fatigue onset
            reason: `Adjusted based on patient fatigue pattern (onset at ${avgFatigue}min)`
          });
          personalizationFactors.push('Fatigue-aware duration adjustment');
        }

        totalScore += 5;
      }

      // Progression level consideration
      if (patient.personalization.currentProgressionLevel > 1) {
        personalizationFactors.push(`Starting at progression level ${patient.personalization.currentProgressionLevel}`);
        totalScore += 5;
      }
    }

    // ========================================================================
    // CALCULATE FINAL SCORE AND DETERMINE PHASE
    // ========================================================================
    const finalScore = Math.round((totalScore / maxPossibleScore) * 100);

    // Determine recommended starting phase
    const recommendedPhase = this.determineStartingPhase(protocolData, patient);

    return {
      protocolId: protocol.id,
      protocolName: protocol.name,
      indication: protocol.indication,
      matchScore: Math.max(0, Math.min(100, finalScore)),
      matchReasons,
      contraindications: activeContraindications,
      isPersonalized: personalizationFactors.length > 0,
      personalizationFactors: personalizationFactors.length > 0 ? personalizationFactors : undefined,
      recommendedPhase,
      adjustments
    };
  }

  /**
   * Calculate keyword match score between indication and diagnosis
   */
  private calculateKeywordMatchScore(indication: string, diagnosis: string): number {
    if (!indication || !diagnosis) return 0;

    const indicationWords = indication.split(/\s+/).filter(w => w.length > 3);
    const diagnosisWords = diagnosis.split(/\s+/).filter(w => w.length > 3);

    if (indicationWords.length === 0) return 0;

    let matchCount = 0;
    for (const word of indicationWords) {
      if (diagnosisWords.some(dw => dw.includes(word) || word.includes(dw))) {
        matchCount++;
      }
    }

    return matchCount / indicationWords.length;
  }

  /**
   * Extract diagnosis codes from diagnosis text and comorbidities
   */
  private extractDiagnosisCodes(diagnosis: string, comorbidities: string[]): string[] {
    const codes: string[] = [];

    // ICD-10 pattern matching
    const icd10Pattern = /[A-Z]\d{2}(?:\.\d{1,4})?/gi;

    const diagnosisMatches = diagnosis.match(icd10Pattern) || [];
    codes.push(...diagnosisMatches.map(c => c.toUpperCase()));

    for (const comorbidity of comorbidities) {
      const comorbidityMatches = comorbidity.match(icd10Pattern) || [];
      codes.push(...comorbidityMatches.map(c => c.toUpperCase()));
    }

    // Map common diagnoses to ICD-10 codes
    const diagnosisMap: Record<string, string[]> = {
      'knee replacement': ['Z96.641', 'Z96.642', 'M17'],
      'hip replacement': ['Z96.641', 'Z96.642', 'M16'],
      'tka': ['Z96.641', 'Z96.642'],
      'tha': ['Z96.641', 'Z96.642'],
      'pneumonia': ['J18.9', 'J15.9', 'J12.9'],
      'copd': ['J44.9', 'J44.1'],
      'heart failure': ['I50.9', 'I50.1', 'I50.2'],
      'chf': ['I50.9'],
      'stroke': ['I63.9', 'I64'],
      'hip fracture': ['S72.0', 'S72.1'],
      'sepsis': ['A41.9', 'R65.20'],
      'covid': ['U07.1', 'J12.82'],
    };

    const diagnosisLower = diagnosis.toLowerCase();
    for (const [term, icdCodes] of Object.entries(diagnosisMap)) {
      if (diagnosisLower.includes(term)) {
        codes.push(...icdCodes);
      }
    }

    return [...new Set(codes)];  // Remove duplicates
  }

  /**
   * Determine appropriate starting phase based on patient profile
   */
  private determineStartingPhase(protocolData: any, patient: PatientMatchProfile): string {
    const phases = protocolData.phases || [];
    if (phases.length === 0) return 'Phase 1';

    // Default to first phase
    let recommendedPhase = phases[0].phase;

    // Consider mobility status
    const mobilityScores: Record<string, number> = {
      'bedbound': 0,
      'chair_bound': 1,
      'standing_assist': 2,
      'walking_assist': 3,
      'independent': 4
    };

    const mobilityScore = mobilityScores[patient.mobilityStatus] || 0;

    // Higher functioning patients might start in a later phase
    if (mobilityScore >= 3 && phases.length > 1) {
      // Check if patient's baseline function supports advanced phase
      if (patient.baselineFunction === 'independent' && patient.riskScores.fallRisk < 0.15) {
        recommendedPhase = phases[1].phase;
      }
    }

    // Consider progression level from personalization
    if (patient.personalization?.currentProgressionLevel > 1) {
      const levelIndex = Math.min(
        patient.personalization.currentProgressionLevel - 1,
        phases.length - 1
      );
      recommendedPhase = phases[levelIndex].phase;
    }

    return recommendedPhase;
  }

  /**
   * Get personalization profile for a patient, creating if needed
   */
  async getOrCreatePersonalizationProfile(patientId: number): Promise<any> {
    try {
      const existing = await db.select()
        .from(patientPersonalizationProfiles)
        .where(eq(patientPersonalizationProfiles.patientId, patientId))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Create new profile with defaults
      const result = await db.insert(patientPersonalizationProfiles)
        .values({
          patientId,
          currentProgressionLevel: 1,
          daysAtCurrentLevel: 0,
          consecutiveSuccessfulSessions: 0,
          inSetbackRecovery: false
        });

      return {
        id: result.lastInsertRowid,
        patientId,
        currentProgressionLevel: 1,
        daysAtCurrentLevel: 0,
        consecutiveSuccessfulSessions: 0,
        inSetbackRecovery: false
      };

    } catch (error: any) {
      logger.error('Failed to get/create personalization profile', {
        error: error.message,
        patientId
      });
      return null;
    }
  }

  /**
   * Update personalization profile based on session performance
   */
  async updatePersonalizationFromSession(
    patientId: number,
    sessionId: number,
    sessionMetrics: {
      duration: number;
      avgPower: number;
      timeOfDay: string;
      targetAchieved: boolean;
    }
  ): Promise<void> {
    try {
      const profile = await this.getOrCreatePersonalizationProfile(patientId);
      if (!profile) return;

      const updates: any = {
        updatedAt: new Date()
      };

      // Update time-of-day performance tracking
      const timeKey = `avg${sessionMetrics.timeOfDay.charAt(0).toUpperCase() + sessionMetrics.timeOfDay.slice(1)}Power`;
      if (profile[timeKey] !== undefined) {
        // Rolling average
        const currentAvg = profile[timeKey] || sessionMetrics.avgPower;
        updates[timeKey] = (currentAvg * 0.7) + (sessionMetrics.avgPower * 0.3);
      }

      // Update best performance window
      const windowPowers = {
        morning: profile.avgMorningPower || 0,
        afternoon: profile.avgAfternoonPower || 0,
        evening: profile.avgEveningPower || 0
      };
      windowPowers[sessionMetrics.timeOfDay as keyof typeof windowPowers] =
        updates[timeKey] || sessionMetrics.avgPower;

      const bestWindow = Object.entries(windowPowers)
        .sort(([, a], [, b]) => b - a)[0][0];
      updates.bestPerformanceWindow = bestWindow;

      // Update consecutive successful sessions
      if (sessionMetrics.targetAchieved) {
        updates.consecutiveSuccessfulSessions = (profile.consecutiveSuccessfulSessions || 0) + 1;
        updates.inSetbackRecovery = false;  // Successful session = recovery
      } else {
        updates.consecutiveSuccessfulSessions = 0;
      }

      await db.update(patientPersonalizationProfiles)
        .set(updates)
        .where(eq(patientPersonalizationProfiles.patientId, patientId));

      logger.debug('Updated personalization profile', { patientId, updates });

    } catch (error: any) {
      logger.error('Failed to update personalization profile', {
        error: error.message,
        patientId
      });
    }
  }

  /**
   * Detect personality type from early sessions
   */
  async detectPersonalityType(patientId: number): Promise<{
    type: string;
    confidence: number;
    indicators: string[];
  }> {
    try {
      // Get recent sessions and engagement patterns
      const sessions = await db.select()
        .from(exerciseSessions)
        .where(eq(exerciseSessions.patientId, patientId))
        .orderBy(desc(exerciseSessions.startTime))
        .limit(10);

      if (sessions.length < 3) {
        return {
          type: 'undetermined',
          confidence: 0,
          indicators: ['Insufficient session data (need 3+ sessions)']
        };
      }

      const indicators: string[] = [];
      const scores = {
        competitive: 0,
        achievement: 0,
        health_focused: 0,
        social: 0
      };

      // Analyze session patterns
      const avgDuration = sessions.reduce((sum, s) => sum + (s.durationSeconds || s.duration || 0), 0) / sessions.length;
      const avgPower = sessions.reduce((sum, s) => sum + (s.avgPower || 0), 0) / sessions.length;

      // High performers who exceed targets = competitive
      const exceedsTarget = sessions.filter(s =>
        (s.durationSeconds || 0) > (s.targetDuration || 600) * 1.1
      ).length;
      if (exceedsTarget / sessions.length > 0.5) {
        scores.competitive += 30;
        indicators.push('Frequently exceeds target duration');
      }

      // Consistent performers = achievement-oriented
      const durations = sessions.map(s => s.durationSeconds || s.duration || 0);
      const durationVariance = this.calculateVariance(durations);
      if (durationVariance < 0.15 * avgDuration) {
        scores.achievement += 25;
        indicators.push('Very consistent session durations');
      }

      // Frequency-focused = health-focused
      const daysBetweenSessions = this.calculateDaysBetweenSessions(sessions);
      if (daysBetweenSessions < 1.5) {
        scores.health_focused += 25;
        indicators.push('High session frequency');
      }

      // Determine type
      const maxScore = Math.max(...Object.values(scores));
      const type = Object.entries(scores).find(([, score]) => score === maxScore)?.[0] || 'undetermined';
      const confidence = Math.min(maxScore / 50, 1);  // Max confidence at 50 points

      // Update profile
      if (confidence >= 0.4) {
        await db.update(patientPersonalizationProfiles)
          .set({
            personalityType: type,
            personalityConfidence: confidence,
            updatedAt: new Date()
          })
          .where(eq(patientPersonalizationProfiles.patientId, patientId));
      }

      return { type, confidence, indicators };

    } catch (error: any) {
      logger.error('Failed to detect personality type', {
        error: error.message,
        patientId
      });
      return { type: 'undetermined', confidence: 0, indicators: [] };
    }
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private calculateDaysBetweenSessions(sessions: any[]): number {
    if (sessions.length < 2) return 7;  // Default

    const timestamps = sessions
      .map(s => s.startTime ? new Date(s.startTime).getTime() : 0)
      .filter(t => t > 0)
      .sort((a, b) => b - a);

    if (timestamps.length < 2) return 7;

    const totalDays = (timestamps[0] - timestamps[timestamps.length - 1]) / (1000 * 60 * 60 * 24);
    return totalDays / (timestamps.length - 1);
  }
}

// Singleton instance
export const personalizedProtocolMatcher = new PersonalizedProtocolMatcher();
