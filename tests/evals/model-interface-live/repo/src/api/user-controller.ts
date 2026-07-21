import { UserService } from "../domain/user-service.ts";

export class UserController {
  private readonly users: UserService;

  constructor(users: UserService) {
    this.users = users;
  }

  async activate(request: { actorId: string; userId: string }): Promise<{ active: boolean }> {
    return this.users.activate(request.actorId, request.userId);
  }
}
