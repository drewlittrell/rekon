// Intent plan bundle renderer.
//
// Projects the canonical Rekon intent artifacts (IntentAssessmentReport,
// PreparedIntentPlan, IntentStatusReport, WorkOrder, VerificationPlan, plus the
// optional PathFreshnessReport / RuntimeGraphDriftReport) into a regenerable
// human + LLM-agent handoff bundle that lives under
// `.rekon/intent/plans/<intent-id>/`.
//
// **Boundary.** The bundle is a *projection*, not canonical artifact truth.
// Canonical truth remains `.rekon/artifacts/`. This renderer is pure: it reads no
// files, writes no files, executes no commands, mutates no input, and never
// implements intent:go. The CLI persists the returned files under the bundle
// directory with path-traversal safety.
//
// See:
// - docs/strategy/intent-plan-bundle-agent-handoff-directory-decision.md
// - docs/concepts/intent-plan-bundle.md

import type { ArtifactRef } from "@rekon/kernel-artifacts";

export type IntentPlanBundleSource = {
  intentAssessmentReport?: unknown;
  intentAssessmentReportRef?: ArtifactRef;

  preparedIntentPlan?: unknown;
  preparedIntentPlanRef?: ArtifactRef;

  intentStatusReport?: unknown;
  intentStatusReportRef?: ArtifactRef;

  workOrder?: unknown;
  workOrderRef?: ArtifactRef;

  verificationPlan?: unknown;
  verificationPlanRef?: ArtifactRef;

  pathFreshnessReport?: unknown;
  pathFreshnessReportRef?: ArtifactRef;

  runtimeGraphDriftReport?: unknown;
  runtimeGraphDriftReportRef?: ArtifactRef;
};

export type IntentPlanBundleFile = {
  path: string;
  content: string;
};

export type IntentPlanBundleTarget = "generic" | "circe";

export type IntentPlanBundleRenderResult = {
  intentId: string;
  rootDir: string;
  files: IntentPlanBundleFile[];
  manifest: Record<string, unknown>;
};

export type BuildIntentPlanBundleInput = {
  rootDir?: string;
  intentId?: string;
  generatedAt?: string;
  /** Target projection to emit. Omitted defaults to `circe` for compatibility. */
  target?: IntentPlanBundleTarget;
  source: IntentPlanBundleSource;
  sourceDigests?: Record<string, string>;
  /**
   * Repo root recorded in the Circe handoff projection (`circe/handoff.json`
   * and `circe/phase-plan.json` `repoRoot`). Operators import with
   * `circe rekon-handoff validate --repo <repoRoot>`. Defaults to `"."`.
   */
  repoRoot?: string;
  /** Producer version recorded in the Circe handoff (`producer.version`). */
  producerVersion?: string;
  /**
   * Optional TaskContextReport bundle context (TaskContextReport Bundle Context,
   * slice 183). When present, the bundle carries these reports as OPTIONAL context
   * for agents/operators: an additive `manifest.context.taskContextReports[]` block
   * plus Rekon-side `context/` sidecar files. Never proof and never required —
   * empty/missing task context does not affect bundle success, and it never alters
   * WorkOrder / VerificationPlan / phase gates, proof status, or the Circe
   * projection. The report is read defensively (typed `unknown` like the other
   * bundle inputs).
   */
  taskContextReports?: Array<{ ref: ArtifactRef; report: unknown }>;
};

const DEFAULT_BUNDLE_ROOT = ".rekon/intent/plans";

/** Slug-safe id: lowercase, non-alphanumeric → "-", collapse repeats, trim "-". */
export function slugifyIntentId(value: string): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A bundle file path is safe when it is relative, segment-clean, and traversal-free. */
export function isSafeBundleRelativePath(p: string): boolean {
  if (typeof p !== "string" || p.length === 0) return false;
  if (p.startsWith("/") || /^[A-Za-z]:/.test(p)) return false;
  if (p.includes("\\") || p.includes("\0")) return false;
  for (const segment of p.split("/")) {
    if (segment === "" || segment === "." || segment === "..") return false;
  }
  return true;
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `sha-fnv1a-${hash.toString(16).padStart(8, "0")}`;
}

function refString(ref: ArtifactRef | undefined): string | undefined {
  if (!ref || typeof ref.type !== "string" || typeof ref.id !== "string") return undefined;
  return `${ref.type}:${ref.id}`;
}

/** `Type:id` string for an ArtifactRef-shaped record value, or null. */
function refRecordString(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.type !== "string" || typeof rec.id !== "string") return null;
  return `${rec.type}:${rec.id}`;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function bullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- (none)";
}

const BOUNDARY_NOTE =
  "This bundle is a projection of canonical artifacts under `.rekon/artifacts/`. " +
  "Bundle generation executes no commands, writes no source files, and does not implement intent:go.";

// ---------------------------------------------------------------------------
// Circe handoff projection (slice 99)
//
// Projects the prepared intent plan bundle into Circe's `rekon-circe-handoff`
// import package under `circe/`. Grounded in the real Circe source
// (`src/adapters/rekon-handoff.ts`, `rekon-phase-plan-import.ts`,
// `rekon-phase-plan-validate.ts`, `src/rekon/RekonTypes.ts`) — the schema is not
// inferred from filenames. Circe requires one WorkOrder per phase (VerificationPlan
// optional), so the projection derives one per PreparedIntentPlan phase using the
// canonical Rekon WorkOrder / VerificationPlan shapes. These are projection files,
// not registered artifacts. Rekon emits the projection; it does not run Circe, does
// not execute commands, and writes no source files.
//
// See docs/strategy/intent-plan-bundle-circe-handoff-projection-decision.md.

type CirceHandoffArtifactRef = { phaseId: string; path: string; artifactId: string };

/**
 * Per-phase verification posture (slice 115). Makes phase-level verification
 * explicit in the bundle / Circe projection so a phase without an executable
 * VerificationPlan is never silently read as proof.
 * - `executable`: an implementation phase that carries safe executable verification.
 * - `final-verification`: the final verification phase carrying executable verification.
 * - `manual-review`: a reviewer-gated phase; no executable verification is implied.
 * - `needs-review`: a phase that should carry verification but has no safe
 *   executable requirement — explicitly unverified, not skipped-as-proof.
 */
export type IntentPhaseVerificationPosture =
  | "executable"
  | "manual-review"
  | "final-verification"
  | "needs-review";

type PhaseVerificationSummary = {
  executable: number;
  manualReview: number;
  finalVerification: number;
  needsReview: number;
};

type CirceProjectionResult = {
  files: IntentPlanBundleFile[];
  manifestCirce: Record<string, unknown>;
  warnings: string[];
  phaseCount: number;
  workOrderCount: number;
  verificationPlanCount: number;
  phaseGates: CircePhaseGate[];
  phaseVerification: PhaseVerificationSummary;
};

type RenderCirceProjectionInput = {
  intentId: string;
  generatedAt: string;
  repoRoot: string;
  goal: string;
  planRef?: ArtifactRef;
  producerVersion: string | null;
  phases: Record<string, unknown>[];
  requirements: Record<string, unknown>[];
  obligations: Record<string, unknown>[];
  workOrderSchemaVersion: string;
  verificationPlanSchemaVersion: string;
  // Proof/gate enrichment (slice 101).
  hasPreparedPlan: boolean;
  sourceArtifacts: Record<string, { ref: string; digest: string }>;
  approval: Record<string, unknown>;
  planStatusValue: string;
  planNextAction: string;
  intentStatusValue: string;
  intentStatusNextAction: string;
};

const CIRCE_ACTOR_CONTRACT_REFS = {
  implementer: {
    path: "actor-contracts/implementer.md",
    schemaPath: "actor-contracts/implementation-handoff.schema.json",
    outputContract: "implementation_handoff",
  },
  reviewer: {
    path: "actor-contracts/reviewer.md",
    schemaPath: "actor-contracts/review-verdict.schema.json",
    outputContract: "review_verdict",
  },
  plannerVerifier: {
    path: "actor-contracts/planner-verifier.md",
    schemaPath: "actor-contracts/planner-decision.schema.json",
    outputContract: "planner_decision",
  },
} as const;

const CIRCE_OPERATOR_COMMAND_BOUNDARY = [
  "## Operator Command Boundary",
  "",
  "Do not run Circe cockpit/report/admin commands from inside the worker phase.",
  "",
  "Commands such as `circe handoffs show`, `circe phase report`, `circe handoffs trace`, `circe admin attention`, `circe workers status`, and `circe actors pipeline` are operator inspection commands.",
  "",
  "They belong after or outside actor execution. If a plan asks you to run them as implementation verification, report that as a plan-quality concern.",
].join("\n");

