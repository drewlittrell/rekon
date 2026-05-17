# Review Packet: Configured Filter Policy Freshness / Publication Guardrails

Slice: P1.1 (Issue Adjudication), filter-policy-freshness v2 slice.
Implements step 8 of the
[issue governance ADR](../../docs/strategy/issue-governance-architecture-decision.md)
Implementation Order (flipped from `(future)` to `(shipped)`).

## CHANGES MADE

### `packages/kernel-findings/src/index.ts`

- New imported helper from `@rekon/kernel-artifacts`:
  `digestJson` (existing canonical-JSON SHA-256 helper, used
  by `fingerprintFindingFilterPolicies`).
- New exported type
  `FindingFilterPolicyFingerprint = { digest: string;
  ruleCount: number; ruleIds: string[] }`.
- `FindingFilterReport.policyFingerprint?:
  FindingFilterPolicyFingerprint` — additive optional field.
  Absent on reports written before this slice; treated as
  `status: "unknown"` by downstream consumers.
- New exported helper
  `fingerprintFindingFilterPolicies(policies)`. Canonicalizes
  each `FindingFilterPolicyRule` into a plain object with only
  the matchers actually set (skips `undefined`), preserves the
  array order (because `digestJson` only sorts object keys —
  arrays are walked in order), and returns `digest` /
  `ruleCount` / `ruleIds`.
- `createFindingFilterReport` accepts an optional
  `policyFingerprint` and threads it onto the assembled
  report.
- `validateFindingFilterReport` validates the optional field
  via new file-local `validatePolicyFingerprint(value, path,
  issues)` (checks digest is a non-empty string, ruleCount is
  a non-negative integer, ruleIds is a string array, and
  `ruleIds.length === ruleCount`).

### `packages/runtime/src/index.ts`

- New imported helper from `@rekon/kernel-findings`:
  `fingerprintFindingFilterPolicies`.
- `buildFindingFilterReport` now always computes
  `policyFingerprint = fingerprintFindingFilterPolicies(
  options.policies ?? [])` and threads it into
  `createFindingFilterReport`. Even runs with no policies
  carry the empty-policy fingerprint, so future comparisons
  can distinguish "no fingerprint recorded" (older reports)
  from "ran with zero policies".

### `packages/cli/src/index.ts`

- New imported helper from `@rekon/kernel-findings`:
  `fingerprintFindingFilterPolicies` (plus the existing
  `FindingFilterPolicyFingerprint` type).
- `rekon findings filter-policy apply` JSON output gains:
  - `currentPolicyFingerprint` — fingerprint of
    `existingRules` (state before apply). Always emitted on
    both dry-run and actual apply.
  - `projectedPolicyFingerprint` — dry-run only; fingerprint
    the apply would land.
  - `policyFingerprint` — actual apply only; same as
    `projectedPolicyFingerprint` but emitted on the
    `applied: true` branch so operators can see exactly which
    fingerprint the next `rekon refresh` will stamp.

### `packages/capability-docs/src/index.ts`

- New imports: `readFile` from `node:fs/promises` and
  `resolve` from `node:path`. New imports from
  `@rekon/kernel-findings`: `FindingFilterPolicyFingerprint`,
  `FindingFilterPolicyRule`, `fingerprintFindingFilterPolicies`,
  `validateFindingFilterPolicyRules`.
- New exported type:
  ```ts
  export type FilterPolicyStaleness = {
    status: "fresh" | "stale" | "missing" | "unknown";
    currentFingerprint?: FindingFilterPolicyFingerprint;
    reportFingerprint?: FindingFilterPolicyFingerprint;
    warnings: string[];
    recommendedCommand?: string;
  };
  ```
- New exported pure helper `computeFilterPolicyStaleness({
  currentFingerprint, filterReport })`:
  - `missing` when `filterReport` is undefined.
  - `unknown` when `filterReport.policyFingerprint` is
    undefined.
  - `fresh` when the digests match (also fresh when
    `currentFingerprint` is undefined and we have a report
    fingerprint).
  - `stale` otherwise, with a warning recommending
    `rekon refresh`.
- New exported async helper
  `loadCurrentFindingFilterPolicies(repoRoot)`:
  - Reads `.rekon/config.json`. Missing config → returns
    empty-policy fingerprint. Malformed / unreadable / not a
    JSON object → returns `undefined` (publishers treat as
    `unknown` via no current fingerprint, which combined
    with a report fingerprint still surfaces a clear status).
  - Validates `findingFilters` via
    `validateFindingFilterPolicyRules` and fingerprints the
    *valid* subset (matches what `applyFindingFilters` would
    actually run).
