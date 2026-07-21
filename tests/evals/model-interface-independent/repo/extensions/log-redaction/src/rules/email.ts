export function redactEmail(value: string): string {
  return value.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu, "[redacted-email]");
}
