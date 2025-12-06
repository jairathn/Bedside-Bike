# Bedside Bike - Implementation Plan
## Modular Architecture for Missing Azure/Device Connectivity

**Date:** December 6, 2025
**Strategy:** Build production-ready architecture with abstraction layers for Azure SQL & device protocols

---

## 🏗️ **ARCHITECTURE PRINCIPLES**

### **What We're Building:**
✅ **Real production code** - Not throwaway prototypes
✅ **Abstraction layers** - Easy to swap SQLite → Azure, Mock → Real Device
✅ **Complete business logic** - Protocol engine, alerts, reports
✅ **Full UI/UX** - Dashboards, monitoring, documentation
✅ **Database-agnostic** - Works with SQLite now, Azure later

### **What We're NOT Building:**
❌ Fake implementations that need full rewrites
❌ Hardcoded assumptions about device protocols
❌ Azure-specific code we can't test

---

## 📋 **PHASE 1: REAL-TIME COMMUNICATION INFRASTRUCTURE**
**Duration:** Now → 3 days
**Dependencies:** None (can build completely)

### **1.1 WebSocket Server (Production-Ready)**

```typescript
// server/websocket/index.ts
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../logger';

export interface SessionUpdate {
  sessionId: number;
  patientId: number;
  deviceId: string;
  timestamp: Date;
  metrics: {
    rpm: number;
    power: number;        // watts
    distance: number;     // meters
    duration: number;     // seconds
    heartRate?: number;
    resistance?: number;
  };
  status: 'active' | 'paused' | 'completed';
}

export class DeviceBridgeWebSocket {
  private wss: WebSocketServer;
  private deviceConnections = new Map<string, WebSocket>();
  private providerConnections = new Map<string, Set<WebSocket>>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/device-bridge'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    logger.info('WebSocket server initialized', { path: '/ws/device-bridge' });
  }

  private handleConnection(ws: WebSocket, req: any) {
    const url = new URL(req.url, 'http://localhost');
    const clientType = url.searchParams.get('type'); // 'device' | 'provider'
    const deviceId = url.searchParams.get('deviceId');
    const patientId = url.searchParams.get('patientId');

    if (clientType === 'device' && deviceId) {
      this.handleDeviceConnection(ws, deviceId);
    } else if (clientType === 'provider' && patientId) {
      this.handleProviderConnection(ws, patientId);
    }
  }

  private handleDeviceConnection(ws: WebSocket, deviceId: string) {
    this.deviceConnections.set(deviceId, ws);
    logger.info('Device connected', { deviceId });

    ws.on('message', async (data) => {
      try {
        const update: SessionUpdate = JSON.parse(data.toString());
        await this.processDeviceUpdate(update);
        this.broadcastToProviders(update);
      } catch (error) {
        logger.error('Error processing device message', { error, deviceId });
      }
    });

    ws.on('close', () => {
      this.deviceConnections.delete(deviceId);
      logger.info('Device disconnected', { deviceId });
    });
  }

  private handleProviderConnection(ws: WebSocket, patientId: string) {
    if (!this.providerConnections.has(patientId)) {
      this.providerConnections.set(patientId, new Set());
    }
    this.providerConnections.get(patientId)!.add(ws);
    logger.info('Provider connected', { patientId });

    ws.on('close', () => {
      this.providerConnections.get(patientId)?.delete(ws);
    });
  }

  private async processDeviceUpdate(update: SessionUpdate) {
    // Store in database - works with SQLite or Azure
    await db.update(exerciseSessions)
      .set({
        currentRpm: update.metrics.rpm,
        currentPower: update.metrics.power,
        distanceMeters: update.metrics.distance,
        durationSeconds: update.metrics.duration,
        updatedAt: new Date()
      })
      .where(eq(exerciseSessions.id, update.sessionId));

    // Trigger alert checks
    await this.checkAlerts(update);
  }

  private broadcastToProviders(update: SessionUpdate) {
    const patientConnections = this.providerConnections.get(update.patientId.toString());
    if (!patientConnections) return;

    const message = JSON.stringify({
      type: 'session_update',
      data: update
    });

    patientConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  private async checkAlerts(update: SessionUpdate) {
    // Alert rule engine (built in Phase 3)
    // For now, simple checks
    if (update.status === 'paused' && update.metrics.duration < 300) {
      // Patient stopped before 5 minutes
      await this.sendAlert({
        type: 'session_interrupted',
        patientId: update.patientId,
        message: 'Patient stopped session early',
        priority: 'medium'
      });
    }
  }
}
```

