# `@rekon/mcp`

Rekon **MCP context server** (WO-6) — the first actuator surface.

`rekon mcp serve` runs a **local, read-only** MCP server over stdio
exposing two tools:

- `orientation` — repo identity, scan recency, declared systems, grammar
  activation, governance summary, and a pointer map.
- `where_does_this_belong` — normalized capability, declared owner
  candidates with supporting declarations, applicable grammar placement
  rules, or an explicit `no_declaration_covers_this`.

Every served value carries a D5 trust class (`deterministic` |
`declared` in v1 — `inference`/`memory` are gated and refused at the
`tag()` call site); every source carries a four-status freshness marker.
No write capability, no network, no command execution: the server reads
the artifact index and compiled grammar, and nothing else.

Decision memo: `docs/strategy/mcp-context-skeleton-decision.md`.
Safety review: `docs/strategy/mcp-context-skeleton-safety-review.md`.
Work order: `docs/work-orders/wo-6-mcp-context-skeleton.md`.

## Stability

`experimental` — the tool surface and response envelope are new in this
slice; later actuator slices (fused bundle, step grounding, learnings)
ride this skeleton and may evolve the envelope additively.
