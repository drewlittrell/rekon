# Review Packet — Verification Runner GitHub Actions Workflow Template

**Step 2** of the CI / GitHub adapter
implementation sequence pinned by
[`docs/strategy/verification-runner-ci-github-decision.md`](../../docs/strategy/verification-runner-ci-github-decision.md).
**Docs-only batch.** No code changes. No
active workflow installed in
`.github/workflows`. Ships a copyable
GitHub Actions workflow template + operator
documentation.

## CHANGES MADE

**New deliverables:**

- `docs/examples/workflows/rekon-verification.yml`
  — the copyable workflow YAML. Operators
  copy into their own repo's
  `.github/workflows/` to enable. The
  Rekon repository does **not** install
  it.
- `docs/examples/github-actions-verification-runner.md`
  — 10-section operator guide (what it
  does / does not do, permission model,
  fork / secret safety, artifact upload
  policy, job summary behavior,
  plan-lookup customization,
  execute-vs-dry-run swap, why GitHub
  status is not canonical truth,
  troubleshooting, cross-references).

**Supporting docs updated (9):**

- `docs/strategy/verification-runner-ci-github-decision.md`
  — step 2 flipped to ✅ Shipped with
  the actual file paths + workflow
  contract pinned.
- `docs/concepts/verification-runs.md` —
  CI / GitHub Direction subsection now
  references the shipped template +
  guide; cross-references updated.
- `docs/concepts/verification-results.md`
  — cross-references updated.
- `docs/concepts/proof-report-publication.md`
  — cross-references updated.
- `docs/artifacts/proof-report-publication.md`
  — cross-references updated.
- `docs/strategy/classic-behavior-roadmap.md`
  — pointer flipped + comprehensive new
  shipped entry.
- `docs/strategy/roadmap.md` — new
  completed-slice entry.
- `docs/strategy/issue-governance-architecture-decision.md`
  — step 42 flipped to ✅ Shipped; step
  43 added for the next slice
  (latest-artifact CLI helpers);
  subsequent steps renumbered.
- `README.md` — pointer block updated to
  reference the shipped template + guide.
- `CHANGELOG.md` — new
  top-of-`0.1.0-alpha.1` entry.

**Tests:**

- `tests/docs/verification-runner-github-actions-template.test.mjs`
  — 23 docs-only assertions.

## PUBLIC API CHANGES

**None.** Docs-only batch. No code, no
artifact-shape change, no new capability,
no new CLI command, no `schemaVersion`
bump, no version bump, no npm publish.

## PURPOSE PRESERVATION CHECK

Rekon's purpose is **artifact-backed
codebase intelligence with a deliberately
narrow execution surface**. The template
preserves every guarantee:

1. **Artifact-canonical proof.** The
   workflow uploads
   `.rekon/artifacts` as the canonical
   proof record. The job summary and the
   green / red badge are downstream
   surfaces; the artifacts win. The
   operator guide states this in
   multiple sections.
2. **No GitHub API surface.** The
   template uses no API write. No
   `octokit`, no `gh`, no REST/GraphQL
   call. Job summary uses
   `$GITHUB_STEP_SUMMARY` (filesystem
   only).
3. **No write permissions.**
   `permissions: contents: read` only.
   No `pull-requests: write`,
   `checks: write`, `contents: write`,
   or `id-token: write`.
4. **No `pull_request_target`.** The
   template triggers `pull_request` and
   `workflow_dispatch`. Fork PRs run in
   the fork's context with no upstream
   secrets.
5. **No secrets declared.** The template
   has no `secrets.*` reference and
   declares no setup actions that
   require secrets.
6. **No raw log leakage.** Upload path
   excludes `.rekon/artifacts/**/*.log`
   explicitly as defense in depth.
   Rekon's runner already enforces no
   raw stdout / stderr in artifact
   bodies (digests + redacted truncated
   excerpts only).
7. **No auto-resolution.** The operator
   guide explicitly states:
   `Passing verification does not
   automatically resolve findings.`
8. **No active workflow in the Rekon
   repo.** The template lives under
   `docs/examples/` so contributors do
   not accidentally run it against the
   Rekon repo itself before they
   understand the contract.

## CODEBASE-INTEL ALIGNMENT

- The template runs only **existing**
  Rekon CLI commands. No new CLI
  surface introduced in this batch.
- Classic codebase-intel workflow
  guarantees apply: planned work →
  execution → proof → review surface.
  The workflow is the **review
  surface**; the artifacts are still
  the canonical proof.
