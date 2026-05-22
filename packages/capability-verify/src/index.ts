import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import type { ArtifactHeader, ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type VerificationCommandResult,
  type VerificationPlanLike,
  type VerificationResult,
  type VerificationResultStatus,
  type VerificationRun,
  type VerificationRunCommand,
  type VerificationRunEnvironment,
  type VerificationRunRedaction,
  type VerificationRunRunnerInfo,
  type VerificationRunStatus,
  type VerificationRunStreamExcerpt,
  type VerificationRunSummary,
  assertVerificationRun,
  createVerificationResult,
  createVerificationRun,
  summarizeVerificationRunCommands,
  validateVerificationRun,
} from "@rekon/capability-intent";
import {
  type ArtifactReader,
  type ArtifactWriter,
  type Runner,
  defineCapability,
} from "@rekon/sdk";

/**
 * `@rekon/capability-verify` — verification runner.
 *
 * **Execution requires explicit operator opt-in.** The package
 * declares the `"runner"` role + `execute:verification`
 * permission, and exposes four public surfaces:
 *
 * - `createVerificationRunDryRun` (step 3, shipped) —
 *   planned-but-not-run preview; never spawns a process.
 * - `executeVerificationRun` (step 4, shipped) — actually runs
 *   the validated plan commands using `spawn` with
 *   `shell: false`, a scrubbed env, per-command + per-plan
 *   timeouts (SIGTERM → grace → SIGKILL), and bounded
 *   redacted log excerpts plus full pre-redaction sha256
 *   digests.
 * - `deriveVerificationResultFromRun` (step 6, shipped) —
 *   pure helper that converts a completed `VerificationRun`
 *   into a concise `VerificationResult` proof summary.
 *   Never reruns commands; refuses dry-run / not-run runs by
 *   default; maps `timeout` and `killed` command statuses to
 *   `failed`; carries `stdoutDigest` / `stderrDigest` but not
 *   the redacted excerpts.
 * - The capability default-exported runner handler still
 *   throws when invoked through generic dispatch — the
 *   public execute path is the CLI command
 *   `rekon verify run --plan <id> --execute`, gated by the
 *   safety contract pinned in
 *   [`docs/strategy/verification-runner-v1-decision.md`](../../../docs/strategy/verification-runner-v1-decision.md).
 *
 * **Importing the package does not run anything.** The
 * runner handler still throws. The CLI orchestrates the
 * execute path and the derivation path explicitly.
 *
 * Out of scope for this slice (still deferred): auto-
 * resolution, auto-apply, retries, sandboxing, network
 * policy, CI / GitHub adapter, source writes by the runner.
 */

export const VERIFY_CAPABILITY_ID = "@rekon/capability-verify";
export const VERIFY_CAPABILITY_VERSION = "0.1.0";

/**
 * Re-export of the canonical VerificationRun shape so
 * callers don't need to depend on `@rekon/capability-intent`
 * directly to write VerificationRun artifacts via this
 * capability. The type itself lives in
 * `@rekon/capability-intent` next to `VerificationResult`.
 */
export {
  type VerificationCommandResult,
  type VerificationPlanLike,
  type VerificationResult,
  type VerificationResultStatus,
  type VerificationRun,
  type VerificationRunCommand,
  type VerificationRunEnvironment,
  type VerificationRunRedaction,
  type VerificationRunRunnerInfo,
  type VerificationRunSummary,
  assertVerificationRun,
  createVerificationResult,
  createVerificationRun,
  summarizeVerificationRunCommands,
  validateVerificationRun,
};

// ---------- Dry-run helper (P1.1 verification-run-dry-run) ----------
//
// `createVerificationRunDryRun` parses a `VerificationPlan`'s commands
// into a safe argv representation, validates each command against the
// safety contract pinned in
// `docs/strategy/verification-runner-v1-decision.md`, and returns a
// planned-but-not-run `VerificationRun` plus a per-command issue list.
//
// **No process is spawned.** The helper does not import
// `node:child_process` and does not read stdout / stderr from a real
// command. It exists so the CLI can preview the future runner's
// behavior under the same validation rules that opt-in execution
// will apply.
//
// Callers are responsible for deciding whether to write the artifact
// (writing should be refused when any command is invalid).

/**
 * Reason codes for rejected commands. Stable, machine-readable.
 */
export type VerificationRunCommandValidationReason =
  | "empty-command"
  | "shell-control-operator"
  | "command-substitution"
  | "env-assignment-prefix"
  | "newline"
  | "unsupported-syntax";

export type VerificationRunCommandValidationIssue = {
  command: string;
  reason: VerificationRunCommandValidationReason;
  message: string;
};

export type VerificationRunSafetySummary = {
  shell: false;
  executeRequired: true;
  permission: "execute:verification";
  warnings: string[];
};

export type VerificationRunDryRunRunnerInfo = {
  id?: string;
  version?: string;
  capabilityId?: string;
};

export type VerificationRunDryRunInput = {
  verificationPlan: VerificationPlanLike;
  verificationPlanRef: ArtifactRef;
  workOrderRef?: ArtifactRef;
  header: ArtifactHeader;
  runner?: VerificationRunDryRunRunnerInfo;
  environment?: VerificationRunEnvironment;
  generatedAt?: string;
};

export type VerificationRunDryRunResult = {
  verificationRun: VerificationRun;
  safety: VerificationRunSafetySummary;
  validationIssues: VerificationRunCommandValidationIssue[];
  ok: boolean;
};

/**
 * Default redaction patterns mirroring the safety contract in
 * `docs/strategy/verification-runner-v1-decision.md`. These are
 * declared on the artifact even though dry-run captures no
 * stdout / stderr, so the contract is visible from the artifact
 * itself.
 */
export const VERIFICATION_RUN_DRY_RUN_REDACTION_PATTERNS = Object.freeze([
  "env:TOKEN",
  "env:SECRET",
  "env:KEY",
  "env:PASSWORD",
  "env:PAT",
  "env:BEARER",
  "header:Authorization:Bearer",
  "header:Authorization:Basic",
]);

/**
 * The default runner identity used when the caller does not
 * supply one. Picked so `runner.id` is human-readable in the
 * dry-run output ("rekon.local.dry-run") and `capabilityId`
 * stays aligned with the manifest.
 */
