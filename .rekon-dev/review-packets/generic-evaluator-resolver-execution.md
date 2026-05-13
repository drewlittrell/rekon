CHANGES MADE
- Added four CLI subcommands on top of the publisher dispatch pattern from the previous batch:
  - `rekon evaluate list` — lists every registered evaluator as `{ id, capabilityId, produces }`.
  - `rekon evaluate run <evaluator-id> [--input-json <json>]` — runs a single evaluator, including external rule packs.
  - `rekon resolve list` — lists every registered resolver.
  - `rekon resolve run <resolver-id> [--input-json <json>]` — runs a single resolver and auto-injects the latest `IntelligenceSnapshot` ref when `snapshotRef` is missing from input.
- Kept `rekon evaluate` (no subcommand) as the run-every-evaluator workflow command.
- Kept `rekon resolve preflight --path … --goal …` as the friendly preflight shortcut.
- Documented the deliberate deferral of generic actuator and learner CLI dispatch.
- Bumped tests: 9 new contract tests + an extended integration test that asserts the external `todo.findings` evaluator can be listed and run through the CLI before `publish run todo.report`.
- Documentation updates across README, capability authoring docs, capability manifest docs, strategy capability model, roadmap, and example README.
- CHANGELOG updated.

PUBLIC API CHANGES
- New CLI surface only:
  - `rekon evaluate list`
  - `rekon evaluate run <evaluator-id> [--input-json <json>]`
  - `rekon resolve list`
  - `rekon resolve run <resolver-id> [--input-json <json>]`
- JSON output shapes:
  - `evaluate list`: `{ "evaluators": { id, capabilityId, produces }[] }`.
  - `evaluate run`: `{ "artifacts": ArtifactRef[] }`.
  - `resolve list`: `{ "resolvers": { id, capabilityId, produces }[] }`.
  - `resolve run`: `{ artifact: ArtifactRef, packet: ResolverPacket | null, artifacts: ArtifactRef[] }`.
- No kernel, SDK, runtime, capability, or artifact shape changes. The runtime already supported `evaluatorId` / `resolverId` filtering plus `input` forwarding through `runEvaluate` / `runResolve`; this batch is purely CLI surface.

CLI COMMANDS ADDED
- `rekon evaluate list`
- `rekon evaluate run <evaluator-id> [--input-json <json>]`
- `rekon resolve list`
- `rekon resolve run <resolver-id> [--input-json <json>]`

EVALUATOR FLOW
- `evaluate list` walks `runtime.registry.capabilities` and reports every registered evaluator with its owning capability id and declared produces.
- `evaluate run <id>` errors with `Unknown evaluator: <id>. Use 'rekon evaluate list' to see registered evaluators.` (exit 1) when the id is not registered.
- Before invoking, `evaluate run` ensures an `EvidenceGraph` exists (running `observe` if necessary), mirroring the existing `evaluate` workflow.
- The CLI passes `--input-json` (when provided) through to `runtime.runEvaluate({ evaluatorId, input })`. `runEvaluate` already merges that into the handler input alongside `repo`.

RESOLVER FLOW
- `resolve list` walks `runtime.registry.capabilities` and reports every registered resolver.
- `resolve run <id>` errors with `Unknown resolver: <id>. Use 'rekon resolve list' to see registered resolvers.` (exit 1) when the id is not registered.
- If `--input-json` is not provided or does not include `snapshotRef`, the CLI ensures snapshot inputs are ready via the shared `ensureSnapshotReady(runtime)` helper, then injects the latest `IntelligenceSnapshot` ref as `snapshotRef`.
- If `--input-json` includes an explicit `snapshotRef`, the CLI respects it as-is — proved by `tests/contract/generic-evaluator-resolver-execution.test.mjs` "resolve run respects explicit snapshotRef when provided".
- The CLI returns `{ artifact, packet, artifacts }`: `artifact` and `packet` are convenience fields for the typical single-packet case; `artifacts` is the full ref array so multi-output resolvers (none today, but possible) remain operable through the same shape.

