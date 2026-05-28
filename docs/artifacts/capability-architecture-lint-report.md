# CapabilityArchitectureLintReport

`CapabilityArchitectureLintReport` is Rekon's first
capability-aware **evaluation** artifact. It records
whether each configured `CapabilityContract` row's
placement policy holds against the currently projected
`CapabilityMap` v2 phrase-backed capabilities.

> **Evaluation, not enforcement.**
> `CapabilityArchitectureLintReport` is **not**
> `FindingReport` in v1. It does **not** mutate
> `FindingReport`, `FindingFilterReport`,
> `FindingLifecycleReport`, or `CoherencyDelta`. It does
> **not** add resolver routing, verification planning, or
> source writes. A future explicit bridge slice may
> promote selected rows through the finding lifecycle,
> but no bridge ships in v1. See
> [../strategy/capability-aware-architecture-linting-decision.md](../strategy/capability-aware-architecture-linting-decision.md).

## What V1 Evaluates

V1 evaluates **configured** contract rows against four
placement rules:

- `allowed-layer`
- `forbidden-layer`
- `allowed-system`
- `forbidden-system`

Neighbor and preservation rules are deferred.
`required-check` rows are reserved in the row schema but
are not evaluated in v1.

## Row Statuses

Each evaluated rule produces one row with one of three
statuses:

| Status | Meaning |
| --- | --- |
| `pass` | Phrase-backed capability satisfies the policy. |
| `violation` | Phrase-backed capability breaks the policy. |
| `not-evaluated` | V1 cannot deterministically evaluate (no `layer`, no system field, missing phrase-backed). |

Only `violation` rows carry a `findingCandidate` preview
payload. The preview is **not** a `FindingReport` row;
nothing is written to the finding lifecycle.

## Severity And Confidence

| Outcome | Severity | Confidence |
| --- | --- | --- |
| `pass` | low | high |
| `violation` (layer) | high | high |
| `violation` (system) | not-applicable | n/a (system rules emit `not-evaluated` in v1) |
| `not-evaluated` | low | low |

## Shape

```json
{
  "header": {
    "schemaVersion": "0.1.0",
    "artifactType": "CapabilityArchitectureLintReport",
    "artifactId": "capability-architecture-lint-<ts>",
    "inputRefs": [
      { "type": "CapabilityContract", "id": "..." },
      { "type": "CapabilityMap", "id": "..." }
    ]
  },
  "source": {
    "capabilityContractRef": { "type": "CapabilityContract", "id": "..." },
    "capabilityMapRef": { "type": "CapabilityMap", "id": "..." }
  },
  "summary": {
    "total": 4,
    "violations": 1,
    "passes": 2,
    "notEvaluated": 1,
    "byRule": { "allowed-layer": 2, "forbidden-layer": 1, "allowed-system": 1 },
    "bySeverity": { "low": 3, "high": 1 }
  },
  "rows": [
    {
      "id": "rule.invoice:allowed-layer",
      "contractId": "rule.invoice",
      "phraseCapabilityId": "capability-phrase:phrase-001",
      "rule": "allowed-layer",
      "status": "pass",
      "severity": "low",
      "confidence": "high",
      "message": "...",
      "evidenceRefs": [{ "type": "CapabilityMap", "id": "..." }]
    },
    {
      "id": "rule.violate:allowed-layer",
      "contractId": "rule.violate",
      "phraseCapabilityId": "capability-phrase:phrase-002",
      "rule": "allowed-layer",
      "status": "violation",
      "severity": "high",
      "confidence": "high",
      "message": "...",
      "evidenceRefs": [{ "type": "CapabilityMap", "id": "..." }],
      "findingCandidate": {
        "title": "...",
        "category": "capability_architecture_policy",
        "severity": "high"
      }
    }
  ]
}
```

## CLI

```sh
rekon capability lint architecture \
  [--capability-contract <id|type:id>] \
  [--capability-map <id|type:id>] \
  [--root <path>] [--json]
```

The command:

- Reads the latest (or pinned) `CapabilityContract` and
  `CapabilityMap`.
- Writes a `CapabilityArchitectureLintReport` evaluation
  artifact under `.rekon/artifacts/findings/`.
- Prints a summary.
- **Never** writes `FindingReport`, mutates
  `FindingLifecycleReport`, or mutates `CoherencyDelta`.
- **Never** mutates `CapabilityContract` or
  `CapabilityMap`.

## Producer

