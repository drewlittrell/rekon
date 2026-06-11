// WO-14 sub-order C: the suppressed-dataset precision dimension. Fire on
// kept, silent on suppressed; a suppressed finding sharing a file with a
// KEPT finding of the same rule cannot condemn a fire (the ambiguous-file
// guard). The exporter's output shape loads through the same normalizer
// as kept findings.

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const core = await import(join(repoRoot, "tests/bench/parity-core.mjs"));
const normalize = await import(join(repoRoot, "tests/bench/normalize-classic.mjs"));

const RULE_MAP = {
  layering: { status: "ported", citation: "test", rekonRuleId: "grammar.divergence" },
};

test("precision: fired-on-suppressed vs silent, with the ambiguous-file guard", () => {
  const classicFindings = [
    { id: "k1", ruleId: "layering", files: ["src/shared.ts"], fireCount: 1, title: "kept on shared" },
  ];
  const suppressedFindings = [
    // Fired on: rekon has a finding on this file -> precision miss.
    { id: "s1", ruleId: "layering", files: ["src/fp.ts"], fireCount: 1, title: "fp", reason: "type_only_file" },
    // Silent on: no rekon finding here -> precision win.
    { id: "s2", ruleId: "layering", files: ["src/quiet.ts"], fireCount: 1, title: "quiet", reason: "factory_file_creates_deps" },
    // Ambiguous: same file carries a KEPT finding of the same rule.
    { id: "s3", ruleId: "layering", files: ["src/shared.ts"], fireCount: 1, title: "ambiguous", reason: "route_handler_with_service" },
  ];
  const rekonFindings = [
    { id: "r1", ruleId: "grammar.divergence", files: ["src/fp.ts"], subjects: ["src/fp.ts"] },
    { id: "r2", ruleId: "grammar.divergence", files: ["src/shared.ts"], subjects: ["src/shared.ts"] },
  ];
  const { precision } = core.classifyParity({ classicFindings, rekonFindings, ruleMap: RULE_MAP, suppressedFindings });

  assert.equal(precision.length, 1);
  assert.deepEqual(precision[0], {
    rekonRuleId: "grammar.divergence",
    suppressedTotal: 3,
    ambiguousSkipped: 1,
    firedOnSuppressed: 1,
    silentOnSuppressed: 1,
  });
});

test("report renders the precision section per rule", () => {
  const { rows, newFindings, coverage, precision } = core.classifyParity({
    classicFindings: [],
    rekonFindings: [{ id: "r1", ruleId: "grammar.divergence", files: ["src/fp.ts"], subjects: ["src/fp.ts"] }],
    ruleMap: RULE_MAP,
    suppressedFindings: [{ id: "s1", ruleId: "layering", files: ["src/fp.ts"], fireCount: 1, title: "fp", reason: "type_only_file" }],
  });
  const report = core.buildBenchReport({
    generatedAt: "2026-06-11T00:00:00.000Z",
    corpusRoot: "/tmp",
    repos: [{ id: "fixture", refresh: { status: "skipped" }, rows, newFindings, coverage, precision, rekonFindingCount: 1 }],
  });
  const markdown = core.renderMarkdownReport(report);

  assert.match(markdown, /## Precision vs suppressed set \(fire on kept, silent on suppressed\)/);
  assert.match(markdown, /grammar\.divergence \| 1 \| 1 \| 0 \| 0/);
});

test("suppressed.json loads through the kept-findings normalizer, reasons preserved; absent file is empty", () => {
  const dir = mkdtempSync(join(tmpdir(), "rekon-wave1c-"));

  try {
    writeFileSync(join(dir, "suppressed.json"), JSON.stringify([
      { issue: { id: "x-1", type: "architecture", files: ["./src\\a.ts"], severity: "low" }, reason: "type_only_file" },
    ]));
    const loaded = normalize.loadSuppressedFindings({ classicOutputDir: dir });

    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].ruleId, "architecture");
    assert.deepEqual(loaded[0].files, ["src/a.ts"]);
    assert.equal(loaded[0].reason, "type_only_file");

    assert.deepEqual(normalize.loadSuppressedFindings({ classicOutputDir: join(dir, "missing") }), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
