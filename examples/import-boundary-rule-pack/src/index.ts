import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import { type EvidenceFact } from "@rekon/kernel-evidence";
import {
  type Finding,
  type FindingSeverity,
  createFindingReport,
} from "@rekon/kernel-findings";
import { type Evaluator, defineCapability } from "@rekon/sdk";

const PARENT_RELATIVE_PREFIX = "../";
const GENERATED_OUTPUT_FRAGMENTS = ["/dist/", "dist/", "/build/", "build/"];

type ImportFactValue = {
  source?: string;
  target?: string;
  line?: number;
};

export const importBoundaryEvaluator: Evaluator = {
  id: "import-boundaries.evaluate",
  produces: ["FindingReport"],
  async evaluate({ artifacts, input }) {
    const evidenceRef = (await artifacts.list("EvidenceGraph"))
      .sort((left, right) => right.id.localeCompare(left.id))[0];

    if (!evidenceRef) {
      throw new Error(
        "Import boundary evaluator requires an EvidenceGraph artifact. Run 'rekon observe' first.",
      );
    }

    const graph = (await artifacts.read(evidenceRef)) as {
      header: ArtifactHeader;
      facts?: EvidenceFact[];
    };
    const findings: Finding[] = [];

    for (const fact of graph.facts ?? []) {
      if (fact.kind !== "import") {
        continue;
      }

      const value = fact.value as ImportFactValue;
      const source = typeof value.source === "string" ? value.source : null;
      const target = typeof value.target === "string" ? value.target : null;

      if (!source || !target) {
        continue;
      }

      if (target.startsWith(PARENT_RELATIVE_PREFIX)) {
        findings.push({
          id: `import_boundary.parent_relative_import:${source}:${target}`,
          type: "import_boundary.parent_relative_import",
          severity: "medium",
          title: "Parent-relative import",
          description:
            "File imports from a parent directory; prefer a package/root alias or explicit public boundary.",
          ruleId: "import-boundaries.parent-relative",
          files: [source],
          subjects: [source, target],
          evidence: [evidenceRef],
          status: "new",
          suggestedAction:
            "Replace parent-relative import with a stable package/root import or move shared code behind an explicit boundary.",
        });
      }

      if (importsGeneratedOutput(target)) {
        findings.push({
          id: `import_boundary.generated_output_import:${source}:${target}`,
          type: "import_boundary.generated_output_import",
          severity: "high",
          title: "Import from generated/build output",
          description:
            "Source imports from generated output; import from source or a public package entrypoint instead.",
          ruleId: "import-boundaries.generated-output",
          files: [source],
          subjects: [source, target],
          evidence: [evidenceRef],
          status: "new",
          suggestedAction:
            "Replace generated-output import with a source import or package entrypoint import.",
        });
      }
    }

    const report = createFindingReport({
      header: buildHeader(
        "FindingReport",
        `import-boundary-findings-${Date.now()}`,
        repoId(input),
        [evidenceRef],
      ),
      findings,
    });

    return [await artifacts.write("FindingReport", report)];
  },
};

export default defineCapability({
  manifest: {
    id: "rekon-capability-import-boundaries-example",
    name: "Import Boundary Rule Pack Example",
    version: "0.1.0-alpha.1",
    description:
      "Example external Rekon evaluator capability that flags parent-relative imports and imports from generated/build output. Distilled from prior import-governance behavior.",
    roles: ["evaluator"],
    consumes: ["EvidenceGraph"],
    produces: ["FindingReport"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "inputs.changed",
        description:
          "Import boundary findings change when the source EvidenceGraph changes.",
        inputs: ["EvidenceGraph"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0-alpha.1",
    },
  },
  register(registry) {
    registry.evaluator(importBoundaryEvaluator);
  },
});

export function importsGeneratedOutput(target: string): boolean {
  return GENERATED_OUTPUT_FRAGMENTS.some((fragment) => target.includes(fragment));
}

export const findingTypes = [
  "import_boundary.parent_relative_import",
  "import_boundary.generated_output_import",
] as const;

export const findingSeverities: Record<(typeof findingTypes)[number], FindingSeverity> = {
  "import_boundary.parent_relative_import": "medium",
  "import_boundary.generated_output_import": "high",
};

function buildHeader(
  artifactType: string,
  artifactId: string,
  repositoryId: string,
  inputRefs: ArtifactRef[],
): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: { repoId: repositoryId },
    producer: {
      id: "rekon-capability-import-boundaries-example",
      version: "0.1.0-alpha.1",
    },
    inputRefs,
    freshness: { status: "fresh" },
    provenance: { confidence: 1 },
  };
}

function repoId(input: Record<string, unknown> | undefined): string {
  const repo = input?.repo;

  if (repo && typeof repo === "object" && "id" in repo && typeof repo.id === "string") {
    return repo.id;
  }

  return "repo";
}
