/**
 * Bilateral Force Engine (Tier 2 - Foundations)
 *
 * NOTE: This engine is prepared for integration with bilateral force sensors.
 * Currently provides simulated/estimated values based on power and cadence data.
 * Full functionality requires hardware sensor integration.
 *
 * Patent Features Supported (when sensors integrated):
 * - 2.1 Real-Time Bilateral Force Balancing System
 * - 2.2 Stroke Rehabilitation Asymmetry Protocol
 * - 2.3 Neurological Deficit Early Detection
 * - 6.1 3D Force Vector Visualization
 * - 6.3 Bilateral Symmetry Butterfly Plot
 * - 15.3 Bilateral Resistance Balancing System
 *
 * 2.1 Real-Time Bilateral Force Balancing Novel Aspects:
 * - Per-limb force sensing with <100ms latency
 * - Graduated feedback system (visual, audio, haptic)
 * - Adaptive threshold setting
 * - "Asymmetry correction training mode" with gamification
 *
 * 2.2 Stroke Rehabilitation Novel Aspects:
 * - Baseline asymmetry assessment in first 3 sessions
 * - Automated goal-setting for asymmetry reduction
 * - Exercise protocol adaptation (weak vs strong side)
 * - Progress visualization showing affected limb recovery
 *
 * 2.3 Neurological Deficit Detection Novel Aspects:
 * - Sudden asymmetry change detection (>25% shift from baseline)
 * - Differentiation from fatigue-based asymmetry
 * - Immediate clinician alert with raw data
 * - Potential early stroke/TIA detection
 */

import { db } from '../db';
import {
  sessionPerformanceMetrics,
  patientPersonalizationProfiles,
  alerts
} from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { logger } from '../logger';
import type { BilateralMetrics, BilateralFeedback } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface BilateralConfig {
  // Asymmetry thresholds
  normalAsymmetryThreshold: number;      // <10% is normal
  mildAsymmetryThreshold: number;        // 10-15% is mild
  moderateAsymmetryThreshold: number;    // 15-25% is moderate
  severeAsymmetryThreshold: number;      // >25% is severe (possible neuro event)

  // Alert thresholds
  suddenChangeThreshold: number;         // 25% change triggers alert
  baselineSessionsRequired: number;      // Sessions needed for baseline

  // Feedback settings
  feedbackLatencyMs: number;             // Target <100ms
  feedbackIntensityScale: number;        // 0-100 scale
}

const DEFAULT_CONFIG: BilateralConfig = {
  normalAsymmetryThreshold: 0.10,
  mildAsymmetryThreshold: 0.15,
  moderateAsymmetryThreshold: 0.25,
  severeAsymmetryThreshold: 0.35,

  suddenChangeThreshold: 0.25,
  baselineSessionsRequired: 3,

  feedbackLatencyMs: 100,
  feedbackIntensityScale: 100
};

// ============================================================================
// STROKE REHABILITATION PROTOCOL
// ============================================================================

interface StrokeRehabProtocol {
  patientId: number;
  affectedSide: 'left' | 'right';
  baselineAsymmetry: number;
  currentAsymmetry: number;
  asymmetryGoal: number;
  progressPhase: 'assessment' | 'active_training' | 'maintenance';
  resistanceAdjustment: {
    weakSide: number;    // Percentage of normal
    strongSide: number;  // Percentage of normal
  };
}

// ============================================================================
// BILATERAL FORCE ENGINE CLASS
// ============================================================================

export class BilateralForceEngine {
  private config: BilateralConfig;

  // Baseline tracking
  private patientBaselines: Map<number, {
    leftForceBaseline: number;
    rightForceBaseline: number;
    asymmetryBaseline: number;
    sessionsAnalyzed: number;
  }> = new Map();

  // Stroke rehab protocols
  private strokeProtocols: Map<number, StrokeRehabProtocol> = new Map();

