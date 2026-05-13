CHANGES MADE
- Fast-forwarded main to include the alpha onboarding docs commit and deleted the remote onboarding branch.
- Updated AGENTS.md and CONTRIBUTING.md for direct-to-main solo alpha development.
- Added runtime artifact index validation for index shape, required entry fields, duplicate refs, repo-contained paths, header/index agreement, and digest verification.
- Added `rekon artifacts validate`.
- Hardened snapshot status with minimal integrity-based freshness warnings.
- Expanded the full CLI artifact contract flow to include evaluate, memory, intent, reconciliation, freshness headers, index validation, and digest checks.
- Added an optional dogfood regression harness gated by REKON_DOGFOOD_CLASSIC_ROOT.
- Updated artifact, snapshot, freshness, CLI, runtime, README, and changelog docs.

PUBLIC API CHANGES
- Added `validateArtifactIndex()` to `@rekon/runtime`.
- Added runtime types `ArtifactIndexValidationIssue` and `ArtifactIndexValidationResult`.
- Added CLI command `rekon artifacts validate`.
- No artifact shapes, SDK public API, or capability contracts changed.

PROCESS DOCS UPDATED
- AGENTS.md now says solo alpha development should push directly to `main` after required checks pass.
- CONTRIBUTING.md now says not to create branches unless explicitly requested.
- CONTRIBUTING.md lists when Rekon should switch back to branches and PRs: external contributors, package publication, users relying on main, risky source-writing actuator work, breaking public API changes, and release candidates.

ARTIFACT VALIDATION ADDED
- Runtime validation checks `.rekon/registry/artifacts.index.json`.
- Validation checks entry fields: `type`, `id`, `schemaVersion`, `path`, `digest`, and `writtenAt`.
- Validation checks duplicate `type:id` entries.
- Validation checks paths stay relative, under `.rekon/artifacts/`, and inside the repository root.
- Validation rejects `.codebase-intel` index paths.
- Validation reads indexed artifacts, validates headers, compares header type/id/schemaVersion with the index, and verifies the digest with Rekon's current digest helper.
- Contract tests validate every emitted artifact from the full CLI smoke flow.

SNAPSHOT FRESHNESS CHANGES
- `unknown`: no `EvidenceGraph` is indexed.
- `fresh`: latest evidence exists and artifact index validation has no warnings.
- `partial`: evidence exists, but index validation reports issues or projection artifacts are incomplete after projection starts.
- `stale`: reserved for future file-change invalidation; no watcher was added.
- Runtime tests cover no evidence, observe-only, incomplete projections, and malformed index entries.

DOGFOOD HARNESS STATUS
- Added `tests/integration/dogfood.test.mjs`.
- The test skips cleanly unless `REKON_DOGFOOD_CLASSIC_ROOT` is set.
- When enabled, it runs init, observe, project, snapshot, evaluate, and resolve preflight against the configured classic repo root.
- It validates EvidenceGraph, model projection, GraphSlice, FindingReport, and ResolverPacket trace output.
- It writes a summary to `tests/fixtures/dogfood/codebase-intel-classic-summary.json` only when the env-gated dogfood test runs.

COMMANDS VERIFIED
- git fetch origin
- git checkout main
- git pull --ff-only origin main
- git merge --ff-only origin/codex/alpha-onboarding-docs
- git push origin main
- git push origin --delete codex/alpha-onboarding-docs
- npm run typecheck
- npm run test
- npm run build
- git diff --check
- node packages/cli/dist/index.js init --root examples/simple-js-ts
- node packages/cli/dist/index.js observe --root examples/simple-js-ts --json
- node packages/cli/dist/index.js project --root examples/simple-js-ts --json
- node packages/cli/dist/index.js snapshot --root examples/simple-js-ts --json
- node packages/cli/dist/index.js evaluate --root examples/simple-js-ts --json
- node packages/cli/dist/index.js resolve preflight --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
- node packages/cli/dist/index.js publish agents --root examples/simple-js-ts
- node packages/cli/dist/index.js memory add --root examples/simple-js-ts --instruction "Preserve bootstrap behavior." --path src
- node packages/cli/dist/index.js memory list --root examples/simple-js-ts --json
- node packages/cli/dist/index.js memory select --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
- node packages/cli/dist/index.js intent work-order --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
- node packages/cli/dist/index.js reconcile --root examples/simple-js-ts --operation docs_regeneration
- node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json

TESTS / VERIFICATION
- npm run typecheck: passed.
- npm run test: passed, 70 passed and 1 skipped optional dogfood test.
- npm run build: passed.
- git diff --check: passed.
- CLI smoke on examples/simple-js-ts: passed.
- `rekon artifacts validate` on examples/simple-js-ts: passed with `{ "valid": true, "issues": [] }`.
- Public-safety grep found only intentional guardrail/test/doc/code strings that reject `.codebase-intel` and `CODEBASE_INTEL`.

INTENTIONALLY UNTOUCHED
- No new capabilities.
- No schema library.
- No SaaS/backend/dashboard work.
- No source-writing reconciliation.
- No package publishing or release automation.
- No watcher or full file-change freshness engine.
- No old codebase-intel imports or behavior port.

RISKS / FOLLOW-UP
- Snapshot freshness is intentionally minimal and integrity-based; real file-change invalidation still needs a future engine.
- `validateArtifactIndex()` validates parsed JSON payload digests using Rekon's canonical digest helper, not raw file byte hashes.
- Dogfood writes into the configured target repo's `.rekon/` workspace when the env var is set.
- CI should be checked after the direct push to main completes.

NEXT STEP
- Alpha Release Readiness: 0.1.0-alpha.1 checklist, npm publish dry-run, package export audit, license/header audit, public API stability labels, and install-from-git smoke test.
