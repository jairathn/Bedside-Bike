/**
 * Diagnosis-specific protocol adjustments
 *
 * Takes baseline mobility dose from risk calculator and applies
 * diagnosis-specific adjustments while maintaining total power dose
 */

export interface BaselineProtocol {
  power: number; // watts
  duration: number; // minutes
  resistance: number; // 0-6 scale
  sessionsPerDay: number;
}

export interface AdjustedProtocol extends BaselineProtocol {
  targetRPM: {
    min: number;
    max: number;
  };
  rationale: string;
  adjustments: string[];
}

/**
 * Calculate adjusted protocol based on diagnosis
 * Maintains total power dose: power × duration × sessions = constant
 */
export function applyDiagnosisAdjustments(
  baseline: BaselineProtocol,
  diagnosis: string
): AdjustedProtocol {
  const totalDose = baseline.power * baseline.duration * baseline.sessionsPerDay;

  // Default: no adjustments
  let adjusted: AdjustedProtocol = {
    ...baseline,
    targetRPM: { min: 30, max: 50 },
    rationale: "Standard protocol based on patient risk profile",
    adjustments: []
  };

  const diagnosisLower = diagnosis.toLowerCase();

  // ROM-focused diagnoses (lower resistance, higher RPM)
  if (diagnosisLower.includes('hip fracture') ||
      diagnosisLower.includes('knee') ||
      diagnosisLower.includes('tka') ||
      diagnosisLower.includes('tha') ||
      diagnosisLower.includes('arthroplasty')) {

    // Reduce resistance by 40%
    const newResistance = Math.max(0, Math.round(baseline.resistance * 0.6));

    // Increase RPM range for ROM focus
    const newRPM = { min: 40, max: 70 };

    // Adjust duration to maintain total dose
    // Since we're reducing resistance, power output decreases
    // Estimate: resistance reduction of 40% ≈ 30% power reduction
    const powerReductionFactor = 0.7;
    const newPower = Math.round(baseline.power * powerReductionFactor);
    const newDuration = Math.round(totalDose / (newPower * baseline.sessionsPerDay));

    adjusted = {
      power: newPower,
      duration: Math.min(newDuration, 25), // Cap at 25 min for safety
      resistance: newResistance,
      sessionsPerDay: baseline.sessionsPerDay,
      targetRPM: newRPM,
      rationale: "ROM-focused protocol: Lower resistance, higher cadence to improve joint range of motion while maintaining energy expenditure",
      adjustments: [
        `Resistance reduced from ${baseline.resistance} to ${newResistance} (${Math.round((1 - newResistance/baseline.resistance) * 100)}% reduction)`,
        `RPM increased to ${newRPM.min}-${newRPM.max} for ROM focus`,
        `Duration adjusted to ${newDuration} minutes to maintain ${totalDose} watt-min total dose`
      ]
    };
  }

  // Strength-focused diagnoses (higher resistance, lower RPM)
  else if (diagnosisLower.includes('heart failure') ||
           diagnosisLower.includes('chf') ||
           diagnosisLower.includes('copd') ||
           diagnosisLower.includes('respiratory')) {

    // Increase resistance by 30% (but cap at 6)
    const newResistance = Math.min(6, Math.round(baseline.resistance * 1.3));

    // Lower RPM for strength focus, avoid aerobic stress
    const newRPM = { min: 20, max: 40 };

    // Adjust power and duration
    // Higher resistance ≈ 25% more power
    const powerIncreaseFactor = 1.25;
    const newPower = Math.round(baseline.power * powerIncreaseFactor);
    const newDuration = Math.round(totalDose / (newPower * baseline.sessionsPerDay));

    adjusted = {
      power: newPower,
      duration: Math.max(5, newDuration), // Minimum 5 min
      resistance: newResistance,
      sessionsPerDay: baseline.sessionsPerDay,
      targetRPM: newRPM,
      rationale: "Strength-focused protocol: Higher resistance, lower cadence to build leg strength (prognostic for cardiac/pulmonary patients) while avoiding aerobic stress",
      adjustments: [
        `Resistance increased from ${baseline.resistance} to ${newResistance} (${Math.round((newResistance/baseline.resistance - 1) * 100)}% increase)`,
        `RPM reduced to ${newRPM.min}-${newRPM.max} to minimize aerobic demand`,
        `Duration adjusted to ${newDuration} minutes to maintain ${totalDose} watt-min total dose`
      ]
    };
  }

  // Deconditioning/ICU (very low intensity, focus on movement)
  else if (diagnosisLower.includes('icu') ||
           diagnosisLower.includes('critical illness') ||
           diagnosisLower.includes('deconditioning')) {

    // Very low resistance
    const newResistance = Math.max(0, Math.round(baseline.resistance * 0.4));

    // Moderate RPM, focus on moving
    const newRPM = { min: 25, max: 45 };

    // Lower power, potentially longer sessions
    const powerReductionFactor = 0.5;
    const newPower = Math.round(baseline.power * powerReductionFactor);
    const newDuration = Math.round(totalDose / (newPower * baseline.sessionsPerDay));

    adjusted = {
      power: newPower,
      duration: Math.min(newDuration, 20),
      resistance: newResistance,
      sessionsPerDay: baseline.sessionsPerDay,
      targetRPM: newRPM,
      rationale: "Deconditioning protocol: Minimal resistance, focus on active movement and circulation",
      adjustments: [
        `Resistance reduced to ${newResistance} for patient safety`,
        `Power reduced to ${newPower}W for deconditioned state`,
        `Duration adjusted to ${newDuration} minutes to maintain energy expenditure`
      ]
    };
  }

  // Stroke/Neurological (balance and coordination focus)
  else if (diagnosisLower.includes('stroke') ||
           diagnosisLower.includes('cva') ||
           diagnosisLower.includes('parkinson')) {

    // Moderate resistance
    const newResistance = Math.max(1, Math.round(baseline.resistance * 0.75));

    // Moderate, steady RPM
    const newRPM = { min: 30, max: 50 };

    const powerReductionFactor = 0.8;
    const newPower = Math.round(baseline.power * powerReductionFactor);
    const newDuration = Math.round(totalDose / (newPower * baseline.sessionsPerDay));

    adjusted = {
      power: newPower,
      duration: newDuration,
      resistance: newResistance,
      sessionsPerDay: baseline.sessionsPerDay,
      targetRPM: newRPM,
      rationale: "Neurological protocol: Moderate intensity with focus on bilateral coordination and rhythmic movement",
      adjustments: [
        `Resistance reduced to ${newResistance} for better motor control`,
        `Steady cadence ${newRPM.min}-${newRPM.max} RPM for coordination`,
        `Duration ${newDuration} minutes to maintain therapeutic dose`
      ]
    };
  }

  return adjusted;
}

/**
 * Get diagnosis category for grouping
 */
export function getDiagnosisCategory(diagnosis: string): string {
  const diagnosisLower = diagnosis.toLowerCase();

  if (diagnosisLower.includes('hip') || diagnosisLower.includes('knee') || diagnosisLower.includes('arthroplasty')) {
    return 'Orthopedic/ROM Focus';
  }
  if (diagnosisLower.includes('heart') || diagnosisLower.includes('chf') || diagnosisLower.includes('copd')) {
    return 'Cardiac/Pulmonary/Strength Focus';
  }
  if (diagnosisLower.includes('icu') || diagnosisLower.includes('critical')) {
    return 'Critical Illness/Deconditioning';
  }
  if (diagnosisLower.includes('stroke') || diagnosisLower.includes('cva') || diagnosisLower.includes('parkinson')) {
    return 'Neurological';
  }
  return 'General Medical/Surgical';
}
