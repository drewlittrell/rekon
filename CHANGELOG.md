# Changelog

All notable changes to Rekon are documented here.

## Unreleased

- Added typed proof obligations, verifier results, and `ProofGateReport` to the
  public repository-model contract. Post-edit validation now binds selected
  checks and runtime observations to affected handoff edges, accepts model
  judgment only where declared, retains contradictory evidence, and blocks on
  refutation.
- Added task-context admission decisions. Deterministic and operator routes are
  marked supported, semantic or retrieval routes remain unresolved leads, and
  rejected graph claims are excluded with an auditable refutation.
- Repository purpose, user outcomes, invariants, prohibitions, and handoff
  semantics now gate change completion. `rekon context validate-change` accepts
  `--prepare-verification` to materialize its exact selected checks through the
  existing runner, accepts explicit proof refs and judgments, records only
  satisfied gates, and rejects same-text TaskPact or task-context artifacts
  from another path scope.
- Added proof-gated refresh. A recorded gate carries safe repository-relative
  paths and before/after source digests; `rekon refresh --proof-gate <ref>`
  refuses incomplete proof, cross-repository proof, unknown proof freshness, or
  source bytes changed after validation.
- Updated the managed Rekon agent block to `2.0.0` with the two-pass validation,
  verification, proof-recording, and refresh protocol while keeping the block
  within its existing size limit. Sol calibrations bound to the prior managed
  payload remain historical rather than being relabeled as current evidence.
- Added `@rekon/capability-python` with source-backed Python file, import,
  symbol, test, ownership, capability, and bounded constructor-dependency
  evidence. Python imports resolve only to unique repository files, and source
  selection rejects symlinks and outside-root incremental paths.
- Capability graph builds now consume the current `EvidenceGraph` as an
  explicit input, project provider-resolved file relationships with current
  source digests, and index Python source during scan and refresh. Same-file
  symbol claims no longer displace related files from the bounded task-context
  neighborhood.
- Added a shared CLI/MCP task-operation policy. Task context now reports task
  class, risk provenance, evidence completeness, selected context profile, and
  whether the existing intent work-order flow is required. Complete work stays
  compact; incomplete evidence raises the minimum profile to standard, and an
  explicit validation-failure retry raises it to deep.
- `rekon intent work-order` now creates and binds the preflight packet for its
  current path and goal instead of reusing an unrelated prior resolver packet.
- Added model-facing `validate_change` and the equivalent `rekon context
  validate-change` command. They compare declared changed paths with a
  read-only Git baseline, TaskPact scope, ownership, capability dependency
  policy, and end-to-end handoff contracts; output is limited to blocking
  violations, unresolved semantic obligations, and required checks. Validation
  runs no checks, writes no source, and calls no model; explicit preparation or
  recording flags may write verification artifacts.
- Scoped post-edit required checks to the task and repository contracts touched
  by the observed diff, with an explicit conservative TaskPact fallback when
  contract bodies are unavailable. Check-selection provenance remains
  available on the pure `validateChange()` result.
- `rekon refresh` now reconciles an existing effective repository-contract
  registry against the newly projected model. Drift and candidate reports join
  the current run before snapshot construction; repositories without adopted
  law keep the step explicitly skipped.
- Added bounded deterministic `sourceSpans` to shared model-context delivery.
  Each span carries an exact path, source SHA-256, line range, excerpt, evidence
  ref, freshness, and routing reason; profile budgets cap count and characters,
  and omitted delivery routes cannot leak their source spans through CLI or MCP.
- Added one optional repository-native exemplar for extension and placement
  tasks. Cached similarity may propose the file, but its bounded excerpt must
  come from deterministic digest-bound evidence and remains inference-tagged.
  Packet budgets may omit it, and memory or model claims remain unservable.
- Capability-graph refresh now replaces pre-digest source evidence before task
  context is compiled, preventing stale excerpts from being served without a
  current source binding.
- Added task-local freshness checks to CLI and MCP context requests. Stale or
  missing evidence now refreshes Rekon artifacts before context compilation,
  pathless requests can fall back to deterministic graph scope without an
  embedding index, and incremental evidence self-lineage remains fresh.
- Added resumable `rekon contracts maintain` orchestration for source-cited
  agent judgment, permissioned adoption, compilation, and drift reconciliation.
  Missing repository law is now explicit in CLI and MCP task context. Candidate
  lineage must remain fresh through judgment and adoption, and contract-source
  digests now match the exact serialized input checked by freshness validation.
- Corrected repository-contract producer metadata to the registered
  `@rekon/capability-model` version so fresh artifacts do not report false
  producer drift.
- Updated managed agent instructions to `1.8.2` and marked the prior Sol
  managed-interface calibration historical pending a new canary.
- Added contract discovery, source-cited agent judgment, permissioned adoption,
  drift reconciliation, and task-scoped pacts for system and end-to-end flow
  law. CLI and MCP now apply the same TaskPact selection; generated work orders
  retain its impact obligations and lineage.
- Added `rekon contracts bootstrap` for deterministic cold-start discovery and
  agent-owned contract judgment without provider calls or finding evaluation.
- Added a source-free repository-law context gate and a paired direct/managed
  model-lift corpus for compositional system semantics and cross-system handoff
  preservation. Compact packet selection now collapses duplicate evidence
  routes before enforcing its budget.
- Ran three paired Sol/xhigh managed repeats per repository-law task. Rekon
  passed 6/6 changes versus 4/6 baselines and reduced average explored paths
  from 17.0 to 7.17. Reported tokens rose 36.3% and the visible estimate rose
  12.2%; the retained source-free calibration accepts correctness and
  exploration gains while rejecting token-savings, lower-model-lift, and broad
  generalization claims.
- Added an opt-in tiered context-delivery probe and source-free route-use
  accounting. Four Sol/xhigh Rekon runs preserved behavior, exact scope,
  checks, and MCP adoption, but inspected all 16 offered supporting routes.
  The full delivery remains the default; no source-read or token-savings claim
  was accepted.
- Added deterministic task-context route roles, necessity classes, and
  necessity reasons. An opt-in `role-aware` adapter reduced the six-case
  deterministic gate's initial mandatory set from 25 paths to 15 while
  retaining all 30 selected routes. The full delivery remains the default; no
  model-behavior, source-read, quality, or token-savings claim is accepted yet.
- Ran three managed Sol/xhigh repeats per policy on an independent
  configuration-rollout task. Both `full` and `role-aware` passed exact scope,
  checks, the hidden oracle, and MCP adoption, but role-aware delivery skipped
  no conditional routes and used 17.8% more reported and 7.3% more
  visible-estimate tokens. The policy remains experimental and non-default.
