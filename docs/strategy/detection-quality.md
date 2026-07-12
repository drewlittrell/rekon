# Detection Quality

Rekon reports engineering intelligence according to what the evidence proves,
not according to how many detectors fired.

## Output Classes

- **Finding:** a reproducible defect or violation of applicable declared law.
- **Risk:** an evidence-backed condition whose impact is not yet proven.
- **Opportunity:** an optional improvement with tradeoffs.
- **Semantic claim:** model judgment awaiting corroboration or confirmation.
- **Model diagnostic:** missing, conflicting, or low-confidence repository intelligence.

Only findings belong in `FindingReport`. The other classes use
`AssessmentReport` until additional evidence makes promotion appropriate.

## Promotion

An assessment can become a finding when an operator confirms it, or when
corroborated evidence ties it to applicable law or a reproducible defect.
Opportunities and model diagnostics do not promote automatically. Semantic
confidence alone is insufficient.

## Identity

The unit of reporting is one actionable remediation, represented by a stable
`rootCauseKey`. Multiple detectors strengthen that record through supporting
signals; they do not create duplicate top-level results.

## Quality Measures

Detection quality is measured per goal using:

- finding precision and recall against adjudicated cases;
- evidence and law-citation completeness;
- duplicate remediation rate;
- severity calibration;
- identity stability across scans;
- operator usefulness for risks and opportunities.

Historical detector output may supply test cases, but it is not a product
specification or a target finding count.

The private-corpus benchmark writes a detailed local report and a sanitized
aggregate report. Operator adjudications remain external to the repository.
When labels are absent, precision, usefulness, severity calibration, and
identity stability are reported as insufficient evidence rather than inferred
from detector volume. `tests/bench/quality-thresholds.json` defines the minimum
evidence expected before each built-in rule is considered calibrated.

## Next Evidence Packs

Coverage should expand through evidence sources with independent proof value:

- runtime truth for exercised paths and failures;
- graph corroboration for architecture, reachability, and ownership claims.

Each addition needs adjudicated corpus cases, a declared output class, stable
root-cause identity, and a measured precision/recall or usefulness target.

The JS/TS pack currently treats compiler-reproduced syntax and stable type
errors as findings. AST-observed type escapes, error suppression, and explicit
placeholder implementations remain risks because source structure alone does
not prove runtime impact or reachability.

Async control-flow checks are similarly conservative. Rekon reports async
Promise executors only when `Promise` is not shadowed, and async callbacks on
synchronous array methods only when the receiver is statically recognizable as
an array. A bare call is reported only for an unshadowed local async declaration;
imported functions and inferred promise-returning functions are not guessed.
These are risks until execution or a repository-native check proves impact.

Test hygiene follows the same rule. Explicit focused-test syntax and direct
`process.env` mutation inside a test callback are risks. Disabled tests remain
declared debt. Rekon does not infer broader isolation failures from naming or
shared imports. Source style is delegated to repository-native linters, whose
structured output can be ingested and corroborated.

Framework evidence is deterministic and bounded. Next.js uses file
conventions, Express requires a literal route on a locally constructed app or
router, NestJS requires imported controller and HTTP decorators, and Vite roots
require manifest evidence plus conventional files. Unsupported routing DSLs
stay unresolved.

Function complexity follows the same distinction. Rekon reports a risk only
when at least two function-level AST measurements agree across cyclomatic
complexity, executable statement count, nesting, and call fan-out. Large or branch-heavy functions do
not report on one metric alone, and test or generated code is excluded.

Resolved repository import edges support one risk per strongly connected
component. Type-only edges and non-production files are excluded. The graph
proves the cycle, but a cycle is not a defect without applicable law or runtime
impact.

The same graph identifies dependency hubs only when both incoming and outgoing
value or type imports are high. Type contracts count because their changes
propagate to consumers. One-sided public facades and leaf utilities remain
quiet. A hub is a change-amplification risk, not an instruction to split a
deliberate stable boundary.

Completed `VerificationRun` artifacts and imported JUnit or ESLint JSON reports
provide repository-native lint, test, typecheck, and build evidence. One
failure remains a risk. Rekon promotes a failure only when two distinct current
artifacts reproduce the same normalized diagnostic on
the commit represented by the current evidence graph. If commit metadata is
unavailable, both runs must be fresh and recorded after the current evidence
graph. Timeouts, killed runs, empty output, stale runs, and environment-shaped
failures remain risks.

Source-quality risks use a stricter join: the check output must name the source
location and contain a diagnostic phrase specific to that source signal. A
failure elsewhere in the same file does not corroborate the signal.

