import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("notification-suppression oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:mixed.",
  });
} else {
  test("opted-out and unauthorized contacts never reach the delivery gateway", () => {
    const script = String.raw`
from notifications.delivery_service import DeliveryService

class Repository:
    def __init__(self, contact): self.contact = contact
    def find_contact(self, contact_id): return None if contact_id == "missing" else self.contact
class Policy:
    def __init__(self, authorized=True): self.authorized = authorized
    def can_manage(self, actor_id, contact): return self.authorized
    def is_opted_out(self, contact): return contact["opted_out"]
class Gateway:
    def __init__(self): self.sent = []
    def send(self, address, message): self.sent.append((address, message))

contact = {"id": "contact-1", "address": "ari@example.test", "opted_out": True}
gateway = Gateway()
service = DeliveryService(Repository(contact), Policy(), gateway)
assert service.deliver("admin-1", "contact-1", "hello") == {"status": "suppressed"}
assert gateway.sent == []

gateway = Gateway()
service = DeliveryService(Repository({**contact, "opted_out": False}), Policy(False), gateway)
try:
    service.deliver("member-1", "contact-1", "hello")
except ValueError as error:
    assert str(error) == "not-authorized"
else:
    raise AssertionError("unauthorized delivery did not fail")
assert gateway.sent == []

gateway = Gateway()
service = DeliveryService(Repository(contact), Policy(), gateway)
try:
    service.deliver("admin-1", "missing", "hello")
except ValueError as error:
    assert str(error) == "contact-not-found"
else:
    raise AssertionError("missing contact did not fail")
assert gateway.sent == []
`;
    const result = spawnSync("python3", ["-c", script], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONPATH: [join(repoRoot, "services/notifications_py"), process.env.PYTHONPATH]
          .filter(Boolean)
          .join(delimiter),
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
