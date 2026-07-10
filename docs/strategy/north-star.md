# North Star

Rekon is an open-source intelligence substrate for codebases: evidence in,
typed artifacts out, extensible capabilities around a shared repository
intelligence snapshot.

Rekon exists because AI-assisted engineering needs grounded context that can be
audited. Agents and humans should be able to see where a recommendation came
from, which artifacts support it, which checks are required, and which actions
are only plans rather than proof.

## What Rekon Is

Rekon is a local-first system for building repository intelligence:

- Kernel packages define artifact, evidence, graph, snapshot, model, rulebook,
  and finding contracts.
- The SDK lets first-party and community capabilities register the same way.
- The runtime writes typed artifacts under `.rekon/`, validates artifact
  indexes, and builds snapshots.
- The CLI exposes the lifecycle to people and automation.
- Capabilities observe source, project models, evaluate policy, resolve
  context, publish guidance, record memory, prepare work, and reconcile
  artifact-first changes.

## What Rekon Is Not

Rekon is not a hosted SaaS product, marketplace, source-writing auto-fixer, or
closed agent orchestration system. It does not treat generated docs, memory, or
LLM output as canonical truth. Source-writing operations remain explicit and
permission-gated.

## Lifecycle

The full lifecycle is:

```text
Observe -> Normalize -> Model -> Govern -> Resolve -> Publish -> Act -> Learn -> Reconcile
```

The current CLI exposes this through `scan` and phase-specific commands such as
`observe`, `project`, `snapshot`, `evaluate`, `resolve`, `publish`, `memory`,
`intent`, `verify`, and `reconcile`.

## Artifact Hierarchy

- Canonical inputs: `EvidenceGraph`, runtime observations, configuration, and
  explicit human feedback.
- Derived models: `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, graph
  slices, and snapshots.
- Evaluations: rule results, finding reports, coherency deltas, and risk
  summaries.
- Resolved outputs: resolver packets, task context, work orders, and check
  plans.
- Publications: generated guidance, summaries, reports, and agent contracts.
- Actions: reconciliation plans, logs, verification records, and applied
  artifact changes.

## Architecture Rule

Lower layers may feed upper layers. Upper layers may not silently become
lower-layer truth.

Docs are publications, not canonical truth. Memory enriches resolver output; it
does not rewrite ownership or rule facts. Reconciliation is permissioned and
artifact-first.

## Open Source Principles

- Public package boundaries are intentional.
- Public APIs are documented before they are broadly depended on.
- Built-in capabilities use the same SDK as community capabilities.
- Generated artifacts include schema versioning, provenance, producer metadata,
  and declared inputs.
- Capabilities declare what they consume, produce, require, and invalidate.
- Rekon does not import from private reference repositories. Prior systems may
  inform fixtures and migration only as external data.
