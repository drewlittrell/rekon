// Fixture file used by the reconciliation-exact-diff-operation-v1 contract test.
// The seeded CoherencyDelta in the same fixture carries beforeText that matches
// this file byte-for-byte. The expected afterText replaces the legacy import
// with the modern equivalent.
import { legacy } from "./legacy.js";

export function greet(name: string): string {
  return `${legacy(name)}`;
}
