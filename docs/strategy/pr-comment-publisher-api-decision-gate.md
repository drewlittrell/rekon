# PR Comment Publisher API Decision Gate

**Status:** Step 7c shipped. Step 7d (workflow /
validator profile) shipped. Step 7e
([PR Comment API Writer Go/No-Go Review](pr-comment-api-writer-go-no-go-review.md))
shipped and recommends **Go (Option B)** for the
writer slice (step 7f).

## Decision Summary

**Recommendation: Option C — add a workflow /
validator / profile gate first; do not implement the
PR comment API writer in the next slice. Re-evaluate
the API writer after the gate exists and operators
have inspected the concrete permission boundary.**

The PR comment dry-run renderer + readiness assessor +
`rekon publish pr-comment --dry-run` CLI all shipped
in step 7b. Operators can now preview the exact body
Rekon would post, see which gates would still need to
pass, and inspect the readiness model — **without any
GitHub API call**. This decision gate asks the next
question: should Rekon spend the next slice
implementing actual PR comment posting, or should it
build the workflow / permission boundary first?

**Pinned constraints carried forward:**

- **Actual PR comment posting remains deferred until
  a PR comment workflow / validator profile exists.**
- **PR comments are not canonical truth; Rekon
  artifacts remain canonical.**
- **The idempotency marker is not proof; it is only
  an update-in-place handle.**
- **Forked PRs must not receive secret-bearing
  comment publishing by default.**

This batch ships **the decision memo only**. No new
package. No new CLI command. No new helper. No
workflow template. No validator profile change. No
GitHub API call.

## Why This Gate Exists

The GitHub Check publisher path landed safely because
it was staged across six small reviewable slices:

1. **Decision memo** (step 6a).
2. **Payload + readiness skeleton**
   (`buildGitHubCheckPayload`,
   `assessGitHubCheckPublisherReadiness`).
3. **Dry-run CLI** (`rekon publish github-check
   --dry-run`).
4. **API send CLI** (`rekon publish github-check
   --send`).
5. **Opt-in workflow template** + workflow
   validator's `github-check-send` profile.
6. **Safety review** confirming beta readiness.

The PR comment path is mid-stride along the same
staircase:

1. **Decision memo** (step 7a). ✅ Shipped.
2. **Body + readiness dry-run helper + CLI**
   (step 7b). ✅ Shipped.
3. **API implementation gate** (step 7c). **This
   memo.**
4. **Validator profile + opt-in workflow template**
   (step 7d, recommended next).
5. **API send CLI** (step 7e, only if approved
   after 7d).
6. **Safety review** (step 7f, only if 7e ships).

Stepping straight from 7b to an API write would
collapse three separate review questions (permission
shape, workflow shape, API shape) into one slice. The
gate exists so each can be reviewed independently.

## Current PR Comment Dry-Run State

| Component | Status | Notes |
| --- | --- | --- |
| `buildPrCommentBody` | shipped | pure helper, no GitHub API |
| `assessPrCommentPublisherReadiness` | shipped | readiness only |
| `publish pr-comment --dry-run` | shipped | no token / no network |
| idempotency marker (`<!-- rekon:pr-comment:v1 -->`) | shipped | identity handle, not proof |
| API writer | not shipped | deferred |
| workflow / validator profile | not shipped | recommended next |

What this gives operators today:

- A **local preview** of the exact comment markdown
  Rekon would post, rendered from the same canonical
  artifact refs the GitHub Check publisher cites.
- A **readiness report** that enumerates every gate
  that would have to pass before any API write could
  succeed (`REKON_PR_COMMENTS=1`,
  `GITHUB_REPOSITORY`, PR-number gate,
  `GITHUB_TOKEN`, event trust,
  `writePermissionConfirmed`).
- A **canonical-truth surface** baked into the body:
  every preview carries the phrase
  `GitHub comments are not canonical truth; Rekon
  artifacts remain canonical.`
- A **fork-default-deny posture** at the readiness
  layer: forked `pull_request` events are
  `untrusted-fork` by default; `pull_request_target`
  is `unconditional-deny`.

What it does **not** give operators:

- A persistent PR-conversation surface that
  reviewers can read without clicking through to
  workflow runs.
