/**
 * Prescription Adjustments Module
 *
 * This module provides reusable diagnosis and medication adjustment logic
 * for calculating personalized exercise prescriptions.
 *
 * Used by:
 * - Risk Calculator (estimateWattGoalV2)
 * - Personalized Protocol Matcher
 * - Provider Goal Editor
 */

// ============================================================================
// TYPE DEFINITIONS
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
 * Diagnosis adjustment profile
 */
export interface DiagnosisAdjustmentProfile {
  category: DiagnosisCategory;
  resistanceMultiplier: number;
  rpmMultiplier: number;
  durationMultiplier: number;
  rationale: string;
}

/**
 * Medication adjustment profile
 */
export interface MedicationAdjustmentProfile {
  category: MedicationCategory;
  intensityMultiplier: number;
  resistanceFocus: boolean;
  rpmReduction: number;
  durationReduction: number;
  rationale: string;
  additionalMonitoring: string[];
  additionalStopCriteria: string[];
}

/**
 * Complete adjustment result
 */
export interface AdjustmentResult {
  // Adjusted parameters
  duration: number;
  power: number;
  resistance: number;
  rpm: number;
  sessionsPerDay: number;
  totalDailyEnergy: number;

  // Diagnosis info
  diagnosisCategory: DiagnosisCategory;
  diagnosisCategoryLabel: string;

  // Medication info
  medicationCategories: MedicationCategory[];

  // Rationale
  diagnosisRationale: string;
  medicationRationale: string[];
  allRationale: string[];

  // Monitoring
  monitoringParams: string[];
  stopCriteria: string[];

  // For showing delta from baseline
  adjustments: {
    durationDelta: number;
    powerDelta: number;
    resistanceDelta: number;
    rpmDelta: number;
  };
}

// ============================================================================
// DIAGNOSIS DROPDOWN OPTIONS
// Matching protocol-matching.tsx exactly
// ============================================================================

export const DIAGNOSIS_OPTIONS = [
  { value: 'Total Knee Arthroplasty', label: 'Total Knee Arthroplasty', category: 'orthopedic' as DiagnosisCategory },
  { value: 'Hip Fracture', label: 'Hip Fracture', category: 'orthopedic' as DiagnosisCategory },
  { value: 'Stroke/CVA', label: 'Stroke/CVA', category: 'neurological' as DiagnosisCategory },
  { value: 'COPD Exacerbation', label: 'COPD Exacerbation', category: 'pulmonary' as DiagnosisCategory },
  { value: 'Heart Failure', label: 'Heart Failure', category: 'cardiac' as DiagnosisCategory },
  { value: 'ICU Stay/Critical Illness', label: 'ICU Stay/Critical Illness', category: 'icu_recovery' as DiagnosisCategory },
  { value: 'Delirium/Confusion', label: 'Delirium/Confusion', category: 'delirium' as DiagnosisCategory },
  { value: 'Frail Elderly (75+)', label: 'Frail Elderly (75+)', category: 'frail_elderly' as DiagnosisCategory },
  { value: 'General Medical/Surgical', label: 'General Medical/Surgical', category: 'general' as DiagnosisCategory },
  { value: 'Other', label: 'Other', category: 'general' as DiagnosisCategory },
] as const;

// ============================================================================
// MEDICATION DROPDOWN OPTIONS
// Matching medication-safety.tsx exactly
// ============================================================================

