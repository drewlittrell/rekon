import type { UserCreatedEvent } from "./user-event-contract.ts";

export type CreateUserEventInput = {
  userId: string;
  email: string;
};

export class UserEventPublisher {
  readonly published: UserCreatedEvent[] = [];

  publishCreated(input: CreateUserEventInput): UserCreatedEvent {
    const event: UserCreatedEvent = {
      userId: input.userId,
      email: input.email,
    };
    this.published.push(event);
    return event;
  }
}
