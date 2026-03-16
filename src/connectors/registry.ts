import { readdirSync } from "fs";
import { join } from "path";
import type { Connector } from "./types";
import type { TraulConfig } from "../lib/config";

const SKIP_FILES = new Set(["types.ts", "registry.ts"]);
const connectorDir = join(import.meta.dir);

let _connectors: Connector[] | null = null;

/** Load all connectors from src/connectors/*.ts (excluding types.ts and registry.ts) */
export function getConnectors(): Connector[] {
  if (_connectors) return _connectors;

  _connectors = [];
  const files = readdirSync(connectorDir)
    .filter((f) => f.endsWith(".ts") && !SKIP_FILES.has(f))
    .sort();

  for (const file of files) {
    const mod = require(join(connectorDir, file));
    // Find the export that matches the Connector interface
    for (const key of Object.keys(mod)) {
      const val = mod[key];
      if (val && typeof val === "object" && typeof val.name === "string" && typeof val.sync === "function") {
        _connectors.push(val);
        break;
      }
    }
  }

  return _connectors;
}

/** Get a single connector by name */
export function getConnector(name: string): Connector | undefined {
  return getConnectors().find((c) => c.name === name);
}

/** Get all connector names */
export function getConnectorNames(): string[] {
  return getConnectors().map((c) => c.name);
}

/** Check which connectors have valid credentials */
export function getCredsStatus(config: TraulConfig): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const c of getConnectors()) {
    result[c.name] = c.hasCredentials ? c.hasCredentials(config) : true;
  }
  return result;
}

/** Get default interval for a connector (falls back to 300s) */
export function getDefaultInterval(name: string): number {
  const c = getConnector(name);
  return c?.defaultInterval ?? 300;
}
