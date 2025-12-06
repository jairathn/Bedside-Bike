/**
 * Medication Safety Engine
 *
 * Patent Feature 11.2: Medication Interaction Alert System
 * Patent Feature 11.3: Contraindication Verification System
 *
 * 11.2 Medication Interaction Alert System - Novel Aspects:
 * - Medication timing correlation with performance
 * - Drug class-specific monitoring:
 *   - Beta-blockers: Monitor for excessive heart rate suppression
 *   - Diuretics: Monitor for dehydration effects
 *   - Sedatives: Monitor for coordination issues
 * - Clinician alert with recommendation to review medication
 * - Automatic goal adjustment if medication with interaction is modified
 *
 * 11.3 Contraindication Verification System - Novel Aspects:
 * - Contraindication database integration:
 *   - Absolute contraindications (immediate stop)
 *   - Relative contraindications (modified parameters)
 *   - Temporal contraindications (surgery recovery period)
 * - Real-time verification before each session
 * - Alert hierarchy: Critical (lock device), Warning, Caution
 * - Provider override with documentation
 *
 * Safety Features: Pharmacovigilance through exercise monitoring
 */

import { db } from '../db';
import {
  medicationInteractions,
  contraindicationVerifications,
  patientProfiles,
  patientGoals,
  exerciseSessions,
  alerts,
  users
} from '@shared/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { logger } from '../logger';
import type {
  MedicationClass,
  MedicationEffect,
  MedicationInteractionAlert,
  ContraindicationType,
  ContraindicationAction,
  ContraindicationCheck,
  ContraindicationRule
} from './types';

// ============================================================================
// MEDICATION DATABASE
// ============================================================================

/**
 * Medication classifications and expected exercise effects
 */
