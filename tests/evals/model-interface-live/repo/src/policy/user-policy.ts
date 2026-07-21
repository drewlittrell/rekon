import type { StoredUser } from "../data/user-repository.ts";

export interface UserPolicy {
  canManage(actorId: string, user: StoredUser): boolean;
}
