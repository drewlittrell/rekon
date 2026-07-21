export type Invoice = { id: string; status: "draft" | "issued" };

export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | undefined>;
}
