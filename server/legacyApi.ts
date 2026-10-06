import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Express, Request, Response } from "express";
import { and, desc, eq, gt, inArray, isNull, like, or } from "drizzle-orm";
import { appStates, channelMemberships, communityComments, communityItems, communityReactions, follows, groupMembers, groups, legacySessions, messages, notifications, userPresence, users } from "../drizzle/schema";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_STATE_BYTES = 2_000_000;

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

export function normalizeUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.name || user.username,
    name: user.name,
    status: user.status || "مرحباً، أنا أستخدم دردشتي",
    email: user.email,
    role: user.role,
  };
}

function directoryUser(user: typeof users.$inferSelect, isOnline: boolean) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.name || user.username,
    status: user.status || "مرحباً، أنا أستخدم دردشتي",
    isOnline,
  };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored || !stored.startsWith("scrypt$")) return false;
  const [, salt, hex] = stored.split("$");
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function tokenFromRequest(req: Request) {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const cookieHeader = req.header("cookie") || "";
  const cookie = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith("dardshti_session="));
  return cookie ? decodeURIComponent(cookie.slice("dardshti_session=".length)) : undefined;
}

async function getSessionUser(req: Request) {
  const token = tokenFromRequest(req);
  if (!token) return null;
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ session: legacySessions, user: users })
    .from(legacySessions)
    .innerJoin(users, eq(legacySessions.userId, users.id))
    .where(eq(legacySessions.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.session.expiresAt.getTime() <= Date.now()) {
    await db.delete(legacySessions).where(eq(legacySessions.token, token));
    return null;
  }
  return { token, user: row.user };
}

async function requireUser(req: Request, res: Response) {
  const session = await getSessionUser(req);
  if (!session) {
    sendError(res, 401, "يجب تسجيل الدخول أولاً");
    return null;
  }
  return session;
}

async function createSession(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const token = randomBytes(48).toString("base64url");
  await db.insert(legacySessions).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

function configureCors(req: Request, res: Response) {
  const origin = req.header("origin");
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  else res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
}

export function parseState(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json, "utf8") > MAX_STATE_BYTES) return null;
  return { json, value };
}

export function parsePayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json, "utf8") > 1_000_000) return null;
  return { json, value };
}

export function parseJson(value: string) {
  try { return JSON.parse(value); } catch { return {}; }
}

const ALLOWED_CHANNEL_IDS = new Set(["general", "sports", "friends", "fun", "akish", "saleh", "souq"]);

export function isAllowedChannelId(value: unknown) {
  return ALLOWED_CHANNEL_IDS.has(String(value ?? "").trim());
}

