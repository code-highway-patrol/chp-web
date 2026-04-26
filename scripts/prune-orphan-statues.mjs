#!/usr/bin/env node
// One-shot cleanup: delete any statue in Mongo whose slug is NOT in
// src/marketplace/statues.json. Use this AT MOST ONCE — after publishing
// goes live, statues only in Mongo are real, not stale, and this would
// destroy them.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env"]) {
  const p = resolve(ROOT, f);
  if (!existsSync(p)) continue;
  for (const raw of readFileSync(p, "utf8").split("\n")) {
    const m = raw.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const statuesJsonPath = resolve(ROOT, "src/marketplace/statues.json");
const sourceSlugs = new Set(JSON.parse(readFileSync(statuesJsonPath, "utf-8")).map((s) => s.slug));
console.log(`Source has ${sourceSlugs.size} canonical slugs`);

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const col = client.db(process.env.MONGODB_DB || "marketplace").collection("statues");

const all = await col.find({}, { projection: { slug: 1 } }).toArray();
const orphans = all.filter((s) => !sourceSlugs.has(s.slug)).map((s) => s.slug);

if (orphans.length === 0) {
  console.log("No orphans to prune.");
} else {
  console.log(`Pruning ${orphans.length} orphan slugs:`);
  orphans.forEach((s) => console.log(`  - ${s}`));
  if (process.argv.includes("--apply")) {
    const result = await col.deleteMany({ slug: { $in: orphans } });
    console.log(`Deleted ${result.deletedCount}`);
  } else {
    console.log("\n(dry run — re-run with --apply to actually delete)");
  }
}

const finalCount = await col.countDocuments();
console.log(`Final count: ${finalCount}`);
await client.close();
