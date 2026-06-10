# TaskContextReport Bundle Handoff Dogfood Safety Review

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

This memo reviews the shipped [TaskContextReport Bundle Handoff
Dogfood](task-context-report-bundle-handoff-dogfood.md) (slice 190, `c5acc07`) end-to-end
and declares the final handoff dogfood result — including the Circe actor-contract surface
and the new Circe Operator Command Boundary added in `11a209fd` — safe and stable before
broader handoff workflow use. It is a review only: it changes no runtime behavior, no
bundle handoff guidance implementation, no bundle context implementation, no Circe
actor-contract generation, no Circe handoff schema, and no gate.

## Decision Summary

TaskContextReport Bundle Handoff Dogfood is safe/stable. The slice-190 dogfood ran the
full public operator path against the bundle producer and proved the promoted
task-context handoff guidance is discoverable and useful from both the human-operator and
the agent perspective, while every boundary held and the `circe/actor-contracts` artifacts
stayed boundary-safe. The Operator Command Boundary added in `11a209fd` reinforces — and
does not weaken — that conclusion. TaskContextReport sidecars are optional context, not
proof.

## Why This Review Exists

Slice 190 dogfooded the full bundle handoff path after `4cc34b73` added target-specific
Circe actor contracts (`circe/actor-contracts/` files referenced from `circe/handoff.json`
and `manifest.circe`). This review was then re-grounded onto `11a209fd`
("feat: add Circe operator boundary to actor contracts"), which appends an Operator
Command Boundary to each actor contract. Because bundle/handoff surfaces sit close to
execution orchestration, this review confirms the dogfood result can be trusted — that the
task-context sidecars, the actor-contract artifacts, and the new operator-command boundary
all remain guidance/context and do not become proof, execution, approval, source-write, or
Circe-run authority — before broader handoff workflow use builds on it.

## Dogfood Reviewed

Reviewed the slice-190 dogfood evidence + the shipped source it exercised (re-grounded in
the tree at `11a209fd`). The full handoff dogfood path completed successfully:
`scan` → `intent context prepare` → `capability graph build` → `context task` →
`intent assess --task-context-ref` → `intent plan review --task-context-ref` →
`intent plan answer` → `intent prepare` → `intent status` → `intent approve` →
`intent status transition --to work-ready` → `intent work-order generate` →
`intent verification-plan generate` → `intent bundle write --task-context-ref` →
`artifacts validate` (`valid: true`). A without-context comparison bundle was written from
the same approved plan to a separate intent id. Reviewed the dogfood memo, the contract
test `tests/contract/task-context-bundle-handoff-dogfood.test.mjs` (37 assertions), the
supporting `task-context-bundle-handoff-guidance` / `task-context-bundle-context` /
`task-context-bundle-context-dogfood` tests, and the `11a209fd`-updated
`intent-plan-bundle.test.mjs` — all green.

## Human Handoff Review

The human-facing surfaces are discoverable and framed as guidance. A human can discover
task context from README.md — the bundle README renders a "## Task context" section listing
the report ref and the three sidecars, framed as "guidance, not proof" that "does not
approve the plan, satisfy any gate, execute commands, or write source". context/task-context.md
was useful for a human operator — it opens "This context is optional guidance, not proof.",
then renders "Read This Before Editing", a "Do Not Touch" list ("(guidance, not enforced)"),
a "Verification Hints" list ("(hint, not executed)"), and an all-false "Boundaries" list. A
human can see that the WorkOrder / VerificationPlan gates remain authoritative, because
`work-order.md` and `verification-plan.md` carry the gate content while the context is
framed as guidance.

## Agent Handoff Review

The agent-facing surfaces are discoverable and non-authoritative. An agent can discover
task context from agent/instructions.md — its "## Task context" section says "Task context
is optional context, not proof.", "Read context/task-context.agent.json before editing.",
and keeps "Verification hints are hints, not executed commands." and "WorkOrder /
VerificationPlan / phase gates remain authoritative." An agent can discover task context
from agent/handoff.md — its "## Task context" section points at
`context/task-context.agent.json` and states "This context is not proof and does not change
the handoff gates." Both sections render only when a TaskContextReport is attached.

