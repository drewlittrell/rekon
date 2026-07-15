// WO-14 sub-order A: debt-marker facts (TODO / FIXME / HACK / @deprecated /
// disabled tests), the debt.markers emitter's scope behavior (non-prod
// excluded EXCEPT disabled tests, which live in test trees by nature), and
// the coverage scorer (bench policy item 2).

import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const jsts = await import(join(repoRoot, "packages/capability-js-ts/dist/index.js"));
const policy = await import(join(repoRoot, "packages/capability-policy/dist/index.js"));
const core = await import(join(repoRoot, "tests/bench/parity-core.mjs"));

test("marker extraction: every marker family, id-stable, identical lines dedupe", () => {
  const content = [
    "// TODO: wire the cache",
    "/* FIXME handle nulls */",
    " * HACK around the race",
    "/** @deprecated use newApi instead */",
    "it.skip(\"flaky\", () => {});",
    "describe.skip(\"suite\", () => {});",
    "xit(\"old\", () => {});",
    "'deprecated_file', // Files with an @deprecated marker",
    "// TODO: wire the cache", // identical line - dedupes at graph level
    "const todo = computeTodoList();", // not a comment marker
  ].join("\n");
  const facts = jsts.extractDebtMarkerFacts("src/a.ts", content);
  const markers = facts.map((f) => f.value.marker).sort();

  assert.deepEqual(markers, ["deprecated", "disabled-test", "disabled-test", "disabled-test", "fixme", "hack", "todo", "todo"]);

  // The duplicate TODO lines produce byte-identical facts (same id after
  // dedupe); code identifiers containing "todo" never fire.
  const todoFacts = facts.filter((f) => f.value.marker === "todo");
  assert.equal(todoFacts[0].id, todoFacts[1].id);
});

test("emitter scope: production markers fire; test-tree TODOs are excluded; disabled tests fire in test trees", () => {
  const facts = [
    { kind: "debt_marker", subject: "src/service.ts", value: { marker: "todo", detail: "// TODO: x" } },
    { kind: "debt_marker", subject: "tests/helper.test.ts", value: { marker: "todo", detail: "// TODO: y" } },
    { kind: "debt_marker", subject: "tests/helper.test.ts", value: { marker: "disabled-test", detail: "it.skip(...)" } },
  ];
  const findings = policy.evaluateDebtMarkers(facts);

  assert.deepEqual(findings.map((f) => f.files[0]).sort(), ["src/service.ts", "tests/helper.test.ts"]);

  const testFinding = findings.find((f) => f.files[0] === "tests/helper.test.ts");
  assert.deepEqual(testFinding.payload.markers.map((m) => m.marker), ["disabled-test"]);
  assert.match(testFinding.payload.citation, /detection-design-decisions\.md §B/);
  assert.equal(findings.every((f) => f.ruleId === "debt.markers"), true);
});

test("coverage scorer: file-set coverage per coverage-scored rule, never per-finding identity", () => {
  const ruleMap = {
    tech_debt: { status: "redesigned", citation: "test", rekonRuleId: "debt.markers", scoring: "coverage" },
  };
  const classicFindings = [
    { id: "c1", ruleId: "tech_debt", files: ["src/a.ts"], fireCount: 1, title: "prose a" },
    { id: "c2", ruleId: "tech_debt", files: ["src/b.ts"], fireCount: 1, title: "prose b" },
    { id: "c3", ruleId: "tech_debt", files: ["src/c.ts"], fireCount: 1, title: "prose c" },
  ];
  const rekonFindings = [
    { id: "r1", ruleId: "debt.markers", files: ["src/a.ts"], subjects: ["src/a.ts"] },
    { id: "r2", ruleId: "debt.markers", files: ["src/b.ts"], subjects: ["src/b.ts"] },
  ];
  const { coverage } = core.classifyParity({ classicFindings, rekonFindings, ruleMap });

  assert.equal(coverage.length, 1);
  assert.equal(coverage[0].ruleId, "tech_debt");
  assert.equal(coverage[0].classicFiles, 3);
  assert.equal(coverage[0].coveredFiles, 2);
  assert.ok(Math.abs(coverage[0].coverage - 2 / 3) < 1e-9);

  // The report renders the section.
  const report = core.buildBenchReport({
    generatedAt: "2026-06-11T00:00:00.000Z",
    corpusRoot: "/tmp",
    repos: [{ id: "fixture", refresh: { status: "skipped" }, rows: core.classifyParity({ classicFindings, rekonFindings, ruleMap }).rows, newFindings: [], coverage, precision: [], rekonFindingCount: 2 }],
  });
  assert.match(core.renderMarkdownReport(report), /## Coverage-scored rules[\s\S]*tech_debt.*66\.7%/);
});

test("rule-map scoring validation: unknown mode fails", () => {
  assert.throws(
    () => core.validateRuleMap({ x: { status: "ported", rekonRuleId: "r", scoring: "vibes" } }),
    /unknown scoring/,
  );
});
