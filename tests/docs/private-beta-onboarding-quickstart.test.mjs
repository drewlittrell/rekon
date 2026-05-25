// Docs contract tests for the Private Beta
// Onboarding Quickstart.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const quickstartPath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-onboarding-quickstart.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "private-beta-onboarding-quickstart.md",
);
const playbookPath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-support-playbook.md",
);
const bugReportPath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-bug-report-template.md",
);
const noNpmPolicyPath = join(
  repoRoot,
  "docs",
  "strategy",
  "no-npm-beta-distribution-policy.md",
);
const pathFreshnessReviewPath = join(
  repoRoot,
  "docs",
  "strategy",
  "path-freshness-safety-review.md",
);
const missingScriptMemoPath = join(
  repoRoot,
  "docs",
  "strategy",
  "verification-missing-script-tolerance.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");
const readmePath = join(repoRoot, "README.md");

async function readQuickstart() {
  return readFile(quickstartPath, "utf8");
}

async function flatQuickstart() {
  return (await readFile(quickstartPath, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: quickstart exists ----------

test("quickstart exists", () => {
  assert.ok(
    existsSync(quickstartPath),
    `expected ${quickstartPath}`,
  );
});

// ---------- 2: required headings ----------

test("quickstart contains all required headings", async () => {
  const content = await readQuickstart();
  const required = [
    "# Private Beta Onboarding Quickstart",
    "## Who This Is For",
    "## What Private Beta Means",
    "## Install From Source Checkout",
    "## Build Rekon",
    "## Pick A Target Repository",
    "## Run Your First Scan",
    "## Inspect The Main Outputs",
    "## Run Path Freshness",
    "## Optional Verification Flow",
    "## Optional GitHub Review Dry-Runs",
    "## Understand First-Class Outcomes",
    "## Report A Blocker",
    "## Privacy And Redaction",
    "## What This Does Not Do",
    "## Next Steps",
  ];
  for (const heading of required) {
    assert.ok(
      content.includes(heading),
      `quickstart missing heading: ${heading}`,
    );
  }
});

// ---------- 3: no-NPM verbatim pin ----------

test("quickstart pins no-NPM posture verbatim", async () => {
  const flat = await flatQuickstart();
  assert.ok(
    flat.includes(
      "Private beta users should not install Rekon from npm.",
    ),
    "quickstart missing 'Private beta users should not install Rekon from npm.' pin",
  );
});

// ---------- 4: source-checkout verbatim pin ----------

test("quickstart pins source-checkout posture verbatim", async () => {
  const flat = await flatQuickstart();
  assert.ok(
    flat.includes("Private beta is source-checkout based."),
    "quickstart missing 'Private beta is source-checkout based.' pin",
  );
});

// ---------- 5: canonical-vs-downstream pin ----------

test("quickstart pins canonical Rekon vs. downstream GitHub surfaces", async () => {
  const flat = await flatQuickstart();
  assert.ok(
    flat.includes(
      "Rekon artifacts are canonical; GitHub Checks and PR comments are downstream review surfaces.",
    ),
    "quickstart missing canonical-vs-downstream pin",
  );
});

// ---------- 6: temp-copy guidance pin ----------

test("quickstart pins temp-copy first-scan posture verbatim", async () => {
  const flat = await flatQuickstart();
  assert.ok(
    flat.includes(
      "Run first scans against a temp copy so Rekon artifacts and any target-side build / test artifacts do not pollute the committed repo.",
    ),
    "quickstart missing temp-copy pin",
  );
});

// ---------- 7: path-freshness vs lineage pin ----------

test("quickstart pins path freshness vs lineage freshness", async () => {
  const flat = await flatQuickstart();
  assert.ok(
    flat.includes(
      "Artifact lineage freshness is not working-tree freshness.",
    ),
    "quickstart missing path-freshness vs lineage pin",
  );
});

// ---------- 8: dry-run no-network pin ----------

test("quickstart pins dry-run no-network behaviour", async () => {
  const flat = await flatQuickstart();
  assert.ok(
    flat.includes("Dry-run commands make no network calls."),
    "quickstart missing dry-run no-network pin",
  );
});

// ---------- 9: GitHub not canonical pin ----------

test("quickstart pins GitHub surfaces are not canonical truth", async () => {
  const flat = await flatQuickstart();
  assert.ok(
    flat.includes(
      "GitHub status and comments are not canonical truth; Rekon artifacts remain canonical.",
    ),
    "quickstart missing 'GitHub status and comments are not canonical truth; Rekon artifacts remain canonical.' pin",
  );
});

// ---------- 10: install snippet ----------

test("quickstart includes git clone + npm ci + npm run build install snippet", async () => {
  const content = await readQuickstart();
  assert.ok(
    content.includes("git clone"),
    "quickstart missing git clone step",
  );
  assert.ok(
    content.includes("npm ci"),
    "quickstart missing npm ci step",
  );
  assert.ok(
    content.includes("npm run build"),
    "quickstart missing npm run build step",
  );
});

// ---------- 11: CLI invocation paths ----------

test("quickstart uses node packages/cli/dist/index.js as the CLI invocation", async () => {
  const content = await readQuickstart();
  assert.ok(
    content.includes("node packages/cli/dist/index.js"),
    "quickstart missing 'node packages/cli/dist/index.js' invocation",
  );
  assert.ok(
    content.includes('CLI="$(pwd)/packages/cli/dist/index.js"'),
    "quickstart missing CLI=\"$(pwd)/packages/cli/dist/index.js\" export",
  );
});

// ---------- 12: temp-copy pattern uses mktemp + clone-local ----------

test("quickstart shows mktemp -d + git clone --local --no-hardlinks pattern", async () => {
  const content = await readQuickstart();
  assert.ok(
    content.includes('mktemp -d'),
    "quickstart missing mktemp -d call",
  );
  assert.ok(
    content.includes("git clone --local --no-hardlinks"),
    "quickstart missing git clone --local --no-hardlinks pattern",
  );
});

// ---------- 13: rsync fallback ----------

test("quickstart includes rsync fallback for non-git sources", async () => {
  const content = await readQuickstart();
  assert.ok(
    content.includes("rsync -a"),
    "quickstart missing rsync fallback",
  );
  assert.ok(
    /--exclude\s+node_modules/.test(content) &&
      /--exclude\s+\.rekon/.test(content),
    "quickstart rsync fallback missing node_modules/.rekon excludes",
  );
});

// ---------- 14: first-scan chain ----------

test("quickstart contains the first-scan command chain", async () => {
  const content = await readQuickstart();
  for (const cmd of [
    'node "$CLI" init --root "$TARGET_ROOT" --json',
    'node "$CLI" refresh --root "$TARGET_ROOT" --json',
    'node "$CLI" paths freshness --root "$TARGET_ROOT" --json',
    'node "$CLI" artifacts validate --root "$TARGET_ROOT" --json',
  ]) {
    assert.ok(
      content.includes(cmd),
      `quickstart missing first-scan command: ${cmd}`,
    );
  }
});

// ---------- 15: findings/governance chain ----------

test("quickstart contains the findings + governance chain", async () => {
  const content = await readQuickstart();
  for (const cmd of [
    'node "$CLI" findings list',
    'node "$CLI" findings filter-health',
    'node "$CLI" issues adjudicate',
    'node "$CLI" issues list',
    'node "$CLI" coherency delta',
  ]) {
    assert.ok(
      content.includes(cmd),
      `quickstart missing findings/governance command: ${cmd}`,
    );
  }
});

// ---------- 16: publication outputs ----------

test("quickstart inspects all three publications", async () => {
  const content = await readQuickstart();
  for (const cmd of [
    "publish architecture",
    "publish agent-contract",
    "publish proof",
  ]) {
    assert.ok(
      content.includes(cmd),
      `quickstart missing publication command: ${cmd}`,
    );
  }
});

// ---------- 17: GitHub review dry-runs ----------

test("quickstart shows both GitHub review dry-run commands", async () => {
  const content = await readQuickstart();
  assert.ok(
    content.includes("publish github-check") &&
      content.includes("--dry-run"),
    "quickstart missing publish github-check --dry-run",
  );
  assert.ok(
    content.includes("publish pr-comment") &&
      content.includes("--dry-run"),
    "quickstart missing publish pr-comment --dry-run",
  );
});

// ---------- 18: unsupported commands listed ----------

test("quickstart explicitly lists unsupported npm install paths", async () => {
  const content = await readQuickstart();
  for (const banned of [
    "npm install @rekon/cli",
    "npm install -g @rekon/cli",
    "npx @rekon/cli",
  ]) {
    assert.ok(
      content.includes(banned),
      `quickstart should list '${banned}' as unsupported`,
    );
  }
});

// ---------- 19: three diagnostic tables ----------

test("quickstart contains First-Run Command, Output, and Blocker tables", async () => {
  const content = await readQuickstart();
  assert.ok(
    /###\s+First-Run Command Table/.test(content),
    "quickstart missing First-Run Command Table heading",
  );
  assert.ok(
    /###\s+Output Table/.test(content),
    "quickstart missing Output Table heading",
  );
  assert.ok(
    /###\s+Blocker Table/.test(content),
    "quickstart missing Blocker Table heading",
  );
  // Sanity: each table should have at least one pipe row.
  const tableRows = content.match(/^\|.+\|.+\|$/gm) ?? [];
  assert.ok(
    tableRows.length >= 9,
    `expected at least 9 table rows across the three diagnostic tables, got ${tableRows.length}`,
  );
});

// ---------- 20: playbook deference cross-link ----------

test("quickstart cross-links the support playbook and pins playbook as canonical", async () => {
  const content = await readQuickstart();
  assert.ok(existsSync(playbookPath), "playbook should exist");
  assert.ok(
    content.includes("private-beta-support-playbook.md"),
    "quickstart missing support playbook cross-link",
  );
  const flat = (await flatQuickstart()).toLowerCase();
  assert.ok(
    flat.includes("playbook wins"),
    "quickstart should pin 'playbook wins' on conflict",
  );
});

// ---------- 21: bug-report + path-freshness review + no-NPM cross-links ----------

test("quickstart cross-links bug-report template, path-freshness review, and no-NPM policy", async () => {
  const content = await readQuickstart();
  assert.ok(existsSync(bugReportPath), "bug report template should exist");
  assert.ok(existsSync(pathFreshnessReviewPath), "path freshness safety review should exist");
  assert.ok(existsSync(noNpmPolicyPath), "no-NPM beta policy should exist");
  for (const link of [
    "private-beta-bug-report-template.md",
    "path-freshness-safety-review.md",
    "no-npm-beta-distribution-policy.md",
  ]) {
    assert.ok(
      content.includes(link),
      `quickstart missing cross-link to ${link}`,
    );
  }
});

// ---------- 22: missing-script tolerance memo cross-link ----------

test("quickstart cross-links the verification missing-script tolerance memo", async () => {
  const content = await readQuickstart();
  assert.ok(
    existsSync(missingScriptMemoPath),
    "verification missing-script tolerance memo should exist",
  );
  assert.ok(
    content.includes("verification-missing-script-tolerance.md"),
    "quickstart missing cross-link to verification-missing-script-tolerance.md",
  );
});

// ---------- 23: CHANGELOG + README mention the quickstart ----------

test("CHANGELOG and README mention the quickstart", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const readme = await readFile(readmePath, "utf8");
  const changelogFlat = changelog.replace(/\s+/g, " ").toLowerCase();
  const readmeFlat = readme.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    changelogFlat.includes("private beta onboarding quickstart") ||
      changelog.includes(
        "docs/beta/private-beta-onboarding-quickstart.md",
      ),
    "CHANGELOG missing private beta onboarding quickstart entry",
  );
  assert.ok(
    readmeFlat.includes("private beta onboarding quickstart") ||
      readme.includes(
        "docs/beta/private-beta-onboarding-quickstart.md",
      ),
    "README missing private beta onboarding quickstart entry",
  );
});

// ---------- 24: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /^##\s+PURPOSE PRESERVATION CHECK\s*$/m.test(packet),
    "review packet missing PURPOSE PRESERVATION CHECK section heading",
  );
  for (const heading of [
    "## CHANGES MADE",
    "## PUBLIC API CHANGES",
    "## PURPOSE PRESERVATION CHECK",
    "## CODEBASE-INTEL ALIGNMENT",
    "## ONBOARDING MODEL",
    "## COMMAND MATRIX",
    "## SUPPORT MODEL",
    "## TESTS / VERIFICATION",
    "## INTENTIONALLY UNTOUCHED",
    "## RISKS / FOLLOW-UP",
    "## NEXT STEP",
  ]) {
    assert.ok(
      packet.includes(heading),
      `review packet missing heading: ${heading}`,
    );
  }
});
