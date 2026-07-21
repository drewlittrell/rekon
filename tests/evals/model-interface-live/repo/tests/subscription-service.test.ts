import assert from "node:assert/strict";
import test from "node:test";

import type { BillingPolicy } from "../src/billing/billing-policy.ts";
import type { StoredSubscription, SubscriptionRepository } from "../src/billing/subscription-repository.ts";
import { SubscriptionService } from "../src/billing/subscription-service.ts";

test("renew authorizes and persists active status", async () => {
  const stored: StoredSubscription = { id: "subscription-1", status: "active" };
  const writes: string[] = [];
  const repository: SubscriptionRepository = {
    async findById() { return stored; },
    async setStatus(_subscriptionId, status) {
      writes.push(status);
      return { ...stored, status };
    },
  };
  const policy: BillingPolicy = { canRenew: () => true };
  const service = new SubscriptionService(repository, policy);

  assert.deepEqual(await service.renew("admin-1", stored.id), stored);
  assert.deepEqual(writes, ["active"]);
});
