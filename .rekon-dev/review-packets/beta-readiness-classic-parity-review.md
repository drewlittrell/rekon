# Review Packet — Beta Readiness / Remaining Classic-Parity Review (P1.1 slice)

**Slice:** `beta-readiness-classic-parity-review`
**Sequence position:** First beta-readiness review,
following the completed CI / GitHub adapter sequence
(step 10 — trust-boundary safety review).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template change, no validator profile
change, no GitHub API call.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/beta-readiness-classic-parity-review.md`](../../docs/strategy/beta-readiness-classic-parity-review.md).
   Steps back from the completed verification + GitHub
   review-surface arc and assesses the remaining delta to
   beta. Reviews 15 subsystems against codebase-intel's
   classic goals (understand, govern, fix, verify,
   communicate) and identifies three beta blockers, each
   a policy decision rather than a missing implementation:
   - Source-write reconciliation policy.
   - Watcher / path freshness policy.
   - Beta release readiness checklist.
   Contains the subsystem readiness matrix, the beta
   blocker table, and the post-beta table required by the
   work order.
2. **New docs test** at
   `tests/docs/beta-readiness-classic-parity-review.test.mjs`
   pinning the 19 required assertions (memo existence, all
   15 required headings, beta-close-but-not-beta-ready
   language, beta-readiness-is-not-full-classic-parity
   statement, no-more-GitHub-surfaces statement,
   policy-guardrail-oriented statement, three identified
   blockers, five subsystems explicitly marked beta-ready,
   subsystem matrix, beta blocker table, post-beta table,
   CHANGELOG mention, review-packet PURPOSE PRESERVATION
   CHECK).
3. **Cross-doc updates:**
   - [`docs/strategy/github-review-surfaces-parity-review.md`](../../docs/strategy/github-review-surfaces-parity-review.md)
     adds the beta-readiness pointer.
   - [`docs/strategy/verification-github-trust-boundary-safety-review.md`](../../docs/strategy/verification-github-trust-boundary-safety-review.md)
     adds the beta-readiness pointer.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     adds step 61 (beta readiness review shipped).
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the beta readiness review
     + points to the source-write reconciliation policy
     decision memo as the next slice.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
   - [`docs/strategy/classic-guarantees-audit.md`](../../docs/strategy/classic-guarantees-audit.md)
     adds the beta-readiness review pointer.
   - [`docs/strategy/classic-alignment-map.md`](../../docs/strategy/classic-alignment-map.md)
     adds the beta-readiness review pointer.
   - [`docs/concepts/verification-runs.md`](../../docs/concepts/verification-runs.md),
     [`docs/concepts/proof-report-publication.md`](../../docs/concepts/proof-report-publication.md),
     [`docs/concepts/issue-adjudication.md`](../../docs/concepts/issue-adjudication.md),
     [`docs/concepts/finding-filters.md`](../../docs/concepts/finding-filters.md),
     [`docs/concepts/graph-aware-finding-filters.md`](../../docs/concepts/graph-aware-finding-filters.md),
     [`docs/concepts/memory.md`](../../docs/concepts/memory.md)
     add the safety review to their Cross-References /
     pointer sections (where applicable).
4. **README + CHANGELOG entries.**

All 14 listed docs in the work order exist in the
repository; none were skipped. The verification step
that confirmed this is documented in the
implementation notes (no missing-doc entry needed).

## PUBLIC API CHANGES

- **None.** This is a strategy / docs / tests batch.
- No new exports from `@rekon/capability-docs`,
  `@rekon/capability-verify`, `@rekon/sdk`,
  `@rekon/runtime`, or any other package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue code.
- No new workflow template.
- No new artifact type.
- No new capability package.
- No new role / permission.

## PURPOSE PRESERVATION CHECK

The review is informational; it preserves every existing
invariant:

- **Verification runner v1 purpose.** Unchanged.
- **VerificationPlan / VerificationRun /
  VerificationResult schemas.** Unchanged. The memo
  reviews them but does not change them.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **GitHub Check publisher (helpers, CLI, workflow,
  validator).** Unchanged.
- **PR comment publisher (helpers, CLI, workflow,
  validator).** Unchanged.
- **All four workflow templates.** Unchanged.
- **All three validator profiles.** Unchanged.
- **Canonical-truth invariant.** Reinforced. The memo
  pages forward `GitHub status and comments are not
  canonical truth; Rekon artifacts remain canonical.`
- **Marker-not-proof invariant.** Unchanged.
- **Fork-safety invariant.** Unchanged.
- **No-auto-resolution invariant.** Unchanged. The
  source-write reconciliation gap section explicitly
  states `No agent-autonomous source writes.`
- **No-token-leak invariant.** Unchanged.
- **No new policy decisions reached in this batch.**
  The memo identifies what needs deciding; the next
  three slices (source-write policy, watcher policy,
  release readiness checklist) are where the decisions
  land.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability map preserved.** The memo
  reviews Rekon's subsystems against codebase-intel
  classic's user-facing goals (understand, govern,
  fix, verify, communicate) without claiming full
  classic parity.
- **Classic anti-patterns avoided.** The memo
  identifies the absence of:
  - `GraphOntologyValidator` (monolithic) → replaced
    by deterministic + graph-aware filtering.
  - Watcher daemon → deferred to a pinned policy
    decision (not "later-let's-see").
  - Hosted GitHub App / source-write automation →
    explicit post-beta classifications, not silent
    omissions.
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## SUBSYSTEMS REVIEWED

Fifteen subsystems, mapped against the codebase-intel
classic loop:

1. Observe / project / snapshot refresh loop.
2. Finding detection / rule-pack coverage.
3. Finding filters / filter-health / filter policies.
4. Graph-aware filtering.
5. Issue lifecycle / issue adjudication / merge
   decisions.
6. CoherencyDelta / remediation queue.
7. WorkOrder / ReconciliationPlan / VerificationPlan.
8. Verification runner / VerificationRun /
   VerificationResult.
9. Proof surfaces / architecture summary / agent
   contract.
10. GitHub review surfaces.
11. Memory selection / memory curation.
12. Resolver packets / resolve.issue / resolve.route /
    resolve.preflight.
13. Source-write / reconciliation apply path.
14. Watcher / path freshness / live invalidation.
15. Packaging / install / publish readiness.

Each is classified in the subsystem readiness matrix
inside the memo as `beta-ready`, `beta blocker`, or
implicitly `post-beta` (via the post-beta table). The
review pages forward the existing safety reviews + the
existing concept docs for each beta-ready row.

## BETA READINESS DECISION

**Beta-close but not beta-ready.** The combined
verification + GitHub review-surface arc is beta-stable
(per step 10), the issue-governance loop is mature, and
filtering / publications / memory / resolver packets are
beta-ready. Three policy gaps remain:

1. **Source-write reconciliation policy.** The
   `ReconciliationPlan` is preview-only; the apply
   path is undecided.
2. **Watcher / path freshness policy.** Artifacts go
   stale silently between `rekon refresh` calls; the
   operator-facing freshness contract is not pinned.
3. **Beta release readiness checklist.** The
   audit / smoke scripts exist; the consolidated
   release checklist memo does not.

Each blocker is a **policy decision**, not a missing
implementation. The next three implementation slices
should be decision memos (+ small implementation
follow-ons), in the order listed above.

**Beta readiness is not the same as full classic
parity.** Several classic capabilities are explicitly
post-beta work; they were deferred by design.

**Rekon should not add more GitHub review surfaces
before beta.** The combined surface is beta-complete
(step 8) and beta-stable (step 10); additional surfaces
would compound trust-boundary cost without addressing
the remaining policy gaps.

**The remaining pre-beta work is policy / guardrail
oriented, not another major review-surface expansion.**

## BETA BLOCKERS

Three policy decisions block public beta:

| Blocker | Why It Blocks Beta | Recommended Next Slice |
| --- | --- | --- |
| Source-write reconciliation policy | users need clear boundary for applying changes | Source-write reconciliation policy decision memo |
| Watcher/path freshness policy | beta users need to know how stale local artifacts behave after file changes | Watcher/path freshness decision memo |
| Release readiness checklist | public beta needs packaging/version/docs constraints pinned | Beta release readiness checklist |

The required beta-ready guarantees the source-write
policy must preserve (per the memo):

- Apply is opt-in and operator-confirmed.
- No agent-autonomous source writes.
- Verification before AND after apply.
- Atomic apply with rollback.
- An artifact trail (ReconciliationLog or equivalent).

The required beta-ready guarantees the freshness
policy must preserve:

- Freshness is visible everywhere it matters.
- Stale artifacts never present as fresh.
- Operators have an explicit refresh command and
  explicit refusal options.
- No silent re-derivation behind the operator's back.

## POST-BETA WORK

Explicitly **not** blockers; each is a surface
expansion or maturity refinement that can ship after
beta:

| Area | Why Post-Beta |
| --- | --- |
| Hosted GitHub App | larger product surface |
| deeper rule catalog | ongoing breadth work |
| memory promotion/supersession | maturity work |
| Windows process-tree kill | platform polish |
| PR comment refinements | review-surface polish |
| source-write automation beyond explicit gated policy | requires the blocker policy to land first |

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/beta-readiness-classic-parity-review.test.mjs`
  — 19 assertions, all passing.
