# Review Packet — GitHub Check Publisher Opt-In Workflow Template (P1.1 slice)

**Slice:** `github-check-publisher-opt-in-workflow-template`
**Sequence position:** Step 6d of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
and the
[GitHub Check publisher decision memo](../../docs/strategy/verification-runner-github-check-publisher-decision.md).
**Batch type:** Workflow template + validator profile + tests +
docs. No active workflow added to the Rekon repo. No change to
the GitHub Check send/dry-run helpers or CLI behaviour.

## CHANGES MADE

1. **New copyable workflow template** at
   [`docs/examples/workflows/rekon-verification-check-send.yml`](../../docs/examples/workflows/rekon-verification-check-send.yml).
   - Triggers: `workflow_dispatch` + `push` to `main` only. No
     `pull_request` trigger by default; no
     `pull_request_target` ever.
   - Permissions: `contents: read` + `checks: write` only. No
     other GitHub write scopes.
   - Env (workflow-level): `REKON_GITHUB_CHECKS: "1"`,
     `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1"`. The send
     readiness gate requires both.
   - Steps: checkout, setup-node, npm ci + build, `rekon
     refresh`, `artifacts latest` lookups for plan / run,
     `verify run --execute`, `verify result from-run`,
     `publish proof` + `architecture` + `agent-contract`,
     `artifacts validate`, three more `artifacts latest`
     lookups (proof / architecture / agent-contract
     publications), `publish github-check --dry-run` preview,
     `publish github-check --send --confirm-checks-write`,
     job summary append, `actions/upload-artifact@v4` of
     `.rekon/artifacts/**` excluding `.log` with
     `retention-days: 7`.
   - Job summary includes a `Mode: check-send` line, refs
     for VerificationPlan / VerificationRun /
     VerificationResult / proof / architecture / contract
     publications, `Artifacts valid`, the GitHub Check send
     outcome, and the canonical-truth reminder.
   - Top-of-file comment block instructs operators to run the
     validator with `--profile github-check-send` after
     copying.

2. **Validator profile support** added to
   `rekon verify github-workflow validate`:
   - New flag: `--profile read-only | github-check-send`.
     Defaults to `read-only` for backward compatibility.
   - The helper signature gains an optional `profile:
     GitHubWorkflowSafetyProfile` input.
   - New `mode` value `check-send` describing the workflow's
     terminal action when the send command is present.
   - New issue codes:
     `missing-checks-write`,
     `missing-rekon-github-checks-opt-in`,
     `missing-write-confirmation`,
     `missing-publish-github-check-dry-run`,
     `missing-publish-github-check-send`,
     `missing-confirm-checks-write-flag`,
     `pull-request-trigger-disallowed`.
   - `summary` adds: `profile`, `hasChecksWrite`,
     `hasPullRequestTrigger`, `hasRekonGitHubChecksOptIn`,
     `hasWriteConfirmation`,
     `hasPublishGitHubCheckDryRun`,
     `hasPublishGitHubCheckSend`,
     `hasConfirmChecksWriteFlag`.
   - `read-only` profile preserves existing behaviour:
     `checks: write` (or any other write scope) is rejected.
   - `github-check-send` profile permits `checks: write`,
     requires the Rekon opt-in env, the `--dry-run` and
     `--send` publish commands, the `--confirm-checks-write`
     flag, and refuses the `pull_request` trigger (because
     forked PRs would inherit the workflow's `checks: write`
     + opt-in env).

3. **Validator contract tests extended** —
   `tests/contract/github-workflow-safety-validator.test.mjs`
   gains 16 new tests covering read-only / send profile
   happy paths, the send-template required gates (env,
   write-confirm, --dry-run command, --send command,
   --confirm-checks-write flag), and rejected triggers /
   scopes (`pull_request_target`, `pull_request`,
   `pull-requests: write`, `contents: write`). Three new
   CLI tests cover `--profile` happy path, default, and
   invalid-value rejection.

4. **New docs suite** at
   `tests/docs/github-check-publisher-opt-in-workflow-template.test.mjs`
   — 21 assertions pinning template location, permissions,
   env, steps, artifact upload, job summary,
   canonical-truth reminder, operator-guide language,
   CHANGELOG mention, review packet `PURPOSE PRESERVATION
   CHECK`.