const CIRCE_IMPLEMENTER_CONTRACT = [
  "# Circe Implementer Completion Handoff",
  "",
  "When your implementation turn is complete, return an implementation handoff.",
  "",
  "Required fields:",
  "",
  "- `status`: `implemented`, `blocked`, or `failed`",
  "- `summary`: concise description of what changed",
  "- `changedFiles`: files you changed",
  "- `commandsRun`: commands you personally ran; use `[]` if none",
  "- `verification`: checks you personally ran; use `[]` if none",
  "- `residualRisk`: risks or uncertainties; use `[]` if none",
  "- `blockers`: blockers if unable to complete; use `[]` if none",
  "",
  "Rules:",
  "",
  "- Do not claim commands you did not run.",
  "- Do not list Circe/Rekon verification as commands you personally ran.",
  "- Do not invent changed files.",
  "- Do not omit files you know you edited.",
  "- Do not run `git add`, `git commit`, or `git push`.",
  "- Leave changes uncommitted for Circe to inspect, verify, commit, and publish.",
  "",
  CIRCE_OPERATOR_COMMAND_BOUNDARY,
].join("\n");

const CIRCE_REVIEWER_CONTRACT = [
  "# Circe Reviewer Verdict Handoff",
  "",
  "Review the implementation evidence that Circe provides and return a review verdict.",
  "",
  "Required fields:",
  "",
  "- `phase_id`",
  "- `verdict`: `approved`, `rework_required`, or `blocked`",
  "- `approved_for_phase_completion`",
  "- `required_rework`",
  "- `review_evidence`",
  "- `risk_assessment`",
  "- `summary`",
  "",
  "Rules:",
  "",
  "- Do not edit source files.",
  "- Cite concrete evidence from the diff, worker output, verification, and constraints.",
  "- If implementation or verification evidence is incomplete, do not approve.",
  "",
  CIRCE_OPERATOR_COMMAND_BOUNDARY,
].join("\n");

const CIRCE_PLANNER_VERIFIER_CONTRACT = [
  "# Circe Planner / Verifier Decision Handoff",
  "",
  "Decide the next orchestration action using the implementation, review, verification, and phase-candidate evidence Circe provides.",
  "",
  "Required fields:",
  "",
  "- `phase_id`",
  "- `phase_complete`",
  "- `next_action`: `next_phase`, `rework`, `debug`, `revise_plan`, or `stop`",
  "- `plan_updates`",
  "- `next_phase_id`",
  "- `reasoning_summary`",
  "",
  "Rules:",
  "",
  "- Do not edit source files.",
  "- Choose `next_phase` only with sufficient implementation, review, and verification evidence.",
  "- Use only valid next phase candidates supplied by Circe.",
  "- Provide a concise reason, not hidden chain-of-thought.",
  "",
  CIRCE_OPERATOR_COMMAND_BOUNDARY,
].join("\n");

const CIRCE_IMPLEMENTATION_HANDOFF_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Circe Implementation Handoff",
  type: "object",
  required: ["status", "summary", "changedFiles", "commandsRun", "verification", "residualRisk", "blockers"],
  properties: {
    status: { enum: ["implemented", "blocked", "failed"] },
    summary: { type: "string" },
    changedFiles: { type: "array", items: { type: "string" } },
    commandsRun: { type: "array" },
    verification: { type: "array" },
    residualRisk: { type: "array", items: { type: "string" } },
    blockers: { type: "array", items: { type: "string" } },
  },
  additionalProperties: true,
};

const CIRCE_REVIEW_VERDICT_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Circe Review Verdict",
  type: "object",
  required: ["phase_id", "verdict", "approved_for_phase_completion", "required_rework", "review_evidence", "risk_assessment", "summary"],
  properties: {
    phase_id: { type: "string" },
    verdict: { enum: ["approved", "rework_required", "blocked"] },
    approved_for_phase_completion: { type: "boolean" },
    required_rework: { type: "array" },
    review_evidence: { type: "array" },
    risk_assessment: { type: "string" },
    summary: { type: "string" },
  },
  additionalProperties: true,
};

const CIRCE_PLANNER_DECISION_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Circe Planner Decision",
  type: "object",
  required: ["phase_id", "phase_complete", "next_action", "plan_updates", "next_phase_id", "reasoning_summary"],
  properties: {
    phase_id: { type: "string" },
    phase_complete: { type: "boolean" },
    next_action: { enum: ["next_phase", "rework", "debug", "revise_plan", "stop"] },
    plan_updates: { type: "array" },
    next_phase_id: { type: ["string", "null"] },
    reasoning_summary: { type: "string" },
  },
  additionalProperties: true,
};

function renderCirceActorContractFiles(): IntentPlanBundleFile[] {
  return [
    { path: `circe/${CIRCE_ACTOR_CONTRACT_REFS.implementer.path}`, content: `${CIRCE_IMPLEMENTER_CONTRACT}\n` },
    { path: `circe/${CIRCE_ACTOR_CONTRACT_REFS.reviewer.path}`, content: `${CIRCE_REVIEWER_CONTRACT}\n` },
    { path: `circe/${CIRCE_ACTOR_CONTRACT_REFS.plannerVerifier.path}`, content: `${CIRCE_PLANNER_VERIFIER_CONTRACT}\n` },
    {
      path: `circe/${CIRCE_ACTOR_CONTRACT_REFS.implementer.schemaPath}`,
      content: `${JSON.stringify(CIRCE_IMPLEMENTATION_HANDOFF_SCHEMA, null, 2)}\n`,
    },
    {
      path: `circe/${CIRCE_ACTOR_CONTRACT_REFS.reviewer.schemaPath}`,
      content: `${JSON.stringify(CIRCE_REVIEW_VERDICT_SCHEMA, null, 2)}\n`,
    },
    {
      path: `circe/${CIRCE_ACTOR_CONTRACT_REFS.plannerVerifier.schemaPath}`,
      content: `${JSON.stringify(CIRCE_PLANNER_DECISION_SCHEMA, null, 2)}\n`,
    },
  ];
}

type CircePhaseGate = {
  phaseId: string;
  title: string;
  kind: string;
  sourceChange: string;
  classificationSource: string | null;
  approvalStatus: string;
  readyForCirce: boolean;
  obligationIds: string[];
  verificationRequirementIds: string[];
  verificationPosture: IntentPhaseVerificationPosture;
  manualGate: boolean;
  needsReview: boolean;
  reason: string;
  verificationPlanPath?: string;
  blockers: string[];
  warnings: string[];
  boundaries: { sourceWriteAllowed: false; commandsExecuted: false; intentGoDeferred: true };
};

function sourceChangeForPhaseKind(kind: string): "required" | "allowed" | "forbidden" {
  if (kind === "modify" || kind === "implement" || kind === "refactor") return "required";
  if (kind === "investigate" || kind === "review" || kind === "verify") return "forbidden";
  return "allowed";
}

function phaseSourceChangePolicy(phase: Record<string, unknown>, kind: string): "required" | "allowed" | "forbidden" {
  const raw = asString(phase.sourceChange);
  if (raw === "required" || raw === "allowed" || raw === "forbidden") return raw;
  return sourceChangeForPhaseKind(kind);
}

