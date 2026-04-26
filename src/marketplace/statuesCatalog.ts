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

function packHay(s: Statue): string {
  if (!s.files || s.files.length === 0) return "";
  const lawIntents = (s.laws ?? [])
    .map((l) => `${l.name} ${l.intent ?? ""}`)
    .join(" ");
  const guidance = s.files
    .filter((f) => f.path.endsWith("/guidance.md"))
    .map((f) => f.content)
    .join("\n");
  return `${lawIntents}\n${guidance}`;
}

export function listStatuesSorted(): Statue[] {
  return sorted;
}

export function searchStatuesLocal(query: string): Statue[] {
  const q = query.trim().toLowerCase();
  if (!q) return sorted;
  return sorted.filter((s) => {
    const hay = [
      s.title,
      s.description ?? "",
      s.body ?? "",
      lawHay(s),
      packHay(s),
      s.tags.join(" "),
    ]
      .join("\n")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function getStatueBySlug(slug: string | undefined): Statue | undefined {
  if (!slug) return undefined;
  return sorted.find((s) => s.slug === slug);
}
