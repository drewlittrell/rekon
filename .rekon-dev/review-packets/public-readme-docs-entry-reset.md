# Public README / Docs Entry Reset

## CHANGES MADE

- Rewrote `README.md` as the public product entry point for Rekon as an evidence-backed AI handoff system for codebases.
- Added a concise 5-minute demo centered on `scan`, capability graph build, task context, preflight, agent-contract publication, and artifact validation.
- Added a deeper public demo at `docs/demo/task-context-to-handoff.md`.
- Added `docs/README.md` as the human documentation map, distinct from generated `docs/INDEX.md`.
- Added `docs/strategy/README.md` to label the strategy directory as mixed current strategy plus historical snapshots.
- Updated `CHANGELOG.md` for the docs-only product pass.

## PUBLIC API CHANGES

- None.
- No runtime, SDK, CLI, artifact, package export, or capability behavior changed.

## PRODUCT SURFACE UPDATED

- README now starts with the product framing, problem, current value, 5-minute demo, output examples, architecture boundary, safety model, docs map, status, and reviewer guidance.
- README keeps current test-pinned command references for phase-level commands, fresh-repo intent context preparation, and `rekon intent work-order generate`.

## DOCS MAP ADDED

- `docs/README.md` now points new readers to getting started, demos, concepts, artifacts, guides, extension docs, and current strategy docs.
- `docs/strategy/README.md` clarifies that most strategy files are historical snapshots and not the public starting path.

## DEMO PATH VERIFIED

- Verified `scan` on a fresh copy of `examples/simple-js-ts`.
- Verified `capability graph build`.
- Verified `context task` with `--provider mock`.
- Verified `intent plan review` on a rough plan and confirmed it returns `needs-revision` rather than creating implementation work.

## COMMANDS VERIFIED

- `node packages/cli/dist/index.js scan --root /tmp/rekon-public-demo --json`
- `node packages/cli/dist/index.js capability graph build --root /tmp/rekon-public-demo --json`
- `node packages/cli/dist/index.js context task --root /tmp/rekon-public-demo --task "Modify the greeting in src/index.ts" --path src/index.ts --provider mock --json`
- `node packages/cli/dist/index.js intent plan review --root /tmp/rekon-public-demo --plan /tmp/rekon-demo-plan.md --goal "Modify the greeting in src/index.ts" --path src/index.ts --json`

## TESTS / VERIFICATION

- `npm run typecheck` passed.
- `node packages/cli/dist/index.js docs freshness --root . --json` passed.
- `node scripts/test.mjs tests/docs` passed after preserving existing README command references.
- `npm run test` passed: 3,698 tests, 0 failures, 35 skipped.
- `npm run build` passed.
- `git diff --check` passed.
- README 5-minute demo CLI smoke passed on `/tmp/rekon-demo`.

## INTENTIONALLY UNTOUCHED

- No source implementation files.
- No runtime behavior.
- No SDK or artifact schema changes.
- No capability implementation changes.
- Existing unrelated local files: `.claude/`, `WORKFLOW.local.md`, `plans/per-edge-law-source.md`, and pre-existing generated `docs/INDEX.md` churn.

## RISKS / FOLLOW-UP

- README now has a public product shape, but more old docs still carry slice-history language. The new `docs/README.md` and `docs/strategy/README.md` reduce that exposure without rewriting historical material.
- Existing docs tests still pin prose phrases in README. Future docs governance should keep moving away from prose assertion tests, per current AGENTS guidance.

## NEXT STEP

- Run full verification and CLI smoke, then commit and push the docs-only product pass directly to `main`.
