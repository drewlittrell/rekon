export type Order = {
  id: string;
  userId: string;
  total: number;
};

export interface OrderRepository {
  create(input: Order): Promise<Order>;
}
