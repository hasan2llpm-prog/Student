-- Student v1.6 Production Global Pack
-- Notification routing, social activity, community replies, soft delete,
-- daily learning reminder preferences, reports and feature controls.
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Notification privacy / routing
-- ------------------------------------------------------------
alter table if exists public.notifications add column if not exists audience text not null default 'all';
alter table if exists public.notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table if exists public.notifications add column if not exists link text;
alter table if exists public.notifications add column if not exists actor_id uuid;
alter table if exists public.notifications add column if not exists is_broadcast boolean not null default false;
alter table if exists public.notifications add column if not exists is_read boolean not null default false;

alter table if exists public.notifications enable row level security;

-- Remove older permissive SELECT policies that could expose admin broadcasts.
do $$
declare p record;
begin
  if to_regclass('public.notifications') is null then return; end if;
  for p in
    select policyname from pg_policies
    where schemaname='public' and tablename='notifications' and cmd='SELECT'
  loop
    execute format('drop policy if exists %I on public.notifications', p.policyname);
  end loop;
end $$;

drop policy if exists student_notifications_read_v16 on public.notifications;
create policy student_notifications_read_v16 on public.notifications
for select to authenticated
using (
  user_id = auth.uid()
  or (
    user_id is null and is_broadcast = true and
    (
      coalesce(audience,'all') = 'all'
      or (coalesce(audience,'all') = 'admin' and public.current_user_is_admin())
    )
  )
);

-- A user may only mark notifications they can actually see.
drop policy if exists student_notifications_update_v16 on public.notifications;
create policy student_notifications_update_v16 on public.notifications
for update to authenticated
using (
  user_id = auth.uid()
  or (user_id is null and is_broadcast=true and coalesce(audience,'all')='all')
  or (user_id is null and is_broadcast=true and coalesce(audience,'all')='admin' and public.current_user_is_admin())
)
with check (true);

grant select,update on public.notifications to authenticated;

create or replace function public.student_guard_notification_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare k text:=lower(coalesce(new.kind,'')); target text:=coalesce(new.metadata->>'target_id',new.metadata->>'post_id',new.metadata->>'story_id',new.link,'');
begin
  if new.user_id is not null and new.actor_id is not null and new.user_id=new.actor_id then return null; end if;
  if k like 'admin_%' or k in ('verification_request','verified_support','recharge_request','teacher_request','store_order_admin') then
    new.user_id:=null; new.audience:='admin'; new.is_broadcast:=true;
  end if;
  if exists(
    select 1 from public.notifications n
    where coalesce(n.user_id::text,'broadcast')=coalesce(new.user_id::text,'broadcast')
      and coalesce(n.actor_id::text,'')=coalesce(new.actor_id::text,'')
      and lower(coalesce(n.kind,''))=k
      and coalesce(n.metadata->>'target_id',n.metadata->>'post_id',n.metadata->>'story_id',n.link,'')=target
      and n.created_at > now()-interval '5 seconds'
  ) then return null; end if;
  return new;
end $$;
drop trigger if exists trg_student_guard_notification_v16 on public.notifications;
create trigger trg_student_guard_notification_v16 before insert on public.notifications for each row execute function public.student_guard_notification_v16();

-- ------------------------------------------------------------
-- Community: replies and soft delete
-- ------------------------------------------------------------
alter table if exists public.posts add column if not exists deleted_at timestamptz;
alter table if exists public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table if exists public.comments add column if not exists deleted_at timestamptz;
create index if not exists comments_parent_id_idx on public.comments(parent_id);
create index if not exists posts_deleted_at_idx on public.posts(deleted_at);