- A live "is the proof current?" signal in the PR
  timeline.
- An audit trail of when Rekon posted / updated a
  comment (because no post ever happens).

The dry-run renderer is **sufficient as a preview**
but **insufficient as a review surface**. The next
question is whether the gap is worth closing now.

## Permission Model Review

The GitHub Check publisher's existing surface uses
the narrowest write permission for its purpose:

- **`checks: write`** — the only GitHub-write scope
  the opt-in `rekon-verification-check-send.yml`
  template requests. The `github-check-send`
  validator profile permits it and rejects every
  other write scope.

A PR comment publisher requires a strictly **broader**
or **different** write surface. GitHub treats PR
timeline comments as **issue comments** under the
hood (because pull requests are issues at the
timeline level). Creating, editing, or deleting a PR
timeline comment requires **either**:

- **`issues: write`** — gives the
  Actions-minted `GITHUB_TOKEN` write access to
  issues (including the ability to add / edit /
  delete the same timeline comments PRs use).
- **`pull-requests: write`** — gives the token write
  access to PR-specific operations, also including
  the same comment surface.

Either scope on its own permits the comment surface.
`pull-requests: write` is the more conventional
choice for PR-conversation surfaces (it scopes the
write to PR objects rather than the broader Issues
object); `issues: write` works too. Both are broader
than `contents: read` / `checks: write`. **In GitHub
Actions, `issues: write` and `pull-requests: write`
are broader than `contents: read` / `checks: write`.**

A direct comparison:

| Surface | Required scope | Object class | Notes |
| --- | --- | --- | --- |
| GitHub Check Run | `checks: write` | Check runs | Surfaces a single status chip per commit; constrained shape. |
| PR timeline comment (issue comment under the hood) | `issues: write` **or** `pull-requests: write` | Issues / PRs | Free-form content; mutates the PR conversation timeline. |

The wider scope is the canonical reason to keep PR
comments behind their own gate. Operators who are
comfortable granting `checks: write` may not be
comfortable granting `pull-requests: write` (or vice
versa); each repo's threat model is different.

**A PR comment workflow must have its own validator
profile** (e.g. `github-pr-comment-send`). It cannot
be layered on top of the existing `github-check-send`
profile because that profile's contract explicitly
rejects every non-`checks: write` write scope —
including `pull-requests: write` and `issues:
write`.

## Fork And Event Safety Review

The readiness assessor already classifies events into
three tiers:

| Event | Classification | Reason |
| --- | --- | --- |
| `workflow_dispatch` | `trusted` | Operator-initiated; runs in the upstream's context with the upstream's secrets. |
| `push` | `trusted` | Push happened to a branch in the upstream repo. |
| `pull_request` from the same repository | `trusted` | PR head is a branch in the upstream repo. |
| `pull_request` from a fork | `untrusted-fork` | PR head is in a fork; the workflow runs without secrets attached by default. |
| `pull_request_target` | `unconditional-deny` | Refused regardless. Even with `forkOverride: true`, the PR comment readiness gate refuses. |

GitHub Actions itself reinforces this at the
infrastructure layer:

- Forked-PR workflows **do not receive
  write-capable tokens by default**. The
  repository-level "Send write tokens to workflows
  from fork pull requests" toggle is **off** by
  default.
- `pull_request_target` is the canonical
  fork-escalation vector documented by the GitHub
  Security Lab's "preventing pwn requests" guidance;
  Rekon refuses it at three layers (template,
  validator, runtime).

**Forked PRs must not receive secret-bearing comment
publishing by default.** This invariant has three
layers of defence today:

1. The readiness assessor's
   `pullRequestIsFork: true` → `untrusted-fork`
   classification.
2. The GitHub Actions infrastructure default-deny
   on write tokens for forked-PR workflows.
3. The (future) workflow validator profile
   `github-pr-comment-send`, which must reject the
   `pull_request` trigger entirely — same as the
   existing `github-check-send` profile — until a
   future slice adds a same-repo guard.

Adding a same-repo `pull_request` guard (e.g.
`REKON_GITHUB_CHECKS_PR_IS_FORK=0` style env or a
workflow-level `if` expression that reads
`github.event.pull_request.head.repo.fork`) is a
follow-up; it is **not** a prerequisite for the
next slice.

