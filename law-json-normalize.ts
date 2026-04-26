export type NormalizeLawJsonResult =
  | { ok: true; json: string }
  | { ok: false; error: string };

/** Validates publishable law.json text: non-empty string, parseable JSON, top-level object. */
export function normalizeLawJsonInput(raw: unknown): NormalizeLawJsonResult {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "lawJson required" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return { ok: false, error: "lawJson must be valid JSON" };
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return { ok: false, error: "lawJson must be a JSON object" };
  }
  return { ok: true, json: JSON.stringify(parsed) };
}
