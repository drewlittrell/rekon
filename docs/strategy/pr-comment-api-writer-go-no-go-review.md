# PR Comment API Writer Go/No-Go Review

## Decision Summary

**Recommendation: Go — adopt Option B.** Proceed to
`rekon publish pr-comment --send` using GitHub issue
comments, update-in-place by
`<!-- rekon:pr-comment:v1 -->`, gated by
`REKON_PR_COMMENTS=1`,
`REKON_PR_COMMENTS_WRITE_CONFIRMED=1`, trusted event
context, and explicit write confirmation.

The endpoint + permission boundary are now pinned by
the shipped workflow / validator gate; the remaining
implementation choices (author filter for ownership,
pagination, retry policy, fake-API contract test
structure) are normal design questions to be answered
inside the writer slice's own review packet, not
blockers that justify another spike batch.

This batch ships **the decision memo only**. No new
package. No new CLI command. No new helper. No
workflow template change. No validator profile change.
No GitHub API call.

Pinned reminders carried forward:

- **PR comments are not canonical truth; Rekon
  artifacts remain canonical.**
- **The idempotency marker is not proof; it is only
  an update-in-place handle.**
- **Forked PRs remain denied by default at three
  layers (workflow trigger list, validator profile,
  runtime readiness assessor).**
- **`pull_request_target` remains denied
  unconditionally.**
- **GitHub Actions does not grant write tokens to
  forked-PR workflows unless an admin explicitly
  enables it.**

## Why This Review Exists

Steps 7a–7d landed the PR comment publishing path's
pre-API components:

1. **PR Comment Publisher Decision Memo (7a).** Picked
   Option B (dry-run renderer first; defer posting).
2. **PR comment body dry-run helper + CLI (7b).**
   `buildPrCommentBody`,
   `assessPrCommentPublisherReadiness`, and
   `rekon publish pr-comment --dry-run`. No API call.
3. **PR Comment Publisher API Decision Gate (7c).**
   Picked Option C (build the workflow / validator
   profile boundary first).
4. **PR comment workflow / validator profile (7d).**
   Shipped `docs/examples/workflows/rekon-pr-comment-send.yml`
   + the `github-pr-comment-send` validator profile.

This memo is the **go/no-go gate** before step 7e
(the actual API writer). The PR comment path has
followed the same six-slice discipline as the GitHub
Check path:

| Step | Slice | Status |
| --- | --- | --- |
| 7a | Decision memo | ✅ Shipped |
| 7b | Dry-run renderer + CLI | ✅ Shipped |
| 7c | API Implementation Decision Gate | ✅ Shipped |
| 7d | Workflow / validator profile | ✅ Shipped |
| **7e** | **Go/no-go review (this memo)** | ✅ **Shipped** |
| 7f | API writer (`publish pr-comment --send`) | ✅ Shipped |
| 7g | PR comment safety review | Future; if 7f ships |

Skipping from 7d straight to a writer batch would
have collapsed three separate review questions
(endpoint, idempotency, ownership detection) into
one slice. This gate exists so each can be reviewed
explicitly before any GitHub API call lands.

## Components Reviewed

1. **`buildPrCommentBody(input)`** (shipped 7b).
   Pure function. Renders the markdown body with the
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
   `write-permission-not-confirmed`. Contract tests
   pin `not-enabled`, `pull_request_target` denial,
   and forked-PR denial.
3. **`rekon publish pr-comment --dry-run`** (shipped
   7b). The only CLI surface that exercises the
   helpers. `--dry-run` required; `--send` /
   `--publish` / `--execute` refused. The readiness
   assessor receives an empty env map; the CLI
   never reads `process.env.GITHUB_TOKEN`. Reads
   local artifacts, runs `artifacts validate`
   read-only, prints
   `{ kind: "rekon.pr-comment.dry-run", dryRun: true,
   wouldPublish: false, readiness, comment,
   citedRefs, canonicalTruthReminder }`. 18 contract
   tests + 9 docs assertions pin every guardrail.
