CHANGES MADE
- Added a third publisher handler inside `@rekon/capability-docs`:
  - id `@rekon/capability-docs.proof-report`, registered alongside the existing `@rekon/capability-docs.publisher` and `@rekon/capability-docs.architecture-summary`.
  - Consumes the latest `IntelligenceSnapshot` (optional; only used for the header subject when present), up to two `WorkOrder` artifacts (one remediation order where `source === "coherency-delta"` and one resolver order), the latest `VerificationPlan` (the minimum useful input), the latest `VerificationResult`, plus optional `CoherencyDelta`, `ReconciliationPlan`, and `FindingLifecycleReport`.
  - Emits one `Publication` artifact with `kind = "proof-report"`, `title = "Rekon Proof Report"`, and a Markdown body written to `.rekon/artifacts/publications/proof-report.md`.
- Extended package-local `PublicationArtifact.kind` enum to include `"proof-report"`. The kernel-level `Publication` artifact type is unchanged.
- Added new render helpers in `packages/capability-docs/src/index.ts`: `renderProofReport`, `pickProofReportSubject`, `buildProofReportNextActions`, and a local `escapeCell`. The existing local `WorkOrderLike` / `VerificationPlanLike` / `VerificationResultLike` / `ReconciliationPlanLike` / `RemediationItemLike` shapes are reused; `VerificationResultLike.commandResults` was tightened to a named `VerificationCommandResultLike` type so the per-command table can render `exitCode` / `notes`.
- Added a CLI friendly shortcut `rekon publish proof` which invokes `runPublish({ publisherId: "@rekon/capability-docs.proof-report" })` after `ensureSnapshotReady`. Generic `rekon publish run @rekon/capability-docs.proof-report` is equivalent. `rekon publish list` reports the new publisher id automatically.
- Added contract test file `tests/contract/proof-report-publisher.test.mjs` with 13 tests (12 always-on + 1 self-skipping import-boundary fixture test).
- New docs: `docs/artifacts/proof-report-publication.md`, `docs/concepts/proof-report-publication.md`. Updated `docs/artifacts/verification-result.md`, `docs/concepts/verification-results.md`, `docs/artifacts/architecture-summary-publication.md`, `docs/concepts/architecture-summary-publication.md`, `docs/extensions/authoring-capabilities.md`, `docs/strategy/classic-behavior-roadmap.md`, `docs/strategy/classic-alignment-map.md`, `docs/strategy/roadmap.md`, root `README.md`, and `CHANGELOG.md`.

PUBLIC API CHANGES
- New publisher handler exported from `@rekon/capability-docs`: `proofReportPublisher`. The default capability export now registers it alongside `docsPublisher` and `architectureSummaryPublisher`.
- `PublicationArtifact.kind` package-local type widened to `"agents" | "repo-summary" | "architecture-summary" | "proof-report"`.
- New CLI command `rekon publish proof [--root <path>] [--json]`.
- New publisher id appears in `rekon publish list`.
- No kernel changes. No SDK changes. No new capability roles. No artifact header shape changes. The `Publication` artifact type at the kernel level is unchanged.

PURPOSE PRESERVATION CHECK
- Original problem: agents and humans need a concise proof readout — what work was planned, what was verified, what failed, what was skipped, what still lacks evidence. Without a focused report, proof state is spread across `WorkOrder`, `VerificationPlan`, `VerificationResult`, `CoherencyDelta`, and the architecture summary.
- Classic behavior that solved it: codebase-intel-classic intent/proof flows required objective evidence with anti-gaming constraints; agent docs surfaced what an agent needed to know before claiming completion.
- Hard-fought wins preserved in this batch:
  - Verification evidence is explicit and citable: the Proof Status / Verification Results / Failed-Missing Evidence sections all source from a cited `VerificationResult`; `header.inputRefs` lists every consumed artifact; the Input Artifacts section renders the same list at the bottom of the document.
  - Failed / partial / not-run are evidence, not noise: each surfaces a distinct `> Verification is not complete.` callout, distinct table rows, and distinct Failed / Skipped / Not-run bullets in the Failed / Missing Evidence section. The Next Recommended Action text matches the status.
  - Passing checks are visible but do not auto-resolve findings: the publication renders the explicit callout `> Verification recorded as passed. This does not automatically resolve findings.` and the Next Recommended Action recommends re-running evaluate → lifecycle → coherency-delta, never declaring work complete.
  - Reports cite source artifacts: every section is derived from the artifact store; the publication is downstream and the preface says "Canonical evidence lives in VerificationResult artifacts."
  - Reports guide next action, not execute it: the Next Recommended Action bullets always describe a CLI command the operator runs, never an automatic step the publisher takes.
