# Model Interface Evaluation

Rekon evaluates context selection separately from model capability.

The deterministic gate covers 17 tasks across implementation, review, refactor,
debugging, placement, contract, cross-system, stale-context, documentation,
Python, and Go work. It checks expected evidence, related-file routing,
allowlisted-path precision, irrelevant paths, verification hints, constraints,
warnings, trust boundaries, trace coverage, item counts, and both compiled and
projected token budgets:

```sh
npm run eval:model-interface
```

The fixture declares required context separately from allowable context. A
packet therefore cannot improve recall by returning the whole graph. The
current corpus requires complete evidence, path, constraint, command, warning,
and check recall; at least 95 percent average path precision; at most 5 percent
average irrelevant-path rate; and no compact projection above 700 estimated
tokens.

This gate makes no model calls and does not claim change correctness. A later
API evaluation should compare work with and without Rekon context using:

- files and tokens consumed before the first edit;
- repository exploration and agent fanout;
- relevant-context precision and recall;
- pact and do-not-touch adherence;
- required-check execution;
- first-pass change correctness.

Those outcome metrics require a pinned task corpus and repeatable model runs.
They must remain separate from this deterministic compiler contract.

## Local-Agent Outcome Gate

Before spending API tokens, Rekon runs the same source-backed task in two fresh,
disposable repositories with the local Codex subscription runner. The baseline
receives the task and repository. The paired condition additionally receives
the compact Rekon projection. Both runs may inspect, edit, and execute local
checks inside their own fixture checkout:

```sh
npm run eval:model-interface:local-agent -- --dry-run
npm run eval:model-interface:local-agent
npm run eval:model-interface:adoption -- --model gpt-5.6-sol --reasoning-effort xhigh --repeats 1
```

The gate judges the resulting diff and behavior, not the prose answer. It checks
required and protected paths, repository checks, hidden behavioral tests,
command execution, and bounded repository exploration. Runs are ephemeral and
reports retain paths and scores but no source, prompts, diffs, raw commands, or
free-form model text.

The compact projection tells the agent to read selected refs and stop searching
for analogues when those refs cover the change boundary. Expansion is reserved
for a named unresolved dependency. This is a routing prior, not an access
restriction: source remains authoritative. The instruction is part of the
digest-bound interface judgment so wording changes cannot inherit an earlier
approval silently.

Source-backed cases may also freeze a scored semantic neighbor when the task
requires a repository precedent that is not graph-adjacent. This tests the
existing supporting-context boundary without a provider call; the neighbor is
labelled as inference and remains source to inspect, not proof. A precedent is
kept only when paired outcome evidence shows value; the current subscription
renewal case removed one that increased search without improving correctness.

The current credential-free outcome corpus has six source-backed tasks and
three paired repeats per task. It covers implementation, debugging, refactor,
placement, cross-system coordination, and policy preservation. All 36 isolated
changes passed hidden behavior, scope, and repository checks. Under the current
evaluator, all 18 pairs are candidates: average explored paths fell from 25.28
to 8.28 and average commands from 3.44 to 2.28. This is evidence of narrower
exploration, not a token-savings claim: those historical runs did not retain
usage counts.

The expanded corpus exposed an important contract requirement. A cross-system
task remained unstable when its pact said only to preserve authorization
behavior. The agent implemented the right side-effect order but invented a new
domain error. Naming the existing `account-not-found` and `not-authorized`
errors in `CapabilityContract` removed that failure across three post-fix
pairs. Literal repository invariants must remain literal in model context;
vague summaries are not an adequate substitute.

Exploration accounting includes paths exposed by broad discovery commands as
well as files inspected or searched. Rekon reports also distinguish selected
refs the agent used from discovery, inspection, and search outside the packet.
This prevents command choice (`find` versus `rg`, for example) from changing the
meaning of the comparison.

New local runs retain aggregate counts from Codex `turn.completed` events and a
separate estimate of visible prompt, tool, MCP, action, and final-response
payloads. Reports keep counts only; source, prompts, diffs, commands, MCP
payloads, and free-form model text remain ephemeral. Subscription-reported
usage includes system and cached context that the visible estimate cannot see,
so the two measurements remain separate. Neither count can override a behavior
or scope regression.
Use explicit `--model` and `--reasoning-effort` values for a calibration run;
the harness ignores user configuration so the recorded profile is repeatable.

