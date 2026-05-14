CHANGES MADE
- Extended `@rekon/capability-docs.architecture-summary` (the existing publisher inside `@rekon/capability-docs`) to read four additional artifact types alongside its existing inputs: `WorkOrder` (latest remediation order where `source === "coherency-delta"` AND latest resolver order), `ReconciliationPlan` (latest), `VerificationPlan` (latest), and `VerificationResult` (latest). Every artifact actually read is cited in `header.inputRefs`. Missing artifacts are not cited and each missing section calls out what to run next.
- Added four new sections to the rendered Markdown, between the existing Remediation Queue and Agent Guidance sections:
  - `## Work Orders` — table with one row per available work-order flavor (`coherency-delta`, `resolver`).
  - `## Reconciliation Plans` — summary row + up to 5 top operations.
  - `## Verification Status` — status / passed / failed / skipped / not-run / recorded by / recorded at, plus explicit "Verification is not complete." and "VerificationResult may be stale" callouts when applicable.
  - `## Proof Loop` — governance / planning / verification state bullets plus a single "Suggested next command:" line that walks the loop in priority order.
- Added `readLatestWorkOrdersByFlavor` helper to pick the latest remediation and resolver work orders separately while keeping `inputRefs` deduplicated. Added `renderWorkOrdersSection`, `renderReconciliationPlansSection`, `renderVerificationStatusSection`, `renderProofLoopSection`, and `pickNextProofLoopCommand` rendering helpers.
- Defined minimal local "Like" type shapes (`WorkOrderLike`, `ReconciliationPlanLike`, `ReconciliationPlanOperationLike`, `VerificationPlanLike`, `VerificationResultLike`, `RemediationItemLike`) so capability-docs can read the artifacts without importing from `@rekon/capability-intent` or `@rekon/capability-reconcile`. This avoids introducing a downstream-to-downstream package dependency cycle.
- Updated the capability manifest:
  - `consumes` now includes `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, and `VerificationResult` alongside the existing types.
  - Added a new `proof-loop.changed` invalidation rule citing those four input types alongside the existing `snapshot.changed` and `coherency.changed` rules.
- Added contract test file `tests/contract/architecture-summary-proof-loop.test.mjs` with 11 tests covering: presence of all four new sections, missing-VerificationResult recommendation, missing-CoherencyDelta recommendation, partial-status rendering with not-run count, failed-status rendering, `header.inputRefs` citing the new artifacts when present, Work Orders table distinguishing coherency-delta vs resolver rows, stale-plan callout, freshness staleness after a newer `VerificationResult`, existing `publish agents` still works, and a self-skipping import-boundary fixture test confirming the reconciliation classification rows surface `safe_import_rewrite` / `source-write-deferred` / `write:source`.
- Updated docs: `docs/artifacts/architecture-summary-publication.md`, `docs/concepts/architecture-summary-publication.md`, `docs/artifacts/verification-result.md`, `docs/concepts/verification-results.md`, `docs/concepts/reconciliation-plans.md`, `docs/concepts/remediation-work-orders.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, root `README.md`, and `CHANGELOG.md`.

