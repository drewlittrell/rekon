# Private Beta Onboarding Quickstart

**Status:** shipped.
**Audience:** new private beta operators.
**Scope:** a concise "start here" path. Install
Rekon from source, build it, run the first scan
against a target repo, inspect the canonical
outputs, run path freshness, and learn how to
report issues with the right artifacts.

> The full operator process lives in the
> [Private Beta Support Playbook](private-beta-support-playbook.md).
> This quickstart is a smaller distillation of
> the same posture. If anything in this
> quickstart conflicts with the playbook, the
> **playbook wins**.

## Who This Is For

- Operators in the no-NPM private beta who need
  to run Rekon against a real codebase for the
  first time.
- Reviewers triaging private-beta bug reports
  who want to reproduce a report against a
  clean checkout.
- Anyone evaluating Rekon's beta posture before
  authorising broader use.

If you are not a private-beta operator, this
quickstart still works as a read-only tour, but
the actual install flow assumes operator
access to a Rekon source checkout.

## What Private Beta Means

- **Private beta users should not install Rekon
  from npm.** No Rekon package is published to
  npm during private beta.
- **Private beta is source-checkout based.**
  Clone the Rekon repository to a local path
  you control and build it locally.
- **Rekon artifacts are canonical; GitHub
  Checks and PR comments are downstream
  review surfaces.** The local `.rekon/`
  directory is the source of truth; GitHub
  surfaces echo it but never replace it.
- **No source-write apply and no watcher
  daemon are available during private beta.**
  Refresh is operator-triggered; source files
  are read-only from Rekon's perspective.

These pins come from the
[No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md),
the
[Watcher / Path Freshness Policy Decision](../strategy/watcher-path-freshness-policy-decision.md),
and the
[Source-Write Reconciliation Policy Decision](../strategy/source-write-reconciliation-policy-decision.md).

## Install From Source Checkout

```bash
git clone <rekon-repo-url>
cd rekon
npm ci
npm run build
```

During private beta, run the CLI through:

```bash
node packages/cli/dist/index.js
```

Do **not** run any of these — they are
**explicitly unsupported during beta**:

```bash
# UNSUPPORTED:
npm install @rekon/cli
npm install -g @rekon/cli
npx @rekon/cli
```

Rekon's workspace packages have not been
published to npm during beta. Source checkout
is the only supported install path.

## Build Rekon

`npm ci` + `npm run build` from the previous
section emit `dist/` directories under each
workspace package. The CLI entry point lives
at `packages/cli/dist/index.js`. Confirm the
build succeeded:

```bash
node packages/cli/dist/index.js --help
```

## Pick A Target Repository

Run first scans against a **temp copy** so
neither Rekon artifacts nor any target-side
build/test output pollutes the committed
repository:

```bash
TARGET_SRC="/path/to/your/repo"
TMP_REKON_TARGET="$(mktemp -d)"
git clone --local --no-hardlinks "$TARGET_SRC" "$TMP_REKON_TARGET/repo"
TARGET_ROOT="$TMP_REKON_TARGET/repo"
```

If the source is not a git repo (or you cannot
clone-local from it), use `rsync` as a
fallback:

```bash
rsync -a --exclude node_modules --exclude dist --exclude .next --exclude .rekon \
  "$TARGET_SRC/" "$TMP_REKON_TARGET/repo/"
TARGET_ROOT="$TMP_REKON_TARGET/repo"
```

**Run first scans against a temp copy so Rekon
artifacts and any target-side build / test
artifacts do not pollute the committed repo.**

## Run Your First Scan

Export the absolute CLI path once so the rest of
the quickstart is copy-pasteable:

```bash
CLI="$(pwd)/packages/cli/dist/index.js"

node "$CLI" init --root "$TARGET_ROOT" --json
node "$CLI" refresh --root "$TARGET_ROOT" --json
node "$CLI" paths freshness --root "$TARGET_ROOT" --json
node "$CLI" artifacts validate --root "$TARGET_ROOT" --json
```

Then walk the findings + governance chain:

```bash
node "$CLI" findings list --root "$TARGET_ROOT" --json
node "$CLI" findings filter-health --root "$TARGET_ROOT" --json
node "$CLI" issues adjudicate --root "$TARGET_ROOT" --json
node "$CLI" issues list --root "$TARGET_ROOT" --json
node "$CLI" coherency delta --root "$TARGET_ROOT" --json
```

Expected first-run signals:

- `init` writes `.rekon/config.json` + the
  artifact-index scaffolding under
  `$TARGET_ROOT/.rekon/`.
- `refresh` writes the canonical artifact
  chain (`EvidenceGraph`,
  `IntelligenceSnapshot`, `ObservedRepo`,
  `FindingReport`, …).
- `paths freshness` records `status:
  "unknown"` on the first run (no baseline
  yet) — see *Run Path Freshness* below.
- `artifacts validate` returns `valid: true`.
  Anything else is a blocker.

## Inspect The Main Outputs

