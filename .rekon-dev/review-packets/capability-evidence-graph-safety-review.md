# Review Packet — Capability Evidence Graph Safety Review

**Slice:** capability-evidence-graph-safety-review · **Base:** `d7a3d27` ·
**Track:** semantic intelligence · **Type:** strategy / safety-review (no
runtime/source change)

End-to-end safety review of the Capability Evidence Graph v1 implementation
shipped in slice 153. Conclusion: **safe/stable, no blocker.**

## CHANGES MADE

- New memo `docs/strategy/capability-evidence-graph-safety-review.md`.
- This review packet.
- New docs test `tests/docs/capability-evidence-graph-safety-review.test.mjs`
  (28 assertions).
- Cross-reference updates to 10 docs + README + CHANGELOG (+ optional roadmaps).

## PUBLIC API CHANGES

None. Strategy/safety-review batch — no types, signatures, artifacts, or
commands changed.

## PURPOSE PRESERVATION CHECK

Rekon prepares, proves, packages, and exports; Circe imports and orchestrates.
The CapabilityEvidenceGraph strengthens *prepare* (evidence-backed context) and
must never reach into *prove* / execution / source writes. This review verified
that boundary holds in the shipped code: the graph is evidence-backed context,
not proof by itself; deterministic facts are the only v1 source; LLM/embedding
signals remain deferred and, when added, enter only as evidence-backed
inferences. The product guarantee is preserved.

## CODEBASE-INTEL ALIGNMENT

The old `codebase-intel` system fused deterministic structure with LLM and
embedding interpretation. The architecture decision (slice 152) re-expressed that
as one evidence-backed graph where deterministic facts are the substrate and
model outputs are inferences. v1 ships the deterministic substrate; this review
confirms it is the correct, safe floor on which the classic intelligence (LLM
parsing, embeddings, duplicate/neighbor detection, context bundles) will be
rebuilt as evidence sources — without inheriting model authority.

## IMPLEMENTATION REVIEWED

Re-read at `d7a3d27`: kernel artifact (types + factory + validator + schema +
boundary-keys constant), SDK registration, runtime `graphs` category, the pure
builder, the package re-export, the CLI command + selection helper, and both
test files. Findings below are grounded in that source.

## ARTIFACT MODEL REVIEW

`{ schemaVersion, header, status, nodes, evidence, claims, capabilities,
summary, boundaries }`. Node kinds `file` / `symbol` / `capability`,
de-duplicated and sorted. Confidence validated to `[0, 1]` on claims and
capabilities. Summary recomputed by the validator and required to equal supplied
values. Boundaries forced `false` by the factory; validator rejects any
non-`false` boundary via the boundary-keys loop.

## CLAIM MODEL REVIEW

Claims carry `claimType` / `source` / `confidence` / `status` / `evidenceRefs`.
`evidenceRefs` are validated against the set of evidence ids when evidence is
present. v1 facts (`imports`, `exposes`) are deterministic at `1.0`; heuristic
capability `implements` claims are inferences at `0.5`. Facts and inferences are
separated by `claimType` — no inference is recorded as a fact.

## BUILDER REVIEW

`buildCapabilityEvidenceGraph` is pure: no fs / child_process / network /
provider imports (verified by grep). Deterministic line-based extraction only.
Conservative `KNOWN_VERBS`-gated capability heuristic; classes and non-verb names
yield no capability; no filename-fallback capabilities. The factory forces all
boundaries false.

## CLI REVIEW

`rekon capability graph build` selects source files conservatively, reads them
read-only, builds the graph, and writes one artifact under
`.rekon/artifacts/graphs/`. No command execution, no source writes, no
plan/work-order/verification creation, no Circe, no intent:go. JSON output
surfaces `status` / `artifact` / `summary` / `boundaries`.

## BOUNDARY REVIEW

All nine boundaries hold in code and are validator-enforced: no LLM, no
embeddings, no command execution, no source writes, no PreparedIntentPlan, no
WorkOrder, no VerificationPlan, no Circe, intent:go deferred. Graph is context,
not proof.

## RECOMMENDATION

Declare **Capability Evidence Graph v1 safe/stable.** Next slice: **Semantic File
Understanding -> Evidence Graph Integration Decision** (selected). Embeddings
deferred to follow.

## TESTS / VERIFICATION

- New docs test (28 assertions): headings, 20 verbatim statements, 4 tables,
  CHANGELOG mention, review packet PURPOSE PRESERVATION CHECK.
- Full 9-command gate (typecheck, test, build, diff-check, 4 audits/smokes).
- No CLI smoke required (strategy-only batch).

## INTENTIONALLY UNTOUCHED

The `CapabilityEvidenceGraph` artifact, builder, CLI, SDK/runtime registration,
`SemanticFileUnderstandingReport`, the LLM router, embedding tasks, the
verification spine, and Circe handoff. No source behavior changed.

## RISKS / FOLLOW-UP

- The line-based extractor partially covers multi-line import/export forms — an
  AST pass is a future evidence-quality improvement, not a safety issue.
- The verb vocabulary is conservative and English-only; expanding it is additive.
- Next safety-relevant work is the semantic file integration decision: model
  output must enter as inference claims with provenance/confidence, never as
  facts or proof.

## NEXT STEP

**Semantic File Understanding -> Evidence Graph Integration Decision.**