The first pinned Sol/xhigh usage canary ran one pair across all six task classes.
Both conditions passed 6/6 behavior and scope checks. Rekon reduced average
explored paths from 34.33 to 5.17 and commands from 6.17 to 4.17, but reported
tokens fell only 1.4% and the visible estimate increased 1.2%. Selective repeats
confirmed real case-level variance: the policy task repeatedly saved about 36%,
the implementation task repeatedly added overhead, and the cross-system task
twice made an unnecessary refinement that materially increased reported usage.
This accepts the exploration gain but not a general token-savings claim. The
source-free aggregate is
`tests/evals/model-interface-adoption/sol-token-calibration.json`.

Instruction `1.7.3` narrows the coding-agent MCP surface to
`context_for_task` and `resolve_source_target`, requires an exact identifier
from inspected source for the latter, and asks agents to batch known file
reads. Legacy tools remain callable but are not advertised. In the affected
cross-system case, Sol preserved full quality while using only
`context_for_task`, made one batched source read, and reduced reported usage
from 218,250 to 176,333 tokens and the visible estimate from 6,071 to 4,607
relative to the original managed failure. A separate runtime-binding run still
used one required source-target resolution and passed all checks. These are
targeted, source-free validations, not fresh baseline pairs; general token
savings remain unproven. The retained record is
`tests/evals/model-interface-adoption/sol-interface-optimization.json`.

A fresh Sol/xhigh canary then ran the two-tool interface across all three
mixed-layout tasks. Rekon passed 3/3 changes versus 1/3 baseline, reduced
average explored paths from 17 to 5.67, and reduced commands from 8 to 5.67.
It did not reduce tokens: reported usage was 26.5% higher and the visible
estimate was 54.5% higher. In the one pair where both conditions passed at
full quality, Rekon still used 19.6% more reported and 23.3% more visible
tokens while halving explored paths. The two failed baselines make the
aggregate token comparison unsuitable as a pure efficiency measure, but the
equal-correctness pair confirms fixed context overhead on a bounded task. The
source-free canary is
`tests/evals/model-interface-mixed/sol-token-calibration.json`; it accepts the
correctness and exploration result, rejects a token-savings claim, and remains
non-promotable after only one repeat per task.

## Managed-Interface Adoption Gate

Direct context injection proves the packet can help. The managed-interface gate
tests whether an agent will obtain that packet through the interface users
actually install. Baseline and Rekon conditions receive the same task prompt;
only the Rekon condition receives refreshed artifacts, the managed `AGENTS.md`
block, and a configured local MCP server:

```sh
npm run eval:model-interface:adoption -- --dry-run
npm run eval:model-interface:adoption
```

Adoption requires a successful `context_for_task` call, or successful CLI
equivalent, before broad repository exploration and before editing, plus full
use of the returned `readFirst` set. Incoming `boundaryPaths` are compatibility
context and are not mandatory reads unless a dependency remains unresolved.
The coding-agent tool list contains task context and exact source-target
resolution. Orientation, placement, and preflight remain operator-facing CLI
workflows and unadvertised compatibility calls, not mandatory agent ceremony.

Instruction `1.6.0` introduced the distinction between direct reads and graph
resolution. An exact
repository path named by source should be read directly. Refinement is reserved
for a task-required symbolic implementation, consumer, producer, contract,
test suite, or other supported relationship whose target path is unknown. A
correct refinement occurs after full `readFirst` use, names the relationship
and closest anchor, and consumes the returned `readNext` delta.

The finalized `1.6.0` negative gate passed all 12 existing managed tasks with
full `readFirst` use and zero refinement calls, which is expected because those
packets were already complete. Average explored paths were 5.5 on the six-case
corpus, 5.67 on the mixed corpus, and 6.33 on the independent corpus.

The symbolic-routing corpus covers implementation, consumer, and producer
targets that ordinary one-hop expansion does not reach:

```sh
npm run eval:model-interface:refinement:adoption -- --dry-run
npm run eval:model-interface:refinement:adoption
```

The first version intentionally withheld each target from the initial packet.
Managed agents passed 9/9 changes versus 3/9 controls and avoided broad search,
but made 17 refinement calls. The provider harness confirmed that the route was
correct and the ceremony was expensive: managed turns doubled, GPT-5.6 Luna
used 30% more tokens than baseline, and Claude Sonnet 5 used 114% more.

