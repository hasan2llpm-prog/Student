-- Student v1.8.0 Scale Ready
-- Safe indexes, cleanup helpers, rate-limit primitives, notification delivery tracking.
create extension if not exists pgcrypto;

create table if not exists public.student_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);
revoke all on public.student_rate_limits from anon, authenticated;

create or replace function public.student_rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare r public.student_rate_limits%rowtype; nowv timestamptz:=now();
begin
  if p_key is null or p_limit < 1 or p_window_seconds < 1 then return false; end if;
  insert into public.student_rate_limits(key,window_started_at,hits,updated_at)
  values(p_key,nowv,1,nowv)
  on conflict(key) do update set
    window_started_at = case when public.student_rate_limits.window_started_at <= nowv-make_interval(secs=>p_window_seconds) then nowv else public.student_rate_limits.window_started_at end,
    hits = case when public.student_rate_limits.window_started_at <= nowv-make_interval(secs=>p_window_seconds) then 1 else public.student_rate_limits.hits+1 end,
    updated_at=nowv
  returning * into r;
  return r.hits <= p_limit;
end $$;
revoke all on function public.student_rate_limit_hit(text,integer,integer) from public;
grant execute on function public.student_rate_limit_hit(text,integer,integer) to authenticated, service_role;

-- Push delivery bookkeeping for diagnostics/cleanup without exposing technical data to users.
create table if not exists public.student_push_delivery_log (
  id bigint generated always as identity primary key,
  notification_id uuid,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);
revoke all on public.student_push_delivery_log from anon, authenticated;

-- Create indexes only where both table and columns exist.
do $$
declare spec text[]; t text; idx text; cols text; c text; ok boolean;
begin
  foreach spec slice 1 in array array[
    array['notifications','idx_notifications_user_created','user_id,created_at desc'],
    array['notifications','idx_notifications_kind_created','kind,created_at desc'],
    array['messages','idx_messages_conversation_created','conversation_id,created_at desc'],
    array['messages','idx_messages_sender_created','sender_id,created_at desc'],
    array['posts','idx_posts_user_created','user_id,created_at desc'],
    array['posts','idx_posts_created','created_at desc'],
    array['comments','idx_comments_post_created','post_id,created_at asc'],
    array['comments','idx_comments_parent_created','parent_id,created_at asc'],
    array['post_likes','idx_post_likes_post_user','post_id,user_id'],
    array['follows','idx_follows_following_created','following_id,created_at desc'],
    array['follows','idx_follows_follower_created','follower_id,created_at desc'],
    array['stories','idx_stories_user_created','user_id,created_at desc'],
    array['story_reactions','idx_story_reactions_story_created','story_id,created_at desc'],
    array['story_replies','idx_story_replies_story_created','story_id,created_at desc'],
    array['device_push_tokens','idx_push_tokens_active_user','is_active,user_id'],
    array['student_social_room_messages','idx_room_messages_room_created','room_id,created_at desc'],
    array['english_review_queue','idx_review_queue_user_due','user_id,next_review_at'],
    array['student_ai_usage','idx_ai_usage_user_created','user_id,created_at desc']
  ] loop
    t:=spec[1]; idx:=spec[2]; cols:=spec[3];
    if to_regclass('public.'||t) is null then continue; end if;
    ok:=true;
    foreach c in array string_to_array(replace(cols,' desc',''),',') loop
      c:=trim(replace(c,' asc',''));
      if not exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name=c) then ok:=false; exit; end if;
    end loop;
    if ok then execute format('create index if not exists %I on public.%I (%s)',idx,t,cols); end if;
  end loop;
end $$;

create or replace function public.student_maintenance_v18()
returns jsonb language plpgsql security definer set search_path=public as $$
declare removed_limits int:=0; removed_logs int:=0;
begin
  delete from public.student_rate_limits where updated_at < now()-interval '2 days'; get diagnostics removed_limits=row_count;
  delete from public.student_push_delivery_log where created_at < now()-interval '30 days'; get diagnostics removed_logs=row_count;
  if to_regclass('public.stories') is not null then
    execute 'delete from public.stories where created_at < now()-interval ''48 hours'' and coalesce(deleted_at, now()+interval ''1 day'') < now()' ;
  end if;
  return jsonb_build_object('rate_limits',removed_limits,'push_logs',removed_logs,'ran_at',now());
exception when undefined_column then
  return jsonb_build_object('rate_limits',removed_limits,'push_logs',removed_logs,'ran_at',now());
end $$;
revoke all on function public.student_maintenance_v18() from public;
grant execute on function public.student_maintenance_v18() to service_role;
