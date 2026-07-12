# AssessmentReport

`AssessmentReport` contains evidence-backed intelligence that is not yet, or is
not intended to become, a finding.

## Classes

- `risk`: impact is plausible but not proven
- `opportunity`: optional improvement
- `semantic_claim`: model judgment awaiting corroboration
- `model_diagnostic`: incomplete or conflicting repository intelligence

## Contract

Every assessment includes evidence refs, a stable `rootCauseKey`, confidence
basis, and verification state. Reports summarize assessments by kind, impact,
type, and lifecycle state.

Lifecycle states are derived from kind and verification evidence:

- `model_proposed`: unverified semantic judgment
- `evidence_observed`: deterministic or tool evidence observed once
- `tool_corroborated`: a tool or deterministic signal corroborates the claim
- `verified`: evidence satisfies the detector's verification contract
- `operator_confirmed`: an operator explicitly confirms the assessment
- `opportunity_only`: optional improvement, never automatic defect promotion
- `diagnostic_only`: intelligence-model quality issue, not a repository defect

```json
{
  "kind": "semantic_claim",
  "type": "tech_debt",
  "rootCauseKey": "tech_debt:src/provider.ts:error_handling",
  "evidence": [
    { "type": "SemanticDebtJudgmentReport", "id": "debt-1", "schemaVersion": "0.1.0" }
  ],
  "confidence": {
    "score": 0.6,
    "basis": "semantic",
    "verification": "unverified"
  }
}
```

Assessments may be fused by root cause. Promotion to `FindingReport` requires
operator confirmation or corroborated evidence tied to applicable law or a
reproducible defect.

Semantic claims use an explicit intermediate state. A matching deterministic
source signal changes `basis` to `mixed`, `verification` to `corroborated`, and
adds the evidence graph as a supporting signal. That state is still not a
finding by itself; corroboration and promotion are separate decisions.

Fusion requires the same root-cause key, assessment type, and file or subject
scope. A shared key alone cannot combine unrelated evidence. Original detector
records remain visible through `supportingSignals`.

Use `rekon assessments list --state <state> --json` to inspect one lifecycle
state. Resolver packets carry `state` on each relevant assessment and summarize
states in `resolutionTrace`.

A single failed repository lint, test, typecheck, or build run is recorded as a
risk. Stale, timed-out, killed, empty-output, and environment-shaped failures
also remain risks rather than promoting automatically.

Complexity risks may include `details.coverage` from fresh isolated test runs.
The status distinguishes execution during passing tests, execution only during
failed tests, a passing run that missed an explicitly declared source target,
and other zero execution in the recorded tests. This context strengthens the
same root cause; it does not create another assessment or prove assertion
coverage.

Repository-check assessments with a structured source location may include
`details.blastRadius`. Rekon records direct dependencies, direct dependents,
and bounded transitive dependents from the current resolved import graph while
retaining complete counts. This is impact context, not proof that a dependent
is broken.
