#!/usr/bin/env tsx

/**
 * Seed Protocol Matching Criteria
 *
 * Populates the protocol_matching_criteria table with detailed matching rules
 * for each clinical protocol. These criteria enable intelligent protocol
 * selection based on patient characteristics.
 *
 * Usage: npx tsx scripts/seed-protocol-criteria.ts
 */

import Database from 'better-sqlite3';
import { logger } from '../server/logger';

const db = new Database('local.db');

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Protocol Matching Criteria
 *
 * These criteria are based on the baseline of:
 * - Healthy 70-year-old: 20 min BID (ideal)
 * - Maximum recommended: 30 min BID
 *
 * Protocols scale down for higher acuity, more comorbidities, and frailty
 */

interface MatchingCriteria {
  protocolName: string;
  minAge: number | null;
  maxAge: number | null;
  requiredMobilityLevels: string[] | null;
  excludedMobilityLevels: string[] | null;
  requiredBaselineFunction: string[] | null;
  requiredComorbidities: string[] | null;
  excludedComorbidities: string[] | null;
  requiredProcedures: string[] | null;
  maxFallRisk: number | null;
  maxDeconditioningRisk: number | null;
  requiresLowVteRisk: boolean;
  matchWeight: number;
  matchPriority: number;
}

const matchingCriteria: MatchingCriteria[] = [
  // 1. BASELINE HEALTHY PROTOCOL
  {
    protocolName: 'General Medical/Surgical - Standard (Healthy Baseline)',
    minAge: 18,
    maxAge: null,
    requiredMobilityLevels: ['walking_assist', 'standing_assist', 'independent'],
    excludedMobilityLevels: null,
    requiredBaselineFunction: ['independent', 'walker'],
    requiredComorbidities: null, // No specific comorbidities required
    excludedComorbidities: ['COPD', 'CHF', 'stroke_acute', 'recent_MI'],
    requiredProcedures: null,
    maxFallRisk: 0.5, // Moderate fall risk acceptable
    maxDeconditioningRisk: 0.6,
    requiresLowVteRisk: false,
    matchWeight: 1.0,
    matchPriority: 5 // Medium priority - general catch-all
  },

  // 2. FRAIL ELDERLY PROTOCOL
  {
    protocolName: 'Frail Elderly - Low Intensity',
    minAge: 75,
    maxAge: null,
    requiredMobilityLevels: ['bedbound', 'chair_bound', 'standing_assist'],
    excludedMobilityLevels: ['independent'],
    requiredBaselineFunction: ['walker', 'dependent'],
    requiredComorbidities: null,
    excludedComorbidities: null,
    requiredProcedures: null,
    maxFallRisk: 0.8, // High fall risk tolerated
    maxDeconditioningRisk: 0.9,
    requiresLowVteRisk: false,
    matchWeight: 1.5, // Higher weight for appropriate frail patients
    matchPriority: 8 // High priority when age + frailty match
  },

  // 3. CHF PROTOCOL
  {
    protocolName: 'Congestive Heart Failure (CHF) - Modified Protocol',
    minAge: 18,
    maxAge: null,
    requiredMobilityLevels: null,
    excludedMobilityLevels: null,
    requiredBaselineFunction: null,
    requiredComorbidities: ['CHF', 'heart_failure', 'systolic_heart_failure', 'diastolic_heart_failure'],
    excludedComorbidities: null,
    requiredProcedures: null,
    maxFallRisk: 0.6,
    maxDeconditioningRisk: 0.7,
    requiresLowVteRisk: false,
    matchWeight: 2.0, // Very high weight for CHF diagnosis
    matchPriority: 10 // Highest priority for CHF patients
  },

  // 4. COPD PROTOCOL
  {
    protocolName: 'COPD/Respiratory - Modified Protocol',
    minAge: 18,
    maxAge: null,
    requiredMobilityLevels: null,
    excludedMobilityLevels: null,
    requiredBaselineFunction: null,
    requiredComorbidities: ['COPD', 'emphysema', 'chronic_bronchitis', 'respiratory_disease'],
    excludedComorbidities: null,
    requiredProcedures: null,
    maxFallRisk: 0.6,
    maxDeconditioningRisk: 0.7,
    requiresLowVteRisk: false,
    matchWeight: 2.0,
    matchPriority: 10 // Highest priority for COPD patients
  },

  // 5. STROKE PROTOCOL
  {
    protocolName: 'Stroke - Early Mobilization Protocol',
    minAge: 18,
    maxAge: null,
    requiredMobilityLevels: ['bedbound', 'chair_bound', 'standing_assist', 'walking_assist'],
    excludedMobilityLevels: null,
    requiredBaselineFunction: null,
    requiredComorbidities: ['stroke', 'CVA', 'cerebral_infarction', 'ICH', 'hemorrhagic_stroke', 'ischemic_stroke'],
    excludedComorbidities: null,
    requiredProcedures: null,
    maxFallRisk: 0.7,
    maxDeconditioningRisk: 0.8,
    requiresLowVteRisk: false,
    matchWeight: 2.5, // Highest weight for stroke
    matchPriority: 10
  },

  // 6. TOTAL KNEE ARTHROPLASTY
  {
    protocolName: 'Total Knee Arthroplasty (TKA) Early Mobilization',
    minAge: 18,
    maxAge: null,
    requiredMobilityLevels: null,
    excludedMobilityLevels: null,
    requiredBaselineFunction: null,
    requiredComorbidities: null,
    excludedComorbidities: null,
    requiredProcedures: ['27447', '27446', 'TKA', 'knee_replacement', 'total_knee_arthroplasty'],
    maxFallRisk: 0.6,
    maxDeconditioningRisk: 0.5,
    requiresLowVteRisk: false,
    matchWeight: 3.0, // Very high weight for procedure match
    matchPriority: 10
  },

  // 7. HIP FRACTURE
  {
    protocolName: 'Hip Fracture - Post-Surgical Protocol',
    minAge: 50,
    maxAge: null,
    requiredMobilityLevels: ['bedbound', 'chair_bound', 'standing_assist'],
    excludedMobilityLevels: null,
    requiredBaselineFunction: null,
    requiredComorbidities: null,
    excludedComorbidities: null,
    requiredProcedures: ['27130', '27236', 'hip_ORIF', 'hip_fracture_repair', 'total_hip_arthroplasty'],
    maxFallRisk: 0.9, // Very high fall risk expected
    maxDeconditioningRisk: 0.9,
    requiresLowVteRisk: false,
    matchWeight: 3.0,
    matchPriority: 10
  },

  // 8. ICU DECONDITIONING
  {
    protocolName: 'ICU Deconditioning - Progressive Mobilization',
    minAge: 18,
    maxAge: null,
    requiredMobilityLevels: ['bedbound', 'chair_bound'],
    excludedMobilityLevels: ['independent', 'walking_assist'],
    requiredBaselineFunction: null,
    requiredComorbidities: ['ICU_stay', 'critical_illness', 'mechanical_ventilation', 'sepsis', 'ARDS'],
    excludedComorbidities: null,
    requiredProcedures: null,
    maxFallRisk: 0.9,
    maxDeconditioningRisk: 1.0, // Deconditioning is expected
    requiresLowVteRisk: false,
    matchWeight: 2.0,
    matchPriority: 9 // Very high priority for ICU patients
  },

  // 9. DELIRIUM PROTOCOL
  {
    protocolName: 'Delirium Management - Modified Mobilization',
    minAge: 18,
    maxAge: null,
    requiredMobilityLevels: null,
    excludedMobilityLevels: null,
    requiredBaselineFunction: null,
    requiredComorbidities: ['delirium', 'confusion', 'altered_mental_status', 'dementia'],
    excludedComorbidities: null,
    requiredProcedures: null,
    maxFallRisk: 0.9, // Very high fall risk with delirium
    maxDeconditioningRisk: 0.8,
    requiresLowVteRisk: false,
    matchWeight: 1.8,
    matchPriority: 7 // High priority when delirium present
  }
];

