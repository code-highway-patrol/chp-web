import type { VercelRequest, VercelResponse } from "@vercel/node";
import { CLI_AUTH_CODES, ensureCliAuthIndexes, getDb } from "../_lib/mongo.js";
import { requireUser } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const auth = req.headers.authorization;
  const user = await requireUser(auth);
  if (!user || !auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const accessToken = auth.slice(7);

  const body = (req.body ?? {}) as {
    code?: unknown;
    refresh_token?: unknown;
    expires_at?: unknown;
  };

  if (typeof body.code !== "string" || body.code.length < 16) {
    return res.status(400).json({ error: "code is required" });
  }

  const db = await getDb();
  await ensureCliAuthIndexes(db);
  const col = db.collection(CLI_AUTH_CODES);

  const record = await col.findOne({ code: body.code });
  if (!record) return res.status(404).json({ error: "code not found or expired" });
  if (record.status !== "pending") {
    return res.status(409).json({ error: "code already used" });
  }
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    await col.deleteOne({ _id: record._id });
    return res.status(410).json({ error: "code expired" });
  }

  await col.updateOne(
    { _id: record._id },
    {
      $set: {
        status: "completed",
        accessToken,
        refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : null,
        tokenExpiresAt: typeof body.expires_at === "number" ? body.expires_at : null,
        userId: user.id,
        email: user.email ?? null,
        completedAt: new Date(),
      },
    },
  );

  return res.status(200).json({ ok: true });
}
