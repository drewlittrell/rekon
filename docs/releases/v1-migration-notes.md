# Rekon V1 Migration Notes

> **TaskContextReport Broader Workflow Decision (slice 176):** strategy / architecture decision batch — no API, artifact, or command changed; nothing to migrate. Pins TaskContextReport's product role as the standard pre-intent / pre-work context substrate (context only, never proof/approval; consumption stays explicit; the deterministic spine stays separately gated). See [`task-context-report-broader-workflow-decision.md`](../strategy/task-context-report-broader-workflow-decision.md).

> **Intent Planning UX / Context Quality Fix (slice 175):** product capability batch — additive output only; nothing to migrate. `rekon context task` gains a graph + lexical fallback for the implicit-provider missing-key case (new `selectLexicalGraphContextPaths` helper + additive `providerExplicit` / `retrieval` JSON fields + `provider-unavailable` / `graph-lexical-fallback` warning codes); no type, artifact, command, or existing behavior changed. See [`intent-planning-ux-context-quality-fix.md`](../strategy/intent-planning-ux-context-quality-fix.md).

> **TaskContextReport Intent Dogfood Safety Review (slice 174):** strategy / safety-review batch — no API, artifact, or command changed; nothing to migrate. Reviewed the slice-173 full task-context intent dogfood path end-to-end and declared it safe/stable (gates held; task context stays proposal/context, not proof). See [`task-context-report-intent-dogfood-safety-review.md`](../strategy/task-context-report-intent-dogfood-safety-review.md).

> **TaskContextReport Intent Dogfood (slice 173):** product dogfood / review batch — no API, artifact, or command changed; nothing to migrate. Ran the full operator path with opt-in task context and confirmed it improves planning while every gate holds. See [`task-context-report-intent-dogfood.md`](../strategy/task-context-report-intent-dogfood.md).

> **TaskContextReport Intent Integration Safety Review (slice 172):** strategy / safety-review batch — no API, artifact, or command changed; nothing to migrate. Reviewed the slice-171 opt-in TaskContextReport consumption by `rekon intent assess` / `rekon intent plan review` and declared it safe/stable (additive context only, prepare by lineage). See [`task-context-report-intent-integration-safety-review.md`](../strategy/task-context-report-intent-integration-safety-review.md).

> **TaskContextReport Intent Integration Implementation (slice 171):** additive — nothing to migrate. `rekon intent assess` and `rekon intent plan review` gain an OPTIONAL `--task-context latest|<ref>` flag (omit it → byte-identical prior behavior; the `taskContext` JSON key and human line appear only when a selection is requested). Both intent builders accept a new OPTIONAL `taskContext` input. No artifact schema, registration, command, or version change. See [`task-context-report-intent-integration-implementation.md`](../strategy/task-context-report-intent-integration-implementation.md).

> **TaskContextReport Intent Integration Decision (slice 170):** strategy / architecture decision-only batch — no API, artifact, or command changed; nothing to migrate. Decides explicit opt-in TaskContextReport consumption by `rekon intent assess` / `rekon intent plan review` (prepare by lineage only) for the implementation slice that follows. See [`task-context-report-intent-integration-decision.md`](../strategy/task-context-report-intent-integration-decision.md).

> **TaskContextReport Selection Quality Fix (slice 169):** additive — nothing to migrate. `rekon context task` verification hints may now include free-form `manual-verification` entries (no `command` field, using the already-optional `artifact` field), and the `retrieval-low-signal` warning string is enriched; no type, artifact, command, or existing behavior changed. See [`task-context-report-selection-quality-fix.md`](../strategy/task-context-report-selection-quality-fix.md).

> **TaskContextReport Dogfood Review (slice 168):** product dogfood / review batch — additive output only; nothing to migrate. `rekon context task` adds one advisory `retrieval-low-signal` string to its existing `warnings[]` array when retrieval ran but every neighbor scored below the useful band; no type, artifact, command, or existing behavior changed (the string does not contain `retrieval-unavailable`, so consumers keying on that are unaffected). See [`task-context-report-dogfood-review.md`](../strategy/task-context-report-dogfood-review.md).

> **TaskContextReport Safety Review (slice 167):** strategy / safety-review batch — no API, artifact, or command changed; nothing to migrate. Confirms TaskContextReport v1 is safe/stable as proposal/context. See [`task-context-report-safety-review.md`](../strategy/task-context-report-safety-review.md).

> **TaskContextReport v1 (slice 166):** additive — nothing to migrate. New `TaskContextReport` artifact + `buildTaskContextReport` helper (`@rekon/kernel-repo-model` / `@rekon/capability-model`) and a new `rekon context task` command; no existing command, type, or behavior changed. The new artifact is written to the `.rekon/` store under the `actions` category. See [`task-context-report-v1.md`](../strategy/task-context-report-v1.md).

> **Task-Shaped Context / Embedding Retrieval Decision (slice 165):** strategy / architecture decision-only batch — no API, artifact, or command changed; nothing to migrate. Decides task-shaped context (a future `TaskContextReport` artifact + `rekon context task` command) as the first retrieval consumer, sketched for the implementation slice that follows. See [`task-shaped-context-embedding-retrieval-decision.md`](../strategy/task-shaped-context-embedding-retrieval-decision.md).

> **Embedding Query Input-Type / Ranking Policy Implementation (slice 164):** additive — nothing to migrate. `rekon embeddings query` now uses `input_type=query`, defaults to top-k 8 (max 20), and adds `scoreBand`/`chunk`/`explanation`/`boundaries` + a `query` block to its JSON (the old `matches` array and its flat `path`/`kind`/`score` are retained, so existing callers are unaffected); `rekon embeddings index` reports `inputType: "document"`. No artifact or graph change. See [`embedding-query-input-type-ranking-policy-implementation.md`](../strategy/embedding-query-input-type-ranking-policy-implementation.md).

> **Embedding Retrieval / Similarity Ranking Decision (slice 163):** strategy / architecture decision-only batch — no API, artifact, or command changed; nothing to migrate. Pins retrieval ranking policy (score bands, default top-k 8 / max 20, `input_type=query` for queries, task-shaped context as the first consumer) for the implementation slice that follows. See [`embedding-retrieval-similarity-ranking-decision.md`](../strategy/embedding-retrieval-similarity-ranking-decision.md).

