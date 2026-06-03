# Rekon

> **LLM-semantic parity decided (slice 143):** an audit of the old codebase-intel system separated Track A (finish LLM-backed semantic parsing — the one real non-embedding gap is per-file semantic file understanding) from Track B (embeddings, deferred). Semantic output stays proposal-not-proof; no approval/execution/source-writes/Circe. See [`classic-llm-semantic-parsing-parity-decision.md`](docs/strategy/classic-llm-semantic-parsing-parity-decision.md).

> **Semantic quality hardened (slice 142):** provider phases are re-checked against the source — unsupported touched paths and verification commands become findings + warnings, dropped non-goals are flagged, and a weak plan cannot become actionable by filling fields without source support. Deterministic recheck stays authoritative. See [`intent-plan-semantic-quality-hardening.md`](docs/strategy/intent-plan-semantic-quality-hardening.md).

> **Semantic quality proven (slice 141):** LLM-backed semantic normalization was dogfooded live (OpenAI `gpt-4o-mini`) — it extracts objectives/deliverables/acceptance/paths/commands and preserves non-goals with **zero invented paths or commands**, while staying a proposal that is schema-gated and deterministically rechecked. See [`intent-plan-semantic-quality-dogfood.md`](docs/strategy/intent-plan-semantic-quality-dogfood.md).

Rekon is an open-source intelligence substrate for codebases: evidence in,
typed artifacts out, extensible capabilities around a shared repository
intelligence snapshot.

Rekon is for codebase intelligence, repository intelligence,
architecture-aware agent context, and governance for AI-assisted software work.

