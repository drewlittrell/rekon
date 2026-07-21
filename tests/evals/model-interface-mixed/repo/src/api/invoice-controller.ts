import type { InvoiceService } from "../billing/invoice-service.ts";

export async function invoiceStatus(service: InvoiceService, invoiceId: string) {
  return { canFinalize: await service.canFinalize(invoiceId) };
}
