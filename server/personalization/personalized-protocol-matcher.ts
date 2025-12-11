/**
 * Personalized Protocol Matcher
 *
 * Patent Feature: Personalized Protocol Matching System
 *
 * This system implements personalized medicine approach for exercise protocols by:
 * 1. Using the patient goal calculator to determine baseline energy prescription
 * 2. Adjusting parameters (resistance, RPM, duration) based on diagnosis
 * 3. Maintaining constant total daily energy target across all diagnoses
 * 4. Diagnosis-specific parameter distribution:
 *    - Cardiac/Pulmonary (CHF, COPD): Higher resistance, lower RPM
 *    - Orthopedic (TKA, THA): Lower resistance, higher rotations/longer duration
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
// DIAGNOSIS-BASED PRESCRIPTION TYPES
// ============================================================================

/**
 * Diagnosis categories that determine parameter adjustments
 */
export type DiagnosisCategory =
  | 'cardiac'       // Heart failure, CHF - focus on resistance, lower RPM
  | 'pulmonary'     // COPD, respiratory - focus on resistance, lower RPM
  | 'orthopedic'    // TKA, THA, hip fracture - focus on ROM, lower resistance, more rotations
  | 'neurological'  // Stroke - balanced approach with coordination focus
  | 'icu_recovery'  // Post-ICU, critical illness - very gentle, progressive
  | 'delirium'      // Delirium/confusion - simplified, structured, safe
  | 'frail_elderly' // Frail elderly 75+ - low intensity, fall prevention focus
  | 'general';      // Default - balanced approach, no specific adjustments

/**
 * Medication categories that affect exercise parameters
 */
export type MedicationCategory =
  | 'beta_blocker'      // Metoprolol, atenolol - HR blunted, focus on resistance
  | 'rate_control'      // Digoxin, diltiazem - avoid high HR targets
  | 'diuretic'          // Furosemide - fatigue, dehydration risk
  | 'sedating'          // Benzodiazepines, opioids - reduced intensity, fall risk
  | 'insulin'           // Insulin - hypoglycemia risk
  | 'anticoagulant'     // Warfarin, DOACs - bleeding risk awareness
  | 'antiparkinsonian'  // Carbidopa-levodopa - timing dependent, coordination
  | 'none';             // No significant medication adjustments

/**
 * Personalized mobility prescription based on patient data and diagnosis
 */
export interface PersonalizedPrescription {
  // Core prescription parameters
  totalDailyEnergy: number;       // Watt-minutes (constant regardless of diagnosis)
  duration: number;               // Minutes per session
  sessionsPerDay: number;         // Number of sessions
  targetPower: number;            // Watts (target average)
  resistance: number;             // 1-9 scale
  targetRpm: number;              // Revolutions per minute

  // Diagnosis-based adjustments
  diagnosisCategory: DiagnosisCategory;
  diagnosisCategoryLabel: string; // Human-readable label
  adjustmentRationale: string[];  // Why these parameters were chosen

  // Medication-based adjustments
  medicationCategories: MedicationCategory[];
  medicationAdjustments: string[]; // Specific medication-related modifications

  // Safety parameters from risk assessment
  fallRisk: number;
  deconditioningRisk: number;

  // Monitoring recommendations
  monitoringParams: string[];
  stopCriteria: string[];

  // Source information
  baselineFromRiskCalculator: boolean;
  patientId: number;
}

/**
 * Medication adjustment profile - how medications affect exercise parameters
 */
interface MedicationAdjustmentProfile {
  category: MedicationCategory;
  intensityMultiplier: number;    // Overall intensity reduction (1.0 = no change)
  resistanceFocus: boolean;       // Should focus on resistance rather than RPM?
  rpmReduction: number;           // Additional RPM reduction (0 = none)
  durationReduction: number;      // Duration reduction in minutes (0 = none)
  rationale: string;
  additionalMonitoring: string[];
  additionalStopCriteria: string[];
}

/**
 * Diagnosis adjustment profile - how to redistribute energy for each category
 */
interface DiagnosisAdjustmentProfile {
  category: DiagnosisCategory;
  resistanceMultiplier: number;   // Multiplier to baseline resistance (>1 = higher, <1 = lower)
  rpmMultiplier: number;          // Multiplier to baseline RPM
  durationMultiplier: number;     // Multiplier to baseline duration
  rationale: string;
}

// ============================================================================
// DIAGNOSIS ADJUSTMENT PROFILES
// ============================================================================

/**
 * Adjustment profiles for different diagnosis categories.
 * These define how to redistribute the same total energy across different parameters.
 *
 * Key principle: Total energy (watt-minutes) remains CONSTANT.
 * Power = Resistance × RPM (approximately, for our device)
 * Energy = Power × Duration × Sessions
 *
 * When we increase resistance and decrease RPM, we maintain similar power.
 * When we decrease resistance and increase duration, we maintain similar energy.
 */
