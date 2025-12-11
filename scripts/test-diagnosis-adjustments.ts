#!/usr/bin/env tsx

/**
 * Test diagnosis adjustments maintain total power dose
 */

interface BaselineProtocol {
  power: number; // watts
  duration: number; // minutes
  resistance: number; // 0-6 scale
  sessionsPerDay: number;
}

interface AdjustedProtocol extends BaselineProtocol {
  targetRPM: {
    min: number;
    max: number;
  };
  rationale: string;
  adjustments: string[];
}

// Simplified version for testing
function applyDiagnosisAdjustments(
  baseline: BaselineProtocol,
  diagnosis: string
): AdjustedProtocol {
  const totalDose = baseline.power * baseline.duration * baseline.sessionsPerDay;

  let adjusted: AdjustedProtocol = {
    ...baseline,
    targetRPM: { min: 30, max: 50 },
    rationale: "Standard protocol",
    adjustments: []
  };

  const diagnosisLower = diagnosis.toLowerCase();

  // ROM-focused diagnoses (lower resistance, higher RPM)
  if (diagnosisLower.includes('hip fracture') ||
      diagnosisLower.includes('knee') ||
      diagnosisLower.includes('tka')) {

    const newResistance = Math.max(0, Math.round(baseline.resistance * 0.6));
    const newRPM = { min: 40, max: 70 };
    const powerReductionFactor = 0.7;
    const newPower = Math.round(baseline.power * powerReductionFactor);
    const newDuration = Math.round(totalDose / (newPower * baseline.sessionsPerDay));

    adjusted = {
      power: newPower,
      duration: Math.min(newDuration, 25),
      resistance: newResistance,
      sessionsPerDay: baseline.sessionsPerDay,
      targetRPM: newRPM,
      rationale: "ROM-focused",
      adjustments: [`Resistance reduced`, `RPM increased`, `Duration adjusted`]
    };
  }

  // Strength-focused diagnoses (higher resistance, lower RPM)
  else if (diagnosisLower.includes('heart failure') ||
           diagnosisLower.includes('chf') ||
           diagnosisLower.includes('copd')) {

    const newResistance = Math.min(6, Math.round(baseline.resistance * 1.3));
    const newRPM = { min: 20, max: 40 };
    const powerIncreaseFactor = 1.25;
    const newPower = Math.round(baseline.power * powerIncreaseFactor);
    const newDuration = Math.round(totalDose / (newPower * baseline.sessionsPerDay));

    adjusted = {
      power: newPower,
      duration: Math.max(5, newDuration),
      resistance: newResistance,
      sessionsPerDay: baseline.sessionsPerDay,
      targetRPM: newRPM,
      rationale: "Strength-focused",
      adjustments: [`Resistance increased`, `RPM reduced`, `Duration adjusted`]
    };
  }

  return adjusted;
}

console.log('\n🧪 Testing Diagnosis Adjustments\n');
console.log('═'.repeat(70));

// Test baseline from risk calculator
const baseline: BaselineProtocol = {
  power: 15,
  duration: 10,
  resistance: 5,
  sessionsPerDay: 2
};

const baselineDose = baseline.power * baseline.duration * baseline.sessionsPerDay;
console.log('\n📊 BASELINE (from Risk Calculator)');
console.log(`Power: ${baseline.power}W`);
console.log(`Duration: ${baseline.duration} min`);
console.log(`Resistance: Level ${baseline.resistance}`);
console.log(`Sessions/Day: ${baseline.sessionsPerDay}`);
console.log(`Total Dose: ${baselineDose} Watt-Min`);

// Test diagnoses
const testDiagnoses = [
  "Hip Fracture",
  "Total Knee Arthroplasty",
  "Heart Failure",
  "COPD Exacerbation"
];

for (const diagnosis of testDiagnoses) {
  console.log('\n' + '─'.repeat(70));
  console.log(`\n💊 DIAGNOSIS: ${diagnosis}`);

  const adjusted = applyDiagnosisAdjustments(baseline, diagnosis);
  const adjustedDose = adjusted.power * adjusted.duration * adjusted.sessionsPerDay;

  console.log(`\nAdjusted Protocol:`);
  console.log(`  Power: ${adjusted.power}W (${adjusted.power > baseline.power ? '+' : ''}${adjusted.power - baseline.power}W)`);
  console.log(`  Duration: ${adjusted.duration} min (${adjusted.duration > baseline.duration ? '+' : ''}${adjusted.duration - baseline.duration} min)`);
  console.log(`  Resistance: Level ${adjusted.resistance} (${adjusted.resistance > baseline.resistance ? '+' : ''}${adjusted.resistance - baseline.resistance})`);
  console.log(`  Target RPM: ${adjusted.targetRPM.min}-${adjusted.targetRPM.max}`);
  console.log(`  Sessions/Day: ${adjusted.sessionsPerDay}`);
  console.log(`\nTotal Dose: ${adjustedDose} Watt-Min`);
  console.log(`Dose Difference: ${adjustedDose - baselineDose} Watt-Min (${((adjustedDose / baselineDose - 1) * 100).toFixed(1)}%)`);

  // Check if dose is maintained within acceptable range (±15%)
  const doseDiffPercent = Math.abs((adjustedDose / baselineDose - 1) * 100);
  if (doseDiffPercent <= 15) {
    console.log(`✅ Dose maintained within acceptable range`);
  } else {
    console.log(`⚠️  Dose variation exceeds 15%`);
  }

  console.log(`\nRationale: ${adjusted.rationale}`);
}

console.log('\n' + '═'.repeat(70));
console.log('\n✨ Test complete!\n');
