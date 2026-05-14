CHANGES MADE
- Added a new `rekon refresh` CLI command that orchestrates the full Rekon lifecycle in the documented order: `init` (heals only a missing config — never overwrites a malformed existing config) → `config.validate` → `observe` → `project` → `snapshot` → `evaluate` → `findings.lifecycle` → `coherency.delta` → `publish.architecture` → `artifacts.validate` → `artifacts.freshness`.
- Implemented a package-local `runRefresh(root: string, options: RefreshOptions)` helper in `packages/cli/src/index.ts` that returns a structured `RefreshResult` with `root`, `startedAt`, `completedAt`, top-level `status` (`passed` / `failed` / `partial`), an ordered `steps: RefreshStep[]` array (one entry per phase with `status`, optional `artifacts`, `summary`, `issues`, and `message`), a `validation` block, a `freshness` block, an `artifacts` aggregate, and a `missing` array naming any required artifact families the run did not produce.
- Implemented a **latest-major freshness** interpretation: the validator runs unchanged, but the refresh's verdict is computed from the latest artifact of each major type (`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `IntelligenceSnapshot`, `FindingReport`, `FindingLifecycleReport`, `CoherencyDelta`, `Publication`). For each latest-major entry, `newer-input-exists` issues are filtered out — those are about historical sibling references (`buildFindingLifecycleReport` intentionally cites every prior `FindingReport`). A second back-to-back refresh therefore reports `passed` even though the artifact store retains earlier artifacts.
- Added two opt-in skip flags. `--skip-publish` skips the `publish.architecture` step, records it as `status: "skipped"` in `steps`, and excludes `Publication` from the latest-major check. `--skip-freshness` skips the final freshness step and records it as `status: "skipped"`. Lifecycle steps are never silently skipped; the operator must pass an explicit flag.
- Failure semantics: any failed step stops the run, the step's `message` is preserved, and the CLI exits non-zero with `status: "failed"`. Required-artifact-family check after a successful run produces `status: "partial"` and names the missing types in `result.missing`.
- Added `@rekon/kernel-artifacts` as a direct dep of `@rekon/cli` plus the matching tsconfig project reference so the new helper can import the `ArtifactRef` type cleanly.
- Added `tests/contract/refresh-command.test.mjs` with 11 tests (10 always-on + 1 self-skipping import-boundary fixture test).
- New docs: `docs/concepts/refresh.md` explains why the command exists (preserves the classic `FullScanHandler` workflow guarantee), the section-by-section semantics, the latest-major freshness rule, failure behavior, when to use it, and what it explicitly is not.
- Updated `docs/strategy/classic-guarantees-audit.md` (subsystem 1 "Full Scan / Refresh Orchestration" now marks the guarantee preserved and references the shipped tests), `docs/strategy/classic-guarantee-regression-plan.md` (P0.1 marked closed with the shipped regression test), `docs/strategy/classic-subsystem-purpose-map.md` (priority column for row 1 reads "P0 preserved"; gap and next-slice updated), `docs/strategy/classic-behavior-roadmap.md` (Phase B P0.1 closure entry added), `docs/strategy/roadmap.md` (alpha-spine note covering the new command), the root `README.md` (First 10 Minutes now uses `rekon refresh`), `AGENTS.md` (recommends `rekon refresh` for agents that need a coherent state), and `CHANGELOG.md`.

PUBLIC API CHANGES
- New CLI command `rekon refresh [--root <path>] [--skip-publish] [--skip-freshness] [--changed-file <path>] [--json]`.
- Output is a `RefreshResult` JSON object when `--json` is set; no new artifact type is introduced — the result is plain JSON, not a `Publication`.
- New direct dependency `@rekon/kernel-artifacts` for `@rekon/cli` (already a transitive dep). No version bump.
- No new exports from any built-in capability. No new artifact types. No kernel changes. No SDK changes. No new capability roles. No artifact header shape changes.