const MEDICATION_EFFECTS: Record<MedicationClass, MedicationEffect> = {
  beta_blocker: {
    medicationClass: 'beta_blocker',
    expectedEffects: {
      heartRateImpact: 'suppressed',
      bloodPressureImpact: 'lowered',
      coordinationImpact: 'normal',
      fatigueImpact: 'increased'
    },
    exerciseConsiderations: [
      'Heart rate will not be reliable indicator of exertion',
      'May experience earlier fatigue onset',
      'Monitor for dizziness or lightheadedness',
      'Use perceived exertion (RPE) instead of HR targets'
    ],
    goalAdjustments: [
      { parameter: 'power', adjustment: -15, reason: 'Beta-blocker reduces exercise capacity' },
      { parameter: 'duration', adjustment: -10, reason: 'Earlier fatigue expected' }
    ]
  },

  diuretic: {
    medicationClass: 'diuretic',
    expectedEffects: {
      heartRateImpact: 'normal',
      bloodPressureImpact: 'lowered',
      coordinationImpact: 'normal',
      fatigueImpact: 'increased'
    },
    exerciseConsiderations: [
      'Ensure adequate hydration before exercise',
      'Monitor for signs of dehydration (dizziness, cramping)',
      'Electrolyte imbalance may affect performance',
      'Avoid exercise during peak diuretic effect (2-4 hours post-dose)'
    ],
    goalAdjustments: [
      { parameter: 'duration', adjustment: -10, reason: 'Dehydration risk with prolonged exercise' }
    ]
  },

  sedative: {
    medicationClass: 'sedative',
    expectedEffects: {
      heartRateImpact: 'normal',
      bloodPressureImpact: 'lowered',
      coordinationImpact: 'impaired',
      fatigueImpact: 'increased'
    },
    exerciseConsiderations: [
      'Increased fall risk due to sedation',
      'Delayed reaction times',
      'Monitor for excessive drowsiness',
      'Coordination may be impaired',
      'Consider lower resistance levels'
    ],
    goalAdjustments: [
      { parameter: 'resistance', adjustment: -20, reason: 'Safety due to sedation effects' },
      { parameter: 'duration', adjustment: -15, reason: 'Coordination concerns' }
    ]
  },

  opioid: {
    medicationClass: 'opioid',
    expectedEffects: {
      heartRateImpact: 'suppressed',
      bloodPressureImpact: 'lowered',
      coordinationImpact: 'impaired',
      fatigueImpact: 'increased'
    },
    exerciseConsiderations: [
      'Respiratory depression risk during exertion',
      'Sedation effects similar to sedatives',
      'Monitor for nausea during exercise',
      'Avoid exercise at peak opioid effect (1-2 hours post-dose)'
    ],
    goalAdjustments: [
      { parameter: 'resistance', adjustment: -25, reason: 'Safety due to opioid effects' },
      { parameter: 'power', adjustment: -20, reason: 'Respiratory concerns' }
    ]
  },

  anticoagulant: {
    medicationClass: 'anticoagulant',
    expectedEffects: {
      heartRateImpact: 'normal',
      bloodPressureImpact: 'normal',
      coordinationImpact: 'normal',
      fatigueImpact: 'normal'
    },
    exerciseConsiderations: [
      'Exercise is generally safe and encouraged for VTE prevention',
      'Avoid high-impact activities (not applicable for bike)',
      'Monitor for unusual bruising',
      'Beneficial for circulation'
    ],
    goalAdjustments: []  // No adjustments needed
  },

  steroid: {
    medicationClass: 'steroid',
    expectedEffects: {
      heartRateImpact: 'elevated',
      bloodPressureImpact: 'elevated',
      coordinationImpact: 'normal',
      fatigueImpact: 'decreased'  // May feel stronger
    },
    exerciseConsiderations: [
      'May have increased energy initially',
      'Long-term use causes muscle weakness',
      'Monitor blood pressure during exercise',
      'Increased infection risk - ensure clean equipment'
    ],
    goalAdjustments: [
      { parameter: 'power', adjustment: -10, reason: 'Steroid-induced myopathy risk' }
    ]
  },

  antihypertensive: {
    medicationClass: 'antihypertensive',
    expectedEffects: {
      heartRateImpact: 'normal',
      bloodPressureImpact: 'lowered',
      coordinationImpact: 'normal',
      fatigueImpact: 'normal'
    },
    exerciseConsiderations: [
      'Monitor for orthostatic hypotension when changing positions',
      'Avoid sudden position changes after exercise',
      'Stay hydrated',
      'Exercise is beneficial for blood pressure management'
    ],
    goalAdjustments: []
  },

  cardiac_glycoside: {
    medicationClass: 'cardiac_glycoside',
    expectedEffects: {
      heartRateImpact: 'suppressed',
      bloodPressureImpact: 'normal',
      coordinationImpact: 'normal',
      fatigueImpact: 'normal'
    },
    exerciseConsiderations: [
      'Heart rate controlled by medication',
      'Monitor for signs of toxicity (nausea, visual changes)',
      'Exercise at moderate intensity only',
      'Avoid dehydration which can increase toxicity'
    ],
    goalAdjustments: [
      { parameter: 'power', adjustment: -15, reason: 'Cardiac glycoside requires moderate intensity' }
    ]
  },

  bronchodilator: {
    medicationClass: 'bronchodilator',
    expectedEffects: {
      heartRateImpact: 'elevated',
      bloodPressureImpact: 'normal',
      coordinationImpact: 'normal',
      fatigueImpact: 'decreased'
    },
    exerciseConsiderations: [
      'May experience tremor or jitteriness',
      'Heart rate may be elevated',
      'Exercise beneficial for respiratory conditioning',
      'Use rescue inhaler if needed before exercise'
    ],
    goalAdjustments: []
  },

  other: {
    medicationClass: 'other',
    expectedEffects: {
      heartRateImpact: 'normal',
      bloodPressureImpact: 'normal',
      coordinationImpact: 'normal',
      fatigueImpact: 'normal'
    },
    exerciseConsiderations: [],
    goalAdjustments: []
  }
};

/**
 * Medication name to class mapping
 */
