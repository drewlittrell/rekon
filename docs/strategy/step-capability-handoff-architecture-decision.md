# StepCapabilityGraph / HandoffContract Architecture Decision

## Decision Summary

This decision sets the Rekon-native architecture for the classic
step-capability graph and baton / handoff contract system surfaced by
the [Classic Step-Capability / Handoff / Runtime Drift Parity
Audit](classic-step-capability-handoff-runtime-drift-parity-audit.md) at
`b29004e`.

**Select Option B — a staged step/handoff/runtime graph spine.** Rekon
introduces five reserved artifacts in a deliberate sequence:
(1) `StepCapabilityGraph`, (2) `HandoffContract`,
(3) `HandoffCoverageReport`, (4) `RuntimeGraphObservationReport`,
(5) `RuntimeGraphDriftReport`. Each is a distinct layer with its own
boundary; none replaces an existing artifact.

Critically, **the spine does not start with runtime drift.** Runtime
drift is only meaningful once an *expected* graph (`StepCapabilityGraph`
+ `HandoffContract`) and an *observed* graph
(`RuntimeGraphObservationReport`) both exist. Starting at drift (Option
C) is rejected for that reason.

The layer boundaries are pinned: **StepCapabilityGraph is workflow
topology, not CapabilityMap v2.** **HandoffContract is declared baton
policy, not WorkOrder.** **HandoffCoverageReport is handoff-event
coverage, not VerificationRun command success.** **RuntimeGraphDriftReport
is runtime graph drift, not PathFreshnessReport or artifact lineage
freshness.** **Intent parity depends on StepCapabilityGraph,
HandoffContract, HandoffCoverageReport, and RuntimeGraphDriftReport.**

This is a decision-only batch. **No runtime behavior changes ship in
this decision.**

## Why This Decision Exists

The parity audit found that Rekon has *adjacent* foundations
(`EvidenceGraph`, `CapabilityMap v2`, `CapabilityContract`,
`CapabilityArchitectureLintReport`, `FindingReport`, `VerificationPlan` /
`VerificationRun`, `WorkOrder`, `PathFreshnessReport`) but no
step/workflow graph, no declared handoff contracts verified against
observed runtime handoff events, and no runtime-observed graph drift
signal. Classic codebase-intel treated these as first-class,
runtime-grounded subsystems. Intent work (`intent:assess` / `prepare` /
`status` / `go`) will be incomplete until Rekon models them.

Rather than implement five artifacts at once — or fold them into
existing artifacts and lose their boundaries — this decision fixes the
*sequence* and the *responsibilities* so each future implementation
slice has a clear, bounded target.

## Classic Audit Findings

From the parity audit (read-only prior art; no classic code imported):

- **Step-capability graph** — classic built a `step-capability-map.yaml`
  into a graph of `step` / `capability` / `file` nodes with
  `step→capability` (`owns`) and `step→file` (`implements`) edges,
  runtime-grounded with execution stats. A two-layer query model, not a
  flat capability map.
- **Baton / handoff** — a Baton SDK recorded runtime events into a
  `RuntimeTruthGraph` DAG; capability contracts declared `handoffs[]`
  (e.g. `"api->service"`); handoff nodes/edges carried a
  `handoffContractId`.
- **Handoff coverage** — declared handoffs were compared to evidence,
  producing `intact` / `broken` / `added` / `removed` statuses and
  `handoff_broken` violations.
- **Runtime drift** — a base-vs-head `EvidenceGraph` change report
  layered over the observed runtime-truth graph; distinct from
  single-point freshness.
- **Derive / step-handler validation** — purity gates and conductor
  config shape (`state{schema, derive, adapter}`).

The audit reserved `StepCapabilityGraph`, `HandoffContract`,
`HandoffCoverageReport`, `RuntimeGraphObservationReport`,
`RuntimeGraphDriftReport` and flagged `DerivedGraphValidationReport` /
`StepHandlerValidationReport` for evaluation. This decision acts on those
reservations.

## Current Rekon Boundary

- `EvidenceGraph` — observed facts about a repo (the substrate).
- `CapabilityMap v2` — projects capabilities to subjects/systems. **No
  step/workflow nodes, no handoff edges.**
- `CapabilityContract` — capability-level expectations/outcomes. **Not a
  cross-system baton topology.**
- `WorkOrder` — a remediation task instruction. **Not a declared
  workflow/handoff policy.**
- `VerificationPlan` / `VerificationRun` — proof commands and their
  results. **Not handoff-event coverage.**
- `PathFreshnessReport` — source-fingerprint / lineage staleness at a
  single point. **Not a runtime-observed graph diff.**

