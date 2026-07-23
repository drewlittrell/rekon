import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { createSourceStateBinding } from "@rekon/kernel-artifacts";
import {
  createPlacementVerificationReport,
  signPlacementVerificationReport,
  validatePlacementVerificationReport,
  verifyPlacementVerificationAttestation,
} from "../dist/index.js";

const sourceDigest = "a".repeat(64);
const contractRef = {
  type: "FlowContract",
  id: "experience-flow",
  schemaVersion: "1.0.0",
};

function report(overrides = {}) {
  const sourceState = createSourceStateBinding({
    baseRef: "0123456789abcdef",
    files: [{
      path: "src/nlu/vocabulary.ts",
      status: "modified",
      beforeSha256: "b".repeat(64),
      afterSha256: sourceDigest,
    }],
  });
  return {
    header: {
      artifactType: "PlacementVerificationReport",
      artifactId: "placement-review-1",
      schemaVersion: "1.0.0",
      generatedAt: "2026-07-23T12:00:00.000Z",
      subject: {
        repoId: "fixture",
        paths: ["src/nlu/vocabulary.ts"],
      },
      producer: {
        id: "@rekon/test.independent-placement-judge",
        version: "1.0.0",
      },
      inputRefs: [contractRef],
      freshness: { status: "fresh" },
      provenance: {
        confidence: 1,
        notes: ["Independent source review."],
      },
    },
    task: {
      text: "Support a new compositional phrase.",
      paths: ["src/nlu/vocabulary.ts"],
    },
    obligation: {
      id: "constraint:experience-flow.stage.atomize.responsibility.1",
      assertion: "Map reusable tokens to atomic concepts; never store complete phrase aliases.",
      contractRef,
      flowId: "experience-flow",
      stageId: "atomize",
      stagePaths: ["src/nlu/atomize.ts", "src/nlu/vocabulary.ts"],
      changedSourcePaths: ["src/nlu/vocabulary.ts"],
    },
    sourceState,
    sourceEvidence: [{
      path: "src/nlu/vocabulary.ts",
      sha256: sourceDigest,
      lineStart: 1,
      lineEnd: 5,
      excerpt: "export const ATOMIC_VOCABULARY = { /* reviewed source */ };",
    }],
    verdict: "refuted",
    explanation: "The changed key stores a complete phrase instead of an atomic token.",
    verifier: {
      kind: "model",
      id: "codex-independent-placement-judge",
      version: "1.0.0",
      independentOf: ["rekon-managed-agent"],
    },
    ...overrides,
  };
}

test("placement verification normalizes and validates source-bound independent proof", () => {
  const value = createPlacementVerificationReport(report());

  assert.equal(value.sourceState.digest.length, 64);
  assert.equal(value.obligation.contractRef.id, contractRef.id);
  assert.deepEqual(value.verifier.independentOf, ["rekon-managed-agent"]);
  assert.equal(validatePlacementVerificationReport(value).ok, true);
});

test("placement verification rejects evidence detached from the reviewed source state", () => {
  const value = report({
    sourceEvidence: [{
      path: "src/nlu/vocabulary.ts",
      sha256: "c".repeat(64),
      lineStart: 1,
      lineEnd: 5,
      excerpt: "detached source",
    }],
  });
  const validation = validatePlacementVerificationReport(value);

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.some((issue) =>
    issue.path.endsWith(".sha256") && /source-state file digest/u.test(issue.message)));
});

test("placement verification rejects self-described independence", () => {
  const value = report({
    verifier: {
      kind: "model",
      id: "rekon-managed-agent",
      version: "1.0.0",
      independentOf: ["rekon-managed-agent"],
    },
  });
  const validation = validatePlacementVerificationReport(value);

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.some((issue) =>
    issue.path === "$.verifier.independentOf" && /independent of itself/u.test(issue.message)));
});

test("placement verification accepts a trusted Ed25519 attestation", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const signed = signPlacementVerificationReport(
    createPlacementVerificationReport(report()),
    {
      algorithm: "ed25519",
      keyId: "placement-judge-1",
      privateKeyPkcs8: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
    },
  );
  const trust = verifyPlacementVerificationAttestation(signed, [{
    algorithm: "ed25519",
    keyId: "placement-judge-1",
    verifierId: signed.verifier.id,
    publicKeySpki: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
  }]);

  assert.deepEqual(trust, {
    trusted: true,
    keyId: "placement-judge-1",
    verifierId: signed.verifier.id,
  });
});

test("placement verification rejects unsigned, tampered, and untrusted attestations", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const unsigned = createPlacementVerificationReport(report());
  assert.deepEqual(
    verifyPlacementVerificationAttestation(unsigned, []),
    { trusted: false, reason: "attestation-missing" },
  );

  const signed = signPlacementVerificationReport(unsigned, {
    algorithm: "ed25519",
    keyId: "placement-judge-1",
    privateKeyPkcs8: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
  });
  assert.deepEqual(
    verifyPlacementVerificationAttestation(signed, []),
    { trusted: false, reason: "trusted-key-missing" },
  );

  const trustedKeys = [{
    algorithm: "ed25519",
    keyId: "placement-judge-1",
    verifierId: signed.verifier.id,
    publicKeySpki: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
  }];
  const tampered = {
    ...signed,
    explanation: `${signed.explanation} Tampered after signing.`,
  };
  assert.deepEqual(
    verifyPlacementVerificationAttestation(tampered, trustedKeys),
    { trusted: false, reason: "payload-digest-mismatch" },
  );
});
