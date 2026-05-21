# Verification Runner GitHub Check Publisher Decision

## Decision Summary

**Recommended option:** **Option B — Add a gated GitHub
Check publisher**, ship the **decision memo + a gated skeleton
in this batch**, and defer the actual GitHub API write to a
later slice.

In this batch the skeleton:

- Lives in `@rekon/capability-docs`, alongside the existing
  `proofReportPublisher`, `architectureSummaryPublisher`, and
  `agentContractPublisher`.
- Exposes two pure helpers:
  - `buildGitHubCheckPayload(...)` — renders the Check payload
    (name, conclusion, output title / summary / text) from
    Rekon artifacts.
  - `assessGitHubCheckPublisherReadiness(...)` — returns
    `{ ready, issues[] }` after evaluating opt-in env vars,
    token presence, and event trust.
- **Makes no GitHub API call.** Imports no network client.
  Never authenticates.
- **Is disabled by default.** Readiness only returns
  `ready: true` when `REKON_GITHUB_CHECKS=1` (or `true`),
  `GITHUB_TOKEN` is present, `GITHUB_REPOSITORY` is present,
  a head SHA is present, and the event is in the trust list.
- **Treats forked pull-request events as untrusted by
  default.** Readiness fails for forked PRs unless an explicit
  override is set; `pull_request_target` is rejected
  unconditionally in this skeleton.
- **Preserves the canonical-artifact boundary.** The Check
  payload always includes the phrase
  "GitHub status is not canonical truth; Rekon artifacts
  remain canonical." and cites the
  `VerificationResult` / `VerificationRun` / proof report /
  architecture summary / agent contract ids it summarised.

This is **step 6** of the CI / GitHub adapter implementation
sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
Steps 1–5 (decision memo, execute / dry-run workflow templates,
`rekon artifacts latest`, hardening v2, workflow validation
helper) have already shipped. The actual GitHub API call lives
in a future slice; this slice only adds the payload-shape +
readiness-gate primitives.

No `.github/workflows/*.yml` is added to the Rekon repo. No
GitHub API calls are added. No GitHub write permissions are
requested. No PR comments are written.

## Problem

Rekon currently surfaces verification proof state via:

- The `VerificationResult` / `VerificationRun` artifacts.
- The proof-report `Publication` (markdown).
- The architecture summary `Publication` (markdown).
- The agent-contract `Publication` (markdown).
- The GitHub Actions workflow templates' job-summary block
  (which echoes the proof-report markdown into
  `$GITHUB_STEP_SUMMARY`).
- The uploaded `.rekon/artifacts/**` workflow artifact (raw
  proof, browseable in the workflow run).

These surfaces are all artifact-backed and read-only. What
they do **not** give reviewers is a **decision-point status
chip**: the green / yellow / red dot beside a PR's commit
that GitHub Checks (and to a lesser extent PR comments)
provide.

Reviewers benefit from such a chip — but the chip also
introduces three failure modes:

1. **Canonical drift.** Reviewers may treat the chip as the
   source of truth instead of the artifacts.
2. **Permission creep.** Issuing a Check requires
   `checks: write`; PR comments require
   `pull-requests: write`. Both are GitHub write surfaces.
3. **Fork escalation.** Naïvely wiring the publisher into
   `pull_request_target` (or any token-bearing event for
   fork heads) lets fork PR code post Checks / comments with
   the upstream's token in scope. The
   [GitHub Security Lab guidance](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/)
   pins this as the canonical pwn-requests vector.

We need a path that gives reviewers the chip **without**
giving up the canonical-artifact boundary or the fork-safety
invariants pinned in
[`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).

## Current GitHub Workflow State

Already shipped (steps 1–5 of the sequence in the parent
memo):

- Decision memo:
  [`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md).
- Execute workflow template at
  [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml).
- Dry-run workflow template at
  [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml).
- `rekon artifacts latest` CLI helper.
- Workflow hardening v2 (extended latest-lookup chain,
  improved job-summary markdown, adoption + troubleshooting
  sections in the operator guide).
- Read-only static workflow validator:
  `rekon verify github-workflow validate --path
  <workflow.yml> [--json]`.

What is **not** yet shipped, and the order in which it could
land:

6. **GitHub Check publisher (beta).** Decision + gated
   skeleton in this batch. Actual GitHub API call deferred.
7. **PR comment publisher (beta+).** Similar shape to step 6
   but writes inline PR comments. Requires
   `pull-requests: write`. Deferred until step 6's API
   surface, retry logic, and error handling are concrete.