export const VERIFICATION_RUN_DRY_RUN_RUNNER_ID = "rekon.local.dry-run";

/**
 * Build a planned-but-not-run `VerificationRun` from a
 * `VerificationPlan`. Does not execute or spawn anything.
 * The returned `validationIssues` array is non-empty when the
 * plan contains commands the future runner would refuse to
 * execute. Callers should refuse to write the artifact when
 * `ok` is false.
 */
export function createVerificationRunDryRun(
  input: VerificationRunDryRunInput,
): VerificationRunDryRunResult {
  if (!input || typeof input !== "object") {
    throw new TypeError("createVerificationRunDryRun requires an input object.");
  }
  if (!input.verificationPlan || typeof input.verificationPlan !== "object") {
    throw new TypeError("createVerificationRunDryRun requires input.verificationPlan.");
  }
  if (!input.verificationPlanRef || typeof input.verificationPlanRef !== "object") {
    throw new TypeError(
      "createVerificationRunDryRun requires input.verificationPlanRef.",
    );
  }
  if (!input.header || typeof input.header !== "object") {
    throw new TypeError("createVerificationRunDryRun requires input.header.");
  }

  const plan = input.verificationPlan;
  const planCommands = Array.isArray(plan.commands) ? plan.commands : [];

  const commands: VerificationRunCommand[] = [];
  const validationIssues: VerificationRunCommandValidationIssue[] = [];

  for (let index = 0; index < planCommands.length; index += 1) {
    const rawCommand = planCommands[index];
    const command = typeof rawCommand === "string" ? rawCommand : "";
    const id = `cmd-${index + 1}`;
    const validation = validateVerificationRunCommandString(command);

    if (!validation.ok) {
      validationIssues.push({
        command,
        reason: validation.reason,
        message: validation.message,
      });
    }

    commands.push({
      id,
      command,
      argv: validation.argv,
      status: "not-run",
    });
  }

  const summary: VerificationRunSummary = {
    total: commands.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    notRun: commands.length,
    timeout: 0,
    killed: 0,
  };

  const runner: VerificationRunRunnerInfo = {
    id: input.runner?.id ?? VERIFICATION_RUN_DRY_RUN_RUNNER_ID,
    version: input.runner?.version,
    capabilityId: input.runner?.capabilityId ?? VERIFY_CAPABILITY_ID,
  };

  const redaction: VerificationRunRedaction = {
    applied: false,
    patterns: [...VERIFICATION_RUN_DRY_RUN_REDACTION_PATTERNS],
    redactedMatches: 0,
  };

  const environment: VerificationRunEnvironment | undefined = input.environment
    ? {
      platform: input.environment.platform,
      arch: input.environment.arch,
      nodeVersion: input.environment.nodeVersion,
      shell: input.environment.shell,
      network: input.environment.network,
      envPolicy: input.environment.envPolicy ?? "scrubbed",
    }
    : undefined;

  const verificationRun = createVerificationRun({
    header: input.header,
    status: "not-run",
    verificationPlanRef: input.verificationPlanRef,
    workOrderRef: input.workOrderRef,
    commands,
    summary,
    runner,
    environment,
    redaction,
  });

  const safety: VerificationRunSafetySummary = {
    shell: false,
    executeRequired: true,
    permission: "execute:verification",
    warnings: validationIssues.length > 0
      ? [
        "One or more planned commands are not safe for the runner. "
          + "Fix them in the VerificationPlan before opt-in execution lands.",
      ]
      : [],
  };

  return {
    verificationRun,
    safety,
    validationIssues,
    ok: validationIssues.length === 0,
  };
}

type VerificationRunCommandValidation =
  | { ok: true; argv: string[] }
  | {
    ok: false;
    argv: string[];
    reason: VerificationRunCommandValidationReason;
    message: string;
  };

/**
 * Validate and tokenize a single command string into argv.
 * Conservative: rejects any shell-control operator, command
 * substitution, env-assignment prefix, or newline. The future
 * runner spawns `argv[0]` with `argv.slice(1)` and
 * `shell: false`.
 *
 * Tokenization is intentionally simple: whitespace-separated,
 * with double-quoted and single-quoted strings preserved as
 * single tokens. This matches the subset of plan strings we
 * accept ("npm run test", "node scripts/audit-license.mjs",
 * etc.). Anything more complex is rejected so a future runner
 * never has to parse shell.
 */
export function validateVerificationRunCommandString(
  command: string,
): VerificationRunCommandValidation {
  if (typeof command !== "string" || command.trim().length === 0) {
    return {
      ok: false,
      argv: [],
      reason: "empty-command",
      message: "Command is empty.",
    };
  }

  if (command.includes("\n") || command.includes("\r")) {
    return {
      ok: false,
      argv: [],
      reason: "newline",
      message: "Command contains a newline. Multi-line commands are not supported.",
    };
  }

  // Reject shell metacharacters that appear **outside** quoted
  // regions. Inside quoted regions the characters are part of an
  // argument literal (`node -e "setTimeout(() => {}, 60000)"`
  // contains `=>` and `() => {}` inside a quoted string), so the
  // tokenizer keeps them and the runner spawns the literal text.
  const unquotedIssue = checkUnquotedShellMetacharacters(command);

  if (unquotedIssue) {
    return {
      ok: false,
      argv: [],
      reason: unquotedIssue.reason,
      message: unquotedIssue.message,
    };
  }

  let argv: string[];

  try {
    argv = tokenizeCommandString(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      argv: [],
      reason: "unsupported-syntax",
      message,
    };
  }

  if (argv.length === 0) {
    return {
      ok: false,
      argv: [],
      reason: "empty-command",
      message: "Command tokenized to zero arguments.",
    };
  }

  // Env-assignment prefix (e.g. "TOKEN=x npm test"). The first
  // token must not look like NAME=VALUE.
  if (argv[0] !== undefined && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) {
    return {
      ok: false,
      argv: [],
      reason: "env-assignment-prefix",
      message:
        "Env-assignment prefix (NAME=value) is not supported. Set environment "
        + "variables through the runner's environment policy instead.",
    };
  }

  return { ok: true, argv };
}

/**
 * Walk the command string and reject shell metacharacters that
 * appear outside any quoted region. The tokenizer-aware walk lets
 * arguments like `node -e "() => {}"` pass even though the raw
 * string contains `>`.
 */
