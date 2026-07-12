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
- `relevantAssessments`
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

`relevantFindings` contains governed defects. `relevantAssessments` keeps risks,
opportunities, semantic claims, and model diagnostics separate. Only assessments
whose kind is `risk` can affect preflight risk; attaching an assessment never
promotes it to a finding. The trace records the `AssessmentReport` refs checked
and counts by assessment kind and lifecycle state. Relevant assessment objects
carry the normalized lifecycle `state`, including when an older report omitted
the derived field.
