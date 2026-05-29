# BridgeFindingLifecycleIntegrationReport

## Purpose

`BridgeFindingLifecycleIntegrationReport` is a **preview** artifact. It
models how the bridge-derived `FindingReport` entries the controlled
`rekon capability lint write-findings --confirm-finding-write` writer
wrote *would* enter the governed-finding pipeline — finding filters,
finding lifecycle, issue adjudication, and `CoherencyDelta`
eligibility — **without mutating any of those artifacts**.

**`BridgeFindingLifecycleIntegrationReport` is preview, not
`FindingLifecycleReport`.** It assigns no real lifecycle status. The
`initialLifecycleStatus` field is a *modeled* status (`new` for ready
entries), never a written one, and is never `resolved` in v1. It
implements the
[Bridge-Derived Findings Lifecycle / CoherencyDelta Integration
Decision](../strategy/bridge-finding-lifecycle-integration-decision.md)
(Option B — a preview artifact first).

## Produced By

- `@rekon/capability-model.buildBridgeFindingLifecycleIntegrationReport`
- the `rekon capability lint lifecycle-preview` CLI command

## Consumed By

- Operators and agents inspecting which bridge-derived findings are
  ready to enter lifecycle, which need review, and which are
  ineligible — **before** any lifecycle / adjudication /
  `CoherencyDelta` mutation is designed.
- (Future) a separate, explicit lifecycle writer decision — gated
  behind its own decision and safety review. No such writer exists
  today.

## What It Does Not Do

This artifact is **preview, not enforcement**. V1 **identifies
bridge-derived findings from `FindingReport` trace fields** and
classifies their readiness; it changes nothing downstream:

- **No `FindingFilterReport` / `FindingLifecycleReport` /
  `IssueAdjudicationReport` / `CoherencyDelta` mutation.** The preview
  models filter / lifecycle / adjudication / `CoherencyDelta`
  eligibility; it mutates none of them.
- **No `WorkOrder` / `VerificationPlan` creation.** Both remain
  downstream of governed `CoherencyDelta`.
- It does **not** add resolver routing or verification planning by
  capability, and adds no `RefactorPreservationContract`.
- **Source writes remain unavailable.** It reads no source files and
  makes no network calls. Its only required input is the
  `FindingReport`.

Only a later explicit lifecycle writer decision may allow
bridge-derived findings to enter real lifecycle status — and even
then they flow through the finding filters, the `FindingStatusLedger`,
and adjudication like any other finding. `CoherencyDelta` integration
remains downstream of lifecycle and adjudication.

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`BridgeFindingLifecycleIntegrationReport`. `header.inputRefs` cites the
source `FindingReport` (and the optional `FindingFilterReport` /
`FindingLifecycleReport` / `IssueAdjudicationReport` when read for
context).

## Shape

- `source.findingReportRef` — the source `FindingReport`.
- `source.filterReportRef` / `lifecycleReportRef` /
  `issueAdjudicationReportRef` — optional context refs, cited when
  read. v1 reads them only for citation; it does not run the chain.
- `summary.totalBridgeFindings` / `readyForLifecycle` / `filtered` /
  `needsReview` / `duplicate` / `ineligible` — counts re-derived from
  `entries`.
- `summary.bySeverity` — deterministic, sorted count map.
- `entries[]` — one entry per bridge-derived finding:
  - `id` — stable preview entry id (`<findingId>#<index>`).
  - `findingId` — the governed `Finding` id.
  - `decision` — `ready-for-lifecycle` | `filtered` | `needs-review` |
    `duplicate` | `ineligible`.
  - `initialLifecycleStatus` — modeled status (`new` for ready); never
    `resolved` in v1; absent for non-ready entries.
  - `severity` — `low` | `medium` | `high`.
  - `sourceBridgeCandidateId` / `sourceLintRowId` / `sourceContractId`
    / `sourcePhraseCapabilityId` — bridge trace, when present.
  - `evidenceRefs` — the finding's evidence.
  - `messages` — optional human diagnostics.

## Classification Policy

Bridge-derived findings are identified structurally —
`finding.type === "capability_architecture_policy"`,
`finding.details.source === "capability-lint-bridge"`, or any non-empty
`finding.details.source*` trace field — **never by title text alone**.
Ordinary (non-bridge) findings are **omitted** from the preview (not
included as `ineligible`).

For each bridge-derived finding, in `FindingReport.findings` order:

| Case | V1 Preview Decision |
| --- | --- |
| bridge-derived finding with evidence | ready-for-lifecycle / new |
| duplicate finding id | duplicate / no status |
| filtered finding | filtered / no status |
| missing bridge trace | needs-review |
| low severity | ready or needs-review, based on existing policy |

