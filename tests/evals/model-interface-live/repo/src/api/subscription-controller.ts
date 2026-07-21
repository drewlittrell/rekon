import { SubscriptionService } from "../billing/subscription-service.ts";

export class SubscriptionController {
  private readonly subscriptions: SubscriptionService;

  constructor(subscriptions: SubscriptionService) {
    this.subscriptions = subscriptions;
  }

  async renew(request: { actorId: string; subscriptionId: string }): Promise<{ status: string }> {
    return this.subscriptions.renew(request.actorId, request.subscriptionId);
  }
}
