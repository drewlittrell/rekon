# TaskContextReport

> **Broader-workflow role decided (slice 176):** TaskContextReport is the standard
> pre-intent / pre-work context substrate — context only, never proof/approval;
> consumption stays explicit; the deterministic spine stays separately gated;
> intent:go deferred. See
> [TaskContextReport Broader Workflow Decision](../strategy/task-context-report-broader-workflow-decision.md).

> **Provider-default UX fixed (slice 175):** `rekon context task` with an existing
> embeddings index, no `--path`, and an implicitly-defaulted provider whose key is
> missing now degrades to a graph + lexical context fallback instead of exiting
> non-zero; explicit-provider failures stay strict; task context stays
> proposal/context, not proof; intent:go deferred. See
> [Intent Planning UX / Context Quality Fix](../strategy/intent-planning-ux-context-quality-fix.md).

> **Intent integration safety-reviewed (slice 172):** the slice-171 opt-in consumption
> by `rekon intent assess` / `rekon intent plan review` was reviewed end-to-end and
> declared safe/stable — additive context only (never proof/approval), prepare by
> lineage; intent:go deferred. See
> [TaskContextReport Intent Integration Safety Review](../strategy/task-context-report-intent-integration-safety-review.md).

> **Intent integration implemented (slice 171):** `rekon intent assess` and `rekon
> intent plan review` now accept opt-in `--task-context latest|<ref>` — additive
> context only (readiness / status decided first; never proof, never approval). See
> [TaskContextReport Intent Integration Implementation](../strategy/task-context-report-intent-integration-implementation.md).

> **Intent integration decided (slice 170):** TaskContextReport will be explicit,
> opt-in context for `rekon intent assess` and `rekon intent plan review` (prepare by
> lineage only); context, not proof. See
> [TaskContextReport Intent Integration Decision](../strategy/task-context-report-intent-integration-decision.md).

> **Selection quality fixed (slice 169):** free-form verification intent now creates
> a `manual-verification` hint (no command invented); weak-band retrieval is gated
> to labelled supporting context with `retrieval-low-signal` kept visible. See
> [TaskContextReport Selection Quality Fix](../strategy/task-context-report-selection-quality-fix.md).

> **Dogfooded (slice 168):** dogfooded on explicit-path and retrieval scenarios —
> the explicit-path + graph baseline is useful and reliable; the lexical mock
> retrieval path is low-signal (a real embedding provider is needed). Context, not
> proof. See
> [TaskContextReport Dogfood Review](../strategy/task-context-report-dogfood-review.md).

> **Safety-reviewed (slice 167):** found safe/stable as proposal/context. See
> [TaskContextReport Safety Review](../strategy/task-context-report-safety-review.md).

> **Slice 166 · product capability batch.** Base `3721523`. The first product
> consumer of embedding retrieval — task-shaped context — shipped as the
> `TaskContextReport` artifact and the `rekon context task` command, selected by
> the [Task-Shaped Context / Embedding Retrieval Decision](../strategy/task-shaped-context-embedding-retrieval-decision.md).

`TaskContextReport` is a canonical, structured-JSON artifact that turns a concrete
task into a compact, explainable **context bundle**: deterministic graph facts,
embedding-retrieval neighbors, do-not-touch zones, and verification hints, each
with preserved evidence refs. The human/markdown view is a rendering of this
artifact.

**Task-shaped context is proposal/context, not proof.**

## Producer

- Builder: `buildTaskContextReport` (`@rekon/capability-model`) — a pure helper.
- CLI: `rekon context task --task <text> [--path <path>] [--provider voyage|mock]
  [--model <m>] [--top-k <n>] [--root <path>] [--json]`.
- Category: `actions`. Schema version: `0.1.0`.

## Shape

