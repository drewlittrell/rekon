# TaskContextReport Broader Workflow Decision

> **Slice 176 · strategy / architecture decision batch.** Base `c3e94fd`.
> Decision-only — no runtime behavior change, no source change, no new artifact, no
> CLI command. Decides where TaskContextReport becomes the standard context
> substrate for humans, agents, and future intent/operator workflows, while
> preserving every boundary. **Selected: Option B — TaskContextReport as the
> standard pre-intent / pre-work context substrate.** First implementation:
> **TaskContextReport Human/Agent Context Export**.

## Decision Summary

TaskContextReport is now implemented, safety-reviewed, dogfooded through the intent
path, wired into `intent assess` / `intent plan review` as explicit opt-in context,
and free of the provider-default ergonomics issue (fixed in slice 175). The product
question is no longer "is it safe?" but "where is it used next?"

**Decision: Option B.** TaskContextReport becomes the standard context artifact
that humans and agents inspect *before* planning or changing code — the
`context first, plan second, approval third, handoff fourth` layer. It is **not**
promoted into an approval, proof, execution, or automatic-consumption role.

**TaskContextReport is a context substrate, not a proof artifact.**
**TaskContextReport may guide humans and agents, but must not approve plans.**

This batch is decision-only. It does not implement broader workflow use; it pins
the product role, the human/agent output model, the optional bundle/handoff model,
and the boundaries, then names the first implementation slice.

## Why This Decision Exists

TaskContextReport has moved from concept to a useful, safety-reviewed context
substrate across nine shipped slices. Continuing to add isolated features without a
product role risks scope drift — and, more dangerously, risks a feature quietly
crossing the proof / approval / execution / source-write boundaries Rekon is built
to keep separate. This memo fixes the role before the next implementation so every
later slice inherits the same answer: context may guide, but it must never approve,
execute, mutate, or claim proof.

## Current Task Context Surface

- **Artifact:** `TaskContextReport` (`@rekon/kernel-repo-model` type + validator;
  built by `buildTaskContextReport` in `@rekon/capability-model`). The factory
  forces every boundary flag false: `retrievalIsProof`, `executedCommands`,
  `wroteSourceFiles`, `createdPreparedIntentPlan`, `createdWorkOrder`,
  `createdVerificationPlan`, `ranCirce`.
- **Producer:** `rekon context task` — explicit task-shaped context. Reads the
  latest `CapabilityEvidenceGraph` + embedding cache; ranks retrieval when a
  provider is available; degrades to a graph + lexical fallback when an
  implicitly-defaulted provider is unavailable (slice 175); fails cleanly when no
  path, no retrieval, and no graph match exist. Source-read-only.
- **Outputs:** JSON (`status`, `provider`, `providerExplicit`, `retrieval`,
  `artifact`, `task`, `selection`, `summary`, `contextItems`, `graphNeighborhood`,
  `doNotTouch`, `verificationHints`, `warnings`, `boundaries`) and a human markdown
  view (Core Context / Related Context / Do Not Touch / Verification Hints /
  Warnings).
- **Intent consumers:** `rekon intent assess` and `rekon intent plan review` accept
  opt-in `--task-context latest|<ref>` (via `selectTaskContextReports` /
  `resolveTaskContextSelection`) — additive context only, after readiness/status are
  decided. `intent prepare` / `approve` / `status` / `handoff` do **not** consume
  TaskContextReport directly; their gates remain explicit.
- **Codebase-intel ancestry:** the old `/Users/andrewlittrell/Code/codebase-intel`
  is available and was used as the conceptual ancestor — its orientation /
  implementation split, context bundles, agent-context output, resolver packets,
  `mustNot`, and `checkMatrix` map onto Rekon's TaskContextReport (context bundle),
  do-not-touch zones (`mustNot`/guidance), and verification hints (check intent).
  In codebase-intel the context packet *informed* the worker; it never approved or
  executed. This memo keeps that boundary.

## Options Considered

### Option table

