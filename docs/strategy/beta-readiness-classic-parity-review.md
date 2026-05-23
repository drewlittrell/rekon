# Beta Readiness / Remaining Classic-Parity Review

## Decision Summary

**Rekon is beta-close but not beta-ready.** The
verification + GitHub review-surface arc is
beta-stable (per the step 10
[trust-boundary safety review](verification-github-trust-boundary-safety-review.md)),
the issue-governance loop landed with
adjudication + merge decisions + freshness
guardrails, filtering is graph-aware and
filter-health-aware, and the publications +
agent-contract surfaces are operator-facing.

Three policy gaps remain before public beta:

1. **Source-write reconciliation policy** — Rekon
   has `ReconciliationPlan` artifacts and
   `resolve.issue` but no pinned answer on
   whether (and how) beta supports applying
   changes to source. Operators today get a
   preview only; the apply path is undecided.
2. **Watcher / path freshness policy** — local
   artifacts can become stale when sources
   change. The behaviour is documented in
   concept docs but the operator-facing policy
   (when to refresh, when to refuse stale
   artifacts, how to surface staleness in CI) is
   not pinned.
3. **Packaging / release readiness checklist** —
   public beta requires a pinned set of
   packaging, versioning, install, smoke,
   documentation, and operator-onboarding
   constraints. The pieces exist
   (`scripts/audit-package-exports.mjs`,
   `scripts/install-smoke.mjs`,
   `scripts/install-tarball-smoke.mjs`, the
   bundled workflow templates) but no single
   checklist memo pins them.

None of the three is a code-level blocker — each
is a **policy decision** that the next slices
need to make. The recommended ordering is in
"Follow-Up Work" below; the first is the
**Source-write reconciliation policy decision
memo**.

**Beta readiness is not the same as full classic
parity.** Several classic capabilities (the
monolithic `GraphOntologyValidator`, the
watcher daemon, hosted GitHub App, deeper rule
catalog) are explicit post-beta work — they were
deferred by design in the
[capability model](capability-model.md) and the
[verification-runner v1 decision](verification-runner-v1-decision.md).

**Rekon should not add more GitHub review
surfaces before beta.** The step 8 parity
review already declared the GitHub review
surface beta-complete; the step 9 hardening +
step 10 safety review confirmed it beta-stable.
Adding hosted-App / GitHub-App flows or
additional Check / PR-comment variations here
would chase product surface that doesn't help
ship beta — and would compound the trust-boundary
review burden.

**The remaining pre-beta work is policy /
guardrail oriented, not another major
review-surface expansion.** Each blocker is a
decision memo + a small implementation slice + a
safety review, not a multi-batch surface build.

## Why This Review Exists

Steps 1–10 built and hardened the verification +
GitHub review surface end-to-end:

1. Verification runner v1 (verify run --dry-run /
   --execute / result from-run).
2. CI / GitHub adapter decision (read-only
   templates first).
3. GitHub Actions workflow templates (read-only
   dry-run / execute + opt-in Check + opt-in PR
   comment).
4. GitHub workflow safety validator (three
   profiles).
5. GitHub Check publisher (decision, dry-run,
   send, opt-in template, safety review).
6. PR comment publisher (decision, dry-run, API
   gate, workflow profile, writer go/no-go,
   writer, safety review).
7. GitHub review surfaces parity review
   (beta-complete as opt-in).
8. Trust-boundary hardening (six fixes:
   proof-chain coherence, bounded streaming
   capture, POSIX process-tree timeout,
   NODE_OPTIONS removal, bounded GitHub API
   error reads, PR head SHA safety).
9. Trust-boundary safety review (beta-stable).

The next decision is **not** "what new GitHub
surface ships next?" It is "is Rekon ready for
public beta as a whole, and if not, what
specifically remains?" This review answers that.

The review is purely strategy: no runtime
behaviour, no API changes, no schema changes. It
identifies the remaining blockers and classifies
the rest as post-beta so the team can focus the
next few slices instead of fanning out across
surfaces.

