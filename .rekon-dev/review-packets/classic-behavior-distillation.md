CHANGES MADE
- Added six new strategy docs under `docs/strategy/` that distill `codebase-intel-classic` behavior into durable Rekon-native form without copying classic file structure or service shape:
  - `classic-behavior-distillation.md` — twelve behavior cards (evidence/observation; deterministic+LLM analysis; graph intelligence; rule engine and governance; issue detection and coherency delta; resolver/preflight; publications; operator feedback/memory; intent/work orders; reconciliation; watcher/freshness; GitHub/SaaS surfaces) using a fixed card shape (classic capability, source areas, goal, what is good, what is accidental, Rekon reinterpretation, keep/simplify/defer/do not port, migration path).
  - `classic-wins.md` — thirteen durable principles (evidence before opinion; deterministic before semantic; provenance on every claim; docs are publications, not truth; rules executable not prose; issues as governance artifacts; graphs reveal relationships; resolver output should explain itself; memory scoped/verified/fresh; agent proof gates; deterministic reconciliation; explicit freshness; declared capability contracts) each tied to classic source and Rekon expression.
  - `classic-to-rekon-translation.md` — translation patterns plus five worked examples (rule evaluator entry → Rekon evaluator capability; graph build provider producer → Rekon `GraphSlice` projector; ContextHandler output → resolver + publisher; operator feedback entry → memory learner; PlanExecutor deterministic operation → reconciliation actuator).
  - `classic-refactor-principles.md` — ten rules for porting (preserve goal not file structure; preserve artifact contract not cache location; preserve evaluator semantics not registry sprawl; preserve graph relationships not graph-builder coupling; preserve resolver phases not old CLI branching; preserve memory ranking principles not curation heuristics; preserve anti-gaming gates not phase-prep details; preserve deterministic reconciliation not auto-apply breadth; port only when consumes/produces/permissions/provenance are clear; pause and define missing substrate first when behavior cannot be expressed as a Rekon capability/artifact).
  - `classic-behavior-roadmap.md` — phased plan (Phase A already represented; Phase B next distillations: rule pack examples, import governance, freshness engine, issue lifecycle, graph slice expansion, route/seam/issue resolvers, architecture summary publisher; Phase C later maturity: semantic augmentation, full rulebook compilation, memory promotion, intent phase preparation, deterministic source-write reconciliation, watcher, GitHub/CI publishers; Phase D deferred surfaces: dashboard, SaaS, marketplace).
  - `classic-alignment-map.md` — quick-lookup table mapping every classic behavior family to Rekon role(s), artifact(s), package(s), and phase.
- Updated `docs/strategy/north-star.md` and `docs/strategy/roadmap.md` to cross-link the new distillation docs.
- Updated `AGENTS.md` to require a `CODEBASE-INTEL ALIGNMENT` section in major capability work and to require new capabilities to distill or generalize classic behavior unless explicitly marked experimental.
- Updated `CONTRIBUTING.md` to require contributors to read the classic behavior docs before proposing migrated capabilities, and to require the proposal to identify what is good, what is accidental, and how Rekon will preserve the win.
- Added `tests/docs/classic-behavior-distillation.test.mjs` enforcing the structure of every new doc and the `AGENTS.md` / `CONTRIBUTING.md` updates.
- Updated `CHANGELOG.md`.

PUBLIC API CHANGES
- None. Docs/strategy/test-only batch. No kernel, SDK, runtime, CLI, capability, or artifact behavior changes.

CODEBASE-INTEL ALIGNMENT
- This batch is the canonical Codebase-Intel Alignment artifact for Rekon. It does not port classic behavior; it captures the wins, separates them from accidental implementation shape, and routes future Rekon work through a shared distillation.
- Classic source inspected: `services/AnalysisService.ts`, `services/ContextHandler.ts`, `services/IssueDetectionService.ts`, `services/GraphBuildProvider.ts`, `services/WatchHandler.ts`, `services/IntentPreparationService.ts`, `services/analysis/DeterministicHybridPipeline.ts`, `lib/operator-feedback.ts`, `lib/context/resolver.ts`, `packages/product-codebase-intel/src/replatform/replatform-observe.ts`, `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`, `domain/issues/RulesResolver.ts`, `domain/issues/evaluators/**`, `domain/graph/producers/**`.
- The classic checkout was available at `~/Code/codebase-intel`. Each behavior card and translation example cites specific classic source files so future ports can verify alignment.
- What Rekon keeps from classic: the thirteen wins listed in `classic-wins.md`.
- What Rekon simplifies: the cross-cutting analysis service, central rule evaluator registry, central graph build provider, mixed-responsibility context handler, watcher daemon embedded in service handlers, cache-path coupling, embedding/taxonomy plumbing.
- What Rekon does not port yet: semantic augmentation (Phase C), compiled YAML invariants (Phase C), memory promotion engine (Phase C), intent phase preparation (Phase C), source-writing reconciliation (Phase C), watcher daemon (Phase C), GitHub/CI surfaces (Phase C-D), SaaS/dashboard/marketplace (Phase D).
- How this advances migration: by anchoring every subsequent batch in a shared, written distillation, the next implementation work (e.g., the import-boundary rule pack) can start with a precise alignment section instead of re-deriving what classic was trying to do.

