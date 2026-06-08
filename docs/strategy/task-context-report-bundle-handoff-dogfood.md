# TaskContextReport Bundle Handoff Dogfood

This memo records a dogfood of the promoted TaskContextReport bundle handoff guidance
(slices 183–189) from both perspectives — a human operator reading a generated intent
bundle, and an agent consuming it — re-run against the current bundle producer after
`4cc34b73` ("feat: emit target-specific Circe actor contracts") changed the Circe
bundle surface. The dogfood ran the full public operator path keyless against the
freshly built CLI and inspected every handoff surface, including the new
`circe/actor-contracts` artifacts. The guidance is discoverable and useful from both
perspectives, the new actor-contract artifacts are present and boundary-safe, every
boundary held, and no fix was needed.

## Why This Dogfood Was Re-Run

The original slice-190 dogfood was prepared against `e4c47e5`. During the slice,
`origin/main` advanced to `4cc34b73`, which changed
`packages/capability-docs/src/intent-plan-bundle.ts`, `packages/cli/src/index.ts`,
`tests/contract/intent-plan-bundle.test.mjs`, and added
`docs/concepts/rekon-circe-handoffs.md`. That commit added target-specific bundle
output: the default `circe` target now emits actor contract Markdown + JSON Schema
files under `circe/actor-contracts/` and links them from `circe/handoff.json` and
`manifest.circe`, while an explicit `generic` target stays Circe-neutral. Because this
slice reviews bundle / handoff output, the evidence was re-run against `4cc34b73` and
the review scope was expanded to cover the actor-contract surface.

## Dogfood Scenario

A fresh `task-context-bundle-handoff-dogfood` fixture (`src/index.ts` with `existing`
+ `greet`, `plans/rough.md`) was driven through `scan` → `intent context prepare` →
`capability graph build` → `context task` → `intent assess --task-context-ref` →
`intent plan review --task-context-ref` → `intent plan answer` → `intent prepare` →
`intent status` → `intent approve` → `intent status transition --to work-ready` →
`intent work-order generate` → `intent verification-plan generate` → `intent bundle
write --task-context-ref` → `artifacts validate`. The path completed cleanly (approve
→ approved, transition → work-ready, work-order + verification-plan generated, bundle
write ok, validate `valid: true`, source + plan SHA-256 unchanged). A without-context
comparison bundle was written from the same approved plan to a separate intent id.
Both bundles default to the `circe` target, so both carry the new
`circe/actor-contracts/` set.

## Human Handoff Review

Reading the bundle as a human operator:

- a human can discover task context from README.md — the bundle README renders a
  "## Task context" section listing the report ref and the three sidecars, framed as
  "guidance, not proof" that "does not approve the plan, satisfy any gate, execute
  commands, or write source".
- context/task-context.md was useful for a human operator — it opened "This context
  is optional guidance, not proof.", then rendered "Read This Before Editing", a "Do
  Not Touch" list ("(guidance, not enforced)"), a "Verification Hints" list ("(hint,
  not executed)"), and an all-false "Boundaries" list.
- context/task-context.refs.json was useful for traceability — it carried the
  TaskContextReport ref with `role: "optional-agent-context"` and `proof: false`.

A human can see that the WorkOrder / VerificationPlan gates remain authoritative: the
context is framed as guidance throughout, while `work-order.md` and
`verification-plan.md` carry the actual gate content.

## Agent Handoff Review

Reading the bundle as an agent:

- an agent can discover task context from agent/instructions.md — the "## Task
  context" section says "Task context is optional context, not proof.", "Read
  context/task-context.agent.json before editing.", and keeps "Verification hints are
  hints, not executed commands." and "WorkOrder / VerificationPlan / phase gates
  remain authoritative."
- an agent can discover task context from agent/handoff.md — the "## Task context"
  section points at `context/task-context.agent.json` and states "This context is not
  proof and does not change the handoff gates."
- agent/context.json taskContext metadata was useful — `taskContext.available: true`
  with `reports[]` carrying `ref`, `role: "optional-agent-context"`, `proof: false`,
  and the three sidecar paths; every existing field (`intentId`, `goal`, `status`,
  `scope`, `capabilities`, `steps`, `phases`, `obligations`, `artifactRefs`) preserved.
