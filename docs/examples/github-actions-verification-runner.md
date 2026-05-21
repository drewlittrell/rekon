# GitHub Actions: Rekon Verification Workflow Template

A documented, copyable GitHub Actions workflow
for running Rekon verification in CI without
GitHub API writes. The template lives at
[`docs/examples/workflows/rekon-verification.yml`](workflows/rekon-verification.yml)
and is **not** installed under `.github/workflows`
in this repository — you copy it into your own
repo when you want it active.

> **GitHub status is not canonical truth; Rekon
> artifacts remain canonical.**
> The workflow's pass/fail badge and the job
> summary it writes are downstream projections
> of the local Rekon CLI's exit codes and the
> artifacts uploaded under `rekon-artifacts`.
> If the badge and the artifacts ever disagree
> (e.g., a cached stale plan), the artifacts
> win.

> **Forked PRs must not receive secret-bearing
> execution by default.**
> The template uses only
> `permissions: contents: read`, declares no
> secrets, and refuses `pull_request_target`.

The full decision context lives in
[`docs/strategy/verification-runner-ci-github-decision.md`](../strategy/verification-runner-ci-github-decision.md).

## Validate a copied workflow

After copying either template into your repo's
`.github/workflows/` directory, run the
**read-only workflow validator** to confirm the
file still respects the alpha safety contract:

```sh
node packages/cli/dist/index.js verify github-workflow validate \
  --path .github/workflows/rekon-verification.yml --json
```

The validator:

- Is **static and read-only.** It reads the
  YAML file and runs text-based checks. It
  writes nothing, executes nothing, and does
  **not** call GitHub.
- Checks the alpha **safety contract**:
  no `pull_request_target`; no GitHub write
  permissions
  (`pull-requests` / `checks` / `contents` /
  `id-token` / `actions` / `deployments` /
  `statuses` / `packages` `write`);
  `permissions: contents: read` declared;
  no GitHub API calls
  (`gh api`, `curl api.github.com`,
  `actions/github-script`); uses
  `rekon artifacts latest`; uploads
  `.rekon/artifacts/**`; excludes
  `.log` files; appends to
  `$GITHUB_STEP_SUMMARY`; detects mode
  (`execute` / `dry-run` / `unknown`).
- Reports **warnings** (canonical-truth
  reminder, `retention-days`) without making
  the report invalid.
- Exits **0** when valid, **1** when any
  error-severity issue exists.

Both bundled templates pass the validator
out of the box. Run it again whenever you
customize a copied template — small edits
(adding a permission, switching to
`pull_request_target`, removing the
`.log` exclude) are exactly what this
helper exists to catch.

The validator does **not** check semantic
correctness of every step. It is a
safety-contract auditor, not a workflow
compiler. Treat a green result as "this
workflow respects the alpha boundaries" —
not as "this workflow will succeed on
your runner."

## Adoption — copy the dry-run template first

There are two workflow templates in this
example directory:

- [`workflows/rekon-verification-dry-run.yml`](workflows/rekon-verification-dry-run.yml)
  — runs `rekon verify run --dry-run`.
  Spawns **zero** plan commands. Writes a
  planned-but-not-run `VerificationRun`
  and refreshes the proof / architecture /
  agent-contract publications.
- [`workflows/rekon-verification.yml`](workflows/rekon-verification.yml)
  — runs `rekon verify run --execute`.
  Actually runs the plan's commands under
  the local runner safety contract.

**Adoption path:**

1. Copy the **dry-run** workflow into your
   `.github/workflows/` first.
2. Open a PR or trigger
   `workflow_dispatch`; confirm that
   `rekon-artifacts` uploads and the job
   summary renders (Mode: `dry-run`,
   VerificationResult: `not produced`).
3. Download the `rekon-artifacts` upload
   and inspect the planned `VerificationRun`
   — its `commands[*].argv` shows exactly
   what the future execute run would
   spawn.
4. Review the plan's commands. If a
   command should not run under
   `shell: false`, fix the
   `VerificationPlan` upstream before
   switching to the execute workflow.
5. Once you trust the plan, swap the
   dry-run workflow for the execute
   workflow (or run them in parallel and
   delete the dry-run later).
6. **Keep GitHub permissions read-only**
   (`permissions: contents: read`) unless
   and until you adopt the future
   first-party Check / PR comment
   publisher — a beta capability with its
   own permission contract.

