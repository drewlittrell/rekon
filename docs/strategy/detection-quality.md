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

An assessment can become a finding when confirmed or corroborated evidence is
tied to applicable law or a reproducible defect. Independent judgment alone
does not promote a finding.
Opportunities and model diagnostics do not promote automatically. Semantic
confidence alone is insufficient.

`rekon scan` runs a bounded judgment pass after its first policy evaluation.
The judge receives current source for selected unresolved candidates. Decisive
verdicts require exact source excerpts, current file digests, and the current
assessment signature. Policy then performs a final evaluation: confirmation
strengthens the assessment, rejection removes it from the current report, and
uncertain verdicts remain attached as audit evidence. Judgment cannot mutate
evidence, repository models, declared law, or source.

## Identity

The unit of reporting is one actionable remediation, represented by a stable
`rootCauseKey`. Multiple detectors strengthen that record through supporting
signals; they do not create duplicate top-level results.

Capability normalization applies the same rule before evaluation. A symbol and
an export that identify the same executable declaration become one candidate,
with both evidence facts retained as provenance.

## Quality Measures

Detection quality is measured per goal using:

- finding precision and recall against adjudicated cases;
- evidence and law-citation completeness;
- duplicate remediation rate;
- severity calibration;
- identity stability across scans;
- adjudicated usefulness for risks and opportunities.

Historical detector output may supply test cases, but it is not a product
specification or a target finding count.

Parity reporting separates finding recall from observable signal coverage. A
risk or opportunity may demonstrate that Rekon preserved a historical signal,
but it does not count as a finding. Assessment usefulness and finding precision
remain separately adjudicated quality measures.

The private-corpus benchmark writes a detailed local report and a sanitized
aggregate report. Independent adjudications remain external to the repository.
The judge may be a model or agent that inspects source and artifact evidence;
human approval is not required for the calibration loop.
Unmatched redesign cases are sampled across repositories and inspected against
bounded source excerpts before they become engineering work. The judge records
the claim verdict separately from the recommended action so a matching gap,
missing evidence source, or noisy historical claim does not automatically
become a new emitter. These judgments remain calibration input; they do not
remove cases from the parity denominator or rewrite canonical repository facts.
Model-backed file understanding follows the same boundary. A current report is
first recorded as semantic evidence in `CapabilityEvidenceGraph`; only
high-confidence capability signals with artifact citations enter
`CapabilityMap`. Lower-confidence signals remain graph context, and no semantic
signal creates ownership or declared law.
Artifact citation alone is insufficient: the cited excerpt must also match the
current source text. Rekon derives canonical line coordinates from the matched
excerpt because model-provided line numbers are advisory. Invalid excerpts
remain review context and cannot create capability nodes.
When labels are absent, precision, usefulness, severity calibration, and
identity stability are reported as insufficient evidence rather than inferred
from detector volume. `tests/bench/quality-thresholds.json` defines the minimum
evidence expected before each built-in rule is considered calibrated.

## Next Evidence Packs

Coverage should expand through evidence sources with independent proof value:

- repository-native test, lint, scanner, and dependency-audit reports;
- runtime truth for exercised paths and failures;
- graph corroboration for architecture, reachability, and ownership claims.

Each addition needs adjudicated corpus cases, a declared output class, stable
root-cause identity, and a measured precision/recall or usefulness target.
The parity corpus can declare repository-local native reports through optional
`evidenceInputs`. Rekon normalizes those reports with its existing CLI
ingestion commands and evaluates them against the current evidence graph.
Execution remains opt-in: `--capture-evidence` uses Rekon's no-shell
verification runner, bounds repetitions, and rejects writes outside declared
report or cache paths. Coverage requires an explicit `VerificationRun` and
test path before it can contribute isolated runtime context.

## Calibration Queue

The current private corpus has calibrated architecture dependency hubs,
unreferenced-export opportunities, declared debt, semantic debt, grammar and
naming rules, dependency advisories, test isolation, error suppression,
function complexity, explicit type escapes, unused imports, and unused private
members.

The remaining queue is evidence work, not a detector-count target:

