# Semantic File Understanding Intent Context Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

Status: reviewed — safe/stable (slice 151). Base `de8c048`. Strategy/safety-review
batch; no runtime behavior changes. Ground-reviews the shipped Semantic File
Understanding Intent Context integration ([implementation](./semantic-file-understanding-intent-context-implementation.md),
[decision](./semantic-file-understanding-intent-context-decision.md)) end-to-end.

## Decision Summary

The integration is **safe/stable**. `SemanticFileUnderstandingReport` consumption
by `rekon intent assess` and `rekon intent plan review` is explicit, proposal/
context-only, and preserves every proof boundary. SemanticFileUnderstandingReport
is proposal/context, not proof. Semantic context consumption is explicit, not
automatic. The recommended next slice is the **Embeddings Parity Audit / Embedding
Index Decision** — the remaining major old codebase-intel semantic track.

## Why This Review Exists

Semantic file reports are now produced safely (`rekon semantic file understand`,
`rekon scan --semantic-files`) and were scan-integration safety-reviewed. Slice
150 wired their consumption into intent assessment and plan actionability. This
review confirms that the wiring improves grounding **without** becoming proof or
weakening gates — the product guarantee is opt-in semantic context, visible
staleness, prompt/context enrichment, and no approval / execution / source writes
/ handoff-artifact creation.

## Implementation Reviewed

Grounded at `de8c048` against the committed source (not memory):

- Pure helper `packages/capability-model/src/semantic-file-context.ts`
  (`selectSemanticFileContext`, `summarizeSemanticFileContext`, the
  `SemanticFileUnderstandingReportLike` view, and the selection/stale types).
  No fs, no providers, no clock.
- `buildIntentAssessmentReport` (`packages/capability-model/src/intent-assessment-report.ts`)
  gains an optional `semanticFileContext`; the readiness block is computed at the
  top of the builder and the semantic enrichment runs *after* it, immediately
  before `createIntentAssessmentReport`.
- `buildIntentPlanActionabilityReport`
  (`packages/capability-model/src/intent-plan-actionability-report.ts`) gains an
  optional `semanticFileContext`; the report (including `status` and `findings`)
  is fully assembled, then grounding/notes are appended immediately before
  `createIntentPlanActionabilityReport`.
- CLI (`packages/cli/src/index.ts`): a module-level
  `resolveSemanticFileContextSelection` reads existing reports, hashes current
  files, and selects; two opt-in flags per command; a `--json`-only
  `semanticContext` summary.

No kernel artifact schema changed; `packages/kernel-repo-model/src/index.ts` was
read-only in slice 150.

## Selection Model Review

`selectSemanticFileContext` is deterministic and pure. Reviewed behavior:

- **Match by path** — `pathRelated` matches a report to a requested path by
  normalized equality or containment; when `requestedPaths` is non-empty, a
  report whose path is unrelated to every requested path is skipped.
- **sha256 staleness** — when the current file hash is known and differs from the
  report's `file.sha256`, the report is classified stale (`reason: "sha-mismatch"`)
  and never used.
- **Boundary all-false** — a report is consumed only when its `boundaries` are
  present and all-false; any non-false boundary classifies it stale
  (`reason: "boundaries-not-clean"`). A report that claims it executed commands,
  wrote source, or ran embeddings can never be consumed as context.
- **Latest-by-path** — usable reports are kept in a per-path map, so the latest
  (last in caller order = newest write) wins.
- **Missing** — requested paths with no usable and no stale report are reported as
  `missing`.

The CLI controls the candidate set: explicit `--semantic-context-ref` reports are
the candidate set and bypass the path filter; `--semantic-context latest`
considers every stored report and lets selection path-filter by request.

## Intent Assessment Review

`intent assess` uses semantic context as **context enrichment only**.
`IntentAssessmentReport` readiness remains governed by existing gates: the
`readiness` block (and `blockers` / `missingContext`) is computed before the
semantic step, which only (a) adds used-report paths to `matchedContext.paths`
and (b) appends low-severity warnings — `scope-ambiguous` when a used report
carries findings, `stale-context` for stale reports. Because the enrichment runs
after readiness is decided, semantic context cannot flip readiness, cannot
suppress a deterministic blocker, and cannot satisfy a proof gate.

## Plan Actionability Review

`intent plan review` uses semantic context as **revisionPrompt grounding only**.
`IntentPlanActionabilityReport` status remains governed by actionability, not
semantic context alone: `status` and `findings` are decided by the deterministic
actionability evaluator, then semantic context appends a "proposal/context, not
proof" grounding section to `revisionPrompt.prompt` and stale/missing notes to
`normalizationTrace.warnings`. No finding is added or removed and the status is
never made more permissive by semantic context.

## Stale Context Review

