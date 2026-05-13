#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const steps = [];
  let exitCode = 0;

  if (!existsSync(cliPath)) {
    console.error(
      `CLI dist not found at ${cliPath}. Run 'npm run build' before the install smoke.`,
    );
    process.exit(1);
  }

  const workDir = await mkdtemp(join(tmpdir(), "rekon-install-smoke-"));

  try {
    await cp(exampleRoot, workDir, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });

    record(steps, "copy-example", { workDir });

    const cliVersion = runCli(["--help"]);
    record(steps, "cli-help", { exitStatus: cliVersion.status });

    runStep(steps, "init", ["init", "--root", workDir, "--json"]);
    runStep(steps, "capabilities-list", [
      "capabilities",
      "list",
      "--root",
      workDir,
      "--json",
    ]);
    runStep(steps, "observe", ["observe", "--root", workDir, "--json"]);
    runStep(steps, "project", ["project", "--root", workDir, "--json"]);
    runStep(steps, "snapshot", ["snapshot", "--root", workDir, "--json"]);
    runStep(steps, "evaluate", ["evaluate", "--root", workDir, "--json"]);
    runStep(steps, "resolve-preflight", [
      "resolve",
      "preflight",
      "--root",
      workDir,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runStep(steps, "publish-agents", [
      "publish",
      "agents",
      "--root",
      workDir,
      "--json",
    ]);
    runStep(steps, "memory-add", [
      "memory",
      "add",
      "--root",
      workDir,
      "--instruction",
      "Preserve bootstrap behavior.",
      "--path",
      "src",
      "--json",
    ]);
    runStep(steps, "memory-list", [
      "memory",
      "list",
      "--root",
      workDir,
      "--json",
    ]);
    runStep(steps, "memory-select", [
      "memory",
      "select",
      "--root",
      workDir,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runStep(steps, "intent-work-order", [
      "intent",
      "work-order",
      "--root",
      workDir,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runStep(steps, "reconcile", [
      "reconcile",
      "--root",
      workDir,
      "--operation",
      "docs_regeneration",
      "--json",
    ]);
    runStep(steps, "artifacts-list", [
      "artifacts",
      "list",
      "--root",
      workDir,
      "--json",
    ]);
    runStep(steps, "artifacts-validate", [
      "artifacts",
      "validate",
      "--root",
      workDir,
      "--json",
    ]);

    const validation = await readArtifactValidation(workDir);

    if (!validation.valid) {
      throw new Error(
        `Artifact validation reported issues: ${JSON.stringify(validation.issues, null, 2)}`,
      );
    }

    const index = JSON.parse(
      await readFile(join(workDir, ".rekon/registry/artifacts.index.json"), "utf8"),
    );

    if (!Array.isArray(index) || index.length === 0) {
      throw new Error("Artifact index is empty after install smoke flow");
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      mode: "install-from-build-smoke",
      workDir,
      cliPath,
      stepsRun: steps.map((step) => step.id),
      artifactCount: index.length,
      artifactTypes: countByType(index),
      validation,
      followUp: [
        "Install-from-tarball smoke is deferred to the next batch (0.1.0-alpha.1 release prep).",
      ],
    };

    console.log(JSON.stringify(summary, null, 2));
    console.error(
      `\nInstall smoke (install-from-build) passed against ${workDir}.`,
    );
  } catch (error) {
    exitCode = 1;
    console.error(error);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  process.exit(exitCode);
}

function runStep(steps, id, args) {
  const result = runCli(args);

  record(steps, id, {
    args,
    exitStatus: result.status,
  });

  if (result.status !== 0) {
    const stderr = result.stderr ?? "";
    const stdout = result.stdout ?? "";

    throw new Error(
      `CLI step ${id} failed with status ${result.status}:\n${stderr || stdout}`,
    );
  }

  return result;
}

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

async function readArtifactValidation(workDir) {
  const result = runCli([
    "artifacts",
    "validate",
    "--root",
    workDir,
    "--json",
  ]);

  if (result.status !== 0) {
    throw new Error(
      `artifacts validate failed:\n${result.stderr || result.stdout}`,
    );
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Could not parse artifacts validate output: ${error.message}\n${result.stdout}`,
    );
  }
}

function countByType(index) {
  return index.reduce((counts, entry) => {
    counts[entry.type] = (counts[entry.type] ?? 0) + 1;
    return counts;
  }, {});
}

function record(steps, id, details) {
  steps.push({ id, ...details });
}