> **Live Voyage Embedding Dogfood (slice 162):** live-provider dogfood / review batch — no API, artifact, or command changed; nothing to migrate. The real Voyage provider (`voyage-code-3`) was exercised and confirmed paraphrase-robust; the committed test suite stays keyless (the gated live contract test skips without `VOYAGE_API_KEY` + `REKON_RUN_LIVE_EMBEDDING_TESTS=1`); the key is read from the environment only and is never committed. See [`live-voyage-embedding-dogfood.md`](../strategy/live-voyage-embedding-dogfood.md).

> **Embedding Retrieval / Graph dogfooded (slice 161):** product dogfood / review batch — no API, artifact, or command changed; nothing to migrate. The shipped embedding index/retrieval/graph path was exercised on a realistic fixture and found useful and safe. See [`embedding-retrieval-graph-dogfood-review.md`](../strategy/embedding-retrieval-graph-dogfood-review.md).

> **Embedding Provider / Index safety-reviewed (slice 160):** strategy/safety-review batch — no API, artifact, or command changed; nothing to migrate. The slice-159 implementation was confirmed safe/stable. See [`embedding-provider-index-safety-review.md`](../strategy/embedding-provider-index-safety-review.md).

> **Embedding Provider / Index v1 shipped (slice 159):** additive only — nothing to migrate. New optional exports (`createVoyageEmbeddingProvider` in `@rekon/llm-provider`; the `embedding-index` surface + `BuildCapabilityEvidenceGraphInput.embeddingSimilarities?` in `@rekon/capability-model`) and new opt-in CLI surfaces (`rekon embeddings index`, `rekon embeddings query`, `rekon capability graph build --embedding-similarity latest`). Existing commands are unchanged; a plain `rekon capability graph build` folds in no embeddings; the embeddings cache is gitignored under `.rekon/cache/embeddings`. `VOYAGE_API_KEY` is read from the environment only — never add it to repo config. See [`embedding-provider-index-v1.md`](../strategy/embedding-provider-index-v1.md).

> **Embeddings track started (slice 158):** strategy/architecture decision-only batch — no API, artifact, or command changed; nothing to migrate. Starts the embeddings track (Voyage-first embeddings as `embedding_similarity` graph evidence) with no implementation. See [`embedding-provider-index-decision.md`](../strategy/embedding-provider-index-decision.md).

> **Semantic → Evidence Graph integration safety-reviewed (slice 157):** strategy/safety-review batch — no API, artifact, or command changed; nothing to migrate. The slice-156 integration was confirmed safe/stable. See [`semantic-file-understanding-evidence-graph-integration-safety-review.md`](../strategy/semantic-file-understanding-evidence-graph-integration-safety-review.md).

> **Semantic → Evidence Graph integration implemented (slice 156):** additive only — two new optional flags on `rekon capability graph build` (`--semantic-file-reports latest`, `--semantic-file-report-ref <ref>`) and new `@rekon/capability-model` exports (`selectSemanticReportsForGraph`, `SemanticReportForGraph`). No existing artifact, signature, or command changed; with no flags the build is byte-for-byte identical to before. Nothing to migrate. See [`semantic-file-understanding-evidence-graph-integration-implementation.md`](../strategy/semantic-file-understanding-evidence-graph-integration-implementation.md).

> **Semantic → Evidence Graph integration decided (slice 155):** strategy/architecture decision-only batch — no API, artifact, or command changed; nothing to migrate. Pins how `SemanticFileUnderstandingReport` will later contribute `llm_extraction` evidence and `llm` / `inference` claims to `CapabilityEvidenceGraph` (Option B, explicit/opt-in). See [`semantic-file-understanding-evidence-graph-integration-decision.md`](../strategy/semantic-file-understanding-evidence-graph-integration-decision.md).

> **Capability Evidence Graph safety-reviewed (slice 154):** strategy/safety-review batch — no API, artifact, or command changed; nothing to migrate. The v1 substrate was confirmed safe/stable. See [`capability-evidence-graph-safety-review.md`](../strategy/capability-evidence-graph-safety-review.md).

> **Capability Evidence Graph v1 shipped (slice 153):** additive only — a new `CapabilityEvidenceGraph` artifact type, new `@rekon/capability-model` exports (`buildCapabilityEvidenceGraph`), and a new `rekon capability graph build` command. No existing artifact, signature, or command changed; nothing to migrate. See [`capability-evidence-graph.md`](../artifacts/capability-evidence-graph.md).

> **LLM-semantic parity decided (slice 143):** an audit of the old codebase-intel system separated Track A (finish LLM-backed semantic parsing — the one real non-embedding gap is per-file semantic file understanding) from Track B (embeddings, deferred). Semantic output stays proposal-not-proof; no approval/execution/source-writes/Circe. See [`classic-llm-semantic-parsing-parity-decision.md`](../strategy/classic-llm-semantic-parsing-parity-decision.md).

> **Semantic quality hardened (slice 142):** provider phases are re-checked against the source — unsupported touched paths and verification commands become findings + warnings, dropped non-goals are flagged, and a weak plan cannot become actionable by filling fields without source support. Deterministic recheck stays authoritative. See [`intent-plan-semantic-quality-hardening.md`](../strategy/intent-plan-semantic-quality-hardening.md).

> **Semantic quality proven (slice 141):** LLM-backed semantic normalization was dogfooded live (OpenAI `gpt-4o-mini`) — it extracts objectives/deliverables/acceptance/paths/commands and preserves non-goals with **zero invented paths or commands**, while staying a proposal that is schema-gated and deterministically rechecked. See [`intent-plan-semantic-quality-dogfood.md`](../strategy/intent-plan-semantic-quality-dogfood.md).

> Migration guidance prepared by V1 Release Prep Implementation. No version bump, tag, or
> npm publish has occurred; packages remain at `0.1.0-beta.0`.

