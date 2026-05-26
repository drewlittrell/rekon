// Library package overlay pack.
//
// Adds exported-package capability language for library / SDK
// style repos. Selected automatically when package.json has
// exports / main / module / types and no obvious app/pages
// pattern.

import { CANON_PACK_VERSION, type CapabilityOntologyPack } from "./types.js";

export const libraryPackagePack: CapabilityOntologyPack = {
  id: "library-package",
  version: CANON_PACK_VERSION,
  description: "Exported package / library capability language.",
  verbs: {
    canonical: [
      { canonical: "export", category: "system", aliases: [] },
      { canonical: "import", category: "system", aliases: [] },
      { canonical: "expose", category: "system", aliases: [] },
    ],
    aliases: {},
    noise: [],
  },
  nouns: {
    canonical: [
      { canonical: "api", category: "infrastructure", aliases: [] },
      { canonical: "client", category: "infrastructure", aliases: [] },
      { canonical: "sdk", category: "infrastructure", aliases: [] },
      { canonical: "package", category: "infrastructure", aliases: [] },
      { canonical: "module", category: "infrastructure", aliases: [] },
      { canonical: "export", category: "infrastructure", aliases: [] },
      { canonical: "entry", category: "infrastructure", aliases: [] },
      { canonical: "index", category: "infrastructure", aliases: [] },
      { canonical: "adapter", category: "infrastructure", aliases: [] },
      { canonical: "plugin", category: "infrastructure", aliases: [] },
      { canonical: "schema", category: "data", aliases: [] },
      { canonical: "type", category: "data", aliases: [] },
    ],
    aliases: {},
    noise: [],
  },
  roles: {
    canonical: [
      { canonical: "barrel" },
      { canonical: "adapter" },
      { canonical: "plugin" },
      { canonical: "facade" },
    ],
  },
  patterns: {
    canonical: [
      { canonical: "barrel-export" },
      { canonical: "adapter" },
      { canonical: "facade" },
    ],
  },
};
