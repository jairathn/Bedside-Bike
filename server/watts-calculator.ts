/**
 * Watts Calculator Utility
 *
 * Calculates equivalent power output (watts) for different mobility activities.
 * Based on Metabolic Equivalent of Task (METs) and body weight.
 *
 * Formula: Watts = (METs × 3.5 × weight_kg) / 200
 *
 * This allows us to create a unified "mobility score" across different activities.
 */

// MET values for different activities (conservative estimates for hospital patients)
const ACTIVITY_METS = {
  // Slow hospital walking (~2 mph with assistance)
  walk_slow: 2.3,
  // Sitting out of bed in chair (vs 1.0 for lying in bed)
  sit_chair: 1.3,
  // Bed-to-chair transfer (brief high exertion)
  transfer: 3.0,
  // Light cycling (low resistance)
  cycle_light: 3.5,
  // Moderate cycling (medium resistance)
  cycle_moderate: 5.0,
};

/**
 * Calculate equivalent watts for walking
 * Based on slow walking pace (~2 mph) typical in hospital settings
 */
export function calculateWalkingWatts(weightKg: number): number {
  const mets = ACTIVITY_METS.walk_slow;
  return Math.round((mets * 3.5 * weightKg) / 200);
}

/**
 * Calculate equivalent watts for sitting out of bed
 * This shows the metabolic benefit vs lying in bed
 */
export function calculateSittingWatts(weightKg: number): number {
  const mets = ACTIVITY_METS.sit_chair;
  return Math.round((mets * 3.5 * weightKg) / 200);
}

/**
 * Calculate approximate watts for cycling based on resistance level
 * Resistance 1-10 maps to approximately 15-60 watts
 */
export function calculateCyclingWatts(resistance: number): number {
  // Linear approximation: R1 = 15W, R10 = 60W
  const minWatts = 15;
  const maxWatts = 60;
  const normalizedResistance = Math.max(1, Math.min(10, resistance));
  return Math.round(minWatts + ((normalizedResistance - 1) / 9) * (maxWatts - minWatts));
}

/**
 * Get the appropriate MET value for an activity type
 */
export function getActivityMETs(activityType: string, resistance?: number): number {
  switch (activityType) {
    case 'walk':
      return ACTIVITY_METS.walk_slow;
    case 'sit':
      return ACTIVITY_METS.sit_chair;
    case 'transfer':
      return ACTIVITY_METS.transfer;
    case 'ride':
      // Cycling METs depend on resistance
      if (resistance && resistance >= 5) {
        return ACTIVITY_METS.cycle_moderate;
      }
      return ACTIVITY_METS.cycle_light;
    default:
      return 1.0;
  }
}

/**
 * Calculate equivalent watts for any activity type
 */
export function calculateEquivalentWatts(
  activityType: string,
  weightKg: number,
  resistance?: number
): number {
  switch (activityType) {
    case 'walk':
      return calculateWalkingWatts(weightKg);
    case 'sit':
      return calculateSittingWatts(weightKg);
    case 'ride':
      return resistance ? calculateCyclingWatts(resistance) : calculateCyclingWatts(3);
    case 'transfer':
      // Transfers are events, not duration-based, so watts doesn't apply directly
      return 0;
    default:
      return 0;
  }
}

/**
 * Convert imperial height (feet + inches) to centimeters
 */
export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = (feet * 12) + inches;
  return Math.round(totalInches * 2.54);
}

/**
 * Convert centimeters to feet and inches
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 10) / 10;
}

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return Math.round(kg / 0.453592);
}

/**
 * Format watts for display with "eq." suffix for calculated values
 */
export function formatWatts(watts: number, isCalculated: boolean = false): string {
  if (watts === 0) return '--';
  return isCalculated ? `${watts}W eq.` : `${watts}W`;
}

/**
 * Generate formatted clinical note for mobility summary
 */
export function generateMobilitySummary(
  patientName: string,
  date: string,
  activities: Array<{
    type: string;
    duration: number;
    watts: number;
    assistance?: string;
    transferCount?: number;
  }>,
  goalMinutes: number,
  streak: number,
  weeklyAverage: number
): string {
  // Calculate totals
  const totalMinutes = activities
    .filter(a => a.type !== 'transfer')
    .reduce((sum, a) => sum + a.duration, 0);
  const goalPercentage = Math.round((totalMinutes / goalMinutes) * 100);

  // Build the table
  const rows = activities.map(a => {
    const activityName = {
      ride: 'Cycling',
      walk: 'Walking',
      sit: 'Chair',
      transfer: 'Transfers'
    }[a.type] || a.type;

    const duration = a.type === 'transfer'
      ? `${a.transferCount || 0}x`
      : `${a.duration} min`;

    const output = a.watts > 0
      ? (a.type === 'ride' ? `${a.watts}W` : `${a.watts}W eq.`)
      : '--';

    const assist = a.assistance || 'N/A';

    return `│ ${activityName.padEnd(8)} │ ${duration.padEnd(8)} │ ${output.padEnd(10)} │ ${assist.padEnd(7)} │`;
  });

  return `MOBILITY SUMMARY - ${patientName} - ${date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Movement Today: ${totalMinutes} min (${goalPercentage}% of ${goalMinutes} min goal)
┌──────────┬──────────┬────────────┬─────────┐
│ Activity │ Duration │ Avg Output │ Assist  │
├──────────┼──────────┼────────────┼─────────┤
${rows.join('\n')}
└──────────┴──────────┴────────────┴─────────┘
7-Day Avg: ${weeklyAverage} min/day | Consistency: ${streak}-day streak`;
}
