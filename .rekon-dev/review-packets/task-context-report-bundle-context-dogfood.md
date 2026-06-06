# Review Packet — TaskContextReport Bundle Context Dogfood (slice 185)

Dogfoods: [TaskContextReport Bundle Context Implementation](../../docs/strategy/task-context-report-bundle-context-implementation.md) (slice 183) + [Safety Review](../../docs/strategy/task-context-report-bundle-context-safety-review.md) (slice 184)
Memo: [task-context-report-bundle-context-dogfood.md](../../docs/strategy/task-context-report-bundle-context-dogfood.md)

## CHANGES MADE

- New dogfood memo `docs/strategy/task-context-report-bundle-context-dogfood.md`.
- New contract test `tests/contract/task-context-bundle-context-dogfood.test.mjs`
  (33 assertions — full operator path with task context + without-context case +
  the README discoverability fix).
- New docs test `tests/docs/task-context-bundle-context-dogfood.test.mjs` (17
  assertions).
- Narrow bundle-README discoverability fix in
  `packages/capability-docs/src/intent-plan-bundle.ts` (a "## Task context"
  section rendered only when a TaskContextReport is attached).
- Cross-refs across the TaskContextReport family docs + roadmaps; README banner +
  CHANGELOG entry.

## PUBLIC API CHANGES

- Bundle `README.md` gains an additive "## Task context" section **only when a
  TaskContextReport is attached**. It lists the report refs + the three `context/`
  sidecar paths and is descriptive only ("guidance, not proof. It does not approve
  the plan, satisfy any gate, execute commands, or write source."). With no task
  context the README is byte-identical to before. No other surface changed: no new
  flag, type, artifact, manifest field, or Circe schema change.

## PURPOSE PRESERVATION CHECK

The sidecars exist so that an agent/operator receiving a bundle can discover and
use the same context that guided planning, without that context becoming proof,
approval, execution, or source-write authority. The dogfood confirms the sidecars
are useful and discoverable and that every boundary holds. The only change made —
a guarded bundle-README section — improves human discoverability while remaining
descriptive; it grants no authority. Context stays context, not proof.

## SOURCE REVIEW

Re-read `intent-plan-bundle.ts` (`renderTaskContextSidecars`,
`projectTaskContextAgent`, `TASK_CONTEXT_BOUNDARIES`, the guarded `manifest.context`
/ `bundleFiles` wiring, and the README renderer) and `index.ts`
(`--task-context-ref` resolution, lineage, `taskContext` JSON). The README fix
reuses the already-computed `taskContext` render result and its `refStrings`; it is
a no-op when `taskContext` is undefined.

## DOGFOOD SCENARIO

Fresh `task-context-bundle-dogfood` fixture driven through the full public operator
path (scan → context prepare → graph build → context task → assess/plan-review
`--task-context-ref` → answer → prepare → status → approve → status transition
work-ready → work-order generate → verification-plan generate → bundle write
`--task-context-ref` → validate → git diff), keyless against the built CLI.

## BUNDLE RESULT

All 16 expected files present. bundle write `ok: true`; `taskContext` =
`{ included: true, count: 1, refs: […], sidecars: […], proof: false }`; validate
clean; working tree clean.

## MANIFEST REVIEW

`manifest.context.taskContextReports[0]` = `{ ref, role: "optional-agent-context",
proof: false, sidecars: { markdown, agentJson } }`. Discoverable; `manifest.circe`
free of task context.

## SIDECAR REVIEW

- `context/task-context.md` — "optional guidance, not proof"; Read This Before
  Editing; Do Not Touch "(guidance, not enforced)"; Verification Hints "(hint, not
  executed)"; all-false Boundaries.
- `context/task-context.agent.json` — `agentContext` + `proof: false` + top-level
  all-false `boundaries`.
- `context/task-context.refs.json` — `{ ref, role: "optional-agent-context",
  proof: false }`.

## CIRCE HANDOFF REVIEW

`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json` present and
stable; handoff JSON (repo path masked) and `manifest.circe` carry no task-context
reference. Circe handoff JSON unchanged in v1; Rekon did not run Circe.

## GATE REVIEW

`work-order.md` + `verification-plan.md` present and unchanged by task context;
per-phase verification posture unchanged. Gates hold.

## BOUNDARY MODEL

Optional context only — no proof, no approval, no WorkOrder/VerificationPlan/phase
gate authority, no command execution, no source write, no Circe, no required
internals; verification hints stay hints; do-not-touch stays guidance; intent:go
deferred. Source + plan unchanged; no VerificationRun / VerificationResult / Circe
/ intent:go.

## TESTS / VERIFICATION

- `tests/contract/task-context-bundle-context-dogfood.test.mjs` (33 assertions).
- `tests/docs/task-context-bundle-context-dogfood.test.mjs` (17 assertions).
- Full keyless gate: `npm run typecheck`, `npm test`, `npm run build`,
  `git diff --check`, export/license audits, publish dry-run, both install smokes.
- CLI dogfood replay on a temp fixture (this batch's primary evidence).

## INTENTIONALLY UNTOUCHED

Bundle architecture, Circe handoff schema, WorkOrder / VerificationPlan / phase-gate
generation, proof / approval semantics, `agent/context.json`, the intent
task-context plumbing, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: the only behavior change is the guarded, additive bundle-README section,
covered by tests. Follow-up is a dogfood safety review before broader handoff use.

## NEXT STEP

Recommend **TaskContextReport Bundle Context Dogfood Safety Review** as the next
slice.
