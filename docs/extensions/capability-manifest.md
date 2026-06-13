# Capability Manifest

Every Rekon capability is defined by a manifest and a `register()` function.
The manifest is the public contract used by the runtime and SDK conformance
helpers.

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

Valid roles are `evidence-provider`, `projector`, `evaluator`, `resolver`,
`publisher`, `actuator`, and `learner`.

Each declared role must register at least one matching handler.

## Consumes And Produces

`consumes` lists source or artifact types the capability expects to read.
`produces` lists artifact types it may write. Handlers cannot write undeclared
artifact types.

## Permissions

Valid permissions are:

- `read:source`
- `read:artifacts`
- `write:artifacts`
- `write:source`
- `execute:commands`
- `network:outbound`

Request the smallest set possible.

## Invalidation

`invalidatedBy` explains what makes output stale. Rules can reference artifact
`inputs`, source `paths`, or named `events`.

## Compatibility

Use `compatibility.rekon` to declare supported Rekon versions. Use
`compatibility.artifactSchemas` when the capability requires specific artifact
schema versions.

## Validation

`validateCapability()` returns structured issues. `assertCapabilityConforms()`
throws and is intended for tests.
