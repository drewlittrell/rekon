import { invoiceStatus } from "../../../domains/billing/src/invoice-service.ts";
import type { InvoiceRepository } from "../../../domains/billing/src/invoice-repository.ts";

export async function invoiceResponse(repository: InvoiceRepository, id: string) {
  return { status: await invoiceStatus(repository, id) };
}
