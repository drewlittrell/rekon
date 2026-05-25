// Docs contract tests for the Path Freshness
// Safety Review memo — the final slice in the
// post-beta watcher / path-freshness track.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const memoPath = join(
  repoRoot,
  "docs",
  "strategy",
  "path-freshness-safety-review.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "path-freshness-safety-review.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readMemo() {
  return readFile(memoPath, "utf8");
}

async function flatMemo() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: memo exists ----------

test("safety review memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: required headings ----------

test("safety review memo contains all required headings", async () => {
  const content = await readMemo();
  const required = [
    "# Path Freshness Safety Review",
    "## Decision Summary",
    "## Why This Review Exists",
    "## Components Reviewed",
    "## Artifact Model Review",
    "## Source-State Fingerprint Review",
    "## CLI Review",
    "## Publication Surfacing Review",
    "## GitHub Review Surfacing Review",
    "## Read-Only Guarantee",
    "## No-Daemon Policy",
    "## Mtime And Hash Policy",
    "## GitHub Check Conclusion Policy",
    "## Beta-Private Stability Decision",
    "## Remaining Risks",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `expected heading: ${heading}`,
    );
  }
});

// ---------- 3: beta-private stable decision ----------

test("memo says path freshness track is beta-private stable", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /path freshness track is beta-private stable/i,
    "expected an explicit beta-private stable decision",
  );
});

// ---------- 4: lineage ≠ working-tree ----------

test("memo says artifact lineage freshness is not working-tree freshness", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /Artifact lineage freshness is not working-tree freshness/i,
    "expected the explicit lineage-vs-working-tree distinction",
  );
});

// ---------- 5: explicit + operator-triggered ----------

test("memo says PathFreshnessReport is explicit and operator-triggered", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /PathFreshnessReport is explicit and operator-triggered/i,
    "expected the verbatim statement: PathFreshnessReport is explicit and operator-triggered",
  );
});

// ---------- 6: no daemon / no background refresh ----------

test("memo says no daemon and no background refresh exists", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /no (watcher )?daemon/i,
    "expected the no-daemon statement",
  );
  assert.match(
    flat,
    /no background refresh/i,
    "expected the no-background-refresh statement",
  );
});

// ---------- 7: warning not override ----------

test("memo says stale path freshness is a warning, not a Check conclusion override", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /Stale path freshness is a warning, not a GitHub Check conclusion override/i,
    "expected the explicit warning-not-override statement",
  );
});

// ---------- 8: references PathFreshnessReport ----------

test("memo references PathFreshnessReport", async () => {
  const content = await readMemo();
  assert.ok(
    content.includes("PathFreshnessReport"),
    "expected memo to reference PathFreshnessReport",
  );
});

// ---------- 9: references source-state fingerprint ----------

test("memo references source-state fingerprint", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /source-state fingerprint/i,
    "expected memo to reference source-state fingerprint",
  );
});

// ---------- 10: references rekon paths freshness ----------

test("memo references `rekon paths freshness`", async () => {
  const content = await readMemo();
  assert.ok(
    content.includes("rekon paths freshness"),
    "expected memo to reference rekon paths freshness",
  );
});

// ---------- 11: references publication surfacing ----------

test("memo references publication surfacing", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /publication surfacing/i,
    "expected memo to reference publication surfacing",
  );
});

// ---------- 12: references GitHub review surfacing ----------

test("memo references GitHub review surfacing", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /GitHub review surfacing/i,
    "expected memo to reference GitHub review surfacing",
  );
});

// ---------- 13: content hashes are canonical ----------

test("memo says content hashes are canonical", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /content hashes are canonical/i,
    "expected memo to pin: content hashes are canonical",
  );
});

// ---------- 14: mtimes advisory ----------

test("memo says mtimes are advisory", async () => {
  const flat = await flatMemo();
  assert.match(
    flat,
    /mtimes? (are )?advisory/i,
    "expected memo to pin: mtimes are advisory",
  );
});

// ---------- 15: component table ----------

test("memo includes a component table", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /\| Component \| Status \| Notes \|/,
    "expected memo to include the component-table header",
  );
  // Pin a couple of expected rows.
  assert.match(content, /\| `PathFreshnessReport` artifact \| shipped /);
  assert.match(content, /\| GitHub surfacing \| shipped /);
});

// ---------- 16: risk table ----------

test("memo includes a risk table", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /\| Risk \| Current Guardrail \| Remaining Follow-Up \|/,
    "expected memo to include the risk-table header",
  );
});

// ---------- 17: decision table ----------

test("memo includes a decision table", async () => {
  const content = await readMemo();
  assert.match(
    content,
    /\| Criterion \| Result \|/,
    "expected memo to include the decision-table header",
  );
  assert.match(content, /\| Explicit artifact exists \| pass \|/);
  assert.match(content, /\| No background refresh \| pass \|/);
});

// ---------- 18: CHANGELOG ----------

test("CHANGELOG mentions the path freshness safety review", async () => {
  const content = await readFile(changelogPath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /path freshness safety review/i,
    "expected CHANGELOG entry for the safety review",
  );
});

// ---------- 19: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected ${reviewPacketPath}`);
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /## PURPOSE PRESERVATION CHECK/.test(packet),
    "expected review packet to contain PURPOSE PRESERVATION CHECK",
  );
  assert.ok(
    /path-freshness-safety-review/.test(packet),
    "expected review packet to name the slice",
  );
});
