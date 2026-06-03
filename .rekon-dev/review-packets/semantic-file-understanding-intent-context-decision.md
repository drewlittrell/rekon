# Review Packet — Semantic File Understanding Intent Context Decision (slice 149)

Base: `751757a`. Strategy/architecture decision-only batch. Decides how
`IntentAssessmentReport` and `IntentPlanActionabilityReport` may consume
`SemanticFileUnderstandingReport` as proposal/context. No runtime behavior changes.

## CHANGES MADE

- New memo `docs/strategy/semantic-file-understanding-intent-context-decision.md`.
- New docs test `tests/docs/semantic-file-understanding-intent-context-decision.test.mjs`.
- Cross-reference appends to 12 scope docs + `docs/releases/*` + README + CHANGELOG.
- No `.ts` source changes, no consumption implemented, no package-lock change.

## PUBLIC API CHANGES

None. Documentation and a docs test only. (The proposed CLI/builder surface is a
decision, not an implementation.)

## PURPOSE PRESERVATION CHECK

- Original problem: semantic file reports restore old codebase-intel file
  understanding; scan can now produce them safely; but intent assessment / plan
  actionability still operate mostly without that semantic context; Rekon needs a
  decision for how semantic understanding flows into intent planning without
  weakening proof semantics.
- Preserved guarantee: semantic file reports may improve context, suggestions, and
  grounding; they remain proposal/context; deterministic evidence stays
  authoritative; semantic context never approves, executes, writes source, or
  becomes proof by itself.

## CODEBASE-INTEL ALIGNMENT

The old codebase-intel system fed per-file understanding into its planning surface.
Rekon mirrors the value (semantic context informs intent assessment + plan review)
but under stricter boundaries: explicit opt-in, proposal-not-proof, deterministic
imports/exports authoritative, and a staleness model so an LLM summary can never
silently mark a plan ready or satisfy a proof gate.

## CURRENT SEMANTIC FILE SURFACE

Grounded at `751757a`. `SemanticFileUnderstandingReport`: `status.value`,
`file.{path,sha256,language?,lineCount,byteLength}`, `normalizationTrace`,
`summary.{purpose,responsibilities,publicExports,imports,touchedConcepts}`,
`capabilitySignals`, `findings`, eight all-false `boundaries`.

## OPTIONS CONSIDERED

A no-consumption (rejected/deferred); **B explicit consumption (selected)**; C
automatic latest (rejected/deferred); D reports-as-proof (rejected); E
wait-for-embeddings (rejected/deferred).

## INTENT ASSESSMENT CONSUMPTION

May enrich `matchedContext`, add `warnings` from semantic findings, improve the
recommended next action (inside `readiness`). Must not satisfy proof gates,
approve, suppress deterministic `blockers`, or replace StepCapabilityGraph /
RuntimeGraphDriftReport / HandoffCoverageReport. Stale/mismatched reports map onto
the existing `stale-context` readiness/blocker concept.

## PLAN ACTIONABILITY CONSUMPTION

May link plan requirements to files, surface `responsibilities`/`publicExports`,
improve `revisionPrompt`, suggest touched paths on report match, flag plan/file
mismatch as a `finding`. Must not invent touched paths, make a weak plan actionable
by itself, erase missing-requirement `findings`, or approve/prepare plans.

## STALENESS / RELEVANCE MODEL

Usable only if `file.sha256` matches current hash (when available), `boundaries`
prove no execution/source-writes/embeddings, and `normalizationTrace`
provider/model is acceptable. Stale → ignore/warn, never silent. Multiple reports →
prefer newest matching path + sha256; no sha match → stale-context warning.

## CLI SURFACE

`rekon intent assess --semantic-context latest | --semantic-context-ref <ref>`;
`rekon intent plan review --semantic-context latest | --semantic-context-ref <ref>`.
`latest` = latest-by-path (path-filtered). Defer `--semantic-context-ref` if needed.
No flag → unchanged behavior (explicit, not automatic).

## BOUNDARY MODEL

Proposal/context, not proof; explicit not automatic; no approval; does not replace
deterministic evidence; no command execution; no source writes; no WorkOrder /
VerificationPlan / VerificationRun / VerificationResult; no Circe; stale reports not
consumed silently; embeddings deferred; intent:go deferred.

## TESTS / VERIFICATION

- New docs test (20 assertions): headings, 12 boundary statements, 4 tables,
  CHANGELOG mention, packet PURPOSE PRESERVATION CHECK.
- Full 9-command gate (typecheck, test, build, diff-check, exports, license,
  publish, install, tarball). No CLI smoke (decision-only batch).

## INTENTIONALLY UNTOUCHED

All `.ts` source; `IntentAssessmentReport` / `IntentPlanActionabilityReport`
runtime behavior; the scan integration; deterministic evidence artifacts;
WorkOrder / VerificationPlan gates; npm publish; package versions.

## RISKS / FOLLOW-UP

- **Field-shape note (recorded per WO "if actual fields differ"):**
  `IntentAssessmentReport` has **no top-level `recommendedNextAction`** — the next
  action lives inside the `readiness` block; it also has top-level `blockers` and
  `warnings`, and already models `stale-context` (readiness status + blocker
  category). `IntentPlanActionabilityReport` exposes `sourcePlan.sha256`,
  `evidenceGates`, a `normalizationTrace`, `summary`, `boundaries`, and
  `answerTrace?` in addition to the listed fields. The implementation must target
  these actual shapes.
- Latest-by-path lookup reads prior reports — O(reports) on large histories.
- Relevance filtering (which reports apply to a goal/plan) is heuristic in v1.
- Follow-up: Semantic File Understanding Intent Context Implementation (or the
  embeddings track).

## NEXT STEP

Recommended: **Semantic File Understanding Intent Context Implementation**.