function checkUnquotedShellMetacharacters(
  command: string,
): { reason: VerificationRunCommandValidationReason; message: string } | null {
  let mode: "default" | "single" | "double" = "default";

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    const next = command[index + 1];

    if (mode === "single") {
      if (char === "'") {
        mode = "default";
      }
      continue;
    }
    if (mode === "double") {
      if (char === "\"") {
        mode = "default";
      }
      continue;
    }

    if (char === "'") {
      mode = "single";
      continue;
    }
    if (char === "\"") {
      mode = "double";
      continue;
    }

    if (char === "`") {
      return {
        reason: "command-substitution",
        message: "Command substitution (`...`) is not supported.",
      };
    }

    if (char === "$" && next === "(") {
      return {
        reason: "command-substitution",
        message: "Command substitution ($(...)) is not supported.",
      };
    }

    // Multi-char operators first.
    if ((char === "&" && next === "&") || (char === "|" && next === "|")) {
      return {
        reason: "shell-control-operator",
        message: `Shell control operator '${char}${next}' is not supported.`,
      };
    }
    if ((char === ">" && next === ">") || (char === "<" && next === "<")) {
      return {
        reason: "shell-control-operator",
        message: `Shell control operator '${char}${next}' is not supported.`,
      };
    }

    // Single-char operators.
    if (char === ";" || char === "|" || char === ">" || char === "<" || char === "&") {
      return {
        reason: "shell-control-operator",
        message: `Shell control operator '${char}' is not supported.`,
      };
    }
  }

  return null;
}

function tokenizeCommandString(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let mode: "default" | "single" | "double" = "default";

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];

    if (mode === "default") {
      if (char === " " || char === "\t") {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }

        continue;
      }

      if (char === "'") {
        mode = "single";
        continue;
      }

      if (char === "\"") {
        mode = "double";
        continue;
      }

      current += char;
      continue;
    }

    if (mode === "single") {
      if (char === "'") {
        mode = "default";
        continue;
      }

      current += char;
      continue;
    }

    if (mode === "double") {
      if (char === "\"") {
        mode = "default";
        continue;
      }

      current += char;
      continue;
    }
  }

  if (mode !== "default") {
    throw new Error("Unterminated quoted string.");
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

// ---------- Execution v1 (P1.1 verification-run-execution-v1) ----------
//
// `executeVerificationRun` is the first surface in this package that
// actually spawns processes. It reuses the dry-run validator: a plan
// whose commands fail validation is refused **before** any process
// starts.
//
// Safety constraints — every one is also a contract test:
//
//   1. Commands run with `shell: false`. Never a shell.
//   2. argv comes from `validateVerificationRunCommandString` (the
//      same tokenizer the dry-run uses); no shell-control / command
//      substitution / env-assignment / newlines slip through.
//   3. Env is scrubbed: only an allowlist (`PATH`, `HOME`, `USER`,
//      …) is forwarded, and any forwarded variable whose name
//      matches the secret-name guard (TOKEN / SECRET / PASSWORD /
//      etc.) is removed.
//   4. Per-command timeout (default 120 s) sends SIGTERM, waits the
//      kill grace (default 3 s), then SIGKILL. Per-plan timeout
//      (default 600 s) kills the active command and marks remaining
//      commands `not-run`.
//   5. stdout / stderr are streamed; full pre-redaction streams are
//      hashed (sha256) before any truncation; excerpts are redacted
//      then truncated to `maxLogBytes` (default 8192).
//   6. No retries.
//   7. The helper never writes a `VerificationResult`. Derivation is
//      a follow-up slice.
//   8. The helper never touches `FindingStatusLedger` or
//      reconciliation surfaces; a passing run does not auto-resolve.

/**
 * Default execution policy values, pinned to the safety contract in
 * `docs/strategy/verification-runner-v1-decision.md`.
 */
export const VERIFICATION_RUN_DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
export const VERIFICATION_RUN_DEFAULT_PLAN_TIMEOUT_MS = 600_000;
export const VERIFICATION_RUN_DEFAULT_KILL_GRACE_MS = 3_000;
export const VERIFICATION_RUN_DEFAULT_MAX_LOG_BYTES = 8_192;
export const VERIFICATION_RUN_EXECUTION_RUNNER_ID = "rekon.local.exec";

/**
 * Environment-variable allowlist. Only these keys are passed to the
 * spawned process — and even allowed entries are dropped if the
 * **value** looks token-like (i.e., the key matches the secret
 * guard). Platform-critical variables (Windows `SystemRoot` etc.)
 * are also allowed so commands can resolve `node` on Windows.
 *
 * **Step 9 hardening (fix #4):** `NODE_OPTIONS` is **not** in the
 * allowlist. `NODE_OPTIONS=--require ...` can preload modules into
 * any spawned Node.js process and silently alter proof execution,
 * which would weaken the repeatability guarantees that downstream
 * GitHub Check / PR comment surfaces depend on. Operators who need
 * specific Node.js flags can set them inline on the command in
 * their `VerificationPlan`.
 *
 * `NPM_CONFIG_USERCONFIG` remains forwarded so commands that
 * resolve npm packages can find the operator's `~/.npmrc`. This is
 * a deliberate trade-off (npm semantics depend on it) and is
 * documented in the trust-boundary hardening review packet.
 */
export const VERIFICATION_RUN_ENV_ALLOWLIST = Object.freeze([
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TMPDIR",
  "TEMP",
  "TMP",
  "NODE_ENV",
  "NPM_CONFIG_USERCONFIG",
  "CI",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  // Windows + cross-platform:
  "SystemRoot",
  "ComSpec",
  "PATHEXT",
  "windir",
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
]);

/**
 * Regex matched against env-var **names** to remove secret-like
 * keys regardless of the allowlist. Case-insensitive. Uses
 * word-component boundaries (start-of-string, end-of-string, or
 * `_` / `-`) so:
 *
 *   - `PATH` is NOT treated as containing `PAT` (the `H`
 *     suffix is a letter, not a boundary).
 *   - `GITHUB_PAT` IS treated as a token (`PAT` is preceded by
 *     `_` and followed by end-of-string).
 *   - `OAUTH_TOKEN`, `AWS_SECRET_KEY`, `API_KEY` etc. are all
 *     detected.
 *
 * Plain words like `KEYBOARD` are not matched because `KEY`
 * runs into `BOARD` without a boundary.
 */
export const VERIFICATION_RUN_SECRET_KEY_PATTERN = /(?:^|[_\-])(TOKEN|SECRET|PASSWORD|APIKEY|API_KEY|KEY|AUTH|CREDENTIAL|COOKIE|SESSION|BEARER|PAT)(?:$|[_\-])/i;

/**
 * Redaction patterns applied to stdout / stderr excerpts. Each
 * entry has an `id` (recorded on the artifact for audit), a
 * `match` regex, and a `replace` function returning the redacted
 * substring. Patterns are applied in order; matches are counted.
 */
type RedactionPattern = {
  id: string;
  match: RegExp;
  replace: (match: string) => string;
};

const REDACTION_PATTERNS: ReadonlyArray<RedactionPattern> = Object.freeze([
  // KEY=VALUE forms (env-var-style or CLI flag values). The
  // identifier may start with the secret token (`TOKEN=`,
  // `SECRET=`) or end with it (`MY_API_TOKEN=`,
  // `DATABASE_PASSWORD=`). We never redact `PATH=` because the
  // tokenizer requires a complete token match (`PAT` must be at
  // a word boundary, not a strict substring of `PATH`).
  {
    id: "env-assignment-token-like",
    match: /\b\w*?(TOKEN|SECRET|PASSWORD|API_KEY|APIKEY|CREDENTIAL|COOKIE|SESSION|BEARER|PAT)=\S+/gi,
    replace: (match) => {
      const equals = match.indexOf("=");

      return equals === -1 ? "[REDACTED]" : `${match.slice(0, equals + 1)}[REDACTED]`;
    },
  },
  // JSON-style: "token": "...", "secret": "..."
  {
    id: "json-secret",
    match: /"(token|secret|password|apiKey|api_key|authorization|auth|cookie|session)"\s*:\s*"[^"]*"/gi,
    replace: (match) => {
      const colon = match.indexOf(":");

      return colon === -1 ? "[REDACTED]" : `${match.slice(0, colon + 1)} "[REDACTED]"`;
    },
  },
  // HTTP Authorization header (Bearer / Basic)
  {
    id: "bearer-token",
    match: /Bearer\s+[A-Za-z0-9._\-+/=]+/g,
    replace: () => "Bearer [REDACTED]",
  },
  {
    id: "basic-auth",
    match: /Basic\s+[A-Za-z0-9+/=]+/g,
    replace: () => "Basic [REDACTED]",
  },
]);

