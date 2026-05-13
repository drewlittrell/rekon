# Authoring Capabilities

Capabilities are Rekon extension packages registered through `@rekon/sdk`.
Built-in capabilities and community capabilities use the same public contract.

## Roles

Each capability declares one or more roles:

- `evidence-provider`: reads source or external evidence and emits facts
- `projector`: derives model or graph artifacts from existing artifacts
- `evaluator`: evaluates artifacts and emits findings
- `resolver`: produces resolved answers such as preflight packets
- `publisher`: turns artifacts into durable publications
- `learner`: records feedback and selects applicable memory
- `actuator`: writes action-oriented artifacts such as work orders or
  reconciliation logs

## Minimal Shape

```ts
import { defineCapability } from "@rekon/sdk";

export default defineCapability({
  manifest: {
    id: "rekon-capability-example",
    name: "Example Capability",
    version: "0.1.0",
    roles: ["evidence-provider"],
    consumes: ["SourceFile"],
    produces: ["EvidenceGraph"],
    permissions: ["read:source", "write:artifacts"],
    invalidatedBy: [
      { id: "source.changed", paths: ["**/*"] },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.evidenceProvider(provider);
  },
});
```

## Manifest Contract

The manifest declares what Rekon may expect before running any handler:

- `id`: stable capability id
- `name`: human-readable name
- `version`: capability version
- `roles`: handlers the capability will register
- `consumes`: artifact or input types the capability reads
- `produces`: artifact types the capability writes
- `permissions`: runtime permissions the capability requests
- `invalidatedBy`: inputs, paths, or events that make output stale
- `compatibility.rekon`: compatible Rekon version range

See [capability-manifest.md](./capability-manifest.md).

## Consumes And Produces

`consumes` and `produces` are public contracts. If a handler writes an artifact
type, the manifest must declare it. If a capability creates a custom artifact
type, it should register that type during `register()`.

```ts
registry.artifactType({
  type: "TodoReport",
  schemaVersion: "0.1.0",
  stability: "experimental",
});
```

## Permissions

The local runtime currently allows common artifact-safe permissions by default:

- `read:source`
- `read:artifacts`
- `write:artifacts`

It denies high-risk operations by default:

- `write:source`
- `execute:commands`
- `network:outbound`

Avoid source writes in alpha capabilities. Prefer writing artifacts that a human
or a later permissioned actuator can inspect.

See [security-model.md](./security-model.md).

## Conformance

Use `validateCapability()` for non-throwing structural validation:

```ts
import { validateCapability } from "@rekon/sdk";
import capability from "./index.js";

const result = validateCapability(capability);
if (!result.ok) {
  console.error(result.issues);
}
```

Use `assertCapabilityConforms()` in tests:

```ts
import { assertCapabilityConforms } from "@rekon/sdk";
import capability from "./index.js";

await assertCapabilityConforms(capability);
```

When a test supplies artifact access, `assertCapabilityConforms()` also checks
handler writes for valid Rekon artifact headers with producer metadata, input
refs, and provenance.

## Local Testing

From this repository:

```sh
npm install
npm run build
npm run test tests/contract
```

The contract tests validate all built-in capabilities and the custom TODO
example.

## External Capability Registration

Install the capability package into the repo running Rekon, then add it to
`.rekon/config.json`:

```json
{
  "capabilities": [
    { "package": "@rekon/capability-js-ts" },
    { "package": "rekon-capability-todo-example" }
  ],
  "permissions": {
    "rekon-capability-todo-example": [
      "read:source",
      "read:artifacts",
      "write:artifacts"
    ]
  }
}
```

The CLI loads built-in package ids directly and attempts local package imports
for external package names.

## What Makes A Good Community Capability

A good alpha capability:

- has a small manifest with explicit consumes and produces
- writes typed artifacts with complete headers
- preserves provenance for every fact, finding, or publication
- requests only the permissions it needs
- declares clear invalidation rules
- has conformance tests
- fails loudly when required inputs are unavailable
- avoids source writes unless the runtime policy explicitly permits them

## Reference Example

See [../../examples/custom-capability/README.md](../../examples/custom-capability/README.md)
for a runnable TODO comment capability that implements an evidence provider,
evaluator, and publisher.
