import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const cli = resolve("packages/cli/dist/index.js");
const env = { ...process.env, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", REKON_SEMANTIC: "off" };

function run(args) {
  return JSON.parse(execFileSync(process.execPath, [cli, ...args], { encoding: "utf8", env }));
}

test("contracts bootstrap carries a clean repo from observation to adopted task context without a provider call", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-contract-bootstrap-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "package.json"), `${JSON.stringify({
    name: "contract-bootstrap-fixture",
    private: true,
    type: "module",
    scripts: { test: "node --test" },
  }, null, 2)}\n`);
  await writeFile(join(root, "src", "server.ts"), [
    "export type Request = { requestId: string };",
    "export function handleRequest(request: Request) {",
    "  return { requestId: request.requestId, status: 'ok' };",
    "}",
  ].join("\n"));
  await writeFile(join(root, "src", "server.test.ts"), [
    'import { handleRequest } from "./server.js";',
    "void handleRequest({ requestId: 'test' });",
  ].join("\n"));

  const bootstrap = run(["contracts", "bootstrap", "--root", root, "--json"]);
  assert.equal(bootstrap.status, "judgment-required");
  assert.ok(bootstrap.summary.systems >= 1);
  assert.equal(bootstrap.boundaries.calledModel, false);
  assert.equal(bootstrap.boundaries.evaluatedFindings, false);
  assert.equal(bootstrap.boundaries.wroteContractSource, false);
  assert.equal(bootstrap.artifacts.candidates.type, "ContractCandidateReport");
  assert.equal(bootstrap.artifacts.registry.type, "EffectiveContractRegistry");
  assert.match(bootstrap.judgment.prompt, /inspect the source/u);
  assert.match(await readFile(join(root, "AGENTS.md"), "utf8"), /After context compaction or restart/u);
  await assert.rejects(access(join(root, "rekon", "contracts")));

  const index = JSON.parse(await readFile(join(root, ".rekon", "registry", "artifacts.index.json"), "utf8"));
  assert.ok(!index.some((entry) => entry.artifactType === "FindingReport"));
  const candidateReport = JSON.parse(await readFile(join(root, bootstrap.artifacts.candidates.path), "utf8"));
  const candidate = candidateReport.candidates.find((entry) => entry.kind === "system");
  assert.ok(candidate);
  await writeFile(join(root, "judgment.json"), `${JSON.stringify({
    judgments: [{
      candidateId: candidate.id,
      decision: "accept",
      confidence: 0.95,
      rationale: "The source and test form one request-handling system.",
      citations: [{ path: "src/server.ts", lineStart: 1, lineEnd: 4 }],
      proposed: {
        ...candidate.proposed,
        purpose: "Handle requests while preserving their request identity.",
        userOutcomes: ["A handled request returns the same request id."],
        invariants: [{ id: "request-id-preserved", statement: "Preserve requestId from input through response." }],
        prohibitedChanges: [{ id: "no-request-id-replacement", statement: "Do not replace a caller-provided requestId." }],
        requiredContextPaths: ["src/server.test.ts"],
        requiredChecks: ["npm test"],
      },
    }],
  }, null, 2)}\n`);
  const judged = run([
    "contracts", "judge", "--root", root,
    "--candidate-report", bootstrap.artifacts.candidates.id,
    "--input", "judgment.json", "--json",
  ]);
  assert.equal(judged.summary.accepted, 1);

  const configPath = join(root, ".rekon", "config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.contracts = { adoption: { allowSourceWrites: true, minimumConfidence: 0.8 } };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  const adopted = run([
    "contracts", "adopt", "--root", root,
    "--judgment-report", judged.artifact.id,
    "--apply", "--json",
  ]);
  assert.equal(adopted.summary.adopted, 1);
  assert.equal(adopted.compiled.summary.byAuthority.adopted, 1);

  const context = run([
    "context", "task", "--root", root,
    "--task", "Change request handling without changing request identity.",
    "--path", "src/server.ts", "--provider", "mock", "--json",
  ]);
  assert.deepEqual(context.matchedSystemContracts, [candidate.targetId]);
  assert.equal(context.taskPact.artifact.type, "TaskPact");
  assert.ok(context.doNotTouch.some((entry) => entry.reason === "Preserve requestId from input through response."));
  assert.ok(context.contextItems.some((entry) => entry.path === "src/server.test.ts"));
  assert.ok(context.verificationHints.some((entry) => entry.command === "npm test"));

  const publicationResult = run(["publish", "architecture", "--root", root, "--json"]);
  const publicationRef = publicationResult.artifacts.find((ref) => ref.type === "Publication");
  const publication = JSON.parse(await readFile(join(root, publicationRef.path), "utf8"));
  assert.match(publication.content, /## Adopted Repository Law/u);
  assert.match(publication.content, /Preserve requestId from input through response/u);
});
