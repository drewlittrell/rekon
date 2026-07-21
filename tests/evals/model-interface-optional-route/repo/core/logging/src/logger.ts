import { sanitizeLogLine } from "../../../extensions/log-redaction/src/sanitize.ts";

export function formatLog(message: string): string {
  return sanitizeLogLine(message);
}
