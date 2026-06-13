# Security

Rekon runs local capability code against source repositories and writes
artifacts under `.rekon/`. Treat capability manifests, runtime permissions, and
artifact validation as security-sensitive surfaces.

## Reporting

Do not open a public issue for a suspected vulnerability. Send a private report
to the maintainers once a security contact is published for the project.

## Capability Permissions

Capabilities declare the permissions they need:

- `read:source`
- `read:artifacts`
- `write:artifacts`
- `write:source`
- `execute:commands`
- `network:outbound`

Source writes, command execution, and outbound network access require explicit
permission. Rekon should remain artifact-first by default.

## Artifact Integrity

Generated artifacts should include schema version, producer metadata, input
refs, freshness, and provenance. Use `rekon artifacts validate` to check
artifact headers, index paths, and digests.