PUBLIC API CHANGES
- The architecture summary `Publication` content gained four new section headings (`## Work Orders`, `## Reconciliation Plans`, `## Verification Status`, `## Proof Loop`). The `kind` enum and `title` field are unchanged.
- The `header.inputRefs` of architecture-summary publications now may include `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, and `VerificationResult` refs in addition to the existing types. Consumers that walked `inputRefs` already iterate by `(type, id)` so the change is additive.
- No new exports from `@rekon/capability-docs`. The new helpers are internal; the `PublicationArtifact` type is unchanged.
- The capability manifest's `consumes` list grew by four entries; the `invalidatedBy` list grew by one rule (`proof-loop.changed`). Soft, additive changes.
- No new CLI commands. `rekon publish architecture` and `rekon publish run @rekon/capability-docs.architecture-summary` behave identically except for the richer publication body. `publish list` shows the same id.
- No kernel changes. No SDK changes. No new capability roles. No artifact header shape changes.

PURPOSE PRESERVATION CHECK
- Original problem: humans and agents need a current, readable view of repo architecture, ownership, drift, remediation, and proof state before acting. Without a generated summary, they must inspect many artifacts manually and can miss unresolved drift, stale work, failed verification, or missing proof.
- Classic behavior that solved it: codebase-intel-classic generated architecture docs, agent docs, context output, and assistant-doc projections from repo intelligence, issue/coherency state, and proof expectations. These publications made governance state visible so agents could not silently skip verification.
- Hard-fought wins preserved in this batch:
  - Generated docs are derived from current repo intelligence: the publisher reads the latest `IntelligenceSnapshot`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, `FindingLifecycleReport`, `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, and `VerificationResult` on every publish; nothing is cached or made canonical.
  - Docs cite their inputs: every consumed artifact is pushed into `header.inputRefs`, and the Input Artifacts section renders the same list verbatim. `rekon artifacts freshness --type Publication` automatically marks the summary `stale` when any cited artifact has a newer sibling.
  - Governance and proof state are visible: four new sections (Work Orders, Reconciliation Plans, Verification Status, Proof Loop) surface remediation, reconciliation classification, and verification status alongside the existing coherency summary.
  - Failed, partial, skipped, or not-run verification is not hidden: Verification Status renders the actual status string verbatim, and when it is `failed`, `partial`, or `not-run` the publisher emits an explicit "Verification is not complete." line plus, when the result references an older plan, "VerificationResult may be stale; latest VerificationPlan differs."
  - Docs remain publications, not canonical truth: the preface still says "Docs are publications, not canonical truth. Canonical truth lives in `.rekon/artifacts`." The publisher does not execute commands or judge verification sufficiency.
  - Agents are pointed to the next correct action: the Proof Loop section ends with a single "Suggested next command:" line that walks `coherency delta -> intent remediation -> reconcile suggest -> verify record -> address failures -> rerun evaluate/lifecycle/delta/publish` in strict priority order.
- Rekon-native simplifications: one concise publication instead of a per-system generated doc tree; no AGENTS.md overwrite; no watcher-backed regeneration; no GitHub/PR publisher; no dashboard; no command execution; no semantic verification judge.
- What would mean we failed (and why this batch does not):
  - "Publication looks polished but doesn't show whether remediation has proof." — The publication explicitly renders verification status and the proof-loop suggestion, so remediation without proof reads as `partial` / `not-run` with a "Verification is not complete." callout.
  - "Failed/partial/not-run verification is omitted or buried." — Failed/partial/not-run statuses are surfaced in the Verification Status table, the explicit "not complete" line, and the Proof Loop's "address failures" suggestion. Test coverage exercises each of these paths.
  - "Doc implies work is complete when proof is missing." — When no `VerificationResult` exists, the section explicitly says "No VerificationResult found. Run `rekon verify record` after executing a VerificationPlan." The Proof Loop suggested command is `rekon verify record` rather than "all done."
  - "Publication becomes canonical truth instead of citing artifacts." — Every section that depends on an artifact cites it in `header.inputRefs`; the preface and What This Is Not docs say it explicitly; the freshness validator marks older summaries stale when inputs change.
  - "User still has to inspect six artifacts manually to know the state of work." — The four new sections summarize `WorkOrder` / `ReconciliationPlan` / `VerificationPlan` / `VerificationResult` in one read, while linking back to the canonical artifacts via `inputRefs`.
- Acceptance test for original purpose: given a repo with `CoherencyDelta`, remediation `WorkOrder`, `ReconciliationPlan`, `VerificationPlan`, and a `partial` `VerificationResult`, `rekon publish architecture` produces a Publication that visibly shows active drift (Coherency Summary), the remediation queue (Remediation Queue), work-order status (Work Orders table with `coherency-delta` row), reconciliation plan status (Reconciliation Plans summary row + classified operations table), verification status (Verification Status table with `partial`, plus "Verification is not complete."), and the next recommended command (`Suggested next command: address failures and re-run \`rekon verify record\``). All of these are exercised by `tests/contract/architecture-summary-proof-loop.test.mjs` and confirmed in the CLI smoke against `examples/simple-js-ts`.

