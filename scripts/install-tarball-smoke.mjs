#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const packagesDir = join(repoRoot, "packages");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const startedAt = new Date().toISOString();

  console.error("Install-from-tarball smoke starting.");

  const packageDirs = (await readdir(packagesDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (packageDirs.length === 0) {
    throw new Error("No workspace packages found");
  }

  const tarballsDir = await mkdtemp(join(tmpdir(), "rekon-tarballs-"));
  const projectDir = await mkdtemp(join(tmpdir(), "rekon-tarball-consumer-"));
  const tarballRecords = [];
  const dependencies = {};
  let installedCli = false;
  let exitCode = 0;

  try {
    console.error(`Packing ${packageDirs.length} package(s) into ${tarballsDir}.`);

    for (const dir of packageDirs) {
      const packageDir = join(packagesDir, dir);
      const packageJson = JSON.parse(
        await readFile(join(packageDir, "package.json"), "utf8"),
      );

      const packResult = spawnSync("npm", ["pack", "--pack-destination", tarballsDir, "--json"], {
        cwd: packageDir,
        encoding: "utf8",
      });

      if (packResult.status !== 0) {
        throw new Error(
          `npm pack failed for ${packageJson.name}:\n${packResult.stderr || packResult.stdout}`,
        );
      }

      let parsed;

      try {
        parsed = JSON.parse(packResult.stdout);
      } catch (error) {
        throw new Error(
          `npm pack output was not valid JSON for ${packageJson.name}: ${error.message}\n${packResult.stdout}`,
        );
      }

      const entry = Array.isArray(parsed) ? parsed[0] : parsed;
      const filename = entry?.filename;

      if (!filename) {
        throw new Error(`npm pack returned no filename for ${packageJson.name}`);
      }

      const tarballPath = join(tarballsDir, filename);

      if (!existsSync(tarballPath)) {
        throw new Error(`Tarball missing after npm pack for ${packageJson.name}: ${tarballPath}`);
      }

      tarballRecords.push({
        name: packageJson.name,
        version: packageJson.version,
        filename,
        path: tarballPath,
        directory: dir,
      });

      dependencies[packageJson.name] = `file:${relative(projectDir, tarballPath)}`;
    }

    const consumerPackageJson = {
      name: "rekon-tarball-consumer",
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies,
    };

    await writeFile(
      join(projectDir, "package.json"),
      `${JSON.stringify(consumerPackageJson, null, 2)}\n`,
      "utf8",
    );

    console.error(`Installing tarballs into ${projectDir}.`);

    const installResult = spawnSync(
      "npm",
      ["install", "--no-audit", "--no-fund", "--no-package-lock", "--ignore-scripts"],
      {
        cwd: projectDir,
        encoding: "utf8",
      },
    );

    if (installResult.status !== 0) {
      throw new Error(
        `npm install of tarballs failed:\n${installResult.stderr || installResult.stdout}`,
      );
    }

    const installedCliPath = join(
      projectDir,
      "node_modules/@rekon/cli/dist/index.js",
    );
    const installedBinPath = join(projectDir, "node_modules/.bin/rekon");

    if (!existsSync(installedCliPath) || !existsSync(installedBinPath)) {
      throw new Error(
        `Installed CLI or bin link missing after tarball install: ${installedCliPath}, ${installedBinPath}`,
      );
    }

    installedCli = true;

    const importSmokePath = join(projectDir, "import-smoke.mjs");
    const importPackages = tarballRecords
      .map((record) => record.name)
      .filter((name) => name !== "@rekon/cli");
    await writeFile(
      importSmokePath,
      `await Promise.all(${JSON.stringify(importPackages)}.map(async (name) => {\n`
        + "  const exports = await import(name);\n"
        + "  if (Object.keys(exports).length === 0) throw new Error(`${name} has no public exports`);\n"
        + "}));\n",
      "utf8",
    );
    const importResult = spawnSync(process.execPath, [importSmokePath], {
      cwd: projectDir,
      encoding: "utf8",
    });
    if (importResult.status !== 0) {
      throw new Error(
        `Installed package import smoke failed:\n${importResult.stderr || importResult.stdout}`,
      );
    }

    const fixtureRoot = join(projectDir, "fixture");

    await cp(exampleRoot, fixtureRoot, {
      recursive: true,
      filter(source) {
        return !relative(exampleRoot, source).split(/[\\/]/).includes(".rekon");
      },
    });

    const steps = [];

    runStep(installedBinPath, steps, "help", ["--help"]);
    runStep(installedBinPath, steps, "init", ["init", "--root", fixtureRoot, "--json"]);
    runStep(installedBinPath, steps, "observe", [
      "observe",
      "--root",
      fixtureRoot,
      "--json",
    ]);
    runStep(installedBinPath, steps, "project", [
      "project",
      "--root",
      fixtureRoot,
      "--json",
    ]);
    runStep(installedBinPath, steps, "snapshot", [
      "snapshot",
      "--root",
      fixtureRoot,
      "--json",
    ]);
    runStep(installedBinPath, steps, "evaluate", [
      "evaluate",
      "--root",
      fixtureRoot,
      "--json",
    ]);
    runStep(installedBinPath, steps, "resolve-preflight", [
      "resolve",
      "preflight",
      "--root",
      fixtureRoot,
      "--path",
      "src/index.ts",
      "--goal",
      "modify bootstrap",
      "--json",
    ]);
    runStep(installedBinPath, steps, "publish-agents", [
      "publish",
      "agents",
      "--root",
      fixtureRoot,
      "--json",
    ]);
    const validateResult = runStep(
      installedBinPath,
      steps,
      "artifacts-validate",
      ["artifacts", "validate", "--root", fixtureRoot, "--json"],
    );

    let validation;

    try {
      validation = JSON.parse(validateResult.stdout);
    } catch (error) {
      throw new Error(
        `artifacts validate output was not valid JSON: ${error.message}\nstdout: ${validateResult.stdout}\nstderr: ${validateResult.stderr}`,
      );
    }

    if (!validation.valid) {
      throw new Error(
        `Artifact validation reported issues after tarball install: ${JSON.stringify(
          validation.issues,
          null,
          2,
        )}`,
      );
    }

    const index = JSON.parse(
      await readFile(
        join(fixtureRoot, ".rekon/registry/artifacts.index.json"),
        "utf8",
      ),
    );

    if (!Array.isArray(index) || index.length === 0) {
      throw new Error("Artifact index empty after tarball install smoke");
    }

    const summary = {
      generatedAt: startedAt,
      mode: "install-from-tarball-smoke",
      tarballsDir,
      projectDir,
      fixtureRoot,
      installedCli,
      installedBin: installedBinPath,
      packagesImported: importPackages,
      packagesPacked: tarballRecords.map((record) => ({
        name: record.name,
        version: record.version,
        filename: record.filename,
      })),
      stepsRun: steps.map((step) => step.id),
      artifactCount: index.length,
      artifactTypes: countByType(index),
      validation,
    };

    console.log(JSON.stringify(summary, null, 2));
    console.error(
      `\nInstall-from-tarball smoke passed: ${tarballRecords.length} tarball(s) installed, ${index.length} artifact(s) emitted.`,
    );
  } catch (error) {
    exitCode = 1;
    console.error(error);
  } finally {
    await rm(tarballsDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  }

  process.exit(exitCode);
}

function runStep(cliPath, steps, id, args) {
  const result = spawnSync(cliPath, args, {
    encoding: "utf8",
  });

  steps.push({ id, args, exitStatus: result.status });

  if (result.status !== 0) {
    throw new Error(
      `Installed CLI step ${id} failed with status ${result.status}:\n${result.stderr || result.stdout}`,
    );
  }

  return result;
}

function countByType(index) {
  return index.reduce((counts, entry) => {
    counts[entry.type] = (counts[entry.type] ?? 0) + 1;
    return counts;
  }, {});
}
