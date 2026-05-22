# Review Packet — PR Comment Publisher Safety Review (P1.1 slice)

**Slice:** `pr-comment-publisher-safety-review`
**Sequence position:** Step 7g of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template change, no validator profile
change, no GitHub API call.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/pr-comment-publisher-safety-review.md`](../../docs/strategy/pr-comment-publisher-safety-review.md).
   Reviews the full PR comment publishing path (body helper,
   readiness helper, dry-run CLI, send CLI, API writer,
   workflow template, validator profile, idempotency marker,
   pagination + update-in-place, token + error sanitization,
   fork + event safety, canonical-artifact boundary, test
   coverage). Decision: **beta-ready as an opt-in surface;
   read-only templates remain alpha default; GitHub Checks
   remain the primary status surface; PR comments are the
   narrative companion surface.** Contains the component
   diagnostic table + the risk diagnostic table required by
   the work order.
2. **New docs test** at
   `tests/docs/pr-comment-publisher-safety-review.test.mjs`
   pinning the 18 required assertions (memo existence, all
   required headings, beta-ready language, GitHub Checks
   primary / PR comments companion language, canonical-truth
   + Rekon-artifacts-canonical phrases, marker-not-proof
   phrase, forked PRs blocked, `pull_request_target`
   blocked, no auto-resolve language,
   `publishPrCommentRun` reference, `--send` reference,
   `github-pr-comment-send` reference, component table, risk
   table, CHANGELOG mention, review-packet PURPOSE
   PRESERVATION CHECK).
3. **Cross-doc updates:**
   - [`docs/strategy/pr-comment-api-writer-go-no-go-review.md`](../../docs/strategy/pr-comment-api-writer-go-no-go-review.md)
     flips step 7g to ✅ Shipped and links to the new
     memo.
   - [`docs/strategy/pr-comment-publisher-api-decision-gate.md`](../../docs/strategy/pr-comment-publisher-api-decision-gate.md)
     marks step 7g as ✅ Shipped in the Implementation
     Sequence.
   - [`docs/strategy/pr-comment-publisher-decision.md`](../../docs/strategy/pr-comment-publisher-decision.md)
     marks step 7g as ✅ Shipped in the Implementation
     Sequence + adds a "Safety review" cross-reference.
   - [`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
     adds the 7g shipped block.
   - [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
     links to the safety review from the operator guide's
     "Optional: post a PR comment workflow" block + the
     Cross-references block.
   - The concept docs
     ([`verification-runs.md`](../../docs/concepts/verification-runs.md),
     [`verification-results.md`](../../docs/concepts/verification-results.md),
     [`proof-report-publication.md`](../../docs/concepts/proof-report-publication.md))
     and the artifact doc
     ([`proof-report-publication.md`](../../docs/artifacts/proof-report-publication.md))
     add the safety review to their Cross-References lists.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     adds step 57 (safety review).
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the safety review +
     points to the GitHub review surfaces parity review
     as the next slice.
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
- **`buildPrCommentBody` /
  `assessPrCommentPublisherReadiness` /
  `publishPrCommentRun`.** Unchanged. The memo reviews
  their behaviour without modifying them.
- **`rekon publish pr-comment --dry-run` / `--send` CLI.**
  Unchanged.
- **PR comment workflow template.** Unchanged. The memo
  reviews the shipped
  `docs/examples/workflows/rekon-pr-comment-send.yml`
  without touching it.
- **`github-pr-comment-send` validator profile.**
  Unchanged.
- **Existing read-only / `github-check-send` profiles +
  templates + send CLI.** Unchanged.
- **Canonical-truth invariant.** Reinforced. The memo
  repeats `PR comments are not canonical truth; Rekon
  artifacts remain canonical.` in the Decision Summary,
  the Canonical Artifact Boundary section, and the
  Beta Readiness Decision.
- **Marker-not-proof invariant.** Reinforced. The memo
  repeats `The idempotency marker is not proof; it is
  only an update-in-place handle.` in the Decision
  Summary, the Idempotency And Noise Review, and the
  Canonical Artifact Boundary section.
- **Fork-safety invariant.** Reinforced via the
  three-layer table in the Fork And Event Safety
  Review. `Forked PRs and pull_request_target remain
  blocked by default.`
- **No-auto-resolution invariant.** Reinforced. The
  memo explicitly states `No automatic finding
  resolution or reconciliation apply is implied by a
  successful PR comment publish.`
- **No-token-leak invariant.** Reinforced via the
  Token And Error Safety Review section.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The PR
  comment is a downstream narrative surface citing
  canonical refs.
- **Classic anti-pattern avoided:** the review pages
  forward `PR comments are not canonical truth; Rekon
  artifacts remain canonical.` through every
  operator-facing surface.
- **Capability map:** unchanged.
- **Conformance:** unchanged.

## COMPONENTS REVIEWED

1. `buildPrCommentBody` (pure helper, no I/O).
2. `assessPrCommentPublisherReadiness` (pure helper,
   no I/O).
3. `publishPrCommentRun` (API writer; built-in
   `fetch`; bounded pagination + body reads; sanitized
   errors).
4. `rekon publish pr-comment --dry-run` CLI mode.
5. `rekon publish pr-comment --send` CLI mode.
6. `docs/examples/workflows/rekon-pr-comment-send.yml`
   (workflow_dispatch only; dry-run + send steps).
7. `rekon verify github-workflow validate --profile
   github-pr-comment-send`.
8. Idempotency marker `<!-- rekon:pr-comment:v1 -->`.
9. Pagination + update-in-place behaviour (PATCH on
   match; POST on miss; bounded 20-page cap; never
   delete reviewer-touched).
10. Token + error sanitization behaviour.
11. Fork / `pull_request` / `pull_request_target`
    behaviour at three layers (template, validator,
    runtime).
12. Canonical-artifact boundary (citation in body +
    canonical-truth phrase + no Rekon-artifact
    mutation + index byte-identical).
13. Test coverage (helpers, dry-run, send, validator
    profile, docs).

## BETA READINESS DECISION

**Beta-ready as an opt-in surface.** Read-only
templates remain the recommended alpha default. The
GitHub Check publisher remains the **primary status
surface**; PR comments are the **narrative companion
surface**. The two are complementary; each can ship
independently.

The decision is supported by:

- Three-layer opt-in enforcement (workflow template
  env, validator-required env, runtime readiness
  assessor's `not-enabled` issue code).
- Three-layer fork-safety enforcement (template,
  validator, runtime).
- Token-leakage structural prevention (sanitized
  errors; sentinel-token contract test; bounded
  response reads; no third-party network client).
- Structural canonical-artifact boundary preservation
  (body cites refs; artifact index byte-identical
  before/after `--send`; canonical-truth phrase
  verbatim).
- Update-in-place idempotency model (marker + PATCH-
  first; no duplicate-on-cap-exhaust; no delete of
  reviewer-touched comments).
- Read-only alpha defaults unchanged.

## SAFETY FACTS

All test-pinned by the contract / docs suites listed
in the memo's "Pinned Safety Facts" section; no
follow-up test is required for the safety review
itself.

- `publishPrCommentRun` PATCHes on marker match;
  POSTs on miss; paginates with a bounded 20-page
  cap.
- Token is never echoed in errors (sentinel-token
  contract test).
- Dry-run reads no token and calls no network even
  with `--api-base-url` set.
- Send is readiness-gated (5 readiness-fail tests).
- Send requires PR number and write confirmation.
- Workflow template is `workflow_dispatch` only with
  a required `pr-number` input.
- Workflow template requests `pull-requests: write`
  only (plus `contents: read`); the validator profile
  rejects every other write scope.
- Validator profile rejects `pull_request` +
  `pull_request_target`.
- Validator profile rejects `checks: write` /
  `issues: write` / `contents: write`.
- Tests use a fake `node:http` server, not real
  GitHub.
- Artifact index is byte-identical before and after
  `--send` (pinned by contract test).

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/pr-comment-publisher-safety-review.test.mjs`
  — 18 assertions, all passing.
- **Existing suites still passing:** the PR comment
  helper (capability-docs) suite, the PR comment
  dry-run CLI contract suite (19), the PR comment
  send CLI contract suite (19), the workflow
  validator suite (57), the GitHub Check publisher
  suites, the PR comment publisher decision docs
  suite, the API decision gate docs suite, the
  workflow validator profile docs suite, the writer
  go/no-go review docs suite. Full suite expected ≥
  1512 passed / 1 skipped (1494 prior + 18 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass
  unchanged.
- **No CLI smoke required.** Strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` —
  unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `packages/capability-verify/` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- All existing contract / docs tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: review memo drifts from runtime behaviour.**
  Mitigated by the docs test pinning the memo's
  language (beta-ready, GitHub Checks primary / PR
  comments companion, canonical-truth, marker-not-
  proof, forked PRs blocked, `pull_request_target`
  blocked, no auto-resolve, references to
  `publishPrCommentRun` + `--send` +
  `github-pr-comment-send`).
- **Risk: operator education lag.** The canonical-
  truth phrase appears in every PR comment body +
  every operator-facing doc, but a short "what the
  PR comment is / isn't" page when adoption grows is
  paged for follow-up.
- **Risk: real-world workflow validation pending.**
  The bundled template has been validated against
  the validator + the fake `node:http` server, but
  not against a real non-Rekon repo. Paged for
  follow-up before broad adoption.
- **Follow-up — GitHub review surfaces parity review
  (next slice).** Walk the combined GitHub surface
  (Checks, PR comments, workflow templates,
  validators, proof publications, uploaded
  artifacts) and decide whether the GitHub review
  surface is beta-complete or whether Check / PR
  comment refinements remain.

## NEXT STEP

**GitHub review surfaces parity review.** Walk the
combined GitHub surface (Checks, PR comments,
workflow templates, validators, proof publications,
uploaded artifacts) and decide whether the GitHub
review surface is beta-complete or whether Check /
PR comment refinements remain.

If the parity review confirms beta-completeness,
the next focus shifts away from the GitHub adapter
and back into Rekon-internal concerns (e.g.,
cross-CI documentation, hosted publisher
exploration, alpha → beta version bump). If
refinements remain, the parity review surfaces
them as their own slices.
