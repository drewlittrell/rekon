// Re-export fixture — exercises named re-exports,
// namespace re-exports, and `export * from`.

export const otherThing = { id: 1 };

export { otherThing as renamedThing };

export * as constructs from "./constructs";

export * from "./type-only";
