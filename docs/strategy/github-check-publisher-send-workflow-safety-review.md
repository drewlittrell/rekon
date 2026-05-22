# GitHub Check Publisher Send Workflow Safety Review

## Decision Summary

**The GitHub Check publisher send path is beta-ready as
an opt-in, checks-write, artifact-backed surface.** It is
**not** an alpha default and must not be installed
automatically.

- Read-only templates
  ([`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml),
  [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml))
  remain the **recommended alpha default**. They declare
  only `permissions: contents: read`; they make no GitHub
  API calls; they ship the canonical proof loop +
  artifact upload + job-summary surface without any
  write-side risk.
- The opt-in workflow template
  ([`docs/examples/workflows/rekon-verification-check-send.yml`](../examples/workflows/rekon-verification-check-send.yml))
  is **beta-tier**: operators copy it deliberately, add
  `checks: write`, and set
  `REKON_GITHUB_CHECKS: "1"` +
  `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1"` at the
  workflow level. The workflow validator's
  `github-check-send` profile pins every gate.
- The send CLI (`rekon publish github-check --send`) is
  default-deny. It is the only CLI branch that reads
  `process.env.GITHUB_TOKEN`. Token reads never echo
  into stdout / stderr. Forked PRs are denied by
  default; `pull_request_target` is denied
  unconditionally.
- PR comments remain **deferred** until the Check Run
  path has run in production for long enough to surface
  any second-order issues.

**Pinned reminders carried forward:**

- **GitHub status is not canonical truth; Rekon
  artifacts remain canonical.** Every Check Run summary
  carries this phrase, every operator-facing doc
  repeats it, and the workflow validator emits a
  warning when the phrase is missing from a copied
  workflow.
- **Forked PRs and `pull_request_target` remain blocked
  by default** — at three layers (workflow trigger
  list, validator's `github-check-send` profile, send
  CLI's readiness assessor).
- **No automatic finding resolution or reconciliation
  apply is implied by a successful GitHub Check.** The
  Check is a downstream rendering of the existing
  artifact-backed proof; it never resolves findings,
  never applies reconciliation operations, and never
  re-runs verification commands.

## Why This Review Exists

Steps 6a–6d of the CI / GitHub adapter implementation
sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
landed the full GitHub Check publishing path:

- **6a (decision + skeleton).** Payload + readiness
  helpers in `@rekon/capability-docs`. No network
  client.
- **6b (dry-run CLI).** `rekon publish github-check
  --dry-run [--root <path>] [--json]`. No token reads.
  No network calls.
- **6c (send CLI).** `rekon publish github-check
  --send [--root <path>] [--confirm-checks-write]
  [--api-base-url <url>] [--json]`. The first
  GitHub-write surface. Default-deny readiness gate.
  Token reads confined to the send branch. Sanitized
  errors.
- **6d (opt-in workflow template + validator profile).**
  `docs/examples/workflows/rekon-verification-check-send.yml`
  + validator `--profile read-only |
  github-check-send`.

This review is the safety pass over the **full path**
before the next slice (the PR Comment Publisher Decision
Memo). The goal is to:

1. Confirm the path is beta-ready as a deliberate,
   per-operator opt-in.
2. Confirm the read-only alpha defaults remain
   unchanged.
3. Confirm the canonical-artifact boundary survives
   end-to-end.
4. Surface remaining risks that should be paged before
   any further GitHub-write surface lands.

This review **does not change runtime behaviour.** It is
a strategy / docs / test batch only.

## Components Reviewed

1. **GitHub Check payload helper.**
   `buildGitHubCheckPayload(...)` in
   [`packages/capability-docs/src/index.ts`](../../packages/capability-docs/src/index.ts).
   Pure function. No I/O. Derives conclusion via a
   precedence ladder (`artifactsValid:false` →
   `failure`; killed → `failure`; timeout →
   `timed_out`; failed → `failure`; partial → missing →
   stale → `action_required`; not-run → `neutral`;
   passed + fresh → `success`). Always cites the
   underlying refs + carries the canonical-truth
   reminder.
2. **Readiness helper.**
   `assessGitHubCheckPublisherReadiness(...)` in the
   same file. Pure function. Takes the caller's env map
   + event + write-permission confirmation. Default-
   deny: refuses unless every gate clears.
3. **Dry-run CLI.** `rekon publish github-check
   --dry-run [--root <path>] [--json]`. Reads local
   artifacts; builds the payload; reports readiness;
   prints
   `{ kind: "rekon.github-check.dry-run", dryRun: true,
   payload, readiness, canonicalTruthReminder }`.
   **Never** reads `GITHUB_TOKEN` (passes `{}` as the
   env to the readiness assessor) and **never** calls
   the GitHub API. Behavioural tests pin both.
4. **Send CLI.** `rekon publish github-check --send
   [--root <path>] [--confirm-checks-write]
   [--api-base-url <url>] [--json]`. Mutually exclusive
   with `--dry-run`. Reads
   `process.env.GITHUB_TOKEN` + the other gate vars.
   Refuses unless readiness passes. POSTs via
   `publishGitHubCheckRun`. Sanitized errors. Exit 0
   on API success even if the Check conclusion is
   `failure` / `timed_out` / `action_required`.
5. **Read-only execute workflow template.**
   [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml).
   `permissions: contents: read` only. No GitHub API
   calls. Runs `rekon verify run --execute` + the rest
   of the proof loop.
6. **Read-only dry-run workflow template.**
   [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml).
   `permissions: contents: read` only. No GitHub API
   calls. Runs `rekon verify run --dry-run`; spawns
   zero plan commands.
7. **Opt-in checks-write workflow template.**
   [`docs/examples/workflows/rekon-verification-check-send.yml`](../examples/workflows/rekon-verification-check-send.yml).
   `permissions: contents: read + checks: write` only.
   Triggers on `workflow_dispatch` + `push` to `main`
   (no `pull_request`, no `pull_request_target`). Sets
   `REKON_GITHUB_CHECKS: "1"` +
   `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1"` at the
   workflow level. Runs the full proof loop, a
   `publish github-check --dry-run` preview, then
   `publish github-check --send
   --confirm-checks-write`.
8. **Workflow validator profiles.** `rekon verify
   github-workflow validate --path <yml> --profile
   read-only | github-check-send`. The `read-only`
   profile preserves the existing contract (every
   write scope rejected); the `github-check-send`
   profile permits `checks: write` and enforces the
   opt-in template's full safety contract (Rekon env,
   both publish commands, `--confirm-checks-write`
   flag, no `pull_request_target`, no `pull_request`
   trigger).
9. **Token / permission behaviour.** `GITHUB_TOKEN` is
   read only inside the send branch. The CLI's
   sanitized-error path includes `status`, `message`,
   `documentationUrl` only — never the token. A
   contract test runs with a sentinel token and
   asserts the sentinel does not appear in
   stdout/stderr.
10. **Fork / `pull_request` / `pull_request_target`
    behaviour.** Three layers of defence:
    (a) the opt-in template's trigger list excludes
    `pull_request` and `pull_request_target`;
    (b) the validator's `github-check-send` profile
    rejects both;
    (c) the send CLI's readiness assessor classifies
    `pull_request_target` as `unconditional-deny` and
    `pull_request` with `pullRequestIsFork: true` as
    `untrusted-fork` (denied by default; the
    `forkOverride` escape hatch is not exposed on the
    CLI).
11. **Canonical artifact boundary.** Every Check Run
    summary cites every underlying ref
    (`VerificationResult`, `VerificationRun`,
    `VerificationPlan`, proof-report `Publication`,
    architecture-summary `Publication`, agent-contract
    `Publication`) and carries the canonical-truth
    reminder. The send CLI does not mutate any Rekon
    artifact; a contract test confirms the artifact
    index is byte-identical before / after a `--send`
    run.
12. **Test coverage.** 26 helper tests (skeleton
    suite). 9 dry-run CLI tests. 19 send CLI tests
    (uses a local `node:http` fake server +
    `--api-base-url`). 13 docs assertions for the
    decision memo. 10 docs assertions for the send
    operator-guide language. 21 docs assertions for
    the opt-in workflow template. 42 validator tests
    covering both profiles. Full suite at the time of
    this review: 1331 passed / 1 skipped.

## Pinned Safety Facts

| # | Fact | How it is pinned |
| --- | --- | --- |
| 1 | Dry-run CLI makes no GitHub API call. | Behavioural test in `tests/contract/github-check-publisher-dry-run-cli.test.mjs` runs `--dry-run` with `HTTPS_PROXY` pointing at a closed port; succeeds. Send-CLI suite test 12 confirms the dry-run path doesn't reach a reachable fake transport. |
| 2 | Dry-run CLI does not read `GITHUB_TOKEN` / `GH_TOKEN`. | Behavioural test in the dry-run CLI suite runs with a sentinel token in env and confirms the sentinel never appears in stdout/stderr. |
| 3 | Send CLI is gated. | Send-CLI tests 1–6 exercise every gate (readiness false, missing `REKON_GITHUB_CHECKS`, missing `GITHUB_TOKEN`, missing `--confirm-checks-write`, `pull_request_target`, forked `pull_request`). All exit 1; transport requestCount = 0. |
| 4 | Send CLI requires explicit `--confirm-checks-write` (or env equivalent). | Send-CLI test 4: send without `--confirm-checks-write` and without `REKON_GITHUB_CHECKS_WRITE_CONFIRMED` → exit 1 + `write-permission-not-confirmed` issue. |
| 5 | Forked PRs denied by default. | Send-CLI test 6 + readiness-helper test in the skeleton suite. The validator's `github-check-send` profile rejects the `pull_request` trigger entirely. |
| 6 | `pull_request_target` denied. | Skeleton suite + send-CLI suite test 5 + validator suite send-profile test. |
| 7 | Read-only templates do not contain `checks: write`. | Validator read-only profile + the bundled `rekon-verification.yml` / `rekon-verification-dry-run.yml` validate clean. Hardening docs suite confirms `pull-requests:write` / `checks:write` / `contents:write` / `id-token` absent from both. |
| 8 | Opt-in template does contain `checks: write`. | `tests/docs/github-check-publisher-opt-in-workflow-template.test.mjs` assertion 4 + validator `github-check-send` profile validates the bundled opt-in template. |
| 9 | Opt-in template runs dry-run before send. | Opt-in workflow docs test assertions 11 / 12 + the workflow file itself orders the steps that way. The validator requires both commands present. |
| 10 | Rekon artifacts remain canonical. | Every Check Run summary carries the canonical-truth phrase; the send CLI does not mutate any artifact (send-CLI test 18 confirms artifact index is unchanged before/after). |

No safety fact is unverified at the time of this review.
Any future drift would be caught by the relevant
contract / docs test.

## Workflow Template Review

| Surface | Status | Notes |
| --- | --- | --- |
| read-only execute workflow | safe alpha default | `permissions: contents: read` only; no GitHub API calls; runs `verify run --execute`; uploads `.rekon/artifacts/**` excluding `.log`; job summary carries canonical-truth reminder. |
| read-only dry-run workflow | safe alpha default | `permissions: contents: read` only; runs `verify run --dry-run` (spawns zero plan commands); same upload + summary contract. |
| checks-write opt-in workflow | beta opt-in | `permissions: contents: read + checks: write`; triggers on `workflow_dispatch` + `push` to `main`; sets `REKON_GITHUB_CHECKS` + `REKON_GITHUB_CHECKS_WRITE_CONFIRMED`; runs `publish github-check --dry-run` preview before `--send --confirm-checks-write`. |

The opt-in template's permission boundary is **obvious**
on inspection:

- The `permissions:` block is a 2-line declaration
  (`contents: read`, `checks: write`).
- The Rekon opt-in env is at the workflow level, so
  reviewers see it once at the top.
- The `--confirm-checks-write` flag is on the send
  step — easy to grep for, and the validator fails the
  workflow if the flag is missing.
- The job-summary step writes a `Mode: check-send`
  line, distinguishing the workflow at a glance from
  the read-only `Mode: execute` / `Mode: dry-run`
  variants.

## Validator Profile Review

The validator's two profiles cover the workflow surface
without overlap:

- **`read-only`** (default) rejects every GitHub write
  scope. The bundled read-only templates still
  validate clean. Any operator who adds `checks: write`
  by mistake gets a clear `github-write-permission`
  error.
- **`github-check-send`** permits **only** `checks:
  write`. Adding any other write scope still errors.
  Six additional gates beyond the read-only contract:
  `missing-checks-write`,
  `missing-rekon-github-checks-opt-in`,
  `missing-write-confirmation`,
  `missing-publish-github-check-dry-run`,
  `missing-publish-github-check-send`,
  `missing-confirm-checks-write-flag`. Plus the
  `pull-request-trigger-disallowed` error that rejects
  the `pull_request` trigger entirely.

The validator catches the important unsafe mutations:

- Adding any non-`checks: write` write scope → error.
- Removing `REKON_GITHUB_CHECKS=1` or
  `REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1` → error.
- Removing the dry-run preview step → error.
- Removing the send step → error.
- Removing the `--confirm-checks-write` flag → error.
- Adding `pull_request` trigger → error.
- Adding `pull_request_target` → error.

If a future workflow mutation could weaken the gate
without tripping any of these, the gap is documented in
the **Remaining Risks** section below.

## Send CLI Review

The send CLI is the only CLI branch that reads
`GITHUB_TOKEN`. The branch:

1. Builds the payload via the shared helper (no
   duplicated conclusion mapping).
2. Reads the closed-form env list
   (`GITHUB_CHECK_SEND_ENV_KEYS`) — only the keys the
   readiness assessor and publish helper need.
3. Runs readiness. If false: exit 1, print
   `{ sent: false, reason: "readiness-failed",
   readiness }`, never call GitHub.
4. If readiness true: POST via
   `publishGitHubCheckRun`. The helper uses Node's
   built-in `fetch` (no third-party client). Headers
   include `Connection: close` so the CLI exits
   promptly.
5. On API success: exit 0 with
   `{ sent: true, payload, readiness, github,
   canonicalTruthReminder }`. Exit code is decoupled
   from the Check's `conclusion` — a `failure` /
   `timed_out` / `action_required` conclusion still
   exits 0 because the CLI operation succeeded.
6. On API error: exit 1 with sanitized
   `{ status, message, documentationUrl? }`. **Never**
   echoes the token.

No raw logs are uploaded. The payload's summary cites
artifact ids + the canonical-truth reminder + the
`artifacts validate` outcome. The Rekon runner's
existing redaction + truncation contract already keeps
raw stdout / stderr out of the artifact bodies; the
send CLI cites the bodies' refs but never reads or
forwards them.

## Token And Permission Review

- **Token source.** `GITHUB_TOKEN` from `process.env`,
  read only inside the `--send` branch. PATs are
  out-of-scope for v1.
- **Token destination.** Sent to GitHub via the
  `Authorization: Bearer <token>` header inside
  `publishGitHubCheckRun`. The helper never logs the
  token, never returns it, never echoes it in
  errors. A contract test asserts a sentinel token
  does not appear in stdout/stderr.
- **Permission set required.** `checks: write` only.
  The opt-in template declares it explicitly. The
  validator refuses to mark a `github-check-send`
  workflow valid without it (`missing-checks-write`
  error). No other GitHub write scope is requested
  anywhere in the Rekon repo.
- **Permission set forbidden** in the
  `github-check-send` profile: `pull-requests: write`,
  `contents: write`, `id-token: write`,
  `actions: write`, `deployments: write`,
  `statuses: write`, `packages: write`.
- **Token rotation / revocation.** GitHub Actions
  mints `GITHUB_TOKEN` per job; revoking it is a
  per-installation operation that takes effect on the
  next workflow run. Operators can disable the publish
  immediately by unsetting `REKON_GITHUB_CHECKS` or
  dropping `--confirm-checks-write` — the readiness
  gate fails before any token use.

## Fork And Event Safety Review

| Trigger | Behaviour in opt-in template | Behaviour in validator (`github-check-send`) | Behaviour in send CLI readiness |
| --- | --- | --- | --- |
| `workflow_dispatch` | allowed | allowed | `trusted` |
| `push` (to main) | allowed | allowed | `trusted` |
| `pull_request` (same-repo) | not declared | rejected (`pull-request-trigger-disallowed`) | `trusted` if `REKON_GITHUB_CHECKS_PR_IS_FORK=0` is set, otherwise treated as fork |
| `pull_request` (fork) | not declared | rejected | `untrusted-fork`; denied by default |
| `pull_request_target` | not declared | rejected (`pull-request-target`) | `unconditional-deny` |

The three layers (template trigger list, validator
profile, runtime readiness assessor) reinforce each
other. Even if an operator manually adds the
`pull_request` trigger to a copied workflow and somehow
bypasses validation, the send CLI's runtime readiness
gate still classifies the event correctly: fork events
hit the `forkOverride: true` opt-out, which the CLI does
not expose. The CLI refuses to send.

`pull_request_target` is denied at every layer.

## Canonical Artifact Boundary

The Check Run is a **downstream surface**. The
canonical artifacts are:

- `VerificationPlan` — the plan operators committed.
- `VerificationRun` — the runner's recorded execution.
- `VerificationResult` — the proof summary derived
  from the run.
- Proof-report `Publication` — human-readable proof
  markdown.
- Architecture summary `Publication` — human-readable
  architecture markdown.
- Agent contract `Publication` — human-readable agent
  operating contract.

The Check Run payload:

- Cites the `VerificationResult` id (when present).
- Cites the `VerificationRun` id (when present).
- Cites the `VerificationPlan` id (when present).
- Cites the proof-report `Publication` id (when
  present).
- Cites the architecture summary `Publication` id
  (when present).
- Cites the agent contract `Publication` id (when
  present).
- Reports the `artifacts validate` outcome.
- Always includes the phrase
  **"GitHub status is not canonical truth; Rekon
  artifacts remain canonical."**

The send CLI does not write a Rekon artifact. The
artifact index is byte-identical before / after a
`--send` run (pinned by send-CLI suite test 18).

No automatic finding resolution or reconciliation
apply is implied by a successful GitHub Check. The
Check is informational, downstream, and per-commit;
the canonical proof state lives in the Rekon
artifacts.

## Beta Readiness Decision

**Decision: beta-ready as an opt-in surface.**

The GitHub Check publisher send path meets the
beta-readiness bar because:

1. **Opt-in posture is enforced at three layers.** The
   bundled read-only templates do not enable it. The
   opt-in template requires `--confirm-checks-write`
   AND `REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1` AND
   `REKON_GITHUB_CHECKS=1`. The send CLI's readiness
   assessor refuses if any of those (or the token,
   repository, head SHA, or event-trust) are missing.
2. **Token leakage is structurally prevented.** The
   helper never echoes the token; the sanitizer's
   shape is `{ status, message, documentationUrl }`;
   a sentinel-token contract test confirms.
3. **Fork-safety is preserved at three layers.** Opt-in
   template excludes `pull_request` / `pull_request_target`
   triggers; validator rejects them; readiness assessor
   classifies them as untrusted.
4. **Canonical-artifact boundary is structurally
   preserved.** Every Check Run cites the underlying
   artifact ids + carries the canonical-truth reminder;
   the send CLI never mutates a Rekon artifact.
5. **The read-only alpha defaults remain unchanged.**
   Both bundled read-only templates still validate
   clean under the (default) read-only profile.

**Decision: keep PR comments deferred.**

PR comments would require `pull-requests: write` — a
strictly broader scope than `checks: write` — and would
mutate the PR conversation surface. There is no
operational data yet on the Check Run path; introducing
a second GitHub-write surface before the first one has
run in production risks compounding two unknowns.

**Decision: PR Comment Publisher Decision Memo is the
next slice.** Defer implementation until that memo
decides whether the Check Run path + artifact upload is
sufficient for beta or whether comments add review-time
value worth the broader scope.

## Remaining Risks

| Risk | Current Guardrail | Remaining Follow-Up |
| --- | --- | --- |
| Forked PR token misuse | fork denied by default at three layers (template, validator, CLI readiness) | Real-world workflow validation in operator repos to confirm the GitHub Actions fork-detection assumptions hold. |
| GitHub status treated as canonical | canonical reminder in payload + docs + every operator-facing surface | Operator education: a short "what the Check is and isn't" page when adoption grows beyond the early users. |
| Token leakage | sanitized errors / no raw log upload / sentinel-token contract test | Continued source scans on every CI / send-CLI change; consider a periodic regression scan as the helper evolves. |
| Raw logs uploaded | `.log` excluded from upload; runner-level redaction + truncation | Artifact retention review when adoption surfaces real workflows (some operators may want longer retention than the recommended 7 days). |
| Validator drift | profile-specific tests pin every gate | Re-run the validator smokes against any new bundled template. |
| Same-repo PR triggering | not yet supported (refused by validator) | Future slice could parse `GITHUB_EVENT_PATH` to read `pull_request.head.repo.fork` directly, then permit same-repo PRs via a workflow-level guard. Not blocking. |
| Rate-limiting / retries on send | none (single attempt; exit 1 on error) | A retry slice would need its own decision memo; not blocking for beta. |
| GHES (GitHub Enterprise Server) support | `--api-base-url` flag exists; no GHES-specific docs | Validate against a GHES instance when an operator requests it. Not blocking for hosted GitHub. |

No risk is severe enough to pause GitHub Check usage at
the beta-opt-in tier. The risks above are paged for
follow-up; none invalidate the readiness decision.

## Follow-Up Work

In order of expected priority:

1. **PR Comment Publisher Decision Memo.** ✅ Shipped.
   See
   [`pr-comment-publisher-decision.md`](pr-comment-publisher-decision.md).
   **Decision: Option B — design a PR comment
   dry-run renderer; defer actual PR comment
   posting.** PR comments are not required for beta
   if GitHub Checks + Rekon artifacts are sufficient
   for review (this review already pinned that
   they are). **Step 7b** shipped the dry-run
   renderer + CLI; **step 7c** ships the
   [API Implementation Decision Gate](pr-comment-publisher-api-decision-gate.md)
   recommending **Option C** (workflow / validator
   profile boundary first; re-evaluate the API
   writer afterwards). No GitHub API call has
   landed for PR comments.
2. **Operator-facing "what the Check is / isn't" page**
   when adoption grows. The canonical-truth phrase in
   the payload + memo is correct but terse; an
   expanded explanation will help reviewers who first
   encounter the Check badge in their PR queue.
3. **Real-world workflow validation.** Run the opt-in
   template in a representative operator repo and
   confirm the fork / `pull_request_target` /
   `pull_request` guards behave as documented.
4. **Same-repo `pull_request` opt-in.** Parse
   `GITHUB_EVENT_PATH` to read
   `pull_request.head.repo.fork` directly; allow
   operators to opt into same-repo PR Check Runs via
   a workflow-level guard.
5. **Retry / rate-limit handling for `--send`.**
   Decision memo + bounded retry strategy. Defer until
   step 1 lands.
6. **GHES / enterprise validation.** Pin
   `--api-base-url` behaviour against a GHES instance
   when an operator requests it.

This review is informational; it does not change
runtime behaviour.

**Update — step 8 shipped.** The
[GitHub Review Surfaces Parity Review](github-review-surfaces-parity-review.md)
has reviewed the combined GitHub review surface
(Checks + PR comments + workflow templates + validator
profiles + publications + uploaded artifacts) and
declared it **beta-complete as an opt-in surface**.
GitHub Checks remain the primary status surface; PR
comments are the narrative companion surface. The next
runtime-changing slice is the **Verification / GitHub
Trust-Boundary Hardening** batch, not another review-
surface batch.

**Update — steps 9 and 10 shipped.** The hardening
batch closed the six trust-boundary edge cases paged
by the parity review (see
[`verification-github-trust-boundary-hardening.md`](../../.rekon-dev/review-packets/verification-github-trust-boundary-hardening.md)
review packet for the full register). The
[Verification / GitHub Trust-Boundary Safety Review](verification-github-trust-boundary-safety-review.md)
then walked every fix in isolation and declared the
trust boundary **beta-stable**. The next slice is the
beta readiness / remaining classic-parity review.