const MEDICATION_CLASSIFICATIONS: Record<string, MedicationClass> = {
  // Beta blockers
  'metoprolol': 'beta_blocker',
  'atenolol': 'beta_blocker',
  'propranolol': 'beta_blocker',
  'carvedilol': 'beta_blocker',
  'bisoprolol': 'beta_blocker',
  'labetalol': 'beta_blocker',

  // Diuretics
  'furosemide': 'diuretic',
  'lasix': 'diuretic',
  'hydrochlorothiazide': 'diuretic',
  'hctz': 'diuretic',
  'spironolactone': 'diuretic',
  'bumetanide': 'diuretic',
  'torsemide': 'diuretic',

  // Sedatives/Anxiolytics
  'lorazepam': 'sedative',
  'ativan': 'sedative',
  'diazepam': 'sedative',
  'valium': 'sedative',
  'alprazolam': 'sedative',
  'xanax': 'sedative',
  'midazolam': 'sedative',
  'zolpidem': 'sedative',
  'ambien': 'sedative',
  'quetiapine': 'sedative',
  'seroquel': 'sedative',
  'trazodone': 'sedative',

  // Opioids
  'morphine': 'opioid',
  'hydromorphone': 'opioid',
  'dilaudid': 'opioid',
  'oxycodone': 'opioid',
  'fentanyl': 'opioid',
  'tramadol': 'opioid',
  'hydrocodone': 'opioid',
  'methadone': 'opioid',

  // Anticoagulants
  'heparin': 'anticoagulant',
  'enoxaparin': 'anticoagulant',
  'lovenox': 'anticoagulant',
  'warfarin': 'anticoagulant',
  'coumadin': 'anticoagulant',
  'apixaban': 'anticoagulant',
  'eliquis': 'anticoagulant',
  'rivaroxaban': 'anticoagulant',
  'xarelto': 'anticoagulant',
  'dabigatran': 'anticoagulant',
  'pradaxa': 'anticoagulant',

  // Steroids
  'prednisone': 'steroid',
  'methylprednisolone': 'steroid',
  'solumedrol': 'steroid',
  'dexamethasone': 'steroid',
  'hydrocortisone': 'steroid',

  // Antihypertensives
  'lisinopril': 'antihypertensive',
  'amlodipine': 'antihypertensive',
  'losartan': 'antihypertensive',
  'valsartan': 'antihypertensive',
  'hydralazine': 'antihypertensive',

  // Cardiac glycosides
  'digoxin': 'cardiac_glycoside',
  'lanoxin': 'cardiac_glycoside',

  // Bronchodilators
  'albuterol': 'bronchodilator',
  'proventil': 'bronchodilator',
  'ventolin': 'bronchodilator',
  'ipratropium': 'bronchodilator',
  'atrovent': 'bronchodilator'
};

// ============================================================================
// CONTRAINDICATION RULES
// ============================================================================

