# @rekon/capability-model

Built-in Rekon model projector.

## Stability

Label: `experimental, public`.

The default capability export is the public surface. Projector internals are
`internal`. See [docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

Consumes `EvidenceGraph`, optional `CapabilityEvidenceGraph`, and optional
`CapabilityPhraseReport` inputs, then produces:

- `ObservedRepo`
- `OwnershipMap`
- `CapabilityMap`

Built-in language ownership projections are explicitly marked `inferred`: their
system labels come from observed path prefixes. They are useful for navigation
and resolver fallback, but they are not operator declarations.

High-confidence semantic capabilities enter `CapabilityMap` only when a
`CapabilityEvidenceGraph` traces them to a
`SemanticFileUnderstandingReport`. Medium- and low-confidence model signals
remain graph context. Semantic capability evidence does not create ownership;
the projection uses existing ownership entries or path fallback.
The graph also verifies each accepted capability citation against the current
source text and derives canonical line coordinates from the verified match.
Model-provided line coordinates are advisory. A matching report digest with an
absent or invalid excerpt remains review context rather than accepted
capability evidence.

`buildCapabilityEvidenceGraph()` also accepts an optional current
`EvidenceGraph`. It projects language-provider symbols and resolved
repository-file relationships while binding every emitted graph evidence row
to current source bytes. Same-file `exposes` claims describe a selected file but
do not consume its bounded related-file context budget.

Semantic findings may declare the built-in problem classes
`dependency-resolution`, `cache-integrity`, `cleanup-completeness`,
`error-propagation`, `option-propagation`, `scope-resolution`, or `other`. The
first six become class-specific semantic
assessments only after their excerpts match current source. They remain
candidates for independent judgment, not findings.

## Lifecycle Fit

Runs during `Project`. Resolvers and publishers should prefer these projection
artifacts over re-deriving ownership directly from raw evidence.

## Public Surface

The default export is a Rekon capability definition with a projector handler.
`buildRepositoryContractProjection()` compiles committed system and flow
sources into adopted artifacts and an effective registry without writing
source files.
`discoverRepositoryContractCandidates()` derives bounded, inferred system and
flow proposals from the unified repository intelligence graph. Callers may
provide current `existingFlowContracts` and validated
`RepositoryContractVerificationEvidence`, plus the inventory of indexed
runtime reports that were checked. Discovery records whether that inventory
was complete, whether topology included runtime claims, and whether isolated
coverage was actually available. A complete inventory with zero runtime or
coverage records is a structural-only proposal, not proof that deterministic
evidence cannot exist. Discovery preserves an adopted
handoff policy first, then may nominate an exact passed isolated test that
covers both stage endpoints, a current runtime-observed edge, or model judgment
as the fallback. Historical coverage selects a check; it never proves current
source. Discovery remains pure: it executes no command, calls no model
provider, and writes no source.
CLI discovery prefers literal product-command branches over a generic module
entry and follows each branch to its AST-observed stdout boundary. Test,
benchmark, audit, and maintenance-script entries remain graph evidence but are
not product-flow starts. If command evidence is unavailable, older or
unclassified product graph slices retain the module-scope fallback. A command
edge can nominate isolated coverage only when the test identity also names the
operation; covering the CLI file alone does not prove every command.
`buildRepositoryContractDriftReport()` compares adopted contracts with current
source, ownership, and flow evidence.
`buildTaskPact()` selects the adopted system and end-to-end flow law for one
task. `selectTaskContractGuidance()` maps that pact, plus matching capability
rules, into the shared context constraints, required paths, and checks.
`validateChange()` is the pure post-edit decision helper. Hosts supply Git and
current-source evidence; it returns deterministic blockers, typed proof
obligations, bound verifier results, and required checks without writing or
executing. Repository purpose, user outcomes, invariants, prohibitions, and
handoff semantics require explicit judgment. A handoff edge may be supported by
the exact checks and methods declared by its flow contract; undeclared methods
do not count, sibling edges do not share exact checks, and a refuted accepted
result always blocks completion. Contracts without an explicit verifier policy
retain the compatible test/runtime/model fallback.
Checks come from task guidance and the system, flow, and capability contracts
intersected by the observed diff. If scoped contract bodies are unavailable,
the helper retains the complete TaskPact check set and marks that fallback in
`checkSelection`.
`classifyTaskOperation()` is the shared CLI/MCP policy for task class, risk,
evidence completeness, context profile, and intent mode. It keeps complete
local work compact, escalates context only for incomplete evidence or an
explicit validation failure, and routes high-risk work through the existing
work-order flow.
`compileTaskContext()` is the shared, budget-aware context compiler used by the
CLI and MCP. Its `compact`, `standard`, and `deep` profiles bound selected core
context, supporting context, constraints, checks, evidence, and selection
trace. `renderTaskContextMarkdown()` renders the same compiled packet for human
readers; adapters must not maintain a separate selection policy.
`projectModelContext()` retains the explainable audit projection.
`projectModelContextDelivery()` removes repeated routing and provenance fields
for model consumption while preserving the selected read order, pacts, checks,
supporting inference, and warnings. `estimateModelContextDeliveryTokens()` is
the deterministic size guard used by the interface evaluation.
When deterministic graph evidence includes an exact path, line, and excerpt,
the compiler also selects at most one source span per delivered path. Every
span includes the SHA-256 of the source text used to produce that evidence.
Compact, standard, and deep profiles cap span count and total characters.
Spans point to the likely entry region; they do not replace source inspection
or admit model-derived evidence across the deterministic trust boundary.
For extension and placement tasks, cached similarity may additionally propose
one repository exemplar. Its selection remains inference while its bounded
source excerpt must be deterministic and digest-bound. The exemplar is omitted
when the packet budget cannot carry it.
Compiled file routes include a deterministic role, necessity class, and reason.
Required task targets, repository law, handoffs, implementation paths, and
tests stay in the initial read set. Conditional dependencies and compatibility
callers remain available with an explicit condition. Inference-only routes are
supporting context.
The opt-in `tiered`, `role-aware`, `summary-aware`, and `navigation-only`
delivery policies are experimental and evaluation-only. On the six-case deterministic gate,
`role-aware` reduced the
initial mandatory set from 25 paths to 15 while retaining all 30 selected
routes. No model was called for that gate, so it does not establish fewer
actual reads, lower token use, or preserved change quality. A separate
three-repeat Sol/xhigh canary on an independent configuration task preserved
quality but inspected both conditional routes in every run and used more
tokens than `full`. A follow-up additive-helper canary marked the unchanged
dependency and caller optional in its oracle; role-aware still used all six
optional-route opportunities across three runs, while full left one unused.
The default remains `full`, and conditional labels are not an accepted
context-reduction mechanism.

`summary-aware` removes deterministic conditional paths and emits bounded,
pathless route decisions instead. Two three-run Sol/xhigh variants preserved
quality but still inspected every omitted route once required files exposed
their imports. This policy is retained for reproducibility, not promotion.
Exact fresh capability contracts also failed to replace those reads, including
when a dependency path was hidden behind an import alias. The alias case did
reduce unrelated package and test-runner discovery, so contracts remain useful
for bounded navigation and change correctness rather than as source substitutes.
`navigation-only` removes conditional routes and summaries while retaining
required files, normative constraints, checks, and inference-only support. Its
first paired probe produced a smaller payload and narrower repository exposure,
but Sol still inspected the omitted dependency and used more commands and
tokens. It is retained for evaluation and is not enabled by default.

Task-ranked graph expansion is capped at four claims per selected path.
The compiler also admits at most two task-signaled deterministic symbolic
routes through a shared capability or typed contract producer/consumer edge.
This keeps known implementation targets in the initial read set without
opening general two-hop expansion. Symbolic routes do not cross source-language
families unless the task names the target language, exact path, or
cross-language coordination.
Explicit `npm`, `pytest`, and `go test` commands remain unexecuted verification
hints, and preservation clauses remain operator-trust pact context.
Post-edit `validateChange()` keeps declared checks authoritative and may fill
uncovered changed-source test scope from exact commands in linked, passed
isolated coverage observations. Its deterministic greedy selector minimizes
added commands. Historical observations select a check; only a fresh,
digest-bound result proves it. Failed, stale, incomplete, and missing checks
produce bounded proof-local corrective context tied to the exact paths and
flow-edge obligations the check can satisfy.
`selectTaskContractGuidance()` adds only path-matched `CapabilityContract`
rules as declared, freshness-aware constraints and checks. Required neighbor
capabilities route to their graph-declared implementation files. Literal pact
values such as domain errors, event names, ordering rules, and commands are
preserved without adapter paraphrase.
`selectTaskContextRefinement()` provides the shared MCP/CLI refinement policy.
It requires an anchor plus a named dependency, dependent, test, contract,
consumer, producer, or implementation relationship; follows only deterministic graph edges; excludes
already-read paths; and returns an explicit unresolved result instead of broad
or semantic fallback. It is a fallback for targets absent from the compiled
packet, not a required round trip for routes the compiler already knows.

The package also exports the semantic-debt judgment prompt, strict response
schema, versioned eligibility decision, deterministic concern coercion,
runtime observation builder, bounded embedding-neighbor search, and pure
Istanbul and LCOV coverage parsers used by the CLI and model evaluator. Runtime
coverage sources can cite the exact `VerificationRun` command that produced
them. An attributed test path is excluded from observed source by default, but
is retained when the plan explicitly names that same path as a source target;
this supports standalone executable smoke flows without admitting ordinary test
implementation as product coverage.
`findEmbeddingNeighbors()` keeps small groups exact and uses deterministic
candidate generation for large groups before exact cosine ranking. Callers must
group vectors by provider, model, dimensions, and representation kind.
Semantic-debt eligibility excludes structured output data and files larger than
the bounded prompt instead of asking a model to judge generated records or
partial source. Unchanged judgments can be reused across eligibility revisions
after current eligibility is rechecked.
The Istanbul parser also retains normalized function ranges and execution
counts for explicitly isolated runs, plus source targets declared by generated
verification plans.
The pure SARIF 2.1 parser normalizes repository-native scanner output into
`SecurityScanReport`, classifies only explicitly security-marked results, and
rejects locations outside the repository.
The dependency audit adapters normalize npm audit v2, pnpm 11 audit JSON, Yarn
audit NDJSON, and OSV-Scanner JSON into `DependencyAuditReport`. The npm adapter
joins `package-lock.json` package entries to retain installed versions and
dependency scope; other adapters preserve only the metadata their native
formats prove. Unsupported or incomplete input is reported explicitly, and raw
audit payloads are not retained.
The JUnit XML and ESLint JSON adapters produce typed test and lint reports from
repository-local tool output. Only normalized cases and diagnostics are kept;
raw logs, source excerpts, suggestions, and unknown payload fields are dropped.

## Import Boundary

The capability is deterministic and uses the same public SDK as community capabilities.
Do not import projection internals from runtime or other capabilities.
