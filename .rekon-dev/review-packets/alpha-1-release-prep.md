CHANGES MADE
- Created `docs/release/public-package-boundaries.md` recording the publish decision for `0.1.0-alpha.1`. All 19 workspace packages are scheduled to publish under `experimental, public`; nothing is deferred.
- Bumped the workspace and every `@rekon/*` package from `0.1.0-alpha.0` to `0.1.0-alpha.1`. Internal `@rekon/*` dependency ranges were updated in lockstep across all dependents.
- Refreshed `package-lock.json` so it reflects the new versions.
- Relocated the TypeScript build info file out of `dist/`: every `packages/*/tsconfig.json` now sets `"tsBuildInfoFile": "./.tsbuildinfo"`. Removed and rebuilt all `dist/` directories. Tarballs now include exactly six entries (README, package.json, `dist/index.js`, `dist/index.js.map`, `dist/index.d.ts`, `dist/index.d.ts.map`).
- Strengthened `scripts/publish-dry-run.mjs` with a `FORBIDDEN_FILE_SUFFIXES` check that fails on `.tsbuildinfo` inclusion. Added a concise per-package summary printed to stderr.
- Added `scripts/install-tarball-smoke.mjs`. It runs `npm pack` for every workspace package into a temp tarball directory, writes a consumer `package.json` that references each tarball via `file:` paths, runs `npm install` in a separate temp project, copies `examples/simple-js-ts` in, runs the full golden CLI flow against the installed binary, validates the artifact index, and cleans up.
- Added `docs/release/npm-publish-plan.md` with scope/auth prerequisites, the dependency-safe publish order, dry-run/publish command templates, post-publish smoke instructions, rollback/deprecate guidance, and explicit do-not-publish instructions until manual approval.
- Added `docs/release/0.1.0-alpha.1.md` release notes draft (what Rekon is, what's included, install/use, CLI flows, capability authoring, known limitations, verification commands, dogfood note, publish status).
- Updated `docs/release/alpha-release-checklist.md` to check off every item completed by this batch and to point at the new boundaries doc, publish plan, and release notes. The "Next Batch" section now points to the Manual Publish Decision step.
- Updated `tests/docs/package-stability.test.mjs` to also require `scripts/install-tarball-smoke.mjs`.
- Added `tests/docs/release-readiness.test.mjs` with assertions for: every workspace package at `0.1.0-alpha.1`, internal `@rekon/*` dependency ranges pinned to `0.1.0-alpha.1`, release docs present, every workspace package referenced in the public boundaries doc, publish plan requires manual approval, release notes drafted, and the publish-dry-run script guards against `.tsbuildinfo`.
- Updated `CHANGELOG.md` with a `0.1.0-alpha.1` section covering all changes above.

PUBLIC API CHANGES
- `@rekon/cli` entry-point detection now uses `realpath(process.argv[1]) === fileURLToPath(import.meta.url)` instead of `import.meta.url === \`file://${process.argv[1]}\``. This is a behavioral bug fix: the previous comparison silently dropped commands when `process.argv[1]` resolved through a symlink (for example, npm's `node_modules/.bin/rekon` symlink, macOS `/tmp` → `/private/tmp` resolution, or any global install path). The exported `main()` function and module shape are unchanged.
- No other public API surfaces changed. No artifact shape, kernel contract, SDK API, or capability behavior changes.

PACKAGE BOUNDARY DECISION
- All 19 packages are scheduled to publish at `0.1.0-alpha.1`.
- All declare `experimental, public` per `docs/concepts/stability.md`.
- Zero packages deferred.
- Examples (`examples/simple-js-ts`, `examples/custom-capability`) and tests (`tests/**`) are not published.
- The decision is recorded in `docs/release/public-package-boundaries.md`.

VERSION BUMP
- Root `package.json`: `0.1.0-alpha.0` → `0.1.0-alpha.1`.
- Every `packages/*/package.json`: `0.1.0-alpha.0` → `0.1.0-alpha.1`.
- Every internal `@rekon/*` dependency range across `dependencies` and `devDependencies`: `0.1.0-alpha.0` → `0.1.0-alpha.1`.
- `package-lock.json` regenerated via `npm install` to match.

PUBLISH DRY-RUN RESULTS
- `node scripts/publish-dry-run.mjs` exited 0.
- All 19 packages produced 6-entry tarballs (no `.tsbuildinfo`).
- Sizes range from 3,226 bytes (`@rekon/kernel-rulebook`) to 12,687 bytes (`@rekon/runtime`).
- Per-package summary printed to stderr; full JSON output captured to stdout.
- No `.rekon/`, `.rekon-dev/`, dogfood, `.codebase-intel`, `CODEBASE_INTEL`, absolute path, missing README, missing license, or missing dist issues.

TSBUILDINFO / TARBALL CLEANUP
- Mechanism: relocated `tsBuildInfoFile` to `./.tsbuildinfo` (package root, gitignored) instead of `dist/.tsbuildinfo`. The package `files: ["dist"]` allowlist now naturally excludes the build info file because it lives outside `dist/`.
- Verified: pre-fix dry-run included `dist/.tsbuildinfo`; post-fix dry-run shows six entries with no `.tsbuildinfo` for every package.
- `scripts/publish-dry-run.mjs` now fails if `.tsbuildinfo` reappears.
- Side effect: a `.tsbuildinfo` file now exists at the root of each package after build. It is covered by the repo `.gitignore` (`*.tsbuildinfo`).

INSTALL-FROM-TARBALL SMOKE RESULTS
- `node scripts/install-tarball-smoke.mjs` exited 0.
- 19 tarballs packed, installed, and resolved by npm in a temp consumer project via `file:` paths.
- Installed CLI (`node_modules/@rekon/cli/dist/index.js`) ran init, observe, project, snapshot, evaluate, resolve preflight, publish agents, and artifacts validate against a copy of `examples/simple-js-ts`.
- 14 artifacts emitted (1 EvidenceGraph, 1 ObservedRepo, 1 OwnershipMap, 1 CapabilityMap, 3 IntelligenceSnapshot, 3 GraphSlice, 1 FindingReport, 1 ResolverPacket, 2 Publication).
- `artifacts validate --json` returned `{ "valid": true, "issues": [] }`.
- Tarball and consumer dirs cleaned up at the end.
- Caveat: discovered and fixed a CLI entry-point bug along the way (see PUBLIC API CHANGES). Without the fix, the installed binary would silently exit when run from any path involving a symlink (every `npm install` location qualifies).

NPM PUBLISH PLAN
- `docs/release/npm-publish-plan.md` documents:
  - `@rekon` scope assumption and Apache-2.0 license.
  - Auth prerequisites (`npm whoami`, scope membership, 2FA).
  - Pre-publish checks (the verification command list).
  - Dependency-safe publish order:
    1. `@rekon/kernel-artifacts`
    2. `@rekon/kernel-evidence`
    3. `@rekon/kernel-snapshot`
    4. `@rekon/kernel-graph`
    5. `@rekon/kernel-repo-model`
    6. `@rekon/kernel-rulebook`
    7. `@rekon/kernel-findings`
    8. `@rekon/sdk`
    9. `@rekon/runtime`
    10. `@rekon/capability-js-ts`
    11. `@rekon/capability-model`
    12. `@rekon/capability-graph`
    13. `@rekon/capability-policy`
    14. `@rekon/capability-resolver`
    15. `@rekon/capability-docs`
    16. `@rekon/capability-memory`
    17. `@rekon/capability-intent`
    18. `@rekon/capability-reconcile`
    19. `@rekon/cli`
  - `npm publish --dry-run` and `npm publish --access public --otp ...` templates.
  - Post-publish smoke from outside the Rekon checkout against the installed `@rekon/cli`.
  - Rollback/deprecate guidance (prefer `npm deprecate`, ship `0.1.0-alpha.2` for fixes).
  - Explicit do-not-publish instruction until manual approval.
- The plan also includes a one-liner to recompute the publish order if the dependency graph drifts.

RELEASE NOTES DRAFTED
- `docs/release/0.1.0-alpha.1.md` covers what Rekon is, what's in alpha.1 (19 packages), install/use from source, key CLI flows, capability authoring, known limitations, verification commands, the optional dogfood harness, the architecture rule, and a Publish Status section to update once packages ship.
- Cross-references the NorthStar, capability model, roadmap, public boundaries doc, publish plan, and alpha release checklist.

COMMANDS VERIFIED
- npm install (refreshed package-lock.json)
- npm run typecheck
- npm run test (90 tests; 89 pass, 1 skipped optional dogfood test)
- npm run build
- git diff --check
- node scripts/audit-package-exports.mjs
- node scripts/publish-dry-run.mjs
- node scripts/audit-license.mjs
- node scripts/install-smoke.mjs
- node scripts/install-tarball-smoke.mjs
- node packages/cli/dist/index.js init --root examples/simple-js-ts --json
- node packages/cli/dist/index.js observe --root examples/simple-js-ts --json
- node packages/cli/dist/index.js project --root examples/simple-js-ts --json
- node packages/cli/dist/index.js snapshot --root examples/simple-js-ts --json
- node packages/cli/dist/index.js evaluate --root examples/simple-js-ts --json
- node packages/cli/dist/index.js resolve preflight --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
- node packages/cli/dist/index.js publish agents --root examples/simple-js-ts
- node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json

TESTS / VERIFICATION
- npm run typecheck: passed.
- npm run test: 89 passed, 1 skipped optional dogfood (REKON_DOGFOOD_CLASSIC_ROOT not set).
- npm run build: passed.
- git diff --check: passed (no whitespace issues).
- All four audit scripts: passed.
- Both install smokes (build + tarball): passed.
- CLI golden flow against `examples/simple-js-ts`: passed; final `artifacts validate` reported `{ "valid": true, "issues": [] }`. Example workspace cleaned afterward.

INTENTIONALLY UNTOUCHED
- No `npm publish` executed.
- No new capabilities or capability handlers.
- No artifact shape, SDK contract, runtime behavior, or CLI command surface changes (the CLI bug fix preserves the exported `main()` and the user-visible behavior; it makes the entry point actually run when it was supposed to).
- No schema library.
- No SaaS/backend/dashboard work.
- No source-writing reconciliation.
- No watcher/freshness engine.
- No marketplace/discovery work.
- No imports from `codebase-intel-classic`.
- No CI publish automation.
- No GitHub release draft (a follow-up item).
- No branch created; commit landed directly on `main`.

RISKS / FOLLOW-UP
- The CLI entry-point fix is a behavior change in practice: any consumer who previously ran the CLI from a fully-resolved repo path will see no difference; any consumer who relied on the broken behavior (CLI exiting silently from an install location) will now see the CLI actually run. This is the desired outcome, but worth noting in release communication.
- `install-tarball-smoke.mjs` uses `file:` references to tarballs, which proves the tarballs are installable and consumers can resolve `@rekon/*` siblings. It does not yet exercise `npm install --no-save @rekon/cli` from a registry, because no registry has the packages. That step is reserved for post-publish verification per `npm-publish-plan.md`.
- `package-lock.json` is regenerated; reviewers should confirm the diff is expected (version bumps only).
- The `.npmrc`/`publishConfig` story is intentionally left default for alpha.1.
- CI on the direct push to `main` should be confirmed green after the push.

NEXT STEP
- Manual Publish Decision batch:
  - Inspect the latest tarball and install-smoke results.
  - Confirm `@rekon` scope availability and publisher npm permissions.
  - Confirm npm 2FA / auth posture.
  - Decide publish vs defer.
  - If publish: follow `docs/release/npm-publish-plan.md` end-to-end and tag the release commit.
  - If defer: open a precise blocker list and target `0.1.0-alpha.2` or later.
- Until that batch runs, no `@rekon/*` package should be published.
