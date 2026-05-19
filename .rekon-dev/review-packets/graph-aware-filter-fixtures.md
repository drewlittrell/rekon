# Review Packet: Graph-Aware Filtering Fixture Expansion

Slice: P1.1 (Issue Adjudication),
graph-aware-filter-fixtures slice.
Implements step 25 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

Adds three deterministic regression fixtures and a
contract test that exercises the EvidenceGraph branches
of the graph-aware filter checks end-to-end. The
operator review at `2d6dc50` recorded that no available
local fixture produced graph-aware filter matches; this
batch closes that gap with real source-driven fixtures.

## CHANGES MADE

### New: `tests/fixtures/graph-aware-filters/route-handler/`

A two-file JS/TS source tree:

- `src/api/widgets/route.ts` — imports
  `./handler` and re-exports a `GET` handler that
  delegates work.
- `src/api/widgets/handler.ts` — exports
  `handleWidgets`.
- `package.json` — minimal
  (`name`, `version`, `type: "module"`, `private`).

After `rekon refresh`, the produced `EvidenceGraph`
carries:

- import facts: `route.ts → ./handler` (legacy
  `subject = "src/api/widgets/route.ts:./handler"`).
- export facts: `{ name: "GET", kind: "function" }`
  from `route.ts`; `{ name: "handleWidgets", kind:
  "function" }` from `handler.ts`.
- file facts: both files.

The contract test seeds a `routes.construct_and_inject_deps`
finding for `route.ts` with no `details.imports` — so
the graph-aware `route-handler-with-service` check must
fire via the EvidenceGraph import branch (not via
detector-imports fallback). Decision returns
`evidenceSource: "EvidenceGraph"`,
`usedArtifacts: ["EvidenceGraph"]`, evidence string
mentions EvidenceGraph.

### New: `tests/fixtures/graph-aware-filters/external-comment/`

A single-file source tree:

- `src/api/util.ts` — imports `leftpad` (no openai /
  openrouter / @openai/* SDK), and mentions "openai"
  in a comment-only docstring inside the exported
  `describeProvider` function.
- `package.json` — minimal.

After `rekon refresh`, the produced `EvidenceGraph`
carries:

- import facts: `util.ts → leftpad`.
- No external API SDK import. The contract test
  asserts this explicitly so a future regression in
  the producer (e.g. accidentally extracting comment
  text as an import) would surface immediately.

The contract test seeds an
`external_apis.calls_go_through_providers` finding for
`util.ts` with empty `details`. The graph-aware
`external-api-comment-only` check fires via the
EvidenceGraph import branch (graphImports = ["leftpad"],
no openai/openrouter → filter fires).

### New: `tests/fixtures/graph-aware-filters/nextjs-route/`

A single-file source tree:

- `src/app/api/route.ts` — exports
  `runtime = "edge"`, `dynamic = "force-dynamic"`, and
  an async `GET` handler.
- `package.json` — minimal.

After `rekon refresh`, the produced `EvidenceGraph`
carries:

- export facts:
  `{ name: "GET", kind: "function" }`,
  `{ name: "dynamic", kind: "const" }`,
  `{ name: "runtime", kind: "const" }` — all from
  `route.ts`.

The contract test seeds a
`routes.single_http_handler_export` finding for
`route.ts` with `details.otherExports: ["runtime",
"dynamic"]`. The graph-aware
`nextjs-route-convention` check (v3 substrate-backed)
reads `listExportsForFile`, computes
`extras = [dynamic, runtime]` (handler `GET` excluded),
confirms both are in the segment-config set, and
fires via the EvidenceGraph export-facts branch.

### New: `tests/contract/graph-aware-filter-fixtures.test.mjs`

5 contract tests:

1. **Route-handler fixture.** Asserts EvidenceGraph
   contains the expected import fact; seeds finding;
   runs filter + filter-health; pins
   `route-handler-with-service` match with
   `evidenceSource: "EvidenceGraph"`,
   EvidenceGraph citation in `inputRefs`, raw
   `FindingReport` byte-preserving the finding,
   `graphAwareByEvidenceSource.EvidenceGraph >= 1`,
   `graphAwareReasonEvidenceSources["route-handler-with-service"].EvidenceGraph >= 1`,
   lifecycle exclusion, and `artifacts validate`
   clean.
2. **External-comment fixture.** Same assertion shape
   for `external-api-comment-only`. Additionally
   asserts the EvidenceGraph contains no external-API
   SDK import.
3. **Nextjs-route fixture.** Same assertion shape for
   `nextjs-route-convention`. Additionally asserts
   the EvidenceGraph contains exports `GET`,
   `dynamic`, `runtime`.
4. **Publication rendering.** Reruns the route-handler
   fixture through `publish architecture` +
   `publish agent-contract`; asserts the architecture
   summary's `### Graph-Aware Evidence Sources`
   section + `EvidenceGraph` row render, and the
   agent contract's compact
   `Graph-aware evidence sources:` list mentions
   `EvidenceGraph`. Proves the fixture-driven
   evidence reaches the user-facing publication
   surfaces end-to-end.
5. **artifacts validate smoke** for all three
   fixtures.

Reusable helpers in the test:

- `withFixtureCopy(name, callback)` — copies the
  named fixture to a `mkdtemp` tmpdir, runs
  `rekon init`, invokes the callback, and cleans up
  afterward. Committed fixtures are never mutated.
- `seedFindingReport(root, evidenceGraph, findings)` —
  writes a synthetic `FindingReport` whose
  `header.inputRefs` cites the latest EvidenceGraph.
- `assertGraphAwareEvidenceGraphMatch({ root,
  findingId, expectedReason })` — encapsulates the
  end-to-end assertion suite. Used by tests 1-3.
- `assertLifecycleExcludes(root, findingId)` — runs
  `findings lifecycle` + `issues adjudicate` +
  `coherency delta` and asserts the graph-filtered
  finding is not in the active lifecycle.
- `readLatestArtifactJson(root, type, category?)` —
  category-scoped variant of the standard helper.
- `readLatestPublicationByPrefix(root, prefix)` —
  filters publications by their id prefix so we can
  pick the architecture-summary vs the agent-contract
  unambiguously.

## PUBLIC API CHANGES

None. This batch is fixture / test additions plus doc
updates. No runtime code touched.

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

**Original problem.** Graph-aware filtering is
intended to use structural EvidenceGraph /
ObservedRepo evidence, but local fixtures previously
did not exercise those branches. The diagnostics
surface shipped at `499d096` could exist but remained
unproven against real source-driven flows. Operator
decisions about future producer migration needed
measured evidence-source data.

**Classic shape preserved.** codebase-intel-classic's
graph/ontology filtering used structural repo
evidence to suppress false positives before active
issue governance. The guarantee is strongest when
fixtures prove structural evidence actually flows
through the pipeline. This batch produces exactly
that.

**Rekon equivalent guarantee, now demonstrated:**
- Fixtures run observe / project / evidence-graph
  generation, seed a representative FindingReport
  (citing the latest EvidenceGraph), run filter +
  filter-health, and show graph-aware filtering
  backed by EvidenceGraph.
- Filtered findings remain auditable (the contract
  test asserts the raw `FindingReport` still
  contains the finding after the filter run).
- Raw `FindingReport` remains unchanged
  (artifact-first invariant).
- `FindingFilterHealthReport.summary.graphAwareByEvidenceSource.EvidenceGraph
  >= 1` and
  `.graphAwareReasonEvidenceSources[<reason>].EvidenceGraph
  >= 1` for every fixture.

**Regression test for original problem:** the
contract test file IS the regression test. It runs
each fixture end-to-end and pins every assertion
needed to detect a regression in (a) the JS/TS
producer's import / export fact emission, (b) the
helper-compatibility predicate, (c) any graph-aware
filter's EvidenceGraph branch, (d) the
`evidenceSource` attribution machinery, (e) the
`FindingFilterHealthSummary` aggregation, and (f) the
architecture-summary + agent-contract publication
rendering.

**What would mean we failed (prevented by tests):**
- Fixtures seed EvidenceGraph manually when a real
  source file could produce it → **prevented;** tests
  run `rekon refresh` against real source files and
  inspect the producer's output before seeding the
  FindingReport.
- Tests only unit-test helpers and do not prove the
  end-to-end artifact pipeline → **prevented;** the
  contract test runs the full CLI pipeline
  (`refresh` → seed → `findings filter` →
  `findings filter-health` → `publish architecture`
  → `publish agent-contract` → `artifacts validate`).
- EvidenceGraph branches still do not fire →
  **prevented;** every test pins
  `evidenceSource: "EvidenceGraph"` and the
  `graphAwareByEvidenceSource.EvidenceGraph >= 1`
  invariant.
- Filter health still reports empty graph-aware
  diagnostics → **prevented;** every test pins the
  graph-aware diagnostics surface to
  `>= 1`.
- Tests mutate committed fixture config/artifacts →
  **prevented;** all tests use `mkdtemp` + `cp`
  to operate on tmpdir copies, then `rm -r --force`
  cleanup.

## CODEBASE-INTEL ALIGNMENT

**Classic capability or failure mode:**
graph/ontology-informed false-positive filtering with
reliable structural evidence.

**Relevant classic files / systems aligned to:**

- `infra/validation/GraphOntologyValidator.ts`
- `services/IssueDetectionService.ts`
- `services/issues/content-filter-ruleid.ts`
- `services/issues/filter-health.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`

**What Rekon keeps:**

- Structural filtering must be artifact-backed.
- Filtered findings remain auditable.
- Diagnostics should show evidence-source attribution.
- Raw findings remain immutable.
- Fixture evidence should be deterministic.

**What Rekon simplifies:**

- Fixtures and tests only.
- No new filtering logic.
- No producer migration.
- No schema bump.
- No dashboard / PR / CI surface.

## FIXTURES ADDED

| Fixture | Files | Drives | Evidence path |
| --- | --- | --- | --- |
| `route-handler` | `src/api/widgets/route.ts`, `src/api/widgets/handler.ts`, `package.json` | `route-handler-with-service` | EvidenceGraph import fact `route.ts → ./handler` (legacy subject shape) |
| `external-comment` | `src/api/util.ts`, `package.json` | `external-api-comment-only` | EvidenceGraph import fact `util.ts → leftpad`; no external-API SDK import |
| `nextjs-route` | `src/app/api/route.ts`, `package.json` | `nextjs-route-convention` | EvidenceGraph export facts `runtime`, `dynamic`, `GET` |

All three fixtures:

- Use vanilla TypeScript / JavaScript that the JS/TS
  producer can parse with no extra dependencies.
- Are small (the largest is two source files).
- Produce deterministic EvidenceGraph output via
  `rekon refresh`.
- Live under `tests/fixtures/`, NOT `examples/`. They
  are regression data, not user-facing capability
  demonstrations.

## DIAGNOSTICS EXERCISED

For each fixture, the contract test asserts the full
end-to-end diagnostic flow:

```
1. rekon refresh produces an EvidenceGraph with the
   expected import / export facts.
2. Seeded FindingReport cites that EvidenceGraph in
   header.inputRefs.
3. rekon findings filter produces a FindingFilterReport
   with:
     - filteredFindings entry for the seeded finding
     - reason = expected graph-aware reason
     - evidenceSource = "EvidenceGraph"
     - evidence string mentions EvidenceGraph
     - header.inputRefs includes EvidenceGraph
4. Raw FindingReport still contains the seeded finding.
5. rekon findings filter-health produces a
   FindingFilterHealthReport with:
     - summary.graphAwareByEvidenceSource.EvidenceGraph >= 1
     - summary.graphAwareReasonEvidenceSources[reason].EvidenceGraph >= 1
6. rekon findings lifecycle / issues adjudicate /
   coherency delta exclude the filtered finding from
   the active lifecycle.
7. rekon artifacts validate returns
   { valid: true, issues: [] }.
8. (Route-handler fixture only) rekon publish
   architecture + rekon publish agent-contract
   render EvidenceGraph attribution in their
   respective surfaces.
```

Steps 1-7 run for every fixture. Step 8 runs once
(against the route-handler fixture) to demonstrate
the fixture-driven evidence reaches the
user-facing publication layer; the other two
fixtures share the publication infrastructure so
exercising one is sufficient.

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
node packages/cli/dist/index.js refresh --root tests/fixtures/graph-aware-filters/route-handler --json
node packages/cli/dist/index.js artifacts validate --root tests/fixtures/graph-aware-filters/route-handler --json
```

All passed. Full suite: 839 passed / 1 skipped / 0
failed (5 new fixture-driven tests on top of the
prior 834).

**Fixture-mutation safety.** The contract test uses
`mkdtemp` + `cp -r` to operate on tmpdir copies of
each fixture; committed fixture directories are
never mutated. The CLI smoke commands listed above
operate directly on the committed fixture (since
`init` + `refresh` are required to exercise the
producer end-to-end without copying); those
commands generate `.rekon/` artifacts inside the
fixture directory that are not committed (per the
repo's `.gitignore` for `.rekon/` paths).

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts.extractImportFacts` /
  `extractExportFacts` / `extractSymbolFacts`
  producers — unchanged. The fixtures rely on their
  current behavior; future producer changes that
  break the fixture assertions will surface as test
  regressions.
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
  `graphFilterNextjsRouteConvention`) — unchanged.
- `applyFindingGraphFilters` — unchanged.
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

## RISKS / FOLLOW-UP

- **Producer-shape coupling.** The fixtures rely on
  the current JS/TS producer extraction behavior
  (regex-based import / export / symbol fact
  emission). If the producer ever migrates to an
  AST-based extractor, the fixtures should still
  work — the assertions only check fact presence and
  shape, not extraction internals. But a producer
  change that drops import/export facts entirely
  would surface as test failures.
- **Fixture mutation through CLI smoke.** The
  required CLI smoke commands listed at the bottom
  of this packet operate on the committed fixture
  directory and produce `.rekon/` artifacts inside
  it. Those are git-ignored, but they accumulate
  across local runs. A `rm -rf
  tests/fixtures/graph-aware-filters/*/.rekon`
  cleanup step is the operator's responsibility
  after manual smoke (the contract test uses tmpdir
  copies and doesn't have this concern).
- **Pre-publish horizon.** The fixtures cover three
  graph-aware checks. The other three checks
  (`route-http-middleware-only`,
  `factory-file-creates-deps`,
  `module-gate-verified-caller`) do not have
  dedicated fixtures in this slice. Future
  fixture-expansion work can add them when the
  evidence story for each is settled (e.g. a route
  importing only `/infra/http/` middleware for
  `route-http-middleware-only`; a `core/services/init/`
  file for `factory-file-creates-deps`; an
  `ObservedSystem.kind === "module"` ownership
  setup for `module-gate-verified-caller`).
- **Operator-review refresh.** The next slice should
  rerun the prior operator review against the new
  fixtures + any future smoke / dogfood data,
  confirming Option C still holds or surfacing
  whether any of the four migration triggers has
  changed.

## NEXT STEP

Per the work order's "Next Step After This Batch"
section + ADR step 26:

> **Graph-aware import evidence operator review
> refresh.**
>
> Rerun the operator review with the new
> deterministic fixtures included, now that local
> evidence is no longer sparse. Confirm Option C
> still holds, or identify whether any migration
> trigger has changed.

That's a strategy batch (no runtime changes). After
it lands, future graph-aware work (additional
fixtures for the other three checks, deeper
producer enhancements, or a producer-migration
decision if triggers shift) can build on a more
solid evidence base.

## CROSS-REFERENCES

- [Graph-aware import evidence operator review](../../docs/strategy/graph-aware-import-evidence-operator-review.md)
- [Graph-aware import evidence publication diagnostics review packet](graph-aware-import-evidence-publication-diagnostics.md)
- [Graph-aware import-fact consumers v4 review packet](graph-aware-import-fact-consumers-v4.md)
- [Import helper compatibility review packet](import-helper-compatibility.md)
- [Import fact subject-shape decision memo](../../docs/strategy/import-fact-subject-shape-decision.md)
- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