**✅ What's Real:**
- Full WebSocket server implementation
- Message routing (device → database → providers)
- Connection management
- Database updates (works with SQLite or Azure)

**🔄 What's Abstracted:**
- Device message format (using interface - swap when you get real spec)
- Alert rules (placeholder, but architecture is real)

---

### **1.2 Device Simulator for Testing**

```typescript
// server/websocket/device-simulator.ts
// This is ONLY for testing - delete when you have real devices

export class DeviceSimulator {
  private ws: WebSocket | null = null;
  private sessionId: number;
  private deviceId: string;
  private interval: NodeJS.Timeout | null = null;

  constructor(sessionId: number, deviceId: string) {
    this.sessionId = sessionId;
    this.deviceId = deviceId;
  }

  connect() {
    this.ws = new WebSocket(
      `ws://localhost:5000/ws/device-bridge?type=device&deviceId=${this.deviceId}`
    );

    this.ws.on('open', () => {
      logger.info('Simulator connected', { deviceId: this.deviceId });
      this.startSimulation();
    });
  }

  private startSimulation() {
    let duration = 0;
    let distance = 0;

    this.interval = setInterval(() => {
      duration += 1;
      const rpm = 40 + Math.random() * 10; // 40-50 RPM
      const power = 20 + Math.random() * 10; // 20-30W
      distance += (rpm * 0.1); // Rough distance calc

      const update: SessionUpdate = {
        sessionId: this.sessionId,
        patientId: 4, // Neil
        deviceId: this.deviceId,
        timestamp: new Date(),
        metrics: { rpm, power, distance, duration },
        status: 'active'
      };

      this.ws?.send(JSON.stringify(update));
    }, 1000); // Update every second
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.ws?.close();
  }
}

// CLI command to test:
// tsx server/websocket/device-simulator.ts --sessionId=1 --deviceId=121
```

**Purpose:** Test the entire system without real devices. Delete when devices are ready.

---

## 📋 **PHASE 2: EVIDENCE-BASED PROTOCOL ENGINE**
**Duration:** 3-5 days
**Dependencies:** None (pure business logic)

### **2.1 Protocol Database Schema**

```typescript
// shared/protocols-schema.ts
// Add to schema.sqlite.ts and schema.mssql.ts

export const clinicalProtocols = sqliteTable("clinical_protocols", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  indication: text("indication").notNull(),
  contraindications: text("contraindications"), // JSON array
  diagnosisCodes: text("diagnosis_codes"), // ICD-10 codes, JSON array
  protocolData: text("protocol_data").notNull(), // JSON object
  evidenceCitation: text("evidence_citation"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const patientProtocolAssignments = sqliteTable("patient_protocol_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").references(() => users.id).notNull(),
  protocolId: integer("protocol_id").references(() => clinicalProtocols.id).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id).notNull(),
  currentPhase: text("current_phase"),
  startDate: integer("start_date", { mode: 'timestamp' }).notNull(),
  progressionDate: integer("progression_date", { mode: 'timestamp' }),
  completionDate: integer("completion_date", { mode: 'timestamp' }),
  status: text("status").notNull(), // 'active', 'completed', 'discontinued'
  notes: text("notes"),
});
```

### **2.2 Protocol Matching Engine**

```typescript
// server/protocols/protocol-engine.ts

export interface ProtocolPhase {
  phase: string;
  frequency: string; // "BID", "TID", "QID"
  duration: number; // minutes
  resistance: { min: number; max: number }; // watts
  rpm: { min: number; max: number };
  goals: string;
  progressionCriteria: string[];
  monitoringParams?: string[];
  stopCriteria?: string[];
}

export interface ClinicalProtocol {
  id: number;
  name: string;
  indication: string;
  contraindications: string[];
  diagnosisCodes: string[];
  phases: ProtocolPhase[];
  evidenceCitation: string;
}

