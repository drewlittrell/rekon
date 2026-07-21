import { UserEventPublisher } from "../users/user-event-publisher.ts";

export class UserController {
  constructor(private readonly publisher: UserEventPublisher) {}

  create(input: { userId: string; email: string }) {
    return this.publisher.publishCreated(input);
  }
}
