import leftpad from "leftpad";

export function describeProvider() {
  // Mentions "openai" in description text only, never imports an external API SDK.
  return `openai provider docs (padded: ${leftpad("note", 6)})`;
}
