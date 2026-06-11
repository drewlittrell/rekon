# Law Calibration v2 Decision (WO-13)

> **SNAPSHOT.** This is a point-in-time record as of its slice. Do not
> read it as current state. Current state lives in source code, CLI
> output, artifact schemas, `docs/concepts/`, and
> `docs/strategy/rekon-system-model.md`.

**Status: pinned (WO-13, law track).** The descriptive ontology informs
the prescriptive grammar for the first time: vocabulary nouns exempt
forbidden-type suffixes, counted, never silent.

## Step 0 (light)

- Vocabulary override surface confirmed:
  `.rekon/capability-ontology.overrides.json` ->
  `loadCapabilityOntologyConfig` + `detectOverlayPacks` ->
  `compileEffectiveCapabilityOntology` (the CLI's exact composition,
  mirrored in the policy runtime). Config requires `version: "0.1.0"`.
- The placement axis and the advisory forbidden-type check were TWO code
  paths (grammar-divergence.ts and grammar/index.ts each iterated
  `grammar.forbiddenTypes` with their own stem logic). **Unified** per
  the WO-11 precedent: `matchForbiddenTypeSuffixes(grammar, filePath,
  vocabularyNouns?)` in capability-ontology is now the one check; both
  callers consume its matches and its `vocabularyExempted` flag.

## Operator provenance (Part 1)

`GrammarSourceRefSchema` now admits `operator:<ruling-ref>` (for example
`operator:wo-13#instrumentation`) alongside the classic-shaped refs.
Arbitrary strings still fail. The WO-11 entries' interim
`operator-overrides.ts#<id>` sources migrated to the honest form as part
of the Part 2 edits; the wart recorded in the WO-11 memo is retired.

## The rulings as landed (Parts 2-3, mentor corpus copy)

- **instrumentation** replaces http-middleware: withBatonContext.ts plus
  `infra/telemetry/handoff/**`, with the queued future ruling named in
  the law text (classic's inverse rule mandated the baton wrapper;
  required-edge graduation is a separate operator act).
- **boundary-contracts** superseded: gains
  `experiences/simile_builder/domain/ContractSyncPolicy.ts` and the
  wire-operation-identifiers sentence.
- **Vocabulary**: canonical noun `base` ("the base derived state, the
  pre-overlay state layer") declared in
  `.rekon/capability-ontology.overrides.json`, provenance this work
  order. Compiles to 69 canonical nouns with the nextjs-app overlay.

## Vocabulary-aware suffix matching (Part 4)

A matched suffix token, lowercased, that is a canonical noun in the
repo's compiled vocabulary does not fire - nouns only; verbs and aliases
never exempt; jurisdiction is per-repo (no declaration, no exemption).
Transparency guard: `evaluateGrammarDivergence` accepts a `stats`
counter and counts every vocabulary exemption; the contract suite
includes the manager-amnesty tripwire (declaring `manager` a noun shows
up as an exemption spike, three counted on a three-file fixture). The
runtime wrapper compiles the scanned repo's vocabulary on every
evaluation; a missing or malformed config means no exemptions - the
hygiene law fires as before.

## Re-run (Part 5): 92 -> 88, one delta beyond the expected three

Expected and observed: the voice handler's telemetry-handoff bypass, the
simile handler's ContractSyncPolicy bypass, and the deriveAllBase.ts
placement finding all retired. Vocabulary exemptions: 1 (deriveAllBase).
Zero findings appeared; every surviving finding id is byte-identical.
Recall untouched: 2.8% (167/5,993); controls unchanged.

**Reported, not absorbed - the fourth retirement:**
`core/domain/DecisionEngine.ts -> infra/telemetry/handoff/index.ts`
(layer_import) also retired. The instrumentation ruling is path-scoped:
moving `infra/telemetry/handoff/**` into a layer no topology edge
references legalizes imports from EVERY layer, not only route - the
purpose claim argues the route edge, but the mechanism is broader. The
operator should confirm domain-side telemetry imports are inside the
ruling's intent; if not, the refinement is a topology edge forbidding
non-route layers into instrumentation (a one-entry follow-up ruling).
This finding was classic-matched via file overlap and its file retains
other matches, so recall did not move.

## The standing register (operator-ratified, stays open on purpose)

The surviving 10 of the 13-set reconcile exactly:

- **Eight placement findings as governed debt** (renames as remediation,
  classic's correction pairs the guide): Helpers.ts,
  RegistryHelpers.ts, promptStateHelpers.ts, VoiceSessionManager.ts,
  AssessmentResponseUtils.ts, AssessmentStateManager.ts,
  AssessmentKeyUtils.ts, surfaces/web/styles/Utils.ts.
- **Two composition-root findings as real drift**, one-move remedies
  recorded: `infra/providers/index.ts` (provider resolution moves into
  `createVoiceServices`) and `core/domain/DecisionEngineFactory.ts`
  (engine acquisition moves into the gate service).

Their persistence is the register working, never a number to optimize
away.