export function registerLegacyApi(app: Express) {
  app.use("/api/legacy", (req, res, next) => {
    configureCors(req, res);
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  });

  app.get("/api/health", async (_req, res) => {
    const db = await getDb();
    return res.json({ ok: true, service: "dardshti-backend", database: Boolean(db), time: new Date().toISOString() });
  });

  app.post("/api/legacy/auth/register", async (req, res) => {
    try {
      const username = normalizeUsername(req.body?.username);
      const displayName = String(req.body?.displayName ?? username).trim().slice(0, 160);
      const password = String(req.body?.password ?? "");
      if (!/^[a-zA-Z0-9_\u0600-\u06ff.-]{3,64}$/.test(username)) return sendError(res, 400, "اسم المستخدم غير صالح");
      if (password.length < 8) return sendError(res, 400, "كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      const db = await getDb();
      if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
      const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (existing.length) return sendError(res, 409, "اسم المستخدم مستخدم مسبقاً");
      const passwordHash = await hashPassword(password);
      await db.insert(users).values({
        openId: `legacy:${randomBytes(16).toString("hex")}`,
        username,
        passwordHash,
        name: displayName,
        displayName,
        status: "مرحباً، أنا أستخدم دردشتي",
        loginMethod: "password",
      });
      const created = await db.select().from(users).where(eq(users.username, username)).limit(1);
      const user = created[0];
      const token = await createSession(user.id);
      return res.status(201).json({ token, user: publicUser(user) });
    } catch (error) {
      console.error("[Legacy API] register failed", error);
      return sendError(res, 500, "تعذر إنشاء الحساب");
    }
  });

  app.post("/api/legacy/auth/login", async (req, res) => {
    try {
      const username = normalizeUsername(req.body?.username);
      const password = String(req.body?.password ?? "");
      const db = await getDb();
      if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
      const found = await db.select().from(users).where(eq(users.username, username)).limit(1);
      const user = found[0];
      if (!user || !(await verifyPassword(password, user.passwordHash))) return sendError(res, 401, "بيانات الدخول خاطئة");
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      const token = await createSession(user.id);
      return res.json({ token, user: publicUser(user) });
    } catch (error) {
      console.error("[Legacy API] login failed", error);
      return sendError(res, 500, "تعذر تسجيل الدخول");
    }
  });

  app.get("/api/legacy/auth/me", async (req, res) => {
    const session = await getSessionUser(req);
    if (!session) return sendError(res, 401, "الجلسة منتهية");
    return res.json({ user: publicUser(session.user) });
  });

  app.post("/api/legacy/auth/logout", async (req, res) => {
    const token = tokenFromRequest(req);
    const db = await getDb();
    if (token && db) {
      await db.delete(userPresence).where(eq(userPresence.sessionToken, token));
      await db.delete(legacySessions).where(eq(legacySessions.token, token));
    }
    return res.json({ ok: true });
  });

  app.get("/api/legacy/users", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const query = String(req.query.search ?? "").trim();
    const db = await getDb();
    if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
    const activeCutoff = new Date(Date.now() - 45_000);
    const activeRows = await db.select({ userId: userPresence.userId }).from(userPresence).where(gt(userPresence.lastSeenAt, activeCutoff));
    const onlineIds = new Set(activeRows.map(row => row.userId));
    const condition = query ? or(like(users.username, `%${query}%`), like(users.displayName, `%${query}%`)) : undefined;
    const onlineRows = onlineIds.size
      ? await db.select().from(users).where(condition ? and(inArray(users.id, Array.from(onlineIds)), condition) : inArray(users.id, Array.from(onlineIds)))
      : [];
    const directoryRows = condition
      ? await db.select().from(users).where(condition).limit(50)
      : await db.select().from(users).limit(50);
    const rows = Array.from(new Map([...onlineRows, ...directoryRows].map(user => [user.id, user])).values());
    return res.json({
      users: rows.filter(user => user.id !== session.user.id).map(user => directoryUser(user, onlineIds.has(user.id))),
      onlineCount: onlineIds.size,
    });
  });

  app.post("/api/legacy/presence/heartbeat", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
    await db.insert(userPresence).values({ sessionToken: session.token, userId: session.user.id, lastSeenAt: new Date() })
      .onDuplicateKeyUpdate({ set: { userId: session.user.id, lastSeenAt: new Date() } });
    return res.json({ ok: true, time: new Date().toISOString() });
  });

  app.get("/api/legacy/channels/:channelId/membership", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const channelId = String(req.params.channelId || "").trim();
    if (!isAllowedChannelId(channelId)) return sendError(res, 404, "القناة غير موجودة");
    const db = await getDb();
    if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
    const rows = await db.select().from(channelMemberships).where(and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.userId, session.user.id))).limit(1);
    return res.json({ joined: Boolean(rows[0]) });
  });

  app.post("/api/legacy/channels/:channelId/join", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const channelId = String(req.params.channelId || "").trim();
    if (!isAllowedChannelId(channelId)) return sendError(res, 404, "القناة غير موجودة");
    const db = await getDb();
    if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
    await db.insert(channelMemberships).values({ channelId, userId: session.user.id })
      .onDuplicateKeyUpdate({ set: { userId: session.user.id } });
    return res.json({ joined: true });
  });

  app.get("/api/legacy/state", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    const rows = await db!.select().from(appStates).where(eq(appStates.userId, session.user.id)).limit(1);
    let state: unknown = {};
    if (rows[0]) {
      try { state = JSON.parse(rows[0].stateJson); } catch { state = {}; }
    }
    return res.json({ state });
  });

  app.put("/api/legacy/state", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const parsed = parseState(req.body?.state);
    if (!parsed) return sendError(res, 400, "بيانات الحالة غير صالحة أو كبيرة جداً");
    const db = await getDb();
    await db!.insert(appStates).values({ userId: session.user.id, stateJson: parsed.json }).onDuplicateKeyUpdate({ set: { stateJson: parsed.json, updatedAt: new Date() } });
    return res.json({ ok: true });
  });

  app.get("/api/legacy/inbox/conversations", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
    // Read-only aggregation: return the latest direct-message row per correspondent.
    const rows = await db.select({ id: messages.id, senderId: messages.senderId, recipientId: messages.recipientId, text: messages.text, createdAt: messages.createdAt })
      .from(messages).where(and(isNull(messages.channelId), or(eq(messages.senderId, session.user.id), eq(messages.recipientId, session.user.id))))
      .orderBy(desc(messages.id)).limit(1000);
    const latestByPeer = new Map<number, (typeof rows)[number]>();
    for (const row of rows) {
      const peerId = row.senderId === session.user.id ? row.recipientId : row.senderId;
      if (peerId && !latestByPeer.has(peerId)) latestByPeer.set(peerId, row);
    }
    const peerIds = Array.from(latestByPeer.keys());
    const peers = peerIds.length ? await db.select({ id: users.id, username: users.username, name: users.name, displayName: users.displayName })
      .from(users).where(inArray(users.id, peerIds)) : [];
    const peerById = new Map(peers.map(peer => [peer.id, peer]));
    const conversations = Array.from(latestByPeer.entries()).map(([peerId, row]) => {
      const peer = peerById.get(peerId);
      return {
        username: peer?.username || "",
        name: peer?.displayName || peer?.name || peer?.username || "مستخدم",
        lastMessage: row.text || "رسالة مرفقة",
        lastMessageId: row.id,
        lastMessageAt: row.createdAt,
        sentByMe: row.senderId === session.user.id,
      };
    }).filter(conversation => conversation.username);
    return res.json({ conversations });
  });

  app.get("/api/legacy/messages", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    const channelId = String(req.query.channelId ?? "").trim();
    const username = normalizeUsername(req.query.username);
    const afterId = req.query.afterId === undefined ? 0 : Number(req.query.afterId);
    if (!Number.isSafeInteger(afterId) || afterId < 0) return sendError(res, 400, "معرف الرسالة غير صالح");
    let rows;
    if (channelId) {
      if (!isAllowedChannelId(channelId)) return sendError(res, 404, "القناة غير موجودة");
      const membership = await db!.select().from(channelMemberships).where(and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.userId, session.user.id))).limit(1);
      if (!membership[0]) return sendError(res, 403, "انضم إلى القناة أولاً");
      const condition = afterId ? and(eq(messages.channelId, channelId), gt(messages.id, afterId)) : eq(messages.channelId, channelId);
      rows = afterId
        ? await db!.select().from(messages).where(condition).orderBy(messages.id).limit(200)
        : (await db!.select().from(messages).where(condition).orderBy(desc(messages.id)).limit(200)).reverse();
    } else if (username) {
      const other = await db!.select().from(users).where(eq(users.username, username)).limit(1);
      if (!other[0]) return res.json({ messages: [] });
      const pair = or(and(eq(messages.senderId, session.user.id), eq(messages.recipientId, other[0].id)), and(eq(messages.senderId, other[0].id), eq(messages.recipientId, session.user.id)));
      const condition = afterId ? and(pair, gt(messages.id, afterId)) : pair;
      rows = afterId
        ? await db!.select().from(messages).where(condition).orderBy(messages.id).limit(200)
        : (await db!.select().from(messages).where(condition).orderBy(desc(messages.id)).limit(200)).reverse();
    } else {
      return sendError(res, 400, "حدد username أو channelId");
    }
    const senderIds = Array.from(new Set(rows.map(message => message.senderId)));
    const senderRows = senderIds.length
      ? await db!.select({ id: users.id, username: users.username, displayName: users.displayName, name: users.name }).from(users).where(inArray(users.id, senderIds))
      : [];
    const senders = new Map(senderRows.map(sender => [sender.id, sender.displayName || sender.name || sender.username || "مستخدم"]));
    const replyIds = Array.from(new Set(rows.map(message => message.replyToId).filter((id): id is number => Boolean(id))));
    const replyRows = replyIds.length ? await db!.select({ id: messages.id, text: messages.text }).from(messages).where(inArray(messages.id, replyIds)) : [];
    const replyTexts = new Map(replyRows.map(message => [message.id, message.text || ""]));
    return res.json({ messages: rows.map(message => ({ ...message, senderName: senders.get(message.senderId) || "مستخدم", replyToText: message.replyToId ? replyTexts.get(message.replyToId) || "" : "" })) });
  });

  app.post("/api/legacy/messages", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const text = String(req.body?.text ?? "").trim().slice(0, 5000);
    const imageUrl = req.body?.imageUrl ? String(req.body.imageUrl).slice(0, 3_000_000) : null;
    const channelId = req.body?.channelId ? String(req.body.channelId).trim().slice(0, 64) : null;
    const username = req.body?.username ? normalizeUsername(req.body.username) : "";
    const replyToId = req.body?.replyToId == null || req.body.replyToId === "" ? null : Number(req.body.replyToId);
    const clientMessageId = req.body?.clientMessageId == null ? null : String(req.body.clientMessageId).trim();
    if (!text && !imageUrl) return sendError(res, 400, "الرسالة فارغة");
    if (replyToId !== null && (!Number.isSafeInteger(replyToId) || replyToId <= 0)) return sendError(res, 400, "الرسالة المرجعية غير صالحة");
    if (clientMessageId !== null && !/^[A-Za-z0-9_-]{8,80}$/.test(clientMessageId)) return sendError(res, 400, "معرف الإرسال غير صالح");
    const db = await getDb();
    let recipientId: number | null = null;
    if (channelId) {
      if (!isAllowedChannelId(channelId)) return sendError(res, 404, "القناة غير موجودة");
      const membership = await db!.select().from(channelMemberships).where(and(eq(channelMemberships.channelId, channelId), eq(channelMemberships.userId, session.user.id))).limit(1);
      if (!membership[0]) return sendError(res, 403, "انضم إلى القناة أولاً");
    } else {
      const other = await db!.select().from(users).where(eq(users.username, username)).limit(1);
      if (!other[0]) return sendError(res, 404, "المستخدم غير موجود");
      recipientId = other[0].id;
    }
    if (clientMessageId) {
      const duplicate = await db!.select().from(messages).where(and(eq(messages.senderId, session.user.id), eq(messages.clientMessageId, clientMessageId))).limit(1);
      if (duplicate[0]) {
        if (duplicate[0].channelId !== channelId || duplicate[0].recipientId !== recipientId) return sendError(res, 409, "معرف الإرسال مستخدم لمحادثة أخرى");
        return res.status(200).json({ message: duplicate[0], duplicate: true });
      }
    }
    if (replyToId !== null) {
      const replyCondition = channelId
        ? and(eq(messages.id, replyToId), eq(messages.channelId, channelId))
        : and(eq(messages.id, replyToId), or(and(eq(messages.senderId, session.user.id), eq(messages.recipientId, recipientId!)), and(eq(messages.senderId, recipientId!), eq(messages.recipientId, session.user.id))));
      const replyTarget = await db!.select({ id: messages.id }).from(messages).where(replyCondition).limit(1);
      if (!replyTarget[0]) return sendError(res, 400, "الرسالة المراد الرد عليها غير موجودة في هذه المحادثة");
    }
    let insertResult: unknown;
    try {
      insertResult = await db!.insert(messages).values({ senderId: session.user.id, recipientId, channelId, text: text || null, imageUrl, replyToId, clientMessageId });
    } catch (error) {
      if (!clientMessageId) throw error;
      const raced = await db!.select().from(messages).where(and(eq(messages.senderId, session.user.id), eq(messages.clientMessageId, clientMessageId))).limit(1);
      if (!raced[0]) throw error;
      if (raced[0].channelId !== channelId || raced[0].recipientId !== recipientId) return sendError(res, 409, "معرف الإرسال مستخدم لمحادثة أخرى");
      return res.status(200).json({ message: raced[0], duplicate: true });
    }
    const resultHeader = Array.isArray(insertResult)
      ? (insertResult as unknown as [{ insertId?: number }])[0]
      : insertResult as unknown as { insertId?: number };
    const insertedId = Number(resultHeader.insertId || 0);
    const created = insertedId ? await db!.select().from(messages).where(eq(messages.id, insertedId)).limit(1) : [];
    return res.status(201).json({ message: created[0] || null });
  });

  app.patch("/api/legacy/messages/:id", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const id = Number(req.params.id);
    const text = String(req.body?.text ?? "").trim().slice(0, 5000);
    if (!Number.isInteger(id) || !text) return sendError(res, 400, "بيانات الرسالة غير صالحة");
    const db = await getDb();
    await db!.update(messages).set({ text, editedAt: new Date() }).where(and(eq(messages.id, id), eq(messages.senderId, session.user.id)));
    return res.json({ ok: true });
  });

  app.delete("/api/legacy/messages/:id", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const id = Number(req.params.id);
    const db = await getDb();
    await db!.update(messages).set({ deletedAt: new Date(), text: null, imageUrl: null }).where(and(eq(messages.id, id), eq(messages.senderId, session.user.id)));
    return res.json({ ok: true });
  });

  app.get("/api/legacy/content/:kind", async (req, res) => {
    const db = await getDb();
    if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
    const kind = String(req.params.kind).trim().slice(0, 40);
    const rows = await db.select().from(communityItems).where(and(eq(communityItems.kind, kind), eq(communityItems.status, "published"))).orderBy(desc(communityItems.createdAt)).limit(100);
    return res.json({ items: rows.map(item => ({ ...item, payload: parseJson(item.payloadJson) })) });
  });

  app.post("/api/legacy/content/:kind", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    const kind = String(req.params.kind).trim().slice(0, 40);
    const parsed = parsePayload(req.body?.payload || req.body);
    if (!parsed) return sendError(res, 400, "محتوى غير صالح أو كبير جداً");
    await db!.insert(communityItems).values({ kind, ownerId: session.user.id, payloadJson: parsed.json });
    const created = await db!.select().from(communityItems).where(and(eq(communityItems.ownerId, session.user.id), eq(communityItems.kind, kind))).orderBy(desc(communityItems.id)).limit(1);
    return res.status(201).json({ item: created[0] ? { ...created[0], payload: parseJson(created[0].payloadJson) } : null });
  });

  app.patch("/api/legacy/content/:id", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const id = Number(req.params.id);
    const db = await getDb();
    const existing = await db!.select().from(communityItems).where(eq(communityItems.id, id)).limit(1);
    if (!existing[0]) return sendError(res, 404, "المحتوى غير موجود");
    if (existing[0].ownerId !== session.user.id && session.user.role !== "admin") return sendError(res, 403, "لا تملك صلاحية تعديل هذا المحتوى");
    const parsed = parsePayload(req.body?.payload || req.body);
    if (!parsed) return sendError(res, 400, "محتوى غير صالح أو كبير جداً");
    await db!.update(communityItems).set({ payloadJson: parsed.json }).where(eq(communityItems.id, id));
    return res.json({ ok: true });
  });

  app.delete("/api/legacy/content/:id", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const id = Number(req.params.id);
    const db = await getDb();
    const existing = await db!.select().from(communityItems).where(eq(communityItems.id, id)).limit(1);
    if (!existing[0]) return res.json({ ok: true });
    if (existing[0].ownerId !== session.user.id && session.user.role !== "admin") return sendError(res, 403, "لا تملك صلاحية حذف هذا المحتوى");
    await db!.update(communityItems).set({ status: "deleted" }).where(eq(communityItems.id, id));
    return res.json({ ok: true });
  });

  app.get("/api/legacy/content/:id/comments", async (req, res) => {
    const db = await getDb();
    if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
    const itemId = Number(req.params.id);
    const rows = await db!.select().from(communityComments).where(eq(communityComments.itemId, itemId)).orderBy(communityComments.createdAt).limit(200);
    return res.json({ comments: rows });
  });

  app.post("/api/legacy/content/:id/comments", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const body = String(req.body?.body ?? "").trim().slice(0, 2000);
    const itemId = Number(req.params.id);
    if (!body || !Number.isInteger(itemId)) return sendError(res, 400, "التعليق غير صالح");
    const db = await getDb();
    await db!.insert(communityComments).values({ itemId, authorId: session.user.id, body });
    const item = await db!.select().from(communityItems).where(eq(communityItems.id, itemId)).limit(1);
    if (item[0] && item[0].ownerId !== session.user.id) await db!.insert(notifications).values({ userId: item[0].ownerId, type: "comment", title: "تعليق جديد", body });
    return res.status(201).json({ ok: true });
  });

  app.post("/api/legacy/content/:id/reactions", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const itemId = Number(req.params.id);
    const type = String(req.body?.type || "like").slice(0, 32);
    const db = await getDb();
    const existing = await db!.select().from(communityReactions).where(and(eq(communityReactions.itemId, itemId), eq(communityReactions.userId, session.user.id), eq(communityReactions.type, type))).limit(1);
    if (existing[0]) await db!.delete(communityReactions).where(and(eq(communityReactions.itemId, itemId), eq(communityReactions.userId, session.user.id), eq(communityReactions.type, type)));
    else await db!.insert(communityReactions).values({ itemId, userId: session.user.id, type });
    const count = await db!.select().from(communityReactions).where(and(eq(communityReactions.itemId, itemId), eq(communityReactions.type, type)));
    return res.json({ active: !existing[0], count: count.length });
  });

  app.get("/api/legacy/notifications", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    const rows = await db!.select().from(notifications).where(eq(notifications.userId, session.user.id)).orderBy(desc(notifications.createdAt)).limit(100);
    return res.json({ notifications: rows });
  });

  app.patch("/api/legacy/notifications/:id/read", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    await db!.update(notifications).set({ isRead: 1 }).where(and(eq(notifications.id, Number(req.params.id)), eq(notifications.userId, session.user.id)));
    return res.json({ ok: true });
  });

  app.get("/api/legacy/groups", async (_req, res) => {
    const db = await getDb();
    if (!db) return sendError(res, 503, "قاعدة البيانات غير متاحة");
    const rows = await db!.select().from(groups).orderBy(desc(groups.createdAt)).limit(100);
    return res.json({ groups: rows });
  });

  app.post("/api/legacy/groups", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const name = String(req.body?.name ?? "").trim().slice(0, 120);
    const description = String(req.body?.description ?? "").trim().slice(0, 2000) || null;
    const privacy = ["public", "private"].includes(String(req.body?.privacy)) ? String(req.body.privacy) : "public";
    if (name.length < 2) return sendError(res, 400, "اسم المجموعة قصير جداً");
    const db = await getDb();
    await db!.insert(groups).values({ ownerId: session.user.id, name, description, privacy });
    const created = await db!.select().from(groups).where(eq(groups.ownerId, session.user.id)).orderBy(desc(groups.id)).limit(1);
    if (created[0]) await db!.insert(groupMembers).values({ groupId: created[0].id, userId: session.user.id, role: "owner" });
    return res.status(201).json({ group: created[0] });
  });

  app.post("/api/legacy/groups/:id/join", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    const groupId = Number(req.params.id);
    const group = await db!.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group[0]) return sendError(res, 404, "المجموعة غير موجودة");
    const exists = await db!.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, session.user.id))).limit(1);
    if (!exists[0]) await db!.insert(groupMembers).values({ groupId, userId: session.user.id, role: "member" });
    return res.json({ ok: true });
  });

  app.delete("/api/legacy/groups/:id/leave", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    await db!.delete(groupMembers).where(and(eq(groupMembers.groupId, Number(req.params.id)), eq(groupMembers.userId, session.user.id)));
    return res.json({ ok: true });
  });

  app.post("/api/legacy/follow/:username", async (req, res) => {
    const session = await requireUser(req, res);
    if (!session) return;
    const db = await getDb();
    const target = await db!.select().from(users).where(eq(users.username, normalizeUsername(req.params.username))).limit(1);
    if (!target[0] || target[0].id === session.user.id) return sendError(res, 400, "المستخدم غير صالح");
    const existing = await db!.select().from(follows).where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, target[0].id))).limit(1);
    if (existing[0]) await db!.delete(follows).where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, target[0].id)));
    else {
      await db!.insert(follows).values({ followerId: session.user.id, followingId: target[0].id });
      await db!.insert(notifications).values({ userId: target[0].id, type: "follow", title: "متابع جديد", body: session.user.displayName || session.user.username || session.user.name || "مستخدم" });
    }
    return res.json({ following: !existing[0] });
  });
}