- Publishers updated:
  - `architectureSummaryPublisher.publish({ artifacts, input })`
    and `agentContractPublisher.publish({ artifacts, input })`
    — destructuring expanded to read the runtime-injected
    `input.repo.root` via the new
    `resolveRepoRoot(input)` helper.
  - Both publishers now call
    `loadCurrentFindingFilterPolicies(repoRoot)` and
    `computeFilterPolicyStaleness({ currentFingerprint,
    filterReport })`, then thread
    `findingFilterPolicyStaleness` into the renderer inputs.
- New file-local helper `resolveRepoRoot(input)` — safely
  reads `input?.repo?.root` and returns it when it's a
  non-empty string; returns `undefined` otherwise (keeps the
  publishers usable in synthetic tests).
- `ArchitectureSummaryInputs` + `AgentContractInputs` gain
  optional `findingFilterPolicyStaleness?:
  FilterPolicyStaleness`.
- `renderArchitectureSummary` calls new helper
  `appendArchitectureFindingFilterPolicyFreshness(sections,
  staleness)` between `appendArchitectureFindingFilterHealth`
  and `appendArchitectureFindingFilterPolicySuggestions`.
  Renders `## Finding Filter Policy Freshness` with status,
  current fingerprint, report fingerprint (formatted as
  `\`<short-digest>\` (<rule-count> rule(s))`), and a
  status-specific blockquote / fresh confirmation.
- `renderAgentContract` calls new helper
  `appendAgentContractFindingFilterPolicyFreshness(sections,
  staleness)` between `appendAgentContractFindingFilterHealth`
  and `appendAgentContractFindingFilterPolicySuggestions`.
  Renders `### Finding Filter Policy Freshness` with the same
  shape; on `stale` emits a louder agent-facing blockquote.
- New file-local helper
  `formatPolicyFingerprintCell(fingerprint)` shared by both
  renderers.
- `AGENT_CONTRACT_DO_NOT_DO` gains:
  "Do not rely on active issue / coherency counts after
  `.rekon/config.json` `findingFilters` changed until
  `rekon refresh` has rebuilt the filter chain with the
  current policy set."
- Manifest update: the existing `finding-filter.changed`
  invalidation rule's description was expanded to mention the
  new Finding Filter Policy Freshness section so the rule
  documentation matches the section it now controls.

### Tests

- New `tests/contract/filter-policy-freshness-guardrails.test.mjs`
  with **19 tests** (all passing):
  Pure helpers (8):
  1. `fingerprintFindingFilterPolicies` is deterministic for
     the same input.
  2. `fingerprintFindingFilterPolicies` is order-sensitive.
  3. Empty array produces a stable empty fingerprint.
  4. Ignores undefined matcher fields.
  5. `computeFilterPolicyStaleness` missing filter report →
     `missing`.
  6. Filter report without fingerprint → `unknown`.
  7. Matching digest → `fresh`.
  8. Divergent digest → `stale` + `rekon refresh`
     recommendation.
  Loader + refresh integration (3):
  9. `FindingFilterReport` written by `rekon refresh`
     includes `policyFingerprint`.
  10. `loadCurrentFindingFilterPolicies` returns
      empty-policy fingerprint for an empty config.
  11. `loadCurrentFindingFilterPolicies` fingerprints the
      actual `findingFilters` in config.
  Apply-CLI fingerprint (2):
  12. `apply --dry-run` includes
      `projectedPolicyFingerprint` and
      `currentPolicyFingerprint`, and does not mutate
      config.
  13. Actual apply returns `policyFingerprint` after writing.
  End-to-end publications (4):
  14. Architecture summary reports policy `fresh` after
      `rekon refresh`.
  15. Architecture summary warns `stale` after
      `.rekon/config.json` `findingFilters` changes (without
      a second refresh).
  16. Agent contract warns `stale` after `findingFilters`
      change + the new Do Not Do reminder appears.
  17. `rekon refresh` after a config change clears the
      stale warning.
  Integrity (2):
  18. Raw `FindingReport` is not mutated by apply or
      freshness checks (byte-identical before/after).
  19. `rekon artifacts validate` stays clean after refresh +
      publish + freshness rendering.
