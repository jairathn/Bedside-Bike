# Bedside Bike - Gaps Analysis & Recommendations

**Analysis Date:** December 5, 2025
**Codebase:** Bedside Bike Web Application
**Version:** Post-Replit Migration to Azure SQL

---

## 🎯 Executive Summary

The Bedside Bike web application is a **well-architected, feature-rich healthcare platform** with sophisticated risk scoring algorithms, gamification, and social features. However, several gaps exist that should be addressed before production deployment.

**Overall Assessment:**
- ✅ **Strong Foundation:** Solid architecture, modern tech stack, comprehensive features
- ⚠️ **Production Readiness:** Needs testing, monitoring, and security enhancements
- 🔧 **Technical Debt:** Some missing infrastructure components

---

## 📊 Gap Categories

### 🔴 Critical (Must Fix Before Production)
- Missing automated testing
- No structured error logging
- Session storage in memory (not production-ready)
- No audit trail for HIPAA compliance
- Missing API rate limiting

### 🟡 Important (Should Fix Soon)
- No database migrations (manual SQL required)
- WebSockets installed but not implemented
- No background job scheduling
- No health check endpoints
- No API documentation

### 🟢 Nice to Have (Future Enhancements)
- No file upload/attachment capability
- No data export features
- No email notification system
- No SMS/text messaging integration

---

## 🔴 Critical Gaps (Priority 1)

### 1. **Testing Infrastructure**

**Current State:** No test files exist in the repository

**Impact:**
- Risk of regressions when making changes
- Difficult to verify business logic correctness
- No confidence in deployment process

**Recommendation:**

**A. Unit Tests for Risk Algorithms**
```bash
npm install --save-dev vitest @vitest/ui
```

Create `server/risk-calculator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateRisks } from './risk-calculator';

describe('Risk Calculator', () => {
  it('should calculate deconditioning risk for bedbound patient', () => {
    const input = {
      age: 75,
      mobility_status: 'bedbound',
      level_of_care: 'icu',
      // ... other required fields
    };
    const result = calculateRisks(input);
    expect(result.deconditioning.probability).toBeGreaterThan(0.15);
  });
});
```

**B. Integration Tests for API Endpoints**
```bash
npm install --save-dev supertest @types/supertest
```

Create `server/routes.test.ts`:
```typescript
import request from 'supertest';
import { app } from './index';

describe('POST /api/risk-assessment', () => {
  it('should return risk scores', async () => {
    const response = await request(app)
      .post('/api/risk-assessment')
      .send({ /* valid patient data */ });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('deconditioning');
  });
});
```

**C. E2E Tests for Critical Workflows**
```bash
npm install --save-dev playwright @playwright/test
```

**Estimated Effort:** 2-3 weeks
**Priority:** 🔴 Critical

---

### 2. **Session Storage for Production**

**Current State:** Uses `memorystore` which doesn't persist across restarts

**Impact:**
- Users logged out on server restart
- Not suitable for multi-server deployments
- Session data lost on crash

**Recommendation:**

**Option A: Use connect-pg-simple (Already Installed!)**

Update `server/index.ts`:
```typescript
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pool,  // Use existing database connection
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'bedside-bike-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));
```

Add to `.env`:
```
SESSION_SECRET=your-secure-random-string-here-minimum-32-characters
```

**Option B: Use Redis (More Scalable)**
```bash
npm install connect-redis redis
```

**Estimated Effort:** 2-4 hours
**Priority:** 🔴 Critical

---

### 3. **Structured Error Logging**

**Current State:** Basic console.log and console.error

**Impact:**
- Cannot trace errors in production
- No centralized error monitoring
- Difficult to debug issues
- No alerting on critical errors

**Recommendation:**

**Install Winston + Azure Application Insights**
```bash
npm install winston applicationinsights
```

Create `server/logger.ts`:
```typescript
import winston from 'winston';
import appInsights from 'applicationinsights';

// Azure Application Insights (recommended for Azure deployments)
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .start();
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bedside-bike-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware for request logging
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      user: req.user?.id
    });
  });
  next();
}
```

Usage in routes:
```typescript
import { logger } from './logger';

// Instead of:
console.error('Risk calculation failed:', error);

// Use:
logger.error('Risk calculation failed', {
  error: error.message,
  stack: error.stack,
  patientId: req.params.id,
  input: req.body
});
```

**Estimated Effort:** 1 week
**Priority:** 🔴 Critical

---

### 4. **Audit Trail for HIPAA Compliance**

**Current State:** No tracking of who accessed/modified patient data

**Impact:**
- HIPAA compliance violation risk
- Cannot track unauthorized access
- No accountability for data changes
- Legal liability

**Recommendation:**

**Create Audit Log Table:**

