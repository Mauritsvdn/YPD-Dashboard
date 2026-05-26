-- Voer dit eenmalig uit in de Supabase SQL Editor

create table if not exists cv_requests (
  id uuid default gen_random_uuid() primary key,
  kandidaat_naam text not null,
  aanvrager_email text not null,
  created_at timestamp with time zone default now()
);

-- Row Level Security uitschakelen voor server-side service role toegang
alter table cv_requests enable row level security;

create policy "service_role_all" on cv_requests
  for all
  using (true)
  with check (true);
