# SecurityScanReport

`SecurityScanReport` is Rekon's normalized record of repository-native security
scanner output. The first adapter accepts SARIF 2.1.0 from tools such as CodeQL
and Semgrep without executing those tools.

## Produced By

`rekon security ingest --sarif <report.sarif>` reads a regular, repository-local
file and writes the report under `.rekon/artifacts/actions/`.

## Consumed By

The policy evaluator converts security-classified results into risks. Generic
lint results remain in the report for provenance but do not enter security
policy.

## Contract

The header cites the current `EvidenceGraph`. Reports tied to an older evidence
generation are ignored. Each run records the tool and execution status; each
result records a stable identity, rule, severity, message, repository-contained
locations, tags, fingerprints, and optional rule documentation.

```json
{
  "header": {
    "artifactType": "SecurityScanReport",
    "schemaVersion": "0.1.0",
    "inputRefs": [{ "type": "EvidenceGraph", "id": "evidence-..." }]
  },
  "source": {
    "format": "sarif",
    "path": "reports/codeql.sarif",
    "digest": "..."
  },
  "summary": { "runs": 1, "results": 4, "securityResults": 2 },
  "runs": [{
    "tool": { "name": "CodeQL" },
    "successful": true,
    "results": [{
      "id": "security-scan-result-...",
      "ruleId": "js/sql-injection",
      "severity": "critical",
      "securityRelevant": true,
      "locations": [{ "path": "src/query.ts", "startLine": 18 }]
    }]
  }]
}
```

SARIF partial fingerprints own identity when present. Otherwise Rekon hashes the
tool, rule, first location, and normalized message. External and outside-root
locations are omitted with an ingestion warning. Persisted messages are bounded
and secret-redacted, help URLs drop credentials and query strings, and opaque
fingerprint values are stored only as SHA-256 digests.

One scanner report does not automatically become a finding. Exploitability,
repository applicability, and promotion require stronger evidence or operator
confirmation.
