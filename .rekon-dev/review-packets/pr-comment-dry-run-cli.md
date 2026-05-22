# Review Packet — PR Comment Dry-Run CLI (P1.1 slice)

**Slice:** `pr-comment-dry-run-cli`
**Sequence position:** Step 7b of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
and the PR comment publisher decision in
[`docs/strategy/pr-comment-publisher-decision.md`](../../docs/strategy/pr-comment-publisher-decision.md).
**Batch type:** Helper + CLI + tests + docs. **No GitHub API
call.** No token reads. No network-client imports. No
workflow-template modification.

## CHANGES MADE

1. **New pure helpers in `@rekon/capability-docs`:**
   - `buildPrCommentBody(input)` — pure function that
     renders the Rekon-owned PR comment markdown body
     from artifact-like inputs. Always emits the
     idempotency marker `<!-- rekon:pr-comment:v1 -->`
     at the top, the canonical-truth reminder
     (`GitHub comments are not canonical truth; Rekon
     artifacts remain canonical.`), a citation table
     for every supplied artifact ref, optional warning
     blocks for failed / partial / not-run / missing /
     stale proof states, and a "Next steps" list. No
     I/O, no env reads, no network.
   - `assessPrCommentPublisherReadiness(input)` — pure
     function that returns `{ ready, issues[] }`
     after evaluating opt-in env
     (`REKON_PR_COMMENTS=1`), repository slug,
     PR-number gate (`GITHUB_PR_NUMBER` or
     `PR_NUMBER`), token presence, event-trust
     classification, and explicit write-permission
     confirmation. Same shape as the GitHub Check
     readiness helper.
2. **New exports + constants:**
   - `PR_COMMENT_PUBLISHER_MARKER` =
     `<!-- rekon:pr-comment:v1 -->`
   - `PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER` =
     "GitHub comments are not canonical truth; Rekon
     artifacts remain canonical."
   - `PrCommentBodyInput`, `PrCommentBodySummary`,
     `PrCommentBody`, `PrCommentFreshness`,
     `PrCommentPublisherReadinessIssueCode`,
     `PrCommentPublisherReadinessIssue`,
     `PrCommentPublisherReadiness`,
     `PrCommentEventTrust`,
     `PrCommentPublisherReadinessEvent`,
     `PrCommentPublisherReadinessInput`.
3. **New CLI command** in `packages/cli/src/index.ts`:
   `rekon publish pr-comment --dry-run [--root <path>]
   [--json]`. Registered alongside the existing
   `publish github-check` dispatch. `--dry-run` is
   **required**; `--send`, `--publish`, `--execute`
   are refused with exit 1. Reads local
   `VerificationResult` / `VerificationRun` /
   `VerificationPlan` / proof-report /
   architecture-summary / agent-contract publications.
   Runs `validateArtifactIndex(store)` (read-only).
   Calls `buildPrCommentBody` + `assessPrCommentPublisherReadiness`.
   Prints
   `{ kind: "rekon.pr-comment.dry-run", dryRun: true,
   wouldPublish: false, readiness, comment, citedRefs,
   canonicalTruthReminder }` as JSON, or a human
   summary with the comment preview when `--json` is
   absent. **Reads no `GITHUB_TOKEN`** (the readiness
   assessor receives an explicit empty env map).
   **Calls no GitHub API.** Imports no network client.
4. **Usage line registered:**
   `rekon publish pr-comment --dry-run [--root <path>] [--json]`.
5. **New contract suite**
   `tests/contract/pr-comment-dry-run-cli.test.mjs`
   (18 tests).
6. **New docs suite**
   `tests/docs/pr-comment-dry-run-cli.test.mjs`
   (9 assertions).
7. **Docs updates** — operator guide gains an
   "Optional: preview a PR comment (dry-run only)"
   section; PR comment publisher decision memo step 2
   flipped to ✅ Shipped; CI / GitHub adapter decision
   memo step 7b flipped to ✅; GitHub Check publisher
   decision memo + safety-review docs link to the
   shipped helper; concept / artifact docs +
   classic-behavior roadmap + roadmap +
   issue-governance memo updated; CHANGELOG + README
   entries.

## PUBLIC API CHANGES

- **New `@rekon/capability-docs` exports:**
  `PR_COMMENT_PUBLISHER_MARKER`,
  `PR_COMMENT_PUBLISHER_CANONICAL_TRUTH_REMINDER`,
  `buildPrCommentBody`,
  `assessPrCommentPublisherReadiness`,
  + the 10 type aliases listed above.
- **New CLI command:** `rekon publish pr-comment
  --dry-run [--root <path>] [--json]`.
- **No new artifact type.**
- **No new capability package.**
- **No new role / permission.**
- **No workflow template change.**
- **No validator profile change.**
- **No GitHub write surface added.**

