// Docs contract tests for the Private Beta
// Support Playbook + Bug Report Template.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const playbookPath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-support-playbook.md",
);
const templatePath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-bug-report-template.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "private-beta-support-playbook.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readPlaybook() {
  return readFile(playbookPath, "utf8");
}

async function flatPlaybook() {
  return (await readFile(playbookPath, "utf8")).replace(/\s+/g, " ");
}

async function readTemplate() {
  return readFile(templatePath, "utf8");
}

// ---------- 1: playbook exists ----------

test("private beta support playbook exists", () => {
  assert.ok(existsSync(playbookPath), `expected ${playbookPath}`);
});

// ---------- 2: bug report template exists ----------

test("private beta bug report template exists", () => {
  assert.ok(existsSync(templatePath), `expected ${templatePath}`);
});

// ---------- 3: playbook headings ----------

test("playbook contains all required headings", async () => {
  const content = await readPlaybook();
  const required = [
    "# Private Beta Support Playbook",
    "## Purpose",
    "## Distribution Model",
    "## Install From Source Checkout",
    "## First Run Command Matrix",
    "## Artifact Sharing Policy",
    "## Bug Report Requirements",
    "## Blocker Taxonomy",
    "## Acceptable First-Class Outcomes",
    "## Path Freshness Guidance",
    "## GitHub Review Surface Guidance",
    "## Privacy And Redaction Guidance",
    "## Support Triage Flow",
    "## What This Does Not Do",
    "## Follow-Up Work",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `playbook missing heading: ${heading}`,
    );
  }
});

// ---------- 4: bug report template headings ----------

test("bug report template contains all required headings", async () => {
  const content = await readTemplate();
  const required = [
    "# Private Beta Bug Report Template",
    "## Summary",
    "## Environment",
    "## Rekon Version / SHA",
    "## Target Repository Shape",
    "## Commands Run",
    "## Expected Result",
    "## Actual Result",
    "## Artifact Validation Result",
    "## Path Freshness Result",
    "## Verification Result",
    "## GitHub Review Dry-Run Result",
    "## Attached Artifacts",
    "## Redactions Applied",
    "## Blocker Classification",
    "## Additional Notes",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `bug report template missing heading: ${heading}`,
    );
  }
});

// ---------- 5: npm install not supported ----------

test("playbook says npm install is not supported during beta", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /`?npm install`? is not supported during beta/i,
    "expected the verbatim npm-install-not-supported statement",
  );
});

// ---------- 6: use source checkout ----------

test("playbook says use source checkout", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /Use source checkout/i,
    "expected the use-source-checkout statement",
  );
});

// ---------- 7: npm ci + npm run build ----------

test("playbook says run npm ci and npm run build", async () => {
  const flat = await flatPlaybook();
  assert.match(flat, /npm ci/i, "expected npm ci instruction");
  assert.match(flat, /npm run build/i, "expected npm run build instruction");
});

// ---------- 8: node packages/cli/dist/index.js ----------

test("playbook mentions node packages/cli/dist/index.js", async () => {
  const content = await readPlaybook();
  assert.ok(
    content.includes("node packages/cli/dist/index.js"),
    "expected playbook to reference node packages/cli/dist/index.js",
  );
});

// ---------- 9: attach .rekon/artifacts/index.json ----------

test("playbook says attach .rekon/artifacts/index.json (or equivalent)", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /\.rekon\/artifacts\/(registry\/artifacts\.)?index\.json/i,
    "expected playbook to reference the artifact index path",
  );
});

// ---------- 10: artifacts validate invalid is a blocker ----------

test("playbook says artifacts validate invalid is a blocker", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /Artifact validation failure is a blocker/i,
    "expected verbatim: Artifact validation failure is a blocker",
  );
});

// ---------- 11: findings exist is acceptable ----------

test("playbook says findings exist is acceptable", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /Findings are first-class output, not defects/i,
    "expected playbook to classify findings as first-class / acceptable",
  );
});

// ---------- 12: failed verification can be acceptable if recorded honestly ----------

test("playbook says failed verification can be acceptable if recorded honestly", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /failed verification recorded honestly.{0,40}acceptable/i,
    "expected playbook to mark honest verification failure as acceptable",
  );
});

// ---------- 13: PathFreshnessReport first run is unknown ----------

test("playbook says PathFreshnessReport first run is unknown", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /first .{0,80}paths.?freshness.{0,40}records.{0,40}unknown/i,
    "expected playbook to call out first-run unknown as acceptable",
  );
});

// ---------- 14: run paths freshness after source edits ----------

test("playbook says run paths freshness after source edits", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /Run `rekon paths freshness` after source edits/i,
    "expected playbook to direct operators to rerun paths freshness after source edits",
  );
});

// ---------- 15: lineage ≠ working-tree ----------

test("playbook says artifact lineage freshness is not working-tree freshness", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /Artifact lineage freshness is not working-tree freshness/i,
    "expected verbatim: artifact lineage freshness is not working-tree freshness",
  );
});

// ---------- 16: GitHub status/comments are not canonical truth ----------

test("playbook says GitHub status/comments are not canonical truth", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /GitHub status \/ comments are not canonical truth/i,
    "expected verbatim: GitHub status / comments are not canonical truth",
  );
});

// ---------- 17: Rekon artifacts remain canonical ----------

test("playbook says Rekon artifacts remain canonical", async () => {
  const flat = await flatPlaybook();
  assert.match(
    flat,
    /Rekon artifacts remain canonical/i,
    "expected verbatim: Rekon artifacts remain canonical",
  );
});

// ---------- 18: support classification table ----------

test("playbook includes the support classification table", async () => {
  const content = await readPlaybook();
  assert.match(
    content,
    /\| Outcome \| Classification \| Next Step \|/,
    "expected support classification table header",
  );
  assert.match(content, /\| findings exist \| acceptable \|/i);
  assert.match(content, /artifacts validate.* invalid.*\| blocker \|/i);
});

// ---------- 19: artifact attachment table ----------

test("playbook includes the artifact attachment table", async () => {
  const content = await readPlaybook();
  assert.match(
    content,
    /\| Artifact \| Attach When \|/,
    "expected artifact attachment table header",
  );
  assert.match(content, /\| `PathFreshnessReport` \| /);
  assert.match(content, /\| `VerificationRun` \| /);
});

// ---------- 20: command matrix table ----------

test("playbook includes the command matrix table", async () => {
  const content = await readPlaybook();
  assert.match(
    content,
    /\| Step \| Command \|/,
    "expected command matrix table header",
  );
  assert.match(content, /\| build \| `npm ci && npm run build` \|/);
  assert.match(content, /\| refresh \| `node packages\/cli\/dist\/index\.js refresh/);
});

// ---------- 21: CHANGELOG entry ----------

test("CHANGELOG mentions the private beta support playbook", async () => {
  const content = await readFile(changelogPath, "utf8");
  const flat = content.replace(/\s+/g, " ");
  assert.match(
    flat,
    /private beta support playbook/i,
    "expected CHANGELOG entry for the private beta support playbook",
  );
});

// ---------- 22: review packet ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(existsSync(reviewPacketPath), `expected ${reviewPacketPath}`);
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /## PURPOSE PRESERVATION CHECK/.test(packet),
    "expected review packet to contain PURPOSE PRESERVATION CHECK",
  );
  assert.ok(
    /private-beta-support-playbook/.test(packet),
    "expected review packet to name the slice",
  );
});
