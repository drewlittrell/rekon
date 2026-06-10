# Work Order: MCP Context Skeleton (WO-6)

> Committed verbatim as issued by the operator (2026-06-10); first use of
> the docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + implementation + **safety review**. This is the
first actuator surface: a server that feeds content into agent contexts.
Per the ceremony diet, the full chain applies to surfaces that cross a
trust boundary, and this one is the trust boundary the system model's D5
names.

**Track:** actuator. **Convention note:** this work order lives in
`docs/work-orders/` and is committed before execution; amendments land as
commits. The executing agent's first act is verifying it's running the
committed version at tip.

---

## Objective

Ship `rekon mcp serve`: a local, read-only MCP server (stdio transport)
exposing two tools, `orientation` and `where_does_this_belong`, built from
artifacts that already exist, with D5 trust classes on every served item
and freshness honesty on every source. This is the slice where Rekon
starts preventing drift instead of only measuring it: an agent that asks
where a capability belongs before writing it doesn't misplace it.

## Pinned design decisions

1. **Transport: MCP over stdio, local only.** No HTTP listener, no network
   egress, no ports. The server is launched by the agent host as a
   subprocess. Remote transport is a future decision with its own safety
   review.
2. **Read-only, structurally.** The server holds no write capability: it
   reads the artifact index and compiled grammar, and nothing else. It
   never runs `refresh`, never mutates state, never executes commands. If
   artifacts are missing or stale, it says so in the response and tells
   the agent which command the operator can run; it does not run it.
3. **Trust classes from the first byte (D5).** Every leaf value in every
   response carries a trust class: `deterministic` (from code via AST or
   file facts), `declared` (operator-ratified: ontology, contracts,
   ownership, grammar), `inference`, `memory`, `operator`. **v1 serves
   only `deterministic` and `declared` content.** Inference-class content
   (semantic summaries) and memory-class content (learnings) are excluded
   until their gates exist (curation-before-serving for memory; this is
   pinned, not a TODO).
4. **Freshness honesty.** Each response section names its source artifacts
   and their freshness status using the existing four-status vocabulary.
   Stale sources are served with the staleness marked, never silently.
   This is classic's `runtimeContext.staleness` pattern generalized.
5. **No instructions in served content.** Responses are structured data.
   The server never embeds imperative prose directed at the consuming
   agent beyond a fixed, reviewed orientation preamble. This is the
   injection-surface discipline applied to ourselves: Rekon's context
   must be data the agent reasons over, never commands it obeys.
6. **Answer precision over volume (D1).** Each tool has a response size
   ceiling. `orientation` summarizes and points; it does not dump.

## The two tools

**`orientation`** (input: optional focus string) returns:

- Repo identity and scan recency (snapshot id, freshness).
- Declared systems with purposes, from OwnershipMap and CapabilityMap,
  trust-classed `declared` where ratified and `deterministic` where
  observed.
- Active grammar: which archetype packs are ratified, which are present
  but unratified, from `compileEffectiveGrammar` activation status.
- Governance state summary: open finding counts by severity, coherency
  direction, from the latest reports.
- A pointer map: which tool or CLI surface answers what, so the agent
  pulls instead of guessing.

**`where_does_this_belong`** (input: a capability description or verb
phrase) returns:

- The normalized capability (through the existing ontology normalization,
  trust-classed `deterministic` with the normalization trace).
- Owner system candidates with paths, from CapabilityMap, OwnershipMap,
  and contracts, each with the declaration that supports it.
- The grammar placement rules that apply (layer, file type, naming), from
  the compiled effective grammar, respecting `findingsEligiblePackIds`
  scoping: unratified archetype law is served only as clearly-marked
  advisory.
- An explicit `no_declaration_covers_this` result when nothing does. The
  tool never guesses an owner; absence of declared truth is the honest
  answer and itself useful signal.

## Scope

1. `@rekon/mcp` package (or runtime extension; carrier decided in the
   decision memo): MCP protocol handling, tool registration, stdio.
2. The two tool implementations over existing readers (artifact index,
   `compileEffectiveGrammar`, ontology normalization).
3. Trust-class and freshness envelope types, applied by construction (a
   response builder that requires a trust class to add a value, so
   untagged content can't be served by accident).
4. CLI: `rekon mcp serve` with `--root`.
5. Dogfood proof: connect the server to a real agent host against the
   rekon repo itself; capture the transcript of both tools answering real
   questions as completion evidence.

## Non-goals

- No fused bundle tool, step grounding, learnings, drift-check-diff, or
  runtime context (later actuator slices).
- No memory serving (gated on curation-before-serving).
- No inference-class content in responses.
- No HTTP transport, no auth, no multi-repo serving.
- No archetype inference (`rekon init` bootstrapping work).
- No write tools of any kind.

## Safety review obligations

The review confirms: no execution paths from any tool input; no file
reads outside the artifact index and compiled config; input strings
treated as data (no path traversal from the capability-description
input); response builder enforces trust tagging by construction; the
fixed preamble is the only imperative text and is reviewed verbatim; and
the server fails closed (missing artifacts produce a typed
explain-and-point response, never a crash or a guess).

## Verification plan

Required checks (per AGENTS.md): `npm run typecheck` / `npm run test` /
`npm run build`.

Slice-specific evidence: protocol-level tests (tool listing, schema
validation); behavioral tests per tool against a fixture repo with known
artifacts; a trust-class coverage test (every leaf in every fixture
response carries a class; build fails otherwise); staleness propagation
test (stale fixture artifact appears marked in the response); the
`no_declaration_covers_this` path tested; the dogfood transcript captured
and cited.

## Completion summary must include

CHANGES MADE / PUBLIC API CHANGES (the new package and CLI verb) / TESTS ·
VERIFICATION (including the dogfood transcript reference) / INTENTIONALLY
UNTOUCHED / RISKS · FOLLOW-UP / NEXT STEP (expected: the actuator track's
next tools ride this skeleton; the inference-engine port joins as the
bootstrapping slice).

---

## PURPOSE PRESERVATION CHECK

- **Original problem:** agents generate drift when they act without the
  declared purpose, current structure, and placement law in view. Classic
  proved the cure: the context server whose `locationGuidance` told the
  agent where things belong before it put them somewhere wrong.
- **Classic workflow guarantee:** `RealTimeContextHandler` +
  `ContextBundle`: fused truth served at decision time with budget and
  staleness honesty.
- **Rekon equivalent guarantee:** the same prevention surface, rebuilt per
  D1 (pull-based tools over MCP), D5 (trust classes from the first tool),
  and the freshness model, serving only deterministic and declared truth
  until the gates for the rest exist.
- **What would mean we failed:** untagged content reaches a response; the
  server gains a write or execution path; staleness gets swallowed;
  inference or memory content ships before its gate; or the tools dump
  instead of answer.
- **Regression test for the original problem:** the trust-class coverage
  test and the dogfood transcript; operationally, D6's
  drift-per-task-with-context metric once the turn loop closes.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability addressed:** `handlers/RealTimeContextHandler.ts`
  and `schemas/context-bundle.schema.ts`, ported per system-model deltas
  D1 and D5 rather than transport-for-transport.
- **What Rekon keeps:** location guidance as the flagship prevention
  tool; staleness honesty; the budget discipline (as response ceilings).
- **What Rekon redesigns:** push to pull; bespoke HTTP to MCP stdio;
  untrusted fusion to trust-classed serving.
- **What Rekon does not port yet:** the fused bundle, learnings, step
  grounding, runtime stats, the turn-memory return routes (each a named
  later slice on this skeleton).
- **How this advances the migration:** the forward flow exists. The
  organism circulates.