/** Slug-safe, de-duplicated phase id (Circe rejects duplicate phaseIds). */
function uniquePhaseId(raw: string, index: number, seen: Set<string>): string {
  let base = slugifyIntentId(raw);
  if (base.length === 0) base = `phase-${index + 1}`;
  let candidate = base;
  let n = 2;
  while (seen.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  seen.add(candidate);
  return candidate;
}

/**
 * Render the `circe/` projection. Pure: derives per-phase WorkOrder /
 * VerificationPlan JSON in the canonical Rekon shapes that Circe's
 * `normalizeRekonWorkOrder` / `normalizeRekonVerificationPlan` accept, plus the
 * `handoff.json` manifest and `phase-plan.json`. A phase with no verification
 * requirement omits its VerificationPlan and records a manifest warning.
 */
function renderCirceProjection(input: RenderCirceProjectionInput): CirceProjectionResult {
  const warnings: string[] = [];

  const requirementById = new Map<string, { command: string; reason: string }>();
  for (const r of input.requirements) {
    const id = asString(r.id);
    if (id.length === 0) continue;
    requirementById.set(id, { command: asString(r.command), reason: asString(r.reason, "Verify the change.") });
  }
  const obligationMessageById = new Map<string, string>();
  for (const o of input.obligations) {
    const id = asString(o.id);
    if (id.length === 0) continue;
    obligationMessageById.set(id, asString(o.message) || id);
  }
  // Plan-level "safe executable" requirement ids: those that carry an actual
  // command. These are the only requirements that can back an `executable` /
  // `final-verification` posture; a requirement with no command (e.g. a
  // document-findings reviewer obligation) is not executable verification.
  const executableRequirementIds = [...requirementById.entries()]
    .filter(([, r]) => r.command.length > 0)
    .map(([id]) => id);

  let phases = input.phases;
  if (phases.length === 0) {
    phases = [
      {
        id: "phase-1",
        title: input.goal,
        goal: input.goal,
        paths: [],
        systems: [],
        constraints: [],
        obligations: [],
        verificationRequirements: input.requirements.map((r) => asString(r.id)).filter((id) => id.length > 0),
      },
    ];
    warnings.push("Circe projection used a synthesized fallback phase because the prepared plan declared no phases.");
  }
  const singlePhase = phases.length === 1;

  const inputRefs = input.planRef
    ? [{ type: input.planRef.type, id: input.planRef.id, schemaVersion: input.planRef.schemaVersion ?? null }]
    : [];

  // Proof/gate facts shared by every phase. A plan only carries an approved gate
  // when it exists and was approved; otherwise readyForCirce stays false.
  const planRefStr = refString(input.planRef) ?? null;
  const approvalStatus = input.hasPreparedPlan ? asString(input.approval.status, "unknown") : "unknown";
  const planApproved = approvalStatus === "approved" && input.planStatusValue === "prepared";
  const proofRec = asRecord(input.approval.proof);
  const downstream = asRecord(proofRec.downstreamHandoff);
  const sourceRefList = Object.values(input.sourceArtifacts).map((entry) => entry.ref);
  const phaseBoundaries = { sourceWriteAllowed: false, commandsExecuted: false, intentGoDeferred: true } as const;

  const seen = new Set<string>();
  const phaseEntries: Array<Record<string, unknown>> = [];
  const phaseGates: CircePhaseGate[] = [];
  const workOrderFiles: IntentPlanBundleFile[] = [];
  const verificationPlanFiles: IntentPlanBundleFile[] = [];
  const handoffWorkOrders: CirceHandoffArtifactRef[] = [];
  const handoffVerificationPlans: CirceHandoffArtifactRef[] = [];

  phases.forEach((p, index) => {
    const phaseId = uniquePhaseId(asString(p.id) || asString(p.title), index, seen);
    const title = asString(p.title) || asString(p.id, `Phase ${index + 1}`);
    const goal = asString(p.goal) || asString(p.title) || input.goal || "(unknown goal)";
    const paths = asArray(p.paths).map((x) => asString(x)).filter(Boolean);
    const systems = asArray(p.systems).map((x) => asString(x)).filter(Boolean);
    const constraints = asArray(p.constraints).map((x) => asString(x)).filter(Boolean);
    const obligationIds = asArray(p.obligations).map((x) => asString(x)).filter(Boolean);
    const obligationMessages = obligationIds
      .map((id) => obligationMessageById.get(id))
      .filter((m): m is string => typeof m === "string" && m.length > 0);
    const riskNotes = [...constraints, ...obligationMessages];

    let declaredRequirementIds = asArray(p.verificationRequirements).map((x) => asString(x)).filter(Boolean);
    if (declaredRequirementIds.length === 0 && singlePhase) {
      declaredRequirementIds = [...requirementById.keys()];
    }
    const phaseReady = planApproved && asString(p.status) !== "blocked";

    // ---- Phase verification posture (slice 115) ----
    // Derive an explicit posture from the phase kind + the safe executable
    // requirements that can apply. An implementation phase whose plan declares
    // safe executable verification carries it (mapped) even when the canonical
    // plan only attached requirements to the verify phase; a phase with no safe
    // executable requirement is recorded as needs-review (explicitly unverified),
    // and investigation / review phases are reviewer-gated (manual-review).
    // Skipped verification is never represented as proof.
    const phaseKind = asString(p.kind);
    const sourceChange = phaseSourceChangePolicy(p, phaseKind);
    const classification = asRecord(p.classification);
    const classificationSource = asString(classification.source) || null;
    const classificationSignals = asArray(classification.signals).map((x) => asString(x)).filter(Boolean);
    const classificationWarnings = asArray(classification.warnings).map((x) => asString(x)).filter(Boolean);
    const ownExecutableIds = declaredRequirementIds.filter((id) => executableRequirementIds.includes(id));
    let verificationPosture: IntentPhaseVerificationPosture;
    let effectiveRequirementIds: string[];
    let manualGate = false;
    let needsReview = false;
    let postureReason: string;
    if (phaseKind === "verify") {
      effectiveRequirementIds = ownExecutableIds.length > 0 ? ownExecutableIds : executableRequirementIds;
      if (effectiveRequirementIds.length > 0) {
        verificationPosture = "final-verification";
        postureReason = "Final verification phase carries the executable verification requirements.";
      } else {
        verificationPosture = "needs-review";
        needsReview = true;
        postureReason = "Verification phase has no executable verification requirement; recorded as needs-review.";
      }
    } else if (phaseKind === "modify" || phaseKind === "implement" || phaseKind === "refactor") {
      effectiveRequirementIds = ownExecutableIds.length > 0 ? ownExecutableIds : executableRequirementIds;
      if (effectiveRequirementIds.length > 0) {
        verificationPosture = "executable";
        postureReason = "Safe verification requirements apply to the implementation phase.";
      } else {
        verificationPosture = "needs-review";
        needsReview = true;
        effectiveRequirementIds = [];
        postureReason = "Implementation phase has no safe verification requirement; recorded as needs-review (not verified).";
      }
    } else if (ownExecutableIds.length > 0) {
      // investigate / review / unknown with explicitly attached executable verification.
      verificationPosture = "executable";
      effectiveRequirementIds = ownExecutableIds;
      postureReason = "Explicit verification requirements attach to this phase.";
    } else {
      verificationPosture = "manual-review";
      manualGate = true;
      effectiveRequirementIds = [];
      postureReason =
        phaseKind === "investigate"
          ? "Investigation phase is reviewer-gated; no executable verification is implied."
          : phaseKind === "review"
            ? "Review phase is reviewer-gated; no executable verification is implied."
            : "Phase is reviewer-gated by default; no executable verification is implied.";
    }

    const phaseRequirements = effectiveRequirementIds
      .map((id) => requirementById.get(id))
      .filter((r): r is { command: string; reason: string } => Boolean(r));
    const commands = uniqueStrings(phaseRequirements.map((r) => r.command).filter((c) => c.length > 0));
    const reasons = uniqueStrings(phaseRequirements.map((r) => r.reason).filter((c) => c.length > 0));
    const emitVerificationPlan =
      (verificationPosture === "executable" || verificationPosture === "final-verification") && commands.length > 0;

    const workOrderArtifactId = `${input.intentId}-${phaseId}.work-order`;
    const verificationPlanArtifactId = `${input.intentId}-${phaseId}.verification-plan`;
    const workOrderRelPath = `work-orders/${phaseId}.work-order.json`;
    const verificationPlanRelPath = `verification-plans/${phaseId}.verification-plan.json`;

    // Canonical Rekon WorkOrder shape (Circe normalizeRekonWorkOrder).
    const workOrder = {
      header: {
        artifactType: "WorkOrder",
        artifactId: workOrderArtifactId,
        schemaVersion: input.workOrderSchemaVersion,
        generatedAt: input.generatedAt,
        inputRefs,
      },
      goal,
      paths,
      ownerSystems: systems,
      riskNotes,
      requiredChecks: commands,
      successCriteria: reasons.length > 0 ? reasons : [`Complete phase: ${title}.`],
      relevantFindings: [],
      relevantMemory: [],
      antiGamingInstruction: null,
      markdown: null,
      source: "intent-handoff",
      remediationItems: [],
      // Proof/gate traceability (slice 101). Additive; Circe's normalizeRekonWorkOrder
      // ignores unknown fields, so this stays schema-valid.
      intentHandoff: {
        preparedIntentPlanRef: planRefStr,
        phaseId,
        phaseKind,
        sourceChange,
        classificationSource,
        classification: {
          source: classificationSource,
          signals: classificationSignals,
          warnings: classificationWarnings,
        },
        approvalStatus,
        obligationIds,
        verificationRequirementIds: effectiveRequirementIds,
        verificationPosture,
        sourceRefs: sourceRefList,
        boundaries: phaseBoundaries,
      },
    };
    workOrderFiles.push({ path: `circe/${workOrderRelPath}`, content: `${JSON.stringify(workOrder, null, 2)}\n` });
    handoffWorkOrders.push({ phaseId, path: workOrderRelPath, artifactId: workOrderArtifactId });

    let verificationPlanPath: string | undefined;
    if (emitVerificationPlan) {
      // Canonical Rekon VerificationPlan shape (Circe normalizeRekonVerificationPlan).
      const verificationPlan = {
        header: {
          artifactType: "VerificationPlan",
          artifactId: verificationPlanArtifactId,
          schemaVersion: input.verificationPlanSchemaVersion,
          generatedAt: input.generatedAt,
          inputRefs: [{ type: "WorkOrder", id: workOrderArtifactId, schemaVersion: input.workOrderSchemaVersion }],
        },
        workOrderRef: { type: "WorkOrder", id: workOrderArtifactId, schemaVersion: input.workOrderSchemaVersion },
        commands,
        successCriteria: reasons.length > 0 ? reasons : [`Verify phase: ${title}.`],
        source: "intent-handoff",
        // Proof/gate traceability (slice 101). Additive; Circe's
        // normalizeRekonVerificationPlan ignores unknown fields.
        intentHandoff: {
          preparedIntentPlanRef: planRefStr,
          phaseId,
          phaseKind,
          sourceChange,
          classificationSource,
          classification: {
            source: classificationSource,
            signals: classificationSignals,
            warnings: classificationWarnings,
          },
          verificationPosture,
          verificationRequirementIds: effectiveRequirementIds,
          sourceRefs: sourceRefList,
          boundaries: {
            createsVerificationRun: false,
            executesCommands: false,
            writesSourceFiles: false,
            intentGoDeferred: true,
          },
        },
      };
      verificationPlanFiles.push({
        path: `circe/${verificationPlanRelPath}`,
        content: `${JSON.stringify(verificationPlan, null, 2)}\n`,
      });
      handoffVerificationPlans.push({ phaseId, path: verificationPlanRelPath, artifactId: verificationPlanArtifactId });
      verificationPlanPath = verificationPlanRelPath;
    } else if (needsReview) {
      // Explicitly unverified: a phase that should carry verification but has no
      // safe executable requirement. Surfaced as a warning so skipped verification
      // is never silently read as proof.
      warnings.push(
        `Phase ${phaseId} (${phaseKind || "phase"}) has no safe executable verification requirement; recorded as needs-review (not verified, not proof).`,
      );
    }

    const phaseWarnings: string[] = [];
    if (needsReview) {
      phaseWarnings.push("No safe executable verification requirement; recorded as needs-review (not verified).");
    } else if (manualGate) {
      phaseWarnings.push("Reviewer-gated phase; no executable verification is implied.");
    }
    phaseGates.push({
      phaseId,
      title,
      kind: phaseKind,
      sourceChange,
      classificationSource,
      approvalStatus,
      readyForCirce: phaseReady,
      obligationIds,
      verificationRequirementIds: effectiveRequirementIds,
      verificationPosture,
      manualGate,
      needsReview,
      reason: postureReason,
      ...(verificationPlanPath ? { verificationPlanPath } : {}),
      blockers: [],
      warnings: phaseWarnings,
      boundaries: phaseBoundaries,
    });

    phaseEntries.push({
      phaseId,
      title,
      sourceChangePolicy: sourceChange,
      workOrderPath: workOrderRelPath,
      ...(verificationPlanPath ? { verificationPlanPath } : {}),
      // implementerProfile omitted by default: Rekon does not know the operator's
      // Circe workflow profiles. Circe applies its default routing.
      // Proof/gate metadata (slice 101). Additive; Circe's normalizePhasePlan ignores
      // unknown phase fields, so this stays schema-valid.
      rekon: {
        phaseKind,
        sourceChange,
        classificationSource,
        classification: {
          source: classificationSource,
          signals: classificationSignals,
          warnings: classificationWarnings,
        },
        approvalStatus,
        readyForCirce: phaseReady,
        obligationIds,
        verificationRequirementIds: effectiveRequirementIds,
        verificationPosture,
        manualGate,
        needsReview,
      },
    });
  });

  // phase-plan.json (Circe normalizePhasePlan / validatePhasePlanShape).
  const phasePlan = {
    schemaVersion: 1,
    planId: input.intentId,
    repoRoot: input.repoRoot,
    phases: phaseEntries,
  };

  // handoff.json (Circe RekonHandoffManifest / validateHandoffShape). Paths are
  // relative to the `circe/` directory. `rekonProofPath` is an additive pointer;
  // Circe's normalizeHandoffManifest ignores unknown fields, so it stays schema-valid.
  const handoff = {
    schemaVersion: 1,
    kind: "rekon-circe-handoff",
    handoffId: input.intentId,
    repoRoot: input.repoRoot,
    sourcePlanPath: "../prepared-plan.md",
    phasePlanPath: "phase-plan.json",
    rekonProofPath: "rekon-proof.json",
    producer: { system: "rekon", version: input.producerVersion },
    status: "ready",
    warnings,
    artifacts: { workOrders: handoffWorkOrders, verificationPlans: handoffVerificationPlans },
    actorContracts: CIRCE_ACTOR_CONTRACT_REFS,
  };

  // rekon-proof.json (slice 101): the Rekon-specific proof/gate sidecar for Circe
  // import review. Fully Rekon-owned (not a Circe-validated file). Carries the
  // PreparedIntentPlan approval/proof envelope, the IntentStatusReport gate state, the
  // freshness/drift proof refs, and per-phase gate metadata. Never claims approval or
  // readiness the source artifacts do not support; always pins the source-write /
  // command-execution / intent:go boundaries.
  const proofBlock = (value: unknown, refKey: string): Record<string, unknown> => {
    const rec = asRecord(value);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rec)) {
      if (k === refKey) continue;
      out[k] = v;
    }
    out.ref = refRecordString(rec[refKey]);
    return out;
  };
  const planStructure = asRecord(proofRec.planStructure);
  const verificationProof = asRecord(proofRec.verification);
  const rekonProof = {
    schemaVersion: "0.1.0",
    kind: "rekon-circe-proof",
    intentId: input.intentId,
    generatedAt: input.generatedAt,
    sourceArtifacts: input.sourceArtifacts,
    approval: {
      status: approvalStatus,
      reasons: asArray(input.approval.reasons).map((r) => asString(r)).filter(Boolean),
    },
    intentStatus: {
      value: input.intentStatusValue || input.planStatusValue || "unknown",
      recommendedNextAction: input.intentStatusNextAction || input.planNextAction || "(none)",
    },
    gates: {
      preparedPlanApproved: approvalStatus === "approved",
      workOrderAllowed: approvalStatus === "approved" && asBool(downstream.workOrderAllowed),
      verificationPlanAllowed: approvalStatus === "approved" && asBool(downstream.verificationPlanAllowed),
      sourceWriteAllowed: false,
      commandsExecuted: false,
      // Rekon never runs Circe during bundle generation; the bundle is a passive
      // projection for Circe to import. Surfaced explicitly (slice 140 dogfood)
      // so the Circe-import contract carries the no-Circe-run boundary as a field.
      runsCirce: false,
      intentGoDeferred: true,
    },
    proof: {
      runtimeDrift: proofBlock(proofRec.runtimeDrift, "runtimeGraphDriftReportRef"),
      handoffCoverage: proofBlock(proofRec.handoffCoverage, "handoffCoverageReportRef"),
      freshness: proofBlock(proofRec.freshness, "pathFreshnessReportRef"),
      verification: {
        requirementsPresent: asBool(verificationProof.requirementsPresent) || input.requirements.length > 0,
        proofResultsPresent: asBool(verificationProof.proofResultsPresent),
        verificationRefs: asArray(verificationProof.verificationRefs)
          .map((r) => refRecordString(r))
          .filter((r): r is string => typeof r === "string"),
      },
      planStructure: {
        phasesPresent: asBool(planStructure.phasesPresent) || phaseEntries.length > 0,
        minimumPhaseCountMet: asBool(planStructure.minimumPhaseCountMet),
        hasInvestigation: asBool(planStructure.hasInvestigation),
        hasImplementationOrRefactor: asBool(planStructure.hasImplementationOrRefactor),
        hasVerification: asBool(planStructure.hasVerification),
        hasReview: asBool(planStructure.hasReview),
      },
    },
    phaseGates,
    warnings,
  };

  const files: IntentPlanBundleFile[] = [
    { path: "circe/handoff.json", content: `${JSON.stringify(handoff, null, 2)}\n` },
    { path: "circe/phase-plan.json", content: `${JSON.stringify(phasePlan, null, 2)}\n` },
    { path: "circe/rekon-proof.json", content: `${JSON.stringify(rekonProof, null, 2)}\n` },
    ...renderCirceActorContractFiles(),
    ...workOrderFiles,
    ...verificationPlanFiles,
  ];

  const phaseVerification: PhaseVerificationSummary = {
    executable: phaseGates.filter((g) => g.verificationPosture === "executable").length,
    manualReview: phaseGates.filter((g) => g.verificationPosture === "manual-review").length,
    finalVerification: phaseGates.filter((g) => g.verificationPosture === "final-verification").length,
    needsReview: phaseGates.filter((g) => g.verificationPosture === "needs-review").length,
  };

  const manifestCirce = {
    handoff: "circe/handoff.json",
    phasePlan: "circe/phase-plan.json",
    rekonProof: "circe/rekon-proof.json",
    workOrdersDir: "circe/work-orders",
    verificationPlansDir: "circe/verification-plans",
    actorContractsDir: "circe/actor-contracts",
    actorContracts: {
      implementer: `circe/${CIRCE_ACTOR_CONTRACT_REFS.implementer.path}`,
      reviewer: `circe/${CIRCE_ACTOR_CONTRACT_REFS.reviewer.path}`,
      plannerVerifier: `circe/${CIRCE_ACTOR_CONTRACT_REFS.plannerVerifier.path}`,
      implementationHandoffSchema: `circe/${CIRCE_ACTOR_CONTRACT_REFS.implementer.schemaPath}`,
      reviewVerdictSchema: `circe/${CIRCE_ACTOR_CONTRACT_REFS.reviewer.schemaPath}`,
      plannerDecisionSchema: `circe/${CIRCE_ACTOR_CONTRACT_REFS.plannerVerifier.schemaPath}`,
    },
    schemaVersion: 1,
    kind: "rekon-circe-handoff",
    workOrders: handoffWorkOrders.length,
    verificationPlans: handoffVerificationPlans.length,
    phaseVerification,
    warnings: warnings.length,
  };

  return {
    files,
    manifestCirce,
    warnings,
    phaseCount: phaseEntries.length,
    workOrderCount: handoffWorkOrders.length,
    verificationPlanCount: handoffVerificationPlans.length,
    phaseGates,
    phaseVerification,
  };
}

