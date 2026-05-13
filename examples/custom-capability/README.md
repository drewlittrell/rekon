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

## Run It Locally With The Runtime

This path exercises all three handlers: evidence provider, evaluator, and
publisher.

```sh
npm run build
npm --prefix examples/custom-capability run build
rm -rf /tmp/rekon-todo-example
cp -R examples/simple-js-ts /tmp/rekon-todo-example
printf '\n// TODO: replace demo greeting\n' >> /tmp/rekon-todo-example/src/index.ts
node --input-type=module <<'NODE'
import capability from "./examples/custom-capability/dist/index.js";
import { createRuntime } from "./packages/runtime/dist/index.js";

const runtime = await createRuntime({
  repoRoot: "/tmp/rekon-todo-example",
  capabilities: [capability],
});

await runtime.runObserve();
await runtime.runEvaluate();
const refs = await runtime.runPublish();
console.log(JSON.stringify({ artifacts: refs }, null, 2));
NODE
```

Expected behavior:

- observe writes an `EvidenceGraph` containing `todo_comment` facts
- evaluate writes a `FindingReport` containing TODO findings
- publish writes a TODO `Publication`

## Register It Through `.rekon/config.json`

The CLI loads external capabilities from installed package names. Install the
example package into this checkout without saving it to `package.json`:

```sh
npm install ./examples/custom-capability --no-save
```

Initialize the example target and edit `examples/simple-js-ts/.rekon/config.json`:

```json
{
  "capabilities": [
    { "package": "@rekon/capability-js-ts" },
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

Then run:

```sh
node packages/cli/dist/index.js observe --root examples/simple-js-ts --json
node packages/cli/dist/index.js evaluate --root examples/simple-js-ts --json
node packages/cli/dist/index.js artifacts list --root examples/simple-js-ts --type FindingReport --json
```

Known limitation: the current CLI has `publish agents`, which targets the
built-in docs publisher. The TODO publisher is runnable through the runtime
example above until the CLI grows a generic publisher command.

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
- `TODO evaluator requires an EvidenceGraph artifact`: run `rekon observe`
  first, using the source checkout command form shown above.
- No TODO findings: confirm the target source file contains `TODO` and rerun
  `observe` before `evaluate`.
- Permission errors: ensure `.rekon/config.json` grants only the permissions
  shown above.

## Safety

This example never writes source files and never executes commands. It writes
typed artifacts with headers, producer metadata, input refs, and provenance.
