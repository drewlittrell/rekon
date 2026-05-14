# Roadmap

This roadmap sequences post-NorthStar work. It distinguishes:

- **Completed alpha spine.** Things that already ship under
  `0.1.0-alpha.x`.
- **Committed direction.** Hardening batches that come before the first
  publishable alpha release.
- **Future expansions.** Ideas under consideration. These may shift before
  they ship.

The NorthStar (see [north-star.md](north-star.md)) constrains what may
appear here. Anything that contradicts the NorthStar must come with an
explicit NorthStar update.

## Completed Alpha Spine

- Kernel packages:
  `@rekon/kernel-artifacts`, `@rekon/kernel-evidence`,
  `@rekon/kernel-snapshot`, `@rekon/kernel-graph`,
  `@rekon/kernel-repo-model`, `@rekon/kernel-rulebook`,
  `@rekon/kernel-findings`.
- Public SDK: `@rekon/sdk` capability definition, in-memory registry,
  validation helpers, conformance helpers (`validateCapability`,
  `assertCapabilityConforms`).
- Local runtime: `@rekon/runtime` artifact store, snapshot construction,
  lifecycle execution, permission enforcement, and artifact index
  validation (`validateArtifactIndex`).
- CLI: `@rekon/cli` exposing init, capabilities, observe, project,
  snapshot, evaluate, resolve preflight, publish, memory, intent,
  reconcile, and artifact inspection/validation commands.
- Built-in capabilities:
  `@rekon/capability-js-ts`, `@rekon/capability-model`,
  `@rekon/capability-graph`, `@rekon/capability-policy`,
  `@rekon/capability-resolver`, `@rekon/capability-docs`,
  `@rekon/capability-memory`, `@rekon/capability-intent`,
  `@rekon/capability-reconcile`.
- Explainable `resolve.preflight` `ResolverPacket` with
  `resolutionTrace` covering ownership precedence, fallbacks, finding and
  memory checks, and risk decisions.
- Onboarding docs, custom capability example, artifact integrity tests,
  conformance test suite, optional `REKON_DOGFOOD_CLASSIC_ROOT` dogfood
  regression harness.
- Generic per-handler CLI dispatch for evaluators, resolvers, and
  publishers (`rekon evaluate list/run`, `rekon resolve list/run`,
  `rekon publish list/run`). External capabilities operate through the same
  CLI surface as built-ins; friendly workflow shortcuts (`evaluate`,
  `resolve preflight`, `publish agents`) remain. Generic actuator and
  learner dispatch are intentionally deferred — actuators because of
  irreversibility risk, learners because explicit memory commands already
  cover the surface.
- First migrated external rule pack: `examples/import-boundary-rule-pack`
  ships an evaluator-only capability mapped to classic import-governance
  behavior. It produces `import_boundary.parent_relative_import` (medium)
  and `import_boundary.generated_output_import` (high) findings against
  the JS/TS `EvidenceGraph`.
- Resolver phase expansion: `@rekon/capability-resolver` registers
  `resolve.route`, `resolve.seam`, `resolve.preflight`, and
  `resolve.issue`. CLI friendly shortcuts and generic dispatch both
  cover all four. Each packet shares `resolverId`, `phase`,
  `resolutionTrace`, `warnings`, `nextSteps`, and a
  `nextRequiredResolver` recommendation so the route → seam →
  preflight → (issue) flow stays explicit.
- Finding lifecycle: `@rekon/kernel-findings` ships
  `FindingStatusDecision`, `FindingStatusLedger`, `EffectiveFinding`,
  and `FindingLifecycleReport`. `@rekon/runtime` adds
  `buildFindingLifecycleReport`. CLI commands `rekon findings list`,
  `rekon findings lifecycle`, `rekon findings status list`, and
  `rekon findings status set` preserve `accepted`/`ignored`/`resolved`
  state across runs. `resolve.issue` annotates matched findings with
  their effective status and warns on accepted/ignored/resolved
  matches.
- Coherency delta lite: `@rekon/kernel-findings` adds `CoherencyDelta`
  (items, severity/system/type summary, top paths, remediation
  queue). `@rekon/runtime.buildCoherencyDelta` derives a delta from
  the latest `FindingLifecycleReport`, assigning systems via
  `OwnershipMap` then `ObservedRepo` then an `unknown` fallback.
  `rekon coherency delta` writes the artifact. Active counts exclude
  accepted/ignored/resolved findings; remediation priority maps
  `critical`/`high` → `p0`, `medium` → `p1`, `low` → `p2`.
- Architecture summary publisher: `@rekon/capability-docs` registers a
  second publisher, `@rekon/capability-docs.architecture-summary`,
  that consumes the latest `IntelligenceSnapshot`, `ObservedRepo`,
  `OwnershipMap`, `CapabilityMap`, `CoherencyDelta`, and
  `FindingLifecycleReport` and emits a Markdown governance summary
  with repo overview, owner systems, capability map, coherency
  summary, top affected paths, remediation queue, agent guidance, and
  input refs. `rekon publish architecture` invokes it.
- Remediation work orders: `@rekon/capability-intent` registers a
  second actuator, `@rekon/capability-intent.remediation-work-order`,
  that consumes the latest `CoherencyDelta` (and optional
  `FindingLifecycleReport` / `ResolverPacket`) to produce
  `IntentMap`, `WorkOrder`, and `VerificationPlan` artifacts from the
  active `remediationQueue`. Accepted/ignored/resolved findings are
  excluded. The work order includes explicit anti-gaming guardrails;
  the verification plan adds `rekon artifacts validate` and `rekon
  artifacts freshness` to the standard typecheck/test/build commands.
  `rekon intent remediation` invokes it with optional `--finding`,
  `--priority`, and `--limit` flags. Existing
  `@rekon/capability-intent.work-order` (resolver-based) is
  unchanged.

