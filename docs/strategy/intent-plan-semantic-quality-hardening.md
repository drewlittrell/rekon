# Intent Plan — Semantic Normalization Quality Hardening

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

> **LLM-semantic parity decided (slice 143):** an audit of the old codebase-intel system separated Track A (finish LLM-backed semantic parsing — the one real non-embedding gap is per-file semantic file understanding) from Track B (embeddings, deferred). Semantic output stays proposal-not-proof; no approval/execution/source-writes/Circe. See [`classic-llm-semantic-parsing-parity-decision.md`](./classic-llm-semantic-parsing-parity-decision.md).

Status: **Implemented** (slice 142). Path B. Base: `09019bb`.

The live semantic-quality dogfood proved LLM-backed normalization is useful and,
on the sampled fixtures, safe. This slice converts those findings into **standing
quality gates**: deterministic guards that re-check provider output against the
source before the actionability evaluator trusts it. A live provider is only
useful in operator workflows if it stays constrained — so semantic output that
invents paths/commands or drops non-goals must surface, not slip through.

## The proposal-not-proof model, now guarded

**Semantic output remains a proposal, not proof.** After provider phases pass the
structural schema gate (`coercePhaseDrafts`), a deterministic quality guard
re-checks them against the source plan, goal, operator `--path` declarations, and
the repo's package scripts. The guard never rejects structurally-valid output
outright — it downgrades trust (warn + find), and the existing deterministic
evaluator does the rest.

- **Unsupported paths become warnings/findings.** A touched path that is not in
  the plan text, the goal, or the operator-provided `--path` set yields an
  `implementation-scope` finding and a `normalizationTrace` warning.
- **Unsupported commands become warnings/findings.** A verification command that
  is not stated in the plan and not a known package script yields a
  `verification-evidence` finding and a `normalizationTrace` warning.
- **Non-goals must be preserved or warned.** Each stated non-goal ("Do not …" /
  "Non-goals") must survive in the phase constraints; a dropped non-goal yields a
  warning and a finding.
- Provider-generated phase content with no source evidence yields an
  informational warning.

Crucially, **semantic output cannot make a weak plan actionable merely by filling
fields without source support**: a phase that fills every field but cites paths
and commands the plan never mentioned accrues guard findings, so the report stays
`needs-revision`. **Deterministic recheck remains authoritative** — guard findings
join the same `evaluatePhase` findings that derive status; provider output never
sets status directly and is never auto-`actionable`.

## Evidence

A bad provider phase (invented `src/invented.ts`, invented `npm run bogus`, and
two dropped non-goals from a plan that stated them) produced, deterministically:
`method: semantic-llm`, status `needs-revision`, **4 guard findings** (unsupported
path, unsupported command, two dropped non-goals) and **5 warnings**. A good
provider phase (touched `src/index.ts` which the plan stated, non-goals preserved
in constraints, source evidence present) produced **0 guard findings and 0 guard
warnings** — no false positives.

A live OpenAI run (`gpt-4o-mini`) on the non-goals fixture preserved every stated
non-goal, invented no paths and no commands, recorded provider/model, and left the
source and plan files unchanged.

## Boundaries (unchanged)

The guard is read-only deterministic logic over already-coerced text. It does not
widen any boundary: **semantic normalization executes no commands**, **semantic
normalization writes no source files** (or plan files), creates no
PreparedIntentPlan / WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, **semantic normalization runs no Circe**, and **intent:go
remains deferred.**

## Scope / embedded safety review

> This hardening adds deterministic post-provider quality guards and prompt/CLI tightening; it does not introduce a new execution/source-write/Circe boundary and keeps semantic output behind the already-shipped proposal-not-proof model.

The supported-path / supported-command / non-goal-preservation / deterministic-recheck boundaries are tightened, not loosened; the only new inputs are read-only (operator `--path`, package scripts).

## Next step

With the guards in place, the recommended next batch is to return to the full
operator-facing **Fresh Repo Intent Handoff / Circe Dogfood Review**, now exercising
the hardened semantic path end-to-end. No V1 publish readiness until semantic
quality is honestly stable.

## Related

- [Intent Plan Semantic Quality Dogfood](./intent-plan-semantic-quality-dogfood.md)
- [Intent Plan Compiler Semantic Normalization / Dogfood](./intent-plan-compiler-semantic-normalization-dogfood.md)
- [Rekon LLM Provider Routing concept](../concepts/rekon-llm-provider-routing.md)
- [Intent Plan Compiler concept](../concepts/intent-plan-compiler.md)
- [IntentPlanActionabilityReport artifact](../artifacts/intent-plan-actionability-report.md)

## Semantic File Understanding v1

Rekon has a per-file semantic understanding capability (slice 144): `rekon semantic file understand` produces a `SemanticFileUnderstandingReport`. Deterministic structural extraction (language, line/byte counts, imports, public exports, responsibilities) is always on and authoritative for imports/exports (the hallucination guard); optional LLM semantic understanding is a schema-validated, deterministically-rechecked proposal, not proof. It executes no commands, writes no source files, generates no embeddings, creates no PreparedIntentPlan / WorkOrder / VerificationPlan, runs no Circe, and intent:go remains deferred. See [Semantic File Understanding v1](./semantic-file-understanding-v1.md) and the [concept](../concepts/semantic-file-understanding.md).
