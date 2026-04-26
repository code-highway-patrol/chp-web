import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Document } from "mongodb";
import { getDb, STATUES } from "../_lib/mongo.js";
import { embed } from "../_lib/embed.js";
import { requireUser } from "../_lib/auth.js";
import { slugify } from "../_lib/slug.js";
import { normalizeLawJsonInput } from "../_lib/law-json.js";
import { getJsonBody } from "../_lib/parse-json-body.js";
import { serializeStatue } from "../_lib/statue-serialize.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();
  const col = db.collection(STATUES);

  if (req.method === "GET") {
    const limit = Math.min(Number(req.query.limit) || 12, 50);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const items = await col
      .find({}, { projection: { embedding: 0 } })
      .sort({ stars: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit + 1)
      .toArray();
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    return res.status(200).json({
      items: items.map((d) => serializeStatue(d)),
      hasMore,
      skip,
      limit,
    });
  }

  if (req.method === "POST") {
    const user = await requireUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "unauthorized" });

    const payload = getJsonBody(req) as Record<string, unknown>;
    const { title, body: guidanceMd, lawJson, tags, authorName } = payload;
    if (typeof title !== "string" || typeof guidanceMd !== "string") {
      return res.status(400).json({ error: "title and body required" });
    }

    const lawPayload =
      typeof lawJson === "string"
        ? lawJson
        : lawJson !== null && typeof lawJson === "object"
          ? JSON.stringify(lawJson)
          : lawJson;
    const law = normalizeLawJsonInput(lawPayload);
    if (!law.ok) return res.status(400).json({ error: law.error });

    const slug = slugify(title);
    if (!slug) return res.status(400).json({ error: "title slugged to empty" });

    const existing = await col.findOne({ slug });
    if (existing) return res.status(409).json({ error: "slug already exists" });

    const embedding = await embed(`${title}\n\n${guidanceMd}\n\n${law.json}`);

    const doc = {
      slug,
      title,
      body: guidanceMd,
      lawJson: law.json,
      tags: Array.isArray(tags) ? tags.slice(0, 12).map(String) : [],
      authorId: user.id,
      authorName: typeof authorName === "string" ? authorName : user.email ?? "anonymous",
      embedding,
      createdAt: new Date(),
      stars: 0,
    };

    await col.insertOne(doc);
    return res.status(201).json(serializeStatue(doc as Document));
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "method not allowed" });
}
