// Docs contract tests for the Private Beta
// Onboarding Quickstart Refinements v2.

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
const validationReportPath = join(
  repoRoot,
  "docs",
  "beta",
  "private-beta-onboarding-validation-report.md",
);
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "private-beta-onboarding-quickstart-refinements-v2.md",
);
const changelogPath = join(repoRoot, "CHANGELOG.md");

async function readQuickstart() {
  return readFile(quickstartPath, "utf8");
}

async function flatQuickstart() {
  return (await readFile(quickstartPath, "utf8")).replace(/\s+/g, " ");
}

// ---------- 1: quickstart mentions package manager guidance ----------

test("quickstart mentions package manager guidance", async () => {
  const content = await readQuickstart();
  // We expect both an explicit subsection and the phrase "package
  // manager(s)" to appear.
  assert.ok(
    /###\s+Inspect The Plan Before Executing/.test(content),
    "quickstart missing 'Inspect The Plan Before Executing' subsection",
  );
  const flat = (await flatQuickstart()).toLowerCase();
  assert.ok(
    flat.includes("package manager"),
    "quickstart missing 'package manager' guidance",
  );
});

// ---------- 2: quickstart mentions pnpm ----------

test("quickstart mentions pnpm", async () => {
  const content = await readQuickstart();
  assert.ok(
    /\bpnpm\b/.test(content),
    "quickstart missing pnpm reference",
  );
});

// ---------- 3: quickstart mentions yarn ----------

test("quickstart mentions yarn", async () => {
  const content = await readQuickstart();
  assert.ok(
    /\byarn\b/.test(content),
    "quickstart missing yarn reference",
  );
});

// ---------- 4: quickstart mentions bun ----------

test("quickstart mentions bun", async () => {
  const content = await readQuickstart();
  assert.ok(
    /\bbun\b/.test(content),
    "quickstart missing bun reference",
  );
});

// ---------- 5: operators should inspect the VerificationPlan before execution ----------

test("quickstart says operators should inspect the VerificationPlan before execution", async () => {
  const flat = (await flatQuickstart()).toLowerCase();
  assert.ok(
    flat.includes("inspect the") &&
      flat.includes("verificationplan") &&
      flat.includes("before execut"),
    "quickstart should pin 'operators should inspect the VerificationPlan before execution'",
  );
});

// ---------- 6: missing scripts may be classified as skipped ----------

test("quickstart says missing scripts may be classified as skipped", async () => {
  const flat = (await flatQuickstart()).toLowerCase();
  assert.ok(
    flat.includes("missing") &&
      flat.includes("script") &&
      flat.includes("skipped"),
    "quickstart should pin 'missing scripts ... skipped'",
  );
});

// ---------- 7: failed VerificationRun is not automatically a Rekon blocker ----------

test("quickstart says failed VerificationRun is not automatically a Rekon blocker if recorded honestly", async () => {
  const flat = (await flatQuickstart()).toLowerCase();
  assert.ok(
    flat.includes("failed verification") &&
      flat.includes("not automatically a") &&
      flat.includes("rekon blocker"),
    "quickstart should pin 'Failed verification is not automatically a Rekon blocker if ... recorded honestly'",
  );
  assert.ok(
    flat.includes("recorded") || flat.includes("record the failure"),
    "quickstart should reference honest recording",
  );
});

// ---------- 8: package-manager mismatch is a planning / ergonomics issue ----------

test("quickstart says package-manager mismatch should be reported as planning / ergonomics issue", async () => {
  const flat = (await flatQuickstart()).toLowerCase();
  assert.ok(
    flat.includes("planning") && flat.includes("ergonomics"),
    "quickstart should classify pkg-manager mismatch as planning / ergonomics issue",
  );
});

// ---------- 9: artifacts validate is the structural artifact validity gate ----------

test("quickstart explains artifacts validate is the structural artifact validity gate", async () => {
  const flat = (await flatQuickstart()).toLowerCase();
  assert.ok(
    flat.includes(
      "`artifacts validate` is the structural artifact validity gate.".toLowerCase(),
    ),
    "quickstart missing the structural-validity-gate pin",
  );
});

// ---------- 10: historical newer-input-exists ----------

test("quickstart mentions historical newer-input-exists", async () => {
  const content = await readQuickstart();
  assert.ok(
    /newer-input-exists/.test(content),
    "quickstart should reference newer-input-exists",
  );
  const flat = (await flatQuickstart()).toLowerCase();
  assert.ok(
    flat.includes("historical") && flat.includes("newer-input-exists"),
    "quickstart should call out historical newer-input-exists entries",
  );
});