EXTERNAL TODO FLOW
- `tests/integration/external-capability-cli.test.mjs` now runs against a temp copy of `examples/simple-js-ts` with `rekon-capability-todo-example` registered in `.rekon/config.json` and exercises:
  - `config validate` (clean).
  - `capabilities list` (includes external).
  - `evaluate list` (includes `todo.findings` under `capabilityId: rekon-capability-todo-example`).
  - `resolve list` (includes built-in `resolve.preflight`).
  - `publish list` (includes external `todo.report`).
  - `observe`.
  - `evaluate run todo.findings` (writes a `FindingReport`).
  - `publish run todo.report` (writes a `Publication`).
  - `artifacts validate` (returns `valid: true`).
- The test self-skips when `node_modules/rekon-capability-todo-example` is absent so clean checkouts stay green.

INTENTIONALLY DEFERRED
- Generic **actuator** dispatch (`rekon act run …` or similar). Actuators may write source, execute commands, or perform irreversible operations; the safety story for one-shot actuator dispatch from the CLI isn't worked out yet. Actuator work continues through `rekon intent work-order` and `rekon reconcile` until a real community capability and a workable permission model justify a wider surface.
- Generic **learner** dispatch. Learners already have explicit `rekon memory add`, `rekon memory list`, and `rekon memory select` commands. A bare `rekon learn run` would dilute that surface without adding capability.
- Both deferrals are stated in `docs/extensions/authoring-capabilities.md` and `docs/strategy/capability-model.md` so future agents do not assume they were forgotten.

TESTS / VERIFICATION
- `npm run typecheck`: passed.
- `npm run test`: 111 passed, 1 skipped optional dogfood. 9 new contract tests landed; the integration test now also runs the external evaluator. Total tests grew from 103 to 112 (12 new versus the previous batch baseline of 102; +9 vs the post-publisher commit at 102).
- `npm run build`: passed.
- `git diff --check`: clean.
- `node scripts/audit-package-exports.mjs`: passed.
- `node scripts/publish-dry-run.mjs`: passed (19/19, no `.tsbuildinfo`, no forbidden tokens).
- `node scripts/audit-license.mjs`: passed.
- `node scripts/install-smoke.mjs`: passed.
- `node scripts/install-tarball-smoke.mjs`: passed.
- CLI smoke against `examples/simple-js-ts` (init, config validate, capabilities list, observe, project, snapshot, evaluate list, evaluate run, evaluate, resolve list, resolve run with `--input-json`, resolve preflight, publish list, publish agents, artifacts validate): all exited 0 with clean validate output. Example `.rekon/` cleaned afterward.

RISKS / FOLLOW-UP
- `resolve run` injects `snapshotRef` opportunistically when `--input-json` omits it. That mirrors how `resolve preflight` works internally, but community resolvers may want to assert that input fields are explicit. If a community resolver ever fails confusingly because of auto-injection, document the override in their README and consider an opt-out flag.
- `evaluate run` does not auto-run `project` or `snapshot` before invocation. The built-in `@rekon/capability-policy.evaluator` works against the evidence graph; if a community evaluator needs the snapshot, that handler should consume `IntelligenceSnapshot` directly and the operator can run `rekon snapshot` before `evaluate run`. We can revisit if multiple community evaluators report friction.
- `resolve run` reads the produced packet inline and returns it under both `packet` and `artifacts`. That doubles up output size for the common single-packet case. Acceptable for alpha JSON-first UX, but worth revisiting if anyone scripts against it.
- The single-shot dispatch commands (`evaluate run`, `resolve run`, `publish run`) all share the same `parseInputJsonFlag` helper. If we add another role's dispatch later (intentionally not yet — see "Intentionally Deferred"), reuse that helper rather than rolling another.

NEXT STEP
- No further generic dispatch in the next batch. The remaining roles (actuators, learners) are deferred for stated safety / surface reasons.
- Recommended next slice: either (a) the first real third-party-style capability beyond the TODO example (e.g., a tiny "no-relative-import" rule pack as a separate `examples/` package, proving the rule-pack story end-to-end), or (b) richer freshness/invalidation handling so capabilities can declare stale-detection and the CLI surface it. Both are spine work and stay in line with the NorthStar.
- Operator npm publish is still pending and unchanged by this batch.
