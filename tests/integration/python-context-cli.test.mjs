import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages", "cli", "dist", "index.js");
const fixtureRoot = join(repoRoot, "tests", "evals", "model-interface-mixed", "repo");
const taskPath = "services/notifications_py/notifications/delivery_service.py";
const expectedContext = [
  taskPath,
  "services/notifications_py/notifications/contact_repository.py",
  "services/notifications_py/notifications/delivery_policy.py",
  "services/notifications_py/notifications/delivery_gateway.py",
  "services/notifications_py/tests/test_delivery_service.py",
];

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      REKON_LLM_ENABLED: "0",
      OPENAI_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      VOYAGE_API_KEY: "",
    },
  });
}

test("scan and task context recover a Python service's bounded collaborator neighborhood", async () => {
  const work = await mkdtemp(join(tmpdir(), "rekon-python-context-"));
  try {
    await cp(fixtureRoot, work, { recursive: true });
    const scan = runCli(["scan", "--root", work, "--json"], work);
    assert.equal(scan.status, 0, scan.stderr || scan.stdout);
    const scanPayload = JSON.parse(scan.stdout);
    assert.ok(scanPayload.refresh.steps.find((step) => step.id === "capability.graph")?.summary.files >= 29);

    const context = runCli([
      "context",
      "task",
      "--root",
      work,
      "--task",
      `Fix opted-out notification delivery in ${taskPath}.`,
      "--path",
      taskPath,
      "--provider",
      "mock",
      "--json",
    ], work);
    assert.equal(context.status, 0, context.stderr || context.stdout);
    const payload = JSON.parse(context.stdout);
    const selectedPaths = new Set(payload.agentContext.coreContext.map((item) => item.path).filter(Boolean));
    for (const expectedPath of expectedContext) {
      assert.equal(selectedPaths.has(expectedPath), true, `missing ${expectedPath}`);
    }
    assert.equal(payload.agentContext.coreContext.some((item) => (
      item.path === "services/notifications_py/notifications/api.py"
    )), false);
    assert.ok(payload.agentContext.sourceSpans.some((span) => span.path === taskPath));
    assert.ok(payload.contextItems.some((item) => item.reason.includes("injected_dependency_candidate")));

    const evidenceIndex = scanPayload.refresh.artifacts.find((entry) => entry.type === "EvidenceGraph");
    const evidence = JSON.parse(await readFile(join(work, evidenceIndex.path), "utf8"));
    assert.ok(evidence.facts.some((fact) => (
      fact.kind === "file" && fact.value.path === taskPath && fact.provenance.pack === "@rekon/capability-python"
    )));
    assert.ok(evidence.facts.some((fact) => (
      fact.kind === "import"
      && fact.value.path === "services/notifications_py/tests/test_delivery_service.py"
      && fact.value.resolvedTarget === taskPath
    )));

    const validate = runCli(["artifacts", "validate", "--root", work, "--json"], work);
    assert.equal(validate.status, 0, validate.stderr || validate.stdout);
    assert.equal(JSON.parse(validate.stdout).valid, true);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});
