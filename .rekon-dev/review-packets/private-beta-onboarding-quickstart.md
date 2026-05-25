# Review Packet — Private Beta Onboarding Quickstart

**Slice:** `private-beta-onboarding-quickstart`
**Sequence position:** Immediately after the
private beta support playbook + bug-report
template. Distills the operator-facing support
posture into a concise "start here" path so
new beta operators can install, build, and run
their first scan without reading the full
playbook end-to-end.
**Batch type:** Strategy / docs / tests only.
**Strict no-go list:** no npm publish, no
version bump, no git tag, no GitHub Release,
no runtime behaviour change, no new CLI
command, no new helper, no schema change, no
new artifact type, no new permission, no new
role, no workflow YAML, no validator profile
change, no GitHub API call, no
`package.json` / `package-lock.json` mutation,
no source-file mutation in any
`packages/*/src/*`, no mutation of any
operator repo, no network I/O, no new branch.

## CHANGES MADE

1. **New
   `docs/beta/private-beta-onboarding-quickstart.md`**
   — operator-facing onboarding quickstart
   with the 15 required content headings
   (Who This Is For, What Private Beta Means,
   Install From Source Checkout, Build Rekon,
   Pick A Target Repository, Run Your First
   Scan, Inspect The Main Outputs, Run Path
   Freshness, Optional Verification Flow,
   Optional GitHub Review Dry-Runs, Understand
   First-Class Outcomes, Report A Blocker,
   Privacy And Redaction, What This Does Not
   Do, Next Steps), plus a *Diagnostic Tables*
   section carrying the three required tables
   (First-Run Command / Output / Blocker), plus
   a closing *Status* section. Includes the
   full install snippet (`git clone` +
   `npm ci` + `npm run build`), the temp-copy
   pattern via `git clone --local
   --no-hardlinks` with an `rsync` fallback,
   the first-scan matrix using
   `CLI="$(pwd)/packages/cli/dist/index.js"`,
   the findings / governance chain, the
   publication outputs, the path-freshness
   first-run guidance, the optional
   verification chain with trailing `|| true`,
   and the dry-run GitHub review surfaces.
2. **New review packet (this file)** with
   PURPOSE PRESERVATION CHECK + all 11
   required sections.
3. **New docs test
   `tests/docs/private-beta-onboarding-quickstart.test.mjs`**
   with all 24 required assertions.
4. **Supporting doc cross-links** updated:
   `docs/beta/private-beta-support-playbook.md`,
   `docs/beta/private-beta-bug-report-template.md`,
   `docs/strategy/no-npm-beta-distribution-policy.md`,
   `docs/strategy/additional-real-repo-dogfood-cohort-plan.md`,
   `docs/strategy/post-beta-dogfood-evidence-triage.md`,
   `docs/strategy/path-freshness-safety-review.md`,
   `docs/strategy/roadmap.md`,
   `docs/strategy/classic-behavior-roadmap.md`,
   `README.md`, `CHANGELOG.md`.

## PUBLIC API CHANGES

**None.** This batch is strategy / docs / tests
only. No type added, removed, renamed,
narrowed, or exported. No CLI surface added or
modified. No runtime behaviour change. No
schema change. No new artifact type. No new
permission. No new role. No workflow YAML
installed. No `package.json` mutation in any
workspace.

## PURPOSE PRESERVATION CHECK

Original problem (per the work order):

> The private beta support playbook is the
> canonical operator reference, but it is
> long. New operators need a shorter "start
> here" path that walks them through install,
> build, first scan, and basic outputs
> without losing any of the safety pins
> (no-NPM, source checkout, temp-copy
> isolation, canonical artifacts vs. GitHub
> downstream surfaces, path freshness vs.
> lineage freshness, first-class outcomes
> that are not blockers). The quickstart must
> defer to the playbook when they conflict.

Product guarantees preserved (each pinned
verbatim in the quickstart + verified by a
docs-test assertion):

- **No npm install during beta.** The
  quickstart pins "Private beta users should
  not install Rekon from npm." and explicitly
  lists `npm install @rekon/cli`, `npm
  install -g @rekon/cli`, and `npx
  @rekon/cli` as unsupported. The
  docs test asserts the unsupported-command
  list appears.