Rekon derives stable per-diagnostic identities from ESLint stylish and compact
output, TypeScript diagnostics, Vitest/Jest-style stack locations, Node TAP
failure blocks, and file-located build errors. Timing and timestamp noise do not
change those identities. Multiple diagnostics from one command remain separate
remediation units. Unknown formats fall back to a normalized whole-transcript
identity and retain the same two-run promotion threshold.

Application graph projection connects tests to resolved import dependencies and
to routes, screens, and capability hints that share those dependencies. Policy
attaches this context to test failures for impact review. Static relationships
do not prove execution or coverage and cannot make a failure promotion-eligible.

File-local repository-check diagnostics can also carry bounded import blast
radius from an import graph that cites the current evidence graph. Direct and
transitive dependents explain potential change propagation; they do not change
severity, prove causation, or make a failure promotion-eligible.

Call and reachability graphs contain only syntax-resolved local or import-bound
calls and manifest/convention-backed roots. Literal event flow, recognized
state-SDK access, and explicit throw syntax are separate behavior edges. These
graphs improve impact explanations and dead-code reachability; they do not
raise severity or prove runtime execution.

Repository-native security scanners enter through normalized SARIF 2.1
reports. Rekon uses scanner security metadata, CWE/OWASP tags, and stable
fingerprints; it does not treat every result from a security-capable tool as a
security issue. A current scanner result is a risk, not an automatically
promoted finding. Promotion requires an operator confirmation or independent
evidence that establishes repository applicability, applicable law, and a
reproducible defect. A second copy of the same scanner result is not independent
corroboration. Generic lint results remain provenance only.

Runtime instrumentation can append `execution_observation` rows that identify
the source paths and routes seen while a test ran. Rekon preserves those as
separate `observed` graph edges. This is stronger context than an import alone,
but it still does not prove that an assertion covered the observed behavior and
does not participate in automatic finding promotion.

The built-in coverage adapters accept Istanbul JSON and LCOV from an isolated
test run. Because neither format retains test identity, Rekon requires the operator to
name the test path and stores that attribution with the coverage digest. It
does not infer per-test evidence from a suite-wide report.

Coverage produced by a generated isolated plan retains function ranges and the
bound `VerificationRun`. Fresh matching coverage enriches the existing
complexity root cause. Passing execution, failed-test execution, and zero
execution remain distinct; none promotes static complexity into a finding.
Generated plans also declare intended source paths. Only a passing run that
instruments a declared hotspot with zero execution supports a scoped target-gap
statement; arbitrary zero counts remain context.

Embedding `duplicate_candidate` claims become opportunities after reciprocal
pair deduplication. They remain unverified until structural, behavioral, or
operator evidence establishes that the implementations are actually redundant
and that consolidation has positive value.

The production duplicate threshold is evaluated against labeled positive and
hard-negative pairs, separately from retrieval ranking. Threshold quality is
reported as precision, recall, F1, separation, stability, tokens, and cost.

Operator adjudication is calibration input, not repository truth. External
labels may change benchmark precision, recall, usefulness, thresholds, or a
rule disposition. They do not rewrite ownership, architecture, findings, or
canonical evidence. Operator memory remains resolver guidance unless a
separate, explicit confirmation is attached to an assessment.

## Design Decisions

### Declared Architecture

Architecture, canonical placement, ownership, and forbidden-pattern checks are
evaluated as declared-law divergence. Rekon does not recreate inferred
architecture opinions when a repository has not declared the corresponding
law. Pipeline self-disagreement is a model diagnostic, not a repository issue.

### Debt And Semantic Judgment

Deterministic markers and explicit placeholders provide source evidence.
Broader maintainability judgments remain semantic claims until corroborated.
Neither output is multiplied into separate findings for every wording variant.
Semantic eligibility, model judgment, deterministic corroboration, and finding
promotion are separate stages. A matching source signal can corroborate a
claim, but does not bypass the promotion gate.

### Reachability And Overlap

Dead-code conclusions require graph reachability and declared roots. Capability
overlap and implementation similarity are opportunities until sharing intent,
behavioral equivalence, and consolidation value are established.

### Naming And Anti-Patterns

Naming and structural anti-pattern findings require an applicable grammar or
operator policy. Style opinions without declared law belong in repository-native
linters, whose output Rekon may consume as evidence.

### Preservation Signals

Removed capabilities, degraded confidence, broken handoffs, and missing
outcomes are represented through drift, coverage, and verification artifacts.
They should not be inferred from file names or prose alone.
