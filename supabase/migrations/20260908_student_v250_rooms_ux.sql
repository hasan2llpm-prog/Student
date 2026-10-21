-- Student v2.5.0 — Rooms UX/security expansion
begin;

alter table if exists public.student_voice_room_settings
  add column if not exists extra_mic_price_diamonds integer not null default 50 check(extra_mic_price_diamonds>=0);

alter table if exists public.student_voice_rooms
  add column if not exists unlocked_mics integer not null default 5 check(unlocked_mics between 5 and 10);

alter table if exists public.student_voice_room_members
  add column if not exists mic_slot integer check(mic_slot between 1 and 10);
create unique index if not exists student_voice_room_mic_slot_uidx
  on public.student_voice_room_members(room_id,mic_slot) where mic_slot is not null and mic_state in ('requested','speaker');

update public.student_voice_room_members set mic_slot=1 where room_role='owner' and mic_state='speaker' and mic_slot is null;

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
 insert into public.student_voice_rooms(owner_id,title,description,livekit_room_name,capacity,unlocked_mics)
 values(uid,trim(p_title),coalesce(trim(p_description),''),'student-room-'||replace(gen_random_uuid()::text,'-',''),50,5) returning id into rid;
 insert into public.student_voice_room_members(room_id,user_id,room_role,mic_state,mic_slot) values(rid,uid,'owner','speaker',1);
 insert into public.student_voice_room_transactions(user_id,room_id,kind,diamonds) values(uid,rid,'create_room',case when free_create then 0 else price end);
 return rid;
end $$;

alter table if exists public.student_voice_room_transactions
  drop constraint if exists student_voice_room_transactions_kind_check;
alter table if exists public.student_voice_room_transactions
  add constraint student_voice_room_transactions_kind_check
  check(kind in ('create_room','capacity_upgrade','gift','mic_unlock','room_background'));

create table if not exists public.student_voice_room_saved(
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.student_voice_rooms(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key(user_id,room_id)
);
alter table public.student_voice_room_saved enable row level security;
drop policy if exists voice_room_saved_own_v25 on public.student_voice_room_saved;
create policy voice_room_saved_own_v25 on public.student_voice_room_saved for select to authenticated using(user_id=auth.uid());
revoke insert,update,delete on public.student_voice_room_saved from anon,authenticated;
grant select on public.student_voice_room_saved to authenticated;

create table if not exists public.student_voice_room_feed(
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.student_voice_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('message','gift','system')),
  target_user_id uuid references auth.users(id) on delete set null,
  message text not null default '' check(length(message)<=500),
  gift_emoji text,
  created_at timestamptz not null default now()
);
create index if not exists student_voice_room_feed_room_idx on public.student_voice_room_feed(room_id,created_at desc);
alter table public.student_voice_room_feed enable row level security;
drop policy if exists voice_room_feed_read_v25 on public.student_voice_room_feed;
create policy voice_room_feed_read_v25 on public.student_voice_room_feed for select to authenticated using(true);
revoke insert,update,delete on public.student_voice_room_feed from anon,authenticated;
grant select on public.student_voice_room_feed to authenticated;

create table if not exists public.student_voice_room_backgrounds(
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 1 and 80),
  image_url text not null,
  diamonds integer not null default 0 check(diamonds>=0),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.student_voice_room_backgrounds enable row level security;
drop policy if exists voice_room_backgrounds_read_v25 on public.student_voice_room_backgrounds;
create policy voice_room_backgrounds_read_v25 on public.student_voice_room_backgrounds for select to authenticated using(is_active or public.current_user_is_admin());
grant select on public.student_voice_room_backgrounds to authenticated;
revoke insert,update,delete on public.student_voice_room_backgrounds from anon,authenticated;