const DIAGNOSIS_ADJUSTMENT_PROFILES: Record<DiagnosisCategory, DiagnosisAdjustmentProfile> = {
  /**
   * Cardiac (Heart Failure, CHF)
   * Goal: Build cardiac strength with controlled heart rate
   * Strategy: Higher resistance, lower RPM to reduce cardiac demand while
   * maintaining muscle engagement. Same total energy target.
   */
  cardiac: {
    category: 'cardiac',
    resistanceMultiplier: 1.25,    // 25% higher resistance
    rpmMultiplier: 0.80,           // 20% lower RPM
    durationMultiplier: 1.0,       // Same duration
    rationale: 'Higher resistance with controlled RPM reduces cardiac stress while maintaining muscle conditioning'
  },

  /**
   * Pulmonary (COPD, Respiratory)
   * Goal: Build endurance without excessive ventilatory demand
   * Strategy: Higher resistance, lower RPM to reduce respiratory rate
   * while maintaining conditioning. Same total energy target.
   */
  pulmonary: {
    category: 'pulmonary',
    resistanceMultiplier: 1.20,    // 20% higher resistance
    rpmMultiplier: 0.85,           // 15% lower RPM
    durationMultiplier: 1.0,       // Same duration
    rationale: 'Higher resistance with slower pedaling minimizes respiratory demand while preserving muscle work'
  },

  /**
   * Orthopedic (Total Knee, Total Hip, ROM-focused)
   * Goal: Maximize range of motion and joint mobility
   * Strategy: Lower resistance, more rotations, longer duration.
   * Same total energy target achieved through more movement.
   */
  orthopedic: {
    category: 'orthopedic',
    resistanceMultiplier: 0.70,    // 30% lower resistance
    rpmMultiplier: 1.15,           // 15% higher RPM (more rotations)
    durationMultiplier: 1.25,      // 25% longer duration for more total rotations
    rationale: 'Lower resistance with more rotations maximizes joint ROM and reduces surgical site stress'
  },

  /**
   * Neurological (Stroke, TBI)
   * Goal: Bilateral coordination and motor relearning
   * Strategy: Moderate parameters with focus on symmetry and control.
   * Same total energy target with emphasis on quality of movement.
   */
  neurological: {
    category: 'neurological',
    resistanceMultiplier: 0.90,    // 10% lower resistance for control
    rpmMultiplier: 0.95,           // 5% lower RPM for coordination
    durationMultiplier: 1.15,      // 15% longer for motor learning
    rationale: 'Moderate resistance with controlled pace supports bilateral coordination and motor relearning'
  },

  /**
   * ICU Recovery (Post-ICU, Critical Illness)
   * Goal: Very gentle reconditioning after critical illness
   * Strategy: Low intensity, shorter duration, progressive approach.
   */
  icu_recovery: {
    category: 'icu_recovery',
    resistanceMultiplier: 0.60,    // 40% lower resistance - very gentle
    rpmMultiplier: 0.70,           // 30% lower RPM - slow and controlled
    durationMultiplier: 0.75,      // 25% shorter duration - prevent fatigue
    rationale: 'Very gentle parameters for post-ICU reconditioning with progressive increase as tolerated'
  },

  /**
   * Delirium/Confusion
   * Goal: Provide structured activity, maintain safety
   * Strategy: Simple, consistent parameters, shorter sessions.
   */
  delirium: {
    category: 'delirium',
    resistanceMultiplier: 0.75,    // 25% lower resistance
    rpmMultiplier: 0.80,           // 20% lower RPM - manageable pace
    durationMultiplier: 0.70,      // 30% shorter duration - attention span
    rationale: 'Simplified, shorter sessions with consistent parameters to provide structured activity safely'
  },

  /**
   * Frail Elderly (75+)
   * Goal: Prevent deconditioning while minimizing fall risk
   * Strategy: Very low intensity, focus on safety over intensity.
   */
  frail_elderly: {
    category: 'frail_elderly',
    resistanceMultiplier: 0.65,    // 35% lower resistance
    rpmMultiplier: 0.75,           // 25% lower RPM
    durationMultiplier: 0.80,      // 20% shorter duration
    rationale: 'Low-intensity approach prioritizing safety and fall prevention over conditioning intensity'
  },

  /**
   * General (Default)
   * Goal: Balanced conditioning and VTE prevention
   * Strategy: Use baseline parameters from risk calculator directly.
   * Note: No diagnosis-specific protocol adjustments recommended - using evidence-based baseline.
   */
  general: {
    category: 'general',
    resistanceMultiplier: 1.0,
    rpmMultiplier: 1.0,
    durationMultiplier: 1.0,
    rationale: 'No diagnosis-specific adjustments recommended. Using evidence-based baseline prescription optimized for general conditioning and VTE prevention.'
  }
};

// ============================================================================
// MEDICATION ADJUSTMENT PROFILES
// ============================================================================

/**
 * Medication adjustment profiles - how different medication classes affect exercise.
 * These adjustments are ADDITIVE to diagnosis adjustments.
 */
