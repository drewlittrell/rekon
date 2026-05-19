# Review Packet — Factory / Module-Gate Artifact Evidence Strengthening v1

Combined strategy + implementation batch. No producer
change. No artifact `schemaVersion` bump. No new
artifact type. No new capability role. No new CLI
subcommand or flag. No new reason codes. No version
bump. No npm publish. **Behavior change** is narrow
and intentional: the two
`DetectorDetails`-attributed graph-aware reasons
(`factory-file-creates-deps`,
`module-gate-verified-caller`) now attribute as
`EvidenceGraph` against the committed fixtures and
fire artifact-backed when a file's symbol/export
names match canonical factory / gate-evaluator
patterns. Path / CapabilityMap / OwnershipMap
fallback branches survive.

## CHANGES MADE

**Filter code (`@rekon/kernel-findings`):**

- `packages/kernel-findings/src/index.ts` —
  - Added new top-priority branch A0 to
    `graphFilterFactoryFileCreatesDeps` that
    consumes EvidenceGraph symbol/export facts via
    `factoryArtifactEvidenceForFile`.
    `usedArtifacts: ["EvidenceGraph"]`.
  - Added new top-priority branch A0 to
    `graphFilterModuleGateVerifiedCaller` that
    consumes EvidenceGraph symbol/export facts via
    `gateEvaluatorArtifactEvidenceForFile`.
    `usedArtifacts: ["EvidenceGraph"]`.
  - Added supporting helpers
    `factoryArtifactEvidenceForFile`,
    `gateEvaluatorArtifactEvidenceForFile`,
    `collectSymbolExportNames`, `pickName`. All
    private to the file; not exported.

**New strategy memo:**

- `docs/strategy/factory-module-gate-evidence-strengthening.md`
  — combined decision + implementation memo with
  the required sections: Decision Summary, Current
  Baseline, Problem, Candidate Projection Targets,
  Decision, Implementation Shape, Fallback Policy,
  Tests Required, Deferred Work, Cross-References.

**New contract test:**

- `tests/contract/factory-module-gate-artifact-evidence.test.mjs`
  — 14 required assertions covering factory +
  module-gate EvidenceGraph attribution, evidence
  string symbol-name citation, path fallback when
  symbol/export names don't match, ObservedRepo
  branch via synthetic `OwnershipMap` +
  `ObservedRepo` with `kind: "module"`, path
  fallback when artifact + ObservedRepo evidence is
  missing, full `inputRefs` precision, raw
  `FindingReport` byte-preservation, lifecycle /
  adjudication / coherency excludes,
  `FindingFilterHealthSummary.graphAwareByEvidenceSource`
  count correctness, and `rekon artifacts validate`
  cleanliness.

**Updated contract test:**

- `tests/contract/graph-aware-filter-fixtures-v2.test.mjs`
  — fixture 5 (`factory-file`) and fixture 6
  (`module-gate`) tests now assert
  `evidenceSource: "EvidenceGraph"` (was
  `DetectorDetails`) with EvidenceGraph cited in
  `inputRefs` and evidence text matching the new
  artifact-backed evidence string. The v2 review's
  baseline diagnostic numbers (`EvidenceGraph 4,
  DetectorDetails 2`) are now superseded by
  `EvidenceGraph 6, DetectorDetails 0` against the
  committed fixtures — preserved in the v2 memo as
  the prior baseline for traceability.

**Supporting docs updated:**

- `docs/strategy/graph-aware-fixture-coverage-operator-review-v2.md`
  — banner notes the v3 strengthening slice
  superseded the baseline; Follow-Up Work flipped to
  shipped; cross-references add the new memo.
- `docs/strategy/graph-ontology-validator-lite-audit.md`
  — "Update" paragraph notes the v3 slice took
  the smallest viable approach (EvidenceGraph
  symbol/export only; no monolithic port; no
  source reads); cross-references add the new memo.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 29 flipped from `(future)` to `(shipped)`
  with full diagnostic + branch descriptions; new
  step 30 reserves "Per-module ObservedSystem
  projection + CapabilityMap role field"; new
  step 31 reserves "Graph-aware fixture coverage
  operator review v3"; the prior future step
  shifts to step 32.
- `docs/strategy/classic-behavior-roadmap.md` — new
  v1-strengthening entry below the v2-review entry
  with filter changes, fixture attribution, contract
  test summary, and deferred follow-ups.
- `docs/strategy/roadmap.md` — new
  factory-module-gate-evidence-strengthening entry
  above the operator-review-v2 entry.
- `docs/concepts/graph-aware-finding-filters.md` —
  Operator Review paragraph extended with the v3
  strengthening summary; post-strengthening
  aggregate attribution noted.
