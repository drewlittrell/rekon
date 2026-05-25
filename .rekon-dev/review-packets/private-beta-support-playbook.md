# Review Packet — Private Beta Support Playbook

**Slice:** `private-beta-support-playbook`
**Sequence position:** First post-track slice
after the path-freshness safety review (which
declared the watcher / path-freshness track
beta-private stable). Converts the now-stable
no-NPM private-beta posture into an operator
support process.
**Batch type:** Strategy / docs / tests only.
**Strict no-go list:** no npm publish, no version
bump, no git tag, no GitHub Release, no runtime
behaviour change, no new CLI command, no new
helper, no schema change, no new artifact type,
no new permission, no new role, no workflow YAML,
no validator profile change, no GitHub API call,
no `package.json` / `package-lock.json` mutation,
no source-file mutation in any `packages/*/src/*`,
no mutation of any operator repo, no network I/O.

## CHANGES MADE

1. **New
   `docs/beta/private-beta-support-playbook.md`**
   — operator-facing support playbook with all
   14 required headings (Purpose, Distribution
   Model, Install From Source Checkout, First
   Run Command Matrix, Artifact Sharing
   Policy, Bug Report Requirements, Blocker
   Taxonomy, Acceptable First-Class Outcomes,
   Path Freshness Guidance, GitHub Review
   Surface Guidance, Privacy And Redaction
   Guidance, Support Triage Flow, What This
   Does Not Do, Follow-Up Work) plus a
   *Diagnostic Tables* section carrying the
   three required tables (Support
   Classification / Artifact Attachment /
   Command Matrix). New `docs/beta/`
   directory created.
2. **New
   `docs/beta/private-beta-bug-report-template.md`**
   — bug-report template with all 14 required
   section headings.
3. **New review packet (this file)** with
   PURPOSE PRESERVATION CHECK + all 12
   required sections.
4. **New docs test
   `tests/docs/private-beta-support-playbook.test.mjs`**
   with all 22 required assertions.
5. **Supporting doc cross-links** updated:
   `docs/strategy/no-npm-beta-distribution-policy.md`,
   `docs/strategy/real-repo-beta-dogfood-report.md`,
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
schema change.

## PURPOSE PRESERVATION CHECK

Original problem (per the work order):

> Rekon is now beta-private stable across
> verification, GitHub review surfaces, and
> path freshness. Private beta users need
> clear operating instructions and support
> expectations. Without a support playbook,
> bug reports will be inconsistent, artifact
> sharing may leak sensitive data, and
> acceptable first-class outcomes may be
> mistaken for blockers.

Product guarantees preserved (each pinned
verbatim in the playbook + verified by a
docs-test assertion):

- **Users install from source checkout during
  beta.** The Distribution Model + Install
  From Source Checkout sections name the
  exact commands; the docs test asserts that
  "use source checkout" and "npm ci" / "npm
  run build" appear.
- **Users run a known command matrix.** Five
  required commands appear in the playbook's
  *First Run Command Matrix* and again in the
  *Diagnostic Tables → Command Matrix* table.
- **Users know which artifacts to attach.**
  Both the *Artifact Sharing Policy* table
  and the *Diagnostic Tables → Artifact
  Attachment* table enumerate the canonical
  artefact set. The docs test pins the
  `.rekon/artifacts/index.json` mention.
- **Users know which outcomes are blockers
  vs acceptable findings.** The *Blocker
  Taxonomy* section enumerates 10 blocker
  classes; *Acceptable First-Class Outcomes*
  enumerates 6 acceptable patterns. The
  *Support Classification* table folds both
  into a single decision aid.
- **Users know to rerun path freshness /
  refresh after source edits.** The *Path
  Freshness Guidance* section pins both
  commands; the docs test asserts the path
  freshness rerun guidance verbatim.
- **Users know Rekon artifacts are canonical
  truth.** The *GitHub Review Surface
  Guidance* section pins this verbatim; the
  docs test asserts both "Rekon artifacts
  remain canonical" and "GitHub status /
  comments are not canonical truth".

Required verbatim pins (all present + asserted):

- *"Artifact validation failure is a blocker."*
  → Purpose section + Blocker Taxonomy.
- *"CLI crashes, malformed artifacts, token/log
  leaks, source mutation outside temp copies,
  or dry-run network calls are blockers."*
  → Purpose section + Blocker Taxonomy.
- *"Private beta support is source-checkout
  based."* → Purpose section.
- *"Bug reports must include Rekon artifacts
  or explicit redacted substitutes."* →
  Purpose section + Bug Report Requirements.
- *"Private beta users should not install
  from npm."* → Purpose section + Distribution
  Model.
- *"Path freshness should be rerun after
  source edits before trusting existing
  artifacts."* → Purpose section + Path
  Freshness Guidance.
- *"Findings, failed verification, stale
  aggregate freshness, and GitHub readiness
  gaps are not automatically blockers."*
  → Purpose section + Acceptable First-Class
  Outcomes.

What would mean we failed (none happened):

- The playbook implies `npm install` works
  during beta — no, multiple sections pin
  the no-NPM posture.
- The playbook weakens artifact
  redaction / privacy guidance — no, the
  Privacy And Redaction Guidance section is
  explicit + the Bug Report Template
  requires operators to enumerate redactions
  applied.
- The playbook claims GitHub comments /
  Checks are canonical truth — no, the
  GitHub Review Surface Guidance section
  pins the opposite verbatim.
- The playbook adds any runtime behaviour —
  no, this is a docs / tests-only batch.

## CODEBASE-INTEL ALIGNMENT

