-- Voer dit eenmalig uit in de Supabase SQL Editor

-- CV-aanvragen
create table if not exists cv_requests (
  id uuid default gen_random_uuid() primary key,
  kandidaat_naam text not null,
  aanvrager_naam text,
  aanvrager_email text not null,
  telefoonnummer text,
  bedrijf_naam text,
  created_at timestamp with time zone default now()
);

-- Idempotente kolommen voor bestaande installaties
alter table cv_requests add column if not exists aanvrager_naam text;
alter table cv_requests add column if not exists telefoonnummer text;
alter table cv_requests add column if not exists bedrijf_naam text;

alter table cv_requests enable row level security;

create policy "service_role_all" on cv_requests
  for all
  using (true)
  with check (true);

-- Kandidaten voor de maandelijkse mailing
create table if not exists kandidaten (
  id text primary key,
  neepnaam text not null,
  regio text not null,
  beschikbaarheid text not null,
  salaris text not null,
  type text not null,
  functies text[] not null default '{}',
  werkervaring text[] not null default '{}',
  opleidingen text[] not null default '{}',
  bijzonderheden text not null default '',
  categorie text not null,
  pitch_tekst text not null default '',
  verstuurd_op timestamp with time zone,   -- null = zit in huidige mailing
  created_at timestamp with time zone default now()
);

alter table kandidaten enable row level security;

create policy "service_role_all" on kandidaten
  for all
  using (true)
  with check (true);
