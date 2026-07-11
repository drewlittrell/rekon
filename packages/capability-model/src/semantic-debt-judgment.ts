import type { SemanticFileUnderstandingSeverity } from "@rekon/kernel-repo-model";

export const SEMANTIC_DEBT_PROMPT_VERSION = "debt-judge-v1";

export const SEMANTIC_DEBT_JUDGMENT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    concerns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: ["architecture", "tech_debt", "dead_code", "lint", "stub"],
          },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          description: { type: "string" },
          line: { type: ["integer", "null"] },
        },
        required: ["type", "severity", "description", "line"],
      },
    },
  },
  required: ["concerns"],
};

export type SemanticDebtAdapterConcern = {
  type?: string;
  severity?: string;
  description?: string;
  line?: number;
};

export type SemanticDebtAdapterResult = {
  concerns?: SemanticDebtAdapterConcern[];
  provider?: string;
  model?: string;
  warnings?: string[];
};

export type SemanticDebtJudgmentAdapter = (input: {
  filePath: string;
  fileText: string;
  language?: string;
}) => Promise<SemanticDebtAdapterResult>;

export type SemanticDebtConcernCoerced = {
  severity: SemanticFileUnderstandingSeverity;
  description: string;
  pattern?: string;
  included: boolean;
};

export function buildSemanticDebtJudgmentPrompt(input: {
  filePath: string;
  fileText: string;
  language?: string;
}): string {
  const languageLine = input.language ? `Language: ${input.language}` : "";
  return [
    "Review this source file for repository intelligence concerns.",
    "",
    "Concern types:",
    "- architecture: module boundary, layering, ownership, or dependency direction problems.",
    "- tech_debt: implementation debt that should be scheduled or corrected.",
    "- dead_code: unused exports, unreachable code, or obsolete implementation surface.",
    "- lint: localized style or correctness issues that a static check could enforce.",
    "- stub: placeholder implementation, incomplete scaffolding, or fake behavior.",
    "",
    "Severity rubric:",
    "- high: likely to cause defects, security exposure, data corruption, or repeated engineering risk.",
    "- medium: meaningful maintainability, reliability, or type-safety debt with clear evidence.",
    "- low: small but concrete cleanup with direct evidence in the file.",
    "",
    "Common tech_debt patterns:",
    "- Unused imports, unused exports, unreachable branches, or stale code paths.",
    '- Type-safety gaps such as "as any", non-null assertions, weak unknown handling, or string values where a union belongs.',
    "- Missing error handling, catch blocks that hide failures, or fallback behavior that masks broken states.",
    "- Hardcoded values such as tokens, keys, origins, URLs, feature names, or configuration constants.",
    "- Duplication, copy/paste branching, or repeated logic that should be centralized.",
    "- Fallback logic that silently chooses defaults without evidence.",
    "- @deprecated fields or deprecated API usage.",
    "",
    "Rules:",
    "- Judge only what is visible in this file.",
    "- Do not infer runtime behavior, hidden call sites, or external configuration.",
    "- Do not report concerns for type-only files, generated files, factory wiring, or simple dependency composition unless there is concrete debt in the file.",
    "- Keep architecture concerns labeled architecture, dead-code concerns labeled dead_code, lint concerns labeled lint, and placeholder concerns labeled stub.",
    "- Use tech_debt only for concrete debt in the file, not for speculative redesign ideas.",
    "- Return no concerns when the file is clean.",
    "- Return ONLY one JSON object. No markdown fences, prose, or comments.",
    "",
    'Output contract: { "concerns": [ { "type": "architecture|tech_debt|dead_code|lint|stub", "severity": "low|medium|high", "description": string, "line": number } ] }',
    'When clean: { "concerns": [] }',
    "",
    languageLine,
    `File path: ${input.filePath}`,
    "File contents:",
    input.fileText,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

export function categorizeDebtPattern(description: string): string | null {
  const text = description.toLowerCase();
  if (text.includes("hardcoded") || text.includes("hard-coded")) return "hardcoded_values";
  if (text.includes("type assertion") || text.includes("as any") || text.includes(" any ")) return "type_assertion";
  if (text.includes("error handling") || text.includes("catch") || text.includes("try/catch")) return "error_handling";
  if (text.includes("magic number") || text.includes("magic string")) return "magic_values";
  if (text.includes("inline css") || text.includes("inline style")) return "inline_styles";
  if (text.includes("deprecated")) return "deprecated";
  if (text.includes("unknown type") || text.includes("weak type")) return "weak_types";
  if (text.includes("fallback")) return "fallback_logic";
  if (text.includes("comment") && (text.includes("todo") || text.includes("fixme") || text.includes("hack"))) {
    return "todo_comments";
  }
  if (text.includes("duplication") || text.includes("duplicate")) return "duplication";
  return null;
}

export function hasStrongDebtSignal(description: string): boolean {
  const text = description.toLowerCase();
  if (
    text.includes("must not") ||
    text.includes("never ") ||
    text.includes("deprecated") ||
    text.includes("unsafe") ||
    text.includes("security") ||
    text.includes("todo") ||
    text.includes("fixme") ||
    text.includes("hack") ||
    text.includes("bypass") ||
    text.includes("violation")
  ) {
    return true;
  }

  const hardcoded = text.includes("hardcoded") || text.includes("hard-coded");
  if (!hardcoded) return false;
  return ["api", "url", "origin", "token", "key", "secret", "credential", "cors"].some((word) =>
    text.includes(word),
  );
}

export function hasSpeculativeDebtSignal(description: string): boolean {
  const text = description.toLowerCase();
  return (
    text.includes("consider ") ||
    text.includes("could ") ||
    text.includes("may ") ||
    text.includes("might ") ||
    text.includes("verify ") ||
    text.includes("suggest") ||
    text.includes("if this abstraction layer is necessary") ||
    text.includes("if this layer is necessary") ||
    text.includes("if part of public api")
  );
}

export function shouldIncludeDebtConcern(input: {
  severity: SemanticFileUnderstandingSeverity;
  description: string;
}): boolean {
  const text = input.description.toLowerCase();
  const strong = hasStrongDebtSignal(input.description);
  if (text.includes("may indicate") || text.includes("might indicate")) return false;
  if (input.severity === "low" && !strong) return false;
  if (hasSpeculativeDebtSignal(input.description) && !strong) return false;
  return true;
}

export function coerceDebtConcerns(adapterResult: SemanticDebtAdapterResult): SemanticDebtConcernCoerced[] {
  if (!adapterResult || !Array.isArray(adapterResult.concerns)) return [];
  const out: SemanticDebtConcernCoerced[] = [];

  for (const concern of adapterResult.concerns) {
    if (!concern || concern.type !== "tech_debt") continue;
    const description = typeof concern.description === "string" ? concern.description.trim() : "";
    if (description.length === 0) continue;
    const severity: SemanticFileUnderstandingSeverity =
      concern.severity === "high" || concern.severity === "medium" || concern.severity === "low"
        ? concern.severity
        : "low";
    const pattern = categorizeDebtPattern(description);
    out.push({
      severity,
      description,
      ...(pattern ? { pattern } : {}),
      included: shouldIncludeDebtConcern({ severity, description }),
    });
  }

  return out;
}
