# Review Packet — GitHub Check Publisher Send Mode (P1.1 slice)

**Slice:** `github-check-publisher-send`
**Sequence position:** Step 6c of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
and the API implementation pin in
[`docs/strategy/verification-runner-github-check-publisher-decision.md`](../../docs/strategy/verification-runner-github-check-publisher-decision.md).
**Batch type:** CLI + helper + tests + docs. Adds the first
real GitHub API write path; default-deny gated. No active
workflow in the Rekon repo. No GitHub write permissions added
to any bundled template.

## CHANGES MADE

1. **New helper in `@rekon/capability-docs`:**
   `publishGitHubCheckRun(input)` POSTs the Rekon Check
   payload to `POST /repos/{owner}/{repo}/check-runs`. Uses
   Node's built-in `fetch` (no third-party network client).
   Sets `Authorization: Bearer <token>`,
   `Accept: application/vnd.github+json`,
   `X-GitHub-Api-Version: 2022-11-28`,
   `User-Agent: rekon-verification-runner`, and
   `Connection: close` so CLI invocations exit promptly
   without waiting for `fetch`'s keep-alive pool to time
   out. Maps the camelCase payload (`headSha`, `externalId`,
   `output`) into GitHub's snake_case body (`head_sha`,
   `external_id`, `output`). Returns
   `{ id, url, htmlUrl, status, conclusion }`. Throws
   `GitHubCheckPublishError` (with `status`, `message`,
   `documentationUrl`) on non-2xx responses.
   - Helper never echoes the token in any error message.
   - Reads up to 64 KiB of an error body to bound terminal
     output.
   - New exports:
     `publishGitHubCheckRun`,
     `GitHubCheckPublishError`,
     `GITHUB_CHECK_PUBLISHER_DEFAULT_API_BASE_URL`,
     `GITHUB_CHECK_PUBLISHER_DEFAULT_API_VERSION`,
     `GITHUB_CHECK_PUBLISHER_USER_AGENT`,
     `GitHubCheckPublishInput`,
     `GitHubCheckPublishResult`.

2. **New CLI flag set:** `rekon publish github-check
   --send [--root <path>] [--confirm-checks-write]
   [--api-base-url <url>] [--json]`.
   - `--dry-run` and `--send` are mutually exclusive;
     passing both is exit 1.
   - Passing neither is exit 1.
   - `--send` is the **only** branch that reads
     `process.env`: `GITHUB_TOKEN`, `GITHUB_REPOSITORY`,
     `GITHUB_SHA`, `REKON_GITHUB_CHECKS`,
     `REKON_GITHUB_CHECKS_WRITE_CONFIRMED`,
     `GITHUB_EVENT_NAME`, `GITHUB_HEAD_SHA`,
     `GITHUB_SERVER_URL`, `GITHUB_RUN_ID`,
     `GITHUB_RUN_ATTEMPT`,
     `REKON_GITHUB_CHECKS_PR_IS_FORK`. The list is
     closed-form via `GITHUB_CHECK_SEND_ENV_KEYS` so
     future additions are explicit.
   - `--api-base-url` overrides the default
     `https://api.github.com` (used by tests pointing at a
     local node:http server; also lets GHES adopters point
     at an enterprise instance).
   - Write-permission confirmation is required via
     **either** the `--confirm-checks-write` flag **or**
     the env var `REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1`.
   - Send branch resolves the event from
     `GITHUB_EVENT_NAME`; classifies `pull_request_target`
     as `unconditional-deny`, `pull_request` as
     fork-suspicious unless
     `REKON_GITHUB_CHECKS_PR_IS_FORK=0` is set,
     `workflow_dispatch`/`push` as trusted, and unset as
     `workflow_dispatch`.
   - On readiness `ready: false`, the CLI prints the
     payload + readiness JSON (exit 1) and writes a
     human-readable issue list to stderr.
   - On API success, the CLI exits 0 with
     `{ kind: "rekon.github-check.send", sent: true,
     payload, readiness, github, canonicalTruthReminder }`.
   - On API error, the CLI exits 1 with sanitized
     `{ sent: false, reason: "api-error", error: { status,
     message, documentationUrl } }`. The token never
     appears.
   - The CLI exits 0 even when the Check payload's
     `conclusion` is `failure` / `timed_out` /
     `action_required`, as long as the API publish
     succeeded.

3. **Updated dry-run safety contract tests.** The previous
   step-6b source-scan that asserted the entire CLI source
   contains no `GITHUB_TOKEN` reference is replaced with
   behavioural tests: running `--dry-run` with
   `GITHUB_TOKEN=<sentinel>` set in env confirms the
   sentinel never appears in stdout/stderr; running with
   `HTTPS_PROXY=http://127.0.0.1:1` confirms no outbound
   call is attempted.

4. **New contract suite** at
   `tests/contract/github-check-publisher-send-cli.test.mjs`
   — 19 tests, all passing.

5. **New docs suite** at
   `tests/docs/github-check-publisher-send.test.mjs` —
   10 assertions, all passing.

