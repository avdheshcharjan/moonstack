import { db } from '@/db';
import { pointRules } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const rulesToSeed = [
        {
            key: 'FOLLOW_X',
            points: 100,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'LIKE_X',
            points: 100,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'REPOST_X',
            points: 100,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'COMMENT_X',
            points: 100,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'FOLLOW_FC',
            points: 100,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'LIKE_FC',
            points: 100,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'COMMENT_FC',
            points: 100,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'REPOST_FC',
            points: 100,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'REFERRAL_SIGNUP',
            points: 100,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 999,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'MINT_AURA',
            points: 2000,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'GIFT_AURA',
            points: 3000,
            active: true,
            cooldownSeconds: 0,
            maxTimes: null, // Unlimited gifts
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'CAST_FC',
            points: 150,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        // "Another" tasks - allow users to complete actions on different casts/tweets
        {
            key: 'LIKE_FC_ANOTHER',
            points: 150,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'COMMENT_FC_ANOTHER',
            points: 150,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'REPOST_FC_ANOTHER',
            points: 150,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'CAST_FC_ANOTHER',
            points: 150,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'LIKE_X_ANOTHER',
            points: 150,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'COMMENT_X_ANOTHER',
            points: 150,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'REPOST_X_ANOTHER',
            points: 150,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            key: 'POST_X_ANOTHER',
            points: 150,
            active: true,
            cooldownSeconds: 0,
            maxTimes: 1,
            metadata: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ];

    let insertedCount = 0;
    let updatedCount = 0;

    for (const rule of rulesToSeed) {
        try {
            const existingRule = await db
                .select()
                .from(pointRules)
                .where(eq(pointRules.key, rule.key))
                .limit(1);

            if (existingRule.length > 0) {
                // Update existing rule with new values
                await db
                    .update(pointRules)
                    .set({
                        points: rule.points,
                        active: rule.active,
                        maxTimes: rule.maxTimes,
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(pointRules.key, rule.key));
                console.log(`🔄 Updated: Rule '${rule.key}' (${rule.points} points)`);
                updatedCount++;
                continue;
            }

            await db.insert(pointRules).values(rule);
            console.log(`✅ Inserted: Rule '${rule.key}' (${rule.points} points)`);
            insertedCount++;
        } catch (error) {
            console.error(`❌ Failed to process rule '${rule.key}':`, error);
        }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   Inserted: ${insertedCount} rules`);
    console.log(`   Updated: ${updatedCount} rules`);
    console.log(`   Total: ${rulesToSeed.length} rules processed`);
    console.log('\n✅ Point rules seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
});