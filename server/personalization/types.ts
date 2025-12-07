/**
 * Type definitions for the Personalized Protocol Matching System
 *
 * Patent Features supported:
 * - 1.1 Predictive Fall Risk Algorithm
 * - 1.2 Personalized Resistance Auto-Adjustment
 * - 1.3 Discharge Readiness Prediction
 * - 4.1 Fatigue-Triggered Auto-Resistance Reduction
 * - 4.2 Progressive Overload Auto-Scheduling
 * - 10.5 Setback Recovery Protocol
 */

// ============================================================================
// PERSONALIZATION TYPES
// ============================================================================

export type PersonalityType = 'competitive' | 'achievement' | 'health_focused' | 'social' | 'undetermined';

export type PerformanceWindow = 'morning' | 'afternoon' | 'evening' | 'night';

export type MobilityStatus = 'bedbound' | 'chair_bound' | 'standing_assist' | 'walking_assist' | 'independent';

export type CognitiveStatus = 'normal' | 'mild_impairment' | 'delirium_dementia';

export type LevelOfCare = 'icu' | 'stepdown' | 'ward' | 'rehab';

// ============================================================================
// FATIGUE DETECTION TYPES (Patent 4.1)
// ============================================================================

export type FatigueType = 'power_decline' | 'cadence_irregular' | 'force_degradation' | 'bilateral_loss';

export type FatigueSeverity = 'mild' | 'moderate' | 'severe';

export type FatigueAction = 'resistance_reduced' | 'session_ended' | 'alert_sent' | 'none';

export interface FatigueMarkers {
  powerDecline: boolean;           // >20% power drop within 2 minutes
  cadenceIrregularity: boolean;    // CV >30%
  forcePatternDegradation: boolean;
  bilateralCoordinationLoss: boolean;
}

export interface FatigueDetectionResult {
  detected: boolean;
  type?: FatigueType;
  severity?: FatigueSeverity;
  markers: FatigueMarkers;
  metrics: {
    powerDeclinePercent: number;
    cadenceCoefficientVariation: number;
    bilateralAsymmetryChange?: number;
  };
  recommendedAction: FatigueAction;
  resistanceReduction?: number;
}

// ============================================================================
// PROGRESSIVE OVERLOAD TYPES (Patent 4.2)
// ============================================================================

export type ProgressionParameter = 'resistance' | 'duration' | 'cadence' | 'frequency';

export type ProgressionDirection = 'increase' | 'maintain' | 'decrease';

export interface ProgressionRule {
  parameter: ProgressionParameter;
  condition: string;                // e.g., "3 consecutive sessions at target"
  incrementValue: number;
  maxValue?: number;
  minValue?: number;
}

export interface ProgressionCheck {
  shouldProgress: boolean;
  direction: ProgressionDirection;
  parameter?: ProgressionParameter;
  currentValue: number;
  newValue?: number;
  reason: string;
  confidence: number;               // 0-1 confidence in recommendation
}

export interface ProgressionHistory {
  date: Date;
  parameter: ProgressionParameter;
  fromValue: number;
  toValue: number;
  reason: string;
  outcome?: 'success' | 'failure' | 'pending';
}

// ============================================================================
// SETBACK RECOVERY TYPES (Patent 10.5)
// ============================================================================

export type SetbackType = 'performance_decline' | 'adherence_drop' | 'bilateral_imbalance' | 'medical_event';

export interface SetbackDetection {
  detected: boolean;
  type?: SetbackType;
  severity?: 'minor' | 'moderate' | 'major';
  metrics: {
    performanceDeclinePercent?: number;
    missedSessionsDays?: number;
    bilateralImbalancePercent?: number;
  };
  recommendation: SetbackRecoveryPlan;
}

export interface SetbackRecoveryPlan {
  goalReduction: number;            // Percentage to reduce goals
  encouragementFrequency: 'high' | 'medium' | 'low';
  rebaselineAfterDays: number;
  clinicianConsultationNeeded: boolean;
}

// ============================================================================
// BILATERAL FORCE TYPES (Patent Category 2)
// ============================================================================

export interface BilateralMetrics {
  leftForce: number;
  rightForce: number;
  asymmetryPercent: number;         // |left - right| / max(left, right) * 100
  trend: 'improving' | 'stable' | 'worsening';
  clinicalSignificance: boolean;    // >15% asymmetry
}

export interface BilateralFeedback {
  targetSide: 'left' | 'right' | 'balanced';
  feedbackType: 'visual' | 'audio' | 'haptic';
  intensity: number;                // 0-100
  message?: string;
}

// ============================================================================
// MEDICATION INTERACTION TYPES (Patent 11.2)
// ============================================================================

export type MedicationClass =
  | 'beta_blocker'
  | 'diuretic'
  | 'sedative'
  | 'anticoagulant'
  | 'steroid'
  | 'opioid'
  | 'antihypertensive'
  | 'cardiac_glycoside'
  | 'bronchodilator'
  | 'other';

export interface MedicationEffect {
  medicationClass: MedicationClass;
  expectedEffects: {
    heartRateImpact: 'suppressed' | 'elevated' | 'normal';
    bloodPressureImpact: 'lowered' | 'elevated' | 'normal';
    coordinationImpact: 'impaired' | 'normal';
    fatigueImpact: 'increased' | 'decreased' | 'normal';
  };
  exerciseConsiderations: string[];
  goalAdjustments: {
    parameter: string;
    adjustment: number;             // Percentage adjustment
    reason: string;
  }[];
}

