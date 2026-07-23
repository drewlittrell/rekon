# Task Context Workflow

`rekon context task` compiles context for a specific change. It writes a
`TaskContextReport`. MCP `context_for_task` uses the same compiler and returns a
compact delivery projection. Context is not approval or proof.

## Workflow

```sh
rekon scan --root <repo> --json
rekon capability graph build --root <repo> --json
rekon context task --root <repo> --task "Describe the change" --path src/example.ts --json
rekon context task --root <repo> --task "Describe the change" --path src/example.ts --model-context
```

The returned `operation` classifies the task, records risk evidence, selects the
smallest sufficient context profile, and says whether work can proceed directly.
High-risk, migration, contract-changing, and critical-flow work instead points
to the existing intent command:

```sh
rekon intent work-order --path <path> --goal <goal> --json
```

Run it before editing when `operation.intent.required` is `true`. `--profile`
may request a larger minimum budget; Rekon can still raise it when ownership or
risk evidence is incomplete.

After editing, validate the actual task diff before running checks:

```sh
rekon context validate-change --root <repo> \
  --task "Describe the change" \
  --changed-path src/example.ts \
  --base-ref HEAD \
  --json
```

Repeat `--changed-path` for every file changed by the task. The result separates
mechanical blockers from typed pact, handoff, and check obligations. The acting
agent judges only generic obligations that accept `model-judgment`. A changed
flow-stage responsibility instead requires an indexed, source-bound
`PlacementVerificationReport` from an independent verifier; the acting agent
cannot self-certify placement. Materialize the returned checks with the same
command plus `--prepare-verification`.
Execute the returned plan with `rekon verify run` and derive its
`VerificationResult`; validation itself does not execute checks. If a
check failure names an unread exact path or symbol, use the refinement command
below with relationship `test` or `dependency` before broader search.

If validation fails without an exact source target, request a deeper packet:

```sh
rekon context task --root <repo> --task "Describe the change" \
  --path src/example.ts --escalation validation-failed --model-context
```

After every selected check is green, run validation again with explicit proof
and record the satisfied gate:

```sh
rekon context validate-change --root <repo> \
  --task "Describe the change" \
  --changed-path src/example.ts \
  --base-ref HEAD \
  --verification-result <VerificationResult:id> \
  --placement-verification <PlacementVerificationReport:id> \
  --judgment-json '<judgments>' \
  --record-proof \
  --json
rekon refresh --root <repo> --proof-gate <ProofGateReport:id> --json
```

Repeat both validation path flags for each changed source path. The report binds
the supplied evidence to those source digests. Omit
`--placement-verification` when no stage-responsibility obligation is present.
Refresh refuses later edits,
then updates evidence, models, findings, snapshot, and architecture
publications. If adopted repository law exists, it also records current drift
and new candidates before the snapshot is built.

When the initial reads expose one named unresolved relationship, request a
bounded delta instead of switching to broad repository search:

```sh
rekon context refine --root <repo> \
  --question "Which consumer shares this contract?" \
  --target OrderCreatedEvent \
  --relationship contract \
  --anchor-path contracts/event.schema.json \
  --already-read contracts/event.schema.json \
  --model-context
```

`--already-read` is repeatable. `--anchor-symbol path/to/file.ts#symbol` may be
used instead of `--anchor-path`. The supported relationships are `dependency`,
`dependent`, `test`, `contract`, `consumer`, `producer`, and `implementation`; there is intentionally
no generic `related` mode.

Optional intent commands can consume a task context ref explicitly:

```sh
TASK_REF="$(rekon artifacts latest --root <repo> --type TaskContextReport --id-only)"

rekon intent assess --root <repo> --goal "Describe the change" --path src/example.ts --task-context-ref "$TASK_REF" --json
rekon intent plan review --root <repo> --plan plans/change.md --goal "Describe the change" --task-context-ref "$TASK_REF" --json
```

## How To Read It

- Human readers use the Markdown brief.
- Agents using CLI use `--model-context` for the minimal delivery payload.
- Operators use `--json` when they need the full `agentContext` audit block.
- Agents using MCP receive the automatically selected projection.
- `operation` explains task class, risk, evidence completeness, selected
  profile, and whether the existing work-order flow is required.
- `sourceSpans`, when present, point to the strongest bounded deterministic
  evidence inside a delivered path and bind it to a source SHA-256. Start
  there, then inspect enough surrounding implementation to make the change
  safely.
- `repositoryExemplar`, when present, is one inference-selected local precedent
  with a deterministic digest-bound excerpt. Use it only when placement or
  extension conventions matter; do not copy unrelated behavior.
- Agents should batch the packet's `readFirst` files into one source-read
  command when practical; repeated shell turns add cost without adding context.
- High-confidence symbolic implementation and contract producer/consumer
  routes may already be present in `readFirst`; inspect them directly.
- Agents read exact repository paths from source directly. They use
  `resolve_source_target` only when the initial reads expose an exact,
  task-required
  symbolic relationship whose target path is unknown. Its `readNext` result is
  a delta, not a replacement task packet. Deterministic refinement comes before
  repository-wide or symbol text search for that target; search is the fallback
  when refinement is unresolved or stale.
- Preservation-only constraints do not create lookup work. A named controller,
  contract, or boundary remains untouched unless inspected source exposes a
  concrete dependency that must be understood to complete the change.
- `coreContext` contains operator paths and deterministic graph context.
- `supportingContext` contains lower-authority retrieval or semantic context.
- `admission` marks deterministic/operator context supported and inferred
  context unresolved; rejected graph claims never enter the packet.
- `contextTrace` records which candidates were included or excluded and why.
- `budget` and `estimatedTokens` make context size explicit.
- Evidence refs point back to graph and source artifacts.
- Matched `CapabilityContract` rules appear as `declared` constraints and
  checks with freshness metadata.
- Verification hints are suggested checks, not executed proof.
- Do-not-touch zones are guidance, not automatic enforcement.

The compact model delivery preserves `readFirst`, actionable `boundaryPaths`,
bounded deterministic `sourceSpans`, supporting inference, literal pact
constraints, checks, warnings, and at most one budget-permitting repository
exemplar. Trust labels are attached by MCP and source
freshness remains on the response source list. Evidence inventories, detailed
routing reasons, full boundary flags, budget internals, and `contextTrace`
remain in the CLI JSON and stored artifact for audit rather than being repeated
to the model.

## Boundaries

`TaskContextReport` does not approve plans, execute commands, write source
files, or create work/verification artifacts. Prepare, approve, status, handoff,
and verification remain separate steps.

MCP does not persist the packet or invoke embedding/model providers. When no
explicit path is supplied, it may use deterministic lexical graph selection;
the response says so in `warnings`.

MCP and CLI refinement are provider-free. They are reserved for concrete
references observed in already-read source, not completeness checks. They follow the same deterministic,
relationship-aware selector and return unresolved rather than silently
broadening when the current graph cannot answer the question.

Repository contracts are selected only when the capability graph binds the
requested path to the configured capability. Missing or unrelated contracts
do not become generic repository instructions.
