# Private Beta Support Playbook

**Status:** shipped.
**Audience:** private beta operators and Rekon
support reviewers.
**Scope:** how to install, run, validate, share
artifacts, and report issues while Rekon remains
no-NPM / source-checkout distributed.

## Purpose

The verification, GitHub-review, and
path-freshness tracks are now beta-private
stable. This playbook converts that posture into
a repeatable operator workflow:

- Operators install from source checkout.
- Operators run a known command matrix.
- Operators know which Rekon artifacts and CLI
  logs to attach when reporting issues.
- Operators can classify outcomes as **blockers**
  vs **acceptable first-class findings**.
- Operators rerun `rekon paths freshness` and
  `rekon refresh` after source edits before
  trusting existing artifacts.
- Operators know that **Rekon artifacts are
  canonical truth**; GitHub status / comments
  remain downstream review surfaces.

The four required private-beta posture pins are
preserved verbatim:

- *Private beta support is source-checkout
  based.*
- *Bug reports must include Rekon artifacts or
  explicit redacted substitutes.*
- *Private beta users should not install from
  npm.*
- *Path freshness should be rerun after source
  edits before trusting existing artifacts.*
- *Findings, failed verification, stale
  aggregate freshness, and GitHub readiness
  gaps are not automatically blockers.*

Required blocker statements pinned verbatim:

- **Artifact validation failure is a blocker.**
- **CLI crashes, malformed artifacts, token/log
  leaks, source mutation outside temp copies,
  or dry-run network calls are blockers.**

## Distribution Model

- **`npm install` is not supported during
  beta.** Rekon has not published its workspace
  packages to npm; pinning the no-publish
  policy from the
  [No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md).
- **Use source checkout.** Clone the
  Rekon repository to a local path the
  operator controls.
- **Build locally** with `npm ci` + `npm run
  build`. This produces `packages/cli/dist/`
  (and every other package's `dist/`).
- **Run the CLI** through `node
  packages/cli/dist/index.js <command>`. Do
  not symlink a global `rekon` binary; do not
  expect a `npx rekon` entry point.
- **No active GitHub workflow is installed
  automatically.** The workflow templates in
  `docs/examples/workflows/` are reference
  YAML; operators copy + adapt them per
  repository. The Rekon GitHub Check + PR
  comment publishers remain opt-in.

## Install From Source Checkout

```bash
# 1. Clone the repository at the beta SHA you
#    intend to operate against.
git clone https://github.com/<rekon-source> .
git checkout <beta-sha>

# 2. Install dependencies and build all
#    workspaces.
npm ci
npm run build

# 3. Smoke that the CLI built correctly.
node packages/cli/dist/index.js --help
```

The build emits `dist/` directories under each
package. The CLI entry point lives at
`packages/cli/dist/index.js`. No global install
step exists during beta.

## First Run Command Matrix

Run these against the operator's target
repository (`<repo>` below is an absolute path
to the codebase being analysed — *not* the
Rekon checkout):

```bash
npm ci
npm run build
node packages/cli/dist/index.js init --root <repo> --json
node packages/cli/dist/index.js refresh --root <repo> --json
node packages/cli/dist/index.js paths freshness --root <repo> --json
node packages/cli/dist/index.js artifacts validate --root <repo> --json
node packages/cli/dist/index.js publish architecture --root <repo> --json
node packages/cli/dist/index.js publish agent-contract --root <repo> --json
node packages/cli/dist/index.js publish proof --root <repo> --json
node packages/cli/dist/index.js publish github-check --root <repo> --dry-run --json
node packages/cli/dist/index.js publish pr-comment --root <repo> --dry-run --json
```

Expected first-run signals:

- `init` writes `.rekon/config.json` + the
  artifact-index scaffolding under
  `<repo>/.rekon/`.
- `refresh` writes the canonical artifact
  chain (`EvidenceGraph`,
  `IntelligenceSnapshot`, `ObservedRepo`,
  `FindingReport`, …).
- `paths freshness` writes one
  `PathFreshnessReport`. The **first run
  records `status: "unknown"`** because no
  baseline exists yet — this is acceptable
  (see *Path Freshness Guidance*).
- `artifacts validate` returns `valid: true`.
  Anything else is a blocker.
- The three publication commands emit
  Publication artifacts (`architecture-summary`,
  `agent-contract`, `proof-report`) plus
  rendered markdown bodies.
- The two GitHub dry-run commands print payload
  + body previews **without making any network
  call** (verify by running them with no
  `GITHUB_TOKEN` set; they print a readiness
  block listing missing env, never an HTTP
  error).

## Artifact Sharing Policy

When reporting an issue, attach (or share
through a trusted support channel) the artifact
set below. Operators should treat the
`.rekon/artifacts/` directory as the
authoritative payload — it is the canonical
proof of what the CLI observed.

Always attach `.rekon/artifacts/index.json` (the
artifact-index summary; the runtime also writes
the same data to
`.rekon/artifacts/registry/artifacts.index.json`,
either is acceptable). The index lists every
artifact the CLI produced and is required for
the support reviewer to reproduce the failure.

| Artifact | Path under `.rekon/artifacts/` |
| --- | --- |
| Artifact index | `index.json` (or `registry/artifacts.index.json`) |
| `FindingReport` | `findings/FindingReport-*.json` |
| `FindingFilterReport` | `findings/FindingFilterReport-*.json` |
| `IssueAdjudicationReport` | `findings/IssueAdjudicationReport-*.json` |
| `CoherencyDelta` | `findings/CoherencyDelta-*.json` |
| `VerificationRun` | `actions/VerificationRun-*.json` |
| `VerificationResult` | `actions/VerificationResult-*.json` |
| `PathFreshnessReport` | `actions/PathFreshnessReport-*.json` |
| `proof-report` Publication | `publications/Publication-proof-report-*.json` |
| `architecture-summary` Publication | `publications/Publication-architecture-summary-*.json` |
| `agent-contract` Publication | `publications/Publication-agent-contract-*.json` |

**Privacy warning.** Artifacts may contain repo
paths, finding text, command excerpts, and
architecture details. **Redact sensitive
business logic, customer data, secrets, tokens,
and private paths before sharing outside
trusted support channels.** See
*Privacy And Redaction Guidance* below for
practical steps.

## Bug Report Requirements

Every private-beta bug report must include the
fields enumerated in the
[Private Beta Bug Report Template](private-beta-bug-report-template.md).
Reports that omit the artifact set or the
classification will be returned for completion
before triage. A minimum-viable bug report
includes:

1. Rekon version + commit SHA (`git rev-parse
   HEAD` inside the Rekon checkout).
2. Target repository shape (size, language
   mix, monorepo structure).
3. Exact CLI commands run + their stderr.
4. Output of `rekon artifacts validate`.
5. The relevant artifacts from the *Artifact
   Sharing Policy* table.
6. Operator's blocker classification (use the
   *Blocker Taxonomy* table below).
