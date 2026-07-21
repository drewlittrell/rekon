# North Star

Rekon is an open-source intelligence substrate for codebases: evidence in,
typed artifacts out, extensible capabilities around a shared repository
intelligence snapshot.

Rekon exists because AI-assisted engineering needs grounded context that can be
audited. Agents and humans should be able to see where a recommendation came
from, which artifacts support it, which checks are required, and which actions
are only plans rather than proof.

Its primary model-facing outcome is to give an engineering model the smallest
sufficient repository context for a correct, repository-native change while
preserving declared intent, architecture, and verification contracts. Findings
and opportunities are context signals within that system; universal bug-finding
parity is not the product objective.

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
- Rekon installs a bounded bootstrap in a managed repository's `AGENTS.md` so
  models know how to request current, task-shaped context through MCP or CLI.

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

The `AGENTS.md` bootstrap is an interface contract, not a repository snapshot.
Dynamic ownership, pacts, findings, and checks remain typed artifacts selected
for the task at hand.

## Open Source Principles

- Public package boundaries are intentional.
- Public APIs are documented before they are broadly depended on.
- Built-in capabilities use the same SDK as community capabilities.
- Generated artifacts include schema versioning, provenance, producer metadata,
  and declared inputs.
- Capabilities declare what they consume, produce, require, and invalidate.
- Rekon does not import from private reference repositories. Prior systems may
  inform fixtures and migration only as external data.