4. **`docs/examples/workflows/rekon-pr-comment-send.yml`**
   (shipped 7d). `workflow_dispatch` trigger only.
   `permissions: contents: read +
   pull-requests: write` only. Workflow-level env
   declares `REKON_PR_COMMENTS: "1"` +
   `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`. Runs
   the full execute proof loop + `publish pr-comment
   --dry-run` (no `--send`). Uploads
   `.rekon/artifacts/**` excluding `.log`. Job
   summary carries `Mode: pr-comment-dry-run`, the
   canonical-truth reminder, and the
   marker-not-proof reminder.
5. **`github-pr-comment-send` validator profile**
   (shipped 7d). Permits `pull-requests: write`
   only (plus baseline `contents: read`). Rejects
   every other write scope including `checks:
   write`. Refuses `pull_request_target` + the
   `pull_request` trigger. Requires the Rekon
   opt-in env + the `publish pr-comment --dry-run`
   step. Refuses `publish pr-comment --send` (the
   `forbidden-publish-pr-comment-send` issue code).
   Validator contract tests cover the profile happy
   path + every rejection rule. Cross-profile
   smokes confirm: PR comment template under
   `read-only` profile fails; check-send template
   under PR comment profile fails.
6. **Idempotency marker model.**
   `<!-- rekon:pr-comment:v1 -->` rendered at line 1
   of every body. The marker is an identity handle,
   not proof — pinned in three places (decision
   memo 7a, dry-run renderer 7b, workflow template
   job summary 7d). The marker version (`v1`) lets
   a future `v2` publisher match `v1` markers for
   backwards compatibility while emitting `v2`
   markers for forward identification.
7. **Permission model:**
   `pull-requests: write` vs `issues: write`.
   GitHub treats PR timeline comments as **issue
   comments** under the hood (because pull requests
   are issues at the timeline level). Either scope
   permits the create/update endpoints; the shipped
   template requests `pull-requests: write`
   (conventional choice; scopes to PR objects
   rather than the broader Issues object). See
   "Permission Model Review" below.
8. **Fork / `pull_request` / `pull_request_target`
   behaviour.** Three-layer defence:
   - **Workflow template:** trigger list excludes
     `pull_request` and `pull_request_target`.
   - **Validator profile:** `github-pr-comment-send`
     refuses both triggers via
     `pull-request-trigger-disallowed` (existing
     code, now applied to the new profile) and
     `pull-request-target` (existing code).
   - **Runtime readiness:** the assessor
     classifies forked `pull_request` events as
     `untrusted-fork` (denied by default) and
     `pull_request_target` as
     `unconditional-deny`. The CLI does not
     expose `forkOverride`.
   - **GitHub Actions** itself denies write tokens
     to forked-PR workflows unless the
     repository-level toggle is on (off by default).
9. **No-token / no-network dry-run safety.**
   Contract tests pin: a sentinel `GITHUB_TOKEN`
   never appears in stdout/stderr; the source-scan
   on the `pr-comment` branch finds no `fetch(`,
   no `https.request(`, no `publishGitHubCheckRun(`
   call; the artifact index is byte-identical
   before / after a `--dry-run` run.
10. **Noise / duplicate / stale-comment risks.**
    Mitigated by the update-in-place strategy
    pinned in the decision memo. The future writer
    will: list PR timeline comments, filter by
    marker + author identity, PATCH a single
    match, POST when no match, never delete
    reviewer-touched comments. Stale-comment risk
    is bounded by the marker + the canonical-truth
    reminder in the body; reviewers can always
    follow refs back to the canonical artifacts.
11. **GitHub Check vs PR comment review value.**
    The Check Run gives reviewers the status chip
    beside the commit (already shipped, beta-ready
    per the safety review). The PR comment gives
    reviewers the persistent narrative in the PR
    conversation timeline. The two are
    complementary: the Check is a binary chip; the
    comment is the explanation. Each can ship
    independently; this slice asks only about the
    comment.
12. **Implementation sequence if approved.** See
    "Implementation Sequence" below.

## Permission Model Review

**Required permission for the future PR comment API
writer:** `pull-requests: write` (the conventional
choice for PR-conversation surfaces).

GitHub treats PR timeline comments as **issue
comments** under the hood. The REST endpoints are:

- **List PR comments:** `GET /repos/{owner}/{repo}/issues/{issue_number}/comments`
- **Create PR comment:** `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`
- **Update PR comment:** `PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}`

Each endpoint accepts **either** the `Issues: write`
**or** `Pull requests: write` permission. The shipped
PR comment workflow template chose
`pull-requests: write`. This is sufficient for the
selected endpoint; the writer does not need
`issues: write`.

| Surface | Permission | Status |
| --- | --- | --- |
| GitHub Check | `checks: write` | shipped opt-in |
| PR comment issue-comment endpoint | `pull-requests: write` or `issues: write` | under review |
| Existing read-only workflows | `contents: read` | unchanged |

**`pull-requests: write` is a broader / different
write surface than `checks: write`.** The
`checks: write` scope only permits Check Run CRUD;
`pull-requests: write` permits PR-conversation
mutation, label changes, milestone changes, requested
reviewer changes, etc. The publisher will use only
the comment endpoints; the validator pins this by
refusing the `pull_request` trigger and rejecting
every other write scope.

**Forked PRs:** GitHub Actions does not grant
write-capable tokens to forked-PR workflows unless
the repository admin explicitly enables the
"Send write tokens to workflows from fork pull
requests" toggle (off by default). This external
default is **not** a substitute for Rekon's own
gates — operators can flip the toggle — but it is a
useful additional barrier.

## Endpoint Model Review

**Selected endpoint:** GitHub's issue-comment
endpoints. PR timeline comments are issue comments;
the writer will create / update one Rekon-owned
comment per PR using `POST /issues/{n}/comments`
and `PATCH /issues/comments/{id}`.

**Why issue comments, not PR-review comments:**

- **Issue comments** attach to the PR's conversation
  timeline (the main thread reviewers read).
  Suitable for a whole-PR proof summary.
- **PR review comments** attach to specific files /
  lines of a diff. Not suitable for a whole-PR
  summary; would force the writer to pick a file +
  line, which would mislead reviewers about scope.
- **PR reviews** can carry an overall body, but the
  surface is more involved (review state,
  individual file comments) and triggers stronger
  notification behaviour than reviewers expect for
  an informational status update.

**Open implementation choices for the writer slice
(7f) to pin:**

- **Comment ownership filter.** The future writer
  will filter timeline comments by the marker
  (`<!-- rekon:pr-comment:v1 -->`) AND by author
  identity (`github-actions[bot]` for the standard
  `GITHUB_TOKEN`, OR a configurable allowlist for
  custom tokens). The 7f review packet will pin
  the exact filter shape.
- **Pagination behaviour.** The list endpoint
  paginates (max 100 per page). The writer will
  walk pages until it finds the first Rekon-owned
  comment OR exhausts the list. The 7f review
  packet will pin the max-pages bound (recommended
  default: 10 pages = 1000 comments inspected,
  sufficient for any reasonable PR).
- **Rate-limit / retry handling.** GitHub's REST
  rate limit is 5,000 requests/hour per token. A
  single PR comment publish uses 1–2 calls (list +
  POST/PATCH). The writer should treat rate-limit
  responses as an exit-1 error with the
  `documentation_url` GitHub returns; bounded
  retry behaviour is deferred to a follow-up
  slice. The 7f review packet will pin "no retry
  in v1; surface the rate-limit error cleanly".
- **API base URL override.** Parallel to the
  GitHub Check `--api-base-url` flag. Enables
  fake-API contract tests + GHES adopters. Should
  be added to `publish pr-comment --send`.
- **Sanitized errors.** Same shape as the GitHub
  Check publisher: `{ status, message,
  documentationUrl }` only; token never appears.
  Sentinel-token contract test.

None of these is a blocker. They are normal
implementation choices to make inside the writer
slice; the gate's job is to confirm the boundary is
clear enough to start writing, which it now is.

## Idempotency And Noise Review

**Idempotency strategy** (pinned by the decision
memo + this review):

1. List PR timeline comments (paginated).
2. Filter by marker (`<!-- rekon:pr-comment:v1 -->`)
   at the start of the body AND by author identity
   (`github-actions[bot]`).
