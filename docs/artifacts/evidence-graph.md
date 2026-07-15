# EvidenceGraph

`EvidenceGraph` is the canonical evidence input artifact produced by observe.
It contains facts extracted from source files and configuration.

## Produced By

- evidence-provider capabilities such as `@rekon/capability-js-ts`
- `rekon observe`
- `rekon scan`

## Consumed By

- model projectors
- graph projectors
- policy evaluators
- resolvers as fallback evidence

## Common Fields

- `header`
- `facts[]`
- `facts[].kind`
- `facts[].subject`
- `facts[].value`
- `facts[].confidence`
- `facts[].provenance`

Unknown fact kinds are allowed. Community fact kinds should be namespaced when
they may collide with built-ins.

## Built-In Fact Kinds

| Kind | Purpose |
| --- | --- |
| `file` | source file inventory |
| `import` | import relationship evidence |
| `export` | exported symbol evidence |
| `symbol` | declared symbol evidence |
| `ownership_hint` | ownership projection input |
| `capability_hint` | capability projection input |
| `manifest` | package metadata |
| `build_target` | package lifecycle command |
| `route` | framework route convention or syntax-backed Express/NestJS route |
| `screen` | framework screen convention |
| `test` | test file and framework metadata |
| `call` | syntactically resolved callable relationship |
| `entry_point` | manifest or convention-backed repository root |
| `event_flow` | literal event emission or subscription |
| `state_access` | direct call through a recognized imported state SDK |
| `error_flow` | explicit throw or rethrow with source location, thrown identity, and enclosing branch guards where available |
| `option_flow` | same-name option override after an object spread, including fallback and callback context where available |
| `typescript:diagnostic` | compiler-reproduced source diagnostic |
| `typescript:source-quality` | AST-backed type-safety, error-handling, placeholder, validation, listener-lifecycle, async-control-flow, or test-hygiene risk signal |

All facts should preserve provenance back to the extractor and source location
where possible.

Resolved module targets are declared or file-backed. Rekon follows relative
imports, tsconfig path aliases, workspace package names, package export
subpaths, dynamic imports, and re-exports only when the destination is present
in the scanned file set. An exports map blocks guesses for undeclared package
subpaths.
