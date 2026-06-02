// Intent plan actionability / compiler helper (slice 129).
//
// `buildIntentPlanActionabilityReport(input)` reads a raw / semi-structured plan,
// normalizes it into executable phase drafts (deterministically, with an optional
// bounded LLM-backed semantic adapter), evaluates actionability, emits findings +
// elicitation questions + a revision prompt, and returns an
// `IntentPlanActionabilityReport`.
//
// **Boundary.** This helper reads and transforms plan TEXT only. It executes no
// commands, writes no source files, creates no PreparedIntentPlan / WorkOrder /
// VerificationPlan / VerificationRun / VerificationResult, runs no Circe, and does
// not implement `intent:go`. The deterministic parser never invents file paths,
// commands, or acceptance criteria — missing material becomes a finding and a
// question, not a fabricated field. The optional semantic adapter is the caller's
// injected text-transformer; it is provenance-tagged and never executes anything.
//
// See docs/concepts/intent-plan-compiler.md and
// docs/strategy/intent-plan-actionability-report-implementation.md.

import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type IntentPlanActionabilityFinding,
  type IntentPlanActionabilityReport,
  type IntentPlanActionabilityRequirement,
  type IntentPlanActionabilitySeverity,
  type IntentPlanAnswer,
  type IntentPlanElicitationQuestion,
  type IntentPlanEvidenceGate,
  type IntentPlanMergeTrace,
  type IntentPlanNormalizationMethod,
  type IntentPlanNormalizationProvenance,
  type IntentPlanPhaseDraft,
  type IntentPlanPhaseDraftKind,
  type IntentPlanSourceShape,
  type IntentPlanUnappliedAnswer,
  createIntentPlanActionabilityReport,
} from "@rekon/kernel-repo-model";

export const INTENT_PLAN_ACTIONABILITY_REPORT_ARTIFACT_ID_PREFIX = "intent-plan-actionability-report-";

export type IntentPlanSemanticMode = "off" | "auto" | "required";

export type IntentPlanSemanticNormalizationInput = {
  planText: string;
  goal?: string;
  kind?: string;
};

export type IntentPlanSemanticNormalizationResult = {
  phases: IntentPlanPhaseDraft[];
  warnings?: string[];
  model?: string;
  provider?: string;
};

/** Injected, bounded text-transformer. Reads plan text → phase drafts only. */
export type IntentPlanSemanticNormalizationAdapter = (
  input: IntentPlanSemanticNormalizationInput,
) => IntentPlanSemanticNormalizationResult | Promise<IntentPlanSemanticNormalizationResult>;

export type BuildIntentPlanActionabilityReportInput = {
  planText: string;
  planPath?: string;
  planSha256?: string;
  goal?: string;
  kind?: string;
  root?: string;
  semanticNormalization?: IntentPlanSemanticNormalizationAdapter;
  semanticMode?: IntentPlanSemanticMode;
  generatedAt?: string;
};

// ---------------------------------------------------------------------------
// Requirement metadata
// ---------------------------------------------------------------------------

const REQUIREMENT_SEVERITY: Record<IntentPlanActionabilityRequirement, IntentPlanActionabilitySeverity> = {
  objective: "high",
  deliverables: "medium",
  "acceptance-criteria": "medium",
  "implementation-scope": "high",
  "verification-evidence": "high",
  "ambiguity-clearance": "critical",
  "phase-contract": "low",
  "evidence-gates": "medium",
};

const AMBIGUITY_CRITICAL_RE = /\bTBD\b|\bTODO\b|\bFIXME\b|\?\?\?|\bopen question\b/i;
const AMBIGUITY_SOFT_RE = /\bnot sure\b|\bmaybe\b|\bperhaps\b/i;

// ---------------------------------------------------------------------------
// Deterministic plan parser
// ---------------------------------------------------------------------------