- Added an isolated optional-route corpus and source-free route-applicability
  scoring. On three Sol/xhigh runs per policy, both policies passed every
  quality and adoption gate; role-aware used all six oracle-optional route
  opportunities while full left one unused, with 14.1% more reported tokens,
  3.2% more visible-estimate tokens, and 6.7% more commands. Conditional labels
  remain explanatory metadata rather than a promoted read-reduction policy.
- Added an experimental `summary-aware` delivery that replaces deterministic
  conditional paths with bounded, pathless routing decisions. Two three-run
  Sol/xhigh variants preserved behavior and MCP adoption but still inspected
  every optional dependency and caller after their imports appeared in required
  source. Neither variant reduced exploration; both added visible-token,
  non-cached-input, and command overhead. `full` remains the default.
- Tested fresh, exact `CapabilityContract` assertions as replacement context.
  They did not stop Sol from reading optional implementations: all nine route
  opportunities were inspected across visible-relative and symbolic-import
  tasks. The symbolic case still reduced broad exploration by 40% and commands
  by 30%, while reported tokens rose 25%. This supports bounded navigation, not
  source replacement, token savings, or promotion of `summary-aware` delivery.
- Added an experimental `navigation-only` delivery and source-free payload-size
  accounting. The policy retains required paths, normative constraints, checks,
  and inference support while omitting conditional paths, summaries, and
  descriptive implementation facts. On three paired Sol/xhigh runs it reduced
  average repository exposure from 6.33 to 4 paths and preserved quality, but
  the model still inspected the omitted dependency in every Rekon run; commands
  and all token measures increased. The policy remains non-default.
- Updated managed agent instructions to `1.8.0`. Managed agents request fresh
  task context at task start, after compaction or restart, and when goal or path
  scope changes.

- Added version-controlled repository contract sources, public
  `SystemContract`, `FlowContract`, and `EffectiveContractRegistry` artifacts,
  safe source discovery, and `rekon contracts compile`. Contract authority is
  explicit from observed through adopted, and generated state cannot replace
  committed law.

- Ran a pinned Sol/xhigh canary over all three mixed-layout tasks with the
  instruction `1.7.3` two-tool interface. Rekon passed 3/3 changes versus 1/3
  baseline and reduced explored paths by 67%, but used 26.5% more reported
  tokens overall. The equal-correctness pair also retained 19.6% reported and
  23.3% visible-estimate overhead. The source-free calibration records a
  correctness and exploration gain with token overhead and rejects a general
  token-savings claim.

- Updated managed agent instructions to `1.7.3` so preservation-only pact text
  does not trigger symbolic lookup. The advertised MCP refinement affordance is
  now `resolve_source_target` and requires an exact source-named target; the old
  `refine_task_context` name remains an unadvertised compatibility alias. The
  coding-agent tool list now advertises only task context and source-target
  resolution; legacy orientation, placement, and preflight calls remain
  accepted. The managed bootstrap, registry, and repeated preamble were
  compacted, and packet instructions now ask agents to batch known file reads.
- Validated the narrowed interface with Sol/xhigh. The affected cross-system
  task retained full quality, eliminated unnecessary refinement, and reduced
  reported usage by 19% and the visible estimate by 24% relative to its
  original managed failure. A true runtime-binding task still used exactly one
  source-target resolution and passed. The retained calibration does not claim
  general token savings.
- Added source-free token accounting to the local Codex subscription evaluator.
  Executed runs retain aggregate `turn.completed` input, cached-input, output,
  and reasoning counts plus a separate visible-payload estimate; source,
  prompts, diffs, commands, MCP payloads, and free-form model text remain
  ephemeral. Correctness and scope remain hard gates ahead of token reduction.
- Ran the first pinned GPT-5.6 Sol/xhigh subscription canary across six managed
  task pairs. Rekon preserved all behavior and scope checks and reduced average
  explored paths from 34.33 to 5.17, but reported tokens fell only 1.4% while
  the visible estimate rose 1.2%. Selective repeats confirmed case-level savings
  and overhead, including repeatable unnecessary cross-system refinement, so
  the retained source-free calibration does not claim general token savings.
- Added a positive bounded-refinement corpus for a runtime-bound event
  serializer that the current compact initial packet does not select. The accepted
  managed run used all initial context, made one publisher-anchored
  `implementation` refinement, changed only the required service, serializer,
  and test files, and passed public and hidden behavior checks without broad
  search. The source-free calibration is fixture- and selection-digest-bound.
- Recorded a scoped negative runtime-binding result in the provider-backed
  structured simulation. Across three repeats each, low-effort GPT-5.6 Luna and
  Claude Sonnet 5 made zero refinement calls and omitted the deployed serializer.
  Luna used 7% fewer tokens at lower quality; Sonnet used 33% more at lower
  quality. The result remains source-free evidence about that model and harness
  combination, not a general rejection of refinement through a native agent
  tool loop.
- Updated managed agent instructions to `1.7.2`: deterministic refinement now
  precedes repository-wide or symbol text search for a task-required symbolic
  target whose path is unknown. Search remains a fallback for unresolved or
  stale refinement evidence. MCP guidance, CLI-managed instructions, docs, and
  conformance tests use the same rule.
- Added bounded proactive symbolic routing to the task-context compiler.
  Task-signaled shared-capability implementations and typed contract
  producers/consumers now enter `readFirst` directly, capped at two routes;
  refinement remains the fallback for unresolved targets. Routes do not cross
  source-language families unless the task signals that boundary.
- Measured the routing correction with three paired repeats across GPT-5.6
  Luna and Claude Sonnet 5. Luna used 34% fewer files, 28% fewer turns and
  tokens, and 26% lower estimated cost than baseline. Sonnet matched baseline
  files and turns with 9% more tokens. Both models used roughly half the managed
  tokens of the earlier refinement round trip, with zero unnecessary calls.
- Added source-free live-report rescoring so a corrected oracle can be applied
  without another provider call. Command scoring now treats presentation such
  as `Run npm test.` as the same command while preserving literal pact checks.
- Updated managed agent instructions to `1.7.1`: a task-relevant relationship
  already represented in `readFirst` or `boundaryPaths` is resolved unless
  inspected source names a different absent target. This prevents redundant
  contract and test-discovery refinement after the compiler has supplied the
  change boundary. The current source-backed symbolic gate passed all three
  behavior and adoption checks with full initial-context use and zero
  refinement calls.
- Added bounded task-context refinement through MCP `refine_task_context` and
  CLI `rekon context refine`. Both surfaces share a deterministic selector for
  dependency, dependent, test, contract, consumer, producer, and implementation
  relationships, exclude already-read paths, retain matched pacts and checks,
  and return unresolved instead of broadening silently.
- Updated managed agent instructions to `1.6.0`: exact source paths are read
  directly, while refinement is reserved for task-required symbolic targets.
  All 12 complete-packet managed tasks passed with full initial-context use and
  zero refinement calls.
