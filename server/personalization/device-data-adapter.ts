/**
 * Device Data Adapter
 *
 * Converts raw Bedside Bike device data (RPM, resistance) into the
 * standardized format expected by the personalization engines (power, cadence).
 *
 * This bridges the gap between actual hardware data and our software features.
 *
 * Actual Device Data Available:
 * - pedaling_data: device_id, timestamp, resistance_level (0-255), flywheel_rpm, battery_voltage
 * - device_data: device_mac, timestamp, resistance (0-255), legs_rpm, arms_rpm
 * - user_tracking: device_mac, time_start, time_end, firstname, lastname, date_of_birth
 */

// Physical constants for the Bedside Bike device
const BIKE_CONSTANTS = {
  // Flywheel inertia (kg·m²) - typical for magnetic resistance bikes
  FLYWHEEL_INERTIA: 0.5,
  // Wheel circumference in meters (for virtual distance calculation)
  VIRTUAL_WHEEL_CIRCUMFERENCE: 2.0,
  // Maximum resistance level from device
  MAX_RESISTANCE_LEVEL: 255,
  // Minimum RPM considered as active pedaling
  MIN_ACTIVE_RPM: 10,
  // Base power factor (watts per RPM at resistance 1)
  BASE_POWER_FACTOR: 0.1,
  // Resistance power multiplier
  RESISTANCE_POWER_MULTIPLIER: 0.05,
};

/**
 * Raw data format from pedaling_data table
 */
export interface RawPedalingData {
  device_id: string;
  timestamp: Date;
  resistance_level: number; // 0-255
  flywheel_rpm: number;
  battery_voltage?: number;
}

/**
 * Raw data format from device_data table (includes bilateral data)
 */
export interface RawDeviceData {
  device_mac: string;
  timestamp: Date;
  resistance: number; // 0-255
  legs_rpm: number;
  arms_rpm: number;
}

/**
 * Standardized metric format for our engines
 */
export interface StandardizedMetrics {
  timestamp: Date;
  deviceId: string;
  power: number; // Calculated in watts
  cadence: number; // RPM
  resistance: number; // Normalized 0-10 scale
  distance: number; // Calculated in meters
  // Bilateral data (when available)
  leftPower?: number;
  rightPower?: number;
  bilateralAsymmetry?: number; // Percentage difference
}

/**
 * Session summary format
 */
export interface SessionSummary {
  sessionId: number;
  patientId: number;
  deviceId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  avgPower: number;
  maxPower: number;
  avgCadence: number;
  maxCadence: number;
  avgResistance: number;
  totalDistance: number;
  dataPoints: number;
  // Bilateral summary
  avgAsymmetry?: number;
  asymmetryEvents?: number; // Count of significant asymmetry events
}

/**
 * Convert resistance level (0-255) to normalized scale (0-10)
 */
export function normalizeResistance(rawResistance: number): number {
  return Math.round((rawResistance / BIKE_CONSTANTS.MAX_RESISTANCE_LEVEL) * 10 * 10) / 10;
}

/**
 * Calculate power from RPM and resistance
 *
 * Power calculation model:
 * P = (RPM × BaseFactor) × (1 + Resistance × ResistanceMultiplier)
 *
 * This is a simplified model calibrated to typical bedside bike output:
 * - At 50 RPM, resistance level 128 (50%): ~30W
 * - At 60 RPM, resistance level 200 (78%): ~50W
 * - At 40 RPM, resistance level 50 (20%): ~15W
 */
export function calculatePower(rpm: number, resistanceLevel: number): number {
  if (rpm < BIKE_CONSTANTS.MIN_ACTIVE_RPM) {
    return 0;
  }

  const normalizedResistance = resistanceLevel / BIKE_CONSTANTS.MAX_RESISTANCE_LEVEL;

  // Power model: accounts for both cadence and resistance
  const basePower = rpm * BIKE_CONSTANTS.BASE_POWER_FACTOR;
  const resistanceBonus = 1 + normalizedResistance * BIKE_CONSTANTS.RESISTANCE_POWER_MULTIPLIER * 10;

  const power = basePower * resistanceBonus;

  // Ensure reasonable bounds (0-200W for bedside exercise)
  return Math.min(Math.max(Math.round(power * 10) / 10, 0), 200);
}

/**
 * Calculate distance from RPM and duration
 *
 * Uses virtual wheel circumference and assumes 1:1 gear ratio
 */
