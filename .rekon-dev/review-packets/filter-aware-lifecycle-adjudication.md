# Review Packet: Filter-Aware Lifecycle / Adjudication

Slice: P1.1 (Issue Adjudication), filter-aware lifecycle v1 slice.
Implements the next step of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md).

## CHANGES MADE

`packages/runtime/src/index.ts`
- Imports `Finding` and `FindingFilterReport` from
  `@rekon/kernel-findings`.
- `buildFindingLifecycleReport(store, options?)` now:
  1. Lists `FindingFilterReport` entries from the store.
  2. Picks the most recent one (by `writtenAt`) and reads it.
  3. Checks "current-enough" by inspecting whether the filter
     report's `header.inputRefs` cites the latest
     `FindingReport.id` selected for this run.
  4. If current, builds a synthetic `FindingReport`-shaped
     object via `syntheticFindingReportFromKept(raw, kept)`
     that reuses the raw report's `header` but swaps in
     `keptFindings` as the active surface, and uses that as
     the `latestReport` argument to `deriveFindingLifecycle`.
     The raw `FindingReport` is **not** mutated.
  5. Citations:
     - `inputRefs` always include the raw `FindingReport`.
     - When the filter was used: appends the
       `FindingFilterReport` ref **plus** that report's own
       `header.inputRefs` (deduped), so freshness flags
       lifecycle stale when a newer filter arrives and
       lineage to the raw report stays intact via the filter.
     - Previous `FindingReport` entries + `FindingStatusLedger`
       are appended after, matching prior behavior.
  6. When the filter report is missing or stale (does not
     cite the latest `FindingReport`), the lifecycle silently
     falls back to the raw `FindingReport` and the stale
     filter ref is **not** added to `inputRefs`. Staleness
     surfaces through `rekon artifacts freshness` because the
     filter report's own inputRefs no longer match the latest
     `FindingReport`.
- New private helpers `syntheticFindingReportFromKept(raw,
  kept)` and `countByKey(items, pick)` to build the synthetic
  report + its summary. Both are file-local.

Tests:
- New `tests/contract/filter-aware-lifecycle-adjudication.test.mjs`
  with 7 tests:
  1. `buildFindingLifecycleReport` prefers `keptFindings` from
     a current `FindingFilterReport`; cites the filter +
     upstream report in `inputRefs`; raw `FindingReport`
     unmutated.
  2. Falls back to `FindingReport` when no
     `FindingFilterReport` exists; no filter ref cited.
  3. Ignores a stale `FindingFilterReport` (does not cite the
     latest `FindingReport`) and falls back to the raw report;
     no filter ref cited.
  4. `buildIssueAdjudicationReport` only groups kept findings
     when a current filter report exists (transitive
     filter-awareness via lifecycle).
  5. `buildCoherencyDelta` excludes filtered findings from
     `items.memberFindingIds` and the `remediationQueue`.
  6. End-to-end CLI flow on a refreshed repo: overlay a
     synthetic `FindingReport` citing the latest
     `EvidenceGraph` (and `OwnershipMap`), then re-run
     `rekon findings filter` → `findings lifecycle` →
     `issues adjudicate` → `coherency delta`; lifecycle cites
     the filter, adjudication / coherency exclude the
     filtered finding, and `artifacts validate` stays clean.
  7. `rekon refresh` on a clean simple-js-ts fixture still
     produces a filter-aware lifecycle (lifecycle cites a
     `FindingFilterReport`) and validates cleanly.
- Full suite: 483 passed / 1 skipped.

Docs:
- `docs/artifacts/finding-filter-report.md` — flipped the
  "Consumed By" entry from "future slice" to a description of
  the live consumer behavior; "What This Is Not" reworded.
- `docs/artifacts/finding-lifecycle-report.md` — rewrote
  "Relationship To Filtering" to describe the
  current-enough check, the synthetic-report swap, the
  fallback, and the input-ref citation policy.
- `docs/artifacts/issue-adjudication-report.md` — flipped to
  describe transitive filter-awareness via the lifecycle.
- `docs/artifacts/coherency-delta.md` — new "Filter Awareness
  (Transitive)" section + lineage note in "Freshness And
  Provenance".
- `docs/concepts/finding-filters.md` — flipped the
  "Not yet consumed" bullet to describe live consumption.
