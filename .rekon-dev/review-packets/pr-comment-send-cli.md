# Review Packet — PR Comment API Writer (P1.1 slice)

**Slice:** `pr-comment-send-cli`
**Sequence position:** Step 7f of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
and the
[PR Comment API Writer Go/No-Go Review](../../docs/strategy/pr-comment-api-writer-go-no-go-review.md).
**Batch type:** Helper + CLI + workflow template + validator
profile + tests + docs. **First Rekon GitHub PR-comment write
surface.** No `.github/workflows/*.yml` added to the Rekon
repo itself.

## CHANGES MADE

1. **New helper** in `@rekon/capability-docs`:
   `publishPrCommentRun(input)` — parallel to
   `publishGitHubCheckRun`. Uses Node's built-in `fetch`. Lists
   PR timeline comments via
   `GET /repos/{owner}/{repo}/issues/{n}/comments`
   paginated (`per_page=100`, bounded at 20 pages), filters by
   the marker `<!-- rekon:pr-comment:v1 -->`, PATCHes the
   first match via
   `PATCH /repos/{owner}/{repo}/issues/comments/{id}`, or
   POSTs a new comment via
   `POST /repos/{owner}/{repo}/issues/{n}/comments` when no
   match exists. Never deletes reviewer-touched comments.
   Bounded response-body reads (≤ 64 KiB). New exported
   error class `PrCommentPublishError`
   (`{ status, message, documentationUrl }`); the token is
   never echoed.
2. **New CLI mode:** `rekon publish pr-comment --send
   [--root <path>] [--pr-number <n>]
   [--confirm-pr-comment-write] [--api-base-url <url>]
   [--json]`. Mutually exclusive with `--dry-run`; passing
   both or neither is exit 1. Refuses `--execute`/`--publish`
   aliases. Reads `process.env` only in the `--send` branch.
   Exit 0 on API success regardless of underlying proof
   status; exit 1 on readiness failure or API error.
3. **Workflow template update** at
   [`docs/examples/workflows/rekon-pr-comment-send.yml`](../../docs/examples/workflows/rekon-pr-comment-send.yml):
   adds a required `workflow_dispatch` input `pr-number`;
   runs `publish pr-comment --dry-run` (preview) **then**
   `publish pr-comment --send --confirm-pr-comment-write
   --pr-number "${{ inputs.pr-number }}"` (actual write).
4. **Validator profile update** — `github-pr-comment-send`
   now requires the `--send` step and the
   `--confirm-pr-comment-write` flag. New issue codes:
   `missing-publish-pr-comment-send`,
   `missing-confirm-pr-comment-write-flag`. The previously
   emitted `forbidden-publish-pr-comment-send` code has been
   retired. New mode value: `pr-comment-send`. New summary
   field: `hasConfirmPrCommentWriteFlag`.
5. **Contract tests** at
   `tests/contract/pr-comment-send-cli.test.mjs` (19 tests)
   using a local `node:http` fake server + `--api-base-url`.
6. **Validator contract suite extended** —
   `tests/contract/github-workflow-safety-validator.test.mjs`
   now 57 tests (was 56). Two prior assertions updated for
   the new template wiring; one new assertion added for the
   `--confirm-pr-comment-write` flag requirement; one new
   assertion added for the `--send` step requirement.
7. **Docs test** at
   `tests/docs/pr-comment-send-cli.test.mjs` (9 assertions).
8. **One prior docs assertion updated** in
   `tests/docs/pr-comment-workflow-validator-profile.test.mjs`
   (assertion #14 flipped from "must NOT include --send" to
   "must include --send + --confirm-pr-comment-write").
9. **Cross-doc updates:** the go/no-go review memo flips 7f
   to ✅; the API decision gate Implementation Sequence; the
   PR comment publisher decision memo step 7f flipped to ✅;
   the CI / GitHub adapter decision memo step 7f flipped to
   ✅; the operator guide rewritten for the new send wiring;
   classic-behavior roadmap entry inserted; master roadmap
   entry inserted; governance memo step 56 added. README +
   CHANGELOG updated.

## PUBLIC API CHANGES

