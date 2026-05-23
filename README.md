# Rekon

Rekon is an open-source intelligence substrate for codebases: evidence in,
typed artifacts out, extensible capabilities around a shared repository
intelligence snapshot.

Rekon is for codebase intelligence, repository intelligence,
architecture-aware agent context, and governance for AI-assisted software work.

## What Rekon Is

Rekon is a local-first alpha substrate that observes a repository, writes typed
artifacts under `.rekon/`, indexes those artifacts in an `IntelligenceSnapshot`,
and lets capabilities project, evaluate, resolve, publish, learn, and act
around that shared snapshot.

Naming is part of the public contract: product `Rekon`, CLI `rekon`, workspace
`.rekon/`, environment prefix `REKON_`, and packages `@rekon/*`.

The current alpha includes:

- kernel packages for artifact, evidence, snapshot, graph, rulebook, findings,
  and repository model contracts
- a public SDK for authoring built-in and community capabilities
- a local runtime and CLI
- built-in JS/TS observation, model projection, graph projection, policy,
  resolver, docs, memory, intent, and reconciliation capabilities
- an explainable `resolve.preflight` packet with `resolutionTrace`
- a TODO custom capability example

## What Rekon Is Not

Rekon is not a SaaS product, dashboard, marketplace, watcher, or auto-fixer in
this alpha. It does not write source files by default. It does not import from
the old `codebase-intel-classic` reference implementation. It does not treat
published docs or memory as canonical architecture truth.

## Why The Substrate Exists

Agents and humans need durable codebase context that can be inspected, tested,
and extended. Rekon makes that context explicit:

- evidence facts keep provenance
- derived artifacts point back to inputs
- capabilities declare what they consume, produce, and require
- resolver packets explain where answers came from
- reconciliation is permissioned and artifact-first

## Lifecycle

The implemented alpha lifecycle is:

`Observe -> Project -> Snapshot -> Evaluate -> Resolve -> Publish -> Learn -> Act`

- `observe`: produce an `EvidenceGraph`
- `project`: produce `ObservedRepo`, `OwnershipMap`, `CapabilityMap`, and
  `GraphSlice` artifacts
- `snapshot`: index artifacts in an `IntelligenceSnapshot`
- `evaluate`: produce a `FindingReport`
- `resolve`: produce an explainable `ResolverPacket`
- `publish`: produce generated `Publication` artifacts
- `learn`: record feedback and select applicable memory
- `act`: produce work orders and safe reconciliation logs

## First 10 Minutes

```sh
npm install
npm run build

node packages/cli/dist/index.js init --root examples/simple-js-ts
node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json
node packages/cli/dist/index.js resolve preflight --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
node packages/cli/dist/index.js publish agents --root examples/simple-js-ts
```

`rekon refresh` runs the full lifecycle (observe → project → snapshot →
evaluate → findings filter → findings filter-health → findings lifecycle → issues adjudicate → coherency delta →
publish architecture → artifacts validate → artifacts freshness) in one
step. Use the
individual verbs (`rekon observe`, `rekon project`, ...) when you need
to drive a single phase. See [docs/concepts/refresh.md](docs/concepts/refresh.md).

Then inspect the workspace:

```sh
node packages/cli/dist/index.js artifacts list --root examples/simple-js-ts --json
```

Full walkthrough: [docs/getting-started/first-10-minutes.md](docs/getting-started/first-10-minutes.md)

## CLI Commands

From a source checkout, use `node packages/cli/dist/index.js`. When installed
as a package, the binary name is `rekon`.