- Replaced the exact-path refinement fixture with symbolic implementation,
  consumer, and producer cases. Managed agents passed and adopted 9/9 changes
  versus 3/9 controls, used the intended route on every run, avoided broad
  search, and reduced average explored paths from 24.22 to 4.67. The nine
  primary routes made 17 bounded calls, usually adding a follow-up test lookup;
  token impact remains deferred to the API phase.
- Extended source-free adoption scoring with normalized relationship/anchor
  checks, required refined-path use, refinement-call caps, and explicit
  excessive-refinement metrics. Free-form questions and raw MCP payloads are
  not retained.
- Added an independent 35-file model-interface corpus covering configuration
  rollout, pathless extension placement, and cross-language schema evolution.
  Rekon passed 9/9 paired runs versus 3/9 baseline and reduced average explored
  paths from 26.78 to 6.56.
- Updated managed instructions to `1.4.0`: agents must read every `readFirst`
  path and treat pacts and checks as acceptance criteria. Adoption scoring now
  verifies full `readFirst` use while keeping compatibility-only
  `boundaryPaths` optional unless unresolved.
- Recalibrated all managed corpora under the finalized instruction: 12/12
  changes passed behavior and exact scope, called MCP before exploration and
  editing, and used the complete `readFirst` set.
- Added a separate 31-file TypeScript/Python model-interface corpus with
  executable hidden behavior and exact-scope oracles. Pact-corrected Rekon runs
  passed 9/9 versus 5/9 baseline, reduced average explored paths from 15.89 to
  6.11, and preserved a cross-language contract in 3/3 runs versus 0/3.
- Updated the earlier managed-interface calibration to instruction `1.3.0` and made
  regression coverage explicit repository law when the evaluator requires test
  edits. Managed dry runs now exclude retrieval context that MCP cannot use.
- Added `projectModelContextDelivery()` and `--model-context` as the shared,
  minimal model-facing view for MCP, CLI fallback, and evaluation. The full
  compiled packet and projection retain routing reasons, provenance, and
  selection diagnostics for audit.
- Compressed deterministic model delivery from 400 to 112 estimated tokens on
  average (697 to 162 maximum) without reducing the 17-case recall or pact
  gates. Compact unanchored placement no longer promotes compatibility-only
  callers into the model's read list.
- Added prioritized model context with `readFirst` implementation evidence and
  `boundaryPaths` compatibility context, including MCP trust tagging.
- Added a source-free GPT-5.6 Luna token calibration after delivery
  compression: Rekon reached full oracle quality in 18/18 runs versus 5/18,
  reduced average inspection by 47% and turns by 29%, and used 33% fewer total
  tokens and 41% lower estimated API cost than baseline. Seventeen pairs were
  candidates; one cross-system repeat remained no-advantage without a
  correctness regression.
- Declared Rekon MCP context tools read-only, non-destructive, idempotent, and
  closed-world in protocol metadata for non-interactive agent clients.
- Tightened managed agent instructions so listed MCP context tools run before
  shell exploration, with CLI reserved for absent or failed MCP tools.
- Added managed-interface adoption evaluation and calibrated exact declared
  domain-error guidance so agents do not search the repository for analogues.
- Made `context_for_task` the default MCP entry point and reserved orientation,
  placement, and preflight calls for tasks that need their additional context.
- Defined managed-interface adoption around successful task context before
  exploration; optional MCP tools remain conditional rather than ceremonial.
- Replaced vague refactor preservation guidance in the outcome corpus with
  literal abstraction, error, and transition pacts.
- Added a source-free managed-interface calibration: 6/6 agents obtained Rekon
  context before exploration, all managed changes passed hidden checks, and
  average explored paths fell from 34.33 to 7.5 versus baseline.
- Expanded the credential-free model-interface outcome corpus to six tasks and
  36 isolated changes covering implementation, debugging, refactor, placement,
  cross-system coordination, and policy preservation. All 18 corrected pairs
  pass behavioral and scope checks and qualify as candidates; average explored
  paths fell from 25.28 to 8.28 and commands from 3.44 to 2.28. Token usage
  remains deliberately uncollected.
- Routed `CapabilityContract` required neighbors to graph-declared
  implementation files and preserved literal pact values in the compact model
  projection. Calibration showed that exact domain errors must be declared;
  vague authorization-preservation language did not prevent error-contract
  drift.
- Corrected local-agent evaluation so broad discovery paths count toward
  exploration, both-condition behavior failures are not blamed on Rekon alone,
  and reports distinguish discovery outside the selected context packet.
- Added path-scoped repository-contract guidance to `TaskContextReport`, CLI,
  and MCP. Preservation rules and required checks now reach terse tasks with
  declared trust, freshness, and artifact provenance. The credential-free
  three-task outcome corpus passes all 18 isolated changes across nine paired
  runs; token usage remains deferred to the provider-backed phase.
- Added Rekon's model interface: a shared budgeted task-context compiler,
  read-only MCP task-context and preflight tools, and managed downstream
  `AGENTS.md` instructions with sync, check, removal, opt-out, and protected
  whole-file export safeguards. CLI and MCP now share context selection rules,
  trust/freshness metadata, selection traces, and explicit output ceilings.
- Expanded the model-free context-interface evaluation to 17 tasks spanning
  implementation, review, refactor, debugging, placement, contract,
  cross-system, stale-context, documentation, Python, and Go work. The gate now
  measures model-projection precision, irrelevant paths, warnings, checks, and
  projected token cost in addition to recall and trust boundaries.
- Added digest-bound maintainer judgments and a source-free append-only local
  ledger. Context-selection changes invalidate stale judgments without calling
  a model provider or retaining repository source.
- Added a bounded paired provider evaluation with a fixed task oracle,
  source-free reports, and an append-only keep-or-discard experiment ledger.
- Corrected task-context graph routing so connected file claims retain the
  related file path and capability packet items retain capability identity.
  The deterministic model-interface gate now checks related-path recall, and
  exact test commands no longer receive a redundant inferred `npm test` hint.
  Explicit `without changing` and preservation language now survives as pact
  context without mislabeling an earlier editable path as protected.
- Added `projectModelContext()` as a compact delivery view of the auditable
  task-context packet. It preserves model-actionable routing and pact data while
  leaving evidence inventories and selection diagnostics in the full packet.
  MCP `context_for_task` now returns this compact view by default.
- Ranked bounded graph expansion so deterministic, task-specific, verification,
  and outgoing dependency edges survive high-degree files before incidental
  incoming callers. Calibration reduced the per-path graph-claim cap from six
  to four while retaining all required paths across the 17-case corpus.
- Preserved explicit `pytest` and `go test` verification commands and recognized
  `preserving` clauses as operator-provided pact context.