const MEDICATION_ADJUSTMENT_PROFILES: Record<MedicationCategory, MedicationAdjustmentProfile> = {
  /**
   * Beta Blockers (Metoprolol, Atenolol)
   * Effect: Blunts heart rate response, reduces exercise capacity 10-20%
   * Strategy: Focus on resistance (strength) rather than aerobic (RPM)
   */
  beta_blocker: {
    category: 'beta_blocker',
    intensityMultiplier: 0.90,     // 10% intensity reduction
    resistanceFocus: true,          // YES - focus on resistance over RPM
    rpmReduction: 5,                // Reduce target RPM by 5
    durationReduction: 0,           // No duration change
    rationale: 'Beta blocker blunts heart rate response. Focus on resistance/strength training rather than aerobic conditioning.',
    additionalMonitoring: [
      'Note: HR will not reflect true exertion - use RPE instead',
      'Monitor for fatigue at lower than expected HR'
    ],
    additionalStopCriteria: [
      'RPE >6/10 (HR unreliable due to beta blocker)',
      'Excessive fatigue despite normal HR'
    ]
  },

  /**
   * Rate Control Medications (Digoxin, Diltiazem, Verapamil)
   * Effect: Limits maximum heart rate, reduces cardiac output capacity
   * Strategy: Focus on resistance, avoid high RPM targets
   */
  rate_control: {
    category: 'rate_control',
    intensityMultiplier: 0.85,     // 15% intensity reduction
    resistanceFocus: true,          // YES - focus on resistance
    rpmReduction: 8,                // Reduce target RPM by 8
    durationReduction: 0,
    rationale: 'Rate control medication limits heart rate response. Prioritize resistance-based exercise over aerobic RPM targets.',
    additionalMonitoring: [
      'Heart rate response will be blunted',
      'Use RPE 2-3/10 as primary intensity guide'
    ],
    additionalStopCriteria: [
      'RPE >5/10',
      'Any palpitations or irregular rhythm sensation'
    ]
  },

  /**
   * Diuretics (Furosemide, Hydrochlorothiazide)
   * Effect: Increased fatigue, dehydration risk, electrolyte imbalance
   * Strategy: Shorter sessions, ensure hydration, monitor closely
   */
  diuretic: {
    category: 'diuretic',
    intensityMultiplier: 0.90,     // 10% intensity reduction
    resistanceFocus: false,
    rpmReduction: 0,
    durationReduction: 2,          // Reduce duration by 2 minutes
    rationale: 'Diuretic may cause earlier fatigue and dehydration. Slightly shorter sessions with hydration awareness.',
    additionalMonitoring: [
      'Monitor for signs of dehydration',
      'Watch for muscle cramping (electrolyte imbalance)',
      'Assess energy level throughout session'
    ],
    additionalStopCriteria: [
      'Muscle cramping',
      'Dizziness or lightheadedness',
      'Excessive thirst or dry mouth'
    ]
  },

  /**
   * Sedating Medications (Benzodiazepines, Opioids, Antipsychotics)
   * Effect: Drowsiness, impaired coordination, increased fall risk
   * Strategy: Significantly reduced intensity, enhanced supervision
   */
  sedating: {
    category: 'sedating',
    intensityMultiplier: 0.75,     // 25% intensity reduction
    resistanceFocus: false,
    rpmReduction: 5,
    durationReduction: 3,          // Reduce duration by 3 minutes
    rationale: 'Sedating medication affects coordination and alertness. Reduced intensity with close supervision required.',
    additionalMonitoring: [
      'Assess alertness before and during session',
      'Monitor coordination and balance',
      'Watch for excessive drowsiness'
    ],
    additionalStopCriteria: [
      'Drowsiness or confusion',
      'Impaired coordination observed',
      'Patient unable to follow simple instructions'
    ]
  },

  /**
   * Insulin
   * Effect: Hypoglycemia risk, especially with exercise
   * Strategy: Monitor blood glucose, have glucose available
   */
  insulin: {
    category: 'insulin',
    intensityMultiplier: 0.95,     // 5% intensity reduction
    resistanceFocus: false,
    rpmReduction: 0,
    durationReduction: 0,
    rationale: 'Insulin increases hypoglycemia risk during exercise. Ensure glucose monitoring and snack availability.',
    additionalMonitoring: [
      'Check blood glucose before session',
      'Have fast-acting glucose available',
      'Monitor for hypoglycemia symptoms'
    ],
    additionalStopCriteria: [
      'Blood glucose <70 mg/dL',
      'Symptoms of hypoglycemia (shakiness, sweating, confusion)',
      'Patient feels lightheaded or weak'
    ]
  },

  /**
   * Anticoagulants (Warfarin, Apixaban, Rivaroxaban)
   * Effect: Bleeding risk with trauma
   * Strategy: No intensity change, but awareness of bleeding risk
   */
  anticoagulant: {
    category: 'anticoagulant',
    intensityMultiplier: 1.0,      // No intensity change
    resistanceFocus: false,
    rpmReduction: 0,
    durationReduction: 0,
    rationale: 'Anticoagulant therapy - no exercise modification needed but maintain awareness of bleeding risk.',
    additionalMonitoring: [
      'Inspect for bruising before session',
      'Note any complaints of unusual pain or swelling'
    ],
    additionalStopCriteria: [
      'Any signs of bleeding or unusual bruising',
      'Complaints of joint or muscle pain that could indicate bleeding'
    ]
  },

  /**
   * Antiparkinsonian (Carbidopa-Levodopa)
   * Effect: Timing-dependent effectiveness, coordination changes
   * Strategy: Exercise during "on" periods, account for coordination issues
   */
  antiparkinsonian: {
    category: 'antiparkinsonian',
    intensityMultiplier: 0.90,     // 10% intensity reduction
    resistanceFocus: false,
    rpmReduction: 3,               // Slightly lower RPM for coordination
    durationReduction: 0,
    rationale: 'Antiparkinsonian medication has timing-dependent effects. Schedule exercise during medication "on" periods.',
    additionalMonitoring: [
      'Time session 1-2 hours after medication dose',
      'Monitor for dyskinesia or tremor changes',
      'Assess coordination throughout'
    ],
    additionalStopCriteria: [
      'Significant tremor interfering with pedaling',
      'Dyskinesia affecting safety',
      'Medication wearing off (freezing episodes)'
    ]
  },

  /**
   * None - No significant medication adjustments
   */
  none: {
    category: 'none',
    intensityMultiplier: 1.0,
    resistanceFocus: false,
    rpmReduction: 0,
    durationReduction: 0,
    rationale: 'No medication-related exercise modifications required.',
    additionalMonitoring: [],
    additionalStopCriteria: []
  }
};

/**
 * Map diagnosis text/codes to categories
 * This mapping ensures ALL dropdown options have a corresponding category
 */
