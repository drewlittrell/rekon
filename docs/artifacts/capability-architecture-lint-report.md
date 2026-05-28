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

A future explicit bridge slice may promote selected
`violation` rows through the finding lifecycle (likely
into `FindingReport` via a deliberate write-path). Until
that slice ships:

- `findingCandidate` stays a preview only.
- Nothing in the lint report flows into
  `CoherencyDelta` or the remediation queue.
- The filter-aware lifecycle (see
  [../concepts/graph-aware-finding-filters.md](../concepts/graph-aware-finding-filters.md))
  is not bypassed.

## Cross-References

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
