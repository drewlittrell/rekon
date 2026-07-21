export interface UserNotifier {
  sendWelcome(userId: string): Promise<void>;
}
