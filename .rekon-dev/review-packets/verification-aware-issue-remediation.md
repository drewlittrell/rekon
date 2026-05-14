CHANGES MADE
- Added `lookupVerificationEvidence(artifacts, findingId)` as a new exported helper in `@rekon/capability-intent`. The helper chains `findingId -> WorkOrder.remediationItems -> VerificationPlan.workOrderRef -> VerificationResult.verificationPlanRef` using artifact ref equality only (no semantic/fuzzy matching) and returns a typed `VerificationEvidenceSummary` with status (`passed` | `failed` | `partial` | `not-run` | `missing`), the underlying refs, the result's summary counts, recorded-by / recorded-at, matched finding ids, and any non-fatal lookup warnings. The helper reads only via the `ArtifactReader` interface and writes nothing.
- Exported new types `VerificationEvidenceStatus` and `VerificationEvidenceSummary` from `@rekon/capability-intent`. Re-exported the same types from `@rekon/capability-resolver` for consumer convenience.
- Extended `RemediationActuatorInput` with optional `excludeFindingIds: string[]`. The internal `filterRemediationSteps` helper now drops any step whose `findingId` is in the exclusion set, applied alongside the existing `findingId` / `priority` / `limit` filters.
- Added `@rekon/capability-intent` as a runtime dependency of `@rekon/capability-resolver` (no cycle — `capability-intent` does not depend on `capability-resolver`). Added the matching tsconfig project reference.
- Extended `ResolutionTraceEntry.sourceType` enum with three additive values: `"WorkOrder"`, `"VerificationPlan"`, `"VerificationResult"`.
- Added optional `verification: VerificationEvidenceSummary` to `IssuePacket`. The `resolve.issue` resolver now:
  - calls `lookupVerificationEvidence(artifacts, match.id)` for any matched finding,
  - attaches the summary to the packet,
  - appends a status-specific warning to `warnings[]` (one of: failed / partial / not-run / missing; passing verification adds no warning),
  - pushes an `issue.verification` `resolutionTrace` entry with `sourceType` set to the deepest matched artifact (`VerificationResult`, `VerificationPlan`, `WorkOrder`, or `Fallback`) and `status` of `used` (passed), `missing` (no match), or `warning` (failed / partial / not-run),
  - dedupes lookup warnings before adding them to the packet,
  - extends `issueNextSteps` with a verification-aware recommended action (e.g. "Run `rekon verify record` against the existing VerificationPlan to capture proof.").
