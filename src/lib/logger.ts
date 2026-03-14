let verbose = false;

export function setVerbose(v: boolean): void {
  verbose = v;
}

export function debug(...args: unknown[]): void {
  if (verbose) {
    console.error("[DEBUG]", ...args);
  }
}

export function info(...args: unknown[]): void {
  console.log("[INFO]", ...args);
}

export function warn(...args: unknown[]): void {
  console.error("[WARN]", ...args);
}

export function error(...args: unknown[]): void {
  console.error("[ERROR]", ...args);
}
