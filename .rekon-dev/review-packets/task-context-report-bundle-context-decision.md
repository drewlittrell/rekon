# Review Packet — TaskContextReport Bundle Context Decision (slice 182)

Base `300c6ee`. Strategy / architecture decision batch. Docs-only — decides whether
/ how optional `TaskContextReport` refs appear in intent bundles / handoffs;
implements nothing. No runtime change, no source change, no Circe schema change, no
CLI smoke.

## CHANGES MADE

- `docs/strategy/task-context-report-bundle-context-decision.md` — NEW memo.
- `.rekon-dev/review-packets/task-context-report-bundle-context-decision.md` — NEW
  (this file).
- `tests/docs/task-context-report-bundle-context-decision.test.mjs` — NEW, 20
  assertions.
- Cross-ref pointers added to the workflow guide safety review, the workflow
  integration decision, the intent dogfood / integration safety reviews, the two
  guides, the task-context artifact / concept docs, the intent-plan-bundle concept
  doc, the two v1 release docs, README, CHANGELOG, and the two roadmaps.
- No source, contract test, or runtime files changed.

## PUBLIC API CHANGES

None. Documentation only. `rekon intent bundle write`, the bundle producer, the
Circe handoff schema, the `TaskContextReport` artifact, and every package export
are unchanged.

## PURPOSE PRESERVATION CHECK

`TaskContextReport` is useful context before planning/editing; an agent receiving a
handoff would benefit from the same context. This decision lets the report
*accompany* a bundle as optional context while preserving the Rekon/Circe boundary:
it must not authorize work, must not satisfy approval or proof gates, must not
become a required WorkOrder / VerificationPlan dependency, and Circe may read it
only as context, never as a requirement.

## CODEBASE-INTEL ALIGNMENT

The conceptual ancestor (`codebase-intel`) produced context bundles and an agent
context output alongside orientation, separate from implementation orchestration.
The decision mirrors that: context travels with the handoff as orientation
(sidecars + manifest refs), not as part of the execution contract (WorkOrders /
VerificationPlans / Circe gates). `mustNot` / do-not-touch stays guidance.

## SOURCE REVIEW

`packages/capability-docs/src/intent-plan-bundle.ts` — confirmed no
`TaskContextReport` reference today (0 hits); `manifest` is a flexible
`Record<string, unknown>` already carrying `manifest.circe`; per-phase
`phaseBoundaries` pin `sourceWriteAllowed:false / commandsExecuted:false /
intentGoDeferred:true`; the Circe projection never claims approval. `intent bundle
write` (CLI) has no `--task-context-ref`. The `task-context-report.ts` builder and
the human/agent export shape the context that would be rendered into sidecars.

## CURRENT BUNDLE SURFACE

Files: `manifest.json`, `README.md`, `verification-plan.md`, `agent/{handoff.md,
context.json, instructions.md, constraints.md, verification.json, source-refs.json}`,
`circe/{handoff.json, phase-plan.json, rekon-proof.json}`. `manifest` keys:
`schemaVersion, bundleKind, intentId, generatedAt, status, sourceArtifacts,
staleness, files, boundaries, circe`. The existing `agent/context.json` is the
agent-handoff context (distinct from task-context).

## OPTIONS CONSIDERED

A no inclusion (rejected/deferred — agents lose context); B optional context refs
(**selected** — useful without proof authority); C required context (rejected —
context is not proof); D embed full agentContext into Circe handoff
(rejected/deferred — schema coupling/bloat); E Rekon-side sidecar context
(**selected** with B — compatible and inspectable).

## BUNDLE CONTEXT MODEL

Optional `manifest.context.taskContextReports[]` refs (each with `role:
"optional-agent-context"`, `proof: false`) + Rekon-side sidecars
`context/task-context.md`, `context/task-context.agent.json`,
`context/task-context.refs.json`. Not required Circe schema fields in v1.

## HANDOFF AND CIRCE BOUNDARY

`circe/handoff.json` / `phase-plan.json` / `rekon-proof.json` stay stable. Circe is
not required to know `TaskContextReport` internals in v1; if it later reads the
optional sidecar, it must not treat it as proof, must not auto-execute hints, and
must not override WorkOrder / VerificationPlan gates.

## CONSUMER MODEL

human operator → markdown sidecar; agent → agent JSON sidecar; Rekon proof review →
context refs; Circe → optional sidecar only (no requirement); WorkOrder /
VerificationPlan → no direct consumption.

## BOUNDARY MODEL

Optional context only, not required, no approval, no WorkOrder / VerificationPlan /
phase-gate authority, no execution, no source writes, Circe not required to know
internals, intent:go deferred. All 12 boundary statements appear verbatim in the
memo's Boundary Model.

## TESTS / VERIFICATION

- New docs test: 20/20.
- Full keyless 9-command gate: `npm test`, `npm run typecheck`, `npm run build`,
  `git diff --check`, audit-package-exports, audit-license, publish-dry-run,
  install-smoke, install-tarball-smoke. No CLI smoke (decision-only).

## INTENTIONALLY UNTOUCHED

`intent bundle write` runtime; the bundle producer; the Circe handoff schema;
WorkOrder / VerificationPlan generation; phase gates; the `TaskContextReport`
artifact / factory / validator / builder.

## RISKS / FOLLOW-UP

- Risk: a context ref read as proof, or a Circe-side coupling sneaking in.
  Mitigation: `proof: false` markers, manifest `boundaries`, and "Circe not required
  to know internals" pinned; the next slice is implementation under these limits.
- Follow-up: TaskContextReport Bundle Context Implementation (next); then a Bundle
  Context Safety Review.

## NEXT STEP

Recommended: **TaskContextReport Bundle Context Implementation**.
