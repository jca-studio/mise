// Public settings the browser needs. The Supabase anon key is meant to be public;
// row-level security in supabase/schema.sql is what protects each person's data.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  });
}
