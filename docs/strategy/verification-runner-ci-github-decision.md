# Verification Runner CI / GitHub Adapter Decision

## Decision Summary

**Option D — staged local-first + GitHub Actions
workflow template.** For alpha, Rekon's
verification runner remains **local-first**.
Operators run `rekon verify run --execute`,
`rekon verify result from-run`, and the proof
publications on their own machines or in any
CI runner they choose. Rekon ships **one**
first-party CI artifact in alpha: a
**documented GitHub Actions workflow
template** that drives the local CLI and
uploads `.rekon/artifacts` as a workflow
artifact. The template requests
`permissions: contents: read`, requires no
secrets, and uses GitHub's built-in
**job summary** (not the Checks API or PR
comments) for human-readable proof output.

A first-party **GitHub Check / PR comment
publisher** (Option C) is **deferred to beta**.
The proof-surface boundary stays
artifact-canonical: Rekon's local
`VerificationRun`, `VerificationResult`, and
`Publication` artifacts remain the canonical
proof records; any future check / PR / dashboard
output is a downstream projection of those
artifacts, never an independent source of truth.

This memo pins the direction and the alpha
contract. No CI / GitHub code lands in this
batch.

## Problem

Rekon now has a complete local proof loop:

- `rekon intent work-order` / `rekon intent
  remediation` write a `VerificationPlan`.
- `rekon verify run --dry-run` previews the plan
  without spawning processes.
- `rekon verify run --execute` runs the plan
  locally with `spawn` + `shell: false`,
  scrubbed env, per-command + per-plan
  timeouts, bounded redacted log excerpts, and
  sha256 stream digests; writes a
  `VerificationRun`.
- `rekon verify result from-run` derives a
  concise `VerificationResult` proof summary
  (refuses dry-run runs; never copies raw
  excerpts; never auto-resolves findings).
- `rekon publish proof` / `publish architecture`
  / `publish agent-contract` surface
  `manual` vs `runner-derived` proof,
  freshness against the latest plan, and
  failure / stale callouts.

But proof remains local unless operators
manually copy artifacts. Team workflows happen
in CI, on pull requests, and inside the GitHub
review surface where reviewers actually
approve and merge work. Without a CI surface:

- Reviewers cannot see whether `rekon verify
  run` was executed against the PR's
  changeset.
- Failed / stale / partial proof is invisible
  at the review point.
- Operators must build their own CI glue,
  and may do it inconsistently.

CI integration is **powerful but risky**:

- **Secrets and forks.** CI runners often have
  access to deployment tokens, GitHub PATs,
  and other secrets. PRs from forks must not
  be allowed to silently run code with those
  secrets attached.
- **Logs and exfiltration.** GitHub Actions
  logs are public on public repos and
  retained for ~90 days by default. Even with
  Rekon's existing redaction, accidentally
  including raw command output in a job's
  stdout could leak secrets.
- **Permissions creep.** A workflow that
  requests `pull-requests: write`,
  `checks: write`, or `contents: write` to
  publish status checks gains the ability to
  modify PRs and code. Each additional scope
  expands the blast radius.
- **Status as truth.** GitHub Checks are easy
  to read but easy to misread: a green check
  next to "Rekon verify" can be interpreted
  as "the changes are safe to merge" when in
  fact the check might be stale, partial, or
  measuring something different than the
  reviewer assumed.
- **Forked-PR rerun.** A naive workflow that
  re-runs verification on every PR push from
  a fork can be abused to consume budget,
  execute arbitrary code (via plan commands
  the contributor controls), or learn about
  the project's secrets through timing /
  error messages.

This memo decides where Rekon should land on
the spectrum between **"local-only,
operators-build-their-own"** and
**"first-class GitHub Check publisher"** for
alpha, and pins the safety contract any
future CI surface must respect.

## Current Rekon Proof Loop

Today, proof is canonical when it lives in a
Rekon artifact:

- `VerificationRun` carries the raw bounded
  execution detail (argv, exit codes,
  digests, redacted truncated excerpts,
  runner identity, environment summary,
  redaction audit, timestamps, per-command +
  overall status). Status enum:
  `passed | failed | timeout | killed |
  partial | not-run`. Status priority:
  `failed > killed > timeout > partial >
  passed > not-run`.
- `VerificationResult` carries the concise
  proof summary (per-command status + exit +
  digests + duration + notes, overall
  status, summary counts, recorded-by,
  evidence notes, plan + work-order + run
  citations). Status enum:
  `passed | failed | partial | not-run`.
  `timeout` and `killed` from the run map
  to `failed` in the result; the run keeps
  them first-class.
