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
            enum: ["dependency-resolution", "cache-integrity", "other"],
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
}): string {
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
    "- other: use for a different material engineering problem directly supported by this file.",
    "- Return no finding when the source does not directly support a material problem candidate.",
    "- Every finding must cite one or more exact excerpts copied from the supplied source.",
    "- Use a stable lower-case hyphenated finding id and a concrete verification step in suggestedFollowUp.",
    "- Do not claim any command ran, any test passed, or any behavior not visible in this file.",
    input.language ? `Language: ${input.language}` : "",
    `File path: ${input.filePath}`,
    "File contents:",
    input.fileText,
  ].filter((line) => line.length > 0).join("\n");
}
