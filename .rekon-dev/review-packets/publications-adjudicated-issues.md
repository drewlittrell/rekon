# Publications Use Adjudicated Issue Groups

## Batch Summary

The architecture summary and agent operating contract publications
now surface governed issue groups from the latest
`IssueAdjudicationReport`. The architecture summary gains a full
**Governed Issue Groups** table (with member finding ids); the
agent contract gains a short **Governed Issue Groups** subsection
under Active Governance State plus a `rekon resolve issue` hint
and a new Do Not Do entry. Both publications cite the
adjudication report in `header.inputRefs` and label the Coherency
Summary as group-aware vs. raw-finding mode. No mutation of any
upstream artifact. No `Publication` shape change. Closes the
publication-consumption slice of P1.1 in the Classic Guarantees
Audit.

## CHANGES MADE

- `packages/capability-docs/src/index.ts`:
  - Imported `IssueAdjudicationReport` from
    `@rekon/kernel-findings`.
  - `architectureSummaryPublisher.publish` reads the latest
    `IssueAdjudicationReport` via `readLatestArtifact` (which
    cites it in `inputRefs`).
  - `agentContractPublisher.publish` does the same.
  - `ArchitectureSummaryInputs` gains optional
    `issueAdjudicationReport`.
  - `AgentContractInputs` gains optional
    `issueAdjudicationReport`.
  - `renderArchitectureSummary` now:
    - relabels the Coherency Summary unit as `governed issue
      groups` when the `CoherencyDelta` was built from
      adjudication (every delta item carries an `issueGroupId`),
      otherwise `findings`. A one-line preface states the mode.
    - inserts a new `## Governed Issue Groups` section after
      `## Coherency Summary`, with counts and a table of up to 20
      groups (`Group | Status | Severity | Type | Members |
      Files`). The `Members` column carries
      `<count>: <up to 3 ids>` (with `_(+N more)_` overflow).
    - when no adjudication report is indexed, emits a guidance
      paragraph instructing the operator to run `rekon issues
      adjudicate` or `rekon refresh` and warning that raw
      lifecycle counts may overstate drift.
  - `renderAgentContract` now:
    - relabels Active Governance State unit similarly (and
      includes a short preface stating governed vs. raw mode);
    - appends a `### Governed Issue Groups` subsection inside
      Active Governance State with active group counts,
      per-status breakdown, total groups + member findings, the
      top 5 active groups (id, severity, truncated title, member
      count), and the line `Use `rekon resolve issue --issue
      <group-id>` for adjudicated issue context.`;
    - emits the same fallback hint when no adjudication report
      exists.
  - `AGENT_CONTRACT_DO_NOT_DO` gains:
    `"Do not treat raw finding count as governed issue count when
    an IssueAdjudicationReport exists; use governed issue groups
    (memberFindingIds preserves raw traceability)."`
  - New helpers: `coherencyDeltaCameFromAdjudication(delta)`
    (checks if any item carries `issueGroupId`) and
    `summarizeMembers(memberFindingIds)` (renders
    `<count>: <truncated ids>`).
  - Manifest `consumes` adds `IssueAdjudicationReport`. New
    invalidation rule `issue-adjudication.changed` (inputs:
    `["IssueAdjudicationReport"]`).
- `tests/contract/publications-adjudicated-issues.test.mjs`: 11
  new tests covering the full pipeline through both publications
  end-to-end against a seeded fixture (one adjudicated group with
  two member findings), the no-report fallback hint, freshness
  invalidation after a newer report, and a regression check that
  `publish agents` and `publish proof` still work.
- `tests/contract/refresh-command.test.mjs`: relaxed the existing
  "import-boundary fixture surfaces active findings" assertion to
  accept either the new `Active governed issue groups:` label or
  the legacy `Active findings:` label, because refresh now runs
  `issues.adjudicate` between `findings.lifecycle` and
  `coherency.delta` (shipped in the prior batch) so the import-
  boundary fixture's CoherencyDelta is now group-aware. The
  comment in the test records the rationale.
