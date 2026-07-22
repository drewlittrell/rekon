# EvidenceGraph

`EvidenceGraph` is the canonical evidence input artifact produced by observe.
It contains facts extracted from source files and configuration.

## Produced By

- evidence-provider capabilities such as `@rekon/capability-js-ts` and
  `@rekon/capability-python`
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
| `output_flow` | AST-observed successful stdout call and its containing callable |
| `cache_flow` | cache contracts, including omitted result parameters in memoization keys and lazy Promise caches without visible rejection eviction |
| `cleanup_flow` | lifecycle function with multiple visible cleanup obligations and a fail-fast wait shape, or a dependency-bearing React effect whose Promise aggregate continuation updates state without returned cleanup |
| `dependency_flow` | dependency selection control flow, including conditional overwrite, a generic lookup that bypasses the current provider candidate, or first-match selection across multiple reference namespaces despite a visible ambiguity contract |
| `error_flow` | explicit throw/rethrow control flow, an Error-like construction that preserves a cause while selecting the default message, or a Promise/event bridge with no same-emitter error edge |
| `option_flow` | option precedence, including same-name spread overrides, logical-OR fallback to a visible same-property boolean true default, and temporary `Request` signals forwarded in place of caller-owned abort signals |
| `resource_flow` | connection-owned request retention, request closures attached to socket listeners, terminal XHR listeners without visible detachment, or explicit release evidence |
| `scope_model` | source-transform scope classifiers and binding resolution, including unmodeled lexical boundaries, name-only reference ownership, or parent-evaluated children omitted by scope-skipping visitors |
| `typescript:diagnostic` | compiler-reproduced source diagnostic |
| `typescript:source-quality` | AST-backed type-safety, error-handling, placeholder, validation, listener-lifecycle, async-control-flow, or test-hygiene risk signal |
| `python:injected_dependency` | a bounded constructor-member dependency candidate with a unique same-package class-name match |

All facts should preserve provenance back to the extractor and source location
where possible.

Resolved module targets are declared or file-backed. Rekon follows relative
imports, tsconfig path aliases, workspace package names, package export
subpaths, dynamic imports, and re-exports only when the destination is present
in the scanned file set. An exports map blocks guesses for undeclared package
subpaths.

Python absolute and relative imports resolve only when they identify one
repository file. Constructor dependency candidates require at least two stored
and called constructor members plus one same-package class-name match per
member. They retain confidence and source provenance and do not prove runtime
wiring.
