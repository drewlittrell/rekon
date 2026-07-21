import type { StoredOrder, OrderRepository } from "./order-repository.ts";
import type { OrderPolicy } from "./order-policy.ts";

export class OrderService {
  private readonly repository: OrderRepository;
  private readonly policy: OrderPolicy;

  constructor(repository: OrderRepository, policy: OrderPolicy) {
    this.repository = repository;
    this.policy = policy;
  }

  async approve(actorId: string, orderId: string): Promise<StoredOrder> {
    const order = await this.repository.findById(orderId);
    if (!order) throw new Error("order-not-found");
    if (!this.policy.canReview(actorId, order)) throw new Error("not-authorized");
    return this.repository.setStatus(order.id, "approved");
  }

  async reject(actorId: string, orderId: string): Promise<StoredOrder> {
    const order = await this.repository.findById(orderId);
    if (!order) throw new Error("order-not-found");
    if (!this.policy.canReview(actorId, order)) throw new Error("not-authorized");
    return this.repository.setStatus(order.id, "rejected");
  }
}
