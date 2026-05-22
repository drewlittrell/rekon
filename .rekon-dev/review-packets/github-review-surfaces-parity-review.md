# Review Packet — GitHub Review Surfaces Parity Review (P1.1 slice)

**Slice:** `github-review-surfaces-parity-review`
**Sequence position:** Step 8 of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template change, no validator profile
change, no GitHub API call.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/github-review-surfaces-parity-review.md`](../../docs/strategy/github-review-surfaces-parity-review.md).
   Reviews the full GitHub review surface end-to-end —
   read-only workflow templates, opt-in Check + PR comment
   workflow templates, three validator profiles, Check
   publisher (dry-run + send), PR comment publisher (dry-run
   + send), proof / architecture-summary / agent-contract
   publications, uploaded `.rekon/artifacts`, job summary
   markdown, `rekon artifacts latest` helper, canonical
   artifact boundary, fork / token / permission safety,
   operator ergonomics. Decision: **beta-complete as an
   opt-in surface; read-only templates remain alpha default;
   GitHub Checks remain the primary status surface; PR
   comments remain the narrative companion surface;
   uploaded Rekon artifacts remain canonical truth; no
   additional GitHub API surface is needed before beta.**
   Contains the surface diagnostic table + the risk
   diagnostic table + the beta-decision diagnostic table
   required by the work order.
2. **New docs test** at
   `tests/docs/github-review-surfaces-parity-review.test.mjs`
   pinning the 20 required assertions (memo existence, all
   13 required headings, beta-complete language, read-only
   alpha default, Checks primary surface, PR comments
   narrative companion, canonical-truth + Rekon-artifacts-
   canonical phrases, no auto-resolve, forked PRs blocked,
   references to read-only templates / Check workflow / PR
   comment workflow / validator profiles / `.rekon/artifacts`,
   surface table, risk table, beta decision table, CHANGELOG
   mention, review-packet PURPOSE PRESERVATION CHECK).
3. **Cross-doc updates:**
   - [`docs/strategy/github-check-publisher-send-workflow-safety-review.md`](../../docs/strategy/github-check-publisher-send-workflow-safety-review.md)
     adds a cross-reference to the parity review.
   - [`docs/strategy/pr-comment-publisher-safety-review.md`](../../docs/strategy/pr-comment-publisher-safety-review.md)
     adds a cross-reference to the parity review.
   - [`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
     adds the step 8 shipped block.
   - [`docs/strategy/verification-runner-github-check-publisher-decision.md`](../../docs/strategy/verification-runner-github-check-publisher-decision.md)
     adds the parity review pointer.
   - [`docs/strategy/pr-comment-publisher-decision.md`](../../docs/strategy/pr-comment-publisher-decision.md)
     adds the parity review pointer.
   - [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
     links to the parity review from the Cross-references
     block.
   - The concept docs
     ([`verification-runs.md`](../../docs/concepts/verification-runs.md),
     [`verification-results.md`](../../docs/concepts/verification-results.md),
     [`proof-report-publication.md`](../../docs/concepts/proof-report-publication.md))
     and the artifact doc
     ([`proof-report-publication.md`](../../docs/artifacts/proof-report-publication.md))
     add the parity review to their Cross-References lists.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     adds step 58 (parity review).
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the parity review +
     points to Verification / GitHub Trust-Boundary
     Hardening as the next slice.
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
  VerificationResult.** Unchanged. The memo cites refs by
  id only; no artifact mutation, no schema change.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **All four workflow templates.** Unchanged.
- **All three validator profiles.** Unchanged.
- **GitHub Check publisher (helpers, CLI, workflow,
  validator).** Unchanged.
- **PR comment publisher (helpers, CLI, workflow,
  validator).** Unchanged.
- **Canonical-truth invariant.** Reinforced. The memo
  repeats `GitHub status and comments are not canonical
  truth; Rekon artifacts remain canonical.` in the
  Decision Summary, the Canonical Artifact Boundary
  section, and the Beta Completeness Decision.
- **Marker-not-proof invariant.** Reinforced via the PR
  comment surface review.
- **Fork-safety invariant.** Reinforced via the
  three-layer table in the Fork Token And Permission
  Review section. `Forked PRs and pull_request_target
  remain blocked by default.`
- **No-auto-resolution invariant.** Reinforced. The
  memo explicitly states `A successful GitHub Check or
  PR comment publish does not imply findings are
  resolved or reconciliation has been applied.`
- **No-token-leak invariant.** Reinforced via the
  Fork Token And Permission Review section.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The
  combined GitHub review surface gives reviewers a
  status chip (Check Run), a narrative timeline (PR
  comment), a CI summary (job summary), and the
  canonical artifact upload — without any GitHub
  surface becoming the source of truth.
- **Classic anti-pattern avoided:** the review pages
  forward `GitHub status and comments are not
  canonical truth; Rekon artifacts remain canonical.`
  through every operator-facing surface.
- **Capability map:** unchanged.
- **Conformance:** unchanged.

## SURFACES REVIEWED

1. Read-only dry-run workflow template.
2. Read-only execute workflow template.
3. Opt-in GitHub Check send workflow template.
4. Opt-in PR comment workflow template.
5. Workflow validator profiles (read-only,
   github-check-send, github-pr-comment-send).
6. GitHub Check dry-run CLI.
7. GitHub Check send CLI.
8. PR comment dry-run CLI.
9. PR comment send CLI.
10. Proof report publication.
11. Architecture summary publication.
12. Agent contract publication.
13. Uploaded `.rekon/artifacts`.
14. Job summary markdown.
15. `rekon artifacts latest` helper.
16. Canonical artifact boundary.
17. Fork / token / write-permission safety.
18. Operator ergonomics gaps.

## BETA COMPLETENESS DECISION

**Beta-complete as an opt-in surface.** Every criterion
in the beta decision table passes:

- Canonical artifacts preserved.
- Check status surface exists.
- Narrative PR surface exists.
- Read-only adoption path exists.
- Workflow safety validation exists.
- Fork / default-deny posture preserved.
- Automatic resolution avoided.

Read-only templates remain the alpha default. GitHub
Checks remain the primary status surface. PR comments
remain the narrative companion surface. Uploaded Rekon
artifacts remain canonical truth. **No additional
GitHub API surface is needed before beta.**

## CANONICAL ARTIFACT BOUNDARY

Both GitHub write surfaces — Check Run and PR comment
— are **downstream review surfaces**. The canonical
artifacts remain:

- `VerificationPlan`
- `VerificationRun`
- `VerificationResult`
- Proof-report / architecture-summary / agent-contract
  `Publication`s

Both publishers:

- **Cite** refs by id in every body.
- **Carry** the canonical-truth phrase verbatim.
- **Never** mutate any Rekon artifact (the artifact
  index is byte-identical before and after a `--send`
  run; pinned by contract tests on both surfaces).
- **Never** imply a finding has been auto-resolved or
  that reconciliation has been auto-applied.

If an operator deletes the Check Run output or the PR
comment manually, the proof state in `.rekon/artifacts`
is unaffected.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/github-review-surfaces-parity-review.test.mjs`
  — 20 assertions, all passing.
- **Existing suites still passing:** every prior
  contract / docs suite. Full suite expected ≥ 1532
  passed / 1 skipped (1512 prior + 20 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass
  unchanged.
- **No CLI smoke required.** Strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `packages/capability-verify/` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- All existing contract / docs tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: review memo drifts from shipped runtime
  behaviour.** Mitigated by the docs test pinning the
  memo's language (beta-complete, read-only alpha
  default, Checks primary / PR comments companion,
  canonical-truth, no auto-resolve, forked PRs
  blocked, references to read-only templates / Check
  workflow / PR comment workflow / validator profiles
  / `.rekon/artifacts`, three diagnostic tables).
- **Risk: operator education lag.** The canonical-
  truth phrase appears in every Check Run summary +
  PR comment body + job summary + operator-facing
  doc, but a short "what the Check / PR comment is /
  isn't" page when adoption grows is paged for
  follow-up.
- **Risk: real-world workflow validation pending.**
  The bundled templates have been validated against
  the validator + fake API servers, but not against
  real non-Rekon repos. Paged for follow-up before
  recommending broad adoption.
- **Follow-up — Verification / GitHub Trust-Boundary
  Hardening (next slice).** Return to foundational
  hardening before adding any new review surfaces:
  coherent VerificationResult → VerificationRun
  proof-chain selection for GitHub Check payloads;
  bounded stdout/stderr streaming memory; process-
  tree timeout semantics; `NODE_OPTIONS` removal from
  runner env; bounded GitHub API error-body reads
  (re-confirm); PR head-SHA policy.

## NEXT STEP

**Verification / GitHub Trust-Boundary Hardening.**

The GitHub review surface is feature-complete enough
for beta. The natural next focus is the trust-
boundary edge cases that the shipped surfaces
expose, not more review surfaces. Specifically:

- Coherent VerificationResult → VerificationRun
  proof-chain selection for GitHub Check payloads.
- Bounded stdout/stderr streaming memory.
- Process-tree timeout semantics.
- `NODE_OPTIONS` removal from runner env.
- Bounded GitHub API error-body reads (already
  ≤ 64 KiB in both publishers; re-confirm and pin).
- PR head-SHA policy + operator guidance.

After hardening, the natural follow-on is cross-CI
documentation (GitLab CI, Jenkins, CircleCI) — the
CLI surface is identical; only the YAML envelope
differs.