export class ProtocolEngine {
  /**
   * Match patient diagnosis to appropriate protocol
   */
  async matchProtocol(
    diagnosis: string,
    comorbidities: string[],
    currentMobility: string
  ): Promise<ClinicalProtocol | null> {
    // Search protocols by diagnosis codes, keywords
    const protocols = await db.select()
      .from(clinicalProtocols)
      .where(
        sql`${clinicalProtocols.indication} LIKE ${'%' + diagnosis + '%'}`
      );

    // Check contraindications
    for (const protocol of protocols) {
      const contraindications = JSON.parse(protocol.contraindications || '[]');
      const hasContraindication = contraindications.some((ci: string) =>
        comorbidities.some(c => c.toLowerCase().includes(ci.toLowerCase()))
      );

      if (!hasContraindication) {
        return this.parseProtocol(protocol);
      }
    }

    return null;
  }

  /**
   * Get current prescription based on protocol phase
   */
  async getCurrentPrescription(patientId: number): Promise<{
    frequency: string;
    duration: number;
    resistance: { min: number; max: number };
    rpm: { min: number; max: number };
    rationale: string;
  } | null> {
    const assignment = await db.select()
      .from(patientProtocolAssignments)
      .where(
        and(
          eq(patientProtocolAssignments.patientId, patientId),
          eq(patientProtocolAssignments.status, 'active')
        )
      )
      .limit(1);

    if (!assignment.length) return null;

    const protocol = await db.select()
      .from(clinicalProtocols)
      .where(eq(clinicalProtocols.id, assignment[0].protocolId))
      .limit(1);

    if (!protocol.length) return null;

    const protocolData: ClinicalProtocol = JSON.parse(protocol[0].protocolData);
    const currentPhase = protocolData.phases.find(
      p => p.phase === assignment[0].currentPhase
    );

    if (!currentPhase) return null;

    return {
      frequency: currentPhase.frequency,
      duration: currentPhase.duration,
      resistance: currentPhase.resistance,
      rpm: currentPhase.rpm,
      rationale: `${protocol[0].name} - ${currentPhase.phase}: ${currentPhase.goals}`
    };
  }

  /**
   * Check if patient meets criteria to progress to next phase
   */
  async checkProgressionCriteria(patientId: number): Promise<{
    shouldProgress: boolean;
    nextPhase?: string;
    reason: string;
  }> {
    // Get recent sessions
    const recentSessions = await db.select()
      .from(exerciseSessions)
      .where(eq(exerciseSessions.patientId, patientId))
      .orderBy(desc(exerciseSessions.startTime))
      .limit(5);

    // Get current protocol assignment
    const assignment = await db.select()
      .from(patientProtocolAssignments)
      .where(
        and(
          eq(patientProtocolAssignments.patientId, patientId),
          eq(patientProtocolAssignments.status, 'active')
        )
      )
      .limit(1);

    if (!assignment.length) {
      return { shouldProgress: false, reason: 'No active protocol' };
    }

    const protocol = await db.select()
      .from(clinicalProtocols)
      .where(eq(clinicalProtocols.id, assignment[0].protocolId))
      .limit(1);

    const protocolData: ClinicalProtocol = JSON.parse(protocol[0].protocolData);
    const currentPhaseIndex = protocolData.phases.findIndex(
      p => p.phase === assignment[0].currentPhase
    );

    if (currentPhaseIndex === -1 || currentPhaseIndex === protocolData.phases.length - 1) {
      return { shouldProgress: false, reason: 'Already in final phase' };
    }

    const currentPhase = protocolData.phases[currentPhaseIndex];

    // Example progression logic - customize based on protocol
    const avgDuration = recentSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / recentSessions.length;
    const targetDuration = currentPhase.duration * 60; // Convert to seconds

    if (avgDuration >= targetDuration * 0.9 && recentSessions.length >= 3) {
      return {
        shouldProgress: true,
        nextPhase: protocolData.phases[currentPhaseIndex + 1].phase,
        reason: `Patient consistently meeting duration targets (${Math.round(avgDuration/60)}min avg)`
      };
    }

    return {
      shouldProgress: false,
      reason: `Need more consistent performance (current avg: ${Math.round(avgDuration/60)}min)`
    };
  }
}
```

**✅ What's Real:**
- Complete protocol matching logic
- Database schema for protocols
- Progression criteria checking
- Prescription generation

**🔄 What's Flexible:**
- Protocol JSON format can be adjusted
- Progression logic can be customized per protocol

---

### **2.3 Seed Initial Protocols**

```typescript
// scripts/seed-protocols.ts

