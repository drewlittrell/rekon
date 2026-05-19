# FindingFilterReport

## Purpose

`FindingFilterReport` records the **system / policy filtering**
audit over a `FindingReport`. It is the audit layer between raw
evaluator output and the governed lifecycle / adjudication chain.

A filtered finding is a finding that a deterministic rule
suppressed from active governance because it is almost
certainly a false positive — for example, the finding was raised
against a path under `dist/`, `node_modules/`, or `tests/`. The
filter never mutates the upstream `FindingReport`; it produces a
new artifact that:

- Lists every filtered finding, including the full original
  payload, reason, evidence string, optional file path, and
  confidence label.
- Lists every kept finding so downstream consumers can opt in to
  the filtered projection without re-deriving it.

This artifact preserves classic codebase-intel's false-positive
filtering and audit guarantee. See
[../strategy/issue-governance-architecture-decision.md](../strategy/issue-governance-architecture-decision.md)
for the layered governance model that situates it.

## Produced By

- `@rekon/runtime.buildFindingFilterReport(store, options?)` —
  reads the latest `FindingReport` (or a pinned `findingReportId`)
  and emits a `FindingFilterReport`. Exposed via
  `rekon findings filter` and run automatically by
  `rekon refresh` between `evaluate` and `findings.lifecycle`.

## Consumed By

- `@rekon/runtime.buildFindingFilterHealthReport` reads the
  latest `FindingFilterReport` to derive
  `FindingFilterHealthReport`.
- `@rekon/runtime.buildFindingLifecycleReport` reads the latest
  `FindingFilterReport` when it cites the latest `FindingReport`
  in its `inputRefs` (current-enough check) and uses
  `keptFindings` as the active surface for lifecycle. The raw
  `FindingReport` is **not** consulted for the latest set when a
  current filter is present; filtered findings simply do not
  become active lifecycle findings. When the filter report is
  missing or stale relative to the latest `FindingReport`,
  lifecycle falls back to the raw report transparently and does
  not cite the stale filter. `IssueAdjudicationReport` and
  `CoherencyDelta` benefit transitively: only kept findings
  flow into governed issue groups and coherency rollups.
- `@rekon/capability-docs.architecture-summary` renders a
  `## Finding Filter Health` section sourced from this artifact
  plus [`FindingFilterHealthReport`](finding-filter-health-report.md).
- `@rekon/capability-docs.agent-contract` renders a
  `### Finding Filter Health` subsection under
  `Active Governance State` and adds a `Do Not Do` reminder
  against treating a clean active-governance surface as proof
  that no raw findings exist.
- `@rekon/runtime.buildFindingFilterPolicySuggestionReport`
  reads the latest N filter reports (default 5) and emits
  [`FindingFilterPolicySuggestionReport`](finding-filter-policy-suggestion-report.md)
  candidates — proposed `findingFilters` rules that capture
  recurring filtered findings without mutating the config.
- Operators / agents inspecting why a particular finding
  disappeared from the active governance surface.

## Required Header Fields

All standard `ArtifactHeader` fields. `producer.id` =
`@rekon/runtime.findings`. `inputRefs` cite the `FindingReport`
the run filtered. `freshness` is `fresh` at write time;
`rekon artifacts freshness` marks the artifact `stale` when a
newer `FindingReport` exists.

## Shape

```ts
type FindingFilterReason =
  | "test-file"
  | "generated-file"
  | "external-file"
  | "canary-file"
  | "explicit-exclusion"
  | "content-filter"
  | "policy-exception"
  | "other";

type FindingFilterConfidence = "high" | "medium" | "low";

type FilteredFinding = {
  findingId: string;
  finding: Finding;
  reason: FindingFilterReason;
  evidence: string;
  filePath?: string;
  confidence: FindingFilterConfidence;
  filteredAt: string;
  source: "system" | "operator" | "policy";
  /**
   * Set when this finding was filtered by a configured
   * .rekon/config.json findingFilters policy rule. Always
   * paired with source: "policy".
   */
  policyId?: string;
};

type FindingFilterPolicyFingerprint = {
  digest: string;
  ruleCount: number;
  ruleIds: string[];
};

type FindingFilterReport = {
  header: ArtifactHeader;
  summary: {
    totalFiltered: number;
    kept: number;
    byReason: Record<string, number>;
    byConfidence: Record<string, number>;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    /**
     * Per-policy filtered count when configured findingFilters
     * policies ran. Keys are policy ids; absent policies are
     * recorded as 0 so unused-policy alerts work.
     */
    byPolicy?: Record<string, number>;
  };
  keptFindings: Finding[];
  filteredFindings: FilteredFinding[];
  /**
   * Order-sensitive fingerprint of the `findingFilters` policy
   * set the filter run used. Populated by
   * `buildFindingFilterReport` from the policies the runtime
   * loaded out of `.rekon/config.json`. Always present on
   * reports produced by filter-policy-freshness v2 or later;
   * absent on older reports (treated as `unknown` by downstream
   * staleness checks). Empty-policy runs record a fingerprint
   * with `ruleCount: 0` and `ruleIds: []` — distinct from "no
   * fingerprint recorded".
   */
  policyFingerprint?: FindingFilterPolicyFingerprint;
};
```

