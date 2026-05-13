# Changelog

All notable changes to Rekon will be documented in this file.

## 0.1.0-alpha.1

- Bumped the workspace and every `@rekon/*` package to `0.1.0-alpha.1` (root, all 19 packages, all `@rekon/*` internal dependency ranges).
- Recorded the public package boundary decision: all 19 packages are scheduled to publish under the `experimental, public` stability label. See `docs/release/public-package-boundaries.md`.
- Excluded `.tsbuildinfo` from publish tarballs by relocating the TypeScript build info file out of `dist/` in every package tsconfig. `npm pack --dry-run` now reports six entries per package (README, package.json, four dist files).
- Strengthened `scripts/publish-dry-run.mjs` to fail on `.tsbuildinfo` inclusion and to print a concise per-package summary. Existing guards against `.rekon/`, `.rekon-dev/`, dogfood fixtures, forbidden tokens, missing READMEs/licenses/dist outputs, and absolute paths remain.
- Added `scripts/install-tarball-smoke.mjs`: packs all 19 workspace packages, installs them into a temp consumer project via `file:` dependencies, copies `examples/simple-js-ts` into the project, runs the golden CLI flow, and validates the artifact index. Tarballs and the consumer project are cleaned up at the end.
- Added `docs/release/npm-publish-plan.md` with auth prerequisites, dependency-safe publish order, dry-run and publish command templates, post-publish smoke, and rollback/deprecate guidance. Explicit instruction: do not publish until manual approval.
- Added `docs/release/0.1.0-alpha.1.md` release notes draft describing what Rekon is, what is included, install/use instructions, CLI flows, capability authoring, known limitations, verification commands, dogfood note, and publish status.
- Updated `docs/release/alpha-release-checklist.md` to check off the items completed by this batch and to point at the new public package boundaries doc, npm publish plan, and release notes.
- Fixed the `@rekon/cli` entry-point detection so the installed binary runs correctly when `process.argv[1]` points through a symlinked path (e.g., npm's `node_modules/.bin/rekon` symlink, macOS `/tmp` → `/private/tmp` resolution, or any global install location). The CLI now compares the realpath of `process.argv[1]` to the module's own file URL.
- Added `tests/docs/release-readiness.test.mjs` covering: every workspace package at `0.1.0-alpha.1`, internal `@rekon/*` dependency ranges pinned to the same version, release readiness docs present, every workspace package listed (publish or deferred) in the public boundaries doc, npm publish plan requiring manual approval, release notes drafted, and the publish dry-run script guarding against `.tsbuildinfo`.
- Updated `tests/docs/package-stability.test.mjs` to require `scripts/install-tarball-smoke.mjs` exists.
- No artifact shape, kernel contract, SDK API, or capability behavior changes were made.
- Documentation-only correction to the publish posture: `docs/release/npm-publish-plan.md` now defaults to `--tag alpha` for the first public alpha, with `--tag latest` documented as the explicit opt-in if alpha should become the default install target. `docs/release/0.1.0-alpha.1.md` updates the install command to `npm install --no-save @rekon/cli@alpha` and notes that bare `npm install @rekon/cli` will not pull the alpha while the `alpha` dist-tag is in use. `docs/release/alpha-release-checklist.md` adds explicit checklist items for the scope/dist-tag decision, `npm login`, and the dist-tag-specific post-publish smoke. The decision rationale and exact commands live in `.rekon-dev/review-packets/dist-tag-decision.md`.

## 0.1.0-alpha.0

- Initialized Rekon as an open-source monorepo.
- Added public package boundaries for kernels, SDK, runtime, CLI, and initial built-in capabilities.
- Added governance, security, contributing, and architecture decision scaffolding.
- Added the initial `@rekon/kernel-artifacts` public API for artifact refs, headers, JSON artifact validation, and deterministic JSON digests.
- Added the initial `@rekon/kernel-evidence` public API for evidence facts, evidence graphs, provider context, provider contracts, and dedupe helpers.
- Added the initial `@rekon/sdk` capability definition and in-memory registry API.
- Added the initial local `@rekon/runtime` artifact store, observe, snapshot, and resolver execution APIs.
- Added the built-in `@rekon/capability-js-ts` evidence provider.
- Added the initial `@rekon/cli` commands for init, capability listing, observe, snapshot, artifact inspection, and preflight resolution.
- Added the built-in `@rekon/capability-resolver` preflight resolver.
- Added GitHub Actions CI for typecheck, test, build, and whitespace checks.
- Added `@rekon/kernel-snapshot` as the public IntelligenceSnapshot contract used by runtime and resolver.
- Added `@rekon/kernel-repo-model` for ObservedRepo, OwnershipMap, and CapabilityMap contracts.
- Added `@rekon/capability-model` as a deterministic EvidenceGraph-to-model projector.
- Added `rekon project` and updated preflight resolution to prefer OwnershipMap and ObservedRepo before raw evidence fallback.
- Added `@rekon/kernel-rulebook` and `@rekon/kernel-findings` public contracts.
- Added `@rekon/kernel-graph` graph node, edge, slice, validation, and composition helpers.
- Added `@rekon/capability-graph` for import, symbol, and ownership graph slices.
- Added `@rekon/capability-policy` for initial rule evaluation and finding reports.
- Added runtime publish, learn, and act execution APIs.
- Added `@rekon/capability-docs` publication artifacts and `rekon publish agents`.
- Added `@rekon/capability-memory` feedback and selection artifacts plus `rekon memory` commands.
- Added `@rekon/capability-intent` work-order and verification-plan artifacts.
- Added `@rekon/capability-reconcile` artifact-only reconciliation plans and logs.
- Added local installed external capability loading from `.rekon/config.json`.
- Added a complete `examples/custom-capability` TODO detector.
- Added migration backlog and dogfood fixture documentation.
- Updated CI to Node 24 with Node 24-compatible GitHub Actions.
- Tightened the documented Node engine lanes to Node 20.12, 22, and 24.
- Added repository-wide artifact contract tests for the CLI smoke flow, artifact headers, index paths, digests, and generated artifact public-safety checks.
- Added SDK capability conformance helpers and contract tests for built-in and example capabilities.
- Added `resolve.preflight` `resolutionTrace` entries for ownership resolution, fallback behavior, finding/memory checks, and risk decisions.
- Updated preflight ownership resolution to prefer `OwnershipMap`, then `ObservedRepo`, then ownership `GraphSlice`, then raw `EvidenceGraph` ownership hints.
- Reworked the root README as the alpha onboarding entry point with a 10-minute CLI walkthrough, lifecycle overview, artifact/provenance explanation, capability overview, and alpha limitations.
- Added `docs/getting-started/first-10-minutes.md` and expanded artifact, resolver trace, extension authoring, manifest, security, package README, and contributing documentation.
- Polished `examples/custom-capability` as the canonical TODO capability example, including conformance testing, runtime execution instructions, expected outputs, and troubleshooting.
- Added lightweight docs contract tests for onboarding, extension authoring, artifact traceability, and contributor guidance.
- No runtime behavior, artifact shape, or SDK public API changes were made in the alpha onboarding docs pass.
- Updated process docs for solo alpha development to push directly to `main` after checks pass.
- Added runtime artifact index validation for index shape, required fields, duplicate refs, path containment, header/index matching, and digest verification.
- Added `rekon artifacts validate` for local artifact integrity checks.
- Hardened snapshot status so missing evidence reports `unknown`, malformed indexes or incomplete projection families report `partial`, and clean evidence-backed snapshots report `fresh`.
- Expanded full CLI smoke contract coverage to memory, intent, reconciliation, header freshness, index validation, and digest checks.
- Added an optional `REKON_DOGFOOD_CLASSIC_ROOT` dogfood regression harness that skips cleanly when no classic checkout is configured.
- Added durable NorthStar strategy docs in `docs/strategy/`: `north-star.md`, `capability-model.md`, `roadmap.md`, and `codebase-intel-classic-migration.md`.
- Added `docs/release/alpha-release-checklist.md` for the `0.1.0-alpha.1` go/no-go criteria.
- Added `docs/concepts/stability.md` describing the four stability labels (`stable`, `experimental`, `internal`, `deprecated`) and the alpha defaults for each package.
- Added stability labels to every `packages/*/README.md`.
- Linked strategy docs and the release checklist from `README.md`, and pointed `AGENTS.md` and `CONTRIBUTING.md` to the NorthStar.
- Added `scripts/audit-package-exports.mjs` to inspect every workspace package for required fields, `@rekon/*` scope, license, forbidden tokens, and source imports from `codebase-intel`.
- Added `scripts/publish-dry-run.mjs` to run `npm pack --dry-run --json` per workspace package, report tarball contents, and fail on missing READMEs, missing licenses, missing build output, accidental `.rekon/` or dogfood fixture inclusion, or other forbidden tokens. No package is ever published.
- Added `scripts/install-smoke.mjs` to copy `examples/simple-js-ts` into a temp workspace, run the full golden CLI flow against the built CLI, and validate the resulting artifact index. Install-from-tarball smoke remains a deferred follow-up.
- Added `scripts/audit-license.mjs` to verify the root LICENSE, the root `package.json` license, and every package license declare Apache-2.0.
- Added docs tests for the new strategy docs, the alpha release checklist, the stability concept doc, and per-package stability labels.
- No runtime behavior, artifact shape, or SDK public API changes were made in the alpha release readiness pass.
