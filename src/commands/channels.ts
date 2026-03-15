import type { TraulDB } from "../db/database";
import { formatJSON } from "../lib/formatter";

function formatDate(unixTs: number): string {
  return new Date(unixTs * 1000).toISOString().slice(0, 10);
}

export function runChannels(
  db: TraulDB,
  options: {
    source?: string;
    search?: string;
    json?: boolean;
  }
): void {
  const results = db.getChannels({
    source: options.source,
    search: options.search,
  });

  if (results.length === 0) {
    console.log("No channels found.");
    return;
  }

  if (options.json) {
    console.log(formatJSON(results));
  } else {
    for (const ch of results) {
      const source = ch.source.padEnd(12);
      const name = (ch.channel_name ?? "(unknown)").padEnd(30);
      const count = `${ch.msg_count} msgs`.padStart(10);
      const last = `last: ${formatDate(ch.last_message)}`;
      console.log(`${source}${name}${count}  ${last}`);
    }
  }
}
