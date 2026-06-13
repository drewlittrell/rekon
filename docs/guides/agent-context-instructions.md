# Agent Context Instructions

Agents should treat Rekon artifacts as structured context with explicit
authority boundaries.

## Before Editing

1. Run or inspect the latest repository scan.
2. Read the relevant `TaskContextReport` when one exists.
3. Read the resolver packet and its `resolutionTrace`.
4. Check source refs, findings, work order, and verification plan before making
   changes.

## Boundaries

- Context is not proof.
- Verification hints are not executed commands.
- Publications are generated readouts.
- Memory can guide selection but cannot rewrite ownership or findings.
- Source writes require the task scope and normal repository review.

## Useful Commands

```sh
rekon scan --root <repo> --json
rekon context task --root <repo> --task "<task>" --path <path> --json
rekon resolve preflight --root <repo> --path <path> --goal "<goal>" --json
rekon artifacts validate --root <repo> --json
```
