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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
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

type CirceProjectionResult = {
  files: IntentPlanBundleFile[];
  manifestCirce: Record<string, unknown>;
  warnings: string[];
  phaseCount: number;
  workOrderCount: number;
  verificationPlanCount: number;
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
};

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

  const seen = new Set<string>();
  const phaseEntries: Array<Record<string, unknown>> = [];
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
    const obligationMessages = asArray(p.obligations)
      .map((x) => obligationMessageById.get(asString(x)))
      .filter((m): m is string => typeof m === "string" && m.length > 0);
    const riskNotes = [...constraints, ...obligationMessages];

    let requirementIds = asArray(p.verificationRequirements).map((x) => asString(x)).filter(Boolean);
    if (requirementIds.length === 0 && singlePhase) {
      requirementIds = [...requirementById.keys()];
    }
    const phaseRequirements = requirementIds
      .map((id) => requirementById.get(id))
      .filter((r): r is { command: string; reason: string } => Boolean(r));
    const commands = phaseRequirements.map((r) => r.command).filter((c) => c.length > 0);
    const reasons = phaseRequirements.map((r) => r.reason).filter((c) => c.length > 0);

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
    };
    workOrderFiles.push({ path: `circe/${workOrderRelPath}`, content: `${JSON.stringify(workOrder, null, 2)}\n` });
    handoffWorkOrders.push({ phaseId, path: workOrderRelPath, artifactId: workOrderArtifactId });

    let verificationPlanPath: string | undefined;
    if (phaseRequirements.length > 0) {
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
      };
      verificationPlanFiles.push({
        path: `circe/${verificationPlanRelPath}`,
        content: `${JSON.stringify(verificationPlan, null, 2)}\n`,
      });
      handoffVerificationPlans.push({ phaseId, path: verificationPlanRelPath, artifactId: verificationPlanArtifactId });
      verificationPlanPath = verificationPlanRelPath;
    } else {
      warnings.push(`Phase ${phaseId} has no verification requirement; Circe projection omits its VerificationPlan.`);
    }

    phaseEntries.push({
      phaseId,
      title,
      workOrderPath: workOrderRelPath,
      ...(verificationPlanPath ? { verificationPlanPath } : {}),
      // implementerProfile omitted by default: Rekon does not know the operator's
      // Circe workflow profiles. Circe applies its default routing.
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
  // relative to the `circe/` directory.
  const handoff = {
    schemaVersion: 1,
    kind: "rekon-circe-handoff",
    handoffId: input.intentId,
    repoRoot: input.repoRoot,
    sourcePlanPath: "../prepared-plan.md",
    phasePlanPath: "phase-plan.json",
    producer: { system: "rekon", version: input.producerVersion },
    status: "ready",
    warnings,
    artifacts: { workOrders: handoffWorkOrders, verificationPlans: handoffVerificationPlans },
  };

  const files: IntentPlanBundleFile[] = [
    { path: "circe/handoff.json", content: `${JSON.stringify(handoff, null, 2)}\n` },
    { path: "circe/phase-plan.json", content: `${JSON.stringify(phasePlan, null, 2)}\n` },
    ...workOrderFiles,
    ...verificationPlanFiles,
  ];

  const manifestCirce = {
    handoff: "circe/handoff.json",
    phasePlan: "circe/phase-plan.json",
    workOrdersDir: "circe/work-orders",
    verificationPlansDir: "circe/verification-plans",
    schemaVersion: 1,
    kind: "rekon-circe-handoff",
    workOrders: handoffWorkOrders.length,
    verificationPlans: handoffVerificationPlans.length,
    warnings: warnings.length,
  };

  return {
    files,
    manifestCirce,
    warnings,
    phaseCount: phaseEntries.length,
    workOrderCount: handoffWorkOrders.length,
    verificationPlanCount: handoffVerificationPlans.length,
  };
}

export function buildIntentPlanBundle(input: BuildIntentPlanBundleInput): IntentPlanBundleRenderResult {
  const source = input.source ?? {};
  const generatedAt = typeof input.generatedAt === "string" ? input.generatedAt : "1970-01-01T00:00:00.000Z";
  const digests = input.sourceDigests ?? {};

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

  const manifest: Record<string, unknown> = {
    schemaVersion: "0.1.0",
    bundleKind: "intent-plan",
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
    },
    null,
    2,
  );

  const agentInstructions = [
    `# Agent instructions: ${intentId}`,
    "",
    "Implement the prepared intent in ordered phases, respecting all constraints.",
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
  // Projects the bundle into Circe's `rekon-circe-handoff` import package, one
  // WorkOrder (and optional VerificationPlan) per PreparedIntentPlan phase.
  const circeRepoRoot = typeof input.repoRoot === "string" && input.repoRoot.length > 0 ? input.repoRoot : ".";
  const producerVersion =
    typeof input.producerVersion === "string" && input.producerVersion.length > 0 ? input.producerVersion : null;
  const circe = renderCirceProjection({
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
  });
  // Surface the Circe projection in the manifest (additive; all relative paths).
  files.circeHandoff = "circe/handoff.json";
  files.circePhasePlan = "circe/phase-plan.json";
  manifest.circe = circe.manifestCirce;

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
    ...circe.files,
  ];

  // Defensive: every emitted path must be bundle-safe.
  for (const file of bundleFiles) {
    if (!isSafeBundleRelativePath(file.path)) {
      throw new Error(`buildIntentPlanBundle: unsafe bundle file path: ${file.path}`);
    }
  }

  return { intentId, rootDir: input.rootDir ? `${input.rootDir}/${intentId}` : rootDir, files: bundleFiles, manifest };
}
