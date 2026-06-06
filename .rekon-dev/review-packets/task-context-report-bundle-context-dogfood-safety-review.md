# Review Packet — TaskContextReport Bundle Context Dogfood Safety Review (slice 186)

Reviews: [TaskContextReport Bundle Context Dogfood](../../docs/strategy/task-context-report-bundle-context-dogfood.md) (slice 185, `83185a3`)
Memo: [task-context-report-bundle-context-dogfood-safety-review.md](../../docs/strategy/task-context-report-bundle-context-dogfood-safety-review.md)

## CHANGES MADE

- New safety-review memo `docs/strategy/task-context-report-bundle-context-dogfood-safety-review.md`.
- New review packet (this file).
- New docs test `tests/docs/task-context-report-bundle-context-dogfood-safety-review.test.mjs` (28 assertions).
- Cross-ref Update lines across the TaskContextReport family docs + roadmaps;
  README banner + CHANGELOG entry.
- No source, runtime, CLI, README-rendering, schema, or gate change.

## PUBLIC API CHANGES

None. This is a documentation / safety-review batch. No type, helper, CLI flag,
artifact, manifest field, bundle-README rendering, or Circe schema changed.

## PURPOSE PRESERVATION CHECK

The bundle-context sidecars exist so an agent/operator receiving a bundle can
discover and use the same context that guided planning, without that context
becoming proof, approval, execution, or source-write authority. The dogfood proved
the sidecars work through the full operator path and found + fixed a narrow human
discoverability gap (the bundle README). This review confirms both the dogfood
evidence and the README fix preserve that guarantee — context stays optional and
non-authoritative; README discoverability adds visibility, not authority.

## CODEBASE-INTEL ALIGNMENT

Rekon keeps proof and context distinct: deterministic graph claims and verification
results are proof; task-shaped context is orientation. The dogfood + README fix keep
that separation — `manifest.context` and the `context/` sidecars are marked
`proof: false` / `role: optional-agent-context`, the README section is descriptive
("guidance, not proof"), and none of it touches the proof-bearing Circe handoff or
the WorkOrder / VerificationPlan / phase gates. The review aligns with the
codebase-intelligence model: surface more context to readers without granting it
authority.

## DOGFOOD REVIEWED

Full public operator path keyless against the built CLI (scan → context prepare →
graph build → context task → assess/plan-review `--task-context-ref` → answer →
prepare → status → approve → status transition work-ready → work-order generate →
verification-plan generate → bundle write `--task-context-ref` → validate → git
diff). Completed cleanly; bundle `ok`; `taskContext` reported; validate clean;
working tree clean.

## MANIFEST REVIEW

`manifest.context.taskContextReports[0]` = `{ ref, role: "optional-agent-context",
proof: false, sidecars: { markdown, agentJson } }`. Discoverable; omitted without a
ref; `manifest.circe` free of task context.

## SIDECAR REVIEW

- `context/task-context.md` — "optional guidance, not proof"; Read This Before
  Editing; Do Not Touch "(guidance, not enforced)"; Verification Hints "(hint, not
  executed)"; all-false Boundaries.
- `context/task-context.agent.json` — `agentContext` + `proof: false` + top-level
  all-false `boundaries`.
- `context/task-context.refs.json` — `{ ref, role: "optional-agent-context",
  proof: false }`.

## README DISCOVERABILITY REVIEW

The slice-185 fix renders an additive "## Task context" bundle-README section only
when a TaskContextReport is attached, listing the report refs + the three sidecar
paths and framed "guidance, not proof. It does not approve the plan, satisfy any
gate, execute commands, or write source." With no context the README is
byte-identical. The fix reuses the already-computed sidecar render result and
grants no authority. Covered by `tests/contract/task-context-bundle-context-dogfood.test.mjs`.

## CIRCE HANDOFF REVIEW

`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json` present and
stable; handoff JSON (repo path masked) and `manifest.circe` carry no task-context
reference. Circe handoff JSON unchanged in v1; Rekon did not run Circe.

## GATE REVIEW

`work-order.md` + `verification-plan.md` present and unchanged by task context;
per-phase verification posture unchanged. Source + plan unchanged; no
VerificationRun / VerificationResult.

## BOUNDARY MODEL

Optional context only — no proof, no approval, no WorkOrder/VerificationPlan/phase
gate authority, no command execution, no source write, no Circe, no required
internals; verification hints stay hints; do-not-touch stays guidance; intent:go
deferred. README discoverability is visibility, not authority.

## RECOMMENDATION

Declare TaskContextReport Bundle Context Dogfood safe/stable. Next slice:
TaskContextReport Bundle Context Broader Handoff Decision (define broader handoff
usage of the optional sidecars without granting authority). Alternative: Intent
Bundle Context UX Fix, only if further issues surface.

## TESTS / VERIFICATION

- New docs test `tests/docs/task-context-report-bundle-context-dogfood-safety-review.test.mjs`
  (28 assertions): doc + headings, 20 boundary statements, 4 tables, CHANGELOG, packet.
- Full keyless gate: `npm run typecheck`, `npm test`, `npm run build`,
  `git diff --check`, export/license audits, publish dry-run, both install smokes.
- No CLI smoke (strategy / safety-review batch). The dogfood evidence + README fix
  are covered by the slice-185 contract test.

## INTENTIONALLY UNTOUCHED

Bundle-context implementation, bundle-README rendering, Circe handoff schema,
WorkOrder / VerificationPlan / phase-gate generation, proof / approval semantics,
the intent task-context plumbing, and intent:go (deferred).

## RISKS / FOLLOW-UP

Low risk: review-only, no runtime change. Residual risk is documentation drift,
covered by the boundary docs test. Follow-up is the broader handoff decision.

## NEXT STEP

Recommend **TaskContextReport Bundle Context Broader Handoff Decision** as the next
slice.