Concretely: no `evidence` → `ineligible`; evidence but missing the
expected trace (`sourceLintRowId` + `sourceContractId`) →
`needs-review`; a repeat of an earlier ready finding id → `duplicate`;
otherwise → `ready-for-lifecycle` with modeled `initialLifecycleStatus
new`. **ready-for-lifecycle rows receive a proposed initial status
new**; **duplicates / missing evidence / missing trace are not
automatically promoted** (they carry no lifecycle status). V1 reserves
`filtered` for a later slice that consumes the deterministic filter
APIs; it does not run the filter chain itself.

## CLI Surface

```sh
rekon capability lint lifecycle-preview [--root <path>] [--json]
rekon capability lint lifecycle-preview --finding-report <FindingReport:id|type:id> [--json]
```

The command reads the latest (or pinned) `FindingReport`, writes a
`BridgeFindingLifecycleIntegrationReport` under
`.rekon/artifacts/actions/`, and prints a summary. It states that no
`FindingLifecycleReport`, `IssueAdjudicationReport`, or
`CoherencyDelta` artifacts were changed, `FindingFilterReport` is not
mutated, and no `WorkOrder` or `VerificationPlan` is created.

## Example

```json
{
  "header": {
    "artifactType": "BridgeFindingLifecycleIntegrationReport",
    "artifactId": "bridge-finding-lifecycle-integration-1780000000000",
    "schemaVersion": "0.1.0",
    "generatedAt": "2026-05-29T02:00:00.000Z",
    "subject": { "repoId": "simple-js-ts" },
    "producer": { "id": "@rekon/capability-model", "version": "0.1.0" },
    "inputRefs": [
      { "type": "FindingReport", "id": "finding-report-1780000000000", "schemaVersion": "0.1.0" }
    ],
    "freshness": { "status": "fresh" },
    "provenance": { "confidence": 0.85 }
  },
  "source": {
    "findingReportRef": { "type": "FindingReport", "id": "finding-report-1780000000000", "schemaVersion": "0.1.0" }
  },
  "summary": {
    "totalBridgeFindings": 1,
    "readyForLifecycle": 1,
    "filtered": 0,
    "needsReview": 0,
    "duplicate": 0,
    "ineligible": 0,
    "bySeverity": { "high": 1 }
  },
  "entries": [
    {
      "id": "capability-architecture-policy:forbidden-layer:fixture.create-user:capability-phrase-create-user#0",
      "findingId": "capability-architecture-policy:forbidden-layer:fixture.create-user:capability-phrase-create-user",
      "decision": "ready-for-lifecycle",
      "initialLifecycleStatus": "new",
      "severity": "high",
      "sourceBridgeCandidateId": "fixture.create-user:forbidden-layer",
      "sourceLintRowId": "fixture.create-user:forbidden-layer",
      "sourceContractId": "fixture.create-user",
      "sourcePhraseCapabilityId": "capability-phrase:create-user",
      "evidenceRefs": [
        { "type": "CapabilityMap", "id": "capability-map-1780000000000", "schemaVersion": "0.1.0" }
      ]
    }
  ]
}
```

## Boundary Summary

- **BridgeFindingLifecycleIntegrationReport is preview, not
  FindingLifecycleReport.**
- **No FindingFilterReport / FindingLifecycleReport /
  IssueAdjudicationReport / CoherencyDelta mutation** occurs.
- **No WorkOrder / VerificationPlan creation.**
- `CoherencyDelta` integration remains downstream of lifecycle and
  adjudication; `WorkOrder` / `VerificationPlan` remain downstream of
  `CoherencyDelta`.
- **Source writes remain unavailable.**

## Cross-References

- [Bridge-derived findings lifecycle / CoherencyDelta integration decision](../strategy/bridge-finding-lifecycle-integration-decision.md)
- [Bridge finding lifecycle integration concept](../concepts/bridge-finding-lifecycle-integration.md)
- [BridgeFindingLifecycleIntegrationReport safety review](../strategy/bridge-finding-lifecycle-integration-report-safety-review.md)
- [FindingReport artifact](finding-report.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [WorkOrder artifact](work-order.md)
- [VerificationPlan artifact](verification-plan.md)
- [Roadmap](../strategy/roadmap.md)
- [Classic behavior roadmap](../strategy/classic-behavior-roadmap.md)

> See also: [Classic step-capability / handoff / runtime drift parity audit](../strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md) — reserves StepCapabilityGraph / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport / RuntimeGraphDriftReport as future surfaces not yet modeled by Rekon.

> See also: [StepCapabilityGraph / HandoffContract architecture decision](../strategy/step-capability-handoff-architecture-decision.md) — selects a staged step/handoff/runtime graph spine (StepCapabilityGraph → HandoffContract → HandoffCoverageReport → RuntimeGraphObservationReport → RuntimeGraphDriftReport).