The compiler now proactively admits at most two task-signaled deterministic
routes through shared capabilities or typed contract producer/consumer edges.
All three targets enter `readFirst` with complete recall, no avoidable paths,
and no refinement calls. Refinement remains available when the initial packet
cannot determine the target.

Instruction `1.7.1` makes relationship coverage explicit: a contract,
consumer, producer, implementation, or test route already represented in
`readFirst` or `boundaryPaths` is resolved unless inspected source names a
different absent target. The current source-backed adoption gate passed all
three symbolic tasks with hidden behavior checks, full initial-context use,
and zero refinement calls. Its source-free record is
`proactive-adoption-calibration.json` and is digest-bound to the clarified
fixture.

A separate positive-refinement corpus covers a runtime-binding case: inspected
source exposes a task-required runtime binding, but the current compact packet
does not select its concrete implementation:

```sh
npm run eval:model-interface:refinement-positive:adoption -- --dry-run
npm run eval:model-interface:refinement-positive:adoption -- --condition rekon
```

The checkout packet contains the service, repository, publisher, event type,
and regression test, but not the runtime serializer. The accepted managed run
read the complete initial packet, requested one `implementation` refinement
anchored at the publisher, used the returned serializer path, changed only the
three required files, and passed public and hidden behavior checks. It made no
broad source search. Instruction `1.7.3` exposes that fallback as
`resolve_source_target` and requires the exact identifier found in inspected
source before repository-wide or symbol text search. The digest-bound
source-free record is
`tests/evals/model-interface-refinement-positive/adoption-calibration.json`.

The provider-backed structured simulation did not reproduce that adoption.
Across three repeats each, GPT-5.6 Luna and Claude Sonnet 5 read the complete
five-file packet but made zero refinement calls and omitted the deployed
serializer from their plans. Luna used 7% fewer tokens than baseline while
reducing plan quality; Sonnet used 33% more tokens while also reducing plan
quality. All six pairs were discarded. The source-free aggregate is
`tests/evals/model-interface-refinement-positive/token-calibration.json`.
This is a scoped negative result for low-effort models in the structured tool
simulation, not a general rejection of refinement. It changed both the model
and the interaction surface relative to the successful managed Sol run, so it
does not resolve native-agent adoption or token economics. Proactive routing is
still preferable when the task and current evidence identify a target before
source inspection; bounded refinement remains appropriate when they do not.

Across three provider-backed repeats per case, proactive Luna context reduced
inspected files by 34%, turns by 28%, total tokens by 28%, and estimated cost by
26% versus baseline. Sonnet inspected the same files in the same turns with 9%
more tokens and 7% more estimated cost. Relative to the earlier managed
round-trip condition, proactive routing roughly halved tokens for both models.
The automated scorer passed 15/18 managed plans. A separate digest-bound judge
record accepts the three remaining plans as semantically correct while leaving
their missing literal-ID credit visible in the automated result.

The historical adoption and round-trip token aggregates remain in
`tests/evals/model-interface-refinement/adoption-calibration.json` and
`token-calibration.json`. The proactive provider evidence is in
`proactive-token-calibration.json`, with its bounded judge record in
`proactive-token-judgment.json`. Those provider records retain the earlier
fixture digest; they remain evidence about routing cost but are not presented
as an execution of the clarified report pact. A new provider run is deferred
until the local context policy is otherwise stable.

## Mixed-Layout Outcome Gate

A separate 31-file fixture exercises TypeScript and Python services without
changing the accepted six-case repository underneath its historical results:

```sh
npm run eval:model-interface:mixed -- --dry-run
npm run eval:model-interface:mixed
npm run eval:model-interface:mixed:adoption -- --dry-run
npm run eval:model-interface:mixed:adoption
```

Its three tasks cover Python data redaction, side-effect suppression, and a
cross-language event contract. Public fixture checks pass before each task;
hidden behavior oracles and exact edit scopes remain independent of the
delivered context. Direct and managed dry runs require complete required-path
recall and no avoidable refs. Managed dry runs exclude retrieval results because
MCP deliberately compiles from deterministic artifacts only.

