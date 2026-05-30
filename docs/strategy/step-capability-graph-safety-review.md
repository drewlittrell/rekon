# StepCapabilityGraph Safety Review

## Decision Summary

`StepCapabilityGraph` v1 (shipped at `783b7df`) is **safe / stable as an
expected workflow topology graph**. It projects, from `EvidenceGraph` +
`CapabilityMap v2` + `CapabilityPhraseReport` (+ an optional grouping /
labeling config), a graph of step nodes and their capability / file /
system edges, and nothing more.

**StepCapabilityGraph is expected workflow topology, not runtime truth.**
**StepCapabilityGraph is workflow topology, not CapabilityMap v2.**
**Optional .rekon/step-capability-map.json config is grouping/labeling
only.** The artifact creates no other artifacts and mutates nothing:
**StepCapabilityGraph v1 does not create HandoffContract.**
**StepCapabilityGraph v1 does not model handoff coverage.**
**StepCapabilityGraph v1 does not detect runtime graph drift.**
**StepCapabilityGraph v1 does not create WorkOrder or VerificationPlan.**
**Intent implementation remains deferred.**

This review finds **no blocker**. The recommended next slice is the
**HandoffContract architecture / v1 decision** — the expected
step/capability topology now exists, so the next layer should decide the
declared baton policy over those step ids.

| Surface | Status | Boundary |
| --- | --- | --- |
| StepCapabilityGraph artifact | shipped | expected workflow topology |
| step graph build CLI | shipped | writes graph only |
| .rekon/step-capability-map.json | optional | grouping/labeling only |
| handoff placeholders | reserved | no declared handoffs |

## Why This Review Exists

`StepCapabilityGraph` is Rekon's first workflow-topology artifact. It
sits between capability projection (`CapabilityMap`) and the future
handoff / runtime / intent layers reserved by the
[architecture decision](step-capability-handoff-architecture-decision.md).
Before it is used to design `HandoffContract`, Rekon needs a safety
review confirming v1 does not overclaim runtime truth, handoff coverage,
runtime drift, or intent readiness — and that the optional config has not
quietly become a manual-admin source of truth.

## Artifact And CLI Reviewed

Grounded by re-reading the shipped slice-62 implementation:

- **Type shape** (`@rekon/kernel-repo-model`): `StepCapabilityGraph`
  carries `source` (input refs + config path/hash), a `summary` (six
  counts), `steps[]`, `capabilityEdges[]`, `fileEdges[]`,
  `systemEdges[]`, `handoffPlaceholders[]`, and
  `unresolvedCapabilities[]`.
- **Factory** `createStepCapabilityGraph`: dedupes steps/edges by id,
  sorts deterministically, recomputes the summary from the arrays, and
  asserts the schema. A caller cannot persist a stale summary.
- **Validator / assert / schema**
  `validateStepCapabilityGraph` validates the header, source refs, every
  node/edge (id uniqueness, enums, evidenceRefs), and re-derives the
  summary counts — **rejecting any artifact whose summary does not match
  its arrays**.
- **Helper** `buildStepCapabilityGraph` reads `EvidenceGraph` /
  `CapabilityMap` / `CapabilityPhraseReport` structurally (Like types;
  no new dependency), projects steps + edges, and emits
  `handoffPlaceholders: []`. It reads no source files, makes no network
  calls, and mutates nothing.
- **Config parser** `parseStepCapabilityGraphConfig` validates an
  optional config and throws clear errors on invalid input; missing
  config is valid. The config is never mutated.
- **CLI** `rekon step graph build [--root] [--json] [--evidence-graph]
  [--capability-map] [--phrase-report]` writes one `StepCapabilityGraph`
  under `.rekon/artifacts/graphs/` and prints "No runtime coverage,
  drift, WorkOrder, or VerificationPlan artifacts were created."

## Projection / Topology Boundary Review

The artifact adds a step/workflow layer with `step→capability`
(`realizes`), `step→file` (`touches`), and `step→system` edges on top of
existing capability projection. It never rewrites `CapabilityMap`.
**StepCapabilityGraph is workflow topology, not CapabilityMap v2** — the
map answers "what capabilities exist and where"; the graph answers "which
steps realize them, through which files and systems." It is static and
projected: **StepCapabilityGraph is expected workflow topology, not
runtime truth.** Runtime grounding is a reserved (empty) concern for a
later `RuntimeGraphObservationReport`.

## Optional Config Review

`.rekon/step-capability-map.json` is optional; its absence is the normal
case (projection works without it). When present it may only group,
relabel, or merge projected steps. **Optional .rekon/step-capability-map.json
config is grouping/labeling only** — it is not a source of truth for
capabilities, files, systems, or handoffs; it cannot invent runtime
coverage, mark drift resolved, or mark execution readiness; and it is
never mutated (the CLI reads it, hashes it for citation, and writes only
the graph). Invalid config fails clearly, so it cannot silently corrupt
the projection.

