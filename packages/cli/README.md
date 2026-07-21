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
- `rekon contracts maintain/bootstrap/compile/discover/judge/adopt/reconcile`
- `rekon checks ingest --junit <report.xml>`
- `rekon checks ingest --eslint-json <report.json>`
- `rekon security ingest --sarif <report.sarif>`
- `rekon security ingest --npm-audit <audit.json> [--package-lock <package-lock.json>]`
- `rekon security ingest --pnpm-audit <audit.json>`
- `rekon security ingest --yarn-audit <audit.ndjson>`
- `rekon security ingest --osv <results.json>`
- `rekon snapshot`
- `rekon resolve preflight`
- `rekon publish agents`
- `rekon memory add/list/select`
- `rekon intent status`
- `rekon intent work-order`
- `rekon reconcile`
- `rekon artifacts list`
- `rekon artifacts show <id>`
- `rekon artifacts validate`
- `rekon artifacts freshness`
- `rekon findings list`
- `rekon assessments list`
- `rekon runtime graph observe`
- `rekon verify coverage plan`

The CLI delegates lifecycle work to `@rekon/runtime`.

`rekon contracts maintain` is the resumable agent workflow. Its first call
prepares current system and flow candidates. The coding agent inspects cited
source and reruns it with `--input`; `--apply` adopts eligible contracts only
when source writes are enabled in policy, then compiles and reconciles them.
The narrower `bootstrap`, `judge`, `adopt`, and `reconcile` commands remain
available for explicit lifecycle control. No stage calls a model provider.

## Model Interface

`rekon setup` installs a versioned Rekon block in the repository's root
`AGENTS.md`. `rekon init` and `rekon refresh` keep that block current. Rekon
preserves project-owned text outside its markers.

```sh
rekon agent-instructions check
rekon agent-instructions sync
rekon agent-instructions remove
```

Configure this behavior in `.rekon/config.json`:

```json
{
  "agentInstructions": {
    "enabled": true,
    "target": "AGENTS.md",
    "sync": "on-refresh"
  }
}
```

The v1 target is the root `AGENTS.md`. Use `sync: "manual"` to stop automatic
refresh updates, or `enabled: false` to opt out. `rekon agent-contract export`
continues to support standalone files such as `AGENTS.rekon.md`; it will not
replace protected instruction files.

`rekon context task --profile compact|standard|deep` and MCP
`context_for_task` share the same budgeted compiler. Both check task-local
freshness before compiling context; stale source evidence triggers an
incremental refresh of Rekon artifacts. The CLI host owns those writes. Neither
surface writes repository source or executes project commands. Use
`--no-auto-refresh` only to inspect existing artifact state. When the capability
graph binds a requested path to a configured `CapabilityContract`, both
surfaces include its declared pacts and required checks. Adopted system or flow
law is selected through the same `TaskPact` rules.

CLI JSON reports the check as `artifactFreshness.status`: `current`,
`refreshed`, or `unchecked` when `--no-auto-refresh` is set.

Managed instructions require this request at task start, after context
compaction or restart, and whenever the goal or known path scope materially
changes. Dynamic repository law stays out of the root instruction file.

Use `rekon context task ... --model-context` for the minimal JSON payload sent
to a model. When exact deterministic evidence exists, the payload includes
bounded `sourceSpans` for delivered `readFirst` paths. Normal `--json` retains
the full audit-oriented `agentContext`, including evidence, routing reasons,
budgets, and selection trace.

Use `rekon context refine` only after the initial reads expose a specific
unresolved source identifier. Supply `--question`, the exact `--target`,
`--relationship`, an `--anchor-path` or `--anchor-symbol`, and repeatable
`--already-read` paths. The command returns only new deterministic neighbors
and matched contract guidance; it does not invoke embedding or model providers
and does not write an artifact.

`rekon intent status` selects one coherent intent lineage. Pinned assessment or
prepared-plan refs prevent proof from another intent from satisfying status.
Use `--json` to inspect the selected and missing refs under `lineage`.

Intent assessment accepts `bug`, `feature`, `refactor`, `investigation`,
`migration`, and `documentation`. Verification proof is opt-in through the
`--verification-plan`, `--verification-run`, and `--verification-result`
flags; unrelated historical proof is not selected automatically.
`intent prepare` preserves that boundary: it accepts an explicit
`--verification-result` or a result already cited by the selected assessment,
never the unrelated latest result in the store.

`rekon artifacts freshness` prints a concise stale/partial summary by default
and returns the complete issue structure with `--json`.

Security reports can be ingested from a repository-local SARIF 2.1 file after
observation:

```sh
rekon observe
rekon security ingest --sarif reports/codeql.sarif
rekon security ingest --npm-audit reports/npm-audit.json
rekon security ingest --pnpm-audit reports/pnpm-audit.json
rekon security ingest --yarn-audit reports/yarn-audit.ndjson
rekon security ingest --osv reports/osv-scanner.json
rekon evaluate
rekon assessments list --kind risk
```

The dependency adapters normalize npm audit v2, pnpm 11 audit JSON, Yarn audit
NDJSON, and OSV-Scanner JSON. Ingestion does not execute scanners or package
managers. Results remain risks
until stronger evidence or an operator decision justifies promotion.