- the public quality corpus now meets the five-case usefulness threshold for
  test isolation, placeholder implementations, unused private members, and
  error suppression. Error suppression has five active useful cases, while one
  not-useful display-only fallback is retained as resolved calibration history.
  Empty source files and genuine focused-test mistakes have no current positive
  case;
- repository checks now have current failing-run evidence, including repeated
  incomplete-environment cases, but still need independent complete-environment
  source failures before finding precision is calibrated; scanner results need
  repository-native reports from the same source snapshot;
- isolated runtime corroboration is proven on one real complexity assessment,
  but needs independent cases before it is considered calibrated;
- rules with no current positive corpus case remain uncalibrated rather than
  being fed synthetic production evidence.

A separate pinned public corpus broadens quality calibration without pretending
to have a historical baseline. Those repositories run in `quality-only` mode:
their findings and assessments can be judged against source, but they cannot
change parity recall or create historical gap credit. Public-corpus calibration
has already established three jurisdiction rules: fixture and scaffold trees
are not production, generated source is not a complexity hotspot, and generic
base grammar is not repository law. Package manifests also contribute declared
imports, published files, and tool hooks as reachability roots.

Vitest and Playwright extend this corpus with test-runner and browser-automation
code so test-isolation, incomplete-capability, and unused-private-member
assessments have enough independent source examples for usefulness
calibration. Their addition also proved that third-party package `dist`
entrypoints are outside the local-output import rule and that tests of
focused-test behavior are not focused-test risks.

pnpm and Next.js extend the same catalog with package-manager migration tooling
and a 21,000-file framework monorepo. They supplied independent partial-work
error paths, established that generated, compiled, and vendored source remains
evidence rather than source-quality policy, and exposed test-only relative
`node_modules` imports that do not belong in raw finding output.

New emitters are justified only by source-grounded missed signals. A zero count
for a rule is not itself a defect.

The public defect-pair corpus adds a stricter test: a useful signal must appear
on a pinned buggy revision, describe the upstream defect, and stay quiet on the
lines changed by the fix. The initial nine cases produced two source-local
assessments:
`events.inverseListenerDelegation` and
`validation.partialAllowlistMatch`. Each has one positive pair and remains
under the five-case usefulness threshold. Seven cases initially stayed in the
evidence or semantic-analysis queue because generic syntax rules would confuse
common correct code with transform scope, lifecycle obligations, resource
retention, cache integrity, option precedence, dependency precedence, or abort
semantics.

The first semantic emitter batch adds bounded `dependency-resolution` and
`cache-integrity` problem classes to current, source-cited semantic file
reports. Policy preserves them as `semantic.dependencyResolution` and
`semantic.cacheIntegrity` assessments for independent judgment. A paired live
baseline emits both upstream defects on the buggy revisions and no matching
assessment on fix-related lines. The fixed Playwright revision still surfaces
a separate cache-sidecar candidate; the benchmark reports that same-class
candidate rather than suppressing it. Changed-line overlap is an evaluation
identity check only and does not gate production assessments. The compact
baseline is `tests/bench/calibration/semantic-problem-emitter-baseline.json`.

Dependency-resolution emission is now stabilized by deterministic
`dependency_flow` facts: a loop-selected lookup result, the exit condition
after selection, and whether the mutable selection is returned after the loop.
Policy emits only the conditional-overwrite shape; the fixed unconditional
first-match exit remains silent. The semantic judge still decides whether the
visible overwrite mechanism conflicts with intended provider precedence.

A second dependency mechanism covers resolver callbacks that iterate provider
candidates but use a generic token lookup in a candidate-derived branch. The
extractor requires visible iteration and proves that the lookup omits the
current candidate. The pinned Nest pair is retained on the buggy revision and
clears when the callback returns the current provider instance. Direct review
of the pinned source and upstream regression tests supplies the judgment while
model comparison remains deferred.