## Current Rekon Product Loop

Rekon's product loop today, as shipped:

```
observe
  → snapshot refresh (rekon refresh)
  → evidence graph + finding detection (rule packs)

evaluate
  → finding filters (rule + path + suppression)
  → filter health + filter-policy suggestions
  → graph-aware filtering (false-positive
    reduction via EvidenceGraph attribution)

adjudicate
  → IssueAdjudicationReport (deterministic exact
    grouping + cross-rule merge hints)
  → operator-confirmed merge decisions
    (governance state stays explicit; no
    automatic merge approval)

plan
  → CoherencyDelta (remediation queue)
  → WorkOrder + ReconciliationPlan (resolver
    packets, resolve.issue)
  → VerificationPlan (test commands to verify
    a fix)

verify
  → verify run --execute (runner; bounded
    stdout/stderr capture; POSIX process-tree
    timeout; scrubbed env without NODE_OPTIONS)
  → VerificationRun (execution artifact;
    redacted excerpts; full-stream digests)
  → verify result from-run (deterministic
    derivation cited by header.inputRefs)
  → VerificationResult (proof summary)

publish
  → proof-report Publication (canonical-truth
    surface for operators)
  → architecture-summary Publication
    (system-level governance + freshness
    state)
  → agent-contract Publication (operating
    contract for agents working on the repo)

review
  → local: artifacts validate + job summary
    markdown + uploaded `.rekon/artifacts`
  → GitHub (opt-in): GitHub Check (status
    chip) + PR comment (narrative timeline)
  → operator can navigate from any review
    surface back to the canonical artifacts
    by id
```

Every stage produces canonical artifacts;
downstream surfaces (Check Run, PR comment, job
summary) are renderings. Rekon artifacts remain
canonical truth.

**What the loop currently does NOT do:**

- It does **not** apply fixes to source files.
  `resolve.issue` produces a `ReconciliationPlan`
  but the apply path is undecided.
- It does **not** watch source files. Artifacts
  become stale silently when source changes;
  freshness is surfaced in publications but the
  recovery policy is unclear.
- It does **not** ship a hosted GitHub App. The
  opt-in workflow templates are the only GitHub
  integration.
- It does **not** ship deeper rule-catalog
  breadth. The shipped detectors are sufficient
  for the alpha guarantee surfaces; broader
  catalog work is post-beta.

## Classic Goals Reviewed

`codebase-intel-classic` helped users
**understand**, **govern**, **fix**, **verify**,
and **communicate** codebase intelligence. The
question this review answers is whether Rekon's
shipped subsystems support those goals well
enough to call it beta:

- **Understand.** Snapshot refresh +
  EvidenceGraph + finding detection +
  publications (proof report, architecture
  summary, agent contract) produce the
  user-facing understanding surfaces.
  **Beta-ready.**
- **Govern.** Filter policy + filter health +
  IssueAdjudicationReport + CoherencyDelta +
  merge decisions + remediation queue produce
  the governance surfaces. Operator-confirmed
  decisions stay explicit; no automatic merge
  approval. **Beta-ready.**
- **Fix.** `resolve.issue` produces a
  `ReconciliationPlan` + a `ResolverPacket`.
  The plan is **preview-only** today — applying
  it to source remains undecided. **Beta
  blocker.**
- **Verify.** Verification runner +
  VerificationPlan / VerificationRun /
  VerificationResult + proof surfaces v2 +
  trust-boundary hardening. **Beta-ready.**
- **Communicate.** Local publications + GitHub
  review surfaces (Check + PR comment) +
  uploaded artifacts + job summary. **Beta-
  ready.**

The classic goals map cleanly onto Rekon's
subsystems with one outright blocker (Fix /
source-write) and two policy gaps (freshness +
release readiness) that are not subsystem
absences but operator-facing decisions that
beta needs pinned.

## Subsystem Readiness Matrix

