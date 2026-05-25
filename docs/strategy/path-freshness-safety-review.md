# Path Freshness Safety Review

**Status:** shipped (review memo). The full path
freshness track is reviewed end-to-end.
**Decision:** **The path freshness track is
beta-private stable.** No additional hardening
is required before moving on.
**Owner:** Rekon strategy / release.
**Scope:** review every component of the
path-freshness implementation, confirm it
preserves the artifact-canonical /
no-background-refresh model, and decide whether
to declare the track beta-private stable or do
another hardening pass.

## Decision Summary

**Recommendation: the path freshness track is
beta-private stable.**

Every component on the track ships with explicit
safety contracts that were preserved through
review:

- `PathFreshnessReport` is the first
  working-tree-freshness artifact. It is
  **explicit and operator-triggered.** No
  surface writes one as a side-effect.
- The source-state fingerprint helper uses
  **sha256 content hashes as canonical
  evidence**; mtimes are **advisory only**.
- `rekon paths freshness` writes exactly one
  report per invocation and never re-runs
  `rekon refresh` or itself.
- Architecture summary, agent contract, and
  proof report publishers render a
  `Working Tree Path Freshness` section sourced
  from the latest report. **Publications are
  read-only with respect to the report.**
- GitHub Check + PR comment payloads surface
  the same status as a compact trust warning.
  **Stale path freshness is a warning, not a
  GitHub Check conclusion override.**
- **No daemon, no background refresh, no
  automatic refresh** anywhere in the track.

**Artifact lineage freshness is not working-tree
freshness.** The two surfaces coexist; both are
needed, neither replaces the other.

**PathFreshnessReport is explicit and
operator-triggered.** No surface (publisher,
GitHub review CLI flow, or downstream consumer)
writes one as a side-effect; the only path that
writes a `PathFreshnessReport` is the operator
invoking `rekon paths freshness`.

**No daemon or background refresh exists.** Beta
default per the watcher / path freshness policy
memo; preserved end-to-end across every
implementation slice on this track.

**Stale path freshness is a warning, not a
GitHub Check conclusion override.** Stale state
is visible in the Check `output.summary` block
and PR comment body; the Check `conclusion`
continues to reflect proof / validation state
via the existing `pickConclusion` logic.