- Rekon-native simplifications: one focused Markdown publication; no CI/check-run integration; no command execution; no semantic correctness judgment; no status mutation; no dashboard.
- Failure modes ruled out (and how):
  - "Proof report hides failed/partial/not-run status." — Failed / partial / not-run each produce their own table row, callout, Failed / Missing Evidence bullets, and Next Recommended Action. The tests exercise each path.
  - "Proof report implies work is complete when verification is partial or missing." — Partial / not-run / missing always render `> Verification is not complete.` plus a "Complete the missing checks" or "Run `rekon verify record`" next action. The no-plan case has its own stub publication that explicitly recommends `rekon intent work-order` / `rekon intent remediation`.
  - "Proof report does not cite VerificationPlan / VerificationResult input refs." — `header.inputRefs` always includes them when present; the Input Artifacts section renders them at the bottom for human review. The contract test `proof report header.inputRefs includes VerificationPlan and VerificationResult when present` pins this.
  - "Proof report becomes a substitute for canonical artifacts." — The publication's preface explicitly says it is a publication, not canonical truth. The architecture summary publication and the underlying verification artifacts remain the canonical surfaces.
  - "Proof report tries to execute or judge commands." — The publisher only reads artifacts via `ArtifactReader`; it never executes commands, never runs the verification plan, never grades the recorded outcomes.
- Acceptance test for original purpose: given a `WorkOrder`, `VerificationPlan`, and partial/failed `VerificationResult`, `rekon publish proof` produces a Publication that visibly shows (1) work order source, (2) verification status, (3) command result counts, (4) failed / not-run commands, (5) next recommended action, (6) input artifact refs. The contract suite exercises each of these end-to-end (`proof report surfaces failed status visibly`, `proof report surfaces partial / not-run status visibly`, `proof report header.inputRefs includes VerificationPlan and VerificationResult when present`, `proof report recommends rekon verify record when no VerificationResult exists`).

CODEBASE-INTEL ALIGNMENT
- Classic capability: codebase-intel-classic intent preparation and agent guidance required proof before completion. `services/IntentPreparationService.ts`, `lib/intent-preparation/**`, `services/ContextHandler.ts`, `lib/agent-docs.ts`, `tools/agent-docs/generator.ts`, plus the apply discipline in `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`, all surfaced verification evidence so agents could not hide failed or missing checks.
- What Rekon keeps: proof state is first-class; generated publications make proof visible; failed/partial/not-run states are clear; verification evidence cites work/plan/result inputs; no confidence narrative replaces proof.
- What Rekon simplifies: publication only; no command runner; no CI/check integration; no sufficiency scoring; no automatic finding resolution; no dashboard.
- What Rekon does not port yet: full proof-gate orchestration; CI/check-run publisher; semantic proof judge; verification-driven apply; agent completion projection.
- Phase advanced: B — proof report publication shipped. Phase C still holds CI/check-run publishers, dashboards, semantic verification judge, and verification-driven reconciliation apply.