| Option | Decision | Reason |
| --- | --- | --- |
| CLI-only helper | rejected/deferred | undersells the now-safety-reviewed context substrate |
| standard pre-work context substrate | selected | improves humans/agents without crossing proof/execution boundaries |
| automatic consumption everywhere | rejected | surprising / stale-context risk |
| enforcement artifact | rejected/deferred | do-not-touch / hints are guidance first; enforcement needs separate gate design |
| duplicate/canonical workflows next | deferred | higher-risk recommendations; mature the context layer first |

- **Option A — CLI-only helper:** keep `rekon context task` as an ad-hoc helper.
  *Rejected/deferred* — undersells the substrate.
- **Option B — standard pre-intent / pre-work context substrate:** *Selected*.
- **Option C — automatic consumption everywhere:** all intent/agent workflows auto-
  read the latest TaskContextReport. *Rejected* — stale/surprise risk.
- **Option D — enforcement artifact:** do-not-touch zones / verification hints as
  hard gates. *Rejected/deferred* — they are guidance/context first; enforcement
  requires separate policy/gate design.
- **Option E — jump to duplicate/canonical workflows:** *Deferred* — task context
  should mature as a human/agent context layer before higher-risk recommendations.

## Recommendation

**Adopt Option B.** TaskContextReport is the standard context artifact humans and
agents inspect before planning or editing. It should be available before `intent
assess`, `intent plan review`, human implementation, agent implementation, and
future operator workflows. It is not an approval/proof/execution artifact, and its
consumption stays explicit.

**First implementation after this decision: TaskContextReport Human/Agent Context
Export.** The artifact already exists and is useful; the next product step improves
how humans and agents *consume* it — stronger markdown rendering, an agent JSON
bundle, a concise "read this before editing" output — with no automation, no
execution, no source writes, and no proof/approval semantics. For v1, prefer
improving the existing `context task` human output and JSON shape; add a dedicated
`context task export` / render surface only if needed.

## Workflow Model

The human/agent flow is **context first, plan second, approval third, handoff
fourth**:

### Workflow table

| Step | Role |
| --- | --- |
| build graph / evidence | substrate |
| context task | task-shaped context |
| human markdown | reviewable summary |
| agent JSON | structured context |
| intent assess / plan review | optional explicit consumer |
| prepare / approve / status / handoff | separately gated |

1. Build/refresh the CapabilityEvidenceGraph and semantic evidence.
2. Run `rekon context task --task ...`.
3. A human reviews the TaskContextReport human markdown.
4. An agent reads the TaskContextReport JSON.
5. The operator *optionally* passes the report to `intent assess` /
   `intent plan review` (explicit `--task-context` / `--task-context-ref`).
6. `intent prepare` / `approve` / `status` / `handoff` remain separately gated.

## Human And Agent Output

The TaskContextReport artifact is the canonical source of truth; the renderings are
views of it.

### Output table

| Output | Decision |
| --- | --- |
| TaskContextReport artifact | canonical |
| human markdown | rendered view |
| agent JSON | structured source of truth |
| bundle inclusion | optional context, not proof |

- **TaskContextReport artifact is canonical.**
- **Human markdown is a rendered view** of the artifact.
- **Agent JSON is the structured source of truth** for agents.
- A future export surface (`rekon context task export --report <ref> --format
  markdown|agent-json`, or reuse of `--format`) may be added *only if needed*; v1
  improves the existing output rather than adding a command.

## Bundle And Handoff Model

TaskContextReport **may** be included as context in future intent bundles and
handoffs, but **must not be required proof**:

- optional context input, referenced by artifact ref;
- no approval authority;
- never a gate, never a proof, never a substitute for the deterministic spine.

## Boundary Model

### Boundary table

| Boundary | Decision |
| --- | --- |
| task context vs proof | context only |
| task context vs approval | no approval |
| task context vs command execution | no execution |
| task context vs source writes | no writes |
| task context vs WorkOrder / VerificationPlan | not created |
| do-not-touch zones | guidance/context |
| verification hints | hints only |
| intent:go | deferred |

