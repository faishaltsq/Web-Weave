-- WebWeave Supabase MVP schema.
-- Run this in Supabase SQL editor, then enable Auth providers in dashboard.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'private_beta',
  monthly_generation_limit integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_domain text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generated_scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  framework text not null,
  prompt text not null,
  target_url text not null,
  code text not null,
  quality_gate jsonb,
  quality_checks jsonb not null default '[]'::jsonb,
  locator_summary jsonb not null default '[]'::jsonb,
  provider text,
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  prompt text not null,
  framework text,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  quantity integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  run_id uuid,
  type text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.generated_scripts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued',
  logs text,
  error_message text,
  screenshot_url text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_updated_at_idx on public.projects(owner_id, updated_at desc);
create index if not exists generated_scripts_owner_id_created_at_idx on public.generated_scripts(owner_id, created_at desc);
create index if not exists generated_scripts_project_id_created_at_idx on public.generated_scripts(project_id, created_at desc);
create index if not exists usage_events_owner_id_created_at_idx on public.usage_events(owner_id, created_at desc);
create index if not exists artifacts_owner_id_created_at_idx on public.artifacts(owner_id, created_at desc);
create index if not exists runs_owner_id_created_at_idx on public.runs(owner_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

drop trigger if exists set_templates_updated_at on public.templates;
create trigger set_templates_updated_at before update on public.templates for each row execute function public.set_updated_at();

drop trigger if exists set_runs_updated_at on public.runs;
create trigger set_runs_updated_at before update on public.runs for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.generated_scripts enable row level security;
alter table public.templates enable row level security;
alter table public.usage_events enable row level security;
alter table public.artifacts enable row level security;
alter table public.runs enable row level security;

drop policy if exists "profiles are owner readable" on public.profiles;
create policy "profiles are owner readable" on public.profiles for select using (id = auth.uid());

drop policy if exists "profiles are owner updatable" on public.profiles;
create policy "profiles are owner updatable" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "projects are owner readable" on public.projects;
create policy "projects are owner readable" on public.projects for select using (owner_id = auth.uid());

drop policy if exists "projects are owner insertable" on public.projects;
create policy "projects are owner insertable" on public.projects for insert with check (owner_id = auth.uid());

drop policy if exists "projects are owner updatable" on public.projects;
create policy "projects are owner updatable" on public.projects for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "projects are owner deletable" on public.projects;
create policy "projects are owner deletable" on public.projects for delete using (owner_id = auth.uid());

drop policy if exists "generated scripts are owner readable" on public.generated_scripts;
create policy "generated scripts are owner readable" on public.generated_scripts for select using (owner_id = auth.uid());

drop policy if exists "generated scripts are owner insertable" on public.generated_scripts;
create policy "generated scripts are owner insertable" on public.generated_scripts for insert with check (owner_id = auth.uid());

drop policy if exists "generated scripts are owner deletable" on public.generated_scripts;
create policy "generated scripts are owner deletable" on public.generated_scripts for delete using (owner_id = auth.uid());

drop policy if exists "templates are owner manageable" on public.templates;
create policy "templates are owner manageable" on public.templates for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "usage events are owner readable" on public.usage_events;
create policy "usage events are owner readable" on public.usage_events for select using (owner_id = auth.uid());

drop policy if exists "usage events are owner insertable" on public.usage_events;
create policy "usage events are owner insertable" on public.usage_events for insert with check (owner_id = auth.uid());

drop policy if exists "artifacts are owner manageable" on public.artifacts;
create policy "artifacts are owner manageable" on public.artifacts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "runs are owner manageable" on public.runs;
create policy "runs are owner manageable" on public.runs for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