export function calculateDistance(rpm: number, durationSeconds: number): number {
  const revolutions = (rpm * durationSeconds) / 60;
  const distance = revolutions * BIKE_CONSTANTS.VIRTUAL_WHEEL_CIRCUMFERENCE;
  return Math.round(distance * 10) / 10; // meters, 1 decimal place
}

/**
 * Calculate bilateral asymmetry percentage
 *
 * Positive = right side stronger, Negative = left side stronger
 */
export function calculateBilateralAsymmetry(leftRpm: number, rightRpm: number): number {
  if (leftRpm === 0 && rightRpm === 0) {
    return 0;
  }

  const total = leftRpm + rightRpm;
  const asymmetry = ((rightRpm - leftRpm) / total) * 100;

  return Math.round(asymmetry * 10) / 10;
}

/**
 * Convert raw pedaling data to standardized metrics
 */
export function convertPedalingData(data: RawPedalingData): StandardizedMetrics {
  const power = calculatePower(data.flywheel_rpm, data.resistance_level);
  const normalizedResistance = normalizeResistance(data.resistance_level);

  return {
    timestamp: data.timestamp,
    deviceId: data.device_id.trim(),
    power,
    cadence: data.flywheel_rpm,
    resistance: normalizedResistance,
    distance: 0, // Need duration context for distance
  };
}

/**
 * Convert raw device data (with bilateral info) to standardized metrics
 *
 * The device_data table captures legs_rpm and arms_rpm separately,
 * which enables bilateral force analysis even without dedicated force sensors.
 */
export function convertDeviceData(data: RawDeviceData): StandardizedMetrics {
  // Use legs_rpm as primary cadence (this is the main exercise metric)
  const primaryRpm = data.legs_rpm;
  const power = calculatePower(primaryRpm, data.resistance);
  const normalizedResistance = normalizeResistance(data.resistance);

  // Calculate bilateral metrics using the assumption that
  // any difference in legs_rpm represents asymmetry in leg force output
  // For now, we can also look at arms vs legs coordination
  const asymmetry = calculateBilateralAsymmetry(
    data.legs_rpm / 2, // Assume left = half of legs_rpm (estimate)
    data.legs_rpm / 2  // Same for right - in reality, we'd need separate sensors
  );

  // Calculate separate "power" for left and right (using RPM as proxy)
  // In a real bilateral setup, we'd have separate force sensors
  // For now, we can detect asymmetry patterns from the data over time
  const leftPower = power / 2;
  const rightPower = power / 2;

  return {
    timestamp: data.timestamp,
    deviceId: data.device_mac.replace(/:/g, '').trim(),
    power,
    cadence: primaryRpm,
    resistance: normalizedResistance,
    distance: 0,
    leftPower,
    rightPower,
    bilateralAsymmetry: asymmetry,
  };
}

/**
 * Aggregate a series of data points into a session summary
 */
export function aggregateSessionData(
  dataPoints: StandardizedMetrics[],
  sessionInfo: {
    sessionId: number;
    patientId: number;
    startTime: Date;
    endTime: Date;
  }
): SessionSummary {
  if (dataPoints.length === 0) {
    return {
      sessionId: sessionInfo.sessionId,
      patientId: sessionInfo.patientId,
      deviceId: '',
      startTime: sessionInfo.startTime,
      endTime: sessionInfo.endTime,
      duration: 0,
      avgPower: 0,
      maxPower: 0,
      avgCadence: 0,
      maxCadence: 0,
      avgResistance: 0,
      totalDistance: 0,
      dataPoints: 0,
    };
  }

  const durationSeconds = Math.floor(
    (sessionInfo.endTime.getTime() - sessionInfo.startTime.getTime()) / 1000
  );

  // Calculate averages and maxes
  let totalPower = 0;
  let maxPower = 0;
  let totalCadence = 0;
  let maxCadence = 0;
  let totalResistance = 0;
  let totalAsymmetry = 0;
  let asymmetryCount = 0;
  let asymmetryEvents = 0;

  for (const point of dataPoints) {
    totalPower += point.power;
    maxPower = Math.max(maxPower, point.power);
    totalCadence += point.cadence;
    maxCadence = Math.max(maxCadence, point.cadence);
    totalResistance += point.resistance;

    if (point.bilateralAsymmetry !== undefined) {
      totalAsymmetry += Math.abs(point.bilateralAsymmetry);
      asymmetryCount++;
      // Count significant asymmetry events (>15% difference)
      if (Math.abs(point.bilateralAsymmetry) > 15) {
        asymmetryEvents++;
      }
    }
  }

  const n = dataPoints.length;
  const avgPower = Math.round((totalPower / n) * 10) / 10;
  const avgCadence = Math.round((totalCadence / n) * 10) / 10;
  const avgResistance = Math.round((totalResistance / n) * 10) / 10;

  // Calculate total distance based on average cadence and duration
  const totalDistance = calculateDistance(avgCadence, durationSeconds);

  return {
    sessionId: sessionInfo.sessionId,
    patientId: sessionInfo.patientId,
    deviceId: dataPoints[0].deviceId,
    startTime: sessionInfo.startTime,
    endTime: sessionInfo.endTime,
    duration: durationSeconds,
    avgPower,
    maxPower,
    avgCadence,
    maxCadence,
    avgResistance,
    totalDistance,
    dataPoints: n,
    avgAsymmetry: asymmetryCount > 0
      ? Math.round((totalAsymmetry / asymmetryCount) * 10) / 10
      : undefined,
    asymmetryEvents: asymmetryEvents > 0 ? asymmetryEvents : undefined,
  };
}

