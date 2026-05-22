# PR Comment Publisher Decision

## Decision Summary

**Recommendation: Option B now — design a PR comment
dry-run renderer; defer actual PR comment posting.**

The GitHub Check publisher path is beta-ready as an
opt-in surface
([safety review](github-check-publisher-send-workflow-safety-review.md)).
PR comments would add a second GitHub-write surface
with broader permission requirements
(`issues: write` or `pull-requests: write`), broader
noise / staleness risk, and a richer comment-identity
problem. We should design and test the comment
content + idempotency model in isolation **before**
adding an API write.

This batch ships **the decision memo only**. No new
package, no new CLI command, no GitHub API call, no
workflow-template change.

**PR comments are not required for beta if GitHub
Checks + Rekon artifacts are sufficient for review.**
The safety review already confirmed Checks + uploaded
`.rekon/artifacts` + the job summary deliver the
beta-readiness bar.

**If PR comments are implemented later, they must be
opt-in, same-repo / trusted-context only, update-in-place,
and clearly marked as a downstream surface over Rekon
artifacts.**

Pinned reminders carried forward:

- **GitHub status and GitHub comments are not
  canonical truth; Rekon artifacts remain canonical.**
- **Forked PRs and `pull_request_target` remain
  blocked by default.**
- **No automatic finding resolution or reconciliation
  apply is implied by a successful GitHub Check or PR
  comment.**

## Problem

Rekon now publishes a GitHub Check via the gated send
CLI (steps 6c / 6d), and that surface has a documented
safety review (step 6e). Reviewers see a Check Run
badge on each commit, can click through to the
canonical artifacts in the workflow's upload, and can
read the job-summary markdown inline.

What the Check Run **does not** give reviewers:

- A persistent, human-readable comment on the PR
  conversation timeline.
