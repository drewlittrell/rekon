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
- `rekon snapshot`
- `rekon resolve preflight`
- `rekon publish agents`
- `rekon memory add/list/select`
- `rekon intent work-order`
- `rekon reconcile`
- `rekon artifacts list`
- `rekon artifacts show <id>`
- `rekon artifacts validate`

The CLI delegates lifecycle work to `@rekon/runtime`.

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

## Public Surface

The binary name is `rekon`. From a source checkout, run:

```sh
node packages/cli/dist/index.js --help
```

## Import Boundary

Do not import business logic from `@rekon/cli`. Use `@rekon/runtime` and
`@rekon/sdk` for programmatic work.
