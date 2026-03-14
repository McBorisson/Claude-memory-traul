import type { MessageRow, SignalResultRow, Stats } from "../db/database";

function formatTimestamp(unixTs: number): string {
  return new Date(unixTs * 1000).toISOString().replace("T", " ").slice(0, 19);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

export function formatMessage(msg: MessageRow): string {
  const time = formatTimestamp(msg.sent_at);
  const channel = msg.channel_name ? `#${msg.channel_name}` : msg.source;
  const author = msg.author_name ?? "unknown";
  const content = truncate(msg.content.replace(/\n/g, " "), 120);
  return `${time}  ${channel}  ${author}: ${content}`;
}

export function formatSignal(signal: SignalResultRow): string {
  const time = formatTimestamp(signal.created_at);
  const severity = signal.severity.toUpperCase().padEnd(7);
  const lines = [`[${severity}] ${signal.title}  (${time})`];
  if (signal.detail) {
    lines.push(`         ${signal.detail}`);
  }
  if (signal.channel_name && signal.author_name) {
    const preview = signal.content
      ? truncate(signal.content.replace(/\n/g, " "), 80)
      : "";
    lines.push(
      `         #${signal.channel_name} — ${signal.author_name}: ${preview}`
    );
  }
  lines.push(`         ID: ${signal.id}`);
  return lines.join("\n");
}

export function formatStats(stats: Stats): string {
  return [
    `Messages: ${stats.total_messages}`,
    `Channels: ${stats.total_channels}`,
    `Contacts: ${stats.total_contacts}`,
    `Active signals: ${stats.active_signals}`,
  ].join("\n");
}

export function formatJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function formatVolume(
  volume: Array<{ day: string; count: number }>
): string {
  if (volume.length === 0) return "No message volume data.";
  const max = Math.max(...volume.map((v) => v.count));
  const barWidth = 30;
  return volume
    .map((v) => {
      const bar = "█".repeat(Math.round((v.count / max) * barWidth));
      return `${v.day}  ${bar} ${v.count}`;
    })
    .join("\n");
}
