/**
 * Type definitions for WebSocket communication
 * These interfaces define the contract between devices and the web application
 */

/**
 * Session metrics update from device
 * When you get the actual device protocol, just update this interface
 */
export interface SessionUpdate {
  sessionId: number;
  patientId: number;
  deviceId: string;
  timestamp: Date;
  metrics: {
    rpm: number;           // Revolutions per minute
    power: number;         // Watts
    distance: number;      // Meters
    duration: number;      // Seconds since session start
    heartRate?: number;    // Optional heart rate (if device has sensor)
    resistance?: number;   // Optional resistance level
  };
  status: 'active' | 'paused' | 'completed';
}

/**
 * Alert message sent to providers
 */
export interface Alert {
  id?: number;
  patientId: number;
  type: AlertType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actionRequired: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: number;
  metadata?: any;
}

export type AlertType =
  | 'session_incomplete'
  | 'session_paused_long'
  | 'no_activity_24h'
  | 'no_activity_48h'
  | 'risk_increase'
  | 'protocol_non_compliance'
  | 'abnormal_vitals'
  | 'goal_not_met'
  | 'device_disconnected';

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: 'session_update' | 'alert' | 'device_status' | 'command';
  data: any;
}

/**
 * Device status update
 */
export interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
  batteryLevel?: number;
  lastHeartbeat: Date;
  firmwareVersion?: string;
}

/**
 * Command from provider to device (future use)
 */
export interface DeviceCommand {
  deviceId: string;
  command: 'start' | 'stop' | 'pause' | 'set_resistance' | 'set_goal';
  parameters?: any;
}
