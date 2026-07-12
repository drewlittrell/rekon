# @rekon/kernel-repo-model

Public repository model artifact contracts for Rekon.

## Stability

Label: `experimental, public`.

Symbols not re-exported from the package root are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

This package owns deterministic model artifacts derived from evidence:

- `ObservedRepo`
- `ObservedSystem`
- `OwnershipMap`
- `CapabilityMap`
- `RuntimeGraphObservationReport`
- `SemanticDebtJudgmentReport`
- `SecurityScanReport`

## Lifecycle Fit

Model artifacts are produced during `Project` and consumed by resolvers,
policy, docs, and intent/work-order generation.

## Public Surface

The package also exports validation helpers and normalization helpers for
systems and paths. Semantic debt report policy records provider, model, effort,
and prompt version so cached judgments retain their execution provenance.
Runtime graph observation contracts preserve instrumented execution evidence
without redefining it as coverage. Coverage source metadata records its format,
digest, explicit test attribution, accepted/ignored file counts, and optional
`VerificationRun` command provenance. Isolated sources may also retain function
ranges, execution counts, and declared source targets for downstream evidence
joins.
Security scan contracts retain normalized SARIF tool, rule, severity,
fingerprint, location, and source-digest provenance without asserting
exploitability.

## Import Boundary

These are projections, not canonical input truth. They must point back to evidence with `ArtifactRef`s.