const CONTRAINDICATION_RULES: ContraindicationRule[] = [
  // ABSOLUTE CONTRAINDICATIONS (device should be locked)
  {
    id: 'unstable_angina',
    name: 'Unstable Angina',
    type: 'absolute',
    conditions: [
      { field: 'admissionDiagnosis', operator: 'contains', value: 'unstable angina' }
    ],
    action: 'device_locked',
    alertPriority: 'critical',
    message: 'ABSOLUTE CONTRAINDICATION: Unstable angina. No exercise until medically cleared.'
  },
  {
    id: 'acute_mi',
    name: 'Acute Myocardial Infarction (<48h)',
    type: 'absolute',
    conditions: [
      { field: 'admissionDiagnosis', operator: 'contains', value: 'myocardial infarction' },
      { field: 'admissionDate', operator: 'within_days', value: 2 }
    ],
    action: 'device_locked',
    alertPriority: 'critical',
    message: 'ABSOLUTE CONTRAINDICATION: Acute MI within 48 hours. No exercise.'
  },
  {
    id: 'uncontrolled_arrhythmia',
    name: 'Uncontrolled Arrhythmia',
    type: 'absolute',
    conditions: [
      { field: 'comorbidities', operator: 'contains', value: 'uncontrolled arrhythmia' }
    ],
    action: 'device_locked',
    alertPriority: 'critical',
    message: 'ABSOLUTE CONTRAINDICATION: Uncontrolled arrhythmia. Requires cardiology clearance.'
  },
  {
    id: 'acute_pe',
    name: 'Acute Pulmonary Embolism',
    type: 'absolute',
    conditions: [
      { field: 'admissionDiagnosis', operator: 'contains', value: 'pulmonary embolism' },
      { field: 'admissionDate', operator: 'within_days', value: 3 }
    ],
    action: 'device_locked',
    alertPriority: 'critical',
    message: 'ABSOLUTE CONTRAINDICATION: Acute PE. No lower extremity exercise until anticoagulated and stable.'
  },
  {
    id: 'acute_dvt',
    name: 'Acute Deep Vein Thrombosis',
    type: 'absolute',
    conditions: [
      { field: 'comorbidities', operator: 'contains', value: 'dvt' },
      { field: 'admissionDate', operator: 'within_days', value: 5 }
    ],
    action: 'device_locked',
    alertPriority: 'critical',
    message: 'ABSOLUTE CONTRAINDICATION: Acute DVT. Requires anticoagulation before exercise.'
  },
  {
    id: 'active_bleeding',
    name: 'Active Bleeding',
    type: 'absolute',
    conditions: [
      { field: 'comorbidities', operator: 'contains', value: 'active bleeding' }
    ],
    action: 'device_locked',
    alertPriority: 'critical',
    message: 'ABSOLUTE CONTRAINDICATION: Active bleeding. No exercise until hemodynamically stable.'
  },

  // RELATIVE CONTRAINDICATIONS (modified parameters)
  {
    id: 'hypertension_uncontrolled',
    name: 'Uncontrolled Hypertension',
    type: 'relative',
    conditions: [
      { field: 'comorbidities', operator: 'contains', value: 'uncontrolled hypertension' }
    ],
    action: 'parameters_modified',
    alertPriority: 'warning',
    message: 'RELATIVE CONTRAINDICATION: Uncontrolled hypertension. Reduce intensity by 30%.'
  },
  {
    id: 'heart_failure_decompensated',
    name: 'Decompensated Heart Failure',
    type: 'relative',
    conditions: [
      { field: 'admissionDiagnosis', operator: 'contains', value: 'heart failure' },
      { field: 'levelOfCare', operator: 'equals', value: 'icu' }
    ],
    action: 'parameters_modified',
    alertPriority: 'warning',
    message: 'RELATIVE CONTRAINDICATION: Decompensated CHF. Limit to passive ROM until compensated.'
  },
  {
    id: 'recent_surgery',
    name: 'Recent Major Surgery',
    type: 'temporal',
    conditions: [
      { field: 'admissionDiagnosis', operator: 'contains', value: 'surgery' },
      { field: 'admissionDate', operator: 'within_days', value: 1 }
    ],
    action: 'parameters_modified',
    alertPriority: 'warning',
    message: 'TEMPORAL CONTRAINDICATION: Within 24h of surgery. Limit to very low intensity.'
  },
  {
    id: 'orthostatic_hypotension',
    name: 'Severe Orthostatic Hypotension',
    type: 'relative',
    conditions: [
      { field: 'comorbidities', operator: 'contains', value: 'orthostatic hypotension' }
    ],
    action: 'parameters_modified',
    alertPriority: 'caution',
    message: 'CAUTION: Orthostatic hypotension. Ensure sitting position, monitor for dizziness.'
  },
  {
    id: 'severe_anemia',
    name: 'Severe Anemia',
    type: 'relative',
    conditions: [
      { field: 'comorbidities', operator: 'contains', value: 'severe anemia' }
    ],
    action: 'parameters_modified',
    alertPriority: 'warning',
    message: 'RELATIVE CONTRAINDICATION: Severe anemia. Reduce intensity by 40% until treated.'
  },
  {
    id: 'respiratory_failure',
    name: 'Respiratory Failure',
    type: 'relative',
    conditions: [
      { field: 'admissionDiagnosis', operator: 'contains', value: 'respiratory failure' }
    ],
    action: 'parameters_modified',
    alertPriority: 'warning',
    message: 'RELATIVE CONTRAINDICATION: Respiratory failure. Limit duration, monitor SpO2 closely.'
  }
];

// ============================================================================
// MEDICATION SAFETY ENGINE CLASS
// ============================================================================

export class MedicationSafetyEngine {

