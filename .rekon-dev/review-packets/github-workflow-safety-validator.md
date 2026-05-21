# Review Packet — GitHub Workflow Safety Validator (P1.1 slice)

**Slice:** `github-workflow-safety-validator`
**Sequence position:** Step 5 of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Batch type:** CLI + docs + tests. No artifact-shape change. No
new capability package. No active workflow in `.github/workflows`.
No GitHub API writes.

## CHANGES MADE

1. **New CLI command surface in `packages/cli/src/index.ts`.**
   - `rekon verify github-workflow validate --path <workflow.yml>
     [--root <path>] [--json]` — pure static text validator. Reads
     the workflow file (text only) and runs regex-based checks
     against the alpha safety contract. Exits `0` on valid (warnings
     only); exits `1` on any error. `--json` emits
     `{ mode, valid, errors[], warnings[] }`. Human output renders
     `Mode: <execute|dry-run|unknown>`, `Errors`, `Warnings`, and a
     final `OK` / `INVALID` verdict.
   - Internal helper `validateGitHubWorkflowSafety(content)` returns
     `{ mode, valid, errors[], warnings[] }`. Co-located with the
     CLI command; not exported from any `@rekon/*` package.
   - Internal helper `stripGitHubWorkflowYamlComments(content)` —
     quote-aware comment stripper that tracks `'`, `"`, and
     `` ` `` modes so workflow templates that echo `#`-prefixed
     strings (e.g. `# Rekon Verification Summary`) into
     `$GITHUB_STEP_SUMMARY` validate cleanly.
   - Internal helper `renderGitHubWorkflowSafetyHuman(report)` for
     the human output path.
   - Types added: `GitHubWorkflowSafetyMode`,
     `GitHubWorkflowSafetyReport`, `GitHubWorkflowSafetyIssue`,
     `GitHubWorkflowSafetyIssueCode`.
   - Constants added: `GITHUB_WRITE_PERMISSION_SCOPES`,
     `escapeRegex`.
   - CLI usage line registered:
     `rekon verify github-workflow validate --path
     <workflow.yml> [--root <path>] [--json]`.

2. **Workflow template comment blocks** —
   [`docs/examples/workflows/rekon-verification.yml`](../../docs/examples/workflows/rekon-verification.yml)
   and
   [`docs/examples/workflows/rekon-verification-dry-run.yml`](../../docs/examples/workflows/rekon-verification-dry-run.yml)
   gained a top-of-file comment block instructing operators to run
   the validator after copying:

   ```yaml
   # After copying this workflow, validate the safety contract with:
   #   rekon verify github-workflow validate --path .github/workflows/<this-file>.yml
   # The validator is read-only (no GitHub API calls, no execution).
   ```

3. **Operator guide** —
   [`docs/examples/github-actions-verification-runner.md`](../../docs/examples/github-actions-verification-runner.md)
   gained a new "Validate a copied workflow" section before the
   Adoption section. The section explains:
   - The validator is **pure static text analysis** (no YAML
     parser dependency, no GitHub API calls, no spawn / exec, no
     filesystem writes).
   - What the validator checks (errors + warnings).
   - Exit-code semantics (0 = valid; 1 = any error).
   - What the validator does **not** check (semantic correctness;
     whether the workflow will pass in CI; whether secrets exist).

4. **Contract test suite** —
   `tests/contract/github-workflow-safety-validator.test.mjs`
   (25 tests). Covers:
   - Both bundled templates (`rekon-verification.yml`,
     `rekon-verification-dry-run.yml`) validate clean.
   - Mode detection (`execute`, `dry-run`, `unknown`).
   - Every error code (pull_request_target, write-permission
     scopes, missing `contents: read`, GitHub API calls, missing
     `artifacts latest`, missing `.rekon/artifacts/**` upload,
     missing `.log` exclusion, missing `$GITHUB_STEP_SUMMARY`,
     unknown mode).
   - Warning behaviour (canonical-truth reminder presence;
     `retention-days` declared).
   - Read-only invariant (file stat / mtime unchanged after a
     run).
   - CLI surface (exit codes for valid / invalid / missing path;
     `--json` shape; human output shape).

5. **Extended hardening docs test** —
   `tests/docs/verification-runner-github-actions-hardening.test.mjs`
   gained 3 new assertions:
   - Operator guide mentions
     `rekon verify github-workflow validate`.
   - Both workflow templates include the validate-command
     comment.
   - CHANGELOG mentions the workflow validation helper.

