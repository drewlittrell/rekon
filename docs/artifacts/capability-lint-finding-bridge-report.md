# CapabilityLintFindingBridgeReport

## Purpose

`CapabilityLintFindingBridgeReport` is a **preview** bridge
artifact between
[`CapabilityArchitectureLintReport`](capability-architecture-lint-report.md)
(policy evaluation) and the governed-findings pipeline. It
classifies each lint row as `eligible`, `ineligible`, or
`needs-review` for a future `FindingReport` writer, and attaches
a deterministic *proposed finding* to eligible rows.

**`CapabilityLintFindingBridgeReport` is preview, not
`FindingReport`.** It records *which lint rows could become
governed findings later* and *why*. It does not promote
anything. It implements **Option B** of the
[`CapabilityArchitectureLintReport` → `FindingReport` bridge
decision](../strategy/capability-lint-finding-bridge-decision.md):
an intermediate preview artifact ships before any direct
`FindingReport` writer.

## Produced By

- `@rekon/capability-model.buildCapabilityLintFindingBridgeReport`
- the `rekon capability lint bridge-findings` CLI command

## Consumed By

- Operators and agents inspecting which capability-architecture
  policy violations are candidates for governed findings.
- (Future) a separate, explicit `FindingReport` writer — gated
  behind its own decision and safety review. No such writer
  exists today.

## What It Does Not Do

This artifact is **preview, not enforcement**:

- The bridge **does not write `FindingReport`**. No bridge
  writes `FindingReport` today, and this report itself never
  does.
- The bridge **does not mutate `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`.**
- **`WorkOrder` / `VerificationPlan` creation is not included.**
  The bridge creates no `WorkOrder` and no `VerificationPlan`.
- It does **not** add resolver routing by capability.
- It does **not** add verification planning by capability.
- It does **not** add a `RefactorPreservationContract`.
- It does **not** read or write source files, and makes no
  network calls. Its only input is the
  `CapabilityArchitectureLintReport`.

