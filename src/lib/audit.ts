/**
 * Structured audit log for sensitive operations.
 * MVP: console.log structured JSON. Production: ship to a log aggregator.
 * NEVER include token values — only user ID, action, and timestamp.
 */

type AuditEvent = {
  userId: string;
  action: string;
  purpose?: string;
  accountId?: string;
  ts: string;
};

export function auditLog(event: AuditEvent) {
  console.log(JSON.stringify({ audit: true, ...event }));
}