- Publications (`proof-report`,
  `architecture-summary`, `agent-contract`)
  classify each `VerificationResult` as
  `manual` / `runner-derived` / `unknown`
  via the shared
  `summarizeVerificationProofSurface`
  helper, compute freshness against the
  latest `VerificationPlan`, and emit
  prominent failure / stale callouts.
- `resolve.issue` attaches a
  `VerificationEvidenceSummary` carrying
  `source`, `freshness`,
  `verificationRunRef`, and a
  human-readable trace message.
- Passing proof **never** auto-resolves
  findings. Stale or failed proof is always
  visible. Raw stdout / stderr is **never**
  copied into publications.

This is the loop a CI surface would mirror.
Any CI adapter must preserve every
guarantee:

- Artifact-canonical proof.
- `runner-derived` vs `manual` distinction.
- Freshness visibility.
- No raw log leakage.
- No auto-resolution / no auto-apply.
- Local safety contract
  (`shell: false`, scrubbed env, bounded
  redacted logs, per-command + per-plan
  timeouts, stream digests, no retries)
  applies in CI exactly as it applies
  locally.

## Options Considered

### Option A — Local-only for alpha

Rekon ships nothing CI-specific. Operators
can run any of the existing CLI commands
inside their own CI of choice (GitHub
Actions, Jenkins, GitLab CI, CircleCI). Rekon
documents the CLI; the rest is the
operator's responsibility.

**Pros:**

- Safest. Rekon makes no claims about CI
  behavior and takes no responsibility for
  fork / secret behavior.
- Keeps alpha focused on local artifact
  correctness, which is still settling
  (proof surfaces v2 just landed).
- Zero new surface area to maintain.

**Cons:**

- Weaker team workflow. Each team builds
  glue that may or may not preserve the
  local safety contract.
- Proof is invisible to PR reviewers unless
  someone screenshots a terminal.
- The "obvious" GitHub Actions workflow is
  not obvious; operators will get fork /
  secret behavior wrong without guidance.

### Option B — GitHub Actions smoke workflow only

Ship a **documented workflow template** in
the Rekon repo that runs the existing CLI
end-to-end and uploads `.rekon/artifacts` as
a workflow artifact. The template uses no
GitHub API writes (no Checks API, no PR
comments). Status appears as the job's
pass/fail and via GitHub's built-in **job
summary** (a markdown file the runner
writes; no token required).

**Pros:**

- Useful immediately without any GitHub API
  integration.
- Low implementation risk: the workflow is
  YAML plus the CLI Rekon already ships.
- Preserves artifact-canonical proof — the
  uploaded artifact is the canonical proof
  record, not the job's pass/fail badge.
- Job summary uses the same publication
  markdown the local CLI produces (no new
  formatter).
- Forked-PR safety is straightforward:
  default `pull_request` trigger runs in
  the fork's context with no secrets, no
  PR write permissions, and no Checks
  write.

**Cons:**

- No rich PR status. Reviewers see "job
  passed / failed" but not the proof
  source / freshness / per-command detail
  unless they click into the artifact or
  job summary.
- Artifact retention defaults need
  documentation.
- The workflow still needs to look up the
  latest plan / run ids inside the runner,
  which means scripting or a tiny CLI
  helper.

### Option C — First-party GitHub Check / PR publisher

Add a new publisher (or capability) that
turns a `VerificationResult` /
`ProofReport` / `AgentContract` publication
into a GitHub Check Run or a PR comment via
the GitHub REST / GraphQL API.

**Pros:**

- Best reviewer experience. Proof status
  appears next to the PR's other checks.
- PR comments link directly to artifacts.
- Closer to a mature product surface.

**Cons:**

- Requires `pull-requests: write` and/or
  `checks: write` workflow permissions.
- Requires a GitHub token (`GITHUB_TOKEN`
  for same-repo PRs, but forked-PR
  workflows must use `pull_request_target`
  or a separate workflow run to interact
  with the API — both have known abuse
  vectors).
- Substantial code: API client, retry
  logic, error handling, rate limits,
  pagination, conclusion-state mapping
  (passed / failed / partial / not-run /
  stale → success / failure / neutral /
  cancelled / skipped).
- Blurs the publication-vs-canonical
  boundary. A "✅ Rekon verify" check is
  easy to misread as "the work is safe to
  merge" when it might be measuring stale
  proof against an older plan.
