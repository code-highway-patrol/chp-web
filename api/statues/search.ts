import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, STATUES } from "../_lib/mongo.js";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const body = (req.body ?? {}) as { query?: unknown };
  const q = String(body.query ?? "").trim();
  if (!q) return res.status(200).json({ items: [] });

  const re = new RegExp(escapeRegex(q), "i");
  const db = await getDb();
  const items = await db
    .collection(STATUES)
    .find(
      {
        $or: [
          { title: re },
          { description: re },
          { body: re },
          { tags: re },
          { "laws.intent": re },
          { "laws.name": re },
          { "files.content": re },
          { readme: re },
        ],
      },
      { projection: { _id: 0 } },
    )
    .sort({ stars: -1, createdAt: -1 })
    .limit(50)
    .toArray();

  return res.status(200).json({ items });
}
