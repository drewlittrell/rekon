# Watcher / Path Freshness Policy Decision

## Decision Summary

**Recommendation: Option C — watcher-lite / path
freshness policy for beta. No daemon by default;
explicit `rekon refresh` remains the canonical
operator action; future `PathFreshnessReport`
artifact reserved by name; agent contract instructs
agents to refresh after source edits.**

The [Beta Readiness / Remaining Classic-Parity
Review](beta-readiness-classic-parity-review.md)
identified three beta blockers; this memo resolves
the second by pinning the watcher / path freshness
policy without shipping any watcher implementation
in this batch.

**Pinned reminders carried forward:**

- **Watcher daemon is not required for beta.**
- **Path/source freshness policy is required for
  beta.**
- **Rekon must not silently mutate artifacts in
  the background.**
- **Agents should treat artifacts as stale after
  source edits until `rekon refresh` has run.**
- **Artifact lineage freshness is not the same as
  working-tree freshness.**

This batch ships **the decision memo only**. No
new package. No new CLI command. No new helper.
No artifact type registered. No file-system event
subscription. No daemon. No background refresh.
No path mtime tracking. No `ArtifactHeader`
mutation. No source-file mutation. The artifact
name `PathFreshnessReport` is **reserved by this
memo + the docs test**; its actual registration
belongs to a post-beta implementation slice.

## Why This Decision Exists

Rekon today produces artifacts from a snapshot of
the working tree. Once an artifact is written,
its `header.inputRefs` lineage is **canonical**
for the repo state Rekon observed at generation
time. But the working tree keeps changing under
the operator's feet:

- An operator runs `rekon refresh`, then opens a
  source file in their editor and edits it.
- An agent reads the architecture summary, then
  the operator (or the agent itself) edits source
  through a separate tool.
- A CI job runs `rekon evaluate`, then a later
  job applies a fix and re-pushes.

In all three cases, Rekon's artifacts are still
**internally coherent** (every `header.inputRefs`
still resolves; every digest still matches), but
they describe a **previous** repo state.
Without a pinned policy:

- Beta users may assume Rekon auto-detects source
  changes and re-reads the working tree.
- Agents may rely on stale artifacts and present
  outdated findings as current.
- A future contributor may try to add daemon
  behaviour ad hoc, without the safety review
  apply work demanded for source writes.
- A confused operator may add background refresh
  triggers that silently mutate
  `.rekon/artifacts/**` between operator commands.

The [beta readiness review](beta-readiness-classic-parity-review.md)
named this gap explicitly:

> A beta user who edits source after running
> Rekon will reasonably expect artifacts to
> reflect the change. Without a pinned policy,
> the loop silently produces stale reviews.
> Beta needs **one** policy on when to refresh,
> when to refuse stale artifacts, and how to
> surface staleness in CI.

This memo answers that question. The answer is
**"beta requires explicit refresh + visible
staleness; no daemon ships in beta; agents
must refresh after edits."**

## Current Refresh Model

Today's behaviour, pinned by
[`docs/concepts/refresh.md`](../concepts/refresh.md)
and
[`docs/concepts/freshness-and-invalidation.md`](../concepts/freshness-and-invalidation.md):

- **`rekon refresh`** is the explicit one-command
  flow that runs the full lifecycle in order. It
  is **not a watcher, not a daemon, not a source
  rewriter, and not a verification command
  runner**. One invocation runs the lifecycle once.
- **`rekon artifacts freshness`** is the authoritative
  artifact-lineage freshness oracle. It checks
  `header.inputRefs` for missing inputs, newer
  inputs of the same type, and missing lineage.
  It produces `fresh` / `stale` / `partial` /
  `unknown` per artifact and aggregate.
- **`--changed-file <path>`** is supported on
  `rekon observe` (and passed through by `rekon
  refresh --changed-file`) for incremental
  observation. It is **not** a watcher signal;
  it is an explicit operator input.
- **Latest-major freshness interpretation.** The
  refresh's `artifacts.freshness` step passes
  only when every latest major artifact's
  non-historical issues are empty. The aggregate
  freshness oracle may still report `stale`
  because historical artifacts in the store
  reference superseded inputs by design.
- **Surface-level freshness guardrails.** The
  architecture summary publication renders an
  `## Input Freshness Warnings` section when the
  artifact chain is stale; the agent contract
  publication always renders a `### Governance
  Freshness` subsection; `resolve.issue` emits
  `issue.freshness` trace entries and adds
  warnings to `packet.warnings`. **None of these
  consume working-tree state.** They consume
  artifact lineage.
