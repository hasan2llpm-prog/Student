-- Student v2.1.0 BETA — full-screen learning, messaging presence, chat delete-for-me,
-- expanded feature controls and admin audit foundation.
-- Safe additive migration. Run after previous Student migrations.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- Presence / last seen
-- ------------------------------------------------------------------
alter table if exists public.profiles add column if not exists last_active_at timestamptz;
create index if not exists idx_profiles_last_active_v210 on public.profiles(last_active_at desc);

create or replace function public.student_message_followers_v21(p_limit integer default 80)
returns table(
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  profile_frame_url text,
  is_verified boolean,
  verification_color text,
  last_active_at timestamptz
)
language sql
security definer
set search_path=public
as $$
  select p.id,
         coalesce(p.full_name,'مستخدم'),
         coalesce(p.username,'student'),
         p.avatar_url,
         p.profile_frame_url,
         coalesce(p.is_verified,false),
         p.verification_color,
         p.last_active_at
  from public.follows f
  join public.profiles p on p.id=f.follower_id
  where f.following_id=auth.uid()
  order by p.last_active_at desc nulls last, f.created_at desc
  limit greatest(1,least(coalesce(p_limit,80),200));
$$;
revoke all on function public.student_message_followers_v21(integer) from public, anon;
grant execute on function public.student_message_followers_v21(integer) to authenticated;

-- ------------------------------------------------------------------
-- Delete chat for me. The other participant keeps their copy.
-- A new incoming message automatically restores the chat to the list.
-- ------------------------------------------------------------------
create table if not exists public.student_hidden_conversations(
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  hidden_at timestamptz not null default now(),
  primary key(user_id,conversation_id)
);
alter table public.student_hidden_conversations enable row level security;
drop policy if exists student_hidden_conversations_own_v21 on public.student_hidden_conversations;
create policy student_hidden_conversations_own_v21
on public.student_hidden_conversations
for all to authenticated
using(user_id=auth.uid())
with check(user_id=auth.uid());
grant select,insert,delete,update on public.student_hidden_conversations to authenticated;

create or replace function public.student_restore_hidden_chat_on_message_v21()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  delete from public.student_hidden_conversations
  where conversation_id=new.conversation_id
    and user_id<>new.sender_id;
  return new;
end $$;

do $$
begin
  if to_regclass('public.messages') is not null then
    execute 'drop trigger if exists trg_student_restore_hidden_chat_v21 on public.messages';
    execute 'create trigger trg_student_restore_hidden_chat_v21 after insert on public.messages for each row execute function public.student_restore_hidden_chat_on_message_v21()';
  end if;
end $$;

-- ------------------------------------------------------------------
-- Feature controls: admin can show/hide major modules without a new APK.
-- ------------------------------------------------------------------
insert into public.student_feature_controls(feature_key,enabled)
values
 ('translation',true),('vocabulary',true),('parts',true),('verbs',true),('grammar',true),
 ('reading',true),('listening',true),('writing',true),('speaking',true),('pronunciation',true),
 ('daily',true),('reports',true),('messages',true),('stories',true),('reels',true),
 ('community',true),('store',true),('education',true),('student_ai',true),('notifications',true)
on conflict(feature_key) do nothing;

-- ------------------------------------------------------------------
-- Generic admin audit log for dangerous/admin operations.
-- ------------------------------------------------------------------
create table if not exists public.student_admin_audit_log_v21(
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.student_admin_audit_log_v21 enable row level security;
drop policy if exists student_admin_audit_read_v21 on public.student_admin_audit_log_v21;
create policy student_admin_audit_read_v21 on public.student_admin_audit_log_v21
for select to authenticated using(public.current_user_is_admin());
grant select on public.student_admin_audit_log_v21 to authenticated;

create or replace function public.student_admin_audit_v21(p_action text,p_target_type text default '',p_target_id text default '',p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.current_user_is_admin() then raise exception 'admin_required'; end if;
  insert into public.student_admin_audit_log_v21(admin_id,action,target_type,target_id,details)
  values(auth.uid(),left(coalesce(p_action,''),160),left(coalesce(p_target_type,''),100),left(coalesce(p_target_id,''),200),coalesce(p_details,'{}'::jsonb));
end $$;
revoke all on function public.student_admin_audit_v21(text,text,text,jsonb) from public,anon;
grant execute on function public.student_admin_audit_v21(text,text,text,jsonb) to authenticated;