```sh
node packages/cli/dist/index.js init --root examples/simple-js-ts
node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json
node packages/cli/dist/index.js config validate --root examples/simple-js-ts --json
node packages/cli/dist/index.js capabilities list --root examples/simple-js-ts --json
node packages/cli/dist/index.js capabilities inspect @rekon/capability-resolver --root examples/simple-js-ts --json
node packages/cli/dist/index.js observe --root examples/simple-js-ts --json
node packages/cli/dist/index.js project --root examples/simple-js-ts --json
node packages/cli/dist/index.js evaluate --root examples/simple-js-ts --json
node packages/cli/dist/index.js evaluate list --root examples/simple-js-ts --json
node packages/cli/dist/index.js evaluate run @rekon/capability-policy.evaluator --root examples/simple-js-ts --json
node packages/cli/dist/index.js snapshot --root examples/simple-js-ts --json
node packages/cli/dist/index.js resolve preflight --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
node packages/cli/dist/index.js resolve route --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
node packages/cli/dist/index.js resolve seam --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
node packages/cli/dist/index.js resolve issue --root examples/simple-js-ts --issue no-such-issue --json
node packages/cli/dist/index.js resolve list --root examples/simple-js-ts --json
node packages/cli/dist/index.js resolve run resolve.preflight --root examples/simple-js-ts --input-json '{"path":"src/index.ts","goal":"modify bootstrap"}' --json
node packages/cli/dist/index.js publish list --root examples/simple-js-ts --json
node packages/cli/dist/index.js publish agents --root examples/simple-js-ts
node packages/cli/dist/index.js publish run @rekon/capability-docs.publisher --root examples/simple-js-ts --json
node packages/cli/dist/index.js memory add --root examples/simple-js-ts --instruction "Preserve bootstrap behavior." --path src --system src --priority high --verified --reliability 0.9 --rationale "Repeated operator correction." --json
node packages/cli/dist/index.js memory list --root examples/simple-js-ts --json
node packages/cli/dist/index.js memory select --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
node packages/cli/dist/index.js memory usage record <memory-entry-id> --root examples/simple-js-ts --outcome helpful --note "Helped scope the change." --json
node packages/cli/dist/index.js memory usage list --root examples/simple-js-ts --json
node packages/cli/dist/index.js memory curation --root examples/simple-js-ts --json
node packages/cli/dist/index.js intent work-order --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
node packages/cli/dist/index.js intent remediation --root examples/simple-js-ts --json
node packages/cli/dist/index.js intent remediation --root examples/simple-js-ts --skip-verified --json
node packages/cli/dist/index.js reconcile --root examples/simple-js-ts --operation docs_regeneration
node packages/cli/dist/index.js reconcile suggest --root examples/simple-js-ts --json
node packages/cli/dist/index.js verify record --root examples/simple-js-ts --result-json '{"recordedBy":"operator","commands":[{"command":"npm run typecheck","status":"passed","exitCode":0}]}' --json
# `rekon verify run --plan <id> --dry-run` previews the runner's plan.
# It validates each command's argv against the safety contract and writes a
# planned-but-not-run VerificationRun artifact. It never spawns a process.
node packages/cli/dist/index.js verify run --plan <verification-plan-id> --dry-run --root examples/simple-js-ts --json
# `rekon verify run --plan <id> --execute` actually runs the plan locally.
# Uses spawn with shell:false, a scrubbed env, per-command + per-plan timeouts,
# bounded redacted log excerpts, and sha256 stream digests. Writes a
# VerificationRun artifact with execution detail. Does NOT write a
# VerificationResult directly and does NOT auto-resolve findings. CLI exits
# non-zero on failed/timeout/killed.
node packages/cli/dist/index.js verify run --plan <verification-plan-id> --execute --root examples/simple-js-ts --json
# `rekon verify result from-run --run <id>` derives a concise VerificationResult
# proof summary from a completed VerificationRun. Maps timeout/killed to
# failed; carries digests but not redacted excerpts; refuses dry-run runs by
# default; never auto-resolves findings.
node packages/cli/dist/index.js verify result from-run --run <verification-run-id> --root examples/simple-js-ts --json
# Proof publications now distinguish manual vs runner-derived
# VerificationResult, surface freshness against the latest
# VerificationPlan, and never render raw stdout/stderr excerpts. See
# docs/concepts/proof-report-publication.md, docs/concepts/architecture-summary-publication.md,
# and docs/concepts/agent-operating-contract.md.
# CI direction: alpha stays local-first. The documented GitHub
# Actions workflow template lives at
# docs/examples/workflows/rekon-verification.yml with operator
# documentation at docs/examples/github-actions-verification-runner.md.
# It uses `permissions: contents: read` only, no `pull_request_target`,
# and no GitHub API writes. The template uses the read-only
# `rekon artifacts latest --type <type> [--kind <kind>] [--id-only]
# [--allow-missing]` helper for latest-artifact id resolution.
# First-party GitHub Check / PR comment publishers are deferred to
# beta. See docs/strategy/verification-runner-ci-github-decision.md.
node packages/cli/dist/index.js artifacts latest --root examples/simple-js-ts --type VerificationPlan --id-only --allow-missing
# Two GitHub Actions workflow templates live under
# docs/examples/workflows/. Copy the dry-run variant
# (rekon-verification-dry-run.yml) first when adopting Rekon in CI;
# it writes a planned-but-not-run VerificationRun and spawns no
# commands. Swap to the execute variant (rekon-verification.yml)
# after reviewing the plan's commands. See
# docs/examples/github-actions-verification-runner.md.
#
# After copying a template, validate the safety contract with the
# read-only `rekon verify github-workflow validate --path
# <path-to.yml>` command (no GitHub API calls, no spawn / exec, no
# YAML parser dependency — pure static text analysis). It enforces:
# no `pull_request_target`; no GitHub write permissions;
# `permissions: contents: read`; no GitHub API calls; uses
# `rekon artifacts latest`; uploads `.rekon/artifacts/**` excluding
# `.log`; appends to `$GITHUB_STEP_SUMMARY`; mode resolvable to
# `execute` or `dry-run`. Exits 0 on valid, 1 on invalid; never
# mutates the workflow file.
node packages/cli/dist/index.js verify github-workflow validate --path docs/examples/workflows/rekon-verification.yml
node packages/cli/dist/index.js verify github-workflow validate --path docs/examples/workflows/rekon-verification-dry-run.yml --json
# The first GitHub-write surface (a GitHub Check publisher) ships
# its decision memo + a gated skeleton in
# docs/strategy/verification-runner-github-check-publisher-decision.md.
# The skeleton — `buildGitHubCheckPayload` and
# `assessGitHubCheckPublisherReadiness` exported from
# `@rekon/capability-docs` — calls no GitHub API and imports no
# network client. Forked PRs are untrusted by default, and
# `pull_request_target` is refused unconditionally.
#
# A local dry-run CLI lives at `rekon publish github-check
# --dry-run [--root <path>] [--json]`. It reads the latest local
# Rekon artifacts (VerificationResult, VerificationRun, proof
# report, architecture summary, agent contract), calls the shared
# helpers, and prints
# `{ kind, dryRun, payload, readiness, canonicalTruthReminder }`
# as JSON. The dry-run branch never reads `GITHUB_TOKEN` or
# `GH_TOKEN` and never calls GitHub.
node packages/cli/dist/index.js publish github-check --dry-run --root examples/simple-js-ts --json
# A gated send CLI lives at `rekon publish github-check --send
# [--root <path>] [--confirm-checks-write] [--api-base-url <url>]
# [--json]`. This is the FIRST GitHub-write surface in Rekon.
# It is default-deny: readiness must pass
# (REKON_GITHUB_CHECKS=1, GITHUB_TOKEN, GITHUB_REPOSITORY,
# GITHUB_SHA, trusted event, explicit --confirm-checks-write OR
# REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1). Forked PRs are denied
# by default; pull_request_target is denied unconditionally.
# The token never appears in error messages. See
# docs/strategy/verification-runner-github-check-publisher-decision.md
# for the full safety contract.
#
# A beta-tier opt-in workflow template at
# docs/examples/workflows/rekon-verification-check-send.yml
# wires the send command into a copyable GitHub Actions
# workflow. It requests permissions: contents: read +
# checks: write only; triggers on workflow_dispatch + push to
# main; sets REKON_GITHUB_CHECKS=1 +
# REKON_GITHUB_CHECKS_WRITE_CONFIRMED=1 at the workflow level;
# runs --dry-run before --send; never installs as an active
# workflow in this repo. Validate it with the new
# --profile github-check-send flag:
node packages/cli/dist/index.js verify github-workflow validate \
  --path docs/examples/workflows/rekon-verification-check-send.yml \
  --profile github-check-send --json