6. **Strategy memo update** —
   [`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md)
   gained a new step 5 (validation helper) marked ✅ Shipped.
   Subsequent steps renumbered (GitHub Check publisher 5→6, PR
   comment publisher 6→7, Cross-CI documentation 7→8). The
   "Future GitHub Check Publisher" anchor reference updated from
   "step 5" to "step 6".

7. **Cross-doc updates** — see CHANGELOG + roadmap + classic
   roadmap + issue governance for the full list of supporting
   docs.

## PUBLIC API CHANGES

- **New CLI command:**
  `rekon verify github-workflow validate --path <workflow.yml>
  [--root <path>] [--json]`.
- **No package-export change.** No new symbol exported from
  `@rekon/*` packages.
- **No new artifact type.** No new artifact `schemaVersion`.
- **No new capability package.**
- **No new role / permission.**
- **No CLI command removed or renamed.**
- **No flag removed or renamed** on existing commands.

## PURPOSE PRESERVATION CHECK

The slice is **additive** to the CI / GitHub adapter sequence. It
preserves every existing purpose:

- **Verification runner v1 purpose.** The validator does not
  execute verification commands; it only validates YAML text. The
  runner-v1 spawn / shell: false / timeouts / digests / redaction
  surface is **unchanged**.
- **VerificationPlan / VerificationRun / VerificationResult.**
  None of their shapes change. None of their producers change.
- **`rekon artifacts latest` purpose.** Unchanged — the validator
  asserts that workflows **use** the helper, but does not modify
  the helper.
- **Workflow templates' safety contract.** Unchanged — the
  templates already met the contract; the validator now pins it
  in tests.
- **CI / GitHub adapter decision memo.** The decision sequence is
  unchanged. The validation helper was always step 5 (formerly
  pending); it is now shipped.
- **GitHub Check publisher (beta) deferral.** Unchanged. Still
  deferred to step 6 (was step 5). Still requires `checks: write`
  and per-installation setup. Still sits behind a config flag in
  the eventual design. Still: Rekon artifacts remain canonical
  truth.
- **No write-permission expansion.** The validator does not
  require, request, or recommend any GitHub write permission. Both
  bundled templates still declare only `permissions: contents:
  read`.
- **Forked-PR safety.** Unchanged. The validator explicitly
  rejects `pull_request_target` (the trigger that would forward
  fork PR code with secrets in scope).
- **Local-first runner posture.** Unchanged. The validator is a
  local CLI command; it does not call GitHub, does not authenticate
  to GitHub, and does not require a GitHub token.

## CODEBASE-INTEL ALIGNMENT

- **Substrate:** the validator is a CLI surface, not a kernel
  package. It does not add to `@rekon/kernel-*`. It does not
  introduce a new artifact category.
- **Capability map:** unchanged. No new role. No new permission.
- **Conformance:** the validator is invoked by the user, never by
  the runtime, and never as part of `rekon refresh` /
  `rekon publish` / `rekon resolve` / `rekon intent` /
  `rekon reconcile` / `rekon artifacts`. It is opt-in.
- **Artifact lifecycle:** unaffected. The validator does not
  produce, consume, or mutate any artifact.

## VALIDATION MODEL

**Errors** (exit 1; `valid: false`):

| Code | Meaning |
| --- | --- |
| `pull-request-target` | `pull_request_target` appears in workflow triggers. |
| `github-write-permission` | Any of `pull-requests`, `checks`, `contents`, `id-token`, `actions`, `deployments`, `statuses`, `packages` set to `write`. |
| `missing-contents-read` | `permissions: contents: read` not declared. |
| `uses-github-api` | `gh api`, `curl api.github.com`, or `actions/github-script` reference detected. |
| `missing-artifacts-latest` | No `rekon artifacts latest` call detected. |
| `missing-rekon-artifact-upload` | No upload of `.rekon/artifacts/**` detected. |
| `missing-log-exclusion` | `.log` files not excluded from upload. |
| `missing-job-summary` | No `$GITHUB_STEP_SUMMARY` append detected. |
| `unknown-mode` | `verify run` invocation absent, or `--execute` and `--dry-run` both absent. |

**Warnings** (exit 0; `valid: true` but a warning is emitted):

| Code | Meaning |
| --- | --- |
| `missing-canonical-truth-reminder` | Summary block does not mention "GitHub status is not canonical truth". |
| `missing-retention-days` | Upload step does not declare `retention-days`. |

**Mode resolution:**
- `execute` — `verify run` invocation contains `--execute`.
- `dry-run` — `verify run` invocation contains `--dry-run`.
- `unknown` — neither flag detected; reported as `unknown-mode`
  error.

**Read-only invariant:** the helper reads the workflow file via
`fs.readFile` (text only). It never opens for write. The contract
test asserts `fs.stat(...).mtimeMs` is unchanged after a run.

## CLI SURFACE

```text
rekon verify github-workflow validate --path <workflow.yml>
                                     [--root <path>]
                                     [--json]
```

- `--path` (required): absolute or workspace-relative path to the
  workflow file.
- `--root` (optional): workspace root for relative `--path`
  resolution. Defaults to CWD.
- `--json` (optional): emit
  `{ valid, path, mode, issues[], summary }`; suppress human
  output. Each issue has `severity: "error" | "warning"`, a
  stable `code`, a `message`, and a `fix`.

**Exit codes:**
- `0` — valid (no errors). Warnings may be present.
- `1` — invalid (one or more errors) or missing `--path`.

**Human output (valid):**

```text
GitHub workflow safety: valid
Path: docs/examples/workflows/rekon-verification.yml
Mode: execute
Checks:
- permissions: contents: read ✓
- no pull_request_target ✓
- no GitHub write permissions ✓
- no GitHub API calls ✓
- uses rekon artifacts latest ✓
- uploads .rekon/artifacts ✓
- excludes .log files ✓
- writes GITHUB_STEP_SUMMARY ✓
```

**Human output (invalid)** prefixes with
`GitHub workflow safety: invalid` and renders each issue with a
`[error]` / `[warning]` severity tag, a stable code, a message,
and a `Fix:` line.

## TESTS / VERIFICATION

- New contract suite `github-workflow-safety-validator.test.mjs`:
  **25 tests passing**.
- Extended docs test
  `verification-runner-github-actions-hardening.test.mjs`: **+3
  assertions** (now 26 total assertions).
- Full suite: **1218 passed / 1 skipped**.
- CLI smoke (both bundled templates): both exit 0 with no errors
  and no warnings.

## INTENTIONALLY UNTOUCHED

- `packages/capability-verify/` — the validator is a CLI surface,
  not a capability. No package change.
- `@rekon/sdk` conformance — no new role / permission.
- `@rekon/runtime` artifact category map — no new artifact type.
- `@rekon/kernel-*` — no change.
- `rekon verify run` — unchanged.
- `rekon artifacts latest` — unchanged.
- `rekon refresh`, `rekon publish`, `rekon resolve`,
  `rekon intent`, `rekon reconcile`, `rekon artifacts` — none
  invoke the validator; the validator is opt-in.
- `VerificationRun`, `VerificationResult`, `VerificationPlan` —
  no shape change.
- `.github/workflows/*.yml` in the Rekon repo — none added; none
  modified.

## RISKS / FOLLOW-UP

- **Risk: false negatives in YAML interpretation.** The validator
  is regex-based, not YAML-AST based. A pathological YAML formatting
  (e.g. permissions block written on a single line with weird
  indentation, or using YAML anchors / aliases) could in principle
  evade a check. Mitigation: both bundled templates are
  canonical-form YAML; the regex patterns are designed to match
  GitHub Actions' recommended formatting. Future work could add a
  YAML-AST mode behind `--strict` if real-world templates surface
  edge cases.
- **Risk: validator drift.** If the safety contract evolves (new
  forbidden trigger, new write permission), the validator must
  be updated alongside the templates. Mitigation: the validator
  and templates ship from the same review packet; the docs test
  pins both sides.
- **Follow-up:** step 6 of the CI / GitHub adapter sequence is the
  beta-tier GitHub Check publisher. It will introduce the first
  GitHub-write surface in Rekon; the design will sit behind a
  config flag and preserve the "Rekon artifacts are canonical"
  invariant. The validation helper does not need to be re-shipped
  for that slice — it remains the gate operators run on copied
  workflows before adopting them.

## NEXT STEP

Step 6 of the CI / GitHub adapter implementation sequence: the
beta-tier verification runner GitHub Check publisher. Pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
