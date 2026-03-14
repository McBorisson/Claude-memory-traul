import { describe, it, expect } from "bun:test";
import { slackConnector } from "../../src/connectors/slack";

describe("Slack connector", () => {
  it("has correct name", () => {
    expect(slackConnector.name).toBe("slack");
  });

  it("throws when no token configured", async () => {
    const { TraulDB } = await import("../../src/db/database");
    const db = new TraulDB(":memory:");
    const config = {
      database: { path: ":memory:" },
      slack: { token: "", my_user_id: "", channels: [] },
    };

    await expect(slackConnector.sync(db, config)).rejects.toThrow(
      "Slack token not configured"
    );
    db.close();
  });
});