The dry-run template is also useful as a
permanent safety net on forks /
contributor PRs: it confirms the proof
loop wires up without spawning anything,
even when reviewing a PR whose plan
commands you do not yet trust.

## 1. What the template does

For every pull request (and on manual
`workflow_dispatch`):

1. Checks out the PR's contents and sets up
   Node 20 with `npm` cache.
2. Runs `npm ci` and `npm run build`.
3. Runs `rekon refresh` to populate the local
   artifact store.
4. Reads `.rekon/registry/artifacts.index.json`
   to resolve the latest `VerificationPlan` id.
5. Runs `rekon verify run --execute` against
   that plan. The local runner enforces
   `shell: false`, a scrubbed env, per-command
   + per-plan timeouts, bounded redacted log
   excerpts, and sha256 stream digests. CLI
   exits non-zero on `failed` / `timeout` /
   `killed`.
6. Resolves the latest `VerificationRun` id
   from the execute step's JSON output.
7. Runs `rekon verify result from-run --run
   <id>` to derive a concise
   `VerificationResult` proof summary.
8. Runs `rekon publish proof`,
   `rekon publish architecture`, and
   `rekon publish agent-contract` to refresh
   the proof-loop publications.
9. Runs `rekon artifacts validate` to confirm
   the local store is internally consistent.
10. Appends a `# Rekon Verification Summary`
    block and the full proof-report markdown
    to `$GITHUB_STEP_SUMMARY`. The summary
    explicitly states that GitHub status is
    not canonical truth.
11. Uploads `.rekon/artifacts/**` (excluding
    `.log` files) as the `rekon-artifacts`
    workflow artifact with
    `retention-days: 7`.

The job's pass/fail badge tracks the local
CLI's exit codes. A failed verification leaves
the job red, the artifact still uploaded, and
the proof-report job summary visible.

## 2. What it does not do

- **Does not call the GitHub API.** No
  `octokit`, no `gh`, no REST/GraphQL writes.
- **Does not create GitHub Checks.** The
  alpha workflow never writes the Checks API.
  A first-party GitHub Check publisher is
  deferred to beta — see the
  [CI / GitHub adapter decision memo](../strategy/verification-runner-ci-github-decision.md).
  The first GitHub-write decision memo +
  gated skeleton ship in
  [`verification-runner-github-check-publisher-decision.md`](../strategy/verification-runner-github-check-publisher-decision.md):
  pure helpers
  (`buildGitHubCheckPayload`,
  `assessGitHubCheckPublisherReadiness`)
  that build the payload and gate readiness
  but **never call GitHub**. Forked PRs are
  untrusted by default, and
  `pull_request_target` is refused
  unconditionally. Reaching the actual API
  call requires two more slices (dry-run
  CLI + API-write slice).
- **Does not write PR comments.** No
  `pull-requests: write` permission, no
  comment body, no inline annotations.
- **Does not request write permissions.** The
  workflow declares only
  `permissions: contents: read`.
- **Does not use `pull_request_target`.** The
  `pull_request` trigger runs in the PR's
  context with no upstream secrets.
- **Does not declare secrets.** Adding
  secrets to your own copy is your decision
  and your responsibility; the template
  defaults are safe for fork PRs.
- **Does not upload raw command logs.** The
  workflow's upload path excludes
  `.rekon/artifacts/**/*.log` explicitly.
  Rekon's runner already keeps raw stdout /
  stderr out of artifact bodies (digests +
  redacted truncated excerpts only).
- **Does not auto-resolve findings.**
  Passing verification does not automatically
  resolve findings. Status changes still
  require explicit `rekon findings status set`
  or `rekon issues merge decide` invocations.
- **Does not publish to npm.**
- **Does not push to any registry.**

## 3. Permission model

The template requests only:

```yaml
permissions:
  contents: read
```

It explicitly does **not** request:

- `pull-requests: write` (forbidden in alpha)
- `checks: write` (forbidden in alpha)
- `contents: write` (forbidden)
- `id-token: write` (forbidden)
- `packages: write` / `deployments: write` /
  any other write scope

The alpha workflow template requests only
`contents: read`. Every additional permission
expands the blast radius if the workflow is
ever compromised; the template stays minimal
by design.

