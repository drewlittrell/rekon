# Review Packet — Verification Runner GitHub Actions Workflow Hardening v2

**Step 4** of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Docs / examples / docs-test batch.** No
code changes. No active workflow in
`.github/workflows`. No GitHub API writes.
No write permissions added anywhere.

## CHANGES MADE

**New artifacts:**

- `docs/examples/workflows/rekon-verification-dry-run.yml`
  — copyable dry-run workflow template
  that runs `rekon verify run --dry-run`
  instead of `--execute`. Spawns zero
  plan commands. Intentionally omits
  `verify result from-run` (a dry-run is
  not proof).

**Updated artifacts:**

- `docs/examples/workflows/rekon-verification.yml`
  — header comments call out the EXECUTE
  variant relationship to the dry-run
  variant and expand the safety contract
  description; new
  `Resolve latest VerificationResult`,
  `Resolve latest architecture-summary
  Publication`, and `Resolve latest
  agent-contract Publication` steps; new
  `Rekon artifacts validate` step
  captures the JSON `valid` field for
  the job summary; job summary now
  includes a `Mode: execute` line, an
  `Artifacts valid: true|false` line, and
  rows for every refresh-loop
  publication ref.
- `docs/examples/github-actions-verification-runner.md`
  — new "Adoption — copy the dry-run
  template first" section near the top
  with a 6-step adoption path; expanded
  Troubleshooting section with 10 items
  (each carrying **Likely cause** /
  **Safe next step** / **Do not**
  triples); cross-references updated to
  list both workflow templates.

**Supporting docs updated (9):**

- `docs/strategy/verification-runner-ci-github-decision.md`
  — step 4 flipped to ✅ Shipped with
  the shipped contract recorded.
- `docs/concepts/verification-runs.md` —
  CI / GitHub Direction now mentions
  the dry-run variant.
- `docs/strategy/classic-behavior-roadmap.md`
  — pointer flipped + new shipped entry.
- `docs/strategy/roadmap.md` — new
  completed-slice entry.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 44 added (shipped); step 45
  added for the workflow-validation
  helper next slice; subsequent steps
  renumbered.
- `README.md` — pointer block updated
  to mention both templates with the
  adoption-order recommendation.
- `CHANGELOG.md` — new
  top-of-`0.1.0-alpha.1` entry.

**Tests:**

- `tests/docs/verification-runner-github-actions-hardening.test.mjs`
  — 23 docs-only assertions.

## PUBLIC API CHANGES

**None.** Docs / examples / docs-test
batch. No code, no artifact-shape change,
no new capability, no new CLI command, no
`schemaVersion` bump, no version bump, no
npm publish.

## PURPOSE PRESERVATION CHECK

1. **No GitHub API surface.** Neither
   workflow calls the GitHub API. Job
   summary uses
   `$GITHUB_STEP_SUMMARY` (filesystem
   only). Tests 14–17 pin this.
2. **No write permissions.** Both
   workflows declare only
   `permissions: contents: read`.
   Tests 2, 4, 7, 8 pin this.
3. **No `pull_request_target`.** Tests
   3 and 8 pin this on both workflows.
4. **No secrets declared.** Both
   workflows are safe for fork PRs by
   default.
5. **Dry-run is the safe default
   adoption path.** Test 15 pins the
   adoption-first language in the
   operator guide.
6. **Dry-run cannot become proof.**
   The dry-run workflow intentionally
   omits `verify result from-run`,
   and the troubleshooting section
   explicitly warns against
   `--allow-not-run` in CI.
7. **No raw log leakage.** Both
   workflows upload `.rekon/artifacts/**`
   with `*.log` excluded
   (tests 11, 12). The runner's
   redaction + truncation contract
   already keeps raw stdout / stderr
   out of artifact bodies.
8. **Failed / stale proof stays
   visible.** The job summary
   embeds the `proof-report.md`
   publication verbatim — that
   publication already calls out
   failure and stale-proof states.
9. **No auto-resolution.** Operator
   guide's troubleshooting section
   explicitly states that a passing
   workflow badge is not finding
   closure; the team norms section
   reinforces this.
10. **No active workflow installed in
    the Rekon repo.** Templates live
    only under `docs/examples/`.

## CODEBASE-INTEL ALIGNMENT

- The dry-run variant is the **safer
  adoption path** that mirrors the
  classic "preview before commit"
  workflow guarantee.
- Both workflows treat the uploaded
  `rekon-artifacts` directory as
  canonical proof; the job summary
  badge is explicitly a downstream
  surface.
- Troubleshooting items map directly
  to classic codebase-intel failure
  modes (missing plan, failed
  command, stale proof, fork-secret
  trust boundary) so adopters can
  apply intuition from prior tools.

## DRY-RUN WORKFLOW

