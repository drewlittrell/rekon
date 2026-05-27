// Intentionally malformed source to exercise the regex
// fallback path. The TypeScript parser handles many
// syntactic errors gracefully (it still produces a
// SourceFile), so this file is contrived to produce
// recoverable diagnostics rather than a hard throw. We
// keep this file so the fixture explicitly documents
// the AST-tolerant + regex-fallback contract for the
// rare hard-failure case.

export function valid() {}

@@@ this is not valid syntax @@@

export const stillSeen = 1;
