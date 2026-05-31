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
  ];

  // Defensive: every emitted path must be bundle-safe.
  for (const file of bundleFiles) {
    if (!isSafeBundleRelativePath(file.path)) {
      throw new Error(`buildIntentPlanBundle: unsafe bundle file path: ${file.path}`);
    }
  }

  return { intentId, rootDir: input.rootDir ? `${input.rootDir}/${intentId}` : rootDir, files: bundleFiles, manifest };
}
