import { redactionRules } from "./rules/index.ts";

export function sanitizeLogLine(value: string): string {
  return redactionRules.reduce((result, rule) => rule(result), value);
}
