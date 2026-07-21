import type { OrderCreatedEvent } from "./order-event.ts";

export type OrderEventSerializer = (event: OrderCreatedEvent) => Record<string, unknown>;

export class OrderEventPublisher {
  readonly published: Record<string, unknown>[] = [];
  private readonly serializer: OrderEventSerializer;

  constructor(serializer: OrderEventSerializer) {
    this.serializer = serializer;
  }

  publishCreated(event: OrderCreatedEvent): Record<string, unknown> {
    const payload = this.serializer(event);
    this.published.push(payload);
    return payload;
  }
}
