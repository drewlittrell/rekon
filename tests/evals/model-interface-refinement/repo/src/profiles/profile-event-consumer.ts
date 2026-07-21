import type { UserCreatedEvent } from "../users/user-event-contract.ts";

export function profileLabel(event: UserCreatedEvent): string {
  return event.userId;
}
