import type { Statue } from "./types";

// All marketplace data lives in Mongo behind /api/statues. Frontend never
// imports statues.json — that file is a dev seed used only by the migration
// script.

const LIST_URL = "/api/statues?limit=200";

let listPromise: Promise<Statue[]> | null = null;
const detailCache = new Map<string, Promise<Statue | null>>();

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${input}`);
  }
  return (await res.json()) as T;
}

export async function listStatuesSorted(): Promise<Statue[]> {
  if (!listPromise) {
    listPromise = fetchJson<{ items: Statue[] }>(LIST_URL).then((r) => r.items ?? []);
  }
  return listPromise;
}

export async function searchStatues(query: string): Promise<Statue[]> {
  const q = query.trim();
  if (!q) return listStatuesSorted();
  const r = await fetchJson<{ items: Statue[] }>("/api/statues/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }),
  });
  return r.items ?? [];
}

export async function getStatueBySlug(slug: string | undefined): Promise<Statue | null> {
  if (!slug) return null;
  if (!detailCache.has(slug)) {
    const p = fetch(`/api/statues/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as Statue;
      })
      .catch((err) => {
        // Don't poison the cache on network errors.
        detailCache.delete(slug);
        throw err;
      });
    detailCache.set(slug, p);
  }
  return detailCache.get(slug)!;
}

// Allow the publish flow to invalidate caches after a successful insert.
export function invalidateCatalog() {
  listPromise = null;
  detailCache.clear();
}
