# Review Packet — PR Comment Publisher API Decision Gate (P1.1 slice)

**Slice:** `pr-comment-publisher-api-decision-gate`
**Sequence position:** Step 7c of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template modification, no validator
profile change, no GitHub API call.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/pr-comment-publisher-api-decision-gate.md`](../../docs/strategy/pr-comment-publisher-api-decision-gate.md).
   Reviews the shipped PR comment dry-run components,
   the GitHub permission boundary, the fork-default-deny
   posture, the comment body model, the idempotency +
   noise strategy, and four implementation options.
   Recommends **Option C** (add a workflow / validator
   profile gate first; do not implement the API writer
   in the next slice; re-evaluate after the gate exists
   and operators have inspected the concrete permission
   boundary). Contains both required diagnostic tables
   (component + risk).
2. **New docs test** at
   `tests/docs/pr-comment-publisher-api-decision-gate.test.mjs`
   pinning the 18 required assertions.
3. **Cross-doc updates:**
   - [`docs/strategy/pr-comment-publisher-decision.md`](../../docs/strategy/pr-comment-publisher-decision.md)
     links to the gate memo from the Implementation
     Sequence and the Future PR Comment Publisher
     section.
   - [`docs/strategy/github-check-publisher-send-workflow-safety-review.md`](../../docs/strategy/github-check-publisher-send-workflow-safety-review.md)
     adds a Follow-Up Work entry referencing the gate.
   - [`docs/strategy/verification-runner-github-check-publisher-decision.md`](../../docs/strategy/verification-runner-github-check-publisher-decision.md)
     adds a cross-reference under the PR comment
     publisher mention.
   - [`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
     step 7c marked ✅ Shipped.
   - [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
     gains a Cross-references link to the gate memo.
   - The concept docs
     ([`verification-runs.md`](../../docs/concepts/verification-runs.md),
     [`verification-results.md`](../../docs/concepts/verification-results.md),
     [`proof-report-publication.md`](../../docs/concepts/proof-report-publication.md))
     and the artifact doc
     ([`proof-report-publication.md`](../../docs/artifacts/proof-report-publication.md))
     add the gate to their Cross-References lists.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     adds a new shipped step (53) for the decision
     gate.
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a new shipped entry + flips the previous
     "Recommended next slice" pointer.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
4. **README + CHANGELOG entries.**

## PUBLIC API CHANGES

- **None.** Strategy / docs / tests batch.
- No new exports from `@rekon/capability-docs`,
  `@rekon/capability-verify`, `@rekon/sdk`,
  `@rekon/runtime`, or any other package.
- No new CLI command. No new CLI flag. No new
  validator profile. No new workflow template.

## PURPOSE PRESERVATION CHECK

The memo is informational; it preserves every existing
invariant:

- **Verification runner v1 purpose.** Unchanged.
- **VerificationPlan / VerificationRun /
  VerificationResult.** Unchanged.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **Workflow templates (read-only execute + dry-run +
  opt-in checks-write).** Unchanged.
- **GitHub Check payload / readiness / publish / send
  helpers + CLI.** Unchanged.
- **Workflow validator + `read-only` / `github-check-send`
  profiles.** Unchanged.
- **PR comment helpers + dry-run CLI.** Unchanged.
- **Canonical-truth invariant.** Reinforced. The memo
  states it in the Decision Summary, Canonical
  Artifact Boundary, and the docs-test assertions.
- **Fork-safety invariant.** Reinforced via the
  three-layer table + the forked-PR default-deny
  statement.
- **No-auto-resolution invariant.** Reinforced. The
  memo explicitly says no automatic finding resolution
  or reconciliation apply is implied by a successful
  PR comment.
- **No-token-leak invariant.** Reinforced via the
  step-7e sentinel-token contract-test pin.
- **Read-only alpha defaults.** Unchanged. The memo
  confirms PR comment posting would never land in the
  bundled execute / dry-run templates.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The
  memo decides whether the existing surface (Check
  Runs + uploaded artifacts + job summary + dry-run
  PR-comment preview) is enough for now or whether
  adding the actual PR-comment post path is worth
  the broader write scope. Recommended: prepare the
  boundary, defer the post.
- **Classic anti-pattern avoided:** Rekon does not
  treat GitHub comments as canonical. The memo says
  so in three places; the docs test asserts the
  phrase.
- **Capability map:** unchanged.
- **Conformance:** unchanged.

## COMPONENTS REVIEWED

1. `buildPrCommentBody(input)` (pure helper, no I/O).
2. `assessPrCommentPublisherReadiness(input)` (pure
   helper, no I/O).
3. `rekon publish pr-comment --dry-run` CLI (no
   GitHub API call, no token reads).
4. Idempotency marker
   `<!-- rekon:pr-comment:v1 -->` (identity handle,
   not proof).
5. Comment content model (citation table +
   canonical-truth + Warnings + Next steps; no raw
   stdout / stderr / secrets / tokens).
6. Readiness issue codes (`not-enabled`,
   `missing-repository`, `missing-pr-number`,
   `missing-token`, `untrusted-event`,
   `write-permission-not-confirmed`).
7. Permission model (`issues: write` /
   `pull-requests: write` required; broader than
   `checks: write`).
8. Fork / `pull_request` / `pull_request_target`
   behaviour (readiness assessor rejects forks;
   GitHub Actions default-denies write tokens to
   forked PRs).
9. No-token / no-network dry-run safety (behavioural
   + source-scan tests already shipped in 7b).
10. Noise + stale-comment risks (mitigated by
    update-in-place via marker).
11. GitHub Check vs PR comment review value (Check
    chip vs persistent timeline comment).
12. Implementation sequence (7d profile → 7e API
    writer → 7f safety review).

## OPTIONS CONSIDERED

| Option | Verdict |
| --- | --- |
| A — Stop at dry-run; no actual PR comment posting | Acceptable long-term stance if operator demand never materialises. |
| B — Add PR comment API writer after workflow / template / validator gate | Eventual target; **not** the recommended next slice. |
| C — Add workflow / validator profile first, still no API writer | **Recommended.** |
| D — Defer to hosted / GitHub App model | Rejected for alpha / beta. |

## RECOMMENDATION

**Adopt Option C.** Ship the workflow / validator
profile in the next slice (step 7d). Defer the
actual API writer (step 7e) until after operators
have inspected the concrete permission boundary.

Required statements pinned in the memo:

- **Actual PR comment posting remains deferred until
  a PR comment workflow / validator profile exists.**
- **PR comments are not canonical truth; Rekon
  artifacts remain canonical.**
- **The idempotency marker is not proof; it is only
  an update-in-place handle.**

## PERMISSION / FORK MODEL

**Required permission for the future PR comment API
writer:** `issues: write` **OR** `pull-requests:
write`. Both are broader than the `checks: write`
the GitHub Check publisher uses today.
`pull-requests: write` is the conventional choice
for PR-conversation surfaces; `issues: write`
works equally because GitHub treats PR timeline
comments as issue comments under the hood.

**Forked PRs must not receive secret-bearing
comment publishing by default.** Three layers of
defence:

1. The PR comment readiness assessor classifies
   forked `pull_request` events as `untrusted-fork`
   (denied by default).
2. The (future) `github-pr-comment-send` validator
   profile must reject the `pull_request` trigger
   entirely, same as the existing
   `github-check-send` profile.
3. GitHub Actions itself denies write-capable
   tokens to forked-PR workflows by default
   (repository setting off by default).

`pull_request_target` is `unconditional-deny` at
every layer, same as the Check path.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/pr-comment-publisher-api-decision-gate.test.mjs`
  — 18 assertions, all passing.
- **Existing suites still passing:** skeleton (26),
  GitHub Check dry-run CLI (9), GitHub Check send
  CLI (19), validator (42), opt-in workflow template
  docs (21), GitHub Check publisher send docs (10),
  GitHub Check publisher decision (13), safety
  review docs (16), PR comment publisher decision
  docs (18), PR comment dry-run helper docs (9), PR
  comment dry-run CLI contract (18). Full suite
  expected ≥ 1410 passed / 1 skipped (1392 prior +
  18 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass
  unchanged.
- **No CLI smoke required.** Strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` —
  unchanged. The PR comment helpers shipped in
  step 7b remain as published.
- `packages/cli/src/index.ts` — unchanged.
- `packages/capability-verify/` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- All three workflow templates
  (`rekon-verification.yml`,
  `rekon-verification-dry-run.yml`,
  `rekon-verification-check-send.yml`) — unchanged.
- The workflow validator's
  `--profile read-only | github-check-send` flag
  and every existing profile rule — unchanged.
- `rekon publish github-check --dry-run|--send`
  CLI surface — unchanged.
- `rekon publish pr-comment --dry-run` CLI surface
  — unchanged.
- `publishGitHubCheckRun` helper — unchanged.
- `buildPrCommentBody` /
  `assessPrCommentPublisherReadiness` helpers —
  unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: memo drifts from runtime behaviour.**
  Mitigated by the docs test pinning the memo's
  language (Option C, deferred posting,
  canonical-truth, marker-not-proof, fork
  default-deny, helper references).
- **Risk: operators implement the API writer
  outside the staged path.** Mitigated by the
  memo's Implementation Sequence + the existing
  CLI's refusal to run `publish pr-comment` with
  `--send` / `--publish` / `--execute` flags.
- **Follow-up — PR comment workflow / validator
  profile (next slice, if Option C approved).**
  Build the boundary first: new validator profile
  (`github-pr-comment-send`), new opt-in workflow
  template under `docs/examples/workflows/`,
  validator contract + docs tests for the new
  profile, no API writer yet.

## NEXT STEP

If Option C is approved:
**PR comment workflow / validator profile (step
7d).** Add a `github-pr-comment-send` workflow
validator profile and a `docs/examples/` opt-in
workflow template that requests the minimal write
permission (`pull-requests: write`), validates
same-repo / trusted-context posture, and still does
not post comments. Only after that should actual
`publish pr-comment --send` be considered.

If Option C is **not** approved:
Default to Option A. Keep the dry-run renderer as
a local preview; ship no API writer. Operator
demand can reopen the question later.
