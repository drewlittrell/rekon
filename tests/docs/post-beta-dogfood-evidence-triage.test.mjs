// Docs contract tests for the Post-Beta Dogfood
// Evidence Triage Decision memo — strategy /
// docs / tests-only batch that classifies cohort
// evidence and selects the next post-beta track.

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
  "post-beta-dogfood-evidence-triage.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "post-beta-dogfood-evidence-triage.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readMemoFlat() {
  const content = await readFile(memoPath, "utf8");
  return content.replace(/\s+/g, " ");
}

// ---------- 1: triage doc exists ----------

test("triage memo exists", () => {
  assert.ok(existsSync(memoPath), `expected memo at ${memoPath}`);
});

// ---------- 2: doc reviews missing-script tolerance ----------

test("memo reviews missing-script tolerance as shipped polish", async () => {
  const flat = await readMemoFlat();
  assert.ok(
    /missing-script tolerance/i.test(flat),
    "expected the memo to name VerificationPlan missing-script tolerance",
  );
  assert.ok(
    /shipped/i.test(flat),
    "expected the memo to mark missing-script tolerance as shipped",
  );
  assert.ok(
    /verification-missing-script-tolerance/.test(flat),
    "expected the memo to cross-reference the missing-script tolerance memo",
  );
});

// ---------- 3: doc separates blockers from polish ----------

test("memo separates blockers, polish, and deferred classifications", async () => {
  const flat = await readMemoFlat();
  assert.ok(
    /no release blockers/i.test(flat),
    "expected explicit no-release-blocker statement",
  );
  assert.ok(
    /Evidence Classification/i.test(flat),
    "expected an Evidence Classification section",
  );
  assert.ok(
    /polish/i.test(flat),
    "expected explicit polish classification",
  );
  assert.ok(
    /deferred post-beta track/i.test(flat),
    "expected explicit deferred-post-beta-track classification",
  );
});

// ---------- 4: doc says no new npm publish ----------

test("memo says no new npm publish", async () => {
  const flat = await readMemoFlat();
  assert.ok(
    /no npm publish/i.test(flat) || /does not publish to npm/i.test(flat),
    "expected explicit no-npm-publish pin",
  );
  assert.ok(
    /no-NPM beta/i.test(flat),
    "expected reference to the no-NPM beta posture",
  );
});

// ---------- 5: doc says no schema change from skipped status ----------

test("memo pins no schema change from skipped status", async () => {
  const flat = await readMemoFlat();
  assert.ok(
    /no schema change/i.test(flat),
    "expected explicit no-schema-change statement",
  );
  assert.ok(
    /skipped/i.test(flat),
    "expected the memo to discuss skipped semantics",
  );
});

// ---------- 6: doc evaluates source-write apply ----------

test("memo evaluates Option B (source-write apply)", async () => {
  const flat = await readMemoFlat();
  assert.ok(
    /Option B/i.test(flat),
    "expected Option B heading",
  );
  assert.ok(
    /source-write apply/i.test(flat),
    "expected source-write apply discussion",
  );
});

// ---------- 7: doc evaluates watcher/path freshness ----------

test("memo evaluates Option C (watcher / path freshness)", async () => {
  const flat = await readMemoFlat();
  assert.ok(
    /Option C/i.test(flat),
    "expected Option C heading",
  );
  assert.ok(
    /path freshness/i.test(flat),
    "expected path freshness discussion",
  );
  assert.ok(
    /PathFreshnessReport/.test(flat),
    "expected reference to the reserved PathFreshnessReport artifact name",
  );
});

// ---------- 8: doc evaluates rule breadth ----------

test("memo evaluates Option D (rule breadth / graph-aware filters)", async () => {
  const flat = await readMemoFlat();
  assert.ok(
    /Option D/i.test(flat),
    "expected Option D heading",
  );
  assert.ok(
    /rule breadth|graph-aware filters/i.test(flat),
    "expected rule breadth / graph-aware filter discussion",
  );
});

// ---------- 9: doc evaluates memory maturity ----------

test("memo evaluates Option E (memory maturity)", async () => {
  const flat = await readMemoFlat();
  assert.ok(
    /Option E/i.test(flat),
    "expected Option E heading",
  );
  assert.ok(
    /memory maturity/i.test(flat),
    "expected memory maturity discussion",
  );
});

// ---------- 10: doc recommends a next track ----------

test("memo recommends Option C as the next track", async () => {
  const flat = await readMemoFlat();
  assert.ok(
    /Next track:.*Option C/i.test(flat)
      || /Option C.*selected/i.test(flat)
      || /recommended.*Option C/i.test(flat),
    "expected an explicit recommendation of Option C",
  );
  assert.ok(
    /PathFreshnessReport artifact.*source-state fingerprint/i.test(flat),
    "expected the next-slice spec to name PathFreshnessReport + source-state fingerprint",
  );
});

// ---------- 11: CHANGELOG mentions the triage ----------

test("CHANGELOG mentions the post-beta dogfood evidence triage", async () => {
  const content = await readFile(changelogPath, "utf8");
  assert.ok(
    /post-beta dogfood evidence triage/i.test(content),
    "expected CHANGELOG entry for the triage decision",
  );
});

// ---------- 12: review packet exists and contains PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected review packet at ${reviewPacketPath}`);
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /## PURPOSE PRESERVATION CHECK/.test(packet),
    "expected review packet to contain a PURPOSE PRESERVATION CHECK section",
  );
  assert.ok(
    /post-beta-dogfood-evidence-triage/.test(packet),
    "expected review packet to name the slice",
  );
});
