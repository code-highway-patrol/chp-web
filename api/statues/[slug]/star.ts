import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, STATUES, STARS } from "../../_lib/mongo.js";
import { requireUser } from "../../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const user = await requireUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const slug = String(req.query.slug ?? "");
  if (!slug) return res.status(400).json({ error: "slug required" });

  const db = await getDb();
  const statue = await db
    .collection(STATUES)
    .findOne({ slug }, { projection: { _id: 1, stars: 1 } });
  if (!statue) return res.status(404).json({ error: "not found" });

  const stars = db.collection(STARS);
  const existing = await stars.findOne({
    statueId: statue._id,
    userId: user.id,
  });

  if (existing) {
    await stars.deleteOne({ _id: existing._id });
    const r = await db
      .collection(STATUES)
      .findOneAndUpdate(
        { _id: statue._id },
        { $inc: { stars: -1 } },
        { returnDocument: "after", projection: { stars: 1 } }
      );
    return res.status(200).json({ hasStarred: false, stars: r?.stars ?? 0 });
  }

  await stars.insertOne({
    statueId: statue._id,
    userId: user.id,
    createdAt: new Date(),
  });
  const r = await db
    .collection(STATUES)
    .findOneAndUpdate(
      { _id: statue._id },
      { $inc: { stars: 1 } },
      { returnDocument: "after", projection: { stars: 1 } }
    );
  return res.status(200).json({ hasStarred: true, stars: r?.stars ?? 0 });
}
