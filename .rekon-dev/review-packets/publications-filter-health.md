# Review Packet: Filter Health / Issue Adjudication Surfaces in Publications

Slice: P1.1 (Issue Adjudication), filter-health-publications v1 slice.
Implements step 4 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order.

## CHANGES MADE

### `packages/capability-docs/src/index.ts`

- Imports `FindingFilterReport` and `FindingFilterHealthReport`
  from `@rekon/kernel-findings`.
- `architectureSummaryPublisher.publish`:
  - Reads the latest `FindingFilterReport` and
    `FindingFilterHealthReport` via the existing
    `readLatestArtifact` helper so both refs land in
    `inputRefs` when present.
  - Forwards them to `renderArchitectureSummary` via the new
    `findingFilterReport` / `findingFilterHealthReport` inputs.
- `agentContractPublisher.publish`:
  - Reads the same two artifacts; cites both in `inputRefs`.
  - Forwards them to `renderAgentContract`.
- `ArchitectureSummaryInputs` and `AgentContractInputs` gain
  optional `findingFilterReport?` and
  `findingFilterHealthReport?` fields.
- `renderArchitectureSummary` calls a new file-local helper
  `appendArchitectureFindingFilterHealth(sections, filter,
  health)` right after the `## Accepted Issue Merge Roll-ups`
  block and before `## Input Freshness Warnings`. The helper:
  - Renders `## Finding Filter Health`.
  - With both artifacts present: `Total findings`,
    `Kept findings`, `Filtered findings`, `Filter rate`,
    `Policy-filtered findings`, plus three tables:
    **Filter Reasons** (per-reason counts), **Policy Filters**
    (per-policy counts plus a list of any unused policy ids),
    and **Filter Health Alerts** (severity / code / message).
    Always closes with "Filtered findings are not deleted.
    Inspect `FindingFilterReport.filteredFindings` for the
    full audit (each entry records reason, evidence,
    confidence, source, and optional policyId)."
  - With either artifact missing: emits the matching
    `rekon findings filter` / `rekon findings filter-health` /
    `rekon refresh` command hint.
- `renderAgentContract` calls a new file-local helper
  `appendAgentContractFindingFilterHealth(sections, filter,
  health)` right after the `### Accepted Issue Merge Roll-ups`
  block and before `### Governance Freshness`. The helper:
  - Renders `### Finding Filter Health` (subsection-level).
  - Lists `Kept findings`, `Filtered findings`, `Filter rate`,
    `Policy filters active`, `Warnings`.
  - When any health alert exists, emits a blockquote
    "Filter-health warnings exist. Do not assume active
    governance is complete until filtered findings are
    reviewed." followed by up to five
    `\`<code>\` — <message>` bullets, with an overflow line
    if there are more than five.
  - Always closes with "If filter rate is high or policy
    warnings exist, inspect `FindingFilterReport.filteredFindings`
    before claiming the repo has no active issues."
  - Missing-artifact branches emit
    `rekon findings filter` / `rekon refresh` hints.
- New small helper `sortedCountEntries(counts, limit = 10)`
  returns up to `limit` entries sorted by descending count
  then ascending id; used by the architecture-summary helper
  to keep table rendering deterministic.
- `AGENT_CONTRACT_DO_NOT_DO` gains: "Do not treat a clean
  active-governance surface as proof that no raw findings
  exist; inspect FindingFilterReport when filter-health
  warnings exist or the filter rate is high."
- Manifest update: `consumes` gains `FindingFilterReport`
  and `FindingFilterHealthReport`. New `invalidatedBy`
  entry `finding-filter.changed` (inputs:
  `FindingFilterReport`, `FindingFilterHealthReport`).

### Tests