  /**
   * Classify a medication name to its drug class
   */
  classifyMedication(medicationName: string): MedicationClass {
    const nameLower = medicationName.toLowerCase().trim();

    // Direct match
    if (MEDICATION_CLASSIFICATIONS[nameLower]) {
      return MEDICATION_CLASSIFICATIONS[nameLower];
    }

    // Partial match
    for (const [med, classification] of Object.entries(MEDICATION_CLASSIFICATIONS)) {
      if (nameLower.includes(med) || med.includes(nameLower)) {
        return classification;
      }
    }

    return 'other';
  }

  /**
   * Get medication effects for a specific class
   */
  getMedicationEffects(medicationClass: MedicationClass): MedicationEffect {
    return MEDICATION_EFFECTS[medicationClass];
  }

  /**
   * Analyze patient's medication list and return exercise considerations
   */
  async analyzePatientMedications(patientId: number): Promise<{
    medications: Array<{ name: string; class: MedicationClass; effects: MedicationEffect }>;
    aggregateConsiderations: string[];
    recommendedGoalAdjustments: Array<{ parameter: string; adjustment: number; reason: string }>;
    highRiskCombinations: string[];
  }> {
    try {
      // Get patient profile with medications
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      if (!profile.length) {
        return {
          medications: [],
          aggregateConsiderations: [],
          recommendedGoalAdjustments: [],
          highRiskCombinations: []
        };
      }

      const medicationList: string[] = JSON.parse(profile[0].medications || '[]');
      const analyzedMedications: Array<{ name: string; class: MedicationClass; effects: MedicationEffect }> = [];
      const allConsiderations: string[] = [];
      const allAdjustments: Array<{ parameter: string; adjustment: number; reason: string }> = [];

      for (const med of medicationList) {
        const medClass = this.classifyMedication(med);
        const effects = this.getMedicationEffects(medClass);

        analyzedMedications.push({ name: med, class: medClass, effects });
        allConsiderations.push(...effects.exerciseConsiderations);

        for (const adj of effects.goalAdjustments) {
          allAdjustments.push(adj);
        }
      }

      // Check for high-risk combinations
      const highRiskCombinations = this.checkHighRiskCombinations(
        analyzedMedications.map(m => m.class)
      );

      // Aggregate adjustments by parameter (use most conservative)
      const aggregatedAdjustments = this.aggregateAdjustments(allAdjustments);

      return {
        medications: analyzedMedications,
        aggregateConsiderations: [...new Set(allConsiderations)],
        recommendedGoalAdjustments: aggregatedAdjustments,
        highRiskCombinations
      };

    } catch (error: any) {
      logger.error('Medication analysis failed', { error: error.message, patientId });
      return {
        medications: [],
        aggregateConsiderations: [],
        recommendedGoalAdjustments: [],
        highRiskCombinations: []
      };
    }
  }

  /**
   * Check for high-risk medication combinations
   */
  private checkHighRiskCombinations(classes: MedicationClass[]): string[] {
    const warnings: string[] = [];

    // Multiple sedating medications
    const sedatingCount = classes.filter(c =>
      c === 'sedative' || c === 'opioid'
    ).length;
    if (sedatingCount >= 2) {
      warnings.push('HIGH RISK: Multiple sedating medications. Extreme caution with exercise. Consider provider review.');
    }

    // Beta blocker + opioid (both suppress HR)
    if (classes.includes('beta_blocker') && classes.includes('opioid')) {
      warnings.push('CAUTION: Beta-blocker + opioid combination may mask cardiac symptoms.');
    }

    // Diuretic + cardiac glycoside (electrolyte risk)
    if (classes.includes('diuretic') && classes.includes('cardiac_glycoside')) {
      warnings.push('CAUTION: Diuretic + digoxin combination. Monitor for signs of digoxin toxicity.');
    }

    return warnings;
  }

  /**
   * Aggregate goal adjustments by parameter
   */
  private aggregateAdjustments(
    adjustments: Array<{ parameter: string; adjustment: number; reason: string }>
  ): Array<{ parameter: string; adjustment: number; reason: string }> {
    const byParameter = new Map<string, { adjustment: number; reasons: string[] }>();

    for (const adj of adjustments) {
      const existing = byParameter.get(adj.parameter);
      if (existing) {
        // Use most conservative (most negative) adjustment
        if (adj.adjustment < existing.adjustment) {
          existing.adjustment = adj.adjustment;
        }
        existing.reasons.push(adj.reason);
      } else {
        byParameter.set(adj.parameter, {
          adjustment: adj.adjustment,
          reasons: [adj.reason]
        });
      }
    }

    return Array.from(byParameter.entries()).map(([parameter, data]) => ({
      parameter,
      adjustment: data.adjustment,
      reason: data.reasons.join('; ')
    }));
  }

