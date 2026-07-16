# classic-parity-bench (Phase 0)

A local harness that runs the Rekon lifecycle against repositories with
legacy-source scan history, normalizes both systems' findings into a
common shape, and emits a bench report (JSON + Markdown) classifying every
classic finding as `matched`, `missed-gap`, `missed-intentional` (with a
citation), or flagging Rekon findings classic never produced as `new`.

The report keeps two headline metrics separate:

- **weighted finding recall**: the share of historically surfaced findings
  that Rekon reproduces as findings or intentionally suppresses with a citable
  policy;
- **weighted observable signal coverage**: finding recall plus matching risks
  or opportunities emitted by coverage-scored redesigns.

An assessment can improve signal coverage but never finding recall. Both
metrics weight rows by historical fire count. The bench is the instrument; a
high count is not a substitute for precision or usefulness adjudication.

## Agent review of redesign gaps

The parity report identifies unmatched historical cases, but a miss does not
prove that Rekon needs another emitter. Build a deterministic, stratified local
review packet before changing detector behavior:

```bash
npm run bench:gap-review -- --per-rule 3
```

The command reads the detailed local parity report and its external corpus,
then writes `tests/bench/output/redesign-gap-review.json`. Each record contains
the historical claim, bounded source excerpts, the mapped redesign, and any
current Rekon output on the same files. The output is gitignored because it can
contain private source and repository identifiers.

An independent model or coding agent should inspect the cited source and label
each record in a separate local file. Supported verdicts distinguish a valid
missed signal, a valid signal that belongs in another output class, output
covered under another identity, historical noise, and insufficient evidence.
Recommended actions separately identify emitter, evidence, matching, and
classification gaps. This prevents a historical finding count from becoming a
detector backlog by default.

Summarize labels by passing the local judgment file:

```bash
npm run bench:gap-review -- --per-rule 3 \
  --judgments tests/bench/output/redesign-gap-judgments.json
```

Agent judgments guide calibration and implementation. They do not overrule a
historical case, remove it from the parity denominator, rewrite repository
truth, or promote an assessment automatically.

## Run

```bash
REKON_PARITY_CORPUS=/path/to/corpus node tests/bench/classic-parity-bench.mjs
# or
node tests/bench/classic-parity-bench.mjs --corpus /path/to/corpus \
  [--rule-map tests/bench/rule-map.json] [--output tests/bench/output] \
  [--overruled /path/to/private-overruled.json] \
  [--equivalences /path/to/private-equivalences.json] \
  [--adjudications /path/to/private-quality-adjudications.json] \
  [--quality-thresholds tests/bench/quality-thresholds.json] \
  [--repo <id>] [--capture-evidence] [--skip-refresh]
```

Without `REKON_PARITY_CORPUS` (or `--corpus`) the bench skips cleanly with
exit 0 — the same gating pattern as the live dogfood harnesses. Reports land
in `tests/bench/output/` (gitignored). `report.json` and `report.md` are local
operator reports and can contain private identifiers. `report.sanitized.json`
contains aggregate counts, rule ids, and repository counts only; it excludes
corpus roots, repository ids, finding ids, and file paths.

## Quality adjudication

Finding recall and signal coverage do not describe detection quality. An
optional external adjudication file lets the bench report finding precision
separately from the usefulness of risks and opportunities. The judge can be an
independent model or agent that checks each record against source and artifact
evidence; the benchmark does not require human approval:

Build a deterministic local packet of current Rekon emissions before judging:

```bash
npm run bench:quality-review -- --per-rule 5
```

The command samples findings and assessments independently for each active
rule, round-robins across corpus repositories, and includes bounded source
excerpts plus relevant cited-artifact rows. It writes the private packet to
`tests/bench/output/emission-quality-review.json`. The reviewing agent records
its verdicts in the adjudication shape below; no human approval step is implied.
Excerpts center on the emitted location when available, including in source
files up to 2 MB, so the judgment remains grounded in the cited implementation.

```json
{
  "schemaVersion": "1.0.0",
  "records": [
    {
      "repoId": "private-repo-id",
      "recordType": "finding",
      "recordId": "finding-id",
      "ruleId": "typescript.compilerDiagnostic",
      "judgment": "valid",
      "severity": "accurate",
      "identityStable": true
    },
    {
      "repoId": "private-repo-id",
      "recordType": "assessment",
      "recordId": "assessment-id",
      "ruleId": "typescript.functionComplexity",
      "judgment": "useful",
      "severity": "accurate",
      "identityStable": true
    }
  ]
}
```

