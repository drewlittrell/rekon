# Semantic Debt Model Evaluation

Rekon evaluates semantic-debt models against a checked-in labeled corpus and
can run the same evaluator against an external private corpus. The
goal is to select the least expensive configuration that preserves useful debt
recall while routing architecture, dead-code, lint, and stub concerns to their
own semantic-claim categories.

## Method

The corpus contains concrete debt examples, clean files, and routing cases for
architecture, dead code, lint, and generated code. Each model receives the same
`debt-judge-v3` prompt and JSON schema. Results pass through Rekon's production
`coerceDebtConcerns()` filter before scoring.
Only included `tech_debt` concerns count as a positive debt prediction; all
preserved concern categories remain visible in the evaluation record.

The report records:

- precision, recall, F1, accuracy, and parse success;
- repeat stability by case;
- p50 and p95 request latency;
- input, cached input, cache-write, output, and reasoning tokens;
- current and steady-state token cost;
- the non-dominated cost/quality frontier.

Models must complete at least 99% of requests to qualify for the frontier.

Production handling is staged:

1. `debt-eligibility-v3` excludes tests, documentation, declarations,
   generated files, structured data outputs, prompt-truncated files, binary or
   empty content, and hidden operational inputs before a provider call.
   Unchanged judgments remain reusable across eligibility revisions when the
   provider, model, effort, and prompt contract are unchanged and the file is
   still eligible.
2. `debt-judge-v3` records model judgment with provider, model, effort, prompt
   version, coercion version, file digest, reuse state, and fallback warnings.
   Source is line numbered for exact evidence attribution, and
   missing-validation claims must show the untrusted boundary in the judged
   file. Coercion versioning invalidates reused entries when deterministic
   filtering or pattern tagging changes without changing the model prompt.
3. Policy may corroborate a claim with an exact deterministic signal family.
   Corroboration changes evidence basis to mixed; it does not create a finding.
4. The kernel promotion rule separately requires applicable law, reproducible
   defect evidence, or operator confirmation.

Pricing is versioned in the evaluator. Claude Sonnet 5 reports both its current
introductory price and the price effective after August 31, 2026. Reasoning
tokens are included in billed output and are not counted twice.

## Run

Build and inspect the request matrix without calling a provider:

```sh
npm run eval:semantic-debt -- --dry-run --repeats 3
```

Run all configured models:

```sh
OPENAI_API_KEY=... ANTHROPIC_API_KEY=... \
  npm run eval:semantic-debt -- --repeats 3
```

Use `--list-models` to see configuration IDs and `--models <id,id>` to run a
subset. The default cost ceiling is $20 and can be changed with
`--max-cost-usd`. Reports are written under ignored `.rekon-dev/evals/`.

API keys remain environment-only. Evaluation output is local evidence, not a
generated product artifact or canonical repository truth.

Run a private corpus with the same `corpus.json` shape by passing `--corpus
<directory>` or setting `REKON_SEMANTIC_DEBT_EVAL_CORPUS`. Case paths are
contained to the corpus root, and reports record only `source: "external"`,
the corpus version, and counts. The local corpus path is not written to output.

## Production profiles

The three-repeat `debt-judge-v3` evaluation selected two OpenAI Responses
profiles:

- Default: `gpt-5.6-luna` with `low` effort. It had the strongest qualifying
  quality result and stable predictions across all repeated cases.
- Economy: `gpt-5.4-nano` with `none` effort. It retained materially better
  debt recall than the prior small-model baseline at lower cost than Luna.

Across 54 attempts per profile, Luna reached 1.00 precision, 0.875 recall, and
0.933 F1 with a 1.00 stable-case rate. Nano reached 1.00 precision, 0.75 recall,
and 0.857 F1 with a 1.00 stable-case rate. `gpt-5.4-mini` was dominated by both.
A one-repeat cross-provider pass found no quality gain from Claude Haiku 4.5 or
Claude Sonnet 5 at their higher measured cost, so neither replaced the default.

`rekon scan` uses the default profile for semantic-debt judgment. Select the
economy profile explicitly:

```sh
rekon scan --semantic-debt-model gpt-5.4-nano --semantic-debt-effort none
```

The overrides are also available as `REKON_SEMANTIC_DEBT_MODEL` and
`REKON_SEMANTIC_DEBT_EFFORT`. Model and effort are recorded in
`SemanticDebtJudgmentReport.policy` and participate in report reuse. The
semantic-debt-specific options do not alter other LLM callers.

For source-grounded calibration, repeat `--semantic-debt-file-path` to judge
specific repository files without spending the file budget on lexicographically
earlier candidates:

```sh
rekon scan \
  --semantic-files off \
  --semantic-debt required \
  --semantic-debt-file-limit 2 \
  --semantic-debt-file-path src/service.ts \
  --semantic-debt-file-path src/adapter.ts
```

Targeted paths do not bypass repository containment, semantic-debt eligibility,
digest-based reuse, or artifact validation.
