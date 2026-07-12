# @rekon/kernel-findings

Public finding and FindingReport contracts for Rekon governance.

## Stability

Label: `experimental, public`.

Symbols not re-exported from the package root are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

Finding reports are typed artifacts with summaries by severity and type.
They contain proven defects or applicable policy violations. Other assessment
classes live in `@rekon/kernel-assessments`.

## Lifecycle Fit

Findings are produced during `Evaluate`, consumed by `Resolve`, and summarized
by publishers and work-order generation.

## Public Surface

- `Finding`
- `FindingReport`
- finding validation helpers
- summary helpers
- root-cause fusion helpers

## Import Boundary

Import finding contracts from this package root. Rule execution and policy
logic belong in evaluator capabilities such as `@rekon/capability-policy`.