# The full GitHub Check publishing path has a recorded safety
# review at
# docs/strategy/github-check-publisher-send-workflow-safety-review.md.
# Decision: beta-ready as an opt-in surface; read-only templates
# remain the recommended alpha default.
#
# The next downstream surface — a PR comment publisher — is
# decided in
# docs/strategy/pr-comment-publisher-decision.md. Decision:
# Option B — design a PR comment dry-run renderer; defer actual
# PR comment posting. Creating / updating PR timeline comments
# would require issues: write or pull-requests: write; forked PRs
# do not receive write tokens by default. If implemented later,
# PR comments must be opt-in, same-repo / trusted-context only,
# update-in-place (via the <!-- rekon:pr-comment:v1 --> marker),
# and clearly marked as a downstream surface over Rekon artifacts.
#
# The dry-run renderer + readiness assessor + CLI are shipped.
# Preview the comment body locally — no GitHub API call, no token
# read, no comment posted:
node packages/cli/dist/index.js publish pr-comment --root examples/simple-js-ts --dry-run --json
#
# The PR Comment Publisher API Decision Gate at
# docs/strategy/pr-comment-publisher-api-decision-gate.md reviews
# the shipped dry-run components and decides whether to ship the
# API writer next. Decision: Option C — add a workflow / validator
# profile gate first (next slice), then re-evaluate the API writer.
# Actual PR comment posting remains deferred until that profile
# exists.
#
# Step 7d shipped the PR comment workflow / validator profile.
# Validate the new opt-in PR comment template with the
# github-pr-comment-send profile:
node packages/cli/dist/index.js verify github-workflow validate \
  --path docs/examples/workflows/rekon-pr-comment-send.yml \
  --profile github-pr-comment-send --json
