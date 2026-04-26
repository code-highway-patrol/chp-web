/** In-memory marketplace fixtures for `vite dev` — never touches MongoDB. */

export type MockStatue = {
  _id: string;
  slug: string;
  title: string;
  body: string;
  lawJson: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  stars: number;
};

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86400000).toISOString();

export function fixtureLawJson(slug: string, intent: string): string {
  return JSON.stringify(
    {
      name: slug,
      intent,
      severity: "error",
      failures: 0,
      tightening_level: 0,
      hooks: ["pre-tool"],
      enabled: true,
      checks: [],
    },
    null,
    2,
  );
}

export function initialMockStatues(): MockStatue[] {
  const rows: Omit<MockStatue, "lawJson">[] = [
    {
      _id: "mock00000000000000000001",
      slug: "no-console-in-prod",
      title: "No console.log in production paths",
      body: `- Strip debug logs before merge\n- Allow console.error for real failures`,
      tags: ["javascript", "logging", "quality"],
      authorId: "mock-user-1",
      authorName: "patrol-bot",
      createdAt: iso(2),
      stars: 42,
    },
    {
      _id: "mock00000000000000000002",
      slug: "async-timeout-required",
      title: "Every async call needs a timeout",
      body: `- Wrap external I/O with AbortSignal or Promise.race\n- Document chosen limits in PRs`,
      tags: ["typescript", "async", "reliability"],
      authorId: "mock-user-2",
      authorName: "highway-eng",
      createdAt: iso(5),
      stars: 38,
    },
    {
      _id: "mock00000000000000000003",
      slug: "match-test-style",
      title: "Match existing __tests__ style",
      body: `- Same matchers and file layout as neighboring specs\n- No snapshot churn for incidental whitespace`,
      tags: ["testing", "vitest"],
      authorId: "mock-user-1",
      authorName: "patrol-bot",
      createdAt: iso(8),
      stars: 31,
    },
    {
      _id: "mock00000000000000000004",
      slug: "no-any-typescript",
      title: "No any in TypeScript",
      body: `- Prefer unknown + narrowing\n- eslint rule is the source of truth`,
      tags: ["typescript", "strict"],
      authorId: "mock-user-3",
      authorName: "typesmith",
      createdAt: iso(10),
      stars: 56,
    },
    {
      _id: "mock00000000000000000005",
      slug: "law-folder-layout",
      title: "CHP laws live under docs/chp/laws",
      body: `- Each law is a folder: guidance.md, law.json, verify.sh\n- Not stored in .chprc`,
      tags: ["chp", "docs"],
      authorId: "mock-user-2",
      authorName: "highway-eng",
      createdAt: iso(12),
      stars: 27,
    },
    {
      _id: "mock00000000000000000006",
      slug: "semantic-html-nav",
      title: "Semantic HTML for navigation",
      body: `- Use nav + aria-current for active route\n- Keyboard focus order matches visual order`,
      tags: ["a11y", "html"],
      authorId: "mock-user-4",
      authorName: "a11y-allen",
      createdAt: iso(14),
      stars: 19,
    },
    {
      _id: "mock00000000000000000007",
      slug: "env-no-secrets",
      title: "Never commit API keys",
      body: `- Use .env locally\n- CI uses hosted secrets only`,
      tags: ["security", "env"],
      authorId: "mock-user-1",
      authorName: "patrol-bot",
      createdAt: iso(15),
      stars: 61,
    },
    {
      _id: "mock00000000000000000008",
      slug: "pr-small-diffs",
      title: "Keep PRs review-sized",
      body: `- Prefer stacked PRs over one mega-diff\n- Link to ticket or ADR when behavior changes`,
      tags: ["process", "git"],
      authorId: "mock-user-5",
      authorName: "merge-maria",
      createdAt: iso(18),
      stars: 22,
    },
    {
      _id: "mock00000000000000000009",
      slug: "responsive-touch-targets",
      title: "Touch targets at least 44px",
      body: `- Applies to icon buttons on mobile\n- Document exceptions in code comment`,
      tags: ["css", "mobile", "a11y"],
      authorId: "mock-user-4",
      authorName: "a11y-allen",
      createdAt: iso(20),
      stars: 15,
    },
    {
      _id: "mock0000000000000000000a",
      slug: "no-drive-by-refactors",
      title: "No drive-by refactors in bugfix PRs",
      body: `- Diff should map to the stated goal\n- Cleanup belongs in its own change`,
      tags: ["process"],
      authorId: "mock-user-5",
      authorName: "merge-maria",
      createdAt: iso(22),
      stars: 33,
    },
    {
      _id: "mock0000000000000000000b",
      slug: "prefer-fetch-over-axios",
      title: "Prefer fetch for simple JSON APIs",
      body: `- One less dependency\n- Centralize error parsing in a helper if needed`,
      tags: ["http", "javascript"],
      authorId: "mock-user-3",
      authorName: "typesmith",
      createdAt: iso(24),
      stars: 11,
    },
    {
      _id: "mock0000000000000000000c",
      slug: "images-lazy-and-sized",
      title: "Images: dimensions + lazy",
      body: `- Set width/height to avoid CLS\n- loading=\"lazy\" below the fold`,
      tags: ["performance", "html"],
      authorId: "mock-user-2",
      authorName: "highway-eng",
      createdAt: iso(26),
      stars: 18,
    },
    {
      _id: "mock0000000000000000000d",
      slug: "error-states-user-facing",
      title: "User-facing error copy",
      body: `- No raw stack traces in toast\n- Offer retry when safe`,
      tags: ["ux", "errors"],
      authorId: "mock-user-4",
      authorName: "a11y-allen",
      createdAt: iso(28),
      stars: 9,
    },
    {
      _id: "mock0000000000000000000e",
      slug: "sql-parameterized-only",
      title: "SQL must be parameterized",
      body: `- No string-concatenated WHERE clauses\n- ORM raw queries still bind params`,
      tags: ["security", "sql"],
      authorId: "mock-user-1",
      authorName: "patrol-bot",
      createdAt: iso(30),
      stars: 47,
    },
    {
      _id: "mock0000000000000000000f",
      slug: "comments-why-not-what",
      title: "Comments explain why, not what",
      body: `- Code shows what happens\n- Comment links to ticket for weird edge cases`,
      tags: ["style", "docs"],
      authorId: "mock-user-3",
      authorName: "typesmith",
      createdAt: iso(32),
      stars: 14,
    },
    {
      _id: "mock00000000000000000010",
      slug: "rate-limit-sensitive-routes",
      title: "Rate-limit auth-sensitive routes",
      body: `- Login, password reset, token mint\n- Log and alert on threshold`,
      tags: ["security", "api"],
      authorId: "mock-user-1",
      authorName: "patrol-bot",
      createdAt: iso(35),
      stars: 29,
    },
    {
      _id: "mock00000000000000000011",
      slug: "dark-mode-respect-pref",
      title: "Respect prefers-color-scheme",
      body: `- Default theme follows OS\n- Manual toggle stored in localStorage`,
      tags: ["css", "ux"],
      authorId: "mock-user-4",
      authorName: "a11y-allen",
      createdAt: iso(38),
      stars: 21,
    },
    {
      _id: "mock00000000000000000012",
      slug: "bundle-import-cost",
      title: "Watch import cost in client bundles",
      body: `- Prefer dynamic import for heavy admin-only panels\n- Check rollup output after adding deps`,
      tags: ["performance", "vite"],
      authorId: "mock-user-2",
      authorName: "highway-eng",
      createdAt: iso(40),
      stars: 16,
    },
  ];
  return rows.map((s) => ({
    ...s,
    lawJson: fixtureLawJson(s.slug, s.title),
  }));
}

export function slugifyTitle(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return s || "statue";
}
