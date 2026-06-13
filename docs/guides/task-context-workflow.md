# Task Context Workflow

`rekon context task` builds a `TaskContextReport` for a specific change. The
report is designed to be read before planning or editing. It is context, not
approval or proof.

## Workflow

```sh
rekon scan --root <repo> --json
rekon capability graph build --root <repo> --json
rekon context task --root <repo> --task "Describe the change" --path src/example.ts --json
```

Optional intent commands can consume a task context ref explicitly:

```sh
TASK_REF="$(rekon artifacts latest --root <repo> --type TaskContextReport --id-only)"

rekon intent assess --root <repo> --goal "Describe the change" --path src/example.ts --task-context-ref "$TASK_REF" --json
rekon intent plan review --root <repo> --plan plans/change.md --goal "Describe the change" --task-context-ref "$TASK_REF" --json
```

## How To Read It

- Human readers use the Markdown brief.
- Agents use the `agentContext` JSON block.
- Evidence refs point back to graph and source artifacts.
- Verification hints are suggested checks, not executed proof.
- Do-not-touch zones are guidance, not automatic enforcement.

## Boundaries

`TaskContextReport` does not approve plans, execute commands, write source
files, or create work/verification artifacts. Prepare, approve, status, handoff,
and verification remain separate steps.
