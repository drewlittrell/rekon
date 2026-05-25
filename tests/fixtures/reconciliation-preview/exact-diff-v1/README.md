# exact-diff-v1 fixture

Deterministic fixture for the
`reconciliation-exact-diff-operation-v1`
contract test.

Provides a seeded `CoherencyDelta` artifact
that carries one `remediationQueue` step
with exact `beforeText` + `afterText` +
`diffKind: "exact-text-replacement"` fields
pointing at the `target.ts` source file
included here.

When the `@rekon/capability-reconcile`
actuator runs in suggestion mode with
`repoRoot` set to a copy of this fixture,
the classifier produces an
`exact_text_replacement` operation in the
generated `ReconciliationPlan`.
`rekon reconcile preview` then renders a
real unified diff via the v1 preview
helper's forward-compatible diff branch.

**This fixture does not exercise any
source-write apply path.** No source file
is mutated. The contract test asserts
the file is unchanged before and after
the preview run.
