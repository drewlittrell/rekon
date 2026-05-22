# PR Comment Publisher Safety Review

## Decision Summary

**The PR comment publisher send path is beta-ready as
an opt-in, trusted-context-only, update-in-place
review surface.** It is **not** an alpha default and
must not be installed automatically.

- Read-only templates
  ([`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml),
  [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml))
  remain the **recommended alpha default**. They
  declare only `permissions: contents: read`, make no
  GitHub API calls, and ship the canonical proof loop
  + artifact upload + job-summary surface without any
  write-side risk.
- The opt-in GitHub Check workflow template
  ([`docs/examples/workflows/rekon-verification-check-send.yml`](../examples/workflows/rekon-verification-check-send.yml))
  remains the **primary** beta-tier review surface.
  Its safety review
  ([`github-check-publisher-send-workflow-safety-review.md`](github-check-publisher-send-workflow-safety-review.md))
  approved it as beta-ready in step 6e.
- The opt-in PR comment workflow template
  ([`docs/examples/workflows/rekon-pr-comment-send.yml`](../examples/workflows/rekon-pr-comment-send.yml))
  is **beta-tier and complementary**: operators copy
  it deliberately, accept the `pull-requests: write`
  scope, and set `REKON_PR_COMMENTS: "1"` +
  `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"` at the
  workflow level. The workflow validator's
  `github-pr-comment-send` profile pins every gate.
  The template is `workflow_dispatch` only and
  requires a `pr-number` input.
- The send CLI (`rekon publish pr-comment --send`) is
  default-deny. It is the only CLI branch that reads
  `process.env.GITHUB_TOKEN` on the PR comment path.
  Token reads never echo into stdout / stderr.
  Forked PRs are denied by default;
  `pull_request_target` is denied unconditionally.

**GitHub Checks remain the primary status surface;
PR comments are a narrative companion surface.** The
two are intentionally complementary: the Check is the
status chip beside the commit; the PR comment is the
persistent narrative in the PR conversation timeline.
Each can ship independently.

**Pinned reminders carried forward:**

- **PR comments are not canonical truth; Rekon
  artifacts remain canonical.** Every PR comment body
  carries this phrase verbatim, every operator-facing
  doc repeats it, and the workflow validator emits a
  warning when the phrase is missing from a copied
  workflow.
- **The idempotency marker is not proof; it is only
  an update-in-place handle.** Repeated in the body
  helper's renderer, the workflow template's job
  summary, and the validator's marker-reminder
  warning.
- **Forked PRs and `pull_request_target` remain
  blocked by default** — at three layers (workflow
  trigger list, validator's `github-pr-comment-send`
  profile, runtime readiness assessor inside the
  send CLI).
- **No automatic finding resolution or reconciliation
  apply is implied by a successful PR comment
  publish.** The comment is a downstream rendering of
  the existing artifacts; resolving a finding still
  requires the operator's deliberate action.

## Why This Review Exists

Steps 7a–7f landed the full PR comment publishing
path. The staged six-slice discipline used by the
GitHub Check publisher landed identically here:

1. **PR Comment Publisher Decision Memo (7a).**
   Picked Option B (dry-run renderer first; defer
   posting).
2. **PR comment body dry-run helper + CLI (7b).**
   `buildPrCommentBody`,
   `assessPrCommentPublisherReadiness`, and
   `rekon publish pr-comment --dry-run`. No API call.
3. **PR Comment Publisher API Decision Gate (7c).**
   Picked Option C (build the workflow / validator
   profile boundary first).
4. **PR comment workflow / validator profile (7d).**
   Shipped
   `docs/examples/workflows/rekon-pr-comment-send.yml`
   + the `github-pr-comment-send` validator profile.
5. **PR Comment API Writer Go/No-Go Review (7e).**
   Picked Option B (Go — proceed to writer).
6. **PR comment API writer (7f).** Shipped
   `publishPrCommentRun` + `rekon publish pr-comment
   --send` + workflow template wiring + validator
   profile update.

This review is the **safety-review gate** before
declaring the PR comment publisher beta-ready end-to-
end. It parallels the GitHub Check publisher's safety
review (step 6e) for the same reason: the path is
complete, but the question of whether it's safe to
recommend hinges on whether every guardrail is
actually pinned by tests and operator-facing docs.

Skipping this review would collapse three distinct
questions (per-component safety, end-to-end safety,
operator-facing safety) into "the writer shipped, so
it's done." This memo asks each explicitly.

## Components Reviewed

1. **`buildPrCommentBody(input)`** (shipped 7b). Pure
   function. Renders the markdown body with the
   idempotency marker, the canonical-truth reminder,
   artifact citations, and tailored warnings + next
   steps. No I/O, no env reads, no network. Contract
   tests pin: marker presence, canonical-truth
   presence, citation completeness, artifacts-valid
   surface, stale-proof warning, no-stdout/stderr
   leak, no-token leak.
2. **`assessPrCommentPublisherReadiness(input)`**
   (shipped 7b). Pure function. Returns
   `{ ready, issues[] }` from a caller-provided env
   map + event classification + write-permission
   confirmation. Six issue codes:
   `not-enabled`, `missing-repository`,
   `missing-pr-number`, `missing-token`,
   `untrusted-event`,
   `write-permission-not-confirmed`.
3. **`publishPrCommentRun(input)`** (shipped 7f).
   API writer. Lists comments paginated
   (`per_page=100`, bounded at 20 pages), filters by
   the marker, PATCHes the first match or POSTs when
   no match. Uses Node's built-in `fetch`; no
   third-party network client. Sanitized error class
   `PrCommentPublishError`
   (`{ status, message, documentationUrl }`); token
   never echoed. Bounded response-body reads
   (≤ 64 KiB).
4. **`rekon publish pr-comment --dry-run`** (shipped
   7b). The CLI surface that exercises the body +
   readiness helpers without any network call.
   `--dry-run` and `--send` are now mutually
   exclusive; `--publish` / `--execute` aliases
   refused. The readiness assessor receives an empty
   env map; the CLI never reads
   `process.env.GITHUB_TOKEN` in this branch. 19
   contract tests + 9 docs assertions pin every
   guardrail.
5. **`rekon publish pr-comment --send`** (shipped
   7f). The actual API write mode behind the
   readiness gate. Reads `process.env` (`GITHUB_TOKEN`,
   `GITHUB_REPOSITORY`, `GITHUB_PR_NUMBER` /
   `PR_NUMBER`, `REKON_PR_COMMENTS`,
   `REKON_PR_COMMENTS_WRITE_CONFIRMED`, event context)
   only in the `--send` branch. Requires
   `--confirm-pr-comment-write` (flag) or
   `REKON_PR_COMMENTS_WRITE_CONFIRMED=1` (env). PR
   number from `--pr-number <n>` then env. Exit 0 on
   API success regardless of underlying proof status;
   exit 1 on readiness failure or API error. 19
   contract tests using a local `node:http` fake
   server + `--api-base-url` pin every guardrail.
6. **`docs/examples/workflows/rekon-pr-comment-send.yml`**
   (shipped 7d, extended 7f).
   `workflow_dispatch` trigger only, with a required
   `pr-number` input. `permissions: contents: read +
   pull-requests: write` only. Workflow-level env
   declares `REKON_PR_COMMENTS: "1"` +
   `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`. Runs the
   full execute proof loop, the publication chain,
   `artifacts validate` (read-only), then
   `publish pr-comment --dry-run` (preview), then
   `publish pr-comment --send
   --confirm-pr-comment-write --pr-number ...`
   (actual write). Uploads `.rekon/artifacts/**`
   excluding `.log`. Job summary carries
   `Mode: pr-comment-send`, the canonical-truth
   reminder, and the marker-not-proof reminder.
7. **`github-pr-comment-send` validator profile**
   (shipped 7d, extended 7f). Permits
   `pull-requests: write` only (plus baseline
   `contents: read`). Rejects every other write
   scope, including `checks: write`,
   `contents: write`, `id-token: write`,
   `actions: write`, `deployments: write`,
   `statuses: write`, `packages: write`. Refuses
   `pull_request_target` + the `pull_request`
   trigger. Requires the Rekon opt-in env + both the
   `publish pr-comment --dry-run` step and the
   `--send` step + `--confirm-pr-comment-write` flag.
   The marker-not-proof reminder is a warning. 57
   validator contract tests pin every rule + every
   cross-profile rejection.
8. **Idempotency marker model.**
   `<!-- rekon:pr-comment:v1 -->` rendered at line 1
   of every body. The writer searches for the marker
   when listing comments; the validator emits a
   warning when the marker-not-proof reminder is
   missing from a copied workflow.
9. **Pagination / update-in-place behavior.** Bounded
   at 20 pages × 100 comments per page = 2000
   comments inspected. The writer PATCHes the first
   marker match (action: `"updated"`) or POSTs when
   no match (action: `"created"`). When the bounded
   walk exhausts without finding a marker, the writer
   throws rather than silently POSTing a duplicate.
   The writer never deletes reviewer-touched
   comments.
10. **Token / error sanitization behavior.**
    `PrCommentPublishError` carries only
    `{ status, message, documentationUrl }`. The CLI
    sanitizer (`sanitizePrCommentSendError`) copies
    only these three fields. A sentinel-token
    contract test confirms the configured sentinel
    never appears in stdout / stderr regardless of
    API error or fake-server behaviour. The dry-run
    branch reads no token and calls no network even
    when `--api-base-url` is set.
11. **Fork / `pull_request` / `pull_request_target`
    behavior.** Three-layer defence:
    - **Workflow template:** trigger list contains
      only `workflow_dispatch`.
    - **Validator profile:** rejects
      `pull_request_target` (unconditional) and the
      `pull_request` trigger
      (`pull-request-trigger-disallowed`).
    - **Runtime readiness:** the assessor classifies
      forked `pull_request` events as
      `untrusted-fork` (denied by default) and
      `pull_request_target` as `unconditional-deny`.
      The CLI does not expose `forkOverride`.
    - **GitHub Actions itself** denies write tokens
      to forked-PR workflows unless the
      repository-level toggle is on (off by default).
12. **Canonical artifact boundary.** The send body
    cites refs by id (the dry-run renderer already
    does this). The CLI does not mutate any Rekon
    artifact; the artifact index is byte-identical
    before and after a `--send` run (pinned by
    contract test). The comment carries the
    canonical-truth phrase verbatim. If an operator
    deletes the PR comment manually, the proof state
    in `.rekon/artifacts` is unaffected. The comment
    is disposable; the artifacts are not.
13. **Test coverage.** New contract suite for the
    send CLI (19 tests); validator contract suite
    extended to 57; new docs suite for the send CLI
    (9 assertions); prior contract / docs suites
    still passing. Full suite stands at 1494 passed
    / 1 skipped at step 7f.

## Pinned Safety Facts

Each of the following is pinned by an existing test
or doc; none is invented for this review.

| Fact | Pin |
| --- | --- |
| `publishPrCommentRun` PATCHes on marker match | `tests/contract/pr-comment-send-cli.test.mjs` (`--send updates an existing marker comment (PATCH, no POST)`) |
| `publishPrCommentRun` POSTs on marker miss | `tests/contract/pr-comment-send-cli.test.mjs` (`--send creates a new comment when no marker match is found`) |
| Pagination is bounded | `PR_COMMENT_PUBLISHER_MAX_PAGES = 20`; helper throws when cap is reached without a marker |
| Pagination walks multiple pages | `tests/contract/pr-comment-send-cli.test.mjs` (`--send walks pages until it finds the marker, then PATCHes`) |
| Token never echoed in errors | `tests/contract/pr-comment-send-cli.test.mjs` (`--send sanitizes API errors and never leaks the token`) — sentinel-token leak check |
| Dry-run reads no token | `tests/contract/pr-comment-send-cli.test.mjs` (`--dry-run does not call the fake server even when api-base-url is set`) |
| Dry-run makes no network call | Same test (above) + the source-scan test confirms no network client import in the dry-run branch |
| Send is readiness-gated | 5 readiness-fail tests (`not-enabled`, `missing-token`, `missing-pr-number`, no `--confirm`, `pull_request_target`) |
| Send requires PR number | `tests/contract/pr-comment-send-cli.test.mjs` (`--send without PR number refuses with missing-pr-number issue`) |
| Send requires write confirmation | `tests/contract/pr-comment-send-cli.test.mjs` (`--send without --confirm-pr-comment-write and without env confirm refuses`) |
| Workflow template is `workflow_dispatch` only | `tests/docs/pr-comment-workflow-validator-profile.test.mjs` + the validator's `pull-request-trigger-disallowed` rule |
| Workflow template requests `pull-requests: write` only | Validator profile rejects every other write scope (57 contract tests cover the cross-scope rejections) |
| Validator profile rejects `pull_request` + `pull_request_target` | `tests/contract/github-workflow-safety-validator.test.mjs` (`github-pr-comment-send profile rejects pull_request_target` + `... rejects pull_request trigger`) |
| Validator profile rejects `checks: write` / `issues: write` / `contents: write` | Same suite (`github-pr-comment-send profile rejects checks: write` + `... rejects issues: write` + `... rejects contents: write`) |
| Tests use fake `node:http` server, not real GitHub | `tests/contract/pr-comment-send-cli.test.mjs` `createFakePrCommentServer` helper |
| Artifact index is byte-identical before / after send | `tests/contract/pr-comment-send-cli.test.mjs` (`artifact index is byte-identical before and after --send`) |

**Every fact in the work order's "required facts" list
is test-pinned.** No follow-up test is required for
the safety review itself.

## Workflow Template Review

[`docs/examples/workflows/rekon-pr-comment-send.yml`](../examples/workflows/rekon-pr-comment-send.yml)

- **Triggers:** `workflow_dispatch` only with a
  required `pr-number` string input. No
  `pull_request`. No `pull_request_target`.
- **Permissions:** `contents: read` +
  `pull-requests: write`. No other GitHub write
  scopes.
- **Env (workflow-level):** `REKON_PR_COMMENTS: "1"`,
  `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`.
- **Steps:**
  1. checkout + Node.js + `npm ci` + `npm run build`.
  2. `rekon refresh`.
  3. resolve latest `VerificationPlan` →
     `verify run --execute` → resolve latest
     `VerificationRun` → `verify result from-run`
     → resolve latest `VerificationResult`.
  4. `publish proof` / `publish architecture` /
     `publish agent-contract` (publications).
  5. `artifacts validate` (read-only).
  6. resolve latest proof-report / architecture-
     summary / agent-contract `Publication` refs.
  7. `publish pr-comment --dry-run --json` (preview).
  8. `publish pr-comment --send
     --confirm-pr-comment-write --pr-number
     "${{ inputs.pr-number }}" --json` (write).
  9. job summary append carrying refs,
     canonical-truth reminder, marker-not-proof
     reminder.
  10. `actions/upload-artifact@v4` with
      `.rekon/artifacts/**` excluding `.log`.
- **Safety contract upheld:** documented in the
  top-of-file comment block. The validator's
  `github-pr-comment-send` profile reviews every
  line of the contract.

**Verdict: beta-ready.** No blocker.

## Validator Profile Review

`rekon verify github-workflow validate --profile
github-pr-comment-send`.

- Permits `contents: read` + `pull-requests: write`
  only.
- Rejects every other write scope (`checks: write`,
  `contents: write`, `id-token: write`,
  `actions: write`, `deployments: write`,
  `statuses: write`, `packages: write`,
  `issues: write`).
- Refuses `pull_request_target` (unconditional).
- Refuses the `pull_request` trigger
  (`pull-request-trigger-disallowed`).
- Requires `REKON_PR_COMMENTS=1` +
  `REKON_PR_COMMENTS_WRITE_CONFIRMED=1`.
- Requires `publish pr-comment --dry-run` step.
- Requires `publish pr-comment --send` step +
  `--confirm-pr-comment-write` flag.
- Warns when the marker-not-proof reminder is
  missing from the workflow.

**Verdict: beta-ready.** No blocker.

## Send CLI Review

`rekon publish pr-comment --send [--root <path>]
[--pr-number <n>] [--confirm-pr-comment-write]
[--api-base-url <url>] [--json]`.

- Mutually exclusive with `--dry-run`; passing both
  or neither is exit 1.
- Refuses `--execute` / `--publish` aliases.
- Reads `process.env` only in the `--send` branch.
  The dry-run branch reads no env at all.
- Calls `assessPrCommentPublisherReadiness`; refuses
  unless `ready: true`. Prints the issue list on
  failure.
- Passes `PR_NUMBER` precedence as: `--pr-number
  <n>` > `GITHUB_PR_NUMBER` > `PR_NUMBER`. Refuses
  non-positive integers.
- Exit 0 on API success regardless of underlying
  proof status (the CLI op succeeded; the comment
  body explains the proof state).
- Exit 1 on readiness failure or API error.
- Sanitized error output:
  `{ status, message, documentationUrl }` only.
  Token never echoed.

**Verdict: beta-ready.** No blocker.

## API Writer Review

`publishPrCommentRun(input)` in
`@rekon/capability-docs`.

- Validates inputs: token non-empty, repository
  `owner/repo` shape, `issueNumber` positive integer,
  body non-empty, marker non-empty.
- Lists comments via
  `GET /repos/{owner}/{repo}/issues/{n}/comments`
  with `per_page=100&page=N`, walks until marker
  found or page returns fewer than 100 items or
  20-page cap reached.
- PATCHes on marker match via
  `PATCH /repos/{owner}/{repo}/issues/comments/{id}`.
- POSTs on marker miss via
  `POST /repos/{owner}/{repo}/issues/{n}/comments`.
- Throws (rather than POSTing a duplicate) when the
  20-page cap is exhausted without finding a marker.
- Uses Node's built-in `fetch`; no third-party
  network client.
- `keepalive: false` + `Connection: close` header so
  the CLI exits promptly.
- Bounded response-body reads (`readPrCommentResponseBodySafely`
  caps at 64 KiB).
- Sanitized errors via `PrCommentPublishError`.

**Verdict: beta-ready.** No blocker.

## Idempotency And Noise Review

**Idempotency strategy:**

1. List PR timeline comments (paginated).
2. Filter by marker
   (`<!-- rekon:pr-comment:v1 -->`) at the start of
   the body.
3. **Match found:** PATCH that comment with the new
   body. Action: `"updated"`.
4. **No match:** POST a new comment. Action:
   `"created"`.
5. **Multiple matches:** PATCH only the first match;
   leave the others alone. The publisher never
   deletes reviewer-touched comments.
6. **Pagination cap reached without finding a
   marker:** throw rather than silently POST a
   duplicate.

**The idempotency marker is not proof.** It is only
an identity handle for the update-in-place behaviour.
The canonical proof state lives in the cited
`VerificationResult` / `VerificationRun` /
`Publication` artifacts, not in the marker or the
comment body.

**Noise / staleness risks** + mitigations:

| Risk | Mitigation |
| --- | --- |
| comment spam from new-comment-per-run | update-in-place by marker |
| stale comments after fixes | canonical-truth reminder + cited artifact ids in the body |
| reviewer manually deletes the comment | next run re-POSTs |
| reviewer manually edits the comment | next run PATCHes and overwrites |
| pagination cap hit on a hot PR | helper throws (no silent duplicate) |
| same operator runs the workflow twice in parallel | first run POSTs, second run PATCHes the same comment (consistent end state) |

**Verdict: beta-ready.** No blocker.

## Token And Error Safety Review

- **Token reads:** only inside the `--send` branch
  of the CLI; only inside
  `process.env.GITHUB_TOKEN`. The helper accepts the
  token as a function argument; it never reads
  `process.env` itself.
- **Token echoes:** none. `PrCommentPublishError`
  carries `{ status, message, documentationUrl }`
  only. `sanitizePrCommentSendError` copies only
  those fields. The sentinel-token contract test
  pins this invariant.
- **Bounded response reads:** at most 64 KiB of any
  response body is retained; the rest is truncated
  with `… [truncated]`.
- **`Connection: close` + `keepalive: false`:** the
  CLI exits promptly; no keep-alive pool keeps the
  process alive past the operation.
- **No third-party network client:** Node's built-in
  `fetch` only.
- **No raw logs in the comment body:**
  `buildPrCommentBody` renders refs + summaries
  only; raw stdout/stderr are excluded by
  construction.
- **Dry-run reads nothing:** the dry-run path passes
  an empty env map to the readiness assessor.

**Verdict: beta-ready.** No blocker.

## Fork And Event Safety Review

Three-layer defence preserved end-to-end:

| Layer | Behaviour |
| --- | --- |
| Workflow template | `workflow_dispatch` trigger only. No `pull_request`; no `pull_request_target`. |
| Validator profile | `github-pr-comment-send` refuses `pull_request_target` (unconditional) and the `pull_request` trigger (`pull-request-trigger-disallowed`). |
| Runtime readiness | `assessPrCommentPublisherReadiness` classifies forked `pull_request` as `untrusted-fork` (denied by default) and `pull_request_target` as `unconditional-deny`. The CLI does not expose `forkOverride`. |

**GitHub Actions itself** denies write tokens to
forked-PR workflows unless the repository-level
toggle is on (off by default). **Forked PRs remain
blocked by default** across every layer.
**`pull_request_target` remains blocked
unconditionally** across every layer.

A future slice may add a same-repo guard to allow
`pull_request` triggers from same-repo PRs. That is
out of scope for this review.

**Verdict: beta-ready.** No blocker.

## Canonical Artifact Boundary

PR comments — like GitHub Checks — are **downstream
review surfaces**. The canonical artifacts remain:

- `VerificationPlan`
- `VerificationRun`
- `VerificationResult`
- Proof-report / architecture-summary / agent-
  contract `Publication`s

The PR comment publisher:

- **Cites** these refs by id in every comment body
  (the dry-run renderer and the send path use the
  same `buildPrCommentBody`).
- **Carries** the canonical-truth phrase verbatim:
  `GitHub comments are not canonical truth; Rekon
  artifacts remain canonical.`
- **Never** mutates any Rekon artifact. The artifact
  index is byte-identical before and after a
  `--send` run (pinned by contract test).
- **Never** implies a finding has been auto-resolved
  or that reconciliation has been auto-applied.

If an operator deletes the PR comment manually, the
proof state in `.rekon/artifacts` is unaffected. The
comment is disposable; the artifacts are not.

**The idempotency marker is not proof.** It is only
an update-in-place handle.

## Beta Readiness Decision

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
- Three-layer fork-safety enforcement (workflow
  template trigger list, validator profile, runtime
  readiness assessor).
- Token-leakage structural prevention (sanitized
  errors; sentinel-token contract test; bounded
  response reads; no third-party network client).
- Structural canonical-artifact boundary
  preservation (body cites refs; artifact index
  byte-identical before/after a `--send` run;
  canonical-truth phrase in the body verbatim).
- Update-in-place idempotency model (marker +
  PATCH-first; no duplicate-on-cap-exhaust; no
  delete of reviewer-touched comments).
- Read-only alpha defaults unchanged (validator
  read-only profile still validates them clean).
- The GitHub Check publisher safety review (step 6e)
  approved the parallel surface as beta-ready under
  the same gating model.

**Component table:**

| Surface | Status | Notes |
| --- | --- | --- |
| body helper | shipped | pure renderer |
| readiness helper | shipped | readiness only |
| dry-run CLI | safe preview | no token / no network |
| send CLI | beta gated write | readiness required |
| API writer | shipped | issue-comments endpoint |
| workflow template | beta opt-in | workflow_dispatch only |
| validator profile | shipped | github-pr-comment-send |

## Remaining Risks

Paged but not blocking:

| Risk | Current Guardrail | Remaining Follow-Up |
| --- | --- | --- |
| duplicate comments | marker update-in-place | monitor marker drift |
| stale comments | canonical reminder | publish fresh comment per run |
| fork token misuse | workflow_dispatch + runtime gate | real-world workflow validation |
| token leakage | sanitized errors | continued source scans |
| comment treated as proof | marker-not-proof + canonical reminder | operator education |

None of these is severe enough to pause usage. Each
has a current guardrail; the remaining follow-up is
operational discipline rather than a Rekon code gap.

## Follow-Up Work

In order of expected priority:

1. **GitHub review surfaces parity review.** Walk
   the combined GitHub surface (Checks, PR comments,
   workflow templates, validators, proof
   publications, uploaded artifacts) and decide
   whether the GitHub review surface is
   beta-complete or whether Check / PR comment
   refinements remain.
2. **Operator-facing "what a Rekon PR comment is /
   isn't" page.** The canonical-truth phrase + the
   marker-not-proof convention are correct but
   terse; an expanded explanation will help
   reviewers who first encounter the comment in
   their PR queue.
3. **Same-repo `pull_request` guard.** Allow
   operators to opt into same-repo PR comments via
   a workflow-level guard
   (`REKON_PR_COMMENTS_PR_IS_FORK=0` style env or
   `github.event.pull_request.head.repo.fork`
   parsing). Out of scope for this review.
4. **Bounded retry / rate-limit backoff on
   `--send`.** Currently a rate-limit response is
   exit 1 with the sanitized message; a bounded
   retry slice would reduce operator toil. Out of
   scope for this review.
5. **Real-world workflow validation.** Run the
   bundled template against a non-Rekon repo to
   confirm the operator experience is as documented
   before recommending broad adoption.
6. **Hosted PR comment publisher.** Reconsider when
   Rekon has a hosted surface; currently rejected
   (Option D from the API decision gate).

**The path is beta-ready as an opt-in.**

**Update — step 8 shipped.** The
[GitHub Review Surfaces Parity Review](github-review-surfaces-parity-review.md)
has reviewed the combined GitHub review surface
(Checks + PR comments + workflow templates +
validator profiles + publications + uploaded
artifacts) and declared it **beta-complete as an
opt-in surface**. GitHub Checks remain the primary
status surface; PR comments are the narrative
companion surface. The next slice is the
**Verification / GitHub Trust-Boundary Hardening**
batch, not another review-surface batch.

**Update — steps 9 and 10 shipped.** The hardening
batch closed the six trust-boundary edge cases
paged by the parity review (see
[`verification-github-trust-boundary-hardening.md`](../../.rekon-dev/review-packets/verification-github-trust-boundary-hardening.md)
review packet). The
[Verification / GitHub Trust-Boundary Safety Review](verification-github-trust-boundary-safety-review.md)
walked every fix in isolation and declared the
trust boundary **beta-stable**. The PR comment
publisher inherits the bounded body reader from
the shared `@rekon/capability-docs` helper; no
PR-comment behaviour change in step 9. The next
slice is the beta readiness / remaining
classic-parity review.
