# Adjudication / Coherency Freshness Guardrails

## Batch Summary

The surfaces that consume `IssueAdjudicationReport` and
`CoherencyDelta` — the architecture summary publication, the
agent operating contract publication, and `resolve.issue` (group
mode) — now render their own inline freshness warnings when the
governance chain has gone stale. `rekon artifacts freshness`
remains the authoritative oracle, but agents and humans act on
rendered outputs, so staleness is surfaced there. Read-only. No
artifact mutation. No auto-regeneration. No watcher / daemon.
Closes the trust slice of P1.1 in the Classic Guarantees Audit.

## CHANGES MADE

- `packages/capability-docs/src/index.ts`:
  - New package-local `GovernanceFreshness` type:
    `{ adjudication: { status, artifactId?, citedLifecycleId?,
    latestLifecycleId? }, coherency: { status, artifactId?,
    citedAdjudicationId?, builtFrom?, latestAdjudicationId? },
    warnings: string[], recommendedCommand? }`.
  - New `detectGovernanceFreshness(artifacts)` helper:
    - Reads the latest `IssueAdjudicationReport` and compares
      its cited `FindingLifecycleReport` ref to the latest
      indexed `FindingLifecycleReport`. Mismatch → `stale` with
      a specific warning.
    - Reads the latest `CoherencyDelta`. If it cites an older
      `IssueAdjudicationReport` → `stale`. If it cites no
      adjudication and no item carries `issueGroupId`
      (lifecycle mode) but an `IssueAdjudicationReport` now
      exists → `stale` with mode-mismatch warning. If
      adjudication is stale → `coherency` is transitively
      stale. Otherwise → `fresh`.
    - Returns warnings + a `recommendedCommand` (default
      `rekon refresh`; `rekon issues adjudicate` when
      adjudication is missing but lifecycle exists).
  - Both publishers (`architectureSummaryPublisher`,
    `agentContractPublisher`) call the helper inside `publish`
    and pass the result into the renderer.
  - `ArchitectureSummaryInputs` gains optional `freshness`.
  - `renderArchitectureSummary` inserts a new
    `## Input Freshness Warnings` section between Governed
    Issue Groups and Top Affected Paths — but only when
    `freshness.warnings.length > 0`. Silence is the success
    signal.
  - `AgentContractInputs` gains optional `freshness`.
  - `renderAgentContract` always renders a
    `### Governance Freshness` subsection inside Active
    Governance State with explicit `Issue adjudication: …` and
    `Coherency delta: …` lines. When stale, a `> Input
    freshness warnings:` blockquote lists each warning and
    includes the agent-facing rule: "Do not treat governed
    issue counts as current until `rekon refresh` (or
    `rekon issues adjudicate && rekon coherency delta`) has
    run." A `Recommended command:` line closes the section
    when a command is recommended (stale OR missing).