- **`invalidatedBy` rules in capability manifests**
  declare `inputs` (artifact types) + `paths`
  (file globs) + `events` (reserved). The
  current alpha runtime consumes the `inputs`
  lineage path implicitly via `header.inputRefs`;
  **`paths` and `events` rules are public
  intent**, not yet evaluated by any runtime
  engine.

**What's missing:** a pinned policy for what
happens when **source files change** between
artifact generations, and a contract for how
agents should treat artifacts in that window.

## Classic Goal Reviewed

`codebase-intel-classic` shipped a `WatchHandler`
and a path-based context freshness model:
- `services/WatchHandler.ts` subscribed to
  file-system events and triggered context
  regeneration on relevant changes.
- `services/ContextHandler.ts` tracked which
  source paths had been read into a generated
  context bundle.
- `lib/context-freshness.ts` computed whether
  generated context was stale relative to the
  current working tree.

The useful guarantee was **not** "always run a
daemon"; it was **"users and agents must not
unknowingly rely on stale codebase context."**
Classic preserved that guarantee through a
combination of:

- Live watcher invalidation for interactive
  sessions.
- Path freshness checks for CI / batch
  contexts.
- Explicit refresh commands for cold-start
  workflows.

Rekon's equivalent guarantee, pinned by this
memo, must preserve:

- **Stale context must be visible.** Whether
  via artifact lineage warnings (already
  shipped) or path/source freshness warnings
  (future work), staleness must surface where
  operators and agents act.
- **Refresh remains explicit and
  artifact-backed.** No silent background
  regeneration. `rekon refresh` is the canonical
  command.
- **Agents must be warned before relying on
  stale context.** The agent operating contract
  must instruct agents to run or request
  `rekon refresh` after source edits.
- **Changed paths matter.** The future path
  freshness slice must reason over file paths,
  not just artifact lineage.
- **No hidden background mutation of
  artifacts.** This is the inverse of the
  source-write boundary: Rekon writes its own
  artifacts (already allowed) but must not do
  so on a hidden schedule.

The classic posture is "watcher + explicit
refresh + path freshness." Rekon's posture for
beta is "no watcher yet; explicit refresh +
artifact-lineage freshness + agent contract
guidance + reserved future path-freshness
artifact."

## Options Considered

### Option A — Manual refresh only

No watcher. No new path freshness policy.
Operators run `rekon refresh` after edits as a
matter of discipline.

**Pros:** simplest; no file-system complexity;
no daemon lifecycle; current model remains
intact; no new artifact type to define.

**Cons:** users may rely on stale artifacts
after edits without any visible warning beyond
artifact lineage; weak classic freshness parity;
agents have no contract surface that tells them
to refresh; the policy gap the beta-readiness
review identified is not closed.

**Verdict:** acceptable as a strict default but
doesn't close the policy ambiguity. Rejected as
the standalone choice; preserved as the effective
behaviour under Option C while the path
freshness policy + agent contract guidance carry
the user-visible commitments.

### Option B — Full watcher daemon

A watcher process subscribes to file-system
events and refreshes (or invalidates) artifacts
in the background.

**Pros:** closest to classic watcher behaviour;
strongest live freshness story; no manual refresh
needed for interactive sessions.

**Cons:** daemon lifecycle complexity (start /
stop / crash / restart); cross-platform
file-system watcher issues (Linux inotify
limits, macOS FSEvents semantics, Windows
ReadDirectoryChangesW edge cases); risk of
hidden artifact mutation between operator
commands; no safety review yet; surfaces a brand
new attack surface; conflicts with the
canonical-truth invariant unless every
background write cites an explicit operator
intent; cannot ship for beta without its own
safety review + permission contract.

**Verdict:** Rejected for beta. Reconsider
post-beta as a separate decision memo with its
own safety review (mirroring the source-write
roadmap).

### Option C — Watcher-lite / path freshness policy for beta (**recommended**)

No daemon by default. Pin a path freshness
policy:

- Record or compare source state with enough
  fidelity to warn when artifacts may be stale
  relative to the working tree.
- Recommend `rekon refresh` after edits in
  every surface that consumes artifacts.
- Continue to support `--changed-file` as the
  explicit operator input for incremental
  observation.
- Keep refresh operator-driven; no background
  refresh.
- Reserve `PathFreshnessReport` as the future
  artifact name for the path freshness
  evaluation.