// ---- TaskContextReport bundle context (slice 183) ----
// Pure: projects already-loaded TaskContextReport artifacts into OPTIONAL
// Rekon-side context sidecars + the additive manifest `context` block. The
// reports are context, never proof: nothing here alters gates, proof status, the
// Circe projection, WorkOrders, or VerificationPlans. Reads reports defensively.
type TaskContextBundleEntry = { ref: ArtifactRef; report: unknown };

const TASK_CONTEXT_CORE_SOURCES = new Set(["operator_input", "deterministic_graph"]);
const TASK_CONTEXT_SUPPORTING_SOURCES = new Set([
  "embedding_retrieval",
  "semantic_file_understanding",
]);
const TASK_CONTEXT_SIDECAR_MARKDOWN = "context/task-context.md";
const TASK_CONTEXT_SIDECAR_AGENT = "context/task-context.agent.json";
const TASK_CONTEXT_SIDECAR_REFS = "context/task-context.refs.json";
const TASK_CONTEXT_BOUNDARIES = {
  proof: false,
  approvesPlans: false,
  executesCommands: false,
  writesSourceFiles: false,
  runsCirce: false,
  implementsIntentGo: false,
} as const;

function stringList(value: unknown): string[] {
  return asArray(value)
    .map((entry) => asString(entry))
    .filter((entry) => entry.length > 0);
}