- Docs:
  - `docs/artifacts/architecture-summary-publication.md`:
    Content Structure adds the new Governed Issue Groups section
    (section 5) and renumbers subsequent sections through
    Input Artifacts (now section 14). Inputs Consumed adds
    `IssueAdjudicationReport`. Freshness And Provenance lists
    `IssueAdjudicationReport` as a stale trigger.
  - `docs/concepts/architecture-summary-publication.md`: How It
    Is Built describes the new group-aware behavior.
  - `docs/artifacts/agent-contract-publication.md`: Content
    Structure item 7 (Active Governance State) expanded to
    describe the Governed Issue Groups subsection, group-aware
    Coherency labeling, and the `rekon resolve issue` instruction.
  - `docs/concepts/agent-operating-contract.md`: section map row
    for Active Governance State now references
    `IssueAdjudicationReport`.
  - `docs/artifacts/issue-adjudication-report.md` and
    `docs/concepts/issue-adjudication.md`: mark publication-
    surface consumption as shipped (previously listed as future).
  - `docs/strategy/classic-subsystem-purpose-map.md`: subsystems
    6 (Issue Detection / Adjudication) and 9 (Generated Docs /
    Agent Docs) reflect the new group-aware publication state.
  - `docs/strategy/classic-behavior-roadmap.md`: new Phase B
    entry "Publications use adjudicated issue groups".
  - `docs/strategy/classic-alignment-map.md`: Generated docs /
    publications row reflects v2 group-aware publication.
  - `docs/strategy/classic-guarantee-regression-plan.md`: P1.1
    records the shipped publication slice and the new 11-test
    contract suite.
  - `docs/strategy/roadmap.md`: new bullet under completed alpha
    spine.
  - `CHANGELOG.md`: entry at the top of `0.1.0-alpha.1`.
  - `README.md`: no edit needed — the existing CLI commands
    (`rekon publish architecture`, `rekon publish agent-contract`)
    keep their signatures; behavior change is documented in the
    artifact + concept docs.
- `.rekon-dev/review-packets/publications-adjudicated-issues.md`
  (this file).

## PUBLIC API CHANGES

Additive only.

- `@rekon/capability-docs` manifest:
  - `consumes` adds `IssueAdjudicationReport`.
  - `invalidatedBy` adds `issue-adjudication.changed` citing
    `IssueAdjudicationReport`.
- `Publication` artifact shape is **unchanged**. The `kind` enum
  is unchanged. `format`, `path`, `title`, `header.inputRefs`
  semantics are unchanged. Only the rendered Markdown content
  inside `architecture-summary` and `agent-contract` Publications
  changed.
- `ArchitectureSummaryInputs` and `AgentContractInputs` (internal
  to `@rekon/capability-docs`) each gain an optional
  `issueAdjudicationReport` field.
- No CLI signature changes.
- No `ArtifactHeader` shape changes. No SDK API changes. No new
  capability roles, permissions, or actuators. No version bump.
  No npm publish.

## PURPOSE PRESERVATION CHECK

- **Original problem**: publications that summarize raw findings
  can overstate drift when duplicate / overlapping findings
  exist. Agents and humans need a readable view of governed
  issues, not noisy detector output.
- **Classic workflow guarantee**:
  `codebase-intel-classic` generated docs and assistant guidance
  were based on issue/coherency state **after** adjudication, not
  raw detector emissions. The docs helped agents focus on actual
  governed problems while preserving traceability to source
  evidence.
- **Classic shape that provided the guarantee**:
  `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`,
  `services/ArchitectureDocsHandler.ts`, `lib/agent-docs.ts`,
  `services/ContextHandler.ts`.
- **Rekon equivalent guarantee**: `IssueAdjudicationReport`
  groups related findings (v1). `CoherencyDelta` already prefers
  adjudication groups (v2 coherency). `resolve.issue` already
  prefers adjudication groups (v2 resolver). Both publications
  now surface adjudicated issue groups when available, cite the
  report, and preserve member finding ids on every group row.
- **What would mean we failed**:
  - Architecture summary / agent contract still imply raw
    finding counts are governed issue counts. (Closed by the
    Coherency-Summary-distinguishes-governed-vs-raw test and the
    Do-Not-Do entry test.)
  - Publications hide `memberFindingIds` or make raw traceability
    harder. (Closed by the
    architecture-summary-shows-memberFindingIds test and the
    agent-contract-active-groups-shows-member-counts test.)
  - Publications ignore `IssueAdjudicationReport` even when
    present. (Closed by the two `inputRefs` tests.)
  - Publications imply adjudication is canonical truth rather
    than a derived projection. (Both publications still preface
    with "Docs are publications, not canonical truth. Canonical
    truth lives in `.rekon/artifacts`." — unchanged.)
  - Publications show duplicate remediation items when a group
    exists. (Closed indirectly by the v2 CoherencyDelta batch:
    its `remediationQueue` already collapses duplicates into one
    `remediation:group:<id>` step.)
- **Regression test for the original problem**: the prescribed
  case — "given an `IssueAdjudicationReport` with one group
  containing two duplicate findings, `rekon publish architecture`
  and `rekon publish agent-contract` show one governed issue
  group, list both `memberFindingIds`, cite the report, and
  avoid presenting the raw count as the issue count" — is pinned
  by `architecture summary includes Governed Issue Groups section
  with group counts and members` plus
  `agent contract includes Governed Issue Groups subsection with
  active groups and member counts`.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability or failure mode**: generated
  architecture/agent docs presenting adjudicated issue state,
  not raw duplicate findings.
- **Relevant classic files/systems**:
  `services/ArchitectureDocsHandler.ts`,
  `services/ContextHandler.ts`, `lib/agent-docs.ts`,
  `services/IssueDetectionService.ts`,
  `domain/issues/mergeIssues.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`.
- **What Rekon keeps**: generated docs are based on governed
  issue/coherency artifacts; grouped issue state guides agent
  focus; raw findings remain traceable; publications cite
  inputs; docs are downstream projections, not canonical truth.
- **What Rekon simplifies**: deterministic adjudication groups
  only; one architecture summary and one agent contract; no full
  generated-docs tree; no assistant alert projections; no
  dashboard / PR / check surface; no semantic / fuzzy issue
  clustering.
- **What Rekon does not port yet**: full architecture-docs tree;
  issue-health projection; trend / watch-alert projection; PR /
  check publisher; dashboard; semantic merge / LLM review;
  CoherencyDelta / IssueAdjudication freshness + stale-source
  guardrails.
- **How this advances migration**: connects the v1 adjudication
  + v2 coherency + v2 resolver chain to the human/agent-facing
  publication layer. Subsystem 6 in
  `docs/strategy/classic-subsystem-purpose-map.md` now reads
  "P1 preserved (v1 + coherency v2 + resolver v2 + publication
  v2)". Subsystem 9 records the group-aware generated-docs state.