- Calibrated all seven semantic problem classes against five independent public
  defect pairs. New structured evidence covers revalidation-only cache entries,
  pending callbacks during close, auto-import path ranking, retry-code loss
  through error wrapping, mode-specific defaults, server-owned browser
  shutdown, and nested loop-head initialization. The 35-pair semantic baseline
  passes without retaining source; model usage and cost remain scoped to the
  ten pairs previously run through provider APIs.
- Made public defect-pair setup materialize focused commit snapshots by default
  instead of complete before/after worktrees. Full worktrees remain available
  through `--full`; focused scans now include declared evidence paths, and CLI
  capture failures report bounded status, signal, stdout, and stderr context.
- Added bounded emitters for dependency resolution, cache integrity, cleanup
  completeness, error propagation, option propagation, resource lifetime, and
  scope resolution. Source-grounded semantic analysis handles cache-entry,
  cleanup, option, and scope claims; structured EvidenceGraph policy handles
  cache-key, cleanup-wait, dependency, error, option-default, and cross-file
  resource claims.
  The JS/TS evidence pack now preserves throw
  locations, identities, enclosing guards, and downstream identity mappings;
  scope classifiers and lexical boundaries; plus option spread, override,
  fallback, callback, connection-retention, and explicit-release context.
  Dependency-flow evidence records lookup selection, conditional loop exit, and
  post-loop return behavior, plus iterated provider candidates bypassed by a
  generic token lookup. It also records first-match selection across multiple
  reference namespaces when the same resolver exposes an ambiguity contract.
  The pinned Nest candidate-bypass and OpenClaw tab-reference pairs validate
  the latter mechanisms through direct source review and upstream regression
  tests. Assessment judgment now applies mechanism-specific source rules to
  loop overwrite, iterated-candidate bypass, and multi-namespace first-match
  candidates.
- Added deterministic error-flow evidence for Promise bridges that resolve
  from a recognized emitter event, use rejection for other failures, and omit
  a same-emitter error edge. `extractPromiseEventErrorBridgeEvidence()` exposes
  the public observation. The pinned VS Code pair validates the incomplete
  zipfile bridge before and after its upstream fix.
- Added deterministic `scope_model` evidence for binding transforms that resolve
  reference names from one scope anchor. Policy preserves the shadowing risk as
  an assessment. The pinned Vite RSC pair validates the name-only mechanism
  before and after occurrence-level scope resolution.
- Added deterministic `scope_model` evidence for visitor-style binding renamers
  that skip shadowed child scopes, preserve method keys and decorators, but omit
  the parent-evaluated switch discriminant. The public
  `extractScopeTraversalEscapeEvidence()` helper exposes the traversal gap, and
  the pinned Babel pair validates identifier, member, binary, and call
  discriminants before and after explicit requeueing.
- Added deterministic `option_flow` evidence for logical-OR fallback from an
  option member to a visible same-property boolean `true` default. Policy now
  preserves the resulting falsy-option coercion as an assessment. The pinned
  webpack pair validates both affected plugin files before and after the fix.
- Added deterministic `option_flow` evidence for request normalizers that
  replace a caller-owned abort signal with a temporary `Request` signal. The
  public `extractRequestSignalForwardingEvidence()` helper exposes the
  handoff, and the pinned Langfuse pair validates caller-signal identity and
  in-flight cancellation before and after the fix.
- Added deterministic `cache_flow` evidence for parameter-sensitive memoization
  contracts. Policy now identifies `getFactoryWithDefault` callbacks whose
  return branch depends on an outer parameter omitted from the cache key. The
  pinned Yarn pair validates this contract before and after its upstream fix.
- Added deterministic `cache_flow` evidence for lazy Promise member caches that
  retain a rejected async load without visible eviction. The public
  `extractPromiseCacheRejectionEvidence()` helper exposes the observation, and
  the pinned LaunchDarkly pair validates retry after transient failure while
  preserving successful single-flight reuse.
- Added deterministic `cleanup_flow` evidence for explicit lifecycle functions
  with fail-fast aggregate or sequential waits. The pinned Vite pair validates
  both mechanisms before and after their upstream fix. Cleanup evidence now
  also recognizes dependency-bearing React effects whose global
  `Promise.all` or `Promise.allSettled` continuation updates state without a
  returned cleanup. The public `extractAsyncEffectContinuationEvidence()`
  helper exposes that observation, and the pinned Automerge pair validates that
  a superseded effect cannot overwrite newer state after cleanup is added.
- Added deterministic error-reason evidence for Error-like constructors that
  retain a meaningful cause while selecting a default message. The pinned
  Playwright pair validates the mechanism before and after its upstream fix.
  Direct source review covers the Playwright, VS Code event bridge, Nest
  candidate-bypass, Vite RSC shadowing, webpack falsy-option, and LaunchDarkly
  rejected-Promise-cache, Sentry terminal-listener, Langfuse abort-signal, and
  Automerge superseded-effect, Babel switch-discriminant, and OpenClaw
  cross-namespace tab-reference pairs while model API calibration is deferred;
  existing token and cost totals remain scoped to the ten prior
  model-adjudicated pairs.
- Expanded resource-lifetime evidence to recognize request-scoped closures
  attached to reusable socket listeners. The pinned docker-modem pair validates
  the listener-retention mechanism before and after its upstream fix.
- Added source-local resource-lifetime evidence for named XHR
  `readystatechange` listeners with a visible `readyState === 4` terminal branch
  but no same-handler removal or once-only registration. The public
  `extractTerminalEventListenerEvidence()` helper exposes the observation, and
  the pinned Sentry pair validates detachment after completion reporting.
- Updated semantic file understanding to `semantic-file-understanding-v4` and
  assessment judgment to `assessment-judge-v6` with error-routing,
  option-precedence, scope-resolution, and autonomous resource-lifetime
  guidance.
  The paired benchmark applies independent judgment, requires every affected
  buggy path, and uses changed-line evidence density plus a structured
  compound-guard anchor without suppressing unrelated same-class candidates.
  Evidence coercion version
  `assessment-judgment-v2` accepts uniquely matched indentation-normalized
  blocks while preserving canonical source text and rejecting ambiguous
  matches.
- Added a token- and cost-aware assessment-judgment model evaluation over
  pinned buggy/fixed source pairs. The runner fetches only affected files and
  retains no source, prompts, excerpts, or model rationales. The first paired
  baseline selects `gpt-5.6-luna` at low effort over `claude-sonnet-5` for this
  task, and prices GPT-5.6 cache writes at the current 1.25x input rate.
- Normalized Anthropic structured-output schemas to its supported numeric
  subset and accepted source citations copied from numbered judgment prompts
  only when their unnumbered text matches current source exactly.