| Subsystem | Current Status | Beta Decision | Notes |
| --- | --- | --- | --- |
| Verification runner | strong | beta-ready | local execution + proof summary + surfaces; trust-boundary hardened |
| GitHub review surfaces | strong | beta-ready | Checks + PR comments opt-in; parity reviewed; hardened |
| Finding filters | strong | beta-ready | filter-health + policy surfaces; deterministic rules |
| Graph-aware filtering | strong | beta-ready | alpha-complete fixtures + EvidenceGraph attribution |
| Issue governance | strong | beta-ready | adjudication + merge decisions + freshness; CoherencyDelta is group-aware |
| Resolver packets / resolve.issue | strong | beta-ready | preview-only; produces ReconciliationPlan + ResolverPacket |
| Publications / agent contract | strong | beta-ready | proof-report + architecture-summary + agent-contract Publications shipped |
| Memory selection / curation | strong | beta-ready | usage ledger + curation surfaces; promotion / supersession deferred post-beta |
| Local artifact validation / freshness | partial | beta-ready (read-only) | freshness surfaced in publications; live invalidation deferred (see watcher blocker) |
| Snapshot refresh / observe loop | strong | beta-ready | rekon refresh + EvidenceGraph + rule-pack detection |
| Source-write reconciliation | incomplete | **beta blocker** | apply policy / preview / confirmation / rollback not pinned |
| Watcher / path freshness | incomplete | **beta blocker** | live invalidation + staleness recovery not pinned |
| Packaging / release readiness | incomplete | **beta blocker** | release checklist not pinned (packaging, versioning, install, smoke, docs) |

**Strong / beta-ready** rows are not perfect —
each has post-beta polish items. They are
**enough** to ship beta because their core
classic-goal mapping is complete and contract-
tested.

## Beta-Ready Areas

The following subsystems are **strong enough for
beta as shipped**:

- **Verification runner + proof surfaces.** The
  step 9 hardening + step 10 safety review
  collectively pin proof-chain coherence,
  bounded streaming, POSIX process-tree kill,
  NODE_OPTIONS removal, bounded GitHub API
  errors, and PR head SHA safety. Verification
  is artifact-backed, redaction-aware,
  freshness-aware.
- **GitHub review surfaces.** The step 8 parity
  review declared the combined surface
  beta-complete; opt-in templates remain the
  default, with read-only as the alpha entry
  point. No more GitHub surfaces should ship
  before beta.
- **Finding filters + filter health + filter
  policy.** Deterministic rule + path +
  suppression filters; filter-health alerts
  (high-filter-rate, low-confidence-filtered);
  filter policy suggestions are operator-
  reviewable.
- **Graph-aware filtering.** Alpha-complete
  fixtures + EvidenceGraph attribution +
  cross-rule signal correlation.
- **Issue governance.** Deterministic exact
  grouping + cross-rule merge hints +
  operator-confirmed merge decisions +
  CoherencyDelta group-aware +
  remediation-queue surfaces +
  freshness-aware adjudication + agent
  operating contract.
- **Resolver packets.** `resolve.issue`
  produces `ResolverPacket` +
  `ReconciliationPlan`. The plan is
  preview-only (a fix proposal); operators
  decide whether to apply it. This is
  beta-ready as long as the apply policy is
  pinned (see blocker below).
- **Publications.** Proof-report +
  architecture-summary + agent-contract
  Publications; refresh chain is documented.
- **Memory.** Selection + curation surfaces
  exist; promotion / supersession is more
  polish than blocker.
- **Snapshot refresh / observe loop.**
  `rekon refresh` runs the observation +
  EvidenceGraph + finding-detection chain;
  is freshness-tracked in the publications.

These subsystems do not need further work
before beta. Polish slices (richer rule
catalog, memory promotion semantics, etc.)
are post-beta.

## Beta Blockers

Three blockers — each a policy decision that
beta requires pinned, not a missing
implementation:

| Blocker | Why It Blocks Beta | Recommended Next Slice |
| --- | --- | --- |
| Source-write reconciliation policy | users need clear boundary for applying changes | ✅ resolved by [Source-write reconciliation policy decision memo](source-write-reconciliation-policy-decision.md) (Option C — beta pins policy + preview requirements; apply deferred post-beta) |
| Watcher/path freshness policy | beta users need to know how stale local artifacts behave after file changes | ✅ resolved by [Watcher / path freshness policy decision memo](watcher-path-freshness-policy-decision.md) (Option C — watcher-lite / path freshness policy for beta; no daemon by default; `rekon refresh` remains explicit; `PathFreshnessReport` reserved; agent contract instructs refresh after edits) |
| Release readiness checklist | public beta needs packaging/version/docs constraints pinned | ✅ resolved by [Beta release readiness checklist memo](beta-release-readiness-checklist.md) (mandatory verification commands + CLI smoke matrix + known limitations + release stop conditions pinned; beta-ready is a checklist state, not an npm publish event). Checklist executed against `main` SHA `54d1dfd` by the [Beta release candidate execution plan](beta-release-candidate-execution-plan.md); all mandatory verification passed; recommended beta version `0.1.0-beta.0`. Version `0.1.0-beta.0` then applied coherently across root + 20 workspace packages + lockfile by the [Beta version bump execution report](beta-version-bump-execution-report.md); mandatory verification + CLI smoke matrix re-run on the bumped tree. |

**Why these are blockers, not polish:**

- A beta user who runs Rekon will reasonably
  ask "can I apply the fix it proposed?"
  Without a pinned policy, the answer drifts
  per-operator. Beta needs **one** answer (even
  if the answer is "no, beta is preview-only").
- A beta user who edits source after running
  Rekon will reasonably expect artifacts to
  reflect the change. Without a pinned policy,
  the loop silently produces stale reviews.
  Beta needs **one** policy on when to refresh,
  when to refuse stale artifacts, and how to
  surface staleness in CI.
- A public beta launch needs a checklist for
  what counts as "shippable" (versioning,
  npm publish, install / install-tarball
  smokes, doc completeness, governance memo
  alignment). The pieces are in `scripts/`
  + the existing docs; the checklist
  consolidates + pins them.

Each blocker is a **decision memo + small
implementation slice + safety review** triple,
on the same staged shape as the GitHub Check /
PR comment publishers. None requires another
multi-batch surface build.

## Post-Beta Work

| Area | Why Post-Beta |
| --- | --- |
| Hosted GitHub App | larger product surface; not necessary for opt-in template-based adoption |
| deeper rule catalog | ongoing breadth work; alpha fixtures already cover the canonical guarantees |
| memory promotion/supersession | maturity work; current selection + curation is sufficient for beta review surfaces |
| Windows process-tree kill | platform polish; POSIX is the reference platform for the bundled GitHub Actions templates |
| PR comment refinements | review-surface polish; the safety review approved current behaviour for beta |
| source-write automation beyond explicit gated policy | requires the blocker policy to land first; automation can layer on |

These are explicitly **not blockers**. Each is
either:

- a surface expansion Rekon should ship after
  beta validates the current model, or
- a maturity refinement that can layer on top
  of beta without breaking the contract.

The post-beta classification is informed by
the [classic-guarantees-audit](classic-guarantees-audit.md)
+ [classic-alignment-map](classic-alignment-map.md):
Rekon does not need full classic parity to
ship beta; it needs beta-level support for the
classic goals.

## Source-Write Reconciliation Gap

`resolve.issue` produces `ResolverPacket` +
`ReconciliationPlan`. The plan is
preview-only — it lists the changes Rekon
proposes; nothing is written to source files.
This is intentional ("no agent-autonomous
source writes" is one of Rekon's
[capability-model](capability-model.md)
invariants), but the **apply path** is not
pinned:

- **What does beta support?** Apply with
  operator confirmation? Apply via a Rekon
  CLI subcommand? Apply via a GitHub
  workflow? Apply via a hosted service?
  None today.
- **What gates the apply?** Explicit operator
  confirmation? Re-verification before
  writing? Re-verification after writing?
  Rollback strategy on partial failure?
- **What's the artifact trail?** A
  `ReconciliationLog` (already a schema)?
  A new artifact? An additive field on
  `ReconciliationPlan`?

The right framing is the same as the GitHub
Check publisher path: **decision memo →
preview-only CLI surface → API decision gate →
implementation → safety review**. The first
slice (decision memo) is the next
implementation work after this review.

**Required beta-ready guarantee** the apply
slices must preserve:

- **Apply is opt-in and operator-confirmed.**
- **No agent-autonomous source writes.**
- **Verification before AND after apply.**
- **Atomic apply with rollback.**
- **An artifact trail (ReconciliationLog or
  equivalent).**

The decision memo + preview-only CLI surface
should land **before** beta. Apply
implementation may land in a post-beta
follow-up slice as long as the policy is
pinned.

## Watcher And Path Freshness Gap

Rekon today refreshes on explicit `rekon
refresh` invocations. When operators edit
source between refreshes, artifacts go stale
silently. Concept docs document this
[verification-runs](../concepts/verification-runs.md),
[proof-report-publication](../concepts/proof-report-publication.md),
[memory](../concepts/memory.md), and the
publications surface a freshness warning when
they detect stale inputs. But:

- **There is no live invalidation.** A
  workflow run that uses cached artifacts
  cannot distinguish "fresh enough" from
  "fresh-as-of-three-edits-ago".
- **There is no operator-facing recovery
  policy.** Beta users who see a freshness
  warning should know exactly what to do
  (run `rekon refresh`? abort the workflow?
  ignore?).
- **There is no CI-facing refusal policy.**
  Should the GitHub Check publisher fail-stop
  on stale proof? It currently emits
  `action_required` but operators may
  reasonably want to override.

The decision memo for this blocker should
answer:

1. Does beta require live file watching?
   (Recommended: no; watcher is post-beta.)
2. What is the staleness policy?
   (Recommended: explicit refresh + visible
   freshness in publications + an
   operator-facing `rekon artifacts freshness`
   surface.)
3. What is the CI policy?
   (Recommended: Check / PR comment publishers
   report `action_required` on stale chain
   but do not refuse; operators decide.)

**Required beta-ready guarantees** the
freshness policy must preserve:

- **Freshness is visible everywhere it
  matters.**
- **Stale artifacts never present as fresh.**
- **Operators have an explicit refresh
  command and explicit refusal options.**
- **No silent re-derivation behind operator's
  back.**

## Packaging And Release Readiness Gap

Beta needs a single pinned checklist. The
pieces exist:

- `scripts/audit-package-exports.mjs` —
  verifies every workspace package's
  `exports` map.
- `scripts/audit-license.mjs` — verifies
  root + per-package Apache-2.0.
- `scripts/publish-dry-run.mjs` — verifies
  `npm pack` succeeds for every package.
- `scripts/install-smoke.mjs` — verifies a
  fresh consumer can install from build.
- `scripts/install-tarball-smoke.mjs` —
  verifies install from `npm pack` tarballs.
- bundled workflow templates + validator
  profiles.
- docs site: concept docs, artifact docs,
  strategy memos.

What's **not pinned** is the operator-facing
**release checklist**:

- Required version bump policy (`0.1.0-alpha.1`
  → `0.1.0-beta.1` semantics).
- Required smoke set for a release.
- Required doc completeness (every shipped
  capability has a concept doc + an artifact
  doc + a strategy memo).
- Required CHANGELOG discipline.
- Required GitHub release / npm publish
  ordering.

The decision memo + checklist should land
**before** beta. The actual release execution
(running the checklist, cutting a tag,
publishing) is the implementation slice that
follows.

