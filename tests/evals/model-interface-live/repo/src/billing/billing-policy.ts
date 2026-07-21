import type { StoredSubscription } from "./subscription-repository.ts";

export interface BillingPolicy {
  canRenew(actorId: string, subscription: StoredSubscription): boolean;
}
