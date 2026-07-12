# Rekon

Rekon builds verifiable repository context for AI-assisted engineering.

It scans a codebase, writes typed evidence artifacts, and packages
task-specific context so humans and coding agents can plan changes without
mixing guesses, recommendations, approvals, and proof.

Rekon is local-first and artifact-first. The CLI binary is `rekon`; it writes
its workspace under `.rekon/`; packages live under `@rekon/*`; environment
variables use the `REKON_` prefix.

## Why It Matters

AI-assisted work breaks down when a model has to infer architecture, ownership,
risk, and verification from a prompt. Rekon makes those inputs explicit:

- source observations become evidence with provenance;
- evidence becomes repository models, graphs, findings, and snapshots;
- resolver packets explain why a task is risky or which system owns a path;
- work and verification artifacts separate preparation from execution;
- publications are generated readouts, not canonical truth.

## Quick Start

```sh
npm install
npm run build

rm -rf /tmp/rekon-demo
cp -R examples/simple-js-ts /tmp/rekon-demo
rm -rf /tmp/rekon-demo/.rekon

node packages/cli/dist/index.js scan --root /tmp/rekon-demo --json
node packages/cli/dist/index.js context task --root /tmp/rekon-demo --task "Modify the greeting in src/index.ts" --path src/index.ts --provider mock --json
node packages/cli/dist/index.js resolve preflight --root /tmp/rekon-demo --path src/index.ts --goal "Modify the greeting" --json
node packages/cli/dist/index.js publish agent-contract --root /tmp/rekon-demo --json
node packages/cli/dist/index.js artifacts validate --root /tmp/rekon-demo --json
```

The demo creates typed artifacts under `/tmp/rekon-demo/.rekon/artifacts` and
validates their headers, index entries, and digests.

## Core Concepts

- **Evidence.** Facts extracted from source files and configuration, with
  provenance.
- **Artifacts.** Versioned JSON or Markdown outputs with headers, producer
  metadata, input refs, freshness, and provenance.
- **Snapshot.** The shared index of current repository intelligence.
- **Capabilities.** SDK-registered extensions that declare what they consume,
  produce, require, and invalidate.
- **Resolver packets.** Task-specific answers with `resolutionTrace` entries
  explaining source precedence, fallback, and risk.
- **Assessments.** Risks, opportunities, semantic claims, and model diagnostics
  kept separate from proven findings.
- **Publications.** Generated docs and guidance derived from artifacts.

## Architecture

```text
Source repo
  -> EvidenceGraph
  -> ObservedRepo / OwnershipMap / CapabilityMap / GraphSlice
  -> IntelligenceSnapshot
  -> FindingReport / AssessmentReport / ResolverPacket / TaskContextReport
  -> WorkOrder / VerificationPlan / Publication
  -> VerificationResult / ReconciliationLog
```

Rekon's architecture rule:

> Lower layers may feed upper layers. Upper layers may not silently become
> lower-layer truth.

## Safety Model

- Context is not proof.
- LLM output is not proof.
- Retrieval and embeddings are supporting evidence, not authority.
- Approvals are explicit.
- Verification plans do not execute commands by themselves.
- Rekon does not write source by default.
- Reconciliation remains permissioned and artifact-first.
- Generated docs and agent contracts are publications, not canonical truth.

## Documentation

- [Docs overview](docs/README.md)
- [First 10 minutes](docs/getting-started/first-10-minutes.md)
- [Artifact model](docs/artifacts/index.md)
- [Capability authoring](docs/extensions/authoring-capabilities.md)
- [Resolver packets](docs/artifacts/resolver-packet.md)
- [North Star](docs/strategy/north-star.md)
- [System model](docs/strategy/rekon-system-model.md)
- [Detection quality](docs/strategy/detection-quality.md)

## Status

Rekon is version `1.0.0`. The repository is public and the local CLI, artifact
contracts, SDK, runtime, and built-in capabilities are the current product
surface. Registry publishing and hosted surfaces are separate distribution work,
not prerequisites for using the source checkout.