> **Fresh-repo Circe dogfood (slice 140):** the full operator path (scan → review
> → answer → prepare → approve → status → handoff → bundle) was re-run on a fresh
> repo with semantic mode, and the bundle imported into a local Circe checkout —
> Rekon writes no source, runs no commands, and runs no Circe — see
> [`docs/strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](docs/strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md).

> **Semantic normalization (slice 139):** the intent plan compiler can route
> rough-plan normalization through an LLM provider (`createOpenAiLlmProvider`
> behind the shared `RekonLlmRouter`), selected via `--llm-provider` /
> `--llm-model` or `REKON_LLM_*` env. It is deterministic by default; LLM output
> is proposal, not proof — schema-validated and deterministically re-checked, with
> no source writes, command execution, Circe run, or `intent:go`. See
> [`docs/strategy/intent-plan-compiler-semantic-normalization-dogfood.md`](docs/strategy/intent-plan-compiler-semantic-normalization-dogfood.md).

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

node packages/cli/dist/index.js scan --root examples/simple-js-ts --json
node packages/cli/dist/index.js resolve preflight --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
node packages/cli/dist/index.js publish agents --root examples/simple-js-ts
```

`rekon scan` is the canonical first-run command: it initializes `.rekon/` if needed
and runs the full lifecycle (observe → project → snapshot →
evaluate → findings filter → findings filter-health → findings lifecycle → issues adjudicate → coherency delta →
publish architecture → artifacts validate → artifacts freshness) in one
step, then reports the post-scan next actions. `rekon refresh` is the expert /
compatibility update command that shares the same pipeline. Use the
individual verbs (`rekon observe`, `rekon project`, ...) when you need
to drive a single phase. See [docs/concepts/refresh.md](docs/concepts/refresh.md).

> **First run:** `rekon scan` is the canonical first-run command (implemented in Rekon
> First-Run Scan Implementation) — it initializes `.rekon/` if needed, runs the first (or a
> repeat) repository scan, and creates the first intelligence substrate; `refresh` is retained
> as an expert / compatibility update command, and docs / agent-context / verification options
> are offered only after the first scan. See
> [Rekon First-Run Scan / Install Onboarding Decision](docs/strategy/rekon-first-run-scan-onboarding-decision.md).

> **Fresh-repo intent preparation:** to prepare an intent plan on a fresh repo, run `rekon scan`
> then `rekon intent context prepare` (builds the StepCapabilityGraph + runtime/handoff context
> `rekon intent assess` needs — recorded as not-evaluated where there is no runtime/handoff event
> log) before `rekon intent assess`. The full path is `rekon scan → rekon intent context prepare
> → rekon intent assess → rekon intent prepare → rekon intent status → rekon intent work-order
> generate → rekon intent verification-plan generate → rekon intent bundle write`; the resulting
> `.rekon/intent/plans/<intent-id>/circe/` projection is handed to Circe. No manual
> `.rekon/artifacts` seeding is required.

> **Review a rough plan first:** `rekon intent plan review --plan <path>` compiles a raw or
> semi-structured plan into phase drafts and reports whether it is actionable / needs-revision /
> blocked — with findings, elicitation questions, and an operator-or-LLM revision prompt — before
> `rekon intent assess`. Then `rekon intent plan answer --report <ref> --answer <question-id>=<answer>`
> (or `--answers <json>`) merges your answers deterministically into a new `IntentPlanActionabilityReport`
> revision and re-scores it — closing the classic ask/answer loop without mutating the source report.
> The full plan-compiler loop (**review → answer → merge-back → prepare**) is proven end-to-end on a
> fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle
> handoff — see [plan-compiler-loop-closure](docs/strategy/plan-compiler-loop-closure.md).
> That path is dogfooded on a realistic fresh TypeScript package and confirmed Circe-importable
> end-to-end (boundaries explicit, source/plan files immutable, no Circe-run record, `intent:go`
> deferred) — see [fresh-repo-intent-handoff-circe-dogfood-review](docs/strategy/fresh-repo-intent-handoff-circe-dogfood-review.md).
> Semantic normalization is being generalized into a shared LLM provider router (task routes, injected
> adapters, `--llm-provider` / `--llm-model`): providers may read/transform/critique text but never
> approve/execute/write source/run Circe/implement `intent:go`, and LLM output is proposal, not proof —
> see [rekon-llm-provider-routing-semantic-normalization-decision](docs/strategy/rekon-llm-provider-routing-semantic-normalization-decision.md).
> The shared router shipped as `@rekon/llm-provider` and `rekon intent plan review` gained `--llm-provider` /
> `--llm-model` (no live provider yet; providers stay proposal-not-proof) —
> see [rekon-llm-provider-routing-implementation](docs/strategy/rekon-llm-provider-routing-implementation.md).
> Report-only: it writes one `IntentPlanActionabilityReport` and creates no
> downstream artifacts, runs no commands, and writes no source. See
> [the intent plan compiler](docs/concepts/intent-plan-compiler.md). The plan-compiler layer was
> safety-reviewed safe/stable as read / transform / report-only — see the
> [Intent Plan Actionability Report Safety Review](docs/strategy/intent-plan-actionability-report-safety-review.md).

> **Prepare respects plan actionability:** pass the report into preparation with
> `rekon intent prepare --assessment <ref> --actionability-report <ref>`. An **actionable** report may
> feed `PreparedIntentPlan` generation (its normalized phase drafts shape the prepared phases +
> verification requirements); a **needs-revision** / **blocked** report makes `intent prepare` write
> **no** `PreparedIntentPlan`, exit non-zero, and print the revision guidance — non-actionable plans are
> not silently prepared for approval. Prepare still does not auto-approve, creates no WorkOrder /
> VerificationPlan, executes no commands, and writes no source; `intent:go` remains deferred. See the
> [Intent Prepare Integration With Actionability Report](docs/strategy/intent-prepare-actionability-integration.md)
> memo, safety-reviewed safe/stable in the
> [Intent Prepare Actionability Integration Safety Review](docs/strategy/intent-prepare-actionability-integration-safety-review.md).

> **Answer / merge-back (decided, not yet built):** a future `rekon intent plan answer` will accept answers
> to a report's elicitation questions (tied by question id), deterministically merge them into the normalized
> phase drafts, re-run actionability, and write a **new** `IntentPlanActionabilityReport` revision — the source
> report and the plan file stay immutable, and an actionable revision feeds `intent prepare`. It approves
> nothing, writes no source, runs no commands, and `intent:go` stays deferred. See the
> [Plan Actionability Answer / Merge-Back Decision](docs/strategy/plan-actionability-answer-merge-back-decision.md).

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
# Capability Evidence Graph v1 has shipped.
# One-hundred-fifty-third slice on the semantic-intelligence track.
# New `CapabilityEvidenceGraph` kernel artifact (category graphs), a pure
# builder `buildCapabilityEvidenceGraph` in @rekon/capability-model, and a
# `rekon capability graph build [--path <file-or-dir>] [--root <path>] [--json]`
# command. The graph unifies file nodes, symbol nodes, and verb:noun capability
# nodes connected by evidence-backed claims: imports/exposes are deterministic
# facts (confidence 1.0); heuristic verb:noun capabilities are inferences
# (confidence <= 0.5); each claim cites a deterministic_scan evidence row.
# Deterministic facts are the substrate; LLM and embedding outputs are
# evidence-backed inferences that attach later. The factory forces all nine
# boundary booleans false and the validator rejects any non-false boundary: no
# LLM, no embeddings, no commands, no source writes, no PreparedIntentPlan /
# WorkOrder / VerificationPlan, no Circe, intent:go deferred. The graph is
# evidence-backed context, not proof by itself. See
# docs/artifacts/capability-evidence-graph.md,
# docs/concepts/capability-evidence-graph.md, and
# docs/strategy/capability-evidence-graph-v1.md.
# Recommended next slice: Capability Evidence Graph Safety Review.
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
# Classic Intent Plan Compiler / Elicitation Parity Decision has shipped.
# One-hundred-twenty-eighth slice on the codebase-intel-classic capability-ontology track.
# Strategy / architecture decision-only batch. A parity audit found the old codebase-intel system
# compiled and interrogated plans (intake sufficiency -> normalization into executable phase drafts ->
# per-phase actionability gates -> missing-info elicitation), a layer Rekon had not rebuilt.
#   - Selected the report-first IntentPlanActionabilityReport + rekon intent plan review: normalize a
#     plan and report exactly what must change (objective / deliverables / acceptance criteria / touched
#     paths / verification evidence / scope ambiguity / non-goals / evidence gates) before approval.
#   - LLM-backed semantic normalization is in scope (deterministic-first, bounded to read / transform /
#     critique / elicit; never execution) — Rekon's first model-calling capability in the intent pipeline.
#   - Report-only: no plan mutation, no source writes, no command execution, no Circe; missing required
#     fields become blocking findings; elicitation answer/merge-back deferred; intent:go deferred.
#   - Decision-only: memo (parity / option / boundary / selected-model tables) + review packet +
#     20-assertion docs test + doc pointers. No code, CLI, runtime, package, or version change; no npm publish.
#
# See docs/strategy/classic-intent-plan-compiler-elicitation-parity-decision.md.
# Recommended next slice: Intent Plan Actionability Report v1.
#
# Intent Status Work-Ready Transition Safety Review has shipped.
# One-hundred-twenty-seventh slice on the codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch confirming the slice-126 rekon intent status transition implementation.
#   - Reviewed safe/stable: the transition is explicit (approval never auto-transitions), writes a new
#     immutable IntentStatusReport revision, leaves the previous report and approved plan immutable,
#     rechecks prior status / freshness / runtime drift conservatively, carries acceptedRisks into proof,
#     and enables but does not create the WorkOrder / VerificationPlan handoffs.
#   - Creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands,
#     writes no source, runs no Circe; intent:go remains deferred.
#   - Review-only: memo + review packet + 26-assertion docs test + doc pointers. No code, CLI, runtime,
#     package, or version change; no npm publish.
#
# See docs/strategy/intent-status-work-ready-transition-safety-review.md.
# Recommended next slice: Fresh Repo Intent Handoff End-to-End Safety Review.
#
# Intent Status Work-Ready Transition Implementation has shipped.
# One-hundred-twenty-sixth slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch implementing the slice-125 decision (Option B).
#   - Adds rekon intent status transition --prepared-plan <ref> --previous-status <ref>
#     [--path-freshness <ref>] [--runtime-drift <ref>] --to work-ready --reason <text> [--root <path>]
#     [--json]: reads an approved PreparedIntentPlan plus the previous IntentStatusReport, rechecks
#     freshness / drift / status, and writes ONE new work-ready IntentStatusReport revision.
#   - Result: status.value=work-ready, recommendedNextAction=create-work-order. The previous report and
#     approved plan stay immutable; the transition creates no WorkOrder/VerificationPlan/VerificationRun/
#     VerificationResult, executes no commands, writes no source, runs no Circe; intent:go deferred.
#   - Additive kernel fields (source.approvedPreparedIntentPlanRef, source.previousIntentStatusReportRef,
#     proof.preparation.acceptedRisks) are backward compatible. A 35-assertion contract test + 14-assertion
#     docs test + doc pointers. No package or version change; no npm publish.
#
# See docs/strategy/intent-status-work-ready-transition-implementation.md.
# Recommended next slice: Intent Status Work-Ready Transition Safety Review.
#
# Intent Status Work-Ready Transition Decision has shipped.
# One-hundred-twenty-fifth slice on the codebase-intel-classic capability-ontology track.
# Strategy / architecture decision-only batch. Pins how an approved plan reaches work-ready status.
#   - Selected Option B — a future rekon intent status transition writes a NEW IntentStatusReport
#     work-ready revision after reading the approved PreparedIntentPlan and previous status report and
#     rechecking freshness / drift / status. The previous report stays immutable; approval does not
#     auto-transition status.
#   - Work-ready gate: approved + prepared plan, recorded acceptedRisks, workOrderAllowed /
#     verificationPlanAllowed true, sourceWriteAllowed false, traceable previous status, no new
#     high-severity freshness/drift, non-empty reason. Result: status.value=work-ready,
#     recommendedNextAction=create-work-order (existing enum values; no new value invented).
#   - Status transition may enable but does not create the WorkOrder / VerificationPlan handoffs;
#     creates no WorkOrder/VerificationPlan/VerificationRun/VerificationResult, executes no commands,
#     writes no source, runs no Circe; intent:go deferred.
#   - Decision-only: memo + review packet + 21-assertion docs test + doc pointers. No code, CLI,
#     runtime, package, or version change; no npm publish.
#
# See docs/strategy/intent-status-work-ready-transition-decision.md.
# Recommended next slice: Intent Status Work-Ready Transition Implementation.
#
# Intent Operator Approval / Proof Acceptance Safety Review has shipped.
# One-hundred-twenty-fourth slice on the codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch confirming the slice-123 rekon intent approve implementation.
#   - Declared safe/stable: approval is explicit (never auto-approved); accepted proof gaps are
#     recorded (not erased); approval writes a new approved PreparedIntentPlan revision while the source
#     draft stays immutable; freshness / runtime drift / IntentStatusReport are rechecked conservatively;
#     approval blocks unknown or missing required accepted gaps and empty approval reasons;
#     sourceWriteAllowed remains false.
#   - Approval may enable but does not create the WorkOrder / VerificationPlan handoffs; it creates no
#     WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no commands, writes
#     no source, runs no Circe; intent:go deferred.
#   - status-not-work-ready remains a separate downstream gate after approval.
#   - Docs-only: safety-review memo + review packet + 25-assertion docs test + doc pointers. No code,
#     CLI, runtime, package, or version change; no npm publish.
#
# See docs/strategy/intent-operator-approval-proof-acceptance-safety-review.md.
# Recommended next slice: Intent Status Work-Ready Transition Decision.
#
# Intent Operator Approval / Proof Acceptance Implementation has shipped.
# One-hundred-twenty-third slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch implementing the slice-122 decision.
#   - Adds rekon intent approve: reads a needs-review draft PreparedIntentPlan, verifies the operator
#     explicitly accepted the plan's known proof gaps (--accept <gap> with a required --reason),
#     rechecks freshness / runtime drift / status, and writes ONE new approved PreparedIntentPlan
#     revision. The source draft is never mutated and stays byte-identical.
#   - The approved revision sets status=prepared / next=create-work-order, approval.status=approved
#     (reasons gain explicit-operator-approval + manual-risk-acceptance), records accepted gaps as
#     approval.acceptedRisks[], and flips downstreamHandoff.workOrderAllowed / verificationPlanAllowed
#     to true while keeping sourceWriteAllowed the literal false.
#   - Additive kernel IntentOperatorAcceptedRisk type + optional approval.acceptedRisks field
#     (backward-compatible); pure buildApprovedPreparedIntentPlan helper; 36 contract + 11 docs assertions.
#   - Approval is never automatic, enables but does not create the handoffs, creates no
#     WorkOrder/VerificationPlan/VerificationRun/VerificationResult, executes no commands, writes no
#     source, runs no Circe; intent:go deferred. No package/version change; no npm publish.
#
# See docs/strategy/intent-operator-approval-proof-acceptance-implementation.md.
# Recommended next slice: Intent Operator Approval / Proof Acceptance Safety Review.
#
# Intent Operator Approval / Proof Acceptance Decision has shipped.
# One-hundred-twenty-second slice on the codebase-intel-classic capability-ontology track.
# Strategy / architecture decision-only batch. Pins the operator approval / proof-acceptance path.
#   - Selected Option B — a new approved PreparedIntentPlan revision (the source draft stays immutable).
#   - A future rekon intent approve rechecks freshness / drift / status and records operator-accepted
#     proof gaps before writing the approved plan.
#   - Approval is explicit (never auto-approved); accepts named gaps, does not erase them; may enable
#     WorkOrder / VerificationPlan handoff but does not create them.
#   - No VerificationRun/Result; no command execution; no source writes; intent:go deferred.
#   - Decision-only: no code, CLI, package, version, or behavior change.
#
# See docs/strategy/intent-operator-approval-proof-acceptance-decision.md.
# Recommended next slice: Intent Operator Approval / Proof Acceptance Implementation.
#
# Intent Prepare Needs-Review Planfulness Fix has shipped.
# One-hundred-twenty-first slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch. Fixes the fresh-repo intent-prepare planfulness gap.
#   - rekon intent prepare now produces an implementation-bearing DRAFT plan when intent assess is
#     needs-review with zero hard blockers (investigate / modify|refactor / verify / review).
#   - Draft verification requirements (npm run typecheck / npm test / npm run build) are derived from
#     package.json scripts and attached to the implementation + verify phases.
#   - The plan stays needs-review; approval is never auto-elevated; work-order + verification-plan
#     generation remain blocked until explicit approval.
#   - No commands execute; no VerificationRun/Result; no source writes; intent:go deferred.
#
# See docs/strategy/intent-prepare-needs-review-planfulness.md.
# Recommended next slice: Intent Operator Approval / Proof Acceptance Decision.
#
# Rekon Interactive Setup Prompt Decision has shipped.
# One-hundred-twentieth slice on the codebase-intel-classic capability-ontology track.
# Strategy / product-UX decision-only batch. Pins the interactive prompt policy for rekon setup.
#   - Selected Option B — TTY-only scan-first prompts: prompts only in human TTY mode; never in
#     --json / non-TTY / CI.
#   - Before scan, setup may ask only whether to run the first scan; after a snapshot, present
#     post-scan next actions as explicit choices (never auto-run).
#   - Decided (unimplemented) --yes runs the first scan only; no downstream actions; no prompt
#     persistence; setup never runs Circe, executes commands, or writes source; intent:go deferred.
#   - Decision-only: no code, CLI, dependency, version, or behavior change.
#
# See docs/strategy/rekon-interactive-setup-prompt-decision.md.
# Recommended next slice: Rekon Interactive Setup Prompt Implementation.
#
# Rekon Setup / Welcome UI Safety Review has shipped.
# One-hundred-nineteenth slice on the codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch. Reviews the slice-118 welcome/setup UI end-to-end.
#   - Confirmed safe/stable: rekon welcome is explanatory (not action-taking); rekon setup is
#     deterministic + non-interactive — does not run scan, does not create .rekon/ before scan, and
#     generates no docs / agent / CI / VerificationPlan.
#   - ASCII art never in --json; REKON_NO_BANNER suppresses the banner; NO_COLOR suppresses ANSI
#     color; non-TTY setup does not prompt.
#   - Onboarding implies no Circe run, command execution, or source writes; intent:go deferred.
#     No code or behavior change.
#
# See docs/strategy/rekon-setup-welcome-ui-safety-review.md.
# Recommended next slice: Rekon Interactive Setup Prompt Decision.
#
# Rekon Setup / Welcome UI has shipped.
# One-hundred-eighteenth slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch: the non-interactive-safe welcome / setup UI foundation.
#   - rekon welcome [--json] [--no-banner]: branded Scan → Snapshot → Act intro (lifecycle, first
#     run, intent workflow, boundaries); --json is structured + banner-free.
#   - rekon setup [--root <path>] [--json] [--no-banner]: deterministic, non-interactive setup plan;
#     detects workspace state read-only (no scan, no .rekon/ creation before scan) + recommends next.
#   - ASCII art never in --json; NO_COLOR disables color; REKON_NO_BANNER / --no-banner disable the
#     banner; non-TTY shows the compact mark and never prompts.
#   - No prompts, no create-rekon, no postinstall, no dependency, no Circe, no command execution, no
#     source writes; intent:go deferred.
#
# See docs/concepts/rekon-setup-welcome.md.
# Recommended next slice: Rekon Setup / Welcome UI Safety Review.
#
# Rekon Install / Setup / ASCII Art UX Decision has shipped.
# One-hundred-seventeenth slice on the codebase-intel-classic capability-ontology track.
# Strategy / product UX decision batch. Decides the polished V1 install + first-run setup + ASCII UX.
#   - Selects Option B (staged install/setup polish): npm install -D @rekon/cli -> npx rekon scan
#     stays scriptable; a future optional rekon setup + later npm init rekon layer guidance on top.
#   - Install must not run onboarding (no postinstall); first-run setup starts with scan; docs /
#     agent / verification options are not offered before the first scan.
#   - ASCII art never in --json; non-TTY / CI never prompt + default no banner; NO_COLOR /
#     REKON_NO_BANNER respected; refresh stays expert / compat.
#   - Onboarding never implies command execution, source writes, or Circe execution by Rekon;
#     intent:go deferred. Decision-only: no setup / prompts / ASCII / create-rekon / dependency.
#
# See docs/strategy/rekon-install-setup-ascii-ux-decision.md.
# Recommended next slice: Rekon Setup / Welcome UI Implementation.
#
# Intent Bundle Phase-Level Verification Safety Review has shipped.
# One-hundred-sixteenth slice on the codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch. Reviews the slice-115 phase-level verification posture end-to-end.
#   - Confirmed safe/stable: every phase has explicit verification posture (executable /
#     final-verification / manual-review / needs-review); phase-modify / phase-refactor get
#     executable verification when safe requirements exist, else needs-review; phase-verify carries
#     final verification; phase-investigate / phase-review are explicit manual / reviewer gates.
#   - A phase without executable verification is never silently verified; skipped verification is
#     not proof; posture is projection metadata, not a VerificationRun.
#   - No commands executed, no VerificationRun / VerificationResult, no source writes, no Circe run
#     by Rekon, intent:go deferred. No code or behavior change.
#
# See docs/strategy/intent-bundle-phase-level-verification-safety-review.md.
# Recommended next slice: Rekon Install / Setup / ASCII Art UX Decision.
#
# Intent Bundle Phase-Level Verification has shipped.
# One-hundred-fifteenth slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch making phase-level verification explicit in the intent plan
# bundle + Circe projection so skipped verification never reads as proof.
#   - Every phase carries an explicit verificationPosture (executable / final-verification /
#     manual-review / needs-review) in circe/rekon-proof.json phaseGates[] (+ manualGate /
#     needsReview / reason / verificationPlanPath), on circe/phase-plan.json phases[].rekon,
#     in verification-plan.md, and in agent/verification.json.
#   - phase-modify / phase-refactor map the plan's safe executable requirements and ship a
#     per-phase VerificationPlan (else needs-review); phase-verify carries final verification;
#     phase-investigate / phase-review are reviewer-gated manual-review.
#   - rekon intent bundle write reports a phaseVerification summary.
#   - Projection layer only: no canonical artifact / approval-proof / scan-refresh / runtime
#     change; no intent:go; no Circe execution by Rekon; no source writes.
#
# See docs/concepts/intent-plan-bundle.md.
# Recommended next slice: Intent Bundle Phase-Level Verification Safety Review.
#
# Fresh Repo Intent Readiness Safety Review has shipped.
# One-hundred-fourteenth slice on the codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch. Reviews the slice-113 fresh-repo intent-context fix end-to-end.
#   - The fresh-repo public path (rekon scan -> rekon intent context prepare -> rekon intent
#     assess -> ... -> rekon intent bundle write) is confirmed safe/stable without private
#     .rekon/artifacts seeding.
#   - rekon intent context prepare uses the existing producer commands in dependency order;
#     rekon scan / rekon refresh and the intent assess severity policy are unchanged.
#   - Missing runtime/handoff evidence is recorded as not-evaluated / observation-missing, not
#     false success; Rekon runs no Circe and writes no source in this path; intent:go remains
#     deferred; phase-level VerificationPlan behavior is a recorded follow-up.
#   - No code or behavior change.
#
# See docs/strategy/fresh-repo-intent-readiness-safety-review.md.
# Recommended next slice: Intent Bundle Phase-Level Verification Policy / Implementation.
#
# Fresh Repo Intent Readiness / Proof Context Fix has shipped.
# One-hundred-thirteenth slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch closing the fresh-repo intent-preparation gap from Circe dogfood.
#   - Adds rekon intent context prepare, which runs the existing producer commands (step graph
#     build, handoff contract build, runtime graph observe/drift, handoff coverage report) in
#     dependency order, best-effort, so rekon scan -> rekon intent assess is no longer blocked
#     by missing StepCapabilityGraph / RuntimeGraphDriftReport on a fresh repo.
#   - The orchestrator + producers are now listed in top-level help; the two intent assess
#     blocker messages point at the one-step command and state the not-evaluated honesty.
#   - No change to scan / refresh or the intent assess approval/proof policy; no intent:go and
#     no Circe execution by Rekon; no source writes.
#
# See docs/concepts/intent-assessment.md.
# Recommended next slice: Fresh Repo Intent Readiness Safety Review.
#
# First-Run Scan Safety Review has shipped.
# One-hundred-twelfth slice on the codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch. Reviews the shipped rekon scan end-to-end.
#   - rekon scan is confirmed safe/stable as the canonical first-run command: it
#     initializes .rekon/ when needed, creates the first repository intelligence
#     substrate (reusing runRefresh), and works repeatedly.
#   - refresh retained as the expert / compatibility update command; no docs / agent /
#     CI / verification generation before the first scan; no command execution; no
#     source writes outside .rekon/; no ASCII art in --json; no intent:go.
#   - config.capabilities normalization ([] = default capabilities) recorded as
#     acceptable for v1 (existing refresh behavior, surfaced not introduced by scan).
#   - No code or behavior change.
#
# See docs/strategy/rekon-first-run-scan-safety-review.md.
# Recommended next slice: Rekon Install / Setup / ASCII Art UX Decision.
#
# First-Run Scan has shipped.
# One-hundred-eleventh slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch. Implements rekon scan as the canonical first-run command.
#   - rekon scan [--root <path>] [--json] shares the existing refresh substrate
#     pipeline: it initializes .rekon/ if needed and creates the first repository
#     intelligence substrate, then reports workspace state + post-scan next actions.
#   - JSON output carries command, workspace.stateBefore/stateAfter/initialized,
#     snapshot.ready, summary.artifacts, nextActions, and seven boundary booleans
#     (all false); no ASCII art in --json.
#   - refresh is unchanged and retained as the expert / compatibility update command;
#     scan changes no refresh semantics.
#   - No prompts, no ASCII art, no create-rekon, no version bump, no npm publish, no
#     intent:go, no source writes outside .rekon/.
#
# See docs/strategy/rekon-first-run-scan-onboarding-decision.md.
# Recommended next slice: Rekon First-Run Scan Safety Review.
#
# First-Run Scan Onboarding Decision has shipped.
# One-hundred-tenth slice on the codebase-intel-classic capability-ontology track.
# Strategy / product-UX decision batch. Decides the V1 first-run onboarding model.
#   - The public first-run verb is rekon scan (Option B), not refresh.
#   - rekon scan initializes .rekon/ if needed and creates the first repository
#     intelligence substrate; dependent actions unlock only after the first scan.
#   - Docs / agent context / verification / CI options are offered AFTER scan, never
#     before. refresh is demoted to an expert / compatibility alias.
#   - Workspace state model (not_initialized / initialized_without_snapshot /
#     snapshot_ready), pre-scan messaging, post-scan actions, and ASCII/branding
#     posture pinned (no ASCII art in --json; NO_COLOR / REKON_NO_BANNER respected).
#   - No rekon scan implementation, no CLI behavior change, no prompts, no ASCII art,
#     no version bump, no npm publish, no intent:go.
#
# See docs/strategy/rekon-first-run-scan-onboarding-decision.md.
# Recommended next slice: Rekon First-Run Scan Implementation.
#
# V1 Tagging has shipped.
# One-hundred-ninth slice on the codebase-intel-classic capability-ontology track.
# Release-mechanics product batch. Creates the annotated v1.0.0 git tag.
#   - An annotated v1.0.0 git tag is created from the verified final commit and
#     pushed to origin, after the full nine-command gate passes.
#   - Package versions remain 1.0.0 (no bump); npm publish does NOT occur in this
#     slice — publish remains a separate, explicitly-approved slice.
#   - Pre-tag state re-confirmed: root + 21 public packages lockstep at 1.0.0, with
#     no pre-existing local or remote v1.0.0 tag.
#   - V1 remains prepare/prove/package/export, not Rekon-side execution; Circe owns
#     orchestration for V1; intent:go remains deferred.
#
# See docs/strategy/v1-tagging-decision.md.
# Recommended next slice: V1 Publish Decision / Implementation.
#
# V1 Versioning has shipped.
# One-hundred-eighth slice on the codebase-intel-classic capability-ontology track.
# Release-mechanics product batch. The lockstep version bump for V1.
#   - All 21 public workspace packages and the private root rekon move from
#     0.1.0-beta.0 to 1.0.0 (lockstep).
#   - Every internal @rekon/* exact-version dependency pin updated to 1.0.0;
#     package-lock.json regenerated (no dependencies added or removed).
#   - Root aligned (still private: true) per the release-readiness coherence
#     convention; no package excluded.
#   - Lockstep enforced by tests/docs/release-readiness.test.mjs
#     (EXPECTED_VERSION = "1.0.0") + new tests/docs/v1-versioning.test.mjs.
#   - No git tag and no npm publish occurred — those remain separate, explicitly
#     approved slices. V1 remains prepare/prove/package/export; intent:go deferred.
#
# See docs/strategy/v1-versioning-implementation.md.
# Recommended next slice: V1 Tagging Decision / Implementation.
#
# V1 Release Prep has shipped.
# One-hundred-seventh slice on the codebase-intel-classic capability-ontology track.
# Release-prep documentation batch. No runtime or package-metadata change.
#   - New docs/releases/ directory: V1 release notes, V1 migration notes, and a V1
#     release checklist (+ index README), making the V1 release legible before any
#     irreversible release action.
#   - Release notes pin V1 = prepare/prove/package/export (not Rekon-side execution),
#     the six rich intent commands, the Rekon/Circe boundary, and the proof/safety
#     evidence (incl. the external serve-loop proof, pass 1 / fail 0).
#   - Migration notes pin the canonical intent assess → … → intent bundle write flow +
#     circe rekon-handoff validate/routes/import; legacy rekon prepare plan /
#     .rekon/handoffs superseded by .rekon/intent/plans/<intent-id>/circe/; intent:go not
#     available; .rekon/artifacts/ remains canonical truth.
#   - Checklist pins the version-bump / git-tag / npm-publish gates + stop conditions.
#   - Package state re-confirmed and recorded (not edited): private root + 21 public
#     packages lockstep at 0.1.0-beta.0. No version bump, no tag, no npm publish.
#
# See docs/releases/v1-release-notes.md.
# Recommended next slice: V1 Versioning Decision / Implementation.
#
# V1 Release Mechanics / Versioning Decision has shipped.
# One-hundred-sixth slice on the codebase-intel-classic capability-ontology track.
# Strategy / release-mechanics decision batch. No runtime or package-metadata change.
#   - Decision: Option B — staged V1 release mechanics.
#   - V1 release mechanics do not publish to npm in this slice; do not bump versions
#     in this slice.
#   - Real package state recorded (not edited): private workspace root rekon + 21
#     public packages, all lockstep at 0.1.0-beta.0, none private. Intended release
#     target 1.0.0 applied lockstep, deferred to an explicit versioning slice.
#   - Pinned: version-bump / git-tag / npm-publish gates, release-notes model,
#     migration-notes model (intent assess → … → intent bundle write; circe
#     rekon-handoff validate/routes/import; legacy rekon prepare plan / .rekon/handoffs
#     superseded by .rekon/intent/plans/<intent-id>/circe/).
#   - V1 boundaries reaffirmed: prepare/prove/package/export, not Rekon-side execution;
#     Circe owns orchestration; intent:go deferred; no Rekon command execution / source
#     writes / VerificationRun / VerificationResult.
#
# See docs/strategy/v1-release-mechanics-versioning-decision.md.
# Recommended next slice: V1 Release Prep Implementation.
#
# V1 Readiness / Release Review has shipped.
# One-hundred-fifth slice on the codebase-intel-classic capability-ontology track.
# Strategy / release-readiness review batch. No runtime change.
#   - Decision: V1 readiness is conditionally approved for the non-executing
#     Rekon → Circe prepared-plan handoff (Option B).
#   - V1 means prepare/prove/package/export, not Rekon-side execution; Circe owns
#     orchestration for V1.
#   - Included: IntentAssessmentReport, PreparedIntentPlan (approval/proof),
#     IntentStatusReport, WorkOrder + VerificationPlan handoffs, plan bundle, Circe
#     proof/gate projection, and the six help-listed intent commands.
#   - Proven: full Rekon suite (4281 / 0 fail) + package gates, Circe schema
#     validation, and the serve-loop proof (pass 1 / fail 0); help aligned.
#   - Excluded/deferred beyond V1: intent:go, Rekon-side command execution,
#     Rekon-side source writes, and VerificationRun / VerificationResult generation.
#   - Conditional approval: release mechanics (version / tag / publish) are deferred
#     to a separate slice; this batch bumps nothing, tags nothing, publishes nothing.
#
# See docs/strategy/v1-readiness-release-review.md.
# Recommended next slice: V1 Release Mechanics / Versioning Decision.
#
# CLI Intent Help Surface Alignment has shipped.
# One-hundred-fourth slice on the codebase-intel-classic capability-ontology track.
# Product-polish batch. Resolves the stale-help discoverability gap recorded by the
# slice-103 re-review.
#   - Top-level `rekon help` now lists all six shipped rich intent commands:
#     intent assess / intent prepare / intent status / intent work-order generate /
#     intent verification-plan generate / intent bundle write.
#   - Help states the canonical flow (intent assess → … → intent bundle write, then
#     circe rekon-handoff validate/routes/import) and the boundary: Rekon prepares,
#     proves, packages, and exports; Circe imports and orchestrates; Rekon does not run
#     Circe, does not execute commands, does not write source files, and does not
#     implement intent:go.
#   - Discoverability fix only: no command behavior changed, no new command, intent go
#     is not listed as a shipped command, intent:go remains deferred.
#   - Only source change is the usage() string in @rekon/cli + a 12-assertion help
#     contract test.
#
# See .rekon-dev/review-packets/cli-intent-help-surface-alignment.md.
# Recommended next slice: V1 Readiness / Release Review.
#
# Intent Plan Bundle → Circe Proof/Gate Projection Safety Review re-reviewed.
# One-hundred-third slice on the codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch expanding the slice-102 review with two operational
# findings. No source or runtime change.
#   - External execution proof: the current built Rekon CLI passed the Circe
#     validate/routes/import/serve-loop proof (Circe's
#     rekon-intent-handoff-serve-loop.test.ts, pass 1 / fail 0), so the enriched
#     projection remains compatible with Circe. Recorded as supplied; not re-run here.
#   - Stale-help discoverability gap: top-level `rekon help` lists 0 of the 6 richer
#     intent commands (only legacy intent work-order + intent remediation), though they
#     execute correctly when invoked directly — a discoverability gap, not a pipeline
#     blocker. Top-level Rekon help must be aligned before V1/operator-ready release.
#   - Boundaries unchanged: Rekon does not run Circe commands during bundle generation,
#     does not execute commands, does not write source files; intent:go remains
#     deferred (execution can be owned entirely by Circe).
#
# See docs/strategy/intent-plan-bundle-circe-proof-gate-projection-safety-review.md.
# Recommended next slice: CLI Intent Help Surface Alignment, then V1 Readiness /
# Release Review. intent:go implementation is not recommended.
#
# Intent Plan Bundle → Circe Proof/Gate Projection Safety Review has shipped.
# One-hundred-second slice on the codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch. Reviews the shipped proof/gate enrichment
# end-to-end.
#   - Finding: the Circe proof/gate projection is safe/stable — no blocker.
#   - circe/rekon-proof.json carries the PreparedIntentPlan approval/proof envelope,
#     the IntentStatusReport gate state, the freshness/runtime-drift refs, and
#     per-phase gate metadata.
#   - The sidecar is honest: it never claims approval/readiness the source artifacts
#     do not support (needs-review plan => preparedPlanApproved false).
#   - sourceWriteAllowed remains false, commandsExecuted remains false,
#     intentGoDeferred remains true.
#   - The enriched projection remains compatible with Circe's real normalizers.
#   - Canonical Rekon truth remains .rekon/artifacts/. Rekon does not run Circe
#     commands during bundle generation, does not execute commands, and does not write
#     source files. intent:go remains deferred.
#   - The non-executing handoff pipeline is complete.
#
# See docs/strategy/intent-plan-bundle-circe-proof-gate-projection-safety-review.md.
# Recommended next slice: Intent Go / Execution Boundary Decision.
#
# Intent Plan Bundle → Circe Proof/Gate Projection Enrichment has shipped.
# One-hundred-first slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch. The Circe projection now also emits
# circe/rekon-proof.json (kind rekon-circe-proof), a Rekon-owned proof/gate sidecar.
#   - Carries the PreparedIntentPlan approval/proof envelope, the IntentStatusReport
#     gate state, the freshness/drift refs, and per-phase gate metadata (phaseGates).
#   - manifest.circe.rekonProof + handoff.json rekonProofPath pointer + per-phase
#     WorkOrder/VerificationPlan intentHandoff traceability.
#   - The sidecar never claims approval/readiness the source does not support.
#   - sourceWriteAllowed remains false, commandsExecuted remains false,
#     intentGoDeferred remains true.
#   - Circe schema validation remains intact (re-validated against Circe's real
#     normalizers; hand-crafted + real-pipeline projections accepted).
#   - Canonical Rekon truth remains .rekon/artifacts/. Rekon does not run Circe
#     commands during bundle generation, does not execute the Circe handoff, and does
#     not write source files. Circe owns orchestration after import. intent:go
#     remains deferred.
#
# See docs/concepts/intent-plan-bundle.md.
# Recommended next slice: Intent Plan Bundle → Circe Proof/Gate Projection Safety
# Review.
#
# Intent Plan Bundle → Circe Handoff Projection Safety Review has shipped.
# One-hundredth slice on the codebase-intel-classic capability-ontology track.
# Strategy / safety-review batch. Reviews the shipped Circe handoff projection
# end-to-end.
#   - Finding: the Circe handoff projection is safe/stable as a Circe import adapter
#     (schema-valid against Circe's real normalizers, boundary preserved, no Circe
#     execution) — no blocker.
#   - Gap (not a blocker): proof/gate traceability is incomplete. The
#     PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate status,
#     and freshness/drift refs do not survive into circe/.
#   - Circe handoff projection is an import adapter, not a new planning system.
#   - Canonical Rekon truth remains .rekon/artifacts/.
#   - Rekon does not run Circe commands during bundle generation, does not execute the
#     Circe handoff, and does not write source files. Circe owns orchestration after
#     import.
#   - Circe projection must preserve Rekon's proof/gate traceability; if it is
#     incomplete, intent:go must remain blocked. intent:go remains deferred.
#
# See docs/strategy/intent-plan-bundle-circe-handoff-projection-safety-review.md.
# Recommended next slice: Intent Plan Bundle → Circe Proof/Gate Projection Enrichment
# (before any Intent Go / Execution Boundary Decision).
#
# Intent Plan Bundle → Circe Handoff Projection Implementation has shipped.
# Ninety-ninth slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch. Every intent plan bundle now also emits a Circe
# rekon-circe-handoff projection under .rekon/intent/plans/<intent-id>/circe/.
#   - circe/handoff.json + circe/phase-plan.json +
#     circe/work-orders/<phase-id>.work-order.json +
#     circe/verification-plans/<phase-id>.verification-plan.json.
#   - One WorkOrder per PreparedIntentPlan phase (VerificationPlan optional, per
#     phase); canonical Rekon WorkOrder / VerificationPlan shapes.
#   - handoff.json matches Circe's schema exactly (schemaVersion 1, kind
#     rekon-circe-handoff, producer.system rekon, status ready); validated against
#     Circe's real normalizers.
#   - implementerProfile omitted by default; projection files are not registered
#     canonical artifacts.
#   - The bundle includes a Circe projection under circe/. Circe handoff projection
#     is an import adapter, not a new planning system. Canonical Rekon truth remains
#     .rekon/artifacts/. Rekon does not run Circe commands during bundle generation,
#     does not execute the Circe handoff, and does not write source files. Circe owns
#     orchestration after import. intent:go remains deferred.
#
# See docs/concepts/intent-plan-bundle.md.
# Recommended next slice: Intent Plan Bundle → Circe Handoff Projection Safety Review.
#
# Intent Plan Bundle → Circe Handoff Projection Decision has shipped. Ninety-eighth
# slice on the codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch. Pins how the Intent plan bundle projects into Circe's
# rekon-circe-handoff import format, grounded in the real Circe source (not inferred
# from filenames).
#   - Recommendation: Option B — a Circe projection under each bundle at
#     .rekon/intent/plans/<intent-id>/circe/ (handoff.json, phase-plan.json,
#     work-orders/<phase-id>.work-order.json,
#     verification-plans/<phase-id>.verification-plan.json).
#   - Circe handoff projection is an import adapter, not a new planning system.
#   - Canonical Rekon truth remains .rekon/artifacts/.
#   - Rekon does not execute the Circe handoff, does not run Circe commands during
#     bundle generation, and does not write source files. Circe owns orchestration
#     after import.
#   - implementerProfile is omitted by default (Rekon does not know the operator's
#     Circe workflow profiles).
#   - intent:go remains deferred.
#
# See docs/strategy/intent-plan-bundle-circe-handoff-projection-decision.md.
# Recommended next slice: Intent Plan Bundle → Circe Handoff Projection
# Implementation.
#
# Intent Plan Bundle / Agent Handoff Safety Review has shipped. Ninety-seventh
# slice on the codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch. Reviews the shipped Intent plan bundle generator end-to-end.
#   - Recommendation: the Intent plan bundle generator is safe/stable as a human +
#     LLM-agent filesystem projection.
#   - Intent plan bundle is a projection, not canonical artifact truth.
#   - Canonical source of truth remains .rekon/artifacts/.
#   - Bundle generation writes only under .rekon/intent/plans/<intent-id>/ with
#     path-traversal safety on the intent id and every file path.
#   - Bundle generation creates no canonical artifacts, executes no commands, and
#     writes no source files. Stale bundles must not be treated as current handoff.
#   - VerificationRun and VerificationResult are optional proof context, not
#     prerequisites for bundle generation (follow-up to wire as inputs).
#   - intent:go remains deferred.
#
# See docs/strategy/intent-plan-bundle-agent-handoff-safety-review.md.
# Recommended next slice: Intent Go / Execution Boundary Decision.
#
# Intent Plan Bundle / Agent Handoff Implementation has shipped. Ninety-sixth
# slice on the codebase-intel-classic capability-ontology track. Product-capability
# batch. Adds `rekon intent bundle write`: reads canonical intent artifacts and
# projects them into a regenerable human + LLM-agent handoff bundle under
# .rekon/intent/plans/<intent-id>/ (manifest.json + human files + agent/ files).
#   - buildIntentPlanBundle renderer in @rekon/capability-docs; pure, path-safe.
#   - manifest records source artifact refs / digests / staleness / boundaries.
#   - CLI writes only under the bundle directory with path-traversal safety.
#   - Intent plan bundle is a projection, not canonical artifact truth.
#   - Canonical source of truth remains .rekon/artifacts/.
#   - Agent handoff files live under agent/ inside the bundle.
#   - Bundle generation executes no commands, writes no source files outside the
#     bundle directory, creates no canonical artifacts, and does not implement
#     intent:go. Stale bundles must not be treated as current handoff.
#   - No new artifact type; rekon artifacts validate stays clean.
#
# See docs/concepts/intent-plan-bundle.md.
# Recommended next slice: Intent Plan Bundle / Agent Handoff Safety Review.
#
# Intent Plan Bundle / Agent Handoff Directory Decision has shipped. Ninety-fifth
# slice on the codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch. Pins where the completed intent preparation
# artifacts project into a stable repo-local plan bundle, plus the manifest, file,
# staleness, and source-control models.
#   - Recommendation: Option B, a repo-local plan bundle at
#     .rekon/intent/plans/<intent-id>/ with human-readable root files and
#     agent-facing files under agent/.
#   - Intent plan bundle is a projection, not canonical artifact truth.
#   - Canonical source of truth remains .rekon/artifacts/.
#   - Agent handoff files live under agent/ inside the bundle.
#   - Bundle is a regenerable projection with a manifest.json recording source
#     artifact refs / digests / staleness.
#   - Bundle generation must not execute commands, write source files, or
#     implement intent:go.
#   - Stale bundles must not be treated as current handoff.
#   - Default posture: repo-local under .rekon, not assumed committed.
#
# See docs/strategy/intent-plan-bundle-agent-handoff-directory-decision.md.
# Recommended next slice: Intent Plan Bundle / Agent Handoff Implementation.
#
# Intent VerificationPlan Handoff Safety Review has shipped. Ninety-fourth slice
# on the codebase-intel-classic capability-ontology track. Strategy / safety-review
# batch. Reviews the shipped Intent VerificationPlan handoff generator end-to-end.
#   - Recommendation: Intent VerificationPlan handoff is safe/stable as an explicit
#     gated VerificationPlan generator.
#   - Intent VerificationPlan handoff is VerificationPlan artifact generation, not
#     intent:go.
#   - VerificationPlan generation requires a proof-approved PreparedIntentPlan and
#     non-empty verification requirements.
#   - IntentStatusReport gates generation but does not generate VerificationPlan.
#   - WorkOrder is optional in v1 and cited when available.
#   - classifyVerificationCommand classifies command text only; unsafe / ambiguous
#     commands block. No commands are executed.
#   - Blocked handoff writes no VerificationPlan; generated handoff writes exactly
#     one that traces back to PreparedIntentPlan.
#   - VerificationPlan generation creates no WorkOrder / VerificationRun /
#     VerificationResult, executes no commands, and writes no source files.
#     intent:go remains deferred.
#   - Next phase: (1) Intent Plan Bundle / Agent Handoff Directory Decision, (2)
#     Implementation, (3) Safety Review, (4) Intent Go / Execution Boundary
#     Decision. Plan bundle (.rekon/intent/plans/<intent-id>/) is deferred to that
#     phase.
#
# See docs/strategy/intent-verification-plan-handoff-safety-review.md.
# Recommended next slice: Intent Plan Bundle / Agent Handoff Directory Decision.
#
# Intent VerificationPlan Handoff Implementation has shipped. Ninety-third slice
# on the codebase-intel-classic capability-ontology track. Product-capability
# batch. Adds `rekon intent verification-plan generate`: reads a proof-approved
# PreparedIntentPlan (gated by IntentStatusReport work-ready/work-in-progress/
# verification-ready + a handoff-time freshness/drift recheck), classifies each
# requirement command for safety, and writes exactly one VerificationPlan (source
# intent-handoff) that traces back to the plan; the blocked gate writes none.
#   - buildIntentVerificationPlanHandoff helper + conservative command sanitizer
#     (safe allowlist -> commands; commandless/needs-review -> success criteria;
#     rejected shell-control/destructive tokens -> blocked).
#   - additive VerificationPlan.source "intent-handoff" + intentHandoff field (no
#     new artifact type; existing VerificationPlan reused).
#   - WorkOrder is optional in v1, cited when available.
#   - VerificationPlan generation creates no WorkOrder, VerificationRun, or
#     VerificationResult, executes no commands, and writes no source files.
#     intent:go remains deferred.
#
# See docs/concepts/intent-verification-plan-handoff.md.
# Recommended next slice: Intent VerificationPlan Handoff Safety Review.
#
# Intent VerificationPlan Handoff Decision has shipped. Ninety-second slice on the
# codebase-intel-classic capability-ontology track. Strategy / architecture
# decision batch. Pins the second half of the separate-generator handoff model:
# the VerificationPlan generator shape, gate, freshness/drift recheck,
# verification-requirement mapping, traceability, and command-safety posture from
# PreparedIntentPlan.verificationRequirements.
#   - Recommendation: Option B, an explicit gated VerificationPlan generator
#     (rekon intent verification-plan generate --prepared-plan <ref> ...).
#   - Gate: approved prepared plan + status prepared + non-empty verification
#     requirements + IntentStatusReport work-ready/work-in-progress/verification-ready
#     (no high-severity blockers) + verificationPlanAllowed true / sourceWriteAllowed
#     false + freshness/drift recheck.
#   - Verification requirements map to VerificationPlan commands/checks via a
#     conservative sanitizer; commandless requirements become guidance checks.
#   - WorkOrder is optional in v1 (workOrderRef?), cited when available.
#   - Intent VerificationPlan handoff is VerificationPlan artifact generation, not
#     intent:go.
#   - VerificationPlan generation must require a proof-approved PreparedIntentPlan
#     and non-empty verification requirements.
#   - IntentStatusReport gates VerificationPlan generation but does not generate
#     VerificationPlan.
#   - Generated VerificationPlan must trace back to PreparedIntentPlan.
#   - VerificationPlan generation does not create WorkOrder, VerificationRun, or
#     VerificationResult, execute commands, or write source files. intent:go
#     remains deferred.
#
# See docs/strategy/intent-verification-plan-handoff-decision.md.
# Recommended next slice: Intent VerificationPlan Handoff Implementation.
#
# Intent WorkOrder Handoff Safety Review has shipped. Ninety-first slice on the
# codebase-intel-classic capability-ontology track. Strategy / safety-review
# batch. Reviews the shipped Intent WorkOrder handoff generator end-to-end.
#   - Recommendation: Intent WorkOrder handoff is safe/stable as an explicit
#     gated WorkOrder generator.
#   - Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go.
#   - WorkOrder generation requires a proof-approved PreparedIntentPlan.
#   - IntentStatusReport gates WorkOrder generation but does not generate WorkOrder.
#   - Blocked handoff writes no WorkOrder; generated handoff writes exactly one
#     WorkOrder that traces back to PreparedIntentPlan.
#   - WorkOrder generation creates no VerificationPlan / VerificationRun /
#     VerificationResult, executes no commands, and writes no source files.
#   - intent:go remains deferred.
#
# See docs/strategy/intent-work-order-handoff-safety-review.md.
# Recommended next slice: Intent VerificationPlan Handoff Decision.
#
# Intent WorkOrder Handoff Implementation has shipped. Ninetieth slice on the
# codebase-intel-classic capability-ontology track. Product-capability batch.
# Adds `rekon intent work-order generate`: reads a proof-approved
# PreparedIntentPlan (gated by IntentStatusReport work-ready + a handoff-time
# freshness/drift recheck) and writes exactly one WorkOrder (source
# intent-handoff) that traces back to the plan; the blocked gate writes none.
#   - buildIntentWorkOrderHandoff helper + additive WorkOrder.intentHandoff field
#     (no new artifact type registered; existing WorkOrder reused).
#   - WorkOrder generation creates no VerificationPlan, executes no commands, and
#     writes no source files. intent:go remains deferred.
#
# See docs/concepts/intent-work-order-handoff.md.
# Recommended next slice: Intent WorkOrder Handoff Safety Review.
#
# Intent WorkOrder Handoff Decision has shipped. Eighty-ninth slice on the
# codebase-intel-classic capability-ontology track. Strategy / architecture
# decision batch. Pins the WorkOrder generator shape, gate, freshness/drift
# recheck, traceability, and content mapping from a proof-approved
# PreparedIntentPlan.
#   - Recommendation: Option B, an explicit gated WorkOrder generator
#     (rekon intent work-order generate --prepared-plan <ref> ...).
#   - Gate: approved prepared plan + status prepared + create-work-order +
#     IntentStatusReport work-ready (no high-severity blockers) +
#     workOrderAllowed true / sourceWriteAllowed false + freshness/drift recheck.
#   - Intent WorkOrder handoff is WorkOrder artifact generation, not intent:go.
#   - WorkOrder generation must require a proof-approved PreparedIntentPlan.
#   - IntentStatusReport gates WorkOrder generation but does not generate WorkOrder.
#   - Generated WorkOrder must trace back to PreparedIntentPlan.
#   - WorkOrder generation does not create VerificationPlan, execute commands, or
#     write source files. intent:go remains deferred.
#
# Recommended next slice: Intent WorkOrder Handoff Implementation.
#
# Intent Work / Proof Handoff Decision has shipped. Eighty-eighth slice on the
# codebase-intel-classic capability-ontology track. Strategy / architecture
# decision batch. Decides how a proof-approved PreparedIntentPlan may lead to
# downstream WorkOrder and VerificationPlan artifacts.
#   - Recommendation: Option B, separate explicit gated generators
#     (PreparedIntentPlan -> WorkOrder and PreparedIntentPlan -> VerificationPlan).
#   - Intent work/proof handoff is artifact generation, not intent:go.
#   - WorkOrder generation must require a proof-approved PreparedIntentPlan.
#   - VerificationPlan generation must require PreparedIntentPlan verification
#     requirements.
#   - IntentStatusReport gates handoff but does not generate downstream artifacts.
#   - WorkOrder and VerificationPlan generation must be separate explicit steps.
#   - Generated WorkOrder and VerificationPlan must trace back to PreparedIntentPlan.
#   - Handoff generation does not execute commands or write source files.
#   - intent:go remains deferred.
#
# Recommended next slice: Intent WorkOrder Handoff Decision.
#
# IntentStatusReport safety review has shipped. Eighty-seventh slice on the
# codebase-intel-classic capability-ontology track. Strategy / safety-review
# batch. Reviews the shipped IntentStatusReport v1 end-to-end.
#   - Recommendation: IntentStatusReport v1 is safe/stable as read-only status
#     reporting.
#   - IntentStatusReport is status reporting, not VerificationResult.
#   - IntentStatusReport is not WorkOrder.
#   - IntentStatusReport reports PreparedIntentPlan approval state but does not
#     approve plans.
#   - VerificationResult is an input to status, not the status artifact itself.
#   - WorkOrder / VerificationPlan generation remains deferred to a separate
#     decision.
#   - It does not create WorkOrder / VerificationPlan / VerificationRun /
#     VerificationResult, execute commands, write source, or implement intent:go.
#
# Recommended next slice: Intent Work / Proof Handoff Decision.
#
# IntentStatusReport v1 has shipped. Eighty-sixth slice on the
# codebase-intel-classic capability-ontology track. Product-capability batch.
# Registers the IntentStatusReport artifact (category actions) and a read-only
# rollup status report via `rekon intent status`.
#   - Reads IntentAssessmentReport, PreparedIntentPlan, WorkOrder,
#     VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport,
#     RuntimeGraphDriftReport, HandoffCoverageReport (all read-only).
#   - Status not-assessed ... complete / unknown; stale freshness overrides to
#     stale; high-severity drift downgrades to needs-review.
#   - IntentStatusReport is status reporting, not VerificationResult.
#   - IntentStatusReport is not WorkOrder.
#   - IntentStatusReport reports PreparedIntentPlan approval state but does not
#     approve plans.
#   - VerificationResult is an input to status, not the status artifact itself.
#   - It does not create WorkOrder / VerificationPlan / VerificationRun, execute
#     commands, write source, or implement intent:go.
#
# Recommended next slice: IntentStatusReport safety review.
#
# IntentStatusReport v1 Decision has shipped. Eighty-fifth slice on the
# codebase-intel-classic capability-ontology track. Strategy / architecture
# decision batch. Pins the IntentStatusReport v1 artifact shape, inputs, status
# model, proof rollup, and boundaries.
#   - Recommendation: Option B, an artifact-backed status rollup.
#   - Inputs: IntentAssessmentReport, PreparedIntentPlan, WorkOrder,
#     VerificationPlan, VerificationRun, VerificationResult, PathFreshnessReport,
#     RuntimeGraphDriftReport (all read-only, consumed when available).
#   - IntentStatusReport is status reporting, not VerificationResult.
#   - IntentStatusReport is not WorkOrder.
#   - IntentStatusReport reports PreparedIntentPlan approval state but does not
#     approve plans.
#   - VerificationResult is an input to status, not the status artifact itself.
#   - It does not create WorkOrder / VerificationPlan, execute commands, write
#     source, or implement intent:go.
#
# Recommended next slice: IntentStatusReport v1 implementation.
#
# PreparedIntentPlan safety review has shipped. Eighty-fourth slice on the
# codebase-intel-classic capability-ontology track. Strategy / safety-review
# batch. Reviews the amended PreparedIntentPlan v1 implementation end-to-end.
#   - Recommendation: PreparedIntentPlan v1 is safe/stable as proof-approved
#     phase/gate preparation.
#   - PreparedIntentPlan must be proof-approved, not merely generated.
#   - PreparedIntentPlan.status.value can be prepared only when approval.status
#     is approved.
#   - A plan with phases but without approval is not prepared.
#   - Verification requirements are proof obligations, not VerificationPlan.
#   - PreparedIntentPlan does not create WorkOrder / VerificationPlan /
#     VerificationRun / VerificationResult, execute commands, or write source.
#   - IntentStatusReport remains the next layer; intent:go remains deferred.
#
# Recommended next slice: IntentStatusReport v1 decision.
#
# PreparedIntentPlan v1 amended with the required approval/proof envelope.
# Eighty-third slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch. Implements the PreparedIntentPlan Approval / Proof
# Model Decision on top of the shipped v1 without rewriting git history.
#   - PreparedIntentPlan must be proof-approved, not merely generated.
#   - PreparedIntentPlan.status.value can be prepared only when approval.status
#     is approved.
#   - A plan with phases but without approval is not prepared.
#   - approval = { status, reasons[], proof, blockers[] }; the proof re-checks
#     drift / coverage / freshness / verification from artifact VALUES.
#   - High drift / uncovered handoff / stale freshness each block approval;
#     explicit-operator-approval and manual-risk-acceptance are reserved reasons.
#   - downstreamHandoff.sourceWriteAllowed is the literal false.
#   - Verification requirements are proof obligations, not VerificationPlan.
#   - It creates no WorkOrder / VerificationPlan, executes no commands, writes
#     no source; intent:go remains deferred.
#
# `rekon intent prepare` now reads drift / coverage / freshness / verification
# VALUES and prints Approval: / Approval reasons: (and approval in --json).
# Recommended next slice: PreparedIntentPlan safety review.
#
# PreparedIntentPlan Approval / Proof Model Decision has shipped.
# Eighty-second slice on the codebase-intel-classic capability-ontology track.
# Strategy / architecture decision batch. Amends the PreparedIntentPlan
# architecture so a plan cannot be prepared without an explicit approval/proof
# envelope.
#   - Recommendation: Option B, a required approval/proof envelope.
#   - PreparedIntentPlan must be proof-approved, not merely generated.
#   - PreparedIntentPlan.status.value can be prepared only when approval.status
#     is approved.
#   - A plan with phases but without approval is not prepared.
#   - Verification requirements are proof obligations, not VerificationPlan.
#   - PreparedIntentPlan does not create WorkOrder or VerificationPlan.
#   - PreparedIntentPlan does not execute commands.
#   - PreparedIntentPlan does not write source files.
#   - intent:go remains deferred. The shipped v1 implementation must be amended
#     to add the envelope.
#
# Recommended next slice: PreparedIntentPlan v1 implementation, amended with the
# approval/proof envelope.
#
# PreparedIntentPlan v1 has shipped. Eighty-first slice on the
# codebase-intel-classic capability-ontology track. Product-capability batch.
# Registers the PreparedIntentPlan artifact (category actions) and a read-only
# phase/gate preparation via `rekon intent prepare`.
#   - Generated from an IntentAssessmentReport plus the latest context
#     (CapabilityMap, StepCapabilityGraph, HandoffCoverageReport,
#     RuntimeGraphDriftReport, PathFreshnessReport, VerificationResult).
#   - Prepared status: prepared / blocked / needs-review / stale-assessment /
#     insufficient-assessment.
#   - PreparedIntentPlan is phase/gate preparation, not WorkOrder.
#   - It does not create WorkOrder or VerificationPlan.
#   - It does not execute commands.
#   - It does not write source files.
#   - Verification requirements are not VerificationPlan.
#   - IntentStatusReport remains the next layer; intent:go remains deferred;
#     source-write behavior remains unavailable.
#
# Recommended next slice: PreparedIntentPlan safety review.
#
# PreparedIntentPlan v1 decision has shipped. Eightieth slice on the
# codebase-intel-classic capability-ontology track. Strategy / architecture
# decision batch. Decides the v1 shape of PreparedIntentPlan, the layer after
# IntentAssessmentReport.
#   - Recommendation: Option B, an artifact-backed phase/gate preparation
#     artifact from IntentAssessmentReport plus existing Rekon context.
#   - Prepared status: prepared / blocked / needs-review / stale-assessment /
#     insufficient-assessment.
#   - PreparedIntentPlan is phase/gate preparation, not WorkOrder.
#   - It does not create WorkOrder or VerificationPlan.
#   - It does not execute commands.
#   - It does not write source files.
#   - Verification requirements are not VerificationPlan.
#   - IntentStatusReport remains the next layer after preparation; intent:go
#     remains deferred; source-write behavior remains unavailable.
#
# Recommended next slice: PreparedIntentPlan v1 implementation.
#
# IntentAssessmentReport safety review has shipped. Seventy-ninth slice on
# the codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch. Read-only end-to-end review of the IntentAssessmentReport
# v1 implementation at f385b4e.
#   - IntentAssessmentReport is assessment, not WorkOrder.
#   - It does not create WorkOrder or VerificationPlan.
#   - It does not create VerificationRun or VerificationResult.
#   - It does not execute commands.
#   - It does not write source files.
#   - RuntimeGraphDriftReport is an input to readiness, not the intent system
#     itself.
#   - PreparedIntentPlan remains the next layer; IntentStatusReport and
#     intent:go remain deferred.
#
# Recommendation: safe / stable (no blocker). Recommended next slice:
# PreparedIntentPlan v1 decision.
#
# IntentAssessmentReport v1 has shipped. Seventy-eighth slice on the
# codebase-intel-classic capability-ontology track. Product-capability batch.
# Registers the IntentAssessmentReport artifact (category actions) and a
# read-only readiness assessment via `rekon intent assess`.
#   - Reads the request plus CapabilityMap, StepCapabilityGraph,
#     HandoffCoverageReport, RuntimeGraphDriftReport, PathFreshnessReport, and
#     VerificationResult when available.
#   - Readiness: ready-for-prepare / blocked / needs-review /
#     insufficient-context / stale-context.
#   - IntentAssessmentReport is assessment, not WorkOrder.
#   - It does not create WorkOrder or VerificationPlan.
#   - It does not execute commands.
#   - It does not write source files.
#   - RuntimeGraphDriftReport is an input to readiness, not the intent system
#     itself.
#   - PreparedIntentPlan remains the next layer; IntentStatusReport and
#     intent:go remain deferred.
#
# Recommended next slice: IntentAssessmentReport safety review.
#
# IntentAssessmentReport v1 decision has shipped. Seventy-seventh slice on
# the codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch. Decides the v1 shape of IntentAssessmentReport,
# the first artifact of the staged Rekon intent spine.
#   - Recommendation: Option B, an artifact-backed readiness assessment.
#   - IntentAssessmentReport is assessment, not WorkOrder.
#   - It does not create WorkOrder or VerificationPlan.
#   - It does not execute commands.
#   - It does not write source files.
#   - PreparedIntentPlan remains the next layer after assessment.
#   - IntentStatusReport remains deferred.
#   - intent:go remains deferred.
#   - RuntimeGraphDriftReport is an input to readiness, not the intent system
#     itself.
#
# Recommended next slice: IntentAssessmentReport v1 implementation.
#
# Intent Capability Spine Integration Review has shipped. Seventy-sixth
# slice on the codebase-intel-classic capability-ontology track. Strategy /
# architecture-review batch. Read-only mapping of the classic intent surfaces
# onto the Rekon artifact spine.
#   - intent:assess maps to IntentAssessmentReport.
#   - intent:prepare maps to PreparedIntentPlan.
#   - intent:status maps to IntentStatusReport.
#   - intent:go remains deferred.
#   - Intent parity depends on StepCapabilityGraph, HandoffContract,
#     HandoffCoverageReport, RuntimeGraphObservationReport, and
#     RuntimeGraphDriftReport.
#   - No intent implemented, no artifact registered, no CLI command, no
#     source writes.
#
# Recommendation: Option B (staged intent artifact spine). Recommended next
# slice: IntentAssessmentReport v1 decision.
#
# RuntimeGraphDriftReport safety review has shipped. Seventy-fifth slice on
# the codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch. Read-only end-to-end review of the
# RuntimeGraphDriftReport v1 implementation at 41be345.
#   - RuntimeGraphDriftReport is expected-vs-observed runtime graph drift,
#     not runtime observation.
#   - RuntimeGraphDriftReport is not HandoffCoverageReport.
#   - RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
#     freshness.
#   - RuntimeGraphDriftReport v1 does not read raw handoff event logs
#     directly.
#   - RuntimeGraphDriftReport v1 does not re-evaluate handoff coverage from
#     events.
#   - RuntimeGraphDriftReport v1 does not create WorkOrder or
#     VerificationPlan.
#   - RuntimeGraphDriftReport v1 does not implement intent.
#
# Recommendation: safe / stable (no blocker). The classic
# step/handoff/runtime-drift spine is now complete enough to unblock intent
# architecture work. Recommended next slice: Intent Capability Spine
# Integration Review.
#
# RuntimeGraphDriftReport v1 implementation has shipped. Seventy-fourth
# slice on the codebase-intel-classic capability-ontology track.
# Product-capability batch. Registers the RuntimeGraphDriftReport artifact
# (category actions) and a read-only generator comparing StepCapabilityGraph
# / HandoffContract / HandoffCoverageReport / RuntimeGraphObservationReport
# for expected-vs-observed runtime graph drift via rekon runtime graph
# drift. Drift rows: in-sync / missing-expected / added-observed /
# uncovered-handoff / unresolved-contract / observation-missing /
# not-evaluated (severity-bucketed).
#   - RuntimeGraphDriftReport is expected-vs-observed runtime graph drift,
#     not runtime observation.
#   - RuntimeGraphDriftReport is not HandoffCoverageReport.
#   - RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
#     freshness.
#   - RuntimeGraphDriftReport v1 does not read raw handoff event logs
#     directly.
#   - RuntimeGraphDriftReport v1 does not create WorkOrder / VerificationPlan.
#   - Intent implementation remains deferred.
#
# The final classic-parity drift layer. Recommended next slice:
# RuntimeGraphDriftReport safety review.
#
# RuntimeGraphDriftReport v1 decision has shipped. Seventy-third slice on
# the codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch. Decides the v1 model for
# RuntimeGraphDriftReport, the fifth and final spine artifact: compares
# StepCapabilityGraph / HandoffContract / HandoffCoverageReport /
# RuntimeGraphObservationReport for expected-vs-observed runtime graph drift.
# Recommendation: Option B — compare existing graph artifacts (drift rows:
# missing-expected / added-observed / uncovered-handoff / unresolved-contract
# / observation-missing / not-evaluated, severity-bucketed).
#   - RuntimeGraphDriftReport is expected-vs-observed runtime graph drift,
#     not runtime observation.
#   - RuntimeGraphDriftReport is not HandoffCoverageReport.
#   - RuntimeGraphDriftReport is not PathFreshnessReport or artifact lineage
#     freshness.
#   - RuntimeGraphDriftReport v1 does not read raw handoff event logs
#     directly.
#   - RuntimeGraphDriftReport v1 does not create WorkOrder or
#     VerificationPlan.
#   - Intent implementation remains deferred.
#
# Recommended next slice: RuntimeGraphDriftReport v1 implementation.
#
# RuntimeGraphObservationReport safety review has shipped. Seventy-second
# slice on the codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch. Read-only end-to-end review of the
# RuntimeGraphObservationReport v1 implementation at 2c4ee04.
#   - RuntimeGraphObservationReport is observed runtime graph, not declared
#     topology.
#   - RuntimeGraphObservationReport is not HandoffCoverageReport.
#   - RuntimeGraphObservationReport v1 does not evaluate declared handoff
#     coverage.
#   - RuntimeGraphObservationReport v1 does not detect runtime graph drift.
#   - RuntimeGraphObservationReport v1 does not create WorkOrder or
#     VerificationPlan.
#   - Intent implementation remains deferred.
#
# Recommendation: safe / stable as observed runtime graph (no blocker).
# RuntimeGraphDriftReport remains the next layer. Recommended next slice:
# RuntimeGraphDriftReport architecture / v1 decision.
#
# RuntimeGraphObservationReport v1 implementation has shipped.
# Seventy-first slice on the codebase-intel-classic capability-ontology
# track. Product-capability batch. Registers the
# RuntimeGraphObservationReport artifact (category graphs) and a read-only
# generator from optional .rekon/handoff-events.jsonl via rekon runtime
# graph observe. Observed step/feature/event/source nodes + handoff/emitted-by
# edges with observedCount + line evidence; non-handoff rows -> ignoredRows;
# invalid lines -> parseErrors; missing log -> zero nodes/edges.
#   - RuntimeGraphObservationReport is observed runtime graph, not declared
#     topology.
#   - RuntimeGraphObservationReport is not HandoffCoverageReport.
#   - RuntimeGraphObservationReport v1 does not evaluate declared handoff
#     coverage.
#   - RuntimeGraphObservationReport v1 does not detect runtime graph drift.
#   - RuntimeGraphObservationReport v1 does not create WorkOrder /
#     VerificationPlan.
#   - Intent implementation remains deferred.
#
# RuntimeGraphDriftReport remains the next layer after runtime observation.
# Recommended next slice: RuntimeGraphObservationReport safety review.
#
# RuntimeGraphObservationReport v1 decision has shipped. Seventieth slice
# on the codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch. Decides the v1 model for
# RuntimeGraphObservationReport, the fourth spine artifact: an observed
# runtime graph generated from raw handoff_event logs
# (.rekon/handoff-events.jsonl). Recommendation: Option B — raw
# handoff_event log -> observed graph (observed step/feature/event/source
# nodes + handoff edges; ignoredRows + parseErrors; missing log -> zero
# nodes/edges).
#   - RuntimeGraphObservationReport is observed runtime graph, not declared
#     topology.
#   - RuntimeGraphObservationReport is not HandoffCoverageReport.
#   - RuntimeGraphObservationReport v1 does not evaluate declared handoff
#     coverage.
#   - RuntimeGraphObservationReport v1 does not detect runtime graph drift.
#   - RuntimeGraphObservationReport v1 does not create WorkOrder or
#     VerificationPlan.
#   - Intent implementation remains deferred.
#
# RuntimeGraphDriftReport remains the next layer after runtime observation.
# Recommended next slice: RuntimeGraphObservationReport v1 implementation.
#
# HandoffCoverageReport safety review has shipped. Sixty-ninth slice on
# the codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch. Read-only end-to-end review of the
# HandoffCoverageReport v1 implementation at 8e0a617.
#   - HandoffCoverageReport is handoff-event coverage, not VerificationRun
#     command success.
#   - Missing event log means not-evaluated, not uncovered; present log
#     without a match means uncovered.
#   - added-observed rows are unmatched observed handoff_event rows; invalid
#     lines count parseErrors without aborting.
#   - HandoffCoverageReport v1 does not create RuntimeGraphObservationReport.
#   - HandoffCoverageReport v1 does not detect runtime graph drift.
#   - HandoffCoverageReport v1 does not create WorkOrder or VerificationPlan.
#   - Intent implementation remains deferred.
#
# Recommendation: safe / stable as narrow handoff-event coverage (no
# blocker). Recommended next slice: RuntimeGraphObservationReport
# architecture / v1 decision.
#
# HandoffCoverageReport v1 implementation has shipped. Sixty-eighth slice
# on the codebase-intel-classic capability-ontology track.
# Product-capability batch. Registers the HandoffCoverageReport artifact
# (category actions) and a read-only generator from HandoffContract +
# optional .rekon/handoff-events.jsonl via rekon handoff coverage report.
# Statuses: covered / uncovered / unresolved-contract / added-observed /
# not-evaluated (missing log -> not-evaluated; present-no-match ->
# uncovered; unmatched observed -> added-observed; invalid lines ->
# parseErrors, non-fatal).
#   - HandoffCoverageReport is handoff-event coverage, not VerificationRun
#     command success.
#   - HandoffCoverageReport v1 creates no RuntimeGraphObservationReport /
#     RuntimeGraphDriftReport.
#   - HandoffCoverageReport v1 creates no WorkOrder / VerificationPlan.
#   - HandoffCoverageReport v1 includes no intent implementation.
#
# See docs/artifacts/handoff-coverage-report.md.
# Recommended next slice: HandoffCoverageReport safety review.
#
# HandoffCoverageReport v1 decision has shipped. Sixty-seventh slice on
# the codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch.
#
# Decides the v1 model for HandoffCoverageReport, the third spine
# artifact, comparing declared HandoffContract handoffs against observed
# handoff events. Recommendation: Option B — HandoffContract + an
# optional raw handoff event log (.rekon/handoff-events.jsonl); statuses
# covered / uncovered / unresolved-contract / added-observed /
# not-evaluated.
#   - HandoffCoverageReport is handoff-event coverage, not VerificationRun
#     command success.
#   - HandoffCoverageReport v1 does not create RuntimeGraphObservationReport.
#   - HandoffCoverageReport v1 does not detect runtime graph drift.
#   - HandoffCoverageReport v1 does not create WorkOrder or VerificationPlan.
#   - RuntimeGraphObservationReport remains the next runtime layer after
#     coverage.
#   - RuntimeGraphDriftReport remains deferred.
#   - Intent implementation remains deferred.
#
# New strategy memo docs/strategy/handoff-coverage-report-v1-decision.md
# (13 headings + 4 tables). New 17-assertion docs test. Review packet
# .rekon-dev/review-packets/handoff-coverage-report-v1-decision.md.
#
# No runtime behavior changes. No source under packages/ modified. No new
# artifact type. No new CLI command. No version bump. No npm publish.
#
# Recommended next slice: HandoffCoverageReport v1 implementation.
#
# HandoffContract safety review has shipped. Sixty-sixth slice on the
# codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch.
#
# Read-only end-to-end review of the HandoffContract v1 implementation
# shipped at 0c2be5d. Recommendation: safe / stable as declared baton
# policy (no blocker).
#   - HandoffContract is declared baton policy, not StepCapabilityGraph
#     topology.
#   - HandoffContract v1 does not evaluate handoff coverage.
#   - HandoffContract v1 does not read runtime events.
#   - HandoffContract v1 does not detect runtime graph drift.
#   - HandoffContract v1 does not create WorkOrder or VerificationPlan.
#   - HandoffContract v1 does not implement intent.
#   - HandoffCoverageReport remains the next layer after HandoffContract.
#
# New strategy memo docs/strategy/handoff-contract-safety-review.md (12
# headings + 4 tables). New 16-assertion docs test. Review packet
# .rekon-dev/review-packets/handoff-contract-safety-review.md.
#
# No runtime behavior changes. No source under packages/ modified. No new
# artifact type. No new CLI command. No version bump. No npm publish.
#
# Recommended next slice: HandoffCoverageReport architecture / v1
# decision.
#
# HandoffContract v1 has shipped. Sixty-fifth slice on the
# codebase-intel-classic capability-ontology track. Product capability
# batch.
#
# Implements the second artifact in the staged step/handoff/runtime graph
# spine. New artifact type HandoffContract (kernel-repo-model + SDK +
# runtime actions category), buildHandoffContract +
# parseHandoffContractConfig in @rekon/capability-model, and a
# rekon handoff contract build CLI command. v1 materializes declared
# baton policy from an optional .rekon/handoff-contracts.json over the
# current StepCapabilityGraph (declared / unresolved-step).
#   - HandoffContract is declared baton policy.
#   - HandoffContract is not StepCapabilityGraph topology.
#   - HandoffContract v1 does not evaluate coverage.
#   - HandoffContract v1 does not read runtime events.
#   - HandoffContract v1 does not detect runtime graph drift.
#   - HandoffContract v1 does not create WorkOrder / VerificationPlan.
#   - Config is optional and never mutated.
#
# New artifact reference docs/artifacts/handoff-contract.md, new concept
# docs/concepts/handoff-contract.md. New 27-assertion contract test +
# 11-assertion docs test. Review packet
# .rekon-dev/review-packets/handoff-contract-v1.md.
#
# No mutation of StepCapabilityGraph or the config. No npm publish. No
# version bump.
#
# Recommended next slice: HandoffContract safety review.
#
# HandoffContract v1 decision has shipped. Sixty-fourth slice on the
# codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch.
#
# Decides the v1 model for HandoffContract, the second spine artifact,
# declaring expected baton passes over StepCapabilityGraph step ids.
# Recommendation: Option B — a config + artifact effective contract
# (optional .rekon/handoff-contracts.json + an effective HandoffContract
# artifact over the current graph; missing step refs -> unresolved-step).
#   - HandoffContract is declared baton policy, not StepCapabilityGraph
#     topology.
#   - HandoffContract v1 does not evaluate handoff coverage.
#   - HandoffContract v1 does not read runtime events.
#   - HandoffContract v1 does not detect runtime graph drift.
#   - HandoffCoverageReport remains the next layer after HandoffContract.
#   - RuntimeGraphObservationReport and RuntimeGraphDriftReport remain
#     deferred.
#   - HandoffContract does not create WorkOrder or VerificationPlan.
#   - Intent implementation remains deferred.
#
# New strategy memo docs/strategy/handoff-contract-v1-decision.md (13
# headings + 4 tables). New 18-assertion docs test. Review packet
# .rekon-dev/review-packets/handoff-contract-v1-decision.md.
#
# No runtime behavior changes. No source under packages/ modified. No new
# artifact type. No new CLI command. No version bump. No npm publish.
#
# Recommended next slice: HandoffContract v1 implementation.
#
# StepCapabilityGraph safety review has shipped. Sixty-third slice on
# the codebase-intel-classic capability-ontology track. Strategy /
# safety-review batch.
#
# Read-only end-to-end review of the StepCapabilityGraph v1
# implementation shipped at 783b7df. Recommendation: safe / stable as
# expected workflow topology (no blocker).
#   - StepCapabilityGraph is expected workflow topology, not runtime
#     truth.
#   - StepCapabilityGraph is workflow topology, not CapabilityMap v2.
#   - Optional .rekon/step-capability-map.json config is
#     grouping/labeling only.
#   - It does not create HandoffContract.
#   - It does not model handoff coverage.
#   - It does not detect runtime graph drift.
#   - It does not create WorkOrder or VerificationPlan.
#   - Intent implementation remains deferred.
#
# New strategy memo
# docs/strategy/step-capability-graph-safety-review.md (12 headings + 4
# tables). New 16-assertion docs test. Review packet
# .rekon-dev/review-packets/step-capability-graph-safety-review.md.
#
# No runtime behavior changes. No source under packages/ modified. No new
# artifact type. No new CLI command. No version bump. No npm publish.
#
# Recommended next slice: HandoffContract architecture / v1 decision.
#
# StepCapabilityGraph v1 has shipped. Sixty-second slice on the
# codebase-intel-classic capability-ontology track. Product capability
# batch.
#
# Implements the first artifact in the staged step/handoff/runtime graph
# spine. New artifact type StepCapabilityGraph (kernel-repo-model + SDK +
# runtime graphs category), buildStepCapabilityGraph +
# parseStepCapabilityGraphConfig in @rekon/capability-model, and a
# rekon step graph build CLI command. v1 projects an expected workflow
# topology graph from EvidenceGraph + CapabilityMap v2 +
# CapabilityPhraseReport, with an optional .rekon/step-capability-map.json
# for grouping/labeling only.
#   - StepCapabilityGraph v1 is expected workflow topology.
#   - It is not CapabilityMap v2.
#   - It does not model runtime handoff coverage.
#   - It does not detect runtime graph drift.
#   - It does not create HandoffContract / WorkOrder / VerificationPlan.
#   - It does not implement intent.
#   - Optional config is grouping/labeling only.
#
# New artifact reference docs/artifacts/step-capability-graph.md, new
# concept docs/concepts/step-capability-graph.md. New 28-assertion contract
# test + 12-assertion docs test. Review packet
# .rekon-dev/review-packets/step-capability-graph-v1.md.
#
# No mutation of EvidenceGraph / CapabilityMap / CapabilityPhraseReport. No
# npm publish. No version bump.
#
# Recommended next slice: StepCapabilityGraph safety review.
#
# StepCapabilityGraph v1 decision has shipped. Sixty-first slice on
# the codebase-intel-classic capability-ontology track. Strategy /
# architecture decision batch (v1 shape + inputs only).
#
# Decision: projection + optional config. StepCapabilityGraph v1 is
# derived by projection from EvidenceGraph + CapabilityMap v2 +
# CapabilityPhraseReport, with an optional .rekon/step-capability-map.json
# used only for grouping/labeling (projection works with no config).
#   - StepCapabilityGraph v1 is an expected workflow topology graph.
#   - It does not model runtime truth, handoff coverage, or execution
#     readiness.
#   - StepCapabilityGraph is workflow topology, not CapabilityMap v2.
#   - The optional config is optional grouping and labeling, not a
#     manual-admin-heavy system.
#   - Expected-handoff + runtime-grounding fields are reserved (empty
#     in v1).
#
# New strategy memo
# docs/strategy/step-capability-graph-v1-decision.md (14 headings + 4
# tables). New 16-assertion docs test. Review packet
# .rekon-dev/review-packets/step-capability-graph-v1-decision.md.
#
# No runtime behavior changes. No source under packages/ modified. No new
# artifact type. No new CLI command. No version bump. No npm publish.
#
# Recommended next slice: StepCapabilityGraph v1 implementation.
#
# StepCapabilityGraph / HandoffContract architecture decision has
# shipped. Sixtieth slice on the codebase-intel-classic
# capability-ontology track. Strategy / architecture decision batch.
#
# Decides the Rekon-native architecture for the classic step-capability
# graph + baton / handoff system. Recommendation: Option B — a staged
# step/handoff/runtime graph spine, introducing five reserved artifacts
# in sequence: StepCapabilityGraph, HandoffContract,
# HandoffCoverageReport, RuntimeGraphObservationReport,
# RuntimeGraphDriftReport. Does not start with runtime drift.
#   - StepCapabilityGraph is workflow topology, not CapabilityMap v2.
#   - HandoffContract is declared baton policy, not WorkOrder.
#   - HandoffCoverageReport is handoff-event coverage, not
#     VerificationRun command success.
#   - RuntimeGraphDriftReport is runtime graph drift, not
#     PathFreshnessReport or artifact lineage freshness.
#   - Intent parity depends on StepCapabilityGraph, HandoffContract,
#     HandoffCoverageReport, and RuntimeGraphDriftReport.
#
# New strategy memo
# docs/strategy/step-capability-handoff-architecture-decision.md
# (15 headings + 4 tables). New 15-assertion docs test. Review packet
# .rekon-dev/review-packets/step-capability-handoff-architecture-decision.md.
#
# No runtime behavior changes. No source under packages/ modified. No new
# artifact type. No new CLI command. No version bump. No npm publish.
#
# Recommended next slice: StepCapabilityGraph v1 decision.
#
# Classic step-capability / handoff / runtime drift parity audit has
# shipped. Fifty-ninth slice on the codebase-intel-classic
# capability-ontology track. Strategy / architecture audit batch.
#
# Paused the lifecycle chain to deeply audit the legacy codebase-intel
# source (read-only, not imported) for the step-capability graph, baton /
# handoff system, handoff coverage, step-handler + derive validation,
# runtime graph drift, and watcher / continuity surfaces.
#
# Finding: Rekon has adjacent foundations, but the classic
# step-capability / handoff / runtime drift system is not yet fully
# accounted for.
#   - Runtime graph drift is not PathFreshnessReport / lineage freshness.
#   - Handoff coverage is not VerificationRun command success.
#   - StepCapabilityGraph is not CapabilityMap v2.
#   - Intent parity depends on step-capability, handoff, and runtime
#     drift surfaces.
#
# Reserves StepCapabilityGraph, HandoffContract, HandoffCoverageReport,
# RuntimeGraphObservationReport, RuntimeGraphDriftReport; evaluates
# DerivedGraphValidationReport + StepHandlerValidationReport.
#
# New strategy memo
# docs/strategy/classic-step-capability-handoff-runtime-drift-parity-audit.md
# (21 headings + 4 tables). New 20-assertion docs test. Review packet
# .rekon-dev/review-packets/classic-step-capability-handoff-runtime-drift-parity-audit.md.
#
# No runtime behavior changes. No source under packages/ modified. No new
# artifact type. No new CLI command. No version bump. No npm publish.
#
# Recommended next slice: StepCapabilityGraph / HandoffContract
# architecture decision.
#
# BridgeFindingLifecycleIntegrationReport safety review has shipped.
# Fifty-eighth slice on the codebase-intel-classic
# capability-ontology track. Strategy / safety-review batch.
#
# Read-only end-to-end review of the
# BridgeFindingLifecycleIntegrationReport v1 preview artifact shipped
# at c908857. Recommendation: safe / stable preview artifact (no
# blocker).
#   - BridgeFindingLifecycleIntegrationReport is preview, not
#     FindingLifecycleReport.
#   - initialLifecycleStatus is modeled status only and does not
#     mutate FindingLifecycleReport.
#   - No FindingFilterReport / FindingLifecycleReport /
#     IssueAdjudicationReport / CoherencyDelta mutation.
#   - No WorkOrder / VerificationPlan creation.
#   - No source writes.
#   - CoherencyDelta integration remains downstream of lifecycle and
#     adjudication.
#
# New strategy memo
# docs/strategy/bridge-finding-lifecycle-integration-report-safety-review.md
# (12 headings + 4 tables). New 16-assertion docs test. Review packet
# .rekon-dev/review-packets/bridge-finding-lifecycle-integration-report-safety-review.md.
#
# No runtime behavior changes. No source under packages/ modified. No
# new artifact type. No new CLI command. No version bump. No npm
# publish.
#
# Recommended next slice: BridgeFindingLifecycleIntegrationReport
# publication surfacing.
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

## Semantic File Understanding v1

Rekon has a per-file semantic understanding capability (slice 144): `rekon semantic file understand` produces a `SemanticFileUnderstandingReport`. Deterministic structural extraction (language, line/byte counts, imports, public exports, responsibilities) is always on and authoritative for imports/exports (the hallucination guard); optional LLM semantic understanding is a schema-validated, deterministically-rechecked proposal, not proof. It executes no commands, writes no source files, generates no embeddings, creates no PreparedIntentPlan / WorkOrder / VerificationPlan, runs no Circe, and intent:go remains deferred. See [Semantic File Understanding v1](docs/strategy/semantic-file-understanding-v1.md) and the [concept](docs/concepts/semantic-file-understanding.md).

## Semantic File Understanding Safety Review

Semantic File Understanding v1 was reviewed (slice 145) and found **safe/stable** as a proposal/context layer: semantic file understanding is proposal/context, not proof; deterministic structural facts remain authoritative for imports and public exports; provider output is schema-validated and deterministically rechecked; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go, scan integration, and embeddings remain deferred. Next: a Semantic File Understanding Scan Integration Decision. See [Semantic File Understanding Safety Review](docs/strategy/semantic-file-understanding-safety-review.md).

## Semantic File Understanding Scan Integration Decision

How `SemanticFileUnderstandingReport` integrates with scan is decided (slice 146): scan remains deterministic by default; repo-scale understanding arrives first as an explicit batch command (`rekon semantic files understand --changed|--all`) before any `rekon scan --semantic-files` flag. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. Next: Semantic Files Understand Batch Command v1. See [Semantic File Understanding Scan Integration Decision](docs/strategy/semantic-file-understanding-scan-integration-decision.md).

## Semantic File Understanding Scan Integration

Semantic file understanding is now an explicit opt-in scan layer (slice 147): `rekon scan --semantic-files auto|required` writes one `SemanticFileUnderstandingReport` per selected file, reusing the shipped single-file builder and router-bound adapter. Plain `rekon scan` (and `--semantic-files off`) stay deterministic and call no provider. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. This reverses the slice-146 batch-command-first decision. See [Semantic File Understanding Scan Integration](docs/strategy/semantic-file-understanding-scan-integration.md).

## Semantic File Understanding Scan Integration Safety Review

The `rekon scan --semantic-files off|auto|required` integration was reviewed (slice 148) and found **safe/stable**: plain `rekon scan` remains deterministic; semantic file understanding during scan is explicit opt-in only; provider calls are never surprising defaults; source text is not sent to providers by default; `--semantic-files off` writes no report; auto falls back safely; required fails cleanly without partial report writes; deterministic imports/exports remain authoritative; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go deferred; reports are not yet consumed automatically by intent context. Next: Semantic File Understanding Intent Context Decision; embeddings remain a separate track. See [Semantic File Understanding Scan Integration Safety Review](docs/strategy/semantic-file-understanding-scan-integration-safety-review.md).

## Semantic File Understanding Intent Context Decision

How `IntentAssessmentReport` and `IntentPlanActionabilityReport` may consume `SemanticFileUnderstandingReport` is decided (slice 149): **Option B — explicit semantic context consumption with latest-by-path fallback** (`rekon intent assess --semantic-context latest|--semantic-context-ref <ref>`, `rekon intent plan review --semantic-context latest|--semantic-context-ref <ref>`). Semantic reports remain proposal/context, not proof; consumption is explicit, not automatic; semantic context never approves plans, satisfies proof gates by itself, replaces deterministic evidence, executes commands, writes source, creates WorkOrder/VerificationPlan, or runs Circe; stale reports are not consumed silently; embeddings and intent:go remain deferred. Next: Semantic File Understanding Intent Context Implementation. See [Semantic File Understanding Intent Context Decision](docs/strategy/semantic-file-understanding-intent-context-decision.md).

### Intent semantic context — implemented (slice 150)

The slice-149 decision is now implemented: `rekon intent assess` / `rekon intent plan review` consume SemanticFileUnderstandingReport(s) as proposal/context via `--semantic-context latest` or `--semantic-context-ref <ref>`, never as proof. See [Semantic File Understanding Intent Context Implementation](docs/strategy/semantic-file-understanding-intent-context-implementation.md).

## Semantic File Understanding Intent Context Safety Review

The slice-150 semantic intent-context integration was ground-reviewed and declared safe/stable: `SemanticFileUnderstandingReport` consumption by `rekon intent assess` / `rekon intent plan review` is explicit, proposal/context-only, never weakens readiness/proof gates, and stale reports are never consumed silently. See [Semantic File Understanding Intent Context Safety Review](docs/strategy/semantic-file-understanding-intent-context-safety-review.md).

## Capability Evidence Graph / Semantic Intelligence

Rekon's next semantic-intelligence substrate is a `CapabilityEvidenceGraph`: deterministic facts, LLM interpretation, ontology labels, embedding similarity, runtime traces, and human overrides become evidence-backed claims. Embeddings are one evidence source, not the center — embedding similarity is proposal, not proof. See [Capability Evidence Graph / Semantic Intelligence Architecture Decision](docs/strategy/capability-evidence-graph-semantic-intelligence-decision.md).
