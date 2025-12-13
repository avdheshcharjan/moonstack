import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Profiles table - Core user identity (FID-first approach)
// Primary identifier: farcasterFid (required, unique)
// Wallet address is optional and can change
export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  farcasterFid: integer('farcaster_fid').notNull().unique(), // PRIMARY IDENTIFIER
  walletAddress: text('wallet_address'), // Optional, nullable
  ensName: text('ens_name'),
  baseName: text('base_name'),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  referralCode: text('referral_code').notNull().unique(),
  referredBy: integer('referred_by').references((): any => profiles.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Point rules table - Defines how points are earned
export const pointRules = sqliteTable('point_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  points: integer('points').notNull(),
  cooldownSeconds: integer('cooldown_seconds').notNull().default(0),
  maxTimes: integer('max_times'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Point events table - Append-only ledger
export const pointEvents = sqliteTable('point_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  ruleKey: text('rule_key').notNull(),
  delta: integer('delta').notNull(),
  sourceId: text('source_id').notNull(),
  evidence: text('evidence', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

// Scores table - Cached point totals
export const scores = sqliteTable('scores', {
  profileId: integer('profile_id').primaryKey().references(() => profiles.id),
  totalPoints: integer('total_points').notNull().default(0),
});

// Waitlist positions table
export const waitlistPositions = sqliteTable('waitlist_positions', {
  profileId: integer('profile_id').primaryKey().references(() => profiles.id),
  position: integer('position').notNull(),
});

// Referrals table - Track referral relationships
export const referrals = sqliteTable('referrals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  referrerId: integer('referrer_id').notNull().references(() => profiles.id),
  refereeId: integer('referee_id').notNull().references(() => profiles.id),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});