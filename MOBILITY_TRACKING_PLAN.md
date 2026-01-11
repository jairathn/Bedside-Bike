# Comprehensive Mobility Tracking Platform - Implementation Plan

## Overview
Transform Bedside-Bike from a cycling-focused app into a complete inpatient mobility tracking platform that tracks walking, cycling, chair transfers, and sitting out of bed.

---

## Phase 1: Database Schema Changes

### 1.1 Add Activity Type to Exercise Sessions
```sql
-- Add activity tracking fields to exercise_sessions
ALTER TABLE exercise_sessions
ADD COLUMN activity_type VARCHAR(20) DEFAULT 'ride' NOT NULL;
-- Values: 'ride', 'walk', 'sit', 'transfer'

ALTER TABLE exercise_sessions
ADD COLUMN assistance_level VARCHAR(20);
-- Values: 'independent', 'assisted' (for walking)

-- Add computed watts equivalent for walking
ALTER TABLE exercise_sessions
ADD COLUMN equivalent_watts DOUBLE PRECISION;
```

### 1.2 Add Required Height/Weight to Users
```sql
-- Add height_cm and weight_kg to users table (for patients)
ALTER TABLE users ADD COLUMN height_cm DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN weight_kg DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN height_unit VARCHAR(10) DEFAULT 'imperial';
ALTER TABLE users ADD COLUMN weight_unit VARCHAR(10) DEFAULT 'imperial';
```

### 1.3 Update Existing Demo Data
```sql
-- Update existing demo patients with height/weight
UPDATE users SET
  height_cm = CASE
    WHEN first_name = 'Margaret' THEN 157  -- 5'2"
    WHEN first_name = 'Robert' THEN 175    -- 5'9"
    WHEN first_name = 'Dorothy' THEN 163   -- 5'4"
    WHEN first_name = 'William' THEN 180   -- 5'11"
    WHEN first_name = 'Betty' THEN 160     -- 5'3"
    WHEN first_name = 'James' THEN 178     -- 5'10"
    WHEN first_name = 'Patricia' THEN 165  -- 5'5"
    WHEN first_name = 'Richard' THEN 183   -- 6'0"
    WHEN first_name = 'Barbara' THEN 155   -- 5'1"
    WHEN first_name = 'Charles' THEN 170   -- 5'7"
    ELSE 170
  END,
  weight_kg = CASE
    WHEN first_name = 'Margaret' THEN 61   -- 135 lbs
    WHEN first_name = 'Robert' THEN 79     -- 175 lbs
    WHEN first_name = 'Dorothy' THEN 68    -- 150 lbs
    WHEN first_name = 'William' THEN 86    -- 190 lbs
    WHEN first_name = 'Betty' THEN 64      -- 140 lbs
    WHEN first_name = 'James' THEN 82      -- 180 lbs
    WHEN first_name = 'Patricia' THEN 70   -- 155 lbs
    WHEN first_name = 'Richard' THEN 91    -- 200 lbs
    WHEN first_name = 'Barbara' THEN 57    -- 125 lbs
    WHEN first_name = 'Charles' THEN 75    -- 165 lbs
    ELSE 70
  END
WHERE user_type = 'patient';

-- Mark all existing sessions as 'ride' type
UPDATE exercise_sessions SET activity_type = 'ride' WHERE activity_type IS NULL;
```

### 1.4 Update Goals Table for Movement Goals
```sql
-- Update goal_type enum concept (goals now track 'movement' not just 'duration')
-- Existing 'duration' goals become 'movement' goals (activity-agnostic)
```

---

## Phase 2: Backend API Changes

### 2.1 Update Session Creation Endpoint
**File:** `server/routes.ts`

```typescript
// POST /api/sessions - Updated schema
{
  patientId: number,
  duration: number,          // minutes
  activityType: 'ride' | 'walk' | 'sit' | 'transfer',
  assistanceLevel?: 'independent' | 'assisted',  // required for walk
  resistance?: number,       // only for ride
  sessionDate: string,
  startTime: string,
  // For transfers only:
  transferCount?: number,    // number of transfers
}
```

### 2.2 Add Watts Calculation Utility
**File:** `server/watts-calculator.ts` (new)

```typescript
// Walking watts calculation based on slow walking (~2.3 METs)
// Formula: Watts = (METs × 3.5 × weight_kg) / 200

export function calculateWalkingWatts(weightKg: number, pace: 'slow' = 'slow'): number {
  const mets = 2.3; // slow hospital walking
  return Math.round((mets * 3.5 * weightKg) / 200);
}

export function calculateCyclingWatts(resistance: number): number {
  // Approximate based on resistance level
  return resistance * 5 + 10; // e.g., R3 = 25W, R5 = 35W
}

export function calculateSittingWatts(weightKg: number): number {
  const mets = 1.3; // sitting out of bed vs 1.0 in bed
  return Math.round((mets * 3.5 * weightKg) / 200);
}
```

