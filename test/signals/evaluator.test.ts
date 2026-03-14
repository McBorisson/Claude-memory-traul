import { describe, it, expect, beforeEach } from "bun:test";
import { TraulDB } from "../../src/db/database";
import { seedSignalDefinitions, evaluateSignals } from "../../src/signals/evaluator";

describe("Signal Evaluator", () => {
  let db: TraulDB;

  beforeEach(() => {
    db = new TraulDB(":memory:");
  });

  it("seeds built-in signal definitions", () => {
    seedSignalDefinitions(db);
    const defs = db.getSignalDefinitions();
    expect(defs.length).toBeGreaterThanOrEqual(1);
    expect(defs.find((d) => d.name === "stale-threads")).toBeDefined();
  });

  it("seeding is idempotent", () => {
    seedSignalDefinitions(db);
    seedSignalDefinitions(db);
    const defs = db.getSignalDefinitions();
    const staleCount = defs.filter((d) => d.name === "stale-threads").length;
    expect(staleCount).toBe(1);
  });

  it("evaluates signals without crashing on empty db", () => {
    const config = {
      database: { path: ":memory:" },
      slack: { token: "", my_user_id: "U999", channels: [] },
    };

    const count = evaluateSignals(db, config);
    expect(count).toBe(0);
  });
});
