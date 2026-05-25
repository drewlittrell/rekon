# Post-Beta Dogfood Evidence Triage Decision

**Status:** shipped (decision memo).
**Owner:** Rekon release / strategy.
**Scope:** review the real-repo cohort findings
plus the first post-beta polish slice
(VerificationPlan missing-script tolerance) and
**decide whether to continue dogfood-surfaced
verification polish or pivot to a larger
post-beta track.** This memo is
strategy / docs / tests only. **It does not
implement runtime behaviour, does not change
any package version, does not publish to npm,
and does not pre-authorise any later
implementation.**

## Decision Summary

**Next track: Option C — Watcher / path
freshness implementation, starting with the
PathFreshnessReport artifact + source-state
fingerprint skeleton slice.**

The real-repo cohort produced exactly one
verification-classification observation
(`npm | pnpm | yarn run <script>` whose script
is absent should record `skipped`, not
`failed`). That observation has been
addressed by the
[VerificationPlan Missing-Script
Tolerance](verification-missing-script-tolerance.md)
slice already shipped on `cee7af4`. **No
additional dogfood-surfaced verification
classification pattern remains.** Other
honest failures recorded during the cohort
(figma-ds typecheck errors in operator
source) are real defects in the operator's
code — the runner correctly reported them as
`failed`; reclassifying them would weaken
true verification.

With no more dogfood-evidence-driven
verification polish queued, the next slice
becomes a deliberate post-beta-track
pivot. **Path freshness affects every repo
and every artifact surface**, the policy is
already pinned by the
[watcher / path freshness policy
decision](watcher-path-freshness-policy-decision.md),
and the artifact name `PathFreshnessReport`
is already reserved — so the implementation
slice is the natural next guardrail and
does not require a new policy memo
beforehand.

The remaining post-beta tracks
(source-write apply, rule breadth,
memory maturity) are also valuable but
either carry higher risk (source-write
apply) or do not block any beta-user
behaviour (rule breadth, memory maturity).
They remain queued but later in sequence.

## Why This Decision Exists

The work-order for this batch asked one
question explicitly:

> Did the real-repo cohort reveal more
> verification-command classification
> issues?

If yes → ship another small polish slice
before pivoting.
If no → pivot to one of the larger
post-beta tracks.

This memo records the structured "no" plus
the rationale for the chosen pivot.

## Inputs To The Decision

1. The
   [real-repo cohort summary](real-repo-cohort-summary.md)
   (cohort decision:
   `pass-with-known-limitations`; no release
   blockers).
2. The three per-target reports under
   `docs/strategy/real-repo-cohort/`.
3. The
   [VerificationPlan missing-script
   tolerance](verification-missing-script-tolerance.md)
   slice that already shipped the only
   verification-classification follow-up
   the cohort surfaced.
4. The
   [watcher / path freshness policy
   decision](watcher-path-freshness-policy-decision.md)
   (Option C — watcher-lite / path
   freshness policy for beta, recommended
   and adopted).
5. The
   [source-write reconciliation policy
   decision](source-write-reconciliation-policy-decision.md)
   (beta default: no source writes; the
   apply roadmap explicitly post-beta).
6. The [roadmap](roadmap.md) and
   [classic-behaviour
   roadmap](classic-behavior-roadmap.md)
   for sequence context.

## Evidence Classification

The cohort summary's Known Limitations table
is the authoritative starting point. This
memo classifies each entry as **blocker**,
**polish (queued / shipped)**, or **deferred
post-beta track** (governed by an existing
policy memo).

