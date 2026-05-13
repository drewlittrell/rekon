import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
