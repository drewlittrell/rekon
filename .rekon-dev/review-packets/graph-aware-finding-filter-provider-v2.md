# Review Packet: Graph-Aware Finding Filter Provider v2

Slice: P1.1 (Issue Adjudication),
graph-aware-finding-filter-provider-v2 slice.
Implements step 16 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

Strengthens the five v1 graph-aware checks with deeper
artifact-backed evidence. `EvidenceGraph` import facts are
now preferred over `Finding.details.imports`;
`ObservedRepo.files` supports sibling-file checks; each
decision returns `usedArtifacts` so the runtime cites only
the artifacts that actually contributed. Pipeline reordered
to run graph-aware *before* classic content so the audit
credits the strongest source. Every prior invariant is
preserved.

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

**New exported helpers (graph-aware v2 helpers):**

- `normalizeRepoPath(path)` — repo-relative path
  normalization. Strips leading `./`, converts backslashes
  to slashes, rejects absolute paths (`/...`) and `.rekon/`
  artifact paths (returns the empty string). Pure, no fs.
- `sameRepoPath(a, b)` — compares two paths after
  normalization.
- `siblingPath(filePath, siblingName)` — computes a
  sibling path in the same directory.
- `listObservedRepoFiles(context)` — sorted, deduped,
  normalized `ObservedRepo.files`.
- `observedRepoHasFile(context, path)` — membership test.
- `findSiblingFile(context, filePath, siblingName)` —
  returns the sibling path when `ObservedRepo.files` lists
  it; `undefined` otherwise.
- `listImportTargetsForFile(context, filePath)` — reads
  `EvidenceGraph` import facts
  (`kind === "import"`, `subject === filePath`).
- `fileImportsTargetMatching(context, filePath, predicate)`
  — filters the import targets through a predicate.

**`FindingGraphFilterDecision.usedArtifacts`** —
optional read-only array
(`FindingGraphArtifactUsed` =
`"ObservedRepo"` | `"EvidenceGraph"` | `"OwnershipMap"` |
`"CapabilityMap"` | `"GraphSlice"`). Always set on
graph-aware decisions; empty for pure path /
detector-import matches.

**Strengthened checks** (the five v1 checks; no new reason
codes):

1. `route-handler-with-service` — order:
   detector-supplied handler import (high, no graph
   artifact); `EvidenceGraph` import fact pointing at a
   handler (high, `usedArtifacts: ["EvidenceGraph"]`);
   `ObservedRepo.files` sibling `handler.ts` /
   `handler.tsx` (high, `usedArtifacts: ["ObservedRepo"]`).
2. `route-http-middleware-only` — prefers `EvidenceGraph`
   import facts over `Finding.details.imports`. Filters
   only when at least one infra import exists AND every
   infra import lives under `/infra/http/` or
   `/infra/Identity`. No-op when no import evidence is
   available from either source.
3. `external-api-comment-only` — prefers `EvidenceGraph`
   import facts over `Finding.details.imports`. An
   explicit empty `details.imports: []` array still
   proves absence at medium confidence. No-op when no
   import evidence is available.
4. `factory-file-creates-deps` — path-only matches return
   `usedArtifacts: []`; `CapabilityMap` matches return
   `usedArtifacts: ["CapabilityMap"]`.
5. `module-gate-verified-caller` — prefers
   `OwnershipMap` + `ObservedSystem.kind === "module"`
   (medium) over the bare `/modules/` path heuristic
   (medium, fallback). The `GateEvaluator` path remains
   the strongest signal (high).

**`ApplyFindingFiltersResult.graphArtifactsUsed`** — new
required field on the result of `applyFindingFilters`.
Sorted, deduped array of artifact types that contributed
to at least one matched graph-aware decision in this run.
Always present (empty array when no graph-aware
contribution).

**Pipeline reorder.** `applyFindingFilters` now runs
graph-aware filters *before* classic content (was: after).
When both layers can match the same finding, graph-aware
takes credit so the audit names the strongest
artifact-backed source. Classic content remains the
fallback when graph-aware is no-op. The five shared reason
codes still bucket as `graphAwareFiltered` in filter-health
regardless of which stage fired — bucket math is unchanged.

### `packages/runtime/src/index.ts`

`buildFindingFilterReport` now reads
`result.graphArtifactsUsed` and filters its loaded
graph-input refs by that set. The resulting `inputRefs`
list cites only the graph artifacts that actually
contributed to a match in this run. An artifact loaded
into the graph context but never matched against is no
longer cited. Unused `FindingFilterReason` import removed.

### `tests/contract/graph-aware-finding-filters-v2.test.mjs`

17 new contract tests covering:

1. v2 `findSiblingFile` + `siblingPath` normalize paths
   and find sibling `handler.ts`; helpers handle absolute
   / `.rekon/` paths safely.
