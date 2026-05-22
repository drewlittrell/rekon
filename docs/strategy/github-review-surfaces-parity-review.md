# GitHub Review Surfaces Parity Review

## Decision Summary

**The Rekon GitHub review surface is beta-complete
as an opt-in surface.** Read-only templates remain
the recommended alpha default. GitHub Checks remain
the primary status surface. PR comments remain the
narrative companion surface. Uploaded Rekon
artifacts remain canonical truth. **No additional
GitHub API surface is needed before beta.**

The CI / GitHub adapter implementation sequence
pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](verification-runner-ci-github-decision.md)
has reached the point where the next step is not
"add another GitHub surface." It is "harden the
trust-boundary edge cases that the shipped surfaces
expose." The next slice should be the **Verification
/ GitHub Trust-Boundary Hardening** batch, not
another review-surface batch.

**Pinned reminders carried forward:**

- **GitHub status and comments are not canonical
  truth; Rekon artifacts remain canonical.** Every
  Check Run summary, every PR comment body, every
  job summary, and every operator-facing doc
  repeats this. The workflow validator emits a
  warning when the phrase is missing from a copied
  workflow.
- **A successful GitHub Check or PR comment
  publish does not imply findings are resolved or
  reconciliation has been applied.** The Check /
  comment is a downstream rendering of the
  existing artifacts; resolving a finding still
  requires the operator's deliberate action.
- **Forked PRs and `pull_request_target` remain
  blocked by default** — at three layers (workflow
  trigger list, validator profiles' rejection
  rules, send-CLI readiness assessors).
- **Read-only workflows remain the recommended
  starting point for adoption.** They declare only
  `permissions: contents: read`, make no GitHub
  API calls, and ship the canonical proof loop +
  artifact upload + job-summary surface without
  any write-side risk.

## Why This Review Exists

Steps 1–7 landed the full GitHub review surface:

1. **Verification runner v1** (step 1).
2. **Verification runner CI / GitHub adapter
   decision** (step 2).
3. **GitHub Actions read-only workflow templates +
   operator guide** (steps 3a–3d).
4. **GitHub workflow safety validator** (step 4).
5. **GitHub Check publisher decision + skeleton**
   (step 5).
6. **GitHub Check publisher** (steps 6a–6e): dry-run
   CLI, send CLI, opt-in workflow template, safety
   review.
7. **PR comment publisher** (steps 7a–7g): decision
   memo, dry-run helper + CLI, API decision gate,
   workflow / validator profile, writer go/no-go
   review, API writer, safety review.

Each per-surface decision was deliberately small:
the GitHub Check safety review (step 6e) ratified
the Check publisher in isolation; the PR comment
safety review (step 7g) did the same for the
comment publisher. Neither asked "are these two
surfaces, plus the read-only adoption path, plus
the workflow validator, plus the canonical artifact
upload, together enough for beta?"

This review answers that question.

**Beta-complete vs. beta-ready:**

- The per-surface safety reviews answered
  **beta-ready**: each surface, individually, is
  safe to recommend for opt-in adoption.
- This review answers **beta-complete**: the
  combined GitHub review surface — Check Run +
  PR comment + job summary + uploaded artifacts +
  read-only adoption path + workflow validator —
  is sufficient for the review-time goals of
  codebase-intel. No additional GitHub API surface
  is needed before beta.

Skipping this review would mean shipping
beta-readiness one surface at a time without ever
checking that the combination is coherent. The next
slice's framing depends on the answer: if the
combination is complete, the next slice hardens the
edges; if it isn't, the next slice fills the gap.
This memo lands the framing.

## Surfaces Reviewed

The full GitHub review surface, end-to-end:

1. **Read-only dry-run workflow template** at
   [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml).
2. **Read-only execute workflow template** at
   [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml).
3. **Opt-in GitHub Check send workflow template**
   at
   [`docs/examples/workflows/rekon-verification-check-send.yml`](../examples/workflows/rekon-verification-check-send.yml).
