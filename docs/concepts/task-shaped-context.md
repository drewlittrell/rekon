# Task-Shaped Context

Task-shaped context is context selected for a specific change.

The shared compiler combines explicit paths, deterministic graph context,
matched repository contracts, optional semantic or retrieval context, warnings,
and evidence refs. CLI
`rekon context task` persists a `TaskContextReport`; MCP `context_for_task`
returns a compact model-delivery projection. Both gateways first compare the
requested scope with the latest evidence and refresh Rekon artifacts when
needed. The refresh is deterministic and source-safe; `--no-auto-refresh`
disables it for deliberate artifact-state inspection.
When no path is supplied, deterministic graph and lexical anchors become the
report's resolved task paths, so its identity matches the scope Rekon actually
selected rather than an empty caller input.

Profiles provide reviewed selection budgets:

- `compact`: complete task evidence;
- `standard`: incomplete ownership or risk evidence;
- `deep`: an explicit retry after unresolved validation.

Callers normally omit the profile. The shared `classifyTaskOperation()` policy
uses the current preflight result and matched flow contracts to classify work as
local, cross-file, cross-system, contract-changing, migration, or critical-flow.
It returns an `operation` with risk provenance, evidence completeness, selected
profile, and intent mode. A caller may request a larger minimum profile, but a
smaller request cannot override an evidence-driven escalation.

Local and cross-file tasks with complete evidence proceed directly. High-risk,
migration, contract-changing, and critical-flow tasks reuse `rekon intent
work-order`; context compilation does not create a parallel planning system.
Cross-system flow and handoff paths still come from the complete `TaskPact`, not
from a larger profile chosen merely because the task spans systems.

The packet separates core from supporting context and records trust, freshness,
estimated tokens, truncation, and a bounded `contextTrace`. The report is
context, not approval or proof.

Context admission is explicit. Operator and deterministic routes are
`supported`; semantic and retrieval routes remain `unresolved` leads. Rejected
graph claims are excluded and retained only in the audit packet's
`refutedContext`. A model-facing packet must not turn an unresolved route into a
repository fact.

Scoped memory is a separate supporting trust class. Rekon may admit one
matching, unobserved entry once as an unresolved trial. One independent proof
group makes it `suggestive`, two make it `corroborated`, and counterevidence
makes it `refuted`. Only suggestive or corroborated entries repeat;
corroborated memory is supported while suggestive memory remains unresolved.
Every delivery preserves a stable `memory:<entry-id>` identity so later
outcomes can be joined without fuzzy task or timestamp matching.

The audit report may retain several evidence routes to the same file. Packet
selection collapses those routes by context identity and keeps operator or
declared-law routing first, so duplicate graph claims cannot consume the budget
and displace a contract-required path.

When the current capability graph carries exact deterministic source evidence,
the compact projection may include one `sourceSpans` entry per delivered
`readFirst` path. Each entry names the path, line range, exact excerpt, evidence
ref, source SHA-256, freshness, and selection reason. The digest binds the span
to the source text used to build the graph; older unbound graph evidence is
refreshed before context is compiled. Profile limits cap both span count and
total excerpt characters. Spans are entry points into selected source, not a
replacement for inspecting the implementation or proof that the surrounding
code is correct. A delivery policy that omits a path also omits its span.
CLI and MCP recheck bound digests immediately before delivery, including when
automatic refresh is disabled. A mismatch removes the exact evidence and its
dependent graph routes and adds a warning. Packet pressure removes advisory
memory before an exact current source span.

For tasks that add or place an established extension point, the compiler may
also include one `repositoryExemplar`. Cached similarity proposes the path, so
the selection is tagged `inference`; the excerpt, location, and digest still
come from deterministic source evidence. Use it only to match repository
placement and extension conventions. It is not repository law, not behavior to
copy, and may be omitted when the selected profile has no remaining budget.

Graph expansion is capped at four claims per selected path. Within that bound, deterministic claims precede
semantic claims; task-specific related paths, verification relationships, and
outgoing dependencies precede incidental incoming callers. Stable claim IDs
break remaining ties.

The compiler may also add at most two deterministic symbolic routes that sit
just beyond that neighborhood. It does so only when the task strongly names a
shared capability implementation or a typed producer/consumer relationship
through a contract. These paths enter `readFirst`; unrelated second-hop graph
neighbors remain excluded. A symbolic route does not cross a source-language
boundary unless the task names that language, exact path, or cross-language
coordination.