- Full suite: **588 passed / 1 skipped / 0 failed**.

### Docs

- `docs/artifacts/finding-filter-report.md` — Shape gains
  `FindingFilterPolicyFingerprint` and the optional
  `policyFingerprint` field; new "Policy Fingerprint"
  section documenting downstream surfaces.
- `docs/concepts/finding-filters.md` — new "Policy
  Fingerprint and Freshness" section after "Audit
  Guarantee".
- `docs/concepts/finding-filter-policy-suggestions.md` —
  "Surfaced In Publications" expanded with cross-reference
  to the new freshness section.
- `docs/artifacts/architecture-summary-publication.md` —
  new numbered section 8 "Finding Filter Policy
  Freshness"; previous sections 8-17 shifted to 9-18.
- `docs/concepts/architecture-summary-publication.md` —
  publisher description extended to mention the freshness
  helpers and section.
- `docs/artifacts/agent-contract-publication.md` —
  subsection description extended; new third
  filter-related Do Not Do reminder.
- `docs/concepts/agent-operating-contract.md` — section
  table updated; new "Finding Filter Policy Freshness"
  prose section.
- `docs/concepts/refresh.md` — new "When To Use It"
  bullet for after `.rekon/config.json findingFilters`
  changes.
- `docs/strategy/issue-governance-architecture-decision.md`
  — Implementation Order step 8 flipped from `(future)` to
  `(shipped)` with a full description.
- `docs/strategy/classic-subsystem-purpose-map.md` —
  subsystem 6 row appended with the shipped behavior;
  next-slice column changed to "Classic issue filtering
  parity v2: content / result filter expansion"; status
  string updated with `+ filter-policy-freshness v2`.
- `docs/strategy/classic-behavior-roadmap.md` — new
  detailed entry "Configured filter policy freshness /
  publication guardrails (P1.1 filter-policy-freshness v2
  slice)".
- `docs/strategy/classic-guarantee-regression-plan.md` —
  new shipped entry pinned by
  `tests/contract/filter-policy-freshness-guardrails.test.mjs`
  (19 tests).
- `docs/strategy/roadmap.md` — new bullet under the alpha
  spine for the filter-policy-freshness v2 slice.
- `CHANGELOG.md` — detailed entry at the top of
  `0.1.0-alpha.1`.

Review packet:
`.rekon-dev/review-packets/filter-policy-freshness-guardrails.md`
(this file).

## PUBLIC API CHANGES

`@rekon/kernel-findings`:
- New exported function
  `fingerprintFindingFilterPolicies(policies)` (additive).
- New exported type `FindingFilterPolicyFingerprint`
  (additive).
- `FindingFilterReport.policyFingerprint?` (additive
  optional). No `schemaVersion` bump.

`@rekon/capability-docs`:
- `ArchitectureSummaryInputs.findingFilterPolicyStaleness?`
  and `AgentContractInputs.findingFilterPolicyStaleness?`
  (additive optional).
- New exported type `FilterPolicyStaleness`.
- New exported helpers `computeFilterPolicyStaleness` (pure)
  and `loadCurrentFindingFilterPolicies` (async loader).
- Publishers' internal `publish({ artifacts })` signatures
  expanded to `publish({ artifacts, input })`. `input` was
  always available via the SDK shape; the publishers now
  destructure it.

`@rekon/cli`:
- `rekon findings filter-policy apply` JSON output is a
  superset of the previous shape. New fields:
  `currentPolicyFingerprint`,
  `projectedPolicyFingerprint` (dry-run only),
  `policyFingerprint` (actual apply only).

`@rekon/runtime`:
- `buildFindingFilterReport` now always stamps a
  `policyFingerprint` onto the produced
  `FindingFilterReport`. Pure-additive — older callers see
  no observable change in shape beyond the new field.

No SDK API change. No artifact registry change. No artifact
`schemaVersion` bump (additive optional field). No new
artifact type. No new capability role. No new CLI
subcommand. No version bump. No npm publish.

## PURPOSE PRESERVATION CHECK

Original problem:
- Applying or changing finding filter policy alters the
  active governed issue surface.
- If lifecycle / adjudication / coherency / publications were
  built before the config change, agents may act on stale
  governed issue state.
- Without a guardrail, `.rekon/config.json` changes can
  silently invalidate issue governance.

