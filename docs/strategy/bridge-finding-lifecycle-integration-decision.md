# Bridge-Derived Findings Lifecycle / CoherencyDelta Integration Decision

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> Fifty-sixth slice on the capability-ontology track. Strategy /
> architecture decision only. **No lifecycle, adjudication,
> `CoherencyDelta`, `WorkOrder`, `VerificationPlan`, or source
> behavior is implemented in this slice.** This memo follows the
> [bridge-derived findings publication safety review](bridge-derived-findings-publication-safety-review.md)
> (fifty-fifth slice), which declared the publication surfacing
> **safe / stable** as read-only visibility.

## Decision Summary

Bridge-derived `FindingReport` entries are now written by the
controlled `--confirm-finding-write` writer and surfaced read-only in
the architecture summary and agent contract. They still do **not**
enter the governed-finding pipeline — finding filters, finding
lifecycle, issue adjudication, `CoherencyDelta`. This memo decides how
they should.

**Decision: Option B — a preview artifact first.** Introduce a
**`BridgeFindingLifecycleIntegrationReport`** that *previews* how
bridge-derived `FindingReport` entries would enter (1) finding
filters, (2) finding lifecycle, (3) issue adjudication, and (4)
`CoherencyDelta` eligibility — **without mutating any of those
artifacts**. No lifecycle status is written; no governance artifact is
touched.

This is a **decision-only** batch. It implements nothing. It records
the preview-artifact model, the staged sequence, and the boundaries
the next implementation slice must hold.

Pinned conclusions:

- BridgeFindingLifecycleIntegrationReport is preview, not FindingLifecycleReport.
- No FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or CoherencyDelta mutation occurs in this decision slice.
- CoherencyDelta integration remains downstream of lifecycle and adjudication.
- WorkOrder and VerificationPlan creation remain downstream of CoherencyDelta.
- Source writes remain unavailable.

## Why This Decision Exists

Bridge-derived findings are governed `FindingReport` entries and
visible to operators/agents, but they do not yet enter lifecycle,
adjudication, or `CoherencyDelta`. The next boundary is deciding how
they should flow into the existing governed-finding pipeline **without
bypassing** filters, lifecycle, adjudication, or remediation
safeguards.

The product guarantee this decision keeps:

- Lifecycle / `CoherencyDelta` integration remains **explicit and
  staged**.
- Bridge-derived findings **do not bypass** filters or lifecycle.
- Issue adjudication remains **downstream** of filtered /
  lifecycle-aware findings.
- `CoherencyDelta` remains **downstream** of adjudication.
- `WorkOrder` / `VerificationPlan` creation remains **downstream** of
  `CoherencyDelta`.
- Source writes remain **unavailable**.

The capability-ontology track has consistently introduced a
**preview** artifact before any mutation (the
`CapabilityLintFindingBridgeReport` previewed candidates before the
`FindingReport` writer; the dry-run preview modeled the write before
write mode shipped). A preview artifact for lifecycle / adjudication /
`CoherencyDelta` eligibility keeps that discipline.

## Current Boundary

What ships today (unchanged by this memo):

- The controlled writer writes **one new** `FindingReport` artifact
  with bridge-derived findings; it does not mutate an existing
  `FindingReport` in place.
- The writer mutates **no** `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`, or
  `CoherencyDelta`, and creates **no** `WorkOrder` /
  `VerificationPlan`.
- Bridge-derived findings are surfaced **read-only** in the
  architecture summary and agent contract; proof-report surfacing
  remains deferred.
- Source writes remain unavailable.

This decision adds **nothing** to that boundary. It scopes the *next*
implementation slice to a preview-only artifact.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| visible only | rejected/deferred | governed path needed eventually |
| preview artifact first | selected | preserves lifecycle boundary |
| direct lifecycle mutation | rejected | too much blast radius |
| direct CoherencyDelta mutation | rejected | bypasses governance |
| WorkOrder / VerificationPlan directly | rejected | downstream only |

**Option A — Keep bridge-derived findings visible only.** Do not
integrate them into lifecycle / adjudication / `CoherencyDelta`.
*Rejected / deferred:* bridge-derived findings need a governed path
into the pipeline eventually; staying visible-only forever strands
them.

**Option B — Preview artifact first.** Emit a
`BridgeFindingLifecycleIntegrationReport` from bridge-derived
`FindingReport` entries that previews filter / lifecycle / adjudication
readiness. *Selected:* preserves the lifecycle / adjudication boundary
before any mutation, consistent with every prior capability-track
preview.

**Option C — Mutate `FindingLifecycleReport` directly.** Bridge-derived
findings directly enter lifecycle status. *Rejected for v1:* too much
blast radius without a preview and a safety review.

