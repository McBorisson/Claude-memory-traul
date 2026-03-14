import type { TraulDB } from "../db/database";
import { formatStats, formatSignal, formatVolume } from "../lib/formatter";

export function runBriefing(db: TraulDB): void {
  const stats = db.getStats();
  const signals = db.getSignalResults();
  const volume = db.getMessageVolume(7);

  console.log("=== TRAUL BRIEFING ===");
  console.log();

  // Signals section
  if (signals.length > 0) {
    console.log(`--- Signals (${signals.length} active) ---`);
    for (const signal of signals.slice(0, 10)) {
      console.log(formatSignal(signal));
      console.log();
    }
    if (signals.length > 10) {
      console.log(`  ... and ${signals.length - 10} more`);
      console.log();
    }
  } else {
    console.log("--- Signals ---");
    console.log("No active signals.");
    console.log();
  }

  // Stats
  console.log("--- Stats ---");
  console.log(formatStats(stats));
  console.log();

  // Volume
  console.log("--- Message Volume (7 days) ---");
  console.log(formatVolume(volume));
}
