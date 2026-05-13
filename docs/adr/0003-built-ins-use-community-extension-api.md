# ADR 0003: Built-Ins Use Community Extension API

## Status

Accepted

## Context

Built-in capabilities can accidentally gain privileged paths that community capabilities cannot use.

## Decision

Built-in capabilities must be authored as SDK capabilities. They register through the same `defineCapability()` and registry APIs as community packages.

## Consequences

- Built-ins are examples of the public extension path.
- Runtime shortcuts cannot become hidden capability APIs.
- Capability tests must prove manifest and handler registration behavior.
