// Capability ontology pack model.
//
// Rekon ships canonical ontology packs (base + archetype overlays).
// Repo-local overrides extend or supersede them. See the canon +
// override decision memo at
// docs/strategy/capability-ontology-canon-override-model-decision.md.

import type {
  CapabilityNounCategory,
  CapabilityVerbCategory,
} from "../index.js";

export type CapabilityOntologyPackVerbEntry = {
  canonical: string;
  category: CapabilityVerbCategory;
  aliases?: string[];
};

export type CapabilityOntologyPackNounEntry = {
  canonical: string;
  category: CapabilityNounCategory;
  aliases?: string[];
};

export type CapabilityOntologyPackNamedEntry = {
  canonical: string;
  aliases?: string[];
};

export type CapabilityOntologyPack = {
  /** Stable pack identifier, e.g. "base", "nextjs-app". */
  id: string;
  /** Pack content version. Bumped when canon shifts. */
  version: string;
  /** Human-readable purpose statement. */
  description: string;
  /** Whether this pack is the base canon (always included). */
  isBase?: boolean;
  verbs?: {
    canonical?: ReadonlyArray<CapabilityOntologyPackVerbEntry>;
    aliases?: Record<string, string>;
    /** Verbs that should be ignored as suggestion noise (not raw evidence). */
    noise?: ReadonlyArray<string>;
  };
  nouns?: {
    canonical?: ReadonlyArray<CapabilityOntologyPackNounEntry>;
    aliases?: Record<string, string>;
    /** Nouns that should be ignored as suggestion noise (not raw evidence). */
    noise?: ReadonlyArray<string>;
  };
  roles?: {
    canonical?: ReadonlyArray<CapabilityOntologyPackNamedEntry>;
    aliases?: Record<string, string>;
  };
  patterns?: {
    canonical?: ReadonlyArray<CapabilityOntologyPackNamedEntry>;
    aliases?: Record<string, string>;
  };
};

export const CANON_PACK_VERSION = "0.1.0";