4. **Opt-in PR comment workflow template** at
   [`docs/examples/workflows/rekon-pr-comment-send.yml`](../examples/workflows/rekon-pr-comment-send.yml).
5. **Workflow validator profiles** via
   `rekon verify github-workflow validate --profile`:
   - `read-only`
   - `github-check-send`
   - `github-pr-comment-send`
6. **GitHub Check dry-run CLI**:
   `rekon publish github-check --dry-run`.
7. **GitHub Check send CLI**:
   `rekon publish github-check --send`.
8. **PR comment dry-run CLI**:
   `rekon publish pr-comment --dry-run`.
9. **PR comment send CLI**:
   `rekon publish pr-comment --send`.
10. **Proof report publication**
    (`@rekon/capability-docs.proof-report`).
11. **Architecture summary publication**
    (`@rekon/capability-docs.architecture-summary`).
12. **Agent contract publication**
    (`@rekon/capability-docs.agent-contract`).
13. **Uploaded `.rekon/artifacts`** via
    `actions/upload-artifact@v4` (every template
    uploads `.rekon/artifacts/**` excluding
    `.log`).
14. **Job summary markdown** via
    `$GITHUB_STEP_SUMMARY` (every template appends
    a refs-and-status block).
15. **`rekon artifacts latest` helper** workflow
    support for resolving artifact ids.
16. **Canonical artifact boundary**: the proof
    state lives in `.rekon/artifacts`; the GitHub
    surfaces are downstream renderings.
17. **Fork / token / write-permission safety**:
    three-layer defence at workflow template,
    validator profile, and runtime readiness
    assessor.
18. **Operator ergonomics gaps**: copy + validate
    workflow, opt-in env model, mutual exclusion
    of write surfaces (Check vs. comment), and the
    progressive adoption ladder
    (dry-run → execute → checks-write → PR comment).

## Workflow Template Review

**Surface table:**

| Surface | Role | Status | Notes |
| --- | --- | --- | --- |
| read-only dry-run workflow | adoption/safety trial | alpha default | no command execution |
| read-only execute workflow | local proof in CI | alpha default | no GitHub writes |
| GitHub Check workflow | status surface | beta opt-in | `checks: write` |
| PR comment workflow | narrative surface | beta opt-in | `pull-requests: write` |
| GitHub Check publisher | status publisher | beta-ready | downstream surface |
| PR comment publisher | narrative publisher | beta-ready | update-in-place |
| uploaded artifacts | canonical record | canonical | `.rekon/artifacts` |
| job summary | CI summary | downstream | not canonical |

**Per-template safety contracts pinned by the
workflow validator:**

- **Read-only templates:**
  - `permissions: contents: read` only.
  - No GitHub API calls.
  - No `pull_request_target`.
  - Upload `.rekon/artifacts/**` excluding `.log`.
  - Append job summary with refs + canonical-truth
    reminder.
  - Use `rekon artifacts latest` for id lookups
    (no inline JSON parsing).
- **GitHub Check template:**
  - Adds `permissions: checks: write`. Rejects
    every other write scope under the
    `github-check-send` profile.
  - Triggers: `workflow_dispatch` + `push: main`
    only. No `pull_request`. No
    `pull_request_target`.
  - Workflow-level env: `REKON_GITHUB_CHECKS: "1"`
    + `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1"`.
  - Runs the full execute proof loop +
    `publish github-check --dry-run` (preview) +
    `publish github-check --send
    --confirm-checks-write` (write).
- **PR comment template:**
  - Adds `permissions: pull-requests: write`.
    Rejects every other write scope under the
    `github-pr-comment-send` profile.
  - Triggers: `workflow_dispatch` only with a
    required `pr-number` string input. No
    `pull_request`. No `pull_request_target`.
  - Workflow-level env: `REKON_PR_COMMENTS: "1"` +
    `REKON_PR_COMMENTS_WRITE_CONFIRMED: "1"`.
  - Runs the full execute proof loop +
    `publish pr-comment --dry-run` (preview) +
    `publish pr-comment --send
    --confirm-pr-comment-write --pr-number ...`
    (write).
  - Job summary carries the canonical-truth
    reminder AND the marker-not-proof reminder.

