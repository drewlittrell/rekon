# @rekon/kernel-findings

Public finding and FindingReport contracts for Rekon governance.

## Stability

Experimental alpha.

## Purpose

Finding reports are typed artifacts with summaries by severity and type.

## Lifecycle Fit

Findings are produced during `Evaluate`, consumed by `Resolve`, and summarized
by publishers and work-order generation.

## Public Surface

- `Finding`
- `FindingReport`
- finding validation helpers
- summary helpers

## Import Boundary

Import finding contracts from this package root. Rule execution and policy
logic belong in evaluator capabilities such as `@rekon/capability-policy`.
