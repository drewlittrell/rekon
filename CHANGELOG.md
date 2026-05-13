# Changelog

All notable changes to Rekon will be documented in this file.

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
