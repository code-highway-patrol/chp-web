import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, STATUES } from "../_lib/mongo";
import { embed } from "../_lib/embed";
import { requireUser } from "../_lib/auth";
import { slugify } from "../_lib/slug";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();
  const col = db.collection(STATUES);

  if (req.method === "GET") {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const cursor = col
      .find({}, { projection: { embedding: 0 } })
      .sort({ stars: -1, createdAt: -1 })
      .limit(limit);
    const items = await cursor.toArray();
    return res.status(200).json({ items });
  }

  if (req.method === "POST") {
    const user = await requireUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "unauthorized" });

    const { title, body, tags, authorName } = req.body ?? {};
    if (typeof title !== "string" || typeof body !== "string") {
      return res.status(400).json({ error: "title and body required" });
    }

    const slug = slugify(title);
    if (!slug) return res.status(400).json({ error: "title slugged to empty" });

    const existing = await col.findOne({ slug });
    if (existing) return res.status(409).json({ error: "slug already exists" });

    const embedding = await embed(`${title}\n\n${body}`);

    const doc = {
      slug,
      title,
      body,
      tags: Array.isArray(tags) ? tags.slice(0, 12).map(String) : [],
      authorId: user.id,
      authorName: typeof authorName === "string" ? authorName : user.email ?? "anonymous",
      embedding,
      createdAt: new Date(),
      stars: 0,
    };

    await col.insertOne(doc);
    const { embedding: _, ...published } = doc;
    return res.status(201).json(published);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "method not allowed" });
}
