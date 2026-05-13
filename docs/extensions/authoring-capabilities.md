# Authoring Capabilities

Capabilities are Rekon extension packages registered through `@rekon/sdk`.

Every capability must declare:

- roles
- consumed artifact types
- produced artifact types
- requested permissions
- compatibility
- invalidation rules

Built-in capabilities follow the same contract as community capabilities. See
`examples/custom-capability` for a complete TODO detector that registers an
evidence provider, evaluator, and publisher.

## Conformance

Use `validateCapability()` for non-throwing structural validation and
`assertCapabilityConforms()` in tests:

```ts
import { assertCapabilityConforms } from "@rekon/sdk";
import capability from "../src/index.js";

await assertCapabilityConforms(capability);
```

When a test supplies artifact access, `assertCapabilityConforms()` also checks
handler outputs for valid artifact headers, producer metadata, input refs, and
provenance.