const DIAGNOSIS_CATEGORY_MAP: Record<string, DiagnosisCategory> = {
  // =========================================================================
  // DROPDOWN OPTION: "Heart Failure"
  // =========================================================================
  'heart failure': 'cardiac',
  'chf': 'cardiac',
  'congestive heart failure': 'cardiac',
  'cardiac': 'cardiac',
  'i50': 'cardiac',        // ICD-10 Heart failure codes start with I50
  'cardiomyopathy': 'cardiac',
  'atrial fibrillation': 'cardiac',
  'afib': 'cardiac',
  'myocardial infarction': 'cardiac',
  'mi': 'cardiac',
  'angina': 'cardiac',

  // =========================================================================
  // DROPDOWN OPTION: "COPD Exacerbation"
  // =========================================================================
  'copd': 'pulmonary',
  'copd exacerbation': 'pulmonary',
  'chronic obstructive pulmonary disease': 'pulmonary',
  'respiratory': 'pulmonary',
  'pneumonia': 'pulmonary',
  'j44': 'pulmonary',      // ICD-10 COPD codes
  'j18': 'pulmonary',      // ICD-10 Pneumonia codes
  'asthma': 'pulmonary',
  'pulmonary': 'pulmonary',
  'respiratory failure': 'pulmonary',
  'acute respiratory': 'pulmonary',

  // =========================================================================
  // DROPDOWN OPTION: "Total Knee Arthroplasty"
  // =========================================================================
  'total knee arthroplasty': 'orthopedic',
  'total knee': 'orthopedic',
  'tka': 'orthopedic',
  'knee replacement': 'orthopedic',
  'knee arthroplasty': 'orthopedic',
  'z96.64': 'orthopedic',  // ICD-10 Artificial knee joint
  'm17': 'orthopedic',     // ICD-10 Knee osteoarthritis

  // =========================================================================
  // DROPDOWN OPTION: "Hip Fracture"
  // =========================================================================
  'hip fracture': 'orthopedic',
  'total hip': 'orthopedic',
  'tha': 'orthopedic',
  'hip replacement': 'orthopedic',
  'hip arthroplasty': 'orthopedic',
  'z96.65': 'orthopedic',  // ICD-10 Artificial hip joint
  'm16': 'orthopedic',     // ICD-10 Hip osteoarthritis
  'joint replacement': 'orthopedic',
  'arthroplasty': 'orthopedic',
  'orif': 'orthopedic',    // Open reduction internal fixation
  's72': 'orthopedic',     // ICD-10 Femur fracture

  // =========================================================================
  // DROPDOWN OPTION: "Stroke/CVA"
  // =========================================================================
  'stroke': 'neurological',
  'stroke/cva': 'neurological',
  'cva': 'neurological',
  'cerebrovascular': 'neurological',
  'cerebrovascular accident': 'neurological',
  'i63': 'neurological',   // ICD-10 Cerebral infarction
  'i64': 'neurological',   // ICD-10 Stroke not specified
  'tbi': 'neurological',
  'traumatic brain': 'neurological',
  'hemiplegia': 'neurological',
  'g81': 'neurological',   // ICD-10 Hemiplegia

  // =========================================================================
  // DROPDOWN OPTION: "ICU Stay/Critical Illness"
  // =========================================================================
  'icu': 'icu_recovery',
  'icu stay': 'icu_recovery',
  'icu stay/critical illness': 'icu_recovery',
  'critical illness': 'icu_recovery',
  'post-icu': 'icu_recovery',
  'icu deconditioning': 'icu_recovery',
  'critical illness myopathy': 'icu_recovery',
  'sepsis': 'icu_recovery',
  'septic shock': 'icu_recovery',
  'mechanical ventilation': 'icu_recovery',
  'prolonged intubation': 'icu_recovery',
  'g72.81': 'icu_recovery', // ICD-10 Critical illness myopathy

  // =========================================================================
  // DROPDOWN OPTION: "Delirium/Confusion"
  // =========================================================================
  'delirium': 'delirium',
  'delirium/confusion': 'delirium',
  'confusion': 'delirium',
  'altered mental status': 'delirium',
  'encephalopathy': 'delirium',
  'f05': 'delirium',       // ICD-10 Delirium
  'r41.0': 'delirium',     // ICD-10 Disorientation

  // =========================================================================
  // DROPDOWN OPTION: "Frail Elderly (75+)"
  // =========================================================================
  'frail': 'frail_elderly',
  'frail elderly': 'frail_elderly',
  'frail elderly (75+)': 'frail_elderly',
  'elderly': 'frail_elderly',
  'debility': 'frail_elderly',
  'age-related debility': 'frail_elderly',
  'failure to thrive': 'frail_elderly',
  'r54': 'frail_elderly',  // ICD-10 Age-related debility
  'r62.7': 'frail_elderly', // ICD-10 Adult failure to thrive
  'm62.81': 'frail_elderly', // ICD-10 Muscle weakness

  // =========================================================================
  // DROPDOWN OPTION: "General Medical/Surgical" and "Other"
  // =========================================================================
  'general': 'general',
  'general medical': 'general',
  'general medical/surgical': 'general',
  'general surgical': 'general',
  'other': 'general',
  'surgical': 'general',
  'medical': 'general'
};

/**
 * Human-readable labels for diagnosis categories
 */
const DIAGNOSIS_CATEGORY_LABELS: Record<DiagnosisCategory, string> = {
  cardiac: 'Cardiac (Heart Failure/CHF)',
  pulmonary: 'Pulmonary (COPD/Respiratory)',
  orthopedic: 'Orthopedic (Joint Replacement/Fracture)',
  neurological: 'Neurological (Stroke/CVA)',
  icu_recovery: 'ICU Recovery/Critical Illness',
  delirium: 'Delirium/Confusion',
  frail_elderly: 'Frail Elderly',
  general: 'General Medical/Surgical'
};

/**
 * Map medication names to categories
 */