```ts
type TaskContextReport = {
  header: ArtifactHeader;          // artifactType "TaskContextReport"
  schemaVersion: "0.1.0";
  task: { text: string; paths: string[]; goal?: string };
  selection: {
    query: string;
    provider?: string;
    model?: string;
    topK: number;
    scoreBands: { strong: number; useful: number; weak: number; ignored: number };
  };
  contextItems: Array<{
    id: string;
    kind: "file" | "symbol" | "capability" | "semantic_summary"
        | "verification_hint" | "do_not_touch" | "risk";
    path?: string;
    symbolId?: string;
    capabilityId?: string;
    reason: string;                // every item carries a reason
    score?: number;
    scoreBand?: "strong" | "useful" | "weak" | "ignored";
    evidenceRefs: string[];        // preserved
    source: "deterministic_graph" | "semantic_file_understanding"
          | "embedding_retrieval" | "operator_input";
  }>;
  graphNeighborhood: { nodes: Array<{ kind: string; id: string }>; claims: string[] };
  doNotTouch: Array<{ reason: string; path?: string; symbolId?: string; evidenceRefs: string[] }>;
  verificationHints: Array<{ command?: string; artifact?: string; reason: string; evidenceRefs: string[] }>;
  summary: {
    contextItems: number; graphNodes: number; graphClaims: number;
    doNotTouch: number; verificationHints: number; embeddingNeighbors: number;
  };
  boundaries: {
    retrievalIsProof: false; approvedPlans: false; executedCommands: false;
    wroteSourceFiles: false; createdPreparedIntentPlan: false; createdWorkOrder: false;
    createdVerificationPlan: false; ranCirce: false; implementedIntentGo: false;
  };
};
```

## Rules

- The factory (`createTaskContextReport`) forces every `boundaries` field to
  `false` and recomputes `summary`.
- The validator (`validateTaskContextReport`) rejects any non-false boundary,
  empty task text, a context item missing a reason, and a mismatched summary.
- `evidenceRefs` reference graph evidence/claim ids and retrieval chunk ids.

## Selection

1. Operator-provided paths are high-priority context.
2. Strong and useful embedding neighbors are included; weak neighbors are
   optional/supporting; ignored neighbors are excluded by default.
3. Selected paths are expanded through `CapabilityEvidenceGraph`; deterministic
   facts are admitted even when the embedding score is lower.

## Boundaries

- **Task-shaped context is proposal/context, not proof.**
- **Embedding retrieval is proposal/context, not proof.**
- **CapabilityEvidenceGraph remains the evidence substrate.**
- **Deterministic graph facts outrank embedding similarity.**
- **Task context must not approve plans.**
- **Task context must not execute commands.**
- **Task context must not write source files.**
- **Task context must not create WorkOrder or VerificationPlan.**
- **Task context must not run Circe.**
- **Task context must preserve evidence refs.**
- **Verification hints are hints, not executed commands.**
- **Duplicate detection remains deferred.**
- **Canonical recommendations remain deferred.**
- **intent:go remains deferred.**

## See also

- Concept: [Task-Shaped Context](../concepts/task-shaped-context.md)
- Strategy: [TaskContextReport v1](../strategy/task-context-report-v1.md)
- Decision: [Task-Shaped Context / Embedding Retrieval Decision](../strategy/task-shaped-context-embedding-retrieval-decision.md)

> Update (slice 177 · TaskContextReport Human/Agent Context Export): `rekon context task` now prints a human "read this before editing" brief (Core Context, Related / Supporting Context, Do Not Touch, Verification Hints, Evidence) and adds an additive `agentContext` block to its `--json` payload. Presentation only — the TaskContextReport artifact stays canonical, human markdown is a rendered view, agent JSON is the structured source of truth; every existing JSON field preserved; verification hints stay hints, do-not-touch stays guidance, evidence preserved; no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export.md`](../strategy/task-context-human-agent-export.md).

> Update (slice 178 · TaskContextReport Human/Agent Export Safety Review): the slice-177 `rekon context task` human/agent export was reviewed end-to-end and declared safe/stable — presentation only. The TaskContextReport artifact is canonical, human markdown is a rendered view, agent JSON (`agentContext`) is the structured source of truth and is additive (every existing top-level JSON field preserved); verification hints stay hints (`executed:false`), do-not-touch zones stay guidance (`enforced:false`), evidence refs are preserved, boundaries stay all-false; no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export-safety-review.md`](../strategy/task-context-human-agent-export-safety-review.md).

