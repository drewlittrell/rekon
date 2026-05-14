# CoherencyDelta v2 from IssueAdjudicationReport

## Batch Summary

`CoherencyDelta` now consumes `IssueAdjudicationReport` when one
exists, so the governance rollup operates on **adjudicated issue
groups** instead of raw lifecycle findings. Duplicate / overlapping
findings collapse into one delta item and one remediation step.
Raw findings remain inspectable via the unchanged
`FindingLifecycleReport` plus the new per-item `memberFindingIds`.
Closes the coherency-consumption slice of P1.1 in the Classic
Guarantees Audit (after v1 adjudication shipped earlier in the
same `0.1.0-alpha.1` cycle).

## CHANGES MADE

- `packages/kernel-findings/src/index.ts`:
  - `CoherencyDeltaItem` gained four optional group-aware fields:
    `issueGroupId`, `canonicalFindingId`, `memberFindingIds`,
    `groupingReasons`. Absent for lifecycle-mode items, so the
    additive change is backward compatible.
  - `CoherencyDeltaInput` widened additively: `findings` /
    `resolvedFindings` / `systemsForFinding` are now optional, and
    new optional `issueGroups: IssueAdjudicationGroup[]` /
    `systemsForIssueGroup` fields enable group mode. Lifecycle-mode
    callers continue to pass the same three fields unchanged.
  - `createCoherencyDelta` dispatches on input: when
    `issueGroups` is non-empty, items are built from groups; else
    the legacy lifecycle path runs.
  - New internal helpers: `buildItemFromIssueGroup` (constructs a
    delta item from an adjudication group, including
    `coherency:group:<group-id>` id, group→item status mapping,
    union of declared and callback-computed systems with
    `["unknown"]` fallback, and the four new group-aware fields)
    and `mapGroupStatusToItem` (the deterministic group-status →
    item-status translation).
  - `createCoherencyDelta` remediation step id is now
    `remediation:group:<group-id>` in group mode (vs.
    `remediation:<finding-id>` in legacy mode) so adjudicated
    rollups produce one step per active group, not one per
    duplicate member.
- `packages/runtime/src/index.ts`:
  - `buildCoherencyDelta` now prefers the latest
    `IssueAdjudicationReport` when no explicit `lifecycleReportId`
    is requested. It cites the report in `header.inputRefs` along
    with every ref the report itself carried (transitively the
    `FindingLifecycleReport`, `FindingReport`(s),
    `FindingStatusLedger`).
  - In group mode, the `systemsForIssueGroup` callback prefers
    `group.systems` when populated; otherwise it walks the
    group's `files` through `OwnershipMap` + `ObservedRepo`
    longest-prefix matching exactly like the legacy
    `systemsForFinding` path.
  - When no `IssueAdjudicationReport` exists, or the caller pins
    a `lifecycleReportId`, the legacy lifecycle path runs
    unchanged.
  - Imported `IssueAdjudicationGroup` type alongside the existing
    `IssueAdjudicationReport` type so the systems callback can
    be typed precisely.
- `packages/cli/src/index.ts`:
  - `RefreshStepId` adds `"issues.adjudicate"` between
    `"findings.lifecycle"` and `"coherency.delta"`.
  - `REQUIRED_REFRESH_ARTIFACT_TYPES` and `MAJOR_FRESHNESS_TYPES`
    both add `"IssueAdjudicationReport"` so refresh requires the
    new artifact family and the freshness gate verifies it.
  - `runRefresh` now invokes `buildIssueAdjudicationReport`
    between findings.lifecycle and coherency.delta, writes the
    artifact under `findings`, and records it in the steps array
    with the report's `summary` attached.
- `tests/contract/coherency-delta-adjudicated.test.mjs`: 11 new
  tests covering pure-helper group mode, remediation-queue
  collapse, status preservation, mixed-with-active, legacy
  fallback, runtime helper preference and fallback, CLI
  group-aware coherency, refresh step ordering + IssueAdjudicationReport
  in latestMajor, freshness invalidation by newer adjudication
  report, and artifacts-validate cleanliness.