2. Route handler check filters by `ObservedRepo.files`
   sibling handler when `details.imports` is absent.
3. Route handler check filters by `EvidenceGraph` import
   fact when `details.imports` is absent.
4. Route handler check does not filter when no import
   evidence and no sibling file (conservative no-op).
5. Route HTTP middleware-only uses `EvidenceGraph` import
   facts and filters allowed infra imports.
6. Route HTTP middleware-only does not filter when a
   non-allowed infra import exists (per EvidenceGraph).
7. External API comment-only uses `EvidenceGraph` import
   facts to filter when no external API imports exist.
8. External API comment-only does not filter when
   `openai` / `openrouter` import exists (per
   EvidenceGraph).
9. Factory file check evidence distinguishes path
   evidence (`usedArtifacts: []`).
10. Module gate check prefers GateEvaluator
    high-confidence evidence.
11. Module gate check prefers `ObservedSystem.kind =
    "module"` (medium) over `/modules/` path heuristic;
    `usedArtifacts: ["ObservedRepo", "OwnershipMap"]`.
12. Missing graph context remains conservative no-op
    across all strengthened checks.
13. `applyFindingFilters` returns `graphArtifactsUsed`
    sorted + deduped across multiple matches.
14. `FindingFilterReport.header.inputRefs` includes
    `ObservedRepo` when sibling-file evidence was used
    (and does NOT include `EvidenceGraph` when only
    sibling-file evidence was used).
15. `FindingFilterReport.header.inputRefs` includes
    `EvidenceGraph` when import-evidence was used.
16. Raw `FindingReport` remains byte-identical after
    strengthened graph-aware filtering.
17. Lifecycle / adjudication / coherency exclude
    strengthened graph-filtered findings AND
    `rekon artifacts validate` stays clean.

## PUBLIC API CHANGES

- **New exports** from `@rekon/kernel-findings`:
  `normalizeRepoPath`, `sameRepoPath`, `siblingPath`,
  `listObservedRepoFiles`, `observedRepoHasFile`,
  `findSiblingFile`, `listImportTargetsForFile`,
  `fileImportsTargetMatching`, type
  `FindingGraphArtifactUsed`.
- **`FindingGraphFilterDecision`** gains optional
  `usedArtifacts?: ReadonlyArray<FindingGraphArtifactUsed>`.
- **`ApplyFindingFiltersResult`** gains required
  `graphArtifactsUsed: ReadonlyArray<FindingGraphArtifactUsed>`
  (always present; empty when no graph-aware contribution).
- **`FilterMatch`** (internal) gains optional
  `usedArtifacts?: ReadonlyArray<FindingGraphArtifactUsed>`.

No artifact `schemaVersion` bump. No new artifact type. No
new capability role. No new CLI subcommand or flag. No new
reason codes.

## PURPOSE PRESERVATION CHECK

**Original problem:** v1 graph-aware filters proved the
shape but several checks still relied mostly on
`finding.details` and shallow path signals. To preserve
the classic guarantee, Rekon should use artifact-backed
file existence and import evidence whenever available.

**Classic shape we preserve:**
- `GraphOntologyValidator` — graph/ontology validation
  with structural exception verification.
- `content-filter-architecture` /
  `content-filter-ruleid` /
  `content-filter-stub-and-import` —
  ruleId + structured-evidence false-positive suppression.
- `services/GraphBuildProvider` /
  `services/IssueDetectionService` — graph-aware issue
  filtering.

**Rekon equivalent guarantee:**
- v2 graph-aware filters consume `ObservedRepo.files`,
  `EvidenceGraph` import facts, `OwnershipMap`,
  `CapabilityMap`, and `GraphSlice` where available.
- Missing artifact evidence → conservative no-op (no
  guessed filtering).
- Filtered findings remain auditable with
  reason/evidence/confidence/source/`usedArtifacts`.
- Raw `FindingReport` is unchanged.
- `FindingFilterReport.header.inputRefs` cites exactly
  the graph artifacts that contributed.

**Regression test for original problem:**
- Test 2: route finding with no handler import in details
  but `ObservedRepo.files` lists a sibling `handler.ts` →
  filters as `route-handler-with-service` with evidence
  naming the sibling file and `usedArtifacts:
  ["ObservedRepo"]`.
- Test 7: external API finding where `details.imports` is
  missing but `EvidenceGraph` import facts prove no
  external API import exists → filters as
  `external-api-comment-only` with evidence naming the
  import-fact source and `usedArtifacts: ["EvidenceGraph"]`.

## CODEBASE-INTEL ALIGNMENT

**Classic files/systems aligned:**
- `infra/validation/GraphOntologyValidator.ts`
- `services/issues/content-filter-ruleid.ts`
- `services/issues/content-filter-architecture.ts`
- `services/issues/content-filter-stub-and-import.ts`
- `services/IssueDetectionService.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`