**Only a later explicit writer decision may allow eligible
bridge candidates to become governed findings.** Even after such
a writer ships, promoted candidates would flow through the
graph-aware finding filters, the `FindingStatusLedger`, and
`IssueAdjudicationReport` like any other finding;
`FindingLifecycleReport` and `CoherencyDelta` remain downstream
lifecycle stages.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType`
is `CapabilityLintFindingBridgeReport`. `header.inputRefs` cites
the source `CapabilityArchitectureLintReport` (and the
`CapabilityContract` / `CapabilityMap` it referenced, when
present).

## Shape

- `source.lintReportRef` — the source
  `CapabilityArchitectureLintReport`.
- `source.capabilityContractRef` / `source.capabilityMapRef` —
  copied from the lint report's `source` when present.
- `summary.totalRows` / `eligible` / `ineligible` /
  `needsReview` — counts re-derived from `candidates`.
- `summary.byReason` / `summary.bySeverity` — deterministic,
  sorted count maps.
- `candidates[]` — one entry per lint row:
  - `id` — equals the source lint row id (unique within a lint
    report).
  - `lintRowId` — citation back to the lint row.
  - `contractId` / `phraseCapabilityId` — copied from the row.
  - `decision` — `eligible` | `ineligible` | `needs-review`.
  - `reason` — why the decision was made (see below).
  - `severity` / `confidence` — copied from the lint row.
  - `proposedFinding` — present for `eligible` and
    `needs-review` candidates only; absent for `ineligible`.
  - `messages` — optional human diagnostics.

## Eligibility Policy

A lint row is **`eligible`** only when *all* of the following
hold:

- `status === "violation"`;
- a `findingCandidate` preview exists on the row;
- `confidence` is `high` or `medium`;
- `severity` is `high` or `medium`;
- `evidenceRefs` is non-empty.

Otherwise the row is **`ineligible`** with the first matching
reason:

| Condition | Reason |
| --- | --- |
| `status === "pass"` | `not-a-violation` |
| `status === "not-evaluated"` | `not-evaluated` |
| violation, no `findingCandidate` | `missing-finding-candidate` |
| violation, low confidence | `low-confidence` |
| violation, low severity | `low-severity` |
| violation, empty `evidenceRefs` | `missing-evidence` |

A row is **`needs-review`** when its proposed finding id
collides with an earlier eligible row's
(`duplicate-candidate`). The `manual-review-required` reason is
reserved for future use.

## Proposed Finding Id

Eligible (and duplicate `needs-review`) candidates carry a
deterministic, slug-safe proposed finding id:

```text
capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>
```

The id carries **no timestamp** and is stable across runs. If
two distinct lint rows produce the same id, the deterministic
first keeps `eligible`; later duplicates flip to `needs-review`
with reason `duplicate-candidate`.

## CLI Surface

```sh
rekon capability lint bridge-findings [--root <path>] [--json]
rekon capability lint bridge-findings --lint-report <CapabilityArchitectureLintReport:id> [--json]
```

The command reads the latest (or pinned)
`CapabilityArchitectureLintReport`, writes a
`CapabilityLintFindingBridgeReport` under
`.rekon/artifacts/actions/`, and prints a summary. It says
**"No FindingReport entries were written."** It never writes
`FindingReport`, mutates lifecycle / `CoherencyDelta`, or
creates `WorkOrder` / `VerificationPlan`.

## Example

```json
{
  "header": {
    "artifactType": "CapabilityLintFindingBridgeReport",
    "artifactId": "capability-lint-finding-bridge-1780000000000",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-28T01:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-model", "version": "0.1.0" },
    "inputRefs": [
      { "type": "CapabilityArchitectureLintReport", "id": "capability-architecture-lint-1780000000000", "schemaVersion": "0.1.0" }
    ],
    "provenance": { "confidence": 0.85 }
  },
  "source": {
    "lintReportRef": { "type": "CapabilityArchitectureLintReport", "id": "capability-architecture-lint-1780000000000", "schemaVersion": "0.1.0" }
  },
  "summary": {
    "totalRows": 1,
    "eligible": 1,
    "ineligible": 0,
    "needsReview": 0,
    "byReason": { "violation-with-finding-candidate": 1 },
    "bySeverity": { "high": 1 }
  },
  "candidates": [
    {
      "id": "fixture.create-user:forbidden-layer",
      "lintRowId": "fixture.create-user:forbidden-layer",
      "contractId": "fixture.create-user",
      "phraseCapabilityId": "capability-phrase:create-user",
      "decision": "eligible",
      "reason": "violation-with-finding-candidate",
      "severity": "high",
      "confidence": "high",
      "proposedFinding": {
        "id": "capability-architecture-policy:forbidden-layer:fixture-create-user:capability-phrase-create-user",
        "title": "Capability \"create user\" placed on a forbidden layer \"route\".",
        "category": "capability_architecture_policy",
        "severity": "high",
        "evidenceRefs": [
          { "type": "CapabilityMap", "id": "capability-map-1780000000000", "schemaVersion": "0.1.0" }
        ],
        "sourceLintRowRef": {
          "report": { "type": "CapabilityArchitectureLintReport", "id": "capability-architecture-lint-1780000000000", "schemaVersion": "0.1.0" },
          "rowId": "fixture.create-user:forbidden-layer"
        }
      }
    }
  ]
}
```

## Publication Surfacing

The **architecture summary** and **agent contract** publications
surface the latest `CapabilityLintFindingBridgeReport`
(forty-fifth slice) as **read-only visibility**. Both publishers
read the latest bridge report, render a `Capability Lint Finding
Bridge` section (summary counts + a bounded candidate table +
the eligible / ineligible / needs-review guidance), and cite the
report in `header.inputRefs`.

The surfacing is strictly read-only and additive:

- Publications **read the latest
  `CapabilityLintFindingBridgeReport`**; they **never run
  `rekon capability lint bridge-findings`** (no bridge
  generation).
- Publications **do not write `FindingReport`** and **do not
  mutate `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, or `CoherencyDelta`**.
- Publications **do not create `WorkOrder` or
  `VerificationPlan`**.
- `eligible` candidates are surfaced as proposed governed-finding
  candidates only; `proposedFinding` stays **preview-only** and
  no `FindingReport` is written.
- Surfacing does **not** imply resolver routing, verification
  planning, `RefactorPreservationContract`, or **source writes**
  (it does not write source files).