Explicit `npm`, `pytest`, and `go test` commands are preserved as unexecuted
verification hints. Preservation language such as `preserve` and `preserving`
becomes pact context rather than being left in unstructured task prose.

When a selected path implements a configured capability, the compiler also
reads that capability's preservation, placement, neighbor, and required-check
rules from the latest `CapabilityContract`. These entries carry `declared`
trust, contract freshness, and a contract evidence ref. Unmatched contracts do
not enter the packet.

When committed repository contracts exist, the compiler also builds a
task-specific `TaskPact`. Selection follows the effective registry and matches
the task paths against `SystemContract` scopes and complete `FlowContract`
paths. A path inside one flow stage therefore brings the flow's end-to-end
outcome, invariants, handoff guarantees, remaining stage paths, and required
checks into the task packet. Unrelated system and flow law is excluded.

TaskPact impact obligations are not a second instruction channel. Preserve and
inspect obligations enter the existing declared-constraint and `readFirst`
surfaces; verify obligations enter required checks. The structured TaskPact is
persisted by the CLI and cited by a generated WorkOrder. MCP derives the same
selection; its CLI host owns any freshness-driven artifact writes.

Required neighbor capabilities are resolved through the current capability
graph to their implementing files. Those files enter deterministic context
with both contract and capability evidence. The compiler does not infer a
neighbor implementation from a similar filename.

Repository law should state literal invariants literally. Exact domain errors,
event names, ordering rules, public contracts, and verification commands pass
through to the model projection without paraphrase. A rule such as "preserve
authorization behavior" cannot carry an error-name contract that the artifact
does not declare.

The delivery instruction treats a complete listed change boundary as a reason
to stop searching. Agents may expand for a named unresolved dependency, but
should not search for analogues merely because more repository context exists.

The MCP projection keeps the model-actionable subset: routing reasons, trust,
freshness, constraints, checks, warnings, and selection size. The full packet
keeps provenance and selection diagnostics for audit.

For managed agents, `context_for_task` is the default first call. The advertised
MCP surface stays limited to task compilation, exact source-target resolution,
and post-edit `validate_change`. Orientation, placement, and preflight remain operator-facing CLI
workflows because advertising them to every coding run invites context calls
that duplicate the task packet.

`validate_change` closes the task loop. The CLI host compares each changed path
with a read-only Git baseline and loads the matching TaskPact, ownership,
capability policy, and flow contracts. Mechanical scope and dependency
violations block immediately. Repository purpose, user outcomes, invariants,
prohibitions, and handoff semantics become typed proof obligations for the
acting model to judge against cited source.

Checks are separate verifier obligations. A declared handoff edge can be
supported only by methods allowed in its `FlowContract`. A handoff may require
an exact check, runtime observation, model judgment, or a declared combination.
Selected checks carry the exact edge obligation IDs they can satisfy, so one
handoff's test cannot prove a sibling edge. A failed accepted verifier blocks
the edge even if another verifier supports it. Missing, skipped, stale, and
unrelated evidence remain unresolved rather than disappearing from the graph.

The first call identifies required proof. The final call supplies explicit
`VerificationResult` and runtime-observation refs plus model judgments. A
satisfied result can be recorded as a `ProofGateReport`, bound to the post-edit
source digests. `rekon refresh --proof-gate <ref>` rejects reused proof after
another edit, then updates lower-layer evidence and models, reruns governance,
and reconciles adopted contracts. Refresh does not create repository law when
no registry exists.

A failed check may use the existing exact source-target resolver for a path or
symbol named by the failure. Failure alone does not authorize broad search.

The call is also the rehydration boundary. Managed instructions require a fresh
task-context request after context compaction or restart and whenever the goal
or known path scope materially changes. The root instruction file remains a
small bootloader; dynamic repository law stays in task-selected artifacts.

CLI and MCP hosts write a `ContextUsageEvent` for the exact delivered
projection. Post-edit validation writes an `OutcomeEvent`, and a successful
proof-gated refresh records the accepted outcome before running memory
curation. The context response returns its exact usage ref; passing it to
`validate_change` preserves delivery lineage when pathless resolution found a
broader scope than the final diff. Delivery alone never counts as use, and a
model's self-report cannot promote memory.

## Route Semantics

Each compiled route answers two separate questions:

- `routeRole` explains the path's relationship to the task: `task-target`,
  `repository-law`, `implementation`, `handoff`, `verification`, `dependency`,
  `compatibility`, or `supporting`.
- `necessity` says when to read it: `required`, `conditional`, or `supporting`.
- `necessityReason` states the concrete condition or evidence behind that
  classification.

