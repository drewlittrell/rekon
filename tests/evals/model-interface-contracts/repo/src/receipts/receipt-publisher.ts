export type ReceiptMetadata = {
  requestId: string;
  orderId: string;
};

export function publishReceipt(metadata: ReceiptMetadata): ReceiptMetadata {
  return { ...metadata };
}
