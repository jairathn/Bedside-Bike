# Azure SQL Database Migration Guide

## 🎯 Overview

This document outlines the migration process from **Replit's PostgreSQL (Neon)** to **Azure SQL Database** for the Bedside Bike web application.

---

## ⚠️ Important Limitation: Drizzle Kit MS SQL Support

**Current Status:** Drizzle Kit v0.30.4 **does not support MS SQL Server** for migration generation.

- ✅ **drizzle-orm** (v0.39.1) - Runtime support for MSSQL exists
- ❌ **drizzle-kit** (v0.30.4) - Migration tooling does NOT support MSSQL yet

**Supported dialects in drizzle-kit:**
- PostgreSQL ✅
- MySQL ✅
- SQLite ✅
- Turso ✅
- SingleStore ✅
- MS SQL Server ❌

---

## 🔄 Migration Strategy

Since automated migrations aren't available, we're using **manual SQL migration scripts**.

### Files Modified

| File | Changes |
|------|---------|
| `package.json` | Replaced `@neondatabase/serverless` with `mssql` |
| `drizzle.config.ts` | Updated dialect to `mssql` (for future compatibility) |
| `shared/schema.ts` | Converted PostgreSQL schema to MS SQL compatible format |
| `server/db.ts` | Updated connection to use `mssql` driver |
| `.env` | Added Azure SQL connection string |
| `.gitignore` | Protected `.env` files from version control |

### Key Schema Conversions

| PostgreSQL | MS SQL Server |
|------------|---------------|
| `pgTable()` | `mssqlTable()` |
| `serial` | `int IDENTITY(1,1)` |
| `timestamp` | `datetime2` |
| `jsonb` | `varchar(max)` with JSON string |
| `pgEnum()` | `varchar()` with CHECK constraints |
| `defaultNow()` | `default(sql\`GETDATE()\`)` |
| `integer` | `int` |

---

## 📋 Migration Steps

### Step 1: Review Connection Details

Your Azure SQL Database credentials:

```
Server: tcp:beside-bike-server.database.windows.net,1433
Database: BesideBikeDB
Username: BedsideBikeAdmin
Password: c^9EQioAv2s*ACa7
```

**Connection String (already in .env):**
```
Server=tcp:beside-bike-server.database.windows.net,1433;Initial Catalog=BesideBikeDB;Persist Security Info=False;User ID=BedsideBikeAdmin;Password=c^9EQioAv2s*ACa7;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

### Step 2: Execute Migration Script

#### Option A: Using Azure Portal (Recommended for first-time)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **SQL databases** → **BesideBikeDB**
3. Click **Query editor** in the left menu
4. Log in with:
   - **Login:** BedsideBikeAdmin
   - **Password:** c^9EQioAv2s*ACa7
5. Open and run the migration script: `migrations/0001_initial_schema.sql`
6. Verify all tables were created successfully

#### Option B: Using SQL Server Management Studio (SSMS)

1. Download and install [SSMS](https://aka.ms/ssmsfullsetup)
2. Connect to server: `beside-bike-server.database.windows.net,1433`
3. Authentication: SQL Server Authentication
4. Login: BedsideBikeAdmin
5. Password: c^9EQioAv2s*ACa7
6. Open `migrations/0001_initial_schema.sql`
7. Execute the script

#### Option C: Using Azure Data Studio

1. Download [Azure Data Studio](https://aka.ms/azuredatastudio)
2. Create new connection:
   - Server: beside-bike-server.database.windows.net,1433
   - Authentication: SQL Login
   - Username: BedsideBikeAdmin
   - Password: c^9EQioAv2s*ACa7
   - Database: BesideBikeDB
3. Open and run `migrations/0001_initial_schema.sql`

#### Option D: Using sqlcmd (Command Line)

```bash
sqlcmd -S beside-bike-server.database.windows.net,1433 \
  -U BedsideBikeAdmin \
  -P 'c^9EQioAv2s*ACa7' \
  -d BesideBikeDB \
  -i migrations/0001_initial_schema.sql
