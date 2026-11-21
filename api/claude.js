// Vercel serverless function: the only place the Anthropic API key is used.
// The browser sends { prompt, tier, images?, urls? } and gets back { data } (parsed JSON from Claude).

const MODELS = {
  default: process.env.MISE_MODEL_DEFAULT || "claude-sonnet-5-5",
  complex: process.env.MISE_MODEL_COMPLEX || "claude-opus-5-5",
};
const MAX_PAGE_CHARS = 40000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Simple shared passcode so strangers who find the URL can't spend your API credits.
  const pass = process.env.APP_PASSCODE;
  if (pass && req.headers["x-mise-pass"] !== pass) return res.status(401).json({ error: "passcode" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in Vercel." });

  const { prompt, tier = "default", images = [], urls = [] } = req.body || {};
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "Missing prompt" });

  let text = prompt;
  if (Array.isArray(urls) && urls.length) {
    const pages = await Promise.all(urls.slice(0, 6).map(fetchRecipePage));
    text += "\n\nFETCHED PAGES:\n" + pages.join("\n\n");
  }

  const content = [];
  for (const img of (Array.isArray(images) ? images : []).slice(0, 6)) {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(img || "");
    if (m) content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
  }
  content.push({ type: "text", text });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELS[tier] || MODELS.default,
        max_tokens: 8000,
        messages: [{ role: "user", content }],
      }),
    });
    const out = await r.json();
    if (!r.ok) {
      const status = r.status === 429 || r.status === 529 ? 429 : 502;
      return res.status(status).json({ error: out?.error?.message || "Claude request failed" });
    }
    const raw = (out.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const data = parseJSON(raw);
    if (!data) return res.status(502).json({ error: "Claude didn't return valid JSON. Try again." });
    return res.status(200).json({ data });
  } catch (e) {
    return res.status(502).json({ error: "Couldn't reach Claude. Try again." });
  }
}

function parseJSON(s) {
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

// Fetch a recipe page. Prefer the structured recipe data most recipe sites embed (JSON-LD);
// fall back to the page's visible text.
async function fetchRecipePage(url) {
  try {
    if (!/^https?:\/\//i.test(url)) throw new Error("bad url");
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 12000);
    const r = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!r.ok) throw new Error("status " + r.status);
    const html = await r.text();

    const recipe = findJsonLdRecipe(html);
    if (recipe) return `PAGE ${url} (structured recipe data):\n` + JSON.stringify(recipe).slice(0, MAX_PAGE_CHARS);

    const body = html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"')
      .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
    if (body.length < 200) throw new Error("empty page");
    return `PAGE ${url} (page text):\n` + body.slice(0, MAX_PAGE_CHARS);
  } catch (e) {
    return `PAGE ${url}: could not be fetched (${e.message}). Treat this URL as unreadable.`;
  }
}

function findJsonLdRecipe(html) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    let j;
    try { j = JSON.parse(m[1].trim()); } catch { continue; }
    const found = walk(j);
    if (found) return found;
  }
  return null;
}
function walk(n) {
  if (!n || typeof n !== "object") return null;
  if (Array.isArray(n)) { for (const x of n) { const f = walk(x); if (f) return f; } return null; }
  const t = n["@type"];
  if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return n;
  return walk(n["@graph"]) || null;
}
