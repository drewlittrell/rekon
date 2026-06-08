# Rekon V1 Release Notes

> **TaskContextReport Broader Workflow Decision (slice 176):** strategy / architecture decision batch — no runtime/API/command change. Selected Option B: TaskContextReport is the standard pre-intent / pre-work context substrate (context first, plan second, approval third, handoff fourth). It is a context substrate, not a proof artifact; it may guide humans and agents but must not approve plans, execute commands, or write source files; do-not-touch zones stay guidance, verification hints stay hints; consumption stays explicit; intent prepare / approve / status / handoff remain separately gated; intent:go deferred. The artifact is canonical, human markdown a rendered view, agent JSON the structured source of truth, bundle inclusion optional context (not proof). Next: TaskContextReport Human/Agent Context Export. See [`task-context-report-broader-workflow-decision.md`](../strategy/task-context-report-broader-workflow-decision.md).

> **Intent Planning UX / Context Quality Fix (slice 175):** product capability batch — `rekon context task` with an existing embeddings index, no `--path`, and an implicitly-defaulted provider (`voyage`) whose key is missing now degrades to a graph + lexical context fallback (deriving candidate paths by lexically matching the task text against graph file nodes) instead of exiting non-zero. Implicit provider failure degrades; explicit provider failure stays visible and strict; if no graph match it still fails cleanly. Task context stays proposal/context, not proof; verification hints stay hints; no source writes; no commands executed; no WorkOrder/VerificationPlan; no Circe; intent:go deferred. Additive only — new `selectLexicalGraphContextPaths` helper + `providerExplicit` / `retrieval` JSON fields + two warning codes; no new artifact or command. Next: TaskContextReport Broader Workflow Decision. See [`intent-planning-ux-context-quality-fix.md`](../strategy/intent-planning-ux-context-quality-fix.md).

> **TaskContextReport Intent Dogfood Safety Review (slice 174):** reviewed the slice-173 full task-context intent dogfood path end-to-end against the shipped source. Verdict: safe/stable — the path completed because the existing readiness / actionability / approval / status / handoff gates held, not because task context weakened any boundary. TaskContextReport is proposal/context, not proof; do-not-touch and verification-hint guidance survived into plan review as hints, not executed commands; prepare stayed lineage-only; approval required explicit accepted risks; status required an explicit work-ready transition; WorkOrder/VerificationPlan generated only after approve + work-ready; bundle emitted handoff paths; source/plan unchanged; no commands executed; no VerificationRun/Result; no Circe; intent:go deferred. The one non-blocking finding (context task provider-default missing-key behavior) is deferred to the next slice. Strategy / safety-review batch — no runtime/API/command change. Next: Intent Planning UX / Context Quality Fix. See [`task-context-report-intent-dogfood-safety-review.md`](../strategy/task-context-report-intent-dogfood-safety-review.md).

> **TaskContextReport Intent Dogfood (slice 173):** ran the full operator path with opt-in task context (`context task` → `intent assess --task-context` → `intent plan review --task-context` → `plan answer` → `prepare` → `approve` → `status transition` → `work-order generate` → `verification-plan generate` → `bundle write`). TaskContextReport improved matchedContext and improved revisionPrompt; do-not-touch and verification-hint guidance survived into plan review; readiness was not made ready by task context; actionability was not made actionable by task context; prepare stayed lineage-only; approval still required explicit accepted risks; WorkOrder/VerificationPlan generated only after approve + work-ready; bundle emitted handoff paths; source and plan unchanged; no commands executed; intent:go deferred. Retrieval (mock + optional live Voyage) preserved do-not-touch / hints and honestly reported retrieval-low-signal. Product dogfood / review batch — no runtime/API/command change. Next: TaskContextReport Intent Dogfood Safety Review. See [`task-context-report-intent-dogfood.md`](../strategy/task-context-report-intent-dogfood.md).

> **TaskContextReport Intent Integration Safety Review (slice 172):** reviewed the slice-171 opt-in TaskContextReport consumption by `rekon intent assess` and `rekon intent plan review` end-to-end against the shipped source. Verdict: safe/stable — the additive boundary holds. TaskContextReport is proposal/context, not proof; consumption is explicit, not automatic; readiness remains governed by existing readiness gates; actionability status remains governed by plan actionability; enrichment is additive after readiness/status; no blocker suppressed, no finding added/removed, no weak plan made actionable; verification hints stay hints; do-not-touch stays a constraint; retrieval-low-signal stays a warning; missing refs fail cleanly; stale/irrelevant context is not consumed silently; PreparedIntentPlan gets task context by lineage only; intent prepare has no direct flag; no PreparedIntentPlan/WorkOrder/VerificationPlan creation, no command execution, no source writes, no Circe; intent:go deferred. Strategy / safety-review batch — no runtime/API/command change. Next: TaskContextReport Intent Dogfood. See [`task-context-report-intent-integration-safety-review.md`](../strategy/task-context-report-intent-integration-safety-review.md).

> **TaskContextReport Intent Integration Implementation (slice 171):** implements the slice-170 decision. `rekon intent assess` and `rekon intent plan review` gain an optional, opt-in `--task-context latest|<ref>` (`--task-context-ref <TaskContextReport:id>`), backed by a new pure selector `selectTaskContextReports` / `summarizeTaskContext` in `@rekon/capability-model`. Used reports enrich assessment `matchedContext` + low-severity warnings (after readiness) and plan-review `revisionPrompt` + `normalizationTrace.warnings` (after status) — additive only; readiness/status never change, no blocker is suppressed, no finding is added/removed, no weak plan becomes actionable. `rekon intent prepare` gains no flag (task context by lineage only). TaskContextReport is proposal/context, not proof; consumption is explicit, not automatic; no command execution, source writes, WorkOrder/VerificationPlan, or Circe; verification hints stay hints; do-not-touch stays a constraint; retrieval-low-signal stays a warning; intent:go deferred. Adds a 28-assertion contract test + 17-assertion docs test. Next: TaskContextReport Intent Integration Safety Review. See [`task-context-report-intent-integration-implementation.md`](../strategy/task-context-report-intent-integration-implementation.md).