6. **Decision memo update:**
   [`docs/strategy/verification-runner-github-check-publisher-decision.md`](../../docs/strategy/verification-runner-github-check-publisher-decision.md)
   step 6 (Implementation Sequence) flipped to ✅ Shipped
   for 6c; new "API Implementation Pin" section appended
   with the 6 required decisions (token, send flag, gate,
   trusted events, response data, rollback).

7. **Operator guide update:**
   [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
   extends the "Does not create GitHub Checks" paragraph
   with a commented opt-in block describing how operators
   wire `publish github-check --send` into their own
   workflow with `checks: write` and the explicit
   confirmation env / flag.

8. **Cross-doc updates:** concept/artifact docs link to
   the decision memo; roadmap + classic-behavior +
   issue-governance flip step 6c to ✅; CHANGELOG entry;
   README mentions the new command.

## PUBLIC API CHANGES

- **New `@rekon/capability-docs` exports:**
  `publishGitHubCheckRun`,
  `GitHubCheckPublishError`,
  `GITHUB_CHECK_PUBLISHER_DEFAULT_API_BASE_URL`,
  `GITHUB_CHECK_PUBLISHER_DEFAULT_API_VERSION`,
  `GITHUB_CHECK_PUBLISHER_USER_AGENT`,
  `GitHubCheckPublishInput`,
  `GitHubCheckPublishResult`.
- **New CLI flags on `rekon publish github-check`:**
  `--send`, `--confirm-checks-write`, `--api-base-url`.
- **No new artifact type.**
- **No new capability package.**
- **No new role / permission.**
- **No existing CLI command removed.**

## PURPOSE PRESERVATION CHECK

The slice is the **first GitHub-write path** in Rekon. It
preserves every existing invariant:

- **Verification runner v1 purpose.** Unchanged. The CLI
  reads artifacts; it does not execute verification
  commands. The send path POSTs a derived summary; it
  never re-runs commands.
- **VerificationPlan / VerificationRun /
  VerificationResult.** Unchanged. The CLI cites refs
  only; the GitHub Check Run is a downstream surface
  with no Rekon-artifact mutation.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged. The CLI cites refs only.
- **Workflow templates' safety contract.** Unchanged.
  Both bundled templates still declare
  `permissions: contents: read` and still pass
  `rekon verify github-workflow validate`. The send
  command requires operators to **add** `checks: write`
  in their own copies.
- **Canonical-truth invariant.** Preserved. The payload
  always carries
  `GitHub status is not canonical truth; Rekon artifacts
  remain canonical.`, and the docs reinforce that
  reviewing the Check status is not equivalent to
  reviewing the canonical proof artifacts.
- **Fork-safety invariant.** Strengthened. The readiness
  gate refuses forked PRs by default and refuses
  `pull_request_target` unconditionally — the CLI does
  not expose the `forkOverride` escape hatch in v1.
- **No-auto-resolution invariant.** Unchanged.
- **No-token-leak invariant.** Reinforced. Token reads
  are confined to the `--send` branch; sanitized errors
  never include the token; contract tests run with a
  sentinel token and assert it never appears in
  stdout/stderr.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see proof at
  the decision point. With `--send`, operators can wire
  the GitHub Check Run badge into PRs — but the canonical
  artifacts (and the canonical-truth reminder embedded in
  the Check summary) keep the boundary clear.
- **Classic anti-pattern avoided:** Rekon does not treat
  GitHub status as canonical. The payload always says so,
  and the docs say so in three places (decision memo,
  operator guide, CHANGELOG).
- **Capability map:** unchanged. The helper lives in
  `@rekon/capability-docs` (publisher-style output).
- **Conformance:** unchanged. No new artifact type / role /
  permission.

## SEND GATE

`--send` requires `assessGitHubCheckPublisherReadiness`
to return `ready: true`. All of these issues block:

- `not-enabled` — `REKON_GITHUB_CHECKS` is not `1`/`true`.
- `missing-token` — `GITHUB_TOKEN` is empty.
- `missing-repository` — `GITHUB_REPOSITORY` is empty.
- `missing-sha` — head SHA is empty.
- `untrusted-event`:
  - `pull_request_target` → unconditional deny.
  - `pull_request` from a fork → deny by default; the
    `forkOverride` escape exists on the readiness assessor
    but the CLI does **not** wire it.
- `write-permission-not-confirmed` — neither
  `--confirm-checks-write` nor
  `REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1` was supplied.

On `ready: false`, the CLI:
- Prints
  `{ kind: "rekon.github-check.send", sent: false,
  reason: "readiness-failed", payload, readiness,
  github: undefined, canonicalTruthReminder }`.
- Exits 1.
- (Human mode) Writes the issue list to stderr.
- **Never calls the GitHub API.**

## GITHUB API CLIENT

- Endpoint: `POST {apiBaseUrl}/repos/{owner}/{repo}/check-runs`.
- Default base URL: `https://api.github.com`.
- Headers:
  - `Authorization: Bearer <token>`
  - `Accept: application/vnd.github+json`
  - `Content-Type: application/json`
  - `User-Agent: rekon-verification-runner`
  - `X-GitHub-Api-Version: 2022-11-28`
  - `Connection: close` (so CLI exits promptly)
- Request body (snake_case): `{ name, status, conclusion,
  output: { title, summary }, head_sha?, external_id?,
  output.text? }`.
- Response: parsed JSON; extracts
  `id`, `url`, `html_url`, `status`, `conclusion`.
- Error handling:
  - Non-2xx → `GitHubCheckPublishError` with
    `{ status, message, documentationUrl }`. CLI prints
    sanitized form; token never appears.
  - JSON parse failure on 2xx → same error class with
    the underlying message.
  - Network error → same error class, `status: 0`.

## SAFETY / PERMISSIONS

- **Token reads:** only inside the `--send` branch.
  Behavioural tests confirm that running `--dry-run`
  with `GITHUB_TOKEN=<sentinel>` in env does not surface
  the sentinel anywhere in output.
- **Token leaks:** the helper never echoes the token.
  The CLI's sanitizer extracts only `status`, `message`,
  `documentationUrl` from the helper's error.
- **Forked PRs:** default-deny via the
  `untrusted-event` readiness issue.
- **`pull_request_target`:** unconditional deny.
- **Default templates:** the bundled execute / dry-run
  workflow templates are **unchanged**. They still
  declare `permissions: contents: read` and do not call
  `publish github-check --send`. Adoption is per-operator,
  per-workflow.
- **Sanitized errors:** contract test runs with a
  sentinel token and asserts the sentinel does not
  appear in stdout/stderr.
- **API base URL override:** lets tests point at a local
  node:http server. Production callers will leave this
  unset and use `https://api.github.com`.

## TESTS / VERIFICATION

- **Contract suite (send):**
  `tests/contract/github-check-publisher-send-cli.test.mjs`
  — 19 tests, all passing. Covers all 18 required tests
  from the work order plus a usage-line assertion.
- **Contract suite (dry-run, reshaped):**
  `tests/contract/github-check-publisher-dry-run-cli.test.mjs`
  — 9 tests, all passing. Replaces the previous
  source-scan with behavioural tests proving the dry-run
  branch reads no token and makes no network call.
- **Docs suite:**
  `tests/docs/github-check-publisher-send.test.mjs` —
  10 assertions, all passing.
- **Helper-skeleton suite:**
  `tests/contract/github-check-publisher-skeleton.test.mjs`
  — 25 tests still passing (no helper-shape change).
- **Decision-memo docs suite:**
  `tests/docs/verification-runner-github-check-publisher-decision.test.mjs`
  — 13 assertions still passing.
- **Full suite:** expected ≥ 1294 passed / 1 skipped.

## INTENTIONALLY UNTOUCHED

- `packages/capability-verify/` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- `rekon verify run` — unchanged.
- `rekon verify result from-run` — unchanged.
- `rekon artifacts latest` — unchanged.
- `rekon verify github-workflow validate` — unchanged.
- `.github/workflows/*.yml` in the Rekon repo — none
  added, none modified.
- Both bundled workflow templates' `permissions: contents:
  read` posture — unchanged.

## RISKS / FOLLOW-UP

- **Risk: keep-alive lingering process.** Mitigated by
  setting `Connection: close` and `keepalive: false` on
  the fetch. Future Node versions may handle this
  differently; the contract tests would catch any
  regression because they would hang.
- **Risk: fork detection.** The CLI infers fork status
  from `REKON_GITHUB_CHECKS_PR_IS_FORK` because GitHub
  Actions does not expose fork status as a single env
  var. Until operators set this explicitly, forked PRs
  are denied by default. Future work could parse
  `GITHUB_EVENT_PATH` to read the event payload's
  `pull_request.head.repo.fork` field directly.
- **Risk: rate-limiting / retries.** This slice has no
  retry logic. A 403 from GitHub (e.g. installation
  permission missing) exits 1 with the documentation
  URL. Retries would belong to a follow-up slice with
  its own decision memo.
- **Follow-up — step 7:** PR comment publisher (already
  on the roadmap; uses the same readiness gate but
  requires `pull-requests: write` and a different API
  surface).
- **Follow-up — opt-in workflow template:** add a
  separate `docs/examples/workflows/rekon-verification-check-send.yml`
  variant that wires `--send` in with explicit
  `checks: write` and `REKON_GITHUB_CHECKS=1`
  declarations. Still under `docs/examples/`, never
  `.github/workflows/`.

## NEXT STEP

Step 7 of the CI / GitHub adapter implementation sequence:
the **PR comment publisher** (beta+). Same shape as the
GitHub Check publisher but writes inline PR comments;
requires `pull-requests: write`. Uses the same readiness
gate and same fork-safety contract. Will require its own
decision memo + review packet.

Before that, an **opt-in workflow template** slice is a
clean intermediate: a separate
`docs/examples/workflows/rekon-verification-check-send.yml`
variant that documents the safe wiring for `--send` so
operators don't have to assemble it from the operator
guide.
