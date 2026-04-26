import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const statuesJsonPath = join(__dirname, "../../src/marketplace/statues.json");
const statues = JSON.parse(readFileSync(statuesJsonPath, "utf-8"));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const { query } = req.body ?? {};
  const q = String(query ?? "").trim().toLowerCase();

  if (!q) {
    return res.status(200).json({ items: [] });
  }

  const items = statues.filter((s) => {
    const hay = [
      s.title,
      s.description ?? "",
      s.body ?? "",
      s.tags.join(" "),
    ].join("\n").toLowerCase();
    return hay.includes(q);
  });

  return res.status(200).json({ items });
}