The second batch adds `cleanup-completeness`. All three affected Nest shutdown
hook implementations emit source-matched candidates on the buggy revision and
remain clean after all-settled cleanup and guarded module hooks are introduced.
The paired benchmark now runs fix-related candidates through independent
judgment and requires coverage of every affected buggy path. It uses
changed-line evidence density for defect identity, so contextual citations do
not make an unrelated same-class candidate count as the upstream defect.

The third batch adds `error-propagation`. Deterministic JS/TS evidence now
records throw locations, enclosing branch guards, thrown identities, and
visible downstream identity mappings. Policy combines those observations into
a structured semantic claim, allowing the Redux abort pair to identify the
merged failure identity on the buggy revision while leaving the separate fixed
branches clean. A compound guard alone remains insufficient production
evidence, and runtime ordering remains an autonomous verification question.

Error propagation also covers Error-like constructors that preserve a supplied
cause while explicitly selecting the constructor's default message. The pinned
Playwright pair emits this evidence when an abort reason is hidden behind
generic message text and clears when the reason becomes the message. The pair
was adjudicated by direct review of the pinned source and upstream regression
tests; model comparison is deferred until the emitter set is stable.

The third error mechanism covers Promise bridges that resolve from recognized
events on one emitter and use rejection for other failures without forwarding
that emitter's `error` event. The pinned VS Code pair emits on the incomplete
zipfile bridge and clears when the fixed revision forwards the error through
the Promise reject channel. Because the repair adds a previously missing edge,
defect identity uses the structured bridge anchor rather than requiring a
changed line in the buggy revision. Direct source review supplies the judgment;
the detector does not assume that every emitter can fail.

The fourth batch adds `option-propagation`. Deterministic JS/TS evidence records
same-name overrides after option spreads, including callback ownership and
whether a nullish fallback preserves the spread value. Semantic analysis emits
only callback-backed destructive precedence candidates, and independent
judgment keeps external callback or option contracts explicit as verification
requirements. Both buggy pnpm publish paths are retained while both fixed
fallback paths remain clean.

A second option mechanism records logical-OR defaulting only when an option
member falls back to literal `true` or a same-property local default visibly
declared as `true` in a top-level `const` object. The pinned webpack pair emits
on both affected plugin files where explicit false values were coerced back to
true and clears after presence-aware defaulting. Direct source review and the
upstream regression test supply the judgment; generic logical-OR expressions
remain outside the extractor's jurisdiction.

The fifth batch closes the resource-lifetime gap with cross-file evidence rather
than a generic assignment detector. Deterministic `resource_flow` facts record
request/reply objects retained on socket, connection, or server-owned state and
explicit releases normalized to the same resource key. Policy emits
`semantic.resourceLifetime` only from a fresh, complete EvidenceGraph when a
retention has no matching release. Independent judgment keeps runtime
reachability explicit. The buggy Fastify keep-alive revision is retained as a
verification requirement, while the fixed response-boundary release suppresses
the candidate.

The sixth batch adds `scope-resolution` without introducing a generic switch
rule. Deterministic `scope_model` facts describe source-transform scope
classifiers, identifier resolvers, modeled node kinds, and unmodeled lexical
boundaries. Semantic analysis is limited to files that visibly rewrite
identifiers. The buggy Vite revision identifies `SwitchStatement` as an
unmodeled boundary, while the fixed classifier includes it and keeps the switch
discriminant outside the switch scope.

A second scope mechanism covers binding transforms that select captured values
from a set of reference names and resolve each name from one scope anchor. That
shape cannot distinguish separate reference occurrences with the same name.
The pinned Vite RSC pair retains the name-only lookup on the buggy revision and
clears after occurrence-level reference-to-declaration mapping is introduced.
Direct review of the source and upstream shadowing tests supplies the judgment.

Resource-lifetime coverage also includes request-scoped closures attached to
reusable socket listeners from inside request socket callbacks. The
docker-modem buggy revision is retained by independent judgment, while moving
the timeout listener to the request clears the fixed revision. Resource
lifetime now has two independent positive pairs.

