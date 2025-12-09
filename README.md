# Bedside Bike - Real-Time Mobility Platform

A comprehensive web application for hospital-based mobility programs using the Bedside Bike device. Provides real-time session monitoring, evidence-based clinical protocols, risk assessment, personalized medicine approach, and automated documentation for nurses and physical therapists.

---

## 📡 **DEVICE CONNECTION INSTRUCTIONS**

### For Hardware Engineers: Connecting Real Bedside Bike Devices

The web application uses **WebSocket** for bidirectional real-time communication with Bedside Bike devices.

#### **WebSocket Endpoint**
```
ws://[SERVER_URL]:5000/ws/device-bridge?type=device&deviceId=[DEVICE_ID]
```

**Production:**
```
wss://bedside-bike.azurewebsites.net/ws/device-bridge?type=device&deviceId=[DEVICE_ID]
```

#### **Connection Parameters**
- `type`: Must be `"device"` (identifies this as a hardware device connection)
- `deviceId`: Unique identifier for the device (e.g., "121", "122", "BB-001")

#### **Message Format**

**1. Session Update (Device → Server)**

Send this message **every 1 second** during an active session:

```typescript
{
  "type": "session_update",
  "data": {
    "sessionId": number,        // Session ID from start session API
    "patientId": number,         // Patient ID assigned to this device
    "deviceId": string,          // Your device's unique ID
    "timestamp": ISO8601 string, // Current timestamp
    "metrics": {
      "rpm": number,             // Current RPM (cadence)
      "power": number,           // Current power output in watts
      "distance": number,        // Total distance in meters
      "duration": number,        // Seconds since session start
      "heartRate": number,       // Optional: heart rate if sensor available
      "legsRpm": number,         // Optional: bilateral legs RPM
      "armsRpm": number          // Optional: arms RPM
    },
    "status": "active" | "paused" | "completed"
  }
}
```

**Example:**
```json
{
  "type": "session_update",
  "data": {
    "sessionId": 42,
    "patientId": 4,
    "deviceId": "121",
    "timestamp": "2025-12-06T03:14:23.000Z",
    "metrics": {
      "rpm": 45,
      "power": 25,
      "distance": 150,
      "duration": 120,
      "heartRate": 88
    },
    "status": "active"
  }
}
```

**2. Device Status (Device → Server)**

Send periodically to report device health:

```typescript
{
  "type": "device_status",
  "data": {
    "deviceId": string,
    "status": "online" | "offline" | "error",
    "batteryLevel": number,      // Optional: 0-100
    "firmwareVersion": string,   // Optional: e.g., "1.2.3"
    "lastHeartbeat": ISO8601 string
  }
}
```

#### **REST API Endpoints for Devices**

**Start a Session:**
```bash
POST /api/sessions
Content-Type: application/json

{
  "patientId": 4,
  "deviceId": "121",
  "duration": 900,  // Target duration in seconds
  "sessionDate": "2025-12-06"
}

Response: { "id": 42, ... }  // Use this sessionId in WebSocket messages
```

#### **Testing Your Device Connection**

Use the built-in device simulator:

```bash
npx tsx server/websocket/device-simulator.ts \
  --sessionId=1 \
  --deviceId=121 \
  --patientId=4 \
  --targetDuration=60
```

---

## 🚀 **Quick Start**

### Local Development

```bash
# Install dependencies
npm install

# Initialize local database
npx tsx scripts/init-local-db.ts

# Start development server
npm run dev

# Server runs on http://localhost:5000
# WebSocket available at ws://localhost:5000/ws/device-bridge
```

### Environment Variables

Create a `.env` file:

```env
# Local Development
USE_LOCAL_DB=true

# Azure SQL (for production)
DATABASE_URL="Server=tcp:..."

# Session Security
SESSION_SECRET=your-secure-random-string-here

# Optional: AI Features
# ANTHROPIC_API_KEY=your_api_key_here

NODE_ENV=development
```

---

## 📊 **Features**

### Core Platform Features