- context/task-context.agent.json was useful to an agent — it carried the report's
  `agentContext` (task text + paths, deterministic graph `coreContext`, do-not-touch
  `enforced: false`, hints `executed: false`, evidence) and an all-false `boundaries`
  block.

## Agent Context Review

The agent surfaces that carry authority stayed separate from task context.
agent/verification.json remains authoritative for verification posture — it carries
`executesCommands: false`, the commands, success criteria, and per-phase posture, and
no task-context reference. agent/source-refs.json remains authoritative for source
refs — it carries `generatedAt`, `canonicalTruth`, and `sourceArtifacts`, and no
task-context reference.

## Traceability Review

`context/task-context.refs.json` and `manifest.context.taskContextReports[]` both
carry the report ref with `role: "optional-agent-context"` and `proof: false`,
giving a human or agent a clean traceability path from the bundle back to the
TaskContextReport without granting it authority.

## Circe Handoff Review

Circe handoff JSON remains stable and independent of TaskContextReport. The handoff
trio (`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json`) was
present and, with the repo path masked, carried no task-context reference. The
`4cc34b73` change is visible in `circe/handoff.json` as an additive `actorContracts`
block (per-actor `path` / `schemaPath` / `outputContract`) — relative pointers into
`circe/actor-contracts/`, free of any task-context dependency. The
`circe/rekon-proof.json` gate booleans were `sourceWriteAllowed: false`,
`commandsExecuted: false`, `runsCirce: false`, `intentGoDeferred: true`. Rekon did not
run Circe.

## Actor Contract Review

