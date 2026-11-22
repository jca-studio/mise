// Who may use the Claude and Instacart endpoints: the shared passcode, or a signed-in Mise account.
// ALLOWED_EMAILS (optional, comma separated) limits accounts to people you've invited.
export async function allowed(req) {
  const pass = process.env.APP_PASSCODE;
  if (pass && req.headers["x-mise-pass"] === pass) return true;
  const auth = req.headers.authorization || "";
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (auth.startsWith("Bearer ") && url && key) {
    try {
      const r = await fetch(url + "/auth/v1/user", { headers: { apikey: key, Authorization: auth } });
      if (r.ok) {
        const u = await r.json();
        const list = (process.env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        return !list.length || list.includes(String(u.email || "").toLowerCase());
      }
    } catch {}
  }
  return !pass && !(url && key); // nothing configured: open, as before
}
