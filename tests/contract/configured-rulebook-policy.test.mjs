import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages", "cli", "dist", "index.js");

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "rekon-config-rulebook-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "rulebook-fixture", type: "module" }));
  writeFileSync(join(root, "src/index.ts"), "export function greet(name: string) { return `hello ${name}`; }\n");
  const initialized = run(root, ["init"]);
  assert.equal(initialized.status, 0, initialized.stderr);
  return root;
}

function run(root, args) {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.REKON_LLM_PROVIDER;
  delete env.REKON_LLM_MODEL;
  return spawnSync(process.execPath, [cliPath, ...args, "--root", root, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
  });
}

function json(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function readConfig(root) {
  return JSON.parse(readFileSync(join(root, ".rekon/config.json"), "utf8"));
}

function writeConfig(root, config) {
  writeFileSync(join(root, ".rekon/config.json"), `${JSON.stringify(config, null, 2)}\n`);
}

function latestArtifact(root, type) {
  const output = json(run(root, ["artifacts", "latest", "--type", type]));
  return JSON.parse(readFileSync(join(root, output.artifact.path), "utf8"));
}

function configuredOwnershipRule() {
  return {
    id: "architecture.src-does-not-own-src",
    severity: "high",
    message: "The src system may not own the src capability.",
    source: ".rekon/config.json",
    appliesTo: ["CapabilityMap"],
    evaluator: "ownership.doesNotOwn",
    options: { system: "src", capability: "src" },
  };
}

test("configured repository law is materialized, reused, and explicitly superseded when removed", () => {
  const root = makeRepo();
  try {
    const config = readConfig(root);
    writeConfig(root, { ...config, rulebook: { rules: [configuredOwnershipRule()] } });

    const first = json(run(root, ["refresh"]));
    const firstRulebookStep = first.steps.find((step) => step.id === "rulebook");
    assert.deepEqual(firstRulebookStep.summary, { configured: true, changed: true, rules: 1 });
    assert.equal(firstRulebookStep.artifacts[0].type, "Rulebook");

    const rulebook = latestArtifact(root, "Rulebook");
    assert.equal(rulebook.header.producer.id, "@rekon/cli.config-rulebook");
    assert.equal(rulebook.header.supersession.key, "config:.rekon/config.json:rulebook");
    assert.equal(rulebook.rules.length, 1);
    assert.match(rulebook.header.provenance.notes.join("\n"), /\.rekon\/config\.json/);

    const findingReport = latestArtifact(root, "FindingReport");
    const violation = findingReport.findings.find((finding) => finding.type === "architecture.ownershipViolation");
    assert.ok(violation, "configured ownership law should produce a finding");
    assert.equal(violation.ruleId, "architecture.src-does-not-own-src");
    assert.ok(violation.evidence.some((ref) => ref.type === "Rulebook"));

    const second = json(run(root, ["refresh"]));
    const secondRulebookStep = second.steps.find((step) => step.id === "rulebook");
    assert.deepEqual(secondRulebookStep.summary, { configured: true, changed: false, rules: 1 });
    assert.equal(json(run(root, ["artifacts", "list", "--type", "Rulebook"])).artifacts.length, 1);

    const withoutRulebook = readConfig(root);
    delete withoutRulebook.rulebook;
    writeConfig(root, withoutRulebook);

    const removed = json(run(root, ["refresh"]));
    const removedRulebookStep = removed.steps.find((step) => step.id === "rulebook");
    assert.deepEqual(removedRulebookStep.summary, { configured: false, changed: true, rules: 0 });
    assert.equal(latestArtifact(root, "Rulebook").rules.length, 0);
    assert.equal(
      latestArtifact(root, "FindingReport").findings.some((finding) => finding.type === "architecture.ownershipViolation"),
      false,
      "superseded repository law must stop applying",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("config validation rejects malformed and duplicate Rulebook rules before refresh", () => {
  const root = makeRepo();
  try {
    const config = readConfig(root);
    const malformed = { ...configuredOwnershipRule(), enabled: "yes" };
    writeConfig(root, { ...config, rulebook: { rules: [malformed, malformed] } });

    const validation = run(root, ["config", "validate"]);
    assert.notEqual(validation.status, 0);
    const output = JSON.parse(validation.stdout);
    assert.equal(output.valid, false);
    assert.ok(output.issues.some((issue) => issue.path === "rulebook.rules[0].enabled"));
    assert.ok(output.issues.some((issue) => issue.code === "rulebook-rule-duplicate"));

    const refresh = run(root, ["refresh"]);
    assert.notEqual(refresh.status, 0);
    const refreshOutput = JSON.parse(refresh.stdout);
    assert.equal(refreshOutput.steps.at(-1).id, "config.validate");
    assert.equal(refreshOutput.steps.at(-1).status, "failed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
