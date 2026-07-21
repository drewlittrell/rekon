import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = resolve(new URL("../..", import.meta.url).pathname);

test("maintainer judgment binds source-free review to the current context selection", () => {
  const temp = mkdtempSync(join(tmpdir(), "rekon-model-interface-judge-"));
  const output = join(temp, "report.json");
  const ledger = join(temp, "ledger.jsonl");
  const result = spawnSync(process.execPath, [
    resolve(root, "scripts/eval-model-interface-judge.mjs"),
    "--output",
    output,
    "--ledger",
    ledger,
  ], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.passed, true);
  assert.equal(report.modelCalls, 0);
  assert.equal(report.sourceRetention, "none");
  assert.equal(report.summary.cases, 17);
  assert.equal(report.summary.acceptedCases, 17);
  assert.equal(report.summary.staleJudgments, 0);
  assert.equal(report.summary.toleratedAvoidableRefs, 2);
  assert.ok(report.cases.every((entry) => entry.selectionDigest === entry.judgment.selectionDigest));
  assert.equal(JSON.stringify(report).includes("repository-file"), false);

  const writtenReport = JSON.parse(readFileSync(output, "utf8"));
  const ledgerEntries = readFileSync(ledger, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(writtenReport.passed, true);
  assert.equal(ledgerEntries.length, 1);
  assert.equal(ledgerEntries[0].cases.length, 17);
  assert.equal("task" in ledgerEntries[0].cases[0], false);
});
