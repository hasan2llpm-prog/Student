begin;

-- =========================================================
-- Student v2.8.0 - Document Studio + Remote Actions + Rooms + username3
-- =========================================================

-- ---------- 1) Remote Actions / Dynamic Forms ----------
create table if not exists public.student_remote_actions (
  action_key text primary key check (action_key ~ '^[a-z0-9_:-]{2,80}$'),
  title text not null,
  description text,
  rpc_name text not null check (rpc_name ~ '^[a-zA-Z0-9_]{2,120}$'),
  confirm_required boolean not null default true,
  confirm_text text,
  success_message text,
  enabled boolean not null default true,
  allowed_roles text[] not null default array['student','teacher','admin']::text[],
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.student_remote_action_fields (
  id uuid primary key default gen_random_uuid(),
  action_key text not null references public.student_remote_actions(action_key) on delete cascade,
  field_key text not null check (field_key ~ '^[a-zA-Z][a-zA-Z0-9_]{1,80}$'),
  label text not null,
  field_type text not null default 'text' check (field_type in ('text','textarea','multiline','number','integer','boolean','toggle','select')),
  required boolean not null default false,
  placeholder text,
  default_value text,
  options jsonb not null default '[]'::jsonb,
  max_length integer not null default 500 check (max_length between 1 and 10000),
  enabled boolean not null default true,
  sort_order integer not null default 100,
  unique(action_key, field_key)
);

alter table public.student_remote_actions enable row level security;
alter table public.student_remote_action_fields enable row level security;

drop policy if exists student_remote_actions_read on public.student_remote_actions;
create policy student_remote_actions_read on public.student_remote_actions
for select to authenticated
using (
  enabled = true
  and coalesce((select role from public.profiles where id=auth.uid()), 'student') = any(allowed_roles)
);

drop policy if exists student_remote_action_fields_read on public.student_remote_action_fields;
create policy student_remote_action_fields_read on public.student_remote_action_fields
for select to authenticated
using (
  enabled = true
  and exists (
    select 1 from public.student_remote_actions a
    where a.action_key=student_remote_action_fields.action_key
      and a.enabled=true
      and coalesce((select role from public.profiles where id=auth.uid()), 'student') = any(a.allowed_roles)
  )
);

drop policy if exists student_remote_actions_admin_all on public.student_remote_actions;
create policy student_remote_actions_admin_all on public.student_remote_actions
for all to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists student_remote_action_fields_admin_all on public.student_remote_action_fields;
create policy student_remote_action_fields_admin_all on public.student_remote_action_fields
for all to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

grant select on public.student_remote_actions, public.student_remote_action_fields to authenticated;


-- ---------- 2) Specific ownership for three-character usernames ----------
alter table public.student_short_username_entitlements
  add column if not exists reserved_username text;

update public.student_short_username_entitlements e
set reserved_username = lower(trim(both '@' from p.username))
from public.profiles p
where p.id=e.user_id
  and e.reserved_username is null
  and length(lower(trim(both '@' from coalesce(p.username,''))))=3;

create unique index if not exists student_short_username_reserved_unique
on public.student_short_username_entitlements(lower(reserved_username))
where reserved_username is not null;

create or replace function public.student_guard_profile_username_v181()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  uname text := lower(trim(both '@' from coalesce(new.username,'')));
  allowed boolean := false;
begin
  if uname='' then return new; end if;
  if uname !~ '^[a-z0-9_]{3,30}$' then raise exception 'username_invalid'; end if;

  if length(uname)=3 and (tg_op='INSERT' or old.username is distinct from new.username) then
    select
      public.current_user_is_admin()
      or exists(
        select 1
        from public.student_short_username_entitlements e
        where e.user_id=new.id
          and lower(coalesce(e.reserved_username,''))=uname
      )
    into allowed;
    if not allowed then raise exception 'username3_purchase_required'; end if;
  end if;

  new.username:=uname;
  return new;
end;
$$;

drop trigger if exists trg_student_guard_profile_username_v181 on public.profiles;
create trigger trg_student_guard_profile_username_v181
before insert or update of username on public.profiles
for each row execute function public.student_guard_profile_username_v181();

