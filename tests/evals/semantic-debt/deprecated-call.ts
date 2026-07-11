/** @deprecated Use normalizeAccountV2. */
export function normalizeAccount(value: string): string {
  return value.trim();
}

export function prepareAccount(value: string): string {
  return normalizeAccount(value);
}