- Added a source-grounded assessment judgment pass to `rekon scan`. The typed
  `AssessmentJudgmentReport` records confirmed, rejected, deferred, and failed
  decisions with current source digests and stable assessment signatures.
- Added the `independently_confirmed` assessment lifecycle state. Independent
  confirmation strengthens an assessment but still requires applicable law or
  reproducible proof before finding promotion.
- Added open-world semantic problem candidates from current semantic file
  reports and a final policy evaluation that applies current judgments without
  mutating source, evidence, models, or law.
- Made public quality and defect-pair corpus runs ephemeral by default. Pinned
  source coordinates, public agent adjudications, and identifier-free aggregate
  calibration history remain durable while cloned repositories, source excerpts,
  and generated artifact bodies are deleted after each run.
- Added an initial pinned nine-case public defect-pair benchmark with source-grounded
  agent adjudication. Two narrow AST risks now distinguish the buggy and fixed
  revisions for inverse listener delegation and partial-match allowlist
  validation; lifecycle cleanup, option propagation, cache integrity, runtime
  retention, transform scope, dependency precedence, and abort semantics
  initially remained evidence or semantic-analysis work rather than broad
  syntax detectors.
- Added nine pinned quality-only public repositories to the detection
  benchmark contract, including Vitest, Playwright, pnpm, and Next.js for
  independent test-isolation, incomplete-capability, migration-tooling, and
  large-framework cases. Their current emissions can be adjudicated without
  fabricating a historical parity baseline or changing recall metrics.
- Public-corpus calibration now keeps generic base-grammar opinions silent
  until repository-specific or ratified law activates them. Conventional
  fixture, scaffold, sample, playground, integration-test, documentation,
  benchmark, package-manager, CLI, and logging surfaces no longer create
  production policy output, and declared entrypoints may intentionally
  bootstrap built `dist` output.
- Expanded package-manifest evidence with package imports, published-file
  patterns, and declared test-tool hooks so dynamic and externally consumed
  modules remain reachability roots. Generated files no longer become
  complexity hotspots.
- Tightened source-quality calibration: generic type arguments are no longer
  reported as direct `any` annotations, type-brand fields and safely bridged
  async Promise executors remain silent, direct environment restoration is
  recognized, implicit abstract base contracts and downstream operation
  failures do not become placeholder claims, focused-test framework fixtures
  stay quiet, consumed private-field updates and operational self-reads are
  recognized, listener-style `onEvent` callbacks remain isolated, and
  ambiguous empty catches remain evidence rather than risks.
- Excluded generated, compiled, and vendored source from source-quality policy
  while retaining raw evidence. Deliberate focused-test plumbing, named
  hook/listener isolation, nested recovery, explicit failure returns, and
  documented retries no longer become suppression assessments. Loop-local
  display fallbacks remain quiet when both branches preserve the same visible
  item and no write operation is attempted.
- Bounded reachability projection to 100 transitive imports per non-test root
  and delegated test dependency context to the application graph. Projection
  metadata reports truncation and cites the complete import graph, allowing a
  21,000-file framework repository to project without unbounded artifact growth.
- Restricted `imports.noDistImports` to repository-local relative imports so
  documented third-party package entrypoints containing `dist` do not become
  repository findings.
- Restricted `imports.noNodeModulesRelativeImports` to relative imports in
  production source, excluding test fixtures and declaration-only harnesses
  from raw finding output.
- Excluded package-declared empty entrypoint shims from empty-source
  opportunities while retaining undeclared whitespace-only production files.
- Calibrated `typescript.unusedPrivateMember` against five independent public
  source cases at full adjudicated usefulness and stable identity. The public
  corpus retains one useful error-suppression case and no legitimate empty-file
  case, so those rules remain explicitly under-evidenced rather than being fed
  synthetic positives.

- Prevented repository test and build failures from promoting when a sibling
  command in the same verification run proves missing toolchain or dependency
  context. Independent diagnostics inside the affected command remain eligible
  for normal evaluation.
- Added strict per-finding parity equivalences for source-adjudicated
  `covered-different-identity` cases, avoiding broad rule-map matches that would
  credit unrelated assessments.
- Excluded catch-and-log boundaries inside logger modules from error-suppression
  risks while retaining application and primary-persistence failures.
- Excluded fixture repositories from default test discovery so intentionally
  failing native-report fixtures run only through their explicit bench plans.

- Added a deterministic, source-grounded emission quality review packet so an
  independent agent can calibrate finding precision and assessment usefulness
  without treating historical detector volume or human review as authority.
- Added optional parity-corpus ingestion for repository-native test, lint,
  security, dependency-audit, and verification-bound coverage reports. The
  bench reuses Rekon's existing CLI normalization and policy paths rather than
  creating benchmark-only emitters. Opt-in evidence capture now runs declared
  commands through the verification runner, protects repository files, and can
  repeat a plan against one evidence state.
- Linked imported check and security reports to an explicitly selected
  `VerificationRun`, rejected cross-repository lineage, and restricted current
  check evaluation to runs coherent with the active evidence state.
- Added stable Vitest file-failure parsing, collapsed missing-dependency
  diagnostic cascades, and kept transcript variance, timeouts, and environment
  failures below automatic promotion.
- Added repository-local Vitest/Jest config selection to isolated coverage
  plans. Vitest plans now bound collection to declared source targets and
  exclude nested worktrees, allowing runtime evidence to enrich the exact
  current assessment without suite-wide coverage noise.
- Bounded per-test application-graph context and made it cite the complete
  import graph, preventing large repositories from amplifying transitive paths
  into unwriteable graph artifacts while retaining explicit truncation counts.
- Excluded Next.js `.next` build output from JS/TS evidence collection so
  generated bundles cannot pollute repository models or graph projections.
- Removed error-suppression noise from forced file cleanup and nested error
  recovery, and excluded archived source snapshots from production grammar
  enforcement.
- Distinguished explicit fail-open cache writes from required persistence so
  logged cache failures do not become error-suppression risks.
- Routed GPT-5 semantic file understanding through the OpenAI Responses API,
  requested source-cited `verb:noun` capability IDs, and admitted additional
  explicit operational verbs without promoting evidence-free signals.
- Made `gpt-5.6-luna` at low effort the semantic-file default after a bounded
  source-grounded comparison, and required capability citations to match the
  current source text before they can enter `CapabilityMap`. Verified excerpts
  now receive canonical source line coordinates instead of trusting model line
  estimates.
- Calibrated dependency-advisory impact against lockfile exposure. Native
  severity remains explicit, while development-only direct and transitive
  paths are capped below unproven production impact. npm umbrella dependency
  rows without their own advisory identity no longer duplicate leaf risks.
- Corrected emitter-quality failures found by that review: secondary
  helper names no longer create naming violations, incomplete root graphs no
  longer prove dead code, documented empty catches, logged listener isolation,
  and restored test state stay quiet, and obsolete or source-stale semantic
  reports cannot emit claims.
