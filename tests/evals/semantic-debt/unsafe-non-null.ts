type Handler = (input: string) => string;

export function invoke(registry: Map<string, Handler>, id: string, input: string): string {
  return registry.get(id)!(input);
}