Cross-call cache contracts are modeled through deterministic `cache_flow`
evidence rather than prompt wording. The extractor requires a returned
`getFactoryWithDefault` call whose key references at least one outer parameter,
a callback return branch that references another outer parameter absent from
that key, and a distinct later return. Policy emits the key and branch contract
as `semantic.cacheIntegrity`; autonomous judgment still decides whether the
cross-call sequence is a material defect. The pinned Yarn metadata pair retains
the buggy package-identity cache and clears after disk and network caches are
separated. Cache integrity and resource lifetime now have two independent
positive pairs.

Cleanup wait contracts are also modeled through deterministic `cleanup_flow`
evidence. The extractor is limited to explicit lifecycle function names and
visible fail-fast aggregate or sequential wait shapes. The pinned Vite pair
retains both premature-close paths and clears when both use all-settled waits.
All seven semantic classes now have two independent positive pairs.
All seven remain below the five-adjudication usefulness minimum, which is
recorded in the compact baseline rather than reduced to fit the available
data. Its token and cost totals cover the ten model-adjudicated pairs only; the
Nest candidate-bypass, Playwright error-reason, Vite RSC shadowing, and webpack
falsy-option pairs are recorded separately as direct source review.

Corpus checkouts and generated artifact bodies are disposable. Public source
coordinates, source-grounded adjudications, aggregate calibration history,
thresholds, and regression tests are the durable record. Corpus commands use
temporary checkouts by default and remove them after reports are written, so
calibration does not require retaining multi-gigabyte repository copies.

Assessment-judgment model calibration uses the pinned defect pairs without
cloning repositories. It fetches only the affected files at the buggy and fixed
commits, runs the production prompt and coercion contract, and retains only
verdict, token, cost, latency, candidate-class, and emitter-coverage summaries.
Prompts, source text, excerpts, and model rationales are not written to the
report. Buggy revisions measure confirmation or safe deferral; fixed revisions
measure rejection and unsafe confirmation.

The July 2026 paired calibration selects `gpt-5.6-luna` at low effort for this
judgment pass. It produced no unsafe decisions, accepted 15 of 18 expected
outcomes, and cost $0.098537. `claude-sonnet-5` at low effort accepted 13 of 18,
incorrectly rejected one buggy case, and cost $0.285882 at its introductory
rate. This is a task-specific nine-pair result, not a general model ranking.
At the time of that judgment-model run, seven candidate classes were emitter
gaps. All seven now have bounded emitters with paired public-defect calibration;
this closes the recorded emitter queue without making historical finding count
a target. The
durable aggregate is
`tests/bench/calibration/assessment-judgment-model-baseline.json`.

Repository-check evaluation ignores runs that are not coherent with the active
evidence state. Missing dependency cascades remain one operational assessment,
and a missing dependency proven by one command keeps sibling test or build
failures from promoting out of the same compromised run. Independent source
diagnostics inside the environment-failing command remain separately
evaluated. Vitest summaries use file-level identity so parallel output ordering
or a changed failure count does not create a new remediation. Two coherent
runs from a complete environment are still required for promotion.

The JS/TS pack treats compiler-reproduced syntax and stable type errors as
findings only when the relevant compiler environment resolves. When project
dependencies or ambient types are unresolved, Rekon retains syntax errors and
self-contained literal assignment contradictions but does not promote derived
structural type errors. Explicit `any` assertions and annotations, undocumented error
suppression, and explicit placeholder implementations remain risks because
source structure alone does not prove runtime impact or reachability. Non-null
assertions remain evidence, not standalone risks, because local control flow
often proves them safe.
Forced file removal and diagnostics attempted inside an existing error handler
are cleanup/recovery mechanics, not suppressed primary failures. Archived
source snapshots are also outside production grammar enforcement.
Void cache-write helpers with explicit cache semantics may fail open after
logging; repository or primary persistence writes do not inherit that exemption.
Logger modules may also isolate failures while writing derived telemetry output;
ordinary application modules do not inherit that exemption.
Private fields with no meaningful source read remain verified opportunities
even when unresolved imports prevent project-wide compiler diagnostics. Reads
used only to assign a value back to the same field do not establish downstream
use; consumed updates, method calls or dereferences on stored state, returns,
conditions, and dynamic property access do. When compiler and source-local
evidence identify the same field, policy fusion counts one occurrence.
An exported action-named function with an empty body is considered an explicit
placeholder only when the implementation documents that it is a no-op or a
future implementation. A public query method on a concrete exported class is
also a placeholder risk when every input is deliberately ignored and the body
returns only `null` or an empty array. Explicit null-object adapters, internal
test shims whose action is already satisfied without mutable state, and React
compound-component slot markers remain quiet. A whitespace-only production
source file is a verified low-impact opportunity rather than a defect.

