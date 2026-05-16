# Review Packet: Filter Policy Suggestions Surfaced in Architecture Summary / Agent Contract

Slice: P1.1 (Issue Adjudication), filter-policy-suggestions-publications v2 slice.
Implements step 6 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to `(shipped)`).

## CHANGES MADE

### `packages/capability-docs/src/index.ts`

- Imports `FindingFilterPolicySuggestionReport` from
  `@rekon/kernel-findings`.
- `architectureSummaryPublisher.publish`:
  - Reads the latest `FindingFilterPolicySuggestionReport` via
    `readLatestArtifact` so its id lands in `inputRefs` when
    present.
  - Also reads the latest `FindingFilterReport` (for the stale
    check); reuses the existing read already done for filter
    health and threads it through.
  - Computes `FilterPolicySuggestionStaleness` via the new
    `computeFilterPolicySuggestionStale` helper and forwards
    both the report and the staleness summary to
    `renderArchitectureSummary` via two new optional inputs:
    `findingFilterPolicySuggestionReport?` and
    `findingFilterPolicySuggestionStale?`.
- `agentContractPublisher.publish`: same as above for the agent
  contract renderer.
- `ArchitectureSummaryInputs` and `AgentContractInputs` gain
  optional `findingFilterPolicySuggestionReport?:
  FindingFilterPolicySuggestionReport` and
  `findingFilterPolicySuggestionStale?:
  FilterPolicySuggestionStaleness` fields.
- New exported type:
  ```ts
  export type FilterPolicySuggestionStaleness = {
    stale: boolean;
    latestFilterReportId?: string;
    citedFilterReportIds: string[];
  };
  ```
- New file-local helper `computeFilterPolicySuggestionStale(
  suggestion, filterReport?)`:
  - Returns `{ stale: false, citedFilterReportIds: [] }`
    when the suggestion report is undefined.
  - Otherwise filters `suggestion.header.inputRefs` to
    `type === "FindingFilterReport"` and returns
    `{ stale: latestId not in citedIds, latestFilterReportId:
    latestId, citedFilterReportIds }`.
  - Targeted local check — does **not** extend the global
    `detectGovernanceFreshness` helper. Deterministic; no
    network; no LLM.
- `renderArchitectureSummary` calls the new
  `appendArchitectureFindingFilterPolicySuggestions(sections,
  suggestion, stale)` right after
  `appendArchitectureFindingFilterHealth` and before
  `## Input Freshness Warnings`. The helper:
  - Renders `## Finding Filter Policy Suggestions`.
  - With a suggestion report present:
    - `Total suggestions: <n>`
    - `By reason: <reason>: <n>, …` (sorted by count desc
      then reason id; empty list omitted)
    - `By confidence: high: <n>, medium: <n>, low: <n>`
      (omitting zero buckets)
    - Per-suggestion table (capped at 20 rows; sorted by
      confidence rank then by suggestion id) with columns
      `Suggestion | Confidence | Reason | Suggested Rule |
      Affected Findings | Evidence`. The "Suggested Rule"
      column renders the rule preview as
      `<pathPattern or type or ruleId>` (path-pattern
      preferred). The "Evidence" column renders the
      first-line summary of `suggestion.rationale`.
    - When any suggestion is low-confidence or duplicates an
      existing `findingFilters` rule id, emits a `--force`
      warning blockquote:
      `> One or more suggestions are low confidence or
      duplicate an existing rule. \`rekon findings
      filter-policy apply <id>\` will refuse them without
      \`--force\`.`
    - When the stale check returns `{ stale: true }`, emits a
      "**Stale Suggestions**" banner blockquote naming the
      latest `FindingFilterReport` id and the cited
      `FindingFilterReport` id(s).
    - Closing line: "Suggestions are advisory and do not
      mutate `.rekon/config.json`. Apply explicitly with
      `rekon findings filter-policy apply <suggestion-id>`."
  - With no suggestion report: "No
    `FindingFilterPolicySuggestionReport` found. Run
    `rekon findings filter-policy suggest` or
    `rekon refresh` to derive candidate `findingFilters`
    rules from the recent filter audits."
