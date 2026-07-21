import type { OrderCreatedEvent } from "./order-event.ts";
import { serializeOrderCreated } from "./order-event-serializer.ts";

export class OrderEventPublisher {
  readonly published: Record<string, unknown>[] = [];

  publishCreated(event: OrderCreatedEvent): Record<string, unknown> {
    const payload = serializeOrderCreated(event);
    this.published.push(payload);
    return payload;
  }
}