// ---------- 11: aggregate artifacts freshness stale is not automatically a blocker ----------

test("quickstart says aggregate artifacts freshness stale is not automatically a blocker", async () => {
  const flat = (await flatQuickstart()).toLowerCase();
  // Match either "aggregate stale output" or "aggregate ... stale" + "blocker" + not automatically
  assert.ok(
    /aggregate[\s\S]{0,80}stale[\s\S]{0,400}blocker/.test(flat) ||
      flat.includes(
        "aggregate `artifacts freshness: unknown` is a first-class acceptable outcome",
      ),
    "quickstart should clarify aggregate artifacts freshness stale is not automatically a blocker",
  );
});

// ---------- 12: paths freshness is working-tree freshness ----------

test("quickstart says paths freshness is working-tree freshness", async () => {
  const flat = (await flatQuickstart()).toLowerCase();
  assert.ok(
    flat.includes(
      "`paths freshness` is working-tree freshness and is separate from artifact lineage freshness.".toLowerCase(),
    ),
    "quickstart should pin '`paths freshness` is working-tree freshness ...' verbatim",
  );
});

// ---------- 13: support playbook mentions package-manager mismatch acceptable when recorded honestly ----------

test("support playbook mentions package-manager mismatch / missing scripts as acceptable when recorded honestly", async () => {
  const content = await readFile(playbookPath, "utf8");
  const flat = content.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("package-manager mismatch") &&
      flat.includes("acceptable") &&
      flat.includes("honestly"),
    "playbook should classify pkg-manager mismatch / missing scripts as acceptable when recorded honestly",
  );
});

// ---------- 14: bug report template asks for package manager ----------

test("bug report template asks for package manager", async () => {
  const content = await readFile(bugReportPath, "utf8");
  assert.ok(
    /###\s+Package Manager Used By Target Repo/.test(content),
    "bug report template missing 'Package Manager Used By Target Repo' subsection",
  );
});

// ---------- 15: bug report template asks whether VerificationPlan command matched package manager ----------

test("bug report template asks whether VerificationPlan command matched package manager", async () => {
  const content = await readFile(bugReportPath, "utf8");
  assert.ok(
    /##\s+VerificationPlan\s+.\s+Package Manager Match/.test(content),
    "bug report template missing 'VerificationPlan ↔ Package Manager Match' section",
  );
  const flat = content.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("did the verificationplan command match the target repo"),
    "bug report template should ask whether the plan matched the target's package manager",
  );
});

// ---------- 16: validation report records the two doc gaps were addressed ----------

test("onboarding validation report says the two doc gaps were addressed", async () => {
  const content = await readFile(validationReportPath, "utf8");
  const flat = content.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes(
      "the two documentation gaps from this validation run were addressed by private beta onboarding quickstart refinements v2.",
    ),
    "validation report missing closing note that v2 refinements addressed the gaps",
  );
});

// ---------- 17: CHANGELOG mentions quickstart refinements v2 ----------

test("CHANGELOG mentions quickstart refinements v2", async () => {
  const changelog = await readFile(changelogPath, "utf8");
  const flat = changelog.replace(/\s+/g, " ").toLowerCase();
  assert.ok(
    flat.includes("quickstart refinements v2") ||
      flat.includes("onboarding quickstart refinements v2") ||
      changelog.includes(
        ".rekon-dev/review-packets/private-beta-onboarding-quickstart-refinements-v2.md",
      ),
    "CHANGELOG should mention private beta onboarding quickstart refinements v2",
  );
});

// ---------- 18: review packet exists with PURPOSE PRESERVATION CHECK ----------

test("review packet exists and contains PURPOSE PRESERVATION CHECK", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const packet = await readFile(reviewPacketPath, "utf8");
  assert.ok(
    /^##\s+PURPOSE PRESERVATION CHECK\s*$/m.test(packet),
    "review packet missing PURPOSE PRESERVATION CHECK heading",
  );
  for (const heading of [
    "## CHANGES MADE",
    "## PUBLIC API CHANGES",
    "## PURPOSE PRESERVATION CHECK",
    "## CODEBASE-INTEL ALIGNMENT",
    "## DOGFOOD FINDINGS ADDRESSED",
    "## PACKAGE-MANAGER GUIDANCE",
    "## FRESHNESS WARNING GUIDANCE",
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