export interface MedicationInteractionAlert {
  patientId: number;
  medicationName: string;
  medicationClass: MedicationClass;
  sessionId?: number;
  performanceChange: {
    powerPercent: number;
    expectedChange: number;
    significantDeviation: boolean;
  };
  alert: {
    generated: boolean;
    priority: 'low' | 'medium' | 'high';
    message: string;
    recommendation: string;
  };
}

// ============================================================================
// CONTRAINDICATION TYPES (Patent 11.3)
// ============================================================================

export type ContraindicationType = 'absolute' | 'relative' | 'temporal';

export type ContraindicationAction = 'device_locked' | 'parameters_modified' | 'alert_sent' | 'cleared';

export interface ContraindicationCheck {
  patientId: number;
  verificationType: 'pre_session' | 'periodic' | 'order_change';
  timestamp: Date;
  result: {
    safe: boolean;
    contraindicationType?: ContraindicationType;
    reason?: string;
    action: ContraindicationAction;
    modifiedParameters?: Record<string, any>;
  };
}

export interface ContraindicationRule {
  id: string;
  name: string;
  type: ContraindicationType;
  conditions: {
    field: string;                  // Patient profile field
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'within_days';
    value: any;
  }[];
  action: ContraindicationAction;
  alertPriority: 'critical' | 'warning' | 'caution';
  message: string;
}

// ============================================================================
// COHORT COMPARISON TYPES (Patent 8.1)
// ============================================================================

export interface CohortCriteria {
  ageRange: [number, number];       // [min, max]
  diagnosisCategory?: string;
  mobilityLevel?: MobilityStatus;
  daysPostAdmission?: number;
  levelOfCare?: LevelOfCare;
}

export interface CohortComparison {
  patientId: number;
  cohortId: string;                 // Hashed identifier
  cohortSize: number;
  percentiles: {
    duration: number;               // 0-100
    power: number;
    consistency: number;
    improvement: number;
    overall: number;
  };
  message: string;                  // "You're performing better than 68% of similar patients"
}

// ============================================================================
// MOBILITY SCORE TYPES (Patent 1.5)
// ============================================================================

export interface MobilityScoreComponents {
  bikeScore: number;                // From bedside bike metrics (0-100)
  ambulationScore?: number;         // From hallway/room ambulation
  ptScore?: number;                 // From PT session reports
  nursingScore?: number;            // From nursing assessments
  adlScore?: number;                // Activities of daily living
}

export interface UnifiedMobilityScore {
  patientId: number;
  timestamp: Date;
  components: MobilityScoreComponents;
  weights: Record<keyof MobilityScoreComponents, number>;
  unifiedScore: number;             // 0-100
  confidence: number;               // Based on data completeness
  standardScales: {
    barthelIndex?: number;          // 0-100
    functionalIndependenceMeasure?: number;  // 18-126
  };
  trend: 'improving' | 'stable' | 'declining';
  trendMagnitude: number;           // Rate of change
}

// ============================================================================
// VIRTUAL COMPETITION TYPES (Patent 3.2)
// ============================================================================

export type CompetitionType = 'daily_distance' | 'weekly_duration' | 'power_challenge' | 'consistency_streak';

export interface Competition {
  id: number;
  name: string;
  type: CompetitionType;
  startDate: Date;
  endDate: Date;
  matchingCriteria: CohortCriteria;
  status: 'active' | 'completed' | 'cancelled';
}

export interface CompetitionParticipant {
  competitionId: number;
  patientId: number;
  anonymousId: string;              // Privacy-preserving ID like "Runner_42"
  score: number;
  rank: number;
  milestones: string[];
  sessionsContributed: number;
}

export interface CompetitionMilestone {
  id: string;
  name: string;
  threshold: number;
  feedback: {
    sound: string;                  // Sound file or pattern
    vibration: string;              // Vibration pattern
    message: string;
  };
}

// ============================================================================
// INSURANCE REPORT TYPES (Patent 5.3)
// ============================================================================

export type InsuranceReportType = 'snf_authorization' | 'home_health' | 'outpatient_pt';

export interface InsuranceReportData {
  patientId: number;
  reportType: InsuranceReportType;
  functionalCapacity: {
    currentMobilityScore: number;
    baselineMobilityScore: number;
    changePercent: number;
    objectiveMetrics: {
      avgSessionDuration: number;
      avgPower: number;
      consistencyScore: number;
      bilateralBalance: number;
    };
  };
  progressTrajectory: 'improving' | 'plateaued' | 'declining';
  predictions: {
    timeToIndependenceDays?: number;
    dischargeDisposition: string;
    readmissionRisk: number;
    confidence: number;
  };
  insuranceCriteriaAlignment: {
    criterionName: string;
    met: boolean;
    evidence: string;
  }[];
}

// ============================================================================
// FALL RISK PREDICTION TYPES (Patent 1.1)
// ============================================================================

export interface ExerciseBasedFallRiskFactors {
  bilateralAsymmetry: number;       // >15% = elevated risk
  cadenceVariability: number;       // CV, higher = more risk
  powerDecayPattern: number;        // Rate of decline
  timeOfDayRisk: number;            // Based on performance windows
  medicationTimingRisk: number;     // Post-sedative risk
}

export interface MultiFactoredFallRisk {
  patientId: number;
  timestamp: Date;
  overallRisk: number;              // 0-1 probability
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  clinicalFactors: {
    factor: string;
    contribution: number;           // 0-1
  }[];
  exerciseFactors: ExerciseBasedFallRiskFactors;
  alert: {
    generated: boolean;
    priority: string;
    message: string;
  };
}
