# Review Packet — Semantic File Understanding Scan Integration Decision (slice 146)

Base SHA: `8bad858`. Branch: none (push to main after the gate). Decision-only batch.
No runtime behavior changes.

## CHANGES MADE

- `docs/strategy/semantic-file-understanding-scan-integration-decision.md` — new decision memo.
- `.rekon-dev/review-packets/semantic-file-understanding-scan-integration-decision.md` — new (this).
- `tests/docs/semantic-file-understanding-scan-integration-decision.test.mjs` — new (19 assertions).
- Doc updates: safety review + v1 strategy + artifact + concept + provider-routing concept +
  parity decision + 2 release docs + README + CHANGELOG (+ optional roadmaps).
- No source code, no tests-of-behavior, no CLI changes, no package additions.

## PUBLIC API CHANGES

None. Documentation/decision-only batch.

## PURPOSE PRESERVATION CHECK

Semantic file understanding is shipped and safety-reviewed; the open question was how it
becomes repo-scale useful without surprising operators. Running LLMs during scan by
default would break privacy/cost/latency/trust and the deterministic-scan-by-default
guarantee. This decision keeps scan deterministic by default, routes repo-scale
understanding through an explicit batch command first (`rekon semantic files understand
--changed|--all`), keeps provider calls explicit and source text private by default,
makes reports proposal/context not proof, and keeps embeddings a separate track. Purpose
preserved.

## CODEBASE-INTEL ALIGNMENT

The old codebase-intel ran its per-file LLM scan as part of analysis, but Rekon's product
guarantee is deterministic-by-default scan with explicit, reviewable provider opt-in. This
decision aligns the repo-scale capability with that guarantee — staged (batch command →
review → optional scan flag) rather than wired into scan wholesale.

## CURRENT SCAN SURFACE

Grounded at `8bad858`: `rekon scan [--root <path>] [--json]` (no `--semantic`/`--llm-*`
flags) initializes `.rekon/` and runs `runRefresh(root, {})` — the shared deterministic
substrate pipeline, identical to `rekon refresh` with no skips. It produces the
deterministic substrate (EvidenceGraph / CapabilityMap / IntelligenceSnapshot and
projections), calls no providers, produces no `SemanticFileUnderstandingReport`, writes
only inside `.rekon/`, executes no commands, and implements no intent:go.

## OPTIONS CONSIDERED

A (manual single-file only) — rejected/deferred (too low-level). B (explicit batch
command before scan flag) — **selected**. C (scan flag now) — deferred. D (automatic
during scan) — rejected (cost/privacy/surprise). E (embeddings with scan now) —
rejected/deferred (separate track). Selected v1 surface: Option B1, `rekon semantic files
understand --changed|--all`.

## BATCH COMMAND MODEL

`rekon semantic files understand --changed|--all [--path <path>] [--semantic
off|auto|required] [--llm-provider <id>] [--llm-model <model>] [--root <path>] [--json]`
(plural `files`, distinct from the shipped singular `semantic file understand`). It
selects files, skips ignored/binary/generated/oversized files, computes sha256, reuses
matching reports, writes new reports for changed files, and emits a batch summary. Reuses
the shipped pure builder + router adapter.

## SCAN FLAG MODEL

A future `rekon scan --semantic-files off|auto|required` is deferred until the batch
command is implemented and safety-reviewed. Default `off`; scan with no flag is unchanged.

## CACHE / STALENESS MODEL

`SemanticFileUnderstandingReport` stays a canonical (operator-visible) artifact, not a
hidden cache. Incremental selection uses path + sha256: matching sha256 (+ same
mode/provider/model policy) → reuse; changed sha256 → stale/regenerate; changed
provider/model or semantic mode → regenerate or mark policy-changed.

## SOURCE TEXT PRIVACY MODEL

Source text is not sent to providers by default. It goes to a provider only when the
operator picks `--semantic auto|required` (or config enables it). Batch default is
`--semantic off`. Auto + no key → deterministic fallback, no call. Required + no key →
clean failure, no report.

## INTENT CONTEXT RELATIONSHIP

Reports may later feed intent context as proposal/context — `IntentAssessmentReport` /
`IntentPlanActionabilityReport` may use them for additional context / source grounding —
but never as proof, never to approve plans, and never to replace deterministic
EvidenceGraph / CapabilityMap / StepCapabilityGraph. Automatic consumption deferred until
the batch command exists and is reviewed.

## BOUNDARY MODEL

Scan deterministic by default; provider calls explicit/configured only; source text not
sent by default; semantic report proposal/context not proof; no approval, no command
execution, no source writes, no embeddings; intent:go deferred.

## TESTS / VERIFICATION

- Docs test: 19 assertions (headings, boundary statements, 4 tables, CHANGELOG, packet).
- Full 9-command gate: green (no behavior change). No CLI smoke (decision batch).

## INTENTIONALLY UNTOUCHED

No scan integration implemented; no scan behavior change; no providers run; no embeddings;
no vector storage/retrieval; no providers added; no version bump; no branch.

## RISKS / FOLLOW-UP

- File-selection policy (changed-set source, ignore/binary/size limits) must be pinned
  precisely in the batch command implementation slice.
- The batch command's safety review should re-confirm provider/source-privacy boundaries
  before any scan-flag decision.

## NEXT STEP

**Semantic Files Understand Batch Command v1** — `rekon semantic files understand
--changed|--all` with source-hash reuse/staleness, provider/source-privacy boundaries, and
a batch summary. Still no embeddings, source writes, command execution, auto-approval, or
intent:go.