## Agent Context Review

agent/context.json taskContext metadata was useful — it carries `available: true` with
`reports[]` (`ref`, `role: "optional-agent-context"`, `proof: false`, the three sidecar
paths) and preserves every existing field (`intentId`, `goal`, `status`, `scope`,
`capabilities`, `steps`, `phases`, `obligations`, `artifactRefs`). context/task-context.agent.json
was useful to an agent — it carries the per-report `agentContext` (task text + paths,
deterministic-graph `coreContext`, do-not-touch `enforced: false`, hints `executed: false`,
evidence) plus an all-false `boundaries` block. The authority-bearing agent files stayed
separate from task context: agent/verification.json remains authoritative for verification
posture (`executesCommands: false`, commands, success criteria, per-phase posture; no
task-context reference) and agent/source-refs.json remains authoritative for source refs
(`generatedAt`, `canonicalTruth`, `sourceArtifacts`; no task-context reference).

## Traceability Review

context/task-context.refs.json was useful for traceability — it carries the
TaskContextReport ref with `role: "optional-agent-context"` and `proof: false`, and
`manifest.context.taskContextReports[]` mirrors that ref/role/proof, giving a human or
agent a clean ref-back path from the bundle to the TaskContextReport without granting it
authority.

## Circe Handoff Review

Circe handoff JSON remains stable and independent of TaskContextReport. The handoff trio
(`circe/handoff.json`, `circe/phase-plan.json`, `circe/rekon-proof.json`) carried no
task-context reference with the repo path masked. The actor-contract change appears in
`circe/handoff.json` as an additive `actorContracts` block (per-actor `path` /
`schemaPath` / `outputContract`) — relative pointers into `circe/actor-contracts/`, free of
any task-context dependency. Circe should not be required to understand TaskContextReport
internals. Rekon did not run Circe.

## Actor Contract Review

The Circe actor-contract artifacts appeared in the bundle from the default `circe` target:
`intent bundle write` (target defaults to `circe`) emits six files under
`circe/actor-contracts/` — `implementer.md`, `reviewer.md`, `planner-verifier.md` and their
JSON Schemas `implementation-handoff.schema.json`, `review-verdict.schema.json`,
`planner-decision.schema.json` — linked from `circe/handoff.json.actorContracts` and
`manifest.circe.actorContracts` (with `manifest.circe.actorContractsDir:
"circe/actor-contracts"`). Circe actor-contract artifacts were present and non-executing.
Actor contracts are guidance/artifacts, not executed workers: each Markdown file is a
completion-handoff contract describing the fields the corresponding Circe actor must
*return* (e.g. the implementer contract lists `status` / `summary` / `changedFiles` and the
rule "Leave changes uncommitted for Circe to inspect"), and each schema is a passive JSON
Schema document. Rekon emits them and runs no Circe, executes no workers, and does not
require Circe for generic bundle generation. They are independent of TaskContextReport and
appear identically in the without-context bundle.

## Operator Command Boundary Review

`11a209fd` appends a `CIRCE_OPERATOR_COMMAND_BOUNDARY` constant — an "## Operator Command
Boundary" section — to each of the three `--target circe` actor contracts (implementer,
reviewer, planner/verifier). The section says: "Do not run Circe cockpit/report/admin
commands from inside the worker phase."; that commands such as `circe handoffs show`,
`circe phase report`, `circe handoffs trace`, `circe admin attention`, `circe workers
status`, and `circe actors pipeline` "are operator inspection commands"; and that "They
belong after or outside actor execution. If a plan asks you to run them as implementation
verification, report that as a plan-quality concern." The Operator Command Boundary is
operator-only inspection guidance, not worker execution guidance. The Operator Command
Boundary reinforces that Rekon does not run Circe — it is passive contract text Rekon emits
into the actor-contract Markdown, never a command Rekon (or the actor contract) executes.
The Operator Command Boundary treats worker requests to run Circe operator commands as
plan-quality concerns, so it strengthens rather than relaxes the non-execution boundary.
The change is additive guidance text appended to the contract Markdown; it adds no command
execution, no gate, no proof, and no Circe run, and it leaves `circe/handoff.json`,
`manifest.circe`, and the `rekon-proof` gate block unchanged.