const MEDICATION_CATEGORY_MAP: Record<string, MedicationCategory> = {
  // Beta Blockers
  'metoprolol': 'beta_blocker',
  'atenolol': 'beta_blocker',
  'carvedilol': 'beta_blocker',
  'propranolol': 'beta_blocker',
  'bisoprolol': 'beta_blocker',
  'labetalol': 'beta_blocker',

  // Rate Control
  'digoxin': 'rate_control',
  'diltiazem': 'rate_control',
  'verapamil': 'rate_control',
  'amiodarone': 'rate_control',

  // Diuretics
  'furosemide': 'diuretic',
  'lasix': 'diuretic',
  'bumetanide': 'diuretic',
  'hydrochlorothiazide': 'diuretic',
  'hctz': 'diuretic',
  'spironolactone': 'diuretic',
  'torsemide': 'diuretic',
  'metolazone': 'diuretic',

  // Sedating Medications
  'lorazepam': 'sedating',
  'ativan': 'sedating',
  'diazepam': 'sedating',
  'valium': 'sedating',
  'midazolam': 'sedating',
  'alprazolam': 'sedating',
  'xanax': 'sedating',
  'oxycodone': 'sedating',
  'hydrocodone': 'sedating',
  'morphine': 'sedating',
  'fentanyl': 'sedating',
  'hydromorphone': 'sedating',
  'dilaudid': 'sedating',
  'tramadol': 'sedating',
  'haloperidol': 'sedating',
  'haldol': 'sedating',
  'quetiapine': 'sedating',
  'seroquel': 'sedating',
  'olanzapine': 'sedating',
  'risperidone': 'sedating',
  'trazodone': 'sedating',
  'zolpidem': 'sedating',
  'ambien': 'sedating',

  // Insulin
  'insulin': 'insulin',
  'insulin glargine': 'insulin',
  'lantus': 'insulin',
  'insulin aspart': 'insulin',
  'novolog': 'insulin',
  'insulin lispro': 'insulin',
  'humalog': 'insulin',
  'insulin regular': 'insulin',
  'insulin nph': 'insulin',

  // Anticoagulants
  'warfarin': 'anticoagulant',
  'coumadin': 'anticoagulant',
  'apixaban': 'anticoagulant',
  'eliquis': 'anticoagulant',
  'rivaroxaban': 'anticoagulant',
  'xarelto': 'anticoagulant',
  'dabigatran': 'anticoagulant',
  'pradaxa': 'anticoagulant',
  'enoxaparin': 'anticoagulant',
  'lovenox': 'anticoagulant',
  'heparin': 'anticoagulant',

  // Antiparkinsonian
  'carbidopa': 'antiparkinsonian',
  'levodopa': 'antiparkinsonian',
  'carbidopa-levodopa': 'antiparkinsonian',
  'sinemet': 'antiparkinsonian',
  'pramipexole': 'antiparkinsonian',
  'mirapex': 'antiparkinsonian',
  'ropinirole': 'antiparkinsonian',
  'requip': 'antiparkinsonian'
};

/**
 * Default monitoring parameters by diagnosis category
 */
const MONITORING_BY_CATEGORY: Record<DiagnosisCategory, string[]> = {
  cardiac: [
    'Heart rate (target <100 bpm)',
    'Blood pressure (avoid drops >10 mmHg)',
    'SpO2',
    'Dyspnea score (0-10)',
    'Borg RPE (target 11-13)',
    'Signs of fluid overload'
  ],
  pulmonary: [
    'SpO2 (maintain >90%)',
    'Respiratory rate (<25/min)',
    'Dyspnea score (0-10)',
    'Heart rate',
    'Accessory muscle use',
    'Pursed lip breathing pattern'
  ],
  orthopedic: [
    'Pain level (0-10)',
    'Range of motion (degrees)',
    'Surgical site assessment',
    'Edema monitoring',
    'Blood pressure',
    'Total rotations completed'
  ],
  neurological: [
    'Blood pressure (avoid >180 mmHg)',
    'Bilateral pedaling symmetry',
    'Motor strength (affected vs unaffected)',
    'Cognitive participation',
    'Balance and trunk control',
    'New neurological symptoms'
  ],
  icu_recovery: [
    'Heart rate (strict limits)',
    'Blood pressure (watch for orthostatic changes)',
    'SpO2 (continuous)',
    'Respiratory rate',
    'Level of alertness',
    'Muscle activation quality',
    'Fatigue level (frequent checks)'
  ],
  delirium: [
    'Behavioral status',
    'Agitation level (0-10)',
    'Participation quality',
    'Safety throughout',
    'CAM score (before and after)',
    'Orientation assessment'
  ],
  frail_elderly: [
    'Heart rate',
    'Blood pressure (orthostatic)',
    'Balance and stability',
    'Fatigue level',
    'Pain assessment',
    'Engagement and mood',
    'Fall risk indicators'
  ],
  general: [
    'Heart rate',
    'Blood pressure',
    'Perceived exertion (RPE)',
    'SpO2',
    'Overall tolerance',
    'Lower extremity assessment'
  ]
};

/**
 * Stop criteria by diagnosis category
 */
