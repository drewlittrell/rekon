# Intent Plan Compiler — Semantic Normalization Quality Dogfood

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **LLM-semantic parity decided (slice 143):** an audit of the old codebase-intel system separated Track A (finish LLM-backed semantic parsing — the one real non-embedding gap is per-file semantic file understanding) from Track B (embeddings, deferred). Semantic output stays proposal-not-proof; no approval/execution/source-writes/Circe. See [`classic-llm-semantic-parsing-parity-decision.md`](./classic-llm-semantic-parsing-parity-decision.md).

> **Semantic quality hardened (slice 142):** provider phases are re-checked against the source — unsupported touched paths and verification commands become findings + warnings, dropped non-goals are flagged, and a weak plan cannot become actionable by filling fields without source support. Deterministic recheck stays authoritative. See [`intent-plan-semantic-quality-hardening.md`](./intent-plan-semantic-quality-hardening.md).

Status: **Proven** with a live OpenAI provider (slice 141). Path B.

This memo records a live, evidence-backed evaluation of **LLM-backed semantic
normalization quality** for the Rekon intent plan compiler — not just the
off/auto/required plumbing (proven in the LLM Provider Routing Implementation and
the Intent Plan Compiler Semantic Normalization / Dogfood slices), and not the
end-to-end Circe handoff (proven in the Fresh Repo Intent Handoff / Circe Dogfood
Review). **LLM-backed semantic normalization quality is evaluated separately from
Circe handoff.**

## Why this batch exists

Path A — driving a fresh repo all the way to a Circe-importable bundle — is done.
Path B asks a different question: when a routed LLM provider is actually available,
does semantic parsing produce *better* plan-compiler input than the deterministic
parser, **without** weakening any proof boundary?

Before this batch, only the safety plumbing was proven: `--semantic off` is
deterministic, `--semantic auto` falls back safely when no provider is available,
`--semantic required` fails cleanly when no provider is available, and provider
output is schema-gated and deterministically re-checked. What was **not** proven:
that live provider output improves rough-plan normalization, that provider/model
switching produces useful structured phases, and that semantic output preserves
non-goals and avoids unsupported invention.

## The proposal-not-proof model (unchanged)

LLM-backed normalization sits behind the same non-executing gates as the
deterministic parser. **Semantic output is a proposal, not proof.** Concretely:
**semantic output is schema-validated and deterministically rechecked** — the
provider returns a `{ phases: [...] }` object that is gated by `coercePhaseDrafts`
and then re-evaluated, phase by phase, by the same deterministic actionability
evaluator that governs the `off` path. Unsupported or thin provider claims become
findings and elicitation questions, never silent approval.

The boundaries the deterministic path guarantees still hold for the semantic path:
**semantic normalization executes no commands**, **semantic normalization writes
no source files** (and writes no plan files), creates no PreparedIntentPlan /
WorkOrder / VerificationPlan / VerificationRun / VerificationResult, **semantic
normalization runs no Circe**, and **intent:go remains deferred**.

Crucially: **no-key fallback is safety behavior, not semantic quality proof.** A
clean deterministic fallback when no key is configured demonstrates the routing is
safe; it says nothing about whether a real model helps. Therefore **live provider
dogfood is required to call semantic quality proven** — and this batch ran one.

## Live evidence (OpenAI `gpt-4o-mini`, deterministic `off` vs `semantic-llm`)

Six rough-plan fixtures, each in a fresh temp repo with real `package.json`
scripts and a real `src/index.ts`. `f` = deterministic findings; the extraction
columns count phases that carried each field.

