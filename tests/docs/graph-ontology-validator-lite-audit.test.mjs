import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const strategyDir = join(repoRoot, "docs", "strategy");
const auditPath = join(strategyDir, "graph-ontology-validator-lite-audit.md");
const adrPath = join(strategyDir, "issue-governance-architecture-decision.md");
const regressionPath = join(strategyDir, "classic-guarantee-regression-plan.md");
const purposeMapPath = join(strategyDir, "classic-subsystem-purpose-map.md");
const behaviorRoadmapPath = join(strategyDir, "classic-behavior-roadmap.md");
const roadmapPath = join(strategyDir, "roadmap.md");
const changelogPath = join(repoRoot, "CHANGELOG.md");
const reviewPacketPath = join(
  repoRoot,
  ".rekon-dev",
  "review-packets",
  "graph-ontology-validator-lite-audit.md",
);

const REQUIRED_HEADINGS = [
  "## Decision Summary",
  "## Classic Behavior",
  "## Classic Checks / Signals",
  "## Rekon Current Coverage",
  "## Gaps",
  "## Proposed Rekon-Native Shape",
  "## Candidate Checks To Port",
  "## Checks To Defer",
  "## Rejected Porting Approach",
  "## Required Artifact Inputs",
  "## Future Regression Tests",
  "## Recommended Implementation Order",
];

const REQUIRED_ARTIFACT_REFERENCES = [
  "FindingFilterReport",
  "EvidenceGraph",
  "GraphSlice",
  "ObservedRepo",
  "OwnershipMap",
  "CapabilityMap",
];

const CANDIDATE_PORT_REASON_CODES = [
  "route-handler-with-service",
  "route-http-middleware-only",
  "external-api-comment-only",
  "factory-file-creates-deps",
  "module-gate-verified-caller",
];

test("graph-ontology-validator-lite-audit.md exists", () => {
  assert.ok(existsSync(auditPath), `expected audit doc at ${auditPath}`);
});

test("audit doc declares the rejection of a monolithic GraphOntologyValidator port", async () => {
  const text = await readFile(auditPath, "utf8");
  assert.ok(
    /Do not port `GraphOntologyValidator` as a monolithic/i.test(text)
      || /do not port .*GraphOntologyValidator.*monolithic/i.test(text),
    "audit must explicitly state we do not port GraphOntologyValidator as a monolithic service",
  );
});

test("audit doc contains every required heading in order", async () => {
  const text = await readFile(auditPath, "utf8");
  let cursor = 0;
  for (const heading of REQUIRED_HEADINGS) {
    const idx = text.indexOf(heading, cursor);
    assert.notEqual(
      idx,
      -1,
      `expected heading '${heading}' after position ${cursor} in ${auditPath}`,
    );
    cursor = idx + heading.length;
  }
});

test("audit doc references every required Rekon artifact input", async () => {
  const text = await readFile(auditPath, "utf8");
  for (const reference of REQUIRED_ARTIFACT_REFERENCES) {
    assert.ok(
      text.includes(reference),
      `expected audit to reference ${reference}`,
    );
  }
});

test("audit doc names each candidate-port reason code", async () => {
  const text = await readFile(auditPath, "utf8");
  for (const code of CANDIDATE_PORT_REASON_CODES) {
    assert.ok(
      text.includes(code),
      `expected audit to reference candidate reason '${code}'`,
    );
  }
});

test("audit doc names checks that are explicitly deferred", async () => {
  const text = await readFile(auditPath, "utf8");
  for (const fragment of [
    "runtime truth graph",
    "framework-specific",
    "source-reading",
  ]) {
    assert.ok(
      new RegExp(fragment, "i").test(text),
      `expected audit to discuss deferred topic '${fragment}'`,
    );
  }
});

test("audit doc proposes the capability-level graph-aware finding filter provider shape", async () => {
  const text = await readFile(auditPath, "utf8");
  assert.ok(
    /graph-aware finding filter provider/i.test(text),
    "audit must name the future Rekon-native shape",
  );
  assert.ok(
    /capability/i.test(text) && /graphContext/.test(text),
    "audit must recommend a capability-level provider plumbed via graphContext",
  );
});

test("audit doc rejects LLM / semantic / fuzzy filtering and source scraping", async () => {
  const text = await readFile(auditPath, "utf8");
  assert.ok(
    /LLM/i.test(text)
      && /semantic/i.test(text)
      && /(fuzzy|embedding)/i.test(text),
    "audit must mention LLM / semantic / fuzzy or embedding rejection",
  );
  assert.ok(
    /source/i.test(text)
      && /(scrape|scraping|reading)/i.test(text),
    "audit must rule out source scraping / reading from filter logic",
  );
});

