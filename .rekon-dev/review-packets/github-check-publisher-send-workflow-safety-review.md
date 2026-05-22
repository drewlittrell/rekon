# Review Packet — GitHub Check Publisher Send Workflow Safety Review (P1.1 slice)

**Slice:** `github-check-publisher-send-workflow-safety-review`
**Sequence position:** Step 6e of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template change.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/github-check-publisher-send-workflow-safety-review.md`](../../docs/strategy/github-check-publisher-send-workflow-safety-review.md).
   Reviews the full GitHub Check publishing path (payload
   helper, readiness gate, dry-run CLI, send CLI, read-only
   templates, opt-in checks-write template, validator
   profiles, token / permission behaviour, fork / event
   safety, canonical-artifact boundary, test coverage,
   remaining risks). Decision: **beta-ready as an opt-in
   surface; read-only templates remain alpha default; PR
   comments remain deferred.** Contains the surface
   diagnostic table + the risk diagnostic table required
   by the work order.
2. **New docs test** at
   `tests/docs/github-check-publisher-send-workflow-safety-review.test.mjs`
   pinning the 16 required assertions (memo existence,
   required headings, beta-ready language, read-only
   alpha default language, canonical-truth language,
   fork / `pull_request_target` blocked language, PR
   comments deferred, dry-run / send / validator /
   opt-in template references, no-auto-resolution
   language, CHANGELOG mention, review-packet PURPOSE
   PRESERVATION CHECK).
3. **Cross-doc updates:**
   - [`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
     links to the safety review under step 6.
   - [`docs/strategy/verification-runner-github-check-publisher-decision.md`](../../docs/strategy/verification-runner-github-check-publisher-decision.md)
     adds a "Safety review" cross-reference.
   - [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
     links to the safety review from the operator guide's
     "Optional: publish a GitHub Check" + cross-references
     blocks.
   - The concept docs
     ([`verification-runs.md`](../../docs/concepts/verification-runs.md),
     [`verification-results.md`](../../docs/concepts/verification-results.md),
     [`proof-report-publication.md`](../../docs/concepts/proof-report-publication.md))
     and the artifact doc
     ([`proof-report-publication.md`](../../docs/artifacts/proof-report-publication.md))
     add the safety review to their Cross-References lists.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     flips step 50 to ✅ Shipped (safety review).
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a new "Shipped" entry for the safety review +
     points to the PR Comment Publisher Decision Memo as
     the next slice.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
4. **README + CHANGELOG entries.**

## PUBLIC API CHANGES

- **None.** This is a strategy / docs / tests batch.
- No new exports from `@rekon/capability-docs`,
  `@rekon/capability-verify`, `@rekon/sdk`,
  `@rekon/runtime`, or any other package.
- No new CLI command, no new CLI flag.
- No new artifact type.
- No new capability package.
- No new role / permission.

## PURPOSE PRESERVATION CHECK

The review is informational; it preserves every existing
invariant:

- **Verification runner v1 purpose.** Unchanged.
- **VerificationPlan / VerificationRun /
  VerificationResult.** Unchanged.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **Read-only workflow templates.** Unchanged. The memo
  confirms they remain the alpha default.
- **Opt-in checks-write workflow template.** Unchanged.
  The memo reviews its safety contract without
  modifying it.
- **GitHub Check payload / readiness / publish helpers.**
  Unchanged. The memo reviews their behaviour without
  changing it.
- **Workflow validator + profiles.** Unchanged.
- **Canonical-truth invariant.** Reinforced. The memo
  repeats the canonical-truth phrase in the Decision
  Summary, the Beta Readiness Decision, and every
  diagnostic table.
- **Fork-safety invariant.** Reinforced via the
  three-layer table.
- **No-auto-resolution invariant.** Reinforced. The memo
  explicitly states no automatic finding resolution or
  reconciliation apply is implied by a successful
  GitHub Check.
- **No-token-leak invariant.** Reinforced via the
  Token / Permission Review section.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The
  review pins the canonical-artifact boundary survives
  end-to-end across the full path.
- **Classic anti-pattern avoided:** the review pages
  forward "GitHub status is not canonical truth; Rekon
  artifacts remain canonical" through every operator-
  facing surface.
- **Capability map:** unchanged.
- **Conformance:** unchanged.

## COMPONENTS REVIEWED

1. `buildGitHubCheckPayload` (pure helper, no I/O).
2. `assessGitHubCheckPublisherReadiness` (pure helper,
   no I/O).
3. `rekon publish github-check --dry-run` CLI mode.
4. `rekon publish github-check --send` CLI mode.
5. `docs/examples/workflows/rekon-verification.yml`
   (read-only execute).
6. `docs/examples/workflows/rekon-verification-dry-run.yml`
   (read-only dry-run).
7. `docs/examples/workflows/rekon-verification-check-send.yml`
   (opt-in checks-write).
8. `rekon verify github-workflow validate --profile
   read-only | github-check-send`.
9. Token / permission behaviour across the CLI + helper.
10. Fork / `pull_request` / `pull_request_target`
    behaviour at three layers (template, validator,
    runtime).
11. Canonical-artifact boundary (payload citation +
    canonical-truth phrase + no Rekon-artifact mutation).
12. Test coverage (helper, dry-run, send, validator
    profiles, docs).

## BETA READINESS DECISION

**Beta-ready as an opt-in surface.** Read-only templates
remain the recommended alpha default. PR comments remain
deferred until the PR Comment Publisher Decision Memo
(next slice) decides whether they add review-time value
worth their broader scope.

The decision is supported by:

- Three-layer opt-in enforcement (template, validator,
  send-CLI readiness assessor).
- Token-leakage structural prevention (sanitized errors;
  sentinel-token contract test).
- Three-layer fork-safety enforcement.
- Structural canonical-artifact boundary preservation
  (payload citation; no Rekon-artifact mutation; index
  byte-identical before/after a `--send` run).
- Read-only alpha defaults unchanged (validator
  read-only profile still validates them clean).

## SAFETY FACTS

Pinned by existing tests / docs (no new tests required
for the review itself, beyond the 16-assertion docs
contract):

- Dry-run CLI makes no GitHub API call and reads no
  token (behavioural tests in the dry-run CLI suite).
- Send CLI is gated by every readiness issue code
  (`not-enabled`, `missing-token`,
  `missing-repository`, `missing-sha`,
  `untrusted-event`, `write-permission-not-confirmed`).
- Forked PRs and `pull_request_target` denied at three
  layers.
- Read-only templates do not contain `checks: write`.
  Opt-in template does.
- Opt-in template runs `--dry-run` before `--send`.
- Rekon artifacts remain canonical; the send CLI does
  not mutate the artifact index (byte-identical before
  and after).

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/github-check-publisher-send-workflow-safety-review.test.mjs`
  — 16 assertions, all passing.
- **Existing suites still passing:** skeleton (26),
  dry-run CLI (9), send CLI (19), validator (42),
  opt-in workflow template docs (21), GitHub Check
  publisher send docs (10), GitHub Check publisher
  decision (13). Full suite expected ≥ 1347 passed /
  1 skipped (1331 prior + 16 new).
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
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- All three workflow templates — unchanged.
- All existing contract / docs tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: review memo drifts from runtime behaviour.**
  Mitigated by the docs test pinning the memo's
  language (beta-ready, read-only alpha default, no
  canonical-truth, no fork/PRT, PR comments deferred).
- **Risk: operator education lag.** The
  canonical-truth phrase appears in every Check Run
  payload + every operator-facing doc, but a short
  "what the Check is / isn't" page when adoption grows
  is paged for follow-up.
- **Follow-up — PR Comment Publisher Decision Memo
  (next slice).** Decide whether Rekon adds a PR
  comment surface after GitHub Checks or whether
  Check Runs + artifacts are sufficient for beta.
  Do not implement PR comments until that memo is
  pinned.

## NEXT STEP

**PR Comment Publisher Decision Memo.** Decide:

- Is the Check Run path + artifact upload sufficient
  for beta reviewers, or do PR comments add unique
  review-time value?
- If yes, what gate model? (Same readiness assessor?
  Same opt-in template pattern? Same default-deny on
  forked PRs?)
- If no, what additional Check Run refinements (text
  body, annotations, summary length) would close the
  gap?
- What is the rollout sequence?

Do not implement PR comments until the decision is
pinned.
