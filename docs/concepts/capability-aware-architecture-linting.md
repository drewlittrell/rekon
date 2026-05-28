# Capability-Aware Architecture Linting

Capability-aware architecture linting evaluates an
operator-authored `CapabilityContract` against the
currently projected `CapabilityMap` v2. The evaluation
output is `CapabilityArchitectureLintReport` — a
**separate** evaluation artifact that does **not** sit
inside Rekon's governed-findings pipeline in v1.

This concept page covers what the lint reports, what it
does **not** do, how it relates to other capability
artifacts, and how a future finding bridge could
promote selected rows.

## Where It Fits

The capability ontology stack (see
[capability-ontology.md](capability-ontology.md)):

1. `EvidenceGraph` — raw evidence facts.
2. `CapabilityNormalizationReport` — translation audit.
3. `CapabilityPhraseReport` — semantic capability
   phrases.
4. `CapabilityMap` (v1 + v2 phrase-backed) — capability
   projection.
5. `CapabilityContract` — operator-authored policy.
6. **`CapabilityArchitectureLintReport`** — policy
   evaluation. (This page.)
7. `RefactorPreservationContract` — future; not v1.

The lint sits between **policy** (`CapabilityContract`)
and **enforcement** (governed findings via
`FindingReport` / `FindingLifecycleReport` /
`CoherencyDelta`). It is an evaluation layer that
operators can inspect without ever bridging into the
finding lifecycle.

## What V1 Evaluates

V1 evaluates **configured** `CapabilityContract` rows
only against:

- `allowed-layer` rules — does the matched phrase-backed
  capability's `layer` appear in `allowedLayers`?
- `forbidden-layer` rules — does its `layer` appear in
  `forbiddenLayers`?
- `allowed-system` rules — currently `not-evaluated` (no
  deterministic system field on phrase-backed entries
  yet).
- `forbidden-system` rules — currently `not-evaluated`
  (same reason).

Rules that are deferred:

- `requiredNeighbors` / `forbiddenNeighbors`
- `preservationRules`
- `requiredChecks` (not promoted to enforced status in
  v1; verification execution remains a separate
  pipeline)

## What V1 Does Not Do

- Does **not** emit `FindingReport` rows.
- Does **not** mutate `FindingFilterReport`,
  `FindingLifecycleReport`, or `CoherencyDelta`.
- Does **not** add resolver routing by capability.
- Does **not** add verification planning by capability.
- Does **not** add `RefactorPreservationContract`.
- Does **not** add source writes.
- Does **not** read source files.
- Does **not** use LLM inference.

These boundary statements are mirrored in
[../strategy/capability-aware-architecture-linting-decision.md](../strategy/capability-aware-architecture-linting-decision.md).

## How To Run It

```sh
rekon capability lint architecture \
  [--capability-contract <id|type:id>] \
  [--capability-map <id|type:id>] \
  [--root <path>] [--json]
```

The command:

- Reads the latest `CapabilityContract` unless pinned by
  `--capability-contract`.
- Reads the latest `CapabilityMap` unless pinned by
  `--capability-map`.
- Writes a new `CapabilityArchitectureLintReport`
  artifact under `.rekon/artifacts/findings/`.
- Prints a one-screen summary.
- Says "No findings were written."

## Evaluation Model

For each `configured` `CapabilityContract` row:

1. Resolve `contractEntry.capabilityRef.phraseCapabilityId`
   against `CapabilityMap.phraseBackedCapabilities[]`.
2. If the phrase-backed entry is missing, emit one
   `not-evaluated` row per declared placement rule
   (low confidence).
3. For `allowed-layer` / `forbidden-layer`:
   - If the phrase-backed entry has no `layer`, emit
     `not-evaluated`.
   - Otherwise compare to the list and emit `pass` or
     `violation`.
4. For `allowed-system` / `forbidden-system`: emit
   `not-evaluated` with a diagnostic message. V1 does
   not invent system attribution.

`unmatched` contract rows are skipped — they exist
purely to surface config drift in `CapabilityContract`
and contribute nothing actionable to the lint.

## Severity And Confidence

Default v1 policy:

| Outcome | Severity | Confidence |
| --- | --- | --- |
| `pass` | low | high |
| `violation` (layer) | high | high |
| `not-evaluated` | low | low |

Operators can refine severity / confidence in a later
slice; the schema reserves the dimensions.

## Publication Surfacing

The architecture summary and agent contract publications
surface the latest `CapabilityArchitectureLintReport`
(fortieth slice) as **read-only visibility**. Both
publishers read the latest lint report, render a
`Capability Architecture Linting` section with the
summary counts and a bounded row table, and cite the
report in `header.inputRefs`.

The surfacing is strictly read-only and additive:

- Publications **never** run
  `rekon capability lint architecture`.
- Publications **never** mutate the lint report,
  `CapabilityContract`, `CapabilityMap`, `FindingReport`,
  `FindingFilterReport`, `FindingLifecycleReport`, or
  `CoherencyDelta`.
- `violation` rows are surfaced as policy-evaluation
  signals, not governed findings.
- `findingCandidate` stays **preview-only**; no
  `FindingReport` is written.
- `not-evaluated` rows are surfaced so agents understand
  Rekon lacks deterministic context for that rule rather
  than inferring a pass.

Surfacing does **not** imply resolver routing,
verification planning, `RefactorPreservationContract`, or
source writes — visibility is not enforcement.

**Proof-report surfacing is deferred.** The proof-report
publication does not surface
`CapabilityArchitectureLintReport`, because the lint
report is policy-evaluation context, not verification
proof.

## Finding Bridge (Future)

`violation` rows carry an optional `findingCandidate`
preview:

```json
"findingCandidate": {
  "title": "Capability \"compute invoice-preview\" placed on a forbidden layer \"route\".",
  "category": "capability_architecture_policy",
  "severity": "high"
}
```

This is **preview** payload only. A future explicit
bridge slice would:

- Decide if/when lint rows promote into governed
  findings.
- Decide which severity / confidence threshold a row
  must clear before it enters the finding lifecycle.
- Preserve the existing finding filter chain and
  adjudication review checkpoint.
- Keep `CapabilityArchitectureLintReport` as the
  evaluation source of truth, not a mutable derivative
  of `FindingReport`.

Until that slice ships, `CapabilityArchitectureLintReport`
remains a standalone evaluation artifact.

## Cross-References

- [Capability-Aware Architecture Linting Safety Review](../strategy/capability-architecture-lint-report-safety-review.md)
  — thirty-ninth slice; read-only audit declaring v1
  safe / stable. Confirms evaluation-only boundary,
  preview-only `findingCandidate`, and zero governance
  mutation; selects publication surfacing as the next
  slice.
- [CapabilityArchitectureLintReport artifact](../artifacts/capability-architecture-lint-report.md)
- [CapabilityContract artifact](../artifacts/capability-contract.md)
- [CapabilityContracts concept](capability-contracts.md)
- [CapabilityMap artifact](../artifacts/capability-map.md)
- [CapabilityPhraseReport artifact](../artifacts/capability-phrase-report.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Graph-aware finding filters concept](graph-aware-finding-filters.md)
- [Coherency delta concept](coherency-delta.md)
- [Capability ontology concept](capability-ontology.md)
- [Capability-aware architecture linting decision (strategy)](../strategy/capability-aware-architecture-linting-decision.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