> **TaskContextReport Intent Integration Decision (slice 170):** decided how TaskContextReport will optionally feed intent planning — Option B: explicit, opt-in consumption by `rekon intent assess` and `rekon intent plan review` (via `--task-context latest|<ref>`), never automatic. `rekon intent prepare` does not consume it directly; a PreparedIntentPlan receives it only by lineage (`header.inputRefs`) through the assessment / actionability reports. contextItems → matchedContext/plan grounding, doNotTouch → constraints/non-goals, verificationHints → revision guidance, warnings (incl. `retrieval-low-signal`) → report warnings. TaskContextReport is proposal/context, not proof: it never approves plans, satisfies proof gates by itself, replaces deterministic evidence, executes commands, writes source, creates WorkOrder/VerificationPlan, or runs Circe; intent:go deferred. Decision-only — no runtime/API/command change. Next: TaskContextReport Intent Integration Implementation. See [`task-context-report-intent-integration-decision.md`](../strategy/task-context-report-intent-integration-decision.md).

> **TaskContextReport Selection Quality Fix (slice 169):** closes the two dogfood gaps. Free-form verification intent ("Verify routing behavior") now produces a `manual-verification` hint with NO command invented (explicit `npm test` / `npm run build` / typecheck command hints preserved); weak-band embedding neighbors are included as labelled supporting context only when no strong/useful neighbor exists (otherwise excluded), and `rekon context task` keeps `retrieval-low-signal` visible — now with the top candidate's score/band, plus an all-weak warning. Verification hints are hints, not executed commands; no source writes, no command execution, no Circe, no WorkOrder/VerificationPlan; intent:go deferred. Additive output only; no type/command change. Next: TaskContextReport Intent Integration Decision. See [`task-context-report-selection-quality-fix.md`](../strategy/task-context-report-selection-quality-fix.md).

> **TaskContextReport Dogfood Review (slice 168):** task-shaped context was dogfooded on explicit-path and retrieval scenarios. The explicit-path + deterministic-graph baseline is useful and reliable — operator paths + graph expansion + do-not-touch zones + verification hints, with evidence refs preserved. The lexical mock retrieval path is low-signal (all neighbors scored below the useful band → empty embedding context), so a real embedding provider is needed for semantic retrieval. One tiny output-visibility fix: `rekon context task` now emits a `retrieval-low-signal` warning instead of a silent empty result when retrieval ran but every neighbor scored below the useful band (selection unchanged; an ignored neighbor is never promoted). Task-shaped context is proposal/context, not proof; do-not-touch zones are guidance, not enforcement; verification hints are hints, not executed commands; no source writes, no command execution, no Circe, no WorkOrder/VerificationPlan; intent:go deferred. Next: TaskContextReport Selection Quality Fix. See [`task-context-report-dogfood-review.md`](../strategy/task-context-report-dogfood-review.md).

> **TaskContextReport Safety Review (slice 167):** the shipped TaskContextReport v1 was re-read end-to-end and found safe/stable as proposal/context — the factory forces boundaries false and recomputes summary; the validator rejects non-false boundaries, empty task text, and reasonless context items; `buildTaskContextReport` is pure (no providers, commands, source writes, or PreparedIntentPlan/WorkOrder/VerificationPlan); the CLI writes only the report. Task-shaped context is proposal/context, not proof; deterministic graph facts outrank embedding similarity; do-not-touch zones are guidance, not enforcement; verification hints are hints, not executed commands; intent:go deferred. Strategy/safety-review batch — no runtime, API, or command change. Next: TaskContextReport Dogfood Review. See [`task-context-report-safety-review.md`](../strategy/task-context-report-safety-review.md).

> **TaskContextReport v1 (slice 166):** task-shaped context shipped — the first product consumer of embedding retrieval. New `TaskContextReport` artifact (`@rekon/kernel-repo-model`, `actions` category), pure `buildTaskContextReport` helper (`@rekon/capability-model`), and `rekon context task --task <text> [--path …] [--provider voyage|mock] [--model <m>] [--top-k <n>] [--root <path>] [--json]` command. The command reads the latest CapabilityEvidenceGraph + the embedding cache (when present), runs retrieval best-effort (warns `retrieval-unavailable` when the cache/provider are absent; fails cleanly `context-retrieval-unavailable` when there is neither retrieval nor a `--path`), and writes one report. Operator paths + strong/useful neighbors are included, weak optional, ignored excluded; selected paths expand through the graph and admit deterministic facts regardless of score; every context item / do-not-touch zone / verification hint preserves evidence refs. The artifact is canonical JSON; human output is a `# Task Context` markdown rendering. Task-shaped context is proposal/context, not proof; deterministic graph facts outrank embedding similarity; verification hints are hints, not executed commands; no approval, command execution, source writes, WorkOrder/VerificationPlan, or Circe; intent:go deferred. Duplicate detection and canonical recommendations remain deferred. Next: TaskContextReport Safety Review. See [`task-context-report-v1.md`](../strategy/task-context-report-v1.md).

> **Task-Shaped Context / Embedding Retrieval Decision (slice 165):** the first product consumer of embedding retrieval is decided — **task-shaped context**, a future `TaskContextReport` artifact and `rekon context task` command that combines embedding neighbors, CapabilityEvidenceGraph neighborhood facts, semantic file summaries, deterministic imports/exports/symbols, do-not-touch zones, and verification hints into one explainable bundle for humans and agents. The artifact is canonical structured JSON; the markdown/human summary is a rendered view; every context item preserves evidence refs. Selection starts from the score-banded retrieval policy (strong/useful included, weak optional, ignored excluded), expands through the graph, and admits deterministic facts and operator paths regardless of score. Task context is proposal/context, not proof; deterministic facts outrank similarity; no approval, command execution, source writes, WorkOrder/VerificationPlan, or Circe; intent:go deferred. Duplicate detection and canonical recommendations remain deferred. Decision-only — no runtime, API, or command change. Next: TaskContextReport v1. See [`task-shaped-context-embedding-retrieval-decision.md`](../strategy/task-shaped-context-embedding-retrieval-decision.md).

