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

The built-in JS/TS ownership projection is explicitly marked `inferred`: its
system labels come from observed path prefixes. It is useful for navigation and
resolver fallback, but it is not an operator declaration.

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

Semantic findings may declare the built-in problem classes
`dependency-resolution`, `cache-integrity`, `cleanup-completeness`,
`error-propagation`, or `other`. The first four become class-specific semantic
assessments only after their excerpts match current source. They remain
candidates for independent judgment, not findings.

## Lifecycle Fit

Runs during `Project`. Resolvers and publishers should prefer these projection
artifacts over re-deriving ownership directly from raw evidence.

## Public Surface

The default export is a Rekon capability definition with a projector handler.
The package also exports the semantic-debt judgment prompt, strict response
schema, versioned eligibility decision, deterministic concern coercion,
runtime observation builder, bounded embedding-neighbor search, and pure
Istanbul and LCOV coverage parsers used by the CLI and model evaluator. Runtime coverage
sources can cite the exact `VerificationRun` command that produced them.
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