#### Real-Time Monitoring
- ✅ Live session tracking from devices via WebSocket
- ✅ Real-time RPM, power, distance, duration display
- ✅ Multi-patient monitoring dashboard for nurses
- ✅ Automatic alerts for paused/incomplete sessions
- ✅ Device data streaming with automatic power calculation

#### Risk Assessment
- ✅ 4 clinical outcomes: deconditioning, VTE, falls, pressure injuries
- ✅ Evidence-based logistic regression algorithms
- ✅ AI-powered text processing for diagnoses
- ✅ Mobility benefit predictions with early mobilization impact
- ✅ Discharge disposition and readmission risk predictions

#### Clinical Protocols
- ✅ Evidence-based protocol matching by diagnosis
- ✅ Automated prescription generation (frequency, duration, resistance)
- ✅ Phase-based progression (POD 0-2, POD 3-7, etc.)
- ✅ TKA, THA, pneumonia, stroke, cardiac, general med/surg protocols
- ✅ Protocol assignment and progression tracking

#### Documentation & Reports
- ✅ PDF nursing shift summaries
- ✅ PT progress notes (SOAP format)
- ✅ Insurance authorization reports
- ✅ Clinical documentation with timestamps

#### Gamification
- ✅ Patient achievements and badges
- ✅ Leaderboards (anonymous)
- ✅ Kudos system for peer encouragement
- ✅ Progress tracking over time
- ✅ XP and level system

#### Smart Alert System
- ✅ Real-time clinical alerts
- ✅ Protocol deviation detection
- ✅ Inactivity monitoring
- ✅ Risk-based prioritization
- ✅ Alert acknowledgment tracking

---

### Personalized Medicine Features (Patent-Protected)

#### Tier 1: High Priority Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Personalized Protocol Matching** | ✅ | Multi-factor algorithm matches protocols to patient diagnosis, comorbidities, age, mobility level, and personality type |
| **Fatigue-Triggered Auto-Resistance** | ✅ | Real-time detection of power decline, cadence variability, and bilateral coordination changes triggers automatic resistance reduction |
| **Progressive Overload Auto-Scheduling** | ✅ | Adaptive resistance and duration progression based on performance trends with confidence intervals |
| **Setback Recovery Protocol** | ✅ | Automatic goal reduction after medical events (falls, surgery, illness) with re-baseline assessment |
| **Medication Interaction Alerts** | ✅ | Drug class-specific monitoring (beta-blockers limit HR, anticoagulants require fall precautions, steroids affect bone loading) |
| **Contraindication Verification** | ✅ | Pre-session checks for absolute, relative, and temporal contraindications with provider override capability |
| **Multi-Modal Mobility Score** | ✅ | Fuses data from bike metrics, ambulation tests, PT assessments, and ADL observations |
| **Barthel Index Translation** | ✅ | Converts bike performance metrics to standardized Barthel Index scores |
| **FIM Score Translation** | ✅ | Converts bike performance metrics to Functional Independence Measure scores |
| **Hospital Mobility Score** | ✅ | Generates standardized hospital mobility scores for quality reporting |
| **Cohort Performance Benchmarking** | ✅ | Privacy-preserving comparison with similar patients (same diagnosis, age range, mobility level) |
| **Virtual Competition System** | ✅ | Anonymous leaderboards and milestone celebrations for patient motivation |
| **Insurance Authorization Reports** | ✅ | Auto-generated documentation for SNF, Home Health, and Outpatient PT with criteria evaluation |
| **Fall Risk Prediction** | ✅ | Predictive algorithm using mobility metrics, fatigue patterns, and medical history |

#### Tier 2: Sensor-Dependent Features (Foundations Ready)

| Feature | Status | Description |
|---------|--------|-------------|
| **Bilateral Force Visualization** | ✅ | 3D force vector display and butterfly plots (uses RPM asymmetry when force sensors unavailable) |
| **Bilateral Force Balancing** | ✅ | Real-time feedback to help patients balance left/right force output |
| **Stroke Rehabilitation Protocol** | ✅ | Asymmetry-focused protocol for stroke patients with affected side tracking |
| **Neurological Deficit Detection** | ✅ | Early warning system for sudden asymmetry changes indicating potential neurological events |