The accepted direct comparison uses three repeats per task. Rekon passed 9/9
runs versus 5/9 baseline runs, with seven candidate pairs, two no-advantage
pairs, and no discards. Average explored paths fell from 15.89 to 6.11 and
commands from 3.89 to 3.33. The cross-language task was the strongest test:
Rekon updated the TypeScript contract, Python consumer, and both regression
tests in 3/3 runs; baseline changed only the named TypeScript contract and
failed the hidden consumer oracle in 3/3 runs.

The first managed run exposed a pact defect: behavior passed, but required
regression-test edits existed only in the hidden oracle. After regression
coverage became literal `CapabilityContract` guidance, all three managed runs
adopted MCP before exploration and passed behavior, scope, and verification.
The evaluator excludes Python bytecode caches from scope. Generated runtime
files are not source edits, and hidden quality criteria are not a substitute
for declared repository law.

## Independent-Layout Outcome Gate

A second 35-file fixture changes the repository shape and task mechanics. It
covers configuration-only rollout with public-adapter preservation, pathless
extension placement and registration, and optional schema evolution across a
TypeScript producer and Python consumer:

```sh
npm run eval:model-interface:independent -- --dry-run
npm run eval:model-interface:independent
npm run eval:model-interface:independent:adoption -- --dry-run
```

Across three paired repeats per task, Rekon passed 9/9 changes versus 3/9
baseline changes. All nine pairs were candidates. Average explored paths fell
from 26.78 to 6.56 and commands from 4.11 to 2.78. Baseline completed the
configuration edit but missed the registered plugin shape and cross-language
schema consumers in all six corresponding runs.

The first managed schema run exposed a measurement and instruction gap. MCP
returned the complete six-file packet, but one agent called the tool and edited
only the named schema. Instruction `1.4.0` now requires every `readFirst` path
to be read and treats pacts and checks as acceptance criteria. The adoption
scorer separately verifies that use. Final managed calibration passed 3/3 with
full `readFirst` recall; the focused schema rerun also passed 3/3. One successful
schema run still searched broadly, so per-run exploration variance remains
visible rather than being tuned away.

## Iterative Evaluation

### Repository-Law Context Gate

System semantics and end-to-end handoffs have a separate source-free gate:

```sh
npm run eval:repository-law-context
npm run eval:repository-law-context:judge
npm run eval:model-interface:contracts:adoption -- --dry-run
```

The corpus covers phrase-overfit prevention in a compositional intelligence
system, request metadata carried across a multi-system checkout flow, and an
unrelated documentation task. Adopted law raised average required-path recall
from 72.22% to 100% at 100% precision. Both implementation cases retained all
literal constraints and checks; the unrelated task received no contract law.
The largest compact delivery was 282 estimated tokens.

The current deterministic judgment is bound to each selection digest. A pinned
Sol/xhigh managed run then completed three paired repeats per implementation
task. Rekon passed 6/6 changes versus 4/6 baseline changes. The baseline added
the prohibited whole-phrase vocabulary alias in two of three compositional
runs; Rekon preserved atomic composition and passed all hidden checks. Both
conditions passed the checkout handoff in all three repeats.

All six Rekon runs requested MCP context before exploration and editing, read
the complete selected packet, and made no refinement call. Average explored
paths fell from 17.0 to 7.17. That gain carried overhead: average commands rose
from 4.5 to 4.83, subscription-reported tokens rose 36.3 percent, and the
visible estimate rose 12.2 percent. The accepted classification is
`correctness-and-exploration-gain-token-overhead`, not token savings or general
model uplift. The digest-bound, source-free record is
`tests/evals/model-interface-contracts/sol-managed-calibration.json`.

An opt-in tiered-delivery probe then made only the explicit task path and test
mandatory while leaving the other four selected paths as conditional routes.
Four Sol/xhigh Rekon runs passed behavior, scope, checks, and MCP adoption, but
the model inspected all 16 offered supporting routes across both instruction
variants. The full delivery remains the default: labels alone did not reduce
source reads when the packet lacked enough route-role detail to distinguish a
necessary handoff from compatibility context. The source-free negative record
is `tests/evals/model-interface-contracts/tiered-delivery-calibration.json`.

The compiler now assigns deterministic route roles and task-necessity reasons.
An opt-in `role-aware` adapter keeps required task targets, implementation,
handoff, repository-law, and verification routes in the mandatory set while
leaving conditional dependencies and compatibility callers available with the
condition that would justify reading them. Across the six live-harness cases,
the source-free deterministic gate retained all 30 selected paths and reduced
the initial mandatory set from 25 to 15 paths. Required-context recall,
allowlisted precision, constraint recall, and command recall remained 100% at
the selection layer.

