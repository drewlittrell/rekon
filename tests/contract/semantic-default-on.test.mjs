// Models-on-by-default (operator ruling, 2026-07-09): `rekon scan` runs the
// semantic layer in `auto` mode by default; enablement is opt-OUT. This
// matrix exercises mode resolution (flag > --no-semantic > REKON_SEMANTIC >
// config semantic.mode > default auto), keyless graceful degradation, and
// the REKON_LLM_ENABLED opt-out. No test ever reaches the network: keys are
// stripped, and the one fake-key case is explicitly disabled.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const cli = join(repoRoot, "packages", "cli", "dist", "index.js");
const fixtureSrc = join(repoRoot, "examples", "simple-js-ts");

const baseEnv = { ...process.env };
delete baseEnv.OPENAI_API_KEY;
delete baseEnv.REKON_SEMANTIC;
delete baseEnv.REKON_LLM_ENABLED;
delete baseEnv.REKON_LLM_PROVIDER;
delete baseEnv.REKON_LLM_MODEL;

function freshFixture() {
  const dir = mkdtempSync(join(tmpdir(), "rekon-semantic-default-"));
  cpSync(fixtureSrc, dir, { recursive: true });
  return dir;
}

function scan(root, args = [], env = {}) {
  const stdout = execFileSync(process.execPath, [cli, "scan", "--root", root, "--json", ...args], {
    env: { ...baseEnv, ...env },
    encoding: "utf8",
  });
  return JSON.parse(stdout);
}

test("default is auto: keyless scan degrades gracefully with an honest summary", () => {
  const root = freshFixture();

  try {
    const out = scan(root);

    assert.equal(out.semanticFiles.mode, "auto");
    assert.equal(out.semanticFiles.providerAvailable, false);
    assert.equal(out.semanticFiles.written, 0);
    assert.equal(out.semanticFiles.failed, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("--no-semantic opts out", () => {
  const root = freshFixture();

  try {
    assert.equal(scan(root, ["--no-semantic"]).semanticFiles.mode, "off");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REKON_SEMANTIC=off opts out via env", () => {
  const root = freshFixture();

  try {
    assert.equal(scan(root, [], { REKON_SEMANTIC: "off" }).semanticFiles.mode, "off");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("config semantic.mode=off opts out via repo config", () => {
  const root = freshFixture();

  try {
    mkdirSync(join(root, ".rekon"), { recursive: true });
    writeFileSync(
      join(root, ".rekon", "config.json"),
      JSON.stringify({ capabilities: [], permissions: {}, semantic: { mode: "off" } }),
    );

    assert.equal(scan(root).semanticFiles.mode, "off");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the flag outranks the env opt-out", () => {
  const root = freshFixture();

  try {
    const out = scan(root, ["--semantic-files", "auto"], { REKON_SEMANTIC: "off" });

    // The explicit flag wins over the env opt-out. (Explicitly requested
    // auto keeps the documented keyless fallback-writing path, so there is
    // no providerAvailable short-circuit here - the mode is the assertion.)
    assert.equal(out.semanticFiles.mode, "auto");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REKON_LLM_ENABLED=false disables even when a key is present (opt-out beats key)", () => {
  const root = freshFixture();

  try {
    const out = scan(root, [], { OPENAI_API_KEY: "sk-test-never-used", REKON_LLM_ENABLED: "false" });

    assert.equal(out.semanticFiles.mode, "auto");
    assert.equal(out.semanticFiles.providerAvailable, false);
    assert.equal(out.semanticFiles.written, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("required without a key still fails clearly", () => {
  const root = freshFixture();

  try {
    assert.throws(() =>
      execFileSync(process.execPath, [cli, "scan", "--root", root, "--json", "--semantic-files", "required"], {
        env: baseEnv,
        encoding: "utf8",
      }),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
