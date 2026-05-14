# ResolverPacket

## Purpose

`ResolverPacket` is a resolved output artifact written by every resolver
phase: `resolve.route`, `resolve.seam`, `resolve.preflight`, and
`resolve.issue`. Every packet shares an explainable header + trace
contract; each phase adds a phase-specific payload.

Phases:

- `route` — given a goal and paths, decide owner spread and whether to
  proceed directly to preflight or stage a seam first.
- `seam` — designate the primary owner across multiple owners and record
  secondary owners, or escalate when a primary cannot be chosen.
- `preflight` — resolve ownership, attach findings and memory, evaluate
  risk, and emit recommended context.
- `issue` — find a `Finding` by id or fragment, resolve ownership for the
  finding's files, and recommend the next resolver.

See [../concepts/resolvers.md](../concepts/resolvers.md) for the phase
flow and CLI surface.

## Produced By

- `@rekon/capability-resolver`

## Consumed By

- `@rekon/capability-docs`
- `@rekon/capability-intent`
- users and agents preparing scoped work

## Required Header Fields

All standard `ArtifactHeader` fields are required. `artifactType` is
`ResolverPacket`.

## Common Fields

Shared across phases:

- `resolverId` (e.g., `resolve.route`)
- `phase` (`route` / `seam` / `preflight` / `issue`)
- `summary`
- `warnings`
- `nextSteps`
- `resolutionTrace`

Preflight phase adds:

- `goal`
- `paths`
- `ownerSystems`
- `matchedScopes`
- `risk`
- `requiredChecks`
- `relevantFindings`
- `recommendedContext`
- `applicableMemory`

Route phase adds:

- `goal`, `concern`, `paths`, `ownerSystems`, `matchedScopes`
- `routing` (`status`, `primaryOwner`, `candidateOwners`, `needsSeam`,
  `rationale`)
- `recommendedContext`, `requiredChecks`
- `nextRequiredResolver` (`resolve.seam` | `resolve.preflight`)

Seam phase adds:

- `goal`, `paths`, `ownerSystems`, `primaryOwner`, `secondaryOwners`
- `seam` (`status`, `rationale`, `escalate`)
- `recommendedContext`, `requiredChecks`
- `nextRequiredResolver` (`resolve.preflight` when resolved)

Issue phase adds:

- `query`, `issue` (matched finding summary), `relatedFindings`
- `ownerSystems`, `matchedScopes`
- `recommendedContext`, `requiredChecks`
- `nextRequiredResolver` (`resolve.route` | `resolve.seam` |
  `resolve.preflight`)

When a [FindingStatusLedger](finding-status-ledger.md) is indexed,
`resolve.issue` annotates the matched `issue` with effective status:

- `issue.status` — `accepted`, `ignored`, or `resolved` from the
  latest ledger decision.
- `issue.statusSource` — `ledger` when a decision overrode the
  raw-report status.
- `issue.statusNote` and `issue.statusReason` — the decision's note
  and optional reason.

The resolver also adds a warning when the matched finding is ignored
("verify before acting"), accepted ("verify policy before changing"),
or resolved ("confirm whether action is still needed"). See
[../concepts/finding-lifecycle.md](../concepts/finding-lifecycle.md).

`resolutionTrace` explains why the packet contains its ownership and risk
answers. Trace entries include:

- `step`
- `sourceType`
- `sourceRef` when a concrete artifact was checked or used
- `status`
- `message`
- optional `paths`, `systems`, `confidence`, and `details`

For `resolve.preflight`, ownership resolution checks sources in this order:

1. `OwnershipMap`
2. `ObservedRepo`
3. ownership `GraphSlice`
4. raw `EvidenceGraph` `ownership_hint` facts

Fallbacks are recorded explicitly. Silent fallback is not acceptable for
resolver packets.

## Example Resolution Trace

```json
{
  "step": "ownership.resolve",
  "sourceType": "OwnershipMap",
  "sourceRef": {
    "type": "OwnershipMap",
    "id": "ownership-map-123",
    "schemaVersion": "0.1.0"
  },
  "status": "used",
  "message": "Resolved owner system from OwnershipMap.",
  "paths": ["src/index.ts"],
  "systems": ["src"],
  "confidence": 0.9,
  "details": {
    "matches": [
      {
        "path": "src/index.ts",
        "matchedPath": "src/index.ts",
        "owner": "src",
        "confidence": 0.9
      }
    ]
  }
}
```

## Risk Trace

Risk rules also write trace entries. For example, multiple owner systems produce
a high-risk trace with `details.rule` set to `multiple_owner_systems`.

## Freshness And Provenance

Resolver packets point to the snapshot and artifacts they used through
`inputRefs`. If they fall back to raw evidence, the fallback appears in
`resolutionTrace` and `warnings`.
