---
freshness:
  paths:
    - packages/mcp/src/**
    - packages/capability-ontology/src/grammar/**
    - packages/capability-policy/src/**
    - packages/capability-js-ts/src/**
    - tests/bench/**
---
# Rekon system model

> **LIVING DOCUMENT.** Maintained as current state; governed by the Documentation authority section in AGENTS.md.

Status: **Canonical strategy document. Operator-approved 2026-06-10.
Refreshed 2026-06-12**, absorbing WO-6 through WO-14: this revision is the
content verification the freshness model asks of a living document.
Supersedes the framing of the "From detection to prevention" addendum; the
north star, the Rekon/Circe boundary, and all pinned safety deferrals hold
unchanged. Classic file citations were verified by direct read on
2026-06-10; scoreboard figures are the WO-14 canonical wave-end run.

## The mission, stated as a system

Rekon exists to keep codebases aligned with their declared purpose over
time, in an environment where AI agents generate most of the code. It
accomplishes this as one closed loop, and every Rekon capability is a
component of that loop. Nothing in this document is a feature list; it's
an anatomy.

## The three truths

The loop maintains three sources of truth and measures the gaps between
them.

**Declared truth: what the codebase is supposed to be.** The architecture
grammar (layers, verb categories, naming grammar, file types, patterns,
anti-patterns with corrections), the ontology vocabulary, capability
contracts carrying outcomes and handoffs, invariants, and system boundary
declarations.
Classic sources: `ontology/*.ontology.yaml` (the schema-to-evaluator
chain), `capability-contracts.accepted.json`, `invariants/**`,
`config.project/systems/*.yaml`,
`domain/issues/topology-contract-inference.ts` (the archetype library).
Rekon state: shipped and governed. The grammar is three-tiered
(meta-grammar schema, four classic-seeded archetype packs, project
overlays) with jurisdiction: archetype law backs findings only under
ratification. Operator law carries `operator:` provenance, purpose claims
in the law text, and the calibration loop has run end to end twice (WO-11,
WO-13). The vocabulary informs the grammar (noun-aware suffix matching,
exemptions counted). Still absent: the purpose rung above coherence,
versioned lineage (D7), and the `package-platform` archetype both home
repos need.

**Static observed truth: what the code says it is.** Scan, evidence graph
with provenance, per-file analysis, import and call relationships,
capabilities normalized through the ontology.
Rekon state: shipped, now at symbol granularity: `import_specifier` and
`reexport` facts with deterministic resolution through relative paths,
tsconfig aliases, and workspace package names; agent-scratch trees and
non-production paths excluded by construction (a contamination class
classic never met: the scanner no longer reads the agents' workbenches as
source).

**Runtime observed truth: what the code actually does.** Trace envelopes
joined to the static graph (`staticRef`) and to declared purpose
(`capabilityContractId`, `handoffContractId`). Static analysis assumes;
runtime truth verifies.
Classic sources: `kernel-runtime-truth`, `replatform-runtime-truth.ts`,
`replatform-delta.ts`, baton SDKs.
Rekon state: concepts only; the production seam is unbuilt and is the
loop's largest missing organ. Delta D4 pins the transport.

## The two flows

**The forward flow is prevention.** The system's primary product is
context delivered to the agent at decision time. First organ shipped:
`rekon mcp serve` (WO-6), local stdio, read-only by construction, serving
`orientation` and `where_does_this_belong` with a trust class on every
leaf value (the `tag()` gate throws on anything but deterministic and
declared content in v1), freshness honesty on every source, response
ceilings, and `no_declaration_covers_this` as a first-class honest answer.
Remaining organs, each a slice on this skeleton: the fused bundle, step
grounding, learnings behind the curation gate, drift-check-diff, runtime
context, and the bootstrapping interview (see the parity model below for
why bootstrapping is also the sensor track's lever).

**The return flow is freshness, and it is now proven.** Doc governance
shipped (WO-7): living documents declare referents, staleness is git
ancestry, snapshots are exempt and stamped, and this document is enrolled.
The law-calibration loop shipped and ran twice: finding cites its law,
operator interrogates the law's purpose, law refines as a scoped
declaration with a purpose claim and operator provenance, findings retire
by declaration. False positives migrate from detector bugs to law
miscalibration with a governed correction path; classic's decaying
suppression layer became a readable body of doctrine. Known gap, pinned:
an enrollment or mechanical commit resets ancestry-based freshness without
content review; the `freshness.verified` field lands with the concepts
state-shape rewrite.

**Detection is instrumentation.** The sensor layer measures the gaps. Its
scoreboard distinguishes designed-and-queued, parked-with-re-entry,
not-Rekon's-job (`rejected`), and now **`overruled`**: classic keeps that
operator rulings contradict leave the denominator with the ruling as
citation, because ground truth is living once law is governed. Precision
is measured, not asserted: classic's 2,148 recovered suppressions are the
standing labeled-negative gauntlet, scored per rule.

## The parity model (pinned 2026-06-12)

Scoreboard at the WO-14 canonical run: **8.7% weighted recall (523/5,993)**,
per-repo primary (mentor 14.3%, codebase-intel 5.4%, simulacrum 2.2%,
figma-ds control 1.9%, the controls moved only by base hygiene and
evidence rules, which apply everywhere by design).

The governing discovery of the wave: **recall is declaration-bounded, not
detector-bounded.** Classic achieved its recall by guessing where Rekon
requires declaration. The measured gaps decompose into: law content the
operator hasn't declared yet (vocabulary entities, ownership maps,
archetype ratification for the two home repos), cluster-A depth
(verb-per-layer, file-type grammar, sequential patterns: a v2 slice),
prose judgment Rekon deliberately routes through the opt-in semantic
overlay instead of reproducing (most of classic's tech_debt cluster), the
deferred similarity family awaiting the embedding precision slice, and
preservation-or-net-new slots that never had corpus fire history.

Doctrine that follows: **the actuator track raises the sensor track's
ceiling.** The bootstrapping interview that proposes declarations is how
the bench climbs. Recall pursued by weakening declarations instead of
growing them is a failure mode, named below. And the plateau sits
deliberately below 100%: the residual is the measured disagreement between
calibrated law and classic's uncalibrated keeps, governed finding by
finding through `overruled`. That residual is the product claim stated as
a number: we kept what was true, rejected what wasn't, and can show every
line of the difference.

## Design deltas (status as of this refresh)

**D1. Pull-based context over MCP.** v1 shipped (WO-6): the skeleton, two
tools, trust classes, ceilings. Remaining: the tool family above.
**D2. Turn and diff cadence.** The watcher is permanently retired
(executed in WO-5's archive). Turn-triggered incremental refresh is not
built; scans remain batch with freshness honesty.
**D3. Outcomes as executable proof, one evidence-strength scale.** Not
built; severity and confidence remain static per axis. The alignment
follow-up every detector slice has named.
**D4. Runtime truth rides OpenTelemetry.** Not built; the runtime track is
untouched.
**D5. The context surface is a security boundary.** v1 shipped (WO-6):
trust tagging by construction, injection-tested inputs, fail-closed,
served content carries no instructions. Remaining: the memory curation
gate before learnings ever serve.
**D6. The system measures its own effect.** Not built; requires the turn
loop.
**D7. Versioned purpose lineage.** Not built.
**D8. The grammar compiles outward.** Partial: the grammar drives the
divergence detector, the anti-pattern pack (the rows' own detection
rules), and the naming contract. Compilation to lint configs, CI checks,
and agent-contract assertions remains.

## What does not change

The three-truths model and its join keys. Proposal, never proof, for
anything LLM-derived. Governed suppression bound to a scope, now joined by
governed overruling bound to a ruling. The ontology-as-grammar idea, now
with jurisdiction. Contracts as the unit of purpose. Operator ratification
as the gate into declared truth. The closed loop itself.

## Operating conventions (proven in practice, now canon)

Work orders live in `docs/work-orders/`, committed before execution,
amendments as commits; executing agents verify tip first. **Step 0**:
detector and capability slices audit the substrate from tier-1 sources
before design and report found-versus-built. **Expected-delta-or-report**:
every run states its expected movement first; surprises are decomposed,
never absorbed. **Wave protocol** for breadth: thin sub-orders under one
binding template, per-slot numbers as working data, one canonical
wave-end run, one combined triage, calibration batched. **The standing
register**: ratified-open findings are the register working, never a
number to optimize away. Law refinements declare canonical paths, never
open borders, and carry purpose claims that name their own revisit
conditions.

## Track map (status at refresh)

- **Sensor track.** Done: bench and corpus (WO-1, WO-2), detection design
  (WO-3), symbol facts (WO-8), cluster-A v1 (WO-9), scan scope (WO-10),
  overruled (WO-12), wave 1 (WO-14: debt markers, dead_code, suppressed
  recovery, overlap, naming, anti-pattern pack). In flight: calibration
  v3 (dead_code v2 type-only/factory/barrel awareness is the wave's one
  red flag and first item). Remaining: slots 3, 8, 9, 10; cluster-A v2;
  the embedding precision slice gating the similarity family.
- **Law track.** Done: grammar port and archetype jurisdiction (WO-4,
  WO-4.1), calibration v1 and v2 (WO-11, WO-13), operator provenance.
  Remaining: the `package-platform` archetype (the recall lever for both
  home repos), required-edge graduation (classic's inverse baton rule,
  queued inside the instrumentation law text), the operator-topology-edge
  compile gap, D3's unified scale, D7, the purpose rung.
- **Actuator track.** Done: the MCP skeleton (WO-6). Next: the tool
  family, the bootstrapping interview (sensor ceiling lever), memory
  curation gate.
- **Runtime track.** Untouched. D4 is the entry slice.
- **Loop integrity track.** Done: documentation authority (WO-5), doc
  freshness (WO-7). Remaining: the concepts state-shape rewrite with
  `freshness.verified` (worklist: the nine day-one-stale docs), D6's
  self-measurement eval, turn-cadence refresh (D2's unbuilt half).

## What failure looks like

The sensor track converges while the actuator track stays unbuilt. Recall
pursued by weakening declarations rather than growing them. Context ships
without trust classes, or memory serves without curation. The grammar's
jurisdiction erodes through broad-path law. The standing register shrinks
by optimization instead of remediation. Overruled becomes a recall lever.
The turn loop runs and never becomes a metric. Or the loop closes on
Rekon's own repos and never meets a stranger's.

## PURPOSE PRESERVATION CHECK

- **Original problem:** codebases drift from their purpose faster than
  humans can notice, and agent-generated code accelerates the drift
  beyond what retrospective review can govern.
- **Classic workflow guarantee:** one closed loop, verified in source:
  declared law, static observation, runtime observation, drift detection
  at the point of change, purpose compiled to proof obligations, context
  as prevention, experience returning through the turn loop.
- **Rekon equivalent guarantee:** the same organism with a stronger
  skeleton, eight design deltas in staged delivery, a proven calibration
  loop classic never had, and measurement (recall, precision against
  classic's own suppressions, exemption counters) where classic had
  assertion.
- **What would mean we failed:** any item under "What failure looks
  like"; the deltas drifting into removing guarantees rather than
  re-carrying them; or this document going stale silently. It is enrolled
  in doc freshness; this refresh is its first content verification, and
  the `freshness.verified` field will make the next one mechanical.

## CODEBASE-INTEL ALIGNMENT

- **Classic capability addressed:** the whole system, as one loop.
- **What Rekon keeps:** every seam, with diff gates and turn attribution
  as preserved guarantees, and classic's suppression record as the
  permanent precision gauntlet.
- **What Rekon redesigns:** the eight deltas; suppression became law
  calibration; static ground truth became living ground truth under
  `overruled`.
- **What Rekon does not port:** the bespoke transports, the watcher,
  substring outcome matching, scattered thresholds, the VS Code framing;
  each retired by a named delta.
- **How this advances the migration:** the forward flow exists, the
  return flow is proven, the scoreboard moves, and the remaining distance
  to parity is decomposed into named, owned work instead of hope.