The new spine slots *beside* these, not inside them.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| current CapabilityMap / CapabilityContract enough | rejected | classic parity gap remains |
| staged step/handoff/runtime graph spine | selected | preserves boundaries |
| start with RuntimeGraphDriftReport | rejected | expected graph missing |
| fold handoffs into WorkOrder / VerificationPlan | rejected | handoffs are workflow topology |
| fold StepCapabilityGraph into CapabilityMap v2 | rejected | capability projection is not workflow topology |

- **Option A — current CapabilityMap / CapabilityContract are enough.**
  Rejected: the classic parity audit proved this subsystem is not
  accounted for by `CapabilityMap` / `CapabilityContract`.
- **Option B — staged step/handoff/runtime graph spine.** Selected:
  preserves layer boundaries and builds runtime drift on an expected
  graph + an observed graph.
- **Option C — start with RuntimeGraphDriftReport.** Rejected: no
  expected step/handoff graph exists yet, so drift has nothing to compare
  against.
- **Option D — fold handoffs into WorkOrder / VerificationPlan.**
  Rejected: handoff contracts are system/workflow topology, not task
  instructions or proof commands.
- **Option E — fold StepCapabilityGraph into CapabilityMap v2.**
  Rejected: `CapabilityMap` is capability projection;
  `StepCapabilityGraph` is workflow topology.

## Recommendation

Adopt **Option B**: introduce the staged step/handoff/runtime graph
spine. The memo **selects the staged step/handoff/runtime graph spine**
and fixes the build order below. Do not start with runtime drift.

| Artifact | Sequence | Reason |
| --- | ---: | --- |
| StepCapabilityGraph | 1 | expected workflow/capability topology first |
| HandoffContract | 2 | declared baton policy over steps |
| HandoffCoverageReport | 3 | coverage against declared handoffs |
| RuntimeGraphObservationReport | 4 | observed runtime graph |
| RuntimeGraphDriftReport | 5 | expected-vs-observed drift |

The boundary contract for the whole spine:

| Boundary | Decision |
| --- | --- |
| StepCapabilityGraph vs CapabilityMap v2 | workflow topology vs capability projection |
| HandoffContract vs WorkOrder | declared baton policy vs task instruction |
| HandoffCoverageReport vs VerificationRun | handoff-event coverage vs command proof |
| RuntimeGraphDriftReport vs PathFreshnessReport | runtime graph drift vs working-tree freshness |
| RuntimeGraphDriftReport vs artifact freshness | runtime graph drift vs input lineage freshness |

## StepCapabilityGraph Model

Maps workflow/step nodes to capabilities, systems, files, and handoff
edges. It is the *expected* topology layer.

- **Inputs:** `EvidenceGraph`, `CapabilityMap v2`,
  `CapabilityPhraseReport`, and an optional operator config /
  classic-style step map.
- **Outputs:** step nodes; capability edges (step → capability);
  file/system edges (step → file / system); and expected handoff edge
  *placeholders* (filled by `HandoffContract`).

**StepCapabilityGraph is workflow topology, not CapabilityMap v2.**
`CapabilityMap v2` answers "what capabilities exist and where"; the graph
answers "which steps/workflows realize them, through which files and
systems, and where they hand off."

## HandoffContract Model

Declares the expected baton passes between steps / capabilities /
systems. It is *declared policy*, not observation.

- **Inputs:** operator config; `StepCapabilityGraph`.
- **Outputs:** declared handoffs; expected feature / capability ids;
  expected from/to nodes; expected event identity / payload-shape
  metadata.

**HandoffContract is declared baton policy, not WorkOrder.** A
`WorkOrder` says "do this task"; a `HandoffContract` says "this boundary
transition is expected to occur" — topology, not instruction.

## HandoffCoverageReport Model

Compares declared `HandoffContract` entries against observed handoff
events.

- **Inputs:** `HandoffContract`; `RuntimeGraphObservationReport` (or a
  raw handoff-event log).
- **Outputs:** `intact`, `broken`, `added`, `removed`, `uncovered`.

**HandoffCoverageReport is handoff-event coverage, not VerificationRun
command success.** A green `VerificationRun` proves a command exited 0;
coverage proves every *declared* boundary transition was actually
observed and remains intact.

## RuntimeGraphObservationReport Model

Records the observed runtime step/handoff graph from baton events, smoke
traces, or other supported runtime event sources. It is the *observed*
layer (the counterpart to the expected `StepCapabilityGraph`).

- **Inputs:** handoff events / runtime traces.
- **Outputs:** observed runtime nodes; observed runtime edges; event
  coverage; timestamps / source refs.

