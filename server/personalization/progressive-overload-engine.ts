/**
 * Progressive Overload & Setback Recovery Engine
 *
 * Patent Feature 4.2: Progressive Overload Auto-Scheduling
 * Patent Feature 10.5: Setback Recovery Protocol
 *
 * Progressive Overload Novel Aspects:
 * - Resistance +5% when patient completes 3 consecutive sessions at target duration
 * - Duration +2 minutes when patient maintains target power for full session
 * - Cadence target +5 RPM when consistency achieved
 * - Adaptation monitoring (does patient maintain performance at new level?)
 * - Auto-regression if patient struggles (drop back to previous level)
 * - Plateau detection and workout variation injection
 * - Visualization of predicted future performance as expanding confidence cone
 *
 * Setback Recovery Novel Aspects:
 * - Setback detection (sudden performance decline >20%, missed sessions >3 days)
 * - Automatic recovery protocol:
 *   - Temporary goal reduction (prevent demoralization)
 *   - Increased encouragement frequency
 *   - Re-baseline assessment
 *   - Offer clinician consultation
 * - Recovery tracking (time to return to baseline)
 */

import { db } from '../db';
import {
  patientPersonalizationProfiles,
  exerciseSessions,
  patientGoals,
  alerts,
  patientProtocolAssignments,
  clinicalProtocols
} from '@shared/schema';
import { eq, and, desc, gte, lt } from 'drizzle-orm';
import { logger } from '../logger';
import type {
  ProgressionCheck,
  ProgressionDirection,
  ProgressionParameter,
  ProgressionHistory,
  SetbackDetection,
  SetbackType,
  SetbackRecoveryPlan
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ProgressionConfig {
  // Session requirements for progression
  consecutiveSessionsRequired: number;      // Sessions meeting target to trigger progression
  targetAchievementThreshold: number;       // % of target that counts as "meeting" (e.g., 90%)

  // Progression increments
  resistanceIncrement: number;              // Resistance levels to increase
  durationIncrementMinutes: number;         // Minutes to add
  cadenceIncrementRPM: number;              // RPM to increase

  // Safety limits
  maxResistanceLevel: number;
  maxDurationMinutes: number;
  maxCadenceRPM: number;

  // Adaptation monitoring
  adaptationWindowDays: number;             // Days to monitor after progression
  struggleThreshold: number;                // If target achievement drops below this, regress

  // Plateau detection
  plateauWindowDays: number;                // Days of no improvement = plateau
  plateauImprovementThreshold: number;      // Minimum improvement % to not be plateau
}

interface SetbackConfig {
  // Detection thresholds
  performanceDeclineThreshold: number;      // 20% decline = setback
  missedSessionsDaysThreshold: number;      // 3+ days = setback
  bilateralImbalanceThreshold: number;      // >25% = concern

  // Recovery protocol
  goalReductionPercent: number;             // How much to reduce goals
  rebaselineAfterDays: number;              // Days before re-evaluating baseline
  recoveryMonitoringDays: number;           // Days to track recovery
}

const DEFAULT_PROGRESSION_CONFIG: ProgressionConfig = {
  consecutiveSessionsRequired: 3,
  targetAchievementThreshold: 0.90,

  resistanceIncrement: 0.5,                 // Half a level
  durationIncrementMinutes: 2,
  cadenceIncrementRPM: 5,

  maxResistanceLevel: 9,
  maxDurationMinutes: 30,
  maxCadenceRPM: 80,

  adaptationWindowDays: 3,
  struggleThreshold: 0.75,

  plateauWindowDays: 7,
  plateauImprovementThreshold: 0.05         // 5% improvement
};

const DEFAULT_SETBACK_CONFIG: SetbackConfig = {
  performanceDeclineThreshold: 0.20,
  missedSessionsDaysThreshold: 3,
  bilateralImbalanceThreshold: 0.25,

  goalReductionPercent: 0.25,               // 25% reduction
  rebaselineAfterDays: 5,
  recoveryMonitoringDays: 7
};

// ============================================================================
// PROGRESSIVE OVERLOAD ENGINE CLASS
// ============================================================================

export class ProgressiveOverloadEngine {
  private progressionConfig: ProgressionConfig;
  private setbackConfig: SetbackConfig;

  constructor(
    progressionConfig?: Partial<ProgressionConfig>,
    setbackConfig?: Partial<SetbackConfig>
  ) {
    this.progressionConfig = { ...DEFAULT_PROGRESSION_CONFIG, ...progressionConfig };
    this.setbackConfig = { ...DEFAULT_SETBACK_CONFIG, ...setbackConfig };
  }

  /**
   * Evaluate patient for progression after a completed session
   *
   * Called after each session completion
   */
  async evaluateProgression(patientId: number, sessionId: number): Promise<ProgressionCheck> {
    try {
      // First check for setbacks
      const setbackCheck = await this.checkForSetback(patientId);
      if (setbackCheck.detected) {
        await this.initiateSetbackRecovery(patientId, setbackCheck);
        return {
          shouldProgress: false,
          direction: 'decrease',
          currentValue: 0,
          reason: `Setback detected: ${setbackCheck.type}. Initiating recovery protocol.`,
          confidence: 0.9
        };
      }

      // Get personalization profile
      const profile = await this.getOrCreateProfile(patientId);

      // If in setback recovery, check for recovery completion
      if (profile.inSetbackRecovery) {
        const recovered = await this.checkRecoveryCompletion(patientId, profile);
        if (!recovered) {
          return {
            shouldProgress: false,
            direction: 'maintain',
            currentValue: profile.currentProgressionLevel,
            reason: 'Patient in setback recovery mode. Monitoring for improvement.',
            confidence: 0.8
          };
        }
      }

      // Get recent sessions
      const recentSessions = await this.getRecentSessions(patientId, 7);  // Last 7 days

      if (recentSessions.length < this.progressionConfig.consecutiveSessionsRequired) {
        return {
          shouldProgress: false,
          direction: 'maintain',
          currentValue: profile.currentProgressionLevel,
          reason: `Need ${this.progressionConfig.consecutiveSessionsRequired} sessions for progression evaluation. Have ${recentSessions.length}.`,
          confidence: 0.5
        };
      }

      // Check plateau
      const plateau = await this.checkForPlateau(patientId, recentSessions);
      if (plateau.detected) {
        return await this.handlePlateau(patientId, profile, plateau);
      }

      // Evaluate progression criteria
      const progressionResult = await this.checkProgressionCriteria(patientId, profile, recentSessions);

      // If should progress, apply the progression
      if (progressionResult.shouldProgress) {
        await this.applyProgression(patientId, profile, progressionResult);
      }

      return progressionResult;

    } catch (error: any) {
      logger.error('Progression evaluation failed', { error: error.message, patientId });
      return {
        shouldProgress: false,
        direction: 'maintain',
        currentValue: 0,
        reason: `Error: ${error.message}`,
        confidence: 0
      };
    }
  }

  /**
   * Check if patient meets criteria for progression
   */
  private async checkProgressionCriteria(
    patientId: number,
    profile: any,
    sessions: any[]
  ): Promise<ProgressionCheck> {
    // Get patient goals
    const goals = await db.select()
      .from(patientGoals)
      .where(and(
        eq(patientGoals.patientId, patientId),
        eq(patientGoals.isActive, true)
      ));

    const durationGoal = goals.find(g => g.goalType === 'duration');
    const powerGoal = goals.find(g => g.goalType === 'power');

    // Calculate target achievement for recent sessions
    const recentN = Math.min(sessions.length, this.progressionConfig.consecutiveSessionsRequired);
    const recentSessions = sessions.slice(0, recentN);

    // Check duration achievement
    const durationAchievements = recentSessions.map(s => {
      const target = s.targetDuration || (durationGoal?.targetValue || 15) * 60;
      const actual = s.durationSeconds || s.duration * 60;
      return actual / target;
    });

    const avgDurationAchievement = this.average(durationAchievements);
    const allMeetDuration = durationAchievements.every(
      a => a >= this.progressionConfig.targetAchievementThreshold
    );

    // Check power achievement
    const powerAchievements = recentSessions.map(s => {
      const target = powerGoal?.targetValue || 30;
      return (s.avgPower || 0) / target;
    });

    const avgPowerAchievement = this.average(powerAchievements);

    // Determine which parameter to progress
    let progressionParameter: ProgressionParameter | undefined;
    let currentValue: number = profile.currentProgressionLevel;
    let newValue: number | undefined;
    let shouldProgress = false;
    let reason = '';

    if (allMeetDuration && avgDurationAchievement >= this.progressionConfig.targetAchievementThreshold) {
      // Patient consistently meeting duration targets
      if (avgPowerAchievement >= 1.0) {
        // Meeting power targets too - increase resistance
        progressionParameter = 'resistance';
        currentValue = this.getCurrentResistance(sessions);
        newValue = Math.min(
          currentValue + this.progressionConfig.resistanceIncrement,
          this.progressionConfig.maxResistanceLevel
        );
        shouldProgress = currentValue < this.progressionConfig.maxResistanceLevel;
        reason = `Consistently meeting duration (${Math.round(avgDurationAchievement * 100)}%) and power (${Math.round(avgPowerAchievement * 100)}%) targets.`;
      } else {
        // Meeting duration but not power - increase duration first
        progressionParameter = 'duration';
        currentValue = Math.round(this.average(recentSessions.map(s =>
          (s.durationSeconds || s.duration * 60) / 60
        )));
        newValue = Math.min(
          currentValue + this.progressionConfig.durationIncrementMinutes,
          this.progressionConfig.maxDurationMinutes
        );
        shouldProgress = currentValue < this.progressionConfig.maxDurationMinutes;
        reason = `Meeting duration targets (${Math.round(avgDurationAchievement * 100)}%). Increasing duration to build endurance.`;
      }
    } else if (avgDurationAchievement >= 0.8) {
      // Close to meeting targets - maintain and encourage
      reason = `Progress improving. Duration achievement: ${Math.round(avgDurationAchievement * 100)}%. Continue current level.`;
    } else {
      // Not meeting targets
      reason = `Not yet meeting targets. Duration: ${Math.round(avgDurationAchievement * 100)}%, Power: ${Math.round(avgPowerAchievement * 100)}%. Maintain current level.`;
    }

    const confidence = this.calculateProgressionConfidence(
      recentSessions.length,
      avgDurationAchievement,
      avgPowerAchievement
    );

    return {
      shouldProgress,
      direction: shouldProgress ? 'increase' : 'maintain',
      parameter: progressionParameter,
      currentValue,
      newValue,
      reason,
      confidence
    };
  }

  /**
   * Apply progression to patient goals
   */
  private async applyProgression(
    patientId: number,
    profile: any,
    progression: ProgressionCheck
  ): Promise<void> {
    try {
      // Update personalization profile
      await db.update(patientPersonalizationProfiles)
        .set({
          currentProgressionLevel: (profile.currentProgressionLevel || 1) + 1,
          daysAtCurrentLevel: 0,
          lastProgressionDate: new Date(),
          consecutiveSuccessfulSessions: 0,  // Reset counter
          updatedAt: new Date()
        })
        .where(eq(patientPersonalizationProfiles.patientId, patientId));

      // Update relevant goal if exists
      if (progression.parameter && progression.newValue !== undefined) {
        const goalType = progression.parameter === 'duration' ? 'duration' : 'power';

        await db.update(patientGoals)
          .set({
            targetValue: progression.newValue,
            aiRecommended: true,
            updatedAt: new Date()
          })
          .where(and(
            eq(patientGoals.patientId, patientId),
            eq(patientGoals.goalType, goalType),
            eq(patientGoals.isActive, true)
          ));
      }

      // Create alert for provider
      await db.insert(alerts).values({
        patientId,
        type: 'progression_applied',
        priority: 'low',
        message: `Patient progressed: ${progression.parameter} increased from ${progression.currentValue} to ${progression.newValue}. ${progression.reason}`,
        actionRequired: 'Review and adjust if needed',
        metadata: JSON.stringify({
          parameter: progression.parameter,
          fromValue: progression.currentValue,
          toValue: progression.newValue,
          confidence: progression.confidence
        }),
        triggeredAt: new Date()
      });

      logger.info('Progression applied', {
        patientId,
        parameter: progression.parameter,
        from: progression.currentValue,
        to: progression.newValue
      });

    } catch (error: any) {
      logger.error('Failed to apply progression', { error: error.message, patientId });
    }
  }

  /**
   * Check for plateau (no improvement over time)
   */
  private async checkForPlateau(
    patientId: number,
    recentSessions: any[]
  ): Promise<{ detected: boolean; reason?: string }> {
    if (recentSessions.length < 5) {
      return { detected: false };
    }

    // Calculate trend over sessions
    const powers = recentSessions.map(s => s.avgPower || 0);
    const durations = recentSessions.map(s => s.durationSeconds || s.duration * 60);

    const powerTrend = this.calculateTrend(powers);
    const durationTrend = this.calculateTrend(durations);

    // Plateau detected if no meaningful improvement
    if (Math.abs(powerTrend) < this.progressionConfig.plateauImprovementThreshold &&
        Math.abs(durationTrend) < this.progressionConfig.plateauImprovementThreshold) {
      return {
        detected: true,
        reason: `Performance plateaued. Power trend: ${(powerTrend * 100).toFixed(1)}%, Duration trend: ${(durationTrend * 100).toFixed(1)}%`
      };
    }

    return { detected: false };
  }

  /**
   * Handle plateau by injecting workout variation
   */
  private async handlePlateau(
    patientId: number,
    profile: any,
    plateau: { detected: boolean; reason?: string }
  ): Promise<ProgressionCheck> {
    // Create alert about plateau
    await db.insert(alerts).values({
      patientId,
      type: 'plateau_detected',
      priority: 'medium',
      message: `Performance plateau detected. ${plateau.reason} Consider workout variation.`,
      actionRequired: 'Review protocol and consider modifications',
      metadata: JSON.stringify({ reason: plateau.reason }),
      triggeredAt: new Date()
    });

    return {
      shouldProgress: false,
      direction: 'maintain',
      currentValue: profile.currentProgressionLevel,
      reason: `Plateau detected. ${plateau.reason} Recommend varying workout type or consulting with provider.`,
      confidence: 0.75
    };
  }

  // ========================================================================
  // SETBACK DETECTION & RECOVERY (Patent 10.5)
  // ========================================================================

  /**
   * Check if patient is experiencing a setback
   */
  async checkForSetback(patientId: number): Promise<SetbackDetection> {
    try {
      const profile = await this.getOrCreateProfile(patientId);

      // If already in recovery, skip detection
      if (profile.inSetbackRecovery) {
        return { detected: false, recommendation: this.defaultRecoveryPlan() };
      }

      // Get recent sessions
      const recentSessions = await this.getRecentSessions(patientId, 14);  // 2 weeks

      // Check 1: Performance decline
      const performanceDecline = await this.checkPerformanceDecline(patientId, recentSessions);
      if (performanceDecline.detected) {
        return {
          detected: true,
          type: 'performance_decline',
          severity: performanceDecline.severity,
          metrics: {
            performanceDeclinePercent: performanceDecline.declinePercent
          },
          recommendation: this.createRecoveryPlan('performance_decline', performanceDecline.severity!)
        };
      }

      // Check 2: Adherence drop (missed sessions)
      const adherenceDrop = await this.checkAdherenceDrop(patientId, recentSessions);
      if (adherenceDrop.detected) {
        return {
          detected: true,
          type: 'adherence_drop',
          severity: adherenceDrop.severity,
          metrics: {
            missedSessionsDays: adherenceDrop.missedDays
          },
          recommendation: this.createRecoveryPlan('adherence_drop', adherenceDrop.severity!)
        };
      }

      // Check 3: Bilateral imbalance increase
      const bilateralSetback = await this.checkBilateralSetback(recentSessions);
      if (bilateralSetback.detected) {
        return {
          detected: true,
          type: 'bilateral_imbalance',
          severity: bilateralSetback.severity,
          metrics: {
            bilateralImbalancePercent: bilateralSetback.imbalancePercent
          },
          recommendation: this.createRecoveryPlan('bilateral_imbalance', bilateralSetback.severity!)
        };
      }

      return { detected: false, recommendation: this.defaultRecoveryPlan() };

    } catch (error: any) {
      logger.error('Setback check failed', { error: error.message, patientId });
      return { detected: false, recommendation: this.defaultRecoveryPlan() };
    }
  }

  /**
   * Check for performance decline
   */
  private async checkPerformanceDecline(
    patientId: number,
    sessions: any[]
  ): Promise<{ detected: boolean; declinePercent?: number; severity?: 'minor' | 'moderate' | 'major' }> {
    if (sessions.length < 4) {
      return { detected: false };
    }

    // Compare recent performance to baseline
    const recentSessions = sessions.slice(0, 3);
    const baselineSessions = sessions.slice(-4);

    const recentAvgPower = this.average(recentSessions.map(s => s.avgPower || 0));
    const baselineAvgPower = this.average(baselineSessions.map(s => s.avgPower || 0));

    if (baselineAvgPower <= 0) return { detected: false };

    const declinePercent = (baselineAvgPower - recentAvgPower) / baselineAvgPower;

    if (declinePercent >= 0.30) {
      return { detected: true, declinePercent, severity: 'major' };
    } else if (declinePercent >= this.setbackConfig.performanceDeclineThreshold) {
      return { detected: true, declinePercent, severity: 'moderate' };
    } else if (declinePercent >= 0.15) {
      return { detected: true, declinePercent, severity: 'minor' };
    }

    return { detected: false };
  }

  /**
   * Check for adherence drop (missed sessions)
   */
  private async checkAdherenceDrop(
    patientId: number,
    sessions: any[]
  ): Promise<{ detected: boolean; missedDays?: number; severity?: 'minor' | 'moderate' | 'major' }> {
    if (sessions.length === 0) {
      // No sessions at all - check how long
      const now = new Date();
      const daysSinceStart = 7;  // Assume at least a week

      if (daysSinceStart >= 7) {
        return { detected: true, missedDays: daysSinceStart, severity: 'major' };
      }
      return { detected: false };
    }

    // Check days since last session
    const lastSession = sessions[0];
    const lastSessionDate = new Date(lastSession.startTime);
    const now = new Date();
    const daysSinceLastSession = Math.floor(
      (now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastSession >= 7) {
      return { detected: true, missedDays: daysSinceLastSession, severity: 'major' };
    } else if (daysSinceLastSession >= 5) {
      return { detected: true, missedDays: daysSinceLastSession, severity: 'moderate' };
    } else if (daysSinceLastSession >= this.setbackConfig.missedSessionsDaysThreshold) {
      return { detected: true, missedDays: daysSinceLastSession, severity: 'minor' };
    }

    return { detected: false };
  }

  /**
   * Check for bilateral imbalance increase
   */
  private async checkBilateralSetback(
    sessions: any[]
  ): Promise<{ detected: boolean; imbalancePercent?: number; severity?: 'minor' | 'moderate' | 'major' }> {
    // Would need bilateral data - placeholder for Tier 2
    return { detected: false };
  }

  /**
   * Create recovery plan based on setback type
   */
  private createRecoveryPlan(type: SetbackType, severity: 'minor' | 'moderate' | 'major'): SetbackRecoveryPlan {
    const baseReduction = this.setbackConfig.goalReductionPercent;

    const severityMultipliers = {
      minor: 0.5,
      moderate: 1.0,
      major: 1.5
    };

    const encouragementFrequency: Record<string, 'high' | 'medium' | 'low'> = {
      minor: 'medium',
      moderate: 'high',
      major: 'high'
    };

    return {
      goalReduction: baseReduction * severityMultipliers[severity],
      encouragementFrequency: encouragementFrequency[severity],
      rebaselineAfterDays: this.setbackConfig.rebaselineAfterDays,
      clinicianConsultationNeeded: severity === 'major'
    };
  }

  /**
   * Default recovery plan
   */
  private defaultRecoveryPlan(): SetbackRecoveryPlan {
    return {
      goalReduction: 0,
      encouragementFrequency: 'low',
      rebaselineAfterDays: 7,
      clinicianConsultationNeeded: false
    };
  }

  /**
   * Initiate setback recovery protocol
   */
  private async initiateSetbackRecovery(
    patientId: number,
    setback: SetbackDetection
  ): Promise<void> {
    try {
      const profile = await this.getOrCreateProfile(patientId);

      // Update profile to enter recovery mode
      await db.update(patientPersonalizationProfiles)
        .set({
          inSetbackRecovery: true,
          setbackStartDate: new Date(),
          preSetbackLevel: profile.currentProgressionLevel,
          currentProgressionLevel: Math.max(1, (profile.currentProgressionLevel || 1) - 1),
          updatedAt: new Date()
        })
        .where(eq(patientPersonalizationProfiles.patientId, patientId));

      // Reduce goals temporarily
      if (setback.recommendation.goalReduction > 0) {
        await this.reduceGoals(patientId, setback.recommendation.goalReduction);
      }

      // Create alert for clinician
      const alertPriority = setback.recommendation.clinicianConsultationNeeded ? 'high' : 'medium';
      await db.insert(alerts).values({
        patientId,
        type: 'setback_detected',
        priority: alertPriority,
        message: `Setback detected: ${setback.type}. ${setback.severity} severity. Recovery protocol initiated.`,
        actionRequired: setback.recommendation.clinicianConsultationNeeded
          ? 'Clinician consultation recommended'
          : 'Monitor patient progress',
        metadata: JSON.stringify({
          type: setback.type,
          severity: setback.severity,
          metrics: setback.metrics,
          recoveryPlan: setback.recommendation
        }),
        triggeredAt: new Date()
      });

      logger.info('Setback recovery initiated', {
        patientId,
        type: setback.type,
        severity: setback.severity
      });

    } catch (error: any) {
      logger.error('Failed to initiate setback recovery', { error: error.message, patientId });
    }
  }

  /**
   * Check if patient has recovered from setback
   */
  private async checkRecoveryCompletion(
    patientId: number,
    profile: any
  ): Promise<boolean> {
    if (!profile.setbackStartDate) return true;

    const setbackStart = new Date(profile.setbackStartDate);
    const daysSinceSetback = Math.floor(
      (Date.now() - setbackStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Must wait minimum days
    if (daysSinceSetback < this.setbackConfig.rebaselineAfterDays) {
      return false;
    }

    // Check if performance has recovered
    const recentSessions = await this.getRecentSessions(patientId, 5);
    if (recentSessions.length < 3) {
      return false;
    }

    // Calculate current performance vs pre-setback
    const currentAvgPower = this.average(recentSessions.map(s => s.avgPower || 0));

    // Get goals to estimate expected performance
    const goals = await db.select()
      .from(patientGoals)
      .where(and(
        eq(patientGoals.patientId, patientId),
        eq(patientGoals.goalType, 'power'),
        eq(patientGoals.isActive, true)
      ))
      .limit(1);

    const targetPower = goals[0]?.targetValue || 30;
    const recoveryThreshold = targetPower * 0.85;  // 85% of target = recovered

    if (currentAvgPower >= recoveryThreshold) {
      // Patient has recovered!
      await db.update(patientPersonalizationProfiles)
        .set({
          inSetbackRecovery: false,
          setbackStartDate: null,
          // Don't restore to pre-setback level, let them progress naturally
          updatedAt: new Date()
        })
        .where(eq(patientPersonalizationProfiles.patientId, patientId));

      // Restore goals
      await this.restoreGoals(patientId);

      // Alert about recovery
      await db.insert(alerts).values({
        patientId,
        type: 'setback_recovery_complete',
        priority: 'low',
        message: `Patient has recovered from setback. Performance restored to ${Math.round(currentAvgPower / targetPower * 100)}% of target.`,
        actionRequired: 'Consider resuming normal progression',
        triggeredAt: new Date()
      });

      logger.info('Setback recovery completed', { patientId });
      return true;
    }

    return false;
  }

  /**
   * Reduce goals during setback recovery
   */
  private async reduceGoals(patientId: number, reductionPercent: number): Promise<void> {
    const goals = await db.select()
      .from(patientGoals)
      .where(and(
        eq(patientGoals.patientId, patientId),
        eq(patientGoals.isActive, true)
      ));

    for (const goal of goals) {
      const reducedTarget = goal.targetValue * (1 - reductionPercent);
      await db.update(patientGoals)
        .set({
          targetValue: reducedTarget,
          subtitle: `Temporarily reduced (recovery mode)`,
          updatedAt: new Date()
        })
        .where(eq(patientGoals.id, goal.id));
    }
  }

  /**
   * Restore goals after recovery
   */
  private async restoreGoals(patientId: number): Promise<void> {
    // This would ideally restore to pre-setback values
    // For now, we'll let the progressive overload system rebuild naturally
    await db.update(patientGoals)
      .set({
        subtitle: null,
        updatedAt: new Date()
      })
      .where(and(
        eq(patientGoals.patientId, patientId),
        eq(patientGoals.isActive, true)
      ));
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private async getOrCreateProfile(patientId: number): Promise<any> {
    const existing = await db.select()
      .from(patientPersonalizationProfiles)
      .where(eq(patientPersonalizationProfiles.patientId, patientId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    await db.insert(patientPersonalizationProfiles).values({
      patientId,
      currentProgressionLevel: 1,
      daysAtCurrentLevel: 0,
      consecutiveSuccessfulSessions: 0,
      inSetbackRecovery: false
    });

    return {
      patientId,
      currentProgressionLevel: 1,
      daysAtCurrentLevel: 0,
      consecutiveSuccessfulSessions: 0,
      inSetbackRecovery: false
    };
  }

  private async getRecentSessions(patientId: number, days: number): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db.select()
      .from(exerciseSessions)
      .where(and(
        eq(exerciseSessions.patientId, patientId),
        gte(exerciseSessions.startTime, cutoffDate)
      ))
      .orderBy(desc(exerciseSessions.startTime));
  }

  private getCurrentResistance(sessions: any[]): number {
    const resistances = sessions.map(s => s.resistance || 3).filter(r => r > 0);
    return resistances.length > 0 ? this.average(resistances) : 3;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression slope normalized by mean
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const mean = sumY / n;

    return mean > 0 ? slope / mean : 0;
  }

  private calculateProgressionConfidence(
    sessionCount: number,
    durationAchievement: number,
    powerAchievement: number
  ): number {
    // Base confidence from session count
    let confidence = Math.min(sessionCount / 5, 1) * 0.4;

    // Add confidence from achievement consistency
    if (durationAchievement >= 0.9) confidence += 0.3;
    else if (durationAchievement >= 0.8) confidence += 0.2;

    if (powerAchievement >= 0.9) confidence += 0.3;
    else if (powerAchievement >= 0.8) confidence += 0.2;

    return Math.min(confidence, 1);
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Generate predicted performance cone for visualization
   */
  async generatePerformancePrediction(patientId: number, daysAhead: number = 14): Promise<{
    dates: string[];
    predicted: number[];
    lowerBound: number[];
    upperBound: number[];
    confidence: number;
  }> {
    const sessions = await this.getRecentSessions(patientId, 14);

    if (sessions.length < 5) {
      return {
        dates: [],
        predicted: [],
        lowerBound: [],
        upperBound: [],
        confidence: 0
      };
    }

    const powers = sessions.map(s => s.avgPower || 0).reverse();
    const trend = this.calculateTrend(powers);
    const currentPower = powers[powers.length - 1];
    const variance = this.calculateVariance(powers);
    const stdDev = Math.sqrt(variance);

    const dates: string[] = [];
    const predicted: number[] = [];
    const lowerBound: number[] = [];
    const upperBound: number[] = [];

    const today = new Date();

    for (let i = 0; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);

      const predictedPower = currentPower * (1 + trend * i);
      const uncertainty = stdDev * Math.sqrt(1 + i / 7);  // Uncertainty grows over time

      predicted.push(Math.round(predictedPower * 10) / 10);
      lowerBound.push(Math.round((predictedPower - 1.96 * uncertainty) * 10) / 10);
      upperBound.push(Math.round((predictedPower + 1.96 * uncertainty) * 10) / 10);
    }

    return {
      dates,
      predicted,
      lowerBound,
      upperBound,
      confidence: Math.max(0, Math.min(1, 1 - (stdDev / currentPower)))
    };
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.average(values);
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }
}

// Singleton instance
export const progressiveOverloadEngine = new ProgressiveOverloadEngine();
