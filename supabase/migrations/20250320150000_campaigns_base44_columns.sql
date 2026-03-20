-- Base44 campaigns CSV columns not in initial schema.

alter table public.campaigns
  add column if not exists created_date timestamptz,
  add column if not exists updated_date timestamptz,
  add column if not exists created_by_id text,
  add column if not exists created_by text,
  add column if not exists is_sample boolean not null default false;