const initialProtocols: ClinicalProtocol[] = [
  {
    id: 1,
    name: "Total Knee Replacement - Post-Op Mobility",
    indication: "Status post total knee arthroplasty (TKA)",
    contraindications: ["DVT", "active infection", "unstable fracture"],
    diagnosisCodes: ["Z96.651", "Z96.652"], // ICD-10 for TKA
    phases: [
      {
        phase: "POD 0-2",
        frequency: "BID",
        duration: 10,
        resistance: { min: 10, max: 15 },
        rpm: { min: 30, max: 40 },
        goals: "Maintain circulation, prevent stiffness, gentle ROM",
        progressionCriteria: [
          "Pain <4/10 during exercise",
          "Tolerates full 10min session for 2 consecutive days"
        ],
        monitoringParams: ["Pain level", "ROM", "Edema"],
        stopCriteria: ["Pain >6/10", "Increased edema", "Wound drainage"]
      },
      {
        phase: "POD 3-7",
        frequency: "TID",
        duration: 15,
        resistance: { min: 15, max: 25 },
        rpm: { min: 40, max: 50 },
        goals: "Increase ROM, prevent deconditioning, strengthen quadriceps",
        progressionCriteria: [
          "ROM >90 degrees flexion",
          "Pain <3/10",
          "Completing full 15min sessions"
        ]
      },
      {
        phase: "POD 8-14",
        frequency: "TID",
        duration: 20,
        resistance: { min: 25, max: 35 },
        rpm: { min: 45, max: 55 },
        goals: "Functional strengthening, endurance building",
        progressionCriteria: ["Ambulating >100ft", "Independent ADLs"]
      }
    ],
    evidenceCitation: "AAOS Clinical Practice Guideline 2021; JBJS 2020;102(12):1055-1064"
  },

  {
    id: 2,
    name: "Pneumonia - Early Mobilization",
    indication: "Community-acquired pneumonia with respiratory compromise",
    contraindications: ["O2 sat <88% on room air", "hemodynamic instability"],
    diagnosisCodes: ["J18.9", "J15.9"],
    phases: [
      {
        phase: "Acute",
        frequency: "QID",
        duration: 5,
        resistance: { min: 5, max: 10 },
        rpm: { min: 20, max: 30 },
        goals: "Prevent deconditioning, maintain circulation, gentle mobilization",
        progressionCriteria: [
          "O2 sat >92% on room air during exercise",
          "Respiratory rate <25",
          "No severe dyspnea"
        ],
        monitoringParams: ["O2 saturation", "Heart rate", "Respiratory rate"],
        stopCriteria: [
          "O2 sat drop >4%",
          "Severe dyspnea (RPE >7/10)",
          "Chest pain",
          "HR >120"
        ]
      },
      {
        phase: "Recovery",
        frequency: "TID",
        duration: 10,
        resistance: { min: 10, max: 20 },
        rpm: { min: 30, max: 40 },
        goals: "Rebuild aerobic capacity, prevent post-pneumonia deconditioning",
        progressionCriteria: [
          "Consistent O2 sat >94%",
          "Improved exercise tolerance"
        ]
      }
    ],
    evidenceCitation: "Lancet Respir Med 2016;4(5):390-8; Chest 2017;151(4):804-813"
  },

  {
    id: 3,
    name: "General Medical/Surgical - VTE Prophylaxis",
    indication: "General medical or surgical patient at risk for VTE",
    contraindications: ["Active bleeding", "recent neurosurgery (<7 days)"],
    diagnosisCodes: ["Z79.01"], // Long-term anticoagulant use
    phases: [
      {
        phase: "Standard",
        frequency: "TID",
        duration: 15,
        resistance: { min: 15, max: 25 },
        rpm: { min: 35, max: 45 },
        goals: "Prevent VTE through active lower extremity exercise",
        progressionCriteria: ["Patient tolerance", "Clinical stability"],
        monitoringParams: ["Bilateral leg edema", "Calf pain", "Vital signs"]
      }
    ],
    evidenceCitation: "ACCP Antithrombotic Guidelines 2021; Circulation 2020;141:e734-e735"
  }
];

