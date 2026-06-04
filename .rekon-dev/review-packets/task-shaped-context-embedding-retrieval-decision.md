# Review Packet — Task-Shaped Context / Embedding Retrieval Decision (slice 165)

**Base:** `4bd331f`
**Batch type:** strategy / architecture decision (no source, no runtime behavior,
no new artifact, no CLI command, no Voyage calls)
**Decision:** Adopt `TaskContextReport` as the first retrieval consumer (Option B).

## CHANGES MADE

- Added `docs/strategy/task-shaped-context-embedding-retrieval-decision.md` — the
  decision memo: 13 required headings, 18 decision questions answered, the
  `TaskContextReport` TS sketch, a selection policy, a human/agent output model,
  evidence/graph-expansion semantics, five decision tables (option, input,
  selection, output, boundary), and 15 verbatim boundary statements.
- Added `tests/docs/task-shaped-context-embedding-retrieval-decision.test.mjs`
  (24 assertions) pinning headings, boundary statements, tables, the CHANGELOG
  mention, and this packet's PURPOSE PRESERVATION CHECK.
- Added this review packet.
- Updated supporting docs with slice-165 cross-references: the two predecessor
  retrieval memos, the live-voyage dogfood memo, the two embedding concept docs,
  the capability-evidence-graph and semantic-file-understanding concept docs, both
  v1 release docs, both roadmaps, README narrative log, and CHANGELOG.

## PUBLIC API CHANGES

None. No artifact type, helper, CLI command, schema, or exported symbol changes.
This is a decision-only batch. The `TaskContextReport` type and `rekon context
task` command are **sketched**, not implemented — they land in the next slice
(TaskContextReport v1).

## PURPOSE PRESERVATION CHECK

- **Original problem:** retrieval works, but a raw nearest-neighbor list is not the
  product; humans and agents need compact, task-shaped context that combines graph
  facts, semantic understanding, and embedding neighbors without treating
  similarity as proof. — **Preserved.** The memo selects `TaskContextReport`, a
  graph-grounded bundle, and rejects raw-query-only (Option A) and markdown-only
  (Option C).
- **Product guarantee — task context is proposal/context, not proof.** — Preserved
  verbatim and in the boundary table.
- **Context grounded in CapabilityEvidenceGraph evidence.** — Preserved: graph is
  the substrate; every context item carries evidence refs; deterministic facts
  outrank similarity.
- **Embedding results weighted, explained, filtered by score bands.** — Preserved:
  strong/useful included, weak optional, ignored excluded by default; each item
  carries score + band + reason + source.
- **Deterministic facts remain stronger than similarity.** — Preserved verbatim
  ("Deterministic graph facts outrank embedding similarity").
- **No source files written; no commands executed.** — Preserved in the boundary
  statements and the `boundaries` block of the sketched artifact.
- **Duplicate detection and canonical recommendations deferred.** — Preserved
  verbatim; both remain non-goals with documented rationale.

## SOURCE REVIEW

Grounded at `4bd331f`. Reviewed (read-only):

- `packages/capability-model/src/embedding-index.ts` — `EmbeddingScoreBand`
  (`strong`/`useful`/`weak`/`ignored`), `EMBEDDING_SCORE_BAND_STRONG=0.78` /
  `USEFUL=0.65` / `WEAK=0.5`, `classifyEmbeddingSimilarityScore`,
  `EmbeddingChunkRef`, `EmbeddingIndexRecord`. The report reuses the band
  classifier and thresholds.
- `packages/capability-model/src/capability-evidence-graph.ts` — `ArtifactHeader`
  from `@rekon/kernel-artifacts`, `schemaVersion: "0.1.0"`, graph nodes/claims.
- `packages/capability-model/src/semantic-file-understanding-report.ts` —
  `SemanticFileUnderstandingReport`, `ArtifactHeader`, `schemaVersion: "0.1.0"`.
- `packages/cli/src/index.ts` — `embeddings query` (slice-164) output:
  `results`/`matches` with `score`/`scoreBand`/`chunk`/`explanation`, `boundaries`
  block, default top-k 8 / max 20, `input_type=query`.
- `tests/contract/embedding-query-ranking-policy.test.mjs`,
  `tests/contract/embedding-retrieval-graph-dogfood.test.mjs` — existing retrieval
  contracts the future consumer must not break.
- The two retrieval strategy memos, both embedding concept docs, and the semantic
  understanding concept doc.
- **codebase-intel** (`/Users/andrewlittrell/Code/codebase-intel`, present): a
  read-only Explore pass extracted `ContextBundleSchema` (query/budget/
  architecture/files/symbols/learnings/warnings), `ContextResolvePacketSchema`
  (`routing` changeHere/avoidHere, `mustNot`, `checkMatrix` of verification
  commands), `selectRepresentatives` (top-5 by score then `system::layer`
  diversity), `computeCanonicalScore` (base 50 + bonuses + `log2(fanIn+1)*5`), and
  the tldr/full source-mode split. These map onto `TaskContextReport`
  (`mustNot`→`doNotTouch`, `checkMatrix`→`verificationHints`,
  representative-diversity→selection); canonical scoring stays deferred.

