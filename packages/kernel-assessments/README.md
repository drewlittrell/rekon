# @rekon/kernel-assessments

Public contracts for evidence-backed assessments that are not findings.

## Stability

Label: `experimental, public`.

## Purpose

The package keeps risks, opportunities, semantic claims, and intelligence-model
diagnostics out of `FindingReport` until they satisfy Rekon's finding promotion
rules.

## Public Surface

- `Assessment`
- `AssessmentReport`
- `AssessmentJudgment` and `AssessmentJudgmentReport`
- `createAssessmentReport()`
- `createAssessmentJudgmentReport()` and `assessmentJudgmentSignature()`
- `assessmentLifecycleState()` and lifecycle state guards
- conservative root-cause fusion and finding-promotion decisions
- assessment validation and summary helpers

An `AssessmentJudgmentReport` records a bounded, source-grounded decision about
current assessment candidates. A confirmed judgment moves an assessment to
`independently_confirmed`; it does not become a finding without applicable law
or reproducible proof. A source-grounded rejection removes the candidate from
the current report while preserving the judgment artifact for audit.

Findings remain in `@rekon/kernel-findings`.
