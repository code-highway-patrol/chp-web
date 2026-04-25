import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, STATUES, VECTOR_INDEX } from "../_lib/mongo.js";
import { embed } from "../_lib/embed.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const { query } = req.body ?? {};
  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query required" });
  }

  const queryVector = await embed(query.trim());

  const db = await getDb();
  const results = await db
    .collection(STATUES)
    .aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: "embedding",
          queryVector,
          numCandidates: 100,
          limit: 24,
        },
      },
      {
        $project: {
          embedding: 0,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ])
    .toArray();

  return res.status(200).json({ items: results });
}
