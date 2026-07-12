# TestReport and LintReport

`rekon checks ingest` normalizes repository-local JUnit XML and ESLint JSON into
typed artifacts. It reads existing output and never executes the test runner or
linter.

```sh
rekon observe
rekon checks ingest --junit reports/junit.xml
rekon checks ingest --eslint-json reports/eslint.json
rekon evaluate
```

Both headers cite the current `EvidenceGraph`. `source` records the format,
repository-relative path, and SHA-256 digest. `status` reports partial input.
`TestReport` retains case identity, status, location, duration, and a bounded
failure message. `LintReport` retains rule, severity, location, and message.

Raw XML/JSON, source excerpts, suggestions, captured output, and unknown fields
are not persisted. Messages pass through secret redaction. Outside-repository
paths are omitted or cause their record to be ignored.

Policy treats a failed test or lint error from one current report as a risk.
The same normalized failure must appear in two distinct current reports before
it can satisfy the existing reproducibility requirement. Warnings, skipped
tests, malformed output, and stale reports never promote automatically.