> Update (slice 179 · TaskContextReport Workflow Integration Decision): the standard Rekon workflow is now context first, plan second, approval third, handoff fourth (Option B). `TaskContextReport` is the standard pre-work context substrate, not a proof artifact — recommended (not required, not automatic) before human/agent implementation and before `intent assess` / `intent plan review`; humans read the markdown brief, agents consume `agentContext`. Consumption stays explicit; `intent prepare` stays lineage-only; prepare / approve / status / handoff stay separately gated; bundle inclusion is optional context only (deferred); no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. First implementation: TaskContextReport Workflow Guide / Agent Instructions. See [`task-context-report-workflow-integration-decision.md`](../strategy/task-context-report-workflow-integration-decision.md).

> Update (slice 180 · TaskContextReport Workflow Guide / Agent Instructions): the context-first workflow is now documented for humans and agents. The canonical pre-work sequence is `rekon scan` → `rekon capability graph build` → `rekon context task` → `rekon artifacts latest --type TaskContextReport --id-only` → `rekon intent assess` / `rekon intent plan review --task-context-ref`. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; TaskContextReport stays context, not proof — no approval / execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; intent:go deferred. See [`task-context-workflow.md`](../guides/task-context-workflow.md).

> Update (slice 181 · TaskContextReport Workflow Guide Safety Review): the slice-180 workflow guide + agent instructions were reviewed end-to-end and declared safe/stable — docs/product surface only, guidance not automation. Humans read the TaskContextReport markdown before editing; agents consume `agentContext` before editing; every documented command was confirmed against the live CLI. TaskContextReport stays context, not proof — no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; hints stay hints; do-not-touch stays guidance; consumption stays explicit; prepare / approve / status / handoff stay separately gated; bundle inclusion optional context only; intent:go deferred; the workflow guide introduces no runtime behavior changes. See [`task-context-workflow-guide-safety-review.md`](../strategy/task-context-workflow-guide-safety-review.md).

> Update (slice 182 · TaskContextReport Bundle Context Decision): intent bundles may carry optional `TaskContextReport` refs as context for agents/operators (Option B + E) — an additive `manifest.context.taskContextReports[]` section plus Rekon-side `context/` sidecars, with the Circe handoff schema unchanged in v1. Inclusion is optional, never required; context stays context, not proof — it must not approve plans, satisfy WorkOrder/VerificationPlan gates, change phase gates, execute commands, write source, or run Circe; hints stay hints; do-not-touch stays guidance; Circe is not required to know TaskContextReport internals in v1; intent:go deferred. First implementation: TaskContextReport Bundle Context Implementation. See [`task-context-report-bundle-context-decision.md`](../strategy/task-context-report-bundle-context-decision.md).

> Update (slice 183 · TaskContextReport Bundle Context Implementation): `rekon intent bundle write` now attaches optional `TaskContextReport` refs via a repeatable `--task-context-ref` (plus bounded lineage discovery from prepared-plan / assessment `inputRefs`) as an additive `manifest.context.taskContextReports[]` section (`role: optional-agent-context`, `proof: false`) plus three Rekon-side `context/` sidecars (`task-context.md` / `task-context.agent.json` / `task-context.refs.json`). With no ref the bundle is byte-identical; a missing / wrong-type ref fails cleanly. The Circe handoff projection (`circe/handoff.json` etc.) and the WorkOrder / VerificationPlan / phase-gate files are unchanged and never carry task context. TaskContextReport may be included in bundles only as optional context, not proof — it must not be required to write an intent bundle, approve plans, satisfy WorkOrder/VerificationPlan or phase gates, execute commands, write source, or run Circe; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON is unchanged in v1; intent:go remains deferred. Implements the slice-182 decision (Option B + E). See [`task-context-report-bundle-context-implementation.md`](../strategy/task-context-report-bundle-context-implementation.md).

