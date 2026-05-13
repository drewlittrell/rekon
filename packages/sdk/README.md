# @rekon/sdk

Public SDK for defining Rekon capabilities.

## Stability

Experimental alpha. Capability manifests and conformance helpers are public
extension contracts, but details can tighten before stable release.

## Purpose

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

## Lifecycle Fit

The SDK is how capabilities attach handlers to lifecycle roles:
evidence-provider, projector, evaluator, resolver, publisher, learner, and
actuator.

## Public Surface

The registry validates duplicate capability ids, duplicate handler ids, role/handler mismatches, unknown permissions, and undeclared handler output.

`validateCapability()` returns structured conformance issues without throwing.
`assertCapabilityConforms()` is intended for tests. It validates the manifest,
registered handlers, permissions, invalidation rules, consumed and produced
artifact types, and, when supplied with an artifact test context, verifies that
handler writes include valid Rekon artifact headers with producer metadata,
input refs, and provenance.

## Import Boundary

Capability authors should import from `@rekon/sdk` and kernel packages only.
Do not import runtime internals to define a capability.