- **New exports from `@rekon/capability-docs`:**
  - `publishPrCommentRun(input)` async helper.
  - `PrCommentPublishError` class (`{ status, message,
    documentationUrl }`).
  - `PR_COMMENT_PUBLISHER_DEFAULT_API_BASE_URL` constant.
  - `PR_COMMENT_PUBLISHER_DEFAULT_API_VERSION` constant.
  - `PR_COMMENT_PUBLISHER_USER_AGENT` constant.
  - `PR_COMMENT_PUBLISHER_MAX_PAGES` constant (20).
  - `PR_COMMENT_PUBLISHER_PAGE_SIZE` constant (100).
  - `PrCommentPublishInput` type.
  - `PrCommentPublishResult` type.
- **New CLI mode:** `rekon publish pr-comment --send`.
- **New CLI flags** on `publish pr-comment`:
  `--send`, `--pr-number <n>`, `--confirm-pr-comment-write`,
  `--api-base-url <url>`. `--dry-run` remains the only
  alternative; both still print `--json` output when asked.
- **Validator changes:**
  - New mode value `pr-comment-send`.
  - New issue codes `missing-publish-pr-comment-send`,
    `missing-confirm-pr-comment-write-flag`.
  - Retired issue code `forbidden-publish-pr-comment-send`.
  - New summary field `hasConfirmPrCommentWriteFlag`.
- **No artifact-shape change.**
- **No new capability package.**
- **No new role / permission.**
- **No change to the dry-run CLI shape** (still
  `kind: "rekon.pr-comment.dry-run"` JSON output).

## PURPOSE PRESERVATION CHECK

The slice preserves every existing invariant:

- **Verification runner v1 purpose.** Unchanged.
- **VerificationPlan / VerificationRun /
  VerificationResult.** Unchanged. The CLI cites refs by id
  only; no artifact mutation. The artifact index is
  byte-identical before and after a `--send` run (pinned by
  contract test #17).
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **`buildPrCommentBody` / `assessPrCommentPublisherReadiness`.**
  Unchanged.
- **`rekon publish pr-comment --dry-run`.** Unchanged
  behaviour. Still reads no token, calls no network,
  receives an empty env map.
- **GitHub Check publisher path.** Unchanged.
- **Read-only / `github-check-send` validator profiles.**
  Unchanged.
- **Other workflow templates.** Unchanged.
- **Canonical-truth invariant.** Reinforced. The send body
  carries `GitHub comments are not canonical truth; Rekon
  artifacts remain canonical.` (same body shape as dry-run).
- **Marker-not-proof invariant.** Reinforced. The marker is
  used only as an identity handle for update-in-place; the
  body cites canonical artifact refs by id.
- **Fork-safety invariant.** Strengthened. Forked PRs are
  denied at three layers (workflow template
  `workflow_dispatch` only, validator profile refuses the
  `pull_request` trigger, runtime readiness assessor
  classifies forked PRs as `untrusted-fork`).
  `pull_request_target` is denied unconditionally.
- **No-auto-resolution invariant.** Unchanged. The send body
  is a downstream surface; no finding is auto-resolved by
  the publisher, and no reconciliation is auto-applied.
- **No-token-leak invariant.** Reinforced. Sentinel-token
  contract test (#11) pins that the configured sentinel
  never appears in stdout / stderr regardless of API error.
- **No-raw-logs invariant.** Unchanged. The body renders
  `buildPrCommentBody` output only — same redacted /
  bounded content as the dry-run preview.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see artifact-
  backed proof at the decision point. The PR comment is a
  downstream review surface citing canonical refs.
- **Classic anti-pattern avoided:** the comment body
  carries `GitHub comments are not canonical truth; Rekon
  artifacts remain canonical.` verbatim; the marker is
  pinned as an idempotency handle, not proof.
- **Capability map:** unchanged.
- **Conformance:** unchanged.
- **Existing read-only / check-send templates and their
  validator profiles:** unchanged.

## SEND GATE

`rekon publish pr-comment --send` refuses unless every
readiness gate clears:

- `REKON_PR_COMMENTS` set to `1` / `true`.
- `GITHUB_REPOSITORY` present (parsed as `owner/repo`).
- PR number present (`--pr-number <n>`, then
  `GITHUB_PR_NUMBER`, then `PR_NUMBER`).
- `GITHUB_TOKEN` present.
- Event is trusted:
  - `workflow_dispatch` / `push` → trusted.
  - same-repo `pull_request` → trusted; forked
    `pull_request` → `untrusted-fork` (denied by default).
  - `pull_request_target` → `unconditional-deny`.
- Write permission confirmed via
  `--confirm-pr-comment-write` flag OR
  `REKON_PR_COMMENTS_WRITE_CONFIRMED=1`.

Readiness failure: no network call, prints the issue list,
exits 1.

## GITHUB API CLIENT

- **Transport:** Node's built-in `fetch`. No third-party
  HTTP client. Bundled headers:
  - `Authorization: Bearer <token>`,
  - `Accept: application/vnd.github+json`,
  - `Content-Type: application/json`,
  - `User-Agent: rekon-verification-runner`,
  - `X-GitHub-Api-Version: 2022-11-28`,
  - `Connection: close`.
- **Keep-alive:** explicitly disabled (`keepalive: false`)
  so the CLI exits promptly.
- **Bounded body reads:** at most 64 KiB of any response
  body is retained; the rest is truncated with `…
  [truncated]`.
- **Sanitized errors:** non-2xx responses produce
  `PrCommentPublishError({ status, message,
  documentationUrl })`. The CLI sanitizer (`sanitizePrCommentSendError`)
  copies only these three fields. The token never appears
  in the error.
- **Pagination:** bounded at `PR_COMMENT_PUBLISHER_MAX_PAGES`
  (20). Each page uses `per_page=100`. If pagination
  exhausts without finding a marker, the helper throws
  rather than silently POSTing a duplicate.

## IDEMPOTENCY MODEL

- **Marker:** `<!-- rekon:pr-comment:v1 -->` (constant
  `PR_COMMENT_PUBLISHER_MARKER`). Rendered at line 1 of
  every body by `buildPrCommentBody`.
- **List → match → PATCH or POST:**
  1. List comments page-by-page, stopping early when the
     marker is found or when a page returns fewer than 100
     items.
  2. **First marker match:** PATCH that comment with the
     freshly rendered body. Action: `"updated"`.
  3. **No match after the bounded walk:** POST a new
     comment. Action: `"created"`.
  4. **Multiple matches (e.g., reviewer manually duplicated
     a Rekon comment):** PATCH only the first match. Other
     copies are left alone — the publisher never deletes
     reviewer-touched comments.
- **Marker is not proof.** It is only an identity handle.
  The canonical proof state lives in the cited artifacts.

## WORKFLOW / VALIDATOR UPDATE

- **Template** `rekon-pr-comment-send.yml`:
  - `workflow_dispatch` trigger only, with a required
    `pr-number` input.
  - `permissions: contents: read + pull-requests: write`
    only.
  - Workflow-level env: `REKON_PR_COMMENTS: "1"` +
    `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`.
  - Steps: standard execute proof loop → publications →
    `artifacts validate` → `publish pr-comment --dry-run`
    (preview) → `publish pr-comment --send
    --confirm-pr-comment-write --pr-number "${{ inputs.pr-number }}"`
    → job summary → upload `.rekon/artifacts/**` excluding
    `.log`.
  - Job summary updated: `Mode: pr-comment-send`, PR
    number, both step outcomes, canonical-truth reminder,
    marker-not-proof reminder.
- **Validator profile** `github-pr-comment-send`:
  - Still permits only `contents: read` +
    `pull-requests: write`. All other write scopes refused
    (including `checks: write`, `issues: write`,
    `contents: write`, etc.).
  - Still refuses `pull_request_target` + the
    `pull_request` trigger.
  - Now REQUIRES both the dry-run step and the `--send`
    step + `--confirm-pr-comment-write` flag.
  - Issue codes
    `missing-publish-pr-comment-send` and
    `missing-confirm-pr-comment-write-flag` added; the
    retired `forbidden-publish-pr-comment-send` code has
    been removed from the implementation.

## TESTS / VERIFICATION

- **New contract suite:**
  `tests/contract/pr-comment-send-cli.test.mjs` — 19
  tests, all passing. Uses a local `node:http` fake
  server + `--api-base-url` redirection. Covers
  readiness gates (5 issue codes + 1 event); create-on-
  no-marker; update-on-marker; pagination walk;
  no-duplicate-when-marker-present; request-path
  mapping; sanitized errors with sentinel-token leak
  check; exit 0 on API success regardless of proof
  status; canonical-truth reminder in output;
  `--dry-run` still no-token / no-network even with
  `--api-base-url` set; mutual exclusion; missing-both
  error; artifact index byte-identical before / after
  `--send`; refuses `--execute` / `--publish`; usage
  line registered.
- **Validator contract suite extended:**
  `tests/contract/github-workflow-safety-validator.test.mjs`
  now 57 tests (was 56).
- **Existing docs suite updated:**
  `tests/docs/pr-comment-workflow-validator-profile.test.mjs`
  remains at 22 tests; assertion #14 flipped.
- **New docs suite:**
  `tests/docs/pr-comment-send-cli.test.mjs` — 9
  assertions, all passing.
- **Existing tests still passing:** the GitHub Check
  publisher suite, the PR comment dry-run CLI suite,
  every other test file. Full suite expected ≥ 1492
  passed / 1 skipped.
- **Audits / smokes:** package-exports, license,
  install-smoke, install-tarball-smoke,
  publish-dry-run — all expected to pass.
- **CLI smoke:** `rekon publish pr-comment --send`
  without `GITHUB_TOKEN` exits 1 cleanly with no
  network call (validated locally + by contract tests).

## INTENTIONALLY UNTOUCHED

- `buildPrCommentBody` / `assessPrCommentPublisherReadiness`
  — unchanged.
- `publishGitHubCheckRun` / GitHub Check publisher path —
  unchanged.
- `rekon publish github-check --send` CLI — unchanged.
- `rekon publish pr-comment --dry-run` CLI behaviour —
  unchanged (still no-token / no-network).
- Read-only workflow templates
  (`rekon-verification.yml`,
  `rekon-verification-dry-run.yml`) — unchanged.
- Check-send workflow template
  (`rekon-verification-check-send.yml`) — unchanged.
- `read-only` and `github-check-send` validator profiles —
  unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- `.github/workflows/*.yml` in the Rekon repo — none
  added; none modified (the repo itself still does not
  install any active workflow).

## RISKS / FOLLOW-UP

- **Risk: token leak via misbehaving response body.**
  Mitigated by bounded response reads (≤ 64 KiB) +
  sanitized error class + sentinel-token contract test.
  Follow-up: contract tests already exercise a 64-KiB
  body in the GitHub Check publisher suite; future PR
  comment retry slice should re-pin this.
- **Risk: rate-limit failure leaves the comment stale.**
  Acceptable for v1. The CLI fails with the API's
  sanitized message + `documentation_url`; operators
  re-run the workflow. Bounded retry is paged for a
  follow-up slice (deferred until 7g).
- **Risk: pagination cap (20 pages × 100 comments) is
  exhausted on a hot PR.** Acceptable for v1. The helper
  throws rather than silently POSTing a duplicate; the
  operator sees the error and can either prune comments
  or raise the cap in a follow-up slice.
- **Risk: reviewer manually edits / deletes the Rekon
  comment.** Acceptable. Edits are overwritten on the
  next run (PATCH-in-place); deletions cause the next
  run to re-POST. The publisher never deletes
  reviewer-touched comments.
- **Risk: same-repo PRs reject by default.** The
  `github-pr-comment-send` profile refuses the
  `pull_request` trigger entirely. Follow-up
  (deferred): add a same-repo guard so reviewers see
  PR comments on safe PRs without requiring
  `workflow_dispatch`.
- **Follow-up — PR comment safety review (step 7g).**
  Walk the full PR comment publishing path end-to-end
  (helper, readiness, dry-run CLI, send CLI, workflow
  template, validator profile, fake-API contract
  tests) and confirm beta-readiness or surface
  remaining blockers. Parallel to the GitHub Check
  publisher safety review.

## NEXT STEP

**PR comment publisher safety review (step 7g).**

Review the full path:
- body helper (`buildPrCommentBody`);
- readiness helper (`assessPrCommentPublisherReadiness`);
- dry-run CLI (`publish pr-comment --dry-run`);
- send CLI (`publish pr-comment --send`);
- workflow template (`rekon-pr-comment-send.yml`);
- validator profile (`github-pr-comment-send`);
- contract tests (`pr-comment-send-cli.test.mjs`,
  `github-workflow-safety-validator.test.mjs`,
  docs suites).

Decide whether the PR comment surface is beta-ready or
should remain opt-in experimental. Parallel to the
GitHub Check publisher safety review.