> Update (slice 184 · TaskContextReport Bundle Context Safety Review): the slice-183 bundle-context implementation was reviewed end-to-end and declared safe/stable — optional `TaskContextReport` context in intent bundles holds every boundary. TaskContextReport may be included in bundles only as optional context, not proof, and is not required to write an intent bundle: a bundle with no ref is byte-identical; a bundle with a ref adds only `manifest.context.taskContextReports[]` (`proof: false`, `role: optional-agent-context`) and the `context/` sidecars (`task-context.md` optional guidance not proof, `task-context.agent.json` all-false boundaries, `task-context.refs.json` refs + `proof:false`). The Circe handoff JSON is unchanged in v1; WorkOrder / VerificationPlan / phase gates unchanged; missing + wrong-type refs fail cleanly; lineage discovery stays bounded and optional. No approval / command execution / source write / WorkOrder / VerificationPlan / Circe; verification hints stay hints; do-not-touch stays guidance; intent:go remains deferred. Recommended next: TaskContextReport Bundle Context Dogfood. See [`task-context-report-bundle-context-safety-review.md`](../strategy/task-context-report-bundle-context-safety-review.md).

> Update (slice 185 · TaskContextReport Bundle Context Dogfood): the optional bundle-context sidecars were dogfooded on a realistic operator/agent handoff path (full intent path → `intent bundle write --task-context-ref` → validate). bundle write succeeded; `manifest.context.taskContextReports` (`proof:false`, `role: optional-agent-context`) was discoverable; the `context/task-context.md` human brief, `context/task-context.agent.json` agent view, and `context/task-context.refs.json` traceability index were all useful; bundle JSON reported the `taskContext` sidecars; the Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. One narrow human-discoverability gap was fixed: the bundle `README.md` now renders an additive "## Task context" section (guidance, not proof) only when a TaskContextReport is attached. Sidecars are ready for broader handoff use. Next: TaskContextReport Bundle Context Dogfood Safety Review. See [`task-context-report-bundle-context-dogfood.md`](../strategy/task-context-report-bundle-context-dogfood.md).

> Update (slice 186 · TaskContextReport Bundle Context Dogfood Safety Review): the slice-185 dogfood result + the narrow bundle-README discoverability fix were reviewed end-to-end and declared safe/stable. TaskContextReport bundle context is optional context, not proof; the full bundle-context dogfood path completed successfully; `manifest.context.taskContextReports` was discoverable (`proof:false`, `role: optional-agent-context`); the `context/task-context.md` / `.agent.json` / `.refs.json` sidecars were useful to humans, agents, and traceability; the bundle README now points to the sidecars (guidance, not proof) when context is attached and is omitted otherwise; Circe handoff JSON remains unchanged / not dependent on task context; WorkOrder / VerificationPlan + phase gates unchanged; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred. Bundle context is ready for broader handoff use. Next: TaskContextReport Bundle Context Broader Handoff Decision. See [`task-context-report-bundle-context-dogfood-safety-review.md`](../strategy/task-context-report-bundle-context-dogfood-safety-review.md).

> Update (slice 187 · TaskContextReport Bundle Broader Handoff Decision): decided how broader operator/agent handoff workflows should use the optional bundle-context sidecars (Option B — promote them in human/agent handoff guidance, recommended not required). Humans should inspect `context/task-context.md` when present; agents should read `context/task-context.agent.json` when present; the follow-up will point `agent/instructions.md` + `agent/handoff.md` (and optionally `agent/context.json` metadata) at the sidecars. TaskContextReport sidecars are optional context, not proof — must not be required to write an intent bundle, approve plans, execute commands, write source, or satisfy WorkOrder/VerificationPlan or phase gates; verification hints remain hints; do-not-touch zones remain guidance; Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; intent:go remains deferred. First implementation: TaskContextReport Bundle Handoff Guidance Implementation. See [`task-context-report-bundle-broader-handoff-decision.md`](../strategy/task-context-report-bundle-broader-handoff-decision.md).

