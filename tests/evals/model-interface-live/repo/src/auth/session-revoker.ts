export interface SessionRevoker {
  revokeForAccount(accountId: string): Promise<void>;
}
