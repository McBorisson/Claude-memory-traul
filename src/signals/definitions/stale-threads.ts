import type { BuiltinSignal } from "../types";

export const staleThreadsSignal: BuiltinSignal = {
  name: "stale-threads",
  description:
    "Threads you participated in that have had no reply for 3+ days",
  query: `
    SELECT
      parent.id AS message_id,
      CASE
        WHEN (unixepoch() - MAX(reply.sent_at)) > 14 * 86400 THEN 'urgent'
        WHEN (unixepoch() - MAX(reply.sent_at)) > 7 * 86400 THEN 'warning'
        ELSE 'info'
      END AS severity,
      'Stale thread in #' || parent.channel_name AS title,
      'Last reply ' || CAST(ROUND((unixepoch() - MAX(reply.sent_at)) / 86400.0) AS INTEGER) || ' days ago by ' || reply.author_name AS detail
    FROM messages parent
    JOIN messages reply ON reply.source = parent.source
      AND reply.thread_id = parent.source_id
    WHERE parent.thread_id IS NULL
      AND parent.source = 'slack'
      AND EXISTS (
        SELECT 1 FROM messages m2
        WHERE m2.thread_id = parent.source_id
          AND m2.source = parent.source
          AND m2.author_id = :my_user_id
      )
    GROUP BY parent.id
    HAVING (unixepoch() - MAX(reply.sent_at)) > 3 * 86400
  `,
  severity_expression: "dynamic",
};
