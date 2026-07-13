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
store the deterministic digest of the written JSON payload. Entries mirror
`header.supersession.key` as `supersessionKey`; type-wide streams use `null`.
This lets family selection avoid reading every historical payload.

`rekon artifacts validate` checks the index and every indexed artifact:

- the index file exists and is an array
- every entry has `type`, `id`, `schemaVersion`, `path`, `digest`, and `writtenAt`
- `type` and `id` match `header.artifactType` and `header.artifactId`
- `schemaVersion` matches `header.schemaVersion`
- `supersessionKey`, when present, matches `header.supersession.key`
- the digest matches the parsed artifact payload using Rekon's current digest helper
- duplicate `type:id` entries are reported
- paths stay inside the repository root and under `.rekon/artifacts/`
- paths and payloads do not reference private legacy workspace paths or
  environment names

Contract tests run the public CLI smoke flow and validate every emitted artifact
file and index entry. Generated artifacts must not reference private legacy
workspace paths or environment names.

Indexes written before `supersessionKey` was introduced remain readable. Store
initialization backfills valid legacy entries from their digest-verified artifact
headers. A missing field remains a validation warning when an invalid artifact
prevents migration.
