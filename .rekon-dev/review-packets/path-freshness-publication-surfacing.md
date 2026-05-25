# Review Packet — Path Freshness Publication Surfacing

**Slice:** `path-freshness-publication-surfacing`
**Sequence position:** Second slice in the post-beta
watcher / path-freshness track. Follows
`path-freshness-report` (shipped on `d261249`).
Selected by
[Post-Beta Dogfood Evidence Triage Decision](../../docs/strategy/post-beta-dogfood-evidence-triage.md)
(Option C) and called out as the "next step" by
[`docs/artifacts/path-freshness-report.md`](../../docs/artifacts/path-freshness-report.md).
**Batch type:** Publisher wiring + helpers + tests +
docs. **Strict no-go list:** no daemon, no
background refresh, no automatic `rekon refresh`
invocation, no automatic `rekon paths freshness`
invocation, no source mutation, no new
permission, no new role, no new artifact type, no
`ArtifactHeader` change, no `PathFreshnessReport`
schema change, no GitHub send-semantics change, no
workflow YAML, no version bump, no `npm publish`,
no release tag, no GitHub Release, no network
I/O.

## CHANGES MADE

1. **New pure helper
   `buildPathFreshnessPublicationSection`** in
   `@rekon/capability-docs`
   (`packages/capability-docs/src/index.ts`). Renders
   a consistent `Working Tree Path Freshness` markdown
   block (with parameterized heading level so the
   architecture summary + proof report can use `##`
   while the agent contract uses `###`). Bounded
   change-table via the new
   `PATH_FRESHNESS_PUBLICATION_TABLE_CAP = 20`
   constant. Returns optional `inputRef` so the
   caller can append to `header.inputRefs`.
2. **Wired into the architecture summary publisher**
   (`architectureSummaryPublisher`). Reads latest
   `PathFreshnessReport`, cites it in `inputRefs`,
   renders the section between `## Verification Proof
   Status` and `## Proof Loop`.
3. **Wired into the agent contract publisher**
   (`agentContractPublisher`). Same read-only flow.
   Section sits between the existing Verification
   Proof Status block and Memory Guidance, at
   heading level 3, and the agent contract's
   `AGENT_CONTRACT_DO_NOT_DO` list gains a new
   reminder: *"Do not treat artifact lineage
   freshness as proof that the working tree has not
   changed; check the latest PathFreshnessReport via
   `rekon paths freshness --json` and run `rekon
   refresh` if the report is stale."*
4. **Wired into the proof report publisher**
   (`proofReportPublisher`). Renders the section in
   both the normal-flow proof report and the
   no-VerificationPlan early-bailout path so
   reviewers see working-tree state regardless of
   proof readiness.
5. **Capability manifest updated**:
   - `consumes` array gains `PathFreshnessReport`.
   - New `invalidatedBy` entry
     `path-freshness.changed`: regenerate
     publications when a new `PathFreshnessReport`
     is written.
6. **New contract test**
   `tests/contract/path-freshness-publications.test.mjs`
   (13 cases).
7. **New docs test**
   `tests/docs/path-freshness-publications.test.mjs`
   (9 assertions).
8. **Updated docs** (14 files) — see *Docs* list
   below.

## PUBLIC API CHANGES

Additive only:

- `@rekon/capability-docs` exports new helper
  `buildPathFreshnessPublicationSection` plus its
  associated types
  (`BuildPathFreshnessPublicationSectionInput`,
  `BuildPathFreshnessPublicationSectionResult`) and
  the constant
  `PATH_FRESHNESS_PUBLICATION_TABLE_CAP`.
- `ArchitectureSummaryInputs`, `AgentContractInputs`,
  and `ProofReportInputs` gain optional
  `pathFreshnessReport` + `pathFreshnessRef` fields.
- Capability `consumes` list adds
  `PathFreshnessReport`.
- New invalidation rule
  `path-freshness.changed`.

No types removed, renamed, or narrowed. No existing
artifact shape modified. **No
`PathFreshnessReport` schema change.**

## PURPOSE PRESERVATION CHECK