export const MEDICATION_OPTIONS = [
  { value: 'Metoprolol', label: 'Metoprolol', category: 'beta_blocker' as MedicationCategory },
  { value: 'Atenolol', label: 'Atenolol', category: 'beta_blocker' as MedicationCategory },
  { value: 'Carvedilol', label: 'Carvedilol', category: 'beta_blocker' as MedicationCategory },
  { value: 'Warfarin', label: 'Warfarin', category: 'anticoagulant' as MedicationCategory },
  { value: 'Apixaban', label: 'Apixaban (Eliquis)', category: 'anticoagulant' as MedicationCategory },
  { value: 'Rivaroxaban', label: 'Rivaroxaban (Xarelto)', category: 'anticoagulant' as MedicationCategory },
  { value: 'Enoxaparin', label: 'Enoxaparin (Lovenox)', category: 'anticoagulant' as MedicationCategory },
  { value: 'Heparin', label: 'Heparin', category: 'anticoagulant' as MedicationCategory },
  { value: 'Lisinopril', label: 'Lisinopril', category: 'none' as MedicationCategory },
  { value: 'Losartan', label: 'Losartan', category: 'none' as MedicationCategory },
  { value: 'Amlodipine', label: 'Amlodipine', category: 'none' as MedicationCategory },
  { value: 'Metformin', label: 'Metformin', category: 'none' as MedicationCategory },
  { value: 'Insulin', label: 'Insulin (any type)', category: 'insulin' as MedicationCategory },
  { value: 'Furosemide', label: 'Furosemide (Lasix)', category: 'diuretic' as MedicationCategory },
  { value: 'Spironolactone', label: 'Spironolactone', category: 'diuretic' as MedicationCategory },
  { value: 'Hydrochlorothiazide', label: 'Hydrochlorothiazide', category: 'diuretic' as MedicationCategory },
  { value: 'Oxycodone', label: 'Oxycodone', category: 'sedating' as MedicationCategory },
  { value: 'Hydrocodone', label: 'Hydrocodone', category: 'sedating' as MedicationCategory },
  { value: 'Morphine', label: 'Morphine', category: 'sedating' as MedicationCategory },
  { value: 'Tramadol', label: 'Tramadol', category: 'sedating' as MedicationCategory },
  { value: 'Lorazepam', label: 'Lorazepam (Ativan)', category: 'sedating' as MedicationCategory },
  { value: 'Diazepam', label: 'Diazepam (Valium)', category: 'sedating' as MedicationCategory },
  { value: 'Alprazolam', label: 'Alprazolam (Xanax)', category: 'sedating' as MedicationCategory },
  { value: 'Zolpidem', label: 'Zolpidem (Ambien)', category: 'sedating' as MedicationCategory },
  { value: 'Quetiapine', label: 'Quetiapine (Seroquel)', category: 'sedating' as MedicationCategory },
  { value: 'Haloperidol', label: 'Haloperidol (Haldol)', category: 'sedating' as MedicationCategory },
  { value: 'Carbidopa-Levodopa', label: 'Carbidopa-Levodopa (Sinemet)', category: 'antiparkinsonian' as MedicationCategory },
  { value: 'Pramipexole', label: 'Pramipexole (Mirapex)', category: 'antiparkinsonian' as MedicationCategory },
  { value: 'Digoxin', label: 'Digoxin', category: 'rate_control' as MedicationCategory },
  { value: 'Diltiazem', label: 'Diltiazem', category: 'rate_control' as MedicationCategory },
  { value: 'Verapamil', label: 'Verapamil', category: 'rate_control' as MedicationCategory },
  { value: 'Atorvastatin', label: 'Atorvastatin', category: 'none' as MedicationCategory },
  { value: 'Other', label: 'Other (specify)', category: 'none' as MedicationCategory },
] as const;

// ============================================================================
// DIAGNOSIS ADJUSTMENT PROFILES
// ============================================================================

export const DIAGNOSIS_ADJUSTMENT_PROFILES: Record<DiagnosisCategory, DiagnosisAdjustmentProfile> = {
  cardiac: {
    category: 'cardiac',
    resistanceMultiplier: 1.25,
    rpmMultiplier: 0.80,
    durationMultiplier: 1.0,
    rationale: 'Higher resistance with controlled RPM reduces cardiac stress while maintaining muscle conditioning'
  },
  pulmonary: {
    category: 'pulmonary',
    resistanceMultiplier: 1.20,
    rpmMultiplier: 0.85,
    durationMultiplier: 1.0,
    rationale: 'Higher resistance with slower pedaling minimizes respiratory demand while preserving muscle work'
  },
  orthopedic: {
    category: 'orthopedic',
    resistanceMultiplier: 0.70,
    rpmMultiplier: 1.15,
    durationMultiplier: 1.25,
    rationale: 'Lower resistance with more rotations maximizes joint ROM and reduces surgical site stress'
  },
  neurological: {
    category: 'neurological',
    resistanceMultiplier: 0.90,
    rpmMultiplier: 0.95,
    durationMultiplier: 1.15,
    rationale: 'Moderate resistance with controlled pace supports bilateral coordination and motor relearning'
  },
  icu_recovery: {
    category: 'icu_recovery',
    resistanceMultiplier: 0.60,
    rpmMultiplier: 0.70,
    durationMultiplier: 0.75,
    rationale: 'Very gentle parameters for post-ICU reconditioning with progressive increase as tolerated'
  },
  delirium: {
    category: 'delirium',
    resistanceMultiplier: 0.75,
    rpmMultiplier: 0.80,
    durationMultiplier: 0.70,
    rationale: 'Simplified, shorter sessions with consistent parameters to provide structured activity safely'
  },
  frail_elderly: {
    category: 'frail_elderly',
    resistanceMultiplier: 0.65,
    rpmMultiplier: 0.75,
    durationMultiplier: 0.80,
    rationale: 'Low-intensity approach prioritizing safety and fall prevention over conditioning intensity'
  },
  general: {
    category: 'general',
    resistanceMultiplier: 1.0,
    rpmMultiplier: 1.0,
    durationMultiplier: 1.0,
    rationale: 'No diagnosis-specific adjustments recommended. Using evidence-based baseline prescription.'
  }
};

