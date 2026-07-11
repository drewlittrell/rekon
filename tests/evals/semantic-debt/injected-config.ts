export type ServiceConfig = { origin: URL; timeoutMs: number };

export function createRequest(config: ServiceConfig, path: string): Request {
  return new Request(new URL(path, config.origin), { signal: AbortSignal.timeout(config.timeoutMs) });
}
