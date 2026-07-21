import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

const REQUIRED_SECTIONS = [
  "# Rekon Agent Operating Contract",
  "## How To Use This Contract",
  "## Rekon Context Interfaces",
  "## Canonical Truth",
  "## Operating Rules",
  "## Resolver Workflow",
  "## Ownership And Capabilities",
  "## Active Governance State",
  "## Proof And Verification State",
  "## Memory Guidance",
  "## Required Checks",
  "## Do Not Do",
  "## Next Recommended Actions",
  "## Input Artifacts",
];

test("publish list includes @rekon/capability-docs.agent-contract", async () => {
  await withFixture(async (root) => {
    runCli(["init", "--root", root, "--json"]);
    const result = JSON.parse(
      runCli(["publish", "list", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.publishers));
    assert.ok(
      result.publishers.some((publisher) => publisher.id === "@rekon/capability-docs.agent-contract"),
      "agent-contract publisher must appear in publish list",
    );
  });
});

test("rekon publish agent-contract writes a Publication with kind agent-contract", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli(["publish", "agent-contract", "--root", root, "--json"]).stdout,
    );

    assert.ok(Array.isArray(result.artifacts));
    const publicationRef = result.artifacts.find((ref) => ref.type === "Publication");
    assert.ok(publicationRef, "publish agent-contract must emit a Publication");

    const publication = JSON.parse(
      await readFile(join(root, publicationRef.path), "utf8"),
    );

    assert.equal(publication.kind, "agent-contract");
    assert.equal(publication.format, "markdown");
    assert.equal(publication.title, "Rekon Agent Operating Contract");
    assert.equal(publication.path, ".rekon/artifacts/publications/agent-contract.md");
    assert.ok(typeof publication.content === "string");
  });
});

test("generic publish run @rekon/capability-docs.agent-contract dispatches the same publisher", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);

    const result = JSON.parse(
      runCli([
        "publish",
        "run",
        "@rekon/capability-docs.agent-contract",
        "--root",
        root,
        "--json",
      ]).stdout,
    );

    assert.ok(result.artifacts.some((ref) => ref.type === "Publication"));
  });
});

test("agent contract renders every required section", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const publication = await readAgentContract(root);

    for (const heading of REQUIRED_SECTIONS) {
      assert.ok(
        publication.content.includes(heading),
        `agent contract must include heading: ${heading}`,
      );
    }
  });
});

test("agent contract carries the canonical-truth warning", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const publication = await readAgentContract(root);

    assert.ok(
      publication.content.includes(
        "Committed repository-contract sources remain repository law; inspect both the cited artifacts and sources.",
      ),
      "publication must include the canonical-truth warning",
    );
    assert.ok(
      publication.content.includes("This publication is generated from input artifacts and may be stale."),
    );
  });
});

test("agent contract operating rules include resolver/seam/preflight order and anti-gaming text", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const publication = await readAgentContract(root);

    assert.ok(
      publication.content.includes("Resolve route/seam/preflight before editing code."),
      "operating rules must instruct resolving before editing",
    );
    assert.ok(
      publication.content.includes("Do not weaken tests, validators, rules, status ledgers, or verification scripts"),
      "operating rules must include anti-gaming text",
    );
  });
});

test("agent publications explain MCP usage and the CLI task-context fallback", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const contract = await readAgentContract(root);

    for (const expected of [
      "## Rekon Context Interfaces",
      "`context_for_task`",
      "`resolve_source_target`",
      "`rekon mcp serve --root .`",
      "`rekon context task",
      "`rekon resolve preflight",
      "local and read-only",
    ]) {
      assert.ok(contract.content.includes(expected), `agent contract missing ${expected}`);
    }

    const agentsResult = JSON.parse(
      runCli(["publish", "agents", "--root", root, "--json"]).stdout,
    );
    const agentsRef = agentsResult.artifacts.find((ref) => ref.type === "Publication");
    assert.ok(agentsRef);
    const agentsPublication = JSON.parse(await readFile(join(root, agentsRef.path), "utf8"));

    assert.ok(agentsPublication.content.includes("## Rekon Context Interfaces"));
    assert.ok(agentsPublication.content.includes("`context_for_task`"));
    assert.ok(agentsPublication.content.includes("`resolve_source_target`"));
    assert.ok(agentsPublication.content.includes("`rekon context task"));
    assert.ok(agentsPublication.content.includes("`rekon resolve preflight"));
  });
});

