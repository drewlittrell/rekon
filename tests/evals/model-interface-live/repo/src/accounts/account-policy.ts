import type { StoredAccount } from "./account-repository.ts";

export interface AccountPolicy {
  canSuspend(actorId: string, account: StoredAccount): boolean;
}
