# Hightower — Leads dashboard

Standalone leads dashboard with **Supabase** (Postgres + Auth + Storage), **Vercel** (static app + serverless API), and **Brevo** (transactional email + webhooks). Migrated from Base44.

## Features

- Leads CRUD, filters, bulk send
- Campaigns (draft / launch) with audience filters
- Email log with open/click/delivery/bounce updates from Brevo webhooks
- Lead documents: files in Supabase Storage bucket `lead-documents`, downloaded via signed URLs from `/api/documents/signed-url`

## Local development

1. Copy `.env.example` → `.env` and fill Supabase + Brevo values for the client (`VITE_*`).
2. **Option A — UI only:** `npm run dev` (Vite). API calls to `/api/*` are proxied to `VITE_DEV_API_PROXY` (default `http://127.0.0.1:3000`).
3. **Option B — full stack:** in another terminal run `npx vercel dev` (serves API routes; align port with `VITE_DEV_API_PROXY`).

```bash
npm install
npm run dev
```

## Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in [`supabase/migrations/20250320000000_initial.sql`](supabase/migrations/20250320000000_initial.sql) in the SQL editor (or use [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase db push`).
3. **Auth → URL configuration:** add your site URL and `http://localhost:5173` (and Vercel preview URL if needed) to **Redirect URLs** so magic links work.
4. **Storage:** migration creates private bucket `lead-documents`. Upload migrated files; paths you store in `leads.doc_file_uris` should be object paths inside that bucket (comma-separated if multiple).

## Deploy (Vercel + GitHub)

