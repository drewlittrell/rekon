export type Session = {
  id: string;
  expired: boolean;
};

export function cleanupExpiredSessions(sessions: Session[]): Session[] {
  return sessions.filter((session) => !session.expired);
}
