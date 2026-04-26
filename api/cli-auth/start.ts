import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "node:crypto";
import { CLI_AUTH_CODES, ensureCliAuthIndexes, getDb } from "../_lib/mongo.js";

const CODE_TTL_SECONDS = 600;

function isHex64(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{64}$/i.test(v);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const body = (req.body ?? {}) as { verifier_hash?: unknown };
  if (!isHex64(body.verifier_hash)) {
    return res.status(400).json({ error: "verifier_hash must be a 64-char hex SHA-256" });
  }

  const db = await getDb();
  await ensureCliAuthIndexes(db);

  const code = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_SECONDS * 1000);

  await db.collection(CLI_AUTH_CODES).insertOne({
    code,
    verifierHash: body.verifier_hash.toLowerCase(),
    status: "pending",
    createdAt: now,
    expiresAt,
  });

  const origin =
    process.env.PUBLIC_APP_URL ??
    (req.headers["x-forwarded-host"]
      ? `https://${req.headers["x-forwarded-host"]}`
      : `https://${req.headers.host ?? "pinkdonut.work"}`);

  return res.status(200).json({
    code,
    verification_url: `${origin}/cli-auth?code=${code}`,
    expires_in: CODE_TTL_SECONDS,
  });
}
