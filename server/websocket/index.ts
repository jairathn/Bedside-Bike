import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../logger';
import { db } from '../db';
import { exerciseSessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { SessionUpdate, Alert, WebSocketMessage, DeviceStatus } from './types';

/**
 * WebSocket Server for Real-Time Device Communication
 *
 * Handles bidirectional communication between:
 * - Devices (Bedside Bikes) → Server
 * - Server → Provider Web Clients (nurses, PTs)
 *
 * Architecture:
 * - Device connects with ?type=device&deviceId=XXX
 * - Provider connects with ?type=provider&patientId=XXX
 * - Messages route: Device → Server → Database → All providers watching patient
 */
export class DeviceBridgeWebSocket {
  private wss: WebSocketServer;
  private deviceConnections = new Map<string, WebSocket>();
  private providerConnections = new Map<string, Set<WebSocket>>();
  private deviceHeartbeats = new Map<string, NodeJS.Timeout>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/device-bridge',
      // Handle CORS for WebSocket
      verifyClient: (info) => {
        // In production, add proper authentication here
        return true;
      }
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });

    logger.info('WebSocket server initialized', {
      path: '/ws/device-bridge',
      status: 'ready'
    });

    // Start heartbeat checker for device connections
    this.startHeartbeatMonitor();
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any) {
    const url = new URL(req.url, 'http://localhost');
    const clientType = url.searchParams.get('type'); // 'device' | 'provider'
    const deviceId = url.searchParams.get('deviceId');
    const patientId = url.searchParams.get('patientId');

    if (clientType === 'device' && deviceId) {
      this.handleDeviceConnection(ws, deviceId);
    } else if (clientType === 'provider' && patientId) {
      this.handleProviderConnection(ws, patientId);
    } else {
      logger.warn('WebSocket connection rejected - invalid parameters', {
        clientType,
        deviceId,
        patientId
      });
      ws.close(1008, 'Invalid connection parameters');
    }
  }

  /**
   * Handle device connection (Bedside Bike hardware)
   */
  private handleDeviceConnection(ws: WebSocket, deviceId: string) {
    this.deviceConnections.set(deviceId, ws);
    logger.info('Device connected', { deviceId, totalDevices: this.deviceConnections.size });

    // Send welcome message
    this.sendToDevice(deviceId, {
      type: 'device_status',
      data: { status: 'connected', message: 'Connected to Bedside Bike server' }
    });

    // Setup heartbeat
    this.setupDeviceHeartbeat(deviceId);

    ws.on('message', async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'session_update':
            await this.handleSessionUpdate(message.data as SessionUpdate);
            break;
          case 'device_status':
            await this.handleDeviceStatus(message.data as DeviceStatus);
            break;
          default:
            logger.warn('Unknown message type from device', {
              deviceId,
              type: message.type
            });
        }
      } catch (error: any) {
        logger.error('Error processing device message', {
          error: error.message,
          deviceId,
          data: data.toString().substring(0, 100)
        });
      }
    });

    ws.on('close', () => {
      this.deviceConnections.delete(deviceId);
      this.clearDeviceHeartbeat(deviceId);
      logger.info('Device disconnected', {
        deviceId,
        totalDevices: this.deviceConnections.size
      });

      // Notify providers that device went offline
      this.broadcastDeviceStatus({
        deviceId,
        status: 'offline',
        lastHeartbeat: new Date()
      });
    });

    ws.on('error', (error) => {
      logger.error('Device WebSocket error', { deviceId, error: error.message });
    });

    // Respond to pings
    ws.on('ping', () => {
      ws.pong();
      this.resetDeviceHeartbeat(deviceId);
    });
  }

  /**
   * Handle provider connection (nurses, PTs viewing dashboard)
   */
  private handleProviderConnection(ws: WebSocket, patientId: string) {
    if (!this.providerConnections.has(patientId)) {
      this.providerConnections.set(patientId, new Set());
    }
    this.providerConnections.get(patientId)!.add(ws);

    logger.info('Provider connected', {
      patientId,
      totalProviders: this.getTotalProviderConnections()
    });

    // Send current active sessions for this patient
    this.sendCurrentSessionStatus(ws, parseInt(patientId));

    ws.on('close', () => {
      this.providerConnections.get(patientId)?.delete(ws);
      if (this.providerConnections.get(patientId)?.size === 0) {
        this.providerConnections.delete(patientId);
      }
      logger.info('Provider disconnected', {
        patientId,
        totalProviders: this.getTotalProviderConnections()
      });
    });

    ws.on('error', (error) => {
      logger.error('Provider WebSocket error', { patientId, error: error.message });
    });
  }

  /**
   * Process session update from device
   */
  private async handleSessionUpdate(update: SessionUpdate): Promise<void> {
    try {
      logger.debug('Processing session update', {
        sessionId: update.sessionId,
        patientId: update.patientId,
        deviceId: update.deviceId,
        status: update.status,
        rpm: update.metrics.rpm,
        power: update.metrics.power
      });

      // Update database with current metrics
      await db.update(exerciseSessions)
        .set({
          currentRpm: update.metrics.rpm,
          currentPower: update.metrics.power,
          distanceMeters: update.metrics.distance,
          durationSeconds: update.metrics.duration,
          currentStatus: update.status,
          updatedAt: new Date()
        })
        .where(eq(exerciseSessions.id, update.sessionId));

      // Broadcast to all providers watching this patient
      this.broadcastToProviders(update.patientId, {
        type: 'session_update',
        data: update
      });

      // Check for alerts
      await this.checkSessionAlerts(update);

    } catch (error: any) {
      logger.error('Failed to process session update', {
        error: error.message,
        sessionId: update.sessionId
      });
    }
  }

  /**
   * Handle device status update
   */
  private async handleDeviceStatus(status: DeviceStatus): Promise<void> {
    logger.debug('Device status update', status);
    this.broadcastDeviceStatus(status);
  }

  /**
   * Check for alert conditions during session update
   * Uses alert engine for comprehensive alert checking
   */
  private async checkSessionAlerts(update: SessionUpdate): Promise<void> {
    try {
      // Only check alerts when session is completed
      if (update.status === 'completed') {
        const { alertEngine } = await import('../alerts/alert-engine');
        const alerts = await alertEngine.checkSessionAlerts(update.sessionId);

        // Broadcast all generated alerts via WebSocket
        for (const alert of alerts) {
          this.broadcastAlert(alert);
        }

        if (alerts.length > 0) {
          logger.info('Session alerts generated and broadcast', {
            sessionId: update.sessionId,
            alertCount: alerts.length
          });
        }
      }
    } catch (error: any) {
      logger.error('Failed to check session alerts', {
        error: error.message,
        sessionId: update.sessionId
      });
    }
  }

  /**
   * Broadcast message to all providers watching a patient
   */
  private broadcastToProviders(patientId: number, message: WebSocketMessage): void {
    const connections = this.providerConnections.get(patientId.toString());
    if (!connections) return;

    const messageStr = JSON.stringify(message);
    let sent = 0;

    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sent++;
      }
    });

    logger.debug('Broadcast to providers', { patientId, providerCount: sent });
  }

  /**
   * Broadcast alert to providers
   */
  public broadcastAlert(alert: Alert): void {
    this.broadcastToProviders(alert.patientId, {
      type: 'alert',
      data: alert
    });

    logger.info('Alert broadcast', {
      patientId: alert.patientId,
      type: alert.type,
      priority: alert.priority
    });
  }

  /**
   * Broadcast device status to all providers
   */
  private broadcastDeviceStatus(status: DeviceStatus): void {
    // In future, map deviceId to patientId and broadcast to relevant providers
    logger.debug('Device status broadcast', status);
  }

  /**
   * Send message to specific device
   */
  public sendToDevice(deviceId: string, message: WebSocketMessage): boolean {
    const ws = this.deviceConnections.get(deviceId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send to device - not connected', { deviceId });
      return false;
    }

    ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * Send current session status to newly connected provider
   */
  private async sendCurrentSessionStatus(ws: WebSocket, patientId: number): Promise<void> {
    try {
      // Get active sessions for this patient
      const activeSessions = await db.select()
        .from(exerciseSessions)
        .where(eq(exerciseSessions.patientId, patientId));

      if (activeSessions.length > 0) {
        ws.send(JSON.stringify({
          type: 'session_update',
          data: {
            type: 'initial_state',
            sessions: activeSessions
          }
        }));
      }
    } catch (error: any) {
      logger.error('Failed to send current session status', {
        error: error.message,
        patientId
      });
    }
  }

  /**
   * Heartbeat monitoring for devices
   */
  private startHeartbeatMonitor(): void {
    setInterval(() => {
      this.deviceConnections.forEach((ws, deviceId) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 30000); // Ping every 30 seconds
  }

  private setupDeviceHeartbeat(deviceId: string): void {
    this.clearDeviceHeartbeat(deviceId);

    const timeout = setTimeout(() => {
      logger.warn('Device heartbeat timeout', { deviceId });
      this.deviceConnections.get(deviceId)?.close();
    }, 60000); // 60 second timeout

    this.deviceHeartbeats.set(deviceId, timeout);
  }

  private resetDeviceHeartbeat(deviceId: string): void {
    this.setupDeviceHeartbeat(deviceId);
  }

  private clearDeviceHeartbeat(deviceId: string): void {
    const timeout = this.deviceHeartbeats.get(deviceId);
    if (timeout) {
      clearTimeout(timeout);
      this.deviceHeartbeats.delete(deviceId);
    }
  }

  /**
   * Get total number of provider connections
   */
  private getTotalProviderConnections(): number {
    let total = 0;
    this.providerConnections.forEach(set => {
      total += set.size;
    });
    return total;
  }

  /**
   * Get server statistics
   */
  public getStats() {
    return {
      devices: {
        connected: this.deviceConnections.size,
        deviceIds: Array.from(this.deviceConnections.keys())
      },
      providers: {
        total: this.getTotalProviderConnections(),
        byPatient: Array.from(this.providerConnections.entries()).map(([patientId, connections]) => ({
          patientId,
          connections: connections.size
        }))
      }
    };
  }

  /**
   * Shutdown WebSocket server gracefully
   */
  public shutdown(): void {
    logger.info('Shutting down WebSocket server');

    // Close all connections
    this.deviceConnections.forEach((ws, deviceId) => {
      ws.close(1000, 'Server shutting down');
    });

    this.providerConnections.forEach((connections) => {
      connections.forEach(ws => {
        ws.close(1000, 'Server shutting down');
      });
    });

    // Clear all heartbeats
    this.deviceHeartbeats.forEach(timeout => clearTimeout(timeout));

    this.wss.close();
  }
}

export default DeviceBridgeWebSocket;
