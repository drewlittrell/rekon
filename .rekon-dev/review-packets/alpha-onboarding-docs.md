CHANGES MADE
- Rewrote README.md as the alpha entry point for Rekon.
- Added a first 10-minute walkthrough for a fresh clone and examples/simple-js-ts.
- Expanded extension authoring, capability manifest, and security model docs.
- Added artifact model docs for headers, evidence graphs, snapshots, graph slices, finding reports, resolver packets, memory artifacts, work orders, and reconciliation logs.
- Documented resolver trace semantics, ownership source precedence, fallback behavior, and risk trace entries.
- Normalized package README files with stability, lifecycle fit, public surface or main concepts, and import boundaries.
- Updated CONTRIBUTING.md with setup, checks, capability authoring, public API expectations, changelog expectations, branch/PR guidance, security notes, and agent expectations.
- Added lightweight docs contract tests for onboarding, extension authoring, artifact traceability, and contributor guidance.

PUBLIC API CHANGES
- None.
- No runtime behavior, artifact shape, or SDK public API changes were made.

DOCS ADDED / UPDATED
- README.md
- CONTRIBUTING.md
- docs/getting-started/first-10-minutes.md
- docs/extensions/authoring-capabilities.md
- docs/extensions/capability-manifest.md
- docs/extensions/security-model.md
- docs/artifacts/index.md
- docs/artifacts/artifact-header.md
- docs/artifacts/evidence-graph.md
- docs/artifacts/intelligence-snapshot.md
- docs/artifacts/graph-slice.md
- docs/artifacts/finding-report.md
- docs/artifacts/resolver-packet.md
- docs/artifacts/memory-artifacts.md
- docs/artifacts/work-order.md
- docs/artifacts/reconciliation-log.md
- docs/concepts/resolvers.md
- Package README files under packages/*
- CHANGELOG.md

EXAMPLES UPDATED
- examples/custom-capability/README.md now explains the TODO capability roles, manifest, consumes/produces contract, permissions, conformance testing, runtime execution, expected output, troubleshooting, and current CLI limitation.
- examples/custom-capability/src/index.ts has small orientation comments around the evidence provider, evaluator, publisher, and SDK registration.
- examples/custom-capability/test/conformance.test.mjs validates the example through assertCapabilityConforms().

COMMANDS VERIFIED
- npm run typecheck
- npm run test
- npm run build
- git diff --check
- npm --prefix examples/custom-capability run test
- node packages/cli/dist/index.js init --root examples/simple-js-ts
- node packages/cli/dist/index.js observe --root examples/simple-js-ts --json
- node packages/cli/dist/index.js project --root examples/simple-js-ts --json
- node packages/cli/dist/index.js snapshot --root examples/simple-js-ts --json
- node packages/cli/dist/index.js resolve preflight --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
- node packages/cli/dist/index.js evaluate --root examples/simple-js-ts --json
- node packages/cli/dist/index.js publish agents --root examples/simple-js-ts
- node packages/cli/dist/index.js memory add --root examples/simple-js-ts --instruction "Preserve bootstrap behavior." --path src
- node packages/cli/dist/index.js memory list --root examples/simple-js-ts --json
- node packages/cli/dist/index.js memory select --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
- node packages/cli/dist/index.js intent work-order --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
- node packages/cli/dist/index.js reconcile --root examples/simple-js-ts --operation docs_regeneration
- Custom TODO capability runtime example using createRuntime(), runObserve(), runEvaluate(), and runPublish() against /tmp/rekon-todo-example.

KNOWN LIMITATIONS DOCUMENTED
- The CLI has publish agents for the built-in docs publisher, but it does not yet expose a generic publisher command for arbitrary external publishers. The custom TODO publisher is documented through a direct runtime example.
- The alpha has no watcher, marketplace, SaaS/backend/dashboard, source-writing reconciliation by default, full codebase-intel-classic port, or heavy schema library.

TESTS / VERIFICATION
- npm run typecheck: passed.
- npm run test: passed, 65 tests.
- npm run build: passed.
- git diff --check: passed.
- npm --prefix examples/custom-capability run test: passed.
- CLI smoke flow on examples/simple-js-ts: passed for init, observe, project, snapshot, resolve preflight, evaluate, publish agents, memory add/list/select, intent work-order, and reconcile.
- Custom TODO capability runtime example: passed and produced a Publication artifact.
- Public-safety grep found only intentional guardrail/test documentation for .codebase-intel and CODEBASE_INTEL, not generated artifacts or imports.

INTENTIONALLY UNTOUCHED
- Runtime architecture.
- SDK public API.
- Artifact shapes.
- Core capability behavior.
- External capability loading semantics.
- Source-writing reconciliation.
- Marketplace/discovery/SaaS/dashboard work.
- Old codebase-intel behavior.

RISKS / FOLLOW-UP
- The custom TODO publisher still needs a generic CLI publisher path if Rekon wants external publishers to be runnable without a short runtime script.
- The docs contract test checks key onboarding phrases and command presence, but it is not a full command extractor.
- Artifact schema strictness and dogfood regression hardening remain good next technical batches.

NEXT STEP
- Move to Alpha Hardening Batch 3: stricter artifact schemas, artifact index validation, digest verification, snapshot freshness/invalidation rules, and optional dogfood regression harness.
