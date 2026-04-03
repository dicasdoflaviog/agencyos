-- =============================================================
-- Agency OS — Migration Fase 1
-- Executar no Supabase SQL Editor
-- =============================================================

-- ===== EXTENSÕES =====
create extension if not exists "uuid-ossp";

-- ===== PROFILES =====
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null default 'collaborator' check (role in ('admin','collaborator')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Cria profile automaticamente ao criar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== CLIENTS =====
create table if not exists public.clients (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  slug             text not null unique,
  niche            text,
  logo_url         text,
  status           text not null default 'active' check (status in ('active','paused','archived')),
  contract_value   numeric(12,2),
  contract_status  text not null default 'pending' check (contract_status in ('active','pending','overdue')),
  notes            text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ===== CLIENT ASSETS =====
create table if not exists public.client_assets (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  type        text not null check (type in ('logo','styleguide','brandvoice','font','product','other')),
  name        text not null,
  file_url    text,
  content     text,
  created_at  timestamptz not null default now()
);

-- ===== JOBS =====
create table if not exists public.jobs (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'backlog' check (status in ('backlog','in_progress','review','done','cancelled')),
  priority    text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by  uuid references public.profiles(id) on delete set null,
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ===== JOB OUTPUTS =====
create table if not exists public.job_outputs (
  id              uuid primary key default uuid_generate_v4(),
  job_id          uuid not null references public.jobs(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  agent_id        text not null,
  agent_name      text not null,
  input_prompt    text not null,
  output_content  text not null,
  output_type     text not null default 'text' check (output_type in ('text','copy','strategy','script','image_prompt')),
  status          text not null default 'pending' check (status in ('pending','approved','rejected','revision')),
  feedback        text,
  created_at      timestamptz not null default now()
);

-- ===== updated_at trigger =====
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- ===== ROW LEVEL SECURITY =====
alter table public.profiles    enable row level security;
alter table public.clients     enable row level security;
alter table public.client_assets enable row level security;
alter table public.jobs        enable row level security;
alter table public.job_outputs enable row level security;

-- Políticas: autenticados veem tudo (interno)
create policy "auth_all" on public.profiles    for all to authenticated using (true) with check (true);
create policy "auth_all" on public.clients     for all to authenticated using (true) with check (true);
create policy "auth_all" on public.client_assets for all to authenticated using (true) with check (true);
create policy "auth_all" on public.jobs        for all to authenticated using (true) with check (true);
create policy "auth_all" on public.job_outputs for all to authenticated using (true) with check (true);

-- ===== ÍNDICES =====
create index if not exists idx_clients_status    on public.clients(status);
create index if not exists idx_jobs_client_id    on public.jobs(client_id);
create index if not exists idx_jobs_status       on public.jobs(status);
create index if not exists idx_outputs_job_id    on public.job_outputs(job_id);
create index if not exists idx_outputs_client_id on public.job_outputs(client_id);
create index if not exists idx_outputs_status    on public.job_outputs(status);
