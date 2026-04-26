import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const statuesJsonPath = join(__dirname, "../../src/marketplace/statues.json");
const statues = JSON.parse(readFileSync(statuesJsonPath, "utf-8"));

export default async function handler(req, res) {
  if (req.method === "GET") {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const items = statues.slice(skip, skip + limit);
    const hasMore = skip + limit < statues.length;
    return res.status(200).json({ items, hasMore, skip, limit });
  }
  res.setHeader("Allow", "GET");
  return res.status(405).json({ error: "method not allowed" });
}