Pass a different file with `--adjudications` or `REKON_PARITY_ADJUDICATIONS`.
Public-corpus runs default to the checked-in source-grounded judgments under
`tests/bench/calibration/`. Private adjudications remain local; only their
identifier-free per-rule aggregate is retained. When a finding judged invalid
or an assessment judged not useful disappears, the bench retains that verdict
as resolved calibration history. A missing record previously judged valid or
useful fails loudly as a possible regression. Missing labels are reported as
`insufficient-evidence`; the bench does not invent precision or usefulness
scores. Per-rule thresholds live in `tests/bench/quality-thresholds.json` and
cover evidence completeness, duplicate remediation, identity stability,
finding precision, and assessment usefulness. Severity calibration and law
attribution are reported separately.

## Corpus manifest

The corpus lives **outside this repository** — classic scan outputs and target
repos contain private project data and must never be committed here. The
corpus root carries a hand-authored `corpus.json`:

```json
{
  "repos": [
    {
      "id": "repo-slug",
      "root": "./repos/repo-slug",
      "benchmarkMode": "parity",
      "classicOutput": "./classic/repo-slug",
      "classicFormat": "classic-v1",
      "evidenceCapture": {
        "commands": ["npm run lint", "npm run test"],
        "allowedWrites": ["reports/junit.xml"],
        "repetitions": 2
      },
      "evidenceInputs": [
        { "kind": "junit", "path": "reports/junit.xml", "verificationRun": "$capture" },
        { "kind": "eslint-json", "path": "reports/eslint.json" },
        { "kind": "sarif", "path": "reports/codeql.sarif" },
        { "kind": "npm-audit", "path": "reports/npm-audit.json", "packageLock": "package-lock.json" }
      ]
    }
  ]
}
```

Public repositories without historical baseline output use
`"benchmarkMode": "quality-only"`. They participate in current finding and
assessment adjudication, but never enter historical recall, signal coverage, or
the "new finding" count. Quality-only entries omit `classicOutput` and
`classicFormat` and must pin their provenance:

```json
{
  "id": "public-repo",
  "root": "./repos/public-repo",
  "benchmarkMode": "quality-only",
  "source": {
    "url": "https://github.com/example/public-repo",
    "commit": "0123456789abcdef0123456789abcdef01234567"
  }
}
```

Rekon keeps a pinned nine-repository quality catalog in
`tests/bench/public-corpus.sources.json`. It covers a TypeScript build-tool
monorepo, a decorator-based server framework, a JavaScript plugin framework,
an AST rule engine, a TypeScript library monorepo, a test runner, and a browser
automation engine. pnpm adds package-manager and migration-tooling behavior;
Next.js adds a large framework monorepo that exercises source-quality
jurisdiction and bounded graph projection. The default command uses an OS
temporary directory and removes every checkout and `.rekon/` artifact after
the report is written:

```bash
npm run bench:public-corpus
npm run bench:public-corpus -- --repo public-vite
```

Use `bench:public-corpus:setup` only when a persistent checkout is explicitly
needed. It accepts repeatable `--repo <id>` selectors. Refresh runs Rekon itself;
it does not execute target repository scripts unless evidence capture is
separately declared and explicitly enabled.

## Public defect pairs

The defect-pair corpus checks whether a signal exists on a pinned buggy commit
and disappears on its upstream fix. It is separate from parity scoring and
does not use finding volume as a target.

```bash
npm run bench:defect-pairs
npm run bench:defect-pairs -- --pair vitest-typecheck-worker-off
```

Focused mode scans only each pair's affected production and regression-test
paths. Pass `--full` for a complete repository scan. `--pair <id>` is
repeatable. The default command deletes its temporary checkouts even when the
benchmark fails. Persistent setup and rescoring remain available through
`bench:defect-pairs:setup` and `bench:defect-pairs:existing`.

The pinned catalog is `tests/bench/public-defect-pairs.sources.json`. Setup
creates detached before/after worktrees, verifies commit ancestry, and does not
install dependencies or execute target scripts. Reports are local and
gitignored under `tests/bench/output/public-defect-pairs/`; the public agent
judgments needed to interpret them live under `tests/bench/calibration/`.

### Semantic problem emitters