## Policy Fingerprint

Each `FindingFilterReport` produced by filter-policy-freshness
v2 carries an order-sensitive fingerprint of the
`findingFilters` policy set that the filter run used. Order
matters because `applyFindingFilters` runs policies in declared
order and the first match wins, so two policy sets with the
same rules in a different order produce different fingerprints.

`fingerprintFindingFilterPolicies(policies)` is exported from
`@rekon/kernel-findings`. The fingerprint shape is
`{ digest: string; ruleCount: number; ruleIds: string[] }`.
`digest` is a SHA-256 over the canonical JSON of the policy
array; `ruleIds` is the rule-id list in declared order.

Downstream surfaces compare this fingerprint against the
current `.rekon/config.json` `findingFilters` to detect policy
drift. The architecture summary renders a
**Finding Filter Policy Freshness** section
(status: `fresh` / `stale` / `missing` / `unknown`); the agent
contract renders the same as a subsection plus a
**Do Not Do** reminder against acting on stale active
governance after a policy change. When the fingerprints
diverge, both publications recommend
`rekon refresh` to rebuild the filter chain.

`rekon findings filter-policy apply` also reports the projected
fingerprint in its JSON output:

- `--dry-run` returns `currentPolicyFingerprint` (state before
  apply) and `projectedPolicyFingerprint` (state if the
  suggestion were applied).
- Actual apply returns `currentPolicyFingerprint` plus
  `policyFingerprint` (the state immediately after the write;
  this is the fingerprint the next `rekon refresh` will stamp
  onto the new `FindingFilterReport`).

## Configured Exclusion Policies

Operators can add project-specific exclusion rules in
`.rekon/config.json` under `findingFilters`. Each rule has an
`id`, `reason`, `evidence` string, optional `confidence`
(defaults to `medium`), and at least one matcher among:
`pathPattern` (relative glob — `*` per-segment, `**` across
segments, `?` per-character), `type`, `ruleId`, `severity`,
`titleIncludes`, `descriptionIncludes`. Path patterns are
project-relative; absolute paths and `..` traversal are
rejected at validation time.

Policy rules run **before** built-in deterministic filters, in
declared order. The first matching policy wins. When a policy
matches, the filtered entry records `source: "policy"` plus a
`policyId` so the audit trail names the rule that suppressed
the finding.

See [finding-filters concept](../concepts/finding-filters.md)
and [finding-filter-health-report](finding-filter-health-report.md)
for the policy-aware alerts (`policy-over-filtering`,
`low-confidence-policy-filter`, `unused-policy-filter`).

## Deterministic v1 Filter Rules

`applyFindingFilters` walks every file on every finding and
returns the highest-priority match. Priority order (strongest
first):

| Reason | Trigger | Confidence |
| --- | --- | --- |
| `generated-file` | path segment is `dist`, `build`, or `generated`, or path contains `__generated__` or `.generated.` | high |
| `external-file` | path segment is `node_modules`, `vendor`, or `third_party` | high |
| `test-file` | path segment is `test`, `tests`, `__tests__`, or `__test__`, or filename ends with `.test.{ts,tsx,js,jsx,mjs,cjs}` or `.spec.{ts,tsx,js,jsx,mjs,cjs}` | high |
| `canary-file` | path contains `canary` | high |
| `explicit-exclusion` | emitted by configured policy rules in `.rekon/config.json` `findingFilters` (operator-supplied) | policy-provided (defaults to medium) |
| `content-filter` | finding text mentions "generated output" **and** file is in a generated path | medium |
| `policy-exception` | emitted by configured policy rules in `.rekon/config.json` `findingFilters` (operator-supplied) | policy-provided (defaults to medium) |
| `other` | reserved | low when used |

If a finding has no `files`, no rule matches and it is **kept**.

## Classic-Inspired Content / Result Filters (v2)

v2 adds two new filter layers between policy filters and the
broad path heuristics:

- **Classic content filters** — deterministic structural
  checks over `Finding.type` / `ruleId` /
  `Finding.details?: Record<string, unknown>`. Reasons:
  `empty-constructor-stub`,
  `storage-retrieval-placeholder`,
  `client-safe-infra`, `same-directory-import`,
  `svg-namespace-url`, `client-env-node-env`,
  `speculative-anti-pattern`,
  `archetype-inference-note`,
  `hardcoded-config-not-dde`,
  `ui-http-provider-abstraction`,
  `ui-hook-uses-http-not-db`,
  `module-gate-verified-caller`,
  `route-handler-with-service`,
  `route-http-middleware-only`,
  `external-api-comment-only`,
  `factory-file-creates-deps`,
  `nextjs-route-convention`. All emit `source: "system"`.