const HEADING_RE = /^(#{1,6})\s+(.*\S)\s*$/;
const BULLET_RE = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/;
const PATH_TOKEN_RE = /(?:[\w.-]+\/)+[\w.@-]+(?:\.[A-Za-z0-9]+)?|[\w-]+\.[A-Za-z]{1,5}\b/g;

type FieldKey =
  | "objective"
  | "deliverables"
  | "acceptance-criteria"
  | "touched-paths"
  | "verification"
  | "evidence"
  | "constraints"
  | "non-goals";

function classifyFieldHeading(text: string): FieldKey | null {
  const t = text.toLowerCase().replace(/[:*`]/g, "").trim();
  if (/^(objective|goal|intent)$/.test(t)) return "objective";
  if (/^(deliverables?|work items?|outputs?)$/.test(t)) return "deliverables";
  if (/^(acceptance criteria|acceptance|done when|success criteria|definition of done)$/.test(t)) return "acceptance-criteria";
  if (/^(touched paths?|scope|in scope|files?|paths?|implementation scope)$/.test(t)) return "touched-paths";
  if (/^(verification|verification commands?|verify|how to verify|tests?)$/.test(t)) return "verification";
  if (/^(evidence|evidence artifacts?|artifacts?)$/.test(t)) return "evidence";
  if (/^(constraints?|guardrails?)$/.test(t)) return "constraints";
  if (/^(non-?goals?)$/.test(t)) return "non-goals";
  return null;
}

function isPhaseHeading(level: number, text: string): boolean {
  if (level < 2 || level > 3) return false;
  const trimmed = text.trim();
  return /^phase\b/i.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
}

function inferPhaseKind(title: string, objective: string): IntentPlanPhaseDraftKind {
  const t = `${title} ${objective}`.toLowerCase();
  if (/\b(investigate|research|explore|audit|analy[sz]e)\b/.test(t)) return "investigate";
  if (/\brefactor\b/.test(t)) return "refactor";
  if (/\b(verify|verification|test|validate)\b/.test(t)) return "verify";
  if (/\breview\b/.test(t)) return "review";
  if (/\b(add|implement|modify|update|change|create|build|wire|write|remove|delete|fix)\b/.test(t)) return "modify";
  return "unknown";
}

type ParsedPhaseRegion = {
  title: string;
  startLine: number;
  endLine: number;
  lines: string[];
};

function segmentPhases(lines: string[], planTitle: string): ParsedPhaseRegion[] {
  const headingLines: Array<{ index: number; level: number; text: string }> = [];
  lines.forEach((line, index) => {
    const m = HEADING_RE.exec(line);
    if (m) headingLines.push({ index, level: (m[1] ?? "").length, text: m[2] ?? "" });
  });
  const phaseHeads = headingLines.filter((h) => isPhaseHeading(h.level, h.text));

  if (phaseHeads.length === 0) {
    // Implicit single phase: the whole document (after a leading H1 title).
    const firstH1 = headingLines.find((h) => h.level === 1);
    const start = firstH1 ? firstH1.index + 1 : 0;
    return [
      {
        title: planTitle || "Plan",
        startLine: start,
        endLine: lines.length - 1,
        lines: lines.slice(start),
      },
    ];
  }

  const regions: ParsedPhaseRegion[] = [];
  for (let i = 0; i < phaseHeads.length; i += 1) {
    const head = phaseHeads[i];
    if (!head) continue;
    const next = phaseHeads[i + 1];
    const end = next ? next.index - 1 : lines.length - 1;
    regions.push({
      title: head.text.replace(/^\d+[.)]\s*/, "").trim(),
      startLine: head.index,
      endLine: end,
      lines: lines.slice(head.index + 1, end + 1),
    });
  }
  return regions;
}

function parsePhaseRegion(region: ParsedPhaseRegion, order: number): IntentPlanPhaseDraft {
  const objectiveLines: string[] = [];
  const deliverables: string[] = [];
  const acceptanceCriteria: string[] = [];
  const touchedPaths: string[] = [];
  const verificationCommands: string[] = [];
  const evidenceArtifacts: string[] = [];
  const constraints: string[] = [];
  let currentField: FieldKey | null = null;

  for (const rawLine of region.lines) {
    const line = rawLine.replace(/\s+$/, "");
    const headingMatch = HEADING_RE.exec(line);
    if (headingMatch) {
      currentField = classifyFieldHeading(headingMatch[2] ?? "");
      continue;
    }
    const bulletMatch = BULLET_RE.exec(line);
    const content = bulletMatch ? bulletMatch[1] ?? "" : line.trim();
    if (content.length === 0) continue;
    switch (currentField) {
      case "objective":
        objectiveLines.push(content);
        break;
      case "deliverables":
        if (bulletMatch) deliverables.push(content);
        break;
      case "acceptance-criteria":
        if (bulletMatch) acceptanceCriteria.push(content);
        break;
      case "touched-paths":
        if (bulletMatch) touchedPaths.push(content);
        break;
      case "verification":
        if (bulletMatch) verificationCommands.push(content);
        break;
      case "evidence":
        if (bulletMatch) evidenceArtifacts.push(content);
        break;
      case "constraints":
      case "non-goals":
        if (bulletMatch) constraints.push(currentField === "non-goals" ? `non-goal: ${content}` : content);
        break;
      default:
        break;
    }
  }

  // Inline path extraction: literal path-like tokens that actually appear in the
  // region. This extracts, never invents.
  const regionText = region.lines.join("\n");
  const inlinePaths = regionText.match(PATH_TOKEN_RE) ?? [];
  for (const token of inlinePaths) {
    if (!/\.(md|txt)$/i.test(token) && !touchedPaths.includes(token)) touchedPaths.push(token);
  }

  const objective = objectiveLines.join(" ").trim();
  const evidenceExcerpt = region.lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 6)
    .join("\n");
  const sourceEvidence = evidenceExcerpt.length > 0
    ? [{ lineStart: region.startLine + 1, lineEnd: region.endLine + 1, excerpt: evidenceExcerpt }]
    : [];

  return {
    id: `phase-${order + 1}`,
    order: order + 1,
    title: region.title,
    kind: inferPhaseKind(region.title, objective),
    objective,
    deliverables,
    acceptanceCriteria,
    touchedPaths,
    verificationCommands,
    evidenceArtifacts,
    constraints,
    sourceEvidence,
    actionability: { status: "blocked", satisfiedRequirements: [], missingRequirements: [] },
  };
}

function classifySourceShape(lines: string[]): IntentPlanSourceShape {
  let fieldHeadings = 0;
  let phaseHeadings = 0;
  let bullets = 0;
  let headings = 0;
  for (const line of lines) {
    const h = HEADING_RE.exec(line);
    if (h) {
      headings += 1;
      if (classifyFieldHeading(h[2] ?? "")) fieldHeadings += 1;
      if (isPhaseHeading((h[1] ?? "").length, h[2] ?? "")) phaseHeadings += 1;
    } else if (BULLET_RE.test(line)) {
      bullets += 1;
    }
  }
  if (fieldHeadings > 0 || phaseHeadings > 0) return "structured-plan";
  if (bullets > 0 || headings > 1) return "semi-structured";
  return "brain-dump";
}

// ---------------------------------------------------------------------------
// Actionability evaluation
// ---------------------------------------------------------------------------

function phaseText(phase: IntentPlanPhaseDraft): string {
  return [
    phase.title,
    phase.objective,
    ...phase.deliverables,
    ...phase.acceptanceCriteria,
    ...phase.constraints,
    ...phase.sourceEvidence.map((e) => e.excerpt),
  ].join(" \n ");
}

function questionFor(
  requirement: IntentPlanActionabilityRequirement,
  phaseTitle: string,
): Pick<IntentPlanElicitationQuestion, "question" | "answerShape" | "whyAsked" | "priority"> {
  const where = phaseTitle ? ` for phase "${phaseTitle}"` : "";
  switch (requirement) {
    case "objective":
      return { question: `What single sentence should define the objective${where}?`, answerShape: "sentence", whyAsked: "A phase without a stated objective cannot be safely prepared.", priority: "high" };
    case "deliverables":
      return { question: `What concrete work items should${where ? ` phase "${phaseTitle}"` : " this phase"} deliver?`, answerShape: "bullets", whyAsked: "Deliverables define what the phase produces.", priority: "medium" };
    case "acceptance-criteria":
      return { question: `What exact outcomes should mark${where ? ` phase "${phaseTitle}"` : " this phase"} complete?`, answerShape: "bullets", whyAsked: "Acceptance criteria define done.", priority: "medium" };
    case "implementation-scope":
      return { question: `Which files or directories are in scope${where}?`, answerShape: "paths", whyAsked: "Implementation scope bounds the change.", priority: "high" };
    case "verification-evidence":
      return { question: `How should${where ? ` phase "${phaseTitle}"` : " this phase"} be verified? Reply with commands and/or artifact paths.`, answerShape: "command-or-artifact", whyAsked: "Verification evidence proves the work.", priority: "high" };
    case "ambiguity-clearance":
      return { question: `Which interpretation should govern${where ? ` phase "${phaseTitle}"` : " this phase"} so implementation can proceed without guesswork?`, answerShape: "sentence", whyAsked: "Ambiguous language changes implementation meaning.", priority: "critical" };
    case "phase-contract":
      return { question: `What is the full contract (objective, deliverables, acceptance criteria)${where}?`, answerShape: "bullets", whyAsked: "A phase contract makes the phase implementable.", priority: "medium" };
    case "evidence-gates":
      return { question: `What evidence proves${where ? ` phase "${phaseTitle}"` : " this phase"} satisfies the user intent directly?`, answerShape: "command-or-artifact", whyAsked: "Evidence gates prove intent, not generic passing.", priority: "medium" };
  }
}

function suggestedFixFor(requirement: IntentPlanActionabilityRequirement, phaseTitle: string): string {
  const where = phaseTitle ? ` to phase "${phaseTitle}"` : "";
  switch (requirement) {
    case "objective":
      return `Add a one-sentence objective${where}.`;
    case "deliverables":
      return `List concrete deliverables${where}.`;
    case "acceptance-criteria":
      return `Add checkable acceptance criteria${where}.`;
    case "implementation-scope":
      return `List the touched files/directories${where}.`;
    case "verification-evidence":
      return `Add verification commands and/or evidence artifacts${where}.`;
    case "ambiguity-clearance":
      return `Resolve the ambiguous TBD/TODO/open-question language${where}.`;
    case "phase-contract":
      return `Complete the phase contract (objective + deliverables + acceptance)${where}.`;
    case "evidence-gates":
      return `Define an evidence gate that proves the user intent${where}.`;
  }
}

type PhaseEvaluation = {
  phase: IntentPlanPhaseDraft;
  findings: IntentPlanActionabilityFinding[];
  questions: IntentPlanElicitationQuestion[];
  evidenceGate: IntentPlanEvidenceGate;
};

function evaluatePhase(phase: IntentPlanPhaseDraft, indexBase: number): PhaseEvaluation {
  const text = phaseText(phase);
  const ambiguityCritical = AMBIGUITY_CRITICAL_RE.test(text);
  const ambiguitySoft = AMBIGUITY_SOFT_RE.test(text);
  // An explicit clarification constraint (e.g. an answered elicitation question
  // merged back into the phase) resolves ambiguity without erasing the original
  // source evidence that still carries the ambiguous wording.
  const hasClarification = phase.constraints.some((c) => /^\s*clarification:/i.test(c));

  const hasVerification = phase.verificationCommands.length > 0 || phase.evidenceArtifacts.length > 0;
  const satisfied: Record<IntentPlanActionabilityRequirement, boolean> = {
    objective: phase.objective.trim().length > 0,
    deliverables: phase.deliverables.length > 0,
    "acceptance-criteria": phase.acceptanceCriteria.length > 0,
    "implementation-scope": phase.touchedPaths.length > 0,
    "verification-evidence": hasVerification,
    "ambiguity-clearance": (!ambiguityCritical && !ambiguitySoft) || hasClarification,
    "phase-contract": phase.objective.trim().length > 0 && phase.deliverables.length > 0 && phase.acceptanceCriteria.length > 0,
    "evidence-gates": hasVerification,
  };

  const requirements = Object.keys(satisfied) as IntentPlanActionabilityRequirement[];
  const satisfiedRequirements = requirements.filter((r) => satisfied[r]);
  const missingRequirements = requirements.filter((r) => !satisfied[r]);

  const findings: IntentPlanActionabilityFinding[] = [];
  const questions: IntentPlanElicitationQuestion[] = [];
  let fi = indexBase;
  for (const requirement of missingRequirements) {
    let severity = REQUIREMENT_SEVERITY[requirement];
    if (requirement === "ambiguity-clearance") severity = ambiguityCritical ? "critical" : "high";
    findings.push({
      id: `finding-${phase.id}-${requirement}`,
      severity,
      requirement,
      phaseId: phase.id,
      message: `Phase "${phase.title}" is missing ${requirement.replace(/-/g, " ")}.`,
      sourceEvidence: phase.sourceEvidence.map((e) => e.excerpt),
      suggestedFix: suggestedFixFor(requirement, phase.title),
    });
    const q = questionFor(requirement, phase.title);
    questions.push({ id: `question-${phase.id}-${requirement}`, phaseId: phase.id, requirement, ...q });
    fi += 1;
  }

  const status: IntentPlanPhaseDraft["actionability"]["status"] = findings.some((f) => f.severity === "critical")
    ? "blocked"
    : findings.length > 0
      ? "needs-revision"
      : "actionable";

  const evaluatedPhase: IntentPlanPhaseDraft = { ...phase, actionability: { status, satisfiedRequirements, missingRequirements } };

  const evidenceGate: IntentPlanEvidenceGate = {
    id: `evidence-gate-${phase.id}`,
    phaseId: phase.id,
    description: `Phase "${phase.title}" must prove the user intent directly via verification commands or evidence artifacts.`,
    satisfied: hasVerification,
    evidence: [...phase.verificationCommands, ...phase.evidenceArtifacts],
  };

  return { phase: evaluatedPhase, findings, questions, evidenceGate };
}

function buildRevisionPrompt(
  planPath: string | undefined,
  goal: string | undefined,
  status: string,
  findings: IntentPlanActionabilityFinding[],
  questions: IntentPlanElicitationQuestion[],
): { prompt: string; targetAudience: "operator-or-llm"; requiredChanges: string[] } {
  const requiredChanges = findings.map((f) => f.suggestedFix);
  const lines: string[] = [];
  lines.push("You are revising an implementation plan so it can be safely prepared and executed.");
  lines.push("");
  lines.push(`Plan: ${planPath ?? "(inline)"}`);
  lines.push(`Goal: ${goal ?? "(none provided)"}`);
  lines.push(`Current status: ${status}`);
  lines.push("");
  if (requiredChanges.length > 0) {
    lines.push("What must change:");
    for (const change of requiredChanges) lines.push(`- ${change}`);
    lines.push("");
  }
  if (questions.length > 0) {
    lines.push("Questions to answer:");
    for (const q of questions) lines.push(`- ${q.phaseId ? `[${q.phaseId}] ` : ""}${q.question}`);
    lines.push("");
  }
  lines.push("Rules:");
  lines.push("- Do not invent file paths; only reference paths that exist or will exist.");
  lines.push("- Do not invent verification commands; cite real commands or artifacts.");
  lines.push("- Keep all stated non-goals.");
  lines.push("- Add missing acceptance criteria as concrete, checkable outcomes.");
  lines.push("- Add verification evidence (commands and/or artifact paths) for each phase.");
  lines.push("- Make any manual or reviewer-gated phase explicit.");
  return { prompt: lines.join("\n"), targetAudience: "operator-or-llm", requiredChanges };
}

type IntentPlanEvaluatedBody = {
  evaluatedPhases: IntentPlanPhaseDraft[];
  findings: IntentPlanActionabilityFinding[];
  questions: IntentPlanElicitationQuestion[];
  evidenceGates: IntentPlanEvidenceGate[];
  status: IntentPlanActionabilityReport["status"]["value"];
  reason: string;
  revisionPrompt: IntentPlanActionabilityReport["revisionPrompt"];
  summary: IntentPlanActionabilityReport["summary"];
};

// Shared evaluator: turn a set of (already-normalized) phase drafts into the
// findings / questions / evidence-gates / status / summary that make up an
// IntentPlanActionabilityReport body. Both the initial review path and the
// answered (merge-back) path call this so they cannot drift apart.
function evaluatePlanPhases(phases: IntentPlanPhaseDraft[], ctx: { planPath?: string; goal?: string }): IntentPlanEvaluatedBody {
  const evaluations = phases.map((phase, i) => evaluatePhase(phase, i));
  const evaluatedPhases = evaluations.map((e) => e.phase);
  const findings = evaluations.flatMap((e) => e.findings);
  const questions = evaluations.flatMap((e) => e.questions);
  const evidenceGates = evaluations.map((e) => e.evidenceGate);

  const hasCritical = findings.some((f) => f.severity === "critical");
  const status: IntentPlanActionabilityReport["status"]["value"] =
    evaluatedPhases.length === 0 || hasCritical
      ? "blocked"
      : findings.length > 0
        ? "needs-revision"
        : "actionable";
  const reason =
    evaluatedPhases.length === 0
      ? "No usable phases could be extracted from the plan."
      : hasCritical
        ? "The plan has critical actionability gaps (ambiguity that changes implementation meaning)."
        : findings.length > 0
          ? "The plan has unresolved actionability findings; revise before approval."
          : "Every phase has an objective, deliverables, acceptance criteria, scope, and verification evidence.";

  const revisionPrompt = buildRevisionPrompt(ctx.planPath, ctx.goal, status, findings, questions);
  const summary = {
    totalPhases: evaluatedPhases.length,
    actionablePhases: evaluatedPhases.filter((p) => p.actionability.status === "actionable").length,
    blockedPhases: evaluatedPhases.filter((p) => p.actionability.status === "blocked").length,
    questions: questions.length,
    findings: findings.length,
  };

  return { evaluatedPhases, findings, questions, evidenceGates, status, reason, revisionPrompt, summary };
}

// ---------------------------------------------------------------------------
// buildIntentPlanActionabilityReport
// ---------------------------------------------------------------------------

export async function buildIntentPlanActionabilityReport(
  input: BuildIntentPlanActionabilityReportInput,
): Promise<IntentPlanActionabilityReport> {
  const planText = typeof input.planText === "string" ? input.planText : "";
  const lines = planText.split(/\r?\n/);
  const sourceShape = classifySourceShape(lines);
  const planTitle = (() => {
    for (const line of lines) {
      const m = HEADING_RE.exec(line);
      if (m && (m[1] ?? "").length === 1) return (m[2] ?? "").trim();
    }
    return "";
  })();

  // Deterministic parse → baseline phase drafts.
  const regions = segmentPhases(lines, planTitle);
  const deterministicPhases = regions.map((region, i) => parsePhaseRegion(region, i));

  // Normalization mode + optional bounded semantic adapter.
  const mode: IntentPlanSemanticMode = input.semanticMode ?? "off";
  let method: IntentPlanNormalizationMethod = "deterministic";
  let provenance: IntentPlanNormalizationProvenance = "source-only";
  let invokedSemanticNormalization = false;
  let rationale = "Deterministic parsing (semantic normalization off).";
  const warnings: string[] = [];
  let model: string | undefined;
  let provider: string | undefined;
  let phases = deterministicPhases;

  if (mode !== "off") {
    if (typeof input.semanticNormalization === "function") {
      const result = await input.semanticNormalization({ planText, goal: input.goal, kind: input.kind });
      if (result && Array.isArray(result.phases) && result.phases.length > 0) {
        phases = result.phases;
        method = "semantic-llm";
        provenance = "semantic-llm";
        invokedSemanticNormalization = true;
        rationale = `Semantic normalization invoked (mode ${mode}); model-inferred fields are provenance-tagged semantic-llm.`;
        if (typeof result.model === "string") model = result.model;
        if (typeof result.provider === "string") provider = result.provider;
        for (const w of result.warnings ?? []) if (typeof w === "string") warnings.push(w);
      } else {
        method = "deterministic-fallback";
        rationale = `Semantic normalization (mode ${mode}) returned no phases; used deterministic parsing.`;
        warnings.push("Semantic normalization returned no usable phases; fell back to deterministic parsing.");
      }
    } else {
      method = "deterministic-fallback";
      rationale = `Semantic normalization requested (mode ${mode}) but no provider is configured; used deterministic parsing.`;
      warnings.push("Semantic normalization requested but no provider is configured; used deterministic parsing.");
    }
  }

  // Evaluate actionability over whichever phases we ended up with. The same
  // evaluator is reused by the answered-report path (merge-back, slice 134).
  const { evaluatedPhases, findings, questions, evidenceGates, status, reason, revisionPrompt, summary } =
    evaluatePlanPhases(phases, { planPath: input.planPath, goal: input.goal });

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const idStamp = Date.parse(generatedAt);
  const artifactId = `${INTENT_PLAN_ACTIONABILITY_REPORT_ARTIFACT_ID_PREFIX}${Number.isFinite(idStamp) ? idStamp : Date.now()}`;
  const header: ArtifactHeader = {
    artifactType: "IntentPlanActionabilityReport",
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt,
    subject: { repoId: input.root ?? "." },
    producer: { id: "@rekon/capability-model.intent-plan-actionability", version: "0.1.0-beta.0" },
    inputRefs: [],
    freshness: { status: "fresh" },
    provenance: { confidence: provenance === "semantic-llm" ? 0.6 : 0.9 },
  };

  const sourcePlan: IntentPlanActionabilityReport["sourcePlan"] = { sourceShape, lineCount: lines.length };
  if (typeof input.planPath === "string" && input.planPath.length > 0) sourcePlan.path = input.planPath;
  if (typeof input.planSha256 === "string" && input.planSha256.length > 0) sourcePlan.sha256 = input.planSha256;

  const report: IntentPlanActionabilityReport = {
    header,
    status: { value: status, reason },
    sourcePlan,
    normalizationTrace: { method, invokedSemanticNormalization, rationale, provenance, warnings },
    normalizedPhases: evaluatedPhases,
    findings,
    elicitationQuestions: questions,
    revisionPrompt,
    evidenceGates,
    summary,
    boundaries: {
      executedCommands: false,
      wroteSourceFiles: false,
      createdPreparedIntentPlan: false,
      createdWorkOrder: false,
      createdVerificationPlan: false,
      ranCirce: false,
      implementedIntentGo: false,
    },
  };

  if ((input.goal && input.goal.length > 0) || (input.kind && input.kind.length > 0)) {
    report.request = {};
    if (input.goal && input.goal.length > 0) report.request.goal = input.goal;
    if (input.kind && input.kind.length > 0) report.request.kind = input.kind;
  }

  if (model) report.normalizationTrace.model = model;
  if (provider) report.normalizationTrace.provider = provider;

  return createIntentPlanActionabilityReport(report);
}

// ---------------------------------------------------------------------------
// buildAnsweredIntentPlanActionabilityReport (slice 134)
//
// Deterministic answer / merge-back. Reads an existing IntentPlanActionabilityReport,
// merges operator/agent answers (tied to that report's elicitation questions by
// question id) into COPIES of the normalized phase drafts, re-runs the SAME
// actionability evaluator, and returns ONE new report revision. It never mutates the
// source report, never writes the source plan file, never invents fields, executes
// no commands, and creates no PreparedIntentPlan / WorkOrder / VerificationPlan /
// VerificationRun / VerificationResult.
// ---------------------------------------------------------------------------

export type IntentPlanAnswerInput = { questionId: string; answer: string };

export type IntentPlanAnswerBlockerCategory =
  | "missing-report"
  | "missing-report-ref"
  | "unknown-question"
  | "empty-answer"
  | "invalid-answer-shape"
  | "duplicate-answer"
  | "unsupported-requirement"
  | "no-applicable-phase";

export type IntentPlanAnswerBlocker = {
  id: string;
  category: IntentPlanAnswerBlockerCategory;
  severity: "blocker";
  message: string;
};

export type BuildAnsweredIntentPlanActionabilityReportInput = {
  report?: IntentPlanActionabilityReport | null;
  reportRef?: ArtifactRef | null;
  answers: IntentPlanAnswerInput[];
  answeredBy?: string;
  answeredAt?: string;
  root?: string;
  generatedAt?: string;
};

export type IntentPlanAnswerResult =
  | {
      status: "merged";
      report: IntentPlanActionabilityReport;
      blockers: [];
      appliedAnswers: number;
      unappliedAnswers: IntentPlanUnappliedAnswer[];
    }
  | {
      status: "blocked";
      report: null;
      blockers: IntentPlanAnswerBlocker[];
      appliedAnswers: 0;
      unappliedAnswers: IntentPlanUnappliedAnswer[];
    };

function parseBulletItems(answer: string): string[] {
  return answer
    .split(/\r?\n|;/)
    .map((s) => s.replace(/^\s*[-*]\s*/, "").trim())
    .filter((s) => s.length > 0);
}

function looksPathLike(token: string): boolean {
  return token.length > 0 && !/\s/.test(token) && /[/.]/.test(token);
}

function parsePathItems(answer: string): string[] {
  return answer
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => looksPathLike(t));
}

function parseCommandOrArtifactItems(answer: string): { commands: string[]; artifacts: string[] } {
  const lines = answer
    .split(/\r?\n|;/)
    .map((s) => s.replace(/^\s*[-*]\s*/, "").trim())
    .filter((s) => s.length > 0);
  const commands: string[] = [];
  const artifacts: string[] = [];
  for (const line of lines) {
    if (looksPathLike(line)) artifacts.push(line);
    else commands.push(line);
  }
  return { commands, artifacts };
}

function mergeUnique(target: string[], items: string[]): number {
  let added = 0;
  for (const item of items) {
    if (!target.includes(item)) {
      target.push(item);
      added += 1;
    }
  }
  return added;
}

function clonePhaseDraft(phase: IntentPlanPhaseDraft): IntentPlanPhaseDraft {
  return {
    ...phase,
    deliverables: [...phase.deliverables],
    acceptanceCriteria: [...phase.acceptanceCriteria],
    touchedPaths: [...phase.touchedPaths],
    verificationCommands: [...phase.verificationCommands],
    evidenceArtifacts: [...phase.evidenceArtifacts],
    constraints: [...phase.constraints],
    sourceEvidence: phase.sourceEvidence.map((e) => ({ ...e })),
    actionability: {
      status: phase.actionability.status,
      satisfiedRequirements: [...phase.actionability.satisfiedRequirements],
      missingRequirements: [...phase.actionability.missingRequirements],
    },
  };
}

const ANSWER_SUPPORTED_REQUIREMENTS = new Set<IntentPlanActionabilityRequirement>([
  "objective",
  "deliverables",
  "acceptance-criteria",
  "implementation-scope",
  "verification-evidence",
  "ambiguity-clearance",
  "phase-contract",
  "evidence-gates",
]);

export function buildAnsweredIntentPlanActionabilityReport(
  input: BuildAnsweredIntentPlanActionabilityReportInput,
): IntentPlanAnswerResult {
  const blockers: IntentPlanAnswerBlocker[] = [];
  const blocked = (): IntentPlanAnswerResult => ({ status: "blocked", report: null, blockers, appliedAnswers: 0, unappliedAnswers: [] });

  const report = input.report ?? null;
  const reportRef = input.reportRef ?? null;
  const answers = Array.isArray(input.answers) ? input.answers : [];

  if (!report || typeof report !== "object" || !Array.isArray(report.elicitationQuestions) || !Array.isArray(report.normalizedPhases)) {
    blockers.push({ id: "blocker-missing-report", category: "missing-report", severity: "blocker", message: "No source IntentPlanActionabilityReport was provided to answer." });
    return blocked();
  }
  if (!reportRef || typeof reportRef.type !== "string" || reportRef.type.length === 0 || typeof reportRef.id !== "string" || reportRef.id.length === 0) {
    blockers.push({ id: "blocker-missing-report-ref", category: "missing-report-ref", severity: "blocker", message: "A source report artifact reference (type + id) is required to record the merge trace." });
    return blocked();
  }

  const questionsById = new Map<string, IntentPlanElicitationQuestion>();
  for (const q of report.elicitationQuestions) questionsById.set(q.id, q);
  const phasesById = new Map<string, IntentPlanPhaseDraft>();
  for (const p of report.normalizedPhases) phasesById.set(p.id, p);

  type ResolvedAnswer = { questionId: string; answer: string; question: IntentPlanElicitationQuestion };
  const resolved: ResolvedAnswer[] = [];
  const seen = new Set<string>();

  for (const a of answers) {
    const questionId = typeof a?.questionId === "string" ? a.questionId : "";
    const answer = typeof a?.answer === "string" ? a.answer : "";
    if (questionId.length === 0 || answer.trim().length === 0) {
      blockers.push({ id: `blocker-empty-${questionId || "unknown"}`, category: "empty-answer", severity: "blocker", message: `Answer for "${questionId || "(missing id)"}" is empty.` });
      continue;
    }
    if (seen.has(questionId)) {
      blockers.push({ id: `blocker-duplicate-${questionId}`, category: "duplicate-answer", severity: "blocker", message: `Question "${questionId}" was answered more than once.` });
      continue;
    }
    seen.add(questionId);
    const question = questionsById.get(questionId);
    if (!question) {
      blockers.push({ id: `blocker-unknown-${questionId}`, category: "unknown-question", severity: "blocker", message: `Question "${questionId}" does not exist in the source report.` });
      continue;
    }
    if (!ANSWER_SUPPORTED_REQUIREMENTS.has(question.requirement)) {
      blockers.push({ id: `blocker-unsupported-${questionId}`, category: "unsupported-requirement", severity: "blocker", message: `Question "${questionId}" targets unsupported requirement "${question.requirement}".` });
      continue;
    }
    if (question.phaseId && !phasesById.has(question.phaseId)) {
      blockers.push({ id: `blocker-no-phase-${questionId}`, category: "no-applicable-phase", severity: "blocker", message: `Question "${questionId}" is scoped to phase "${question.phaseId}", which is not in the source report.` });
      continue;
    }
    // Only the "paths" shape can fail; sentence / bullets / command-or-artifact always
    // yield at least one item from non-empty text, so empty-answer already covers them.
    if (question.requirement === "implementation-scope" && parsePathItems(answer).length === 0) {
      blockers.push({ id: `blocker-shape-${questionId}`, category: "invalid-answer-shape", severity: "blocker", message: `Answer for "${questionId}" contains no path-like value (expected ${question.answerShape}).` });
      continue;
    }
    resolved.push({ questionId, answer, question });
  }

  if (blockers.length > 0) return blocked();

  // Apply answers into COPIES of the phase drafts. The source report is never mutated.
  const workingPhases = report.normalizedPhases.map(clonePhaseDraft);
  const workingById = new Map<string, IntentPlanPhaseDraft>();
  for (const p of workingPhases) workingById.set(p.id, p);

  const appliedRequirements: IntentPlanActionabilityRequirement[] = [];
  const unappliedAnswers: IntentPlanUnappliedAnswer[] = [];
  let appliedAnswers = 0;
  const answeredAt = typeof input.answeredAt === "string" && input.answeredAt.length > 0 ? input.answeredAt : new Date().toISOString();

  for (const { questionId, answer, question } of resolved) {
    const phase = question.phaseId ? workingById.get(question.phaseId) : undefined;
    if (!phase) {
      unappliedAnswers.push({ questionId, reason: "Answer is not scoped to a known phase." });
      continue;
    }
    const trimmed = answer.trim();
    let added = 0;
    switch (question.requirement) {
      case "objective": {
        if (phase.objective.trim().length === 0) {
          phase.objective = trimmed;
          added = 1;
        } else {
          added = mergeUnique(phase.constraints, [`clarification: ${trimmed}`]);
        }
        break;
      }
      case "ambiguity-clearance": {
        added = mergeUnique(phase.constraints, [`clarification: ${trimmed}`]);
        break;
      }
      case "deliverables": {
        added = mergeUnique(phase.deliverables, parseBulletItems(answer));
        break;
      }
      case "acceptance-criteria": {
        added = mergeUnique(phase.acceptanceCriteria, parseBulletItems(answer));
        break;
      }
      case "implementation-scope": {
        added = mergeUnique(phase.touchedPaths, parsePathItems(answer));
        break;
      }
      case "verification-evidence":
      case "evidence-gates": {
        const { commands, artifacts } = parseCommandOrArtifactItems(answer);
        added = mergeUnique(phase.verificationCommands, commands) + mergeUnique(phase.evidenceArtifacts, artifacts);
        break;
      }
      case "phase-contract": {
        added = mergeUnique(phase.constraints, parseBulletItems(answer));
        break;
      }
    }
    if (added > 0) {
      appliedAnswers += 1;
      if (!appliedRequirements.includes(question.requirement)) appliedRequirements.push(question.requirement);
    } else {
      unappliedAnswers.push({ questionId, reason: "All provided values were already present in the phase; no new content merged." });
    }
  }

  // Re-run the SAME actionability evaluator over the merged phases.
  const body = evaluatePlanPhases(workingPhases, { planPath: report.sourcePlan.path, goal: report.request?.goal });

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const idStamp = Date.parse(generatedAt);
  const artifactId = `${INTENT_PLAN_ACTIONABILITY_REPORT_ARTIFACT_ID_PREFIX}${Number.isFinite(idStamp) ? idStamp : Date.now()}`;
  const header: ArtifactHeader = {
    artifactType: "IntentPlanActionabilityReport",
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt,
    subject: { repoId: input.root ?? report.header.subject?.repoId ?? "." },
    producer: { id: "@rekon/capability-model.intent-plan-answer", version: "0.1.0-beta.0" },
    inputRefs: [reportRef],
    freshness: { status: "fresh" },
    provenance: { confidence: 0.9 },
  };

  const sourcePlan: IntentPlanActionabilityReport["sourcePlan"] = {
    sourceShape: report.sourcePlan.sourceShape,
    lineCount: report.sourcePlan.lineCount ?? 0,
  };
  if (report.sourcePlan.path) sourcePlan.path = report.sourcePlan.path;
  if (report.sourcePlan.sha256) sourcePlan.sha256 = report.sourcePlan.sha256;

  const answerTrace: IntentPlanMergeTrace = {
    sourceReportRef: reportRef,
    answers: resolved.map(({ questionId, answer }) => {
      const a: IntentPlanAnswer = { questionId, answer, answeredAt };
      if (input.answeredBy && input.answeredBy.length > 0) a.answeredBy = input.answeredBy;
      return a;
    }),
    appliedRequirements,
    unappliedAnswers,
    method: "deterministic",
  };

  const merged: IntentPlanActionabilityReport = {
    header,
    status: { value: body.status, reason: body.reason },
    sourcePlan,
    normalizationTrace: {
      method: "deterministic",
      invokedSemanticNormalization: false,
      rationale: "Answers were merged deterministically into the normalized phase drafts; actionability was re-evaluated.",
      provenance: "source-only",
      warnings: [],
    },
    normalizedPhases: body.evaluatedPhases,
    findings: body.findings,
    elicitationQuestions: body.questions,
    revisionPrompt: body.revisionPrompt,
    evidenceGates: body.evidenceGates,
    summary: body.summary,
    boundaries: {
      executedCommands: false,
      wroteSourceFiles: false,
      createdPreparedIntentPlan: false,
      createdWorkOrder: false,
      createdVerificationPlan: false,
      ranCirce: false,
      implementedIntentGo: false,
    },
    answerTrace,
  };
  if (report.request && (report.request.goal || report.request.kind)) {
    merged.request = {};
    if (report.request.goal) merged.request.goal = report.request.goal;
    if (report.request.kind) merged.request.kind = report.request.kind;
  }

  return { status: "merged", report: createIntentPlanActionabilityReport(merged), blockers: [], appliedAnswers, unappliedAnswers };
}