const STOP_CRITERIA_BY_CATEGORY: Record<DiagnosisCategory, string[]> = {
  cardiac: [
    'HR >110 bpm or increase >20 bpm from rest',
    'SBP decrease >10 mmHg',
    'SpO2 <90%',
    'Dyspnea worsening >2 points',
    'Chest pain, dizziness, or palpitations',
    'New arrhythmia'
  ],
  pulmonary: [
    'SpO2 <88% or drop >4%',
    'RR >28/min',
    'HR >120 bpm',
    'Severe dyspnea (>7/10)',
    'Confusion or altered mental status',
    'Excessive accessory muscle use'
  ],
  orthopedic: [
    'Pain >6/10',
    'SBP <90 or >180 mmHg',
    'HR >120 bpm',
    'Significant increase in edema',
    'Signs of surgical complications',
    'Patient request'
  ],
  neurological: [
    'SBP >180 or <100 mmHg',
    'New neurological symptoms',
    'Severe headache',
    'Dizziness or visual changes',
    'Unable to participate safely',
    'Excessive spasticity'
  ],
  icu_recovery: [
    'HR >130 bpm or <50 bpm',
    'SBP >180 or <90 mmHg',
    'SpO2 <88%',
    'RR >30/min',
    'New arrhythmias',
    'Patient distress or excessive fatigue',
    'Any new symptoms'
  ],
  delirium: [
    'Increased agitation',
    'Patient distress',
    'Unsafe behaviors',
    'Confusion worsening',
    'Unable to follow simple instructions',
    'Staff determines unable to continue safely'
  ],
  frail_elderly: [
    'HR >110 bpm',
    'SBP instability (>20 mmHg change)',
    'Excessive fatigue',
    'Pain increase >2 points',
    'Balance concerns',
    'Patient requests stop',
    'Signs of confusion or distress'
  ],
  general: [
    'HR >120 bpm',
    'SBP <90 or >180 mmHg',
    'SpO2 <90%',
    'Chest pain or pressure',
    'Severe dyspnea',
    'Patient distress'
  ]
};

/**
 * Default RPM by mobility status (baseline for calculations)
 */
const BASELINE_RPM_BY_MOBILITY: Record<string, number> = {
  bedbound: 25,
  chair_bound: 30,
  standing_assist: 35,
  walking_assist: 40,
  independent: 45
};

/**
 * Convert watts to resistance level (1-9 scale for our device)
 * Based on 9-inch electromagnetic flywheel: 30-50 lbs force range
 * Power ≈ Force × RPM × constant
 */
function wattsToResistance(watts: number, rpm: number): number {
  // Simplified model: Power = k * Resistance * RPM
  // At baseline (resistance 5, ~35 RPM, ~37.5 lbs): ~35W
  // k ≈ 35 / (5 * 35) = 0.2
  const k = 0.2;
  const resistance = watts / (k * rpm);
  return Math.max(1, Math.min(9, Math.round(resistance)));
}

/**
 * Calculate power from resistance and RPM
 */
