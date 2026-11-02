-- Storage isolation test for the bird-photos bucket.
-- Runs inside a transaction and ends with ROLLBACK: nothing is kept.
-- Note: Supabase blocks direct DELETE on storage.objects (protect_delete trigger),
-- so delete isolation is checked via the policy definition here and via the
-- Storage API later.

begin;

-- Two fake users
insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'photo_a@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'photo_b@test.local');

create temp table photo_results (test text, passed boolean, detail text);
grant all on photo_results to authenticated, anon;

-- ===== User A uploads into their own folder =====
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);

do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('bird-photos', 'aaaaaaaa-0000-0000-0000-000000000001/bird1.jpg', 'aaaaaaaa-0000-0000-0000-000000000001');
    insert into photo_results values ('A uploads into own folder', true, 'allowed');
  exception when others then
    insert into photo_results values ('A uploads into own folder', false, sqlerrm);
  end;

  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('bird-photos', 'bbbbbbbb-0000-0000-0000-000000000002/stolen.jpg', 'aaaaaaaa-0000-0000-0000-000000000001');
    insert into photo_results values ('A uploads into B folder (must be denied)', false, 'WAS ALLOWED');
  exception when others then
    insert into photo_results values ('A uploads into B folder (must be denied)', true, 'denied');
  end;
end $$;

-- ===== User B =====
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);

do $$
declare n int;
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('bird-photos', 'bbbbbbbb-0000-0000-0000-000000000002/bird2.jpg', 'bbbbbbbb-0000-0000-0000-000000000002');
    insert into photo_results values ('B uploads into own folder', true, 'allowed');
  exception when others then
    insert into photo_results values ('B uploads into own folder', false, sqlerrm);
  end;

  select count(*) into n from storage.objects
   where bucket_id = 'bird-photos' and name like 'aaaaaaaa-%';
  insert into photo_results values ('B cannot see A files', n = 0, 'rows visible: ' || n);

  begin
    update storage.objects set name = 'bbbbbbbb-0000-0000-0000-000000000002/hijack.jpg'
     where bucket_id = 'bird-photos' and name like 'aaaaaaaa-%';
    get diagnostics n = row_count;
    insert into photo_results values ('B cannot move A files', n = 0, 'rows updated: ' || n);
  exception when others then
    insert into photo_results values ('B cannot move A files', true, 'blocked: ' || sqlerrm);
  end;
end $$;

-- ===== Anonymous =====
reset role;
set local role anon;

do $$
declare n int;
begin
  select count(*) into n from storage.objects where bucket_id = 'bird-photos';
  insert into photo_results values ('anon sees nothing', n = 0, 'rows visible: ' || n);
end $$;

reset role;

-- ===== Delete policy definition (delete cannot be tested directly) =====
insert into photo_results
select
  'delete policy restricts to own folder',
  count(*) = 1,
  'matching policies: ' || count(*)
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'bird_photos_delete_own'
  and cmd = 'DELETE'
  and roles = '{authenticated}'
  and qual like '%foldername%';

select * from photo_results order by test;

rollback;