The remaining work is post-beta polish (see
*Follow-Up Work*). The recommended next slice is
the **private beta support playbook** (per the
work-order's next-step guidance).

## Why This Review Exists

The path freshness track was selected by the
[Post-Beta Dogfood Evidence Triage
Decision](post-beta-dogfood-evidence-triage.md)
(Option C). It comprised three implementation
slices in addition to the prior decision /
policy memo:

1. [PathFreshnessReport artifact + source-state
   fingerprint skeleton](../artifacts/path-freshness-report.md)
2. **Path freshness publication surfacing**
   (architecture summary, agent contract, proof
   report).
3. **Path freshness GitHub review surfacing**
   (GitHub Check + PR comment).

The work-order for this batch asked: *before
moving on, has the implementation preserved the
artifact-canonical, no-background-refresh model
documented in the
[Watcher / Path Freshness Policy
Decision](watcher-path-freshness-policy-decision.md)?*

This memo answers that question and pins the
beta-private stability decision.

## Components Reviewed

| Component | Status | Notes |
| --- | --- | --- |
| `PathFreshnessReport` artifact | shipped | Working-tree freshness artifact; registered in `@rekon/sdk` + `@rekon/runtime` (category `actions`). |
| Source-state fingerprint helper | shipped | `buildSourceStateFingerprint` in `@rekon/kernel-repo-model`. **Content hashes canonical** (sha256). |
| `rekon paths freshness` CLI | shipped | Explicit report command. Writes exactly one diagnostic per invocation. |
| Publication surfacing | shipped | Architecture summary / agent contract / proof report all render the latest `PathFreshnessReport`. |
| GitHub surfacing | shipped | GitHub Check `output.summary` + PR comment summary table both render the latest report as a trust warning. |
| No-daemon policy | preserved | Beta default per the watcher / path freshness policy memo: explicit refresh only. |
| Read-only guarantees | preserved | Every publisher + GitHub-review CLI flow calls only `latestRef` + `store.read(...)`. |
| Mtime / hash policy | preserved | sha256 over file content is canonical; mtimes are `mtimeAdvisory` opt-in only. |
| Conclusion policy | preserved | Stale path freshness is a visible trust warning; **does not by itself flip the GitHub Check conclusion.** |

## Artifact Model Review

The `PathFreshnessReport` shape stayed conservative
through the entire track:

- Records **hashes and path-level metadata
  only** — never raw file contents.
- `ArtifactHeader` is unchanged across all three
  slices.
- Status enum is the deliberately small
  `fresh | stale | unknown` (with per-path
  `fresh | changed | missing | new | unknown`).
- Summary counts (`total / fresh / changed /
  missing / new / unknown`) and the
  `recommendation: { refreshRecommended,
  commands, message }` field were stable across
  all three publication / GitHub-surfacing
  slices — both downstream renderers use the
  same canonical fields without recomputation.
- `baselineRef` and `baselineSourceState` are
  optional. First-run reports omit both
  (status: `unknown`).
- The artifact validates structurally via
  `createPathFreshnessReport`, which enforces:
  status enum membership, per-entry status enum
  membership, summary present, recommendation
  present, `currentSourceState.algorithm ===
  "sha256"`, and non-empty `rootHash`.

**Verdict: schema is sufficient as the first
working-tree-freshness artifact.** No schema
change required for beta-private stable.

## Source-State Fingerprint Review

`buildSourceStateFingerprint(input)` in
`@rekon/kernel-repo-model` is the only helper that
touches the filesystem in the entire track.
Pinned behaviours:

- **Deterministic ordering.** Paths sorted
  lexically; `rootHash` is sha256 over canonical
  JSON of `{path, hash, size, exists}` entries.
- **Bounded.** Files larger than 32 MiB record
  `exists + size` only (no hash) so a runaway
  file never exhausts memory.
- **Conservative default ignore set.** `.git`,
  `.rekon`, `node_modules`, `dist`, `coverage`,
  `.next`, `.turbo`, `.cache` — exported as
  `DEFAULT_SOURCE_FINGERPRINT_IGNORE` so audit
  reviewers see exactly what is excluded.
- **`mtimeAdvisory`** opt-in. CLI defaults to
  off so two clones with identical content
  produce identical fingerprints.
- **No source mutation. No network.**
- Reads only inside `repoRoot`.

**Verdict: hashes are the right canonical
evidence.** Mtime advisory metadata is correctly
opt-in and never consumed by the comparator.

## CLI Review

`rekon paths freshness [--path <path>] [--root
<path>] [--json]` is **read-only with respect to
source files**. Pinned behaviours (every
contract test still passing):

- First run on a repo records `status:
  "unknown"` and a no-baseline recommendation.
- Subsequent runs without changes record
  `status: "fresh"`.
- Changed / missing / new tracked paths record
  `status: "stale"` with a `rekon refresh`
  recommendation.
- `--path` narrows the tracking set; baseline
  comparison is narrowed too so unrelated
  prior-baseline paths do not surface noise.
- The CLI **never spawns `rekon refresh`** and
  **never spawns `rekon paths freshness`
  recursively**.
- Source tree is byte-identical before and
  after each invocation.
- mtime alone does not flip status (the
  contract test ages a file forward without
  changing content; the next run still records
  `fresh`).

**Verdict: explicit + read-only + bounded.**
Acceptable as the operator-triggered surface.

## Publication Surfacing Review

The architecture summary, agent contract, and
proof report publishers render a consistent
`Working Tree Path Freshness` section using the
shared `buildPathFreshnessPublicationSection`
helper:

- Architecture summary: heading level 2, sits
  between `## Verification Proof Status` and
  `## Proof Loop`.
- Agent contract: heading level 3, sits between
  Verification Proof Status and Memory Guidance;
  the publication's `## Do Not Do` list gained
  one new entry pinning the lineage-vs-working-tree
  distinction.
- Proof report: heading level 2, sits before
  `## Input Artifacts` and renders even in the
  no-VerificationPlan early-bailout path.
- All three publishers cite the latest
  `PathFreshnessReport` in `header.inputRefs`
  when present.
- The change-path table is bounded at 20
  non-fresh entries via
  `PATH_FRESHNESS_PUBLICATION_TABLE_CAP` so
  publications stay readable on large repos.

**No publisher invokes `rekon paths freshness`
or `rekon refresh`.** Contract tests pin this
by count and by cited id.

**Verdict: publication surfaces are sufficient.**

## GitHub Review Surfacing Review

GitHub Check + PR comment surfaces both render a
consistent compact trust warning via the shared
`buildPathFreshnessGitHubSummary` helper:

- GitHub Check `output.summary` gains a
  `Working tree path freshness:` block: status,
  report ref, refresh recommendation, drift
  counts (when stale), and a `Run \`rekon
  refresh\`` blockquote.
- PR comment body gains `Working-tree
  freshness` + `PathFreshnessReport` summary
  rows; stale or unknown warning enters the
  existing `### Warnings` section.
- Both surfaces append the report ref to
  `citedRefs`.
- PR comment JSON output gains
  `citedRefs.pathFreshness` (additive).
- Both CLI flows (`--dry-run` and `--send`)
  read the latest `PathFreshnessReport` via
  `pickLatestArtifactEntry` + `store.read(...)`.

**No new readiness gate. No GitHub API
transport change. No conclusion change.**

**Verdict: GitHub review surfaces are
sufficient.** Operator-facing review now sees
the same warning the local publications carry.

## Read-Only Guarantee

Across the entire track, the publish + GitHub
review code paths are read-only with respect to
the `PathFreshnessReport`:

- `architectureSummaryPublisher`,
  `agentContractPublisher`, and
  `proofReportPublisher` call only
  `latestRef("PathFreshnessReport")` +
  `artifacts.read(ref)`.
- `rekon publish github-check --dry-run`/`--send`
  and `rekon publish pr-comment
  --dry-run`/`--send` call only
  `pickLatestArtifactEntry("PathFreshnessReport")`
  + `store.read(...)`.
- **None of the above invokes `rekon paths
  freshness`, `rekon refresh`, a subprocess,
  a fingerprint computation, or a
  PathFreshnessReport write.**
- Missing report is a no-op everywhere
  (no-baseline guidance renders; CLI exits 0;
  publication still emits).

Contract tests pin this guarantee in every
slice — by counting artifacts before/after,
by checking that the cited id is the
pre-existing one, and by comparing conclusion
across fresh/stale runs.

## No-Daemon Policy

**Still the right policy for private beta.**
Confirmed against the
[Watcher / Path Freshness Policy
Decision](watcher-path-freshness-policy-decision.md)
Option C:

- No watcher daemon.
- No background refresh.
- No file-system event subscription.
- No automatic `rekon refresh`.
- No automatic `rekon paths freshness`.

The track met every guardrail Option C
specified. The reserved `PathFreshnessReport`
name was the only future-facing primitive
mentioned in that memo, and it shipped as
designed.

## Mtime And Hash Policy

- **Sha256 content hashes are canonical
  freshness evidence.** Confirmed by:
  - `buildSourceStateFingerprint` reads file
    contents and hashes with `createHash("sha256")`.
  - `comparePathFreshness` compares `hash`
    values, not mtimes.
  - Contract test #15 of the
    `path-freshness-report` slice ages a file
    forward without changing content; the
    follow-up run still records `fresh`.
- **mtimes are advisory only.** Captured only
  when `includeMtimeAdvisory: true` is passed
  (the CLI defaults to off). Comparators never
  consume the field. The `PathFreshnessReport`
  field is named `mtimeAdvisory` to make the
  status visible.

**Verdict: hash-canonical / mtime-advisory is
the correct posture.** No change required.

## GitHub Check Conclusion Policy

**Stale path freshness is a warning, not a
GitHub Check conclusion override.**

Pinned this slice (path freshness GitHub review
surfacing). Reasons captured in that slice's
review packet:

- Check conclusion currently reflects proof /
  validation state via the existing
  `pickConclusion` logic (`success` /
  `failure` / `timed_out` / `action_required` /
  `neutral` / `cancelled`).
- Stale path freshness is a **trust warning
  and recommended-refresh signal**, not a
  transport failure or proof-status
  replacement.
- The signal is already redundant with the
  existing proof-freshness path: if proof is
  truly stale because the working tree
  drifted, `freshness === "stale"` already
  routes the conclusion through
  `action_required`. Folding path freshness
  into conclusion would double-count.

A separate decision memo can revisit if beta
evidence supports hard-gating. **For now: warn,
do not flip.**

Contract test #4 of the
`path-freshness-github-review-surfacing` slice
pins this by re-running the dry-run twice
(once with `fresh` baseline, once with `stale`)
and asserting that `payload.conclusion` is
identical.

## Beta-Private Stability Decision

| Criterion | Result |
| --- | --- |
| Explicit artifact exists | pass |
| No background refresh | pass |
| Publications surface stale state | pass |
| GitHub surfaces warn | pass |
| Content hashes canonical | pass |
| Artifact lineage distinction preserved | pass |
| Read-only across publish + GitHub review | pass |
| `rekon refresh` remains operator-triggered | pass |
| `rekon paths freshness` remains operator-triggered | pass |
| Conclusion override blocked by design | pass |

**Decision: the path freshness track is
beta-private stable.** No additional hardening
is required before moving on.

## Remaining Risks

| Risk | Current Guardrail | Remaining Follow-Up |
| --- | --- | --- |
| Stale context | Stale warning + `rekon refresh` recommendation in publications + GitHub review surfaces | Operator education (private beta support playbook) |
| Hidden mutation | No daemon / no background refresh; read-only across all publishers + GitHub review CLI flows | Future watcher-lite / daemon review (post-beta) |
| mtime unreliability | Content hashes canonical; `mtimeAdvisory` opt-in only | Keep `mtimeAdvisory` opt-in; document clearly (already in artifact + concept docs) |
| Check conclusion confusion | Warning only; conclusion unchanged | Revisit only if beta evidence supports hard-gating; new decision memo required |
| Default-walk cost on large monorepos | Bounded reads (32 MiB cap per file); conservative default ignore set | Optional `--path` from `git diff --name-only`; `.rekonignore` recognition (post-beta) |
| Large change-table verbosity | Bounded at 20 non-fresh entries via `PATH_FRESHNESS_PUBLICATION_TABLE_CAP` | Tune post-cohort if real-world reports surface more useful drift detail |
| Operator forgets to run `rekon paths freshness` | First-run `unknown` is loud (publications + GitHub surfaces both name the command) | Private beta playbook should include "run `rekon paths freshness` after edits" |

None of these are release blockers for
beta-private. Each has a clear next step that
sits beyond the safety review.

## Follow-Up Work

Post-beta polish (none required before
declaring the track beta-private stable):

- **PathFreshnessReport publication
  refinements.** If real-world reports surface
  large change tables, consider an
  `entries: stale | all` summarisation toggle.
- **Optional event-payload integration.**
  GitHub workflow events that already supply a
  list of changed files (e.g., `git diff
  --name-only` against the merge-base) could
  be passed to `--path` automatically. Still
  no daemon; still operator-triggered (via the
  workflow author's choice).
- **Future watcher-lite / daemon review.**
  Re-open the policy decision only if private
  beta evidence supports a daemon (or its
  opt-in equivalent).

The recommended next slice is the
**private beta support playbook** (per the
work-order's next-step guidance) — define how
private beta users report issues (attach Rekon
artifacts; provide CLI command logs; classify
blockers vs acceptable findings; rerun path
freshness after source edits; no-npm /
source-checkout install instructions).

## Cross-References

- [Watcher / Path Freshness Policy
  Decision](watcher-path-freshness-policy-decision.md)
  — the policy decision that scoped the
  track.
- [Post-Beta Dogfood Evidence Triage
  Decision](post-beta-dogfood-evidence-triage.md)
  — the decision that selected Option C
  (this track).
- [`PathFreshnessReport` artifact doc](../artifacts/path-freshness-report.md)
- [Path freshness concept doc](../concepts/path-freshness.md)
- [Freshness and invalidation concept
  doc](../concepts/freshness-and-invalidation.md)
  — covers the complementary artifact-lineage
  freshness surface (working-tree freshness is
  distinct).
- [Agent operating contract concept
  doc](../concepts/agent-operating-contract.md)
- [GitHub Actions verification runner operator
  guide](../examples/github-actions-verification-runner.md)
- [Roadmap](roadmap.md) +
  [Classic-behaviour roadmap](classic-behavior-roadmap.md)

## Status

Decision recorded on 2026-05-26. No version bump.
No npm publish. No runtime behaviour change.
Rollback is trivial: revert this memo and the
supporting doc cross-links.

## Follow-Up

The recommended next slice
([Private Beta Support Playbook](../beta/private-beta-support-playbook.md))
**has shipped.** It converts the now-stable
no-NPM private-beta posture (verification +
GitHub review surfaces + path freshness) into an
operator-facing support process. The bug-report
template lives at
[Private Beta Bug Report Template](../beta/private-beta-bug-report-template.md).
Both the playbook and the template pin
working-tree freshness as a first-class signal,
direct operators to re-run `rekon paths
freshness` after source edits, and re-state the
warning-only Check conclusion contract.

The follow-up to the playbook
([Private Beta Onboarding Quickstart](../beta/private-beta-onboarding-quickstart.md))
**has also shipped.** It distills the playbook
into a concise "start here" path (install from
source checkout, run the first scan, inspect
canonical outputs, run path freshness, report
blockers) and pins *"Artifact lineage freshness
is not working-tree freshness."* verbatim — the
canonical reference for that contract remains
this safety review.