- `renderAgentContract` calls the new
  `appendAgentContractFindingFilterPolicySuggestions(sections,
  suggestion, stale)` right after
  `appendAgentContractFindingFilterHealth` and before
  `### Governance Freshness`. The helper:
  - Renders `### Finding Filter Policy Suggestions`
    (subsection-level).
  - With a suggestion report present:
    - Advisory blockquote:
      `> The filter policy suggestion report has <n>
      suggestion(s). Treat them as advisory until an operator
      runs \`rekon findings filter-policy apply <id>\`.`
    - Top suggestions, capped at 5 (sorted by confidence rank
      then id):
      `- \`<id>\` — <reason> (<confidence>) → <suggested rule
      preview> (<n> finding(s))`.
    - When the stale check returns `{ stale: true }`, emits a
      "Stale Suggestions" warning blockquote naming the
      latest `FindingFilterReport` id and the cited ids.
    - Closing line: "Run `rekon findings filter-policy list`
      to inspect every suggestion. Apply only with explicit
      operator approval via `rekon findings filter-policy
      apply <suggestion-id>`."
  - With no suggestion report: "No
    `FindingFilterPolicySuggestionReport` found. Run
    `rekon findings filter-policy suggest` or
    `rekon refresh` to surface filter policy suggestions."
- Two new file-local helpers used by both renderers:
  - `summarizeSuggestedRule(rule)` — preview string
    derived from `pathPattern` / `type` / `ruleId` in that
    order.
  - `summarizeAffectedFindings(suggestion)` — affected
    finding count for the table and bullet text.
  - `summarizeEvidence(suggestion)` — first-line of the
    rationale, fallback to the suggestion reason.
- `AGENT_CONTRACT_DO_NOT_DO` gains two new entries:
  - "Do not apply filter policy suggestions without explicit
    operator approval; run
    `rekon findings filter-policy apply <id>` only when the
    operator instructs it."
  - "Do not treat filter policy suggestions as
    already-applied config; they are advisory until
    `rekon findings filter-policy apply` writes them to
    `.rekon/config.json`."
- Manifest update: `consumes` gains
  `FindingFilterPolicySuggestionReport`. New `invalidatedBy`
  entry `finding-filter-policy-suggestions.changed` (inputs:
  `FindingFilterPolicySuggestionReport`).

### Tests

- New `tests/contract/publications-filter-policy-suggestions.test.mjs`
  with **13 tests** (all passing) covering:
  1. Architecture summary renders the
     `## Finding Filter Policy Suggestions` section with
     total / by-reason / by-confidence counts and at least
     one rendered suggestion row.
  2. Architecture summary cites
     `FindingFilterPolicySuggestionReport` in
     `header.inputRefs`.
  3. Architecture summary renders the `--force` warning when
     any low-confidence suggestion is present (uses
     `withSuggestionFixture({ includeLowConfidence: true })`).
  4. Architecture summary missing-report branch fires when no
     suggestion run has happened (emits the
     `rekon findings filter-policy suggest` /
     `rekon refresh` hint).
  5. Architecture summary renders the stale-suggestions
     banner when a newer `FindingFilterReport` exists after
     the suggestion run.
  6. Architecture summary closing audit-pointer line is
     present ("Suggestions are advisory and do not mutate
     `.rekon/config.json`. …").
  7. Agent contract renders the
     `### Finding Filter Policy Suggestions` subsection with
     the advisory blockquote and at least one top-suggestion
     bullet.
  8. Agent contract cites
     `FindingFilterPolicySuggestionReport` in
     `header.inputRefs`.
  9. Agent contract `Do Not Do` includes both new
     suggestion-related reminders.
  10. Agent contract missing-report branch fires when no
      suggestion run has happened.
  11. Agent contract renders the stale-suggestions banner
      when a newer `FindingFilterReport` exists after the
      suggestion run.
  12. `rekon publish agents` and `rekon publish proof` still
      emit `Publication` artifacts after the suggestion
      wiring (no unintended side-effects on unrelated
      publishers).
  13. `rekon artifacts validate` stays clean after both new
      publications run.
- Test fixture helper `withSuggestionFixture({
  includeLowConfidence })` overlays synthetic findings with
  distinct `src/dist/`, `packages/dist/`, etc. path prefixes
  that all share reason `generated-file` so the
  `high-volume-filtered-pattern` rule fires when low
  confidence is requested.
- Full suite: **542 passed / 1 skipped / 0 failed**.

### Docs

- `docs/artifacts/architecture-summary-publication.md` —
  inserted a numbered section #8 "Finding Filter Policy
  Suggestions"; previous sections #8-#16 shifted to
  #9-#17. (Fixed a duplicate "Top Affected Paths" line that
  appeared briefly during the insert.)
