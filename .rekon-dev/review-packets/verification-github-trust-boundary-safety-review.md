# Review Packet — Verification / GitHub Trust-Boundary Safety Review (P1.1 slice)

**Slice:** `verification-github-trust-boundary-safety-review`
**Sequence position:** Step 10 of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template change, no validator profile
change, no GitHub API call.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/verification-github-trust-boundary-safety-review.md`](../../docs/strategy/verification-github-trust-boundary-safety-review.md).
   Reviews all six trust-boundary hardening fixes from step
   9 (proof-chain coherence, bounded streaming, POSIX
   process-tree timeout, NODE_OPTIONS removal, bounded
   GitHub error reads, PR head SHA safety) plus the
   affected surfaces (`verify run --execute`,
   `verify result from-run`, both publishers' dry-run +
   send modes, VerificationRun / VerificationResult
   semantics, GitHub Check payloads, PR comment body /
   update path, workflow templates + validator profiles).
   Decision: **beta-stable; no additional GitHub review
   surfaces before beta; remaining work is operational
   polish + documented platform caveats.** Contains the
   hardening table, the risk table, and the beta-decision
   table required by the work order.
2. **New docs test** at
   `tests/docs/verification-github-trust-boundary-safety-review.test.mjs`
   pinning the 18 required assertions (memo existence,
   all 13 required headings, beta-stable language,
   canonical-truth + Rekon-artifacts-canonical phrases,
   chain-coherent statement, bounded streaming reference,
   POSIX process-tree kill reference, Windows
   direct-child-only reference, NODE_OPTIONS removal
   reference, bounded GitHub API error-body reference,
   explicit PR head SHA reference, no-auto-resolve
   language, hardening table, risk table, beta decision
   table, CHANGELOG mention, review packet PURPOSE
   PRESERVATION CHECK).
3. **Cross-doc updates:**
   - [`docs/strategy/github-review-surfaces-parity-review.md`](../../docs/strategy/github-review-surfaces-parity-review.md)
     links to the safety review.
   - [`docs/strategy/verification-runner-v1-decision.md`](../../docs/strategy/verification-runner-v1-decision.md)
     adds the trust-boundary safety review pointer.
   - [`docs/strategy/verification-runner-github-check-publisher-decision.md`](../../docs/strategy/verification-runner-github-check-publisher-decision.md)
     adds the trust-boundary safety review pointer.
   - [`docs/strategy/github-check-publisher-send-workflow-safety-review.md`](../../docs/strategy/github-check-publisher-send-workflow-safety-review.md)
     adds the trust-boundary safety review pointer.
   - [`docs/strategy/pr-comment-publisher-safety-review.md`](../../docs/strategy/pr-comment-publisher-safety-review.md)
     adds the trust-boundary safety review pointer.
   - [`docs/concepts/verification-runs.md`](../../docs/concepts/verification-runs.md)
     adds the safety review to the Cross-References list.
   - [`docs/artifacts/verification-run.md`](../../docs/artifacts/verification-run.md)
     adds the safety review to the Cross-References list.
   - [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
     adds the safety review to the Cross-references block.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     adds step 60 (safety review shipped).
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the safety review +
     points to the beta readiness / classic-parity
     review as the next slice.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
4. **README + CHANGELOG entries.**

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
  VerificationResult shapes.** Unchanged. The memo
  re-pins the invariants the step 9 hardening already
  enforces.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **GitHub Check publisher (helpers, CLI, workflow,
  validator).** Unchanged.
- **PR comment publisher (helpers, CLI, workflow,
  validator).** Unchanged.
- **All four workflow templates.** Unchanged.
- **All three validator profiles.** Unchanged.
- **Canonical-truth invariant.** Reinforced. The memo
  repeats `GitHub status and comments are not canonical
  truth; Rekon artifacts remain canonical.` in the
  Decision Summary, the Canonical Artifact Boundary
  section, and the Beta Stability Decision.
- **Chain-coherence invariant.** Reinforced via the new
  pinned statement `VerificationResult and
  VerificationRun must remain chain-coherent in every
  review surface.`
- **Fork-safety invariant.** Reinforced via the PR head
  SHA review section. `Forked PRs and
  pull_request_target remain blocked by default.`
- **No-auto-resolution invariant.** Reinforced. The
  memo explicitly states `A successful GitHub Check or
  PR comment publish does not imply findings are
  resolved or reconciliation has been applied.`
- **Platform-honesty invariant.** Reinforced. The memo
  states `Windows timeout behavior is direct-child-only
  unless a future platform-specific process-tree
  strategy is implemented.`

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The
  step 9 hardening closed the gap where a green Check /
  PR comment could describe an incoherent chain; the
  safety review re-pins that closure.
- **Classic anti-pattern avoided:** the review pages
  forward `GitHub status and comments are not
  canonical truth; Rekon artifacts remain canonical.`
  through every operator-facing surface and adds the
  chain-coherence statement to the same list.
- **Capability map:** unchanged.
- **Conformance:** unchanged.

## HARDENING REVIEWED

| Fix | Status | Evidence | Remaining Follow-Up |
| --- | --- | --- | --- |
| Proof-chain coherence | shipped | github-check uses VerificationResult -> cited VerificationRun | monitor missing-run warnings |
| Bounded output capture | shipped | incremental digest + bounded excerpts | consider streaming redaction overlap tests |
| Timeout semantics | shipped | POSIX process-group kill; Windows direct-child-only | Windows process-tree strategy |
| Environment policy | shipped | NODE_OPTIONS removed | review NPM_CONFIG_USERCONFIG |
| GitHub error bounds | shipped | 64 KiB bounded reads | keep fake-server regression tests |
| PR head SHA policy | shipped | pull_request requires explicit head SHA | event-payload extraction future |

Surfaces reviewed in the memo:

1. `rekon verify run --execute` (runner).
2. `rekon verify result from-run` (derivation).
3. `rekon publish github-check --dry-run`
   (proof-chain warning surface).
4. `rekon publish github-check --send` (PR head SHA
   gate + bounded body reader).
5. `rekon publish pr-comment --dry-run` (unchanged;
   confirmed).
6. `rekon publish pr-comment --send` (bounded body
   reader inherited).
7. `VerificationRun` artifact semantics (no schema
   change).
8. `VerificationResult` proof-summary semantics
   (no schema change).
9. GitHub Check payloads (`proofChainWarnings`
   field).
10. PR comment body / update path (unchanged).
11. Workflow templates and validator profiles
    (unchanged).

## BETA STABILITY DECISION

**Beta-stable.** Every criterion in the beta decision
table passes:

- Coherent proof chain.
- Bounded execution logs.
- Token / log safety.
- Timeout semantics documented honestly.
- PR SHA policy safe.
- Canonical artifact boundary preserved.
- No auto-resolution.

**No additional GitHub review surfaces should be added
before beta.** Remaining work should focus on
operational polish + documented platform caveats, not
new GitHub APIs.

## CANONICAL ARTIFACT BOUNDARY

Both GitHub write surfaces (Check Run and PR comment)
remain **downstream review surfaces**. The canonical
artifacts remain:

- `VerificationPlan`
- `VerificationRun`
- `VerificationResult`
- Proof-report / architecture-summary / agent-contract
  `Publication`s

Both publishers:

- **Cite** refs by id in every payload / body.
- **Carry** the canonical-truth phrase verbatim.
- **Never** mutate any Rekon artifact (the artifact
  index is byte-identical before and after a `--send`
  run; pinned by contract tests on both surfaces).
- **Never** imply a finding has been auto-resolved or
  that reconciliation has been auto-applied.

The proof-chain coherence fix strengthens this:
`GitHub Check payload.verificationRunRef` is now
structurally tied to
`VerificationResult.header.inputRefs`, so the publisher
cannot describe an incoherent chain even if the
operator's local store contains a newer unrelated run.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/verification-github-trust-boundary-safety-review.test.mjs`
  — 18 assertions, all passing.