The dependency-resolution, cache-integrity, cleanup-completeness,
error-propagation, option-propagation, scope-resolution, and resource-lifetime
emitters have a bounded live paired check. Resource-lifetime coverage includes
both retained connection state and request closures attached to reusable socket
listeners. Cache-integrity coverage includes both compiled-output integrity and
a parameter-sensitive cross-call cache contract. Cleanup-completeness coverage
includes semantic shutdown-hook analysis and structured lifecycle wait
contracts. Dependency-resolution coverage includes both conditional candidate
overwrite and iterated candidate bypass through a generic token lookup.
Option-propagation coverage includes callback-backed spread overrides and
logical-OR defaulting that coerces explicit false values.
Scope-resolution coverage includes missing lexical boundaries and name-only
binding ownership that cannot distinguish shadowed reference occurrences.

```bash
npm run eval:semantic-problem-emitters
npm run eval:semantic-problem-emitters -- --pair nest-import-first-match
```

The runner fetches affected files directly from pinned public revisions and
retains no source, prompts, excerpts, or model prose. Model-backed runs send
fix-related candidates through the production assessment judge. The checked-in
baseline may instead record direct source review while emitters are being
calibrated. Both modes require every affected buggy path to be retained and
fixed defects to be cleared. Defect
identity normally uses changed-line evidence density so one contextual citation
cannot turn an unrelated same-class candidate into the repaired defect. The
Redux error-propagation pair uses deterministic compound-guard and downstream
identity-mapping evidence. The Playwright error-propagation pair uses
structured evidence for a supplied cause hidden behind a default message and
is currently adjudicated by direct review of pinned source and upstream tests.
The VS Code error-propagation pair uses a structured Promise/event bridge
anchor because the fix adds the missing error edge and therefore leaves no
changed line in the buggy revision.
The Nest candidate-bypass pair uses the same direct-review boundary and
structured `dependency_flow` evidence.
The webpack falsy-option pair uses direct review and structured `option_flow`
evidence bounded to visible boolean `true` defaults.
The Vite RSC shadowing pair uses direct review and structured `scope_model`
evidence for name-only owner lookup.
The scope-resolution pair
uses a structured classifier anchor so ordinary switch statements do not enter
its jurisdiction. The Yarn cache pair uses deterministic `cache_flow` evidence
that a result-shaping parameter is absent from the memoization key. The Vite
cleanup pair uses deterministic `cleanup_flow` evidence so only explicit
lifecycle wait contracts enter the structured path. The durable aggregate is
`tests/bench/calibration/semantic-problem-emitter-baseline.json`.
That aggregate also records positive-pair counts against the five-adjudication
minimum. Every semantic class currently has two independent positive pairs, so
all remain `insufficient-evidence`. Token and cost totals apply only to the ten
pairs previously run through the model API.

## Corpus retention

Repository checkouts, generated `.rekon/` directories, detailed reports, and
source excerpts are reproducible evidence caches, not durable project state.
Delete them after calibration. Rekon retains only:

- pinned public source URLs and commits;
- source-grounded public adjudications;
- identifier-free aggregate quality history;
- detector fixtures, thresholds, and implementation tests;
- documented decisions about which signals should or should not become rules.

`npm run bench:retain-calibration` validates and extracts those records before
a manual cache cleanup. It rejects non-public repository IDs and local absolute
paths in checked-in public judgments. The ephemeral commands are preferred so
cleanup is automatic.

```bash
npm run bench:retain-calibration -- \
  --quality /path/to/public-quality-adjudications.json \
  --defects /path/to/public-defect-pair-adjudications.json \
  --aggregate /path/to/broader-local-adjudications.json
```

Statuses describe emitted differences: `finding-captured`,
`assessment-captured`, `signal-persistent`, `introduced-after`, or `uncaptured`.
They are not judgments. An agent adjudication separately records whether the
upstream claim is valid, whether the signal captures that claim, and whether
the next step is a new emitter, more emitter calibration, another evidence
source, semantic analysis, or no general detector.

`root` points at a **copy** of the target repo (the bench writes standard
`.rekon/` output there during `rekon refresh`; it mutates nothing else).
`classicOutput` is a directory containing classic's `issues.json` for that
repo's baseline scan (classic writes it to
`<repo>/reports/issues.json`; copy it into the corpus).
`classic-v1` is the only supported format in bench v1.

`evidenceInputs` is optional. It connects repository-native reports to the
existing Rekon ingestion commands after `refresh`, then reruns `evaluate` so
the resulting `FindingReport` and `AssessmentReport` cite the current
`EvidenceGraph`. Supported kinds are `junit`, `eslint-json`, `sarif`,
`npm-audit`, `pnpm-audit`, `yarn-audit`, `osv`, `istanbul-coverage`, and
`lcov-coverage`. Paths must be repository-relative.