  /**
   * Detect medication-exercise interaction from session performance
   *
   * Called after session completion to correlate medication timing with performance
   */
  async detectMedicationInteraction(
    patientId: number,
    sessionId: number,
    sessionMetrics: {
      avgPower: number;
      duration: number;
      heartRate?: number;
    }
  ): Promise<MedicationInteractionAlert | null> {
    try {
      // Get patient baseline
      const baselineSessions = await db.select()
        .from(exerciseSessions)
        .where(eq(exerciseSessions.patientId, patientId))
        .orderBy(desc(exerciseSessions.startTime))
        .limit(10);

      if (baselineSessions.length < 5) {
        return null;  // Need baseline data
      }

      const baselineAvgPower = baselineSessions.slice(1)  // Exclude current
        .reduce((sum, s) => sum + (s.avgPower || 0), 0) / (baselineSessions.length - 1);

      // Get patient medications
      const analysis = await this.analyzePatientMedications(patientId);

      // Check for significant deviation from baseline
      const powerChange = (sessionMetrics.avgPower - baselineAvgPower) / baselineAvgPower;

      // Only alert if significant decline not explained by expected medication effects
      if (powerChange < -0.20) {  // >20% decline
        // Check if any medications could explain this
        const sedatingMeds = analysis.medications.filter(m =>
          m.class === 'sedative' || m.class === 'opioid' || m.class === 'beta_blocker'
        );

        if (sedatingMeds.length > 0) {
          const alert: MedicationInteractionAlert = {
            patientId,
            medicationName: sedatingMeds[0].name,
            medicationClass: sedatingMeds[0].class,
            sessionId,
            performanceChange: {
              powerPercent: Math.round(powerChange * 100),
              expectedChange: sedatingMeds[0].effects.goalAdjustments.find(a => a.parameter === 'power')?.adjustment || -10,
              significantDeviation: Math.abs(powerChange * 100) > 25
            },
            alert: {
              generated: true,
              priority: Math.abs(powerChange * 100) > 30 ? 'high' : 'medium',
              message: `Performance declined ${Math.abs(Math.round(powerChange * 100))}% from baseline. Patient on ${sedatingMeds[0].name} (${sedatingMeds[0].class}).`,
              recommendation: 'Review medication timing relative to exercise. Consider adjusting exercise schedule or goals.'
            }
          };

          // Record interaction
          await this.recordMedicationInteraction(alert);

          // Create alert for provider
          await db.insert(alerts).values({
            patientId,
            type: 'medication_interaction',
            priority: alert.alert.priority,
            message: alert.alert.message,
            actionRequired: alert.alert.recommendation,
            metadata: JSON.stringify({
              medicationName: alert.medicationName,
              medicationClass: alert.medicationClass,
              powerChange: alert.performanceChange.powerPercent
            }),
            triggeredAt: new Date()
          });

          return alert;
        }
      }

      return null;

    } catch (error: any) {
      logger.error('Medication interaction detection failed', { error: error.message, patientId });
      return null;
    }
  }

  /**
   * Record medication interaction to database
   */
  private async recordMedicationInteraction(alert: MedicationInteractionAlert): Promise<void> {
    try {
      await db.insert(medicationInteractions).values({
        patientId: alert.patientId,
        medicationName: alert.medicationName,
        medicationClass: alert.medicationClass,
        sessionId: alert.sessionId,
        powerChangePercent: alert.performanceChange.powerPercent,
        alertGenerated: alert.alert.generated,
        alertMessage: alert.alert.message,
        providerNotified: true
      });
    } catch (error: any) {
      logger.error('Failed to record medication interaction', { error: error.message });
    }
  }

