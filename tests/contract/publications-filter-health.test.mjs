import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { createFindingReport } from "../../packages/kernel-findings/dist/index.js";
import { createLocalArtifactStore } from "../../packages/runtime/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

// ---------- architecture summary ----------

test("architecture summary includes Finding Filter Health section sourced from filter artifacts", async () => {
  await withPolicyFixture(async ({ root }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;

    assert.ok(content.includes("## Finding Filter Health"));
    assert.ok(content.includes("- Total findings: 2"));
    assert.ok(content.includes("- Kept findings: 1"));
    assert.ok(content.includes("- Filtered findings: 1"));
    assert.ok(content.includes("- Filter rate: "));
    assert.ok(content.includes("- Policy-filtered findings: 1"));
    assert.ok(content.includes("### Filter Reasons"));
    assert.ok(content.includes("policy-exception"));
    assert.ok(content.includes("### Policy Filters"));
    assert.ok(content.includes("legacy-src"));
    assert.ok(content.includes("### Filter Health Alerts"));
    assert.ok(
      content.includes("Filtered findings are not deleted"),
      "architecture summary must explicitly state filtered findings remain auditable",
    );
  });
});

test("architecture summary cites FindingFilterReport and FindingFilterHealthReport in inputRefs", async () => {
  await withPolicyFixture(async ({ root }) => {
    runCli(["publish", "architecture", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const types = publication.header.inputRefs.map((ref) => ref.type);
    assert.ok(types.includes("FindingFilterReport"));
    assert.ok(types.includes("FindingFilterHealthReport"));
  });
});

test("architecture summary renders filter-health alerts when alerts exist", async () => {
  await withPolicyFixture(
    {
      // Configure a policy that never matches so unused-policy-filter
      // fires and is visible in the architecture summary.
      additionalPolicies: [
        {
          id: "never-fires",
          reason: "policy-exception",
          evidence: "Reserved for a path we don't ship yet.",
          pathPattern: "src/unbuilt/**",
        },
      ],
    },
    async ({ root }) => {
      runCli(["publish", "architecture", "--root", root, "--json"]);
      const publication = await readLatestPublicationOfKind(root, "architecture-summary");
      const content = publication.content;
      assert.ok(content.includes("unused-policy-filter"));
      assert.ok(content.includes("never-fires"));
    },
  );
});

test("architecture summary missing-artifact guidance when no filter run has happened", async () => {
  await withInitFixture(async (root) => {
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);
    runCli(["publish", "architecture", "--root", root, "--json"]);

    const publication = await readLatestPublicationOfKind(root, "architecture-summary");
    const content = publication.content;
    assert.ok(content.includes("## Finding Filter Health"));
    assert.ok(
      content.includes("No FindingFilterReport found")
        || content.includes("No FindingFilterHealthReport found"),
      "architecture summary must guide the operator to run findings filter / filter-health",
    );
    assert.ok(content.includes("rekon findings filter") || content.includes("rekon refresh"));
  });
});

// ---------- agent contract ----------

test("agent contract includes Finding Filter Health subsection sourced from filter artifacts", async () => {
  await withPolicyFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const content = publication.content;

    assert.ok(content.includes("### Finding Filter Health"));
    assert.ok(content.includes("- Kept findings: 1"));
    assert.ok(content.includes("- Filtered findings: 1"));
    assert.ok(content.includes("- Filter rate: "));
    assert.ok(content.includes("- Policy filters active: 1"));
    assert.ok(content.includes("- Warnings:"));
  });
});

test("agent contract cites FindingFilterReport and FindingFilterHealthReport in inputRefs", async () => {
  await withPolicyFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const types = publication.header.inputRefs.map((ref) => ref.type);
    assert.ok(types.includes("FindingFilterReport"));
    assert.ok(types.includes("FindingFilterHealthReport"));
  });
});

test("agent contract surfaces filter-health alerts visibly when alerts exist", async () => {
  await withPolicyFixture(
    {
      additionalPolicies: [
        {
          id: "never-fires",
          reason: "policy-exception",
          evidence: "Reserved.",
          pathPattern: "src/unbuilt/**",
        },
      ],
    },
    async ({ root }) => {
      runCli(["publish", "agent-contract", "--root", root, "--json"]);
      const publication = await readLatestPublicationOfKind(root, "agent-contract");
      const content = publication.content;
      assert.ok(content.includes("### Finding Filter Health"));
      assert.ok(
        content.includes("Filter-health warnings exist"),
        "agent contract must visibly warn when filter-health alerts exist",
      );
      assert.ok(content.includes("unused-policy-filter"));
    },
  );
});

