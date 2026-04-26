import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";
import {
  initialMockStatues,
  slugifyTitle,
  type MockStatue,
} from "./dev-mock-statues";
import { normalizeLawJsonInput } from "./law-json-normalize";

/**
 * Vite serves `/api/**` from the repo `api/` tree as transformed JS. This
 * plugin handles marketplace routes in dev with an in-memory mock (no MongoDB).
 * For production-like serverless, use `vercel dev`.
 */

function hasMockAuth(req: IncomingMessage): boolean {
  const raw = req.headers.authorization;
  return (
    typeof raw === "string" &&
    /^Bearer\s+\S+$/i.test(raw) &&
    raw.length > "Bearer x".length + 4
  );
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text.trim() ? JSON.parse(text) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sorted(statues: MockStatue[]): MockStatue[] {
  return [...statues].sort(
    (a, b) =>
      b.stars - a.stars || b.createdAt.localeCompare(a.createdAt),
  );
}

export function localApiStub(): Plugin {
  let statues: MockStatue[] = initialMockStatues();
  const starredSlugs = new Set<string>();
  let idSeq = 0x1000;

  return {
    name: "local-api-stub",
    enforce: "pre",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url ?? "";
        const pathname = (raw.split("?")[0] ?? "").replace(/\/$/, "") || "/";

        if (!pathname.startsWith("/api/")) {
          next();
          return;
        }

        const sendJson = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(body));
        };

        const method = req.method ?? "GET";

        if (pathname === "/api/statues" && method === "GET") {
          const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
          const params = new URLSearchParams(q);
          const limit = Math.min(Number(params.get("limit")) || 12, 50);
          const skip = Math.max(Number(params.get("skip")) || 0, 0);
          const list = sorted(statues);
          const slice = list.slice(skip, skip + limit);
          const hasMore = skip + limit < list.length;
          sendJson(200, { items: slice, hasMore, skip, limit });
          return;
        }

        if (pathname === "/api/statues" && method === "POST") {
          void (async () => {
            if (!hasMockAuth(req)) {
              await readJsonBody(req).catch(() => {});
              sendJson(401, { error: "unauthorized" });
              return;
            }
            const body = (await readJsonBody(req).catch(() => ({}))) as Record<
              string,
              unknown
            >;
            const title = body.title;
            const text = body.body;
            if (typeof title !== "string" || typeof text !== "string") {
              sendJson(400, { error: "title and body required" });
              return;
            }
            const law = normalizeLawJsonInput(body.lawJson);
            if (!law.ok) {
              sendJson(400, { error: law.error });
              return;
            }
            const slug = slugifyTitle(title);
            if (!slug) {
              sendJson(400, { error: "title slugged to empty" });
              return;
            }
            if (statues.some((s) => s.slug === slug)) {
              sendJson(409, { error: "slug already exists" });
              return;
            }
            const tags = Array.isArray(body.tags)
              ? body.tags.slice(0, 12).map(String)
              : [];
            const authorName =
              typeof body.authorName === "string"
                ? body.authorName
                : "mock-author";
            const doc: MockStatue = {
              _id: `mock${(++idSeq).toString(16).padStart(20, "0")}`,
              slug,
              title,
              body: text,
              lawJson: law.json,
              tags,
              authorId: "mock-self",
              authorName,
              createdAt: new Date().toISOString(),
              stars: 0,
            };
            statues = [doc, ...statues];
            sendJson(201, doc);
          })();
          return;
        }

        if (pathname === "/api/statues/search") {
          if (method !== "POST") {
            res.setHeader("Allow", "POST");
            sendJson(405, { error: "method not allowed" });
            return;
          }
          void (async () => {
            const body = (await readJsonBody(req).catch(() => ({}))) as Record<
              string,
              unknown
            >;
            const query =
              typeof body.query === "string" ? body.query.trim() : "";
            if (!query) {
              sendJson(400, { error: "query required" });
              return;
            }
            const lower = query.toLowerCase();
            const hits = sorted(statues).filter((s) => {
              const hay =
                `${s.title}\n${s.body}\n${s.lawJson}\n${s.tags.join(" ")}`.toLowerCase();
              return hay.includes(lower);
            });
            const items = hits.slice(0, 24).map((s, i) => ({
              ...s,
              score: Math.max(0.5, 0.98 - i * 0.02),
            }));
            sendJson(200, { items });
          })();
          return;
        }

        const starMatch = /^\/api\/statues\/([^/]+)\/star$/.exec(pathname);
        if (starMatch && method === "POST") {
          void (async () => {
            if (!hasMockAuth(req)) {
              await readJsonBody(req).catch(() => {});
              sendJson(401, { error: "unauthorized" });
              return;
            }
            await readJsonBody(req).catch(() => {});
            const slug = starMatch[1];
            const st = statues.find((s) => s.slug === slug);
            if (!st) {
              sendJson(404, { error: "not found" });
              return;
            }
            if (starredSlugs.has(slug)) {
              starredSlugs.delete(slug);
              st.stars = Math.max(0, st.stars - 1);
              sendJson(200, { hasStarred: false, stars: st.stars });
            } else {
              starredSlugs.add(slug);
              st.stars += 1;
              sendJson(200, { hasStarred: true, stars: st.stars });
            }
          })();
          return;
        }

        const detailMatch = /^\/api\/statues\/([^/]+)$/.exec(pathname);
        if (detailMatch && method === "GET") {
          const slug = detailMatch[1];
          const st = statues.find((s) => s.slug === slug);
          if (!st) {
            sendJson(404, { error: "not found" });
            return;
          }
          const authed = hasMockAuth(req);
          sendJson(200, {
            ...st,
            hasStarred: authed && starredSlugs.has(slug),
          });
          return;
        }

        sendJson(404, { error: "not found" });
      });
    },
  };
}
