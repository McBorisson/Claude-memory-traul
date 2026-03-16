/** Per-source polling intervals in seconds. Keys are connector names. */
export type DaemonIntervals = Record<string, number>;

export interface DaemonConfig {
  port: number;
  intervals: DaemonIntervals;
}

export type SourceStatus = "idle" | "running" | "error";

export interface ProgressInfo {
  startedAt: string;       // ISO timestamp when task started
  progressPct: number;     // 0-100
  eta: string | null;      // ISO timestamp of estimated completion, null if unknown
}

export interface SourceState {
  lastRun: string | null;
  status: SourceStatus;
  lastError: string | null;
  backoffUntil: number | null;
  progress: ProgressInfo | null; // non-null only while status === "running"
}

export const DEFAULT_PORT = 3847;

/** Embed is a built-in task, not a connector — its default interval lives here */
export const DEFAULT_EMBED_INTERVAL = 300;

export const STAGGER_MS = 2000;
export const GRACEFUL_SHUTDOWN_MS = 10_000;
export const MAX_BACKOFF_S = 1800; // 30 minutes