- `docs/concepts/finding-lifecycle.md` — updated the filter
  paragraph to describe live behavior.
- `docs/concepts/issue-adjudication.md` — updated the filter
  paragraph to describe transitive filter-awareness.
- `docs/concepts/coherency-delta.md` — flipped the
  "not yet a CoherencyDelta input" callout to describe
  transitive filter-awareness.
- `docs/concepts/refresh.md` — `findings.lifecycle` step
  description rewritten to mention the filter-aware behavior +
  fallback.
- `docs/strategy/issue-governance-architecture-decision.md` —
  layer 4 description rewritten to describe live behavior;
  "Implementation Order" updated so steps 1+2 are shipped and
  the next slice is "Filter policy / configured exclusions
  v1".
- `docs/strategy/classic-subsystem-purpose-map.md` — subsystem
  6 row updated; next-slice column → "Filter policy /
  configured exclusions v1".
- `docs/strategy/classic-behavior-roadmap.md` — new
  "Filter-aware lifecycle / adjudication (P1.1 filter-aware
  lifecycle v1 slice)" entry with full behavioral description.
- `docs/strategy/classic-guarantee-regression-plan.md` — new
  "Filter-aware lifecycle / adjudication" (shipped) entry
  pinned by the new 7-test contract.
- `docs/strategy/roadmap.md` — new bullet under the alpha
  spine for the filter-aware lifecycle slice.
- `CHANGELOG.md` — detailed entry at the top of `0.1.0-alpha.1`.

Review packet: `.rekon-dev/review-packets/filter-aware-lifecycle-adjudication.md` (this file).

## PUBLIC API CHANGES

None. `buildFindingLifecycleReport` signature is unchanged.
`BuildFindingLifecycleOptions` is unchanged. The
`FindingLifecycleReport` artifact shape is unchanged — the
filter-aware projection only changes which findings populate
the active set and what shows up in `inputRefs`. No new SDK
type, no new CLI subcommand, no new capability role, no
artifact schemaVersion bump, no version bump, no npm publish.

## PURPOSE PRESERVATION CHECK

Original problem: raw findings include false positives. Once
filtering exists but lifecycle / adjudication / coherency still
consume the raw `FindingReport`, filtered findings still become
active governed issues — defeating filtering's purpose and
causing `CoherencyDelta`, publications, and remediation work
orders to keep surfacing known false positives.