## ARCHITECTURE SUMMARY CHANGES

- Coherency Summary preface now states whether the delta was
  built from adjudicated groups or raw lifecycle findings, and
  the active-count label tracks that mode.
- New `## Governed Issue Groups` section between `## Coherency
  Summary` and `## Top Affected Paths`.
- Counts: `Total groups`, `Active groups`, `Accepted groups`,
  `Ignored groups`, `Resolved groups`, `Mixed groups`, plus a
  `Total member findings: <N> (across <M> group[s])` line.
- Table: `Group | Status | Severity | Type | Members | Files`,
  capped at 20 rows with `_… N more groups_` overflow.
- `Members` column shows `<count>: <id1>, <id2>, <id3>
  _(+N more)_` so duplicate findings are visible.
- Closing line:
  `Use \`rekon resolve issue --issue <group-id>\` for adjudicated
  issue context. Raw member findings remain traceable via
  \`memberFindingIds\` on each group and in the resolver packet.`
- No-report fallback: a paragraph instructing the operator to
  run `rekon issues adjudicate` or `rekon refresh` and warning
  that raw lifecycle counts above may overstate drift.

## AGENT CONTRACT CHANGES

- Active Governance State preface now states governed-group vs.
  raw-finding mode; the active-count label tracks that mode.
- New `### Governed Issue Groups` subsection inside Active
  Governance State.
- Subsection content:
  - `- Active governed groups: <N>`
  - `- Accepted: <a>, Ignored: <i>, Resolved: <r>, Mixed: <m>`
  - `- Total groups: <T> covering <F> member finding[s].`
  - `Top active groups:` followed by up to 5 bullets:
    `- \`<group.id>\` — <severity> — <title> — members: <count>`
  - Closing line:
    `Use \`rekon resolve issue --issue <group-id>\` for
    adjudicated issue context. Raw member findings remain
    traceable via \`memberFindingIds\` on each group.`
- No-report fallback: "Run `rekon refresh` before relying on
  issue counts above; raw lifecycle totals may overstate drift
  when duplicate findings exist."
- `Do Not Do` list adds:
  "Do not treat raw finding count as governed issue count when
  an IssueAdjudicationReport exists; use governed issue groups
  (memberFindingIds preserves raw traceability)."

## ADJUDICATED ISSUE GROUP DISPLAY

Both publications take the same conservative posture as v2
coherency: they read the artifact, render its data, and never
re-derive grouping themselves. `memberFindingIds` is always
exposed so raw findings stay reachable. `groupingKey` and
`groupingReasons` are intentionally not rendered to keep the
human-facing readout concise; reviewers who need them can read
the `IssueAdjudicationReport` directly. Likewise the
publications never invoke `buildIssueAdjudicationReport` — that
remains the runtime helper's job, orchestrated by `rekon refresh`
or `rekon issues adjudicate`.

## TESTS / VERIFICATION

- `npm run typecheck` ✓
- `npm run build` ✓
- `git diff --check` ✓
- `npm run test` — 400 passed, 1 skipped optional, 0 failed.
  Includes the 11 new tests in
  `tests/contract/publications-adjudicated-issues.test.mjs`. The
  existing 48 tests across
  `architecture-summary-publisher.test.mjs`,
  `architecture-summary-proof-loop.test.mjs`,
  `agent-operating-contract-publisher.test.mjs`, and
  `proof-report-publisher.test.mjs` still pass without
  modification. The `refresh-command.test.mjs` "import-boundary
  fixture surfaces active findings" test was updated to accept
  either label (the underlying behavior is unchanged for repos
  without adjudication; the relaxation is required because
  refresh now runs `issues.adjudicate` before
  `coherency.delta`).
