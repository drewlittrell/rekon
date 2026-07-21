export function canFinalizeInvoice(status: string): boolean {
  return status === "draft";
}
