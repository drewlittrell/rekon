# Capability Security Model

Rekon capabilities request permissions in their manifests.

The security model is intentionally conservative. Capabilities should
write artifacts first and leave source changes or command execution to explicit
future policy.

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

## Permission Guidance

- Prefer `read:source`, `read:artifacts`, and `write:artifacts`.
- Treat `write:source` as a high-risk permission.
- Treat `execute:commands` as a high-risk permission.
- Treat `network:outbound` as a high-risk permission.
- Keep permission requests aligned with the manifest's roles.

## Unsafe Source Writes

Do not write source files from an ordinary evidence provider, projector,
evaluator, resolver, publisher, or learner. If a future actuator writes source,
it must be permission-gated, explain what it intends to do, and write action
logs that include input refs and provenance.

## External Packages

External capability packages are loaded from local package imports listed in
`.rekon/config.json`. Installing a package means trusting its code at runtime.
Review its manifest before granting high-risk permissions.