- `docs/concepts/finding-filters.md` — graph-aware
  bullet extended with the v3 strengthening pointer
  + post-strengthening aggregate attribution.
- `docs/artifacts/finding-filter-report.md` —
  Graph-Aware Filters section for
  `factory-file-creates-deps` and
  `module-gate-verified-caller` updated to describe
  the new EvidenceGraph branch precedence;
  cross-references add the new memo.
- `docs/artifacts/finding-filter-health-report.md` —
  cross-references add the new memo.
- `docs/artifacts/evidence-graph.md` —
  operator-review paragraph extended with the v3
  strengthening summary; post-strengthening
  aggregate attribution noted.
- `CHANGELOG.md` — new top-of-`0.1.0-alpha.1` entry
  summarizing the v3 strengthening slice.

**New review packet:**

- `.rekon-dev/review-packets/factory-module-gate-evidence-strengthening.md`
  (this file).

## PUBLIC API CHANGES

**None.** No exported type changes, no exported
function signature changes, no schema bumps, no
new artifact types, no new fact kinds, no new CLI
flags. The new helpers
(`factoryArtifactEvidenceForFile`,
`gateEvaluatorArtifactEvidenceForFile`,
`collectSymbolExportNames`, `pickName`) are
file-private to
`packages/kernel-findings/src/index.ts` and not
re-exported.

The only observable behavior change is **evidence
attribution** on the two strengthened filters —
files whose symbol/export names match the canonical
factory / gate-evaluator patterns now attribute as
`EvidenceGraph` (with EvidenceGraph cited in
`FindingFilterReport.header.inputRefs`) instead of
`DetectorDetails`.

## PURPOSE PRESERVATION CHECK

- **Original problem:**
  `factory-file-creates-deps` and
  `module-gate-verified-caller` previously fired via
  path evidence with `usedArtifacts: []`, mapping to
  `DetectorDetails` attribution. Path evidence is
  acceptable fallback, but it isn't as strong as an
  artifact projection that says "this file is a
  factory" or "this file is a gate evaluator." The
  v2 review identified strengthening these two as
  the next slice.
- **Classic guarantee:** classic graph / ontology
  filtering used the **strongest available
  deterministic structural evidence** to suppress
  false positives. The guarantee is not "every
  check uses EvidenceGraph"; it's "every suppression
  is justified by the strongest available
  deterministic evidence and remains auditable."
- **Rekon equivalent guarantee preserved:**
  - Both strengthened filters now consult artifact
    evidence first; path / CapabilityMap /
    OwnershipMap fallback branches survive.
  - `FindingFilterReport` continues to surface
    `evidenceSource` per row, so audit consumers can
    see which branch fired.
  - Raw `FindingReport` continues to byte-preserve
    every finding across filter runs (artifact-first
    invariant).
