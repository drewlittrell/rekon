# Review Packet — Plan-Generator Diff Data Discovery

**Slice:** `plan-generator-diff-data-discovery`
**Batch type:** Strategy / product-discovery /
docs / tests only.
**Sequence position:** First reconciliation
slice after the deliberate pause point pinned
by the
[ReconciliationPreviewReport Artifact
Decision](../../docs/strategy/reconciliation-preview-report-artifact-decision.md).
**Finding:** **no current plan generator
emits exact `beforeText` / `afterText`
data.** Every `ReconciliationPlanOperation`
shipped today carries only structural
metadata.
**Recommendation:** **do NOT register
`ReconciliationPreviewReport`** in this
slice; **schedule a narrow
`ReconciliationPlan exact-diff operation
v1` slice** as the smallest next step
that lights up the Reconciliation Preview
v1 helper's diff branch against a real
generator.
**Strict no-go list:** no
`ReconciliationPreviewReport`
registration, no `source:write`
permission registration, no
`ReconciliationApplyReport`
registration, no source-write apply, no
new CLI command, no helper change, no
`ReconciliationPlan` schema change in
this slice (the recommendation reserves
that change for the next slice), no
`buildReconciliationPreview` change, no
`rekon reconcile preview` change, no
runtime behaviour change, no GitHub API
call, no workflow YAML, no
`package.json` /
`package-lock.json` mutation, no
source-file mutation in any
`packages/*/src/*`, no network I/O, no
npm publish, no version bump, no git
tag, no GitHub Release, no new branch.

## CHANGES MADE

1. **New strategy memo
   `docs/strategy/plan-generator-diff-data-discovery.md`**
   with Decision Summary, Why This
   Discovery Exists, Current Plan
   Generation Paths, Current Operation
   Shapes, Diff-Ready Operation Classes,
   Gaps, Options Considered (A/B/C),
   Recommendation, What This Does Not
   Do, Follow-Up Work, Cross-References,
   Status.
2. **New review packet (this file)** with
   PURPOSE PRESERVATION CHECK + all 11
   required sections.
3. **New docs test
   `tests/docs/plan-generator-diff-data-discovery.test.mjs`**
   with 10 assertions covering: memo
   existence + required headings;
   current plan-generation paths
   review; current operation shapes
   review; diff-ready-classes
   classification; verbatim pins
   (*Source-write apply remains
   unavailable.*, *ReconciliationPreviewReport
   remains unregistered.*);
   recommended-next-slice statement;
   CHANGELOG mention; review packet
   existence + PURPOSE PRESERVATION
   CHECK heading.
4. **Supporting doc updates:**
   `docs/strategy/reconciliation-preview-report-artifact-decision.md`
   *Follow-Up* points at this
   discovery; `docs/strategy/reconciliation-preview-v1.md`
   notes the discovery outcome;
   `docs/concepts/reconciliation-preview.md`
   *See Also* cross-link added;
   `docs/strategy/roadmap.md` +
   `docs/strategy/classic-behavior-roadmap.md`
   list the discovery slice;
   `README.md` + `CHANGELOG.md`
   updated.

## PUBLIC API CHANGES

**None.** No new type added, removed,
renamed, narrowed, or exported. No CLI
surface added or modified. No runtime
behaviour change. No schema change. No
new artifact type. No new permission.
No new role. No workflow YAML
installed. No `package.json` mutation
in any workspace.

`@rekon/capability-reconcile` exports +
`rekon reconcile preview` /
`rekon reconcile suggest` /
`rekon reconcile` CLI commands shipped
in earlier slices are **unchanged**.

## PURPOSE PRESERVATION CHECK

Original question (from the work
order): *"Inspect Rekon's existing
ReconciliationPlan generation paths
and determine whether any current
operation class can safely emit
exact `beforeText` / `afterText`
data for Reconciliation Preview
v1."*

This memo answers that question:

- **No, none today.** Every operation
  emitted by `classifyRemediationItem`
  (the only generator path that
  produces operations) carries only
  structural metadata sourced from
  `CoherencyRemediationStep` items.
  No `beforeText`, no `afterText`,
  no `replacementText`, no diff
  body. The classifier never reads
  any source file.
- **Source-write policy preserved
  verbatim.** *Source-write apply
  remains unavailable.* The
  [Source-Write Reconciliation
  Policy Decision](../../docs/strategy/source-write-reconciliation-policy-decision.md)
  + the
  [ReconciliationPreviewReport
  Artifact
  Decision](../../docs/strategy/reconciliation-preview-report-artifact-decision.md)
  both stay in force.