### 2.3 Update Dashboard Endpoint
**File:** `server/routes.ts`

Dashboard should return:
- Total movement minutes today (all activity types)
- Breakdown by activity type
- Equivalent watts for each activity
- Progress toward movement goal

### 2.4 Add Clinical Note Export Endpoint
**File:** `server/routes.ts`

```typescript
// GET /api/patients/:id/mobility-summary
// Returns formatted text for clinical note copy-paste
{
  patientName: string,
  date: string,
  totalMovementMinutes: number,
  goalMinutes: number,
  goalPercentage: number,
  activities: [
    { type: 'ride', duration: 20, avgWatts: 35, assistance: null },
    { type: 'walk', duration: 12, equivalentWatts: 28, assistance: 'assisted' },
    { type: 'sit', duration: 45, equivalentWatts: null, assistance: null }
  ],
  streak: number,
  weeklyAverage: number,
  formattedText: string  // Pre-formatted clinical note text
}
```

---

## Phase 3: Frontend Changes

### 3.1 Update Registration Flow
**File:** `client/src/pages/auth.tsx`

Add required height/weight fields for patients:
- Height: feet/inches input (imperial default)
- Weight: pounds input (imperial default)
- Auto-convert to metric for storage

### 3.2 Update SessionTimerContext
**File:** `client/src/contexts/SessionTimerContext.tsx`

Add:
- `activityType: 'ride' | 'walk' | 'sit'`
- `assistanceLevel: 'independent' | 'assisted'`
- For walking, no games available
- For sitting, simple duration timer only

### 3.3 Update StartSessionModal
**File:** `client/src/components/StartSessionModal.tsx`

New flow:
```
"What type of movement?"
├─ 🚴 Ride → Resistance selection → Game selection → Start
├─ 🚶 Walk → Assistance selection → Fall warning → Start
└─ 🪑 Chair → Simple confirmation → Start
```

Fall warning for walking:
> "⚠️ Walking requires staff or family assistance. Falls during hospitalization can extend your stay and delay your recovery. Make sure someone is with you before you begin."

### 3.4 Update Dashboard
**File:** `client/src/pages/dashboard.tsx`

Changes:
- Progress ring shows "Movement Minutes" not cycling minutes
- Below progress: breakdown icons (🚴 20 min | 🚶 12 min | 🪑 45 min)
- "Start Exercise" becomes "Start Movement"
- Add "Log Past Activity" button with activity type selection

### 3.5 Update Manual Session Dialog
**File:** `client/src/pages/dashboard.tsx`

Add activity type selector:
- Ride: show resistance field
- Walk: show assistance selector, hide resistance
- Sit: duration only
- Transfer: count input instead of duration

### 3.6 Update Games Page
**File:** `client/src/pages/games.tsx`

- Only show games when starting a RIDE
- If user navigates here directly, show message:
  "Games are available when you start a cycling session. Go to Dashboard to begin."

### 3.7 Create Mobility Summary Component (Provider)
**File:** `client/src/components/MobilitySummaryCard.tsx` (new)

For provider dashboard patient detail view:
- Shows formatted clinical note preview
- "Copy to Clipboard" button
- Success toast: "Mobility summary copied!"

Format:
```
MOBILITY SUMMARY - [Patient Name] - 01/11/2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Movement Today: 32 min (107% of 30 min goal)
┌──────────┬──────────┬────────────┬─────────┐
│ Activity │ Duration │ Avg Output │ Assist  │
├──────────┼──────────┼────────────┼─────────┤
│ Cycling  │ 20 min   │ 35W        │ N/A     │
│ Walking  │ 12 min   │ 28W eq.    │ Assisted│
│ Chair    │ 45 min   │ --         │ --      │
└──────────┴──────────┴────────────┴─────────┘
7-Day Avg: 28 min/day | Consistency: 5-day streak
```

### 3.8 Update Provider Goal Editor
**File:** `client/src/components/provider-goal-editor.tsx`

Change goal labels:
- "Session Duration" → "Movement Duration"
- "Sessions per Day" → "Movement Sessions per Day"
- Update subtitle: "15 minutes of movement, 2x/day"

### 3.9 Update Leaderboard
**File:** `client/src/pages/kudos-wall.tsx`

- Leaderboard shows total movement minutes (all types combined)
- This naturally incentivizes cycling (easier to accumulate minutes)

---

## Phase 4: UI/UX Details

### 4.1 Activity Type Icons
- 🚴 Ride / Cycling
- 🚶 Walk / Walking
- 🪑 Chair / Sitting Out of Bed
- ↕️ Transfer / Bed-to-Chair Transfer

