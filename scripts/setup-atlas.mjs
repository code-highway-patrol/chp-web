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

  const total = await col.countDocuments();
  console.log(`=> done. ${total} total statues in ${COLLECTION}.`);
  await client.close();
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exitCode = 1;
});
