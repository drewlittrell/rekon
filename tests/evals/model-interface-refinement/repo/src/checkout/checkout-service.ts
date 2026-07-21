import type { OrderRepository } from "./order-repository.ts";
import type { CheckoutChannel } from "../events/order-event.ts";
import { OrderEventPublisher } from "../events/order-event-publisher.ts";

export type CheckoutRequest = {
  orderId: string;
  userId: string;
  total: number;
  channel?: CheckoutChannel;
};

export class CheckoutService {
  private readonly repository: OrderRepository;
  private readonly publisher: OrderEventPublisher;

  constructor(
    repository: OrderRepository,
    publisher: OrderEventPublisher,
  ) {
    this.repository = repository;
    this.publisher = publisher;
  }

  async checkout(request: CheckoutRequest) {
    const order = await this.repository.create({
      id: request.orderId,
      userId: request.userId,
      total: request.total,
    });
    this.publisher.publishCreated({
      orderId: order.id,
      userId: order.userId,
      total: order.total,
    });
    return order;
  }
}