function projectTaskContextAgent(report: Record<string, unknown>): Record<string, unknown> {
  const task = asRecord(report.task);
  const items = asArray(report.contextItems).map((item) => asRecord(item));
  const toItem = (item: Record<string, unknown>) => {
    const ref =
      asString(item.path) || asString(item.symbolId) || asString(item.capabilityId) || asString(item.id);
    return {
      ref,
      kind: asString(item.kind),
      source: asString(item.source),
      reason: asString(item.reason),
      evidenceRefs: stringList(item.evidenceRefs),
    };
  };
  const core = items.filter((i) => TASK_CONTEXT_CORE_SOURCES.has(asString(i.source))).map(toItem);
  const supporting = items
    .filter((i) => TASK_CONTEXT_SUPPORTING_SOURCES.has(asString(i.source)))
    .map(toItem);
  const doNotTouch = asArray(report.doNotTouch).map((zone) => {
    const z = asRecord(zone);
    return {
      reason: asString(z.reason),
      ...(asString(z.path) ? { path: asString(z.path) } : {}),
      evidenceRefs: stringList(z.evidenceRefs),
      enforced: false as const,
    };
  });
  const verificationHints = asArray(report.verificationHints).map((hint) => {
    const h = asRecord(hint);
    return {
      ...(asString(h.command) ? { command: asString(h.command) } : {}),
      ...(asString(h.artifact) ? { artifact: asString(h.artifact) } : {}),
      reason: asString(h.reason),
      executed: false as const,
    };
  });
  const evidence = Array.from(
    new Set([
      ...items.flatMap((i) => stringList(i.evidenceRefs)),
      ...asArray(report.doNotTouch).flatMap((z) => stringList(asRecord(z).evidenceRefs)),
      ...asArray(report.verificationHints).flatMap((h) => stringList(asRecord(h).evidenceRefs)),
    ]),
  ).sort();
  return {
    task: {
      text: asString(task.text),
      paths: stringList(task.paths),
      ...(asString(task.goal) ? { goal: asString(task.goal) } : {}),
    },
    coreContext: core,
    supportingContext: supporting,
    doNotTouch,
    verificationHints,
    evidence,
    boundaries: { ...TASK_CONTEXT_BOUNDARIES },
  };
}

function renderTaskContextSidecars(entries: TaskContextBundleEntry[]):
  | { files: IntentPlanBundleFile[]; manifestContext: Record<string, unknown>; refStrings: string[] }
  | undefined {
  if (!Array.isArray(entries) || entries.length === 0) return undefined;
  const reports = entries.map((entry) => {
    const report = asRecord(entry.report);
    const id = entry.ref.id || asString(asRecord(report.header).artifactId);
    return { ref: entry.ref, id, report, agent: projectTaskContextAgent(report) };
  });
  const refStrings = reports.map((r) => `${r.ref.type}:${r.id}`);

  const md: string[] = [
    "# Task Context",
    "",
    "This context is optional guidance, not proof.",
    "",
    "## Reports",
    ...reports.map((r) => `- TaskContextReport:${r.id}`),
  ];
  for (const r of reports) {
    md.push("", `## Read This Before Editing (TaskContextReport:${r.id})`, "");
    md.push(`Task: ${asString(asRecord(r.report.task).text) || "(none)"}`);
    md.push("", "### Do Not Touch");
    const zones = asArray(r.report.doNotTouch).map((z) => asRecord(z));
    if (zones.length > 0) {
      for (const z of zones) md.push(`- ${asString(z.reason)} (guidance, not enforced)`);
    } else {
      md.push("- (none)");
    }
    md.push("", "### Verification Hints");
    const hints = asArray(r.report.verificationHints).map((h) => asRecord(h));
    if (hints.length > 0) {
      for (const h of hints) {
        md.push(
          `- ${asString(h.command) || asString(h.artifact) || "hint"} — ${asString(h.reason)} (hint, not executed)`,
        );
      }
    } else {
      md.push("- (none)");
    }
  }
  md.push(
    "",
    "## Boundaries",
    "- proof: false",
    "- approves plans: false",
    "- executes commands: false",
    "- writes source files: false",
    "- runs Circe: false",
    "- implements intent:go: false",
    "",
  );

  const agentJson = {
    taskContextReports: reports.map((r) => ({
      ref: { type: r.ref.type, id: r.id },
      agentContext: r.agent,
      proof: false,
    })),
    boundaries: { ...TASK_CONTEXT_BOUNDARIES },
  };
  const refsJson = {
    taskContextReports: reports.map((r) => ({
      ref: { type: r.ref.type, id: r.id },
      role: "optional-agent-context",
      proof: false,
    })),
  };
  const manifestContext = {
    taskContextReports: reports.map((r) => ({
      ref: { type: r.ref.type, id: r.id },
      role: "optional-agent-context",
      proof: false,
      sidecars: { markdown: TASK_CONTEXT_SIDECAR_MARKDOWN, agentJson: TASK_CONTEXT_SIDECAR_AGENT },
    })),
  };

  return {
    files: [
      { path: TASK_CONTEXT_SIDECAR_MARKDOWN, content: `${md.join("\n")}\n` },
      { path: TASK_CONTEXT_SIDECAR_AGENT, content: `${JSON.stringify(agentJson, null, 2)}\n` },
      { path: TASK_CONTEXT_SIDECAR_REFS, content: `${JSON.stringify(refsJson, null, 2)}\n` },
    ],
    manifestContext,
    refStrings,
  };
}

