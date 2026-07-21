# Task Context Workflow

`rekon context task` compiles context for a specific change. It writes a
`TaskContextReport`. MCP `context_for_task` uses the same compiler and returns a
compact delivery projection. Context is not approval or proof.

## Workflow

```sh
rekon scan --root <repo> --json
rekon capability graph build --root <repo> --json
rekon context task --root <repo> --task "Describe the change" --path src/example.ts --profile compact --json
rekon context task --root <repo> --task "Describe the change" --path src/example.ts --profile compact --model-context
```

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
- Agents using MCP receive the compact projection by default.
- `sourceSpans`, when present, point to the strongest bounded deterministic
  evidence inside a delivered path. Start there, then inspect enough
  surrounding implementation to make the change safely.
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
- `contextTrace` records which candidates were included or excluded and why.
- `budget` and `estimatedTokens` make context size explicit.
- Evidence refs point back to graph and source artifacts.
- Matched `CapabilityContract` rules appear as `declared` constraints and
  checks with freshness metadata.
- Verification hints are suggested checks, not executed proof.
- Do-not-touch zones are guidance, not automatic enforcement.

The compact model delivery preserves `readFirst`, actionable `boundaryPaths`,
bounded deterministic `sourceSpans`, supporting inference, literal pact
constraints, checks, and warnings. Trust labels are attached by MCP and source
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
