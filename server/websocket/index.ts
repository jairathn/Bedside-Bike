import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../logger';
import { db } from '../db';
import { exerciseSessions, devices, providerPatients } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import type { SessionUpdate, Alert, WebSocketMessage, DeviceStatus } from './types';
import { parse as parseCookie } from 'cookie';
import { auditLog, AuditAction } from '../middleware/audit';

/**
 * HIPAA-Compliant WebSocket Server for Real-Time Device Communication
 *
 * Security features:
 * - Device authentication via shared secret (API key)
 * - Provider authentication via session cookie
 * - Patient data access authorization verification
 * - Audit logging of all connections
 *
 * Architecture:
 * - Device connects with ?type=device&deviceId=XXX&apiKey=XXX
 * - Provider connects with ?type=provider&patientId=XXX (session required)
 * - Messages route: Device → Server → Database → Authorized providers
 */
export class DeviceBridgeWebSocket {
  private wss: WebSocketServer;
  private deviceConnections = new Map<string, WebSocket>();
  private providerConnections = new Map<string, Set<WebSocket>>();
  private deviceHeartbeats = new Map<string, NodeJS.Timeout>();
  private sessionStore: any;

  constructor(server: Server, sessionStore?: any) {
    this.sessionStore = sessionStore;

    this.wss = new WebSocketServer({
      server,
      path: '/ws/device-bridge',
      verifyClient: async (info, callback) => {
        try {
          const url = new URL(info.req.url || '', 'http://localhost');
          const clientType = url.searchParams.get('type');

          if (clientType === 'device') {
            // Device authentication via API key
            const result = await this.verifyDeviceAuth(info.req, url);
            callback(result.allowed, result.code, result.message);
          } else if (clientType === 'provider') {
            // Provider authentication via session cookie
            const result = await this.verifyProviderAuth(info.req, url);
            callback(result.allowed, result.code, result.message);
          } else {
            callback(false, 400, 'Invalid client type');
          }
        } catch (error) {
          logger.error('WebSocket auth error', { error: (error as Error).message });
          callback(false, 500, 'Authentication error');
        }
      }
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });

    logger.info('HIPAA-compliant WebSocket server initialized', {
      path: '/ws/device-bridge',
      status: 'ready',
      authRequired: true
    });

    // Start heartbeat checker for device connections
    this.startHeartbeatMonitor();
  }

