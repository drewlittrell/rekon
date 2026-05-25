# Review Packet — Reconciliation Preview v1

**Slice:** `reconciliation-preview-v1`
**Batch type:** Product capability (helper +
CLI + docs + tests). First real app capability
batch after the private-beta operator-support
track.
**Strict no-go list:** no source-write apply,
no `source:write` permission registration, no
`ReconciliationApplyReport` artifact, no
`ReconciliationPreviewReport` artifact yet,
no mutation of `ReconciliationPlan` shape, no
auto-resolve of findings, no auto-apply of
reconciliation, no auto-verification, no
workflow YAML installation, no npm publish,
no version bump, no git tag, no GitHub
Release, no new branch.

## CHANGES MADE

1. **`@rekon/capability-reconcile`** — new
   public helper
   `buildReconciliationPreview` plus five
   exported types
   (`ReconciliationPreview`,
   `ReconciliationPreviewOperation`,
   `ReconciliationPreviewOperationKind`,
   `ReconciliationPreviewRisk`,
   `ReconciliationPreviewSummary`,
   `ReconciliationPreviewRecommendation`,
   `ReconciliationPreviewStatus`,
   `ReconciliationPreviewInput`). Helper is
   `async` and accepts an optional
   `repoRoot` for a forward-compatible
   diff path: if a plan operation carries
   `beforeText` + `afterText` AND a `path`
   AND the current file matches
   `beforeText`, the helper emits a
   deterministic unified diff. v1
   `ReconciliationPlan` operations do NOT
   carry diff fields, so v1 emits no
   diffs through the normal flow.
2. **`packages/cli`** — new subcommand
   `rekon reconcile preview --plan <id|type:id>
   [--root <path>] [--json]`. Loads the
   plan via the existing
   `findArtifactEntry` helper, builds the
   preview, writes NO artifacts, prints
   JSON or a short human table.
   Help / usage entry added.
