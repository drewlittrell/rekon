CHANGES MADE
- Added three new strategy docs that treat each classic subsystem as a problem-solution artifact:
  - `docs/strategy/classic-guarantees-audit.md` — full per-subsystem audit covering 15 major classic subsystems. Each entry follows the required structure: Original problem / Classic workflow guarantee / Classic shape that provided the guarantee / What Rekon already preserves / What Rekon may be discounting / Current gap / Rekon equivalent guarantee / Regression test needed / Priority / Next implementation slice.
  - `docs/strategy/classic-guarantee-regression-plan.md` — operational test plan with 7 P0, 6 P1, and 5 P2 guarantees. Each entry pairs the guarantee with the classic source, current Rekon coverage, missing coverage, a concrete proposed regression test, and the implementation batch that should ship the test.
  - `docs/strategy/classic-subsystem-purpose-map.md` — quick-reference table (15 rows × 7 columns) that future builders consult first.
- Updated `AGENTS.md`: completion summary now requires a `PURPOSE PRESERVATION CHECK` section for any major capability / resolver / publisher / actuator / memory / freshness / issue / orchestration work, with explicit fields (Original problem, Classic workflow guarantee, Classic shape that provided the guarantee, Rekon equivalent guarantee, What would mean we failed, Regression test for the original problem). The existing `CODEBASE-INTEL ALIGNMENT` requirement is preserved alongside the new check. Added the explicit rule: "Do not call classic orchestration 'weight' unless the work order identifies which guarantee is preserved elsewhere." Cross-linked the three new audit docs.
- Updated `CONTRIBUTING.md` with a new "Preserving Classic Workflow Guarantees" section. Contributors who migrate or reinterpret a classic subsystem must identify the original problem and workflow guarantee; "a contribution that recreates a feature but loses the guarantee is incomplete." Cross-linked the audit triple.
- Updated `docs/strategy/north-star.md` Future Direction section to cite the new audit docs and the coupling-vs-guarantee distinction.
- Updated `docs/strategy/classic-refactor-principles.md` with a new rule "Preserve The Workflow Guarantee, Not Just The Feature" and the orchestration-weight clause.
- Updated `docs/strategy/classic-behavior-distillation.md` cross-references to include the three new docs.
- Updated `docs/strategy/classic-wins.md` cross-references to include the three new docs.
- Updated `docs/strategy/classic-behavior-roadmap.md` to record the audit as a shipped Phase B item and to point at the audit triple in the doc header.
- Updated `docs/strategy/roadmap.md` to call out that implementation slices must preserve the audit's workflow guarantees.
- Added `tests/docs/classic-guarantees-audit.test.mjs` (20 tests) asserting: each of the three new docs exists; the audit doc contains all 15 subsystem headings, "Classic workflow guarantee", "What Rekon may be discounting", "Regression test needed", and the implementation-coupling-vs-guarantee distinction; the regression plan contains P0 / P1 / P2 sections and every required P0 / P1 / P2 guarantee title; the purpose map contains the seven required columns; `AGENTS.md` contains the `PURPOSE PRESERVATION CHECK` requirement, the orchestration-weight rule, and the audit cross-references; `CONTRIBUTING.md` contains the migrated-subsystem guarantee requirement and the audit cross-references; `classic-refactor-principles.md` carries the new workflow-guarantee rule; `classic-behavior-roadmap.md` marks the audit as shipped.
- Updated `CHANGELOG.md` with a dedicated entry naming every new and updated doc, the new tests, and the no-runtime-change scope.

PUBLIC API CHANGES
- None. This is a docs / tests batch.
- No new exports, no new CLI commands, no new artifact types, no new capabilities.
- No kernel changes. No SDK changes. No runtime changes. No CLI changes.

WHY THIS AUDIT EXISTS
- `codebase-intel-classic` is not "messy old code" to replace. It is a hard-fought reference implementation whose shape encodes workflow guarantees.
- Past batches sometimes called classic shape "weight" without identifying which guarantee was preserved elsewhere. That risks recreating features but losing the workflow guarantees those features encoded.
- This audit makes the load-bearing distinction explicit: implementation coupling may be simplified, workflow guarantees must be preserved or explicitly deferred. Every major future batch must include a `PURPOSE PRESERVATION CHECK` section anchored in the audit; AGENTS.md and CONTRIBUTING.md now require it.

SUBSYSTEMS COVERED
- All 15 from the work order:
  1. Full scan / refresh orchestration (`services/FullScanHandler.ts`).
  2. Evidence and repo observation (`replatform-observe.ts`, language packs).
  3. Deterministic + semantic analysis (`DeterministicHybridPipeline.ts`).
  4. Graph intelligence (`GraphBuildProvider.ts`).
  5. Rule engine / compiled invariants (`RulesResolver.ts`, `RuleCompilationHandler.ts`).
  6. Issue detection and adjudication (`IssueDetectionService.ts`, `mergeIssues.ts`).
  7. Coherency delta and remediation roll-up (`replatform-delta.ts`).
  8. Resolver / context / preflight (`lib/context/resolver.ts`, `services/ContextHandler.ts`).
  9. Generated docs / agent docs (`ArchitectureDocsHandler.ts`, `lib/agent-docs.ts`).
  10. Operator feedback and memory (`lib/operator-feedback.ts`, `lib/memory/**`).
  11. Intent preparation / proof gates (`IntentPreparationService.ts`).
  12. Reconciliation / deterministic operations (`PlanExecutorService.ts`).
  13. Watcher / freshness / live context trust (`WatchHandler.ts`).
  14. GitHub / CI / PR surfaces (`commands/saas.ts`, classic check publishers).
  15. SaaS / dashboard surfaces (`packages/product-codebase-intel/src/saas/**`).
