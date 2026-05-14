# Capability Model

Rekon is extended by capabilities. A capability is a unit of pluggable
intelligence that declares what it consumes, what it produces, and what it
needs from the runtime. Built-in and community capabilities use the same
public SDK and contract.

This document describes the capability roles, the manifest contract, the
community extension model, and the trust model. It complements
[north-star.md](north-star.md) and [roadmap.md](roadmap.md).

## Rule

> A capability must declare its inputs, outputs, permissions, invalidation
> rules, and artifact types.

The runtime rejects capabilities that:

- omit roles or handlers for declared roles;
- write artifact types they did not declare in `produces`;
- request unknown permissions;
- omit `compatibility.rekon`.

## Capability Roles

Rekon defines seven roles. A capability may declare multiple roles; each
declared role must register at least one handler.

### evidence-provider

- **Consumes.** Source files via `read:source`. Optionally other evidence
  graphs if explicitly declared.
- **Produces.** `EvidenceFact` records and `EvidenceGraph` artifacts.
- **Examples.** `@rekon/capability-js-ts`, future language packs
  (`capability-py`, `capability-rb`, `capability-go`, etc.), framework packs
  for Rails, Next.js, Django, etc.
- **Permission expectations.** `read:source`, `write:artifacts`. Usually no
  `network:outbound` or `execute:commands` in the alpha.
- **Artifact expectations.** Every emitted evidence fact carries provenance
  pointing back to source (file path, range when applicable).

### projector

- **Consumes.** `EvidenceGraph`, optionally other model artifacts.
- **Produces.** Derived models: `ObservedRepo`, `OwnershipMap`,
  `CapabilityMap`, `GraphSlice` artifacts.
- **Examples.** `@rekon/capability-model`, `@rekon/capability-graph`.
- **Permission expectations.** `read:artifacts`, `write:artifacts`.
- **Artifact expectations.** Output artifacts cite the evidence inputs that
  produced them. Projectors are deterministic.

### evaluator

- **Consumes.** Models, snapshots, rulebooks.
- **Produces.** `Finding` records and `FindingReport` artifacts.
- **Examples.** `@rekon/capability-policy`, future rule packs.
- **Permission expectations.** `read:artifacts`, `write:artifacts`.
- **Artifact expectations.** Findings cite the inputs and rule ids that
  triggered them and include severity/category.

### resolver

- **Consumes.** `IntelligenceSnapshot`, derived models, findings, and
  memory selections.
- **Produces.** `ResolverPacket` artifacts with a `resolutionTrace` that
  explains source precedence, fallbacks, and risk decisions.
- **Examples.** `@rekon/capability-resolver`, future resolvers
  (`risk.evaluate`, `ownership.lookup`, `architecture.context`).
- **Permission expectations.** `read:artifacts`, `write:artifacts`.
- **Artifact expectations.** Every packet includes an auditable trace and
  refers to its input artifacts.

### publisher

- **Consumes.** Snapshot, models, findings, resolver packets.
- **Produces.** `Publication` artifacts (agent docs, summaries, generated
  guides). Publications are downstream surfaces, not canonical truth.
- **Examples.** `@rekon/capability-docs`, future publishers for dashboards,
  PR comments, or notebook exports.
- **Permission expectations.** `read:artifacts`, `write:artifacts`.
- **Artifact expectations.** Publications declare their snapshot input refs
  and remain regenerable.

### learner

- **Consumes.** Operator feedback, resolver outputs, prior memory.
- **Produces.** `OperatorFeedbackEntry`, `MemoryEvent`, `MemorySelection`
  artifacts.
- **Examples.** `@rekon/capability-memory`, future memory promotion or
  curation capabilities.
- **Permission expectations.** `read:artifacts`, `write:artifacts`. No
  `write:source`.
- **Artifact expectations.** Memory artifacts may enrich resolver output but
  must not rewrite ownership, rules, or findings.

### actuator

- **Consumes.** Findings, work orders, plans.
- **Produces.** `WorkOrder`, `VerificationPlan`, `IntentMap`,
  `ReconciliationPlan`, `ReconciliationLog`, `ActionLog` artifacts. Source
  writes require explicit `write:source` permission.
- **Examples.** `@rekon/capability-intent`, `@rekon/capability-reconcile`,
  future CI and review actuators.
- **Permission expectations.** `read:artifacts`, `write:artifacts`. Risky
  permissions (`write:source`, `execute:commands`, `network:outbound`)
  require deliberate scrutiny.
- **Artifact expectations.** Every action emits an auditable artifact trail
  even when no source is modified.

## Manifest Contract

```ts
type CapabilityManifest = {
  id: string;
  name: string;
  version: string;
  description?: string;
  roles: CapabilityRole[];
  consumes: string[];
  produces: string[];
  permissions?: CapabilityPermission[];
  invalidatedBy?: InvalidationRule[];
  compatibility: {
    rekon: string;
    artifactSchemas?: Record<string, string>;
  };
};
```

Field meaning:

- `id`. Globally unique capability id (e.g., `rekon.capability.js-ts`).
- `name`. Display name.
- `version`. Capability version, independent of `compatibility.rekon`.
- `roles`. Declared roles. At least one role with at least one registered
  handler.
- `consumes`. Artifact types the capability expects to read.
- `produces`. Artifact types the capability may write. Handlers cannot write
  undeclared types.
