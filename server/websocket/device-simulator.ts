#!/usr/bin/env tsx

/**
 * Device Simulator for Testing WebSocket Communication
 *
 * This simulates a Bedside Bike device sending real-time session data
 * to the WebSocket server. Use this for testing until real devices are connected.
 *
 * Usage:
 *   tsx server/websocket/device-simulator.ts --sessionId=1 --deviceId=121 --patientId=4
 *
 * DELETE THIS FILE when you have real device connectivity
 */

import WebSocket from 'ws';
import type { SessionUpdate } from './types';

interface SimulatorOptions {
  sessionId: number;
  deviceId: string;
  patientId: number;
  targetDuration?: number; // seconds
  baseRpm?: number;
  basePower?: number;
}

class DeviceSimulator {
  private ws: WebSocket | null = null;
  private options: SimulatorOptions;
  private interval: NodeJS.Timeout | null = null;
  private startTime: Date;
  private currentDuration = 0;
  private isPaused = false;
  private distance = 0;

  constructor(options: SimulatorOptions) {
    this.options = {
      targetDuration: 900, // 15 minutes default
      baseRpm: 45,
      basePower: 25,
      ...options
    };
    this.startTime = new Date();
  }

  async connect() {
    return new Promise<void>((resolve, reject) => {
      const url = `ws://localhost:5000/ws/device-bridge?type=device&deviceId=${this.options.deviceId}`;

      console.log(`🔌 Connecting to WebSocket server...`);
      console.log(`   Device ID: ${this.options.deviceId}`);
      console.log(`   Session ID: ${this.options.sessionId}`);
      console.log(`   Patient ID: ${this.options.patientId}`);

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('✅ Connected to server');
        console.log('🚴 Starting simulated session...\n');
        this.startSimulation();
        resolve();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('📨 Server message:', message);
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('🔌 Disconnected from server');
        this.stop();
      });

      // Send ping every 15 seconds to keep connection alive
      setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.ping();
        }
      }, 15000);
    });
  }

  private startSimulation() {
    let updateCount = 0;

    this.interval = setInterval(() => {
      if (this.isPaused) return;

      this.currentDuration += 1;
      updateCount++;

      // Simulate realistic cycling patterns
      const rpmVariation = (Math.random() - 0.5) * 10; // ±5 RPM
      const powerVariation = (Math.random() - 0.5) * 8; // ±4W
      const rpm = Math.max(20, this.options.baseRpm! + rpmVariation);
      const power = Math.max(10, this.options.basePower! + powerVariation);

      // Calculate distance (very rough approximation)
      // Distance = (RPM * wheel circumference * time) / 60
      const wheelCircumference = 2; // meters (approximate)
      this.distance += (rpm * wheelCircumference) / 60; // meters per second

      // Randomly pause 10% of the time (to test alert system)
      if (Math.random() < 0.01 && !this.isPaused) {
        this.isPaused = true;
        console.log('\n⏸️  SESSION PAUSED (simulating user break)\n');
        setTimeout(() => {
          this.isPaused = false;
          console.log('\n▶️  SESSION RESUMED\n');
        }, 5000); // Pause for 5 seconds
      }

      const update: SessionUpdate = {
        sessionId: this.options.sessionId,
        patientId: this.options.patientId,
        deviceId: this.options.deviceId,
        timestamp: new Date(),
        metrics: {
          rpm: Math.round(rpm),
          power: Math.round(power),
          distance: Math.round(this.distance),
          duration: this.currentDuration,
          heartRate: Math.round(85 + (Math.random() - 0.5) * 20), // 75-95 bpm
        },
        status: this.isPaused ? 'paused' : 'active'
      };

      // Send update
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'session_update',
          data: update
        }));
      }

      // Log progress every 10 seconds
      if (updateCount % 10 === 0) {
        const progress = (this.currentDuration / this.options.targetDuration!) * 100;
        console.log(
          `⏱️  ${Math.floor(this.currentDuration / 60)}:${(this.currentDuration % 60).toString().padStart(2, '0')} | ` +
          `RPM: ${Math.round(rpm)} | ` +
          `Power: ${Math.round(power)}W | ` +
          `Distance: ${Math.round(this.distance)}m | ` +
          `Progress: ${Math.round(progress)}%`
        );
      }

      // Complete session when target reached
      if (this.currentDuration >= this.options.targetDuration!) {
        this.completeSession();
      }
    }, 1000); // Update every second
  }

  private completeSession() {
    console.log('\n🎉 SESSION COMPLETED!\n');
    console.log(`   Duration: ${Math.floor(this.currentDuration / 60)}:${(this.currentDuration % 60).toString().padStart(2, '0')}`);
    console.log(`   Distance: ${Math.round(this.distance)} meters`);
    console.log(`   Avg RPM: ${this.options.baseRpm}`);
    console.log(`   Avg Power: ${this.options.basePower}W\n`);

    // Send final update
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'session_update',
        data: {
          sessionId: this.options.sessionId,
          patientId: this.options.patientId,
          deviceId: this.options.deviceId,
          timestamp: new Date(),
          metrics: {
            rpm: 0,
            power: 0,
            distance: Math.round(this.distance),
            duration: this.currentDuration
          },
          status: 'completed'
        }
      }));
    }

    setTimeout(() => {
      this.stop();
      process.exit(0);
    }, 2000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options: any = {};

  args.forEach(arg => {
    const [key, value] = arg.replace('--', '').split('=');
    if (key && value) {
      options[key] = isNaN(Number(value)) ? value : Number(value);
    }
  });

  if (!options.sessionId || !options.deviceId || !options.patientId) {
    console.error('❌ Missing required arguments\n');
    console.log('Usage:');
    console.log('  tsx server/websocket/device-simulator.ts --sessionId=1 --deviceId=121 --patientId=4\n');
    console.log('Optional arguments:');
    console.log('  --targetDuration=900  (seconds, default: 900 = 15 minutes)');
    console.log('  --baseRpm=45          (default: 45)');
    console.log('  --basePower=25        (watts, default: 25)\n');
    process.exit(1);
  }

  return options as SimulatorOptions;
}

// Run simulator
const options = parseArgs();
const simulator = new DeviceSimulator(options);

simulator.connect().catch(error => {
  console.error('❌ Failed to connect:', error.message);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down simulator...');
  simulator.stop();
  process.exit(0);
});