## Gate Review

WorkOrder / VerificationPlan gates remain authoritative — `work-order.md` and
`verification-plan.md` (plus the `circe/work-orders/` and `circe/verification-plans/`
projections) are produced by the same code paths and never reference the sidecars. Phase
gates remain authoritative — the per-phase posture in the rekon-proof projection is
unaffected by task context, by the actor-contract artifacts, and by the operator-command
boundary. The `circe/rekon-proof.json` gate booleans are `sourceWriteAllowed: false`,
`commandsExecuted: false`, `runsCirce: false`, `intentGoDeferred: true`. Source and plan
files were unchanged. No commands were executed. No VerificationRun or VerificationResult
was created. Rekon did not run Circe. intent:go remains deferred.

## Without-Context Review

The without-context comparison bundle wrote successfully and omitted every task-context
surface: no "## Task context" section in `README.md`, `agent/instructions.md`, or
`agent/handoff.md`; no `taskContext` key in `agent/context.json` (every existing field
preserved); no `manifest.context`; and no `context/` sidecars. It still carried the full
canonical artifact set and the identical `circe/actor-contracts/` set (including the
Operator Command Boundary) with the same rekon-proof gate booleans — confirming the
actor-contract and operator-boundary surfaces are a function of the bundle target, not of
task context.

## Boundary Review

TaskContextReport sidecars are optional context, not proof. Every boundary holds:

- Humans should inspect context/task-context.md when it is present in a bundle.
- Agents should read context/task-context.agent.json when it is present in a bundle.
- Verification hints remain hints, not executed commands.
- Do-not-touch zones remain guidance/context, not enforcement.
- Actor contracts are guidance/artifacts, not executed workers.
- The operator-command boundary is operator-only inspection guidance, not worker execution.
- WorkOrder and VerificationPlan gates remain authoritative.
- Phase gates remain authoritative.
- Circe handoff JSON remains the machine handoff contract.
- TaskContextReport sidecars must not approve plans, execute commands, or write source.
- intent:go remains deferred.

| Surface | Dogfood Finding | Safety Finding |
| --- | --- | --- |
| README.md | task context discoverable | human guidance only |
| context/task-context.md | useful to human operator | guidance, not proof |
| context/task-context.refs.json | useful for traceability | refs, no authority |
| agent/instructions.md | points to task context | agent guidance only |
| agent/handoff.md | points to task context | handoff gates unchanged |
| agent/context.json | taskContext metadata useful | additive metadata |
| context/task-context.agent.json | useful to agent | all-false boundaries |
| circe/actor-contracts | present | non-executing artifacts |
| operator-command boundary | present | operator-only inspection guidance |

| Boundary | Review Finding |
| --- | --- |
| task context vs proof | optional context only |
| actor contracts vs execution | guidance/artifacts only |
| operator Circe commands | operator-only inspection, not worker verification |
| WorkOrder / VerificationPlan gates | authoritative |
| phase gates | authoritative |
| command execution | none |
| source writes | none |
| VerificationRun / Result | none |
| Circe | not run by Rekon |
| intent:go | deferred |