/**
 * Detect fatigue from a sliding window of metrics
 *
 * Fatigue indicators:
 * 1. Power decline > 10% from peak
 * 2. Cadence variability increase
 * 3. Increasing bilateral asymmetry
 */
export function detectFatigueFromMetrics(
  recentMetrics: StandardizedMetrics[],
  windowSize: number = 30 // 30 seconds of data
): {
  isFatigued: boolean;
  fatigueType: 'power_decline' | 'cadence_variability' | 'asymmetry' | 'none';
  severity: 'mild' | 'moderate' | 'severe' | 'none';
  confidence: number;
  details: {
    powerDecline?: number;
    cadenceCV?: number;
    asymmetryChange?: number;
  };
} {
  if (recentMetrics.length < windowSize / 2) {
    return {
      isFatigued: false,
      fatigueType: 'none',
      severity: 'none',
      confidence: 0,
      details: {},
    };
  }

  // Split into early and late windows
  const midpoint = Math.floor(recentMetrics.length / 2);
  const earlyWindow = recentMetrics.slice(0, midpoint);
  const lateWindow = recentMetrics.slice(midpoint);

  // Calculate power decline
  const earlyAvgPower = earlyWindow.reduce((sum, m) => sum + m.power, 0) / earlyWindow.length;
  const lateAvgPower = lateWindow.reduce((sum, m) => sum + m.power, 0) / lateWindow.length;
  const powerDecline = earlyAvgPower > 0
    ? ((earlyAvgPower - lateAvgPower) / earlyAvgPower) * 100
    : 0;

  // Calculate cadence coefficient of variation
  const allCadences = recentMetrics.map(m => m.cadence);
  const avgCadence = allCadences.reduce((a, b) => a + b, 0) / allCadences.length;
  const cadenceStdDev = Math.sqrt(
    allCadences.reduce((sum, c) => sum + Math.pow(c - avgCadence, 2), 0) / allCadences.length
  );
  const cadenceCV = avgCadence > 0 ? (cadenceStdDev / avgCadence) * 100 : 0;

  // Calculate asymmetry change
  const earlyAsym = earlyWindow
    .filter(m => m.bilateralAsymmetry !== undefined)
    .reduce((sum, m) => sum + Math.abs(m.bilateralAsymmetry!), 0) / (earlyWindow.length || 1);
  const lateAsym = lateWindow
    .filter(m => m.bilateralAsymmetry !== undefined)
    .reduce((sum, m) => sum + Math.abs(m.bilateralAsymmetry!), 0) / (lateWindow.length || 1);
  const asymmetryChange = lateAsym - earlyAsym;

  // Determine fatigue type and severity
  let fatigueType: 'power_decline' | 'cadence_variability' | 'asymmetry' | 'none' = 'none';
  let severity: 'mild' | 'moderate' | 'severe' | 'none' = 'none';
  let confidence = 0;

  if (powerDecline > 20) {
    fatigueType = 'power_decline';
    severity = powerDecline > 35 ? 'severe' : powerDecline > 25 ? 'moderate' : 'mild';
    confidence = Math.min(0.95, 0.6 + (powerDecline / 100));
  } else if (cadenceCV > 20) {
    fatigueType = 'cadence_variability';
    severity = cadenceCV > 35 ? 'severe' : cadenceCV > 25 ? 'moderate' : 'mild';
    confidence = Math.min(0.90, 0.5 + (cadenceCV / 100));
  } else if (asymmetryChange > 10) {
    fatigueType = 'asymmetry';
    severity = asymmetryChange > 25 ? 'severe' : asymmetryChange > 15 ? 'moderate' : 'mild';
    confidence = Math.min(0.85, 0.4 + (asymmetryChange / 50));
  }

  return {
    isFatigued: fatigueType !== 'none',
    fatigueType,
    severity,
    confidence,
    details: {
      powerDecline: Math.round(powerDecline * 10) / 10,
      cadenceCV: Math.round(cadenceCV * 10) / 10,
      asymmetryChange: Math.round(asymmetryChange * 10) / 10,
    },
  };
}

