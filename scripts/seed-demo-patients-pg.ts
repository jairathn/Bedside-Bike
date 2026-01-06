/**
 * Seed demo patients for PostgreSQL (Supabase)
 *
 * Run with: npm run db:seed-demo-pg
 */

import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../shared/schema.postgres';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool, { schema });

// Calculate dates
const currentYear = new Date().getFullYear();
const today = new Date();

const DEMO_PATIENTS = [
  {
    email: 'hospital.patient@bedside-bike.local',
    firstName: 'Robert',
    lastName: 'Martinez',
    dob: '1955-01-01', // Matches UI hardcoded DOB
    daysAdmitted: 5,
    age: 70,
    sex: 'M',
    weightKg: 78.5,
    heightCm: 172,
    levelOfCare: 'icu',
    mobilityStatus: 'bedbound',
    cognitiveStatus: 'normal',
    baselineFunction: 'independent',
    admissionDiagnosis: 'COPD exacerbation with acute respiratory failure',
    comorbidities: ['COPD', "Parkinson's Disease", 'Hypertension'],
    medications: ['Albuterol inhaler 90mcg q4h PRN', 'Ipratropium nebulizer q6h', 'Carbidopa-Levodopa 25-100mg TID'],
    sessionsPerDay: 2,
    baseDuration: 300, // 5 minutes
    basePower: 12,
  },
  {
    email: 'rehab.patient@bedside-bike.local',
    firstName: 'Dorothy',
    lastName: 'Chen',
    dob: '1943-01-01', // Matches UI hardcoded DOB
    daysAdmitted: 12,
    age: 82,
    sex: 'F',
    weightKg: 68.2,
    heightCm: 160,
    levelOfCare: 'rehab',
    mobilityStatus: 'walking_assist',
    cognitiveStatus: 'normal',
    baselineFunction: 'requires_assistance',
    admissionDiagnosis: 'Right hip fracture s/p ORIF',
    comorbidities: ['Hip Fracture', 'Type 2 Diabetes', 'Osteoporosis', 'Hypertension'],
    medications: ['Metformin 1000mg BID', 'Insulin glargine 20 units qHS', 'Alendronate 70mg weekly'],
    sessionsPerDay: 2,
    baseDuration: 600, // 10 minutes
    basePower: 18,
  },
  {
    email: 'snf.patient@bedside-bike.local',
    firstName: 'James',
    lastName: 'Thompson',
    dob: '1960-01-01', // Matches UI hardcoded DOB
    daysAdmitted: 17,
    age: 65,
    sex: 'M',
    weightKg: 92.5,
    heightCm: 175,
    levelOfCare: 'ward',
    mobilityStatus: 'walking_assist',
    cognitiveStatus: 'mild_impairment',
    baselineFunction: 'requires_assistance',
    admissionDiagnosis: 'Sepsis resolved, recovering from critical illness',
    comorbidities: ['CHF (EF 35%)', 'Sepsis (resolved)', 'CKD Stage 3', 'Obesity'],
    medications: ['Furosemide 40mg BID', 'Metoprolol 50mg BID', 'Lisinopril 20mg daily'],
    sessionsPerDay: 2,
    baseDuration: 420, // 7 minutes
    basePower: 10,
  }
];