---

## 🗄️ **Database**

### Local Development (SQLite)
- Used when `USE_LOCAL_DB=true`
- Database file: `local.db`
- Automatic schema creation via `init-local-db.ts`

### Production (Azure SQL Server)
- Used when `USE_LOCAL_DB=false` or `DATABASE_URL` is set
- HIPAA-compliant audit logging
- Automatic failover and backups

### Schema Tables
- **Core**: users, sessions, goals, achievements, patient_stats
- **Clinical**: risk_assessments, protocol_assignments, alerts
- **Personalization**: personalization_profiles, fatigue_events, medication_interactions
- **Competition**: virtual_competitions, cohort_comparisons
- **Reports**: insurance_reports, mobility_scores

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     Bedside Bike Devices                    │
│           (RPM, Resistance, Battery, Bilateral Data)        │
└───────────────────────┬─────────────────────────────────────┘
                        │ WebSocket + Azure SQL
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Device Data Adapter Layer                      │
│   • RPM → Power calculation                                 │
│   • Bilateral asymmetry detection                           │
│   • Real-time fatigue analysis                              │
└───────────────────────┬─────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Personalization Engines                        │
│   • Protocol Matcher          • Fatigue Detection           │
│   • Progressive Overload      • Medication Safety           │
│   • Mobility Scoring          • Competition Engine          │
│   • Insurance Reports         • Bilateral Force             │
└───────────────────────┬─────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express.js REST API                        │
│   • Session management        • Risk assessment             │
│   • Protocol matching         • Report generation           │
│   • Personalization APIs      • Alert management            │
└───────────────────────┬─────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                React Frontend (Vite)                        │
│   • Provider dashboard        • Patient dashboard           │
│   • Real-time monitoring      • Risk calculator             │
│   • Protocol management       • Competition views           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 **Project Structure**

```
Bedside-Bike/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/             # Dashboard, risk calculator, goals
│   │   ├── components/        # Reusable UI components
│   │   └── lib/               # Auth, utilities
│
├── server/                    # Express.js backend
│   ├── websocket/             # Real-time device communication
│   ├── protocols/             # Evidence-based protocol engine
│   ├── reports/               # Clinical documentation system
│   ├── alerts/                # Smart alert system
│   ├── personalization/       # Personalized medicine engines
│   │   ├── personalized-protocol-matcher.ts
│   │   ├── fatigue-detection-engine.ts
│   │   ├── progressive-overload-engine.ts
│   │   ├── medication-safety-engine.ts
│   │   ├── mobility-scoring-engine.ts
│   │   ├── competition-engine.ts
│   │   ├── insurance-report-engine.ts
│   │   ├── bilateral-force-engine.ts
│   │   ├── device-data-adapter.ts
│   │   └── routes.ts
│   ├── routes.ts              # REST API endpoints
│   ├── risk-calculator.ts
│   └── storage.ts             # Database operations
│
├── shared/                    # Shared types and schemas
│   ├── schema.sqlite.ts
│   ├── schema.mssql.ts
│   └── schema.ts
│
├── DatabaseFiles/             # Azure SQL schema
│   ├── Tables/
│   └── StoredProcedures/
│
└── scripts/                   # Database initialization
    └── init-local-db.ts
```

---

## 🎮 **Platform Walkthrough**

This section guides you through every feature of the platform. Start the application with `npm run dev` and open http://localhost:5000 in your browser.

### 1. Patient Login & Dashboard

**Steps:**
1. On the home page, click **"Patient Login"**
2. Enter patient information:
   - First Name: `Neil`
   - Last Name: `Jairath`
   - Date of Birth: `1996-04-01`
3. Click **"Start Session"**
4. View your personalized dashboard