- Forked-PR safety is harder: the simplest
  pattern (`pull_request_target` + checkout
  PR ref) executes contributor code with
  the upstream repo's secrets — a known
  pwn-the-CI pattern. Solving this
  properly takes design work that does not
  belong in alpha.
- Test surface area grows: API responses
  need to be mocked, retry logic verified,
  error paths covered.

### Option D — Hybrid staged approach

**Alpha:** ship the **documented GitHub
Actions workflow template** from Option B
plus a small amount of CLI / docs work to
make plan/run lookup ergonomic in CI.

**Beta:** add the first-party **GitHub
Check / PR comment publisher** from Option C
once the workflow template has real-repo
data, artifact behavior has stabilized, and
the fork-safety contract is concrete.

**Pros:**

- Captures most of Option B's value
  immediately.
- Defers Option C's complexity until
  artifact behavior has settled.
- Lets alpha users adopt CI proof without
  committing Rekon to API surface area it
  cannot easily revert.
- Keeps the publication-vs-canonical
  boundary intact: Option B's job summary
  uses markdown the local CLI already
  produces.

**Cons:**

- Reviewers still don't see proof in PR
  status during alpha.
- Two-stage rollout means the eventual
  publisher must be designed compatibly
  with the alpha workflow template.

## Recommendation

**Adopt Option D.**

For alpha:

- Verification execution remains
  **local-first**. The local runner is the
  authority for `shell: false`, scrubbed
  env, timeouts, redaction, digests, and
  no-auto-resolution.
- Rekon ships **one** documented GitHub
  Actions workflow template (next
  implementation slice) that drives the
  existing CLI end-to-end and uploads
  `.rekon/artifacts` as a workflow
  artifact.
- The workflow uses GitHub's built-in
  **job summary** (markdown written to
  `$GITHUB_STEP_SUMMARY`) for human-readable
  proof output. **No GitHub API writes.**
  The job summary can be the existing proof
  report / architecture summary publication
  markdown — Rekon already produces it.
- **Forked PRs run only the safe subset.**
  Default `pull_request` trigger; no
  `pull_request_target`; no secrets
  exposed; no Checks API.
- A future implementation slice (beta) adds
  a first-party Check / PR publisher.

Two anchor invariants the memo pins
regardless of which slice ships next:

> **GitHub status is not canonical truth.**
> Rekon's `VerificationRun`,
> `VerificationResult`, and `Publication`
> artifacts remain canonical. A green PR
> check or a green job badge is a downstream
> projection; it can disagree with the
> artifacts (e.g., when the workflow caches
> an old plan) and the artifacts win.

> **Forked PRs must not receive
> secret-bearing execution by default.** The
> alpha workflow template uses the standard
> `pull_request` trigger and the default
> `GITHUB_TOKEN` scope (read-only contents).
> `pull_request_target` is forbidden in the
> alpha template. Workflows that need
> secrets to reach the PR must go through a
> protected-branch / trusted-workflow
> escalation, not the default PR run.

## Alpha Workflow Shape

The alpha template (shipped in a later
docs-only slice) looks like:

```yaml
# .github/workflows/rekon-verify.yml (template; alpha)

name: Rekon Verify

on:
  push:
    branches: [main]
  pull_request:

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

      - run: npm ci

      - run: npm run build

      - name: Refresh
        run: node packages/cli/dist/index.js refresh --root . --json

      - name: Resolve latest plan id
        id: plan
        # Read the latest VerificationPlan from the artifact
        # index. Operators may swap this for `rekon intent
        # work-order` or `rekon intent remediation` when they
        # want to generate the plan inline.
        run: |
          PLAN_ID=$(node -e "
            const json = require('./.rekon/registry/artifacts.index.json');
            const plans = json.filter(e => e.type === 'VerificationPlan');
            plans.sort((a, b) => b.id.localeCompare(a.id));
            console.log(plans[0]?.id ?? '');
          ")
          echo "plan_id=$PLAN_ID" >> "$GITHUB_OUTPUT"

      - name: Verify run (execute)
        if: steps.plan.outputs.plan_id != ''
        run: |
          node packages/cli/dist/index.js verify run \
            --plan ${{ steps.plan.outputs.plan_id }} \
            --execute --json > .rekon/verify-run.json

      - name: Derive VerificationResult
        if: steps.plan.outputs.plan_id != ''
        run: |
          RUN_ID=$(node -e "
            const r = require('./.rekon/verify-run.json');
            console.log(r.verificationRun.id);
          ")
          node packages/cli/dist/index.js verify result from-run \
            --run "$RUN_ID" --json

      - name: Publish proof report
        run: node packages/cli/dist/index.js publish proof --root . --json

      - name: Publish architecture summary
        run: node packages/cli/dist/index.js publish architecture --root . --json

      - name: Publish agent contract
        run: node packages/cli/dist/index.js publish agent-contract --root . --json

      - name: Validate artifacts
        run: node packages/cli/dist/index.js artifacts validate --root . --json

      - name: Job summary (proof report)
        if: always()
        run: |
          cat .rekon/artifacts/publications/proof-report.md \
            >> "$GITHUB_STEP_SUMMARY" || true

      - name: Upload Rekon artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: rekon-artifacts
          path: |
            .rekon/artifacts
            !.rekon/artifacts/**/*.log
          retention-days: 7
```

Plan/run id lookup may move to a tiny
`rekon artifacts latest --type VerificationPlan
--json` CLI helper in a follow-up slice; until
then, a one-liner reads the artifact index
directly.

The template is **opinionated but not
canonical**. Teams that need different
triggers, runners, or retention may copy and
modify it. The canonical record remains the
uploaded `.rekon/artifacts` directory.

## GitHub Permissions And Fork Safety

The alpha template's permission contract:

- **`permissions: contents: read`** at the
  workflow level. No `pull-requests:
  write`, no `checks: write`, no
  `contents: write`, no `id-token`.
- **No secrets** declared in the template.
  The template runs identically for repo
  members and fork contributors.
- **No `pull_request_target`.** The
  template uses only `pull_request` and
  `push`. Workflows that need access to the
  upstream repo's secrets must use a
  separate, manually-approved workflow
  pattern outside this template.
- **No setup actions that require
  secrets.** No `actions/setup-buildx`,
  `aws-actions/configure-aws-credentials`,
  or similar — those belong in
  team-specific workflows, not in Rekon's
  template.
- **No `continue-on-error` masking of
  failures.** A failed `rekon verify run
  --execute` step must surface as a failed
  job. The CLI already exits non-zero when
  the run status is `failed` / `timeout` /
  `killed`.
- **No deployment / write surface.** The
  template publishes nothing to npm, no
  cloud target, no remote artifact store.
  The only outputs are the uploaded
  workflow artifact and the job summary.

Forked PRs receive:

- The same `pull_request` trigger.
- Read-only contents (their fork plus the
  base repo at the PR base SHA).
- No upstream secrets.
- A green / red job badge derived purely
  from the local CLI's exit codes.

Forked PRs do **not** receive:

- The ability to write Checks / PR
  comments / commit statuses.
- Access to upstream secrets.
- Any escalated permission scope.

If a team needs richer behavior for forked
PRs (e.g., a status check, an inline
comment), they must adopt the future
publisher (Option C, beta) and accept the
associated trust model. The alpha template
does not enable it.

## Artifact Upload And Retention

**Upload (`actions/upload-artifact@v4`):**

- `.rekon/artifacts/` — every artifact
  Rekon's runtime wrote (snapshots,
  evidence, projections, findings,
  actions, publications). This is the
  canonical proof record.
- Publication markdown files inside
  `.rekon/artifacts/publications/`
  (proof-report, architecture-summary,
  agent-contract). The job summary also
  inlines the proof report.

**Do not upload:**

- Raw command logs (`.log` files).
- Raw stdout / stderr beyond the redacted
  truncated excerpts already inside
  `VerificationRun.commandResults[*].stdoutExcerpt`
  / `stderrExcerpt`.
- Full process environment dumps.
- Secrets, tokens, or any
  `${{ secrets.* }}` reference.
- Source diffs beyond the standard
  repository checkout (the workflow
  artifact is `.rekon/artifacts` only, not
  the repo contents).

The Rekon runner's existing safety contract
already enforces most of these — log
excerpts are redacted before truncation,
streams are stored at most 8 KB per command
per stream, env policy is `scrubbed`. The
workflow template's `path:` filter excludes
`.log` files explicitly as belt-and-braces.

**Retention:**

- **Default:** `retention-days: 7`. Short
  enough to bound exposure of any data that
  slipped past the redaction patterns; long
  enough for a reviewer to download proof
  during a typical PR cycle.
- Operators who need longer retention may
  raise it to GitHub's max (90 days) but
  the alpha template recommends 7–14 days
  to keep storage costs low and to avoid
  making proof artifacts a long-lived
  attack target.
- Public repos: workflow logs themselves
  are retained by GitHub for ~90 days
  regardless of artifact retention; this
  is a property of GitHub, not Rekon.

## Job Summary Surface

GitHub Actions writes anything appended to
the `$GITHUB_STEP_SUMMARY` file to the
job's summary page. **No API permissions
required** — the file is part of the runner
filesystem.

The alpha template uses this to surface the
existing proof report markdown:

```yaml
- name: Job summary (proof report)
  if: always()
  run: |
    cat .rekon/artifacts/publications/proof-report.md \
      >> "$GITHUB_STEP_SUMMARY" || true
```

Effect: the GitHub Actions UI shows the
proof report directly under the job (status
table, source / freshness, per-command
results with digest prefixes, failed /
missing evidence, recommended next
commands). The summary respects the
publication's "no raw stdout / stderr"
contract because the publication itself
respects it.

Teams that want a tighter summary may
inline only the architecture summary or
construct their own markdown from the
uploaded artifact contents. The alpha
template ships the proof report as the
default because it is the focused proof
readout.

## What This Does Not Do

- **No GitHub Actions workflow file ships
  in this batch.** This is a strategy memo
  only. The actual `.github/workflows/`
  template is the next implementation
  slice.
- **No GitHub Check Run publisher.**
  Deferred to beta.
- **No PR comment publisher.** Deferred.
- **No `pull-requests: write` workflow.**
- **No `checks: write` workflow.**
- **No GitHub API client.** No new
  dependency on `@actions/*` or
  `@octokit/*`.
- **No new capability package.** The alpha
  workflow reuses
  `@rekon/capability-verify` and the
  existing publications.
- **No new CLI command.** The alpha
  workflow uses commands the CLI already
  ships:
  - `rekon refresh`
  - `rekon intent work-order` /
    `rekon intent remediation` (operator's
    choice; not required for the smoke
    template)
  - `rekon verify run --execute`
  - `rekon verify result from-run --run
    <id>`
  - `rekon publish proof` /
    `publish architecture` /
    `publish agent-contract`
  - `rekon artifacts validate` /
    `rekon artifacts freshness`
- **No artifact-shape change.** No
  `schemaVersion` bump on `VerificationRun`,
  `VerificationResult`, `VerificationPlan`,
  `Publication`, or any other artifact.
- **No runtime behavior change.** No
  changes to `refresh`, `publish`,
  `resolve`, `intent`, `reconcile`,
  `verify`, `artifacts`, or any other CLI
  surface.
- **No npm publish. No version bump.**

## Implementation Sequence

The decision pins the direction. Concrete
implementation lands across subsequent
slices:

1. **(this slice)** Decision memo. Strategy-
   only. Updates supporting docs.
   ✅ Shipping in this batch.

2. **GitHub Actions workflow template (alpha).**
   ✅ Shipped. Docs-only slice. Ships an
   opinionated workflow template at
   [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
   plus operator documentation at
   [`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md).
   The template is **not** installed under
   `.github/workflows` in the Rekon repo
   itself; operators copy it into their
   own repos to enable.

   The shipped template implements the
   "Alpha Workflow Shape" section of this
   memo exactly:
   - `permissions: contents: read` only.
   - Triggers: `pull_request` and
     `workflow_dispatch`. No
     `pull_request_target`.
   - Steps: checkout → setup-node@v4 →
     `npm ci` → `npm run build` →
     `rekon refresh` → resolve latest
     `VerificationPlan` id via an inline
     Node snippet → `rekon verify run
     --execute` → resolve `VerificationRun`
     id from the execute step's JSON
     output → `rekon verify result from-run`
     → `rekon publish proof` /
     `publish architecture` /
     `publish agent-contract` →
     `rekon artifacts validate` → append
     `# Rekon Verification Summary` plus
     the proof-report markdown to
     `$GITHUB_STEP_SUMMARY` → upload
     `.rekon/artifacts/**` (with
     `!.rekon/artifacts/**/*.log`
     exclusion) as `rekon-artifacts` with
     `retention-days: 7`.
   - No GitHub API writes. No secrets
     declared. No setup actions requiring
     secrets.

   Pinned by **23 docs-only assertions** in
   `tests/docs/verification-runner-github-actions-template.test.mjs`
   covering both file existence, the
   permission contract, the
   `pull_request_target` prohibition, every
   CLI step, the upload path / `.log`
   exclusion / `retention-days: 7`, the
   four anchor / safety statements
   (`GitHub status is not canonical truth`,
   `Rekon artifacts remain canonical`,
   `forked PRs must not receive
   secret-bearing execution by default`,
   `passing verification does not
   automatically resolve findings`), the
   CHANGELOG mention, and the review-packet
   `PURPOSE PRESERVATION CHECK`.

3. **CLI ergonomics for CI.** ✅ Shipped.
   - New CLI command
     `rekon artifacts latest --type
     <ArtifactType> [--kind <kind>]
     [--id-only] [--allow-missing]
     [--root <path>] [--json]`.
   - Read-only: walks the local artifact
     index by `writtenAt` desc; for
     Publication `--kind` lookups, walks
     entries newest-first and reads
     bodies until one matches the
     requested `body.kind`. Writes
     nothing. Does not refresh,
     validate, execute, or publish.
   - `--id-only` emits a typed
     `<type>:<id>` ref to stdout (no
     JSON), shell-friendly for
     `$GITHUB_OUTPUT` capture.
   - `--allow-missing` returns
     `artifact: null` with exit 0
     instead of exit 1.
   - `--kind` is only valid with
     `--type Publication` and fails
     clearly otherwise.
   - The GitHub Actions workflow
     template at
     [`docs/examples/workflows/rekon-verification.yml`](../examples/workflows/rekon-verification.yml)
     was updated to use the helper
     instead of inline `node - <<'NODE'`
     snippets for latest-artifact id
     resolution; both the operator guide
     and tests pin this.
   - 12 contract tests in
     `tests/contract/artifacts-latest-cli.test.mjs`
     pin: latest-by-type, missing
     case + exit code, `--allow-missing`,
     `--id-only` output, Publication
     `--kind` filter, `--kind` on
     non-Publication failure, kind
     reading `body.kind` (not id
     prefix), older-artifact
     ignored, read-only invariant,
     `artifacts validate` clean,
     missing `--type` rejection, and
     `--id-only` missing case.

4. **Workflow hardening v2 (dry-run
   variant + richer job summary +
   troubleshooting).** ✅ Shipped.
   - New copyable workflow at
     [`docs/examples/workflows/rekon-verification-dry-run.yml`](../examples/workflows/rekon-verification-dry-run.yml).
     Same safety contract as the execute
     variant (`permissions: contents:
     read`, no secrets, no
     `pull_request_target`, no GitHub
     API writes,
     `actions/upload-artifact` of
     `.rekon/artifacts/**` excluding
     `.log`, `retention-days: 7`) but
     runs `rekon verify run --dry-run`
     instead of `--execute`. The
     workflow does **not** call
     `verify result from-run` because
     a dry-run is not proof.
   - Execute workflow hardened with
     extended `rekon artifacts latest`
     lookups for `VerificationResult`,
     `Publication --kind
     architecture-summary`, and
     `Publication --kind agent-contract`
     so the job summary cites every
     refresh-loop publication ref by
     id, not just the proof-report.
   - Both job summaries now include an
     explicit `Mode:
     execute|dry-run` line, an
     `Artifacts valid: true|false`
     line (captured from
     `rekon artifacts validate --json`),
     and rows for every publication
     ref. The dry-run summary states
     `VerificationResult: not produced
     (dry-run is not proof)`.
   - Operator guide
     [`docs/examples/github-actions-verification-runner.md`](../examples/github-actions-verification-runner.md)
     gains a new "Adoption — copy the
     dry-run template first" section
     near the top and an expanded
     Troubleshooting section with 10
     items (each carrying **Likely
     cause** / **Safe next step** /
     **Do not**). Covers: no
     `VerificationPlan` found, failed
     verification command, dry-run
     produced run-only,
     `verify result from-run` refusal,
     artifacts validate failed,
     artifacts upload missing, forked
     PR needs secrets, stale-proof
     summary, scrubbed-env spawn
     failures, job-summary not
     rendering, and the green-badge-as-
     completion antipattern.
   - **Still no GitHub API writes.**
     **Still no first-party Check / PR
     comment publisher.**
   - 23 docs-only assertions in
     `tests/docs/verification-runner-github-actions-hardening.test.mjs`
     pin the dry-run YAML's existence,
     both workflows' permission +
     fork-safety contract, the
     `--dry-run` / `--execute` split,
     both workflows' adoption of the
     latest-artifact helper, the
     upload path + `.log` exclusion +
     `retention-days: 7` +
     `$GITHUB_STEP_SUMMARY`, the
     adoption-first language, the
     three anchor statements (canonical
     truth, artifacts canonical, fork
     secrets), three troubleshooting
     items (no plan, failed command,
     forked-PR secrets), the CHANGELOG
     mention, and the review packet's
     `PURPOSE PRESERVATION CHECK`.

   A dedicated `--summary-only` flag on
   `rekon publish proof` (or a new
   `rekon publish job-summary` command)
   may still land later if the embedded
   proof-report markdown becomes too
   large; for alpha, the existing
   proof-report Markdown is already
   compact and fits comfortably in
   GitHub's ~1 MB
   `$GITHUB_STEP_SUMMARY` limit.

5. **Workflow validation helper.** ✅
   Shipped. New CLI command
   `rekon verify github-workflow validate
   --path <workflow.yml> [--root <path>]
   [--json]`. Read-only static analyzer
   that walks a workflow YAML and
   reports violations of the alpha
   safety contract: no
   `pull_request_target`; no GitHub
   write permissions (`pull-requests` /
   `checks` / `contents` / `id-token` /
   `actions` / `deployments` /
   `statuses` / `packages` `write`);
   `permissions: contents: read`
   declared; no GitHub API calls
   (`gh api`, `curl api.github.com`,
   `actions/github-script`); uses
   `rekon artifacts latest`; uploads
   `.rekon/artifacts/**`; excludes
   `.log` files; appends to
   `$GITHUB_STEP_SUMMARY`; detects mode
   (`execute` / `dry-run` / `unknown`).
   Warning-only checks: canonical-truth
   reminder presence, `retention-days`
   set. Both bundled templates
   validate clean. CLI exits 0 when
   valid, 1 when any error-severity
   issue exists. The helper is
   quote-aware (a `#` inside `"..."`
   or `'...'` is not treated as a
   YAML comment, so workflows that
   echo literal `#` characters into
   the job summary still parse
   correctly). The validator never
   spawns a process, calls the
   GitHub API, or writes artifacts.
   25 contract tests pin the helper's
   behaviour; both workflow templates
   carry a top-of-file comment
   instructing operators to run
   `rekon verify github-workflow
   validate` after copying.

6. **GitHub Check publisher (beta).** ✅
   **Decision + gated skeleton shipped.**
   See
   [`verification-runner-github-check-publisher-decision.md`](verification-runner-github-check-publisher-decision.md).
   This first-party publisher creates a
   GitHub Check Run from a
   `VerificationResult` + the latest
   proof report. Requires `checks: write`,
   an explicit per-repo opt-in
   (`REKON_GITHUB_CHECKS=1`), and a
   documented fork-safety contract
   (forked PRs untrusted by default;
   `pull_request_target` refused
   unconditionally). The split-shipment
   plan is:
   - **6a (shipped).** Decision memo +
     pure helpers in
     `@rekon/capability-docs`
     (`buildGitHubCheckPayload`,
     `assessGitHubCheckPublisherReadiness`).
     No GitHub API call; no network
     client imported.
   - **6b (shipped).** ✅ CLI dry-run
     command `rekon publish github-check
     --dry-run [--root <path>] [--json]`.
     Reads local Rekon artifacts, calls
     the shared helpers, prints
     `{ kind, dryRun, payload, readiness,
     canonicalTruthReminder }`. The CLI
     does not read `GITHUB_TOKEN` /
     `GH_TOKEN` and imports no network
     client; readiness false is exit 0,
     missing artifacts is exit 1.
   - **6c (shipped).** ✅ Actual GitHub
     API write via `publish github-check
     --send`. Default-deny gated. Uses
     Node's built-in `fetch` (no
     third-party network client). Token
     reads confined to the send branch.
     Sanitized errors. Forked PRs denied
     by default; `pull_request_target`
     denied unconditionally.
   - **6d (shipped).** ✅ Opt-in
     workflow template at
     `docs/examples/workflows/rekon-verification-check-send.yml`
     + validator `--profile
     read-only | github-check-send`
     flag. First Rekon workflow template
     to request `checks: write`;
     triggers on `workflow_dispatch` +
     `push` to `main` only;
     `pull_request` trigger refused by
     the new validator profile because
     forks would inherit the `checks:
     write` + Rekon opt-in env. The
     read-only profile preserves the
     existing contract; the bundled
     read-only templates still validate
     clean.
   - **6e (shipped).** ✅ Strategy
     safety review at
     [`github-check-publisher-send-workflow-safety-review.md`](github-check-publisher-send-workflow-safety-review.md).
     Reviews the full path (payload
     helper, readiness helper, dry-run
     CLI, send CLI, read-only +
     opt-in templates, validator
     profiles, token / permission
     behaviour, fork / event safety,
     canonical-artifact boundary, test
     coverage, remaining risks).
     Decision: beta-ready as an opt-in
     surface; read-only templates
     remain alpha default; PR
     comments remain deferred.

7. **PR comment publisher (beta+).**
   Decision memo at
   [`pr-comment-publisher-decision.md`](pr-comment-publisher-decision.md).
   **Decision: Option B — design a PR
   comment dry-run renderer; defer
   actual PR comment posting.** PR
   comments would require `issues:
   write` or `pull-requests: write`
   (broader than the `checks: write`
   the Check publisher uses today) and
   would add a noise / staleness /
   comment-identity surface that
   benefits from being designed in
   isolation before any API write
   ships. Read-only templates remain
   alpha default; PR comments are not
   required for beta if Checks +
   Rekon artifacts are sufficient for
   review.
   - **7a (shipped).** ✅ Decision
     memo + docs test + review
     packet.
   - **7b (shipped).** ✅ PR comment
     body dry-run helper
     (`buildPrCommentBody`,
     `assessPrCommentPublisherReadiness`)
     in `@rekon/capability-docs` +
     `rekon publish pr-comment
     --dry-run [--root <path>] [--json]`
     CLI. **No GitHub API call. No
     token reads.** Mirrors the
     step-6a / 6b shape exactly. The
     body always carries the
     idempotency marker
     `<!-- rekon:pr-comment:v1 -->` +
     the canonical-truth reminder, and
     cites every supplied artifact
     ref. `--send` / `--publish` /
     `--execute` are refused with
     exit 1.
   - **7c (shipped).** ✅ PR Comment
     Publisher API Decision Gate at
     [`pr-comment-publisher-api-decision-gate.md`](pr-comment-publisher-api-decision-gate.md).
     Reviews the shipped dry-run
     components, the GitHub permission
     boundary (`issues: write` /
     `pull-requests: write` required;
     broader than `checks: write`),
     the fork-default-deny posture, the
     comment-body model, the
     idempotency + noise strategy, and
     four implementation options.
     Decision: **Option C — add a
     workflow / validator / profile
     gate first; do not implement the
     API writer in the next slice.**
     No runtime behaviour change.
   - **7c (later, if approved).** New
     workflow validator profile
     (e.g. `github-pr-comment-send`)
     + docs for the broader scope.
   - **7d (later, if approved).** PR
     comment API write behind the
     readiness gate. Update-in-place
     via the
     `<!-- rekon:pr-comment:v1 -->`
     marker. Sanitized errors.

8. **Cross-CI documentation (beta+).**
   Document the same workflow pattern for
   GitLab CI, Jenkins, CircleCI, etc. The
   CLI surface is identical; only the
   YAML envelope differs.

## Future GitHub Check Publisher

When step 6 lands (beta), it will face
non-trivial design work:

- **Conclusion-state mapping.** Rekon's
  proof statuses (`passed`, `failed`,
  `partial`, `not-run`) and the
  underlying run statuses (`timeout`,
  `killed`) must map to GitHub's check
  conclusion enum (`success`, `failure`,
  `neutral`, `cancelled`, `timed_out`,
  `action_required`, `stale`, `skipped`).
  The mapping must preserve the "failed >
  killed > timeout > partial > passed >
  not-run" priority and the "stale proof
  is a warning, not success" rule. A
  `partial` proof is most likely
  `neutral` or `action_required`, never
  `success`.
- **Annotations.** GitHub Check Runs
  support inline annotations on specific
  files / lines. Rekon's
  `VerificationResult` doesn't carry
  file/line context per command, but
  paired `WorkOrder.remediationItems`
  and `CoherencyDelta` entries do.
  Annotations can drive reviewer
  attention to remediation work without
  re-implementing finding triage.
- **Token surface.** The default
  `GITHUB_TOKEN` is sufficient for
  same-repo Checks API writes but is
  blocked from forked-PR contexts. The
  publisher needs a documented escalation
  pattern (likely a separate
  workflow_run that runs in the
  upstream repo context, reads the
  fork's artifact, and publishes the
  Check). This is a known-tricky GitHub
  Actions pattern and deserves a
  dedicated memo.
- **Stale-check handling.** When a PR
  pushes a new commit, the previous
  Check is still attached to the old
  SHA. The publisher must explicitly
  mark prior Checks as stale or
  cancelled so reviewers cannot
  accidentally rely on outdated proof.
- **Idempotency.** Re-running the
  workflow on the same SHA should
  update the existing Check rather than
  creating duplicates. The publisher
  needs a stable external_id.

None of this lands in alpha. The memo
documents the deferred problem so the
alpha template never paints itself into a
corner the future publisher can't get out
of.
