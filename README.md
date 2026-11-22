# Mise

Paste recipe links, recipe text or photos of recipe cards. Mise builds one combined shopping list, saves the instructions, and makes a prep plan that works backward from your serving time.

## Live cooking

The **Cook** tab runs the meal once you start: target vs estimated dinner time, one "do this now" card, temperature tracking with a rate-based estimate, every dish's state, upcoming tasks (timed or condition-based), appliances, and a chat/voice bar ("pork's in", "it's 120", "the beans are moldy"). The app keeps the meal state; Claude reads it and returns structured changes, so no dish drops out of the plan. Kitchen notes on the home screen are used in every plan.

Reference scenario: the "Sunday Roast: Pork (Autumn)" meal card.

## How it's built

- `index.html`: the whole app (no build step)
- `api/claude.js`: a Vercel serverless function that fetches recipe pages and calls the Anthropic API. Your API key stays on the server.
- Your data (recipes, lists, checkmarks) is saved in your browser's local storage.

## Deploy on Vercel

1. In Vercel, go to **Add New → Project** and import this repo. Leave the framework preset on "Other" and the build settings empty.
2. Under **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY`: your key from console.anthropic.com
   - `APP_PASSCODE`: any passcode you choose. The app asks for it once on each device, so strangers who find the URL can't use your credits.
   - Optional: `INSTACART_API_KEY` from the Instacart Developer Platform turns on **Shop on Instacart**. Add `INSTACART_ENV=production` once Instacart approves the key (until then it uses their dev sandbox).
   - Optional: `MISE_MODEL_DEFAULT` (default `claude-sonnet-5-5`, used to read recipes) and `MISE_MODEL_COMPLEX` (default `claude-opus-5-5`, used for the prep plan)
3. Redeploy so the variables take effect.

On your phone, open the site and use **Add to Home Screen**.

## Accounts, sync and community (Supabase)

1. In Supabase, open **SQL Editor → New query**, paste `supabase/schema.sql`, and click **Run**.
2. In **Authentication → URL Configuration**, set **Site URL** to the app's production URL and add the same URL under **Redirect URLs**.
3. In Vercel, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (from Supabase **Project Settings → API Keys**), then redeploy.
4. Optional: `ALLOWED_EMAILS` (comma separated) limits who can use Claude through the app. Without it, anyone who signs in can.

Signed-in people get their meals synced across devices, can share a dinner party to the community, make someone else's, and rate and review it.

## Limits

- Data is saved per browser, so your phone and laptop each keep their own meal. Syncing between devices would need a database (for example Supabase or Vercel's Upstash integration).
- Some recipe sites block automated requests. When that happens, copy the page text and paste it in.
