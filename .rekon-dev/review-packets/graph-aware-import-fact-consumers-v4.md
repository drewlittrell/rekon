# Review Packet: Graph-Aware Import-Fact Consumers v4

Slice: P1.1 (Issue Adjudication),
graph-aware-import-fact-consumers-v4 slice.
Implements step 22 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

Updates the three import-consuming graph-aware filters
(`graphFilterRouteHandlerWithService`,
`graphFilterRouteHttpMiddlewareOnly`,
`graphFilterExternalApiCommentOnly`) to deliberately
prefer `EvidenceGraph` import facts over
`Finding.details.imports` and to emit evidence strings
that name the source. Now that the import-helper
compatibility implementation (`cce837f`) makes
`listImportTargetsForFile` work against production
legacy `subject = "<file>:<target>"` data, the
EvidenceGraph branches of these filters are no longer
dead code against real repos.

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

**`graphFilterRouteHandlerWithService` precedence
swap.** Previously the detector-supplied
`details.imports` branch ran *before* the EvidenceGraph
branch (so even with import-helper compatibility, the
EvidenceGraph branch only fired when the detector
omitted `details.imports`). v4 swaps the order:

```
1. EvidenceGraph import facts (listImportTargetsForFile)
2. Finding.details.imports
3. ObservedRepo.files sibling handler.ts/.tsx
```

This mirrors the v3 `nextjs-route-convention` rule:
artifact-backed graph evidence is authoritative over
detector details.

**Evidence-string source labels.** All three import-
consuming filters now emit evidence strings that name
the source explicitly:

- `EvidenceGraph import facts show route delegates to
  handler: '<target>'.`
- `Detector import details show route delegates to
  handler: '<target>'.`
- `ObservedRepo file index shows route has sibling
  handler file: '<path>'.`
- `EvidenceGraph import facts show route imports only
  HTTP / Identity middleware infra: <imports>.`
- `Detector import details show route imports only
  HTTP / Identity middleware infra: <imports>.`
- `EvidenceGraph import facts contain no external API
  package imports (openai / openrouter / @openai/*)
  for '<file>': <targets>.`
- `Detector import details contain no external API
  package imports …`
- `Detector import details (explicitly empty imports
  list) contain no external API package imports …`

**`usedArtifacts` tracking unchanged from v2.** The
EvidenceGraph branch sets
`usedArtifacts: ["EvidenceGraph"]`; the
`details.imports` fallback sets `usedArtifacts: []`;
the sibling-file branch (`route-handler-with-service`
only) sets `usedArtifacts: ["ObservedRepo"]`.

**Other changes:** none. Filter shape (`(finding, ctx)
=> FindingGraphFilterDecision | null`) is unchanged.
Trigger conditions (`type`, `ruleId`, file path
extension) are unchanged. No new reason codes. No new
graph-aware filter categories.

### `tests/contract/graph-aware-import-fact-consumers.test.mjs`

15 new contract tests:

1. `route-handler-with-service` fires from
   production-shaped legacy EvidenceGraph import facts
   (`subject = "<file>:<target>"`).
2. `route-handler-with-service` evidence names
   `EvidenceGraph import facts`.
3. `route-handler-with-service` EvidenceGraph facts
   override conflicting `details.imports` (detector
   claims `leftpad`/`react`, graph proves `./handler`
   — graph wins, evidence cites EvidenceGraph).
4. `route-handler-with-service` falls back to
   `details.imports` when EvidenceGraph imports are
   absent.
5. `route-http-middleware-only` fires from
   production-shaped legacy EvidenceGraph imports
   (`/infra/http/...` + `/infra/Identity/...`).
6. `route-http-middleware-only` does NOT fire when an
   EvidenceGraph import is `/infra/Database/...`
   (conservative no-op on non-allowed infra).
7. `route-http-middleware-only` evidence names
   `EvidenceGraph import facts`.
8. `external-api-comment-only` fires from
   production-shaped legacy EvidenceGraph imports with
   no external API packages.
9. `external-api-comment-only` does NOT fire when an
   EvidenceGraph import is `openai`.
10. `external-api-comment-only` falls back to explicit
    empty `details.imports: []` when EvidenceGraph
    imports are absent (medium confidence, evidence
    names the explicit-empty fallback).
