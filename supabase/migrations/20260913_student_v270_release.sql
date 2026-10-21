-- Student v2.7.0 FIX4 production migration
-- Verification sync, private-content visibility, media moderation,
-- voice-room cleanup and persistent per-user vocabulary assignments.
begin;

-- ------------------------------------------------------------------
-- Story media Storage bucket and owner-scoped access.
-- ------------------------------------------------------------------
insert into storage.buckets(id,name,public)
values('stories','stories',true)
on conflict(id) do update set public=excluded.public;

drop policy if exists student_story_media_public_read_v274 on storage.objects;
create policy student_story_media_public_read_v274
on storage.objects for select to public
using (bucket_id='stories');

drop policy if exists student_story_media_insert_own_v274 on storage.objects;
create policy student_story_media_insert_own_v274
on storage.objects for insert to authenticated
with check (bucket_id='stories' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists student_story_media_update_own_v274 on storage.objects;
create policy student_story_media_update_own_v274
on storage.objects for update to authenticated
using (bucket_id='stories' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='stories' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists student_story_media_delete_own_v274 on storage.objects;
create policy student_story_media_delete_own_v274
on storage.objects for delete to authenticated
using (bucket_id='stories' and (storage.foldername(name))[1]=auth.uid()::text);

-- ------------------------------------------------------------------
-- Verification is profile-authoritative and realtime.
-- ------------------------------------------------------------------
alter table public.profiles add column if not exists account_status text not null default 'public';
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists verification_color text;

create or replace function public.student_admin_grant_verification_v27(p_user uuid, p_color text default 'blue')
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.current_user_is_admin() then raise exception 'admin_required'; end if;
  if p_user is null then raise exception 'user_required'; end if;

  update public.profiles
     set is_verified=true,
         verification_color=case
           when pg_catalog.lower(coalesce(role,''))='teacher' then 'red'
           when pg_catalog.lower(coalesce(role,''))='admin' then 'orange'
           else coalesce(nullif(pg_catalog.lower(pg_catalog.btrim(p_color)),''),'blue')
         end
   where id=p_user;
  if not found then raise exception 'profile_not_found'; end if;
end $$;
revoke all on function public.student_admin_grant_verification_v27(uuid,text) from public,anon;
grant execute on function public.student_admin_grant_verification_v27(uuid,text) to authenticated;

do $$
begin
  if exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime')
     and not exists(
       select 1 from pg_catalog.pg_publication_tables
       where pubname='supabase_realtime' and schemaname='public' and tablename='profiles'
     ) then
    execute 'alter publication supabase_realtime add table public.profiles';
  end if;
exception when others then
  raise notice 'profiles realtime publication unchanged: %', sqlerrm;
end $$;

-- ------------------------------------------------------------------
-- Private account visibility: only self or mutual followers.
-- ------------------------------------------------------------------
create or replace function public.student_can_view_owner_content_v27(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select case
    when auth.uid() is null then false
    when p_owner=auth.uid() then true
    when coalesce((select pg_catalog.lower(account_status) from public.profiles where id=p_owner),'public') <> 'private' then true
    else exists(
      select 1
      from public.follows a
      join public.follows b
        on b.follower_id=a.following_id and b.following_id=a.follower_id
      where a.follower_id=auth.uid()
        and a.following_id=p_owner
    )
  end
$$;
revoke all on function public.student_can_view_owner_content_v27(uuid) from public,anon;
grant execute on function public.student_can_view_owner_content_v27(uuid) to authenticated;

-- ------------------------------------------------------------------
-- Public-media moderation audit. Only the Edge Function/service role writes here.
-- ------------------------------------------------------------------
create table if not exists public.student_public_media_moderation_v27(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null check(media_type in ('image','video')),
  status text not null check(status in ('approved','rejected','review')),
  reason text,
  provider text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists student_public_media_moderation_v27_lookup
  on public.student_public_media_moderation_v27(user_id,media_url,created_at desc);
alter table public.student_public_media_moderation_v27 enable row level security;
revoke all on public.student_public_media_moderation_v27 from anon,authenticated;
grant select,insert,update,delete on public.student_public_media_moderation_v27 to service_role;

alter table if exists public.posts add column if not exists moderation_status text not null default 'approved';
alter table if exists public.stories add column if not exists moderation_status text not null default 'approved';
alter table if exists public.reels add column if not exists moderation_status text not null default 'approved';

create or replace function public.student_require_public_media_approval_v27()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  url text;
  st text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if new.user_id <> uid then raise exception 'owner_mismatch'; end if;

  if tg_table_name='reels' then
    url:=nullif(pg_catalog.btrim(coalesce(new.video_url,'')),'');
  else
    url:=nullif(pg_catalog.btrim(coalesce(new.media_url,'')),'');
  end if;

  if url is null then
    new.moderation_status:='approved';
    return new;
  end if;

  select m.status into st
  from public.student_public_media_moderation_v27 m
  where m.user_id=uid and m.media_url=url
    and m.created_at >= pg_catalog.now()-interval '60 minutes'
  order by m.created_at desc
  limit 1;

  if st='approved' then
    new.moderation_status:='approved';
    return new;
  elsif st='rejected' then
    raise exception 'public_media_rejected';
  else
    raise exception 'public_media_review_required';
  end if;
end $$;
revoke all on function public.student_require_public_media_approval_v27() from public,anon,authenticated;

-- Attach moderation and privacy enforcement only when the target tables exist.
do $$
begin
  if pg_catalog.to_regclass('public.posts') is not null then
    execute 'drop trigger if exists trg_student_posts_moderation_v27 on public.posts';
    execute 'create trigger trg_student_posts_moderation_v27 before insert or update of media_url on public.posts for each row execute function public.student_require_public_media_approval_v27()';
    execute 'drop policy if exists student_posts_privacy_guard_v27 on public.posts';
    execute 'create policy student_posts_privacy_guard_v27 on public.posts as restrictive for select to authenticated using (public.student_can_view_owner_content_v27(user_id) and moderation_status=''approved'')';
  end if;
  if pg_catalog.to_regclass('public.stories') is not null then
    execute 'drop trigger if exists trg_student_stories_moderation_v27 on public.stories';
    execute 'create trigger trg_student_stories_moderation_v27 before insert or update of media_url on public.stories for each row execute function public.student_require_public_media_approval_v27()';
    execute 'drop policy if exists student_stories_privacy_guard_v27 on public.stories';
    execute 'create policy student_stories_privacy_guard_v27 on public.stories as restrictive for select to authenticated using (public.student_can_view_owner_content_v27(user_id) and moderation_status=''approved'')';
  end if;
  if pg_catalog.to_regclass('public.reels') is not null then
    execute 'drop trigger if exists trg_student_reels_moderation_v27 on public.reels';
    execute 'create trigger trg_student_reels_moderation_v27 before insert or update of video_url on public.reels for each row execute function public.student_require_public_media_approval_v27()';
    execute 'drop policy if exists student_reels_privacy_guard_v27 on public.reels';
    execute 'create policy student_reels_privacy_guard_v27 on public.reels as restrictive for select to authenticated using (public.student_can_view_owner_content_v27(user_id) and moderation_status=''approved'')';
  end if;
end $$;

-- ------------------------------------------------------------------
-- Voice room leave: release the microphone immediately.
-- Owners remain members but never keep a ghost speaker seat.
-- ------------------------------------------------------------------
create or replace function public.student_voice_room_leave_v27(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  owner_row boolean:=false;
begin
  if uid is null then return; end if;

  select exists(
    select 1 from public.student_voice_room_members
    where room_id=p_room_id and user_id=uid and room_role='owner'
  ) into owner_row;

  update public.student_voice_room_members
     set mic_state='listener', mic_slot=null
   where room_id=p_room_id and user_id=uid;

  if not owner_row then
    delete from public.student_voice_room_members
     where room_id=p_room_id and user_id=uid;
  end if;
end $$;
revoke all on function public.student_voice_room_leave_v27(uuid) from public,anon;
grant execute on function public.student_voice_room_leave_v27(uuid) to authenticated;

-- ------------------------------------------------------------------
-- Persistent personalized vocabulary assignment.
-- A user's 15 word IDs are frozen for a sequence once assigned.
-- ------------------------------------------------------------------
create table if not exists public.student_vocabulary_assignment_v272(
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence_index integer not null check(sequence_index >= 0),
  position smallint not null check(position between 0 and 14),
  vocabulary_id uuid not null references public.english_vocabulary(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(user_id,sequence_index,position),
  unique(user_id,sequence_index,vocabulary_id)
);
create index if not exists student_vocabulary_assignment_v272_word_idx
  on public.student_vocabulary_assignment_v272(vocabulary_id);
alter table public.student_vocabulary_assignment_v272 enable row level security;
revoke all on public.student_vocabulary_assignment_v272 from anon,authenticated;
grant select,insert,update,delete on public.student_vocabulary_assignment_v272 to service_role;

create or replace function public.student_vocabulary_batch_v272(p_expected_sequence integer)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  seq integer;
  total integer;
  assigned integer;
  start_idx integer;
  result jsonb;
begin
  if uid is null then raise exception 'auth_required'; end if;
  if p_expected_sequence is null or p_expected_sequence < 0 then raise exception 'invalid_sequence'; end if;

  -- Serialize assignment creation for this user+sequence to prevent concurrent
  -- requests from producing a partial or conflicting batch.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(uid::text), p_expected_sequence);

  perform public.student_learning_progress_get_v24('vocabulary');
  select sequence_index into seq
    from public.student_learning_progress_v24
   where user_id=uid and section_key='vocabulary';

  if seq is distinct from p_expected_sequence then
    raise exception 'progress_out_of_date';
  end if;

  select pg_catalog.count(*)::integer into assigned
    from public.student_vocabulary_assignment_v272
   where user_id=uid and sequence_index=seq;

  if assigned <> 15 then
    -- A partial assignment can only be left by an interrupted older transaction.
    -- Rebuild it atomically under the advisory lock.
    delete from public.student_vocabulary_assignment_v272
     where user_id=uid and sequence_index=seq;

    select pg_catalog.count(*)::integer into total
      from public.english_vocabulary
     where is_active=true;

    if total < 15 then raise exception 'insufficient_vocabulary'; end if;
    start_idx := pg_catalog.mod(seq * 15, total);

    with ordered as (
      select ev.id,
             pg_catalog.row_number() over(
               order by pg_catalog.md5(uid::text || ':' || ev.id::text), ev.id
             ) - 1 as rn
        from public.english_vocabulary ev
       where ev.is_active=true
    ), ranked as (
      select id,
             pg_catalog.mod((rn::integer - start_idx + total), total) as distance
        from ordered
    ), picked as (
      select id,
             (pg_catalog.row_number() over(order by distance, id) - 1)::smallint as position
        from ranked
       order by distance, id
       limit 15
    )
    insert into public.student_vocabulary_assignment_v272(user_id,sequence_index,position,vocabulary_id)
    select uid,seq,p.position,p.id
      from picked p
    on conflict do nothing;

    select pg_catalog.count(*)::integer into assigned
      from public.student_vocabulary_assignment_v272
     where user_id=uid and sequence_index=seq;
    if assigned <> 15 then raise exception 'vocabulary_assignment_incomplete'; end if;
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', ev.id,
        'word', ev.word,
        'meaning_ar', ev.meaning_ar,
        'level', ev.level,
        'example_en', ev.example_en,
        'example_ar', ev.example_ar,
        'source', ev.source,
        'source_rank', ev.source_rank,
        'part_of_speech', ev.part_of_speech,
        'category', ev.category
      ) order by a.position
    ),
    '[]'::jsonb
  ) into result
  from public.student_vocabulary_assignment_v272 a
  join public.english_vocabulary ev on ev.id=a.vocabulary_id
  where a.user_id=uid and a.sequence_index=seq;

  return result;
end $$;
revoke all on function public.student_vocabulary_batch_v272(integer) from public,anon;
grant execute on function public.student_vocabulary_batch_v272(integer) to authenticated;

-- Backward-compatible FIX2 RPC: old clients receive the same persistent FIX3 batch.
create or replace function public.student_vocabulary_batch_v271(p_expected_sequence integer)
returns jsonb
language sql
security definer
set search_path=''
as $$
  select public.student_vocabulary_batch_v272(p_expected_sequence)
$$;
revoke all on function public.student_vocabulary_batch_v271(integer) from public,anon;
grant execute on function public.student_vocabulary_batch_v271(integer) to authenticated;

-- Server automation privileges used by signed release automation.
grant usage on schema public to service_role;

do $$
begin
  if pg_catalog.to_regclass('public.student_runtime_settings') is not null then
    execute 'grant select,insert,update,delete on public.student_runtime_settings to service_role';
  end if;
  if pg_catalog.to_regclass('public.notifications') is not null then
    execute 'grant select,insert,update,delete on public.notifications to service_role';
  end if;
end $$;

commit;
