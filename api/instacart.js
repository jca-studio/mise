import { allowed } from "./_auth.js";
// Turns the shopping list into an Instacart shopping list page (Instacart Developer Platform).
// Needs INSTACART_API_KEY in Vercel. INSTACART_ENV=production once Instacart approves the key; otherwise the dev sandbox is used.
const BASE = process.env.INSTACART_ENV === "production" ? "https://connect.instacart.com" : "https://connect.dev.instacart.tools";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!(await allowed(req))) return res.status(401).json({ error: "passcode" });
  if (!process.env.INSTACART_API_KEY) return res.status(501).json({ error: "not_configured" });

  const { title = "Mise shopping list", items = [], linkback = "" } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "No items" });

  const line_items = items.slice(0, 200).map((i) => ({
    name: String(i.name || "").slice(0, 120),
    display_text: String(i.display || i.name || "").slice(0, 160),
    ...(i.qty > 0 ? { line_item_measurements: [{ quantity: Number(i.qty.toFixed(2)), unit: i.unit || "each" }] } : {}),
  })).filter((l) => l.name);

  try {
    const r = await fetch(BASE + "/idp/v1/products/products_link", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer " + process.env.INSTACART_API_KEY },
      body: JSON.stringify({ title, link_type: "shopping_list", expires_in: 30, line_items,
        ...(linkback ? { landing_page_configuration: { partner_linkback_url: linkback } } : {}) }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !out.products_link_url) return res.status(502).json({ error: out?.error?.message || out?.message || "Instacart didn't return a link." });
    return res.status(200).json({ url: out.products_link_url });
  } catch (e) {
    return res.status(502).json({ error: "Couldn't reach Instacart." });
  }
}