CLASSIC BEHAVIORS COVERED
- Evidence and repo observation (`replatform-observe`, language/repo packs, AnalysisService).
- Deterministic + LLM hybrid analysis (DeterministicHybridPipeline, assessDeterministicViability).
- Graph intelligence (GraphBuildProvider + per-relationship producers).
- Rule engine and governance (RulesResolver, RULE_EVALUATORS, RuleCompilationHandler).
- Issue detection and coherency delta (IssueDetectionService, replatform-delta, mergeIssues).
- Resolver and preflight context (lib/context/resolver, ContextHandler).
- Publications and generated docs (ArchitectureDocsHandler, agent-docs).
- Operator feedback and memory (lib/operator-feedback, memory-kind-taxonomy).
- Intent and work orders (IntentPreparationService, packages/.../intent).
- Reconciliation (PlanExecutorService, packages/.../reconcile).
- Watcher and freshness (WatchHandler, context-freshness, watcher-lifecycle).
- GitHub / SaaS / surfaces (commands/saas, packages/.../saas, GitHub governance payloads).

CLASSIC WINS PRESERVED
- Evidence before opinion.
- Deterministic before semantic.
- Provenance on every claim.
- Docs are publications, not truth.
- Rules executable, not prose.
- Issues as governance artifacts.
- Graphs reveal relationships.
- Resolver output explains itself.
- Memory scoped, verified, fresh.
- Agent proof gates.
- Reconciliation deterministic-first.
- Freshness explicit.
- Capabilities declare inputs/outputs/permissions/invalidation.

REKON REINTERPRETATION SUMMARY
- Repo observation → `evidence-provider` + `projector` capabilities → `EvidenceGraph`, `ObservedRepo`, `OwnershipMap`, `CapabilityMap`.
- Deterministic + LLM analysis → deterministic `evidence-provider` today; future opt-in `semantic-provider` with `network:outbound` permission and model/inputs in provenance.
- Graph intelligence → per-relationship `projector` capabilities producing `GraphSlice`.
- Rule engine and governance → `evaluator` capabilities (built-in + community packs) consuming `Rulebook` and producing `FindingReport`.
- Issue detection / coherency delta → `evaluator` today; future `projector`s for `CoherencyDelta` / `HealthProjection` / `RemediationPlan`.
- Resolver / preflight → `resolver` capabilities producing `ResolverPacket` with `resolutionTrace`; phases (preflight, route, seam, issue) become resolver handlers, not CLI branches.
- Publications → `publisher` capabilities producing `Publication`; one publisher per surface.
- Operator feedback / memory → `learner` capability producing `OperatorFeedbackEntry`, `MemoryEvent`, `MemorySelection`; promotion to `Rulebook` is a permissioned actuator step.
- Intent / work orders → today's `@rekon/capability-intent` actuator with future anti-gaming gate evidence and phase preparation.
- Reconciliation → `actuator` capability producing `ReconciliationPlan` and `ReconciliationLog`; source writes opt-in per operation behind `write:source`.
- Watcher / freshness → runtime lifecycle / freshness engine consuming capability `invalidatedBy` rules; future `WatcherProof` artifacts.
- GitHub / SaaS / surfaces → out of substrate scope; future `publisher` capabilities consume `@rekon/*` published packages.

WHAT WAS INTENTIONALLY NOT PORTED
- Any classic code. This is a distillation pass, not a port pass.
- The central `RULE_EVALUATORS` registry; the SDK + capability runtime replaces it.
- The central `GraphBuildProvider`; per-relationship Rekon projectors replace it.
- The mixed-responsibility `ContextHandler`; resolver + publisher are separate Rekon roles.
- `.codebase-intel/cache/**` paths; the Rekon artifact store replaces them.
- The hosted SaaS surface; surfaces consume `@rekon/*` as a dependency.
- LLM prompt/tier/embedding orchestration; future semantic augmentation requires explicit permission and provenance.
- Migration-plan-specific phase preparation; the anti-gaming gate concept is preserved without the plan-specific pipeline.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 120 passed, 1 skipped optional dogfood. 9 new docs tests for the classic-behavior distillation (all six new docs exist, every behavior family appears in distillation/alignment map, every principle appears in wins, every required translation example appears, every refactor rule appears, roadmap has phases A–D, AGENTS.md requires `CODEBASE-INTEL ALIGNMENT`, CONTRIBUTING.md links every classic doc).
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed.
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 files each, no `.tsbuildinfo`).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed.
- No CLI smoke beyond standard scripts because this is a docs/strategy batch with no runtime changes.

RISKS / FOLLOW-UP
- The distillation is informed by direct inspection of the classic checkout at `~/Code/codebase-intel`, but the classic repo is large; some behavior cards may compress nuances. Future ports should treat the cards as starting alignment, then verify against the cited source files and update the card if anything important is missing.
- `classic-behavior-distillation.md` is intentionally long. A possible follow-up is splitting it into one file per behavior family if it becomes unwieldy. The current single-file form is easier to scan when proposing a new port.
- Future Rekon implementation work orders now have a non-trivial documentation prerequisite. Reviewers should expect each capability batch to open with a `CODEBASE-INTEL ALIGNMENT` section pointing into these docs.
- No code change risk. Tests pass; no behavior changes.

NEXT STEP
- Resume implementation with the import-boundary rule pack example. The next work order should open with a `CODEBASE-INTEL ALIGNMENT` section pointing to:
  - Classic capability: import governance / issue evaluator behavior.
  - Relevant classic files: `domain/issues/evaluators/imports/*`, `domain/issues/RulesResolver.ts`, `services/issues/detection-phases.ts`.
  - What Rekon keeps: stable rule ids, severity, source refs, pass/fail/skipped/unimplemented/error status, evaluator-as-capability shape.
  - What Rekon simplifies: rule-pack-as-capability instead of a central registry; no compiled YAML invariants yet.
  - What Rekon does not port yet: contract policy plumbing, label override layer.
  - Phase advanced: Phase B "first external rule-pack example".
- Operator npm publish remains pending and unchanged by this batch.