test("agent contract Do Not Do includes clean-active-governance warning", async () => {
  await withPolicyFixture(async ({ root }) => {
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    assert.ok(
      publication.content.includes(
        "Do not treat a clean active-governance surface as proof that no raw findings exist",
      ),
      "agent contract Do Not Do must warn against treating clean active governance as a clean codebase",
    );
  });
});

test("agent contract missing-artifact guidance when filter artifacts are missing", async () => {
  await withInitFixture(async (root) => {
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);
    runCli(["publish", "agent-contract", "--root", root, "--json"]);

    const publication = await readLatestPublicationOfKind(root, "agent-contract");
    const content = publication.content;
    assert.ok(content.includes("### Finding Filter Health"));
    assert.ok(
      content.includes("No FindingFilterReport found")
        || content.includes("No FindingFilterHealthReport found"),
    );
    assert.ok(content.includes("rekon findings filter") || content.includes("rekon refresh"));
  });
});

// ---------- freshness ----------

test("architecture summary freshness goes stale after a newer FindingFilterHealthReport", async () => {
  await withPolicyFixture(async ({ root }) => {
    const first = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );
    const publicationId = first.artifacts.find((ref) => ref.type === "Publication").id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 20));
    runCli(["findings", "filter-health", "--root", root, "--json"]);

    const freshness = JSON.parse(
      runCli([
        "artifacts",
        "freshness",
        "--root",
        root,
        "--type",
        "Publication",
        "--id",
        publicationId,
        "--json",
      ]).stdout,
    );
    const entry = freshness.artifacts.find((candidate) => candidate.id === publicationId);
    assert.ok(entry);
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) =>
          issue.code === "newer-input-exists" && issue.inputType === "FindingFilterHealthReport",
      ),
      `expected stale issue citing newer FindingFilterHealthReport, got ${JSON.stringify(entry.issues)}`,
    );
  });
});

test("existing publish agents and publish proof still work after filter-health wiring", async () => {
  await withPolicyFixture(async ({ root }) => {
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

test("artifacts validate stays clean after filter-health surfaces wiring", async () => {
  await withPolicyFixture(async ({ root }) => {
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
  const root = await mkdtemp(join(tmpdir(), "rekon-pub-filter-health-"));
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

async function withPolicyFixture(optionsOrCallback, maybeCallback) {
  let options = {};
  let callback;
  if (typeof optionsOrCallback === "function") {
    callback = optionsOrCallback;
  } else {
    options = optionsOrCallback ?? {};
    callback = maybeCallback;
  }
  if (typeof callback !== "function") {
    throw new Error("withPolicyFixture requires a callback");
  }

  await withInitFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);

    // Patch .rekon/config.json with at least one filter policy plus
    // any extras the caller supplies.
    const cfgPath = join(root, ".rekon", "config.json");
    const cfg = JSON.parse(await readFile(cfgPath, "utf8"));
    cfg.findingFilters = [
      {
        id: "legacy-src",
        reason: "policy-exception",
        evidence: "Legacy module is excluded from active governance.",
        pathPattern: "src/legacy/**",
        confidence: "medium",
      },
      ...(options.additionalPolicies ?? []),
    ];
    await writeFile(cfgPath, JSON.stringify(cfg, null, 2), "utf8");

    // Overlay a synthetic FindingReport so the filter has something
    // real to suppress; cite the latest EvidenceGraph + OwnershipMap so
    // freshness stays clean.
    const store = createLocalArtifactStore(root);
    await store.init();
    const ev = (await store.list("EvidenceGraph"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const om = (await store.list("OwnershipMap"))
      .slice()
      .sort((left, right) => right.writtenAt.localeCompare(left.writtenAt))[0];
    const report = createFindingReport({
      header: {
        artifactType: "FindingReport",
        artifactId: `fr-pub-filter-${Date.now()}`,
        schemaVersion: "0.1.0",
        generatedAt: new Date().toISOString(),
        subject: { repoId: "synthetic" },
        producer: { id: "test-harness", version: "0.1.0" },
        inputRefs: [
          ev ? { type: ev.type, id: ev.id, schemaVersion: ev.schemaVersion } : undefined,
          om ? { type: om.type, id: om.id, schemaVersion: om.schemaVersion } : undefined,
        ].filter(Boolean),
        freshness: { status: "fresh" },
      },
      findings: [
        finding("legacy", { files: ["src/legacy/widget.ts"] }),
        finding("ok", { files: ["src/lib/index.ts"] }),
      ],
    });
    await store.write(report, { category: "findings" });

    // Re-run findings filter / filter-health so the policy applies and
    // the new artifacts are indexed before we publish.
    runCli(["findings", "filter", "--root", root, "--json"]);
    runCli(["findings", "filter-health", "--root", root, "--json"]);

    await callback({ root });
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