## Comment Body Review

The dry-run body that shipped in step 7b cites:

- `VerificationResult` ref + `status`
- `VerificationRun` ref + run `Source`
- `VerificationPlan` ref + `Freshness`
- Proof-report `Publication` ref
- Architecture-summary `Publication` ref
- Agent-contract `Publication` ref
- `Artifacts valid` (`true` / `false` / `not
  asserted`)
- Optional Warnings block (failed / partial /
  not-run / missing / stale / artifacts-invalid)
- Tailored Next steps based on the detected proof
  state

Every body includes:

- The idempotency marker
  `<!-- rekon:pr-comment:v1 -->` at line 1.
- The canonical-truth reminder
  `GitHub comments are not canonical truth; Rekon
  artifacts remain canonical.` as a blockquote.

The body explicitly **excludes**:

- Raw stdout / stderr from verification commands.
- Full artifact bodies.
- Secrets, tokens, environment values.
- Arbitrary user-supplied fields
  (`evidenceNotes` / `notes` / `recordedBy`); a
  contract test threads a sentinel through each and
  asserts none of them appear in the rendered body.

The dry-run helper + CLI are sufficient for the body
shape. **Nothing about the body model needs to change
before the next slice.** What needs to be added
around it is the permission boundary + a workflow
template + a validator profile that enforces the
boundary.

## Idempotency And Noise Review

**Idempotency strategy (pinned in the PR comment
publisher decision memo):** update one existing
Rekon-owned comment in place. Find the comment by
matching the marker
`<!-- rekon:pr-comment:v1 -->` at the start of the
body. If a single match exists, PATCH it. If no
match, POST a new one. If multiple matches (a rare
case caused by reviewers manually deleting +
recreating), PATCH the most-recently-created one and
leave the others alone — the publisher does **not**
delete reviewer-touched comments.

**The idempotency marker is not proof.** It is only
an identity handle. The canonical proof state lives
in the cited `VerificationResult` /
`VerificationRun` / `Publication` artifacts, not in
the marker or the comment body. A reviewer who finds
a stale marker without the matching artifacts should
treat the comment as informational, not
authoritative.

**Noise risks** to address before the API writer
ships:

- **Spam from new-comment-per-run.** Mitigated by
  the update-in-place strategy above. The future
  API writer must call this out explicitly in its
  CLI design (e.g. a `--no-update-in-place` flag
  would be intentionally not exposed; the
  publisher always tries the PATCH path first).
- **Stale comments after reviewers fix things.**
  Each posted comment carries the canonical-truth
  reminder + cites the underlying artifact ids; a
  reviewer can always navigate to the canonical
  artifact to see whether the body is current. The
  future API writer should also include a
  "**Generated**: <timestamp>" line so reviewers
  can spot stale content at a glance.
- **Comments outside our control.** Reviewers can
  delete the Rekon-owned comment manually; the
  next run will re-POST. Reviewers can also edit
  the body manually; the next run will PATCH and
  overwrite. The marker is the only identity
  contract; the body is fully owned by the
  publisher.

None of these noise / staleness risks is severe
enough to block the staged rollout. They are paged
for follow-up in the eventual API-writer slice.

## Options Considered

### Option A — Stop at dry-run; no actual PR comment posting

Keep PR comment body rendering as a local preview
only. Use GitHub Checks + job summaries + uploaded
Rekon artifacts as the beta review surface.

**Pros:**
- Lowest permission risk; no `issues: write` /
  `pull-requests: write` ever requested.
- Avoids comment noise + staleness + identity
  complexity.
- The Check Run path already covers the
  decision-point chip use case.

**Cons:**
- No persistent narrative surface in the PR
  conversation; reviewers may miss the job
  summary / artifacts.

**Verdict:** acceptable as a long-term stance if
operator demand never materialises. Not the
recommended next slice because we have already
invested in the dry-run renderer + the staged
rollout discipline.

### Option B — Add PR comment API writer after workflow / template / validator gate

Proceed to actual PR comment posting, but only after
the validator profile exists, the opt-in workflow
template exists, same-repo / trusted context is
enforced, and update-in-place behaviour is pinned.

