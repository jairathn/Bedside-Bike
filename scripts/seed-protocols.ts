#!/usr/bin/env tsx

/**
 * Seed Evidence-Based Clinical Protocols
 *
 * Populates the clinical_protocols table with evidence-based protocols
 * for common hospital diagnoses requiring early mobilization.
 *
 * Usage: npx tsx scripts/seed-protocols.ts
 */

import Database from 'better-sqlite3';
import { logger } from '../server/logger';

const db = new Database('local.db');

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

const protocols = [
  {
    name: 'Total Knee Arthroplasty (TKA) Early Mobilization',
    indication: 'Total knee replacement, knee arthroplasty',
    contraindications: JSON.stringify([
      'active DVT',
      'unstable fracture',
      'severe cardiovascular instability',
      'uncontrolled pain >7/10'
    ]),
    diagnosisCodes: JSON.stringify([
      'Z96.651', // Presence of right artificial knee joint
      'Z96.652', // Presence of left artificial knee joint
      'Z96.653', // Presence of bilateral artificial knee joints
      'M25.561', // Pain in right knee
      'M25.562'  // Pain in left knee
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'POD 0-2: Immediate Post-Op',
          frequency: 'BID',
          duration: 10,
          resistance: { min: 0, max: 1 },
          rpm: { min: 20, max: 40 },
          goals: 'Reduce edema, prevent stiffness, initiate ROM',
          progressionCriteria: [
            'Tolerates 10 min without increased pain',
            'Achieves 30+ RPM consistently',
            'No adverse events (hypotension, excessive pain)'
          ],
          monitoringParams: [
            'Pain level (0-10 scale)',
            'Blood pressure',
            'Heart rate',
            'ROM (degrees of flexion)'
          ],
          stopCriteria: [
            'Pain >7/10',
            'SBP <90 or >180 mmHg',
            'HR >120 bpm',
            'Patient request'
          ]
        },
        {
          phase: 'POD 3-7: Early Recovery',
          frequency: 'TID',
          duration: 15,
          resistance: { min: 1, max: 3 },
          rpm: { min: 30, max: 50 },
          goals: 'Increase endurance, improve ROM, build quad strength',
          progressionCriteria: [
            'Completes 15 min at 40+ RPM',
            'Achieves 90° knee flexion',
            'Minimal to no pain during exercise'
          ],
          monitoringParams: [
            'Pain level',
            'Distance covered',
            'Average power output',
            'Knee flexion ROM'
          ],
          stopCriteria: [
            'Pain >6/10',
            'Significant increase in edema',
            'Vital sign instability'
          ]
        },
        {
          phase: 'POD 8-14: Advanced Recovery',
          frequency: 'TID',
          duration: 20,
          resistance: { min: 2, max: 5 },
          rpm: { min: 40, max: 60 },
          goals: 'Maximize functional independence, prepare for discharge',
          progressionCriteria: [
            'Completes 20 min consistently',
            'Achieves >100° knee flexion',
            'Ready for discharge per PT'
          ],
          monitoringParams: [
            'Total distance',
            'Average power',
            'Patient engagement',
            'Functional mobility score'
          ],
          stopCriteria: [
            'Pain >5/10',
            'Patient fatigue',
            'Discharge from facility'
          ]
        }
      ]
    }),
    evidenceCitation: 'Artz N, et al. Effectiveness of physiotherapy exercise following total knee replacement: systematic review and meta-analysis. BMC Musculoskelet Disord. 2015;16:15. PMID: 25886975',
    isActive: 1
  },
  {
    name: 'Pneumonia Early Mobilization Protocol',
    indication: 'Pneumonia, respiratory infection requiring hospitalization',
    contraindications: JSON.stringify([
      'SpO2 <88% on supplemental O2',
      'acute respiratory distress',
      'hemodynamic instability',
      'altered mental status'
    ]),
    diagnosisCodes: JSON.stringify([
      'J18.9',  // Pneumonia, unspecified organism
      'J15.9',  // Bacterial pneumonia, unspecified
      'J12.9',  // Viral pneumonia, unspecified
      'J13',    // Pneumonia due to Streptococcus pneumoniae
      'J14'     // Pneumonia due to Haemophilus influenzae
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'Acute Phase: Days 1-4',
          frequency: 'BID',
          duration: 5,
          resistance: { min: 0, max: 1 },
          rpm: { min: 20, max: 35 },
          goals: 'Prevent deconditioning, maintain oxygenation, reduce VTE risk',
          progressionCriteria: [
            'Tolerates 5 min without desaturation',
            'SpO2 remains >90% during exercise',
            'Decreased work of breathing'
          ],
          monitoringParams: [
            'SpO2 (continuous)',
            'Respiratory rate',
            'Heart rate',
            'Dyspnea score (0-10)',
            'Use of accessory muscles'
          ],
          stopCriteria: [
            'SpO2 <88%',
            'RR >30/min',
            'HR >130 bpm',
            'Severe dyspnea (>7/10)',
            'Chest pain'
          ]
        },
        {
          phase: 'Recovery Phase: Days 5+',
          frequency: 'TID',
          duration: 10,
          resistance: { min: 1, max: 2 },
          rpm: { min: 30, max: 45 },
          goals: 'Rebuild endurance, restore baseline function, prepare for discharge',
          progressionCriteria: [
            'Completes 10 min without desaturation',
            'Decreased supplemental O2 requirements',
            'Patient reports improved energy'
          ],
          monitoringParams: [
            'SpO2',
            'Distance covered',
            'Dyspnea score',
            'Patient-reported fatigue'
          ],
          stopCriteria: [
            'SpO2 <90%',
            'Excessive dyspnea',
            'Patient request',
            'Discharge from facility'
          ]
        }
      ]
    }),
    evidenceCitation: 'Schweickert WD, et al. Early physical and occupational therapy in mechanically ventilated, critically ill patients: a randomised controlled trial. Lancet. 2009;373(9678):1874-82. PMID: 19446324',
    isActive: 1
  },
  {
    name: 'General Medical/Surgical VTE Prophylaxis Protocol',
    indication: 'General medical or surgical admission with VTE risk factors',
    contraindications: JSON.stringify([
      'active bleeding',
      'unstable spine or pelvic fracture',
      'severe orthostatic hypotension',
      'acute MI <48 hours'
    ]),
    diagnosisCodes: JSON.stringify([
      'Z79.01',  // Long-term use of anticoagulants
      'I26.99',  // Other pulmonary embolism without acute cor pulmonale
      'I82.401', // Acute embolism and thrombosis of unspecified deep veins of right lower extremity
      'I82.402', // Acute embolism and thrombosis of unspecified deep veins of left lower extremity
      'Z86.718'  // Personal history of other venous thrombosis and embolism
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'Admission: Days 1-3',
          frequency: 'BID',
          duration: 10,
          resistance: { min: 0, max: 2 },
          rpm: { min: 25, max: 40 },
          goals: 'Prevent DVT through leg movement, maintain muscle tone',
          progressionCriteria: [
            'Tolerates 10 min without adverse events',
            'Patient demonstrates understanding of importance',
            'Vital signs stable during activity'
          ],
          monitoringParams: [
            'Blood pressure',
            'Heart rate',
            'Lower extremity edema',
            'Calf pain or tenderness'
          ],
          stopCriteria: [
            'New onset calf pain or swelling',
            'SBP <90 or >180 mmHg',
            'HR >120 bpm',
            'Dizziness or lightheadedness'
          ]
        },
        {
          phase: 'Continued Stay: Day 4+',
          frequency: 'TID',
          duration: 15,
          resistance: { min: 1, max: 3 },
          rpm: { min: 30, max: 50 },
          goals: 'Maintain mobility, prevent deconditioning, support discharge readiness',
          progressionCriteria: [
            'Completes 15 min consistently',
            'Increased functional independence',
            'Meets discharge criteria'
          ],
          monitoringParams: [
            'Distance covered',
            'Patient engagement',
            'Functional mobility assessment',
            'Discharge planning status'
          ],
          stopCriteria: [
            'Vital sign instability',
            'Patient fatigue',
            'Medical team direction',
            'Discharge from facility'
          ]
        }
      ]
    }),
    evidenceCitation: 'Kahn SR, et al. Prevention of VTE in nonsurgical patients: Antithrombotic Therapy and Prevention of Thrombosis, 9th ed: American College of Chest Physicians Evidence-Based Clinical Practice Guidelines. Chest. 2012;141(2 Suppl):e195S-e226S. PMID: 22315261',
    isActive: 1
  }
];

