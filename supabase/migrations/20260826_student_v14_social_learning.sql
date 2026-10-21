-- Student v1.4 Beta — profile, verification, social rooms, story history and remote controls
create extension if not exists pgcrypto;

-- 1) Rich profile fields
alter table public.profiles add column if not exists governorate text;
alter table public.profiles add column if not exists school_name text;
alter table public.profiles add column if not exists university_name text;
alter table public.profiles add column if not exists profile_completed_at timestamptz;

-- 2) Verification requests
create table if not exists public.student_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  governorate text,
  school_name text,
  university_name text,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists student_verification_one_pending
  on public.student_verification_requests(user_id) where status='pending';
alter table public.student_verification_requests enable row level security;
drop policy if exists student_verification_read_own on public.student_verification_requests;
create policy student_verification_read_own on public.student_verification_requests
for select to authenticated using (user_id=auth.uid() or public.current_user_is_admin());
drop policy if exists student_verification_insert_own on public.student_verification_requests;
create policy student_verification_insert_own on public.student_verification_requests
for insert to authenticated with check (user_id=auth.uid());

grant select,insert on public.student_verification_requests to authenticated;

create or replace function public.student_submit_verification_request(
  p_full_name text, p_governorate text default null, p_school text default null,
  p_university text default null, p_reason text default ''
) returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); rid uuid;
begin
  if uid is null then raise exception 'unauthorized'; end if;
  if exists(select 1 from public.student_verification_requests where user_id=uid and status='pending') then
    raise exception 'verification_request_pending';
  end if;
  insert into public.student_verification_requests(user_id,full_name,governorate,school_name,university_name,reason)
  values(uid,left(trim(p_full_name),120),nullif(trim(coalesce(p_governorate,'')),''),nullif(trim(coalesce(p_school,'')),''),nullif(trim(coalesce(p_university,'')),''),left(coalesce(p_reason,''),2000))
  returning id into rid;
  if to_regclass('public.notifications') is not null then
    insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
    values(null,uid,'طلب توثيق جديد','تم استلام طلب توثيق جديد من '||left(trim(p_full_name),80),'verification_request','admin/verification','admin',true,false,jsonb_build_object('request_id',rid,'user_id',uid));
  end if;
  return rid;
end; $$;
grant execute on function public.student_submit_verification_request(text,text,text,text,text) to authenticated;

create or replace function public.student_review_verification_request(p_id uuid,p_approve boolean,p_note text default '')
returns void language plpgsql security definer set search_path=public as $$
declare r public.student_verification_requests%rowtype;
begin
  perform public.student_assert_admin();
  select * into r from public.student_verification_requests where id=p_id for update;
  if r.id is null then raise exception 'request_not_found'; end if;
  update public.student_verification_requests set status=case when p_approve then 'approved' else 'rejected' end,
    admin_note=left(coalesce(p_note,''),1500), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() where id=p_id;
  if p_approve then
    update public.profiles set is_verified=true,
      verification_color=case when role='teacher' then 'red' when role='admin' then 'orange' else 'blue' end
      where id=r.user_id;
  end if;
  if to_regclass('public.notifications') is not null then
    insert into public.notifications(user_id,actor_id,title,body,kind,link,is_broadcast,is_read,metadata)
    values(r.user_id,auth.uid(),case when p_approve then 'تم توثيق حسابك' else 'تمت مراجعة طلب التوثيق' end,
      case when p_approve then 'مبروك، تم قبول طلب توثيق حسابك في Student.' else 'لم تتم الموافقة على طلب التوثيق حاليًا.' end,
      'verification_result','profile',false,false,jsonb_build_object('approved',p_approve,'note',coalesce(p_note,'')));
  end if;
end; $$;
grant execute on function public.student_review_verification_request(uuid,boolean,text) to authenticated;

-- Verified in-app support
create table if not exists public.student_support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check(status in ('open','answered','closed')),
  admin_reply text,
  answered_by uuid references auth.users(id),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.student_support_tickets enable row level security;
drop policy if exists student_support_read_own on public.student_support_tickets;
create policy student_support_read_own on public.student_support_tickets for select to authenticated using(user_id=auth.uid() or public.current_user_is_admin());
grant select on public.student_support_tickets to authenticated;
create or replace function public.student_submit_support_ticket(p_subject text,p_message text)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); rid uuid; verified boolean; admin_ok boolean;
begin
 select coalesce(is_verified,false),role='admin' into verified,admin_ok from public.profiles where id=uid;
 if not coalesce(verified,false) and not coalesce(admin_ok,false) then raise exception 'verified_support_only'; end if;
 insert into public.student_support_tickets(user_id,subject,message) values(uid,left(trim(p_subject),160),left(trim(p_message),5000)) returning id into rid;
 if to_regclass('public.notifications') is not null then
   insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
   values(null,uid,'طلب دعم من حساب موثق',left(trim(p_subject),160),'verified_support','admin/support','admin',true,false,jsonb_build_object('ticket_id',rid));
 end if;
 return rid;