- **Failure modes avoided:**
  - Factory / module-gate are not "still only use
    DetectorDetails when artifact evidence exists" —
    the new branches fire first when symbol/export
    facts express the canonical role.
  - The checks do not "guess roles without artifact
    support" — both branches require an explicit
    symbol/export fact with a matching name (Factory
    / create*+factory-path / GateEvaluator /
    evaluate*Gate).
  - Path fallback is preserved — confirmed by tests
    3, 7, 8.
  - Evidence strings explicitly name the artifact
    signal that fired (e.g. "EvidenceGraph
    symbol/export facts show factory creator in
    'src/core/services/widgets/WidgetFactory.ts':
    createWidgetService.").
  - No broad `GraphOntologyValidator`-like behavior
    added; the strengthening is bounded to two
    filters and two narrowly-defined evidence
    patterns each.

## CODEBASE-INTEL ALIGNMENT

Aligned to:

- `infra/validation/GraphOntologyValidator.ts`
  (classic reference; intentionally not ported per
  the GraphOntologyValidator-lite audit).
- `services/issues/content-filter-ruleid.ts`,
  `services/issues/content-filters.ts`,
  `services/IssueDetectionService.ts` (classic
  filtering surface; the v3 strengthening is the
  Rekon-side equivalent of stronger structural
  evidence in classic).
- `services/GraphBuildProvider.ts`,
  `domain/graph/producers/**` (classic graph
  substrate; the v3 strengthening consumes Rekon's
  equivalent — EvidenceGraph symbol/export facts —
  without adding producer-side work).

What Rekon keeps:

- structural false-positive filtering remains
  auditable (`evidenceSource` per row);
- factory / module-gate suppressions are allowed
  only when deterministic evidence exists (artifact
  match OR path match OR CapabilityMap / OwnershipMap
  match);
- path evidence remains a fallback, not canonical
  truth;
- graph-aware filters consume Rekon artifacts, not
  source files;
- raw findings remain immutable.

What Rekon simplifies:

- only two filters strengthened;
- no monolithic validator port;
- no source reads at filter time;
- no AST / typechecker;
- no LLM / semantic / fuzzy inference;
- no import producer migration;
- no schema bump.

## DECISION SUMMARY

Use **EvidenceGraph symbol/export facts** as the new
top-priority evidence for `factory-file-creates-deps`
and `module-gate-verified-caller`. Defer
projector-side `ObservedSystem.kind` population
(broad churn; the capability-model projector emits
first-segment-only owner systems today, so kind
annotation on `src` would be wrong, and synthesizing
per-module systems requires re-routing OwnershipMap
entries). Keep all existing path / CapabilityMap /
OwnershipMap branches as fallback. The existing
`ObservedSystem.kind === "module"` branch in the
module-gate filter is unchanged and remains the
future entry point for a deferred projector slice.

## FACTORY EVIDENCE MODEL

`factoryArtifactEvidenceForFile(ctx, file)` collects
the union of symbol-fact and export-fact names for
`file` via
`collectSymbolExportNames(ctx, file)` (which calls
`listSymbolsForFile` + `listExportsForFile`), then:

1. **High confidence** when any name includes
   `"Factory"` (e.g. `WidgetFactory`,
   `FooFactoryImpl`, `defaultFactory`). Evidence
   text: `EvidenceGraph symbol/export facts show
   factory role in '<file>': <name>.`
2. **Medium confidence** when the file path
   includes `"Factory"` / `"factory"` AND any name
   starts with `"create"` (e.g.
   `createWidgetService` in `WidgetFactory.ts`).
   Evidence text: `EvidenceGraph symbol/export
   facts show factory creator in '<file>': <name>.`
3. Otherwise: return `null` → existing path /
   CapabilityMap branches run as fallback.

Tiebreak: when multiple names match a predicate, the
lexicographically smallest matching name is returned
by `pickName` so evidence strings are stable across
runs regardless of fact-iteration order.

`usedArtifacts: ["EvidenceGraph"]` →
`evidenceSourceFromGraphArtifacts(["EvidenceGraph"])`
→ `"EvidenceGraph"`.

## MODULE-GATE EVIDENCE MODEL

`gateEvaluatorArtifactEvidenceForFile(ctx, file)`
collects the same union of symbol + export names,
then:

1. **High confidence** when any name includes
   `"GateEvaluator"` (e.g. `PaymentGateEvaluator`,
   `FeatureGateEvaluatorImpl`). Evidence text:
   `EvidenceGraph symbol/export facts show gate
   evaluator role in '<file>': <name>.`
2. **Medium confidence** when any name matches
   `/^evaluate.*Gate/` (e.g.
   `evaluatePaymentGate`, `evaluateFeatureGate`,
   `evaluateSubscriptionGate`). Evidence text:
   `EvidenceGraph symbol/export facts show gate
   evaluator role in '<file>': <name>.`
3. Otherwise: return `null` → existing branches
   (GateEvaluator path → OwnershipMap +
   ObservedSystem.kind="module" → `/modules/`
   path) run as fallback.

`usedArtifacts: ["EvidenceGraph"]` →
`evidenceSourceFromGraphArtifacts(["EvidenceGraph"])`
→ `"EvidenceGraph"`.

## TESTS / VERIFICATION

**New contract test:**
`tests/contract/factory-module-gate-artifact-evidence.test.mjs`
(14 cases, all passing).

**Updated contract test:**
`tests/contract/graph-aware-filter-fixtures-v2.test.mjs`
— fixture 5 and fixture 6 now assert the new
EvidenceGraph attribution.

**Verification commands (all green):**
- `npm run typecheck` — clean
- `npm run build` — clean
- `npm run test` — full suite (recorded below)
- `git diff --check` — clean
- `node scripts/audit-package-exports.mjs` — passed
- `node scripts/publish-dry-run.mjs` — passed
- `node scripts/audit-license.mjs` — passed
- `node scripts/install-smoke.mjs` — passed
- `node scripts/install-tarball-smoke.mjs` — passed

**CLI smokes:**
- `node packages/cli/dist/index.js refresh --root tests/fixtures/graph-aware-filters/factory-file --json` — passed
- `node packages/cli/dist/index.js artifacts validate --root tests/fixtures/graph-aware-filters/factory-file --json` — `{ valid: true, issues: [] }`
- `node packages/cli/dist/index.js refresh --root tests/fixtures/graph-aware-filters/module-gate --json` — passed
- `node packages/cli/dist/index.js artifacts validate --root tests/fixtures/graph-aware-filters/module-gate --json` — `{ valid: true, issues: [] }`

(CLI smokes were run against temp copies of the
fixtures; the committed fixture directories under
`tests/fixtures/graph-aware-filters/` are not
mutated.)

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts` (import / export / symbol
  / ownership_hint / capability_hint fact
  producers) — unchanged.
- `@rekon/capability-model` projector — unchanged
  (per-module `ObservedSystem` synthesis deferred).
- `EvidenceGraph`, `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, `FindingReport`,
  `FindingFilterReport`, `FindingFilterHealthReport`
  schemas — unchanged. No `schemaVersion` bumps.
- `evidenceSourceFromGraphArtifacts` precedence —
  unchanged (EvidenceGraph > ObservedRepo >
  DetectorDetails; CapabilityMap classification as
  `DetectorDetails` documented as a deferred
  follow-up).
- All other graph-aware filter branches
  (`route-handler-with-service`,
  `route-http-middleware-only`,
  `external-api-comment-only`,
  `nextjs-route-convention`) — unchanged.
- CLI subcommands, flags, exit codes.
- Capability roles, capability templates.
- Public API exports across every package.
- `examples/**` — no user-facing example changes.
- The six committed fixtures under
  `tests/fixtures/graph-aware-filters/` — read-only
  via `withFixtureCopy`.

## RISKS / FOLLOW-UP

**Risks:**

- The new branches can fire on files whose symbol /
  export names match the canonical patterns even
  when the file path does NOT contain
  `Factory` / `GateEvaluator`. This is the intended
  behavior of artifact-backed strengthening (a
  `FooFactory` class in `src/services/foo.ts`
  legitimately suppresses the DI rule). The risk is
  that a non-factory file with a class accidentally
  named `*Factory` (e.g. a helper named
  `WidgetCacheFactory` that doesn't actually
  construct widgets) could now be suppressed. The
  mitigation:
  - the rule itself only fires for
    DI-specific ruleIds, so the cross-signal is
    strong;
  - operators can audit by reading the evidence
    string (it names the symbol that triggered the
    match) and the publication-facing per-reason
    attribution matrix;
  - configurable policy filtering still wins over
    graph-aware filtering (operators can add an
    explicit `findingFilters` policy if needed).
- The medium-confidence factory branch requires
  `create*` AND a Factory-path. A file named
  `WidgetFactory.ts` with ONLY a `createWidgetService`
  function (the fixture case) lifts attribution from
  `DetectorDetails` to `EvidenceGraph` for the same
  filtered finding — no behavior change beyond
  attribution.
- The module-gate `/^evaluate.*Gate/` regex is
  case-sensitive. Files with names like
  `evaluateGatePassword` would not match (no
  `Gate` after the prefix in the expected
  position), but `evaluatePaymentGate` does. The
  pattern is deliberately conservative.

**Follow-up work** (documented in
[`docs/strategy/factory-module-gate-evidence-strengthening.md`](../../docs/strategy/factory-module-gate-evidence-strengthening.md)):

- Per-module `ObservedSystem` projection
  (`@rekon/capability-model` projector emits
  `kind: "module"` ObservedSystems for
  `src/modules/<name>/` roots) — enables branch B
  of `graphFilterModuleGateVerifiedCaller` to fire
  from real fixtures.
- CapabilityMap `role` / `kind` field — first-class
  role declaration (`role: "factory"`,
  `role: "module-gate"`).
- `evidenceSourceFromGraphArtifacts` CapabilityMap
  precedence (today CapabilityMap-only matches
  classify as `DetectorDetails`).
- **Graph-aware fixture coverage operator review v3**
  — recommended next slice. Re-run the operator
  review against the post-strengthening attribution
  profile (now `EvidenceGraph: 6 / DetectorDetails:
  0` against the fixtures) and decide whether the
  graph-aware v1 / v2 / v3 arc is complete for
  alpha.

## NEXT STEP

**Graph-aware fixture coverage operator review v3.**

Re-run the operator review's data-gathering
protocol against the now-six deterministic
fixtures with the new attribution profile in
place. Confirm that the strengthening achieved the
intended shift from `DetectorDetails` to
`EvidenceGraph` for factory + module-gate without
breaking any other graph-aware reason. Decide
whether any remaining graph-aware reason needs
further strengthening, or whether the graph-aware
v1 / v2 / v3 arc is complete for alpha. Likely a
strategy-only memo, similar in shape to the v2
review.
