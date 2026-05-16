import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { createFindingReport } from "../../packages/kernel-findings/dist/index.js";
import {
  buildFindingFilterReport,
  createLocalArtifactStore,
} from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- architecture summary ----------

test("architecture summary cites FindingFilterPolicySuggestionReport in inputRefs when present", async () => {
  await withSuggestionFixture(async ({ root }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const types = publication.header.inputRefs.map((ref) => ref.type);
    assert.ok(types.includes("FindingFilterPolicySuggestionReport"));
  });
});

test("architecture summary includes Finding Filter Policy Suggestions section with counts + apply guidance", async () => {
  await withSuggestionFixture(async ({ root }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;
    assert.ok(content.includes("## Finding Filter Policy Suggestions"));
    assert.ok(/- Total suggestions: \d+/.test(content));
    assert.ok(/- High confidence: \d+/.test(content));
    assert.ok(/- Medium confidence: \d+/.test(content));
    assert.ok(/- Low confidence: \d+/.test(content));
    assert.ok(
      content.includes("Suggestions are advisory and do not mutate"),
      "architecture summary must state suggestions are advisory and do not mutate config",
    );
    assert.ok(
      content.includes("rekon findings filter-policy apply"),
      "architecture summary must surface the explicit apply command",
    );
  });
});

test("architecture summary renders a row per suggestion with rule + affected counts + evidence", async () => {
  await withSuggestionFixture(async ({ root, suggestions }) => {
    assert.ok(suggestions.length > 0);
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;
    assert.ok(content.includes("| Suggestion | Confidence | Reason | Suggested Rule | Affected Findings | Evidence |"));
    const [first] = suggestions;
    assert.ok(content.includes(first.id), `architecture summary must list suggestion id ${first.id}`);
    assert.ok(content.includes(first.suggestedRule.id), "row must include suggested rule id");
    assert.ok(content.includes(first.reason));
  });
});

test("architecture summary warns that low-confidence suggestions require --force", async () => {
  await withSuggestionFixture(
    { includeLowConfidence: true },
    async ({ root }) => {
      runCli(["publish", "architecture", "--root", root, "--json"]);
      const publication = await readLatestPublicationOfKind(root, "architecture-summary");
      const content = publication.content;
      assert.ok(
        content.includes("Low-confidence suggestions require explicit `--force` to apply"),
        "architecture summary must warn about --force for low-confidence suggestions",
      );
    },
  );
});

test("architecture summary missing-report branch when no suggestion run has happened", async () => {
  await withRefreshedFixture(async (root) => {
    // Refresh produced filter / filter-health but no
    // FindingFilterPolicySuggestionReport — publish should render
    // the missing-artifact branch.
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;
    assert.ok(content.includes("## Finding Filter Policy Suggestions"));
    assert.ok(
      content.includes("No FindingFilterPolicySuggestionReport indexed"),
      "architecture summary must guide the operator to run findings filter-policy suggest",
    );
    assert.ok(content.includes("rekon findings filter-policy suggest"));
  });
});

test("architecture summary stale-suggestion banner when a newer FindingFilterReport exists", async () => {
  await withSuggestionFixture(async ({ root }) => {
    // Add another FindingFilterReport AFTER the suggestion report
    // has landed. The suggestion report's inputRefs no longer
    // cite the latest filter report id, so the publication should
    // emit the stale banner.
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
    runCli(["findings", "filter", "--root", root, "--json"]);

    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;
    assert.ok(
      content.includes("Finding filter policy suggestions may be stale"),
      "architecture summary must warn when suggestions are stale relative to the latest filter report",
    );
    assert.ok(
      content.includes("rekon findings filter-policy suggest"),
      "stale banner must point at the regenerate command",
    );
  });
});

// ---------- agent contract ----------

test("agent contract cites FindingFilterPolicySuggestionReport in inputRefs when present", async () => {
  await withSuggestionFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const types = publication.header.inputRefs.map((ref) => ref.type);
    assert.ok(types.includes("FindingFilterPolicySuggestionReport"));
  });
});

test("agent contract includes Finding Filter Policy Suggestions subsection and warns suggestions are advisory", async () => {
  await withSuggestionFixture(async ({ root, suggestions }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const content = publication.content;
    assert.ok(content.includes("### Finding Filter Policy Suggestions"));
    assert.ok(content.includes("- Suggestions available:"));
    assert.ok(content.includes("- High confidence:"));
    assert.ok(content.includes("- Low confidence requiring `--force`:"));
    if (suggestions.length > 0) {
      assert.ok(
        content.includes("Filter policy suggestions are advisory. Do not assume they are applied."),
        "agent contract must visibly warn that suggestions are advisory when suggestions exist",
      );
      const [first] = suggestions;
      assert.ok(content.includes(first.id));
    }
    assert.ok(
      content.includes("Ask the operator before applying filter policy suggestions"),
      "agent contract must instruct the agent to ask the operator first",
    );
  });
});

test("agent contract Do Not Do forbids applying suggestions without approval and treating them as applied", async () => {
  await withSuggestionFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const content = publication.content;
    assert.ok(
      content.includes("Do not apply filter policy suggestions without explicit operator approval"),
      "agent contract Do Not Do must forbid unauthorized apply",
    );
    assert.ok(
      content.includes("Do not treat filter policy suggestions as already-applied config"),
      "agent contract Do Not Do must distinguish suggestions from applied config",
    );
  });
});

