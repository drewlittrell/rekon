import type { CheckoutMessage } from "../checkout/checkout-message.ts";
import { publishReceipt } from "../receipts/receipt-publisher.ts";

export function processCheckout(message: CheckoutMessage) {
  return publishReceipt({
    requestId: message.requestId,
    orderId: message.orderId,
  });
}