**Verdict: beta-complete.** The progressive
adoption ladder — dry-run → execute → checks-write
→ PR-comment — gives operators four distinct
trust tiers. The validator profiles refuse cross-
contamination (a check-send workflow cannot
silently gain `pull-requests: write`; a PR comment
workflow cannot silently gain `checks: write`).

## Validator Profile Review

`rekon verify github-workflow validate --profile
<profile>`:

- **`read-only`** — refuses every write scope.
  Validates the two read-only templates clean.
- **`github-check-send`** — permits `checks: write`
  only. Requires `REKON_GITHUB_CHECKS=1` +
  `REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1` +
  `publish github-check --dry-run` step +
  `publish github-check --send` step +
  `--confirm-checks-write` flag. Refuses every
  other write scope, the `pull_request` trigger,
  and `pull_request_target`. Validates the
  check-send template clean.
- **`github-pr-comment-send`** — permits
  `pull-requests: write` only. Requires
  `REKON_PR_COMMENTS=1` +
  `REKON_PR_COMMENTS_WRITE_CONFIRMED=1` +
  `publish pr-comment --dry-run` step +
  `publish pr-comment --send` step +
  `--confirm-pr-comment-write` flag. Refuses
  every other write scope (including `checks: write`),
  the `pull_request` trigger, and
  `pull_request_target`. Validates the PR comment
  template clean.

**Cross-profile rejections** (pinned by 57 contract
tests):

- Check-send workflow under `read-only` profile →
  rejects `checks: write`.
- PR comment workflow under `read-only` profile →
  rejects `pull-requests: write`.
- Check-send workflow under `github-pr-comment-send`
  profile → rejects `checks: write` + requires
  `pull-requests: write`.
- PR comment workflow under `github-check-send`
  profile → rejects `pull-requests: write` +
  requires `checks: write`.

The validator catches every cross-profile drift
deterministically.

**Verdict: beta-complete.** Profiles are
sufficient to prevent unsafe workflow drift. No
profile gap remains.

## GitHub Check Surface Review

**Components:**

- `buildGitHubCheckPayload` (pure renderer; pinned
  by skeleton suite).
- `assessGitHubCheckPublisherReadiness` (pure
  readiness; pinned by skeleton suite).
- `publishGitHubCheckRun` (API writer; built-in
  `fetch`; bounded body reads; sanitized errors;
  pinned by 19-test send suite).
- `rekon publish github-check --dry-run` (no-token
  / no-network; pinned by dry-run suite).
- `rekon publish github-check --send` (readiness-
  gated; sanitized errors; pinned by 19-test send
  suite + sentinel-token contract test).
- `rekon-verification-check-send.yml` template +
  `github-check-send` validator profile.

**Conclusion-state mapping:** Rekon proof statuses
(`passed`, `failed`, `partial`, `not-run`) map to
GitHub Check conclusions with the
"failed > killed > timed_out > partial > passed >
not-run" priority preserved.

**Token / error safety:** token never echoed;
sanitized errors carry only
`{ status, message, documentationUrl }`; bounded
≤ 64 KiB response reads; sentinel-token contract
test pins no-token-leak.

**Fork safety:** three-layer defence.

**Canonical-artifact boundary:** Check Run cites
artifact refs; the artifact index is unchanged
before / after a `--send` run.

**Verdict: beta-complete.** Step 6e's safety review
ratified this surface. No refinement required for
beta.

## PR Comment Surface Review

**Components:**

- `buildPrCommentBody` (pure renderer; marker +
  canonical-truth phrase + refs).
- `assessPrCommentPublisherReadiness` (pure
  readiness).
- `publishPrCommentRun` (API writer; list →
  marker filter → PATCH-on-match / POST-on-miss;
  bounded 20-page pagination; bounded body reads;
  sanitized errors; pinned by 19-test send suite).
