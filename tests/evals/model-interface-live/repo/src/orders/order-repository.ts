export type StoredOrder = {
  id: string;
  status: "pending" | "approved" | "rejected";
};

export interface OrderRepository {
  findById(orderId: string): Promise<StoredOrder | undefined>;
  setStatus(orderId: string, status: StoredOrder["status"]): Promise<StoredOrder>;
}
