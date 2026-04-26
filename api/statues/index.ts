import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, STATUES } from "../_lib/mongo.js";
import { requireUser } from "../_lib/auth.js";
import { slugify } from "../_lib/slug.js";
import {
  validatePublishPayload,
  type PublishPayload,
  type StatueFile,
} from "../../src/marketplace/validateStatue.js";

type Body = PublishPayload & {
  authorName?: unknown;
};

function asStringArray(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string").slice(0, max);
}

function normalizeFiles(v: unknown): StatueFile[] {
  if (!Array.isArray(v)) return [];
  const out: StatueFile[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const f = item as { path?: unknown; content?: unknown; size?: unknown };
    if (typeof f.path !== "string" || typeof f.content !== "string") continue;
    out.push({
      path: f.path,
      content: f.content,
      size: typeof f.size === "number" ? f.size : f.content.length,
    });
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();
  const col = db.collection(STATUES);

  if (req.method === "GET") {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const items = await col
      .find({}, { projection: { _id: 0 } })
      .sort({ stars: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return res.status(200).json({ items });
  }

  if (req.method === "POST") {
    const user = await requireUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "unauthorized" });

    const b = (req.body ?? {}) as Body;

    const validation = validatePublishPayload(b);
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const slug = slugify(b.title as string);
    if (!slug) return res.status(400).json({ error: "title slugged to empty" });

    const existing = await col.findOne({ slug });
    if (existing) return res.status(409).json({ error: "slug already exists" });

    const files = normalizeFiles(b.files);
    const hasBody = typeof b.body === "string" && (b.body as string).trim().length > 0;
    const hasLawJson = typeof b.lawJson === "string" && (b.lawJson as string).trim().length > 0;

    const doc: Record<string, unknown> = {
      slug,
      title: (b.title as string).trim(),
      description: typeof b.description === "string" ? b.description : "",
      tags: asStringArray(b.tags),
      authorId: user.id,
      authorName:
        typeof b.authorName === "string" && b.authorName.trim()
          ? b.authorName.trim()
          : user.email ?? "anonymous",
      createdAt: new Date(),
      stars: 0,
    };
    if (hasBody) doc.body = b.body;
    if (hasLawJson) doc.lawJson = b.lawJson;
    if (files.length > 0) doc.files = files;
    if (Array.isArray(b.laws)) doc.laws = b.laws;
    if (typeof b.readme === "string" && b.readme.trim()) doc.readme = b.readme;

    await col.insertOne(doc);
    const { _id, ...published } = doc as { _id?: unknown };
    void _id;
    return res.status(201).json(published);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "method not allowed" });
}
