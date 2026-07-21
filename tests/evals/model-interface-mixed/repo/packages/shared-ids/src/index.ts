export function parseEntityId(value: string): string {
  if (!value.trim()) throw new Error("invalid-entity-id");
  return value;
}
