create extension if not exists pgcrypto;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  price numeric(10, 2) not null check (price > 0),
  image_url text not null,
  tag text,
  legacy_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id text primary key check (id = 'main'),
  whatsapp text not null default ''
);

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.trips enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_admins enable row level security;

grant select on public.trips to anon, authenticated;
grant insert, update, delete on public.trips to authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant select on public.site_admins to authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.site_admins
    where user_id = (select auth.uid())
  );
$$;

grant execute on function public.is_site_admin() to anon, authenticated;

drop policy if exists "Anyone can read trips" on public.trips;
create policy "Anyone can read trips"
  on public.trips for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert trips" on public.trips;
create policy "Admins can insert trips"
  on public.trips for insert
  to authenticated
  with check ((select public.is_site_admin()));

drop policy if exists "Admins can update trips" on public.trips;
create policy "Admins can update trips"
  on public.trips for update
  to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

drop policy if exists "Admins can delete trips" on public.trips;
create policy "Admins can delete trips"
  on public.trips for delete
  to authenticated
  using ((select public.is_site_admin()));

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings"
  on public.site_settings for all
  to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

drop policy if exists "Admins can read their own admin record" on public.site_admins;
create policy "Admins can read their own admin record"
  on public.site_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-images', 'trip-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view trip images" on storage.objects;
create policy "Anyone can view trip images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'trip-images');

drop policy if exists "Admins can upload trip images" on storage.objects;
create policy "Admins can upload trip images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'trip-images' and (select public.is_site_admin()));

drop policy if exists "Admins can update trip images" on storage.objects;
create policy "Admins can update trip images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'trip-images' and (select public.is_site_admin()))
  with check (bucket_id = 'trip-images' and (select public.is_site_admin()));

drop policy if exists "Admins can delete trip images" on storage.objects;
create policy "Admins can delete trip images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'trip-images' and (select public.is_site_admin()));

insert into public.site_settings (id, whatsapp)
values ('main', '')
on conflict (id) do nothing;

insert into public.trips (title, description, price, image_url, tag)
select seed.title, seed.description, seed.price, seed.image_url, seed.tag
from (values
  ('Maragogi, Alagoas', 'Piscinas naturais, mar transparente e dias que passam sem pressa.', 1890::numeric, 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1100&q=82', 'Mar cristalino'),
  ('Fernando de Noronha', 'Praias preservadas e paisagens que merecem todo o seu tempo.', 3240::numeric, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1100&q=82', 'Natureza sem igual'),
  ('Jericoacoara, Ceará', 'Dunas douradas, lagoas tranquilas e um pôr do sol inesquecível.', 2160::numeric, 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1100&q=82', 'Ritmo leve')
) as seed(title, description, price, image_url, tag)
where not exists (
  select 1 from public.trips existing where existing.title = seed.title
);
