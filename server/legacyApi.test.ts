import { describe, expect, it } from "vitest";
import { hashPassword, isAllowedChannelId, normalizeUsername, parseJson, parsePayload, parseState, verifyPassword } from "./legacyApi";

describe("legacy backend security helpers", () => {
  it("normalizes usernames consistently", () => {
    expect(normalizeUsername("  Rashad_One  ")).toBe("rashad_one");
    expect(normalizeUsername(null)).toBe("");
  });

  it("accepts only known channel identifiers", () => {
    expect(isAllowedChannelId("general")).toBe(true);
    expect(isAllowedChannelId("souq")).toBe(true);
    expect(isAllowedChannelId("unknown-channel")).toBe(false);
    expect(isAllowedChannelId("general; DROP TABLE messages")).toBe(false);
  });

  it("hashes passwords and rejects wrong credentials", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(stored).toMatch(/^scrypt\$/);
    await expect(verifyPassword("correct horse battery staple", stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", stored)).resolves.toBe(false);
  });

  it("limits state to JSON objects and rejects oversized payloads", () => {
    expect(parseState({ chats: "[]" })?.json).toContain("chats");
    expect(parseState(["not", "an", "object"])).toBeNull();
    expect(parseState("not an object")).toBeNull();
    expect(parseState({ huge: "x".repeat(2_000_001) })).toBeNull();
  });

  it("accepts bounded feature payloads and safely parses stored JSON", () => {
    expect(parsePayload({ kind: "post", text: "hello" })?.value).toEqual({ kind: "post", text: "hello" });
    expect(parsePayload(null)).toBeNull();
    expect(parsePayload({ huge: "x".repeat(1_000_001) })).toBeNull();
    expect(parseJson('{"ok":true}')).toEqual({ ok: true });
    expect(parseJson("broken")).toEqual({});
  });
});