**Proof-report surfacing is deferred.** The proof-report
publication does not surface `CapabilityLintFindingBridgeReport`,
because the bridge report is preview / governance-candidate
context, not verification proof.

## Cross-References

- [CapabilityLintFindingBridgeReport safety review](../strategy/capability-lint-finding-bridge-report-safety-review.md)
  — forty-fourth slice; read-only review declaring v1 **safe /
  stable as a preview bridge artifact**. Confirms the
  preview-not-FindingReport boundary, strict eligibility,
  deterministic duplicate handling + finding id, and zero
  governance / WorkOrder / VerificationPlan mutation; selects
  publication surfacing as the next slice (visibility only, no
  finding writes).
- [CapabilityLintFindingBridgeReport publication safety review](../strategy/capability-lint-finding-bridge-publication-safety-review.md)
  — forty-sixth slice; read-only review declaring the
  architecture summary + agent contract surfacing **safe /
  stable as read-only visibility**. Confirms publications read
  the latest report and never run bridge generation, write no
  `FindingReport`, mutate no governance artifact, and create no
  `WorkOrder` / `VerificationPlan`; selects the `FindingReport`
  writer decision as the next slice.
- [CapabilityLintFindingBridgeReport → FindingReport writer decision](../strategy/capability-lint-finding-writer-decision.md)
  — forty-seventh slice; selects **Option B** — a future,
  separate, opt-in `FindingReport` writer with a required dry-run
  preview and explicit confirmation. **The writer is not
  implemented**; no `FindingReport` is written. The writer would
  consume `eligible` bridge candidates, preserve the
  deterministic `proposedFinding` id, write a **new**
  `FindingReport` artifact (no in-place mutation), and leave the
  finding filters, lifecycle, adjudication, `CoherencyDelta`,
  `WorkOrder` / `VerificationPlan`, and source writes downstream
  and untouched. The **dry-run helper / CLI** (`rekon capability
  lint write-findings --dry-run`,
  `buildFindingReportWritePreview`) has since **shipped**
  (forty-eighth slice, preview only): it previews the proposed
  `FindingReport` body, writes no `FindingReport`, and rejects
  write-ish flags; write mode is deferred. The dry-run **safety
  review** (forty-ninth slice) declared the helper / CLI **safe /
  stable as preview-only writer modeling** (no blocker) and
  selected the writer mode decision next.
- [CapabilityLintFindingBridgeReport → FindingReport writer mode decision](../strategy/capability-lint-finding-writer-mode-decision.md)
  — fiftieth slice; selects **Option B** — a future, opt-in write
  mode behind `--confirm-finding-write` that reuses the dry-run
  preview and writes a **new** `FindingReport` only. **Not
  implemented**; `--write` / `--send` / `--execute` stay rejected,
  no existing `FindingReport` is mutated, and no governance
  artifact / `WorkOrder` / `VerificationPlan` is touched. The
  writer implementation has since **shipped** (fifty-first slice):
  opt-in `--confirm-finding-write` writes a new `FindingReport`
  only. The **writer safety review** (fifty-second slice) confirmed
  it **safe / stable as a controlled, opt-in writer**.
- [Bridge-derived findings publication decision](../strategy/bridge-derived-findings-publication-decision.md)
  — fifty-third slice; decides how the written bridge-derived
  `FindingReport` entries are surfaced. Selects **Option B**:
  architecture summary + agent operating contract first (read-only,
  with provenance via `finding.type ===
  "capability_architecture_policy"` plus `details.source*` trace
  fields); proof-report surfacing remains **deferred**. Surfacing
  **shipped in the fifty-fourth slice**, mutates nothing, creates no
  `WorkOrder` / `VerificationPlan`, and leaves lifecycle /
  `CoherencyDelta` integration downstream. The surfacing was safety-reviewed safe / stable as read-only visibility in the fifty-fifth slice.
- [Capability lint finding bridge concept](../concepts/capability-lint-finding-bridge.md)
- [`CapabilityArchitectureLintReport` → `FindingReport` bridge decision](../strategy/capability-lint-finding-bridge-decision.md)
- [CapabilityArchitectureLintReport artifact](capability-architecture-lint-report.md)
- [Capability-Aware Architecture Linting concept](../concepts/capability-aware-architecture-linting.md)
- [FindingReport artifact](finding-report.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)
