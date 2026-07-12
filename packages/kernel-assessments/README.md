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
- `createAssessmentReport()`
- assessment validation and summary helpers

Findings remain in `@rekon/kernel-findings`.