The compiler assigns these fields from operator scope, adopted contracts,
typed graph relationships, tests, and inference provenance. It does not infer
necessity from a generic priority label. A handoff can be required when the
task changes data carried across a contract, while an incoming caller can be
conditional when compatibility is unchanged.

The full delivery policy remains the default and preserves the existing read
surface. The experimental `role-aware` policy keeps required routes in
`readFirst` and exposes conditional and supporting routes separately. Moving a
route out of the mandatory set does not discard it, weaken its evidence, or
prove that a model will avoid reading it. Promotion requires an independent
model run that preserves behavior, scope, contracts, and checks while skipping
only routes whose conditions do not apply. The first independent Sol/xhigh
canary preserved quality but correctly read both conditionally applicable
routes, so it produced no read or token reduction and was not promoted.
A second canary used two oracle-confirmed optional routes. Sol used all of them
under role-aware delivery, while full delivery left one optional caller unused,
and role-aware used more tokens and commands. Route labels therefore remain an
explainability surface rather than an accepted context-reduction mechanism.

The evaluation-only `summary-aware` policy goes one step further: it removes
deterministic conditional paths from delivery and replaces them with pathless
relationship counts, a `condition-not-triggered` resolution, and a concrete
`inspectWhen` condition. Across two three-run Sol/xhigh variants, all changes
remained correct, but the model still read every omitted dependency and caller
after required source exposed their imports. Path omission and stronger routing
prose did not reduce actual reads, exploration, or visible cost. The result is
retained to prevent repeating that optimization; it is not a production
policy.

Fresh, exact capability contracts did not change that source-verification
behavior. Sol read every optional implementation in both a relative-import task
and a symbolic-import task. On the symbolic task, Rekon still avoided package
and test-runner discovery, reducing explored paths by 40% and commands by 30%,
but added token overhead. Contracts remain valuable for scope and invariants;
they are not treated as substitutes for inspectable source.

The evaluation-only `navigation-only` policy removes conditional paths, route
summaries, and descriptive implementation assertions while retaining required
paths, normative constraints, checks, and inference-only support. Its first
three-pair Sol/xhigh probe preserved quality and reduced repository exposure by
37%. The model nevertheless inspected the omitted dependency in every Rekon
run, commands increased, and all token measures worsened. A smaller packet can
improve orientation without reducing source verification or total cost; the
policy is retained as evidence and is not the production default.

## Bounded Refinement

After reading every `readFirst` path, an agent should read any exact repository
path named by source directly. Refinement is for a task-required symbolic
dependency, call, contract, consumer, producer, test suite, or implementation
identifier whose target path is absent from both `readFirst` and
`boundaryPaths`. The agent can call `resolve_source_target` with:

- the unresolved question;
- the exact symbol, type, or call named by inspected source;
- an anchor path or `path#symbol` graph id;
- one relationship: `dependency`, `dependent`, `test`, `contract`, `consumer`,
  `producer`, or `implementation`;
- paths it has already read.

Constraint prose alone does not trigger refinement. A preservation-only rule
names a surface to leave unchanged; the agent looks it up only when inspected
source exposes a concrete target required to implement or verify the change.

For that unresolved symbolic target, deterministic refinement comes before
repository-wide or symbol text search. Search is a fallback only when the
refinement result is unresolved or its evidence is stale.

The shared refinement selector follows only deterministic graph edges matching
that relationship. It excludes the anchor and already-read files, returns at
most eight `readNext` paths with selection reasons, and applies contracts and
checks matched to the new paths. Model-derived graph claims do not cross this
trust gate.

An empty result is an explicit unresolved answer. The selector does not replace
that absence with lexical, embedding, or repository-wide search, and the agent
must not treat it as permission to do so. The agent continues with the initial
packet or reports missing evidence unless source names another symbolic anchor.
After reading `readNext`, another refinement is appropriate only when it reveals
a new task-required symbolic target. General curiosity and completeness checks
are not refinement requests.
A task-relevant test already listed in `readFirst` is the test route. Update it
unless inspected source names a separate suite or test mapping; do not spend a
refinement call asking whether more tests might exist.

The same rule applies to every relationship. When `readFirst` or
`boundaryPaths` already contains the contract, consumer, producer,
implementation, or test route needed by the task, that relationship is
resolved. Refinement is justified only when inspected source names a different
required target that is absent from both lists.
A listed `boundaryPath` is already known compatibility context and should be
read directly when it becomes relevant, not rediscovered through refinement.