> **Fresh-repo dogfood (slice 140):** the operator path was re-proven end-to-end
> on a fresh repo and the bundle imported into a local Circe checkout; source +
> plan files stay unchanged and Rekon runs no Circe — see
> [`../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md).

> **Semantic normalization (slice 139):** `rekon intent plan review` can route
> rough-plan normalization through an LLM provider (`--llm-provider` /
> `--llm-model`, `REKON_LLM_*` env, key from `OPENAI_API_KEY`). It is opt-in and
> deterministic by default (`--semantic off`); API keys are never stored in repo
> config. See
> [`../strategy/intent-plan-compiler-semantic-normalization-dogfood.md`](../strategy/intent-plan-compiler-semantic-normalization-dogfood.md).

## Who Should Read This

Operators and maintainers who used Rekon during beta — especially anyone who relied on the
legacy `rekon prepare plan` direction or the `.rekon/handoffs` layout — and anyone adopting
the V1 non-executing Rekon → Circe prepared-plan handoff for the first time.

## Legacy Beta Surfaces

During beta, intent preparation was explored under a legacy `rekon prepare plan` direction
that wrote into a `.rekon/handoffs` layout. **Legacy `rekon prepare plan` / `.rekon/handoffs`
direction is superseded by `.rekon/intent/plans/<intent-id>/circe/`.** The V1 path is the
shipped, safety-reviewed intent pipeline; the legacy direction is not the V1 recommended
path.

## V1 Canonical Flow

```
rekon intent plan review
rekon intent assess
rekon intent prepare
rekon intent status
rekon intent work-order generate
rekon intent verification-plan generate
rekon intent bundle write
circe rekon-handoff validate
circe rekon-handoff routes
circe import rekon-handoff
```

> Optional gating (slice 131): `rekon intent prepare` accepts `--actionability-report <ref>`
> so a written plan's actionability gates preparation — an actionable report may feed
> `PreparedIntentPlan` generation, while a needs-revision / blocked report blocks
> preparation and returns the revision guidance (no plan written). It does not change the
> canonical flow above and adds no execution power: prepare still does not auto-approve,
> create a WorkOrder / VerificationPlan, execute commands, or write source; `intent:go`
> remains deferred. See
> [Intent Prepare Integration With Actionability Report](../strategy/intent-prepare-actionability-integration.md),
> safety-reviewed safe/stable in the
> [Intent Prepare Actionability Integration Safety Review](../strategy/intent-prepare-actionability-integration-safety-review.md).
> A future `rekon intent plan answer` (decided in the
> [Plan Actionability Answer / Merge-Back Decision](../strategy/plan-actionability-answer-merge-back-decision.md); shipped as `rekon intent plan answer` — [implementation](../strategy/plan-actionability-answer-merge-back-implementation.md))
> will merge answers into a new report revision; it adds no source writes, command execution, auto-approval,
> or `intent:go`, so it does not change the canonical flow above.

Rekon runs the first six commands to assess, prepare a proof-approved plan, report status,
generate the WorkOrder and VerificationPlan, and write the bundle. Circe then validates,
previews routes, and imports the handoff — and orchestrates execution.

> The optional `rekon intent plan review` step that precedes `intent assess` was safety-reviewed
> safe/stable as a read / transform / report-only plan-compiler layer (no downstream artifacts, no
> command execution, no source writes, no Circe). See the
> [Intent Plan Actionability Report Safety Review](../strategy/intent-plan-actionability-report-safety-review.md).

## Intent Bundle Directory

`.rekon/intent/plans/<intent-id>/` is the human + agent handoff bundle: the Markdown /
agent files for review and LLM handoff, regenerable from canonical artifacts.

## Circe Projection Directory

`.rekon/intent/plans/<intent-id>/circe/` is the Circe projection (the
`rekon-circe-handoff` package: `handoff.json`, `phase-plan.json`, `work-orders/`,
`verification-plans/`, plus the `rekon-proof.json` proof/gate sidecar). It is the
orchestration import projection that Circe consumes.

## Legacy Handoff Path

The legacy `.rekon/handoffs` path is not produced by the V1 pipeline. Operators should move
to `.rekon/intent/plans/<intent-id>/` (bundle) and `.rekon/intent/plans/<intent-id>/circe/`
(Circe projection). `.rekon/artifacts/` remains canonical truth — the bundle and projection
are regenerable projections of it.

## Command Mapping

| Legacy / beta surface | V1 recommended path |
| --- | --- |
| `rekon prepare plan` (legacy direction) | `rekon intent assess` → `prepare` → `status` → `work-order generate` → `verification-plan generate` → `bundle write` |
| `.rekon/handoffs/...` | `.rekon/intent/plans/<intent-id>/` (+ `circe/` projection) |
| (orchestration) | `circe rekon-handoff validate` / `routes`, `circe import rekon-handoff`, `circe serve --mode worker` |
| `intent:go` | not available — **intent:go is not available in V1.** |

The legacy `rekon intent work-order --path --goal` and `rekon intent remediation` commands
still exist as legacy/compatibility surfaces, but are not the V1 recommended path.

## What Changes Operationally

- Intent preparation now flows through the six rich `rekon intent ...` commands, all
  discoverable in top-level `rekon help`.
- The handoff to Circe is an explicit `circe rekon-handoff` import of the `circe/`
  projection, carrying Rekon's proof/gate state.
- Execution is owned by Circe, not Rekon.

## What Does Not Change

- `.rekon/artifacts/` remains canonical truth.
- `.rekon/intent/plans/<intent-id>/` is the human + agent handoff bundle.
- `.rekon/intent/plans/<intent-id>/circe/` is the Circe projection.
- Rekon does not execute commands and does not write source files; `intent:go` is not
  available in V1.

## Known Compatibility Notes

- Legacy `intent work-order --path --goal` / `intent remediation` remain available as
  compatibility surfaces; prefer the V1 canonical flow.
- The Circe projection is additive and validated against Circe's real normalizers; extra
  Rekon-owned fields (the proof sidecar, per-phase traceability) are tolerated and ignored
  by Circe.
- No package versions changed in this migration-notes slice; packages remain at
  `0.1.0-beta.0`.

## Update — First-Run Onboarding (slice 110)

The canonical first-run verb is moving to `rekon scan` (decided in
[Rekon First-Run Scan / Install Onboarding Decision](../strategy/rekon-first-run-scan-onboarding-decision.md)):
`rekon scan` initializes `.rekon/` if needed and creates the first repository intelligence
substrate, replacing `rekon refresh` as the documented first-run command. `refresh` remains an
expert / compatibility alias, so existing scripts that call `rekon refresh` continue to work.
This decision changes onboarding vocabulary only — no `rekon scan` implementation and no CLI
behavior change yet.

**Update (slice 111): `rekon scan` is now implemented.** The documented first-run command is
`rekon scan` (equivalent to `rekon init` + `rekon refresh` in one step); `rekon refresh`
remains available unchanged as the expert / compatibility update command, so existing
`rekon refresh` scripts continue to work. No package version change and no npm publish.

**Update (slice 112): `rekon scan` reviewed safe/stable.** The Rekon First-Run Scan Safety
Review confirmed `rekon scan` is safe as the canonical first-run command; `rekon refresh`
remains unchanged as the expert / compatibility update command. No package version change and
no npm publish.

**Update (slice 113): fresh-repo intent path.** On a fresh repo, run `rekon scan` then
`rekon intent context prepare` (builds StepCapabilityGraph + runtime/handoff context;
not-evaluated where there is no event log) before `rekon intent assess` — the documented public
intent sequence then works without manual `.rekon/artifacts` seeding. No package version change
and no npm publish.

**Update (slice 114): fresh-repo intent path reviewed safe/stable.** The Fresh Repo Intent
Readiness Safety Review confirmed the slice-113 fix is safe/stable: the fresh-repo public intent
sequence works without manual `.rekon/artifacts` seeding, `rekon scan` / `rekon refresh` are
unchanged, missing runtime/handoff evidence is recorded as not-evaluated / observation-missing
(not false success), Rekon runs no Circe and writes no source, and `intent:go` remains deferred.
No package version change and no npm publish. See
[Fresh Repo Intent Readiness Safety Review](../strategy/fresh-repo-intent-readiness-safety-review.md).

**Update (slice 115): phase-level verification is explicit in bundles.** Operators importing a
bundle into Circe now see a per-phase `verificationPosture` (`executable` / `final-verification` /
`manual-review` / `needs-review`) in `circe/rekon-proof.json` `phaseGates[]` and on
`circe/phase-plan.json` `phases[].rekon`; `phase-modify` / `phase-refactor` ship a per-phase
VerificationPlan when a safe executable requirement applies, `phase-verify` carries final
verification, and `phase-investigate` / `phase-review` are reviewer-gated. A phase without
executable verification is recorded as `manual-review` or `needs-review`, never silently verified.
All fields are additive and Circe-schema-compatible. No package version change and no npm publish.

**Update (slice 116): phase-level verification reviewed safe/stable.** The Intent Bundle Phase-Level
Verification Safety Review confirmed the slice-115 posture implementation is safe/stable: every
phase has explicit verification posture, skipped verification is not proof, and posture is
projection metadata (not a VerificationRun). No commands executed, no VerificationRun /
VerificationResult, no source writes, no Circe run by Rekon, `intent:go` deferred. No package
version change and no npm publish. See
[Intent Bundle Phase-Level Verification Safety Review](../strategy/intent-bundle-phase-level-verification-safety-review.md).

**Update (slice 117): install / setup / ASCII UX decided.** The Rekon Install / Setup / ASCII Art UX
Decision selected staged install/setup polish: the V1 install path stays `npm install -D @rekon/cli`
→ `npx rekon scan` (no postinstall onboarding), with a future optional `rekon setup` and later `npm
init rekon`. First-run setup starts with scan; ASCII art never appears in `--json`; non-TTY / CI never
prompt; `intent:go` remains deferred. Decision-only — nothing implemented this slice. No package
version change and no npm publish. See
[Rekon Install / Setup / ASCII Art UX Decision](../strategy/rekon-install-setup-ascii-ux-decision.md).

**Update (slice 118): setup / welcome UI implemented.** Operators get two new read-only commands:
`rekon welcome` (a branded Scan → Snapshot → Act introduction) and `rekon setup` (a deterministic,
non-interactive setup plan that detects workspace state without running scan or creating `.rekon/`).
ASCII art never appears in `--json`; `NO_COLOR` / `REKON_NO_BANNER` are respected; non-TTY never
prompts. `rekon scan` remains the canonical first-run command and `rekon refresh` stays expert /
compatibility. No prompts, no `create-rekon`, no postinstall, `intent:go` deferred. No package
version change and no npm publish. See [Rekon Setup / Welcome UI](../concepts/rekon-setup-welcome.md).

**Update (slice 119): setup / welcome UI reviewed safe/stable.** The Rekon Setup / Welcome UI Safety
Review confirmed `rekon welcome` / `rekon setup` are safe/stable: welcome is explanatory, setup is
deterministic / non-interactive, setup does not run scan or create `.rekon/` before scan, `--json`
is banner-free, and onboarding implies no command execution, source writes, or Circe run. `intent:go`
remains deferred. No package version change and no npm publish. See
[Rekon Setup / Welcome UI Safety Review](../strategy/rekon-setup-welcome-ui-safety-review.md).

**Update (slice 120): interactive setup prompt policy decided.** The Rekon Interactive Setup Prompt
Decision selects TTY-only scan-first prompts for `rekon setup`: prompts only in human TTY mode, never
in `--json` / non-TTY / CI; before scan only the first-scan prompt; a decided (unimplemented) `--yes`
runs the first scan only; no prompt persistence; setup never runs Circe, executes commands, or writes
source. `intent:go` remains deferred. Decision-only — no CLI or behavior change and no npm publish. See
[Rekon Interactive Setup Prompt Decision](../strategy/rekon-interactive-setup-prompt-decision.md).

**Update (slice 121): fresh-repo intent prepare is now planful.** On a fresh repo, after `rekon scan`
→ `rekon intent context prepare` → `rekon intent assess` (needs-review, zero hard blockers), `rekon
intent prepare` now produces an implementation-bearing **draft** plan (investigate / modify|refactor /
verify / review with safe `npm run typecheck` / `npm test` / `npm run build` requirements) instead of
a bare review phase. The draft stays `needs-review`; approval is never auto-elevated; WorkOrder and
VerificationPlan generation remain blocked until explicit approval. No commands execute, no source is
written, `intent:go` remains deferred. No package version change and no npm publish. See
[Intent Prepare Needs-Review Planfulness Fix](../strategy/intent-prepare-needs-review-planfulness.md).

**Update (slice 122): operator approval path decided.** The Intent Operator Approval / Proof
Acceptance Decision pins how a needs-review draft `PreparedIntentPlan` becomes approved: a future
`rekon intent approve` rechecks freshness / drift / status, records the operator's accepted proof
gaps, and writes a new approved plan revision (the source draft stays immutable). Approval enables but
does not create the WorkOrder / VerificationPlan handoff; no commands execute and no source is
written; `intent:go` remains deferred. Decision-only — no CLI or behavior change and no npm publish.
See [Intent Operator Approval / Proof Acceptance Decision](../strategy/intent-operator-approval-proof-acceptance-decision.md).

**Update (slice 123): operator approval is now implemented.** On a fresh repo, after `rekon scan` →
`rekon intent context prepare` → `rekon intent assess` → `rekon intent prepare` (a needs-review draft) →
`rekon intent status`, run `rekon intent approve --prepared-plan <ref> --intent-status <ref> --accept
<gap> [--accept <gap>...] --reason <text>` to write a **new approved** `PreparedIntentPlan` revision; the
source draft stays immutable. The required `--accept` gaps are exactly the draft's `approval.reasons`
mapped to gap ids (e.g. `verification-proof-missing`, `runtime-drift-unresolved`). Approval enables — it
does not create — the WorkOrder / VerificationPlan handoffs; it creates no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult, executes no commands, writes no source, and runs no Circe;
`intent:go` remains deferred. No package version change and no npm publish. See
[Intent Operator Approval / Proof Acceptance Implementation](../strategy/intent-operator-approval-proof-acceptance-implementation.md).

**Update (slice 124): operator approval reviewed safe/stable.** The Intent Operator Approval / Proof
Acceptance Safety Review confirmed `rekon intent approve` is safe/stable: explicit approval (never
auto-approved), recorded (not erased) accepted proof gaps, an immutable source draft, conservative
freshness / drift / status rechecks, and `sourceWriteAllowed` false. Approval enables but does not create
the WorkOrder / VerificationPlan handoffs; it creates no WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, executes no commands, writes no source, and runs no Circe; `intent:go` remains
deferred. After approval, WorkOrder / VerificationPlan generation can still stop at
`status-not-work-ready` (a separate IntentStatusReport gate). No package version change and no npm
publish. See
[Intent Operator Approval / Proof Acceptance Safety Review](../strategy/intent-operator-approval-proof-acceptance-safety-review.md).

**Update (slice 125): status work-ready transition decided.** After `rekon intent approve` writes an
approved `PreparedIntentPlan`, WorkOrder / VerificationPlan generation can still stop at
`status-not-work-ready` because the prior `IntentStatusReport` reflects pre-approval state. The Intent
Status Work-Ready Transition Decision pins the fix: a future `rekon intent status transition` writes a
**new** work-ready `IntentStatusReport` revision from the approved plan + rechecks (the previous report
stays immutable; approval does not auto-transition). WorkOrder / VerificationPlan generation will then
proceed against the latest work-ready status. The transition creates no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult, executes no commands, writes no source, and runs no Circe;
`intent:go` remains deferred. Decision-only — no CLI or behavior change and no npm publish. See
[Intent Status Work-Ready Transition Decision](../strategy/intent-status-work-ready-transition-decision.md).

**Update (slice 126): status work-ready transition shipped.** `rekon intent status transition` now
writes the new work-ready `IntentStatusReport` revision from an approved plan plus rechecks. This is
additive: new optional kernel fields (`source.approvedPreparedIntentPlanRef`,
`source.previousIntentStatusReportRef`, `proof.preparation.acceptedRisks`) — existing
`IntentStatusReport` artifacts still validate unchanged. No migration action is required; the previous
report and approved plan are never mutated. No package version change and no npm publish. See the
[Intent Status Work-Ready Transition Implementation](../strategy/intent-status-work-ready-transition-implementation.md).

**Update (slice 127): status work-ready transition reviewed safe/stable.** The safety review confirms the
shipped `rekon intent status transition` introduces no migration action: the additive fields stay
optional, existing `IntentStatusReport` artifacts still validate unchanged, and the previous report and
approved plan remain immutable. Review-only — no code or version change and no npm publish. See the
[Intent Status Work-Ready Transition Safety Review](../strategy/intent-status-work-ready-transition-safety-review.md).

> **Loop closure (slice 135):** the full plan compiler loop (review → answer → merge-back → prepare) is proven end-to-end on a fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle handoff — see [`plan-compiler-loop-closure.md`](../strategy/plan-compiler-loop-closure.md).

> **Dogfood review (slice 136):** the closed public path is dogfooded on a realistic fresh TypeScript package and confirmed Circe-importable end-to-end — boundaries explicit, source/plan/test files immutable, no Circe-run record, `intent:go` deferred — see [`fresh-repo-intent-handoff-circe-dogfood-review.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review.md).