```bash
node "$CLI" publish architecture --root "$TARGET_ROOT" --json
node "$CLI" publish agent-contract --root "$TARGET_ROOT" --json
node "$CLI" publish proof --root "$TARGET_ROOT" --json
```

What each publication answers:

- **Architecture summary** — repo / system view.
  Includes owner systems, capabilities,
  findings, proof loop, working-tree path
  freshness, and verification proof status.
- **Agent contract** — operating instructions
  for agents. Includes the canonical
  `## Do Not Do` list, working-tree freshness
  warnings, and an explicit refresh-after-edits
  reminder.
- **Proof report** — verification / proof
  context. Includes the verification plan,
  result, run, and the working-tree path
  freshness section.

Each publication is rendered into its
`Publication` artifact's `content` field
(`.rekon/artifacts/publications/`).

## Run Path Freshness

```bash
node "$CLI" paths freshness --root "$TARGET_ROOT" --json
node "$CLI" paths freshness --root "$TARGET_ROOT" --json
```

What to expect:

- **First run may be `unknown` because no
  baseline exists** for this target. The
  command writes the first `PathFreshnessReport`
  and that report becomes the baseline for the
  next run.
- **Second unchanged run should be `fresh`.**
  Same source → same content hashes → matches
  baseline.
- **After source edits, `stale` means run
  `rekon refresh` before trusting generated
  artifacts.** The publications + GitHub
  review surfaces all carry the stale warning
  but never trigger refresh on your behalf.

**Artifact lineage freshness is not
working-tree freshness.** The two surfaces
coexist. The architecture summary's
`## Input Freshness Warnings` block covers
lineage; the `## Working Tree Path Freshness`
block covers source state. Both can be `fresh`
while the other is `stale`.

See the
[Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)
for the canonical reference.

## Optional Verification Flow

If you want to capture proof against the
target repo, run the verification chain:

```bash
node "$CLI" intent work-order \
  --root "$TARGET_ROOT" \
  --path <representative-path> \
  --goal "private beta validation" \
  --json

PLAN_REF="$(node "$CLI" artifacts latest --root "$TARGET_ROOT" --type VerificationPlan --id-only)"

node "$CLI" verify run --root "$TARGET_ROOT" --plan "$PLAN_REF" --dry-run --json
node "$CLI" verify run --root "$TARGET_ROOT" --plan "$PLAN_REF" --execute --json || true

RUN_REF="$(node "$CLI" artifacts latest --root "$TARGET_ROOT" --type VerificationRun --id-only)"

node "$CLI" verify result from-run --root "$TARGET_ROOT" --run "$RUN_REF" --json || true
```

Trailing `|| true` on the execute + result
commands keeps the shell going when the
operator's `npm run typecheck` / `test` /
`build` legitimately fails — the proof chain
captures the failure honestly.

**Failed verification is not automatically a
Rekon blocker if `VerificationRun` /
`VerificationResult` record the failure
honestly.** The runner writes the failed
status, the result derives correctly, and
proof report renders the failed proof
summary. That is the proof chain working as
designed.

**Missing package scripts may be recorded as
`skipped`.** The runner pre-flights
`npm | pnpm | yarn run <script>` commands
against `package.json`; absent scripts record
`skipped` (with a `missing-script:<name>`
note) rather than `failed`. See the
[VerificationPlan missing-script tolerance
memo](../strategy/verification-missing-script-tolerance.md).

## Optional GitHub Review Dry-Runs

```bash
node "$CLI" publish github-check --root "$TARGET_ROOT" --dry-run --json
node "$CLI" publish pr-comment --root "$TARGET_ROOT" --dry-run --json
```

**Dry-run commands make no network calls.**
They read the local artifact store, render the
payload + body, print the result, and exit.
You can verify by running them with no
`GITHUB_TOKEN` set — they print a readiness
block listing the missing env, never an HTTP
error.

**GitHub status and comments are not canonical
truth; Rekon artifacts remain canonical.**
Both surfaces carry the canonical-truth
reminder verbatim. Use the GitHub surfaces to
*review* state; use the local artifact store
to *establish* state.

## Understand First-Class Outcomes

These outcomes are **expected** — not Rekon
defects. Reading the relevant artifact and
deciding what to do in your own repo is the
right next step, not a bug report.

| Outcome | Meaning |
| --- | --- |
| findings exist | expected; review findings |
| verification failed | acceptable if recorded honestly |
| missing script skipped | acceptable; command classified as skipped |
| `PathFreshnessReport` first run unknown | expected baseline behavior |
| `artifacts freshness` aggregate stale | often a historical lineage signal; inspect details |
| GitHub dry-run readiness false | expected without GitHub env |

The fuller taxonomy lives in the
[Private Beta Support Playbook](private-beta-support-playbook.md)'s
*Acceptable First-Class Outcomes* + *Support
Classification* sections.

## Report A Blocker

Use the
[Private Beta Bug Report Template](private-beta-bug-report-template.md)
to file private-beta bug reports. Every
report must include:

