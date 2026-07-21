import { OrderService } from "../orders/order-service.ts";

export class OrderController {
  private readonly orders: OrderService;

  constructor(orders: OrderService) {
    this.orders = orders;
  }

  async approve(request: { actorId: string; orderId: string }): Promise<{ status: string }> {
    return this.orders.approve(request.actorId, request.orderId);
  }
}