8. **Cross-CI documentation (beta+).** Document the same
   pattern for GitLab CI, Jenkins, CircleCI, etc.

## Options Considered

### Option A: Keep templates only

Stay where steps 1–5 left us. Operators rely on the workflow
artifact + job-summary block for proof visibility.

- **Pros:** Zero new surface area. No new permission. No new
  failure modes.
- **Cons:** Reviewers still have to click into the workflow
  run to see proof state. There is no decision-point chip.
- **Verdict:** Acceptable as alpha posture; not a long-term
  answer.

### Option B: Add a gated GitHub Check publisher skeleton (recommended)

Add a publisher that consumes Rekon artifacts and produces a
GitHub Check payload + readiness report. Gate it behind
explicit opt-in env / config. **Do not** call GitHub in this
batch. Defer the API call to a follow-up slice with its own
review packet.

- **Pros:**
  - Lets us pin the payload shape and conclusion mapping
    before the API surface is live.
  - Lets us land tests for the readiness gate (fork rejection,
    token requirement, opt-in env requirement) without
    hitting GitHub.
  - Keeps the next API-bearing batch small and reviewable.
  - Preserves the canonical-artifact boundary: the Check
    payload always cites the underlying artifact ids and
    carries the canonical-truth reminder.
- **Cons:** Two batches instead of one. The skeleton is
  "dead" until the API batch lands.
- **Verdict:** **Recommended.** Splits a high-risk change
  (first GitHub-write surface) into two small reviews:
  payload shape now, API call later.

### Option C: Add PR comment publisher first

Skip Checks and ship inline PR comments instead.

- **Pros:** PR comments are slightly more visible than
  Checks for reviewers who don't notice the chip.
- **Cons:**
  - Requires `pull-requests: write`, a strictly broader scope
    than `checks: write`.
  - PR comments are noisier (mutating PR conversation) and
    harder to deduplicate.
  - GitHub Checks were designed for exactly this kind of
    status report; PR comments were not.
- **Verdict:** Rejected for this batch. Reconsider after
  step 6 lands.

### Option D: Hosted / app-based publisher

Push the publisher to a GitHub App or hosted Rekon service.

- **Pros:** Lets the publisher run with its own credentials
  scoped per installation. Avoids embedding GitHub tokens in
  the user's CI.
- **Cons:** Requires hosted infrastructure Rekon does not
  yet have. Operationally a much larger commitment.
- **Verdict:** Rejected for alpha / beta. Reconsider when
  Rekon has a hosted surface.

## Recommendation

**Adopt Option B.** Ship in two slices:

1. **This batch (step 6a).** Decision memo + gated skeleton.
   - `buildGitHubCheckPayload(...)` in
     `@rekon/capability-docs`.
   - `assessGitHubCheckPublisherReadiness(...)` in
     `@rekon/capability-docs`.
   - Contract tests for conclusion mapping, summary content,
     and readiness gating.
   - No GitHub API call. No CLI command. No active workflow.
2. **Next batch (step 6b).** GitHub Check publisher dry-run
   CLI.
   - `rekon publish github-check --dry-run --json` reads
     local Rekon artifacts and prints the Check payload +
     readiness report. Still makes no API call.
3. **Later batch (step 6c).** Actual GitHub API write.
   - Only after the dry-run CLI is stable and reviewed.
   - Adds the `octokit` (or equivalent) dependency under a
     dedicated import path.
   - Gated by the readiness gate from step 6a.

## Canonical Artifact Boundary

The Check publisher is a **downstream surface**. The
canonical artifacts are:

- `VerificationPlan` — the plan operators committed to run.
- `VerificationRun` — the runner's recorded execution.
- `VerificationResult` — the proof summary derived from the
  run.
- Proof-report `Publication` — the human-readable proof
  markdown.
- Architecture summary `Publication` — the human-readable
  architecture markdown.
- Agent contract `Publication` — the human-readable agent
  operating contract.

The Check payload always:

- Cites the `VerificationResult` id (when present).
- Cites the `VerificationRun` id (when present).
- Cites the proof-report `Publication` id (when present).
- Cites the architecture-summary `Publication` id (when
  present).
- Cites the agent-contract `Publication` id (when present).
- Cites the `artifacts validate` outcome (true / false).
- Includes the phrase
  **"GitHub status is not canonical truth; Rekon artifacts
  remain canonical."**

If the canonical artifact set is missing or stale, the Check
conclusion **is not `success`**. The publisher never
"upgrades" missing-proof to success. The publisher never
auto-resolves findings. The publisher never auto-applies
reconciliation.