Add to `shared/schema.ts`:
```typescript
export const auditLogs = mssqlTable("audit_logs", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // 'create', 'read', 'update', 'delete'
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // 'patient', 'session', 'goal'
  resourceId: int("resource_id").notNull(),
  changes: varchar("changes", { length: "max" }), // JSON diff of changes
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 255 }),
  timestamp: datetime2("timestamp").default(sql`GETDATE()`),
});
```

**Create Audit Middleware:**
```typescript
export function auditMiddleware(action: string, resourceType: string) {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      // Log the action
      db.insert(auditLogs).values({
        userId: req.user.id,
        action,
        resourceType,
        resourceId: req.params.id || data.id,
        changes: JSON.stringify({ before: req.body, after: data }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      return originalJson.call(this, data);
    };
    next();
  };
}
```

**Estimated Effort:** 1 week
**Priority:** 🔴 Critical (for HIPAA)

---

### 5. **API Rate Limiting**

**Current State:** No rate limiting except manual nudge limit (2/day)

**Impact:**
- Vulnerable to DoS attacks
- No protection against abuse
- Could overwhelm database
- Cost implications for Azure

**Recommendation:**

```bash
npm install express-rate-limit
```

Create `server/rate-limit.ts`:
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
});

// Risk assessment limit (computationally expensive)
export const riskLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
});
```

Usage:
```typescript
app.use('/api/', apiLimiter);
app.post('/api/auth/login', authLimiter, ...);
app.post('/api/risk-assessment', riskLimiter, ...);
```

**Estimated Effort:** 4 hours
**Priority:** 🔴 Critical

---

## 🟡 Important Gaps (Priority 2)

### 6. **Database Migration Tool Limitation**

**Current State:** Drizzle Kit doesn't support MS SQL Server migrations

**Impact:**
- Manual SQL script maintenance required
- Schema changes require manual updates
- Risk of schema drift between code and database

**Recommendation:**

**Short-term:** Use manual SQL migrations (current approach)

**Medium-term Options:**

**A. Switch to TypeORM** (Full MS SQL support)
```bash
npm install typeorm reflect-metadata
```

**B. Use Prisma** (Excellent MS SQL support)
```bash
npm install @prisma/client
npm install -D prisma
```

**C. Wait for Drizzle Kit MS SQL support** (Check [GitHub](https://github.com/drizzle-team/drizzle-kit-mirror/issues))

**Estimated Effort:** 2-3 weeks (if switching ORMs)
**Priority:** 🟡 Important

---

### 7. **Background Job Scheduling**

**Current State:** No cron jobs or scheduled tasks

**Impact:**
- Cannot automate daily statistics updates
- No automatic goal recalculation
- Manual intervention required for recurring tasks

**Recommendation:**

```bash
npm install node-cron
```

Create `server/jobs/scheduler.ts`:
```typescript
import cron from 'node-cron';
import { updateDailyStats } from './update-stats';
import { recalculateGoals } from './recalculate-goals';
import { cleanupExpiredSessions } from './cleanup';

export function startScheduler() {
  // Update patient stats daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily stats update...');
    await updateDailyStats();
  });

  // Recalculate adaptive goals weekly
  cron.schedule('0 3 * * 0', async () => {
    console.log('Recalculating patient goals...');
    await recalculateGoals();
  });

  // Cleanup expired sessions hourly
  cron.schedule('0 * * * *', async () => {
    await cleanupExpiredSessions();
  });
}
```

**Estimated Effort:** 1 week
**Priority:** 🟡 Important

---

### 8. **WebSockets for Real-Time Features**

**Current State:** `ws` package installed but not used

**Impact:**
- No real-time session updates
- No live notifications
- No real-time kudos wall updates

**Recommendation:**

Create `server/websocket.ts`:
```typescript
import { WebSocketServer } from 'ws';
import { Server } from 'http';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const userId = req.url?.split('=')[1]; // Parse user ID from query

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());

      // Broadcast to all clients in same unit
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    });
  });

  return wss;
}
```

Use cases:
- Live session updates (duration, power, resistance)
- Real-time kudos reactions
- Instant nudge notifications
- Provider dashboard live updates

**Estimated Effort:** 1-2 weeks
**Priority:** 🟡 Important

---

### 9. **Health Check & Monitoring Endpoints**

**Current State:** No health check endpoints

**Impact:**
- Cannot monitor service health
- No readiness probes for Azure App Service
- Difficult to detect issues early

**Recommendation:**

Add to `server/routes.ts`:
```typescript
// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check (with DB connection test)
app.get('/health/detailed', async (req, res) => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);

    res.json({
      status: 'healthy',
      database: 'connected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Readiness probe (for Azure App Service)
app.get('/ready', async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).send('Ready');
  } catch {
    res.status(503).send('Not Ready');
  }
});
```

**Estimated Effort:** 4 hours
**Priority:** 🟡 Important

---

### 10. **API Documentation**

**Current State:** No OpenAPI/Swagger documentation

**Impact:**
- Frontend developers need to read code
- Difficult to onboard new team members
- No standardized API contract

**Recommendation:**

```bash
npm install swagger-jsdoc swagger-ui-express
```

Create `server/swagger.ts`:
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bedside Bike API',
      version: '1.0.0',
      description: 'API for hospital mobility management and risk assessment'
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: 'https://bedside-bike.azurewebsites.net', description: 'Production' }
    ]
  },
  apis: ['./server/routes.ts']
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}
```

