import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  displayName: varchar("displayName", { length: 160 }),
  status: varchar("status", { length: 255 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false })
    .defaultNow()
    .notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const legacySessions = pgTable(
  "legacy_sessions",
  {
    token: varchar("token", { length: 128 }).primaryKey(),
    userId: integer("userId").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: false }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  table => ({
    userIdx: index("legacy_sessions_user_idx").on(table.userId),
    expiryIdx: index("legacy_sessions_expiry_idx").on(table.expiresAt),
  })
);

export const userPresence = pgTable(
  "user_presence",
  {
    sessionToken: varchar("sessionToken", { length: 128 }).primaryKey(),
    userId: integer("userId").notNull(),
    lastSeenAt: timestamp("lastSeenAt", { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  table => ({
    userIdx: index("user_presence_user_idx").on(table.userId),
    lastSeenIdx: index("user_presence_last_seen_idx").on(table.lastSeenAt),
  })
);

export const channelMemberships = pgTable(
  "channel_memberships",
  {
    channelId: varchar("channelId", { length: 64 }).notNull(),
    userId: integer("userId").notNull(),
    joinedAt: timestamp("joinedAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.channelId, table.userId] }),
    userIdx: index("channel_memberships_user_idx").on(table.userId),
  })
);

export const appStates = pgTable("app_states", {
  userId: integer("userId").primaryKey(),
  stateJson: text("stateJson").notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("senderId").notNull(),
    recipientId: integer("recipientId"),
    channelId: varchar("channelId", { length: 64 }),
    text: text("text"),
    imageUrl: text("imageUrl"),
    clientMessageId: varchar("clientMessageId", { length: 80 }),
    replyToId: integer("replyToId"),
    editedAt: timestamp("editedAt", { withTimezone: false }),
    deletedAt: timestamp("deletedAt", { withTimezone: false }),
    createdAt: timestamp("createdAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  table => ({
    directIdx: index("messages_direct_idx").on(
      table.senderId,
      table.recipientId,
      table.createdAt
    ),
    channelIdx: index("messages_channel_idx").on(
      table.channelId,
      table.createdAt
    ),
    senderClientIdUnique: uniqueIndex("messages_sender_client_id_unique").on(
      table.senderId,
      table.clientMessageId
    ),
  })
);

export type LegacySession = typeof legacySessions.$inferSelect;
export type AppState = typeof appStates.$inferSelect;
export type Message = typeof messages.$inferSelect;

export const communityItems = pgTable(
  "community_items",
  {
    id: serial("id").primaryKey(),
    kind: varchar("kind", { length: 40 }).notNull(),
    ownerId: integer("ownerId").notNull(),
    payloadJson: text("payloadJson").notNull(),
    status: varchar("status", { length: 32 }).default("published").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  table => ({
    kindIdx: index("community_items_kind_idx").on(
      table.kind,
      table.status,
      table.createdAt
    ),
    ownerIdx: index("community_items_owner_idx").on(
      table.ownerId,
      table.createdAt
    ),
  })
);

export const communityComments = pgTable(
  "community_comments",
  {
    id: serial("id").primaryKey(),
    itemId: integer("itemId").notNull(),
    authorId: integer("authorId").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  table => ({
    itemIdx: index("community_comments_item_idx").on(
      table.itemId,
      table.createdAt
    ),
  })
);

export const communityReactions = pgTable(
  "community_reactions",
  {
    itemId: integer("itemId").notNull(),
    userId: integer("userId").notNull(),
    type: varchar("type", { length: 32 }).default("like").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.itemId, table.userId, table.type] }),
    itemIdx: index("community_reactions_item_idx").on(table.itemId),
  })
);

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  privacy: varchar("privacy", { length: 20 }).default("public").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: integer("groupId").notNull(),
    userId: integer("userId").notNull(),
    role: varchar("role", { length: 20 }).default("member").notNull(),
    joinedAt: timestamp("joinedAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.groupId, table.userId] }),
    userIdx: index("group_members_user_idx").on(table.userId),
  })
);

export const follows = pgTable(
  "follows",
  {
    followerId: integer("followerId").notNull(),
    followingId: integer("followingId").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  table => ({
    pk: primaryKey({ columns: [table.followerId, table.followingId] }),
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    type: varchar("type", { length: 40 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body"),
    isRead: integer("isRead").default(0).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  table => ({
    userIdx: index("notifications_user_idx").on(
      table.userId,
      table.isRead,
      table.createdAt
    ),
  })
);
