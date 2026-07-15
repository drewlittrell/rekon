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
- `events.inverseListenerDelegation`
- `validation.partialAllowlistMatch`
- `tests.focused`
- `tests.isolation`
- `typescript.unusedImport`
- `typescript.unusedPrivateMember`
- `typescript.unreachableCode`
- `dead_code.emptySourceFile`
- `typescript.functionComplexity`
- `repository.checkFailure`
- `security.scannerResult`
- `semantic.resourceLifetime`
- `similarity.duplicateCandidate`
- `imports.noNodeModulesRelativeImports`
- `files.noGeneratedAsSource`
- `architecture.noUnknownSystemForSourceFile`
- `architecture.importCycle`
- `architecture.dependencyHub`
- repository-declared rules using evaluator `ownership.doesNotOwn`
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

Current semantic file reports can contribute open-world problem candidates
when their source excerpts and digests match the repository. During `scan`, a
bounded judgment pass may confirm, reject, or defer those and other unresolved
assessments. Policy applies only current judgments whose assessment signature,
root cause, prompt contract, source digest, and quoted evidence still match.
Independent confirmation remains an assessment unless applicable law or
reproducible proof also satisfies the finding-promotion contract.

Resource-lifetime policy joins deterministic `resource_flow` facts across a
fresh EvidenceGraph. It emits one semantic claim when request/reply objects are
stored on connection-owned state and no matching explicit release exists.
Partial evidence graphs remain silent, and the claim still requires autonomous
judgment or runtime verification before it can be treated as a defect.

Error-propagation policy compares compound throw guards with deterministic
error-identity mappings in the same source file. It emits a semantic claim only
when distinct visible causes are merged under one identity, leaving runtime
ordering and externally visible behavior to autonomous judgment or focused
verification. Scope-resolution candidates remain bounded to source transformers
that expose both identifier rewriting and a lexical-boundary classifier.

Dependency-resolution policy consumes `dependency_flow` facts only when a loop
stores a lookup result, exits conditionally after selection, and returns that
mutable selection after iteration. An unconditional first-match exit stays
silent. Intended provider precedence remains an autonomous judgment or focused
verification question.

Completed `VerificationRun` artifacts can corroborate repository-native lint,
test, typecheck, and build failures. A failure remains a risk until the same
normalized diagnostic is reproduced by two distinct runs on the current
commit. When commit metadata is unavailable, both runs must be fresh and newer
than the current evidence graph. Timeouts, killed runs, and environment-shaped
failures do not promote automatically. Runs outside the active evidence state
remain auditable but do not enter the current evaluation. Missing-dependency
cascades collapse into one operational assessment. Vitest file summaries use
file-level identity so parallel output order and failure-count changes do not
split one remediation.

Function complexity is a risk only when at least two conservative AST
thresholds are exceeded. Static complexity does not become a finding by itself.
Async Promise executors and async callbacks on statically recognized arrays are
also risks. Promise shadowing and unknown method receivers are excluded rather
than guessed. Bare calls are reported only for unshadowed local async
declarations. Listener-removal wrappers are reported only when their entire
implementation forwards the same parameters to the inverse registration API.
Partial allowlist matching requires an allowlist-named regex, an unanchored
character class, and an explicit invalid-value branch. Focused test syntax and
direct `process.env` mutation inside a test callback are test-scoped risks.
Fixture/example trees and test-framework self-tests stay quiet when focused
syntax is the behavior under test. Disabled tests remain explicit debt-marker
evidence. Style remains the responsibility of
imported linter output rather than a parallel Rekon style detector.

`imports.noDistImports` applies to repository-local relative imports of generated
`dist` output. Third-party package entrypoints that include `dist` are package
contracts, not proof that the repository imported its own generated output.
`imports.noNodeModulesRelativeImports` likewise applies only to relative imports
in production source. Test fixtures and declaration-only harnesses do not
create raw findings.