export type VerificationRunRedactionTextResult = {
  text: string;
  redactedMatches: number;
  patterns: string[];
};

/**
 * Apply the deterministic redaction patterns to a single string.
 * Pure; the input is never mutated.
 */
export function redactVerificationRunStreamText(
  input: string,
): VerificationRunRedactionTextResult {
  let text = input;
  let totalMatches = 0;
  const matchedPatterns: string[] = [];

  for (const pattern of REDACTION_PATTERNS) {
    let matchCount = 0;

    text = text.replace(pattern.match, (match) => {
      matchCount += 1;

      return pattern.replace(match);
    });

    if (matchCount > 0) {
      totalMatches += matchCount;
      matchedPatterns.push(pattern.id);
    }
  }

  return { text, redactedMatches: totalMatches, patterns: matchedPatterns };
}

/**
 * Build a scrubbed env object from `process.env`. Only allowlist
 * keys survive, and any allowlist key whose **name** still matches
 * the secret guard is dropped.
 */
export function buildScrubbedEnvironment(
  sourceEnv: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const allowlist = new Set(VERIFICATION_RUN_ENV_ALLOWLIST);
  const scrubbed: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(sourceEnv)) {
    if (!allowlist.has(key)) continue;
    if (typeof rawValue !== "string") continue;
    if (VERIFICATION_RUN_SECRET_KEY_PATTERN.test(key)) continue;
    scrubbed[key] = rawValue;
  }

  return scrubbed;
}

/**
 * Truncate a redacted string to `maxBytes` using UTF-8 byte
 * boundaries. Returns the stored text plus a `truncated` flag.
 */
function truncateToBytes(
  text: string,
  maxBytes: number,
): { text: string; truncated: boolean; originalBytes: number; storedBytes: number } {
  const buffer = Buffer.from(text, "utf8");

  if (buffer.length <= maxBytes) {
    return {
      text,
      truncated: false,
      originalBytes: buffer.length,
      storedBytes: buffer.length,
    };
  }

  // Trim to maxBytes; back off until we hit a UTF-8 boundary so we
  // don't slice a multi-byte character in half.
  let cut = maxBytes;

  while (cut > 0 && ((buffer[cut] ?? 0) & 0xc0) === 0x80) cut -= 1;

  const stored = buffer.subarray(0, cut).toString("utf8");

  return {
    text: stored,
    truncated: true,
    originalBytes: buffer.length,
    storedBytes: Buffer.byteLength(stored, "utf8"),
  };
}

function buildStreamExcerpt(
  rawText: string,
  maxBytes: number,
): { excerpt: VerificationRunStreamExcerpt; digest: string; matches: number; patternIds: string[] } {
  const digest = createHash("sha256").update(rawText, "utf8").digest("hex");
  const redacted = redactVerificationRunStreamText(rawText);
  const truncated = truncateToBytes(redacted.text, maxBytes);
  const excerpt: VerificationRunStreamExcerpt = {
    text: truncated.text,
    redacted: redacted.redactedMatches > 0,
    truncated: truncated.truncated,
    originalBytes: truncated.originalBytes,
    storedBytes: truncated.storedBytes,
  };

  return {
    excerpt,
    digest,
    matches: redacted.redactedMatches,
    patternIds: redacted.patterns,
  };
}

/**
 * Trust-boundary hardening (step 9, fix #2). Convert a
 * `BoundedStreamCapture` returned by the new streaming sink
 * into a `VerificationRunStreamExcerpt`. The capture already
 * holds an incremental sha256 + a bounded-by-construction
 * excerpt buffer, so we only apply redaction + the byte-cap
 * truncation here. The full stream is never materialised.
 */
