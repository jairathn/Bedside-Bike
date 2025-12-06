# Bedside Bike - Real-Time Mobility Platform

A comprehensive web application for hospital-based mobility programs using the Bedside Bike device. Provides real-time session monitoring, evidence-based clinical protocols, risk assessment, and automated documentation for nurses and physical therapists.

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
      "rpm": number,             // Current RPM
      "power": number,           // Current power output in watts
      "distance": number,        // Total distance in meters
      "duration": number,        // Seconds since session start
      "heartRate": number        // Optional: heart rate if sensor available
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

**3. Server Messages (Server → Device)**

The server will send:

```typescript
// Welcome message on connection
{
  "type": "device_status",
  "data": {
    "status": "connected",
    "message": "Connected to Bedside Bike server"
  }
}

// Future: Commands from providers
{
  "type": "command",
  "data": {
    "command": "start" | "stop" | "pause" | "set_resistance",
    "parameters": { ... }
  }
}
```

#### **Connection Lifecycle**

```
1. Device powers on
2. Connect to WiFi
3. Get session assignment from API: POST /api/sessions
4. Open WebSocket connection with deviceId
5. Receive welcome message from server
6. Start sending session_update messages every 1 second
7. Continue until session complete or stopped
8. Send final update with status: "completed"
9. Close WebSocket connection gracefully
```

#### **Heartbeat / Keep-Alive**

- Server pings device every 30 seconds
- Respond to pings with pong (automatic in most WebSocket libraries)
- If no pong received for 60 seconds, server closes connection
- Device should reconnect if disconnected unexpectedly

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

**Link Device to Patient:**
```bash
POST /api/devices/121/link
Content-Type: application/json

{
  "patientId": 4
}
```

**Get Device Status:**
```bash
GET /api/devices/121
```

#### **Testing Your Device Connection**

Use the built-in device simulator to verify your message format:

```bash
# Install dependencies
npm install

# Run the simulator
npx tsx server/websocket/device-simulator.ts \
  --sessionId=1 \
  --deviceId=121 \
  --patientId=4 \
  --targetDuration=60
```

This simulates a real device and shows you exactly what messages the server expects.

#### **Error Handling**

- If WebSocket closes unexpectedly, retry connection with exponential backoff
- If session update fails, queue messages and retry
- Log all errors with device ID and timestamp for debugging
- Server will automatically detect disconnection and notify providers

#### **Security Notes**

- Use WSS (secure WebSocket) in production
- Device authentication will be added (API key or certificate)
- All session data is logged for HIPAA compliance
- Session data stored in database survives server restarts

#### **Firmware Update Required?**

If your current firmware doesn't support WebSocket:
1. Keep using Azure SQL direct upload (we still support this)
2. Real-time monitoring won't work until WebSocket implemented
3. Historical data and reports will still function normally

Contact the development team for WebSocket integration support.

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

### Real-Time Monitoring
- ✅ Live session tracking from devices via WebSocket
- ✅ Real-time RPM, power, distance, duration
- ✅ Multi-patient monitoring dashboard for nurses
- ✅ Automatic alerts for paused/incomplete sessions

### Clinical Protocols (Week 2 - In Progress)
- 🔄 Evidence-based protocol matching by diagnosis
- 🔄 Automated prescription generation (frequency, duration, resistance)
- 🔄 Phase-based progression (POD 0-2, POD 3-7, etc.)
- 🔄 TKA, pneumonia, general med/surg protocols

### Risk Assessment
- ✅ 4 clinical outcomes: deconditioning, VTE, falls, pressure injuries
- ✅ Logistic regression algorithms
- ✅ AI-powered text processing for diagnoses

### Documentation & Reports (Week 3 - Planned)
- 🔄 PDF nursing shift summaries
- 🔄 PT progress notes (SOAP format)
- 🔄 One-click export to EMR (FHIR)
- 🔄 CMS quality measure reporting

### Gamification
- ✅ Patient achievements and badges
- ✅ Leaderboards
- ✅ Kudos system for peer encouragement
- ✅ Progress tracking over time