Error and async-control-flow evidence accounts for visible ownership of the
failure path. An empty catch with an explicit best-effort or recovery contract
does not become an error-suppression risk. Logged failure isolation around a
callback explicitly named as a listener, hook, or `onEvent`/`_onEvent` handler
is also treated as a boundary, not suppressed application work. Nested
recovery, explicit failure returns, and documented retries retain their own
control-flow result. Loop-local presentation fallbacks also stay quiet when
both branches preserve the same visible item without attempting a write. A
detached React effect loader does not become a floating-promise risk when the
loader catches its own rejection.
Test environment mutation is suppressed when a guaranteed `finally` or
`afterEach` cleanup restores the environment. Assigning a value captured from
the same environment key back to that key is restoration, not a mutation.
Setup-only restoration remains a risk because the final test may leak state
beyond the suite.

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

Reachability projection is bounded independently from the complete import
graph. Non-test roots retain at most 100 transitive imports; test roots delegate
dependency context to the application graph. Entry metadata and provenance
report truncation and cite the import graph. This keeps large framework scans
finite without pretending omitted reachability edges do not exist. Application
graph artifact size remains a profiling target on very large test suites, not
a reason to drop evidence or manufacture a detector gap.

Repository-native security scanners enter through normalized SARIF 2.1
reports. Rekon uses scanner security metadata, CWE/OWASP tags, and stable
fingerprints; it does not treat every result from a security-capable tool as a
security issue. A current scanner result is a risk, not an automatically
promoted finding. Promotion requires independent source-grounded judgment or
evidence that establishes repository applicability, applicable law, and a
reproducible defect. A second copy of the same scanner result is not independent
corroboration. Generic lint results remain provenance only.

Runtime instrumentation can append `execution_observation` rows that identify
the source paths and routes seen while a test ran. Rekon preserves those as
separate `observed` graph edges. This is stronger context than an import alone,
but it still does not prove that an assertion covered the observed behavior and
does not participate in automatic finding promotion.

The built-in coverage adapters accept Istanbul JSON and LCOV from an isolated
test run. Because neither format retains test identity, Rekon requires the
caller to name the test path and stores that attribution with the coverage digest. It
does not infer per-test evidence from a suite-wide report.

Coverage produced by a generated isolated plan retains function ranges and the
bound `VerificationRun`. Fresh matching coverage enriches the existing
complexity root cause. Passing execution, failed-test execution, and zero
execution remain distinct; none promotes static complexity into a finding.
Generated plans also declare intended source paths. Only a passing run that
instruments a declared hotspot with zero execution supports a scoped target-gap
statement; arbitrary zero counts remain context.

Embedding `duplicate_candidate` claims become opportunities only for reciprocal
neighbors built from comparable file or capability representations. Declaration
signatures and cross-representation similarity remain context, not duplication.
Non-production paths stay out of the candidate set. Candidates remain
unverified until structural, behavioral, or independently judged evidence establishes that
the implementations are actually redundant and that consolidation has positive
value.

The production duplicate threshold is evaluated against labeled positive and
hard-negative pairs, separately from retrieval ranking. Threshold quality is
reported as precision, recall, F1, separation, stability, tokens, and cost.
Large indexes use bounded deterministic candidate generation before exact
cosine ranking; small comparable groups remain exact. Search statistics expose
the number of scored pairs against the all-pairs ceiling. Agent scratch trees
are excluded before graph and embedding construction unless the repository
explicitly overrides its scan scope.