## PURPOSE PRESERVATION CHECK

The slice mirrors the GitHub Check step-6a / 6b shape
exactly: pure helpers + dry-run CLI, no API write. It
preserves every existing invariant:

- **Verification runner v1 purpose.** Unchanged.
- **VerificationPlan / VerificationRun /
  VerificationResult.** Unchanged. The CLI cites refs
  only.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **Workflow templates (read-only execute + dry-run +
  opt-in checks-write).** Unchanged.
- **GitHub Check payload / readiness / publish helpers.**
  Unchanged.
- **Workflow validator + profiles.** Unchanged.
- **Canonical-truth invariant.** Reinforced. The
  helper refuses to render a body without the
  reminder; contract test asserts the phrase appears
  in every body.
- **Fork-safety invariant.** Reinforced. The
  readiness helper rejects `pull_request_target`
  unconditionally and forked `pull_request` events
  by default. The CLI itself does not (yet) parse
  events; the dry-run path passes a
  `workflow_dispatch` event + empty env so all
  gate-fail issues surface as missing.
- **No-auto-resolution invariant.** Unchanged. The
  PR comment body's "Next steps" suggests rerunning
  verification or inspecting artifacts; it never
  marks findings as resolved.
- **No-token-leak invariant.** Reinforced. The
  dry-run CLI reads no token; behavioural test
  passes a sentinel `GITHUB_TOKEN` and asserts it
  never appears in stdout / stderr.
- **No-raw-logs invariant.** Reinforced. The PR
  comment body cites refs / digests only; a
  contract test passes a sentinel through
  `evidenceNotes` / `notes` / `recordedBy` and
  asserts none of them appear in the rendered body.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The
  dry-run renderer is the first step in giving
  reviewers a persistent comment surface, but it
  ships **without** any GitHub-write side effect —
  the comment can be inspected locally and pinned
  by tests before any API call is considered.
- **Classic anti-pattern avoided:** the body always
  carries the canonical-truth reminder; the marker
  is documented as not-proof; warnings make failed
  / stale proof visible inline.
- **Capability map:** unchanged. The helpers live
  in `@rekon/capability-docs` (publisher-style
  output).
- **Conformance:** unchanged. No new role /
  permission / artifact type.

## COMMENT BODY MODEL

Every rendered body includes:

1. `<!-- rekon:pr-comment:v1 -->` marker
   (line 1; not proof).
2. `## Rekon Verification Summary` heading.
3. A markdown table with `Field` / `Value`
   columns:
   - VerificationResult ref
   - Status (`passed` / `failed` / `partial` /
     `not-run` / `missing`)
   - Source (`runner-derived` / `manual` /
     `unknown`)
   - Freshness (`fresh` / `stale` /
     `missing-plan` / `unknown`)
   - VerificationPlan ref
   - VerificationRun ref
   - Proof report Publication ref
   - Architecture summary Publication ref
   - Agent contract Publication ref
   - Artifacts valid (`true` / `false` / `not
     asserted`)
4. The canonical-truth reminder as a blockquote.
5. An optional `### Warnings` block when any of:
   failed proof, partial proof, not-run proof,
   missing proof, stale proof, missing-plan
   freshness, or `artifactsValid: false`.
6. A `### Next steps` block tailored to the
   detected proof state (rerun verification,
   inspect artifacts, refresh, etc.).

The body **never** includes:

- Raw stdout / stderr.
- Full artifact bodies.
- Secrets, tokens, env values.
- Arbitrary fields like `evidenceNotes`, `notes`,
  `recordedBy` from the result body (contract test
  pins this).

## READINESS MODEL

`assessPrCommentPublisherReadiness({ env, event,
writePermissionConfirmed })` returns
`{ ready: false, issues[] }` unless **all** of:

- `REKON_PR_COMMENTS` is `"1"` or `"true"`.
- `GITHUB_REPOSITORY` is present and non-empty.
- A PR number is present (`GITHUB_PR_NUMBER` or
  `PR_NUMBER`).
- `GITHUB_TOKEN` is present and non-empty.
- Event is trusted (`workflow_dispatch`, `push`, or
  same-repo `pull_request`).
  - `pull_request_target` is `unconditional-deny`.
  - Forked `pull_request` is `untrusted-fork` and
    denied by default.
- Caller passes `writePermissionConfirmed: true`.

The **dry-run CLI does not consume the readiness's
`ready` outcome to gate body rendering** — the body
always renders. The readiness report exists so
operators can see exactly which gates would still
remain even if the API-write slice landed.

## DRY-RUN CLI SURFACE

```text
rekon publish pr-comment --dry-run [--root <path>] [--json]
```

- `--dry-run` (required).
- `--send`, `--publish`, `--execute` — refused with
  exit 1.