> **Embedding Query Input-Type / Ranking Policy Implementation (slice 164):** the slice-163 ranking policy is now implemented. `rekon embeddings query` embeds query text with `input_type=query` while `rekon embeddings index` keeps `input_type=document` (both report their input type in JSON); default top-k is 8, capped at 20 (omit `--top-k` → 8; above 20 clamps and JSON reports `requestedTopK`/`effectiveTopK`; invalid `--top-k` fails cleanly). Every query result carries a score band (`>= 0.78` strong / `0.65–0.78` useful / `0.50–0.65` weak / `< 0.50` ignored) plus an explanation (provider/model/policyVersion/textPreview) under `results` (with a `matches` alias for back-compat), and a `boundaries` block; human output shows the band. Ignored-score results are labeled and retained this slice (default removal deferred to the first consumer). Graph embedding-similarity is unchanged (`generatedEmbeddings`/`usedLlm` false). Retrieval is proposal/context, not proof; score bands are policy labels; no command execution, source writes, or Circe; intent:go deferred. Next: Task-Shaped Context / Embedding Retrieval Decision. See [`embedding-query-input-type-ranking-policy-implementation.md`](../strategy/embedding-query-input-type-ranking-policy-implementation.md).

> **Embedding Retrieval / Similarity Ranking Decision (slice 163):** Rekon's embedding retrieval ranking policy is decided after the live Voyage dogfood. Score bands: `>= 0.78` strong / `0.65–0.78` useful / `0.50–0.65` weak / `< 0.50` ignored; default top-k 8 (max 20); `input_type=query` for queries and `input_type=document` for indexing; every result explainable with a score band and provenance; stale/policy-changed vectors excluded by default; and CapabilityEvidenceGraph kept the evidence substrate (results become `embedding_similarity` evidence or graph-adjacent context). Task-shaped context is the first selected consumer; duplicate detection and canonical recommendations are deferred until similarity is corroborated by deterministic evidence; linear scan stays acceptable for v1. Decision-only — no runtime, API, or command change. Next: Embedding Query Input-Type / Ranking Policy Implementation. See [`embedding-retrieval-similarity-ranking-decision.md`](../strategy/embedding-retrieval-similarity-ranking-decision.md).

> **Live Voyage Embedding Dogfood (slice 162):** the real Voyage provider (`voyage-code-3`, 1024-dim, key consumed from the environment only) was exercised on the slice-161 fixture. It indexed 31 chunks / 0 failed, ranked the two literal queries to the correct domain with sharper scores than the mock, and — the decisive result — ranked **paraphrase** queries with no shared vocabulary to the correct domain (e.g. "look up the person who owns an account" → top-3 all `users/` at 0.81, where the lexical mock ranks an unrelated `sms/` file first). The graph emitted 31 `embedding_similarity` evidence rows + 154 `embedding` inference claims (max confidence 0.9187 < 1.0, real neighbor scores) with `generatedEmbeddings` / `usedLlm` false; the cache held genuine 1024-dim vectors; source was unchanged. The Voyage API key is read from the environment only and is never committed; live embedding tests are gated by environment variables; the committed suite runs without any API key. Honest follow-up: the adapter sends `input_type: "document"` for both indexing and queries (Voyage recommends `"query"` for queries) — a quality opportunity deferred to the ranking decision. Recommended next: an Embedding Retrieval / Similarity Ranking Decision. See [`live-voyage-embedding-dogfood.md`](../strategy/live-voyage-embedding-dogfood.md).

> **Embedding Retrieval / Graph dogfooded (slice 161):** the shipped `embeddings index` / `embeddings query` / `capability graph build --embedding-similarity latest` were exercised on a realistic four-domain fixture. Retrieval ranked same-domain chunks above the unrelated file for both a user query and an SMS-routing query; the cache showed visible stale/policy behavior; the graph emitted explainable `embedding_similarity` evidence + `embedding` inference claims (confidence < 1.0) with `generatedEmbeddings` / `usedLlm` false; source was unchanged. The offline mock is a lexical embedding, so a **Live Voyage Embedding Dogfood** is recommended before duplicate detection / canonical recommendations / task-shaped context. See [`embedding-retrieval-graph-dogfood-review.md`](../strategy/embedding-retrieval-graph-dogfood-review.md).

> **Embedding Provider / Index safety-reviewed (slice 160):** the slice-159 implementation was re-read end-to-end against committed source and found **safe/stable** — embeddings stay proposal/context, not proof; raw vectors are cache/index data, not canonical proof artifacts; no stale embedding is used silently; the Voyage missing-key path fails cleanly with no network call; the builder generates no embeddings (`generatedEmbeddings` / `usedLlm` stay false). The slice-159 TDZ hoisting fix was reviewed explicitly. Next: Embedding Retrieval / Graph Dogfood Review. See [`embedding-provider-index-safety-review.md`](../strategy/embedding-provider-index-safety-review.md).

> **Embedding Provider / Index v1 shipped (slice 159):** the first real Rekon embedding provider plus a cache/index that folds similarity into `CapabilityEvidenceGraph` as evidence. `createVoyageEmbeddingProvider` (`@rekon/llm-provider`) is the first real `RekonEmbeddingProvider` adapter (Voyage `voyage-code-3`, 1024-dim, fetch-based, no SDK; missing key → clean `ok:false`, no network, no throw; key from env only). A pure `embedding-index` module (`@rekon/capability-model`) builds derived chunks (`file_summary` / `structural_feature_bag` / `signature` / `capability_text`), keys them by content + provider/model/dimensions/policy, and classifies `new` / `stale` / `policy-changed` so no stale embedding is used silently. CLI: `rekon embeddings index` (writes `.rekon/cache/embeddings`; reports indexed/reused/stale/failed; missing key fails cleanly), `rekon embeddings query --text` (cosine retrieval as proposal/context), and `rekon capability graph build --embedding-similarity latest` (emits `embedding_similarity` evidence + `embedding` claims, generating nothing — boundaries stay false). Raw vectors are cache/index data, not canonical proof; deterministic facts remain stronger than similarity; OpenAI embeddings and intent:go remain deferred. Next: Embedding Provider / Index Safety Review. See [`embedding-provider-index-v1.md`](../strategy/embedding-provider-index-v1.md).