Classic capability or failure mode addressed:

- codebase-intel-classic helped users reason
  about real codebases and report actionable
  failures.

Rekon-native equivalent (now operationalised):

- Source-checkout install path documented.
- Known command matrix documented.
- Artifact-set-to-attach documented.
- Blocker vs acceptable taxonomy documented.
- Path-freshness rerun guidance documented.
- Canonical-truth distinction reinforced.

The playbook's *Purpose* section references
the classic guarantee verbatim ("users can run
the loop, understand outcomes, and report
issues with enough artifact context to fix
them").

## SUPPORT MODEL

- **Source-checkout install** as the only
  supported install path during beta.
- **Operator-driven command matrix** —
  operators run the matrix locally,
  inspect artifacts, and report only when
  the classification table says *blocker*.
- **Trusted support channel** required for
  artifact sharing; explicit redaction
  guidance covers private paths, customer
  data, secrets, tokens, and finding text.
- **Support reviewer reproduces** with the
  attached artifacts before re-classifying
  or opening a work order.

## BUG REPORT TEMPLATE

`docs/beta/private-beta-bug-report-template.md`
contains all 14 required sections (Summary;
Environment; Rekon Version / SHA; Target
Repository Shape; Commands Run; Expected
Result; Actual Result; Artifact Validation
Result; Path Freshness Result; Verification
Result; GitHub Review Dry-Run Result;
Attached Artifacts; Redactions Applied;
Blocker Classification; Additional Notes).
Each section embeds prompts so operators know
what to paste and what to omit. The template
explicitly directs operators to the playbook
for canonical artefact list, blocker taxonomy,
and redaction guidance.

## BLOCKER TAXONOMY

Pinned in the playbook's *Blocker Taxonomy*
section. The 10 blocker classes are
exhaustive for the v1 playbook:

1. `rekon refresh` crash.
2. `rekon artifacts validate` invalid.
3. Malformed artifact (unparseable JSON).
4. Publication render failure.
5. CLI crash.
6. Token / log leak in CLI output or artefact
   body.
7. Source mutation outside an explicit
   `mktemp -d` copy.
8. `--dry-run` flow makes a network call.
9. GitHub `--send` bypasses its readiness gate.
10. `PathFreshnessReport` reports `fresh`
    after a known source edit (false fresh).

Acceptable outcomes are enumerated in the
sibling *Acceptable First-Class Outcomes*
section + the *Support Classification* table.

## ARTIFACT SHARING POLICY

- Canonical set: artifact index,
  `FindingReport`, `FindingFilterReport`,
  `IssueAdjudicationReport`, `CoherencyDelta`,
  `VerificationRun`, `VerificationResult`,
  `PathFreshnessReport`, the three
  Publications.
- Privacy warning: artifacts may carry repo
  paths, finding text, command excerpts, and
  architecture details. Redact before
  sharing outside trusted channels.
- Token / secret discovery is a **blocker**:
  stop sharing, rotate, report.
- Three redaction guarantees the runner
  already enforces (bounded stdout/stderr
  capture; bounded GitHub API error-body
  reads; no `NODE_OPTIONS` echo) are cited
  so operators know what they should *not*
  need to redact themselves.

## TESTS / VERIFICATION

- New
  `tests/docs/private-beta-support-playbook.test.mjs`
  — **22 assertions** covering every
  required pin (playbook existence, bug
  report template existence, all required
  headings in both docs, the seven verbatim
  posture statements, the three required
  tables, CHANGELOG entry, review packet
  existence + PURPOSE PRESERVATION CHECK).
- All 9 mandatory verification commands
  clean (typecheck, test, build, git diff
  --check, audit-package-exports,
  audit-license, publish-dry-run,
  install-smoke, install-tarball-smoke).
- No CLI smoke required (docs-only batch).
- All pre-existing tests still pass.

## INTENTIONALLY UNTOUCHED

- Runtime behaviour anywhere in the
  codebase.
- `PathFreshnessReport` schema.
- `ArtifactHeader` shape.
- Any helper, CLI command, validator
  profile, workflow template, or publisher.
- GitHub Check `pickConclusion` logic.
- GitHub API transport.
- Active workflow YAML (none added).
- `package.json` / `package-lock.json`.
- Capability conformance.
- Existing strategy memos beyond
  cross-link additions.

## RISKS / FOLLOW-UP

- **Operator discoverability.** The playbook
  is reachable from README, CHANGELOG, the
  no-NPM beta policy, the dogfood report,
  and both roadmaps. Real-world feedback
  may surface additional discovery surfaces
  (e.g., a top-level `docs/beta/README.md`
  or a link from the github-actions operator
  guide). Hold for the onboarding
  quickstart slice.
- **Template adoption.** Real-world bug
  reports may reveal that the template's
  Verification / GitHub Review Dry-Run /
  Path Freshness Result sections are too
  verbose for casual reports. Tighten or
  add an optional fast-path if real reports
  surface that need.
- **Redaction tooling.** Today the playbook
  asks operators to redact by hand. A
  future polish slice could add a
  `rekon artifacts redact` helper, but it
  is **out of scope for beta-private**.
- **Public-beta / GA process.** This
  playbook covers private beta only.
  Public-beta and GA processes remain
  post-private-beta and require their own
  work orders.

## NEXT STEP

Per the work order: **Private Beta
Onboarding Quickstart** — a concise
operator/user quickstart built from this
playbook (install from source checkout, run
first scan, inspect outputs, report issues,
refresh after edits). Still no daemon, no
background refresh, no npm publish, no
version bump.
