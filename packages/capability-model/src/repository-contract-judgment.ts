import {
  type ContractCandidateReport,
  type ContractJudgmentDecision,
  type FlowContractSource,
  type SystemContractSource,
  assertRepositoryContractSourceDocument,
} from "@rekon/kernel-repo-model";

export const REPOSITORY_CONTRACT_JUDGMENT_PROMPT_VERSION = "repository-contract-judge-v1";

export type RepositoryContractJudgmentDraftCitation = {
  path: string;
  lineStart?: number;
  lineEnd?: number;
  excerpt?: string;
};

export type RepositoryContractJudgmentDraft = {
  candidateId: string;
  decision: ContractJudgmentDecision;
  confidence: number;
  rationale: string;
  citations: RepositoryContractJudgmentDraftCitation[];
  proposed?: SystemContractSource | FlowContractSource;
};

export const REPOSITORY_CONTRACT_JUDGMENT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["judgments"],
  properties: {
    judgments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["candidateId", "decision", "confidence", "rationale", "citations"],
        properties: {
          candidateId: { type: "string" },
          decision: { type: "string", enum: ["accept", "reject", "uncertain"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          rationale: { type: "string" },
          citations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["path"],
              properties: {
                path: { type: "string" },
                lineStart: { type: "integer", minimum: 1 },
                lineEnd: { type: "integer", minimum: 1 },
                excerpt: { type: "string" },
              },
            },
          },
          proposed: { type: "object" },
        },
      },
    },
  },
} as const;

export function buildRepositoryContractJudgmentPrompt(report: ContractCandidateReport): string {
  const candidates = report.candidates.map((candidate) => ({
    id: candidate.id,
    kind: candidate.kind,
    targetId: candidate.targetId,
    discoveryConfidence: candidate.confidence,
    discoveryRationale: candidate.rationale,
    proposed: candidate.proposed,
  }));
  return [
    "Judge inferred Rekon repository-contract candidates against the current repository source and tests.",
    "These drafts are not repository law. Do not accept a candidate merely because its topology is plausible.",
    "For each candidate:",
    "- inspect the source that owns the behavior and any focused tests or configuration that establish intent;",
    "- accept only when purpose, outcomes, invariants, boundaries, and required checks are supported;",
    "- replace generic discovery wording with concise repository-native wording in proposed;",
    "- preserve the candidate target id and contract kind;",
    "- cite repository-relative source paths and tight line ranges;",
    "- reject a false boundary or flow; use uncertain when evidence is insufficient;",
    "- do not silently invent product intent, user outcomes, payload guarantees, or prohibited changes.",
    "Accepted judgments require at least one current source citation and a complete proposed contract.",
    "Return only JSON matching the supplied schema.",
    `Prompt version: ${REPOSITORY_CONTRACT_JUDGMENT_PROMPT_VERSION}`,
    "Candidates:",
    JSON.stringify(candidates, null, 2),
  ].join("\n");
}

export function coerceRepositoryContractJudgmentDrafts(
  value: unknown,
  report: ContractCandidateReport,
): RepositoryContractJudgmentDraft[] {
  const root = isRecord(value) && Array.isArray(value.judgments) ? value.judgments : undefined;
  if (!root) throw new TypeError("Contract judgment input must contain a judgments array.");
  const candidates = new Map(report.candidates.map((candidate) => [candidate.id, candidate]));
  const seen = new Set<string>();
  const drafts: RepositoryContractJudgmentDraft[] = [];

  for (const [index, raw] of root.entries()) {
    if (!isRecord(raw)) throw new TypeError(`judgments[${index}] must be an object.`);
    const candidateId = requiredString(raw.candidateId, `judgments[${index}].candidateId`);
    const candidate = candidates.get(candidateId);
    if (!candidate) throw new TypeError(`judgments[${index}] references unknown candidate ${candidateId}.`);
    if (seen.has(candidateId)) throw new TypeError(`Duplicate judgment for ${candidateId}.`);
    seen.add(candidateId);
    const decision = raw.decision;
    if (decision !== "accept" && decision !== "reject" && decision !== "uncertain") {
      throw new TypeError(`judgments[${index}].decision must be accept, reject, or uncertain.`);
    }
    const confidence = raw.confidence;
    if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new TypeError(`judgments[${index}].confidence must be between 0 and 1.`);
    }
    const rationale = requiredString(raw.rationale, `judgments[${index}].rationale`);
    const citations = coerceCitations(raw.citations, `judgments[${index}].citations`);
    const proposed = raw.proposed === undefined
      ? undefined
      : assertProposal(raw.proposed, candidate.kind, candidate.targetId, `judgments[${index}].proposed`);
    if (decision === "accept" && citations.length === 0) {
      throw new TypeError(`Accepted judgment ${candidateId} requires a current source citation.`);
    }
    if (decision === "accept" && !citations.some((citation) => citation.lineStart !== undefined || citation.excerpt !== undefined)) {
      throw new TypeError(`Accepted judgment ${candidateId} requires at least one line-bounded source citation.`);
    }
    if (decision === "accept" && !proposed) {
      throw new TypeError(`Accepted judgment ${candidateId} requires repository-native proposed contract wording.`);
    }
    drafts.push({ candidateId, decision, confidence, rationale, citations, ...(proposed ? { proposed } : {}) });
  }

  for (const candidate of report.candidates) {
    if (seen.has(candidate.id)) continue;
    drafts.push({
      candidateId: candidate.id,
      decision: "uncertain",
      confidence: 0,
      rationale: "No agent judgment was supplied for this candidate.",
      citations: [],
    });
  }
  return drafts.sort((left, right) => left.candidateId.localeCompare(right.candidateId));
}

function assertProposal(
  value: unknown,
  kind: "system" | "flow",
  targetId: string,
  path: string,
): SystemContractSource | FlowContractSource {
  const document = kind === "system"
    ? { version: "1.0.0" as const, sourceId: "judgment", systems: [value] }
    : { version: "1.0.0" as const, sourceId: "judgment", flows: [value] };
  let parsed;
  try {
    parsed = assertRepositoryContractSourceDocument(document);
  } catch (error) {
    throw new TypeError(`${path} is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  const proposed = kind === "system" ? parsed.systems?.[0] : parsed.flows?.[0];
  if (!proposed || proposed.id !== targetId) {
    throw new TypeError(`${path}.id must remain ${targetId}.`);
  }
  return proposed;
}

function coerceCitations(value: unknown, path: string): RepositoryContractJudgmentDraftCitation[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
  return value.map((raw, index) => {
    if (!isRecord(raw)) throw new TypeError(`${path}[${index}] must be an object.`);
    const citation: RepositoryContractJudgmentDraftCitation = {
      path: requiredString(raw.path, `${path}[${index}].path`),
    };
    if (raw.lineStart !== undefined) citation.lineStart = positiveInteger(raw.lineStart, `${path}[${index}].lineStart`);
    if (raw.lineEnd !== undefined) citation.lineEnd = positiveInteger(raw.lineEnd, `${path}[${index}].lineEnd`);
    if (citation.lineStart !== undefined && citation.lineEnd !== undefined && citation.lineEnd < citation.lineStart) {
      throw new TypeError(`${path}[${index}].lineEnd must be at least lineStart.`);
    }
    if (raw.excerpt !== undefined) citation.excerpt = requiredString(raw.excerpt, `${path}[${index}].excerpt`);
    return citation;
  });
}

function positiveInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value) || Number(value) < 1) throw new TypeError(`${path} must be a positive integer.`);
  return Number(value);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${path} must be a non-empty string.`);
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