# The template requests permissions: contents: read +
# pull-requests: write only; triggers on workflow_dispatch only
# (no pull_request, no pull_request_target); declares the Rekon
# opt-in env; runs publish pr-comment --dry-run (no --send). The
# validator rejects publish pr-comment --send because the API
# writer is not implemented yet.
#
# Step 7e shipped the PR Comment API Writer Go/No-Go Review at
# docs/strategy/pr-comment-api-writer-go-no-go-review.md.
# Decision: Go — adopt Option B.
#
# Step 7f shipped the writer. publishPrCommentRun helper in
# @rekon/capability-docs + rekon publish pr-comment --send CLI
# mode. Uses GitHub's issue-comments API:
#   GET   /repos/{owner}/{repo}/issues/{n}/comments?per_page=100&page=N
#   POST  /repos/{owner}/{repo}/issues/{n}/comments
#   PATCH /repos/{owner}/{repo}/issues/comments/{id}
# List → filter by <!-- rekon:pr-comment:v1 --> marker → PATCH
# on match / POST on miss. Bounded 20-page walk. Built-in fetch,
# no third-party network client. Sanitized errors
# ({ status, message, documentationUrl }); token never echoed.
# Sentinel-token contract test pins no-token-leak.
node packages/cli/dist/index.js publish pr-comment --root . --send \
  --pr-number "$PR_NUMBER" --confirm-pr-comment-write --json
