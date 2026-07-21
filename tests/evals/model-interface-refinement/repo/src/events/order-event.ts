export type CheckoutChannel = "web" | "mobile";

export type OrderCreatedEvent = {
  orderId: string;
  userId: string;
  total: number;
  channel?: CheckoutChannel;
};
