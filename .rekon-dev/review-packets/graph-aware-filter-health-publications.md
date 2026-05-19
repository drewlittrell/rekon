# Review Packet: Graph-Aware Filter Surfacing In Publications / Filter Health

Slice: P1.1 (Issue Adjudication),
graph-aware-filter-health-publications slice.
Implements step 15 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to
`(shipped)`).

The graph-aware finding filter provider v1 already
suppresses structural false positives. This slice makes
that work *visible* in operator-facing surfaces and adds
two new dominance alerts so operators can tell *which*
layer is doing the suppression without reading the full
filter audit.

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

- Split `CLASSIC_CONTENT_FILTER_REASONS` — the five
  graph-aware reasons (`route-handler-with-service`,
  `route-http-middleware-only`,
  `external-api-comment-only`,
  `factory-file-creates-deps`,
  `module-gate-verified-caller`) moved into a new
  `GRAPH_AWARE_FILTER_REASONS` set. Classic content set
  now carries 12 reasons.
- New `isGraphAwareFiltered(entry)` classifier. Policy
  takes precedence: an entry with `source: "policy"`
  (or `policyId`) is **never** classified as graph-aware
  even if its reason code is graph-aware.
- `isBuiltInPathFiltered` no longer matches graph-aware
  reasons (they now route to the dedicated bucket).
- Bucket sets carry comment blocks documenting mutual
  exclusivity: `policyFiltered + contentFiltered +
  graphAwareFiltered + resultFiltered +
  builtInPathFiltered === totalFiltered`.

### `FindingFilterHealthSummary` (extended in
`@rekon/kernel-findings.buildFindingFilterHealth`)

New fields:

- `graphAwareFiltered: number` — count of entries that
  pass `isGraphAwareFiltered`. Always present (`0` when
  no graph-aware filter fired).
- `byGraphAwareReason: Record<string, number>` —
  per-reason raw count computed only over graph-aware
  entries (so a policy entry sharing a graph-aware
  reason code does not inflate this table). Always
  present.
- `filterRateByGraphAwareReason: Record<string, number>`
  — rates rounded to four decimals.
- `dominantGraphAwareReason?: { reason; count; rate }` —
  alphabetic tiebreak; present when at least one
  graph-aware filter fired.

Bucket counts always sum to `totalFiltered`. The
`buildFindingFilterHealth` implementation now iterates
`report.filteredFindings` exactly once and routes each
entry to its bucket via the classifier set:

```
if (isPolicyFiltered(entry))            -> policyFiltered
else if (isResultFiltered(entry))       -> resultFiltered
else if (isGraphAwareFiltered(entry))   -> graphAwareFiltered + byGraphAwareReason[reason]++
else if (isClassicContentFiltered(entry)) -> contentFiltered
else if (isBuiltInPathFiltered(entry))  -> builtInPathFiltered
```

### Two New Alerts

Both gated on `totalFindings >= 5` (minimum corpus
threshold matching the existing 50 %-rate pattern):

| Code | Trigger | Severity |
| --- | --- | --- |
| `graph-aware-filter-dominance` | `graphAwareFiltered / totalFindings >= 0.5` | warning |
| `graph-aware-reason-dominance` | `dominantGraphAwareReason.rate >= 0.5` | warning |

Alerts remain sorted by `code` for deterministic output.

### `packages/capability-docs/src/index.ts`

**`appendArchitectureFindingFilterHealth`:**

- New bullet under the kept / filtered counts:
  `- Graph-aware filtered findings: <n>` (always
  rendered — `0` is meaningful).
- New section block rendered when
  `graphAwareReasonRows.length > 0` OR
  `summary.graphAwareFiltered > 0`:
  ```
  ### Graph-Aware Filter Reasons

  | Reason | Filtered | Filter Rate |
  | --- | --- | --- |
  | route-handler-with-service | 3 | 0.50 |
  ...

  Inspect `FindingFilterReport.filteredFindings` for the
  structural evidence behind each graph-aware match
  (sibling-file existence, import-graph facts,
  capability ownership, module-kind routing).
  ```
