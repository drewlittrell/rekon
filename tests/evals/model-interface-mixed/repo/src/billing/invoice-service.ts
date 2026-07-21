import { canFinalizeInvoice } from "./invoice-policy.ts";
import type { InvoiceRepository } from "./invoice-repository.ts";

export class InvoiceService {
  private readonly repository: InvoiceRepository;

  constructor(repository: InvoiceRepository) {
    this.repository = repository;
  }

  async canFinalize(invoiceId: string): Promise<boolean> {
    const invoice = await this.repository.findById(invoiceId);
    return invoice ? canFinalizeInvoice(invoice.status) : false;
  }
}
