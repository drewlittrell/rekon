import type { StoredUser, UserRepository } from "../data/user-repository.ts";
import type { UserPolicy } from "../policy/user-policy.ts";

export class UserService {
  private readonly repository: UserRepository;
  private readonly policy: UserPolicy;

  constructor(repository: UserRepository, policy: UserPolicy) {
    this.repository = repository;
    this.policy = policy;
  }

  async activate(actorId: string, userId: string): Promise<StoredUser> {
    const user = await this.requireUser(userId);
    if (!this.policy.canManage(actorId, user)) {
      throw new Error("not-authorized");
    }
    return this.repository.setActive(user.id, true);
  }

  private async requireUser(userId: string): Promise<StoredUser> {
    const user = await this.repository.findById(userId);
    if (!user) throw new Error("user-not-found");
    return user;
  }
}
