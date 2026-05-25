# Review Packet — Path Freshness GitHub Review Surfacing

**Slice:** `path-freshness-github-review-surfacing`
**Sequence position:** Third slice in the post-beta
watcher / path-freshness track. Follows
`path-freshness-publication-surfacing` (shipped on
`db103c5`) and the prior `path-freshness-report`
slice. Selected by the
[Post-Beta Dogfood Evidence Triage Decision](../../docs/strategy/post-beta-dogfood-evidence-triage.md)
(Option C) and called out as the "next step" by the
publication-surfacing slice's review packet.
**Batch type:** Builder wiring + helpers + tests +
docs. **Strict no-go list:** no daemon, no
background refresh, no automatic `rekon refresh`
invocation, no automatic `rekon paths freshness`
invocation, no source mutation, no new artifact
type, no new permission, no new role, no
`ArtifactHeader` change, no `PathFreshnessReport`
schema change, no GitHub API transport change, no
change to existing Check / PR-comment readiness
gates, no workflow YAML, no version bump, no `npm
publish`, no release tag, no GitHub Release.

## CHANGES MADE

1. **New pure helper
   `buildPathFreshnessGitHubSummary`** in
   `@rekon/capability-docs`. Renders the compact
   lines + warning paragraph that both surfaces
   (GitHub Check `output.summary` + PR comment
   body) consume. Read-only; never reads disk;
   never reads env; never opens sockets.
2. **`BuildGitHubCheckPayloadInput`** gains
   optional `pathFreshnessReport` +
   `pathFreshnessRef` fields. The Check
   `output.summary` now renders a `Working tree
   path freshness:` block (always present — fresh,
   stale, unknown, or no-baseline guidance). The
   `PathFreshnessReport` ref is appended to the
   payload's `citedRefs`.
3. **`PrCommentBodyInput`** gains the same fields.
   The PR comment body now carries a
   `Working-tree freshness` row + a
   `PathFreshnessReport` row in the summary
   table. When stale or unknown, the comment's
   `### Warnings` section gains the path-freshness
   warning. The report ref is added to
   `citedRefs`.
4. **CLI plumbing**: both `rekon publish
   github-check --dry-run` / `--send` and `rekon
   publish pr-comment --dry-run` / `--send` now
   read the latest `PathFreshnessReport` from the
   local store and pass it into the builders.
   Missing report is not a CLI failure;
   no-baseline guidance renders instead. The
   PR-comment CLI exposes the cited ref under
   `citedRefs.pathFreshness` in JSON output
   (additive only).
5. **14-case contract test**
   `tests/contract/path-freshness-github-review.test.mjs`.
6. **9-assertion docs test**
   `tests/docs/path-freshness-github-review.test.mjs`.
7. **Docs updates** (11 files) — see *Docs* list
   below.

## PUBLIC API CHANGES

Additive only:

- `@rekon/capability-docs` exports new helper
  `buildPathFreshnessGitHubSummary` + its
  associated types
  (`BuildPathFreshnessGitHubSummaryInput`,
  `BuildPathFreshnessGitHubSummaryResult`).
- `BuildGitHubCheckPayloadInput` gains optional
  `pathFreshnessReport?: PathFreshnessReport` and
  `pathFreshnessRef?: ArtifactRef` fields.
- `PrCommentBodyInput` gains the same two
  fields.
- `GitHubCheckPayload.citedRefs` may now include a
  `PathFreshnessReport` ref when the report is
  present.
- `PrCommentBody.citedRefs` may now include a
  `PathFreshnessReport` ref when the report is
  present.
- CLI JSON output for `rekon publish pr-comment
  --dry-run` and `--send` gains
  `citedRefs.pathFreshness` (additive only;
  existing fields unchanged).

No types removed, renamed, or narrowed. No
existing artifact shape modified. **No
`PathFreshnessReport` schema change.** No
GitHub API transport behaviour change.

## PURPOSE PRESERVATION CHECK

Original problem (per the work order):

> Working-tree path freshness now appears in local
> publications, but GitHub review surfaces still
> omit it. Reviewers consuming GitHub Checks or PR
> comments need the same stale-working-tree
> warning that operators see locally.