## Remaining Classic-Parity Delta

What Rekon doesn't have (and **doesn't need
for beta**), classified honestly:

- **`GraphOntologyValidator` (monolithic).**
  Replaced by deterministic v1 filters + the
  graph-aware filtering. Future capability or
  rule pack, not core.
- **Watcher daemon.** Deferred (see blocker);
  beta will explicitly state "no watcher in
  v1".
- **Hosted product / GitHub App.** Out of
  scope for beta; opt-in templates are the
  integration.
- **Source-write automation.** Deferred (see
  blocker); beta will pin a preview-only or
  explicit-confirm policy.
- **Memory promotion / supersession.** Polish;
  current selection + curation is enough.
- **Deeper rule catalog.** Polish; alpha
  fixtures cover the canonical guarantees.
- **Cross-CI documentation** (GitLab, Jenkins,
  CircleCI). Post-beta; the CLI surface is
  identical, only YAML differs.

The Rekon-classic delta is honest about what's
deferred. **Beta is not classic parity; it is
classic-goal parity with Rekon-native
architecture.**

## Recommendation

**Rekon is beta-close but not beta-ready.**

Three policy decisions remain before public
beta — none are missing implementations, all
are decisions the operator-facing contract
needs pinned:

1. **Source-write reconciliation policy
   decision memo** (next slice).
2. **Watcher / path freshness policy decision
   memo** (follows).
3. **Beta release readiness checklist** (last
   before tag).

After those three policy slices land + any
small implementation slices they require, the
beta release execution is straightforward:

- Run the existing audits + smokes.
- Bump version (`0.1.0-beta.1`).
- Update README + CHANGELOG.
- Cut a GitHub release.
- (Optionally) publish to npm.

**Rekon should not add more GitHub review
surfaces before beta.** The combined Check + PR
comment + workflow + validator + publications
surface is already declared beta-complete
(step 8) and beta-stable (step 10). Additional
surfaces would compound trust-boundary review
cost without addressing the remaining policy
gaps.

**The remaining pre-beta work is policy /
guardrail oriented, not another major
review-surface expansion.** Each blocker is a
decision memo + small implementation +
safety review, on the same staged shape used
throughout the GitHub adapter sequence.

**Beta readiness is not the same as full
classic parity.** Several classic capabilities
are explicit post-beta work — they were
deferred by design and should stay deferred
until beta validates the current model.

## Follow-Up Work

In recommended order:

1. **Source-write reconciliation policy
   decision memo (next slice).** Pin whether
   beta supports source-write apply at all;
   if yes, pin: preview / diff first,
   explicit operator confirmation,
   verification before AND after, rollback
   strategy, no agent-autonomous source
   writes. Includes the
   `ReconciliationPlan` apply gate, the
   `ReconciliationLog` artifact policy, and
   the CLI surface (preview-only by default).
2. **Watcher / path freshness policy
   decision memo (after).** Pin the
   staleness contract: visible freshness in
   publications, explicit `rekon refresh`
   command, no live watcher in v1, CI
   `action_required` on stale chain without
   hard refusal.
3. **Beta release readiness checklist
   (after).** Pin the operator-facing
   release contract: version bump policy,
   required smoke set, doc completeness,
   CHANGELOG discipline, release ordering.
4. **Beta release execution (final).** Run
   the checklist; bump to `0.1.0-beta.1`;
   cut tag; (optionally) publish to npm.
5. **Post-beta work** (parallel or after
   beta tag, in approximate priority):
   - hosted GitHub App,
   - deeper rule catalog expansion,
   - richer memory promotion / supersession,
   - PR comment refinements (bounded retry,
     same-repo `pull_request` guard),
   - Windows process-tree kill (Job Objects),
   - source-write automation beyond explicit
     gated policy.

**The next slice is the Source-write
reconciliation policy decision memo.** It is
the first of the three beta blockers
identified above and the natural continuation
of the work the verification + GitHub review-
surface arc set up.
