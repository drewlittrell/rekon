import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import { type EvidenceFact, type EvidenceProvider, type ProviderContext } from "@rekon/kernel-evidence";
import { createFindingReport } from "@rekon/kernel-findings";
import { type Evaluator, type Publisher, defineCapability } from "@rekon/sdk";

const IGNORED_DIRS = new Set([".git", ".rekon", "node_modules", "dist", "build", "coverage"]);

// Evidence providers are the only role here that reads source files. It emits
// facts; it does not write artifacts directly.
export const todoEvidenceProvider: EvidenceProvider = {
  id: "todo-comments",
  kind: "semantic",
  supports() {
    return true;
  },
  async extract(ctx) {
    const files = ctx.changedFiles?.length
      ? ctx.changedFiles
      : await listSourceFiles(ctx.repoRoot);
    const facts: EvidenceFact[] = [];

    for (const file of files) {
      const absolutePath = join(ctx.repoRoot, file);
      let contents = "";

      try {
        contents = await readFile(absolutePath, "utf8");
      } catch {
        continue;
      }

      const lines = contents.split(/\r?\n/);

      lines.forEach((line, index) => {
        const match = line.match(/\bTODO\b[:\s-]*(.*)$/i);

        if (!match) {
          return;
        }

        facts.push({
          id: `todo:${file}:${index + 1}`,
          kind: "todo_comment",
          subject: file,
          value: {
            text: match[1]?.trim() ?? "",
            line: index + 1,
          },
          confidence: 1,
          provenance: {
            source: file,
            pack: "rekon-capability-todo-example",
            file,
            line: index + 1,
            extractorVersion: "0.1.0",
          },
        });
      });
    }

    return facts;
  },
};

// Evaluators consume existing artifacts and write FindingReport artifacts.
// This keeps TODO detection inspectable instead of hiding it in a prompt.
export const todoEvaluator: Evaluator = {
  id: "todo.findings",
  produces: ["FindingReport"],
  async evaluate({ artifacts, input }) {
    const evidenceRef = (await artifacts.list("EvidenceGraph")).sort((left, right) => right.id.localeCompare(left.id))[0];

    if (!evidenceRef) {
      throw new Error("TODO evaluator requires an EvidenceGraph artifact.");
    }

    const graph = await artifacts.read(evidenceRef) as { header: ArtifactHeader; facts?: EvidenceFact[] };
    const findings = (graph.facts ?? [])
      .filter((fact) => fact.kind === "todo_comment")
      .map((fact) => ({
        id: `todo:${fact.subject}:${String(fact.value.line ?? "unknown")}`,
        type: "todo_comment",
        severity: "low" as const,
        title: "TODO comment",
        description: typeof fact.value.text === "string" && fact.value.text.length > 0
          ? fact.value.text
          : "Source contains a TODO comment.",
        subjects: [fact.subject],
        files: [fact.subject],
        evidence: [evidenceRef],
        status: "new" as const,
      }));
    const report = createFindingReport({
      header: createHeader("FindingReport", `todo-findings-${Date.now()}`, repoId(input), [evidenceRef]),
      findings,
    });

    return [await artifacts.write("FindingReport", report)];
  },
};

// Publishers turn typed artifacts into user-facing publications. The
// publication is guidance, not canonical truth.
export const todoPublisher: Publisher = {
  id: "todo.report",
  produces: ["Publication"],
  async publish({ artifacts, input }) {
    const findingRef = (await artifacts.list("FindingReport")).sort((left, right) => right.id.localeCompare(left.id))[0];

    if (!findingRef) {
      throw new Error("TODO publisher requires a FindingReport artifact.");
    }

    const report = await artifacts.read(findingRef) as { findings?: Array<{ title?: string; files?: string[]; description?: string }> };
    const publication = {
      header: createHeader("Publication", `todo-report-${Date.now()}`, repoId(input), [findingRef]),
      kind: "todo-report",
      path: ".rekon/artifacts/publications/todo-report.md",
      format: "markdown",
      content: [
        "# TODO Report",
        "",
        ...(report.findings ?? []).map((finding) => `- ${finding.files?.[0] ?? "unknown"}: ${finding.description ?? finding.title ?? "TODO"}`),
      ].join("\n"),
    };

    return [await artifacts.write("Publication", publication)];
  },
};

export default defineCapability({
  manifest: {
    id: "rekon-capability-todo-example",
    name: "TODO Comment Example",
    version: "0.1.0",
    roles: ["evidence-provider", "evaluator", "publisher"],
    consumes: ["SourceFile", "EvidenceGraph", "FindingReport"],
    produces: ["EvidenceGraph", "FindingReport", "Publication"],
    permissions: ["read:source", "read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "source.changed",
        description: "TODO evidence changes when source files change.",
        paths: ["**/*"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    // Built-ins and community capabilities register through the same SDK.
    registry.evidenceProvider(todoEvidenceProvider);
    registry.evaluator(todoEvaluator);
    registry.publisher(todoPublisher);
  },
});

async function listSourceFiles(root: string, directory = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        files.push(...await listSourceFiles(root, join(directory, entry.name)));
      }
    } else if (entry.isFile() && /\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/.test(entry.name)) {
      files.push(relative(root, join(directory, entry.name)));
    }
  }

  return files.sort();
}

function createHeader(artifactType: string, artifactId: string, repositoryId: string, inputRefs: ArtifactRef[]): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: {
      repoId: repositoryId,
    },
    producer: {
      id: "rekon-capability-todo-example",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 1,
    },
  };
}

function repoId(input: Record<string, unknown> | undefined): string {
  const repo = input?.repo;

  if (repo && typeof repo === "object" && "id" in repo && typeof repo.id === "string") {
    return repo.id;
  }

  return "repo";
}
