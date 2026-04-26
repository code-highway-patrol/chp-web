#!/usr/bin/env node
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

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const col = client.db(process.env.MONGODB_DB || "marketplace").collection("statues");
const all = await col.find({}, { projection: { slug: 1, title: 1, createdAt: 1 } }).toArray();
all.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
console.log(`Count: ${all.length}`);
for (const s of all) console.log(`  ${s.slug} | ${s.title} | ${s.createdAt}`);
await client.close();