- `packages/capability-resolver/src/index.ts`:
  - New package-local `AdjudicationStaleness` type:
    `{ status: "fresh" | "stale", citedLifecycleId?,
    latestLifecycleId? }`.
  - New `detectAdjudicationStaleness(artifacts, reportRef)`
    helper: reads the report's `header.inputRefs`, extracts the
    cited `FindingLifecycleReport`, and compares to the latest
    indexed lifecycle.
  - `buildGroupIssuePacket` calls the helper right after the
    `issue.match` trace entry. When stale: appends
    "IssueAdjudicationReport may be stale; run `rekon issues
    adjudicate` or `rekon refresh` before relying on group
    counts." to `warnings`, and pushes an
    `issue.freshness` trace entry (`sourceType:
    "IssueAdjudicationReport"`, `status: "warning"`). When
    fresh, pushes a `status: "used"` trace entry so the trail
    explicitly records the freshness check ran.
- `tests/contract/adjudication-coherency-freshness-guardrails.test.mjs`:
  10 new tests:
  - architecture summary stale-adjudication warning;
  - architecture summary transitively-stale CoherencyDelta
    warning;
  - agent contract Governance Freshness reports both stale +
    callout + recommended command;
  - `resolve.issue` group mode warning + `issue.freshness`
    trace entry;
  - consistent `rekon refresh` recommendation across all
    surfaces;
  - clean refresh path → no false stale warnings in either
    publication;
  - clean chain → `resolve.issue` emits fresh `issue.freshness`
    trace and no stale warning;
  - lifecycle-mode-delta + adjudication-exists → mode mismatch
    warning;
  - `artifacts validate` stays clean after stale-chain
    publications;
  - all four existing publishers still work.
- Docs (no `Publication` shape changes, no CLI signature
  changes):
  - `docs/concepts/freshness-and-invalidation.md` — new
    "Surface-Level Freshness Guardrails" section listing each
    consumer surface, detection rules, and read-only invariants.
  - `docs/concepts/architecture-summary-publication.md` — How
    It Is Built mentions the new freshness section.
  - `docs/concepts/agent-operating-contract.md` — section map
    references the Governance Freshness subsection.
  - `docs/concepts/resolvers.md` — new paragraph on
    `issue.freshness` trace and stale warning.
  - `docs/concepts/issue-adjudication.md` and
    `docs/artifacts/issue-adjudication-report.md` — Failure
    Visibility adds the surface guardrails list.
  - `docs/concepts/coherency-delta.md` and
    `docs/artifacts/coherency-delta.md` — stale-source
    guardrails callouts.
  - `docs/strategy/classic-subsystem-purpose-map.md` —
    subsystem 13 records the consumer-surface guardrails state.
  - `docs/strategy/classic-behavior-roadmap.md` — new Phase B
    entry.
  - `docs/strategy/classic-alignment-map.md` — Watcher /
    freshness row updated.
  - `docs/strategy/roadmap.md` — new bullet under completed
    alpha spine.
  - `CHANGELOG.md` — entry at the top of `0.1.0-alpha.1`.
  - `README.md` — no edit needed (existing CLI surface, no
    behavior change visible at the command shape).
- `.rekon-dev/review-packets/adjudication-coherency-freshness-guardrails.md`
  (this file).

## PUBLIC API CHANGES

Additive only.

- `@rekon/capability-docs` and `@rekon/capability-resolver` add
  small **package-local** helpers (`detectGovernanceFreshness`,
  `detectAdjudicationStaleness`). Neither is exported on the
  package surface; both are internal.
- `Publication` shape unchanged. `kind` enum unchanged.
- `IssuePacket` shape unchanged. The new `issue.freshness` trace
  entry is captured under the existing `resolutionTrace` array;
  no new top-level field added.
- `@rekon/capability-docs` manifest unchanged (the existing
  `issue-adjudication.changed` invalidation rule from the prior
  batch already triggers publication regeneration when
  adjudication advances).
- `@rekon/capability-resolver` manifest unchanged (it already
  declares `consumes: IssueAdjudicationReport` and
  `FindingLifecycleReport`).
- No `ArtifactHeader` shape changes. No SDK API changes. No new
  capability roles, permissions, or actuators. No CLI signature
  changes. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

- **Original problem**: generated context can look authoritative
  even when it was built from stale adjudication or stale
  coherency inputs. Agents and humans may act on outdated
  governed issue groups if staleness is only visible in a
  separate freshness artifact.
- **Classic workflow guarantee**: `codebase-intel-classic`
  treated context freshness as **trust infrastructure**, not a
  cosmetic daemon feature. Generated docs / context had to
  reflect current issue/coherency state or communicate that
  trust was unproven.
- **Classic shape that provided the guarantee**:
  `services/WatchHandler.ts`, `lib/context-freshness.ts`,
  `services/ContextHandler.ts`, `services/IssueDetectionService.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`.
- **Rekon equivalent guarantee**: `rekon artifacts freshness`
  already knows when artifacts are stale. With this batch, the
  consumer surfaces (architecture summary, agent operating
  contract, `resolve.issue`) now also render the staleness
  inline, recommend the next rebuild command, and tell agents
  not to treat governed counts as current until refresh runs.
- **What would mean we failed**:
  - Architecture summary renders governed issue groups from a
    stale `IssueAdjudicationReport` with no warning. (Closed by
    the `architecture summary warns when IssueAdjudicationReport
    is older than the latest FindingLifecycleReport` test.)
  - Agent contract instructs agents based on stale
    `CoherencyDelta` with no warning. (Closed by the
    `agent contract Governance Freshness subsection reports
    stale adjudication and stale coherency` test.)
  - `resolve.issue` returns group context from stale
    adjudication with no trace/warning. (Closed by the
    `resolve.issue group mode emits stale-adjudication warning
    and issue.freshness trace` test.)
  - Freshness remains technically available but invisible
    where users act. (Closed by surfacing the warning in all
    three rendered outputs.)
- **Regression test for the original problem**: the prescribed
  case — "given a newer `FindingLifecycleReport` than the
  latest `IssueAdjudicationReport`, `rekon publish architecture`
  and `rekon publish agent-contract` and `rekon resolve issue`
  all visibly warn that adjudication/coherency state is stale
  and recommend refreshing/adjudicating" — is pinned by the
  three primary tests plus the consistency test
  (`warnings consistently recommend \`rekon refresh\` for stale
  chains`).

