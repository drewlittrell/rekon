// Contract tests for the CapabilityContract publication
// surfacing slice (thirty-fifth slice on the
// capability-ontology track).
//
// The architecture-summary publisher and agent-contract
// publisher both surface the latest CapabilityContract.
// Both surfaces are **strictly read-only** with respect
// to the contract itself, the
// `.rekon/capability-contracts.json` config file, the
// source CapabilityMap, CapabilityPhraseReport,
// CapabilityNormalizationReport, and EvidenceGraph.
//
// Tests pin:
//   1.  architecture summary renders no-contract guidance.
//   2.  architecture summary renders Capability Contracts
//       section when contract exists.
//   3.  architecture summary renders summary counts.
//   4.  architecture summary renders bounded contract table.
//   5.  architecture summary states publication does not
//       enforce linting/routing/verification/source writes.
//   6.  architecture summary cites CapabilityContract in
//       header.inputRefs when present.
//   7.  agent contract renders Capability Contracts section.
//   8.  agent contract says CapabilityContract is policy,
//       not projection.
//   9.  agent contract explains configured rows.
//   10. agent contract explains unmatched rows.
//   11. agent contract says surfacing does not enforce
//       linting/routing/verification/source writes.
//   12. agent contract Do Not Do reminder covers
//       architecture linting, resolver routing,
//       verification planning, finding resolution,
//       RefactorPreservationContract, and source-write
//       permission.
//   13. publication generation does not create or mutate
//       CapabilityContract.
//   14. publication generation does not mutate
//       .rekon/capability-contracts.json.
//   15. publication generation does not mutate
//       CapabilityMap.
//   16. publication generation does not mutate
//       CapabilityPhraseReport.
//   17. publication generation does not mutate
//       EvidenceGraph.
//   18. proof report surfacing is absent or explicitly
//       deferred in docs.
//   19. artifacts validate remains clean.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { buildCapabilityContractPublicationSection } from "../../packages/capability-docs/dist/index.js";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cliPath = join(repoRoot, "packages/cli/dist/index.js");
const exampleRoot = join(repoRoot, "examples/simple-js-ts");

const CAPABILITY_MAP_REF = {
  type: "CapabilityMap",
  id: "capability-map-test-001",
  path: ".rekon/artifacts/projections/CapabilityMap-test.json",
  schemaVersion: "0.1.0",
};

// ---------- 1: no-contract guidance ----------