`checks ingest` and `security ingest` accept
`--verification-run <VerificationRun:id>`. The selected run must belong to the
same repository and becomes an explicit input ref on the imported report.

`rekon scan` reports findings separately from risks, opportunities, semantic
claims, and model diagnostics. Use `rekon assessments list --kind <kind>` to
inspect a class without treating it as a finding.

When semantic file analysis is enabled, scan writes those reports before
projection. The same run builds `CapabilityEvidenceGraph`, projects only
high-confidence artifact-backed capability signals, evaluates policy, and
records the model inputs in snapshot lineage. `rekon refresh` also rebuilds the
capability graph from current source and any current semantic reports already
in the workspace.
Semantic file analysis uses OpenAI Responses with `gpt-5.6-luna` at `low`
effort by default. `--llm-model` and `REKON_LLM_MODEL` can select another model;
older OpenAI models continue to use Chat Completions when required.

After the first policy pass, `scan` independently judges a bounded set of
unresolved risks and semantic claims using the same semantic mode and shared
provider/model settings. Decisive judgments require an exact excerpt from a
current, repository-contained source file. Rekon then evaluates policy again:
confirmed candidates gain an `independently_confirmed` lifecycle state,
rejected candidates leave the current assessment report, and uncertain
candidates remain visible with the judgment attached. Judgment never writes
source or promotes a finding without applicable law or reproducible proof.

## Repository law

Repository-specific law can be declared in `.rekon/config.json`. Rekon
validates the rules, projects them into a typed `Rulebook`, and evaluates that
artifact with the rest of the current model:

```json
{
  "rulebook": {
    "rules": [
      {
        "id": "architecture.ui-does-not-own-persistence",
        "severity": "high",
        "message": "The ui system may not own persistence capabilities.",
        "source": ".rekon/config.json",
        "appliesTo": ["CapabilityMap"],
        "evaluator": "ownership.doesNotOwn",
        "options": {
          "system": "ui",
          "capability": "persist:*"
        }
      }
    ]
  }
}
```

Run `rekon config validate` before `rekon refresh`. Removing the `rulebook`
block writes an empty superseding artifact during the next evaluation, so old
configured law does not remain active.

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
The graph command reports how many vector pairs it scored versus the all-pairs
ceiling. Large indexes use bounded candidate generation; small representation
groups remain exact.

`rekon runtime graph observe` reads `.rekon/handoff-events.jsonl`. In addition
to handoff events, instrumentation can append `execution_observation` rows to
record test-to-source and test-to-route execution. See the
[artifact reference](../../docs/artifacts/runtime-graph-observation-report.md)
for the event shape and its limits.

The same command accepts isolated Istanbul or LCOV coverage with
`--istanbul-coverage <coverage-final.json>` or `--lcov-coverage <lcov.info>`.
`--test-path` is mandatory because neither format carries per-test attribution.
Add `--verification-run <VerificationRun:id>` to prove that a completed command
explicitly named the test. Alternatively, pass the coverage flags to
`rekon verify run --execute` to execute and bind in one flow. Dry-run coverage
binding is refused.

For an installed Vitest or Jest project, Rekon can build the isolated plan:

```sh
rekon verify coverage plan \
  --framework vitest \
  --config tests/vitest.config.ts \
  --test-path tests/user.test.ts \
  --source-path src/user.ts
rekon verify run --plan <VerificationPlan-id> --execute
```

The planner resolves the framework's local package binary, writes no source,
downloads nothing, and stores coverage under `.rekon/cache/coverage/`. Vitest
also requires an installed `@vitest/coverage-v8` or
`@vitest/coverage-istanbul` package. Jest supports `babel` and `v8` providers.
Repeat `--source-path` when the test is intended to exercise multiple source
files. Pass `--config` when the repository's tests depend on a non-default
Vitest or Jest config. Rekon records the config and targets, limits Vitest
collection to those targets, and excludes nested worktrees so zero execution
can be distinguished from an unrelated coverage counter.

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

Use repeatable `--semantic-debt-file-path` flags to judge a bounded, explicit
set of repository files. Explicit paths remain subject to repository
containment, eligibility, reuse, and `--semantic-debt-file-limit` checks:

```sh
rekon scan \
  --semantic-files off \
  --semantic-debt required \
  --semantic-debt-file-path src/service.ts \
  --semantic-debt-file-path src/adapter.ts
```

## Embedding profile

Embedding index and retrieval commands default to `voyage-4` at 512
dimensions. The lower-cost override is:

```sh
rekon embeddings index --all --model voyage-4-lite --dimensions 512
```

After upgrading from `voyage-code-3`, rebuild once with
`rekon embeddings index --all`. Rekon rejects incompatible cached vector spaces
instead of returning zero-score or mixed-model results.
A full index drops chunks no longer present in the latest capability graph.
`--path` updates retain cached records outside the requested path.

## Public Surface

The binary name is `rekon`. From a source checkout, run:

```sh
node packages/cli/dist/index.js --help
```

## Import Boundary

Do not import business logic from `@rekon/cli`. Use `@rekon/runtime` and
`@rekon/sdk` for programmatic work.