## Committed Direction: Hardening Batches

Each batch is a small, atomic step before the first publishable alpha
release.

### Alpha Release Readiness

Goal: lock down public surfaces and make a release verifiable without
publishing anything.

- Store the durable NorthStar plan in `docs/strategy/`.
- Add public API stability labels to package READMEs and key docs.
- Implement `scripts/audit-package-exports.mjs` to verify package shape
  and naming.
- Implement `scripts/publish-dry-run.mjs` to surface tarball contents and
  warnings without publishing.
- Implement `scripts/install-smoke.mjs` (or equivalent) to verify a
  consumer can install Rekon packages from packed local artifacts or
  workspace build output.
- Implement `scripts/audit-license.mjs` for root and per-package license
  consistency.
- Add `docs/release/alpha-release-checklist.md` for `0.1.0-alpha.1`.

### Publish Dry-Run

Goal: prove the published tarball would contain the right files and not
contain `.rekon/` outputs, `.codebase-intel`, or accidental local paths.

- `npm pack --dry-run` (or equivalent) per workspace package.
- Aggregate warnings into a single report.
- Block releases where required build outputs are missing.

### Package Export Audit

Goal: keep `@rekon/*` public surfaces consistent.

- Inspect every `packages/*/package.json` for name, version, type, exports,
  main/types, files, and license.
- Verify README presence and lack of forbidden tokens
  (`.codebase-intel`, `CODEBASE_INTEL`).
- Verify no imports from old codebase-intel.

### Install-From-Build / Install-From-Tarball Smoke

Goal: prove the CLI works for an outside consumer.

- Phase one: install or link from the local build output and run the
  golden CLI flow against `examples/simple-js-ts`.
- Phase two (next batch): install from `.tgz` tarballs created by
  `npm pack` and rerun the flow.

### Stability Labels

Goal: contributors know what is safe to depend on.

Labels:

- `stable`: changes follow semver. Public, supported.
- `experimental`: public, but subject to change before stable release.
- `internal`: package-private. Do not depend on it externally.
- `deprecated`: scheduled for removal; consumers should migrate.

For alpha:

- Kernel artifact contracts: `experimental, public`.
- SDK manifest/conformance helpers: `experimental, public`.
- Runtime local artifact store and lifecycle APIs: `experimental, public`.
- CLI commands: `experimental, public`.
- Built-in capability internals: `experimental, public where exported`.
- Package-private helpers: `internal`.

## Future Expansions

These are intentionally aspirational. They may change shape, be reordered,
or be deferred.

### Language And Framework Packs

- Python, Ruby, Go, Rust, Java, Swift, Kotlin evidence providers.
- Framework packs: Rails, Django, Next.js, Remix, NestJS, FastAPI, etc.
- Cross-language ownership and architecture graphs.

### Runtime Truth

- Trace ingestion for runtime call graphs and ownership.
- Telemetry-backed validation that observed architecture matches code.
- Optional integration with CI test results and coverage data.

### Watcher And Freshness Engine

- File-change watching that updates `.rekon/` incrementally.
- Real freshness tracking on the artifact index.
- Stale-detection driven by `invalidatedBy` rules.

### GitHub / CI Surface

- A GitHub-side surface that posts publications and findings on PRs.
- CI integrations for evidence, evaluation, and resolver preflight.
- Verification plans tied to checks.

### Publications Expansion

- Architecture diagrams as publications.
- Auto-generated onboarding tours.
- AI-friendly capability index documents.

### Memory Curation And Promotion

- Operator review of memory entries.
- Promotion paths from memory to rulebook entries with explicit gating.
- Conflict resolution between memory and findings.

### Intent And Work-Order Maturity

- Richer work-order schema covering acceptance criteria and rollout plans.
- Stronger ties between intent, verification plans, and reconciliation.

### Reconciliation Maturity

- Source-writing reconciliation with sandboxed dry-runs and human approval.
- Bidirectional reconciliation between source and architecture artifacts.

### Optional SaaS / Dashboard

- Hosted dashboard or organization-wide view as a publication surface.
- Strictly optional. The local-first substrate remains primary.

## Sequencing Notes

- Hardening batches come before publishing packages. Do not publish until
  the alpha release checklist clears.
- Capability and language packs come after the hardening batches.
- Source-writing reconciliation must follow watcher and freshness work,
  not precede it.
- Hosted surfaces come last.

## Classic Behavior Alignment

Most committed-direction and future-expansion items above trace back to
hard-won behavior in `codebase-intel-classic`. The dedicated distillation
docs explain which wins each item preserves and how:

- [classic-behavior-distillation.md](classic-behavior-distillation.md)
- [classic-wins.md](classic-wins.md)
- [classic-to-rekon-translation.md](classic-to-rekon-translation.md)
- [classic-refactor-principles.md](classic-refactor-principles.md)
- [classic-behavior-roadmap.md](classic-behavior-roadmap.md)
- [classic-alignment-map.md](classic-alignment-map.md)

## Cross-References

- [NorthStar](north-star.md)
- [Capability model](capability-model.md)
- [codebase-intel-classic migration](codebase-intel-classic-migration.md)
- [Classic behavior distillation](classic-behavior-distillation.md)
- [Classic wins](classic-wins.md)
- [Classic-to-Rekon translation](classic-to-rekon-translation.md)
- [Classic refactor principles](classic-refactor-principles.md)
- [Classic behavior roadmap](classic-behavior-roadmap.md)
- [Classic alignment map](classic-alignment-map.md)
- [Alpha release checklist](../release/alpha-release-checklist.md)
