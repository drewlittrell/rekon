# Agent Context Instructions

Agents should treat Rekon artifacts as structured context with explicit
authority boundaries.

## Before Editing

1. Call `context_for_task` with the concrete task and known paths. Let Rekon
   choose context depth, retain the returned `contextUsageRef`, follow the
   returned `operation`, and read every `readFirst` path before planning or
   editing. Batch those reads when practical.
2. Call `resolve_source_target` only when inspected source exposes a
   task-required symbolic target whose path is absent from `readFirst` and
   `boundaryPaths`. Pact text and preservation-only constraints name surfaces
   to leave unchanged; they do not create missing targets. Use deterministic
   resolution before broad or text search, read every returned `readNext` path,
   and stop when the route is resolved. Do not refine for completeness,
   analogues, or additional tests, and do not turn an unresolved result into
   broad search.
3. If the operation requires a work order, run `rekon intent work-order --path
   <path> --goal <goal> --json` before editing.
4. If context reports missing or drifted repository law, run `rekon contracts
   maintain --root . --json`, inspect the cited source, and complete its
   judgment step yourself. Apply source only when the configured policy allows
   it.
5. Treat a refresh failure or remaining stale warning as missing evidence.
   Inspect `rekon artifacts freshness --json` before relying on it.
6. Check source refs, findings, work order, and verification plan before making
   changes.
7. After editing, call `validate_change` with the `contextUsageRef` returned by
   `context_for_task`, the original task, every changed path, and the pre-edit
   Git base ref. Resolve blocking violations. Judge only
   obligations that accept `model-judgment`. Materialize the returned checks
   with the equivalent CLI call plus `--prepare-verification`, execute the
   returned plan, and derive its `VerificationResult`. If the failure remains unexplained, request
   context again with `escalation: validation-failed`.
8. If a check fails and names an exact unread path or symbol, use
   `resolve_source_target` with that target and the matching `test` or
   `dependency` relationship. Rerun the failed check and any selected check not
   yet green.
9. Call `validate_change` again with explicit verification refs, runtime
   observations when available, and semantic judgments. Require
   `proofGate.status: satisfied`.
10. Record the gate with `rekon context validate-change ... --record-proof
    --json`, then run `rekon refresh --proof-gate <ProofGateReport:id> --json`.
    Digest drift, refresh failure, or contract drift means the task is not
    complete.

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
rekon context task --root <repo> --task "<task>" --path <path> --model-context
rekon context refine --root <repo> --question "<question>" --target <source-identifier> --relationship dependency --anchor-path <path> --already-read <path> --model-context
rekon context validate-change --root <repo> --task "<task>" --changed-path <path> --base-ref HEAD --context-usage <ContextUsageEvent:id> --json
rekon context validate-change --root <repo> --task "<task>" --changed-path <path> --base-ref HEAD --context-usage <ContextUsageEvent:id> --verification-result <ref> --judgment-json '<json>' --record-proof --json
rekon refresh --root <repo> --proof-gate <ProofGateReport:id> --json
rekon contracts maintain --root <repo> --json
rekon resolve preflight --root <repo> --path <path> --goal "<goal>" --json
rekon artifacts validate --root <repo> --json
```
