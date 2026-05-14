import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");
const importBoundaryFixture = join(
  repoRoot,
  "examples/import-boundary-rule-pack/fixtures/bad-imports",
);
const ruleackPackageName = "rekon-capability-import-boundaries-example";

test("publish list includes @rekon/capability-docs.architecture-summary", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["publish", "list", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.publishers));
    assert.ok(
      result.publishers.some(
        (publisher) => publisher.id === "@rekon/capability-docs.architecture-summary",
      ),
      "architecture-summary publisher must appear in publish list",
    );
  });
});

test("rekon publish architecture writes a Publication artifact with the documented sections", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    const publicationRef = result.artifacts.find((ref) => ref.type === "Publication");
    assert.ok(publicationRef, "publish architecture must emit a Publication");

    const publication = JSON.parse(
      await readFile(join(root, publicationRef.path), "utf8"),
    );

    assert.equal(publication.kind, "architecture-summary");
    assert.equal(publication.format, "markdown");
    assert.equal(publication.title, "Rekon Architecture Summary");
    assert.equal(typeof publication.content, "string");

    for (const section of [
      "# Rekon Architecture Summary",
      "## Repository Overview",
      "## Owner Systems",
      "## Capability Map",
      "## Coherency Summary",
      "## Top Affected Paths",
      "## Remediation Queue",
      "## Agent Guidance",
      "## Freshness",
      "## Input Artifacts",
    ]) {
      assert.ok(
        publication.content.includes(section),
        `architecture summary must include section: ${section}`,
      );
    }

    const inputTypes = publication.header.inputRefs.map((ref) => ref.type);
    assert.ok(
      inputTypes.includes("IntelligenceSnapshot"),
      "header.inputRefs must include IntelligenceSnapshot",
    );
  });
});

test("publish run dispatches the architecture-summary publisher with the same shape", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli([
        "publish",
        "run",
        "@rekon/capability-docs.architecture-summary",
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    assert.ok(
      result.artifacts.some((ref) => ref.type === "Publication"),
      "publish run must emit a Publication",
    );
  });
});

test("publish architecture includes CoherencyDelta in inputRefs when available", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );
    const publicationRef = result.artifacts.find((ref) => ref.type === "Publication");
    const publication = JSON.parse(
      await readFile(join(root, publicationRef.path), "utf8"),
    );
    const inputTypes = publication.header.inputRefs.map((ref) => ref.type);

    assert.ok(inputTypes.includes("CoherencyDelta"), "should reference CoherencyDelta");
    assert.ok(inputTypes.includes("OwnershipMap"), "should reference OwnershipMap");
    assert.ok(inputTypes.includes("CapabilityMap"), "should reference CapabilityMap");
    assert.ok(inputTypes.includes("ObservedRepo"), "should reference ObservedRepo");
  });
});

test("publish architecture flags missing CoherencyDelta in the summary section", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );
    const publicationRef = result.artifacts.find((ref) => ref.type === "Publication");
    const publication = JSON.parse(
      await readFile(join(root, publicationRef.path), "utf8"),
    );

    assert.ok(
      publication.content.includes("No CoherencyDelta found"),
      "must instruct users to run rekon coherency delta when missing",
    );
  });
});

test("artifacts freshness marks older architecture summary stale after newer CoherencyDelta", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli(["evaluate", "--root", root, "--json"]);
    runCli(["snapshot", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const publishResult = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );
    const publicationRef = publishResult.artifacts.find((ref) => ref.type === "Publication");
    const publicationId = publicationRef.id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 5));
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);

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

    const entry = freshness.artifacts.find(
      (candidate) => candidate.id === publicationId,
    );
    assert.ok(entry);
    assert.equal(entry.status, "stale");
    assert.ok(
      entry.issues.some(
        (issue) =>
          issue.code === "newer-input-exists" && issue.inputType === "CoherencyDelta",
      ),
      "expected stale issue citing newer CoherencyDelta",
    );
  });
});

test("existing publish agents command still works", async () => {
  await withCliFixture(exampleRoot, async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["publish", "agents", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    assert.ok(
      result.artifacts.some((ref) => ref.type === "Publication"),
      "publish agents must still emit a Publication",
    );
  });
});

test("publish architecture against the import-boundary rule pack surfaces active findings", async (t) => {
  if (!(await packageInstalled(ruleackPackageName))) {
    t.skip(
      `External rule pack not installed. Run 'npm install ./examples/import-boundary-rule-pack --no-save' before this test.`,
    );
    return;
  }

  await withCliFixture(importBoundaryFixture, async (root) => {
    runCli(["init", "--root", root, "--json"]);

    const configPath = join(root, ".rekon", "config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    config.capabilities = [
      ...config.capabilities,
      { package: ruleackPackageName },
    ];
    config.permissions = {
      ...(config.permissions ?? {}),
      [ruleackPackageName]: ["read:artifacts", "write:artifacts"],
    };
    const fsModule = await import("node:fs/promises");
    await fsModule.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    runCli(["observe", "--root", root, "--json"]);
    runCli(["project", "--root", root, "--json"]);
    runCli([
      "evaluate",
      "run",
      "import-boundaries.evaluate",
      "--root",
      root,
      "--json",
    ]);
    runCli(["snapshot", "--root", root, "--json"]);
    runCli(["findings", "lifecycle", "--root", root, "--json"]);
    runCli(["coherency", "delta", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );
    const publicationRef = result.artifacts.find((ref) => ref.type === "Publication");
    const publication = JSON.parse(
      await readFile(join(root, publicationRef.path), "utf8"),
    );

    assert.ok(
      publication.content.includes("Active findings:"),
      "should report active finding count",
    );
    assert.ok(
      publication.content.includes("import_boundary"),
      "should reference import_boundary findings",
    );
    assert.ok(
      publication.content.includes("Remediation Queue"),
      "should include remediation queue section",
    );
    assert.ok(
      publication.content.includes("| p0 |") || publication.content.includes("| p1 |"),
      "should include at least one prioritized remediation row",
    );
  });
});

async function packageInstalled(name) {
  try {
    await readdir(join(repoRoot, "node_modules", name));
    return true;
  } catch {
    return false;
  }
}

async function withCliFixture(sourceRoot, callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-arch-publisher-"));

  try {
    await cp(sourceRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(sourceRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });
    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
