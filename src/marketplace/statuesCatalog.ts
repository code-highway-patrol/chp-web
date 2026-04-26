import type { Statue } from "./types";
import rawStatues from "./statues.json";

const sorted: Statue[] = [...(rawStatues as Statue[])].sort(
  (a, b) =>
    b.stars - a.stars || b.createdAt.localeCompare(a.createdAt),
);

function lawHay(s: Statue): string {
  const lj = s.lawJson;
  if (lj == null) return "";
  return typeof lj === "string" ? lj : JSON.stringify(lj);
}

export function listStatuesSorted(): Statue[] {
  return sorted;
}

export function searchStatuesLocal(query: string): Statue[] {
  const q = query.trim().toLowerCase();
  if (!q) return sorted;
  return sorted.filter((s) => {
    const hay =
      `${s.title}\n${s.body}\n${lawHay(s)}\n${s.tags.join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

export function getStatueBySlug(slug: string | undefined): Statue | undefined {
  if (!slug) return undefined;
  return sorted.find((s) => s.slug === slug);
}
