# StepCapabilityGraph

## Purpose

`StepCapabilityGraph` is the first artifact in the staged step / handoff
/ runtime graph spine. **StepCapabilityGraph v1 is expected workflow
topology.** It projects, from existing governed artifacts, a graph of
workflow/step nodes linked to the capabilities, files, and systems they
realize, with reserved placeholders for expected handoffs.

It is produced by **projection** from `EvidenceGraph` + `CapabilityMap
v2` (phrase-backed capabilities) + `CapabilityPhraseReport`, plus an
**optional** operator config at `.rekon/step-capability-map.json` used
only for grouping and labeling. Projection works with no config.

This artifact is workflow topology, not capability projection: **it is
not CapabilityMap v2.** `CapabilityMap v2` maps a capability to
subjects/systems; `StepCapabilityGraph` adds the step/workflow layer and
its edges on top, without mutating the map.

## What It Does Not Do

v1 is expected/static topology only:

- It **does not model runtime handoff coverage** — declared-vs-observed
  handoff comparison belongs to a later `HandoffCoverageReport`.
- It **does not detect runtime graph drift** — that belongs to a later
  `RuntimeGraphDriftReport`.
- It **does not create HandoffContract** — `handoffPlaceholders` is
  reserved and empty in v1; v1 declares no handoffs.
- It **does not create WorkOrder / VerificationPlan**.
- It **does not implement intent** — intent integration is deferred.
- It marks no execution readiness, ingests no runtime/handoff events,
  and mutates nothing (inputs or config).

## Produced By

- `@rekon/capability-model.buildStepCapabilityGraph`
- the `rekon step graph build` CLI command

## Inputs

- `EvidenceGraph` — substrate (files, symbols, ownership/capability
  hints).
- `CapabilityMap v2` — phrase-backed capabilities (verb/noun/domain) +
  v1 entries (capability → subjects/systems/evidence).
- `CapabilityPhraseReport` — optional; improves step labels / supplies
  eligible phrases when the map has no phrase-backed capabilities.
- `.rekon/step-capability-map.json` — optional operator config.

`StepCapabilityGraph` v1 **does not mutate** `EvidenceGraph`,
`CapabilityMap`, or `CapabilityPhraseReport`.

## Optional Config

`.rekon/step-capability-map.json` is **optional**; its absence is the
normal case. **Optional config is grouping/labeling only** — it may
group projected steps into named workflows, relabel steps, or merge
projected step clusters. It is not a source of truth for capabilities,
files, systems, or handoffs, cannot invent runtime coverage, cannot mark
drift resolved, and cannot mark execution readiness. The config is never
mutated.

```json
{
  "version": "0.1.0",
  "steps": [
    {
      "id": "fixture.create-user",
      "label": "Create User",
      "capabilities": [{ "verb": "create", "noun": "user" }],
      "paths": ["src/"],
      "systems": ["fixture"]
    }
  ]
}
```

Missing config is valid; invalid config fails clearly.

## Shape

- `source` — `evidenceGraphRef` / `capabilityMapRef` /
  `capabilityPhraseReportRef` (cited when read), `configPath`,
  `configHash`.
- `summary` — `steps`, `capabilityEdges`, `fileEdges`, `systemEdges`,
  `unresolvedCapabilities`, `handoffPlaceholders` (all recomputed from
  the arrays).
- `steps[]` — `{ id, label, source: "derived"|"configured"|"mixed",
  systems?, paths?, evidenceRefs }`.
- `capabilityEdges[]` — `{ id, stepId, capabilityId?,
  phraseCapabilityId?, verb, noun, domain?, confidence:
  "high"|"medium"|"low", source: "capability-map"|"phrase-report"|"config"|"mixed",
  evidenceRefs }`.
- `fileEdges[]` — `{ id, stepId, path, source:
  "evidence"|"config"|"mixed", evidenceRefs }`.
- `systemEdges[]` — `{ id, stepId, system, source:
  "capability-map"|"config"|"mixed", evidenceRefs }`.
- `handoffPlaceholders[]` — reserved; **empty in v1**.
- `unresolvedCapabilities[]` — capabilities that could not be safely
  assigned to a step.

## Projection / Matching

Steps come from config (when present) and from domain groupings of
phrase-backed capabilities. A capability is assigned to a configured
step by a deterministic match order: **capability (verb+noun, optional
domain) > path prefix > system > config order > id ascending**. A
configured step that absorbs a non-declared (path/system) capability
becomes `mixed`. A capability with no configured match and no domain is
emitted as an `unresolvedCapability`. Configured nodes whose capabilities
all matched by declaration stay `configured`; pure domain-derived nodes
are `derived`.

## CLI Surface

```sh
rekon step graph build [--root <path>] [--json]
rekon step graph build [--evidence-graph <ref>] [--capability-map <ref>] [--phrase-report <ref>] [--json]
```

Reads the latest (or pinned) `EvidenceGraph` + `CapabilityMap` +
`CapabilityPhraseReport` and the optional config, writes a
`StepCapabilityGraph` under `.rekon/artifacts/graphs/`, and prints a
summary stating that no runtime coverage, drift, `WorkOrder`, or
`VerificationPlan` artifacts were created.

## Boundary Summary

- **StepCapabilityGraph v1 is expected workflow topology.**
- **It is not CapabilityMap v2.**
- It does not model runtime handoff coverage.
- It does not detect runtime graph drift.
- It does not create HandoffContract.
- It does not create WorkOrder / VerificationPlan.
- It does not implement intent.
- Optional config is grouping/labeling only.

## Cross-References

- [Step capability graph concept](../concepts/step-capability-graph.md)
- [StepCapabilityGraph v1 decision](../strategy/step-capability-graph-v1-decision.md)
- [StepCapabilityGraph / HandoffContract architecture decision](../strategy/step-capability-handoff-architecture-decision.md)
- [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md)
- [EvidenceGraph artifact](evidence-graph.md)
- [CapabilityMap artifact](capability-map.md)
- [CapabilityPhraseReport artifact](capability-phrase-report.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [StepCapabilityGraph safety review](../strategy/step-capability-graph-safety-review.md) — declares StepCapabilityGraph v1 safe / stable as expected workflow topology (not CapabilityMap v2, not runtime truth; no handoff coverage / drift / HandoffContract / WorkOrder / VerificationPlan / intent).

> See also: [HandoffContract v1 decision](../strategy/handoff-contract-v1-decision.md) — the next spine layer: declares expected baton passes over StepCapabilityGraph step ids as a config + artifact effective contract (no handoff coverage / runtime events / drift in v1).

> See also: [HandoffContract artifact](handoff-contract.md) — the declared baton policy layer over StepCapabilityGraph step ids (config + artifact effective contract; declared / unresolved-step only; no handoff coverage / runtime events / drift in v1).