- `docs/concepts/architecture-summary-publication.md` —
  extended publisher description paragraph to mention
  suggestion-report rendering and stale-banner behavior.
- `docs/artifacts/agent-contract-publication.md` — extended
  the `Active Governance State` description to describe the
  new Finding Filter Policy Suggestions subsection plus the
  two new `Do Not Do` reminders.
- `docs/concepts/agent-operating-contract.md` — section
  table updated to include
  `FindingFilterPolicySuggestionReport`; new "Finding Filter
  Policy Suggestions" prose section added.
- `docs/artifacts/finding-filter-policy-suggestion-report.md`
  — "Consumed By" expanded with architecture-summary and
  agent-contract publisher entries.
- `docs/concepts/finding-filter-policy-suggestions.md` —
  added "Surfaced In Publications" section before
  "What This Is Not".
- `docs/concepts/finding-filters.md` — added new
  "Visible in publications" bullet at the end of the
  features list.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order step 6 flipped from `(future)` to
  `(shipped)`; new step 7 added: "Filter policy suggestion
  apply safety v2 — dry-run / preview for config mutations,
  exact config diff before apply, optional broad-pattern
  `--force` guard"; old step 7 renumbered to 8.
- `docs/strategy/classic-subsystem-purpose-map.md` —
  subsystem 6 row updated with the shipped behavior;
  next-slice column changed to "Filter policy suggestion
  apply safety v2 (dry-run / diff preview / broad-pattern
  guard)".
- `docs/strategy/classic-behavior-roadmap.md` — new
  "Filter policy suggestions surfaced in architecture
  summary / agent contract (P1.1
  filter-policy-suggestions-publications v2 slice)" entry
  with full behavioral description, manifest update, new
  helper names, test count 13.
- `docs/strategy/classic-guarantee-regression-plan.md` —
  new shipped entry "Filter policy suggestions surfaced in
  publications v2" pinned by
  `tests/contract/publications-filter-policy-suggestions.test.mjs`
  (13 tests).
- `docs/strategy/roadmap.md` — new bullet under the alpha
  spine for the filter-policy-suggestions-publications v2
  slice.
- `CHANGELOG.md` — detailed entry at the top of
  `0.1.0-alpha.1`.

Review packet:
`.rekon-dev/review-packets/publications-filter-policy-suggestions.md`
(this file).

## PUBLIC API CHANGES

`@rekon/capability-docs`:
- `ArchitectureSummaryInputs.findingFilterPolicySuggestionReport?`
  and
  `ArchitectureSummaryInputs.findingFilterPolicySuggestionStale?`
  (additive optional).
- `AgentContractInputs.findingFilterPolicySuggestionReport?`
  and
  `AgentContractInputs.findingFilterPolicySuggestionStale?`
  (additive optional).
- New exported type `FilterPolicySuggestionStaleness`.
- New exported helper `computeFilterPolicySuggestionStale`.
- Manifest `consumes` gains
  `FindingFilterPolicySuggestionReport`. New
  `finding-filter-policy-suggestions.changed` invalidation
  rule (additive).

