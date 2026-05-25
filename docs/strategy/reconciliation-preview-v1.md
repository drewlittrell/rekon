# Reconciliation Preview v1

**Status:** shipped.
**Slice:** `reconciliation-preview-v1`.
**Audience:** Rekon maintainers + capability
authors evaluating the path toward an
eventual source-write apply.

## Decision Summary

**Rekon ships a read-only reconciliation
preview surface that classifies a
`ReconciliationPlan` into operator-facing
rows.** v1 introduces:

- a pure helper `buildReconciliationPreview`
  in `@rekon/capability-reconcile`,
- a CLI command
  `rekon reconcile preview --plan <id> [--json]`,
- five preview kinds (`artifact-only`,
  `source-patch`, `generated-file`,
  `manual`, `not-previewable`),
- four risk bands (`low`, `medium`,
  `high`, `unknown`),
- a forward-compatible unified-diff path
  triggered only when an operation carries
  `beforeText` + `afterText` AND the
  current file under `repoRoot` matches the
  expected before text.

**Source-write apply remains unavailable.**
This memo does NOT change the
[Source-Write Reconciliation Policy
Decision](source-write-reconciliation-policy-decision.md):
Exact diff preview is mandatory before any
apply implementation. `source:write` is
still not a registered permission, no
`ReconciliationApplyReport` artifact ships,
and no `rekon reconcile apply` command
exists.

## Why This Slice Exists

The biggest remaining product gap was that
Rekon could **identify**, **govern**,
**resolve**, and **verify**, but the
remediation loop stopped at a
`ReconciliationPlan`. Users could see
*that* Rekon had a plan, but had no
operator-facing surface for *what* the
plan thought could be changed.

A preview layer is the smallest possible
next step toward "help me fix this"
without crossing into source mutation. It
lets operators:

- inspect risk before any apply path
  exists,
- distinguish artifact-only operations
  (safe to describe, easy future apply)
  from source-patch operations (need
  exact patch data + current-file match
  before any apply),
- treat operations as explicitly
  `not-previewable` when the plan does
  not carry enough patch data — instead
  of guessing.

## Why v1 Writes No Artifacts

The work order explicitly asked: should
the preview write a
`ReconciliationPreviewReport` artifact?

**Decision: no.** Rationale:

1. The preview shape is new. Hardening a
   schema before any operator has reviewed
   real previews would lock the model
   prematurely.
2. The first product surface stays
   lightweight + read-only — there is
   nothing to invalidate, no freshness
   semantics, no lineage to maintain.
3. If previews prove durable + useful,
   the next slice — *ReconciliationPreviewReport
   artifact decision* — adds the artifact
   with the lessons from v1 baked in.

## Conservative Classification Rules

The helper applies these rules in order
against each `ReconciliationPlanOperation`:

1. **`class === "artifact-only"`** → kind
   `artifact-only`, risk `low`,
   `previewable: true`, no diff. Safe to
   describe; no source mutation; a future
   apply path would write artifacts only.
2. **`class === "source-write-deferred"`,
   `operation === "generated_scaffold_write"`**
   → kind `generated-file`, risk `high`,
   `previewable: false`, reason cites no
   exact patch data.
3. **`class === "source-write-deferred"`,
   any other operation** → kind
   `source-patch`, risk `high`. Then:
   - if the operation carries
     forward-compat `beforeText` +
     `afterText` AND `repoRoot` is set AND
     the named file's content matches
     `beforeText` → emit a unified diff,
     mark `previewable: true`.
   - if forward-compat fields exist but
     current file does NOT match
     `beforeText` → `previewable: false`,
     reason *"Current file content does
     not match expected before text."*
   - if forward-compat fields are absent →
     `previewable: false`, reason
     *"ReconciliationPlan does not include
     exact patch data. Source-write apply
     is not available."*
4. **`class === "command-deferred"`
   (`verification_command_run`)** → kind
   `manual`, risk `medium`,
   `previewable: false`.
5. **`class === "manual-review"`
   (`manual_review`)** → kind `manual`,
   risk `unknown`, `previewable: false`.
6. **anything else** → kind
   `not-previewable`, risk `unknown`,
   `previewable: false`.

The helper does not invent patches. Ever.

## Status Pinning

The preview's top-level `status` is:

- `previewable` when every operation is
  previewable (only happens when every
  operation is `artifact-only`, since v1
  plans don't carry diff data),
- `partial` when at least one operation is
  previewable and at least one is not,
- `not-previewable` when no operation is
  previewable (or the plan has zero
  operations).

## Diff Format

When the preview emits a diff, it is a
deterministic unified diff with one hunk
that strips the entire `beforeText` and
replaces it with the entire `afterText`.
This is verbose but always faithful:

- never elides changed lines,
- never invents context,
- never depends on a diff library or
  external tool.

A future slice may switch to a minimal
hunk renderer once the apply path has
landed; v1 prefers correctness over
brevity.

## Read-Only Guarantees

| Surface | Read-only guarantee |
| --- | --- |
| `ReconciliationPlan` | the helper accepts the plan body; never mutates it |
| Source files | the helper only reads files when an operation carries forward-compat diff fields + a `path`; never writes |
| Artifact store | the helper writes nothing; the CLI writes nothing in `reconcile preview` |
| Artifact index | unchanged before / after a preview run (asserted by contract test #12) |
| Findings | not resolved, not updated, not touched |

## What This Memo Does Not Do

- Does **not** authorise any source-write
  apply path. The
  [Source-Write Reconciliation Policy
  Decision](source-write-reconciliation-policy-decision.md)
  remains the canonical source-write
  contract.
- Does **not** register a `source:write`
  permission.
- Does **not** ship a
  `ReconciliationApplyReport` artifact.
- Does **not** ship a
  `ReconciliationPreviewReport` artifact
  in v1 — that decision is the
  recommended next slice.
- Does **not** change `ReconciliationPlan`
  behaviour. The shape is unchanged; the
  preview is a pure projection of it.
- Does **not** auto-resolve findings.
- Does **not** auto-apply reconciliation.
- Does **not** run verification
  automatically.

## Cross-References

- [Reconciliation preview concept doc](../concepts/reconciliation-preview.md)
- [Source-write reconciliation policy decision](source-write-reconciliation-policy-decision.md)
- [Reconciliation plans concept](../concepts/reconciliation-plans.md)
- [ReconciliationPlan artifact reference](../artifacts/reconciliation-plan.md)
- [Proof report publication](../concepts/proof-report-publication.md)
- [Roadmap](roadmap.md)
- [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Recorded on 2026-05-25 against Rekon commit
`e63b26a`. No version bump. No npm publish.
No git tag. No GitHub Release. No
source-write apply. Rollback is trivial:
revert the helper, the CLI command, the
docs, the contract test, and the supporting
doc cross-links.

## Follow-Up

**Recommended next slice:**
*ReconciliationPreviewReport artifact
decision* — decide whether previews should
become durable artifacts before any
source-write apply path exists. Inputs to
the decision will include real-operator
preview output from cohort onboarding +
any evidence that the preview shape needs
to grow (e.g., per-operation lineage,
preview freshness semantics, signed
preview snapshots).

**Update:** the decision has been
recorded — see
[ReconciliationPreviewReport Artifact
Decision](reconciliation-preview-report-artifact-decision.md).
**Outcome: Option A — reserve the name,
defer registration.** No artifact type,
validator, writer, or category was added;
the v1 preview helper + CLI continue to
write no artifacts. Future registration is
gated on at least two of: (1) a plan
generator emitting forward-compat
`beforeText` + `afterText`, (2) a
source-write apply slice being queued or
shipped, (3) a publication or GitHub
review surface that needs preview content
inline, (4) operator cohort feedback
explicitly asking for durable previews.
Until at least two fire, the reconciliation
track sits at the v1 preview surface.

**Discovery update (next slice scoped):**
the
[Plan-Generator Diff Data Discovery](plan-generator-diff-data-discovery.md)
memo confirmed that **no current plan
generator emits exact patch data** — every
operation today carries only structural
metadata sourced from
`CoherencyRemediationStep`. The
recommended next reconciliation slice is
**narrow `ReconciliationPlan` exact-diff
operation v1**: pick one deterministic
operation class, teach the generator to
read the current file + compute the
canonical post-apply content, attach
`beforeText` + `afterText` as additive
optional fields to
`ReconciliationPlanOperation`. Source-write
apply remains unavailable through that
slice as well. Once that lands, the v1
preview helper's forward-compatible diff
branch will render real unified diffs
end-to-end.
