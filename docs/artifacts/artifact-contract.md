# Artifact Contract

Every Rekon artifact written under `.rekon/artifacts/` must include:

- `header.artifactType`
- `header.artifactId`
- `header.schemaVersion`
- `header.generatedAt`
- `header.subject.repoId`
- `header.producer.id`
- `header.producer.version`
- `header.inputRefs`

Artifact index entries in `.rekon/registry/artifacts.index.json` must point to
existing files, mirror the artifact type and id, include the schema version, and
store the deterministic digest of the written JSON payload.

Contract tests run the public CLI smoke flow and validate every emitted artifact
file and index entry. Generated artifacts must not reference `.codebase-intel`
or `CODEBASE_INTEL`.