Stale semantic reports are not consumed silently. Both staleness paths (sha
mismatch, non-clean boundaries) drop the report from `usedReports`, record a
`staleReports` entry with a reason, and emit a human-readable warning. The CLI
surfaces the count via `semanticContext.stale` (JSON) and the human "Semantic
context: N used, M stale" line; the plan-review builder records stale notes in
`normalizationTrace.warnings`.

## CLI Review

- Both flags are opt-in: with neither `--semantic-context latest` nor
  `--semantic-context-ref`, the resolver returns `undefined`, no
  `semanticFileContext` reaches the builders, and behavior is byte-for-byte
  unchanged (no `semanticContext` key in `--json`).
- Explicit refs take precedence and are not path-filtered.
- Missing explicit semantic-context refs fail cleanly — an unresolved
  `--semantic-context-ref` throws a clear error and the command exits non-zero
  before writing any report.
- Latest semantic context is path-filtered to the request's paths
  (`scope.paths` for assess, `--path` for plan review).
- The `semanticContext: { requested, used, stale, missing, warnings }` summary
  appears only when semantic context is requested.

## Boundary Review

Every boundary from the decision holds in the shipped code:

- SemanticFileUnderstandingReport is proposal/context, not proof.
- Semantic context consumption is explicit, not automatic.
- Semantic context must not approve plans.
- Semantic context must not satisfy proof gates by itself.
- Semantic context must not replace deterministic evidence artifacts.
- Stale semantic reports are not consumed silently.
- Missing explicit semantic-context refs fail cleanly.
- Latest semantic context is path-filtered.
- IntentAssessmentReport readiness remains governed by existing gates.
- IntentPlanActionabilityReport status remains governed by actionability, not semantic context alone.
- Semantic context creates no PreparedIntentPlan.
- Semantic context creates no WorkOrder.
- Semantic context creates no VerificationPlan.
- Semantic context creates no VerificationRun or VerificationResult.
- Semantic context executes no commands.
- Semantic context writes no source files.
- Semantic context runs no Circe.

### Surface table

| Surface | Status | Safety Finding |
| --- | --- | --- |
| --semantic-context latest | shipped | explicit opt-in |
| --semantic-context-ref | shipped | explicit refs |
| selectSemanticFileContext | shipped | path + sha + boundary selection |
| intent assess integration | shipped | context enrichment only |
| intent plan review integration | shipped | prompt/revision grounding only |
| stale reports | shipped | warning / not silent |
| missing refs | shipped | clean failure |

### Consumption table

| Consumer | Review Finding |
| --- | --- |
| IntentAssessmentReport | matchedContext enrichment / warnings only |
| IntentPlanActionabilityReport | revisionPrompt grounding / warnings only |
| PreparedIntentPlan | no direct consumption |
| WorkOrder / VerificationPlan | no direct consumption |

### Boundary table

| Boundary | Decision |
| --- | --- |
| semantic context vs proof | proposal/context |
| semantic context vs approval | no approval |
| semantic context vs deterministic evidence | does not replace |
| semantic context vs proof gates | does not satisfy alone |
| semantic context vs command execution | no execution |
| semantic context vs source writes | no writes |
| semantic context vs WorkOrder / VerificationPlan | not created |
| semantic context vs Circe | not run |
| embeddings | deferred |
| intent:go | deferred |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare intent-context integration safe/stable | selected | explicit/context-only boundary holds |
| embeddings parity audit next | selected | remaining major semantic track |
| extra dogfood next | deferred | useful but not required before embeddings audit |
| automatic semantic context consumption | rejected | surprise/freshness risk |
| semantic context as proof | rejected | proposal/context only |

## Recommendation

**Semantic File Understanding Intent Context is safe/stable.** No blocker found.
Proceed to the **Embeddings Parity Audit / Embedding Index Decision** — the
non-embedding LLM semantic-parsing track is now implemented, scan-integrated,
intent-context-integrated, and safety-reviewed, leaving embeddings as the
remaining major old codebase-intel semantic-intelligence track. An optional
**Semantic File Understanding Intent Context Dogfood** (using `--semantic-files`
and `--semantic-context` together) is available if another live/operator pass is
wanted first, but the default recommendation moves to the embeddings audit.

## What This Does Not Do

This review changes no runtime behavior, no semantic-context integration, and
adds no semantic-context behavior. Semantic context creates no PreparedIntentPlan,
no WorkOrder, no VerificationPlan, no VerificationRun or VerificationResult;
executes no commands; writes no source files; runs no Circe. Embeddings remain
deferred to a separate track and intent:go remains deferred.

## Follow-Up Work

- **Next:** Embeddings Parity Audit / Embedding Index Decision.
- **Alternative:** Semantic File Understanding Intent Context Dogfood.
- Relevance filtering (which reports apply to a goal/plan) is heuristic in v1
  (path-related + sha/boundary staleness); revisit if false matches appear.
- A separate `fix(cli): report intent bundle handoff paths` change is also on the
  reviewed tip (`de8c048`); it is unrelated to this integration and untouched by
  this review.