## Matching And Unresolved Capability Review

Capability → step assignment is deterministic and conservative.

| Rule | V1 Behavior |
| --- | --- |
| capability match | highest priority |
| path match | second priority |
| system match | third priority |
| config order | deterministic tie-break |
| id asc | final tie-break |
| unsafe assignment | unresolvedCapabilities |

A capability attaches to a configured step by declared capability
(verb+noun, optional domain) first, then path prefix, then system; ties
break by config order then id ascending. A capability that matches no
configured step and has no domain grouping is recorded in
`unresolvedCapabilities` rather than force-fit to an arbitrary step —
the safe default. File and system edges cite evidence refs (or carry a
`config` source for config-declared edges), so every edge is traceable.
Determinism is sufficient for v1: the same inputs always produce the same
graph, which the factory + validator enforce.

## Handoff / Runtime Boundary Review

`handoffPlaceholders` is reserved and **empty in v1**; the helper emits
`[]`. **StepCapabilityGraph v1 does not create HandoffContract.**
**StepCapabilityGraph v1 does not model handoff coverage.**
**StepCapabilityGraph v1 does not detect runtime graph drift.** No
runtime / handoff events are read, no observed runtime graph is built,
and no expected-vs-observed comparison is performed — those belong to the
later `HandoffContract`, `HandoffCoverageReport`,
`RuntimeGraphObservationReport`, and `RuntimeGraphDriftReport` layers.
The artifact also creates no other governed artifacts:
**StepCapabilityGraph v1 does not create WorkOrder or VerificationPlan.**

| Boundary | Decision |
| --- | --- |
| StepCapabilityGraph vs CapabilityMap v2 | topology vs projection |
| StepCapabilityGraph vs HandoffContract | no declared baton policy |
| StepCapabilityGraph vs HandoffCoverageReport | no coverage |
| StepCapabilityGraph vs RuntimeGraphObservationReport | no runtime observation |
| StepCapabilityGraph vs RuntimeGraphDriftReport | no drift detection |
| StepCapabilityGraph vs WorkOrder / VerificationPlan | no task/proof artifact creation |
| StepCapabilityGraph vs intent | prerequisite only |

## Intent Boundary Review

**Intent implementation remains deferred.** The v1 shape is chosen so a
future `intent:assess` / `intent:prepare` can attach steps and
capabilities once the artifact exists, but v1 itself runs no intent
phase, makes no actionability judgement, and gates nothing. The graph is
a prerequisite for intent parity, not an intent implementation.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable topology | selected | bounded expected graph |
| HandoffContract decision next | selected | next layer after topology |
| more StepCapabilityGraph dogfood first | deferred | tests + smoke sufficient for safety |
| publication surfacing next | deferred | HandoffContract boundary should come first |
| runtime observation next | rejected | handoff policy missing |

## Recommendation

`StepCapabilityGraph` v1 is safe/stable as expected workflow topology
(no blocker). Proceed to the **HandoffContract architecture / v1
decision**: now that the expected step/capability topology exists, decide
the declared baton policy over those step ids before any coverage,
runtime observation, or drift work.

## What This Does Not Do

This is a read-only review. It changes no runtime behavior, mutates no
artifact (`EvidenceGraph` / `CapabilityMap` / `CapabilityPhraseReport` /
the config), creates no `HandoffContract`, `HandoffCoverageReport`,
`RuntimeGraphObservationReport`, `RuntimeGraphDriftReport`, `WorkOrder`,
or `VerificationPlan`, infers no runtime truth / coverage / drift, starts
no intent implementation, writes no source files, publishes nothing to
npm, and bumps no version.

## Follow-Up Work

- HandoffContract architecture / v1 decision (next).
- Deferred to later, separately-decided slices: `HandoffContract`
  implementation, `HandoffCoverageReport`, `RuntimeGraphObservationReport`,
  `RuntimeGraphDriftReport`, intent implementation, `WorkOrder` /
  `VerificationPlan` creation, and source writes.
- Optional: richer step derivation and glob path matching can refine the
  projection later without changing the artifact type.

## Cross-References

- [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md)
- [Step capability graph concept](../concepts/step-capability-graph.md)
- [StepCapabilityGraph v1 decision](step-capability-graph-v1-decision.md)
- [StepCapabilityGraph / HandoffContract architecture decision](step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [EvidenceGraph artifact](../artifacts/evidence-graph.md)
- [CapabilityMap artifact](../artifacts/capability-map.md)
- [CapabilityPhraseReport artifact](../artifacts/capability-phrase-report.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [HandoffContract v1 decision](handoff-contract-v1-decision.md) — the next spine layer: declares expected baton passes over StepCapabilityGraph step ids as a config + artifact effective contract (no handoff coverage / runtime events / drift in v1).