- Pin the agent contract guidance: agents must
  treat artifacts as stale after source edits
  until `rekon refresh` has run.

**Pros:** resolves the beta policy blocker;
avoids daemon complexity; preserves the
canonical-truth + no-background-mutation
invariants; gives users and agents clear
stale-context guidance; future-compatible with
both a path-freshness implementation slice and
a post-beta watcher daemon slice.

**Cons:** not full live freshness; users must
still run refresh manually; the path freshness
implementation requires future work (content
hashing or git-status checks per source path).

**Verdict: Recommended.** This is the most
honest answer: beta does **not** include a
watcher daemon, but it does pin every constraint
the future watcher / path-freshness slices must
satisfy.

### Option D — Hybrid: opt-in experimental watcher

Beta keeps manual refresh by default but offers
an experimental opt-in `rekon watch` command
that runs a daemon for advanced users.

**Pros:** gives advanced users a path; keeps
daemon non-default; matches some classic
workflows.

**Cons:** still introduces daemon complexity
before beta; needs its own safety review +
permission contract before shipping; policy
and support burden remain even when opt-in;
risks surprising users who don't realise the
opt-in command is mutating artifacts in the
background.

**Verdict:** Rejected for beta. Reconsider
post-beta after a watcher safety review +
permission contract land. The opt-in shape may
become the right shipping form once a daemon
is implemented; today it is premature.

## Recommendation

**Adopt Option C.** Ship this decision memo +
the docs test that pins it. Defer the path
freshness implementation, the watcher daemon
design, and any opt-in watcher CLI to follow-on
slices, each with its own decision memo + safety
review (where applicable).

**Pinned for the next slices (in order):**

1. **Beta release readiness checklist memo**
   (next slice; the third beta blocker — not
   watcher work, but the final blocker in the
   beta queue).
2. **Beta release execution** (final pre-beta
   slice).
3. **(Post-beta)** Path freshness artefact slice.
   Adds the `PathFreshnessReport` artifact type
   + a CLI command (`rekon paths freshness` or
   equivalent — naming deferred) that records a
   working-tree-vs-artifact freshness evaluation.
4. **(Post-beta)** Watcher daemon design memo.
   Pins the daemon lifecycle, the permission
   contract, the cross-platform file-system
   strategy, and the no-hidden-mutation
   invariant.
5. **(Post-beta)** Watcher daemon implementation
   slice (if Option D's opt-in shape proves
   right) or a fully integrated watcher (if the
   design memo prefers it).
6. **(Post-beta)** Watcher / path freshness
   safety review slice. Walks the full
   path-freshness + watcher path and declares
   it beta-stable (or surfaces remaining
   blockers).

**The next slice is the beta release readiness
checklist memo**, not the path freshness
artefact, because the beta blockers must clear
in the order the beta-readiness review listed
them.

## Beta Default

**No daemon by default.** No background refresh.
No file-system event subscription.

**`rekon refresh` remains the explicit command
that rebuilds the artifact graph.** It runs
once per invocation, on demand, and writes only
into `.rekon/artifacts/**`.

**`--changed-file <path>` remains supported on
`rekon refresh` and `rekon observe`** as the
explicit operator input for incremental
observation. It is not a watcher signal; it is
the operator (or their CI script) telling Rekon
which paths changed in this iteration.

**Aggregate freshness in surfaces remains
visible.** The architecture summary's Input
Freshness Warnings, the agent contract's
Governance Freshness, and `resolve.issue`'s
`issue.freshness` trace entries continue to
warn on stale **artifact lineage**. Beta adds
the policy that **working-tree freshness is
distinct from artifact lineage freshness**;
the user-visible warnings cover the latter
today, and the former lands in a future slice.

## Source Change Policy

When source files change after artifact
generation, the policy is:

- **Operators run `rekon refresh`** (or the
  narrower `rekon observe --changed-file <path>`
  flow followed by the downstream commands)
  before treating artifacts as current.
- **Surfaces continue to show artifact lineage
  warnings.** The architecture summary, the
  agent contract publication, and `resolve.issue`
  already warn when the artifact chain is
  internally stale.
- **Future surfaces will show working-tree
  warnings.** Once the path freshness slice
  lands, surfaces will additionally render a
  `## Working Tree Freshness` warning (or
  equivalent — naming deferred) when source
  paths cited by the artifact chain have
  changed since generation.
- **Refresh is never automatic.** No surface,
  no resolver, no publisher, no agent invocation
  triggers `rekon refresh` on its own. Refresh
  is operator-initiated (CLI or CI step), full
  stop.