- `node scripts/audit-license.mjs` ✓ (19 packages)
- `node scripts/audit-package-exports.mjs` ✓ (19 packages)
- `node scripts/publish-dry-run.mjs` ✓ (19 packages)
- `node scripts/install-smoke.mjs` ✓
- `node scripts/install-tarball-smoke.mjs` ✓ (19 tarballs, 13
  artifacts emitted)
- Prescribed CLI smoke against `examples/simple-js-ts`:
  - `rekon refresh` → status `passed`
  - `rekon issues adjudicate` → wrote `IssueAdjudicationReport`
  - `rekon publish architecture` → wrote `architecture-summary`
    Publication
  - `rekon publish agent-contract` → wrote `agent-contract`
    Publication
  - `rekon publish agents` → wrote `agents` Publication
  - `rekon publish proof` → wrote `proof-report` Publication
  - `rekon artifacts validate` → `valid: true`
  - `rekon artifacts freshness` → 20 artifacts indexed
- Seeded-fixture content smoke (two duplicate findings →
  `IssueAdjudicationReport` with one group of members `f1`,
  `f2`):
  - architecture summary "Governed Issue Groups" section
    renders `Total groups: 1`, `Active groups: 1`, `Total member
    findings: 2`, plus a row `| issue-f1 | active | medium |
    import_boundary.parent_relative_import | 2: f1, f2 |
    src/foo.ts |`.
  - agent contract Active Governance State preface states
    governed-group mode; the Governed Issue Groups subsection
    lists `- \`issue-f1\` — medium — Parent-relative import —
    members: 2`.

## INTENTIONALLY UNTOUCHED

- `FindingReport`, `FindingStatusLedger`, `FindingLifecycleReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`, `Publication`
  artifact shapes unchanged.
- `buildFindingLifecycleReport`,
  `buildIssueAdjudicationReport`, `buildCoherencyDelta` behavior
  unchanged.
- `@rekon/capability-docs.publisher` (the original `agents`
  publication) unchanged.
- `@rekon/capability-docs.proof-report` unchanged.
- `resolve.issue` / `resolve.route` / `resolve.seam` /
  `resolve.preflight` unchanged.
- CLI signatures unchanged.
- No new capability roles, permissions, or actuators.
- No source-write surface. No watcher. No LLM.
- No semantic / fuzzy / embedding matching.
- No version bump. No npm publish.

## RISKS / FOLLOW-UP

- **Risk**: a reader scanning only the legacy `Coherency
  Summary` section may still think the counts are raw findings.
  Mitigation: each publication's Coherency Summary now includes
  a one-line preface stating governed-group vs. raw mode
  explicitly. The agent contract's Do Not Do list adds an
  explicit rule. The architecture summary's adjacent Governed
  Issue Groups section presents the canonical group view
  immediately afterward.
- **Risk**: the Governed Issue Groups table truncates member
  ids after 3, so for very large groups some member ids are
  hidden. Mitigation: the overflow tag `_(+N more)_` is shown,
  and the canonical view in the resolver packet
  (`memberFindingIds` array) is the authoritative one.
- **Risk**: stale `IssueAdjudicationReport` artifacts can lead
  to publications that look governed but actually reflect old
  groupings. The new invalidation rule
  `issue-adjudication.changed` ensures `rekon artifacts
  freshness` flags this; the recommended next slice
  (CoherencyDelta / IssueAdjudication freshness + stale-source
  guardrails) will surface this even more loudly inside the
  publications themselves.
- **Follow-up**: CoherencyDelta / IssueAdjudication freshness
  + stale-source guardrails — when a publication's adjudication
  source is stale (older `FindingLifecycleReport` exists), the
  publication should render an explicit warning. Recommended
  next batch.
- **Follow-up**: PR / check publishers and dashboard surface
  consumption of adjudicated groups. Deferred.
- **Follow-up**: semantic / fuzzy / LLM-driven issue clustering.
  Out of scope.

## NEXT STEP

Push `main` directly after checks pass. Commit on the worktree's
detached HEAD, fast-forward local `main` from the primary
worktree, push `origin/main`. Per the user's queued sequence, the
next batch is **CoherencyDelta / IssueAdjudication freshness +
stale-source guardrails** — when a publication or resolver runs
against a stale adjudication source, that staleness should be
visible in the rendered output, not buried in the freshness
artifact.
