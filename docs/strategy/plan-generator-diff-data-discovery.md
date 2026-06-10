# Plan-Generator Diff Data Discovery

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status:** discovery recorded.
**Slice:** `plan-generator-diff-data-discovery`.
**Audience:** Rekon maintainers + reviewers
evaluating whether any current plan
generator can safely emit exact
`beforeText` / `afterText` for
Reconciliation Preview v1.

## Decision Summary

**Finding: no current plan generator emits
exact patch data.** Every `ReconciliationPlanOperation`
shipped today carries only structural
metadata (operation kind, class, status,
reason, finding id, priority, file paths,
systems, suggested-action text, optional
permission requirement). No operation
includes `beforeText`, `afterText`,
`replacementText`, a unified-diff body, or
any byte-precise reconstruction of either
the current file content or the proposed
post-apply content.

**Source-write apply remains unavailable.**
**ReconciliationPreviewReport remains
unregistered** (per the
[ReconciliationPreviewReport Artifact
Decision](reconciliation-preview-report-artifact-decision.md)).
The Reconciliation Preview v1 helper +
CLI continue to ship the
forward-compatible diff branch *and* never
exercise it through normal flow because
no real operation supplies the required
fields.

**Recommendation: do NOT register
`ReconciliationPreviewReport` yet.** The
next implementation slice that materially
improves Reconciliation Preview v1 is a
**narrow plan-generator enhancement**:
pick a single deterministic operation
class, teach its plan generator to emit
exact `beforeText` + `afterText`, keep
the operation `previewable: false` →
`previewable: true` transition gated on
the current-file-match check that already
ships in the v1 helper, and **do not**
introduce a `rekon reconcile apply`
path. That work proves the v1 helper's
diff branch can render real unified diffs
end-to-end without crossing the
source-write boundary.

## Why This Discovery Exists

The
[ReconciliationPreviewReport Artifact
Decision](reconciliation-preview-report-artifact-decision.md)
pinned Option A (reserve the artifact
name, defer registration) and gated
future registration on **at least two of
four conditions**. The first of those
conditions — *"a plan generator emits
forward-compat `beforeText` +
`afterText` for at least one real
operation class"* — is the cheapest to
investigate and the cheapest to satisfy
without touching the source-write
boundary.

This discovery answers the prerequisite
question: do any current generators
already emit such data? If yes, the
next slice could be the registration
itself. If no, the next slice is a
narrow generator enhancement that
satisfies condition #1 in isolation.

## Current Plan Generation Paths

Two paths ship today, both in
`packages/capability-reconcile/src/index.ts`,
both reachable via the
`@rekon/capability-reconcile.actuator`
actuator and the CLI:

| Mode | Trigger | CLI surface |
| --- | --- | --- |
| `runLegacyMode` | `input.operations` is supplied (or no work-order / coherency-delta ref present) | `rekon reconcile [--operation <name>] [--apply] [--root <path>] [--json]` |
| `runSuggestionMode` | `input.mode === "suggestions"` OR a `WorkOrder` / `CoherencyDelta` ref is detected | `rekon reconcile suggest [--finding <id>] [--priority p0|p1|p2] [--limit <n>] [--apply] [--root <path>] [--json]` |

Both modes write a `ReconciliationPlan`
artifact, then a `ReconciliationLog`,
then an `ActionLog`. Neither performs any
source-file read or write. Neither
consults the actual content of any file
named in `files: string[]`.

`resolve.issue` (in
`packages/capability-resolver/src/index.ts`)
produces `ResolverPacket` artifacts, not
`ReconciliationPlan`. It cites plans + the
upstream `IssueAdjudicationReport` /
`CoherencyDelta` / `FindingStatusLedger`
but does not generate operations
directly. It is **not** a plan
generation path for this discovery's
purposes.

## Current Operation Shapes

Upstream input to plan generation is a
`CoherencyRemediationStep[]` array
(sourced from
`CoherencyDelta.remediationQueue` and / or
`WorkOrder.remediationItems`). Each step
carries:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | step id |
| `priority` | `p0` / `p1` / `p2` | for filtering |
| `findingId` | `string` | finding under remediation |
| `title` | `string` | free-form text |
| `action` | `string` | free-form text |
| `files` | `string[]` | one or more relative paths |
| `systems` | `string[]` | owner systems |
| `severity` | `critical` / `high` / `medium` / `low` | inherited from finding |