PURPOSE PRESERVATION CHECK
- Original problem: multi-phase intelligence pipelines accumulate partial-state failures when operators forget phases. Per-verb CLI surfaces compose well but compose silently wrong; freshness flags the mismatch only retroactively, after a stale publication has already been read.
- Classic workflow guarantee: `FullScanHandler.run(...)` ran the full phased pipeline (`services/FullScanHandler.ts`, 574 lines) and left the repo in a coherent, regenerated intelligence state: every phase ran in order, every downstream consumer saw a fresh upstream, per-phase checkpoints made partial failures inspectable, cache discipline ensured stale outputs were rebuilt.
- Classic shape that provided the guarantee: `services/FullScanHandler.ts` plus `services/AnalysisService.ts`, `services/GraphBuildProvider.ts`, `services/RuleCompilationHandler.ts`, the per-phase checkpoint writer, and the cache lifecycle in `lib/cache/**`.
- Rekon equivalent guarantee: `rekon refresh` runs the Rekon-native lifecycle (`observe` → `project` → `snapshot` → `evaluate` → `findings.lifecycle` → `coherency.delta` → `publish.architecture` → `artifacts.validate` → `artifacts.freshness`) in order, stops on the first failure, and reports a per-step verdict. The result is a coherent latest-major state: every newest artifact of each required type resolves to `fresh` (with historical `newer-input-exists` issues filtered) and `artifacts.validate` returns `{ valid: true, issues: [] }`.
- What would mean we failed (and why this batch does not):
  - "refresh is just a thin alias and does not guarantee order." — The steps run in a fixed sequence; the test `rekon refresh runs steps in the documented order` pins it.
  - "It leaves missing lifecycle/coherency/publication artifacts without reporting it." — After the producing steps run, the helper lists `EvidenceGraph` / `ObservedRepo` / `OwnershipMap` / `CapabilityMap` / `IntelligenceSnapshot` / `FindingReport` / `FindingLifecycleReport` / `CoherencyDelta` / `Publication(architecture-summary)` and populates `result.missing` if any required family is absent. The `partial` status surfaces the gap.
  - "It hides failed validation/freshness." — The `artifacts.validate` step sets `status: "failed"` when `valid: false`; the freshness step sets `status: "failed"` when any latest-major artifact has non-historical issues. Both produce a non-zero exit code.
  - "It writes a publication from stale or incomplete inputs without warning." — Publication runs only after `coherency.delta` and consumes the artifacts produced earlier in the same refresh. If any prior step failed, the refresh stops before publishing.
  - "Users still need to know the full internal phase order to get a coherent state." — A single command runs the full chain; per-verb CLI remains for incremental flows but is no longer required for "I want a coherent state."
- Regression test for the original problem: `tests/contract/refresh-command.test.mjs` shipping with this batch. The principal test (`rekon refresh on a clean fixture creates expected artifact families and passes`) runs the command on a clean fixture and asserts every required artifact type is in the result, the validation block reports `{ valid: true, issues: [] }`, every latest-major artifact is `fresh`, and at least one `Publication` exists in the store. The supporting tests pin step order, the malformed-config failure path, both skip flags, the repeat-run / historical-stale scenario, that producing steps record refs, that existing commands still work after refresh, and that the import-boundary fixture surfaces active findings via the rebuilt architecture summary.

CODEBASE-INTEL ALIGNMENT
- Classic capability: full-scan / refresh orchestration.
- Relevant classic files/systems: `services/FullScanHandler.ts`, `services/AnalysisService.ts`, `services/IssueDetectionService.ts`, `services/GraphBuildProvider.ts`, `services/ContextHandler.ts`, `services/RuleCompilationHandler.ts`, `services/InvariantsCompilationHandler.ts`. Strategy anchors: `docs/strategy/classic-guarantees-audit.md`, `docs/strategy/classic-guarantee-regression-plan.md`, `docs/strategy/classic-subsystem-purpose-map.md`.
- What Rekon keeps: correct lifecycle sequencing; coherent final artifact state; validation at the end; freshness check at the end; one-command UX; explicit per-step report of what ran and what was produced; no hidden source writes.
- What Rekon simplifies: no cache clearing (the artifact store keeps history and the latest-major rule judges current state); no invariant compilation (`@rekon/kernel-rulebook` does not require a compile step today); no embeddings; no LLM analysis; no graph-health enforcement beyond `artifacts.validate` + `artifacts.freshness`; no per-phase checkpoint artifacts (the structured `RefreshResult` is the report); no watcher/daemon; no automatic source changes.
- What Rekon does not port yet: the full classic scan / cache / checkpoint system; taxonomy discovery; embeddings; deep directory analysis; full graph-health enforcement; compiled invariants; semantic issue review; watch-mode scan lifecycle. These are flagged in the audit (subsystems 3, 4, 5, 6, 13).
- How this advances migration: closes P0.1 from the Classic Guarantees Audit. Gives agents and users a single trustworthy command before consuming publications or resolvers. Sets the precedent that orchestration commands are first-class and explicitly preserve a classic guarantee.

