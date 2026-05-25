# Reconciliation Exact-Diff Operation v1

**Status:** shipped.
**Slice:** `reconciliation-exact-diff-operation-v1`.
**Sequence position:** Implementation slice
following the
[Plan-Generator Diff Data Discovery](plan-generator-diff-data-discovery.md)
memo's recommended next step (Option B —
narrow `ReconciliationPlan` exact-diff
operation v1).

## Decision Summary

Rekon now ships **one** deterministic plan
operation kind that emits exact
`beforeText` / `afterText` data:
`exact_text_replacement`. The classifier
emits this operation **only** when every
plan-generation-time safety check passes
(complete patch triple, repo-relative
single-file path, current file exists,
current content matches `beforeText`
byte-for-byte, `afterText` differs).
When any check fails, the patch fields
are silently dropped and the item falls
through to the regex-based classifier.
The operation's class is
`source-write-deferred`; status
`deferred`. Reconciliation Preview v1
lights up its forward-compatible diff
branch against the new operation and
renders a **real unified diff**.

**Source-write apply remains
unavailable.** This slice ships **no**
`rekon reconcile apply` CLI. No
`source:write` permission registration.
No `ReconciliationApplyReport`
registration. The
[ReconciliationPreviewReport Artifact
Decision](reconciliation-preview-report-artifact-decision.md)
remains in force: the artifact name
stays reserved, registration stays
deferred. The
[Source-Write Reconciliation Policy
Decision](source-write-reconciliation-policy-decision.md)
is unchanged.

## Why This Slice Exists

The
[Plan-Generator Diff Data Discovery](plan-generator-diff-data-discovery.md)
memo found that **no current plan
generator emits exact patch data**. It
recommended a narrow next slice: pick
one deterministic operation class,
attach exact `beforeText` /
`afterText`, prove Reconciliation
Preview v1 can render a real unified
diff against a real generator. This
slice executes that recommendation.