**What you'll see:**
- **Daily Goals**: Progress rings showing duration, power, and session targets
- **Recent Sessions**: Chart of your last 7 days of activity
- **Achievements**: Badges earned for milestones
- **Current Streak**: Consecutive days of activity

### 2. Provider Login & Patient Management

**Steps:**
1. Return to home page, click **"Provider Login"**
2. Enter provider email: `heidikissane@hospital.com`
3. Click **"Sign In"**
4. View the provider dashboard

**What you'll see:**
- **Patient List**: All patients with recent activity
- **Risk Status**: Color-coded risk indicators
- **Protocol Assignments**: Current protocols per patient
- **Alert Counts**: Unacknowledged alerts

### 3. Risk Assessment Calculator

**Steps:**
1. From provider dashboard, click **"Risk Assessment"** or navigate to `/risk-assessment`
2. Select a patient or use anonymous mode
3. Fill in the assessment form:
   - Age, sex, level of care
   - Mobility status, cognitive status
   - Admission diagnosis
   - Comorbidities (checkboxes)
   - Current medications
4. Click **"Calculate Risks"**

**What you'll see:**
- **Four Risk Scores**: Deconditioning, VTE, Falls, Pressure Injuries
- **Risk Level Indicators**: Low/Moderate/High with probabilities
- **Mobility Benefits**: Impact of early mobilization
- **Discharge Predictions**: LOS reduction, home discharge probability
- **Recommended Goals**: Evidence-based exercise targets

### 4. Protocol Assignment

**Steps:**
1. From provider dashboard, select a patient
2. Click **"Assign Protocol"**
3. Enter diagnosis (e.g., "Total Knee Arthroplasty")
4. System auto-matches appropriate protocol
5. Review protocol phases and prescriptions
6. Click **"Assign to Patient"**

**What you'll see:**
- **Matched Protocol**: Best-fit protocol with confidence score
- **Phase Details**: Daily frequency, duration, resistance by POD
- **Progression Criteria**: When patient advances to next phase
- **Contraindications**: Conditions that require modification

### 5. Personalized Protocol Matching

**Steps:**
1. Navigate to `/api/patients/4/protocol-match` (or use the UI)
2. System analyzes patient profile:
   - Diagnosis and comorbidities
   - Age and mobility level
   - Previous performance data
   - Detected personality type (achiever, socializer, steady, cautious)
3. View ranked protocol recommendations

**API Example:**
```bash
curl -X POST http://localhost:5000/api/patients/4/protocol-match \
  -H "Content-Type: application/json" \
  -d '{"diagnosis": "hip fracture", "comorbidities": ["diabetes", "hypertension"]}'
```

### 6. Real-Time Session Monitoring

**Steps:**
1. Start a session from patient dashboard or device
2. From provider dashboard, click **"Live Monitoring"**
3. Watch real-time metrics update

**What you'll see:**
- **Live RPM and Power**: Updates every second
- **Session Progress**: Duration vs. goal
- **Fatigue Indicators**: Warning when fatigue detected
- **Bilateral Balance**: Left/right symmetry (if available)

### 7. Fatigue Detection

**Automatic Feature - Observe During Sessions:**

The system continuously monitors for:
- **Power Decline**: >10% drop from session peak
- **Cadence Variability**: Increased irregularity
- **Bilateral Asymmetry**: One side weakening

**What happens:**
- Yellow alert for mild fatigue
- Orange alert for moderate fatigue
- Red alert for severe fatigue (with auto-resistance reduction recommendation)

### 8. Progressive Overload Evaluation

**Steps:**
1. Navigate to patient details
2. Click **"Progression Check"**
3. View readiness assessment

**API Example:**
```bash
curl http://localhost:5000/api/patients/4/progression
```

**What you'll see:**
- **Current Performance**: Average metrics over last 3 sessions
- **Progression Readiness**: Whether patient is ready to advance
- **Recommended Changes**: Specific resistance/duration increases
- **Confidence Level**: Statistical confidence in recommendation

### 9. Medication Safety Check