async function seedDemoPatients() {
  console.log('🏥 Seeding demo patients for PostgreSQL...\n');

  // Get provider
  const providers = await db.select().from(schema.users).where(eq(schema.users.email, 'heidikissane@hospital.com'));
  if (providers.length === 0) {
    console.error('❌ Provider Heidi Kissane not found. Seeding initial data first...');
    // Create provider
    const [provider] = await db.insert(schema.users).values({
      email: 'heidikissane@hospital.com',
      firstName: 'Heidi',
      lastName: 'Kissane',
      userType: 'provider',
      providerRole: 'physician',
      credentials: 'DPT',
      specialty: 'Physical Therapy',
      isActive: true
    }).returning();
    console.log('✓ Created provider Heidi Kissane');
  }

  const [provider] = await db.select().from(schema.users).where(eq(schema.users.email, 'heidikissane@hospital.com'));
  const providerId = provider.id;

  for (const patientData of DEMO_PATIENTS) {
    console.log(`Creating ${patientData.firstName} ${patientData.lastName}...`);

    // Delete existing if present (by email OR by name+DOB)
    const existingByEmail = await db.select().from(schema.users).where(eq(schema.users.email, patientData.email));
    const existingByName = await db.select().from(schema.users).where(
      and(
        eq(schema.users.firstName, patientData.firstName),
        eq(schema.users.lastName, patientData.lastName),
        eq(schema.users.dateOfBirth, patientData.dob)
      )
    );

    // Combine and dedupe
    const allExisting = [...existingByEmail, ...existingByName];
    const seenIds = new Set<number>();

    for (const existing of allExisting) {
      if (seenIds.has(existing.id)) continue;
      seenIds.add(existing.id);

      await db.delete(schema.providerPatients).where(eq(schema.providerPatients.patientId, existing.id));
      await db.delete(schema.patientStats).where(eq(schema.patientStats.patientId, existing.id));
      await db.delete(schema.patientGoals).where(eq(schema.patientGoals.patientId, existing.id));
      await db.delete(schema.exerciseSessions).where(eq(schema.exerciseSessions.patientId, existing.id));
      await db.delete(schema.riskAssessments).where(eq(schema.riskAssessments.patientId, existing.id));
      await db.delete(schema.patientProfiles).where(eq(schema.patientProfiles.userId, existing.id));
      await db.delete(schema.users).where(eq(schema.users.id, existing.id));
      console.log(`  Cleaned up existing patient ID ${existing.id} (${existing.email})`);
    }

    // Calculate admission date
    const admissionDate = new Date(today);
    admissionDate.setDate(today.getDate() - patientData.daysAdmitted);

    // Create user
    const [patient] = await db.insert(schema.users).values({
      email: patientData.email,
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      dateOfBirth: patientData.dob,
      userType: 'patient',
      admissionDate: admissionDate.toISOString().split('T')[0],
      isActive: true
    }).returning();

    // Create patient profile
    await db.insert(schema.patientProfiles).values({
      userId: patient.id,
      age: patientData.age,
      sex: patientData.sex,
      weightKg: patientData.weightKg,
      heightCm: patientData.heightCm,
      levelOfCare: patientData.levelOfCare,
      mobilityStatus: patientData.mobilityStatus,
      cognitiveStatus: patientData.cognitiveStatus,
      baselineFunction: patientData.baselineFunction,
      admissionDiagnosis: patientData.admissionDiagnosis,
      comorbidities: patientData.comorbidities,
      medications: patientData.medications,
      devices: [],
      incontinent: false,
      albuminLow: false,
      onVteProphylaxis: true,
      daysImmobile: patientData.daysAdmitted
    });

    // Create risk assessment with realistic non-round probabilities
    await db.insert(schema.riskAssessments).values({
      patientId: patient.id,
      deconditioning: { probability: 0.647, severity: 'moderate' },
      vte: { probability: 0.352, severity: 'moderate' },
      falls: { probability: 0.548, severity: 'moderate' },
      pressure: { probability: 0.403, severity: 'low' },
      mobilityRecommendation: 'Progressive mobilization protocol recommended'
    });

    // Create exercise sessions
    let totalDuration = 0;
    let sessionCount = 0;

    for (let day = 0; day < patientData.daysAdmitted; day++) {
      const sessionDate = new Date(admissionDate);
      sessionDate.setDate(admissionDate.getDate() + day);

      const progressFactor = day / patientData.daysAdmitted;

      for (let s = 0; s < patientData.sessionsPerDay; s++) {
        const duration = Math.floor(patientData.baseDuration + (progressFactor * 300) + (Math.random() - 0.5) * 60);
        const avgPower = patientData.basePower + (progressFactor * 8) + (Math.random() - 0.5) * 4;

        const startTime = new Date(sessionDate);
        startTime.setHours(9 + s * 5 + Math.floor(Math.random() * 2));
        const endTime = new Date(startTime.getTime() + duration * 1000);

        await db.insert(schema.exerciseSessions).values({
          patientId: patient.id,
          sessionDate: sessionDate.toISOString().split('T')[0],
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          avgPower: avgPower,
          maxPower: avgPower * 1.3,
          avgRpm: 35 + progressFactor * 10,
          resistance: 2 + progressFactor * 2,
          stopsAndStarts: Math.max(0, 5 - Math.floor(progressFactor * 4)),
          isCompleted: true
        });

        totalDuration += duration;
        sessionCount++;
      }
    }

    // Create patient stats
    await db.insert(schema.patientStats).values({
      patientId: patient.id,
      totalSessions: sessionCount,
      totalDuration: totalDuration,
      avgDailyDuration: totalDuration / patientData.daysAdmitted,
      consistencyStreak: patientData.daysAdmitted,
      xp: sessionCount * 50 + Math.floor(totalDuration / 60) * 10,
      level: Math.floor(sessionCount / 10) + 1
    });

    // Create goals
    await db.insert(schema.patientGoals).values({
      patientId: patient.id,
      providerId: providerId,
      goalType: 'duration',
      targetValue: 900,
      currentValue: totalDuration / patientData.daysAdmitted,
      unit: 'seconds',
      label: 'Daily mobility target',
      subtitle: 'Progressive mobilization',
      period: 'daily',
      isActive: true
    });

    // Link to provider
    await db.insert(schema.providerPatients).values({
      providerId: providerId,
      patientId: patient.id,
      permissionGranted: true,
      grantedAt: new Date(),
      isActive: true
    });

    console.log(`✅ ${patientData.firstName} ${patientData.lastName} (ID: ${patient.id}) - ${sessionCount} sessions`);
  }

  await pool.end();
  console.log('\n🎉 Demo patients seeded successfully!');
}

seedDemoPatients().catch(console.error);