**Option D — Mutate `CoherencyDelta` directly.** Bridge-derived
findings directly enter remediation. *Rejected:* bypasses filters,
lifecycle, and adjudication.

**Option E — Create `WorkOrder` / `VerificationPlan` directly.**
Bridge-derived findings immediately create work orders and
verification plans. *Rejected:* work orders and verification plans are
downstream of governed `CoherencyDelta`, not raw written findings.

## Recommendation

Proceed with **Option B**: the next implementation slice registers and
emits a **`BridgeFindingLifecycleIntegrationReport`** v1 — preview
only. It reads the latest bridge-derived `FindingReport` (plus the
latest `FindingFilterReport` / `FindingLifecycleReport` /
`IssueAdjudicationReport` for context) and classifies each
bridge-derived finding's readiness to enter the governed pipeline,
**mutating nothing**.

Recommended sequence:

1. **Decision memo — this slice.**
2. **`BridgeFindingLifecycleIntegrationReport` v1 — preview only.**
3. **Safety review** of the preview artifact.
4. **Optional later lifecycle writer decision** (decision-only).
5. **Lifecycle writer implementation** if approved.
6. **`CoherencyDelta` integration only after** the lifecycle /
   adjudication path is safety-reviewed.

Answers to the required decision questions:

1. **Should bridge-derived entries enter `FindingLifecycleReport`?**
   Eventually, but only via a later explicit lifecycle writer
   decision + implementation — never in this slice or the preview
   slice.
2. **Should they enter `FindingFilterReport` before lifecycle?** The
   preview must model filter eligibility first; the actual filter pass
   stays the existing governed pipeline. The preview does not mutate
   `FindingFilterReport`.
3. **Should `IssueAdjudicationReport` consume them before
   `CoherencyDelta`?** Yes — adjudication stays upstream of
   `CoherencyDelta`. The preview models that ordering; it mutates
   neither.
4. **Should `CoherencyDelta` consume bridge-derived findings
   directly?** **No.** `CoherencyDelta` stays downstream of lifecycle
   and adjudication.
5. **Should `WorkOrder` / `VerificationPlan` generation happen here?**
   **No.** Downstream of `CoherencyDelta`.
6. **Automatic during refresh or opt-in command?** The preview is an
   **opt-in command** (like the bridge / writer dry-run), not an
   automatic refresh step — operators choose when to preview
   integration readiness.
7. **What artifact represents the integration preview?**
   `BridgeFindingLifecycleIntegrationReport`.
8. **How are duplicate bridge-derived findings treated?** Deterministic
   collapse: first occurrence is the candidate; later duplicates are
   marked `duplicate` / `needs-review` with no lifecycle status (see
   Duplicate Policy).
9. **How are lifecycle statuses initialized?** In the preview only,
   ready entries are modeled as `new`; v1 never models `resolved`
   automatically.
10. **What implementation slice follows?**
    `BridgeFindingLifecycleIntegrationReport` v1 (preview / dry-run
    only). ✅ Shipped in the fifty-seventh slice; see the
    [artifact reference](../artifacts/bridge-finding-lifecycle-integration-report.md)
    and [concept](../concepts/bridge-finding-lifecycle-integration.md). It was safety-reviewed safe / stable in the
    fifty-eighth slice; see the [safety review](bridge-finding-lifecycle-integration-report-safety-review.md).

## Preview Artifact Model

Recommended name: **`BridgeFindingLifecycleIntegrationReport`**
(alternatives considered: `BridgeDerivedFindingGovernancePreview`,
`BridgeFindingGovernanceIntegrationReport`; the default is
`BridgeFindingLifecycleIntegrationReport`).

Sketch only; **not implemented in this slice**:

```ts
type BridgeFindingLifecycleIntegrationDecision =
  | "ready-for-lifecycle"
  | "filtered"
  | "needs-review"
  | "duplicate"
  | "ineligible";

type BridgeFindingLifecycleIntegrationReport = {
  header: ArtifactHeader;

  source: {
    findingReportRef: ArtifactRef;
    filterReportRef?: ArtifactRef;
    lifecycleReportRef?: ArtifactRef;
    issueAdjudicationReportRef?: ArtifactRef;
  };

  summary: {
    totalBridgeFindings: number;
    readyForLifecycle: number;
    filtered: number;
    needsReview: number;
    duplicate: number;
    ineligible: number;
    bySeverity: Record<string, number>;
  };

  entries: Array<{
    id: string;
    findingId: string;
    decision: BridgeFindingLifecycleIntegrationDecision;
    initialLifecycleStatus?: "new" | "active" | "suppressed" | "resolved";
    severity: "low" | "medium" | "high";
    sourceBridgeCandidateId?: string;
    sourceLintRowId?: string;
    sourceContractId?: string;
    sourcePhraseCapabilityId?: string;
    evidenceRefs: ArtifactRef[];
    messages?: string[];
  }>;
};
```