| Actor Contract Surface | Review Finding |
| --- | --- |
| circe/actor-contracts/*.md | return-shape guidance |
| circe/actor-contracts/*.schema.json | JSON Schema artifacts |
| circe/handoff.json.actorContracts | references artifacts |
| manifest.circe.actorContracts | references artifacts |
| Operator Command Boundary | operator-only inspection guidance |
| relationship to TaskContextReport | independent |

| Finding | Severity | Resolution |
| --- | --- | --- |
| handoff dogfood path completed | positive | proceed |
| human sidecars discoverable | positive | proceed |
| agent sidecars discoverable | positive | proceed |
| actor-contracts present | positive | document as non-executing artifacts |
| operator-command boundary present | positive | document as non-execution reinforcement |
| without-context bundle clean | positive | proceed |

## Options Considered

| Option | Decision | Reason |
| --- | --- | --- |
| declare dogfood safe/stable | selected | all handoff surfaces and boundaries held |
| broader workflow decision next | selected | decide how to use sidecars + actor contracts in practice |
| UX fix next | deferred | no issue found |
| make sidecars proof | rejected | context only |
| execute actor contracts | rejected | guidance artifacts only |
| worker-run operator Circe commands | rejected | operator-only inspection boundary |

## Recommendation

TaskContextReport Bundle Handoff Dogfood is safe/stable. The handoff surfaces are
implemented, safety-reviewed, dogfooded, and now dogfood-safety-reviewed; the actor-contract
surface is reviewed as non-executing artifacts; and the new operator-command boundary
reinforces the non-execution semantics. The next slice is **TaskContextReport Bundle
Handoff Broader Workflow Decision** — decide how broader operator/agent handoff workflows
should use the task-context sidecars and actor-contract artifacts (when to expect sidecars,
how agents/humans should prioritize them, how task context and actor contracts relate, how
operator-only commands are represented, how Circe import should treat them, and how to
preserve the proof/gate/command/source boundaries). Fall back to a **TaskContextReport
Bundle Handoff UX Fix** only if a concrete discoverability or wording issue surfaces; this
review found none.

## Review Questions

1. Is TaskContextReport bundle handoff dogfood safe/stable? Yes.
2. Did the full handoff dogfood path complete? Yes.
3. Can a human discover task context from `README.md`? Yes.
4. Was `context/task-context.md` useful for a human operator? Yes.
5. Was `context/task-context.refs.json` useful for traceability? Yes.
6. Can an agent discover task context from `agent/instructions.md`? Yes.
7. Can an agent discover task context from `agent/handoff.md`? Yes.
8. Was `agent/context.json` `taskContext` metadata useful? Yes.
9. Was `context/task-context.agent.json` useful to an agent? Yes.
10. Does `agent/verification.json` remain authoritative for verification posture? Yes.
11. Does `agent/source-refs.json` remain authoritative for source refs? Yes.
12. Does Circe handoff JSON remain stable and independent of TaskContextReport? Yes.
13. How did the Circe actor-contract artifacts appear in the bundle? The default `circe`
    bundle target emits them under `circe/actor-contracts/` and links them from
    `circe/handoff.json` + `manifest.circe`; no task context is involved.
14. Are actor contracts guidance/artifacts rather than executed workers? Yes — return-shape
    contract Markdown + JSON Schema; Rekon emits them and runs no Circe.
15. What does the new Operator Command Boundary say? It tells Circe actors not to run Circe
    cockpit/report/admin commands (e.g. `circe handoffs show`, `circe phase report`,
    `circe admin attention`, `circe workers status`) inside the worker phase — they are
    operator inspection commands, and a plan asking a worker to run them is a plan-quality
    concern.
16. Does the Operator Command Boundary reinforce the non-execution boundary? Yes — it is
    passive guidance that further constrains what an actor should run; Rekon still runs no
    Circe.
17. Does the Operator Command Boundary prevent confusing operator inspection commands with
    worker verification? Yes — it explicitly classifies them as operator-only inspection,
    not worker verification.
18. Do WorkOrder / VerificationPlan gates remain authoritative? Yes.
19. Do phase gates remain authoritative? Yes.
20. Does the without-context bundle remain clean? Yes.
21. Are source and plan files unchanged? Yes.
22. Were any commands executed? No.
23. Was any VerificationRun or VerificationResult created? No.
24. Did Rekon run Circe? No.
25. Does intent:go remain deferred? Yes.
26. Are handoff guidance surfaces safe enough for broader workflow use? Yes — discoverable
    and boundary-safe from both perspectives, and the operator-command boundary reinforces
    the boundaries.
27. What follow-up slice is recommended? TaskContextReport Bundle Handoff Broader Workflow
    Decision.

## What This Does Not Do

This review changes no runtime behavior, no bundle handoff guidance implementation, no
bundle context implementation, no Circe actor-contract generation, no operator-command
boundary generation, no Circe handoff schema, and no gate. It does not make TaskContextReport
required, treat it as proof, approve a plan, satisfy a WorkOrder / VerificationPlan / phase
gate, execute a verification hint or actor contract or operator command or any target-repo
command, write source, create a WorkOrder / VerificationPlan / VerificationRun /
VerificationResult, or run Circe. intent:go remains deferred.

## Follow-Up Work

- **TaskContextReport Bundle Handoff Broader Workflow Decision** (recommended next) — decide
  how broader operator/agent handoff workflows should use the task-context sidecars and the
  actor-contract artifacts (including how operator-only commands are represented), preserving
  the proof/gate/command/source and Circe boundaries.
- **TaskContextReport Bundle Handoff UX Fix** (alternative) — only if a concrete
  discoverability or wording issue surfaces.

> Update (slice 192 · TaskContextReport Bundle Handoff Broader Workflow Decision): decided how broader operator/agent handoff workflows should use the bundle surfaces — **Option B, an explicit reading-order policy** — rebased onto `e91dc087` ("feat: classify phase source-change intent") to include the new per-phase source-change posture. Decision-only; no runtime/API/CLI/bundle/Circe-schema/gate change. Humans inspect `README.md` first, then `context/task-context.md` when present; agents inspect `agent/instructions.md` first, then `agent/handoff.md`, then `agent/context.json`, then `context/task-context.agent.json` when present. Four handoff layers: operator orientation; agent structured handoff; source/verification authority (WorkOrder, VerificationPlan, **phase source-change posture**, `agent/source-refs.json`, `agent/verification.json`); Circe contract layer. TaskContextReport sidecars are optional context, not proof; phase source-change posture belongs to the authoritative source/verification layer, not the task-context layer — it is handoff evidence, not approval, and TaskContextReport sidecars must not override `sourceChange` posture; WorkOrder/VerificationPlan + phase gates + agent verification + source refs remain authoritative; Circe handoff JSON remains the machine handoff contract; actor contracts are role/return-shape guidance, not executed workers; the Operator Command Boundary stays operator-only; verification hints stay hints; do-not-touch stays guidance; intent:go deferred. First implementation: Intent Bundle Handoff Reading Order Implementation. See [`task-context-report-bundle-handoff-broader-workflow-decision.md`](task-context-report-bundle-handoff-broader-workflow-decision.md).

> Update (slice 193 · Intent Bundle Handoff Reading Order Implementation): the intent plan bundle now promotes the handoff reading order directly in its surfaces — a "## Handoff reading order" section in `README.md` (human + agent lists), a "## Reading order" section in `agent/instructions.md` and `agent/handoff.md`, and an additive `handoffReadingOrder` metadata block in `agent/context.json`. Always rendered; task-context entries say "if present". Guidance only — no Circe handoff schema, actor-contract, source-change-classification, or gate change; TaskContextReport stays optional context, WorkOrder / VerificationPlan stay authoritative, source-change posture stays handoff evidence not approval, intent:go stays deferred. See [`intent-bundle-handoff-reading-order-implementation`](intent-bundle-handoff-reading-order-implementation.md).

> Update (slice 194 · Intent Bundle Handoff Reading Order Safety Review): the slice-193 bundle handoff reading order was reviewed end-to-end and declared safe/stable — guidance, not automation. The README / agent-instructions / agent-handoff reading-order sections and the additive `agent/context.json.handoffReadingOrder` metadata (which preserves every existing field) guide humans and agents toward authoritative surfaces while every boundary holds: TaskContextReport sidecars stay optional context (not proof); WorkOrder / VerificationPlan stay authoritative; phase source-change posture stays handoff evidence, not approval; actor contracts stay role/return-shape guidance; the Operator Command Boundary stays operator-only; `circe/*` is byte-unchanged; intent:go deferred. See [`intent-bundle-handoff-reading-order-safety-review`](intent-bundle-handoff-reading-order-safety-review.md).
