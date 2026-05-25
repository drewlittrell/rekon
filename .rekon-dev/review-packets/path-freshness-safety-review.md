# Review Packet — Path Freshness Safety Review

**Slice:** `path-freshness-safety-review`
**Sequence position:** Final slice in the
post-beta watcher / path-freshness track. Follows
the three implementation slices
(`path-freshness-report`,
`path-freshness-publication-surfacing`,
`path-freshness-github-review-surfacing`). Closes
out Option C of the
[Post-Beta Dogfood Evidence Triage Decision](../../docs/strategy/post-beta-dogfood-evidence-triage.md).
**Batch type:** Strategy / docs / tests only.
**Strict no-go list:** no runtime behaviour
change, no watcher behaviour, no daemon-parity
claim, no claim that path freshness is artifact
lineage freshness, no claim that stale path
freshness changes GitHub Check conclusion, no
new package, no new CLI command, no new helper,
no schema change, no new permission, no new
artifact type, no workflow YAML, no GitHub API
call, no `npm publish`, no version bump, no
release tag, no GitHub Release, no `package.json`
/ `package-lock.json` mutation, no source-file
mutation in any `packages/*/src/*`, no network
I/O.

## CHANGES MADE

1. **New strategy memo
   `docs/strategy/path-freshness-safety-review.md`.**
   Reviews the full path-freshness track end-to-end
   (artifact, fingerprint helper, CLI, publication
   surfacing, GitHub review surfacing, read-only
   guarantees, no-daemon policy, mtime/hash
   policy, Check conclusion policy, beta-private
   stability decision, remaining risks, follow-up
   work). Includes the three required diagnostic
   tables (Components Reviewed / Remaining Risks /
   Beta-Private Stability Decision).
2. **New review packet (this file)** with PURPOSE
   PRESERVATION CHECK + all 11 required sections.
3. **New docs test
   `tests/docs/path-freshness-safety-review.test.mjs`**
   with 19 required assertions covering doc
   existence, required headings, decision
   statements, table presence, and cross-link
   integrity.
4. **Supporting doc cross-links** added to:
   `docs/concepts/path-freshness.md`,
   `docs/artifacts/path-freshness-report.md`,
   `docs/concepts/freshness-and-invalidation.md`,
   `docs/concepts/agent-operating-contract.md`,
   `docs/examples/github-actions-verification-runner.md`,
   `docs/strategy/watcher-path-freshness-policy-decision.md`,
   `docs/strategy/post-beta-dogfood-evidence-triage.md`,
   `docs/strategy/roadmap.md`,
   `docs/strategy/classic-behavior-roadmap.md`,
   README, CHANGELOG.

## PUBLIC API CHANGES

**None.** This batch is strategy/docs/tests only.
No type added, removed, renamed, narrowed, or
exported. No CLI surface added or modified. No
runtime behaviour change. No schema change.

## PURPOSE PRESERVATION CHECK

Original problem (per the work order):

> Rekon needed working-tree freshness awareness
> without adopting a daemon. Path freshness now
> exists as an explicit artifact and is surfaced
> where operators and reviewers act. Before
> moving on, the track needs a safety review to
> confirm it preserves the artifact-canonical,
> no-background-refresh model.

Product guarantees preserved (each pinned
verbatim in the memo + verified by a docs-test
assertion):

- **PathFreshnessReport records explicit
  working-tree state comparisons.** The memo
  reviews the artifact model and confirms it is
  the right shape for the first
  working-tree-freshness artifact.
- **Operators run `rekon paths freshness`
  deliberately.** The memo's CLI review pins
  that the command is read-only with respect to
  source files and never recurses.
- **Publications and GitHub review surfaces
  read and cite reports.** The memo's
  Publication / GitHub Review Surfacing sections
  pin the read-only guarantee and cite the
  contract tests that lock it.
- **No surface silently computes freshness,
  refreshes artifacts, or mutates source.** The
  memo's Read-Only Guarantee section pins this
  across all five flows.
- **Stale path freshness is visible as a
  warning.** The memo's Check Conclusion Policy
  section pins the warning-only contract.

What would mean we failed (none happened):

- The review treats path freshness as artifact
  lineage freshness — **no**; the memo states
  "Artifact lineage freshness is not working-tree
  freshness" verbatim.
- The review claims watcher parity or daemon
  behaviour — **no**; the memo confirms
  no-daemon is the right policy for
  beta-private.
- The review ignores that publications / GitHub
  surfaces are read-only readers — **no**;
  there is a dedicated Read-Only Guarantee
  section.
- The review implies stale path freshness
  changes Check conclusion — **no**; the
  Check Conclusion Policy section pins the
  warning-only contract verbatim.
- The review ignores mtime vs hash policy —
  **no**; the Mtime And Hash Policy section
  pins sha256 canonical / mtime advisory.

## CODEBASE-INTEL ALIGNMENT

Classic capability or failure mode addressed:

- Watcher / context freshness after file changes.

Rekon-native equivalent (preserved):

- Explicit `PathFreshnessReport` artifact.
- Operator-triggered `rekon paths freshness`.
- Publication + GitHub review surfacing.
- No daemon. No background refresh.
- Canonical artifacts remain the source of
  truth.

The memo's *Why This Review Exists* +
*Components Reviewed* sections reference the
original watcher / context-freshness classic
behaviour explicitly so reviewers can verify
nothing was elided.

## COMPONENTS REVIEWED

The memo's *Components Reviewed* table covers:

