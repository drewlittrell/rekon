# Review Packet — Watcher / Path Freshness Policy Decision Memo

**Slice:** `watcher-path-freshness-policy-decision`
**Sequence position:** Second of three beta blockers
identified by the
[Beta Readiness / Remaining Classic-Parity Review](../../docs/strategy/beta-readiness-classic-parity-review.md).
**Batch type:** Strategy / docs / tests only. **No runtime
behaviour change.** No new package, no new CLI command, no
new helper, no workflow-template change, no validator
profile change, no GitHub API call, no file-system event
subscription, no daemon, no background refresh, no path
mtime tracking, no artifact-type registration, no
`ArtifactHeader` change.

## CHANGES MADE

1. **New strategy memo** at
   [`docs/strategy/watcher-path-freshness-policy-decision.md`](../../docs/strategy/watcher-path-freshness-policy-decision.md).
   Pins the watcher / path freshness boundary for beta:
   **Option C — watcher-lite / path freshness policy
   for beta. No daemon by default; explicit `rekon
   refresh` remains the canonical operator action;
   future `PathFreshnessReport` artifact reserved by
   name; agent contract instructs agents to refresh
   after source edits.** Contains all 13 required
   headings (Decision Summary, Why This Decision
   Exists, Current Refresh Model, Classic Goal
   Reviewed, Options Considered, Recommendation, Beta
   Default, Source Change Policy, Path Freshness
   Model, Agent Contract Policy, Watcher Future, What
   This Does Not Do, Implementation Sequence), the
   five pinned reminder statements, three diagnostic
   tables (policy, option, risk), and explicit
   reservation of the `PathFreshnessReport` artifact
   name.
2. **New docs test** at
   `tests/docs/watcher-path-freshness-policy-decision.test.mjs`
   pinning the 17 required assertions (memo
   existence, all 13 required headings present, five
   pinned reminder statements verbatim, three
   diagnostic tables present, Option C recommended,
   reserved `PathFreshnessReport` artifact name,
   implementation sequence ordering, CHANGELOG
   mention, review-packet PURPOSE PRESERVATION
   CHECK).
3. **Cross-doc updates:**
   - [`docs/strategy/beta-readiness-classic-parity-review.md`](../../docs/strategy/beta-readiness-classic-parity-review.md)
     marks the watcher / path freshness blocker as
     resolved + points to this memo.
   - [`docs/strategy/source-write-reconciliation-policy-decision.md`](../../docs/strategy/source-write-reconciliation-policy-decision.md)
     adds the watcher / path freshness policy memo as
     the next-slice pointer in the implementation
     sequence.
   - [`docs/strategy/issue-governance-architecture-decision.md`](../../docs/strategy/issue-governance-architecture-decision.md)
     adds step 63 (watcher / path freshness policy
     memo shipped).
   - [`docs/strategy/classic-behavior-roadmap.md`](../../docs/strategy/classic-behavior-roadmap.md)
     gains a "Shipped" entry for the watcher / path
     freshness policy decision memo + points to the
     beta release readiness checklist as the next
     slice.
   - [`docs/strategy/roadmap.md`](../../docs/strategy/roadmap.md)
     gains a new completed-slice entry.
   - [`docs/strategy/classic-guarantees-audit.md`](../../docs/strategy/classic-guarantees-audit.md)
     adds the watcher / path freshness policy memo
     pointer.
   - [`docs/strategy/classic-alignment-map.md`](../../docs/strategy/classic-alignment-map.md)
     adds the watcher / path freshness policy memo
     pointer.
   - [`docs/concepts/refresh.md`](../../docs/concepts/refresh.md)
     adds the watcher / path freshness policy memo
     pointer (refresh is the canonical operator
     action under the policy).
   - [`docs/concepts/freshness-and-invalidation.md`](../../docs/concepts/freshness-and-invalidation.md)
     adds the watcher / path freshness policy memo
     pointer (the distinction between artifact
     lineage freshness and working-tree freshness is
     pinned by the policy).
   - [`docs/concepts/agent-operating-contract.md`](../../docs/concepts/agent-operating-contract.md)
     adds the watcher / path freshness policy memo
     pointer (the agent contract policy section
     instructs agents to refresh after source edits).
   - [`docs/artifacts/architecture-summary-publication.md`](../../docs/artifacts/architecture-summary-publication.md)
     adds the watcher / path freshness policy memo
     pointer (the future Working Tree Freshness
     surface lives here when path freshness lands).
   - [`docs/artifacts/agent-contract-publication.md`](../../docs/artifacts/agent-contract-publication.md)
     adds the watcher / path freshness policy memo
     pointer (the agent contract publication is the
     primary surface for the agent contract policy).
