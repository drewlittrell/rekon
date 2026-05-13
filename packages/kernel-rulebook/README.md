# @rekon/kernel-rulebook

Public Rulebook and Rule contracts for Rekon governance.

## Stability

Label: `experimental, public`.

Symbols not re-exported from the package root are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

Rulebooks are typed artifacts with `ArtifactHeader`; rules declare severity, source, target artifact types, and an evaluator id.

## Lifecycle Fit

Rulebooks are inputs to `Evaluate`. Policy capabilities consume rulebooks and
snapshots to produce finding reports.

## Public Surface

- `RuleSeverity`
- `Rule`
- `Rulebook`
- rule and rulebook validation helpers

## Import Boundary

Import governance contracts from this package root. Evaluator implementations
belong in capability packages, not in this kernel.