- `rekon publish pr-comment --dry-run` (no-token /
  no-network; pinned by dry-run suite).
- `rekon publish pr-comment --send` (readiness-
  gated; sanitized errors; pinned by 19-test send
  suite + sentinel-token contract test).
- `rekon-pr-comment-send.yml` template +
  `github-pr-comment-send` validator profile.

**Idempotency:** marker
(`<!-- rekon:pr-comment:v1 -->`) +
update-in-place; PATCH-first; POST when no match;
never delete reviewer-touched comments; throw when
20-page cap exhausted without finding a marker.

**Token / error safety:** identical posture to the
GitHub Check publisher (sanitized errors; bounded
body reads; sentinel-token contract test).

**Fork safety:** three-layer defence.

**Canonical-artifact boundary:** PR comment cites
artifact refs; the artifact index is unchanged
before / after a `--send` run; the marker is an
idempotency handle, **not proof**.

**Verdict: beta-complete.** Step 7g's safety review
ratified this surface. The remaining noise risks
(duplicate comments on cap-exhaust; reviewer
deletes; stale comments) are operationally
managed, not Rekon code gaps.

## Publication And Artifact Review

**Proof report publication**
(`@rekon/capability-docs.proof-report`):

- Renders the canonical proof surface (verification
  status, freshness, refs, command results,
  source, redacted excerpts).
- Cited by every Check Run summary, every PR
  comment body, and the operator's local proof
  surface.
