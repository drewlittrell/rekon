// WO-7 behavioral tests: the four statuses each produced on a fixture repo
// with constructed git history, the calibration case (the regression-plan
// incident shape flips to stale), front-matter tolerance, INDEX.md
// idempotency, and the CLI verb with --strict semantics.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliEntry = join(repoRoot, "packages/cli/dist/index.js");
const docs = await import(join(repoRoot, "packages/capability-docs/dist/doc-freshness.js"));

let fixture;
const git = (...args) => execFileSync("git", ["-C", fixture, ...args], { encoding: "utf8" }).trim();
const commit = (message) => {
  git("add", "-A");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--no-verify", "-m", message);
};
const write = (rel, content) => {
  mkdirSync(join(fixture, rel, ".."), { recursive: true });
  writeFileSync(join(fixture, rel), content);
};

before(() => {
  fixture = mkdtempSync(join(tmpdir(), "rekon-doc-freshness-"));
  git("init", "-q");

  // Commit 1: source + four docs covering every status.
  write("providers/semantic/extractor.ts", "export const v = 1;\n");
  write(
    "docs/regression-plan.md",
    "---\nfreshness:\n  paths:\n    - providers/semantic/**\n---\n# Regression plan\n\nCalibration case: declares the semantic provider package paths.\n",
  );
  write(
    "docs/fresh-doc.md",
    "---\nfreshness:\n  paths:\n    - docs/fresh-doc.md\n---\n# Fresh doc\n",
  );
  write(
    "docs/partial-doc.md",
    "---\nfreshness:\n  paths:\n    - never/exists/**\n---\n# Partial doc\n",
  );
  write("docs/unenrolled.md", "# Unenrolled living doc\n");
  write("docs/strategy/old-memo.md", "# Old memo\n\n> **SNAPSHOT.** Point-in-time record.\n");
  commit("initial: docs and semantic provider");

  // Commit 2: the regression-plan incident - the provider moves on.
  write("providers/semantic/extractor.ts", "export const v = 2; // behavior change\n");
  commit("change semantic provider after the plan was written");
});

after(() => rmSync(fixture, { recursive: true, force: true }));

test("calibration case: the regression-plan shape flips to stale", () => {
  const report = docs.buildDocsFreshnessReport(fixture);
  const plan = report.entries.find((entry) => entry.doc === "docs/regression-plan.md");

  assert.equal(plan.status, "stale");
  assert.equal(plan.enrolled, true);

  const referent = plan.referents.find((item) => item.declaration === "providers/semantic/**");
  assert.equal(referent.newerThanDoc, true);
});

test("all four statuses are produced from the fixture history", () => {
  const report = docs.buildDocsFreshnessReport(fixture);
  const status = (doc) => report.entries.find((entry) => entry.doc === doc).status;

  assert.equal(status("docs/fresh-doc.md"), "fresh");
  assert.equal(status("docs/regression-plan.md"), "stale");
  assert.equal(status("docs/partial-doc.md"), "partial");
  assert.equal(status("docs/unenrolled.md"), "unknown");
});

test("snapshots are exempt by classification, never evaluated", () => {
  const report = docs.buildDocsFreshnessReport(fixture);
  const memo = report.entries.find((entry) => entry.doc === "docs/strategy/old-memo.md");

  assert.equal(memo.classification, "snapshot");
  assert.equal(memo.note, "snapshot: exempt by definition");
  assert.equal(report.summary.snapshots, 1);
});

test("re-committing a stale doc makes it fresh (verification is a commit)", () => {
  write(
    "docs/regression-plan.md",
    "---\nfreshness:\n  paths:\n    - providers/semantic/**\n---\n# Regression plan\n\nReviewed against the provider change.\n",
  );
  commit("re-verify regression plan");

  const report = docs.buildDocsFreshnessReport(fixture);
  assert.equal(report.entries.find((entry) => entry.doc === "docs/regression-plan.md").status, "fresh");

  // Restore staleness for the CLI tests below.
  write("providers/semantic/extractor.ts", "export const v = 3;\n");
  commit("another provider change");
});

