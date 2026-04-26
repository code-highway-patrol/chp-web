// Lowercase, alphanumerics + hyphens only, collapsed and trimmed. Empty
// string indicates the input had no usable characters.
export function slugify(input: string): string {
  return String(input)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
