# ResolverPacket

`ResolverPacket` is a task-specific answer produced from the current snapshot
and related artifacts.

## Produced By

- resolver capabilities such as `@rekon/capability-resolver`

## Common Fields

- `header`
- `goal`
- `paths`
- `ownerSystems`
- `matchedScopes`
- `risk`
- `relevantFindings`
- `recommendedContext`
- `warnings`
- `nextSteps`
- `resolutionTrace`

`resolutionTrace` explains which source was checked, which source was used, and
why fallback or risk decisions happened. For ownership resolution, Rekon prefers
model projections before raw evidence:

```text
OwnershipMap -> ObservedRepo -> ownership GraphSlice -> EvidenceGraph fallback
```