## CODEBASE-INTEL ALIGNMENT

- **Classic capability or failure mode**: context freshness and
  trust for generated docs/resolvers over issue/coherency state.
- **Relevant classic files/systems**:
  `services/WatchHandler.ts`, `lib/context-freshness.ts`,
  `services/ContextHandler.ts`, `services/IssueDetectionService.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta.ts`,
  `packages/product-codebase-intel/src/replatform/replatform-delta-projections.ts`.
- **What Rekon keeps**: freshness is a trust guarantee; stale
  generated context must be visible; docs/resolvers cite inputs
  and warn when inputs are stale; downstream outputs do not
  pretend stale projections are current; artifacts remain
  canonical.
- **What Rekon simplifies**: lineage freshness only; no
  watcher/daemon; no file-change events; no auto-refresh loop;
  no context server; no generated-doc auto-regeneration.
- **What Rekon does not port yet**: full `WatchHandler`
  lifecycle; path/event invalidation engine; heartbeat/proof
  daemon; real-time context freshness server; source-file
  mtime invalidation; watch alerts.
- **How this advances migration**: strengthens the trust
  boundary between artifact freshness and the surfaces agents
  read. Makes adjudicated issue groups safer to consume in
  publications/resolvers. Prepares future watcher/path
  invalidation work without implementing it.

## FRESHNESS GUARDRAIL MODEL

Two small package-local helpers, no shared cross-package
dependency:

- `@rekon/capability-docs.detectGovernanceFreshness(artifacts)`:
  returns the per-input freshness status, the underlying
  warnings, and a recommended command. Used by both publishers.