1. Push this repo to **GitHub**.
2. In [Vercel](https://vercel.com) → **Add New Project** → import the repo. Framework: **Vite** (auto). Build: `npm run build`, output: `dist` (matches [`vercel.json`](vercel.json)).
3. **Environment variables** in Vercel (Production + Preview):

   | Name | Where |
   |------|--------|
   | `VITE_SUPABASE_URL` | Client |
   | `VITE_SUPABASE_ANON_KEY` | Client |
   | `VITE_BRAND_LOGO_URL` | Client (optional) |
   | `SUPABASE_URL` | Server |
   | `SUPABASE_ANON_KEY` | Server (JWT validation) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server (secret) |
   | `BREVO_API_KEY` | Server |
   | `BREVO_SENDER_EMAIL` | Server |
   | `BREVO_SENDER_NAME` | Server (optional) |
   | `PUBLIC_APP_URL` | Server — `https://your-domain` (no trailing slash); builds logo URL for outbound email `<img>` (`/public/hightower-logo-email.png`) |
   | `BRAND_LOGO_URL` | Server (optional) — full logo URL; overrides `PUBLIC_APP_URL` + path |
   | `BREVO_WEBHOOK_SECRET` | Server (recommended) |
   | `PUBLIC_LEAD_SITE_ORIGIN` | Server — comma-separated origins for CORS on public lead APIs (e.g. `https://www.hightowerfunding.com`) |
   | `PUBLIC_FORM_SECRET` | Server (optional) — if set, lead site must send `x-form-secret` header or `form_secret` in JSON / multipart field |

4. Redeploy after saving env vars.

### Public lead site APIs

The static marketing site (`hightowerfunding`) submits leads and documents to these **unauthenticated** routes (service role on the server — never expose `SUPABASE_SERVICE_ROLE_KEY` in the static site):

| Path | Purpose |
|------|--------|
| `POST /api/apply` | JSON body: homepage form → insert `leads`, returns `{ id }` (use as `lead_id` on upload page). |
| `POST /api/save-application` | JSON: `{ lead_id, email?, type: "application_form", data }` → appends JSON to `leads.notes`. |
| `POST /api/upload-documents` | `multipart/form-data`: fields `lead_id`, `email`, `phone`, optional `form_secret`; files `file_0` … `file_2` → Storage `lead-documents` under `applications/{lead_id}/…`, updates `doc_file_uris`, `docs_submitted_date`, `docs_count`. |

Configure the static site’s `api-config.js` with the dashboard origin as `window.HT_API_BASE` (see the `hightowerfunding` repo). **Vercel request body limit** (~4.5 MB) applies to multipart uploads; very large PDFs may need a different upload strategy.

Set `PUBLIC_LEAD_SITE_ORIGIN` and `PUBLIC_FORM_SECRET` in production.

#### If `/api/apply` fails, Safari shows **no status / no response headers**, or OPTIONS fails

That pattern is usually **CORS**: the browser blocks the response before your app sees it.

1. **`PUBLIC_LEAD_SITE_ORIGIN`** must include the **exact** origin the browser sends (check the Network tab → Request Headers → `Origin`). Example: form on `https://www.hightowerfunding.com` → set `https://www.hightowerfunding.com` (not only `https://hightowerfunding.com` unless you use that URL). You can list both, comma-separated. Trailing slashes are normalized away on the server.
2. **Redeploy** the dashboard after changing env vars.
3. **Smoke test:** open `https://YOUR_DEPLOYMENT.vercel.app/api/health` — you should see `{"ok":true}`. From the lead site, the Network tab should show **OPTIONS** then **POST** to `/api/apply` with status **204** / **200** and response headers including `access-control-allow-origin`.
4. **Root Directory** in Vercel must be the repo root (folder containing `api/`). If it’s wrong, you get real **404**s (not “empty” responses).
5. Confirm paths are **`/api/apply`**, **`/api/save-application`**, **`/api/upload-documents`** (not `/api/public/...`).

## Brevo

1. **Transactional emails:** API key and verified sender domain (same as before).
2. **Webhooks:** point the transactional webhook URL to:

   `https://YOUR_VERCEL_DOMAIN/api/webhooks/brevo`

   In Brevo, enable **all** relevant transactional events. Many “opens” (especially Gmail and other clients) are sent as **`proxy_open`** / **`unique_proxy_open`**, not plain **`opened`** — the app handles those. See [Brevo transactional webhooks](https://developers.brevo.com/docs/transactional-webhooks).

   Recommended: **delivered**, **click**, **opened**, **unique_opened**, **proxy_open**, **unique_proxy_open**, and bounce types you care about.

   The webhook treats a **click** as proof the message was engaged with and also sets **Opened** when Brevo never sends a separate open event (common with image blocking / link-only interaction).

3. **Webhook auth:** set `BREVO_WEBHOOK_SECRET` in Vercel. Configure Brevo to send the same value as either header `x-webhook-secret` or `Authorization: Bearer <secret>` (UI varies by webhook type).

### If “Opened” stays empty in the dashboard

1. **Your header logo is unrelated** — Brevo open tracking uses a **separate invisible pixel** added when `trackOpens: true` is sent. Loading the logo does not replace that pixel.

2. **Many inboxes never load images** — Apple Mail “Protect Mail Activity”, Gmail, etc. often block or proxy images. You may get **clicks** (tracked links) but **no** open webhook. After deploy, a **click** webhook should still set **Opened** in this app (infer engagement).

3. **Confirm in Brevo** — In Brevo’s transactional logs for the same message, do **they** show an open? If Brevo shows no open, the problem is client/settings, not the dashboard. If Brevo shows opens but Supabase does not, check webhook URL and that **opened / unique_opened / proxy_open / unique_proxy_open** are subscribed.

4. **Match `message_id`** — Rows must have `email_logs.message_id` equal to Brevo’s `message-id` in the webhook. Imported logs or old sends often **don’t** match; the webhook then falls back to **email + subject** (now compared with normalized spacing/case).

5. **Backfill older rows** (one-time):  
   `update public.email_logs set opened = true where clicked = true and opened is distinct from true;`

## API routes (Vercel)

| Path | Auth |
|------|------|
| `POST /api/send-campaign` | Supabase user JWT |
| `POST /api/send-to-leads` | Supabase user JWT |
| `POST /api/documents/signed-url` | Supabase user JWT |
| `POST /api/webhooks/brevo` | `BREVO_WEBHOOK_SECRET` (not user JWT) |
| `POST /api/apply` | Optional `PUBLIC_FORM_SECRET`; CORS via `PUBLIC_LEAD_SITE_ORIGIN` |
| `POST /api/save-application` | Same |
| `POST /api/upload-documents` | Same (multipart) |

## Sign-in

Uses **Supabase Auth** magic link (email). Any email allowed by your Supabase project settings can sign in; tighten with **Auth hooks** or **allowlists** if needed.

## Data migration from Base44

Export leads, campaigns, and email logs from Base44, map columns to the tables in the migration (`created_at` replaces `created_date`), import via CSV/SQL, re-upload files to `lead-documents`, and update `doc_file_uris` to storage paths.