> Update (slice 188 · TaskContextReport Bundle Handoff Guidance Implementation): when a `TaskContextReport` is attached to an intent plan bundle, the agent-facing bundle files now promote the optional context sidecars. `agent/instructions.md` and `agent/handoff.md` gain a "## Task context" section (only when a TaskContextReport is attached) pointing at `context/task-context.agent.json` / `context/task-context.md`, framing context as not-proof and keeping WorkOrder / VerificationPlan / phase gates authoritative; `agent/context.json` gains an additive `taskContext` metadata block (`available:true`, `proof:false`, `role: optional-agent-context`) with every existing field preserved. With no task context the agent files are byte-identical. The bundle README section, the `context/` sidecars, and the Circe handoff trio are unchanged. TaskContextReport sidecars are optional context, not proof — humans should inspect context/task-context.md when present; agents should read context/task-context.agent.json when present; verification hints remain hints; do-not-touch stays guidance; Circe handoff JSON remains the machine handoff contract; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Guidance Safety Review. See [`task-context-report-bundle-handoff-guidance-implementation.md`](../strategy/task-context-report-bundle-handoff-guidance-implementation.md).

> Update (slice 189 · TaskContextReport Bundle Handoff Guidance Safety Review): the slice-188 agent-facing handoff guidance was reviewed end-to-end and declared safe/stable. TaskContextReport sidecars are optional context, not proof; `agent/instructions.md` + `agent/handoff.md` promote the optional task context only when sidecars are present; `agent/context.json` carries additive `taskContext` metadata (`proof:false`, `role: optional-agent-context`) when present and preserves every existing field; without-context bundles are byte-identical. Agents should read `context/task-context.agent.json` when present; humans should inspect `context/task-context.md` when present; verification hints remain hints; do-not-touch stays guidance; WorkOrder / VerificationPlan + phase gates remain authoritative; the Circe handoff JSON remains the machine handoff contract and is not required to understand TaskContextReport internals; sidecars must not approve plans, execute commands, or write source; intent:go remains deferred. Next: TaskContextReport Bundle Handoff Dogfood. See [`task-context-report-bundle-handoff-guidance-safety-review.md`](../strategy/task-context-report-bundle-handoff-guidance-safety-review.md).

> Update (slice 190 · TaskContextReport Bundle Handoff Dogfood — rebased on 4cc34b73 Circe actor contracts): the promoted handoff guidance was re-dogfooded from both the human-operator and the agent perspective against the current bundle producer after `4cc34b73` ("feat: emit target-specific Circe actor contracts"). A human can discover task context from `README.md`; `context/task-context.md` + `context/task-context.refs.json` were useful; an agent can discover it from `agent/instructions.md` + `agent/handoff.md`; `agent/context.json` `taskContext` metadata + `context/task-context.agent.json` were useful; `agent/verification.json` stayed authoritative for verification posture and `agent/source-refs.json` for source refs. The Circe handoff trio stayed stable and independent of TaskContextReport — `circe/handoff.json` now carries an additive `actorContracts` block. The new `circe/actor-contracts/` artifacts (3 contract Markdown + 3 JSON Schema, default `circe` target) were present and non-executing (return-shape guidance/artifacts, not executed workers) and identical in the without-context bundle. WorkOrder / VerificationPlan + phase gates remained authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle omitted every task-context surface. No fix needed. Next: TaskContextReport Bundle Handoff Dogfood Safety Review. See [`task-context-report-bundle-handoff-dogfood.md`](../strategy/task-context-report-bundle-handoff-dogfood.md).

