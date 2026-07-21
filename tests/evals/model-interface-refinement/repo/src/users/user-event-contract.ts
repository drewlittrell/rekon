export const USER_CREATED_CONSUMERS = [
  "profile-projection",
] as const;

export type UserCreatedEvent = {
  userId: string;
  email: string;
};
