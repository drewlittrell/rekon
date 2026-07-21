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

node packages/cli/dist/index.js setup --root /tmp/rekon-demo --json
node packages/cli/dist/index.js scan --root /tmp/rekon-demo --json
node packages/cli/dist/index.js context task --root /tmp/rekon-demo --task "Modify the greeting in src/index.ts" --path src/index.ts --profile compact --provider mock --json
node packages/cli/dist/index.js resolve preflight --root /tmp/rekon-demo --path src/index.ts --goal "Modify the greeting" --json
node packages/cli/dist/index.js publish agent-contract --root /tmp/rekon-demo --json
node packages/cli/dist/index.js artifacts validate --root /tmp/rekon-demo --json
```

`setup` adds a bounded Rekon block to the demo's `AGENTS.md` without replacing
project instructions. The remaining commands create typed artifacts under
`/tmp/rekon-demo/.rekon/artifacts` and validate their headers, index entries,
and digests.

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
- **Repository law.** Committed system and flow contracts that Rekon selects
  into a task-specific `TaskPact` instead of loading every rule at startup.
- **Publications.** Generated docs and guidance derived from artifacts.

## Model Interface

Rekon keeps a short, versioned bootstrap in a managed repository's `AGENTS.md`.
It tells coding agents to request current context instead of copying ownership,
findings, or policy into a static instruction file.

The local MCP server is the model-facing context interface:

```sh
rekon mcp serve --root .
```

It advertises `context_for_task`, `resolve_source_target`, and
`validate_change`. Source-target resolution is a bounded delta for an exact
identifier found in inspected source, not general search. After editing,
`validate_change` compares the declared paths with a Git baseline and the
matched task pact, then returns blocking violations, unresolved semantic
obligations, and required checks. It does not run those checks. Older
orientation, placement, and preflight tool
names remain accepted for compatibility but are not advertised to coding
agents; their CLI commands remain available. Task-context calls check source
freshness and can update `.rekon/` artifacts before compiling a response. They
do not write repository source, run project checks, or call a model. The CLI
uses the same context compiler and remains the interface for scans and
environments without MCP. Agents use
`rekon context task ... --model-context` for the same minimal delivery payload;
operators keep `--json` for the full audit view.

For a repository without contract sources, `rekon contracts maintain --json`
prepares bounded candidates. The coding agent inspects the cited source and
resumes the same command with its judgment. Adoption writes source only when
the repository's Rekon policy permits it.

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
- Rekon does not edit implementation source by default. Setup, init, and
  refresh may maintain only the marked Rekon block in `AGENTS.md`.
- Reconciliation remains permissioned and artifact-first.
- Generated docs and agent contracts are publications, not canonical truth.

## Documentation

- [Docs overview](docs/README.md)
- [First 10 minutes](docs/getting-started/first-10-minutes.md)
- [Artifact model](docs/artifacts/index.md)
- [Capability authoring](docs/extensions/authoring-capabilities.md)
- [Resolver packets](docs/artifacts/resolver-packet.md)
- [Agent context instructions](docs/guides/agent-context-instructions.md)
- [Task context workflow](docs/guides/task-context-workflow.md)
- [Repository contracts](docs/artifacts/repository-contracts.md)
- [North Star](docs/strategy/north-star.md)
- [System model](docs/strategy/rekon-system-model.md)
- [Detection quality](docs/strategy/detection-quality.md)

## Status

Rekon is version `1.0.0`. The repository is public and the local CLI, artifact
contracts, SDK, runtime, and built-in capabilities are the current product
surface. Registry publishing and hosted surfaces are separate distribution work,
not prerequisites for using the source checkout.
