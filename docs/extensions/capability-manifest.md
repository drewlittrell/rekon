# Capability Manifest

Every Rekon capability is defined by a manifest and a `register()` function.
The manifest is the public contract. The runtime and conformance harness use it
to validate handlers, permissions, artifact types, compatibility, and
invalidation behavior.

## Fields

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

## Roles

Valid roles are:

- `evidence-provider`
- `projector`
- `evaluator`
- `resolver`
- `publisher`
- `actuator`
- `learner`

A capability may declare multiple roles, but it must register at least one
handler for each declared role.

## Consumes

`consumes` lists source or artifact types the capability expects to read. Use
real artifact names where possible, such as:

- `SourceFile`
- `EvidenceGraph`
- `IntelligenceSnapshot`
- `ObservedRepo`
- `OwnershipMap`
- `GraphSlice`
- `FindingReport`
- `ResolverPacket`

## Produces

`produces` lists artifact types the capability may write. Handlers cannot write
undeclared types. If a package introduces a community artifact type, it should
register the type with `registry.artifactType()`.

## Permissions

Valid permissions are:

- `read:source`
- `read:artifacts`
- `write:artifacts`
- `write:source`
- `execute:commands`
- `network:outbound`

Request the smallest set possible. Most alpha capabilities should avoid
`write:source`, `execute:commands`, and `network:outbound`.

## Invalidation

`invalidatedBy` explains what makes the capability output stale.

```ts
invalidatedBy: [
  {
    id: "source.changed",
    description: "Evidence changes when source files change.",
    paths: ["**/*"],
  },
  {
    id: "evidence.changed",
    description: "Findings change when evidence changes.",
    inputs: ["EvidenceGraph"],
  },
]
```

Rules can reference:

- `inputs` — artifact types whose change should invalidate this output.
  The current alpha freshness validator evaluates `inputs` indirectly
  through `header.inputRefs`: if a consumer ref'd an older artifact of
  a declared input type and a newer one exists, the consumer goes
  `stale`.
- `paths` — file globs whose change should invalidate this output.
  Public intent for the future watcher; the alpha does not evaluate
  path-based invalidation.
- `events` — named events (reserved for future runtime support).

Declare conservative `invalidatedBy` rules now. A future watcher /
freshness engine will evaluate `paths` and `events` without requiring
retroactive manifest edits.

See [docs/concepts/freshness-and-invalidation.md](../concepts/freshness-and-invalidation.md)
for the full freshness model and the `rekon artifacts freshness` CLI
surface.

## Compatibility

Use `compatibility.rekon` to declare the Rekon versions the capability expects.
Alpha built-ins currently use `^0.1.0`.

## Validation

Use `validateCapability()` for structured issues and
`assertCapabilityConforms()` for tests.

```ts
import { validateCapability } from "@rekon/sdk";
import capability from "./index.js";

const result = validateCapability(capability);
```

The registry rejects:

- duplicate capability ids
- duplicate handler ids
- unknown roles
- unknown permissions
- role and handler mismatches
- undeclared handler outputs

The CLI can validate the loaded set against `.rekon/config.json`:

```sh
rekon config validate --root <repo> --json
rekon capabilities list --root <repo> --json
rekon capabilities inspect <capability-id> --root <repo> --json
```

`config validate` checks the config file's shape, capability entries,
known-permission set, and flags risky permissions
(`write:source`, `execute:commands`, `network:outbound`).

Handlers are also operable directly through the CLI:

```sh
rekon evaluate list --root <repo> --json
rekon evaluate run <evaluator-id> --root <repo> [--input-json <json>] --json

rekon resolve list --root <repo> --json
rekon resolve run <resolver-id> --root <repo> [--input-json <json>] --json

rekon publish list --root <repo> --json
rekon publish run <publisher-id> --root <repo> [--input-json <json>] --json
```

Actuator and learner generic dispatch are intentionally deferred because
actuators may perform irreversible operations and learners already have
explicit memory commands.