If your team eventually adopts the
first-party GitHub Check / PR comment
publisher (a future beta capability), that
slice will introduce a **separate** workflow
opt-in with `checks: write` and / or
`pull-requests: write` scoped to a narrower
job. The alpha template stays read-only.

## 4. Fork / secret safety

Forked PRs run the workflow under the
**default `pull_request` trigger**:

- The runner checks out the fork's HEAD (the
  PR branch), not the base repo's protected
  branches.
- The `GITHUB_TOKEN` is downgraded to the
  fork's permission scope (typically
  read-only).
- **No upstream repo secrets are exposed to
  the fork's checkout.**

The template never uses `pull_request_target`,
which is the canonical "pwn the CI" vector:
that trigger runs in the upstream context
with full secret access while checking out
the fork's code. The decision memo explicitly
forbids this pattern in alpha.

If you must run secret-bearing actions for a
PR (e.g., to talk to a private package
registry), do so in a **separate** workflow
that:

1. Triggers only on `push` to protected
   branches, or on a manually-approved
   `workflow_dispatch`.
2. Is scoped to the narrowest possible
   permission set.
3. Does **not** use `pull_request_target`.

The Rekon verification workflow remains the
safe default for every PR, including from
forks.

## 5. Artifact upload policy

The upload step:

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: rekon-artifacts
    path: |
      .rekon/artifacts/**
      !.rekon/artifacts/**/*.log
    retention-days: 7
```

The path includes everything Rekon's runtime
wrote to `.rekon/artifacts/`:

- `evidence/*.json` (e.g., `EvidenceGraph`,
  `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`)
- `findings/*.json` (e.g., `FindingReport`,
  `FindingLifecycleReport`,
  `CoherencyDelta`)
- `actions/*.json` (e.g., `WorkOrder`,
  `VerificationPlan`, `VerificationRun`,
  `VerificationResult`, `ReconciliationPlan`)
- `publications/*.json` and
  `publications/*.md` (e.g.,
  `proof-report.md`,
  `architecture-summary.md`,
  `agent-contract.md`)

The exclude pattern `.rekon/artifacts/**/*.log`
is **defense in depth**. Rekon's runner
already enforces that raw stdout / stderr
never reach artifact bodies — the
`VerificationRun.commandResults[*].stdoutExcerpt`
/ `stderrExcerpt` fields hold redacted +
truncated content with a default 8 KB cap per
stream per command, and the full pre-redaction
streams are summarized via sha256 digests
only. The `!*.log` filter ensures any future
sidecar log files (should they ever be
introduced) cannot leak into the upload.

**Retention:** the template uses
`retention-days: 7`. Operators may raise to
GitHub's max (90 days) but the alpha
recommendation is 7–14 days to bound
exposure of any data that slipped past
redaction. Public-repo workflow logs are
retained by GitHub for ~90 days regardless;
that is a property of GitHub, not Rekon.

## 6. Job summary behavior

GitHub Actions writes anything appended to
`$GITHUB_STEP_SUMMARY` to the job's summary
page. **No API permissions required** — the
file is part of the runner filesystem.

The template appends:

```markdown
# Rekon Verification Summary

- VerificationRun: `<id>`
- VerificationPlan: `<id>`

Uploaded artifact: `rekon-artifacts`

_GitHub status is not canonical truth; Rekon artifacts remain canonical._

---

<the full proof-report.md content>
```

The summary uses the existing
`proof-report.md` publication content
verbatim. That publication already calls out
proof source (`manual` vs `runner-derived`),
freshness (`fresh` / `stale` / `missing-plan`
/ `unknown`), failure / stale callouts, and
recommended next commands. The summary
respects the runner's "no raw stdout /
stderr in publications" contract because the
publication itself respects it.

## 7. Customizing the VerificationPlan lookup

The template uses the **read-only
`rekon artifacts latest` helper** to resolve
the latest `VerificationPlan` id:

```yaml
- name: Resolve latest VerificationPlan
  id: plan
  run: |
    ID="$(node packages/cli/dist/index.js artifacts latest \
      --root . --type VerificationPlan --id-only --allow-missing)"
    echo "ref=$ID" >> "$GITHUB_OUTPUT"
    echo "id=${ID#VerificationPlan:}" >> "$GITHUB_OUTPUT"