3. **Match found:** PATCH that comment with the
   new body.
4. **No match:** POST a new comment.
5. **Multiple matches** (rare; happens if
   reviewers manually delete + recreate): PATCH
   the most-recently-created one; leave others
   alone — the publisher does **not** delete
   reviewer-touched comments.

**The idempotency marker is not proof.** It is only
an identity handle for the update-in-place
behaviour. The canonical proof state lives in the
cited `VerificationResult` / `VerificationRun` /
`Publication` artifacts, not in the marker or the
comment body. A reviewer who finds a stale marker
without the matching artifacts should treat the
comment as informational, not authoritative.

**Noise / staleness risks** + mitigations:

- **Comment spam from new-comment-per-run.**
  Mitigated by update-in-place.
- **Stale comments after fixes.** Each body carries
  the canonical-truth reminder + cites the
  underlying artifact ids. The future writer should
  also include a "**Generated**: <ISO timestamp>"
  line so reviewers can spot stale content at a
  glance.
- **Comments outside our control.** Reviewers can
  delete the Rekon-owned comment manually; the
  next run will re-POST. Reviewers can edit the
  body manually; the next run will PATCH and
  overwrite. The marker is the only identity
  contract; the body is fully owned by the
  publisher.

## Fork And Event Safety Review

Three-layer defence preserved:

| Layer | Behaviour |
| --- | --- |
| Workflow template | `workflow_dispatch` trigger only. No `pull_request`, no `pull_request_target`. |
| Validator profile | `github-pr-comment-send` refuses both `pull_request` and `pull_request_target` triggers via existing issue codes. |
| Runtime readiness | `assessPrCommentPublisherReadiness` classifies forked `pull_request` as `untrusted-fork` (denied by default) and `pull_request_target` as `unconditional-deny`. The CLI does not expose `forkOverride`. |

GitHub Actions itself denies write tokens to
forked-PR workflows by default. **Forked PRs remain
denied by default** across every layer.
**`pull_request_target` remains denied
unconditionally** across every layer.

The writer slice (7f) must not relax any of these.
The safety review slice (7g) will re-pin this
contract end-to-end.

## Options Considered

### Option A — Stop at dry-run for beta

Keep PR comment body rendering as a local preview
only. Use GitHub Checks + job summaries + uploaded
Rekon artifacts as the beta review surface.

**Pros:** lowest permission risk; no comment noise;
no stale-comment lifecycle; no idempotency
complexity.

**Cons:** less narrative guidance in the PR
timeline; reviewers may miss the job summary /
artifacts.

**Verdict:** acceptable long-term stance, but the
workflow / validator gate has already pinned the
boundary cleanly; defaulting back to dry-run-only
would waste the work that just shipped. Rejected as
the default; reconsider only if operator demand
fails to materialise.

### Option B — Implement API writer now, issue-comment endpoint (recommended)

Add `rekon publish pr-comment --send` using GitHub
issue comments. List → filter by marker + author
→ PATCH (or POST if no match) → exit 0 / 1 with
sanitized status.

**Pros:** aligns with GitHub's PR timeline model;
supports update-in-place; familiar endpoint;
mirrors the GitHub Check publisher's staged shape
exactly.

**Cons:** requires `pull-requests: write`; needs
pagination; needs ownership-filter design (already
pinned: marker + author identity).

**Verdict:** **Recommended.** The endpoint +
permission boundary are pinned by the shipped
gate; the remaining implementation choices are
normal design decisions for the writer slice's own
review packet.

### Option C — Implement API writer now, pull-request review/comment endpoint

Use a PR-review endpoint instead of issue comments.

**Pros:** PR-specific.

**Cons:** inline review comments attach to
files/lines, which is the wrong surface for a
whole-PR summary; PR reviews carry overall state
(approve / changes-requested / commented) that
would mislead reviewers; broader permission
surface.

**Verdict:** Rejected. The issue-comment surface
is the right place for a Rekon-owned PR-wide
status comment.

### Option D — Implement one more safety slice first (endpoint/permission spike)

Before the writer, do a smaller spike: pin the
endpoint, permission scope, pagination model, and
fake-API contract test structure as their own slice.

