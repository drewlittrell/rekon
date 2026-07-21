export type Invoice = { id: string; status: string };

export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | undefined>;
}