# Requires GITHUB_TOKEN + GITHUB_REPOSITORY + REKON_PR_COMMENTS=1
# + REKON_PR_COMMENTS_WRITE_CONFIRMED=1 + trusted event +
# explicit --confirm-pr-comment-write (or
# REKON_PR_COMMENTS_WRITE_CONFIRMED=1). Exit 0 on API success
# regardless of proof status; exit 1 on readiness fail or API
# error.
#
# PR comments are not canonical truth; Rekon artifacts remain
# canonical. The idempotency marker is not proof; it is only an
# update-in-place handle. Forked PRs remain denied by default;
# pull_request_target remains denied unconditionally. The writer
# never deletes reviewer-touched comments.
#
# Step 7g shipped the PR Comment Publisher Safety Review at
# docs/strategy/pr-comment-publisher-safety-review.md.
# Decision: beta-ready as an opt-in, trusted-context-only,
# update-in-place review surface. GitHub Checks remain the
# primary status surface; PR comments are a narrative companion
# surface. No automatic finding resolution or reconciliation
# apply is implied by a successful PR comment publish.
#
# Step 8 shipped the GitHub Review Surfaces Parity Review at
# docs/strategy/github-review-surfaces-parity-review.md. The
# combined GitHub review surface (read-only workflow templates
# + opt-in Check + PR comment workflow templates + three
# validator profiles + both publishers + publications +
# uploaded .rekon/artifacts + job summary + canonical-artifact
# boundary + fork/token/permission safety) is beta-complete as
# an opt-in surface. Read-only templates remain the alpha
# default. No additional GitHub API surface is needed before
# beta. The next slice is the Verification / GitHub
# Trust-Boundary Hardening batch.
#
# GitHub status and comments are not canonical truth; Rekon
# artifacts remain canonical. A successful GitHub Check or PR
# comment publish does not imply findings are resolved or
# reconciliation has been applied. Forked PRs and
# pull_request_target remain blocked by default. Read-only
# workflows remain the recommended starting point for
# adoption.
#
# Step 9 shipped the Verification / GitHub Trust-Boundary
# Hardening batch. Six fixes (see CHANGELOG):
#   1. Coherent GitHub Check proof-chain selection (Check
#      payloads use the VerificationRun cited by the
#      VerificationResult, not the unrelated latest run).
#   2. Bounded stdout/stderr streaming capture (incremental
#      sha256 + bounded excerpt buffer; large streams cannot
#      exhaust memory before truncation).
#   3. POSIX process-tree timeout kill (descendants no longer
#      outlive the runner on timeout; Windows direct-child-only
#      documented).
#   4. NODE_OPTIONS removed from the runner env allowlist.
#   5. Bounded GitHub API error-body reads (both publishers).
#   6. PR head SHA safety: pull_request events require an
#      explicit --head-sha (or GITHUB_HEAD_SHA); GITHUB_SHA on
#      pull_request is the merge commit, not the PR head.
#
# `publish github-check --send` now accepts --head-sha <sha>
# and emits proofChainWarnings when the cited VerificationRun
# is missing from the local store.
#
# Step 10 shipped the Verification / GitHub Trust-Boundary
# Safety Review at
# docs/strategy/verification-github-trust-boundary-safety-review.md.
# The memo walks every step-9 hardening fix in isolation +
# the affected surfaces and declares the verification /
# GitHub trust boundary beta-stable. No additional GitHub
# review surfaces should be added before beta; remaining
# work is operational polish + documented platform caveats.
# Pinned reminder: VerificationResult and VerificationRun
# must remain chain-coherent in every review surface; Windows
# timeout behaviour is direct-child-only unless a future
# platform-specific process-tree strategy is implemented.
#
# The Beta Readiness / Remaining Classic-Parity Review at
# docs/strategy/beta-readiness-classic-parity-review.md
# declared Rekon beta-close but not beta-ready. Three policy
# blockers remain before public beta:
#   1. Source-write reconciliation policy (apply path is
#      undecided; ReconciliationPlan is preview-only today).
#   2. Watcher / path freshness policy (live invalidation +
#      staleness recovery not pinned).
#   3. Beta release readiness checklist (packaging /
#      version / docs / smoke constraints not pinned).
#
# Each blocker is a policy decision, not a missing
# implementation.
#
# The Source-Write Reconciliation Policy Decision Memo at
# docs/strategy/source-write-reconciliation-policy-decision.md
# resolved blocker (1). Decision: Option C — beta pins the
# source-write policy + preview requirements; the actual
# apply implementation remains deferred post-beta. Pinned
# reminders carried forward:
#   - Source-write apply is not required for beta, but the
#     policy boundary is required for beta.
#   - No agent-autonomous source writes.
#   - Every future source-write apply must be preceded by
#     exact diff preview and explicit operator confirmation.
#   - A successful apply must not automatically resolve
#     findings; lifecycle / status updates remain explicit
#     artifacts.
# The memo reserves the ReconciliationApplyReport artifact
# name and the source:write permission name (docs-only
# reservation; the SDK / runtime registration belongs to a
# later slice).
#
# The Watcher / Path Freshness Policy Decision Memo at
# docs/strategy/watcher-path-freshness-policy-decision.md
# resolved blocker (2). Decision: Option C — watcher-lite
# / path freshness policy for beta. No daemon by default;
# explicit `rekon refresh` remains the canonical operator
# action; future PathFreshnessReport artifact reserved by
# name; agent contract instructs agents to refresh after
# source edits. Pinned reminders carried forward:
#   - Watcher daemon is not required for beta.
#   - Path/source freshness policy is required for beta.
#   - Rekon must not silently mutate artifacts in the
#     background.
#   - Agents should treat artifacts as stale after source
#     edits until `rekon refresh` has run.
#   - Artifact lineage freshness is not the same as
#     working-tree freshness.
# The memo reserves PathFreshnessReport (docs-only;
# registration is a later slice) and pins that file mtimes
# alone are not sufficient as canonical freshness evidence
# — content hashes / git state preferred.
#
# The Beta Release Readiness Checklist Memo at
# docs/strategy/beta-release-readiness-checklist.md
# resolved blocker (3) — the third and final beta blocker.
# Decision: with this checklist pinned + the mandatory
# verification commands passing on main, Rekon is
# beta-ready. Beta-ready is a checklist state, not an npm
# publish event; the actual publish is a separate
# explicit operator work order. Pinned reminders:
#   - Beta readiness is a checklist state, not an npm
#     publish event.
#   - npm publish requires a separate explicit release
#     work order.
#   - No version bump occurs in this checklist batch.
#   - Known beta limitations must be documented before
#     beta is announced.
# Nine mandatory verification commands pinned
# (typecheck, test, build, git diff --check, five audit
# / smoke scripts). 14-command CLI smoke matrix pinned
# for the release slice. Known beta limitations
# disclosed (no source-write apply; no watcher daemon;
# no hosted GitHub App; active workflows not installed
# automatically; GitHub writes opt-in only; Windows
# process-tree kill direct-child-only; full classic
# parity not claimed; plus reserved-but-not-implemented
# artifact + permission names).
#
# The Beta Release Candidate Execution Plan at
# docs/strategy/beta-release-candidate-execution-plan.md
# executed the pinned checklist against main. Decision:
# the current main SHA qualifies as a beta release
# candidate. All 9 mandatory verification commands
# passed; the 15-entry CLI smoke matrix ran against a
# temporary fixture root with results recorded
# honestly. Recommended beta version: 0.1.0-beta.0
# (deferred to the beta version bump work order). This
# batch does not publish to npm, does not bump
# versions, and does not tag a release.
#
# The Beta Version Bump Execution Report at
# docs/strategy/beta-version-bump-execution-report.md
# applied 0.1.0-beta.0 coherently across the root
# package + all 20 workspace packages + the lockfile.
# Decision: Version 0.1.0-beta.0 has been applied
# coherently. All 9 mandatory verification commands
# passed on the bumped tree (test count holds at 1662
# passed / 1 skipped, confirming no regression); the
# 15-entry CLI smoke matrix was re-run against a
# temporary fixture with identical results. This batch
# does not publish to npm, does not create a git tag,
# and does not create a GitHub Release. The next
# publish step requires explicit operator
# authorization.
#
# The Real-Repo Beta Dogfood Report at
# docs/strategy/real-repo-beta-dogfood-report.md
# executed the dogfood matrix against a temp copy of
# the Rekon repository itself (489 files at SHA
# 83ba723). Dogfood Decision:
# pass-with-known-limitations. Two genuine wins vs.
# the fixture: `verify run --execute` actually ran
# `npm run typecheck` + `npm run test` + `npm run
# build` and all 3 passed (first end-to-end pass
# against real commands); `publish github-check
# --dry-run` propagated `conclusion: success`. 36
# artifacts written across 19 types; final artifacts
# validate clean. The single surviving finding is the
# intentional import-boundary-rule-pack demo fixture.
# This batch does not publish to npm, does not change
# package versions, does not create a git tag, and
# does not create a GitHub Release. The next publish
# step still requires explicit operator authorization.
#
# Next slice: beta npm publish authorization work order
# (the first slice allowed to invoke `npm publish`, and
# only with explicit operator authorization).
#
# Beta readiness is not the same as full classic parity.
# Rekon should not add more GitHub review surfaces before
# beta. The remaining pre-beta work is policy / guardrail
# oriented.
node packages/cli/dist/index.js artifacts list --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts show <id-or-type:id> --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings list --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings lifecycle --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter-health --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter-policy suggest --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter-policy list --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter-policy status --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter-policy apply <suggestion-id> --dry-run --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings filter-policy apply <suggestion-id> --root examples/simple-js-ts --json
node packages/cli/dist/index.js findings status set <finding-id> --status ignored --reason false-positive --note "Generated fixture intentionally." --root examples/simple-js-ts --json
node packages/cli/dist/index.js coherency delta --root examples/simple-js-ts --json
node packages/cli/dist/index.js issues adjudicate --root examples/simple-js-ts --json
node packages/cli/dist/index.js issues list --root examples/simple-js-ts --json
node packages/cli/dist/index.js issues merge candidates --root examples/simple-js-ts --undecided
node packages/cli/dist/index.js issues merge candidates --root examples/simple-js-ts --undecided --json
node packages/cli/dist/index.js issues merge candidate <candidate-id> --root examples/simple-js-ts
node packages/cli/dist/index.js issues merge candidate <candidate-id> --root examples/simple-js-ts --json
node packages/cli/dist/index.js issues merge decide <candidate-id> --decision accepted --note "Same root cause." --root examples/simple-js-ts --json
node packages/cli/dist/index.js issues merge decisions --root examples/simple-js-ts
node packages/cli/dist/index.js issues merge decisions --root examples/simple-js-ts --json
node packages/cli/dist/index.js publish architecture --root examples/simple-js-ts --json
node packages/cli/dist/index.js publish proof --root examples/simple-js-ts --json
node packages/cli/dist/index.js publish agent-contract --root examples/simple-js-ts --json
node packages/cli/dist/index.js agent-contract export --root examples/simple-js-ts --output AGENTS.rekon.md --json
```

`rekon agent-contract export` materializes the latest
`agent-contract` Publication to an operator-chosen path under the
repo root. It refuses to overwrite existing files, protected
agent-instruction paths (`AGENTS.md`, `CLAUDE.md`,
`.cursor/rules/*.md`, `.github/copilot-instructions.md`), and any
path outside the repo root unless `--force` is provided. See
[docs/concepts/agent-operating-contract.md](docs/concepts/agent-operating-contract.md).

## The `.rekon/` Workspace

`rekon init` creates a local workspace in the target repo:

```text
.rekon/
  artifacts/
    evidence/
    snapshots/
    projections/
    graphs/
    findings/
    resolver-packets/
    publications/
    actions/
  registry/
    artifacts.index.json
    capabilities.index.json
  cache/
  config.json
```

Generated artifacts are local outputs. They are useful for inspection and tests,
but docs and publications are not canonical truth.

## Artifacts And Provenance

Every Rekon artifact has an `ArtifactHeader` with schema version, generated
time, subject repository, producer metadata, input refs, freshness, and
provenance. The artifact index stores file paths and deterministic digests.

Start with:

- [Artifact contract](docs/artifacts/artifact-contract.md)
- [Artifact model](docs/artifacts/index.md)
- [Resolver packet](docs/artifacts/resolver-packet.md)

## Capabilities

Capabilities are extension packages registered through `@rekon/sdk`. Built-ins
and community packages use the same contract:

- manifest: roles, consumes, produces, permissions, invalidation, compatibility
- handlers: evidence providers, projectors, evaluators, resolvers, publishers,
  learners, and actuators
- conformance: `validateCapability()` and `assertCapabilityConforms()`

Start with:

- [Authoring capabilities](docs/extensions/authoring-capabilities.md)
- [Capability manifest](docs/extensions/capability-manifest.md)
- [Security model](docs/extensions/security-model.md)
- [Custom TODO example](examples/custom-capability/README.md)
- [Import boundary rule pack example](examples/import-boundary-rule-pack/README.md)

## Resolver Trace

`resolve.preflight` writes a `ResolverPacket` with `resolutionTrace`. The trace
explains ownership source precedence, fallbacks, finding and memory checks, and
risk rules. This is the canonical example of Rekon's value: an answer with the
artifact trail behind it.

Read: [docs/concepts/resolvers.md](docs/concepts/resolvers.md)

## Packages

- `@rekon/kernel-artifacts`
- `@rekon/kernel-evidence`
- `@rekon/kernel-snapshot`
- `@rekon/kernel-graph`
- `@rekon/kernel-repo-model`
- `@rekon/kernel-rulebook`
- `@rekon/kernel-findings`
- `@rekon/sdk`
- `@rekon/runtime`
- `@rekon/cli`
- `@rekon/capability-js-ts`
- `@rekon/capability-model`
- `@rekon/capability-graph`
- `@rekon/capability-policy`
- `@rekon/capability-resolver`
- `@rekon/capability-docs`
- `@rekon/capability-memory`
- `@rekon/capability-intent`
- `@rekon/capability-reconcile`
- `@rekon/capability-verify` (v1 ships the manifest +
  skeleton only; command execution is not implemented
  yet — see
  [docs/strategy/verification-runner-v1-decision.md](docs/strategy/verification-runner-v1-decision.md))

## Development

```sh
npm install
npm run typecheck
npm run test
npm run build
git diff --check
```

## Current Alpha Limitations

- no watcher or freshness engine beyond current artifact metadata
- no package marketplace or discovery
- no cloud service, GitHub app, or dashboard
- no source-writing reconciliation by default
- no full `codebase-intel-classic` behavior port
- schema validation is dependency-free and intentionally lightweight

## Architecture Rule

Lower layers may feed upper layers. Upper layers may not silently become
lower-layer truth.

Docs are publications, not canonical truth. Memory enriches resolver output; it
does not rewrite architecture facts directly. Reconciliation may apply accepted
changes only through explicit artifact writes and permissioned operations.

## Strategy Docs

The durable plan for Rekon lives in [docs/strategy](docs/strategy):

- [NorthStar](docs/strategy/north-star.md): why Rekon exists, what it is and is
  not, lifecycle, artifact hierarchy, and architecture rule.
- [Capability model](docs/strategy/capability-model.md): roles, manifest
  contract, community extension model, and trust expectations.
- [Roadmap](docs/strategy/roadmap.md): completed alpha spine, committed
  direction, and future expansions.
- [codebase-intel-classic migration](docs/strategy/codebase-intel-classic-migration.md):
  mapping from the classic reference repo to Rekon roles and porting
  criteria.

The [alpha release checklist](docs/release/alpha-release-checklist.md) tracks
the `0.1.0-alpha.1` go/no-go criteria.
