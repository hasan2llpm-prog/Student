-- Student v2.7.0 FIX5
-- Replace Stories with Community and permanently remove all Stories runtime data.
-- DESTRUCTIVE: run only after the FIX5 APK/AAB build succeeds.

begin;

-- -----------------------------------------------------------------------------
-- Community media storage: public read, authenticated users may write only
-- inside their own top-level folder: community/<auth.uid()>/...
-- -----------------------------------------------------------------------------
insert into storage.buckets(id, name, public)
values ('community', 'community', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists student_community_media_public_read_v275 on storage.objects;
create policy student_community_media_public_read_v275
on storage.objects for select to public
using (bucket_id = 'community');

drop policy if exists student_community_media_insert_own_v275 on storage.objects;
create policy student_community_media_insert_own_v275
on storage.objects for insert to authenticated
with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists student_community_media_update_own_v275 on storage.objects;
create policy student_community_media_update_own_v275
on storage.objects for update to authenticated
using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists student_community_media_delete_own_v275 on storage.objects;
create policy student_community_media_delete_own_v275
on storage.objects for delete to authenticated
using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- Community posts can now be text, image or video. media_low_url is the 360p
-- fallback used on constrained connections; media_mime allows safe rendering.
-- -----------------------------------------------------------------------------
alter table if exists public.posts add column if not exists media_low_url text;
alter table if exists public.posts add column if not exists media_mime text;

-- Replace any old post_type CHECK that only allowed text/image.
do $$
declare r record;
begin
  if pg_catalog.to_regclass('public.posts') is null then return; end if;
  for r in
    select c.conname
    from pg_catalog.pg_constraint c
    where c.conrelid = 'public.posts'::regclass
      and c.contype = 'c'
      and pg_catalog.pg_get_constraintdef(c.oid) ilike '%post_type%'
  loop
    execute pg_catalog.format('alter table public.posts drop constraint %I', r.conname);
  end loop;

  update public.posts
     set post_type = case
       when lower(coalesce(post_type,'')) in ('text','image','video') then lower(post_type)
       when media_url is not null then 'image'
       else 'text'
     end;

  alter table public.posts
    add constraint posts_post_type_v275_check check (post_type in ('text','image','video'));
end $$;

do $$
begin
  if pg_catalog.to_regclass('public.posts') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='created_at')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='deleted_at') then
    execute 'create index if not exists idx_posts_community_created_v275 on public.posts(created_at desc) where deleted_at is null';
  end if;
end $$;

-- The existing v27 public-media moderation trigger on posts remains authoritative.
-- If the release migration was not previously applied, attach it when possible.
do $$
begin
  if pg_catalog.to_regclass('public.posts') is not null
     and pg_catalog.to_regprocedure('public.student_require_public_media_approval_v27()') is not null then
    execute 'drop trigger if exists trg_student_posts_moderation_v27 on public.posts';
    execute 'create trigger trg_student_posts_moderation_v27 before insert or update of media_url on public.posts for each row execute function public.student_require_public_media_approval_v27()';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Remove Stories from remote feature controls and legacy notification/saved data.
-- -----------------------------------------------------------------------------
do $$
begin
  if pg_catalog.to_regclass('public.student_feature_controls') is not null then
    execute 'delete from public.student_feature_controls where lower(feature_key) in (''story'',''stories'')';
  end if;
  if pg_catalog.to_regclass('public.feature_flags') is not null then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='feature_flags' and column_name='feature_key') then
      execute 'delete from public.feature_flags where lower(feature_key) in (''story'',''stories'')';
    elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='feature_flags' and column_name='key') then
      execute 'delete from public.feature_flags where lower(key) in (''story'',''stories'')';
    end if;
  end if;
end $$;

do $$
begin
  if pg_catalog.to_regclass('public.notifications') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='notifications' and column_name='kind'
    ) then
      execute 'delete from public.notifications where lower(coalesce(kind,'''')) like ''story_%''';
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='notifications' and column_name='metadata'
    ) then
      execute 'delete from public.notifications where metadata::jsonb ? ''story_id'' or lower(coalesce(metadata::jsonb->>''target_type'',''''))=''story''';
    end if;
  end if;

  if pg_catalog.to_regclass('public.saved_items') is not null then
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='saved_items' and column_name='item_type'
    ) then
      execute 'delete from public.saved_items where lower(coalesce(item_type,''''))=''story''';
    elsif exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='saved_items' and column_name='kind'
    ) then
      execute 'delete from public.saved_items where lower(coalesce(kind,''''))=''story''';
    end if;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Permanently remove Stories triggers/functions/tables.
-- -----------------------------------------------------------------------------
drop function if exists public.student_notify_story_reaction_v16() cascade;
drop function if exists public.student_notify_story_reply_v16() cascade;
drop function if exists public.student_archive_story_view() cascade;
drop function if exists public.student_story_viewers_history(uuid) cascade;

drop table if exists public.student_story_view_history cascade;
drop table if exists public.story_replies cascade;
drop table if exists public.story_reactions cascade;
drop table if exists public.story_views cascade;
drop table if exists public.stories cascade;

-- Remove legacy Stories storage policies. The physical bucket is intentionally
-- NOT deleted with SQL: Supabase Storage keeps file bytes outside Postgres, so
-- deleting storage.objects/storage.buckets rows directly would orphan billable
-- objects. Empty + delete the legacy bucket through the Storage API/Dashboard
-- after this migration (a one-shot cleanup helper is shipped with FIX5).
drop policy if exists student_story_media_public_read_v274 on storage.objects;
drop policy if exists student_story_media_insert_own_v274 on storage.objects;
drop policy if exists student_story_media_update_own_v274 on storage.objects;
drop policy if exists student_story_media_delete_own_v274 on storage.objects;

commit;
