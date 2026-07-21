import type { CheckoutRequest } from "../checkout/checkout-service.ts";
import { CheckoutService } from "../checkout/checkout-service.ts";

export async function checkoutResponse(service: CheckoutService, request: CheckoutRequest) {
  return { status: 201, body: await service.checkout(request) };
}
