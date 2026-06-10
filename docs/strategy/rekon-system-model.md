# Rekon system model

> **LIVING DOCUMENT.** Maintained as current state; governed by the Documentation authority section in AGENTS.md.

Status: **Canonical strategy document. Operator-approved 2026-06-10.**
Supersedes the framing of
the "From detection to prevention" addendum and absorbs its workstreams; the
north star, the Rekon/Circe boundary, and all pinned safety deferrals hold
unchanged. Classic file citations below were verified by direct read on
2026-06-10.

## The mission, stated as a system

Rekon exists to keep codebases aligned with their declared purpose over time,
in an environment where AI agents generate most of the code. It accomplishes
this as one closed loop, and every Rekon capability is a component of that
loop. Nothing in this document is a feature list; it's an anatomy.

## The three truths

The loop maintains three sources of truth and measures the gaps between
them.

**Declared truth: what the codebase is supposed to be.** The architecture
grammar (layers, verb categories, naming grammar, file types, patterns,
anti-patterns with corrections), the ontology vocabulary, capability
contracts carrying outcomes and handoffs, invariants, and system boundary
declarations.
Classic sources: `ontology/*.ontology.yaml` (fourteen files plus
`index.yaml`'s schema-to-evaluator chain),
`.codebase-intel/cache/capability-contracts.accepted.json`, `invariants/**`,
`config.project/systems/*.yaml`.
Rekon state: contracts, ontology vocabulary, and policy layers shipped and
stronger than classic; grammar content absent (WO-4 ports it); purpose rung
absent (workstream 5).

**Static observed truth: what the code says it is.** Scan, evidence graph
with provenance, per-file analysis, import and call relationships,
capabilities normalized through the ontology.
Classic sources: `replatform-observe.ts`, the per-file analysis cache, the
evidence packs.
Rekon state: shipped, with AST extraction, provenance, and freshness classic
lacked.

**Runtime observed truth: what the code actually does.** Trace envelopes
whose nodes carry `staticRef` (join to the static graph),
`capabilityContractId`, and `handoffContractId` (joins to declared purpose),
merged into a cumulative runtime truth graph and consumed by coherency.
Static analysis assumes; runtime truth verifies.
Classic sources: `packages/kernel-runtime-truth/src/schema/runtime-truth.schema.ts`
(the join keys), `replatform-runtime-truth.ts` (ingest and merge),
`replatform-delta.ts` (consumption as a coherency input), baton SDKs as
emitters.
Rekon state: concepts exist (runtime graph observation and drift); the
production seam is unbuilt. Design delta D4 changes the transport.

## The two flows

**The forward flow is prevention.** The system's primary product is context
delivered to the agent at decision time: the law, the current state, the
runtime reality, sliced to the task, with explicit cost discipline. An agent
that understands declared purpose, existing structure, and observed behavior
before acting doesn't generate drift. Classic proved the shape:
`schemas/context-bundle.schema.ts` fuses architecture with purposes, health,
and invariants; scored files with TLDRs, constraints, and runtime stats;
issue context with violated rules, exemplar patterns, and location guidance
("this capability belongs to system X at paths Y"); step grounding with
runtime execution counts; staleness marked honestly; and a token budget with
a pressure enum as a first-class schema field. Served by
`handlers/RealTimeContextHandler.ts`.

**The return flow is freshness.** Everything observed feeds the foundation:
agent turns report back through memory (classic: the `/memory/turn/start`,
`note`, `end` routes on the same server that serves context), learnings
carry outcomes and supersession chains, operator feedback and vocabulary
review extend the ontology, runtime truth refreshes assumptions, and
contract evolution proposals govern purpose change. The baseline never goes
stale silently because staleness is a measured condition at every layer,
including (per the doc governance workstream) the strategy corpus itself.

**Detection is instrumentation.** Findings, the parity bench, evaluators,
and the coherency delta are the sensor layer: the backstop that catches what
the forward flow failed to prevent, and the signal that locates where the
forward flow needs improving. The sensor layer is where the current parity
effort lives; this document ranks it as one half of the system, with the
actuator half (context delivery) of equal rank.

## Purpose preservation, made executable

Purpose loss is detected at the point of change and defended by generated
proof. Classic sources, verified: `drift-artifacts.ts` diffs a base evidence
graph against a head evidence graph joined to accepted contracts, emitting
typed violations (`capability_removed`, `confidence_degraded`,
`handoff_broken`, `outcome_missing`), with governed responses (evolution
proposal to accept change; scope-bound suppression for work in progress,
never permanent silence). `capability-scaffolds.ts` compiles each contract
into regression assertions and end-to-end scenario steps. The canonical
version binds these to Rekon's verification loop per delta D3.

This reclassifies two addendum workstreams. Diff-time drift gates
(workstream 2) and drift attribution via the turn loop (workstream 3) are
classic guarantee preservation, with `drift-artifacts.ts` and the memory
turn routes as their source entries. They enter the parity discipline, with
audit rows, rather than the extensions list.

## Design deltas

The original design dates to late 2024 and built the loop around an AI that
needed curated context pushed to it. The canonical version builds it around
agents that investigate, work in turns, and must be both empowered and
distrusted at the boundary. Each delta names its classic source, the change,
and the reason the change is now correct.

**D1. Pull-based context over MCP.** Classic: one fused `ContextBundle`
pushed per query from a bespoke local server. Canonical: a queryable toolset
served over MCP (orientation, query system, query capability, where does
this belong, is this step grounded, get learnings, drift-check this diff),
plus a small always-on orientation payload; the fused bundle survives as one
tool among several. Rationale: agents are now active investigators with
cheap tool calls; the constraint moved from window size to attention
quality; MCP is the native integration channel for every agent host and
didn't exist when classic was designed. The budget field survives with
changed meaning: answer precision per question rather than tokens per
bundle.

**D2. Turn and diff cadence.** Classic: batch scans as the heartbeat, watch
mode bolted on, caches apologizing for the gap. Canonical: incremental
evidence updates at turn and diff boundaries, with full scans demoted to
baseline reconciliation, mounted on the lifecycle hooks that now exist
(agent hooks, pre-commit, CI). Consequence: the watcher daemon is
permanently retired from the roadmap; freshness-on-read plus turn-triggered
refresh covers its purpose at a fraction of the complexity.

**D3. Outcomes as executable proof, with one evidence-strength scale.**
Classic: contract outcomes checked by substring matching over a text index
(`evidenceSupportsOutcome`); scaffolds as assertion text; thresholds
scattered as magic numbers (0.2 degradation, 0.05 modification, percentile
hubs). Canonical: each contract outcome binds to a verification obligation
(command, behavioral test, or runtime assertion), so `outcome_missing`
means a proof stopped passing; contract to generated VerificationPlan to
VerificationResult is the chain. One declared evidence-strength scale
(deterministic above AST above regex above LLM proposal, with model-version
provenance) with every threshold in the declared layer, tunable against the
labeled false-positive dataset from classic's suppression history.

**D4. Runtime truth rides OpenTelemetry.** Classic: bespoke baton SDKs per
language. Canonical: an OTel adapter maps spans to envelope nodes and edges;
trace identity comes free; the join keys (`staticRef`,
`capabilityContractId`, `handoffContractId`) survive as semantic-convention
attributes. Rationale: OTel won the instrumentation layer after the original
design; a second SDK is an adoption tax. The baton schema was right; the
transport should be the industry's.

**D5. The context surface is a security boundary.** New concern since the
original design. Everything served into an agent's context is an injection
surface, and memory is a poisoning vector in multi-agent settings.
Canonical: every context item carries a trust class
(deterministic-from-code, LLM inference, memory, operator) so hosts can
apply policy; learnings pass curation before they're servable, extending the
existing review-ledger pattern. Provenance discipline, already Rekon's
spine, extends into the served context itself.

**D6. The system measures its own effect.** Classic measured the codebase
exhaustively and itself never. Canonical: the turn loop closes into a
metric: drift introduced per task, conditioned on context served, plus token
cost per successful task. Ships with an eval suite (context on versus
context off across task batches). The attribution loop was already in the
architecture; this names its output.

**D7. Versioned purpose lineage.** Classic: contracts and declarations have
identity; evolution proposals govern change. Canonical: declarations carry
version lineage, drift is measured against purpose as of a version, and
evolution proposals become version transitions. Required the moment more
than one human, or many agents, touch the declared layer.

**D8. The grammar compiles outward.** Classic generated ESLint rules from
ontology definitions; the instinct was right and the wiring sat on the
post-migration task list. Canonical: one declared grammar compiles to lint
configs, CI checks, and agent-contract assertions simultaneously. One law,
every enforcement surface agents already respect.

## What does not change

The three-truths model and its join keys. Proposal, never proof, for
anything LLM-derived, with deterministic facts winning. Governed suppression
bound to a scope. The ontology-as-grammar idea. Contracts as the unit of
purpose. Operator ratification as the gate into declared truth. The closed
loop itself. These weren't artifacts of 2024; they were early.

## Track map

Every active effort, located in the loop:

- **Sensor track (classic parity).** The parity bench (WO-1), the scanner
  crash fix (WO-2), detection design review (WO-3), and the Phase 1
  emitter queue. Measures and closes the detection gap against classic's
  proven output. Diff gates and turn attribution join this track as
  preserved guarantees per the reclassification above.
- **Law track.** Grammar port (WO-4), purpose rung, versioned lineage (D7),
  outward compilation (D8), unified evidence-strength scale (D3).
- **Actuator track.** The MCP context toolset (D1), system pages and the
  search index from the docs-generator port, declaration bootstrapping
  (`rekon init` as interview), trust-classed serving (D5).
- **Runtime track.** The OTel adapter (D4), step grounding, runtime-versus-
  declared drift detection.
- **Loop integrity track.** Turn-cadence incremental refresh (D2), doc
  governance enrollment, memory curation before serving, drift velocity as
  the headline trajectory metric, and the self-measurement eval (D6).

Sequencing stays as planned for work in flight; this document changes rank,
and the actuator and runtime tracks hold equal standing with the sensor
track from here forward.

## What failure looks like

The sensor track converges while the actuator track stays unbuilt, leaving
a better detector and no prevention. Context ships without trust classes and
an injection incident defines the product. The grammar ports and nothing
consumes it. The turn loop runs and never becomes a metric. Or the loop
closes on Rekon's own repo and never meets a stranger's.

## PURPOSE PRESERVATION CHECK

- **Original problem:** codebases drift from their purpose faster than
  humans can notice, and agent-generated code accelerates the drift beyond
  what retrospective review can govern.
- **Classic workflow guarantee:** one closed loop, verified in source:
  declared law (ontology, contracts), static observation (scan, graphs),
  runtime observation (truth envelopes with joins), drift detection at the
  point of change (capability diff), purpose compiled to proof obligations
  (scaffolds), context as prevention (the bundle with budget, grounding,
  and location guidance), and experience returning through the turn loop.
- **Rekon equivalent guarantee:** the same organism with a stronger
  skeleton (artifacts, provenance, freshness, adjudication, the proof
  runner) and the eight design deltas above, each of which strengthens a
  seam without removing one.
- **What would mean we failed:** any item under "What failure looks like";
  or the deltas drift into removing guarantees rather than re-carrying
  them; or this document goes stale silently, which is why it enrolls in
  doc governance as a living document the day that workstream ships.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability addressed:** the whole system, as one loop rather
  than a feature inventory.
- **Relevant classic files/systems:** cited per section above; the load-
  bearing reads were the ontology index, the runtime truth schema, the
  capability drift and scaffold modules, the context bundle schema, the
  real-time context handler, and the architecture docs generator with its
  intent memo.
- **What Rekon keeps:** every seam, with the preservation reclassification
  of diff gates and turn attribution.
- **What Rekon redesigns:** the eight deltas, each cited to its classic
  source and its 2026 rationale.
- **What Rekon does not port:** the bespoke context server transport, the
  baton SDK transport, the watcher, substring outcome matching, scattered
  thresholds, and the VS Code extension framing; each is superseded by a
  named delta rather than dropped silently.
- **How this advances the migration:** it states what the migration was
  always toward, so every future work order locates itself inside the
  organism instead of beside it.