**Steps:**
1. From patient profile, view medications
2. Click **"Safety Check"** or make API call
3. System analyzes drug-exercise interactions

**API Example:**
```bash
curl -X POST http://localhost:5000/api/patients/4/medication-analysis \
  -H "Content-Type: application/json" \
  -d '{"medications": ["metoprolol", "warfarin", "lisinopril"]}'
```

**What you'll see:**
- **Interaction Alerts**: Drug-specific exercise precautions
- **Heart Rate Limits**: For beta-blockers
- **Fall Precautions**: For anticoagulants
- **Monitoring Requirements**: Blood pressure, symptoms

### 10. Contraindication Verification

**Steps:**
1. Before starting a session, system auto-checks contraindications
2. View any warnings in the pre-session checklist
3. If contraindication found, provider can override with justification

**Contraindication Types:**
- **Absolute**: No exercise allowed (e.g., unstable angina)
- **Relative**: Exercise with precautions (e.g., recent surgery)
- **Temporal**: Wait period required (e.g., post-dialysis)

### 11. Mobility Scores

**Steps:**
1. Navigate to patient details
2. Click **"Mobility Score"** tab
3. View multi-modal assessment

**Available Scores:**
```bash
# Get overall mobility score
curl http://localhost:5000/api/patients/4/mobility-score

# Get Barthel Index
curl http://localhost:5000/api/patients/4/barthel-index

# Get FIM score
curl http://localhost:5000/api/patients/4/fim-score

# Get Hospital Mobility Score
curl http://localhost:5000/api/patients/4/hospital-mobility-score
```

### 12. Cohort Comparison

**Steps:**
1. From patient dashboard, click **"Compare"**
2. View how patient performs vs. similar patients

**What you'll see:**
- **Anonymized Comparison**: No identifying information
- **Percentile Ranking**: Where patient stands
- **Similar Patients**: Same diagnosis, age range, mobility level
- **Performance Trends**: Improvement vs. cohort average

### 13. Virtual Competition

**Steps:**
1. From patient dashboard, click **"Competitions"**
2. View available competitions
3. Join a competition
4. Track progress on leaderboard

**API Examples:**
```bash
# Get available competitions
curl http://localhost:5000/api/competitions

# Join a competition
curl -X POST http://localhost:5000/api/competitions/1/join \
  -H "Content-Type: application/json" \
  -d '{"patientId": 4}'

# View leaderboard
curl http://localhost:5000/api/competitions/1/leaderboard
```

### 14. Insurance Authorization Reports

**Steps:**
1. From provider dashboard, select patient
2. Click **"Generate Insurance Report"**
3. Select report type (SNF, Home Health, Outpatient PT)
4. Review auto-generated documentation
5. Sign and export as PDF

**API Example:**
```bash
curl -X POST http://localhost:5000/api/patients/4/insurance-report \
  -H "Content-Type: application/json" \
  -d '{"reportType": "snf", "generatedBy": 1}'
```

### 15. Clinical Documentation

**Steps:**
1. From provider dashboard, click **"Reports"**
2. Select report type:
   - **Shift Summary**: For nursing handoffs
   - **PT Progress Note**: SOAP format
3. Select time range and sessions
4. Generate and download

**API Examples:**
```bash
# Generate shift summary PDF
curl -X POST http://localhost:5000/api/reports/shift-summary \
  -H "Content-Type: application/json" \
  -d '{"patientId": 4, "startTime": "2025-12-06T07:00:00Z", "endTime": "2025-12-06T19:00:00Z"}'

# Generate PT progress note
curl -X POST http://localhost:5000/api/reports/pt-progress-note \
  -H "Content-Type: application/json" \
  -d '{"patientId": 4, "sessionIds": [1, 2, 3]}'
```

### 16. Alert Management

**Steps:**
1. From provider dashboard, view alert panel
2. Click on an alert to view details
3. Acknowledge alert with your provider ID
4. View alert history

