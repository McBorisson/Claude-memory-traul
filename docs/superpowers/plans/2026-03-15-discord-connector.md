# Discord Connector Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Discord connector that syncs server channels, DMs, group DMs, and threads using Discord's REST API with a user token.

**Architecture:** Single connector file using direct `fetch()` calls to Discord REST API v9. Rate limiting via response headers + floor delay. Follows existing connector patterns (sync cursors, contact resolution, upsertMessage).

**Tech Stack:** Bun fetch (no external dependencies), Discord REST API v9, bun:test

**Spec:** `docs/superpowers/specs/2026-03-15-discord-connector-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/connectors/discord.ts` | Discord connector — API calls, sync logic, rate limiting |
| `src/lib/config.ts` | Add Discord config type + env var loading (modify) |
| `src/commands/sync.ts` | Register Discord connector (modify) |
| `test/connectors/discord.test.ts` | Unit tests for Discord connector |

---

## Task 1: Add Discord config type and loading

**Files:**
- Modify: `src/lib/config.ts`

- [ ] **Step 1: Write the failing test**

Create `test/connectors/discord.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/connectors/discord.test.ts`
Expected: FAIL — `discord` property does not exist on TraulConfig

- [ ] **Step 3: Add Discord config type and loading to config.ts**

In `src/lib/config.ts`, add to `TraulConfig` interface:

```typescript
discord: {
  token: string;
  servers: {
    allowlist: string[];
    stoplist: string[];
  };
  channels: {
    allowlist: string[];
    stoplist: string[];
  };
};
```

In `getDefaultConfig()`, add:

```typescript
discord: {
  token: "",
  servers: { allowlist: [], stoplist: [] },
  channels: { allowlist: [], stoplist: [] },
},
```

In `loadConfig()`, add config file parsing after the WhatsApp section:

```typescript
// Discord
defaults.discord.token = parsed.discord?.token ?? defaults.discord.token;
defaults.discord.servers.allowlist = parsed.discord?.servers?.allowlist ?? defaults.discord.servers.allowlist;
defaults.discord.servers.stoplist = parsed.discord?.servers?.stoplist ?? defaults.discord.servers.stoplist;
defaults.discord.channels.allowlist = parsed.discord?.channels?.allowlist ?? defaults.discord.channels.allowlist;
defaults.discord.channels.stoplist = parsed.discord?.channels?.stoplist ?? defaults.discord.channels.stoplist;
```

In env var overrides section, add:

```typescript
defaults.discord.token = process.env.DISCORD_TOKEN ?? defaults.discord.token;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test test/connectors/discord.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/config.ts test/connectors/discord.test.ts
git commit -m "feat: add Discord config type and env var loading"
```

---

## Task 2: Create Discord connector skeleton with no-token guard

**Files:**
- Create: `src/connectors/discord.ts`
- Modify: `src/commands/sync.ts`
- Test: `test/connectors/discord.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `test/connectors/discord.test.ts`:

```typescript
import { discordConnector } from "../../src/connectors/discord";
import { TraulDB } from "../../src/db/database";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/connectors/discord.test.ts`
Expected: FAIL — cannot find module `../../src/connectors/discord`

- [ ] **Step 3: Create Discord connector skeleton**

Create `src/connectors/discord.ts`:

```typescript
import type { Connector, SyncResult } from "./types";
import type { TraulDB } from "../db/database";
import { type TraulConfig, getSyncStartTimestamp } from "../lib/config";
import * as log from "../lib/logger";

const BASE_URL = "https://discord.com/api/v9";
const DISCORD_EPOCH = 1420070400000n;
const FLOOR_DELAY_MS = 100;
const MAX_RETRIES = 5;