PROOF REPORT CONTENT
- The Markdown body always starts with `# Rekon Proof Report`, a `Generated: <ISO timestamp>` line, and the publications-not-truth preface.
- When a `VerificationPlan` exists, the body renders the following sections in order:
  1. **Proof Status** — `| Status | Passed | Failed | Skipped | Not Run |` row sourced from `VerificationResult.summary`. Failed / partial / not-run statuses emit `> Verification is not complete.`; passed emits `> Verification recorded as passed. This does not automatically resolve findings.` "Recorded by" / "Recorded at" appears below the table when present.
  2. **Work Order** — `| Source | Goal | Paths | Systems |` row. Source is `coherency-delta` for remediation work orders and `resolver` for resolver-based work orders. Goal / paths / systems are truncated.
  3. **Verification Plan** — `Plan id: \`<id>\`` followed by `| Command |` table of every plan command. Missing plan emits "No commands listed in the latest VerificationPlan."
  4. **Verification Results** — `| Command | Status | Exit Code | Notes |` table for every recorded `commandResult`. Missing result emits "No VerificationResult found. Run `rekon verify record` to capture proof."
  5. **Failed / Missing Evidence** — bullet list naming every `failed` and `skipped` recorded command (with notes when present) and every plan command that is missing from the recorded results or recorded with status `not-run`. When everything is green, emits "All recorded commands passed; no missing evidence."
  6. **Remediation Context** — `| Priority | Finding | Severity | Systems | Files |` table from `WorkOrder.remediationItems` (preferred) or `CoherencyDelta.remediationQueue`. Capped at 10 rows; remaining collapse to a "_… N more remediation items_" row.
  7. **Reconciliation Context** — `| Operation | Class | Status | Permission |` table from the latest `ReconciliationPlan.operations`. Capped at 10 rows.
  8. **Next Recommended Action** — status-derived bullets (see VERIFICATION RESULT INTEGRATION below).
  9. **Input Artifacts** — bullet list of every `ArtifactRef` cited in `header.inputRefs`.
- When no `VerificationPlan` exists, the body is intentionally short: it says "No VerificationPlan found. Run `rekon intent work-order` or `rekon intent remediation` first." followed by the Input Artifacts list (which is `_none_` for a freshly-initialized workspace, or just the snapshot ref if one exists). No other sections are rendered.

VERIFICATION RESULT INTEGRATION
- Status mapping (`VerificationResult.status` → callout + Next Recommended Action):
  - `passed` → `> Verification recorded as passed. This does not automatically resolve findings.` + "Re-run `rekon evaluate` -> `rekon findings lifecycle` -> `rekon coherency delta` to confirm addressed findings are no longer active." + "Re-run `rekon publish architecture` if you want the architecture summary to reflect the latest proof."
  - `failed` → `> Verification is not complete.` + "Fix the failing checks and record a new VerificationResult with `rekon verify record`." + "Do not modify tests or validators to make the gate appear green." (anti-gaming reminder kept verbatim.)
  - `partial` → `> Verification is not complete.` + "Complete the missing checks and record an updated VerificationResult with `rekon verify record`."
  - `not-run` → `> Verification is not complete.` + same as `partial`.
  - no result → "No VerificationResult found." + `> Verification is not complete. Run \`rekon verify record\` against the latest VerificationPlan.` + "Run `rekon verify record` to capture proof against the latest VerificationPlan."
  - no plan → short-form publication recommending `rekon intent work-order` / `rekon intent remediation`.