test("agent contract missing-report branch when no suggestion run has happened", async () => {
  await withRefreshedFixture(async (root) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const content = publication.content;
    assert.ok(content.includes("### Finding Filter Policy Suggestions"));
    assert.ok(content.includes("No FindingFilterPolicySuggestionReport indexed"));
    assert.ok(content.includes("rekon findings filter-policy suggest"));
  });
});

test("agent contract stale-suggestion banner when a newer FindingFilterReport exists", async () => {
  await withSuggestionFixture(async ({ root }) => {
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 10));
    runCli(["findings", "filter", "--root", root, "--json"]);

    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const content = publication.content;
    assert.ok(
      content.includes("Suggestion report may be stale"),
      "agent contract must warn when suggestions are stale relative to the latest filter report",
    );
    assert.ok(content.includes("rekon findings filter-policy suggest"));
  });
});

// ---------- regression / cohabitation ----------

test("publish agents and publish proof still work after filter-policy-suggestions wiring", async () => {
  await withSuggestionFixture(async ({ root }) => {
    const agentsResult = JSON.parse(
      runCli(["publish", "agents", "--root", root, "--json"]).stdout,
    );
    assert.ok(
      agentsResult.artifacts.some((ref) => ref.type === "Publication"),
      "publish agents should still emit a Publication",
    );
    const proofResult = JSON.parse(
      runCli(["publish", "proof", "--root", root, "--json"]).stdout,
    );
    assert.ok(
      proofResult.artifacts.some((ref) => ref.type === "Publication"),
      "publish proof should still emit a Publication",
    );
  });
});

test("artifacts validate stays clean after filter-policy-suggestions surfaces wiring", async () => {
  await withSuggestionFixture(async ({ root }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);

    const validation = JSON.parse(
      runCli(["artifacts", "validate", "--root", root, "--json"]).stdout,
    );
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.issues ?? [], []);
  });
});

// ---------- helpers ----------

async function withInitFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-pub-filter-policy-"));
  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    runCli(["init", "--root", root, "--json"]);
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withRefreshedFixture(callback) {
  await withInitFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    await callback(root);
  });
}

async function withSuggestionFixture(optionsOrCallback, maybeCallback) {
  let options = {};
  let callback;
  if (typeof optionsOrCallback === "function") {
    callback = optionsOrCallback;
  } else {
    options = optionsOrCallback ?? {};
    callback = maybeCallback;
  }
  if (typeof callback !== "function") {
    throw new Error("withSuggestionFixture requires a callback");
  }

  await withRefreshedFixture(async (root) => {
    // Overlay a synthetic FindingReport with repeated generated
    // paths so the suggestion deriver emits at least one
    // high-confidence policy-gap suggestion. When the caller asks
    // for low-confidence coverage too, add 5+ identical-reason
    // findings spread across distinct path prefixes so the
    // high-volume rule fires at low confidence.
    const store = createLocalArtifactStore(root);
    await store.init();
    const ev = (await store.list("EvidenceGraph"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const om = (await store.list("OwnershipMap"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const inputRefs = [];
    if (ev) inputRefs.push({ type: ev.type, id: ev.id, schemaVersion: ev.schemaVersion });
    if (om) inputRefs.push({ type: om.type, id: om.id, schemaVersion: om.schemaVersion });

    const findings = options.includeLowConfidence
      ? [
          finding("a", { files: ["src/dist/a.ts"] }),
          finding("b", { files: ["packages/dist/b.ts"] }),
          finding("c", { files: ["apps/dist/c.ts"] }),
          finding("d", { files: ["lib/dist/d.ts"] }),
          finding("e", { files: ["build/e.ts"] }),
        ]
      : [
          finding("gen-a", { files: ["src/generated/a.ts"] }),
          finding("gen-b", { files: ["src/generated/b.ts"] }),
          finding("gen-c", { files: ["src/generated/c.ts"] }),
          finding("ok", { files: ["src/lib/x.ts"] }),
        ];

    const report = createFindingReport({
      header: {
        artifactType: "FindingReport",
        artifactId: `fr-pub-policy-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "synthetic" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs,
        freshness: { status: "fresh" },
      },
      findings,
    });
    await store.write(report, { category: "findings" });

    // Re-run findings filter then findings filter-policy suggest so
    // the publications have artifacts to render.
    runCli(["findings", "filter", "--root", root, "--json"]);
    const suggestRaw = JSON.parse(
      runCli(["findings", "filter-policy", "suggest", "--root", root, "--json"]).stdout,
    );
    await callback({ root, suggestions: suggestRaw.suggestions ?? [] });
  });
}

function finding(id, overrides = {}) {
  return {
    id,
    type: overrides.type ?? "test.example",
    severity: overrides.severity ?? "medium",
    title: overrides.title ?? `Finding ${id}`,
    description: overrides.description ?? `Description for ${id}`,
    subjects: overrides.subjects ?? [`src/${id}.ts`],
    files: overrides.files,
    ruleId: overrides.ruleId,
    suggestedAction: overrides.suggestedAction,
  };
}

async function readLatestPublicationOfKind(root, kind) {
  const indexPath = join(root, ".rekon/registry/artifacts.index.json");
  const raw = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = Array.isArray(raw) ? raw : Array.isArray(raw.artifacts) ? raw.artifacts : [];
  const publications = entries.filter((entry) => entry.type === "Publication");
  publications.sort((left, right) => right.writtenAt.localeCompare(left.writtenAt));

  for (const candidate of publications) {
    const body = JSON.parse(await readFile(join(root, candidate.path), "utf8"));
    if (body.kind === kind) {
      return body;
    }
  }
  throw new Error(`No Publication of kind ${kind} found.`);
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
