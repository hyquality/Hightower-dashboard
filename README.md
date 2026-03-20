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

4. Redeploy after saving env vars.

## Brevo

1. **Transactional emails:** API key and verified sender domain (same as before).
2. **Webhooks:** point the transactional webhook URL to:

   `https://YOUR_VERCEL_DOMAIN/api/webhooks/brevo`

   In Brevo, enable **all** relevant transactional events. Many “opens” (especially Gmail and other clients) are sent as **`proxy_open`** / **`unique_proxy_open`**, not plain **`opened`** — the app handles those. See [Brevo transactional webhooks](https://developers.brevo.com/docs/transactional-webhooks).

   Recommended: **delivered**, **click**, **opened**, **unique_opened**, **proxy_open**, **unique_proxy_open**, and bounce types you care about.

   The webhook treats a **click** as proof the message was engaged with and also sets **Opened** when Brevo never sends a separate open event (common with image blocking / link-only interaction).

3. **Webhook auth:** set `BREVO_WEBHOOK_SECRET` in Vercel. Configure Brevo to send the same value as either:
   - header `x-webhook-secret`, or  
   - `Authorization: Bearer <secret>`  

   (Brevo’s UI varies; use whichever custom header / secret option they provide for your webhook type.)

## API routes (Vercel)

| Path | Auth |
|------|------|
| `POST /api/send-campaign` | Supabase user JWT |
| `POST /api/send-to-leads` | Supabase user JWT |
| `POST /api/documents/signed-url` | Supabase user JWT |
| `POST /api/webhooks/brevo` | `BREVO_WEBHOOK_SECRET` (not user JWT) |

## Sign-in

Uses **Supabase Auth** magic link (email). Any email allowed by your Supabase project settings can sign in; tighten with **Auth hooks** or **allowlists** if needed.

## Data migration from Base44

Export leads, campaigns, and email logs from Base44, map columns to the tables in the migration (`created_at` replaces `created_date`), import via CSV/SQL, re-upload files to `lead-documents`, and update `doc_file_uris` to storage paths.
