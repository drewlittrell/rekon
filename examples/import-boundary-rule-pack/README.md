# Import Boundary Rule Pack Example

A realistic external Rekon evaluator capability. It is **not** a built-in
Rekon capability — it ships as an example package so contributors can copy
the pattern when authoring community rule packs.

## What It Does

The capability registers a single evaluator,
`import-boundaries.evaluate`, that consumes the latest `EvidenceGraph`
and produces a `FindingReport` containing two finding types:

- `import_boundary.parent_relative_import` (severity: medium) — an import
  that begins with `../` reaches outside the importing module's directory.
  Such imports tend to encode hidden cross-boundary coupling. Prefer a
  package or root alias, or move shared code behind an explicit public
  boundary.
- `import_boundary.generated_output_import` (severity: high) — an import
  whose target contains `dist/` or `build/` reads generated output
  instead of source. Generated output is brittle and rebuilds-dependent;
  import from source or a public package entrypoint instead.

Each finding records `subjects`, `files`, a `ruleId`, a `suggestedAction`,
and the `evidence` ref pointing back to the producing `EvidenceGraph`.

## Why It Exists

This is the first migrated Rekon evaluator capability that maps directly
to a `codebase-intel-classic` behavior — specifically, import-boundary
governance (classic source areas include
`domain/issues/evaluators/imports/*`,
`domain/issues/RulesResolver.ts`, and
`services/issues/detection-phases.ts`).

It demonstrates how to preserve the classic win — executable, evidence-
driven, severity-bearing import rules — without copying classic file
structure, the central `RULE_EVALUATORS` map, or the broader issue
detection pipeline. See
[../../docs/strategy/classic-behavior-distillation.md](../../docs/strategy/classic-behavior-distillation.md)
for the full distillation.

## Roles, Consumes, Produces, Permissions

| Field | Value |
| --- | --- |
| Roles | `evaluator` |
| Consumes | `EvidenceGraph` |
| Produces | `FindingReport` |
| Permissions | `read:artifacts`, `write:artifacts` |
| Compatibility | `^0.1.0-alpha.1` |
| Stability | Example. Not published. Treat as a contributor reference. |

The capability does not request `read:source`; it derives findings from
the `EvidenceGraph` produced by `@rekon/capability-js-ts`. If the
JS/TS evidence provider does not see the file, the evaluator does not
flag it.

## Rules Implemented

| Rule | Severity | Trigger | Suggested Action |
| --- | --- | --- | --- |
| `import-boundaries.parent-relative` | medium | Import target starts with `../` | Replace with a stable package/root import or move shared code behind an explicit boundary. |
| `import-boundaries.generated-output` | high | Import target contains `dist/` or `build/` | Replace with a source import or package entrypoint import. |

An import that matches both rules — for example `../../dist/generated` —
produces both findings, because both violations are real.

## Build And Test

From the repository root:

```sh
npm install
npm run build
npm --prefix examples/import-boundary-rule-pack run build
npm --prefix examples/import-boundary-rule-pack run test
```

The package-level test uses `assertCapabilityConforms()` from
`@rekon/sdk` plus an in-memory artifact-store harness that feeds a
synthetic `EvidenceGraph`.

## Install Into A Consumer Project

```sh
npm install ./examples/import-boundary-rule-pack --no-save
```

## CLI Walkthrough

The capability is operable end-to-end through the Rekon CLI. Use the
fixture under `fixtures/bad-imports` as a sample consumer project:

```sh
rm -rf /tmp/rekon-import-boundary-example
cp -R examples/import-boundary-rule-pack/fixtures/bad-imports /tmp/rekon-import-boundary-example

node packages/cli/dist/index.js init --root /tmp/rekon-import-boundary-example
```

Edit `/tmp/rekon-import-boundary-example/.rekon/config.json` so the
external capability is registered alongside the built-ins:

```json
{
  "capabilities": [
    { "package": "@rekon/capability-js-ts" },
    { "package": "@rekon/capability-model" },
    { "package": "@rekon/capability-graph" },
    { "package": "@rekon/capability-policy" },
    { "package": "@rekon/capability-resolver" },
    { "package": "@rekon/capability-docs" },
    { "package": "rekon-capability-import-boundaries-example" }
  ],
  "permissions": {
    "rekon-capability-import-boundaries-example": [
      "read:artifacts",
      "write:artifacts"
    ]
  }
}
```

Then validate, inspect, observe, and run the evaluator:

```sh
node packages/cli/dist/index.js config validate --root /tmp/rekon-import-boundary-example --json
node packages/cli/dist/index.js capabilities list --root /tmp/rekon-import-boundary-example --json
node packages/cli/dist/index.js capabilities inspect rekon-capability-import-boundaries-example --root /tmp/rekon-import-boundary-example --json
node packages/cli/dist/index.js observe --root /tmp/rekon-import-boundary-example --json
node packages/cli/dist/index.js evaluate list --root /tmp/rekon-import-boundary-example --json
node packages/cli/dist/index.js evaluate run import-boundaries.evaluate --root /tmp/rekon-import-boundary-example --json
node packages/cli/dist/index.js artifacts list --root /tmp/rekon-import-boundary-example --type FindingReport --json
node packages/cli/dist/index.js artifacts validate --root /tmp/rekon-import-boundary-example --json
```

## Expected Output

After `evaluate run import-boundaries.evaluate`, the latest
`FindingReport` contains at least:

- `import_boundary.parent_relative_import` (the `../local` import in
  `src/feature/handler.ts`).
- `import_boundary.parent_relative_import` and
  `import_boundary.generated_output_import` (the `../../dist/generated`
  import in `src/feature/handler.ts`; the same import matches both
  rules).

`artifacts validate --root … --json` returns
`{ "valid": true, "issues": [] }`.

## Troubleshooting

- `Unknown evaluator: import-boundaries.evaluate` — confirm the package
  is installed (`npm install ./examples/import-boundary-rule-pack --no-save`)
  and registered in `.rekon/config.json`. Run
  `rekon config validate` first; it surfaces shape and permission
  problems.
- `Import boundary evaluator requires an EvidenceGraph artifact` —
  run `rekon observe --root <repo>` before `rekon evaluate run …`.
- No findings emitted — confirm the source files contain imports that
  start with `../` or reference `dist/` / `build/`. The included
  fixture intentionally has both.
- Permission errors — the capability only needs `read:artifacts` and
  `write:artifacts`. If `config validate` warns about risky permissions,
  remove anything beyond those two.

## Freshness

The evaluator's `FindingReport` cites the `EvidenceGraph` it evaluated.
After `rekon observe` runs again (e.g., because someone changed the
imports), older `FindingReport` artifacts become stale because a newer
`EvidenceGraph` exists. Inspect freshness against the temp workspace:

```sh
node packages/cli/dist/index.js artifacts freshness --root /tmp/rekon-import-boundary-example --json
node packages/cli/dist/index.js artifacts freshness --root /tmp/rekon-import-boundary-example --type FindingReport --json
```

The CLI returns the per-artifact `status` (`fresh` / `stale` /
`partial` / `unknown`) and explains which input changed. Re-running
`rekon evaluate run import-boundaries.evaluate` writes a fresh
`FindingReport` against the latest evidence. See
[docs/concepts/freshness-and-invalidation.md](../../docs/concepts/freshness-and-invalidation.md).

## Safety

The capability never writes source files, never executes commands, and
never makes network calls. It consumes one artifact (`EvidenceGraph`)
and writes one artifact (`FindingReport`) through the runtime artifact
store with a complete header.

## Related Reading

- [Authoring capabilities](../../docs/extensions/authoring-capabilities.md)
- [Capability manifest](../../docs/extensions/capability-manifest.md)
- [Capability model](../../docs/strategy/capability-model.md)
- [Classic behavior distillation](../../docs/strategy/classic-behavior-distillation.md)
- [Classic alignment map](../../docs/strategy/classic-alignment-map.md)
- [Classic refactor principles](../../docs/strategy/classic-refactor-principles.md)