function finalizeBoundedStreamSummary(
  capture: BoundedStreamCapture,
  maxBytes: number,
): { excerpt: VerificationRunStreamExcerpt; digest: string; matches: number; patternIds: string[] } {
  const redacted = redactVerificationRunStreamText(capture.excerpt);
  const truncated = truncateToBytes(redacted.text, maxBytes);
  // `originalBytes` reflects the **full** stream that flowed
  // through the sink, not just the excerpt buffer the sink
  // retained. The streaming sink already tracked this.
  const excerpt: VerificationRunStreamExcerpt = {
    text: truncated.text,
    redacted: redacted.redactedMatches > 0,
    truncated: truncated.truncated || capture.truncated,
    originalBytes: capture.originalBytes,
    storedBytes: truncated.storedBytes,
  };

  return {
    excerpt,
    digest: capture.digest,
    matches: redacted.redactedMatches,
    patternIds: redacted.patterns,
  };
}

export type VerificationRunExecutionOptions = {
  /** Working directory used by every spawned command. Required. */
  cwd: string;
  /** Per-command timeout in ms. Default 120 s. */
  commandTimeoutMs?: number;
  /** Per-plan timeout in ms. Default 600 s. */
  planTimeoutMs?: number;
  /** Grace between SIGTERM and SIGKILL in ms. Default 3 s. */
  killGraceMs?: number;
  /** Max bytes per stream per command in the artifact body. Default 8192. */
  maxLogBytes?: number;
  /** Optional override of `process.env` for tests. */
  env?: NodeJS.ProcessEnv;
};

export type VerificationRunExecutionResult = {
  verificationRun: VerificationRun;
  safety: VerificationRunSafetySummary;
  validationIssues: VerificationRunCommandValidationIssue[];
  ok: boolean;
};

/**
 * Run a `VerificationPlan` against the local machine. Returns a
 * `VerificationRun` artifact populated with the recorded execution
 * detail. Does not write the artifact (the CLI does that).
 *
 * Refuses to spawn anything when any command fails validation —
 * the returned `validationIssues` is non-empty and
 * `verificationRun.status === "not-run"`.
 */
export async function executeVerificationRun(
  input: VerificationRunDryRunInput,
  options: VerificationRunExecutionOptions,
): Promise<VerificationRunExecutionResult> {
  if (!options || typeof options.cwd !== "string" || options.cwd.length === 0) {
    throw new TypeError("executeVerificationRun requires options.cwd.");
  }

  // Reuse the dry-run validator. If any command is invalid, refuse
  // up front — no spawn happens, nothing is written.
  const dryRun = createVerificationRunDryRun({
    ...input,
    runner: input.runner ?? {
      id: VERIFICATION_RUN_EXECUTION_RUNNER_ID,
      capabilityId: VERIFY_CAPABILITY_ID,
    },
  });

  if (!dryRun.ok) {
    return {
      verificationRun: dryRun.verificationRun,
      safety: dryRun.safety,
      validationIssues: dryRun.validationIssues,
      ok: false,
    };
  }

  const commandTimeoutMs = options.commandTimeoutMs
    ?? VERIFICATION_RUN_DEFAULT_COMMAND_TIMEOUT_MS;
  const planTimeoutMs = options.planTimeoutMs
    ?? VERIFICATION_RUN_DEFAULT_PLAN_TIMEOUT_MS;
  const killGraceMs = options.killGraceMs
    ?? VERIFICATION_RUN_DEFAULT_KILL_GRACE_MS;
  const maxLogBytes = options.maxLogBytes
    ?? VERIFICATION_RUN_DEFAULT_MAX_LOG_BYTES;
  const scrubbedEnv = buildScrubbedEnvironment(options.env ?? process.env);

  const planCommands = dryRun.verificationRun.commands;
  const executed: VerificationRunCommand[] = [];
  const planStart = Date.now();
  const planDeadline = planStart + planTimeoutMs;
  let redactedMatchesTotal = 0;
  const redactionPatternsTouched = new Set<string>();
  let planTimedOut = false;

  for (let index = 0; index < planCommands.length; index += 1) {
    const planned = planCommands[index]!;

    // Per-plan timeout: if we've already exceeded the budget,
    // mark all remaining as not-run.
    if (Date.now() >= planDeadline) {
      planTimedOut = true;
      executed.push({
        ...planned,
        status: "not-run",
        notes: "plan-timeout-before-start",
      });
      continue;
    }

    const remainingPlanBudget = planDeadline - Date.now();
    const effectiveCommandTimeout = Math.max(
      1,
      Math.min(commandTimeoutMs, remainingPlanBudget),
    );
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    const spawnResult = await spawnPlanCommand(planned, {
      cwd: options.cwd,
      env: scrubbedEnv,
      commandTimeoutMs: effectiveCommandTimeout,
      killGraceMs,
      maxLogBytes,
    });
    const endedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    const stdoutSummary = finalizeBoundedStreamSummary(spawnResult.stdout, maxLogBytes);
    const stderrSummary = finalizeBoundedStreamSummary(spawnResult.stderr, maxLogBytes);

    redactedMatchesTotal += stdoutSummary.matches + stderrSummary.matches;
    for (const pattern of stdoutSummary.patternIds) {
      redactionPatternsTouched.add(pattern);
    }
    for (const pattern of stderrSummary.patternIds) {
      redactionPatternsTouched.add(pattern);
    }

    const status = deriveCommandStatus(spawnResult);

    executed.push({
      id: planned.id,
      command: planned.command,
      argv: planned.argv,
      status,
      exitCode: spawnResult.exitCode,
      signal: spawnResult.signal,
      startedAt,
      endedAt,
      durationMs,
      timedOut: spawnResult.timedOut,
      killed: spawnResult.killed,
      stdoutDigest: stdoutSummary.digest,
      stderrDigest: stderrSummary.digest,
      stdoutExcerpt: stdoutSummary.excerpt,
      stderrExcerpt: stderrSummary.excerpt,
    });
  }

  const summary = summarizeVerificationRunCommands(executed);
  const status = deriveRunStatus(summary, executed);
  const endedAt = new Date().toISOString();
  const durationMs = Date.now() - planStart;

  const runner: VerificationRunRunnerInfo = {
    id: input.runner?.id ?? VERIFICATION_RUN_EXECUTION_RUNNER_ID,
    version: input.runner?.version ?? VERIFY_CAPABILITY_VERSION,
    capabilityId: input.runner?.capabilityId ?? VERIFY_CAPABILITY_ID,
  };
  const redaction: VerificationRunRedaction = {
    applied: true,
    patterns: redactionPatternsTouched.size > 0
      ? [...redactionPatternsTouched]
      : REDACTION_PATTERNS.map((pattern) => pattern.id),
    redactedMatches: redactedMatchesTotal,
    maxBytesPerStream: maxLogBytes,
  };
  const environment: VerificationRunEnvironment = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    // `shell` left absent on purpose — we never spawn through a shell.
    network: "unknown",
    envPolicy: "scrubbed",
  };

  const verificationRun = createVerificationRun({
    header: input.header,
    status,
    verificationPlanRef: input.verificationPlanRef,
    workOrderRef: input.workOrderRef,
    commands: executed,
    summary,
    runner,
    environment,
    redaction,
    startedAt: new Date(planStart).toISOString(),
    endedAt,
    durationMs,
  });

  const warnings: string[] = [];

  if (planTimedOut) {
    warnings.push(
      `Plan exceeded the per-plan timeout (${planTimeoutMs} ms); remaining commands were not run.`,
    );
  }

  const safety: VerificationRunSafetySummary = {
    shell: false,
    executeRequired: true,
    permission: "execute:verification",
    warnings,
  };

  return {
    verificationRun,
    safety,
    validationIssues: [],
    ok: true,
  };
}

