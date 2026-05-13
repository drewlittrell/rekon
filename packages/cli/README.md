# @rekon/cli

Minimal Rekon command line interface.

## Stability

Label: `experimental, public`.

CLI command names, flags, and JSON output shapes are part of the public alpha
contract. Internal command implementation is `internal`. See
[docs/concepts/stability.md](../../docs/concepts/stability.md).

## Lifecycle Fit

The CLI is the operator surface for the local lifecycle:

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

## Public Surface

The binary name is `rekon`. From a source checkout, run:

```sh
node packages/cli/dist/index.js --help
```

## Import Boundary

Do not import business logic from `@rekon/cli`. Use `@rekon/runtime` and
`@rekon/sdk` for programmatic work.