### 4.2 Color Coding
- Cycling: Blue (#3B82F6)
- Walking: Green (#22C55E)
- Chair: Purple (#8B5CF6)
- Transfer: Orange (#F97316)

### 4.3 Fall Risk Warning Styles
- Yellow warning banner
- ⚠️ icon
- Checkbox: "I confirm I have assistance" (required to proceed)

### 4.4 Session Timer Banner Updates
For walking sessions:
- Show "🚶 Walking" instead of game name
- Show assistance level badge
- No games/scenic options

---

## Phase 5: Implementation Order

### Sprint 1: Foundation (Schema + Backend)
1. ✅ Write SQL migration scripts
2. Update `schema.postgres.ts` with new fields
3. Create `watts-calculator.ts` utility
4. Update session creation endpoint
5. Update dashboard endpoint for multi-activity support

### Sprint 2: Registration + Profile
1. Add height/weight to patient registration form
2. Add imperial/metric toggle
3. Add profile editing for existing patients
4. Run migration for existing demo data

### Sprint 3: Activity Selection UI
1. Update StartSessionModal with activity type selection
2. Add fall warning for walking
3. Update SessionTimerContext for activity types
4. Update SessionTimerBanner for activity display

### Sprint 4: Dashboard Updates
1. Update progress display for movement minutes
2. Update manual session dialog
3. Add activity breakdown display
4. Update goal display language

### Sprint 5: Provider Features
1. Create MobilitySummaryCard component
2. Add copy-to-clipboard functionality
3. Update provider dashboard patient detail view
4. Update goal editor language

### Sprint 6: Polish + Testing
1. Update leaderboard calculations
2. Ensure games only available for cycling
3. End-to-end testing
4. Fix any edge cases

---

## SQL Migration Script (Ready to Execute)

```sql
-- Migration: Add comprehensive mobility tracking support
-- Run this in Supabase SQL Editor

-- 1. Add activity tracking to exercise_sessions
ALTER TABLE exercise_sessions
ADD COLUMN IF NOT EXISTS activity_type VARCHAR(20) DEFAULT 'ride';

ALTER TABLE exercise_sessions
ADD COLUMN IF NOT EXISTS assistance_level VARCHAR(20);

ALTER TABLE exercise_sessions
ADD COLUMN IF NOT EXISTS equivalent_watts DOUBLE PRECISION;

ALTER TABLE exercise_sessions
ADD COLUMN IF NOT EXISTS transfer_count INTEGER;

-- 2. Add height/weight to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS height_cm DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS height_unit VARCHAR(10) DEFAULT 'imperial';
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'imperial';

-- 3. Update existing sessions to be 'ride' type
UPDATE exercise_sessions
SET activity_type = 'ride'
WHERE activity_type IS NULL OR activity_type = '';

-- 4. Update demo patients with realistic height/weight
UPDATE users SET
  height_cm = CASE
    WHEN first_name = 'Margaret' THEN 157
    WHEN first_name = 'Robert' THEN 175
    WHEN first_name = 'Dorothy' THEN 163
    WHEN first_name = 'William' THEN 180
    WHEN first_name = 'Betty' THEN 160
    WHEN first_name = 'James' THEN 178
    WHEN first_name = 'Patricia' THEN 165
    WHEN first_name = 'Richard' THEN 183
    WHEN first_name = 'Barbara' THEN 155
    WHEN first_name = 'Charles' THEN 170
    WHEN first_name = 'Neil' THEN 178
    ELSE 170
  END,
  weight_kg = CASE
    WHEN first_name = 'Margaret' THEN 61
    WHEN first_name = 'Robert' THEN 79
    WHEN first_name = 'Dorothy' THEN 68
    WHEN first_name = 'William' THEN 86
    WHEN first_name = 'Betty' THEN 64
    WHEN first_name = 'James' THEN 82
    WHEN first_name = 'Patricia' THEN 70
    WHEN first_name = 'Richard' THEN 91
    WHEN first_name = 'Barbara' THEN 57
    WHEN first_name = 'Charles' THEN 75
    WHEN first_name = 'Neil' THEN 77
    ELSE 70
  END
WHERE user_type = 'patient';

-- 5. Add index for activity type queries
CREATE INDEX IF NOT EXISTS idx_sessions_activity_type
ON exercise_sessions(activity_type);

CREATE INDEX IF NOT EXISTS idx_sessions_patient_activity
ON exercise_sessions(patient_id, activity_type, session_date);
```

---

## Questions Resolved
- ✅ Duration-based for walking and sitting
- ✅ Event-based for transfers (count)
- ✅ Assisted/Independent for walking
- ✅ Imperial default with metric conversion
- ✅ Combined leaderboard (total movement)
- ✅ Live timer for walking (phone in pocket)
- ✅ Copy-paste clinical note format

---

## Next Steps
1. Review this plan
2. Execute SQL migration in Supabase
3. Begin Sprint 1 implementation