## Permission Model

The Check publisher is **disabled by default**. Readiness
returns `ready: false` unless **all** of the following are
true:

- `REKON_GITHUB_CHECKS` is `"1"` or `"true"`.
- `GITHUB_TOKEN` is present and non-empty.
- `GITHUB_REPOSITORY` is present and non-empty (the
  `<owner>/<repo>` form GitHub Actions populates).
- A head SHA is present — either `GITHUB_SHA` for non-PR
  events, or the pull-request head SHA for PR events.
- The event is trusted (see "Fork And Secret Safety").
- The Actions workflow has been deliberately granted
  `checks: write`. The skeleton does not assume this; the
  caller (the future CLI) must confirm. The readiness gate
  emits a `write-permission-not-confirmed` issue when the
  caller does not pass an explicit `writePermissionConfirmed:
  true` flag.

Even when readiness is `ready: true`, the publisher in this
slice **still does not call GitHub**. The flag means "all
preconditions are met, the API call would be safe to attempt
in a later slice."

The Rekon repo itself stays at `permissions: contents: read`
in all bundled workflow templates. The Check publisher does
not change that. If operators choose to enable Checks in
their own copy of the workflow, they explicitly add
`checks: write` to that copy — and the read-only
`rekon verify github-workflow validate` command will flag
that as an alpha-contract violation, which is correct: the
publisher is **beta** by design.

## Fork And Secret Safety

The skeleton classifies GitHub events into trust tiers:

- **`workflow_dispatch`** — trusted. Operator-initiated; the
  event runs in the upstream's context with the upstream's
  secrets. Allowed.
- **`push`** — trusted. The push happened to a branch in the
  upstream repo. Allowed.
- **`pull_request` from the same repository** — trusted.
  The PR head is a branch in the upstream repo. Allowed.
- **`pull_request` from a fork** — **not trusted by
  default**. The PR head is in a fork; the workflow runs
  without secrets attached. Readiness fails with an
  `untrusted-event` issue unless the caller explicitly
  passes `forkOverride: true` (intended for cases where the
  upstream maintainer has manually approved the run).
- **`pull_request_target`** — rejected. Even with an override
  the skeleton refuses. The
  [GitHub Security Lab "pwn requests"](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/)
  guidance pins this trigger as the canonical fork-escalation
  vector; the read-only workflow validator already rejects
  it for alpha templates.

Default-deny on forks is the security default. The override
exists so a maintainer can wire a manually-approved workflow
later; it is not used in alpha and is not used by the
skeleton in this slice.

## Check Payload Model

### Conclusion mapping

The Check `conclusion` is derived from the canonical artifact
set using the following precedence (higher in the table
wins when multiple signals apply):

| Signal | Conclusion |
| --- | --- |
| `artifacts validate` returns `false` | `failure` |
| `VerificationResult.status === "failed"` | `failure` |
| `VerificationRun` recorded `killed` status (process killed) | `failure` |
| `VerificationRun` recorded `timeout` status | `timed_out` |
| `VerificationResult.status === "partial"` | `action_required` |
| Proof is stale (run / result older than the latest plan) | `action_required` |
| Proof is missing (no `VerificationResult` for the latest plan) | `action_required` |
| `VerificationResult.status === "not-run"` | `neutral` |
| `VerificationResult.status === "passed"` and fresh | `success` |

When multiple signals apply the precedence is:
`failure` > `timed_out` > `action_required` > `neutral` >
`success`. The skeleton never collapses a worse signal into
a better one.

### Output structure

The `output` field carries:

- `title` — a short summary line (e.g. `"Verification: passed
  (fresh)"` or `"Verification: failed (3 failing commands)"`).
- `summary` — a markdown block including:
  - The conclusion line.
  - The cited `VerificationResult` id (when present).
  - The cited `VerificationRun` id (when present).
  - The cited proof-report `Publication` id (when present).
  - The cited architecture summary `Publication` id (when
    present).
  - The cited agent contract `Publication` id (when
    present).
  - The `artifacts validate` outcome.
  - The canonical-truth reminder.
- `text` — optional, longer markdown body. Reserved for the
  next slice; this slice does not yet populate it.

The skeleton always emits a non-empty `summary`. The summary
**never** contains raw command stdout / stderr; it cites
digests / refs only.

## What This Does Not Do

The skeleton **does not**:

- Call the GitHub API.
- Authenticate to GitHub.
- Import an HTTP client or any GitHub SDK (`@octokit/*`,
  `node-fetch`, etc.).
