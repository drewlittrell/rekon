# @rekon/capability-js-ts

Built-in Rekon JavaScript and TypeScript evidence capability.

## Stability

Label: `experimental, public`.

The default capability export is the public surface. Extractor internals are
`internal`. See [docs/concepts/stability.md](../../docs/concepts/stability.md).

## Purpose

The capability is authored through `@rekon/sdk` exactly like a community package. It currently emits:

- `file`
- `import`
- `export`
- `symbol`
- `ownership_hint`
- `capability_hint`

## Lifecycle Fit

Runs during `Observe` and produces `EvidenceGraph` input artifacts for later
projection, evaluation, resolver fallback, and docs.

## Public Surface

The default export is a Rekon capability definition. Its manifest declares the
`evidence-provider` role, consumes `SourceFile`, and produces `EvidenceGraph`.

## Import Boundary

Use this package as a capability, not as a parser library. Do not import
package-private extractor helpers from consumers.

## Behavior

It ignores `node_modules`, `.git`, `.rekon`, `dist`, `build`, and `coverage`.
