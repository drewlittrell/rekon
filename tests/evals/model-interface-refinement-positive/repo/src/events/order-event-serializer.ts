import type { OrderCreatedEvent } from "./order-event.ts";

export function serializeOrderCreated(event: OrderCreatedEvent): Record<string, unknown> {
  return {
    orderId: event.orderId,
    userId: event.userId,
    total: event.total,
  };
}