**TaskContextReport is a context substrate, not a proof artifact.**
**TaskContextReport may guide humans and agents, but must not approve plans.**
**TaskContextReport must not execute commands.**
**TaskContextReport must not write source files.**
**TaskContextReport must not create WorkOrder or VerificationPlan.**
**Verification hints remain hints, not executed commands.**
**Do-not-touch zones remain guidance/context, not enforcement.**
**TaskContextReport consumption remains explicit unless a future decision changes
it.**
**Intent prepare / approve / status / handoff remain separately gated.**
**intent:go remains deferred.**

### Decision questions

1. Standard context substrate for broader workflows — yes (Option B). 2. First
consumers — human/agent pre-work review, then the existing opt-in intent assess /
plan review. 3. Used before intent prepare — yes, as context, never as a gate. 4.
Setup/onboarding exposes task context — yes, as an optional "read this before
editing" surface; no automation. 5. Markdown output is a rendered view of
TaskContextReport — yes. 6. Feeds agent instructions — yes, via agent JSON, as
context only. 7. Feeds plan-review prompts — yes, already, explicitly and
additively. 8. Feeds broader intent workflows automatically — **no.** 9.
Verification hints ever execute — **no.** 10. Do-not-touch zones as enforceable
gates — **no; guidance/context first.** 11. Relation to WorkOrder / VerificationPlan
— optional context input only; never created by, never gated by task context. 12.
Included in bundle/handoff artifacts — optional context, not required proof. 13.
Used by agent/operator workflow docs — yes (this decision + the export slice). 14.
Deferred — automatic consumption, enforcement, duplicate/canonical surfaces,
intent:go. 15. Implementation slice that follows — TaskContextReport Human/Agent
Context Export.

## What This Does Not Do

No broader workflow use is implemented; no change to `context task` behavior; no
change to intent behavior; no automatic task-context consumption; no plan approval
from task context; no executed verification hints; no command execution; no source
writes; no WorkOrder / VerificationPlan creation; no Circe; no intent:go; no
duplicate detection; no canonical recommendations; no npm publish; no version bump;
no branch.

## Implementation Sequence

1. **(this batch)** TaskContextReport Broader Workflow Decision — pin the role,
   output model, bundle/handoff model, and boundaries.
2. **TaskContextReport Human/Agent Context Export** (recommended next) — improve
   markdown rendering + agent JSON + "read this before editing" output (or an
   optional export command), with no execution, no source writes, no proof/approval
   semantics.
3. Later, separately decided: any enforcement, automatic consumption, or
   duplicate/canonical surfaces — each its own decision, none assumed here.

## Related

- [Intent Planning UX / Context Quality Fix](./intent-planning-ux-context-quality-fix.md)
- [TaskContextReport Intent Dogfood Safety Review](./task-context-report-intent-dogfood-safety-review.md)
- [TaskContextReport v1](./task-context-report-v1.md)
- [Task-Shaped Context](../concepts/task-shaped-context.md)

> Update (slice 177 · TaskContextReport Human/Agent Context Export): `rekon context task` now prints a human "read this before editing" brief (Core Context, Related / Supporting Context, Do Not Touch, Verification Hints, Evidence) and adds an additive `agentContext` block to its `--json` payload. Presentation only — the TaskContextReport artifact stays canonical, human markdown is a rendered view, agent JSON is the structured source of truth; every existing JSON field preserved; verification hints stay hints, do-not-touch stays guidance, evidence preserved; no approval / execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export.md`](task-context-human-agent-export.md).

> Update (slice 178 · TaskContextReport Human/Agent Export Safety Review): the slice-177 `rekon context task` human/agent export was reviewed end-to-end and declared safe/stable — presentation only. The TaskContextReport artifact is canonical, human markdown is a rendered view, agent JSON (`agentContext`) is the structured source of truth and is additive (every existing top-level JSON field preserved); verification hints stay hints (`executed:false`), do-not-touch zones stay guidance (`enforced:false`), evidence refs are preserved, boundaries stay all-false; no approval / command execution / source write / WorkOrder / VerificationPlan / Circe; intent:go deferred. See [`task-context-human-agent-export-safety-review.md`](task-context-human-agent-export-safety-review.md).
