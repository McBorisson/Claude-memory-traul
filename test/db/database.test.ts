import { describe, it, expect, beforeEach } from "bun:test";
import { TraulDB } from "../../src/db/database";

describe("TraulDB", () => {
  let db: TraulDB;

  beforeEach(() => {
    db = new TraulDB(":memory:");
  });

  describe("upsertMessage", () => {
    it("inserts a message", () => {
      db.upsertMessage({
        source: "slack",
        source_id: "C123:1234567890.123456",
        channel_name: "general",
        author_name: "alice",
        content: "Hello world",
        sent_at: 1700000000,
      });

      const stats = db.getStats();
      expect(stats.total_messages).toBe(1);
    });

    it("deduplicates on source+source_id", () => {
      const msg = {
        source: "slack",
        source_id: "C123:1234567890.123456",
        channel_name: "general",
        author_name: "alice",
        content: "Hello world",
        sent_at: 1700000000,
      };

      db.upsertMessage(msg);
      db.upsertMessage({ ...msg, content: "Updated content" });

      const stats = db.getStats();
      expect(stats.total_messages).toBe(1);
    });
  });

  describe("FTS5 search", () => {
    it("finds messages by content", () => {
      db.upsertMessage({
        source: "slack",
        source_id: "C1:1",
        channel_name: "eng",
        author_name: "bob",
        content: "The deployment pipeline is broken",
        sent_at: 1700000000,
      });
      db.upsertMessage({
        source: "slack",
        source_id: "C1:2",
        channel_name: "eng",
        author_name: "alice",
        content: "I fixed the bug in the login page",
        sent_at: 1700000001,
      });

      const results = db.searchMessages("deployment");
      expect(results.length).toBe(1);
      expect(results[0].content).toContain("deployment");
    });

    it("finds messages by author", () => {
      db.upsertMessage({
        source: "slack",
        source_id: "C1:1",
        channel_name: "eng",
        author_name: "bob",
        content: "Hello",
        sent_at: 1700000000,
      });

      const results = db.searchMessages("bob");
      expect(results.length).toBe(1);
    });

    it("filters by channel", () => {
      db.upsertMessage({
        source: "slack",
        source_id: "C1:1",
        channel_name: "eng",
        author_name: "bob",
        content: "deploy fix",
        sent_at: 1700000000,
      });
      db.upsertMessage({
        source: "slack",
        source_id: "C2:1",
        channel_name: "random",
        author_name: "alice",
        content: "deploy party",
        sent_at: 1700000001,
      });

      const results = db.searchMessages("deploy", { channel: "eng" });
      expect(results.length).toBe(1);
      expect(results[0].channel_name).toBe("eng");
    });

    it("respects limit", () => {
      for (let i = 0; i < 10; i++) {
        db.upsertMessage({
          source: "slack",
          source_id: `C1:${i}`,
          channel_name: "eng",
          author_name: "bob",
          content: `Message about testing number ${i}`,
          sent_at: 1700000000 + i,
        });
      }

      const results = db.searchMessages("testing", { limit: 3 });
      expect(results.length).toBe(3);
    });
  });

  describe("contacts", () => {
    it("creates and retrieves contacts", () => {
      const contactId = db.upsertContact("Alice");
      db.upsertContactIdentity({
        contactId,
        source: "slack",
        sourceUserId: "U123",
        username: "alice",
        displayName: "Alice",
      });

      const found = db.getContactBySourceId("slack", "U123");
      expect(found).not.toBeNull();
      expect(found!.display_name).toBe("Alice");
    });
  });

  describe("sync cursors", () => {
    it("stores and retrieves cursors", () => {
      db.setSyncCursor("slack", "channel:C123", "1700000000.000000");
      const cursor = db.getSyncCursor("slack", "channel:C123");
      expect(cursor).toBe("1700000000.000000");
    });

    it("returns null for missing cursor", () => {
      const cursor = db.getSyncCursor("slack", "nonexistent");
      expect(cursor).toBeNull();
    });
  });

  describe("signals", () => {
    it("inserts and retrieves signal results", () => {
      // Seed a definition
      db.db.run(
        `INSERT INTO signal_definitions (name, query, severity_expression)
         VALUES ('test-signal', 'SELECT 1', 'info')`
      );

      db.upsertMessage({
        source: "slack",
        source_id: "C1:1",
        channel_name: "eng",
        author_name: "bob",
        content: "test message",
        sent_at: 1700000000,
      });

      db.insertSignalResult({
        definitionId: 1,
        messageId: 1,
        severity: "warning",
        title: "Test signal fired",
        detail: "Something needs attention",
      });

      const results = db.getSignalResults();
      expect(results.length).toBe(1);
      expect(results[0].severity).toBe("warning");
      expect(results[0].title).toBe("Test signal fired");
    });

    it("dismisses signal results", () => {
      db.db.run(
        `INSERT INTO signal_definitions (name, query, severity_expression)
         VALUES ('test-signal', 'SELECT 1', 'info')`
      );

      db.insertSignalResult({
        definitionId: 1,
        messageId: null,
        severity: "info",
        title: "Dismiss me",
      });

      const before = db.getSignalResults();
      expect(before.length).toBe(1);

      db.dismissSignal(before[0].id);

      const after = db.getSignalResults();
      expect(after.length).toBe(0);
    });
  });

  describe("stats", () => {
    it("returns correct counts", () => {
      db.upsertMessage({
        source: "slack",
        source_id: "C1:1",
        channel_name: "eng",
        content: "msg1",
        sent_at: 1700000000,
      });
      db.upsertMessage({
        source: "slack",
        source_id: "C2:1",
        channel_name: "random",
        content: "msg2",
        sent_at: 1700000001,
      });
      db.upsertContact("Alice");

      const stats = db.getStats();
      expect(stats.total_messages).toBe(2);
      expect(stats.total_channels).toBe(2);
      expect(stats.total_contacts).toBe(1);
      expect(stats.active_signals).toBe(0);
    });
  });
});