> **Provider routing implemented (slice 138):** the shared router shipped as `@rekon/llm-provider` with `rekon intent plan review --llm-provider` / `--llm-model`; still no live provider, no command execution, no source writes, no Circe run, no `intent:go` — see [`rekon-llm-provider-routing-implementation.md`](../strategy/rekon-llm-provider-routing-implementation.md).

> **Provider routing (slice 137):** a shared LLM provider router is decided for semantic normalization (task routes, injected adapters, env/config/CLI provider selection); no provider implemented yet, and provider output stays inside the same non-executing plan-compiler boundary — see [`rekon-llm-provider-routing-semantic-normalization-decision.md`](../strategy/rekon-llm-provider-routing-semantic-normalization-decision.md).

## Semantic File Understanding v1

Rekon has a per-file semantic understanding capability (slice 144): `rekon semantic file understand` produces a `SemanticFileUnderstandingReport`. Deterministic structural extraction (language, line/byte counts, imports, public exports, responsibilities) is always on and authoritative for imports/exports (the hallucination guard); optional LLM semantic understanding is a schema-validated, deterministically-rechecked proposal, not proof. It executes no commands, writes no source files, generates no embeddings, creates no PreparedIntentPlan / WorkOrder / VerificationPlan, runs no Circe, and intent:go remains deferred. See [Semantic File Understanding v1](../strategy/semantic-file-understanding-v1.md) and the [concept](../concepts/semantic-file-understanding.md).