No SDK API change. No artifact registry change. No artifact
`schemaVersion` bump. No new capability role. No new CLI
subcommand. No new artifact type. No version bump. No npm
publish.

## PURPOSE PRESERVATION CHECK

Original problem: agents and operators only act on what
publications surface. The previous slice
(`filter-policy-suggestions v2`) introduced
`FindingFilterPolicySuggestionReport`, but it lived only on
disk: nothing in the architecture summary or agent contract
referenced it, so a fresh agent or operator working from
publications had no way to know that filter policy
suggestions even existed. Classic codebase-intel kept
filter-related diagnostics visible in the surfaces operators
read; Rekon's substrate needs the same parity for its
suggestion layer.

Classic shape:
`services/IssueDetectionService.ts`,
`services/issues/policy-suggestion-render.ts`,
`docs/exclusion-suggestions.md`, and the classic
exclusion-suggestion summaries surfaced in dashboards / CLI
hints.

Rekon equivalent (this slice):
- `FindingFilterPolicySuggestionReport` is now read by the
  architecture summary and agent contract.
- Architecture summary renders counts + a per-suggestion
  table + a `--force` warning + an audit pointer.
- Agent contract renders an advisory blockquote + top
  suggestions + two `Do Not Do` reminders.
- Both surfaces render an inline stale-suggestions banner
  when the suggestion report's cited
  `FindingFilterReport` ids don't include the latest one.
- Both publications cite the report in `header.inputRefs`
  so freshness propagates.