11. `FindingFilterReport.header.inputRefs` includes
    `EvidenceGraph` when import facts are used
    (end-to-end CLI fixture).
12. `EvidenceGraph` is NOT cited when only the
    `details.imports` fallback fires.
13. Raw `FindingReport` remains byte-identical after
    the filter run.
14. Lifecycle / adjudication / coherency exclude the
    graph-filtered finding; `rekon artifacts validate`
    stays clean.
15. `rekon artifacts validate` stays clean against
    `examples/simple-js-ts` after the v4 changes.

## PUBLIC API CHANGES

**No signature changes.** The filter functions remain
internal helpers in `@rekon/kernel-findings`. Their
shape (input parameters, return type, `usedArtifacts`
field) is identical to v2 / v3.

**Observable behavior changes (intentional):**

- `route-handler-with-service` decisions now cite
  `EvidenceGraph` (and set `usedArtifacts:
  ["EvidenceGraph"]`) whenever EvidenceGraph carries a
  handler import for the file, regardless of whether
  `details.imports` also lists it. Previously the
  detector branch always won, so `usedArtifacts` was
  `[]` even when EvidenceGraph evidence existed.
- All three filters' evidence strings now name the
  source explicitly. Existing v1 / v2 tests use regex
  matchers (`/sibling handler file/i`, `/import/i`,
  `/EvidenceGraph/i`) that continue to match; only
  tests asserting exact strings would need updating
  (none exist in this repo).

No new exports. No new types. No artifact
`schemaVersion` bump. No new artifact type. No new
capability role. No new CLI subcommand or flag. No
new reason codes. No producer change. No version
bump. No npm publish.

## PURPOSE PRESERVATION CHECK

**Original problem.** Several graph-aware filters
are meant to use structural import evidence, but
before helper compatibility the EvidenceGraph import
branch could miss production import facts because
legacy import subjects used `"<file>:<target>"`.
After helper compatibility shipped at `cce837f`, the
helper could read production data — but the filters
themselves still had stale precedence
(`route-handler-with-service`'s detector branch ran
first) and ambiguous evidence strings (audit
consumers couldn't tell which branch fired). v4
closes both gaps.

**Classic shape preserved.** Import graph evidence
remains the structural truth for architecture
filtering. The Rekon equivalent: graph-aware filters
consume the helper API, prefer EvidenceGraph over
detector details, and emit evidence strings that
name the source.

**Rekon equivalent guarantee, now restored:**
- Graph-aware filters consume
  `listImportTargetsForFile` for file-scoped import
  evidence.
- EvidenceGraph imports are *preferred* over
  `finding.details.imports`.
- `details.imports` remains fallback only when
  EvidenceGraph import facts are unavailable.
- Filtered findings remain auditable with evidence
  that names the artifact-backed import signal.
- Raw `FindingReport` remains unchanged.

**Regression test for original problem (verified by
tests we shipped):**

- Test 1 + 5 + 8: each of the three filters fires
  via the EvidenceGraph branch against production-
  shaped legacy import facts.
- Test 2 + 7 + 8: each filter's evidence string
  names `EvidenceGraph import facts`.
- Test 11: end-to-end CLI fixture proves the
  runtime cites `EvidenceGraph` in
  `FindingFilterReport.header.inputRefs`.

**What would mean we failed (prevented by tests):**

- Filter still reads raw import facts by matching
  `fact.subject` directly → prevented; all three
  filters delegate to `listImportTargetsForFile`.
- Filter prefers stale `details.imports` when
  EvidenceGraph import facts exist → prevented by
  Test 3 (graph overrides details).
- EvidenceGraph import facts exist but graph-aware
  filters no-op because they don't use the helper →
  prevented by Tests 1, 5, 8, 11.
- Filter evidence doesn't say whether it used
  EvidenceGraph or detector details → prevented by
  Tests 2, 4, 7, 10.
- Import producer shape changes sneak into the
  batch → prevented by the absence of any
  `@rekon/capability-js-ts` source change in this
  commit, plus the import-helper-compatibility test
  suite's Test 13 (production shape preservation
  pin) which we did not touch.

## CODEBASE-INTEL ALIGNMENT