try {
  console.log('🌱 Seeding clinical protocols...\n');

  // Clear existing protocols
  const deleteStmt = db.prepare('DELETE FROM clinical_protocols');
  const deleted = deleteStmt.run();
  console.log(`   Cleared ${deleted.changes} existing protocols\n`);

  // Insert new protocols
  const insertStmt = db.prepare(`
    INSERT INTO clinical_protocols (
      name,
      indication,
      contraindications,
      diagnosis_codes,
      protocol_data,
      evidence_citation,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const protocol of protocols) {
    const result = insertStmt.run(
      protocol.name,
      protocol.indication,
      protocol.contraindications,
      protocol.diagnosisCodes,
      protocol.protocolData,
      protocol.evidenceCitation,
      protocol.isActive
    );

    console.log(`✅ Created protocol: ${protocol.name}`);
    console.log(`   ID: ${result.lastInsertRowid}`);
    console.log(`   Indication: ${protocol.indication}`);

    const phases = JSON.parse(protocol.protocolData).phases;
    console.log(`   Phases: ${phases.length}`);
    phases.forEach((phase: any, idx: number) => {
      console.log(`      ${idx + 1}. ${phase.phase} (${phase.frequency}, ${phase.duration} min)`);
    });
    console.log();
  }

  console.log('✅ Protocol seeding complete!\n');
  console.log('📊 Summary:');
  console.log(`   Total protocols: ${protocols.length}`);
  console.log('   Categories: TKA, Pneumonia, General Med/Surg');
  console.log('   All protocols active and ready for use\n');

} catch (error: any) {
  console.error('❌ Error seeding protocols:', error.message);
  process.exit(1);
} finally {
  db.close();
}