- **Source-checkout install only.** The
  quickstart pins "Private beta is
  source-checkout based." and shows the
  `git clone` + `npm ci` + `npm run build`
  triplet. The docs test asserts each
  command appears.
- **Run the CLI via the built entry.** The
  quickstart pins
  `node packages/cli/dist/index.js` as the
  CLI invocation, and the rest of the
  quickstart uses
  `CLI="$(pwd)/packages/cli/dist/index.js"`
  so commands stay copy-pasteable. The docs
  test asserts both forms appear.
- **Temp-copy isolation for first scans.**
  The quickstart pins "Run first scans
  against a temp copy so Rekon artifacts and
  any target-side build / test artifacts do
  not pollute the committed repo." and shows
  the `mktemp -d` + `git clone --local
  --no-hardlinks` pattern with an `rsync`
  fallback. The docs test asserts the
  pattern + both fallback paths.
- **Rekon artifacts are canonical; GitHub
  surfaces are downstream.** The quickstart
  pins both "Rekon artifacts are canonical;
  GitHub Checks and PR comments are
  downstream review surfaces." and "GitHub
  status and comments are not canonical
  truth; Rekon artifacts remain canonical."
  The docs test asserts each pin appears
  verbatim (whitespace-tolerant).
- **Dry-run GitHub publishers make no
  network calls.** The quickstart pins
  "Dry-run commands make no network calls."
  alongside the
  `publish github-check --dry-run` and
  `publish pr-comment --dry-run` commands.
  The docs test asserts the pin and both
  commands appear.
- **Path freshness ≠ lineage freshness.**
  The quickstart pins "Artifact lineage
  freshness is not working-tree freshness."
  in the *Run Path Freshness* section. The
  docs test asserts the pin appears.
- **Playbook wins on conflict.** The
  quickstart opens with a blockquote pinning
  that the support playbook is the canonical
  reference and the quickstart defers when
  they conflict. The docs test asserts the
  cross-link to the playbook and that the
  word "playbook" appears in the deference
  pin.

## CODEBASE-INTEL ALIGNMENT

The quickstart aligns with the existing
codebase contract surface:

- **CLI shape.** Every command used in the
  quickstart already exists in
  `packages/cli/dist/index.js` (built from
  `packages/cli/src/index.ts`). No new flag,
  no new subcommand, no new exit code. The
  command set is exactly the subset already
  exercised in the support playbook + the
  cohort dogfood reports.
- **Artifact contract.** The output table
  names artifacts that already exist in the
  artifact registry (`ObservedRepo`,
  `EvidenceGraph`, `IntelligenceSnapshot`,
  `FindingReport`, `FindingFilterReport`,
  `PathFreshnessReport`, the publication
  artifacts under `@rekon/capability-docs`).
- **Publisher contract.** The dry-run
  publisher commands match the existing
  `rekon publish github-check --dry-run` and
  `rekon publish pr-comment --dry-run` CLIs,
  including the readiness-block behaviour
  when no `GITHUB_TOKEN` is set.
- **Verification contract.** The optional
  verification chain matches the existing
  `rekon intent work-order` →
  `rekon artifacts latest --type
  VerificationPlan --id-only` →
  `rekon verify run --dry-run` →
  `rekon verify run --execute` →
  `rekon verify result from-run` chain. The
  trailing `|| true` is documented in the
  support playbook and reflects the
  missing-script-tolerance posture.
- **Path-freshness contract.** The
  first-run-then-second guidance matches the
  `PathFreshnessReport` semantics pinned in
  the Path Freshness Safety Review (first
  run → `unknown` because no baseline,
  second run unchanged → `fresh`, after
  source edits → `stale`).

No assumption about behaviour that does not
already ship.

## ONBOARDING MODEL

The quickstart's onboarding model is a strict
sequence:

1. **Identify yourself as a private-beta
   operator** (Who This Is For).
2. **Internalise the no-NPM posture** (What
   Private Beta Means).
3. **Clone + install + build Rekon from
   source** (Install From Source Checkout +
   Build Rekon).