7. Any redactions applied.

**Bug reports must include Rekon artifacts or
explicit redacted substitutes.** Screenshots of
the CLI output are not a substitute for the
underlying JSON artifacts.

## Blocker Taxonomy

The following outcomes are **blockers** and
should escalate immediately:

- `rekon refresh` crashes.
- `rekon artifacts validate` returns `valid:
  false`.
- Any artifact JSON cannot be parsed by the
  artifact-validation suite (malformed
  artifact).
- A publication command (`publish
  architecture`, `publish agent-contract`,
  `publish proof`) crashes during render.
- The CLI itself crashes on any documented
  command.
- A GitHub token, API key, or other secret
  appears in CLI stdout / stderr / artifact
  bodies (token / log leak).
- Source files outside an explicit `mktemp -d`
  copy are mutated by Rekon.
- A `--dry-run` flow makes any network call.
- A GitHub `--send` flow bypasses or ignores
  its readiness gate.
- `PathFreshnessReport` reports `status:
  "fresh"` after a known source edit (false
  fresh = stale truth → blocker).

## Acceptable First-Class Outcomes

The following outcomes are **acceptable** and
should not be reported as defects:

- Rekon surfaces findings on the operator's
  repo. Findings are first-class output, not
  defects.
- `VerificationResult` records `status:
  "failed"` because operator's `npm run
  typecheck` (or test / build) actually failed.
  The proof chain captured failure honestly.
- `rekon artifacts freshness` reports a
  historical newer-input-exists warning for an
  older snapshot (this is the documented
  latest-major pattern).
- `rekon publish github-check --dry-run` or
  `--send` reports `readiness: false` without
  the required GitHub env (the gate is
  working).
- First `rekon paths freshness` run records
  `status: "unknown"` — no baseline yet.
- The runner records `missing-script: <name>`
  for an `npm | pnpm | yarn run <script>`
  command whose script is absent from
  `package.json` (per the
  [VerificationPlan missing-script tolerance
  memo](../strategy/verification-missing-script-tolerance.md)).

These outcomes are signals, not failures. The
right next step is *inspection* (read the
artifact, decide what to fix in the operator's
own repo), not *escalation*.

## Path Freshness Guidance

- **Run `rekon paths freshness` after source
  edits.** This captures a new
  `PathFreshnessReport` and updates the
  baseline for downstream surfaces.
- **Run `rekon refresh` before trusting
  existing artifacts** when the latest
  `PathFreshnessReport` reports
  `status: "stale"`. The architecture summary,
  agent contract, proof report, GitHub Check,
  and PR comment all carry the stale warning
  but **never run `rekon refresh` on the
  operator's behalf**.
- **Artifact lineage freshness is not
  working-tree freshness.** The two surfaces
  coexist and both matter — see the
  [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)
  for the canonical pin.
- **No daemon or background refresh exists.**
  Beta is explicit-refresh-only per the
  [Watcher / Path Freshness Policy Decision](../strategy/watcher-path-freshness-policy-decision.md).

## GitHub Review Surface Guidance

- **GitHub Checks and PR comments are opt-in
  review surfaces.** The operator copies the
  reference workflow YAML from
  `docs/examples/workflows/` and adapts it per
  repository.
- **Dry-run commands make no network calls.**
  `rekon publish github-check --dry-run` and
  `rekon publish pr-comment --dry-run` both
  print the payload + readiness state without
  consulting `GITHUB_TOKEN`. Verifying this
  locally is part of the first-run command
  matrix.
- **GitHub status / comments are not canonical
  truth.** Both surfaces carry the
  canonical-truth reminder verbatim.
- **Rekon artifacts remain canonical.** When a
  GitHub Check output and a local Publication
  disagree (e.g., after the operator rebased
  but did not re-run `rekon refresh`), the
  local artifacts win.
- **Stale path freshness is a visible warning
  in both GitHub review surfaces but does not
  by itself flip the GitHub Check
  conclusion** — see the
  [path freshness safety review](../strategy/path-freshness-safety-review.md)
  for the pinned conclusion policy.

## Privacy And Redaction Guidance

- Artifacts can contain finding text, command
  argv, log digests, architecture summaries,
  and repo-relative paths. They do **not**
  contain raw file contents, GitHub tokens,
  or HTTP bodies (the runner redacts secret
  patterns + bounds log capture; the GitHub
  publishers redact non-success error
  bodies).
- Before sharing outside a trusted support
  channel:
  - Replace customer / private repo names
    with placeholders such as `<medium-monorepo>`
    or `<nextjs-app>`. The
    [real-repo cohort summary](../strategy/real-repo-cohort-summary.md)
    is a good model.
  - Strip absolute filesystem paths from
    `header.subject.repoId`. A relative repo
    name or hash is enough.
  - Inspect finding text for source
    excerpts. Rekon's finding text usually
    cites paths, not code, but operators
    should re-check before sharing.
  - If you find a token / secret in any
    artifact, **this is a blocker** — stop
    sharing, redact the token, rotate it via
    your provider, and report immediately.
- The runner already enforces three
  redaction guarantees pinned by the
  [Verification / GitHub trust-boundary
  safety review](../strategy/verification-github-trust-boundary-safety-review.md):
  bounded stdout / stderr capture; bounded
  GitHub API error-body reads; no
  `NODE_OPTIONS` echoed back. Operators
  should not need to redact captured logs
  themselves, but should still double-check.

## Support Triage Flow

```
1. Operator runs the command matrix.
2. Operator reads CLI output + the new
   PathFreshnessReport / VerificationResult /
   Publication.