- **`--changed-file` is the recommended
  incremental path.** When the operator already
  knows which paths changed (e.g., from `git
  diff --name-only`), the incremental form
  reduces refresh cost without changing the
  policy.

**The Source Change Policy applies to every
surface that consumes artifacts.** No surface
may silently re-derive artifacts from a fresher
working tree; every re-derivation must trace
back to an explicit operator command.

## Path Freshness Model

**Reserved artifact name: `PathFreshnessReport`**
(singular `Report`, not `Ledger`).

Rationale for the name:

- **Report shape matches one freshness
  evaluation.** Each `rekon paths freshness` (or
  equivalent) invocation produces one report
  describing the working tree vs. the latest
  artifact lineage at a single point in time.
- **Can cite `ObservedRepo` / `EvidenceGraph` /
  `FindingReport` / `VerificationPlan`** by id.
  The chain is end-to-end traceable from
  source-path → latest-artifact → freshness
  verdict.
- **Does not preclude a ledger** later
  (`PathFreshnessActivityLedger` or similar) if
  real-world usage shows operators want a
  cross-run history.

**Reserved fields the path freshness report
must include** (informational; the registration
slice can extend):

- `header.inputRefs` cites the artifacts whose
  source-path coverage is being evaluated
  (e.g., the latest `ObservedRepo`,
  `EvidenceGraph`, and any `FindingReport`s
  that cite specific paths).
- `paths[]` lists each evaluated path with
  `path`, `lastObservedDigest` (the source
  state Rekon observed at generation time),
  `currentDigest` (the source state at
  freshness-evaluation time), `status`
  (`fresh` / `stale` / `missing` /
  `unknown`), `affectedArtifacts[]` (artifact
  ids whose lineage cites this path).
- `summary` includes `total`, `fresh`,
  `stale`, `missing`, `unknown`, plus
  `recommendation` (`refresh-required` /
  `refresh-suggested` / `none`).

**Change detection model:**

The implementation slice must use **content
hashes or git working-tree status** as the
canonical freshness evidence. **File mtimes
alone are not sufficient as canonical freshness
evidence** for these reasons:

- Mtimes can be advanced by editor "touch on
  save" without content change.
- Mtimes can be rolled back by `git checkout`.
- Cross-platform mtime resolution varies (one-
  second granularity on some filesystems).
- A content-hash comparison correctly identifies
  no-op writes and reverted edits.

Mtimes may be used as an **advisory pre-check**
(skip the hash computation when mtime ≤ last
observed mtime) but every reported `stale`
verdict must be backed by a content-hash or
git-state comparison.

**Git working-tree status is preferred where
available** because it composes with developer
workflows (operators already think in terms of
`git diff`) and avoids unnecessary I/O. When
the repository is not a git checkout, the
implementation falls back to content hashing.

## Agent Contract Policy

**The agent operating contract publication must
instruct agents to run or request `rekon
refresh` after source edits.**

Specifically, the agent contract:

- **Continues to render the existing
  `### Governance Freshness` subsection.** That
  block already warns about adjudication /
  coherency staleness in the artifact chain.
- **Future: renders a new
  `### Working Tree Freshness` subsection** when
  the path freshness slice lands. The
  subsection will report the latest
  `PathFreshnessReport` status and recommend
  `rekon refresh` (or
  `rekon paths freshness` followed by `rekon
  refresh` if stale) before relying on
  artifacts.
- **Must instruct agents** (via a pinned
  contract statement) to:
  - Treat artifacts as stale after source
    edits until `rekon refresh` has run.
  - Not infer freshness from timestamps alone.
  - Recommend `rekon refresh` to the operator
    when artifact lineage **or** working-tree
    freshness reports stale.
  - Not invoke `rekon refresh` on the
    operator's behalf without explicit
    permission. (Refresh is operator-initiated.)

**Agents reading the agent contract must never
treat the absence of a freshness warning as
proof of freshness.** The contract is a
positive signal: when stale, it says so; when
fresh, it cites the artifacts it relied on.
Agents should still confirm the artifact lineage
matches their expected source state before
relying on findings, especially after edits.

## Watcher Future

**Watcher daemon remains post-beta or
experimental.** This memo does not pin the
exact daemon shape (the watcher daemon design
memo will); it pins the **requirement** and the
minimum boundary:

- **A future watcher must not write artifacts
  without explicit operator policy.** Even
  background detection of source changes must
  not auto-trigger `rekon refresh` unless the
  operator has opted in via an explicit
  configuration or CLI command.