## Semantic File Understanding Safety Review

Semantic File Understanding v1 was reviewed (slice 145) and found **safe/stable** as a proposal/context layer: semantic file understanding is proposal/context, not proof; deterministic structural facts remain authoritative for imports and public exports; provider output is schema-validated and deterministically rechecked; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go, scan integration, and embeddings remain deferred. Next: a Semantic File Understanding Scan Integration Decision. See [Semantic File Understanding Safety Review](../strategy/semantic-file-understanding-safety-review.md).

## Semantic File Understanding Scan Integration Decision

How `SemanticFileUnderstandingReport` integrates with scan is decided (slice 146): scan remains deterministic by default; repo-scale understanding arrives first as an explicit batch command (`rekon semantic files understand --changed|--all`) before any `rekon scan --semantic-files` flag. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. Next: Semantic Files Understand Batch Command v1. See [Semantic File Understanding Scan Integration Decision](../strategy/semantic-file-understanding-scan-integration-decision.md).

## Semantic File Understanding Scan Integration

Semantic file understanding is now an explicit opt-in scan layer (slice 147): `rekon scan --semantic-files auto|required` writes one `SemanticFileUnderstandingReport` per selected file, reusing the shipped single-file builder and router-bound adapter. Plain `rekon scan` (and `--semantic-files off`) stay deterministic and call no provider. Provider calls are never surprising defaults; source text is not sent to providers by default; reports are proposal/context, not proof; no command execution, source writes, or embeddings; embeddings remain a separate track; intent:go deferred. This reverses the slice-146 batch-command-first decision. See [Semantic File Understanding Scan Integration](../strategy/semantic-file-understanding-scan-integration.md).