- `tests/contract/refresh-command.test.mjs`: extended
  `EXPECTED_STEP_ORDER` to include `"issues.adjudicate"`,
  extended `REQUIRED_ARTIFACT_TYPES` to include
  `"IssueAdjudicationReport"`, and updated the "records artifact
  refs on each producing step" list to require artifacts on the
  new step.
- Docs:
  - `docs/artifacts/coherency-delta.md` — group-aware fields on
    the item type, new "Adjudicated Mode (v2)" + "Legacy Lifecycle
    Mode (v1)" sections, updated inputRefs + freshness narrative.
  - `docs/concepts/coherency-delta.md` — replaced the prior
    "Future input" callout with a current "Adjudicated input
    (v2)" callout.
  - `docs/artifacts/issue-adjudication-report.md` and
    `docs/concepts/issue-adjudication.md` — mark `CoherencyDelta`
    v2 consumption as shipped; `resolve.issue` v2 remains
    deferred.
  - `docs/concepts/refresh.md` — lifecycle list adds step 8
    `issues.adjudicate`; numbering shifted; latest-major list
    adds `IssueAdjudicationReport`; sample JSON output adds the
    new step.
  - `docs/strategy/classic-guarantee-regression-plan.md` — P1.1
    entry records the shipped v2 slice and the new 11-test suite.
  - `docs/strategy/classic-subsystem-purpose-map.md` — subsystem
    6 reads "P1 preserved (v1 + coherency v2)"; subsystem 7
    records v2 group-aware mode.
  - `docs/strategy/classic-behavior-roadmap.md` — new Phase B
    entry.
  - `docs/strategy/roadmap.md` — new bullet under completed
    alpha spine.
  - `README.md` — the refresh lifecycle string in the prose now
    includes `issues adjudicate`.
  - `CHANGELOG.md` — entry at the top of the `0.1.0-alpha.1`
    section.
- `.rekon-dev/review-packets/coherency-delta-v2-adjudicated.md`
  (this file).

## PUBLIC API CHANGES

Additive only.

- `CoherencyDeltaItem` gains four optional fields:
  `issueGroupId`, `canonicalFindingId`, `memberFindingIds`,
  `groupingReasons`.
- `CoherencyDeltaInput` widens: previously-required `findings` /
  `resolvedFindings` / `systemsForFinding` become optional, and
  new optional `issueGroups` / `systemsForIssueGroup` fields are
  added.
- `@rekon/runtime.buildCoherencyDelta` continues to take
  `(store, options?: BuildCoherencyDeltaOptions)`. Behavior
  changes to prefer `IssueAdjudicationReport` when one exists;
  legacy lifecycle behavior is preserved as a fallback.
- `rekon refresh` step list gains `"issues.adjudicate"` between
  `"findings.lifecycle"` and `"coherency.delta"`.
- `REQUIRED_REFRESH_ARTIFACT_TYPES` and `MAJOR_FRESHNESS_TYPES`
  both add `"IssueAdjudicationReport"`.
- No new CLI commands. No `ArtifactHeader` shape changes. No new
  capability roles, permissions, or actuators. No version bump.
  No npm publish.

## PURPOSE PRESERVATION CHECK

- **Original problem**: raw findings can be duplicated or
  overlapping across evaluators / runs. If `CoherencyDelta` rolls
  them up directly, summary counts, remediation queues, and
  affected-path totals overstate the true issue set.
- **Classic workflow guarantee**: classic issue detection /
  adjudication fed `replatform-delta` with **governed issue
  state**, not unprocessed lint-like findings. The classic
  coherency summaries represented operational drift, not noisy
  detector output.