4. **Pick a target repository and clone it
   into a `mktemp -d` directory** (Pick A
   Target Repository). Use `git clone
   --local --no-hardlinks` by default;
   `rsync` if the source is not a git repo.
5. **Run the first-scan matrix** (Run Your
   First Scan): `init` →
   `refresh` → `paths freshness` →
   `artifacts validate`.
6. **Walk the findings + governance chain**
   (same section): `findings list` →
   `findings filter-health` →
   `issues adjudicate` → `issues list` →
   `coherency delta`.
7. **Inspect the publication outputs**
   (Inspect The Main Outputs): `publish
   architecture` + `publish agent-contract`
   + `publish proof`.
8. **Run path freshness twice** (Run Path
   Freshness) to observe `unknown` → `fresh`
   transition.
9. **Optionally walk the verification chain**
   (Optional Verification Flow) and the
   dry-run GitHub publishers (Optional
   GitHub Review Dry-Runs).
10. **Recognise first-class outcomes vs.
    blockers** (Understand First-Class
    Outcomes + Report A Blocker).
11. **Redact before sharing artifacts**
    (Privacy And Redaction).
12. **Know what is out of scope** (What This
    Does Not Do).
13. **Plan the next step** (Next Steps) —
    explicitly recommends the private beta
    onboarding validation run on a
    non-Rekon repo.

The quickstart never claims behaviour that the
playbook does not already cover; instead it
defers to the playbook for the canonical
reference.

## COMMAND MATRIX

The First-Run Command table in the quickstart:

| Step | Command |
| --- | --- |
| build Rekon | `npm ci && npm run build` |
| init | `node "$CLI" init --root "$TARGET_ROOT" --json` |
| refresh | `node "$CLI" refresh --root "$TARGET_ROOT" --json` |
| validate | `node "$CLI" artifacts validate --root "$TARGET_ROOT" --json` |
| path freshness | `node "$CLI" paths freshness --root "$TARGET_ROOT" --json` |

Every entry uses the
`node "$CLI" <subcommand> --root "$TARGET_ROOT"
--json` form, which is identical to the form
already used in the support playbook + the
dogfood execution reports. The Diagnostic
Tables → First-Run Command table mirrors this
exactly so an operator can scan one table
without re-reading the body.

The Output table names canonical artifacts:

| Output | Purpose |
| --- | --- |
| Architecture summary | repo/system view |
| Agent contract | operating instructions for agents |
| Proof report | verification/proof context |
| PathFreshnessReport | working-tree freshness |
| FindingReport / FindingFilterReport | findings and filtering |

The Blocker table connects blocker class →
artifact attachment guidance and tracks the
support playbook's blocker taxonomy 1-to-1
for the blocker rows the quickstart
surfaces:

| Blocker | What To Attach |
| --- | --- |
| `artifacts validate` invalid | index + failing artifact |
| CLI crash | command + stderr + artifacts |
| token / log leak | redacted artifact + exact command (rotate the secret first) |
| publication render failure | publication artifact + input refs |

## SUPPORT MODEL

The quickstart's support model is a thin
veneer over the playbook:

- The opening blockquote pins the playbook
  as canonical: "If anything in this
  quickstart conflicts with the playbook, the
  **playbook wins**."
- The *Report A Blocker* section delegates
  to the bug-report template + the playbook's
  full triage flow.
- The *Privacy And Redaction* section
  delegates to the playbook's redaction
  policy.
- The *Next Steps* section explicitly lists
  the playbook + bug-report template +
  path-freshness safety review + no-NPM beta
  policy + verification missing-script
  tolerance memo + GitHub Actions
  verification runner operator guide as the
  follow-up reading paths.

No new support process. No new blocker
taxonomy. No new redaction policy.

## TESTS / VERIFICATION

- `tests/docs/private-beta-onboarding-quickstart.test.mjs`
  — 24 assertions covering: quickstart
  existence, all required headings, the seven
  verbatim pins, the install / build / temp-copy
  / first-scan / publication / path-freshness
  / verification / dry-run-publisher snippets,
  the three diagnostic tables, the unsupported
  command list, the playbook-deference pin,
  the path freshness vs. lineage freshness
  pin, the cross-links (support playbook,
  bug-report template, path-freshness safety
  review, no-NPM beta policy, verification
  missing-script tolerance memo), the
  CHANGELOG entry, the README entry, and the
  review-packet existence + PURPOSE
  PRESERVATION CHECK heading.