Classic shape: `services/IssueDetectionService.ts`,
`services/issues/content-filters.ts`,
`services/issues/issue-result-filters.ts`,
`services/issues/filter-health.ts`,
`services/issues/report-persistence.ts`,
`domain/issues/mergeIssues.ts`,
`packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
Classic filtered false positives BEFORE producing the canonical
active issue report and coherency delta; filtered issues were
preserved for audit but excluded from the active surface.

Rekon equivalent (this slice):
- `FindingFilterReport.filteredFindings` keeps filtered
  findings auditable (shipped previously).
- `FindingLifecycleReport` consumes
  `FindingFilterReport.keptFindings` as the active latest set
  when a current filter exists; falls back to raw report
  otherwise.
- `IssueAdjudicationReport` groups only the kept lifecycle
  findings (transitive).
- `CoherencyDelta` rolls up only kept governed issues
  (transitive).
- `inputRefs` cite the filter report so freshness propagates;
  raw `FindingReport` is never mutated.

What would mean we failed (and isn't the case):
- A generated/test/external filtered finding still appears as
  active in `FindingLifecycleReport` → tests 1, 4, 5, 6 assert
  the opposite.
- A filtered finding becomes an `IssueAdjudicationGroup`
  member → test 4 asserts no `gen` in `memberFindingIds`.
- `CoherencyDelta` counts a filtered finding as active drift
  → test 5 asserts `gen` is not in `items.memberFindingIds` /
  `remediationQueue`.
- Filtered findings disappear from audit artifacts → test 1
  reads raw `FindingReport` from disk and confirms both
  findings remain.
- Filtering is implemented by mutating `FindingReport` or
  status ledgers → the helper builds a synthetic in-memory
  report from `keptFindings`; the raw `FindingReport` on disk
  is byte-for-byte unchanged.
- Stale filter incorrectly suppresses findings → test 3
  asserts a filter that does not cite the latest
  `FindingReport` is ignored.

Regression: given a `FindingReport` with one normal finding
and one generated-file finding, running `rekon findings filter`
then `rekon findings lifecycle` produces a lifecycle whose
active findings contain only the kept finding; adjudication +
coherency exclude the filtered finding; the raw `FindingReport`
on disk still contains both findings. All covered by
`tests/contract/filter-aware-lifecycle-adjudication.test.mjs`.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: false-positive filtering
before canonical issue governance and coherency delta.

What Rekon keeps:
- raw findings are not enough.
- filtered findings remain auditable (full payload retained in
  `FindingFilterReport.filteredFindings`).
- active governance uses kept findings.
- status / review decisions remain separate from system
  filtering (`FindingStatusLedger` stays its own concern).
- coherency rolls up governed findings / issues, not
  unfiltered noise.
- artifact lineage cites the filter report.

What Rekon simplifies:
- deterministic v1 filters only (already shipped).
- no `GraphOntologyValidator`.
- no full `issueExclude` policy.
- no persistent exclusion list.
- no LLM or semantic false-positive classifier.
- no advanced filter-health alerts beyond v1.

What Rekon does not port yet:
- full classic content filter catalog.
- graph / ontology validation.
- configured exclusion policy (the next slice).
- persistent exclusion list.
- semantic false-positive classification.
- advanced filter-health diagnostics.

How this advances migration:
- Completes the first filter / audit / governed-surface loop.
- Makes `FindingFilterReport` load-bearing rather than
  informational.
- Aligns `CoherencyDelta` and downstream surfaces with the
  ADR's layered issue-governance model — without changing the
  delta itself.

## FILTER-AWARE LIFECYCLE MODEL

Current-enough check:

- The lifecycle calls `store.list("FindingFilterReport")`,
  sorts by `writtenAt` ascending, and picks the most recent
  entry.
- It reads that entry and inspects
  `header.inputRefs`. If any ref has
  `type === "FindingReport"` and `id` equal to the
  selected latest `FindingReport.id`, the filter is
  "current".
- Otherwise the filter is treated as stale and ignored.

When the filter is current:

- The lifecycle synthesizes a `FindingReport` object that
  reuses the raw report's `header` exactly (preserving
  `artifactId`, so previous-report lifecycle comparison
  remains identical) but replaces `findings` with
  `keptFindings` and rebuilds `summary.total` /
  `summary.bySeverity` / `summary.byType` from the kept set.
- The synthetic object is passed as `latestReport` to
  `deriveFindingLifecycle`.
- The lifecycle's `header.inputRefs` are populated in this
  order: latest `FindingReport` ref → `FindingFilterReport`
  ref → filter report's own `inputRefs` (deduped) →
  previous `FindingReport` refs → latest
  `FindingStatusLedger` ref (when present).
- Filtered findings stay in
  `FindingFilterReport.filteredFindings` with full payload.
  They never appear in the lifecycle's `findings` or
  `resolvedFindings`.

When the filter is missing or stale:

- The lifecycle uses the raw `FindingReport` as before.
- Neither the filter report ref nor its upstream refs are
  added to `header.inputRefs`.
- No warning or error is emitted; `rekon artifacts freshness`
  already flags the stale filter report independently.
- This is the safe default and matches pre-slice behavior
  byte-for-byte.

Previous-report comparison:

- The slice intentionally keeps the existing previous-report
  walk: prior `FindingReport` entries are read as-is and
  passed as `previousReports` to `deriveFindingLifecycle`.
- This means a finding that was kept in a previous run but is
  filtered in the latest run will appear in
  `resolvedFindings` (it disappeared from the active surface
  between runs). That's acceptable for v1 — the finding still
  isn't "active" and its audit trail is in
  `FindingFilterReport.filteredFindings`.

## ADJUDICATION / COHERENCY EFFECTS

Both `buildIssueAdjudicationReport` and `buildCoherencyDelta`
are filter-aware **transitively**:

- Adjudication consumes `FindingLifecycleReport`. With
  filter-aware lifecycle, the lifecycle's `findings` array
  contains only kept findings, so adjudication groups only
  kept findings. The `IssueAdjudicationReport` itself does
  **not** read `FindingFilterReport` directly — the lifecycle
  is the filter boundary. Tests 4 + 6 assert filtered
  findings are absent from `group.memberFindingIds`.
- `CoherencyDelta` consumes `IssueAdjudicationReport`. With
  filter-aware adjudication, the delta's
  `items.memberFindingIds` contain only kept findings, and
  the `remediationQueue` derives from active items only. The
  delta itself does **not** read `FindingFilterReport`
  directly. Test 5 asserts filtered findings are absent from
  `delta.items.memberFindingIds` and from the
  `remediationQueue.findingId` list.

## TESTS / VERIFICATION

Tests:
- New `tests/contract/filter-aware-lifecycle-adjudication.test.mjs`
  (7 tests, all passing).
- Full suite: 483 passed / 1 skipped / 0 failed.

Required verification commands (all run, all green):
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- `node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings lifecycle --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js issues adjudicate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js coherency delta --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `FindingReport` shape, writes, and validation — never
  mutated; the slice operates on a synthetic in-memory
  projection.