- **Classic shape that provided the guarantee**:
  `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`, `services/issues/**`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`.
- **Rekon equivalent guarantee**: `IssueAdjudicationReport` groups
  related findings deterministically. `CoherencyDelta` v2 now
  consumes those groups: one delta item per group, one
  remediation step per active group, with `memberFindingIds` /
  `groupingReasons` carrying raw-finding traceability. Raw
  findings remain available through the unchanged
  `FindingLifecycleReport` and the unchanged `FindingReport`s.
- **What would mean we failed**:
  - `CoherencyDelta` still double-counts duplicate findings when
    `IssueAdjudicationReport` exists. (Closed by the
    `rekon coherency delta after issues adjudicate emits
    group-aware items` test plus the pure-helper duplicate-group
    test that asserts `delta.items.length === 1`.)
  - Accepted / ignored / resolved group status is lost. (Closed
    by the `accepted / ignored / resolved groups are not active
    and not in remediationQueue` test.)
  - `remediationQueue` creates duplicate steps for the same
    adjudicated issue group. (Closed by the
    `one remediation step per active group` test.)
  - Raw findings become inaccessible. (Closed by the
    `memberFindingIds` field present on every group-mode item —
    asserted in three tests — and by the legacy lifecycle
    fallback test that proves the original behavior still works.)
  - `CoherencyDelta` mutates adjudication or lifecycle artifacts.
    (No mutation path exists; the v1 adjudication batch's
    bytes-on-disk identity test in
    `tests/contract/issue-adjudication.test.mjs` still passes
    after this batch.)
- **Regression test for the original problem**: the prescribed
  case — "given an IssueAdjudicationReport with one group
  containing two duplicate findings, `rekon coherency delta`
  emits one CoherencyDelta item and one remediation step while
  preserving memberFindingIds" — is pinned by
  `rekon coherency delta after issues adjudicate emits
  group-aware items` plus the underlying pure-helper tests.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability or failure mode**: issue adjudication
  feeding coherency delta / remediation roll-up.
- **Relevant classic files/systems**:
  `services/IssueDetectionService.ts`, `services/issues/**`,
  `domain/issues/mergeIssues.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`,
  `packages/product-codebase-intel/src/reconcile/PlanHandler.ts`,
  `docs/strategy/classic-guarantees-audit.md`,
  `docs/strategy/classic-wins.md`,
  `docs/strategy/classic-alignment-map.md`.
- **What Rekon keeps**: coherency summary is based on governed
  issue state; duplicate findings should not inflate active
  drift counts; accepted / ignored / resolved state affects
  active work; remediation queue operates on actionable issue
  groups; raw findings remain auditable; output is artifact-backed
  with `inputRefs`.
- **What Rekon simplifies**: deterministic adjudication groups
  only; no semantic / fuzzy issue merge; no health score; no
  trend; no watch alerts; no assistant-doc delta projection
  expansion; no remediation auto-apply.
- **What Rekon does not port yet**: full classic coherency delta
  projection set; weighted health penalty; trend from previous
  delta; semantic issue merge; false-positive classifier; watch
  alert generation; reconciliation plan generation beyond existing
  suggestions; `resolve.issue` v2 consumption of adjudicated
  groups.
- **How this advances migration**: connects the v1
  `IssueAdjudicationReport` to the existing `CoherencyDelta`,
  moving governance roll-up from raw findings toward adjudicated
  issue groups. Prepares `resolve.issue` v2 and publication
  surfaces to reason about governed issue groups. Subsystem 6 in
  `docs/strategy/classic-subsystem-purpose-map.md` reads "P1
  preserved (v1 + coherency v2)"; subsystem 7 records the v2
  group-aware mode.

## ADJUDICATED COHERENCY MODEL

When `buildCoherencyDelta` runs and an `IssueAdjudicationReport`
exists in the store (and the caller did not pin a specific
`lifecycleReportId`), the delta is built **from groups**:

- For each group: emit one `CoherencyDeltaItem` with
  `id = coherency:group:<group-id>`,
  `findingId = canonicalFindingId` (back-compat for consumers
  keyed on `findingId`),
  `issueGroupId / canonicalFindingId / memberFindingIds /
  groupingReasons` from the group,
  `type / severity / title / description / files / subjects /
  suggestedAction / evidence` from the group,
  `systems` from `group.systems ∪ systemsForIssueGroup(group) ∪
  ["unknown"]-fallback`,
  `status / active` from `mapGroupStatusToItem(group)`.
- For each active item (i.e. derived from an active or
  mixed-with-active group): emit one `CoherencyRemediationStep`
  with `id = remediation:group:<group-id>`,
  `findingId = canonicalFindingId`, priority from
  `severityToPriority(severity)`, action from
  `suggestedAction || "Address <type> in <files>"`.
- `header.inputRefs` carry the `IssueAdjudicationReport` ref
  plus every ref that report carried (lifecycle / reports /
  ledger).

Group → item status mapping:

| Group status | Item status | `item.active` |
| --- | --- | --- |
| `active` | `existing` | `true` |
| `accepted` | `accepted` | `false` |
| `ignored` | `ignored` | `false` |
| `resolved` | `resolved` | `false` |
| `mixed` (with `group.active`) | `existing` | `true` |
| `mixed` (without `group.active`) | `accepted` | `false` |

When no `IssueAdjudicationReport` exists or the caller pins
`lifecycleReportId`, the legacy lifecycle path runs unchanged:
one item per `EffectiveFinding`, item id
`coherency:<finding-id>`, step id `remediation:<finding-id>`, no
group-aware fields populated.

## REFRESH PIPELINE UPDATE

`runRefresh` now executes:

```
init → config.validate → observe → project → snapshot → evaluate
  → findings.lifecycle → issues.adjudicate → coherency.delta
  → publish.architecture → artifacts.validate → artifacts.freshness
```

The new step writes an `IssueAdjudicationReport` (via
`buildIssueAdjudicationReport`) and records its `summary` in the
step output. `REQUIRED_REFRESH_ARTIFACT_TYPES` adds
`"IssueAdjudicationReport"` so refresh fails if the new artifact
is missing. `MAJOR_FRESHNESS_TYPES` adds it so the latest-major
freshness gate verifies the latest adjudication report is current
(invalidated by any newer `FindingLifecycleReport`).

## TESTS / VERIFICATION

- `npm run typecheck` ✓
- `npm run build` ✓
- `git diff --check` ✓
- `npm run test` — 372 passed, 1 skipped optional, 0 failed.
  Includes the 11 new contract tests in
  `tests/contract/coherency-delta-adjudicated.test.mjs`. The
  existing 10 `coherency-delta.test.mjs` tests still pass
  (legacy fallback path). The existing 11
  `refresh-command.test.mjs` tests still pass with the updated
  step-order list.
- `node scripts/audit-license.mjs` ✓ (19 packages)
- `node scripts/audit-package-exports.mjs` ✓ (19 packages)
- `node scripts/publish-dry-run.mjs` ✓ (19 packages)
- `node scripts/install-smoke.mjs` ✓
- `node scripts/install-tarball-smoke.mjs` ✓ (19 tarballs, 13
  artifacts emitted)
- Prescribed CLI smoke against `examples/simple-js-ts`:
  - `rekon refresh` → status `passed`; step order is
    `init,config.validate,observe,project,snapshot,evaluate,findings.lifecycle,issues.adjudicate,coherency.delta,publish.architecture,artifacts.validate,artifacts.freshness`
  - `rekon issues adjudicate` → wrote
    `IssueAdjudicationReport-issue-adjudication-<timestamp>` (0
    groups for the clean example fixture)
  - `rekon coherency delta` → wrote
    `CoherencyDelta-coherency-delta-<timestamp>` (0 items;
    group-aware fields N/A because there are no groups)
  - `rekon artifacts validate` → `valid: true`
  - `rekon artifacts freshness` → 15 artifacts indexed (clean
    fixture has zero findings, so adjudication and coherency
    emit empty artifacts; the lineage / freshness chain is intact)
- The seeded-duplicates case is exercised end-to-end by the
  contract tests, which assert: `delta.items.length === 1`,
  `delta.remediationQueue.length === 1`,
  `delta.remediationQueue[0].id === "remediation:group:<group-id>"`,
  `item.memberFindingIds === ["finding-alpha-1", "finding-alpha-2"]`,
  and `delta.header.inputRefs` includes the adjudication report.

## INTENTIONALLY UNTOUCHED

- `FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`,
  `EffectiveFinding`, `Finding`, and `IssueAdjudicationReport`
  shapes unchanged.
- `buildFindingLifecycleReport` and
  `buildIssueAdjudicationReport` behavior unchanged. The latter
  is now also invoked from `runRefresh` but its inputs / outputs
  are identical.
- `resolve.issue` continues to operate on raw findings. No v2
  consumption of adjudicated groups in this batch.
- No new CLI commands. `rekon coherency delta` and `rekon issues
  adjudicate` / `rekon issues list` keep their existing
  signatures; the change is which input source the underlying
  helper prefers.
- No new capability roles, permissions, or actuators. No
  source-write surface. No watcher. No LLM.
- No version bump. No npm publish.

## RISKS / FOLLOW-UP

- **Risk**: a consumer that previously keyed on
  `CoherencyDeltaItem.findingId` to look up the raw finding now
  receives the **canonical** finding id (the group's chosen
  representative), not necessarily the original duplicate. The
  member list is still available via `memberFindingIds`.
  Mitigation: `findingId` continues to point at a valid raw
  finding (the canonical one), so existing consumers do not
  crash; the docs explicitly note the v2 behavior so consumers
  can adopt `memberFindingIds` when they need the full set.
- **Risk**: `remediationQueue` step id changed from
  `remediation:<finding-id>` to `remediation:group:<group-id>`
  in group mode. Mitigation: a consumer that parses step ids
  for routing should accept both forms; the docs and the CHANGELOG
  call this out. The legacy lifecycle path still emits the
  original `remediation:<finding-id>` id.
- **Risk**: a repo with stale `IssueAdjudicationReport`s in the
  store but fresh `FindingLifecycleReport`s will get group-mode
  coherency built from stale groups. Mitigation: `rekon refresh`
  always rebuilds the adjudication report before coherency, so
  the orchestrated flow stays current. The freshness gate marks
  stale adjudication reports via `newer-input-exists` and refresh
  fails until the chain is current. Standalone `rekon coherency
  delta` invocations after seeding stale fixtures should be
  preceded by `rekon issues adjudicate`; docs say so.
- **Risk**: a future operator runs `rekon issues adjudicate` but
  not `rekon coherency delta`, so the agent contract publication
  still reflects raw-finding counts. Mitigation: `rekon refresh`
  is the recommended single command for the full chain. CI /
  scripted workflows should prefer refresh over per-verb
  invocation.
- **Follow-up**: `resolve.issue` v2 consuming `IssueAdjudicationReport`
  groups (the recommended next batch). Until that lands,
  `resolve.issue` continues to operate on raw findings; group
  context is not propagated into resolver packets.
- **Follow-up**: per-system weighting in the coherency summary,
  trend (delta-over-delta), health score, semantic dedupe,
  false-positive classifier, LLM review. All explicitly deferred
  per the work order's non-goals.

## NEXT STEP

Push `main` directly after checks pass. Commit on the worktree's
detached HEAD, fast-forward local `main` from the primary
worktree, push `origin/main`. Per the user's queued sequence, the
next batch is **resolve.issue v2 from IssueAdjudicationReport** —
the issue resolver should operate on adjudicated groups when
available (with raw-finding fallback) and surface group context in
the resolver packet's resolutionTrace.