- Added repeatable `rekon scan --semantic-debt-file-path` targeting for bounded,
  source-grounded model calibration without bypassing containment, eligibility,
  reuse, or file-budget controls.
- Versioned semantic-debt judgment to `debt-judge-v3`, with numbered source
  evidence and a stricter boundary rule for missing-validation claims. V2
  reports remain historical artifacts and no longer emit current claims.
- Added deterministic `typescript.typeEscape` evidence for explicit `any`
  annotations, including catch variables, under the existing assessment rule.
- Added semantic-debt coercion versioning to report policy and reuse checks, and
  stopped ordinary prose such as "before any repository work" from being
  mislabeled as a type assertion.

- Added a local, agent-driven review workflow for unmatched redesign cases that
  separates emitter gaps from evidence, matching, classification, and noisy
  historical signals without changing parity scores automatically.
- Expanded the source-backed redesign review to 102 cases and added narrow
  evidence for whitespace-only production files, explicitly future empty action APIs,
  and constant-empty public query methods on concrete exported classes.
- Extended placeholder-risk evidence to exported action contracts whose empty
  implementation explicitly documents itself as a no-op, while excluding
  internal reset shims and intentional component slot markers.
- Mapped source-backed placeholder assessments to the corresponding historical
  redesign goal without promoting them to findings. Same-file complexity risks
  remain separate when they do not establish the same remediation.
- Completed the built-in policy registry, public rule-ID exports, quality
  inventory, and eval declarations for compiler-proven unused imports, unused
  private members, and unreachable statements.
- Preserved unused-private-field opportunities through unresolved TypeScript
  project environments with source-local read analysis, including write-only
  self-updates, while deduplicating overlapping compiler evidence.
- Added repository-declared `ownership.doesNotOwn` Rulebook evaluation. The
  policy joins explicit law to capability and ownership projections, rejects
  malformed or duplicate active rules, and carries law and model provenance
  into the resulting finding report.
- Added `.rekon/config.json` Rulebook ingestion to the normal evaluation and
  refresh path. Configured law is validated, materialized as a typed canonical
  input, reused when unchanged, and explicitly superseded when removed.
- Integrated semantic file evidence into the current scan lineage. Scan now
  produces model reports before refresh, refresh builds a current
  `CapabilityEvidenceGraph`, and model projection accepts only high-confidence
  semantic capabilities with artifact evidence.
- Fixed semantic file analysis with a configured OpenAI key by defaulting its
  router to the built-in `openai` provider and retaining provider failures in
  report warnings instead of silently degrading.
- Calibrated dead-code roots for Next.js metadata and Vercel filesystem functions, made naming findings require exported role evidence, distinguished composition seams and CLI output from policy violations, tightened semantic-debt judgment against lint and speculative exposure claims, and documented source-grounded agent adjudication as the quality loop.
- Prevented unresolved TypeScript environments from manufacturing structural compiler findings, removed non-null assertions as standalone risks, excluded intentional catch suppression and internally handled effect promises, recognized guaranteed test environment cleanup, and narrowed deprecated-debt evidence to actual tags.
- Hardened quality benchmarking so resolved invalid or unhelpful labels remain calibration history, expected valid records cannot disappear silently, duplicate identity is repository-scoped, and subset runs use only their selected repositories' adjudications.

- Prevented refresh publications and new intent assessments from implicitly
  selecting WorkOrder or verification proof from an earlier intent. Historical
  artifacts remain inspectable, and explicit refs remain authoritative.
- Prevented intent preparation from selecting the latest unrelated
  VerificationResult. Prepare now uses only explicit proof or proof already
  cited by its selected assessment.
- Restricted scan/refresh snapshots to artifacts produced by the current run,
  preventing stale optional context graphs from an earlier intent from making
  a new repository scan stale. Direct snapshot calls retain store-wide family
  selection unless they pass explicit artifact refs.
- Added `documentation` to the shared intent task-kind contract and preserved
  it through assessment, preparation, status, WorkOrder, VerificationPlan, and
  generated phase bundles.
- Documentation verification phases now recognize conditional read-only
  language such as "do not change files unless a real documentation defect is
  found" and retain a forbidden source-change policy.
- Post-run operator inspection commands no longer contribute path tokens to a
  plan phase's worker scope.
- Explicit phase scope and Expected Changed Files now take precedence over
  reference-only paths mentioned in evidence text.
- VerificationPlan handoff generation now preserves supported command flags
  and npm separators verbatim. Unsafe or unsupported commands block generation
  with a typed issue instead of being omitted. Mixed plan answers keep prose as
  manual evidence and normalize sentence punctuation on command entries.
- External-reference dogfood summaries now count only artifacts emitted by the
  current run and omit local roots, timestamps, artifact refs, and paths.
- Capability normalization now fuses symbol and export evidence for the same
  executable declaration into one candidate while retaining all supporting
  fact ids and kinds in report provenance.
- Corrected parity benchmarking for redesigned output classes. Matching risks
  and opportunities now contribute to a separate observable-signal metric
  without inflating weighted finding recall, and coverage tables split finding
  matches from assessment matches.
- Fixed capability-overlap evaluation to consume the public
  `CapabilityMap.entries` contract. Repeated capability projections now merge
  their subjects, systems, and evidence, and the policy manifest declares its
  model-artifact dependencies and invalidation rules.
- Added `debt-eligibility-v2`. Semantic-debt scans now exclude hidden
  operational artifacts before provider judgment, and cached reports must
  match the active eligibility version before per-file judgments are reused.
- Fixed semantic-debt file budgets so `--semantic-debt-file-limit` caps total
  active report entries. Re-running a scan now reuses the bounded set instead
  of silently spending the same budget on another batch.
- Fixed Voyage embedding indexing for real repositories by batching provider
  requests within item and conservative aggregate-token limits. Multi-batch
  calls preserve input order, sum usage, and return no partial vector result
  when a later batch fails.
- Reduced embedding-duplication noise by comparing only like chunk
  representations, keeping declaration signatures contextual, and requiring
  reciprocal duplicate evidence before emitting an opportunity.
- Capability-node duplicate opportunities now cite their graph-resolved
  implementation paths while remaining unverified comparison candidates.
- Capability ontology extraction now uses JS/TS declaration metadata to keep
  executable functions and methods while excluding known classes, schemas,
  types, interfaces, constants, and re-export-only declarations from semantic
  capability normalization.
- Capability overlap now prefers stable canonical function/method groups from
  `CapabilityNormalizationReport`; `CapabilityMap.entries` is used only when a
  normalization report is unavailable.
- Ownership projections now distinguish declared ownership from inferred path
  grouping. Capability-overlap policy ignores explicitly inferred entries, and
  the universal capability ontology no longer aliases filesystem `path` to web
  `route`; URL operations now retain their own canonical noun.