What would mean we failed (and isn't the case):
- Publications show a clean filter-policy story while the
  suggestion report has accumulated advice → tests 1, 7
  assert that the new section / subsection is present and
  surfaces totals + top suggestions.
- Agents apply suggestions without operator approval → test
  9 asserts both new `Do Not Do` reminders are present.
- Operators can't tell when suggestions were derived from
  stale filter data → tests 5, 11 assert the
  stale-suggestions banner fires when a newer
  `FindingFilterReport` exists after the suggestion run.
- Low-confidence / duplicate suggestions appear without a
  warning → test 3 asserts the `--force` warning
  blockquote appears when any low-confidence suggestion is
  present.
- Publication shape implies suggestions mutate config →
  architecture summary closing line and test 6 assert the
  "Suggestions are advisory and do not mutate
  `.rekon/config.json`" string.
- Suggestion data renders without citing input artifact →
  tests 2, 8 assert both publications cite
  `FindingFilterPolicySuggestionReport` in
  `header.inputRefs`.

Regression: given a `FindingFilterPolicySuggestionReport`
with a few suggestions (including one low-confidence one),
`rekon publish architecture` renders total / reason /
confidence counts, the per-suggestion table, the `--force`
warning, and the audit-pointer line. `rekon publish
agent-contract` renders the
`### Finding Filter Policy Suggestions` subsection with
advisory blockquote, top suggestions, and the two new
`Do Not Do` reminders. Both publications cite the
suggestion report. After a newer `FindingFilterReport` is
written, both surfaces show the stale-suggestions banner.
All covered by tests 1-13.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: filter policy
suggestions visible in operator-facing surfaces.

What Rekon keeps:
- suggestion totals and per-suggestion details visible in
  publications
- agents instructed never to apply suggestions without
  operator approval and never to treat them as
  already-applied
- low-confidence and duplicate suggestions clearly flagged
- stale suggestions (derived from older filter data)
  clearly flagged
- publications cite the suggestion report in
  `header.inputRefs`
- `rekon findings filter-policy apply` remains the sole
  command that mutates `.rekon/config.json`

What Rekon simplifies:
- summary tables only (no dashboard, no PR/check surface)
- the architecture summary's per-suggestion table caps at
  20 rows; the agent contract's top-suggestions bullet list
  caps at 5
- stale detection is a targeted local check (suggestion
  report's cited filter-report ids vs. latest filter-report
  id); does **not** add a new artifact type or extend the
  global `detectGovernanceFreshness` helper

What Rekon does not port yet:
- dry-run / config-diff preview for
  `rekon findings filter-policy apply` (deferred to step 7
  of the ADR Implementation Order: "Filter policy
  suggestion apply safety v2")
- broad-pattern `--force` guard for `apply`
- per-policy adoption metrics
- dashboard / PR-comment surfaces for suggestions
- semantic / fuzzy / embedding suggestion ranking
- `GraphOntologyValidator` port

How this advances migration:
- Makes the suggestion layer load-bearing **and visible**.
- Closes a gap where filter policy suggestions could
  accumulate on disk without any operator-facing or
  agent-facing surface noticing.
- Preserves classic "visible exclusion suggestion"
  behavior in Rekon's publication model without bypassing
  the artifact-first architecture or the
  apply-is-the-only-mutator invariant.

## ARCHITECTURE SUMMARY FILTER POLICY SUGGESTIONS

Section header: `## Finding Filter Policy Suggestions`.
Position: immediately after `## Finding Filter Health`,
before `## Input Freshness Warnings`.

Body (suggestion report present):
- `- Total suggestions: <n>`
- `- By reason: <reason>: <n>, …` (sorted by count desc
  then reason id; omitted when empty)
- `- By confidence: high: <n>, medium: <n>, low: <n>`
  (omits zero buckets)
- Per-suggestion table sorted by confidence rank then by
  suggestion id, capped at 20 rows:

  | Suggestion | Confidence | Reason | Suggested Rule | Affected Findings | Evidence |
- When any suggestion is low-confidence or duplicates an
  existing `findingFilters` rule id, emits a `--force`
  warning blockquote.
- When the stale check returns `{ stale: true }`, emits a
  **Stale Suggestions** banner blockquote naming the
  latest `FindingFilterReport` id and the cited ids.
- Closing paragraph: "Suggestions are advisory and do not
  mutate `.rekon/config.json`. Apply explicitly with
  `rekon findings filter-policy apply <suggestion-id>`."

Body (suggestion report missing): "No
`FindingFilterPolicySuggestionReport` found. Run
`rekon findings filter-policy suggest` or `rekon refresh`
to derive candidate `findingFilters` rules from the recent
filter audits."

## AGENT CONTRACT FILTER POLICY SUGGESTIONS

Subsection header: `### Finding Filter Policy Suggestions`.
Position: immediately after `### Finding Filter Health`,
before `### Governance Freshness`.

Body (suggestion report present):
- Advisory blockquote naming total count and reminding the
  agent that suggestions are advisory until apply runs.
- Top suggestions (capped at 5):
  `- \`<id>\` — <reason> (<confidence>) → <suggested rule
  preview> (<n> finding(s))`.
- When the stale check returns `{ stale: true }`, emits a
  **Stale Suggestions** warning blockquote.
- Closing paragraph: "Run `rekon findings filter-policy
  list` to inspect every suggestion. Apply only with
  explicit operator approval via
  `rekon findings filter-policy apply <suggestion-id>`."

Body (suggestion report missing): "No
`FindingFilterPolicySuggestionReport` found. Run
`rekon findings filter-policy suggest` or `rekon refresh`
to surface filter policy suggestions."

`Do Not Do` adds two entries:
- "Do not apply filter policy suggestions without explicit
  operator approval; run
  `rekon findings filter-policy apply <id>` only when the
  operator instructs it."
- "Do not treat filter policy suggestions as
  already-applied config; they are advisory until
  `rekon findings filter-policy apply` writes them to
  `.rekon/config.json`."

## TESTS / VERIFICATION

Tests:
- New
  `tests/contract/publications-filter-policy-suggestions.test.mjs`
  (13 tests, all passing).
- Full suite: **542 passed / 1 skipped / 0 failed**.

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
- `node packages/cli/dist/index.js findings filter-policy suggest --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish architecture --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish agent-contract --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish proof --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `FindingFilterPolicySuggestionReport` shape — read,
  never mutated, never re-written. No `schemaVersion` bump.
- `FindingReport`, `FindingFilterReport`,
  `FindingFilterHealthReport`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta` — no changes
  to behavior or shape.
- Filter-policy `suggest` / `list` / `apply` CLI commands
  — unchanged; `apply` remains the sole mutator of
  `.rekon/config.json`.
- `proofReportPublisher` — out of scope; this slice is
  about issue-governance surfaces. (Tests confirm
  `rekon publish proof` keeps working.)
- Root `AGENTS.md` overwrite policy — unchanged. The
  agent-contract publication only writes to
  `.rekon/artifacts/publications/agent-contract.md`.
- All capability manifests for other packages, permissions,
  dist contents, schemaVersion strings.
- `GraphOntologyValidator` port — explicitly deferred.
- Dry-run / config-diff preview / broad-pattern `--force`
  guard for `apply` — deferred to step 7 ("Filter policy
  suggestion apply safety v2").
- Persistent exclusion lists beyond config-backed rules —
  deferred.
- `RefreshStepId` / CLI subcommand surface — unchanged.
- `detectGovernanceFreshness` helper — unchanged; stale
  detection for this slice is a targeted local check.
- No version bump.
- No npm publish.

## RISKS / FOLLOW-UP

- Risk: the architecture summary's per-suggestion table
  caps at 20 rows. Suggestion totals in the summary still
  reflect the artifact totals, and the artifact remains the
  source of truth, so 20 rows is generous for v2
  hand-curated runs but could overflow in a future
  refactor that expands suggestion volume. Mitigation: add
  an overflow line if real-world dogfood ever exceeds 20.
- Risk: the agent contract's top-suggestions bullet list
  caps at 5. Same mitigation as above; v2 reasoning yields
  4 reason types, and dogfooded runs rarely emit > 5
  visible suggestions.
- Risk: both publications now cite the suggestion report
  in `inputRefs`, so freshness will flag them stale
  whenever the suggestion report is re-run mid-refresh-cycle.
  This mirrors the existing adjudication / coherency /
  filter-health staleness model and is intended; the
  refresh pipeline always runs filter / filter-health /
  suggestion before publish, so refresh-built publications
  stay fresh.
- Risk: the agent contract's `Do Not Do` list keeps
  growing (now 8 entries; two new ones in this slice).
  Both new entries are meaningful agent-facing reminders
  that match a real failure mode (applying suggestions
  without approval; treating them as already-applied
  config) rather than cosmetic warnings. Future work
  could group related reminders into thematic clusters if
  the list reaches a size that hurts scanability.
- Risk: stale-suggestion detection is a targeted local
  check rather than a new artifact type / global
  freshness extension. This keeps the slice small and
  matches the work-order stop-condition guidance, but it
  also means other consumers that want to know "are
  suggestions stale?" would need to duplicate the check.
  Mitigation: if a third consumer appears, lift
  `computeFilterPolicySuggestionStale` into a kernel
  helper at that time.
- Follow-up: Filter policy suggestion apply safety v2
  (the next slice). `rekon findings filter-policy apply`
  should grow a dry-run / preview mode, an exact config
  diff before apply, and an optional broad-pattern
  `--force` guard. This is step 7 of the ADR
  Implementation Order.
- Follow-up: PR / GitHub / dashboard surfaces for
  suggestions. Out of substrate scope for now; deferred to
  the surfaces phase.

## NEXT STEP

Per the work order's closing section, the recommended next
slice is:

> Filter policy suggestion apply safety v2

Purpose:
- Make `rekon findings filter-policy apply` safer to use
  on production-shaped configs.
- Preview the exact config diff before mutation.
- Optionally guard broad-pattern suggestions
  (e.g. `**/**`, `*`) behind `--force`.

This is the clean follow-up after the ADR + filter audit
layer + filter-aware lifecycle + filter policy v1 +
filter-health publication surfaces + filter policy
suggestion derivation + filter policy suggestion
publication surfaces that have now landed.
