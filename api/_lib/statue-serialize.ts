import type { Document } from "mongodb";

/**
 * Strip embeddings from API responses. Coerce `lawJson` to a string so the
 * client always receives the same shape as dev (Mongo may store nested objects
 * if inserted outside this app).
 */
export function serializeStatue(doc: Document): Document {
  const out: Document = { ...doc };
  delete out.embedding;
  const { lawJson } = out;
  if (lawJson === null || lawJson === undefined) return out;
  if (typeof lawJson === "string") return out;
  if (typeof lawJson === "object") {
    out.lawJson = JSON.stringify(lawJson);
    return out;
  }
  out.lawJson = String(lawJson);
  return out;
}
