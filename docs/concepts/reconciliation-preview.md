# Reconciliation Preview

**Status:** v1 shipped.
**Audience:** operators, capability authors,
agents.
**Scope:** explains what a reconciliation
preview is, what it can show today, what it
cannot show, and how it relates to the
deferred source-write apply path.

A **reconciliation preview** is a read-only,
operator-facing projection of a
`ReconciliationPlan`. It classifies each
plan operation into one of five kinds
(`artifact-only`, `source-patch`,
`generated-file`, `manual`,
`not-previewable`), assigns a risk band
(`low` / `medium` / `high` / `unknown`), and
emits a unified diff only when the plan
carries exact before/after text that
matches the current file. Source-write
apply does not exist.

## What A Preview Shows

| Field | Meaning |
| --- | --- |
| `planRef` | the `ReconciliationPlan` the preview was built from |
| `status` | `previewable` (all ops previewable), `partial` (some), or `not-previewable` (none) |
| `operations[]` | one entry per plan operation with kind, risk, path, previewable flag, optional diff |
| `summary` | counts by kind, total previewable, total high-risk |
| `recommendation.applyAvailable` | always `false` in v1 |
| `recommendation.message` | always says source-write apply is not available |

## What A Preview Does Not Do

- **Source-write apply is not available.**
  The preview never writes source files,
  never writes artifacts, and never invokes
  an apply path.
- **The preview does not resolve findings.**
  Running `rekon reconcile preview` against
  a plan does not change any finding's
  status, does not write a
  `FindingStatusLedger` entry, and does not
  mutate the originating
  `FindingReport` / `IssueAdjudicationReport`
  / `CoherencyDelta`.
- **The preview does not invent patches.**
  When the plan does not carry exact
  `beforeText` / `afterText` for a
  source-write operation, the operation is
  classified `not-previewable` with the
  reason *"ReconciliationPlan does not
  include exact patch data."*
- **The preview does not run verification.**
  The recommendation block intentionally
  ships no `nextCommands` in v1; operators
  decide whether to follow up with
  `rekon verify run --dry-run` against the
  plan's verification context.
- **The preview does not change plan
  behaviour.** It is a *projection*. The
  same plan can be re-previewed any number
  of times and the result is deterministic
  modulo the current source content.

## Exact Diff Is Mandatory Before Apply

This is a hard contract carried from the
[Source-Write Reconciliation Policy
Decision](../strategy/source-write-reconciliation-policy-decision.md):

> Exact diff preview is mandatory before any
> apply implementation.

The v1 plan shape does not carry exact
patch data, so v1 generates **no diffs**
through the normal flow — every
non-artifact-only operation is
`not-previewable`. The preview helper
supports a forward-compatible diff path:
when a future plan generator attaches
`beforeText` + `afterText` to an
operation and the current file content
matches `beforeText`, the helper emits a
unified diff. If the current file does
**not** match `beforeText`, the operation
is classified `not-previewable` with the
reason *"Current file content does not
match expected before text."* The helper
never invents content.

## Non-Previewable Operations Are Explicit

Every non-previewable operation carries:

- `previewable: false`
- `reason: "<explicit text>"` — one of:
  - *"ReconciliationPlan does not include
    exact patch data. Source-write apply is
    not available."* (source-write-deferred
    without forward-compat diff fields)
  - *"Current file content does not match
    expected before text."* (forward-compat
    diff fields supplied, but current file
    diverges)
  - *"Command-deferred operation. Execute
    manually via `rekon verify run --dry-run`
    before relying on this remediation."*
    (command-deferred operations)
  - *"ReconciliationPlan classified this
    remediation as manual-review."*
    (manual-review operations)

If a future plan format adds new operation
kinds, the preview helper falls through to
`not-previewable` with the reason
*"ReconciliationPlan does not include exact
patch data. Operation is not previewable."*

## CLI Surface

```bash
rekon reconcile preview --plan <id|type:id> --root <path> [--json]
```

