# Review Packet — Bridge-Derived Findings Lifecycle / CoherencyDelta Integration Decision

Fifty-sixth slice on the capability-ontology track. Strategy /
architecture **decision-only** batch. No runtime behavior changes.

## CHANGES MADE

- **New** `docs/strategy/bridge-finding-lifecycle-integration-decision.md`
  — the decision memo. 13 headings (Decision Summary, Why This
  Decision Exists, Current Boundary, Options Considered,
  Recommendation, Preview Artifact Model, Filtering Boundary,
  Lifecycle Boundary, Adjudication Boundary, CoherencyDelta Boundary,
  WorkOrder / VerificationPlan Boundary, What This Does Not Do,
  Implementation Sequence — under the title heading). Selects
  **Option B** (`BridgeFindingLifecycleIntegrationReport` preview
  artifact first). Four tables (option, sequence, boundary,
  lifecycle). Five pinned boundary statements + six
  filtering/lifecycle/adjudication pins. Preview artifact shape sketch
  + duplicate policy.
- **New** `.rekon-dev/review-packets/bridge-finding-lifecycle-integration-decision.md`
  — this packet.
- **New** `tests/docs/bridge-finding-lifecycle-integration-decision.test.mjs`
  — 14 assertions.
- **Updated** cross-reference docs (publication safety review,
  publication decision, writer safety review, finding-report,
  finding-lifecycle, graph-aware-finding-filters, coherency-delta,
  remediation-work-orders, work-order, verification-plan, architecture
  summary publication concept, agent-operating-contract), plus
  `roadmap.md`, `classic-behavior-roadmap.md`, `README.md`,
  `CHANGELOG.md`.

## PUBLIC API CHANGES

None. No source files touched. No package exports changed. No CLI
surface changed. No artifact schema changed (the
`BridgeFindingLifecycleIntegrationReport` shape is a **sketch** in the
memo, not registered).

## PURPOSE PRESERVATION CHECK

**Original problem.** Bridge-derived findings are governed
`FindingReport` entries and visible, but do not enter lifecycle,
adjudication, or `CoherencyDelta`. The next boundary is deciding how
they should flow into the governed-finding pipeline **without
bypassing** filters, lifecycle, adjudication, or remediation
safeguards.

**Does this slice preserve that purpose?** Yes.

- It selects a **preview-first** path
  (`BridgeFindingLifecycleIntegrationReport`) that models filter /
  lifecycle / adjudication / `CoherencyDelta` eligibility **without
  mutating** any of them.
- It pins that lifecycle / `CoherencyDelta` integration stays
  **explicit and staged**, that bridge-derived findings **do not
  bypass** filters or lifecycle, that adjudication stays **upstream**
  of `CoherencyDelta`, and that `WorkOrder` / `VerificationPlan`
  creation + source writes remain **downstream / unavailable**.
- No behavior changed in this slice.

## CODEBASE-INTEL ALIGNMENT

- Mirrors the established capability-track discipline: a **preview**
  artifact precedes any mutation (the
  `CapabilityLintFindingBridgeReport` preceded the `FindingReport`
  writer; the dry-run preview preceded write mode). The
  `BridgeFindingLifecycleIntegrationReport` preview precedes any
  lifecycle / adjudication / `CoherencyDelta` mutation.
- Preserves the governed-finding pipeline ordering documented in
  `finding-lifecycle`, `graph-aware-finding-filters`,
  `coherency-delta`, and `remediation-work-orders`: filters →
  lifecycle → adjudication → `CoherencyDelta` → `WorkOrder` /
  `VerificationPlan`.
- All 12 review-scope docs named in the work order exist; none were
  missing, so no closest-existing substitution was required.

## OPTIONS CONSIDERED

| Option | Decision | Reason |
| --- | --- | --- |
| visible only | rejected/deferred | governed path needed eventually |
| preview artifact first | selected | preserves lifecycle boundary |
| direct lifecycle mutation | rejected | too much blast radius |
| direct CoherencyDelta mutation | rejected | bypasses governance |
| WorkOrder / VerificationPlan directly | rejected | downstream only |