Classic workflow guarantee:
- Codebase-intel-classic issue detection used current
  config / exclusions during the detection / filtering
  pipeline before producing the canonical issue surface and
  coherency delta.
- The important guarantee is that active issue governance
  reflects the current filter / exclusion policy set.

Classic shape that provided the guarantee:
- `services/IssueDetectionService.ts`
- `services/issues/issue-result-filters.ts`
- `services/issues/content-filters.ts`
- `services/issues/report-persistence.ts`
- `services/issues/filter-health.ts`
- `config issueExclude`
- `filtered-issues.json`

Rekon equivalent (this slice):
- `FindingFilterReport.policyFingerprint` records the policy
  set used.
- `buildFindingFilterReport` always stamps the fingerprint.
- Publications compare the current `.rekon/config.json`
  fingerprint against the latest filter report fingerprint
  and surface `fresh` / `stale` / `missing` / `unknown`.
- On `stale`, both publications recommend `rekon refresh`;
  agent contract additionally warns louder and adds a
  Do Not Do reminder.
- `rekon refresh` always rebuilds the chain with the current
  policy set — running it clears the stale warning.

What would mean we failed (and isn't the case):
- Operator applies a new `findingFilters` policy but
  architecture summary still presents old active issue state
  without warning → test 15 asserts the architecture summary
  surfaces `stale` after a config change.
- Agent contract says active governance is clean while it was
  built before current filter policy → test 16 asserts the
  agent contract surfaces `stale` + new Do Not Do reminder.
- Freshness warnings are only available by manually
  inspecting low-level artifacts → tests 14-17 assert the
  warning appears in the rendered publication markdown.
- Filter policy apply mutates config without making
  downstream staleness detectable → tests 12-13 assert apply
  surfaces `currentPolicyFingerprint` /
  `projectedPolicyFingerprint` / `policyFingerprint` so
  operators can see the fingerprint that downstream surfaces
  will compare against.
- Raw findings or status ledgers are mutated to "fix"
  staleness → test 18 asserts `FindingReport` is
  byte-identical after apply + publish.

Regression test for original problem (test 17):
- Build `FindingFilterReport` + lifecycle + adjudication +
  `CoherencyDelta` + publications with config policy A.
- Apply config policy B by editing `findingFilters`
  directly.
- Without re-running refresh, `rekon publish architecture`
  surfaces `- Status: \`stale\`` + the "Run `rekon refresh`"
  warning.
- After `rekon refresh`, `rekon publish architecture`
  surfaces `- Status: \`fresh\`` + the matches-message and
  the stale banner is gone.

## CODEBASE-INTEL ALIGNMENT

Classic capability / failure mode: configured issue
exclusions must be applied before canonical active issue /
coherency state is trusted; the system must visibly warn
when the policy used to produce the active state differs
from the operator's current policy.

What Rekon keeps:
- filter policy affects governed issue state
- stale policy state is visible in publications
- filtered findings remain auditable
- config mutation is explicit
- refresh rebuilds active governance from current config
- raw `FindingReport` is never mutated by freshness checks
  or by `apply`

What Rekon simplifies:
- policy fingerprinting only (order-sensitive SHA-256 over
  canonical JSON of the rule array)
- no watcher / daemon
- no live file-change monitoring
- no automatic re-run after config change
- no GraphOntologyValidator
- no persistent exclusion UI
- no semantic filter classifier

What Rekon does not port yet:
- full path / event invalidation engine
- watcher-backed config invalidation
- PR / check warning surfaces
- advanced config policy diffing (Rekon ships the
  fingerprint + two structured outputs only)
- filter policy provenance UI
- automatic refresh on policy change

How this advances migration:
- Makes configured filtering load-bearing and trustworthy.
- Prevents stale active-governance publications after policy
  changes.
- Closes the trust gap opened by explicit config-backed
  filter apply (P1.1 filter-policy-apply-safety v2).

## POLICY FINGERPRINT MODEL

Fingerprint shape (kernel):
```ts
type FindingFilterPolicyFingerprint = {
  digest: string;           // SHA-256 over canonical JSON
  ruleCount: number;        // policies.length
  ruleIds: string[];        // declared-order rule ids
};
```

Canonicalization:
- Each `FindingFilterPolicyRule` is rebuilt as a plain
  object containing only the matchers actually set
  (undefined matchers are dropped).
- The rebuilt rules are placed into an array in declared
  order.
- `digestJson` then sorts keys within each object and walks
  the array in order — preserving order-sensitivity.

Empty-policy invariant:
- `fingerprintFindingFilterPolicies([])` returns a stable
  fingerprint with `ruleCount: 0` and `ruleIds: []`. This
  matters: it lets the staleness check distinguish "ran with
  zero policies (and the operator hasn't added any since)"
  from "we don't know what was used (older report)".

Validator:
- `validateFindingFilterReport` accepts the optional
  `policyFingerprint` field and validates that `digest` is a
  non-empty string, `ruleCount` is a non-negative integer,
  `ruleIds` is an array of strings, and
  `ruleIds.length === ruleCount`.
- No `schemaVersion` bump — older reports without the field
  are still valid and surface as `unknown` downstream.

## PUBLICATION GUARDRAILS

Architecture summary (`## Finding Filter Policy Freshness`):
- Position: between `## Finding Filter Health` and
  `## Finding Filter Policy Suggestions`.
- Body:
  - `- Status: \`<status>\``
  - `- Current config policy fingerprint: \`<short-digest>\` (<n> rule(s))`
  - `- FindingFilterReport policy fingerprint: ...`
  - Status-specific message:
    - `fresh` — "Finding filter policy fingerprint matches
      the latest FindingFilterReport."
    - `stale` — blockquote: "`.rekon/config.json`
      `findingFilters` changed after the latest
      FindingFilterReport was produced. Active governance
      may be stale. Run `rekon refresh` to rebuild the
      filter chain with the current policy set."
    - `missing` — "No FindingFilterReport found. Run `rekon
      refresh` (or `rekon findings filter`) before relying
      on active governance counts."
    - `unknown` — "Latest FindingFilterReport predates
      filter-policy-freshness v2 and does not record a
      policy fingerprint. Run `rekon refresh` to regenerate
      the filter chain with a fingerprinted
      FindingFilterReport."

Agent contract (`### Finding Filter Policy Freshness`):
- Position: between `### Finding Filter Health` and
  `### Finding Filter Policy Suggestions`.
- Body: same as architecture summary but the `stale` /
  `missing` / `unknown` text is wrapped in a blockquote
  and worded for the agent ("Do not rely on active
  governance until `rekon refresh` rebuilds findings…").
- New `Do Not Do`: "Do not rely on active issue / coherency
  counts after `.rekon/config.json` `findingFilters`
  changed until `rekon refresh` has rebuilt the filter
  chain with the current policy set."

Apply CLI output (additive):
- Dry-run: `currentPolicyFingerprint` +
  `projectedPolicyFingerprint`.
- Apply: `currentPolicyFingerprint` + `policyFingerprint`
  (post-write).

## REFRESH BEHAVIOR

- `rekon refresh` already runs `findings.filter` before
  lifecycle / adjudication / coherency.
- `findings.filter` calls
  `buildFindingFilterReport(store, { policies })` where
  `policies` is loaded from `.rekon/config.json` by the
  existing runtime helper.
- `buildFindingFilterReport` always stamps the resulting
  `FindingFilterReport.policyFingerprint`, so a fresh
  `rekon refresh` always produces a report whose fingerprint
  matches the current config.
- Publications re-rendered immediately after `rekon refresh`
  therefore always report `- Status: \`fresh\``.
- The slice deliberately does NOT add watcher / daemon
  behavior or auto-refresh inside publishers. Refresh
  remains explicit.

## TESTS / VERIFICATION

Tests:
- New `tests/contract/filter-policy-freshness-guardrails.test.mjs`
  (19 tests, all passing).
- Full suite: **588 passed / 1 skipped / 0 failed**.

Required verification commands (all run, all green):
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `git diff --check`
- `node scripts/audit-package-exports.mjs`
- `node scripts/publish-dry-run.mjs`
- `node scripts/audit-license.mjs`
- `node scripts/install-smoke.mjs`
- `node scripts/install-tarball-smoke.mjs`
- `node packages/cli/dist/index.js refresh --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish architecture --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js publish agent-contract --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts validate --root examples/simple-js-ts --json`
- `node packages/cli/dist/index.js artifacts freshness --root examples/simple-js-ts --json`

## INTENTIONALLY UNTOUCHED

- `FindingFilterReport.schemaVersion` — additive optional
  field, no version bump.
- `FindingReport` shape and contents — never mutated by
  freshness checks or by apply.
- `FindingFilterHealthReport`, `FindingFilterPolicySuggestionReport`,
  `FindingLifecycleReport`, `IssueAdjudicationReport`,
  `CoherencyDelta` — no shape changes; no new fields.
- Suggestion derivation rules (`deriveFindingFilterPolicySuggestions`)
  — unchanged.
- Filter apply behavior — unchanged except for the additive
  fingerprint fields on JSON output. No new flags. No new
  blockers. `--force` semantics unchanged.
- `RefreshStepId` / refresh pipeline — unchanged. The
  refresh runs `findings.filter` as before; the only
  change is that `buildFindingFilterReport` now also stamps
  the fingerprint.
- `proofReportPublisher` — out of scope; the proof
  publisher does not render filter-policy data.
- `validateArtifactFreshness` — unchanged. Filter policy
  freshness is surfaced by publications, not by the
  generic freshness validator (the validator does not have
  repo-root / config access).
- All capability manifests for other packages, permissions,
  dist contents, `schemaVersion` strings.
- `GraphOntologyValidator` port — explicitly deferred.
- Persistent exclusion lists beyond config-backed
  `findingFilters` — deferred.
- Watcher / daemon / file-system event loop — explicitly
  not implemented.
- No version bump. No npm publish. No branch.

## RISKS / FOLLOW-UP

- Risk: the publishers now read `.rekon/config.json`
  directly, adding a thin fs dependency to
  `@rekon/capability-docs`. Mitigation: scoped to a single
  helper (`loadCurrentFindingFilterPolicies`); falls back
  cleanly when the file is missing / unreadable; the
  publishers themselves degrade gracefully when
  `input.repo.root` is absent (helps synthetic tests).
- Risk: the loader fingerprints the *valid* subset of
  `findingFilters` (via `validateFindingFilterPolicyRules`),
  which matches what `applyFindingFilters` would actually
  run. If an operator writes an invalid policy rule, the
  fingerprint excludes it — so the freshness check still
  reports `fresh` against the equivalent invalid-rule
  report. Mitigation: `rekon config validate` already
  flags invalid rules; the operator path is to fix the
  config (which then changes the fingerprint) before
  trusting freshness.
- Risk: malformed `.rekon/config.json` (file exists but is
  not valid JSON / not a JSON object) makes
  `loadCurrentFindingFilterPolicies` return `undefined`.
  In that case `computeFilterPolicyStaleness` proceeds
  without a current fingerprint and the status falls
  through to `fresh` (digests cannot be compared). That is
  acceptable behavior for the publication surface — the
  CLI `apply` path already surfaces a hard parse error.
  Mitigation: the operator path to a malformed config is
  to fix the config first.
- Risk: `currentPolicyFingerprint` digest captures only
  validated `findingFilters` rules. If the user has
  extension config fields that affect filtering, those
  would not be in the fingerprint. v2 has no such fields;
  if added later, the fingerprint helper would need to
  expand. Mitigation: documented in finding-filters
  concept.
- Risk: the existing `finding-filter.changed` invalidation
  rule already covers the new section because policy
  fingerprint drift is part of `FindingFilterReport`
  changes (when `rekon refresh` reruns, the new fingerprint
  invalidates publications). No new invalidation rule is
  needed; the rule's description was expanded to document
  the freshness surface. Mitigation: explicit doc update.
- Risk: the apply path now emits new fingerprint fields in
  JSON output. Existing scripts that parse the JSON should
  ignore unknown fields. Mitigation: only additive fields;
  `applied`, `dryRun`, `configPath`, etc. are unchanged.
- Follow-up: classic issue filtering parity v2 — content /
  result filter expansion. Add more deterministic content
  filters and issue-result filters from classic. Still no
  GraphOntologyValidator or LLM.
- Follow-up: PR / GitHub / dashboard surfaces for filter
  policy staleness. Deferred to the surfaces phase.

## NEXT STEP

Per the ADR Implementation Order step 9 and the work
order's closing section, the recommended next slice is:

> Classic issue filtering parity v2: content / result filter
> expansion

Purpose:
- Add more of classic's deterministic content filters and
  issue-result filters.
- Still no GraphOntologyValidator or LLM.

This is the clean follow-up after the ADR + filter audit
layer + filter-aware lifecycle + filter policy v1 +
filter-health publications + filter policy suggestion
derivation + filter policy suggestion publications + apply
safety v2 + this freshness guardrails slice that have now
landed.