`buildCapabilityArchitectureLintReport` in
`@rekon/capability-model`. Pure helper over JSON input
plus an `ArtifactRef` pair. No source reads, no network,
no LLM.

## Publication Surfacing

The architecture summary and agent contract publications
surface the latest `CapabilityArchitectureLintReport` as
**read-only** operator/agent visibility (fortieth slice).
Both publishers read the latest lint report, render a
`Capability Architecture Linting` section (summary +
bounded row table), and cite the report in
`header.inputRefs`. The helper is
`buildCapabilityArchitectureLintPublicationSection` in
`@rekon/capability-docs`.

Publications are strictly read-only:

- They **never** run `rekon capability lint architecture`.
- They **never** mutate the lint report,
  `CapabilityContract`, `CapabilityMap`, `FindingReport`,
  `FindingFilterReport`, `FindingLifecycleReport`, or
  `CoherencyDelta`.
- `findingCandidate` stays **preview-only** in the
  rendered surface — no `FindingReport` is written.

**Proof-report surfacing is deferred.**
`CapabilityArchitectureLintReport` is policy-evaluation
context, not verification proof, so the proof-report
publication does not surface it.

The
[`CapabilityArchitectureLintReport` publication safety
review](../strategy/capability-architecture-lint-publication-safety-review.md)
(forty-first slice) declares this surfacing **safe /
stable as read-only visibility** and selects the
`CapabilityArchitectureLintReport` → `FindingReport`
bridge decision as the next slice.

## Boundary Invariants

- V1 evaluates configured `CapabilityContract` rows only.
- V1 evaluates `allowed/forbidden layer` and
  `allowed/forbidden system` rules only.
- Neighbor and preservation rules are deferred to later
  slices.
- `FindingReport`, `FindingFilterReport`,
  `FindingLifecycleReport`, and `CoherencyDelta` are not
  mutated.
- Resolver routing does not ship.
- Verification planning does not ship.
- Source writes do not ship.
- `findingCandidate` is a preview payload; no
  `FindingReport` rows are authored.

## Future Finding Bridge

The
[`CapabilityArchitectureLintReport` → `FindingReport`
bridge decision](../strategy/capability-lint-finding-bridge-decision.md)
(forty-second slice) selects **Option B**: an
intermediate
[`CapabilityLintFindingBridgeReport`](capability-lint-finding-bridge-report.md)
**preview** artifact classifies eligible `violation` rows
before any `FindingReport` writer exists. That bridge
report **shipped in the forty-third slice** (preview-only;
see also the
[capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)).
Whether the bridge has run or not:

- `findingCandidate` stays a preview only.
- Nothing in the lint report flows into
  `CoherencyDelta` or the remediation queue.
- The filter-aware lifecycle (see
  [../concepts/graph-aware-finding-filters.md](../concepts/graph-aware-finding-filters.md))
  is not bypassed.

The bridge report writes no `FindingReport` and mutates no
governance artifact (`FindingFilterReport`,
`FindingLifecycleReport`, `IssueAdjudicationReport`,
`CoherencyDelta`); it creates no `WorkOrder` /
`VerificationPlan`. Only a separate explicit `FindingReport`
writer decision may promote bridge candidates to governed
findings, and `FindingLifecycleReport` /
`IssueAdjudicationReport` / `CoherencyDelta` remain
downstream stages.

## Cross-References

- [CapabilityLintFindingBridgeReport artifact](capability-lint-finding-bridge-report.md)
  — forty-third slice; the preview bridge artifact that
  classifies these lint rows as eligible / ineligible /
  needs-review for a future `FindingReport` writer. Preview,
  not `FindingReport`.
- [Capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)
- [Capability-Aware Architecture Linting Safety Review (strategy)](../strategy/capability-architecture-lint-report-safety-review.md)
  — thirty-ninth slice; declares v1 safe / stable as a
  separate evaluation artifact and selects publication
  surfacing (not a finding bridge) as the next slice.
- [Capability-aware architecture linting decision (strategy)](../strategy/capability-aware-architecture-linting-decision.md)
- [Capability-aware architecture linting concept](../concepts/capability-aware-architecture-linting.md)
- [CapabilityContract artifact](capability-contract.md)
- [CapabilityContract concept](../concepts/capability-contracts.md)
- [CapabilityMap artifact](capability-map.md)
- [CapabilityPhraseReport artifact](capability-phrase-report.md)
- [FindingReport artifact](finding-report.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
- [Roadmap](../strategy/roadmap.md)