## PREVIEW ARTIFACT MODEL

`BridgeFindingLifecycleIntegrationReport` (sketch only): `header`,
`source` (findingReportRef + optional filter/lifecycle/adjudication
refs), `summary` (totalBridgeFindings / readyForLifecycle / filtered /
needsReview / duplicate / ineligible / bySeverity), and `entries[]`
with a `decision` (`ready-for-lifecycle` | `filtered` | `needs-review`
| `duplicate` | `ineligible`), a *modeled* `initialLifecycleStatus`
(`new` for ready; never `resolved` in v1), severity, the bridge trace
fields, evidenceRefs, and optional messages. Opt-in command (not an
automatic refresh step).

## FILTERING BOUNDARY

`BridgeFindingLifecycleIntegrationReport` does not mutate
`FindingFilterReport`. Findings the preview marks `filtered` carry no
lifecycle status; the graph-aware finding filters remain the only
suppression authority.

## LIFECYCLE BOUNDARY

`BridgeFindingLifecycleIntegrationReport` is preview, not
`FindingLifecycleReport`, and does not mutate it. `initialLifecycleStatus`
is modeled, not written. Only a later explicit lifecycle writer
decision may allow bridge-derived findings to enter lifecycle status.

## ADJUDICATION BOUNDARY

`BridgeFindingLifecycleIntegrationReport` does not mutate
`IssueAdjudicationReport`. Adjudication stays upstream of
`CoherencyDelta`; the preview groups nothing and writes no decision.

## COHERENCYDELTA BOUNDARY

`BridgeFindingLifecycleIntegrationReport` does not mutate
`CoherencyDelta`. `CoherencyDelta` integration remains downstream of
lifecycle and adjudication; the preview models eligibility only.

## WORKORDER / VERIFICATIONPLAN BOUNDARY

`WorkOrder` and `VerificationPlan` creation remain downstream of
`CoherencyDelta`. The preview creates neither.

## TESTS / VERIFICATION

- New 14-assertion docs test
  `tests/docs/bridge-finding-lifecycle-integration-decision.test.mjs`
  passes.
- Full 9-command gate: `npm run typecheck`, `npm run test`,
  `npm run build`, `git diff --check`,
  `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`,
  `node scripts/install-tarball-smoke.mjs`.
- No CLI smoke (strategy-only batch; no runtime behavior changed).

## INTENTIONALLY UNTOUCHED

- All `packages/` source. No helper, CLI, schema, or publisher change.
  The `BridgeFindingLifecycleIntegrationReport` type is a memo sketch,
  not a registered artifact.
- `FindingReport`, `FindingFilterReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`.
- `WorkOrder` / `VerificationPlan`.
- The bridge-derived findings publication surfacing (read-only) and
  proof-report deferral.
- `pnpm-lock.yaml` (left unstaged per workflow).

## RISKS / FOLLOW-UP

- **Risk:** the preview's `initialLifecycleStatus` field could be
  mistaken for a written status. *Mitigation:* the memo pins it is
  *modeled*, and the preview artifact's own safety review (sequence
  step 3) will re-confirm no lifecycle mutation before any writer
  decision.
- **Risk:** previewing `CoherencyDelta` eligibility could be read as
  remediation readiness. *Mitigation:* the `CoherencyDelta` boundary
  statement pins it stays downstream of lifecycle + adjudication.
- **Follow-up:** `BridgeFindingLifecycleIntegrationReport` v1 (preview
  only), then its safety review, then an optional lifecycle writer
  decision.

## NEXT STEP

Recommended next slice: **`BridgeFindingLifecycleIntegrationReport`
v1** — register the preview artifact and implement dry-run integration
from bridge-derived `FindingReport` entries into a preview of
filtering / lifecycle / adjudication readiness. Still no
`FindingFilterReport` mutation, no `FindingLifecycleReport` mutation,
no `IssueAdjudicationReport` mutation, no `CoherencyDelta` mutation, no
`WorkOrder` / `VerificationPlan` creation, no source writes.
