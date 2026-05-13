# @rekon/capability-policy

Built-in policy evaluator for Rekon.

## Stability

Label: `experimental, public`.

The default capability export and built-in rule metadata are the public surface.
Rule evaluator internals are `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

Current rules:

- `imports.noDistImports`
- `imports.noNodeModulesRelativeImports`
- `files.noGeneratedAsSource`
- `architecture.noUnknownSystemForSourceFile`

## Lifecycle Fit

Runs during `Evaluate`, consuming snapshots and artifacts to produce
`FindingReport` artifacts. Resolvers and intent work orders can then attach
relevant findings.

## Public Surface

The default export is a Rekon capability definition with evaluator handlers and
built-in rule metadata.

## Import Boundary

Use this package as a capability. Rule and finding contracts live in
`@rekon/kernel-rulebook` and `@rekon/kernel-findings`.
