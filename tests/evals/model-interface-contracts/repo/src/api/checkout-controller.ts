import type { CheckoutRequest } from "../checkout/checkout-message.ts";
import { createCheckoutMessage } from "../checkout/checkout-service.ts";

export function handleCheckout(request: CheckoutRequest) {
  return { accepted: true, message: createCheckoutMessage(request) };
}
