# AssessmentJudgmentReport

`AssessmentJudgmentReport` records an autonomous, source-grounded decision
about unresolved assessments selected during `rekon scan`.

## Producer and Consumers

The CLI judgment layer produces the report after the first policy evaluation.
The policy evaluator consumes it during the final evaluation pass.

## Contract

The header cites the source `AssessmentReport` and candidate evidence. The
report records the provider, model, prompt and coercion versions, selection
limits, token usage, and one stable assessment signature per decision.

Verdicts are:

- `confirmed`: current source supports the candidate
- `rejected`: current source contradicts or resolves the candidate
- `verification_required`: source review identifies a specific proof step
- `insufficient_evidence`: the available source cannot decide the claim
- `failed`: the provider response could not be used

```json
{
  "sourceAssessmentRef": {
    "type": "AssessmentReport",
    "id": "assessment-report-1",
    "schemaVersion": "0.1.0"
  },
  "judgments": [
    {
      "assessmentId": "risk:listener-cleanup",
      "assessmentSignature": "sha256:...",
      "rootCauseKey": "events:listener-cleanup",
      "verdict": "confirmed",
      "rationale": "The cleanup wrapper calls the registration API.",
      "confidence": 0.96,
      "evidence": [
        {
          "path": "src/listener.ts",
          "sha256": "...",
          "lineStart": 12,
          "lineEnd": 12,
          "excerpt": "target.addEventListener(type, listener);"
        }
      ]
    }
  ]
}
```

## Trust Boundary

Confirmed and rejected verdicts require exact excerpts from current,
repository-contained source files and a minimum confidence threshold. Policy
ignores stale digests, changed assessment signatures, incompatible prompt
contracts, and evidence that no longer matches source.

A confirmed judgment moves the candidate to `independently_confirmed`; it does
not create a finding without applicable law or reproducible proof. A rejected
candidate leaves the current `AssessmentReport`, but this report preserves the
decision and provenance. The judgment layer does not execute commands, write
source, mutate evidence, or promote findings.
