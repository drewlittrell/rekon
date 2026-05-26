// Monorepo overlay pack.
//
// Adds workspace / package / ownership language for monorepos.
// Selected automatically when package.json declares `workspaces`,
// `pnpm-workspace.yaml` exists, or `packages/*` exists at the repo
// root.

import { CANON_PACK_VERSION, type CapabilityOntologyPack } from "./types.js";

export const monorepoPack: CapabilityOntologyPack = {
  id: "monorepo",
  version: CANON_PACK_VERSION,
  description: "Workspace / package / ownership language for monorepos.",
  verbs: {
    canonical: [
      { canonical: "link", category: "system", aliases: [] },
      { canonical: "compose", category: "create", aliases: [] },
      { canonical: "orchestrate", category: "system", aliases: [] },
      { canonical: "coordinate", category: "system", aliases: [] },
    ],
    aliases: {},
    noise: [],
  },
  nouns: {
    canonical: [
      { canonical: "workspace", category: "infrastructure", aliases: [] },
      { canonical: "package", category: "infrastructure", aliases: [] },
      { canonical: "project", category: "infrastructure", aliases: [] },
      { canonical: "graph", category: "data", aliases: [] },
      { canonical: "dependency", category: "infrastructure", aliases: ["dep"] },
      { canonical: "boundary", category: "infrastructure", aliases: [] },
      { canonical: "scope", category: "infrastructure", aliases: [] },
      { canonical: "task", category: "process", aliases: [] },
      { canonical: "pipeline", category: "process", aliases: [] },
    ],
    aliases: {},
    noise: [],
  },
  roles: {
    canonical: [
      { canonical: "workspace" },
      { canonical: "orchestrator" },
    ],
  },
  patterns: {
    canonical: [
      { canonical: "workspace-package" },
      { canonical: "task-pipeline" },
    ],
  },
};
