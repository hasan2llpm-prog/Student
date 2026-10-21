-- Student v1.9.1 Beta incremental backend fixes
-- Run once in Supabase SQL Editor BEFORE testing the v1.9.1 Beta APK.
-- Safe/idempotent: does not delete user content.
begin;

create extension if not exists pgcrypto;

create or replace function public.student_native_is_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid() and lower(coalesce(role,''))='admin'
  );
$$;
revoke all on function public.student_native_is_admin() from public, anon;
grant execute on function public.student_native_is_admin() to authenticated;

create or replace function public.student_native_can_publish_education()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.profiles
    where id=auth.uid()
      and lower(coalesce(role,'student')) in ('admin','teacher','instructor','professor')
  );
$$;
revoke all on function public.student_native_can_publish_education() from public, anon;
grant execute on function public.student_native_can_publish_education() to authenticated;

-- ------------------------------------------------------------------
-- Education catalog: students can read; only admin can mutate structure.
-- Existing admin policies remain in place; these SELECT policies fix the
-- common case where enabling RLS accidentally hid stages/levels/subjects.
-- ------------------------------------------------------------------
do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'education_stages','education_levels','education_subjects','education_level_subjects',
    'education_tracks','education_track_subjects','universities','university_colleges',
    'university_departments','university_levels','university_subjects','university_level_subjects'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('grant select on public.%I to authenticated', t);
      p := 'student_v191_read_'||t;
      execute format('drop policy if exists %I on public.%I', p, t);
      execute format('create policy %I on public.%I for select to authenticated using (true)', p, t);
    end if;
  end loop;
end $$;

-- Education materials: readable by signed-in users; write goes through RPC.
do $$
begin
  if to_regclass('public.education_materials') is not null then
    alter table public.education_materials enable row level security;
    grant select on public.education_materials to authenticated;
    drop policy if exists student_v191_read_education_materials on public.education_materials;
    create policy student_v191_read_education_materials
      on public.education_materials for select to authenticated using (true);
  end if;
end $$;

-- Create a school subject and link it to the selected level in one transaction.
create or replace function public.student_admin_create_school_subject(
  p_level_id uuid,
  p_name text,
  p_slug text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  sid uuid;
begin
  if not public.student_native_is_admin() then raise exception 'هذه العملية للأدمن فقط.'; end if;
  if coalesce(trim(p_name),'')='' then raise exception 'اسم المادة مطلوب.'; end if;
  if not exists(select 1 from public.education_levels where id=p_level_id) then raise exception 'المرحلة غير موجودة.'; end if;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_subjects' and column_name='is_active')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_subjects' and column_name='is_visible') then
    execute 'insert into public.education_subjects(name,slug,description,is_active,is_visible) values($1,$2,$3,true,true) returning id'
      into sid using trim(p_name),coalesce(nullif(trim(p_slug),''),lower(replace(trim(p_name),' ','-'))),coalesce(p_description,'');
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_subjects' and column_name='is_active') then
    execute 'insert into public.education_subjects(name,slug,description,is_active) values($1,$2,$3,true) returning id'
      into sid using trim(p_name),coalesce(nullif(trim(p_slug),''),lower(replace(trim(p_name),' ','-'))),coalesce(p_description,'');
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_subjects' and column_name='is_visible') then
    execute 'insert into public.education_subjects(name,slug,description,is_visible) values($1,$2,$3,true) returning id'
      into sid using trim(p_name),coalesce(nullif(trim(p_slug),''),lower(replace(trim(p_name),' ','-'))),coalesce(p_description,'');
  else
    execute 'insert into public.education_subjects(name,slug,description) values($1,$2,$3) returning id'
      into sid using trim(p_name),coalesce(nullif(trim(p_slug),''),lower(replace(trim(p_name),' ','-'))),coalesce(p_description,'');
  end if;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_level_subjects' and column_name='is_active')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_level_subjects' and column_name='is_visible') then
    execute 'insert into public.education_level_subjects(level_id,subject_id,sort_order,is_active,is_visible) values($1,$2,0,true,true)' using p_level_id,sid;
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_level_subjects' and column_name='is_active') then
    execute 'insert into public.education_level_subjects(level_id,subject_id,sort_order,is_active) values($1,$2,0,true)' using p_level_id,sid;
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_level_subjects' and column_name='is_visible') then
    execute 'insert into public.education_level_subjects(level_id,subject_id,sort_order,is_visible) values($1,$2,0,true)' using p_level_id,sid;
  else
    execute 'insert into public.education_level_subjects(level_id,subject_id,sort_order) values($1,$2,0)' using p_level_id,sid;
  end if;

  return sid;