test("agent contract Memory Guidance shows score and reasons when ranked memory exists", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Provider retry belongs in provider layer.",
      "--path",
      "src",
      "--system",
      "src",
      "--capability",
      "bootstrap",
      "--priority",
      "high",
      "--verified",
      "--reliability",
      "0.9",
      "--rationale",
      "Test guidance.",
      "--json",
    ]);
    runCli([
      "memory",
      "select",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--system",
      "src",
      "--capability",
      "bootstrap",
      "--json",
    ]);

    const publication = await readAgentContract(root);
    const memoryStart = publication.content.indexOf("## Memory Guidance");
    const memoryEnd = publication.content.indexOf("## Required Checks");
    const memorySection = publication.content.slice(memoryStart, memoryEnd);

    assert.ok(memorySection.includes("| Score | Instruction | Scope | Reasons |"));
    assert.ok(memorySection.includes("Provider retry belongs in provider layer."));
    assert.ok(memorySection.includes("path-prefix-match: src"));
    assert.ok(memorySection.includes("verified"));
    assert.ok(memorySection.includes("high-priority"));
    assert.ok(/\| 1\.00 \|/.test(memorySection));
  });
});

test("agent contract recommends running memory select when no MemorySelection exists", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);

    const publication = await readAgentContract(root);
    const memoryStart = publication.content.indexOf("## Memory Guidance");
    const memoryEnd = publication.content.indexOf("## Required Checks");
    const memorySection = publication.content.slice(memoryStart, memoryEnd);

    assert.ok(memorySection.includes("No MemorySelection found"));
    assert.ok(memorySection.includes("rekon memory select"));
  });
});

test("agent contract surfaces partial verification status visibly", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({
        recordedBy: "operator",
        commands: [
          { command: "npm run typecheck", status: "passed", exitCode: 0 },
        ],
      }),
      "--json",
    ]);

    const publication = await readAgentContract(root);
    const proofStart = publication.content.indexOf("## Proof And Verification State");
    const proofEnd = publication.content.indexOf("## Memory Guidance");
    const proofSection = publication.content.slice(proofStart, proofEnd);

    assert.ok(proofSection.includes("VerificationPlan: present"));
    assert.ok(proofSection.includes("status partial") || proofSection.includes("status: partial"));
    assert.ok(proofSection.includes("> Verification is not complete."));
  });
});

test("agent contract surfaces failed verification status visibly", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({
        recordedBy: "operator",
        commands: [
          { command: "npm run typecheck", status: "passed", exitCode: 0 },
          { command: "npm run test", status: "failed", exitCode: 1, notes: "regression" },
          { command: "npm run build", status: "passed", exitCode: 0 },
        ],
      }),
      "--json",
    ]);

    const publication = await readAgentContract(root);

    assert.ok(publication.content.includes("status failed"));
    assert.ok(publication.content.includes("> Verification is not complete."));
  });
});

test("agent contract Required Checks come from latest VerificationPlan when present", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);

    const publication = await readAgentContract(root);
    const checksStart = publication.content.indexOf("## Required Checks");
    const checksEnd = publication.content.indexOf("## Do Not Do");
    const checksSection = publication.content.slice(checksStart, checksEnd);

    assert.ok(checksSection.includes("`npm run typecheck`"));
    assert.ok(checksSection.includes("`npm run test`"));
    assert.ok(checksSection.includes("`npm run build`"));
  });
});