**Classic capability or failure mode:** import graph /
graph intelligence as structural evidence for
architecture filtering.

**Relevant classic files / systems aligned to:**
- `lib/import-graph.ts`
- `services/GraphBuildProvider.ts`
- `domain/graph/producers/**`
- `services/issues/content-filter-ruleid.ts`
- `services/IssueDetectionService.ts`

**What Rekon keeps:**
- Import graph evidence can suppress false positives.
- Graph-aware filters consume helper APIs.
- Old `EvidenceGraph` artifacts remain compatible.
- Evidence strings explain the structural signal
  used.
- No source reads.

**What Rekon simplifies:**
- Strengthen existing import consumers only — no new
  graph-aware checks.
- No producer migration.
- No schema bump.
- No monolithic validator.

## IMPORT FACT CONSUMER AUDIT

| Filter | Consumes imports? | Helper used? | Updated in v4? |
| --- | --- | --- | --- |
| `route-handler-with-service` | Yes (`details.imports` + EvidenceGraph + ObservedRepo siblings) | `listImportTargetsForFile` + `findSiblingFile` | **Yes — precedence swap + evidence-source labels** |
| `route-http-middleware-only` | Yes (EvidenceGraph + `details.imports`) | `listImportTargetsForFile` | **Yes — evidence-source label tightened** |
| `external-api-comment-only` | Yes (EvidenceGraph + `details.imports`) | `listImportTargetsForFile` | **Yes — evidence-source label tightened** |
| `factory-file-creates-deps` | No (consumes path heuristics + `CapabilityMap`) | — | No |
| `module-gate-verified-caller` | No (consumes path heuristics + `OwnershipMap` + `ObservedSystem.kind`) | — | No |
| `nextjs-route-convention` *(v3)* | No (consumes EvidenceGraph **export** facts via `listExportsForFile`) | `listExportsForFile` | No (already shipped at v3) |

Two of the three import-consuming filters
(`route-http-middleware-only`,
`external-api-comment-only`) already preferred
EvidenceGraph from the v2 strengthening; the v4 work
on them was limited to evidence-string clarity. The
third filter (`route-handler-with-service`) was the
one with stale precedence and needed the swap.

## EVIDENCE PRECEDENCE MODEL

**v4 import-evidence precedence (shared by all three
import-consuming filters):**

```
1. EvidenceGraph import facts
   (via listImportTargetsForFile, compatibility-aware)
   - usedArtifacts: ["EvidenceGraph"]
   - confidence: high
   - evidence: "EvidenceGraph import facts show …"

2. Finding.details.imports (fallback)
   - usedArtifacts: []
   - confidence: high (route checks)
                | high if non-empty / medium if explicitly empty (external-api)
   - evidence: "Detector import details show …"
              / "Detector import details (explicitly empty imports list) …"

3. ObservedRepo.files sibling lookup
   (route-handler-with-service only)
   - usedArtifacts: ["ObservedRepo"]
   - confidence: high
   - evidence: "ObservedRepo file index shows …"

4. Conservative no-op
   - return null (no decision)
```

