---
freshness:
  paths:
    - packages/capability-policy/src/**
    - tests/bench/**
---
# Work Order: Calibration v3, Rulings Half (WO-16)

> Committed verbatim as issued by the operator (2026-06-12) per the
> docs/work-orders/ convention. Amendments land as commits.

**Slice type:** decision + implementation (operator rulings executed as
law, bench ground-truth entries, one detector scope refinement). Law and
sensor tracks. **The WO-14 template binds.** **Ratification note:**
operator dispatch ratifies every part below; strike any part or table row
before dispatch to rule the other way. The 86-finding triage rulings are
NOT in this order; they follow as a cited amendment once the planner's
judgment pass completes, so nothing here blocks on them.

---

## Part 1: the ten overruled entries (living conduits)

The WO-15 run identified ten classic dead_code keeps that lost credit to
the barrel-class exemption. The planner's imported-anywhere test
(corpus: `rulings-prework.json`) shows the evidentiary basis is stronger
than consistency: **the reexport chain proves consumption classic could
not follow.** Representative counts: simulacrum
`kernel/import-intake/index.ts` resolves 226 importers; codebase-intel
`schemas/analysis.schema.ts` resolves 256.

Execution: enumerate the exact ten from the WO-15 run data. For each file
**with one or more resolved importers**, add an `overruled.json` entry:
`rulingRef` to this order's Part 1, `note` stating the importer count and
a sample importer (the evidence is the entry). For any of the ten **with
zero resolved importers** (the planner's scan found one candidate in the
unmatched set: codebase-intel
`services/analysis/capability-comparison-helpers.ts`), do NOT overrule;
those route to Part 2. Per WO-12: per-finding, never per-rule; the
denominator change is reported exactly.

## Part 2: barrel scope v2.1 (the exemption learns file-level death)

A barrel nobody imports is dead code even as a conduit. Scope the
barrel-class exemption to **export-level findings only**: a barrel-shaped
file with zero resolved importers (import_specifier and reexport targets
both) is eligible for a file-level unreachability finding again. Restore
any finding the v2 exemption wrongly retired (expected: the
zero-importer case above if it was exempted; report the exact set).
Contract tests: the living-conduit case stays exempt; the dead-barrel
case fires; the exemption counter distinguishes the two.

## Part 3: the naming role batch (mentor overlay)

The wave's naming findings are role-vocabulary gaps, not entity-noun
gaps: every finding is a trailing token the ported 43 fileTypes don't
declare, and the head of the distribution is the school's real UI and
service vocabulary meeting the grammar for the first time. Add the
following roles to mentor's corpus overlay as fileType entries, source
`operator:wo-16#naming-roles`, each with the layer home shown (drawn
from the observed file distribution; the executor verifies layer
assignment against the actual files and reports any that disagree):

| Role token | Count | Layer home | Example |
| --- | --- | --- | --- |
| Primitive | 15 | ui | `surfaces/web/structured/renderers/primitives/BadgePrimitive.tsx` |
| Renderer | 11 | service | `core/services/prompt/PromptPlanRenderer.ts` |
| Manifest | 11 | config | `experiences/archive/recipes/config/gates/Manifest.ts` |
| Types | 11 | any (type barrel) | `core/domain/state/derived/Types.ts` |
| Source | 7 | service | `core/config/gates/FileGateSource.ts` |
| Layout | 7 | ui | `experiences/plume/surfaces/web/shell/PlumeChatLayout.tsx` |
| Schemas | 5 | domain | `core/domain/turnPlan/TrajectoryCoreSchemas.ts` |
| Handlers | 5 | service | `core/services/comms/CommsDomainEventHandlers.ts` |
| Deriver | 5 | service | `core/services/focus/ExpectationResolutionDeriver.ts` |
| Policy | 4 | domain | `core/services/capabilities/CapabilityPolicy.ts` |
| Indicator | 4 | ui | `surfaces/web/indicators/ConnectionIndicator.tsx` |
| Projection | 3 | service | `core/services/progress-insights/state/ProgressStateProjection.ts` |
| Recorder | 3 | service | `core/services/turn/TurnInputRecorder.ts` |
| Registry | 3 | domain | `experiences/career/modules/assessments/domain/core/Registry.ts` |
| Tab | 3 | ui | `experiences/career/modules/assessments/surfaces/web/tabs/AssessmentsTab.tsx` |
| List | 3 | ui | `experiences/plume/surfaces/web/shell/PlumeConversationList.tsx` |
| Client | 3 | infra | `infra/logging/Client.ts` |
| Bridge | 3 | infra | `infra/telemetry/handoff/ClientBridge.ts` |
| Button | 3 | ui | `surfaces/web/chat/messages/RetryButton.tsx` |
| Security | 2 | route | `app/api/v1/auth/AuthRequestSecurity.ts` |
| Routing | 2 | service | `core/conductor/turnPlan/IntentExperienceRouting.ts` |
| Questions | 2 | config | `experiences/career/modules/assessments/config/prompt/FastClassifierQuestions.ts` |

Marked for individual operator attention before dispatch (strike to
reject): **Types**, **Questions** (both defensible as school vocabulary,
both also defensible as naming debt; they ship as roles unless struck).

**Rejected, stays findings:** `manager` (7) and `utils` (3) are forbidden
types wearing the naming rule's clothes; no role entry, the findings
stand with their placement-rule siblings. The executor notes the
double-fire (one file, two rules) in the memo; deduplication is a design
question for later, not a silent merge now.

**The tail** (~207 distinct tokens, ~210 findings, mostly singletons):
stands as the naming debt register, per the standing-register convention.
A sampled mining pass for further roles is a future operator session,
not this order.

**Jurisdiction note:** these roles land in mentor's overlay only.
codebase-intel's 58 naming findings stay open; graduating proven roles to
an archetype is a future cited act once a second repo confirms them.

## Expected deltas, stated

Denominator drops by the overruled count (up to ten, exact reported).
Mentor naming findings drop by approximately 115 (the ratified-role
share; exact count by role reported, exemption counters extended to role
ratifications). The dead-barrel finding restoration adds back its exact
set. Recall moves only by denominator arithmetic; credit is unchanged.
Controls unchanged. Anything else: decomposed, never absorbed.

## Non-goals

The 86-finding rulings (cited amendment follows); archetype graduation
of the new roles; double-fire deduplication; the ~900 unreferenced-export
remainder (sampled triage later); required-edge graduation.

## Verification

Template gate; the Part 2 contract tests; `overruled.json` validation
green with the new entries; the before/after table with per-part deltas;
the updated standing-register listing.
