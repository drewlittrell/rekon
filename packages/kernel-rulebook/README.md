# @rekon/kernel-rulebook

Public Rulebook and Rule contracts for Rekon governance.

## Stability

Label: `experimental, public`.

Symbols not re-exported from the package root are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

Rulebooks are typed artifacts with `ArtifactHeader`; rules declare severity, source, target artifact types, and an evaluator id.

Evaluator-specific options remain opaque to this kernel. The evaluator that
claims a rule validates those options and ignores rules assigned to other
evaluators.
Validation requires optional `evaluator`, `enabled`, and `options` fields to
use their declared string, boolean, and object shapes.

## Lifecycle Fit

Rulebooks are inputs to `Evaluate`. Policy capabilities consume rulebooks and
snapshots to produce finding reports.

## Public Surface

- `RuleSeverity`
- `Rule`
- `Rulebook`
- rule and rulebook validation helpers

The built-in policy package currently supports `ownership.doesNotOwn` rules
that apply to `CapabilityMap` and declare `options.system` plus a glob-like
`options.capability` value.
The CLI accepts these rules under `.rekon/config.json` `rulebook.rules` and
projects them into a provenance-bearing `Rulebook` before evaluation.

## Import Boundary

Import governance contracts from this package root. Evaluator implementations
belong in capability packages, not in this kernel.
