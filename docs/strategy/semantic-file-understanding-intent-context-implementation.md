# Semantic File Understanding Intent Context Implementation

Status: shipped (slice 150). Base `26622c5`. Implements the slice-149
decision ([semantic-file-understanding-intent-context-decision.md](./semantic-file-understanding-intent-context-decision.md),
Option B — explicit consumption): `rekon intent assess` and `rekon intent plan
review` may now EXPLICITLY consume `SemanticFileUnderstandingReport`s as
proposal/context, under strict, proof-preserving boundaries.

## What shipped

- A new pure helper `selectSemanticFileContext` (plus `SemanticFileContextSelection`,
  `SemanticFileUnderstandingReportLike`, and `summarizeSemanticFileContext`) in
  `@rekon/capability-model` (`packages/capability-model/src/semantic-file-context.ts`).
- `buildIntentAssessmentReport` accepts an optional `semanticFileContext`
  selection: it enriches `matchedContext.paths` and appends non-blocking,
  low-severity warnings.
- `buildIntentPlanActionabilityReport` accepts an optional `semanticFileContext`
  selection: it appends file grounding to `revisionPrompt.prompt` and stale /
  missing notes to `normalizationTrace.warnings`.
- Two opt-in CLI flags on BOTH commands: `--semantic-context latest` and
  `--semantic-context-ref <SemanticFileUnderstandingReport:id>` (repeatable).
- A CLI-only `semanticContext` summary in `--json` output
  (`{ requested, used, stale, missing, warnings }`) and a human line
  (`Semantic context: N used, M stale`), shown only when semantic context is
  requested.

No kernel artifact schema changed. The `SemanticFileUnderstandingReport`,
`IntentAssessmentReport`, and `IntentPlanActionabilityReport` shapes are
unchanged; the integration is additive and schema-light.

## Why this implementation exists

The old codebase-intel system fed per-file understanding into its planning
surface. Rekon now produces `SemanticFileUnderstandingReport`s safely (slices
144–149), but intent assessment and plan actionability still operated mostly
without that semantic context. This slice closes the loop — semantic
understanding can inform intent planning — while preserving Rekon's proof
semantics. The governing rule: **SemanticFileUnderstandingReport is
proposal/context, not proof**, and **semantic context consumption is explicit,
not automatic** — there is no behavior change unless an operator passes a flag.

## Selection model

`selectSemanticFileContext({ reports, requestedPaths, currentFileHashes })` is
pure (no fs, no providers, no clock). The CLI controls the candidate set and
supplies current file hashes:

- `--semantic-context-ref` takes precedence: the named reports ARE the candidate
  set (no path filter). A ref that does not resolve throws, so the command fails
  cleanly.
- `--semantic-context latest` falls back to every stored
  `SemanticFileUnderstandingReport`, path-filtered to the request's paths
  (`scope.paths` for assess, `--path` for plan review).
- When several usable reports share a path, the latest (newest write) wins.

The helper returns `{ usedReports, staleReports, missingReports, warnings }`,
where `usedReports` carry only deterministic facts (path, sha256, purpose,
responsibilities, public exports, imports, touched concepts, finding counts).

## IntentAssessmentReport consumption

After readiness is already decided, the assess builder enriches
`matchedContext.paths` with used-report paths and appends low-severity
`warnings`: a `scope-ambiguous` warning when a used report carries findings, and
a `stale-context` warning for each stale report. Readiness, `blockers`, and
`missingContext` are computed before this step and are never altered — semantic
context must not approve plans and must not suppress a deterministic blocker.

## IntentPlanActionabilityReport consumption

The plan-review builder appends a "Semantic file context (proposal/context, not
proof)" section to `revisionPrompt.prompt` — purpose, responsibilities, and
public exports for each used report — and appends stale / missing notes to
`normalizationTrace.warnings`. The actionability `status` and `findings` are
decided before this step and are never altered: semantic context never makes a
weak plan actionable and never erases a missing-requirement finding.

## Staleness and relevance model

A report is usable only when its `boundaries` are present and all-false and,
when the current file hash is known, its `file.sha256` matches that hash. A
report whose boundaries are not clean, or whose sha differs from the current
file, is classified stale and surfaced as a warning — **stale semantic reports
must not be consumed silently**. Requested paths with no usable and no stale
report are reported as `missing`.

## CLI surface

| Command | Flags |
| --- | --- |
| `rekon intent assess` | `--semantic-context latest` \| `--semantic-context-ref <ref> ...` |
| `rekon intent plan review` | `--semantic-context latest` \| `--semantic-context-ref <ref> ...` |

No flag → unchanged behavior (the `semanticContext` key is absent from `--json`).
`--semantic-context-ref` accepts the `Type:id` form emitted by
`rekon artifacts latest --type SemanticFileUnderstandingReport --id-only`.

## Boundary model

| Boundary | Result |
| --- | --- |
| Semantic context vs proof | proposal/context |
| Consumption trigger | explicit, not automatic |
| Plan approval | never |
| Proof gates | never satisfied by context |
| Deterministic evidence | never replaced |
| Stale handling | warned, never silent |

The implementation preserves every boundary from the decision:

- SemanticFileUnderstandingReport is proposal/context, not proof.
- semantic context consumption is explicit, not automatic.
- semantic context must not approve plans.
- semantic context must not satisfy proof gates by itself.
- semantic context must not replace deterministic evidence artifacts.
- semantic context must not execute commands.
- semantic context must not write source files.
- semantic context must not create WorkOrder or VerificationPlan.
- semantic context must not run Circe.
- stale semantic reports must not be consumed silently.

## What this does not do

This slice ships context consumption only. embeddings remain deferred to a
separate track (Track B), and intent:go remains deferred. Semantic context does
not create a `PreparedIntentPlan`, `WorkOrder`, `VerificationPlan`,
`VerificationRun`, or `VerificationResult`; it runs no Circe and writes no
source. Relevance filtering (which reports apply to a goal/plan) stays heuristic
in v1: path-related matching plus sha/boundary staleness.

## Tests and verification

- Contract test `tests/contract/semantic-file-understanding-intent-context.test.mjs`
  (23 unit/builder assertions + 5 key-free CLI end-to-end checks): selection
  rules (sha, boundaries, latest-wins, missing), builder enrichment, the
  readiness/status-invariance guarantees, and the CLI flags + `semanticContext`
  output + clean failure on a missing ref.
- Docs test `tests/docs/semantic-file-understanding-intent-context.test.mjs`.
- Full nine-command gate plus a CLI smoke (`semantic file understand` →
  `artifacts latest --id-only` → `intent assess --semantic-context`).

Follow-up: Semantic File Understanding Intent Context Safety Review.

## Semantic File Understanding Intent Context Safety Review

The slice-150 semantic intent-context integration was ground-reviewed and declared safe/stable: `SemanticFileUnderstandingReport` consumption by `rekon intent assess` / `rekon intent plan review` is explicit, proposal/context-only, never weakens readiness/proof gates, and stale reports are never consumed silently. See [Semantic File Understanding Intent Context Safety Review](./semantic-file-understanding-intent-context-safety-review.md).
