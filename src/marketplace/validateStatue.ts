// Validation rules for a publish payload. Pure, no I/O — same module is
// imported on both the client (the publish form) and the server (the POST
// /api/statues handler) so the rules can't drift.

export type StatueFile = { path: string; content: string; size?: number };

export type PublishPayload = {
  title?: unknown;
  description?: unknown;
  tags?: unknown;
  body?: unknown;
  lawJson?: unknown;
  files?: unknown;
  laws?: unknown;
  readme?: unknown;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

const LAW_NAME_RE = /^[a-z][a-z0-9-]{1,63}$/;
const VALID_SEVERITIES = new Set(["error", "warn", "info"]);
const REQUIRED_LAW_FILES = ["law.json", "verify.sh", "guidance.md"] as const;

function err(error: string): ValidationResult {
  return { ok: false, error };
}

// Parse a law.json (object or stringified) and surface the issues that would
// stop the chp CLI from accepting it.
function validateLawJson(raw: unknown, lawDirName?: string): ValidationResult {
  let parsed: unknown;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return err(`law.json${lawDirName ? ` for ${lawDirName}` : ""} is not valid JSON`);
    }
  } else if (raw && typeof raw === "object") {
    parsed = raw;
  } else {
    return err(`law.json${lawDirName ? ` for ${lawDirName}` : ""} is missing or not an object`);
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.name !== "string" || !LAW_NAME_RE.test(obj.name)) {
    return err(
      `law.json${lawDirName ? ` for ${lawDirName}` : ""} needs a "name" matching /^[a-z][a-z0-9-]{1,63}$/`,
    );
  }
  if (lawDirName && obj.name !== lawDirName) {
    return err(`law.json "name" (${obj.name}) must match its folder name (${lawDirName})`);
  }
  if (typeof obj.severity !== "string" || !VALID_SEVERITIES.has(obj.severity)) {
    return err(`law.json${lawDirName ? ` for ${lawDirName}` : ""} "severity" must be one of: ${[...VALID_SEVERITIES].join(", ")}`);
  }
  if (!Array.isArray(obj.hooks) || obj.hooks.length === 0) {
    return err(`law.json${lawDirName ? ` for ${lawDirName}` : ""} needs a non-empty "hooks" array`);
  }
  for (const h of obj.hooks) {
    if (typeof h !== "string" || !h.trim()) {
      return err(`law.json${lawDirName ? ` for ${lawDirName}` : ""} "hooks" entries must be non-empty strings`);
    }
  }
  return { ok: true };
}

function validateFiles(files: unknown): ValidationResult {
  if (!Array.isArray(files)) return err("files must be an array");
  if (files.length === 0) return err("files[] is empty");

  // Group by top-level dir; collect every basename per dir.
  const byLaw = new Map<string, Map<string, StatueFile>>();
  let infoCount = 0;

  for (const f of files) {
    if (!f || typeof f !== "object") return err("each entry in files[] must be an object");
    const entry = f as { path?: unknown; content?: unknown };
    if (typeof entry.path !== "string" || !entry.path.trim()) {
      return err("each file must have a non-empty string path");
    }
    if (typeof entry.content !== "string") {
      return err(`file ${entry.path} must have string content`);
    }

    const segs = entry.path.split("/").filter(Boolean);
    const base = segs[segs.length - 1];

    // README.md at the root is informational only — allowed but not part of any law.
    if (segs.length === 1 && (base === "README.md" || base === "readme.md")) {
      infoCount++;
      continue;
    }
    if (segs.length !== 2) {
      return err(`unexpected path "${entry.path}" — files must be <law-name>/{law.json,verify.sh,guidance.md} or root README.md`);
    }
    const [lawDir, fileName] = segs;
    if (!LAW_NAME_RE.test(lawDir)) {
      return err(`law folder "${lawDir}" must match /^[a-z][a-z0-9-]{1,63}$/`);
    }
    if (!(REQUIRED_LAW_FILES as readonly string[]).includes(fileName)) {
      return err(`unexpected file "${entry.path}" — only ${REQUIRED_LAW_FILES.join(", ")} are allowed inside a law folder`);
    }
    if (!byLaw.has(lawDir)) byLaw.set(lawDir, new Map());
    byLaw.get(lawDir)!.set(fileName, { path: entry.path, content: entry.content });
  }
  void infoCount;

  if (byLaw.size === 0) {
    return err("at least one law folder is required (got only README.md)");
  }

  // Every law dir must have all three required files.
  for (const [lawDir, fileMap] of byLaw) {
    for (const required of REQUIRED_LAW_FILES) {
      if (!fileMap.has(required)) {
        return err(`law "${lawDir}" is missing ${required}`);
      }
    }
    const lj = fileMap.get("law.json")!;
    const result = validateLawJson(lj.content, lawDir);
    if (!result.ok) return result;
  }

  return { ok: true };
}

// Top-level entry. Returns the first failing rule, or { ok: true }.
export function validatePublishPayload(p: PublishPayload): ValidationResult {
  if (typeof p.title !== "string" || !p.title.trim()) {
    return err("title is required");
  }

  if (typeof p.tags !== "undefined" && !Array.isArray(p.tags)) {
    return err("tags must be an array of strings");
  }
  if (Array.isArray(p.tags)) {
    for (const t of p.tags) {
      if (typeof t !== "string") return err("tags entries must be strings");
    }
    if (p.tags.length > 12) return err("at most 12 tags allowed");
  }

  const hasFiles = Array.isArray(p.files) && p.files.length > 0;
  const hasBody = typeof p.body === "string" && p.body.trim().length > 0;
  const hasLawJson = typeof p.lawJson === "string" && p.lawJson.trim().length > 0;

  if (!hasFiles && !hasBody && !hasLawJson) {
    return err("provide either a files[] (law pack) or both body and lawJson (single law)");
  }

  if (hasFiles) {
    const r = validateFiles(p.files);
    if (!r.ok) return r;
  } else {
    if (!hasBody) return err("body (guidance.md content) is required for single-law statues");
    if (!hasLawJson) return err("lawJson is required for single-law statues");
    const r = validateLawJson(p.lawJson);
    if (!r.ok) return r;
  }

  return { ok: true };
}