test("audit doc lists at least five future regression test scenarios", async () => {
  const text = await readFile(auditPath, "utf8");
  const block = text.split("## Future Regression Tests")[1] ?? "";
  const nextHeading = block.indexOf("\n## ");
  const scoped = nextHeading === -1 ? block : block.slice(0, nextHeading);
  const numbered = scoped.match(/^\d+\.\s/gm) ?? [];
  assert.ok(
    numbered.length >= 5,
    `expected at least 5 numbered regression scenarios, found ${numbered.length}`,
  );
});

test("audit doc names a required artifact projection that must ship first", async () => {
  const text = await readFile(auditPath, "utf8");
  // The audit recommends a flat file index and an optional
  // `ObservedSystem.kind` field as required artifact-side work.
  assert.ok(
    /flat file index/i.test(text) || /ObservedRepo\.files/i.test(text),
    "audit must call out the missing flat file index / ObservedRepo.files projection",
  );
  assert.ok(
    /ObservedSystem\.kind/.test(text),
    "audit must call out the optional ObservedSystem.kind projection",
  );
});

test("ADR Implementation Order references the audit + queues the next implementation step", async () => {
  const text = await readFile(adrPath, "utf8");
  assert.ok(
    /\(shipped\)\*\*\s*`GraphOntologyValidator`-lite parity\s*audit/.test(text)
      || /GraphOntologyValidator.*lite/.test(text) && /\(shipped\)/.test(text),
    "ADR must flip the GraphOntologyValidator-lite audit step to shipped",
  );
  assert.ok(
    /Graph-aware finding filter provider v1/.test(text),
    "ADR must queue a future Graph-aware finding filter provider v1 step",
  );
});

test("CHANGELOG mentions the GraphOntologyValidator-lite audit", async () => {
  const text = await readFile(changelogPath, "utf8");
  assert.ok(
    /GraphOntologyValidator.*lite/i.test(text)
      && /audit/i.test(text),
    "CHANGELOG must include an entry naming the audit",
  );
});

test("classic-guarantee-regression-plan adds the audit shipped entry", async () => {
  const text = await readFile(regressionPath, "utf8");
  assert.ok(
    /GraphOntologyValidator.*lite parity audit/.test(text) && /shipped/.test(text),
    "regression plan must record the audit as shipped with a pinned test",
  );
  assert.ok(
    /graph-ontology-validator-lite-audit\.test\.mjs/.test(text),
    "regression plan must reference the docs test that pins the audit",
  );
});

test("subsystem-purpose-map + behavior-roadmap + roadmap reference the audit", async () => {
  const purposeMap = await readFile(purposeMapPath, "utf8");
  const behavior = await readFile(behaviorRoadmapPath, "utf8");
  const roadmap = await readFile(roadmapPath, "utf8");
  for (const [label, text] of [
    ["subsystem-purpose-map", purposeMap],
    ["behavior-roadmap", behavior],
    ["roadmap", roadmap],
  ]) {
    assert.ok(
      /GraphOntologyValidator.*lite/.test(text),
      `${label} must mention the GraphOntologyValidator-lite audit`,
    );
    assert.ok(
      /graph-ontology-validator-lite-audit\.md/.test(text),
      `${label} must link the audit doc`,
    );
  }
});

test("review packet exists and uses the required section headings", async () => {
  assert.ok(
    existsSync(reviewPacketPath),
    `expected review packet at ${reviewPacketPath}`,
  );
  const text = await readFile(reviewPacketPath, "utf8");
  for (const heading of [
    "## CHANGES MADE",
    "## PUBLIC API CHANGES",
    "## PURPOSE PRESERVATION CHECK",
    "## CODEBASE-INTEL ALIGNMENT",
    "## CLASSIC CHECKS REVIEWED",
    "## REKON-NATIVE RECOMMENDATION",
    "## CANDIDATES TO PORT / DEFER",
    "## TESTS / VERIFICATION",
    "## INTENTIONALLY UNTOUCHED",
    "## RISKS / FOLLOW-UP",
    "## NEXT STEP",
  ]) {
    assert.ok(
      text.includes(heading),
      `review packet must include section '${heading}'`,
    );
  }
});
