# Custom Capability Example: TODO Comments

This package is a canonical community-style Rekon capability. It detects TODO
comments, emits evidence, evaluates findings, and publishes a TODO report.

## What It Demonstrates

Roles:

- `evidence-provider`: scans source files and emits `todo_comment` facts
- `evaluator`: reads an `EvidenceGraph` and writes a `FindingReport`
- `publisher`: reads a `FindingReport` and writes a `Publication`

Consumes:

- `SourceFile`
- `EvidenceGraph`
- `FindingReport`

Produces:

- `EvidenceGraph`
- `FindingReport`
- `Publication`

Permissions:

- `read:source`
- `read:artifacts`
- `write:artifacts`

## Manifest

The manifest is in `src/index.ts` and declares roles, consumes, produces,
permissions, compatibility, and invalidation rules. Rekon validates that the
registered handlers match the manifest.

## Build And Test

From the repository root:

```sh
npm install
npm run build
npm --prefix examples/custom-capability run test
```

The test uses `assertCapabilityConforms()` from `@rekon/sdk`.

## Run It Through The CLI

The TODO capability is operable through the CLI. Install the example into the
repo as an external capability, register it in `.rekon/config.json`, and run
the standard CLI commands. No bespoke runtime script is required.

### 1. Install the example package

```sh
npm run build
npm --prefix examples/custom-capability run build
npm install ./examples/custom-capability --no-save
```

### 2. Register it in the target `.rekon/config.json`

```sh
rm -rf /tmp/rekon-todo-example
cp -R examples/simple-js-ts /tmp/rekon-todo-example
printf '\n// TODO: replace demo greeting\n' >> /tmp/rekon-todo-example/src/index.ts

node packages/cli/dist/index.js init --root /tmp/rekon-todo-example
```

Edit `/tmp/rekon-todo-example/.rekon/config.json` to add the external
capability and its permissions:

```json
{
  "capabilities": [
    { "package": "@rekon/capability-js-ts" },
    { "package": "@rekon/capability-model" },
    { "package": "@rekon/capability-graph" },
    { "package": "@rekon/capability-policy" },
    { "package": "@rekon/capability-resolver" },
    { "package": "@rekon/capability-docs" },
    { "package": "@rekon/capability-memory" },
    { "package": "@rekon/capability-intent" },
    { "package": "@rekon/capability-reconcile" },
    { "package": "rekon-capability-todo-example" }
  ],
  "permissions": {
    "rekon-capability-todo-example": [
      "read:source",
      "read:artifacts",
      "write:artifacts"
    ]
  }
}
```

### 3. Validate, inspect, and run

```sh
node packages/cli/dist/index.js config validate --root /tmp/rekon-todo-example --json
node packages/cli/dist/index.js capabilities list --root /tmp/rekon-todo-example --json
node packages/cli/dist/index.js capabilities inspect rekon-capability-todo-example --root /tmp/rekon-todo-example --json
node packages/cli/dist/index.js evaluate list --root /tmp/rekon-todo-example --json
node packages/cli/dist/index.js resolve list --root /tmp/rekon-todo-example --json
node packages/cli/dist/index.js publish list --root /tmp/rekon-todo-example --json
node packages/cli/dist/index.js observe --root /tmp/rekon-todo-example --json
node packages/cli/dist/index.js evaluate run todo.findings --root /tmp/rekon-todo-example --json
node packages/cli/dist/index.js publish run todo.report --root /tmp/rekon-todo-example --json
node packages/cli/dist/index.js artifacts list --root /tmp/rekon-todo-example --type Publication --json
```

Expected behavior:

- `config validate` returns `{ "valid": true, "issues": [] }`.
- `capabilities list` includes `rekon-capability-todo-example`.
- `capabilities inspect rekon-capability-todo-example` shows its evidence
  provider, evaluator, and publisher handlers (`todo-comments`,
  `todo.findings`, `todo.report`).
- `evaluate list` includes the `todo.findings` evaluator under
  `capabilityId: rekon-capability-todo-example`.
- `resolve list` includes the built-in `resolve.preflight` resolver.
- `publish list` includes the `todo.report` publisher under the external
  capability.
- `observe` writes an `EvidenceGraph` containing `todo_comment` facts.
- `evaluate run todo.findings` writes a `FindingReport` containing TODO
  findings (a scoped alternative to running every evaluator with bare
  `evaluate`).
- `publish run todo.report` writes a TODO `Publication`.

## Output Excerpt

```json
{
  "id": "todo:src/index.ts:1",
  "type": "todo_comment",
  "severity": "low",
  "title": "TODO comment",
  "files": ["src/index.ts"]
}
```

## Troubleshooting

- `Failed to load Rekon capability`: run
  `npm install ./examples/custom-capability --no-save` from the repository root.
- `Unknown publisher: todo.report`: run
  `node packages/cli/dist/index.js publish list --root <repo> --json` to
  confirm the external capability is registered. If absent, validate the
  config with `rekon config validate` first.
- `Unknown evaluator: todo.findings`: same approach with
  `rekon evaluate list`.
- `Unknown resolver: <id>`: same approach with `rekon resolve list`.
- `TODO evaluator requires an EvidenceGraph artifact`: run
  `node packages/cli/dist/index.js observe --root <repo>` first.
- No TODO findings: confirm the target source file contains `TODO` and rerun
  `observe` before `evaluate`.
- Permission errors: ensure `.rekon/config.json` grants only the permissions
  shown above. `rekon config validate` will flag risky or unknown permissions.

## Safety

This example never writes source files and never executes commands. It writes
typed artifacts with headers, producer metadata, input refs, and provenance.
