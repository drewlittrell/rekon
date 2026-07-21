import type { StoredOrder } from "./order-repository.ts";

export interface OrderPolicy {
  canReview(actorId: string, order: StoredOrder): boolean;
}
