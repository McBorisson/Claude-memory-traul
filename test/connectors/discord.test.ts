import { describe, it, expect } from "bun:test";
import { loadConfig } from "../../src/lib/config";

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