CODEBASE-INTEL ALIGNMENT
- Classic capability: generated architecture/agent docs surfaced repo state, issue status, and proof expectations so agents could not silently claim work was complete without verification evidence. Lives across `services/ArchitectureDocsHandler.ts`, `services/ContextHandler.ts`, `lib/agent-docs.ts`, `tools/agent-docs/generator.ts`, the assistant-doc projection in `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`, plus the proof-gate logic in `services/IntentPreparationService.ts` and the apply discipline in `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`.
- What Rekon keeps: generated docs based on current artifacts; coherency and remediation state visible; verification/proof state visible; failed/partial verification is first-class evidence; docs are publications, not truth; full `inputRefs` make the publication auditable.
- What Rekon simplifies: one concise architecture summary publication; no per-system generated doc tree; no AGENTS.md overwrite; no GitHub/PR publisher; no dashboard; no command execution; no semantic verification judge; no verification sufficiency scoring; no auto-completion projection.
- What Rekon does not port yet: full classic generated architecture docs tree, assistant-doc alert projections, watch alerts, CI/check-run publication, verification sufficiency scoring, auto-completion projection, dashboard UI.
- Phase advanced: B — architecture summary v2 / proof-loop publication shipped. Phase C still holds the deeper PR/check publishers, dashboard surfaces, semantic verification judge, and verification-driven reconciliation apply.

PROOF LOOP SECTIONS ADDED
- `## Work Orders`:
  - Table header: `| Source | Goal | Paths | Systems | Selected Items |`.
  - One row per work-order flavor read (`coherency-delta` and/or `resolver`). Goal/paths/systems are truncated; `Selected Items` reports `remediationItems.length` for remediation orders and `n/a` for resolver orders.
  - Missing both flavors: "No WorkOrder found. Run `rekon intent remediation` or `rekon intent work-order`."
- `## Reconciliation Plans`:
  - Summary table header: `| Total | Artifact-only | Source-write deferred | Command deferred | Manual review | Applied | Deferred | Denied |`.
  - Up to 5 top operations table: `| Operation | Class | Status | Permission | Finding |`.
  - Operations beyond 5 are summarized as `_… N more operations_`.
  - Missing plan: "No ReconciliationPlan found. Run `rekon reconcile suggest`."
- `## Verification Status`:
  - Table header: `| Status | Passed | Failed | Skipped | Not Run | Recorded By | Recorded At |`.
  - Explicit "Verification is not complete." line when status is `failed`, `partial`, or `not-run`.
  - Explicit "VerificationResult may be stale; latest VerificationPlan differs." line when the latest result references an older plan id than the latest plan in the index.
  - Missing result: "No VerificationResult found. Run `rekon verify record` after executing a VerificationPlan."
- `## Proof Loop`:
  - Governance bullets: CoherencyDelta present/missing, active remediation items count.
  - Planning bullets: WorkOrder present/missing, ReconciliationPlan present/missing.
  - Verification bullets: VerificationPlan present/missing, VerificationResult status or missing.
  - One "Suggested next command:" line picked via priority-order logic:
    1. `rekon coherency delta` when CoherencyDelta is missing.
    2. `rekon intent remediation` when WorkOrder is missing.
    3. `rekon reconcile suggest` when ReconciliationPlan is missing.
    4. `rekon intent remediation` or `rekon intent work-order` when VerificationPlan is missing.
    5. `rekon verify record` when VerificationResult is missing.
    6. "address failures and re-run `rekon verify record`" when the latest result is failed/partial/not-run.
    7. "re-run `rekon evaluate` -> `rekon findings lifecycle` -> `rekon coherency delta` -> `rekon publish architecture`" otherwise.

