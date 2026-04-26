const LS_KEY = "chp-marketplace-starred";

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const a = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(a) ? a.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeSet(s: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...s]));
}

export function isSlugStarred(slug: string): boolean {
  return readSet().has(slug);
}

/** @returns next `hasStarred` value */
export function toggleSlugStarred(slug: string): boolean {
  const s = readSet();
  if (s.has(slug)) {
    s.delete(slug);
    writeSet(s);
    return false;
  }
  s.add(slug);
  writeSet(s);
  return true;
}