Product guarantees preserved:

- **GitHub Check and PR comment payloads cite the
  same canonical `PathFreshnessReport`.** Both
  surfaces add the report's
  `type:id` to their `citedRefs` and reference it
  in the rendered text. Contract tests #5 + #9
  pin this.
- **Stale / unknown working-tree freshness is
  visible in review surfaces.** Contract tests
  #3 + #8 pin the stale path; tests #1 + #6 pin
  the no-report fallback; tests #2 + #7 pin the
  fresh case.
- **The recommendation remains explicit: run
  `rekon refresh` before relying on artifacts.**
  Both surfaces print this verbatim when stale.
- **GitHub status / comments remain downstream;
  Rekon artifacts remain canonical.** The Check
  payload's existing canonical-truth reminder
  remains untouched; the PR comment body's
  existing canonical-truth reminder remains
  untouched.
- **The publisher does not compute / write
  freshness; it only reads the latest report.**
  Contract test #12 pins that no new
  `PathFreshnessReport` is added by publish.
  Contract test #13 pins that no new
  EvidenceGraph / IntelligenceSnapshot /
  ObservedRepo / FindingReport is added by a
  repeat publish (so no `rekon refresh` is
  invoked under the hood).

What would mean we failed (none happened):

- GitHub payload generation writes a
  `PathFreshnessReport` — no (test #12).
- GitHub payload generation runs `rekon paths
  freshness` — no (the CLI flow uses
  `store.list("PathFreshnessReport")` +
  `store.read(...)` only; the helper is pure).
- Stale path freshness silently flips a Check
  conclusion without a pinned policy — no (test
  #4 pins the conclusion is identical between
  fresh and stale runs).
- PR comments imply stale artifacts are safe —
  no; the warnings list gains the stale path
  freshness warning + names `rekon refresh`.
- GitHub status / comments become canonical
  truth — no; both surfaces retain their
  existing canonical-truth reminders.

## CODEBASE-INTEL ALIGNMENT

Classic capability or failure mode addressed:

- Review-time context freshness / stale context
  awareness.

Rekon-native equivalent (preserved):

- Explicit `PathFreshnessReport` artifact.
- Local publication surfacing (shipped slice 4a).
- **GitHub review surfacing (this slice).**
- No daemon.
- No background refresh.
- Canonical artifacts remain the source of
  truth.

## GITHUB CHECK SURFACE

The Check payload's `output.summary` now contains
a new section:

```
Working tree path freshness:
- Working-tree freshness: `<status>`
- PathFreshnessReport: `PathFreshnessReport:<id>`
- Refresh recommended: `yes|no`
- Path drift: changed N, missing N, new N (of N tracked).   ← stale only
  (or "Baseline not yet established for this repo.")        ← unknown only

> Run `rekon refresh` before relying on generated artifacts. ← stale only
> Run `rekon paths freshness` to establish a baseline.       ← unknown only
```

`citedRefs` includes the `PathFreshnessReport` ref
when present. The existing Check `conclusion`,
`title`, and canonical-truth reminder are
unchanged.

## PR COMMENT SURFACE

The PR comment summary table gains two rows:

```
| Working-tree freshness | `<status>` |
| PathFreshnessReport | `PathFreshnessReport:<id>` |
```

The `### Warnings` section gains the stale or
unknown warning (same text as the Check surface).
The PR-comment body's existing
canonical-truth reminder, marker, and idempotency
behaviour are unchanged. JSON output adds
`citedRefs.pathFreshness` (additive only).

## CONCLUSION POLICY

**Pinned design decision for this slice:**

> A stale `PathFreshnessReport` must be **visible**
> in the GitHub Check output and PR comment body,
> but it must **not by itself flip the GitHub
> Check conclusion** in this slice.

Reason:

- The Check conclusion currently reflects proof
  / validation state
  (`success` / `failure` / `timed_out` /
  `action_required` / `neutral` / `cancelled`).
- Stale path freshness is a **trust warning and
  recommended-refresh signal**, not a transport
  failure or proof-status replacement.
- The signal is already redundant with the
  existing proof freshness path: if proof is
  truly stale because the working tree drifted,
  `freshness === "stale"` already routes the
  conclusion through `action_required`. Folding
  path freshness into conclusion would
  double-count.
- A separate decision memo can revisit this if
  beta evidence shows operators want stale path
  freshness to be hard-gated. **For this slice
  the policy is: warn, do not flip.**

Contract test #4 pins the contract by running
the dry-run twice (once with `fresh` baseline,
once with `stale` baseline) and asserting that
`payload.conclusion` is identical.

## READ-ONLY GUARANTEE

- CLI flow: `await pickLatestArtifactEntry(store,
  "PathFreshnessReport")` + `await
  store.read(...)`. **No subprocess. No `rekon
  paths freshness`. No `rekon refresh`. No
  fingerprint computation. No source-file
  access.**
- Helper: pure function of its inputs. Reads no
  env, no disk, no sockets.
- Builders (`buildGitHubCheckPayload`,
  `buildPrCommentBody`): unchanged in behaviour
  for any plan that doesn't pass the new
  optional inputs.
- Missing report is a no-op (no-baseline
  guidance renders; no error, no exit-1).

## TESTS / VERIFICATION

- New
  `tests/contract/path-freshness-github-review.test.mjs`
  — 14 cases, all passing:
  1. github-check dry-run: no-report guidance.
  2. github-check dry-run: status fresh.
  3. github-check dry-run: stale warning.
  4. **github-check conclusion unchanged by
     stale path freshness** (pins the policy).
  5. github-check cites `PathFreshnessReport`.
  6. pr-comment dry-run: no-report guidance.
  7. pr-comment dry-run: status fresh.
  8. pr-comment dry-run: stale warning.
  9. pr-comment cites `PathFreshnessReport` in
     `citedRefs`.
  10. github-check `--send` POSTs the same
      path-freshness lines via a fake `node:http`
      server.
  11. pr-comment `--send` POSTs a comment body
      that includes the path-freshness rows via
      a fake `node:http` server.
  12. publish dry-run does not add a new
      `PathFreshnessReport`.
  13. publish dry-run does not invoke `rekon
      refresh` (no new evidence/snapshot across
      a repeat publish).
  14. `artifacts validate` remains clean.
- New
  `tests/docs/path-freshness-github-review.test.mjs`
  — 9 assertions.
- All 9 mandatory verification commands clean.
- CLI smoke matrix (per work order) clean.

## INTENTIONALLY UNTOUCHED

- `PathFreshnessReport` schema.
- `ArtifactHeader` shape.
- Check `pickConclusion` logic (path freshness is
  **not** an input to conclusion in this slice).
- `assessGitHubCheckPublisherReadiness` /
  `assessPrCommentPublisherReadiness` (no new
  gates; readiness behaviour unchanged).
- `publishGitHubCheckRun` / `publishPrCommentRun`
  (no transport changes).
- Workflow templates + validator profiles.
- Active workflow YAML (none added).
- `package.json` / `package-lock.json`.
- Capability conformance.

## RISKS / FOLLOW-UP

- **Path-freshness GitHub review surfacing
  observability.** Now that the Check + PR
  comment surfaces carry the rows, reviewers may
  start asking "why didn't conclusion change?"
  — the CONCLUSION POLICY section above + the
  docs updates pin the answer. A future slice
  can revisit if operator evidence supports
  hard-gating.
- **Section verbosity on very large repos.** The
  GitHub Check `output.summary` adds ~5 lines
  regardless of repo size (the change-table
  rendered in publications is NOT replicated in
  the GitHub Check summary — by design, to keep
  the Check payload compact). PR comment likewise
  only adds 2 table rows + an optional warning.
- **Two CLI subcommands share the same lookup
  code path.** A future refactor could extract a
  shared helper. Not in scope for this slice.

## NEXT STEP

Per the work order: **Path freshness safety
review.** Review the full path-freshness track:
artifact, `paths freshness` CLI, publication
surfacing, GitHub review surfacing,
no-daemon / no-background-refresh guarantee.
Decide whether the implementation is
beta-private stable or needs another hardening
pass.
