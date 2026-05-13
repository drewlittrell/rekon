import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import { type Actuator, defineCapability } from "@rekon/sdk";

export type ReconciliationOperation =
  | "docs_regeneration"
  | "label_override_write"
  | "finding_baseline_write"
  | "safe_import_rewrite"
  | "generated_scaffold_write"
  | "verification_command_run";

export type ReconciliationPlan = {
  header: ArtifactHeader;
  dryRun: boolean;
  operations: Array<{
    operation: ReconciliationOperation;
    status: "planned" | "applied" | "deferred" | "denied";
    reason?: string;
  }>;
};

const ARTIFACT_ONLY_OPERATIONS = new Set<ReconciliationOperation>([
  "docs_regeneration",
  "label_override_write",
  "finding_baseline_write",
]);

export const reconcileActuator: Actuator = {
  id: "@rekon/capability-reconcile.actuator",
  produces: ["ReconciliationPlan", "ReconciliationLog", "ActionLog"],
  async act({ artifacts, input }) {
    const operations = parseOperations(input?.operations);
    const dryRun = input?.dryRun !== false;
    const denied = operations.find((operation) => !ARTIFACT_ONLY_OPERATIONS.has(operation));

    if (denied) {
      throw new Error(`Reconciliation operation ${denied} requires denied source or command permissions.`);
    }

    const inputRefs = await artifacts.list("IntelligenceSnapshot");
    const plan: ReconciliationPlan = {
      header: createHeader("ReconciliationPlan", `reconciliation-plan-${Date.now()}`, inputRefs),
      dryRun,
      operations: operations.map((operation) => ({
        operation,
        status: dryRun ? "planned" : "applied",
        reason: dryRun ? "dry-run" : "artifact-only operation",
      })),
    };
    const planRef = await artifacts.write("ReconciliationPlan", plan);
    const log = {
      header: createHeader("ReconciliationLog", `reconciliation-log-${Date.now()}`, [planRef]),
      planRef,
      applied: dryRun ? [] : operations,
      deferred: dryRun ? operations : [],
    };
    const logRef = await artifacts.write("ReconciliationLog", log);
    const actionLog = {
      header: createHeader("ActionLog", `action-log-${Date.now()}`, [planRef, logRef]),
      action: "reconcile",
      dryRun,
      operations,
    };

    return [planRef, logRef, await artifacts.write("ActionLog", actionLog)];
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-reconcile",
    name: "Reconciliation Capability",
    version: "0.1.0",
    roles: ["actuator"],
    consumes: ["IntelligenceSnapshot", "Publication", "FindingReport"],
    produces: ["ReconciliationPlan", "ReconciliationLog", "ActionLog"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "snapshot.changed",
        description: "Reconciliation plans are invalid when snapshot inputs change.",
        inputs: ["IntelligenceSnapshot"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.actuator(reconcileActuator);
  },
});

function parseOperations(value: unknown): ReconciliationOperation[] {
  if (typeof value === "string" && value.length > 0) {
    return [value as ReconciliationOperation];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is ReconciliationOperation => typeof item === "string" && item.length > 0);
  }

  return ["docs_regeneration"];
}

function createHeader(artifactType: string, artifactId: string, inputRefs: ArtifactRef[]): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: {
      repoId: "repo",
    },
    producer: {
      id: "@rekon/capability-reconcile",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 1,
      notes: ["Initial reconciliation is artifact-only and dry-run by default."],
    },
  };
}
