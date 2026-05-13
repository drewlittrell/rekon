# Rekon

Rekon is an open-source intelligence substrate for codebases: evidence in, typed artifacts out, extensible capabilities around a shared repository intelligence snapshot.

Rekon is for codebase intelligence, repository intelligence, architecture-aware agent context, and governance for AI-assisted software work.

## Status

Rekon is in clean-slate alpha scaffolding. The repository currently establishes the public package boundaries, governance files, documentation spine, and workspace checks that future implementation work will build on.

## Naming Contract

- Product/system: Rekon
- Repository: `rekon`
- CLI binary: `rekon`
- Workspace directory: `.rekon/`
- Environment prefix: `REKON_`
- SDK package: `@rekon/sdk`
- Runtime package: `@rekon/runtime`
- Kernel packages: `@rekon/kernel-*`
- Capability packages: `@rekon/capability-*`
- Package scope working convention: `@rekon/*`
- Classic reference implementation: `codebase-intel-classic`

## Packages

- `@rekon/kernel-artifacts`
- `@rekon/kernel-evidence`
- `@rekon/kernel-snapshot`
- `@rekon/kernel-graph`
- `@rekon/kernel-rulebook`
- `@rekon/kernel-findings`
- `@rekon/sdk`
- `@rekon/runtime`
- `@rekon/cli`
- `@rekon/capability-js-ts`
- `@rekon/capability-policy`
- `@rekon/capability-resolver`
- `@rekon/capability-docs`
- `@rekon/capability-memory`
- `@rekon/capability-intent`
- `@rekon/capability-reconcile`

## Development

```sh
npm install
npm run typecheck
npm run test
npm run build
```

## CLI Alpha Flow

```sh
node packages/cli/dist/index.js init --root examples/simple-js-ts
node packages/cli/dist/index.js observe --root examples/simple-js-ts --json
node packages/cli/dist/index.js snapshot --root examples/simple-js-ts --json
node packages/cli/dist/index.js resolve preflight --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
```

## Architecture Rule

Lower layers may feed upper layers. Upper layers may not silently become lower-layer truth.

Docs are publications, not canonical truth. Memory enriches resolver output; it does not rewrite architecture facts directly. Reconciliation may apply accepted changes, but only through explicit artifact writes and permissioned operations.
