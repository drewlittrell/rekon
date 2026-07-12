// Behavioral tests for operator overrules. A rulingRef must resolve into a
// committed law artifact, overruling is per-finding rather than per-rule, and
// overruled findings leave the recall denominator like rejected rows.

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const core = await import(join(repoRoot, "tests/bench/parity-core.mjs"));

const RULE_MAP = {
  layering: { status: "ported", citation: "test", rekonRuleId: "grammar.divergence" },
};

const classic = (id, file, fireCount = 1) => ({
  id,
  ruleId: "layering",
  file,
  files: [file],
  fireCount,
  title: `finding ${id}`,
});

test("overruled leaves the denominator like rejected, per-finding", () => {
  const findings = [classic("c-1", "app/a.ts"), classic("c-2", "app/b.ts"), classic("c-3", "app/c.ts", 3)];
  const { rows } = core.classifyParity({
    classicFindings: findings,
    rekonFindings: [],
    ruleMap: RULE_MAP,
    overruled: [{ classicId: "c-2", rulingRef: "docs/x.md#some-ruling" }],
  });

  assert.deepEqual(rows.map((r) => r.classification), ["missed-gap", "overruled", "missed-gap"]);
  assert.equal(rows[1].citation, "docs/x.md#some-ruling");

  const recall = core.computeWeightedRecall(rows);

  // c-2 (weight 1) left the denominator; c-1 + c-3 (1 + 3) remain.
  assert.equal(recall.totalWeight, 4);
  assert.equal(recall.overruledWeight, 1);

  // Per-finding, never per-rule: the same rule's other findings stay scored.
  assert.equal(rows[0].classic.ruleId, rows[1].classic.ruleId);
});

test("rulingRef validation: an entry citing a nonexistent ruling fails", () => {
  const files = new Map([["docs/strategy/some-ruling.md", "## the boundary-contracts ruling\n"]]);
  const read = (path) => files.get(path) ?? null;

  // Resolvable ref passes.
  core.validateOverruledList(
    [{ classicId: "c-1", rulingRef: "docs/strategy/some-ruling.md#boundary-contracts" }],
    read,
  );

  // Missing file fails.
  assert.throws(
    () => core.validateOverruledList([{ classicId: "c-1", rulingRef: "docs/missing.md#x" }], read),
    /not a committed law artifact/,
  );

  // Existing file, fragment not found, fails: the ruling must exist
  // before the finding leaves the denominator.
  assert.throws(
    () => core.validateOverruledList([{ classicId: "c-1", rulingRef: "docs/strategy/some-ruling.md#no-such-ruling" }], read),
    /fragment "#no-such-ruling" not found/,
  );

  // No fragment at all fails (a bare file is not a ruling reference).
  assert.throws(
    () => core.validateOverruledList([{ classicId: "c-1", rulingRef: "docs/strategy/some-ruling.md" }], read),
    /<path>#<fragment>/,
  );

  // classicId required: per-finding by construction.
  assert.throws(
    () => core.validateOverruledList([{ rulingRef: "docs/strategy/some-ruling.md#boundary-contracts" }], read),
    /classicId/,
  );
});

test("report renders the overruled heading with per-finding citations", () => {
  const findings = [classic("c-1", "app/a.ts"), classic("c-2", "app/b.ts")];
  const { rows, newFindings } = core.classifyParity({
    classicFindings: findings,
    rekonFindings: [],
    ruleMap: RULE_MAP,
    overruled: [{ classicId: "c-1", rulingRef: "docs/x.md#ruling-1", note: "operator ruled classic wrong" }],
  });
  const report = core.buildBenchReport({
    generatedAt: "2026-06-11T00:00:00.000Z",
    corpusRoot: "/tmp/corpus",
    repos: [{ id: "fixture", refresh: { status: "skipped" }, rows, newFindings, rekonFindingCount: 0 }],
  });

  assert.equal(report.overruled.length, 1);
  assert.equal(report.overruled[0].classicId, "c-1");
  assert.equal(report.overruled[0].rulingRef, "docs/x.md#ruling-1");
  assert.equal(report.aggregate.overruledWeight, 1);

  const markdown = core.renderMarkdownReport(report);

  assert.match(markdown, /## Overruled by operator ruling \(out of denominator, per-finding\)/);
  assert.match(markdown, /c-1.*docs\/x\.md#ruling-1/);
  assert.match(markdown, /Denominator excludes operator-overruled findings: 1 weighted/);
});

test("operator overrules validate against repository rulings without a checked-in private list", () => {
  const defaultOverruledPath = join(repoRoot, "tests/bench/overruled.json");
  const entries = [
    {
      classicId: "fixture-boundary-contract",
      rulingRef: "docs/adr/0005-overruled-classic-findings.md#boundary-contracts",
      note: "Synthetic contract fixture.",
    },
  ];

  assert.equal(existsSync(defaultOverruledPath), false);

  core.validateOverruledList(entries, (path) => {
    const candidate = join(repoRoot, path);

    return existsSync(candidate) ? readFileSync(candidate, "utf8") : null;
  });
});
