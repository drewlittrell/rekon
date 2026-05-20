import type { ArtifactRef } from "@rekon/kernel-artifacts";
import {
  type VerificationRun,
  assertVerificationRun,
  createVerificationRun,
  validateVerificationRun,
} from "@rekon/capability-intent";
import {
  type ArtifactReader,
  type ArtifactWriter,
  type Runner,
  defineCapability,
} from "@rekon/sdk";

/**
 * `@rekon/capability-verify` skeleton (P1.1
 * verification-runner-v1).
 *
 * **No command execution is implemented in this slice.**
 * The skeleton exists so the dangerous boundary — the
 * `"runner"` role + `execute:verification` permission —
 * is declared, conformance-tested, and visible to
 * manifest review before any execute code lands. A
 * future slice adds the dry-run command (`rekon verify
 * run --plan <id> --dry-run`); a later slice adds
 * opt-in execution (`--execute`) implementing the
 * safety contract pinned in
 * [`docs/strategy/verification-runner-v1-decision.md`](../../../docs/strategy/verification-runner-v1-decision.md).
 *
 * Importing `@rekon/capability-verify` does not enable
 * execution. The runner handler throws when invoked.
 * The handler exists only to satisfy the SDK's
 * "manifest roles must have handlers" invariant.
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
  type VerificationRun,
  assertVerificationRun,
  createVerificationRun,
  validateVerificationRun,
};

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
