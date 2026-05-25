# Private Beta Bug Report Template

> Copy this template into a new file or support
> ticket. Fill in every section. Reports missing
> Rekon artifacts (or explicit redacted
> substitutes) will be returned for completion
> before triage. See the
> [Private Beta Support Playbook](private-beta-support-playbook.md)
> for the canonical artifact list, blocker
> taxonomy, and redaction guidance.

---

## Summary

<!--
One-paragraph description of what went wrong and
why you think it is a Rekon defect (not an
acceptable first-class finding). Reference the
classification table in the playbook.
-->

## Environment

<!--
Operator's local setup. Include:
- OS + version
- Node.js version
- npm / pnpm / yarn version (whichever you used
  for `npm ci`)
- Whether the operator ran inside a container or
  CI runner
- Whether the operator ran against a `mktemp -d`
  copy of the target repo (recommended) or
  in-place
-->

## Rekon Version / SHA

<!--
- Rekon `package.json` version (currently
  `0.1.0-beta.0`).
- Output of `git rev-parse HEAD` inside the
  Rekon checkout.
- If you applied any local patches on top of the
  pinned SHA, list them.
-->

## Target Repository Shape

<!--
A redacted description of the codebase being
analysed. Useful fields:
- approximate file count
- language mix (TS / JS / mixed; Next.js / SPA /
  monorepo)
- presence of npm / pnpm / yarn lockfile
- whether the repo defines `typecheck`, `test`,
  `build` scripts in `package.json`
- known size of `.rekon/` after the first
  refresh

Do not include a real repository name or URL
unless you have explicit operator authorisation
to share it. A placeholder like
`<medium-monorepo>` is acceptable; the
[real-repo cohort summary](../strategy/real-repo-cohort-summary.md)
is the canonical reference for this style.
-->

## Commands Run

<!--
Paste the exact CLI commands you ran, in order,
that led to the issue. Use the playbook's
command matrix as the baseline:

```bash
npm ci
npm run build
node packages/cli/dist/index.js init --root <repo> --json
node packages/cli/dist/index.js refresh --root <repo> --json
node packages/cli/dist/index.js paths freshness --root <repo> --json
node packages/cli/dist/index.js artifacts validate --root <repo> --json
node packages/cli/dist/index.js publish architecture --root <repo> --json
node packages/cli/dist/index.js publish agent-contract --root <repo> --json
node packages/cli/dist/index.js publish proof --root <repo> --json
node packages/cli/dist/index.js publish github-check --root <repo> --dry-run --json
node packages/cli/dist/index.js publish pr-comment --root <repo> --dry-run --json
```

Mark which command produced the failing
output.
-->

## Expected Result

<!--
What you expected to happen. Cite the playbook
or a referenced doc if you can.
-->

## Actual Result

<!--
What actually happened. Paste the relevant
stderr / stdout. **Do not paste GitHub tokens,
secrets, or customer data** — see the playbook's
Privacy And Redaction Guidance.
-->

## Artifact Validation Result

<!--
Paste the JSON output of:

```bash
node packages/cli/dist/index.js artifacts validate --root <repo> --json
```

`{ "valid": true, "issues": [] }` is the expected
clean result. Anything else is a blocker — note
which issue codes appear.
-->

## Path Freshness Result

<!--
Paste the JSON output of:

```bash
node packages/cli/dist/index.js paths freshness --root <repo> --json
```

If the report is `status: "stale"`, also run
`rekon refresh` then re-run path freshness and
attach both reports. If the report is `status:
"fresh"` after a known source edit, **that is a
blocker** (false fresh = stale truth).
-->

## Verification Result

<!--
Paste the JSON shape (not the full body) of the
latest `VerificationResult`. Useful fields:
- `status`
- `summary.passed / .failed / .skipped / .notRun`
- `recordedBy`
- `verificationPlanRef`

If the result is `failed` but the
`VerificationRun` recorded the failure honestly
(real typecheck error, real test failure), this
is an acceptable first-class outcome — see the
playbook.
-->

## GitHub Review Dry-Run Result

<!--
Paste the JSON output of:

```bash
node packages/cli/dist/index.js publish github-check --root <repo> --dry-run --json
node packages/cli/dist/index.js publish pr-comment --root <repo> --dry-run --json
```

Confirm both make no network call (no
`GITHUB_TOKEN` was set, no readiness override
was applied, no actual HTTP request was
attempted).
-->

## Attached Artifacts

<!--
List the artifact files attached to this
report. The minimum-viable set is:

- `.rekon/artifacts/registry/artifacts.index.json`
  (or the equivalent index path)
- the latest `VerificationRun`
- the latest `VerificationResult`
- the latest `PathFreshnessReport`
- the relevant `Publication` if a publication
  command was involved

Add the other artifacts from the playbook's
*Artifact Attachment* table only when relevant
to the issue (e.g., a `FindingFilterReport`
when the report is about filtering, an
`IssueAdjudicationReport` when the report is
about grouping / merge candidates, …).

If you cannot share an artifact verbatim,
attach a redacted substitute and note which
fields you redacted.
-->

## Redactions Applied

<!--
Describe every change you made to the attached
artifacts before sharing. Examples:
- "Replaced `header.subject.repoId` with
  `<medium-monorepo>` across all attached
  artifacts."
- "Stripped the `paths[]` list from
  `ObservedRepo` (43 customer paths)."
- "Replaced finding text bodies under
  `findings[].message` with `<redacted>` (15
  findings)."

If you found a token / secret in any artifact
before redacting it, **note that here and treat
it as a blocker per the playbook**: stop
sharing, rotate the secret, file the report
through a trusted support channel only.
-->

## Blocker Classification

<!--
Apply the playbook's *Support Classification*
table. Choose exactly one:

- **Blocker** — refresh crash, artifacts
  validate invalid, malformed artifact,
  publication render failure, CLI crash,
  token / log leak, source mutation outside
  temp copies, dry-run network call, GitHub
  send bypasses readiness, `PathFreshnessReport`
  records `fresh` after a known source edit.
- **Acceptable warning** — `PathFreshnessReport`
  status `stale`; `rekon publish github-check
  --dry-run` reports `readiness: false`
  without env; aggregate freshness historical
  newer-input-exists.
- **Acceptable first-class outcome** —
  findings exist; verification failed honestly;
  first paths-freshness run records `unknown`;
  missing script commands are recorded
  `skipped`.

Cite the row in the playbook's table that
applies. If you classified an outcome as a
blocker that the playbook lists as acceptable
(or vice versa), explain why this case
differs.
-->

## Additional Notes

<!--
Anything else the support reviewer should know:
- whether you can reproduce the issue
  consistently
- whether the issue first appeared after a
  source edit (relevant for path-freshness
  reports)
- whether the operator's repo is a publicly
  available open-source project, and if so
  the public URL (useful for the support
  reviewer to reproduce against the same
  baseline)
- which prior beta SHA, if any, did NOT
  exhibit the issue (helps bisect the
  introduction)
- any related work-order, prior bug report,
  or strategy memo
-->

---

## Cross-References

- [Private Beta Support Playbook](private-beta-support-playbook.md)
- [No-NPM Beta Distribution Policy](../strategy/no-npm-beta-distribution-policy.md)
- [Path Freshness Safety Review](../strategy/path-freshness-safety-review.md)
- [VerificationPlan missing-script tolerance memo](../strategy/verification-missing-script-tolerance.md)
- [Real-Repo Cohort Summary](../strategy/real-repo-cohort-summary.md)
