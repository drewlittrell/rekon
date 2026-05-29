# BridgeFindingLifecycleIntegrationReport Safety Review

## Decision Summary

`BridgeFindingLifecycleIntegrationReport` v1 (shipped at `c908857`) is
**safe / stable as a preview artifact**. It reads a `FindingReport`,
identifies bridge-derived findings structurally, and emits an
auditable preview of how each one *would* enter the governed finding
pipeline (finding filters → finding lifecycle → issue adjudication →
`CoherencyDelta`). It mutates none of those artifacts and writes no
source files.

**BridgeFindingLifecycleIntegrationReport is preview, not
FindingLifecycleReport.** The `initialLifecycleStatus` field is a
modeled value (`new` for ready entries, never `resolved` in v1);
**initialLifecycleStatus is modeled status only and does not mutate
FindingLifecycleReport.**

This review finds **no blocker**. The recommended next slice is
**BridgeFindingLifecycleIntegrationReport publication surfacing** —
read-only visibility in the architecture summary and agent contract —
because operators and agents should be able to inspect lifecycle /
adjudication / `CoherencyDelta` readiness before any lifecycle writer
or `CoherencyDelta` integration decision begins.

| Surface | Status | Boundary |
| --- | --- | --- |
| BridgeFindingLifecycleIntegrationReport artifact | shipped | preview only |
| lifecycle-preview CLI | shipped | writes preview report only |
| initialLifecycleStatus | shipped | modeled status only |
| publication surfacing | deferred | visibility only |

## Why This Review Exists

Bridge-derived findings are governed `FindingReport` entries: the
controlled `rekon capability lint write-findings
--confirm-finding-write` writer produces them, and the bridge-derived
findings publication surfacing makes them visible to operators and
agents. The fifty-sixth slice (lifecycle / `CoherencyDelta`
integration decision) then chose **Option B** — ship a read-only
preview artifact (`BridgeFindingLifecycleIntegrationReport`) before
designing any lifecycle writer.

Because finding lifecycle, issue adjudication, and `CoherencyDelta` are
downstream **governance** stages, that preview artifact must be
safety-reviewed before it is surfaced in publications or used to
justify a lifecycle writer decision. This memo is that review.

## Artifact And CLI Reviewed

- **Type shape** (`@rekon/kernel-repo-model`):
  `BridgeFindingLifecycleIntegrationReport` carries `source`
  (`findingReportRef` required; `filterReportRef` /
  `lifecycleReportRef` / `issueAdjudicationReportRef` optional citation
  refs), `summary` (six counts + a sorted `bySeverity`), and
  `entries[]` (id, findingId, decision, optional modeled
  `initialLifecycleStatus`, severity, bridge trace, `evidenceRefs`,
  optional `messages`).
- **Factory** `createBridgeFindingLifecycleIntegrationReport`: dedupes
  entries by id, sorts by `(findingId, id)`, recomputes the summary
  from entries, normalizes source refs, and asserts the schema. A
  caller cannot persist a stale summary.
- **Validator / assert / schema**
  `validateBridgeFindingLifecycleIntegrationReport` validates the
  header generically, the source refs, each entry (id non-empty +
  unique, decision and severity enums, optional
  `initialLifecycleStatus` enum, `evidenceRefs`), and the summary —
  re-deriving counts and **rejecting any artifact whose summary does
  not match its entries**.
- **Builder** `buildBridgeFindingLifecycleIntegrationReport` reads the
  `FindingReport` structurally (capability-model has no
  `@rekon/kernel-findings` dependency), classifies only the
  bridge-derived findings, and constructs the artifact. It reads no
  source files and makes no network calls; optional context refs are
  cited in `source` / `inputRefs` but the filter / lifecycle /
  adjudication chain is **not** run.
- **Classifier** `isBridgeDerivedFinding` matches structurally:
  `type`/`category === "capability_architecture_policy"`,
  `details.source === "capability-lint-bridge"`, or any non-empty
  `details.source*` trace field — **never by title text alone**.
- **CLI** `rekon capability lint lifecycle-preview [--root <path>]
  [--json] [--finding-report <ref>]` reads the latest or pinned
  `FindingReport`, writes the preview under `actions/` (never under
  `findings/`), and prints the explicit governance-boundary statement.

## Classification Review

Classification is strict and deterministic. For each bridge-derived
finding, in `FindingReport.findings` order:

| Case | V1 Behavior |
| --- | --- |
| bridge-derived finding with evidence and trace | ready-for-lifecycle / new |
| duplicate finding id | duplicate / no status |
| missing evidenceRefs | ineligible |
| missing bridge trace | needs-review |
| ordinary non-bridge finding | ineligible or omitted per implementation |
| filtered | reserved / deferred |

Concretely: no `evidence` / `evidenceRefs` → `ineligible`; evidence but
missing the expected trace (`sourceLintRowId` + `sourceContractId`) →
`needs-review`; a repeat of an earlier ready finding id → `duplicate`;
otherwise → `ready-for-lifecycle`. Ordinary (non-bridge) findings are
**omitted** from the preview entirely (not listed as `ineligible`). The
`filtered` decision is reserved for a later slice that consumes the
deterministic finding-filter APIs; v1 does not run the filter chain and
emits no `filtered` rows.