- JS/TS evidence now identifies unused import bindings through TypeScript name
  resolution even when `noUnusedLocals` is disabled. Policy exposes them as
  verified, low-impact `typescript.unusedImport` opportunities rather than
  compiler-error findings.
- JS/TS evidence now exposes compiler-proven unused private members and
  unreachable statements as verified, low-impact dead-code opportunities.
  Ordinary unused locals and public declarations remain excluded.
- Semantic-debt eligibility now excludes structured data outputs and files that
  exceed the bounded prompt. Same-prompt judgments remain reusable across
  eligibility revisions after the current file passes the stricter gate.
- Embedding similarity now uses exact search for small comparable groups and a
  deterministic bounded candidate search for large groups. Search output
  reports comparisons against possible pairs and never compares mixed model
  spaces.
- Capability graph discovery now applies the configured agent-scratch scope,
  and full embedding indexes prune chunks that disappeared from the graph.
  Path-scoped index updates continue to preserve records outside their scope.

- Made local-tarball installation the canonical distribution smoke. CI now
  installs all 24 workspace packages in a temporary consumer, imports their
  public exports, runs the installed `rekon` bin, and validates emitted
  artifacts without publishing anything.

- Added structured artifact supersession identities. Freshness now compares
  independent graph, publication, resolver, source-report, memory-query, path,
  intent, and verification streams without treating an unrelated artifact of
  the same type as a replacement.
- Intelligence snapshots now retain the latest artifact in every supersession
  family, include community artifact types, and declare every selected member
  from inputs, projections, and evaluations in canonical header lineage.
  Publications and actions remain indexed without creating circular
  dependencies. Snapshot status now reflects stale selected lower-layer members
  rather than evidence freshness alone.
- Artifact index entries now record and validate `supersessionKey` metadata,
  using `null` for type-wide streams. Valid legacy entries are backfilled during
  store initialization, while conflicting index/header identities fail strict
  artifact reads.

- Fixed `rekon intent status` provenance selection so assessment, preparation,
  status, work, and verification proof must form one artifact lineage. JSON
  output now identifies selected and missing refs; incompatible explicit refs
  fail with typed lineage errors.

- Added artifact invalidation baselines for tracked source/config content and
  producer versions. Freshness now reports source, configuration, artifact
  lineage, and tool-version drift; snapshots carry current evidence staleness.
- Made incremental observation preserve a complete repository evidence graph,
  including deletion handling and refreshed manifest/compiler evidence. Added
  smoke, contract, live, and benchmark test lanes plus an incremental pipeline
  benchmark.
- Added `GraphSlice.sliceType` so freshness compares a graph input only with
  newer generations of the same graph family.

- Added first-class assessment lifecycle states across reports, CLI filtering,
  resolver packets, traces, and generated guidance. Tightened root-cause fusion
  so unrelated types or file scopes cannot merge solely because they share a
  key, while preserving original detector evidence as supporting signals.
- Split semantic debt eligibility, judgment, deterministic corroboration, and
  finding promotion into explicit stages. Generated, non-production,
  declaration, binary, and empty files are excluded before provider calls;
  corroborated model output remains a claim until the existing promotion gate
  is satisfied.
- Added external private-corpus support to the token-aware semantic debt
  evaluator without writing corpus paths to reports. Added a balanced labeled
  duplicate-pair evaluator for the production embedding threshold, including
  precision, recall, separation, stability, token, and cost metrics.
- Expanded JS/TS resolution to honor declared workspace export subpaths,
  including conditional and wildcard targets, without guessing undeclared
  package internals. Added syntax-backed Express and NestJS routes and
  manifest-backed Vite roots.
- Added conservative risks for bare local async calls, focused tests, and
  direct process-environment mutation inside test callbacks. Providers now
  honor `includeTests`; runtime observation continues to include tests by
  default. Style remains delegated to imported linter evidence.
- Added deterministic callable, entry-point reachability, and behavior graphs.
  Dead-code reachability now includes evidence-backed roots and dynamic imports,
  while preflight exposes graph impact context without changing risk tiers.
- Added typed JUnit XML and ESLint JSON ingestion with bounded, redacted report
  artifacts and the existing two-report reproducibility requirement. Added
  LCOV support to isolated runtime coverage observations.
- Added native pnpm 11 audit, Yarn audit NDJSON, and OSV-Scanner JSON adapters
  to dependency-vulnerability ingestion. All adapters preserve only normalized
  advisory, version, scope, and source-path evidence and remain assessment-only.
- Added typed npm audit v2 ingestion with lockfile-backed installed versions,
  dependency paths, production/development scope, stable advisory identity,
  partial-input warnings, and assessment-only dependency vulnerability policy.
- Hardened the parity benchmark with external-only operator adjudications,
  per-rule quality thresholds, separate finding precision and assessment
  usefulness, and a sanitized aggregate report that excludes corpus roots,
  repository ids, record ids, and file paths.
- Added repository-local SARIF 2.1 security ingestion with typed
  `SecurityScanReport` artifacts, stable scanner-result identity, outside-root
  path rejection, and current-evidence policy risks. Generic lint SARIF remains
  provenance only, and scanner output does not auto-promote to findings.

- Added neutral JS/TS function metrics and a multi-signal maintainability risk
  that requires at least two independent complexity thresholds. Single-signal
  functions, tests, and generated code remain excluded, and static complexity
  never becomes a finding automatically.
- Corrected import graph projection to connect resolved repository file paths
  and added one architecture risk per runtime import cycle. Type-only and
  non-production cycles are excluded.
- Added dependency-hub risks for production modules with high incoming and
  outgoing resolved value or type import pressure. One-sided facades and leaf
  modules remain quiet.
- Extended isolated Istanbul provenance with normalized function ranges and
  execution counts. Fresh coverage bound to a `VerificationRun` now enriches
  the existing complexity risk while keeping passing, failing, and scoped zero
  execution distinct.
- Added explicit source targets to generated isolated coverage plans. A passing
  run can now identify a scoped complexity coverage gap only when the target was
  declared and the instrumented function recorded zero execution.
- Added `@rekon/kernel-assessments` with typed risk, opportunity, semantic
  claim, and model-diagnostic contracts, root-cause fusion, and conservative
  finding-promotion rules.
- Reclassified semantic debt, debt markers, capability overlap, unresolved
  ownership, and uncertain dead-code output so they no longer enter
  `FindingReport` without sufficient proof or applicable law.
- Added a detection-quality charter and a machine-checked built-in emitter
  inventory.
- Preserved architecture, dead-code, lint, and stub model concerns as typed
  semantic claims instead of discarding them at the model boundary.
- Added conservative TypeScript compiler evidence and governed findings for
  reproducible file-local syntax and stable type errors.
