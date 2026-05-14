# AGENTS

This repository is Rekon.

Rekon is open-source from the first commit. Treat public APIs, docs, package boundaries, examples, and contributor experience as product surfaces.

Before any major architecture, public API, capability, or artifact-shape work, read [docs/strategy/north-star.md](docs/strategy/north-star.md). Use [docs/strategy/roadmap.md](docs/strategy/roadmap.md) for sequencing. If a planned change would contradict the NorthStar, stop and update the strategy docs before shipping.

Before implementing:

1. Identify the package boundary being changed.
2. Confirm whether the change affects public API.
3. Add or update tests for public behavior.
4. Do not import from the old codebase-intel repo.
5. Built-in capabilities must use the public SDK.
6. Generated artifacts must include schema version, producer, input refs, and provenance.
7. Do not add a capability unless it declares consumes, produces, permissions, and invalidation rules.
8. Prefer small package-local changes over cross-package shortcuts.
9. Do not hide breaking API changes in implementation code; update docs and changelog.
10. Every phase must end with verification evidence.

Naming:

- Product/system: Rekon
- CLI: rekon
- Workspace directory: .rekon/
- Environment prefix: REKON_
- Package scope working convention: @rekon/*
- Old repo is codebase-intel-classic and may be used only as reference, fixture, or migration source. Do not import from it.

Required checks:

- npm run typecheck
- npm run test
- npm run build
- npm run lint if lint is configured

Process:

- During solo alpha development, push directly to `main` after required checks pass.
- Do not create branches unless explicitly requested.
- Switch to branches and PRs when external contributors arrive, packages are published, users rely on `main`, risky source-writing actuator work begins, breaking public API changes are planned, or release candidate work begins.

Completion summary must include:

- CHANGES MADE
- PUBLIC API CHANGES
- TESTS / VERIFICATION
- INTENTIONALLY UNTOUCHED
- RISKS / FOLLOW-UP
- NEXT STEP

For major capability work, include a CODEBASE-INTEL ALIGNMENT section that names:

- Classic capability or failure mode being addressed
- Relevant classic files/systems (e.g., `services/IssueDetectionService.ts`, `lib/context/resolver.ts`, `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`)
- What Rekon keeps from the classic behavior
- What Rekon simplifies
- What Rekon does not port yet
- How this advances migration phase per [docs/strategy/classic-behavior-roadmap.md](docs/strategy/classic-behavior-roadmap.md)

Do not implement a new Rekon capability only because it is generally useful. Every capability should distill, generalize, or prepare migration for a proven `codebase-intel-classic` behavior unless explicitly marked as experimental exploration. Use [docs/strategy/classic-behavior-distillation.md](docs/strategy/classic-behavior-distillation.md), [docs/strategy/classic-wins.md](docs/strategy/classic-wins.md), [docs/strategy/classic-refactor-principles.md](docs/strategy/classic-refactor-principles.md), and [docs/strategy/classic-alignment-map.md](docs/strategy/classic-alignment-map.md) as the anchors.
