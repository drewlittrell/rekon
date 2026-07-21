# First 10 Minutes With Rekon

This walkthrough runs Rekon from a fresh source checkout against
`examples/simple-js-ts`.

## 1. Install And Build

```sh
npm install
npm run build
```

The source checkout uses the CLI entrypoint directly:

```sh
node packages/cli/dist/index.js --help
```

## 2. Install Agent Instructions And Initialize

```sh
node packages/cli/dist/index.js setup --root examples/simple-js-ts --json
node packages/cli/dist/index.js init --root examples/simple-js-ts
```

`setup` adds a bounded Rekon block to `examples/simple-js-ts/AGENTS.md`.
`init` creates `.rekon/config.json`, `.rekon/registry/`, and artifact
directories. Neither command scans source.

## 3. Observe Source Evidence

```sh
node packages/cli/dist/index.js observe --root examples/simple-js-ts --json
```

This writes an `EvidenceGraph` under `.rekon/artifacts/evidence/`.

## 4. Project Models And Graphs

```sh
node packages/cli/dist/index.js project --root examples/simple-js-ts --json
```

This writes model projections:

- `ObservedRepo`
- `OwnershipMap`
- `CapabilityMap`
- `GraphSlice`

## 5. Evaluate Findings

```sh
node packages/cli/dist/index.js evaluate --root examples/simple-js-ts --json
```

This writes a `FindingReport`. The simple example may have no findings; the
artifact still records that evaluation ran.

## 6. Build A Snapshot

```sh
node packages/cli/dist/index.js snapshot --root examples/simple-js-ts --json
```

This writes an `IntelligenceSnapshot`, the central index of Rekon intelligence.

## 7. Run Explainable Preflight

First compile the context a model should read:

```sh
node packages/cli/dist/index.js context task --root examples/simple-js-ts --task "modify bootstrap" --path src/index.ts --profile compact --provider mock --json
```

The `agentContext` block identifies core and supporting context, trust,
freshness, token budget, and `contextTrace` selection decisions.

For the smaller model-facing form, replace `--json` with `--model-context`.

Then run preflight:

```sh
node packages/cli/dist/index.js resolve preflight --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
```

Look for:

- `ownerSystems`
- `matchedScopes`
- `risk`
- `warnings`
- `resolutionTrace`

`resolutionTrace` shows which sources were checked and used. Ownership
precedence is:

1. `OwnershipMap`
2. `ObservedRepo`
3. ownership `GraphSlice`
4. raw `EvidenceGraph` `ownership_hint` fallback

## 8. Publish Agent Guidance

```sh
node packages/cli/dist/index.js publish agents --root examples/simple-js-ts
```

This writes `Publication` artifacts under `.rekon/artifacts/publications/`.
Docs are publications, not canonical truth.

## 9. Add And Select Memory

```sh
node packages/cli/dist/index.js memory add --root examples/simple-js-ts --instruction "Preserve bootstrap behavior." --path src
node packages/cli/dist/index.js memory list --root examples/simple-js-ts --json
node packages/cli/dist/index.js memory select --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
```

Memory writes typed artifacts and can enrich resolver output. It does not
rewrite ownership, rules, or findings.

## 10. Create A Work Order

```sh
node packages/cli/dist/index.js intent work-order --root examples/simple-js-ts --path src/index.ts --goal "modify bootstrap" --json
```

This writes `IntentMap`, `WorkOrder`, and `VerificationPlan` artifacts.

## 11. Reconcile In Dry-Run Mode

```sh
node packages/cli/dist/index.js reconcile --root examples/simple-js-ts --operation docs_regeneration
```

The initial reconcile capability is artifact-only and dry-run by default.
Source-writing and command-running operations are denied by default.

## 12. Inspect Artifacts

```sh
node packages/cli/dist/index.js artifacts list --root examples/simple-js-ts --json
```

Show one artifact by id:

```sh
node packages/cli/dist/index.js artifacts show <id-or-type:id> --root examples/simple-js-ts --json
```

Validate the artifact index, headers, paths, and digests:

```sh
node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json
```

Every artifact should include a header with schema version, producer metadata,
input refs, freshness, and provenance.