test("the front-matter parser is tolerant: malformed input means unknown, never an error", () => {
  assert.equal(docs.parseDocFreshnessFrontMatter("# No front matter\n"), null);
  assert.equal(docs.parseDocFreshnessFrontMatter("---\nbroken yaml: [unclosed\n---\n# Doc\n"), null);
  assert.equal(docs.parseDocFreshnessFrontMatter("---\nfreshness:\n  paths: []\n---\n"), null);

  const parsed = docs.parseDocFreshnessFrontMatter(
    "---\nfreshness:\n  inputs: [CapabilityMap]\n  paths:\n    - src/**\n---\n# Doc\n",
  );
  assert.deepEqual(parsed, { inputs: ["CapabilityMap"], paths: ["src/**"] });
});

test("bare input names resolve only through the explicit table", () => {
  const reader = {
    lastCommit: () => "abc",
    changedSince: () => false,
    everTouched: () => true,
  };
  const result = docs.evaluateDocFreshness(
    "docs/x.md",
    { inputs: ["CapabilityMap", "NotARealType"], paths: [] },
    reader,
  );

  assert.equal(result.status, "partial");
  assert.equal(result.referents.find((r) => r.declaration === "CapabilityMap").resolved, true);
  assert.equal(result.referents.find((r) => r.declaration === "NotARealType").pathspec, null);
});

test("INDEX.md generation is deterministic and idempotent", () => {
  const first = docs.renderDocsIndex(docs.buildDocsFreshnessReport(fixture));
  const second = docs.renderDocsIndex(docs.buildDocsFreshnessReport(fixture));

  assert.equal(first, second);
  assert.match(first, /GENERATED by `rekon docs freshness`/);
  assert.match(first, /\| docs\/regression-plan\.md \| stale \|/);
  assert.match(first, /## Snapshots \(exempt by definition\)/);
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(first), "no timestamps - idempotency depends on it");
});

test("CLI: reports, writes INDEX.md, exits zero by default", () => {
  const run = spawnSync(process.execPath, [cliEntry, "docs", "freshness", "--root", fixture, "--json"], {
    encoding: "utf8",
  });

  assert.equal(run.status, 0, run.stderr);
  const payload = JSON.parse(run.stdout);
  assert.equal(payload.indexAction, "created");
  assert.ok(payload.summary.stale >= 1);

  const index = readFileSync(join(fixture, "docs/INDEX.md"), "utf8");
  assert.match(index, /docs\/regression-plan\.md \| stale/);

  // Second run: byte-identical INDEX, reported unchanged.
  const again = spawnSync(process.execPath, [cliEntry, "docs", "freshness", "--root", fixture, "--json"], {
    encoding: "utf8",
  });
  assert.equal(JSON.parse(again.stdout).indexAction, "unchanged");
});

test("CLI --strict exits non-zero on stale/partial enrolled docs, zero otherwise", () => {
  const strict = spawnSync(
    process.execPath,
    [cliEntry, "docs", "freshness", "--root", fixture, "--strict", "--json"],
    { encoding: "utf8" },
  );
  assert.equal(strict.status, 1);

  // A fixture with only fresh + unknown docs passes strict.
  const clean = mkdtempSync(join(tmpdir(), "rekon-doc-fresh-clean-"));
  try {
    execFileSync("git", ["-C", clean, "init", "-q"]);
    mkdirSync(join(clean, "docs"), { recursive: true });
    writeFileSync(join(clean, "docs/unenrolled.md"), "# Living, unenrolled\n");
    execFileSync("git", ["-C", clean, "add", "-A"]);
    execFileSync("git", ["-C", clean, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--no-verify", "-m", "init"]);

    const pass = spawnSync(
      process.execPath,
      [cliEntry, "docs", "freshness", "--root", clean, "--strict", "--json"],
      { encoding: "utf8" },
    );
    assert.equal(pass.status, 0, pass.stderr);
    assert.equal(JSON.parse(pass.stdout).summary.unknown, 1);
  } finally {
    rmSync(clean, { recursive: true, force: true });
  }
});

test("the repo's own living-doc enrollment parses", () => {
  for (const doc of [
    "docs/strategy/rekon-system-model.md",
    "docs/concepts/capability-ontology.md",
  ]) {
    const declarations = docs.parseDocFreshnessFrontMatter(readFileSync(join(repoRoot, doc), "utf8"));
    assert.ok(declarations, `${doc} must carry freshness declarations`);
    assert.ok(declarations.paths.length > 0);
  }
});
