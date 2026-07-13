import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import capability, { jsTsProvider } from "../dist/index.js";

test("built-in capability uses defineCapability-compatible manifest", () => {
  assert.equal(capability.manifest.id, "@rekon/capability-js-ts");
  assert.deepEqual(capability.manifest.roles, ["evidence-provider"]);
  assert.deepEqual(capability.manifest.produces, ["EvidenceGraph"]);
});

test("JS/TS provider emits facts with provenance and ignores generated directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, ".rekon"), { recursive: true });
    await writeFile(join(root, "src", "index.ts"), [
      "import { helper } from './helper';",
      "export function greet(name: string) {",
      "  return helper(name);",
      "}",
      "export { helper };",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "helper.ts"), "export const helper = (value: string) => value;\n", "utf8");
    await writeFile(join(root, ".rekon", "ignored.ts"), "export const ignored = true;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
    });
    const kinds = new Set(facts.map((fact) => fact.kind));

    assert.equal(kinds.has("file"), true);
    assert.equal(kinds.has("import"), true);
    assert.equal(kinds.has("export"), true);
    assert.equal(kinds.has("symbol"), true);
    assert.equal(kinds.has("ownership_hint"), true);
    assert.equal(kinds.has("capability_hint"), true);
    assert.equal(
      facts.filter((fact) => fact.kind === "ownership_hint").every((fact) => fact.value.basis === "inferred"),
      true,
    );
    assert.equal(
      facts.filter((fact) => fact.kind === "file").every((fact) => typeof fact.value.digest === "string"),
      true,
    );
    assert.equal(facts.some((fact) => fact.subject.includes(".rekon")), false);
    assert.equal(facts.every((fact) => fact.provenance.pack === "@rekon/capability-js-ts"), true);
    assert.equal(facts.every((fact) => fact.provenance.extractorVersion === "0.1.0"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider supports changed-files incremental input", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "one.ts"), "export const one = 1;\n", "utf8");
    await writeFile(join(root, "src", "two.ts"), "export const two = 2;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
      incremental: true,
      changedFiles: ["src/two.ts"],
    });

    assert.equal(facts.some((fact) => fact.subject === "src/two.ts"), true);
    assert.equal(facts.some((fact) => fact.subject === "src/one.ts"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits stable compiler diagnostics and excludes dependency-resolution noise", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-diagnostics-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" },
      include: ["src/**/*.ts"],
    }), "utf8");
    await writeFile(join(root, "src", "index.ts"), [
      "import { missing } from 'not-installed';",
      "export const value: string = 42;",
      "export const result = missing;",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const diagnostics = facts.filter((fact) => fact.kind === "typescript:diagnostic");

    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].value.code, 2322);
    assert.equal(diagnostics[0].value.phase, "semantic");
    assert.equal(diagnostics[0].value.line, 2);
    assert.equal(diagnostics[0].provenance.file, "src/index.ts");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits AST-backed source quality signals", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-quality-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "quality.ts"), [
      "function inspect(input?: { value: string }) {",
      "  const unsafe = input as any;",
      "  const required = input!.value;",
      "  try { use(unsafe); } catch {}",
      "  try { use(required); } catch (error) { console.error(error); }",
      "}",
      "function pending() { throw new Error('Not implemented'); }",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const signals = facts
      .filter((fact) => fact.kind === "typescript:source-quality")
      .map((fact) => fact.value.signal)
      .sort();

    assert.deepEqual(signals, [
      "as_any_assertion",
      "catch_only_logs",
      "empty_catch",
      "non_null_assertion",
      "placeholder_throw",
    ]);
    assert.equal(facts.filter((fact) => fact.kind === "typescript:source-quality").every((fact) => fact.provenance.line > 0), true);
    assert.equal(facts.some((fact) => fact.kind === "content_signal" && fact.value.signal === "consoleLogging"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("console calls outside catch blocks remain governed content signals", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-console-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "console.ts"), "console.warn('visible');\n", "utf8");
    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    assert.equal(facts.some((fact) => fact.kind === "content_signal" && fact.value.signal === "consoleLogging"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("console calls in a catch that rethrows remain governed content signals", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-console-rethrow-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "console.ts"), "try { work(); } catch (error) { console.error(error); throw error; }\n", "utf8");
    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    assert.equal(facts.some((fact) => fact.kind === "content_signal" && fact.value.signal === "consoleLogging"), true);
    assert.equal(facts.some((fact) => fact.kind === "typescript:source-quality" && fact.value.signal === "catch_only_logs"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits package, lifecycle, route, screen, and test evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-conventions-"));
  try {
    await mkdir(join(root, "app", "api", "users"), { recursive: true });
    await mkdir(join(root, "app", "(marketing)", "about"), { recursive: true });
    await mkdir(join(root, "pages", "api"), { recursive: true });
    await mkdir(join(root, "tests", "integration"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "convention-fixture",
      version: "1.0.0",
      type: "module",
      scripts: {
        build: "tsc",
        dev: "next dev",
        test: "node --test",
        "test:integration": "node --test tests/integration",
        typecheck: "tsc --noEmit",
      },
    }), "utf8");
    await writeFile(join(root, "app", "api", "users", "route.ts"), [
      "export function GET() { return Response.json([]); }",
      "export function POST() { return Response.json({}); }",
    ].join("\n"), "utf8");
    await writeFile(join(root, "app", "(marketing)", "about", "page.tsx"), "export default function Page() { return <main>About</main>; }\n", "utf8");
    await writeFile(join(root, "pages", "api", "legacy.ts"), "export default function handler() {}\n", "utf8");
    await writeFile(join(root, "pages", "index.tsx"), "export default function Home() { return <main>Home</main>; }\n", "utf8");
    await writeFile(join(root, "tests", "integration", "user.test.ts"), "import test from 'node:test'; test('works', () => {});\n", "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
    const manifest = facts.find((fact) => fact.kind === "manifest");
    const targets = facts.filter((fact) => fact.kind === "build_target");
    const routes = facts.filter((fact) => fact.kind === "route");
    const screens = facts.filter((fact) => fact.kind === "screen");
    const tests = facts.filter((fact) => fact.kind === "test");

    assert.equal(manifest.value.name, "convention-fixture");
    assert.deepEqual(targets.map((fact) => fact.value.name).sort(), ["build", "test", "test:integration", "typecheck"]);
    assert.deepEqual(routes.map((fact) => fact.value.routePath).sort(), ["/api/legacy", "/api/users"]);
    assert.deepEqual(routes.find((fact) => fact.value.routePath === "/api/users").value.methods, ["GET", "POST"]);
    assert.deepEqual(screens.map((fact) => fact.value.routePath).sort(), ["/", "/about"]);
    assert.equal(tests.length, 1);
    assert.equal(tests[0].value.framework, "node-test");
    assert.equal(tests[0].value.testKind, "integration");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits resolved calls, dynamic imports, and explicit entry points", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-call-graph-"));
  try {
    await mkdir(join(root, "src", "workers"), { recursive: true });
    await mkdir(join(root, "app", "api", "users"), { recursive: true });
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "call-fixture",
      main: "./dist/index.js",
      exports: { ".": "./dist/index.js" },
      bin: { fixture: "./dist/cli.js" },
    }), "utf8");
    await writeFile(join(root, "src", "index.ts"), [
      "import { serve } from './service.js';",
      "export function main() { serve(); }",
      "export async function lazy() { return import('./lazy.js'); }",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "cli.ts"), "#!/usr/bin/env node\nimport { main } from './index.js'; main();\n", "utf8");
    await writeFile(join(root, "src", "service.ts"), [
      "import * as prisma from '@prisma/client';",
      "export function serve() { events.emit('user.loaded'); return prisma.user.findMany(); }",
      "export function guarded() { try { return serve(); } catch (error) { throw error; } }",
      "export class Service { load() { return this.read(); } read() { return 1; } }",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "lazy.ts"), "export const lazy = true;\n", "utf8");
    await writeFile(join(root, "src", "workers", "mail.worker.ts"), "export function run() {}\n", "utf8");
    await writeFile(join(root, "app", "api", "users", "route.ts"), "import { serve } from '../../../src/service.js'; export function GET() { return serve(); }\n", "utf8");
    await writeFile(join(root, "tests", "service.test.ts"), "import { serve } from '../src/service.js'; serve();\n", "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
    const calls = facts.filter((fact) => fact.kind === "call");
    const entries = facts.filter((fact) => fact.kind === "entry_point");
    const dynamicImport = facts.find((fact) => fact.kind === "import" && fact.value.importKind === "dynamic");

    assert.ok(calls.some((fact) => fact.value.caller === "main" && fact.value.targetFile === "src/service.ts" && fact.value.targetSymbol === "serve"));
    assert.ok(calls.some((fact) => fact.value.caller === "Service.load" && fact.value.targetSymbol === "Service.read" && fact.value.resolution === "this-method"));
    assert.ok(calls.some((fact) => fact.value.source === "app/api/users/route.ts" && fact.value.caller === "GET" && fact.value.targetFile === "src/service.ts"));
    assert.equal(dynamicImport.value.resolvedTarget, "src/lazy.ts");
    assert.ok(facts.some((fact) => fact.kind === "event_flow" && fact.value.eventName === "user.loaded" && fact.value.action === "emit"));
    assert.ok(facts.some((fact) => fact.kind === "state_access" && fact.value.package === "@prisma/client" && fact.value.operation === "user.findMany"));
    assert.ok(facts.some((fact) => fact.kind === "error_flow" && fact.value.caller === "guarded" && fact.value.action === "rethrow"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "package" && fact.value.path === "src/index.ts"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "cli" && fact.value.path === "src/cli.ts"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "route" && fact.value.path === "app/api/users/route.ts"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "worker" && fact.value.path === "src/workers/mail.worker.ts"));
    assert.ok(entries.some((fact) => fact.value.entryKind === "test" && fact.value.path === "tests/service.test.ts"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider resolves declared workspace exports, aliases, and re-export chains", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-workspace-exports-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "packages", "core", "src", "features"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({ workspaces: ["packages/*"] }), "utf8");
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: { baseUrl: ".", paths: { "@app/*": ["src/*"] } },
    }), "utf8");
    await writeFile(join(root, "packages", "core", "package.json"), JSON.stringify({
      name: "@fixture/core",
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        "./features/*": { types: "./dist/features/*.d.ts", import: "./dist/features/*.js" },
      },
    }), "utf8");
    await writeFile(join(root, "packages", "core", "src", "index.ts"), "export { feature } from './features/one.js';\n", "utf8");
    await writeFile(join(root, "packages", "core", "src", "features", "one.ts"), "export const feature = 1;\n", "utf8");
    await writeFile(join(root, "packages", "core", "src", "private.ts"), "export const privateValue = 1;\n", "utf8");
    await writeFile(join(root, "src", "local.ts"), "export const local = true;\n", "utf8");
    await writeFile(join(root, "src", "app.ts"), [
      "import { feature as rootFeature } from '@fixture/core';",
      "import { feature } from '@fixture/core/features/one';",
      "import { privateValue } from '@fixture/core/private';",
      "import { local } from '@app/local';",
      "export const result = [rootFeature, feature, privateValue, local];",
    ].join("\n"), "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const imports = facts.filter((fact) => fact.kind === "import_specifier" && fact.value.source === "src/app.ts");
    assert.equal(imports.find((fact) => fact.value.target === "@fixture/core").value.resolvedTarget, "packages/core/src/index.ts");
    assert.equal(imports.find((fact) => fact.value.target === "@fixture/core/features/one").value.resolvedTarget, "packages/core/src/features/one.ts");
    assert.equal(imports.find((fact) => fact.value.target === "@fixture/core/private").value.resolvedTarget, undefined);
    assert.equal(imports.find((fact) => fact.value.target === "@app/local").value.resolvedTarget, "src/local.ts");
    assert.equal(facts.find((fact) => fact.kind === "reexport" && fact.value.source === "packages/core/src/index.ts").value.resolvedTarget, "packages/core/src/features/one.ts");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider emits deterministic Express, Nest, and Vite framework evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-frameworks-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "package.json"), JSON.stringify({
      scripts: { dev: "vite" },
      dependencies: { express: "*", "@nestjs/common": "*", "@nestjs/core": "*" },
      devDependencies: { vite: "*" },
    }), "utf8");
    await writeFile(join(root, "src", "server.ts"), [
      "import express, { Router } from 'express';",
      "const app = express();",
      "const router = Router();",
      "app.get('/users', listUsers);",
      "router.post('/users', handlers.create);",
      "app.listen(3000);",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "controller.ts"), [
      "import { Controller as ApiController, Get as Read, Post } from '@nestjs/common';",
      "@ApiController('accounts')",
      "export class AccountsController {",
      "  @Read(':id') read() {}",
      "  @Post() create() {}",
      "}",
    ].join("\n"), "utf8");
    await writeFile(join(root, "src", "main.ts"), [
      "import { NestFactory as Factory } from '@nestjs/core';",
      "async function bootstrap() { return Factory.create(class AppModule {}); }",
      "bootstrap();",
    ].join("\n"), "utf8");
    await writeFile(join(root, "vite.config.ts"), "export default {};\n", "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const routes = facts.filter((fact) => fact.kind === "route");
    const entries = facts.filter((fact) => fact.kind === "entry_point");
    assert.ok(routes.some((fact) => fact.value.framework === "express" && fact.value.routePath === "/users" && fact.value.methods[0] === "GET" && fact.value.handler === "listUsers"));
    assert.ok(routes.some((fact) => fact.value.framework === "express" && fact.value.methods[0] === "POST" && fact.value.handler === "handlers.create"));
    assert.ok(routes.some((fact) => fact.value.framework === "nestjs" && fact.value.routePath === "/accounts/:id" && fact.value.handler === "AccountsController.read"));
    assert.ok(routes.some((fact) => fact.value.framework === "nestjs" && fact.value.routePath === "/accounts" && fact.value.methods[0] === "POST"));
    assert.ok(entries.some((fact) => fact.value.framework === "express" && fact.value.path === "src/server.ts"));
    assert.ok(entries.some((fact) => fact.value.framework === "nestjs" && fact.value.path === "src/main.ts"));
    assert.ok(entries.some((fact) => fact.value.framework === "vite" && fact.value.path === "src/main.ts"));
    assert.ok(entries.some((fact) => fact.value.framework === "vite" && fact.value.path === "vite.config.ts"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider honors includeTests", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-test-scope-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "src", "index.ts"), "export const source = true;\n", "utf8");
    await writeFile(join(root, "tests", "index.test.ts"), "test.only('focused', () => {});\n", "utf8");

    const excluded = await jsTsProvider.extract({ repoRoot: root, includeTests: false });
    const included = await jsTsProvider.extract({ repoRoot: root, includeTests: true });
    assert.equal(excluded.some((fact) => fact.subject.includes("index.test.ts")), false);
    assert.equal(included.some((fact) => fact.kind === "test" && fact.subject === "tests/index.test.ts"), true);
    assert.equal(included.some((fact) => fact.kind === "typescript:source-quality" && fact.value.signal === "focused_test"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider refreshes repository diagnostics during incremental observe", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-diagnostics-incremental-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "tsconfig.json"), JSON.stringify({ include: ["src/**/*.ts"] }), "utf8");
    await writeFile(join(root, "src", "index.ts"), "export const value: string = 42;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
      incremental: true,
      changedFiles: ["src/index.ts"],
    });

    assert.equal(facts.some((fact) => fact.kind === "typescript:diagnostic"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("JS/TS provider rejects changed-files inputs outside the repo root", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-"));
  const outside = await mkdtemp(join(tmpdir(), "rekon-js-ts-outside-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "inside.ts"), "export const inside = 1;\n", "utf8");
    await writeFile(join(outside, "outside.ts"), "export const outside = 1;\n", "utf8");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
      incremental: true,
      changedFiles: [
        "src/inside.ts",
        relative(root, join(outside, "outside.ts")),
      ],
    });

    assert.equal(facts.some((fact) => fact.subject === "src/inside.ts"), true);
    assert.equal(facts.some((fact) => fact.subject.includes("outside.ts")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("JS/TS provider skips runtime dirs and symlink cycles during source walk", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-walk-"));

  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "index.ts"), "export const value = 1;\n", "utf8");

    await mkdir(join(root, ".circe", "workspaces"), { recursive: true });
    await writeFile(join(root, ".circe", "workspaces", "ignored.ts"), "export const ignoredCirce = true;\n", "utf8");
    await symlink(root, join(root, ".circe", "workspaces", "link-to-root"), "dir");

    await mkdir(join(root, ".rekon", "intent", "plans", "fixture"), { recursive: true });
    await writeFile(join(root, ".rekon", "intent", "plans", "fixture", "ignored.ts"), "export const ignoredRekon = true;\n", "utf8");

    await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
    await writeFile(join(root, "node_modules", "pkg", "ignored.ts"), "export const ignoredNodeModules = true;\n", "utf8");

    await symlink(join(root, "src"), join(root, "src-link"), "dir");
    await symlink(join(root, "missing-target"), join(root, "broken-link"), "file");

    const facts = await jsTsProvider.extract({
      repoRoot: root,
      includeTests: false,
    });
    const fileSubjects = facts
      .filter((fact) => fact.kind === "file")
      .map((fact) => fact.subject);

    assert.deepEqual(fileSubjects, ["src/index.ts"]);
    assert.equal(facts.some((fact) => fact.subject.includes(".circe")), false);
    assert.equal(facts.some((fact) => fact.subject.includes(".rekon")), false);
    assert.equal(facts.some((fact) => fact.subject.includes("node_modules")), false);
    assert.equal(facts.some((fact) => fact.subject.includes("src-link")), false);
    assert.equal(facts.some((fact) => fact.subject.includes("broken-link")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("extract completes on a single generated file emitting >100k facts (per-file spread-overflow regression)", async () => {
  // Same WO-2 failure class as the runtime site, one layer down: the
  // per-file `facts.push(...astFacts)` spread overflows when one generated
  // module alone emits more facts than the V8 argument ceiling (~10^5).
  // 60k exports produce >120k facts (export + symbol per declaration), which
  // crashed the pre-fix spread; the fixed appendFacts path must complete.
  const root = await mkdtemp(join(tmpdir(), "rekon-js-ts-scale-"));

  try {
    const EXPORTS = 60_000;
    const lines = [];

    for (let index = 0; index < EXPORTS; index += 1) {
      lines.push(`export const generatedValue${index} = ${index};`);
    }

    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "huge.ts"), `${lines.join("\n")}\n`, "utf8");

    const facts = await jsTsProvider.extract({ repoRoot: root, includeTests: false });

    assert.ok(facts.length > 100_000, `expected >100k facts from the generated module, got ${facts.length}`);
    assert.ok(facts.some((fact) => fact.kind === "file" && fact.subject === "src/huge.ts"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("extract is deterministic run-to-run on the simple-js-ts example fixture", async () => {
  // Determinism guard for the WO-2 fix: appending facts one-by-one must not
  // change fact content or order relative to a second identical run.
  const exampleRoot = join(import.meta.dirname, "../../../examples/simple-js-ts");
  const first = await jsTsProvider.extract({ repoRoot: exampleRoot, includeTests: false });
  const second = await jsTsProvider.extract({ repoRoot: exampleRoot, includeTests: false });

  assert.ok(first.length > 0, "example fixture should produce facts");
  assert.deepEqual(second, first);
});