---

## 🗄️ **Database**

### Local Development (SQLite)
- Used when `USE_LOCAL_DB=true`
- Database file: `local.db`
- Automatic schema creation via `init-local-db.ts`
- Perfect for development and testing

### Production (Azure SQL Server)
- Used when `USE_LOCAL_DB=false` or `DATABASE_URL` is set
- Supports all MS SQL Server features
- HIPAA-compliant audit logging
- Automatic failover and backups

### Schema
- 15 tables covering users, sessions, goals, risks, devices
- Real-time tracking fields in `exercise_sessions`
- Alert system with priority levels
- Protocol assignments and progression tracking

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     Bedside Bike Devices                    │
│                  (via WiFi/Bluetooth → WiFi)                │
└───────────────────────┬─────────────────────────────────────┘
                        │ WebSocket
                        │ (Real-time session updates)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   WebSocket Server (Node.js)                │
│   • Bidirectional device ↔ server communication            │
│   • Real-time metric processing                             │
│   • Alert generation                                        │
│   • Database persistence                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ├──► SQLite (local) / Azure SQL (prod)
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express.js REST API                        │
│   • Session management                                      │
│   • Risk assessment                                         │
│   • Protocol matching                                       │
│   • Report generation                                       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/JSON
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                React Frontend (Vite)                        │
│   • Provider dashboard (nurses, PTs)                        │
│   • Patient dashboard                                       │
│   • Real-time monitoring                                    │
│   • Risk calculator                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 **Project Structure**

```
Bedside-Bike/
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/       # Dashboard, risk calculator, goals
│   │   ├── components/  # Reusable UI components
│   │   └── lib/         # Auth, utilities
│
├── server/              # Express.js backend
│   ├── websocket/       # Real-time device communication
│   │   ├── index.ts     # WebSocket server
│   │   ├── types.ts     # Message interfaces
│   │   └── device-simulator.ts  # Testing tool
│   ├── routes.ts        # REST API endpoints
│   ├── risk-calculator.ts
│   ├── logger.ts        # Winston logging
│   ├── rate-limit.ts    # API protection
│   └── session.ts       # Session management
│
├── shared/              # Shared types and schemas
│   ├── schema.sqlite.ts # SQLite schema
│   ├── schema.mssql.ts  # Azure SQL schema
│   └── schema.ts        # Re-export based on env
│
├── scripts/             # Database initialization
│   └── init-local-db.ts
│
└── docs/                # Documentation
    ├── FEATURE_ROADMAP.md
    ├── IMPLEMENTATION_PLAN.md
    └── GAPS_ANALYSIS_AND_RECOMMENDATIONS.md
```

---

## 🔐 **Security**

- ✅ API rate limiting (prevent DoS)
- ✅ Session-based authentication
- ✅ HTTPS/WSS in production
- ✅ SQL injection prevention (parameterized queries)
- ✅ HIPAA-compliant logging
- 🔄 Audit trail (Week 3)
- 🔄 Device authentication (planned)

---

## 🧪 **Testing**

### Device Simulator
```bash
npx tsx server/websocket/device-simulator.ts \
  --sessionId=1 --deviceId=121 --patientId=4 --targetDuration=60
```

### Manual API Testing
```bash
# Health check
curl http://localhost:5000/health

# Start session
curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"patientId":4,"deviceId":"121","duration":900}'
```

---

## 📦 **Deployment**

### Azure Web App (Recommended)

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

## 🤝 **Contributing**

See implementation roadmap in `IMPLEMENTATION_PLAN.md` for current development status.

Week 1: ✅ Real-time WebSocket communication
Week 2: 🔄 Evidence-based protocol engine (in progress)
Week 3: 🔄 Clinical documentation system
Week 4: 🔄 Smart alerts & monitoring dashboards

---

## 📄 **License**

Proprietary - Bedside Bike, Inc.

---

## 📞 **Support**

For device integration support, contact the development team.
