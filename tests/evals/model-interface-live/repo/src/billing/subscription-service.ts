import type { BillingPolicy } from "./billing-policy.ts";
import type { StoredSubscription, SubscriptionRepository } from "./subscription-repository.ts";

export class SubscriptionService {
  private readonly repository: SubscriptionRepository;
  private readonly policy: BillingPolicy;

  constructor(repository: SubscriptionRepository, policy: BillingPolicy) {
    this.repository = repository;
    this.policy = policy;
  }

  async renew(actorId: string, subscriptionId: string): Promise<StoredSubscription> {
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription) throw new Error("subscription-not-found");
    if (!this.policy.canRenew(actorId, subscription)) throw new Error("not-authorized");
    return this.repository.setStatus(subscription.id, "active");
  }
}