V1 must **not** set `resolved` automatically. The recommended initial
lifecycle status for `ready-for-lifecycle` entries is **`new`**.

## Filtering Boundary

The preview models filter eligibility but does not run or change the
filter chain. **BridgeFindingLifecycleIntegrationReport does not
mutate FindingFilterReport.** A finding the preview marks `filtered`
carries **no** lifecycle status; the existing graph-aware finding
filters remain the only authority that actually suppresses findings.

## Lifecycle Boundary

**BridgeFindingLifecycleIntegrationReport is preview, not
FindingLifecycleReport.** **BridgeFindingLifecycleIntegrationReport
does not mutate FindingLifecycleReport.** The `initialLifecycleStatus`
field is a *modeled* status (`new` for ready entries), not a written
one. **Only a later explicit lifecycle writer decision may allow
bridge-derived findings to enter lifecycle status.**

## Adjudication Boundary

**BridgeFindingLifecycleIntegrationReport does not mutate
IssueAdjudicationReport.** The preview models that adjudication stays
upstream of `CoherencyDelta`; it groups nothing and writes no
adjudication decision. Issue adjudication remains downstream of
filtered / lifecycle-aware findings.

## CoherencyDelta Boundary

**BridgeFindingLifecycleIntegrationReport does not mutate
CoherencyDelta.** **CoherencyDelta integration remains downstream of
lifecycle and adjudication** and must remain so. The preview models
`CoherencyDelta` *eligibility* only; it never enters remediation.

## WorkOrder / VerificationPlan Boundary

**WorkOrder and VerificationPlan creation remain downstream of
CoherencyDelta.** The preview creates neither. Work orders and
verification plans are generated from governed `CoherencyDelta`, not
from raw written or preview-classified findings.

Duplicate policy (v1 preview):

- duplicate finding ids collapse deterministically;
- the first occurrence is considered the candidate;
- later duplicates are marked `duplicate` / `needs-review`;
- no lifecycle status is assigned to duplicates.

| Stage | Decision |
| --- | --- |
| FindingReport | already written by explicit writer |
| FindingFilterReport | preview only in next slice |
| FindingLifecycleReport | preview only in next slice |
| IssueAdjudicationReport | preview only in next slice |
| CoherencyDelta | deferred |
| WorkOrder / VerificationPlan | deferred |

| Boundary | Decision |
| --- | --- |
| preview vs FindingFilterReport | no filter mutation |
| preview vs FindingLifecycleReport | no lifecycle mutation |
| preview vs IssueAdjudicationReport | no adjudication mutation |
| preview vs CoherencyDelta | no remediation mutation |
| preview vs WorkOrder | no work-order creation |
| preview vs VerificationPlan | no verification-plan creation |
| preview vs source files | no writes |

| Case | V1 Preview Decision |
| --- | --- |
| bridge-derived finding with evidence | ready-for-lifecycle / new |
| duplicate finding id | duplicate / no status |
| filtered finding | filtered / no status |
| missing bridge trace | needs-review |
| low severity | ready or needs-review, based on existing policy |

## What This Does Not Do

- It does **not** implement lifecycle integration or the preview
  artifact.
- It does **not** mutate `FindingFilterReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta`, or `FindingReport`.
- It does **not** create `WorkOrder` or `VerificationPlan`.
- It does **not** add resolver routing, verification planning, or a
  `RefactorPreservationContract`.
- It does **not** write source files or add LLM-only inference.
- It does **not** publish to npm or bump versions.

## Implementation Sequence

1. **Decision memo — this slice.** Records Option B, the preview
   artifact model, the staged sequence, and the boundaries.
2. **`BridgeFindingLifecycleIntegrationReport` v1 — preview only.**
   Register the artifact type; implement a dry-run / opt-in command
   that reads the latest bridge-derived `FindingReport` (+ filter /
   lifecycle / adjudication context) and classifies readiness, writing
   only the preview artifact.
3. **Safety review** of the preview artifact (read-only review).
4. **Optional lifecycle writer decision** (decision-only) — only after
   the preview is safety-reviewed.
5. **Lifecycle writer implementation** if approved.
6. **`CoherencyDelta` integration** only after the lifecycle /
   adjudication path is safety-reviewed.

## Cross-References

- [Bridge-derived findings publication safety review](bridge-derived-findings-publication-safety-review.md)
- [Bridge-derived findings publication decision](bridge-derived-findings-publication-decision.md)
- [FindingReport writer safety review](capability-lint-finding-writer-safety-review.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Architecture summary publication concept](../concepts/architecture-summary-publication.md)
- [Agent operating contract concept](../concepts/agent-operating-contract.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
