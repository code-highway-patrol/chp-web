#!/usr/bin/env node
// Scan every statue's content with VirusTotal once. Results are keyed by a
// sha256 of canonical statue content and persisted to
// src/marketplace/virustotal-results.json so they're "permanent unless the
// statue is updated" — re-running this script is a no-op for statues whose
// content hash is already cached.
//
// Usage:
//   VIRUSTOTAL_API_KEY=... node scripts/virustotal-scan.mjs
//   VIRUSTOTAL_API_KEY=... node scripts/virustotal-scan.mjs --force <slug>

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const STATUES_PATH = resolve(ROOT, "src/marketplace/statues.json");
const RESULTS_PATH = resolve(ROOT, "src/marketplace/virustotal-results.json");

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const onlySlug = argv.filter((a) => !a.startsWith("--"))[0];

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

const API_KEY = process.env.VIRUSTOTAL_API_KEY;
if (!API_KEY) {
  console.error("VIRUSTOTAL_API_KEY missing — set it in .env.local or the environment.");
  process.exit(1);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
    return out;
  }
  return value;
}

function statueHash(s) {
  // Hash *only* the substantive content — title + description + body +
  // lawJson + files[] + readme. Stars/scores/timestamps are excluded so
  // those don't trigger spurious re-scans.
  const payload = canonicalize({
    title: s.title ?? "",
    description: s.description ?? "",
    body: s.body ?? "",
    lawJson: s.lawJson ?? null,
    files: s.files ?? [],
    laws: s.laws ?? [],
    readme: s.readme ?? "",
  });
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function statueBlob(s) {
  // What we submit to VirusTotal. JSON-serialized canonical content — every
  // verify.sh and law.json appears verbatim inside, so engines see the same
  // bytes someone else would download.
  return JSON.stringify(canonicalize({ slug: s.slug, ...s }), null, 2);
}

async function vtFetch(path, init = {}) {
  const url = `https://www.virustotal.com/api/v3${path}`;
  const headers = { "x-apikey": API_KEY, ...(init.headers ?? {}) };
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`VT ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function lookupBySha256(sha256) {
  // If anyone (including us) has uploaded a file with this sha256 before,
  // VT returns its analysis without us re-uploading. This is the cheap
  // path; falls through to upload on 404.
  try {
    const j = await vtFetch(`/files/${sha256}`);
    return j.data;
  } catch (e) {
    if (String(e).includes("404")) return null;
    throw e;
  }
}

async function uploadBlob(blob, name) {
  const fd = new FormData();
  fd.append("file", new Blob([blob], { type: "application/json" }), name);
  const j = await vtFetch("/files", { method: "POST", body: fd });
  return j.data.id; // analysis id
}

async function pollAnalysis(analysisId, { tries = 90, delayMs = 5000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const j = await vtFetch(`/analyses/${analysisId}`);
    const status = j.data.attributes.status;
    if (status === "completed") return j.data;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`analysis ${analysisId} did not complete in time`);
}

function readResults() {
  if (!existsSync(RESULTS_PATH)) return {};
  return JSON.parse(readFileSync(RESULTS_PATH, "utf8"));
}

function writeResults(obj) {
  mkdirSync(dirname(RESULTS_PATH), { recursive: true });
  writeFileSync(RESULTS_PATH, JSON.stringify(obj, null, 2) + "\n");
}

const statues = JSON.parse(readFileSync(STATUES_PATH, "utf8"));
const results = readResults();
const targets = onlySlug ? statues.filter((s) => s.slug === onlySlug) : statues;
if (onlySlug && targets.length === 0) {
  console.error(`no statue with slug "${onlySlug}"`);
  process.exit(1);
}

let done = 0;
let added = 0;
let failed = 0;
for (const statue of targets) {
  const hash = statueHash(statue);
  if (!force && results[hash]) {
    console.log(`✓ ${statue.slug} (cached, hash=${hash.slice(0, 12)})`);
    done++;
    continue;
  }

  console.log(`→ ${statue.slug} (hash=${hash.slice(0, 12)})`);
  try {
    const blob = statueBlob(statue);
    const sha256 = createHash("sha256").update(blob).digest("hex");

    let fileData = await lookupBySha256(sha256);
    if (!fileData) {
      const analysisId = await uploadBlob(blob, `${statue.slug}.json`);
      console.log(`  uploaded → analysis ${analysisId.slice(0, 16)}…`);
      await pollAnalysis(analysisId);
      fileData = await lookupBySha256(sha256);
      if (!fileData) throw new Error("upload did not surface a file record");
    } else {
      console.log(`  reused existing VT file record`);
    }

    const stats = fileData.attributes.last_analysis_stats ?? {};
    results[hash] = {
      slug: statue.slug,
      sha256,
      contentHash: hash,
      scannedAt: new Date().toISOString(),
      stats: {
        malicious: stats.malicious ?? 0,
        suspicious: stats.suspicious ?? 0,
        harmless: stats.harmless ?? 0,
        undetected: stats.undetected ?? 0,
        timeout: stats.timeout ?? 0,
      },
      permalink: `https://www.virustotal.com/gui/file/${sha256}`,
    };
    writeResults(results);
    added++;
    done++;
  } catch (err) {
    console.log(`  ✗ ${err.message}`);
    failed++;
  }
  await new Promise((r) => setTimeout(r, 1500));
}

console.log(`\nscanned ${done}/${targets.length} statues (${added} new, ${done - added} cached, ${failed} failed — re-run to retry)`);
