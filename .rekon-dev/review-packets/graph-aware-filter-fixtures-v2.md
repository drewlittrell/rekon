# Review Packet: Graph-Aware Filter Fixture Coverage v2

Slice: P1.1 (Issue Adjudication),
graph-aware-filter-fixtures-v2 slice.
Implements step 27 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

Closes the remaining graph-aware coverage gap.
Combined with the first fixture-expansion batch
(`702afbf`), every graph-aware reason now has
end-to-end regression coverage under
`tests/fixtures/graph-aware-filters/`. Three new
fixtures + a positive/negative contract test add
coverage for `route-http-middleware-only` (positive +
negative cases), `factory-file-creates-deps`, and
`module-gate-verified-caller`. Tests assert *current*
attribution accurately — they do NOT force
EvidenceGraph attribution where the current filter
design uses path evidence.

## CHANGES MADE

### New: `tests/fixtures/graph-aware-filters/route-http-middleware-only/`

Multi-route source tree with both a positive and a
negative case:

- `src/api/session/route.ts` — imports
  `../../infra/http/auth` + `../../infra/Identity/session`
  (both under the allowed `/infra/http/` and
  `/infra/Identity/` prefixes). Positive case fires
  `route-http-middleware-only` via the EvidenceGraph
  branch (v4 graph-aware import-fact consumer
  prefers EvidenceGraph; `listImportTargetsForFile`
  handles the legacy producer subject shape).
- `src/api/bad/route.ts` — imports
  `../../infra/Database/client` (a non-allowed
  infra import). Negative case correctly KEEPS the
  finding — the graph-aware filter must NOT
  over-suppress when any non-allowed infra import
  is present.
- Supporting files:
  `src/infra/http/auth.ts`,
  `src/infra/Identity/session.ts`,
  `src/infra/Database/client.ts` (so the route's
  imports resolve and the JS/TS producer emits
  import facts).
- `package.json` (minimal).

After `rekon refresh`, the produced `EvidenceGraph`
carries:

- import facts for `src/api/session/route.ts` →
  `../../infra/http/auth` and
  `../../infra/Identity/session`.
- import fact for `src/api/bad/route.ts` →
  `../../infra/Database/client`.
- file facts for every source file.
- export facts for `GET`, `requireAuth`,
  `sessionIdentity`, `db` from their respective
  files.

### New: `tests/fixtures/graph-aware-filters/factory-file/`

Single-file source tree:

- `src/core/services/widgets/WidgetFactory.ts` —
  exports `createWidgetService()`. The
  `core/services/<name>/init/**` path heuristic and
  the `Factory.ts` filename heuristic both match.
- `package.json` (minimal).

After `rekon refresh`, the produced `EvidenceGraph`
carries the expected `file` + `export` facts. The
v2 graph-aware `factory-file-creates-deps` check
fires via path-evidence (`Factory.ts` filename
match) with `usedArtifacts: []`. The
evidence-source classifier maps `[]` to
`DetectorDetails`.

### New: `tests/fixtures/graph-aware-filters/module-gate/`

Single-file source tree:

- `src/modules/payments/PaymentGateEvaluator.ts` —
  exports `evaluatePaymentGate()`. The
  `GateEvaluator` substring in the path is the
  strongest single signal of the module-gate
  check.
- `package.json` (minimal).

After `rekon refresh`, the produced `EvidenceGraph`
carries the expected `file` + `export` facts. The
v2 graph-aware `module-gate-verified-caller` check
fires via the GateEvaluator path signal with
`usedArtifacts: []`, attributing as
`DetectorDetails`.

### New: `tests/contract/graph-aware-filter-fixtures-v2.test.mjs`

6 contract tests covering the three new fixtures:

1. **Route-http positive.** Asserts the route's
   imports are in the EvidenceGraph; seeds the
   finding; runs filter + filter-health; pins
   `route-http-middleware-only` match with
   `evidenceSource: "EvidenceGraph"`, EvidenceGraph
   citation in `inputRefs`, raw `FindingReport`
   byte-preserving the finding,
   `graphAwareByEvidenceSource.EvidenceGraph >= 1`,
   `graphAwareReasonEvidenceSources["route-http-middleware-only"].EvidenceGraph >= 1`,
   lifecycle exclusion, and the evidence string
   mentions `EvidenceGraph`.