```

The helper is **read-only**. It reads the
local Rekon artifact index and (for
`--kind` lookups on Publications) optionally
reads artifact bodies. It does not
refresh, execute, publish, or validate by
itself. Mutation paths remain explicit
operator commands (`refresh`,
`verify run --execute`, etc.).

Flag summary:

- `--type <ArtifactType>` (required) —
  artifact type to look up.
- `--kind <kind>` — Publication-only;
  filters by `body.kind` (e.g.,
  `proof-report`, `architecture-summary`,
  `agent-contract`).
- `--id-only` — emit a typed
  `<type>:<id>` ref to stdout, no JSON.
  Shell-friendly for `$GITHUB_OUTPUT`
  capture.
- `--allow-missing` — return
  `artifact: null` with exit 0 instead of
  exit 1. Used in the template so the
  workflow continues gracefully when no
  `VerificationPlan` exists yet (the
  subsequent execute step is guarded
  with `if: steps.plan.outputs.id !=
  ''`).

**Other lookups you may need:**

- Latest `VerificationRun`:
  `rekon artifacts latest --type
  VerificationRun --id-only`. The
  template uses this right after the
  execute step instead of parsing
  `verify-run.json`.
- Latest proof-report Publication:
  `rekon artifacts latest --type
  Publication --kind proof-report
  --id-only`. The template uses this to
  cite the proof report in the job
  summary.
- Generating a plan inline: if your repo
  doesn't ship a `VerificationPlan` in the
  checkout, swap the lookup step for an
  `rekon intent work-order` invocation
  that produces a plan as part of the
  workflow. The helper will pick it up
  in the next step.

## 8. Trial usage: switch execute to dry-run

The local runner has three modes:

- `rekon verify run --plan <id> --dry-run` —
  parses the plan, validates commands
  against the safety contract, writes a
  planned-but-not-run `VerificationRun`.
  Never spawns a process.
- `rekon verify run --plan <id> --execute` —
  actually runs the plan with `shell: false`
  and the full safety contract.
- `rekon verify record --plan <id>
  --result-json <json>` — manually record
  a `VerificationResult` (operator-supplied
  outcomes). Unchanged by this template.

If you're trying the template on a new repo
and want to confirm the proof loop wires up
correctly **before** spawning processes,
swap `--execute` for `--dry-run` in the
template:

```yaml
- name: Rekon verify run (dry-run trial)
  if: steps.plan.outputs.plan_id != ''
  run: |
    node packages/cli/dist/index.js verify run \
      --root . \
      --plan "${{ steps.plan.outputs.plan_id }}" \
      --dry-run \
      --json > .rekon/verify-run.json
