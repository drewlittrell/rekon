CHANGES MADE
- Extended `@rekon/capability-reconcile.actuator` to support two modes inside a single actuator: existing manual mode (operator passes `operations`) and a new suggestion mode (consumes `WorkOrder` / `CoherencyDelta`). The actuator dispatches on `input.mode === "suggestions"` OR the presence of `input.workOrderRef` / `input.coherencyDeltaRef`.
- Added a new pure helper `suggestReconciliationOperations({ workOrder, coherencyDelta, findingId, priority, limit }) -> ReconciliationPlanOperation[]`. Classification inspects `title + action` (case-insensitive) and maps each remediation item to an operation/class/permission tuple. The helper has no I/O.
- Added a new `manual_review` value to the package-local `ReconciliationOperation` union so unclassified remediation items have a first-class home.
- Extended package-local types:
  - `ReconciliationOperationClass`: `artifact-only` | `deterministic-deferred` | `source-write-deferred` | `command-deferred` | `manual-review`.
  - `ReconciliationOperationSource`: `manual` | `work-order` | `coherency-delta`.
  - `ReconciliationPermission`: `write:source` | `execute:commands` | `network:outbound`.
  - `ReconciliationPlanOperation` gained optional `class`, `source`, `findingId`, `priority`, `files`, `systems`, `suggestedAction`, `requiresPermission`.
  - `ReconciliationPlan` gained optional `summary` with per-class and per-status counts.
