# Bedside Bike - Feature Roadmap for Ideal User Journey

**Date:** December 5, 2025
**Focus:** Creating seamless workflows for patients, nurses, PTs, and institutions

---

## 🎯 Vision Analysis

### Current State ✅
- ✅ Sophisticated risk assessment algorithms (deconditioning, VTE, falls, pressure injuries)
- ✅ Exercise session tracking with historical data
- ✅ Patient goal management
- ✅ Provider-patient relationships
- ✅ Kudos/gamification system
- ✅ Device linking (basic)
- ✅ Dashboard views

### Critical Gaps 🚨

---

## 🔴 **CRITICAL: Real-Time Device Communication**

**Current State:** Devices upload to Azure database, but NO real-time bidirectional communication

**What's Missing:**
- ❌ WebSockets implementation (library installed but not used!)
- ❌ Live RPM, power, distance, time streaming from device to UI
- ❌ Real-time session progress updates
- ❌ Bidirectional communication (UI → device for goal updates)
- ❌ Device heartbeat/status monitoring

**Impact:**
- Nurses can't monitor patients in real-time from nurses' station
- No immediate alerts if patient stops mid-session
- Can't adjust goals dynamically during session
- No live leaderboards during exercise

**Implementation Priority:** **IMMEDIATE (Week 1-2)**

### Recommended Implementation:

```typescript
// server/websocket.ts
import { WebSocketServer } from 'ws';
import { Server } from 'http';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const deviceId = new URLSearchParams(req.url?.split('?')[1]).get('deviceId');
    const patientId = new URLSearchParams(req.url?.split('?')[1]).get('patientId');

    // Device streaming session data
    ws.on('message', (data) => {
      const sessionData = JSON.parse(data.toString());

      // Broadcast to all connected providers watching this patient
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'session_update',
            patientId,
            deviceId,
            data: sessionData
          }));
        }
      });

      // Store in database
      db.update(exerciseSessions)
        .set({
          currentRpm: sessionData.rpm,
          currentPower: sessionData.power,
          currentDistance: sessionData.distance,
          durationSeconds: sessionData.duration,
          updatedAt: new Date()
        })
        .where(eq(exerciseSessions.id, sessionData.sessionId));
    });
  });
}
```

**Features Enabled:**
- Live monitoring dashboard for nurses
- Real-time alerts (patient stopped, fatigue detected, goal reached)
- Dynamic goal adjustment mid-session
- Live patient encouragement from providers
- Real-time leaderboards

---

## 🔴 **CRITICAL: Clinical Documentation Export**

**Current State:** Data captured but NO export functionality

**What's Missing:**
- ❌ PDF report generation for medical records
- ❌ HL7/FHIR export for EHR integration
- ❌ Shift summary reports for nurses
- ❌ Progress notes with evidence-based templates
- ❌ Billing/reimbursement documentation
- ❌ CMS quality measure reporting

**Impact:**
- Nurses must manually transcribe data into EMR (huge time sink!)
- No automated compliance documentation
- Can't prove ROI to institutions
- Providers won't adopt if it creates MORE work

**Implementation Priority:** **IMMEDIATE (Week 2-3)**

### Recommended Features:

#### 1. **Nursing Shift Report**
```typescript
// API: GET /api/patients/:id/shift-report
// Generates: Last 12 hours of activity for handoff

{
  "patientName": "Neil Jairath",
  "mrn": "123456",
  "shift": "7a-7p",
  "date": "2025-12-05",
  "mobility": {
    "sessionsCompleted": 3,
    "totalDuration": "45 minutes",
    "avgPower": "25 watts",
    "protocol": "Bedside Cycling - 15min TID",
    "compliance": "100%"
  },
  "riskStatus": {
    "dvt": "Low (12%)",
    "deconditioning": "Moderate (35%)",
    "falls": "Low (8%)"
  },
  "alerts": [
    "Patient met all mobility goals today",
    "Power output increased 15% from yesterday"
  ]
}
```

