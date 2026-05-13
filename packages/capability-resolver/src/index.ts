import {
  type ArtifactHeader,
  type ArtifactRef,
} from "@rekon/kernel-artifacts";
import { type Resolver, defineCapability } from "@rekon/sdk";

export type PreflightPacket = {
  header: ArtifactHeader;
  goal: string;
  paths: string[];
  ownerSystems: string[];
  matchedScopes: Array<{
    path: string;
    owner?: string;
    confidence?: number;
  }>;
  risk: {
    tier: "low" | "medium" | "high";
    reasons: string[];
  };
  requiredChecks: string[];
  relevantFindings: unknown[];
  recommendedContext: string[];
  applicableMemory?: Array<{
    instruction: string;
    scope?: Record<string, unknown>;
    confidence: number;
    reason: string;
  }>;
  warnings: string[];
  nextSteps: string[];
};

type SnapshotLike = {
  header: ArtifactHeader;
  repo: {
    id: string;
    root: string;
    branch?: string;
    commit?: string;
  };
  inputs?: Record<string, ArtifactRef[]>;
  evaluations?: Record<string, ArtifactRef[]>;
};

type EvidenceGraphLike = {
  facts?: Array<{
    kind: string;
    subject: string;
    value?: Record<string, unknown>;
    confidence?: number;
  }>;
};

