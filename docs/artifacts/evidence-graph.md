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
| `route` | framework route convention |
| `screen` | framework screen convention |
| `test` | test file and framework metadata |
| `typescript:diagnostic` | compiler-reproduced source diagnostic |
| `typescript:source-quality` | AST-backed type-safety, error-handling, placeholder, or async-control-flow risk signal |

All facts should preserve provenance back to the extractor and source location
where possible.
