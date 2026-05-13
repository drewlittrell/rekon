# Capability Security Model

Rekon capabilities request permissions in their manifests.

Default local runtime permissions allow:

- `read:source`
- `read:artifacts`
- `write:artifacts`

Default local runtime permissions deny:

- `write:source`
- `execute:commands`
- `network:outbound`

Source-writing and command-running operations must be explicit runtime policy
decisions. Initial reconciliation is artifact-only and dry-run by default.
