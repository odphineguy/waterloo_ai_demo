-- Design Studio leads (Phase 1). Written by api/studio-lead.ts using the
-- service-role key only. RLS is enabled with NO policies: the service role
-- bypasses RLS, and anon/authenticated clients get no access at all.

create table if not exists public.studio_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_slug text not null,
  name text not null,
  email text not null,
  phone text not null,
  address text,
  lat float8,
  lng float8,
  sqft int,
  package_id text,
  package_name text,
  selections jsonb,
  investment_min int,
  investment_max int,
  snapshot_url text,
  created_at timestamptz not null default now()
);

alter table public.studio_leads enable row level security;

create index if not exists studio_leads_tenant_created_idx
  on public.studio_leads (tenant_slug, created_at desc);