- `@rekon/capability-resolver.detectAdjudicationStaleness(artifacts, reportRef)`:
  returns the adjudication-side staleness only (the resolver
  doesn't need to inspect the global `CoherencyDelta`). Used
  inside `buildGroupIssuePacket`.

Detection rules:

```
IssueAdjudicationReport STALE when:
  - it cites a FindingLifecycleReport whose id is not the latest indexed; OR
  - it cites no lifecycle but a lifecycle exists.

CoherencyDelta STALE when:
  - it cites an IssueAdjudicationReport whose id is not the latest indexed; OR
  - it was built from raw lifecycle (no adjudication in inputRefs,
    no issueGroupId on any item) while an IssueAdjudicationReport
    now exists; OR
  - its cited IssueAdjudicationReport is itself STALE
    (transitively).

Recommended command:
  - "rekon refresh" when any warning fired.
  - "rekon issues adjudicate" when adjudication is missing but a
    FindingLifecycleReport exists.
  - undefined when everything is clean.
```

The helpers are deliberately **package-local** rather than
exported from `@rekon/runtime`. Adding a runtime export would
introduce a layering cycle through `@rekon/capability-docs` and
`@rekon/capability-resolver`, both of which avoid depending on
`@rekon/runtime`. The duplicated detection logic is ~40 LOC and
narrowly scoped; both copies share the same detection rules
documented in `freshness-and-invalidation.md`.

## PUBLICATION WARNINGS

**Architecture summary** — `## Input Freshness Warnings` section
(only renders when warnings exist):

```md
## Input Freshness Warnings

Counts above may not reflect the latest governance state. Inputs flagged as stale:

- IssueAdjudicationReport:<id> may be stale: it cites FindingLifecycleReport:<cited> but the latest FindingLifecycleReport is <latest>.
- CoherencyDelta:<id> may be transitively stale: its IssueAdjudicationReport is stale relative to the latest FindingLifecycleReport.

Recommended command: `rekon refresh`.
```

**Agent contract** — `### Governance Freshness` subsection
(always renders, even when clean):

```md
### Governance Freshness

- Issue adjudication: fresh | stale | missing
- Coherency delta: fresh | stale | missing

> Input freshness warnings:
> - IssueAdjudicationReport:<id> may be stale: …
> - CoherencyDelta:<id> may be transitively stale: …

> Do not treat governed issue counts as current until `rekon refresh` (or `rekon issues adjudicate && rekon coherency delta`) has run.

Recommended command: `rekon refresh`.
```

Both publications have always rendered the prose
"Docs are publications, not canonical truth. Canonical truth
lives in `.rekon/artifacts`." — unchanged. The freshness
sections add a second layer: the canonical artifacts may
themselves be stale relative to the latest lifecycle data.

## RESOLVE.ISSUE WARNINGS

`buildGroupIssuePacket` always emits an `issue.freshness` trace
entry in group mode:

- Stale: `status: "warning"`, message naming the cited vs.
  latest lifecycle ids, `details.recommendedCommand:
  "rekon refresh"`. The packet's `warnings[]` adds
  "IssueAdjudicationReport may be stale; run `rekon issues
  adjudicate` or `rekon refresh` before relying on group
  counts."
- Fresh: `status: "used"`, message "IssueAdjudicationReport is
  fresh relative to the latest FindingLifecycleReport." No
  extra warning.

Raw-mode `resolve.issue` (when no adjudication report exists or
no group matched) does not emit `issue.freshness` — the
existing `issue.match / Fallback / missing` trace entry already
communicates the situation.

## TESTS / VERIFICATION

- `npm run typecheck` ✓
- `npm run build` ✓
- `git diff --check` ✓
- `npm run test` — 410 passed, 1 skipped optional, 0 failed.
  Includes the 10 new tests in
  `tests/contract/adjudication-coherency-freshness-guardrails.test.mjs`.
  The 11 existing tests in
  `tests/contract/publications-adjudicated-issues.test.mjs`
  continue to pass without modification (they exercise the
  clean fresh-chain path; the freshness section is silent
  there). The 17 existing tests in
  `tests/contract/issue-resolver-adjudicated.test.mjs` continue
  to pass — the new `issue.freshness` trace entry is additive
  and does not perturb the existing trace assertions.
- `node scripts/audit-license.mjs` ✓ (19 packages)
- `node scripts/audit-package-exports.mjs` ✓ (19 packages)
- `node scripts/publish-dry-run.mjs` ✓ (19 packages)
- `node scripts/install-smoke.mjs` ✓
- `node scripts/install-tarball-smoke.mjs` ✓ (19 tarballs, 13
  artifacts emitted)
- Prescribed CLI smoke against `examples/simple-js-ts`:
  - `rekon refresh` → status `passed`
  - `rekon publish architecture` → wrote `architecture-summary`
    Publication (clean chain → no freshness warnings section)
  - `rekon publish agent-contract` → wrote `agent-contract`
    Publication (clean chain → Governance Freshness shows
    `fresh / fresh`)
  - `rekon resolve issue --issue no-such-issue` → no match,
    raw-fallback summary (no `issue.freshness` entry because
    raw mode)
  - `rekon artifacts validate` → `valid: true`
  - `rekon artifacts freshness` → 17 artifacts indexed
- Stale-chain end-to-end smoke against a seeded fixture (newer
  `FindingLifecycleReport` than the cited one):
  - architecture summary contains `## Input Freshness Warnings`
    with both adjudication and coherency warnings + `Recommended
    command: \`rekon refresh\``;
  - agent contract Governance Freshness shows
    `- Issue adjudication: stale` and `- Coherency delta:
    stale`, blockquote with both warnings, the "Do not treat
    governed issue counts as current…" line, and `Recommended
    command: \`rekon refresh\``;
  - `resolve.issue --issue issue-f1` packet contains
    `IssueAdjudicationReport may be stale; …` warning and an
    `issue.freshness` trace with `status: "warning"` citing the
    fl-A → fl-B-newer transition.

## INTENTIONALLY UNTOUCHED

- `Publication` shape, `IssuePacket` shape, `ArtifactHeader`
  shape, `CoherencyDelta` shape, `IssueAdjudicationReport`
  shape, `FindingReport` / `FindingLifecycleReport` /
  `FindingStatusLedger` shapes — all unchanged.
- `buildFindingLifecycleReport`,
  `buildIssueAdjudicationReport`, `buildCoherencyDelta`
  behavior unchanged.
- `lookupVerificationEvidence` behavior unchanged.
- Existing resolver-trace `sourceType` values unchanged; the
  new `issue.freshness` step reuses the existing
  `"IssueAdjudicationReport"` sourceType added in a prior batch.
- `@rekon/capability-docs` and `@rekon/capability-resolver`
  manifests unchanged (no new `consumes` entries, no new
  invalidation rules — the prior batch's
  `issue-adjudication.changed` rule already covers the
  invalidation case).
- `rekon refresh` step list unchanged; no `freshness.guardrails`
  step added (the warnings are inline, not pipeline-level).
- CLI signatures unchanged.
- No source-write surface. No watcher. No daemon. No
  file-system mtime or path-event invalidation. No
  auto-regeneration of stale or missing artifacts inside any
  publisher or resolver.
- No semantic / fuzzy / embedding / LLM matching.
- No version bump. No npm publish.

## RISKS / FOLLOW-UP

- **Risk**: the duplicated detection helper in two packages can
  drift if rules are added later. Mitigation: both copies are
  short (~40 LOC), share documented rules in
  `freshness-and-invalidation.md`, and are covered by the new
  test suite. If a third consumer needs the same logic, the
  shared helper can be promoted to `@rekon/kernel-findings` or
  a thin shared package.
- **Risk**: clean-chain repos get an extra `### Governance
  Freshness` subsection in the agent contract even when nothing
  is stale. Mitigation: the subsection still labels the fresh
  state explicitly so reviewers see a positive trust signal.
  Architecture summary takes the opposite posture: it omits the
  warnings section entirely when clean. Both feel right for
  their audience.
- **Risk**: detection compares ids by `localeCompare` (latest =
  highest id), matching the existing `latestById` helper. If
  an artifact is written with an id that sorts lexicographically
  below an older one (e.g., a clock skew), the helper could
  mis-identify "latest". The existing freshness flow has the
  same risk. Out of scope.
- **Risk**: resolver fresh-path emits an extra `issue.freshness
  / used` trace entry per call. Trace size grows by one entry
  in group mode. Acceptable — the resolver packet is already
  the explainability surface.
- **Follow-up**: cross-rule semantic merge hints for
  near-duplicate findings (recommended next batch) — these
  will need to honor the freshness guardrails too. The
  detection helper is ready to extend.
- **Follow-up**: a `rekon freshness explain` CLI or
  `rekon publish freshness` report that consolidates these
  guardrails into a dedicated artifact would let CI / dashboards
  consume the trust signal uniformly. Deferred.
- **Follow-up**: when the watcher/daemon eventually lands, the
  inline guardrails become redundant for live repos but stay
  useful for offline reads. They can remain as a defensive
  default.

## NEXT STEP

Push `main` directly after checks pass. Commit on the worktree's
detached HEAD, fast-forward local `main` from the primary
worktree, push `origin/main`. Per the user's queued sequence, the
next batch is **Issue adjudication maturity v2: deterministic
cross-rule merge hints** — conservative, non-semantic merge
hints for findings that share file/subject/severity but differ
in rule id, exposed as "merge candidates" (not automatic
groups) to keep adjudication deterministic.
