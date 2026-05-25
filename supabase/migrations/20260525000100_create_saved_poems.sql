create extension if not exists pgcrypto with schema extensions;

create table public.saved_poems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poem_id text not null,
  poem_scope text not null check (poem_scope in ('catalogue', 'user')),
  saved_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  unique (user_id, poem_scope, poem_id)
);

create index saved_poems_user_updated_at_idx
  on public.saved_poems (user_id, updated_at);

alter table public.saved_poems enable row level security;

create policy "Users can select their own saved poems"
  on public.saved_poems
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own saved poems"
  on public.saved_poems
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own saved poems"
  on public.saved_poems
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own saved poems"
  on public.saved_poems
  for delete
  to authenticated
  using (user_id = auth.uid());
