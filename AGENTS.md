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

When agents need a coherent Rekon intelligence state for a target repo (architecture summary, resolvers, governance artifacts), prefer `rekon refresh --root <path> --json` over running the per-phase verbs manually. `rekon refresh` orchestrates the full lifecycle in the documented order and reports a structured per-step verdict. See [docs/concepts/refresh.md](docs/concepts/refresh.md) for the latest-major freshness rule and the `--skip-publish` / `--skip-freshness` opt-outs.

When agents need a current operating contract for the target repo — durable operating rules, resolver workflow, current ownership/governance state, proof status, ranked memory guidance, required checks, and anti-gaming reminders, all generated from current artifacts — run `rekon publish agent-contract --root <path> --json`. The output Publication is written to `.rekon/artifacts/publications/agent-contract.md`. See [docs/concepts/agent-operating-contract.md](docs/concepts/agent-operating-contract.md). The publisher never overwrites the repository's root `AGENTS.md`.

To materialize the generated contract to a repo-local path, run `rekon agent-contract export --root <path> --output <output-path> [--force] --json`. The export is safe by default: it refuses to overwrite existing files, protected agent-instruction paths (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/*.md`, `.github/copilot-instructions.md`), and any path outside the repo root unless `--force` is provided. The written file carries a generated preamble citing the source Publication and pointing to `.rekon/artifacts` as canonical truth.

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

For any major capability, resolver, publisher, actuator, memory, freshness, issue, or orchestration work, include the following two sections in the review packet:

PURPOSE PRESERVATION CHECK

- Original problem (what failure mode caused the classic subsystem to exist)
- Classic workflow guarantee (what the classic implementation guaranteed operationally — more specific than "it generated docs" or "it detected issues")
- Classic shape that provided the guarantee (services / handlers / modules)
- Rekon equivalent guarantee (the artifact / capability / command / workflow that preserves the same guarantee)
- What would mean we failed (specific failure modes ruled out by this batch)
- Regression test for the original problem (concrete test or dogfood check that proves Rekon still solves the original problem)

CODEBASE-INTEL ALIGNMENT

- Classic capability or failure mode being addressed
- Relevant classic files/systems (e.g., `services/IssueDetectionService.ts`, `lib/context/resolver.ts`, `packages/product-codebase-intel/src/reconcile/PlanExecutorService.ts`)
- What Rekon keeps from the classic behavior
- What Rekon simplifies
- What Rekon does not port yet
- How this advances migration phase per [docs/strategy/classic-behavior-roadmap.md](docs/strategy/classic-behavior-roadmap.md)

Anchor every proposal in the existing strategy docs:

- [docs/strategy/classic-guarantees-audit.md](docs/strategy/classic-guarantees-audit.md) is the per-subsystem source of truth for workflow guarantees.
- [docs/strategy/classic-guarantee-regression-plan.md](docs/strategy/classic-guarantee-regression-plan.md) is the P0/P1/P2 test plan.
- [docs/strategy/classic-subsystem-purpose-map.md](docs/strategy/classic-subsystem-purpose-map.md) is the quick-reference map; read it first.
- [docs/strategy/classic-behavior-distillation.md](docs/strategy/classic-behavior-distillation.md), [docs/strategy/classic-wins.md](docs/strategy/classic-wins.md), [docs/strategy/classic-refactor-principles.md](docs/strategy/classic-refactor-principles.md), and [docs/strategy/classic-alignment-map.md](docs/strategy/classic-alignment-map.md) carry the underlying behavior cards, wins, refactor rules, and role-mapping table.

Do not implement a new Rekon capability only because it is generally useful. Every capability should distill, generalize, or prepare migration for a proven `codebase-intel-classic` behavior unless explicitly marked as experimental exploration.

Do not call classic orchestration "weight" unless the work order identifies which guarantee is preserved elsewhere. Implementation coupling may be simplified; workflow guarantees must be preserved or explicitly deferred. If your batch defers a guarantee, say so and name the entry in [classic-guarantees-audit.md](docs/strategy/classic-guarantees-audit.md) you are deferring.
