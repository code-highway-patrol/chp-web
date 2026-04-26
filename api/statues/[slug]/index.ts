import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, STATUES } from "../../_lib/mongo.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }

  const slug = String(req.query.slug ?? "");
  if (!slug) return res.status(400).json({ error: "slug required" });

  const db = await getDb();
  const statue = await db.collection(STATUES).findOne({ slug }, { projection: { _id: 0 } });
  if (!statue) return res.status(404).json({ error: "not found" });
  return res.status(200).json(statue);
}