The new Circe actor-contract artifacts appeared in the bundle from the default `circe`
target: `intent bundle write` (target defaults to `circe`) now emits six files under
`circe/actor-contracts/` — `implementer.md`, `reviewer.md`, `planner-verifier.md` and
their JSON Schemas `implementation-handoff.schema.json`, `review-verdict.schema.json`,
`planner-decision.schema.json` — and links them from `circe/handoff.json.actorContracts`
and `manifest.circe.actorContracts` (with `manifest.circe.actorContractsDir:
"circe/actor-contracts"`). Circe actor-contract artifacts were present and
non-executing: each Markdown file is a completion-handoff contract describing the
fields the corresponding Circe actor must *return* (e.g. the implementer contract lists
`status` / `summary` / `changedFiles` and the rule "Leave changes uncommitted for
Circe to inspect"), and each schema is a passive JSON Schema document. They are
artifacts / guidance, not executed workers — Rekon emits them and does not run Circe,
execute workers, or require Circe for generic bundle generation. They are independent
of TaskContextReport and appear identically in the without-context bundle.

## Gate Review

WorkOrder / VerificationPlan gates remain authoritative — `work-order.md` and
`verification-plan.md` (plus the `circe/work-orders/` and `circe/verification-plans/`
projections) were present and free of task-context references. phase gates remain
authoritative — the per-phase posture in the rekon-proof projection was unaffected by
task context and by the actor-contract change. source and plan files were unchanged.
no commands were executed. no VerificationRun or VerificationResult was created (the
artifact store held only proposal/context/handoff artifacts). intent:go remains
deferred.

## Without-Context Review

The without-context comparison bundle wrote successfully and omitted every task-context
surface: no "## Task context" section in `README.md`, `agent/instructions.md`, or
`agent/handoff.md`; no `taskContext` key in `agent/context.json` (every existing field
preserved); no `manifest.context`; and no `context/` sidecars. It still carried the
full canonical artifact set and the identical `circe/actor-contracts/` set with the
same rekon-proof gate booleans — confirming the actor-contract surface is a function of
the bundle target, not of task context.

## Review Questions

1. Can a human discover task context from `README.md`? Yes.
2. Is `context/task-context.md` useful for a human operator? Yes.
3. Is `context/task-context.refs.json` useful for traceability? Yes.
4. Can an agent discover task context from `agent/instructions.md`? Yes.
5. Can an agent discover task context from `agent/handoff.md`? Yes.
6. Is `agent/context.json` `taskContext` metadata useful? Yes.
7. Is `context/task-context.agent.json` useful to an agent? Yes.
8. Does `agent/verification.json` remain authoritative for verification posture? Yes.
9. Does `agent/source-refs.json` remain authoritative for source refs? Yes.
10. Does Circe handoff JSON remain stable and independent of TaskContextReport? Yes.
11. How did the new Circe actor-contract artifacts appear in the bundle? The default
    `circe` bundle target emits them under `circe/actor-contracts/` and links them
    from `circe/handoff.json` + `manifest.circe`; no task context is involved.
12. Are actor contracts guidance/artifacts rather than executed workers? Yes — they are
    return-shape contract Markdown + JSON Schema; Rekon emits them and runs no Circe.
13. Do WorkOrder / VerificationPlan gates remain authoritative? Yes.
14. Do phase gates remain authoritative? Yes.
15. Does the without-context bundle remain clean? Yes.
16. Are source and plan files unchanged? Yes.
17. Are any commands executed? No.
18. Is any VerificationRun / VerificationResult created? No.
19. Does Rekon run Circe? No.
20. Does intent:go remain deferred? Yes.
21. Are handoff guidance surfaces useful enough for broader workflow use? Yes — the
    guidance is discoverable and useful from both the human and agent perspectives, and
    the actor-contract change did not disturb it.
22. What follow-up slice is recommended? TaskContextReport Bundle Handoff Dogfood
    Safety Review.

## Findings

- a human can discover task context from README.md.
- context/task-context.md was useful for a human operator.
- context/task-context.refs.json was useful for traceability.
- an agent can discover task context from agent/instructions.md.
- an agent can discover task context from agent/handoff.md.
- agent/context.json taskContext metadata was useful.
- context/task-context.agent.json was useful to an agent.
- agent/verification.json remains authoritative for verification posture.
- agent/source-refs.json remains authoritative for source refs.
- Circe handoff JSON remains stable and independent of TaskContextReport.
- Circe actor-contract artifacts were present and non-executing.
- WorkOrder / VerificationPlan gates remain authoritative.
- phase gates remain authoritative.
- source and plan files were unchanged.
- no commands were executed.
- no VerificationRun or VerificationResult was created.
- Rekon did not run Circe.
- intent:go remains deferred.

## Recommendation

The promoted handoff guidance is discoverable and useful from both the human and
agent perspectives, and it holds every boundary on the `4cc34b73`-derived producer.
The new `circe/actor-contracts` artifacts are present, boundary-safe (artifacts /
guidance, not executed workers), and independent of TaskContextReport. No fix was
needed — this batch added only the re-run dogfood evidence + tests + docs. Recommended
next slice: **TaskContextReport Bundle Handoff Dogfood Safety Review** (review the
final handoff dogfood result, including the actor-contract surface, before broader
handoff workflow use). Alternative: **TaskContextReport Bundle Handoff UX Fix**, only
if a discoverability/clarity issue surfaces.

## What This Does Not Do

This dogfood changed no bundle architecture, no Circe handoff schema, no actor-contract
generation, no WorkOrder / VerificationPlan or phase gate, and no proof/approval
semantics. It executed no target-repo commands, wrote no source, created no WorkOrder /
VerificationPlan / VerificationRun / VerificationResult from task context, and did not
run Circe or bring intent:go forward.

> Update (slice 191 · TaskContextReport Bundle Handoff Dogfood Safety Review): the shipped slice-190 handoff dogfood (`c5acc07`) — including the `circe/actor-contracts` surface and the new Circe Operator Command Boundary added in `11a209fd` — was reviewed end-to-end and declared **safe/stable** before broader handoff workflow use. Strategy/safety-review batch; no runtime/API/CLI/agent-file-rendering/actor-contract-generation/operator-boundary-generation/Circe-schema/gate change. TaskContextReport sidecars are optional context, not proof; the full handoff dogfood path completed successfully; the human + agent task-context surfaces stay discoverable and non-authoritative; `agent/verification.json` + `agent/source-refs.json` stay authoritative; the Circe handoff JSON stays stable and independent of TaskContextReport; Circe actor-contract artifacts were present and non-executing (guidance/artifacts, not executed workers); the new Operator Command Boundary is operator-only inspection guidance, not worker execution guidance — it reinforces that Rekon does not run Circe and treats worker requests to run Circe operator commands as plan-quality concerns; WorkOrder / VerificationPlan + phase gates remain authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle stayed clean. Next: TaskContextReport Bundle Handoff Broader Workflow Decision (alternative: Handoff UX Fix). See [`task-context-report-bundle-handoff-dogfood-safety-review.md`](task-context-report-bundle-handoff-dogfood-safety-review.md).
