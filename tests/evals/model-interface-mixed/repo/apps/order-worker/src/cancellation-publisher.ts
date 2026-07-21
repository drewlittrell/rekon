import {
  isOrderCancellationSource,
  type OrderCancellationEvent,
} from "../../../packages/event-contracts/src/order-cancellation.ts";

export function cancellationEvent(orderId: string, source: string): OrderCancellationEvent {
  if (!isOrderCancellationSource(source)) throw new Error("invalid-cancellation-source");
  return { type: "order.cancelled", orderId, source };
}
