// WO-14 sub-order F: the anti_pattern / pattern_violation policy pack.
//
// The deterministic sub-rules re-expressed as policy rules reading the
// ported grammar content: each antiPattern row carries its declared
// detection regexes (details.detectionRules) and its correction pair
// (dont / do), which rides in the finding payload so remediation guidance
// ships inside the finding. Detection runs over `content_signal` evidence
// facts the provider extracts (the provider observes signal presence;
// THIS evaluator applies the law tier-aware: base hygiene everywhere,
// archetype-bound rows only under ratification). Rows without regex
// signals (prose detection rules, detectable:false) are the LLM-judged
// remainder and stay out; ambiguousSuffix is already served by the
// placement axis and is skipped here to avoid double-firing. Citation:
// detection-design-decisions.md §B anti_pattern row + §A pattern_violation
// row.

import type { Finding } from "@rekon/kernel-findings";
import { assignGrammarLayer, type EffectiveArchitectureGrammar } from "@rekon/capability-ontology";

import { isNonProductionPath } from "./grammar-divergence.js";
import { globLikeToRegExp } from "./dead-code.js";

/** Service-scoped signals fire only on service-layer files (classic's evaluator scope). */
const SIGNAL_LAYER: Readonly<Record<string, string>> = Object.freeze({
  businessLogicInService: "service",
  directDatabaseInService: "service",
});

export const ANTI_PATTERN_RULE_ID = "grammar.antiPattern";

const ANTI_PATTERN_CITATION = "docs/strategy/detection-design-decisions.md §B anti_pattern / §A pattern_violation rows (WO-14 sub-order F)";

/** Rows served by the placement axis already - never double-fire. */
const SERVED_ELSEWHERE = new Set(["ambiguousSuffix"]);

type FactLike = {
  kind: string;
  subject: string;
  value: Record<string, unknown>;
};

function packOf(grammar: EffectiveArchitectureGrammar, id: string): string {
  const note = grammar.notes.find((n) => n.section === "antiPatterns" && n.id === id);

  return note?.packId ?? "grammar-base";
}

export function evaluateAntiPatterns(input: {
  facts: ReadonlyArray<FactLike>;
  grammar: EffectiveArchitectureGrammar;
}): Finding[] {
  const grammar = input.grammar;
  const eligible = new Set(grammar.findingsEligiblePackIds ?? []);
  const findings: Finding[] = [];

  // Signal facts grouped by file + signal id.
  const signals = new Map<string, Set<string>>();

  for (const fact of input.facts) {
    if (fact.kind !== "content_signal") {
      continue;
    }

    const signal = typeof fact.value.signal === "string" ? fact.value.signal : "";
    const set = signals.get(signal) ?? new Set<string>();

    set.add(fact.subject);
    signals.set(signal, set);
  }

  for (const anti of grammar.antiPatterns.values()) {
    if (SERVED_ELSEWHERE.has(anti.id)) {
      continue;
    }

    const packId = packOf(grammar, anti.id);
    const tier = packId === "grammar-base" ? "base" : "archetype";

    // Tier-aware law: base hygiene applies everywhere; archetype-bound
    // anti-patterns fire only when their pack is findings-eligible.
    if (tier === "archetype" && !eligible.has(packId)) {
      continue;
    }

    const files = signals.get(anti.id);

    if (!files) {
      continue;
    }

    const details = (anti as { details?: { exceptions?: Array<{ path?: string }> } }).details;
    // WO-17: exceptions are full globs (row-declared or operator-overlay
    // supersedes). A bare path is an exact-or-prefix match; anything with
    // a wildcard goes through the glob converter.
    const exceptionMatchers = (details?.exceptions ?? [])
      .map((e) => (typeof e.path === "string" ? e.path : ""))
      .filter(Boolean)
      .map((pattern) => {
        if (pattern.includes("*")) {
          const re = globLikeToRegExp(pattern);

          return (file: string) => re.test(file);
        }

        return (file: string) => file === pattern || file.startsWith(`${pattern}/`);
      });

    for (const file of [...files].sort()) {
      if (isNonProductionPath(file)) {
        continue;
      }

      const requiredLayer = SIGNAL_LAYER[anti.id];

      if (requiredLayer && assignGrammarLayer(grammar, file) !== requiredLayer) {
        continue;
      }

      // WO-17 Part 4: conditionalHooks is scoped to where hooks can exist
      // (ui layer, .tsx files, hook-role files). Fires on .types.ts,
      // config, repositories were the FP class.
      if (anti.id === "conditionalHooks") {
        const base = file.split("/").at(-1) ?? "";
        const hookish = file.endsWith(".tsx")
          || assignGrammarLayer(grammar, file) === "ui"
          || /^use[A-Z]/.test(base)
          || /(^|\/)hooks?\//.test(file);

        if (!hookish) {
          continue;
        }
      }

      if (exceptionMatchers.some((matches) => matches(file))) {
        // The grammar row's own declared exception (e.g. tools/** for
        // console logging) - law-declared, not score-motivated.
        continue;
      }

      findings.push({
        id: `${ANTI_PATTERN_RULE_ID}:${file}:${anti.id}`,
        type: "anti_pattern",
        severity: "medium",
        title: `Anti-pattern "${anti.name}" in ${file}`,
        description: `${file} matches the declared detection signal for "${anti.id}". ${anti.reason.split("\n")[0]}`,
        subjects: [file],
        files: [file],
        ruleId: ANTI_PATTERN_RULE_ID,
        suggestedAction: anti.do,
        evidence: [],
        payload: {
          antiPatternId: anti.id,
          law: { axis: "anti_pattern", packId, tier, declaration: anti.source },
          // Classic's correction pair rides along: remediation guidance
          // ships inside the finding.
          correction: { dont: anti.dont, do: anti.do },
          citation: ANTI_PATTERN_CITATION,
        },
      } as Finding);
    }
  }

  return findings.sort((a, b) => a.id.localeCompare(b.id));
}
