const CONNECTORS = new Set(["a", "the"]);

export function tokenizeExperience(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[a-z]+/g)
    ?.filter((token) => !CONNECTORS.has(token)) ?? [];
}