test("architecture summary block renders no-contract guidance", () => {
  const { lines } = buildCapabilityContractPublicationSection({
    contract: undefined,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## Capability Contracts/m);
  assert.match(
    text,
    /No `CapabilityContract` found\./,
    "no-contract block must tell operators how to produce one",
  );
  assert.match(text, /rekon capability contract generate --json/);
  assert.match(
    text,
    /publication does not enforce linting, routing, verification planning, or source writes/,
  );
});

// ---------- 2: section present when contract exists ----------

test("architecture summary block renders the Capability Contracts section when a contract exists", () => {
  const contract = makeContract([
    contractEntry({ status: "configured", verb: "create", noun: "user", requiredChecks: ["npm test"] }),
  ]);
  const { lines } = buildCapabilityContractPublicationSection({
    contract,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /^## Capability Contracts/m);
  assert.match(text, /Rows: 1/);
});

// ---------- 3: summary counts ----------

test("architecture summary block renders summary counts (total / configured / unmatched / suggested / with*)", () => {
  const contract = makeContract([
    contractEntry({ status: "configured", verb: "create", noun: "user", requiredChecks: ["npm test"] }),
    contractEntry({ status: "unmatched", verb: "ship", noun: "rocket" }),
  ], {
    summary: {
      total: 2,
      configured: 1,
      suggested: 0,
      unmatched: 1,
      withRequiredChecks: 1,
      withPlacementRules: 0,
      withPreservationRules: 0,
    },
  });
  const { lines } = buildCapabilityContractPublicationSection({
    contract,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /Rows: 2 \(configured 1, unmatched 1, suggested 0\)/);
  assert.match(text, /requiredChecks 1/);
  assert.match(text, /placement 0/);
  assert.match(text, /preservation 0/);
});

// ---------- 4: bounded contract table ----------

test("architecture summary block renders a bounded contract table", () => {
  const rows = [];
  for (let index = 0; index < 25; index++) {
    rows.push(
      contractEntry({
        id: `row-${index}`,
        status: "configured",
        verb: "create",
        noun: `entity-${index}`,
        requiredChecks: ["npm test"],
      }),
    );
  }
  const contract = makeContract(rows);
  const { lines } = buildCapabilityContractPublicationSection({
    contract,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(text, /\| Status \| Verb \| Noun \| Domain \| Layer \| Checks \| Rules \|/);
  assert.match(text, /5 additional contract row\(s\) omitted/);
});

// ---------- 5: boundary statement ----------

test("architecture summary block states publication does not enforce linting/routing/verification/source writes", () => {
  const contract = makeContract([
    contractEntry({ status: "configured", verb: "create", noun: "user", requiredChecks: ["npm test"] }),
  ]);
  const { lines } = buildCapabilityContractPublicationSection({
    contract,
    headingLevel: 2,
  });
  const text = lines.join("\n");
  assert.match(
    text,
    /CapabilityContract is policy visibility only; this publication does not enforce linting, routing, verification planning, or source writes\./,
  );
});

// ---------- 6: architecture summary cites contract in header.inputRefs ----------

test("architecture summary publication cites CapabilityContract in header.inputRefs when present", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    const publication = await loadLatestPublication(work, "architecture-summary");
    const inputRefs = publication.header.inputRefs ?? [];
    const cite = inputRefs.find((ref) => ref.type === "CapabilityContract");
    assert.ok(cite, "architecture summary must cite CapabilityContract in header.inputRefs");
    assert.match(String(cite.id), /^capability-contract-/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 7: agent contract renders section ----------

test("agent contract publication renders Capability Contracts section", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /^### Capability Contracts/m);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 8: agent contract says CapabilityContract is policy, not projection ----------

test("agent contract publication says CapabilityContract is policy, not projection", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /CapabilityContract.*policy.*not.*projection|policy, not projection/i,
      "agent contract must say CapabilityContract is policy (not projection)",
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 9: agent contract explains configured rows ----------

test("agent contract publication explains configured rows", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /configured/i,
      "agent contract must reference the configured row status",
    );
    // The table header carries the Status column; together with
    // the Do Not Do reminder this establishes meaning.
    assert.match(content, /\| Status \| Verb \| Noun \|/);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 10: agent contract explains unmatched rows ----------

test("agent contract publication explains unmatched rows", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(content, /unmatched/i);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 11: agent contract says surfacing does not enforce ----------

test("agent contract publication says surfacing does not enforce linting/routing/verification/source writes", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /does not enforce linting, routing, verification planning, or source writes/i,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 12: agent contract Do Not Do reminder ----------

test("agent contract Do Not Do reminder covers architecture linting, resolver routing, verification planning, finding resolution, RefactorPreservationContract, and source-write permission", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    runCli(work, ["publish", "agent-contract", "--json"]);
    const publication = await loadLatestPublication(work, "agent-contract");
    const content = String(publication.content ?? "");
    assert.match(
      content,
      /Do not treat CapabilityContract publication surfacing as architecture linting, resolver routing, verification planning, finding resolution, RefactorPreservationContract, or source-write permission\./,
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 13: publication generation does not create or mutate CapabilityContract ----------

test("publication generation does not create or mutate CapabilityContract", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeContracts = before.filter((e) => e.type === "CapabilityContract");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterContracts = after.filter((e) => e.type === "CapabilityContract");
    assert.equal(afterContracts.length, beforeContracts.length);
    for (const entry of afterContracts) {
      const previous = beforeContracts.find((other) => other.id === entry.id);
      assert.ok(previous, "publish must not add new CapabilityContract artifacts");
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 14: publication does not mutate .rekon/capability-contracts.json ----------

test("publication generation does not mutate .rekon/capability-contracts.json", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    const configPath = join(work, ".rekon/capability-contracts.json");
    const before = await readFile(configPath, "utf8");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = await readFile(configPath, "utf8");
    assert.equal(after, before);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 15: publication does not mutate CapabilityMap ----------

test("publication generation does not mutate CapabilityMap", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeMaps = before.filter((e) => e.type === "CapabilityMap");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterMaps = after.filter((e) => e.type === "CapabilityMap");
    assert.equal(afterMaps.length, beforeMaps.length);
    for (const entry of afterMaps) {
      const previous = beforeMaps.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 16: publication does not mutate CapabilityPhraseReport ----------

test("publication generation does not mutate CapabilityPhraseReport", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforePhrase = before.filter((e) => e.type === "CapabilityPhraseReport");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterPhrase = after.filter((e) => e.type === "CapabilityPhraseReport");
    assert.equal(afterPhrase.length, beforePhrase.length);
    for (const entry of afterPhrase) {
      const previous = beforePhrase.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 17: publication does not mutate EvidenceGraph ----------

test("publication generation does not mutate EvidenceGraph", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    const indexPath = join(work, ".rekon/registry/artifacts.index.json");
    const before = JSON.parse(await readFile(indexPath, "utf8"));
    const beforeGraphs = before.filter((e) => e.type === "EvidenceGraph");
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const after = JSON.parse(await readFile(indexPath, "utf8"));
    const afterGraphs = after.filter((e) => e.type === "EvidenceGraph");
    assert.equal(afterGraphs.length, beforeGraphs.length);
    for (const entry of afterGraphs) {
      const previous = beforeGraphs.find((other) => other.id === entry.id);
      assert.ok(previous);
      assert.equal(entry.digest, previous.digest);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- 18: proof-report deferral documented ----------

test("proof report surfacing is explicitly deferred in docs", async () => {
  const conceptPath = join(repoRoot, "docs/concepts/capability-contracts.md");
  const proofReportConceptPath = join(repoRoot, "docs/concepts/proof-report-publication.md");
  const proofReportArtifactPath = join(repoRoot, "docs/artifacts/proof-report-publication.md");
  // Collapse whitespace so cross-line deferral phrasing
  // ("remains\n**deferred**") still matches.
  const normalise = (text) => text.replace(/\s+/g, " ").toLowerCase();
  const candidates = [
    conceptPath,
    proofReportConceptPath,
    proofReportArtifactPath,
  ];
  let found = false;
  for (const path of candidates) {
    let raw;
    try {
      raw = await readFile(path, "utf8");
    } catch {
      continue;
    }
    const text = normalise(raw);
    if (
      /proof[- ]?report[^.]*defer|defer[^.]*proof[- ]?report/.test(text)
      && /capabilitycontract/.test(text)
    ) {
      found = true;
      break;
    }
  }
  assert.ok(
    found,
    "at least one publication-surfacing doc must explicitly defer proof-report surfacing of CapabilityContract",
  );
});

// ---------- 19: artifacts validate clean ----------

test("rekon artifacts validate stays clean after publication surfacing", async () => {
  const work = await setupWorkspaceWithContract();
  try {
    runCli(work, ["publish", "architecture", "--json"]);
    runCli(work, ["publish", "agent-contract", "--json"]);
    const validate = runCli(work, ["artifacts", "validate", "--json"]);
    const payload = JSON.parse(validate.stdout);
    assert.ok(Array.isArray(payload.issues));
    assert.equal(payload.issues.length, 0);
    assert.equal(payload.valid, true);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
});

// ---------- Helpers ----------

function contractEntry(overrides = {}) {
  const base = {
    id: `rule-${overrides.verb ?? "create"}-${overrides.noun ?? "user"}`,
    status: overrides.status ?? "configured",
    match: {
      verb: overrides.verb ?? "create",
      noun: overrides.noun ?? "user",
    },
  };
  if (base.status === "configured") {
    base.capabilityRef = {
      capabilityMapRef: CAPABILITY_MAP_REF,
      phraseCapabilityId: `capability-phrase:${base.id}`,
    };
  }
  if (overrides.id) base.id = overrides.id;
  if (overrides.domain) base.match.domain = overrides.domain;
  if (overrides.layer) base.match.layer = overrides.layer;
  if (overrides.requiredChecks) base.requiredChecks = overrides.requiredChecks;
  if (overrides.allowedLayers) base.allowedLayers = overrides.allowedLayers;
  if (overrides.preservationRules) base.preservationRules = overrides.preservationRules;
  return base;
}

function makeContract(contracts, overrides = {}) {
  const summary = overrides.summary ?? {
    total: contracts.length,
    configured: contracts.filter((c) => c.status === "configured").length,
    suggested: 0,
    unmatched: contracts.filter((c) => c.status === "unmatched").length,
    withRequiredChecks: contracts.filter((c) => Array.isArray(c.requiredChecks) && c.requiredChecks.length > 0).length,
    withPlacementRules: contracts.filter((c) =>
      (Array.isArray(c.allowedLayers) && c.allowedLayers.length > 0)
      || (Array.isArray(c.forbiddenLayers) && c.forbiddenLayers.length > 0)
      || (Array.isArray(c.allowedSystems) && c.allowedSystems.length > 0)
      || (Array.isArray(c.forbiddenSystems) && c.forbiddenSystems.length > 0)).length,
    withPreservationRules: contracts.filter((c) => Array.isArray(c.preservationRules) && c.preservationRules.length > 0).length,
  };
  return {
    header: {
      artifactType: "CapabilityContract",
      artifactId: "contract-test",
      schemaVersion: "0.1.0",
      generatedAt: "2026-05-27T00:00:00Z",
      subject: { repoId: "/tmp/test" },
      producer: { id: "@rekon/cli", version: "0.1.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
    },
    source: {
      configPath: ".rekon/capability-contracts.json",
      capabilityMapRef: CAPABILITY_MAP_REF,
    },
    summary,
    contracts,
  };
}

async function setupWorkspaceWithContract() {
  const work = await mkdtemp(join(tmpdir(), "rekon-contract-pub-"));
  await cp(exampleRoot, work, { recursive: true });
  await rm(join(work, ".rekon"), { recursive: true, force: true });
  runCli(work, ["init"]);
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
  runCli(work, ["capability", "ontology", "normalize", "--json"]);
  const reportRef = runCli(work, [
    "artifacts",
    "latest",
    "--type",
    "CapabilityNormalizationReport",
    "--id-only",
  ]).stdout.trim();
  runCli(work, [
    "capability",
    "phrase",
    "project",
    "--report",
    reportRef,
    "--json",
  ]);
  runCli(work, ["refresh", "--skip-publish", "--skip-freshness"]);
  await mkdir(join(work, ".rekon"), { recursive: true });
  await writeFile(
    join(work, ".rekon/capability-contracts.json"),
    JSON.stringify(
      {
        version: "0.1.0",
        contracts: [
          {
            id: "fixture.create-user",
            match: { verb: "create", noun: "user" },
            allowedLayers: ["domain"],
            forbiddenLayers: ["route"],
            requiredChecks: ["npm run test"],
            preservationRules: ["Preserve create-user behavior."],
          },
          {
            id: "fixture.unmatched",
            match: { verb: "ship", noun: "rocket" },
            requiredChecks: ["npm test"],
          },
        ],
      },
      null,
      2,
    ),
  );
  runCli(work, ["capability", "contract", "generate", "--json"]);
  return work;
}

async function loadLatestPublication(work, kind) {
  const indexPath = join(work, ".rekon/registry/artifacts.index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const entries = index.filter((entry) =>
    entry.type === "Publication" && typeof entry.path === "string"
    && entry.path.includes(`Publication-${kind}-`));
  if (entries.length === 0) {
    throw new Error(`no ${kind} publication found`);
  }
  const latest = entries.sort((a, b) => a.writtenAt.localeCompare(b.writtenAt)).at(-1);
  return JSON.parse(await readFile(join(work, latest.path), "utf8"));
}

function runCli(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync(process.execPath, [cliPath, "--root", cwd, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `CLI failed: ${args.join(" ")}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`,
    );
  }
  return result;
}