**Alert Types:**
- **Inactivity**: Patient hasn't exercised in 24+ hours
- **Protocol Deviation**: Session didn't meet prescription
- **Fatigue**: Significant fatigue detected during session
- **Risk Change**: Patient's risk level has changed
- **Vital Signs**: Abnormal metrics during session

### 17. Bilateral Force Analysis (Tier 2)

**Note:** Full functionality requires bilateral force sensors. With standard sensors, system estimates asymmetry from RPM patterns.

**Steps:**
1. During a session, view bilateral display
2. See real-time left/right comparison
3. View butterfly plot for stroke patients

**API Examples:**
```bash
# Get bilateral feedback
curl http://localhost:5000/api/patients/4/bilateral-feedback

# Check for neurological events
curl http://localhost:5000/api/patients/4/neurological-check

# Initialize stroke protocol
curl -X POST http://localhost:5000/api/patients/4/stroke-protocol \
  -H "Content-Type: application/json" \
  -d '{"affectedSide": "left", "initiatedBy": 1}'
```

### 18. Kudos & Social Features

**Steps:**
1. From patient dashboard, click **"Community"**
2. View feed of achievements from your unit
3. Send kudos reactions (clap, muscle, heart)
4. Send nudges to encourage other patients

**Privacy Controls:**
- Opt-in only for social features
- Choose display name and avatar
- Select visibility level

---

## 🔐 **Security**

- ✅ API rate limiting (prevent DoS)
- ✅ Session-based authentication
- ✅ HTTPS/WSS in production
- ✅ SQL injection prevention (parameterized queries)
- ✅ HIPAA-compliant logging
- ✅ Patient privacy controls (opt-in social features)
- ✅ Anonymous competition IDs

---

## 🧪 **Testing**

### Device Simulator
```bash
npx tsx server/websocket/device-simulator.ts \
  --sessionId=1 --deviceId=121 --patientId=4 --targetDuration=60
```

### API Testing
```bash
# Health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed

# Start session
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"patientId":4,"deviceId":"121","duration":900}'
```

---

## 📦 **Deployment**

### Azure Web App

```bash
# Build for production
npm run build

# Deploy to Azure
az webapp up --name bedside-bike --resource-group BedBike-RG
```

### Environment Variables (Production)
```env
USE_LOCAL_DB=false
DATABASE_URL=Server=tcp:beside-bike-server.database.windows.net,1433;...
SESSION_SECRET=<generate-secure-random-string>
NODE_ENV=production
```

---

## 🔧 **Integration Requirements for Engineers**

### Connecting to Real Bedside Bike Devices

The platform supports real-time data from physical Bedside Bike devices. When no device is connected, the system uses simulated data for demonstration.

#### Hardware Requirements

| Component | Status | Integration Notes |
|-----------|--------|-------------------|
| **Basic Bedside Bike** | ✅ Ready | Standard RPM and resistance sensors |
| **Heart Rate Monitor** | ⚡ Optional | Bluetooth or ANT+ connection |
| **Bilateral Force Sensors** | 🔜 Tier 2 | Required for stroke rehab features |

#### Device Integration Steps

1. **WebSocket Connection**
   ```javascript
   // Device firmware should establish WebSocket connection
   const ws = new WebSocket('wss://your-server/ws/device-bridge?type=device&deviceId=BB-001');

   // Send metrics every 1 second during active session
   ws.send(JSON.stringify({
     type: 'session_update',
     data: {
       sessionId: 123,
       patientId: 4,
       deviceId: 'BB-001',
       timestamp: new Date().toISOString(),
       metrics: {
         rpm: 45,
         power: 32,       // Calculated: RPM × (0.1 + resistance × 0.005)
         distance: 150,
         duration: 120,
         heartRate: 88    // Optional
       },
       status: 'active'
     }
   }));
   ```

2. **Power Calculation Formula**
   ```
   Power (watts) = RPM × (0.1 + Resistance × 0.005)
   ```
   Example: 45 RPM at resistance 4 = 45 × (0.1 + 4 × 0.005) = 45 × 0.12 = 5.4W

