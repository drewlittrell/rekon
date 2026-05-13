# ADR 0001: Open Source From Start

## Status

Accepted

## Context

Rekon is intended to be a public extension substrate rather than a private extraction of an existing internal tool.

## Decision

Rekon will be open-source from the first commit. Public APIs, package boundaries, examples, generated artifact formats, and contributor workflows are product surfaces.

## Consequences

- Package boundaries must be intentional before broad internal use.
- Public APIs need documentation and tests.
- Private implementation details must not leak through path aliases or service imports.
- Governance, security, and contribution files are required baseline artifacts.