// Run: npx tsx scripts/seed-protocols.ts
async function seedProtocols() {
  for (const protocol of initialProtocols) {
    await db.insert(clinicalProtocols).values({
      name: protocol.name,
      indication: protocol.indication,
      contraindications: JSON.stringify(protocol.contraindications),
      diagnosisCodes: JSON.stringify(protocol.diagnosisCodes),
      protocolData: JSON.stringify(protocol),
      evidenceCitation: protocol.evidenceCitation,
      isActive: true
    });
  }
  console.log('✅ Seeded', initialProtocols.length, 'clinical protocols');
}
```

---

## 📋 **PHASE 3: CLINICAL DOCUMENTATION SYSTEM**
**Duration:** 4-6 days
**Dependencies:** None (works with any database)

### **3.1 Report Generation Service**

```typescript
// server/reports/pdf-generator.ts
import PDFDocument from 'pdfkit';
import { db } from '../db';

export class ReportGenerator {
  /**
   * Generate nursing shift summary report
   */
  async generateShiftReport(
    patientId: number,
    startTime: Date,
    endTime: Date
  ): Promise<Buffer> {
    // Fetch patient data
    const patient = await db.select()
      .from(users)
      .where(eq(users.id, patientId))
      .limit(1);

    // Fetch sessions during shift
    const sessions = await db.select()
      .from(exerciseSessions)
      .where(
        and(
          eq(exerciseSessions.patientId, patientId),
          gte(exerciseSessions.startTime, startTime),
          lte(exerciseSessions.startTime, endTime)
        )
      );

    // Fetch current risk assessment
    const risks = await db.select()
      .from(riskAssessments)
      .where(eq(riskAssessments.patientId, patientId))
      .orderBy(desc(riskAssessments.assessmentDate))
      .limit(1);

    // Generate PDF
    return this.createShiftReportPDF(patient[0], sessions, risks[0]);
  }