function calculatePower(resistance: number, rpm: number): number {
  const k = 0.2;
  return k * resistance * rpm;
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

  // ==========================================================================
  // NEW: PERSONALIZED PRESCRIPTION GENERATION
  // ==========================================================================

  /**
   * Generate a personalized mobility prescription using the patient goal calculator.
   *
   * This is the PRIMARY entry point for getting a patient's exercise prescription.
   * It replaces the score-based protocol matching with a calculation-based approach:
   *
   * 1. Uses the risk calculator to determine baseline energy target (watt-minutes)
   * 2. Determines diagnosis category from patient data
   * 3. Applies diagnosis-specific adjustments while maintaining total energy
   * 4. Returns complete prescription with safety parameters
   *
   * @param patientId - The patient to generate prescription for
   * @param overrides - Optional overrides for diagnosis or risk assessment input
   * @returns PersonalizedPrescription with all exercise parameters
   */
  async generatePersonalizedPrescription(
    patientId: number,
    overrides?: {
      diagnosis?: string;
      medications?: string[];
      riskAssessmentInput?: Partial<RiskAssessmentInput>;
    }
  ): Promise<PersonalizedPrescription | null> {
    try {
      // Step 1: Build risk assessment input from patient profile
      const riskInput = await this.buildRiskAssessmentInput(patientId, overrides?.riskAssessmentInput);
      if (!riskInput) {
        logger.warn('Could not build risk assessment input', { patientId });
        return null;
      }

      // Step 2: Calculate baseline prescription using the risk calculator
      const riskResults = calculateRisks(riskInput);
      const baselineRec = riskResults.mobility_recommendation;

      logger.info('Baseline prescription from risk calculator', {
        patientId,
        wattGoal: baselineRec.watt_goal,
        duration: baselineRec.duration_min_per_session,
        sessions: baselineRec.sessions_per_day,
        totalEnergy: baselineRec.total_daily_energy
      });

      // Step 3: Determine diagnosis category
      const diagnosis = overrides?.diagnosis || riskInput.admission_diagnosis || '';
      const diagnosisCategory = this.determineDiagnosisCategory(diagnosis, riskInput);

      // Step 4: Get adjustment profile for this category
      const adjustmentProfile = DIAGNOSIS_ADJUSTMENT_PROFILES[diagnosisCategory];

      // Step 5: Calculate adjusted parameters while maintaining total energy
      let adjustedPrescription = this.applyDiagnosisAdjustments(
        baselineRec,
        riskInput.mobility_status || 'standing_assist',
        adjustmentProfile
      );

      // Step 6: Get patient medications and determine medication categories
      const medications = overrides?.medications || await this.getPatientMedications(patientId);
      const medicationCategories = this.determineMedicationCategories(medications);
      const medicationAdjustments = this.applyMedicationAdjustments(
        adjustedPrescription,
        medicationCategories
      );

      // Apply medication adjustments to prescription
      adjustedPrescription = {
        ...adjustedPrescription,
        duration: medicationAdjustments.adjustedDuration,
        rpm: medicationAdjustments.adjustedRpm,
        rationale: [
          ...adjustedPrescription.rationale,
          ...medicationAdjustments.rationale
        ]
      };

      // Combine monitoring and stop criteria
      const combinedMonitoring = [
        ...MONITORING_BY_CATEGORY[diagnosisCategory],
        ...medicationAdjustments.additionalMonitoring
      ];
      const combinedStopCriteria = [
        ...STOP_CRITERIA_BY_CATEGORY[diagnosisCategory],
        ...medicationAdjustments.additionalStopCriteria
      ];

      // Step 7: Build complete prescription
      const prescription: PersonalizedPrescription = {
        // Core parameters (adjusted based on diagnosis AND medications)
        totalDailyEnergy: baselineRec.total_daily_energy || Math.round(baselineRec.watt_goal * baselineRec.duration_min_per_session * baselineRec.sessions_per_day),
        duration: adjustedPrescription.duration,
        sessionsPerDay: adjustedPrescription.sessions,
        targetPower: adjustedPrescription.power,
        resistance: adjustedPrescription.resistance,
        targetRpm: adjustedPrescription.rpm,

        // Diagnosis info
        diagnosisCategory,
        diagnosisCategoryLabel: DIAGNOSIS_CATEGORY_LABELS[diagnosisCategory],
        adjustmentRationale: [
          adjustmentProfile.rationale,
          ...adjustedPrescription.rationale
        ],

        // Medication info
        medicationCategories,
        medicationAdjustments: medicationAdjustments.rationale,

        // Safety parameters
        fallRisk: riskResults.falls.probability,
        deconditioningRisk: riskResults.deconditioning.probability,

        // Monitoring recommendations (combined from diagnosis and medications)
        monitoringParams: [...new Set(combinedMonitoring)], // Remove duplicates
        stopCriteria: [...new Set(combinedStopCriteria)],

        // Source info
        baselineFromRiskCalculator: true,
        patientId
      };

      logger.info('Generated personalized prescription', {
        patientId,
        diagnosisCategory,
        medicationCategories,
        totalEnergy: prescription.totalDailyEnergy,
        duration: prescription.duration,
        resistance: prescription.resistance,
        rpm: prescription.targetRpm
      });

      return prescription;

    } catch (error: any) {
      logger.error('Failed to generate personalized prescription', {
        error: error.message,
        patientId
      });
      return null;
    }
  }

  /**
   * Get patient medications from profile
   */
  private async getPatientMedications(patientId: number): Promise<string[]> {
    try {
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      if (!profile.length || !profile[0].medications) {
        return [];
      }

      return JSON.parse(profile[0].medications || '[]');
    } catch (error) {
      logger.warn('Failed to get patient medications', { patientId });
      return [];
    }
  }

  /**
   * Determine medication categories from medication list
   */
  private determineMedicationCategories(medications: string[]): MedicationCategory[] {
    const categories = new Set<MedicationCategory>();

    for (const med of medications) {
      const medLower = med.toLowerCase().trim();

      // Check each word in the medication name
      for (const [key, category] of Object.entries(MEDICATION_CATEGORY_MAP)) {
        if (medLower.includes(key.toLowerCase())) {
          categories.add(category);
          break;
        }
      }
    }

    // If no categories found, return 'none'
    return categories.size > 0 ? Array.from(categories) : ['none'];
  }

  /**
   * Apply medication-based adjustments to prescription
   */
  private applyMedicationAdjustments(
    prescription: {
      duration: number;
      sessions: number;
      power: number;
      resistance: number;
      rpm: number;
      rationale: string[];
    },
    medicationCategories: MedicationCategory[]
  ): {
    adjustedDuration: number;
    adjustedRpm: number;
    rationale: string[];
    additionalMonitoring: string[];
    additionalStopCriteria: string[];
  } {
    const rationale: string[] = [];
    const additionalMonitoring: string[] = [];
    const additionalStopCriteria: string[] = [];

    let adjustedDuration = prescription.duration;
    let adjustedRpm = prescription.rpm;
    let hasResistanceFocus = false;

    // Apply each medication category's adjustments
    for (const category of medicationCategories) {
      if (category === 'none') continue;

      const profile = MEDICATION_ADJUSTMENT_PROFILES[category];

      // Apply duration reduction
      if (profile.durationReduction > 0) {
        adjustedDuration = Math.max(5, adjustedDuration - profile.durationReduction);
      }

      // Apply RPM reduction
      if (profile.rpmReduction > 0) {
        adjustedRpm = Math.max(15, adjustedRpm - profile.rpmReduction);
      }

      // Track if we should focus on resistance
      if (profile.resistanceFocus) {
        hasResistanceFocus = true;
      }

      // Add rationale
      rationale.push(profile.rationale);

      // Add monitoring and stop criteria
      additionalMonitoring.push(...profile.additionalMonitoring);
      additionalStopCriteria.push(...profile.additionalStopCriteria);
    }

    // Add resistance focus note if applicable
    if (hasResistanceFocus) {
      rationale.push('Due to heart rate-affecting medications, focus on resistance/strength training rather than high RPM aerobic exercise.');
    }

    return {
      adjustedDuration,
      adjustedRpm,
      rationale,
      additionalMonitoring,
      additionalStopCriteria
    };
  }

  /**
   * Build risk assessment input from patient profile data
   */
  private async buildRiskAssessmentInput(
    patientId: number,
    overrides?: Partial<RiskAssessmentInput>
  ): Promise<RiskAssessmentInput | null> {
    try {
      // Get patient profile
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      if (!profile.length) {
        logger.warn('Patient profile not found for risk assessment', { patientId });
        return null;
      }

      const p = profile[0];

      // Get latest risk assessment if available (for additional data)
      const latestRiskAssessment = await db.select()
        .from(riskAssessments)
        .where(eq(riskAssessments.patientId, patientId))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(1);

      // Parse comorbidities
      const comorbidities = JSON.parse(p.comorbidities || '[]');

      // Build the risk assessment input
      const riskInput: RiskAssessmentInput = {
        age: p.age,
        sex: p.sex || 'unknown',
        mobility_status: p.mobilityStatus || 'standing_assist',
        cognitive_status: p.cognitiveStatus || 'normal',
        level_of_care: p.levelOfCare || 'ward',
        admission_diagnosis: p.admissionDiagnosis || '',
        baseline_function: p.baselineFunction || 'independent',
        comorbidities: comorbidities,
        medications: [],
        devices: [],
        weight_kg: p.weightKg || undefined,
        height_cm: p.heightCm || undefined,
        days_immobile: p.daysImmobile || 0,

        // Apply any overrides
        ...overrides
      };

      return riskInput;

    } catch (error: any) {
      logger.error('Failed to build risk assessment input', {
        error: error.message,
        patientId
      });
      return null;
    }
  }

  /**
   * Determine the diagnosis category based on diagnosis text and patient data
   */
  private determineDiagnosisCategory(
    diagnosis: string,
    riskInput: RiskAssessmentInput
  ): DiagnosisCategory {
    const diagLower = diagnosis.toLowerCase();

    // Check diagnosis text against our mapping
    for (const [key, category] of Object.entries(DIAGNOSIS_CATEGORY_MAP)) {
      if (diagLower.includes(key.toLowerCase())) {
        logger.debug('Matched diagnosis category', { diagnosis, matched: key, category });
        return category;
      }
    }

    // Check structured flags from risk input
    if (riskInput.is_cardiac_admission) return 'cardiac';
    if (riskInput.is_orthopedic) return 'orthopedic';
    if (riskInput.is_neuro_admission) return 'neurological';

    // Check admission diagnosis patterns
    const admitDiag = (riskInput.admission_diagnosis || '').toLowerCase();
    for (const [key, category] of Object.entries(DIAGNOSIS_CATEGORY_MAP)) {
      if (admitDiag.includes(key.toLowerCase())) {
        return category;
      }
    }

    // Default to general
    return 'general';
  }

  /**
   * Apply diagnosis-based adjustments while maintaining total energy target
   *
   * Key principle: Total Energy = Power × Duration × Sessions
   * Where Power ≈ k × Resistance × RPM
   *
   * When adjusting for diagnosis, we redistribute the same energy:
   * - Cardiac/Pulmonary: Higher resistance, lower RPM (same power, same energy)
   * - Orthopedic: Lower resistance, more rotations, longer duration (same energy)
   */
  private applyDiagnosisAdjustments(
    baseline: {
      watt_goal: number;
      duration_min_per_session: number;
      sessions_per_day: number;
      total_daily_energy?: number;
    },
    mobilityStatus: string,
    adjustmentProfile: DiagnosisAdjustmentProfile
  ): {
    duration: number;
    sessions: number;
    power: number;
    resistance: number;
    rpm: number;
    rationale: string[];
  } {
    const rationale: string[] = [];

    // Get baseline values
    const baselinePower = baseline.watt_goal;
    const baselineDuration = baseline.duration_min_per_session;
    const baselineSessions = baseline.sessions_per_day;
    const totalEnergy = baseline.total_daily_energy ||
      (baselinePower * baselineDuration * baselineSessions);

    // Get baseline RPM from mobility status
    const baselineRpm = BASELINE_RPM_BY_MOBILITY[mobilityStatus] || 35;

    // Calculate baseline resistance from power and RPM
    const baselineResistance = wattsToResistance(baselinePower, baselineRpm);

    // Apply adjustments
    const adjustedDuration = Math.round(baselineDuration * adjustmentProfile.durationMultiplier);
    const adjustedRpm = Math.round(baselineRpm * adjustmentProfile.rpmMultiplier);

    // Calculate adjusted resistance to maintain energy target
    // If duration changed, we need to adjust power per session to maintain total energy
    const adjustedSessions = baselineSessions; // Sessions stay the same

    // Energy per session with adjusted duration
    const targetEnergyPerSession = totalEnergy / adjustedSessions;
    const targetPower = targetEnergyPerSession / adjustedDuration;

    // Now calculate resistance from target power and adjusted RPM
    const adjustedResistance = wattsToResistance(targetPower, adjustedRpm);

    // Generate rationale
    if (adjustmentProfile.resistanceMultiplier > 1) {
      rationale.push(`Increased resistance to ${adjustedResistance} (from baseline ${baselineResistance}) for ${adjustmentProfile.category} conditioning`);
    } else if (adjustmentProfile.resistanceMultiplier < 1) {
      rationale.push(`Reduced resistance to ${adjustedResistance} (from baseline ${baselineResistance}) to prioritize range of motion`);
    }

    if (adjustmentProfile.rpmMultiplier < 1) {
      rationale.push(`Reduced target RPM to ${adjustedRpm} (from ${baselineRpm}) to minimize ${adjustmentProfile.category === 'cardiac' ? 'cardiac demand' : 'respiratory demand'}`);
    } else if (adjustmentProfile.rpmMultiplier > 1) {
      rationale.push(`Increased target RPM to ${adjustedRpm} (from ${baselineRpm}) for more joint rotations`);
    }

    if (adjustmentProfile.durationMultiplier > 1) {
      rationale.push(`Extended duration to ${adjustedDuration} min (from ${baselineDuration} min) for additional ${adjustmentProfile.category === 'orthopedic' ? 'range of motion work' : 'motor learning time'}`);
    }

    rationale.push(`Total daily energy target maintained at ${Math.round(totalEnergy)} watt-minutes`);

    // Verify energy conservation (should be approximately equal)
    const actualPower = calculatePower(adjustedResistance, adjustedRpm);
    const actualEnergy = actualPower * adjustedDuration * adjustedSessions;

    logger.debug('Energy calculation verification', {
      targetEnergy: totalEnergy,
      actualEnergy,
      difference: Math.abs(totalEnergy - actualEnergy),
      adjustedParams: { resistance: adjustedResistance, rpm: adjustedRpm, duration: adjustedDuration }
    });

    return {
      duration: adjustedDuration,
      sessions: adjustedSessions,
      power: Math.round(targetPower * 10) / 10,
      resistance: adjustedResistance,
      rpm: adjustedRpm,
      rationale
    };
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