export const preflightResolver: Resolver = {
  id: "resolve.preflight",
  produces: ["ResolverPacket"],
  async resolve({ artifacts, input }) {
    const snapshotRef = parseArtifactRef(input?.snapshotRef);
    const goal = typeof input?.goal === "string" ? input.goal : "";
    const paths = parsePaths(input?.path ?? input?.paths);

    if (!snapshotRef) {
      throw new Error("resolve.preflight requires input.snapshotRef.");
    }

    if (paths.length === 0) {
      throw new Error("resolve.preflight requires input.path or input.paths.");
    }

    const snapshot = await artifacts.read(snapshotRef) as SnapshotLike;
    const evidenceRefs = snapshot.inputs?.EvidenceGraph ?? [];
    const evidenceGraphs = await Promise.all(evidenceRefs.map((ref) => artifacts.read(ref) as Promise<EvidenceGraphLike>));
    const ownershipFacts = evidenceGraphs.flatMap((graph) => graph.facts ?? [])
      .filter((fact) => fact.kind === "ownership_hint");
    const matchedScopes = paths.map((path) => {
      const match = findBestOwnershipMatch(path, ownershipFacts);

      return {
        path,
        owner: typeof match?.value?.system === "string" ? match.value.system : undefined,
        confidence: typeof match?.confidence === "number" ? match.confidence : undefined,
      };
    });
    const ownerSystems = [...new Set(matchedScopes.map((scope) => scope.owner).filter(isString))].sort();
    const findingRefs = Object.values(snapshot.evaluations ?? {}).flat();
    const relevantFindings = await readRelevantFindings(artifacts, findingRefs, paths);
    const memoryRefs = Object.values((snapshot as { publications?: Record<string, ArtifactRef[]> }).publications ?? {})
      .flat()
      .filter((ref) => ref.type === "MemorySelection");
    const applicableMemory = await readMemorySelections(artifacts, memoryRefs, paths, goal);
    const risk = computeRisk(paths, ownerSystems, relevantFindings);
    const packet: PreflightPacket = {
      header: {
        artifactType: "ResolverPacket",
        artifactId: `preflight-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        snapshotId: snapshot.header.artifactId,
        subject: {
          repoId: snapshot.repo.id,
          ref: snapshot.repo.branch,
          commit: snapshot.repo.commit,
          paths,
          systems: ownerSystems,
        },
        producer: {
          id: "@rekon/capability-resolver",
          version: "0.1.0",
        },
        inputRefs: [snapshotRef, ...evidenceRefs, ...findingRefs, ...memoryRefs],
        freshness: {
          status: "fresh",
        },
        provenance: {
          confidence: ownerSystems.length > 0 ? 0.8 : 0.4,
          notes: ["resolve.preflight"],
        },
      },
      goal,
      paths,
      ownerSystems,
      matchedScopes,
      risk,
      requiredChecks: ["npm run typecheck", "npm run test", "npm run build"],
      relevantFindings,
      recommendedContext: buildRecommendedContext(paths, ownerSystems),
      applicableMemory,
      warnings: buildWarnings(paths, ownerSystems),
      nextSteps: [
        "Read the owner package docs before editing.",
        "Keep changes scoped to the requested paths.",
        "Run the required checks before handoff.",
      ],
    };

    const ref = await artifacts.write("ResolverPacket", packet);

    return [ref];
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-resolver",
    name: "Resolver Capability",
    version: "0.1.0",
    roles: ["resolver"],
    consumes: ["IntelligenceSnapshot", "EvidenceGraph", "FindingReport", "MemorySelection"],
    produces: ["ResolverPacket"],
    permissions: ["read:artifacts", "write:artifacts"],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.resolver(preflightResolver);
  },
});

function parseArtifactRef(value: unknown): ArtifactRef | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ArtifactRef>;

  if (
    typeof candidate.type === "string" &&
    typeof candidate.id === "string" &&
    typeof candidate.schemaVersion === "string"
  ) {
    return candidate as ArtifactRef;
  }

  return null;
}

function parsePaths(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter(isString);
  }

  return [];
}

function findBestOwnershipMatch(
  path: string,
  facts: Array<{ subject: string; value?: Record<string, unknown>; confidence?: number }>,
) {
  return facts
    .filter((fact) => path === fact.subject || path.startsWith(`${fact.subject}/`) || fact.subject === path)
    .sort((left, right) => right.subject.length - left.subject.length || (right.confidence ?? 0) - (left.confidence ?? 0))[0]
    ?? facts.find((fact) => typeof fact.value?.path === "string" && path.startsWith(String(fact.value.path)));
}

async function readRelevantFindings(
  artifacts: { read(ref: ArtifactRef): Promise<unknown> },
  refs: ArtifactRef[],
  paths: string[],
): Promise<unknown[]> {
  const findings: unknown[] = [];

  for (const ref of refs) {
    const report = await artifacts.read(ref) as { findings?: unknown[] };

    for (const finding of report.findings ?? []) {
      if (!finding || typeof finding !== "object") {
        continue;
      }

      const files = (finding as { files?: unknown }).files;

      if (Array.isArray(files) && files.some((file) => typeof file === "string" && paths.includes(file))) {
        findings.push(finding);
      }
    }
  }

  return findings;
}

async function readMemorySelections(
  artifacts: { read(ref: ArtifactRef): Promise<unknown> },
  refs: ArtifactRef[],
  paths: string[],
  goal: string,
): Promise<PreflightPacket["applicableMemory"]> {
  const selections: NonNullable<PreflightPacket["applicableMemory"]> = [];

  for (const ref of refs) {
    const artifact = await artifacts.read(ref) as { selections?: unknown[] };

    for (const selection of artifact.selections ?? []) {
      if (!selection || typeof selection !== "object") {
        continue;
      }

      const candidate = selection as {
        instruction?: unknown;
        scope?: Record<string, unknown>;
        confidence?: unknown;
        reason?: unknown;
        path?: unknown;
        goal?: unknown;
      };
      const pathMatches = typeof candidate.path !== "string" || paths.some((path) => path.startsWith(candidate.path as string));
      const goalMatches = typeof candidate.goal !== "string" || goal.includes(candidate.goal);

      if (typeof candidate.instruction === "string" && pathMatches && goalMatches) {
        selections.push({
          instruction: candidate.instruction,
          scope: candidate.scope,
          confidence: typeof candidate.confidence === "number" ? candidate.confidence : 0.5,
          reason: typeof candidate.reason === "string" ? candidate.reason : "Selected from memory artifact.",
        });
      }
    }
  }

  return selections;
}

function computeRisk(paths: string[], ownerSystems: string[], relevantFindings: unknown[]): PreflightPacket["risk"] {
  const reasons: string[] = [];

  if (ownerSystems.length > 1) {
    reasons.push("Requested paths span multiple owner systems.");
  }

  if (paths.some((path) => /(^|\/)(security|auth|runtime|kernel|src\/index)/i.test(path))) {
    reasons.push("Requested paths include protected or high-leverage areas.");
  }

  if (relevantFindings.length > 0) {
    reasons.push("Relevant findings are already attached to the requested paths.");
  }

  if (ownerSystems.length === 0) {
    reasons.push("No owner system could be resolved from current evidence.");
  }

  return {
    tier: reasons.some((reason) => reason.includes("multiple") || reason.includes("protected")) ? "high" : reasons.length > 0 ? "medium" : "low",
    reasons,
  };
}

function buildRecommendedContext(paths: string[], ownerSystems: string[]): string[] {
  return [
    ...paths.map((path) => `Source path: ${path}`),
    ...ownerSystems.map((system) => `Owner system: ${system}`),
  ];
}

function buildWarnings(paths: string[], ownerSystems: string[]): string[] {
  const warnings: string[] = [];

  if (ownerSystems.length === 0) {
    warnings.push("Ownership is unresolved for at least one requested path.");
  }

  if (paths.length > 1) {
    warnings.push("Multiple paths were requested; keep the change boundary explicit.");
  }

  return warnings;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
