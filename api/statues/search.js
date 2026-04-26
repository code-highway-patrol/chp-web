import statues from "../../src/marketplace/statues.json";

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