| Cohort observation | Classification | Disposition |
| --- | --- | --- |
| `npm run build` missing on monorepo (structured-evals) | polish — **shipped** | Addressed by missing-script tolerance (`cee7af4`). |
| `npm run test` missing (figma-ds) | polish — **shipped** | Addressed by missing-script tolerance (`cee7af4`). |
| Real TS errors in figma-ds operator source caused typecheck to fail honestly | **not a defect** | The runner is supposed to record real failures as `failed`. Reclassifying would weaken honesty. **No action.** |
| source-write apply unavailable | deferred post-beta track | Pinned by the source-write reconciliation policy memo; remains post-beta. |
| watcher daemon unavailable | deferred post-beta track | Pinned by the watcher / path freshness policy memo; the next slice (chosen here) is the artefact + fingerprint skeleton, not the daemon. |
| hosted GitHub App unavailable | deferred post-beta track | Out of beta scope; no new memo needed for this batch. |
| active workflows not auto-installed | by design | Operator chooses adoption per the workflow template + validator profile work already shipped. |
| GitHub writes opt-in only | by design | Pinned by the GitHub Check and PR-comment publisher decision memos and the trust-boundary safety review. |
| Windows process-tree kill direct-child-only | known | Pinned in `verification-runs.md` + the trust-boundary fix #3; cohort ran on macOS. |
| aggregate freshness historical stale entries | by design | Documented latest-major pattern in the architecture summary publication. |
| host Node engine outside declared range | warning only | Operator concern; `npm ci` warned but completed. No Rekon defect. |
| `pr-comment --dry-run` readiness false without env | by design | Documented in the PR-comment dry-run CLI memo. |
| 0 Rekon-detected findings on three targets | **acceptable** | No false positives is itself a valuable signal; broader cohort expansion would strengthen confidence. **Future cohort expansion**, not a polish slice. |

**Net of classification: no new
verification-classification polish item is
warranted by current dogfood evidence.**

## Options Considered

### Option A — Continue dogfood-surfaced verification polish

Run one more small polish slice if (and only
if) dogfood surfaced another verification
classification pattern that would otherwise
mislead operators.

- **Evidence requirement.** Concrete repo +
  command + actual recorded status vs.
  expected status.
- **Candidate patterns (none observed in
  current cohort):** missing local script
  file referenced by `node <path>`;
  package-manager mismatch (e.g., plan calls
  `npm` but the repo uses `pnpm`-only
  lockfile); absent / wrong lockfile;
  plan-command irrelevant to repo type
  (e.g., `npm run build` on a docs-only
  repo).
- **Risk of speculative broad skipping.**
  Lowering the "failed" bar without
  evidence weakens the trust signal of a
  honest failure. Each skip rule should
  cite a concrete dogfood instance.

**Verdict for this batch: rejected for now —
no further evidence.** Re-open this option
the moment another cohort surfaces a
concrete pattern.

### Option B — Pivot to source-write apply roadmap

Implement the next slice of the source-write
remediation loop: preview → patch artifact
→ explicit confirmation → apply report →
post-apply verification.

- **Pros:** closes the most-requested
  classic-parity gap (reconciliation
  actually applying).
- **Cons:** **highest risk surface in the
  whole roadmap.** The source-write
  reconciliation policy memo explicitly
  defers this to post-beta and pins a
  four-slice roadmap (patch preview →
  permission + rollback design → apply
  implementation → safety review). Doing
  this before more beta-usage evidence
  amplifies blast radius if any safety gap
  remains.
- **Sequence considerations.** Source-write
  apply needs path-freshness signals to be
  trustworthy (you cannot safely apply a
  patch against a stale working tree).
  Path freshness is upstream of source
  writes, not downstream.

**Verdict for this batch: rejected as next
slice.** Re-open after path freshness lands
and after another usage cohort.

### Option C — Pivot to watcher / path freshness implementation (recommended)

Land the post-beta path-freshness artefact
+ source-state fingerprint skeleton. The
watcher / path freshness policy memo
already pins the shape and reserves
`PathFreshnessReport` as the artifact name.

- **Pros:** affects every repo and every
  artifact surface; closes the working-tree
  vs. artifact-lineage freshness gap
  visible in publications today; the policy
  decision is already made (Option C of
  that memo: watcher-lite / path freshness
  policy for beta); no daemon by default,
  no background refresh, no file-system
  event subscription.
- **Cons:** moderately scoped — new
  artifact type + new CLI surface +
  publication updates. Bounded by the
  no-daemon constraint.
