import { MongoClient } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const COLLECTION = "statues";
const INDEX_NAME = "statues_vector_index";
const MODEL = "gemini-embedding-001";
const OUTPUT_DIMS = 768;

const STARTER = [
  {
    title: "TypeScript: no any, ever",
    body: `# typescript-strict
- never use \`any\` — prefer \`unknown\` and narrow with type guards
- no implicit any in function params or return types
- prefer \`type\` over \`interface\` unless declaration merging is needed
- enable strict, noUnusedLocals, noUnusedParameters in tsconfig`,
    tags: ["typescript", "strict", "types"],
    authorName: "patrol",
  },
  {
    title: "React hooks discipline",
    body: `# react-hooks
- never call hooks inside conditionals or loops
- exhaustive deps in useEffect — no //@ts-ignore on the lint warning
- prefer useCallback/useMemo only when there's a measured perf reason
- custom hooks must start with \`use\` and return stable references`,
    tags: ["react", "hooks", "frontend"],
    authorName: "patrol",
  },
  {
    title: "Every async function needs a timeout",
    body: `# async-timeouts
- every async fn that hits the network must specify a timeout
- prefer AbortController over Promise.race patterns
- default timeout: 10s for user-facing, 30s for background
- log timeouts as warnings, not errors — they're expected at the tail`,
    tags: ["async", "reliability", "network"],
    authorName: "patrol",
  },
  {
    title: "No speculative abstractions",
    body: `# no-speculation
- three similar lines beats a premature factory
- don't add config knobs for hypothetical future requirements
- delete dead code paths instead of feature-flagging them
- when in doubt: inline the duplication, refactor when the third caller appears`,
    tags: ["architecture", "yagni", "discipline"],
    authorName: "patrol",
  },
  {
    title: "Match existing test style",
    body: `# test-style
- read 2-3 nearby tests before writing a new one
- match assertion library (don't mix expect / assert / chai)
- match describe/it nesting conventions
- new test files copy the imports + setup of the closest sibling`,
    tags: ["testing", "consistency"],
    authorName: "patrol",
  },
  {
    title: "No console.log in committed code",
    body: `# no-console
- console.log is for debugging — strip before commit
- exception: console.error in error boundaries and top-level catches
- exception: a single startup banner in CLI tools
- use a real logger (pino, winston, structured logs) for anything else`,
    tags: ["hygiene", "logging"],
    authorName: "patrol",
  },
  {
    title: "Semantic commits, no emoji",
    body: `# commits
- imperative mood: "fix login redirect" not "fixed login redirect"
- subject line under 60 chars
- no emoji, no scope prefixes (feat:, fix:) unless the team adopts them
- body explains the why, not the what`,
    tags: ["git", "commits", "style"],
    authorName: "patrol",
  },
  {
    title: "Python type hints everywhere",
    body: `# python-types
- every function signature has type hints — params and return
- prefer \`X | None\` over \`Optional[X]\` (PEP 604)
- run mypy or pyright in CI; treat warnings as errors
- use \`Sequence\` over \`list\` for params, \`list\` for returns`,
    tags: ["python", "types", "strict"],
    authorName: "patrol",
  },
  {
    title: "Error boundaries at route level",
    body: `# error-boundaries
- every top-level route gets an error boundary
- error boundaries log to your observability stack, then render a fallback
- never catch + ignore — at minimum, surface to the user
- do not nest error boundaries unless you need granular fallbacks`,
    tags: ["react", "errors", "reliability"],
    authorName: "patrol",
  },
  {
    title: "SQL: no select star in production code",
    body: `# sql-explicit-columns
- always list columns explicitly in SELECT
- breaks loudly when schema drifts instead of silently passing extra fields
- exception: ad-hoc analysis queries in notebooks
- pair with a code review check for new SELECT * additions`,
    tags: ["sql", "database", "discipline"],
    authorName: "patrol",
  },
  {
    title: "Bash strict mode",
    body: `# bash-strict
- every script starts with: set -euo pipefail
- IFS=$'\\n\\t' to avoid word-splitting surprises
- quote every variable expansion: "$var" not $var
- prefer [[ ]] over [ ] for conditionals`,
    tags: ["bash", "shell", "scripts"],
    authorName: "ops",
  },
  {
    title: "REST status codes that mean what they say",
    body: `# rest-status-codes
- 200 OK only when the body contains the resource
- 201 Created on POST that creates; include Location header
- 204 No Content on successful delete
- never 200 with { "error": ... } body — use 4xx`,
    tags: ["rest", "api", "http"],
    authorName: "platform",
  },
  {
    title: "Migrations are append-only",
    body: `# migrations
- never edit a committed migration; write a new one
- forward + reverse must both be tested locally
- no data backfills inside a schema migration — separate scripts
- name files with timestamp prefix so order is unambiguous`,
    tags: ["database", "migrations", "ops"],
    authorName: "platform",
  },
  {
    title: "Pin Docker base images by digest",
    body: `# docker-pinning
- pin base images by sha256 digest, not by floating tag
- floating tags (\`:latest\`, \`:20\`) silently break reproducibility
- update digests in PRs you can review, not in builds you can't
- Renovate/Dependabot can automate digest bumps`,
    tags: ["docker", "supply-chain", "reproducibility"],
    authorName: "secops",
  },
  {
    title: "No magic numbers",
    body: `# magic-numbers
- extract repeated literals to named constants
- exception: 0, 1, -1, and obvious indexes (arr[0])
- units belong in the name: TIMEOUT_MS not TIMEOUT
- if a number needs a comment to explain it, name it instead`,
    tags: ["readability", "constants"],
    authorName: "patrol",
  },
  {
    title: "Treat warnings as errors in CI",
    body: `# warnings-are-errors
- compiler warnings, lint warnings, deprecation notices — all fail CI
- new warnings should be impossible to merge, not just discouraged
- if a warning is a false positive, suppress it inline with a comment explaining why
- weekly: review the suppression list and remove stale ones`,
    tags: ["ci", "lint", "discipline"],
    authorName: "platform",
  },
  {
    title: "Structured logging only",
    body: `# structured-logging
- log records are objects, not strings — use a real logger (pino/winston/structlog)
- every log line has: level, timestamp, request_id, event
- never log secrets, tokens, or full request bodies — redact at the logger
- include enough context to debug without re-running the request`,
    tags: ["logging", "observability"],
    authorName: "ops",
  },
  {
    title: "Feature flag risky changes",
    body: `# feature-flags
- any change touching shared infra ships behind a flag
- flags default off, opt in by team or % rollout
- delete the flag within 2 weeks of full rollout — flags are debt
- never use flags for permissions; use a real authz system`,
    tags: ["release", "feature-flags", "rollout"],
    authorName: "release",
  },
  {
    title: "CSS: no !important without a comment",
    body: `# css-important
- !important is almost always covering up a specificity bug
- if you must use it, leave a comment explaining why it can't be solved with cascade
- audit existing !important during refactors — most can be removed
- no !important in design system primitives, ever`,
    tags: ["css", "design-system"],
    authorName: "frontend",
  },
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

async function main() {
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(env.MONGODB_DB || "marketplace");
  const col = db.collection(COLLECTION);

  console.log("=> embedding starter statues with", MODEL);
  const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const docs = [];
  for (const s of STARTER) {
    const slug = slugify(s.title);
    const existing = await col.findOne({ slug });
    if (existing) {
      console.log("   skip", slug, "(exists)");
      continue;
    }
    const { embedding } = await model.embedContent({
      content: { role: "user", parts: [{ text: `${s.title}\n\n${s.body}` }] },
      outputDimensionality: OUTPUT_DIMS,
    });
    docs.push({
      slug,
      title: s.title,
      body: s.body,
      tags: s.tags,
      authorId: "system",
      authorName: s.authorName,
      embedding: embedding.values,
      createdAt: new Date(),
      stars: Math.floor(Math.random() * 40) + 5,
    });
    console.log("   embedded", slug, `(${embedding.values.length} dims)`);
  }

  if (docs.length) {
    await col.insertMany(docs);
    console.log(`=> inserted ${docs.length} statues`);
  }

  console.log("=> ensuring vector search index");
  const indexes = await col.listSearchIndexes().toArray();
  const exists = indexes.find((i) => i.name === INDEX_NAME);
  if (exists) {
    console.log(`   index "${INDEX_NAME}" already exists (status: ${exists.status})`);
  } else {
    await col.createSearchIndex({
      name: INDEX_NAME,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: 768,
            similarity: "cosine",
          },
          { type: "filter", path: "tags" },
        ],
      },
    });
    console.log(`   created index "${INDEX_NAME}" — building takes ~30s`);
  }

  console.log("=> seeding stars + recomputing counts");
  const stars = db.collection("stars");
  await stars.createIndex({ statueId: 1, userId: 1 }, { unique: true });

  const allStatues = await col.find({}, { projection: { _id: 1, slug: 1 } }).toArray();
  const SEED_USERS = Array.from({ length: 60 }, (_, i) => `system-${String(i + 1).padStart(3, "0")}`);

  for (const s of allStatues) {
    const existingForStatue = await stars.countDocuments({ statueId: s._id });
    const targetCount = Math.floor(seedCountFor(s.slug));
    if (existingForStatue >= targetCount) {
      await col.updateOne({ _id: s._id }, { $set: { stars: existingForStatue } });
      console.log(`   ${s.slug}: ${existingForStatue} stars (kept)`);
      continue;
    }

    const need = targetCount - existingForStatue;
    const usedUsers = await stars.distinct("userId", { statueId: s._id });
    const pool = SEED_USERS.filter((u) => !usedUsers.includes(u));
    const picks = shuffle(pool).slice(0, need);

    if (picks.length) {
      await stars.insertMany(
        picks.map((userId) => ({
          statueId: s._id,
          userId,
          createdAt: randomPastDate(),
        }))
      );
    }

    const total = existingForStatue + picks.length;
    await col.updateOne({ _id: s._id }, { $set: { stars: total } });
    console.log(`   ${s.slug}: ${total} stars`);
  }

  const total = await col.countDocuments();
  console.log(`=> done. ${total} total statues in ${COLLECTION}.`);
  await client.close();
}

function seedCountFor(slug) {
  // deterministic-ish star count seeded from slug, range ~5-55
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return 8 + (Math.abs(h) % 48);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomPastDate() {
  const days = Math.floor(Math.random() * 90);
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exitCode = 1;
});
