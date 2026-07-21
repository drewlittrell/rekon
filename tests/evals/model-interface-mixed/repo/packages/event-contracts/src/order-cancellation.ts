export const ORDER_CANCELLATION_SOURCES = ["customer", "operator"] as const;

export type OrderCancellationSource = typeof ORDER_CANCELLATION_SOURCES[number];

export type OrderCancellationEvent = {
  type: "order.cancelled";
  orderId: string;
  source: OrderCancellationSource;
};

export function isOrderCancellationSource(value: string): value is OrderCancellationSource {
  return ORDER_CANCELLATION_SOURCES.includes(value as OrderCancellationSource);
}
