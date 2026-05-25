# Review Packet — Reconciliation Exact-Diff Operation v1

**Slice:** `reconciliation-exact-diff-operation-v1`
**Batch type:** Product capability (schema +
generator + tests + docs). First
implementation slice following the
[Plan-Generator Diff Data Discovery](../../docs/strategy/plan-generator-diff-data-discovery.md)
recommendation.
**Outcome:** Reconciliation Preview v1 now
renders a real unified diff against a real
upstream signal. **Source-write apply
remains unavailable.**
**Strict no-go list:** no source-write apply,
no `rekon reconcile apply` CLI, no
`source:write` permission registration, no
`ReconciliationApplyReport` registration, no
`ReconciliationPreviewReport` registration,
no durable preview artifact, no schema
version bump (changes are additive +
optional), no auto-resolve of findings, no
auto-apply of reconciliation, no auto-
verification, no workflow YAML, no GitHub
API call, no `package.json` /
`package-lock.json` mutation, no npm
publish, no version bump, no git tag, no
GitHub Release, no new branch, no network
I/O, no mutation of any operator repo (the
fixture lives under
`tests/fixtures/reconciliation-preview/exact-diff-v1/`
and only the contract test temp copies
are touched).

## CHANGES MADE

1. **Additive schema fields** in three
   places, all optional:
   - `CoherencyRemediationStep` (in
     `@rekon/kernel-findings`) gains
     `beforeText?: string`,
     `afterText?: string`,
     `diffKind?: "exact-text-replacement"`.
     The validator was tightened to
     typecheck these fields when present
     (must be strings; `diffKind` must be
     the literal `"exact-text-replacement"`).
   - `RemediationItemLike` (in
     `@rekon/capability-reconcile`) gains
     the same three fields.
   - `ReconciliationPlanOperation` gains
     the same three fields.
2. **New operation kind**
   `exact_text_replacement` in the
   `ReconciliationOperation` union.
3. **New safety-gated classifier branch**
   `tryClassifyExactTextReplacement` in
   `packages/capability-reconcile/src/index.ts`.
   Performs eight preconditions: patch
   triple present + non-empty; `diffKind`
   recognized; `repoRoot` supplied; exactly
   one file path; path is repo-relative
   (no leading `/`, no `..` escape after
   `pathResolve`); current file exists +
   readable; current content equals
   `beforeText`; `afterText` differs from
   `beforeText`. ALL must hold to emit
   patch fields. ANY failing precondition
   drops the patch fields silently and
   falls through to the regex-based
   classifier (the item still produces a
   deferred operation, just without diff
   data). Never invents a patch.
4. **Classifier signature change**:
   `classifyRemediationItem` +
   `suggestReconciliationOperations` +
   `ReconciliationSuggestionInput` now
   accept an optional `repoRoot` string.
   Absent → patch fields are silently
   dropped from any candidate operation.
5. **CLI wiring**: `rekon reconcile
   suggest` now passes
   `repoRoot: root` through the
   actuator input so the classifier's
   file-read safety check runs against
   the real working tree. The existing
   `rekon reconcile preview` command's
   forward-compatible diff branch
   (shipped in v1) lights up
   automatically against the new
   operation.
6. **Deterministic fixture** at
   `tests/fixtures/reconciliation-preview/exact-diff-v1/`
   with `target.ts` and a README. The
   contract test seeds a
   `CoherencyDelta` directly into the
   temp copy's artifact store, then
   runs `reconcile suggest` to produce
   a real `ReconciliationPlan` whose
   operation carries the exact-diff
   fields. This avoids the
   anti-pattern of seeding a
   pre-baked `ReconciliationPlan` —
   the plan is genuinely generated
   through the existing actuator path.
7. **New contract test
   `tests/contract/reconciliation-exact-diff-operation.test.mjs`**
   with all 13 required assertions.
8. **New strategy memo
   `docs/strategy/reconciliation-exact-diff-operation-v1.md`**.
9. **New review packet (this file)**
   with PURPOSE PRESERVATION CHECK +
   all 11 required sections.
10. **New 7-assertion docs test
    `tests/docs/reconciliation-exact-diff-operation.test.mjs`**.
