# @rekon/sdk

Public SDK for defining Rekon capabilities.

Built-in and community capabilities use the same API:

- `defineCapability()`
- `createCapabilityRegistry()`
- `CapabilityManifest`
- handler contracts for evidence providers, projectors, evaluators, resolvers, publishers, actuators, and learners

Capabilities must declare:

- roles
- consumed artifact types
- produced artifact types
- permissions
- Rekon compatibility

The registry validates duplicate capability ids, duplicate handler ids, role/handler mismatches, unknown permissions, and undeclared handler output.
