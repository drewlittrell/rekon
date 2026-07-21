export type AuditRecord = {
  action: string;
  subject: string;
  actorId: string;
};

export function createAuditRecord(
  action: string,
  subject: string,
  actorId: string,
): AuditRecord {
  return { action, subject, actorId };
}
