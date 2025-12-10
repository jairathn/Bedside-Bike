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
  // BASELINE PROTOCOL: Healthy 70-year-old
  {
    name: 'General Medical/Surgical - Standard (Healthy Baseline)',
    indication: 'General medical or surgical admission, relatively healthy baseline, minimal comorbidities',
    contraindications: JSON.stringify([
      'active bleeding',
      'unstable cardiovascular status',
      'acute MI <48 hours',
      'uncontrolled arrhythmias',
      'severe orthostatic hypotension (SBP drop >30 mmHg)'
    ]),
    diagnosisCodes: JSON.stringify([
      'Z51.89',  // Other specified aftercare
      'Z79.01',  // Long-term use of anticoagulants
      'R53.81',  // Other malaise and fatigue
      'Z74.01'   // Bed confinement status
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'Initial: Days 1-2',
          frequency: 'BID',
          duration: 15,
          resistance: { min: 1, max: 2 },
          rpm: { min: 30, max: 50 },
          goals: 'Prevent VTE, maintain baseline conditioning, assess tolerance',
          progressionCriteria: [
            'Completes 15 min with RPE <5/10',
            'Vital signs remain stable (HR <100 bpm)',
            'No adverse events'
          ],
          monitoringParams: [
            'Heart rate',
            'Blood pressure',
            'Perceived exertion (RPE)',
            'Lower extremity assessment'
          ],
          stopCriteria: [
            'HR >120 bpm',
            'SBP <90 or >180 mmHg',
            'Chest pain or pressure',
            'Severe dyspnea'
          ]
        },
        {
          phase: 'Maintenance: Day 3+',
          frequency: 'BID',
          duration: 20,
          resistance: { min: 2, max: 4 },
          rpm: { min: 40, max: 60 },
          goals: 'Maintain functional capacity, prevent deconditioning, optimize discharge readiness',
          progressionCriteria: [
            'Completes 20 min consistently',
            'Maintains RPM 40-60 throughout',
            'Reports improved energy'
          ],
          monitoringParams: [
            'Average power output',
            'Distance covered',
            'Patient engagement',
            'Discharge planning milestones'
          ],
          stopCriteria: [
            'HR >110 bpm sustained',
            'Patient fatigue (RPE >7/10)',
            'Medical team direction'
          ]
        }
      ]
    }),
    evidenceCitation: 'Parry SM, Puthucheary ZA. The impact of extended bed rest on the musculoskeletal system in the critical care environment. Extrem Physiol Med. 2015;4:16. PMID: 26457181',
    isActive: 1
  },
  // FRAIL ELDERLY PROTOCOL
  {
    name: 'Frail Elderly - Low Intensity',
    indication: 'Frail elderly (>75 years), multiple comorbidities, baseline dependent or walker-assisted',
    contraindications: JSON.stringify([
      'unstable medical condition',
      'severe cognitive impairment preventing participation',
      'acute delirium',
      'uncontrolled pain >7/10',
      'severe cardiopulmonary instability'
    ]),
    diagnosisCodes: JSON.stringify([
      'R54',     // Age-related physical debility
      'Z74.01',  // Bed confinement status
      'M62.81',  // Muscle weakness (generalized)
      'R26.81'   // Unsteadiness on feet
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'Initial: Days 1-3',
          frequency: 'BID',
          duration: 5,
          resistance: { min: 0, max: 1 },
          rpm: { min: 15, max: 30 },
          goals: 'Initiate gentle movement, prevent complete immobility, assess tolerance',
          progressionCriteria: [
            'Tolerates 5 min without distress',
            'Can achieve 20+ RPM',
            'Reports tolerable effort'
          ],
          monitoringParams: [
            'Heart rate',
            'Respiratory rate',
            'Perceived exertion',
            'Pain level',
            'Cognitive alertness'
          ],
          stopCriteria: [
            'HR >110 bpm',
            'RR >25/min',
            'Pain increase >2 points',
            'Patient requests stop',
            'Signs of confusion or delirium'
          ]
        },
        {
          phase: 'Progressive: Day 4+',
          frequency: 'BID',
          duration: 10,
          resistance: { min: 0, max: 2 },
          rpm: { min: 20, max: 40 },
          goals: 'Build tolerance gradually, maintain joint mobility, prevent contractures',
          progressionCriteria: [
            'Completes 10 min with minimal fatigue',
            'Maintains 25+ RPM',
            'Shows improved engagement'
          ],
          monitoringParams: [
            'Fatigue level',
            'Overall function',
            'Mood and engagement',
            'Joint ROM'
          ],
          stopCriteria: [
            'Excessive fatigue',
            'Vital sign instability',
            'Patient decline in status'
          ]
        }
      ]
    }),
    evidenceCitation: 'de Labra C, et al. Effects of physical exercise interventions in frail older adults: a systematic review of randomized controlled trials. BMC Geriatr. 2015;15:154. PMID: 26626157',
    isActive: 1
  },
  // HEART FAILURE PROTOCOL
  {
    name: 'Congestive Heart Failure (CHF) - Modified Protocol',
    indication: 'Acute decompensated heart failure, chronic CHF exacerbation',
    contraindications: JSON.stringify([
      'decompensated heart failure with clinical instability',
      'acute myocardial infarction <5 days',
      'uncontrolled arrhythmias',
      'severe aortic stenosis',
      'active myocarditis or pericarditis',
      'resting HR >100 bpm',
      'SBP >180 mmHg or <90 mmHg'
    ]),
    diagnosisCodes: JSON.stringify([
      'I50.9',   // Heart failure, unspecified
      'I50.21',  // Acute systolic heart failure
      'I50.23',  // Acute on chronic systolic heart failure
      'I50.31',  // Acute diastolic heart failure
      'I50.43'   // Acute on chronic combined systolic and diastolic heart failure
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'Stabilization: Days 1-3',
          frequency: 'BID',
          duration: 5,
          resistance: { min: 0, max: 1 },
          rpm: { min: 20, max: 35 },
          goals: 'Prevent deconditioning while minimizing cardiac workload, reduce VTE risk',
          progressionCriteria: [
            'Tolerates 5 min without dyspnea increase',
            'Stable vital signs throughout',
            'No signs of fluid overload worsening'
          ],
          monitoringParams: [
            'Heart rate',
            'Blood pressure',
            'SpO2',
            'Dyspnea score (0-10)',
            'Signs of fluid overload',
            'Borg RPE scale'
          ],
          stopCriteria: [
            'HR >110 bpm or increase >20 bpm from rest',
            'SBP decrease >10 mmHg',
            'SpO2 <90%',
            'Dyspnea worsening >2 points',
            'Chest pain, dizziness, or palpitations'
          ]
        },
        {
          phase: 'Recovery: Day 4+',
          frequency: 'BID',
          duration: 10,
          resistance: { min: 0, max: 2 },
          rpm: { min: 25, max: 45 },
          goals: 'Gradual reconditioning, improve functional capacity, support discharge planning',
          progressionCriteria: [
            'Completes 10 min with RPE <13/20 (Borg)',
            'Euvolemic status maintained',
            'Improved exercise tolerance'
          ],
          monitoringParams: [
            'HR and BP response',
            'Weight stability',
            'Dyspnea assessment',
            'BNP trends (if available)'
          ],
          stopCriteria: [
            'HR >100 bpm sustained',
            'SBP instability',
            'SpO2 <92%',
            'Worsening edema'
          ]
        }
      ]
    }),
    evidenceCitation: 'O\'Connor CM, et al. Efficacy and safety of exercise training in patients with chronic heart failure: HF-ACTION randomized controlled trial. JAMA. 2009;301(14):1439-50. PMID: 19351941',
    isActive: 1
  },
  // COPD PROTOCOL
  {
    name: 'COPD/Respiratory - Modified Protocol',
    indication: 'COPD exacerbation, chronic respiratory disease requiring hospitalization',
    contraindications: JSON.stringify([
      'SpO2 <88% on current O2',
      'acute respiratory failure requiring BiPAP/intubation',
      'hemodynamic instability',
      'active hemoptysis',
      'severe dyspnea at rest'
    ]),
    diagnosisCodes: JSON.stringify([
      'J44.1',   // COPD with acute exacerbation
      'J44.0',   // COPD with acute lower respiratory infection
      'J44.9',   // COPD, unspecified
      'J43.9'    // Emphysema, unspecified
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'Acute: Days 1-4',
          frequency: 'BID',
          duration: 5,
          resistance: { min: 0, max: 1 },
          rpm: { min: 20, max: 35 },
          goals: 'Maintain lower extremity conditioning without increasing dyspnea, prevent VTE',
          progressionCriteria: [
            'Tolerates 5 min without SpO2 drop',
            'RR remains <25/min',
            'Dyspnea score does not worsen'
          ],
          monitoringParams: [
            'SpO2 (continuous)',
            'Respiratory rate',
            'Dyspnea score (0-10)',
            'Heart rate',
            'Use of accessory muscles',
            'Pursed lip breathing'
          ],
          stopCriteria: [
            'SpO2 <88% or drop >4%',
            'RR >28/min',
            'HR >120 bpm',
            'Severe dyspnea (>7/10)',
            'Confusion or altered mental status'
          ]
        },
        {
          phase: 'Recovery: Day 5+',
          frequency: 'BID',
          duration: 10,
          resistance: { min: 0, max: 2 },
          rpm: { min: 25, max: 45 },
          goals: 'Rebuild endurance, reduce dyspnea with activity, optimize discharge readiness',
          progressionCriteria: [
            'Completes 10 min with stable vitals',
            'Decreased O2 requirements',
            'Improved dyspnea tolerance'
          ],
          monitoringParams: [
            'SpO2 trends',
            '6-minute walk distance equivalent',
            'Patient-reported breathing effort',
            'Secretion management'
          ],
          stopCriteria: [
            'SpO2 <90%',
            'Persistent tachypnea >25/min',
            'Excessive dyspnea',
            'Patient exhaustion'
          ]
        }
      ]
    }),
    evidenceCitation: 'Puhan MA, et al. Pulmonary rehabilitation following exacerbations of chronic obstructive pulmonary disease. Cochrane Database Syst Rev. 2016;12:CD005305. PMID: 27930803',
    isActive: 1
  },
  // POST-STROKE PROTOCOL
  {
    name: 'Stroke - Early Mobilization Protocol',
    indication: 'Ischemic or hemorrhagic stroke, post-stroke rehabilitation',
    contraindications: JSON.stringify([
      'acute hemorrhagic stroke <48 hours',
      'uncontrolled blood pressure (>180/110 mmHg)',
      'severe cognitive impairment preventing safe participation',
      'acute DVT in affected limb',
      'unstable neurological status'
    ]),
    diagnosisCodes: JSON.stringify([
      'I63.9',   // Cerebral infarction, unspecified
      'I61.9',   // Intracerebral hemorrhage, unspecified
      'I69.398', // Other sequelae of cerebral infarction
      'G81.90'   // Hemiplegia, unspecified affecting unspecified side
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'Early: Days 1-5',
          frequency: 'BID',
          duration: 10,
          resistance: { min: 0, max: 1 },
          rpm: { min: 15, max: 35 },
          goals: 'Initiate bilateral lower extremity movement, prevent immobility complications, assess motor function',
          progressionCriteria: [
            'Tolerates 10 min seated position',
            'Can achieve bilateral pedaling motion',
            'No worsening of neurological status'
          ],
          monitoringParams: [
            'Blood pressure (pre, during, post)',
            'Heart rate',
            'Bilateral pedaling symmetry',
            'Motor strength assessment',
            'Balance and trunk control',
            'Cognitive participation'
          ],
          stopCriteria: [
            'SBP >180 or <100 mmHg',
            'New neurological symptoms',
            'Severe headache',
            'Dizziness or visual changes',
            'Patient unable to participate safely'
          ]
        },
        {
          phase: 'Progressive: Day 6+',
          frequency: 'BID',
          duration: 15,
          resistance: { min: 1, max: 3 },
          rpm: { min: 20, max: 45 },
          goals: 'Improve affected limb strength, enhance bilateral coordination, support functional recovery',
          progressionCriteria: [
            'Completes 15 min with improving symmetry',
            'Increased resistance tolerance',
            'Demonstrates motor learning'
          ],
          monitoringParams: [
            'Power output symmetry (L vs R)',
            'Affected limb contribution',
            'Spasticity assessment',
            'Functional improvement measures'
          ],
          stopCriteria: [
            'BP instability',
            'Excessive spasticity',
            'Patient fatigue limiting safety',
            'Neurological decline'
          ]
        }
      ]
    }),
    evidenceCitation: 'AVERT Trial Collaboration Group. Efficacy and safety of very early mobilisation within 24 h of stroke onset (AVERT): a randomised controlled trial. Lancet. 2015;386(9988):46-55. PMID: 25892679',
    isActive: 1
  },
  // TOTAL KNEE ARTHROPLASTY (Original - keeping this)
  {
    name: 'Total Knee Arthroplasty (TKA) Early Mobilization',
    indication: 'Total knee replacement, knee arthroplasty',
    contraindications: JSON.stringify([
      'active DVT',
      'unstable fracture',
      'severe cardiovascular instability',
      'uncontrolled pain >7/10',
      'surgical complications (infection, wound dehiscence)'
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
            'ROM (degrees of flexion)',
            'Surgical site assessment'
          ],
          stopCriteria: [
            'Pain >7/10',
            'SBP <90 or >180 mmHg',
            'HR >120 bpm',
            'Patient request',
            'Excessive bleeding or drainage'
          ]
        },
        {
          phase: 'POD 3-7: Early Recovery',
          frequency: 'BID to TID',
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
            'Knee flexion ROM',
            'Quad activation'
          ],
          stopCriteria: [
            'Pain >6/10',
            'Significant increase in edema',
            'Vital sign instability',
            'Signs of surgical complications'
          ]
        },
        {
          phase: 'POD 8-14: Advanced Recovery',
          frequency: 'BID',
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
  // HIP FRACTURE PROTOCOL
  {
    name: 'Hip Fracture - Post-Surgical Protocol',
    indication: 'Hip fracture repair, ORIF hip, total hip arthroplasty for fracture',
    contraindications: JSON.stringify([
      'unstable fixation',
      'weight-bearing restrictions',
      'active DVT',
      'severe cardiovascular instability',
      'uncontrolled pain >7/10',
      'delirium preventing safe participation'
    ]),
    diagnosisCodes: JSON.stringify([
      'S72.001A', // Fracture of unspecified part of neck of right femur, initial encounter
      'S72.002A', // Fracture of unspecified part of neck of left femur, initial encounter
      'Z96.641',  // Presence of right artificial hip joint
      'Z96.642'   // Presence of left artificial hip joint
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'POD 1-3: Immediate Post-Op',
          frequency: 'BID',
          duration: 5,
          resistance: { min: 0, max: 1 },
          rpm: { min: 15, max: 30 },
          goals: 'Prevent VTE, initiate gentle ROM, assess cognitive status and participation',
          progressionCriteria: [
            'Tolerates 5 min without pain increase',
            'Demonstrates safe participation',
            'Alert and oriented'
          ],
          monitoringParams: [
            'Pain level',
            'Blood pressure',
            'Heart rate',
            'Cognitive status (CAM)',
            'Surgical precautions adherence',
            'Hip ROM within restrictions'
          ],
          stopCriteria: [
            'Pain >7/10',
            'Vital sign instability',
            'Confusion or delirium',
            'Hip precaution violation',
            'Patient unable to participate safely'
          ]
        },
        {
          phase: 'POD 4-7: Early Recovery',
          frequency: 'BID',
          duration: 10,
          resistance: { min: 0, max: 2 },
          rpm: { min: 20, max: 40 },
          goals: 'Build tolerance, prevent deconditioning, support mobility progression',
          progressionCriteria: [
            'Completes 10 min with stable vitals',
            'Pain well-controlled',
            'Progressing with PT goals'
          ],
          monitoringParams: [
            'Exercise tolerance',
            'Pain management',
            'Overall functional status',
            'Delirium screening'
          ],
          stopCriteria: [
            'Pain >6/10',
            'Cognitive decline',
            'Vital sign instability',
            'Surgical complications'
          ]
        },
        {
          phase: 'POD 8+: Progressive Recovery',
          frequency: 'BID',
          duration: 15,
          resistance: { min: 1, max: 3 },
          rpm: { min: 25, max: 50 },
          goals: 'Restore functional mobility, prepare for discharge destination',
          progressionCriteria: [
            'Completes 15 min consistently',
            'Meets discharge criteria',
            'Safe for next level of care'
          ],
          monitoringParams: [
            'Functional mobility',
            'Discharge planning milestones',
            'Patient engagement',
            'Overall recovery trajectory'
          ],
          stopCriteria: [
            'Pain limiting progress',
            'Medical complications',
            'Discharge from facility'
          ]
        }
      ]
    }),
    evidenceCitation: 'Handoll HH, et al. Interventions for treating proximal humeral fractures in adults. Cochrane Database Syst Rev. 2012;12:CD000434. PMID: 23235575',
    isActive: 1
  },
  // ICU DECONDITIONING PROTOCOL
  {
    name: 'ICU Deconditioning - Progressive Mobilization',
    indication: 'Post-ICU stay, critical illness myopathy, prolonged mechanical ventilation',
    contraindications: JSON.stringify([
      'hemodynamic instability requiring vasopressor titration',
      'active arrhythmias',
      'SpO2 <88% on current support',
      'ICP >20 mmHg',
      'FiO2 >0.6',
      'PEEP >10 cmH2O'
    ]),
    diagnosisCodes: JSON.stringify([
      'M62.81',  // Muscle weakness (generalized)
      'G72.81',  // Critical illness myopathy
      'Z99.11',  // Dependence on respirator [ventilator] status
      'R53.1'    // Weakness
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'Initial: Days 1-3',
          frequency: 'BID',
          duration: 5,
          resistance: { min: 0, max: 0 },
          rpm: { min: 10, max: 25 },
          goals: 'Initiate passive/active-assisted movement, prevent further deconditioning, assess tolerance',
          progressionCriteria: [
            'Tolerates 5 min without vital sign instability',
            'Can achieve some active participation',
            'No adverse events'
          ],
          monitoringParams: [
            'Heart rate',
            'Blood pressure',
            'SpO2',
            'Respiratory rate',
            'Level of alertness',
            'Muscle activation'
          ],
          stopCriteria: [
            'HR >130 bpm or <50 bpm',
            'SBP >180 or <90 mmHg',
            'SpO2 <88%',
            'RR >30/min',
            'New arrhythmias',
            'Patient distress'
          ]
        },
        {
          phase: 'Progressive: Day 4+',
          frequency: 'BID',
          duration: 10,
          resistance: { min: 0, max: 1 },
          rpm: { min: 15, max: 35 },
          goals: 'Increase active participation, rebuild muscle strength, improve endurance',
          progressionCriteria: [
            'Completes 10 min with active pedaling',
            'Demonstrates improving strength',
            'Stable medical status'
          ],
          monitoringParams: [
            'Active participation level',
            'Power output (even if minimal)',
            'Fatigue level',
            'Overall functional trajectory'
          ],
          stopCriteria: [
            'Vital sign instability',
            'Excessive fatigue',
            'Medical team direction',
            'Change in medical status'
          ]
        }
      ]
    }),
    evidenceCitation: 'Schweickert WD, et al. Early physical and occupational therapy in mechanically ventilated, critically ill patients: a randomised controlled trial. Lancet. 2009;373(9678):1874-82. PMID: 19446324',
    isActive: 1
  },
  // DELIRIUM/COGNITIVE IMPAIRMENT PROTOCOL
  {
    name: 'Delirium Management - Modified Mobilization',
    indication: 'Delirium, mild to moderate cognitive impairment, confusion',
    contraindications: JSON.stringify([
      'severe agitation requiring restraints',
      'inability to follow simple commands',
      'risk of harm to self or staff',
      'acute medical instability'
    ]),
    diagnosisCodes: JSON.stringify([
      'F05',     // Delirium due to known physiological condition
      'R41.0',   // Disorientation, unspecified
      'F03.90',  // Unspecified dementia without behavioral disturbance
      'R41.82'   // Altered mental status, unspecified
    ]),
    protocolData: JSON.stringify({
      phases: [
        {
          phase: 'Simplified Protocol',
          frequency: 'BID',
          duration: 10,
          resistance: { min: 0, max: 1 },
          rpm: { min: 15, max: 35 },
          goals: 'Provide structured activity, reduce delirium through mobilization, maintain safety',
          progressionCriteria: [
            'Tolerates 10 min with staff supervision',
            'No agitation during activity',
            'Shows engagement or reorientation'
          ],
          monitoringParams: [
            'Behavioral status',
            'Agitation level',
            'Participation quality',
            'Safety throughout',
            'CAM score (before and after)'
          ],
          stopCriteria: [
            'Increased agitation',
            'Patient distress',
            'Unsafe behaviors',
            'Staff determines unable to continue safely'
          ]
        }
      ]
    }),
    evidenceCitation: 'Inouye SK, et al. A multicomponent intervention to prevent delirium in hospitalized older patients. N Engl J Med. 1999;340(9):669-76. PMID: 10053175',
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