- The publisher reads `VerificationResult.summary` verbatim; it does **not** recompute counts and does **not** judge whether the operator's evidence is sufficient.
- The publisher never executes the listed commands. Recording outcomes still requires `rekon verify record` per the existing batch.
- Anti-gaming: failed commands appear in three places (Proof Status `Failed` count, Verification Results table row, Failed / Missing Evidence bullet); skipped / not-run statuses are distinct from passed; the failed Next Recommended Action explicitly tells the reader not to modify tests or validators to make the gate green.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 261 passed, 1 skipped (optional dogfood). 13 new contract tests in `tests/contract/proof-report-publisher.test.mjs`.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages, no issues).
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 13 artifacts).
- CLI smoke against `examples/simple-js-ts`: `init`, `config validate`, `observe`, `project`, `snapshot`, `evaluate`, `intent work-order`, `verify record`, `publish proof`, `publish architecture`, `artifacts validate`, `artifacts freshness` — every command exited 0; `artifacts validate` returned `{ valid: true, issues: [] }` with the new Publication in the index.
- Manual smoke confirmed end-to-end with a deliberately mixed verification (one passed, one failed, one not-run): the rendered Publication shows `| failed | 1 | 1 | 0 | 1 |`, `> Verification is not complete.`, the per-command table with `failed` + `not-run` rows, the Failed / Missing Evidence bullets naming each, and the Next Recommended Action "Fix the failing checks and record a new VerificationResult with `rekon verify record`." plus the anti-gaming reminder. `header.inputRefs` cited the IntelligenceSnapshot, WorkOrder, VerificationPlan, and VerificationResult.

INTENTIONALLY UNTOUCHED
- No kernel changes. The `Publication` artifact type at the kernel level is unchanged; the new `kind` value lives in the package-local artifact type.
- No SDK changes. No new capability roles. No new actuator/handler — only a third publisher inside the same capability.
- No new CLI commands beyond `rekon publish proof`. `publish list` / `publish run` are unchanged in surface.
- No command execution. The publisher reads artifacts only.
- No verification sufficiency scoring. The publisher reports the operator's recorded outcome verbatim.
- No automatic mutation of `FindingStatusLedger`, `FindingLifecycleReport`, or `CoherencyDelta`. Passing verification continues to not auto-resolve findings.
- No CI / GitHub / dashboard integration.
- No semantic / LLM judgment.
- No coupling to runtime internals: the publisher uses the standard `ArtifactReader` interface and does not import from `@rekon/capability-intent` or `@rekon/capability-reconcile` — local "Like" types absorb the shapes it needs.
- No version bump.
- No npm publish.
- No `codebase-intel-classic` imports.
- The existing `@rekon/capability-docs.publisher` (`agents` / `repo-summary`) and `@rekon/capability-docs.architecture-summary` (the full v2 proof-loop summary) are unchanged. Both still emit their Publications with the same shape.
- The existing `intent work-order`, `intent remediation`, `verify record`, `reconcile suggest`, and `resolve issue` CLI surfaces are unchanged.

RISKS / FOLLOW-UP
- The Remediation Context section reads `WorkOrder.remediationItems` first, then falls back to `CoherencyDelta.remediationQueue`. If the latest remediation work order is older than the latest coherency delta, the publication may show stale items relative to the freshest queue. The architecture summary's "VerificationResult may be stale" pattern could be ported here, but in practice the architecture summary already surfaces that mismatch and freshness marks the publication stale automatically; deferring.
- The publication caps Remediation Context and Reconciliation Context at 10 rows. Larger queues collapse the remainder; the architecture summary and the underlying artifacts remain the full surface.
- The publisher does not currently mention which finding ids have passing verification (via the new `lookupVerificationEvidence` helper). A future iteration could add a "Verified Findings" section, but it overlaps with `resolve.issue` and `intent remediation --skip-verified`; deferring to keep the proof report focused on the latest plan/result rather than per-finding chains.
- The publisher does not synthesize a snapshot or any other missing input; the CLI calls `ensureSnapshotReady` first to match the existing publish flow. If an operator calls `publish run @rekon/capability-docs.proof-report` via the generic path without a snapshot, the publisher will still write a publication using the WorkOrder / VerificationPlan header subject as a fallback.
- The publication renders `Recorded by ${recordedBy ?? "—"} at ${recordedAt ?? "—"}.` when either field is present. If a future client records a `VerificationResult` with neither, the publication will still render the row but with em-dashes; that's intentional and visible.

NEXT STEP
- Per the work order: memory ranking / curation v1. Preserve classic operator-feedback wins; make memory selection scope-aware and verification-aware; feed resolver packets and publications. Moves to another underdeveloped classic subsystem while keeping the proof loop visible.
- Operator npm publish is still pending and unchanged by this batch.