## Semantic File Understanding Scan Integration Safety Review

The `rekon scan --semantic-files off|auto|required` integration was reviewed (slice 148) and found **safe/stable**: plain `rekon scan` remains deterministic; semantic file understanding during scan is explicit opt-in only; provider calls are never surprising defaults; source text is not sent to providers by default; `--semantic-files off` writes no report; auto falls back safely; required fails cleanly without partial report writes; deterministic imports/exports remain authoritative; source files are read, not modified; no command execution, embeddings, PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun / VerificationResult, or Circe; intent:go deferred; reports are not yet consumed automatically by intent context. Next: Semantic File Understanding Intent Context Decision; embeddings remain a separate track. See [Semantic File Understanding Scan Integration Safety Review](../strategy/semantic-file-understanding-scan-integration-safety-review.md).

## Semantic File Understanding Intent Context Decision

How `IntentAssessmentReport` and `IntentPlanActionabilityReport` may consume `SemanticFileUnderstandingReport` is decided (slice 149): **Option B — explicit semantic context consumption with latest-by-path fallback** (`rekon intent assess --semantic-context latest|--semantic-context-ref <ref>`, `rekon intent plan review --semantic-context latest|--semantic-context-ref <ref>`). Semantic reports remain proposal/context, not proof; consumption is explicit, not automatic; semantic context never approves plans, satisfies proof gates by itself, replaces deterministic evidence, executes commands, writes source, creates WorkOrder/VerificationPlan, or runs Circe; stale reports are not consumed silently; embeddings and intent:go remain deferred. Next: Semantic File Understanding Intent Context Implementation. See [Semantic File Understanding Intent Context Decision](../strategy/semantic-file-understanding-intent-context-decision.md).

## Semantic File Understanding Intent Context Safety Review

The slice-150 semantic intent-context integration was ground-reviewed and declared safe/stable: `SemanticFileUnderstandingReport` consumption by `rekon intent assess` / `rekon intent plan review` is explicit, proposal/context-only, never weakens readiness/proof gates, and stale reports are never consumed silently. See [Semantic File Understanding Intent Context Safety Review](../strategy/semantic-file-understanding-intent-context-safety-review.md).

## Capability Evidence Graph / Semantic Intelligence

Rekon's next semantic-intelligence substrate is a `CapabilityEvidenceGraph`: deterministic facts, LLM interpretation, ontology labels, embedding similarity, runtime traces, and human overrides become evidence-backed claims. Embeddings are one evidence source, not the center — embedding similarity is proposal, not proof. See [Capability Evidence Graph / Semantic Intelligence Architecture Decision](../strategy/capability-evidence-graph-semantic-intelligence-decision.md).