3. **Docs (2 new):**
   `docs/concepts/reconciliation-preview.md`
   (concept doc; what a preview shows,
   what it does not do, exact-diff
   contract, non-previewable explicit
   reasons, CLI surface, operation kind
   mapping table, "successful preview
   does not resolve findings" pin) +
   `docs/strategy/reconciliation-preview-v1.md`
   (strategy memo; decision summary, why
   this slice, why v1 writes no
   artifacts, conservative classification
   rules, status pinning, diff format,
   read-only guarantees, intentionally
   untouched list, follow-up).
4. **Docs (cross-link updates):**
   `docs/strategy/source-write-reconciliation-policy-decision.md`,
   `docs/concepts/reconciliation-plans.md`,
   `docs/artifacts/reconciliation-plan.md`,
   `docs/concepts/proof-report-publication.md`,
   `docs/strategy/roadmap.md`,
   `docs/strategy/classic-behavior-roadmap.md`,
   `README.md`, `CHANGELOG.md`.
5. **Contract test
   `tests/contract/reconciliation-preview.test.mjs`**
   — 13 assertions covering helper
   classification + CLI behaviour + the
   read-only guarantees.
6. **Docs test
   `tests/docs/reconciliation-preview.test.mjs`**
   — 8 assertions covering the required
   docs pins + the review packet.
7. **Review packet (this file)** with
   PURPOSE PRESERVATION CHECK + all 11
   required sections.

## PUBLIC API CHANGES

**Additive only.** New helper +
exported types from
`@rekon/capability-reconcile`:

- `buildReconciliationPreview(input):
  Promise<ReconciliationPreview>`
- `ReconciliationPreview`,
  `ReconciliationPreviewOperation`,
  `ReconciliationPreviewOperationKind`,
  `ReconciliationPreviewRisk`,
  `ReconciliationPreviewSummary`,
  `ReconciliationPreviewRecommendation`,
  `ReconciliationPreviewStatus`,
  `ReconciliationPreviewInput`.

New CLI subcommand
`rekon reconcile preview`. Existing
`ReconciliationPlan` shape, existing
`reconcile suggest` / `reconcile` actuator
behaviour, all other CLI commands, all
runtime / SDK surfaces, all artifact
types, all permissions, and all roles —
**unchanged**.

## PURPOSE PRESERVATION CHECK

Original problem (per the work order):

> Rekon has artifact-backed issue
> resolution and ReconciliationPlan
> output. But users need to understand
> the plan concretely before deciding
> whether future source-write apply is
> safe. The source-write policy says
> exact diff preview is mandatory
> before any apply implementation.
> This slice creates the preview layer
> without crossing into apply.

This batch implements that layer:

- **`ReconciliationPlan` remains
  canonical.** The helper is a pure
  projection; the plan body is not
  mutated.
- **`ReconciliationPreview` explains
  which operations are actionable.**
  Five preview kinds + four risk bands
  + an explicit `previewable: boolean`
  per operation.
- **Source-write candidates are
  visible, but not applied.** Every
  `source-write-deferred` operation
  appears with `risk: "high"` and
  (in v1) `previewable: false` and a
  human-readable reason.
- **Non-previewable operations are
  explicit.** Each non-previewable
  operation carries a `reason` string
  spelling out *why*. The concept doc
  enumerates the four canonical
  reasons.
- **Operators can inspect risk before
  any future apply path exists.** The
  summary block counts high-risk
  operations and the CLI's human
  output surfaces them in a single
  table.

Source-write policy preserved
verbatim:

- *"Source-write apply is not
  available."* — pinned in the
  concept doc + memo + asserted by
  the docs test.
- *"Exact diff preview is mandatory
  before any apply implementation."*
  — pinned in the memo + asserted by
  the docs test.

## CODEBASE-INTEL ALIGNMENT

- **Operates on existing
  `ReconciliationPlanOperation`
  shape.** No new fields required;
  the helper reads the existing
  `class` / `operation` / `files` /
  `suggestedAction` / `reason`
  surface.
- **Forward-compatible diff path.**
  The helper accepts an OPTIONAL
  `beforeText` / `afterText` extension
  on operations (cast through a
  private extension type). v1 plans
  don't include these fields, so v1
  emits no diffs; a future plan
  generator can attach them without
  changing the helper API.
- **Uses existing artifact-store
  API.** The CLI looks up the plan
  via the existing `findArtifactEntry`
  helper + `createLocalArtifactStore`,
  read-only. No new index API, no
  new schema, no new artifact
  category.
- **No new permission, no new role,
  no new actuator.** The helper is a
  pure function (modulo file reads
  for the diff path); no `runtime`
  invocation; no `runAct` /
  `runResolve` extension.

## PREVIEW MODEL

| Field | Type | Meaning |
| --- | --- | --- |
| `kind` | `"rekon.reconciliation.preview"` | type tag |
| `planRef` | `ArtifactRef` (`ReconciliationPlan`) | the plan this preview projects |
| `status` | `"previewable"` / `"partial"` / `"not-previewable"` | aggregate state |
| `operations[]` | `ReconciliationPreviewOperation[]` | one entry per plan operation |
| `summary.total` | number | count of operations |
| `summary.previewable` | number | count where `previewable === true` |
| `summary.sourcePatch` / `artifactOnly` / `generatedFile` / `manual` / `notPreviewable` | number | per-kind counts |
| `summary.highRisk` | number | count where `risk === "high"` |
| `recommendation.applyAvailable` | always `false` in v1 | |
| `recommendation.message` | always `"Source-write apply is not available. Review this preview and apply manually."` | |
| `recommendation.nextCommands[]` | always `[]` in v1 | |

Per-operation fields:

| Field | Notes |
| --- | --- |
| `id` | `<planArtifactId>::op-<index>` |
| `kind` | one of the five preview kinds |
| `title` | suggestedAction or humanised operation name |
| `description` | optional supporting text |
| `path` | first entry of `files` if present |
| `risk` | low / medium / high / unknown |
| `previewable` | `true` only when safe to describe + the helper has enough data to back the description |
| `reason` | required on every non-previewable operation; absent on previewable ones |
| `diff` | only present when the forward-compat diff path succeeded |
| `sourceRefs` | reserved for future lineage |

## DIFF MODEL

- **Format:** unified diff with one hunk
  per operation. Lines are emitted
  unchanged from input; no normalisation,
  no whitespace collapsing.
- **Trigger:** operation has all of:
  - `beforeText: string`
  - `afterText: string`
  - `path` (first entry of `files`)
  - caller passes `repoRoot`
  - the file at `<repoRoot>/<path>`
    reads cleanly
  - the file content equals `beforeText`
    byte-for-byte.
- **Mismatch behaviour:** if the file
  exists but content differs from
  `beforeText`, the operation is
  classified `previewable: false` with
  reason *"Current file content does
  not match expected before text."*
- **Read failure behaviour:** if the
  file cannot be read (missing,
  permission denied, escapes
  `repoRoot`), the operation is
  classified `previewable: false` with
  reason *"Could not read current
  file content for diff: <error>."*
- **No fabrication.** The helper
  never invents a patch. v1
  `ReconciliationPlan` shape carries
  no diff data, so v1 emits no diffs
  through normal flow.

## CLI SURFACE

```bash
rekon reconcile preview --plan <id|type:id> [--root <path>] [--json]
```

Output behaviour:

- `--json` → emits the
  `ReconciliationPreview` JSON
  verbatim.
- without `--json` → emits a short
  table:
  ```text
  Reconciliation preview

  Plan: ReconciliationPlan:<id>
  Status: <status>
  Operations: N total, M previewable, ...

  | # | Operation | Kind | Path | Risk | Preview |
  | --- | --- | --- | --- | --- | --- |
  | 1 | ... |
  ...

  Source-write apply is not available. Review this preview and apply manually.
  ```
- without `--plan` → fails with
  *"rekon reconcile preview requires
  --plan <ReconciliationPlan-id|type:id>."*
- if the named artifact is not a
  `ReconciliationPlan` → fails with a
  type-mismatch error.

The CLI writes no artifacts and never
mutates any source file under `--root`.

## TESTS / VERIFICATION

- `tests/contract/reconciliation-preview.test.mjs`
  — 13 assertions:
  1. helper accepts a `ReconciliationPlan`
  2. summary counts operations
  3. artifact-only classified correctly
  4. no-patch-data → not-previewable
  5. exact before/after → unified diff
  6. current-file mismatch prevents diff
  7. recommendation says apply unavailable
  8. CLI `--json` returns structured preview
  9. CLI human output says apply unavailable
  10. CLI refuses missing `--plan`
  11. CLI does not mutate source files
  12. CLI does not write new artifacts
  13. `artifacts validate` stays clean.
- `tests/docs/reconciliation-preview.test.mjs`
  — 8 assertions covering the required
  docs pins, the changelog entry, and
  this review packet.
- **Full 9-command verification gate**
  pre-batch on `e63b26a` (already
  green from prior batch's final gate)
  + post-batch.
- **CLI smoke** runs `rekon reconcile
  preview` against a seeded
  `ReconciliationPlan` in a temp copy
  of `examples/simple-js-ts`.

## INTENTIONALLY UNTOUCHED

- `ReconciliationPlan` body shape — no
  field added, no field removed, no
  validator change.
- `ReconciliationLog`, `ActionLog`,
  `IssueAdjudicationReport`,
  `CoherencyDelta`,
  `FindingStatusLedger` — none touched.
- Existing `reconcile`,
  `reconcile suggest` CLI commands —
  unchanged.
- `@rekon/capability-reconcile`
  actuator — unchanged. The preview
  helper is exported independently
  and is not wired into the actuator.
- `runtime`, `sdk`, `kernel-*` — no
  schema change, no permission
  change, no role change, no artifact
  category map change.
- `.github/workflows/*.yml` — no
  active workflow installed.
- `package.json`, `package-lock.json`,
  `tsconfig.json` — no dependency
  change, no version bump.
- Any operator repo — no mutation;
  the CLI smoke runs against
  `examples/simple-js-ts` only.

## RISKS / FOLLOW-UP

**Risks (all low):**

- *v1 emits no diffs through normal
  flow.* The forward-compat diff path
  exists but is dormant until a future
  plan generator attaches
  `beforeText` / `afterText`.
  Mitigation: the concept doc + memo
  + contract test #5 + #6 prove the
  diff path works when fed the right
  fields, so the next plan-generator
  slice can switch the path on
  incrementally without touching the
  helper.
- *Read access during preview.* The
  helper reads files when the
  forward-compat diff path triggers.
  Mitigation: file reads are bounded
  to `<repoRoot>/<path>` with an
  explicit "path escapes repo root"
  rejection. Read errors are reported
  in the operation `reason`, never
  thrown.
- *Operator misreads "previewable" as
  "apply-ready".* Mitigation: every
  preview's `recommendation` block
  says *"Source-write apply is not
  available."* verbatim, and the
  concept doc + memo pin the same
  thing.

**Follow-up:**

- *ReconciliationPreviewReport
  artifact decision* — decide whether
  previews should become durable
  artifacts before any source-write
  apply path exists.
- *Plan-generator diff path* — start
  attaching `beforeText` / `afterText`
  to safe, deterministic plan
  operations (e.g., a `docs_regeneration`
  with known generator output) so the
  preview's diff branch lights up
  organically.

## NEXT STEP

**ReconciliationPreviewReport artifact
decision.** Inputs to the decision:

- preview-shape feedback from
  operator cohort onboarding,
- whether the diff path lights up for
  any real operations,
- whether persisting a preview as an
  artifact provides lineage value
  before any apply path exists,
- what freshness semantics a
  `ReconciliationPreviewReport` would
  need (re-run on
  `ReconciliationPlan` change?
  re-run on source change?
  signed snapshot?).

The decision memo will explicitly
either reserve `ReconciliationPreviewReport`
(deferred, no artifact ships) or
register it (new artifact category +
validators + writer). Either way, no
source-write apply lands in that slice
either.
