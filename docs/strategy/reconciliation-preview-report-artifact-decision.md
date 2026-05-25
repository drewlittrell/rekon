# ReconciliationPreviewReport Artifact Decision

**Status:** decision recorded.
**Slice:** `reconciliation-preview-report-artifact-decision`.
**Sequence position:** First decision slice
following the
[Reconciliation Preview v1](reconciliation-preview-v1.md)
shipment.
**Audience:** Rekon maintainers + capability
authors considering whether previews should
become durable artifacts.

## Decision Summary

**Recommendation: Option A — reserve the
`ReconciliationPreviewReport` artifact name;
defer registration.** No artifact validator,
writer, or category is added in this slice;
the `rekon reconcile preview` CLI continues
to write no artifacts; the
`buildReconciliationPreview` helper remains a
read-only, in-memory projection of a
`ReconciliationPlan`.

**ReconciliationPreviewReport is not
registered as a Rekon artifact in this
slice.** The artifact name
`ReconciliationPreviewReport` is reserved.
No `ReconciliationPreviewReport` validator,
writer, or category is added. Reconciliation
Preview v1 remains a read-only, in-memory
projection of `ReconciliationPlan`.
**Source-write apply remains unavailable.**

This memo is the canonical contract that the
**next** reconciliation slice must respect.
Any future slice that wants to persist a
preview must justify the registration against
the conditions enumerated in *Conditions For
Future Registration* below.

## Why This Decision Exists

The
[Reconciliation Preview v1 strategy memo](reconciliation-preview-v1.md)
intentionally deferred this decision so v1
could ship as a lightweight, read-only
surface. v1's recommended next slice is
exactly this memo:

> **Recommended next slice:**
> *ReconciliationPreviewReport artifact
> decision* — decide whether previews
> should become durable artifacts before
> any source-write apply path exists.

The decision is overdue **only** if Rekon
has accrued enough evidence that durable
previews would carry meaningful lineage
value, that the preview shape is stable
enough to schema-lock, and that some
downstream consumer would benefit from the
persistence. Without that evidence,
schema-locking the preview now would freeze
v1's lessons before any have been recorded.

## Current State

| Surface | Status |
| --- | --- |
| `buildReconciliationPreview` helper | shipped (read-only, in-memory) |
| `rekon reconcile preview --plan <id> [--json]` CLI | shipped (writes no artifacts) |
| `ReconciliationPlan` artifact | unchanged shape |
| `ReconciliationApplyReport` artifact | reserved (per [Source-Write Reconciliation Policy Decision](source-write-reconciliation-policy-decision.md)); not registered |
| `source:write` permission | reserved; not registered |
| `rekon reconcile apply` CLI | not implemented |
| Source-write apply path | not implemented |
| Operator cohort onboarding | skipped (per current roadmap state) |
| Forward-compatible diff path (`beforeText` / `afterText` on plan operations) | exercised only by the contract test fixture — no real plan generator emits these fields today |
| `ReconciliationPreviewReport` artifact | **this decision** |

The current product loop is:

1. `rekon refresh` → `ReconciliationPlan` (when warranted).
2. `rekon reconcile preview --plan <id>` →
   in-memory preview JSON; no artifact
   written.
3. Operator reviews the preview.
4. (If safe) operator applies the change
   manually outside Rekon.

There is no automatic loop step that would
*consume* a durable
`ReconciliationPreviewReport`. There is no
publication that surfaces previews. There is
no `apply` step that would need to cite a
specific preview snapshot to justify a
mutation.

## Options Considered

### Option A — Reserve the name; defer registration (**recommended**)

Add a decision memo (this file) recording
that `ReconciliationPreviewReport` is the
canonical name for any future durable
preview artifact, but **do not** register
the type, write validators, or change
runtime behaviour.

**Pros:**
- Keeps v1 lessons unfrozen.
- Preserves the existing read-only loop.
- Reserves the name so future slices land
  cleanly.
- Zero risk surface.
- Tiny scope: one memo + review packet +
  docs test + supporting doc updates.

**Cons:**
- No durable preview today, so the
  preview must be rebuilt on every
  `rekon reconcile preview` invocation.
- The diff path (forward-compatible
  `beforeText` / `afterText`) has no
  persistent record yet, so future
  diffability analysis must replay against
  the plan rather than reading a stored
  snapshot.

**Verdict: recommended.** The cons describe
work that nothing else currently needs.
Rebuilding a preview is cheap; the preview
helper is a pure function of `ReconciliationPlan`
+ optional file content.