5. **Operator guide update:**
   [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
   gains a new "Optional: publish a GitHub Check" section
   that points at the opt-in template, emphasises beta-tier
   posture, lists the required env / flag / permission,
   and reiterates the canonical-truth boundary. The earlier
   commented opt-in block (added in step 6c) is updated to
   reference the new template by name.

6. **Cross-doc updates:** the CI / GitHub adapter decision
   memo + the GitHub Check publisher decision memo + the
   roadmap + classic-behavior + issue-governance memos flip
   the workflow-template slice to ✅ Shipped. CHANGELOG
   entry. README points at the new template.

## PUBLIC API CHANGES

- **New CLI flag:** `rekon verify github-workflow validate
  --profile read-only | github-check-send`. Defaults to
  `read-only`.
- **Validator helper signature:**
  `validateGitHubWorkflowSafety` now accepts an optional
  `profile` input and returns a `profile` field + extended
  `summary` shape.
- **New issue codes** on `GitHubWorkflowSafetyIssueCode`
  (additive; no existing code removed).
- **New mode:** `check-send` on
  `GitHubWorkflowSafetyMode` (additive).
- **No artifact-shape change.**
- **No new capability package.**
- **No new role / permission.**
- **No `@rekon/capability-docs` exports added or removed.**

## PURPOSE PRESERVATION CHECK

The slice is the **first checks-write workflow template**
in Rekon. It preserves every existing invariant:

- **Verification runner v1 purpose.** Unchanged. The
  template runs the same execute proof loop as the
  read-only execute template.
- **VerificationPlan / VerificationRun /
  VerificationResult.** Unchanged. The template cites refs
  in the GitHub Check payload; no artifact mutation.
- **Proof-report / architecture-summary / agent-contract
  Publications.** Unchanged.
- **Read-only workflow templates' safety contract.**
  Strictly unchanged. The read-only profile preserves the
  existing assertions; the bundled read-only templates
  continue to validate without modification.
- **Canonical-truth invariant.** Preserved. The new
  template carries the canonical-truth reminder in its job
  summary; the validator still warns when missing.
- **Fork-safety invariant.** Strengthened. The send
  template forbids the `pull_request` trigger by default
  via the `pull-request-trigger-disallowed` error; the
  validator refuses to mark the send template valid if
  someone adds the trigger.
- **No-auto-resolution invariant.** Unchanged.
- **No-token-leak invariant.** Unchanged. The template
  relies on the existing `publish github-check --send`
  command, which never echoes the token.
- **No active workflow in the Rekon repo.** Preserved. The
  template lives under `docs/examples/workflows/`; the
  docs test confirms no active variant under
  `.github/workflows/`.

## CODEBASE-INTEL ALIGNMENT

- **Classic guarantee preserved:** reviewers see
  artifact-backed proof at the decision point. The opt-in
  template gives reviewers a GitHub Check badge while
  keeping the read-only templates available for operators
  who don't want any GitHub-write surface.
- **Classic anti-pattern avoided:** the template does not
  treat GitHub status as canonical; the validator does
  not let the send template skip the canonical-truth
  reminder (still a warning).
- **Capability map:** unchanged.
- **Conformance:** unchanged. No new artifact type, role,
  or permission.

## OPT-IN WORKFLOW TEMPLATE

- **Path:**
  `docs/examples/workflows/rekon-verification-check-send.yml`.
- **Triggers:** `workflow_dispatch`, `push` to `main`.
  Explicitly no `pull_request` (forks would inherit the
  workflow's `checks: write` + Rekon opt-in env, which the
  validator rejects). No `pull_request_target`.
- **Permissions:** `contents: read`, `checks: write`. No
  other scopes.
- **Env (workflow-level):** `REKON_GITHUB_CHECKS: "1"`,
  `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1"`. Both are
  required by the send readiness gate.
- **Steps:** identical to the read-only execute template
  through `artifacts validate` and the three publication
  lookups; then runs `publish github-check --dry-run`
  (preview) and `publish github-check --send
  --confirm-checks-write` (actual API write); ends with
  the job-summary append and the artifact upload.
- **Job summary:** `Mode: check-send`, refs for plan /
  run / result / proof / architecture / contract, `Artifacts
  valid`, GitHub Check send outcome, canonical-truth
  reminder.
- **Artifact upload:** `.rekon/artifacts/**` excluding
  `.log`, `retention-days: 7`.

## VALIDATOR PROFILE

- **Flag:** `--profile read-only | github-check-send`.
  Default: `read-only`.
- **read-only profile:** unchanged behaviour — every
  write scope (including `checks: write`) rejected; the
  bundled read-only templates still validate clean.
- **github-check-send profile:**
  - **Permits:** `checks: write`.
  - **Requires:** `permissions: contents: read`,
    `permissions: checks: write`,
    `REKON_GITHUB_CHECKS: "1"` (or `true`),
    `REKON_GITHUB_CHECKS_WRITE_CONFIRMED: "1"`,
    `publish github-check --dry-run` step,
    `publish github-check --send` step, the
    `--confirm-checks-write` flag.
  - **Rejects:** `pull_request_target` (unconditional);
    `pull_request` trigger; every other write scope
    (`pull-requests: write`, `contents: write`,
    `id-token: write`, `actions: write`, `deployments:
    write`, `statuses: write`, `packages: write`).
  - **Warnings:** missing canonical-truth reminder,
    missing `retention-days` (same as the read-only
    profile).
- **Human output** now includes a `Profile:` line and,
  in the `github-check-send` profile, additional check
  rows for `checks: write`, the Rekon opt-in env, the
  write-confirmation env, the dry-run / send steps, the
  `--confirm-checks-write` flag, and the no-`pull_request`
  guard.

## SAFETY / PERMISSIONS

- The opt-in template is the **first** Rekon workflow
  template that requests `checks: write`. The validator
  ensures every other GitHub write scope stays rejected.
- The template ships with the Rekon opt-in env baked in,
  but operators can disable the publish by unsetting
  either env var without breaking the rest of the proof
  loop.
- The send step uses `--confirm-checks-write` as a
  belt-and-braces guard alongside the env var: the
  send CLI requires explicit checks-write confirmation
  before any API call.
- Forked PRs are denied at three layers: (1) the workflow
  has no `pull_request` trigger; (2) the validator refuses
  to mark a send-profile template valid if someone adds
  the trigger; (3) the send CLI's readiness assessor
  denies forked PRs by default and denies
  `pull_request_target` unconditionally.

## TESTS / VERIFICATION

- **Validator contract suite:**
  `tests/contract/github-workflow-safety-validator.test.mjs`
  gains 16 new helper tests + 3 new CLI tests (now 42
  total). Covers the read-only profile / opt-in profile
  happy paths, every new issue code, and the validator's
  `--profile` flag.
- **Docs suite:**
  `tests/docs/github-check-publisher-opt-in-workflow-template.test.mjs`
  — 21 assertions, all passing.
- **No change to existing test suites.**
- **Full suite:** expected ≥ 1330 passed / 1 skipped.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged. The
  payload / readiness / publishGitHubCheckRun helpers
  remain as shipped in steps 6a–6c.
- `rekon publish github-check` CLI (`--dry-run`,
  `--send`) — unchanged.
- Read-only templates
  (`docs/examples/workflows/rekon-verification.yml`,
  `docs/examples/workflows/rekon-verification-dry-run.yml`)
  — unchanged.
- `@rekon/sdk` conformance — unchanged.
- `@rekon/runtime` artifact category map — unchanged.
- `@rekon/kernel-*` — unchanged.
- `.github/workflows/*.yml` in the Rekon repo — none
  added, none modified.

## RISKS / FOLLOW-UP

- **Risk: operators copy without running the validator.**
  Mitigated by the top-of-file comment that explicitly
  calls out the validator command with the
  `--profile github-check-send` argument. The docs test
  pins the comment's presence.
- **Risk: same-repo PR support.** The send-profile
  validator refuses the `pull_request` trigger entirely
  in v1, even for same-repo PRs. A future slice could
  add a same-repo guard (via
  `REKON_GITHUB_CHECKS_PR_IS_FORK=0` or a workflow-level
  `if` expression) so reviewers see the Check on PRs
  too.
- **Risk: classic enterprise integrations.** The
  template assumes GitHub's hosted API
  (`api.github.com`). GHES adopters can override via the
  `--api-base-url` flag (already shipped in step 6c).
- **Follow-up — GitHub Check publisher send workflow
  safety review (next slice).** A strategy review over
  the completed Check path (payload helper, dry-run CLI,
  send CLI, workflow templates, validator profiles) to
  confirm beta readiness or surface remaining blockers
  before considering PR comments / Check refinements.
- **Follow-up — step 7 (PR comment publisher, beta+).**
  Same shape as the GitHub Check publisher but writes
  inline PR comments; requires `pull-requests: write`.
  Will reuse the readiness gate and need its own
  validator profile (e.g.
  `github-pr-comment-send`).

## NEXT STEP

Next slice per the work order:
**GitHub Check publisher send workflow safety review** — a
strategy review over the full Check path to confirm beta
readiness or identify remaining blockers. Reviews the
payload helper, the dry-run CLI, the send CLI, both
workflow templates (read-only execute + opt-in
check-send), and the validator profiles. Confirms the
canonical-artifact boundary, fork-safety contract, and
no-token-leak invariants are preserved across all
surfaces.