3. Operator classifies the outcome:
   - acceptable -> read the artifact, decide
     what to do (no escalation).
   - blocker     -> capture artifacts + stderr
     and open a bug report using the template.
4. Operator redacts per Privacy And Redaction
   Guidance.
5. Support reviewer reproduces with the
   attached artifacts.
6. Reviewer either:
   - confirms the blocker classification +
     opens a work order, or
   - reclassifies as acceptable + closes the
     report with explanation, or
   - asks for additional artifacts (only the
     ones missing from the Artifact Sharing
     Policy table).
```

## Diagnostic Tables

### Support Classification

| Outcome | Classification | Next Step |
| --- | --- | --- |
| findings exist | acceptable | review findings in the relevant artifact |
| failed verification recorded honestly | acceptable | inspect `VerificationRun` / `VerificationResult` for command-level detail |
| `artifacts validate` invalid | blocker | attach artifact index + the failing artifact body |
| CLI crash | blocker | attach the failing command line + stderr + the latest artifacts |
| token / log leak | blocker | stop sharing, redact the secret, rotate it, report immediately |
| path freshness `stale` | acceptable warning | run `rekon refresh` then re-run `rekon paths freshness` |
| path freshness `unknown` (first run) | acceptable | establishes the baseline; re-run after the next edit |
| missing-script `skipped` | acceptable | per the missing-script tolerance memo |

### Artifact Attachment

| Artifact | Attach When |
| --- | --- |
| `PathFreshnessReport` | freshness / source-edit issues |
| `VerificationRun` | command-execution / proof issues |
| `VerificationResult` | proof-summary issues |
| `FindingFilterReport` | filtering / false-positive issues |
| `IssueAdjudicationReport` | grouping / merge issue |
| `Publication` (proof / arch / agent) | rendering / operator-surface issue |
| Artifact index (`index.json`) | every report — supports artifact-validate audit |

### Command Matrix

| Step | Command |
| --- | --- |
| build | `npm ci && npm run build` |
| refresh | `node packages/cli/dist/index.js refresh --root <repo> --json` |
| validate | `node packages/cli/dist/index.js artifacts validate --root <repo> --json` |
| path freshness | `node packages/cli/dist/index.js paths freshness --root <repo> --json` |
| publish (architecture) | `node packages/cli/dist/index.js publish architecture --root <repo> --json` |
| publish (agent contract) | `node packages/cli/dist/index.js publish agent-contract --root <repo> --json` |
| publish (proof report) | `node packages/cli/dist/index.js publish proof --root <repo> --json` |
| GitHub check dry-run | `node packages/cli/dist/index.js publish github-check --root <repo> --dry-run --json` |
| PR comment dry-run | `node packages/cli/dist/index.js publish pr-comment --root <repo> --dry-run --json` |

## What This Does Not Do

This playbook **does not**:

- Authorise `npm publish` for any workspace
  package. The no-NPM beta posture is
  unchanged.
- Add any runtime behaviour. There is no new
  CLI command, no new validator profile, no
  new artifact type, no new permission, no
  workflow template change, no GitHub API
  call.
- Bump any version number. Rekon remains at
  `0.1.0-beta.0`.
- Create a git tag or GitHub Release.
- Install any active workflow YAML in this
  repository. Workflow templates remain
  reference-only.
- Promise operator-side install convenience
  beyond what the source checkout provides.
- Replace the canonical artifact set with
  GitHub status / comments. Rekon artifacts
  remain canonical truth.
- Define a public-beta or general-availability
  process. Those decisions remain post-beta
  and require their own work orders.

## Follow-Up Work

**Shipped:** the
[Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md)
distills this playbook into a concise "start
here" path (install from source checkout, run
the first scan, inspect the canonical outputs,
report issues, re-run path freshness after
edits). When the quickstart and this playbook
conflict, the playbook wins.

The first onboarding validation run has
**shipped** with outcome
`pass-with-known-limitations`. See
[Private Beta Onboarding Validation Report](private-beta-onboarding-validation-report.md)
for the canonical record and
[Private Beta Onboarding Validation Intake
Request](private-beta-onboarding-validation-intake-request.md)
for the prior intake-blocked posture
(preserved as historical record). Two
minor documentation refinements surfaced
in the validation; the recommended next
slice is **private beta onboarding
quickstart refinements (v2)** which lands
those refinements as a focused docs
batch.

Other follow-ups that remain post-beta:

- A no-NPM-policy revision work order, only
  after explicit operator decision per the
  [No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md).
- A public-beta / general-availability process
  memo, contingent on private-beta evidence.
- Optional CI / IDE integrations beyond the
  reference workflow templates.

## Cross-References

- [Private Beta Onboarding Quickstart](private-beta-onboarding-quickstart.md)
- [Private Beta Onboarding Validation Intake Request](private-beta-onboarding-validation-intake-request.md)
- [Private Beta Bug Report Template](private-beta-bug-report-template.md)
- [No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md)
- [Real-Repo Beta Dogfood Report](../strategy/real-repo-beta-dogfood-report.md)
- [Real-Repo Cohort Summary](../strategy/real-repo-cohort-summary.md)
- [Post-Beta Dogfood Evidence Triage Decision](../strategy/post-beta-dogfood-evidence-triage.md)
- [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)
- [Watcher / Path Freshness Policy Decision](../strategy/watcher-path-freshness-policy-decision.md)
- [Verification / GitHub trust-boundary safety review](../strategy/verification-github-trust-boundary-safety-review.md)
- [PathFreshnessReport artifact](../artifacts/path-freshness-report.md)
- [VerificationPlan missing-script tolerance memo](../strategy/verification-missing-script-tolerance.md)
- [GitHub Actions verification runner operator guide](../examples/github-actions-verification-runner.md)

## Status

Shipped on 2026-05-27. No version bump. No npm
publish. No runtime behaviour change. No new
workflow YAML. Rollback is trivial: revert this
playbook + the supporting doc cross-links.
