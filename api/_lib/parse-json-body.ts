import type { VercelRequest } from "@vercel/node";

/**
 * Vercel's Node runtime usually parses JSON POST bodies into objects, but
 * `req.body` can be a raw string or Buffer depending on config and proxies.
 */
export function getJsonBody(req: VercelRequest): unknown {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      return raw.trim() ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(raw)) {
    try {
      const s = raw.toString("utf8");
      return s.trim() ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw;
  return {};
}