- Add `.github/workflows/*.yml` to the Rekon repo.
- Add `checks: write`, `pull-requests: write`, `id-token:
  write`, or any other GitHub write permission to any
  bundled template.
- Write to disk.
- Read the local filesystem outside what
  `summarizeVerificationProofSurface` already does
  (which it does not in this slice — the helpers consume
  in-memory artifact-like shapes).
- Execute verification commands.
- Mutate `VerificationRun`, `VerificationResult`,
  `VerificationPlan`, or any artifact.
- Treat the eventual GitHub Check status as canonical
  truth.
- Auto-resolve findings.
- Auto-apply reconciliation operations.
- Upload raw logs.
- Weaken log redaction.

## Implementation Sequence

This batch ships **step 6a** of the sequence below. Steps
6b and 6c are explicitly deferred to later slices.

1. **Decision memo (this document).** ✅ Shipped in this
   batch.
2. **Gated skeleton in `@rekon/capability-docs`:**
   - `GitHubCheckPublisherConfig`,
     `GitHubCheckPayload`,
     `GitHubCheckPublisherReadiness`,
     `GitHubCheckPublisherReadinessIssue` types.
   - `buildGitHubCheckPayload(...)` helper.
   - `assessGitHubCheckPublisherReadiness(...)` helper.
   - No imports from network clients. No `fs` writes. No
     spawn / exec.
   ✅ Shipped in this batch.
3. **Contract tests** at
   `tests/contract/github-check-publisher-skeleton.test.mjs`.
   ✅ Shipped in this batch.
4. **Docs test** at
   `tests/docs/verification-runner-github-check-publisher-decision.test.mjs`.
   ✅ Shipped in this batch.
5. **CLI dry-run command (step 6b).** Future slice. Adds
   `rekon publish github-check --dry-run --json` that reads
   the local artifact store, builds the payload, and prints
   the readiness report. Still no API call.
6. **GitHub API call (step 6c).** Future slice. Adds the
   `octokit` (or equivalent) dependency under a dedicated
   import path. Gated by the readiness gate.
7. **PR comment publisher (step 7).** Future slice.
8. **Cross-CI documentation (step 8).** Future slice.

## Tests Required For Implementation

The contract suite at
`tests/contract/github-check-publisher-skeleton.test.mjs`
covers:

1. Passing fresh proof maps to `conclusion: "success"`.
2. Failed proof maps to `conclusion: "failure"`.
3. Partial proof maps to `conclusion: "action_required"`.
4. Not-run proof maps to `conclusion: "neutral"`.
5. Timeout run maps to `conclusion: "timed_out"`.
6. Killed run maps to `conclusion: "failure"`.
7. Stale proof maps to `conclusion: "action_required"`.
8. Missing proof maps to `conclusion: "action_required"`.
9. `artifacts validate === false` overrides everything to
   `conclusion: "failure"`.
10. Summary includes the canonical-truth reminder.
11. Summary includes the cited
    `VerificationResult` / `VerificationRun` / proof report
    / architecture summary / agent contract ids when
    present.
12. Readiness fails when `REKON_GITHUB_CHECKS` is absent
    (`not-enabled`).
13. Readiness fails when `GITHUB_TOKEN` is absent
    (`missing-token`).
14. Readiness fails for forked `pull_request` events
    (`untrusted-event`).
15. Readiness fails for `pull_request_target` events
    unconditionally (`untrusted-event`).
16. Readiness passes for `workflow_dispatch` with token,
    repo, sha, write-permission confirmation, and the opt-in
    env set.
17. The skeleton module does not import any network client
    or GitHub SDK.

The docs suite at
`tests/docs/verification-runner-github-check-publisher-decision.test.mjs`
covers:

1. The decision doc exists.
2. The doc contains all 11 required headings.
3. The doc recommends a gated GitHub Check publisher
   (Option B).
4. The doc says "GitHub status is not canonical truth".
5. The doc says "Rekon artifacts remain canonical".
6. The doc says forked PRs are not trusted / allowed by
   default.
7. The doc says no GitHub API call ships in this batch.
8. The doc mentions `REKON_GITHUB_CHECKS`.
9. The doc mentions `GITHUB_TOKEN`.
10. The doc mentions `workflow_dispatch`.
11. The doc lists the conclusion mapping table.
12. The CHANGELOG mentions the decision / skeleton.
13. The review packet exists and contains
    `PURPOSE PRESERVATION CHECK`.