#### 2. **PT Progress Note Generator**
```typescript
// Auto-generate SOAP note format
Subjective: Patient reports feeling stronger, minimal fatigue
Objective:
  - 3 sessions completed (15min each)
  - Average RPM: 45
  - Average Power: 25W (increased from 22W yesterday)
  - ROM: Full bilateral LE
  - Safety: No adverse events
Assessment: Patient progressing well with bedside cycling protocol.
            Demonstrating improved endurance and power output.
            VTE risk reduced from 45% to 35% with mobility intervention.
Plan: Continue TID cycling protocol. Advance to 20min sessions tomorrow.
      Monitor for fatigue. Patient verbalized understanding and agreement.
```

#### 3. **EHR Integration Export**
```json
{
  "resourceType": "Observation",
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "89408-3",
      "display": "Physical therapy exercise duration"
    }]
  },
  "valueQuantity": {
    "value": 45,
    "unit": "min",
    "system": "http://unitsofmeasure.org",
    "code": "min"
  },
  "effectiveDateTime": "2025-12-05T10:30:00Z"
}
```

**Required Packages:**
```bash
npm install pdfkit  # PDF generation
npm install xlsx    # Excel export
npm install @medplum/fhirtypes  # FHIR types
```

---

## 🔴 **CRITICAL: Evidence-Based Protocol Engine**

**Current State:** Risk assessments calculate probabilities but NO automated protocols

**What's Missing:**
- ❌ Diagnosis-specific exercise prescriptions
- ❌ Contraindication checking
- ❌ Auto-generated care plans
- ❌ Protocol libraries (orthopedic, cardiac, neuro, pulmonary)
- ❌ Dosage recommendations (frequency, intensity, duration)

**Impact:**
- Nurses don't know "how much is enough"
- Inconsistent prescriptions across providers
- No standardized, evidence-based protocols
- Legal liability without documented rationale

**Implementation Priority:** **HIGH (Week 3-4)**

### Example Protocol Database:

```typescript
// shared/protocols.ts
export const clinicalProtocols = {
  "total_knee_replacement": {
    "name": "Total Knee Replacement - Post-Op Mobility",
    "indication": "Status post TKA",
    "contraindications": ["DVT", "active infection", "unstable fracture"],
    "phases": [
      {
        "phase": "POD 0-2",
        "frequency": "BID",
        "duration": "5-10 minutes",
        "resistance": "Minimal (10-15W)",
        "rpm": "30-40",
        "goals": "Maintain circulation, prevent stiffness",
        "progressionCriteria": "Pain <4/10, tolerates full session"
      },
      {
        "phase": "POD 3-7",
        "frequency": "TID",
        "duration": "10-15 minutes",
        "resistance": "Low (15-25W)",
        "rpm": "40-50",
        "goals": "Increase ROM, prevent deconditioning",
        "progressionCriteria": "ROM >90°, pain <3/10"
      }
    ],
    "evidence": "AAOS Guidelines 2021, JBJS 2020;102(12):1055-1064"
  },

  "pneumonia": {
    "name": "Community-Acquired Pneumonia - Early Mobilization",
    "indication": "CAP with respiratory compromise",
    "contraindications": ["O2 sat <88% on room air", "hemodynamic instability"],
    "protocol": {
      "frequency": "QID",
      "duration": "5 minutes",
      "resistance": "Very Low (5-10W)",
      "rpm": "20-30",
      "monitoring": ["O2 sat >90%", "HR <120", "RR <25"],
      "stopCriteria": ["O2 sat drop >4%", "severe dyspnea", "chest pain"]
    },
    "evidence": "Lancet Respir Med 2016;4(5):390-8"
  }
};

// API endpoint: POST /api/protocols/recommend
// Input: diagnosis, comorbidities, current mobility status
// Output: Recommended protocol with rationale
```

---

## 🟡 **HIGH PRIORITY: Real-Time Monitoring Dashboard**

**What's Needed:**
- Live session monitoring view for nurses' station
- Multi-patient monitoring (see all active sessions at once)
- Alert system for concerning patterns
- Emergency stop detection

