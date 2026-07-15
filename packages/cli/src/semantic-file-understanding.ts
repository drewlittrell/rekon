import type { ErrorControlFlowEvidence } from "@rekon/capability-js-ts";

export const SEMANTIC_FILE_UNDERSTANDING_PROMPT_VERSION = "semantic-file-understanding-v2";

export const SEMANTIC_FILE_UNDERSTANDING_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        purpose: { type: "string" },
        responsibilities: { type: "array", items: { type: "string" } },
        touchedConcepts: { type: "array", items: { type: "string" } },
      },
      required: ["purpose", "responsibilities", "touchedConcepts"],
    },
    capabilitySignals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          sourceEvidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { excerpt: { type: "string" } },
              required: ["excerpt"],
            },
          },
        },
        required: ["id", "label", "confidence", "sourceEvidence"],
      },
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          problemClass: {
            type: "string",
            enum: [
              "dependency-resolution",
              "cache-integrity",
              "cleanup-completeness",
              "error-propagation",
              "other",
            ],
          },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          message: { type: "string" },
          sourceEvidence: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
          },
          suggestedFollowUp: { type: "string" },
        },
        required: [
          "id",
          "problemClass",
          "severity",
          "message",
          "sourceEvidence",
          "suggestedFollowUp",
        ],
      },
    },
  },
  required: ["summary", "capabilitySignals", "findings"],
};

export function buildSemanticFileUnderstandingPrompt(input: {
  filePath: string;
  fileText: string;
  language?: string;
  errorControlFlow?: ErrorControlFlowEvidence[];
}): string {
  const errorControlFlow = renderErrorControlFlow(input.errorControlFlow ?? []);
  return [
    "Analyze one source file for codebase intelligence.",
    "Return only one JSON object matching the supplied schema.",
    "",
    "Summary and capability rules:",
    "- Summarize the file purpose in one sentence and list only responsibilities visible in the source.",
    "- Set capability IDs to lower-case verb:noun phrases, such as ingest:turn evidence or deliver:channel message.",
    "- Include direct side effects and coordination such as persistence, calculation, delivery, or orchestration.",
    "- Cite exact source excerpts. Do not infer hidden callers, runtime state, configuration, or intent.",
    "- Imports and public exports are extracted deterministically; do not report them.",
    "",
    "Problem candidates:",
    "- Findings are source-grounded candidates for independent judgment, not proven defects.",
    "- dependency-resolution: use only when visible control flow considers multiple eligible providers, bindings, or candidates and can let a later candidate replace or outrank an earlier authoritative match. Do not flag ordinary lookup, iteration, or dispatch without a visible precedence or overwrite risk.",
    "- cache-integrity: use only when visible code can consume cached derived output without checking that the entry is complete and intact, or when a non-atomic write can leave an accepted partial entry. Do not assume every cache needs an embedded digest or flag a cache merely because invalidation is implemented elsewhere.",
    "- cleanup-completeness: use only when visible lifecycle or resource-cleanup code has multiple required cleanup obligations and one rejection or early exit can prevent later cleanup from being attempted. A lifecycle dispatcher that fail-fast awaits peer hooks before later hook groups or a module-level hook is a candidate because one rejection can skip those visible later calls. Do not flag Promise.all or thrown cleanup errors when fail-fast behavior is intentional or no later cleanup obligation is visible.",
    "- error-propagation: use only when visible control flow merges distinct failure causes under one thrown identity and current source shows that downstream handling distinguishes those identities, causing a valid failure path to be mislabeled, suppressed, or skipped. A compound guard alone is not enough. Do not flag code that maps distinct causes to separate error identities or intentionally handles them the same way.",
    "- For error-propagation evidence, cite only the minimal source lines that show the merged guard, thrown identity, downstream identity mapping, and handling consequence. Prefer individual property or guard lines over entire object or condition blocks.",
    "- other: use for a different material engineering problem directly supported by this file.",
    "- Return no finding when the source does not directly support a material problem candidate.",
    "- Every finding must cite one or more exact excerpts copied from the supplied source.",
    "- Keep one mechanism per finding and cite only excerpts needed to demonstrate that mechanism. Do not cite safe sibling logic as context for a separate concern.",
    "- Use a stable lower-case hyphenated finding id and a concrete verification step in suggestedFollowUp.",
    "- Do not claim any command ran, any test passed, or any behavior not visible in this file.",
    input.language ? `Language: ${input.language}` : "",
    `File path: ${input.filePath}`,
    ...errorControlFlow,
    "File contents:",
    input.fileText,
  ].filter((line) => line.length > 0).join("\n");
}

function renderErrorControlFlow(evidence: ErrorControlFlowEvidence[]): string[] {
  if (evidence.length === 0) return [];
  const bounded = evidence.slice(0, 24).map((entry) => ({
    caller: entry.caller,
    action: entry.action,
    ...(entry.errorIdentity ? { errorIdentity: entry.errorIdentity } : {}),
    expressionKind: entry.expressionKind,
    line: entry.location.line,
    guards: entry.guards.map((guard) => ({
      expression: guard.expression,
      operator: guard.operator,
      terms: guard.terms,
      polarity: guard.polarity,
      line: guard.location.line,
    })),
  }));
  return [
    "Deterministic error-control-flow evidence (AST observations, not findings):",
    JSON.stringify(bounded),
    ...(evidence.length > bounded.length
      ? [`Error-control-flow evidence truncated to ${bounded.length} of ${evidence.length} records.`]
      : []),
    "Use these records to compare guards and thrown identities, then verify any downstream handling claim against the source below. Cite source excerpts, not this evidence block.",
  ];
}