**Pros:** avoids shipping against ambiguous
permission scope.

**Cons:** delays actual PR comment publishing.

**Verdict:** Rejected. The endpoint is pinned (PR
timeline comments are issue comments; create / list /
update endpoints are well-documented). The
permission is pinned (`pull-requests: write`, per
GitHub's issue-comment docs and the shipped 7d
template). The pagination, retry, and ownership-
filter details are normal implementation decisions
for the writer slice to make inside its own review
packet — adding a separate spike batch would
duplicate that work.

## Recommendation

**Adopt Option B.** Proceed to
`rekon publish pr-comment --send` using GitHub issue
comments, update-in-place by
`<!-- rekon:pr-comment:v1 -->`, gated by
`REKON_PR_COMMENTS=1`,
`REKON_PR_COMMENTS_WRITE_CONFIRMED=1`, trusted event
context, and explicit write confirmation.

**Pinned for the writer slice (step 7f):**

- **Endpoint:** issue-comment endpoints
  (`POST /repos/{owner}/{repo}/issues/{n}/comments`,
  `PATCH /repos/{owner}/{repo}/issues/comments/{id}`,
  `GET /repos/{owner}/{repo}/issues/{n}/comments`).
- **Permission:** `pull-requests: write` (already
  declared by the bundled template; the writer does
  not need `issues: write`).
- **Auth:** Bearer `GITHUB_TOKEN` from
  `process.env`; read only inside the `--send`
  branch; never echoed in errors.
- **Idempotency:** match marker `+` author
  identity, PATCH first / POST fallback.
- **No-retry policy v1:** rate-limit / network
  errors → exit 1 with sanitized payload.
  Bounded-retry is a follow-up.
- **No-token-leak invariant:** sanitized errors
  (`{ status, message, documentationUrl }` only);
  sentinel-token contract test.
- **Fork safety:** unchanged; forked PRs denied at
  three layers.
- **CLI exit codes:** exit 0 on API success
  regardless of proof status (the CLI op
  succeeded; proof state is in the body); exit 1
  on readiness failure or API error.
- **`--api-base-url` flag:** parallel to the
  GitHub Check `--send` mode; enables fake-API
  contract tests.

**Step 7f explicitly does NOT add:**

- A new validator profile (the existing
  `github-pr-comment-send` profile already permits
  `publish pr-comment --send` via removal of the
  `forbidden-publish-pr-comment-send` rule in a
  controlled change inside 7f itself, OR adds a
  separate `github-pr-comment-send-active` profile
  — the 7f review packet will pick one).
- A new workflow template (the existing
  `rekon-pr-comment-send.yml` template will gain a
  `--send` step in 7f).
- PR reviews (Option C, rejected).
- Bounded retry / rate-limit backoff (follow-up).
- Hosted publisher (Option D from the API
  decision gate, rejected).

If, after the writer slice ships and the safety
review (7g) runs, operators decide PR comments
aren't worth the operational cost, **Option A
becomes the default**: roll back the `--send`
mode + keep the dry-run renderer as a local
preview.

## Canonical Artifact Boundary

PR comments — like GitHub Checks — are **downstream
review surfaces**. The canonical artifacts remain:

- `VerificationPlan`
- `VerificationRun`
- `VerificationResult`
- Proof-report / architecture-summary / agent-
  contract `Publication`s

The future PR comment publisher will:

- **Cite** these refs by id in every comment body
  (the dry-run renderer already does this).
- **Carry** the canonical-truth phrase verbatim.
- **Never** mutate any Rekon artifact.
- **Never** imply a finding has been auto-resolved
  or that reconciliation has been auto-applied.

If an operator deletes the PR comment manually,
the proof state in `.rekon/artifacts` is
unaffected. The comment is disposable; the
artifacts are not.

**The idempotency marker is not proof.** It is only
an update-in-place handle.

## What This Does Not Do

This batch **does not**:

- Implement `rekon publish pr-comment --send`.
- Add any GitHub API call.
- Modify any workflow template.
- Modify any validator profile.
- Add a `@rekon/capability-pr-comment` package or
  any other new package.