4. **README + CHANGELOG entries.**

All 12 listed supporting docs exist in the repository;
none were skipped. The verification step that confirmed
this is documented in the implementation notes (no
missing-doc entry needed).

## PUBLIC API CHANGES

- **None.** This is a strategy / docs / tests batch.
- No new exports from any `@rekon/*` package.
- No new CLI command, no new CLI flag.
- No new validator profile, no new issue code.
- No new workflow template.
- No new artifact type. (`PathFreshnessReport` is
  **reserved by name** in this memo + the docs
  test; the actual artifact registration is a
  follow-on slice.)
- No new capability package.
- No new role / permission.

## PURPOSE PRESERVATION CHECK

The memo is informational + policy-pinning; it preserves
every existing invariant:

- **`rekon refresh` behaviour.** Unchanged. The memo
  pins the existing explicit-operator-action shape as
  the beta default.
- **`rekon artifacts freshness` behaviour.**
  Unchanged. The memo pins the artifact-lineage
  freshness oracle as authoritative for lineage but
  distinct from working-tree freshness.
- **`rekon observe --changed-file` behaviour.**
  Unchanged. The memo pins the flag as the explicit
  incremental operator input.
- **`ArtifactHeader` shape.** Unchanged.
- **`IntelligenceSnapshot` / `EvidenceGraph` /
  `ObservedRepo` / `FindingReport` /
  `VerificationRun` schemas.** Unchanged.
- **Architecture summary Input Freshness Warnings.**
  Unchanged. The memo reserves a future Working Tree
  Freshness section as additive.
- **Agent contract Governance Freshness subsection.**
  Unchanged. The memo reserves a future Working Tree
  Freshness subsection as additive.
- **`resolve.issue` `issue.freshness` trace
  entries.** Unchanged.
- **`invalidatedBy` rule shape in capability
  manifests.** Unchanged. The memo pins that the
  `paths` and `events` rules remain public intent
  until the path-freshness implementation slice
  lands.
- **Canonical-truth invariant.** Reinforced. The
  memo pins that downstream surfaces continue to
  cite artifacts and never silently re-derive from
  the working tree.
- **No-background-mutation invariant.** **Pinned**
  by this memo. No surface, no resolver, no
  publisher, no agent invocation may trigger
  `rekon refresh` autonomously.
- **No-auto-resolution invariant.** Unchanged.
  Source edits do not auto-resolve findings;
  status changes remain explicit artifacts.
- **No new policy decisions outside the scope of
  this memo.** Path freshness implementation,
  watcher daemon design, and any opt-in watcher
  CLI are intentionally deferred to follow-on
  slices.

## CODEBASE-INTEL ALIGNMENT

- **Classic goal reviewed and preserved at the
  policy level.** `codebase-intel-classic`'s
  `WatchHandler` + `ContextHandler` +
  `lib/context-freshness.ts` together enforced
  "users and agents must not unknowingly rely on
  stale codebase context." The memo preserves
  that guarantee through artifact-lineage warnings
  (already shipped) + the source change policy +
  the agent contract policy + the reserved path
  freshness artefact + the watcher future
  guardrails.
- **Classic anti-patterns avoided.** The memo
  refuses to ship a daemon without a safety
  review; refuses to ship background refresh;
  refuses to silently mutate artifacts; refuses
  to treat mtimes as canonical freshness
  evidence; refuses to let agents infer freshness
  from timestamps.