```yaml
name: Rekon Verification (dry-run)

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  verify-dry-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - run: node packages/cli/dist/index.js refresh --root . --json
      - id: plan
        # rekon artifacts latest --type VerificationPlan --id-only --allow-missing
      - if: steps.plan.outputs.id != ''
        run: node packages/cli/dist/index.js verify run --root . --plan "$PLAN" --dry-run --json > .rekon/verify-run.json
      - id: run
        # rekon artifacts latest --type VerificationRun --id-only --allow-missing
      # Intentionally NO `verify result from-run` step.
      - run: node packages/cli/dist/index.js publish proof --root . --json
      - run: node packages/cli/dist/index.js publish architecture --root . --json
      - run: node packages/cli/dist/index.js publish agent-contract --root . --json
      - id: validate
        # rekon artifacts validate --json, capture valid into step output
      - id: proof
        # rekon artifacts latest --type Publication --kind proof-report --id-only --allow-missing
      - id: arch
        # rekon artifacts latest --type Publication --kind architecture-summary --id-only --allow-missing
      - id: contract
        # rekon artifacts latest --type Publication --kind agent-contract --id-only --allow-missing
      - run: |
          # Append summary block to $GITHUB_STEP_SUMMARY
          # Mode: dry-run
          # VerificationResult: not produced (dry-run is not proof)
      - uses: actions/upload-artifact@v4
        with:
          name: rekon-artifacts
          path: |
            .rekon/artifacts/**
            !.rekon/artifacts/**/*.log
          retention-days: 7
```

The dry-run variant is byte-by-byte the
same shape as the execute variant
except: (a) the verb is `--dry-run`,
(b) there is no
`verify result from-run` step, and
(c) the summary's `VerificationResult`
row says `not produced (dry-run is not
proof)`.

## EXECUTE WORKFLOW HARDENING

Beyond the existing structure, the
execute workflow now:

- Resolves the latest `VerificationResult`
  ref after `verify result from-run`
  writes it.
- Resolves the latest
  `Publication --kind
  architecture-summary` and
  `Publication --kind agent-contract`
  refs.
- Captures the JSON `valid` field from
  `rekon artifacts validate` into a
  step output (`steps.validate.outputs.valid`)
  so the job summary renders it
  explicitly.

The job summary then renders a single
table of every publication's status,
making the workflow's output
self-contained: a reviewer reading the
summary can see at a glance which proof
artifacts exist and which are missing.

## JOB SUMMARY

Both workflows write the same skeleton:

```markdown
# Rekon Verification Summary

- Mode: execute | dry-run
- VerificationPlan: <ref or missing>
- VerificationRun: <ref or missing>
- VerificationResult: <ref or missing>  # (dry-run: "not produced (dry-run is not proof)")
- Proof report: <ref or missing>
- Architecture summary: <ref or missing>
- Agent contract: <ref or missing>
- Artifacts valid: true | false | unknown
- Uploaded artifact: `rekon-artifacts`

_GitHub status is not canonical truth; Rekon artifacts remain canonical._

---

<full proof-report.md body>
```

The `Artifacts valid` line is captured
via a small Node-eval in the workflow
that parses `rekon artifacts validate
--json` output:

```bash
OUTPUT="$(node packages/cli/dist/index.js artifacts validate --root . --json || true)"
echo "$OUTPUT"
VALID="$(node -e "process.stdout.write(String(JSON.parse(process.argv[1]).valid))" "$OUTPUT")"
echo "valid=$VALID" >> "$GITHUB_OUTPUT"
```

This keeps the workflow's output
deterministic without adding a new CLI
command.

## TROUBLESHOOTING

The operator guide's expanded
Troubleshooting section now covers 10
items. Each carries a **Likely cause**,
**Safe next step**, and **Do not** so
operators see why the obvious shortcut
is unsafe:

1. **No VerificationPlan found.**
   Cause: no plan artifact. Next:
   `rekon intent work-order` /
   `rekon intent remediation`. Do not:
   hard-code a stale plan id.
2. **Verification command failed.**
   Cause: a plan command exited non-
   zero. Next: read `proof-report.md`
   in the upload. Do not: add
   `continue-on-error: true`.
3. **Dry-run produced VerificationRun
   but no VerificationResult.**
   Cause: intentional refusal. Next:
   switch to execute. Do not:
   `--allow-not-run` in CI.
4. **`verify result from-run` refuses
   the run.** Cause: per-plan
   timeout fired, or workflow picked
   up a stale dry-run. Next: raise
   `--timeout-ms`, inspect
   `rekon artifacts list`. Do not:
   `--allow-not-run`.
5. **Artifacts validate failed.**
   Cause: digest mismatch from an
   external rewrite. Next: re-run
   `rekon refresh`. Do not: hand-edit
   `.rekon/artifacts/` files.
6. **Artifacts upload missing.**
   Cause: working-directory change.
   Next: confirm `--root .`. Do not:
   widen the upload glob.
7. **Forked PR needs secrets.**
   Cause: workflow runs without
   secrets by design. Next: move
   secret-bearing actions to a
   separate workflow. Do not: switch
   to `pull_request_target`.
8. **Workflow summary says proof is
   stale.** Cause: newer plan
   exists. Next: re-run the
   workflow. Do not: rewrite the
   stale result's plan ref by hand.