- Added AST-backed source-quality risks for type escapes, error suppression,
  and explicit placeholder implementations, fused by file and construct rather
  than emitted once per occurrence.
- Added conservative async-control-flow risks for unshadowed async Promise
  executors and async callbacks passed to synchronous methods on statically
  recognized arrays.
- Added embedding-backed duplicate implementation opportunities from explicit
  `CapabilityEvidenceGraph` similarity claims, with reciprocal and self-pair
  deduplication and no automatic finding promotion.
- Expanded JS/TS evidence with package manifests, lifecycle build targets,
  Next.js route and screen conventions, and test-file framework metadata.
- Added a deterministic application graph slice for routes, screens, tests,
  packages, and lifecycle build targets without inferring runtime flow or test
  coverage.
- Added static test context to the application graph: resolved import
  dependencies use `depends_on`, while routes, screens, and capability hints
  sharing those dependencies use `related_to`. Repeated test failures surface
  this context and cite the graph without treating it as coverage or promotion
  evidence.
- Extended runtime graph observation with safe `execution_observation` events.
  Application graphs expose instrumented test-to-file and test-to-route
  relationships as `observed` edges, and repository check diagnostics surface
  that context separately without treating execution as assertion coverage or
  promotion evidence.
- Added an Istanbul coverage adapter for isolated test runs. The CLI requires
  explicit `--test-path` attribution, records coverage digest and file-count
  provenance, rejects outside-root inputs, and emits only observed source
  context rather than assertion-coverage claims.
- Added optional `VerificationRun` binding for isolated Istanbul coverage.
  Rekon records the exact completed command behind the attribution, rejects
  stale or mismatched coverage, and can execute and bind through
  `rekon verify run --execute` without introducing another command runner.
- Added deterministic Vitest and Jest isolated-coverage planning. Rekon resolves
  installed local binaries, writes typed `VerificationPlan` coverage metadata,
  and lets the existing verification runner execute and bind the report without
  implicit package installation.
- Added repository-native lint, test, typecheck, and build diagnostics from
  completed `VerificationRun` artifacts. One-off and operational failures remain
  risks; only the same normalized failure reproduced twice on the current
  evidence state promotes automatically. Source-quality promotion additionally
  requires an exact location and signal-specific diagnostic match. Added stable
  per-diagnostic parsing for ESLint, TypeScript, Vitest/Jest-style failures,
  Node TAP blocks, and file-located build errors, while retaining normalized
  raw-output fallback for unsupported formats.
- Added bounded resolved-import blast radius to file-local repository-check
  diagnostics. Only import graphs tied to current evidence are used, and graph
  context does not alter severity or finding promotion.
- Added assessment-aware preflight, work-order, and agent-guidance context
  without promoting assessments into findings.
- Added an end-to-end adjudicated detection-quality fixture covering finding
  classification, assessment classification, evidence completeness, root-cause
  completeness, and duplicate remediation rate.

- Added a token-aware Voyage embedding evaluator covering retrieval quality,
  repeat stability, latency, token cost, dimensions, and vector storage.
- Changed the default embedding profile from `voyage-code-3` at 1024
  dimensions to `voyage-4` at 512 dimensions. `voyage-4-lite` is the evaluated
  economy model.
- Added embedding usage reporting, enforced requested output dimensions, and
  blocked queries against incompatible cached model spaces with an actionable
  reindex message.
- Added a token-aware semantic-debt model evaluator with a labeled corpus,
  repeat stability, quality metrics, latency, detailed token usage, current and
  steady-state cost, and a cost/quality frontier.
- Added experimental OpenAI Responses and Anthropic Messages adapters with
  structured JSON output and provider-native effort controls. Existing OpenAI
  Chat Completions behavior is unchanged.
- Moved scan-time semantic-debt judgment to OpenAI Responses and pinned the
  evaluated production profiles: `gpt-5.6-luna` at `low` effort by default and
  `gpt-5.4-nano` at `none` as the economy override. Added
  debt-specific model and effort overrides through CLI flags and environment
  variables.
- Added the semantic debt overlay: `SemanticDebtJudgmentReport` artifacts,
  the `debt.semantic` policy rule, and `rekon scan --semantic-debt
  off|auto|required`.
- Added scan-time semantic debt report reuse keyed by provider, model, effort,
  prompt version, and full-file SHA-256. The report records model provenance
  and a confidence score; judgments are proposals, not proof.
- Added the pure semantic debt judgment law in `@rekon/capability-model`,
  including the tech-debt concern filter, pattern tagger, and adapter-result
  coercion. The judge model and reasoning effort remain overrideable.
- Extended parity bench rule mapping with optional `rekonRuleIds` so `tech_debt`
  can be served by both `debt.markers` and `debt.semantic` without changing
  exact-match scoring semantics.
- Semantic scan is now on by default: `rekon scan` runs the semantic file
  layer in `auto` mode whenever `OPENAI_API_KEY` is present, without any
  flag. Opt out with `--no-semantic`, `REKON_SEMANTIC=off`, or
  `.rekon/config.json` `{"semantic": {"mode": "off"}}`. Keyless runs degrade
  to the deterministic scan with a one-line notice and report
  `semanticFiles.providerAvailable: false`. An explicit
  `--semantic-files auto` keeps the documented keyless behavior (per-file
  deterministic fallback reports with warnings); `--semantic-files required`
  still fails clearly without a key.
- LLM enablement flipped from opt-in to opt-out: a present key enables the
  provider unless `REKON_LLM_ENABLED` is `0`/`false`/`off`
  (`REKON_LLM_ENABLED=1` is no longer needed).
- `@rekon/llm-provider`'s package description and module header now
  accurately describe the shipped live OpenAI and Voyage adapters (they
  previously claimed the package made no network calls).

## 1.0.0

- Shipped the public Rekon repository as a local-first codebase intelligence
  substrate with typed artifacts, a capability SDK, runtime, CLI, and built-in
  capabilities.
- Added repository scanning, model projection, graph projection, policy
  evaluation, resolver packets with trace, publications, memory, intent
  artifacts, verification recording, reconciliation planning, and artifact
  validation.
- Added public docs for artifacts, extensions, strategy, and local usage.
- Cleaned the public product surface by removing internal work orders, review
  packets, generated freshness indexes, alpha/beta planning docs, and strategy
  snapshot logs from the tracked docs tree.
- Reframed README, docs index, contributing, security, and strategy docs around
  the current product surface rather than internal build process.
- Hardened local capability and artifact trust boundaries: unsafe external
  capability package specifiers are rejected before import, artifact reads verify
  containment/header/digest data, handler artifact access requires declared
  permissions, source-file inputs must resolve inside the repository, and
  GitHub Check payloads no longer report success when verification proof-chain
  warnings are present.
