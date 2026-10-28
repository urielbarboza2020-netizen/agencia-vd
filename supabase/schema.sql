-- Agencia VD — esquema multi-usuario para Supabase
-- Ejecutar completo en: Supabase Dashboard -> SQL Editor -> New query -> Run

create extension if not exists "pgcrypto";

-- ---------- Tablas ----------

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  product text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  brand_id uuid references public.brands(id) on delete set null,
  brand_name text not null,
  type text not null check (type in ('H', 'G', 'CBO')),
  quantity numeric not null check (quantity > 0),
  batch text,
  unit_rate numeric not null,
  currency text not null default 'USD',
  total numeric not null,
  overridden boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rates (
  user_id uuid primary key references auth.users(id) on delete cascade,
  h_rate numeric not null default 5,
  g_rate numeric not null default 7.3,
  cbo_rate numeric not null default 22,
  currency text not null default 'USD',
  custom_rates jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.production_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bodies integer not null,
  hooks integer not null,
  amount_per_day numeric not null,
  order_num integer not null
);

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'USD',
  date_format text not null default 'DD/MM/YYYY',
  week_start text not null default 'monday',
  theme text not null default 'system',
  summary_format jsonb not null default '{}'::jsonb
);

create index if not exists work_entries_user_date_idx on public.work_entries (user_id, date);
create index if not exists brands_user_idx on public.brands (user_id);

-- ---------- Row Level Security: cada usuario solo ve y edita sus propios datos ----------

alter table public.brands enable row level security;
alter table public.work_entries enable row level security;
alter table public.rates enable row level security;
alter table public.production_levels enable row level security;
alter table public.app_settings enable row level security;

create policy "brands_own" on public.brands for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "work_entries_own" on public.work_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rates_own" on public.rates for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "production_levels_own" on public.production_levels for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "app_settings_own" on public.app_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Al registrarse un usuario nuevo, sembrar sus datos iniciales ----------
-- Tarifas y niveles tomados de la tabla de referencia de la agencia.
-- (summary_format y custom_rates quedan con su default simple; la app
-- completa los valores de formato razonables automáticamente al leerlos.)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.rates (user_id, h_rate, g_rate, cbo_rate, currency)
  values (new.id, 5, 7.3, 22, 'USD');

  insert into public.app_settings (user_id) values (new.id);

  insert into public.production_levels (user_id, name, bodies, hooks, amount_per_day, order_num) values
    (new.id, 'Novato', 3, 9, 22, 1),
    (new.id, 'Estándar', 6, 18, 44, 2),
    (new.id, 'Avanzado', 9, 27, 66, 3),
    (new.id, 'Pro', 12, 36, 88, 4),
    (new.id, 'Experto', 15, 45, 110, 5);

  insert into public.brands (user_id, name) values
    (new.id, 'FLEXLAB'),
    (new.id, 'ANDARA'),
    (new.id, 'DERMAPURA'),
    (new.id, 'LUNA NUEVA'),
    (new.id, 'MENLAB');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