- **Full 9-command verification gate** runs
  on `main` post-merge: `npm run lint`,
  `npm run typecheck`, `npm run test:unit`,
  `npm run test:contract`, `npm run
  test:docs`, `npm run test:integration`,
  `npm run audit:exports`, `npm run
  conform:check`, `npm run build`.
- No new contract tests required — there is
  no new runtime helper, CLI, validator, or
  publisher in this batch.

## INTENTIONALLY UNTOUCHED

The following surfaces were **intentionally
not** modified in this batch:

- `packages/*/src/*` — no source change in
  any workspace.
- `packages/cli/src/*` — no new CLI command,
  no new flag.
- `packages/capability-docs/src/*` — no new
  publisher, no new builder.
- `packages/capability-verify/src/*` — no
  new runner behaviour.
- Any `package.json`, `package-lock.json`,
  or `tsconfig.json` — no dependency
  change, no version bump (Rekon remains at
  `0.1.0-beta.0`).
- `.github/workflows/*.yml` — no active
  workflow installed (workflow templates
  remain reference-only under
  `docs/examples/workflows/`).
- The artifact registry, schema set, and
  permission model — no change.
- The path-freshness contract — no change
  to `comparePathFreshness`, no change to
  `buildSourceStateFingerprint`, no change
  to the `PathFreshnessReport` artifact.
- The support playbook and bug-report
  template — only a single cross-link added
  to each pointing at the new quickstart.

## RISKS / FOLLOW-UP

**Risks (all low):**

- *Operator copy-paste drift.* The
  quickstart uses
  `CLI="$(pwd)/packages/cli/dist/index.js"`
  to make commands copy-pasteable. If an
  operator runs the snippet from outside
  the Rekon checkout, `$CLI` resolves to a
  bad path. Mitigation: the quickstart's
  *Install From Source Checkout* section
  pins the `cd rekon` step before
  `npm ci`, and the First-Run Command table
  uses `$CLI` explicitly so the operator
  has to set it once.
- *Stale-warning fatigue.* The quickstart
  flags that stale path freshness is a
  visible warning but never flips GitHub
  Check conclusion. If operators ignore
  the warning, they may share stale
  artifacts. Mitigation: the *Run Path
  Freshness* section is explicit about
  what `stale` means and the *Report A
  Blocker* section pins the freshness
  warning as a real signal.
- *Quickstart vs. playbook drift.* If a
  future change updates the playbook
  without updating the quickstart, the two
  surfaces could diverge. Mitigation: the
  quickstart's opening blockquote pins
  "playbook wins" so reviewers know to
  treat the playbook as canonical. The
  quickstart docs test does not re-derive
  content from the playbook — both
  surfaces are pinned independently — but
  the cross-link is asserted.

**Follow-up (next batch):**

- *Private beta onboarding validation
  run.* Recommended next slice: an
  operator follows this quickstart against
  a non-Rekon repo and records any gaps
  (confusing commands, missing docs,
  unclear outputs, support-template gaps,
  artifact-sharing risks). Captured as the
  recommended next step in the quickstart
  itself and in the roadmap update.

## NEXT STEP

**Private beta onboarding validation run** —
have an operator (initially the Rekon
maintainer, then a second operator) follow
this quickstart end-to-end against one
non-Rekon repo and write up:

- which steps were clear
- which steps were confusing or missing
- which artifacts they reflexively wanted to
  attach
- whether the temp-copy isolation worked
  cleanly
- whether path freshness behaved per the
  quickstart's pin
- whether they would have known what to do
  on a blocker without reading the full
  playbook

The output is a short retrospective memo
(`docs/strategy/private-beta-onboarding-validation-report.md`)
+ targeted edits to the quickstart for any
real gaps. The validation run should not
require any new code, any new test, or any
new runtime behaviour.