end;
$$;
revoke all on function public.student_admin_create_school_subject(uuid,text,text,text) from public, anon;
grant execute on function public.student_admin_create_school_subject(uuid,text,text,text) to authenticated;

-- Create a university subject and link it to the selected university level.
create or replace function public.student_admin_create_university_subject(
  p_university_level_id uuid,
  p_name text,
  p_slug text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  sid uuid;
begin
  if not public.student_native_is_admin() then raise exception 'هذه العملية للأدمن فقط.'; end if;
  if coalesce(trim(p_name),'')='' then raise exception 'اسم المادة مطلوب.'; end if;
  if not exists(select 1 from public.university_levels where id=p_university_level_id) then raise exception 'المرحلة الجامعية غير موجودة.'; end if;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='university_subjects' and column_name='is_active')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='university_subjects' and column_name='is_visible') then
    execute 'insert into public.university_subjects(name,slug,description,is_active,is_visible) values($1,$2,$3,true,true) returning id'
      into sid using trim(p_name),coalesce(nullif(trim(p_slug),''),lower(replace(trim(p_name),' ','-'))),coalesce(p_description,'');
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='university_subjects' and column_name='is_active') then
    execute 'insert into public.university_subjects(name,slug,description,is_active) values($1,$2,$3,true) returning id'
      into sid using trim(p_name),coalesce(nullif(trim(p_slug),''),lower(replace(trim(p_name),' ','-'))),coalesce(p_description,'');
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='university_subjects' and column_name='is_visible') then
    execute 'insert into public.university_subjects(name,slug,description,is_visible) values($1,$2,$3,true) returning id'
      into sid using trim(p_name),coalesce(nullif(trim(p_slug),''),lower(replace(trim(p_name),' ','-'))),coalesce(p_description,'');
  else
    execute 'insert into public.university_subjects(name,slug,description) values($1,$2,$3) returning id'
      into sid using trim(p_name),coalesce(nullif(trim(p_slug),''),lower(replace(trim(p_name),' ','-'))),coalesce(p_description,'');
  end if;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='university_level_subjects' and column_name='is_active')
     and exists(select 1 from information_schema.columns where table_schema='public' and table_name='university_level_subjects' and column_name='is_visible') then
    execute 'insert into public.university_level_subjects(university_level_id,subject_id,sort_order,is_active,is_visible) values($1,$2,0,true,true)' using p_university_level_id,sid;
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='university_level_subjects' and column_name='is_active') then
    execute 'insert into public.university_level_subjects(university_level_id,subject_id,sort_order,is_active) values($1,$2,0,true)' using p_university_level_id,sid;
  elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name='university_level_subjects' and column_name='is_visible') then
    execute 'insert into public.university_level_subjects(university_level_id,subject_id,sort_order,is_visible) values($1,$2,0,true)' using p_university_level_id,sid;
  else
    execute 'insert into public.university_level_subjects(university_level_id,subject_id,sort_order) values($1,$2,0)' using p_university_level_id,sid;
  end if;

  return sid;
end;
$$;
revoke all on function public.student_admin_create_university_subject(uuid,text,text,text) from public, anon;
grant execute on function public.student_admin_create_university_subject(uuid,text,text,text) to authenticated;