```

### Step 3: Install Dependencies

```bash
cd BedBike
npm install
```

This will install the new `mssql` package and remove the old Neon driver.

### Step 4: Test Connection

```bash
npm run dev
```

The application should:
1. Connect to Azure SQL Database successfully
2. Load the schema
3. Start the server on port 5000

### Step 5: Verify Database

Check that all 15 tables were created:

```sql
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
```

Expected tables:
- achievements
- device_sessions
- devices
- exercise_sessions
- feed_items
- kudos_reactions
- nudge_messages
- patient_goals
- patient_preferences
- patient_profiles
- patient_stats
- provider_patients
- risk_assessments
- sessions
- users

---

## 🔧 Troubleshooting

### Connection Errors

**Error:** "Cannot connect to server"
- ✅ Verify firewall rules allow your IP address
- ✅ Check if Azure SQL Database is running
- ✅ Confirm connection string in `.env` is correct

**Error:** "Login failed for user"
- ✅ Verify username and password are correct
- ✅ Check that user has permissions on BesideBikeDB

### Schema Errors

**Error:** "Invalid object name"
- ✅ Run the migration script to create all tables
- ✅ Verify you're connected to BesideBikeDB (not master)

### SSL/TLS Errors

**Error:** "SSL connection required"
- ✅ Ensure `Encrypt=True` is in connection string
- ✅ Set `trustServerCertificate: false` in db.ts config

---

## 📊 Data Migration (if migrating existing data)

If you have existing data in Replit's PostgreSQL database that needs to be migrated:

### Option 1: Manual Export/Import

1. **Export from PostgreSQL:**
   ```bash
   pg_dump -h [neon-host] -U [user] -d [database] --data-only --inserts > data.sql
   ```

2. **Transform SQL (PostgreSQL → MS SQL):**
   - Replace `TRUE/FALSE` with `1/0`
   - Adjust date/timestamp formats
   - Convert JSON fields from JSONB to VARCHAR(MAX)

3. **Import to Azure SQL:**
   ```bash
   sqlcmd -S beside-bike-server.database.windows.net,1433 \
     -U BedsideBikeAdmin \
     -P 'c^9EQioAv2s*ACa7' \
     -d BesideBikeDB \
     -i data.sql
   ```

### Option 2: Use Application-Level Migration Script

Create a Node.js script that:
1. Connects to both databases
2. Reads data from PostgreSQL
3. Transforms as needed
4. Inserts into Azure SQL

---

## 🚀 Future: Full Drizzle Kit Support

When Drizzle Kit adds MS SQL Server support:

1. Update `drizzle-kit` to latest version
2. Run `npm run db:push` or `drizzle-kit generate`
3. Migrations will be automatically generated from schema.ts

**Track this issue:** [Drizzle Kit MS SQL Support](https://github.com/drizzle-team/drizzle-kit-mirror/issues)

---

## 🔐 Security Best Practices

### Immediate Actions:

1. ✅ **Environment Variables:** `.env` file is gitignored
2. ✅ **SSL Encryption:** Enabled in connection config
3. ⚠️ **Rotate Password:** Consider changing default password
4. ⚠️ **Azure AD Authentication:** Consider using managed identity
5. ⚠️ **Firewall Rules:** Restrict to specific IP ranges
6. ⚠️ **Key Vault:** Store connection strings in Azure Key Vault

### Recommended Changes:

**1. Use Azure AD Authentication (Production):**
```typescript
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const token = await credential.getToken('https://database.windows.net/');

const config = {
  server: 'beside-bike-server.database.windows.net',
  database: 'BesideBikeDB',
  authentication: {
    type: 'azure-active-directory-access-token',
    options: { token: token.token }
  },
  options: { encrypt: true }
};
```

**2. Use Azure Key Vault (Production):**
```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const vaultUrl = 'https://your-vault.vault.azure.net';
const client = new SecretClient(vaultUrl, credential);

const secret = await client.getSecret('database-connection-string');
const connectionString = secret.value;
```

---

## 📝 Schema Differences to Note

### JSON Fields

**PostgreSQL (Before):**
```typescript
comorbidities: jsonb("comorbidities").default([])
```

**MS SQL (After):**
```typescript
comorbidities: varchar("comorbidities", { length: "max" }).default('[]')
```

**Application Code:** No changes needed! Drizzle ORM handles JSON serialization/deserialization automatically.

### Enums

**PostgreSQL (Before):**
```typescript
export const userTypeEnum = pgEnum('user_type', ['patient', 'provider']);
userType: userTypeEnum("user_type").notNull()
```

**MS SQL (After):**
```typescript
export const userTypeEnum = z.enum(['patient', 'provider']);
userType: varchar("user_type", { length: 20 }).notNull()
```

**Database:** Uses CHECK constraints in SQL
**Application:** Uses Zod for runtime validation

---

## ✅ Verification Checklist

After migration, verify:

- [ ] All 15 tables created successfully
- [ ] Indexes created on foreign keys and frequently queried columns
- [ ] Default values applied correctly
- [ ] CHECK constraints working for enum-like fields
- [ ] Seed data inserted (provider, patient, devices)
- [ ] Application connects without errors
- [ ] Can create a new user via registration
- [ ] Can log in with existing users
- [ ] Risk assessment calculator works
- [ ] Session data persists across restarts
- [ ] No console errors related to database queries

---

## 📧 Support & Issues

If you encounter issues during migration:

1. Check the troubleshooting section above
2. Verify firewall rules in Azure Portal
3. Review connection string format
4. Check Azure SQL Database status
5. Review application logs for detailed error messages

---

## 🎓 Additional Resources

- [Azure SQL Database Documentation](https://learn.microsoft.com/en-us/azure/azure-sql/)
- [Drizzle ORM MS SQL Guide](https://orm.drizzle.team/docs/get-started-mssql)
- [Node.js mssql Package](https://www.npmjs.com/package/mssql)
- [Azure SQL Best Practices](https://learn.microsoft.com/en-us/azure/azure-sql/database/best-practices)

---

**Migration completed on:** 2025-12-05
**Migrated from:** Replit PostgreSQL (Neon)
**Migrated to:** Azure SQL Database (BesideBikeDB)
