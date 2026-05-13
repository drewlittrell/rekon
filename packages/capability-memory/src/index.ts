import { type ArtifactHeader, type ArtifactRef } from "@rekon/kernel-artifacts";
import { type Learner, defineCapability } from "@rekon/sdk";

export type OperatorFeedbackEntry = {
  header: ArtifactHeader;
  instruction: string;
  scope: {
    paths: string[];
    goal?: string;
  };
  confidence: number;
};

export type MemorySelection = {
  header: ArtifactHeader;
  path: string;
  goal: string;
  selections: Array<{
    instruction: string;
    scope?: Record<string, unknown>;
    confidence: number;
    reason: string;
  }>;
};

export const memoryLearner: Learner = {
  id: "@rekon/capability-memory.learner",
  produces: ["OperatorFeedbackEntry", "MemoryEvent", "MemorySelection"],
  async learn({ artifacts, input }) {
    const mode = typeof input?.mode === "string" ? input.mode : "select";
    const repo = parseRepo(input?.repo);

    if (mode === "add") {
      const instruction = requiredString(input?.instruction, "instruction");
      const paths = parsePaths(input?.path ?? input?.paths);
      const goal = typeof input?.goal === "string" ? input.goal : undefined;
      const entry: OperatorFeedbackEntry = {
        header: createHeader("OperatorFeedbackEntry", `feedback-${Date.now()}`, repo.id, [], paths),
        instruction,
        scope: {
          paths,
          goal,
        },
        confidence: 1,
      };
      const entryRef = await artifacts.write("OperatorFeedbackEntry", entry);
      const event = {
        header: createHeader("MemoryEvent", `memory-event-${Date.now()}`, repo.id, [entryRef], paths),
        event: "feedback.added",
        entryRef,
      };

      return [entryRef, await artifacts.write("MemoryEvent", event)];
    }

    if (mode === "select") {
      const path = requiredString(input?.path, "path");
      const goal = typeof input?.goal === "string" ? input.goal : "";
      const entries = await readFeedbackEntries(artifacts);
      const selections = entries
        .map((entry) => ({
          entry,
          score: scoreEntry(entry, path, goal),
        }))
        .filter((candidate) => candidate.score > 0)
        .sort((left, right) => right.score - left.score || left.entry.instruction.localeCompare(right.entry.instruction))
        .slice(0, 5)
        .map(({ entry, score }) => ({
          instruction: entry.instruction,
          scope: entry.scope,
          confidence: Math.min(1, entry.confidence * score),
          reason: entry.scope.paths.includes(path) ? "path match" : "scope prefix match",
        }));
      const inputRefs = await artifacts.list("OperatorFeedbackEntry");
      const selection: MemorySelection = {
        header: createHeader("MemorySelection", `memory-selection-${Date.now()}`, repo.id, inputRefs, [path]),
        path,
        goal,
        selections,
      };

      return [await artifacts.write("MemorySelection", selection)];
    }

    throw new Error(`Unknown memory learner mode: ${mode}`);
  },
};

export default defineCapability({
  manifest: {
    id: "@rekon/capability-memory",
    name: "Memory Capability",
    version: "0.1.0",
    roles: ["learner"],
    consumes: ["OperatorFeedbackEntry", "ResolverPacket"],
    produces: ["OperatorFeedbackEntry", "MemoryEvent", "MemorySelection"],
    permissions: ["read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "operator.feedback.changed",
        description: "Memory selections are invalid when feedback entries change.",
        inputs: ["OperatorFeedbackEntry"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.learner(memoryLearner);
  },
});

async function readFeedbackEntries(artifacts: {
  list(type?: string): Promise<ArtifactRef[]>;
  read(ref: ArtifactRef): Promise<unknown>;
}): Promise<OperatorFeedbackEntry[]> {
  const refs = await artifacts.list("OperatorFeedbackEntry");
  const entries = await Promise.all(refs.map((ref) => artifacts.read(ref) as Promise<OperatorFeedbackEntry>));

  return entries.filter((entry) => typeof entry.instruction === "string" && entry.scope !== undefined);
}

function scoreEntry(entry: OperatorFeedbackEntry, path: string, goal: string): number {
  const pathScore = entry.scope.paths.some((scopePath) => path === scopePath)
    ? 1
    : entry.scope.paths.some((scopePath) => path.startsWith(`${scopePath}/`) || scopePath.startsWith(`${path}/`))
      ? 0.75
      : 0;
  const goalScore = entry.scope.goal && goal.toLowerCase().includes(entry.scope.goal.toLowerCase())
    ? 0.2
    : 0;

  return pathScore + goalScore;
}

function createHeader(
  artifactType: string,
  artifactId: string,
  repoId: string,
  inputRefs: ArtifactRef[],
  paths?: string[],
): ArtifactHeader {
  return {
    artifactType,
    artifactId,
    schemaVersion: "0.1.0",
    generatedAt: new Date().toISOString(),
    subject: {
      repoId,
      paths,
    },
    producer: {
      id: "@rekon/capability-memory",
      version: "0.1.0",
    },
    inputRefs,
    freshness: {
      status: "fresh",
    },
    provenance: {
      confidence: 1,
      notes: ["Memory enriches resolver output; it does not rewrite architecture facts."],
    },
  };
}

function parseRepo(value: unknown): { id: string } {
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string" && value.id.length > 0) {
    return { id: value.id };
  }

  return { id: "repo" };
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

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`memory ${field} is required.`);
  }

  return value;
}
