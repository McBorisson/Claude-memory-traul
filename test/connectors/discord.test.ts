import { describe, it, expect } from "bun:test";
import { loadConfig } from "../../src/lib/config";
import { discordConnector } from "../../src/connectors/discord";
import { TraulDB } from "../../src/db/database";

describe("Discord config", () => {
  it("loads DISCORD_TOKEN from env", () => {
    const orig = process.env.DISCORD_TOKEN;
    process.env.DISCORD_TOKEN = "test-token-123";
    const config = loadConfig();
    expect(config.discord.token).toBe("test-token-123");
    if (orig) {
      process.env.DISCORD_TOKEN = orig;
    } else {
      delete process.env.DISCORD_TOKEN;
    }
  });
});

describe("Discord connector", () => {
  it("has correct name", () => {
    expect(discordConnector.name).toBe("discord");
  });

  it("returns zero counts when no token configured", async () => {
    const db = new TraulDB(":memory:");
    const config = {
      sync_start: "",
      database: { path: ":memory:" },
      discord: {
        token: "",
        servers: { allowlist: [], stoplist: [] },
        channels: { allowlist: [], stoplist: [] },
      },
    };

    const result = await discordConnector.sync(db, config as any);
    expect(result.messagesAdded).toBe(0);
    expect(result.messagesUpdated).toBe(0);
    expect(result.contactsAdded).toBe(0);
    db.close();
  });
});
