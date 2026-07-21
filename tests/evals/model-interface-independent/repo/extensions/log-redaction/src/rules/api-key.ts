export function redactApiKey(value: string): string {
  return value.replace(/api_key=[^\s&]+/giu, "api_key=[redacted]");
}