**Pros:**
- Richer review surface.
- Durable PR-timeline context.
- Reviewers see proof state without clicking
  through to workflow runs.

**Cons:**
- Requires `issues: write` or `pull-requests:
  write`.
- Comment staleness / idempotency risk.
- Fork / secret safety is harder than Checks.

**Verdict:** the **eventual** target if the gate
work in Option C confirms the boundary is workable.
**Not** the recommended next slice — Option C does
the boundary work first; Option B happens after,
**if approved at that point**.

### Option C — Add workflow / validator profile first, still no API writer (recommended)

Prepare the permission / workflow boundary before
API implementation. Add a `github-pr-comment-send`
validator profile and an opt-in workflow template
variant under `docs/examples/workflows/`, but do
not post yet.

**Pros:**
- Lets operators review the exact permission model
  before any API call.
- Avoids the immediate API write risk.
- Mirrors the GitHub Check staged rollout that
  already worked end-to-end.
- Each slice remains independently reviewable.

**Cons:**
- Still no real PR comments after the next slice.
- One more intermediate slice before any actual
  posting.

**Verdict:** **Recommended.** The Check path's
six-slice discipline is the right model.

### Option D — Defer to hosted / GitHub App model

Do not use the Actions token for comments. Defer
comment posting to a GitHub App / hosted Rekon
integration.

**Pros:**
- Cleaner identity / permission model
  (per-installation scoping; app-level identity for
  the "is this our comment?" problem).
- Better product path long-term.

**Cons:**
- Larger surface (Rekon does not yet have a hosted
  surface).
- Not useful for the local-first beta posture.

**Verdict:** Rejected for alpha / beta. Reconsider
when Rekon has a hosted surface to host an App
behind.

## Recommendation

**Adopt Option C.** Ship the workflow / validator
profile in the next slice (step 7d). Defer the
actual API writer (step 7e) until after operators
have inspected the concrete permission boundary.

**Pinned for the next slice (step 7d):**

