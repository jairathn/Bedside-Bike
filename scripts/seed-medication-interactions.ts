#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../shared/schema.sqlite';

const sqlite = new Database('local.db');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

console.log('💊 Seeding medication interactions database...\n');

// Common medications with their exercise interactions
const medications = [
  // Beta Blockers
  {
    medication_name: 'Metoprolol',
    generic_name: 'metoprolol tartrate',
    medication_class: 'Beta Blocker',
    exercise_interaction: 'caution',
    interaction_type: 'Heart rate and blood pressure blunting',
    physiological_effects: 'Blunts heart rate response to exercise, reduces maximum heart rate, may affect exercise capacity',
    recommended_modifications: 'Monitor RPE instead of heart rate. May need lower intensity targets. Watch for excessive fatigue.',
    monitoring_required: 'Blood pressure before and after exercise, perceived exertion',
    intensity_impact: 'May reduce exercise capacity by 10-20%',
    hr_impact: 'blunts',
    bp_impact: 'decreases',
    arrhythmia_risk: 0,
    fall_risk_increase: 0,
    coordination_impairment: 0,
    endurance_impact: 'Moderate reduction in aerobic capacity',
    notes: 'Very common in elderly. Safe for exercise with modifications.',
    evidence_citation: 'ACC/AHA Guidelines on Exercise in Cardiac Patients 2018'
  },
  {
    medication_name: 'Atenolol',
    generic_name: 'atenolol',
    medication_class: 'Beta Blocker',
    exercise_interaction: 'caution',
    interaction_type: 'Heart rate and blood pressure blunting',
    physiological_effects: 'Blunts heart rate response to exercise, reduces maximum heart rate',
    recommended_modifications: 'Use RPE for intensity monitoring. Lower target heart rate zones if used.',
    monitoring_required: 'Blood pressure, RPE',
    intensity_impact: 'Moderate reduction',
    hr_impact: 'blunts',
    bp_impact: 'decreases',
    arrhythmia_risk: 0,
    fall_risk_increase: 0,
    coordination_impairment: 0,
    endurance_impact: 'Moderate reduction',
    notes: 'Similar to metoprolol. Very common in elderly patients.',
    evidence_citation: 'ACC/AHA 2018'
  },

  // ACE Inhibitors
  {
    medication_name: 'Lisinopril',
    generic_name: 'lisinopril',
    medication_class: 'ACE Inhibitor',
    exercise_interaction: 'safe',
    interaction_type: 'Minimal exercise interaction',
    physiological_effects: 'May cause slight drop in blood pressure during exercise',
    recommended_modifications: 'Monitor for lightheadedness. Ensure adequate hydration.',
    monitoring_required: 'Blood pressure if symptomatic',
    intensity_impact: 'Minimal',
    hr_impact: 'none',
    bp_impact: 'decreases',
    arrhythmia_risk: 0,
    fall_risk_increase: 0,
    coordination_impairment: 0,
    endurance_impact: 'None or slight improvement',
    notes: 'Generally safe. May improve exercise capacity in heart failure patients.',
    evidence_citation: 'European Heart Journal 2019'
  },
  {
    medication_name: 'Losartan',
    generic_name: 'losartan potassium',
    medication_class: 'ARB (Angiotensin Receptor Blocker)',
    exercise_interaction: 'safe',
    interaction_type: 'Minimal exercise interaction',
    physiological_effects: 'May cause slight drop in blood pressure',
    recommended_modifications: 'Monitor for orthostatic hypotension. Encourage gradual transitions.',
    monitoring_required: 'Blood pressure if symptomatic',
    intensity_impact: 'Minimal',
    hr_impact: 'none',
    bp_impact: 'decreases',
    arrhythmia_risk: 0,
    fall_risk_increase: 0,
    coordination_impairment: 0,
    endurance_impact: 'None',
    notes: 'Safe for exercise. Similar to ACE inhibitors.',
    evidence_citation: 'ACC/AHA 2018'
  },

  // Parkinson's Disease
  {
    medication_name: 'Carbidopa-Levodopa',
    generic_name: 'carbidopa-levodopa',
    medication_class: 'Antiparkinsonian',
    exercise_interaction: 'caution',
    interaction_type: 'Timing-dependent effectiveness',
    physiological_effects: 'Exercise effectiveness depends on medication timing. May cause dyskinesias or \"off\" periods affecting mobility.',
    recommended_modifications: 'Schedule exercise during \"on\" periods (peak medication effect). Reduce intensity during \"off\" periods. Watch for dyskinesias.',
    monitoring_required: 'Coordination, balance, dyskinesias, medication timing',
    intensity_impact: 'Variable - depends on medication timing',
    hr_impact: 'none',
    bp_impact: 'hypotension_risk',
    arrhythmia_risk: 0,
    fall_risk_increase: 1,
    coordination_impairment: 1,
    endurance_impact: 'Variable - better during \"on\" periods',
    notes: 'Exercise may improve Parkinson\'s symptoms. Timing is crucial. May cause orthostatic hypotension.',
    evidence_citation: 'Movement Disorders Society Guidelines 2020'
  },

  // Diuretics
  {
    medication_name: 'Furosemide',
    generic_name: 'furosemide',
    medication_class: 'Loop Diuretic',
    exercise_interaction: 'caution',
    interaction_type: 'Dehydration and electrolyte imbalance',
    physiological_effects: 'Increases fluid and electrolyte loss during exercise. May cause dehydration, hypokalemia, orthostatic hypotension.',
    recommended_modifications: 'Ensure adequate hydration. Monitor for weakness, cramping, dizziness. May need electrolyte monitoring.',
    monitoring_required: 'Hydration status, blood pressure, symptoms of hypokalemia',
    intensity_impact: 'May reduce endurance',
    hr_impact: 'none',
    bp_impact: 'hypotension_risk',
    arrhythmia_risk: 1,
    fall_risk_increase: 1,
    coordination_impairment: 0,
    endurance_impact: 'May decrease if dehydrated',
    notes: 'Common in CHF and edema. Exercise may be beneficial but requires monitoring.',
    evidence_citation: 'Heart Failure Society of America 2019'
  },

  // Diabetes
  {
    medication_name: 'Insulin',
    generic_name: 'insulin (various)',
    medication_class: 'Insulin',
    exercise_interaction: 'caution',
    interaction_type: 'Hypoglycemia risk',
    physiological_effects: 'Exercise increases insulin sensitivity and glucose uptake. Risk of hypoglycemia during and after exercise.',
    recommended_modifications: 'Check blood glucose before/after exercise. May need to reduce insulin dose or increase carb intake. Avoid exercising during peak insulin action.',
    monitoring_required: 'Blood glucose before and after, symptoms of hypoglycemia',
    intensity_impact: 'Safe if glucose managed',
    hr_impact: 'none',
    bp_impact: 'none',
    arrhythmia_risk: 0,
    fall_risk_increase: 1,
    coordination_impairment: 1,
    endurance_impact: 'Improved with good glucose control',
    notes: 'Exercise highly beneficial for diabetes management but requires careful glucose monitoring.',
    evidence_citation: 'ADA Standards of Care 2023'
  },
  {
    medication_name: 'Metformin',
    generic_name: 'metformin',
    medication_class: 'Biguanide',
    exercise_interaction: 'safe',
    interaction_type: 'Minimal exercise interaction',
    physiological_effects: 'Low hypoglycemia risk. May cause GI upset which could affect exercise tolerance.',
    recommended_modifications: 'Generally safe. Monitor for GI symptoms. Ensure adequate hydration.',
    monitoring_required: 'Minimal - check glucose if symptomatic',
    intensity_impact: 'Minimal',
    hr_impact: 'none',
    bp_impact: 'none',
    arrhythmia_risk: 0,
    fall_risk_increase: 0,
    coordination_impairment: 0,
    endurance_impact: 'None or slightly improved',
    notes: 'Very safe for exercise. First-line diabetes medication.',
    evidence_citation: 'ADA 2023'
  },

  // Anticoagulants
  {
    medication_name: 'Warfarin',
    generic_name: 'warfarin sodium',
    medication_class: 'Anticoagulant',
    exercise_interaction: 'caution',
    interaction_type: 'Bleeding risk with trauma',
    physiological_effects: 'Increased bleeding risk with falls or trauma. Otherwise minimal direct exercise interaction.',
    recommended_modifications: 'Avoid high fall-risk activities. Use caution with resistance training. Monitor for bruising.',
    monitoring_required: 'Fall risk assessment, check for unusual bruising/bleeding',
    intensity_impact: 'Minimal',
    hr_impact: 'none',
    bp_impact: 'none',
    arrhythmia_risk: 0,
    fall_risk_increase: 0,
    coordination_impairment: 0,
    endurance_impact: 'None',
    notes: 'Exercise is safe if fall risk is managed. Avoid contact activities.',
    evidence_citation: 'ACC/AHA Anticoagulation Guidelines 2019'
  },

  // Sedatives/Anxiolytics
  {
    medication_name: 'Lorazepam',
    generic_name: 'lorazepam',
    medication_class: 'Benzodiazepine',
    exercise_interaction: 'caution',
    interaction_type: 'Sedation and fall risk',
    physiological_effects: 'Causes sedation, impaired coordination, increased fall risk, slowed reaction time',
    recommended_modifications: 'Reduce intensity. Provide closer supervision. Avoid if acutely sedated. Consider timing exercise when medication effect is lowest.',
    monitoring_required: 'Alertness level, coordination, fall risk',
    intensity_impact: 'May reduce capacity due to sedation',
    hr_impact: 'none',
    bp_impact: 'none',
    arrhythmia_risk: 0,
    fall_risk_increase: 1,
    coordination_impairment: 1,
    endurance_impact: 'Decreased due to sedation',
    notes: 'High fall risk. Consider alternative anxiety management. Short-acting makes timing important.',
    evidence_citation: 'AGS Beers Criteria 2023'
  },

  // Opioids
  {
    medication_name: 'Oxycodone',
    generic_name: 'oxycodone',
    medication_class: 'Opioid Analgesic',
    exercise_interaction: 'caution',
    interaction_type: 'Sedation, respiratory depression, fall risk',
    physiological_effects: 'Sedation, impaired coordination, respiratory depression at high doses, orthostatic hypotension',
    recommended_modifications: 'Reduce intensity. Close supervision required. Monitor respiratory rate and O2 sat. Avoid exercise at peak sedation.',
    monitoring_required: 'Sedation level, respiratory rate, O2 saturation, fall risk',
    intensity_impact: 'Moderate to significant reduction',
    hr_impact: 'none',
    bp_impact: 'hypotension_risk',
    arrhythmia_risk: 0,
    fall_risk_increase: 1,
    coordination_impairment: 1,
    endurance_impact: 'Decreased',
    notes: 'Pain control may improve exercise tolerance but sedation/fall risk is significant concern.',
    evidence_citation: 'CDC Opioid Guidelines 2022'
  },

  // Statins
  {
    medication_name: 'Atorvastatin',
    generic_name: 'atorvastatin calcium',
    medication_class: 'Statin',
    exercise_interaction: 'caution',
    interaction_type: 'Myopathy and muscle pain',
    physiological_effects: 'May cause muscle pain, weakness, or rarely rhabdomyolysis especially with high-intensity exercise',
    recommended_modifications: 'Monitor for muscle pain, weakness, cramping. Reduce intensity if myalgias develop. Stop and notify provider if severe pain.',
    monitoring_required: 'Muscle pain/weakness, dark urine (rhabdomyolysis)',
    intensity_impact: 'May limit high-intensity exercise if myalgias present',
    hr_impact: 'none',
    bp_impact: 'none',
    arrhythmia_risk: 0,
    fall_risk_increase: 0,
    coordination_impairment: 0,
    endurance_impact: 'May decrease if myopathy present',
    notes: 'Muscle pain is common (~10%). Usually mild. Exercise is still beneficial and recommended.',
    evidence_citation: 'ACC/AHA Cholesterol Guidelines 2019'
  },

  // Antipsychotics
  {
    medication_name: 'Haloperidol',
    generic_name: 'haloperidol',
    medication_class: 'Antipsychotic',
    exercise_interaction: 'contraindicated',
    interaction_type: 'Severe sedation, extrapyramidal symptoms, QT prolongation',
    physiological_effects: 'Heavy sedation, rigidity, tremor, orthostatic hypotension, risk of arrhythmias, neuroleptic malignant syndrome risk with exercise',
    recommended_modifications: 'Avoid exercise during acute treatment. If chronic use, very low intensity only with close medical supervision. Monitor vitals closely.',
    monitoring_required: 'Blood pressure, heart rate, temperature, muscle rigidity, coordination',
    intensity_impact: 'Severely limited',
    hr_impact: 'none',
    bp_impact: 'hypotension_risk',
    arrhythmia_risk: 1,
    fall_risk_increase: 1,
    coordination_impairment: 1,
    endurance_impact: 'Severely decreased',
    notes: 'High-risk medication. Often used for delirium/agitation in hospital. Exercise should be very limited.',
    evidence_citation: 'AGS Beers Criteria 2023'
  }
];

