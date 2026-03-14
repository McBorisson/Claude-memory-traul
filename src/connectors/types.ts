import type { TraulDB } from "../db/database";
import type { TraulConfig } from "../lib/config";

export interface SyncResult {
  messagesAdded: number;
  messagesUpdated: number;
  contactsAdded: number;
}

export interface Connector {
  name: string;
  sync(db: TraulDB, config: TraulConfig): Promise<SyncResult>;
}
