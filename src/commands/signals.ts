import type { TraulDB } from "../db/database";
import type { TraulConfig } from "../lib/config";
import { evaluateSignals } from "../signals/evaluator";
import { formatSignal, formatJSON } from "../lib/formatter";
import * as log from "../lib/logger";

export function runSignalsList(
  db: TraulDB,
  options: { json?: boolean }
): void {
  const results = db.getSignalResults();

  if (results.length === 0) {
    console.log("No active signals.");
    return;
  }

  if (options.json) {
    console.log(formatJSON(results));
  } else {
    for (const signal of results) {
      console.log(formatSignal(signal));
      console.log();
    }
  }
}

export function runSignalsEvaluate(db: TraulDB, config: TraulConfig): void {
  log.info("Evaluating signals...");
  const count = evaluateSignals(db, config);
  console.log(`${count} signal results generated.`);
}

export function runSignalsDismiss(db: TraulDB, id: string): void {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    log.error("Invalid signal ID");
    process.exit(1);
  }
  db.dismissSignal(numId);
  console.log(`Signal ${numId} dismissed.`);
}