VERIFICATION RESULT INTEGRATION
- The publisher reads the latest `VerificationPlan` ref directly (so it can detect stale plans) and the latest `VerificationResult` via the shared `readLatestArtifact<T>` helper (which also pushes the ref into `inputRefs`).
- When both a latest plan and a latest result exist but the result's `verificationPlanRef.id` differs from the latest plan's id, the publication emits "VerificationResult may be stale; latest VerificationPlan differs." This catches the case where an operator regenerated a `VerificationPlan` (e.g. via a new `intent work-order`) without re-recording the verification.
- The status table mirrors the `VerificationResult.summary` counts as-is (no recomputation), so the publication is a faithful echo of the recorded artifact.
- The Proof Loop's "Suggested next command:" treats `failed`, `partial`, and `not-run` all as "address failures and re-run `rekon verify record`" — partial and not-run states are not silently treated as success.
- The publisher never executes any verification command or judges sufficiency. Failed and partial results are visible verbatim.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 236 passed, 1 skipped (optional dogfood). 11 new contract tests in `tests/contract/architecture-summary-proof-loop.test.mjs` (was 225 → 236).
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages, no issues).
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each, no forbidden tokens, no `.tsbuildinfo`).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 13 artifacts emitted).
- CLI smoke against `examples/simple-js-ts`: `init`, `config validate`, `observe`, `project`, `snapshot`, `evaluate`, `findings lifecycle`, `coherency delta`, `intent work-order`, `reconcile suggest`, `verify record`, `publish architecture`, `artifacts validate`, `artifacts freshness` — every command exited 0. `artifacts validate` returned `{ valid: true, issues: [] }` after the full proof-loop flow.
- Manual smoke confirmed the rendered publication: all 14 sections present (Repository Overview, Owner Systems, Capability Map, Coherency Summary, Top Affected Paths, Remediation Queue, Work Orders, Reconciliation Plans, Verification Status, Proof Loop, Agent Guidance, Freshness, Input Artifacts) in the expected order, Verification Status shows `partial` with `Verification is not complete.`, and Proof Loop suggests "address failures and re-run `rekon verify record`".

INTENTIONALLY UNTOUCHED
- No kernel changes.
- No SDK changes.
- No new capability roles.
- No new actuator/publisher handler — the existing architecture-summary publisher just reads more artifacts.
- No new CLI commands. `rekon publish architecture` is unchanged in surface; only the publication body grew.
- No command execution. The Verification Status section reads recorded results; it does not run `npm run test` or any verification command.
- No verification sufficiency scoring or grading.
- No auto-apply on a passing verification result. Reconciliation operations stay deferred per the existing rules.
- No GitHub/CI publishers.
- No dashboard / SaaS surface.
- No source modification.
- No AGENTS.md overwrite.
- No watcher / daemon.
- No LLM evaluation of the publication content.
- No new package dependencies. Capability-docs deliberately does not import `@rekon/capability-intent` or `@rekon/capability-reconcile`; it uses local "Like" types to read the JSON.
- No schema library introduction.
- No version bump.
- No npm publish.
- No `codebase-intel-classic` imports.
- The existing `@rekon/capability-docs.publisher` and its `agents` / `repo-summary` publications are unchanged.
- The existing intent, reconcile, and verify CLI commands are unchanged.

RISKS / FOLLOW-UP
- The Work Orders section reads up to two work orders (one remediation + one resolver). A repo with many concurrent work orders only shows the latest of each flavor. A future surface could add a more general "recent work orders" listing.
- The Reconciliation Plans section caps top operations at 5 to keep the publication short. The `summary` row reflects the full plan; future refinements could add pagination if needed.
- The Verification Status "stale plan" callout fires whenever the result's plan id differs from the latest plan in the index. A result intentionally recorded against an older plan (e.g. capturing historical evidence) will still be flagged. Future work could add a "treat as current" override; not needed in this batch.
- The publisher never reads `VerificationResult.commandResults` content. Per-command pass/fail status is collapsed into the summary counts. A future surface could show a per-command table; deferred for size.
- The Proof Loop "Suggested next command:" follows strict priority order (governance -> planning -> verification). This means a partial verification on a half-built proof loop will still nudge the operator to fix the missing upstream artifact first. That is intentional; future tooling could add a "verification-only" hint when only the result is the issue.
- Local "Like" types in `capability-docs` are minimal and intentionally permissive. If the downstream `WorkOrder` / `ReconciliationPlan` / `VerificationResult` shapes diverge in non-additive ways, the publisher will render `—` for unknown fields rather than failing. Adding lightweight runtime validation here is a possible follow-up.

NEXT STEP
- Per the work order: VerificationResult-aware issue / remediation resolver. Have `resolve.issue` mention whether an associated work has pending/passed/failed verification, and let `intent remediation` skip already-verified items when explicitly requested. Still no auto-apply. This starts making verification evidence actionable without building a runner.
- Operator npm publish is still pending and unchanged by this batch.