  /**
   * Apply medication-based goal adjustments
   */
  async applyMedicationGoalAdjustments(patientId: number): Promise<{
    applied: boolean;
    adjustments: Array<{ goalType: string; adjustment: number; newTarget: number }>;
  }> {
    try {
      const analysis = await this.analyzePatientMedications(patientId);

      if (analysis.recommendedGoalAdjustments.length === 0) {
        return { applied: false, adjustments: [] };
      }

      const appliedAdjustments: Array<{ goalType: string; adjustment: number; newTarget: number }> = [];

      // Get current goals
      const goals = await db.select()
        .from(patientGoals)
        .where(and(
          eq(patientGoals.patientId, patientId),
          eq(patientGoals.isActive, true)
        ));

      for (const adj of analysis.recommendedGoalAdjustments) {
        const matchingGoal = goals.find(g =>
          g.goalType.toLowerCase() === adj.parameter.toLowerCase()
        );

        if (matchingGoal) {
          const newTarget = matchingGoal.targetValue * (1 + adj.adjustment / 100);

          await db.update(patientGoals)
            .set({
              targetValue: newTarget,
              aiRecommended: true,
              subtitle: `Adjusted for medications (${adj.reason})`,
              updatedAt: new Date()
            })
            .where(eq(patientGoals.id, matchingGoal.id));

          appliedAdjustments.push({
            goalType: adj.parameter,
            adjustment: adj.adjustment,
            newTarget: Math.round(newTarget * 10) / 10
          });
        }
      }

      return {
        applied: appliedAdjustments.length > 0,
        adjustments: appliedAdjustments
      };

    } catch (error: any) {
      logger.error('Failed to apply medication goal adjustments', { error: error.message, patientId });
      return { applied: false, adjustments: [] };
    }
  }

  // ========================================================================
  // CONTRAINDICATION VERIFICATION (Patent 11.3)
  // ========================================================================

  /**
   * Verify patient can safely exercise - called before each session
   */
  async verifyContraindications(
    patientId: number,
    verificationType: 'pre_session' | 'periodic' | 'order_change' = 'pre_session'
  ): Promise<ContraindicationCheck> {
    try {
      // Get patient profile
      const profile = await db.select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, patientId))
        .limit(1);

      // Get user for admission date
      const user = await db.select()
        .from(users)
        .where(eq(users.id, patientId))
        .limit(1);

      if (!profile.length) {
        // No profile - allow with caution
        return this.createSafeResult(patientId, verificationType);
      }

      const patientData = {
        ...profile[0],
        admissionDate: user[0]?.admissionDate
      };

      // Check each contraindication rule
      for (const rule of CONTRAINDICATION_RULES) {
        const matched = this.evaluateContraindicationRule(rule, patientData);

        if (matched) {
          // Record the verification
          await this.recordContraindicationVerification(patientId, verificationType, rule);

          // Create alert
          await db.insert(alerts).values({
            patientId,
            type: 'contraindication_detected',
            priority: rule.alertPriority,
            message: rule.message,
            actionRequired: rule.action === 'device_locked'
              ? 'Device locked. Requires provider clearance.'
              : 'Review exercise parameters.',
            metadata: JSON.stringify({
              ruleId: rule.id,
              ruleName: rule.name,
              contraindicationType: rule.type
            }),
            triggeredAt: new Date()
          });

          return {
            patientId,
            verificationType,
            timestamp: new Date(),
            result: {
              safe: false,
              contraindicationType: rule.type,
              reason: rule.message,
              action: rule.action,
              modifiedParameters: rule.action === 'parameters_modified'
                ? this.getModifiedParameters(rule)
                : undefined
            }
          };
        }
      }

      // No contraindications found
      await this.recordContraindicationVerification(patientId, verificationType, null);

