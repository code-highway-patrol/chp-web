import statues from "../../src/marketplace/statues.json";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(statues);
  }
  res.setHeader("Allow", "GET");
  return res.status(405).json({ error: "method not allowed" });
}
