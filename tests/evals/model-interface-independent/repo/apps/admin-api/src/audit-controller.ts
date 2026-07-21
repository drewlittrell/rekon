import { emitAuditRecord } from "./audit-emitter.ts";

export function auditResponse(action: string, subject: string, actorId: string) {
  return { status: 202, body: emitAuditRecord(action, subject, actorId) };
}