create or replace function public.student_purchase_username3(p_username text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  uname text;
  product_id uuid;
  price bigint;
  new_balance bigint;
begin
  if uid is null then raise exception 'auth_required'; end if;
  uname := lower(trim(both '@' from coalesce(p_username,'')));
  if uname !~ '^[a-z0-9_]{3}$' then raise exception 'username_invalid'; end if;

  -- Serialize purchases for the same requested username.
  perform pg_advisory_xact_lock(hashtext('student_username3:' || uname));

  if exists(select 1 from public.profiles where lower(username)=uname and id<>uid) then
    raise exception 'username_already_taken';
  end if;
  if exists(select 1 from public.student_short_username_entitlements where lower(coalesce(reserved_username,''))=uname and user_id<>uid) then
    raise exception 'username_already_reserved';
  end if;

  select id, price_diamonds::bigint
    into product_id, price
  from public.store_products
  where lower(product_type)='username3'
    and is_active=true
    and allow_diamonds=true
  order by created_at desc
  limit 1;

  if product_id is null then raise exception 'username3_product_not_available'; end if;
  if coalesce(price,0)<=0 then raise exception 'username3_price_not_configured'; end if;

  new_balance := public.store_wallet_debit(
    uid,
    price,
    'username3_purchase',
    'شراء اسم مستخدم ثلاثي @' || uname,
    'store_product',
    product_id,
    'username3:' || uid::text || ':' || uname
  );

  insert into public.student_short_username_entitlements(user_id, source_order_id, granted_at, reserved_username)
  values(uid, null, now(), uname)
  on conflict(user_id) do update
  set source_order_id=null,
      granted_at=now(),
      reserved_username=excluded.reserved_username;

  update public.profiles set username=uname where id=uid;

  return jsonb_build_object(
    'ok',true,
    'username',uname,
    'price',price,
    'new_balance',new_balance
  );
end;
$$;

revoke all on function public.student_purchase_username3(text) from public, anon;
grant execute on function public.student_purchase_username3(text) to authenticated;

-- ---------- 3) Voice-room member management ----------
create or replace function public.student_voice_room_manage_member_v28(
  p_room_id uuid,
  p_user_id uuid,
  p_action text,
  p_reason text default ''
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  target_role text;
  act text := lower(trim(coalesce(p_action,'')));
begin
  if actor is null then raise exception 'auth_required'; end if;
  if actor=p_user_id then raise exception 'cannot_manage_self'; end if;
  if not public.student_voice_room_can_manage_v24(p_room_id,actor) then raise exception 'manager_required'; end if;

  select room_role into actor_role from public.student_voice_room_members where room_id=p_room_id and user_id=actor;
  select room_role into target_role from public.student_voice_room_members where room_id=p_room_id and user_id=p_user_id;
  if target_role is null then raise exception 'member_not_found'; end if;
  if target_role='owner' then raise exception 'cannot_manage_owner'; end if;
  if actor_role='moderator' and target_role='moderator' then raise exception 'owner_required'; end if;

  if act='remove_mic' then
    update public.student_voice_room_members
    set mic_state='listener', mic_slot=null
    where room_id=p_room_id and user_id=p_user_id;
  elsif act='kick' then
    delete from public.student_voice_room_members
    where room_id=p_room_id and user_id=p_user_id;
  elsif act='ban' then
    if actor_role<>'owner' then raise exception 'owner_required'; end if;
    insert into public.student_voice_room_bans(room_id,user_id,banned_by,reason)
    values(p_room_id,p_user_id,actor,left(coalesce(p_reason,''),240))
    on conflict(room_id,user_id) do update
      set banned_by=excluded.banned_by, reason=excluded.reason, created_at=now();
    delete from public.student_voice_room_members
    where room_id=p_room_id and user_id=p_user_id;
  else
    raise exception 'invalid_room_action';
  end if;
end;
$$;

revoke all on function public.student_voice_room_manage_member_v28(uuid,uuid,text,text) from public, anon;
grant execute on function public.student_voice_room_manage_member_v28(uuid,uuid,text,text) to authenticated;

-- ---------- 4) Examples for Remote Actions ----------
-- Generic actions can be created/edited later directly from Supabase.
-- This example is disabled because username3 has a dedicated Store UI.
insert into public.student_remote_actions(
  action_key,title,description,rpc_name,confirm_required,confirm_text,success_message,enabled,allowed_roles,sort_order
) values (
  'username3_purchase','شراء اسم مستخدم ثلاثي','مثال لمحرك Dynamic Forms','student_purchase_username3',true,
  'سيتم فحص الاسم وخصم السعر وتطبيقه مباشرة.','تم شراء اسم المستخدم وتطبيقه.',false,
  array['student','teacher','admin']::text[],100
)
on conflict(action_key) do nothing;

insert into public.student_remote_action_fields(action_key,field_key,label,field_type,required,placeholder,max_length,sort_order,enabled)
values('username3_purchase','p_username','اسم المستخدم الثلاثي','text',true,'abc',3,10,true)
on conflict(action_key,field_key) do nothing;

commit;
