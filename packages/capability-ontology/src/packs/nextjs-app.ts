// Next.js app overlay pack.
//
// Adds route / app / front-end conventions for Next.js apps.
// Selected automatically when package.json depends on `next` or
// the repo contains `app/` / `pages/` segments.

import { CANON_PACK_VERSION, type CapabilityOntologyPack } from "./types.js";

export const nextjsAppPack: CapabilityOntologyPack = {
  id: "nextjs-app",
  version: CANON_PACK_VERSION,
  description: "Next.js app / route / front-end conventions.",
  verbs: {
    canonical: [
      { canonical: "render", category: "transform", aliases: [] },
      { canonical: "hydrate", category: "transform", aliases: [] },
      { canonical: "navigate", category: "navigate", aliases: [] },
      { canonical: "redirect", category: "navigate", aliases: [] },
      { canonical: "revalidate", category: "validate", aliases: [] },
      { canonical: "prefetch", category: "read", aliases: [] },
    ],
    aliases: {
      "prefetch": "fetch",
      "revalidate": "validate",
    },
    noise: [],
  },
  nouns: {
    canonical: [
      { canonical: "page", category: "ui", aliases: [] },
      { canonical: "layout", category: "ui", aliases: [] },
      { canonical: "component", category: "ui", aliases: ["widget", "control"] },
      { canonical: "hook", category: "ui", aliases: [] },
      { canonical: "action", category: "process", aliases: [] },
      { canonical: "loader", category: "infrastructure", aliases: [] },
      { canonical: "metadata", category: "data", aliases: [] },
      { canonical: "segment", category: "infrastructure", aliases: [] },
      { canonical: "cache", category: "infrastructure", aliases: [] },
      { canonical: "region", category: "infrastructure", aliases: [] },
    ],
    aliases: {},
    noise: [],
  },
  roles: {
    canonical: [
      { canonical: "page" },
      { canonical: "layout" },
    ],
  },
  patterns: {
    canonical: [
      { canonical: "route-handler" },
      { canonical: "server-component" },
      { canonical: "client-component" },
    ],
  },
};