  /**
   * Verify device authentication
   * Devices authenticate with a shared API key
   */
  private async verifyDeviceAuth(
    req: any,
    url: URL
  ): Promise<{ allowed: boolean; code?: number; message?: string }> {
    const deviceId = url.searchParams.get('deviceId');
    const apiKey = url.searchParams.get('apiKey');

    if (!deviceId) {
      return { allowed: false, code: 400, message: 'Device ID required' };
    }

    // In production, verify device API key against database or environment
    const expectedApiKey = process.env.DEVICE_API_KEY;

    // If DEVICE_API_KEY is set, require it; otherwise allow (dev mode)
    if (expectedApiKey && apiKey !== expectedApiKey) {
      logger.warn('Device auth failed - invalid API key', { deviceId });
      auditLog({
        userId: null,
        action: AuditAction.ACCESS_DENIED,
        resourceType: 'WEBSOCKET_DEVICE',
        resourceId: deviceId,
        details: { reason: 'Invalid API key' },
        ipAddress: req.socket?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      return { allowed: false, code: 401, message: 'Invalid device credentials' };
    }

    // Verify device exists in database
    try {
      const [device] = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
      if (!device && expectedApiKey) {
        logger.warn('Device auth failed - unknown device', { deviceId });
        return { allowed: false, code: 404, message: 'Unknown device' };
      }
    } catch (error) {
      // Database check is optional - allow connection if DB unavailable
      logger.warn('Device DB check failed, allowing connection', { deviceId });
    }

    logger.info('Device authenticated', { deviceId });
    return { allowed: true };
  }

  /**
   * Verify provider authentication via session cookie
   * Providers must have valid session and access to requested patient
   */
  private async verifyProviderAuth(
    req: any,
    url: URL
  ): Promise<{ allowed: boolean; code?: number; message?: string }> {
    const patientId = url.searchParams.get('patientId');

    if (!patientId) {
      return { allowed: false, code: 400, message: 'Patient ID required' };
    }

    // Parse session cookie
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      logger.warn('Provider WebSocket auth failed - no cookie');
      return { allowed: false, code: 401, message: 'Authentication required' };
    }

    const cookies = parseCookie(cookieHeader);
    const sessionId = cookies['bedside.sid'];

    if (!sessionId) {
      logger.warn('Provider WebSocket auth failed - no session cookie');
      return { allowed: false, code: 401, message: 'Session required' };
    }

    // If session store is available, verify the session
    if (this.sessionStore) {
      try {
        // Extract session ID from signed cookie (s:sessionId.signature)
        const rawSessionId = sessionId.startsWith('s:')
          ? sessionId.slice(2).split('.')[0]
          : sessionId;

        const session = await new Promise<any>((resolve, reject) => {
          this.sessionStore.get(rawSessionId, (err: Error, session: any) => {
            if (err) reject(err);
            else resolve(session);
          });
        });

        if (!session || !session.userId) {
          logger.warn('Provider WebSocket auth failed - invalid session');
          return { allowed: false, code: 401, message: 'Invalid session' };
        }

        // Verify provider has access to this patient
        if (session.userType === 'provider') {
          const [access] = await db
            .select()
            .from(providerPatients)
            .where(
              and(
                eq(providerPatients.providerId, session.userId),
                eq(providerPatients.patientId, parseInt(patientId)),
                eq(providerPatients.isActive, true)
              )
            )
            .limit(1);

          if (!access) {
            logger.warn('Provider WebSocket auth failed - no patient access', {
              providerId: session.userId,
              patientId
            });
            auditLog({
              userId: session.userId,
              action: AuditAction.ACCESS_DENIED,
              resourceType: 'WEBSOCKET_PATIENT',
              resourceId: parseInt(patientId),
              details: { reason: 'No provider-patient relationship' },
              ipAddress: req.socket?.remoteAddress || 'unknown',
              userAgent: req.headers['user-agent'] || 'unknown',
            });
            return { allowed: false, code: 403, message: 'Access denied to patient' };
          }
        }

        // Patient can only watch their own data
        if (session.userType === 'patient' && session.userId !== parseInt(patientId)) {
          logger.warn('Patient WebSocket auth failed - wrong patient', {
            sessionUserId: session.userId,
            requestedPatientId: patientId
          });
          return { allowed: false, code: 403, message: 'Access denied' };
        }

        logger.info('Provider/Patient WebSocket authenticated', {
          userId: session.userId,
          userType: session.userType,
          patientId
        });

        // Store session info on request for later use
        (req as any).authenticatedUser = {
          id: session.userId,
          userType: session.userType
        };

        return { allowed: true };
      } catch (error) {
        logger.error('Session verification error', { error: (error as Error).message });
        return { allowed: false, code: 500, message: 'Session verification failed' };
      }
    }

    // In development without session store, allow with warning
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('WebSocket session verification skipped (no session store)');
      return { allowed: true };
    }

    return { allowed: false, code: 401, message: 'Session verification unavailable' };
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
      const userId = (req as any).authenticatedUser?.id;
      this.handleProviderConnection(ws, patientId, userId);
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

    // Audit device connection
    auditLog({
      userId: null,
      action: AuditAction.CREATE,
      resourceType: 'DEVICE_CONNECTION',
      resourceId: deviceId,
      details: { event: 'connected' },
      ipAddress: 'device',
      userAgent: 'Bedside Bike Device',
    });

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
  private handleProviderConnection(ws: WebSocket, patientId: string, userId?: number) {
    if (!this.providerConnections.has(patientId)) {
      this.providerConnections.set(patientId, new Set());
    }
    this.providerConnections.get(patientId)!.add(ws);

    logger.info('Provider connected to patient stream', {
      patientId,
      userId,
      totalProviders: this.getTotalProviderConnections()
    });

    // Audit provider connection
    if (userId) {
      auditLog({
        userId,
        action: AuditAction.READ,
        resourceType: 'PATIENT_STREAM',
        resourceId: parseInt(patientId),
        details: { event: 'websocket_connected' },
        ipAddress: 'websocket',
        userAgent: 'Provider Dashboard',
      });
    }

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
