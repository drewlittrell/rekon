import { isAbsolute } from "node:path";

const INPUT_SPECS = Object.freeze({
  junit: { command: ["checks", "ingest", "--junit"], artifactType: "TestReport" },
  "eslint-json": { command: ["checks", "ingest", "--eslint-json"], artifactType: "LintReport" },
  sarif: { command: ["security", "ingest", "--sarif"], artifactType: "SecurityScanReport" },
  "npm-audit": { command: ["security", "ingest", "--npm-audit"], artifactType: "DependencyAuditReport" },
  "pnpm-audit": { command: ["security", "ingest", "--pnpm-audit"], artifactType: "DependencyAuditReport" },
  "yarn-audit": { command: ["security", "ingest", "--yarn-audit"], artifactType: "DependencyAuditReport" },
  osv: { command: ["security", "ingest", "--osv"], artifactType: "DependencyAuditReport" },
  "istanbul-coverage": { command: ["runtime", "graph", "observe", "--istanbul-coverage"], artifactType: "RuntimeGraphObservationReport" },
  "lcov-coverage": { command: ["runtime", "graph", "observe", "--lcov-coverage"], artifactType: "RuntimeGraphObservationReport" },
});

const COVERAGE_KINDS = new Set(["istanbul-coverage", "lcov-coverage"]);
const COMMON_FIELDS = new Set(["kind", "path", "verificationRun"]);

export function validateCorpusEvidenceInputs(value, label = "corpus repo evidenceInputs") {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`classic-parity-bench: ${label} must be an array.`);
  }

  const normalized = [];
  const seen = new Set();

  for (const [index, candidate] of value.entries()) {
    const entryLabel = `${label}[${index}]`;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new Error(`classic-parity-bench: ${entryLabel} must be an object.`);
    }

    const kind = typeof candidate.kind === "string" ? candidate.kind : "";
    const spec = INPUT_SPECS[kind];
    if (!spec) {
      throw new Error(
        `classic-parity-bench: ${entryLabel}.kind must be one of ${Object.keys(INPUT_SPECS).join(", ")}.`,
      );
    }

    const allowedFields = new Set(COMMON_FIELDS);
    if (kind === "npm-audit") allowedFields.add("packageLock");
    if (COVERAGE_KINDS.has(kind)) {
      allowedFields.add("testPath");
    }
    const unknownFields = Object.keys(candidate).filter((field) => !allowedFields.has(field));
    if (unknownFields.length > 0) {
      throw new Error(`classic-parity-bench: ${entryLabel} has unknown field(s): ${unknownFields.sort().join(", ")}.`);
    }

    const path = validateRepoRelativePath(candidate.path, `${entryLabel}.path`);
    const entry = { kind, path };

    if (kind === "npm-audit" && candidate.packageLock !== undefined) {
      entry.packageLock = validateRepoRelativePath(candidate.packageLock, `${entryLabel}.packageLock`);
    }

    if (candidate.verificationRun !== undefined) {
      if (
        typeof candidate.verificationRun !== "string"
        || (candidate.verificationRun !== "$capture" && !/^VerificationRun:[^\s]+$/u.test(candidate.verificationRun))
      ) {
        throw new Error(
          `classic-parity-bench: ${entryLabel}.verificationRun must be an explicit VerificationRun:<id> ref or $capture.`,
        );
      }
      entry.verificationRun = candidate.verificationRun;
    }

    if (COVERAGE_KINDS.has(kind)) {
      entry.testPath = validateRepoRelativePath(candidate.testPath, `${entryLabel}.testPath`);
      if (!entry.verificationRun) {
        throw new Error(
          `classic-parity-bench: ${entryLabel}.verificationRun must be an explicit VerificationRun:<id> ref or $capture.`,
        );
      }
    }

    const identity = JSON.stringify(entry);
    if (seen.has(identity)) {
      throw new Error(`classic-parity-bench: ${entryLabel} duplicates an earlier evidence input.`);
    }
    seen.add(identity);
    normalized.push(Object.freeze(entry));
  }

  return normalized;
}

export function evidenceInputCliArgs(input, root, options = {}) {
  const spec = INPUT_SPECS[input.kind];
  if (!spec) throw new Error(`classic-parity-bench: unknown evidence input kind "${input.kind}".`);

  const args = [...spec.command, input.path];
  if (input.kind === "npm-audit" && input.packageLock) {
    args.push("--package-lock", input.packageLock);
  }
  if (COVERAGE_KINDS.has(input.kind)) {
    args.push("--test-path", input.testPath);
  }
  if (input.verificationRun) {
    const verificationRun = input.verificationRun === "$capture"
      ? options.captureVerificationRun
      : input.verificationRun;
    if (!verificationRun) {
      throw new Error(
        `classic-parity-bench: evidence input ${input.kind}:${input.path} requires --capture-evidence to resolve $capture.`,
      );
    }
    args.push("--verification-run", verificationRun);
  }
  args.push("--root", root, "--json");
  return args;
}

export function evidenceInputArtifactType(kind) {
  return INPUT_SPECS[kind]?.artifactType;
}

export function validateRepoRelativePath(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`classic-parity-bench: ${label} must be a non-empty repository-relative path.`);
  }
  const path = value.trim().replace(/\\/gu, "/");
  const segments = path.split("/");
  if (
    path.includes("\0")
    || isAbsolute(path)
    || /^[A-Za-z]:\//u.test(path)
    || path.startsWith("/")
    || segments.includes("..")
    || segments.includes("")
  ) {
    throw new Error(`classic-parity-bench: ${label} must stay inside the corpus repository.`);
  }
  const normalized = segments.filter((segment) => segment !== ".").join("/");
  if (normalized.length === 0) {
    throw new Error(`classic-parity-bench: ${label} must name a file inside the corpus repository.`);
  }
  return normalized;
}
