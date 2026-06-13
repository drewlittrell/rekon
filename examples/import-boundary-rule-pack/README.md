# Import Boundary Rule Pack Example

This is an example external evaluator capability. It shows how a community rule
pack can consume `EvidenceGraph` and write a `FindingReport`.

## Rules

- `import_boundary.parent_relative_import`: flags imports that begin with
  `../`.
- `import_boundary.generated_output_import`: flags imports that target generated
  `dist/` or `build/` output.

## Build And Test

```sh
npm install
npm run build
npm --prefix examples/import-boundary-rule-pack run build
npm --prefix examples/import-boundary-rule-pack run test
```

## Capability Contract

- Role: `evaluator`
- Consumes: `EvidenceGraph`
- Produces: `FindingReport`
- Permissions: `read:artifacts`, `write:artifacts`

The capability never writes source files, executes commands, or makes network
calls.

## Related

- [Authoring capabilities](../../docs/extensions/authoring-capabilities.md)
- [Capability manifest](../../docs/extensions/capability-manifest.md)
- [Capability model](../../docs/strategy/capability-model.md)