- **Recommended next slice is the
  smallest useful step.** *Narrow
  ReconciliationPlan exact-diff
  operation v1.* Pick one
  deterministic operation class,
  emit exact `beforeText` +
  `afterText`, keep apply
  unavailable, prove the v1
  preview helper can render a
  real unified diff.

Reconciliation Preview v1's
read-only guarantees + the v1
preview's "no artifact write"
posture are unchanged.

## CODEBASE-INTEL ALIGNMENT

- **No code change in any
  `packages/*/src/`.** This is a
  strategy / discovery / docs /
  tests-only batch.
- **No CLI surface change.**
- **No artifact registry change.**
- **Existing
  `ReconciliationPlanOperation`
  shape is honestly recorded.**
  The memo's *Current Operation
  Shapes* table reflects the
  fields that
  `classifyRemediationItem`
  actually emits.
- **`buildReconciliationPreview`'s
  forward-compatible diff branch
  is preserved.** The memo
  cross-references the helper's
  optional `beforeText` /
  `afterText` extension as the
  exact contract the
  recommended next slice will
  use.
- **No new freshness surface.**
  The existing
  `paths freshness` /
  `artifacts freshness` /
  `artifacts validate` triplet
  is unchanged.

## PLAN GENERATION PATHS

Two paths, both in
`packages/capability-reconcile/src/index.ts`:

1. `runLegacyMode` (line 182) —
   reached via `rekon reconcile
   [--operation <name>]`. Accepts
   an explicit operation list from
   the caller. Refuses operations
   not in `ARTIFACT_ONLY_OPERATIONS`
   without explicit permission
   grants. Emits operations with
   `class: "artifact-only"` and
   nothing else.
2. `runSuggestionMode` (line 232)
   — reached via `rekon reconcile
   suggest [--finding <id>]
   [--priority p0|p1|p2] [--limit
   <n>]`. Reads the latest
   `WorkOrder` (remediation
   subtype) + `CoherencyDelta`,
   feeds their remediation items
   through `classifyRemediationItem`,
   and emits one
   `ReconciliationPlanOperation`
   per item.

`resolve.issue` (in
`packages/capability-resolver/src/index.ts`)
produces `ResolverPacket`, **not**
`ReconciliationPlan`. It is
**not** a plan generation path.

## OPERATION SHAPES

The upstream signal is
`CoherencyRemediationStep`,
defined in
`packages/kernel-findings/src/index.ts`:

| Field | Type | Patch-relevant? |
| --- | --- | --- |
| `id` | `string` | no |
| `priority` | `p0` / `p1` / `p2` | no |
| `findingId` | `string` | no |
| `title` | `string` (free-form) | no |
| `action` | `string` (free-form) | no |
| `files` | `string[]` (paths only) | partial — paths but no content |
| `systems` | `string[]` | no |
| `severity` | `critical` / `high` / `medium` / `low` | no |

`classifyRemediationItem` runs regex
matching against `title + " " + action`
and maps each step to one of seven
operation kinds. **No regex examines
file content.** **No generator reads
`<repoRoot>/<files[0]>`.** **No
canonical post-apply content is
computed.**

The emitted
`ReconciliationPlanOperation` carries:
`operation`, `class`, `status`,
`reason`, `source`, `findingId`,
`priority`, `files`, `systems`,
`suggestedAction`, optional
`requiresPermission`. **No
`beforeText`, no `afterText`, no
`replacementText`, no `diff` body, no
`expectedBeforeDigest`.**

The seven operation kinds + their
classes:

| Operation | Class | Diff-ready today? |
| --- | --- | --- |
| `docs_regeneration` | `artifact-only` | no |
| `finding_baseline_write` | `artifact-only` | no |
| `label_override_write` | `artifact-only` | no (reserved; classifier does not emit it) |
| `safe_import_rewrite` | `source-write-deferred` | no |
| `generated_scaffold_write` | `source-write-deferred` | no |
| `verification_command_run` | `command-deferred` | no |
| `manual_review` | `manual-review` | no |

## RECOMMENDATION

**Option B — narrow
`ReconciliationPlan exact-diff
operation v1`.** Smallest useful
step. Scope for that next slice
(documented in the memo, NOT
implemented in this slice):