-- ------------------------------------------------------------
-- Notification preferences + daily learning reminder
-- ------------------------------------------------------------
create table if not exists public.student_notification_preferences(
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_learning_reminder boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.student_notification_preferences enable row level security;
drop policy if exists student_notification_preferences_own on public.student_notification_preferences;
create policy student_notification_preferences_own on public.student_notification_preferences
for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update on public.student_notification_preferences to authenticated;

-- ------------------------------------------------------------
-- User reports (admin-only review)
-- ------------------------------------------------------------
create table if not exists public.student_user_reports(
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check(status in ('open','reviewed','closed')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);
alter table public.student_user_reports enable row level security;
drop policy if exists student_user_reports_read on public.student_user_reports;
create policy student_user_reports_read on public.student_user_reports
for select to authenticated using(reporter_id=auth.uid() or public.current_user_is_admin());
grant select on public.student_user_reports to authenticated;

create or replace function public.student_report_user_v16(p_user uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); rid uuid; actor_name text;
begin
  if uid is null then raise exception 'unauthorized'; end if;
  if p_user is null or p_user=uid then raise exception 'invalid_report_target'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'report_reason_required'; end if;
  insert into public.student_user_reports(reporter_id,reported_user_id,reason)
  values(uid,p_user,left(trim(p_reason),1000)) returning id into rid;
  select coalesce(nullif(full_name,''),nullif(username,''),'مستخدم') into actor_name from public.profiles where id=uid;
  if to_regclass('public.notifications') is not null then
    insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
    values(null,uid,'بلاغ حساب جديد',coalesce(actor_name,'مستخدم')||' أرسل بلاغاً عن حساب.','admin_user_report','admin/reports','admin',true,false,
      jsonb_build_object('target_type','admin_report','target_id',rid,'reported_user_id',p_user));
  end if;
  return rid;
end $$;
grant execute on function public.student_report_user_v16(uuid,text) to authenticated;

-- ------------------------------------------------------------
-- Canonical social notification triggers
-- ------------------------------------------------------------
create or replace function public.student_actor_name_v16(p_user uuid)
returns text language sql stable security definer set search_path=public as $$
  select coalesce(nullif(full_name,''),nullif(username,''),'مستخدم') from public.profiles where id=p_user
$$;

grant execute on function public.student_actor_name_v16(uuid) to authenticated;

create or replace function public.student_notify_follow_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare n text;
begin
  if new.follower_id = new.following_id then return new; end if;
  n:=public.student_actor_name_v16(new.follower_id);
  insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
  values(new.following_id,new.follower_id,'متابعة جديدة',coalesce(n,'مستخدم')||' بدأ بمتابعتك.','follow','profile/'||new.follower_id,'all',false,false,
    jsonb_build_object('target_type','profile','target_id',new.follower_id));
  return new;
end $$;
drop trigger if exists trg_student_follow_notification_v16 on public.follows;
create trigger trg_student_follow_notification_v16 after insert on public.follows for each row execute function public.student_notify_follow_v16();

create or replace function public.student_notify_story_reaction_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; n text;
begin
  select user_id into owner_id from public.stories where id=new.story_id;
  if owner_id is null or owner_id=new.user_id then return new; end if;
  n:=public.student_actor_name_v16(new.user_id);
  insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
  values(owner_id,new.user_id,'تفاعل مع قصتك',coalesce(n,'مستخدم')||' تفاعل مع الستوري.','story_reaction','story/'||new.story_id,'all',false,false,
    jsonb_build_object('target_type','story','target_id',new.story_id,'story_id',new.story_id));
  return new;
end $$;
drop trigger if exists trg_student_story_reaction_notification_v16 on public.story_reactions;
create trigger trg_student_story_reaction_notification_v16 after insert on public.story_reactions for each row execute function public.student_notify_story_reaction_v16();

create or replace function public.student_notify_story_reply_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; n text;
begin
  select user_id into owner_id from public.stories where id=new.story_id;
  if owner_id is null or owner_id=new.user_id then return new; end if;
  n:=public.student_actor_name_v16(new.user_id);
  insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
  values(owner_id,new.user_id,'رد على قصتك',coalesce(n,'مستخدم')||' رد على الستوري.','story_reply','story/'||new.story_id,'all',false,false,
    jsonb_build_object('target_type','story','target_id',new.story_id,'story_id',new.story_id));
  return new;
end $$;
drop trigger if exists trg_student_story_reply_notification_v16 on public.story_replies;
create trigger trg_student_story_reply_notification_v16 after insert on public.story_replies for each row execute function public.student_notify_story_reply_v16();

create or replace function public.student_notify_post_like_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; n text;
begin
  select user_id into owner_id from public.posts where id=new.post_id;
  if owner_id is null or owner_id=new.user_id then return new; end if;
  n:=public.student_actor_name_v16(new.user_id);
  insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
  values(owner_id,new.user_id,'تفاعل مع منشورك',coalesce(n,'مستخدم')||' تفاعل مع منشورك.','post_like','post/'||new.post_id,'all',false,false,
    jsonb_build_object('target_type','post','target_id',new.post_id,'post_id',new.post_id));
  return new;
end $$;
drop trigger if exists trg_student_post_like_notification_v16 on public.post_likes;
create trigger trg_student_post_like_notification_v16 after insert on public.post_likes for each row execute function public.student_notify_post_like_v16();

create or replace function public.student_notify_comment_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_user uuid; n text; k text;
begin
  if new.parent_id is not null then
    select user_id into target_user from public.comments where id=new.parent_id;
    k:='comment_reply';
  else
    select user_id into target_user from public.posts where id=new.post_id;
    k:='comment';
  end if;
  if target_user is null or target_user=new.user_id then return new; end if;
  n:=public.student_actor_name_v16(new.user_id);
  insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
  values(target_user,new.user_id,case when k='comment_reply' then 'رد على تعليقك' else 'تعليق جديد' end,
    coalesce(n,'مستخدم')||case when k='comment_reply' then ' رد على تعليقك.' else ' علّق على منشورك.' end,
    k,'post/'||new.post_id,'all',false,false,
    jsonb_build_object('target_type','post','target_id',new.post_id,'post_id',new.post_id,'comment_id',new.id));
  return new;
end $$;
drop trigger if exists trg_student_comment_notification_v16 on public.comments;
create trigger trg_student_comment_notification_v16 after insert on public.comments for each row execute function public.student_notify_comment_v16();

-- ------------------------------------------------------------
-- Feature controls
-- ------------------------------------------------------------
insert into public.student_feature_controls(feature_key,enabled) values
 ('community',true),('activity_center',true),('daily_learning_reminder',true)
on conflict(feature_key) do update set enabled=excluded.enabled;

-- ------------------------------------------------------------
-- Daily reminder: one global notification every day at 15:00 UTC.
-- Existing notifications webhook -> send-push handles delivery.
-- If pg_cron is unavailable, deployment continues; schedule can be added later.
-- ------------------------------------------------------------
do $$
begin
  begin
    execute 'create extension if not exists pg_cron with schema extensions';
  exception when others then null;
  end;
  if exists(select 1 from pg_extension where extname='pg_cron') then
    begin
      perform cron.unschedule('student-daily-learning-reminder');
    exception when others then null;
    end;
    perform cron.schedule(
      'student-daily-learning-reminder',
      '0 15 * * *',
      $cron$
      delete from public.notifications where kind='daily_learning' and created_at < now()-interval '30 days';
      insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
      select p.id,null,'واصل مشوارك مع Student',
        'درس قصير اليوم يصنع فرقاً كبيراً. أكمل من حيث توقفت وراجع كلماتك الصعبة.',
        'daily_learning','english/daily','all',false,false,jsonb_build_object('target_type','english_daily')
      from public.profiles p
      left join public.student_notification_preferences pref on pref.user_id=p.id
      where coalesce(pref.daily_learning_reminder,true)=true;
      $cron$
    );
  end if;
end $$;
