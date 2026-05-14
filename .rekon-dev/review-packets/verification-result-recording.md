CHANGES MADE
- Added package-local `VerificationResult` artifact shape and supporting types inside `@rekon/capability-intent` (no new kernel package). New exports: `VerificationResult`, `VerificationCommandResult`, `VerificationResultSummary`, `VerificationCommandStatus`, `VerificationResultStatus`, `VerificationPlanLike`, `CreateVerificationResultInput`, plus the helper function `createVerificationResult`.
- `createVerificationResult` derives the overall status (`passed`/`failed`/`partial`/`not-run`), fills missing plan commands as `not-run`, preserves submitted commands not in the plan after the plan-ordered list, and writes `header.inputRefs` that include the `VerificationPlan` and any paired `WorkOrder`.
- Added a new CLI shortcut `rekon verify record [--plan <id|type:id>] --result-json <json>`. CLI parses operator-supplied JSON, resolves the plan (defaulting to the latest with a warning), invokes the helper, writes the artifact under the existing `actions` category, and returns `{ artifact, status, summary, commandResults, warnings }`.
- Updated CLI parsing helpers: added `parseCommandResults` (typed JSON parsing for the command list), `isVerificationCommandStatus`, `parseStringArray`, `resolveVerificationPlanEntry`, `sortByWrittenAtDesc`. CLI rejects malformed `--result-json`, missing `--result-json`, unknown `--plan`, and an empty artifact store with clear errors.
- Added contract test file `tests/contract/verification-result.test.mjs` with 18 tests (7 helper-level + 11 CLI/runtime integration).
- New docs: `docs/artifacts/verification-result.md`, `docs/concepts/verification-results.md`. Updated `docs/artifacts/verification-plan.md`, `docs/artifacts/work-order.md`, `docs/concepts/remediation-work-orders.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, root `README.md`, and `CHANGELOG.md`.

PUBLIC API CHANGES
- New CLI command `rekon verify record`.
- New exports from `@rekon/capability-intent`: `createVerificationResult` plus 7 supporting types.
- `VerificationResult` is package-local; the runtime already maps the `VerificationResult` artifactType to the `actions` category (`packages/runtime/src/index.ts:221`), so no kernel or SDK change was required.
- No kernel changes. No SDK changes. No new capability roles. No artifact header shape changes. No new actuator/handler — the helper runs through the CLI directly and writes through the standard artifact store with category `actions`.

CODEBASE-INTEL ALIGNMENT
- Classic capability: intent proof-gate orchestration — agents must prove work with objective evidence, failures are evidence too, verification gates must not be gamed. Lives in `services/IntentPreparationService.ts`, `lib/intent-preparation/**`, `packages/product-codebase-intel/src/intent/**`, plus the verification side of `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`.
- What Rekon keeps: verification is explicit and operator-driven; results are artifacts with `inputRefs`; failures are first-class status (not buried in prose); missing/skipped commands are not silently treated as passed; the result cites the plan it evaluated.
- What Rekon simplifies: operator-supplied results only; no command execution; no log streaming; no semantic judgment; no gate-quality classifier; no auto-apply on a passing result; no CI integration; raw stdout/stderr is replaced with operator-supplied digests + notes.
- What Rekon does not port yet: command runner, CI/check-run integration, LLM review of verification sufficiency, gate quality scoring, automatic completion projection, verification-driven reconciliation apply, automated re-evaluate after passing verification.
- Phase advanced: B — verification result recording shipped. Phase C still holds the command runner, CI integration, semantic verification judge, and verification-driven apply.

VERIFICATION RESULT MODEL
- Artifact type: `VerificationResult` (package-local in `@rekon/capability-intent`).
- Producer: `@rekon/capability-intent` via `createVerificationResult(input)` and the CLI command `rekon verify record`.
- Required inputs: the consumed `VerificationPlan` (cited in `verificationPlanRef` and `header.inputRefs`).
- Optional inputs: a paired `WorkOrder` (cited automatically when the plan exposes `workOrderRef`); operator-supplied `extraInputRefs` for additional evidence artifacts.
- Output category: `actions` (already mapped in `packages/runtime/src/index.ts:221`).
- Required fields: `verificationPlanRef`, `status`, `commandResults`, `summary`, `evidenceNotes`, `recordedAt`. Optional: `workOrderRef`, `recordedBy`.
- Status derivation:
  - `passed`: every plan command has a `passed` submitted result and no command result is `failed`.
  - `failed`: any submitted result has status `failed`.
  - `partial`: at least one command has a result but some plan commands remain `skipped`/`not-run`.
  - `not-run`: no submitted results, or every result is `not-run`.
- Summary counts: `total`, `passed`, `failed`, `skipped`, `notRun`.
- Stdout/stderr policy: never stored raw. Operators may attach `stdoutDigest` / `stderrDigest` (e.g. SHA-256 hex strings) and `notes`.

CLI COMMANDS ADDED
- `rekon verify record [--plan <id|type:id>] --result-json <json> [--root <path>] [--json]`.
- `--plan` accepts a bare plan id or `VerificationPlan:<id>`. When omitted, the CLI uses the latest indexed plan and returns `warnings: ["No --plan provided; recorded against latest VerificationPlan."]`.
- `--result-json` is required. Minimum shape: `{ commands: [{ command, status }] }`. Each entry may also include `exitCode`, `durationMs`, `startedAt`, `completedAt`, `stdoutDigest`, `stderrDigest`, `notes`.
- Errors: missing `--result-json`, malformed JSON, unknown plan id, and no `VerificationPlan` in the store all exit non-zero with clear messages (the unknown-plan error lists known plan ids).

ANTI-GAMING / PROOF DISCIPLINE
- Failures are first-class. A single `failed` command flips the overall status to `failed`; the failure is preserved in `summary.failed` and `commandResults[i].status === "failed"`.
- Skipped is not passed. `skipped` and `not-run` are distinct statuses; the overall status will be `partial` or `not-run` if any plan command is missing or skipped.
- Re-record after re-plan. Because `VerificationResult.header.inputRefs` cites the consumed `VerificationPlan`, the existing freshness validator marks the result `stale` automatically when a newer plan is indexed.
- No raw stdout/stderr. Avoids accidental secret capture and keeps artifacts small. Operators supply digests and notes if they want stronger evidence.
- No auto-apply. A passing result does not promote any reconciliation operation; that path stays explicitly deferred.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 225 passed, 1 skipped (optional dogfood). 18 new contract tests in `tests/contract/verification-result.test.mjs`.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages).
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 13 artifacts).
- CLI smoke against `examples/simple-js-ts`: `init`, `config validate`, `observe`, `project`, `snapshot`, `evaluate`, `findings lifecycle`, `coherency delta`, `intent remediation`, `intent work-order`, `verify record`, `artifacts validate`, `artifacts freshness` — every command exited 0. `verify record` returned `status: "partial"` with `{ total: 3, passed: 1, notRun: 2 }` (only the typecheck command was reported as passed; the other two plan commands correctly came back as `not-run`). `artifacts validate` returned `{ valid: true, issues: [] }` after the new VerificationResult landed.

INTENTIONALLY UNTOUCHED
- No kernel changes. The runtime already mapped `VerificationResult` to the `actions` category.
- No SDK changes. The helper is package-local to `@rekon/capability-intent` and runs through the CLI directly.
- No new capability roles. No new actuator handler — the helper is invoked via CLI, not via `runAct`.
- No command execution. The helper does not run any shell command.
- No CI/GitHub integration.
- No automatic re-evaluate, re-coherency, or re-reconcile after a passing result.
- No source modification.
- No verification command runner.
- No LLM evaluation of result quality.
- No verification result schema in the kernel (`@rekon/kernel-findings` and `@rekon/kernel-snapshot` are unchanged).
- No version bump.
- No npm publish.
- No `codebase-intel-classic` imports.
- The existing `@rekon/capability-intent.work-order`, `@rekon/capability-intent.remediation-work-order`, `@rekon/capability-reconcile.actuator` (both manual and suggestion modes), and all resolver capabilities are unchanged.

RISKS / FOLLOW-UP
- Plan-default behavior is "latest indexed VerificationPlan" plus a warning. For non-interactive use, callers should pass `--plan` explicitly. The CLI surfaces this through `warnings` rather than failing; future versions could turn the warning into an opt-in (`--allow-latest`) if more discipline is needed.
- Command matching is by exact string. A plan command with trailing whitespace or unusual quoting will not match the submitted entry. The helper appends mismatches as extra commands after the plan-ordered list, so evidence is never silently lost — but operators should mirror the plan's command strings exactly when possible.
- `VerificationResult.summary.total` counts entries in `commandResults`, which can exceed `plan.commands.length` when extra commands are submitted. That is intentional: extras are evidence, not warnings. Future ergonomic improvements (e.g. surfacing `planTotal` vs `recordedTotal`) can layer on top.
- Digests are operator-supplied strings; Rekon does not compute them. If we ever add command execution we will own digest computation; until then operators control what they attest to.
- The package-local `VerificationResult` type is a soft API addition; direct importers of the `@rekon/capability-intent` types will see the new exports. The runtime treats `VerificationResult` as opaque JSON, so no downstream code breaks.
- No new freshness validator rules. The existing `header.inputRefs` mechanism handles `VerificationPlan` and `WorkOrder` staleness automatically. If we add result-specific rules (e.g. "a `failed` result older than 24h should re-run") they can layer on later.

NEXT STEP
- Per the work order: architecture summary / agent publication v2. Extend `@rekon/capability-docs.architecture-summary` to surface the latest `VerificationResult` status alongside the existing remediation queue and coherency summary, plus a short proof-loop summary (`Finding -> Lifecycle -> CoherencyDelta -> WorkOrder -> ReconciliationPlan -> VerificationPlan -> VerificationResult`). Still publication-only.
- Operator npm publish is still pending and unchanged by this batch.