- Beta-ready since step 5 ("verification proof
  surfaces v2").

**Architecture summary publication**
(`@rekon/capability-docs.architecture-summary`):

- Renders the system-level summary with input
  freshness, governance state, governed issue
  groups, coherency, remediation queue.
- Cited by the PR comment body's "Architecture
  summary" row and by the Check Run's narrative
  summary when shipped.

**Agent contract publication**
(`@rekon/capability-docs.agent-contract`):

- Renders the agent-facing operating contract
  (active governance state, governance freshness,
  do-not-do list, refresh hints).
- Cited by the PR comment body's "Agent contract"
  row.

**Uploaded `.rekon/artifacts`:**

- Every workflow template uploads
  `.rekon/artifacts/**` excluding `.log` via
  `actions/upload-artifact@v4` with
  `retention-days: 7`.
- This is the **canonical record** of the proof
  state for that workflow run. Reviewers can
  download it and inspect `VerificationPlan` /
  `VerificationRun` / `VerificationResult` /
  proof-report / architecture-summary /
  agent-contract artifacts by id.

**Job summary markdown:**

- Every workflow template appends a refs +
  status block to `$GITHUB_STEP_SUMMARY`. The
  job summary is a **downstream surface**, not
  canonical proof.

**Verdict: beta-complete.** The publications +
the uploaded artifact + the job summary together
give reviewers enough context to navigate from any
Check Run or PR comment back to the canonical
artifact state without reading any prose
elsewhere.

## Fork Token And Permission Review

**Three-layer fork-safety defence** preserved
across both write surfaces:

| Layer | GitHub Check | PR Comment |
| --- | --- | --- |
| Workflow trigger list | `workflow_dispatch` + `push: main` | `workflow_dispatch` only (with `pr-number` input) |
| Validator profile rejection | `pull-request-trigger-disallowed` + `pull-request-target` | same codes, applied under `github-pr-comment-send` |
| Runtime readiness rejection | `assessGitHubCheckPublisherReadiness` classifies forked PR as `untrusted-fork`, `pull_request_target` as `unconditional-deny` | `assessPrCommentPublisherReadiness` same classification |

**GitHub Actions itself** denies write tokens to
forked-PR workflows by default. The validator's
`pull-request-trigger-disallowed` rule prevents
the trigger from sneaking in via copy-paste even
when the upstream `pull_request` event would carry
a fork.

**Token permissions:**

| Surface | Permission | Validator profile |
| --- | --- | --- |
| read-only | `contents: read` only | `read-only` |
| GitHub Check | `contents: read` + `checks: write` | `github-check-send` |
| PR comment | `contents: read` + `pull-requests: write` | `github-pr-comment-send` |

The write surfaces are **mutually exclusive at the
template level**: a check-send template does not
declare `pull-requests: write`, and a PR comment
template does not declare `checks: write`.

**Token handling:**

- The token is read only in the `--send` branch
  of each CLI; never in dry-run.
- The token never appears in stdout / stderr or
  error messages (sentinel-token contract test
  pins this for both publishers).
- Sanitized errors carry only
  `{ status, message, documentationUrl }`.
- Bounded response-body reads (≤ 64 KiB) cap
  GitHub API output even when an upstream proxy
  misbehaves.

**Verdict: beta-complete.** No fork / token /
permission gap remains.

## Canonical Artifact Boundary

Both GitHub write surfaces — Check Run and PR
comment — are **downstream review surfaces**. The
canonical artifacts remain:

- `VerificationPlan`
- `VerificationRun`
- `VerificationResult`
- Proof-report / architecture-summary /
  agent-contract `Publication`s

Both publishers:

- **Cite** these refs by id in every body (the
  dry-run renderer and the send path use the same
  payload / body builder).
- **Carry** the canonical-truth phrase verbatim.
- **Never** mutate any Rekon artifact (the
  artifact index is byte-identical before and
  after a `--send` run; pinned by contract test).
- **Never** imply a finding has been auto-
  resolved or that reconciliation has been
  auto-applied.

If an operator deletes the Check Run output or the
PR comment manually, the proof state in
`.rekon/artifacts` is unaffected. The downstream
surfaces are disposable; the artifacts are not.

**The idempotency marker on PR comments is not
proof.** It is only an update-in-place handle.

**GitHub status and comments are not canonical
truth; Rekon artifacts remain canonical.**

## Beta Completeness Decision

**Beta decision table:**

| Criterion | Result |
| --- | --- |
| Canonical artifacts preserved | pass |
| Check status surface exists | pass |
| Narrative PR surface exists | pass |
| Read-only adoption path exists | pass |
| Workflow safety validation exists | pass |
| Fork/default-deny posture preserved | pass |
| Automatic resolution avoided | pass |

Every criterion passes. The combined surface
satisfies the review-time goals of codebase-intel:

- **Reviewers see status** at the commit (Check
  Run).
- **Reviewers see narrative** in the PR
  conversation timeline (PR comment).
- **Reviewers see refs** by id citing the
  canonical artifacts.
- **Reviewers can navigate** to the canonical
  artifact upload from any surface.
- **Reviewers cannot be misled** because every
  surface repeats "GitHub status / comments are
  not canonical truth; Rekon artifacts remain
  canonical."
- **Operators can adopt incrementally** along the
  dry-run → execute → checks-write → PR-comment
  ladder.
- **Operators cannot silently drift** because the
  validator refuses cross-profile contamination.
- **Forked PRs and `pull_request_target` cannot
  publish** without explicit operator override
  (which doesn't exist).

**The GitHub review surface is beta-complete as
an opt-in surface.** No additional GitHub API
surface is needed before beta.

## Remaining Risks

Paged but not blocking:

| Risk | Current Guardrail | Remaining Follow-Up |
| --- | --- | --- |
| GitHub status treated as truth | canonical reminders | operator education |
| comment noise | update-in-place marker | monitor marker drift |
| fork token misuse | workflow/validator/runtime gates | real-world validation |
| stale proof | proof freshness surfaces | proof-staleness refinements |
| raw log leakage | redacted VerificationRun excerpts + `.log` exclusion | retention review |

None is severe enough to pause adoption. Each has
a current guardrail; the remaining follow-up is
operational discipline plus normal hardening
slices.

**Specific trust-boundary edge cases** worth a
focused hardening pass before adding new surfaces:

- **VerificationResult → VerificationRun proof-
  chain coherence in Check payloads.** The Check
  payload builder picks the latest result and
  latest run independently; an interleaving
  failure mode (`result` from run N, `run` from
  run N+1) is possible if both are written
  concurrently. The current pattern is safe in
  the bundled templates (one run per workflow),
  but the helper should pin the coherence
  guarantee explicitly.
- **Bounded stdout/stderr streaming memory.** The
  verification runner truncates after-the-fact;
  for very long-running commands, streaming
  truncation would cap peak memory more tightly.
- **Process-tree timeout semantics.** Killing a
  process group rather than just the root child
  prevents orphaned subprocesses on timeout.
- **`NODE_OPTIONS` removal from runner env.** A
  malicious `NODE_OPTIONS=--require ...` could
  inject code into the runner; scrubbing it
  defence-in-depth.
- **PR head-SHA policy.** The Check publisher
  resolves `headSha` from `GITHUB_SHA`; for some
  trigger combinations
  (`workflow_run.workflow_run.head_sha`),
  operators may need explicit guidance.

These are not blockers; they are the natural next
slice ("Verification / GitHub Trust-Boundary
Hardening").

## Follow-Up Work

In order of expected priority:

1. **Verification / GitHub Trust-Boundary
   Hardening (next slice).** Return to
   foundational hardening:
   - Coherent VerificationResult →
     VerificationRun proof-chain selection for
     GitHub Check payloads.
   - Bounded stdout/stderr streaming memory.
   - Process-tree timeout semantics.
   - `NODE_OPTIONS` removal from runner env.
   - Bounded GitHub API error-body reads (already
     in place at 64 KiB; re-confirm and pin).
   - PR head-SHA policy + operator guidance.
2. **Cross-CI documentation.** Document the same
   workflow pattern for GitLab CI, Jenkins,
   CircleCI, etc. The CLI surface is identical;
   only the YAML envelope differs. Out of scope
   for this review.
3. **Operator-facing "what a Rekon Check / PR
   comment is / isn't" page.** The canonical-
   truth phrase + the marker-not-proof convention
   are correct but terse; an expanded explanation
   will help reviewers who first encounter a
   Check / PR comment in their PR queue.
4. **Same-repo `pull_request` guard.** Allow
   operators to opt into same-repo PR comments
   via a workflow-level guard. Currently the
   validator rejects the `pull_request` trigger
   entirely.
5. **Bounded retry / rate-limit backoff on both
   send paths.** Currently a rate-limit response
   is exit 1 with the sanitized message; a
   bounded retry slice would reduce operator
   toil.
6. **Real-world workflow validation.** Run the
   bundled templates against non-Rekon repos to
   confirm the operator experience is as
   documented before recommending broad adoption.
7. **Hosted publisher exploration.** Reconsider
   when Rekon has a hosted surface; currently
   rejected (Option D from both publishers' API
   decision gates).
8. **PR comments default-on consideration.** If
   adoption signal suggests PR comments add
   review-time value worth their broader scope,
   reconsider moving them toward default beta
   instead of opt-in. Not before beta; reconsider
   for the next major version.

**The GitHub review surface is beta-complete. The
next slice is the Verification / GitHub
Trust-Boundary Hardening batch.**

**Update — step 9 shipped.** The hardening batch
landed every fix paged above (coherent proof-chain
selection, bounded streaming capture, POSIX
process-tree timeout, NODE_OPTIONS removal, bounded
GitHub API error reads, PR head SHA safety). See
[`verification-github-trust-boundary-hardening.md`](../../.rekon-dev/review-packets/verification-github-trust-boundary-hardening.md)
(review packet) for the full bug register + tests.

**Update — step 10 shipped.** The
[Verification / GitHub Trust-Boundary Safety Review](verification-github-trust-boundary-safety-review.md)
walked every hardening fix in isolation and declared
the trust boundary **beta-stable**. No additional
GitHub review surfaces should be added before beta;
remaining work is operational polish + documented
platform caveats. The next slice is the beta
readiness / remaining classic-parity review.