- New workflow validator profile:
  `github-pr-comment-send`. Permits `pull-requests:
  write` (and / or `issues: write`); rejects every
  other write scope (`checks: write` may or may
  not be co-permitted depending on whether the
  template layers comments on top of Check sends —
  defer that to the slice's own decision).
- New opt-in workflow template under
  `docs/examples/workflows/` (e.g.
  `rekon-verification-pr-comment-send.yml`).
  Triggers on `workflow_dispatch` + `push` to `main`
  only — same posture as
  `rekon-verification-check-send.yml`. Declares the
  Rekon opt-in env
  (`REKON_PR_COMMENTS: "1"` +
  `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`
  parallel to the GitHub Check pattern). Runs
  `rekon publish pr-comment --dry-run` as a
  preview step **only** in 7d; the `--send`
  invocation is the step-7e addition.
- Documentation: the template carries the same
  top-of-file validator-command comment the
  existing opt-in template does, instructing
  operators to run the validator with
  `--profile github-pr-comment-send` after
  copying.
- Docs test + validator contract tests pin the
  profile's rejection set and the template's
  permission boundary.

**Step 7d explicitly does NOT add:**

- `rekon publish pr-comment --send` (step 7e).
- Any GitHub API call.
- Any modification to the existing
  `rekon-verification-check-send.yml` template.
- Any modification to the existing
  `github-check-send` validator profile.

If, after step 7d, operators decide the
permission boundary is wrong or that PR comments
are not worth the cost after all, **Option A
becomes the default**: keep the dry-run renderer
as a local preview, ship no API writer.

## Canonical Artifact Boundary

PR comments — like GitHub Checks — are **downstream
review surfaces**. The canonical artifacts remain:

- `VerificationPlan`
- `VerificationRun`
- `VerificationResult`
- Proof-report / architecture-summary / agent-
  contract `Publication`s

Any future PR comment publisher will:

- **Cite** these refs by id in every comment body
  (the dry-run renderer already does this).
- **Carry** the canonical-truth phrase verbatim.
- **Never** mutate any Rekon artifact.
- **Never** imply a finding has been auto-resolved
  or that reconciliation has been auto-applied —
  the comment is informational, downstream, and
  per-commit.

If an operator deletes the PR comment manually, the
proof state in `.rekon/artifacts` is unaffected. The
comment is disposable; the artifacts are not.

**The idempotency marker is not proof.** It is only
an update-in-place handle. The canonical proof state
lives in the cited artifacts, not in the marker.

## What This Does Not Do

This batch **does not**:

- Implement a PR comment API writer.
- Add `pull-requests: write` or `issues: write` to
  any workflow template.
- Add a `rekon publish pr-comment --send` CLI mode.
- Add a `github-pr-comment-send` validator profile.
- Modify any existing workflow template.
- Modify the existing `publish github-check` CLI
  surface.
- Modify the existing `publish pr-comment
  --dry-run` CLI behaviour.
- Modify any artifact shape.
- Add a `@rekon/capability-pr-comment` package or
  any other new package.
- Spawn a process. Mutate any local artifact.
- Bump any version. Publish to npm.

The shipped artefacts are: this memo, a docs test,
a review packet, and supporting-doc
cross-references.

## Implementation Sequence

| Step | Slice | Status |
| --- | --- | --- |
| 7a | PR Comment Publisher Decision Memo | ✅ Shipped |
| 7b | Dry-run helper + CLI (`buildPrCommentBody`, `assessPrCommentPublisherReadiness`, `publish pr-comment --dry-run`) | ✅ Shipped |
| 7c | API Implementation Decision Gate (**this memo**) | ✅ Shipped |
| 7d | PR comment workflow / validator profile + opt-in template | ✅ Shipped |
| 7e | [PR Comment API Writer Go/No-Go Review](pr-comment-api-writer-go-no-go-review.md) | ✅ Shipped |
| 7f | PR comment API writer (`publish pr-comment --send`) | ✅ Shipped |
| 7g | [PR Comment Publisher Safety Review](pr-comment-publisher-safety-review.md) | ✅ Shipped |

The 7d slice (next, if approved) ships:

1. New workflow validator profile
   `github-pr-comment-send` (permits
   `pull-requests: write`; rejects every other
   write scope unless layered on top of the
   existing Check send profile — the slice's own
   decision).
2. New opt-in workflow template under
   `docs/examples/workflows/`.
3. Validator contract tests for the new profile.
4. Docs test pinning the template + permission
   boundary.

The 7e slice (later, only if approved) ships:

1. The actual `--send` mode behind the readiness
   gate. Update-in-place via the marker. Sanitized
   errors. Sentinel-token contract test. No raw
   log content.
2. A separate workflow / template that wires
   `--send` in.
3. Contract tests with mocked HTTP (fake server),
   same pattern as the GitHub Check send tests.

The 7f slice (later) is a safety review that
mirrors the
[GitHub Check publisher send workflow safety review](github-check-publisher-send-workflow-safety-review.md):
walks the full PR comment publishing path
(dry-run + validator profile + opt-in template +
API writer) and confirms beta-readiness or surfaces
remaining blockers.

## Follow-Up Work

In order of expected priority:

1. **PR comment workflow / validator profile (step
   7d).** Build the boundary first. Recommended
   next slice if Option C is approved.
2. **Operator-facing "what a Rekon PR comment is /
   isn't" page** if and when posting ships. The
   canonical-truth phrase + the marker-not-proof
   convention are correct but terse; an expanded
   explanation will help reviewers who first
   encounter the comment in their PR queue.
3. **Same-repo `pull_request` guard** (e.g. parse
   `GITHUB_EVENT_PATH` to read
   `github.event.pull_request.head.repo.fork`
   directly; allow operators to opt into same-repo
   PR comments via a workflow-level guard). Not
   blocking for 7d.
4. **Rate-limiting / retries on `--send`.** Defer
   until step 7e exists; design with the same
   bounded-retry posture as a future GitHub Check
   retry slice.

### Risk register

| Risk | Current Guardrail | Remaining Follow-Up |
| --- | --- | --- |
| comment spam | marker planned | implement update-in-place |
| stale comment | canonical reminder | update existing comment only |
| fork token misuse | readiness rejects forks | profile/template gate |
| comment treated as proof | canonical reminder | operator education |

No risk is severe enough to pause the PR comment
path at the dry-run tier. The risks above are
paged for follow-up; none invalidates the
recommendation to proceed with the workflow /
validator profile slice next.
