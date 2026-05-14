CHANGES MADE
- Added a new external rule pack capability under `examples/import-boundary-rule-pack/`:
  - `package.json` declaring the package name `rekon-capability-import-boundaries-example`, type `module`, version `0.1.0-alpha.1`, deps on `@rekon/kernel-artifacts`/`-evidence`/`-findings`/`sdk` at `0.1.0-alpha.1`.
  - `tsconfig.json` extending the repo base.
  - `src/index.ts` registering one evaluator (`import-boundaries.evaluate`) that consumes the latest `EvidenceGraph` and produces a `FindingReport` containing two finding types.
  - `fixtures/bad-imports/` (`package.json`, `src/local.ts`, `src/index.ts`, `src/feature/handler.ts`). The fixture intentionally contains one parent-relative import (`../local`) and one combined parent-relative + generated-output import (`../../dist/generated`).
  - `test/conformance.test.mjs` exercising `assertCapabilityConforms()` and the evaluator against a synthetic in-memory `EvidenceGraph`.
  - `README.md` walking through build/test/install + the full CLI flow.
- Added `tests/integration/import-boundary-rule-pack-cli.test.mjs` that exercises the package end-to-end through the Rekon CLI (`init`, `config validate`, `capabilities list`, `capabilities inspect`, `observe`, `evaluate list`, `evaluate run import-boundaries.evaluate`, `artifacts validate`) and asserts both finding types are emitted with the correct severities (medium / high).
- Linked the new example from `README.md` (Capabilities section), `docs/extensions/authoring-capabilities.md` (Reference Examples), and `docs/strategy/capability-model.md` (Community Extension Model).
- Updated `docs/strategy/roadmap.md` and `docs/strategy/classic-behavior-roadmap.md` to mark Phase B's "first external rule-pack example" as shipped.
- Updated `docs/strategy/classic-alignment-map.md` to point the Rule engine and governance row at `examples/import-boundary-rule-pack`.
- Updated `CHANGELOG.md` with the new example, rules, and test coverage.

PUBLIC API CHANGES
- None. No kernel, SDK, runtime, CLI, or built-in capability behavior changes. The new package is a private external example registered through the same SDK and CLI surfaces that already exist.

CODEBASE-INTEL ALIGNMENT
- Classic capability addressed: import governance / boundary evaluation.
- Relevant classic source areas (sampled at time of writing):
  - `domain/issues/evaluators/imports/*`
  - `domain/issues/RulesResolver.ts`
  - `domain/issues/evaluators/RuleEvaluatorProvider.ts`
  - `services/issues/detection-phases.ts`
  - `services/IssueDetectionService.ts`
- What Rekon keeps: evaluator-as-capability, evidence-driven execution (read `EvidenceGraph` → emit `FindingReport`), stable rule ids (`import-boundaries.parent-relative`, `import-boundaries.generated-output`), severities (medium/high), source refs on findings, conformance testing, CLI discoverability via `evaluate list`, run-by-id execution via `evaluate run`, the rule-pack-as-package pattern.
- What Rekon simplifies: two rules only (parent-relative + generated-output) instead of the full classic catalog; no compiled YAML invariants; no architecture profile overlays; no contract-policy plumbing; no false-positive/status merge; no broad multi-phase issue detection orchestrator; no central `RULE_EVALUATORS` registry — the SDK + runtime do that job already.
- What Rekon does not port yet: the full classic import evaluator catalog (target-system mismatch, layer boundary, package-public-surface, etc.); compiled invariant source + compilation pipeline; contract-policy evaluator validation; issue status preservation across runs; false-positive filtering with reasons; LLM issue review.
- How this advances migration: proves that a classic-style evaluator family can live as an external Rekon rule pack, operable through the standard CLI dispatch. Establishes the canonical pattern future evaluator migrations from `codebase-intel-classic` should follow. Closes Phase B's "first external rule-pack example" item.

CLASSIC ALIGNMENT MAP
- `examples/import-boundary-rule-pack` is now listed alongside `@rekon/capability-policy` in the "Rule engine and governance" row of `docs/strategy/classic-alignment-map.md`. The classic-behavior-roadmap entry for Phase B's first external rule pack is marked ✅ shipped.