- The exact command(s) you ran.
- Relevant stdout / stderr excerpts.
- The output of `node "$CLI" artifacts
  validate --root "$TARGET_ROOT" --json`.
- The latest `PathFreshnessReport`.
- Relevant artifact refs (`type:id`) from
  `.rekon/artifacts/`.
- An explicit list of redactions you applied
  (see *Privacy And Redaction*).

Blockers (the playbook lists 10 classes — the
most common are below):

- `artifacts validate` reports `valid: false`
  (invalid index).
- CLI crashes on any documented command.
- An artifact is malformed (cannot be parsed
  by `artifacts validate`).
- A `publish architecture` / `publish
  agent-contract` / `publish proof` command
  fails at render time.
- A token / API key / secret appears in CLI
  stdout / stderr / artifact bodies (token /
  log leak).
- Rekon mutates a source file outside an
  explicit `mktemp -d` copy.
- A `--dry-run` flow makes a network call.

If you see any of these, **stop sharing the
artefact, redact the secret if any, and open
a report**.

## Privacy And Redaction

**Rekon artifacts may contain repo paths,
architecture details, finding text, command
excerpts, and proof summaries.** They do not
contain raw source-file contents, GitHub
tokens, or HTTP bodies — but they may surface
patterns that effectively reveal proprietary
business logic.

**Redact secrets, tokens, customer data,
sensitive private paths, and proprietary
business logic before sharing outside trusted
support channels.** Practical steps:

- Replace customer / private repo names with
  placeholders (e.g., `<medium-monorepo>`).
- Strip absolute filesystem paths from
  `header.subject.repoId` before sharing.
- Review finding text under `findings[].message`
  for sensitive identifiers.
- If you find a secret in any artefact body,
  **this is a blocker**: stop sharing,
  rotate the secret, and report through a
  trusted support channel only.

See the playbook's *Privacy And Redaction
Guidance* section for the canonical version.

## Diagnostic Tables

### First-Run Command Table

| Step | Command |
| --- | --- |
| build Rekon | `npm ci && npm run build` |
| init | `node "$CLI" init --root "$TARGET_ROOT" --json` |
| refresh | `node "$CLI" refresh --root "$TARGET_ROOT" --json` |
| validate | `node "$CLI" artifacts validate --root "$TARGET_ROOT" --json` |
| path freshness | `node "$CLI" paths freshness --root "$TARGET_ROOT" --json` |

### Output Table

| Output | Purpose |
| --- | --- |
| Architecture summary | repo/system view |
| Agent contract | operating instructions for agents |
| Proof report | verification/proof context |
| PathFreshnessReport | working-tree freshness |
| FindingReport / FindingFilterReport | findings and filtering |

### Blocker Table

| Blocker | What To Attach |
| --- | --- |
| `artifacts validate` invalid | index + failing artifact |
| CLI crash | command + stderr + artifacts |
| token / log leak | redacted artifact + exact command (rotate the secret first) |
| publication render failure | publication artifact + input refs |

## What This Does Not Do

This quickstart **does not**:

- Authorise `npm install` of any Rekon
  workspace package.
- Authorise `npm publish` from this
  repository. The no-NPM beta posture is
  unchanged.
- Add any runtime behaviour. No new CLI
  command, no new validator profile, no new
  artifact type, no new permission, no
  workflow template change, no GitHub API
  call.
- Bump any version number. Rekon remains at
  `0.1.0-beta.0`.
- Create a git tag or GitHub Release.
- Install any active workflow YAML in this
  repository. Workflow templates remain
  reference-only.
- Replace the canonical artifact set with
  GitHub status / comments.
- Open a watcher daemon or any background
  refresh.
- Define a public-beta or general-availability
  process.

## Next Steps

Recommended next slice (per the work order's
next-step guidance): **Private beta
onboarding validation run** — have an
operator follow this quickstart against one
non-Rekon repo and record any gaps:

- confusing commands
- missing docs
- unclear outputs
- support-template gaps
- artifact-sharing risks

Other places to go from here, in order of
typical need:

- [Private Beta Support Playbook](private-beta-support-playbook.md)
  — the canonical reference; covers blocker
  taxonomy, acceptable outcomes, full
  redaction guidance.
- [Private Beta Bug Report Template](private-beta-bug-report-template.md)
  — copy this when reporting an issue.
- [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)
  — pins the working-tree-freshness contract.
- [No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md)
  — pins the no-publish posture.
- [GitHub Actions verification runner operator
  guide](../examples/github-actions-verification-runner.md)
  — pickup point if you want to wire Rekon
  into a CI workflow (still operator-driven;
  no automatic install).
- [VerificationPlan Missing-Script Tolerance
  Memo](../strategy/verification-missing-script-tolerance.md)
  — pins the `skipped` semantics for absent
  package-manager scripts.

## Status

Shipped on 2026-05-28. No version bump. No npm
publish. No runtime behaviour change. No new
workflow YAML. Rollback is trivial: revert
this quickstart + the supporting doc
cross-links.