- Inline narrative guidance ("next recommended
  action") in the PR thread itself.
- A surface that other reviewers see while they're
  reading the PR description, not only when they
  notice the Check badge.

PR comments could provide that — but they introduce
four risks not present in the Check Run path:

1. **Broader permission scope.** Posting / updating
   PR-timeline comments requires either `issues: write`
   or `pull-requests: write` (see "GitHub Permission
   Context" below). Both are strictly broader than the
   `checks: write` the opt-in template uses today.
2. **Noise and staleness.** A naïve implementation
   posts a new comment per workflow run; PRs with
   ten runs end up with ten stale Rekon comments.
   Reviewers learn to ignore them.
3. **Comment identity.** Updating one comment
   in place requires tracking which comment is
   "ours" — across reruns, force-pushes, force-deletes
   of the comment by reviewers, and so on.
4. **Canonical-truth blur.** A green comment can
   read as "everything is fine" even when the
   underlying artifacts say otherwise (stale proof,
   failing reconciliation, etc.). A Check Run has a
   clear conclusion enum; a free-form comment has
   to carry the same discipline.

The decision: do we add PR comments now, defer them
indefinitely, or take a middle path (design the
comment body without posting)?

## Current GitHub Review Surfaces

The Rekon review surface today, by visibility on a PR
page:

| Surface | Where reviewers see it | Permission | Mutates GitHub? |
| --- | --- | --- | --- |
| GitHub Check Run (beta opt-in) | Check status badge beside the commit; expandable summary block | `checks: write` | yes (Checks API) |
| Job summary markdown | Workflow run page (one click from the Check badge) | none (filesystem) | no |
| Uploaded `.rekon/artifacts` | Workflow run page → Artifacts | none (filesystem) | no |
| Proof-report `Publication` (markdown body inside the artifact) | Inside the artifact upload | none | no |
| Architecture summary + agent contract `Publication`s | Inside the artifact upload | none | no |

What's already covered:

- Decision-point chip beside the commit (Check Run).
- Artifact-backed, byte-identical, auditable proof
  state (uploaded `.rekon/artifacts`).
- Canonical-truth reminder in every Check summary +
  every operator-facing doc.
- Three-layer fork / `pull_request_target` defence.

What a PR comment would add:

- A persistent, scrolled-into-view, narrative-shaped
  surface in the PR conversation timeline itself.
- A surface that does **not** require reviewers to
  click through to the workflow run.

## GitHub Permission Context

GitHub treats PR comments as **issue comments** under
the hood (because pull requests are issues at the
timeline level). Creating, editing, or deleting a PR
timeline comment requires either:

- **`issues: write`** — gives the GitHub-Actions-minted
  `GITHUB_TOKEN` write access to issues, including
  the ability to add, edit, and delete issue comments.
- **`pull-requests: write`** — gives the token write
  access to PR-specific operations, also including
  the ability to add, edit, and delete the same
  timeline comments.

Either scope on its own permits the comment surface.
`pull-requests: write` is the more conventional choice
for PR-conversation surfaces (it scopes the write to
PR objects rather than the broader Issues object), but
both work. **Creating or updating PR timeline comments
requires Issues or Pull requests write permission.**

The current opt-in workflow template requests **only**
`checks: write` (plus `contents: read`). Adding the
comment surface would require expanding the bundled
opt-in template — or shipping a separate
checks-write-plus-pr-comments variant — and adding the
matching gate to the workflow validator.

**Forked PRs must not receive secret-bearing comment
publishing by default.** GitHub Actions does not grant
write tokens to forked-PR workflows unless the
repository administrator explicitly enables that
behaviour in repository settings (the
"Send write tokens to workflows from fork pull
requests" toggle, off by default). This keeps Rekon's
existing fork-default-deny posture correct: even if we
ship a PR comment publisher in the future, forked PRs
would still be blocked by GitHub's default token
policy, and the Rekon readiness gate would refuse
forked-PR events at the same place it refuses them
today.

## Options Considered

### Option A — No PR comments for beta

Stay with GitHub Checks + job summary + uploaded
Rekon artifacts only.

**Pros:**
- Lowest permission surface. Rekon's only GitHub-write
  surface remains `checks: write`.
- Avoids comment noise, staleness, and idempotency
  complexity.
- The existing Check Run path is already visible in
  the PR / review UI.
- The job summary + artifact upload already deliver
  narrative + canonical proof.

**Cons:**
- Reviewers may not click through to the workflow run
  to read the summary / artifacts.
- No persistent human-readable timeline comment in
  the PR conversation.

**Verdict:** acceptable for beta. The safety review
already pinned this combination as beta-ready. The
only thing PR comments add is convenience for
reviewers who never click through; that's a UX gain,
not a safety / proof gain.

### Option B — PR comment dry-run / preview only (recommended)

Add a local CLI that renders the comment body but
never posts it. Pin the content shape, the
idempotency strategy, and the canonical-truth surface
without introducing any new GitHub API call.

**Pros:**
- Lets us design and test comment content safely.
- No new GitHub write permissions yet.
- No active comment surface; no live noise / staleness
  risk.
- Makes the eventual API-write slice (if approved) a
  small, independently reviewable change.
- Useful for docs ("here is what a PR comment would
  look like") and for the planned safety review.
- Mirrors the staged-shipment pattern that worked for
  the Check Run path: decision → skeleton → dry-run
  CLI → send CLI → workflow template → safety review.

**Cons:**
- Does not actually improve the PR-conversation
  surface yet.
- Two batches (dry-run renderer now; API write
  later) instead of one.

**Verdict:** **Recommended.** Splits a higher-risk
change into two small reviews.

### Option C — Opt-in idempotent PR comment publisher

Add a publisher that posts or updates one Rekon-owned
PR comment when explicitly enabled.

**Pros:**
- Richer narrative surface directly in the PR thread.
- Can include proof status, artifact refs, stale
  warnings, next-recommended commands.
- Update-in-place avoids comment spam.

**Cons:**
- Requires `issues: write` or `pull-requests: write`.
- Must track comment identity across runs.
- Fork / secret safety has to be re-pinned at three
  layers (template, validator, runtime readiness),
  same as the Check path.
- Stale comments can mislead reviewers if proof state
  drifts after the comment is posted.
- Higher rollout cost relative to the Check Run path
  that already covers the chip-on-PR use case.

**Verdict:** Rejected **for this batch**. Reconsider
after the Option-B dry-run renderer is stable and the
content + idempotency strategy is pinned.

### Option D — Hosted / GitHub App comment publisher

Defer PR comments to a GitHub App or hosted Rekon
integration.

**Pros:**
- Cleaner permission model (per-installation scoping;
  app-level identity).
- Better identity for the "is this our comment?"
  problem.
- Future product-friendly.

**Cons:**
- Larger product surface. Rekon does not yet have a
  hosted surface.
- Not useful for the local-first beta posture.

**Verdict:** Rejected for alpha / beta. Reconsider
when Rekon has a hosted surface to host an App
behind.

## Recommendation

**Adopt Option B.** Ship in two slices (or three, if
operator demand justifies):

1. **This batch (decision memo).** No new code. No
   new CLI. No workflow change. The memo itself is the
   shipped artifact, with a docs test pinning its
   language.
2. **Next batch (Option-B implementation, only if
   approved).** PR comment body **dry-run** renderer
   + `rekon publish pr-comment --dry-run --json` CLI.
   No GitHub API call. No token reads. Mirrors the
   step-6b shape exactly. Validator unchanged.
3. **Future batch (Option C, deferred).** If the
   dry-run renderer is stable and operator demand
   exists, ship a gated send mode behind an even
   stricter readiness gate than the Check path (same
   token / repo / SHA / event-trust gates **plus** a
   PR-number gate, since PR comments only apply when
   the workflow runs on a PR-correlated event).
4. **Future batch (Option C — workflow template).**
   New opt-in workflow template that requests
   `pull-requests: write` alongside `checks: write`.
   New validator profile (e.g.
   `github-pr-comment-send`) enforces the broader
   contract. The bundled execute / dry-run / opt-in
   templates remain unchanged.

**Pinned constraints for any future PR comment
publisher (informational; not implemented in this
batch):**

- **Must be opt-in.** Disabled by default at the CLI,
  the workflow template, and the validator profile.
- **Must be same-repo / trusted-context only.**
  Forked PRs and `pull_request_target` denied by
  default at three layers (template, validator,
  runtime).
- **Must update in place.** One Rekon-owned comment
  per PR, identified by a stable marker.
- **Must mark itself as downstream.** Every comment
  body carries the canonical-truth phrase and cites
  the underlying artifact ids.
- **Must scope the token.** PR comment token reads
  confined to the `--send` branch of the future PR
  comment CLI. Sanitized errors. Sentinel-token
  contract test.

## Comment Content Model

The future Rekon-owned PR comment body should
include:

- The latest `VerificationResult` status
  (`passed` / `failed` / `partial` / `not-run` /
  `missing`).
- The latest `VerificationRun` ref (when available).
- The latest proof-report `Publication` ref.
- The latest architecture summary `Publication` ref.
- The latest agent contract `Publication` ref.
- The `artifacts validate` outcome.
- Stale-proof warnings (e.g. the cited
  `VerificationResult` references an older
  `VerificationPlan` than the current latest).
- The canonical-truth reminder
  (**"GitHub status is not canonical truth; Rekon
  artifacts remain canonical."**).
- A link / path to the uploaded `.rekon/artifacts`
  workflow artifact, where available, so reviewers
  can jump to the canonical source.

The comment body **must not** include:

- Raw logs from verification commands.
- Full stdout / stderr captured by the runner.
- Full artifact bodies (only refs + status).
- Secrets, tokens, or environment values.
- The Rekon-minted `GITHUB_TOKEN` itself, even in
  sanitized form.

The Rekon runner's existing redaction + truncation
contract already keeps raw logs out of artifact
bodies; the future PR comment publisher cites
artifact refs (digests / ids) but does not read or
forward the redacted bodies.

## Idempotency And Noise Control

**The future publisher must update one existing
Rekon-owned comment rather than posting a new comment
every run.**

Identity is established by an HTML-comment marker at
the top of the comment body:

```html
<!-- rekon:pr-comment:v1 -->
```

The publisher would:

1. List the PR's timeline comments.
2. Filter for comments whose body starts with the
   marker AND whose author is the
   `github-actions[bot]` (or the operator's chosen
   publisher identity).
3. If a match exists, **PATCH** that comment with
   the new body.
4. If no match exists, **POST** a new comment.
5. If multiple matches exist (rare; could happen if
   reviewers manually delete and recreate), update the
   most-recently-created one and leave the others
   intact — the publisher does not delete
   reviewer-touched comments.

**The marker is not proof.** It is only an
idempotency handle. The canonical proof state lives in
the cited `VerificationResult` / `VerificationRun` /
`Publication` artifacts, not in the marker or the
comment body. A reviewer who finds a stale marker
without the matching artifacts should treat the
comment as informational, not authoritative.

The marker shape (`rekon:pr-comment:v1`) lets future
versions of the publisher migrate without colliding
with existing comments: a `v2` publisher could match
on `v1` markers (for backwards compatibility) **and**
emit `v2` markers (for forward identification).

## Fork And Secret Safety

The future PR comment publisher must preserve the
existing three-layer fork-safety contract:

| Layer | Behaviour |
| --- | --- |
| Workflow template | No `pull_request_target` trigger; no `pull_request` trigger by default (forked PRs would inherit the workflow's write scope + Rekon opt-in env). |
| Workflow validator | A new `github-pr-comment-send` profile (if added) enforces the same trigger restrictions as `github-check-send`. |
| Runtime readiness | Send-mode readiness assessor refuses `pull_request_target` unconditionally and forked `pull_request` events by default. |

In addition, GitHub Actions does not grant write
tokens to forked-PR workflows unless the repository
admin explicitly enables it. **Even if** every Rekon
layer above were misconfigured, GitHub itself would
still refuse to mint a write-capable token for a
forked-PR workflow under default settings. This
external default is **not** a substitute for Rekon's
own gates — operators can flip the GitHub-side toggle
— but it is a useful additional barrier.

## Canonical Artifact Boundary

PR comments would be a **downstream review surface**,
identical in posture to GitHub Checks. The canonical
artifacts remain:

- `VerificationPlan`
- `VerificationRun`
- `VerificationResult`
- Proof-report / architecture-summary / agent-contract
  `Publication`s

Any future PR comment publisher would:

- **Cite** these refs by id in every comment body.
- **Carry** the canonical-truth phrase verbatim.
- **Never** mutate any Rekon artifact.
- **Never** imply a finding has been auto-resolved or
  that reconciliation has been auto-applied — the
  comment is informational, downstream, and
  per-commit.

If, after PR comments ship, an operator decides to
delete the PR comment for clarity, the proof state in
`.rekon/artifacts` is unaffected. The comment is
disposable; the artifacts are not.

## What This Does Not Do

This batch **does not**:

- Implement a PR comment publisher.
- Add `pull-requests: write` or `issues: write` to any
  workflow template.
- Add a `rekon publish pr-comment` CLI command.
- Add a new validator profile.
- Modify any existing workflow template.
- Modify the existing `rekon publish github-check`
  CLI surface.
- Modify any artifact shape.
- Add a `@rekon/capability-pr-comment` package or any
  other new package.
- Bump any version. Publish to npm. Spawn a process.
  Mutate any local artifact.

The shipped artefacts are: this memo, a docs test, a
review packet, and supporting-doc cross-references.

## Implementation Sequence

If the Option-B path is approved:

1. **Decision memo (this document).** ✅ Shipped.
2. **PR comment body dry-run helper + CLI.** ✅
   **Shipped (step 7b).** Adds:
   - `buildPrCommentBody(input)` in
     `@rekon/capability-docs` — pure helper that
     renders the comment body (markdown) from
     artifact-like inputs. Always includes the
     canonical-truth phrase and the
     `<!-- rekon:pr-comment:v1 -->` marker.
   - `assessPrCommentPublisherReadiness(input)` in
     the same file — pure helper that returns
     `{ ready, issues[] }` after evaluating
     `REKON_PR_COMMENTS`, `GITHUB_REPOSITORY`, a
     PR-number gate (`GITHUB_PR_NUMBER` /
     `PR_NUMBER`), `GITHUB_TOKEN`, event trust
     (`workflow_dispatch` / `push` / same-repo
     `pull_request` trusted; forked `pull_request`
     untrusted by default; `pull_request_target`
     refused unconditionally), and an explicit
     `writePermissionConfirmed` flag.
   - `rekon publish pr-comment --dry-run [--root
     <path>] [--json]` CLI. **`--dry-run` is
     required.** `--send` / `--publish` /
     `--execute` are refused with exit 1. The CLI
     reads local Rekon artifacts (latest
     `VerificationResult`, `VerificationRun`,
     `VerificationPlan`, proof-report,
     architecture-summary, and agent-contract
     publications), runs `artifacts validate`
     read-only, calls the shared helpers, and
     prints
     `{ kind: "rekon.pr-comment.dry-run",
     dryRun: true, wouldPublish: false,
     readiness, comment, citedRefs,
     canonicalTruthReminder }` as JSON. **The CLI
     reads no `GITHUB_TOKEN`** in dry-run mode
     (the readiness assessor receives an empty
     env map). **The CLI imports no network
     client and calls no GitHub API.** Behavioural
     and source-scan tests pin both.
3. **API Implementation Decision Gate** (step
   7c). ✅ Shipped at
   [`pr-comment-publisher-api-decision-gate.md`](pr-comment-publisher-api-decision-gate.md).
   Reviews the shipped dry-run components +
   permission / fork / comment-body / idempotency
   model and decides whether the next slice
   implements the API writer or the
   workflow/validator profile gate first.
   **Decision: Option C — add a workflow /
   validator profile gate before any API writer.**
4. **Validator / docs for permissions** (next
   slice, step 7d). Adds the
   `github-pr-comment-send` profile to the workflow
   validator (rejects every write scope except
   `pull-requests: write` and the already-permitted
   `checks: write` when the send variant is layered
   on top of the existing opt-in template).
   Documents the broader scope and the noise /
   staleness controls.
5. **PR comment send API write** (future slice,
   step 7e). Only after step 4. Adds the actual
   `--send` mode behind the readiness gate.
   Update-in-place logic. Sanitized errors.
   Sentinel-token contract test. No raw log
   content.

Each step lands as its own batch with its own
decision memo / review packet / contract test
coverage. PR comments are explicitly out-of-scope
until at least step 2 ships.

## Future PR Comment Publisher

If the implementation sequence above completes, the
future opt-in PR comment publisher will sit alongside
the GitHub Check publisher as a **second** downstream
review surface. The two surfaces are complementary:

- The Check Run gives reviewers the **status chip**
  beside the commit.
- The PR comment gives reviewers the **persistent
  narrative** in the PR conversation timeline.

Both surfaces would:

- Read the same canonical Rekon artifacts.
- Carry the same canonical-truth reminder.
- Use the same readiness-gate shape (`REKON_GITHUB_CHECKS`-
  style opt-in env + explicit write-permission
  confirmation + trusted event + non-empty head
  context).
- Refuse forked PRs and `pull_request_target` events
  by default at three layers.

Both surfaces would remain **opt-in**. The read-only
templates would remain unchanged. The canonical proof
state would remain in `.rekon/artifacts`.

Until the implementation sequence completes, Rekon's
review surface is exactly what the
[GitHub Check publisher send workflow safety review](github-check-publisher-send-workflow-safety-review.md)
documents: GitHub Checks + uploaded `.rekon/artifacts`
+ job summaries. **That combination is beta-ready
without PR comments.**