- `permissions`. Requested permissions. The runtime enforces the smallest
  granted set.
- `invalidatedBy`. Invalidation rules referencing `inputs`, `paths`, or
  `events`. Used by future freshness engines and by current consumers to
  know when the output is stale.
- `compatibility.rekon`. Semver range of Rekon versions the capability
  supports.
- `compatibility.artifactSchemas`. Optional map of artifact type to schema
  version expectations.

Conformance helpers:

- `validateCapability(capability)` returns a structured result.
- `assertCapabilityConforms(capability)` is for tests and throws on issues.

## Permissions

Valid permissions:

- `read:source`
- `read:artifacts`
- `write:artifacts`
- `write:source`
- `execute:commands`
- `network:outbound`

Capability authors should request the smallest set that lets handlers work.
The runtime will refuse to invoke a handler that needs a permission the
capability did not declare.

## Invalidation

`invalidatedBy` declares what makes the capability output stale. Rules can
reference:

- `inputs`: changes to specific artifact types.
- `paths`: changes to source paths or globs.
- `events`: external events (e.g., dependency updates).

The alpha runtime evaluates `inputs` indirectly through artifact lineage
(`header.inputRefs`) via `validateArtifactFreshness()` (CLI: `rekon
artifacts freshness`). `paths` and `events` rules are public intent: they
describe what *should* trigger regeneration. A future watcher / freshness
engine will evaluate them.

Capabilities should declare invalidation rules now so future runtimes can
interpret them without retroactive manifest edits. See
[../concepts/freshness-and-invalidation.md](../concepts/freshness-and-invalidation.md).

## Artifact Types

Built-in artifact types include:

- `EvidenceFact`, `EvidenceGraph`
- `ObservedRepo`, `OwnershipMap`, `CapabilityMap`
- `GraphSlice`
- `IntelligenceSnapshot`
- `Rulebook`, `Finding`, `FindingReport`
- `ResolverPacket`
- `Publication`
- `OperatorFeedbackEntry`, `MemoryEvent`, `MemorySelection`
- `WorkOrder`, `VerificationPlan`, `IntentMap`
- `ReconciliationPlan`, `ReconciliationLog`, `ActionLog`

Community capabilities may introduce new artifact types. The capability must
register them via `registry.artifactType()` and write them with valid
artifact headers (schema version, producer metadata, input refs, provenance).

## Community Extension Model

- Community capabilities live in third-party `@scope/...` packages and are
  loaded by the local runtime through `.rekon/config.json`.
- Built-in capabilities ship under `@rekon/*` and have no privileged API.
- The runtime treats community capabilities the same way as built-ins for
  validation, conformance, and permission enforcement.
- Capability authors should publish a README, manifest, and at least one
  conformance test.
- The runtime does not yet ship a marketplace or discovery layer.
  `.rekon/config.json` is the alpha discovery surface.

Two reference external capabilities ship in this repo under `examples/`
to demonstrate the pattern:

- `examples/custom-capability/` — TODO comment capability
  (evidence-provider + evaluator + publisher).
- `examples/import-boundary-rule-pack/` — realistic evaluator-only rule
  pack mapped to classic import-governance behavior.

## Trust And Security

- Capabilities are executable code. Loading an external capability is a
  trust decision. Operators must review manifests, permissions, and source
  before granting load.
- The runtime denies unknown permissions and undeclared produced types.
- Permissions `write:source`, `execute:commands`, and `network:outbound`
  require explicit operator attention before the runtime grants them.
- All capability work happens against the local `.rekon/` workspace; the
  alpha runtime does not call out to remote services.
- Memory artifacts must not overwrite ownership, rules, or findings. The
  artifact hierarchy in [north-star.md](north-star.md) is enforced by
  contract, tests, and review.

## Conformance Summary

Authoring a capability should follow:

1. Use `defineCapability(...)` from `@rekon/sdk`.
2. Declare every role with at least one handler.
3. List every consumed and produced artifact type.
4. Request the smallest set of permissions.
5. Declare invalidation rules.
6. Set `compatibility.rekon` to a real semver range.
7. Validate with `validateCapability()` or `assertCapabilityConforms()` in
   tests.
8. Provide a README that describes purpose, lifecycle fit, public surface,
   and stability.

The capability extension model is deliberately small. Most extension power
should come from the artifact hierarchy and the lifecycle, not from special
runtime hooks.

## Generic CLI Dispatch

Built-in and external handlers are operable through the same CLI surface for
the safe-by-default roles:

- `rekon evaluate list` / `rekon evaluate run <evaluator-id>`
- `rekon resolve list` / `rekon resolve run <resolver-id>`
- `rekon publish list` / `rekon publish run <publisher-id>`

For each, the CLI lists every registered handler with `id`, `capabilityId`,
and `produces`, then dispatches to a single named handler. The friendly
workflow shortcuts (`rekon evaluate`, `rekon resolve preflight`, `rekon
publish agents`) remain.

Generic dispatch for the **actuator** and **learner** roles is intentionally
deferred. Actuators may write source, execute commands, or perform
irreversible operations; learners already have explicit `rekon memory …`
commands. Both surfaces stay narrow until a real community capability needs
a wider dispatch path and a permission model that makes the wider path safe.
