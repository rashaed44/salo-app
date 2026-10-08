import type { Pool } from "pg";

const statements = [
  `DO $$ BEGIN CREATE TYPE "user_role" AS ENUM ('user', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE TABLE IF NOT EXISTS "users" ("id" serial PRIMARY KEY, "openId" varchar(64) NOT NULL UNIQUE, "name" text, "username" varchar(64) UNIQUE, "passwordHash" varchar(255), "displayName" varchar(160), "status" varchar(255), "email" varchar(320), "loginMethod" varchar(64), "role" "user_role" NOT NULL DEFAULT 'user', "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "lastSignedIn" timestamp NOT NULL DEFAULT now());`,
  `CREATE TABLE IF NOT EXISTS "legacy_sessions" ("token" varchar(128) PRIMARY KEY, "userId" integer NOT NULL, "expiresAt" timestamp NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now());`,
  `CREATE TABLE IF NOT EXISTS "user_presence" ("sessionToken" varchar(128) PRIMARY KEY, "userId" integer NOT NULL, "lastSeenAt" timestamp NOT NULL DEFAULT now());`,
  `CREATE TABLE IF NOT EXISTS "channel_memberships" ("channelId" varchar(64) NOT NULL, "userId" integer NOT NULL, "joinedAt" timestamp NOT NULL DEFAULT now(), PRIMARY KEY ("channelId", "userId"));`,
  `CREATE TABLE IF NOT EXISTS "app_states" ("userId" integer PRIMARY KEY, "stateJson" text NOT NULL, "updatedAt" timestamp NOT NULL DEFAULT now());`,
  `CREATE TABLE IF NOT EXISTS "messages" ("id" serial PRIMARY KEY, "senderId" integer NOT NULL, "recipientId" integer, "channelId" varchar(64), "text" text, "imageUrl" text, "clientMessageId" varchar(80), "replyToId" integer, "editedAt" timestamp, "deletedAt" timestamp, "createdAt" timestamp NOT NULL DEFAULT now());`,
  `CREATE TABLE IF NOT EXISTS "community_items" ("id" serial PRIMARY KEY, "kind" varchar(40) NOT NULL, "ownerId" integer NOT NULL, "payloadJson" text NOT NULL, "status" varchar(32) NOT NULL DEFAULT 'published', "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now());`,
  `CREATE TABLE IF NOT EXISTS "community_comments" ("id" serial PRIMARY KEY, "itemId" integer NOT NULL, "authorId" integer NOT NULL, "body" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now());`,
  `CREATE TABLE IF NOT EXISTS "community_reactions" ("itemId" integer NOT NULL, "userId" integer NOT NULL, "type" varchar(32) NOT NULL DEFAULT 'like', "createdAt" timestamp NOT NULL DEFAULT now(), PRIMARY KEY ("itemId", "userId", "type"));`,
  `CREATE TABLE IF NOT EXISTS "groups" ("id" serial PRIMARY KEY, "ownerId" integer NOT NULL, "name" varchar(120) NOT NULL, "description" text, "privacy" varchar(20) NOT NULL DEFAULT 'public', "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now());`,
  `CREATE TABLE IF NOT EXISTS "group_members" ("groupId" integer NOT NULL, "userId" integer NOT NULL, "role" varchar(20) NOT NULL DEFAULT 'member', "joinedAt" timestamp NOT NULL DEFAULT now(), PRIMARY KEY ("groupId", "userId"));`,
  `CREATE TABLE IF NOT EXISTS "follows" ("followerId" integer NOT NULL, "followingId" integer NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), PRIMARY KEY ("followerId", "followingId"));`,
  `CREATE TABLE IF NOT EXISTS "notifications" ("id" serial PRIMARY KEY, "userId" integer NOT NULL, "type" varchar(40) NOT NULL, "title" varchar(160) NOT NULL, "body" text, "isRead" integer NOT NULL DEFAULT 0, "createdAt" timestamp NOT NULL DEFAULT now());`,
  `CREATE OR REPLACE FUNCTION salo_set_updated_at() RETURNS trigger AS $$ BEGIN NEW."updatedAt" = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;`,
  `DROP TRIGGER IF EXISTS users_updated_at ON "users"; CREATE TRIGGER users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION salo_set_updated_at();`,
  `DROP TRIGGER IF EXISTS app_states_updated_at ON "app_states"; CREATE TRIGGER app_states_updated_at BEFORE UPDATE ON "app_states" FOR EACH ROW EXECUTE FUNCTION salo_set_updated_at();`,
  `DROP TRIGGER IF EXISTS community_items_updated_at ON "community_items"; CREATE TRIGGER community_items_updated_at BEFORE UPDATE ON "community_items" FOR EACH ROW EXECUTE FUNCTION salo_set_updated_at();`,
  `DROP TRIGGER IF EXISTS community_comments_updated_at ON "community_comments"; CREATE TRIGGER community_comments_updated_at BEFORE UPDATE ON "community_comments" FOR EACH ROW EXECUTE FUNCTION salo_set_updated_at();`,
  `DROP TRIGGER IF EXISTS groups_updated_at ON "groups"; CREATE TRIGGER groups_updated_at BEFORE UPDATE ON "groups" FOR EACH ROW EXECUTE FUNCTION salo_set_updated_at();`,
  `CREATE INDEX IF NOT EXISTS "legacy_sessions_user_idx" ON "legacy_sessions" ("userId");`,
  `CREATE INDEX IF NOT EXISTS "legacy_sessions_expiry_idx" ON "legacy_sessions" ("expiresAt");`,
  `CREATE INDEX IF NOT EXISTS "user_presence_user_idx" ON "user_presence" ("userId");`,
  `CREATE INDEX IF NOT EXISTS "user_presence_last_seen_idx" ON "user_presence" ("lastSeenAt");`,
  `CREATE INDEX IF NOT EXISTS "channel_memberships_user_idx" ON "channel_memberships" ("userId");`,
  `CREATE INDEX IF NOT EXISTS "messages_direct_idx" ON "messages" ("senderId", "recipientId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "messages_channel_idx" ON "messages" ("channelId", "createdAt");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "messages_sender_client_id_unique" ON "messages" ("senderId", "clientMessageId");`,
  `CREATE INDEX IF NOT EXISTS "community_items_kind_idx" ON "community_items" ("kind", "status", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "community_items_owner_idx" ON "community_items" ("ownerId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "community_comments_item_idx" ON "community_comments" ("itemId", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "community_reactions_item_idx" ON "community_reactions" ("itemId");`,
  `CREATE INDEX IF NOT EXISTS "group_members_user_idx" ON "group_members" ("userId");`,
  `CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("userId", "isRead", "createdAt");`,
];

export async function ensurePostgresSchema(pool: Pool) {
  for (const statement of statements) await pool.query(statement);
}
