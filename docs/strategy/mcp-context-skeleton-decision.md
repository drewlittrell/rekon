# MCP Context Skeleton Decision (WO-6)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-6, actuator track).** Carrier and implementation
decisions for `rekon mcp serve`, the first actuator surface. The work
order is committed at `docs/work-orders/wo-6-mcp-context-skeleton.md`
(first use of that convention); its six pinned design decisions are not
restated here — this memo records what the work order left to the
executing agent.

## Carrier: new `@rekon/mcp` package

A dedicated package, not a runtime extension. The server is a trust
boundary (system model D5) and gets the smallest possible audit surface:
its only Rekon dependency is `@rekon/capability-ontology` (grammar +
normalization splitter), and it reads artifacts directly from
`.rekon/registry/artifacts.index.json` + bodies rather than constructing
a runtime. The runtime's store API (`createLocalArtifactStore`) performs
`init()` directory writes; the read-only pin rules that out, so the
reader is a ~70-line direct-fs parser with a body cache.

## Protocol layer: minimal in-house JSON-RPC, no SDK dependency

MCP over stdio is newline-delimited JSON-RPC 2.0; the server implements
`initialize`, `notifications/initialized`, `ping`, `tools/list`, and
`tools/call` in ~100 lines (`src/server.ts`). Decision: no
`@modelcontextprotocol/sdk` dependency — no third-party code inside the
trust path, and the protocol subset we serve is stable and tested at the
protocol level. If protocol drift ever bites, swapping the transport
layer in does not touch the tools or the envelope. Tool results carry the
structured payload as JSON text content (the most compatible MCP result
shape).

## Trust envelope: exclusion by construction

`tag(value, trust)` is the only way a value enters a response, and it
**throws** on `inference` / `memory` / `operator` — the v1 gate is
enforced in the type system's runtime shadow, not by reviewer attention.
The trust-class coverage test walks every leaf of every fixture response
and fails on any primitive outside a `{value, trust}` envelope.

## Freshness: v1 approximation, named as such

The four-status vocabulary (`fresh | stale | partial | unknown`) is
served per source. v1 computes it as: artifact generated at-or-after the
newest EvidenceGraph → `fresh`; older → `stale`; missing timestamps or
missing artifacts → `unknown`. This is a deliberate approximation — the
runtime's full freshness-rule evaluation (invalidation rules per type) is
not re-implemented in the read-only path. `partial` is reserved and not
emitted by v1. Generalizing classic's `runtimeContext.staleness`: the
marker travels with every source ref, never as a global flag.

## Trust-class assignments (v1)

- `deterministic`: snapshot identity/recency, OwnershipMap aggregation,
  CapabilityMap candidates, finding/coherency counts, normalization
  output (splitter trace).
- `declared`: grammar activation status, ratified layer rules,
  forbidden-type naming hygiene, the pointer map (fixed strings the
  operator shipped), advisory markers.
- Rekon's OwnershipMap/CapabilityMap are projector-derived today, so
  their content is classed `deterministic` (observed), not `declared`;
  contracts and ratified grammar are the `declared` sources. When
  operator-ratified ownership lands, its entries upgrade — the envelope
  carries that without schema change.

## Response ceilings (D1)

`orientation` 8 KiB, `where_does_this_belong` 6 KiB, list caps (12
systems, 6 path roots, 5 owner candidates, 3 naming rules). Over-ceiling
responses set `truncated: true` — visible, never silent.

## Archetype scoping in `where_does_this_belong`

Placement rules come from `compileEffectiveGrammar` with the repo's own
overrides (ratification respected). Unratified archetype law appears only
under `grammarPlacement.advisoryOnly` with an explicit note — the
`findingsEligiblePackIds` discipline applied to served context, not just
findings.

## Fail-closed shape

Missing index or snapshot → a typed `unavailable` response naming the
reason and the operator command (`rekon scan` / `rekon refresh`), with
`isError: true` at the protocol layer. The server never runs the command,
never crashes the loop, and keeps answering subsequent requests.

## Dogfood

The completion evidence is a captured stdio transcript of a real MCP
session against this repository's own artifacts:
`.rekon-dev/dogfood/wo6-mcp-dogfood-transcript.json` (initialize,
tools/list, both tools with real questions). Host wiring for live use:
`claude mcp add rekon -- node <repo>/packages/cli/dist/index.js mcp serve --root <repo>`.