Add JSDoc comments to routes:
```typescript
/**
 * @swagger
 * /api/risk-assessment:
 *   post:
 *     summary: Calculate patient risk scores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RiskAssessmentInput'
 *     responses:
 *       200:
 *         description: Risk scores calculated successfully
 */
```

**Estimated Effort:** 1 week
**Priority:** 🟡 Important

---

## 🟢 Nice to Have (Priority 3)

### 11. **File Upload & Document Storage**

**Use Cases:**
- Upload clinical notes (PDF)
- Attach lab results
- Store discharge instructions
- Provider signatures

**Recommendation:** Azure Blob Storage integration

```bash
npm install @azure/storage-blob
```

**Estimated Effort:** 1 week

---

### 12. **Data Export Features**

**Use Cases:**
- Export patient session history to CSV
- Generate PDF reports for providers
- HIPAA-compliant data portability

**Recommendation:**
```bash
npm install pdfkit csv-writer
```

**Estimated Effort:** 1 week

---

### 13. **Email Notifications**

**Use Cases:**
- Goal completion notifications to providers
- Weekly progress reports to patients
- Appointment reminders

**Recommendation:** Azure Communication Services

```bash
npm install @azure/communication-email
```

**Estimated Effort:** 1 week

---

### 14. **SMS/Text Messaging**

**Use Cases:**
- Nudge reminders via text
- Session start reminders
- Provider alerts for high-risk patients

**Recommendation:** Twilio or Azure Communication Services

**Estimated Effort:** 1 week

---

## 📈 Implementation Roadmap

### Phase 1: Production Readiness (4-6 weeks)
1. ✅ Session storage migration to database
2. ✅ Structured logging with Application Insights
3. ✅ API rate limiting
4. ✅ Audit trail for HIPAA compliance
5. ✅ Health check endpoints
6. ⚠️ Basic unit tests for risk algorithms

### Phase 2: Operational Excellence (4-6 weeks)
7. Background job scheduling
8. Comprehensive testing suite
9. API documentation (Swagger)
10. WebSockets for real-time features

### Phase 3: Feature Enhancements (6-8 weeks)
11. File upload & document storage
12. Data export (CSV/PDF)
13. Email notifications
14. SMS/text messaging

---

## 💰 Cost Implications

### Azure Services Recommended:
- **Azure SQL Database** - $5-200/month (already provisioned)
- **Azure Application Insights** - $0-100/month (free tier: 5GB/month)
- **Azure Blob Storage** - $0.01-10/month (minimal usage)
- **Azure Communication Services** - Pay-per-use ($0.0004/email)
- **Azure Cache for Redis** (Optional) - $15-200/month

**Estimated Monthly Cost:** $20-300 (depending on usage)

---

## 🔒 Security & Compliance Checklist

- [ ] HIPAA compliance audit trail implemented
- [ ] Passwords rotated from defaults
- [ ] Azure AD authentication configured (recommended)
- [ ] Connection strings moved to Azure Key Vault
- [ ] SSL/TLS enforced for all connections
- [ ] Rate limiting on all API endpoints
- [ ] Input validation on all user inputs
- [ ] SQL injection protection (Drizzle ORM handles this)
- [ ] XSS protection headers configured
- [ ] CORS configured for specific origins
- [ ] Session security (httpOnly, secure, sameSite)
- [ ] Regular dependency security updates
- [ ] Firewall rules restricted to specific IPs
- [ ] Backup and disaster recovery plan
- [ ] Incident response plan

---

## 📞 Next Steps

1. **Review this document** with your development team
2. **Prioritize gaps** based on your timeline and requirements
3. **Execute migration script** to create database schema
4. **Test the application** with Azure SQL connection
5. **Implement Phase 1 items** before production launch
6. **Set up monitoring** with Azure Application Insights
7. **Create deployment pipeline** (CI/CD)
8. **Schedule security audit** before going live

---

**Prepared by:** Claude Code (Anthropic)
**Date:** December 5, 2025
**Document Version:** 1.0