type SpawnPlanCommandOptions = {
  cwd: string;
  env: Record<string, string>;
  commandTimeoutMs: number;
  killGraceMs: number;
  /**
   * Per-stream byte cap for the bounded excerpt buffer
   * (default `VERIFICATION_RUN_DEFAULT_MAX_LOG_BYTES`).
   */
  maxLogBytes: number;
};

type BoundedStreamCapture = {
  excerpt: string;
  digest: string;
  originalBytes: number;
  truncated: boolean;
};

type SpawnPlanCommandResult = {
  exitCode: number | null;
  signal: string | null;
  stdout: BoundedStreamCapture;
  stderr: BoundedStreamCapture;
  timedOut: boolean;
  killed: boolean;
  startError?: string;
};

/**
 * Build a stream sink that incrementally hashes every chunk
 * and retains only the first `maxBytes` bytes as a bounded
 * excerpt. Anything past the cap is hashed and discarded; the
 * `originalBytes` counter still reflects the full stream.
 *
 * This prevents large stdout/stderr from exhausting memory
 * before truncation (step 9, fix #2 — bounded streaming
 * capture).
 */
function createBoundedStreamSink(maxBytes: number): {
  onChunk: (chunk: Buffer) => void;
  finalize: () => BoundedStreamCapture;
} {
  const hash = createHash("sha256");
  // Cap the buffered excerpt at a small multiple of maxBytes
  // so we keep enough context for boundary-aware redaction +
  // truncation without retaining unbounded text.
  const excerptCap = Math.max(maxBytes * 2, 4096);
  let excerptBuffer = "";
  let originalBytes = 0;

  return {
    onChunk(chunk) {
      hash.update(chunk);
      originalBytes += chunk.byteLength;
      if (excerptBuffer.length < excerptCap) {
        const remaining = excerptCap - excerptBuffer.length;
        excerptBuffer += chunk
          .subarray(0, Math.min(chunk.byteLength, remaining))
          .toString("utf8");
      }
    },
    finalize() {
      const digest = hash.digest("hex");
      return {
        excerpt: excerptBuffer,
        digest,
        originalBytes,
        truncated: originalBytes > excerptBuffer.length,
      };
    },
  };
}