REFRESH LIFECYCLE
- Eleven steps in fixed order:
  1. `init` — `.rekon/` directory; default config only when missing.
  2. `config.validate` — reuses `validateConfig`. Failure aborts the run before observe.
  3. `observe` — `runtime.runObserve({ changedFiles?, incremental })`.
  4. `project` — `runtime.runProject()`.
  5. `snapshot` — `runtime.runSnapshot()`.
  6. `evaluate` — `runtime.runEvaluate()`.
  7. `findings.lifecycle` — `buildFindingLifecycleReport(store)` + write.
  8. `coherency.delta` — `buildCoherencyDelta(store)` + write.
  9. `publish.architecture` — `runtime.runPublish({ publisherId: "@rekon/capability-docs.architecture-summary" })`. Skipped when `--skip-publish` is set.
  10. `artifacts.validate` — `validateArtifactIndex(store)`.
  11. `artifacts.freshness` — `validateArtifactFreshness(store)` + latest-major interpretation. Skipped when `--skip-freshness` is set.
- Each producing step records its artifact refs in `RefreshStep.artifacts`; the consolidated `RefreshResult.artifacts` deduplicates across steps.

COHERENCE GUARANTEE
- "Coherent" means: every required artifact family is present (`result.missing.length === 0`); `artifacts.validate` returns `{ valid: true, issues: [] }`; every latest-major artifact resolves to `fresh` after filtering historical `newer-input-exists` issues. When all three hold, `RefreshResult.status === "passed"`.
- The status ladder is explicit: `failed` if any step or validation fails or if any latest-major is non-fresh; `partial` if every step passed but a required artifact family is missing; `passed` otherwise.
- Failure aborts the run rather than pretending the state is coherent. The CLI exits non-zero in `failed`.