try {
  console.log('🎯 Seeding protocol matching criteria...\n');

  // First, get all protocol IDs
  const protocolsStmt = db.prepare('SELECT id, name FROM clinical_protocols');
  const protocols = protocolsStmt.all() as Array<{ id: number; name: string }>;

  console.log(`   Found ${protocols.length} clinical protocols\n`);

  // Clear existing matching criteria
  const deleteStmt = db.prepare('DELETE FROM protocol_matching_criteria');
  const deleted = deleteStmt.run();
  console.log(`   Cleared ${deleted.changes} existing criteria\n`);

  // Create a map of protocol names to IDs
  const protocolMap = new Map<string, number>();
  protocols.forEach(p => protocolMap.set(p.name, p.id));

  // Insert matching criteria
  const insertStmt = db.prepare(`
    INSERT INTO protocol_matching_criteria (
      protocol_id,
      min_age,
      max_age,
      required_mobility_levels,
      excluded_mobility_levels,
      required_baseline_function,
      required_comorbidities,
      excluded_comorbidities,
      required_procedures,
      max_fall_risk,
      max_deconditioning_risk,
      requires_low_vte_risk,
      match_weight,
      match_priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let insertedCount = 0;

  for (const criteria of matchingCriteria) {
    const protocolId = protocolMap.get(criteria.protocolName);

    if (!protocolId) {
      console.warn(`   ⚠️  Warning: Protocol "${criteria.protocolName}" not found, skipping criteria`);
      continue;
    }

    const result = insertStmt.run(
      protocolId,
      criteria.minAge,
      criteria.maxAge,
      criteria.requiredMobilityLevels ? JSON.stringify(criteria.requiredMobilityLevels) : null,
      criteria.excludedMobilityLevels ? JSON.stringify(criteria.excludedMobilityLevels) : null,
      criteria.requiredBaselineFunction ? JSON.stringify(criteria.requiredBaselineFunction) : null,
      criteria.requiredComorbidities ? JSON.stringify(criteria.requiredComorbidities) : null,
      criteria.excludedComorbidities ? JSON.stringify(criteria.excludedComorbidities) : null,
      criteria.requiredProcedures ? JSON.stringify(criteria.requiredProcedures) : null,
      criteria.maxFallRisk,
      criteria.maxDeconditioningRisk,
      criteria.requiresLowVteRisk ? 1 : 0,
      criteria.matchWeight,
      criteria.matchPriority
    );

    insertedCount++;

    console.log(`✅ Created criteria for: ${criteria.protocolName}`);
    console.log(`   Protocol ID: ${protocolId}`);
    console.log(`   Age Range: ${criteria.minAge || 'any'} - ${criteria.maxAge || 'any'}`);
    console.log(`   Match Weight: ${criteria.matchWeight}`);
    console.log(`   Priority: ${criteria.matchPriority}`);

    if (criteria.requiredComorbidities) {
      console.log(`   Required Conditions: ${criteria.requiredComorbidities.slice(0, 3).join(', ')}${criteria.requiredComorbidities.length > 3 ? '...' : ''}`);
    }
    if (criteria.requiredProcedures) {
      console.log(`   Required Procedures: ${criteria.requiredProcedures.slice(0, 2).join(', ')}`);
    }
    console.log();
  }

  console.log('✅ Protocol matching criteria seeding complete!\n');
  console.log('📊 Summary:');
  console.log(`   Total criteria created: ${insertedCount}`);
  console.log(`   Protocols with criteria: ${insertedCount}`);
  console.log('\n💡 How matching works:');
  console.log('   - Higher matchWeight (2.0-3.0) = stronger match when criteria met');
  console.log('   - Higher matchPriority (8-10) = preferred when multiple protocols match');
  console.log('   - Specific diagnosis/procedure matches have highest weight (2.0-3.0)');
  console.log('   - General protocols have lower priority (5) as catch-all');
  console.log('\n🎯 Clinical Baseline:');
  console.log('   - Healthy 70yo: 20 min BID (Standard Protocol)');
  console.log('   - Frail elderly: 5-10 min BID (Low Intensity)');
  console.log('   - CHF/COPD: 5-10 min BID (Modified)');
  console.log('   - Post-surgical: Phased progression (10-20 min)');
  console.log('   - ICU: 5 min BID initially (Progressive)');
  console.log('   - MAX DURATION: 30 min BID (for all protocols)\n');

} catch (error: any) {
  console.error('❌ Error seeding protocol criteria:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
