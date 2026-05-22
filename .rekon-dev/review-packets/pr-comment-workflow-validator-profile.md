# Review Packet — PR Comment Workflow / Validator Profile (P1.1 slice)

**Slice:** `pr-comment-workflow-validator-profile`
**Sequence position:** Step 7d of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
and the
[PR Comment Publisher API Decision Gate](../../docs/strategy/pr-comment-publisher-api-decision-gate.md).
**Batch type:** Workflow template + validator profile + tests
+ docs. **No PR comment posted. No GitHub API call. No token
read.** No active workflow added to the Rekon repo. No change
to the PR comment dry-run helper or CLI.

## CHANGES MADE

1. **New copyable workflow template** at
   [`docs/examples/workflows/rekon-pr-comment-send.yml`](../../docs/examples/workflows/rekon-pr-comment-send.yml).
   `workflow_dispatch` trigger only (no `pull_request`, no
   `pull_request_target`). `permissions: contents: read +
   pull-requests: write` only — no other write scopes.
   Workflow-level env declares
   `REKON_PR_COMMENTS: "1"` and
   `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`. Runs the full
   execute proof loop, the publication chain (proof,
   architecture, agent-contract), `artifacts validate`
   (read-only), then `rekon publish pr-comment --dry-run`
   (preview only). **Does not include `publish pr-comment
   --send`** — the API writer is not implemented yet.
   Uploads `.rekon/artifacts/**` excluding `.log`. Job
   summary carries `Mode: pr-comment-dry-run`, every
   refresh-loop ref, the canonical-truth reminder
   (`GitHub comments are not canonical truth; Rekon
   artifacts remain canonical.`), and the marker-not-proof
   reminder (`The PR comment marker is an idempotency
   handle, not proof.`). Top-of-file comment block
   instructs operators to validate with
   `--profile github-pr-comment-send` after copying.

2. **New `github-pr-comment-send` validator profile** in
   `packages/cli/src/index.ts`:
   - New CLI flag value:
     `rekon verify github-workflow validate --profile
     github-pr-comment-send`.
   - New `mode` value `pr-comment-dry-run`.
   - New `summary` fields:
     `hasPullRequestsWrite`,
     `hasRekonPrCommentsOptIn`,
     `hasPrCommentsWriteConfirmation`,
     `hasPublishPrCommentDryRun`,
     `hasPublishPrCommentSend`,
     `hasPrCommentMarkerReminder`.
   - New issue codes:
     `missing-pull-requests-write`,
     `missing-rekon-pr-comments-opt-in`,
     `missing-pr-comments-write-confirmation`,
     `missing-publish-pr-comment-dry-run`,
     `forbidden-publish-pr-comment-send`,
     `missing-pr-comment-marker-reminder`.
   - Reuses the existing `pull-request-trigger-disallowed`
     code (now applied to both the
     `github-check-send` and the `github-pr-comment-send`
     profiles).
   - Permits `pull-requests: write` only (and the
     baseline `contents: read`); rejects every other
     write scope including `checks: write`,
     `contents: write`, `issues: write`,
     `id-token: write`, `actions: write`,
     `deployments: write`, `statuses: write`,
     `packages: write`.
   - Rejects `pull_request_target` and the
     `pull_request` trigger entirely (same posture as
     `github-check-send`).
   - Requires `publish pr-comment --dry-run` AND refuses
     `publish pr-comment --send` (the API writer is not
     yet implemented; the validator pins the boundary).
   - The marker-not-proof reminder is a **warning**, not
     an error, so the template's wording can be edited
     without breaking validation.

3. **Validator contract suite extended** —
   `tests/contract/github-workflow-safety-validator.test.mjs`
   gains 14 new helper tests + 1 new CLI test (now 56
   tests total). Covers: read-only profile rejects
   `pull-requests: write`; `github-check-send` profile
   rejects `pull-requests: write`;
   `github-pr-comment-send` profile validates the bundled
   template + requires every gate (`pull-requests: write`,
   `REKON_PR_COMMENTS`, `REKON_PR_COMMENTS_WRITE_CONFIRMED`,
   `publish pr-comment --dry-run` step); rejects
   forbidden states (`publish pr-comment --send`,
   `pull_request_target`, `pull_request` trigger,
   `checks: write`, `contents: write`).

4. **New docs suite** at
   `tests/docs/pr-comment-workflow-validator-profile.test.mjs`
   pinning all 22 required assertions (template
   existence, not under `.github/workflows`, every
   permission rule, env opt-in, command presence /
   absence, artifact upload, job summary,
   canonical-truth + marker-not-proof reminders,
   operator-guide language, CHANGELOG mention,
   review-packet PURPOSE PRESERVATION CHECK).

