import type { CheckoutMessage, CheckoutRequest } from "./checkout-message.ts";

export function createCheckoutMessage(request: CheckoutRequest): CheckoutMessage {
  return {
    requestId: request.requestId,
    orderId: request.orderId,
  };
}
