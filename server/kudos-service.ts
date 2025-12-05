import { db } from "./db";
import { feedItems, nudgeMessages, kudosReactions, patientPreferences, users, patientStats } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// Template definitions for feed messages
const MESSAGE_TEMPLATES = {
  goal_completed: [
    "{displayName} crushed their daily goal! 🎯",
    "{displayName} hit {watts}W today - amazing! ⚡",
    "{displayName} completed {minutes} minutes of exercise! 💪",
    "{displayName} is on fire with goal completion! 🔥"
  ],
  session_started: [
    "{displayName} just started their session! 🚴‍♀️",
    "{displayName} is getting their heart pumping! ❤️",
    "{displayName} is back in action! 💪"
  ],
  streak_extended: [
    "{displayName} is on a {streakDays}-day streak! 🔥",
    "Streak master {displayName} - {streakDays} days strong! ⭐",
    "{displayName} keeps going: {streakDays} days and counting! 🎯"
  ],
  session_missed: [] // No public messages for missed sessions
};

const NUDGE_TEMPLATES = {
  gentle_reminder: [
    "Hey {displayName}, you've got this! Just {minutesLeft} minutes to go! 🌟",
    "{displayName}, almost there - {minutesLeft} more minutes! 💪",
    "You're so close {displayName}! {minutesLeft} minutes left today! 🎯"
  ],
  encouragement: [
    "{displayName}, your streak is looking great! Keep it going! 🔥",
    "Send some energy to {displayName} - they're crushing it! ⚡",
    "{displayName} could use some encouragement today! 💙"
  ]
};

export class KudosService {
  // Generate feed item from exercise event
  async createFeedItem(patientId: number, eventType: string, metadata: any = {}) {
    try {
      const patient = await db.select().from(users).where(eq(users.id, patientId)).limit(1);
      if (!patient.length) return;

      const preferences = await this.getPatientPreferences(patientId);
      if (!preferences?.optInKudos) return; // Must opt-in to appear in feed

      const templates = MESSAGE_TEMPLATES[eventType as keyof typeof MESSAGE_TEMPLATES];
      if (!templates || templates.length === 0) return;

      const templateId = Math.floor(Math.random() * templates.length);
      const template = templates[templateId];
      
      const message = this.fillTemplate(template, {
        displayName: preferences.displayName,
        ...metadata
      });

      await db.insert(feedItems).values({
        patientId,
        displayName: preferences.displayName,
        avatarEmoji: preferences.avatarEmoji,
        eventType,
        templateId: `${eventType}_${templateId}`,
        message,
        metadata,
        unit: preferences.unit
      });

    } catch (error) {
      console.error("Error creating feed item:", error);
    }
  }

  // Send nudge message
  async sendNudge(senderId: number, recipientId: number, templateType: string, metadata: any = {}) {
    try {
      // Rate limiting: check if sender already sent nudge today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingNudges = await db
        .select()
        .from(nudgeMessages)
        .where(
          and(
            eq(nudgeMessages.senderId, senderId),
            eq(nudgeMessages.recipientId, recipientId),
            sql`${nudgeMessages.createdAt} >= ${today}`
          )
        );

      if (existingNudges.length >= 2) return; // Max 2 nudges per day per recipient

      const senderPrefs = await this.getPatientPreferences(senderId);
      const recipientPrefs = await this.getPatientPreferences(recipientId);
      
      if (!recipientPrefs?.optInNudges) return; // Recipient must opt-in

      const templates = NUDGE_TEMPLATES[templateType as keyof typeof NUDGE_TEMPLATES];
      if (!templates || templates.length === 0) return;

      const templateId = Math.floor(Math.random() * templates.length);
      const template = templates[templateId];
      
      const message = this.fillTemplate(template, {
        displayName: recipientPrefs.displayName,
        senderName: senderPrefs?.displayName || "A friend",
        ...metadata
      });

      await db.insert(nudgeMessages).values({
        senderId,
        recipientId,
        templateId: `${templateType}_${templateId}`,
        message
      });

    } catch (error) {
      console.error("Error sending nudge:", error);
    }
  }

  // Add reaction to feed item
  async addReaction(patientId: number, feedItemId: number, reactionType: string) {
    try {
      // Check if already reacted
      const existing = await db
        .select()
        .from(kudosReactions)
        .where(
          and(
            eq(kudosReactions.patientId, patientId),
            eq(kudosReactions.feedItemId, feedItemId)
          )
        );

      if (existing.length > 0) {
        // Update existing reaction
        await db
          .update(kudosReactions)
          .set({ reactionType })
          .where(eq(kudosReactions.id, existing[0].id));
      } else {
        // Add new reaction
        await db.insert(kudosReactions).values({
          patientId,
          feedItemId,
          reactionType
        });
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  }

  // Get feed for patient's unit
  async getFeedForUnit(unit: string, limit: number = 20) {
    try {
      const items = await db
        .select({
          id: feedItems.id,
          displayName: feedItems.displayName,
          avatarEmoji: feedItems.avatarEmoji,
          message: feedItems.message,
          eventType: feedItems.eventType,
          metadata: feedItems.metadata,
          createdAt: feedItems.createdAt,
          reactions: sql<string>`JSON_AGG(
            JSON_BUILD_OBJECT(
              'type', ${kudosReactions.reactionType},
              'count', COUNT(${kudosReactions.id})
            )
          ) FILTER (WHERE ${kudosReactions.id} IS NOT NULL)`
        })
        .from(feedItems)
        .leftJoin(kudosReactions, eq(feedItems.id, kudosReactions.feedItemId))
        .where(
          and(
            eq(feedItems.unit, unit),
            eq(feedItems.isVisible, true)
          )
        )
        .groupBy(feedItems.id)
        .orderBy(desc(feedItems.createdAt))
        .limit(limit);

      return items;
    } catch (error) {
      console.error("Error getting feed:", error);
      return [];
    }
  }

  // Get patient preferences
  async getPatientPreferences(patientId: number) {
    try {
      const [prefs] = await db
        .select()
        .from(patientPreferences)
        .where(eq(patientPreferences.patientId, patientId));
      
      return prefs;
    } catch (error) {
      console.error("Error getting patient preferences:", error);
      return null;
    }
  }

  // Update patient preferences
  async updatePatientPreferences(patientId: number, updates: any) {
    try {
      const existing = await this.getPatientPreferences(patientId);
      
      if (existing) {
        await db
          .update(patientPreferences)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(patientPreferences.patientId, patientId));
      } else {
        await db.insert(patientPreferences).values({
          patientId,
          ...updates
        });
      }
    } catch (error) {
      console.error("Error updating patient preferences:", error);
    }
  }

  // Helper: Fill template with variables
  private fillTemplate(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
    return result;
  }

  // Event handlers for automatic feed generation
  async handleGoalCompleted(patientId: number, goalType: string, value: number) {
    const metadata = goalType === 'power' ? { watts: value } : { minutes: Math.floor(value / 60) };
    await this.createFeedItem(patientId, 'goal_completed', metadata);
  }

  async handleSessionStarted(patientId: number) {
    await this.createFeedItem(patientId, 'session_started');
  }

  async handleStreakExtended(patientId: number, streakDays: number) {
    await this.createFeedItem(patientId, 'streak_extended', { streakDays });
  }
}

export const kudosService = new KudosService();