test("agent contract header.inputRefs include MemorySelection and VerificationResult when present", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Test guidance.",
      "--path",
      "src",
      "--system",
      "src",
      "--verified",
      "--json",
    ]);
    runCli([
      "memory",
      "select",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--system",
      "src",
      "--json",
    ]);
    runCli([
      "intent",
      "work-order",
      "--root",
      root,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runCli([
      "verify",
      "record",
      "--root",
      root,
      "--result-json",
      JSON.stringify({
        recordedBy: "operator",
        commands: [{ command: "npm run typecheck", status: "passed", exitCode: 0 }],
      }),
      "--json",
    ]);

    const publication = await readAgentContract(root);
    const inputTypes = publication.header.inputRefs.map((ref) => ref.type);

    assert.ok(inputTypes.includes("MemorySelection"), "should cite MemorySelection");
    assert.ok(inputTypes.includes("VerificationResult"), "should cite VerificationResult");
    assert.ok(inputTypes.includes("WorkOrder"), "should cite WorkOrder");
    assert.ok(inputTypes.includes("VerificationPlan"), "should cite VerificationPlan");
  });
});

test("agent contract writes to .rekon/artifacts/publications/agent-contract.md", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const publication = await readAgentContract(root);

    assert.equal(publication.path, ".rekon/artifacts/publications/agent-contract.md");
  });
});

test("publish agent-contract does not overwrite a root AGENTS.md", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    const before = await readFile(join(root, "AGENTS.md"), "utf8");
    runCli(["publish", "agent-contract", "--root", root, "--json"]);
    const after = await readFile(join(root, "AGENTS.md"), "utf8");

    assert.equal(after, before, "publish agent-contract must not modify root AGENTS.md");
  });
});

test("publish agents, architecture, and proof still work alongside agent-contract", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);

    const agentsResult = JSON.parse(
      runCli(["publish", "agents", "--root", root, "--json"]).stdout,
    );
    assert.ok(agentsResult.artifacts.some((ref) => ref.type === "Publication"));

    const archResult = JSON.parse(
      runCli(["publish", "architecture", "--root", root, "--json"]).stdout,
    );
    assert.ok(archResult.artifacts.some((ref) => ref.type === "Publication"));

    const proofResult = JSON.parse(
      runCli(["publish", "proof", "--root", root, "--json"]).stdout,
    );
    assert.ok(proofResult.artifacts.some((ref) => ref.type === "Publication"));

    const contractResult = JSON.parse(
      runCli(["publish", "agent-contract", "--root", root, "--json"]).stdout,
    );
    assert.ok(contractResult.artifacts.some((ref) => ref.type === "Publication"));
  });
});

test("artifacts freshness marks older agent-contract stale after a newer MemorySelection", async () => {
  await withFixture(async (root) => {
    runCli(["refresh", "--root", root, "--json"]);
    runCli([
      "memory",
      "add",
      "--root",
      root,
      "--instruction",
      "Initial guidance.",
      "--path",
      "src",
      "--verified",
      "--json",
    ]);
    runCli(["memory", "select", "--root", root, "--path", "src/index.ts", "--json"]);
    const firstPublish = JSON.parse(
      runCli(["publish", "agent-contract", "--root", root, "--json"]).stdout,
    );
    const publicationId = firstPublish.artifacts.find((ref) => ref.type === "Publication").id;

    await new Promise((resolveTimer) => setTimeout(resolveTimer, 5));
    runCli(["memory", "select", "--root", root, "--path", "src/index.ts", "--json"]);

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
        (issue) => issue.code === "newer-input-exists" && issue.inputType === "MemorySelection",
      ),
      "expected stale issue citing newer MemorySelection",
    );
  });
});

// ---------- helpers ----------

async function readAgentContract(root) {
  const result = JSON.parse(
    runCli(["publish", "agent-contract", "--root", root, "--json"]).stdout,
  );
  const publicationRef = result.artifacts.find((ref) => ref.type === "Publication");
  assert.ok(publicationRef);
  return JSON.parse(await readFile(join(root, publicationRef.path), "utf8"));
}

async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "rekon-agent-contract-"));

  try {
    await cp(exampleRoot, root, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
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
