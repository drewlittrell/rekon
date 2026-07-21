import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadRepositoryContractSources, writeRepositoryContractSource } from "../dist/index.js";

function source(sourceId, systemId) {
  return {
    version: "1.0.0",
    sourceId,
    systems: [{
      id: `${systemId}-contract`,
      systemId,
      scope: { paths: [`packages/${systemId}/**`] },
      purpose: `Own ${systemId}.`,
      invariants: [{ id: `${systemId}.preserve`, statement: `Preserve ${systemId}.` }],
    }],
  };
}

test("contract source loader discovers co-located, central, and configured sources", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-contract-sources-"));
  await mkdir(join(root, "packages", "intelligence"), { recursive: true });
  await mkdir(join(root, "packages", "api"), { recursive: true });
  await mkdir(join(root, "rekon", "contracts"), { recursive: true });
  await writeFile(join(root, "packages", "intelligence", "rekon.contract.json"), JSON.stringify(source("intelligence", "intelligence")));
  await writeFile(join(root, "rekon", "contracts", "flow.json"), JSON.stringify({
    version: "1.0.0",
    sourceId: "flows",
    flows: [{
      id: "request-flow",
      name: "Request flow",
      criticality: "critical",
      purpose: "Serve a request.",
      userOutcomes: ["A response is returned."],
      completionConditions: ["Response serialized."],
      invariants: [{ id: "response-preserved", statement: "Preserve response semantics." }],
      stages: [{ id: "request" }, { id: "response" }],
      handoffs: [{ id: "response", fromStageId: "request", toStageId: "response", carriedInvariantIds: ["response-preserved"] }],
    }],
  }));
  await writeFile(join(root, "packages", "api", "policy.json"), JSON.stringify(source("api", "api")));
  await writeFile(join(root, "rekon.config.json"), JSON.stringify({ contracts: { sources: ["packages/api/policy.json"] } }));

  const result = await loadRepositoryContractSources({ repoRoot: root });

  assert.equal(result.valid, true);
  assert.deepEqual(result.sources.map((entry) => entry.path), [
    "packages/api/policy.json",
    "packages/intelligence/rekon.contract.json",
    "rekon/contracts/flow.json",
  ]);
  assert.ok(result.sources.every((entry) => /^[a-f0-9]{64}$/u.test(entry.digest)));
});

test("contract source loader rejects duplicate ids, traversal, generated paths, and symlinks", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "rekon-contract-source-safety-"));
  const outside = await mkdtemp(join(tmpdir(), "rekon-contract-source-outside-"));
  await mkdir(join(root, "a"), { recursive: true });
  await mkdir(join(root, "b"), { recursive: true });
  await writeFile(join(root, "a", "rekon.contract.json"), JSON.stringify(source("duplicate", "a")));
  await writeFile(join(root, "b", "rekon.contract.json"), JSON.stringify(source("duplicate", "b")));
  await writeFile(join(outside, "outside.json"), JSON.stringify(source("outside", "outside")));
  try {
    await symlink(join(outside, "outside.json"), join(root, "linked.json"));
  } catch (error) {
    if (error?.code === "EPERM") t.skip("symlink creation is unavailable");
    throw error;
  }

  const result = await loadRepositoryContractSources({
    repoRoot: root,
    configuredPaths: ["../outside.json", ".rekon/contracts.json", "linked.json"],
  });

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "contract_sources.duplicate_source_id"));
  assert.ok(result.issues.some((issue) => issue.code === "contract_sources.configured_path_invalid"));
  assert.ok(result.issues.some((issue) => issue.code === "contract_sources.configured_path_private"));
  assert.ok(result.issues.some((issue) => issue.code === "contract_sources.source_not_regular_file"));
});

test("contract source writer creates validated central law without overwriting", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-contract-source-write-"));
  const document = source("adopted.intelligence", "intelligence");
  const result = await writeRepositoryContractSource({
    repoRoot: root,
    path: "rekon/contracts/systems/intelligence.json",
    document,
  });

  assert.equal(result.path, "rekon/contracts/systems/intelligence.json");
  assert.match(result.digest, /^[a-f0-9]{64}$/u);
  const loaded = await loadRepositoryContractSources({ repoRoot: root });
  assert.equal(loaded.valid, true);
  assert.equal(loaded.sources[0].document.sourceId, "adopted.intelligence");
  await assert.rejects(writeRepositoryContractSource({
    repoRoot: root,
    path: result.path,
    document,
  }), /already exists/);
});

test("contract source writer rejects outside paths and symlinked central directories", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "rekon-contract-source-write-safety-"));
  const outside = await mkdtemp(join(tmpdir(), "rekon-contract-source-write-outside-"));
  await mkdir(join(root, "rekon"), { recursive: true });
  try {
    await symlink(outside, join(root, "rekon", "contracts"));
  } catch (error) {
    if (error?.code === "EPERM") t.skip("symlink creation is unavailable");
    throw error;
  }

  await assert.rejects(writeRepositoryContractSource({
    repoRoot: root,
    path: "../outside.json",
    document: source("outside", "outside"),
  }), /repository-relative|under rekon\/contracts/);
  await assert.rejects(writeRepositoryContractSource({
    repoRoot: root,
    path: "rekon/contracts/systems/outside.json",
    document: source("outside", "outside"),
  }), /must not be a symlink/);
});
