# Finding Filters

Rekon's evaluator output is raw lint-style detection. Some
findings are valid governance signals and some are false
positives — for example, a finding that fires on a path under
`dist/`, `node_modules/`, or `tests/` is almost certainly not
something a human should triage. Without an explicit filter
layer, those false positives pollute lifecycle counts,
adjudication groups, the coherency rollup, and the remediation
queue.

`FindingFilterReport` is Rekon's auditable filter layer. It
preserves the classic codebase-intel guarantee that false
positives have a paper trail.

## Why Filtering Is Separate From Status

Operator status decisions (`accepted`, `ignored`, `resolved`)
live in `FindingStatusLedger` and reflect human judgment about a
finding's lifecycle. System / policy suppression of false
positives is a different concern: it answers "should this
finding ever have been an active governance signal?" and is
deterministic, not a judgment call.

Mixing the two is a mistake we explicitly avoid:

- A test-file false positive should never be marked `ignored`
  by a human just to remove it from the surface; instead, the
  filter layer should suppress it and the status ledger should
  stay empty.
- An accepted-risk finding should not be suppressed by a filter
  — it remains an active governance signal that the operator
  has decided to live with.

The
[issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
formalizes this split.

## Why It Exists

Classic codebase-intel proved the following for trustworthy
issue governance:

- False positives need an audit trail (reason, evidence,
  confidence).
- Filtered findings must remain inspectable so an operator can
  debug filters or recover a wrongly-suppressed finding.
- Coherency rollups should operate on governed (kept,
  adjudicated) findings rather than raw detector noise.

Rekon's prior shape covered the lifecycle / status / adjudication
side of that guarantee but did not yet have a filter layer.
`FindingFilterReport` fills that gap.

## Filter Pipeline

`buildFindingFilterReport`:

1. Reads the latest `FindingReport` (or a pinned report id).
2. Walks every file on every finding and finds the
   highest-priority filter match (see "Reasons" below).
3. Emits a `FindingFilterReport` artifact that:
   - lists every filtered finding with reason, evidence, file
     path, and confidence;
   - lists every kept finding so downstream consumers can opt
     in to the filtered projection;
   - cites the source `FindingReport` in `header.inputRefs`.

`buildFindingFilterHealthReport`:

1. Reads the latest `FindingFilterReport` (or builds one if
   missing).
2. Computes `filterRate`, `highConfidenceFiltered`,
   `lowConfidenceFiltered`, and the reason breakdown.
3. Emits a `FindingFilterHealthReport` with deterministic v1
   alerts (`high-filter-rate`, `low-confidence-filtered`).

Both artifacts live under the `findings/` category in
`.rekon/artifacts/`.

## Configured Exclusion Policies

Operators can extend the built-in deterministic filters with
project-specific exclusions via `.rekon/config.json`:

```json
{
  "findingFilters": [
    {
      "id": "generated-src",
      "reason": "generated-file",
      "evidence": "Generated source is excluded from active governance.",
      "pathPattern": "src/generated/**",
      "confidence": "high"
    },
    {
      "id": "legacy-module",
      "reason": "policy-exception",
      "evidence": "Legacy module is being deprecated; suppress until removal.",
      "pathPattern": "src/legacy/**",
      "type": "import_boundary.parent_relative_import",
      "confidence": "medium"
    }
  ]
}
```

Each entry requires `id`, `reason`, and `evidence`, plus at
least one matcher: `pathPattern`, `type`, `ruleId`, `severity`,
`titleIncludes`, or `descriptionIncludes`. Path patterns are
project-relative; absolute paths and `..` traversal are
rejected. Path matching supports a small deterministic glob
vocabulary: `*` matches a single path segment, `**` matches
zero or more segments, and `?` matches one character.

Policy rules run **before** built-in deterministic filters, in
declared order. The first matching policy wins. When a policy
matches, the filtered entry records:

- `source: "policy"`
- `policyId`: the rule's `id`
- `reason`: the rule's `reason`
- `evidence`: the rule's `evidence` string
- `confidence`: the rule's `confidence` (defaults to `medium`)

`rekon config validate` enforces the schema and rejects
duplicate ids, missing matchers, unknown reasons, and absolute
or traversal `pathPattern` values.

`FindingFilterReport.summary.byPolicy` reports the number of
findings each configured policy suppressed (including zero for
policies that never matched). `FindingFilterHealthReport` adds
three policy-aware alerts:

- `policy-over-filtering` — configured policies suppress more
  than 80 % of findings (review for over-broad patterns).
- `low-confidence-policy-filter` — at least one policy hit with
  `confidence: "low"`.
- `unused-policy-filter` — at least one configured policy
  matched zero findings (remove or refine the matcher).

The built-in deterministic rules below still run when no policy
matches a finding.

## Reasons

v1 ships deterministic, path-aware rules. There is no LLM,
semantic matching, or fuzzy matching. Priority order (strongest
first):

- **`generated-file`** — path segment is `dist`, `build`, or
  `generated`, or path contains `__generated__` or
  `.generated.`. Confidence: high.
- **`external-file`** — path segment is `node_modules`,
  `vendor`, or `third_party`. Confidence: high.
- **`test-file`** — path segment is `test`, `tests`,
  `__tests__`, or `__test__`, or filename ends with
  `.test.{ts,tsx,js,jsx,mjs,cjs}` or
  `.spec.{ts,tsx,js,jsx,mjs,cjs}`. Confidence: high.
- **`canary-file`** — path contains `canary`. Confidence: high.
- **`content-filter`** — finding text mentions "generated
  output" **and** file is in a generated path. Confidence:
  medium.
- **`explicit-exclusion`** / **`policy-exception`** — emitted
  by configured exclusion policies (see "Configured Exclusion
  Policies" above). Both reasons are operator-supplied via
  `.rekon/config.json` `findingFilters`.
- **Classic-inspired content filters (v2)** — deterministic
  structural checks over `Finding.type` / `ruleId` /
  `details` that mirror codebase-intel-classic's content
  filtering pipeline. Each filter is synchronous,
  side-effect-free, and produces a `source: "system"` audit
  entry. See "Classic Content Filters" below.
- **Classic-inspired result filters (v2)** — operator-
  configured surface filters from
  `.rekon/config.json findingResultFilters`. Reasons:
  `below-min-confidence`, `below-min-severity`,
  `outside-selected-system`, `configured-path-exclusion`.
  Result-filtered findings are recorded with
  `source: "system"` and a result-filter reason so they
  remain auditable; they are **not** silently deleted. See
  "Classic Result Filters" below.
- **Graph-aware filters (v1 + v2 + v3 + v4 +
  publication diagnostics + regression fixtures)** —
  deterministic structural checks that consume Rekon
  artifacts (`ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, `EvidenceGraph`, `GraphSlice`) to
  suppress findings backed by structural evidence.
  Six regression fixtures under
  `tests/fixtures/graph-aware-filters/` cover every
  graph-aware reason end-to-end: three EvidenceGraph
  branches (`route-handler-with-service`,
  `external-api-comment-only`,
  `nextjs-route-convention`), one EvidenceGraph
  branch with a positive + negative case
  (`route-http-middleware-only`), and two
  path-evidence branches attributing as
  `DetectorDetails`
  (`factory-file-creates-deps`,
  `module-gate-verified-caller`). Each `FilteredFinding` records
  `evidenceSource` (`EvidenceGraph` / `ObservedRepo` /
  `DetectorDetails` / `Policy` / `BuiltIn` /
  `ResultFilter`). Filter-health summarizes the
  distribution; architecture summary + agent contract
  surface evidence-source breakdowns so operators can
  see whether graph-aware suppression is artifact-backed
  or relying on fallback. **v4
  graph-aware import-fact consumers**: the three
  import-consuming checks
  (`route-handler-with-service`,
  `route-http-middleware-only`,
  `external-api-comment-only`) now deliberately prefer
  EvidenceGraph import facts (via the
  compatibility-aware `listImportTargetsForFile`) over
  `Finding.details.imports`. Evidence strings name the
  source ("EvidenceGraph import facts …" / "Detector
  import details …" / "ObservedRepo file index …") so
  audit consumers can tell at a glance which branch
  fired. v2 moved this stage *ahead* of
  classic content so the audit credits the strongest source
  when both can match; classic content remains the fallback.
  v2 also prefers `EvidenceGraph` import facts over
  `Finding.details.imports`, falls back to
  `ObservedRepo.files` sibling lookups, and emits
  `usedArtifacts` per decision so the runtime cites only the
  artifacts that actually contributed. v3 added a sixth
  graph-aware check, `nextjs-route-convention`, that
  consumes the new `EvidenceGraph` export facts via
  `listExportsForFile` — when export facts exist for a
  `route.ts` file, they are authoritative over
  `details.otherExports`, and the classic content fallback
  is skipped for that finding even if the detector-supplied
  `otherExports` would have looked clean. The six shared
  reason codes (`route-handler-with-service`,
  `route-http-middleware-only`,
  `external-api-comment-only`,
  `factory-file-creates-deps`,
  `module-gate-verified-caller`,
  `nextjs-route-convention`) carry across the graph-aware
  layer and the classic content fallback — no new reason
  codes. Filter-health buckets all six as
  `graphAwareFiltered` (see
  [FindingFilterHealthReport](../artifacts/finding-filter-health-report.md)).
  See
  [graph-aware-finding-filters.md](graph-aware-finding-filters.md)
  for the full per-check shape and the v2 + v3 helper
  exports (`listExportsForFile`, `listSymbolsForFile`).
- **`other`** — reserved escape hatch; not used by v1.

Findings with no `files` are kept by default (no rule has
anything to match against).

## Classic Content Filters

v2 ports a deterministic subset of codebase-intel-classic's
content-filtering pipeline. Every filter inspects the
`Finding` structurally (type, `ruleId`, optional `details`
bag) — no source-code regex, no LLM, no file-system access.

Filter pipeline order:

1. **Policy filters** (`findingFilters`).
2. **Graph-aware filters** (see "Graph-aware filters" above
   and
   [graph-aware-finding-filters.md](graph-aware-finding-filters.md)).
   v2 moved this stage *before* classic content so a
   match backed by artifact evidence credits the strongest
   source. No-op when graph context is missing.
3. **Classic content filters** (this section). Fallback for
   the five shared reason codes when graph-aware did not
   fire.
4. **Built-in path heuristics** (`generated-file` /
   `external-file` / `test-file` / `canary-file` /
   `content-filter`).
5. **Result filters** (next section).

The pipeline short-circuits on the first match. Classic
content filters land at priority `10`-`12`; broad path
heuristics at `0`-`5`. Priority only matters when path
heuristics would otherwise out-rank a content reason — the
content layer always runs first so its specific signals win.

Filter cases (matched in the listed order):

| Reason | Trigger |
| --- | --- |
| `empty-constructor-stub` | `type === "stub"`, `details.stubName === "constructor"`, `details.stubReason === "empty_body"` |
| `storage-retrieval-placeholder` | `type === "stub"`, `details.stubName` starts with `getStored`, `details.stubReason` mentions `null` / `undefined` |
| `client-safe-infra` | architecture finding under `imports.no_server_only_in_client` where every evidence fragment is `Client*` / `*Client.ts` / `ClientBridge` / `ClientLogger` / `ClientPreferences` |
| `same-directory-import` | architecture finding under `imports.use_at_alias` where every evidence path starts with `./` and contains no `..` |
| `svg-namespace-url` | architecture finding under `external_apis.no_hardcoded_api_urls_outside_providers` where every evidence URL is `http://www.w3.org/2000/svg` / `http://www.w3.org/1999/xlink` |
| `client-env-node-env` | architecture finding under `security.api_keys_server_side_only` where every `details.envVars` / `details.evidence` entry is `NODE_ENV` |
| `speculative-anti-pattern` | `type === "anti_pattern"` and description hedges with "may indicate business logic" / "might indicate business logic" |
| `archetype-inference-note` | architecture finding with empty `files[]` and description starting with "Topology contract inferred from archetype" |
| `hardcoded-config-not-dde` | architecture finding under `architecture.decisions.go_through_dde_gates` with empty `decisionCapabilities` and `decisionConcerns` that all match config-shaped fragments (`hardcoded`, `magic number`, `timeout`, `delay`, `limit`, `navigation`, `should be configurable`, `should be externalized`, `should use design token`) without any business-decision fragments (`dde`, `gate`, `policy`, `routing decision`, `feature flag`, `business logic`, `decision logic`) |
| `ui-http-provider-abstraction` | architecture finding with `details.concernTag === "ui_http_direct_call"` and file path under `/hooks/` or containing `/use*` |
| `ui-hook-uses-http-not-db` | architecture finding mentioning database/db + hook/use + UI hook, plus a `useAdmin` / `useFetch` / `useApi` / `useQuery` shape or hedge wording (`likely` / `probably` / `appears to`) |
| `module-gate-verified-caller` | architecture finding under a module-gate rule (`architecture.gates.must_have_production_caller`, `architecture.gates.applies_to_must_have_production_evaluator`, `architecture.gates.modules_must_not_create_custom_scopes`) with a `GateEvaluator` / `/modules/` file or `details.owner.kind === "module"` |
| `route-handler-with-service` | architecture finding under `architecture.layering.delegates_orchestrates_decides_persists` or `routes.construct_and_inject_deps`, file ends with `route.ts`, `details.imports` includes a sibling `*/handler` module |
| `route-http-middleware-only` | architecture finding under `routes.construct_and_inject_deps`, file ends with `route.ts`, all `details.imports` referencing infra live under `/infra/http/` or `/infra/Identity` |
| `external-api-comment-only` | architecture finding under `external_apis.calls_go_through_providers` where `details.imports` has no `openai` / `openrouter` / `@openai/*` reference |
| `factory-file-creates-deps` | architecture finding under `dependency_injection.services_must_not_call_factories` or `dependency_injection.services_must_not_instantiate_infra` with a `Factory.ts` / `factory.ts` file or path under `core/services/**/init/**` |
| `nextjs-route-convention` | architecture finding under `routes.single_http_handler_export`, file ends with `route.ts`, `details.otherExports` entirely in `runtime` / `dynamic` / `revalidate` / `fetchCache` / `preferredRegion` |

The `Finding.details?: Record<string, unknown>` field is
additive — detectors that don't surface structured detail
simply never hit any classic content filter.

## Classic Result Filters

Operator-configured result filters from
`.rekon/config.json findingResultFilters`:

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

Fields:

- **`minConfidence`** — number in `[0, 1]`. Suppresses any
  finding whose `details.minCapabilityConfidence` is below
  this floor. Reason: `below-min-confidence`.
- **`severity`** — one of `critical` / `high` / `medium` /
  `low`. Suppresses any finding ranked below this floor
  (critical > high > medium > low). Reason:
  `below-min-severity`.
- **`systems`** — non-empty list of allowed system ids.
  Compared against `details.system` (single) and
  `details.ownerSystems` (list). Suppresses any finding
  whose declared systems don't overlap the allowed set.
  Reason: `outside-selected-system`.
- **`pathExcludes`** — list of project-relative glob
  patterns. Same vocabulary as `findingFilters[].pathPattern`
  (`*` per-segment, `**` across segments, `?` per-character).
  Absolute paths and `..` traversal are rejected at
  validation time. Reason: `configured-path-exclusion`.

Validator: `validateFindingResultFilterOptions`. Surfaced
through `rekon config validate` — invalid entries are
errors, not warnings.

Result filters run **after** content + path + policy
filters so deterministic suppression keeps priority. Result-
filtered findings still appear in
`FindingFilterReport.filteredFindings` with
`source: "system"` and the matching reason — they are not
silently deleted, and operator status decisions
(`accepted` / `ignored` / `resolved`) are **not** used as a
substitute.

## Audit Guarantee

- `FindingReport` is **never** mutated by filtering.
- Filtered findings remain in
  `FindingFilterReport.filteredFindings` with the full original
  payload, so a future operator can review or recover them.
- The filter run timestamps each entry (`filteredAt`) and labels
  the source (`system` / `operator` / `policy`).
- `rekon artifacts freshness` marks the filter report `stale`
  when a newer `FindingReport` is written.

## Policy Fingerprint and Freshness

Each `FindingFilterReport` written by filter-policy-freshness
v2 carries an order-sensitive
`policyFingerprint: { digest, ruleCount, ruleIds }` of the
`findingFilters` policy set the run used. The CLI / publishers
compare this fingerprint against the current
`.rekon/config.json` `findingFilters` to detect drift:

- **fresh** — current config fingerprint matches the report
  fingerprint.
- **stale** — fingerprints diverge; the operator changed
  `findingFilters` after the filter run. Active governance
  (lifecycle / adjudication / coherency / publications) may be
  stale until `rekon refresh` rebuilds the filter chain.
- **missing** — no `FindingFilterReport` indexed yet. Run
  `rekon refresh` (or `rekon findings filter`).
- **unknown** — latest `FindingFilterReport` predates
  filter-policy-freshness v2. Run `rekon refresh` to regenerate
  a fingerprinted report.

`@rekon/capability-docs.architecture-summary` renders a
`## Finding Filter Policy Freshness` section with the status
and both fingerprints (current vs. report).
`@rekon/capability-docs.agent-contract` renders the same as a
`### Finding Filter Policy Freshness` subsection and adds a
`Do Not Do` reminder against acting on stale active
governance after a policy change.

`rekon findings filter-policy apply` now reports
`currentPolicyFingerprint`, `projectedPolicyFingerprint`
(dry-run), and `policyFingerprint` (actual apply) so operators
can confirm what `rekon refresh` should next see in the
`FindingFilterReport`.

## Health Alerts

`FindingFilterHealthReport.alerts` is deterministic.
Diagnostics v2 ships thirteen alert codes:

- **`high-filter-rate`** — fires when `filterRate > 0.8`.
  Inspect which reasons dominate `byReason` — a 90 %+ filter
  rate usually means the evaluator is mis-targeting paths.
- **`low-confidence-filtered`** — fires when any filtered
  finding has confidence `low`. Message includes the count.
- **`policy-over-filtering`** — fires when configured
  `findingFilters` policies suppress more than 80 % of total
  findings (review for over-broad `pathPattern`s).
- **`low-confidence-policy-filter`** — fires when a configured
  policy with `confidence: "low"` suppressed at least one
  finding.
- **`unused-policy-filter`** — fires when a configured policy
  matched zero findings. Message lists the unused policy id(s).
- **`content-filter-high-volume`** *(v2)* — fires when one
  classic-inspired content reason accounts for `>= 5`
  findings AND `> 50 %` of total findings.
- **`result-filter-over-filtering`** *(v2)* — fires when
  configured `findingResultFilters` suppress more than 80 %
  of total findings.
- **`reason-over-filtering`** *(diagnostics v2)* — fires when
  `totalFindings >= 5` AND the dominant reason's rate is
  `>= 50 %`. Catches a single reason doing more than half the
  suppression even when the overall filter rate is moderate.
- **`policy-dominance`** *(diagnostics v2)* — fires when
  `totalFindings >= 5` AND the dominant policy's rate is
  `>= 50 %`. Same intent as `reason-over-filtering` but
  applied to configured policies.
- **`content-filter-dominance`** *(diagnostics v2)* — fires
  when `totalFindings >= 5` AND the classic content filter
  bucket accounts for `>= 50 %` of total findings.
- **`result-filter-dominance`** *(diagnostics v2)* — fires
  when `totalFindings >= 5` AND the result-filter bucket
  accounts for `>= 50 %` of total findings.
- **`policy-fingerprint-missing`** *(diagnostics v2)* — fires
  when `policyFiltered > 0` AND the upstream
  `FindingFilterReport` has no `policyFingerprint` (report
  predates filter-policy-freshness v2). Rerun
  `rekon refresh` to regenerate a fingerprinted report.
- **`stale-policy-fingerprint`** *(diagnostics v2)* — fires
  when the caller supplied `currentPolicyFingerprint` that
  does not match `FindingFilterReport.policyFingerprint`.
  Rerun `rekon refresh`. (Mirrors the freshness warning the
  architecture summary / agent contract render.)

`FindingFilterHealthReport.summary` additionally carries
counts and rates that downstream surfaces can render
without re-deriving from the raw filter report:

- **`contentFiltered`** *(v2)* — findings suppressed by a
  classic-inspired content filter.
- **`resultFiltered`** *(v2)* — findings suppressed by an
  operator-configured result filter.
- **`builtInPathFiltered`** *(diagnostics v2)* — findings
  suppressed by built-in path / content heuristics. The four
  counts (policy + content + result + built-in path) sum to
  `totalFiltered`.
- **`filterRateByReason`** *(diagnostics v2)* — per-reason
  rate (`byReason[reason] / totalFindings`), rounded to four
  decimals.
- **`filterRateByPolicy`** *(diagnostics v2)* — per-policy
  rate, present when `byPolicy` is non-empty.
- **`dominantReason`** *(diagnostics v2)* —
  `{ reason, count, rate }` for the reason that suppressed
  the most findings (alphabetic tiebreak).
- **`dominantPolicy`** *(diagnostics v2)* —
  `{ policyId, count, rate }` for the policy that suppressed
  the most findings (alphabetic tiebreak).
- **`policyFingerprint`** *(diagnostics v2)* — mirror of the
  upstream `FindingFilterReport.policyFingerprint`. Present
  when the filter report carries one.

The alert list is empty when filtering looks healthy.

### Classification helpers

Diagnostics v2 exports four pure deterministic classifiers
that mirror the bucketing the health report performs:

- `isPolicyFiltered(entry)` — `source === "policy"` or
  `policyId` set.
- `isResultFiltered(entry)` — non-policy entry whose reason
  is in the result-filter set
  (`below-min-confidence` / `below-min-severity` /
  `outside-selected-system` / `configured-path-exclusion`).
- `isClassicContentFiltered(entry)` — non-policy entry whose
  reason is in the 17-case classic content set.
- `isBuiltInPathFiltered(entry)` — non-policy entry whose
  reason is in the built-in path / content set
  (`generated-file`, `external-file`, `test-file`,
  `canary-file`, `content-filter`, `explicit-exclusion`,
  `policy-exception`, `other`).

Policy always wins: a filtered entry whose `reason` happens
to be `policy-exception` but whose `source === "policy"` is
classified as **policy**, not built-in.

## What This Is Not

- **Not an operator status decision.** Status decisions belong
  in `FindingStatusLedger`.
- **Not a delete.** Filtered findings are preserved with audit
  evidence in `FindingFilterReport.filteredFindings`.
- **Not LLM / fuzzy / semantic.** v1 is purely deterministic
  path / content rules. Configured exclusion policies are
  deterministic matchers (path glob / type / ruleId / severity /
  title / description substring); operators describe the
  intent, not the model.
- **Not a graph / ontology validator.** The classic
  `GraphOntologyValidator` is deferred.
- **Consumed by lifecycle / adjudication / coherency.**
  `FindingLifecycleReport` reads `keptFindings` from the latest
  current filter report; `IssueAdjudicationReport` groups those
  kept findings; `CoherencyDelta` rolls up only governed kept
  issues. Filtered findings remain auditable in
  `FindingFilterReport.filteredFindings` and do not flow into
  active governance. When the latest filter report does not
  cite the latest `FindingReport`, the lifecycle transparently
  falls back to the raw report.
- **Surfaced in publications.**
  `@rekon/capability-docs.architecture-summary` renders a
  `## Finding Filter Health` section (kept / filtered counts,
  filter rate, per-reason / per-policy tables, full alert
  list, audit pointer to `filteredFindings`).
  `@rekon/capability-docs.agent-contract` renders a
  `### Finding Filter Health` subsection under
  `Active Governance State` that visibly warns when alerts
  exist and instructs agents to inspect
  `FindingFilterReport.filteredFindings` before claiming the
  repo has no active issues. The agent contract's `Do Not Do`
  list adds a clean-active-governance reminder.
- **Promotable to durable policy via suggestions.** Repeated
  filtered findings can be turned into project-specific
  `findingFilters` rules via
  [`FindingFilterPolicySuggestionReport`](../artifacts/finding-filter-policy-suggestion-report.md).
  `rekon findings filter-policy suggest` generates the
  suggestions (deterministic, no LLM, no fuzzy matching).
  `rekon findings filter-policy list` reads the latest
  report. `rekon findings filter-policy apply <id>` is the
  **only** command that mutates `.rekon/config.json`. It
  refuses low-confidence rules, broad `pathPattern` rules
  (`*`, `**`, `src/**`, etc.), and duplicate ids without
  `--force`; with `--force` a duplicate id **replaces** the
  existing rule (it never appends a second). Run with
  `--dry-run` (alias `--preview`) first to inspect the
  exact proposed rule, structured config diff, and
  validation result without writing anything. See
  [finding-filter-policy-suggestions.md](finding-filter-policy-suggestions.md).
- **Auditable via `rekon findings filter-policy status`.**
  Read-only operator workflow surface that combines the
  current policy set with the latest filter / health /
  suggestion reports. Reports per-policy usage counts,
  freshness, warnings (`unused-policy`, `dominant-policy`,
  `low-confidence-policy`, `broad-policy`,
  `stale-policy-fingerprint`), and suggestions. Never
  mutates `.rekon/config.json`. See
  [finding-filter-policy-status.md](finding-filter-policy-status.md).
- **Visible in publications.** The architecture summary
  renders a `## Finding Filter Policy Suggestions` section
  with a per-suggestion table; the agent contract renders a
  `### Finding Filter Policy Suggestions` subsection with an
  advisory blockquote and `Do Not Do` reminders so agents
  never apply suggestions on their own. Both surfaces show
  a stale banner when the suggestion report cites filter
  reports older than the latest indexed `FindingFilterReport`.

## CLI Surface

```sh
rekon findings filter --root <repo> --json
rekon findings filter-health --root <repo> --json
```

`rekon refresh` runs both steps automatically between
`evaluate` and `findings.lifecycle`. `rekon artifacts validate`
and `rekon artifacts freshness` cover both artifact types.

## Cross-References

- [Issue governance architecture decision](../strategy/issue-governance-architecture-decision.md)
- [FindingFilterReport artifact](../artifacts/finding-filter-report.md)
- [FindingFilterHealthReport artifact](../artifacts/finding-filter-health-report.md)
- [FindingReport artifact](../artifacts/finding-report.md)
- [Finding lifecycle concept](finding-lifecycle.md)
- [Issue adjudication concept](issue-adjudication.md)
- [Coherency delta concept](coherency-delta.md)
- [Refresh pipeline](refresh.md)
