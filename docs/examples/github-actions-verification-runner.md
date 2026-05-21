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
  [decision memo](../strategy/verification-runner-ci-github-decision.md).
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

The template includes a small Node snippet
that reads `.rekon/registry/artifacts.index.json`
to resolve the latest `VerificationPlan` id:

```yaml
- name: Resolve latest VerificationPlan id
  id: plan
  run: |
    node - <<'NODE' >> "$GITHUB_OUTPUT"
    const fs = require('node:fs');
    const path = require('node:path');
    const indexPath = path.join('.rekon', 'registry', 'artifacts.index.json');
    if (!fs.existsSync(indexPath)) {
      console.log('plan_id=');
      process.exit(0);
    }
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const plans = index
      .filter((entry) => entry.type === 'VerificationPlan')
      .sort((a, b) => String(b.id).localeCompare(String(a.id)));
    const planId = plans[0]?.id ?? '';
    console.log(`plan_id=${planId}`);
    NODE
```

This is a **template helper. A future Rekon
CLI command may replace it** with something
like:

```sh
rekon artifacts latest --type VerificationPlan --json
```

That command does **not** exist yet (the
next implementation slice in the roadmap is
the latest-artifact CLI helpers). When it
lands, the workflow can swap the Node
snippet for the one-liner.

**Other lookups you may need:**

- Latest `VerificationRun`: the template
  parses `verify-run.json` (the JSON output
  of `verify run --execute`) directly. No
  index walk required.
- Latest `Publication` (e.g., proof-report):
  identical pattern, filter on
  `entry.type === 'Publication'` and inspect
  `entry.kind` if the index carries it.
- Generating a plan inline: if your repo
  doesn't ship a `VerificationPlan` in the
  checkout, swap the lookup step for an
  `rekon intent work-order` invocation that
  produces a plan as part of the workflow.

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

**`plan_id` resolves to empty.**

Your repo doesn't have a `VerificationPlan`
yet. Either:

- Commit a plan to `.rekon/artifacts/actions/`
  (rare in alpha), or
- Run `rekon intent work-order --path <path>
  --goal "<goal>" --root .` as an extra
  workflow step before the plan-lookup
  step.

The `verify run` step in the template is
guarded by `if: steps.plan.outputs.plan_id !=
''` so missing plans don't error — they just
skip execution.

**`verify run --execute` fails immediately
on every command.**

Likely the `PATH` env var is being filtered
by the runner's scrubbed-env policy on a
platform that uses a different name. Look at
the `VerificationRun.commands[*].stderrExcerpt`
for the actual `spawn` error. If a real env
var is missing, add it to your team's
private fork of the template — but only
behind a non-default, audited workflow path
(not the safe alpha template).

**`verify result from-run` refuses the
run.**

The source `VerificationRun.status` is
`not-run`. This happens when:

- You ran `--dry-run` instead of
  `--execute`.
- The plan exceeded the per-plan timeout
  before the first command started.

Both are intentional refusals: a dry-run
is not proof. Re-run with `--execute` or
raise the per-plan timeout via
`--timeout-ms`.

**Artifact upload is empty.**

Check that the workflow's working directory
is the repo root. The `path:` filter is
relative; if the workflow `cd`s elsewhere
between `rekon refresh` and
`actions/upload-artifact`, the
`.rekon/artifacts/**` glob won't match.

**Job summary doesn't render the proof
report.**

Either the proof-report publication didn't
write (no `VerificationPlan` exists) or
`$GITHUB_STEP_SUMMARY` was overwritten by a
later step. The template uses `if: always()`
so the summary appends even when earlier
steps fail; check the workflow logs for any
custom step that touches
`$GITHUB_STEP_SUMMARY`.

**A reviewer reads the green badge and
treats it as completion.**

The summary explicitly states "GitHub status
is not canonical truth; Rekon artifacts
remain canonical." Reinforce this with team
norms: the proof report is the document
that closes a verification loop, not the
badge.

## Cross-references

- [Verification runner CI / GitHub adapter decision](../strategy/verification-runner-ci-github-decision.md)
- [Verification runner v1 decision](../strategy/verification-runner-v1-decision.md)
- [Verification runs concept](../concepts/verification-runs.md)
- [Verification results concept](../concepts/verification-results.md)
- [Proof report publication concept](../concepts/proof-report-publication.md)
- [Workflow template YAML](workflows/rekon-verification.yml)