> **Embeddings track started (slice 158):** the [Embedding Provider / Index Decision](../strategy/embedding-provider-index-decision.md) starts embeddings as the next `CapabilityEvidenceGraph` evidence source — **Option B (embeddings as graph evidence)**. Mock provider first, then **Voyage** (`voyage-code-3`); OpenAI deferred. Typed chunks of derived text (`file_summary` / `symbol_summary` / `capability_text` / `doc_section` / `comment_block` / `signature` / `structural_feature_bag`); raw vectors are regenerable cache/index under `.rekon/cache/embeddings/`, never canonical; embeddings enter the graph as `embedding_similarity` evidence; retrieval is proposal/context, not proof; deterministic facts remain stronger than similarity; no provider call by default; no embedding implementation in this slice. Next: Embedding Provider / Index v1. See [`embedding-provider-index-decision.md`](../strategy/embedding-provider-index-decision.md).

> **Semantic → Evidence Graph integration safety-reviewed (slice 157):** the slice-156 integration was ground-reviewed against committed source and found **safe/stable** — default build deterministic-only; semantic content opt-in as `llm_extraction` evidence and `llm` / `inference` claims (never fact, never proof); deterministic facts win; stale/unmatched reports surfaced as needs-review, never consumed silently; the builder calls no provider so `usedLlm` stays `false`; no embeddings/commands/source-writes/Circe/intent:go. Recommended next: Embedding Provider / Index Decision. See [`semantic-file-understanding-evidence-graph-integration-safety-review.md`](../strategy/semantic-file-understanding-evidence-graph-integration-safety-review.md).

> **Semantic → Evidence Graph integration implemented (slice 156):** `rekon capability graph build --semantic-file-reports latest` / `--semantic-file-report-ref <ref>` now folds stored `SemanticFileUnderstandingReport` content into `CapabilityEvidenceGraph` as `llm_extraction` evidence and `llm` / `inference` claims — purpose/responsibilities/touchedConcepts/capabilitySignals/findings, confidence `low→0.25 / medium→0.5 / high→0.75` (never 1.0). The default build stays deterministic-only; deterministic facts win (semantic-only export/import → `conflicted`); stale/unmatched reports are surfaced as needs-review claims, never consumed silently; the build calls no provider so `usedLlm` stays `false`. No embeddings, no source writes, no approval, no intent:go. See [`semantic-file-understanding-evidence-graph-integration-implementation.md`](../strategy/semantic-file-understanding-evidence-graph-integration-implementation.md).

> **Semantic → Evidence Graph integration decided (slice 155):** the decision for how `SemanticFileUnderstandingReport` becomes graph evidence is made — **Option B (explicit, opt-in)**. A future `rekon capability graph build --semantic-file-reports latest` / `--semantic-file-report-ref <ref>` will add semantic content as `llm_extraction` evidence and `llm` / `inference` claims grounded to the report; the default build stays deterministic-only; deterministic facts win over semantic claims; embeddings remain deferred. No kernel type change is needed (the graph already accepts `llm_extraction` / `llm`). See [`semantic-file-understanding-evidence-graph-integration-decision.md`](../strategy/semantic-file-understanding-evidence-graph-integration-decision.md).

> **Capability Evidence Graph safety-reviewed (slice 154):** the v1 substrate was re-read end-to-end against committed source and found **safe/stable** — evidence-backed context not proof, deterministic facts the only source, all nine boundaries validator-enforced (no LLM/embeddings/commands/source-writes/Circe/intent:go). Next: Semantic File Understanding -> Evidence Graph Integration Decision. See [`capability-evidence-graph-safety-review.md`](../strategy/capability-evidence-graph-safety-review.md).

> **Capability Evidence Graph v1 shipped (slice 153):** a new `CapabilityEvidenceGraph` artifact (category `graphs`), a pure builder `buildCapabilityEvidenceGraph`, and a `rekon capability graph build` command unify file nodes, symbol nodes, and verb:noun capability nodes into one graph of evidence-backed claims. Deterministic facts are the substrate; LLM and embedding outputs are evidence-backed inferences that attach later. No LLM, no embeddings, no commands, no source writes, no Circe, no intent:go in v1 — the graph is evidence-backed context, not proof by itself. See [`capability-evidence-graph.md`](../artifacts/capability-evidence-graph.md) and [`capability-evidence-graph-v1.md`](../strategy/capability-evidence-graph-v1.md).

> **LLM-semantic parity decided (slice 143):** an audit of the old codebase-intel system separated Track A (finish LLM-backed semantic parsing — the one real non-embedding gap is per-file semantic file understanding) from Track B (embeddings, deferred). Semantic output stays proposal-not-proof; no approval/execution/source-writes/Circe. See [`classic-llm-semantic-parsing-parity-decision.md`](../strategy/classic-llm-semantic-parsing-parity-decision.md).

> **Semantic quality hardened (slice 142):** provider phases are re-checked against the source — unsupported touched paths and verification commands become findings + warnings, dropped non-goals are flagged, and a weak plan cannot become actionable by filling fields without source support. Deterministic recheck stays authoritative. See [`intent-plan-semantic-quality-hardening.md`](../strategy/intent-plan-semantic-quality-hardening.md).

> **Semantic quality proven (slice 141):** LLM-backed semantic normalization was dogfooded live (OpenAI `gpt-4o-mini`) — it extracts objectives/deliverables/acceptance/paths/commands and preserves non-goals with **zero invented paths or commands**, while staying a proposal that is schema-gated and deterministically rechecked. See [`intent-plan-semantic-quality-dogfood.md`](../strategy/intent-plan-semantic-quality-dogfood.md).

> Draft release notes prepared by V1 Release Prep Implementation. No version bump, no
> tag, and no npm publish has occurred; the packages remain at `0.1.0-beta.0`. Versioning,
> tagging, and publishing are separate, explicitly-approved slices.