- **Existing suites still passing:** every prior
  contract / docs suite. Full suite expected ≥ 1587
  passed / 1 skipped (1568 prior + 19 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke, install-tarball-smoke
  — all expected to pass unchanged.
- **No CLI smoke required.** Strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged.
- `packages/capability-verify/src/index.ts` —
  unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- All existing contract tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: review memo drifts from product reality
  before the three blocker decisions land.** Mitigated
  by the docs test pinning the memo's key statements
  (beta-close-not-ready, no-more-GitHub-surfaces,
  policy-guardrail-oriented, three blockers, five
  beta-ready subsystems).
- **Risk: post-beta classification gets re-litigated
  during blocker slices.** Mitigated by the post-beta
  table — each post-beta item has a "why post-beta"
  reason pinned; the blocker slices can build on top
  without re-classifying.
- **Risk: beta release execution drifts from the
  checklist.** Mitigated by the release readiness
  checklist blocker — that slice will produce the
  consolidated checklist memo + a docs test that pins
  it.
- **Follow-up — Source-write reconciliation policy
  decision memo (next slice).** First of the three
  beta-blocker policy slices.
- **Follow-up — Watcher / path freshness policy
  decision memo (after).** Second blocker.
- **Follow-up — Beta release readiness checklist
  (after).** Third blocker. After this, beta release
  execution.

## NEXT STEP

**Source-write reconciliation policy decision memo.**

Pin whether beta supports source-write apply at all,
and if so:

- preview / diff first;
- explicit operator confirmation;
- verification before AND after;
- rollback strategy;
- no agent-autonomous source writes;
- artifact trail (`ReconciliationLog` or equivalent).

This is the first of the three beta blockers
identified by this review.