Normal bench runs never execute repository tools. `--capture-evidence` opts
into the manifest's `evidenceCapture` commands through Rekon's no-shell
verification runner. The bench hashes protected repository files after every
execution and rejects undeclared writes. `repetitions` is bounded from one to
three; the last `VerificationRun` is available to an evidence input as
`$capture`. `--capture-evidence` cannot be combined with `--skip-refresh`.

Coverage entries also require `testPath` and an explicit
`verificationRun` value such as `VerificationRun:verification-run-1`:

```json
{
  "kind": "lcov-coverage",
  "path": "coverage/lcov.info",
  "testPath": "tests/unit/example.test.ts",
  "verificationRun": "VerificationRun:verification-run-1"
}
```

That requirement prevents aggregate coverage from being treated as isolated,
test-attributed runtime proof. When `--skip-refresh` is set, evidence ingestion
is skipped as well and the bench only scores artifacts already in `.rekon/`.

## Rule map

`tests/bench/rule-map.json` is the explicit classic-ruleId → disposition table.
Disposition semantics are authorized by
`docs/strategy/detection-quality.md`:

```json
{ "classic.rule.id": { "status": "ported", "rekonRuleId": "..." } }
{ "classic.rule.id": { "status": "unported" } }
{ "classic.rule.id": { "status": "redesigned", "citation": "docs/strategy/...", "rekonRuleId": "optional, once landed" } }
{ "classic.rule.id": { "status": "deferred", "citation": "docs/strategy/..." } }
{ "classic.rule.id": { "status": "rejected", "citation": "docs/strategy/..." } }
```

- `ported` — live emitter; per-finding matching on (rekonRuleId, file).
- `unported` — undecided gap; in the denominator; the gap-queue table.
- `redesigned` — decision pinned (port or redesign), detector not yet
  landed/matched. In the denominator, **uncredited** (`missed-redesigned`),
  citation required; matching activates when the row gains a `rekonRuleId`.
- `deferred` — real goal, missing substrate, named re-entry condition.
  In the denominator, uncredited, **excluded from the gap queue**.
- `rejected` — goal not Rekon's to serve. **Excluded from the denominator**
  with its citation; this is the only way the denominator shrinks.

Every classic rule observed in the corpus must have a row; the bench fails
loudly on unmapped rules rather than silently scoring them.

An external equivalence file can resolve a per-finding `matching-gap` without
broadening a whole rule's match surface. Each entry names one classic finding,
one exact current finding or assessment id, and a `judgmentRef` to a local gap
judgment whose verdict is `covered-different-identity` and action is
`matching-gap`. The bench rejects missing or stale targets. Pass the file with
`--equivalences` or `REKON_PARITY_EQUIVALENCES`; do not commit private corpus
ids or paths.

## Anti-gaming rules

The recall number may not be improved by:

1. reclassifying gaps as intentional without a citable
   `FindingFilterReport` suppression or a named decision-doc citation;
2. editing `rule-map.json` dispositions without a linked decision;
3. adding filter policies whose only effect is bench score movement;
4. adding private overrule entries on agent judgment. **Only operator rulings
   overrule.** Pass them with `--overruled` or `REKON_PARITY_OVERRULED`; never
   commit repository-specific finding IDs or paths. Every entry must cite a resolvable `rulingRef`
   into a committed law artifact (overlay entry id or ruling memo
   section), is per-finding (never per-rule), and honest losses -
   semantically wrong matches, umbrella file-overlap noise - never
   qualify.
5. adding per-finding equivalences without an agent judgment that cites source
   and explicitly concludes `covered-different-identity` / `matching-gap`.

The report renders every intentional classification with its citation so the
operator can audit the scoreboard, not just read it.

## Boundaries

- Bench report, not a canonical artifact (no kernel schema, no freshness rule,
  no capability registration). Local-only; no CI integration in v1.
- Deterministic key matching only — no semantic / fuzzy / embedding matching,
  consistent with the issue-governance ADR posture.
- Classic outputs are data, never imports (AGENTS.md rule 4 / ADR 0004).
- The bench reads Rekon artifacts; it never writes `FindingStatusLedger`,
  filter policies, or config in corpus repos.
- v1 measures; it does not gate (no recall target assertion in tests).
