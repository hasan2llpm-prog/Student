-- Student v2.4.0: personal learning progress + global voice rooms
begin;

-- ============================================================
-- PERSONAL LEARNING PROGRESS
-- ============================================================
create table if not exists public.student_learning_progress_v24(
  user_id uuid not null references auth.users(id) on delete cascade,
  section_key text not null check(section_key in ('vocabulary','grammar','reading','listening','writing','speaking')),
  sequence_index integer not null default 0 check(sequence_index>=0),
  completed_at timestamptz,
  available_after timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,section_key)
);
alter table public.student_learning_progress_v24 enable row level security;
drop policy if exists student_learning_progress_own_v24 on public.student_learning_progress_v24;
create policy student_learning_progress_own_v24 on public.student_learning_progress_v24
for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.student_learning_progress_v24 from anon,authenticated;
grant select on public.student_learning_progress_v24 to authenticated;

create or replace function public.student_next_8am_baghdad_v24()
returns timestamptz language sql stable as $$
  select case
    when (now() at time zone 'Asia/Baghdad')::time < time '08:00'
      then (((now() at time zone 'Asia/Baghdad')::date + time '08:00') at time zone 'Asia/Baghdad')
    else ((((now() at time zone 'Asia/Baghdad')::date + 1) + time '08:00') at time zone 'Asia/Baghdad')
  end
$$;

