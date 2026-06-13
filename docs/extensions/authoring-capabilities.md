# Authoring Capabilities

Capabilities are Rekon extension packages registered through `@rekon/sdk`.
Built-in capabilities and community capabilities use the same public contract.

## Roles

- `evidence-provider`: reads source or configuration and emits evidence facts.
- `projector`: derives models or graph artifacts from existing artifacts.
- `evaluator`: evaluates artifacts and emits findings.
- `resolver`: produces resolved answers such as preflight packets.
- `publisher`: turns artifacts into durable publications.
- `learner`: records feedback and selects applicable memory.
- `actuator`: writes action-oriented artifacts such as work orders or
  reconciliation logs.

## Minimal Shape

```ts
import { defineCapability } from "@rekon/sdk";

export default defineCapability({
  manifest: {
    id: "rekon-capability-example",
    name: "Example Capability",
    version: "1.0.0",
    roles: ["evidence-provider"],
    consumes: ["SourceFile"],
    produces: ["EvidenceGraph"],
    permissions: ["read:source", "write:artifacts"],
    invalidatedBy: [{ id: "source.changed", paths: ["**/*"] }],
    compatibility: { rekon: "^1.0.0" },
  },
  register(registry) {
    registry.evidenceProvider(provider);
  },
});
```

## Manifest Contract

The manifest declares what Rekon may expect before running a handler:

- `id`
- `name`
- `version`
- `roles`
- `consumes`
- `produces`
- `permissions`
- `invalidatedBy`
- `compatibility.rekon`

If a handler writes an artifact type, the manifest must declare it. If a
capability introduces a custom artifact type, register it with
`registry.artifactType()`.

## Permissions

Most analysis capabilities need only:

- `read:source`
- `read:artifacts`
- `write:artifacts`

Treat `write:source`, `execute:commands`, and `network:outbound` as sensitive.
Prefer artifact output that a human or permissioned actuator can inspect.

## Conformance

Use `validateCapability()` for structured validation and
`assertCapabilityConforms()` in tests.

```ts
import { assertCapabilityConforms } from "@rekon/sdk";
import capability from "./index.js";

await assertCapabilityConforms(capability);
```

## Local Testing

```sh
npm install
npm run build
npm run test tests/contract
```

## External Registration

Install the capability package into the repo running Rekon, then add it to
`.rekon/config.json`.

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

Then inspect the loaded set:

```sh
rekon config validate --root <repo> --json
rekon capabilities list --root <repo> --json
rekon capabilities inspect <capability-id> --root <repo> --json
```

## What Makes A Good Capability

- It has a narrow purpose.
- It declares every input, output, permission, and invalidation rule.
- It writes typed artifacts with valid headers.
- It preserves provenance.
- It fails loudly when required inputs are unavailable.
- It avoids source writes unless the capability is specifically designed and
  permissioned for them.