- Failed / stale / partial proof
  visibility carries through because
  the job summary uses the existing
  proof-report publication markdown
  (which already calls out source /
  freshness / failure with explicit
  callouts).

## WORKFLOW TEMPLATE

```yaml
name: Rekon Verification

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: node packages/cli/dist/index.js refresh --root . --json

      - name: Resolve latest VerificationPlan id
        id: plan
        run: |
          node - <<'NODE' >> "$GITHUB_OUTPUT"
          # ... reads .rekon/registry/artifacts.index.json
          NODE

      - name: Rekon verify run (execute)
        if: steps.plan.outputs.plan_id != ''
        run: node packages/cli/dist/index.js verify run \
            --root . --plan "$PLAN_ID" --execute --json \
            > .rekon/verify-run.json

      - name: Resolve latest VerificationRun id
        id: run
        if: steps.plan.outputs.plan_id != ''
        run: |
          node - <<'NODE' >> "$GITHUB_OUTPUT"
          # ... reads verify-run.json
          NODE

      - name: Rekon verify result from-run
        if: steps.run.outputs.run_id != ''
        run: node packages/cli/dist/index.js verify result from-run \
            --root . --run "$RUN_ID" --json

      - run: node packages/cli/dist/index.js publish proof --root . --json
      - run: node packages/cli/dist/index.js publish architecture --root . --json
      - run: node packages/cli/dist/index.js publish agent-contract --root . --json
      - run: node packages/cli/dist/index.js artifacts validate --root . --json

      - name: Append proof report to job summary
        if: always()
        run: |
          {
            echo "# Rekon Verification Summary"
            # ... appends proof-report.md
          } >> "$GITHUB_STEP_SUMMARY"

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: rekon-artifacts
          path: |
            .rekon/artifacts/**
            !.rekon/artifacts/**/*.log
          retention-days: 7
```

Plan / run id resolution uses inline Node
snippets (`node - <<'NODE'`). These are
template helpers. The next implementation
slice (latest-artifact CLI helpers) will
replace them with one-line CLI calls.

## SAFETY / PERMISSIONS

| Concern | Template behavior |
| --- | --- |
| Workflow permissions | `contents: read` only |
| `pull-requests: write` | Absent (forbidden in alpha) |
| `checks: write` | Absent (forbidden in alpha) |
| `contents: write` | Absent (forbidden) |
| `id-token: write` | Absent (forbidden) |
| Secrets in template | None declared |
| `pull_request_target` | Forbidden |
| GitHub API writes | None |
| Setup actions requiring secrets | None |
| Artifact upload path | `.rekon/artifacts/**` (no `.log`) |
| Artifact retention | 7 days default |
| Job summary surface | `$GITHUB_STEP_SUMMARY` (filesystem only) |
| Forked PR execution | Read-only contents, no upstream secrets |
| `continue-on-error` masking | Not used |

## ARTIFACT UPLOAD POLICY

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: rekon-artifacts
    path: |
      .rekon/artifacts/**
      !.rekon/artifacts/**/*.log
    retention-days: 7
