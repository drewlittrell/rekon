import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { assertCapabilityConforms } from "@rekon/sdk";
import capability, {
  extractPythonImports,
  extractPythonSymbols,
  pythonProvider,
} from "../dist/index.js";

test("Python capability conforms to the public SDK contract", async () => {
  assert.equal(capability.manifest.id, "@rekon/capability-python");
  assert.deepEqual(capability.manifest.roles, ["evidence-provider"]);
  await assertCapabilityConforms(capability);
});

test("Python parser extracts imports and qualified symbols without executing source", () => {
  const source = [
    "from .policy import DeliveryPolicy",
    "import json as json_module",
    "class DeliveryService:",
    "    def deliver(self):",
    "        return True",
    "",
    "def create_service():",
    "    return DeliveryService()",
  ].join("\n");

  assert.deepEqual(extractPythonImports(source).map((entry) => [entry.module, entry.names]), [
    [".policy", ["DeliveryPolicy"]],
    ["json", []],
  ]);
  assert.deepEqual(extractPythonSymbols(source).map((entry) => [entry.qualifiedName, entry.kind]), [
    ["DeliveryService", "class"],
    ["DeliveryService.deliver", "method"],
    ["create_service", "function"],
  ]);
});

test("Python provider emits resolved source, test, and bounded injected-dependency evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-python-"));
  try {
    await mkdir(join(root, "services", "notifications", "tests"), { recursive: true });
    await mkdir(join(root, ".rekon"), { recursive: true });
    await mkdir(join(root, ".venv"), { recursive: true });
    await writeFile(join(root, "services", "notifications", "delivery_service.py"), [
      "class DeliveryService:",
      "    def __init__(self, repository, policy):",
      "        self.repository = repository",
      "        self.policy = policy",
      "",
      "    def deliver(self, contact_id):",
      "        contact = self.repository.find_contact(contact_id)",
      "        return self.policy.can_deliver(contact)",
    ].join("\n"), "utf8");
    await writeFile(join(root, "services", "notifications", "contact_repository.py"), [
      "class ContactRepository:",
      "    def find_contact(self, contact_id):",
      "        raise NotImplementedError",
    ].join("\n"), "utf8");
    await writeFile(join(root, "services", "notifications", "delivery_policy.py"), [
      "class DeliveryPolicy:",
      "    def can_deliver(self, contact):",
      "        raise NotImplementedError",
    ].join("\n"), "utf8");
    await writeFile(join(root, "services", "notifications", "tests", "test_delivery.py"), [
      "import unittest",
      "from notifications.delivery_service import DeliveryService",
    ].join("\n"), "utf8");
    await writeFile(join(root, ".rekon", "ignored.py"), "class Ignored: pass\n", "utf8");
    await writeFile(join(root, ".venv", "ignored.py"), "class Ignored: pass\n", "utf8");

    const facts = await pythonProvider.extract({ repoRoot: root, includeTests: true });
    const importFact = facts.find((fact) => (
      fact.kind === "import" && fact.subject.includes("test_delivery.py:notifications.delivery_service")
    ));
    const dependencies = facts.filter((fact) => fact.kind === "python:injected_dependency");

    assert.equal(importFact?.value.resolvedTarget, "services/notifications/delivery_service.py");
    assert.deepEqual(dependencies.map((fact) => fact.value.resolvedTarget).sort(), [
      "services/notifications/contact_repository.py",
      "services/notifications/delivery_policy.py",
    ]);
    assert.equal(facts.some((fact) => fact.kind === "test"), true);
    assert.equal(facts.some((fact) => fact.kind === "symbol" && fact.value.qualifiedName === "DeliveryService.deliver"), true);
    assert.equal(facts.some((fact) => String(fact.subject).includes(".rekon")), false);
    assert.equal(facts.some((fact) => String(fact.subject).includes(".venv")), false);
    assert.equal(facts.every((fact) => fact.provenance.pack === "@rekon/capability-python"), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Python provider restricts incremental paths to regular files inside the repository", async () => {
  const root = await mkdtemp(join(tmpdir(), "rekon-python-root-"));
  const outside = await mkdtemp(join(tmpdir(), "rekon-python-outside-"));
  try {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "inside.py"), "value = 1\n", "utf8");
    await writeFile(join(outside, "outside.py"), "value = 2\n", "utf8");
    await symlink(join(outside, "outside.py"), join(root, "src", "linked.py"));

    const facts = await pythonProvider.extract({
      repoRoot: root,
      includeTests: true,
      incremental: true,
      changedFiles: ["src/inside.py", "../outside.py", "src/linked.py"],
    });
    const files = facts.filter((fact) => fact.kind === "file").map((fact) => fact.value.path);
    assert.deepEqual(files, ["src/inside.py"]);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
