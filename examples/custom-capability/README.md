# Custom Capability Example

This is a community-style Rekon capability that detects TODO comments and
publishes a TODO report.

It demonstrates three public SDK roles:

- `evidence-provider`: scans source files and emits `todo_comment` facts into
  the runtime `EvidenceGraph`.
- `evaluator`: reads an `EvidenceGraph` and writes a `FindingReport`.
- `publisher`: reads a `FindingReport` and writes a markdown `Publication`.

## Build

```sh
npm install
npm run build
```

## Use Locally

From a repository that has Rekon installed, add the package to
`.rekon/config.json` after installing it locally:

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

Then run:

```sh
rekon observe
rekon evaluate
rekon publish agents
```

Every artifact written by the example includes schema version, producer, input
refs, and provenance. The example capability uses the same `@rekon/sdk`
registration contract as built-in capabilities.

## Conformance Test

Capability packages should validate their public contract in tests:

```ts
import { assertCapabilityConforms } from "@rekon/sdk";
import capability from "./index.js";

await assertCapabilityConforms(capability);
```

The Rekon repository runs this check against the example in
`tests/contract/capabilities.test.mjs`.