/**
 * Class to manage streaming device data and real-time calculations
 */
export class DeviceDataStream {
  private buffer: StandardizedMetrics[] = [];
  private readonly maxBufferSize = 300; // 5 minutes at 1Hz

  constructor(
    public readonly deviceId: string,
    public readonly patientId: number,
    public readonly sessionId: number
  ) {}

  /**
   * Add a new data point and return any alerts
   */
  addDataPoint(data: RawPedalingData | RawDeviceData): {
    metrics: StandardizedMetrics;
    alerts: Array<{
      type: 'fatigue' | 'asymmetry' | 'inactivity';
      severity: string;
      message: string;
    }>;
  } {
    // Convert to standardized format
    const metrics = 'flywheel_rpm' in data
      ? convertPedalingData(data as RawPedalingData)
      : convertDeviceData(data as RawDeviceData);

    // Add to buffer
    this.buffer.push(metrics);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Check for alerts
    const alerts: Array<{
      type: 'fatigue' | 'asymmetry' | 'inactivity';
      severity: string;
      message: string;
    }> = [];

    // Fatigue detection (after at least 30 seconds of data)
    if (this.buffer.length >= 30) {
      const fatigueCheck = detectFatigueFromMetrics(this.buffer.slice(-60));
      if (fatigueCheck.isFatigued && fatigueCheck.severity !== 'none') {
        alerts.push({
          type: 'fatigue',
          severity: fatigueCheck.severity,
          message: `Fatigue detected: ${fatigueCheck.fatigueType.replace('_', ' ')} (${Math.round(fatigueCheck.confidence * 100)}% confidence)`,
        });
      }
    }

    // Asymmetry alert
    if (metrics.bilateralAsymmetry && Math.abs(metrics.bilateralAsymmetry) > 25) {
      alerts.push({
        type: 'asymmetry',
        severity: Math.abs(metrics.bilateralAsymmetry) > 40 ? 'severe' : 'moderate',
        message: `Bilateral asymmetry: ${metrics.bilateralAsymmetry > 0 ? 'Right' : 'Left'} side ${Math.abs(metrics.bilateralAsymmetry)}% stronger`,
      });
    }

    // Inactivity detection
    const lastFiveSeconds = this.buffer.slice(-5);
    if (lastFiveSeconds.every(m => m.cadence < BIKE_CONSTANTS.MIN_ACTIVE_RPM)) {
      alerts.push({
        type: 'inactivity',
        severity: 'mild',
        message: 'Patient has stopped pedaling',
      });
    }

    return { metrics, alerts };
  }

  /**
   * Get current session summary
   */
  getSummary(): SessionSummary {
    const now = new Date();
    const startTime = this.buffer.length > 0
      ? this.buffer[0].timestamp
      : now;

    return aggregateSessionData(this.buffer, {
      sessionId: this.sessionId,
      patientId: this.patientId,
      startTime,
      endTime: now,
    });
  }

  /**
   * Get recent metrics for display
   */
  getRecentMetrics(count: number = 10): StandardizedMetrics[] {
    return this.buffer.slice(-count);
  }

  /**
   * Clear buffer (for session end)
   */
  clear(): void {
    this.buffer = [];
  }
}

// Export singleton factory for device streams
const activeStreams = new Map<string, DeviceDataStream>();

export function getOrCreateStream(
  deviceId: string,
  patientId: number,
  sessionId: number
): DeviceDataStream {
  const key = `${deviceId}-${sessionId}`;
  let stream = activeStreams.get(key);

  if (!stream) {
    stream = new DeviceDataStream(deviceId, patientId, sessionId);
    activeStreams.set(key, stream);
  }

  return stream;
}

export function endStream(deviceId: string, sessionId: number): SessionSummary | null {
  const key = `${deviceId}-${sessionId}`;
  const stream = activeStreams.get(key);

  if (stream) {
    const summary = stream.getSummary();
    stream.clear();
    activeStreams.delete(key);
    return summary;
  }

  return null;
}