- Updated `@rekon/capability-resolver` manifest: `consumes` now lists `WorkOrder`, `VerificationPlan`, and `VerificationResult` alongside the existing inputs. Added a new `verification.changed` invalidation rule citing those three types.
- Added a `--skip-verified` flag to `rekon intent remediation`. When set, the CLI reads the latest `CoherencyDelta` directly, applies any `--finding` / `--priority` filters, then calls `lookupVerificationEvidence(runtime.artifacts, findingId)` for each candidate. Items resolving to `passed` are accumulated in a `skippedVerified` array and passed to the actuator as `excludeFindingIds`. The CLI reports `skippedVerified` back to the operator alongside the actuator's normal output. The flag is opt-in; existing default behavior is unchanged.
- Added a small CLI-local helper `collectRemediationCandidateIds` to enumerate candidate finding ids from the latest `CoherencyDelta` while honoring `--finding` / `--priority` filters. This avoids duplicating the actuator's selection logic.
- When `--skip-verified` removes every candidate, the CLI writes no new artifacts and returns `{ artifacts: [], selectedItems: [], skippedVerified: [...], message: "No active remediation items remain after skipping verified items." }`. The existing "no active remediation items in latest CoherencyDelta" message is preserved for the unfiltered path.
- Added contract test file `tests/contract/verification-aware-issue-remediation.test.mjs` with 12 tests (6 resolver tests + 5 remediation tests + 1 self-skipping import-boundary integration test).
- Updated docs: `docs/concepts/resolvers.md`, `docs/artifacts/resolver-packet.md`, `docs/concepts/remediation-work-orders.md`, `docs/concepts/verification-results.md`, `docs/artifacts/work-order.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, root `README.md`, and `CHANGELOG.md`.

PUBLIC API CHANGES
- New CLI flag `rekon intent remediation --skip-verified [--root <repo>] [--json]`. Existing flags (`--finding`, `--priority`, `--limit`) are unchanged and compose with `--skip-verified`.
- New exports from `@rekon/capability-intent`: `lookupVerificationEvidence`, `VerificationEvidenceStatus`, `VerificationEvidenceSummary`. `RemediationActuatorInput` gained optional `excludeFindingIds: string[]`.
- New exports from `@rekon/capability-resolver`: `VerificationEvidenceStatus`, `VerificationEvidenceSummary` (re-exported from `@rekon/capability-intent`).
- `IssuePacket` gained optional `verification: VerificationEvidenceSummary`. Soft, additive.
- `ResolutionTraceEntry.sourceType` enum widened to include three new values. Soft, additive.
- `@rekon/capability-resolver` now depends on `@rekon/capability-intent` at version `0.1.0-alpha.1`. No cycle introduced.
- `@rekon/capability-resolver` manifest `consumes` grew by three entries; `invalidatedBy` gained the `verification.changed` rule. Soft, additive.
- No kernel changes. No SDK changes. No new capability roles. No artifact header shape changes. The `VerificationResult`, `VerificationPlan`, `WorkOrder`, and `ResolverPacket` artifact shapes at the kernel level are unchanged.

PURPOSE PRESERVATION CHECK
- Original problem: agents and humans need to know whether a finding/remediation item already has proof of completion, failed proof, partial proof, or no proof. Without verification-aware context, agents may redo work, skip failed checks, or treat unverified work as complete.
- Classic behavior that solved it: codebase-intel-classic intent and reconciliation flows treated verification gates and proof as part of task completion. Work was not considered done merely because an agent said so.
- Hard-fought wins preserved in this batch:
  - Proof state is visible where work decisions happen: `resolve.issue` attaches the linked `VerificationEvidenceSummary` to the packet, and the `issue.verification` `resolutionTrace` step records which artifact was consulted, with what status, and why.
  - Failed verification is evidence and influences next steps: a `failed` result adds the warning "Associated verification failed; inspect VerificationResult before acting." and the `issueNextSteps` adds "Address verification failures and re-run `rekon verify record`."
  - Missing verification is not success: `missing` and `not-run` statuses each add a dedicated warning and a distinct next-step recommendation; neither is treated as "done."
  - Verification guides issue/remediation context without auto-mutating findings: passing verification is reported but never mutates `FindingStatusLedger`, `issue.status`, or removes the finding from `relatedFindings`. The test "resolve.issue reports passed verification without auto-resolving the finding" pins this invariant.
  - Agents are pushed toward re-running proof loops, not gaming them: every non-passed status surfaces a concrete next command to capture or restore real proof. The strengthened anti-gaming language from earlier batches is still active.
- Rekon-native simplifications:
  - Matching is by `findingId` against `WorkOrder.remediationItems` only — no semantic or fuzzy text matching.
  - The CLI reads `CoherencyDelta.remediationQueue` once and runs the same helper per candidate, so the actuator's selection logic is not duplicated; the actuator simply honors `excludeFindingIds`.
  - No command execution.
  - No status ledger mutation.
  - No CI/GitHub check integration.
  - `--skip-verified` is opt-in, never default.
- Failure modes ruled out (and how):
  - "Passing verification silently resolves or suppresses findings." — The packet still lists the matched finding, `issue.status` is untouched, and the test suite asserts the finding is not auto-marked `resolved`. The `--skip-verified` flag excludes items only from the new work order; it does not mutate the source CoherencyDelta or status ledger.
  - "Failed/partial verification is hidden." — `failed`, `partial`, and `not-run` each emit a distinct warning, a distinct trace status (`warning`), and a distinct `issueNextSteps` recommendation. The skip-verified flag never excludes them.
  - "`resolve.issue` still cannot tell whether related remediation work has proof." — Every matched finding gets a `verification` field with one of five typed statuses plus pointers to the underlying artifacts.
  - "`intent remediation --skip-verified` skips items without a clear audit trail." — Every excluded item is listed in `skippedVerified` with the matching `verificationResultRef`; the all-skipped path writes no work order and returns an explicit message naming the reason.
  - "The system treats VerificationResult as semantic correctness rather than recorded evidence." — The helper performs no judgment; it only chains artifact refs. The trace, the warning matrix, and the next-step text all describe "recorded evidence", not "verified correctness".
- Acceptance test for original purpose:
  - Given a finding with a remediation `WorkOrder`, `VerificationPlan`, and partial/failed `VerificationResult`, `rekon resolve issue` visibly reports the verification state (status, summary counts, recorded-by) and recommends the next action ("address failures" for partial/failed, "Run `rekon verify record`" for not-run, "Run `rekon intent remediation` to plan work" for missing).
  - Given a passed `VerificationResult` tied to a remediation item, `rekon intent remediation --skip-verified` excludes it from the new work order and reports the skip via `skippedVerified` with the `verificationResultRef`. Without `--skip-verified` the item is selected as usual.
  - Both scenarios are exercised by `tests/contract/verification-aware-issue-remediation.test.mjs` and the import-boundary fixture integration test.

CODEBASE-INTEL ALIGNMENT
- Classic capability: codebase-intel-classic intent preparation and reconciliation workflows required objective proof before claiming task completion. Classic issue/context flows needed to understand whether remediation work was already planned, attempted, verified, or still open. Lives across `services/IntentPreparationService.ts`, `lib/intent-preparation/**`, `packages/product-codebase-intel/src/intent/**`, `services/IssueDetectionService.ts`, `lib/issue-context.ts`, plus the proof-gate / apply discipline in `PlanExecutorService.ts`.
- What Rekon keeps: verification evidence affects issue and work context; failed proof is first-class; missing proof is not success; agents need next steps based on proof state; proof state is artifact-backed and auditable.
- What Rekon simplifies: artifact lookup only; `findingId` / `remediationItems` matching only; no proof runner; no semantic judge; no automatic resolution; no CI/check-run integration.
- What Rekon does not port yet: full proof-gate orchestration; automatic completion projection; verification sufficiency scoring; CI/GitHub integration; command execution; LLM review of proof quality.
- Phase advanced: B — verification-aware issue and remediation context shipped. Phase C still holds proof sufficiency scoring, CI/check integration, command runner, and verification-driven reconciliation apply.

VERIFICATION LOOKUP MODEL
- Single entrypoint: `lookupVerificationEvidence(artifacts: ArtifactReader, findingId: string): Promise<VerificationEvidenceSummary>`.
- Matching rules (artifact-ref based, deterministic):
  1. List `WorkOrder` refs (sorted by id desc, mirroring "latest first"). Find work orders whose `remediationItems` contain the given `findingId`. Pick the latest matching one.
  2. List `VerificationPlan` refs (sorted by id desc). Find the latest one whose `workOrderRef.id` equals the matched work order's id.
  3. List `VerificationResult` refs (sorted by id desc). Find the latest one whose `verificationPlanRef.id` equals the matched plan's id.
- Status derivation:
  - No matching `WorkOrder` -> `missing` (with warning "No remediation WorkOrder references this finding.").
  - WorkOrder but no matching `VerificationPlan` -> `missing` (with warning "Remediation WorkOrder exists but no VerificationPlan references it.").
  - Plan but no matching `VerificationResult` -> `not-run`.
  - Result found -> use the result's `status` verbatim (`passed` / `failed` / `partial` / `not-run`); fall back to `missing` if the stored status is unrecognized.
- The helper never writes artifacts, never calls runtime helpers, and never executes commands. It reads via the standard `ArtifactReader` interface, so it can be invoked from any handler or CLI path.

RESOLVE.ISSUE INTEGRATION
- `IssuePacket.verification: VerificationEvidenceSummary | undefined` is populated whenever a finding match exists. When no finding matched, `verification` is undefined and no trace entry is emitted (existing behavior preserved).
- Warning matrix (added to `warnings[]` after the existing status-based warnings):
  - `passed`: no warning.
  - `failed`: "Associated verification failed; inspect VerificationResult before acting."
  - `partial`: "Associated verification is partial; missing checks remain."
  - `not-run`: "VerificationPlan exists but no VerificationResult has passed yet."
  - `missing`: "No verification evidence found for this finding."
- Trace step `issue.verification`:
  - `sourceType`: `VerificationResult` / `VerificationPlan` / `WorkOrder` / `Fallback` (deepest matched artifact wins).
  - `sourceRef`: ref of the deepest matched artifact (when any).
  - `status`: `used` (passed), `missing` (missing), or `warning` (failed / partial / not-run).
  - `message`: status-specific, human-readable.
  - `details`: `{ status, summary, recordedBy, recordedAt }` for downstream consumers.
- `issueNextSteps` extension:
  - `missing`: "Run `rekon intent remediation` to plan work and `rekon verify record` to capture proof."
  - `not-run`: "Run `rekon verify record` against the existing VerificationPlan to capture proof."
  - `failed` / `partial`: "Address verification failures and re-run `rekon verify record`."
  - `passed`: "Associated verification has passed; confirm whether the finding is now stale."
- Invariants preserved (tested):
  - Passing verification does not mutate `FindingStatusLedger`.
  - Passing verification does not change `issue.status` (covered by the test "resolve.issue reports passed verification without auto-resolving the finding").
  - Passing verification does not remove the issue from `relatedFindings`.

INTENT REMEDIATION SKIP-VERIFIED
- CLI flag: `rekon intent remediation --skip-verified [--finding <id>] [--priority p0|p1|p2] [--limit <n>] [--root <path>] [--json]`.
- Behavior:
  - Before invoking the actuator, the CLI reads the latest `CoherencyDelta`, applies any `--finding` / `--priority` filters to derive candidate finding ids, then runs `lookupVerificationEvidence` for each candidate.
  - Items whose evidence resolves to `passed` are accumulated in a `skippedVerified` array (`{ findingId, status: "passed", verificationResultRef }`).
  - The actuator is dispatched with `excludeFindingIds` set to those ids; `failed`, `partial`, `not-run`, and `missing` items remain in the new work order.
  - The CLI returns both the standard `{ artifacts, selectedItems }` and the new `skippedVerified` array. Without `--skip-verified`, `skippedVerified` is omitted entirely.
- All-skipped path: when every candidate resolves to `passed`, the actuator returns no refs. The CLI then writes nothing and returns the operator-friendly message "No active remediation items remain after skipping verified items.", preserving the `skippedVerified` audit trail.
- Default behavior unchanged: without `--skip-verified` the actuator selects items by `--finding` / `--priority` / `--limit` exactly as before.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 248 passed, 1 skipped (optional dogfood). 12 new contract tests in `tests/contract/verification-aware-issue-remediation.test.mjs`.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages).
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 13 artifacts).
- CLI smoke against `examples/simple-js-ts`: `init`, `config validate`, `observe`, `project`, `snapshot`, `evaluate`, `findings lifecycle`, `coherency delta`, `intent remediation`, `intent remediation --skip-verified`, `resolve issue`, `publish architecture`, `artifacts validate`, `artifacts freshness` — every command exited 0; `artifacts validate` returned `{ valid: true, issues: [] }`.
- Manual smoke against the import-boundary rule pack fixture confirmed: with 3 active findings under one remediation `WorkOrder` and a passing `VerificationResult`, `resolve.issue --issue import_boundary.generated_output_import` reports `verification.status: "passed"`, attaches `sourceType: "VerificationResult"` in the trace, recommends "Associated verification has passed; confirm whether the finding is now stale.", and does **not** flip the finding's status. `intent remediation --skip-verified` reports all three findings in `skippedVerified` and writes no new work order. Without `--skip-verified` the same fixture still emits a fresh remediation work order with all three findings.

INTENTIONALLY UNTOUCHED
- No kernel changes. The `WorkOrder`, `VerificationPlan`, `VerificationResult`, and `ResolverPacket` artifact types at the kernel level are unchanged.
- No SDK changes. No new capability roles.
- No new artifact types introduced.
- No command execution. The lookup is read-only.
- No source modification.
- No automatic mutation of `FindingStatusLedger`. Operators must still set status decisions via `rekon findings status set`.
- No automatic mutation of `FindingLifecycleReport` or `CoherencyDelta`. Verification status does not retroactively change the active/accepted/ignored/resolved counts.
- No semantic / fuzzy / LLM matching. Matching is by `findingId` and artifact ref equality only.
- No CI / GitHub / dashboard integration.
- No verification sufficiency scoring or grading.
- No new dependency cycle. `@rekon/capability-resolver -> @rekon/capability-intent` is a new edge but not circular.
- No version bump.
- No npm publish.
- No `codebase-intel-classic` imports.
- The existing `@rekon/capability-resolver` resolvers (`resolve.route`, `resolve.seam`, `resolve.preflight`), the existing `@rekon/capability-intent.work-order` actuator, and the existing `rekon intent remediation` / `rekon verify record` / `rekon reconcile suggest` paths are unchanged when their new flags are not used.
- The architecture summary v2 publication is unchanged; surfacing the new lookup helper in publications is the next step's job.

RISKS / FOLLOW-UP
- The lookup matches `findingId` exactly. A finding whose id is reformatted after a rule pack upgrade will lose its evidence link. This matches existing CoherencyDelta semantics and is documented; a future "alias" or "stable id" mechanism could layer on top.
- A passed `WorkOrder` covers every `remediationItem` it lists. If an operator wants per-item verification granularity, that requires either splitting work orders or a future per-finding result schema. The current behavior (a passing WorkOrder + Plan + Result "verifies" all items in that work order) is documented and consistent with the artifact model.
- `--skip-verified` reads the latest `CoherencyDelta` directly via the runtime's artifact store. If multiple coherency deltas exist, the latest by id wins (same convention as the rest of the helpers). Future work could let operators pin a specific delta if needed.
- The `IssuePacket.verification` field is package-local on the resolver-side type. Direct importers of `IssuePacket` from `@rekon/capability-resolver` will see the new optional field; existing JSON consumers iterate by known keys so this is additive.
- `excludeFindingIds` is the only new actuator input. If we add per-status skip later (e.g. `--skip-not-run`), we may want a richer skip object. Deferring to keep this batch small.
- No verification-aware behavior was added to `resolve.preflight`, `resolve.route`, or `resolve.seam`. Those resolvers do not have a single finding to chain against; adding the lookup there would require API design we do not need yet.

NEXT STEP
- Per the work order: a small verification-evidence publisher / proof report. Consumes `VerificationResult` + `WorkOrder` + `CoherencyDelta` and emits a concise proof-report `Publication` artifact for humans/agents and future PR/check surfaces. Still no CI integration.
- Operator npm publish is still pending and unchanged by this batch.