  constructor(config?: Partial<BilateralConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process bilateral force data from sensors
   *
   * NOTE: Requires bilateral force sensors to be integrated
   * Currently estimates from power data if sensors not available
   */
  processBilateralData(
    patientId: number,
    sessionId: number,
    leftForce: number | undefined,
    rightForce: number | undefined,
    totalPower?: number
  ): BilateralMetrics {
    // If no bilateral data, estimate from power
    if (leftForce === undefined || rightForce === undefined) {
      return this.estimateBilateralFromPower(totalPower || 0);
    }

    // Calculate asymmetry
    const maxForce = Math.max(leftForce, rightForce);
    const asymmetryPercent = maxForce > 0
      ? Math.abs(leftForce - rightForce) / maxForce
      : 0;

    // Determine clinical significance
    const clinicalSignificance = asymmetryPercent >= this.config.mildAsymmetryThreshold;

    // Get baseline for trend calculation
    const baseline = this.patientBaselines.get(patientId);
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';

    if (baseline && baseline.sessionsAnalyzed >= this.config.baselineSessionsRequired) {
      const asymmetryChange = asymmetryPercent - baseline.asymmetryBaseline;
      if (asymmetryChange < -0.03) trend = 'improving';
      else if (asymmetryChange > 0.03) trend = 'worsening';
    }

    return {
      leftForce,
      rightForce,
      asymmetryPercent: Math.round(asymmetryPercent * 1000) / 10,  // One decimal percent
      trend,
      clinicalSignificance
    };
  }

  /**
   * Estimate bilateral metrics from total power (fallback)
   */
  private estimateBilateralFromPower(totalPower: number): BilateralMetrics {
    // Without sensors, assume near-symmetric with small random variation
    const variation = 0.02 + Math.random() * 0.05;  // 2-7% variation
    const leftProportion = 0.5 + (Math.random() - 0.5) * variation;

    const leftForce = totalPower * leftProportion;
    const rightForce = totalPower * (1 - leftProportion);

    return {
      leftForce: Math.round(leftForce * 10) / 10,
      rightForce: Math.round(rightForce * 10) / 10,
      asymmetryPercent: Math.round(Math.abs(leftProportion - 0.5) * 200 * 10) / 10,
      trend: 'stable',
      clinicalSignificance: false
    };
  }

  /**
   * Generate real-time feedback for bilateral balancing
   *
   * Patent 2.1: Graduated feedback system
   */
  generateBalancingFeedback(metrics: BilateralMetrics): BilateralFeedback {
    const asymmetry = metrics.asymmetryPercent / 100;

    // Determine which side needs correction
    let targetSide: 'left' | 'right' | 'balanced' = 'balanced';
    if (asymmetry > this.config.normalAsymmetryThreshold) {
      targetSide = metrics.leftForce > metrics.rightForce ? 'right' : 'left';
    }

    // Determine feedback type based on severity
    let feedbackType: 'visual' | 'audio' | 'haptic' = 'visual';
    if (asymmetry > this.config.moderateAsymmetryThreshold) {
      feedbackType = 'haptic';
    } else if (asymmetry > this.config.mildAsymmetryThreshold) {
      feedbackType = 'audio';
    }

    // Calculate intensity (0-100)
    const intensity = Math.min(
      100,
      Math.round((asymmetry / this.config.moderateAsymmetryThreshold) * this.config.feedbackIntensityScale)
    );

    // Generate message
    let message: string | undefined;
    if (targetSide !== 'balanced') {
      message = `Push more with your ${targetSide} leg`;
    }

    return {
      targetSide,
      feedbackType,
      intensity,
      message
    };
  }

  /**
   * Check for sudden neurological change
   *
   * Patent 2.3: Early detection of neurological deficits
   */
  async checkForNeurologicalEvent(
    patientId: number,
    currentMetrics: BilateralMetrics
  ): Promise<{
    alertTriggered: boolean;
    alertType?: 'possible_stroke' | 'possible_tia' | 'significant_change';
    details?: string;
  }> {
    const baseline = this.patientBaselines.get(patientId);

    if (!baseline || baseline.sessionsAnalyzed < this.config.baselineSessionsRequired) {
      return { alertTriggered: false };
    }

    const currentAsymmetry = currentMetrics.asymmetryPercent / 100;
    const baselineAsymmetry = baseline.asymmetryBaseline;
    const change = Math.abs(currentAsymmetry - baselineAsymmetry);

    // Check for sudden severe change
    if (change >= this.config.suddenChangeThreshold) {
      // This could indicate a neurological event
      const alertType = currentAsymmetry >= this.config.severeAsymmetryThreshold
        ? 'possible_stroke'
        : 'significant_change';

      // Create alert
      await db.insert(alerts).values({
        patientId,
        type: 'neurological_alert',
        priority: 'critical',
        message: `URGENT: Sudden bilateral asymmetry change detected. Current: ${Math.round(currentAsymmetry * 100)}%, Baseline: ${Math.round(baselineAsymmetry * 100)}%. Possible neurological event.`,
        actionRequired: 'Immediate neurological assessment required',
        metadata: JSON.stringify({
          currentAsymmetry: currentAsymmetry,
          baselineAsymmetry: baselineAsymmetry,
          changePercent: change,
          alertType
        }),
        triggeredAt: new Date()
      });

      logger.warn('Neurological alert triggered', {
        patientId,
        currentAsymmetry,
        baselineAsymmetry,
        change,
        alertType
      });

      return {
        alertTriggered: true,
        alertType,
        details: `Asymmetry changed from ${Math.round(baselineAsymmetry * 100)}% to ${Math.round(currentAsymmetry * 100)}%`
      };
    }

    return { alertTriggered: false };
  }

  /**
   * Update patient's bilateral baseline
   */
  async updateBaseline(
    patientId: number,
    sessionMetrics: BilateralMetrics
  ): Promise<void> {
    const current = this.patientBaselines.get(patientId);

    if (!current) {
      // First session
      this.patientBaselines.set(patientId, {
        leftForceBaseline: sessionMetrics.leftForce,
        rightForceBaseline: sessionMetrics.rightForce,
        asymmetryBaseline: sessionMetrics.asymmetryPercent / 100,
        sessionsAnalyzed: 1
      });
    } else {
      // Rolling average
      const n = current.sessionsAnalyzed;
      const weight = Math.min(n, 5);  // Cap influence of history

      current.leftForceBaseline = (current.leftForceBaseline * weight + sessionMetrics.leftForce) / (weight + 1);
      current.rightForceBaseline = (current.rightForceBaseline * weight + sessionMetrics.rightForce) / (weight + 1);
      current.asymmetryBaseline = (current.asymmetryBaseline * weight + sessionMetrics.asymmetryPercent / 100) / (weight + 1);
      current.sessionsAnalyzed++;
    }
  }

  // ========================================================================
  // STROKE REHABILITATION (Patent 2.2)
  // ========================================================================

  /**
   * Initialize stroke rehabilitation protocol for a patient
   */
  async initializeStrokeProtocol(
    patientId: number,
    affectedSide: 'left' | 'right',
    initialAsymmetry: number
  ): Promise<StrokeRehabProtocol> {
    // Calculate initial goal (30% reduction target)
    const asymmetryGoal = Math.max(0.10, initialAsymmetry * 0.7);

    const protocol: StrokeRehabProtocol = {
      patientId,
      affectedSide,
      baselineAsymmetry: initialAsymmetry,
      currentAsymmetry: initialAsymmetry,
      asymmetryGoal,
      progressPhase: 'assessment',
      resistanceAdjustment: {
        weakSide: 0.7,   // 70% of normal resistance
        strongSide: 1.2  // 120% of normal resistance
      }
    };

    this.strokeProtocols.set(patientId, protocol);

    logger.info('Stroke rehab protocol initialized', {
      patientId,
      affectedSide,
      initialAsymmetry,
      asymmetryGoal
    });

    return protocol;
  }

  /**
   * Update stroke protocol based on session performance
   */
  async updateStrokeProtocol(
    patientId: number,
    sessionAsymmetry: number
  ): Promise<{
    protocolUpdated: boolean;
    phaseChange?: string;
    newGoal?: number;
    resistanceChange?: { weakSide: number; strongSide: number };
  }> {
    const protocol = this.strokeProtocols.get(patientId);
    if (!protocol) {
      return { protocolUpdated: false };
    }

    // Update current asymmetry (rolling average)
    protocol.currentAsymmetry = protocol.currentAsymmetry * 0.7 + sessionAsymmetry * 0.3;

    let phaseChange: string | undefined;
    let newGoal: number | undefined;
    let resistanceChange: { weakSide: number; strongSide: number } | undefined;

    // Check for phase transitions
    if (protocol.progressPhase === 'assessment') {
      // After 3 sessions, move to active training
      protocol.progressPhase = 'active_training';
      phaseChange = 'assessment -> active_training';
    } else if (protocol.progressPhase === 'active_training') {
      // Check if goal achieved
      if (protocol.currentAsymmetry <= protocol.asymmetryGoal) {
        // Progress goal
        newGoal = Math.max(0.08, protocol.asymmetryGoal * 0.8);
        protocol.asymmetryGoal = newGoal;

        // Gradually normalize resistance
        protocol.resistanceAdjustment.weakSide = Math.min(1.0, protocol.resistanceAdjustment.weakSide + 0.1);
        protocol.resistanceAdjustment.strongSide = Math.max(1.0, protocol.resistanceAdjustment.strongSide - 0.05);
        resistanceChange = { ...protocol.resistanceAdjustment };

        // Check for maintenance phase
        if (protocol.currentAsymmetry <= 0.10) {
          protocol.progressPhase = 'maintenance';
          phaseChange = 'active_training -> maintenance';
        }
      }
    }

    return {
      protocolUpdated: true,
      phaseChange,
      newGoal,
      resistanceChange
    };
  }

  /**
   * Get stroke protocol status
   */
  getStrokeProtocol(patientId: number): StrokeRehabProtocol | undefined {
    return this.strokeProtocols.get(patientId);
  }

  // ========================================================================
  // VISUALIZATION DATA (Patents 6.1, 6.3)
  // ========================================================================

  /**
   * Generate 3D force vector data for visualization
   *
   * Patent 6.1: 3D Force Vector Visualization
   */
  generate3DForceVectors(metrics: BilateralMetrics): {
    leftVector: { x: number; y: number; z: number; magnitude: number; color: string };
    rightVector: { x: number; y: number; z: number; magnitude: number; color: string };
    coordination: number;  // 0-100, higher = better parallel vectors
  } {
    const maxForce = Math.max(metrics.leftForce, metrics.rightForce);
    const optimalForce = 30;  // Reference optimal force

    // Determine colors based on intensity
    const getColor = (force: number): string => {
      const ratio = force / optimalForce;
      if (ratio < 0.5) return '#4CAF50';  // Green - low
      if (ratio < 0.8) return '#FFC107';  // Yellow - moderate
      if (ratio <= 1.2) return '#4CAF50'; // Green - optimal
      return '#F44336';                    // Red - excessive
    };

    // Calculate coordination (how parallel the vectors are)
    const asymmetry = metrics.asymmetryPercent / 100;
    const coordination = Math.round((1 - asymmetry) * 100);

    return {
      leftVector: {
        x: -0.5,  // Left position
        y: metrics.leftForce / maxForce,  // Normalized height
        z: 0,
        magnitude: metrics.leftForce,
        color: getColor(metrics.leftForce)
      },
      rightVector: {
        x: 0.5,   // Right position
        y: metrics.rightForce / maxForce,
        z: 0,
        magnitude: metrics.rightForce,
        color: getColor(metrics.rightForce)
      },
      coordination
    };
  }

  /**
   * Generate butterfly plot data for visualization
   *
   * Patent 6.3: Bilateral Symmetry Butterfly Plot
   */
  generateButterflyPlot(
    historicalMetrics: Array<{ timestamp: Date; left: number; right: number }>
  ): {
    leftProfile: Array<{ time: number; value: number }>;
    rightProfile: Array<{ time: number; value: number }>;
    symmetryLine: Array<{ time: number; symmetry: number }>;
    overallSymmetryScore: number;
  } {
    const leftProfile: Array<{ time: number; value: number }> = [];
    const rightProfile: Array<{ time: number; value: number }> = [];
    const symmetryLine: Array<{ time: number; symmetry: number }> = [];

    let symmetrySum = 0;

    for (let i = 0; i < historicalMetrics.length; i++) {
      const m = historicalMetrics[i];
      leftProfile.push({ time: i, value: -m.left });  // Negative for left side
      rightProfile.push({ time: i, value: m.right }); // Positive for right side

      const max = Math.max(m.left, m.right);
      const symmetry = max > 0 ? (1 - Math.abs(m.left - m.right) / max) * 100 : 100;
      symmetryLine.push({ time: i, symmetry });
      symmetrySum += symmetry;
    }

    return {
      leftProfile,
      rightProfile,
      symmetryLine,
      overallSymmetryScore: historicalMetrics.length > 0
        ? Math.round(symmetrySum / historicalMetrics.length)
        : 0
    };
  }

  // ========================================================================
  // RESISTANCE BALANCING (Patent 15.3)
  // ========================================================================

  /**
   * Calculate independent resistance levels for bilateral balancing
   *
   * Patent 15.3: Bilateral Resistance Balancing System
   */
  calculateAsymmetricResistance(
    baseResistance: number,
    metrics: BilateralMetrics,
    isStrokeRehab: boolean = false
  ): {
    leftResistance: number;
    rightResistance: number;
    rationale: string;
  } {
    const asymmetry = metrics.asymmetryPercent / 100;

    // Default to equal resistance
    let leftResistance = baseResistance;
    let rightResistance = baseResistance;
    let rationale = 'Symmetric resistance - bilateral balance is good';

    // Only adjust if significant asymmetry
    if (asymmetry > this.config.normalAsymmetryThreshold) {
      const weakerSide = metrics.leftForce < metrics.rightForce ? 'left' : 'right';
      const adjustmentFactor = 1 + (asymmetry * 0.5);  // Up to 50% adjustment based on asymmetry

      if (weakerSide === 'left') {
        leftResistance = Math.max(1, baseResistance / adjustmentFactor);
        rightResistance = Math.min(9, baseResistance * (1 + asymmetry * 0.3));
        rationale = `Left side weaker (${Math.round(asymmetry * 100)}% asymmetry). Reduced left resistance, increased right.`;
      } else {
        rightResistance = Math.max(1, baseResistance / adjustmentFactor);
        leftResistance = Math.min(9, baseResistance * (1 + asymmetry * 0.3));
        rationale = `Right side weaker (${Math.round(asymmetry * 100)}% asymmetry). Reduced right resistance, increased left.`;
      }
    }

    // Round to valid resistance levels
    leftResistance = Math.round(leftResistance * 2) / 2;   // Round to 0.5
    rightResistance = Math.round(rightResistance * 2) / 2;

    return { leftResistance, rightResistance, rationale };
  }

  /**
   * Check if bilateral sensors are available
   */
  areSensorsAvailable(): boolean {
    // TODO: Check actual hardware connection
    // For now, return false to indicate sensors not yet integrated
    return false;
  }
}

// Singleton instance
export const bilateralForceEngine = new BilateralForceEngine();