- **Capability model:** unchanged.
- **Conformance:** unchanged.

## OPTIONS CONSIDERED

Four options analysed in the memo:

| Option | Posture | Verdict |
| --- | --- | --- |
| A | Manual refresh only | Acceptable as strict default; rejected standalone because it leaves policy ambiguous |
| B | Full watcher daemon | Rejected for beta; reconsider post-beta with its own safety review |
| C | Watcher-lite / path freshness policy | **Recommended** |
| D | Opt-in experimental watcher | Rejected for beta; reconsider post-beta after a watcher safety review lands |

Option C preserves the safety properties of A while
giving the beta product a pinned policy boundary
operators (and agents reading this codebase) can rely
on.

## RECOMMENDATION

**Option C.** Ship this decision memo + the docs test
that pins it. Defer the path freshness implementation,
the watcher daemon design, and any opt-in watcher CLI
to follow-on slices.

The next two pre-beta slices, in order:

1. **Beta release readiness checklist memo.** Third
   (and final) beta blocker.
2. **Beta release execution.** Final pre-beta
   slice.

The four post-beta watcher / path-freshness slices,
in order:

3. **Path freshness artefact slice.** Adds the
   `PathFreshnessReport` artifact type + a CLI
   command (`rekon paths freshness` or equivalent —
   naming deferred to the implementation slice).
4. **Watcher daemon design memo.** Pins the daemon
   lifecycle, the permission contract, the
   cross-platform file-system strategy, and the
   no-hidden-mutation invariant.
5. **Watcher daemon implementation slice.** Adds
   `rekon watch` (or equivalent) — opt-in default.
6. **Watcher / path-freshness safety review slice.**
   Declares the path-freshness + watcher path
   beta-stable (or surfaces remaining blockers).

## POLICY DECISIONS

The eight policy decisions pinned by the memo:

| Policy Area | Decision |
| --- | --- |
| Beta watcher daemon | not required |
| Background refresh | not allowed by default |
| Refresh command | explicit operator action |
| Source edits | require refresh before trusting artifacts |
| Path freshness evidence | content/hash/git state preferred |
| File mtimes | advisory only |
| Future artifact | `PathFreshnessReport` reserved |
| Agent guidance | recommend refresh after edits |

The four option decisions:

| Option | Decision |
| --- | --- |
| manual refresh only | insufficient alone |
| full watcher daemon | post-beta |
| watcher-lite / path policy | selected |
| opt-in daemon | future experimental |

The five risk guardrails:

| Risk | Guardrail |
| --- | --- |
| stale source context | refresh-after-edit policy |
| hidden artifact mutation | no background writes |
| mtime unreliability | prefer content hashes / git state |
| agent stale inference | agent contract refresh instruction |
| daemon lifecycle complexity | watcher deferred |

## BETA IMPACT

- **`rekon refresh` behaviour:** unchanged.
- **`rekon artifacts freshness` behaviour:**
  unchanged.
- **`rekon observe --changed-file` behaviour:**
  unchanged.
- **Architecture summary publication:** unchanged
  (no new sections rendered in this batch; the
  future Working Tree Freshness section is
  reserved for the path freshness implementation
  slice).
- **Agent contract publication:** unchanged (no
  new subsections rendered in this batch; the
  future Working Tree Freshness subsection is
  reserved for the path freshness implementation
  slice).
- **Resolver packet behaviour:** unchanged.
- **GitHub Check / PR comment publisher
  behaviour:** unchanged.
- **Permission map / SDK conformance:** unchanged.
- **Documentation:** the watcher / path freshness
  boundary is now pinned. Operators reading the
  docs in the order Beta Readiness → Source-Write
  Policy → Watcher / Path Freshness Policy → Refresh
  / Freshness now see the same answer at every
  level.
- **Beta blocker count:** one blocker resolved
  (watcher / path freshness policy). One blocker
  remains (beta release readiness checklist).

## TESTS / VERIFICATION

- **New docs suite:**
  `tests/docs/watcher-path-freshness-policy-decision.test.mjs`
  — 17 assertions, all passing.
