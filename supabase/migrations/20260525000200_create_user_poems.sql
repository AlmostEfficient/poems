create extension if not exists pgcrypto with schema extensions;

create table public.user_poems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poem_id text not null,
  title text not null,
  author text not null,
  content text not null,
  language text not null check (language in ('en', 'ur')),
  metadata jsonb not null default '{}'::jsonb,
  origin text not null default 'manual' check (origin in ('manual', 'scanner', 'import')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  unique (user_id, poem_id)
);

create index user_poems_user_updated_at_idx
  on public.user_poems (user_id, updated_at);

alter table public.user_poems enable row level security;

create policy "Users can select their own user poems"
  on public.user_poems
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own user poems"
  on public.user_poems
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own user poems"
  on public.user_poems
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own user poems"
  on public.user_poems
  for delete
  to authenticated
  using (user_id = auth.uid());
