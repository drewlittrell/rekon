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
and type.

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
