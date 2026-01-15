import {
  users,
  patientProfiles,
  providerPatients,
  patientGoals,
  exerciseSessions,
  achievements,
  patientStats,
  riskAssessments,
  devices,
  deviceSessions,
  caregiverPatients,
  caregiverObservations,
  caregiverNotifications,
  caregiverAchievements,
  dischargeChecklists,
  type User,
  type InsertUser,
  type UpsertUser,
  type PatientProfile,
  type InsertPatientProfile,
  type ProviderPatient,
  type InsertProviderPatient,
  type PatientGoal,
  type InsertPatientGoal,
  type ExerciseSession,
  type InsertExerciseSession,
  type Achievement,
  type InsertAchievement,
  type PatientStats,
  type InsertPatientStats,
  type RiskAssessment,
  type InsertRiskAssessment,
  type Device,
  type InsertDevice,
  type DeviceSession,
  type InsertDeviceSession,
  type CaregiverPatient,
  type InsertCaregiverPatient,
  type CaregiverObservation,
  type InsertCaregiverObservation,
  type CaregiverNotification,
  type InsertCaregiverNotification,
  type CaregiverAchievement,
  type InsertCaregiverAchievement,
  type DischargeChecklist,
  type InsertDischargeChecklist,
  // Legacy compatibility
  type Patient,
  type InsertPatient,
  type Session,
  type InsertSession,
  type Goal,
  type InsertGoal
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (authentication system)
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Provider operations
  getProviders(): Promise<User[]>;
  getProvidersByPatient(patientId: number): Promise<User[]>;
  
  // Patient operations
  getPatient(id: number): Promise<User | undefined>;
  getPatientByName(firstName: string, lastName: string, dateOfBirth: string): Promise<User | undefined>;
  createPatient(patient: InsertPatient): Promise<User>;
  getPatientById(id: number): Promise<Patient | undefined>;
  getPatientByCredentials(firstName: string, lastName: string, dateOfBirth: string): Promise<Patient | undefined>;
  
  // Patient profile operations
  getPatientProfile(userId: number): Promise<PatientProfile | undefined>;
  createPatientProfile(profile: InsertPatientProfile): Promise<PatientProfile>;
  updatePatientProfile(userId: number, updates: Partial<InsertPatientProfile>): Promise<PatientProfile | undefined>;
  
  // Provider-Patient relationship operations
  createProviderPatientRelation(relation: InsertProviderPatient): Promise<ProviderPatient>;
  createProviderPatientRelationship(relation: InsertProviderPatient): Promise<ProviderPatient>;
  getProviderPatientRelationships(patientId: number): Promise<ProviderPatient[]>;
  deleteProviderPatientRelationship(relationshipId: number): Promise<void>;
  grantProviderAccess(patientId: number, providerId: number): Promise<ProviderPatient | undefined>;
  getPatientsByProvider(providerId: number): Promise<User[]>;

  // HIPAA Access Control
  hasProviderAccessToPatient(providerId: number, patientId: number): Promise<boolean>;
  hasCaregiverAccessToPatient(caregiverId: number, patientId: number): Promise<boolean>;

  // Session operations
  createSession(session: InsertExerciseSession): Promise<ExerciseSession>;
  getSessionsByPatient(patientId: number): Promise<ExerciseSession[]>;
  updateSession(id: number, updates: Partial<InsertExerciseSession>): Promise<ExerciseSession | undefined>;
  getPatientSessions(patientId: number, limit?: number): Promise<Session[]>;
  getPatientDailySessions(patientId: number, date: string): Promise<Session[]>;
  
  // Device operations
  getDevices(): Promise<Device[]>;
  getDevice(deviceId: string): Promise<Device | undefined>;
  updateDeviceStatus(deviceId: string, status: string, patientId?: number): Promise<Device | undefined>;
  linkPatientToDevice(patientId: number, deviceId: string): Promise<{
    isDeviceSwitch: boolean;
    previousDevice?: string;
    currentDevice: string;
    message: string;
    sessionsOnPreviousDevice?: number;
  }>;
  unlinkPatientFromDevice(deviceId: string): Promise<void>;
  getPatientDeviceHistory(patientId: number): Promise<DeviceSession[]>;
  createDeviceSession(deviceSession: InsertDeviceSession): Promise<DeviceSession>;
  getPatientLastDevice(patientId: number): Promise<string | null>;
  
  // Goal operations
  getGoalsByPatient(patientId: number): Promise<any[]>;
  createGoal(goal: InsertPatientGoal): Promise<PatientGoal>;
  updateGoal(id: number, updates: Partial<InsertPatientGoal>): Promise<PatientGoal | undefined>;
  updateGoalProgress(patientId: number, goalType: string, value: number): Promise<void>;
  getPatientGoals(patientId: number): Promise<any[]>;
  deactivatePatientGoals(patientId: number): Promise<void>;
  
  // Achievement operations
  getAchievementsByPatient(patientId: number): Promise<Achievement[]>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  unlockAchievement(patientId: number, achievementId: number): Promise<Achievement | undefined>;
  getPatientAchievements(patientId: number): Promise<Achievement[]>;
  
  // Stats operations
  getPatientStats(patientId: number): Promise<PatientStats | undefined>;
  updatePatientStats(patientId: number, updates: Partial<InsertPatientStats>): Promise<PatientStats>;
  recalculatePatientStats(patientId: number): Promise<PatientStats | undefined>;

  // Analytics methods
  getLeaderboard(limit?: number): Promise<Array<{patientId: number, name: string, weeklyDuration: number, rank: number}>>;
  getDailyUsageData(patientId: number, days: number): Promise<Array<{date: string, duration: number, avgPower: number}>>;

  // Adaptive goal methods
  calculateAdaptiveGoal(patientId: number): Promise<{durationGoal: number, adaptiveReason: string}>;

  // Provider-specific methods
  getAllPatients(): Promise<User[]>;
  updateGoal(goalId: number, updates: any): Promise<any>;

  // Risk Assessment operations
  createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment>;
  getRiskAssessmentsByPatient(patientId: number): Promise<RiskAssessment[]>;
  getLatestRiskAssessment(patientId: number): Promise<RiskAssessment | undefined>;
  getRiskAssessments(patientId: number): Promise<RiskAssessment[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllPatients(): Promise<User[]> {
    const patients = await db.select().from(users).where(eq(users.userType, 'patient'));
    return patients;
  }



  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    
    // Create initial patient stats if it's a patient
    if (newUser.userType === 'patient') {
      await db.insert(patientStats).values({
        patientId: newUser.id,
        level: 1,
        xp: 0,
        totalSessions: 0,
        totalDuration: 0,
        avgDailyDuration: 0,
        consistencyStreak: 0,
      });

      // Create default goals for new patients
      await this.createDefaultGoals(newUser.id);
    }
    
    return newUser;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const [upsertedUser] = await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...user,
          updatedAt: new Date(),
        },
      })
      .returning();
    return upsertedUser;
  }

  // Provider operations
  async getProviders(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.userType, 'provider'), eq(users.isActive, true)))
      .orderBy(users.firstName, users.lastName);
  }

  async getProvidersByPatient(patientId: number): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        userType: users.userType,
        credentials: users.credentials,
        specialty: users.specialty,
        licenseNumber: users.licenseNumber,
        dateOfBirth: users.dateOfBirth,
        admissionDate: users.admissionDate,
        providerRole: users.providerRole,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(providerPatients, eq(users.id, providerPatients.providerId))
      .where(
        and(
          eq(providerPatients.patientId, patientId),
          eq(providerPatients.permissionGranted, true),
          eq(providerPatients.isActive, true)
        )
      );
  }

  // Patient operations (legacy compatibility)
  async getPatient(id: number): Promise<User | undefined> {
    const [patient] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.userType, 'patient')));
    return patient;
  }

  async getPatientById(id: number): Promise<Patient | undefined> {
    return this.getPatient(id) as Promise<Patient | undefined>;
  }

  async getPatientByCredentials(firstName: string, lastName: string, dateOfBirth: string): Promise<Patient | undefined> {
    return this.getPatientByName(firstName, lastName, dateOfBirth) as Promise<Patient | undefined>;
  }

  async getPatientByName(firstName: string, lastName: string, dateOfBirth: string): Promise<User | undefined> {
    const [patient] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.firstName, firstName),
          eq(users.lastName, lastName),
          eq(users.dateOfBirth, dateOfBirth),
          eq(users.userType, 'patient')
        )
      );
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<User> {
    return this.createUser({ ...patient, userType: 'patient' });
  }

  // Patient profile operations
  async getPatientProfile(userId: number): Promise<PatientProfile | undefined> {
    const [profile] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId));
    return profile;
  }

  async createPatientProfile(profile: InsertPatientProfile): Promise<PatientProfile> {
    const [newProfile] = await db.insert(patientProfiles).values(profile).returning();
    return newProfile;
  }

  async updatePatientProfile(userId: number, updates: Partial<InsertPatientProfile>): Promise<PatientProfile | undefined> {
    const [updatedProfile] = await db
      .update(patientProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(patientProfiles.userId, userId))
      .returning();
    return updatedProfile;
  }

  // Provider-Patient relationship operations
  async createProviderPatientRelation(relation: InsertProviderPatient): Promise<ProviderPatient> {
    const [newRelation] = await db.insert(providerPatients).values(relation).returning();
    return newRelation;
  }

  async createProviderPatientRelationship(relation: InsertProviderPatient): Promise<ProviderPatient> {
    const [newRelation] = await db.insert(providerPatients).values({
      ...relation,
      permissionGranted: true,
      grantedAt: new Date(),
      isActive: true
    }).returning();
    return newRelation;
  }

  async getProviderPatientRelationships(patientId: number): Promise<any[]> {
    const results = await db
      .select({
        id: providerPatients.id,
        providerId: providerPatients.providerId,
        patientId: providerPatients.patientId,
        permissionGranted: providerPatients.permissionGranted,
        grantedAt: providerPatients.grantedAt,
        isActive: providerPatients.isActive,
        createdAt: providerPatients.createdAt,
        providerFirstName: users.firstName,
        providerLastName: users.lastName,
        providerCredentials: users.credentials,
        providerSpecialty: users.specialty,
      })
      .from(providerPatients)
      .innerJoin(users, eq(providerPatients.providerId, users.id))
      .where(
        and(
          eq(providerPatients.patientId, Number(patientId)),
          eq(providerPatients.isActive, true)
        )
      );
    
    return results;
  }

  async deleteProviderPatientRelationship(relationshipId: number): Promise<void> {
    await db
      .update(providerPatients)
      .set({ 
        isActive: false
      })
      .where(eq(providerPatients.id, relationshipId));
  }

  async grantProviderAccess(patientId: number, providerId: number): Promise<ProviderPatient | undefined> {
    const [updatedRelation] = await db
      .update(providerPatients)
      .set({ 
        permissionGranted: true, 
        grantedAt: new Date() 
      })
      .where(
        and(
          eq(providerPatients.patientId, patientId),
          eq(providerPatients.providerId, providerId)
        )
      )
      .returning();
    return updatedRelation;
  }

  async getPatientsByProvider(providerId: number): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        userType: users.userType,
        credentials: users.credentials,
        specialty: users.specialty,
        licenseNumber: users.licenseNumber,
        dateOfBirth: users.dateOfBirth,
        admissionDate: users.admissionDate,
        providerRole: users.providerRole,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(providerPatients, eq(users.id, providerPatients.patientId))
      .where(
        and(
          eq(providerPatients.providerId, providerId),
          eq(providerPatients.permissionGranted, true),
          eq(providerPatients.isActive, true)
        )
      );
  }

  // HIPAA Access Control Methods
  /**
   * Check if a provider has access to a specific patient's data.
   * Used for HIPAA-compliant authorization checks.
   */
  async hasProviderAccessToPatient(providerId: number, patientId: number): Promise<boolean> {
    const [relation] = await db
      .select({ id: providerPatients.id })
      .from(providerPatients)
      .where(
        and(
          eq(providerPatients.providerId, providerId),
          eq(providerPatients.patientId, patientId),
          eq(providerPatients.permissionGranted, true),
          eq(providerPatients.isActive, true)
        )
      )
      .limit(1);
    return !!relation;
  }

  /**
   * Check if a caregiver has access to a specific patient's data.
   * Used for HIPAA-compliant authorization checks.
   */
  async hasCaregiverAccessToPatient(caregiverId: number, patientId: number): Promise<boolean> {
    const [relation] = await db
      .select({ id: caregiverPatients.id })
      .from(caregiverPatients)
      .where(
        and(
          eq(caregiverPatients.caregiverId, caregiverId),
          eq(caregiverPatients.patientId, patientId),
          eq(caregiverPatients.isActive, true)
        )
      )
      .limit(1);
    return !!relation;
  }

  // Session operations
  async createSession(session: InsertExerciseSession): Promise<ExerciseSession> {
    const [newSession] = await db.insert(exerciseSessions).values(session).returning();
    
    // Update patient stats and goals
    await this.updatePatientStatsAfterSession(session.patientId, session.duration || 0, Number(session.avgPower) || 0);
    await this.updateGoalProgress(session.patientId, 'duration', session.duration || 0);
    if (session.avgPower) {
      await this.updateGoalProgress(session.patientId, 'power', Number(session.avgPower));
    }
    
    return newSession;
  }

  async getSessionsByPatient(patientId: number): Promise<ExerciseSession[]> {
    return await db
      .select()
      .from(exerciseSessions)
      .where(eq(exerciseSessions.patientId, patientId))
      .orderBy(desc(exerciseSessions.startTime));
  }

  async getPatientSessions(patientId: number, limit?: number): Promise<Session[]> {
    const sessions = await db
      .select()
      .from(exerciseSessions)
      .where(eq(exerciseSessions.patientId, patientId))
      .orderBy(desc(exerciseSessions.startTime))
      .limit(limit || 50);
    return sessions as Session[];
  }

  async getPatientDailySessions(patientId: number, date: string): Promise<Session[]> {
    const sessions = await db
      .select()
      .from(exerciseSessions)
      .where(
        and(
          eq(exerciseSessions.patientId, patientId),
          eq(exerciseSessions.sessionDate, date)
        )
      )
      .orderBy(desc(exerciseSessions.startTime));
    return sessions as Session[];
  }

  async updateSession(id: number, updates: Partial<InsertExerciseSession>): Promise<ExerciseSession | undefined> {
    const [updatedSession] = await db
      .update(exerciseSessions)
      .set(updates)
      .where(eq(exerciseSessions.id, id))
      .returning();
    return updatedSession;
  }

  // Goal operations
  async getGoalsByPatient(patientId: number): Promise<any[]> {
    const result = await db
      .select({
        id: patientGoals.id,
        patientId: patientGoals.patientId,
        providerId: patientGoals.providerId,
        goalType: patientGoals.goalType,
        targetValue: patientGoals.targetValue,
        currentValue: patientGoals.currentValue,
        unit: patientGoals.unit,
        label: patientGoals.label,
        subtitle: patientGoals.subtitle,
        period: patientGoals.period,
        aiRecommended: patientGoals.aiRecommended,
        isActive: patientGoals.isActive,
        createdAt: patientGoals.createdAt,
        updatedAt: patientGoals.updatedAt,
        providerName: sql<string>`COALESCE(CONCAT(${users.firstName}, ' ', ${users.lastName}), '')`,
        providerEmail: users.email,
      })
      .from(patientGoals)
      .leftJoin(users, eq(patientGoals.providerId, users.id))
      .where(and(eq(patientGoals.patientId, patientId), eq(patientGoals.isActive, true)))
      .orderBy(desc(patientGoals.createdAt));
    
    return result;
  }

  async getPatientGoals(patientId: number): Promise<any[]> {
    const goals = await this.getGoalsByPatient(patientId);
    // Return the goals with provider information included
    return goals;
  }

  async createGoal(goal: InsertPatientGoal): Promise<PatientGoal> {
    const [newGoal] = await db.insert(patientGoals).values(goal).returning();
    return newGoal;
  }

  async updateGoal(id: number, updates: Partial<InsertPatientGoal>): Promise<PatientGoal | undefined> {
    const [updatedGoal] = await db
      .update(patientGoals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(patientGoals.id, id))
      .returning();
    return updatedGoal;
  }

  async deactivatePatientGoals(patientId: number): Promise<void> {
    await db
      .update(patientGoals)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(patientGoals.patientId, patientId));
  }

  async updateGoalProgress(patientId: number, goalType: string, value: number): Promise<void> {
    const goals = await db
      .select()
      .from(patientGoals)
      .where(
        and(
          eq(patientGoals.patientId, patientId),
          eq(patientGoals.goalType, goalType),
          eq(patientGoals.isActive, true)
        )
      );

    for (const goal of goals) {
      let newValue = Number(goal.currentValue || 0);
      
      if (goal.period === 'session') {
        newValue = value;
      } else if (goal.period === 'daily') {
        newValue += value;
      }

      await db
        .update(patientGoals)
        .set({ 
          currentValue: newValue.toString(),
          updatedAt: new Date() 
        })
        .where(eq(patientGoals.id, goal.id));
    }
  }

  // Achievement operations
  async getAchievementsByPatient(patientId: number): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.patientId, patientId))
      .orderBy(desc(achievements.unlockedAt));
  }

  async getPatientAchievements(patientId: number): Promise<Achievement[]> {
    return this.getAchievementsByPatient(patientId);
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db.insert(achievements).values(achievement).returning();
    return newAchievement;
  }

  async unlockAchievement(patientId: number, achievementId: number): Promise<Achievement | undefined> {
    const [unlockedAchievement] = await db
      .update(achievements)
      .set({ 
        isUnlocked: true, 
        unlockedAt: new Date() 
      })
      .where(
        and(
          eq(achievements.id, achievementId),
          eq(achievements.patientId, patientId)
        )
      )
      .returning();

    if (unlockedAchievement) {
      // Add XP to patient stats
      await db
        .update(patientStats)
        .set({
          xp: sql`${patientStats.xp} + ${unlockedAchievement.xpReward}`,
        })
        .where(eq(patientStats.patientId, patientId));
    }

    return unlockedAchievement;
  }

  // Stats operations
  async getPatientStats(patientId: number): Promise<PatientStats | undefined> {
    const [stats] = await db
      .select()
      .from(patientStats)
      .where(eq(patientStats.patientId, patientId));
    return stats;
  }

  async updatePatientStats(patientId: number, updates: Partial<InsertPatientStats>): Promise<PatientStats> {
    const [updatedStats] = await db
      .update(patientStats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(patientStats.patientId, patientId))
      .returning();
    return updatedStats;
  }

  /**
   * Recalculate all stats for a patient from their session history.
   * This fixes any incorrect stats that may have been calculated before.
   */
  async recalculatePatientStats(patientId: number): Promise<PatientStats | undefined> {
    const sessions = await this.getSessionsByPatient(patientId);

    if (sessions.length === 0) {
      // No sessions, reset stats to defaults
      return await this.updatePatientStats(patientId, {
        totalSessions: 0,
        totalDuration: 0,
        avgDailyDuration: 0,
        consistencyStreak: 0,
      });
    }

    // Calculate total duration (duration is stored in MINUTES)
    const totalDurationMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalSessions = sessions.length;

    // Calculate unique days with sessions for accurate daily average
    // sessionDate is already stored as YYYY-MM-DD string, use it directly
    const uniqueDays = new Set(
      sessions.map(s => s.sessionDate).filter(d => d !== null && d !== undefined)
    );

    const numUniqueDays = uniqueDays.size || 1;
    // avgDailyDuration is stored in SECONDS (dashboard divides by 60 to display minutes)
    const avgDailyDuration = (totalDurationMinutes / numUniqueDays) * 60;

    // Calculate consistency streak (consecutive days with sessions)
    const sortedDays = Array.from(uniqueDays).sort().reverse();
    let streak = 0;
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    for (let i = 0; i < sortedDays.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(expectedDate);

      if (sortedDays[i] === expectedStr) {
        streak++;
      } else {
        break;
      }
    }

    // Get last session date
    const lastSession = sessions.sort((a, b) => {
      const dateA = new Date(a.startTime || a.createdAt || 0).getTime();
      const dateB = new Date(b.startTime || b.createdAt || 0).getTime();
      return dateB - dateA;
    })[0];
    const lastSessionDate = lastSession?.startTime || lastSession?.createdAt;

    return await this.updatePatientStats(patientId, {
      totalSessions,
      totalDuration,
      avgDailyDuration,
      consistencyStreak: streak,
      lastSessionDate: lastSessionDate ? new Date(lastSessionDate) : undefined,
    });
  }

  // Analytics methods
  async getLeaderboard(limit = 10): Promise<Array<{patientId: number, name: string, weeklyDuration: number, rank: number}>> {
    // Mock implementation for now - can be enhanced with real weekly data
    const stats = await db
      .select({
        patientId: patientStats.patientId,
        weeklyDuration: patientStats.totalDuration,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(patientStats)
      .innerJoin(users, eq(patientStats.patientId, users.id))
      .orderBy(desc(patientStats.totalDuration))
      .limit(limit);

    return stats.map((stat, index) => ({
      patientId: stat.patientId,
      name: `${stat.firstName} ${stat.lastName.charAt(0)}.`,
      weeklyDuration: stat.weeklyDuration || 0,
      rank: index + 1,
    }));
  }

  async getDailyUsageData(patientId: number, days: number): Promise<Array<{date: string, duration: number, avgPower: number}>> {
    const sessions = await db
      .select()
      .from(exerciseSessions)
      .where(eq(exerciseSessions.patientId, patientId))
      .orderBy(desc(exerciseSessions.sessionDate))
      .limit(days * 3); // Assume max 3 sessions per day

    // Group by date and aggregate
    const dataMap = new Map<string, {duration: number, avgPower: number, sessionCount: number}>();
    
    sessions.forEach(session => {
      const date = session.sessionDate;
      const existing = dataMap.get(date) || {duration: 0, avgPower: 0, sessionCount: 0};
      
      existing.duration += session.duration;
      existing.avgPower += Number(session.avgPower || 0);
      existing.sessionCount += 1;
      
      dataMap.set(date, existing);
    });

    return Array.from(dataMap.entries())
      .map(([date, data]) => ({
        date,
        duration: data.duration,
        avgPower: data.sessionCount > 0 ? data.avgPower / data.sessionCount : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort ascending for proper trend display
  }

  async calculateAdaptiveGoal(patientId: number): Promise<{durationGoal: number, adaptiveReason: string}> {
    // Use the provider-set goal from database instead of adaptive calculation
    const goals = await this.getPatientGoals(patientId);
    const durationGoal = goals.find(g => g.goalType === 'duration');
    
    if (durationGoal) {
      return {
        durationGoal: Math.floor(Number(durationGoal.targetValue) / 60), // Convert seconds to minutes for display
        adaptiveReason: "Provider-recommended daily mobility target"
      };
    }

    // Fallback to realistic clinical standard
    return {
      durationGoal: 15, // 15 minutes - clinical standard
      adaptiveReason: "Clinical standard: 15 minutes daily mobility"
    };
  }

  // Risk Assessment operations
  async createRiskAssessment(assessment: InsertRiskAssessment): Promise<RiskAssessment> {
    // Extract only the fields we need - ensure all values are proper strings
    // IMPORTANT: Do not include id or createdAt - let DB handle defaults
    const insertData = {
      patientId: Number(assessment.patientId),
      deconditioning: String(assessment.deconditioning || '{}'),
      vte: String(assessment.vte || '{}'),
      falls: String(assessment.falls || '{}'),
      pressure: String(assessment.pressure || '{}'),
      mobilityRecommendation: String(assessment.mobilityRecommendation || '{}'),
      losData: assessment.losData ? String(assessment.losData) : null,
      dischargeData: assessment.dischargeData ? String(assessment.dischargeData) : null,
      readmissionData: assessment.readmissionData ? String(assessment.readmissionData) : null,
    };

    console.log('Inserting risk assessment - patientId:', insertData.patientId);

    const [newAssessment] = await db.insert(riskAssessments).values(insertData).returning();

    // Create AI-recommended goals based on the assessment
    await this.createGoalsFromRiskAssessment(assessment.patientId, newAssessment);

    return newAssessment;
  }

  async getRiskAssessmentsByPatient(patientId: number): Promise<RiskAssessment[]> {
    return await db
      .select()
      .from(riskAssessments)
      .where(eq(riskAssessments.patientId, patientId))
      .orderBy(desc(riskAssessments.createdAt));
  }

  async getRiskAssessments(patientId: number): Promise<RiskAssessment[]> {
    return this.getRiskAssessmentsByPatient(patientId);
  }

  async getLatestRiskAssessment(patientId: number): Promise<RiskAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(riskAssessments)
      .where(eq(riskAssessments.patientId, patientId))
      .orderBy(desc(riskAssessments.createdAt))
      .limit(1);
    return assessment;
  }

  // Helper methods
  private async updatePatientStatsAfterSession(patientId: number, duration: number, avgPower: number): Promise<void> {
    const currentStats = await this.getPatientStats(patientId);

    if (currentStats) {
      const newTotalSessions = (currentStats.totalSessions || 0) + 1;
      const newTotalDuration = (currentStats.totalDuration || 0) + duration;

      // Calculate average daily duration correctly by counting unique days
      // Get all sessions and use sessionDate directly (already stored as YYYY-MM-DD)
      const sessions = await this.getSessionsByPatient(patientId);
      const uniqueDays = new Set(
        sessions.map(s => s.sessionDate).filter(d => d !== null && d !== undefined)
      );

      const numUniqueDays = uniqueDays.size || 1; // Avoid division by zero
      // Calculate total duration in minutes from all sessions
      const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      // avgDailyDuration is stored in SECONDS (dashboard divides by 60 to display minutes)
      const newAvgDailyDuration = (totalMinutes / numUniqueDays) * 60;

      await this.updatePatientStats(patientId, {
        totalSessions: newTotalSessions,
        totalDuration: newTotalDuration,
        avgDailyDuration: newAvgDailyDuration,
        lastSessionDate: new Date(),
      });
    }
  }

  private async createDefaultGoals(patientId: number): Promise<void> {
    const defaultGoals = [
      {
        patientId,
        goalType: 'duration',
        targetValue: '600', // 10 minutes
        currentValue: '0',
        unit: 'seconds',
        label: 'Daily Exercise Duration',
        subtitle: 'Build consistency with daily movement',
        period: 'daily',
        aiRecommended: false,
      },
      {
        patientId,
        goalType: 'power',
        targetValue: '25', // 25 watts
        currentValue: '0',
        unit: 'watts',
        label: 'Average Power Output',
        subtitle: 'Strengthen your cardiovascular system',
        period: 'session',
        aiRecommended: false,
      }
    ];

    for (const goal of defaultGoals) {
      await this.createGoal(goal as InsertPatientGoal);
    }
  }

  private async createGoalsFromRiskAssessment(patientId: number, assessment: RiskAssessment): Promise<void> {
    // Disable existing goals
    await db
      .update(patientGoals)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(patientGoals.patientId, patientId));

    // Parse the mobility recommendation from JSON string
    let recommendation: any = null;
    try {
      recommendation = typeof assessment.mobilityRecommendation === 'string'
        ? JSON.parse(assessment.mobilityRecommendation)
        : assessment.mobilityRecommendation;
    } catch (e) {
      console.error('Failed to parse mobilityRecommendation:', e);
      return;
    }
    
    if (recommendation && recommendation.watt_goal && recommendation.duration_min_per_session) {
      const aiGoals = [
        {
          patientId,
          goalType: 'duration',
          targetValue: (recommendation.duration_min_per_session * 60).toString(), // Convert to seconds
          currentValue: '0',
          unit: 'seconds',
          label: 'AI-Recommended Duration',
          subtitle: 'Based on your risk assessment',
          period: 'session',
          aiRecommended: true,
        },
        {
          patientId,
          goalType: 'power',
          targetValue: recommendation.watt_goal.toString(),
          currentValue: '0',
          unit: 'watts',
          label: 'AI-Recommended Power Target',
          subtitle: 'Optimized for your risk profile',
          period: 'session',
          aiRecommended: true,
        }
      ];

      for (const goal of aiGoals) {
        await this.createGoal(goal as InsertPatientGoal);
      }
    }
  }

  async createGoalsFromMobilityRecommendation(patientId: number, mobilityRecommendation: any): Promise<void> {
    // Disable existing goals
    await db
      .update(patientGoals)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(patientGoals.patientId, patientId));

    if (mobilityRecommendation && mobilityRecommendation.watt_goal && mobilityRecommendation.duration_min_per_session) {
      const aiGoals = [
        {
          patientId,
          goalType: 'duration',
          targetValue: (mobilityRecommendation.duration_min_per_session * 60).toString(), // Convert to seconds
          currentValue: '0',
          unit: 'seconds',
          label: 'AI-Recommended Duration',
          subtitle: 'Based on risk assessment',
          period: 'session',
          aiRecommended: true,
        },
        {
          patientId,
          goalType: 'power',
          targetValue: mobilityRecommendation.watt_goal.toString(),
          currentValue: '0',
          unit: 'watts',
          label: 'AI-Recommended Power Target',
          subtitle: 'Optimized for risk profile',
          period: 'session',
          aiRecommended: true,
        }
      ];

      for (const goal of aiGoals) {
        await this.createGoal(goal as InsertPatientGoal);
      }
    }
  }

  // Device operations
  async getDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  }

  async getDevice(deviceId: string): Promise<Device | undefined> {
    const result = await db.select().from(devices).where(eq(devices.id, deviceId));
    return result[0];
  }

  async updateDeviceStatus(deviceId: string, status: string, patientId?: number): Promise<Device | undefined> {
    const result = await db
      .update(devices)
      .set({ 
        status, 
        currentPatientId: patientId || null,
        lastUsed: patientId ? new Date() : undefined,
        updatedAt: new Date() 
      })
      .where(eq(devices.id, deviceId))
      .returning();
    return result[0];
  }

  async linkPatientToDevice(patientId: number, deviceId: string): Promise<{
    isDeviceSwitch: boolean;
    previousDevice?: string;
    currentDevice: string;
    message: string;
    sessionsOnPreviousDevice?: number;
  }> {
    // Check if patient was previously linked to a different device
    // First check current device links, then fall back to session history
    let currentDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.currentPatientId, patientId));
    
    // If no current device link, find their most recent device from sessions
    if (currentDevices.length === 0) {
      const recentSession = await db
        .select()
        .from(exerciseSessions)
        .where(eq(exerciseSessions.patientId, patientId))
        .orderBy(desc(exerciseSessions.createdAt))
        .limit(1);
      
      if (recentSession.length > 0) {
        const lastDeviceId = recentSession[0].deviceId;
        if (lastDeviceId && lastDeviceId !== deviceId) {
          currentDevices = [{ id: lastDeviceId, status: 'available', currentPatientId: null } as any];
        }
      }
    }
    
    let previousDevice: string | undefined;
    let isDeviceSwitch = false;
    let sessionsOnPreviousDevice = 0;
    
    if (currentDevices.length > 0) {
      previousDevice = currentDevices[0].id;
      if (previousDevice !== deviceId) {
        isDeviceSwitch = true;
        
        // Count sessions on previous device
        const previousSessions = await db
          .select()
          .from(exerciseSessions)
          .where(and(
            eq(exerciseSessions.patientId, patientId),
            eq(exerciseSessions.deviceId, previousDevice)
          ));
        
        sessionsOnPreviousDevice = previousSessions.length;
        
        // Unlink from previous device
        await this.updateDeviceStatus(previousDevice, 'available');
      }
    }
    
    // Update new device status to 'in_use' and set current patient
    await this.updateDeviceStatus(deviceId, 'in_use', patientId);
    
    // Check total sessions across all devices for this patient
    const allSessions = await db
      .select()
      .from(exerciseSessions)
      .where(eq(exerciseSessions.patientId, patientId));
    
    const totalSessions = allSessions.length;
    const isFirstTimeUser = totalSessions === 0;
    
    // Generate contextual message based on the specific situation
    let message: string;
    if (isDeviceSwitch && previousDevice && sessionsOnPreviousDevice > 0) {
      // Switching from one bike to another with meaningful session history
      message = `Device switched successfully! You've moved from bike ${previousDevice} to bike ${deviceId}. All ${sessionsOnPreviousDevice} of your previous sessions are preserved and your progress continues seamlessly.`;
    } else if (isFirstTimeUser) {
      // Brand new user, first time using any bike
      message = `Welcome to your mobility therapy journey! You're now connected to bike ${deviceId}. Your exercise data and progress will be tracked starting with your first session.`;
    } else if (currentDevices.length === 0 || (isDeviceSwitch && sessionsOnPreviousDevice === 0)) {
      // Returning user but first time using this specific bike, OR came from device with no sessions
      message = `Welcome back! You're now linked to bike ${deviceId}. Your ${totalSessions} previous sessions from other bikes are preserved and your progress continues here.`;
    } else {
      // Returning to the same bike they were already using
      message = `Welcome back to bike ${deviceId}! Ready to continue your therapy right where you left off. Your progress and goals are all up to date.`;
    }
    
    return {
      isDeviceSwitch,
      previousDevice,
      currentDevice: deviceId,
      message,
      sessionsOnPreviousDevice: isDeviceSwitch ? sessionsOnPreviousDevice : undefined
    };
  }

  async unlinkPatientFromDevice(deviceId: string): Promise<void> {
    // Update device status back to 'available' and clear current patient
    await this.updateDeviceStatus(deviceId, 'available');
  }

  async getPatientLastDevice(patientId: number): Promise<string | null> {
    // First check if patient is currently linked to a device
    const currentDevice = await db
      .select()
      .from(devices)
      .where(eq(devices.currentPatientId, patientId))
      .limit(1);
    
    if (currentDevice.length > 0) {
      return currentDevice[0].id;
    }
    
    // If not currently linked, get their most recent session device
    const recentSession = await db
      .select()
      .from(exerciseSessions)
      .where(eq(exerciseSessions.patientId, patientId))
      .orderBy(desc(exerciseSessions.createdAt))
      .limit(1);
    
    if (recentSession.length > 0) {
      return recentSession[0].deviceId;
    }
    
    return null; // No device found
  }

  async getPatientDeviceHistory(patientId: number): Promise<DeviceSession[]> {
    return await db
      .select()
      .from(deviceSessions)
      .where(eq(deviceSessions.patientId, patientId))
      .orderBy(desc(deviceSessions.startedAt));
  }

  async createDeviceSession(deviceSession: InsertDeviceSession): Promise<DeviceSession> {
    const result = await db.insert(deviceSessions).values(deviceSession).returning();
    return result[0];
  }

  // ============================================================================
  // CAREGIVER ENGAGEMENT OPERATIONS
  // ============================================================================

  // Caregiver-Patient Relationship Operations
  async createCaregiverPatientRelation(relation: InsertCaregiverPatient): Promise<CaregiverPatient> {
    const [newRelation] = await db.insert(caregiverPatients).values(relation).returning();
    return newRelation;
  }

  async getCaregiverPatientRelation(caregiverId: number, patientId: number): Promise<CaregiverPatient | undefined> {
    const [relation] = await db
      .select()
      .from(caregiverPatients)
      .where(and(
        eq(caregiverPatients.caregiverId, caregiverId),
        eq(caregiverPatients.patientId, patientId)
      ));
    return relation;
  }

  async getPatientsByCaregiverId(caregiverId: number): Promise<Array<User & { relationship: CaregiverPatient }>> {
    const relations = await db
      .select()
      .from(caregiverPatients)
      .innerJoin(users, eq(caregiverPatients.patientId, users.id))
      .where(and(
        eq(caregiverPatients.caregiverId, caregiverId),
        eq(caregiverPatients.accessStatus, 'approved')
      ));

    return relations.map(r => ({
      ...r.users,
      relationship: r.caregiver_patients
    }));
  }

  async getCaregiversByPatientId(patientId: number): Promise<Array<User & { relationship: CaregiverPatient }>> {
    const relations = await db
      .select()
      .from(caregiverPatients)
      .innerJoin(users, eq(caregiverPatients.caregiverId, users.id))
      .where(eq(caregiverPatients.patientId, patientId));

    return relations.map(r => ({
      ...r.users,
      relationship: r.caregiver_patients
    }));
  }

  async getPendingCaregiverRequests(patientId: number): Promise<Array<User & { relationship: CaregiverPatient }>> {
    const relations = await db
      .select()
      .from(caregiverPatients)
      .innerJoin(users, eq(caregiverPatients.caregiverId, users.id))
      .where(and(
        eq(caregiverPatients.patientId, patientId),
        eq(caregiverPatients.accessStatus, 'pending')
      ));

    return relations.map(r => ({
      ...r.users,
      relationship: r.caregiver_patients
    }));
  }

  async updateCaregiverAccessStatus(
    relationId: number,
    status: 'approved' | 'denied' | 'revoked'
  ): Promise<CaregiverPatient | undefined> {
    const updateData: Partial<CaregiverPatient> = {
      accessStatus: status,
    };

    if (status === 'approved') {
      updateData.approvedAt = new Date();
    } else if (status === 'revoked') {
      updateData.revokedAt = new Date();
    }

    const [updated] = await db
      .update(caregiverPatients)
      .set(updateData)
      .where(eq(caregiverPatients.id, relationId))
      .returning();

    return updated;
  }

  async updateCaregiverXp(relationId: number, xpToAdd: number): Promise<CaregiverPatient | undefined> {
    // Get current XP
    const [current] = await db
      .select()
      .from(caregiverPatients)
      .where(eq(caregiverPatients.id, relationId));

    if (!current) return undefined;

    const newXp = (current.supporterXp || 0) + xpToAdd;
    const newLevel = Math.floor(newXp / 100) + 1; // Level up every 100 XP

    const [updated] = await db
      .update(caregiverPatients)
      .set({
        supporterXp: newXp,
        supporterLevel: newLevel
      })
      .where(eq(caregiverPatients.id, relationId))
      .returning();

    return updated;
  }

  // Caregiver Observation Operations
  async createCaregiverObservation(observation: InsertCaregiverObservation): Promise<CaregiverObservation> {
    const [newObs] = await db.insert(caregiverObservations).values(observation).returning();
    return newObs;
  }

  async getCaregiverObservationsByPatient(patientId: number, limit = 10): Promise<CaregiverObservation[]> {
    return await db
      .select()
      .from(caregiverObservations)
      .where(eq(caregiverObservations.patientId, patientId))
      .orderBy(desc(caregiverObservations.createdAt))
      .limit(limit);
  }

  async getCaregiverObservationsByCaregiver(caregiverId: number, limit = 10): Promise<CaregiverObservation[]> {
    return await db
      .select()
      .from(caregiverObservations)
      .where(eq(caregiverObservations.caregiverId, caregiverId))
      .orderBy(desc(caregiverObservations.createdAt))
      .limit(limit);
  }

  async updateObservationAiSummary(observationId: number, aiSummary: string): Promise<CaregiverObservation | undefined> {
    const [updated] = await db
      .update(caregiverObservations)
      .set({ aiSummary })
      .where(eq(caregiverObservations.id, observationId))
      .returning();
    return updated;
  }

  // Caregiver Notification Operations
  async createCaregiverNotification(notification: InsertCaregiverNotification): Promise<CaregiverNotification> {
    const [newNotif] = await db.insert(caregiverNotifications).values(notification).returning();
    return newNotif;
  }

  async getCaregiverNotifications(caregiverId: number, unreadOnly = false): Promise<CaregiverNotification[]> {
    if (unreadOnly) {
      return await db
        .select()
        .from(caregiverNotifications)
        .where(and(
          eq(caregiverNotifications.caregiverId, caregiverId),
          eq(caregiverNotifications.isRead, false)
        ))
        .orderBy(desc(caregiverNotifications.createdAt));
    }

    return await db
      .select()
      .from(caregiverNotifications)
      .where(eq(caregiverNotifications.caregiverId, caregiverId))
      .orderBy(desc(caregiverNotifications.createdAt));
  }

  async markCaregiverNotificationRead(notificationId: number): Promise<CaregiverNotification | undefined> {
    const [updated] = await db
      .update(caregiverNotifications)
      .set({ isRead: true })
      .where(eq(caregiverNotifications.id, notificationId))
      .returning();
    return updated;
  }

  async markAllCaregiverNotificationsRead(caregiverId: number): Promise<void> {
    await db
      .update(caregiverNotifications)
      .set({ isRead: true })
      .where(eq(caregiverNotifications.caregiverId, caregiverId));
  }

  // Caregiver Achievement Operations
  async createCaregiverAchievement(achievement: InsertCaregiverAchievement): Promise<CaregiverAchievement> {
    const [newAch] = await db.insert(caregiverAchievements).values(achievement).returning();
    return newAch;
  }

  async getCaregiverAchievements(caregiverId: number, patientId?: number): Promise<CaregiverAchievement[]> {
    if (patientId) {
      return await db
        .select()
        .from(caregiverAchievements)
        .where(and(
          eq(caregiverAchievements.caregiverId, caregiverId),
          eq(caregiverAchievements.patientId, patientId)
        ))
        .orderBy(desc(caregiverAchievements.createdAt));
    }

    return await db
      .select()
      .from(caregiverAchievements)
      .where(eq(caregiverAchievements.caregiverId, caregiverId))
      .orderBy(desc(caregiverAchievements.createdAt));
  }

  async unlockCaregiverAchievement(achievementId: number): Promise<CaregiverAchievement | undefined> {
    const [updated] = await db
      .update(caregiverAchievements)
      .set({
        isUnlocked: true,
        unlockedAt: new Date()
      })
      .where(eq(caregiverAchievements.id, achievementId))
      .returning();
    return updated;
  }

  // Discharge Checklist Operations
  async getOrCreateDischargeChecklist(patientId: number, caregiverId?: number): Promise<DischargeChecklist> {
    // Check if checklist exists
    const [existing] = await db
      .select()
      .from(dischargeChecklists)
      .where(eq(dischargeChecklists.patientId, patientId));

    if (existing) {
      return existing;
    }

    // Create new checklist with defaults
    const [newChecklist] = await db.insert(dischargeChecklists).values({
      patientId,
      caregiverId: caregiverId || null,
      equipmentNeeds: '{}',
      homeModifications: '{}',
      medicationReview: '{}',
      followUpAppointments: '[]',
      emergencyContacts: '[]',
      warningSigns: '{}',
      homeExercisePlan: '{}',
      dietRestrictions: '{}',
      completionPercent: 0
    }).returning();

    return newChecklist;
  }

  async updateDischargeChecklist(
    checklistId: number,
    updates: Partial<InsertDischargeChecklist>
  ): Promise<DischargeChecklist | undefined> {
    const [updated] = await db
      .update(dischargeChecklists)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(dischargeChecklists.id, checklistId))
      .returning();
    return updated;
  }

  async getDischargeChecklistByPatient(patientId: number): Promise<DischargeChecklist | undefined> {
    const [checklist] = await db
      .select()
      .from(dischargeChecklists)
      .where(eq(dischargeChecklists.patientId, patientId));
    return checklist;
  }

  // Check for active session (for conflict detection)
  async getActiveSessionForPatient(patientId: number): Promise<ExerciseSession | undefined> {
    const [session] = await db
      .select()
      .from(exerciseSessions)
      .where(and(
        eq(exerciseSessions.patientId, patientId),
        eq(exerciseSessions.currentStatus, 'active')
      ));
    return session;
  }
}

export const storage = new DatabaseStorage();