-- À coller dans Supabase → SQL Editor → Run. Idempotent : peut être relancé.

create extension if not exists pgcrypto;

-- ───────── Pièces ─────────
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  subcategory text,
  colors text[] not null default '{}',
  material text,
  pattern text,
  seasons text[] not null default '{}',
  formality smallint check (formality between 1 and 5),
  styles text[] not null default '{}',
  warmth smallint check (warmth between 1 and 5),
  layer text check (layer in ('base','intermediaire','exterieur','n/a')),
  waterproof boolean not null default false,
  brand text,
  reference text,
  size text,
  price numeric(8,2),
  purchased_at date,
  condition text check (condition in ('neuf','bon','use','a_reparer')),
  status text not null default 'a_valider' check (status in ('a_valider','actif','archive')),
  image_path text,
  thumb_path text,
  wear_count integer not null default 0,
  last_worn_at date,
  confidence real,
  ai_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_user_status on items(user_id, status);

-- ───────── Tenues et ports ─────────
create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text,
  occasion text not null,
  occasion_text text,
  accords text,
  formality smallint,
  weather jsonb,
  source text not null default 'ia' check (source in ('ia','manuelle')),
  status text not null default 'proposee' check (status in ('proposee','portee','planifiee')),
  planned_for date,
  created_at timestamptz not null default now()
);

create table if not exists outfit_items (
  outfit_id uuid not null references outfits(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (outfit_id, item_id)
);

create table if not exists wears (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  outfit_id uuid references outfits(id) on delete set null,
  worn_on date not null default current_date,
  unique (item_id, worn_on)
);
create index if not exists wears_user_date on wears(user_id, worn_on desc);

-- Compteurs de ports tenus à jour par trigger
create or replace function refresh_item_wears() returns trigger language plpgsql as $$
declare tid uuid := coalesce(new.item_id, old.item_id);
begin
  update items set
    wear_count = (select count(*) from wears where item_id = tid),
    last_worn_at = (select max(worn_on) from wears where item_id = tid),
    updated_at = now()
  where id = tid;
  return null;
end $$;
drop trigger if exists wears_refresh on wears;
create trigger wears_refresh after insert or delete on wears
  for each row execute function refresh_item_wears();

-- ───────── Goûts et suivi IA ─────────
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('outfit','item','purchase')),
  target_id uuid,
  snapshot jsonb,
  rating smallint not null check (rating in (-1, 1)),
  reason text,
  summarized boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists taste_profile (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  summary jsonb not null default '{"likes":[],"dislikes":[],"never":[],"notes":""}',
  feedback_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null default current_date,
  model text not null,
  kind text not null,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_day on ai_usage(user_id, day, model);

-- V1.5
create table if not exists purchase_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'ouverte' check (status in ('ouverte','achetee','ignoree')),
  created_at timestamptz not null default now()
);

-- ───────── Sécurité : chaque ligne appartient à toi seul ─────────
do $$
declare t text;
begin
  foreach t in array array['items','outfits','outfit_items','wears','feedback',
                           'taste_profile','ai_usage','purchase_suggestions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists owner_all on %I', t);
    execute format(
      'create policy owner_all on %I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ───────── Stockage privé des photos ─────────
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', false)
on conflict (id) do update set public = false;

drop policy if exists wardrobe_owner on storage.objects;
create policy wardrobe_owner on storage.objects for all to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
-- Chemins attendus : <user_id>/<item_id>.webp et <user_id>/<item_id>_thumb.webp
