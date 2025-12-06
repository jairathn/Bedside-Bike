/**
 * Alert System Types and Interfaces
 *
 * Defines types for smart clinical alerts and monitoring
 */

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

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id?: number;
  patientId: number;
  type: AlertType;
  priority: AlertPriority;
  message: string;
  actionRequired: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: number;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  type: AlertType;
  priority: AlertPriority;
  condition: (context: AlertContext) => Promise<boolean>;
  generateMessage: (context: AlertContext) => string;
  generateAction: (context: AlertContext) => string;
}

export interface AlertContext {
  patientId: number;
  sessionId?: number;
  session?: any;
  lastSession?: any;
  protocol?: any;
  prescription?: any;
  todaySessions?: any[];
  hoursSinceLastSession?: number;
  [key: string]: any;
}

export interface AlertSummary {
  total: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<string, number>;
  unacknowledged: number;
}
