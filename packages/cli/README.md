# @rekon/cli

Minimal Rekon command line interface.

## Stability

Experimental alpha.

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

The CLI delegates lifecycle work to `@rekon/runtime`.

## Public Surface

The binary name is `rekon`. From a source checkout, run:

```sh
node packages/cli/dist/index.js --help
```

## Import Boundary

Do not import business logic from `@rekon/cli`. Use `@rekon/runtime` and
`@rekon/sdk` for programmatic work.
