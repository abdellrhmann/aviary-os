-- Bird photos: one photo per bird, stored in a private bucket.
-- Path convention: <owner_id>/<bird_id>.<ext>

-- 1) Column on birds (stores only the storage path)
alter table public.birds
  add column if not exists photo_path text;

-- The path must live inside the owner's own folder and stay short
alter table public.birds
  drop constraint if exists birds_photo_path_check;
alter table public.birds
  add constraint birds_photo_path_check
  check (
    photo_path is null
    or (
      char_length(photo_path) <= 200
      and photo_path like owner_id::text || '/%'
    )
  );

-- Column privileges (harmless if table-level privileges already exist)
grant insert (photo_path) on public.birds to authenticated;
grant update (photo_path) on public.birds to authenticated;

-- 2) Private bucket with hard limits
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bird-photos',
  'bird-photos',
  false,
  2097152,
  array['image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/webp'];

-- 3) Per-owner policies on storage.objects (first folder = auth.uid())
drop policy if exists "bird_photos_select_own" on storage.objects;
drop policy if exists "bird_photos_insert_own" on storage.objects;
drop policy if exists "bird_photos_update_own" on storage.objects;
drop policy if exists "bird_photos_delete_own" on storage.objects;

create policy "bird_photos_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'bird-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "bird_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bird-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "bird_photos_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'bird-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'bird-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "bird_photos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'bird-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );