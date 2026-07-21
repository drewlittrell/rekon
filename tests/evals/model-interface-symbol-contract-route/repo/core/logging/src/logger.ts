import { sanitizeLogLine } from "#log-redaction";

export function formatLog(message: string): string {
  return sanitizeLogLine(message);
}
