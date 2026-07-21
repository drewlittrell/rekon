import { formatLog } from "../../../core/logging/src/logger.ts";

export function requestLog(path: string): string {
  return formatLog(`request path=${path}`);
}
