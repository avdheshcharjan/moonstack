/**
 * Points Service
 *
 * Service for awarding and managing points for user actions
 */

import { db } from '@/db';
import { pointRules, pointEvents, scores } from '@/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export interface AwardPointsParams {
  profileId: string | number;
  ruleKey: string;
  sourceId: string;
  evidence?: Record<string, unknown>;
}

export interface AwardPointsResult {
  success: boolean;
  message?: string;
  points?: number;
  error?: string;
}

export class PointsService {
  /**
   * Award points to a profile based on a point rule
   *
   * @param params - Parameters for awarding points
   * @returns Result of the points award
   */
  static async awardPoints(params: AwardPointsParams): Promise<AwardPointsResult> {
    const { profileId, ruleKey, sourceId, evidence } = params;

    try {
      const profileIdNum = typeof profileId === 'string' ? parseInt(profileId) : profileId;

      // Step 1: Fetch the point rule
      const [rule] = await db
        .select()
        .from(pointRules)
        .where(and(eq(pointRules.key, ruleKey), eq(pointRules.active, true)))
        .limit(1);

      if (!rule) {
        return {
          success: false,
          error: `Point rule '${ruleKey}' not found or inactive`,
        };
      }

      // Step 2: Check if this sourceId has already been used (idempotency)
      const [existingEvent] = await db
        .select()
        .from(pointEvents)
        .where(
          and(
            eq(pointEvents.profileId, profileIdNum),
            eq(pointEvents.sourceId, sourceId)
          )
        )
        .limit(1);

      if (existingEvent) {
        return {
          success: false,
          error: 'Points already awarded for this action',
        };
      }

      // Step 3: Check cooldown period
      if (rule.cooldownSeconds > 0) {
        const cooldownDate = new Date(Date.now() - rule.cooldownSeconds * 1000);

        const recentEvents = await db
          .select()
          .from(pointEvents)
          .where(
            and(
              eq(pointEvents.profileId, profileIdNum),
              eq(pointEvents.ruleKey, ruleKey),
              gte(pointEvents.createdAt, cooldownDate.toISOString())
            )
          )
          .limit(1);

        if (recentEvents.length > 0) {
          const lastEvent = recentEvents[0];
          const lastEventDate = new Date(lastEvent.createdAt);
          const cooldownEndDate = new Date(lastEventDate.getTime() + rule.cooldownSeconds * 1000);
          const remainingSeconds = Math.ceil((cooldownEndDate.getTime() - Date.now()) / 1000);

          return {
            success: false,
            error: `Cooldown active. Try again in ${remainingSeconds} seconds`,
          };
        }
      }

      // Step 4: Check max times limit
      if (rule.maxTimes !== null && rule.maxTimes !== undefined) {
        const eventCount = await db
          .select()
          .from(pointEvents)
          .where(
            and(
              eq(pointEvents.profileId, profileIdNum),
              eq(pointEvents.ruleKey, ruleKey)
            )
          );

        if (eventCount.length >= rule.maxTimes) {
          return {
            success: false,
            error: `Maximum times limit reached for this action (${rule.maxTimes})`,
          };
        }
      }

      // Step 5: Create point event
      await db.insert(pointEvents).values({
        profileId: profileIdNum,
        ruleKey,
        delta: rule.points,
        sourceId,
        evidence: evidence ? JSON.stringify(evidence) : null,
        createdAt: new Date().toISOString(),
      });

      // Step 6: Update score cache
      const [existingScore] = await db
        .select()
        .from(scores)
        .where(eq(scores.profileId, profileIdNum))
        .limit(1);

      if (existingScore) {
        await db
          .update(scores)
          .set({
            totalPoints: existingScore.totalPoints + rule.points,
          })
          .where(eq(scores.profileId, profileIdNum));
      } else {
        await db.insert(scores).values({
          profileId: profileIdNum,
          totalPoints: rule.points,
        });
      }

      return {
        success: true,
        message: `Awarded ${rule.points} points for ${ruleKey}`,
        points: rule.points,
      };
    } catch (error) {
      console.error('[PointsService] Error awarding points:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get total points for a profile
   *
   * @param profileId - Profile ID
   * @returns Total points
   */
  static async getTotalPoints(profileId: number): Promise<number> {
    const [score] = await db
      .select()
      .from(scores)
      .where(eq(scores.profileId, profileId))
      .limit(1);

    return score?.totalPoints || 0;
  }

  /**
   * Get recent point events for a profile
   *
   * @param profileId - Profile ID
   * @param limit - Number of events to return
   * @returns Array of point events
   */
  static async getRecentEvents(profileId: number, limit = 10) {
    return db
      .select()
      .from(pointEvents)
      .where(eq(pointEvents.profileId, profileId))
      .orderBy(desc(pointEvents.createdAt))
      .limit(limit);
  }
}
