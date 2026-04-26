import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const statuesJsonPath = join(__dirname, "../../../src/marketplace/statues.json");
const statues = JSON.parse(readFileSync(statuesJsonPath, "utf-8"));

export default async function handler(req, res) {
  const { slug } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }

  if (!slug || typeof slug !== "string") {
    return res.status(400).json({ error: "slug required" });
  }

  const statue = statues.find((s) => s.slug === slug);
  if (!statue) {
    return res.status(404).json({ error: "not found" });
  }

  return res.status(200).json(statue);
}
