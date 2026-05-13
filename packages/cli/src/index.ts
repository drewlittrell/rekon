#!/usr/bin/env node

export const packageName = "@rekon/cli";

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("rekon CLI scaffold");
}
