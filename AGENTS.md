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

For issue-governance work (anything touching `FindingReport`, `FindingFilterReport`, `FindingStatusLedger`, `FindingLifecycleReport`, `IssueAdjudicationReport`, `IssueMergeDecisionLedger`, or `CoherencyDelta`), identify in the review packet whether the batch is one of:

- **classic guarantee preservation** — restores or extends a guarantee codebase-intel-classic already provided. Cite the corresponding classic source files and the [issue governance ADR](docs/strategy/issue-governance-architecture-decision.md) layer.
- **Rekon reinterpretation** — preserves the same workflow guarantee but with a different artifact / capability shape. Explain the substitution.
- **Rekon product extension** — net-new behavior not present in classic. `IssueMergeCandidate`, `IssueMergeDecisionLedger`, accepted-merge rollups, and publication / resolver awareness of those rollups are the canonical examples. Product extensions are allowed but must be labeled explicitly; do not call them "classic parity" in CHANGELOG / strategy docs unless a new ADR promotes them.

See [docs/strategy/issue-governance-architecture-decision.md](docs/strategy/issue-governance-architecture-decision.md) for the layered model.

## Documentation authority

When documents conflict, or when you need current state, this order
governs:

1. **Source code, CLI output, and artifact schemas.** The system itself is
   the only authority on what exists. When any document contradicts a
   verifiable surface, the surface wins and the document is stale; flag
   it, do not obey it.
2. **`docs/strategy/rekon-system-model.md`.** The operator-approved system
   model. It wins over every other document.
3. **`docs/strategy/north-star.md` and `docs/strategy/roadmap.md`.**
   Living strategy.
4. **`docs/concepts/` and `docs/artifacts/`.** Living descriptions of
   current behavior and current contracts.
5. **Everything else in `docs/strategy/`.** Historical snapshots:
   point-in-time records of decisions, reviews, and audits. They are
   never current state, never citable as current state, and never a
   reason to override newer research or the tiers above. Among
   snapshots, the newer slice wins.

Rules of conduct:

- Never answer "what does Rekon have" or "what does Rekon do" from a
  strategy snapshot. Answer from tier 1, then tiers 2 through 4.
- When an operator or planning conversation has established a direction
  and a document contradicts it, surface the conflict explicitly. Do not
  silently defer to the document.
- New strategy memos are born as snapshots: they carry the snapshot
  banner from their first commit.
- Concepts docs are updated in place to describe current state. Do not
  append slice banners to them; history belongs in CHANGELOG.md and git.
- Do not add new `tests/docs` prose-assertion tests. That pattern is
  retired; document freshness is owned by the doc governance workstream.

Living-doc currency is testable: run `rekon docs freshness` (WO-7) and
read `docs/INDEX.md` before relying on a living document. `stale` means a
declared referent changed after the doc's last commit; `unknown` means
the doc has not enrolled - honest, not fresh. Snapshots never appear in
the status table; their banner is their contract.