### Nurse Station Dashboard Mockup:
```
┌─────────────────────────────────────────────────────────────┐
│ ACTIVE SESSIONS - Med-Surg 4th Floor                        │
├─────────────────────────────────────────────────────────────┤
│ Room 401 | Neil Jairath      | 🟢 ACTIVE   | 12:45 / 15:00 │
│   RPM: 42 | Power: 23W | HR: 95 | O2: 97%   | Goal: 80%    │
│                                                              │
│ Room 403 | Jane Smith        | 🟡 PAUSED   |  8:30 / 15:00 │
│   RPM: 0  | Power: 0W  | HR: 88 | O2: 96%   | ⚠️ Check on  │
│                                                              │
│ Room 407 | Bob Johnson       | 🟢 ACTIVE   | 14:55 / 15:00 │
│   RPM: 38 | Power: 18W | HR: 102| O2: 94%   | Goal: 99%    │
│   🎉 Almost done!                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🟡 **HIGH PRIORITY: Smart Alerts & Decision Support**

**What Nurses Need:**

### 1. **Proactive Alerts**
```typescript
{
  "alertType": "session_incomplete",
  "patient": "Neil Jairath, Room 401",
  "message": "Patient stopped session at 8min (goal: 15min)",
  "action": "Check on patient - possible fatigue or discomfort",
  "priority": "medium",
  "timestamp": "2025-12-05T10:45:00Z"
}

{
  "alertType": "risk_increase",
  "patient": "Jane Smith, Room 403",
  "message": "DVT risk increased from 25% → 45%",
  "reason": "No mobility activity in 48 hours",
  "action": "Implement mobility protocol STAT",
  "priority": "high"
}
```

### 2. **Protocol Compliance Tracking**
```typescript
{
  "patient": "Neil Jairath",
  "protocol": "Post-TKA Mobility - POD 3",
  "prescribed": "TID x 15min",
  "completed": {
    "morning": "✅ 15min @ 0730",
    "afternoon": "⏳ Due at 1400",
    "evening": "⚪ Due at 2000"
  },
  "compliance": "67% (2/3 sessions today)"
}
```

---

## 🟡 **HIGH PRIORITY: Population Health Analytics**

**What Institutions Need:**

### 1. **Outcome Metrics Dashboard**
```
┌────────────────────────────────────────────────────────┐
│ MOBILITY PROGRAM OUTCOMES - Last 30 Days               │
├────────────────────────────────────────────────────────┤
│ Patients Enrolled:        127                          │
│ Average LOS:              4.2 days (↓ 1.8 days)       │
│ Fall Rate:                0.8% (↓ 62%)                 │
│ DVT/PE Events:            0 (↓ 100%)                   │
│ Readmissions (30d):       8.2% (↓ 3.1%)               │
│ Patient Satisfaction:     4.7/5 ⭐                     │
│                                                         │
│ 💰 Estimated Cost Savings: $284,000                    │
└────────────────────────────────────────────────────────┘
```

### 2. **CMS Quality Measures**
- Hospital-Acquired Conditions (HAC) reduction
- Value-Based Purchasing (VBP) metrics
- Bundled payment performance
- HCAHPS scores (patient satisfaction)

---

## 🟢 **MEDIUM PRIORITY: Enhanced Patient Engagement**

### 1. **Family Portal**
- View loved one's progress remotely
- Send encouragement messages
- Video call during exercise sessions
- Share milestones on social media (HIPAA-compliant)

### 2. **Gamification Enhancements**
- **Challenges:** "Cycle to Disney World" (track cumulative miles)
- **Achievements:** Unlock badges visible on device screen
- **Competitions:** Floor vs floor, hospital vs hospital
- **Rewards:** Physical therapy swag, gift cards, charity donations

### 3. **Music Integration**
- Spotify/Apple Music integration
- RPM-matched playlists (tempo matching)
- Karaoke mode for distraction

---

## 🟢 **MEDIUM PRIORITY: Device Management System**

**Current Gap:** No device fleet management

**Needed Features:**
- Device inventory tracking
- Maintenance schedules
- Calibration alerts
- Battery status monitoring
- Offline device detection
- Device assignment workflow
- Cleaning/sanitation logging (infection control)

---

## 📊 **IMPLEMENTATION PRIORITY MATRIX**

### **MUST HAVE (Next 4 Weeks)**
1. ✅ Real-time WebSocket communication (Week 1-2)
2. ✅ Clinical documentation export (Week 2-3)
3. ✅ Evidence-based protocol engine (Week 3-4)
4. ✅ Nurse monitoring dashboard (Week 4)

### **SHOULD HAVE (Weeks 5-8)**
5. Smart alerts & decision support
6. Population health analytics
7. HL7/FHIR EHR integration
8. Multi-patient monitoring view

### **NICE TO HAVE (Weeks 9-12)**
9. Family engagement portal
10. Enhanced gamification
11. Music integration
12. Device fleet management

---

## 🏗️ **TECHNICAL ARCHITECTURE ADDITIONS**

### Required Infrastructure:

```typescript
// 1. WebSocket Server
server/websocket.ts - Real-time bidirectional communication