## CURRENT RETRIEVAL SURFACE

`rekon embeddings query` (slice-164): `input_type=query`, default top-k 8 / max 20,
results carrying `score`/`scoreBand`/`chunk`/`explanation` and a `boundaries`
block; `rekon embeddings index` keeps `input_type=document`;
`classifyEmbeddingSimilarityScore` is the shared band classifier;
`CapabilityEvidenceGraph` + `SemanticFileUnderstandingReport` are the evidence
substrate. The gap: no surface assembles these into task-shaped context.

## TASKCONTEXTREPORT MODEL

Sketched (not built): a canonical structured-JSON artifact
`ArtifactHeader<"TaskContextReport">` at `schemaVersion: "0.1.0"` carrying `task`,
`selection` (query/provider/model/topK/scoreBands), `contextItems` (kind, path,
symbolId, capabilityId, reason, score, scoreBand, evidenceRefs, source),
`graphNeighborhood`, `doNotTouch`, `verificationHints`, and a `boundaries` block
(all-false). The markdown/human summary is a **rendered view** of the canonical
artifact. Every context item, do-not-touch entry, and verification hint preserves
`evidenceRefs`.

## SELECTION POLICY

Pinned order: (1) start from embedding retrieval (ranking policy); (2) include
strong + useful; (3) weak as optional/supporting; (4) expand selected chunks
through the graph (file/symbol/capability nodes, imports/exports, owning/implements
claims, semantic-summary claims); (5) add deterministic facts even when the score
is lower (they outrank similarity); (6) add operator paths even if retrieval misses
them; (7) exclude ignored by default. Diversity (system/layer/capability) preferred
when filling slots, per codebase-intel's representative selection.

## HUMAN AND AGENT OUTPUT

Both render the same canonical artifact. Human: concise markdown (top items, why
included, risks/do-not-touch, verification hints). Agent: structured JSON (exact
paths, symbols, constraints, evidence refs, do-not-touch zones, verification
hints). **The artifact is canonical structured JSON; markdown/human summary is a
rendered view** — humans and agents never diverge on facts.

## EVIDENCE AND GRAPH EXPANSION

`CapabilityEvidenceGraph` remains the substrate. Retrieval seeds; the graph
grounds and expands. Deterministic facts are admitted regardless of score and
outrank similarity; semantic summaries enter as context through graph evidence.
Stale/policy-changed vectors are excluded by default (warn + skip); stale graph or
semantic reports surface a freshness warning while the bundle still assembles from
available facts. Nothing is fabricated. Do-not-touch zones are emitted only when
evidence supports them; verification hints are surfaced as hints, never executed.

## BOUNDARY MODEL

Boundary table pins: proposal/context (not proof), no approval, no execution, no
source writes, no WorkOrder/VerificationPlan, no Circe, duplicate detection
deferred, canonical recommendations deferred, intent:go deferred. The 15 verbatim
boundary statements are listed in the memo's Boundary Model section and pinned by
the docs test.

## TESTS / VERIFICATION

- New docs test (24 assertions) — headings, 15 boundary statements, 5 tables,
  CHANGELOG mention, review-packet PURPOSE PRESERVATION CHECK.
- Full keyless 9-command gate: `npm run typecheck`, `npm run test`,
  `npm run build`, `git diff --check`, `node scripts/audit-package-exports.mjs`,
  `node scripts/audit-license.mjs`, `node scripts/publish-dry-run.mjs`,
  `node scripts/install-smoke.mjs`, `node scripts/install-tarball-smoke.mjs`.
- No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

- No `TaskContextReport` type / `rekon context task` command implementation.
- No retrieval, ranking-policy, or Voyage adapter change.
- No duplicate detection, canonical recommendations, ANN/HNSW, or provider
  architecture.
- No live providers, command execution, source writes, WorkOrder/VerificationPlan,
  or Circe. No `intent:go`. No npm publish, version bump, or branch.

## RISKS / FOLLOW-UP

- **Risk:** the sketched shape over- or under-specifies fields the v1 build needs.
  *Mitigation:* the memo marks the shape a sketch; v1 may refine field names/kinds.
- **Risk:** graph-expansion breadth could make bundles noisy. *Mitigation:*
  selection policy caps via top-k + bands + diversity; weak is optional-only;
  ignored excluded.
- **Follow-up:** TaskContextReport v1 (artifact + command), then a publication /
  safety review; duplicate detection and canonical recommendations remain gated on
  precision evidence.

## NEXT STEP

**TaskContextReport v1** — register the `TaskContextReport` artifact; add
`buildTaskContextReport` (task text + optional paths → retrieval candidates → graph
expansion → evidence refs → context items, do-not-touch zones, verification hints);
add `rekon context task` with a human markdown view and an agent JSON view. No
proof/approval semantics, no source writes, no command execution, no Circe, no
`intent:go`.
