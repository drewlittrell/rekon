# @rekon/capability-policy

Built-in policy evaluator for Rekon.

## Stability

Label: `experimental, public`.

The default capability export and built-in rule metadata are the public surface.
Rule evaluator internals are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

Current rule families:

- `imports.noDistImports`
- `typescript.compilerDiagnostic`
- `typescript.typeEscape`
- `typescript.errorSuppression`
- `typescript.placeholderImplementation`
- `typescript.asyncPromiseExecutor`
- `typescript.asyncArrayCallback`
- `typescript.floatingPromise`
- `tests.focused`
- `tests.isolation`
- `typescript.functionComplexity`
- `repository.checkFailure`
- `security.scannerResult`
- `similarity.duplicateCandidate`
- `imports.noNodeModulesRelativeImports`
- `files.noGeneratedAsSource`
- `architecture.noUnknownSystemForSourceFile`
- `architecture.importCycle`
- `architecture.dependencyHub`
- `grammar.divergence`
- `debt.markers`
- `debt.semantic`
- `dead_code.unreferenced`
- `capability.overlap`
- `naming.contract`
- `grammar.antiPattern`

## Lifecycle Fit

Runs during `Evaluate`, producing `FindingReport` for proven violations and
`AssessmentReport` for risks, opportunities, semantic claims, and model
diagnostics.

Completed `VerificationRun` artifacts can corroborate repository-native lint,
test, typecheck, and build failures. A failure remains a risk until the same
normalized diagnostic is reproduced by two distinct runs on the current
commit. When commit metadata is unavailable, both runs must be fresh and newer
than the current evidence graph. Timeouts, killed runs, and environment-shaped
failures do not promote automatically.

Function complexity is a risk only when at least two conservative AST
thresholds are exceeded. Static complexity does not become a finding by itself.
Async Promise executors and async callbacks on statically recognized arrays are
also risks. Promise shadowing and unknown method receivers are excluded rather
than guessed. Bare calls are reported only for unshadowed local async
declarations. Focused test syntax and direct `process.env` mutation inside a
test callback are test-scoped risks. Disabled tests remain explicit debt-marker
evidence. Style remains the responsibility of imported linter output rather
than a parallel Rekon style detector.

Error-handling assessment is intentionally narrow: empty catches, catch blocks
that only log, and explicit placeholder throws carry concrete remediation.
Rekon does not score broad catch-block or logging style preferences.
Fresh isolated coverage can enrich that same risk with function-level execution
from a bound `VerificationRun`; it does not create a second detector result. A
passing run supports a scoped target gap only when its plan declared the source
path and its coverage data contains the function with zero execution.
Import cycles are grouped by strongly connected component and remain risks
unless independent evidence proves a defect or declared architecture law is
violated.
Dependency hubs require both incoming and outgoing pressure, avoiding reports
for ordinary public facades and leaf utilities.
Capability overlap consumes public `CapabilityMap.entries` together with
`OwnershipMap` and optional `CapabilityContract` declarations. It emits an
opportunity only when one normalized capability spans multiple declared owner
systems and no contract declares that sharing.

`SecurityScanReport` results tied to the current evidence graph become risks
only when SARIF rule metadata identifies them as security-relevant. Generic
lint results are ignored by this rule, and one scanner report never promotes
automatically to a finding.

`DependencyAuditReport` entries tied to current evidence become
`security.dependencyVulnerability` risks. Complete lockfile attribution raises
confidence, but a package advisory still does not prove exploitability or
automatically create a finding.

Semantic debt uses separate judgment and corroboration stages. Exact
type-assertion, error-suppression, debt-marker, deprecation, or placeholder
signals can corroborate a matching model claim. The result remains a semantic
claim unless applicable law, reproducibility, or operator confirmation passes
the kernel promotion rule.

Diagnostic identity is structured for ESLint stylish/compact output,
TypeScript diagnostics, Vitest/Jest-style stack locations, Node TAP failure
blocks, and file-located build errors. Unsupported output retains the
conservative normalized-transcript fallback.

Imported JUnit and ESLint JSON reports use the same identity and repetition
policy. One current report produces a risk; two distinct current reports must
reproduce the same normalized failure before automatic promotion is possible.

Failed test diagnostics can carry related routes, screens, capability hints,
imported source files, and separately labeled observed execution from the
latest application `GraphSlice`. This context improves impact review but never
satisfies the repetition requirement for promotion.

File-local diagnostics can carry bounded import blast radius when the resolved
import graph cites the same `EvidenceGraph`. Graph context is evidence for
potential propagation only and does not alter promotion or severity.

## Public Surface

The default export is a Rekon capability definition with evaluator handlers and
built-in rule metadata.

## Import Boundary

Use this package as a capability. Rule and finding contracts live in
`@rekon/kernel-rulebook` and `@rekon/kernel-findings`.
