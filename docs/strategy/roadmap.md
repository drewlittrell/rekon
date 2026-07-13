# Roadmap

Rekon is currently version `1.0.0`. The core public shape is in place: typed
artifacts, SDK capabilities, runtime, CLI, repository scan, model projection,
policy evaluation, resolver traces, publications, memory, intent artifacts,
verification recording, reconciliation planning, and artifact validation.

## Current Focus

- Keep the public product surface clear and contributor-friendly.
- Tighten artifact integrity and installability.
- Keep package exports and docs aligned with actual CLI behavior.
- Make extension authoring straightforward through examples and conformance.
- Keep the local-tarball consumer smoke green across every public package.

## Near-Term Hardening

- Publish/distribution preparation for selected public packages.
- More focused examples for custom capabilities.
- Better freshness reporting without turning docs into canonical truth.
- Clearer release notes and migration notes for users moving between versions.

## Later Expansion

- Richer language and framework packs.
- Runtime observation and drift reporting.
- Watcher-driven freshness.
- Additional CI and pull request publication surfaces.
- More mature memory curation and work-order flows.
- Permissioned source-write reconciliation for narrow, reviewable operations.
- Optional hosted or dashboard surfaces after the local substrate is solid.

Ideas in this section are direction, not a promise of shipped behavior. Current
behavior is defined by source code, CLI output, artifact schemas, and living
concept docs.
