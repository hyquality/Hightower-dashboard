-- Base44 exports use MongoDB-style ObjectIds (24 hex chars), not PostgreSQL UUIDs.
-- Store them here; keep leads.id as auto-generated uuid for the app.

alter table public.leads
  add column if not exists base44_id text;

create unique index if not exists leads_base44_id_key
  on public.leads (base44_id)
  where base44_id is not null and base44_id <> '';
