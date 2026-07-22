import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const cli = resolve("packages/cli/dist/index.js");
const env = { ...process.env, OPENAI_API_KEY: "", REKON_SEMANTIC: "off" };

test("CLI discovers, judges, and permission-gates adoption of repository contracts", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-contract-discover-"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "contract-discovery-fixture",
    private: true,
    type: "module",
    scripts: { start: "node src/server.ts" },
    dependencies: { express: "latest", redis: "latest" },
  }));
  await writeFile(join(root, "src", "server.ts"), [
    'import express from "express";',
    'import redis from "redis";',
    "const app = express();",
    'app.get("/users", listUsers);',
    'export async function listUsers() { return redis.get("users"); }',
  ].join("\n"));

  execFileSync(process.execPath, [cli, "init", "--root", root, "--json"], { env });
  const configPath = join(root, ".rekon", "config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.contracts = { adoption: { allowSourceWrites: true, minimumConfidence: 0.8 } };
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  execFileSync(process.execPath, [cli, "observe", "--root", root, "--json"], { env });
  execFileSync(process.execPath, [cli, "project", "--root", root, "--json"], { env });
  const output = JSON.parse(execFileSync(process.execPath, [
    cli,
    "contracts",
    "discover",
    "--root",
    root,
    "--json",
  ], { encoding: "utf8", env }));

  assert.equal(output.command, "contracts discover");
  assert.equal(output.artifact.type, "ContractCandidateReport");
  assert.equal(output.authority, "inferred");
  assert.equal(output.adopted, false);
  assert.ok(output.summary.total >= 1);
  assert.ok(output.summary.systems >= 1);
  assert.ok(output.summary.flows >= 1);

  const report = JSON.parse(await readFile(resolve(root, output.artifact.path), "utf8"));
  assert.equal(report.header.artifactType, "ContractCandidateReport");
  assert.ok(report.header.inputRefs.some((ref) => ref.type === "ObservedRepo"));
  assert.ok(report.candidates.every((candidate) => candidate.kind === "system" || candidate.kind === "flow"));
  const flow = report.candidates.find((candidate) => candidate.kind === "flow");
  assert.ok(flow.proposed.handoffs.length >= 1);
  assert.ok(flow.proposed.handoffs.every((handoff) =>
    Array.isArray(handoff.verification?.acceptedMethods)
      && handoff.verification.acceptedMethods.length > 0));

  await assert.rejects(access(join(root, "rekon.contract.json")));
  await assert.rejects(access(join(root, "rekon", "contracts")));

  const system = report.candidates.find((candidate) => candidate.kind === "system");
  await writeFile(join(root, "contract-judgment.json"), JSON.stringify({
    judgments: [{
      candidateId: system.id,
      decision: "accept",
      confidence: 0.92,
      rationale: "The server module owns the HTTP route and its state-backed response.",
      citations: [{ path: "src/server.ts", lineStart: 1, lineEnd: 5 }],
      proposed: {
        ...system.proposed,
        purpose: "Serve the users route through the repository's state adapter.",
        userOutcomes: ["A users request returns the current stored users value."],
        invariants: [{
          id: "users-route-state-backed",
          statement: "The users route reads through the configured state adapter before responding.",
        }],
        requiredChecks: ["npm test"],
      },
    }],
  }));
  const judged = JSON.parse(execFileSync(process.execPath, [
    cli,
    "contracts",
    "judge",
    "--root",
    root,
    "--input",
    "contract-judgment.json",
    "--json",
  ], { encoding: "utf8", env }));
  assert.equal(judged.summary.accepted, 1);

  const dryRun = JSON.parse(execFileSync(process.execPath, [
    cli,
    "contracts",
    "adopt",
    "--root",
    root,
    "--json",
  ], { encoding: "utf8", env }));
  assert.equal(dryRun.summary.planned, 1);
  const planned = dryRun.operations.find((operation) => operation.status === "planned");
  await assert.rejects(access(join(root, planned.sourcePath)));

  const adopted = JSON.parse(execFileSync(process.execPath, [
    cli,
    "contracts",
    "adopt",
    "--root",
    root,
    "--apply",
    "--json",
  ], { encoding: "utf8", env }));

  assert.equal(adopted.summary.adopted, 1);
  assert.equal(adopted.summary.blocked, 0);
  assert.equal(adopted.compiled.valid, true);
  assert.ok(adopted.compiled.summary.byAuthority.adopted >= 1);
  const applied = adopted.operations.find((operation) => operation.status === "adopted");
  const committed = JSON.parse(await readFile(join(root, applied.sourcePath), "utf8"));
  assert.equal(committed.systems[0].purpose, "Serve the users route through the repository's state adapter.");

  const current = JSON.parse(execFileSync(process.execPath, [
    cli,
    "contracts",
    "reconcile",
    "--root",
    root,
    "--json",
  ], { encoding: "utf8", env }));
  assert.equal(current.drift.summary.drifted, 0);

  await writeFile(join(root, "src", "worker.ts"), "export const worker = true;\n");
  execFileSync(process.execPath, [cli, "observe", "--root", root, "--json"], { env });
  execFileSync(process.execPath, [cli, "project", "--root", root, "--json"], { env });
  const drifted = JSON.parse(execFileSync(process.execPath, [
    cli,
    "contracts",
    "reconcile",
    "--root",
    root,
    "--json",
  ], { encoding: "utf8", env }));
  assert.equal(drifted.status, "drifted");
  assert.ok(drifted.drift.entries.some((entry) => entry.reasons.some((reason) => reason.code === "contract.system_scope_uncovered")));
  const driftCandidates = JSON.parse(await readFile(join(root, drifted.candidates.artifact.path), "utf8"));
  const updatedSystem = driftCandidates.candidates.find((candidate) => candidate.kind === "system" && candidate.targetId === system.targetId);
  assert.ok(updatedSystem);

  await writeFile(join(root, "contract-judgment-update.json"), JSON.stringify({
    judgments: [{
      candidateId: updatedSystem.id,
      decision: "accept",
      confidence: 0.94,
      rationale: "The worker is now part of the same source-owned server subsystem.",
      citations: [{ path: "src/worker.ts", lineStart: 1, lineEnd: 1 }],
      proposed: {
        ...updatedSystem.proposed,
        purpose: "Serve the users route and its supporting worker through the repository's state adapter.",
        userOutcomes: ["A users request returns the current stored users value."],
        invariants: [{ id: "users-route-state-backed", statement: "The users route and worker preserve the state-backed response boundary." }],
        requiredChecks: ["npm test"],
      },
    }],
  }));
  execFileSync(process.execPath, [
    cli,
    "contracts",
    "judge",
    "--root",
    root,
    "--candidate-report",
    drifted.candidates.artifact.id,
    "--input",
    "contract-judgment-update.json",
    "--json",
  ], { encoding: "utf8", env });
  const updated = JSON.parse(execFileSync(process.execPath, [
    cli,
    "contracts",
    "adopt",
    "--root",
    root,
    "--apply",
    "--json",
  ], { encoding: "utf8", env }));
  assert.equal(updated.summary.adopted, 1);
  const recommitted = JSON.parse(await readFile(join(root, applied.sourcePath), "utf8"));
  assert.match(recommitted.systems[0].purpose, /supporting worker/);
});
