/**
 * Fatigue Detection & Auto-Resistance Engine
 *
 * Patent Feature 4.1: Fatigue-Triggered Auto-Resistance Reduction
 *
 * Novel Aspects:
 * - Multi-marker fatigue detection:
 *   - Power output decline >20% within 2 minutes
 *   - Cadence irregularity (coefficient of variation >30%)
 *   - Force application pattern degradation
 *   - Bilateral coordination loss
 * - Graduated resistance reduction (not abrupt)
 * - Optional "push through" mode with safety limits
 * - Learning from individual patient fatigue patterns
 *
 * Safety Feature: Automatic intervention preventing over-exertion injury
 */

import { db } from '../db';
import {
  fatigueEvents,
  sessionPerformanceMetrics,
  patientPersonalizationProfiles,
  exerciseSessions,
  alerts
} from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { logger } from '../logger';
import type {
  FatigueDetectionResult,
  FatigueMarkers,
  FatigueType,
  FatigueSeverity,
  FatigueAction
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface FatigueThresholds {
  // Power decline thresholds
  mildPowerDecline: number;        // 15% - first warning
  moderatePowerDecline: number;    // 20% - reduce resistance
  severePowerDecline: number;      // 30% - consider ending session

  // Cadence variability thresholds (coefficient of variation)
  mildCadenceCV: number;           // 20%
  moderateCadenceCV: number;       // 30%
  severeCadenceCV: number;         // 40%

  // Bilateral asymmetry change thresholds
  mildAsymmetryChange: number;     // 10%
  moderateAsymmetryChange: number; // 15%
  severeAsymmetryChange: number;   // 25%

  // Time windows
  analysisWindowSeconds: number;    // Window for detecting decline
  minimumDataPoints: number;        // Minimum readings for analysis
}

const DEFAULT_THRESHOLDS: FatigueThresholds = {
  mildPowerDecline: 0.15,
  moderatePowerDecline: 0.20,
  severePowerDecline: 0.30,

  mildCadenceCV: 0.20,
  moderateCadenceCV: 0.30,
  severeCadenceCV: 0.40,

  mildAsymmetryChange: 0.10,
  moderateAsymmetryChange: 0.15,
  severeAsymmetryChange: 0.25,

  analysisWindowSeconds: 120,       // 2 minutes
  minimumDataPoints: 12             // 12 readings at 10-second intervals = 2 minutes
};

// ============================================================================
// FATIGUE DETECTION ENGINE CLASS
// ============================================================================

export class FatigueDetectionEngine {
  private thresholds: FatigueThresholds;

  // In-memory buffer for real-time analysis (keyed by sessionId)
  private sessionBuffers: Map<number, SessionBuffer> = new Map();

  constructor(thresholds?: Partial<FatigueThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Process incoming real-time metric and check for fatigue
   *
   * Called from WebSocket handler with each new reading
   */
  async processRealTimeMetric(
    sessionId: number,
    patientId: number,
    metric: RealTimeMetric
  ): Promise<FatigueDetectionResult> {
    // Get or create session buffer
    let buffer = this.sessionBuffers.get(sessionId);
    if (!buffer) {
      buffer = new SessionBuffer(sessionId, patientId);
      this.sessionBuffers.set(sessionId, buffer);
    }

    // Add new metric to buffer
    buffer.addMetric(metric);

    // Check if we have enough data for analysis
    if (buffer.metrics.length < this.thresholds.minimumDataPoints) {
      return this.noFatigueResult();
    }

    // Perform fatigue detection
    const result = await this.detectFatigue(buffer);

    // If fatigue detected, record and take action
    if (result.detected) {
      await this.recordFatigueEvent(patientId, sessionId, result);

      // Update patient personalization profile with fatigue patterns
      await this.updateFatiguePatterns(patientId, buffer, result);
    }

    return result;
  }

  /**
   * Main fatigue detection algorithm
   */
  private async detectFatigue(buffer: SessionBuffer): Promise<FatigueDetectionResult> {
    const metrics = buffer.getRecentMetrics(this.thresholds.analysisWindowSeconds);

    if (metrics.length < this.thresholds.minimumDataPoints) {
      return this.noFatigueResult();
    }

    // Calculate fatigue markers
    const markers: FatigueMarkers = {
      powerDecline: false,
      cadenceIrregularity: false,
      forcePatternDegradation: false,
      bilateralCoordinationLoss: false
    };

    // ========================================================================
    // 1. POWER DECLINE DETECTION
    // ========================================================================
    const powerDecline = this.calculatePowerDecline(metrics);

    if (powerDecline >= this.thresholds.severePowerDecline) {
      markers.powerDecline = true;
    } else if (powerDecline >= this.thresholds.moderatePowerDecline) {
      markers.powerDecline = true;
    }

    // ========================================================================
    // 2. CADENCE IRREGULARITY DETECTION
    // ========================================================================
    const cadenceCV = this.calculateCadenceCV(metrics);

    if (cadenceCV >= this.thresholds.moderateCadenceCV) {
      markers.cadenceIrregularity = true;
    }

    // ========================================================================
    // 3. BILATERAL ASYMMETRY CHANGE (if data available)
    // ========================================================================
    const asymmetryChange = this.calculateAsymmetryChange(metrics);
    if (asymmetryChange !== null && asymmetryChange >= this.thresholds.moderateAsymmetryChange) {
      markers.bilateralCoordinationLoss = true;
    }

    // ========================================================================
    // 4. FORCE PATTERN DEGRADATION (derived from power + cadence)
    // ========================================================================
    const forcePatternDegraded = this.detectForcePatternDegradation(metrics, powerDecline, cadenceCV);
    if (forcePatternDegraded) {
      markers.forcePatternDegradation = true;
    }

    // ========================================================================
    // DETERMINE OVERALL FATIGUE STATE
    // ========================================================================
    const markerCount = Object.values(markers).filter(m => m).length;

    if (markerCount === 0) {
      return this.noFatigueResult();
    }

    // Determine fatigue type (primary indicator)
    let fatigueType: FatigueType = 'power_decline';
    if (markers.bilateralCoordinationLoss) {
      fatigueType = 'bilateral_loss';
    } else if (markers.cadenceIrregularity && !markers.powerDecline) {
      fatigueType = 'cadence_irregular';
    } else if (markers.forcePatternDegradation) {
      fatigueType = 'force_degradation';
    }

    // Determine severity
    let severity: FatigueSeverity = 'mild';
    if (markerCount >= 3 || powerDecline >= this.thresholds.severePowerDecline) {
      severity = 'severe';
    } else if (markerCount >= 2 || powerDecline >= this.thresholds.moderatePowerDecline) {
      severity = 'moderate';
    }

    // Determine recommended action
    let recommendedAction: FatigueAction = 'none';
    let resistanceReduction: number | undefined;

    if (severity === 'severe') {
      recommendedAction = 'session_ended';
      await this.sendFatigueAlert(buffer.patientId, buffer.sessionId, severity, fatigueType);
    } else if (severity === 'moderate') {
      recommendedAction = 'resistance_reduced';
      resistanceReduction = this.calculateResistanceReduction(powerDecline, markerCount);
    } else if (severity === 'mild') {
      recommendedAction = 'alert_sent';
    }

    return {
      detected: true,
      type: fatigueType,
      severity,
      markers,
      metrics: {
        powerDeclinePercent: Math.round(powerDecline * 100),
        cadenceCoefficientVariation: Math.round(cadenceCV * 100),
        bilateralAsymmetryChange: asymmetryChange !== null ? Math.round(asymmetryChange * 100) : undefined
      },
      recommendedAction,
      resistanceReduction
    };
  }

  /**
   * Calculate power decline over the analysis window
   */
  private calculatePowerDecline(metrics: RealTimeMetric[]): number {
    if (metrics.length < 2) return 0;

    // Get first quarter average (baseline)
    const quarterLength = Math.floor(metrics.length / 4);
    const firstQuarter = metrics.slice(0, Math.max(quarterLength, 3));
    const baselinePower = this.average(firstQuarter.map(m => m.power));

    // Get last quarter average (current)
    const lastQuarter = metrics.slice(-quarterLength);
    const currentPower = this.average(lastQuarter.map(m => m.power));

    if (baselinePower <= 0) return 0;

    return Math.max(0, (baselinePower - currentPower) / baselinePower);
  }

  /**
   * Calculate coefficient of variation for cadence
   */
  private calculateCadenceCV(metrics: RealTimeMetric[]): number {
    const rpms = metrics.map(m => m.rpm).filter(r => r > 0);
    if (rpms.length < 3) return 0;

    const mean = this.average(rpms);
    if (mean <= 0) return 0;

    const variance = rpms.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rpms.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / mean;
  }

  /**
   * Calculate change in bilateral asymmetry
   */
  private calculateAsymmetryChange(metrics: RealTimeMetric[]): number | null {
    // Filter metrics that have bilateral data
    const bilateralMetrics = metrics.filter(
      m => m.leftForce !== undefined && m.rightForce !== undefined
    );

    if (bilateralMetrics.length < 6) return null;

    const quarterLength = Math.floor(bilateralMetrics.length / 4);

    // Calculate asymmetry for first quarter
    const firstQuarter = bilateralMetrics.slice(0, Math.max(quarterLength, 3));
    const initialAsymmetries = firstQuarter.map(m =>
      this.calculateAsymmetry(m.leftForce!, m.rightForce!)
    );
    const initialAvgAsymmetry = this.average(initialAsymmetries);

    // Calculate asymmetry for last quarter
    const lastQuarter = bilateralMetrics.slice(-quarterLength);
    const currentAsymmetries = lastQuarter.map(m =>
      this.calculateAsymmetry(m.leftForce!, m.rightForce!)
    );
    const currentAvgAsymmetry = this.average(currentAsymmetries);

    return Math.abs(currentAvgAsymmetry - initialAvgAsymmetry);
  }

  /**
   * Calculate bilateral asymmetry percentage
   */
  private calculateAsymmetry(left: number, right: number): number {
    const maxForce = Math.max(left, right);
    if (maxForce <= 0) return 0;
    return Math.abs(left - right) / maxForce;
  }

  /**
   * Detect force pattern degradation from combined metrics
   */
  private detectForcePatternDegradation(
    metrics: RealTimeMetric[],
    powerDecline: number,
    cadenceCV: number
  ): boolean {
    // Force pattern degradation is indicated by:
    // 1. Mild power decline + mild cadence irregularity (combined effect)
    // 2. Erratic power output (high power CV)

    if (powerDecline >= this.thresholds.mildPowerDecline &&
        cadenceCV >= this.thresholds.mildCadenceCV) {
      return true;
    }

    // Check power coefficient of variation
    const powers = metrics.map(m => m.power).filter(p => p > 0);
    if (powers.length >= 6) {
      const powerMean = this.average(powers);
      if (powerMean > 0) {
        const powerVariance = powers.reduce((sum, p) => sum + Math.pow(p - powerMean, 2), 0) / powers.length;
        const powerCV = Math.sqrt(powerVariance) / powerMean;
        if (powerCV > 0.35) {  // 35% CV in power output
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate appropriate resistance reduction based on fatigue severity
   */
  private calculateResistanceReduction(powerDecline: number, markerCount: number): number {
    // Base reduction on power decline
    let reduction = 0;

    if (powerDecline >= 0.25) {
      reduction = 2;  // Two levels down
    } else if (powerDecline >= 0.20) {
      reduction = 1.5;
    } else {
      reduction = 1;  // One level down
    }

    // Additional reduction for multiple markers
    if (markerCount >= 3) {
      reduction += 0.5;
    }

    return Math.min(reduction, 3);  // Cap at 3 levels reduction
  }

  /**
   * Record fatigue event to database
   */
  private async recordFatigueEvent(
    patientId: number,
    sessionId: number,
    result: FatigueDetectionResult
  ): Promise<void> {
    try {
      await db.insert(fatigueEvents).values({
        patientId,
        sessionId,
        detectedAt: new Date(),
        fatigueType: result.type!,
        severity: result.severity!,
        powerDeclinePercent: result.metrics.powerDeclinePercent,
        cadenceCoefficientVariation: result.metrics.cadenceCoefficientVariation,
        bilateralAsymmetryChange: result.metrics.bilateralAsymmetryChange,
        actionTaken: result.recommendedAction,
        resistanceReduction: result.resistanceReduction
      });

      logger.info('Fatigue event recorded', {
        patientId,
        sessionId,
        type: result.type,
        severity: result.severity,
        action: result.recommendedAction
      });
    } catch (error: any) {
      logger.error('Failed to record fatigue event', { error: error.message });
    }
  }

  /**
   * Send alert for severe fatigue
   */
  private async sendFatigueAlert(
    patientId: number,
    sessionId: number,
    severity: FatigueSeverity,
    fatigueType: FatigueType
  ): Promise<void> {
    try {
      const priority = severity === 'severe' ? 'high' : 'medium';
      const message = this.getFatigueAlertMessage(severity, fatigueType);

      await db.insert(alerts).values({
        patientId,
        type: 'fatigue_detected',
        priority,
        message,
        actionRequired: severity === 'severe'
          ? 'Review patient status and consider ending session'
          : 'Monitor patient closely',
        metadata: JSON.stringify({
          sessionId,
          fatigueType,
          severity
        }),
        triggeredAt: new Date()
      });

      logger.info('Fatigue alert sent', { patientId, severity, fatigueType });
    } catch (error: any) {
      logger.error('Failed to send fatigue alert', { error: error.message });
    }
  }

  /**
   * Generate alert message based on fatigue type and severity
   */
  private getFatigueAlertMessage(severity: FatigueSeverity, fatigueType: FatigueType): string {
    const typeMessages: Record<FatigueType, string> = {
      power_decline: 'significant power output decline',
      cadence_irregular: 'irregular pedaling cadence',
      force_degradation: 'deteriorating force application pattern',
      bilateral_loss: 'loss of bilateral coordination'
    };

    const severityPrefix = severity === 'severe' ? 'URGENT: ' : '';
    return `${severityPrefix}Patient showing ${typeMessages[fatigueType]}. ` +
           `Fatigue severity: ${severity}. ` +
           (severity === 'severe'
             ? 'Recommend ending session.'
             : 'Consider reducing resistance.');
  }

  /**
   * Update patient's personalization profile with fatigue patterns
   */
  private async updateFatiguePatterns(
    patientId: number,
    buffer: SessionBuffer,
    result: FatigueDetectionResult
  ): Promise<void> {
    try {
      // Get session start time to calculate fatigue onset time
      const sessionStart = buffer.metrics[0]?.timestamp;
      const fatigueTime = buffer.metrics[buffer.metrics.length - 1]?.timestamp;

      if (!sessionStart || !fatigueTime) return;

      const fatigueOnsetMinutes = (fatigueTime.getTime() - sessionStart.getTime()) / (1000 * 60);

      // Get existing profile
      const profile = await db.select()
        .from(patientPersonalizationProfiles)
        .where(eq(patientPersonalizationProfiles.patientId, patientId))
        .limit(1);

      if (profile.length > 0) {
        const currentAvg = profile[0].avgFatigueOnsetMinutes || fatigueOnsetMinutes;
        // Rolling average (weight new data at 30%)
        const newAvg = currentAvg * 0.7 + fatigueOnsetMinutes * 0.3;

        // Calculate decay rate (power decline per minute)
        const decayRate = (result.metrics.powerDeclinePercent / 100) / fatigueOnsetMinutes;

        await db.update(patientPersonalizationProfiles)
          .set({
            avgFatigueOnsetMinutes: newAvg,
            fatigueDecayRate: decayRate,
            optimalSessionDuration: newAvg * 0.85,  // 85% of fatigue onset
            updatedAt: new Date()
          })
          .where(eq(patientPersonalizationProfiles.patientId, patientId));

        logger.debug('Updated fatigue patterns', {
          patientId,
          avgFatigueOnset: newAvg,
          decayRate
        });
      }
    } catch (error: any) {
      logger.error('Failed to update fatigue patterns', { error: error.message });
    }
  }

  /**
   * Get personalized fatigue thresholds for a patient
   */
  async getPersonalizedThresholds(patientId: number): Promise<FatigueThresholds> {
    try {
      const profile = await db.select()
        .from(patientPersonalizationProfiles)
        .where(eq(patientPersonalizationProfiles.patientId, patientId))
        .limit(1);

      if (!profile.length || !profile[0].avgFatigueOnsetMinutes) {
        return this.thresholds;  // Use defaults
      }

      // Adjust thresholds based on patient's typical fatigue patterns
      const patientFatigueRate = profile[0].fatigueDecayRate || 0.1;

      // If patient typically fatigues slowly, we can be more sensitive
      // If patient typically fatigues quickly, we should be less aggressive
      const sensitivityFactor = patientFatigueRate < 0.05 ? 0.85 : patientFatigueRate > 0.15 ? 1.15 : 1.0;

      return {
        ...this.thresholds,
        mildPowerDecline: this.thresholds.mildPowerDecline * sensitivityFactor,
        moderatePowerDecline: this.thresholds.moderatePowerDecline * sensitivityFactor,
        severePowerDecline: this.thresholds.severePowerDecline * sensitivityFactor
      };
    } catch (error: any) {
      logger.error('Failed to get personalized thresholds', { error: error.message });
      return this.thresholds;
    }
  }

  /**
   * Clean up session buffer when session ends
   */
  endSession(sessionId: number): void {
    this.sessionBuffers.delete(sessionId);
  }

  /**
   * Helper: Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Return result indicating no fatigue detected
   */
  private noFatigueResult(): FatigueDetectionResult {
    return {
      detected: false,
      markers: {
        powerDecline: false,
        cadenceIrregularity: false,
        forcePatternDegradation: false,
        bilateralCoordinationLoss: false
      },
      metrics: {
        powerDeclinePercent: 0,
        cadenceCoefficientVariation: 0
      },
      recommendedAction: 'none'
    };
  }
}

// ============================================================================
// SUPPORTING CLASSES
// ============================================================================

interface RealTimeMetric {
  timestamp: Date;
  power: number;
  rpm: number;
  leftForce?: number;
  rightForce?: number;
  heartRate?: number;
}

class SessionBuffer {
  sessionId: number;
  patientId: number;
  metrics: RealTimeMetric[] = [];
  maxBufferSize: number = 360;  // 1 hour at 10-second intervals

  constructor(sessionId: number, patientId: number) {
    this.sessionId = sessionId;
    this.patientId = patientId;
  }

  addMetric(metric: RealTimeMetric): void {
    this.metrics.push(metric);

    // Trim buffer if too large
    if (this.metrics.length > this.maxBufferSize) {
      this.metrics = this.metrics.slice(-this.maxBufferSize);
    }
  }

  getRecentMetrics(windowSeconds: number): RealTimeMetric[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() - windowSeconds * 1000);

    return this.metrics.filter(m => m.timestamp >= cutoff);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Singleton instance
export const fatigueDetectionEngine = new FatigueDetectionEngine();

// Export types for external use
export type { RealTimeMetric };