end; $$;
grant execute on function public.student_submit_support_ticket(text,text) to authenticated;
create or replace function public.student_admin_answer_support_ticket(p_id uuid,p_reply text,p_close boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
 perform public.student_assert_admin();
 update public.student_support_tickets set status=case when p_close then 'closed' else 'answered' end,admin_reply=left(coalesce(p_reply,''),5000),answered_by=auth.uid(),answered_at=now(),updated_at=now() where id=p_id returning user_id into uid;
 if uid is not null and to_regclass('public.notifications') is not null then
   insert into public.notifications(user_id,actor_id,title,body,kind,link,is_broadcast,is_read,metadata)
   values(uid,auth.uid(),'رد الدعم','لديك رد جديد من دعم Student.','support_reply','support',false,false,jsonb_build_object('ticket_id',p_id));
 end if;
end; $$;
grant execute on function public.student_admin_answer_support_ticket(uuid,text,boolean) to authenticated;

-- 3) Feature switches managed by admin without APK
create table if not exists public.student_feature_controls (
  feature_key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.student_feature_controls(feature_key,enabled) values
 ('translation',true),('vocabulary',true),('parts',true),('verbs',true),('grammar',true),('reading',true),
 ('listening',true),('pronunciation',true),('daily',true),('reports',true),('messages',true),('stories',true),('store',true)
on conflict(feature_key) do nothing;
alter table public.student_feature_controls enable row level security;
drop policy if exists student_feature_read on public.student_feature_controls;
create policy student_feature_read on public.student_feature_controls for select to authenticated using(true);
grant select on public.student_feature_controls to authenticated;
create or replace function public.student_admin_set_feature(p_key text,p_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.student_assert_admin();
 insert into public.student_feature_controls(feature_key,enabled,updated_at,updated_by)
 values(lower(trim(p_key)),coalesce(p_enabled,true),now(),auth.uid())
 on conflict(feature_key) do update set enabled=excluded.enabled,updated_at=now(),updated_by=auth.uid();
end; $$;
grant execute on function public.student_admin_set_feature(text,boolean) to authenticated;

-- 4) Social groups/channels paid with diamonds, creation reserved for verified accounts/admin
create table if not exists public.student_social_room_settings (
 id integer primary key default 1 check(id=1),
 group_price_diamonds integer not null default 50 check(group_price_diamonds>=0),
 channel_price_diamonds integer not null default 100 check(channel_price_diamonds>=0),
 max_members integer not null default 500 check(max_members between 2 and 10000),
 updated_at timestamptz not null default now()
);
insert into public.student_social_room_settings(id) values(1) on conflict(id) do nothing;

create table if not exists public.student_social_rooms (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('group','channel')),
 name text not null,
 description text not null default '',
 avatar_url text,
 is_public boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.student_social_room_members (
 room_id uuid not null references public.student_social_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 member_role text not null default 'member' check(member_role in ('owner','admin','member')),
 joined_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
create table if not exists public.student_social_room_messages (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.student_social_rooms(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 body text not null default '',
 message_type text not null default 'text',
 media_url text,
 file_name text,
 reply_to uuid references public.student_social_room_messages(id) on delete set null,
 created_at timestamptz not null default now(),
 edited_at timestamptz,
 deleted_at timestamptz
);
create index if not exists social_room_messages_room_created on public.student_social_room_messages(room_id,created_at desc);

create or replace function public.student_is_social_room_member(p_room uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.student_social_room_members where room_id=p_room and user_id=auth.uid());
$$;
grant execute on function public.student_is_social_room_member(uuid) to authenticated;

alter table public.student_social_rooms enable row level security;
alter table public.student_social_room_members enable row level security;
alter table public.student_social_room_messages enable row level security;
drop policy if exists room_read_member on public.student_social_rooms;
create policy room_read_member on public.student_social_rooms for select to authenticated using(
 is_public or owner_id=auth.uid() or public.student_is_social_room_member(id)
);
drop policy if exists room_members_read on public.student_social_room_members;
create policy room_members_read on public.student_social_room_members for select to authenticated using(
 user_id=auth.uid() or public.student_is_social_room_member(room_id)
);
drop policy if exists room_messages_read on public.student_social_room_messages;
create policy room_messages_read on public.student_social_room_messages for select to authenticated using(
 public.student_is_social_room_member(room_id)
);
grant select on public.student_social_rooms,public.student_social_room_members,public.student_social_room_messages,public.student_social_room_settings to authenticated;

create table if not exists public.store_user_diamonds(user_id uuid primary key references auth.users(id) on delete cascade,balance integer not null default 0 check(balance>=0));

create or replace function public.student_create_social_room(p_kind text,p_name text,p_description text default '',p_public boolean default true)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); verified boolean; admin_ok boolean; price integer; bal integer; rid uuid;
begin
 if uid is null then raise exception 'unauthorized'; end if;
 if lower(p_kind) not in ('group','channel') then raise exception 'room_kind_invalid'; end if;
 select coalesce(is_verified,false), role='admin' into verified,admin_ok from public.profiles where id=uid;
 if not coalesce(verified,false) and not coalesce(admin_ok,false) then raise exception 'verification_required_to_create_room'; end if;
 select case when lower(p_kind)='channel' then channel_price_diamonds else group_price_diamonds end into price from public.student_social_room_settings where id=1;
 price:=coalesce(price,0);
 insert into public.store_user_diamonds(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
 select balance into bal from public.store_user_diamonds where user_id=uid for update;
 if not coalesce(admin_ok,false) and bal<price then raise exception 'insufficient_diamonds'; end if;
 if not coalesce(admin_ok,false) and price>0 then update public.store_user_diamonds set balance=balance-price where user_id=uid; end if;
 insert into public.student_social_rooms(owner_id,kind,name,description,is_public)
 values(uid,lower(p_kind),left(trim(p_name),100),left(coalesce(p_description,''),1000),coalesce(p_public,true)) returning id into rid;
 insert into public.student_social_room_members(room_id,user_id,member_role) values(rid,uid,'owner');
 return rid;
end; $$;
grant execute on function public.student_create_social_room(text,text,text,boolean) to authenticated;

create or replace function public.student_add_social_room_member(p_room uuid,p_username text)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); target uuid;
begin
 if not exists(select 1 from public.student_social_room_members where room_id=p_room and user_id=uid and member_role in ('owner','admin')) then raise exception 'room_admin_required'; end if;
 select id into target from public.profiles where lower(username)=lower(trim(both '@' from trim(p_username))) limit 1;
 if target is null then raise exception 'user_not_found'; end if;
 insert into public.student_social_room_members(room_id,user_id,member_role) values(p_room,target,'member') on conflict do nothing;
end; $$;
grant execute on function public.student_add_social_room_member(uuid,text) to authenticated;

create or replace function public.student_send_social_room_message(p_room uuid,p_body text,p_type text default 'text',p_media_url text default null,p_file_name text default null,p_reply_to uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); rid uuid; room_kind text; mrole text;
begin
 select r.kind,m.member_role into room_kind,mrole from public.student_social_rooms r join public.student_social_room_members m on m.room_id=r.id and m.user_id=uid where r.id=p_room;
 if room_kind is null then raise exception 'not_room_member'; end if;
 if room_kind='channel' and mrole not in ('owner','admin') then raise exception 'channel_post_admin_only'; end if;
 insert into public.student_social_room_messages(room_id,sender_id,body,message_type,media_url,file_name,reply_to)
 values(p_room,uid,left(coalesce(p_body,''),8000),coalesce(nullif(p_type,''),'text'),p_media_url,p_file_name,p_reply_to) returning id into rid;
 return rid;
end; $$;
grant execute on function public.student_send_social_room_message(uuid,text,text,text,text,uuid) to authenticated;

create or replace function public.student_admin_set_social_room_prices(p_group integer,p_channel integer,p_max_members integer default 500)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.student_assert_admin();
 insert into public.student_social_room_settings(id,group_price_diamonds,channel_price_diamonds,max_members,updated_at)
 values(1,greatest(coalesce(p_group,0),0),greatest(coalesce(p_channel,0),0),greatest(coalesce(p_max_members,500),2),now())
 on conflict(id) do update set group_price_diamonds=excluded.group_price_diamonds,channel_price_diamonds=excluded.channel_price_diamonds,max_members=excluded.max_members,updated_at=now();
end; $$;
grant execute on function public.student_admin_set_social_room_prices(integer,integer,integer) to authenticated;

-- 5) Keep story viewer history for at least 5 days; verified owners can keep viewing it later.
create table if not exists public.student_story_view_history (
 story_id uuid not null,
 story_owner_id uuid not null references auth.users(id) on delete cascade,
 viewer_id uuid not null references auth.users(id) on delete cascade,
 story_created_at timestamptz not null default now(),
 viewed_at timestamptz not null default now(),
 primary key(story_id,viewer_id)
);
alter table public.student_story_view_history enable row level security;
drop policy if exists story_history_owner_read on public.student_story_view_history;
create policy story_history_owner_read on public.student_story_view_history for select to authenticated using(story_owner_id=auth.uid());
grant select on public.student_story_view_history to authenticated;

create or replace function public.student_archive_story_view() returns trigger language plpgsql security definer set search_path=public as $$
declare j jsonb:=to_jsonb(new); sid uuid; vid uuid; owner uuid; created timestamptz;
begin
 begin sid:=(j->>'story_id')::uuid; vid:=(j->>'user_id')::uuid; exception when others then return new; end;
 select user_id,created_at into owner,created from public.stories where id=sid;
 if owner is not null and vid is not null then
   insert into public.student_story_view_history(story_id,story_owner_id,viewer_id,story_created_at,viewed_at)
   values(sid,owner,vid,coalesce(created,now()),coalesce((j->>'viewed_at')::timestamptz,now()))
   on conflict(story_id,viewer_id) do update set viewed_at=excluded.viewed_at;
 end if;
 return new;
end; $$;
do $$ begin
 if to_regclass('public.story_views') is not null then
   execute 'drop trigger if exists student_archive_story_view_trg on public.story_views';
   execute 'create trigger student_archive_story_view_trg after insert or update on public.story_views for each row execute function public.student_archive_story_view()';
 end if;
end $$;

create or replace function public.student_story_viewers_history(p_story uuid)
returns table(id uuid,full_name text,username text,role text,avatar_url text,is_verified boolean,verification_color text,profile_frame_url text,viewed_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); owner uuid; created timestamptz; owner_verified boolean;
begin
 select h.story_owner_id,min(h.story_created_at) into owner,created from public.student_story_view_history h where h.story_id=p_story group by h.story_owner_id;
 if owner is null then select s.user_id,s.created_at into owner,created from public.stories s where s.id=p_story; end if;
 if owner<>uid then raise exception 'story_owner_required'; end if;
 select coalesce(p.is_verified,false) into owner_verified from public.profiles p where p.id=uid;
 if not coalesce(owner_verified,false) and coalesce(created,now()) < now()-interval '5 days' then return; end if;
 return query select p.id,p.full_name,p.username,p.role,p.avatar_url,coalesce(p.is_verified,false),p.verification_color,p.profile_frame_url,h.viewed_at
 from public.student_story_view_history h join public.profiles p on p.id=h.viewer_id where h.story_id=p_story order by h.viewed_at desc;
end; $$;
grant execute on function public.student_story_viewers_history(uuid) to authenticated;

-- 6) Suggestion engine based directly on rich profile information.
create or replace function public.student_get_profile_suggestions_v14(p_limit integer default 30)
returns table(id uuid,full_name text,username text,role text,avatar_url text,is_verified boolean,verification_color text,profile_frame_url text,is_following boolean,common_reasons jsonb)
language sql stable security definer set search_path=public as $$
with me as (select * from public.profiles where id=auth.uid()), candidates as (
 select p.*,
   (case when nullif(p.governorate,'') is not null and p.governorate=(select governorate from me) then 4 else 0 end +
    case when nullif(p.school_name,'') is not null and p.school_name=(select school_name from me) then 3 else 0 end +
    case when nullif(p.university_name,'') is not null and p.university_name=(select university_name from me) then 3 else 0 end +
    case when p.role=(select role from me) then 1 else 0 end) score
 from public.profiles p where p.id<>auth.uid()
)
select c.id,c.full_name,c.username,c.role,c.avatar_url,coalesce(c.is_verified,false),c.verification_color,c.profile_frame_url,
 exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=c.id) as is_following,
 to_jsonb(array_remove(ARRAY[
   case when c.governorate=(select governorate from me) and nullif(c.governorate,'') is not null then 'نفس المحافظة' end,
   case when c.school_name=(select school_name from me) and nullif(c.school_name,'') is not null then 'نفس المدرسة' end,
   case when c.university_name=(select university_name from me) and nullif(c.university_name,'') is not null then 'نفس الجامعة' end,
   case when c.role=(select role from me) then case when c.role='teacher' then 'مدرس' else 'طالب' end end
 ]::text[], null)) as common_reasons
from candidates c order by c.score desc,c.created_at desc limit greatest(1,least(coalesce(p_limit,30),100));
$$;
grant execute on function public.student_get_profile_suggestions_v14(integer) to authenticated;
