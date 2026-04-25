import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, STATUES, STARS } from "../../_lib/mongo.js";
import { optionalUser } from "../../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }

  const slug = String(req.query.slug ?? "");
  if (!slug) return res.status(400).json({ error: "slug required" });

  const db = await getDb();
  const statue = await db
    .collection(STATUES)
    .findOne({ slug }, { projection: { embedding: 0 } });

  if (!statue) return res.status(404).json({ error: "not found" });

  const user = await optionalUser(req.headers.authorization);
  let hasStarred = false;
  if (user) {
    const star = await db.collection(STARS).findOne({
      statueId: statue._id,
      userId: user.id,
    });
    hasStarred = !!star;
  }

  return res.status(200).json({ ...statue, hasStarred });
}