### Option B — Register `ReconciliationPreviewReport` as a durable artifact

Ship the artifact: define the schema,
register the type with the kernel + SDK +
runtime, add validators, add a writer
helper, surface it from
`rekon reconcile preview --json` (or behind
an opt-in flag), thread it into the
existing artifact-validation / freshness
loop.

**Pros:**
- Durable snapshots; reviewers could read
  the preview at the time it was rendered.
- Lineage: a future
  `ReconciliationApplyReport` could cite
  the exact preview that justified the
  apply.
- Publications + GitHub review surfaces
  could carry preview content directly.

**Cons:**
- Schema lock-in: v1 has shipped *one*
  preview shape and no operator has
  reviewed *any* real preview yet. The
  fields likely need to grow (per-operation
  lineage, signed `currentExpectedDigest`
  per file, freshness semantics,
  multi-hunk diff support, etc.).
- Freshness story is undefined: should the
  artifact go stale when the plan
  changes? When the source content
  changes? Both? Adding an artifact
  without an answer would create a third
  freshness surface for operators to
  reason about (on top of the existing
  `paths freshness` / `artifacts freshness`
  / `artifacts validate` triplet that the
  beta onboarding refinements just
  spelled out).
- No downstream consumer today. Without
  source-write apply, no other artifact
  cites previews; the persisted snapshots
  would be inert.
- Surface area expansion right before any
  operator cohort has used the v1 surface.

**Verdict: rejected for this slice.** The
cons describe real product cost that buys
nothing concrete today. Reconsider when at
least one downstream consumer needs durable
previews.

### Option C — Optional persistence via an explicit `--write-artifact` flag

Add the artifact type but only write it
when an explicit CLI flag is passed.

**Pros:**
- No schema lock-in on default flow.
- Operators who want a durable record can
  opt in.

**Cons:**
- Still requires the full schema +
  validator + writer + category +
  conformance work.
- Still triggers a freshness-semantics
  decision.
- Two-mode CLI is a UX cost (operators
  must learn when to pass the flag).
- The opt-in path adds new "is the
  preview persisted or not?" branching
  to every downstream consumer.
- The default-off mode adds an
  always-warm code path that almost
  no one will use until apply ships.

**Verdict: rejected.** Strictly more
expensive than Option B with most of the
same risks. Reconsider only if Option B's
freshness model is solved AND operators
ask for opt-in persistence specifically.

## Recommendation

**Adopt Option A.** Ship this decision memo
+ the docs test that pins it. Reconciliation
Preview v1 remains the canonical preview
surface. Source-write apply remains
unavailable.

## Conditions For Future Registration

`ReconciliationPreviewReport` becomes worth
registering when **at least two** of the
following are true:

1. **A plan generator emits forward-compat
   `beforeText` + `afterText` for at least
   one real operation class.** v1 plan
   operations carry no diff fields; the
   contract test is the only place the
   diff path lights up. Once a real
   generator (e.g., a deterministic
   docs-regeneration plan) starts attaching
   exact before/after text, durable
   previews start carrying lineage value.
2. **A source-write apply slice is queued
   or shipped.** An apply path needs to
   cite the *exact* preview that justified
   the mutation. At that point a durable
   snapshot becomes the natural lineage
   anchor.
3. **A publication or GitHub review
   surface needs the preview body.** If a
   future architecture summary / proof
   report / PR comment surfaces preview
   content, persisting that content as an
   artifact (with cited inputs +
   freshness) is the right shape for the
   publication input.
4. **Operator cohort feedback explicitly
   asks for durable previews.** Without
   real users asking, schema-locking is
   guesswork.

When at least two of these are true, a
separate **ReconciliationPreviewReport
registration slice** can land:

- new artifact type registration (kernel +
  SDK + runtime + conformance harness),
- new validator + writer in
  `@rekon/capability-reconcile`,
- additive CLI flag to `rekon reconcile
  preview` (e.g., `--write` or default-on
  behaviour, decided in that slice),
- new freshness semantics decision (does
  the report go stale when the plan
  changes, the source changes, or both?),
- artifact-category map update,
- updated docs + tests + review packet.

That slice MUST also explicitly re-affirm
the source-write boundary. Registration is
not an apply path.

## Reserved Vocabulary

This memo reserves the following names for
the future registration slice. Any
non-canonical use of these names is a
documentation error:

| Name | Reserved for |
| --- | --- |
| `ReconciliationPreviewReport` | the future durable preview artifact type |
| `@rekon/capability-reconcile` `writeReconciliationPreviewReport` (or equivalent) | the future writer helper |
| `rekon reconcile preview --write` (or default-on equivalent, decided in registration slice) | the future opt-in / default-on persistence flag |
| `ReconciliationPreviewReport` freshness checks | future entries in the artifacts-freshness validator |

The reservation does not commit Rekon to any
specific schema, freshness model, or
permission posture; it only commits Rekon to
not using these names for anything else
between now and the registration slice.

## What This Decision Does Not Do

This batch:

- **Does not** register
  `ReconciliationPreviewReport` as an
  artifact type. No validator, writer, or
  category lands.
- **Does not** change
  `buildReconciliationPreview`. The helper
  remains read-only, in-memory.
- **Does not** change
  `rekon reconcile preview`. The CLI still
  writes no artifacts.
- **Does not** change `ReconciliationPlan`
  shape, validators, or writer.
- **Does not** authorise any source-write
  apply path. The
  [Source-Write Reconciliation Policy
  Decision](source-write-reconciliation-policy-decision.md)
  remains the canonical source-write
  contract.
- **Does not** register a `source:write`
  permission.
- **Does not** introduce a
  `ReconciliationApplyReport`. That
  artifact remains reserved and unshipped.
- **Does not** run verification
  automatically.
- **Does not** add a new freshness
  surface. The existing
  `paths freshness` / `artifacts freshness` /
  `artifacts validate` triplet is unchanged.
- **Does not** publish to npm, bump
  versions, create a git tag, or create a
  GitHub Release.
- **Does not** install any workflow YAML
  under `.github/workflows/`.
- **Does not** create a branch.

The shipped artefacts of this slice are:
this memo, a docs test, a review packet,
and supporting-doc cross-references.

## Cross-References

- [Reconciliation Preview v1 strategy memo](reconciliation-preview-v1.md)
- [Reconciliation preview concept doc](../concepts/reconciliation-preview.md)
- [Source-Write Reconciliation Policy Decision](source-write-reconciliation-policy-decision.md)
- [Reconciliation plans concept](../concepts/reconciliation-plans.md)
- [ReconciliationPlan artifact reference](../artifacts/reconciliation-plan.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-25 against Rekon commit
`b127d08`. No version bump. No npm publish.
No git tag. No GitHub Release. No runtime
behaviour change. No new artifact type. No
new permission. No new role. No workflow
YAML. No source-write apply. Rollback is
trivial: revert this memo and the supporting
doc cross-links.

## Follow-Up

**Update:** the
[Plan-Generator Diff Data Discovery](plan-generator-diff-data-discovery.md)
memo recorded the first discovery answer:
**no current plan generator emits exact
`beforeText` / `afterText`.** The
recommended next reconciliation slice is
the **narrow ReconciliationPlan exact-diff
operation v1** described there — pick one
deterministic operation class, emit exact
patch text for it, keep source-write apply
unavailable.

**Further update:** that slice has shipped —
see
[Reconciliation Exact-Diff Operation v1](reconciliation-exact-diff-operation-v1.md).
The `exact_text_replacement` operation kind
landed with an eight-precondition safety
gate. **Gating condition #1 above is now
satisfied** ("a plan generator emits
forward-compat `beforeText` + `afterText`
for at least one real operation class").
The reservation still stands because *at
least two* signals must fire before
registration is worth doing — and only #1
has fired so far. The exact-diff operation
safety review slice will explicitly
re-evaluate whether registration is worth
doing now (or whether the bar should
remain at two-of-four).

The natural next slice still depends on
which of the *Conditions For Future
Registration* fires first:

- If a plan generator emits forward-compat
  `beforeText` + `afterText`, the next
  reconciliation slice is **plan-generator
  diff data** (emit exact patch text for at
  least one deterministic operation class).
- If a source-write apply slice gets
  queued, the next reconciliation slice is
  **apply permission + rollback design
  memo** (per the source-write policy
  decision's step 6).
- If a publication or review surface needs
  preview content, the next slice is the
  **publication that consumes preview
  content** (which would then justify the
  registration).
- If operator cohort feedback explicitly
  asks for durable previews, the next
  slice is the **ReconciliationPreviewReport
  registration slice** itself.

Until one of those signals lands, the
reconciliation track remains: preview-only,
read-only, no apply, no durable preview
artifact, no schema lock-in. The cost of
that posture is exactly *one re-build per
`rekon reconcile preview` invocation* — a
cost that is negligible compared with the
risk of locking the wrong schema.
