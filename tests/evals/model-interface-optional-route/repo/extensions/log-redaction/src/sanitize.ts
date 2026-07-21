const TOKEN_PATTERN = /\btoken=[^\s]+/gu;

export function sanitizeLogLine(message: string): string {
  return message.replace(TOKEN_PATTERN, "token=[REDACTED]");
}
