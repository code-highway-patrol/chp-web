#!/usr/bin/env node
// One-shot migration: push src/marketplace/statues.json into the `statues`
// collection. Idempotent — upserts by slug, so running it twice is a no-op
// for unchanged rows.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const STATUES_PATH = resolve(ROOT, "src/marketplace/statues.json");

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = resolve(ROOT, f);
    if (!existsSync(p)) continue;
    for (const raw of readFileSync(p, "utf8").split("\n")) {
      const m = raw.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}
loadEnv();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "marketplace";
if (!uri) {
  console.error("MONGODB_URI missing — set it in .env.local");
  process.exit(1);
}

const statues = JSON.parse(readFileSync(STATUES_PATH, "utf-8"));
console.log(`Source: ${STATUES_PATH} (${statues.length} statues)`);

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
await client.connect();
const col = client.db(dbName).collection("statues");

await col.createIndex({ slug: 1 }, { unique: true });
await col.createIndex({ stars: -1, createdAt: -1 });

let inserted = 0;
let updated = 0;
let unchanged = 0;

for (const statue of statues) {
  const { _id, ...payload } = statue;
  void _id;
  // Convert createdAt to a real Date so $sort behaves predictably.
  if (typeof payload.createdAt === "string") {
    const d = new Date(payload.createdAt);
    if (!Number.isNaN(d.getTime())) payload.createdAt = d;
  }

  const existing = await col.findOne({ slug: payload.slug });
  if (!existing) {
    await col.insertOne(payload);
    inserted++;
    console.log(`  + ${payload.slug}`);
    continue;
  }

  // Drop _id and timestamps that Mongo manages from comparison
  const { _id: _, createdAt: __, ...existingCmp } = existing;
  const { createdAt: ___, ...payloadCmp } = payload;
  void _; void __; void ___;

  if (JSON.stringify(existingCmp) === JSON.stringify(payloadCmp)) {
    unchanged++;
    continue;
  }

  await col.updateOne({ slug: payload.slug }, { $set: payload });
  updated++;
  console.log(`  ~ ${payload.slug}`);
}

const total = await col.countDocuments();
console.log(`\nDone. ${inserted} inserted, ${updated} updated, ${unchanged} unchanged. Collection now has ${total} statues.`);

await client.close();
