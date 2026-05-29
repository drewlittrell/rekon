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
#
# The No-NPM Beta Distribution Policy at
# docs/strategy/no-npm-beta-distribution-policy.md
# pins the post-dogfood release posture. Decision:
# Rekon beta will NOT be published to npm. Beta is a
# validated product / checklist state, not an
# npm-published package state. Distribution during
# beta is source-controlled, local-build, and
# tarball-smoke based; the npm registry path is
# deferred until after beta or until a new explicit
# operator decision reverses the policy. Operator
# install path during beta: git clone → npm ci →
# npm run build → invoke node packages/cli/dist/index.js
# against your own repo. No `npm install @rekon/cli`
# during beta. No public package surface. No GitHub
# Release object.
#
# Pinned reminders:
#   - Rekon beta will not be published to npm.
#   - npm publish is deferred until after beta.
#   - 0.1.0-beta.0 remains the internal / repo
#     version for beta validation.
#   - Beta readiness is a product / checklist state,
#     not an npm-published state.
#   - No npm publish should be attempted during beta.
#   - Real-repo dogfood passed and should continue
#     across more repos before public package release.
#
# The Additional Real-Repo Dogfood Cohort Plan at
# docs/strategy/additional-real-repo-dogfood-cohort-plan.md
# defines the next dogfood batches. Five archetypes
# pinned (small TypeScript package; medium monorepo;
# Next.js / React app; mixed JS/TS repo; existing
# GitHub workflows repo). At least three distinct
# real repositories required. Command matrix mirrors
# the first dogfood's matrix for cross-target
# comparability. Success / acceptable-outcome /
# release-blocker taxonomy pinned (findings exist =
# acceptable; failed verify run --execute = acceptable
# when recorded honestly; artifacts validate invalid =
# release blocker). Reporting format pinned (per-target
# dogfood reports + cohort summary report + cohort
# execution review packet + cohort execution docs
# test, all written by the cohort execution batch).
#
# The Real-Repo Dogfood Cohort Intake Request at
# docs/strategy/real-repo-cohort-intake-request.md
# captured the operator's required intake table.
#
# The cohort then ran. Cohort summary at
# docs/strategy/real-repo-cohort-summary.md +
# per-target reports under
# docs/strategy/real-repo-cohort/. Three distinct
# operator-approved real repositories were dogfooded
# (boundary-contracts, structured-evals, figma-ds)
# covering all 5 archetypes via two documented
# consolidations. Cohort decision:
# pass-with-known-limitations. No release blockers.
# 102 artefacts across 19 types written (34 per
# target × 3); every artefact validated clean.
# The verify → result → proof → Check dry-run
# pipeline propagated state correctly in both
# directions (success ↔ failure).
#
# Pinned reminders: this batch did not publish to
# npm, did not change package versions, did not
# create a git tag, did not create a GitHub
# Release. Every target ran from a temp `mktemp -d`
# copy; no source mutation outside temp copies; no
# `.rekon/**` artefacts from any target committed.
#
# Next step: operator decision. The no-NPM beta
# posture defers explicitly between (a) continue
# beta with no-NPM indefinitely, (b) add more
# cohort targets, (c) pivot to post-beta tracks
# (source-write / watcher / breadth / polish), or
# (d) open a no-NPM-policy-revision work order
# (requires explicit operator decision; this
# cohort does not pre-authorise one).
#
# Beta readiness is not the same as full classic parity.
# Rekon should not add more GitHub review surfaces before
# beta. The remaining pre-beta work is policy / guardrail
# oriented.
#
# First post-beta polish slice: VerificationPlan
# Missing-Script Tolerance. See
# docs/strategy/verification-missing-script-tolerance.md.
# The runner now records `skipped` (not `failed`) for
# `npm | pnpm | yarn run <script>` commands whose
# script is provably absent from the operator's
# `package.json`; the package manager is never
# spawned. No schema change, no new permission, no
# version bump. Surfaced by the real-repo cohort.
#
# Post-beta dogfood evidence triage decision at
# docs/strategy/post-beta-dogfood-evidence-triage.md
# classifies every cohort observation, reviews
# Options A-E for the next slice, and selects
# Option C (watcher / path freshness implementation,
# starting with the PathFreshnessReport artifact +
# source-state fingerprint skeleton). Source-write
# apply (Option B), rule breadth (Option D), and
# memory maturity (Option E) remain queued but
# later in sequence; each still requires its own
# work order. No npm publish; no version bump; no
# schema change in this triage batch.
#
# First Option C implementation slice shipped:
# PathFreshnessReport artifact + source-state
# fingerprint skeleton. See
# docs/artifacts/path-freshness-report.md and
# docs/concepts/path-freshness.md. New CLI
# `rekon paths freshness [--path <path>] [--json]`
# computes a deterministic source-state fingerprint
# (sha256 content hashes; default ignore set;
# bounded reads) and writes a single
# PathFreshnessReport diagnostic artifact comparing
# the working tree against the latest prior
# baseline. No daemon. No background refresh. No
# source writes. Mtimes are advisory only — never
# canonical freshness evidence. Artifact lineage
# freshness is not working-tree freshness; both
# surfaces coexist.
#
# Second Option C slice shipped: path freshness
# publication surfacing. Architecture summary,
# agent contract, and proof report publications
# now render a `Working Tree Path Freshness`
# section sourced from the latest
# PathFreshnessReport, and cite it in
# `header.inputRefs` when present. The agent
# contract gains a Do-Not-Do reminder forbidding
# agents from treating artifact lineage freshness
# as proof the working tree has not changed.
# Publications remain read-only with respect to
# the report: they never run `rekon paths
# freshness` and never run `rekon refresh`.
#
# Third Option C slice shipped: path freshness
# GitHub review surfacing. `rekon publish
# github-check --dry-run`/`--send` and `rekon
# publish pr-comment --dry-run`/`--send` now read
# the latest PathFreshnessReport and surface it in
# both the Check `output.summary` (a compact
# `Working tree path freshness:` block) and the PR
# comment body (two new summary-table rows + a
# stale/unknown warning in the existing Warnings
# list). Both surfaces cite the report in
# `citedRefs`. CONCLUSION POLICY (pinned this
# slice): stale PathFreshnessReport is a visible
# trust warning but does NOT by itself flip the
# GitHub Check conclusion — that continues to
# reflect proof / validation state via the
# existing pickConclusion logic. Both flows are
# read-only with respect to the report; they
# never run `rekon paths freshness` and never run
# `rekon refresh`. GitHub status / comments remain
# non-canonical.
#
# Path freshness safety review at
# docs/strategy/path-freshness-safety-review.md
# closes the post-beta watcher / path-freshness
# track. DECISION: the path freshness track is
# beta-private stable. No additional hardening is
# required before moving on. Required statements
# pinned verbatim: artifact lineage freshness is
# not working-tree freshness; PathFreshnessReport
# is explicit and operator-triggered; no daemon
# or background refresh exists; stale path
# freshness is a warning, not a GitHub Check
# conclusion override.
#
# Private beta support playbook at
# docs/beta/private-beta-support-playbook.md
# converts the now-stable no-NPM private-beta
# posture into a repeatable operator support
# process: source-checkout install, command
# matrix, artifact-sharing policy with explicit
# redaction guidance, blocker taxonomy vs
# acceptable first-class outcomes, path freshness
# rerun guidance, GitHub review surface guidance.
# Bug report template at
# docs/beta/private-beta-bug-report-template.md.
# Pinned: npm install is not supported during
# beta; bug reports must include Rekon artifacts
# or explicit redacted substitutes; artifact
# validation failure is a blocker; findings /
# failed verification / stale aggregate freshness
# / GitHub readiness gaps are NOT automatically
# blockers.
#
# Private beta onboarding quickstart at
# docs/beta/private-beta-onboarding-quickstart.md
# distills the playbook into a concise "start
# here" path for new operators: install from
# source checkout (git clone + npm ci + npm run
# build), pick a temp-copy target (git clone
# --local --no-hardlinks into mktemp -d; rsync
# fallback), run the first-scan matrix (init →
# refresh → paths freshness → artifacts
# validate), walk the findings + governance
# chain, inspect publications, run path
# freshness, optional verification chain +
# optional GitHub review dry-runs, recognise
# first-class outcomes vs. blockers, redact
# before sharing, plan the next step. Pinned
# verbatim: private beta users should not
# install Rekon from npm; private beta is
# source-checkout based; Rekon artifacts are
# canonical; GitHub Checks and PR comments are
# downstream review surfaces; run first scans
# against a temp copy so artifacts do not
# pollute the committed repo; artifact lineage
# freshness is not working-tree freshness;
# dry-run commands make no network calls;
# GitHub status and comments are not canonical
# truth — Rekon artifacts remain canonical.
# When the quickstart and the playbook
# conflict, the playbook wins.
#
# Private beta onboarding validation report
# at
# docs/beta/private-beta-onboarding-validation-report.md
# records the first end-to-end run of the
# quickstart against a non-Rekon target
# (anonymized as target-1, a small Next.js
# TypeScript app). Outcome:
# pass-with-known-limitations. Quickstart
# followed verbatim with no silent
# adjustments; 22 of 25 commands returned
# pass; 3 verification commands recorded
# failed honestly (target uses
# pnpm-workspace, install was deliberately
# not run in the temp copy -- first-class
# acceptable outcome); both GitHub dry-runs
# made zero HTTP calls; path freshness
# went unknown -> fresh (295/295 paths) on
# first -> second run as documented;
# artifacts validate returned valid:true at
# both checkpoints. Two minor documentation
# refinements surfaced (non-npm package
# managers note in Optional Verification
# Flow, historical newer-input-exists note
# in Inspect The Main Outputs); zero
# blockers. The prior intake-blocked posture
# is preserved at
# docs/beta/private-beta-onboarding-validation-intake-request.md
# as a historical record. Pinned verbatim
# in the validation report + asserted by
# the docs test: this batch does not
# publish to npm; this batch does not
# change package versions; this batch does
# not create a git tag; this batch does
# not create a GitHub Release; the
# validation run used a temp copy of a
# non-Rekon repository; Rekon artifacts
# remain canonical; GitHub dry-runs are
# downstream previews.
#
# Private beta onboarding quickstart
# refinements v2 has shipped. The
# quickstart now carries a Three
# Freshness Surfaces Operators Confuse
# subsection inside Run Path Freshness
# (with a diagnostic table covering
# artifacts validate vs artifacts
# freshness vs paths freshness, plus
# three rules of thumb explaining that
# historical newer-input-exists after
# re-publication is acceptable) and an
# Inspect The Plan Before Executing
# subsection inside Optional Verification
# Flow (with a package-manager / runner
# table covering npm / pnpm / yarn / bun
# / turbo / nx / make, a
# dry-run-first-then-execute flow, and
# routing of package-manager mismatch as
# a planning / ergonomics report). The
# support playbook's Acceptable
# First-Class Outcomes section gains the
# same three pins. The bug-report
# template gains Package Manager Used
# By Target Repo + Relevant Scripts From
# package.json subsections, a new
# Artifacts Freshness Result section,
# and a new VerificationPlan/Package
# Manager Match section. No runtime
# change; no package-manager detection
# in plan generation. Pinned verbatim
# in the quickstart + asserted by the
# docs test: artifacts validate is the
# structural artifact validity gate;
# artifacts freshness can report
# historical newer-input-exists entries
# after re-publication, inspect whether
# the latest major publication/refresh
# passed before treating aggregate stale
# output as a blocker; paths freshness
# is working-tree freshness and is
# separate from artifact lineage
# freshness.
#
# Reconciliation preview v1 has shipped.
# The new rekon reconcile preview --plan
# <id> [--json] command projects a
# ReconciliationPlan into five
# operator-facing preview kinds
# (artifact-only, source-patch,
# generated-file, manual, not-previewable)
# with four risk bands (low, medium,
# high, unknown). The helper
# buildReconciliationPreview lives in
# @rekon/capability-reconcile. v1 emits
# no diffs through normal flow because
# the ReconciliationPlan shape carries
# no exact patch data; a
# forward-compatible diff path emits a
# unified diff only when an operation
# carries beforeText + afterText AND the
# current file matches the expected
# before text. Source-write apply is
# not available. ReconciliationApplyReport
# artifact + source:write permission +
# rekon reconcile apply command are all
# still deferred. New concept doc
# docs/concepts/reconciliation-preview.md
# + strategy memo
# docs/strategy/reconciliation-preview-v1.md.
# Pinned verbatim in the docs: exact diff
# preview is mandatory before any apply
# implementation; the preview does not
# resolve findings; non-previewable
# operations are explicit.
#
# ReconciliationPreviewReport artifact
# decision has shipped at
# docs/strategy/reconciliation-preview-report-artifact-decision.md
# with outcome Option A -- reserve the
# ReconciliationPreviewReport artifact
# name; defer registration. No artifact
# type, validator, writer, or category
# lands. v1 preview helper + CLI
# continue to write no artifacts. Future
# registration is gated on at least two
# of four named product signals
# (forward-compat plan-generator diff
# data, a queued / shipped source-write
# apply slice, a publication / review
# surface that needs preview content
# inline, or operator cohort feedback
# explicitly asking for persistence).
# Pinned verbatim in the memo + asserted
# by the docs test:
# ReconciliationPreviewReport is not
# registered as a Rekon artifact in this
# slice; the artifact name
# ReconciliationPreviewReport is
# reserved; no
# ReconciliationPreviewReport
# validator, writer, or category is
# added; Reconciliation Preview v1
# remains a read-only, in-memory
# projection of ReconciliationPlan;
# Source-write apply remains
# unavailable. The reconciliation track
# is now at a deliberate pause point.
#
# Plan-generator diff data discovery has
# shipped at
# docs/strategy/plan-generator-diff-data-discovery.md
# with finding: no current plan generator
# emits exact beforeText / afterText. Two
# generation paths exist today
# (runLegacyMode + runSuggestionMode in
# packages/capability-reconcile/src/index.ts);
# both produce ReconciliationPlan
# operations carrying only structural
# metadata sourced from
# CoherencyRemediationStep -- no
# beforeText, no afterText, no
# replacementText, no diff body. resolve.issue
# produces ResolverPacket and is not a
# plan-generation path. Pinned verbatim in
# the memo + asserted by the docs test:
# Source-write apply remains unavailable;
# ReconciliationPreviewReport remains
# unregistered. Recommendation: do NOT
# register ReconciliationPreviewReport
# yet; schedule the next reconciliation
# slice as narrow ReconciliationPlan
# exact-diff operation v1 -- pick one
# deterministic operation class, teach
# the generator to read the current file
# + compute the canonical post-apply
# content, attach beforeText + afterText
# as additive optional fields. Source-write
# apply stays unavailable through that
# slice as well. Fallback if blocked:
# ReconciliationPlan operation-shape
# strengthening decision memo.
#
# Reconciliation exact-diff operation v1
# has shipped at
# docs/strategy/reconciliation-exact-diff-operation-v1.md.
# Adds the new exact_text_replacement
# operation kind plus optional additive
# beforeText / afterText / diffKind
# fields on CoherencyRemediationStep +
# RemediationItemLike +
# ReconciliationPlanOperation. The
# classifier emits patch fields only
# when an eight-precondition safety
# gate passes (patch triple non-empty,
# recognized diffKind, repoRoot
# supplied, single repo-relative path,
# current file exists + matches
# beforeText, afterText differs).
# Reconciliation Preview v1 now renders
# a real unified diff against a real
# generator. Source-write apply remains
# unavailable. ReconciliationPreviewReport
# remains unregistered (gating
# condition #1 satisfied; reservation
# still stands). Pinned verbatim:
# Source-write apply remains
# unavailable; Exact diff is generated
# only when deterministic; Previewable
# diff does not resolve findings.
# Recommended next slice: exact-diff
# operation safety review.
#
# Capability ontology architecture
# impact review has shipped at
# docs/strategy/capability-ontology-architecture-impact-review.md.
# Strategy / architecture / docs /
# tests-only batch. Maps the blast
# radius of a future capability-
# ontology / translation layer across
# every Rekon surface (EvidenceGraph,
# ObservedRepo, OwnershipMap,
# CapabilityMap, FindingReport,
# FindingFilterReport,
# IssueAdjudicationReport,
# CoherencyDelta, ReconciliationPlan,
# ReconciliationPreview,
# VerificationRun/Result, memory,
# architecture summary, agent contract,
# GitHub review surfaces, future
# RefactorPreservationContract). Pins
# eight architectural decisions:
# Rekon still needs the ontology
# function; the ontology function
# should not be a monolithic
# validator; raw evidence must remain
# separate from normalized purpose;
# normalization decisions need an
# audit artifact; CapabilityMap
# should eventually consume normalized
# capability claims;
# RefactorPreservationContract
# depends on normalized capability
# language; LLM-only normalization is
# not acceptable as truth; unknown
# verbs / nouns must surface to
# operators. Establishes the
# five-layer boundary: EvidenceGraph
# (raw facts) -> CapabilityOntology
# (vocabulary) ->
# CapabilityNormalizationReport
# (audit) -> CapabilityMap
# (normalized projection) ->
# RefactorPreservationContract
# (preservation obligations).
# Reserves three names; registers
# none. No port of the classic
# GraphOntologyValidator monolith.
# No runtime change. Recommended
# next slice: capability ontology
# translation layer decision memo.
#
# Capability ontology translation
# layer decision has shipped at
# docs/strategy/capability-ontology-translation-layer-decision.md.
# Pins Option C -- layered
# config-first ontology +
# artifact-backed normalization
# report. Defines the eight-layer
# internal model that refines the
# architecture impact review's
# macro five-layer boundary:
# Layer 0 EvidenceGraph (raw
# facts, input) -> Layer 1
# CapabilityCandidateSet
# (extracted candidates, helper)
# -> Layer 2 CapabilityLexicalSplit
# (verb/noun split, helper) ->
# Layer 3 CapabilityOntology
# (vocabulary / aliases, config)
# -> Layer 4
# EffectiveCapabilityOntology
# (compiled vocabulary, internal)
# -> Layer 5
# CapabilityNormalizationReport
# (translation audit, first
# artifact) -> Layer 6
# CapabilityMap (normalized
# projection, deferred to v2) ->
# Layer 7
# RefactorPreservationContract
# (preservation obligations,
# future). Owning package
# selected: @rekon/capability-ontology
# (new). V1 config source:
# .rekon/capability-ontology.json
# (optional; built-in baseline
# otherwise). Three core types
# sketched (CapabilityOntologyConfig,
# EffectiveCapabilityOntology,
# CapabilityNormalizationReport)
# but none implemented in this
# slice. Pinned verbatim:
# CapabilityOntology starts as
# config / source vocabulary;
# EffectiveCapabilityOntology is
# internal in v1;
# CapabilityNormalizationReport
# is the first registered
# artifact; CapabilityMap
# integration is deferred to v2;
# EvidenceGraph raw facts are
# unchanged; Unknown verbs /
# nouns must surface to operators;
# LLM suggestions are not truth
# in v1; Do not flatten the
# ontology into a single config
# / report layer. Recommended
# next slice:
# CapabilityNormalizationReport
# v1.
#
# CapabilityNormalizationReport v1
# has shipped. New package
# @rekon/capability-ontology
# (projector role) registers
# CapabilityNormalizationReport in
# the SDK + runtime (projections
# category). New CLI command
# rekon capability ontology normalize
# reads the latest EvidenceGraph,
# compiles an in-memory
# EffectiveCapabilityOntology from
# the built-in baseline + optional
# .rekon/capability-ontology.json,
# deterministically splits symbol /
# export / capability-hint /
# ownership-hint names into verb +
# noun tokens (camelCase /
# snake_case / kebab-case), and
# writes an audit-only normalization
# report. No EvidenceGraph mutation.
# No CapabilityMap mutation. No
# finding mutation. No LLM
# normalization. No source-write
# apply. No new permission. See
# docs/artifacts/capability-normalization-report.md
# and docs/concepts/capability-ontology.md.
# Try it:
#   rekon refresh
#   rekon capability ontology normalize --json
#
# CapabilityPhraseReport publication surfacing has
# shipped. The architecture summary and agent contract
# publishers now surface the latest
# CapabilityPhraseReport inline so operators and agents
# see semantic purpose projection where they already
# inspect repo state.
#
# Behavior:
#   - Architecture summary renders `## Capability
#     Phrases` with report ref, source
#     CapabilityNormalizationReport ref, summary counts,
#     and a bounded phrase table.
#   - Agent contract renders `### Capability Phrases`
#     under the operating-state group with the same
#     metadata, plus a new Do Not Do reminder against
#     treating phrases as CapabilityMap ownership or
#     placement policy.
#   - Both publications cite the report in
#     header.inputRefs when present; the new
#     `capability-phrases.changed` invalidation rule
#     propagates freshness.
#   - Proof report surfacing is deferred —
#     CapabilityPhraseReport is semantic context, not
#     verification proof.
#
# Pinned verbatim:
#   - CapabilityNormalizationReport remains the
#     translation audit.
#   - CapabilityPhraseReport is the semantic purpose
#     projection.
#   - CapabilityMap integration remains deferred.
#   - AST / typechecker evidence is optional
#     enrichment, not foundational truth.
#   - No LLM-only inference.
#
# Both publishers are strictly read-only: never run
# phrase projection, never run normalization, never
# mutate CapabilityPhraseReport,
# CapabilityNormalizationReport, CapabilityMap, or
# EvidenceGraph.
#
# New export from @rekon/capability-docs:
# buildCapabilityPhrasePublicationSection.
# @rekon/capability-docs.consumes gains
# CapabilityPhraseReport. New manifest invalidation rule
# capability-phrases.changed.
#
# No new artifact registration. No new CLI command. No
# version bump. No npm publish.
#
# See docs/artifacts/capability-phrase-report.md.
# Recommended next slice: CapabilityPhraseReport safety
# review.
#
# BridgeFindingLifecycleIntegrationReport v1 has shipped.
# Fifty-seventh slice on the codebase-intel-classic
# capability-ontology track. Product capability batch.
#
# Implements the read-only preview artifact chosen by the
# fifty-sixth slice (Option B). Registers a new artifact type
# BridgeFindingLifecycleIntegrationReport (kernel-repo-model
# factory / validator / schema, SDK known-types, runtime actions
# category), adds buildBridgeFindingLifecycleIntegrationReport +
# isBridgeDerivedFinding in @rekon/capability-model, and adds a
# rekon capability lint lifecycle-preview CLI command.
#
# The preview reads a FindingReport, identifies bridge-derived
# findings structurally from their trace fields (never by title
# text), and classifies readiness: ready-for-lifecycle (modeled
# initial status new), needs-review, duplicate, ineligible
# (filtered reserved). Non-bridge findings are omitted.
#   - BridgeFindingLifecycleIntegrationReport is preview, not
#     FindingLifecycleReport.
#   - ready-for-lifecycle rows receive a proposed initial status new.
#   - duplicates / missing evidence / missing trace are not
#     automatically promoted.
#   - No FindingFilterReport / FindingLifecycleReport /
#     IssueAdjudicationReport / CoherencyDelta mutation.
#   - No WorkOrder / VerificationPlan creation.
#   - Source writes remain unavailable.
#
# New artifact reference
# docs/artifacts/bridge-finding-lifecycle-integration-report.md, new
# concept docs/concepts/bridge-finding-lifecycle-integration.md. New
# 23-assertion contract test + 11-assertion docs test. Review packet
# .rekon-dev/review-packets/bridge-finding-lifecycle-integration-report-v1.md.
#
# No FindingReport writer behavior change. No npm publish. No
# version bump.
#
# Recommended next slice: BridgeFindingLifecycleIntegrationReport
# safety review.
#
# Bridge-derived findings lifecycle / CoherencyDelta integration
# decision has shipped. Fifty-sixth slice on the
# codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch.
#
# Decides how bridge-derived FindingReport entries should enter
# FindingLifecycleReport, IssueAdjudicationReport, and CoherencyDelta.
#
# Recommendation: Option B — a preview artifact first
# (BridgeFindingLifecycleIntegrationReport) that previews filter /
# lifecycle / adjudication / CoherencyDelta eligibility without
# mutating any of them.
#   - BridgeFindingLifecycleIntegrationReport is preview, not
#     FindingLifecycleReport.
#   - No FindingFilterReport / FindingLifecycleReport /
#     IssueAdjudicationReport / CoherencyDelta mutation occurs in this
#     decision slice.
#   - CoherencyDelta integration remains downstream of lifecycle and
#     adjudication.
#   - WorkOrder and VerificationPlan creation remain downstream of
#     CoherencyDelta.
#   - Source writes remain unavailable.
#
# No lifecycle / adjudication / CoherencyDelta / WorkOrder /
# VerificationPlan / source behavior is implemented in this slice.
#
# New strategy memo
# docs/strategy/bridge-finding-lifecycle-integration-decision.md
# (13 headings + 4 tables). New 14-assertion docs test. Review
# packet
# .rekon-dev/review-packets/bridge-finding-lifecycle-integration-decision.md.
#
# No runtime behavior changes. No source under packages/ modified.
# No new artifact type. No new CLI command. No version bump. No npm
# publish.
#
# Recommended next slice: BridgeFindingLifecycleIntegrationReport v1
# (preview only).
#
# Bridge-derived findings publication safety review has shipped.
# Fifty-fifth slice on the codebase-intel-classic
# capability-ontology track. Strategy / safety-review batch.
# Read-only end-to-end review of the bridge-derived findings
# publication surfacing (shipped at 6ad2045).
#
# Recommendation: the surfacing is safe / stable as read-only
# visibility (no blocker).
#   - Bridge-derived findings publication surfacing is read-only
#     visibility.
#   - Bridge-derived findings are governed FindingReport entries,
#     not FindingLifecycleReport status.
#   - Publication surfacing does not mutate FindingReport /
#     FindingFilterReport / FindingLifecycleReport /
#     IssueAdjudicationReport / CoherencyDelta, and does not create
#     WorkOrder / VerificationPlan.
#   - Publication surfacing does not imply resolver routing,
#     verification planning, RefactorPreservationContract behavior,
#     or source-write permission.
#   - Proof report surfacing remains deferred (governance context,
#     not verification proof).
#   - Lifecycle / CoherencyDelta integration decision work may begin
#     after this safety review.
#
# New strategy memo
# docs/strategy/bridge-derived-findings-publication-safety-review.md
# (12 headings + 4 tables). New 15-assertion docs test. Review
# packet
# .rekon-dev/review-packets/bridge-derived-findings-publication-safety-review.md.
#
# No runtime behavior changes. No source under packages/ modified.
# No new artifact type. No new CLI command. No version bump. No npm
# publish.
#
# Recommended next slice: bridge-derived findings lifecycle /
# CoherencyDelta integration decision.
#
# Bridge-derived findings publication surfacing has shipped.
# Fifty-fourth slice on the codebase-intel-classic
# capability-ontology track. Product capability batch implementing
# the slice-53 Option B decision.
#
# The architecture summary and agent operating contract now surface
# the governed bridge-derived FindingReport entries the controlled
# `rekon capability lint write-findings --confirm-finding-write`
# writer wrote, as read-only visibility with provenance.
#   - New helper
#     @rekon/capability-docs.buildBridgeDerivedFindingsPublicationSection
#     (+ isBridgeDerivedFinding) identifies bridge-derived findings
#     by finding.type === "capability_architecture_policy",
#     details.source === "capability-lint-bridge", or any
#     details.source* trace field — never title text alone.
#   - Architecture summary renders `## Bridge-Derived Findings`
#     (FindingReport ref, count, severity distribution, bounded
#     provenance table); agent contract renders `### Bridge-Derived
#     Findings` + a Do Not Do reminder.
#   - Manifest gains FindingReport consume + a
#     bridge-derived-findings.changed invalidation rule.
#   - Publications read the latest FindingReport, never run the
#     bridge writer, never mutate FindingReport /
#     FindingLifecycleReport / IssueAdjudicationReport /
#     CoherencyDelta, never create WorkOrder / VerificationPlan;
#     bridge-derived findings are governed FindingReport entries,
#     not lifecycle status; proof report deferred; lifecycle /
#     CoherencyDelta integration downstream.
#
# New 23-assertion contract test + 11-assertion docs test. Review
# packet
# .rekon-dev/review-packets/bridge-derived-findings-publications.md.
#
# No new artifact type. No new CLI command. No version bump. No npm
# publish.
#
# Recommended next slice: bridge-derived findings publication safety
# review.
#
# Bridge-derived findings publication decision has shipped.
# Fifty-third slice on the codebase-intel-classic
# capability-ontology track. Strategy / architecture decision
# batch. Decides how bridge-derived FindingReport entries (written
# by the controlled, opt-in --confirm-finding-write writer) should
# be surfaced after the writer passed safety review.
#
# Recommendation: Option B — surface bridge-derived FindingReport
# entries in the architecture summary and the agent operating
# contract first; the proof report is deferred. No publication
# behavior is implemented in this slice.
#   - Bridge-derived findings are governed FindingReport entries,
#     not lifecycle status.
#   - Publication surfacing does not mutate FindingReport.
#   - Publication surfacing does not mutate FindingLifecycleReport,
#     IssueAdjudicationReport, or CoherencyDelta.
#   - Publication surfacing does not create WorkOrder or
#     VerificationPlan.
#   - Proof report surfacing remains deferred.
#   - Lifecycle and CoherencyDelta integration remain downstream.
#
# Source identification uses finding.type =
# capability_architecture_policy plus the details.source* trace
# fields — never title text alone. The publication model sketch
# (## Bridge-Derived Findings / ### Bridge-Derived Findings) and
# the citation policy are pinned for the implementation slice.
#
# New strategy memo
# docs/strategy/bridge-derived-findings-publication-decision.md
# (12 headings + 4 tables: option / surface / boundary /
# source-identification). New 15-assertion docs test. Review
# packet
# .rekon-dev/review-packets/bridge-derived-findings-publication-decision.md.
#
# No runtime behavior changes. No source under packages/ modified.
# No new artifact type. No new CLI command. No version bump. No npm
# publish.
#
# Recommended next slice: bridge-derived findings publication
# surfacing.
#
# CapabilityLintFindingBridgeReport → FindingReport writer safety
# review has shipped. Fifty-second slice on the
# codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch. Read-only end-to-end review of the
# FindingReport writer mode (shipped at 8bb6f82).
#
# Recommendation: the FindingReport writer mode is safe / stable as
# a controlled, opt-in writer (no blocker).
#   - FindingReport writer mode is opt-in and requires
#     --confirm-finding-write; dry-run remains preview-only and
#     writes nothing.
#   - Writer mode writes exactly one new FindingReport artifact on
#     success and never mutates an existing FindingReport in place.
#   - Writer mode does not mutate FindingFilterReport /
#     FindingLifecycleReport / IssueAdjudicationReport /
#     CoherencyDelta, and creates no WorkOrder / VerificationPlan.
#   - Writer mode writes no source files; lifecycle and
#     CoherencyDelta integration remain downstream.
#
# New strategy memo
# docs/strategy/capability-lint-finding-writer-safety-review.md
# (12 headings + 3 tables). New 15-assertion docs test. Review
# packet
# .rekon-dev/review-packets/capability-lint-finding-writer-safety-review.md.
#
# No runtime behavior changes. No source under packages/ modified.
# No new artifact type. No new CLI command. No version bump. No npm
# publish.
#
# Recommended next slice: FindingReport writer publication /
# operator-surface decision.
#
# CapabilityLintFindingBridgeReport → FindingReport writer
# implementation has shipped. Fifty-first slice on the
# codebase-intel-classic capability-ontology track. Product
# capability batch (controlled writer).
#
# rekon capability lint write-findings now has two modes:
#   --dry-run               : preview only, writes nothing.
#   --confirm-finding-write : writes exactly one new FindingReport.
#   - Write mode requires --confirm-finding-write; --dry-run and
#     --confirm-finding-write are mutually exclusive; --write /
#     --send / --execute are rejected.
#   - Write mode writes a NEW FindingReport artifact (the proposed
#     body), citing the bridge + upstream refs; it does not mutate
#     an existing FindingReport in place.
#   - Exits non-zero and writes nothing when 0 eligible findings.
#   - FindingFilterReport / FindingLifecycleReport /
#     IssueAdjudicationReport / CoherencyDelta are not mutated;
#     WorkOrder / VerificationPlan are not created; source writes
#     remain unavailable.
#
# New 25-assertion contract test + 11-assertion docs test. Review
# packet .rekon-dev/review-packets/capability-lint-finding-writer.md.
#
# No new artifact type. No version bump. No npm publish.
#
# Recommended next slice: FindingReport writer safety review.
#
# CapabilityLintFindingBridgeReport → FindingReport writer mode
# decision has shipped. Fiftieth slice on the
# codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch. Decides whether and how to add an
# opt-in FindingReport write mode after the dry-run safety review.
#
# Recommendation: Option B — a future, opt-in write mode gated
# behind --confirm-finding-write, reusing the dry-run preview and
# writing a new FindingReport artifact only. Not implemented in
# this slice.
#   - No FindingReport entries are written in this decision slice.
#   - Future write mode must require --confirm-finding-write;
#     --write / --send / --execute remain rejected.
#   - Future write mode writes a NEW FindingReport artifact, never
#     mutates an existing one in place.
#   - Future write mode does not mutate FindingFilterReport /
#     FindingLifecycleReport / IssueAdjudicationReport /
#     CoherencyDelta, and creates no WorkOrder / VerificationPlan.
#   - Source writes remain unavailable.
#
# New strategy memo
# docs/strategy/capability-lint-finding-writer-mode-decision.md
# (13 headings + 4 tables). New 16-assertion docs test. Review
# packet
# .rekon-dev/review-packets/capability-lint-finding-writer-mode-decision.md.
#
# No runtime behavior changes. No source under packages/ modified.
# No new artifact type. No new CLI command. No version bump. No npm
# publish.
#
# Recommended next slice: CapabilityLintFindingBridgeReport →
# FindingReport writer implementation.
#
# CapabilityLintFindingBridgeReport → FindingReport writer
# dry-run safety review has shipped. Forty-ninth slice on the
# codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch. Read-only end-to-end review of the
# FindingReport writer dry-run helper / CLI (shipped at cf87e59).
#
# Recommendation: the FindingReport writer dry-run helper / CLI is
# safe / stable as preview-only writer modeling (no blocker).
#   - FindingReport writer dry-run is preview-only.
#   - --dry-run is required; --confirm-finding-write / --write /
#     --send / --execute are rejected.
#   - Dry-run writes no FindingReport and mutates no existing
#     FindingReport.
#   - Dry-run mutates no FindingFilterReport / FindingLifecycleReport
#     / IssueAdjudicationReport / CoherencyDelta, and does not mutate
#     the artifact index.
#   - Dry-run creates no WorkOrder / VerificationPlan.
#   - Write mode remains deferred to a later explicit decision.
#
# New strategy memo
# docs/strategy/capability-lint-finding-writer-dry-run-safety-review.md
# (12 headings + 4 tables). New 16-assertion docs test. Review
# packet
# .rekon-dev/review-packets/capability-lint-finding-writer-dry-run-safety-review.md.
#
# No runtime behavior changes. No source under packages/ modified.
# No new artifact type. No new CLI command. No version bump. No npm
# publish.
#
# Recommended next slice: CapabilityLintFindingBridgeReport →
# FindingReport writer mode decision.
#
# CapabilityLintFindingBridgeReport → FindingReport writer
# dry-run helper / CLI has shipped. Forty-eighth slice on the
# codebase-intel-classic capability-ontology track. Product
# capability batch (dry-run preview only).
#
# New helper @rekon/capability-model.buildFindingReportWritePreview
# and CLI command:
#   rekon capability lint write-findings
#     --bridge-report <id|type:id> --dry-run [--root <path>] [--json]
# read a CapabilityLintFindingBridgeReport, select eligible
# candidates, and return the proposed FindingReport body a future
# writer would emit.
#   - The dry-run writes no FindingReport. Write mode is deferred.
#   - --dry-run is required; --confirm-finding-write / --write /
#     --send / --execute are rejected.
#   - FindingReport / FindingFilterReport / FindingLifecycleReport /
#     IssueAdjudicationReport / CoherencyDelta are not mutated; the
#     artifact index is not mutated.
#   - WorkOrder / VerificationPlan are not created. No source writes.
#
# New 27-assertion contract test + 9-assertion docs test. Review
# packet
# .rekon-dev/review-packets/capability-lint-finding-writer-dry-run.md.
#
# No new artifact type. No write mode. No version bump. No npm
# publish.
#
# Recommended next slice: FindingReport writer dry-run safety
# review.
#
# CapabilityLintFindingBridgeReport → FindingReport writer
# decision has shipped. Forty-seventh slice on the
# codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch. Decides whether and how eligible
# CapabilityLintFindingBridgeReport candidates may become
# governed FindingReport entries.
#
# Recommendation: Option B — a future, separate, opt-in
# FindingReport writer that requires a dry-run preview and an
# explicit confirmation flag. The writer is NOT implemented in
# this slice.
#   - No FindingReport entries are written in this decision
#     slice.
#   - A future writer must support dry-run preview before write
#     mode and require explicit confirmation before writing
#     FindingReport.
#   - The writer writes a NEW FindingReport artifact, never
#     mutates an existing one in place.
#   - FindingFilterReport / FindingLifecycleReport /
#     IssueAdjudicationReport / CoherencyDelta remain downstream
#     and are not mutated by the writer.
#   - WorkOrder / VerificationPlan creation remain downstream and
#     are not part of the writer.
#   - Source writes remain unavailable.
#
# New strategy memo
# docs/strategy/capability-lint-finding-writer-decision.md
# (13 headings + 4 tables). New 16-assertion docs test. Review
# packet
# .rekon-dev/review-packets/capability-lint-finding-writer-decision.md.
#
# No runtime behavior changes. No source under packages/
# modified. No new artifact type. No new CLI command. No version
# bump. No npm publish.
#
# Recommended next slice: CapabilityLintFindingBridgeReport →
# FindingReport writer dry-run helper / CLI (preview only).
#
# CapabilityLintFindingBridgeReport publication safety
# review has shipped. Forty-sixth slice on the
# codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch. Read-only end-to-end review of the
# CapabilityLintFindingBridgeReport publication surfacing
# (shipped at 41e0f32).
#
# Recommendation: CapabilityLintFindingBridgeReport publication
# surfacing is safe / stable as read-only visibility. Reviewed
# the helper, the architecture summary + agent contract
# sections, the Do Not Do reminder, the proof-report deferral,
# and the contract / docs tests.
#
# Pinned verbatim:
#   - CapabilityLintFindingBridgeReport publication surfacing is
#     read-only visibility.
#   - CapabilityLintFindingBridgeReport is preview, not
#     FindingReport.
#   - proposedFinding is preview-only and writes no
#     FindingReport.
#   - Surfacing does not imply FindingReport mutation,
#     FindingLifecycleReport mutation, IssueAdjudicationReport
#     mutation, CoherencyDelta mutation, WorkOrder creation,
#     VerificationPlan creation, resolver routing, verification
#     planning, RefactorPreservationContract behavior, or
#     source-write permission.
#   - Publications read the latest
#     CapabilityLintFindingBridgeReport; they never run
#     `rekon capability lint bridge-findings`.
#   - Proof report surfacing remains deferred.
#   - FindingReport writer decision work may begin after this
#     safety review.
#
# New strategy memo
# docs/strategy/capability-lint-finding-bridge-publication-safety-review.md
# (11 headings + 3 tables). New 14-assertion docs test. Review
# packet
# .rekon-dev/review-packets/capability-lint-finding-bridge-publication-safety-review.md.
#
# No runtime behavior changes. No source files under packages/
# modified. No new artifact type. No new CLI command. No npm
# publish. No version bump.
#
# Recommended next slice:
# CapabilityLintFindingBridgeReport -> FindingReport writer
# decision.
#
# CapabilityLintFindingBridgeReport publication surfacing
# has shipped. Forty-fifth slice on the codebase-intel-classic
# capability-ontology track. The architecture summary and
# agent contract publications now surface the latest
# CapabilityLintFindingBridgeReport as read-only visibility
# (a Capability Lint Finding Bridge section: summary counts +
# bounded candidate table + eligible / ineligible /
# needs-review guidance), citing it in header.inputRefs.
#
# New @rekon/capability-docs helper
# buildCapabilityLintFindingBridgePublicationSection. Manifest
# consumes gains CapabilityLintFindingBridgeReport; new
# invalidation rule capability-lint-finding-bridge.changed.
#
# Pinned verbatim:
#   - Publications read the latest
#     CapabilityLintFindingBridgeReport and never run bridge
#     generation.
#   - Publications do not write FindingReport, mutate
#     FindingFilterReport / FindingLifecycleReport /
#     IssueAdjudicationReport / CoherencyDelta, or create
#     WorkOrder / VerificationPlan.
#   - proposedFinding is preview-only; surfacing does not
#     imply source writes.
#   - Proof-report surfacing is deferred.
#
# New contract test (23 assertions) + docs test (11
# assertions). Review packet
# .rekon-dev/review-packets/capability-lint-finding-bridge-publications.md.
#
# No new artifact type. No new CLI command. No version bump.
# No npm publish.
#
# Recommended next slice:
# CapabilityLintFindingBridgeReport publication safety review.
#
# CapabilityLintFindingBridgeReport safety review has
# shipped. Forty-fourth slice on the codebase-intel-classic
# capability-ontology track. Strategy / safety-review batch.
# Read-only end-to-end review of CapabilityLintFindingBridgeReport
# v1 (shipped at 166e07a).
#
# Recommendation: CapabilityLintFindingBridgeReport v1 is
# safe / stable as a preview bridge artifact. Reviewed the
# type shape, factory, validator / schema, builder, CLI,
# eligibility rules, duplicate handling, and deterministic
# proposed finding id policy.
#
# Pinned verbatim:
#   - CapabilityLintFindingBridgeReport is preview, not
#     FindingReport.
#   - No FindingReport entries are written in v1.
#   - CapabilityLintFindingBridgeReport does not mutate
#     FindingFilterReport, FindingLifecycleReport,
#     IssueAdjudicationReport, or CoherencyDelta.
#   - CapabilityLintFindingBridgeReport does not create
#     WorkOrder or VerificationPlan.
#   - Only a later explicit writer decision may allow
#     eligible bridge candidates to become governed findings.
#   - The next slice may surface
#     CapabilityLintFindingBridgeReport in publications, but
#     must not write findings.
#
# New strategy memo
# docs/strategy/capability-lint-finding-bridge-report-safety-review.md
# (13 headings + 4 tables). New 14-assertion docs test. Review
# packet
# .rekon-dev/review-packets/capability-lint-finding-bridge-report-safety-review.md.
#
# No runtime behavior changes. No source files under packages/
# modified. No new artifact type. No new CLI command. No
# FindingReport / FindingFilterReport / FindingLifecycleReport /
# IssueAdjudicationReport / CoherencyDelta mutation. No
# WorkOrder / VerificationPlan creation. No npm publish. No
# version bump.
#
# Recommended next slice:
# CapabilityLintFindingBridgeReport publication surfacing.
#
# CapabilityLintFindingBridgeReport v1 has shipped.
# Forty-third slice on the codebase-intel-classic
# capability-ontology track. Implements Option B of the
# bridge decision: a preview bridge artifact that
# classifies each CapabilityArchitectureLintReport row as
# eligible / ineligible / needs-review for a future
# FindingReport writer, with a deterministic, slug-safe
# proposed finding id
# (capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>)
# on eligible rows.
#
# New artifact type CapabilityLintFindingBridgeReport
# (schemaVersion 0.1.0, experimental), registered in
# @rekon/sdk and the @rekon/runtime category map (actions).
# New helper buildCapabilityLintFindingBridgeReport in
# @rekon/capability-model. New CLI command
# `rekon capability lint bridge-findings
# [--lint-report <ref>] [--root <path>] [--json]`.
#
# Pinned verbatim:
#   - CapabilityLintFindingBridgeReport is preview, not
#     FindingReport.
#   - The bridge does not write FindingReport.
#   - The bridge does not mutate FindingFilterReport,
#     FindingLifecycleReport, IssueAdjudicationReport, or
#     CoherencyDelta.
#   - Only a later explicit writer decision may allow
#     eligible bridge candidates to become governed
#     findings.
#   - WorkOrder / VerificationPlan creation is not
#     included.
#
# No FindingReport mutation. No lifecycle / CoherencyDelta
# mutation. No WorkOrder / VerificationPlan creation. No
# source writes. No LLM inference. No version bump. No npm
# publish.
#
# See docs/artifacts/capability-lint-finding-bridge-report.md
# and docs/concepts/capability-lint-finding-bridge.md.
# Recommended next slice:
# CapabilityLintFindingBridgeReport safety review.
#
# CapabilityArchitectureLintReport -> FindingReport
# bridge decision has shipped. Forty-second slice on the
# codebase-intel-classic capability-ontology track.
# Strategy / architecture decision memo only. First
# bridge decision between the capability-policy
# evaluation layer and the existing finding / governance
# pipeline.
#
# Recommendation: Option B -- introduce an intermediate
# CapabilityLintFindingBridgeReport first (a preview
# artifact), rather than writing FindingReport directly.
#
# Pinned verbatim:
#   - CapabilityLintFindingBridgeReport is preview, not
#     FindingReport.
#   - No FindingReport entries are written in v1.
#   - No FindingFilterReport, FindingLifecycleReport,
#     IssueAdjudicationReport, or CoherencyDelta mutation
#     occurs in v1.
#   - Only a later explicit writer decision may allow
#     bridge candidates to become governed findings.
#   - Finding lifecycle and CoherencyDelta remain
#     downstream of governed findings.
#
# V1 eligibility (bridge-report slice): status violation
# + findingCandidate + confidence high/medium + severity
# high/medium + evidenceRefs. Deterministic finding id
# sketch:
# capability-architecture-policy:<rule>:<contractId>:<phraseCapabilityId>.
#
# Implementation sequence: (1) decision memo (this
# slice); (2) CapabilityLintFindingBridgeReport v1
# (preview only); (3) bridge safety review; (4)
# FindingReport writer decision; (5) writer
# implementation only if explicitly approved.
#
# Recommended next slice:
# CapabilityLintFindingBridgeReport v1 -- register the
# bridge report artifact + preview-only projection.
#
# No implementation. No new artifact type registered. No
# runtime behavior changes. No FindingReport mutation. No
# npm publish. No version bump.
#
# See docs/strategy/capability-lint-finding-bridge-decision.md.
#
# CapabilityArchitectureLintReport publication safety
# review has shipped. Forty-first slice on the
# codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch. Read-only end-to-end
# audit of the CapabilityArchitectureLintReport
# publication surfacing shipped at d01fe23.
#
# Recommendation: publication surfacing is safe / stable
# as read-only visibility.
#
# Pinned verbatim:
#   - CapabilityArchitectureLintReport publication
#     surfacing is read-only visibility.
#   - CapabilityArchitectureLintReport is evaluation,
#     not enforcement.
#   - findingCandidate is preview-only and writes no
#     FindingReport.
#   - Surfacing does not imply FindingReport mutation,
#     FindingLifecycleReport mutation, CoherencyDelta
#     mutation, resolver routing, verification planning,
#     RefactorPreservationContract behavior, or
#     source-write permission.
#   - Publications read the latest
#     CapabilityArchitectureLintReport; they never run
#     `rekon capability lint architecture`.
#   - Proof report surfacing remains deferred.
#   - Finding-bridge decision work may begin after this
#     safety review.
#
# Recommended next slice:
# CapabilityArchitectureLintReport -> FindingReport
# bridge decision (strategy / decision memo only). Bridge
# implementation, lifecycle / CoherencyDelta mutation,
# resolver routing, verification planning, and source
# writes stay deferred.
#
# No runtime behavior changes. No publication behavior
# changes. No source files under packages/ modified. No
# npm publish. No version bump.
#
# See docs/strategy/capability-architecture-lint-publication-safety-review.md.
#
# CapabilityArchitectureLintReport publication surfacing
# has shipped. Fortieth slice on the
# codebase-intel-classic capability-ontology track.
# Product capability batch. The architecture summary and
# agent contract publications now surface the latest
# CapabilityArchitectureLintReport as read-only
# visibility into capability placement-policy evaluation.
#
# Pinned verbatim:
#   - CapabilityArchitectureLintReport is evaluation
#     visibility only; this publication does not write
#     findings, mutate lifecycle state, route resolvers,
#     generate verification plans, or write source
#     files.
#   - findingCandidate is preview-only and writes no
#     FindingReport.
#   - Publications read the latest
#     CapabilityArchitectureLintReport; they never run
#     `rekon capability lint architecture`.
#   - Publications never mutate FindingReport,
#     FindingFilterReport, FindingLifecycleReport,
#     CoherencyDelta, CapabilityContract, or
#     CapabilityMap.
#   - Surfacing does not imply resolver routing,
#     verification planning, RefactorPreservationContract,
#     or source writes.
#   - Proof-report surfacing is deferred.
#
# New helper
# buildCapabilityArchitectureLintPublicationSection in
# @rekon/capability-docs. Architecture summary +
# agent contract render a Capability Architecture Linting
# section and cite the report in header.inputRefs. No new
# artifact type. No new CLI command. No version bump. No
# npm publish.
#
# Recommended next slice:
# CapabilityArchitectureLintReport publication safety
# review.
#
# See docs/artifacts/capability-architecture-lint-report.md
# and docs/concepts/capability-aware-architecture-linting.md.
#
# CapabilityArchitectureLintReport safety review has
# shipped. Thirty-ninth slice on the
# codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch. Read-only end-to-end
# audit of the CapabilityArchitectureLintReport v1
# implementation shipped at 0bd7af0.
#
# Recommendation: CapabilityArchitectureLintReport v1
# is safe / stable as a separate evaluation artifact.
#
# Pinned verbatim:
#   - CapabilityArchitectureLintReport is evaluation,
#     not enforcement.
#   - findingCandidate is preview-only and does not
#     write FindingReport.
#   - CapabilityArchitectureLintReport does not mutate
#     FindingFilterReport, FindingLifecycleReport, or
#     CoherencyDelta.
#   - CapabilityArchitectureLintReport does not
#     implement resolver routing, verification
#     planning, RefactorPreservationContract, or
#     source writes.
#   - The next slice may surface
#     CapabilityArchitectureLintReport in publications,
#     but must not bridge to findings yet.
#
# Recommended next slice:
# CapabilityArchitectureLintReport publication
# surfacing (read-only visibility in architecture
# summary + agent contract). Finding bridge deferred.
#
# No runtime behavior changes. No source files under
# packages/ modified. No new artifact type. No new
# CLI command. No npm publish. No version bump.
#
# See docs/strategy/capability-architecture-lint-report-safety-review.md.
#
# CapabilityArchitectureLintReport v1 has shipped.
# Thirty-eighth slice on the codebase-intel-classic
# capability-ontology track. Product capability
# batch. Registers a new evaluation artifact + producer
# + CLI. Implements the Capability-Aware Architecture
# Linting Decision (Option B).
#
# Pinned verbatim:
#   - CapabilityArchitectureLintReport is
#     evaluation, not enforcement.
#   - V1 does not write FindingReport.
#   - V1 does not mutate FindingFilterReport,
#     FindingLifecycleReport, or CoherencyDelta.
#   - V1 does not mutate CapabilityContract or
#     CapabilityMap.
#   - V1 does not add resolver routing by capability.
#   - V1 does not add verification planning by
#     capability.
#   - V1 does not add RefactorPreservationContract.
#   - V1 does not add source writes.
#   - findingCandidate on violation rows is a
#     preview payload only; a future explicit bridge
#     slice may promote selected rows through the
#     finding lifecycle.
#
# V1 evaluation scope:
#   - allowed-layer / forbidden-layer: pass /
#     violation / not-evaluated.
#   - allowed-system / forbidden-system: emitted as
#     not-evaluated (no deterministic system field
#     on phrase-backed capabilities yet).
#
# Deferred: requiredNeighbors, forbiddenNeighbors,
# preservationRules. requiredChecks reserved as a
# row kind but not evaluated.
#
# New artifact type registered:
# CapabilityArchitectureLintReport (schemaVersion
# 0.1.0, stability experimental). New CLI command
# `rekon capability lint architecture
# [--capability-contract <id|type:id>]
# [--capability-map <id|type:id>] [--root <path>]
# [--json]`. New helper
# buildCapabilityArchitectureLintReport in
# @rekon/capability-model.
#
# Recommended next slice:
# CapabilityArchitectureLintReport safety review.
# Still no FindingReport mutation. Still no
# CoherencyDelta mutation. Still no resolver
# routing. Still no verification planning. Still no
# source writes.
#
# See docs/artifacts/capability-architecture-lint-report.md
# and docs/concepts/capability-aware-architecture-linting.md.
#
# Capability-aware architecture linting decision
# has shipped. Thirty-seventh slice on the
# capability-ontology track. Strategy /
# architecture decision memo only.
#
# Recommendation: select Option B -- emit a
# separate CapabilityArchitectureLintReport
# artifact from CapabilityContract +
# CapabilityMap v2, rather than promoting
# straight to FindingReport.
#
# Pinned verbatim:
#   - Capability-aware architecture linting is
#     evaluation, not source mutation.
#   - CapabilityArchitectureLintReport is not
#     FindingReport in v1.
#   - CapabilityArchitectureLintReport does not
#     mutate FindingLifecycleReport or
#     CoherencyDelta.
#   - CapabilityArchitectureLintReport does not
#     implement resolver routing or verification
#     planning.
#   - Only a later explicit bridge may promote
#     lint rows into governed findings.
#
# V1 scope (next slice): allowedLayers /
# forbiddenLayers / allowedSystems /
# forbiddenSystems over configured contract rows.
# requiredChecks may optionally surface as
# not-evaluated. requiredNeighbors,
# forbiddenNeighbors, and preservationRules
# evaluation deferred.
#
# Recommended next slice:
# CapabilityArchitectureLintReport v1 -- register
# the artifact + evaluation helper + CLI. Still no
# FindingReport, FindingLifecycleReport, or
# CoherencyDelta mutation. Still no resolver
# routing. Still no verification planning. Still
# no source writes.
#
# No runtime behavior changes. No source files
# under packages/ modified. No npm publish. No
# version bump.
#
# See docs/strategy/capability-aware-architecture-linting-decision.md.
#
# CapabilityContract publication safety review has
# shipped. Thirty-sixth slice on the
# capability-ontology track. Strategy /
# safety-review batch. Read-only end-to-end audit
# of the publication surfacing shipped at ebf8b56.
#
# Pinned verbatim:
#   - CapabilityContract publication surfacing is
#     read-only visibility.
#   - CapabilityContract is policy, not projection
#     or enforcement.
#   - Surfacing does not imply architecture linting,
#     resolver routing, verification planning,
#     finding resolution,
#     RefactorPreservationContract behavior, or
#     source-write permission.
#   - Publications read the latest
#     CapabilityContract; they never generate it.
#   - Proof report surfacing remains deferred
#     because CapabilityContract is policy context,
#     not verification proof.
#   - Architecture linting decision work may begin
#     after this safety review.
#
# Recommendation: declare publication surfacing
# safe / stable as read-only visibility. Begin the
# capability-aware architecture linting decision as
# the next slice (strategy / decision memo only;
# no implementation).
#
# No runtime behavior changes. No source files
# under packages/ modified. No publication surface
# modified. No CapabilityMap mutation. No
# CapabilityPhraseReport mutation. No
# .rekon/capability-contracts.json mutation. No
# npm publish. No version bump.
#
# See docs/strategy/capability-contract-publication-safety-review.md.
#
# CapabilityContract publication surfacing has
# shipped. Thirty-fifth slice on the
# capability-ontology track. Product capability
# batch. Architecture summary + agent contract
# publishers now render a read-only Capability
# Contracts section sourced from the latest
# CapabilityContract.
#
# Pinned verbatim:
#   - CapabilityContract is policy visibility only.
#   - Publications read latest CapabilityContract.
#   - Publications do not generate CapabilityContract.
#   - Publications do not mutate
#     .rekon/capability-contracts.json.
#   - Surfacing does not enforce architecture
#     linting, resolver routing, verification
#     planning, source writes, finding resolution,
#     or RefactorPreservationContract behavior.
#   - Proof report surfacing remains deferred.
#
# Recommended next slice: CapabilityContract
# publication safety review.
#
# No new permission. No new artifact type. No
# CapabilityContract mutation. No config mutation.
# No npm publish. No version bump.
#
# See docs/concepts/architecture-summary-publication.md
# and docs/concepts/agent-operating-contract.md.
#
# CapabilityContract v1 safety review has shipped.
# Thirty-fourth slice on the capability-ontology
# track. Strategy / safety-review batch. Read-only
# end-to-end audit of the v1 artifact, helper,
# validator, config model, and CLI shipped at
# 63e7b71.
#
# Pinned verbatim:
#   - CapabilityContract is policy, not projection.
#   - CapabilityMap v2 remains projection.
#   - CapabilityContract v1 emits configured and
#     unmatched rows only; suggested remains
#     reserved.
#   - CapabilityContract v1 does not implement
#     architecture linting, resolver routing,
#     verification planning, source writes, or
#     RefactorPreservationContract behavior.
#   - The next slice may surface CapabilityContract
#     in publications, but must not create policy
#     enforcement.
#
# Recommendation: declare v1 safe / stable as an
# artifact-backed policy layer. Ship publication
# surfacing as the next slice -- read-only
# visibility in architecture summary + agent
# contract, on the same model used by the
# CapabilityMap v2 publication safety review.
#
# No runtime behavior changes. No source files
# under packages/ modified. No artifact validator,
# helper, or CLI command modified. No publication
# surface modified. No CapabilityMap mutation. No
# CapabilityPhraseReport mutation. No
# .rekon/capability-contracts.json mutation. No
# npm publish. No version bump.
#
# See docs/strategy/capability-contract-v1-safety-review.md.
# Recommended next slice: CapabilityContract
# publication surfacing.
#
# CapabilityContract v1 implementation has shipped.
# Thirty-third slice on the capability-ontology
# track. Registers the CapabilityContract artifact
# in @rekon/kernel-repo-model + SDK + runtime
# (category "actions"). Ships
# buildCapabilityContract in @rekon/capability-model
# and the new CLI command:
#
#   rekon capability contract generate \
#     [--root <path>] \
#     [--json] \
#     [--capability-map <id|type:id>]
#
# Reads the latest (or specified) CapabilityMap v2
# plus an optional .rekon/capability-contracts.json
# config and emits the effective contract artifact.
# Missing config is allowed. V1 emits configured +
# unmatched rows only; suggested is reserved for
# future. Match is conjunctive (verb + noun
# required; domain / pattern / layer checked when
# populated); most-specific match wins; ties break
# by phrase-backed id asc. Citation chain
# (CapabilityContract -> CapabilityMap ->
# CapabilityPhrase -> EvidenceGraph) preserved on
# every configured row.
#
# Diagnostic only -- no architecture linting, no
# resolver routing by capability, no verification
# planning by capability, no source mutation, no
# config mutation. No publication surfacing yet.
# No npm publish. No version bump.
#
# See docs/artifacts/capability-contract.md and
# docs/concepts/capability-contracts.md.
# Recommended next slice: CapabilityContract v1
# safety review.
#
# CapabilityContract Architecture Decision has
# shipped. Strategy / architecture decision / docs
# / tests-only batch. Thirty-second slice on the
# capability-ontology track. Commits Rekon to
# Option B: CapabilityContract is an
# artifact-backed policy layer generated from
# operator config (.rekon/capability-contracts.json)
# + the latest CapabilityMap v2. Decision memo
# only -- no implementation, no artifact
# registration, no producer or helper shipped.
#
# Pinned verbatim:
#   - CapabilityContract is policy, not
#     projection.
#   - CapabilityMap v2 remains projection and must
#     not grow policy fields.
#   - CapabilityContract does not implement
#     architecture linting by itself.
#   - CapabilityContract does not implement
#     resolver routing by capability.
#   - CapabilityContract does not implement
#     verification planning by capability.
#   - CapabilityContract does not implement source
#     writes.
#   - RefactorPreservationContract remains
#     phase-specific and comes later.
#
# Five options evaluated:
#   - reserve name only (rejected/deferred; boundary
#     is clear enough to model);
#   - config + artifact effective contract
#     (selected; operator policy + artifact
#     audit);
#   - artifact-only inferred contract (rejected;
#     projection would become policy);
#   - add policy fields to CapabilityMap (rejected;
#     blurs projection and policy);
#   - only inside RefactorPreservationContract
#     (rejected; policy should exist before
#     refactor phase).
#
# Decision details:
#   - Config sketch at
#     .rekon/capability-contracts.json with
#     match{verb, noun, domain?, pattern?, layer?},
#     allowedLayers[], forbiddenLayers[],
#     allowedSystems[], forbiddenSystems[],
#     requiredChecks[], requiredNeighbors[],
#     forbiddenNeighbors[], preservationRules[].
#     Missing config allowed. No inferred contract
#     is binding without explicit operator
#     authorisation.
#   - Artifact sketch: header + source + summary +
#     contracts[] with capabilityRef.capabilityMapRef
#     + capabilityRef.phraseCapabilityId + status
#     (configured / suggested / unmatched). V1
#     emits only configured + unmatched; suggested
#     is deferred until a suggestion / review
#     workflow ships.
#   - All future consumers (architecture linting,
#     resolver routing, verification planning,
#     semantic impact, refactor preservation,
#     publication surfacing) deferred until the
#     contract artifact exists and passes safety
#     review.
#
# No implementation. No CapabilityContract artifact
# / type / helper shipped. No CapabilityMap
# mutation. No EvidenceGraph /
# CapabilityNormalizationReport /
# CapabilityPhraseReport mutation. No npm publish.
# No version bump.
#
# New strategy memo
# docs/strategy/capability-contract-architecture-decision.md
# with 11 required headings + 3 required tables
# (option / boundary / consumer). New 16-assertion
# docs test
# tests/docs/capability-contract-architecture-decision.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-contract-architecture-decision.md.
#
# Recommended next slice: CapabilityContract v1
# implementation -- register the artifact type in
# @rekon/kernel-repo-model + SDK + runtime; ship a
# producer that reads
# .rekon/capability-contracts.json (when present)
# and the latest CapabilityMap v2 and emits the
# effective contract artifact. Emits configured +
# unmatched rows only. No publication surfacing
# yet. No linting / routing / verification /
# writes.
#
# CapabilityMap v2 publication safety review has
# shipped. Strategy / safety review / docs /
# tests-only batch. Thirty-first slice on the
# capability-ontology track. Read-only audit of
# the publication surfacing committed by the
# thirtieth slice. Recommendation: publication
# surfacing is safe / stable as read-only
# visibility. No blockers. Next slice:
# CapabilityContract architecture decision.
#
# Pinned verbatim:
#   - CapabilityMap v2 publication surfacing is
#     read-only visibility.
#   - CapabilityMap v2 phrase-backed capabilities
#     are projection context, not
#     CapabilityContract policy.
#   - CapabilityMap v2 phrase-backed capabilities
#     do not imply resolver routing, architecture
#     linting, verification planning, source-write
#     permission, or finding resolution.
#   - Proof report surfacing remains deferred
#     because CapabilityMap v2 is semantic
#     projection, not verification proof.
#   - CapabilityContract decision work may begin
#     after this safety review if no blockers are
#     found.
#
# Review findings:
#   - Helper is pure (no fs.write*,
#     artifacts.write, spawn*, LLM, or network
#     call). Both publishers strictly read-only
#     over CapabilityMap + upstream artifacts.
#   - Boundary statement rendered in every shipped
#     surface (architecture summary level 2;
#     agent contract level 3) and emitted even
#     when v2 fields are absent.
#   - Agent contract Do Not Do reminder covers
#     CapabilityContract policy, resolver routing
#     authority, architecture lint findings,
#     verification requirements, and source-write
#     permission. Finding resolution noted as a
#     low-priority follow-up.
#   - Proof report deferral remains correct.
#
# Four options evaluated: declare surfacing safe
# / stable (selected); CapabilityContract
# decision next (selected); more publication
# polish first (deferred -- no blocker); resolver
# routing next (rejected -- needs
# CapabilityContract first).
#
# New strategy memo
# docs/strategy/capability-map-v2-publication-safety-review.md.
# New 13-assertion docs test
# tests/docs/capability-map-v2-publication-safety-review.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-map-v2-publication-safety-review.md.
#
# No runtime changes. No publisher mutation. No
# CapabilityMap mutation. No CapabilityContract
# introduced. No architecture linting. No
# resolver routing. No verification planning. No
# source writes. No LLM-only inference. No npm
# publish. No version bump.
#
# Recommended next slice: CapabilityContract
# architecture decision -- strategy / decision
# memo only. Pins policy / placement /
# preservation semantics. No implementation, no
# linting, no routing, no verification planning,
# no source writes.
#
# CapabilityMap v2 publication surfacing has
# shipped. Product / capability batch. Thirtieth
# slice on the capability-ontology track. The
# architecture summary and agent contract
# publications now render the additive
# phraseBackedCapabilities /
# phraseBackedSummary / phraseSourceRef
# projection as operator + agent context.
#
# Pinned verbatim:
#   - Architecture summary and agent contract
#     surface CapabilityMap v2.
#   - Proof report surfacing is deferred.
#   - Publications read CapabilityMap v2 fields.
#   - Publications do not mutate CapabilityMap.
#   - Phrase-backed capabilities are projection
#     context, not CapabilityContract policy.
#   - Phrase-backed capabilities do not imply
#     resolver routing, architecture linting,
#     verification planning, or source writes.
#
# Implementation details:
#   - New helper
#     buildCapabilityMapV2PublicationSection in
#     @rekon/capability-docs. Structurally typed
#     (CapabilityMapV2Like); pure function. Emits
#     section header, CapabilityMap ref,
#     CapabilityPhraseReport ref, summary counts,
#     top-verb / top-noun lines, explicit
#     boundary statement, proof-report-deferral
#     line, and a bounded table (capped at 20
#     rows).
#   - Wired into the architecture summary
#     publisher (## level) and agent contract
#     publisher (### level), after the existing
#     Capability Phrases section.
#   - Agent contract Do-Not-Do list extended with
#     a v2-specific reminder. Existing
#     CapabilityPhraseReport Do-Not-Do entry
#     updated to acknowledge v2 has shipped.
#   - Proof report surfacing is explicitly
#     deferred (documented in proof report
#     concept + artifact reference).
#   - New 16-assertion contract test
#     tests/contract/capability-map-v2-publications.test.mjs.
#   - New 9-assertion docs test
#     tests/docs/capability-map-v2-publications.test.mjs.
#   - Review packet
#     .rekon-dev/review-packets/capability-map-v2-publications.md.
#
# No runtime changes outside the new publication
# helper. No CapabilityMap mutation. No
# CapabilityPhraseReport /
# CapabilityNormalizationReport / EvidenceGraph
# mutation. No CapabilityContract. No resolver
# routing by capability. No architecture linting.
# No verification planning by capability. No
# source writes. No LLM-only inference. No new
# artifact type. No new invalidation rule. No
# npm publish. No version bump.
#
# Recommended next slice: CapabilityMap v2
# publication safety review -- read-only audit
# of the publication surfacing (boundary
# statements, read-only guarantee, proof-report
# deferral).
#
# CapabilityMap v2 safety review has shipped.
# Strategy / safety review / docs / tests-only
# batch. Twenty-ninth slice on the capability-
# ontology track. Read-only audit of the additive
# phraseBackedCapabilities / phraseBackedSummary /
# phraseSourceRef projection committed by the
# twenty-eighth slice. Recommendation: safe /
# stable as additive high-confidence projection.
# No blockers. Next slice: publication surfacing.
#
# Pinned verbatim:
#   - CapabilityMap v2 is additive; existing
#     entries[] remain valid.
#   - CapabilityMap v2 consumes CapabilityPhraseReport,
#     not raw CapabilityNormalizationReport rows.
#   - Partial phrases are excluded from
#     phraseBackedCapabilities.
#   - CapabilityMap v2 is not CapabilityContract.
#   - CapabilityMap v2 does not imply placement
#     policy, ownership policy, resolver routing,
#     architecture linting, verification planning,
#     or source writes.
#
# Review findings:
#   - Projection path walked end-to-end
#     (CapabilityPhraseReport ->
#     buildPhraseBackedCapabilityMapAdditions ->
#     CapabilityMap). Each step's boundary holds.
#   - Eligibility filter enforced at three layers
#     (helper guard, validator guard, TypeScript
#     literal types). Raw normalization rows
#     cannot leak into v2.
#   - Citation chain complete and walkable
#     (entry -> phrase -> candidate -> fact).
#   - Freshness model sufficient
#     (capability-phrases.changed invalidation
#     rule + digest tracking on inputRefs).
#   - Boundary preservation: v1 entries[]
#     compatibility, projection vs policy, no
#     source writes -- all hold.
#
# Five options evaluated: declare v2 safe / stable
# selected; publication surfacing selected as next
# slice; CapabilityContract deferred; resolver
# routing deferred; more dogfood before surfacing
# deferred.
#
# New strategy memo
# docs/strategy/capability-map-v2-safety-review.md.
# New 14-assertion docs test
# tests/docs/capability-map-v2-safety-review.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-map-v2-safety-review.md.
#
# No runtime changes. No CapabilityMap mutation.
# No EvidenceGraph / CapabilityNormalizationReport
# / CapabilityPhraseReport mutation. No
# CapabilityContract. No architecture linting. No
# resolver routing. No verification planning. No
# source writes. No LLM-only inference. No npm
# publish. No version bump.
#
# Recommended next slice: CapabilityMap v2
# publication surfacing -- extend
# @rekon/capability-docs with a
# buildCapabilityMapV2PublicationSection (or
# equivalent) helper, wire it into the
# architecture summary + agent contract
# publishers, contract + docs tests, cite this
# safety review as the gate.
#
# CapabilityMap v2 high-confidence-only implementation
# has shipped. Product / capability batch. Twenty-eighth
# slice on the capability-ontology track. Implements
# the additive v2 projection committed to by the
# twenty-seventh slice's decision memo.
#
# Pinned verbatim:
#   - CapabilityMap v2 consumes CapabilityPhraseReport,
#     not raw CapabilityNormalizationReport rows.
#   - Only stable high-confidence CapabilityPhrase
#     claims are eligible for CapabilityMap v2.
#   - Partial phrases remain semantic context and are
#     not CapabilityMap-ready ownership or placement
#     policy.
#   - CapabilityMap v2 is not CapabilityContract.
#   - CapabilityMap v2 is additive and existing
#     CapabilityMap fields remain valid.
#   - CapabilityMap should be stale when the consumed
#     CapabilityPhraseReport changes.
#
# Implementation details:
#   - CapabilityMap gains three optional fields:
#     phraseBackedCapabilities,
#     phraseBackedSummary, phraseSourceRef. v1
#     entries[] is unchanged and continues to
#     validate.
#   - @rekon/capability-model projector reads the
#     latest CapabilityPhraseReport (when present),
#     filters phrases conjunctively (status stable,
#     confidence high, evidenceRefs non-empty,
#     sourceCandidateIds non-empty, verb + noun
#     present), and emits the additive v2 fields.
#   - Deterministic ordering: verb asc, noun asc, id
#     asc. Summary record keys (byVerb / byNoun)
#     sorted alphabetically.
#   - Entries carry deterministic IDs
#     capability-phrase:<phraseId>. Each entry cites
#     its source phrase via phraseRef.report +
#     phraseRef.phraseId. The top-level
#     phraseSourceRef mirrors the consumed report
#     ref. CapabilityMap.header.inputRefs includes
#     the consumed phrase report.
#   - Manifest invalidation rule
#     capability-phrases.changed consumes
#     CapabilityPhraseReport. Absence of a
#     CapabilityPhraseReport is benign -- the
#     projector emits a clean v1-shape
#     CapabilityMap.
#   - New artifact reference doc
#     docs/artifacts/capability-map.md.
#   - Validator: optional v2 fields are validated
#     when present (non-empty evidenceRefs,
#     non-empty sourceCandidateIds, literal
#     confidence "high" and status "stable").
#   - @rekon/capability-model does not depend on
#     @rekon/capability-ontology. The phrase-backed
#     helper uses structural typing
#     (PhraseReportLike) against the documented
#     phrase-report JSON shape.
#
# No EvidenceGraph mutation. No
# CapabilityNormalizationReport mutation. No
# CapabilityPhraseReport mutation. No existing v1
# entries[] field removed, renamed, or changed in
# behaviour. No partial-phrase consumption. No
# low-confidence-phrase consumption. No raw
# normalization row consumption. No
# CapabilityContract. No RefactorPreservationContract.
# No architecture linting. No resolver routing. No
# verification planning. No source writes. No
# LLM-only inference. No npm publish. No version
# bump. No git tag. No GitHub Release. No new
# branch.
#
# New contract test
# tests/contract/capability-map-v2.test.mjs (19
# assertions). New 11-assertion docs test
# tests/docs/capability-map-v2.test.mjs. Review
# packet
# .rekon-dev/review-packets/capability-map-v2-high-confidence-implementation.md.
#
# Recommended next slice: CapabilityMap v2
# high-confidence-only safety review -- a read-only
# audit of the additive projection (eligibility
# enforcement, citation chain walkability, freshness
# semantics, structural-typing boundary,
# CapabilityContract gap).
#
# CapabilityMap v2 high-confidence-only decision has
# shipped. Strategy / architecture / docs / tests-only
# batch. Twenty-seventh slice on the capability-
# ontology track. Commits Rekon to an additive
# CapabilityMap v2 projection consuming only stable
# high-confidence CapabilityPhraseReport claims,
# using the evidence from the twenty-sixth-slice
# cohort re-run.
#
# Pinned verbatim:
#   - CapabilityMap v2 consumes CapabilityPhraseReport,
#     not raw CapabilityNormalizationReport rows.
#   - Only stable high-confidence CapabilityPhrase
#     claims are eligible for CapabilityMap v2.
#   - Partial phrases remain semantic context and
#     are not CapabilityMap-ready ownership or
#     placement policy.
#   - CapabilityMap v2 is not CapabilityContract.
#   - CapabilityMap v2 is additive and existing
#     CapabilityMap fields remain valid.
#   - CapabilityMap should be stale when the
#     consumed CapabilityPhraseReport changes.
#
# Decision details:
#   - Five options evaluated; Option B (additive
#     stable-phrase-backed v2) selected.
#   - Section name: phraseBackedCapabilities (not
#     normalizedCapabilities; the map projects
#     phrases, not normalization rows).
#   - Eligibility (conjunctive): phrase status
#     stable, confidence high, evidenceRefs non-
#     empty, sourceCandidateIds non-empty, verb +
#     noun present, canonical-vocabulary lookup
#     succeeds.
#   - Additive shape sketched but not implemented:
#     optional phraseBackedCapabilities,
#     phraseBackedSummary, phraseSourceRef on
#     CapabilityMap. v1 entries[] stays untouched.
#   - Freshness: capability-phrases.changed
#     invalidation rule (implementation manifest)
#     so CapabilityMap is stale when the upstream
#     phrase report changes. Stale phrase report
#     treated as missing for v2 emission.
#   - Citation chain: CapabilityMap v2 entry ->
#     CapabilityPhrase -> CapabilityNormalizationReport
#     candidate -> EvidenceGraph fact, fully
#     walkable.
#
# CapabilityContract boundary explicitly pinned: v2
# surfaces capabilities (read-only projection);
# CapabilityContract (future) sets policy (required
# checks, allowed layers, allowed neighbours,
# preservation rules). The two are distinct
# surfaces; this decision does not create or mutate
# CapabilityContract.
#
# No CapabilityMap implementation in this batch.
# No CapabilityMap mutation. No EvidenceGraph
# mutation. No CapabilityNormalizationReport
# mutation. No CapabilityPhraseReport mutation. No
# partial-phrase consumption. No CapabilityContract.
# No RefactorPreservationContract. No architecture
# linting. No resolver routing. No source writes. No
# LLM-only inference. No typechecker dependency. No
# npm publish. No version bump. No git tag. No
# GitHub Release. No new branch.
#
# Documentation gap noted: docs/artifacts/capability-map.md
# does not exist; the implementation slice creates
# it (the artifact reference must reflect the v2
# shape the implementation finalises).
#
# New strategy memo:
# docs/strategy/capability-map-v2-high-confidence-decision.md
# with 11 required headings + 4 required tables
# (evidence / option / eligibility / boundary). New
# 16-assertion docs test
# tests/docs/capability-map-v2-high-confidence-decision.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-map-v2-high-confidence-decision.md.
#
# Recommended next slice: CapabilityMap v2 high-
# confidence-only implementation -- extends the
# CapabilityMap type in @rekon/kernel-repo-model,
# updates @rekon/capability-model to read the
# latest CapabilityPhraseReport and emit the
# additive section, adds the
# capability-phrases.changed invalidation rule,
# ships contract tests, and creates
# docs/artifacts/capability-map.md.
#
# Post-AST cohort re-run has shipped. Strategy /
# dogfood-analysis / docs / tests-only batch.
# Twenty-sixth slice on the capability-ontology
# track. Fifth coverage review on the phrase track.
# Completed the cohort intake request the
# twenty-fifth slice deferred: measured AST
# extraction's impact on CapabilityNormalizationReport
# candidate quality and CapabilityPhraseReport
# stable phrase density on the two real-repo cohort
# targets (target-1, target-2) using anonymized
# labels only.
#
# Headline numbers (post-AST, real repos):
#   - target-1 (Next.js TS scale): 10,331 facts
#     (9,653 AST = 93.4%, 0 regex-fallback), 9,327
#     candidates, 299 normalized, 37 stable phrases,
#     260 partial. Stable pairs include get:response
#     (14), build:plan (13), get:schema (12),
#     get:session (10), save:response (8),
#     build:report (8) -- textbook capability
#     phrases.
#   - target-2 (small TS + workflows): 587 facts
#     (404 AST = 68.8%), 406 candidates, 12
#     normalized, 2 stable, 10 partial. Stable
#     pair: test:session (2).
#
# Pre/post lift:
#   - target-1 stable phrases: 16 -> 37 (+131.3%,
#     2.3x lift).
#   - target-1 normalized: 241 -> 299 (+24.1%).
#   - target-1 total phrases: 239 -> 297 (+24.3%).
#   - target-2: all metrics unchanged; no
#     regression.
#
# Pinned verbatim:
#   - Real cohort targets were re-run.
#   - AST improved stable phrase density on a real
#     repo.
#   - CapabilityMap v2 is evidence-gated.
#   - Partial phrases alone do not justify
#     CapabilityMap v2.
#
# Seven readiness gates evaluated:
#   1. stable phrase density materially improved ->
#      pass on target-1; neutral on target-2.
#   2. stable evidence refs present -> pass.
#   3. stable terms meaningful -> pass.
#   4. partials not used for CapabilityMap -> pass.
#   5. publications understandable -> pass.
#   6. artifacts validate clean -> pass.
#   7. consistent across more than one real repo ->
#      partial (one strong positive, one neutral,
#      no regression).
#
# Overall verdict: readiness gate's narrower-
# evidence escape clause is explicitly invoked.
# CapabilityMap v2 design is ready to begin. The
# CapabilityMap v2 high-confidence-only decision
# memo is the primary next slice.
#
# Options considered:
#   - CapabilityMap v2 high-confidence-only decision
#     memo -> selected as primary next slice.
#   - Normalization consumes AST metadata (candidate
#     extractor weights by symbolKind / exportKind)
#     -> selected as parallel polish lane.
#   - JS/TS AST Provider v2 construct coverage ->
#     deferred (stable density bottleneck is
#     canonical vocabulary, not AST coverage).
#   - More dogfood (third real repo) -> deferred.
#   - Canon-pack expansion v2 -> deferred.
#
# Privacy: deliverables use anonymized target-1 /
# target-2 labels only. No private repo names
# appear in any artifact.
#
# No runtime change. No AST extraction change. No
# normalizer change. No phrase projection change.
# No canon-pack change. No CapabilityMap mutation.
# No EvidenceGraph mutation. No
# CapabilityNormalizationReport mutation. No
# CapabilityPhraseReport mutation. No new artifact
# registration. No new CLI command. No source
# writes. No LLM-only inference. No typechecker
# dependency. No npm publish. No version bump. No
# git tag. No GitHub Release. No new branch.
#
# New strategy memo:
# docs/strategy/post-ast-cohort-rerun.md with 15
# required headings + 7 required tables. New
# 15-assertion docs test
# tests/docs/post-ast-cohort-rerun.test.mjs. Review
# packet
# .rekon-dev/review-packets/post-ast-cohort-rerun.md.
#
# Recommended next slice: CapabilityMap v2
# high-confidence-only decision memo -- pin
# status === stable + confidence === high as the
# only eligibility criterion for CapabilityMap v2
# projection, select v2 shape additively over the
# existing v1 projection, pin no source writes / no
# LLM-only inference / no EvidenceGraph mutation.
#
# Post-AST CapabilityPhraseReport Coverage Review has
# shipped. Strategy / dogfood-analysis / docs /
# tests-only batch. Twenty-fifth slice on the
# capability-ontology track. Fourth coverage review on
# the phrase track. Measured AST extraction's impact
# on CapabilityNormalizationReport candidate quality
# and CapabilityPhraseReport stable phrase density on
# available targets.
#
# Headline numbers (post-AST):
#   - tests/fixtures/js-ts-ast-evidence: 80 facts
#     (56 AST, 0 regex-fallback), 66 candidates, 8
#     normalized, 6 stable phrases, 2 partial, 0
#     low-confidence. Stable pairs: create:user,
#     fetch:user, handle:request.
#   - examples/simple-js-ts: 5 facts (2 AST), 4
#     candidates, 0 normalized, 0 stable. Unchanged
#     from pre-AST baseline; the fixture is too
#     small (1 file, 1 export) to exercise AST
#     richness. AST and regex agree on minimal
#     structure -- the expected signal.
#   - target-1 and target-2: unavailable in this
#     session. Pre-AST baseline (target-1: 9,110
#     candidates / 241 normalized / 16 stable;
#     target-2: 408 candidates / 12 normalized / 2
#     stable) recorded for context. Intake request
#     issued inside the memo for post-AST re-runs.
#
# Pinned verbatim:
#   - AST extraction was measured.
#   - Stable phrase density materially improved on
#     the AST fixture.
#   - CapabilityMap v2 is evidence-gated.
#   - Partial phrases alone do not justify
#     CapabilityMap v2.
#
# Seven readiness gates evaluated:
#   1. stable phrase density materially improved ->
#      partial (fixture only).
#   2. stable evidence refs present -> pass.
#   3. stable terms meaningful -> pass.
#   4. partials not used for CapabilityMap -> pass.
#   5. publications understandable -> pass.
#   6. artifacts validate clean -> pass.
#   7. consistent across more than one real repo ->
#      fail (target-1/2 not measured this session).
#
# Overall verdict: CapabilityMap v2 design remains
# deferred. Narrower evidence accepted. The cohort
# re-run is the primary next slice.
#
# Options considered:
#   - CapabilityMap v2 high-confidence-only ->
#     deferred (real-repo evidence missing).
#   - Normalization consumes AST metadata -> selected
#     as parallel polish lane.
#   - Phrase projection consumes AST metadata ->
#     deferred.
#   - JS/TS AST Provider v2 construct coverage ->
#     deferred (wait for real-repo evidence).
#   - More dogfood (post-AST cohort re-run) ->
#     selected as primary next slice.
#
# No runtime change. No AST extraction change. No
# normalizer change. No phrase projection change. No
# canon-pack change. No CapabilityMap mutation. No
# EvidenceGraph mutation. No CapabilityNormalizationReport
# mutation. No CapabilityPhraseReport mutation. No new
# artifact registration. No new CLI command. No source
# writes. No LLM-only inference. No typechecker
# dependency. No npm publish. No version bump. No git
# tag. No GitHub Release. No new branch.
#
# New strategy memo:
# docs/strategy/post-ast-capability-phrase-coverage-review.md
# with 11 required headings + 7 required tables
# (target / EvidenceGraph / normalization / phrase /
# pre-post comparison / readiness / option). New
# 15-assertion docs test
# tests/docs/post-ast-capability-phrase-coverage-review.test.mjs.
# Review packet
# .rekon-dev/review-packets/post-ast-capability-phrase-coverage-review.md.
#
# Recommended next slice: Post-AST cohort re-run --
# re-execute the refresh + normalize + phrase project
# + publish + validate matrix against target-1 and
# target-2 once those targets are available. Gates
# CapabilityMap v2 design.
#
# JS/TS AST EvidenceGraph Provider v1 has shipped.
# Runtime implementation slice. Twenty-fourth slice on
# the capability-ontology track. Upgrades
# @rekon/capability-js-ts so JS/TS evidence extraction
# uses the TypeScript compiler parser API as the
# primary path. Regex extraction is preserved as
# labelled fallback only.
#
# Implementation details:
#   - New packages/capability-js-ts/src/ast-extractor.ts
#     module. Parser-only (ts.createSourceFile +
#     ts.forEachChild). No Program, no typechecker, no
#     tsconfig resolution. Emits typed records
#     (AstSymbolRecord, AstExportRecord, AstImportRecord).
#   - packages/capability-js-ts/src/index.ts rewires
#     the per-file pipeline: AST-first, regex-fallback
#     on parser failure.
#   - typescript: ^5.4.5 added to
#     @rekon/capability-js-ts dependencies.
#   - Existing fact kinds (file, import, export,
#     symbol, ownership_hint, capability_hint)
#     unchanged. AST v1 enriches value payloads with
#     additive optional fields: extractionMethod,
#     language, syntaxKind, symbolKind/exportKind/
#     importKind, location, confidence.
#   - Dedupe semantics preserved: export/symbol value
#     omits location (matches legacy regex); import
#     value retains location + legacy line.
#   - __extractRegexFallbackFactsForTesting exported
#     as @internal for contract tests.
#
# Pinned verbatim:
#   - JS/TS AST extraction is primary where available.
#   - Regex extraction is fallback only.
#   - The selected parser is the TypeScript compiler
#     parser API.
#   - V1 is parser-only; typechecker semantics are
#     deferred.
#   - AST facts use extractionMethod ast.
#   - Fallback facts use extractionMethod
#     regex-fallback.
#   - Call graph is deferred.
#   - EvidenceGraph remains the repo-agnostic
#     protocol.
#   - AST v1 should improve CapabilityNormalizationReport
#     candidate quality.
#   - AST v1 may improve CapabilityPhraseReport
#     stable phrase density.
#   - AST v1 does not mutate CapabilityMap.
#
# Construct coverage in v1: function declarations,
# class declarations, class methods, arrow-function
# assignments, function-expression assignments,
# interfaces, type aliases, enum declarations, named
# exports, default exports, re-exports (export { x }
# + export * from + export * as alias from),
# type-only imports + exports, namespace imports,
# side-effect imports, import equals (CommonJS-style).
# Call graph, type resolution, symbol references,
# inferred return types, side-effect analysis, JSX
# component tree, test-to-source map, schema
# inference all deferred.
#
# No EvidenceGraph schema mutation. No
# CapabilityNormalizationReport mutation. No
# CapabilityPhraseReport mutation. No CapabilityMap
# mutation. No new fact kinds. No new artifact
# registration. No new CLI command. No source
# writes. No LLM-only inference. No typechecker
# dependency. No npm publish. No version bump. No
# git tag. No GitHub Release. No new branch.
#
# Public API additions (all additive):
#   - @rekon/capability-js-ts re-exports
#     AstConfidence, AstExportKind, AstImportKind,
#     AstLanguage, AstSymbolKind type aliases.
#   - @rekon/capability-js-ts now declares
#     typescript: ^5.4.5 in dependencies.
#   - EvidenceGraph import/export/symbol value
#     payloads carry optional extractionMethod,
#     language, syntaxKind, symbolKind/exportKind/
#     importKind, location, confidence fields.
#     Older artifacts validate unchanged.
#
# New test fixture
# tests/fixtures/js-ts-ast-evidence/ (7 source files
# + package.json). New 25-assertion contract test
# tests/contract/js-ts-ast-evidence-provider.test.mjs.
# New 9-assertion docs test
# tests/docs/js-ts-ast-evidence-provider.test.mjs.
# Review packet
# .rekon-dev/review-packets/js-ts-ast-evidence-provider-v1.md.
#
# Recommended next slice: Post-AST
# CapabilityPhraseReport Coverage Review - measure
# CapabilityNormalizationReport candidate quality and
# CapabilityPhraseReport stable phrase density
# before/after AST extraction on fixture + target-1
# + target-2. Decides whether CapabilityMap v2
# design can begin.
#
# JS/TS AST Evidence Adapter Decision has shipped.
# Strategy / architecture / docs / tests-only batch.
# Twenty-third slice on the capability-ontology track.
# Follows the Classic Scanner/Ontology Parity Audit and
# commits Rekon to upgrading JS/TS evidence extraction
# from regex-only to AST-backed.
#
# Decision summary:
#   - Parser: TypeScript compiler parser API
#     (ts.createSourceFile, ts.forEachChild). First-
#     party, parses TS/TSX/JS/JSX with one API surface,
#     no native compilation step, no tsconfig
#     resolution required.
#   - Parser-only v1 boundary: AST node kinds are
#     captured; no typechecker semantics, no cross-file
#     type resolution, no call graph.
#   - EvidenceGraph fact model: existing fact kinds
#     (file, import, export, symbol, ownership_hint,
#     capability_hint) remain unchanged. AST v1
#     enriches the value payloads of symbol / export /
#     import with proposed additive optional fields:
#     extractionMethod, language, syntaxKind,
#     symbolKind, exportKind, importKind, location,
#     confidence. Additive only; old facts validate;
#     no new fact kind.
#   - Construct coverage in v1: function declarations,
#     class declarations, class methods, arrow-function
#     assignments, function-expression assignments,
#     interface declarations, type aliases, enums,
#     named exports, default exports, re-exports,
#     type-only imports, type-only exports, namespace
#     imports, side-effect imports. Call graph, type
#     resolution, symbol references, inferred return
#     types, side-effect analysis, JSX component tree,
#     test-to-source map, schema inference are deferred.
#   - Regex fallback policy: regex fires only on AST
#     parse failure or unsupported file extension. AST
#     facts carry confidence high; fallback facts carry
#     confidence low or medium.
#
# Pinned verbatim:
#   - JS/TS AST extraction should be primary where
#     available.
#   - Regex extraction is fallback only.
#   - The selected parser is the TypeScript compiler
#     parser API.
#   - V1 is parser-only; typechecker semantics are
#     deferred.
#   - AST facts use extractionMethod ast.
#   - Fallback facts use extractionMethod
#     regex-fallback.
#   - Call graph is deferred.
#   - EvidenceGraph remains the repo-agnostic
#     protocol.
#   - AST v1 should improve CapabilityNormalizationReport
#     candidate quality.
#   - AST v1 should improve CapabilityPhraseReport
#     stable phrase density.
#   - AST v1 does not mutate CapabilityMap.
#
# Implementation sequence after this decision:
#   1. JS/TS AST EvidenceGraph Provider v1 (runtime
#      implementation in @rekon/capability-js-ts).
#   2. Post-AST coverage review (fourth coverage review
#      on the phrase track).
#   3. CapabilityMap v2 high-confidence-only design
#      decision (gated on post-AST coverage).
#
# No runtime change. No @rekon/capability-js-ts runtime
# behavior change. No EvidenceGraph schema mutation
# beyond documenting proposed additive fields. No
# CapabilityNormalizationReport mutation. No
# CapabilityPhraseReport mutation. No CapabilityMap
# mutation. No new artifact registration. No new CLI
# command. No source writes. No LLM-only inference. No
# typechecker dependency. No npm publish. No version
# bump. No git tag. No GitHub Release. No new branch.
#
# New strategy memo:
# docs/strategy/js-ts-ast-evidence-adapter-decision.md
# with 14 required headings + 3 required tables
# (option / construct coverage / fallback). New
# 18-assertion docs test
# tests/docs/js-ts-ast-evidence-adapter-decision.test.mjs.
# Review packet
# .rekon-dev/review-packets/js-ts-ast-evidence-adapter-decision.md.
#
# Recommended next slice: JS/TS AST EvidenceGraph
# Provider v1 - runtime implementation in
# @rekon/capability-js-ts. Emits AST symbol / import /
# export facts with extractionMethod metadata. Retains
# regex extraction as fallback. No typechecker
# semantics. No CapabilityMap mutation. No
# CapabilityPhraseReport shape change. No
# CapabilityNormalizationReport semantics change.
#
# Classic scanner / ontology parity audit has shipped.
# Strategy / architecture / docs / tests-only batch.
# Twenty-second slice on the capability-ontology track.
# Reverses the recent posture of solving the ontology /
# scanner problem from scratch and treats
# codebase-intel-classic as design prior art per ADR 0004
# (reference, not dependency).
#
# Maps classic's scanner pipeline (source scan -> AST
# parse -> ExtractedName -> SplitName -> taxonomy
# discovery -> hierarchy -> runtime normalization ->
# GraphOntologyValidator) and ontology / taxonomy
# pipeline (lib/verb-rules.ts, lib/noun-rules.ts,
# domain/ontology/mergeOntology.ts,
# infra/repositories/TaxonomyRepository.ts) against
# Rekon's current EvidenceGraph /
# CapabilityNormalizationReport / CapabilityPhraseReport
# pipeline.
#
# Pinned verbatim:
#   - codebase-intel is design prior art.
#   - JS/TS AST extraction should be primary where
#     available.
#   - Regex extraction is fallback, not primary, for
#     JS/TS.
#   - EvidenceGraph remains the repo-agnostic protocol.
#   - GraphOntologyValidator should not be ported
#     wholesale.
#   - Classic taxonomy extraction / split / discovery /
#     normalization should be adapted.
#   - CapabilityMap v2 should wait until post-AST
#     coverage is measured.
#
# Parity matrix decisions:
#   - ExtractedName / SplitName -> adapt (needs AST
#     extraction to be strong).
#   - Taxonomy discovery -> adapt (deferred artifact).
#   - Verb / noun aliases -> repeat (shipped).
#   - Base + workspace ontology merge -> repeat
#     (shipped).
#   - synonymsApplied -> adapt (per-candidate shipped;
#     aggregate is a future polish).
#   - GraphOntologyValidator monolith -> reject
#     wholesale (per the lite audit).
#   - AST-backed scanner -> adapt (the next product
#     slice).
#   - TaxonomyRepository standalone persistence layer ->
#     reject (artifact store already covers
#     persistence).
#
# No runtime change. No CapabilityMap mutation. No
# CapabilityPhraseReport shape change. No
# CapabilityNormalizationReport semantics change. No
# EvidenceGraph mutation. No phrase projection rule
# change. No canon-pack change. No splitter change. No
# new artifact registration. No new CLI command. No
# source writes. No LLM-only inference. No npm publish.
# No version bump. No git tag. No GitHub Release. No
# new branch.
#
# New strategy memo:
# docs/strategy/classic-scanner-ontology-parity-audit.md
# with 15 required headings + 3 required tables (classic
# method / scanner parity / next-step decision). New
# 13-assertion docs test
# tests/docs/classic-scanner-ontology-parity-audit.test.mjs.
# Review packet
# .rekon-dev/review-packets/classic-scanner-ontology-parity-audit.md.
#
# Implementation sequence after this audit:
#   1. JS/TS AST Evidence Adapter Decision (next).
#   2. JS/TS AST EvidenceGraph Provider v1 (runtime).
#   3. Post-AST coverage review.
#   4. CapabilityMap v2 high-confidence-only design
#      decision.
#
# Recommended next slice: JS/TS AST Evidence Adapter
# Decision - strategy memo that picks a parser
# (TypeScript compiler API, ts-morph, swc, or
# alternative), defines emitted EvidenceGraph fact
# shapes, pins fallback behaviour for non-JS/TS targets
# and AST-unavailable environments (regex stays
# available as fallback), pins per-fact confidence
# metadata, and pins no source writes, no LLM-only
# inference, no type-checker dependency in v1.
#
# CapabilityPhraseReport post-quality coverage review has
# shipped. Strategy / dogfood-analysis / docs / tests-only
# batch. Third coverage review on the phrase track.
# Measured fixture (examples/simple-js-ts) + target-1
# (real Next.js TS) + new target-2 (real small TS +
# workflows).
#
# Three-stage comparison on target-1:
#   stable: 16 → 16 → 16 (UNCHANGED across all three
#     coverage reviews)
#   total: 16 → 239 → 239
#   unknown: 4,088 → 4,088 → 3,865
#   ignored: 226 → 226 → 449
#   normalized: 241 → 241 → 241
#
# target-2 (new): 408 candidates, 12 normalized (2.9%),
#   2 stable + 10 partial.
#
# Cross-target verdict: stable density is consistently
# sparse (0.18% on target-1, 0.49% on target-2). Three
# coverage reviews + two runtime slices (enrichment v1 +
# candidate-quality v1) have not moved the stable
# foundation. The bottleneck is the evidence model
# itself - symbol/export names alone do not yield enough
# verb:noun pairs that match a canonical capability
# vocabulary on real repos.
#
# Pinned verbatim:
#   - Candidate-quality improvements reduced unknown
#     noise.
#   - Stable phrase count remained unchanged.
#   - CapabilityMap v2 is evidence-gated.
#   - Partial phrases alone do not justify CapabilityMap
#     v2.
#
# Seven readiness gates evaluated; six pass; the seventh
# (stable density sufficient for canonical projection)
# fails.
#
# Options considered:
#   - CapabilityMap v2 high-confidence-only -> still
#     deferred (stable count unchanged across two real
#     repos).
#   - Phrase enrichment v2 -> deferred (parallel; does
#     not move stable count).
#   - Candidate extraction improvements -> deferred
#     (parallel; secondary to architecture review).
#   - Canon-pack expansion v2 -> deferred (parallel).
#   - Repo-agnostic purpose understanding architecture
#     review -> SELECTED as next slice.
#   - More dogfood -> deferred (parallel).
#
# No runtime change. No CapabilityMap mutation. No
# CapabilityPhraseReport shape change. No phrase
# projection rule change. No canon-pack change. No
# splitter change. No new artifact registration. No
# new CLI command. No source writes. No LLM-only
# inference. No npm publish. No version bump. No git
# tag. No GitHub Release. No new branch.
#
# New strategy memo:
# docs/strategy/capability-phrase-post-quality-coverage-review.md
# with 15 required headings + 7 required tables. New
# 15-assertion docs test
# tests/docs/capability-phrase-post-quality-coverage-review.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-phrase-post-quality-coverage-review.md.
#
# Recommended next slice: repo-agnostic purpose
# understanding architecture review - strategy memo
# surveying deterministic evidence sources beyond
# symbol/export names. Output drives the next product
# slice (phrase enrichment v2, candidate extraction, or
# canon-pack expansion v2) and pins the gates
# CapabilityMap v2 must hit on a fourth coverage review.
#
# Capability ontology candidate-quality improvements v1
# has shipped. Product capability batch. Two
# deterministic improvements to the
# CapabilityNormalizationReport pipeline:
#
# 1. Canon-pack confirmation - the four observed-frequent
#    nouns (schema, request, response, plan) and three
#    verbs (save, get, build) are confirmed already
#    canonical in the base pack. No new canonical entries
#    added; no duplicates introduced.
# 2. Lexical splitter sharpening - the splitter now emits
#    a structural kind hint ("name" | "path"). Path-shaped
#    names (containing / or bare file extensions like
#    .tsx) are classified as `ignored` rather than
#    `unknown`. Single-token names whose token is a known
#    canonical noun receive a precise low-confidence
#    message (Known noun "X" without a verb; insufficient
#    for a capability phrase.). No canonical verb is
#    invented.
#
# Pinned verbatim:
#   - Candidate-quality improvements are deterministic.
#   - Canon-pack additions are evidence-backed.
#   - Lexical splitter sharpening reduces noise.
#   - Noun-only candidates do not become phrases.
#   - Stable phrase threshold remains unchanged.
#   - CapabilityMap integration remains deferred.
#
# Measured on target-1:
#   - unknown 4,088 -> 3,865 (-223 path-shaped candidates
#     correctly reclassified).
#   - ignored 226 -> 449 (+223).
#   - normalized 241 -> 241 (unchanged).
#   - lowConfidence 2,054 -> 2,054 (unchanged).
#   - Stable phrases 16 -> 16 (UNCHANGED).
#   - Total phrases 239 -> 239 (UNCHANGED).
#
# Public API additions (all additive):
#   - CapabilityNameSplitKind = "name" | "path" (new
#     exported type alias).
#   - CapabilityNameSplit.kind (new required field on
#     the split result).
#   - CapabilityCandidate.raw.splitKind (new optional
#     field; older artifacts continue to validate).
#
# No CapabilityMap mutation. No CapabilityPhraseReport
# shape change. No phrase projection rule change. No
# CapabilityNormalizationReport semantics change. No
# EvidenceGraph mutation. No new artifact registration.
# No new CLI command. No source reads. No AST/
# typechecker/LLM evidence. No source writes. No npm
# publish. No version bump. No git tag. No GitHub
# Release. No new branch.
#
# New strategy memo:
# docs/strategy/capability-ontology-candidate-quality-v1.md.
# New 16-assertion contract test
# tests/contract/capability-ontology-candidate-quality.test.mjs.
# New 9-assertion docs test
# tests/docs/capability-ontology-candidate-quality.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-ontology-candidate-quality-v1.md.
#
# Recommended next slice: CapabilityPhraseReport
# post-quality coverage review - re-run fixture +
# target-1 + at least one additional cohort target to
# decide whether the CapabilityMap v2 design can begin.
#
# CapabilityPhraseReport enrichment coverage review has
# shipped. Strategy / dogfood-analysis / docs / tests-only
# batch. Measured phrase output AFTER Phrase Enrichment
# v1 on the fixture (examples/simple-js-ts) and one real,
# anonymized Next.js TypeScript target (target-1).
#
# Before / after on target-1:
#   - total phrases: 16 -> 239 (+1394%)
#   - stable phrases: 16 -> 16 (UNCHANGED)
#   - partial phrases: 0 -> 223 (new)
#   - withDomain: 0 -> 239 (100% of phrases)
#   - withPattern: 0 -> 0 (upstream ObservedRepo projector
#     limitation)
#   - withLayer: 0 -> 95 (40% of phrases)
#
# Verdict: phrase enrichment v1 materially improved
# coverage for publication and agent-context use, but the
# stable phrase count is unchanged at 16. The stable
# threshold remains strict, as designed. CapabilityMap v2
# STAYS DEFERRED. The bottleneck is upstream: 97.4% of
# candidates are not normalized at all.
#
# Pinned verbatim:
#   - Phrase enrichment materially improved coverage.
#   - The stable threshold remains unchanged.
#   - Partial phrases alone do not justify CapabilityMap
#     v2.
#   - CapabilityMap v2 is evidence-gated.
#
# Seven readiness gates evaluated; six pass; the seventh
# (stable coverage sufficient for canonical projection)
# has not moved since the pre-enrichment review.
#
# Options considered:
#   - CapabilityMap v2 high-confidence-only -> still
#     deferred (stable count unchanged).
#   - Phrase enrichment v2 -> deferred (parallel; raises
#     pattern coverage, secondary to candidate-quality).
#   - Candidate-quality improvements -> selected as next
#     slice (canon-pack expansion + lexical-splitter
#     sharpening to raise normalized count).
#   - More dogfood -> deferred (parallel).
#   - Projection-rule hardening -> rejected (partial
#     output is meaningful; no rule-hardening needed).
#
# No runtime change. No CapabilityMap mutation. No
# CapabilityPhraseReport shape change. No phrase
# projection rule change. No canon-pack change (canon-
# pack expansion is the NEXT slice; this review only
# recommends it). No new artifact registration. No new
# CLI command. No source writes. No LLM-only inference.
# No npm publish. No version bump. No git tag. No
# GitHub Release. No new branch.
#
# New strategy memo:
# docs/strategy/capability-phrase-enrichment-coverage-review.md
# with 14 required headings + 6 required tables (target /
# normalization / phrase / enrichment / readiness /
# option). New 14-assertion docs test
# tests/docs/capability-phrase-enrichment-coverage-review.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-phrase-enrichment-coverage-review.md.
#
# Recommended next slice: candidate-quality improvements
# - canon-pack expansion of frequently-appearing
# partial-only verb/noun pairs (save:schema (24),
# save:request (16), get:response (14), build:plan (13)
# etc.) + lexical-splitter sharpening for unknown-verb /
# unknown-noun candidates. A third coverage review
# measures the delta.
#
# CapabilityPhraseReport phrase enrichment v1 has shipped.
# Product capability batch. The phrase projection helper
# (buildCapabilityPhraseReport in
# @rekon/capability-ontology) now consumes optional
# ObservedRepo + OwnershipMap artifacts and populates
# domain / pattern / layer enrichment fields when
# deterministic context is available. The CLI
# `rekon capability phrase project` reads the latest
# enrichment artifacts automatically; missing context is
# not a failure.
#
# Verdict: coverage on target-1 rose from 16 stable
# phrases (the safety-review baseline) to 239 total (16
# stable + 223 partial; 0 low-confidence) on the same
# input — a 15x yield increase with the stable threshold
# unchanged.
#
# Pinned verbatim:
#   - Phrase enrichment v1 uses deterministic artifact
#     context.
#   - The stable threshold is unchanged.
#   - Partial phrases are semantic context, not
#     CapabilityMap-ready placement or ownership policy.
#   - domain / pattern / layer can be enriched
#     deterministically from ObservedRepo + OwnershipMap.
#   - sideEffects / inputs / outputs remain deferred.
#   - CapabilityMap integration remains deferred.
#
# Enrichment sources (deterministic only):
#   - OwnershipMap.entries[] path-prefix match ->
#     ownerSystem becomes phrase.domain; layer becomes
#     phrase.layer.
#   - ObservedRepo.systems[] longest path-prefix match
#     -> id becomes fallback domain; kind (route /
#     service / ui / module / infra) maps to
#     phrase.pattern; single-layer systems contribute
#     fallback layer.
#   - Empty / "unknown" / "none" values are treated as
#     non-enriching at the source.
#
# Status model:
#   - stable: strictest, threshold unchanged. Eligible
#     for future CapabilityMap v2.
#   - partial: semantic context only. Emits only when at
#     least one deterministic enrichment field is
#     present. Not CapabilityMap-ready.
#   - low-confidence: reserved; not emitted in v1.
#
# buildCapabilityPhraseReport now accepts optional
# observedRepo / observedRepoRef / ownershipMap /
# ownershipMapRef. CLI JSON output gains an additive
# contextRefs field. CLI human output adds an
# `Enrichment: withDomain N, withPattern N, withLayer N`
# line.
#
# No CapabilityMap mutation. No CapabilityPhraseReport
# shape change. No CapabilityNormalizationReport
# semantics change. No EvidenceGraph mutation. No new
# artifact registration. No new CLI command. No source
# reads. No AST/typechecker/LLM evidence. No source
# writes. No version bump. No npm publish. No git tag.
# No GitHub Release. No new branch.
#
# New strategy memo:
# docs/strategy/capability-phrase-enrichment-v1.md. New
# 22-assertion contract test
# tests/contract/capability-phrase-enrichment.test.mjs.
# New 10-assertion docs test
# tests/docs/capability-phrase-enrichment.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-phrase-enrichment-v1.md.
#
# Recommended next slice: CapabilityPhraseReport
# enrichment coverage review - re-measure stable +
# partial yield, withDomain / withPattern / withLayer
# ratios, and publication usefulness on the fixture +
# at least one real cohort target.
#
# CapabilityPhraseReport real-repo coverage review has
# shipped. Strategy / dogfood-analysis / docs / tests-only
# batch. Measured phrase output on a fixture
# (examples/simple-js-ts) and one real, anonymized
# Next.js TypeScript target (target-1).
#
# Results:
#   - fixture: 4 candidates, 0 normalized, 0 phrases
#     (strict v1 rules hold).
#   - target-1: 9,110 candidates, 241 normalized, 524
#     alias-applied, 16 stable phrases.
#   - stable phrase ratios: 16 / 9,110 = 0.18% of
#     candidates; 16 / 241 = 6.6% of normalized.
#   - every phrase carries an EvidenceGraph ref;
#     status="stable", confidence="high"; no enrichment
#     fields populated (withDomain 0, withPattern 0,
#     withLayer 0 — v1 deferred behavior intact).
#
# Verdict: phrase quality is high; phrase coverage is
# sparse. CapabilityMap v2 remains deferred.
#
# Pinned verbatim:
#   - CapabilityMap v2 is evidence-gated.
#   - Stable high-confidence phrases were measured on a
#     real repo.
#   - Unknown / low-confidence rows remain excluded from
#     phrases and from any future CapabilityMap v2.
#
# Readiness gates (six total):
#   - real-repo non-trivial stable phrases: pass
#     (sparse).
#   - evidence refs present: pass (16/16).
#   - unknown / low-confidence excluded: pass.
#   - publications understandable: pass.
#   - artifacts validate clean: pass.
#   - phrase coverage sufficient for a useful canonical
#     projection: fail (0.18% too sparse).
#
# Options considered:
#   - CapabilityMap v2 high-confidence-only → deferred
#     (needs richer phrase yield).
#   - Phrase enrichment v1 → selected as next slice.
#   - Candidate-quality improvements → deferred
#     (parallel).
#   - Canon-pack expansion → deferred (parallel).
#   - More dogfood → deferred (parallel).
#
# No runtime change. No CapabilityMap mutation. No
# CapabilityPhraseReport shape change. No phrase
# projection rule change. No canon-pack change. No new
# artifact registration. No new CLI command. No source
# writes. No LLM-only inference. No npm publish. No
# version bump. No git tag. No GitHub Release. No new
# branch.
#
# New strategy memo:
# docs/strategy/capability-phrase-report-coverage-review.md
# with 13 required headings + 5 required tables (target /
# normalization / phrase / readiness / option). New
# 12-assertion docs test
# tests/docs/capability-phrase-report-coverage-review.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-phrase-report-coverage-review.md.
#
# Recommended next slice: phrase enrichment v1 — add
# deterministic domain / pattern / layer enrichment from
# ObservedRepo + OwnershipMap; allow partial phrases to
# emit; keep stable reserved for the strictest case
# (CapabilityMap v2-eligible).
#
# CapabilityPhraseReport safety review has shipped.
# Strategy / docs / tests-only batch. End-to-end review
# of the CapabilityNormalizationReport ->
# CapabilityPhraseReport -> architecture summary / agent
# contract publication surfacing path.
#
# Verdict: CapabilityPhraseReport is safe and stable as
# the semantic purpose projection layer. CapabilityMap v2
# stays deferred until one real-repo phrase coverage
# review measures stable-phrase quality.
#
# Pinned verbatim:
#   - CapabilityPhraseReport is semantic purpose
#     projection, not ownership or placement policy.
#   - CapabilityNormalizationReport remains the
#     translation audit.
#   - CapabilityMap integration remains deferred until
#     phrase coverage is measured on real repos.
#   - Proof report surfacing remains deferred because
#     phrase projection is semantic context, not
#     verification proof.
#   - Only stable high-confidence phrases are eligible
#     for future CapabilityMap v2.
#
# Options considered:
#   - Approve unconditional CapabilityMap v2 work
#     (rejected — no real-repo coverage measured yet).
#   - Phrase coverage review (selected as next slice).
#   - Add phrase enrichment first (deferred — coverage
#     data should land first to pick the right
#     enrichment).
#   - Reserve CapabilityContract sooner (deferred —
#     stays a reserved name until phrases stabilize).
#
# No runtime change. No CapabilityMap mutation. No
# phrase projection rule change. No new artifact
# registration. No new CLI command. No source writes.
# No LLM-only inference. No npm publish. No version
# bump. No git tag. No GitHub Release. No new branch.
#
# New strategy memo:
# docs/strategy/capability-phrase-report-safety-review.md
# with 14 required headings + 3 required diagnostic
# tables (projection path / option / boundary). New
# 12-assertion docs test
# tests/docs/capability-phrase-report-safety-review.test.mjs.
# Review packet
# .rekon-dev/review-packets/capability-phrase-report-safety-review.md.
#
# Recommended next slice: CapabilityPhraseReport
# real-repo coverage review — measure phrase count per
# archetype, stable-phrase ratio, evidence-ref
# distribution, and publication usefulness on the
# fixture + at least one real cohort target.
#
# CapabilityPhraseReport v1 has shipped. First runtime
# implementation of the Layer 5b semantic-purpose-
# projection carrier the architecture + carrier decisions
# reserved.
#
# Behaviour:
#   - Consumes the latest CapabilityNormalizationReport.
#   - Projects high-confidence normalized candidates into
#     stable CapabilityPhrase entries.
#   - Emits a phrase only when status="normalized" +
#     confidence="high" + high-confidence lexical split.
#     Unknown / ignored / low-confidence rows remain in
#     the audit artifact and never project.
#   - Every emitted phrase has status="stable" in v1;
#     partial / low-confidence reserved.
#   - Deterministic ids (phrase-<candidate-id>-<verb>-<noun>)
#     and ordering (path -> verb -> noun -> candidate id).
#   - Each phrase cites sourceCandidateIds + evidenceRefs.
#   - The report cites CapabilityNormalizationReport (and
#     EvidenceGraph when upstream cites it) in
#     header.inputRefs.
#   - Read-only with respect to upstream artifacts.
#
# Pinned verbatim:
#   - CapabilityNormalizationReport remains the
#     translation audit.
#   - CapabilityPhraseReport is the semantic purpose
#     projection.
#   - CapabilityMap integration remains deferred — v2
#     will consume CapabilityPhraseReport, not raw
#     normalization rows.
#   - AST / typechecker evidence is optional enrichment,
#     not foundational truth.
#   - No LLM-only inference.
#   - Source writes remain unavailable.
#
# New exports from @rekon/capability-ontology:
# CapabilityPhrase, CapabilityPhraseConfidence,
# CapabilityPhraseStatus, CapabilityPhraseReportSummary,
# CapabilityPhraseReport, BuildCapabilityPhraseReportInput,
# buildCapabilityPhraseReport, validateCapabilityPhraseReport.
#
# @rekon/sdk.BUILT_IN_ARTIFACT_TYPES gains
# CapabilityPhraseReport (schemaVersion 0.1.0,
# experimental). @rekon/runtime.ARTIFACT_CATEGORY_BY_TYPE
# maps CapabilityPhraseReport: projections.
#
# CLI: rekon capability phrase project --report
# <CapabilityNormalizationReport-id|type:id> [--root <path>]
# [--json]
#
# No CapabilityNormalizationReport shape mutation. No
# CapabilityMap mutation. No EvidenceGraph mutation. No
# source writes. No LLM-only inference. No version bump.
# No npm publish.
#
# See docs/artifacts/capability-phrase-report.md.
# Recommended next slice: CapabilityPhraseReport
# publication surfacing — render phrase summary in
# architecture summary + agent contract publications.
#
# CapabilityPhraseReport decision has shipped (strategy /
# decision / docs / tests-only). Commits to the carrier
# the architecture decision deferred.
#
# Selected: Option B — emit CapabilityPhrase v1 as a
# separate CapabilityPhraseReport artifact, not
# enrichment of CapabilityNormalizationReport.
# Rejected: Option A (enrich the normalization report)
# and Option C (wait / defer).
#
# Pinned verbatim:
#   - CapabilityNormalizationReport is a translation
#     audit.
#   - CapabilityPhraseReport is a semantic purpose
#     projection.
#   - CapabilityMap v2 should consume
#     CapabilityPhraseReport (not raw normalization
#     rows).
#   - Only high-confidence / stable CapabilityPhrase
#     claims are eligible for CapabilityMap v2.
#   - CapabilityContract is the future policy /
#     preservation layer (not implemented in
#     CapabilityPhraseReport v1).
#   - AST / typechecker evidence is optional
#     enrichment, not foundational truth.
#   - CapabilityPhrase v1 must remain repo / language /
#     architecture agnostic.
#   - Source writes remain unavailable.
#
# V1 field policy:
#   - Required: id, verb, noun, confidence,
#     evidenceRefs, sourceCandidateIds, status.
#   - Partial (v1): qualifier, domain, pattern, layer,
#     message.
#   - Reserved (future): sideEffects, inputs, outputs.
#   - Future fields appear only when deterministic
#     evidence exists. No vibes-driven inference.
#
# No runtime change. No new artifact registration. No
# CapabilityNormalizationReport shape mutation. No
# CapabilityMap mutation. No EvidenceGraph mutation. No
# source writes. No LLM-only inference. No version
# bump. No npm publish.
#
# See docs/strategy/capability-phrase-report-decision.md
# Recommended next slice: CapabilityPhraseReport v1 —
# register the artifact, implement deterministic
# projection from high-confidence
# CapabilityNormalizationReport candidates, cite
# normalization + EvidenceGraph in inputRefs.
#
# CapabilityPhrase + CapabilityContract architecture
# decision has shipped (strategy / architecture / docs /
# tests-only). Reserves the semantic primitive every
# later capability-ontology layer depends on.
#
# Pinned verbatim:
#   - CapabilityPhrase is the intermediate semantic
#     unit between CapabilityNormalizationReport and
#     CapabilityMap v2.
#   - CapabilityPhrase is different from a normalized
#     verb/noun. It enriches the canonical pair with
#     optional qualifier / domain / pattern / layer
#     plus reserved future sideEffects / inputs /
#     outputs, and required confidence + evidenceRefs.
#   - CapabilityContract is the future policy /
#     preservation layer; it binds a phrase to allowed
#     layers / required checks / required + forbidden
#     neighbours / preservation rules. NOT the same as
#     RefactorPreservationContract (a phase-specific
#     projection of contract policy onto a refactor).
#   - CapabilityMap v2 should consume only stable,
#     confidence-scored CapabilityPhrase claims.
#   - AST / typechecker evidence is optional
#     enrichment, not foundational truth.
#   - Repo / language / architecture agnostic evidence
#     is required.
#   - Source writes remain unavailable.
#
# Use cases unlocked once phrases ship: architecture
# linting, naming honesty, overloaded-file detection,
# resolver routing, verification planning, semantic
# impact analysis, memory anchoring, refactor
# preservation, docs / publication clustering, and
# CapabilityMap v2.
#
# No runtime change. No new artifact registration. No
# CapabilityMap mutation. No CapabilityNormalizationReport
# mutation. No EvidenceGraph mutation. No source-write
# apply. No AST-first assumption. No LLM-only
# inference. No version bump. No npm publish.
#
# See docs/strategy/capability-phrase-contract-architecture-decision.md
# Recommended next slice: CapabilityPhrase v1 artifact /
# report decision — Option A (enrich
# CapabilityNormalizationReport), Option B (new
# CapabilityPhraseReport), or Option C (wait).
# Preferred: Option B.
#
# Capability ontology canon packs v1 has shipped.
# First implementation slice on the canon + override
# model. Rekon now compiles every
# EffectiveCapabilityOntology from built-in canon
# packs plus optional repo-local overrides:
#   - four built-in packs: base (always), nextjs-app,
#     library-package, monorepo;
#   - canonical override path:
#     .rekon/capability-ontology.overrides.json;
#   - legacy compatibility: when overrides is absent,
#     the loader falls back to
#     .rekon/capability-ontology.json (when both
#     exist, the canonical file wins and the report
#     records legacyOverrideIgnored: true);
#   - `extends` field for explicit overlay selection
#     in the override file; otherwise Rekon
#     conservatively auto-detects overlays from
#     package.json + repo paths;
#   - suggestion-preview target is the canonical
#     overrides path (not the legacy config);
#   - `EffectiveCapabilityOntology.source` records
#     basePack / overlayPacks / overridePath /
#     overrideHash / overrideKind /
#     legacyOverrideIgnored / systemSeedCount;
#   - override behaviors: canonical terms extend
#     canon; aliases supersede on key collision;
#     noise suppresses suggestion noise (not raw
#     evidence);
#   - no override-file mutation, no CapabilityMap
#     mutation, no EvidenceGraph mutation, no
#     source writes, no LLM normalization, no
#     version bump, no npm publish.
# See docs/concepts/capability-ontology.md and
# docs/artifacts/capability-normalization-report.md.
# Recommended next slice: canon-pack coverage review
# (re-run normalization against fixtures + a real
# repo and compare unknown / low-confidence rates).
#
# Capability ontology canon + override model
# decision has shipped (strategy / decision / docs /
# tests-only). Replaces the prior "manual config
# authoring guide is the steady-state model"
# direction. Pinned verbatim:
#   CapabilityOntology is not user-authored from
#   scratch. CapabilityOntology is Rekon-provided
#   canon + repo-local overrides.
# Selects Option C: built-in canonical ontology
# packs (`base` + archetype overlays) +
# repo-local overrides file. v1 ship set: `base`,
# `nextjs-app`, `library-package`, `monorepo`.
# Override file rename target for the
# canon-packs-v1 implementation slice:
# .rekon/capability-ontology.overrides.json.
# Override behaviors: canonical terms extend
# canon; aliases supersede on key collision;
# noise suppresses suggestion noise (not raw
# evidence). Rejects manual editing as
# steady-state model, rejects one-global-ontology
# direction, rejects LLM normalization.
# Operator-approved override apply command
# remains deferred behind its own decision memo +
# pre/post diff artifact + safety review.
# **No canonical packs implementation yet. No
# override apply command yet. No
# .rekon/capability-ontology.json mutation. No
# normalizer behavior change. No CapabilityMap
# mutation. No EvidenceGraph mutation. No
# source-write apply. No LLM-only normalization.
# No version bump. No npm publish.** The
# existing authoring guide + review-loop
# quickstart remain available as fallback /
# emergency manual references. See
# docs/strategy/capability-ontology-canon-override-model-decision.md.
# Recommended next slice: capability ontology
# canon packs v1.
#
# Capability ontology config authoring guide +
# review-loop quickstart have shipped (docs / support /
# tests-only). Two new operator-facing docs:
#   docs/beta/capability-ontology-config-authoring-guide.md
#   docs/beta/capability-ontology-review-loop-quickstart.md
# Documents the full manual operator path:
#   refresh -> normalize -> review unknowns -> decide -> suggest
#   -> inspect publications -> manually edit
#   .rekon/capability-ontology.json -> rerun normalize.
# Both docs pin verbatim:
#   - the config file is optional;
#   - Rekon never creates or mutates it automatically;
#   - JSON only in v1, no YAML;
#   - CapabilityOntologySuggestionReport is preview-only
#     and not applied vocabulary;
#   - CapabilityMap integration remains deferred;
#   - suggestions do not mutate config or CapabilityMap.
# Subsequently reframed as a fallback / emergency
# manual path by the canon + override model
# decision above.
#
# Capability ontology suggestion safety review
# has shipped (strategy / docs / tests-only).
# Reviews the full normalize -> review ledger ->
# suggestion report -> publication surfacing loop
# end-to-end. Pins verbatim:
#   - CapabilityOntologySuggestionReport entries
#     are preview-only and not applied vocabulary.
#   - No current ontology suggestion path mutates
#     .rekon/capability-ontology.json.
#   - No current ontology suggestion path mutates
#     CapabilityMap.
#   - Proof report surfacing remains deferred.
#   - CapabilityMap integration remains deferred.
# Decision: the workflow is safe / stable as a
# preview-only loop; manual editing of
# .rekon/capability-ontology.json remains the
# operator-control boundary; no operator-approved
# config apply command ships in this batch. See
# docs/strategy/capability-ontology-suggestion-safety-review.md.
#
# Capability ontology suggestion publication
# surfacing has shipped. The architecture summary
# and agent contract publishers now surface the
# latest CapabilityOntologySuggestionReport
# inline. The architecture summary renders a
# `## Capability Ontology Suggestions` section
# with summary counts and a bounded suggestion
# table; the agent contract renders a
# `### Capability Ontology Suggestions`
# subsection and adds a Do Not Do reminder pinning
# that suggestions are NOT applied vocabulary.
# Both publishers cite the source report in
# header.inputRefs. Read-only: publications never
# run the suggestions CLI, never mutate
# .rekon/capability-ontology.json, never mutate
# the review ledger, the suggestion report, or
# CapabilityMap. Proof report surfacing is
# deliberately deferred. See
# docs/artifacts/capability-ontology-suggestion-report.md.
#
# Capability ontology vocabulary expansion v1 has
# shipped. New artifact
# CapabilityOntologySuggestionReport (registered in
# the SDK + runtime, category actions). New CLI:
#   rekon capability ontology suggestions
#     [--ledger <CapabilityNormalizationReviewLedger:id>]
#     [--root <path>] [--json]
# Preview-only. .rekon/capability-ontology.json is
# NOT mutated automatically. Suggestion kinds:
# add-canonical-verb, add-canonical-noun,
# add-verb-alias, add-noun-alias. Candidate-level
# decisions are skipped in v1 with the reason
# "candidate-level decisions require manual ontology
# editing." CapabilityMap integration remains
# deferred. See
# docs/artifacts/capability-ontology-suggestion-report.md.
#
# Capability ontology unknown-term operator review
# surface has shipped (Option C from the coverage
# review). New artifact
# CapabilityNormalizationReviewLedger (registered in
# the SDK + runtime, category actions). New CLI
# subcommands:
#   rekon capability ontology review suggestions
#     --report <CapabilityNormalizationReport:id> [--limit n]
#     [--include-decided] [--json]
#   rekon capability ontology review decide
#     --term <text> --term-kind verb|noun|candidate
#     --decision extend-ontology|rename-symbol|noise-filter|defer
#     --reason <text> [--suggested-canonical <text>]
#     [--report <id|type:id>] [--candidate <id>] [--json]
#   rekon capability ontology review decisions [--json]
# Ledger is append-only. extend-ontology decisions do
# NOT automatically mutate .rekon/capability-ontology.json.
# CapabilityMap integration remains deferred. No LLM
# normalization. No source-write apply. See
# docs/artifacts/capability-normalization-review-ledger.md.
#
# Built-in baseline ontology coverage review has shipped
# at docs/strategy/builtin-ontology-coverage-review.md.
# Step 4 of the capability-ontology track implementation
# sequence. Ran the normalize CLI against the in-repo
# fixture examples/simple-js-ts (4 candidates) and an
# anonymized real-world Next.js TypeScript target
# labelled target-1 (9,110 candidates: 100 normalized,
# 5,558 unknown, 2,054 low-confidence, 226 ignored,
# 561 alias-applied). Pins: baseline acceptable for
# audit-only v1; baseline not yet sufficient for
# CapabilityMap v2; unknowns are dominated by symbol
# noise + lexical-split limitations rather than pure
# vocabulary gap. Selected next slice: Option C --
# capability ontology unknown-term operator review
# surface. Option A (vocabulary expansion) follows,
# gated on Option C. Option B (CapabilityMap v2)
# remains deferred.
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
