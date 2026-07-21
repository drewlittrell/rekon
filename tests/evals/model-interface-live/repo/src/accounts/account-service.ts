import type { SecurityAudit } from "../audit/security-audit.ts";
import type { SessionRevoker } from "../auth/session-revoker.ts";
import type { AccountPolicy } from "./account-policy.ts";
import type { AccountRepository, StoredAccount } from "./account-repository.ts";

export class AccountService {
  private readonly repository: AccountRepository;
  private readonly policy: AccountPolicy;
  private readonly sessions: SessionRevoker;
  private readonly audit: SecurityAudit;

  constructor(
    repository: AccountRepository,
    policy: AccountPolicy,
    sessions: SessionRevoker,
    audit: SecurityAudit,
  ) {
    this.repository = repository;
    this.policy = policy;
    this.sessions = sessions;
    this.audit = audit;
  }

  async reactivate(accountId: string): Promise<StoredAccount> {
    const account = await this.repository.findById(accountId);
    if (!account) throw new Error("account-not-found");
    return this.repository.setStatus(account.id, "active");
  }
}
