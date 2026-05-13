CHANGES MADE
- Added five CLI commands centered on operating capabilities (built-in or external) without bespoke runtime scripts:
  - `rekon capabilities list [--verbose]` (existing; verbose mode adds per-capability handler summary).
  - `rekon capabilities inspect <capability-id>` (new).
  - `rekon publish list` (new).
  - `rekon publish run <publisher-id> [--input-json <json>]` (new; works for built-in and external publishers).
  - `rekon config validate` (new; lightweight `.rekon/config.json` validation).
- Kept `rekon publish agents` as the built-in docs publisher shortcut.
- Updated `examples/custom-capability/README.md`: removed the runtime-script workaround for running the TODO publisher, replaced it with a CLI walkthrough (`config validate`, `capabilities list`, `capabilities inspect`, `publish list`, `observe`, `evaluate`, `publish run todo.report`, `artifacts list`). Troubleshooting now references `rekon publish list` and `rekon config validate`.
- Updated `docs/extensions/authoring-capabilities.md` and `docs/extensions/capability-manifest.md` with sections describing the new CLI commands.
- Updated root `README.md` "First 10 Minutes" / CLI command list to include `config validate`, `capabilities inspect`, `publish list`, and `publish run`.
- Bumped `examples/custom-capability/package.json` internal `@rekon/*` dependency ranges from `0.1.0-alpha.0` to `0.1.0-alpha.1` so the documented `npm install ./examples/custom-capability --no-save` flow actually resolves under the post-bump workspace.
- Added `tests/contract/generic-capability-execution.test.mjs` (12 tests covering all new CLI commands plus the `publish agents` shortcut and config-validate error paths).
- Added `tests/integration/external-capability-cli.test.mjs` (1 test) that copies `examples/simple-js-ts` to a temp dir, registers `rekon-capability-todo-example` in `.rekon/config.json`, and exercises `config validate`, `capabilities list`, `publish list`, `observe`, `evaluate`, `publish run todo.report`, and `artifacts validate`. The test self-skips when the example package is not installed.
- Updated `CHANGELOG.md`.

PUBLIC API CHANGES
- New CLI surface only:
  - `rekon capabilities list --verbose` (existing command, new flag).
  - `rekon capabilities inspect <capability-id>`.
  - `rekon publish list`.
  - `rekon publish run <publisher-id> [--input-json <json>]`.
  - `rekon config validate`.
- JSON output shapes:
  - `capabilities list` default: `{ "capabilities": ManifestSummary[] }`.
  - `capabilities list --verbose`: `{ "capabilities": { manifest, handlers }[] }`.
  - `capabilities inspect`: `{ manifest, handlers, artifactTypes }`.
  - `publish list`: `{ "publishers": { id, capabilityId, produces }[] }`.
  - `publish run`: `{ "artifacts": ArtifactRef[] }`.
  - `config validate`: `{ valid, configPath, configExists, issues: { code, severity, message, path? }[] }`.
- No kernel, SDK, runtime, capability, or artifact shape changes. Internal `RuntimeCapabilityRegistry.capabilities` already exposed `RegisteredCapability` entries — the CLI just reads them through the existing surface.

CLI COMMANDS ADDED
- `rekon capabilities list --verbose` (extended).
- `rekon capabilities inspect <capability-id>`.
- `rekon config validate`.
- `rekon publish list`.
- `rekon publish run <publisher-id> [--input-json <json>]`.

EXTERNAL CAPABILITY FLOW
- Documented in `examples/custom-capability/README.md`:
  1. `npm run build && npm --prefix examples/custom-capability run build`.
  2. `npm install ./examples/custom-capability --no-save`.
  3. `cp -R examples/simple-js-ts /tmp/rekon-todo-example && rekon init --root /tmp/rekon-todo-example`.
  4. Edit `.rekon/config.json` to add `{ "package": "rekon-capability-todo-example" }` and its permissions.
  5. `rekon config validate` → `{ valid: true, issues: [] }`.
  6. `rekon capabilities list` shows the external capability.
  7. `rekon capabilities inspect rekon-capability-todo-example` shows its three handlers.
  8. `rekon publish list` shows `todo.report`.
  9. `rekon observe && rekon evaluate && rekon publish run todo.report` produces TODO `Publication` artifacts.
- No runtime script is required anymore.