- **Existing suites still passing:** every prior
  contract / docs suite. Full suite expected ≥
  1622 passed / 1 skipped (1605 prior + 17 new).
- **Audits / smokes:** package-exports, license,
  publish-dry-run, install-smoke,
  install-tarball-smoke — all expected to pass
  unchanged.
- **No CLI smoke required.** Strategy-only batch.

## INTENTIONALLY UNTOUCHED

- `packages/capability-docs/src/index.ts` — unchanged.
- `packages/capability-verify/src/index.ts` —
  unchanged.
- `packages/cli/src/index.ts` — unchanged.
- `@rekon/sdk` conformance — unchanged (no
  `PathFreshnessReport` registration in this batch).
- `@rekon/runtime` artifact category map —
  unchanged.
- `@rekon/kernel-*` — unchanged.
- `ArtifactHeader` shape — unchanged.
- `IntelligenceSnapshot` / `EvidenceGraph` /
  `ObservedRepo` / `FindingReport` /
  `VerificationRun` schemas — unchanged.
- `rekon refresh` / `rekon artifacts freshness` /
  `rekon observe` CLI behaviour — unchanged.
- All four workflow templates — unchanged.
- All three validator profiles — unchanged.
- All existing contract tests — unchanged.
- `.github/workflows/*.yml` in the Rekon repo —
  unchanged (still empty).

## RISKS / FOLLOW-UP

- **Risk: memo drifts from product reality before
  the path freshness + watcher slices land.**
  Mitigated by the docs test pinning the five
  pinned reminder statements, the reserved
  `PathFreshnessReport` name, the policy / option /
  risk tables, and the implementation sequence
  ordering.
- **Risk: a future contributor implements a watcher
  daemon before the watcher daemon design memo
  lands.** Mitigated by the docs test pinning the
  implementation sequence ordering (steps 3 → 4 →
  5 → 6, with the release checklist + release
  execution in between).
- **Risk: an agent reads the memo and tries to
  invoke `rekon refresh` autonomously.** Mitigated
  by the verbatim `Agents should treat artifacts
  as stale after source edits until `rekon
  refresh` has run.` statement, plus the agent
  contract policy section's explicit "Not invoke
  `rekon refresh` on the operator's behalf without
  explicit permission" instruction, pinned by the
  docs test and surfaced in every cross-referenced
  doc.
- **Risk: mtime-only detection slips into the
  path freshness implementation.** Mitigated by
  the verbatim `File mtimes alone are not
  sufficient as canonical freshness evidence`
  statement, pinned by the docs test.
- **Risk: name collisions.** Reserved
  `PathFreshnessReport` is a defensive
  reservation; it does not register itself with
  the SDK / runtime, so an out-of-band batch
  could theoretically use the name for something
  else. Mitigated by the docs test pinning the
  name in this memo.
- **Follow-up — Beta release readiness checklist
  memo (next slice).** Third (and final) beta
  blocker.
- **Follow-up — Beta release execution.** Final
  pre-beta slice.
- **Follow-up (post-beta) — Path freshness
  artefact slice.** Adds the `PathFreshnessReport`
  registration + `rekon paths freshness` (or
  equivalent) CLI.
- **Follow-up (post-beta) — Watcher daemon design
  memo.** Pins daemon lifecycle + permission
  contract.
- **Follow-up (post-beta) — Watcher daemon
  implementation slice.** Adds `rekon watch` (or
  equivalent) — opt-in default.
- **Follow-up (post-beta) — Watcher / path
  freshness safety review slice.** Declares the
  path-freshness + watcher path beta-stable (or
  surfaces remaining blockers).

## NEXT STEP

**Beta release readiness checklist memo.**

Pin the final beta release contract:

- versioning / npm publish decision
- package audit commands
- install smoke requirements
- docs completeness
- beta known limitations
- release blockers
- no hidden runtime changes

This is the third (and final) of the three beta
blockers identified by the
[Beta Readiness / Remaining Classic-Parity Review](../../docs/strategy/beta-readiness-classic-parity-review.md).
