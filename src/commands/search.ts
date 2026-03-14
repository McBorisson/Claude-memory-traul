import type { TraulDB } from "../db/database";
import { formatMessage, formatJSON } from "../lib/formatter";

export function runSearch(
  db: TraulDB,
  query: string,
  options: {
    source?: string;
    channel?: string;
    after?: string;
    before?: string;
    limit?: string;
    json?: boolean;
  }
): void {
  const limit = options.limit ? parseInt(options.limit, 10) : 20;
  const after = options.after
    ? Math.floor(new Date(options.after).getTime() / 1000)
    : undefined;
  const before = options.before
    ? Math.floor(new Date(options.before).getTime() / 1000)
    : undefined;

  const results = db.searchMessages(query, {
    source: options.source,
    channel: options.channel,
    after,
    before,
    limit,
  });

  if (results.length === 0) {
    console.log("No results found.");
    return;
  }

  if (options.json) {
    console.log(formatJSON(results));
  } else {
    for (const msg of results) {
      console.log(formatMessage(msg));
    }
  }
}