It records what actually ran; it makes no judgement on its own. Drift is
computed downstream.

## RuntimeGraphDriftReport Model

Compares the expected `StepCapabilityGraph` / `HandoffContract` against
the `RuntimeGraphObservationReport` (and/or base/head observed graphs).

- **Inputs:** `StepCapabilityGraph`; `HandoffContract`;
  `RuntimeGraphObservationReport`; optional base/head comparison.
- **Outputs:** missing expected edges; added runtime edges; removed
  runtime edges; changed capability-to-step links; unresolved drift.

**RuntimeGraphDriftReport is runtime graph drift, not PathFreshnessReport
or artifact lineage freshness.** `PathFreshnessReport` asks "is the
working tree newer than the artifacts?"; drift asks "does what actually
ran match the expected workflow/handoff topology?" — two different
questions.

## Intent Impact

**Intent parity depends on StepCapabilityGraph, HandoffContract,
HandoffCoverageReport, and RuntimeGraphDriftReport.** Without them,
intent cannot know a repo's steps, handoffs, coverage, or runtime drift
state.

| Intent Surface | Impact |
| --- | --- |
| intent:assess | can assess missing step/handoff/drift context |
| intent:prepare | can attach steps, capabilities, handoffs, and gates |
| intent:status | can report handoff coverage and runtime drift |
| intent:go | must gate execution when unresolved runtime drift exists |

## What This Does Not Do

This decision implements no artifact, registers no artifact type, adds no
CLI command, mutates no existing schema, changes no runtime behavior,
continues no lifecycle / `CoherencyDelta` integration, and starts no
intent implementation. It imports nothing from classic codebase-intel.
It bumps no version and publishes nothing. **No runtime behavior changes
ship in this decision.**

## Implementation Sequence

1. **StepCapabilityGraph v1 decision** — artifact shape + inputs
   (`EvidenceGraph`, `CapabilityMap v2`, `CapabilityPhraseReport`,
   optional operator step-map config). Still no runtime handoff coverage,
   no drift, no intent implementation.
2. **StepCapabilityGraph v1** — implement the expected topology artifact.
3. **HandoffContract decision + v1** — declared baton policy over steps.
4. **HandoffCoverageReport** — coverage against declared handoffs
   (initially against a supplied event log).
5. **RuntimeGraphObservationReport** — observed runtime graph ingestion
   (opt-in event sources; no always-on daemon).
6. **RuntimeGraphDriftReport** — expected-vs-observed drift.
7. Only then revisit `DerivedGraphValidationReport` /
   `StepHandlerValidationReport` and the intent spine integration.

## Cross-References

- [Classic step-capability / handoff / runtime drift parity audit](classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [Classic scanner / ontology parity audit](classic-scanner-ontology-parity-audit.md)
- [EvidenceGraph artifact](../artifacts/evidence-graph.md)
- [CapabilityMap artifact](../artifacts/capability-map.md)
- [CapabilityContract artifact](../artifacts/capability-contract.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [BridgeFindingLifecycleIntegrationReport artifact](../artifacts/bridge-finding-lifecycle-integration-report.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)

> See also: [StepCapabilityGraph v1 decision](step-capability-graph-v1-decision.md) — v1 is projection from EvidenceGraph + CapabilityMap v2 + CapabilityPhraseReport with an optional grouping/labeling config; expected workflow topology only (no runtime truth / handoff coverage / drift).

> See also: [StepCapabilityGraph artifact](../artifacts/step-capability-graph.md) — the first artifact in the staged step/handoff/runtime graph spine: an expected workflow topology graph projected from EvidenceGraph + CapabilityMap v2 + CapabilityPhraseReport (+ optional grouping/labeling config). Not CapabilityMap v2; no runtime coverage / drift.

> See also: [StepCapabilityGraph safety review](step-capability-graph-safety-review.md) — declares StepCapabilityGraph v1 safe / stable as expected workflow topology (not CapabilityMap v2, not runtime truth; no handoff coverage / drift / HandoffContract / WorkOrder / VerificationPlan / intent).

> See also: [HandoffContract v1 decision](handoff-contract-v1-decision.md) — the next spine layer: declares expected baton passes over StepCapabilityGraph step ids as a config + artifact effective contract (no handoff coverage / runtime events / drift in v1).

> See also: [HandoffContract artifact](../artifacts/handoff-contract.md) — the declared baton policy layer over StepCapabilityGraph step ids (config + artifact effective contract; declared / unresolved-step only; no handoff coverage / runtime events / drift in v1).