LATEST-MAJOR FRESHNESS POLICY
- The artifact store retains history; every `evaluate` / `findings lifecycle` / `coherency delta` / publish call writes a new artifact rather than overwriting the prior one. The freshness validator's `newer-input-exists` issue is correct for individual older artifacts in that history, but it does not match what we mean by "the repo's current intelligence state is coherent."
- The refresh applies the **latest-major** filter: for each entry of the major-type set (`EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, `IntelligenceSnapshot`, `FindingReport`, `FindingLifecycleReport`, `CoherencyDelta`, `Publication`), it picks the latest entry by id-desc and ignores `newer-input-exists` issues. Non-historical issues (e.g. "missing input", "broken digest", or freshness codes other than `newer-input-exists`) still mark the entry non-fresh.
- This matches the work order's "Option A" guidance and explicitly addresses the previously-observed scenario where a second back-to-back refresh would otherwise report `stale` purely because of historical sibling references intentionally kept by `buildFindingLifecycleReport`.
- When `--skip-publish` is set, `Publication` is excluded from the latest-major set so an intentionally unrefreshed publication does not flip the verdict.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 292 passed, 1 skipped (optional dogfood). 11 new contract tests in `tests/contract/refresh-command.test.mjs`. Was 281 → 292 (+11).
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages, no issues).
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 13 artifacts).
- CLI smoke against `examples/simple-js-ts`: `rekon refresh --root <fixture> --json` returns `status: "passed"`, all 11 steps `passed`, `validation: { valid: true, issues: [] }`, every latest-major artifact `fresh`. `rekon artifacts validate --root <fixture> --json` confirms `valid: true` independently. `rekon artifacts freshness --root <fixture> --json` exits 0 even though aggregate status may legitimately be `stale` for historical sibling references (latest-major check correctly filters those).
- Manual smoke confirmed: a second back-to-back `rekon refresh` still returns `status: "passed"`; `--skip-publish` records the skipped step, writes no new Publication, and leaves the verdict `passed`; `--skip-freshness` skips the freshness step and still reports validation; malformed `.rekon/config.json` fails before `observe` runs.

INTENTIONALLY UNTOUCHED
- No kernel changes. No SDK changes. No new capability roles. No new actuator / publisher / resolver / learner handlers. No artifact header shape changes. No new artifact types — the refresh result is plain JSON.
- No watcher / daemon / file-system event loop / live invalidation.
- No verification command execution. `rekon refresh` does not run any `VerificationPlan` commands; `rekon verify record` remains the only path to capture proof.
- No reconciliation invocation. `rekon refresh` does not run `intent remediation`, `reconcile suggest`, `publish proof`, or anything in the proof-loop chain. Those remain explicit operator choices.
- No source writes. `rekon refresh` writes only into `.rekon/`.
- No per-phase checkpoint artifacts — the structured `RefreshResult` is the report. Classic's per-phase `recordCheckpoint` writes are not ported; the artifact store + `inputRefs` cover the same audit trail.
- No new built-in capability. The CLI helper composes existing runtime helpers (`runObserve`, `runProject`, `runSnapshot`, `runEvaluate`, `runPublish`, `buildFindingLifecycleReport`, `buildCoherencyDelta`, `validateArtifactIndex`, `validateArtifactFreshness`).
- No coupling to runtime internals beyond what existing per-verb handlers already use. `runRefresh` reads / writes through the standard `createLocalArtifactStore` + `createDefaultRuntime` paths.
- No version bump. No npm publish.
- No `codebase-intel-classic` imports.
- Existing per-phase CLI verbs are unchanged. Existing `rekon publish architecture`, `rekon publish proof`, `rekon intent remediation`, `rekon reconcile suggest`, `rekon verify record`, and `rekon resolve` commands all behave identically.

RISKS / FOLLOW-UP
- `init` deliberately stops short of overwriting a malformed existing config. That is the right call for `rekon refresh` (config errors should surface), but means an operator who wants to repair a broken config must delete `.rekon/config.json` and re-run `rekon init`, or fix the file manually. Documented in `docs/concepts/refresh.md`.
- The latest-major freshness filter currently treats *all* `newer-input-exists` issues on a latest-major artifact as historical. This is correct for the current Rekon producers (which deliberately cite history), but a future producer that mistakenly cites the wrong input would also be filtered. The non-historical issue codes (`missing-input`, `broken-digest`, future codes) are still enforced; the filter is conservative enough for current behavior.
- The required-artifact-family check uses a hard-coded list (`REQUIRED_REFRESH_ARTIFACT_TYPES`). A future evaluator that legitimately produces zero `FindingReport` artifacts would surface as `status: "partial"`. The current built-in evaluators always emit at least an empty report; the import-boundary fixture confirms a non-empty case works too. If this becomes friction, future work could derive the required-set from the registered capability roles dynamically.
- The `--changed-file` flag passes through to `observe` with `incremental: true`. For users running an incremental refresh, the projection and snapshot steps still re-derive across the full evidence graph — this is consistent with the existing per-verb CLI. Future work could thread incremental hints further if needed.
- The structured `RefreshResult` is *not* an artifact today. If future PR/check publishers need to consume the refresh report directly, the natural follow-up is to write a `RefreshLog` artifact alongside the existing per-phase outputs. Deferred.
- The implementation lives entirely in the CLI package. If a runtime consumer ever needs to invoke the refresh programmatically (e.g. from a future watcher), exporting `runRefresh` from `@rekon/runtime` is the obvious next step.

NEXT STEP
- Per the work order: memory ranking / curation v1. Preserve the classic operator-feedback guarantees (scoped recall; reliability/freshness/specificity scoring; verification-aware guidance; memory that improves context without becoming prompt sludge). Frame the work explicitly as preserving the classic memory-quality guarantee, not just adding "more memory."
- Operator npm publish is still pending and unchanged by this batch.
