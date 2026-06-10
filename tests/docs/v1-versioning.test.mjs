// Package-state test for V1 Versioning Implementation.
//
// Verifies the lockstep 1.0.0 bump across the workspace (root + all public packages,
// including internal @rekon/* dependency pins) and the supporting docs.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const read = (rel) => readFileSync(resolve(repoRoot, rel), "utf8");
const norm = (text) => text.replace(/[`*]/g, "").replace(/\s+/g, " ");

const rootPkg = JSON.parse(read("package.json"));
const packageDirs = readdirSync(join(repoRoot, "packages"))
  .filter((name) => existsSync(join(repoRoot, "packages", name, "package.json")))
  .sort();
const packages = packageDirs.map((dir) =>
  JSON.parse(read(join("packages", dir, "package.json"))),
);

const memo = norm(read("docs/strategy/v1-versioning-implementation.md"));
const changelog = norm(read("CHANGELOG.md"));
const packet = read(".rekon-dev/review-packets/v1-versioning.md");

const TARGET = "1.0.0";

// ---------- 1 ----------
test("root package version is 1.0.0 (root alignment selected)", () => {
  assert.equal(rootPkg.version, TARGET);
  assert.equal(rootPkg.private, true, "root stays private");
});

// ---------- 2 ----------
test("all public packages are version 1.0.0", () => {
  for (const pkg of packages) {
    assert.equal(pkg.version, TARGET, `${pkg.name} version must be ${TARGET}`);
  }
});

// ---------- 3 ----------
test("package count is 23", () => {
  // 22 at v1.0.0 tagging; +1 when WO-6 added @rekon/mcp.
  assert.equal(packages.length, 23);
});

// ---------- 4 ----------
test("zero packages are private/internal", () => {
  const privateCount = packages.filter((pkg) => pkg.private === true).length;
  assert.equal(privateCount, 0, "expected zero private packages");
});

// ---------- 5 ----------
test("no package (or internal @rekon dep pin) remains at 0.1.0-beta.0", () => {
  assert.ok(!read("package.json").includes("0.1.0-beta.0"), "root package.json still references 0.1.0-beta.0");
  for (const dir of packageDirs) {
    const raw = read(join("packages", dir, "package.json"));
    assert.ok(!raw.includes("0.1.0-beta.0"), `${dir}/package.json still references 0.1.0-beta.0`);
  }
});

// ---------- 6 ----------
test("docs say no npm publish occurs in this slice", () => {
  assert.ok(memo.includes("No npm publish occurs in this slice."));
});

// ---------- 7 ----------
test("docs say no git tag occurs in this slice", () => {
  assert.ok(memo.includes("No git tag occurs in this slice."));
});

// ---------- 8 ----------
test("docs say intent:go remains deferred", () => {
  assert.ok(memo.includes("intent:go remains deferred"));
});

// ---------- 9 ----------
test("CHANGELOG mentions V1 Versioning", () => {
  assert.match(changelog, /V1 Versioning/);
});

// ---------- 10 ----------
test("review packet exists and contains PURPOSE PRESERVATION CHECK", () => {
  assert.match(packet, /PURPOSE PRESERVATION CHECK/);
});
