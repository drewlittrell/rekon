import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import capability, { jsTsProvider } from "../dist/index.js";

test("built-in capability uses defineCapability-compatible manifest", () => {
  assert.equal(capability.manifest.id, "@rekon/capability-js-ts");
  assert.deepEqual(capability.manifest.roles, ["evidence-provider"]);
  assert.deepEqual(capability.manifest.produces, ["EvidenceGraph"]);
});

test("JS/TS provider emits facts with provenance and ignores generated directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, ".rekon"), { recursive: true });
    await writeFile(join(root, "src", "index.ts"), [
      "import { helper } from './helper';",
      "export function greet(name: string) {",
      "  return helper(name);",
      "}",
      "export { helper };",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "helper.ts"), "export const helper = (value: string) => value;\n", "utf8");
    await writeFile(join(root, ".rekon", "ignored.ts"), "export const ignored = true;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
    });
    const kinds = new Set(facts.map((fact) => fact.kind));

    assert.equal(kinds.has("file"), true);
    assert.equal(kinds.has("import"), true);
    assert.equal(kinds.has("export"), true);
    assert.equal(kinds.has("symbol"), true);
    assert.equal(kinds.has("ownership_hint"), true);
    assert.equal(kinds.has("capability_hint"), true);
    assert.equal(facts.some((fact) => fact.subject.includes(".rekon")), false);
    assert.equal(facts.every((fact) => fact.provenance.pack === "@rekon/capability-js-ts"), true);
    assert.equal(facts.every((fact) => fact.provenance.extractorVersion === "0.1.0"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider supports changed-files incremental input", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "one.ts"), "export const one = 1;\n", "utf8");
    await writeFile(join(root, "src", "two.ts"), "export const two = 2;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
      incremental: true,
      changedFiles: ["src/two.ts"],
    });

    assert.equal(facts.some((fact) => fact.subject === "src/two.ts"), true);
    assert.equal(facts.some((fact) => fact.subject === "src/one.ts"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider skips runtime dirs and symlink cycles during source walk", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-walk-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "index.ts"), "export const value = 1;\n", "utf8");

    await mkdir(join(root, ".circe", "workspaces"), { recursive: true });
    await writeFile(join(root, ".circe", "workspaces", "ignored.ts"), "export const ignoredCirce = true;\n", "utf8");
    await symlink(root, join(root, ".circe", "workspaces", "link-to-root"), "dir");

    await mkdir(join(root, ".rekon", "intent", "plans", "fixture"), { recursive: true });
    await writeFile(join(root, ".rekon", "intent", "plans", "fixture", "ignored.ts"), "export const ignoredRekon = true;\n", "utf8");

    await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(root, "node_modules", "pkg", "ignored.ts"), "export const ignoredNodeModules = true;\n", "utf8");

    await symlink(join(root, "src"), join(root, "src-link"), "dir");
    await symlink(join(root, "missing-target"), join(root, "broken-link"), "file");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
    });
    const fileSubjects = facts
      .filter((fact) => fact.kind === "file")
      .map((fact) => fact.subject);

    assert.deepEqual(fileSubjects, ["src/index.ts"]);
    assert.equal(facts.some((fact) => fact.subject.includes(".circe")), false);
    assert.equal(facts.some((fact) => fact.subject.includes(".rekon")), false);
    assert.equal(facts.some((fact) => fact.subject.includes("node_modules")), false);
    assert.equal(facts.some((fact) => fact.subject.includes("src-link")), false);
    assert.equal(facts.some((fact) => fact.subject.includes("broken-link")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