**No patch field exists.** `title` and
`action` are operator-facing free text;
neither field carries byte-precise
content.

`classifyRemediationItem` then runs a
regex match against
`(title + " " + action).toLowerCase()`
and maps each step to one of seven
operation kinds, each with a fixed
class assignment:

| Operation kind | Class | Trigger regex (roughly) |
| --- | --- | --- |
| `docs_regeneration` | `artifact-only` | `\bdocs?\b` / `documentation` / `readme` / `agents` |
| `finding_baseline_write` | `artifact-only` | `baseline` / `accept` / `ignore` / `false positive` / `status ledger` |
| `label_override_write` | `artifact-only` | (reserved; not emitted by the classifier) |
| `safe_import_rewrite` | `source-write-deferred` | `import` / `generated/` / `/dist\b` / `boundary` |
| `generated_scaffold_write` | `source-write-deferred` | `scaffold` / `generate(d) file` / `create file` |
| `verification_command_run` | `command-deferred` | `\btest(s|ing)?\b` / `verify` / `\bcommand\b` / `\brun\b` |
| `manual_review` | `manual-review` | fallthrough |

The emitted `ReconciliationPlanOperation`
shape carries:

| Field | Notes |
| --- | --- |
| `operation` | one of the seven kinds above |
| `class` | one of `artifact-only` / `deterministic-deferred` / `source-write-deferred` / `command-deferred` / `manual-review` (the `deterministic-deferred` class is reserved; classifier does not emit it today) |
| `status` | `planned` / `applied` / `deferred` / `denied` |
| `reason` | short human-readable string |
| `source` | `manual` / `work-order` / `coherency-delta` |
| `findingId` | mirrored from the remediation step |
| `priority` | mirrored |
| `files` | mirrored (paths only) |
| `systems` | mirrored |
| `suggestedAction` | the `action` text |
| `requiresPermission` | optional; e.g., `["write:source"]` on source-write-deferred / `["execute:commands"]` on command-deferred |

**No `beforeText`, no `afterText`, no
`replacementText`, no `diff`, no
`expectedBeforeDigest`, no source-ref
to a canonical content body.**

## Diff-Ready Operation Classes

**None today.** The check is mechanical:
for each operation class, can a generator
emit byte-precise before/after content
without inferring it from free-form
prose?

| Class | Diff-ready today? | Why |
| --- | --- | --- |
| `artifact-only` (`docs_regeneration`, `finding_baseline_write`, `label_override_write`) | no | Output is an artifact body under `.rekon/artifacts/**`, not a source-file mutation. The v1 preview helper's diff branch is rooted at `<repoRoot>/<path>`, which is a source-tree path; artifact-only operations have no source-tree path to diff against. |
| `source-write-deferred` (`safe_import_rewrite`, `generated_scaffold_write`) | no | The classifier never reads `<repoRoot>/<files[0]>`. No canonical "what the after content should be" computation exists today. |
| `command-deferred` (`verification_command_run`) | no | Not a source mutation at all. |
| `manual-review` (`manual_review`) | no | Catch-all; the operation explicitly defers the decision to a human. |
| reserved (`deterministic-deferred`) | no | Class exists in the type union but no operation currently emits it. |

Even the operation kinds that *sound*
deterministic (`safe_import_rewrite`,
`generated_scaffold_write`,
`docs_regeneration`) carry no exact patch
data because the upstream signal is a
free-form `CoherencyRemediationStep`, not
a structured patch.

## Gaps

The gap between "Reconciliation Preview
v1's diff branch exists" and "any real
plan emits diff data" is:

1. **No generator currently inspects
   source-file content.** The classifier
   reads `title` / `action` text but
   never reads the file at
   `<repoRoot>/<files[0]>`. The first
   change required is some path that
   reads the current file content for at
   least one operation kind.
2. **No generator currently computes a
   canonical post-apply content.** Even
   if a generator read the current file,
   there is no "Rekon's canonical
   regeneration of this file" computation
   today. The closest existing capability
   is the publication writer
   (`@rekon/capability-docs`), which
   emits *artifact* bodies — not source
   files.
