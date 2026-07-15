import type {
  ErrorControlFlowEvidence,
  OptionPropagationEvidence,
  ScopeResolutionEvidence,
} from "@rekon/capability-js-ts";

export const SEMANTIC_FILE_UNDERSTANDING_PROMPT_VERSION = "semantic-file-understanding-v4";

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
              "option-propagation",
              "scope-resolution",
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
  optionPropagation?: OptionPropagationEvidence[];
  scopeResolution?: ScopeResolutionEvidence[];
}): string {
  const errorControlFlow = renderErrorControlFlow(input.errorControlFlow ?? []);
  const optionPropagation = renderOptionPropagation(input.optionPropagation ?? []);
  const scopeResolution = renderScopeResolution(input.scopeResolution ?? []);
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
    "- cleanup-completeness: use only when visible lifecycle or resource-cleanup code has multiple required cleanup obligations and one rejection or early exit can prevent later cleanup from being attempted. The candidate must cite a visible exit mechanism before a later obligation, such as Promise.all, an explicit throw or return, or an unguarded awaited cleanup whose rejection exits the function. Promise.allSettled does not reject merely because an input promise rejects and is not fail-fast evidence. Return no cleanup candidate when rejected results are handled without throwing and each later visible hook is guarded so it is still attempted. Do not speculate that a called helper throws synchronously unless current source shows that path.",
    "- error-propagation: use only when visible control flow merges distinct failure causes under one thrown identity and current source shows that downstream handling distinguishes those identities, causing a valid failure path to be mislabeled, suppressed, or skipped. When deterministic error-control-flow evidence shows an OR guard with non-equivalent causes mapped to one error identity and current source later compares distinct error identities, emit a candidate unless source proves the causes intentionally share handling. A compound guard alone is not enough. Do not flag code that maps distinct causes to separate error identities or intentionally handles them the same way.",
    "- For error-propagation evidence, cite only the minimal source lines that show the merged guard, thrown identity, downstream identity mapping, and handling consequence. Prefer individual property or guard lines over entire object or condition blocks.",
    "- option-propagation: use when a callback parameter replaces the same option from a spread configuration object without a fallback before the receiving operation. When current source proves the callback value can be absent, describe the loss directly. When the callback contract is imported or otherwise not visible, emit a medium verification candidate whenever deterministic option-flow evidence identifies the callback owner, callback parameter, spread source, and destructive override; require verification of callback optionality in suggestedFollowUp. A comment that undefined is equivalent to an absent property does not prove that replacing an existing spread value is safe. A spread followed by an ordinary local override is not enough. Do not flag a deliberate non-optional override or a nullish fallback that preserves the configured value.",
    "- scope-resolution: use only when deterministic scope-model evidence is supplied with a non-empty unmodeledLexicalBoundaries list, this file implements identifier binding or source rewriting, and current source connects that missing boundary to a concrete rewrite or binding consequence such as leaving a replaced import reference unbound. If the deterministic record has no unmodeled lexical boundary, return no scope-resolution finding for that classifier. Do not flag ordinary switch statements, local shadowing, AST traversal, or a scope-node list without a visible resolver or transformer consequence.",
    "- other: use for a different material engineering problem directly supported by this file.",
    "- Return no finding when the source does not directly support a material problem candidate.",
    "- Every finding must cite one or more exact excerpts copied from the supplied source.",
    "- Keep one mechanism per finding and cite only excerpts needed to demonstrate that mechanism. Do not cite safe sibling logic as context for a separate concern.",
    "- Use a stable lower-case hyphenated finding id and a concrete verification step in suggestedFollowUp.",
    "- Do not claim any command ran, any test passed, or any behavior not visible in this file.",
    input.language ? `Language: ${input.language}` : "",
    `File path: ${input.filePath}`,
    ...errorControlFlow,
    ...optionPropagation,
    ...scopeResolution,
    "File contents:",
    input.fileText,
  ].filter((line) => line.length > 0).join("\n");
}

function renderScopeResolution(evidence: ScopeResolutionEvidence[]): string[] {
  if (evidence.length === 0) return [];
  const bounded = evidence.slice(0, 12).map((entry) => ({
    classifierName: entry.classifierName,
    classifierExpression: entry.classifierExpression,
    resolverFunctions: entry.resolverFunctions,
    modeledNodeKinds: entry.modeledNodeKinds,
    unmodeledLexicalBoundaries: entry.unmodeledLexicalBoundaries,
    handlesSwitchCases: entry.handlesSwitchCases,
    rewritesIdentifiers: entry.rewritesIdentifiers,
    excludesSwitchDiscriminant: entry.excludesSwitchDiscriminant,
    line: entry.location.line,
  }));
  return [
    "Deterministic scope-model evidence (AST observations, not findings):",
    JSON.stringify(bounded),
    ...(evidence.length > bounded.length
      ? [`Scope-model evidence truncated to ${bounded.length} of ${evidence.length} records.`]
      : []),
    "Use these records only to inspect a visible identifier resolver or source transformer. Emit scope-resolution only for a record with a non-empty unmodeledLexicalBoundaries list and only when current source also shows how declarations are routed through the classifier and how a reference rewrite can change. A record with no unmodeled lexical boundary is negative evidence for this class. Cite source excerpts, not this evidence block.",
  ];
}

function renderOptionPropagation(evidence: OptionPropagationEvidence[]): string[] {
  if (evidence.length === 0) return [];
  const bounded = evidence.slice(0, 24).map((entry) => ({
    caller: entry.caller,
    property: entry.property,
    spreadSource: entry.spreadSource,
    overrideSource: entry.overrideSource,
    overrideExpression: entry.overrideExpression,
    overrideKind: entry.overrideKind,
    ...(entry.fallbackOperator ? { fallbackOperator: entry.fallbackOperator } : {}),
    ...(entry.fallbackTarget ? { fallbackTarget: entry.fallbackTarget } : {}),
    preservesSpreadValue: entry.preservesSpreadValue,
    ...(entry.callbackParameter ? { callbackParameter: entry.callbackParameter } : {}),
    ...(entry.callbackProperty ? { callbackProperty: entry.callbackProperty } : {}),
    ...(entry.callbackOwner ? { callbackOwner: entry.callbackOwner } : {}),
    line: entry.location.line,
  }));
  return [
    "Deterministic option-flow evidence (AST observations, not findings):",
    JSON.stringify(bounded),
    ...(evidence.length > bounded.length
      ? [`Option-flow evidence truncated to ${bounded.length} of ${evidence.length} records.`]
      : []),
    "Use these records to inspect option precedence and the receiving operation. A callback-backed destructive override with an unavailable callback contract may support a medium verification candidate; ordinary local overrides do not. Cite source excerpts, not this evidence block.",
  ];
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
    identityMappings: entry.identityMappings.map((mapping) => ({
      identity: mapping.identity,
      property: mapping.property,
      expression: mapping.expression,
      line: mapping.location.line,
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
