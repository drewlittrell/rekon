import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const cli = resolve("packages/cli/dist/index.js");

test("CLI compiles committed repository law into indexed artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-contract-compile-"));
  await mkdir(join(root, "packages", "intelligence"), { recursive: true });
  await writeFile(join(root, "packages", "intelligence", "rekon.contract.json"), JSON.stringify({
    version: "1.0.0",
    sourceId: "example.intelligence",
    systems: [{
      id: "intelligence",
      systemId: "intelligence",
      scope: { paths: ["packages/intelligence/**"] },
      purpose: "Compose meaning.",
      invariants: [{ id: "compositional", statement: "Compose meaning from atoms." }],
    }],
  }));

  const output = JSON.parse(execFileSync(process.execPath, [cli, "contracts", "compile", "--root", root, "--json"], { encoding: "utf8" }));

  assert.equal(output.valid, true);
  assert.equal(output.contracts.length, 1);
  assert.equal(output.contracts[0].type, "SystemContract");
  assert.equal(output.registry.type, "EffectiveContractRegistry");
  assert.equal(output.summary.byAuthority.adopted, 1);
});