// 2. Report Generation Service
server/reports/
  ├── pdf-generator.ts        // Nursing notes, PT summaries
  ├── fhir-exporter.ts        // FHIR R4 resources
  ├── shift-report.ts         // 12-hour summaries
  └── outcome-report.ts       // Population analytics

// 3. Protocol Engine
server/protocols/
  ├── protocol-matcher.ts     // Match diagnosis to protocol
  ├── contraindication.ts     // Safety checking
  ├── progression.ts          // Auto-advance protocols
  └── evidence-library.ts     // Clinical guidelines database

// 4. Alert System
server/alerts/
  ├── rule-engine.ts          // Alert triggers
  ├── notification.ts         // SMS, email, push
  └── escalation.ts           // Alert escalation rules

// 5. Analytics Engine
server/analytics/
  ├── outcomes-calculator.ts  // LOS, fall rates, DVT rates
  ├── roi-calculator.ts       // Cost savings
  └── quality-metrics.ts      // CMS measures
```

---

## 💡 **CRITICAL USER EXPERIENCE IMPROVEMENTS**

### **For Nurses:**
1. **One-Click Documentation:** "Export to EMR" button
2. **Protocol Autopilot:** System tells them exactly what to do
3. **Shift Handoff Report:** Auto-generated summary
4. **Smart Alerts:** Only notify for actionable items
5. **Batch Operations:** Set goals for all patients at once

### **For Physical Therapists:**
1. **Evidence-Based Prescriptions:** Auto-generate from diagnosis
2. **Progress Tracking:** Visual trends over time
3. **Outcome Predictions:** "At current rate, patient will be independent in 5 days"
4. **Documentation Templates:** SOAP notes auto-populated
5. **Billing Support:** CPT code suggestions with documentation

### **For Patients:**
1. **Clear Goals:** "Cycle for 15 minutes, 3 times today"
2. **Real-Time Encouragement:** Notifications from care team
3. **Visible Progress:** Badges, achievements, milestones
4. **Competition:** Compare with other patients (anonymized)
5. **Family Connection:** Share progress with loved ones

### **For Hospital Administrators:**
1. **ROI Dashboard:** Cost savings, outcome improvements
2. **Compliance Reporting:** Automated CMS quality measures
3. **Utilization Metrics:** Device usage rates, patient adoption
4. **Benchmarking:** Compare against national averages
5. **Predictive Analytics:** Forecast readmissions, complications

---

## 🎯 **RECOMMENDED NEXT STEPS**

### **Phase 1: Foundation (Weeks 1-2)**
- Implement WebSocket real-time communication
- Build live monitoring dashboard for nurses
- Create basic alert system

### **Phase 2: Clinical Integration (Weeks 3-4)**
- Build protocol engine with evidence library
- Implement PDF report generation
- Create shift summary reports

### **Phase 3: Workflow Optimization (Weeks 5-6)**
- FHIR/HL7 export for EHR integration
- Smart alert system with escalation
- Multi-patient monitoring view

### **Phase 4: Analytics & ROI (Weeks 7-8)**
- Population health analytics dashboard
- Outcome metrics tracking
- CMS quality measure reporting

---

## 🚀 **GAME CHANGERS**

These features would make Bedside Bike **essential** to clinical workflows:

1. **"Nurse Autopilot"** - System generates protocols, alerts for non-compliance, auto-documents
2. **"One-Click Export"** - All session data → EMR with single button press
3. **"Smart Goals"** - AI adjusts goals based on real-time performance and diagnosis
4. **"Live Leaderboard"** - Patients see real-time competition during sessions
5. **"Predictive Alerts"** - "Patient Jane Smith at high risk for deconditioning - recommend immediate intervention"

---

**Bottom Line:** Current system has excellent foundation, but missing the **connective tissue** between devices and clinical workflows. Real-time communication + automated documentation + evidence-based protocols = adoption at scale.
