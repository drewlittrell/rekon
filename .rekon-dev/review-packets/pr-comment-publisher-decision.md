# Review Packet — PR Comment Publisher Decision (P1.1 slice)

**Slice:** `pr-comment-publisher-decision`
**Sequence position:** Step 7a of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template modification, no GitHub
API call.

## CHANGES MADE

1. **New decision memo** at
   [`docs/strategy/pr-comment-publisher-decision.md`](../../docs/strategy/pr-comment-publisher-decision.md).
   Recommends **Option B** (PR comment dry-run renderer
   now; defer actual PR comment posting). Reviews all
   four options (A: no PR comments for beta; B: dry-run
   only; C: opt-in idempotent publisher; D: hosted /
   GitHub App). Pins:
   - GitHub Permission Context: creating / updating
     PR timeline comments requires `issues: write` or
     `pull-requests: write`; forked-PR workflows do
     not receive write tokens by default.
   - Comment Content Model: what the future comment
     body should include (artifact refs, status,
     `artifacts validate` outcome, stale warnings,
     canonical-truth phrase, link to uploaded
     artifacts); what it must not include (raw logs,
     secrets, full stdout/stderr, huge artifact
     bodies).
   - Idempotency And Noise Control: update-in-place
     using the `<!-- rekon:pr-comment:v1 -->` marker;
     **the marker is not proof**.
   - Fork And Secret Safety: three-layer defence
     (template, validator, runtime) preserved; plus
     GitHub's own default-deny on forked-PR write
     tokens.
   - Canonical Artifact Boundary: PR comments are a
     downstream surface; Rekon artifacts remain
     canonical.
   - Implementation Sequence: 4 steps (decision →
     dry-run renderer + CLI → validator / docs for
     permissions → API write).
2. **New docs test** at
   `tests/docs/pr-comment-publisher-decision.test.mjs`
   pinning the 18 required assertions.