// ============================================================================
// MEDICATION ADJUSTMENT PROFILES
// ============================================================================

export const MEDICATION_ADJUSTMENT_PROFILES: Record<MedicationCategory, MedicationAdjustmentProfile> = {
  beta_blocker: {
    category: 'beta_blocker',
    intensityMultiplier: 0.90,
    resistanceFocus: true,
    rpmReduction: 5,
    durationReduction: 0,
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
  rate_control: {
    category: 'rate_control',
    intensityMultiplier: 0.85,
    resistanceFocus: true,
    rpmReduction: 8,
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
  diuretic: {
    category: 'diuretic',
    intensityMultiplier: 0.90,
    resistanceFocus: false,
    rpmReduction: 0,
    durationReduction: 2,
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
  sedating: {
    category: 'sedating',
    intensityMultiplier: 0.75,
    resistanceFocus: false,
    rpmReduction: 5,
    durationReduction: 3,
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
  insulin: {
    category: 'insulin',
    intensityMultiplier: 0.95,
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
  anticoagulant: {
    category: 'anticoagulant',
    intensityMultiplier: 1.0,
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
  antiparkinsonian: {
    category: 'antiparkinsonian',
    intensityMultiplier: 0.90,
    resistanceFocus: false,
    rpmReduction: 3,
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

// ============================================================================
// DIAGNOSIS CATEGORY LABELS
// ============================================================================

export const DIAGNOSIS_CATEGORY_LABELS: Record<DiagnosisCategory, string> = {
  cardiac: 'Cardiac (Heart Failure/CHF)',
  pulmonary: 'Pulmonary (COPD/Respiratory)',
  orthopedic: 'Orthopedic (Joint Replacement/Fracture)',
  neurological: 'Neurological (Stroke/CVA)',
  icu_recovery: 'ICU Recovery/Critical Illness',
  delirium: 'Delirium/Confusion',
  frail_elderly: 'Frail Elderly',
  general: 'General Medical/Surgical'
};

// ============================================================================
// MONITORING PARAMETERS BY DIAGNOSIS
// ============================================================================

export const MONITORING_BY_CATEGORY: Record<DiagnosisCategory, string[]> = {
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

// ============================================================================
// STOP CRITERIA BY DIAGNOSIS
// ============================================================================

export const STOP_CRITERIA_BY_CATEGORY: Record<DiagnosisCategory, string[]> = {
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

// ============================================================================
// BASELINE RPM BY MOBILITY STATUS
// ============================================================================

export const BASELINE_RPM_BY_MOBILITY: Record<string, number> = {
  bedbound: 25,
  chair_bound: 30,
  standing_assist: 35,
  walking_assist: 40,
  independent: 45
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert watts to resistance level (1-9 scale)
 */
export function wattsToResistance(watts: number, rpm: number): number {
  const k = 0.2;
  const resistance = watts / (k * rpm);
  return Math.max(1, Math.min(9, Math.round(resistance)));
}

/**
 * Calculate power from resistance and RPM
 */
export function calculatePower(resistance: number, rpm: number): number {
  const k = 0.2;
  return k * resistance * rpm;
}

/**
 * Determine diagnosis category from diagnosis string
 */
export function determineDiagnosisCategory(diagnosis: string): DiagnosisCategory {
  const diagLower = diagnosis.toLowerCase();

  // Direct mapping from dropdown options
  const directMappings: Record<string, DiagnosisCategory> = {
    'total knee arthroplasty': 'orthopedic',
    'hip fracture': 'orthopedic',
    'stroke/cva': 'neurological',
    'copd exacerbation': 'pulmonary',
    'heart failure': 'cardiac',
    'icu stay/critical illness': 'icu_recovery',
    'delirium/confusion': 'delirium',
    'frail elderly (75+)': 'frail_elderly',
    'general medical/surgical': 'general',
    'other': 'general'
  };

  for (const [key, category] of Object.entries(directMappings)) {
    if (diagLower.includes(key)) {
      return category;
    }
  }

  // Extended keyword matching
  const keywordMappings: Record<string, DiagnosisCategory> = {
    // Cardiac
    'heart failure': 'cardiac', 'chf': 'cardiac', 'cardiac': 'cardiac',
    'cardiomyopathy': 'cardiac', 'atrial fibrillation': 'cardiac',
    // Pulmonary
    'copd': 'pulmonary', 'pneumonia': 'pulmonary', 'respiratory': 'pulmonary',
    'asthma': 'pulmonary',
    // Orthopedic
    'knee': 'orthopedic', 'hip': 'orthopedic', 'arthroplasty': 'orthopedic',
    'fracture': 'orthopedic', 'orif': 'orthopedic', 'joint': 'orthopedic',
    // Neurological
    'stroke': 'neurological', 'cva': 'neurological', 'tbi': 'neurological',
    'hemiplegia': 'neurological',
    // ICU
    'icu': 'icu_recovery', 'critical illness': 'icu_recovery', 'sepsis': 'icu_recovery',
    'ventilator': 'icu_recovery',
    // Delirium
    'delirium': 'delirium', 'confusion': 'delirium', 'encephalopathy': 'delirium',
    // Frail elderly
    'frail': 'frail_elderly', 'debility': 'frail_elderly', 'failure to thrive': 'frail_elderly'
  };

  for (const [key, category] of Object.entries(keywordMappings)) {
    if (diagLower.includes(key)) {
      return category;
    }
  }

  return 'general';
}

/**
 * Determine medication categories from medication list
 */
export function determineMedicationCategories(medications: string[]): MedicationCategory[] {
  const categories = new Set<MedicationCategory>();

  // Map specific medications to categories
  const medicationMap: Record<string, MedicationCategory> = {
    // Beta Blockers
    'metoprolol': 'beta_blocker', 'atenolol': 'beta_blocker',
    'carvedilol': 'beta_blocker', 'propranolol': 'beta_blocker',
    // Rate Control
    'digoxin': 'rate_control', 'diltiazem': 'rate_control', 'verapamil': 'rate_control',
    // Diuretics
    'furosemide': 'diuretic', 'lasix': 'diuretic', 'spironolactone': 'diuretic',
    'hydrochlorothiazide': 'diuretic', 'bumetanide': 'diuretic',
    // Sedating
    'oxycodone': 'sedating', 'hydrocodone': 'sedating', 'morphine': 'sedating',
    'fentanyl': 'sedating', 'tramadol': 'sedating',
    'lorazepam': 'sedating', 'ativan': 'sedating', 'diazepam': 'sedating',
    'valium': 'sedating', 'alprazolam': 'sedating', 'xanax': 'sedating',
    'zolpidem': 'sedating', 'ambien': 'sedating',
    'quetiapine': 'sedating', 'seroquel': 'sedating',
    'haloperidol': 'sedating', 'haldol': 'sedating',
    // Insulin
    'insulin': 'insulin',
    // Anticoagulants
    'warfarin': 'anticoagulant', 'coumadin': 'anticoagulant',
    'apixaban': 'anticoagulant', 'eliquis': 'anticoagulant',
    'rivaroxaban': 'anticoagulant', 'xarelto': 'anticoagulant',
    'enoxaparin': 'anticoagulant', 'lovenox': 'anticoagulant',
    'heparin': 'anticoagulant',
    // Antiparkinsonian
    'carbidopa': 'antiparkinsonian', 'levodopa': 'antiparkinsonian',
    'sinemet': 'antiparkinsonian', 'pramipexole': 'antiparkinsonian',
    'mirapex': 'antiparkinsonian', 'ropinirole': 'antiparkinsonian'
  };

  for (const med of medications) {
    const medLower = med.toLowerCase().trim();
    for (const [key, category] of Object.entries(medicationMap)) {
      if (medLower.includes(key)) {
        categories.add(category);
        break;
      }
    }
  }

  return categories.size > 0 ? Array.from(categories) : ['none'];
}

/**
 * Apply diagnosis and medication adjustments to baseline prescription
 */
export function applyPrescriptionAdjustments(
  baseline: {
    watt_goal: number;
    duration_min_per_session: number;
    sessions_per_day: number;
    resistance_level?: number;
  },
  diagnosis: string,
  medications: string[],
  mobilityStatus: string = 'standing_assist'
): AdjustmentResult {
  // Determine categories
  const diagnosisCategory = determineDiagnosisCategory(diagnosis);
  const medicationCategories = determineMedicationCategories(medications);

  // Get profiles
  const diagProfile = DIAGNOSIS_ADJUSTMENT_PROFILES[diagnosisCategory];
  const medProfiles = medicationCategories.map(c => MEDICATION_ADJUSTMENT_PROFILES[c]);

  // Baseline values
  const baselinePower = baseline.watt_goal;
  const baselineDuration = baseline.duration_min_per_session;
  const baselineSessions = baseline.sessions_per_day;
  const baselineRpm = BASELINE_RPM_BY_MOBILITY[mobilityStatus] || 35;
  const baselineResistance = baseline.resistance_level || wattsToResistance(baselinePower, baselineRpm);
  const totalEnergy = baselinePower * baselineDuration * baselineSessions;

  // Apply diagnosis adjustments
  let adjustedDuration = Math.round(baselineDuration * diagProfile.durationMultiplier);
  let adjustedRpm = Math.round(baselineRpm * diagProfile.rpmMultiplier);

  // Calculate adjusted power to maintain total energy with new duration
  const targetEnergyPerSession = totalEnergy / baselineSessions;
  let adjustedPower = targetEnergyPerSession / adjustedDuration;
  let adjustedResistance = wattsToResistance(adjustedPower, adjustedRpm);

  // Collect rationale
  const diagnosisRationale = diagProfile.rationale;
  const medicationRationale: string[] = [];
  const allRationale: string[] = [diagProfile.rationale];
  const additionalMonitoring: string[] = [];
  const additionalStopCriteria: string[] = [];

  // Apply medication adjustments (additive to diagnosis)
  let hasResistanceFocus = false;
  for (const medProfile of medProfiles) {
    if (medProfile.category === 'none') continue;

    if (medProfile.durationReduction > 0) {
      adjustedDuration = Math.max(5, adjustedDuration - medProfile.durationReduction);
    }
    if (medProfile.rpmReduction > 0) {
      adjustedRpm = Math.max(15, adjustedRpm - medProfile.rpmReduction);
    }
    if (medProfile.resistanceFocus) {
      hasResistanceFocus = true;
    }

    medicationRationale.push(medProfile.rationale);
    allRationale.push(medProfile.rationale);
    additionalMonitoring.push(...medProfile.additionalMonitoring);
    additionalStopCriteria.push(...medProfile.additionalStopCriteria);
  }

  if (hasResistanceFocus) {
    const focusNote = 'Focus on resistance/strength training rather than high RPM aerobic exercise due to heart rate-affecting medications.';
    medicationRationale.push(focusNote);
    allRationale.push(focusNote);
  }

  // Recalculate power after medication adjustments to maintain energy
  adjustedPower = targetEnergyPerSession / adjustedDuration;
  adjustedResistance = wattsToResistance(adjustedPower, adjustedRpm);

  // Clamp values to safe ranges
  adjustedDuration = Math.max(5, Math.min(30, adjustedDuration));
  adjustedResistance = Math.max(1, Math.min(6, adjustedResistance));
  adjustedRpm = Math.max(15, Math.min(60, adjustedRpm));
  adjustedPower = Math.max(20, Math.min(70, adjustedPower));

  // Combine monitoring params
  const monitoringParams = [
    ...MONITORING_BY_CATEGORY[diagnosisCategory],
    ...additionalMonitoring
  ];
  const stopCriteria = [
    ...STOP_CRITERIA_BY_CATEGORY[diagnosisCategory],
    ...additionalStopCriteria
  ];

  return {
    duration: adjustedDuration,
    power: Math.round(adjustedPower * 10) / 10,
    resistance: adjustedResistance,
    rpm: adjustedRpm,
    sessionsPerDay: baselineSessions,
    totalDailyEnergy: Math.round(adjustedPower * adjustedDuration * baselineSessions),

    diagnosisCategory,
    diagnosisCategoryLabel: DIAGNOSIS_CATEGORY_LABELS[diagnosisCategory],

    medicationCategories,

    diagnosisRationale,
    medicationRationale,
    allRationale: [...new Set(allRationale)],

    monitoringParams: [...new Set(monitoringParams)],
    stopCriteria: [...new Set(stopCriteria)],

    adjustments: {
      durationDelta: adjustedDuration - baselineDuration,
      powerDelta: Math.round((adjustedPower - baselinePower) * 10) / 10,
      resistanceDelta: adjustedResistance - baselineResistance,
      rpmDelta: adjustedRpm - baselineRpm
    }
  };
}