- Extended `ReconciliationLog` additively with optional `planned: ReconciliationPlanOperation[]` and `denied: ReconciliationPlanOperation[]`. Existing `applied` and `deferred` string-arrays are unchanged.
- Updated the capability manifest: `consumes` now includes `CoherencyDelta` and `WorkOrder`; added `coherency.changed` and `work-order.changed` invalidation rules alongside the existing `snapshot.changed`.
- Added `@rekon/kernel-findings` as a `@rekon/capability-reconcile` dependency (used for `CoherencyDelta`, `CoherencyRemediationStep`, `CoherencyRemediationPriority` type imports).
- Added a new CLI shortcut `rekon reconcile suggest` with `--finding`, `--priority`, `--limit`, `--apply` flags. CLI auto-runs `ensureCoherencyDeltaReady` (observe/project/evaluate/snapshot/lifecycle/delta as needed) before dispatch.
- Added contract test file `tests/contract/reconciliation-suggestions.test.mjs` with 17 tests (7 helper-level + 10 CLI/runtime integration).
- New docs: `docs/artifacts/reconciliation-plan.md`, `docs/concepts/reconciliation-plans.md`. Rewrote `docs/artifacts/reconciliation-log.md` to cover both modes and the additive log fields. Updated `docs/artifacts/work-order.md`, `docs/artifacts/coherency-delta.md`, `docs/concepts/coherency-delta.md`, `docs/concepts/remediation-work-orders.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, root `README.md`, and `CHANGELOG.md`.

PUBLIC API CHANGES
- New CLI command `rekon reconcile suggest [--finding <id>] [--priority p0|p1|p2] [--limit <n>] [--apply] [--root <path>] [--json]`.
- New exports from `@rekon/capability-reconcile`: `suggestReconciliationOperations`, `ReconciliationOperationClass`, `ReconciliationOperationSource`, `ReconciliationPermission`, `ReconciliationOperationStatus`, `ReconciliationPlanOperation`, `ReconciliationPlanSummary`, `RemediationItemLike`, `ReconciliationSuggestionInput`. The default capability export is unchanged in shape.
- `ReconciliationOperation` union widened to include `"manual_review"` (soft change; runtime treats the type opaquely).
- `ReconciliationPlan.operations` now uses the richer `ReconciliationPlanOperation` shape with optional `class`, `source`, `findingId`, `priority`, `files`, `systems`, `suggestedAction`, `requiresPermission`. Legacy single-operation plans now also set `class: "artifact-only"` and `source: "manual"`. Existing consumers reading `operations[i].operation` and `operations[i].status` keep working.
- `ReconciliationPlan` gained optional `summary` (`ReconciliationPlanSummary`).
- `ReconciliationLog` gained optional `planned` and `denied` arrays of full `ReconciliationPlanOperation` records; `applied` and `deferred` arrays of operation-name strings are unchanged.
- No kernel changes. No SDK changes. No new capability roles. No artifact header shape changes. The `ReconciliationPlan`, `ReconciliationLog`, and `ActionLog` artifact types at the kernel level are unchanged.

CODEBASE-INTEL ALIGNMENT
- Classic capability: deterministic-first reconciliation discipline (apply what is safe deterministically, defer everything else, never silently auto-fix) from `packages/product-codebase-intel/src/reconcile/PlanHandler.ts`, `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`, `packages/product-codebase-intel/src/reconcile/**`, with governance signal flowing from `replatform-delta.ts` and `services/IntentPreparationService.ts`.
- What Rekon keeps: deterministic-first; deferred-as-first-class; source writes require explicit future permission; every plan/log/action artifact carries `inputRefs`; work orders and coherency deltas drive reconciliation; dry-run is the default; no silent auto-fixes.
- What Rekon simplifies: suggestion plans only; no source writes; no command execution; no generated scaffold writes; no real import rewrites; no LLM plan expansion; the apply path is restricted to `artifact-only` operations.
- What Rekon does not port yet: full `PlanExecutorService`, source rewrite operations, command execution operations, deterministic scaffold generation, real label override writes, file patches, verification result recording.
- Phase advanced: B — reconciliation suggestion plans shipped. Phase C still holds deterministic source writes (`write:source`), command execution (`execute:commands`), and verification recording.

RECONCILIATION SUGGESTION MODEL
- Actuator id (unchanged): `@rekon/capability-reconcile.actuator`. Now supports manual and suggestion modes inside the same handler.
- Suggestion mode trigger: `input.mode === "suggestions"` OR the presence of `input.workOrderRef` / `input.coherencyDeltaRef`.
- Required input (for non-empty output): the latest `WorkOrder` with `source === "coherency-delta"` (preferred) OR the latest `CoherencyDelta`. If neither exists, the plan still writes but has zero operations.
- Filtering: `findingId`, `priority`, `limit` filters apply to the list before classification.
- Produces: `IntentMap` is not part of this batch; reconciliation writes one `ReconciliationPlan`, one `ReconciliationLog`, and one `ActionLog`.
- Output category: `actions`.
- Plan operations include: `operation` (typed enum), `status` (`planned`/`applied`/`deferred`/`denied`), `class`, `source`, `findingId`, `priority`, `files`, `systems`, `suggestedAction`, `requiresPermission`, optional `reason`.

CLI COMMANDS ADDED
- `rekon reconcile suggest --root <repo> [--finding <id>] [--priority p0|p1|p2] [--limit <n>] [--apply] [--json]`.
- Existing `rekon reconcile [--operation <name>] [--apply] [--root <path>] [--json]` is unchanged. It still denies non-artifact-only operations.

DETERMINISTIC VS DEFERRED CLASSIFICATION
Classification rules (case-insensitive regex over `title + action`), in priority order:
1. docs / documentation / readme / agents.md / agents -> `docs_regeneration`, class `artifact-only`, status `planned` (or `applied` with `--apply`).
2. baseline / accept(ed) / ignore(d) / false positive / status ledger -> `finding_baseline_write`, class `artifact-only`, status `planned` (or `applied` with `--apply`).
3. import / generated-output / generated/ / /dist / build-output / boundary -> `safe_import_rewrite`, class `source-write-deferred`, status `deferred`, requires `["write:source"]`.
4. scaffold / generate(d) file / create file -> `generated_scaffold_write`, class `source-write-deferred`, status `deferred`, requires `["write:source"]`.
5. test(s|ing) / verify / verification / command / run -> `verification_command_run`, class `command-deferred`, status `deferred`, requires `["execute:commands"]`.
6. otherwise -> `manual_review`, class `manual-review`, status `deferred`.

`--apply` only applies `artifact-only` operations. All other classes stay `deferred` regardless of `--apply`. There is no path to apply source-write or command operations in this batch.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 207 passed, 1 skipped (optional dogfood). 17 new contract tests in `tests/contract/reconciliation-suggestions.test.mjs`.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages).
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 13 artifacts).
- CLI smoke against `examples/simple-js-ts`: `init`, `config validate`, `observe`, `project`, `snapshot`, `evaluate`, `findings lifecycle`, `coherency delta`, `intent remediation`, `reconcile suggest`, legacy `reconcile --operation docs_regeneration`, `artifacts validate`, `artifacts freshness` — every command exited 0. `artifacts validate` returned `{ valid: true, issues: [] }`. The example has no findings, so `reconcile suggest` produces an empty plan but writes all 3 artifacts.
- Manual smoke against the import-boundary rule pack fixture: 3 active findings (1 p0 + 2 p1) all classify as `safe_import_rewrite`, class `source-write-deferred`, status `deferred`, with `requiresPermission: ["write:source"]`. Summary: `{ total: 3, sourceWriteDeferred: 3, applied: 0, deferred: 3 }`. `artifacts validate` stayed clean.

INTENTIONALLY UNTOUCHED
- No kernel changes. The `ReconciliationPlan`, `ReconciliationLog`, and `ActionLog` artifact types at the kernel level are unchanged. The new fields live on package-local types.
- No SDK changes. The new handler is the same `actuator` slot inside the same capability; it dispatches internally.
- No new capability roles.
- No source modification. The actuator does not write any code files.
- No command execution. The actuator does not run shell commands.
- No auto-apply for source-write/command/manual-review classes. `--apply` only applies artifact-only operations.
- No verification command runner. A future `VerificationResult` recorder is the natural next slice.
- No reconciliation marketplace. Operation classes are fixed in this alpha.
- No PR/check publishers.
- No watcher / daemon.
- No LLM plan expansion.
- No schema library introduction.
- No version bump.
- No npm publish.
- No `codebase-intel-classic` imports.
- The existing `@rekon/capability-intent.work-order` and `@rekon/capability-intent.remediation-work-order` are unchanged.
- The legacy `rekon reconcile --operation <name>` CLI path is preserved. Source operations still throw via the existing `ARTIFACT_ONLY_OPERATIONS` gate when invoked manually.
- `resolve.preflight`, `resolve.route`, `resolve.seam`, `resolve.issue` are unchanged.

RISKS / FOLLOW-UP
- Classification is heuristic. The keyword set covers known patterns (docs/import/test/scaffold/baseline) and the import-boundary rule pack lands cleanly, but future rule packs may need richer keywords. Falling back to `manual_review` keeps the failure mode visible rather than silently misclassifying.
- The package-local `ReconciliationPlan` and `ReconciliationLog` widening is a soft API change — direct importers of these types from `@rekon/capability-reconcile` will see the new optional fields. The runtime treats both as opaque JSON, so no downstream code should break.
- The actuator still emits an empty plan when there is no `WorkOrder` and no `CoherencyDelta`. The CLI does not short-circuit before calling the actuator; future refinement could return `{ artifacts: [], operations: [], message: "..." }` like `intent remediation` does. Kept consistent for now so freshness/index integrity stays consistent.
- The summary fields use cumulative counters; `summary.applied + summary.planned + summary.deferred + summary.denied === summary.total` only when every operation has one of those four statuses, which is always the case today but worth re-checking when adding new statuses.
- `manual_review` is currently uncalled from the legacy `--operation` path. Direct CLI users cannot pass `--operation manual_review` and would hit the `ARTIFACT_ONLY_OPERATIONS` gate; that is intentional — `manual_review` is only emitted in suggestion mode.
- `--apply` for suggestion mode applies artifact-only operations to the plan (status becomes `applied`), but does **not** write any actual artifacts beyond the plan/log/action log themselves. Real docs regeneration, for example, requires running `rekon publish architecture` or `rekon publish agents` separately. This matches the existing manual-path behavior and avoids new side effects.

NEXT STEP
- Per the work order: verification result recording. Add a recorder capability or handler that consumes `VerificationPlan` and emits a `VerificationResult` artifact capturing command outcomes (exit code, stdout/stderr digests, timing). Do not execute commands automatically yet — start with operator-supplied results that the recorder validates and writes through the artifact store. This closes the loop `Finding -> Lifecycle -> CoherencyDelta -> WorkOrder -> ReconciliationPlan -> VerificationPlan -> VerificationResult`.
- Operator npm publish is still pending and unchanged by this batch.
