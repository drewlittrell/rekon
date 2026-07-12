# @rekon/capability-model

Built-in Rekon model projector.

## Stability

Label: `experimental, public`.

The default capability export is the public surface. Projector internals are
`internal`. See [docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

Consumes `EvidenceGraph` and produces:

- `ObservedRepo`
- `OwnershipMap`
- `CapabilityMap`

## Lifecycle Fit

Runs during `Project`. Resolvers and publishers should prefer these projection
artifacts over re-deriving ownership directly from raw evidence.

## Public Surface

The default export is a Rekon capability definition with a projector handler.
The package also exports the semantic-debt judgment prompt, strict response
schema, deterministic concern coercion, runtime observation builder, and pure
Istanbul coverage parser used by the CLI and model evaluator. Runtime coverage
sources can cite the exact `VerificationRun` command that produced them.
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

## Import Boundary

The capability is deterministic and uses the same public SDK as community capabilities.
Do not import projection internals from runtime or other capabilities.
