import type { TraulDB } from "../db/database";
import type { TraulConfig } from "../lib/config";
import type { SignalMatch } from "./types";
import { staleThreadsSignal } from "./definitions/stale-threads";
import * as log from "../lib/logger";

const BUILTIN_SIGNALS = [staleThreadsSignal];

export function seedSignalDefinitions(db: TraulDB): void {
  const existing = db.getSignalDefinitions();
  const existingNames = new Set(existing.map((d) => d.name));

  for (const signal of BUILTIN_SIGNALS) {
    if (!existingNames.has(signal.name)) {
      db.db.run(
        `INSERT INTO signal_definitions (name, description, query, severity_expression)
         VALUES (?, ?, ?, ?)`,
        [signal.name, signal.description, signal.query, signal.severity_expression]
      );
      log.info(`Seeded signal definition: ${signal.name}`);
    }
  }
}

export function evaluateSignals(db: TraulDB, config: TraulConfig): number {
  seedSignalDefinitions(db);
  const definitions = db.getSignalDefinitions();
  let totalResults = 0;

  for (const def of definitions) {
    log.debug(`Evaluating signal: ${def.name}`);

    try {
      // Replace :my_user_id placeholder
      const query = def.query.replace(
        /:my_user_id/g,
        `'${config.slack.my_user_id}'`
      );

      const rows = db.db
        .query<SignalMatch, []>(query)
        .all();

      for (const row of rows) {
        db.insertSignalResult({
          definitionId: def.id,
          messageId: row.message_id,
          severity: row.severity || "info",
          title: row.title,
          detail: row.detail,
        });
        totalResults++;
      }

      log.info(`  ${def.name}: ${rows.length} results`);
    } catch (err) {
      log.error(`Signal evaluation failed for ${def.name}:`, err);
    }
  }

  return totalResults;
}