- `FindingFilterReport` writes / shape / filter rules — this
  slice only consumes the report; v1 filter rules unchanged.
- `FindingStatusLedger` — operator status decisions remain
  separate from system filtering.
- `IssueAdjudicationReport` and `CoherencyDelta` build helpers
  — no direct read of `FindingFilterReport`. They benefit
  through the lifecycle boundary only.
- Publications (`@rekon/capability-docs.architecture-summary`,
  `@rekon/capability-docs.agent-contract`) and
  `@rekon/capability-resolver` — no surface change beyond what
  the filter-aware lifecycle naturally produces (their counts
  / sections / packets reflect only kept findings now).
- All capability manifests, permissions, dist contents,
  schemaVersion strings.
- `GraphOntologyValidator` port — explicitly deferred.
- Configurable filter exclusions via `.rekon/config.json` —
  the next slice.
- `RefreshStepId` / CLI subcommand surface — unchanged.
- No version bump.
- No npm publish.

## RISKS / FOLLOW-UP

- Risk: a finding that was kept previously but filtered in the
  latest run appears in `resolvedFindings` as "resolved". This
  matches the existing semantic for findings that disappear
  between runs and is acceptable for v1. Future work could
  add a `"filtered"` lifecycle status if operators need to
  distinguish suppression from actual resolution.
- Risk: prior `FindingReport` entries are still walked as-is
  for the previous-report comparison. A finding that was
  filtered in a prior run still appears in `previousReports`.
  Currently this affects only the `new` / `existing`
  distinction (which compares ids); it does not affect the
  active surface. Future work could prefer prior
  `FindingFilterReport.keptFindings` per prior run if needed.
- Risk: current-enough check is single-id equality on the
  latest `FindingReport`. If an operator pins a specific
  `findingReportId` via options, the latest filter might not
  cite that id even though it cites a newer one; the lifecycle
  falls back to the raw report in that case, which is safe but
  loses filter awareness. Future work could resolve the
  filter report for the pinned id.
- Risk: the lifecycle synthesizes a `FindingReport`-shaped
  object that reuses the raw header. The synthetic summary is
  recomputed from `keptFindings` so totals are honest. The
  raw header's `artifactId` is preserved so prior-report
  comparison remains stable. This is intentional but means
  consumers of the lifecycle's `inputRefs[FindingReport.id]`
  see the raw report id, while the `findings[]` set is the
  kept projection — which is exactly the auditable contract
  the ADR demands.
- Follow-up: filter policy / configured exclusions v1 (the
  next slice). Then merge-decision freshness guardrails.
  Then `GraphOntologyValidator` port.

## NEXT STEP

Per the work order's closing section, the recommended next
slice is:

> Filter policy / configured exclusions v1

Purpose:
- Add explicit config-backed finding filter policies via
  `.rekon/config.json` (allowlist / denylist paths, custom
  reasons, project-specific exclusions).
- Preserve the classic `issueExclude` / persistent
  exclusion behavior.
- Filtered findings stay auditable via the existing
  `FindingFilterReport` shape with a new `policy` /
  `explicit-exclusion` source on each entry.

This is the clean follow-up after the ADR + filter audit
layer + filter-aware lifecycle that have now landed.
