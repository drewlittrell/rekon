// WO-14 sub-order B: dead_code on unreferenced exports + declared-root
// reachability. The binding workspace-import obligation: exports consumed
// through workspace package names must not read as dead. Absent declared
// roots the rule runs in unreferenced-exports mode and says so.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const jsts = await import(join(repoRoot, "packages/capability-js-ts/dist/index.js"));
const policy = await import(join(repoRoot, "packages/capability-policy/dist/index.js"));

test("workspace-import obligation: exports consumed through package names never read as dead", async () => {
  const root = mkdtempSync(join(tmpdir(), "rekon-wave1b-"));

  try {
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fixture", workspaces: ["packages/*"] }));
    mkdirSync(join(root, "packages/lib/src"), { recursive: true });
    writeFileSync(join(root, "packages/lib/package.json"), JSON.stringify({ name: "@fixture/lib", main: "dist/index.js" }));
    // The entry file is a declared root (its exports are public API and
    // never flag); the orphan lives in a non-entry module.
    writeFileSync(join(root, "packages/lib/src/util.ts"), "export const used = 1;\nexport const orphan = 2;\n");
    writeFileSync(join(root, "packages/lib/src/index.ts"), 'export { used } from "./util";\n');
    mkdirSync(join(root, "packages/app/src"), { recursive: true });
    writeFileSync(join(root, "packages/app/package.json"), JSON.stringify({ name: "@fixture/app", main: "dist/index.js" }));
    writeFileSync(join(root, "packages/app/src/index.ts"), 'import { used } from "@fixture/lib";\nexport const run = () => used;\n');

    const facts = await jsts.jsTsProvider.extract({ repoRoot: root });
    const spec = facts.find((f) => f.kind === "import_specifier" && f.value.name === "used" && f.value.target === "@fixture/lib");

    // The workspace alias table resolves the package-name import.
    assert.equal(spec.value.resolvedTarget, "packages/lib/src/index.ts");

    const roots = await policy.loadDeclaredRoots(root);
    const findings = policy.evaluateDeadCode({ facts, roots });
    const deadInLib = findings.find((f) => f.files[0] === "packages/lib/src/util.ts");

    // "used" is consumed via the entry re-export -> never dead; "orphan" is.
    assert.ok(deadInLib, "lib has a dead-export finding on the non-entry module");
    assert.deepEqual(deadInLib.payload.unreferencedExports, ["orphan"]);
    assert.equal(deadInLib.payload.mode, "reachability");
    assert.match(deadInLib.payload.citation, /§C dead_code/);
    // Entry files (declared roots) never carry dead-export findings.
    assert.ok(!findings.some((f) => f.files[0].endsWith("/index.ts")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("absent roots: unreferenced-exports mode only, and the payload says so", () => {
  const facts = [
    { kind: "file", subject: "src/a.ts", value: {} },
    { kind: "file", subject: "src/b.ts", value: {} },
    { kind: "export", subject: "src/a.ts", value: { name: "lonely", kind: "const" } },
    { kind: "export", subject: "src/b.ts", value: { name: "taken", kind: "const" } },
    { kind: "import_specifier", subject: "src/a.ts:src/b.ts:taken", value: { source: "src/a.ts", target: "./b", name: "taken", local: "taken", specifierKind: "named", resolvedTarget: "src/b.ts" } },
  ];
  const findings = policy.evaluateDeadCode({ facts, roots: [] });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].files[0], "src/a.ts");
  assert.equal(findings[0].payload.mode, "unreferenced-exports");
  // No reachability claims without declared roots.
  assert.equal("reachableFromRoots" in findings[0].payload, false);
});

test("FP guards: framework entries, star/namespace consumers, and non-production files stay silent", () => {
  const facts = [
    { kind: "file", subject: "app/api/users/route.ts", value: {} },
    { kind: "file", subject: "src/star.ts", value: {} },
    { kind: "file", subject: "src/barrel.ts", value: {} },
    { kind: "file", subject: "tests/util.ts", value: {} },
    // Framework entry: exports are framework-consumed.
    { kind: "export", subject: "app/api/users/route.ts", value: { name: "GET", kind: "function" } },
    // Star re-export marks the whole target referenced.
    { kind: "export", subject: "src/star.ts", value: { name: "anything", kind: "const" } },
    { kind: "reexport", subject: "src/barrel.ts:src/star.ts:*", value: { source: "src/barrel.ts", target: "./star", name: "*", exportedAs: "*", reexportKind: "star", resolvedTarget: "src/star.ts" } },
    // Non-production export.
    { kind: "export", subject: "tests/util.ts", value: { name: "helper", kind: "const" } },
  ];
  const findings = policy.evaluateDeadCode({ facts, roots: [] });

  assert.deepEqual(findings, []);
  assert.equal(policy.isFrameworkEntryPath("app/api/users/route.ts"), true);
  assert.equal(policy.isFrameworkEntryPath("src/service.ts"), false);
});