```

In dry-run mode the subsequent
`verify result from-run` step refuses by
default (a dry-run is not proof). To skip
that step in trial usage, either remove it
or set `if: false`.

## 9. Why GitHub status is not canonical truth

The decision memo's anchor invariant:

> **GitHub status is not canonical truth.**
> Rekon's `VerificationRun`,
> `VerificationResult`, and `Publication`
> artifacts remain canonical; any future
> Check / PR / dashboard output is a
> downstream projection, never an
> independent source of truth.

Concretely:

- The workflow's green / red badge tracks
  the local CLI's exit codes. The CLI can
  exit non-zero while still writing a valid,
  citable `VerificationRun` artifact (e.g.,
  a `failed` run). Reviewers who see a red
  badge should download `rekon-artifacts`
  and read `proof-report.md` — the artifact
  carries the actionable detail.
- The badge can be **stale**. If the
  workflow caches an older
  `VerificationPlan`, the badge may be green
  while a newer plan exists. The proof
  report's `Freshness` row catches this
  (`stale` / `missing-plan`); the badge
  does not.
- The badge cannot distinguish manual vs
  runner-derived proof. A repo that uses
  `rekon verify record` to produce
  `VerificationResult` artifacts manually
  gets the same green badge as a repo
  whose verification was executed by the
  Rekon runner. The proof report's
  `Source` row catches this; the badge
  does not.

Treat the badge as a **signal**, not a
verdict. The artifacts are the verdict.

## 10. Troubleshooting

Each item below carries **Likely cause**,
**Safe next step**, and **What not to do**.
The "what not to do" entries exist because
the obvious workaround often weakens the
safety contract.

### No VerificationPlan found

The plan-lookup step's output is empty and
the `verify run` step skips with
`if: steps.plan.outputs.id != ''`.

- **Likely cause:** the repo has no
  `VerificationPlan` artifact yet. This
  is normal for a fresh repo and for repos
  that generate plans inline during a
  separate workflow step (not part of the
  templates).
- **Safe next step:** add a workflow step
  before the plan-lookup step that runs
  `rekon intent work-order --path <path>
  --goal "<goal>" --root .` (or
  `rekon intent remediation --root .` when
  driven by a `CoherencyDelta`). The
  resulting plan will be picked up by the
  next `rekon artifacts latest --type
  VerificationPlan` step.
- **Do not:** hard-code a stale plan id
  into the workflow. Stale plans defeat the
  freshness classifier in
  proof-report / architecture-summary /
  agent-contract publications.

### Verification command failed

The execute workflow's `verify run` step
exits non-zero and the job badge is red.
The `VerificationRun` was still written; so
was the proof report.

- **Likely cause:** a plan command exited
  non-zero (`failed`), timed out
  (`timeout`), or was killed (`killed`).
  All three are first-class evidence,
  not workflow bugs.
- **Safe next step:** download the
  `rekon-artifacts` upload and read
  `proof-report.md`. The per-command
  table shows which command failed; the
  Failed / Missing Evidence section lists
  failures explicitly. Fix the underlying
  problem in the codebase and re-run the
  workflow.
- **Do not:** add `continue-on-error: true`
  to mask the failure. The CLI exits
  non-zero deliberately so operator
  scripts and reviewers see incomplete
  proof.

### Dry-run produced VerificationRun but no VerificationResult

You copied the dry-run template and the
job summary says
`VerificationResult: not produced
(dry-run is not proof)`.

- **Likely cause:** this is the intended
  behaviour. The
  [verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
  pins that
  `verify result from-run` refuses
  `not-run` runs by default — a dry-run
  cannot become proof.
- **Safe next step:** switch to the
  execute workflow once you trust the
  plan, then re-run.
  `verify result from-run` will produce
  a `VerificationResult` citing the
  executed run.
- **Do not:** pass `--allow-not-run` to
  `verify result from-run` in CI to
  silence the refusal. A
  `VerificationResult` built from a
  dry-run is shape-only and will confuse
  the proof-report freshness
  classifier.

### `verify result from-run` refuses the run

The execute workflow runs but the
`verify result from-run` step fails
with "VerificationRun status is not-run".

- **Likely cause:** the per-plan timeout
  fired before the first command
  started, so every command was marked
  `not-run`. Or the workflow uploaded a
  stale `VerificationRun` from a prior
  dry-run.
- **Safe next step:** raise the per-plan
  timeout via `--timeout-ms` on the
  `verify run --execute` step, or check
  `rekon artifacts list --type
  VerificationRun --root .` to see
  which run the lookup resolved.
- **Do not:** use `--allow-not-run` in
  CI (see the previous item).

### Artifacts validate failed

The job summary shows `Artifacts valid:
false`.

- **Likely cause:** the local artifact
  index references an artifact whose
  digest no longer matches the on-disk
  body, usually because some external
  process rewrote a `.rekon/artifacts/`
  file outside the runtime's write
  path.
- **Safe next step:** download the
  `rekon-artifacts` upload and run
  `node packages/cli/dist/index.js
  artifacts validate --root .` locally
  for the full issue list. Fix the
  affected artifact in your repo or
  re-run `rekon refresh` to rebuild
  the index from scratch.
- **Do not:** edit `.rekon/artifacts/`
  files by hand in CI to "fix"
  digests. The index treats hand-edits
  as integrity failures.

### Artifacts upload missing

The workflow succeeded but the
`rekon-artifacts` upload is absent or
empty.

- **Likely cause:** an earlier step
  changed the working directory, or
  the `actions/upload-artifact` step
  was scoped to a path that doesn't
  include `.rekon/artifacts/`. Less
  commonly, the runner's disk quota
  was exhausted.
- **Safe next step:** confirm the
  workflow's working directory is the
  repo root for every Rekon CLI
  invocation. The template uses `--root
  .` explicitly to make this
  unambiguous.
- **Do not:** widen the upload pattern
  to grab the whole runner filesystem.
  The path filter is deliberately
  scoped to `.rekon/artifacts/**` with
  `.log` files excluded.

### Forked PR needs secrets

A contributor's forked PR fails because
some action (e.g., a private package
registry) needs credentials the fork
cannot see.

- **Likely cause:** the workflow
  intentionally runs without secrets.
  The default `pull_request` trigger
  downgrades `GITHUB_TOKEN` to the
  fork's read-only scope.
- **Safe next step:** move the
  secret-requiring action to a
  separate, manually-approved workflow
  (`workflow_dispatch` only, or
  `push` to a protected branch). Keep
  the verification template
  permission-free so it can run
  unattended on every PR.
- **Do not:** switch the verification
  template to `pull_request_target`
  by default. That trigger runs in
  the upstream repo's context with
  secrets attached while checking out
  the contributor's code — a known
  "pwn the CI" pattern that the
  decision memo explicitly forbids.

### Workflow summary says proof is stale

The job summary's proof-report block
calls out `Verification proof is stale
relative to the latest VerificationPlan`.

- **Likely cause:** a newer
  `VerificationPlan` was generated
  after the last
  `VerificationResult` was recorded,
  so the result no longer attests the
  latest plan.
- **Safe next step:** re-run the
  execute workflow against the
  current plan. The
  `rekon artifacts latest --type
  VerificationPlan` lookup at the
  start of the workflow always picks
  up the newest plan.
- **Do not:** edit a stale
  `VerificationResult`'s plan ref by
  hand to make it look fresh. The
  proof-surface classifier reads
  `header.inputRefs`; rewriting them
  breaks the integrity audit.

### `verify run --execute` fails immediately on every command

The first command in every run fails
with `spawn npm ENOENT` (or similar).

- **Likely cause:** the runner's
  scrubbed-env policy doesn't forward
  whichever environment variable
  contains the executable. On
  Ubuntu / macOS the allowlist
  includes `PATH`; on rare runner
  images, the executable may be in
  a non-standard location.
- **Safe next step:** look at
  `VerificationRun.commands[*].stderrExcerpt`
  in the uploaded artifact for the
  exact `spawn` error. If a real env
  var is missing from the allowlist,
  raise it with the Rekon team rather
  than patching the runner locally —
  the allowlist is documented in
  `docs/strategy/verification-runner-v1-decision.md`.
- **Do not:** disable the scrubbed
  env locally to "make it work". The
  scrub exists so plan commands
  cannot exfiltrate secrets they
  happen to find in `process.env`.

### Job summary doesn't render the proof report

Either the proof-report publication
didn't write (no `VerificationPlan`
exists) or `$GITHUB_STEP_SUMMARY` was
overwritten by a later step.

- **Likely cause:** the template uses
  `if: always()` on the summary step
  so it appends even when earlier
  steps fail. If the summary is
  empty, the most common cause is
  that a custom step elsewhere in
  the workflow truncates
  `$GITHUB_STEP_SUMMARY`.
- **Safe next step:** check the
  workflow logs for any custom step
  that writes to
  `$GITHUB_STEP_SUMMARY` with `>`
  (overwrite) instead of `>>`
  (append).
- **Do not:** replace the proof-report
  body with a custom summary that
  hides failed / stale proof. The
  publication's freshness + failure
  callouts exist to be visible at
  review time.

### A reviewer reads the green badge and treats it as completion

The badge is green; the reviewer
approves without reading the proof
report.

- **Likely cause:** the badge tracks
  the local CLI's exit codes only.
  It is not the same thing as
  reviewing the artifacts.
- **Safe next step:** team norms
  should require downloading
  `rekon-artifacts` (or reading the
  inline `proof-report.md` job
  summary) before merge. The summary
  explicitly states "GitHub status
  is not canonical truth; Rekon
  artifacts remain canonical."
- **Do not:** rebrand the badge as
  "Rekon verified" or wire it into a
  required-status-check gate that
  the team interprets as a green
  light to merge without reading the
  proof report. The badge is a
  signal, not a verdict.

## Cross-references

- [Verification runner CI / GitHub adapter decision](../strategy/verification-runner-ci-github-decision.md)
- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [Verification runs concept](../concepts/verification-runs.md)
- [Verification results concept](../concepts/verification-results.md)
- [Proof report publication concept](../concepts/proof-report-publication.md)
- [Execute workflow template YAML](workflows/rekon-verification.yml)
- [Dry-run workflow template YAML](workflows/rekon-verification-dry-run.yml)
