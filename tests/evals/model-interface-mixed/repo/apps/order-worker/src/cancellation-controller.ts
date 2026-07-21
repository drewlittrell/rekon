import { cancellationEvent } from "./cancellation-publisher.ts";

export function cancelOrder(orderId: string, source: string) {
  return { status: 202, body: cancellationEvent(orderId, source) };
}