- Read `GITHUB_TOKEN` anywhere.
- Mutate any Rekon artifact.
- Bump any version. Publish to npm.

The shipped artefacts are: this memo, a docs test,
a review packet, and supporting-doc
cross-references.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 7a | Decision memo | ✅ Shipped |
| 7b | Dry-run renderer + CLI | ✅ Shipped |
| 7c | API Implementation Decision Gate | ✅ Shipped |
| 7d | Workflow / validator profile | ✅ Shipped |
| 7e | **Go/no-go review (this memo)** | ✅ **Shipped** |
| 7f | API writer (`publish pr-comment --send`) | ✅ Shipped |
| 7g | PR comment safety review | After 7f |

The 7f slice (next) ships:

1. **New helper** in `@rekon/capability-docs`:
   `publishPrCommentRun(input)` (parallel to
   `publishGitHubCheckRun`). Lists timeline
   comments via the issue-comment endpoint,
   filters by marker + author identity, PATCHes
   the first match or POSTs when none. Uses
   Node's built-in `fetch`; no third-party
   network client. Sanitized errors. Never
   echoes the token.
2. **New CLI mode:** `rekon publish pr-comment
   --send [--root <path>] [--confirm-pr-comments-write]
   [--api-base-url <url>] [--json]`. Mutually
   exclusive with `--dry-run`; passing both or
   neither is exit 1. Reads `process.env` only
   in the `--send` branch. Refuses unless
   readiness passes. Same shape as `publish
   github-check --send`.
3. **Workflow template update** at
   `docs/examples/workflows/rekon-pr-comment-send.yml`:
   add a `publish pr-comment --send` step
   (`if: always()`); the validator's
   `forbidden-publish-pr-comment-send` rule
   becomes the gate's job to lift — the 7f slice
   will either remove that rule or introduce a
   separate `github-pr-comment-send-active`
   profile.
4. **Contract tests** at
   `tests/contract/pr-comment-send-cli.test.mjs`
   using a local `node:http` fake server +
   `--api-base-url` to redirect the CLI's
   request. Tests cover: refuses without
   `--send`; refuses readiness gates; calls
   transport once when ready; PATCHes on match
   / POSTs on miss; sanitizes errors (sentinel
   token); pagination walk; ownership filter.
5. **Validator extension** to allow
   `publish pr-comment --send` under the
   `github-pr-comment-send` profile (or via a
   new `github-pr-comment-send-active` profile;
   the 7f review packet decides).
6. **Docs** update: operator guide section,
   strategy memos, CHANGELOG, README, review
   packet.

The 7g slice (after 7f) is a safety review that
walks the full PR comment publishing path
(dry-run + workflow profile + API writer + safety
review) and confirms beta-readiness or surfaces
remaining blockers, parallel to the GitHub Check
publisher's safety review.

## Follow-Up Work

In order of expected priority:

1. **PR comment API writer (step 7f).** Next
   slice. Build the writer per the
   recommendation above.
2. **PR comment safety review (step 7g).** After
   7f. Confirms beta readiness end-to-end.
3. **Same-repo `pull_request` guard.** Allow
   operators to opt into same-repo PR comments
   via a workflow-level guard
   (`REKON_PR_COMMENTS_PR_IS_FORK=0` style env or
   `github.event.pull_request.head.repo.fork`
   parsing). Not blocking for 7f.
4. **Rate-limiting / bounded retry on `--send`.**
   Defer until 7f + 7g land; design with the same
   bounded-retry posture as a future GitHub Check
   retry slice.
5. **Hosted PR comment publisher (Option D from
   the API decision gate).** Reconsider when
   Rekon has a hosted surface.

### Risk register

| Risk | Current Guardrail | Remaining Follow-Up |
| --- | --- | --- |
| comment spam | marker planned | update existing comment only |
| stale comment | canonical reminder | update-in-place + timestamp |
| fork token misuse | workflow_dispatch only / validator profile | runtime readiness gate |
| endpoint permission mismatch | permission review | API writer contract tests |

No risk is severe enough to block the 7f
implementation slice. Each has a current
guardrail; the writer slice's contract tests will
pin the remaining follow-ups.
