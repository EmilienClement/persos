-- À coller dans Supabase → SQL Editor → Run (une seule fois). Idempotent.
create table if not exists wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  url text,
  image_url text,
  price numeric(8,2),
  note text,
  status text not null default 'souhaitee' check (status in ('souhaitee','achetee')),
  created_at timestamptz not null default now()
);
alter table wishlist enable row level security;
drop policy if exists owner_all on wishlist;
create policy owner_all on wishlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