9. **`verify run --execute` fails
   immediately on every command.**
   Cause: scrubbed-env policy
   filtered a required env var.
   Next: inspect
   `VerificationRun.commands[*].stderrExcerpt`,
   raise the allowlist change
   upstream. Do not: disable the
   scrub locally.
10. **Job summary doesn't render the
    proof report.** Cause: another
    step overwrote
    `$GITHUB_STEP_SUMMARY`. Next:
    use `>>` not `>`. Do not:
    replace the publication body
    with a custom summary that
    hides failed proof.
11. **A reviewer reads the green
    badge and treats it as
    completion.** Cause: team
    norms. Next: require reading
    the artifact / proof report.
    Do not: rebrand the badge as
    "Rekon verified" or wire it
    into a required-status-check
    that the team interprets as a
    green light to merge.

## TESTS / VERIFICATION

**Docs tests
(`tests/docs/verification-runner-github-actions-hardening.test.mjs`,
23 total):**

1. Dry-run workflow exists.
2. Dry-run `permissions: contents:
   read`.
3. Dry-run no `pull_request_target`.
4. Dry-run no GitHub write
   permissions.
5. Dry-run uses `verify run
   --dry-run`.
6. Dry-run does NOT use `--execute`.
7. Execute `permissions: contents:
   read`.
8. Execute no GitHub write
   permissions.
9. Execute uses `verify run
   --execute`.
10. Both use `artifacts latest`.
11. Both upload
    `.rekon/artifacts`.
12. Both exclude `.log` files.
13. Both `retention-days: 7`.
14. Both write to
    `$GITHUB_STEP_SUMMARY`.
15. Operator guide adopts
    dry-run first.
16. Operator guide says GitHub
    status is not canonical truth.
17. Operator guide says Rekon
    artifacts remain canonical.
18. Operator guide says forked PRs
    must not receive secret-bearing
    execution by default.
19. Troubleshooting covers no
    VerificationPlan.
20. Troubleshooting covers failed
    verification command.
21. Troubleshooting covers forked
    PR secrets.
22. CHANGELOG mentions hardening
    v2.
23. Review packet exists with
    PURPOSE PRESERVATION CHECK.

**Full suite results:** 1189 passed
/ 1 skipped / 0 failed (up from
1166/1/0).

**Build:** `tsc -b` clean (no code
change in this batch).

**Audits / smokes:**

- `audit-package-exports`.
- `audit-license`.
- `publish-dry-run`.
- `install-smoke` /
  `install-tarball-smoke`.

No CLI smoke required for a
docs / examples / docs-test batch.

## INTENTIONALLY UNTOUCHED

- Every artifact shape and producer.
- Runtime, SDK, every capability.
- All existing CLI commands.
- `refresh` / `publish` / `resolve`
  / `intent` / `reconcile` /
  `verify` / `artifacts`
  lifecycle steps.
- `FindingStatusLedger`,
  `FindingLifecycleReport`,
  `CoherencyDelta`,
  `ReconciliationPlan`.
- `.github/workflows/` (still no
  active workflow installed in the
  Rekon repo itself).
- The CI pipeline.

## RISKS / FOLLOW-UP

**Risks (low):**

- **Two templates to keep in sync.**
  The dry-run and execute variants
  share most of their structure;
  future workflow changes need to
  land in both. Mitigation: 23
  shared-contract tests catch drift
  on the safety contract;
  workflow-author convention should
  update both files together.
- **Operator-copied workflows
  drift.** Operators who copy the
  templates and then customize may
  silently widen the permission
  surface or remove the `.log`
  exclude. The next slice
  (workflow validation helper)
  addresses this by adding a
  read-only command / script that
  validates copied workflows
  against the contract.
- **Inline `node -e` for `valid`
  capture.** The execute workflow
  uses a small inline Node script
  to parse the JSON `valid` field
  from `artifacts validate`. A
  future CLI flag
  (`--id-only`-equivalent for
  validate) would let us drop
  this; documented as follow-up.

**Follow-up (next slice):**

- **Verification runner GitHub
  workflow validation helper.**
  Read-only command or script
  that validates copied workflow
  templates against the required
  safety contract:
  - no `pull_request_target`
  - no write permissions
    (`pull-requests`, `checks`,
    `contents`, `id-token`)
  - no raw log upload (path
    excludes `*.log`)
  - uses
    `rekon artifacts latest`
  - uploads `.rekon/artifacts`
  - declares
    `permissions: contents:
    read`
  - no `pull_request_target`
    trigger

  Still no GitHub API writes.

## NEXT STEP

Recommended next slice:
**verification runner GitHub
workflow validation helper**. Add
a read-only command (e.g.,
`rekon ci validate-workflow
<path>`) or script that walks
YAML workflow files in
`.github/workflows/` and reports
violations of the alpha safety
contract. Useful both for the
operator (`rekon ci validate-workflow
.github/workflows/rekon-verify.yml
--json`) and as a CI check (run
the validator inside the
verification workflow against
itself).

No GitHub API writes. No active
workflow installed. The validator
is purely a static analyzer over
YAML — same posture as
`artifacts validate`.