- `--root <path>` (optional): workspace root.
- `--json` (optional): print the dry-run output as
  JSON.

**Exit codes:**
- `0` — body + readiness rendered. Readiness may be
  `ready: false`; that does **not** fail the CLI.
- `1` — `--dry-run` missing, or a forbidden flag was
  passed, or a malformed local artifact body could
  not be read.

**JSON shape:**

```json
{
  "kind": "rekon.pr-comment.dry-run",
  "dryRun": true,
  "wouldPublish": false,
  "readiness": { "ready": false, "issues": [/* ... */] },
  "comment": {
    "marker": "<!-- rekon:pr-comment:v1 -->",
    "markdown": "...",
    "summary": {
      "verificationStatus": "...",
      "proofFreshness": "...",
      "artifactsValid": true,
      "hasWarnings": true
    }
  },
  "citedRefs": {
    "verificationResult": "VerificationResult:...",
    "verificationRun": "VerificationRun:...",
    "verificationPlan": "VerificationPlan:...",
    "proofReport": "Publication:...",
    "architectureSummary": "Publication:...",
    "agentContract": "Publication:..."
  },
  "canonicalTruthReminder": "GitHub comments are not canonical truth; Rekon artifacts remain canonical."
}
```

## TESTS / VERIFICATION

- **Contract suite:**
  `tests/contract/pr-comment-dry-run-cli.test.mjs` —
  18 tests, all passing. Covers:
  - Helper: marker presence, canonical-truth
    presence, ref citations, artifacts-validate
    surface (`true` / `false` / `not asserted`),
    stale-proof warning, no stdout/stderr leak,
    no token-looking inputs leak.
  - Readiness: `not-enabled`,
    `pull_request_target` denied,
    forked `pull_request` denied.
  - CLI: JSON shape, source-scan (no network
    client / no fetch / no publishGitHubCheckRun
    call in the pr-comment branch), no
    `GITHUB_TOKEN` leak with sentinel env,
    `--dry-run` required, `--send` / `--publish` /
    `--execute` refused, artifact index unchanged
    before / after, `artifacts validate` clean,
    usage line registered.
- **Docs suite:**
  `tests/docs/pr-comment-dry-run-cli.test.mjs` — 9
  assertions, all passing. Pins memo + operator
  guide language, CHANGELOG mention, review-packet
  PURPOSE PRESERVATION CHECK.
- **Full suite:** expected ≥ 1392 passed / 1
  skipped (1365 prior + 27 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass.

## INTENTIONALLY UNTOUCHED

- `packages/capability-verify/` — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- All three workflow templates
  (`rekon-verification.yml`,
  `rekon-verification-dry-run.yml`,
  `rekon-verification-check-send.yml`) — unchanged.
- The workflow validator's `--profile` flag and
  every existing profile rule — unchanged.
- `rekon publish github-check --dry-run|--send` CLI
  surface — unchanged.
- `publishGitHubCheckRun` helper — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: comment body drifts from real review
  needs.** Mitigated by the dry-run CLI: operators
  can run it locally on a fixture, inspect the
  output, and feed back before any API-write slice
  lands.
- **Risk: stale comments mislead reviewers.**
  Not relevant in dry-run mode (no comment is
  posted). The future API-write slice must address
  this via update-in-place identification (the
  marker is the identity handle).
- **Risk: readiness lookups expand beyond the
  intended env keys.** Mitigated by the closed-form
  env list (`REKON_PR_COMMENTS`,
  `GITHUB_REPOSITORY`, `GITHUB_PR_NUMBER`,
  `PR_NUMBER`, `GITHUB_TOKEN`). Future env
  additions are explicit.
- **Follow-up — PR comment publisher API
  implementation decision gate (next slice).**
  Review the dry-run body / readiness model and
  decide whether actual PR comment posting is worth
  adding. If approved, the future writer must be
  opt-in; same-repo / trusted-context only;
  update-in-place via the marker; require
  `issues: write` or `pull-requests: write`
  confirmation; never treat the comment as
  canonical truth.

## NEXT STEP

**PR Comment Publisher API Implementation Decision
Gate.** Review the dry-run body + readiness model
(this slice's shipped artefacts) and decide whether
actual PR comment posting is worth adding. If
approved, the next implementation slice ships:

1. A new workflow validator profile (e.g.
   `github-pr-comment-send`) that permits
   `pull-requests: write` (and / or `issues: write`)
   alongside `checks: write` when the comment
   publisher is layered on top of the existing
   opt-in template.
2. An opt-in workflow template variant for the PR
   comment surface.
3. The actual `--send` mode behind the readiness
   gate. Update-in-place. Sanitized errors.
   Sentinel-token contract test. No raw log
   content.

Do not implement the API write until the decision
gate is pinned.