Original problem (per the work order):

> `PathFreshnessReport` now exists, but users and
> agents must remember to inspect it directly. The
> freshness warning belongs in the publications that
> operators and agents already consume.

Product guarantees preserved:

- **Artifact lineage freshness and working-tree
  freshness remain distinct.** The helper's body
  text says this explicitly; every publication
  surface inherits the language. The architecture
  summary keeps its existing
  `## Input Freshness Warnings` section (lineage)
  and gains
  `## Working Tree Path Freshness` (source-state)
  as a sibling.
- **If the working tree is stale relative to the
  latest baseline, architecture summary and agent
  contract say so plainly.** Section header,
  `Status: stale`, `Refresh recommended: yes`,
  change table, and a blockquote calling out
  `rekon refresh`.
- **Agents are instructed not to rely on stale
  artifacts after source edits.** The new
  Do-Not-Do reminder pins this directly in the
  agent contract.
- **Recommended recovery remains explicit.** The
  rendering always names `rekon refresh` and never
  runs it. **No background mutation occurs.**

What would mean we failed (none happened):

- Publications hide stale working-tree state — no;
  every publication surfaces it.
- Agent contract tells agents to trust stale
  artifacts — no; the Do-Not-Do reminder forbids
  this.
- Publication generation runs `rekon paths
  freshness` or `rekon refresh` implicitly — no;
  publishers only read the latest existing
  `PathFreshnessReport`. Contract test #12 pins
  this (publication does not add a new
  `PathFreshnessReport` and cites the existing
  one's id).
- `PathFreshnessReport` is treated as artifact
  lineage freshness — no; the section title and
  every helper-rendered paragraph explicitly
  distinguishes the two.
- GitHub review payloads imply path freshness is
  canonical proof without cited artifacts — n/a;
  this batch explicitly **defers** GitHub
  dry-run / send surfacing to a follow-on slice
  (see *Risks / Follow-Up*).

## CODEBASE-INTEL ALIGNMENT

Classic capability or failure mode addressed:

- Context freshness / watcher-driven awareness
  after file changes.

Rekon-native equivalent (preserved):

- No daemon by default.
- Explicit `PathFreshnessReport` artifact (shipped
  prior slice).
- Explicit `rekon paths freshness` (shipped prior
  slice).
- **Publication warnings when path freshness is
  stale or unknown** (this slice).
- Agent instructions to refresh after source edits
  (this slice — Do-Not-Do reminder + rendered
  recommendation).

## PUBLICATION SURFACES

| Surface | Section title | Heading level | Renders when no report | Renders fresh / stale / unknown |
| --- | --- | --- | --- | --- |
| Architecture summary | `## Working Tree Path Freshness` | 2 | Yes (no-report guidance + lineage distinction) | Yes |
| Agent contract | `### Working Tree Path Freshness` | 3 | Yes (same) | Yes + Do-Not-Do reminder |
| Proof report | `## Working Tree Path Freshness` | 2 | Yes (same; surfaces even in the no-VerificationPlan early-bailout path) | Yes |
| GitHub Check dry-run | — | — | **Deferred** | **Deferred** |
| PR comment dry-run | — | — | **Deferred** | **Deferred** |

The change-path table is bounded by
`PATH_FRESHNESS_PUBLICATION_TABLE_CAP = 20` non-fresh
entries; additional entries are summarised in a
single line so publications stay readable on large
repos.

## INPUT REFS / CITATIONS

- Architecture summary `header.inputRefs` includes
  the latest `PathFreshnessReport` when present.
- Agent contract `header.inputRefs` includes the
  latest `PathFreshnessReport` when present.
- Proof report `header.inputRefs` includes the
  latest `PathFreshnessReport` when present.
- The contract test pins each citation by id.

## READ-ONLY GUARANTEE

- Publishers call `await latestRef(artifacts,
  "PathFreshnessReport")` followed by
  `await artifacts.read(ref)` — both are read
  operations on the local store.
- **No publisher calls `rekon paths freshness`,
  `rekon refresh`, or any subprocess.**
- **No publisher writes a new
  `PathFreshnessReport`.** Contract test #11 + #12
  pin both claims (artifact count is unchanged and
  the cited id matches the most recent existing
  one).
- No publisher recomputes fingerprints.
- No source files are read or written by the
  publishers (other than the existing
  `.rekon/config.json` policy read that pre-dates
  this slice).
- No network I/O.

## TESTS / VERIFICATION

- New
  `tests/contract/path-freshness-publications.test.mjs`
  — 13 cases, all passing:
  1. arch summary: no-report guidance.
  2. arch summary: status fresh.
  3. arch summary: status stale.
  4. arch summary: changed-path table.
  5. arch summary: cites `PathFreshnessReport` in
     `inputRefs`.
  6. agent contract: renders the subsection.
  7. agent contract: warns when stale + Do-Not-Do
     reminder present.
  8. agent contract: pins lineage ≠ working-tree
     distinction.
  9. agent contract: cites in `inputRefs`.
  10. proof report: compact section + cites in
      `inputRefs`.
  11. publication generation does not create a new
      `PathFreshnessReport`.
  12. publication generation does not invoke `rekon
      paths freshness` (cites existing report id
      after publish; count unchanged).
  13. `artifacts validate` remains clean after
      multiple publish runs.
- New
  `tests/docs/path-freshness-publications.test.mjs`
  — 9 assertions.
- All 9 mandatory verification commands clean
  (typecheck, test, build, git diff --check,
  audit-package-exports, audit-license,
  publish-dry-run, install-smoke,
  install-tarball-smoke).
- CLI smoke matrix (per work order) clean.

## INTENTIONALLY UNTOUCHED

- `PathFreshnessReport` schema (additive-only would
  be allowed by the work order — none was needed).
- `ArtifactHeader` shape.
- `rekon paths freshness` CLI behaviour.
- `rekon refresh` CLI behaviour.
- `buildSourceStateFingerprint` helper.
- `comparePathFreshness` comparator.
- GitHub Check dry-run / send payload (see *Risks
  / Follow-Up*).
- PR comment dry-run / send body (see *Risks /
  Follow-Up*).
- Workflow templates + validator profiles.
- Active workflow YAML (none added).
- `package.json` / `package-lock.json` (unchanged).
- Capability conformance (the manifest's
  `consumes` addition is the only manifest edit;
  no new role/permission).

## RISKS / FOLLOW-UP

- **GitHub dry-run / send surfacing deferred.** The
  work order explicitly authorises deferral. This
  batch ships three publication surfaces, the
  helper, tests, and docs. GitHub Check / PR
  comment dry-run + send payload surfacing should
  ship in a follow-on slice titled
  *"Path freshness GitHub review surfacing"* (the
  "Next Step" called out by the work order).
  Reasons to defer here:
  - The `buildGitHubCheckPayload` helper computes
    `conclusion` from proof state today. Whether
    stale path freshness should ever flip
    conclusion deserves a separate design pass.
  - The CLI dry-run flows
    (`rekon publish github-check --dry-run`,
    `rekon publish pr-comment --dry-run`) have
    their own input-gathering paths that would need
    to be wired to pass the
    `PathFreshnessReport` through.
  - Each surface has its own existing contract
    tests; touching them now would broaden this
    batch's blast radius.
- **Publication freshness when PathFreshnessReport
  changes.** The new `invalidatedBy` entry
  `path-freshness.changed` documents this; the
  existing `validateArtifactFreshness` path treats
  any newer cited input as a staleness signal.
- **Section verbosity on very large repos.** Bounded
  at 20 non-fresh entries via
  `PATH_FRESHNESS_PUBLICATION_TABLE_CAP`; this can
  be tuned post-cohort if a real-world report
  surfaces more drift than is useful to render.

## NEXT STEP

Per the work order: **Path freshness GitHub review
surfacing.** Add working-tree freshness warnings to
the GitHub Check dry-run / send payload and the PR
comment dry-run / send body. Still no daemon. Still
no background refresh. Still no source writes.
