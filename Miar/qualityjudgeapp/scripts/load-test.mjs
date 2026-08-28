#!/usr/bin/env node
// Load-test skeleton using autocannon.
//
// This is a starting point for real load-test infrastructure (which, per
// the platform audit, ultimately requires running against a real
// staging environment with production-like data volume — not something
// this sandbox can produce). It exercises the app's public read
// endpoints so you have a repeatable script to run against a staging
// deployment and record real throughput/latency numbers.
//
// Usage:
//   node scripts/load-test.mjs [baseUrl] [durationSeconds] [connections]
//
// Example:
//   node scripts/load-test.mjs https://staging.example.com 30 50
//
// Requires the optional dev dependency "autocannon" — install it first:
//   pnpm add -D autocannon

import { fileURLToPath } from "node:url";

async function main() {
  let autocannon;
  try {
    ({ default: autocannon } = await import("autocannon"));
  } catch {
    console.error(
      'The "autocannon" package is not installed. Run `pnpm add -D autocannon` first, then re-run this script.'
    );
    process.exit(1);
  }

  const baseUrl = process.argv[2] || "http://localhost:3000";
  const duration = Number(process.argv[3] || 30);
  const connections = Number(process.argv[4] || 20);

  const targets = [
    { title: "Awards catalog (REST v1)", url: `${baseUrl}/api/v1/awards` },
    { title: "OpenAPI spec", url: `${baseUrl}/api/v1/openapi.json` },
  ];

  for (const target of targets) {
    console.log(`\n=== ${target.title}: ${target.url} ===`);
    const result = await autocannon({
      url: target.url,
      duration,
      connections,
    });
    console.log(autocannon.printResult(result));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
