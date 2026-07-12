# @rekon/cli

Minimal Rekon command line interface.

## Stability

Label: `experimental, public`.

CLI command names, flags, and JSON output shapes are part of the public
contract. Internal command implementation is `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Lifecycle Fit

The CLI is the user surface for the local lifecycle:

- `rekon init`
- `rekon capabilities list`
- `rekon observe`
- `rekon project`
- `rekon evaluate`
- `rekon security ingest --sarif <report.sarif>`
- `rekon snapshot`
- `rekon resolve preflight`
- `rekon publish agents`
- `rekon memory add/list/select`
- `rekon intent work-order`
- `rekon reconcile`
- `rekon artifacts list`
- `rekon artifacts show <id>`
- `rekon artifacts validate`
- `rekon findings list`
- `rekon assessments list`
- `rekon runtime graph observe`
- `rekon verify coverage plan`

The CLI delegates lifecycle work to `@rekon/runtime`.

Security reports can be ingested from a repository-local SARIF 2.1 file after
observation:

```sh
rekon observe
rekon security ingest --sarif reports/codeql.sarif
rekon evaluate
rekon assessments list --kind risk
```

Ingestion does not execute the scanner. Results remain risks until stronger
evidence or an operator decision justifies promotion.

`rekon scan` reports findings separately from risks, opportunities, semantic
claims, and model diagnostics. Use `rekon assessments list --kind <kind>` to
inspect a class without treating it as a finding.

Embedding-backed duplication opportunities use the existing graph and
evaluation flow:

```sh
rekon capability graph build
rekon embeddings index --all
rekon capability graph build --embedding-similarity latest
rekon evaluate
rekon assessments list --kind opportunity
```

These results are comparison candidates, not findings or merge instructions.

`rekon runtime graph observe` reads `.rekon/handoff-events.jsonl`. In addition
to handoff events, instrumentation can append `execution_observation` rows to
record test-to-source and test-to-route execution. See the
[artifact reference](../../docs/artifacts/runtime-graph-observation-report.md)
for the event shape and its limits.

The same command accepts isolated Istanbul coverage with
`--istanbul-coverage <coverage-final.json> --test-path <test-file>`. The test
path is mandatory because Istanbul reports do not carry per-test attribution.
Add `--verification-run <VerificationRun:id>` to prove that a completed command
explicitly named the test. Alternatively, pass the coverage flags to
`rekon verify run --execute` to execute and bind in one flow. Dry-run coverage
binding is refused.

For an installed Vitest or Jest project, Rekon can build the isolated plan:

```sh
rekon verify coverage plan \
  --framework vitest \
  --test-path tests/user.test.ts \
  --source-path src/user.ts
rekon verify run --plan <VerificationPlan-id> --execute
```

The planner resolves the framework's local package binary, writes no source,
downloads nothing, and stores coverage under `.rekon/cache/coverage/`. Vitest
also requires an installed `@vitest/coverage-v8` or
`@vitest/coverage-istanbul` package. Jest supports `babel` and `v8` providers.
Repeat `--source-path` when the test is intended to exercise multiple source
files. Rekon records those targets so zero execution can be distinguished from
an unrelated coverage counter.

## Semantic debt profiles

Scan-time semantic-debt judgment uses OpenAI Responses with
`gpt-5.6-luna` at `low` effort by default. For the evaluated economy profile:

```sh
rekon scan --semantic-debt-model gpt-5.4-nano --semantic-debt-effort none
```

`REKON_SEMANTIC_DEBT_MODEL` and `REKON_SEMANTIC_DEBT_EFFORT` provide equivalent
environment overrides. The shared `--llm-model` and `REKON_LLM_MODEL` settings
remain fallback inputs. Provider output still passes through deterministic
artifact and policy gates.

## Embedding profile

Embedding index and retrieval commands default to `voyage-4` at 512
dimensions. The lower-cost override is:

```sh
rekon embeddings index --all --model voyage-4-lite --dimensions 512
```

After upgrading from `voyage-code-3`, rebuild once with
`rekon embeddings index --all`. Rekon rejects incompatible cached vector spaces
instead of returning zero-score or mixed-model results.

## Public Surface

The binary name is `rekon`. From a source checkout, run:

```sh
node packages/cli/dist/index.js --help
```

## Import Boundary

Do not import business logic from `@rekon/cli`. Use `@rekon/runtime` and
`@rekon/sdk` for programmatic work.
