import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const nodeTests = findTests(join(root, "test"), ".test.ts");
const pythonPath = [
  join(root, "services/audit_archive_py"),
  join(root, "services/search_py"),
].join(delimiter);

run(process.execPath, ["--experimental-strip-types", "--test", ...nodeTests]);
run("python3", ["-m", "unittest", "discover", "-s", "services/audit_archive_py/tests", "-p", "test_*.py"], {
  PYTHONPATH: pythonPath,
});
run("python3", ["-m", "unittest", "discover", "-s", "services/search_py/tests", "-p", "test_*.py"], {
  PYTHONPATH: pythonPath,
});

function findTests(directory, suffix) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