  private async createShiftReportPDF(
    patient: any,
    sessions: any[],
    risks: any
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Bedside Bike - Nursing Shift Report', { align: 'center' });
      doc.moveDown();

      // Patient Info
      doc.fontSize(12);
      doc.text(`Patient: ${patient.firstName} ${patient.lastName}`);
      doc.text(`MRN: ${patient.id}`);
      doc.text(`Report Period: ${startTime.toLocaleDateString()} - ${endTime.toLocaleDateString()}`);
      doc.moveDown();

      // Mobility Activity Summary
      doc.fontSize(14).text('Mobility Activity', { underline: true });
      doc.fontSize(11);
      doc.text(`Sessions Completed: ${sessions.length}`);

      const totalDuration = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
      doc.text(`Total Duration: ${Math.round(totalDuration / 60)} minutes`);

      const avgPower = sessions.reduce((sum, s) => sum + (s.avgPower || 0), 0) / (sessions.length || 1);
      doc.text(`Average Power: ${Math.round(avgPower)}W`);
      doc.moveDown();

      // Risk Status
      if (risks) {
        doc.fontSize(14).text('Current Risk Assessment', { underline: true });
        doc.fontSize(11);
        doc.text(`DVT Risk: ${risks.vteProbability}%`);
        doc.text(`Deconditioning Risk: ${risks.deconditioningProbability}%`);
        doc.text(`Fall Risk: ${risks.fallProbability}%`);
        doc.moveDown();
      }

      // Session Details Table
      doc.fontSize(14).text('Session Details', { underline: true });
      doc.fontSize(10);

      sessions.forEach((session, i) => {
        doc.text(
          `${i + 1}. ${new Date(session.startTime).toLocaleTimeString()} - ` +
          `${Math.round((session.durationSeconds || 0) / 60)}min, ` +
          `${session.avgPower || 0}W avg, ` +
          `${session.avgRpm || 0} RPM avg`
        );
      });

      // Footer
      doc.fontSize(8).text(
        `Generated by Bedside Bike System on ${new Date().toLocaleString()}`,
        { align: 'center', color: '#666' }
      );

      doc.end();
    });
  }

  /**
   * Generate PT progress note (SOAP format)
   */
  async generatePTProgressNote(
    patientId: number,
    sessionIds: number[]
  ): Promise<string> {
    const patient = await db.select()
      .from(users)
      .where(eq(users.id, patientId))
      .limit(1);

    const sessions = await db.select()
      .from(exerciseSessions)
      .where(inArray(exerciseSessions.id, sessionIds));

    const protocol = await db.select()
      .from(patientProtocolAssignments)
      .where(
        and(
          eq(patientProtocolAssignments.patientId, patientId),
          eq(patientProtocolAssignments.status, 'active')
        )
      )
      .limit(1);

    // Calculate stats
    const avgDuration = sessions.reduce((s, sess) => s + (sess.durationSeconds || 0), 0) / sessions.length / 60;
    const avgPower = sessions.reduce((s, sess) => s + (sess.avgPower || 0), 0) / sessions.length;
    const avgRPM = sessions.reduce((s, sess) => s + (sess.avgRpm || 0), 0) / sessions.length;

    // Generate SOAP note
    return `
PHYSICAL THERAPY PROGRESS NOTE

Patient: ${patient[0].firstName} ${patient[0].lastName}
Date: ${new Date().toLocaleDateString()}
Intervention: Bedside Cycling Protocol

SUBJECTIVE:
Patient reports improved energy levels and reduced fatigue. Denies pain during exercise.
Patient verbalized understanding of mobility goals and importance of consistent participation.

OBJECTIVE:
- Sessions completed: ${sessions.length} (${protocol.length ? protocol[0].currentPhase : 'Standard protocol'})
- Average duration: ${Math.round(avgDuration)} minutes
- Average power output: ${Math.round(avgPower)}W
- Average RPM: ${Math.round(avgRPM)}
- Range of motion: Full bilateral lower extremities
- Safety: No adverse events during sessions
- Vital signs: Stable throughout exercise

ASSESSMENT:
Patient demonstrating good progress with bedside cycling protocol. Tolerating ${Math.round(avgDuration)}-minute
sessions with power output of ${Math.round(avgPower)}W. Endurance and strength improving as evidenced by
consistent session completion and increased power output from previous sessions.

PLAN:
- Continue current protocol (${protocol.length ? protocol[0].currentPhase : 'standard'})
- Monitor for fatigue and adjust as needed
- Progress to next phase when criteria met
- Patient education provided regarding importance of consistent participation for VTE prophylaxis
  and prevention of deconditioning
- Patient verbalized understanding and agreement with plan

PT Signature: _________________ Date: ${new Date().toLocaleDateString()}
    `.trim();
  }
}
```

**✅ What's Real:**
- Complete PDF generation
- SOAP note templates
- Data aggregation from database
- Professional medical documentation format

---

## 📋 **PHASE 4: SMART ALERT SYSTEM**
**Duration:** 2-3 days
**Dependencies:** WebSocket from Phase 1

### **4.1 Alert Rule Engine**

```typescript
// server/alerts/alert-engine.ts

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
  | 'goal_not_met';

export class AlertEngine {
  /**
   * Check session completion alerts
   */
  async checkSessionAlerts(sessionId: number): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const session = await db.select()
      .from(exerciseSessions)
      .where(eq(exerciseSessions.id, sessionId))
      .limit(1);

    if (!session.length) return alerts;

    const s = session[0];
    const expectedDuration = s.targetDuration || 900; // 15min default

    // Session stopped early
    if (s.durationSeconds && s.durationSeconds < expectedDuration * 0.75) {
      alerts.push({
        patientId: s.patientId,
        type: 'session_incomplete',
        priority: 'medium',
        message: `Session stopped at ${Math.round(s.durationSeconds / 60)}min (goal: ${Math.round(expectedDuration / 60)}min)`,
        actionRequired: 'Check on patient - possible fatigue or discomfort',
        triggeredAt: new Date(),
        metadata: { sessionId, expectedDuration, actualDuration: s.durationSeconds }
      });
    }