2. **Route-http negative.** Seeds a finding on
   `src/api/bad/route.ts`; asserts the finding
   appears in `keptFindings` (not filtered);
   asserts no `route-http-middleware-only` entry
   exists for the finding id; AND additionally
   asserts no `route-http-middleware-only` entry
   appears anywhere in the filter report
   (belt-and-suspenders against over-suppression
   regressions).
3. **Factory-file.** Asserts the file fact exists;
   seeds the finding; pins
   `factory-file-creates-deps` match with
   `evidenceSource: "DetectorDetails"`, NO
   EvidenceGraph in `inputRefs` (precise inputRefs
   from the v2 graph-aware filter provider — only
   artifacts that actually contributed get cited),
   evidence text mentions `path-evidence`,
   `graphAwareByEvidenceSource.DetectorDetails >= 1`,
   `graphAwareReasonEvidenceSources["factory-file-creates-deps"].DetectorDetails >= 1`,
   lifecycle exclusion.
4. **Module-gate.** Asserts the file fact exists;
   seeds the finding; pins
   `module-gate-verified-caller` match with
   `evidenceSource: "DetectorDetails"`, NO
   EvidenceGraph in `inputRefs`, evidence text
   mentions `GateEvaluator`,
   `graphAwareByEvidenceSource.DetectorDetails >= 1`,
   `graphAwareReasonEvidenceSources["module-gate-verified-caller"].DetectorDetails >= 1`,
   lifecycle exclusion.
