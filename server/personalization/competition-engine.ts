/**
 * Virtual Competition & Cohort Benchmarking Engine
 *
 * Patent Feature 3.2: Virtual Competition System with Real-Time Feedback
 * Patent Feature 8.1: Cohort Performance Benchmarking System
 *
 * 3.2 Virtual Competition Novel Aspects:
 * - Anonymous patient matching based on similar baseline capability
 * - Real-time "ghost racer" visualization showing competitor progress
 * - Milestone-based sound and vibration celebrations:
 *   - Passing competitor: Ascending tone + short vibration
 *   - Being passed: Descending tone (motivational, not punitive)
 *   - Winning session: Victory melody + vibration sequence
 * - Weekly leaderboard with privacy-preserving identifiers
 *
 * 8.1 Cohort Benchmarking Novel Aspects:
 * - Anonymous cohort matching based on:
 *   - Age bracket
 *   - Admission diagnosis category
 *   - Baseline mobility level
 *   - Days post-admission
 * - Percentile ranking display: "You're performing better than 68% of similar patients"
 * - Improvement rate comparison
 * - No individual patient identification (privacy-preserving)
 */

import { db } from '../db';
import {
  virtualCompetitions,
  competitionParticipants,
  cohortComparisons,
  exerciseSessions,
  patientProfiles,
  patientStats,
  users
} from '@shared/schema';
import { eq, and, desc, gte, between, sql, inArray, count, avg } from 'drizzle-orm';
import { logger } from '../logger';
import { createHash } from 'crypto';
import type {
  CohortCriteria,
  CohortComparison,
  Competition,
  CompetitionParticipant,
  CompetitionType,
  CompetitionMilestone
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANONYMOUS_PREFIXES = [
  'Runner', 'Cyclist', 'Champion', 'Warrior', 'Eagle', 'Phoenix',
  'Tiger', 'Lion', 'Bear', 'Wolf', 'Falcon', 'Hawk', 'Star', 'Comet'
];

const MILESTONES: CompetitionMilestone[] = [
  {
    id: 'first_quarter',
    name: '25% Complete',
    threshold: 0.25,
    feedback: {
      sound: 'single_chime',
      vibration: 'short_pulse',
      message: 'Great start! Quarter of the way there!'
    }
  },
  {
    id: 'halfway',
    name: 'Halfway There',
    threshold: 0.50,
    feedback: {
      sound: 'double_chime',
      vibration: 'double_pulse',
      message: 'Excellent! Halfway to your goal!'
    }
  },
  {
    id: 'three_quarters',
    name: '75% Complete',
    threshold: 0.75,
    feedback: {
      sound: 'triple_chime_melody',
      vibration: 'triple_pulse',
      message: 'Amazing! Almost there - push through!'
    }
  },
  {
    id: 'goal_complete',
    name: 'Goal Achieved',
    threshold: 1.0,
    feedback: {
      sound: 'victory_melody',
      vibration: 'celebration_pattern',
      message: 'Congratulations! You did it!'
    }
  },
  {
    id: 'personal_record',
    name: 'Personal Record',
    threshold: 1.1,  // Exceeds goal by 10%
    feedback: {
      sound: 'fanfare',
      vibration: 'extended_celebration',
      message: 'NEW PERSONAL RECORD! Incredible performance!'
    }
  }
];

const COMPETITIVE_SOUNDS = {
  passing_opponent: {
    sound: 'ascending_tone',
    vibration: 'short_victory',
    message: 'You passed a competitor! Keep it up!'
  },
  being_passed: {
    sound: 'descending_tone',
    vibration: 'gentle_nudge',
    message: "They're catching up - you've got this!"
  },
  winning: {
    sound: 'victory_fanfare',
    vibration: 'celebration_sequence',
    message: 'Winner! You finished first!'
  }
};

// ============================================================================
// COMPETITION ENGINE CLASS
// ============================================================================

export class CompetitionEngine {

  // ========================================================================
  // COHORT BENCHMARKING (Patent 8.1)
  // ========================================================================

  /**
   * Generate cohort comparison for a patient
   *
   * Privacy-preserving: No individual patient data exposed
   */
  async generateCohortComparison(patientId: number): Promise<CohortComparison | null> {
    try {
      // Get patient profile
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      const user = await db.select()
        .from(users)
        .where(eq(users.id, patientId))
        .limit(1);

      if (!profile.length) {
        return null;
      }

      // Define cohort criteria
      const criteria = this.buildCohortCriteria(profile[0], user[0]);

      // Find matching cohort
      const cohortPatients = await this.findCohortPatients(criteria, patientId);

      if (cohortPatients.length < 5) {
        // Not enough patients for meaningful comparison
        return null;
      }

      // Calculate patient's metrics
      const patientMetrics = await this.getPatientMetrics(patientId);

      // Calculate cohort metrics
      const cohortMetrics = await this.calculateCohortMetrics(cohortPatients);

      // Calculate percentiles
      const percentiles = this.calculatePercentiles(patientMetrics, cohortMetrics);

      // Generate cohort ID (hashed for privacy)
      const cohortId = this.generateCohortId(criteria);

      // Build comparison message
      const message = this.buildComparisonMessage(percentiles);

      // Store comparison
      const comparison: CohortComparison = {
        patientId,
        cohortId,
        cohortSize: cohortPatients.length,
        percentiles,
        message
      };

      await this.storeCohortComparison(comparison, criteria);

      return comparison;

    } catch (error: any) {
      logger.error('Cohort comparison failed', { error: error.message, patientId });
      return null;
    }
  }

  /**
   * Build cohort criteria from patient profile
   */
  private buildCohortCriteria(profile: any, user: any): CohortCriteria {
    // Age bracket (5-year ranges)
    const age = profile.age;
    const ageRangeStart = Math.floor(age / 10) * 10;
    const ageRange: [number, number] = [ageRangeStart, ageRangeStart + 10];

    // Diagnosis category (simplified)
    const diagnosis = (profile.admissionDiagnosis || '').toLowerCase();
    let diagnosisCategory: string | undefined;

    if (diagnosis.includes('knee') || diagnosis.includes('hip') || diagnosis.includes('joint')) {
      diagnosisCategory = 'orthopedic';
    } else if (diagnosis.includes('heart') || diagnosis.includes('cardiac')) {
      diagnosisCategory = 'cardiac';
    } else if (diagnosis.includes('pneumonia') || diagnosis.includes('respiratory')) {
      diagnosisCategory = 'pulmonary';
    } else if (diagnosis.includes('stroke') || diagnosis.includes('neuro')) {
      diagnosisCategory = 'neurological';
    }

    // Days post admission
    const admissionDate = user?.admissionDate ? new Date(user.admissionDate) : new Date();
    const daysPostAdmission = Math.floor(
      (Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      ageRange,
      diagnosisCategory,
      mobilityLevel: profile.mobilityStatus as any,
      daysPostAdmission,
      levelOfCare: profile.levelOfCare as any
    };
  }

  /**
   * Find patients matching cohort criteria
   */
  private async findCohortPatients(
    criteria: CohortCriteria,
    excludePatientId: number
  ): Promise<number[]> {
    try {
      // Get all patient profiles
      const profiles = await db.select({
        userId: patientProfiles.userId,
        age: patientProfiles.age,
        mobilityStatus: patientProfiles.mobilityStatus,
        levelOfCare: patientProfiles.levelOfCare,
        admissionDiagnosis: patientProfiles.admissionDiagnosis
      })
        .from(patientProfiles);

      // Filter matching patients
      const matchingPatients = profiles.filter(p => {
        if (p.userId === excludePatientId) return false;

        // Age range
        if (p.age < criteria.ageRange[0] || p.age > criteria.ageRange[1]) return false;

        // Mobility level (if specified)
        if (criteria.mobilityLevel && p.mobilityStatus !== criteria.mobilityLevel) return false;

        // Level of care (if specified)
        if (criteria.levelOfCare && p.levelOfCare !== criteria.levelOfCare) return false;

        return true;
      });

      return matchingPatients.map(p => p.userId);

    } catch (error: any) {
      logger.error('Find cohort patients failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get patient's metrics for comparison
   */
  private async getPatientMetrics(patientId: number): Promise<{
    avgDuration: number;
    avgPower: number;
    consistency: number;
    improvement: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const sessions = await db.select()
        .from(exerciseSessions)
        .where(and(
          eq(exerciseSessions.patientId, patientId),
          gte(exerciseSessions.startTime, cutoffDate)
        ))
        .orderBy(desc(exerciseSessions.startTime));

      if (sessions.length === 0) {
        return { avgDuration: 0, avgPower: 0, consistency: 0, improvement: 0 };
      }

      const avgDuration = sessions.reduce((sum, s) =>
        sum + (s.durationSeconds || s.duration * 60), 0
      ) / sessions.length;

      const avgPower = sessions.reduce((sum, s) =>
        sum + (s.avgPower || 0), 0
      ) / sessions.length;

      const stats = await db.select()
        .from(patientStats)
        .where(eq(patientStats.patientId, patientId))
        .limit(1);

      const consistency = stats[0]?.consistencyStreak || 0;

      // Calculate improvement (compare first half vs second half of sessions)
      let improvement = 0;
      if (sessions.length >= 4) {
        const half = Math.floor(sessions.length / 2);
        const oldAvgPower = sessions.slice(half).reduce((sum, s) =>
          sum + (s.avgPower || 0), 0
        ) / (sessions.length - half);
        const newAvgPower = sessions.slice(0, half).reduce((sum, s) =>
          sum + (s.avgPower || 0), 0
        ) / half;

        if (oldAvgPower > 0) {
          improvement = (newAvgPower - oldAvgPower) / oldAvgPower;
        }
      }

      return { avgDuration, avgPower, consistency, improvement };

    } catch (error: any) {
      logger.error('Get patient metrics failed', { error: error.message, patientId });
      return { avgDuration: 0, avgPower: 0, consistency: 0, improvement: 0 };
    }
  }

  /**
   * Calculate metrics for cohort patients
   */
  private async calculateCohortMetrics(patientIds: number[]): Promise<{
    durations: number[];
    powers: number[];
    consistencies: number[];
    improvements: number[];
  }> {
    const durations: number[] = [];
    const powers: number[] = [];
    const consistencies: number[] = [];
    const improvements: number[] = [];

    for (const patientId of patientIds) {
      const metrics = await this.getPatientMetrics(patientId);

      if (metrics.avgDuration > 0) durations.push(metrics.avgDuration);
      if (metrics.avgPower > 0) powers.push(metrics.avgPower);
      if (metrics.consistency >= 0) consistencies.push(metrics.consistency);
      if (Math.abs(metrics.improvement) > 0) improvements.push(metrics.improvement);
    }

    return { durations, powers, consistencies, improvements };
  }

  /**
   * Calculate percentiles for patient vs cohort
   */
  private calculatePercentiles(
    patientMetrics: { avgDuration: number; avgPower: number; consistency: number; improvement: number },
    cohortMetrics: { durations: number[]; powers: number[]; consistencies: number[]; improvements: number[] }
  ): { duration: number; power: number; consistency: number; improvement: number; overall: number } {
    const percentile = (value: number, distribution: number[]): number => {
      if (distribution.length === 0) return 50;

      const sorted = [...distribution].sort((a, b) => a - b);
      const below = sorted.filter(v => v < value).length;

      return Math.round((below / sorted.length) * 100);
    };

    const duration = percentile(patientMetrics.avgDuration, cohortMetrics.durations);
    const power = percentile(patientMetrics.avgPower, cohortMetrics.powers);
    const consistency = percentile(patientMetrics.consistency, cohortMetrics.consistencies);
    const improvement = percentile(patientMetrics.improvement, cohortMetrics.improvements);

    // Weighted overall
    const overall = Math.round(
      duration * 0.25 + power * 0.35 + consistency * 0.25 + improvement * 0.15
    );

    return { duration, power, consistency, improvement, overall };
  }

  /**
   * Generate privacy-preserving cohort ID
   */
  private generateCohortId(criteria: CohortCriteria): string {
    const criteriaString = JSON.stringify({
      ageRange: criteria.ageRange,
      mobility: criteria.mobilityLevel,
      loc: criteria.levelOfCare
    });

    return createHash('sha256')
      .update(criteriaString)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Build motivational comparison message
   */
  private buildComparisonMessage(percentiles: { overall: number; power: number; duration: number }): string {
    if (percentiles.overall >= 75) {
      return `Outstanding! You're performing better than ${percentiles.overall}% of similar patients. Keep up the amazing work!`;
    } else if (percentiles.overall >= 50) {
      return `Great progress! You're performing better than ${percentiles.overall}% of similar patients. You're doing well!`;
    } else if (percentiles.overall >= 25) {
      return `You're making progress! ${100 - percentiles.overall}% of similar patients are ahead - but you're catching up!`;
    } else {
      return `Every session counts! Focus on consistency and you'll see improvement. You've got this!`;
    }
  }

  /**
   * Store cohort comparison
   */
  private async storeCohortComparison(
    comparison: CohortComparison,
    criteria: CohortCriteria
  ): Promise<void> {
    try {
      await db.insert(cohortComparisons).values({
        patientId: comparison.patientId,
        cohortId: comparison.cohortId,
        cohortCriteria: JSON.stringify(criteria),
        cohortSize: comparison.cohortSize,
        comparedAt: new Date(),
        durationPercentile: comparison.percentiles.duration,
        powerPercentile: comparison.percentiles.power,
        consistencyPercentile: comparison.percentiles.consistency,
        improvementPercentile: comparison.percentiles.improvement,
        overallPercentile: comparison.percentiles.overall,
        comparisonMessage: comparison.message
      });
    } catch (error: any) {
      logger.error('Store cohort comparison failed', { error: error.message });
    }
  }

  // ========================================================================
  // VIRTUAL COMPETITION (Patent 3.2)
  // ========================================================================

  /**
   * Create a new virtual competition
   */
  async createCompetition(
    name: string,
    type: CompetitionType,
    startDate: Date,
    endDate: Date,
    matchingCriteria: CohortCriteria
  ): Promise<number | null> {
    try {
      const result = await db.insert(virtualCompetitions).values({
        competitionName: name,
        competitionType: type,
        startDate,
        endDate,
        matchingCriteria: JSON.stringify(matchingCriteria),
        status: 'active'
      });

      return result.lastInsertRowid as number;

    } catch (error: any) {
      logger.error('Create competition failed', { error: error.message });
      return null;
    }
  }

  /**
   * Join a patient to a competition
   */
  async joinCompetition(patientId: number, competitionId: number): Promise<{
    success: boolean;
    anonymousId?: string;
    error?: string;
  }> {
    try {
      // Check if already joined
      const existing = await db.select()
        .from(competitionParticipants)
        .where(and(
          eq(competitionParticipants.competitionId, competitionId),
          eq(competitionParticipants.patientId, patientId)
        ))
        .limit(1);

      if (existing.length > 0) {
        return { success: true, anonymousId: existing[0].anonymousId };
      }

      // Generate anonymous ID
      const anonymousId = this.generateAnonymousId(patientId, competitionId);

      await db.insert(competitionParticipants).values({
        competitionId,
        patientId,
        anonymousId,
        currentScore: 0,
        sessionsContributed: 0
      });

      return { success: true, anonymousId };

    } catch (error: any) {
      logger.error('Join competition failed', { error: error.message, patientId, competitionId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate privacy-preserving anonymous ID
   */
  private generateAnonymousId(patientId: number, competitionId: number): string {
    const prefix = ANONYMOUS_PREFIXES[Math.floor(Math.random() * ANONYMOUS_PREFIXES.length)];
    const hash = createHash('sha256')
      .update(`${patientId}-${competitionId}-${Date.now()}`)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();

    return `${prefix}_${hash}`;
  }

  /**
   * Update competition scores from a session
   */
  async updateCompetitionScores(
    patientId: number,
    sessionMetrics: {
      duration: number;
      distance: number;
      avgPower: number;
    }
  ): Promise<{
    updated: boolean;
    competitions: Array<{
      competitionId: number;
      newScore: number;
      newRank: number;
      milestones: string[];
      competitiveEvents: string[];
    }>;
  }> {
    try {
      // Find active competitions for this patient
      const participations = await db.select()
        .from(competitionParticipants)
        .where(eq(competitionParticipants.patientId, patientId));

      const results: Array<{
        competitionId: number;
        newScore: number;
        newRank: number;
        milestones: string[];
        competitiveEvents: string[];
      }> = [];

      for (const participation of participations) {
        // Get competition details
        const competition = await db.select()
          .from(virtualCompetitions)
          .where(eq(virtualCompetitions.id, participation.competitionId))
          .limit(1);

        if (!competition.length || competition[0].status !== 'active') continue;

        // Calculate score based on competition type
        const scoreIncrement = this.calculateScoreIncrement(
          competition[0].competitionType,
          sessionMetrics
        );

        const oldScore = participation.currentScore || 0;
        const newScore = oldScore + scoreIncrement;

        // Get old rank for comparison
        const oldRank = participation.currentRank || 999;

        // Update score
        await db.update(competitionParticipants)
          .set({
            currentScore: newScore,
            sessionsContributed: (participation.sessionsContributed || 0) + 1,
            lastContribution: new Date()
          })
          .where(eq(competitionParticipants.id, participation.id));

        // Recalculate ranks
        await this.recalculateRanks(participation.competitionId);

        // Get new rank
        const updatedParticipation = await db.select()
          .from(competitionParticipants)
          .where(eq(competitionParticipants.id, participation.id))
          .limit(1);

        const newRank = updatedParticipation[0]?.currentRank || 999;

        // Check for milestones and competitive events
        const milestones = this.checkMilestones(oldScore, newScore, competition[0]);
        const competitiveEvents = this.checkCompetitiveEvents(oldRank, newRank);

        results.push({
          competitionId: participation.competitionId,
          newScore,
          newRank,
          milestones,
          competitiveEvents
        });
      }

      return { updated: results.length > 0, competitions: results };

    } catch (error: any) {
      logger.error('Update competition scores failed', { error: error.message, patientId });
      return { updated: false, competitions: [] };
    }
  }

  /**
   * Calculate score increment based on competition type
   */
  private calculateScoreIncrement(
    type: string,
    metrics: { duration: number; distance: number; avgPower: number }
  ): number {
    switch (type) {
      case 'daily_distance':
        return metrics.distance || 0;
      case 'weekly_duration':
        return metrics.duration || 0;
      case 'power_challenge':
        return metrics.avgPower || 0;
      case 'consistency_streak':
        return 1;  // Each session counts as 1
      default:
        return metrics.duration || 0;
    }
  }

  /**
   * Recalculate ranks for all participants in a competition
   */
  private async recalculateRanks(competitionId: number): Promise<void> {
    try {
      const participants = await db.select()
        .from(competitionParticipants)
        .where(eq(competitionParticipants.competitionId, competitionId))
        .orderBy(desc(competitionParticipants.currentScore));

      for (let i = 0; i < participants.length; i++) {
        await db.update(competitionParticipants)
          .set({ currentRank: i + 1 })
          .where(eq(competitionParticipants.id, participants[i].id));
      }

    } catch (error: any) {
      logger.error('Recalculate ranks failed', { error: error.message, competitionId });
    }
  }

  /**
   * Check for milestone achievements
   */
  private checkMilestones(oldScore: number, newScore: number, competition: any): string[] {
    const achieved: string[] = [];

    // This would need competition-specific goal tracking
    // For now, return based on relative progress
    const progress = newScore / 100;  // Assume 100 is goal

    for (const milestone of MILESTONES) {
      const oldProgress = oldScore / 100;
      if (progress >= milestone.threshold && oldProgress < milestone.threshold) {
        achieved.push(milestone.id);
      }
    }

    return achieved;
  }

  /**
   * Check for competitive events (passing/being passed)
   */
  private checkCompetitiveEvents(oldRank: number, newRank: number): string[] {
    const events: string[] = [];

    if (newRank < oldRank) {
      events.push('passed_opponent');
      if (newRank === 1) {
        events.push('took_lead');
      }
    } else if (newRank > oldRank) {
      events.push('was_passed');
    }

    return events;
  }

  /**
   * Get leaderboard for a competition
   */
  async getLeaderboard(competitionId: number, limit: number = 10): Promise<{
    participants: Array<{
      rank: number;
      anonymousId: string;
      score: number;
      sessionsContributed: number;
    }>;
    totalParticipants: number;
  }> {
    try {
      const participants = await db.select({
        rank: competitionParticipants.currentRank,
        anonymousId: competitionParticipants.anonymousId,
        score: competitionParticipants.currentScore,
        sessions: competitionParticipants.sessionsContributed
      })
        .from(competitionParticipants)
        .where(eq(competitionParticipants.competitionId, competitionId))
        .orderBy(competitionParticipants.currentRank)
        .limit(limit);

      const total = await db.select({ count: count() })
        .from(competitionParticipants)
        .where(eq(competitionParticipants.competitionId, competitionId));

      return {
        participants: participants.map(p => ({
          rank: p.rank || 0,
          anonymousId: p.anonymousId,
          score: p.score || 0,
          sessionsContributed: p.sessions || 0
        })),
        totalParticipants: total[0]?.count || 0
      };

    } catch (error: any) {
      logger.error('Get leaderboard failed', { error: error.message, competitionId });
      return { participants: [], totalParticipants: 0 };
    }
  }

  /**
   * Get milestone feedback for UI/device
   */
  getMilestoneFeedback(milestoneId: string): CompetitionMilestone | undefined {
    return MILESTONES.find(m => m.id === milestoneId);
  }

  /**
   * Get competitive event feedback
   */
  getCompetitiveEventFeedback(eventType: string): {
    sound: string;
    vibration: string;
    message: string;
  } | undefined {
    return COMPETITIVE_SOUNDS[eventType as keyof typeof COMPETITIVE_SOUNDS];
  }

  /**
   * Find suitable competition for a patient
   */
  async findSuitableCompetition(patientId: number): Promise<number | null> {
    try {
      // Get patient profile
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      if (!profile.length) return null;

      // Get active competitions
      const competitions = await db.select()
        .from(virtualCompetitions)
        .where(eq(virtualCompetitions.status, 'active'));

      for (const competition of competitions) {
        const criteria: CohortCriteria = JSON.parse(competition.matchingCriteria);

        // Check if patient matches criteria
        if (profile[0].age >= criteria.ageRange[0] &&
            profile[0].age <= criteria.ageRange[1]) {
          // Check if not already joined
          const existing = await db.select()
            .from(competitionParticipants)
            .where(and(
              eq(competitionParticipants.competitionId, competition.id),
              eq(competitionParticipants.patientId, patientId)
            ))
            .limit(1);

          if (existing.length === 0) {
            return competition.id;
          }
        }
      }

      return null;

    } catch (error: any) {
      logger.error('Find suitable competition failed', { error: error.message, patientId });
      return null;
    }
  }
}

// Singleton instance
export const competitionEngine = new CompetitionEngine();