3. **Cross-doc updates:**
   - [`docs/strategy/github-check-publisher-send-workflow-safety-review.md`](../../docs/strategy/github-check-publisher-send-workflow-safety-review.md)
     adds a "see also: PR Comment Publisher Decision"
     reference in its Follow-Up Work section.
   - [`docs/strategy/verification-runner-github-check-publisher-decision.md`](../../docs/strategy/verification-runner-github-check-publisher-decision.md)
     adds a step 9 reference pointing at the new memo.
   - [`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
     updates step 7 (PR comment publisher) language to
     point at the new decision memo.
   - [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
     adds a cross-reference to the decision memo.
   - The concept docs
     ([`verification-runs.md`](../../docs/concepts/verification-runs.md),
     [`verification-results.md`](../../docs/concepts/verification-results.md),
     [`proof-report-publication.md`](../../docs/concepts/proof-report-publication.md))
     and the artifact doc
     ([`proof-report-publication.md`](../../docs/artifacts/proof-report-publication.md))
     add the decision to their Cross-References lists.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     adds a new shipped step for the PR comment
     publisher decision and pushes the future steps
     down.
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a new shipped entry + points to the
     dry-run renderer as the recommended next slice
     (only if Option B is approved).
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
4. **README + CHANGELOG entries.**

## PUBLIC API CHANGES

- **None.** Strategy / docs / tests batch.
- No new exports from `@rekon/capability-docs`,
  `@rekon/capability-verify`, `@rekon/sdk`,
  `@rekon/runtime`, or any other package.
- No new CLI command. No new CLI flag.
- No new artifact type.
- No new capability package.
- No new role / permission.
- No workflow template change.
- No validator profile change.

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
- **GitHub Check payload / readiness / publish helpers.**
  Unchanged.
- **Workflow validator + profiles.** Unchanged.
- **Canonical-truth invariant.** Reinforced. The memo
  states it in the Decision Summary, the Comment Content
  Model, the Canonical Artifact Boundary section, and
  the docs-test assertions.
- **Fork-safety invariant.** Reinforced. The memo's
  Fork And Secret Safety section pins the three-layer
  defence and notes GitHub's external default-deny on
  forked-PR write tokens.
- **No-auto-resolution invariant.** Reinforced. The
  memo explicitly states no automatic finding
  resolution or reconciliation apply is implied by a
  successful PR comment.
- **No-token-leak invariant.** Reinforced in the
  Implementation Sequence (sentinel-token contract
  test pinned for the future send slice).
- **Read-only alpha defaults.** Unchanged. The memo
  confirms PR comments would never land in the bundled
  execute / dry-run templates.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The
  memo decides whether the current set of surfaces
  (Check Run + job summary + uploaded artifacts) is
  enough for beta or whether PR comments add unique
  value. The answer is "current set is enough; design
  the PR comment surface in isolation before posting."
- **Classic anti-pattern avoided:** Rekon does not
  treat GitHub comments as canonical. The memo says so
  in three places; the docs test asserts the phrase.
- **Capability map:** unchanged.
- **Conformance:** unchanged.

## OPTIONS CONSIDERED

| Option | Verdict |
| --- | --- |
| A — No PR comments for beta | Acceptable; the safety review already pinned Checks + artifacts as beta-ready. |
| B — PR comment dry-run / preview only | **Recommended.** |
| C — Opt-in idempotent PR comment publisher | Rejected for this batch; reconsider after the Option-B dry-run renderer is stable. |
| D — Hosted / GitHub App comment publisher | Rejected for alpha / beta; Rekon has no hosted surface yet. |

## RECOMMENDATION

**Adopt Option B.** Ship the decision memo in this
batch; ship the dry-run renderer + CLI in the next
batch (only if approved). Defer the actual PR comment
API write until after the renderer is stable and the
content + idempotency model is pinned.

If the dry-run renderer + CLI is **not** approved,
default to Option A: ship no PR comment surface; the
existing Check Run + artifact upload combination is
beta-ready as documented in the safety review.

## PERMISSION MODEL

The future PR comment publisher (if approved) will
require **either** `issues: write` **or**
`pull-requests: write`. Both grant the necessary scope
for creating / editing PR timeline comments; the memo
recommends `pull-requests: write` because it scopes
the write to PR objects rather than the broader Issues
object.

The bundled `github-check-send` workflow template
currently requests **only** `checks: write` + `contents:
read`. A future `github-pr-comment-send` profile would
permit the PR-write scope alongside `checks: write`
when the comment publisher is layered on top of the
Check publisher; the validator would still reject
every other write scope.

Forked PRs:

- GitHub Actions does not grant write tokens to
  forked-PR workflows by default. (Admin setting:
  off by default.)
- Rekon's runtime readiness assessor classifies
  forked `pull_request` as `untrusted-fork` (denied
  by default) and `pull_request_target` as
  `unconditional-deny`.
- Any future `github-pr-comment-send` validator
  profile must reject both triggers, same as the
  existing `github-check-send` profile.

## COMMENT MODEL

The future comment body should include:

- VerificationResult status
- VerificationRun ref (when present)
- Proof-report Publication ref
- Architecture summary Publication ref
- Agent contract Publication ref
- `artifacts validate` outcome
- Stale-proof warnings
- Canonical-truth reminder
- Link / path to uploaded `.rekon/artifacts` workflow
  artifact

The future comment body must **not** include:

- Raw command stdout / stderr.
- Full artifact bodies (only refs).
- Secrets, tokens, or env values.
- The Rekon-minted `GITHUB_TOKEN`.

Idempotency marker: `<!-- rekon:pr-comment:v1 -->` at
the top of every body. The marker is **not proof** —
it is an identity handle for update-in-place behaviour.

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/pr-comment-publisher-decision.test.mjs`
  — 18 assertions, all passing.
- **Existing suites still passing:** skeleton (26),
  dry-run CLI (9), send CLI (19), validator (42),
  opt-in workflow template docs (21), GitHub Check
  publisher send docs (10), GitHub Check publisher
  decision (13), safety review docs (16). Full suite
  expected ≥ 1365 passed / 1 skipped (1347 prior +
  18 new).
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
- All three workflow templates (`rekon-verification.yml`,
  `rekon-verification-dry-run.yml`,
  `rekon-verification-check-send.yml`) — unchanged.
- All existing contract / docs tests — unchanged.
- The workflow validator's `--profile read-only |
  github-check-send` flag — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: memo drifts from runtime behaviour.**
  Mitigated by the docs test pinning the memo's
  language. Any future runtime change to the GitHub
  Check publisher path that contradicts the memo
  would require re-evaluating the memo's
  recommendation.
- **Risk: scope creep on the future dry-run renderer.**
  Mitigated by the memo's Implementation Sequence
  explicitly listing what the renderer ships (body +
  readiness + CLI) and what it does not (no API call,
  no token reads).
- **Follow-up — PR comment body dry-run helper (next
  slice, if approved).** Adds
  `buildPrCommentBody` +
  `assessPrCommentPublisherReadiness` to
  `@rekon/capability-docs` and the `rekon publish
  pr-comment --dry-run --json` CLI mode. Mirrors the
  step-6a / 6b shape. No GitHub API call.

## NEXT STEP

If Option B is approved:
**PR comment body dry-run helper.** Build the comment
body model and the `rekon publish pr-comment
--dry-run --json` CLI command, with no GitHub API
writes. Pin the marker
(`<!-- rekon:pr-comment:v1 -->`), the canonical-truth
phrase, the artifact-ref citation shape, and the
PR-number readiness gate. Only after that lands should
the validator / docs slice and the actual API write
be considered.

If Option B is **not** approved:
Default to Option A. Keep the GitHub Check Run +
artifact upload combination as the beta surface; no
PR comments. Operator demand can reopen the question
later.
