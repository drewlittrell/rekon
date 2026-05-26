// Built-in canon pack registry.
//
// Rekon ships canonical ontology packs (base + archetype overlays).
// Repo-local overrides extend or supersede them. The registry is
// the only entry point for resolving pack ids; unknown ids fail
// loudly so operators do not silently get a partial ontology.

import { basePack } from "./base.js";
import { libraryPackagePack } from "./library-package.js";
import { monorepoPack } from "./monorepo.js";
import { nextjsAppPack } from "./nextjs-app.js";
import { type CapabilityOntologyPack } from "./types.js";

export { basePack } from "./base.js";
export { libraryPackagePack } from "./library-package.js";
export { monorepoPack } from "./monorepo.js";
export { nextjsAppPack } from "./nextjs-app.js";
export {
  CANON_PACK_VERSION,
  type CapabilityOntologyPack,
  type CapabilityOntologyPackNamedEntry,
  type CapabilityOntologyPackNounEntry,
  type CapabilityOntologyPackVerbEntry,
} from "./types.js";

export const BASE_PACK_ID = "base" as const;

export type BuiltinPackId =
  | "base"
  | "nextjs-app"
  | "library-package"
  | "monorepo";

export const BUILTIN_CANON_PACKS: ReadonlyArray<CapabilityOntologyPack> = Object.freeze([
  basePack,
  nextjsAppPack,
  libraryPackagePack,
  monorepoPack,
]);

const PACK_BY_ID = new Map<string, CapabilityOntologyPack>(
  BUILTIN_CANON_PACKS.map((pack) => [pack.id, pack]),
);

export function listBuiltinCanonPackIds(): BuiltinPackId[] {
  return BUILTIN_CANON_PACKS.map((pack) => pack.id as BuiltinPackId);
}

export function getBuiltinCanonPack(id: string): CapabilityOntologyPack | undefined {
  return PACK_BY_ID.get(id);
}

/**
 * Resolve a list of pack ids to packs, applying ordering rules:
 * - the base pack is always included first (deduped if listed
 *   explicitly);
 * - duplicates are deduped deterministically (first-seen wins);
 * - unknown ids throw a clear error.
 */
export function resolvePacks(packIds: ReadonlyArray<string>): CapabilityOntologyPack[] {
  const seen = new Set<string>();
  const resolved: CapabilityOntologyPack[] = [];

  // Always include base canon pack first.
  seen.add(BASE_PACK_ID);
  resolved.push(basePack);

  for (const id of packIds) {
    if (seen.has(id)) continue;
    const pack = PACK_BY_ID.get(id);
    if (!pack) {
      const known = [...PACK_BY_ID.keys()].sort().join(", ");
      throw new Error(
        `Unknown capability ontology pack: ${id}. Known packs: ${known}.`,
      );
    }
    seen.add(id);
    resolved.push(pack);
  }

  return resolved;
}