5. **Publication rendering.** Reruns the route-http
   positive case through `publish architecture` +
   `publish agent-contract`. Asserts the
   architecture summary's `### Graph-Aware Evidence
   Sources` section renders an `EvidenceGraph` row
   AND the `route-http-middleware-only` reason
   appears in the per-reason × per-source table.
   Asserts the agent contract's compact
   `Graph-aware evidence sources:` list mentions
   `EvidenceGraph`. Proves the new fixture-driven
   evidence reaches the user-facing publication
   surfaces.
6. **artifacts validate smoke** across all three v2
   fixtures.

Reusable helpers in the test:

- `withFixtureCopy(name, callback)` — copies the
  named fixture to a `mkdtemp` tmpdir, runs
  `rekon init`, invokes the callback, and cleans
  up afterward. Committed fixtures are never
  mutated.
- `seedFindingReport(root, evidenceGraph,
  findings)` — writes a synthetic `FindingReport`
  whose `header.inputRefs` cites the latest
  EvidenceGraph.
- `assertGraphAwareMatch({ root, findingId,
  expectedReason, expectedSource,
  expectInputRef, expectEvidenceText })` —
  parameterized end-to-end assertion. Supports
  both EvidenceGraph and DetectorDetails
  attribution; correctly asserts EvidenceGraph
  presence/absence in `inputRefs` based on whether
  the graph branch fired.
- `assertLifecycleExcludes(root, findingId)` —
  runs lifecycle / adjudication / coherency and
  asserts the graph-filtered finding is not in
  the active lifecycle.
- `readLatestArtifactJson(root, type, category?)`
  + `readLatestPublicationByPrefix(root, prefix)`
  — same shape as the v1 fixture test.

## PUBLIC API CHANGES

None. This batch is fixture / test additions plus
doc updates. No runtime code touched.

- No producer change.
- No helper change.
- No graph-aware filter change.
- No `@rekon/*` package source modified.
- No artifact `schemaVersion` bump.
- No new artifact type.
- No new capability role.
- No new CLI subcommand or flag.
- No new reason codes.

## PURPOSE PRESERVATION CHECK

**Original problem.** Graph-aware filtering had
fixture coverage for some EvidenceGraph-backed
branches (`route-handler-with-service`,
`external-api-comment-only`,
`nextjs-route-convention`) but not all
graph-aware checks. Without complete fixture
coverage, future changes to
provider/export/import evidence could silently
break factory/module-gate/middleware checks.
Operator reviews needed stable fixture data for all
graph-aware reasons, not just the first three.

**Classic shape preserved.** codebase-intel-classic
graph/ontology filtering used structural repo
evidence to suppress false positives before
active issue governance. Rekon now proves each
graph-aware reason has deterministic
artifact-backed fixture coverage or explicitly
documents why not (factory + module-gate use path
evidence by current design; the test pins this
accurately).

**Rekon equivalent guarantee, now complete:**

- Each graph-aware reason has at least one
  fixture-driven test (six reasons, six fixtures
  total across the two fixture-expansion batches).
- Filtered findings remain auditable (the contract
  test asserts the raw `FindingReport` still
  contains the finding after the filter run).
- Raw `FindingReport` remains unchanged
  (artifact-first invariant).
- `FindingFilterHealthReport` shows graph-aware
  evidence attribution
  (`graphAwareByEvidenceSource`,
  `graphAwareReasonEvidenceSources`).
- Publications continue to surface graph-aware
  evidence-source diagnostics (verified by the
  publication-rendering test).

**Regression test for original problem:** the new
contract test file IS the regression test. It
exercises every previously-uncovered graph-aware
reason end-to-end and pins attribution exactly as
the current implementation produces it. A future
change to the producer that breaks file/import
extraction would surface as a fixture-test
failure first; a future change to the graph-aware
filter implementation that shifts attribution
would surface in this test before reaching
publications.

**What would mean we failed (prevented by tests):**

- A graph-aware reason remains untested in an
  end-to-end fixture → **prevented;** all six
  reasons now have dedicated fixture coverage.
- A fixture fires because of detector-details
  fallback when it was intended to prove
  EvidenceGraph/ObservedRepo evidence →
  **prevented;** test 1 (route-http positive)
  explicitly asserts `evidenceSource:
  "EvidenceGraph"` AND EvidenceGraph in
  `inputRefs`; if the fixture fell back to
  details, the test would fail loudly.
- Negative cases are missing, allowing
  over-filtering regressions → **prevented;** test
  2 (route-http negative) explicitly asserts the
  finding is KEPT when the route imports
  `/infra/Database/...`.
- Tests mutate committed fixture directories →
  **prevented;** all tests use `mkdtemp` + `cp`
  to operate on tmpdir copies.

## CODEBASE-INTEL ALIGNMENT

**Classic capability:** graph/ontology-informed
false-positive filtering needs reliable structural
evidence and regression fixtures.

**Relevant classic files / systems aligned to:**

- `infra/validation/GraphOntologyValidator.ts`
- `services/IssueDetectionService.ts`
- `services/issues/content-filter-ruleid.ts`
- `services/issues/filter-health.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`

**What Rekon keeps:**

- Structural filtering must be artifact-backed
  where possible.
- Filtered findings remain auditable.
- Diagnostics should show evidence-source
  attribution.
- Raw findings remain immutable.
- Fixtures should be deterministic and safe to
  regenerate.

**What Rekon simplifies:**

- Fixtures and tests only.
- No new filtering logic.
- No producer migration.
- No schema bump.
- No dashboard / PR / CI surface.

## FIXTURES ADDED

| Fixture | Files | Drives | Current attribution |
| --- | --- | --- | --- |
| `route-http-middleware-only` (positive) | `src/api/session/route.ts`, `src/infra/http/auth.ts`, `src/infra/Identity/session.ts`, `package.json` | `route-http-middleware-only` | EvidenceGraph (v4 import-consumer branch) |
| `route-http-middleware-only` (negative) | `src/api/bad/route.ts`, `src/infra/Database/client.ts` (shared package.json) | n/a — graph-aware filter correctly does NOT fire | n/a |
| `factory-file` | `src/core/services/widgets/WidgetFactory.ts`, `package.json` | `factory-file-creates-deps` | DetectorDetails (path-evidence branch; `usedArtifacts: []`) |
| `module-gate` | `src/modules/payments/PaymentGateEvaluator.ts`, `package.json` | `module-gate-verified-caller` | DetectorDetails (GateEvaluator path signal; `usedArtifacts: []`) |

All four cases (one negative) are covered by the
contract test. All fixtures are small,
deterministic, regeneration-friendly via
`rekon refresh`, and live under `tests/fixtures/`
(not `examples/`).

## POSITIVE / NEGATIVE CASES

The `route-http-middleware-only` fixture is the
first graph-aware fixture to ship a *negative*
case. The positive case (`src/api/session/route.ts`)
imports only allowed `/infra/http/` and
`/infra/Identity/` modules so the filter fires; the
negative case (`src/api/bad/route.ts`) imports
`/infra/Database/...` so the filter must NOT fire
(it would be a false suppression of a real
architectural concern).

The contract test pins both:

- Test 1 asserts the positive route is filtered
  with `evidenceSource: "EvidenceGraph"`.
- Test 2 asserts the negative route is KEPT (it
  appears in `keptFindings`, NOT in
  `filteredFindings`, AND no `route-http-middleware-only`
  entry exists anywhere in the filter report).

This double-assertion shape catches regressions in
either direction: an over-suppression bug that
filters the bad route, or an under-suppression bug
that fails to filter the good route.

The factory and module-gate fixtures do not have
dedicated negative cases in this batch because the
positive cases (path-evidence branches) are
matched on filename or path substring, which is
already a narrow predicate. A future fixture could
add a `src/core/services/widgets/notAFactory.ts`
case to assert that arbitrary files in the same
directory don't trigger the filter, but the
existing graph-aware contract tests already cover
that scenario synthetically (see
`graph-aware-finding-filters-v2.test.mjs`).

## DIAGNOSTICS EXERCISED

For each fixture, the contract test asserts:

```
1. rekon refresh produces an EvidenceGraph with the
   expected import / file / export facts.
2. Seeded FindingReport cites that EvidenceGraph in
   header.inputRefs.
3. rekon findings filter produces a
   FindingFilterReport with:
     - filteredFindings entry for the positive
       case OR keptFindings entry for the negative
       case
     - reason = expected graph-aware reason (or
       absent, for negative)
     - evidenceSource matches CURRENT
       implementation (EvidenceGraph for the
       v4-consuming branch; DetectorDetails for
       path-evidence branches)
     - evidence string identifies the source
     - header.inputRefs includes EvidenceGraph
       ONLY when the EvidenceGraph branch fired
       (precise inputRefs from v2 graph-aware
       filter provider)
4. Raw FindingReport still contains the seeded
   finding (artifact-first invariant).
5. rekon findings filter-health produces a
   FindingFilterHealthReport with:
     - summary.graphAwareByEvidenceSource[<source>] >= 1
     - summary.graphAwareReasonEvidenceSources[<reason>][<source>] >= 1
6. Lifecycle / adjudication / coherency exclude
   the filtered finding.
7. rekon artifacts validate returns
   { valid: true, issues: [] }.
8. (Route-http positive only) rekon publish
   architecture + rekon publish agent-contract
   surface EvidenceGraph + route-http-middleware-only
   in their evidence-source surfaces.
```

Steps 1-7 run for every fixture. Step 8 runs once
(against the route-http positive case) to confirm
the new fixture data reaches the user-facing
publication surfaces; the other path-evidence
fixtures share the same publication infrastructure
so exercising one EvidenceGraph case is sufficient.

## TESTS / VERIFICATION

```sh
npm run typecheck
npm run test
npm run build
git diff --check
node scripts/audit-package-exports.mjs
node scripts/audit-license.mjs
node scripts/publish-dry-run.mjs
node scripts/install-smoke.mjs
node scripts/install-tarball-smoke.mjs
node packages/cli/dist/index.js refresh --root tests/fixtures/graph-aware-filters/route-http-middleware-only --json
node packages/cli/dist/index.js artifacts validate --root tests/fixtures/graph-aware-filters/route-http-middleware-only --json
```

All passed. Full suite: 861 passed / 1 skipped / 0
failed (6 new fixture-driven tests on top of the
prior 855).

**Fixture-mutation safety.** The contract test
uses `mkdtemp` + `cp -r` to operate on tmpdir
copies of each fixture; committed fixture
directories are never mutated. The CLI smoke
commands operate directly on the committed
fixture and produce `.rekon/` artifacts inside it;
those are git-ignored (per the repo's standard
ignore patterns for `.rekon/` paths). Manual
cleanup is the operator's responsibility for
manual smoke runs.

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts.extractImportFacts` /
  `extractExportFacts` / `extractSymbolFacts`
  producers — unchanged.
- `@rekon/kernel-findings.listImportTargetsForFile`
  / `fileImportsTargetMatching` /
  `listExportsForFile` / `listSymbolsForFile`
  helpers — unchanged.
- All six graph-aware filter checks
  (`graphFilterRouteHandlerWithService`,
  `graphFilterRouteHttpMiddlewareOnly`,
  `graphFilterExternalApiCommentOnly`,
  `graphFilterFactoryFileCreatesDeps`,
  `graphFilterModuleGateVerifiedCaller`,
  `graphFilterNextjsRouteConvention`) —
  unchanged.
- `applyFindingGraphFilters` /
  `applyFindingFilters` — unchanged.
- `EvidenceGraph` artifact `schemaVersion` —
  unchanged.
- `FindingFilterReport` /
  `FindingFilterHealthReport` shapes — unchanged.
- Filter pipeline behavior — unchanged.
- All CLI commands — no new flags, no new
  subcommands.
- All capability manifests — no new roles, no new
  produces/consumes.
- Reason codes — no new codes.
- LLM / semantic / fuzzy / embedding inference —
  permanently rejected.
- Source-file reads from filter logic — still
  rejected (the fixtures' source files are read by
  the producer at evidence-extraction time, NOT by
  filter logic at filter time).
- `examples/` directory — not touched. Regression
  fixtures live under `tests/fixtures/`.
- First-batch fixtures (`route-handler`,
  `external-comment`, `nextjs-route`) — untouched.

## RISKS / FOLLOW-UP

- **DetectorDetails attribution for path-evidence
  branches** is current behavior, not a bug. The
  factory + module-gate decisions set
  `usedArtifacts: []` (no graph artifact
  contributed); the evidence-source classifier
  maps this to `DetectorDetails`. If a future
  capability-role taxonomy ships (per the
  graph-aware filter provider v3 decision memo's
  deferred candidates), these checks could
  consume `CapabilityMap.entries[].role` or
  similar and attribute as `CapabilityMap` /
  `EvidenceGraph` instead. The test would need
  to update at that point.
- **`high-filter-rate` alert** fires on every
  fixture run (`filterRate = 1.0` because each
  fixture has 1 seeded finding and 1 filtered
  finding). This is a fixture-size artifact, not
  a real-world signal. The fixture tests do not
  assert on this alert.
- **Negative coverage gap.** Only the route-http
  fixture has a dedicated negative case. The
  factory and module-gate path-evidence branches
  are narrow enough (filename / path substring)
  that the synthetic test in
  `graph-aware-finding-filters-v2.test.mjs`
  covers their negative cases adequately. Future
  fixture work could add `src/not-a-factory.ts`
  or `src/regular/file.ts` files to assert
  arbitrary files in similar locations don't
  trigger the filters.
- **Producer-shape coupling.** Same as the first
  fixture batch — the fixtures rely on the
  current JS/TS producer's regex-based
  extraction behavior. Future producer changes
  that drop import / file / export facts entirely
  would surface as test failures.
- **Operator review v2 deferred.** The next
  recommended slice is *Graph-aware fixture
  coverage operator review v2* — rerun the prior
  operator review against the full six-fixture
  set to re-confirm Option C or identify trigger
  changes.

## NEXT STEP

Per the work order's "Next Step After This Batch"
section + ADR step 28:

> **Graph-aware fixture coverage operator review
> v2.**
>
> Re-run the operator review with all graph-aware
> reasons covered by fixtures. Confirm Option C
> still holds for alpha and identify any reasons
> that need stronger artifact-backed evidence.

That's a strategy / decision-memo refresh batch
(no runtime changes). It consumes the now-complete
six-fixture coverage and produces an updated
diagnostic table + trigger evaluation.

## CROSS-REFERENCES

- [Graph-aware import evidence operator review refresh memo](../../docs/strategy/graph-aware-import-evidence-operator-review-refresh.md)
- [Prior operator review memo](../../docs/strategy/graph-aware-import-evidence-operator-review.md)
- [Import fact subject-shape decision memo](../../docs/strategy/import-fact-subject-shape-decision.md)
- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [EvidenceGraph artifact](../../docs/artifacts/evidence-graph.md)
- [Graph-aware filter fixtures v1 review packet](graph-aware-filter-fixtures.md)
- [Graph-aware import-fact consumers v4 review packet](graph-aware-import-fact-consumers-v4.md)
- [Graph-aware import evidence publication diagnostics review packet](graph-aware-import-evidence-publication-diagnostics.md)
