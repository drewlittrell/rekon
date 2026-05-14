# Authoring Capabilities

Capabilities are Rekon extension packages registered through `@rekon/sdk`.
Built-in capabilities and community capabilities use the same public contract.

## Roles

Each capability declares one or more roles:

- `evidence-provider`: reads source or external evidence and emits facts
- `projector`: derives model or graph artifacts from existing artifacts
- `evaluator`: evaluates artifacts and emits findings
- `resolver`: produces resolved answers such as preflight packets
- `publisher`: turns artifacts into durable publications
- `learner`: records feedback and selects applicable memory
- `actuator`: writes action-oriented artifacts such as work orders or
  reconciliation logs

## Minimal Shape

```ts
import { defineCapability } from "@rekon/sdk";

export default defineCapability({
  manifest: {
    id: "rekon-capability-example",
    name: "Example Capability",
    version: "0.1.0",
    roles: ["evidence-provider"],
    consumes: ["SourceFile"],
    produces: ["EvidenceGraph"],
    permissions: ["read:source", "write:artifacts"],
    invalidatedBy: [
      { id: "source.changed", paths: ["**/*"] },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.evidenceProvider(provider);
  },
});
```

## Manifest Contract

The manifest declares what Rekon may expect before running any handler:

- `id`: stable capability id
- `name`: human-readable name
- `version`: capability version
- `roles`: handlers the capability will register
- `consumes`: artifact or input types the capability reads
- `produces`: artifact types the capability writes
- `permissions`: runtime permissions the capability requests
- `invalidatedBy`: inputs, paths, or events that make output stale
- `compatibility.rekon`: compatible Rekon version range

See [capability-manifest.md](./capability-manifest.md).

## Consumes And Produces

`consumes` and `produces` are public contracts. If a handler writes an artifact
type, the manifest must declare it. If a capability creates a custom artifact
type, it should register that type during `register()`.

```ts
registry.artifactType({
  type: "TodoReport",
  schemaVersion: "0.1.0",
  stability: "experimental",
});
```

## Permissions

The local runtime currently allows common artifact-safe permissions by default:

- `read:source`
- `read:artifacts`
- `write:artifacts`

It denies high-risk operations by default:

- `write:source`
- `execute:commands`
- `network:outbound`

Avoid source writes in alpha capabilities. Prefer writing artifacts that a human
or a later permissioned actuator can inspect.

See [security-model.md](./security-model.md).

## Conformance

Use `validateCapability()` for non-throwing structural validation:

```ts
import { validateCapability } from "@rekon/sdk";
import capability from "./index.js";

const result = validateCapability(capability);
if (!result.ok) {
  console.error(result.issues);
}
```

Use `assertCapabilityConforms()` in tests:

```ts
import { assertCapabilityConforms } from "@rekon/sdk";
import capability from "./index.js";

await assertCapabilityConforms(capability);
```

When a test supplies artifact access, `assertCapabilityConforms()` also checks
handler writes for valid Rekon artifact headers with producer metadata, input
refs, and provenance.

## Local Testing

From this repository:

```sh
npm install
npm run build
npm run test tests/contract
```

The contract tests validate all built-in capabilities and the custom TODO
example.

## External Capability Registration

Install the capability package into the repo running Rekon, then add it to
`.rekon/config.json`:

```json
{
  "capabilities": [
    { "package": "@rekon/capability-js-ts" },
    { "package": "rekon-capability-todo-example" }
  ],
  "permissions": {
    "rekon-capability-todo-example": [
      "read:source",
      "read:artifacts",
      "write:artifacts"
    ]
  }
}
```

The CLI loads built-in package ids directly and attempts local package imports
for external package names.

Validate the config and inspect what was loaded:

```sh
rekon config validate --root <repo> --json
rekon capabilities list --root <repo> --json
rekon capabilities inspect <capability-id> --root <repo> --json
```

## Running External Handlers Through The CLI

External and built-in handlers run through the same CLI. Generic dispatch is
available for evaluators, resolvers, and publishers:

```sh
rekon evaluate list --root <repo> --json
rekon evaluate run <evaluator-id> --root <repo> [--input-json <json>] [--json]

rekon resolve list --root <repo> --json
rekon resolve run <resolver-id> --root <repo> [--input-json <json>] [--json]

rekon publish list --root <repo> --json
rekon publish run <publisher-id> --root <repo> [--input-json <json>] [--json]
```

Each `run` command finds the handler by id, ensures the relevant inputs are
ready, executes only that handler, and writes the produced artifacts through
the normal runtime artifact store. For `resolve run`, if `--input-json` does
not include a `snapshotRef`, the CLI injects the latest
`IntelligenceSnapshot` automatically.

Friendly shortcuts remain:

- `rekon evaluate` (no subcommand) runs every registered evaluator.
- `rekon resolve preflight` runs the built-in `resolve.preflight` resolver
  with `path` / `goal` flags.
- `rekon publish agents` runs `@rekon/capability-docs.publisher`.
- `rekon publish architecture` runs
  `@rekon/capability-docs.architecture-summary`, producing a Markdown
  governance summary that consumes the latest snapshot, ownership/
  capability maps, finding lifecycle, and coherency delta. See
  [../artifacts/architecture-summary-publication.md](../artifacts/architecture-summary-publication.md).
- `rekon intent work-order` runs
  `@rekon/capability-intent.work-order` with `--path` / `--goal` flags
  to derive a resolver-based work order from a `ResolverPacket`.
- `rekon intent remediation` runs
  `@rekon/capability-intent.remediation-work-order` to derive a
  governance work order from the latest `CoherencyDelta`. See
  [../concepts/remediation-work-orders.md](../concepts/remediation-work-orders.md).
- `rekon reconcile suggest` runs
  `@rekon/capability-reconcile.actuator` in suggestion mode to
  classify the latest remediation work order (or `CoherencyDelta`)
  into a `ReconciliationPlan` with per-operation class and
  permission requirements. Source-write and command operations stay
  deferred; `--apply` applies artifact-only operations only. See
  [../concepts/reconciliation-plans.md](../concepts/reconciliation-plans.md).

### Why Actuator And Learner Generic Run Are Deferred

Generic per-handler dispatch is **intentionally not provided** for actuators
and learners in the alpha:

- **Actuators** may write source files, execute commands, or perform
  irreversible operations. Exposing them behind a generic `rekon act run`
  command would surface permission-gated behavior through a single dispatch
  point without the workflow context that justifies it. Actuator execution
  stays behind the explicit `rekon intent work-order`,
  `rekon intent remediation`, and `rekon reconcile` workflows.
- **Learners** already have explicit `rekon memory add`, `rekon memory list`,
  and `rekon memory select` commands. A generic `rekon learn run` would not
  add capability without diluting the deliberate memory surface.

When a real community capability needs either, revisit the trade-off and
update this section. Until then, keep the safe surface deliberately narrow.

## What Makes A Good Community Capability

A good alpha capability:

- has a small manifest with explicit consumes and produces
- writes typed artifacts with complete headers
- preserves provenance for every fact, finding, or publication
- requests only the permissions it needs
- declares clear invalidation rules
- has conformance tests
- fails loudly when required inputs are unavailable
- avoids source writes unless the runtime policy explicitly permits them

## Reference Examples

Two runnable external capability examples ship under `examples/`:

- [TODO comment capability](../../examples/custom-capability/README.md) —
  an evidence provider + evaluator + publisher in one package.
- [Import boundary rule pack](../../examples/import-boundary-rule-pack/README.md) —
  a realistic evaluator-only rule pack mapped to classic import
  governance behavior (see
  [../strategy/classic-behavior-distillation.md](../strategy/classic-behavior-distillation.md)).

The rule-pack example is the recommended starting point for community
evaluator authors. It demonstrates how to consume `EvidenceGraph`,
produce a `FindingReport`, and be operated through
`rekon evaluate list` / `rekon evaluate run <id>` end-to-end.