Behaviour:

- Reads the `ReconciliationPlan` named by
  `--plan`. The plan id may be an artifact
  id (`reconciliation-plan-…`) or a
  `type:id` pair (`ReconciliationPlan:…`).
- Builds the preview via
  `buildReconciliationPreview` from
  `@rekon/capability-reconcile`.
- Writes **no** artifacts.
- Does not mutate any source file under
  `--root`.
- `--json` emits the canonical preview
  structure.
- Without `--json`, prints a short human
  table + the *"Source-write apply is not
  available."* recommendation line.
- Without `--plan`, the command fails with
  *"rekon reconcile preview requires
  `--plan <ReconciliationPlan-id|type:id>`."*

## Operation Kind Mapping (v1)

The preview maps the existing
`ReconciliationPlanOperation.class` field
(see the
[ReconciliationPlan artifact reference](../artifacts/reconciliation-plan.md))
into preview kinds:

| Plan class | Preview kind | Default risk | Previewable in v1 |
| --- | --- | --- | --- |
| `artifact-only` | `artifact-only` | low | yes |
| `source-write-deferred` (`safe_import_rewrite`, …) | `source-patch` | high | no (unless forward-compat diff fields supplied + current file matches) |
| `source-write-deferred` (`generated_scaffold_write`) | `generated-file` | high | no |
| `command-deferred` (`verification_command_run`) | `manual` | medium | no |
| `manual-review` (`manual_review`) | `manual` | unknown | no |
| anything else | `not-previewable` | unknown | no |

## Successful Preview Does Not Resolve Findings

A clean preview run says **"here is what
Rekon thinks could change, here is which
operations are safe to describe today, and
here is the explicit list of operations
that need exact patch data before apply
could exist."** It does **not** say
"these findings are now resolved." The
preview never writes a
`FindingStatusLedger` entry, never updates
any finding status, and never causes any
`IssueAdjudicationReport` /
`CoherencyDelta` rewrite.

## See Also

- [Reconciliation Preview v1 strategy memo](../strategy/reconciliation-preview-v1.md)
- [ReconciliationPreviewReport Artifact Decision](../strategy/reconciliation-preview-report-artifact-decision.md)
  — records the decision to **reserve** the
  `ReconciliationPreviewReport` artifact name
  and **defer** registration. v1 previews
  remain a read-only, in-memory projection of
  `ReconciliationPlan`; no durable preview
  artifact ships in this slice.
- [Plan-Generator Diff Data Discovery](../strategy/plan-generator-diff-data-discovery.md)
  — records that **no current plan generator
  emits exact `beforeText` / `afterText`**.
  The recommended next reconciliation slice
  is the **narrow `ReconciliationPlan`
  exact-diff operation v1** described there,
  which would finally light up this concept
  doc's forward-compatible diff branch
  against a real generator.
- [Reconciliation Exact-Diff Operation v1](../strategy/reconciliation-exact-diff-operation-v1.md)
  — the implementation slice that satisfied
  the discovery memo's recommendation. Adds
  the new `exact_text_replacement` operation
  kind with a plan-time + preview-time
  double-gate; the preview helper's
  forward-compatible diff branch now renders
  real unified diffs against a real
  generator. **Source-write apply remains
  unavailable.**
- [Capability Ontology Architecture Impact Review](../strategy/capability-ontology-architecture-impact-review.md)
  — pins the phase-5 future where a
  `RefactorPreservationContract` (name
  reserved, registration deferred) feeds
  preservation obligations into
  reconciliation planning. Until that phase
  lands, this preview's classifier remains
  unaware of canonical capability purpose.
  Source-write apply remains unavailable
  through that future track as well.
- [Source-Write Reconciliation Policy Decision](../strategy/source-write-reconciliation-policy-decision.md)
- [ReconciliationPlan artifact reference](../artifacts/reconciliation-plan.md)
- [Reconciliation plans concept](reconciliation-plans.md)
- [Proof report publication](proof-report-publication.md)