> **Fresh-repo dogfood (slice 140):** the full operator path (scan → review →
> answer → prepare → approve → status → handoff → bundle) was re-run on a fresh
> repo with semantic mode and the bundle imported into a local Circe checkout;
> Rekon writes no source, runs no commands, and runs no Circe — see
> [`../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review-semantic.md).

> **Semantic normalization (slice 139):** the plan compiler can use a routed LLM
> provider (`createOpenAiLlmProvider` behind `RekonLlmRouter`, selected via
> `--llm-provider` / `--llm-model` and `REKON_LLM_*` env). LLM output is proposal,
> not proof — schema-validated and deterministically re-checked; no source writes,
> command execution, Circe run, or `intent:go`. See
> [`../strategy/intent-plan-compiler-semantic-normalization-dogfood.md`](../strategy/intent-plan-compiler-semantic-normalization-dogfood.md).

## V1 Definition

**V1 means prepare/prove/package/export, not Rekon-side execution.** Rekon V1 is the
non-executing Rekon → Circe prepared-plan handoff: Rekon assesses an intent, prepares a
proof-approved plan, reports status, generates a WorkOrder and a VerificationPlan, writes a
human/agent plan bundle, and writes a Circe-compatible proof/gate projection — then hands
execution to Circe. The V1 product scope was conditionally approved by the V1 Readiness /
Release Review and its release mechanics staged by the V1 Release Mechanics / Versioning
Decision.

## Included Surfaces

- IntentAssessmentReport
- PreparedIntentPlan (with the approval/proof envelope)
- IntentStatusReport
- WorkOrder (intent handoff)
- VerificationPlan (intent handoff)
- Plan bundle (`.rekon/intent/plans/<intent-id>/`)
- Circe proof/gate projection (`.rekon/intent/plans/<intent-id>/circe/`)
- CLI help surface listing the rich intent workflow

## Included Commands

```
rekon intent plan review
rekon intent assess
rekon intent prepare
rekon intent status
rekon intent work-order generate
rekon intent verification-plan generate
rekon intent bundle write
```

`rekon intent prepare` additionally accepts an optional `--actionability-report <ref>`
flag (slice 131) that gates preparation on the plan compiler's
`IntentPlanActionabilityReport`: an actionable report may feed `PreparedIntentPlan`
generation, while a needs-revision / blocked report blocks preparation with revision
guidance (no plan written). Prepare still does not auto-approve, execute commands, or
write source; `intent:go` stays deferred. See
[Intent Prepare Integration With Actionability Report](../strategy/intent-prepare-actionability-integration.md),
safety-reviewed safe/stable in the
[Intent Prepare Actionability Integration Safety Review](../strategy/intent-prepare-actionability-integration-safety-review.md).
A future `rekon intent plan answer` (decided in the
[Plan Actionability Answer / Merge-Back Decision](../strategy/plan-actionability-answer-merge-back-decision.md); shipped as `rekon intent plan answer` — [implementation](../strategy/plan-actionability-answer-merge-back-implementation.md))
will merge answers to elicitation questions into a new `IntentPlanActionabilityReport` revision so a revised
plan can become actionable — still no source writes, no command execution, no auto-approval, no `intent:go`.

The generated bundle is then handed to Circe via `circe rekon-handoff validate` /
`routes`, `circe import rekon-handoff`, and `circe serve --mode worker` — these are
external, Circe-owned steps.

> The optional pre-assess `rekon intent plan review` step (`IntentPlanActionabilityReport`) was
> safety-reviewed safe/stable as a read / transform / report-only plan-compiler layer — it creates no
> downstream artifacts, executes no commands, writes no source, and runs no Circe. See the
> [Intent Plan Actionability Report Safety Review](../strategy/intent-plan-actionability-report-safety-review.md).

## Rekon / Circe Boundary

**Circe owns orchestration for V1.** Rekon prepares, proves, packages, and exports; Circe
validates, previews routes, imports, and orchestrates execution. The Circe proof/gate
projection carries Rekon's approval/proof state so Circe imports a proof-carrying package
rather than a flat plan. **Rekon does not execute commands in V1. Rekon does not write
source files in V1.** The bundle and projection are written only under
`.rekon/intent/plans/<intent-id>/`; canonical truth remains `.rekon/artifacts/`.

## Proof And Safety Evidence

- Full Rekon test suite passing and package gates green (export audit, license audit,
  publish dry-run, install-from-build and install-from-tarball smokes across all 21
  packages).
- Circe handoff schema validation passing against Circe's real normalizers.
- **External Circe serve-loop proof passed: pass 1 / fail 0** — the current built Rekon
  CLI drove `circe rekon-handoff validate` → `routes` → `circe import rekon-handoff` →
  `circe serve --mode worker`, dispatching, committing, continuing, and stopping every
  generated phase.
- Eight shipped intent safety reviews: IntentAssessmentReport, PreparedIntentPlan,
  IntentStatusReport, WorkOrder handoff, VerificationPlan handoff, Agent Handoff bundle,
  Circe Handoff Projection, and Circe Proof/Gate Projection.
- Top-level help alignment covered by the CLI help contract test.

## Explicit Exclusions

- `intent:go` — **intent:go remains deferred beyond V1.**
- Rekon-side command execution.
- Rekon-side source writes.
- Rekon-side VerificationRun / VerificationResult generation —
  **VerificationRun and VerificationResult generation remain deferred beyond V1.**
- npm publish / version bump / git tag — deferred to separate, explicitly-approved
  slices.

## Known Limitations

- No `intent:go` (explicit exclusion).
- No Rekon-side VerificationRun (delegated/deferred).
- No Rekon-side source writes (explicit exclusion).
- The bundle is a projection; canonical truth remains `.rekon/artifacts/`.
- Circe is a required dependency for orchestration.
- Release mechanics (version / tag / publish) are not completed — separate slices.

## Package Scope

All 21 public workspace packages release together (lockstep). At the time of this prep
slice every package is at `0.1.0-beta.0`; the private workspace root `rekon` is the
container and is not published. The intended release target is `1.0.0` applied lockstep,
deferred to an explicit versioning slice.

> Updated (slice 108): the lockstep version bump has been executed — all 21 public packages
> and the private root are now at **`1.0.0`** (internal `@rekon/*` pins and
> `package-lock.json` updated to match). No git tag and no npm publish occurred; those remain
> separate, explicitly-approved slices. See
> [V1 Versioning Implementation](../strategy/v1-versioning-implementation.md).

## Verification Gates

The standard nine-command gate must pass before any release action:

```
npm run typecheck
npm run test
npm run build
git diff --check
node scripts/audit-package-exports.mjs
node scripts/audit-license.mjs
node scripts/publish-dry-run.mjs
node scripts/install-smoke.mjs
node scripts/install-tarball-smoke.mjs
```

## Next Steps

- **V1 Versioning Decision / Implementation** — decide and, if approved, bump all 21
  public packages lockstep from `0.1.0-beta.0` to `1.0.0`.
- Then a separate git-tag slice, then a separate, approval-gated npm-publish slice.
- `intent:go` / Rekon-side execution remain out of V1 and are a later, separate decision.

## Update — First-Run Onboarding (slice 110)

The V1 install / first-run onboarding model is decided in
[Rekon First-Run Scan / Install Onboarding Decision](../strategy/rekon-first-run-scan-onboarding-decision.md):
the public first-run verb is `rekon scan` (not `refresh`). `rekon scan` initializes `.rekon/`
if needed and creates the first repository intelligence substrate; docs / agent-context /
verification / CI options are offered only after the first scan. `refresh` is retained as an
expert / compatibility alias. This is a vocabulary / UX decision only — **no `rekon scan`
implementation, no CLI behavior change, no version bump, no npm publish.**

## Update — First-Run Scan Implemented (slice 111)

`rekon scan` is now **implemented** (Rekon First-Run Scan Implementation): the canonical
first-run command `rekon scan [--root <path>] [--json]` initializes `.rekon/` if needed and
creates the first repository intelligence substrate (sharing the existing `refresh` pipeline),
then reports the workspace state and post-scan next actions. `scan --json` carries boundary
booleans and emits no ASCII art. `refresh` is unchanged and retained as the expert /
compatibility update command. **No version bump and no npm publish occurred.**

## Update — First-Run Scan Safety Review (slice 112)

The Rekon First-Run Scan Safety Review confirmed `rekon scan` is **safe/stable as the canonical
first-run command** — first-run and repeat paths pass, `refresh` is preserved as the expert /
compatibility verb, the no-docs/agent/CI/verification-before-scan and no-execution /
no-source-write / no-ASCII-in-`--json` boundaries hold, and the `config.capabilities`
normalization (`[]` = defaults) is acceptable for v1. No code or behavior change. See
[Rekon First-Run Scan Safety Review](../strategy/rekon-first-run-scan-safety-review.md).

## Update — Fresh-Repo Intent Readiness (slice 113)

The fresh-repo intent-preparation path is fixed: a fresh operator runs `rekon scan` → **`rekon
intent context prepare`** → `rekon intent assess` → … → `rekon intent bundle write` with no
manual `.rekon/artifacts` seeding. `rekon intent context prepare` builds the intent-readiness
context substrate (StepCapabilityGraph + runtime/handoff context, recorded as not-evaluated
where there is no event log) by running the existing producer commands, and is now discoverable
in top-level help. No change to `scan` / `refresh` or the `intent assess` approval/proof policy;
no `intent:go` and no Circe execution by Rekon.

## Update — Fresh-Repo Intent Readiness Reviewed (slice 114)

The Fresh Repo Intent Readiness Safety Review confirmed the slice-113 fresh-repo intent-context
fix is **safe/stable**. The public fresh-repo sequence `rekon scan` → **`rekon intent context
prepare`** → `rekon intent assess` → … → `rekon intent bundle write` works without manual
`.rekon/artifacts` seeding; `rekon intent context prepare` uses the existing producer commands in
dependency order; `rekon scan` / `rekon refresh` and the `intent assess` severity policy are
unchanged; missing runtime/handoff evidence is recorded as `not-evaluated` / `observation-missing`
rather than false success; Rekon runs no Circe and writes no source in this path; `intent:go`
remains deferred; phase-level VerificationPlan behavior is a recorded follow-up. No package
version change and no npm publish. See
[Fresh Repo Intent Readiness Safety Review](../strategy/fresh-repo-intent-readiness-safety-review.md).

## Update — Phase-Level Verification In Bundles (slice 115)

The intent plan bundle and its Circe projection now make phase-level verification **explicit**, so
skipped verification never reads as proof. Every phase carries a `verificationPosture`
(`executable` / `final-verification` / `manual-review` / `needs-review`) in `circe/rekon-proof.json`
`phaseGates[]`, on `circe/phase-plan.json` `phases[].rekon`, in `verification-plan.md`, and in
`agent/verification.json`. `phase-modify` / `phase-refactor` map the plan's safe executable
verification requirements and ship a per-phase VerificationPlan (or `needs-review` when none
applies); `phase-verify` carries final verification; `phase-investigate` / `phase-review` are
reviewer-gated `manual-review`. `rekon intent bundle write` reports a `phaseVerification` summary.
Derived in the bundle projection layer only — no canonical artifact, approval/proof, or
runtime-execution change; no `intent:go`, no Circe execution by Rekon, no source writes. No package
version change and no npm publish.

## Update — Phase-Level Verification Reviewed (slice 116)

The Intent Bundle Phase-Level Verification Safety Review confirmed the slice-115 phase-level
verification posture implementation is **safe/stable**. Every phase has explicit verification
posture; `phase-modify` / `phase-refactor` get executable verification when safe requirements exist
(else `needs-review`); `phase-verify` carries final verification; `phase-investigate` /
`phase-review` are explicit manual / reviewer gates; a phase without executable verification is
never silently verified; skipped verification is not proof; the posture is projection metadata, not
a VerificationRun. No commands executed, no VerificationRun / VerificationResult created, no source
writes, no Circe run by Rekon, `intent:go` deferred. No package version change and no npm publish.
See
[Intent Bundle Phase-Level Verification Safety Review](../strategy/intent-bundle-phase-level-verification-safety-review.md).

## Update — Install / Setup / ASCII UX Decided (slice 117)

The Rekon Install / Setup / ASCII Art UX Decision selected **Option B — staged install/setup
polish**. The V1 install path stays scriptable — `npm install -D @rekon/cli` then `npx rekon scan` —
with a future optional `rekon setup` and later `npm init rekon` layering interactive guidance.
Install runs no onboarding (`@rekon/cli` ships no postinstall); first-run setup starts with scan;
docs / agent / verification options are not offered before the first scan; ASCII art never appears in
`--json`; non-TTY / CI never prompt and default to no banner; `NO_COLOR` / `REKON_NO_BANNER` are
respected; onboarding never implies command execution, source writes, or Circe execution by Rekon;
`intent:go` remains deferred. Decision-only — no setup / prompts / ASCII / `create-rekon` / dependency
implemented. No package version change and no npm publish. See
[Rekon Install / Setup / ASCII Art UX Decision](../strategy/rekon-install-setup-ascii-ux-decision.md).

## Update — Setup / Welcome UI Implemented (slice 118)

The non-interactive-safe welcome / setup UI foundation is implemented. `rekon welcome [--json]
[--no-banner]` prints a branded Scan → Snapshot → Act lifecycle introduction; `rekon setup [--root
<path>] [--json] [--no-banner]` is deterministic and non-interactive, detecting workspace state
read-only (no scan, no `.rekon/` creation before scan) and printing recommended next actions. ASCII
art never appears in `--json`; `NO_COLOR` disables color, `REKON_NO_BANNER` / `--no-banner` disable
the banner, non-TTY shows the compact mark and never prompts. No prompts, no `create-rekon`, no
postinstall onboarding, no dependency, no Circe execution, no command execution, no source writes;
`intent:go` remains deferred. No package version change and no npm publish. See
[Rekon Setup / Welcome UI](../concepts/rekon-setup-welcome.md).

## Update — Setup / Welcome UI Reviewed (slice 119)

The Rekon Setup / Welcome UI Safety Review confirmed the slice-118 `rekon welcome` / `rekon setup`
implementation is **safe/stable**. `rekon welcome` is explanatory (not action-taking); `rekon setup`
is deterministic and non-interactive, does not run scan, does not create `.rekon/` before scan, and
generates no docs / agent handoff / CI / VerificationPlan. ASCII art never appears in `--json`;
`REKON_NO_BANNER` / `NO_COLOR` are respected; non-TTY setup does not prompt; onboarding implies no
Circe run, command execution, or source writes; `intent:go` remains deferred. No package version
change and no npm publish. See
[Rekon Setup / Welcome UI Safety Review](../strategy/rekon-setup-welcome-ui-safety-review.md).

## Update — Interactive Setup Prompt Decided (slice 120)

The Rekon Interactive Setup Prompt Decision pins the prompt policy for `rekon setup`: **TTY-only
scan-first prompts**. Prompts are allowed only in human TTY mode; `rekon setup --json`, non-TTY, and
CI never prompt. Before scan, setup may ask only whether to run the first scan; after a snapshot
exists it may present post-scan next actions as explicit choices. A decided (unimplemented) `--yes`
flag may run the first scan only and must not perform downstream actions automatically. Prompt answers
are not persisted in v1. Setup never runs Circe, executes arbitrary commands, or writes source files;
`intent:go` remains deferred. Decision-only — no CLI, package version, or runtime change and no npm
publish. See
[Rekon Interactive Setup Prompt Decision](../strategy/rekon-interactive-setup-prompt-decision.md).

## Update — Intent Prepare Planfulness (slice 121)

`rekon intent prepare` now produces an implementation-bearing **draft** plan when `rekon intent
assess` is `needs-review` with zero hard blockers, instead of a bare review phase. The draft includes
investigate / modify (or refactor) / verify / review phases plus safe default verification
requirements (`npm run typecheck`, `npm test`, `npm run build`) derived from `package.json` scripts
and attached to the implementation + verify phases. The plan stays `needs-review`; approval is never
auto-elevated; `rekon intent work-order generate` and `rekon intent verification-plan generate`
remain blocked until explicit approval. No commands execute, no VerificationRun / VerificationResult
is created, no source is written, and `intent:go` remains deferred. No package version change and no
npm publish. See
[Intent Prepare Needs-Review Planfulness Fix](../strategy/intent-prepare-needs-review-planfulness.md).

## Update — Operator Approval Decided (slice 122)

The Intent Operator Approval / Proof Acceptance Decision pins the explicit path to approve a
needs-review draft `PreparedIntentPlan`: a future `rekon intent approve` rechecks freshness / drift /
status, records the operator's explicitly accepted proof gaps, and writes a **new** approved plan
revision (the source draft stays immutable). Approval is explicit (never auto-approved), accepts named
gaps rather than erasing them, and may enable WorkOrder / VerificationPlan handoff but does not create
them. No VerificationRun / VerificationResult, no command execution, no source writes; `intent:go`
remains deferred. No package version change and no npm publish. See
[Intent Operator Approval / Proof Acceptance Decision](../strategy/intent-operator-approval-proof-acceptance-decision.md).

## Update — Operator Approval / Proof Acceptance Implementation (slice 123)

`rekon intent approve` is implemented. It reads a needs-review draft `PreparedIntentPlan`, verifies the
operator explicitly accepted the draft's known proof gaps (`--accept <gap>` with a required `--reason`),
rechecks freshness / runtime drift / status context, and writes exactly one **new approved**
`PreparedIntentPlan` revision — the source draft is never mutated and stays byte-identical. The approved
revision sets `status.value=prepared` / `recommendedNextAction=create-work-order`,
`approval.status=approved` (reasons gain `explicit-operator-approval` + `manual-risk-acceptance`),
records the accepted gaps as `approval.acceptedRisks[]`, and flips
`downstreamHandoff.workOrderAllowed` / `verificationPlanAllowed` to `true` while keeping
`sourceWriteAllowed` the literal `false`. Approval is never automatic, enables but does not create the
WorkOrder / VerificationPlan handoffs, and creates no WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, executes no commands, writes no source, and runs no Circe; `intent:go` remains
deferred. No package version change and no npm publish. See
[Intent Operator Approval / Proof Acceptance Implementation](../strategy/intent-operator-approval-proof-acceptance-implementation.md).

## Update — Operator Approval / Proof Acceptance Safety Review (slice 124)

The Intent Operator Approval / Proof Acceptance Safety Review confirmed `rekon intent approve` is
safe/stable: approval is explicit (needs-review plans are never auto-approved); accepted proof gaps are
recorded, not erased; approval writes a new approved `PreparedIntentPlan` revision while the source draft
stays immutable; freshness / runtime drift / IntentStatusReport are rechecked conservatively; approval
blocks unknown or missing required accepted gaps and empty approval reasons; and `sourceWriteAllowed`
remains the literal `false`. Approval may enable but does not create the WorkOrder / VerificationPlan
handoffs, and creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no
commands, writes no source, and runs no Circe; `intent:go` remains deferred. `status-not-work-ready`
remains a separate downstream gate after approval. No package version change and no npm publish. See
[Intent Operator Approval / Proof Acceptance Safety Review](../strategy/intent-operator-approval-proof-acceptance-safety-review.md).

## Update — Status Work-Ready Transition Decision (slice 125)

The Intent Status Work-Ready Transition Decision pins how an approved `PreparedIntentPlan` reaches
work-ready status past the remaining `status-not-work-ready` gate. Selected Option B: a future
`rekon intent status transition` writes a **new** `IntentStatusReport` work-ready revision after reading
the approved plan and the previous status report and rechecking freshness / drift / status. The previous
report stays immutable; operator approval does not auto-transition status. The work-ready report sets
`status.value = work-ready` and `recommendedNextAction = create-work-order`. The transition may enable but
does not create the WorkOrder / VerificationPlan handoffs; it creates no WorkOrder / VerificationPlan /
VerificationRun / VerificationResult, executes no commands, writes no source, and runs no Circe;
`intent:go` remains deferred. Decision-only — nothing implemented this slice. No package version change
and no npm publish. See
[Intent Status Work-Ready Transition Decision](../strategy/intent-status-work-ready-transition-decision.md).

**Shipped (slice 126): `rekon intent status transition`.** The decision is now implemented: the command
reads an approved `PreparedIntentPlan` plus the previous `IntentStatusReport`, rechecks freshness / drift
/ status, and writes one new work-ready `IntentStatusReport` (`status.value = work-ready`,
`recommendedNextAction = create-work-order`). The previous report and approved plan stay immutable; the
transition creates no WorkOrder / VerificationPlan / VerificationRun / VerificationResult, executes no
commands, writes no source, runs no Circe, and does not implement `intent:go`. Additive kernel fields
(`source.approvedPreparedIntentPlanRef`, `source.previousIntentStatusReportRef`,
`proof.preparation.acceptedRisks`) are backward compatible. No package version change and no npm publish.
See the [Intent Status Work-Ready Transition Implementation](../strategy/intent-status-work-ready-transition-implementation.md).

**Reviewed (slice 127): `rekon intent status transition` is safe/stable.** The safety review confirms the
transition is explicit (approval never auto-transitions), writes a new immutable `IntentStatusReport`
revision, leaves the previous report and approved plan immutable, rechecks prior status / freshness /
runtime drift conservatively, carries `acceptedRisks` into proof, and enables but does not create the
WorkOrder / VerificationPlan handoffs — creating no WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, executing no commands, writing no source, and running no Circe; `intent:go` remains
deferred. Review-only — no code or version change and no npm publish. See the
[Intent Status Work-Ready Transition Safety Review](../strategy/intent-status-work-ready-transition-safety-review.md).

**Decided (slice 128): Classic Intent Plan Compiler / Elicitation Parity.** A parity audit found the
old codebase-intel system compiled and interrogated plans (intake sufficiency → normalization into
executable phase drafts → per-phase actionability gates → missing-info elicitation), a layer Rekon had
not rebuilt. The decision adds a report-first `IntentPlanActionabilityReport` + `rekon intent plan
review` that normalizes a plan and reports exactly what must change before approval, with LLM-backed
semantic normalization in scope (deterministic-first, bounded to read / transform / critique / elicit;
never execution). Report-only: no plan mutation, no source writes, no command execution, no Circe;
`intent:go` deferred. Decision-only — nothing implemented this slice. No package version change and no
npm publish. See the
[Classic Intent Plan Compiler / Elicitation Parity Decision](../strategy/classic-intent-plan-compiler-elicitation-parity-decision.md).

> **Loop closure (slice 135):** the full plan compiler loop (review → answer → merge-back → prepare) is proven end-to-end on a fresh repo through approval, work-ready status, and the gated WorkOrder / VerificationPlan / Circe-bundle handoff — see [`plan-compiler-loop-closure.md`](../strategy/plan-compiler-loop-closure.md).

> **Dogfood review (slice 136):** the closed public path is dogfooded on a realistic fresh TypeScript package and confirmed Circe-importable end-to-end — boundaries explicit, source/plan/test files immutable, no Circe-run record, `intent:go` deferred — see [`fresh-repo-intent-handoff-circe-dogfood-review.md`](../strategy/fresh-repo-intent-handoff-circe-dogfood-review.md).

> **Provider routing implemented (slice 138):** `@rekon/llm-provider` ships the shared router; `rekon intent plan review` gains `--llm-provider` / `--llm-model` and a router-bound adapter — no live provider yet, providers stay proposal-not-proof — see [`rekon-llm-provider-routing-implementation.md`](../strategy/rekon-llm-provider-routing-implementation.md).

> **Provider routing (slice 137):** semantic normalization is being generalized into a shared LLM provider router (task routes, injected adapters, `--llm-provider` / `--llm-model`); providers may read/transform/critique text but never approve/execute/write source/run Circe/implement `intent:go`, and LLM output is proposal, not proof — see [`rekon-llm-provider-routing-semantic-normalization-decision.md`](../strategy/rekon-llm-provider-routing-semantic-normalization-decision.md).

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
