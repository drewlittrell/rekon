import type { InvoiceRepository } from "./invoice-repository.ts";

export async function invoiceStatus(repository: InvoiceRepository, id: string): Promise<string> {
  return (await repository.findById(id))?.status ?? "missing";
}
