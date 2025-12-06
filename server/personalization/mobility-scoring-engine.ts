/**
 * Multi-Modal Mobility Scoring Engine
 *
 * Patent Feature 1.5: Multi-Modal Mobility Score Generation
 *
 * Novel Aspects:
 * - Fusion algorithm combining:
 *   - Bedside bike metrics (power, endurance, bilateral balance)
 *   - Accelerometer data from room movement
 *   - PT session reports
 *   - Nursing mobility assessments
 * - Weighted scoring based on activity type and clinical relevance
 * - Translation to standard mobility scales (Barthel Index, Functional Independence Measure)
 *
 * Patent Feature 16.1: Hospital Mobility Score Generation
 * - Composite score for hospital-wide quality reporting
 * - Unit-level analytics and benchmarking
 */

import { db } from '../db';
import {
  mobilityScores,
  exerciseSessions,
  patientProfiles,
  patientStats,
  users
} from '@shared/schema';
import { eq, and, desc, gte, avg, count, sql } from 'drizzle-orm';
import { logger } from '../logger';
import type {
  MobilityScoreComponents,
  UnifiedMobilityScore,
  MobilityStatus
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface MobilityScoreConfig {
  // Component weights (must sum to 1.0)
  weights: {
    bike: number;
    ambulation: number;
    pt: number;
    nursing: number;
    adl: number;
  };

  // Minimum confidence thresholds
  minBikeSessions: number;
  minDataSources: number;

  // Score calculation parameters
  maxPower: number;           // Max expected power for scoring
  maxDuration: number;        // Max expected session duration
  maxConsistency: number;     // Max consistency streak
}

const DEFAULT_CONFIG: MobilityScoreConfig = {
  weights: {
    bike: 0.40,       // 40% from bedside bike
    ambulation: 0.15, // 15% from ambulation
    pt: 0.20,         // 20% from PT
    nursing: 0.15,    // 15% from nursing
    adl: 0.10         // 10% from ADL
  },

  minBikeSessions: 3,
  minDataSources: 2,

  maxPower: 50,       // 50W = excellent
  maxDuration: 20,    // 20 min = excellent
  maxConsistency: 7   // 7-day streak = excellent
};

// ============================================================================
// STANDARD SCALE CONVERSIONS
// ============================================================================

/**
 * Barthel Index mapping
 * 0-100 scale measuring ADL independence
 */
const BARTHEL_MAPPING = {
  feeding: { weight: 10, thresholds: [0, 50, 100] },         // 0=dependent, 5=help, 10=independent
  bathing: { weight: 5, thresholds: [0, 100] },              // 0=dependent, 5=independent
  grooming: { weight: 5, thresholds: [0, 100] },
  dressing: { weight: 10, thresholds: [0, 50, 100] },
  bowels: { weight: 10, thresholds: [0, 50, 100] },
  bladder: { weight: 10, thresholds: [0, 50, 100] },
  toiletUse: { weight: 10, thresholds: [0, 50, 100] },
  transfers: { weight: 15, thresholds: [0, 33, 67, 100] },   // Bed to chair
  mobility: { weight: 15, thresholds: [0, 33, 67, 100] },    // Walking
  stairs: { weight: 10, thresholds: [0, 50, 100] }
};

/**
 * Functional Independence Measure (FIM) mapping
 * 18-126 scale (18 items, 1-7 scale each)
 */
const FIM_CATEGORIES = {
  selfCare: { items: 6, maxScore: 42 },        // Eating, grooming, bathing, etc.
  sphincter: { items: 2, maxScore: 14 },       // Bladder, bowel
  transfers: { items: 3, maxScore: 21 },       // Bed/chair/toilet, tub, shower
  locomotion: { items: 2, maxScore: 14 },      // Walk/wheelchair, stairs
  communication: { items: 2, maxScore: 14 },   // Comprehension, expression
  socialCognition: { items: 3, maxScore: 21 }  // Interaction, problem solving, memory
};

// ============================================================================
// MOBILITY SCORING ENGINE CLASS
// ============================================================================

export class MobilityScoringEngine {
  private config: MobilityScoreConfig;

  constructor(config?: Partial<MobilityScoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate unified mobility score for a patient
   */
  async calculateMobilityScore(patientId: number): Promise<UnifiedMobilityScore | null> {
    try {
      // Get component scores
      const components = await this.getComponentScores(patientId);

      // Calculate confidence based on data completeness
      const confidence = this.calculateConfidence(components);

      if (confidence < 0.3) {
        logger.warn('Insufficient data for mobility score', { patientId, confidence });
        return null;
      }

      // Calculate unified score using weights
      const unifiedScore = this.calculateUnifiedScore(components);

      // Get historical scores for trend
      const trend = await this.calculateTrend(patientId);

      // Translate to standard scales
      const barthelIndex = this.calculateBarthelIndex(components, unifiedScore);
      const fim = this.calculateFIM(components, unifiedScore);

      // Create result
      const result: UnifiedMobilityScore = {
        patientId,
        timestamp: new Date(),
        components,
        weights: this.config.weights,
        unifiedScore,
        confidence,
        standardScales: {
          barthelIndex,
          functionalIndependenceMeasure: fim
        },
        trend: trend.direction,
        trendMagnitude: trend.magnitude
      };

      // Store score
      await this.storeMobilityScore(result);

      return result;

    } catch (error: any) {
      logger.error('Mobility score calculation failed', { error: error.message, patientId });
      return null;
    }
  }

  /**
   * Get individual component scores
   */
  private async getComponentScores(patientId: number): Promise<MobilityScoreComponents> {
    const bikeScore = await this.calculateBikeScore(patientId);
    const ambulationScore = await this.calculateAmbulationScore(patientId);
    const ptScore = await this.calculatePTScore(patientId);
    const nursingScore = await this.calculateNursingScore(patientId);
    const adlScore = await this.calculateADLScore(patientId);

    return {
      bikeScore,
      ambulationScore,
      ptScore,
      nursingScore,
      adlScore
    };
  }

  /**
   * Calculate bike score from exercise sessions
   * Score 0-100 based on power, duration, consistency
   */
  private async calculateBikeScore(patientId: number): Promise<number> {
    try {
      // Get recent sessions (last 7 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const sessions = await db.select()
        .from(exerciseSessions)
        .where(and(
          eq(exerciseSessions.patientId, patientId),
          gte(exerciseSessions.startTime, cutoffDate)
        ))
        .orderBy(desc(exerciseSessions.startTime));

      if (sessions.length < this.config.minBikeSessions) {
        return 0;  // Insufficient data
      }

      // Power score (0-40 points)
      const avgPower = sessions.reduce((sum, s) => sum + (s.avgPower || 0), 0) / sessions.length;
      const powerScore = Math.min(40, (avgPower / this.config.maxPower) * 40);

      // Duration score (0-30 points)
      const avgDuration = sessions.reduce((sum, s) =>
        sum + ((s.durationSeconds || s.duration * 60) / 60), 0
      ) / sessions.length;
      const durationScore = Math.min(30, (avgDuration / this.config.maxDuration) * 30);

      // Consistency score (0-20 points)
      const stats = await db.select()
        .from(patientStats)
        .where(eq(patientStats.patientId, patientId))
        .limit(1);

      const streak = stats[0]?.consistencyStreak || 0;
      const consistencyScore = Math.min(20, (streak / this.config.maxConsistency) * 20);

      // Frequency score (0-10 points)
      const frequencyScore = Math.min(10, (sessions.length / 7) * 10);

      return Math.round(powerScore + durationScore + consistencyScore + frequencyScore);

    } catch (error: any) {
      logger.error('Bike score calculation failed', { error: error.message, patientId });
      return 0;
    }
  }

  /**
   * Calculate ambulation score
   * In a full implementation, this would come from room sensors or wearables
   * For now, estimate based on mobility status from profile
   */
  private async calculateAmbulationScore(patientId: number): Promise<number | undefined> {
    try {
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      if (!profile.length) return undefined;

      // Map mobility status to score
      const mobilityScoreMap: Record<MobilityStatus, number> = {
        'independent': 100,
        'walking_assist': 75,
        'standing_assist': 50,
        'chair_bound': 25,
        'bedbound': 10
      };

      return mobilityScoreMap[profile[0].mobilityStatus as MobilityStatus] || 25;

    } catch (error: any) {
      logger.error('Ambulation score calculation failed', { error: error.message, patientId });
      return undefined;
    }
  }

  /**
   * Calculate PT score
   * In a full implementation, this would come from PT documentation
   * For now, estimate based on bike performance trajectory
   */
  private async calculatePTScore(patientId: number): Promise<number | undefined> {
    try {
      // Use bike improvement trend as proxy for PT progress
      const trend = await this.calculateTrend(patientId);

      if (trend.dataPoints < 5) return undefined;

      // Base score on mobility status
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      if (!profile.length) return undefined;

      const baseScores: Record<MobilityStatus, number> = {
        'independent': 90,
        'walking_assist': 70,
        'standing_assist': 55,
        'chair_bound': 40,
        'bedbound': 20
      };

      let score = baseScores[profile[0].mobilityStatus as MobilityStatus] || 40;

      // Adjust based on improvement trend
      if (trend.direction === 'improving') {
        score = Math.min(100, score + trend.magnitude * 20);
      } else if (trend.direction === 'declining') {
        score = Math.max(0, score - trend.magnitude * 20);
      }

      return Math.round(score);

    } catch (error: any) {
      logger.error('PT score calculation failed', { error: error.message, patientId });
      return undefined;
    }
  }

  /**
   * Calculate nursing assessment score
   * In a full implementation, this would come from nursing documentation
   */
  private async calculateNursingScore(patientId: number): Promise<number | undefined> {
    // Similar to PT score, use mobility status as proxy
    return this.calculateAmbulationScore(patientId);
  }

  /**
   * Calculate ADL score
   * Based on cognitive and mobility status
   */
  private async calculateADLScore(patientId: number): Promise<number | undefined> {
    try {
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      if (!profile.length) return undefined;

      // Base score on mobility
      const mobilityScores: Record<string, number> = {
        'independent': 90,
        'walking_assist': 70,
        'standing_assist': 55,
        'chair_bound': 35,
        'bedbound': 15
      };

      let score = mobilityScores[profile[0].mobilityStatus] || 40;

      // Adjust for cognitive status
      const cognitiveAdjustment: Record<string, number> = {
        'normal': 0,
        'mild_impairment': -10,
        'delirium_dementia': -25
      };

      score += cognitiveAdjustment[profile[0].cognitiveStatus] || 0;

      return Math.max(0, Math.min(100, Math.round(score)));

    } catch (error: any) {
      logger.error('ADL score calculation failed', { error: error.message, patientId });
      return undefined;
    }
  }

  /**
   * Calculate confidence based on data completeness
   */
  private calculateConfidence(components: MobilityScoreComponents): number {
    let sourcesWithData = 0;
    let totalWeight = 0;

    if (components.bikeScore !== undefined && components.bikeScore > 0) {
      sourcesWithData++;
      totalWeight += this.config.weights.bike;
    }
    if (components.ambulationScore !== undefined) {
      sourcesWithData++;
      totalWeight += this.config.weights.ambulation;
    }
    if (components.ptScore !== undefined) {
      sourcesWithData++;
      totalWeight += this.config.weights.pt;
    }
    if (components.nursingScore !== undefined) {
      sourcesWithData++;
      totalWeight += this.config.weights.nursing;
    }
    if (components.adlScore !== undefined) {
      sourcesWithData++;
      totalWeight += this.config.weights.adl;
    }

    // Confidence based on data sources and weight coverage
    const sourceConfidence = Math.min(sourcesWithData / this.config.minDataSources, 1);
    const weightConfidence = totalWeight;

    return (sourceConfidence * 0.5 + weightConfidence * 0.5);
  }

  /**
   * Calculate unified score from components
   */
  private calculateUnifiedScore(components: MobilityScoreComponents): number {
    let totalScore = 0;
    let totalWeight = 0;

    if (components.bikeScore !== undefined && components.bikeScore > 0) {
      totalScore += components.bikeScore * this.config.weights.bike;
      totalWeight += this.config.weights.bike;
    }
    if (components.ambulationScore !== undefined) {
      totalScore += components.ambulationScore * this.config.weights.ambulation;
      totalWeight += this.config.weights.ambulation;
    }
    if (components.ptScore !== undefined) {
      totalScore += components.ptScore * this.config.weights.pt;
      totalWeight += this.config.weights.pt;
    }
    if (components.nursingScore !== undefined) {
      totalScore += components.nursingScore * this.config.weights.nursing;
      totalWeight += this.config.weights.nursing;
    }
    if (components.adlScore !== undefined) {
      totalScore += components.adlScore * this.config.weights.adl;
      totalWeight += this.config.weights.adl;
    }

    // Normalize by actual weight used
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Calculate Barthel Index (0-100)
   */
  private calculateBarthelIndex(components: MobilityScoreComponents, unifiedScore: number): number {
    // Map unified score to Barthel ranges
    // 0-20: Total dependence
    // 21-60: Severe dependence
    // 61-90: Moderate dependence
    // 91-99: Slight dependence
    // 100: Independence

    if (unifiedScore >= 90) return 95 + Math.round((unifiedScore - 90) / 2);
    if (unifiedScore >= 70) return 75 + Math.round((unifiedScore - 70));
    if (unifiedScore >= 50) return 50 + Math.round((unifiedScore - 50) * 1.25);
    if (unifiedScore >= 25) return 25 + Math.round(unifiedScore);
    return Math.round(unifiedScore);
  }

  /**
   * Calculate FIM score (18-126)
   */
  private calculateFIM(components: MobilityScoreComponents, unifiedScore: number): number {
    // Map unified score (0-100) to FIM (18-126)
    // FIM 18 = total dependence, 126 = complete independence
    const fimRange = 126 - 18;  // 108 points
    return Math.round(18 + (unifiedScore / 100) * fimRange);
  }

  /**
   * Calculate trend from historical scores
   */
  private async calculateTrend(patientId: number): Promise<{
    direction: 'improving' | 'stable' | 'declining';
    magnitude: number;
    dataPoints: number;
  }> {
    try {
      // Get recent sessions for trend analysis
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 14);

      const sessions = await db.select()
        .from(exerciseSessions)
        .where(and(
          eq(exerciseSessions.patientId, patientId),
          gte(exerciseSessions.startTime, cutoffDate)
        ))
        .orderBy(exerciseSessions.startTime);

      if (sessions.length < 4) {
        return { direction: 'stable', magnitude: 0, dataPoints: sessions.length };
      }

      // Calculate power trend using linear regression
      const powers = sessions.map((s, i) => ({
        x: i,
        y: s.avgPower || 0
      }));

      const n = powers.length;
      const sumX = powers.reduce((sum, p) => sum + p.x, 0);
      const sumY = powers.reduce((sum, p) => sum + p.y, 0);
      const sumXY = powers.reduce((sum, p) => sum + p.x * p.y, 0);
      const sumXX = powers.reduce((sum, p) => sum + p.x * p.x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const meanY = sumY / n;

      // Normalize slope by mean
      const normalizedSlope = meanY > 0 ? slope / meanY : 0;

      let direction: 'improving' | 'stable' | 'declining' = 'stable';
      if (normalizedSlope > 0.02) direction = 'improving';
      else if (normalizedSlope < -0.02) direction = 'declining';

      return {
        direction,
        magnitude: Math.abs(normalizedSlope),
        dataPoints: sessions.length
      };

    } catch (error: any) {
      logger.error('Trend calculation failed', { error: error.message, patientId });
      return { direction: 'stable', magnitude: 0, dataPoints: 0 };
    }
  }

  /**
   * Store mobility score to database
   */
  private async storeMobilityScore(score: UnifiedMobilityScore): Promise<void> {
    try {
      await db.insert(mobilityScores).values({
        patientId: score.patientId,
        scoredAt: score.timestamp,
        bikeScore: score.components.bikeScore,
        ambulationScore: score.components.ambulationScore,
        ptScore: score.components.ptScore,
        nursingScore: score.components.nursingScore,
        adlScore: score.components.adlScore,
        componentWeights: JSON.stringify(score.weights),
        unifiedScore: score.unifiedScore,
        scoreConfidence: score.confidence,
        barthelIndex: score.standardScales.barthelIndex,
        functionalIndependenceMeasure: score.standardScales.functionalIndependenceMeasure,
        scoreTrend: score.trend,
        trendMagnitude: score.trendMagnitude
      });
    } catch (error: any) {
      logger.error('Failed to store mobility score', { error: error.message });
    }
  }

  /**
   * Get mobility score history for a patient
   */
  async getMobilityScoreHistory(patientId: number, days: number = 30): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return await db.select()
        .from(mobilityScores)
        .where(and(
          eq(mobilityScores.patientId, patientId),
          gte(mobilityScores.scoredAt, cutoffDate)
        ))
        .orderBy(desc(mobilityScores.scoredAt));

    } catch (error: any) {
      logger.error('Failed to get mobility score history', { error: error.message, patientId });
      return [];
    }
  }

  // ========================================================================
  // HOSPITAL MOBILITY SCORE (Patent 16.1)
  // ========================================================================

  /**
   * Calculate hospital-wide mobility performance score
   */
  async calculateHospitalMobilityScore(unit?: string): Promise<{
    overallScore: number;
    deviceUtilization: number;
    avgSessionFrequency: number;
    avgImprovement: number;
    patientCount: number;
    unitBreakdown?: Record<string, any>;
  }> {
    try {
      // Get all patients with exercise data in last 7 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const sessionsData = await db.select({
        patientId: exerciseSessions.patientId,
        sessionCount: count(exerciseSessions.id),
        avgPower: avg(exerciseSessions.avgPower),
        avgDuration: avg(exerciseSessions.durationSeconds)
      })
        .from(exerciseSessions)
        .where(gte(exerciseSessions.startTime, cutoffDate))
        .groupBy(exerciseSessions.patientId);

      if (sessionsData.length === 0) {
        return {
          overallScore: 0,
          deviceUtilization: 0,
          avgSessionFrequency: 0,
          avgImprovement: 0,
          patientCount: 0
        };
      }

      // Calculate metrics
      const patientCount = sessionsData.length;

      // Average session frequency (sessions per patient per week)
      const totalSessions = sessionsData.reduce((sum, d) =>
        sum + Number(d.sessionCount), 0
      );
      const avgSessionFrequency = totalSessions / patientCount / 7;

      // Average power across all sessions
      const avgPower = sessionsData.reduce((sum, d) =>
        sum + Number(d.avgPower || 0), 0
      ) / patientCount;

      // Composite score (0-100)
      const frequencyScore = Math.min(avgSessionFrequency / 2, 1) * 30;  // 2 sessions/day = max
      const powerScore = Math.min(avgPower / 40, 1) * 40;                // 40W avg = max
      const participationScore = (patientCount / 50) * 30;              // 50 patients = max

      const overallScore = Math.round(frequencyScore + powerScore + participationScore);

      return {
        overallScore,
        deviceUtilization: Math.round((totalSessions / (patientCount * 14)) * 100), // 2x/day
        avgSessionFrequency: Math.round(avgSessionFrequency * 100) / 100,
        avgImprovement: 0,  // Would need baseline comparison
        patientCount
      };

    } catch (error: any) {
      logger.error('Hospital mobility score calculation failed', { error: error.message });
      return {
        overallScore: 0,
        deviceUtilization: 0,
        avgSessionFrequency: 0,
        avgImprovement: 0,
        patientCount: 0
      };
    }
  }
}

// Singleton instance
export const mobilityScoringEngine = new MobilityScoringEngine();