      return this.createSafeResult(patientId, verificationType);

    } catch (error: any) {
      logger.error('Contraindication verification failed', { error: error.message, patientId });
      // On error, err on side of caution
      return {
        patientId,
        verificationType,
        timestamp: new Date(),
        result: {
          safe: false,
          reason: 'Unable to verify contraindications. Please try again.',
          action: 'alert_sent'
        }
      };
    }
  }

  /**
   * Evaluate a single contraindication rule against patient data
   */
  private evaluateContraindicationRule(rule: ContraindicationRule, patientData: any): boolean {
    for (const condition of rule.conditions) {
      const matched = this.evaluateCondition(condition, patientData);
      if (!matched) {
        return false;  // All conditions must match
      }
    }
    return true;  // All conditions matched
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: { field: string; operator: string; value: any },
    patientData: any
  ): boolean {
    let fieldValue = patientData[condition.field];

    // Handle comorbidities as JSON array
    if (condition.field === 'comorbidities') {
      try {
        const comorbidities: string[] = JSON.parse(fieldValue || '[]');
        const searchTerm = String(condition.value).toLowerCase();
        return comorbidities.some(c => c.toLowerCase().includes(searchTerm));
      } catch {
        return false;
      }
    }

    // Handle admission diagnosis
    if (condition.field === 'admissionDiagnosis') {
      const diagnosis = String(fieldValue || '').toLowerCase();
      const searchTerm = String(condition.value).toLowerCase();
      return condition.operator === 'contains'
        ? diagnosis.includes(searchTerm)
        : diagnosis === searchTerm;
    }

    // Handle admission date (temporal contraindications)
    if (condition.field === 'admissionDate' && condition.operator === 'within_days') {
      if (!fieldValue) return false;
      const admissionDate = new Date(fieldValue);
      const daysSinceAdmission = Math.floor(
        (Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceAdmission <= condition.value;
    }

    // Handle simple equals
    if (condition.operator === 'equals') {
      return fieldValue === condition.value;
    }

    // Handle greater than / less than
    if (condition.operator === 'gt') {
      return Number(fieldValue) > Number(condition.value);
    }
    if (condition.operator === 'lt') {
      return Number(fieldValue) < Number(condition.value);
    }

    return false;
  }

  /**
   * Get modified parameters for relative contraindications
   */
  private getModifiedParameters(rule: ContraindicationRule): Record<string, any> {
    const modifications: Record<string, any> = {};

    if (rule.id === 'hypertension_uncontrolled') {
      modifications.resistanceReduction = 0.30;
      modifications.powerReduction = 0.30;
    } else if (rule.id === 'recent_surgery') {
      modifications.resistanceReduction = 0.50;
      modifications.maxDuration = 10;  // 10 minutes max
    } else if (rule.id === 'severe_anemia') {
      modifications.resistanceReduction = 0.40;
      modifications.powerReduction = 0.40;
    } else if (rule.id === 'respiratory_failure') {
      modifications.maxDuration = 8;
      modifications.requireSpO2Monitoring = true;
    }

    return modifications;
  }

  /**
   * Create safe result
   */
  private createSafeResult(
    patientId: number,
    verificationType: 'pre_session' | 'periodic' | 'order_change'
  ): ContraindicationCheck {
    return {
      patientId,
      verificationType,
      timestamp: new Date(),
      result: {
        safe: true,
        action: 'cleared'
      }
    };
  }

  /**
   * Record contraindication verification to database
   */
  private async recordContraindicationVerification(
    patientId: number,
    verificationType: string,
    rule: ContraindicationRule | null
  ): Promise<void> {
    try {
      await db.insert(contraindicationVerifications).values({
        patientId,
        verifiedAt: new Date(),
        verificationType,
        contraindicationFound: rule !== null,
        contraindicationType: rule?.type,
        contraindicationReason: rule?.message,
        actionTaken: rule?.action || 'cleared',
        alertPriority: rule?.alertPriority
      });
    } catch (error: any) {
      logger.error('Failed to record contraindication verification', { error: error.message });
    }
  }

  /**
   * Provider override for contraindication
   */
  async overrideContraindication(
    verificationId: number,
    providerId: number,
    reason: string
  ): Promise<boolean> {
    try {
      await db.update(contraindicationVerifications)
        .set({
          providerOverride: true,
          overrideBy: providerId,
          overrideReason: reason,
          overrideAt: new Date()
        })
        .where(eq(contraindicationVerifications.id, verificationId));

      logger.info('Contraindication override recorded', {
        verificationId,
        providerId,
        reason
      });

      return true;

    } catch (error: any) {
      logger.error('Failed to record override', { error: error.message });
      return false;
    }
  }
}

// Singleton instance
export const medicationSafetyEngine = new MedicationSafetyEngine();