create table if not exists public.student_voice_room_background_ownership(
  user_id uuid not null references auth.users(id) on delete cascade,
  background_id uuid not null references public.student_voice_room_backgrounds(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key(user_id,background_id)
);
alter table public.student_voice_room_background_ownership enable row level security;
drop policy if exists voice_room_background_ownership_own_v25 on public.student_voice_room_background_ownership;
create policy voice_room_background_ownership_own_v25 on public.student_voice_room_background_ownership for select to authenticated using(user_id=auth.uid());
grant select on public.student_voice_room_background_ownership to authenticated;
revoke insert,update,delete on public.student_voice_room_background_ownership from anon,authenticated;

alter table if exists public.student_voice_rooms add column if not exists background_id uuid references public.student_voice_room_backgrounds(id) on delete set null;

-- Default room gift emoji mapping.
update public.student_voice_room_gift_packs set icon_key='🌹' where lower(icon_key)='rose';
update public.student_voice_room_gift_packs set icon_key='❤️' where lower(icon_key)='heart';
update public.student_voice_room_gift_packs set icon_key='⭐' where lower(icon_key)='star';
update public.student_voice_room_gift_packs set icon_key='👑' where lower(icon_key)='crown';
update public.student_voice_room_gift_packs set icon_key='🎁' where lower(icon_key) in ('royal','gift');

create or replace function public.student_voice_rooms_list_v25(p_query text default '',p_limit integer default 80)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
   select r.id,r.title,r.description,r.owner_id,coalesce(p.full_name,'مستخدم') owner_name,p.avatar_url owner_avatar_url,
          (select count(*)::int from public.student_voice_room_members m where m.room_id=r.id) member_count,
          r.capacity,r.is_locked,r.is_active,r.created_at,r.unlocked_mics,b.image_url background_url,
          exists(select 1 from public.student_voice_room_saved s where s.room_id=r.id and s.user_id=auth.uid()) is_saved
   from public.student_voice_rooms r
   left join public.profiles p on p.id=r.owner_id
   left join public.student_voice_room_backgrounds b on b.id=r.background_id
   where r.is_active=true and (coalesce(p_query,'')='' or r.title ilike '%'||p_query||'%' or r.description ilike '%'||p_query||'%')
   order by r.created_at desc limit greatest(1,least(coalesce(p_limit,80),200))
 ) x
$$;

create or replace function public.student_voice_room_members_v25(p_room_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
   select m.user_id,coalesce(p.full_name,'مستخدم') full_name,coalesce(p.username,'') username,p.avatar_url,coalesce(p.role,'student') role,
          m.room_role,m.mic_state,m.joined_at,m.mic_slot,
          exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=m.user_id) is_following
   from public.student_voice_room_members m left join public.profiles p on p.id=m.user_id where m.room_id=p_room_id
   order by coalesce(m.mic_slot,99),case m.room_role when 'owner' then 0 when 'moderator' then 1 else 2 end,m.joined_at
 ) x
$$;

create or replace function public.student_voice_room_request_mic_v25(p_room_id uuid,p_slot integer)
returns void language plpgsql security definer set search_path=public as $$
declare unlocked integer;
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 select unlocked_mics into unlocked from public.student_voice_rooms where id=p_room_id and is_active=true;
 if unlocked is null then raise exception 'room_not_found'; end if;
 if p_slot<1 or p_slot>unlocked then raise exception 'mic_locked'; end if;
 if exists(select 1 from public.student_voice_room_members where room_id=p_room_id and mic_slot=p_slot and mic_state in ('requested','speaker') and user_id<>auth.uid()) then raise exception 'mic_occupied'; end if;
 update public.student_voice_room_members set mic_state='requested',mic_slot=p_slot where room_id=p_room_id and user_id=auth.uid();
 if not found then raise exception 'not_room_member'; end if;
end $$;

create or replace function public.student_voice_room_set_mic_v25(p_room_id uuid,p_user_id uuid,p_allow boolean)
returns void language plpgsql security definer set search_path=public as $$
declare max_sp integer; speakers integer; target_slot integer;
begin
 if not public.student_voice_room_can_manage_v24(p_room_id,auth.uid()) then raise exception 'manager_required'; end if;
 select max_speakers into max_sp from public.student_voice_room_settings where id=1;
 select count(*) into speakers from public.student_voice_room_members where room_id=p_room_id and mic_state='speaker';
 select mic_slot into target_slot from public.student_voice_room_members where room_id=p_room_id and user_id=p_user_id;
 if p_allow and target_slot is null then raise exception 'mic_slot_required'; end if;
 if p_allow and speakers>=max_sp then raise exception 'speaker_limit'; end if;
 update public.student_voice_room_members set mic_state=case when p_allow then 'speaker' else 'listener' end,
   mic_slot=case when p_allow then mic_slot else null end where room_id=p_room_id and user_id=p_user_id;
end $$;