3. **No operation field exists for
   `beforeText` / `afterText`.** The
   v1 preview helper's diff branch
   accesses these via a
   forward-compatible *cast* through a
   private extension type; the
   `ReconciliationPlanOperation` type
   itself does not yet declare them.
   The first additive schema change would
   add these fields (probably as optional)
   to the operation type + validator.
4. **No `currentExpectedDigest` field.**
   The v1 helper's mismatch path checks
   `currentFileText === beforeText`. A
   canonical *digest* of the expected
   before content would be cheaper to
   carry and faster to compare, but the
   v1 helper does not yet need it
   because no generator yet emits any
   patch fields.

Closing **all four** gaps is the work of
*a future apply slice*. Closing **just
the first three** for a single
operation class is the work of the
recommended next slice.

## Options Considered

### Option A — Add `ReconciliationPreviewReport` registration first

Register the artifact (kernel +
validator + writer + category) first.

**Pros:** simple to scope.

**Cons:** still no real preview content
to persist. The artifact would carry
the same "all operations are
not-previewable" payload v1 already
emits in-memory. Schema lock-in cost
without any new product signal.

**Verdict: rejected.** Matches the
ReconciliationPreviewReport artifact
decision's gating: registration is
deferred until at least two of four
conditions fire, and none have.

### Option B — Add `beforeText` / `afterText` to `ReconciliationPlanOperation` for one deterministic operation class first (**recommended**)

Pick the simplest deterministic
operation class that operates on a
single tracked source file with a
canonical post-apply content, teach
its generator to:

- read the current file at
  `<repoRoot>/<files[0]>`;
- compute the canonical post-apply
  content;
- emit `beforeText` = current content,
  `afterText` = canonical post-apply
  content,
- carry through Reconciliation Preview
  v1's diff branch.

**Pros:** lights up the v1 helper's
diff branch against a real generator.
Surfaces concrete operator-feedback
data on whether durable previews are
useful (one of the
ReconciliationPreviewReport gating
conditions). Source-write apply
remains unavailable. The
forward-compatible diff path already
ships; no v1 helper change required.

**Cons:** one additive schema change
to `ReconciliationPlanOperation`
(making `beforeText` / `afterText`
optional). One generator-side file
read for at least one operation kind.

**Verdict: recommended.** This is the
smallest step that makes Reconciliation
Preview v1 materially more useful.
The candidate operation class for v1
is most likely a narrow subset of
`docs_regeneration` or
`generated_scaffold_write` where Rekon
already has a canonical content
generator (e.g., a regenerated
`AGENTS.md` block from architecture
summary, or a generated-file scaffold
where Rekon owns the canonical
template). The actual choice of class
+ canonical generator is the next
slice's job; this discovery only pins
that Option B is the right shape.

### Option C — Stop adding reconciliation structure until source-write apply is queued

Park reconciliation work entirely
until the apply path memo is queued.

**Pros:** minimum scope.

**Cons:** no movement toward Option B
either. The v1 diff branch stays
permanently dormant. The
ReconciliationPreviewReport gating
condition stays unsatisfied forever
through inaction.

**Verdict: rejected for a discovery
slice.** This memo concludes
discovery; the recommended next slice
is the smallest useful step (Option
B), not "do nothing."

## Recommendation

**Adopt Option B.** Schedule the next
slice as **narrow ReconciliationPlan
exact-diff operation v1**. Required
scope for that slice (defined here
as a forward-compat contract, not
implemented in this slice):

1. Pick **one** deterministic
   operation class (decided in that
   slice).
2. Teach the corresponding generator
   path in
   `packages/capability-reconcile/src/index.ts`
   (or a sibling helper) to:
   - read the current file content at
     `<repoRoot>/<files[0]>`,
   - compute the canonical post-apply
     content,
   - attach `beforeText` + `afterText`
     to the emitted
     `ReconciliationPlanOperation`.
3. Add `beforeText: string |
   undefined` and `afterText: string |
   undefined` (optional) to
   `ReconciliationPlanOperation` +
   its validator. Keep them
   *additive* — existing operations
   without these fields continue to
   validate cleanly.
4. Keep source-write apply
   **unavailable**. No
   `rekon reconcile apply`. No
   `source:write` permission
   registration. No
   `ReconciliationApplyReport`
   registration.