```

**Included:**

- `evidence/*.json` (e.g.,
  `EvidenceGraph`, `ObservedRepo`,
  `OwnershipMap`, `CapabilityMap`).
- `findings/*.json` (e.g.,
  `FindingReport`,
  `FindingLifecycleReport`,
  `CoherencyDelta`).
- `actions/*.json` (e.g., `WorkOrder`,
  `VerificationPlan`,
  `VerificationRun`,
  `VerificationResult`,
  `ReconciliationPlan`).
- `publications/*.json` and
  `publications/*.md`
  (`proof-report.md`,
  `architecture-summary.md`,
  `agent-contract.md`).

**Excluded:**

- `.rekon/artifacts/**/*.log` (defense
  in depth; the runner already keeps
  raw stdout / stderr out of artifact
  bodies).
- Source diffs beyond the standard
  repository checkout (upload path is
  `.rekon/artifacts` only, not the
  repo contents).
- Secrets, tokens, environment dumps.

**Retention:** 7 days default. Operators
may raise to GitHub's max (90 days) but
the alpha recommendation is 7–14 days to
bound exposure.

## TESTS / VERIFICATION

**New docs test
(`tests/docs/verification-runner-github-actions-template.test.mjs`,
23 assertions):**

File existence:

1. `docs/examples/github-actions-verification-runner.md`
   exists.
2. `docs/examples/workflows/rekon-verification.yml`
   exists.

Workflow permission contract:

3. Workflow has `permissions:`.
4. Workflow has `contents: read`.
5. Workflow does not contain
   `pull_request_target`.
6. Workflow does not contain
   `pull-requests: write`.
7. Workflow does not contain
   `checks: write`.
8. Workflow does not contain
   `contents: write`.
9. Workflow does not contain
   `id-token`.

Workflow CLI steps:

10. Workflow runs `rekon refresh`.
11. Workflow runs `verify run`.
12. Workflow runs `verify result
    from-run`.
13. Workflow runs `publish proof`.
14. Workflow runs `artifacts validate`.

Workflow upload contract:

15. Workflow uploads `.rekon/artifacts`.
16. Workflow excludes `.log` files.
17. Workflow sets `retention-days: 7`.

Anchor statements in the operator guide:

18. Docs say GitHub status is not
    canonical truth.
19. Docs say Rekon artifacts remain
    canonical.
20. Docs say forked PRs must not
    receive secret-bearing execution
    by default.
21. Docs say passing verification does
    not automatically resolve findings.

Release surfaces:

22. CHANGELOG mentions the template.
23. Review packet exists and contains
    `PURPOSE PRESERVATION CHECK`.

**Full suite results:** 1145 passed / 1
skipped / 0 failed (up from 1122/1/0).

**Build:** `tsc -b` composite build
clean (no code change in this batch).

**Audits / smokes:**

- `audit-package-exports`.
- `audit-license`.
- `publish-dry-run`.
- `install-smoke` /
  `install-tarball-smoke`.

No CLI smoke required for a docs-only
batch.

## INTENTIONALLY UNTOUCHED

- Every artifact shape and producer.
- Runtime, SDK, every capability.
- All existing CLI commands.
- `refresh` / `publish` / `resolve` /
  `intent` / `reconcile` / `verify` /
  `artifacts` lifecycle steps.
- `FindingStatusLedger`,
  `FindingLifecycleReport`,
  `CoherencyDelta`,
  `ReconciliationPlan`.
- `.github/workflows/` (no active
  workflow installed in the Rekon
  repo itself).
- No new dependency on `@actions/*`,
  `@octokit/*`, or any GitHub-specific
  library.

## RISKS / FOLLOW-UP

**Risks (low to medium):**

- **Operators may customize unsafely.**
  Anyone copying the template can add
  `pull_request_target`, escalate
  permissions, or include secrets. The
  operator guide states the contract
  clearly and includes a
  troubleshooting section that
  redirects unsafe needs (e.g.,
  private package registries) to a
  separate, manually-approved
  workflow path. Beyond that, this is
  the operator's responsibility.
- **Inline Node snippets are
  template-only.** A future Rekon CLI
  helper (`rekon artifacts latest
  --type <type> --json`) will replace
  the snippets with one-line calls.
  Until that lands, operators who
  prefer not to embed Node may swap
  the lookup for an explicit
  `rekon intent work-order` step that
  generates a fresh plan inline.
- **Job summary size.** GitHub
  Actions caps
  `$GITHUB_STEP_SUMMARY` at ~1 MB.
  The proof report is small
  (typically < 50 KB) so this is not
  a current concern.
- **Forked-PR plan availability.** A
  fork's HEAD must include a
  `VerificationPlan` artifact (or
  generate one via
  `rekon intent work-order` inside
  the workflow). The template's
  `if: steps.plan.outputs.plan_id !=
  ''` guard skips execution
  gracefully when no plan exists, so
  missing plans don't error — they
  just skip.

**Follow-up (next slice):**

- **Verification runner latest-
  artifact CLI helpers**:
  `rekon artifacts latest --type
  VerificationPlan --json`,
  `--type VerificationRun --json`,
  `--type Publication --kind
  proof-report --json`. Read-only
  CLI helpers that replace the
  workflow template's inline Node
  snippets with one-line calls.

## NEXT STEP

Recommended next slice:
**verification runner latest-artifact
CLI helpers**.

That slice adds:

- `rekon artifacts latest --type
  <type> [--kind <kind>] [--root
  <path>] --json` — read-only CLI
  helper returning the latest entry
  from the artifact index for a
  given type. `--kind` filters
  Publications by their `kind`
  enum (`proof-report`,
  `architecture-summary`,
  `agent-contract`, etc.).
- An update to
  `docs/examples/workflows/rekon-verification.yml`
  swapping the inline Node snippets
  for one-line CLI calls.
- Tests pinning the new flag and
  output shape.

No execution change. No artifact-shape
change. No new capability. No GitHub
API writes. The CI / GitHub adapter
boundary stays exactly where it is.
