import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, longtext, index, primaryKey, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  displayName: varchar("displayName", { length: 160 }),
  status: varchar("status", { length: 255 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const legacySessions = mysqlTable("legacy_sessions", {
  token: varchar("token", { length: 128 }).primaryKey(),
  userId: int("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userIdx: index("legacy_sessions_user_idx").on(table.userId),
  expiryIdx: index("legacy_sessions_expiry_idx").on(table.expiresAt),
}));

export const userPresence = mysqlTable("user_presence", {
  sessionToken: varchar("sessionToken", { length: 128 }).primaryKey(),
  userId: int("userId").notNull(),
  lastSeenAt: timestamp("lastSeenAt").notNull().defaultNow(),
}, table => ({
  userIdx: index("user_presence_user_idx").on(table.userId),
  lastSeenIdx: index("user_presence_last_seen_idx").on(table.lastSeenAt),
}));

export const channelMemberships = mysqlTable("channel_memberships", {
  channelId: varchar("channelId", { length: 64 }).notNull(),
  userId: int("userId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.channelId, table.userId] }),
  userIdx: index("channel_memberships_user_idx").on(table.userId),
}));

export const appStates = mysqlTable("app_states", {
  userId: int("userId").primaryKey(),
  stateJson: longtext("stateJson").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId"),
  channelId: varchar("channelId", { length: 64 }),
  text: text("text"),
  imageUrl: longtext("imageUrl"),
  clientMessageId: varchar("clientMessageId", { length: 80 }),
  replyToId: int("replyToId"),
  editedAt: timestamp("editedAt"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  directIdx: index("messages_direct_idx").on(table.senderId, table.recipientId, table.createdAt),
  channelIdx: index("messages_channel_idx").on(table.channelId, table.createdAt),
  senderClientIdUnique: uniqueIndex("messages_sender_client_id_unique").on(table.senderId, table.clientMessageId),
}));

export type LegacySession = typeof legacySessions.$inferSelect;
export type AppState = typeof appStates.$inferSelect;
export type Message = typeof messages.$inferSelect;

export const communityItems = mysqlTable("community_items", {
  id: int("id").autoincrement().primaryKey(),
  kind: varchar("kind", { length: 40 }).notNull(),
  ownerId: int("ownerId").notNull(),
  payloadJson: longtext("payloadJson").notNull(),
  status: varchar("status", { length: 32 }).default("published").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  kindIdx: index("community_items_kind_idx").on(table.kind, table.status, table.createdAt),
  ownerIdx: index("community_items_owner_idx").on(table.ownerId, table.createdAt),
}));

export const communityComments = mysqlTable("community_comments", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  authorId: int("authorId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  itemIdx: index("community_comments_item_idx").on(table.itemId, table.createdAt),
}));

export const communityReactions = mysqlTable("community_reactions", {
  itemId: int("itemId").notNull(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 32 }).default("like").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.itemId, table.userId, table.type] }),
  itemIdx: index("community_reactions_item_idx").on(table.itemId),
}));

export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  privacy: varchar("privacy", { length: 20 }).default("public").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const groupMembers = mysqlTable("group_members", {
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.groupId, table.userId] }),
  userIdx: index("group_members_user_idx").on(table.userId),
}));

export const follows = mysqlTable("follows", {
  followerId: int("followerId").notNull(),
  followingId: int("followingId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.followerId, table.followingId] }),
}));

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body"),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userIdx: index("notifications_user_idx").on(table.userId, table.isRead, table.createdAt),
}));