- **Existing suites still passing:** every prior
  contract / docs suite. Full suite expected ≥ 1568
  passed / 1 skipped (1550 prior + 18 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass
  unchanged.
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
- All existing contract / docs tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: safety review memo drifts from runtime
  behaviour.** Mitigated by the docs test pinning the
  memo's language (beta-stable, canonical-truth,
  chain-coherent, bounded streaming, POSIX
  process-tree kill, Windows direct-child-only,
  NODE_OPTIONS removal, bounded error reads,
  explicit PR head SHA, no auto-resolve).
- **Risk: Windows direct-child-only timeout is a
  documented caveat, not a feature.** Mitigated by
  the explicit statement in this memo + concept doc
  + artifact doc. Future Windows Job Objects work
  paged for post-beta.
- **Risk: NPM_CONFIG_USERCONFIG kept in the
  allowlist.** Acceptable for v1; the secret-key
  scrub still applies to its value. Paged for
  follow-up.
- **Risk: real-world GHES / proxy testing pending.**
  The bounded reader is contract-tested against a
  local fake server. Paged for follow-up.
- **Follow-up — Beta readiness / remaining
  classic-parity review (next slice).** Step back
  from GitHub-specific work and assess the
  remaining delta to beta.

## NEXT STEP

**Beta readiness / remaining classic-parity review.**

Step back from GitHub-specific work and assess the
remaining delta to beta:

- verification runner gaps;
- GitHub review surfaces (already beta-complete);
- issue governance;
- filtering / graph-aware filters;
- memory;
- publications;
- source-write / reconciliation gaps;
- watcher / path freshness gaps.

Decide which gaps must close before beta and which
are post-beta.
