type Logger = { info(message: string): void };
type Store = { get(id: string): Promise<string | undefined> };

export function createAccountService(logger: Logger, store: Store) {
  return { logger, store };
}