3. **Bilateral Force Sensors (Tier 2)**
   ```javascript
   // When bilateral force sensors are installed
   metrics: {
     ...standardMetrics,
     leftForce: 28.5,    // Newtons
     rightForce: 26.2,   // Newtons
     leftAngle: 45,      // Degrees (0-360)
     rightAngle: 225     // Degrees (0-360)
   }
   ```

### Connecting to Azure Database

The platform uses SQLite for local development and Azure SQL for production.

#### Azure SQL Connection

1. **Set Environment Variables**
   ```env
   USE_LOCAL_DB=false
   DATABASE_URL="Server=tcp:beside-bike-server.database.windows.net,1433;Initial Catalog=BedsideBike;Persist Security Info=False;User ID=your-username;Password=your-password;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
   ```

2. **Database Tables Required**
   The application expects these tables in Azure SQL (schemas in `DatabaseFiles/Tables/`):
   - `users` - Patient and provider accounts
   - `exercise_sessions` - Session records
   - `pedaling_data` - Real-time pedaling metrics
   - `device_data` - Device telemetry
   - `device_metadata` - Device configurations
   - `voltage_monitor` - Power system monitoring

3. **Device Data Adapter**
   The `server/personalization/device-data-adapter.ts` bridges real device data to the personalization engines:
   ```typescript
   import { convertPedalingData, DeviceDataStream } from './personalization';

   // Convert raw device data to standardized metrics
   const metrics = convertPedalingData(rawPedalingData);

   // Stream session data for real-time analysis
   const stream = getOrCreateStream(sessionId, patientId);
   stream.addMetric(metrics);
   ```

---

## 🎭 **Mock Data & Demonstration Mode**

### What Uses Simulated Data

The platform includes demonstration modes for features requiring hardware not yet installed:

| Feature | Real Data Source | Demo Mode Behavior |
|---------|-----------------|-------------------|
| **Live Session Metrics** | Device WebSocket | Simulated RPM/power with realistic patterns |
| **Fatigue Detection** | Real-time device data | Simulated fatigue progression over time |
| **Bilateral Force** | Force sensors | Simulated left/right force with random asymmetry |
| **Patient Sessions** | Azure SQL database | Auto-generated sessions for last 4 days |
| **Cohort Comparison** | Population data | Simulated cohort percentiles |

### Identifying Mock Data

Pages using simulated data display a **yellow warning banner**:

```
⚠️ Simulated Data Mode
Live metrics are simulated for demonstration. Connect to a real Bedside Bike device and Azure database for actual patient data.
```

### Disabling Mock Data

To use only real data in production:

1. Ensure `USE_LOCAL_DB=false` in environment
2. Connect to Azure SQL with real patient data
3. Connect physical devices via WebSocket
4. The system automatically detects real connections and disables simulation

---

## 🧑‍⚕️ **Provider Dashboard Navigation**

The provider dashboard includes a navigation menu (☰) for accessing all personalization features:

### Clinical Tools
- **Protocol Matching** (`/protocol-matching`) - AI-powered protocol recommendations
- **Fatigue Monitor** (`/fatigue-monitor`) - Real-time fatigue detection
- **Progression Dashboard** (`/progression`) - Progressive overload tracking
- **Medication Safety** (`/medication-safety`) - Drug-exercise interactions

### Assessment & Scoring
- **Mobility Scores** (`/mobility-scores`) - Multi-modal scoring system
- **Bilateral Force** (`/bilateral-force`) - Force symmetry analysis

### Engagement & Reporting
- **Competitions** (`/competitions`) - Virtual competitions & cohorts
- **Insurance Reports** (`/insurance-reports`) - Authorization documentation

### Quick Actions
- **Risk Calculator** - Direct link to risk assessment
- **Match Protocol** - Context-aware protocol matching for selected patient

---

## 📄 **License**

Proprietary - Bedside Bike, Inc.

Patent-pending features are protected intellectual property.

---

## 📞 **Support**

For device integration support, contact the development team.
