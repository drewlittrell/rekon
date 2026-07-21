export type SecurityAuditEvent = {
  type: "account.suspended";
  actorId: string;
  accountId: string;
};

export interface SecurityAudit {
  record(event: SecurityAuditEvent): Promise<void>;
}