- New `tests/contract/publications-filter-health.test.mjs`
  with **12 tests** (all passing) covering:
  1. Architecture summary renders the `## Finding Filter
     Health` section with kept / filtered / filter-rate
     counts, per-reason table, per-policy table, and the
     audit-pointer language ("Filtered findings are not
     deleted").
  2. Architecture summary cites both `FindingFilterReport`
     and `FindingFilterHealthReport` in `header.inputRefs`.
  3. Architecture summary renders filter-health alerts when
     alerts exist (uses an `unused-policy-filter` setup).
  4. Architecture summary missing-artifact guidance fires
     when no filter run has happened (skips refresh, runs
     observe / project / snapshot / publish only).
  5. Agent contract renders the `### Finding Filter Health`
     subsection with kept / filtered / filter-rate /
     active-policy / warnings counts.
  6. Agent contract cites both filter artifacts in
     `header.inputRefs`.
  7. Agent contract emits the "Filter-health warnings exist"
     blockquote and the alert code when alerts exist.
  8. Agent contract `Do Not Do` includes the new
     clean-active-governance warning.
  9. Agent contract missing-artifact guidance fires when no
     filter run has happened.
  10. Architecture summary publication freshness goes
      `stale` after a newer `FindingFilterHealthReport` is
      written (pinned via
      `rekon artifacts freshness --type Publication --id …`).
  11. `rekon publish agents` and `rekon publish proof` still
      emit `Publication` artifacts after the filter-health
      wiring.
  12. `rekon artifacts validate` stays clean after both new
      publications run.
- Test fixture helper `withPolicyFixture` overlays a
  synthetic `FindingReport` (citing the latest
  `EvidenceGraph` + `OwnershipMap`) into a refreshed
  example, patches `.rekon/config.json` with a `legacy-src`
  `findingFilters` policy (plus any caller-supplied extras),
  re-runs `findings filter` + `findings filter-health`, and
  then yields the prepared root.
- Full suite: **514 passed / 1 skipped / 0 failed**.

### Docs

- `docs/artifacts/architecture-summary-publication.md` —
  inserted a numbered section #7 "Finding Filter Health" and
  shifted #7-#15 to #8-#16.
- `docs/concepts/architecture-summary-publication.md` —
  expanded the input-list paragraph to describe the new
  Finding Filter Health section and missing-artifact hints.
- `docs/artifacts/agent-contract-publication.md` — extended
  the `Active Governance State` description to describe the
  new Finding Filter Health subsection and its alert
  blockquote / audit-pointer behavior.
- `docs/concepts/agent-operating-contract.md` — section
  table updated to include `FindingFilterReport`,
  `FindingFilterHealthReport`, and the Finding Filter Health
  subsection; new "Finding Filter Health" prose section
  added after "Accepted Issue Merge Roll-ups".
- `docs/artifacts/finding-filter-report.md` — "Consumed By"
  gains two new entries naming the architecture-summary +
  agent-contract publishers.
- `docs/artifacts/finding-filter-health-report.md` —
  "Consumed By" gains two new entries naming the same
  publishers.
- `docs/concepts/finding-filters.md` — added a "Surfaced in
  publications" bullet that names both publishers and
  describes the agent contract's `Do Not Do` reminder.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order item 4 flipped from "future" to
  "shipped" with a full description; new item 5 (filter
  policy / exclusion persistence v2) added as the next
  slice.
- `docs/strategy/classic-subsystem-purpose-map.md` —
  subsystem 6 row updated; next-slice column now
  "Filter policy / exclusion persistence v2".
- `docs/strategy/classic-behavior-roadmap.md` — new
  "Filter health / issue adjudication surfaces in
  publications" entry under P1.1 with full behavioral
  description.
- `docs/strategy/classic-guarantee-regression-plan.md` —
  new shipped entry pinned by the new 12-test contract.
- `docs/strategy/roadmap.md` — new bullet under the alpha
  spine for the filter-health-publications v1 slice.
- `CHANGELOG.md` — detailed entry at the top of
  `0.1.0-alpha.1`.

Review packet: `.rekon-dev/review-packets/publications-filter-health.md` (this file).

## PUBLIC API CHANGES

`@rekon/capability-docs`:
- `ArchitectureSummaryInputs.findingFilterReport?` and
  `ArchitectureSummaryInputs.findingFilterHealthReport?`
  (additive optional).
- `AgentContractInputs.findingFilterReport?` and
  `AgentContractInputs.findingFilterHealthReport?`
  (additive optional).
- Manifest `consumes` gains `FindingFilterReport` and
  `FindingFilterHealthReport`. New `finding-filter.changed`
  invalidation rule (additive).

No SDK API change. No artifact registry change. No artifact
`schemaVersion` bump. No new capability role. No new CLI
subcommand. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

Original problem: filtering can hide real governance signals
if users cannot see what was filtered or why. Agents may
trust a clean `CoherencyDelta` without realizing that active
governance is heavily filtered by policy. Classic
codebase-intel kept filtered issues auditable and produced
filter-health diagnostics so operators could audit the
filter layer.

Classic shape: `services/IssueDetectionService.ts`,
`services/issues/filter-health.ts`,
`services/issues/report-persistence.ts`,
`services/issues/content-filters.ts`,
`services/issues/issue-result-filters.ts`,
`filtered-issues.json`, and the classic filter-health
report.

Rekon equivalent (this slice):
- `FindingFilterReport` records every filtered finding with
  `reason` / `evidence` / `confidence` / `policyId` / `source`.
- `FindingFilterHealthReport` records filter rate, per-policy
  counts, alerts, and unused policy ids.
- The architecture summary and agent contract now render
  both artifacts so the diagnostics are visible where
  humans and agents act.
- Both publications cite the filter artifacts in
  `header.inputRefs` so freshness propagates.

What would mean we failed (and isn't the case):
- Publications show "no active findings" while hiding heavy
  filtering → tests 1, 5, 7 assert that the new sections /
  subsections are present and surface filter counts +
  alerts.
- Agents cannot tell which `findingFilters` policy
  dominated → architecture summary renders a per-policy
  table; agent contract surfaces the alert codes and the
  inspect-`FindingFilterReport` hint.
- Filter-health warnings are buried in artifacts → tests 3,
  7 assert that alert codes / messages appear in the
  rendered publications when alerts exist; agent contract
  emits a visible blockquote.
- Publications imply filtered findings were deleted →
  architecture summary always closes the section with
  "Filtered findings are not deleted. Inspect
  `FindingFilterReport.filteredFindings` for the full
  audit." Agent contract closes with the
  inspect-`filteredFindings` instruction. Tests 1 + 5 + 7
  assert these strings.
- Filter-health data rendered without citing input
  artifacts → tests 2 + 6 assert both publications cite
  both artifacts in `header.inputRefs`. Test 10 confirms
  freshness goes stale on a newer `FindingFilterHealthReport`.

Regression: given a `FindingFilterReport` with a
policy-filtered finding and a `FindingFilterHealthReport`
with an `unused-policy-filter` alert,
`rekon publish architecture` renders kept / filtered /
filter-rate counts, the per-reason table, the per-policy
table, the alert table, and the audit-pointer line.
`rekon publish agent-contract` renders the
`### Finding Filter Health` subsection with kept / filtered
counts, the warnings blockquote, the alert code, and the
inspect-`filteredFindings` hint. Both publications cite the
filter artifacts. All covered by tests 1-12.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: filtered issue audit and
filter-health diagnostics rendered for operators.

What Rekon keeps:
- filtered findings remain auditable
- filter-health warnings are visible
- users can distinguish "no issues" from "issues were
  filtered"
- policy filters are visible by id and reason
- active governance uses kept findings, but filtered
  findings remain inspectable
- publications cite filter artifacts in `header.inputRefs`

What Rekon simplifies:
- summary tables only (no dashboard, no PR/check surface)
- no advanced filter-health scoring beyond v1 alerts
- no `GraphOntologyValidator`
- no persistent exclusion-list UI
- no semantic false-positive classifier
- the architecture summary's Filter Reasons / Policy Filters
  tables show the top 10 rows; the alert table renders all
  alerts inline

What Rekon does not port yet:
- full classic filter-health alert suite
- graph / ontology false-positive validation
- persistent filtered-report merge semantics across runs
  beyond artifact history
- PR / check filter summaries
- filter tuning UI

How this advances migration:
- Makes the new filter layer load-bearing **and visible**.
- Prevents active governance publications from hiding
  heavy filtering.
- Preserves classic filtered-issue audit value in Rekon's
  publication model — without bypassing the artifact-first
  architecture.

## ARCHITECTURE SUMMARY FILTER HEALTH

Section header: `## Finding Filter Health`. Position:
immediately after `## Accepted Issue Merge Roll-ups`,
before `## Input Freshness Warnings`.

Body (both artifacts present):
- `- Total findings: <n>` — `totalFindings` from the
  health report.
- `- Kept findings: <n>` — `kept` from the filter
  report summary.
- `- Filtered findings: <n>` — `totalFiltered` from
  the health report.
- `- Filter rate: <X.X>%`
- `- Policy-filtered findings: <n>` — `policyFiltered`
  from the health summary.
- `### Filter Reasons` table (per-reason counts, sorted by
  descending count then by reason id; up to 10 rows).
- `### Policy Filters` table (per-policy counts, sorted the
  same way). When `byPolicy` is empty: "No `findingFilters`
  policies configured. Configure project-specific
  exclusions under `.rekon/config.json` `findingFilters`."
  When `unusedPolicies` is non-empty, a follow-up
  "Unused policy id(s): a, b." line.
- `### Filter Health Alerts` table (severity / code /
  message). When the alert list is empty: "No filter-health
  alerts."
- Closing paragraph: "Filtered findings are not deleted.
  Inspect `FindingFilterReport.filteredFindings` for the
  full audit (each entry records reason, evidence,
  confidence, source, and optional policyId)."

Body (filter report missing): "No FindingFilterReport
found. Run `rekon findings filter` or `rekon refresh` to
produce the filter audit."

Body (health report missing only): "No
FindingFilterHealthReport found. Run `rekon findings
filter-health` or `rekon refresh` to produce filter-health
diagnostics."

## AGENT CONTRACT FILTER HEALTH

Subsection header: `### Finding Filter Health`. Position:
immediately after `### Accepted Issue Merge Roll-ups`,
before `### Governance Freshness`.

Body (both artifacts present):
- `- Kept findings: <n>`
- `- Filtered findings: <n>`
- `- Filter rate: <X.X>%`
- `- Policy filters active: <n>` (count of `byPolicy`
  keys).
- `- Warnings: <n>` (count of `alerts`).
- When `alerts.length > 0`: blockquote
  "> Filter-health warnings exist. Do not assume active
  governance is complete until filtered findings are
  reviewed." followed by up to five
  `- \`<code>\` — <message>` bullets and an overflow line
  if there are more than five.
- Closing paragraph: "If filter rate is high or policy
  warnings exist, inspect
  `FindingFilterReport.filteredFindings` before claiming
  the repo has no active issues. Filtered findings remain
  auditable (each entry records reason, evidence,
  confidence, source, and optional policyId)."

Body (filter report missing): "No FindingFilterReport
found. Run `rekon findings filter` or `rekon refresh`
before relying on active governance counts."

Body (health report missing only): "No
FindingFilterHealthReport found. Run `rekon findings
filter-health` or `rekon refresh` to surface filter
diagnostics."

`Do Not Do` adds: "Do not treat a clean active-governance
surface as proof that no raw findings exist; inspect
FindingFilterReport when filter-health warnings exist or
the filter rate is high."

## TESTS / VERIFICATION

Tests:
- New `tests/contract/publications-filter-health.test.mjs`
  (12 tests, all passing).
- Full suite: **514 passed / 1 skipped / 0 failed**.

Required verification commands (all run, all green):
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- `node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js findings filter-health --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish architecture --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish agent-contract --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish proof --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `FindingFilterReport` / `FindingFilterHealthReport` shape
  — both are read, never mutated, never re-written.
- `FindingReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta` — no changes
  to behavior or shape.
- Filter behavior / policy semantics — no changes; this
  slice is strictly about rendering.
- `proofReportPublisher` — out of scope; this slice is
  about issue-governance surfaces. (Tests still confirm
  `rekon publish proof` keeps working.)
- Root `AGENTS.md` overwrite policy — unchanged. The
  agent-contract publication only writes to
  `.rekon/artifacts/publications/agent-contract.md`.
- All capability manifests for other packages, permissions,
  dist contents, schemaVersion strings.
- `GraphOntologyValidator` port — explicitly deferred.
- Persistent exclusion lists / dashboard / PR surfaces —
  deferred.
- `RefreshStepId` / CLI subcommand surface — unchanged.
- No version bump.
- No npm publish.

## RISKS / FOLLOW-UP

- Risk: when only `FindingFilterReport` exists (no
  `FindingFilterHealthReport`), the architecture summary
  emits a single "No FindingFilterHealthReport found"
  branch and skips the rich tables entirely. Rationale:
  the alerts and per-policy unused-ids data live in the
  health report; emitting the kept / filtered counts
  without that context risks misleading the reader.
  Operators get a clear hint to run
  `rekon findings filter-health` / `rekon refresh`.
- Risk: the architecture summary's Filter Reasons / Policy
  Filters tables cap at 10 rows. Long-tail policy ids beyond
  10 are silently dropped from the tables (the `byPolicy`
  numbers in the summary still reflect the totals, and the
  artifact remains the source of truth). Mitigation:
  10 is generous for v1 hand-curated policy sets; future
  work can add an overflow line if needed.
- Risk: the agent contract's warnings blockquote caps at 5
  alert bullets with an overflow line. v1 only emits 5
  alert codes total
  (`high-filter-rate`, `low-confidence-filtered`,
  `policy-over-filtering`, `low-confidence-policy-filter`,
  `unused-policy-filter`), so a real-world v1 run will
  never exceed the cap.
- Risk: both publications now cite the filter artifacts in
  `inputRefs`, so freshness will flag them stale whenever
  filtering is re-run mid-refresh-cycle. This is intended
  — it mirrors the existing adjudication / coherency
  staleness model — but it can produce more "stale
  Publication" entries during dogfood. Mitigation: the
  refresh pipeline always runs filter + filter-health
  before publish, so refresh-built publications stay
  fresh.
- Risk: the agent contract's `Do Not Do` list keeps
  growing. Six entries today; the new one is a
  meaningful agent-facing reminder rather than a
  cosmetic warning. Future work could collapse related
  reminders into thematic bullets if the list reaches a
  size that hurts scanability.
- Follow-up: filter policy / exclusion persistence v2
  (the next slice). Operators should be able to promote
  repeated filtered findings into explicit config-backed
  policy suggestions, while keeping the audit trail.
- Follow-up: PR / GitHub / dashboard surfaces for
  filter-health. Out of substrate scope for now; deferred
  to the surfaces phase.

## NEXT STEP

Per the work order's closing section, the recommended next
slice is:

> Filter policy / exclusion persistence v2

Purpose:
- Preserve classic persistent exclusion-list behavior.
- Allow operators to promote repeated filtered findings
  into explicit config-backed policy suggestions.
- Still no automatic mutation; suggestions are advisory
  and operator-driven.

This is the clean follow-up after the ADR + filter audit
layer + filter-aware lifecycle + filter policy v1 +
filter-health publication surfaces that have now landed.
