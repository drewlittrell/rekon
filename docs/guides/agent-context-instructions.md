# Agent Context Instructions

Agents should treat Rekon artifacts as structured context with explicit
authority boundaries.

## Before Editing

1. Call `context_for_task` with the concrete task and known paths. Start with
   `compact`; use a larger profile only when its trace shows missing context.
   Read every returned `readFirst` path before planning or editing, batching
   those file reads into one command when practical.
2. Call `resolve_source_target` only when inspected source exposes a
   task-required symbolic target whose path is absent from `readFirst` and
   `boundaryPaths`. Pact text and preservation-only constraints name surfaces
   to leave unchanged; they do not create missing targets. Use deterministic
   resolution before broad or text search, read every returned `readNext` path,
   and stop when the route is resolved. Do not refine for completeness,
   analogues, or additional tests, and do not turn an unresolved result into
   broad search.
3. If context reports missing or drifted repository law, run `rekon contracts
   maintain --root . --json`, inspect the cited source, and complete its
   judgment step yourself. Apply source only when the configured policy allows
   it.
4. Treat a refresh failure or remaining stale warning as missing evidence.
   Inspect `rekon artifacts freshness --json` before relying on it.
5. Check source refs, findings, work order, and verification plan before making
   changes.
6. After editing, call `validate_change` with the original task, every changed
   path, and the pre-edit Git base ref. Resolve blocking violations. Judge each
   semantic obligation against its cited source and pact, then run the returned
   checks before completion.
7. If a check fails and names an exact unread path or symbol, use
   `resolve_source_target` with that target and the matching `test` or
   `dependency` relationship. Rerun the failed check and any selected check not
   yet green.

Returned pact constraints and required checks are acceptance criteria, not
optional background. `boundaryPaths` are different: preserve them, but inspect
them only when a named compatibility dependency remains unresolved.

MCP is the model-native context interface. Its task-context call can refresh
the local `.rekon/` artifact store, but it does not write repository source or
execute project commands. The CLI is the universal interface for task context,
scans, resolver packets, publishing, and artifact maintenance.

The coding-agent MCP surface advertises task context, exact source-target
resolution, and post-edit change validation. Orientation, placement, and preflight remain CLI
workflows; legacy MCP calls are accepted but not advertised.

## Managed Block

`rekon setup`, `rekon init`, and `rekon refresh` can install or update a
versioned block in the repository's root `AGENTS.md`. Rekon owns only the text
between its markers. Repository-specific guidance belongs outside them.

```sh
rekon agent-instructions check --root . --json
rekon agent-instructions sync --root . --json
rekon agent-instructions remove --root . --json
```

The block is a bootstrap, not a snapshot. It names the interfaces above; it
does not copy current ownership, findings, memory, or policy into source
control.

## Boundaries

- Context is not proof.
- Verification hints are not executed commands.
- Publications are generated readouts.
- Memory can guide selection but cannot rewrite ownership or findings.
- Source writes require the task scope and normal repository review.

## Useful Commands

```sh
rekon mcp serve --root .
rekon scan --root <repo> --json
rekon context task --root <repo> --task "<task>" --path <path> --profile compact --model-context
rekon context refine --root <repo> --question "<question>" --target <source-identifier> --relationship dependency --anchor-path <path> --already-read <path> --model-context
rekon context validate-change --root <repo> --task "<task>" --changed-path <path> --base-ref HEAD --json
rekon contracts maintain --root <repo> --json
rekon resolve preflight --root <repo> --path <path> --goal "<goal>" --json
rekon artifacts validate --root <repo> --json
```
