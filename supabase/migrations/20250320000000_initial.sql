-- Leads dashboard schema (Supabase). Run via Supabase CLI or SQL editor.

create extension if not exists "pgcrypto";

-- Leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_name text,
  owner_name text,
  industry text,
  email text,
  phone text,
  website text,
  source text,
  status text default 'New',
  city text,
  state text,
  address text,
  zip text,
  rating numeric,
  review_count integer,
  estimated_monthly_revenue numeric,
  employee_count integer,
  years_in_business numeric,
  scraped_date date,
  enriched_date date,
  email_sent_date date,
  source_url text,
  enrichment_source text,
  airtable_id text,
  email_template text,
  notes text,
  doc_file_uris text,
  email_sent boolean not null default false
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_industry_idx on public.leads (industry);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_source_idx on public.leads (source);

-- Campaigns
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  template text,
  subject text,
  body text,
  filter_industry text default 'All',
  filter_status text default 'All',
  status text default 'Draft',
  launched_date date,
  sent_count integer not null default 0,
  open_count integer not null default 0,
  click_count integer not null default 0
);

create index if not exists campaigns_created_at_idx on public.campaigns (created_at desc);

-- Email logs
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid references public.leads (id) on delete set null,
  business_name text,
  email text,
  campaign_id uuid references public.campaigns (id) on delete set null,
  campaign_name text,
  template text,
  subject text,
  sent_date date,
  status text,
  message_id text,
  opened boolean not null default false,
  clicked boolean not null default false,
  next_followup date
);

create unique index if not exists email_logs_message_id_key
  on public.email_logs (message_id)
  where message_id is not null and message_id <> '';

create index if not exists email_logs_created_at_idx on public.email_logs (created_at desc);
create index if not exists email_logs_campaign_id_idx on public.email_logs (campaign_id);

-- RLS
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.email_logs enable row level security;

create policy "leads_authenticated_all"
  on public.leads for all
  to authenticated
  using (true) with check (true);

create policy "campaigns_authenticated_all"
  on public.campaigns for all
  to authenticated
  using (true) with check (true);

create policy "email_logs_authenticated_all"
  on public.email_logs for all
  to authenticated
  using (true) with check (true);

-- Storage bucket for lead documents (signed URLs from Vercel API use service role).
insert into storage.buckets (id, name, public)
values ('lead-documents', 'lead-documents', false)
on conflict (id) do nothing;
