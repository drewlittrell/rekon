#!/usr/bin/env node

// Canonical distribution smoke. The implementation lives separately so the
// historical command remains stable for contributors and CI.
await import("./install-tarball-smoke.mjs");