**What Rekon keeps:**
- structural context can suppress false positives,
- filtered findings remain auditable,
- graph-aware filters cite evidence,
- graph-aware filters run before active lifecycle /
  adjudication / coherency,
- no raw finding mutation,
- no source scraping inside filters.

**What Rekon simplifies:**
- strengthens the five v1 checks only,
- consumes current Rekon artifacts only,
- no monolithic validator,
- no full framework catalog,
- no LLM / semantic / fuzzy logic,
- no runtime truth graph.

**What Rekon does not port yet:**
- full graph ontology validation suite,
- deep policy-owner parser,
- broad framework-specific exception catalog,
- runtime truth graph,
- source-reading validator service.

## ARTIFACT EVIDENCE MODEL

Each strengthened check returns a
`FindingGraphFilterDecision` whose `usedArtifacts` list
identifies which artifacts contributed evidence. The
runtime collects this across the run via
`ApplyFindingFiltersResult.graphArtifactsUsed` and filters
its loaded graph-input refs accordingly. The result is a
precise `FindingFilterReport.header.inputRefs` audit:
- a route-handler match via sibling file cites
  `ObservedRepo` only,
- an external-API match via EvidenceGraph cites
  `EvidenceGraph` only,
- a factory match via path heuristic cites no graph
  artifact (`usedArtifacts: []`).

## CHECKS STRENGTHENED

See "Strengthened checks" in CHANGES MADE above. Each
check still:
- runs deterministically,
- short-circuits the pipeline on match,
- emits `source: "system"`,
- never mutates raw `FindingReport`,
- never reads source files,
- is no-op when its required artifact evidence is
  missing.

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
```

All passed. Full test suite: 715 passed / 1 skipped / 0
failed. CLI smoke against `examples/simple-js-ts`:

```sh
rekon refresh --root examples/simple-js-ts --json
rekon findings filter --root examples/simple-js-ts --json
rekon findings filter-health --root examples/simple-js-ts --json
rekon artifacts validate --root examples/simple-js-ts --json
rekon artifacts freshness --root examples/simple-js-ts --json
```

## INTENTIONALLY UNTOUCHED

- Classic `GraphOntologyValidator` port — still deferred.
- LLM / semantic / fuzzy / embedding filtering — still
  permanently rejected.
- Source-file reads from filter logic — still rejected.
- Framework-specific exception catalogs (Next.js / DDE /
  providers) — still deferred to a future slice.
- Artifact schema versions — additive optional fields
  only, no `schemaVersion` bump.
- CLI surfaces — no new commands, no new flags. Existing
  `rekon refresh`, `rekon findings filter`, etc.,
  produce the new output automatically.
- Filter-health bucket math — graph-aware reason codes
  still bucket as `graphAwareFiltered` regardless of
  which pipeline stage fired. The five shared reason
  codes are unchanged.

## RISKS / FOLLOW-UP

- **Pipeline reorder semantic shift.** A finding that
  could have matched both layers now credits graph-aware
  when graph context is available. Evidence strings
  change subtly (the v2 strings name the artifact
  source). No existing test asserted the old evidence
  text verbatim; if external consumers grep evidence
  strings, they should switch to the reason code.
- **inputRefs precision.** A run where graph context is
  loaded but no graph-aware filter actually fires now
  emits an `inputRefs` array with **no** graph artifacts.
  This is the desired audit precision, but downstream
  consumers expecting "if graph context loaded → graph
  artifacts cited" need to adapt. (None exist in the
  Rekon repo today.)
- **Module-gate ordering swap.** v1 fell back to
  `OwnershipMap` + `kind="module"` only after `/modules/`
  path matched; v2 prefers `kind="module"` before
  `/modules/`. Findings inside `/modules/` whose owning
  system has a non-module kind (e.g. `"service"`) now
  fall through to the `/modules/` path branch, not the
  kind branch — which is what the audit guidance
  recommended.
- **Future work.** v3 decision memo should review
  whether to port deeper policy-owner parsing,
  framework-specific catalogs, or runtime-truth checks.
  No implementation until the data justifies it.

## NEXT STEP

Graph-aware filter provider v3 decision memo — review
which (if any) remaining classic checks still warrant
porting once v2 has been in operator hands. No
implementation until we know which guarantees are still
underserved.

## CROSS-REFERENCES

- [graph-aware finding filter provider v1 review packet](graph-aware-finding-filter-provider-v1.md)
- [graph-aware filter health publications review packet](graph-aware-filter-health-publications.md)
- [issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [finding filters concept](../../docs/concepts/finding-filters.md)
- [finding-filter-report artifact](../../docs/artifacts/finding-filter-report.md)