5. Verify end-to-end with a CLI
   smoke + contract test: a plan
   carrying the new operation kind
   should yield a Reconciliation
   Preview v1 entry with
   `previewable: true` + a unified
   diff in the JSON output.

If, during that slice, no deterministic
operation class can be picked safely
(no canonical content generator exists,
or every candidate would force a
source-write apply path to land in the
same slice), the fallback is to write
a `ReconciliationPlan operation-shape
strengthening decision` memo instead —
documenting which schema extensions
would unlock diff readiness and which
generator capabilities would have to
ship first.

## What This Does Not Do

This batch:

- **Does not** register
  `ReconciliationPreviewReport` as an
  artifact type. The
  [ReconciliationPreviewReport
  Artifact
  Decision](reconciliation-preview-report-artifact-decision.md)
  remains in force.
- **Does not** add `beforeText` /
  `afterText` to
  `ReconciliationPlanOperation`. That
  change belongs to the
  recommended-next-slice.
- **Does not** change
  `buildReconciliationPreview`. The
  helper continues to expose its
  forward-compatible diff branch
  unchanged.
- **Does not** change
  `rekon reconcile preview`. The CLI
  still writes no artifacts.
- **Does not** change
  `ReconciliationPlan` shape,
  validators, or writer.
- **Does not** authorise any
  source-write apply path.
  Source-write apply remains
  unavailable.
- **Does not** register a
  `source:write` permission.
- **Does not** introduce a
  `ReconciliationApplyReport`. That
  artifact remains reserved and
  unshipped.
- **Does not** publish to npm, bump
  versions, create a git tag, or
  create a GitHub Release.
- **Does not** install any workflow
  YAML under `.github/workflows/`.
- **Does not** create a branch.
- **Does not** mutate any source
  file in `packages/*/src/*`. No
  runtime behaviour change ships.

The shipped artefacts of this slice
are: this memo, a docs test, a review
packet, and supporting-doc
cross-references.

## Follow-Up Work

**Recommended next slice:**
*Narrow ReconciliationPlan exact-diff
operation v1.* Scope pinned in the
*Recommendation* section above.

**Update:** that slice has shipped — see
[Reconciliation Exact-Diff Operation v1](reconciliation-exact-diff-operation-v1.md).
The `exact_text_replacement` operation kind
landed with an eight-precondition safety
gate; Reconciliation Preview v1 now renders
a real unified diff against a real
generator. Gating condition #1 of the
[ReconciliationPreviewReport Artifact
Decision](reconciliation-preview-report-artifact-decision.md)
("a plan generator emits forward-compat
`beforeText` + `afterText` for at least one
real operation class") is now **satisfied**;
the decision's reservation still stands
because *at least two* signals must fire
before registration is worth doing.
Source-write apply remains unavailable.

**Fallback next slice (if Option B's
operation-class pick is blocked):**
*ReconciliationPlan operation-shape
strengthening decision.* Documents
which schema extensions and which
generator capabilities would have
to ship before Option B can land.

**Slice after Option B lands:**
Re-evaluate the
[ReconciliationPreviewReport
Artifact Decision](reconciliation-preview-report-artifact-decision.md)
gating. Condition #1
(*"a plan generator emits
forward-compat `beforeText` +
`afterText` for at least one real
operation class"*) will be
satisfied. If a second condition
also fires by then (apply slice
queued, publication-consumer
emerges, or operator cohort asks
for durable previews),
registration becomes a sensible
slice. If only condition #1
fires, the reservation can stay.

## Cross-References

- [Reconciliation preview v1 strategy memo](reconciliation-preview-v1.md)
- [Reconciliation preview concept doc](../concepts/reconciliation-preview.md)
- [ReconciliationPreviewReport Artifact Decision](reconciliation-preview-report-artifact-decision.md)
- [Source-Write Reconciliation Policy Decision](source-write-reconciliation-policy-decision.md)
- [Reconciliation plans concept](../concepts/reconciliation-plans.md)
- [ReconciliationPlan artifact reference](../artifacts/reconciliation-plan.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-25 against Rekon
commit `698b300`. No version bump. No
npm publish. No git tag. No GitHub
Release. No runtime behaviour change.
No artifact type registered. No new
validator. No new writer. No new
permission. No new role. No
ReconciliationPlan schema change in
this slice. Rollback is trivial:
revert this memo + the supporting
doc cross-links.