console.log(`   Inserting ${medications.length} medications...\n`);

const insertStmt = sqlite.prepare(`
  INSERT OR REPLACE INTO medication_interactions (
    medication_name, generic_name, medication_class, exercise_interaction,
    interaction_type, physiological_effects, recommended_modifications,
    monitoring_required, intensity_impact, hr_impact, bp_impact,
    arrhythmia_risk, fall_risk_increase, coordination_impairment,
    endurance_impact, notes, evidence_citation
  ) VALUES (
    @medication_name, @generic_name, @medication_class, @exercise_interaction,
    @interaction_type, @physiological_effects, @recommended_modifications,
    @monitoring_required, @intensity_impact, @hr_impact, @bp_impact,
    @arrhythmia_risk, @fall_risk_increase, @coordination_impairment,
    @endurance_impact, @notes, @evidence_citation
  )
`);

const insertMany = sqlite.transaction((medications: any[]) => {
  for (const med of medications) {
    insertStmt.run(med);
    console.log(`   ✓ ${med.medication_name} (${med.medication_class}) - ${med.exercise_interaction}`);
  }
});

insertMany(medications);

console.log(`\n✅ Medication interactions database seeded!`);
console.log(`\n📊 Summary:`);
console.log(`   Total medications: ${medications.length}`);
console.log(`   Safe: ${medications.filter(m => m.exercise_interaction === 'safe').length}`);
console.log(`   Caution: ${medications.filter(m => m.exercise_interaction === 'caution').length}`);
console.log(`   Contraindicated: ${medications.filter(m => m.exercise_interaction === 'contraindicated').length}`);

sqlite.close();
