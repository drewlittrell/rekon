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

`ownership_hint` facts emitted by this package carry `basis: "inferred"`.
They describe path-derived grouping and do not establish declared ownership
policy.
- `typescript:diagnostic` on full scans with a valid `tsconfig.json`
- `typescript:source-quality` for AST-backed type escapes, error suppression,
  explicit placeholder implementations, and conservative async-control-flow
  hazards
- `typescript:function-metrics` for neutral measurements of named functions;
  classification remains a policy concern
- `manifest` and `build_target` for package manifests and lifecycle scripts
- `route` and `screen` for Next.js file conventions and syntax-backed Express
  and NestJS routes
- `test` for test files and recognized test frameworks
- `call` for syntactically resolved local and imported calls
- `entry_point` for manifest, route, screen, test, CLI, worker, and framework roots
- `event_flow`, `state_access`, and `error_flow` for narrow deterministic behavior signals

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
Declared tsconfig aliases, workspace package names, package export subpaths,
dynamic imports, and re-export targets resolve only when they map to a scanned
repository file. Package export maps are authoritative: undeclared subpaths are
not guessed. Express routes require a literal path on a locally constructed app
or router; NestJS routes require imported controller and HTTP decorators. Vite
roots require package metadata plus a conventional `src/main` or `vite.config`
file. Unsupported framework idioms remain absent rather than inferred.

Compiler evidence is limited to file-local syntax errors and a conservative set
of stable semantic type errors. Dependency-resolution and ambient-configuration
diagnostics are excluded. Incremental observations do not run the compiler pass.
Package-manifest evidence is also collected on full observations only.
Function metrics include executable statement count, physical size, cyclomatic
complexity, nesting, and distinct call fan-out. They are evidence, not defects.
Call evidence does not infer receiver types. State access requires a direct
binding from a recognized state SDK; event flow requires a literal event name;
error flow requires explicit throw syntax.
Local async calls are reported only when an unshadowed, locally declared async
function is used as a bare statement. Focused tests and direct `process.env`
mutation inside test callbacks remain risks, not proven defects. Tests are
included by default through the runtime and can be excluded with
`ObserveOptions.includeTests: false`.