create or replace function public.student_voice_room_unlock_mic_v25(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); unlocked integer; price integer; bal integer;
begin
 select unlocked_mics into unlocked from public.student_voice_rooms where id=p_room_id and owner_id=uid for update;
 if unlocked is null then raise exception 'owner_required'; end if;
 if unlocked>=10 then raise exception 'all_mics_unlocked'; end if;
 select extra_mic_price_diamonds into price from public.student_voice_room_settings where id=1;
 insert into public.store_user_diamonds(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
 select balance into bal from public.store_user_diamonds where user_id=uid for update;
 if bal<price then raise exception 'insufficient_diamonds'; end if;
 update public.store_user_diamonds set balance=balance-price where user_id=uid;
 update public.student_voice_rooms set unlocked_mics=unlocked_mics+1,updated_at=now() where id=p_room_id returning unlocked_mics into unlocked;
 insert into public.student_voice_room_transactions(user_id,room_id,kind,diamonds,metadata) values(uid,p_room_id,'mic_unlock',price,jsonb_build_object('unlocked_mics',unlocked));
 return jsonb_build_object('unlocked_mics',unlocked,'diamonds',price);
end $$;

create or replace function public.student_voice_room_save_v25(p_room_id uuid,p_save boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 if p_save then insert into public.student_voice_room_saved(user_id,room_id) values(auth.uid(),p_room_id) on conflict do nothing;
 else delete from public.student_voice_room_saved where user_id=auth.uid() and room_id=p_room_id; end if;
end $$;

create or replace function public.student_voice_room_message_v25(p_room_id uuid,p_message text)
returns void language plpgsql security definer set search_path=public as $$
declare msg text:=trim(coalesce(p_message,''));
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 if length(msg)<1 or length(msg)>500 then raise exception 'invalid_message'; end if;
 if not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=auth.uid()) then raise exception 'not_room_member'; end if;
 if exists(select 1 from public.student_voice_room_feed where room_id=p_room_id and user_id=auth.uid() and kind='message' and created_at>now()-interval '1 second') then raise exception 'slow_down'; end if;
 insert into public.student_voice_room_feed(room_id,user_id,kind,message) values(p_room_id,auth.uid(),'message',msg);
end $$;

create or replace function public.student_voice_room_feed_v25(p_room_id uuid,p_limit integer default 100)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from (
   select f.id,f.kind,f.user_id,coalesce(p.full_name,'مستخدم') user_name,f.target_user_id,coalesce(tp.full_name,'') target_name,
          f.message,f.gift_emoji,f.created_at
   from public.student_voice_room_feed f
   left join public.profiles p on p.id=f.user_id
   left join public.profiles tp on tp.id=f.target_user_id
   where f.room_id=p_room_id order by f.created_at desc limit greatest(1,least(coalesce(p_limit,100),200))
 ) x
$$;

create or replace function public.student_voice_room_send_gift_v25(p_room_id uuid,p_pack_id uuid,p_recipient_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); price integer; bal integer; enabled boolean; em text; gift_name text;
begin
 if not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=uid) then raise exception 'not_room_member'; end if;
 select gifts_enabled into enabled from public.student_voice_room_settings where id=1; if not enabled then raise exception 'gifts_disabled'; end if;
 select diamonds,icon_key,name into price,em,gift_name from public.student_voice_room_gift_packs where id=p_pack_id and is_active=true; if price is null then raise exception 'gift_not_found'; end if;
 if p_recipient_id is not null and not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=p_recipient_id) then raise exception 'recipient_not_in_room'; end if;
 insert into public.store_user_diamonds(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
 select balance into bal from public.store_user_diamonds where user_id=uid for update; if bal<price then raise exception 'insufficient_diamonds'; end if;
 update public.store_user_diamonds set balance=balance-price where user_id=uid;
 insert into public.student_voice_room_transactions(user_id,room_id,kind,diamonds,target_user_id,metadata) values(uid,p_room_id,'gift',price,p_recipient_id,jsonb_build_object('pack_id',p_pack_id,'scope',case when p_recipient_id is null then 'all' else 'user' end));
 insert into public.student_voice_room_feed(room_id,user_id,kind,target_user_id,message,gift_emoji) values(p_room_id,uid,'gift',p_recipient_id,gift_name,em);
end $$;

create or replace function public.student_voice_room_backgrounds_v25()
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'image_url',b.image_url,'diamonds',b.diamonds,'is_active',b.is_active,
   'is_owned',b.diamonds=0 or exists(select 1 from public.student_voice_room_background_ownership o where o.user_id=auth.uid() and o.background_id=b.id)) order by b.created_at desc),'[]'::jsonb)
 from public.student_voice_room_backgrounds b where b.is_active=true
$$;