These rules are strict enough for a preview: a row only reaches
`ready-for-lifecycle` if it carries both evidence and the bridge trace
a downstream lifecycle decision would need, and the conservative
default for any ambiguity is `ineligible` or `needs-review`, never
`ready`.

Duplicate handling is deterministic: the first ready occurrence of a
finding id is the lifecycle candidate; subsequent occurrences are
`duplicate` with no status. Because the factory sorts by `(findingId,
id)` and the entry id is `<findingId>#<index>`, the output ordering is
stable for a given `FindingReport`.

## Initial Lifecycle Status Review

`initialLifecycleStatus` is set to `new` only on `ready-for-lifecycle`
rows; every other decision carries no status. The status type permits
`new` / `active` / `suppressed` / `resolved`, but v1 only ever models
`new` and **never models `resolved`**. The field is a *modeled*
proposal — it is written into the preview artifact, not into any
`FindingLifecycleReport`. **initialLifecycleStatus is modeled status
only and does not mutate FindingLifecycleReport.** A future lifecycle
writer must re-derive status from live inputs and must not treat the
preview as authoritative.

## Governance Mutation Boundary

**BridgeFindingLifecycleIntegrationReport does not mutate
FindingFilterReport, FindingLifecycleReport, IssueAdjudicationReport, or
CoherencyDelta.** It does not mutate FindingFilterReport /
FindingLifecycleReport / IssueAdjudicationReport / CoherencyDelta. The
builder reads only the `FindingReport` (plus optional context refs it
merely cites); the CLI writes exactly one new
`BridgeFindingLifecycleIntegrationReport` under `actions/` and changes
nothing else. **BridgeFindingLifecycleIntegrationReport does not write
source files.**

| Boundary | Decision |
| --- | --- |
| preview vs FindingFilterReport | no filter mutation |
| preview vs FindingLifecycleReport | no lifecycle mutation |
| preview vs IssueAdjudicationReport | no adjudication mutation |
| preview vs CoherencyDelta | no remediation mutation |
| preview vs WorkOrder | no work-order creation |
| preview vs VerificationPlan | no verification-plan creation |
| preview vs source files | no writes |

## CoherencyDelta Boundary

The preview models `CoherencyDelta` *eligibility* but never touches a
`CoherencyDelta`. **CoherencyDelta integration remains downstream of
lifecycle and adjudication.** A bridge-derived finding only influences a
`CoherencyDelta` after it has entered real lifecycle status and passed
through adjudication like any other finding — none of which v1 does or
implies.

## WorkOrder / VerificationPlan Boundary

**BridgeFindingLifecycleIntegrationReport does not create WorkOrder or
VerificationPlan.** **WorkOrder and VerificationPlan creation remain
downstream of CoherencyDelta.** The preview is several governed stages
upstream of remediation planning; nothing in v1 shortcuts that
ordering.

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare v1 safe/stable preview artifact | selected | isolated preview + no mutations |
| publication surfacing next | selected | operators need visibility |
| lifecycle writer decision next | rejected/deferred | needs surfacing + safety first |
| CoherencyDelta integration next | rejected | lifecycle/adjudication boundary first |
| WorkOrder / VerificationPlan next | rejected | downstream of CoherencyDelta |

## Recommendation

`BridgeFindingLifecycleIntegrationReport` v1 is safe/stable as a preview
artifact. Proceed to **BridgeFindingLifecycleIntegrationReport
publication surfacing** as the next slice: surface the
lifecycle / adjudication / `CoherencyDelta` readiness preview in the
architecture summary and agent contract as read-only visibility. **The
next slice may surface BridgeFindingLifecycleIntegrationReport in
publications, but must not mutate lifecycle or CoherencyDelta.**

## What This Does Not Do

This is a read-only review. It changes no runtime behavior, mutates no
governance artifact, creates no `WorkOrder` or `VerificationPlan`,
implies no lifecycle writer and no `CoherencyDelta` integration, adds no
resolver routing or verification planning by capability, adds no
`RefactorPreservationContract`, writes no source files, adds no
LLM-only inference, publishes nothing to npm, and bumps no version.

## Follow-Up Work

Deferred to later, separately safety-reviewed slices: `FindingFilterReport`
mutation, `FindingLifecycleReport` mutation, `IssueAdjudicationReport`
mutation, `CoherencyDelta` mutation, `WorkOrder` creation,
`VerificationPlan` creation, resolver routing, verification planning,
`RefactorPreservationContract`, and source writes. The immediate
follow-up is publication surfacing (visibility only).

## Cross-References

- [BridgeFindingLifecycleIntegrationReport artifact](../artifacts/bridge-finding-lifecycle-integration-report.md)
- [Bridge finding lifecycle integration concept](../concepts/bridge-finding-lifecycle-integration.md)
- [Bridge-derived findings lifecycle / CoherencyDelta integration decision](bridge-finding-lifecycle-integration-decision.md)
- [Bridge-derived findings publication safety review](bridge-derived-findings-publication-safety-review.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](../concepts/finding-lifecycle.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [Coherency delta concept](../concepts/coherency-delta.md)
- [Remediation work orders concept](../concepts/remediation-work-orders.md)
- [WorkOrder artifact](../artifacts/work-order.md)
- [VerificationPlan artifact](../artifacts/verification-plan.md)
- [Roadmap](roadmap.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