function dateToSnowflake(date: Date): string {
  const ms = BigInt(date.getTime());
  return String((ms - DISCORD_EPOCH) << 22n);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function discordFetch(
  path: string,
  token: string,
  params?: Record<string, string>
): Promise<Response> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  let retries = 0;
  while (true) {
    await sleep(FLOOR_DELAY_MS);

    const resp = await fetch(url.toString(), {
      headers: { Authorization: token },
    });

    if (resp.status === 429) {
      if (retries >= MAX_RETRIES) {
        throw new Error(`Rate limited after ${MAX_RETRIES} retries: ${path}`);
      }
      const retryAfter = parseFloat(resp.headers.get("Retry-After") ?? "1");
      log.warn(`Rate limited on ${path}, waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      retries++;
      continue;
    }

    // Proactive rate limit handling
    const remaining = resp.headers.get("X-RateLimit-Remaining");
    const resetAfter = resp.headers.get("X-RateLimit-Reset-After");
    if (remaining === "0" && resetAfter) {
      await sleep(parseFloat(resetAfter) * 1000);
    }

    return resp;
  }
}

export const discordConnector: Connector = {
  name: "discord",

  async sync(db: TraulDB, config: TraulConfig): Promise<SyncResult> {
    if (!config.discord.token) {
      log.warn("Discord token not configured.");
      log.warn("Set DISCORD_TOKEN env var, or add discord.token to ~/.config/traul/config.json");
      return { messagesAdded: 0, messagesUpdated: 0, contactsAdded: 0 };
    }

    const token = config.discord.token;
    const result: SyncResult = { messagesAdded: 0, messagesUpdated: 0, contactsAdded: 0 };

    // Contact cache to avoid redundant lookups
    const contactCache = new Map<string, string>();

    function resolveContact(author: { id: string; username: string; global_name?: string }): string {
      const cached = contactCache.get(author.id);
      if (cached) return cached;

      const displayName = author.global_name || author.username;
      contactCache.set(author.id, displayName);

      const existing = db.getContactBySourceId("discord", author.id);
      if (!existing) {
        const contactId = db.upsertContact(displayName);
        db.upsertContactIdentity({
          contactId,
          source: "discord",
          sourceUserId: author.id,
          username: author.username,
          displayName,
        });
        result.contactsAdded++;
      }

      return displayName;
    }

    // --- Fetch guilds ---
    let guilds: Array<{ id: string; name: string }> = [];
    let afterGuild = "0";
    while (true) {
      const resp = await discordFetch("/users/@me/guilds", token, {
        limit: "200",
        after: afterGuild,
      });
      if (!resp.ok) {
        log.error(`Failed to fetch guilds: ${resp.status}`);
        break;
      }
      const page: Array<{ id: string; name: string }> = await resp.json();
      if (page.length === 0) break;
      guilds.push(...page);
      afterGuild = page[page.length - 1].id;
      if (page.length < 200) break;
    }

    // Apply server filters
    const { servers, channels: channelFilters } = config.discord;
    if (servers.allowlist.length > 0) {
      guilds = guilds.filter((g) => servers.allowlist.includes(g.id));
    }
    if (servers.stoplist.length > 0) {
      guilds = guilds.filter((g) => !servers.stoplist.includes(g.id));
    }

    log.info(`Found ${guilds.length} servers to sync`);

    // --- Fetch channels per guild ---
    interface ChannelInfo {
      id: string;
      name: string;
      type: number;
      parent_id?: string;
      guildName?: string;
      recipients?: Array<{ id: string; username: string; global_name?: string }>;
    }

    const allChannels: ChannelInfo[] = [];
    const guildNameMap = new Map<string, string>();

    for (const guild of guilds) {
      guildNameMap.set(guild.id, guild.name);
      const resp = await discordFetch(`/guilds/${guild.id}/channels`, token);
      if (!resp.ok) {
        if (resp.status === 403 || resp.status === 401) {
          log.warn(`  No access to ${guild.name}, skipping`);
          continue;
        }
        log.error(`Failed to fetch channels for ${guild.name}: ${resp.status}`);
        continue;
      }
      const channels: ChannelInfo[] = await resp.json();
      // Text channels (0), announcement (5), active threads (11, 12)
      const textChannels = channels.filter((c) => [0, 5, 11, 12].includes(c.type));
      for (const ch of textChannels) {
        ch.guildName = guild.name;
      }
      allChannels.push(...textChannels);

      // Fetch archived threads for each text channel
      for (const ch of channels.filter((c) => [0, 5].includes(c.type))) {
        for (const endpoint of [
          `/channels/${ch.id}/threads/archived/public`,
          `/channels/${ch.id}/threads/archived/private`,
        ]) {
          const threadResp = await discordFetch(endpoint, token);
          if (!threadResp.ok) continue;
          const threadData: { threads?: ChannelInfo[] } = await threadResp.json();
          for (const t of threadData.threads ?? []) {
            t.guildName = guild.name;
            allChannels.push(t);
          }
        }
      }
    }

    // --- Fetch DM channels ---
    const dmResp = await discordFetch("/users/@me/channels", token);
    if (dmResp.ok) {
      const dmChannels: ChannelInfo[] = await dmResp.json();
      allChannels.push(...dmChannels);
    }

    // Apply channel filters
    let filteredChannels = allChannels;
    if (channelFilters.allowlist.length > 0) {
      filteredChannels = filteredChannels.filter((c) => channelFilters.allowlist.includes(c.id));
    }
    if (channelFilters.stoplist.length > 0) {
      filteredChannels = filteredChannels.filter((c) => !channelFilters.stoplist.includes(c.id));
    }

    log.info(`Syncing ${filteredChannels.length} channels...`);

    // --- Compute initial snowflake from sync_start ---
    const syncStartTs = getSyncStartTimestamp(config);
    const initialSnowflake = dateToSnowflake(new Date(parseInt(syncStartTs) * 1000));

    // --- Sync messages per channel ---
    for (const channel of filteredChannels) {
      // Build channel name
      let channelName: string;
      if (channel.type === 1) {
        // DM
        const recipient = channel.recipients?.[0];
        channelName = `DM/${recipient?.global_name || recipient?.username || channel.id}`;
      } else if (channel.type === 3) {
        // Group DM
        const names = (channel.recipients ?? [])
          .map((r) => r.global_name || r.username)
          .join(", ");
        channelName = `GroupDM/${names || channel.id}`;
      } else {
        // Server channel or thread
        channelName = `${channel.guildName}/${channel.name}`;
      }

      log.info(`  ${channelName}`);

      const cursorKey = `channel:${channel.id}`;
      const cursor = db.getSyncCursor("discord", cursorKey) ?? initialSnowflake;
      let latestId = cursor;
      let channelMsgCount = 0;
      let afterMsg = cursor;

      // Paginate forward using after=
      while (true) {
        const resp = await discordFetch(`/channels/${channel.id}/messages`, token, {
          limit: "100",
          after: afterMsg,
        });

        if (!resp.ok) {
          if (resp.status === 403 || resp.status === 401) {
            log.warn(`    No access, skipping`);
          } else {
            log.warn(`    Failed to fetch messages: ${resp.status}`);
          }
          break;
        }

        const messages: Array<{
          id: string;
          type: number;
          content: string;
          author: { id: string; username: string; global_name?: string };
          timestamp: string;
          attachments?: Array<{ filename: string }>;
          embeds?: Array<{ title?: string }>;
          thread?: { id: string };
          message_reference?: { message_id?: string };
        }> = await resp.json();

        if (messages.length === 0) break;

        // Discord returns newest first, reverse for chronological processing
        messages.reverse();

        for (const msg of messages) {
          // Skip non-default and non-reply types
          if (msg.type !== 0 && msg.type !== 19) continue;

          // Build content
          let content = msg.content;
          if (!content) {
            const parts: string[] = [];
            for (const att of msg.attachments ?? []) {
              parts.push(`[attachment: ${att.filename}]`);
            }
            for (const emb of msg.embeds ?? []) {
              if (emb.title) parts.push(`[embed: ${emb.title}]`);
            }
            content = parts.join(" ");
          }
          if (!content) continue;

          const displayName = resolveContact(msg.author);

          // Determine thread_id: if this channel is a thread (type 11/12),
          // use the thread channel ID as thread_id so all messages in the
          // thread are grouped. The channel_name stays as the parent channel
          // name, and thread_id distinguishes thread messages from main channel.
          let threadId: string | undefined;
          if (channel.type === 11 || channel.type === 12) {
            threadId = channel.id;
          }

          db.upsertMessage({
            source: "discord",
            source_id: `${channel.id}:${msg.id}`,
            channel_id: channel.id,
            channel_name: channelName,
            thread_id: threadId,
            author_id: msg.author.id,
            author_name: displayName,
            content,
            sent_at: Math.floor(new Date(msg.timestamp).getTime() / 1000),
          });
          channelMsgCount++;

          if (BigInt(msg.id) > BigInt(latestId)) {
            latestId = msg.id;
          }
        }

        afterMsg = messages[messages.length - 1].id;
        if (messages.length < 100) break;
      }

      if (latestId !== cursor) {
        db.setSyncCursor("discord", cursorKey, latestId);
      }
      result.messagesAdded += channelMsgCount;
      if (channelMsgCount > 0) {
        log.info(`    ${channelMsgCount} messages`);
      }
    }

    return result;
  },
};
```

- [ ] **Step 4: Register connector in sync.ts**

In `src/commands/sync.ts`, add import:

```typescript
import { discordConnector } from "../connectors/discord";
```

Add `discordConnector` to the `connectors` array.

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test test/connectors/discord.test.ts`
Expected: PASS

- [ ] **Step 6: Run all tests to verify no regressions**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/connectors/discord.ts src/commands/sync.ts test/connectors/discord.test.ts
git commit -m "feat: add Discord connector with user token auth"
```

---

## Task 3: Test filtering logic

**Files:**
- Test: `test/connectors/discord.test.ts`

- [ ] **Step 1: Add filtering helper tests**

The filtering logic is inline in the sync method. To test it without hitting the API, extract the filtering into a testable helper. Add to `src/connectors/discord.ts` (exported for testing):

```typescript
export function filterGuilds(
  guilds: Array<{ id: string; name: string }>,
  servers: { allowlist: string[]; stoplist: string[] }
): Array<{ id: string; name: string }> {
  let filtered = guilds;
  if (servers.allowlist.length > 0) {
    filtered = filtered.filter((g) => servers.allowlist.includes(g.id));
  }
  if (servers.stoplist.length > 0) {
    filtered = filtered.filter((g) => !servers.stoplist.includes(g.id));
  }
  return filtered;
}

export function filterChannels(
  channels: Array<{ id: string }>,
  filters: { allowlist: string[]; stoplist: string[] }
): Array<{ id: string }> {
  let filtered = channels;
  if (filters.allowlist.length > 0) {
    filtered = filtered.filter((c) => filters.allowlist.includes(c.id));
  }
  if (filters.stoplist.length > 0) {
    filtered = filtered.filter((c) => !filters.stoplist.includes(c.id));
  }
  return filtered;
}
```

Then use these helpers in the sync method instead of inline filtering.

Add tests in `test/connectors/discord.test.ts`:

```typescript
import { filterGuilds, filterChannels } from "../../src/connectors/discord";

describe("Discord filtering", () => {
  const guilds = [
    { id: "1", name: "Server A" },
    { id: "2", name: "Server B" },
    { id: "3", name: "Server C" },
  ];

  it("returns all guilds when no filters set", () => {
    const result = filterGuilds(guilds, { allowlist: [], stoplist: [] });
    expect(result).toHaveLength(3);
  });

  it("filters guilds by allowlist", () => {
    const result = filterGuilds(guilds, { allowlist: ["1", "3"], stoplist: [] });
    expect(result.map((g) => g.id)).toEqual(["1", "3"]);
  });

  it("filters guilds by stoplist", () => {
    const result = filterGuilds(guilds, { allowlist: [], stoplist: ["2"] });
    expect(result.map((g) => g.id)).toEqual(["1", "3"]);
  });

  it("applies allowlist then stoplist", () => {
    const result = filterGuilds(guilds, { allowlist: ["1", "2"], stoplist: ["2"] });
    expect(result.map((g) => g.id)).toEqual(["1"]);
  });

  it("filters channels by allowlist", () => {
    const channels = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const result = filterChannels(channels, { allowlist: ["a"], stoplist: [] });
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("filters channels by stoplist", () => {
    const channels = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const result = filterChannels(channels, { allowlist: [], stoplist: ["b"] });
    expect(result.map((c) => c.id)).toEqual(["a", "c"]);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `bun test test/connectors/discord.test.ts`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/connectors/discord.ts test/connectors/discord.test.ts
git commit -m "feat: extract and test Discord filtering helpers"
```

---

## Task 4: Test snowflake conversion and content building

**Files:**
- Test: `test/connectors/discord.test.ts`

- [ ] **Step 1: Export dateToSnowflake and buildContent, add tests**

Export `dateToSnowflake` and extract content building into an exported `buildContent` helper in `src/connectors/discord.ts`:

```typescript
export function buildContent(msg: {
  content: string;
  attachments?: Array<{ filename: string }>;
  embeds?: Array<{ title?: string }>;
}): string {
  if (msg.content) return msg.content;
  const parts: string[] = [];
  for (const att of msg.attachments ?? []) {
    parts.push(`[attachment: ${att.filename}]`);
  }
  for (const emb of msg.embeds ?? []) {
    if (emb.title) parts.push(`[embed: ${emb.title}]`);
  }
  return parts.join(" ");
}
```

Then use `buildContent(msg)` in the sync loop instead of the inline logic.

Add tests:

```typescript
import { dateToSnowflake, buildContent } from "../../src/connectors/discord";

describe("Discord snowflake conversion", () => {
  it("converts epoch to snowflake 0", () => {
    const result = dateToSnowflake(new Date("2015-01-01T00:00:00.000Z"));
    expect(result).toBe("0");
  });

  it("converts a known date to correct snowflake", () => {
    const date = new Date("2025-01-01T00:00:00.000Z");
    const expected = String((BigInt(date.getTime()) - 1420070400000n) << 22n);
    expect(dateToSnowflake(date)).toBe(expected);
  });
});

describe("Discord content building", () => {
  it("returns content when present", () => {
    expect(buildContent({ content: "hello" })).toBe("hello");
  });

  it("falls back to attachment filenames", () => {
    expect(buildContent({
      content: "",
      attachments: [{ filename: "image.png" }],
    })).toBe("[attachment: image.png]");
  });

  it("falls back to embed titles", () => {
    expect(buildContent({
      content: "",
      embeds: [{ title: "Article" }],
    })).toBe("[embed: Article]");
  });

  it("combines attachments and embeds", () => {
    expect(buildContent({
      content: "",
      attachments: [{ filename: "doc.pdf" }],
      embeds: [{ title: "Link Preview" }],
    })).toBe("[attachment: doc.pdf] [embed: Link Preview]");
  });

  it("returns empty string when no content, attachments, or embeds", () => {
    expect(buildContent({ content: "" })).toBe("");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `bun test test/connectors/discord.test.ts`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/connectors/discord.ts test/connectors/discord.test.ts
git commit -m "test: snowflake conversion and content building helpers"
```

---

## Task 5: End-to-end verification

- [ ] **Step 1: Run full test suite**

Run: `bun test`
Expected: All tests pass, no regressions

- [ ] **Step 2: Type check**

Run: `bun build src/index.ts --outdir /dev/null`
Expected: No type errors (project uses Bun for type checking per CLAUDE.md)

- [ ] **Step 3: Manual smoke test (if DISCORD_TOKEN available)**

Run: `bun run src/index.ts sync discord`
Expected: Either syncs messages or shows "Discord token not configured" warning

- [ ] **Step 4: Final commit if any fixes needed**

Stage only the specific files that needed fixes, then commit:

```bash
git commit -m "fix: address issues found during e2e verification"
```