The recommendation's rationale stands
unchanged: a previewable diff exists
*today*, the
[ReconciliationPreviewReport gating
condition #1](reconciliation-preview-report-artifact-decision.md)
("a plan generator emits forward-compat
`beforeText` + `afterText` for at least
one real operation class") is now
**satisfied**, and source-write apply
remains a separate decision that needs
its own slice.

## Operation Class Selected

**Selected:** `exact_text_replacement`
(new operation kind in
`ReconciliationOperation`).

| Field | Value |
| --- | --- |
| Operation kind | `exact_text_replacement` |
| Class | `source-write-deferred` (apply would mutate source if it existed) |
| Status | `deferred` |
| Permission | `write:source` (still unimplemented) |
| Patch fields | `beforeText`, `afterText`, `diffKind: "exact-text-replacement"` |
| Triggering source | a `CoherencyRemediationStep` carrying the same three patch fields |

**Why this class:** the discovery memo
ruled out retrofitting any of the
existing seven operation kinds because
their classifier is regex-only over
free-form text and would risk inventing
patches. Introducing a single new kind
makes the patch-data path explicit:
either the upstream signal carries
exact patch text and Rekon verifies it
against the working tree, or the patch
fields are dropped and the operation
classifies normally.

## Exact Diff Model

The plan-generation-time safety gate
(`tryClassifyExactTextReplacement` in
`packages/capability-reconcile/src/index.ts`)
enforces **eight** preconditions. **All
must hold** for the classifier to emit
patch fields:

1. The item carries non-empty
   `beforeText`, `afterText`, and
   `diffKind` strings.
2. `diffKind === "exact-text-replacement"`.
3. The caller supplied `repoRoot`.
4. The item names exactly one file
   path (`files.length === 1`).
5. The path is repo-relative — no
   leading `/`, no escapes when
   resolved against `repoRoot`.
6. The current file at
   `<repoRoot>/<path>` exists and is
   readable.
7. The current file content equals
   `beforeText` byte-for-byte.
8. `afterText` differs from
   `beforeText`.

If any precondition fails, the
classifier returns `undefined` from
the helper and the item falls through
to the regex-based classifier
(producing one of the existing
operation kinds *without* patch
fields). We never emit
`exact_text_replacement` with
partial / unverifiable patch data.
We never invent a patch from
free-form `action` text.

The contract test exercises every
precondition: happy path, missing
file, path escapes repoRoot, no-op
patch, current-file mismatch.

## Preview Behavior

Reconciliation Preview v1's existing
forward-compatible diff branch
(shipped in commit `b127d08`)
recognizes any `source-write-deferred`
operation carrying `beforeText` /
`afterText` / `path` and:

1. Re-reads the current file content
   at preview time (a second,
   independent gate).
2. If the file still matches
   `beforeText`, emits a deterministic
   unified diff:
   ```
   --- a/<path>
   +++ b/<path>
   @@ -1,N +1,M @@
   -<beforeText lines>
   +<afterText lines>
   ```
3. Marks the operation
   `previewable: true`.

If the file has drifted between
plan-generation and preview time,
the preview helper marks the operation
`previewable: false` with the canonical
reason *"Current file content does not
match expected before text."*

This double-gate (plan-time + preview-
time) means an operator who edits the
target file after running
`reconcile suggest` but before running
`reconcile preview` sees an honest
"this preview is now stale" signal
rather than a fabricated diff against
old content.

## What Is Not Available

Even with a real unified diff in the
preview, **no apply path exists**.
The preview is read-only. Operators
who want the change must apply it
themselves outside Rekon. Pinned:

- *Source-write apply remains
  unavailable.*
- *`ReconciliationPreviewReport`
  remains unregistered.*
- *Previewable diff does not resolve
  findings.* The preview never
  writes a `FindingStatusLedger`
  entry; finding statuses are not
  touched.
- *Exact diff is generated only when
  deterministic.* The eight-step
  safety gate ensures the diff
  reflects byte-precise current state
  + verified target content. No
  approximations.

## Schema Changes (Additive)

Three places carry the new optional
patch fields:

| Location | Field shape |
| --- | --- |
| `CoherencyRemediationStep` (in `@rekon/kernel-findings`) | `beforeText?: string`, `afterText?: string`, `diffKind?: "exact-text-replacement"` |
| `RemediationItemLike` (in `@rekon/capability-reconcile`) | same three fields, optional |
| `ReconciliationPlanOperation` (in `@rekon/capability-reconcile`) | same three fields, optional |

The `CoherencyDelta` validator was
tightened to typecheck the new fields
when present (must be strings;
`diffKind` must be the single
recognized literal). Existing
artifacts without these fields
continue to validate cleanly. **No
schema-version bump** — the change is
purely additive.

## CLI Surface

No new CLI command. The existing
`rekon reconcile suggest` command
now passes `repoRoot` through to the
actuator so the classifier's safety
checks can run against the real
working tree. The existing
`rekon reconcile preview` command
renders the new operation's diff
when present.

```bash
# upstream signal carries patch fields
node packages/cli/dist/index.js reconcile suggest --root <repo> --json

# preview renders the unified diff
PLAN_REF="$(node packages/cli/dist/index.js artifacts latest --root <repo> --type ReconciliationPlan --id-only)"
node packages/cli/dist/index.js reconcile preview --root <repo> --plan "$PLAN_REF" --json
```

## What This Does Not Do

- **Does not** ship a
  `rekon reconcile apply` CLI.
- **Does not** register
  `source:write` permission.
- **Does not** register
  `ReconciliationApplyReport`.
- **Does not** register
  `ReconciliationPreviewReport`.
- **Does not** make
  `buildReconciliationPreview`
  write artifacts.
- **Does not** auto-resolve findings.
- **Does not** auto-apply
  reconciliation.
- **Does not** run verification
  automatically.
- **Does not** publish to npm, bump
  versions, create a git tag, or
  create a GitHub Release.
- **Does not** install workflow
  YAML.
- **Does not** create a branch.

## Follow-Up Work

**Recommended next slice:**
*Exact-diff operation safety review.*
The discovery memo named this as the
follow-up if Option B's class pick
landed. Inputs to that review:

- the eight-precondition safety gate
  is the right shape for additional
  operation classes (or needs
  refinement),
- the double-gate (plan-time +
  preview-time) catches drift safely
  in real flows,
- whether additional operation
  classes should adopt this pattern,
- whether
  `ReconciliationPreviewReport`
  registration becomes useful now
  that gating condition #1 has
  fired (the
  [ReconciliationPreviewReport
  Artifact
  Decision](reconciliation-preview-report-artifact-decision.md)
  required at least two of four
  signals; only #1 has fired so
  registration is not yet
  triggered),
- whether the source-write apply
  permission + rollback design
  memo (the
  [Source-Write Reconciliation
  Policy
  Decision](source-write-reconciliation-policy-decision.md)
  step 6) is the right next
  source-write slice or whether
  more exact-diff operation classes
  ship first.

## Cross-References

- [Plan-Generator Diff Data Discovery](plan-generator-diff-data-discovery.md)
- [Reconciliation Preview v1 strategy memo](reconciliation-preview-v1.md)
- [Reconciliation preview concept doc](../concepts/reconciliation-preview.md)
- [ReconciliationPreviewReport Artifact Decision](reconciliation-preview-report-artifact-decision.md)
- [Source-Write Reconciliation Policy Decision](source-write-reconciliation-policy-decision.md)
- [Reconciliation plans concept](../concepts/reconciliation-plans.md)
- [ReconciliationPlan artifact reference](../artifacts/reconciliation-plan.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-25 against Rekon
commit `9ad6ddc`. No version bump. No
npm publish. No git tag. No GitHub
Release. No new artifact type
registered. No new permission. No
new role. Schema changes are additive
and optional. Source-write apply
remains unavailable. Rollback is
trivial: revert the helper changes,
the CLI input extension, the schema
additions, the docs, and the
supporting doc cross-links.