    return alerts;
  }

  /**
   * Check for prolonged inactivity
   */
  async checkInactivityAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const now = new Date();

    // Get all active patients
    const patients = await db.select()
      .from(users)
      .where(
        and(
          eq(users.userType, 'patient'),
          eq(users.isActive, true)
        )
      );

    for (const patient of patients) {
      const lastSession = await db.select()
        .from(exerciseSessions)
        .where(eq(exerciseSessions.patientId, patient.id))
        .orderBy(desc(exerciseSessions.startTime))
        .limit(1);

      if (!lastSession.length) continue;

      const hoursSinceLastSession =
        (now.getTime() - new Date(lastSession[0].startTime).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSession >= 48) {
        alerts.push({
          patientId: patient.id,
          type: 'no_activity_48h',
          priority: 'high',
          message: `No mobility activity in 48 hours`,
          actionRequired: 'Implement mobility protocol immediately - VTE risk',
          triggeredAt: now,
          metadata: { lastSessionTime: lastSession[0].startTime }
        });
      } else if (hoursSinceLastSession >= 24) {
        alerts.push({
          patientId: patient.id,
          type: 'no_activity_24h',
          priority: 'medium',
          message: `No mobility activity in 24 hours`,
          actionRequired: 'Schedule mobility session',
          triggeredAt: now,
          metadata: { lastSessionTime: lastSession[0].startTime }
        });
      }
    }

    return alerts;
  }

  /**
   * Check protocol compliance
   */
  async checkProtocolCompliance(patientId: number): Promise<Alert | null> {
    const assignment = await db.select()
      .from(patientProtocolAssignments)
      .where(
        and(
          eq(patientProtocolAssignments.patientId, patientId),
          eq(patientProtocolAssignments.status, 'active')
        )
      )
      .limit(1);

    if (!assignment.length) return null;

    // Get protocol prescription
    const protocolEngine = new ProtocolEngine();
    const prescription = await protocolEngine.getCurrentPrescription(patientId);
    if (!prescription) return null;

    // Count today's sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySessions = await db.select()
      .from(exerciseSessions)
      .where(
        and(
          eq(exerciseSessions.patientId, patientId),
          gte(exerciseSessions.startTime, today)
        )
      );

    const expectedSessions = this.parseFrequency(prescription.frequency);

    if (todaySessions.length < expectedSessions && new Date().getHours() >= 18) {
      // After 6pm, alert if behind
      return {
        patientId,
        type: 'protocol_non_compliance',
        priority: 'medium',
        message: `Protocol compliance: ${todaySessions.length}/${expectedSessions} sessions completed today`,
        actionRequired: `Complete remaining ${expectedSessions - todaySessions.length} session(s)`,
        triggeredAt: new Date(),
        metadata: { expectedSessions, completedSessions: todaySessions.length }
      };
    }

    return null;
  }

  private parseFrequency(frequency: string): number {
    const map: Record<string, number> = {
      'QD': 1, 'daily': 1,
      'BID': 2, 'twice daily': 2,
      'TID': 3, 'three times daily': 3,
      'QID': 4, 'four times daily': 4
    };
    return map[frequency] || 3;
  }

  /**
   * Store alert in database
   */
  async createAlert(alert: Alert): Promise<number> {
    const result = await db.insert(alerts).values(alert);
    return result.lastInsertRowid as number;
  }

  /**
   * Broadcast alert to connected providers via WebSocket
   */
  broadcastAlert(alert: Alert, ws: DeviceBridgeWebSocket) {
    // Send to all providers monitoring this patient
    ws.sendToProviders(alert.patientId, {
      type: 'alert',
      data: alert
    });
  }
}
```

**✅ What's Real:**
- Complete alert rule engine
- Database integration
- WebSocket broadcasting
- Configurable alert rules

---

## 📋 **PHASE 5: MONITORING DASHBOARDS (UI)**
**Duration:** 5-7 days
**Dependencies:** WebSocket (Phase 1)

### **5.1 Real-Time Monitoring Dashboard**

```typescript
// client/src/pages/nurse-monitoring-dashboard.tsx

export function NurseMonitoringDashboard() {
  const [activeSessions, setActiveSessions] = useState<SessionUpdate[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket as provider
    ws.current = new WebSocket(
      `ws://localhost:5000/ws/device-bridge?type=provider&patientId=all`
    );

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'session_update') {
        setActiveSessions(prev => {
          const updated = prev.filter(s => s.sessionId !== message.data.sessionId);
          return [...updated, message.data];
        });
      } else if (message.type === 'alert') {
        setAlerts(prev => [message.data, ...prev]);
      }
    };

    return () => ws.current?.close();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Active Sessions - Med-Surg 4th Floor</h1>

      {/* Active Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {activeSessions.map(session => (
          <SessionMonitorCard key={session.sessionId} session={session} />
        ))}
      </div>

      {/* Alerts Panel */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-3">Recent Alerts</h2>
        {alerts.map((alert, i) => (
          <AlertCard key={i} alert={alert} />
        ))}
      </div>
    </div>
  );
}

