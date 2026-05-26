// Base canon pack — common capability language across most repos.
//
// This pack is always included in the EffectiveCapabilityOntology.
// Overlay packs (nextjs-app, library-package, monorepo) and repo-
// local overrides extend or supersede it.
//
// Authoring rules:
// - Keep canonical entries conservative; only ship terms with broad
//   cross-repo applicability.
// - Aliases should map repo-specific phrasing onto the canonical
//   token (e.g. "make" -> "create", "persist" -> "save").
// - Noise tokens suppress suggestion noise (the normalizer still
//   records the raw evidence; only the review surface filters).

import { CANON_PACK_VERSION, type CapabilityOntologyPack } from "./types.js";

export const basePack: CapabilityOntologyPack = {
  id: "base",
  version: CANON_PACK_VERSION,
  description: "Common capability language across most repos.",
  isBase: true,
  verbs: {
    canonical: [
      { canonical: "get", category: "read", aliases: ["retrieve", "lookup", "read", "find"] },
      { canonical: "list", category: "read", aliases: ["all", "index", "enumerate"] },
      { canonical: "fetch", category: "read", aliases: ["query", "request"] },
      { canonical: "load", category: "read", aliases: ["pull"] },
      { canonical: "set", category: "write", aliases: ["assign", "store"] },
      { canonical: "save", category: "write", aliases: ["persist", "write"] },
      { canonical: "update", category: "write", aliases: ["modify", "patch", "edit", "change"] },
      { canonical: "create", category: "create", aliases: ["make", "add", "new"] },
      { canonical: "build", category: "create", aliases: ["construct", "compose", "assemble"] },
      { canonical: "delete", category: "delete", aliases: ["remove", "destroy", "drop"] },
      { canonical: "validate", category: "validate", aliases: ["ensure", "assert", "guard"] },
      { canonical: "verify", category: "validate", aliases: ["confirm"] },
      { canonical: "check", category: "validate", aliases: ["test"] },
      { canonical: "render", category: "transform", aliases: ["draw", "paint", "display"] },
      { canonical: "parse", category: "transform", aliases: ["decode", "interpret"] },
      { canonical: "format", category: "transform", aliases: ["serialize", "encode", "stringify"] },
      { canonical: "transform", category: "transform", aliases: ["convert", "map"] },
      { canonical: "normalize", category: "transform", aliases: [] },
      { canonical: "extract", category: "transform", aliases: ["pluck"] },
      { canonical: "generate", category: "transform", aliases: ["produce"] },
      { canonical: "resolve", category: "transform", aliases: [] },
      { canonical: "register", category: "system", aliases: ["enroll"] },
      { canonical: "handle", category: "system", aliases: ["process"] },
      { canonical: "execute", category: "system", aliases: ["run", "perform"] },
      { canonical: "route", category: "navigate", aliases: ["redirect"] },
      { canonical: "navigate", category: "navigate", aliases: ["goto"] },
      { canonical: "publish", category: "communicate", aliases: ["emit", "dispatch", "broadcast"] },
      { canonical: "subscribe", category: "communicate", aliases: ["listen", "watch"] },
      { canonical: "send", category: "communicate", aliases: ["post"] },
      { canonical: "receive", category: "communicate", aliases: ["consume"] },
    ],
    aliases: {},
    noise: ["maybe", "todo", "fixme", "tbd"],
  },
  nouns: {
    canonical: [
      { canonical: "user", category: "domain", aliases: ["account", "person", "member"] },
      { canonical: "session", category: "domain", aliases: ["login"] },
      { canonical: "token", category: "infrastructure", aliases: ["secret", "credential", "apikey"] },
      { canonical: "config", category: "infrastructure", aliases: ["configuration", "settings", "options"] },
      { canonical: "file", category: "infrastructure", aliases: ["blob"] },
      { canonical: "route", category: "infrastructure", aliases: ["endpoint", "url", "path"] },
      { canonical: "handler", category: "infrastructure", aliases: [] },
      { canonical: "service", category: "infrastructure", aliases: ["manager"] },
      { canonical: "provider", category: "infrastructure", aliases: [] },
      { canonical: "report", category: "process", aliases: ["summary", "digest"] },
      { canonical: "artifact", category: "process", aliases: [] },
      { canonical: "finding", category: "process", aliases: [] },
      { canonical: "issue", category: "process", aliases: [] },
      { canonical: "plan", category: "process", aliases: [] },
      { canonical: "proof", category: "process", aliases: [] },
      { canonical: "command", category: "process", aliases: ["task"] },
      { canonical: "workflow", category: "process", aliases: ["pipeline"] },
      { canonical: "event", category: "process", aliases: [] },
      { canonical: "data", category: "data", aliases: [] },
      { canonical: "schema", category: "data", aliases: [] },
      { canonical: "state", category: "data", aliases: [] },
      { canonical: "result", category: "data", aliases: [] },
      { canonical: "context", category: "data", aliases: [] },
      { canonical: "memory", category: "data", aliases: [] },
      { canonical: "request", category: "infrastructure", aliases: ["req"] },
      { canonical: "response", category: "infrastructure", aliases: ["res", "reply"] },
      { canonical: "view", category: "ui", aliases: ["screen"] },
      { canonical: "form", category: "ui", aliases: [] },
      { canonical: "record", category: "data", aliases: ["row", "entity", "item", "doc", "document"] },
    ],
    aliases: {},
    noise: ["thing", "stuff", "obj", "tmp"],
  },
  roles: {
    canonical: [
      { canonical: "controller" },
      { canonical: "service", aliases: ["manager"] },
      { canonical: "repository", aliases: ["repo", "store", "dao"] },
      { canonical: "view" },
      { canonical: "handler", aliases: ["listener"] },
    ],
    aliases: {},
  },
  patterns: {
    canonical: [
      { canonical: "crud" },
      { canonical: "rest-route", aliases: ["restful", "rest"] },
      { canonical: "background-job", aliases: ["worker", "queue"] },
      { canonical: "validator" },
    ],
    aliases: {},
  },
};
