import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const nodeTests = readdirSync(join(root, "tests"))
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => join(root, "tests", name));
const pythonPath = [
  join(root, "services/reporting_py"),
  join(root, "services/notifications_py"),
  join(root, "services/audit_py"),
].join(delimiter);

run(process.execPath, ["--experimental-strip-types", "--test", ...nodeTests]);
run("python3", ["-m", "unittest", "discover", "-s", "services/reporting_py/tests", "-p", "test_*.py"], {
  PYTHONPATH: pythonPath,
});
run("python3", ["-m", "unittest", "discover", "-s", "services/notifications_py/tests", "-p", "test_*.py"], {
  PYTHONPATH: pythonPath,
});
run("python3", ["-m", "unittest", "discover", "-s", "services/audit_py/tests", "-p", "test_*.py"], {
  PYTHONPATH: pythonPath,
});

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