11. **Supporting doc updates** to the
    reconciliation preview concept,
    reconciliation plans concept,
    `ReconciliationPlan` artifact
    reference, plan-generator
    discovery memo (Follow-Up
    resolves to this slice), preview
    report decision (now references
    the satisfied gating condition
    #1), source-write reconciliation
    policy decision, both roadmaps,
    README, CHANGELOG.

## PUBLIC API CHANGES

**Additive only.** All new fields are
optional. Existing callers continue to
work without modification.

| Name | Kind | Notes |
| --- | --- | --- |
| `CoherencyRemediationStep.beforeText` / `.afterText` / `.diffKind` | optional fields | additive on a kernel-findings type; existing CoherencyDelta artifacts validate cleanly |
| `RemediationItemLike.beforeText` / `.afterText` / `.diffKind` | optional fields | additive on a capability-reconcile public type |
| `ReconciliationPlanOperation.beforeText` / `.afterText` / `.diffKind` | optional fields | additive on a capability-reconcile public type |
| `ReconciliationOperation` union | additive `"exact_text_replacement"` variant | only emitted by the new safety-gated branch |
| `ReconciliationSuggestionInput.repoRoot` | optional field | absent → classifier silently drops patch fields |
| `suggestReconciliationOperations(input)` | signature additive | reads `input.repoRoot` |
| `classifyRemediationItem(item, source, repoRoot?)` | internal signature additive | third positional parameter optional |

No CLI surface added. No new permission.
No new role. No new artifact type. No
workflow YAML installed. No
`package.json` mutation in any
workspace. No schema-version bump.

## PURPOSE PRESERVATION CHECK

Original question (work order):
*"Implement the smallest safe operation
class that can emit exact `beforeText` /
`afterText` data into
`ReconciliationPlanOperation`, so
Reconciliation Preview v1 can render a
real unified diff from a real generated
plan."*

This batch implements that, with all
the safety guarantees the source-write
policy requires:

- **Plan generation can produce at
  least one deterministic, exact-diff
  preview.** `exact_text_replacement`
  is that operation kind, gated by an
  eight-precondition safety check.
- **Reconciliation Preview can render
  the diff.** The contract test
  confirms `--json` output carries
  `previewable: true` + a unified
  diff with `--- a/target.ts` /
  `+++ b/target.ts` / `-import {
  legacy }` / `+import { modern }`.
- **The diff is inspectable by the
  operator.** Human + JSON output
  surfaces it.
- **Source-write apply remains
  unavailable.** The strategy memo
  and review packet pin this; the
  CLI ships no apply path; no
  permission was registered.
- **A previewable diff does not
  imply permission to mutate
  source.** The operation's
  `requiresPermission: ["write:source"]`
  marker is honest signal — but
  `write:source` is still
  unregistered.

Source-write policy preserved
verbatim:

- *Source-write apply remains
  unavailable.* — pinned in the
  strategy memo + asserted by docs
  test.
- *`ReconciliationPreviewReport`
  remains unregistered.* — pinned;
  the
  [ReconciliationPreviewReport
  artifact decision](../../docs/strategy/reconciliation-preview-report-artifact-decision.md)
  reservation stays intact.
- *Exact diff is generated only
  when deterministic.* — eight-step
  safety gate enforces it.
- *Preview does not resolve
  findings.* — preserved from
  Reconciliation Preview v1.

Failure cases listed in the work
order's PURPOSE PRESERVATION CHECK
are all explicitly ruled out:

- ✗ "The operation writes source
  files." — never. The classifier
  reads, never writes; the preview
  helper reads, never writes; no
  apply path exists.
- ✗ "The diff is invented from
  vague text." — never. Patch text
  must be supplied verbatim by the
  upstream signal; safety check #7
  rejects anything that doesn't
  match the current file
  byte-for-byte.
- ✗ "The generator emits before/
  after data without verifying
  current file content." — safety
  check #6 + #7 verify both
  existence and content.
- ✗ "Preview becomes durable
  without the artifact decision
  being revisited." — no
  `ReconciliationPreviewReport`
  written. The artifact decision is
  unchanged.
- ✗ "A successful preview
  automatically resolves
  findings." — preview never
  touches `FindingStatusLedger`
  or any finding status.

## CODEBASE-INTEL ALIGNMENT

- **`@rekon/kernel-findings`:**
  `CoherencyRemediationStep` schema
  extended additively; validator
  tightened. No new artifact type, no
  new validator entry-point export.
- **`@rekon/capability-reconcile`:**
  `RemediationItemLike` +
  `ReconciliationPlanOperation`
  extended additively;
  `ReconciliationOperation` union
  gains one variant;
  `suggestReconciliationOperations`
  + `classifyRemediationItem` learn
  to honor `repoRoot`. The actuator
  passes `input.repoRoot` through.
- **`@rekon/capability-reconcile`
  preview helper:** unchanged. The
  forward-compatible diff branch
  shipped in commit `b127d08`
  already handles the new operation
  shape correctly (`source-write-
  deferred` class + diff fields →
  diff branch triggers). No
  preview-helper code change.
- **`packages/cli`:** one-line input
  extension on `rekon reconcile
  suggest`. The existing
  `rekon reconcile preview` command
  is unchanged.
- **Artifact registry, schema set,
  permission model:** unchanged. No
  new artifact category. No new
  permission. No new role.

## OPERATION CLASS SELECTED

**`exact_text_replacement`** — a new
operation kind specifically for
deterministic byte-precise text
replacement. Selected over retrofitting
any of the seven existing kinds
because:

- Existing kinds use regex matching
  over free-form `title + action`
  text. Bolting patch verification
  onto regex matching would risk
  the "invent a patch from vague
  text" failure mode the work order
  forbids.
- Introducing a dedicated kind
  makes the patch-data path
  explicit: either the upstream
  signal carries verifiable patch
  text *and* the classifier verifies
  it against the working tree, or
  the patch fields don't exist and
  the operation classifies normally.
- Future operation classes that
  want exact-diff behaviour can
  follow the same pattern (carry
  patch fields → safety-gate →
  `source-write-deferred` operation
  with diff). The next slice will
  decide whether that pattern
  expands.

## EXACT DIFF MODEL

The eight-precondition safety gate
(`tryClassifyExactTextReplacement`)
runs at **plan-generation time** in
the classifier. The
`buildReconciliationPreview` helper
runs an independent **preview-time**
gate that re-reads the file and
checks the current content still
matches `beforeText`. The
double-gate catches operator-side
edits between `reconcile suggest`
and `reconcile preview` and flips
the operation to
`previewable: false` with the
canonical mismatch reason.

The emitted diff is the v1
helper's deterministic unified-diff
rendering:

```
--- a/<path>
+++ b/<path>
@@ -1,N +1,M @@
-<every beforeText line>
+<every afterText line>
```

No diff library dependency. No
hunk minimization. The contract
test asserts the diff contains
both file headers and both
canonical edit lines (`-import {
legacy }` and `+import { modern }`).

## PREVIEW BEHAVIOR

The CLI command sequence in the
fixture:

```bash
# 1. seeded CoherencyDelta carrying patch fields → produces a ReconciliationPlan
rekon reconcile suggest --root <root> --json

# 2. preview the plan
PLAN_REF="$(rekon artifacts latest --root <root> --type ReconciliationPlan --id-only)"
rekon reconcile preview --root <root> --plan "$PLAN_REF" --json
```

The preview JSON now contains:

```json
{
  "kind": "rekon.reconciliation.preview",
  "operations": [
    {
      "kind": "source-patch",
      "path": "target.ts",
      "risk": "high",
      "previewable": true,
      "diff": {
        "format": "unified",
        "text": "--- a/target.ts\n+++ b/target.ts\n@@ -1,9 +1,9 @@\n-...\n+...\n"
      }
    }
  ],
  "recommendation": {
    "applyAvailable": false,
    "message": "Source-write apply is not available. Review this preview and apply manually."
  }
}
```

If the operator edits the target
file between `suggest` and
`preview`, the same operation
flips to:

```json
{
  "previewable": false,
  "reason": "Current file content does not match expected before text."
}
```

No source files are mutated. No
new artifacts are written by the
preview command. `artifacts
validate` stays clean.

## TESTS / VERIFICATION

- `tests/contract/reconciliation-exact-diff-operation.test.mjs`
  — 13 assertions:
  1. validator accepts optional
     patch fields
  2. validator accepts steps
     without patch fields
  3. classifier emits patch fields
     on the happy path
  4. classifier drops patch fields
     when current file is missing
  5. classifier drops patch fields
     when path escapes repoRoot
  6. classifier drops patch fields
     when afterText equals
     beforeText
  7. preview marks the generated
     operation previewable
  8. preview renders a real
     unified diff
  9. preview rejects when current
     file no longer matches
     beforeText
  10. `--json` returns previewable
      operation + diff together
  11. source files unchanged
      before/after preview
  12. no `ReconciliationPreviewReport`
      written
  13. `artifacts validate` stays
      clean.
- `tests/docs/reconciliation-exact-diff-operation.test.mjs`
  — 7 assertions covering the
  required strategy memo, optional
  fields documentation, exact-diff
  determinism pin, source-write
  apply unavailable pin, "does not
  resolve findings" pin, CHANGELOG
  mention, review packet existence
  + PURPOSE PRESERVATION CHECK.
- **Full 9-command verification
  gate** ran on `9ad6ddc` before
  edits + again after edits.
- **CLI smoke** on the new fixture
  produces a real unified diff
  with `previewable: true` and
  `recommendation.applyAvailable:
  false`.

## INTENTIONALLY UNTOUCHED

- `rekon reconcile apply` — not
  implemented; remains absent.
- `source:write` permission — not
  registered; remains reserved.
- `ReconciliationApplyReport`
  artifact — not registered;
  remains reserved.
- `ReconciliationPreviewReport`
  artifact — not registered;
  reservation from the artifact
  decision is unchanged.
- `buildReconciliationPreview`
  helper body — already had the
  forward-compatible diff branch.
  No change.
- `rekon reconcile preview` CLI —
  unchanged. The diff renders
  through the existing CLI surface.
- `rekon reconcile` /
  `rekon reconcile suggest` CLI
  flag set — unchanged. Only the
  internal input object passed
  to the actuator gains
  `repoRoot`.
- The artifact registry, schema
  set, and permission model —
  unchanged.
- `ReconciliationPlan` artifact
  shape — additive optional
  fields on operations only; no
  schema-version bump.
- `.github/workflows/*.yml` — no
  active workflow installed.
- Any `package.json`,
  `package-lock.json`, or
  `tsconfig.json` — no dependency
  change, no version bump.
- The fixture's `target.ts` —
  byte-identical before and after
  every test run (asserted).

## RISKS / FOLLOW-UP

**Risks (all low):**

- *Plan-time safety check could be
  bypassed if a new caller of
  `suggestReconciliationOperations`
  forgets `repoRoot`.* Mitigation:
  the safety gate's behaviour is
  "drop patch fields silently when
  `repoRoot` is absent" — this is
  safer than emitting unverified
  patch fields, and the
  forward-compatible diff branch
  in the preview helper also
  performs its own check before
  rendering a diff. The classifier's
  comment block + the JSDoc on
  `ReconciliationSuggestionInput`
  flag the importance.
- *Operator confusion if the
  same `reconcile suggest` run
  produces a plan with a real
  diff but the file gets edited
  before the operator runs
  `reconcile preview`.* The
  preview-time gate flips the
  operation to
  `previewable: false` with the
  canonical reason. The contract
  test pins this behaviour. No
  silent stale diff.
- *Schema lock-in on the new
  patch fields before more
  operation classes exist.*
  Mitigation: the fields are
  optional and additive on three
  types. They can grow (e.g., add
  `expectedBeforeDigest`,
  `signedBy`) in future slices
  without breaking existing
  consumers.

**Follow-up:**

- *Exact-diff operation safety
  review* — the work order's
  recommended next slice. Reviews
  whether the eight-precondition
  shape is right for additional
  operation classes,
  ReconciliationPreviewReport
  registration, and apply
  permission design.

## NEXT STEP

**Exact-diff operation safety
review.** Inputs:

- this slice's eight-step safety
  gate (canonical for any future
  exact-diff operation),
- the double-gate (plan-time +
  preview-time) drift behaviour,
- the contract test's 13 pins
  (treated as the canonical
  exact-diff contract until
  superseded),
- the
  [ReconciliationPreviewReport
  Artifact Decision](../../docs/strategy/reconciliation-preview-report-artifact-decision.md)
  gating conditions (condition
  #1 has now fired; the
  decision said *at least two
  of four* must fire for
  registration to be worth
  doing — so registration is
  still not triggered, but the
  review could re-evaluate that
  bar),
- the
  [Source-Write Reconciliation
  Policy Decision](../../docs/strategy/source-write-reconciliation-policy-decision.md)
  step 6 (apply permission +
  rollback design memo).

The review slice will explicitly
either (a) endorse the safety
shape + queue additional
operation classes, (b) propose
preview-report registration in
parallel with apply design, or
(c) defer further reconciliation
work until apply lands. Until
that review runs, no further
reconciliation slice is queued.