That result measures compiler output only. It used no model runs and therefore
does not establish fewer source reads, lower token use, or preserved change
quality. The `full` policy remains the production default. The digest-bound
deterministic record is
`tests/evals/model-interface-live/role-aware-delivery-gate.json`.

The first independent comparison used the configuration-rollout task from the
35-file independent layout. Three Sol/xhigh runs per policy all passed exact
scope, required checks, the hidden oracle, and managed MCP adoption.
`role-aware` reduced the mandatory packet from five paths to three but Sol read
both conditional routes in every run. Exploration remained six paths.
Compared with `full`, role-aware delivery used 17.8 percent more
subscription-reported tokens and 7.3 percent more visible-estimate tokens.

The two conditional routes are required by this task's oracle, so reading them
is correct conditional behavior rather than an instruction failure. The result
does not show that role-aware delivery can skip a truly optional route, and it
does not support promotion or token-savings claims. The source-free record is
`tests/evals/model-interface-independent/role-aware-delivery-calibration.json`.

A follow-up isolated an additive logging helper with two oracle-confirmed
optional routes: its unchanged sanitizer dependency and an existing caller.
Three Sol/xhigh runs per policy again passed exact scope, public checks, hidden
behavior, and managed MCP adoption. `role-aware` used both optional routes in
all three runs; `full` left one optional caller unused across its three runs.
Exploration remained five paths. Relative to `full`, role-aware delivery used
14.1 percent more subscription-reported tokens, 3.2 percent more
visible-estimate tokens, and 6.7 percent more commands.

This result rejects the hypothesis that conditional labels alone cause Sol to
skip optional source routes. It does not justify role-aware promotion or lazy
route materialization. The digest-bound source-free record is
`tests/evals/model-interface-optional-route/role-aware-calibration.json`.

The next experiment removed both optional paths from delivery and replaced
them with pathless dependency and compatibility summaries. The first variant
stated when another read might be needed. The second made the routing decision
explicit with `condition-not-triggered` and `skip-unless-triggered`, and told
the agent that merely seeing an import was not a trigger. Both variants passed
3/3 exact-scope changes, checks, hidden behavior, and MCP adoption.

Neither variant reduced source use. Sol inspected all six optional-route
opportunities in each three-run set after the required logger and test exposed
their imports. Exploration stayed at five paths. Against `full`, the second
variant used 1.1 percent fewer reported tokens but 28.3 percent more non-cached
input, 6.2 percent more visible-estimate tokens, and 13.3 percent more commands.
The conflicting token signals and worse route use reject an efficiency claim.
Path omission alone is not a useful control when required source reveals the
same relationship. The digest-bound record is
`tests/evals/model-interface-optional-route/summary-aware-calibration.json`.

A follow-up supplied exact fresh `CapabilityContract` assertions for the same
dependency and caller: signatures, redaction behavior, compatibility, ordering,
and checks. Three additional Sol/xhigh runs passed every quality and adoption
gate but still inspected all six optional-route opportunities. Exploration was
unchanged, commands rose 47%, and non-cached input rose 29% versus the retained
generic-summary control. The source-free record is
`tests/evals/model-interface-contract-backed-route/calibration.json`.

A second fixture hid the dependency implementation behind a package import
alias. Three paired runs passed in both conditions. Rekon reduced average
explored paths from 6.67 to 4 and commands from 6.67 to 4.67 by avoiding package
and test-runner discovery, but both conditions still opened the implementation
in every run. Reported tokens rose 25% and the visible estimate rose 63%. This
accepts a bounded navigation gain while rejecting source replacement, token
savings, and policy promotion. The source-free record is
`tests/evals/model-interface-symbol-contract-route/calibration.json`.

The next probe removed the implementation descriptions as well as the optional
path and route summary. Its `navigation-only` packet contained only two
required paths, three normative rules, and the required check. At 129 estimated
tokens it was smaller than both `full` (140) and `summary-aware` (352) on the
same fixture. Three paired Sol/xhigh runs again passed in both conditions and
Rekon reduced average repository exposure from 6.33 to 4 paths.