- The new alert codes
  (`graph-aware-filter-dominance` /
  `graph-aware-reason-dominance`) surface in the existing
  alerts table when their thresholds fire.

**`appendAgentContractFindingFilterHealth`:**

- New bullet alongside the existing filter-health
  summary: `- Graph-aware filtered findings: <n>`.
- Conditional audit instruction when
  `graphAwareFiltered > 0`: "If graph-aware filtering is
  high, inspect `FindingFilterReport.filteredFindings`
  for the structural evidence (sibling-file existence,
  import-graph facts, capability ownership, module-kind
  routing) before drawing conclusions."

**`AGENT_CONTRACT_DO_NOT_DO` (new entry):**

- "Do not treat graph-aware filtering as proof that the
  underlying issue never existed; inspect
  `FindingFilterReport.filteredFindings` for the
  structural evidence (sibling-file existence,
  import-graph facts, capability ownership, module-kind
  routing) before drawing conclusions."

### `tests/contract/graph-aware-filter-health-publications.test.mjs`

16 new contract tests covering:

1. `isGraphAwareFiltered` returns true for the five
   graph-aware reasons.
2. Policy-filtered entries with graph-aware reason codes
   classify as policy, not graph-aware.
3. `contentFiltered` no longer includes graph-aware
   reasons (regression for the bucket split).
4. Filter-health summary includes `graphAwareFiltered`.
5. Bucket counts sum to `totalFiltered`.
6. `filterRateByGraphAwareReason` is populated and
   rounded to four decimals.
7. `byGraphAwareReason` carries integer counts and is
   not inflated by policy entries sharing a reason code.
8. `dominantGraphAwareReason` is populated when
   applicable + alphabetic tiebreak.
9. `graph-aware-filter-dominance` alert fires when
   `graphAwareFiltered / totalFindings >= 0.5` AND
   `totalFindings >= 5`.
10. `graph-aware-reason-dominance` alert fires when one
    reason crosses 50 % AND `totalFindings >= 5`.
11. No graph-aware alerts when `totalFindings < 5`
    (minimum corpus).
12. Architecture summary surfaces graph-aware count +
    `Graph-Aware Filter Reasons` table.
13. Agent contract surfaces graph-aware count + audit
    instruction.
14. Agent contract "Do Not Do" includes the graph-aware
    filtering warning.
15. Filter-health alert codes appear in publication
    alert tables when present.
16. `rekon artifacts validate` stays clean after
    publishing graph-aware surfaces.

## VERIFICATION

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

All passed. Full test suite: 698 passed / 1 skipped / 0
failed. CLI smoke against `examples/simple-js-ts`:

```sh
rekon refresh --root examples/simple-js-ts --json
rekon findings filter --root examples/simple-js-ts --json
rekon findings filter-health --root examples/simple-js-ts --json
rekon publish architecture --root examples/simple-js-ts --json
rekon publish agent-contract --root examples/simple-js-ts --json
rekon artifacts validate --root examples/simple-js-ts --json
rekon artifacts freshness --root examples/simple-js-ts --json
```

## INVARIANTS HELD

- **Bucket math is exact.** `policyFiltered +
  contentFiltered + graphAwareFiltered + resultFiltered
  + builtInPathFiltered === totalFiltered` for every
  `FindingFilterReport` shape we exercised (synthetic +
  CLI smoke).
- **Policy precedence preserved.** A `source: "policy"`
  entry with a graph-aware reason code stays in
  `policyFiltered` — never inflates `graphAwareFiltered`
  or `byGraphAwareReason`. Verified by dedicated tests
  3 and 7.
- **No new reason codes.** The five graph-aware codes
  are the same codes the v2 classic content filter and
  the v1 graph-aware provider have always emitted.
  Filter-health just routes them to a dedicated bucket.
- **No artifact `schemaVersion` bump.** The new fields
  are additive optional from the schema's perspective
  (always present at runtime; older
  `FindingFilterHealthReport` documents on disk continue
  to validate because the validator already tolerated
  the existing structural fields).
- **No source-file reads.** All graph-aware decisions
  still consume artifacts; nothing in the publications
  layer reads the filesystem at filter time.