-- Unified Native education publishing RPC used by v1.9.1.
-- It supports text/link/video/pdf/image/file while remaining compatible with
-- older databases whose material_type constraint only knows text/link/video/pdf.
create or replace function public.student_publish_education_material_v191(
  p_education_type text,
  p_subject_id uuid,
  p_level_id uuid,
  p_track_id uuid,
  p_university_level_id uuid,
  p_title text,
  p_description text,
  p_material_type text,
  p_file_url text,
  p_external_url text,
  p_file_name text,
  p_mime_type text,
  p_file_size bigint
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  safe_type text;
  edu_type text;
begin
  if uid is null then raise exception 'يجب تسجيل الدخول أولًا.'; end if;
  if not public.student_native_can_publish_education() then raise exception 'النشر التعليمي متاح للمدرس أو الأدمن فقط.'; end if;
  if p_subject_id is null or coalesce(trim(p_title),'')='' then raise exception 'المادة والعنوان مطلوبان.'; end if;

  edu_type := case when lower(coalesce(p_education_type,''))='university' or p_university_level_id is not null then 'university' else 'school' end;
  safe_type := lower(coalesce(nullif(trim(p_material_type),''),'text'));
  if safe_type not in ('text','link','video','pdf','image','file') then safe_type := 'text'; end if;

  -- Try the requested type first. If an old CHECK constraint rejects image/file,
  -- use link; file_url still keeps the actual uploaded content accessible.
  begin
    insert into public.education_materials(
      subject_id,title,description,material_type,file_url,external_url,created_by,status,education_type,university_level_id
    ) values(
      p_subject_id,trim(p_title),coalesce(p_description,''),safe_type,
      nullif(trim(coalesce(p_file_url,'')),''),nullif(trim(coalesce(p_external_url,'')),''),
      uid,'published',edu_type,p_university_level_id
    ) returning id into mid;
  exception when check_violation then
    insert into public.education_materials(
      subject_id,title,description,material_type,file_url,external_url,created_by,status,education_type,university_level_id
    ) values(
      p_subject_id,trim(p_title),coalesce(p_description,''),
      case when safe_type='video' then 'video' when safe_type='pdf' then 'pdf' when safe_type='text' then 'text' else 'link' end,
      nullif(trim(coalesce(p_file_url,'')),''),nullif(trim(coalesce(p_external_url,'')),''),
      uid,'published',edu_type,p_university_level_id
    ) returning id into mid;
  end;

  -- Fill optional columns only when present in the live schema.
  if p_level_id is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_materials' and column_name='level_id') then
    execute 'update public.education_materials set level_id=$1 where id=$2' using p_level_id,mid;
  end if;
  if p_track_id is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_materials' and column_name='track_id') then
    execute 'update public.education_materials set track_id=$1 where id=$2' using p_track_id,mid;
  end if;
  if nullif(trim(coalesce(p_file_name,'')),'') is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_materials' and column_name='file_name') then
    execute 'update public.education_materials set file_name=$1 where id=$2' using trim(p_file_name),mid;
  end if;
  if nullif(trim(coalesce(p_mime_type,'')),'') is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_materials' and column_name='mime_type') then
    execute 'update public.education_materials set mime_type=$1 where id=$2' using trim(p_mime_type),mid;
  end if;
  if p_file_size is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_materials' and column_name='file_size') then
    execute 'update public.education_materials set file_size=$1 where id=$2' using p_file_size,mid;
  end if;

  return mid;
end;
$$;
revoke all on function public.student_publish_education_material_v191(text,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,bigint) from public, anon;
grant execute on function public.student_publish_education_material_v191(text,uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,bigint) to authenticated;

-- Education upload bucket.
insert into storage.buckets(id,name,public)
values('education-content','education-content',true)
on conflict(id) do update set public=true;

drop policy if exists student_v191_education_read on storage.objects;
create policy student_v191_education_read on storage.objects
for select to public using(bucket_id='education-content');

drop policy if exists student_v191_education_insert on storage.objects;
create policy student_v191_education_insert on storage.objects
for insert to authenticated
with check(bucket_id='education-content' and public.student_native_can_publish_education());

drop policy if exists student_v191_education_update on storage.objects;
create policy student_v191_education_update on storage.objects
for update to authenticated
using(bucket_id='education-content' and public.student_native_can_publish_education())
with check(bucket_id='education-content' and public.student_native_can_publish_education());

drop policy if exists student_v191_education_delete on storage.objects;
create policy student_v191_education_delete on storage.objects
for delete to authenticated
using(bucket_id='education-content' and public.student_native_can_publish_education());

-- Reels v1.9.1 needs a real alternate source for network-quality switching.
alter table public.reels add column if not exists video_low_url text;
alter table public.reels add column if not exists hls_url text;

insert into storage.buckets(id,name,public)
values('reels','reels',true)
on conflict(id) do update set public=true;

drop policy if exists student_v191_reels_read on storage.objects;
create policy student_v191_reels_read on storage.objects
for select to public using(bucket_id='reels');

drop policy if exists student_v191_reels_insert_own on storage.objects;
create policy student_v191_reels_insert_own on storage.objects
for insert to authenticated
with check(bucket_id='reels' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists student_v191_reels_update_own on storage.objects;
create policy student_v191_reels_update_own on storage.objects
for update to authenticated
using(bucket_id='reels' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='reels' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists student_v191_reels_delete_own on storage.objects;
create policy student_v191_reels_delete_own on storage.objects
for delete to authenticated
using(bucket_id='reels' and (storage.foldername(name))[1]=auth.uid()::text);

notify pgrst, 'reload schema';
commit;
