import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const repoRoot = process.env.REKON_EVAL_REPO_ROOT;

if (!repoRoot) {
  test("cancellation-source oracle runs only inside the isolated eval repository", {
    skip: "Run through eval:model-interface:mixed.",
  });
} else {
  test("TypeScript producer and Python audit consumer agree on fraud-review", async () => {
    const { cancellationEvent } = await import(pathToFileURL(join(
      repoRoot,
      "apps/order-worker/src/cancellation-publisher.ts",
    )));
    assert.deepEqual(cancellationEvent("order-1", "fraud-review"), {
      type: "order.cancelled",
      orderId: "order-1",
      source: "fraud-review",
    });
    assert.throws(
      () => cancellationEvent("order-1", "unknown"),
      /invalid-cancellation-source/u,
    );

    const script = String.raw`
from audit.order_events import record_order_cancellation

event = {"type": "order.cancelled", "orderId": "order-1", "source": "fraud-review"}
assert record_order_cancellation(event) == {
    "action": "order.cancelled",
    "subject": "order-1",
    "source": "fraud-review",
}
try:
    record_order_cancellation({**event, "source": "unknown"})
except ValueError as error:
    assert str(error) == "invalid-cancellation-source"
else:
    raise AssertionError("unknown source did not fail")
`;
    const result = spawnSync("python3", ["-c", script], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONPATH: [join(repoRoot, "services/audit_py"), process.env.PYTHONPATH]
          .filter(Boolean)
          .join(delimiter),
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