> Update (slice 178 · TaskContextReport Human/Agent Export Safety Review): the slice-177 `rekon context task` human/agent export was reviewed end-to-end and declared safe/stable — presentation only. The TaskContextReport artifact is canonical, human markdown is a rendered view, agent JSON (`agentContext`) is the structured source of truth and is additive (every existing top-level JSON field preserved); verification hints stay hints (`executed:false`), do-not-touch zones stay guidance (`enforced:false`), evidence refs are preserved, boundaries stay all-false; no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export-safety-review.md`](../strategy/task-context-human-agent-export-safety-review.md).

> Update (slice 179 · TaskContextReport Workflow Integration Decision): the standard Rekon workflow is now context first, plan second, approval third, handoff fourth (Option B). `TaskContextReport` is the standard pre-work context substrate, not a proof artifact — recommended (not required, not automatic) before human/agent implementation and before `intent assess` / `intent plan review`; humans read the markdown brief, agents consume `agentContext`. Consumption stays explicit; `intent prepare` stays lineage-only; prepare / approve / status / handoff stay separately gated; bundle inclusion is optional context only (deferred); no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. First implementation: TaskContextReport Workflow Guide / Agent Instructions. See [`task-context-report-workflow-integration-decision.md`](../strategy/task-context-report-workflow-integration-decision.md).

> Update (slice 180 · TaskContextReport Workflow Guide / Agent Instructions): the context-first workflow is now documented for humans and agents. The canonical pre-work sequence is `rekon scan` → `rekon capability graph build` → `rekon context task` → `rekon artifacts latest --type TaskContextReport --id-only` → `rekon intent assess` / `rekon intent plan review --task-context-ref`. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; TaskContextReport stays context, not proof — no approval / execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; intent:go deferred. See [`task-context-workflow.md`](../guides/task-context-workflow.md).

> Update (slice 181 · TaskContextReport Workflow Guide Safety Review): the slice-180 workflow guide + agent instructions were reviewed end-to-end and declared safe/stable — docs/product surface only, guidance not automation. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; every documented command was confirmed against the live CLI. TaskContextReport stays context, not proof — no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; bundle inclusion optional context only; intent:go deferred; the workflow guide introduces no runtime behavior changes. See [`task-context-workflow-guide-safety-review.md`](../strategy/task-context-workflow-guide-safety-review.md).

> Update (slice 182 · TaskContextReport Bundle Context Decision): intent bundles may carry optional `TaskContextReport` refs as context for agents/operators (Option B + E) — an additive `manifest.context.taskContextReports[]` section plus Rekon-side `context/` sidecars, with the Circe handoff schema unchanged in v1. Inclusion is optional, never required; context stays context, not proof — it must not approve plans, satisfy WorkOrder/VerificationPlan gates, change phase gates, execute commands, write source, or run Circe; hints stay hints; do-not-touch stays guidance; Circe is not required to know TaskContextReport internals in v1; intent:go deferred. First implementation: TaskContextReport Bundle Context Implementation. See [`task-context-report-bundle-context-decision.md`](../strategy/task-context-report-bundle-context-decision.md).

> Update (slice 183 · TaskContextReport Bundle Context Implementation): `rekon intent bundle write` now attaches optional `TaskContextReport` refs via a repeatable `--task-context-ref` (plus bounded lineage discovery from prepared-plan / assessment `inputRefs`) as an additive `manifest.context.taskContextReports[]` section (`role: optional-agent-context`, `proof: false`) plus three Rekon-side `context/` sidecars (`task-context.md` / `task-context.agent.json` / `task-context.refs.json`). With no ref the bundle is byte-identical; a missing / wrong-type ref fails cleanly. The Circe handoff projection (`circe/handoff.json` etc.) and the WorkOrder / VerificationPlan / phase-gate files are unchanged and never carry task context. TaskContextReport may be included in bundles only as optional context, not proof — it must not be required to write an intent bundle, approve plans, satisfy WorkOrder/VerificationPlan or phase gates, execute commands, write source, or run Circe; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON is unchanged in v1; intent:go remains deferred. Implements the slice-182 decision (Option B + E). See [`task-context-report-bundle-context-implementation.md`](../strategy/task-context-report-bundle-context-implementation.md).

> Update (slice 184 · TaskContextReport Bundle Context Safety Review): the slice-183 bundle-context implementation was reviewed end-to-end and declared safe/stable — optional `TaskContextReport` context in intent bundles holds every boundary. TaskContextReport may be included in bundles only as optional context, not proof, and is not required to write an intent bundle: a bundle with no ref is byte-identical; a bundle with a ref adds only `manifest.context.taskContextReports[]` (`proof: false`, `role: optional-agent-context`) and the `context/` sidecars (`task-context.md` optional guidance not proof, `task-context.agent.json` all-false boundaries, `task-context.refs.json` refs + `proof:false`). The Circe handoff JSON is unchanged in v1; WorkOrder / VerificationPlan / phase gates unchanged; missing + wrong-type refs fail cleanly; lineage discovery stays bounded and optional. No approval / command execution / source write / WorkOrder / VerificationPlan / Circe; verification hints stay hints; do-not-touch stays guidance; intent:go remains deferred. Recommended next: TaskContextReport Bundle Context Dogfood. See [`task-context-report-bundle-context-safety-review.md`](../strategy/task-context-report-bundle-context-safety-review.md).

> Update (slice 185 · TaskContextReport Bundle Context Dogfood): the optional bundle-context sidecars were dogfooded on a realistic operator/agent handoff path (full intent path → `intent bundle write --task-context-ref` → validate). bundle write succeeded; `manifest.context.taskContextReports` (`proof:false`, `role: optional-agent-context`) was discoverable; the `context/task-context.md` human brief, `context/task-context.agent.json` agent view, and `context/task-context.refs.json` traceability index were all useful; bundle JSON reported the `taskContext` sidecars; the Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. One narrow human-discoverability gap was fixed: the bundle `README.md` now renders an additive "## Task context" section (guidance, not proof) only when a TaskContextReport is attached. Sidecars are ready for broader handoff use. Next: TaskContextReport Bundle Context Dogfood Safety Review. See [`task-context-report-bundle-context-dogfood.md`](../strategy/task-context-report-bundle-context-dogfood.md).

> Update (slice 186 · TaskContextReport Bundle Context Dogfood Safety Review): the slice-185 dogfood result + the narrow bundle-README discoverability fix were reviewed end-to-end and declared safe/stable. TaskContextReport bundle context is optional context, not proof; the full bundle-context dogfood path completed successfully; `manifest.context.taskContextReports` was discoverable (`proof:false`, `role: optional-agent-context`); the `context/task-context.md` / `.agent.json` / `.refs.json` sidecars were useful to humans, agents, and traceability; the bundle README now points to the sidecars (guidance, not proof) when context is attached and is omitted otherwise; Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. Bundle context is ready for broader handoff use. Next: TaskContextReport Bundle Context Broader Handoff Decision. See [`task-context-report-bundle-context-dogfood-safety-review.md`](../strategy/task-context-report-bundle-context-dogfood-safety-review.md).

> Update (slice 187 · TaskContextReport Bundle Broader Handoff Decision): decided how broader operator/agent handoff workflows should use the optional bundle-context sidecars (Option B — promote them in human/agent handoff guidance, recommended not required). Humans should inspect `context/task-context.md` when present; agents should read `context/task-context.agent.json` when present; the follow-up will point `agent/instructions.md` + `agent/handoff.md` (and optionally `agent/context.json` metadata) at the sidecars. TaskContextReport sidecars are optional context, not proof — must not be required to write an intent bundle, approve plans, execute commands, write source, or satisfy WorkOrder/VerificationPlan or phase gates; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; intent:go remains deferred. First implementation: TaskContextReport Bundle Handoff Guidance Implementation. See [`task-context-report-bundle-broader-handoff-decision.md`](../strategy/task-context-report-bundle-broader-handoff-decision.md).

> Update (slice 188 · TaskContextReport Bundle Handoff Guidance Implementation): when a `TaskContextReport` is attached to an intent plan bundle, the agent-facing bundle files now promote the optional context sidecars. `agent/instructions.md` and `agent/handoff.md` gain a "## Task context" section (only when a TaskContextReport is attached) pointing at `context/task-context.agent.json` / `context/task-context.md`, framing context as not-proof and keeping WorkOrder / VerificationPlan / phase gates authoritative; `agent/context.json` gains an additive `taskContext` metadata block (`available:true`, `proof:false`, `role: optional-agent-context`) with every existing field preserved. With no task context the agent files are byte-identical. The bundle README section, the `context/` sidecars, and the Circe handoff trio are unchanged. TaskContextReport sidecars are optional context, not proof — humans should inspect context/task-context.md when present; agents should read context/task-context.agent.json when present; verification hints remain hints; do-not-touch stays guidance; Circe handoff JSON remains the machine handoff contract; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Guidance Safety Review. See [`task-context-report-bundle-handoff-guidance-implementation.md`](../strategy/task-context-report-bundle-handoff-guidance-implementation.md).

> Update (slice 189 · TaskContextReport Bundle Handoff Guidance Safety Review): the slice-188 agent-facing handoff guidance was reviewed end-to-end and declared safe/stable. TaskContextReport sidecars are optional context, not proof; `agent/instructions.md` + `agent/handoff.md` promote the optional task context only when sidecars are present; `agent/context.json` carries additive `taskContext` metadata (`proof:false`, `role: optional-agent-context`) when present and preserves every existing field; without-context bundles are byte-identical. Agents should read `context/task-context.agent.json` when present; humans should inspect `context/task-context.md` when present; verification hints remain hints; do-not-touch stays guidance; WorkOrder / VerificationPlan + phase gates remain authoritative; the Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; sidecars must not approve plans, execute commands, or write source; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Dogfood. See [`task-context-report-bundle-handoff-guidance-safety-review.md`](../strategy/task-context-report-bundle-handoff-guidance-safety-review.md).

> Update (slice 190 · TaskContextReport Bundle Handoff Dogfood — rebased on 4cc34b73 Circe actor contracts): the promoted handoff guidance was re-dogfooded from both the human-operator and the agent perspective against the current bundle producer after `4cc34b73` ("feat: emit target-specific Circe actor contracts"). A human can discover task context from `README.md`; `context/task-context.md` + `context/task-context.refs.json` were useful; an agent can discover it from `agent/instructions.md` + `agent/handoff.md`; `agent/context.json` `taskContext` metadata + `context/task-context.agent.json` were useful; `agent/verification.json` stayed authoritative for verification posture and `agent/source-refs.json` for source refs. The Circe handoff trio stayed stable and independent of TaskContextReport — `circe/handoff.json` now carries an additive `actorContracts` block. The new `circe/actor-contracts/` artifacts (3 contract Markdown + 3 JSON Schema, default `circe` target) were present and non-executing (return-shape guidance/artifacts, not executed workers) and identical in the without-context bundle. WorkOrder / VerificationPlan + phase gates remained authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle omitted every task-context surface. No fix needed. Next: TaskContextReport Bundle Handoff Dogfood Safety Review. See [`task-context-report-bundle-handoff-dogfood.md`](../strategy/task-context-report-bundle-handoff-dogfood.md).

> Update (slice 191 · TaskContextReport Bundle Handoff Dogfood Safety Review): the shipped slice-190 handoff dogfood (`c5acc07`) — including the `circe/actor-contracts` surface and the new Circe Operator Command Boundary added in `11a209fd` — was reviewed end-to-end and declared **safe/stable** before broader handoff workflow use. Strategy/safety-review batch; no runtime/API/CLI/agent-file-rendering/actor-contract-generation/operator-boundary-generation/Circe-schema/gate change. TaskContextReport sidecars are optional context, not proof; the full handoff dogfood path completed successfully; the human + agent task-context surfaces stay discoverable and non-authoritative; `agent/verification.json` + `agent/source-refs.json` stay authoritative; the Circe handoff JSON stays stable and independent of TaskContextReport; Circe actor-contract artifacts were present and non-executing (guidance/artifacts, not executed workers); the new Operator Command Boundary is operator-only inspection guidance, not worker execution guidance — it reinforces that Rekon does not run Circe and treats worker requests to run Circe operator commands as plan-quality concerns; WorkOrder / VerificationPlan + phase gates remain authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle stayed clean. Next: TaskContextReport Bundle Handoff Broader Workflow Decision (alternative: Handoff UX Fix). See [`task-context-report-bundle-handoff-dogfood-safety-review.md`](../strategy/task-context-report-bundle-handoff-dogfood-safety-review.md).

> Update (slice 192 · TaskContextReport Bundle Handoff Broader Workflow Decision): decided how broader operator/agent handoff workflows should use the bundle surfaces — **Option B, an explicit reading-order policy** — rebased onto `e91dc087` ("feat: classify phase source-change intent") to include the new per-phase source-change posture. Decision-only; no runtime/API/CLI/bundle/Circe-schema/gate change. Humans inspect `README.md` first, then `context/task-context.md` when present; agents inspect `agent/instructions.md` first, then `agent/handoff.md`, then `agent/context.json`, then `context/task-context.agent.json` when present. Four handoff layers: operator orientation; agent structured handoff; source/verification authority (WorkOrder, VerificationPlan, **phase source-change posture**, `agent/source-refs.json`, `agent/verification.json`); Circe contract layer. TaskContextReport sidecars are optional context, not proof; phase source-change posture belongs to the authoritative source/verification layer, not the task-context layer — it is handoff evidence, not approval, and TaskContextReport sidecars must not override `sourceChange` posture; WorkOrder/VerificationPlan + phase gates + agent verification + source refs remain authoritative; Circe handoff JSON remains the machine handoff contract; actor contracts are role/return-shape guidance, not executed workers; the Operator Command Boundary stays operator-only; verification hints stay hints; do-not-touch stays guidance; intent:go deferred. First implementation: Intent Bundle Handoff Reading Order Implementation. See [`task-context-report-bundle-handoff-broader-workflow-decision.md`](../strategy/task-context-report-bundle-handoff-broader-workflow-decision.md).

> Update (slice 193 · Intent Bundle Handoff Reading Order Implementation): the intent plan bundle now promotes the handoff reading order directly in its surfaces — a "## Handoff reading order" section in `README.md` (human + agent lists), a "## Reading order" section in `agent/instructions.md` and `agent/handoff.md`, and an additive `handoffReadingOrder` metadata block in `agent/context.json`. Always rendered; task-context entries say "if present". Guidance only — no Circe handoff schema, actor-contract, source-change-classification, or gate change; TaskContextReport stays optional context, WorkOrder / VerificationPlan stay authoritative, source-change posture stays handoff evidence not approval, intent:go stays deferred. See [`intent-bundle-handoff-reading-order-implementation`](../strategy/intent-bundle-handoff-reading-order-implementation.md).