- **No LLM, semantic, fuzzy, or embedding matching.**
  Pure deterministic counts and threshold comparisons.
- **No `GraphOntologyValidator` port.** Outcome
  surfacing only — the deferred monolithic validator
  remains deferred.
- **Audit trail intact.** Raw `FindingReport` is never
  mutated. Filtered findings remain inspectable in
  `FindingFilterReport.filteredFindings`. Both new
  publications surface an explicit audit pointer (table
  caption + Do Not Do reminder).
- **Conservative no-op.** Repos that never trigger the
  graph-aware filter render `Graph-aware filtered
  findings: 0` and skip the dedicated reasons table.

## DOCS UPDATED

- `docs/concepts/graph-aware-finding-filters.md` — new
  "Filter Health Bucketing" section documenting the
  classifier precedence, the new summary fields, the
  two new alerts, and the publication surfaces.
- `docs/concepts/finding-filters.md` — clarified that the
  five graph-aware reason codes share with v2 classic
  content but filter-health buckets them separately.
- `docs/artifacts/finding-filter-health-report.md` —
  documented `graphAwareFiltered`, `byGraphAwareReason`,
  `filterRateByGraphAwareReason`,
  `dominantGraphAwareReason`, and both new alerts in the
  shape + alert table.
- `docs/artifacts/finding-filter-report.md` — cross-link
  to the new filter-health bucket and the graph-aware
  concept.
- `docs/concepts/architecture-summary-publication.md` —
  documented the new Graph-Aware Filter Reasons table +
  audit pointer + new alert codes.
- `docs/concepts/agent-operating-contract.md` —
  documented the graph-aware count bullet, the
  conditional audit instruction, and the new "Do Not
  Do" reminder.
- `docs/strategy/graph-ontology-validator-lite-audit.md`
  — updated the "filter health surfaces graph matches in
  diagnostics" invariant entry to reflect the bucket
  split and the two new alerts.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 15 flipped from `(future)` to `(shipped)`;
  step 16 reserved for graph-aware filter provider v2.
- `docs/strategy/classic-behavior-roadmap.md` — new
  entry for the slice.
- `docs/strategy/roadmap.md` — new entry for the slice.
- `CHANGELOG.md` — full slice entry at the top of
  `0.1.0-alpha.1`.

## WHAT THIS IS NOT

- **Not a `GraphOntologyValidator` port.** Outcome
  surfacing only.
- **Not a new artifact type.** Existing
  `FindingFilterHealthReport` extended with additive
  optional fields; existing `Publication` artifacts
  carry the new sections.
- **Not configurable.** No new
  `findingFilterHealth` knobs; the 50 % rate + 5-finding
  corpus threshold mirrors the existing dominance
  alerts.
- **Not a CLI surface change.** `rekon findings
  filter-health`, `rekon publish architecture`, and
  `rekon publish agent-contract` produce the new output
  without any new flags.
- **Not a graph-aware provider extension.** The five
  checks in v1 are unchanged. v2 (file-existence /
  import-evidence strengthening) is the next slice.

## RECOMMENDED NEXT SLICE

Graph-aware filter provider v2 — file-existence /
import-evidence strengthening. The audit's "near-port"
candidates (deeper sibling-file matching, richer
EvidenceGraph cross-checks, framework-specific reasons)
remain on the table once v1 surfacing is in operator
hands.

## CROSS-REFERENCES

- [graph-aware finding filter provider v1 review packet](graph-aware-finding-filter-provider-v1.md)
- [issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
- [GraphOntologyValidator-lite audit](../../docs/strategy/graph-ontology-validator-lite-audit.md)
- [graph-aware finding filters concept](../../docs/concepts/graph-aware-finding-filters.md)
- [finding-filter-health-report artifact](../../docs/artifacts/finding-filter-health-report.md)
- [finding-filter-report artifact](../../docs/artifacts/finding-filter-report.md)
- [architecture-summary-publication concept](../../docs/concepts/architecture-summary-publication.md)
- [agent-operating-contract concept](../../docs/concepts/agent-operating-contract.md)