| Fixture | off | semantic | objective / deliverables / acceptance / paths / verification | invented paths | invented commands |
| --- | --- | --- | --- | --- | --- |
| brain dump | 1 ph, 6 f | 1 ph, **4 f** | 1 / 1 / 0 / 1 / 0 | none | none |
| messy bullets | 1 ph, 8 f | 1 ph, **4 f** | 1 / 1 / 0 / 1 / 0 (non-goal "don't break greet" preserved) | none | none |
| implicit phases | 1 ph, 7 f | **4 ph**, 24 f | 4 / 0 / 0 / 0 / 0 | none | none |
| missing verification | 1 ph, 6 f | 1 ph, **2 f** | 1 / 1 / 1 / 1 / 0 | none | none |
| non-goals | 1 ph, 6 f | 1 ph, **4 f** | 1 / 1 / 0 / 1 / 0 (all 3 non-goals preserved) | none | none |
| source-plan style | 2 ph, 12 f | 2 ph, **4 f** | 2 / 2 / 1 / 2 / 1 (real commands extracted) | none | none |

Across all six fixtures **source and plan files were byte-unchanged**, every
result kept status `needs-revision` (never auto-`actionable`), and a model-switch
cross-check on `gpt-4.1-mini` (implicit-phases → 4 phases; non-goals → 1 phase)
reproduced the same boundaries with **zero invention**.

## Quality verdict

Semantic normalization is **useful**: it extracted objectives on every fixture,
extracted deliverables, acceptance criteria (missing-verification, source-plan),
touched paths (5 of 6), and real verification commands (source-plan:
`npm run typecheck` / `npm test` / `npm run build`); it preserved non-goals
verbatim (messy-bullets, non-goals); it genuinely decomposed an implicit
"First… Then… Make sure… Review" plan into four phases; and it reduced ambiguity
(findings fell 6→4, 8→4, 6→2, 12→4 where decomposition stayed constant).

It is also **safe**: across six fixtures plus two model-switch cross-checks there
were **zero invented paths and zero invented commands** — the only path ever
produced was the real `src/index.ts`, and the only commands were the three that
were literally in the plan and are real package scripts.

One honest caveat: on the implicit-phases fixture the model decomposed into four
thin (objective-only) phases, so the deterministic recheck surfaced *more* gaps
(7 → 24 findings). This is not hallucination and not a regression — it is finer
decomposition honestly exposing incomplete phase contracts, and the deterministic
recheck flagged every one. Per the over-eager policy, the deterministic recheck
findings govern; no prompt or schema change was warranted.

## The one shipped change

The dogfood surfaced a single ergonomic gap and fixed it minimally: `rekon intent
plan review --json` now emits a `normalization` block (`method`,
`invokedSemanticNormalization`, `provider`, `model`, `warnings`) so operators and
agents can see whether semantic normalization fired and via which provider/model
without a second `artifacts show`. The change is additive and read-only; provider
output remains a proposal that the deterministic evaluator already re-checked.

## Scope / embedded safety review

> This semantic quality dogfood does not introduce a new execution/source-write/Circe boundary; it evaluates provider-backed text transformation under the already-shipped proposal-not-proof model.

The provider-selection, schema-validation, deterministic-recheck, no-source-write,
and no-command-execution boundaries are unchanged; the only code delta exposes an
already-computed trace in JSON.

## Next step

Semantic quality is proven live, so the recommended next batch is **V1 Publish
Readiness Reconciliation / npm Release Decision**. If a future run needs a
different provider/model, the same `--llm-provider` / `--llm-model` /
`REKON_LLM_BASE_URL` routing applies with no architecture change.

## Related

- [Intent Plan Compiler Semantic Normalization / Dogfood](./intent-plan-compiler-semantic-normalization-dogfood.md)
- [Rekon LLM Provider Routing Implementation](./rekon-llm-provider-routing-implementation.md)
- [Fresh Repo Intent Handoff / Circe Dogfood Review](./fresh-repo-intent-handoff-circe-dogfood-review-semantic.md)
- [Intent Plan Compiler concept](../concepts/intent-plan-compiler.md)
- [Rekon LLM Provider Routing concept](../concepts/rekon-llm-provider-routing.md)
- [IntentPlanActionabilityReport artifact](../artifacts/intent-plan-actionability-report.md)
