---
freshness:
  paths:
    - packages/mcp/src/**
    - packages/capability-ontology/src/grammar/**
    - packages/capability-policy/src/**
    - tests/bench/**
---
# Rekon system model

> **LIVING DOCUMENT.** Maintained as current state; governed by the Documentation authority section in AGENTS.md.

Status: **Canonical strategy document. Operator-approved 2026-06-10.
Refreshed 2026-06-12**, absorbing WO-6 through WO-14; this revision is the
content verification the freshness model asks of a living document.
Supersedes the framing of
the "From detection to prevention" addendum and absorbs its workstreams; the
north star, the Rekon/Circe boundary, and all pinned safety deferrals hold
unchanged. Classic file citations below were verified by direct read on
2026-06-10; scoreboard figures are from the WO-14 canonical wave-end run.

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
`config.project/systems/*.yaml`,
`domain/issues/topology-contract-inference.ts` (the archetype library).
Rekon state: shipped and governed. The grammar is three-tiered (meta-grammar
schema, four classic-seeded archetype packs, project overlays) with
jurisdiction: archetype law backs findings only under operator ratification.
Operator law carries `operator:` provenance and purpose claims in the law
text, and the calibration loop has run end to end twice (WO-11, WO-13). The
vocabulary informs the grammar (noun-aware suffix matching, exemptions
counted). Still absent: the purpose rung above coherence (workstream 5),
versioned lineage (D7), and the `package-platform` archetype both home repos
need before they can ratify.

**Static observed truth: what the code says it is.** Scan, evidence graph
with provenance, per-file analysis, import and call relationships,
capabilities normalized through the ontology.
Classic sources: `replatform-observe.ts`, the per-file analysis cache, the
evidence packs.
Rekon state: shipped, now at symbol granularity: `import_specifier` and
`reexport` facts with deterministic resolution through relative paths,
tsconfig aliases, and workspace package names (WO-8, WO-14). Agent-scratch
trees and non-production paths are excluded by construction (WO-10, WO-12),
a contamination class classic never met: the scanner no longer reads the
agents' workbenches as source.

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
production seam is unbuilt and is the loop's largest missing organ. Design
delta D4 changes the transport.

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
Rekon state: the first organ shipped (WO-6). `rekon mcp serve` runs local
stdio, read-only by construction, serving `orientation` and
`where_does_this_belong` with a trust class on every leaf value (the `tag()`
gate throws on anything but deterministic and declared content in v1),
freshness honesty on every source, response ceilings, and
`no_declaration_covers_this` as a first-class honest answer. Remaining
organs, each a slice on this skeleton: the fused bundle, step grounding,
learnings behind the curation gate, drift-check-diff, runtime context, and
the bootstrapping interview (see the parity model for why bootstrapping is
also the sensor track's lever).

**The return flow is freshness, and it is now proven.** Everything observed
feeds the foundation: agent turns report back through memory (classic: the
`/memory/turn/start`, `note`, `end` routes on the same server that serves
context), learnings carry outcomes and supersession chains, operator
feedback and vocabulary review extend the ontology, runtime truth refreshes
assumptions, and contract evolution proposals govern purpose change.
Rekon state: doc governance shipped (WO-7): living documents declare
referents, staleness is git ancestry, snapshots are exempt and stamped, and
this document is enrolled. The law-calibration loop shipped and has run
twice (WO-11, WO-13): a finding cites its law, the operator interrogates the
law's purpose, the law refines as a scoped declaration with a purpose claim
and operator provenance, and findings retire by declaration. False positives
migrate from detector bugs to law miscalibration with a governed correction
path; classic's decaying suppression layer became a readable body of
doctrine. Known gap, pinned: an enrollment or mechanical commit resets
ancestry-based freshness without content review; the `freshness.verified`
field lands with the concepts state-shape rewrite.

**Detection is instrumentation.** Findings, the parity bench, evaluators,
and the coherency delta are the sensor layer: the backstop that catches what
the forward flow failed to prevent, and the signal that locates where the
forward flow needs improving. The bench's dispositions distinguish
designed-and-queued, parked-with-re-entry, not-Rekon's-job (`rejected`), and
now `overruled` (WO-12): classic keeps that operator rulings contradict
leave the denominator with the ruling as required citation, because ground
truth is living once law is governed. Precision is measured, not asserted:
classic's 2,148 recovered suppressions (WO-14) are the standing
labeled-negative gauntlet, scored per rule. The sensor layer is one half of
the system, with the actuator half (context delivery) of equal rank.

## The parity model (pinned 2026-06-12)

Scoreboard at the WO-14 canonical run: **8.7% weighted recall (523/5,993)**,
per-repo primary: mentor 14.3%, codebase-intel 5.4%, simulacrum 2.2%,
figma-ds control 1.9%, with the controls moved only by base hygiene and
evidence rules, which apply everywhere by design.

The governing discovery of the wave: **recall is declaration-bounded, not
detector-bounded.** Classic achieved its recall by guessing where Rekon
requires declaration. The measured gap decomposes into: law content the
operator hasn't declared yet (vocabulary entities, ownership maps, archetype
ratification for the two home repos), cluster-A depth (verb-per-layer,
file-type grammar, sequential patterns: a v2 slice), prose judgment Rekon
deliberately routes through the opt-in semantic overlay instead of
reproducing (most of classic's tech_debt cluster), the deferred similarity
family awaiting the embedding precision slice, and preservation-or-net-new
slots that never had corpus fire history.

Doctrine that follows: **the actuator track raises the sensor track's
ceiling.** The bootstrapping interview that proposes declarations is how the
bench climbs. Recall pursued by weakening declarations instead of growing
them is a failure mode, named below. The plateau sits deliberately below
100%: the residual is the measured disagreement between calibrated law and
classic's uncalibrated keeps, governed finding by finding through
`overruled`. That residual is the product claim stated as a number: we kept
what was true, rejected what wasn't, and can show every line of the
difference.

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
audit rows, rather than the extensions list. Queue slot 3 carries the four
signals; it remains deliberately outside wave batching as a design-grade
slice.

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
Status: v1 shipped (WO-6): the skeleton, two tools, trust classes, ceilings.
Remaining: the tool family.

**D2. Turn and diff cadence.** Classic: batch scans as the heartbeat, watch
mode bolted on, caches apologizing for the gap. Canonical: incremental
evidence updates at turn and diff boundaries, with full scans demoted to
baseline reconciliation, mounted on the lifecycle hooks that now exist
(agent hooks, pre-commit, CI). Consequence: the watcher daemon is
permanently retired from the roadmap; freshness-on-read plus turn-triggered
refresh covers its purpose at a fraction of the complexity.
Status: the watcher retirement is executed (WO-5 archive). Turn-triggered
incremental refresh is not built; scans remain batch with freshness honesty.

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
Status: not built; severity and confidence remain static per axis. The
alignment follow-up every detector slice has named. The labeled
false-positive dataset now exists in the corpus (WO-14).

**D4. Runtime truth rides OpenTelemetry.** Classic: bespoke baton SDKs per
language. Canonical: an OTel adapter maps spans to envelope nodes and edges;
trace identity comes free; the join keys (`staticRef`,
`capabilityContractId`, `handoffContractId`) survive as semantic-convention
attributes. Rationale: OTel won the instrumentation layer after the original
design; a second SDK is an adoption tax. The baton schema was right; the
transport should be the industry's.
Status: not built; the runtime track is untouched.

**D5. The context surface is a security boundary.** New concern since the
original design. Everything served into an agent's context is an injection
surface, and memory is a poisoning vector in multi-agent settings.
Canonical: every context item carries a trust class
(deterministic-from-code, LLM inference, memory, operator) so hosts can
apply policy; learnings pass curation before they're servable, extending the
existing review-ledger pattern. Provenance discipline, already Rekon's
spine, extends into the served context itself.
Status: v1 shipped (WO-6): trust tagging by construction, injection-tested
inputs, fail-closed, served content carries no instructions. Remaining: the
memory curation gate before learnings ever serve.

**D6. The system measures its own effect.** Classic measured the codebase
exhaustively and itself never. Canonical: the turn loop closes into a
metric: drift introduced per task, conditioned on context served, plus token
cost per successful task. Ships with an eval suite (context on versus
context off across task batches). The attribution loop was already in the
architecture; this names its output.
Status: not built; requires the turn loop.

**D7. Versioned purpose lineage.** Classic: contracts and declarations have
identity; evolution proposals govern change. Canonical: declarations carry
version lineage, drift is measured against purpose as of a version, and
evolution proposals become version transitions. Required the moment more
than one human, or many agents, touch the declared layer.
Status: not built. Operator provenance (`operator:<ruling-ref>`, WO-13) is
the first rung of the lineage this delta completes.

**D8. The grammar compiles outward.** Classic generated ESLint rules from
ontology definitions; the instinct was right and the wiring sat on the
post-migration task list. Canonical: one declared grammar compiles to lint
configs, CI checks, and agent-contract assertions simultaneously. One law,
every enforcement surface agents already respect.
Status: partial. The grammar drives the divergence detector (WO-9), the
anti-pattern pack via the rows' own detection rules (WO-14), and the naming
contract (WO-14). Compilation to lint configs, CI checks, and
agent-contract assertions remains.

## What does not change

The three-truths model and its join keys. Proposal, never proof, for
anything LLM-derived, with deterministic facts winning. Governed suppression
bound to a scope, now joined by governed overruling bound to a ruling. The
ontology-as-grammar idea, now with jurisdiction. Contracts as the unit of
purpose. Operator ratification as the gate into declared truth. The closed
loop itself. These weren't artifacts of 2024; they were early.

## Operating conventions (proven in practice, now canon)

Work orders live in `docs/work-orders/`, committed before execution,
amendments as commits; executing agents verify tip first. **Step 0**:
detector and capability slices audit the substrate from tier-1 sources
before design and report found-versus-built. **Expected-delta-or-report**:
every run states its expected movement first; surprises are decomposed,
never absorbed. **Wave protocol** for breadth: thin sub-orders under one
binding template, per-slot numbers as working data, one canonical wave-end
run, one combined triage, calibration batched. **The standing register**:
ratified-open findings are the register working, never a number to optimize
away. Law refinements declare canonical paths, never open borders, and
carry purpose claims that name their own revisit conditions.

## Track map (status at refresh)

Every active effort, located in the loop:

- **Sensor track (classic parity).** Done: the parity bench (WO-1), the
  scanner crash fix (WO-2), detection design review (WO-3), symbol facts
  (WO-8), cluster-A divergence v1 (WO-9), scan scope (WO-10), the
  `overruled` disposition (WO-12), and detection wave 1 (WO-14: debt
  markers with the coverage scorer, dead_code, suppressed-set recovery,
  capability overlap, naming contract, anti-pattern pack). In flight:
  calibration v3, whose first item is the wave's one red flag (dead_code
  v2: type-only, factory, generated, and barrel awareness). Remaining:
  queue slots 3, 8, 9, 10; cluster-A v2; the embedding precision slice
  gating the similarity family. Diff gates and turn attribution remain in
  this track as preserved guarantees per the reclassification above.
- **Law track.** Done: grammar port and archetype jurisdiction (WO-4,
  WO-4.1), law calibration v1 and v2 (WO-11, WO-13), operator provenance.
  Remaining: the `package-platform` archetype (the recall lever for both
  home repos), required-edge graduation (classic's inverse baton rule,
  queued inside the instrumentation law text), the operator-topology-edge
  compile gap, D3's unified scale, D7, the purpose rung, outward
  compilation (D8).
- **Actuator track.** Done: the MCP context skeleton (WO-6). Next: the
  tool family (D1), system pages and the search index from the
  docs-generator port, the bootstrapping interview (`rekon init` as
  interview, and the sensor ceiling's lever per the parity model),
  trust-classed memory curation (D5).
- **Runtime track.** Untouched. The OTel adapter (D4) is the entry slice,
  then step grounding and runtime-versus-declared drift.
- **Loop integrity track.** Done: documentation authority (WO-5), doc
  freshness (WO-7). Remaining: the concepts state-shape rewrite with the
  `freshness.verified` field (worklist: the nine day-one-stale docs),
  turn-cadence incremental refresh (D2's unbuilt half), memory curation
  before serving, drift velocity as the headline trajectory metric, and
  the self-measurement eval (D6).

Sequencing stays as planned for work in flight; the actuator and runtime
tracks hold equal standing with the sensor track, and the parity model
above binds them: declarations grown by the actuator raise the recall the
sensor can honestly claim.

## What failure looks like

The sensor track converges while the actuator track stays unbuilt, leaving
a better detector and no prevention. Recall pursued by weakening
declarations rather than growing them. Context ships without trust classes
and an injection incident defines the product. Memory serves without
curation. The grammar's jurisdiction erodes through broad-path law. The
standing register shrinks by optimization instead of remediation.
`overruled` becomes a recall lever. The turn loop runs and never becomes a
metric. Or the loop closes on Rekon's own repos and never meets a
stranger's.

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
  runner), the eight design deltas in staged delivery, a proven
  law-calibration loop classic never had, and measurement where classic
  had assertion: recall per repo, precision against classic's own
  suppression record, exemption counters with tripwires.
- **What would mean we failed:** any item under "What failure looks like";
  the deltas drifting into removing guarantees rather than re-carrying
  them; or this document going stale silently. It is enrolled in doc
  freshness; this refresh is its first content verification, and the
  `freshness.verified` field will make the next one mechanical.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability addressed:** the whole system, as one loop rather
  than a feature inventory.
- **Relevant classic files/systems:** cited per section above; the load-
  bearing reads were the ontology index, the runtime truth schema, the
  capability drift and scaffold modules, the context bundle schema, the
  real-time context handler, and the architecture docs generator with its
  intent memo.
- **What Rekon keeps:** every seam, with the preservation reclassification
  of diff gates and turn attribution, and classic's suppression record as
  the permanent precision gauntlet.
- **What Rekon redesigns:** the eight deltas, each cited to its classic
  source and its 2026 rationale; suppression became law calibration;
  static ground truth became living ground truth under `overruled`.
- **What Rekon does not port:** the bespoke context server transport, the
  baton SDK transport, the watcher (retirement executed), substring
  outcome matching, scattered thresholds, and the VS Code extension
  framing; each is superseded by a named delta rather than dropped
  silently.
- **How this advances the migration:** the forward flow exists, the return
  flow is proven, the scoreboard moves, and the remaining distance to
  parity is decomposed into named, owned work instead of hope.