- Each entry includes a concrete "Regression test needed" line tied to the corresponding entry in the regression plan.

P0 GUARANTEES IDENTIFIED
1. **One command can produce a coherent repo-intelligence state** — gap: no single command orchestrates the full loop today. Next slice: `rekon refresh`.
2. **Findings preserve lifecycle and status across runs** — preserved per-pack; cross-pack dedupe is P1.1.
3. **Resolver / preflight can explain ownership and next steps** — preserved; structural "every resolver has a non-empty trace" test is optional.
4. **Publications cite inputs and do not become canonical truth** — preserved; structural `inputRefs.length > 0` test optional.
5. **Work orders require proof and anti-gaming guardrails** — preserved at the artifact level; the verification plan shrink-detection test is the deeper regression to add.
6. **Reconciliation suggestions do not silently source-write** — preserved at the current scope; source-write apply is P2.1.
7. **Freshness distinguishes valid from current** — preserved; per-artifact-type newer-input tests are the ongoing pattern.

WHAT REKON MAY BE DISCOUNTING
- `FullScanHandler` looked like heavy orchestration; the per-phase checkpoint writer was actually a workflow guarantee ("every phase ran in order, here is the evidence trail"). Rekon currently relies on the operator to remember the full chain; freshness catches partial state only retroactively.
- `IssueDetectionService` (568 lines) wasn't just a detector — it was adjudication. Cross-pack dedupe, false-positive scoring, and ownership hydration are partial today.
- 1823 lines of `IntentPreparationService` weren't arbitrary weight: phase parsing, actionability assessment, gate-quality classifier, elicitation, parallel work-unit scheduling are real anti-gaming infrastructure. Rekon ports the artifact shape but not yet the adjudication logic.
- Classic memory was a quality-managed knowledge base, not a notes layer. Reliability / freshness / specificity ranking and curation/promotion to rulebook entries are absent at classic depth.
- Classic agent docs were an operating contract — required checks, ownership policy, anti-gaming rules — in a medium agents actually read. Rekon's `agents` publication is a summary, not yet an operating contract.
- Classic watcher was trust infrastructure, not a daemon feature: agents could trust the freshness signal. Rekon has lineage freshness; path/event freshness is the gap.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 281 passed, 1 skipped (optional dogfood). 20 new tests in `tests/docs/classic-guarantees-audit.test.mjs` (was 261 → 281).
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19 packages, no issues).
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each, no `.tsbuildinfo`).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 13 artifacts).
- No CLI smoke required for this docs-only batch; the existing CLI smoke chains continue to pass per the prior batch's coverage.

INTENTIONALLY UNTOUCHED
- No runtime behavior changes. No SDK / kernel / capability / actuator / publisher / resolver changes. No new CLI commands. No artifact shape changes. No invalidation rule changes. No package dependency changes.
- No version bump. No npm publish.
- No `codebase-intel-classic` imports (the classic source tree was consulted locally to confirm subsystem file paths and line counts; nothing was copied).
- Existing strategy docs are extended, not weakened. The earlier `CODEBASE-INTEL ALIGNMENT` requirement is preserved.
- The existing `agents`, `architecture-summary`, and `proof-report` publishers are unchanged.

RISKS / FOLLOW-UP
- The audit doc deliberately leans toward thoroughness over brevity. The regression plan and purpose map are the operational tools; future builders should read the purpose map first and only drop into the audit for the relevant subsystem entry.
- "What Rekon may be discounting" sections are the section most likely to age. As batches close gaps, those sections should be edited rather than allowed to drift. Future batches that close a gap should update both the audit entry and the regression plan entry.
- The P0 / P1 / P2 priority assignments reflect the current alpha context. They will move as scope changes (e.g. when the first external rule pack ships, cross-pack dedupe becomes higher priority).
- The proposed regression tests are intentionally concrete but un-implemented. They are the contract for the next implementation slice; each test should land with the batch that closes the gap.

NEXT STEP
- Per the work order: implement `rekon refresh` as the first P0 close. It preserves the classic `FullScanHandler` guarantee that one command can produce a coherent repo-intelligence state. The batch should ship the regression test from P0.1 (a clean `rekon refresh` run leaves zero `stale` artifacts and `{ valid: true, issues: [] }` from `rekon artifacts validate`) and frame the work explicitly as preserving the classic guarantee, not adding a convenience command.
- Operator npm publish is still pending and unchanged by this batch.