| Component | Status |
| --- | --- |
| `PathFreshnessReport` artifact | shipped (review: schema unchanged; explicit + operator-triggered) |
| Source-state fingerprint helper | shipped (review: sha256 canonical; bounded reads; conservative default ignore set) |
| `rekon paths freshness` CLI | shipped (review: read-only; never recurses; never invokes refresh) |
| Publication surfacing | shipped (review: arch summary + agent contract + proof report all render the latest report; bounded change table; never run paths-freshness/refresh) |
| GitHub surfacing | shipped (review: Check `output.summary` block + PR comment summary row + warning; never flips conclusion; never changes readiness gates) |
| No-daemon policy | preserved (review: still the right beta-private policy) |
| Read-only guarantees | preserved (review: pinned by contract tests across all 3 implementation slices) |
| Mtime / hash policy | preserved (review: sha256 canonical; `mtimeAdvisory` opt-in only) |
| Conclusion policy | preserved (review: warning-only; contract test #4 of the GitHub review slice pins identical conclusion across fresh + stale) |

## BETA-PRIVATE STABILITY DECISION

**The path freshness track is beta-private
stable.** No additional hardening is required
before moving on.

The memo's *Beta-Private Stability Decision*
section enumerates 10 criteria (explicit
artifact exists; no background refresh;
publications surface stale state; GitHub
surfaces warn; content hashes canonical;
artifact lineage distinction preserved;
read-only across publish + GitHub review;
`rekon refresh` remains operator-triggered;
`rekon paths freshness` remains
operator-triggered; conclusion override blocked
by design) — **every criterion passed.**

Recommended next slice (per work order):
**private beta support playbook**.

## READ-ONLY GUARANTEE

The memo's *Read-Only Guarantee* section pins
the contract end-to-end:

- `architectureSummaryPublisher`,
  `agentContractPublisher`, and
  `proofReportPublisher` call only
  `latestRef("PathFreshnessReport")` +
  `artifacts.read(ref)`.
- `rekon publish github-check
  --dry-run`/`--send` and `rekon publish
  pr-comment --dry-run`/`--send` call only
  `pickLatestArtifactEntry("PathFreshnessReport")`
  + `store.read(...)`.
- **None of the above invokes `rekon paths
  freshness`, `rekon refresh`, a subprocess,
  a fingerprint computation, or a
  `PathFreshnessReport` write.**
- Missing report is a no-op everywhere.

The implementation-slice contract tests pin
this guarantee by artifact-count delta + by
cited-id equality + by conclusion-equality
across fresh + stale runs.

## TESTS / VERIFICATION

- New
  `tests/docs/path-freshness-safety-review.test.mjs`
  — 19 assertions covering doc existence,
  required headings (15 of them), stable
  statements (beta-private stable; lineage ≠
  working-tree; explicit + operator-triggered;
  no daemon; warning-not-override; content
  hashes canonical; mtimes advisory), component
  + risk + decision tables, CHANGELOG entry,
  review packet existence + PURPOSE
  PRESERVATION CHECK presence.
- All 9 mandatory verification commands clean
  (typecheck, test, build, git diff --check,
  audit-package-exports, audit-license,
  publish-dry-run, install-smoke,
  install-tarball-smoke).
- No CLI smoke required (strategy/docs/tests
  batch).
- All pre-existing tests still pass.

## INTENTIONALLY UNTOUCHED

- Runtime behaviour anywhere in the path
  freshness track.
- `PathFreshnessReport` schema.
- `ArtifactHeader` shape.
- `buildSourceStateFingerprint`, `comparePathFreshness`,
  `createPathFreshnessReport`,
  `buildPathFreshnessPublicationSection`,
  `buildPathFreshnessGitHubSummary` (all helpers
  shipped in earlier slices; no signature
  change).
- `rekon paths freshness` CLI.
- Publication payload shapes.
- GitHub Check `pickConclusion` logic (the
  Conclusion Policy section pins the
  warning-only contract explicitly so a future
  reviewer cannot accidentally re-litigate it
  without a new memo).
- GitHub API transport.
- Workflow templates + validator profiles.
- Active workflow YAML (none added).
- `package.json` / `package-lock.json`.
- Capability conformance.

## RISKS / FOLLOW-UP

Captured in the memo's *Remaining Risks* table
(none of these are release blockers for
beta-private):

- Stale context (mitigation: stale warning +
  refresh recommendation; follow-up: operator
  education in private beta support playbook).
- Hidden mutation (mitigation: no daemon / no
  background refresh; follow-up: future
  watcher-lite / daemon review post-beta).
- mtime unreliability (mitigation: content
  hashes canonical; `mtimeAdvisory` opt-in
  only; follow-up: keep advisory; documentation
  already done).
- Check conclusion confusion (mitigation:
  warning only; follow-up: revisit only if
  beta evidence supports hard-gating).
- Default-walk cost on large monorepos
  (mitigation: bounded reads + ignore set;
  follow-up: optional `--path` from `git diff
  --name-only`).
- Change-table verbosity (mitigation: 20
  non-fresh entry cap; follow-up: tune
  post-cohort).
- Operator forgets to run `rekon paths
  freshness` (mitigation: first-run `unknown`
  is loud; follow-up: private beta playbook
  inclusion).

## NEXT STEP

Per the work order: **Private Beta Support
Playbook.** Define how private beta users
report issues — attach Rekon artifacts;
provide CLI command logs; classify blockers
vs acceptable findings; rerun path freshness
after source edits; no-npm / source-checkout
install instructions. Still no daemon. Still
no background refresh. Still no npm publish.