- **A future watcher must declare its lifecycle
  events.** Start, stop, crash-recovery, and
  drift-detection (the watcher missed a
  filesystem event) must all surface as
  observable state.
- **A future watcher must have its own safety
  review.** The watcher daemon's permission
  contract, cross-platform behaviour, and
  failure modes must clear a safety review
  slice before being declared beta-stable.
- **A future watcher must be opt-in or
  explicit.** Even if the design memo
  ultimately ships a default-on watcher, the
  initial implementation must default-off so
  operators can adopt it on their own pace.
- **No silent partial-refresh writes.** A
  watcher that detects a change and writes a
  partial artifact set must declare the partial
  state honestly (or fail closed). The apply
  / source-write memo's no-silent-partial
  invariant applies here too.

## What This Does Not Do

This batch **does not**:

- Implement watcher behaviour.
- Add a daemon.
- Add file-system event subscriptions.
- Add background refresh.
- Change `rekon refresh` behaviour.
- Change `rekon artifacts freshness` behaviour.
- Change `rekon observe --changed-file`
  behaviour.
- Add path mtime tracking.
- Add content-hash recording for source paths.
- Change `ArtifactHeader` shape.
- Change `IntelligenceSnapshot`, `EvidenceGraph`,
  `ObservedRepo`, `FindingReport`, or
  `VerificationRun` schemas.
- Add the `PathFreshnessReport` artifact type
  to `@rekon/runtime`'s category map or
  `@rekon/sdk`'s conformance. (Reserved by
  name; registration is a later slice.)
- Mutate artifacts.
- Add GitHub API calls.
- Bump versions. Publish to npm.

The shipped artefacts are: this memo, a docs
test, a review packet, and supporting-doc
cross-references.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 1 | **Watcher / path freshness policy decision memo (this memo)** | ✅ **Shipped** |
| 2 | [Beta release readiness checklist memo](beta-release-readiness-checklist.md) | ✅ **Shipped** (third beta blocker) |
| 3 | Beta release candidate execution plan | Next slice — executes checklist on release SHA |
| 4 | Path freshness artefact slice (post-beta) | **Selected as the next slice** by the [Post-Beta Dogfood Evidence Triage Decision](post-beta-dogfood-evidence-triage.md) (Option C). Adds `PathFreshnessReport` registration + source-state fingerprint helper + `rekon paths freshness` (or equivalent) CLI. **No daemon. No background refresh. No source writes.** Publication-surface updates land in a separate follow-on slice. |
| 5 | Watcher daemon design memo (post-beta) | Pins daemon lifecycle + permission contract + cross-platform strategy + opt-in default |
| 6 | Watcher daemon implementation slice (post-beta) | Adds `rekon watch` (or equivalent) — opt-in default |
| 7 | Watcher / path freshness safety review slice (post-beta) | Walks the full path-freshness + watcher path end-to-end and declares it beta-stable |

The next two slices (steps 2 + the beta release
execution) are the remaining beta-blocker work.
Steps 4–7 are the watcher / path-freshness
roadmap; they live post-beta unless real-world
adoption signals demand they accelerate.

**Policy diagnostic table:**

| Policy Area | Decision |
| --- | --- |
| Beta watcher daemon | not required |
| Background refresh | not allowed by default |
| Refresh command | explicit operator action |
| Source edits | require refresh before trusting artifacts |
| Path freshness evidence | content/hash/git state preferred |
| File mtimes | advisory only |
| Future artifact | PathFreshnessReport reserved |
| Agent guidance | recommend refresh after edits |

**Option diagnostic table:**

| Option | Decision | Notes |
| --- | --- | --- |
| manual refresh only | insufficient alone | lacks explicit policy |
| full watcher daemon | post-beta | too much lifecycle complexity |
| watcher-lite / path policy | selected | beta policy without daemon |
| opt-in daemon | future experimental | requires separate safety review |

**Risk diagnostic table:**

| Risk | Guardrail |
| --- | --- |
| stale source context | refresh-after-edit policy |
| hidden artifact mutation | no background writes |
| mtime unreliability | prefer content hashes/git state |
| agent stale inference | agent contract refresh instruction |
| daemon lifecycle complexity | watcher deferred |

**The next slice is the beta release readiness
checklist memo.** It is the third (and final)
of the three beta blockers identified by the
[beta readiness review](beta-readiness-classic-parity-review.md);
the watcher / path-freshness implementation
itself stays post-beta until the release
checklist + execution land.