EXTERNAL RULE PACK FLOW
- Build: `npm install` → `npm run build` → `npm --prefix examples/import-boundary-rule-pack run build`.
- Test (package): `npm --prefix examples/import-boundary-rule-pack run test`. 3 tests; all pass.
- Install into workspace: `npm install ./examples/import-boundary-rule-pack --no-save`.
- Use against the bundled fixture: `cp -R examples/import-boundary-rule-pack/fixtures/bad-imports /tmp/rekon-import-boundary-example` → `rekon init` → edit `.rekon/config.json` to add `rekon-capability-import-boundaries-example` with `read:artifacts`/`write:artifacts` permissions → `rekon config validate` → `rekon capabilities list` → `rekon capabilities inspect rekon-capability-import-boundaries-example` → `rekon observe` → `rekon evaluate list` → `rekon evaluate run import-boundaries.evaluate` → `rekon artifacts list --type FindingReport` → `rekon artifacts validate`.
- Manual smoke against the fixture produced a `FindingReport` with 3 findings (2 parent-relative + 1 generated-output) and `artifacts validate` returned `{ valid: true, issues: [] }`.

RULES IMPLEMENTED
- `import_boundary.parent_relative_import` — severity `medium`. Trigger: import target begins with `../`. Suggested action: replace parent-relative import with a stable package/root import or move shared code behind an explicit public boundary.
- `import_boundary.generated_output_import` — severity `high`. Trigger: import target contains `dist/` or `build/`. Suggested action: replace generated-output import with a source import or package entrypoint import.
- An import that matches both rules — for example `../../dist/generated` — produces both findings.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 121 passed, 1 skipped optional dogfood (`REKON_DOGFOOD_CLASSIC_ROOT` not set). One new integration test landed and is included in this count.
- `npm run build`: passed.
- `git diff --check`: clean.
- `npm --prefix examples/import-boundary-rule-pack run test`: 3 tests, all passed (`assertCapabilityConforms`, both finding types from synthetic graph, header validity).
- `node scripts/audit-package-exports.mjs`: passed (19 packages — the new external example is intentionally not in `packages/` and so does not show up in this audit; that mirrors how `examples/custom-capability` is handled).
- `node scripts/publish-dry-run.mjs`: passed (19 packages, 6 entries each, no `.tsbuildinfo`, no forbidden tokens).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed.
- Standard CLI smoke against `examples/simple-js-ts` (`init`, `config validate`, `observe`, `project`, `snapshot`, `evaluate list`, `evaluate run @rekon/capability-policy.evaluator`, `resolve run resolve.preflight`, `publish list`, `publish agents`, `artifacts validate`): all exited 0 with clean output. Example `.rekon/` cleaned afterward.
- Manual CLI smoke against the new rule-pack fixture: passed; both finding types present.

INTENTIONALLY UNTOUCHED
- No version bump.
- No `npm publish`.
- No artifact, kernel, SDK, runtime, CLI, or built-in capability behavior changes.
- No new built-in capability — the rule pack ships under `examples/` like the TODO example, not under `packages/`.
- No JS/TS evidence extractor changes — the new evaluator consumes the existing `import` facts (`value.source`, `value.target`).
- No schema library.
- No SaaS/backend/dashboard work.
- No source-writing reconciliation.
- No marketplace/discovery.
- No `codebase-intel-classic` imports; classic remains reference only.
- No generic actuator or learner dispatch.
- No branches; commit landed directly on `main`.

RISKS / FOLLOW-UP
- The new example package is `private: true` and ships under `examples/`, matching the TODO example. If we ever want it to be publicly installable from npm, it would need its own publish posture — that decision is intentionally deferred.
- The two implemented rules use simple substring/prefix checks, not full module resolution. They flag any import target with `../` or containing `dist/` / `build/`, regardless of context. That's intentional for an example; richer rule packs may want resolution-aware checks once a `GraphSlice`-based variant is needed.
- The integration test self-skips when the package is not installed (same pattern as the TODO test). Reviewers running the full suite without prior `npm install ./examples/import-boundary-rule-pack --no-save` will see the test skip. The README install instructions are explicit.
- `node_modules/rekon-capability-import-boundaries-example/dist/` ships built JS in this checkout because the rule pack lives in-repo and we installed it locally. Cleaning `dist/` and re-running `npm install ./examples/import-boundary-rule-pack --no-save` regenerates it without trouble.

NEXT STEP
- Per the next-step note in the work order, move to freshness + invalidation maturity:
  - capability `invalidatedBy` semantics
  - artifact stale warnings
  - snapshot stale detection beyond integrity
  - CLI surface for freshness status
- The current set of in-repo external capabilities (TODO publisher + import-boundary rule pack) means we now have multiple realistic external capability outputs that can become stale — a better grounding for the freshness work than we had before.
- Operator npm publish is still pending and unchanged by this batch.