Independent adjudication is calibration input, not repository truth. The judge
must inspect cited artifacts and relevant source before labeling correctness,
usefulness, severity, or identity stability. External labels may change
benchmark precision, recall, usefulness, thresholds, or a rule disposition.
They do not rewrite ownership, architecture, findings, or canonical evidence.
Memory remains resolver guidance unless a separate, evidence-backed
confirmation is attached to an assessment.

Assessment lifecycle is visible rather than inferred by each consumer. Reports,
CLI output, resolver packets, traces, and generated guidance distinguish model
proposals, observed evidence, tool corroboration, verification, independent
confirmation, optional opportunities, and model diagnostics. Fusion requires a
shared remediation identity, type, and scope; a coincidentally reused key is
insufficient.

## Design Decisions

### Declared Architecture

Architecture, canonical placement, ownership, and forbidden-pattern checks are
evaluated as declared-law divergence. Rekon does not recreate inferred
architecture opinions when a repository has not declared the corresponding
law. Pipeline self-disagreement is a model diagnostic, not a repository issue.

Repository ownership law enters through typed `Rulebook` artifacts. The
`ownership.doesNotOwn` evaluator joins an explicit system and capability
pattern to `CapabilityMap`, using `OwnershipMap` attribution when available.
Findings cite the law and model inputs. Missing law remains silent, and coarse
capability or ownership projections remain an evidence gap rather than a
guessed violation.
The local CLI accepts repository law under `.rekon/config.json`
`rulebook.rules`, validates it before refresh, and writes a typed `Rulebook`
with config provenance. A removed rulebook is represented by an empty
superseding artifact so historical law cannot remain silently active.

### Debt And Semantic Judgment

Deterministic markers and explicit placeholders provide source evidence.
Broader maintainability judgments remain semantic claims until corroborated.
Neither output is multiplied into separate findings for every wording variant.
Independent function-complexity measurements remain separate assessments. A
same-file complexity risk does not satisfy an unrelated historical debt concern
without construct-level evidence that both describe the same remediation.
Semantic eligibility, model judgment, deterministic corroboration, and finding
promotion are separate stages. A matching source signal can corroborate a
claim, but does not bypass the promotion gate.
Eligibility excludes generated, non-production, declaration-only, structured
data-output, and prompt-truncated inputs before provider calls.
Policy rejects semantic reports from obsolete prompt contracts and drops any
entry whose recorded source digest no longer matches the current file. The
historical artifact remains available for audit but cannot silently re-enter a
new assessment report.

Declared-root reachability is evidence, not proof that a file is dead. Dynamic
registries and external package consumers can be absent from the observed
graph, so unreferenced exports remain assessments until independent evidence
establishes removal is safe. Naming findings require a role-bearing declaration
for the same module entity; helper names do not redefine a module's role.

### Reachability And Overlap

Dead-code assessments require graph reachability and declared roots; promotion
still requires independent evidence that removal is safe. Capability overlap
and implementation similarity are opportunities until sharing intent,
behavioral equivalence, and consolidation value are established. Overlap uses
only stable normalized function and method identities, then requires their
implementation paths to span declared owners. Inferred path-prefix ownership
cannot establish this rule. Data declarations, types, and embedding-near but
semantically distinct capability names do not enter it. Universal ontology
aliases also keep filesystem paths and URLs distinct from web routes.

Unused imports enter the same goal only when TypeScript name resolution proves
that an imported binding has no source reference. Unused private members and
unreachable statements also qualify when TypeScript name resolution or control
flow proves the condition. Ordinary unused locals, scanner-truncated snippets,
negative "no dead code" observations, speculative "may be unused" prose, and
public re-export wrappers do not establish dead code.

### Naming And Anti-Patterns

Naming and structural anti-pattern findings require an applicable grammar or
declared policy. Style opinions without declared law belong in repository-native
linters, whose output Rekon may consume as evidence.

### Preservation Signals

Removed capabilities, degraded confidence, broken handoffs, and missing
outcomes are represented through drift, coverage, and verification artifacts.
They should not be inferred from file names or prose alone.
