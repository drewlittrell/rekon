import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { join, relative } from "node:path";

import { validateRepoRelativePath } from "./corpus-evidence-inputs.mjs";

const CAPTURE_FIELDS = new Set([
  "commands",
  "allowedWrites",
  "repetitions",
  "commandTimeoutMs",
  "timeoutMs",
  "maxLogBytes",
]);

const GENERATED_DIRECTORIES = new Set([
  ".git",
  ".rekon",
  ".cache",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

export function validateCorpusEvidenceCapture(value, label = "corpus repo evidenceCapture") {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`classic-parity-bench: ${label} must be an object.`);
  }

  const unknownFields = Object.keys(value).filter((field) => !CAPTURE_FIELDS.has(field));
  if (unknownFields.length > 0) {
    throw new Error(`classic-parity-bench: ${label} has unknown field(s): ${unknownFields.sort().join(", ")}.`);
  }

  if (!Array.isArray(value.commands) || value.commands.length === 0) {
    throw new Error(`classic-parity-bench: ${label}.commands must be a non-empty array.`);
  }
  const commands = value.commands.map((command, index) => {
    if (typeof command !== "string" || command.trim().length === 0) {
      throw new Error(`classic-parity-bench: ${label}.commands[${index}] must be a non-empty string.`);
    }
    return command.trim();
  });

  const allowedWrites = value.allowedWrites === undefined
    ? []
    : validateAllowedWrites(value.allowedWrites, `${label}.allowedWrites`);

  return Object.freeze({
    commands: Object.freeze(commands),
    allowedWrites: Object.freeze(allowedWrites),
    repetitions: value.repetitions === undefined
      ? 1
      : validateRepetitions(value.repetitions, `${label}.repetitions`),
    ...optionalPositiveInteger(value, "commandTimeoutMs", label),
    ...optionalPositiveInteger(value, "timeoutMs", label),
    ...optionalPositiveInteger(value, "maxLogBytes", label),
  });
}

export function createCorpusEvidenceVerificationPlan({ repoId, capture, generatedAt }) {
  const identity = createHash("sha256")
    .update(`${repoId}\n${capture.commands.join("\n")}`)
    .digest("hex")
    .slice(0, 24);

  return {
    header: {
      artifactType: "VerificationPlan",
      artifactId: `verification-plan-parity-evidence-${identity}`,
      schemaVersion: "0.1.0",
      generatedAt,
      subject: { repoId },
      producer: { id: "@rekon/bench.evidence-capture", version: "1.0.0" },
      inputRefs: [],
      freshness: { status: "fresh" },
      provenance: {
        confidence: 1,
        notes: [
          "Explicit private-corpus calibration plan.",
          "Execution is opt-in and delegated to Rekon's no-shell verification runner.",
        ],
      },
    },
    source: "detection-quality-calibration",
    commands: [...capture.commands],
    successCriteria: ["Capture repository-native evidence without modifying protected repository files."],
  };
}

export function snapshotProtectedCorpusTree(root, { evidenceInputs = [], allowedWrites = [] } = {}) {
  const excludedPaths = new Set([
    ...evidenceInputs.map((input) => normalizePath(input.path)),
    ...allowedWrites.map(normalizePath),
  ]);
  const entries = new Map();

  const walk = (directory) => {
    const children = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const child of children) {
      const absolutePath = join(directory, child.name);
      const relativePath = normalizePath(relative(root, absolutePath));
      if (isExcluded(relativePath, child.isDirectory(), excludedPaths)) continue;

      if (child.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (child.isSymbolicLink()) {
        entries.set(relativePath, createHash("sha256").update(`symlink:${readlinkSync(absolutePath)}`).digest("hex"));
        continue;
      }

      if (child.isFile()) {
        const stat = lstatSync(absolutePath);
        const digest = createHash("sha256")
          .update(`file:${stat.mode}:${stat.size}:`)
          .update(readFileSync(absolutePath))
          .digest("hex");
        entries.set(relativePath, digest);
      }
    }
  };

  walk(root);
  const digest = createHash("sha256");
  for (const [path, entryDigest] of entries) {
    digest.update(path).update("\0").update(entryDigest).update("\0");
  }

  return { digest: digest.digest("hex"), entries };
}

export function diffProtectedCorpusTrees(before, after) {
  const paths = [...new Set([...before.entries.keys(), ...after.entries.keys()])].sort();
  return paths.flatMap((path) => {
    const beforeDigest = before.entries.get(path);
    const afterDigest = after.entries.get(path);
    if (beforeDigest === afterDigest) return [];
    return [{
      path,
      change: beforeDigest === undefined ? "added" : afterDigest === undefined ? "removed" : "modified",
    }];
  });
}

export function isAcceptablePartialRefresh(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.validation?.valid !== true || value.freshness?.status !== "partial") return false;
  if (!Array.isArray(value.steps)) return false;
  const failedSteps = value.steps.filter((step) => step?.status === "failed");
  return failedSteps.length === 1
    && failedSteps[0].id === "artifacts.freshness"
    && failedSteps[0].summary?.status === "partial";
}

function validateAllowedWrites(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`classic-parity-bench: ${label} must be an array.`);
  }
  const normalized = value.map((path, index) => validateRepoRelativePath(path, `${label}[${index}]`));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`classic-parity-bench: ${label} must not contain duplicates.`);
  }
  return normalized;
}

function optionalPositiveInteger(value, field, label) {
  if (value[field] === undefined) return {};
  if (!Number.isSafeInteger(value[field]) || value[field] <= 0) {
    throw new Error(`classic-parity-bench: ${label}.${field} must be a positive integer.`);
  }
  return { [field]: value[field] };
}

function validateRepetitions(value, label) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 3) {
    throw new Error(`classic-parity-bench: ${label} must be an integer from 1 through 3.`);
  }
  return value;
}

function isExcluded(path, isDirectory, excludedPaths) {
  const segments = path.split("/");
  if (segments.some((segment) => GENERATED_DIRECTORIES.has(segment))) return true;
  for (const excludedPath of excludedPaths) {
    if (path === excludedPath || path.startsWith(`${excludedPath}/`)) return true;
  }
  return isDirectory && path.length === 0;
}

function normalizePath(value) {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "");
}