CUSTOM TODO CLI FLOW
- The new integration test `tests/integration/external-capability-cli.test.mjs` exercises this exact flow:
  - Copies `examples/simple-js-ts` to a temp directory.
  - Appends `\n// TODO: replace demo greeting\n` to `src/index.ts`.
  - Registers `rekon-capability-todo-example` in the config and grants `read:source`, `read:artifacts`, `write:artifacts`.
  - Confirms `config validate` is clean.
  - Confirms `capabilities list` includes the external capability.
  - Confirms `publish list` includes the `todo.report` publisher under `capabilityId: rekon-capability-todo-example`.
  - Runs `observe`, `evaluate`, `publish run todo.report`.
  - Confirms a `Publication` artifact is emitted.
  - Confirms `artifacts validate` reports `{ valid: true, issues: [] }`.
- The test self-skips if `node_modules/rekon-capability-todo-example` is missing, so it doesn't break clean checkouts. Documented setup: `npm install ./examples/custom-capability --no-save`.

CONFIG VALIDATION
- `rekon config validate` validates `.rekon/config.json` against a lightweight set of rules:
  - File exists.
  - File is valid JSON object.
  - `capabilities` is an array (warns if empty).
  - Each entry is an object with a non-empty `package` string.
  - Duplicate capability packages produce a warning.
  - `permissions` (when present) is a record mapping capability package → permission array.
  - Permission strings must come from `{read:source, read:artifacts, write:artifacts, write:source, execute:commands, network:outbound}`. Unknown permission → error.
  - Permissions referencing a capability not in the capabilities list → warning.
  - `write:source` / `execute:commands` / `network:outbound` → warning ("risky permission").
- Result shape: `{ valid, configPath, configExists, issues: { code, severity, message, path? }[] }`. Exit code 1 when `valid: false`.
- No schema library introduced.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 102 passed, 1 skipped optional dogfood (`REKON_DOGFOOD_CLASSIC_ROOT` not set). 13 new tests landed (12 contract + 1 integration). The integration test requires `npm install ./examples/custom-capability --no-save` to run — in this batch the example package was installed into `node_modules/`, so the test ran in this run; it skips cleanly on fresh checkouts.
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed (19/19).
- `node scripts/publish-dry-run.mjs`: passed (19/19, 6 files each, no `.tsbuildinfo`, no forbidden tokens).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed (19 tarballs, 14 artifacts emitted).
- CLI golden flow against `examples/simple-js-ts` including `config validate`, `capabilities list`, `publish list`, `publish agents`, and `artifacts validate`: all exited 0 with `{ "valid": true, "issues": [] }` from validates. Example `.rekon/` cleaned afterward.

INTENTIONALLY UNTOUCHED
- No version bump.
- No npm publish.
- No artifact shape changes.
- No kernel, SDK, runtime, or capability behavior changes (the runtime already supported `publisherId` filtering through `runPublish` — the CLI just now exposes it).
- No new capabilities.
- No schema library.
- No SaaS/backend/dashboard work.
- No source-writing reconciliation.
- No marketplace/discovery.
- No `codebase-intel-classic` imports or behavior port.
- No generic resolver / evaluator / actuator / learner per-handler CLI dispatch. Out of scope for this batch; deferred to roadmap.
- No branches.

RISKS / FOLLOW-UP
- `publish run` requires snapshot inputs and will trigger `observe`/`project`/`evaluate`/`snapshot` if they have not run, identical to `publish agents`. That can confuse consumers who think it is a pure publisher invocation — surface that in docs if it ever bites someone.
- `capabilities inspect` reads from the in-memory registry, so it does not (yet) include unloaded capabilities flagged by `config validate`. If a config references an uninstalled external package, `inspect` will fail because the runtime cannot load it. That is correct, but the error currently surfaces as a load failure rather than a graceful "not installed" message. Acceptable for alpha.
- `examples/custom-capability/package.json` was bumped from `0.1.0-alpha.0` to `0.1.0-alpha.1` so npm could resolve its workspace deps post-version-bump. If a similar mismatch creeps into other example/internal packages, `install-smoke.mjs` will not catch it but `install-tarball-smoke.mjs` would because of the version-pinned `file:` references.
- Generic resolver/evaluator/actuator/learner per-handler execution is not in this batch. The capability roles that benefit most from it next are evaluator and resolver (community rule packs, custom resolvers). Reasonable next batch if community capabilities want it.
- The new `publish run` accepts `--input-json <json>` but the built-in docs publisher does not consume it. The flag exists for community publishers that need parameters. Document that explicitly when more publishers ship.

NEXT STEP
- Recommended: a small follow-up batch adding `rekon evaluate run <evaluator-id>` and `rekon resolve run <resolver-id>` with the same shape, plus `rekon learners run` / `rekon actuators run` if needed. Use `publish run` as the template; the runtime already supports the per-handler id filter for every role.
- Defer until at least one external community capability lands that needs evaluator or resolver dispatch.
- Operator publish (npm) is still pending. This batch did not move that needle.