> Update (slice 191 · TaskContextReport Bundle Handoff Dogfood Safety Review): the shipped slice-190 handoff dogfood (`c5acc07`) — including the `circe/actor-contracts` surface and the new Circe Operator Command Boundary added in `11a209fd` — was reviewed end-to-end and declared **safe/stable** before broader handoff workflow use. Strategy/safety-review batch; no runtime/API/CLI/agent-file-rendering/actor-contract-generation/operator-boundary-generation/Circe-schema/gate change. TaskContextReport sidecars are optional context, not proof; the full handoff dogfood path completed successfully; the human + agent task-context surfaces stay discoverable and non-authoritative; `agent/verification.json` + `agent/source-refs.json` stay authoritative; the Circe handoff JSON stays stable and independent of TaskContextReport; Circe actor-contract artifacts were present and non-executing (guidance/artifacts, not executed workers); the new Operator Command Boundary is operator-only inspection guidance, not worker execution guidance — it reinforces that Rekon does not run Circe and treats worker requests to run Circe operator commands as plan-quality concerns; WorkOrder / VerificationPlan + phase gates remain authoritative; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go remains deferred; the without-context bundle stayed clean. Next: TaskContextReport Bundle Handoff Broader Workflow Decision (alternative: Handoff UX Fix). See [`task-context-report-bundle-handoff-dogfood-safety-review.md`](../strategy/task-context-report-bundle-handoff-dogfood-safety-review.md).

> Update (slice 192 · TaskContextReport Bundle Handoff Broader Workflow Decision): decided how broader operator/agent handoff workflows should use the bundle surfaces — **Option B, an explicit reading-order policy** — rebased onto `e91dc087` ("feat: classify phase source-change intent") to include the new per-phase source-change posture. Decision-only; no runtime/API/CLI/bundle/Circe-schema/gate change. Humans inspect `README.md` first, then `context/task-context.md` when present; agents inspect `agent/instructions.md` first, then `agent/handoff.md`, then `agent/context.json`, then `context/task-context.agent.json` when present. Four handoff layers: operator orientation; agent structured handoff; source/verification authority (WorkOrder, VerificationPlan, **phase source-change posture**, `agent/source-refs.json`, `agent/verification.json`); Circe contract layer. TaskContextReport sidecars are optional context, not proof; phase source-change posture belongs to the authoritative source/verification layer, not the task-context layer — it is handoff evidence, not approval, and TaskContextReport sidecars must not override `sourceChange` posture; WorkOrder/VerificationPlan + phase gates + agent verification + source refs remain authoritative; Circe handoff JSON remains the machine handoff contract; actor contracts are role/return-shape guidance, not executed workers; the Operator Command Boundary stays operator-only; verification hints stay hints; do-not-touch stays guidance; intent:go deferred. First implementation: Intent Bundle Handoff Reading Order Implementation. See [`task-context-report-bundle-handoff-broader-workflow-decision.md`](../strategy/task-context-report-bundle-handoff-broader-workflow-decision.md).

> Update (slice 193 · Intent Bundle Handoff Reading Order Implementation): the intent plan bundle now promotes the handoff reading order directly in its surfaces — a "## Handoff reading order" section in `README.md` (human + agent lists), a "## Reading order" section in `agent/instructions.md` and `agent/handoff.md`, and an additive `handoffReadingOrder` metadata block in `agent/context.json`. Always rendered; task-context entries say "if present". Guidance only — no Circe handoff schema, actor-contract, source-change-classification, or gate change; TaskContextReport stays optional context, WorkOrder / VerificationPlan stay authoritative, source-change posture stays handoff evidence not approval, intent:go stays deferred. See [`intent-bundle-handoff-reading-order-implementation`](../strategy/intent-bundle-handoff-reading-order-implementation.md).

