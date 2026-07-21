import { createAuditRecord } from "../../../packages/audit-contracts/src/audit-record.ts";

export function emitAuditRecord(action: string, subject: string, actorId: string) {
  return createAuditRecord(action, subject, actorId);
}