export function buildIntentPlanBundle(input: BuildIntentPlanBundleInput): IntentPlanBundleRenderResult {
  const source = input.source ?? {};
  const generatedAt = typeof input.generatedAt === "string" ? input.generatedAt : "1970-01-01T00:00:00.000Z";
  const digests = input.sourceDigests ?? {};
  const target: IntentPlanBundleTarget = input.target === "generic" ? "generic" : "circe";

  // ---- intent id ----
  const idCandidate =
    (typeof input.intentId === "string" && input.intentId.length > 0 ? input.intentId : undefined) ??
    source.preparedIntentPlanRef?.id ??
    source.intentAssessmentReportRef?.id ??
    source.intentStatusReportRef?.id;
  if (typeof idCandidate !== "string" || idCandidate.length === 0) {
    throw new Error("buildIntentPlanBundle: cannot determine intent id (supply --intent-id or a source artifact ref).");
  }
  const intentId = slugifyIntentId(idCandidate);
  if (intentId.length === 0) {
    throw new Error("buildIntentPlanBundle: intent id is empty after slug normalization.");
  }
  const rootDir = `${DEFAULT_BUNDLE_ROOT}/${intentId}`;

  // ---- defensive views ----
  const plan = asRecord(source.preparedIntentPlan);
  const status = asRecord(source.intentStatusReport);
  const workOrder = asRecord(source.workOrder);
  const verificationPlan = asRecord(source.verificationPlan);
  const assessment = asRecord(source.intentAssessmentReport);
  const freshness = asRecord(source.pathFreshnessReport);
  const drift = asRecord(source.runtimeGraphDriftReport);

  const request = asRecord(plan.request);
  const planStatus = asRecord(plan.status);
  const approval = asRecord(plan.approval);
  const goal =
    asString(request.goal) || asString(asRecord(assessment.request).goal) || asString(asRecord(workOrder).goal, "(unknown goal)");
  const statusValue = asString(asRecord(status.status).value) || asString(planStatus.value, "unknown");

  // ---- source artifacts (only present ones) ----
  const sourceEntries: Array<[string, ArtifactRef | undefined, unknown]> = [
    ["intentAssessmentReport", source.intentAssessmentReportRef, source.intentAssessmentReport],
    ["preparedIntentPlan", source.preparedIntentPlanRef, source.preparedIntentPlan],
    ["intentStatusReport", source.intentStatusReportRef, source.intentStatusReport],
    ["workOrder", source.workOrderRef, source.workOrder],
    ["verificationPlan", source.verificationPlanRef, source.verificationPlan],
    ["pathFreshnessReport", source.pathFreshnessReportRef, source.pathFreshnessReport],
    ["runtimeGraphDriftReport", source.runtimeGraphDriftReportRef, source.runtimeGraphDriftReport],
  ];
  const sourceArtifacts: Record<string, { ref: string; digest: string }> = {};
  for (const [name, ref, value] of sourceEntries) {
    const refStr = refString(ref);
    if (!refStr) continue;
    const digest = typeof digests[name] === "string" ? digests[name] : fnv1a(JSON.stringify(value ?? null));
    sourceArtifacts[name] = { ref: refStr, digest };
  }

  // ---- staleness ----
  const staleReasons: string[] = [];
  if (!source.preparedIntentPlan) staleReasons.push("missing-prepared-plan");
  if (asString(freshness.status) === "stale") staleReasons.push("freshness-stale");
  let highOpenDrift = 0;
  for (const row of asArray(drift.rows)) {
    const r = asRecord(row);
    if (asString(r.severity) === "high" && asString(r.status) !== "in-sync" && asString(r.status) !== "not-evaluated") {
      highOpenDrift += 1;
    }
  }
  if (highOpenDrift > 0) staleReasons.push("drift-changed");
  if (asArray(status.staleInputs).length > 0) staleReasons.push("status-stale-inputs");
  const stalenessState = staleReasons.length > 0 ? "stale" : "fresh";

  // ---- file map ----
  const files: Record<string, string> = {
    readme: "README.md",
    preparedPlan: "prepared-plan.md",
    workOrder: "work-order.md",
    verificationPlan: "verification-plan.md",
    status: "status.md",
    agentHandoff: "agent/handoff.md",
    agentContext: "agent/context.json",
    agentInstructions: "agent/instructions.md",
    agentConstraints: "agent/constraints.md",
    agentVerification: "agent/verification.json",
    agentSourceRefs: "agent/source-refs.json",
  };

  // Optional TaskContextReport bundle context (slice 183). Additive only: when
  // present, the `context/` sidecars + the manifest `context` block are added;
  // otherwise the bundle is byte-identical to before. Never alters WorkOrder /
  // VerificationPlan / phase gates, proof status, or the Circe projection.
  const taskContext = renderTaskContextSidecars(input.taskContextReports ?? []);
  if (taskContext) {
    files.taskContextMarkdown = TASK_CONTEXT_SIDECAR_MARKDOWN;
    files.taskContextAgent = TASK_CONTEXT_SIDECAR_AGENT;
    files.taskContextRefs = TASK_CONTEXT_SIDECAR_REFS;
  }

  const manifest: Record<string, unknown> = {
    schemaVersion: "0.1.0",
    bundleKind: "intent-plan",
    target,
    intentId,
    generatedAt,
    status: statusValue,
    sourceArtifacts,
    staleness: { state: stalenessState, staleReasons },
    files,
    boundaries: {
      canonicalTruth: ".rekon/artifacts",
      executesCommands: false,
      writesSourceFiles: false,
      implementsIntentGo: false,
    },
  };

  // ---- derived content ----
  const phases = asArray(plan.phases).map((p) => asRecord(p));
  const phaseLines = phases.map((p, i) => {
    const title = asString(p.title) || asString(p.id, `Phase ${i + 1}`);
    const kind = asString(p.kind);
    return kind ? `${title} (${kind})` : title;
  });
  const obligationLines = asArray(plan.obligations).map((o) => asString(asRecord(o).message) || asString(asRecord(o).id, "obligation"));
  const requirementLines = asArray(plan.verificationRequirements).map((r) => {
    const rr = asRecord(r);
    const command = asString(rr.command);
    const reason = asString(rr.reason, "Verify the change.");
    return command ? `${command} — ${reason}` : reason;
  });
  const blockedReasonLines = asArray(plan.blockedReasons).map((b) => asString(asRecord(b).message) || asString(asRecord(b).id, "blocked"));
  const commands = asArray(verificationPlan.commands).map((c) => asString(c)).filter((c) => c.length > 0);
  const planSuccess = asArray(verificationPlan.successCriteria).map((c) => asString(c)).filter((c) => c.length > 0);
  const workOrderHandoff = asRecord(workOrder.intentHandoff);
  const verificationHandoff = asRecord(verificationPlan.intentHandoff);

  const sourceRefList = Object.entries(sourceArtifacts).map(([name, entry]) => `- ${name}: \`${entry.ref}\``);

  // ---- Circe handoff projection (circe/) ----
  // Projects the bundle into Circe's `rekon-circe-handoff` import package, one
  // WorkOrder (and optional VerificationPlan) per PreparedIntentPlan phase.
  // Computed here (before the human / agent files) so verification-plan.md and
  // agent/verification.json can surface the per-phase verification posture (slice 115).
  const circeRepoRoot = typeof input.repoRoot === "string" && input.repoRoot.length > 0 ? input.repoRoot : ".";
  const producerVersion =
    typeof input.producerVersion === "string" && input.producerVersion.length > 0 ? input.producerVersion : null;
  const circe = target === "circe"
    ? renderCirceProjection({
        intentId,
        generatedAt,
        repoRoot: circeRepoRoot,
        goal,
        planRef: source.preparedIntentPlanRef,
        producerVersion,
        phases,
        requirements: asArray(plan.verificationRequirements).map((r) => asRecord(r)),
        obligations: asArray(plan.obligations).map((o) => asRecord(o)),
        workOrderSchemaVersion: asString(asRecord(workOrder.header).schemaVersion, "0.1.0"),
        verificationPlanSchemaVersion: asString(asRecord(verificationPlan.header).schemaVersion, "0.1.0"),
        // Proof/gate enrichment (slice 101).
        hasPreparedPlan: Boolean(source.preparedIntentPlan),
        sourceArtifacts,
        approval,
        planStatusValue: asString(planStatus.value, "unknown"),
        planNextAction: asString(planStatus.recommendedNextAction, "(none)"),
        intentStatusValue: asString(asRecord(status.status).value),
        intentStatusNextAction: asString(asRecord(status).recommendedNextAction),
      })
    : null;
  // Surface the Circe projection in the manifest only when target=circe
  // (default for compatibility; explicit target=generic stays generic).
  if (circe) {
    files.circeHandoff = "circe/handoff.json";
    files.circePhasePlan = "circe/phase-plan.json";
    files.circeProof = "circe/rekon-proof.json";
    manifest.circe = circe.manifestCirce;
  }

  // TaskContextReport bundle context (slice 183): additive optional context refs.
  // `proof: false` / `role: "optional-agent-context"` make the non-authoritative
  // status explicit. Never proof, never required, never alters gates / Circe.
  if (taskContext) {
    manifest.context = taskContext.manifestContext;
  }

  // Per-phase verification posture lines for the human / agent bundle files (slice 115).
  const phasePostureLines = circe ? circe.phaseGates.map((g) => {
    const reqs = g.verificationRequirementIds.length > 0 ? ` [${g.verificationRequirementIds.join(", ")}]` : "";
    return `${g.phaseId} — ${g.verificationPosture}${reqs}: ${g.reason}`;
  }) : [];

  // ---- README.md ----
  const readme = [
    `# Intent plan bundle: ${intentId}`,
    "",
    `Goal: ${goal}`,
    `Status: ${statusValue}`,
    `Staleness: ${stalenessState}${staleReasons.length > 0 ? ` (${staleReasons.join(", ")})` : ""}`,
    "",
    "## Canonical truth",
    "",
    "Canonical source of truth remains `.rekon/artifacts/`. This bundle is a projection.",
    "",
    "## Source artifacts",
    "",
    sourceRefList.length > 0 ? sourceRefList.join("\n") : "- (none)",
    "",
    // Handoff reading order (slice 193): always rendered. Tells humans and agents
    // what to read first across the bundle's orientation / structured-handoff /
    // source-verification-authority / Circe-contract layers. Guidance only — it
    // grants no authority and changes no gate. Task-context entries say "if present".
    "## Handoff reading order",
    "",
    "For humans:",
    "",
    "1. Read this README.",
    "2. If present, read `context/task-context.md` for task orientation.",
    "3. Read `verification-plan.md`.",
    "4. Use `work-order.md` / source refs / agent files for authority.",
    "5. Review `circe/actor-contracts/*` only for Circe-facing handoffs.",
    "",
    "For agents:",
    "",
    "1. Read `agent/instructions.md`.",
    "2. Read `agent/handoff.md`.",
    "3. Read `agent/context.json`.",
    "4. If present, read `context/task-context.agent.json`.",
    "5. Read `agent/source-refs.json`.",
    "6. Read `agent/verification.json`.",
    "7. Read `work-order.md` / `verification-plan.md` and phase source-change posture.",
    "8. If Circe-targeted, read `circe/handoff.json` and `circe/actor-contracts/*`.",
    "",
    "- Task context is optional context, not proof.",
    "- WorkOrder / VerificationPlan remain authoritative.",
    "- Phase source-change posture is handoff evidence, not approval.",
    "- Actor contracts are role/return-shape guidance, not executed workers.",
    "- Operator Circe commands are operator-only inspection, not worker verification.",
    "",
    // Optional task-context section: only rendered when a TaskContextReport is
    // attached. Makes the `context/` sidecars discoverable from the human-facing
    // bundle README (not just `manifest.context`). Descriptive only — guidance,
    // not proof; it grants no authority.
    ...(taskContext
      ? [
          "## Task context",
          "",
          "Optional context for the agent/operator picking up this bundle — guidance, not proof. It does not approve the plan, satisfy any gate, execute commands, or write source.",
          "",
          ...taskContext.refStrings.map((ref) => `- ${ref}`),
          "",
          `See \`${TASK_CONTEXT_SIDECAR_MARKDOWN}\` (human brief), \`${TASK_CONTEXT_SIDECAR_AGENT}\` (agent JSON), and \`${TASK_CONTEXT_SIDECAR_REFS}\` (refs). Also listed under \`manifest.context.taskContextReports\`.`,
          "",
        ]
      : []),
    "## Boundaries",
    "",
    BOUNDARY_NOTE,
    "",
  ].join("\n");

  // ---- prepared-plan.md ----
  const preparedPlanMd = [
    `# Prepared plan: ${intentId}`,
    "",
    `Goal: ${goal}`,
    `Readiness / approval: ${asString(approval.status, "unknown")} (status ${asString(planStatus.value, "unknown")})`,
    "",
    "## Phases",
    "",
    bullets(phaseLines),
    "",
    "## Obligations",
    "",
    bullets(obligationLines),
    "",
    "## Verification requirements",
    "",
    bullets(requirementLines),
    "",
    "## Blocked reasons",
    "",
    bullets(blockedReasonLines),
    "",
  ].join("\n");

  // ---- work-order.md ----
  const woPaths = asArray(workOrder.paths).map((p) => asString(p)).filter(Boolean);
  const woRisk = asArray(workOrder.riskNotes).map((p) => asString(p)).filter(Boolean);
  const woHandoffLine = refString(source.preparedIntentPlanRef)
    ? `Traceability: derived from \`${refString(source.preparedIntentPlanRef)}\`${
        asArray(workOrderHandoff.verificationRequirementIds).length > 0
          ? ` (requirements: ${asArray(workOrderHandoff.verificationRequirementIds).map((x) => asString(x)).join(", ")})`
          : ""
      }`
    : "Traceability: (no WorkOrder provided)";
  const workOrderMd = [
    `# Work order: ${intentId}`,
    "",
    `Goal: ${asString(workOrder.goal, goal)}`,
    "",
    "## Scope",
    "",
    bullets(woPaths.length > 0 ? woPaths : asArray(plan.phases).flatMap((p) => asArray(asRecord(p).paths)).map((x) => asString(x)).filter(Boolean)),
    "",
    "## Preservation constraints",
    "",
    bullets(woRisk.length > 0 ? woRisk : obligationLines),
    "",
    woHandoffLine,
    "",
  ].join("\n");

  // ---- verification-plan.md ----
  const verificationPlanMd = [
    `# Verification plan: ${intentId}`,
    "",
    "Commands are listed as text. **Commands are not executed by bundle generation.**",
    "",
    "## Commands / checks",
    "",
    bullets(commands.length > 0 ? commands : requirementLines),
    "",
    "## Success criteria",
    "",
    bullets(planSuccess.length > 0 ? planSuccess : ["Verification guidance is addressed."]),
    "",
    "## Phase verification posture",
    "",
    circe
      ? "Each phase carries an explicit verification posture. `executable` and `final-verification` phases ship a per-phase VerificationPlan under `circe/verification-plans/`. `manual-review` phases are reviewer-gated; no executable verification is implied. `needs-review` phases should carry verification but have no safe executable requirement. **Skipped verification is not proof: a phase without an executable VerificationPlan is never treated as verified.**"
      : "No target-specific phase projection was requested. Verification commands are requirements for the receiving system or operator; bundle generation executes no commands.",
    "",
    bullets(phasePostureLines.length > 0 ? phasePostureLines : ["(no phases)"]),
    "",
    refString(source.verificationPlanRef)
      ? `Traceability: \`${refString(source.verificationPlanRef)}\`${
          asArray(verificationHandoff.verificationRequirementIds).length > 0
            ? ` (requirements: ${asArray(verificationHandoff.verificationRequirementIds).map((x) => asString(x)).join(", ")})`
            : ""
        }`
      : "Traceability: (no VerificationPlan provided)",
    "",
  ].join("\n");

  // ---- status.md ----
  const statusMd = [
    `# Status: ${intentId}`,
    "",
    `Status: ${statusValue}`,
    `Recommended next action: ${asString(asRecord(status).recommendedNextAction, "(none)")}`,
    "",
    "## Blockers",
    "",
    bullets(asArray(status.blockers).map((b) => asString(asRecord(b).message) || asString(asRecord(b).id, "blocker"))),
    "",
    "## Warnings",
    "",
    bullets(asArray(status.warnings).map((w) => asString(asRecord(w).message) || asString(w))),
    "",
    "## Stale inputs",
    "",
    bullets(asArray(status.staleInputs).map((s) => asString(s))),
    "",
    "## Missing inputs",
    "",
    bullets(asArray(status.missingInputs).map((s) => asString(s))),
    "",
  ].join("\n");

  // ---- agent files ----
  const stopConditions = [
    "Do not execute commands as part of accepting this handoff.",
    "Do not write source files outside the scoped paths.",
    "Do not weaken tests, validators, or checks to make verification pass.",
    "Stop and request review if the bundle is stale or a constraint conflicts.",
  ];

  const agentHandoff = [
    `# Agent handoff: ${intentId}`,
    "",
    `Goal: ${goal}`,
    `Status: ${statusValue}`,
    "",
    // Handoff reading order (slice 193): always rendered. Points the agent at the
    // structured-handoff and authority surfaces in order; gates stay authoritative.
    "## Reading order",
    "",
    "- Read `agent/context.json` for structured bundle context.",
    "- If present, read `context/task-context.agent.json` for optional task context.",
    "- Read `agent/source-refs.json` for source refs.",
    "- Read `agent/verification.json` for verification posture.",
    "- If Circe-targeted, read `circe/handoff.json` and `circe/actor-contracts/*`.",
    "- WorkOrder / VerificationPlan / phase gates remain authoritative.",
    "",
    "## What to do",
    "",
    bullets(phaseLines.length > 0 ? phaseLines.map((p) => `Address phase: ${p}`) : ["Follow the prepared plan and work order."]),
    "",
    "## What not to do",
    "",
    bullets(blockedReasonLines.length > 0 ? blockedReasonLines.map((b) => `Do not start: ${b}`) : ["Do not exceed the prepared scope."]),
    "",
    "## Source refs",
    "",
    sourceRefList.length > 0 ? sourceRefList.join("\n") : "- (none)",
    "",
    "## Stop conditions",
    "",
    bullets(stopConditions),
    "",
    // Optional task-context guidance (slice 188): only rendered when a
    // TaskContextReport is attached. Points the agent at the optional sidecars;
    // grants no authority — context, not proof.
    ...(taskContext
      ? [
          "## Task context",
          "",
          "Optional task context is available.",
          "Use context/task-context.agent.json for structured context.",
          "Use context/task-context.md for the readable brief.",
          "This context is not proof and does not change the handoff gates.",
          "",
        ]
      : []),
    BOUNDARY_NOTE,
    "",
  ].join("\n");

  const agentContext = JSON.stringify(
    {
      intentId,
      goal,
      status: statusValue,
      scope: {
        paths: woPaths.length > 0 ? woPaths : asArray(plan.phases).flatMap((p) => asArray(asRecord(p).paths)).map((x) => asString(x)).filter(Boolean),
        systems: asArray(workOrder.ownerSystems).map((x) => asString(x)).filter(Boolean),
      },
      capabilities: asArray(asRecord(request.scope).capabilities).map((x) => asString(x)).filter(Boolean),
      steps: asArray(asRecord(request.scope).steps).map((x) => asString(x)).filter(Boolean),
      phases: phases.map((p) => ({ id: asString(p.id), title: asString(p.title), kind: asString(p.kind) })),
      obligations: obligationLines,
      artifactRefs: Object.fromEntries(Object.entries(sourceArtifacts).map(([name, entry]) => [name, entry.ref])),
      // Handoff reading order (slice 193): always present, additive metadata. Mirrors the
      // README / agent-file reading order so a programmatic agent can order its reads and
      // see the authority classification of each surface. Guidance only — grants no
      // authority, changes no gate.
      handoffReadingOrder: {
        agent: [
          "agent/instructions.md",
          "agent/handoff.md",
          "agent/context.json",
          "context/task-context.agent.json",
          "agent/source-refs.json",
          "agent/verification.json",
          "circe/handoff.json",
          "circe/actor-contracts/*",
        ],
        authority: {
          taskContext: "context-only",
          workOrder: "authoritative-work",
          verificationPlan: "authoritative-verification",
          sourceChangePosture: "handoff-evidence-not-approval",
          actorContracts: "role-return-guidance-not-execution",
        },
      },
      // Optional task-context metadata (slice 188): additive; present only when a
      // TaskContextReport is attached. `available: false` is never emitted —
      // without-context bundles omit the key entirely. Metadata only, not proof.
      ...(taskContext
        ? {
            taskContext: {
              available: true,
              reports: taskContext.refStrings.map((refStr) => {
                const sep = refStr.indexOf(":");
                return {
                  ref: { type: refStr.slice(0, sep), id: refStr.slice(sep + 1) },
                  role: "optional-agent-context",
                  proof: false,
                  sidecars: {
                    markdown: TASK_CONTEXT_SIDECAR_MARKDOWN,
                    agentJson: TASK_CONTEXT_SIDECAR_AGENT,
                    refsJson: TASK_CONTEXT_SIDECAR_REFS,
                  },
                };
              }),
            },
          }
        : {}),
    },
    null,
    2,
  );

  const agentInstructions = [
    `# Agent instructions: ${intentId}`,
    "",
    "Implement the prepared intent in ordered phases, respecting all constraints.",
    "",
    // Handoff reading order (slice 193): always rendered. Tells the agent what to read
    // first and pins the authority/boundary layers. Guidance only — no new authority.
    "## Reading order",
    "",
    "Read these before acting:",
    "",
    "1. `agent/handoff.md`",
    "2. `agent/context.json`",
    "3. `context/task-context.agent.json` when present",
    "4. `agent/source-refs.json`",
    "5. `agent/verification.json`",
    "6. `work-order.md` / `verification-plan.md` / phase source-change posture",
    "7. `circe/handoff.json` and actor contracts when Circe-targeted",
    "",
    "- Task context is optional context, not proof.",
    "- Verification hints are hints, not executed commands.",
    "- Do-not-touch zones are guidance/context, not enforcement.",
    "- WorkOrder / VerificationPlan remain authoritative.",
    "- Phase source-change posture belongs to the source / verification authority layer.",
    "- Actor contracts are role/return-shape guidance.",
    "- Operator-only Circe commands must not be run as worker verification.",
    "",
    "## Ordered phases",
    "",
    phaseLines.length > 0 ? phaseLines.map((p, i) => `${i + 1}. ${p}`).join("\n") : "1. Follow the prepared plan and work order.",
    "",
    "## Constraints",
    "",
    bullets(obligationLines),
    "",
    asString(workOrder.markdown) ? "## WorkOrder guidance\n\n" + asString(workOrder.markdown) : "",
    "",
    // Optional task-context guidance (slice 188): only rendered when a
    // TaskContextReport is attached. Tells the agent to read the optional
    // sidecars while keeping every gate authoritative — context, not proof.
    ...(taskContext
      ? [
          "## Task context",
          "",
          "Task context is optional context, not proof.",
          "Read context/task-context.agent.json before editing.",
          "Read context/task-context.md for the human-oriented brief.",
          "Verification hints are hints, not executed commands.",
          "Do-not-touch zones are guidance/context, not enforcement.",
          "WorkOrder / VerificationPlan / phase gates remain authoritative.",
          "",
        ]
      : []),
  ].join("\n");

  const agentConstraints = [
    `# Agent constraints: ${intentId}`,
    "",
    "## Non-goals",
    "",
    bullets(["Do not implement intent:go.", "Do not run verification commands as part of this handoff."]),
    "",
    "## Source-write boundary",
    "",
    "Source writes are limited to the scoped paths; the bundle and its generation write no source files.",
    "",
    "## Command-execution boundary",
    "",
    "Verification commands are requirements, not actions. The bundle executes no commands.",
    "",
    "## Preservation obligations",
    "",
    bullets(obligationLines),
    "",
    "## Stop conditions",
    "",
    bullets(stopConditions),
    "",
  ].join("\n");

  const agentVerification = JSON.stringify(
    {
      intentId,
      commands: commands.length > 0 ? commands : requirementLines,
      successCriteria: planSuccess,
      sourceRefs: Object.fromEntries(Object.entries(sourceArtifacts).map(([name, entry]) => [name, entry.ref])),
      executesCommands: false,
      // Per-phase verification posture (slice 115). Skipped verification is not
      // proof: manual-review / needs-review phases carry no executable VerificationPlan.
      ...(circe
        ? {
            phaseVerification: circe.phaseVerification,
            phases: circe.phaseGates.map((g) => ({
              phaseId: g.phaseId,
              sourceChange: g.sourceChange,
              classificationSource: g.classificationSource,
              verificationPosture: g.verificationPosture,
              manualGate: g.manualGate,
              needsReview: g.needsReview,
              ...(g.verificationPlanPath ? { verificationPlanPath: g.verificationPlanPath } : {}),
            })),
          }
        : {}),
    },
    null,
    2,
  );

  const agentSourceRefs = JSON.stringify(
    {
      generatedAt,
      canonicalTruth: ".rekon/artifacts",
      sourceArtifacts,
    },
    null,
    2,
  );

  // ---- Circe handoff projection (circe/) ----
  // (Computed above — before the human / agent files — so verification-plan.md and
  // agent/verification.json can surface the per-phase verification posture.
  // `circe.files` are appended to the bundle below.)

  const bundleFiles: IntentPlanBundleFile[] = [
    { path: "manifest.json", content: `${JSON.stringify(manifest, null, 2)}\n` },
    { path: "README.md", content: readme },
    { path: "prepared-plan.md", content: preparedPlanMd },
    { path: "work-order.md", content: workOrderMd },
    { path: "verification-plan.md", content: verificationPlanMd },
    { path: "status.md", content: statusMd },
    { path: "agent/handoff.md", content: agentHandoff },
    { path: "agent/context.json", content: `${agentContext}\n` },
    { path: "agent/instructions.md", content: agentInstructions },
    { path: "agent/constraints.md", content: agentConstraints },
    { path: "agent/verification.json", content: `${agentVerification}\n` },
    { path: "agent/source-refs.json", content: `${agentSourceRefs}\n` },
    ...(taskContext ? taskContext.files : []),
    ...(circe ? circe.files : []),
  ];

  // Defensive: every emitted path must be bundle-safe.
  for (const file of bundleFiles) {
    if (!isSafeBundleRelativePath(file.path)) {
      throw new Error(`buildIntentPlanBundle: unsafe bundle file path: ${file.path}`);
    }
  }

  return { intentId, rootDir: input.rootDir ? `${input.rootDir}/${intentId}` : rootDir, files: bundleFiles, manifest };
}
