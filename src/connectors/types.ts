import type { TraulDB } from "../db/database";
import type { TraulConfig } from "../lib/config";

export interface SyncResult {
  messagesAdded: number;
  messagesUpdated: number;
  contactsAdded: number;
}

export interface Connector {
  /** Unique name used in config, CLI flags, and cursor keys (e.g. "slack", "claudecode") */
  name: string;

  /** Run incremental sync: fetch new data from the source and upsert into DB */
  sync(db: TraulDB, config: TraulConfig): Promise<SyncResult>;

  /** Default daemon polling interval in seconds (default: 300) */
  defaultInterval?: number;

  /** Return true if this connector has enough credentials/config to run */
  hasCredentials?: (config: TraulConfig) => boolean;
}