create or replace function public.student_learning_progress_get_v24(p_section_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.student_learning_progress_v24%rowtype;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  if p_section_key not in ('vocabulary','grammar','reading','listening','writing','speaking') then raise exception 'invalid_section'; end if;
  insert into public.student_learning_progress_v24(user_id,section_key) values(auth.uid(),p_section_key)
  on conflict(user_id,section_key) do nothing;
  select * into r from public.student_learning_progress_v24 where user_id=auth.uid() and section_key=p_section_key for update;
  if r.completed_at is not null and r.available_after is not null and now()>=r.available_after then
    update public.student_learning_progress_v24 set sequence_index=sequence_index+1,completed_at=null,available_after=null,updated_at=now()
    where user_id=auth.uid() and section_key=p_section_key returning * into r;
  end if;
  return jsonb_build_object('section_key',r.section_key,'sequence_index',r.sequence_index,'completed_for_current_slot',r.completed_at is not null,'available_after',r.available_after);
end $$;

create or replace function public.student_learning_progress_complete_v24(p_section_key text,p_expected_sequence integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.student_learning_progress_v24%rowtype; next_at timestamptz;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  perform public.student_learning_progress_get_v24(p_section_key);
  select * into r from public.student_learning_progress_v24 where user_id=auth.uid() and section_key=p_section_key for update;
  if r.sequence_index<>p_expected_sequence then raise exception 'progress_out_of_date'; end if;
  if r.completed_at is null then
    next_at:=public.student_next_8am_baghdad_v24();
    update public.student_learning_progress_v24 set completed_at=now(),available_after=next_at,updated_at=now()
    where user_id=auth.uid() and section_key=p_section_key returning * into r;
  end if;
  return jsonb_build_object('section_key',r.section_key,'sequence_index',r.sequence_index,'completed_for_current_slot',true,'available_after',r.available_after);
end $$;
revoke all on function public.student_learning_progress_get_v24(text) from public,anon;
revoke all on function public.student_learning_progress_complete_v24(text,integer) from public,anon;
grant execute on function public.student_learning_progress_get_v24(text) to authenticated;
grant execute on function public.student_learning_progress_complete_v24(text,integer) to authenticated;

-- ============================================================
-- GLOBAL VOICE ROOMS
-- ============================================================
create table if not exists public.student_voice_room_settings(
  id smallint primary key default 1 check(id=1),
  creation_price_diamonds integer not null default 100 check(creation_price_diamonds>=0),
  base_capacity integer not null default 50 check(base_capacity=50),
  max_speakers integer not null default 10 check(max_speakers between 1 and 30),
  rooms_enabled boolean not null default true,
  gifts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.student_voice_room_settings(id) values(1) on conflict(id) do nothing;

create table if not exists public.student_voice_rooms(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(title) between 3 and 60),
  description text not null default '' check(length(description)<=240),
  livekit_room_name text not null unique,
  capacity integer not null default 50 check(capacity>=50),
  is_locked boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists student_voice_rooms_active_idx on public.student_voice_rooms(is_active,created_at desc);

create table if not exists public.student_voice_room_members(
  room_id uuid not null references public.student_voice_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  room_role text not null default 'listener' check(room_role in ('owner','moderator','listener')),
  mic_state text not null default 'listener' check(mic_state in ('listener','requested','speaker')),
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
create index if not exists student_voice_members_user_idx on public.student_voice_room_members(user_id);

create table if not exists public.student_voice_room_bans(
  room_id uuid not null references public.student_voice_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  banned_by uuid not null references auth.users(id),
  reason text not null default '',
  created_at timestamptz not null default now(),
  primary key(room_id,user_id)
);

create table if not exists public.student_voice_room_capacity_tiers(
  capacity integer primary key check(capacity>50),
  diamonds integer not null check(diamonds>=0),
  is_active boolean not null default true
);
insert into public.student_voice_room_capacity_tiers(capacity,diamonds) values (100,150),(200,300),(500,700)
on conflict(capacity) do nothing;

create table if not exists public.student_voice_room_gift_packs(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  diamonds integer not null check(diamonds>0),
  icon_key text not null default 'gift',
  sort_order integer not null default 0,
  is_active boolean not null default true
);
insert into public.student_voice_room_gift_packs(name,diamonds,icon_key,sort_order)
select * from (values ('وردة',5,'rose',1),('قلب',15,'heart',2),('نجمة',30,'star',3),('تاج',80,'crown',4),('هدية ملكية',200,'royal',5)) v(name,diamonds,icon_key,sort_order)
where not exists(select 1 from public.student_voice_room_gift_packs);

create table if not exists public.student_voice_room_transactions(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.student_voice_rooms(id) on delete set null,
  kind text not null check(kind in ('create_room','capacity_upgrade','gift')),
  diamonds integer not null check(diamonds>=0),
  target_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists student_voice_room_transactions_user_idx on public.student_voice_room_transactions(user_id,created_at desc);

alter table public.student_voice_rooms enable row level security;
alter table public.student_voice_room_members enable row level security;
alter table public.student_voice_room_bans enable row level security;
alter table public.student_voice_room_settings enable row level security;
alter table public.student_voice_room_capacity_tiers enable row level security;
alter table public.student_voice_room_gift_packs enable row level security;
alter table public.student_voice_room_transactions enable row level security;

-- Public discovery for authenticated users; all writes are RPC only.
drop policy if exists voice_rooms_read_v24 on public.student_voice_rooms;
create policy voice_rooms_read_v24 on public.student_voice_rooms for select to authenticated using(true);
drop policy if exists voice_room_members_read_v24 on public.student_voice_room_members;
create policy voice_room_members_read_v24 on public.student_voice_room_members for select to authenticated using(true);
drop policy if exists voice_room_settings_read_v24 on public.student_voice_room_settings;
create policy voice_room_settings_read_v24 on public.student_voice_room_settings for select to authenticated using(true);
drop policy if exists voice_room_tiers_read_v24 on public.student_voice_room_capacity_tiers;
create policy voice_room_tiers_read_v24 on public.student_voice_room_capacity_tiers for select to authenticated using(true);
drop policy if exists voice_room_gifts_read_v24 on public.student_voice_room_gift_packs;
create policy voice_room_gifts_read_v24 on public.student_voice_room_gift_packs for select to authenticated using(true);
drop policy if exists voice_room_tx_own_v24 on public.student_voice_room_transactions;
create policy voice_room_tx_own_v24 on public.student_voice_room_transactions for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.student_voice_rooms,public.student_voice_room_members,public.student_voice_room_bans,public.student_voice_room_settings,public.student_voice_room_capacity_tiers,public.student_voice_room_gift_packs,public.student_voice_room_transactions from anon,authenticated;
grant select on public.student_voice_rooms,public.student_voice_room_members,public.student_voice_room_settings,public.student_voice_room_capacity_tiers,public.student_voice_room_gift_packs,public.student_voice_room_transactions to authenticated;

create or replace function public.student_voice_is_teacher_or_admin_v24(uid uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles p where p.id=uid and lower(coalesce(p.role,'')) in ('teacher','admin'))
$$;

create or replace function public.student_voice_room_can_manage_v24(p_room_id uuid,p_uid uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.student_voice_room_members m where m.room_id=p_room_id and m.user_id=p_uid and m.room_role in ('owner','moderator'))
$$;

create or replace function public.student_voice_rooms_list_v24(p_query text default '',p_limit integer default 80)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
   select r.id,r.title,r.description,r.owner_id,coalesce(p.full_name,'مستخدم') owner_name,p.avatar_url owner_avatar_url,
          (select count(*)::int from public.student_voice_room_members m where m.room_id=r.id) member_count,
          r.capacity,r.is_locked,r.is_active,r.created_at
   from public.student_voice_rooms r left join public.profiles p on p.id=r.owner_id
   where r.is_active=true and (coalesce(trim(p_query),'')='' or r.title ilike '%'||trim(p_query)||'%' or r.description ilike '%'||trim(p_query)||'%')
   order by member_count desc,r.created_at desc limit greatest(1,least(coalesce(p_limit,80),100))
 ) x
$$;

create or replace function public.student_voice_room_create_v24(p_title text,p_description text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); price integer; bal integer; rid uuid; free_create boolean; enabled boolean;
begin
 if uid is null then raise exception 'auth_required'; end if;
 select creation_price_diamonds,rooms_enabled into price,enabled from public.student_voice_room_settings where id=1;
 if not enabled then raise exception 'rooms_disabled'; end if;
 free_create:=public.student_voice_is_teacher_or_admin_v24(uid);
 insert into public.store_user_diamonds(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
 select balance into bal from public.store_user_diamonds where user_id=uid for update;
 if not free_create and bal<price then raise exception 'insufficient_diamonds'; end if;
 if not free_create and price>0 then update public.store_user_diamonds set balance=balance-price where user_id=uid; end if;
 insert into public.student_voice_rooms(owner_id,title,description,livekit_room_name,capacity)
 values(uid,trim(p_title),coalesce(trim(p_description),''),'student-room-'||replace(gen_random_uuid()::text,'-',''),50) returning id into rid;
 insert into public.student_voice_room_members(room_id,user_id,room_role,mic_state) values(rid,uid,'owner','speaker');
 insert into public.student_voice_room_transactions(user_id,room_id,kind,diamonds) values(uid,rid,'create_room',case when free_create then 0 else price end);
 return rid;
end $$;

create or replace function public.student_voice_room_join_v24(p_room_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); cap integer; cnt integer; locked boolean;
begin
 if uid is null then raise exception 'auth_required'; end if;
 if exists(select 1 from public.student_voice_room_bans where room_id=p_room_id and user_id=uid) then raise exception 'room_banned'; end if;
 select capacity,is_locked into cap,locked from public.student_voice_rooms where id=p_room_id and is_active=true for update;
 if cap is null then raise exception 'room_not_found'; end if;
 if locked and not public.student_voice_room_can_manage_v24(p_room_id,uid) then raise exception 'room_locked'; end if;
 select count(*) into cnt from public.student_voice_room_members where room_id=p_room_id;
 if cnt>=cap and not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=uid) then raise exception 'room_full'; end if;
 insert into public.student_voice_room_members(room_id,user_id) values(p_room_id,uid) on conflict(room_id,user_id) do update set joined_at=now();
end $$;

create or replace function public.student_voice_room_leave_v24(p_room_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then return; end if;
 if exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=auth.uid() and room_role='owner') then return; end if;
 delete from public.student_voice_room_members where room_id=p_room_id and user_id=auth.uid();
end $$;

create or replace function public.student_voice_room_members_v24(p_room_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
   select m.user_id,coalesce(p.full_name,'مستخدم') full_name,coalesce(p.username,'') username,p.avatar_url,coalesce(p.role,'student') role,m.room_role,m.mic_state,m.joined_at
   from public.student_voice_room_members m left join public.profiles p on p.id=m.user_id where m.room_id=p_room_id
   order by case m.room_role when 'owner' then 0 when 'moderator' then 1 else 2 end, case m.mic_state when 'speaker' then 0 else 1 end,m.joined_at
 ) x
$$;

create or replace function public.student_voice_room_request_mic_v24(p_room_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.student_voice_room_members set mic_state='requested' where room_id=p_room_id and user_id=auth.uid() and mic_state='listener';
 if not found then raise exception 'not_room_member'; end if;
end $$;

create or replace function public.student_voice_room_set_mic_v24(p_room_id uuid,p_user_id uuid,p_allow boolean)
returns void language plpgsql security definer set search_path=public as $$
declare max_sp integer; speakers integer;
begin
 if not public.student_voice_room_can_manage_v24(p_room_id,auth.uid()) then raise exception 'manager_required'; end if;
 select max_speakers into max_sp from public.student_voice_room_settings where id=1;
 select count(*) into speakers from public.student_voice_room_members where room_id=p_room_id and mic_state='speaker';
 if p_allow and speakers>=max_sp then raise exception 'speaker_limit'; end if;
 update public.student_voice_room_members set mic_state=case when p_allow then 'speaker' else 'listener' end where room_id=p_room_id and user_id=p_user_id;
end $$;

create or replace function public.student_voice_room_upgrade_v24(p_room_id uuid,p_target_capacity integer)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); current_cap integer; price integer; bal integer;
begin
 select capacity into current_cap from public.student_voice_rooms where id=p_room_id and owner_id=uid for update;
 if current_cap is null then raise exception 'owner_required'; end if;
 if p_target_capacity<=current_cap then raise exception 'invalid_capacity'; end if;
 select diamonds into price from public.student_voice_room_capacity_tiers where capacity=p_target_capacity and is_active=true;
 if price is null then raise exception 'tier_not_available'; end if;
 insert into public.store_user_diamonds(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
 select balance into bal from public.store_user_diamonds where user_id=uid for update;
 if bal<price then raise exception 'insufficient_diamonds'; end if;
 update public.store_user_diamonds set balance=balance-price where user_id=uid;
 update public.student_voice_rooms set capacity=p_target_capacity,updated_at=now() where id=p_room_id;
 insert into public.student_voice_room_transactions(user_id,room_id,kind,diamonds,metadata) values(uid,p_room_id,'capacity_upgrade',price,jsonb_build_object('from',current_cap,'to',p_target_capacity));
end $$;

create or replace function public.student_voice_room_send_gift_v24(p_room_id uuid,p_pack_id uuid,p_recipient_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); price integer; bal integer; enabled boolean;
begin
 if not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=uid) then raise exception 'not_room_member'; end if;
 select gifts_enabled into enabled from public.student_voice_room_settings where id=1; if not enabled then raise exception 'gifts_disabled'; end if;
 select diamonds into price from public.student_voice_room_gift_packs where id=p_pack_id and is_active=true; if price is null then raise exception 'gift_not_found'; end if;
 if p_recipient_id is not null and not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=p_recipient_id) then raise exception 'recipient_not_in_room'; end if;
 insert into public.store_user_diamonds(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
 select balance into bal from public.store_user_diamonds where user_id=uid for update; if bal<price then raise exception 'insufficient_diamonds'; end if;
 update public.store_user_diamonds set balance=balance-price where user_id=uid;
 insert into public.student_voice_room_transactions(user_id,room_id,kind,diamonds,target_user_id,metadata) values(uid,p_room_id,'gift',price,p_recipient_id,jsonb_build_object('pack_id',p_pack_id,'scope',case when p_recipient_id is null then 'all' else 'user' end));
end $$;

create or replace function public.student_voice_room_admin_settings_v24(p_creation_price integer,p_max_speakers integer,p_rooms_enabled boolean,p_gifts_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.current_user_is_admin() then raise exception 'admin_required'; end if;
 update public.student_voice_room_settings set creation_price_diamonds=greatest(p_creation_price,0),max_speakers=greatest(1,least(p_max_speakers,30)),rooms_enabled=p_rooms_enabled,gifts_enabled=p_gifts_enabled,updated_at=now() where id=1;
 perform public.student_admin_audit_v21('voice_rooms_settings','voice_rooms','1',jsonb_build_object('creation_price',p_creation_price,'max_speakers',p_max_speakers,'rooms_enabled',p_rooms_enabled,'gifts_enabled',p_gifts_enabled));
end $$;

create or replace function public.student_voice_room_admin_tier_v24(p_capacity integer,p_diamonds integer,p_active boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.current_user_is_admin() then raise exception 'admin_required'; end if;
 if p_capacity<=50 then raise exception 'capacity_must_exceed_50'; end if;
 insert into public.student_voice_room_capacity_tiers(capacity,diamonds,is_active) values(p_capacity,greatest(p_diamonds,0),p_active)
 on conflict(capacity) do update set diamonds=excluded.diamonds,is_active=excluded.is_active;
end $$;

-- LiveKit token helper view data: function can inspect this through authenticated Supabase call.
create or replace function public.student_voice_room_token_context_v24(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r record; m record;
begin
 if uid is null then raise exception 'auth_required'; end if;
 select id,livekit_room_name,is_active into r from public.student_voice_rooms where id=p_room_id;
 if r.id is null or not r.is_active then raise exception 'room_not_found'; end if;
 select room_role,mic_state into m from public.student_voice_room_members where room_id=p_room_id and user_id=uid;
 if m.room_role is null then raise exception 'not_room_member'; end if;
 return jsonb_build_object('room_name',r.livekit_room_name,'room_role',m.room_role,'mic_state',m.mic_state,'can_publish',m.mic_state='speaker' or m.room_role in ('owner','moderator'));
end $$;

-- Grants
revoke all on function public.student_voice_rooms_list_v24(text,integer),public.student_voice_room_create_v24(text,text),public.student_voice_room_join_v24(uuid),public.student_voice_room_leave_v24(uuid),public.student_voice_room_members_v24(uuid),public.student_voice_room_request_mic_v24(uuid),public.student_voice_room_set_mic_v24(uuid,uuid,boolean),public.student_voice_room_upgrade_v24(uuid,integer),public.student_voice_room_send_gift_v24(uuid,uuid,uuid),public.student_voice_room_token_context_v24(uuid) from public,anon;
grant execute on function public.student_voice_rooms_list_v24(text,integer),public.student_voice_room_create_v24(text,text),public.student_voice_room_join_v24(uuid),public.student_voice_room_leave_v24(uuid),public.student_voice_room_members_v24(uuid),public.student_voice_room_request_mic_v24(uuid),public.student_voice_room_set_mic_v24(uuid,uuid,boolean),public.student_voice_room_upgrade_v24(uuid,integer),public.student_voice_room_send_gift_v24(uuid,uuid,uuid),public.student_voice_room_token_context_v24(uuid) to authenticated;
revoke all on function public.student_voice_room_admin_settings_v24(integer,integer,boolean,boolean),public.student_voice_room_admin_tier_v24(integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.student_voice_room_admin_settings_v24(integer,integer,boolean,boolean),public.student_voice_room_admin_tier_v24(integer,integer,boolean) to authenticated;

insert into public.student_feature_controls(feature_key,enabled) values('rooms',true) on conflict(feature_key) do update set enabled=excluded.enabled;
commit;