async function spawnPlanCommand(
  planned: VerificationRunCommand,
  options: SpawnPlanCommandOptions,
): Promise<SpawnPlanCommandResult> {
  return new Promise<SpawnPlanCommandResult>((resolve) => {
    const argv = planned.argv;
    const emptyCapture: BoundedStreamCapture = {
      excerpt: "",
      digest: createHash("sha256").update("").digest("hex"),
      originalBytes: 0,
      truncated: false,
    };

    if (!argv || argv.length === 0) {
      resolve({
        exitCode: null,
        signal: null,
        stdout: emptyCapture,
        stderr: { ...emptyCapture, excerpt: "Empty argv; nothing spawned." },
        timedOut: false,
        killed: false,
        startError: "empty-argv",
      });
      return;
    }

    let child;
    // Process-tree kill semantics (step 9, fix #3): on POSIX
    // platforms, spawn the child in its own process group so
    // a SIGTERM / SIGKILL on `-pid` reaches every descendant
    // (the runner-spawned process and its grandchildren). On
    // Windows we rely on `child.kill()` only — see the
    // platform note in docs/concepts/verification-runs.md.
    const useProcessGroup = process.platform !== "win32";

    try {
      child = spawn(argv[0]!, argv.slice(1), {
        cwd: options.cwd,
        env: options.env,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        detached: useProcessGroup,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      resolve({
        exitCode: null,
        signal: null,
        stdout: emptyCapture,
        stderr: { ...emptyCapture, excerpt: `spawn failed: ${message}` },
        timedOut: false,
        killed: false,
        startError: message,
      });

      return;
    }

    const stdoutSink = createBoundedStreamSink(options.maxLogBytes);
    const stderrSink = createBoundedStreamSink(options.maxLogBytes);
    let timedOut = false;
    let killed = false;

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutSink.onChunk(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrSink.onChunk(chunk);
    });

    const killChild = (signal: NodeJS.Signals) => {
      try {
        if (useProcessGroup && typeof child.pid === "number") {
          // Negative pid signals the entire process group, so
          // grandchildren spawned by the runner-invoked process
          // also receive the signal. Falls back to direct-child
          // kill if the process group call throws.
          try {
            process.kill(-child.pid, signal);
            return;
          } catch {
            // group kill failed; fall back to direct child kill.
          }
        }
        child.kill(signal);
      } catch {
        // already dead
      }
    };

    const termTimer = setTimeout(() => {
      timedOut = true;
      killChild("SIGTERM");

      const killTimer = setTimeout(() => {
        killed = true;
        killChild("SIGKILL");
      }, options.killGraceMs);

      // Don't let the kill timer keep the event loop alive.
      killTimer.unref?.();
    }, options.commandTimeoutMs);

    termTimer.unref?.();

    child.on("error", (error: Error) => {
      clearTimeout(termTimer);
      const stderrCapture = stderrSink.finalize();
      const augmented: BoundedStreamCapture = {
        ...stderrCapture,
        excerpt:
          stderrCapture.excerpt
          + (stderrCapture.excerpt.length > 0 ? "\n" : "")
          + `child error: ${error.message}`,
      };
      resolve({
        exitCode: null,
        signal: null,
        stdout: stdoutSink.finalize(),
        stderr: augmented,
        timedOut,
        killed,
        startError: error.message,
      });
    });

    child.on("close", (exitCode, signal) => {
      clearTimeout(termTimer);
      resolve({
        exitCode: typeof exitCode === "number" ? exitCode : null,
        signal: typeof signal === "string" ? signal : null,
        stdout: stdoutSink.finalize(),
        stderr: stderrSink.finalize(),
        timedOut,
        killed,
      });
    });
  });
}

function deriveCommandStatus(result: SpawnPlanCommandResult): VerificationRunCommand["status"] {
  if (result.killed) return "killed";
  if (result.timedOut) return "timeout";
  if (result.startError) return "failed";
  if (result.exitCode === 0) return "passed";

  return "failed";
}

/**
 * Derive the overall run status from the per-command summary. The
 * priority list is pinned in the decision memo:
 *
 *     failed > killed > timeout > partial > passed > not-run
 */
function deriveRunStatus(
  summary: VerificationRunSummary,
  commands: ReadonlyArray<VerificationRunCommand>,
): VerificationRunStatus {
  if (summary.failed > 0) return "failed";
  if (summary.killed > 0) return "killed";
  if (summary.timeout > 0) return "timeout";
  if (summary.notRun > 0 || summary.skipped > 0) {
    if (summary.passed > 0) {
      return "partial";
    }

    return "not-run";
  }
  if (commands.length === 0) return "not-run";

  return "passed";
}

// ---------- Derivation (P1.1 verification-result-from-run) ----------
//
// `deriveVerificationResultFromRun` converts a completed
// `VerificationRun` into a concise `VerificationResult` proof
// summary. It is pure: it does not spawn processes, read source
// files, or mutate any external state. The CLI wraps this helper
// in `rekon verify result from-run` and writes the artifact.
//
// Safety contract:
//
//   1. Never re-runs commands. The result is derived strictly
//      from the run.
//   2. Refuses dry-run / not-run runs (`run.status === "not-run"`)
//      by default — a dry-run is not proof.
//   3. Maps `timeout` and `killed` command statuses to `failed`
//      in the proof summary. Both stay first-class as evidence
//      in the underlying `VerificationRun`.
//   4. Carries `stdoutDigest` / `stderrDigest` so downstream
//      surfaces can cite the streams without storing raw logs.
//      The `stdoutExcerpt` / `stderrExcerpt` redacted bodies are
//      intentionally NOT copied into `VerificationResult` — the
//      result stays concise and grep-friendly.
//   5. Cites the `VerificationRun` (always) and the
//      `VerificationPlan` (when provided) in
//      `header.inputRefs`; carries `WorkOrder` through when it
//      exists.
//   6. Sets `recordedBy` to the runner identity from the source
//      run (`"<run.runner.id>@<run.runner.version>"` when
//      version is available, otherwise just the runner id).
//   7. Never mutates `FindingStatusLedger`,
//      `FindingLifecycleReport`, `CoherencyDelta`, or any
//      reconciliation surface. A passing result does not
//      auto-resolve findings.

export type DeriveVerificationResultFromRunOptions = {
  /** Optional override for the timestamp used in the derived
   *  result's header (mainly for tests). */
  generatedAt?: string;
  /** When true, derivation accepts a not-run / dry-run run. The
   *  CLI exposes this via `--allow-not-run`. */
  allowNotRun?: boolean;
  /** Optional extra evidence notes appended to the derived
   *  result. The default note pointing at the source run is
   *  always added. */
  evidenceNotes?: string[];
};

export type DeriveVerificationResultFromRunInput = {
  verificationRun: VerificationRun;
  verificationRunRef: ArtifactRef;
  verificationPlan?: VerificationPlanLike;
  verificationPlanRef?: ArtifactRef;
  workOrderRef?: ArtifactRef;
};

export type DeriveVerificationResultFromRunResult = {
  verificationResult: VerificationResult;
  warnings: string[];
};

/**
 * Build a `VerificationResult` proof summary from a completed
 * `VerificationRun`. Pure: never spawns a process, never reads
 * source files, never mutates any external state.
 */
export function deriveVerificationResultFromRun(
  input: DeriveVerificationResultFromRunInput,
  options: DeriveVerificationResultFromRunOptions = {},
): DeriveVerificationResultFromRunResult {
  if (!input || typeof input !== "object") {
    throw new TypeError("deriveVerificationResultFromRun requires an input object.");
  }
  if (!input.verificationRun || typeof input.verificationRun !== "object") {
    throw new TypeError(
      "deriveVerificationResultFromRun requires input.verificationRun.",
    );
  }
  if (!input.verificationRunRef || typeof input.verificationRunRef !== "object") {
    throw new TypeError(
      "deriveVerificationResultFromRun requires input.verificationRunRef.",
    );
  }

  const run = input.verificationRun;

  if (run.status === "not-run" && options.allowNotRun !== true) {
    throw new Error(
      "VerificationRun status is not-run; dry-run artifacts cannot be "
        + "converted to VerificationResult. Pass `allowNotRun: true` to override.",
    );
  }

  const warnings: string[] = [];

  // Build per-command results. Map the run's six-value status
  // enum to the result's four-value enum.
  const commandResults: VerificationCommandResult[] = run.commands.map((command) => {
    const status = mapRunCommandStatusToResult(command.status);
    const note = explainCommandStatusForResult(command, run, input.verificationRunRef);
    const result: VerificationCommandResult = {
      command: command.command,
      status,
    };

    if (typeof command.exitCode === "number" && Number.isFinite(command.exitCode)) {
      result.exitCode = Math.trunc(command.exitCode);
    }
    if (typeof command.durationMs === "number" && Number.isFinite(command.durationMs) && command.durationMs >= 0) {
      result.durationMs = command.durationMs;
    }
    if (typeof command.startedAt === "string" && command.startedAt.length > 0) {
      result.startedAt = command.startedAt;
    }
    if (typeof command.endedAt === "string" && command.endedAt.length > 0) {
      result.completedAt = command.endedAt;
    }
    if (typeof command.stdoutDigest === "string" && command.stdoutDigest.length > 0) {
      result.stdoutDigest = command.stdoutDigest;
    }
    if (typeof command.stderrDigest === "string" && command.stderrDigest.length > 0) {
      result.stderrDigest = command.stderrDigest;
    }
    if (note.length > 0) {
      result.notes = note;
    }

    return result;
  });

  // Pick a plan ref: explicit input > run.verificationPlanRef.
  const verificationPlanRef = input.verificationPlanRef ?? run.verificationPlanRef;

  if (!verificationPlanRef) {
    throw new TypeError(
      "deriveVerificationResultFromRun requires a VerificationPlan reference "
        + "(either input.verificationPlanRef or run.verificationPlanRef).",
    );
  }

  const workOrderRef = input.workOrderRef ?? run.workOrderRef;
  const verificationPlan: VerificationPlanLike = input.verificationPlan ?? {
    header: run.header,
    workOrderRef: workOrderRef,
    commands: run.commands.map((command) => command.command),
  };

  const recordedBy = run.runner?.version
    ? `${run.runner.id}@${run.runner.version}`
    : run.runner?.id ?? "verification-runner";

  const baseNote = `Derived from ${input.verificationRunRef.type}:${input.verificationRunRef.id}.`;
  const evidenceNotes = [
    baseNote,
    ...(Array.isArray(options.evidenceNotes) ? options.evidenceNotes : []),
  ];

  if (run.status === "not-run") {
    warnings.push(
      "Source VerificationRun is not-run; derivation proceeded under allowNotRun.",
    );
  }

  // `createVerificationResult` aligns commandResults against the
  // plan's command list and derives the overall status. We add
  // the source run as an extra inputRef so the result cites it.
  const verificationResult = createVerificationResult({
    verificationPlan,
    verificationPlanRef,
    workOrderRef,
    commandResults,
    evidenceNotes,
    recordedBy,
    extraInputRefs: [input.verificationRunRef],
    generatedAt: options.generatedAt,
  });

  // `createVerificationResult` provenance note is geared at
  // operator-supplied results. Replace it with a runner-derived
  // note so downstream surfaces can spot the provenance.
  verificationResult.header.provenance = {
    confidence: 0.92,
    notes: [
      "Derived from a runner-produced VerificationRun.",
      "Runner did not auto-resolve findings or apply reconciliation.",
    ],
  };
  if (verificationResult.header.producer) {
    verificationResult.header.producer = {
      id: VERIFY_CAPABILITY_ID,
      version: VERIFY_CAPABILITY_VERSION,
    };
  }

  return { verificationResult, warnings };
}

/**
 * Map a `VerificationRun` command status to the
 * `VerificationResult` enum. `timeout` and `killed` are both
 * collapsed to `failed` — the source run keeps them first-class
 * as evidence.
 */
function mapRunCommandStatusToResult(
  status: VerificationRunCommand["status"],
): VerificationCommandResult["status"] {
  switch (status) {
    case "passed":
      return "passed";
    case "failed":
    case "timeout":
    case "killed":
      return "failed";
    case "skipped":
      return "skipped";
    case "not-run":
    default:
      return "not-run";
  }
}

function explainCommandStatusForResult(
  command: VerificationRunCommand,
  _run: VerificationRun,
  runRef: ArtifactRef,
): string {
  const parts: string[] = [];

  switch (command.status) {
    case "timeout":
      parts.push("Command timed out (mapped to failed).");
      break;
    case "killed":
      parts.push("Command was killed (mapped to failed).");
      break;
    case "skipped":
      parts.push("Command was skipped by the runner.");
      break;
    case "not-run":
      if (command.notes === "plan-timeout-before-start") {
        parts.push("Command not run: plan timeout exceeded before start.");
      } else {
        parts.push("Command was not run.");
      }
      break;
    default:
      break;
  }

  if (typeof command.signal === "string" && command.signal.length > 0) {
    parts.push(`Exited on signal ${command.signal}.`);
  }

  parts.push(`Source: ${runRef.type}:${runRef.id}.`);
  return parts.join(" ");
}

/**
 * Skeleton runner. **Always throws.** Exists only to
 * satisfy the SDK's manifest-roles-have-handlers
 * invariant; the actual execute path will replace the
 * `run` body in a future slice once dry-run and opt-in
 * execution land. The handler does NOT spawn any
 * process, read any stdout/stderr, or read source
 * files.
 */
export const verificationRunner: Runner = {
  id: "@rekon/capability-verify.runner",
  produces: ["VerificationRun", "VerificationResult"],
  async run(_input: {
    artifacts: ArtifactReader & ArtifactWriter;
    input?: Record<string, unknown>;
  }): Promise<ArtifactRef[]> {
    throw new Error(
      "@rekon/capability-verify: command execution is not implemented yet. "
      + "The runner skeleton declares the boundary (role: runner, permission: "
      + "execute:verification); the dry-run command lands in the next slice, and "
      + "opt-in execution (`rekon verify run --plan <id> --execute`) lands after "
      + "that. Until then, use `rekon verify record` to record outcomes manually.",
    );
  },
};

export default defineCapability({
  manifest: {
    id: VERIFY_CAPABILITY_ID,
    name: "Verification Runner",
    version: VERIFY_CAPABILITY_VERSION,
    description:
      "Verification runner capability skeleton. v1 declares the runner / execute:verification boundary; command execution is not implemented yet.",
    roles: ["runner"],
    consumes: ["VerificationPlan", "WorkOrder"],
    produces: ["VerificationRun", "VerificationResult"],
    permissions: ["execute:verification", "read:artifacts", "write:artifacts"],
    invalidatedBy: [
      {
        id: "verification-plan.changed",
        description:
          "Re-run on demand when the verification plan changes. Runner is opt-in; no automatic regeneration on `rekon refresh`.",
        inputs: ["VerificationPlan"],
      },
    ],
    compatibility: {
      rekon: "^0.1.0",
    },
  },
  register(registry) {
    registry.runner(verificationRunner);
  },
});
