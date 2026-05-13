# @rekon/sdk

Public SDK for defining Rekon capabilities.

Built-in and community capabilities use the same API:

- `defineCapability()`
- `createCapabilityRegistry()`
- `validateCapability()`
- `assertCapabilityConforms()`
- `CapabilityManifest`
- handler contracts for evidence providers, projectors, evaluators, resolvers, publishers, actuators, and learners

Capabilities must declare:

- roles
- consumed artifact types
- produced artifact types
- permissions
- Rekon compatibility

The registry validates duplicate capability ids, duplicate handler ids, role/handler mismatches, unknown permissions, and undeclared handler output.

`validateCapability()` returns structured conformance issues without throwing.
`assertCapabilityConforms()` is intended for tests. It validates the manifest,
registered handlers, permissions, invalidation rules, consumed and produced
artifact types, and, when supplied with an artifact test context, verifies that
handler writes include valid Rekon artifact headers with producer metadata,
input refs, and provenance.
