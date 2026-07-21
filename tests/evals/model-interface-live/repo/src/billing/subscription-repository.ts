export type StoredSubscription = {
  id: string;
  status: "active" | "expired";
};

export interface SubscriptionRepository {
  findById(subscriptionId: string): Promise<StoredSubscription | undefined>;
  setStatus(subscriptionId: string, status: StoredSubscription["status"]): Promise<StoredSubscription>;
}
