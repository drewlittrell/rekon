# Agent Operating Contract

The agent operating contract is a generated, task-independent publication for
coding agents.

It summarizes current repository context, ownership, findings, memory guidance,
required checks, and safety boundaries. It is derived from artifacts and should
not be treated as canonical truth.

Generate it with:

```sh
rekon publish agent-contract --root <repo> --json
```

This publication is not the managed `AGENTS.md` bootstrap. Rekon maintains the
bootstrap with `rekon agent-instructions sync`; it contains only stable usage
instructions. The publication remains under `.rekon/` unless exported to a
standalone, unprotected path such as `AGENTS.rekon.md`.

Whole-file export to `AGENTS.md` is refused. Project guidance and the bounded
managed block must not be replaced by a generated repository summary.
