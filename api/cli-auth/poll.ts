import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, timingSafeEqual } from "node:crypto";
import { CLI_AUTH_CODES, ensureCliAuthIndexes, getDb } from "../_lib/mongo.js";

function hexEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const verifier = typeof req.query.verifier === "string" ? req.query.verifier : "";
  if (!code || !verifier) {
    return res.status(400).json({ error: "code and verifier are required" });
  }

  const db = await getDb();
  await ensureCliAuthIndexes(db);
  const col = db.collection(CLI_AUTH_CODES);

  const record = await col.findOne({ code });
  if (!record) return res.status(404).json({ status: "not_found" });

  const expectedHash = createHash("sha256").update(verifier).digest("hex");
  if (!hexEqual(expectedHash, String(record.verifierHash ?? ""))) {
    return res.status(403).json({ error: "verifier mismatch" });
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    await col.deleteOne({ _id: record._id });
    return res.status(410).json({ status: "expired" });
  }

  if (record.status !== "completed") {
    return res.status(202).json({ status: "pending" });
  }

  await col.deleteOne({ _id: record._id });

  return res.status(200).json({
    status: "completed",
    access_token: record.accessToken,
    refresh_token: record.refreshToken ?? null,
    expires_at: record.tokenExpiresAt ?? null,
    email: record.email ?? null,
    user_id: record.userId ?? null,
  });
}
