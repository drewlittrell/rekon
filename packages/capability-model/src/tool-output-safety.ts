export function sanitizeToolMessage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const sanitized = value
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/gu, "[REDACTED PRIVATE KEY]")
    .replace(/\b(?:bearer\s+)[A-Za-z0-9._~+\/-]+=*/giu, "Bearer [REDACTED]")
    .replace(/\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\s*[:=]\s*[^\s,;]+/giu, (match) => `${match.split(/[:=]/u)[0]}=[REDACTED]`)
    .replace(/https?:\/\/[^\s/@:]+:[^\s/@]+@/giu, "https://[REDACTED]@")
    .replace(/\s+/gu, " ")
    .trim();
  return sanitized.length > 1_000 ? `${sanitized.slice(0, 997)}...` : sanitized || undefined;
}

export function sanitizeToolUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}
