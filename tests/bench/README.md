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

## Run

```bash
REKON_PARITY_CORPUS=/path/to/corpus node tests/bench/classic-parity-bench.mjs
# or
node tests/bench/classic-parity-bench.mjs --corpus /path/to/corpus \
  [--rule-map tests/bench/rule-map.json] [--output tests/bench/output] \
  [--overruled /path/to/private-overruled.json] \
  [--adjudications /path/to/private-quality-adjudications.json] \
  [--quality-thresholds tests/bench/quality-thresholds.json] \
  [--repo <id>] [--skip-refresh]
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
separately from the usefulness of risks and opportunities:

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

Pass the file with `--adjudications` or `REKON_PARITY_ADJUDICATIONS`. It remains
outside the repository. Missing labels are reported as `insufficient-evidence`;
the bench does not invent precision or usefulness scores. Per-rule thresholds
live in `tests/bench/quality-thresholds.json` and cover evidence completeness,
duplicate remediation, identity stability, finding precision, and assessment
usefulness. Severity calibration and law attribution are reported separately.

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
      "classicOutput": "./classic/repo-slug",
      "classicFormat": "classic-v1"
    }
  ]
}
```

`root` points at a **copy** of the target repo (the bench writes standard
`.rekon/` output there during `rekon refresh`; it mutates nothing else).
`classicOutput` is a directory containing classic's `issues.json` for that
repo's baseline scan (classic writes it to
`<repo>/reports/issues.json`; copy it into the corpus).
`classic-v1` is the only supported format in bench v1.

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