> Update (slice 194 · Intent Bundle Handoff Reading Order Safety Review): the slice-193 bundle handoff reading order was reviewed end-to-end and declared safe/stable — guidance, not automation. The README / agent-instructions / agent-handoff reading-order sections and the additive `agent/context.json.handoffReadingOrder` metadata (which preserves every existing field) guide humans and agents toward authoritative surfaces while every boundary holds: TaskContextReport sidecars stay optional context (not proof); WorkOrder / VerificationPlan stay authoritative; phase source-change posture stays handoff evidence, not approval; actor contracts stay role/return-shape guidance; the Operator Command Boundary stays operator-only; `circe/*` is byte-unchanged; intent:go deferred. See [`intent-bundle-handoff-reading-order-safety-review`](../strategy/intent-bundle-handoff-reading-order-safety-review.md).

> Update (slice 195 · Intent Bundle Handoff Reading Order Dogfood): the shipped reading order was dogfooded end-to-end from four perspectives (human operator, general agent, task-context-aware agent, Circe-targeted actor) via the full operator path + a without-context comparison. The reading order is practically useful and every boundary held — README / agent-instructions / agent-handoff reading orders and `agent/context.json.handoffReadingOrder` (preserving every existing field) guide humans and agents toward the authoritative surfaces; TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; source-change posture stays handoff evidence, not approval; actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; the without-context bundle stays clean; source + plan unchanged; no commands executed; no VerificationRun/VerificationResult; Rekon did not run Circe; intent:go deferred. See [`intent-bundle-handoff-reading-order-dogfood`](../strategy/intent-bundle-handoff-reading-order-dogfood.md).

> Update (slice 196 · Intent Bundle Handoff Reading Order Dogfood Safety Review): the slice-195 dogfood result was reviewed end-to-end and declared safe/stable — rebased onto `d975d3e` ("keep Circe verification commands executable") so the verification-posture / Circe-projection claims re-ground against the current producer; the 41-assertion dogfood contract test re-ran green. Intent bundle handoff reading order is guidance, not automation. The new `isSafeExecutableVerificationCommand` projection preserves only a bounded safe subset and rejects shell-metacharacter command strings — safe executable verification-command projection is handoff data, not execution: `circe/phase-plan.json` may describe verification commands but Rekon does not execute them, and `circe/rekon-proof.json` keeps commandsExecuted:false. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; source-change posture stays handoff evidence, not approval; actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; the without-context bundle stays clean; intent:go deferred. See [`intent-bundle-handoff-reading-order-dogfood-safety-review`](../strategy/intent-bundle-handoff-reading-order-dogfood-safety-review.md).

> Update (slice 197 · Intent Bundle Handoff Reading Order Broader Workflow Decision): decided how broader operator/agent workflow docs should treat the final reading order — Option B, a recommended (not required) broader handoff reading-order policy. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. First implementation: Intent Bundle Handoff Workflow Guide. See [`intent-bundle-handoff-reading-order-broader-workflow-decision`](../strategy/intent-bundle-handoff-reading-order-broader-workflow-decision.md).

> Update (slice 198 · Intent Bundle Handoff Workflow Guide): shipped the slice-197 Option-B product-docs step — two reader guides ([`intent-bundle-handoff-workflow`](../strategy/../guides/intent-bundle-handoff-workflow.md) and the agent reading-order companion) plus an implementation note that teach humans and agents how to consume an intent plan bundle using its handoff reading order. Documentation only. Intent bundle handoff reading order is guidance, not automation; broader workflows should recommend the handoff reading order, not require it as proof. Humans start at README.md, agents at agent/instructions.md, with `agent/context.json.handoffReadingOrder` as the structured map. TaskContextReport stays optional context; WorkOrder / VerificationPlan + `agent/verification.json` + `agent/source-refs.json` stay authoritative; phase source-change posture stays handoff evidence, not approval; safe executable verification-command projection is handoff data, not execution (`circe/phase-plan.json` may describe verification commands but Rekon does not execute them; `circe/rekon-proof.json` keeps commandsExecuted:false); actor contracts stay role/return guidance; the Operator Command Boundary stays operator-only; intent:go deferred. Next: Intent Bundle Handoff Workflow Guide Safety Review. See [`intent-bundle-handoff-workflow-guide`](../strategy/intent-bundle-handoff-workflow-guide.md).