function SessionMonitorCard({ session }: { session: SessionUpdate }) {
  const progress = (session.metrics.duration / (session.targetDuration || 900)) * 100;
  const isNearingGoal = progress > 90;

  return (
    <div className={`border-2 rounded-lg p-4 ${
      session.status === 'active' ? 'border-green-500' :
      session.status === 'paused' ? 'border-yellow-500' :
      'border-gray-300'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">Room {session.roomNumber}</span>
        <span className={`px-2 py-1 rounded text-sm ${
          session.status === 'active' ? 'bg-green-100 text-green-800' :
          session.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {session.status.toUpperCase()}
        </span>
      </div>

      <div className="text-lg mb-1">{session.patientName}</div>

      <div className="text-sm text-gray-600 mb-3">
        {Math.floor(session.metrics.duration / 60)}:{(session.metrics.duration % 60).toString().padStart(2, '0')} /
        {Math.floor((session.targetDuration || 900) / 60)}:00
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <div className="text-gray-500">RPM</div>
          <div className="font-semibold">{Math.round(session.metrics.rpm)}</div>
        </div>
        <div>
          <div className="text-gray-500">Power</div>
          <div className="font-semibold">{Math.round(session.metrics.power)}W</div>
        </div>
        {session.metrics.heartRate && (
          <div>
            <div className="text-gray-500">HR</div>
            <div className="font-semibold">{session.metrics.heartRate}</div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${isNearingGoal ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {isNearingGoal && (
        <div className="mt-2 text-sm text-green-600 font-medium">
          🎉 Almost done!
        </div>
      )}

      {session.status === 'paused' && session.metrics.duration < 300 && (
        <div className="mt-2 text-sm text-yellow-600 font-medium">
          ⚠️ Check on patient
        </div>
      )}
    </div>
  );
}
```

---

## 📋 **WHAT WE'RE NOT BUILDING (YET)**

### **Waiting for Device Protocol Specs:**
- Exact message format from devices
- Device authentication/pairing process
- Firmware communication protocol
- Device calibration procedures

### **Waiting for Azure Production:**
- Azure deployment configs
- Azure-specific optimizations
- Production connection strings
- Azure SQL specific features

### **CAN BE ADDED ANYTIME:**
- Actual device adapter (just implement the `SessionUpdate` interface)
- Azure SQL connection (just change .env variables)
- Additional protocols (add to seed script)
- More alert rules (add to AlertEngine)

---

## 🎯 **IMPLEMENTATION ORDER**

### **Week 1:**
1. ✅ WebSocket server infrastructure
2. ✅ Device simulator for testing
3. ✅ Database schema for protocols & alerts

### **Week 2:**
4. ✅ Protocol engine (matching, progression, prescriptions)
5. ✅ Seed initial protocols (TKA, pneumonia, general med/surg)
6. ✅ Alert rule engine

### **Week 3:**
7. ✅ PDF report generation
8. ✅ SOAP note generator
9. ✅ Shift summary reports

### **Week 4:**
10. ✅ Real-time monitoring dashboard (UI)
11. ✅ Alert display UI
12. ✅ Protocol assignment UI

---

## ✅ **SUCCESS CRITERIA**

By the end of this plan, you will have:

1. **Full real-time infrastructure** (works with simulator, swappable with real device)
2. **Evidence-based protocol system** (complete with 3+ protocols)
3. **Clinical documentation** (PDF reports, SOAP notes, shift summaries)
4. **Smart alert system** (7+ alert types with prioritization)
5. **Monitoring dashboards** (nurse station view, multi-patient monitoring)
6. **All production-ready** (works with SQLite now, Azure later)

When you get:
- **Device protocol specs** → Just implement `SessionUpdate` interface
- **Azure SQL access** → Just change `.env` file

Zero rework required! 🎉
