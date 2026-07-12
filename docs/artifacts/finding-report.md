# FindingReport

`FindingReport` groups reproducible defects and violations of applicable
declared law. Risks, opportunities, semantic claims, and model diagnostics
belong in `AssessmentReport`.

## Produced By

- policy and evaluator capabilities

## Consumed By

- resolvers
- publications
- work-order and remediation flows

## Common Fields

- `header`
- `summary`
- `findings[]`

Findings include severity, subjects, affected files when known, evidence refs,
and a stable `rootCauseKey`. Multiple detector signals for one remediation are
fused rather than counted as separate findings.

Repository check failures may enter this report only after two distinct
`VerificationRun` artifacts reproduce the same normalized failure on the
current commit, or after the current evidence observation when commit metadata
is unavailable. Location-specific source-quality promotion additionally
requires a matching diagnostic phrase.

When command output contains multiple structured diagnostics, each diagnostic
gets its own root-cause identity. Formatter summaries, durations, and timestamps
do not create additional findings.

Failed test findings may include `relatedContext` from an application
`GraphSlice`: imported source dependencies plus routes, screens, and capability
hints connected through those dependencies. Instrumented execution is reported
separately as `observedFiles`, `observedRoutes`, and `observedScreens`. All of
this context is cited as evidence but does not participate in finding
promotion.
