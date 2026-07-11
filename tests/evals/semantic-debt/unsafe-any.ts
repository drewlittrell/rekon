export function accountId(payload: unknown): string {
  return (payload as any).account.id;
}