**Authoritative-graph rule.** When EvidenceGraph
import facts exist for the file, they are
authoritative — even if the detector-supplied
`details.imports` would have looked clean. This
mirrors the v3 `nextjs-route-convention` rule:
artifact-backed graph evidence beats detector
details. Test 3 pins this for
`route-handler-with-service`.

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
node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter-health --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json
```

All passed. Full test suite: 800 passed / 1 skipped /
0 failed (15 new tests on top of the prior 785
passing tests).

## INTENTIONALLY UNTOUCHED

- `@rekon/capability-js-ts.extractImportFacts`
  producer — unchanged. Production import facts still
  use `subject = "<file>:<target>"`. (Pinned by Test
  13 of the import-helper-compatibility suite.)
- `listImportTargetsForFile` /
  `fileImportsTargetMatching` /
  `listExportsForFile` / `listSymbolsForFile` —
  unchanged. The v4 work uses these helpers; it does
  not modify them.
- `EvidenceGraph` artifact `schemaVersion` —
  unchanged.
- `applyFindingFilters` pipeline order — unchanged
  (graph-aware still runs before classic content from
  v2).
- `FindingFilterReport` / `FindingFilterHealthReport`
  shapes — unchanged.
- Filter-health bucket math — unchanged. The five
  shared reason codes still bucket as
  `graphAwareFiltered`; `nextjs-route-convention`
  remains in the graph-aware set from v3.
- The other three graph-aware checks
  (`factory-file-creates-deps`,
  `module-gate-verified-caller`,
  `nextjs-route-convention`) — unchanged.
- All CLI commands — no new flags, no new subcommands.
- All capability manifests — no new roles, no new
  produces/consumes.
- Reason codes — no new codes.
- LLM / semantic / fuzzy / embedding inference —
  permanently rejected.
- Source-file reads from filter logic — still
  rejected.

## RISKS / FOLLOW-UP

- **`route-handler-with-service` precedence change is
  observable.** Decisions previously cited as detector
  evidence (with `usedArtifacts: []`) now cite
  EvidenceGraph (with `usedArtifacts: ["EvidenceGraph"]`)
  whenever the graph carries a handler import. No
  evidence-mathematics change (the same findings still
  filter), but audit consumers reading
  `usedArtifacts` will see EvidenceGraph attribution
  appear more often, and `FindingFilterReport.header.inputRefs`
  will cite EvidenceGraph in repos where it did not
  before. This is the desired audit precision — the
  follow-up slice (graph-aware import evidence
  publication diagnostics) will make this visible at
  the publication layer.
- **`details.imports` fallback paths are now reachable
  only when EvidenceGraph has no import facts for the
  file.** Real repos use `@rekon/capability-js-ts`,
  which emits import facts for every JS/TS file with
  imports — so in practice the fallback fires only for
  files outside the producer's scope (or in repos
  where the producer has not been run). The release
  note for v4 should call this out: operators
  expecting frequent `details.imports`-attributed
  decisions may see them disappear in favor of
  EvidenceGraph attribution.
- **`route-handler-with-service` evidence string
  rewording.** Existing v1 / v2 contract tests use
  regex matchers (`/sibling handler file/i`,
  `/import/i`, `/EvidenceGraph/i`) that continue to
  match; no test breakage. External consumers grepping
  filter evidence text should switch to
  `decision.usedArtifacts` (which is the durable
  contract) rather than matching evidence strings.
- **Production data feedback loop.** Operator data
  from filter-health
  `byGraphAwareReason` / `dominantGraphAwareReason`
  surfaces will now reflect actual EvidenceGraph-
  attributed counts. This is the input the future
  Option A producer-migration decision needs.

## NEXT STEP

Per the work order's "Next Step After This Batch"
section + the new ADR step 23:

> **Graph-aware import evidence publication
> diagnostics.**
>
> Expose whether graph-aware filters are using
> EvidenceGraph import facts or fell back to
> `details.imports` / `ObservedRepo` siblings. Could
> be a compact `evidenceSource` count on filter-health
> (per-source rows in `byGraphAwareReason`-shaped
> output) or a column in the architecture summary's
> Graph-Aware Filter Reasons table. Informs whether
> the future Option A producer migration is worth
> taking.

That's a publication-shape batch (filter-health
summary + architecture summary appender). It validates
that the v4 attribution improvements are visible to
operators end-to-end.

## CROSS-REFERENCES

- [Import fact subject-shape decision memo](../../docs/strategy/import-fact-subject-shape-decision.md)
- [Import helper compatibility review packet](import-helper-compatibility.md)
- [Graph-aware filter provider v3 decision memo](../../docs/strategy/graph-aware-filter-provider-v3-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [Issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [Graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [EvidenceGraph artifact](../../docs/artifacts/evidence-graph.md)
- [FindingFilterReport artifact](../../docs/artifacts/finding-filter-report.md)
- [Graph-aware Next.js route export convention filter review packet](graph-aware-nextjs-route-export-filter.md)
- [Graph-aware finding filter provider v2 review packet](graph-aware-finding-filter-provider-v2.md)
- [Graph-aware finding filter provider v1 review packet](graph-aware-finding-filter-provider-v1.md)
- [EvidenceGraph export / symbol facts projection v1 review packet](evidence-export-symbol-facts-v1.md)