- **Classic result filters** — operator-configured
  `findingResultFilters` block (see below). Reasons:
  `below-min-confidence`, `below-min-severity`,
  `outside-selected-system`, `configured-path-exclusion`.

Pipeline order (first match wins):

1. Policy filters (`findingFilters`).
2. Classic content filters.
3. Built-in path heuristics.
4. Result filters (`findingResultFilters`).

All four layers record filtered findings into
`filteredFindings` with reason / evidence / confidence /
filteredAt / source. `FindingReport` is never mutated.
`Finding.details` is additive — detectors that don't carry
structured detail simply never hit the classic content
layer.

### Configured Result Filters

Operators add `findingResultFilters` to `.rekon/config.json`:

```json
{
  "findingResultFilters": {
    "minConfidence": 0.7,
    "severity": "medium",
    "systems": ["runtime", "src"],
    "pathExcludes": ["fixtures/**"]
  }
}
```

Validation: `validateFindingResultFilterOptions`. Enforced
by `rekon config validate` (errors include
`finding-result-filters-min-confidence-invalid`,
`finding-result-filters-severity-invalid`,
`finding-result-filters-systems-entry-invalid`,
`finding-result-filters-path-excludes-absolute`,
`finding-result-filters-path-excludes-traversal`). Result
filters are not operator status decisions and never delete
findings — they emit auditable filter entries with
`source: "system"`.

See
[../concepts/finding-filters.md](../concepts/finding-filters.md)
"Classic Content Filters" and "Classic Result Filters" for
the full per-case table.

## Graph-Aware Filters (v1)

v1 graph-aware filters consume Rekon artifacts to suppress
findings backed by structural evidence. Five checks run
between the classic content layer and the broad path
heuristics, reusing existing v2 reason codes (no new
reason codes were introduced):

- `route-handler-with-service` (uses
  `Finding.details.imports` or `ObservedRepo.files` sibling
  lookup).
- `route-http-middleware-only` (uses
  `Finding.details.imports`).
- `external-api-comment-only` (uses
  `Finding.details.imports` or `EvidenceGraph` import
  facts).
- `factory-file-creates-deps` (uses path heuristics or
  `CapabilityMap` entries).
- `module-gate-verified-caller` (uses path heuristics or
  `OwnershipMap` + `ObservedSystem.kind === "module"`).

`FindingFilterReport.header.inputRefs` cites a graph
artifact only when at least one graph-aware match actually
used the data — so the audit lists exactly the evidence
the report depended on.

Although the five graph-aware reason codes are shared with
the v2 classic content filter, the downstream
`FindingFilterHealthReport` keeps them in a separate
`graphAwareFiltered` bucket so the architecture-summary and
agent-contract publications can render a dedicated
"Graph-Aware Filter Reasons" table and surface the two
graph-aware dominance alerts (`graph-aware-filter-dominance`,
`graph-aware-reason-dominance`). See
[FindingFilterHealthReport](finding-filter-health-report.md)
"Alerts".

See
[../concepts/graph-aware-finding-filters.md](../concepts/graph-aware-finding-filters.md)
for the full per-check shape, audit invariants, and
no-op semantics when graph context is missing.

## CLI Surface

```sh
rekon findings filter --root <repo> --json
rekon findings filter-health --root <repo> --json
```

`rekon refresh` also runs the filter and filter-health steps
between `evaluate` and `findings.lifecycle`.

## What This Is Not

- **Not a status decision.** Operator decisions
  (`accepted` / `ignored` / `resolved`) remain in
  `FindingStatusLedger`; filtering is system / policy
  suppression with audit evidence.
- **Not a mutation.** Filtered findings stay in
  `filteredFindings`. `FindingReport` is unchanged on disk.
- **Not a graph / ontology validator.** The classic
  `GraphOntologyValidator` port is deferred.
- **Configurable via `.rekon/config.json findingFilters`.**
  Operators can add deterministic path/type/ruleId/severity/
  title/description matchers as policies; see
  [finding-filters concept](../concepts/finding-filters.md).
  Persistent exclusion lists across runs and richer policy
  languages remain deferred.
- **Consumed by lifecycle (and transitively by adjudication +
  coherency) as of the filter-aware lifecycle slice.** Raw
  `FindingReport` data still flows for runs where no current
  filter report exists, but in the standard `rekon refresh`
  path the lifecycle uses `keptFindings` and the filter report
  is load-bearing for the active governance surface.

## Cross-References

- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [Finding filters concept](../concepts/finding-filters.md)
- [Graph-aware finding filters concept](../concepts/graph-aware-finding-filters.md)
- [FindingReport](finding-report.md)
- [FindingFilterHealthReport](finding-filter-health-report.md)
- [FindingLifecycleReport](finding-lifecycle-report.md)
- [FindingStatusLedger](finding-status-ledger.md)
- [IssueAdjudicationReport](issue-adjudication-report.md)
