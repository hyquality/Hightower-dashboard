-- Columns present in Base44 CSV export but not in initial leads schema.

alter table public.leads
  add column if not exists docs_submitted_date date,
  add column if not exists docs_count integer,
  add column if not exists created_date timestamptz,
  add column if not exists updated_date timestamptz,
  add column if not exists created_by_id text,
  add column if not exists created_by text,
  add column if not exists is_sample boolean not null default false;

comment on column public.leads.created_date is 'Original Base44 created timestamp; distinct from created_at if both set.';
comment on column public.leads.updated_date is 'Original Base44 updated timestamp.';
