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
]
```

Rules can reference:

- `inputs`
- `paths`
- `events`

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