create or replace function public.student_voice_room_background_purchase_v25(p_background_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); price integer; bal integer;
begin
 select diamonds into price from public.student_voice_room_backgrounds where id=p_background_id and is_active=true;
 if price is null then raise exception 'background_not_found'; end if;
 if exists(select 1 from public.student_voice_room_background_ownership where user_id=uid and background_id=p_background_id) then return; end if;
 if price>0 then
   insert into public.store_user_diamonds(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
   select balance into bal from public.store_user_diamonds where user_id=uid for update;
   if bal<price then raise exception 'insufficient_diamonds'; end if;
   update public.store_user_diamonds set balance=balance-price where user_id=uid;
 end if;
 insert into public.student_voice_room_background_ownership(user_id,background_id) values(uid,p_background_id) on conflict do nothing;
 insert into public.student_voice_room_transactions(user_id,kind,diamonds,metadata) values(uid,'room_background',price,jsonb_build_object('background_id',p_background_id));
end $$;

create or replace function public.student_voice_room_background_apply_v25(p_room_id uuid,p_background_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); price integer;
begin
 if not exists(select 1 from public.student_voice_rooms where id=p_room_id and owner_id=uid) then raise exception 'owner_required'; end if;
 if p_background_id is not null then
   select diamonds into price from public.student_voice_room_backgrounds where id=p_background_id and is_active=true;
   if price is null then raise exception 'background_not_found'; end if;
   if price>0 and not exists(select 1 from public.student_voice_room_background_ownership where user_id=uid and background_id=p_background_id) then raise exception 'background_not_owned'; end if;
 end if;
 update public.student_voice_rooms set background_id=p_background_id,updated_at=now() where id=p_room_id;
end $$;

create or replace function public.student_voice_room_background_admin_upsert_v25(p_id uuid,p_name text,p_image_url text,p_diamonds integer,p_active boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 if not public.current_user_is_admin() then raise exception 'admin_required'; end if;
 if p_id is null then
   insert into public.student_voice_room_backgrounds(name,image_url,diamonds,is_active,created_by) values(trim(p_name),p_image_url,greatest(p_diamonds,0),p_active,auth.uid()) returning id into rid;
 else
   update public.student_voice_room_backgrounds set name=trim(p_name),image_url=p_image_url,diamonds=greatest(p_diamonds,0),is_active=p_active where id=p_id returning id into rid;
 end if;
 perform public.student_admin_audit_v21('room_background_upsert','room_background',rid::text,jsonb_build_object('diamonds',p_diamonds,'active',p_active));
 return rid;
end $$;

-- Update room settings control to include paid mic price while preserving old RPC.
create or replace function public.student_voice_room_admin_settings_v25(p_creation_price integer,p_extra_mic_price integer,p_rooms_enabled boolean,p_gifts_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.current_user_is_admin() then raise exception 'admin_required'; end if;
 update public.student_voice_room_settings set creation_price_diamonds=greatest(p_creation_price,0),extra_mic_price_diamonds=greatest(p_extra_mic_price,0),max_speakers=10,rooms_enabled=p_rooms_enabled,gifts_enabled=p_gifts_enabled,updated_at=now() where id=1;
 perform public.student_admin_audit_v21('voice_rooms_settings_v25','voice_rooms','1',jsonb_build_object('creation_price',p_creation_price,'extra_mic_price',p_extra_mic_price,'rooms_enabled',p_rooms_enabled,'gifts_enabled',p_gifts_enabled));
end $$;

revoke all on function public.student_voice_rooms_list_v25(text,integer),public.student_voice_room_members_v25(uuid),public.student_voice_room_request_mic_v25(uuid,integer),public.student_voice_room_set_mic_v25(uuid,uuid,boolean),public.student_voice_room_unlock_mic_v25(uuid),public.student_voice_room_save_v25(uuid,boolean),public.student_voice_room_message_v25(uuid,text),public.student_voice_room_feed_v25(uuid,integer),public.student_voice_room_send_gift_v25(uuid,uuid,uuid),public.student_voice_room_backgrounds_v25(),public.student_voice_room_background_purchase_v25(uuid),public.student_voice_room_background_apply_v25(uuid,uuid) from public,anon;
grant execute on function public.student_voice_rooms_list_v25(text,integer),public.student_voice_room_members_v25(uuid),public.student_voice_room_request_mic_v25(uuid,integer),public.student_voice_room_set_mic_v25(uuid,uuid,boolean),public.student_voice_room_unlock_mic_v25(uuid),public.student_voice_room_save_v25(uuid,boolean),public.student_voice_room_message_v25(uuid,text),public.student_voice_room_feed_v25(uuid,integer),public.student_voice_room_send_gift_v25(uuid,uuid,uuid),public.student_voice_room_backgrounds_v25(),public.student_voice_room_background_purchase_v25(uuid),public.student_voice_room_background_apply_v25(uuid,uuid) to authenticated;
revoke all on function public.student_voice_room_background_admin_upsert_v25(uuid,text,text,integer,boolean),public.student_voice_room_admin_settings_v25(integer,integer,boolean,boolean) from public,anon,authenticated;
grant execute on function public.student_voice_room_background_admin_upsert_v25(uuid,text,text,integer,boolean),public.student_voice_room_admin_settings_v25(integer,integer,boolean,boolean) to authenticated;

commit;
