import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import { type Actuator, defineCapability } from "@rekon/sdk";

type PreflightPacketLike = {
  header: ArtifactHeader;
  goal?: string;
  paths?: string[];
  ownerSystems?: string[];
  risk?: {
    tier?: "low" | "medium" | "high";
    reasons?: string[];
  };
  requiredChecks?: string[];
  relevantFindings?: unknown[];
  applicableMemory?: unknown[];
};

export type WorkOrder = {
  header: ArtifactHeader;
  goal: string;
  paths: string[];
  ownerSystems: string[];
  riskNotes: string[];
  requiredChecks: string[];
  successCriteria: string[];
  relevantFindings: unknown[];
  relevantMemory: unknown[];
  antiGamingInstruction: string;
  markdown: string;
};

export const intentActuator: Actuator = {
  id: "@rekon/capability-intent.work-order",
  produces: ["IntentMap", "WorkOrder", "VerificationPlan", "VerificationResult"],
  async act({ artifacts, input }) {
    const preflightRef = parseArtifactRef(input?.preflightRef) ?? await latestRef(artifacts, "ResolverPacket");

    if (!preflightRef) {
      throw new Error("@rekon/capability-intent requires a ResolverPacket artifact.");
    }

    const preflight = await artifacts.read(preflightRef) as PreflightPacketLike;
    const goal = typeof input?.goal === "string" ? input.goal : preflight.goal ?? "";
    const paths = parsePaths(input?.path ?? input?.paths ?? preflight.paths);
    const checks = preflight.requiredChecks?.length ? preflight.requiredChecks : ["npm run typecheck", "npm run test", "npm run build"];
    const inputRefs = [preflightRef, ...preflight.header.inputRefs];
    const intentMap = {
      header: createHeader("IntentMap", `intent-map-${Date.now()}`, preflight, inputRefs, paths),
      goal,
      paths,
      preflightRef,
      ownerSystems: preflight.ownerSystems ?? [],
    };
    const intentMapRef = await artifacts.write("IntentMap", intentMap);
    const workOrder: WorkOrder = {
      header: createHeader("WorkOrder", `work-order-${Date.now()}`, preflight, [intentMapRef, preflightRef], paths),
      goal,
      paths,
      ownerSystems: preflight.ownerSystems ?? [],
      riskNotes: preflight.risk?.reasons ?? [],
      requiredChecks: checks,
      successCriteria: [
        "Implementation stays scoped to the requested paths and owner systems.",
        "Public API changes are documented in package README and CHANGELOG.md.",
        "Verification commands pass or failures are reported with concrete evidence.",
      ],
      relevantFindings: preflight.relevantFindings ?? [],
      relevantMemory: preflight.applicableMemory ?? [],
      antiGamingInstruction: "Do not bypass failing checks, delete tests, or weaken validation to make verification pass.",
      markdown: "",
    };
    workOrder.markdown = renderWorkOrder(workOrder);
    const workOrderRef = await artifacts.write("WorkOrder", workOrder);
    const verificationPlan = {
      header: createHeader("VerificationPlan", `verification-plan-${Date.now()}`, preflight, [workOrderRef, preflightRef], paths),
      workOrderRef,
      commands: checks,
      successCriteria: workOrder.successCriteria,
    };

    return [intentMapRef, workOrderRef, await artifacts.write("VerificationPlan", verificationPlan)];
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-intent",
    name: "Intent Work Orders",
    version: "0.1.0",
    roles: ["actuator"],
    consumes: ["ResolverPacket"],
    produces: ["IntentMap", "WorkOrder", "VerificationPlan", "VerificationResult"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "preflight.changed",
        description: "Work orders are invalid when their preflight packet changes.",
        inputs: ["ResolverPacket"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.actuator(intentActuator);
  },
});

function createHeader(
  artifactType: string,
  artifactId: string,
  preflight: PreflightPacketLike,
  inputRefs: ArtifactRef[],
  paths: string[],
): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    snapshotId: preflight.header.snapshotId,
    subject: {
      repoId: preflight.header.subject.repoId,
      ref: preflight.header.subject.ref,
      commit: preflight.header.subject.commit,
      paths,
      systems: preflight.ownerSystems,
    },
    producer: {
      id: "@rekon/capability-intent",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 0.8,
      notes: ["Work orders are generated from resolver packets."],
    },
  };
}

async function latestRef(
  artifacts: { list(type?: string): Promise<ArtifactRef[]> },
  type: string,
): Promise<ArtifactRef | undefined> {
  return (await artifacts.list(type)).sort((left, right) => right.id.localeCompare(left.id))[0];
}

function parseArtifactRef(value: unknown): ArtifactRef | null {
  if (value && typeof value === "object") {
    const candidate = value as Partial<ArtifactRef>;

    if (candidate.type && candidate.id && candidate.schemaVersion) {
      return candidate as ArtifactRef;
    }
  }

  return null;
}

function parsePaths(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }

  return [];
}

function renderWorkOrder(workOrder: WorkOrder): string {
  return [
    "# Rekon Work Order",
    "",
    `Goal: ${workOrder.goal}`,
    `Paths: ${workOrder.paths.join(", ") || "none"}`,
    `Owner systems: ${workOrder.ownerSystems.join(", ") || "unknown"}`,
    "",
    "## Required Checks",
    "",
    ...workOrder.requiredChecks.map((command) => `- ${command}`),
    "",
    "## Success Criteria",
    "",
    ...workOrder.successCriteria.map((criterion) => `- ${criterion}`),
    "",
    "## Guardrail",
    "",
    workOrder.antiGamingInstruction,
  ].join("\n");
}