1. Pick **one** deterministic
   operation class (decided in
   that slice; candidates are
   most likely narrow subsets
   of `docs_regeneration` or
   `generated_scaffold_write`
   where Rekon already owns
   the canonical content
   generator).
2. Teach the matching
   generator path in
   `packages/capability-reconcile/src/index.ts`
   (or a sibling helper) to:
   - read the current file
     content at
     `<repoRoot>/<files[0]>`,
   - compute the canonical
     post-apply content,
   - attach `beforeText` +
     `afterText` to the
     emitted operation.
3. Add `beforeText: string |
   undefined` and
   `afterText: string |
   undefined` (optional) to
   `ReconciliationPlanOperation`
   + its validator. Existing
   operations without these
   fields must continue to
   validate cleanly.
4. Keep source-write apply
   **unavailable**. No
   `rekon reconcile apply`.
   No `source:write` permission
   registration. No
   `ReconciliationApplyReport`
   registration.
5. End-to-end smoke: a plan
   carrying the new operation
   kind should produce a
   Reconciliation Preview v1
   entry with
   `previewable: true` + a
   real unified diff.

**If Option B's class pick is
blocked** in that slice (no
canonical content generator
exists, or every candidate
forces a source-write apply
path), the fallback is a
`ReconciliationPlan
operation-shape strengthening
decision` memo.

## TESTS / VERIFICATION

- `tests/docs/plan-generator-diff-data-discovery.test.mjs`
  — 10 assertions covering memo
  existence, required headings,
  plan-generation paths review,
  current operation shapes
  review, diff-ready-classes
  classification, verbatim pins,
  recommended-next-slice statement,
  CHANGELOG mention, review packet.
- **Full 9-command verification
  gate** ran on `698b300` before
  edits + again after edits.
- **No new contract test
  required** — no new helper,
  CLI, validator, or publisher
  in this batch.
- **No CLI smoke required** —
  docs / discovery only.

## INTENTIONALLY UNTOUCHED

- `packages/*/src/*` — no
  source change.
- `packages/cli/src/*` — no new
  CLI command, no new flag.
- `packages/capability-reconcile/src/*`
  — helper + classifier + actuator
  unchanged.
- `packages/capability-resolver/src/*`
  — `resolve.issue` unchanged.
- `packages/kernel-findings/src/*`
  — `CoherencyRemediationStep`
  unchanged.
- The artifact registry — no
  entry added, no entry renamed.
- The permission model — no
  permission added, no role
  added.
- `.github/workflows/*.yml` —
  no active workflow installed.
- Any `package.json`,
  `package-lock.json`, or
  `tsconfig.json` — no
  dependency change, no
  version bump.
- `ReconciliationPlan` artifact
  shape, validators, writer —
  unchanged. The
  recommended-next-slice
  reserves the additive change.
- `ReconciliationApplyReport`
  reservation — unchanged.
- `ReconciliationPreviewReport`
  reservation — unchanged.
- `rekon reconcile preview` /
  `rekon reconcile suggest` /
  `rekon reconcile` CLI commands
  — unchanged.

## RISKS / FOLLOW-UP

**Risks (all low):**

- *Decision drifts before next
  slice is scheduled.* If the
  Rekon side of plan generation
  changes substantially before
  the next slice (e.g., a new
  classifier path lands), this
  memo's *Current Operation
  Shapes* table can go stale.
  Mitigation: the table reflects
  exactly what
  `classifyRemediationItem`
  emits today; the
  recommended-next-slice
  contract is independent of
  which class is picked.
- *Option B's class pick is
  harder than anticipated.* The
  memo names the fallback
  (`ReconciliationPlan
  operation-shape strengthening
  decision`) so the next slice
  has a defined off-ramp.
- *Forward-compat helper diff
  branch stays dormant.* The
  v1 preview helper's diff
  branch is contract-tested
  against a synthetic plan
  fixture; this discovery does
  nothing to change that.
  Mitigation: Option B is
  exactly the slice that lights
  the branch up against a real
  plan.

**Follow-up:** none from this
slice itself. The next slice
(*narrow ReconciliationPlan
exact-diff operation v1* OR
its fallback) is what closes
the gap discovery surfaced.

## NEXT STEP

Schedule **narrow
`ReconciliationPlan exact-diff
operation v1`** as the next
reconciliation slice. The
operation-class pick + canonical
content generator design happen
in that slice; this discovery
only pins the shape of the work
+ confirms the existing
`buildReconciliationPreview`
diff branch is exactly the
contract the new operation needs
to satisfy.
