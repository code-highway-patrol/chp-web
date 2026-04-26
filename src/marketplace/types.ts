// Statues come in two shapes:
//
//   1. Legacy single-law: body (markdown) + lawJson (string|object).
//      Detail page renders a guidance.md card and a law.json card.
//
//   2. Law pack: files[] (a virtual file tree) + laws[] (derived index).
//      Detail page renders a GitHub-style file explorer. Each entry is one
//      CHP law's three on-disk files: <name>/{law.json, verify.sh, guidance.md}.
//
// All fields except the identity ones are optional so both shapes serialize
// from src/marketplace/statues.json.

export type StatueFile = {
  path: string; // e.g. "no-eval/law.json"
  content: string;
  size: number;
};

export type LawSummary = {
  name: string;
  hooks: string[];
  severity: "error" | "warn" | "info";
  intent?: string;
  description?: string;
};

export type Statue = {
  _id?: string;
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  stars: number;
  score?: number;
  hasStarred?: boolean;

  /** Markdown shown at the root of the file tree (e.g. README.md). Purely
   *  informational — `chp install` skips it. */
  readme?: string;

  // Legacy (single law per statue)
  body?: string;
  /** Same as on-disk law.json; usually a string, may be an object. */
  lawJson?: string | object;

  // Law pack (multiple laws per statue)
  files?: StatueFile[];
  laws?: LawSummary[];
};