Error-handling assessment is intentionally narrow: empty catches, catch blocks
that only log, and explicit placeholder throws carry concrete remediation.
Rekon does not score broad catch-block or logging style preferences.
Generated-file evidence and conventional `compiled`, `vendor`, or `vendored`
trees remain visible in the evidence graph but do not enter source-quality
policy.
Whitespace-only production files are opportunities unless a package manifest
declares the file as an entrypoint, where emptiness can be the public shim
contract rather than abandoned code.
Fresh isolated coverage can enrich that same risk with function-level execution
from a bound `VerificationRun`; it does not create a second detector result. A
passing run supports a scoped target gap only when its plan declared the source
path and its coverage data contains the function with zero execution.
Import cycles are grouped by strongly connected component and remain risks
unless independent evidence proves a defect or declared architecture law is
violated.
Dependency hubs require both incoming and outgoing pressure, avoiding reports
for ordinary public facades and leaf utilities.
Capability overlap prefers stable, high-confidence function and method groups
from `CapabilityNormalizationReport`, joined with `OwnershipMap` and optional
`CapabilityContract` declarations. It emits an opportunity only when one
canonical capability spans multiple declared owner systems and no contract
declares that sharing. `CapabilityMap.entries` remains a compatibility fallback
for repositories that have no normalization report. Ownership entries marked
`inferred` cannot establish this rule; path-prefix grouping alone is not an
architecture declaration.

Declared ownership law is separate from built-in policy. A `Rulebook` rule
using evaluator `ownership.doesNotOwn` must apply to `CapabilityMap` and provide
`options.system` plus a glob-like `options.capability`. Rekon emits nothing when
that law is absent. A violation cites the rulebook and capability projection;
matching ownership evidence is cited when available.
The CLI materializes `.rekon/config.json` `rulebook.rules` before evaluation.
Supersession keeps only the current configured law active while preserving old
artifacts for audit.

Compiler-proven unused imports become low-impact, verified opportunities under
`typescript.unusedImport`. They are kept separate from high-severity TypeScript
compiler-error findings and from speculative dead-code judgment.
The same boundary applies to `typescript.unusedPrivateMember` and
`typescript.unreachableCode`: compiler proof produces an opportunity, while
ordinary unused locals and public API declarations remain silent. Source-local
class analysis also preserves unused-private-field opportunities when the
project compiler environment is unresolved. Compiler and source-local evidence
for the same member are fused rather than counted twice.
Whitespace-only production source is a separate verified opportunity under
`dead_code.emptySourceFile`. Constant-empty query methods on concrete exported
classes and explicitly future empty action APIs remain placeholder risks;
named null-object adapters and intentional callback or component-slot no-ops
remain quiet.

`SecurityScanReport` results tied to the current evidence graph become risks
only when SARIF rule metadata identifies them as security-relevant. Generic
lint results are ignored by this rule, and one scanner report never promotes
automatically to a finding.

`DependencyAuditReport` entries tied to current evidence become
`security.dependencyVulnerability` risks. Complete lockfile attribution raises
confidence, but a package advisory still does not prove exploitability or
automatically create a finding. The assessment retains native advisory
severity separately from Rekon impact: production paths keep advisory
severity, development-only direct paths cap impact at high, and
development-only transitive paths cap impact at medium. Package-manager
umbrella rows that only point to other vulnerable packages remain in the
normalized audit report but do not become duplicate advisory risks.

Semantic debt uses separate judgment and corroboration stages. Exact
type-assertion, error-suppression, debt-marker, deprecation, or placeholder
signals can corroborate a matching model claim. The result remains a semantic
claim unless applicable law, reproducibility, or operator confirmation passes
the kernel promotion rule.
Policy consumes only reports from the active semantic prompt and coercion
contract whose recorded source digest still matches the repository. Obsolete or
source-stale reports remain auditable artifacts but do not produce claims.

Unreferenced exports and declared-root reachability remain risks. A root graph
can omit dynamic command registration or an externally consumed package entry,
so graph absence alone does not promote dead-code evidence to a finding.
Naming law likewise requires a role-bearing class, interface, type, or enum
whose entity matches the module stem; suffixes on secondary helpers do not
establish the module's role.

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
built-in rule metadata. The package also exports
`evaluateDeclaredOwnershipRules` and
`OWNERSHIP_DOES_NOT_OWN_EVALUATOR_ID` for rulebook-aware integrations, plus
`evaluateResourceLifetimeSignals` and `SEMANTIC_RESOURCE_LIFETIME_RULE_ID` for
cross-file lifetime evaluation.

## Import Boundary

Use this package as a capability. Rule and finding contracts live in
`@rekon/kernel-rulebook` and `@rekon/kernel-findings`.