- **Sequence considerations.** This is the
  natural next slice listed in the watcher
  policy memo's Implementation Sequence
  (item 3: "Path freshness artefact
  slice"). No new policy memo is required
  before implementation; the safety
  contract is already pinned.

**Verdict for this batch: selected.** Next
slice: PathFreshnessReport artifact +
source-state fingerprint skeleton.

### Option D — Pivot to rule breadth / graph-aware filters

Expand the deterministic rule packs and
graph-aware suppression coverage; improve
filter-health surfaces.

- **Pros:** more findings on more repos
  improves the "show, don't tell" value
  prop.
- **Cons:** breadth can expand
  indefinitely; without a freshness
  guardrail, more findings on a stale
  artifact tree compounds the wrong
  problem. Foundationally, freshness
  precedes breadth.
- **Sequence considerations.** Better
  filters depend on accurate input
  freshness; if surfaces lie about which
  source paths back a finding, more
  findings means more confusion.

**Verdict for this batch: rejected as next
slice.** Re-open after path freshness
lands.

### Option E — Pivot to memory maturity

Add memory promotion, supersession,
staleness tracking, operator curation.

- **Pros:** improves the agent-context
  signal-to-noise ratio over long
  sessions.
- **Cons:** lowest blast radius if
  delayed; memory is a projection, not
  truth (per the architecture rule); fixing
  memory before freshness amplifies stale
  context signals.
- **Sequence considerations.** Same as
  Option D: a fresh, accurate underlying
  graph improves memory derivations; doing
  memory work first means polishing the
  derived layer before the source layer.

**Verdict for this batch: rejected as next
slice.** Re-open after path freshness +
some breadth work land.

## Recommended Next Slice (Spec)

**PathFreshnessReport artifact + source-state
fingerprint skeleton.**

The next implementation slice should:

- Add the `PathFreshnessReport` artifact
  type registration (header shape,
  validators, runtime category map, SDK
  conformance acceptance). **Reserved
  artifact name confirmed:**
  `PathFreshnessReport`.
- Add a pure helper that computes a
  bounded source-state fingerprint for a
  declared path set (e.g., paths cited by
  the active artifact lineage). Initial
  fingerprint algorithm: file size + mtime
  (or a sha256 over a bounded byte cap)
  per path; aggregated as a sorted list.
  **No directory walk beyond the declared
  path set.**
- Add a CLI surface (final name deferred;
  draft: `rekon paths freshness --root
  <path> [--json]`) that writes the
  artifact. **No daemon. No background
  refresh. No file-system event
  subscription. No source writes.**
- **Do not yet surface the artifact in
  publications.** That is a follow-on
  slice (the watcher memo's "future
  surfaces will show working-tree warnings"
  paragraph); landing the publication
  update in the same slice would expand
  scope.

Out of scope for the slice:

- Watcher daemon design or
  implementation (still post-beta;
  separate memo + slices later).
- Source-write apply (still post-beta;
  separate roadmap).
- Auto-refresh on freshness gap (refresh
  remains operator-initiated, full stop).

## What This Memo Does Not Do

- **Does not change runtime behaviour.**
  No package source touched.
- **Does not change package versions.**
  Still `0.1.0-beta.0`.
- **Does not publish to npm.** The no-NPM
  beta posture remains intact; revisiting
  it would require a separate explicit
  operator decision per the no-NPM beta
  distribution policy memo.
- **Does not change the schema.** No
  artifact type added or modified in this
  batch; the next slice will register
  `PathFreshnessReport` but that is a
  separate work order.
- **Does not change the `skipped` status
  semantics** pinned by the missing-script
  tolerance memo. `skipped` continues to
  mean "pre-flight reason to not run this
  command"; `failed` continues to mean
  "the command ran and exited non-zero."
- **Does not add new command-classification
  rules.** Any such rule would require new
  dogfood evidence per Option A above.
- **Does not pre-authorise any later
  implementation.** Each next slice still
  goes through its own work order, its
  own verification gate, and its own
  review packet.
- **Does not claim npm publish readiness.**
- **Does not create a git tag or GitHub
  Release.**
- **Does not add any active workflow
  YAML.**
- **Does not mutate any operator repo.**
  This memo refers to cohort findings via
  the existing per-target reports, which
  themselves used `mktemp -d` copies.

## Pinned Reminders Carried Forward

- **No npm publish during beta.** The
  no-NPM beta distribution policy memo
  pins this; this triage memo does not
  revisit it.
- **No version bump.** Still
  `0.1.0-beta.0`.
- **No schema change in this batch.**
  `skipped` was already wired end-to-end
  before missing-script tolerance shipped;
  the next slice's `PathFreshnessReport`
  registration is a separate work order.
- **No source writes.** The source-write
  reconciliation policy memo pins this
  for beta.
- **No watcher daemon by default.**
  Beta default per the watcher / path
  freshness policy memo: explicit refresh
  only.
- **Beta is private / local /
  repo-based.** Three distinct real
  repositories must be exercised before
  any post-beta npm publish reconsideration
  (already met by the cohort).

## Cross-References

- [Real-repo cohort summary](real-repo-cohort-summary.md)
  — the dogfood evidence base.
- [VerificationPlan Missing-Script
  Tolerance](verification-missing-script-tolerance.md)
  — the polish slice that already
  addressed the only verification-class
  follow-up the cohort surfaced.
- [Watcher / path freshness policy
  decision](watcher-path-freshness-policy-decision.md)
  — pins Option C as policy and reserves
  the `PathFreshnessReport` artifact
  name.
- [Source-write reconciliation policy
  decision](source-write-reconciliation-policy-decision.md)
  — pins source-write apply as post-beta.
- [Additional real-repo dogfood cohort
  plan](additional-real-repo-dogfood-cohort-plan.md)
  — the cohort plan whose execution
  surfaced the evidence triaged here.
- [No-NPM beta distribution
  policy](no-npm-beta-distribution-policy.md)
  — the no-publish posture this memo
  preserves.
- [Roadmap](roadmap.md) and
  [Classic-behaviour
  roadmap](classic-behavior-roadmap.md)
  — sequence context.

## Status

Decision recorded on 2026-05-24. No version
bump. No npm publish. No new workflow YAML.
No runtime behaviour change. Rollback is
trivial: revert this memo and the supporting
doc updates.

## Follow-Up

**Three follow-up slices on this track have
shipped:**

1. [PathFreshnessReport artifact + source-state
   fingerprint skeleton](../artifacts/path-freshness-report.md)
   — `rekon paths freshness` writes one diagnostic
   `PathFreshnessReport` per invocation.
2. **Path freshness publication surfacing** —
   architecture summary, agent contract, and proof
   report now render a `Working Tree Path
   Freshness` section sourced from the latest
   `PathFreshnessReport`. Publishers cite the
   report in `header.inputRefs` when present.
   Publishers remain read-only with respect to the
   report. The agent contract gains a Do-Not-Do
   reminder forbidding agents from treating
   artifact lineage freshness as proof the working
   tree has not changed.
3. **Path freshness GitHub review surfacing** —
   `rekon publish github-check --dry-run`/`--send`
   and `rekon publish pr-comment --dry-run`/`--send`
   now read the latest `PathFreshnessReport` and
   surface it in both the GitHub Check
   `output.summary` and the PR comment body /
   warnings list. Both surfaces cite the report
   in `citedRefs`. **CONCLUSION POLICY: stale
   path freshness is a visible trust warning but
   does not by itself flip the GitHub Check
   conclusion.** Both CLI flows are read-only
   with respect to the report.

Still no daemon. Still no background refresh.

4. **[Path freshness safety review](path-freshness-safety-review.md)** —
   the final slice in the track. Reviews every
   component end-to-end and pins the decision:
   **the path freshness track is beta-private
   stable.** No additional hardening is required
   before moving on. Recommended next slice:
   private beta support playbook.