That smaller payload did not reduce work or usage. Sol followed the import and
inspected the omitted implementation in all three Rekon runs, compared with one
baseline run. Commands rose 7%, reported tokens rose 31%, non-cached input rose
36%, and the visible estimate rose 43%. The result isolates a routing benefit
from a source-replacement claim: Rekon can prevent unrelated package and test
runner discovery, but a model still verifies implementation details exposed by
required source. `navigation-only` remains an evaluation policy. The bound
record is `tests/evals/model-interface-navigation-packet/calibration.json`.

During interface development, deterministic oracle checks are paired with a
maintainer judgment of relevance, omissions, pact quality, and avoidable
context volume. This avoids spending provider tokens while the compiler and
fixtures are still changing. The reviewer records the judgment and changes one
context-policy variable at a time:

```sh
npm run eval:model-interface:judge
```

Each judgment is bound to the selected context by a digest. A compiler change
that alters selection invalidates the prior judgment until the new packet is
reviewed. Reports and the append-only local ledger retain refs, metrics,
decisions, and notes, but no repository source bodies or prompts. The default
ledger is `.rekon-dev/evals/model-interface-agent-ledger.jsonl`.

The full compiled packet remains the audit surface. `projectModelContext()`
retains explainable routing, trust, freshness, constraints, checks, warnings,
and selection diagnostics. `projectModelContextDelivery()` then emits only the
read order, compatibility boundaries when actionable, supporting inference,
literal constraints, checks, and warnings. MCP, direct model evaluation, and
the CLI `--model-context` fallback use that same delivery adapter rather than
maintaining separate selection policy.

High-degree graph fixtures verify that the four-claim per-path neighborhood cap
retains task-specific paths, tests, and outgoing dependencies before incidental
callers. The 17-case review currently tolerates one avoidable direct neighbor
in each of two packets; those refs remain visible in precision metrics and the
judgment ledger. This is a deterministic routing contract, not a substitute
for later task-level change-correctness evaluation.

Provider-backed comparisons are a later validation step. They are not required
to promote a compiler correctness fix, and they should not run by default.

### Optional Provider Harness

The live harness compares the same model and task with and without Rekon
context. The model requests allowlisted fixture files over bounded turns, then
returns a structured context decision and change plan:

```sh
npm run eval:model-interface:live -- --dry-run
OPENAI_API_KEY=... npm run eval:model-interface:live -- --models gpt-5.6-luna@low
```

When explicitly enabled, each experiment freezes the task oracle and changes one context-policy
variable. Pact violations are hard failures; correctness is evaluated before
file count, turns, tokens, latency, and cost. Reports retain paths, metrics, and
structured decisions but not source bodies or prompts. A result is only
promotion-eligible after at least three repeatable paired runs.

### Token Calibration

The accepted API calibration uses `gpt-5.6-luna` at low reasoning across
six task classes and three paired repeats per class. Repository guidance was
loaded for both conditions, matching normal agent startup. Rekon context used
an explicit `readFirst` order and separated compatibility-only
`boundaryPaths`.

The first run established correctness but reduced total tokens by only four
percent because verbose routing and provenance metadata were repeated in the
model payload. The full audit projection was retained and a separate delivery
adapter reduced the deterministic 17-case projection from 400 to 112 estimated
tokens on average, with the maximum falling from 697 to 162.

After that compression, Rekon produced full oracle-quality plans in 18/18 runs
versus 5/18 baseline runs. Average repository inspection fell from 8.11 to 4.33
files and turns fell from 3.28 to 2.33. Total tokens fell from 94,656 to 63,500;
input tokens fell from 79,584 to 52,422; and estimated standard API cost fell
from $0.167965 to $0.098963.

Seventeen pairs met the strict candidate rule. One cross-system repeat was
`no-advantage`: it remained fully correct but inspected one compatibility
caller and used an additional turn. The other two repeats of that task were
candidates. The result is accepted as evidence of aggregate context efficiency,
but the strict all-pairs promotion flag remains false. The source-free aggregate
is checked in at
`tests/evals/model-interface-live/token-calibration.json`; raw reports stay
under ignored `.rekon-dev/` storage.

This loop adapts the fixed-evaluator, bounded-run, keep-or-discard method used
by [autoresearch](https://github.com/karpathy/autoresearch) to repository
context. Rekon uses isolated fixtures and an append-only local ledger rather
than resetting a maintainer's working tree.
