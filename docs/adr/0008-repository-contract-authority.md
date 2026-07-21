# ADR 0008: Repository Contract Authority

Status: Accepted

## Context

Rekon can infer repository structure, but inferred structure is not repository
law. Models also need durable system invariants and end-to-end outcomes without
loading a repository manual for every task.

## Decision

Repository contracts use four authority levels:

```text
observed -> inferred -> corroborated -> adopted
```

Committed contract sources are canonical inputs. They may be co-located as
`rekon.contract.json` or stored under `rekon/contracts/`, with additional paths
declared in root `rekon.config.json`. Generated contract artifacts remain under
`.rekon/` and never replace their source documents.

`SystemContract` records subsystem purpose and invariants. `FlowContract`
records an end-to-end outcome, its stages, and the invariants carried across
handoffs. `EffectiveContractRegistry` indexes the contracts available to
resolvers and context compilation.

Automatic adoption is a permissioned action. Inference alone cannot silently
change adopted product purpose.

## Consequences

- Contract clauses retain authority, confidence, and source provenance.
- Generated publications and prior inferred artifacts cannot validate their
  own claims.
- Contract source changes invalidate the compiled artifact family.
- Repositories can keep system law near the code it governs while defining
  cross-system flows centrally.
