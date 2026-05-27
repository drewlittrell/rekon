// Lightweight shim used as an import target by
// constructs.tsx. Keeps the fixture self-contained
// without a real React dependency.

export type ReactNode = unknown;

export function noop(): void {}
