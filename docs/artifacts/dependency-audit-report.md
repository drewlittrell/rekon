# DependencyAuditReport

`DependencyAuditReport` is Rekon's normalized dependency-vulnerability evidence.
The first adapter accepts npm audit report version 2 and joins it to
`package-lock.json` so installed versions, dependency paths, and production or
development scope remain explicit.

## Produced By

```sh
rekon security ingest --npm-audit reports/npm-audit.json
```

Use `--package-lock <path>` when the lockfile is not at the repository root.
Rekon reads existing files only; it does not run npm or persist the raw audit
payload.

## Consumed By

The policy evaluator emits one `security.dependencyVulnerability` risk per
stable package, affected-range, and advisory root cause. Audit output never
becomes a finding automatically. Exploitability and repository impact require
corroboration or operator confirmation.

## Contract

The header cites the current `EvidenceGraph`. `source` records digests for the
audit report and optional lockfile. `status.complete` is false when installed
version or scope data could not be resolved.

```json
{
  "header": {
    "artifactType": "DependencyAuditReport",
    "schemaVersion": "0.1.0",
    "inputRefs": [{ "type": "EvidenceGraph", "id": "evidence-..." }]
  },
  "source": {
    "format": "npm-audit-v2",
    "path": "reports/npm-audit.json",
    "digest": "...",
    "lockfilePath": "package-lock.json",
    "lockfileDigest": "..."
  },
  "status": { "complete": true, "warnings": [] },
  "vulnerabilities": [{
    "id": "dependency-vulnerability-...",
    "packageName": "example-package",
    "severity": "high",
    "affectedRange": "<2.0.1",
    "advisories": [{ "id": "12345", "title": "Example advisory", "cwes": [] }],
    "paths": [{
      "nodePath": "node_modules/example-package",
      "dependencyPath": ["example-package"],
      "installedVersion": "2.0.0",
      "scope": "production",
      "direct": true
    }],
    "fixAvailable": true,
    "fixVersion": "2.0.1"
  }]
}
```

Malformed records are rejected. Unsafe paths are omitted, unsupported report
versions fail ingestion, and unrecognized raw fields are not copied into the
artifact.