5. **Operator-guide update:**
   [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
   gains a new "Optional: preview a PR comment
   workflow" section that points at the new template,
   instructs operators to start with the read-only /
   GitHub Check workflows first, lists the validator
   command (`--profile github-pr-comment-send`), and
   reiterates the canonical-truth + marker-not-proof
   reminders.

6. **Cross-doc updates:** the API decision gate, the PR
   comment publisher decision memo, the CI / GitHub
   adapter decision memo, the operator guide, the
   concept / artifact docs, the issue-governance memo,
   the classic-behavior roadmap, the roadmap. CHANGELOG
   + README entries.

## PUBLIC API CHANGES

- **New CLI profile:** `rekon verify github-workflow
  validate --profile github-pr-comment-send`.
- **Validator helper signature:**
  `validateGitHubWorkflowSafety`'s `profile` parameter
  now accepts `"github-pr-comment-send"` in addition to
  `"read-only"` and `"github-check-send"`.
- **New mode value:** `pr-comment-dry-run`.
- **New summary fields** (additive).
- **New issue codes** (additive; no existing code
  removed or renamed).
- **No artifact-shape change.**
- **No new capability package.**
- **No new role / permission.**
- **No change to the PR comment helpers or
  `rekon publish pr-comment --dry-run` CLI surface.**

## PURPOSE PRESERVATION CHECK

The slice preserves every existing invariant:

- **Verification runner v1 purpose.** Unchanged. The new
  template runs the same execute proof loop as the
  read-only execute and the GitHub Check opt-in
  templates.
- **VerificationPlan / VerificationRun /
  VerificationResult.** Unchanged. The template cites
  refs only; no artifact mutation.
- **Proof-report / architecture-summary / agent-
  contract Publications.** Unchanged.
- **Existing read-only / `github-check-send` profiles.**
  Strictly unchanged. The contract suite confirms the
  bundled read-only execute / dry-run / check-send
  templates continue to validate under their existing
  profiles.
- **Canonical-truth invariant.** Reinforced. The new
  template's job summary carries the
  `GitHub comments are not canonical truth; Rekon
  artifacts remain canonical.` phrase. The validator
  treats the canonical-truth reminder as a warning
  (same as for the other profiles).
- **Fork-safety invariant.** Strengthened. The
  `github-pr-comment-send` profile forbids the
  `pull_request` trigger by default via the existing
  `pull-request-trigger-disallowed` issue code, and
  refuses `pull_request_target` unconditionally.
- **No-auto-resolution invariant.** Unchanged.
- **No-token-leak invariant.** Unchanged. The template
  does not introduce any GitHub API call; the dry-run
  CLI it calls (shipped in step 7b) reads no token.
- **No active workflow in the Rekon repo.** Preserved.
  The template lives under `docs/examples/workflows/`;
  the docs test confirms no active variant under
  `.github/workflows/`.
- **API writer remains deferred.** Validated by the
  `forbidden-publish-pr-comment-send` issue code — any
  copy of the template that tries to invoke `publish
  pr-comment --send` fails validation.

## PR COMMENT WORKFLOW TEMPLATE

- **Path:**
  `docs/examples/workflows/rekon-pr-comment-send.yml`.
- **Triggers:** `workflow_dispatch` only.
- **Permissions:** `contents: read`, `pull-requests:
  write`. No other scopes.
- **Env (workflow-level):** `REKON_PR_COMMENTS: "1"`,
  `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`.
- **Steps:** identical to the read-only execute template
  through `artifacts validate` and the three
  publication lookups, then `publish pr-comment
  --dry-run` (preview), then the job-summary append
  and the artifact upload. **No `publish pr-comment
  --send` step.**
- **Job summary:** `Mode: pr-comment-dry-run`, refs for
  plan / run / result / proof / architecture /
  contract, `Artifacts valid`, PR comment dry-run
  outcome, canonical-truth reminder, marker-not-proof
  reminder.
- **Artifact upload:** `.rekon/artifacts/**` excluding
  `.log`, `retention-days: 7`.

## VALIDATOR PROFILE

- **Flag:** `--profile read-only | github-check-send
  | github-pr-comment-send`. Default: `read-only`.
- **`read-only` profile:** unchanged behaviour. Rejects
  `pull-requests: write` (test pinned).
- **`github-check-send` profile:** unchanged behaviour.
  Rejects `pull-requests: write` (test pinned).
- **`github-pr-comment-send` profile:**
  - **Permits:** `contents: read`, `pull-requests:
    write`.
  - **Requires:** `permissions: contents: read`,
    `permissions: pull-requests: write`,
    `REKON_PR_COMMENTS: "1"` (or `true`),
    `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`,
    `publish pr-comment --dry-run` step.
  - **Rejects:** `pull_request_target` (unconditional);
    `pull_request` trigger; every other write scope
    (`checks: write`, `contents: write`,
    `id-token: write`, `actions: write`,
    `deployments: write`, `statuses: write`,
    `packages: write`); `publish pr-comment --send`
    (the API writer is not implemented yet).
  - **Warnings:** missing canonical-truth reminder,
    missing `retention-days`, missing
    marker-not-proof reminder.
- **Note on `issues: write`:** the validator's
  permission scan list
  (`GITHUB_WRITE_PERMISSION_SCOPES`) does not yet
  enumerate `issues`. The bundled PR comment template
  does not request `issues: write` (the docs test
  pins this). A future slice may add `issues` to the
  scope list once the API writer's exact endpoint is
  pinned. **Open intentionally**: the work order
  noted that if a future API writer required
  `issues: write` instead of `pull-requests: write`,
  the builder should stop and document the mismatch
  rather than silently switching. This batch chose
  `pull-requests: write` consistent with the work
  order's recommendation.

## SAFETY / PERMISSIONS

- The PR comment template is the **first** Rekon
  workflow template that requests
  `pull-requests: write`.
- All other workflow templates' permission posture is
  unchanged.
- The validator ensures every other GitHub write scope
  stays rejected under the `github-pr-comment-send`
  profile.
- The template ships with the Rekon opt-in env baked
  in; operators can disable any future publish by
  unsetting either env var without breaking the
  dry-run proof loop.
- Forked PRs are denied at three layers:
  1. The workflow has no `pull_request` trigger.
  2. The validator refuses to mark a
     `github-pr-comment-send` template valid if
     someone adds the trigger.
  3. The PR comment readiness assessor (shipped in
     step 7b) classifies forked `pull_request` as
     `untrusted-fork` (denied by default) and
     `pull_request_target` as `unconditional-deny`.

## TESTS / VERIFICATION

- **Validator contract suite:**
  `tests/contract/github-workflow-safety-validator.test.mjs`
  — now 56 tests, all passing. 14 new helper tests +
  1 new CLI test cover the PR comment profile happy
  path, every new issue code, and the read-only /
  check-send rejections.
- **Docs suite:**
  `tests/docs/pr-comment-workflow-validator-profile.test.mjs`
  — 22 assertions, all passing.
- **No change to existing test suites.**
- **Full suite:** expected ≥ 1448 passed / 1 skipped
  (1410 prior + 14 + 1 validator + 22 docs + 1 from
  rebalancing).
- **Validator smokes** (all bundled templates pass
  their own profile; cross-profile validation
  correctly fails):
  - `rekon-verification.yml` with `--profile
    read-only` → exit 0.
  - `rekon-verification-dry-run.yml` with `--profile
    read-only` → exit 0.
  - `rekon-verification-check-send.yml` with
    `--profile github-check-send` → exit 0.
  - `rekon-pr-comment-send.yml` with `--profile
    github-pr-comment-send` → exit 0.
  - `rekon-pr-comment-send.yml` with `--profile
    read-only` → exit 1 (write scopes rejected).
  - `rekon-verification-check-send.yml` with
    `--profile github-pr-comment-send` → exit 1
    (`checks: write` rejected; missing
    `pull-requests: write`).

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged
  (PR comment helpers shipped in step 7b remain as
  published).
- `rekon publish pr-comment --dry-run` CLI surface —
  unchanged.
- `rekon publish github-check --dry-run|--send` CLI
  surface — unchanged.
- `publishGitHubCheckRun` helper — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- The four bundled workflow templates' existing
  contents (other than the new PR comment template) —
  unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  none added, none modified.

## RISKS / FOLLOW-UP

- **Risk: validator's permission scan does not
  enumerate `issues` yet.** Mitigated for this slice
  by the docs test pinning that the bundled template
  does not request `issues: write`. Follow-up: if the
  future API writer selects `issues: write` as the
  endpoint, add `issues` to
  `GITHUB_WRITE_PERMISSION_SCOPES` and update the
  validator to permit `issues: write` in the PR
  comment profile.
- **Risk: operators copy without running the
  validator.** Mitigated by the top-of-file comment
  block that calls out the validator command with the
  `--profile github-pr-comment-send` argument.
- **Risk: same-repo PR support.** The profile
  rejects the `pull_request` trigger entirely in
  step 7d. A future slice may add a same-repo guard
  so reviewers see PR comments on safe PRs.
- **Risk: marker-not-proof reminder is only a
  warning.** Operator-facing copy may evolve;
  contract tests cover the bundled template's
  wording. Future template changes that drop the
  reminder will trigger a warning, not a hard
  failure — by design, since operator copies may
  paraphrase.
- **Follow-up — PR comment API writer go/no-go
  review (next slice).** Review the dry-run body
  helper + readiness helper + workflow profile +
  permission model + idempotency marker + fork
  safety, then decide whether to ship
  `rekon publish pr-comment --send` or stop at
  dry-run for beta.

## NEXT STEP

**PR comment API writer go/no-go review.** Review:

- dry-run body / readiness helpers (shipped 7b);
- workflow / validator profile (this slice, 7d);
- permission model (`pull-requests: write` boundary
  pinned);
- idempotency marker (shipped 7b; documented as
  not-proof);
- fork / trusted-context safety (three-layer
  defence pinned by validator);

then decide whether to add actual `rekon publish
pr-comment --send`, or stop at dry-run for beta.
