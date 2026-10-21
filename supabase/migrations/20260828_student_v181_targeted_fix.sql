-- Student v1.8.1 targeted production fix
-- Scope only: message reactions, store payment confirmation, 3-char username entitlement.

-- ------------------------------------------------------------------
-- 1) Direct/room message reactions: use server RPC so the action is real
-- ------------------------------------------------------------------
create table if not exists public.student_message_reactions(
  message_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '❤️',
  created_at timestamptz not null default now(),
  primary key(message_id,user_id)
);

-- Some older builds attached message_id to the legacy public.messages table,
-- while Native chat is served through chat_messages/RPCs. Remove only that
-- message FK so valid Native message UUIDs can be reacted to.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    where t.relname='student_message_reactions'
      and c.contype='f'
      and pg_get_constraintdef(c.oid) ilike '%message_id%'
  loop
    execute format('alter table public.student_message_reactions drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.student_message_reactions enable row level security;
drop policy if exists smr_read_v181 on public.student_message_reactions;
create policy smr_read_v181 on public.student_message_reactions for select to authenticated using(true);
drop policy if exists smr_own_v181 on public.student_message_reactions;
create policy smr_own_v181 on public.student_message_reactions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,delete,update on public.student_message_reactions to authenticated;

create or replace function public.student_set_message_reaction_v181(p_message uuid,p_emoji text)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); exists_message boolean:=false;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if to_regclass('public.chat_messages') is not null then
    execute 'select exists(select 1 from public.chat_messages where id=$1)' into exists_message using p_message;
  end if;
  if not exists_message and to_regclass('public.messages') is not null then
    execute 'select exists(select 1 from public.messages where id=$1)' into exists_message using p_message;
  end if;
  if not exists_message then raise exception 'message_not_found'; end if;
  delete from public.student_message_reactions where message_id=p_message and user_id=uid;
  if nullif(trim(coalesce(p_emoji,'')),'') is not null then
    insert into public.student_message_reactions(message_id,user_id,emoji)
    values(p_message,uid,left(trim(p_emoji),16))
    on conflict(message_id,user_id) do update set emoji=excluded.emoji,created_at=now();
  end if;
end $$;
grant execute on function public.student_set_message_reaction_v181(uuid,text) to authenticated;

create table if not exists public.student_room_message_reactions(
  message_id uuid not null references public.student_social_room_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '❤️',
  created_at timestamptz not null default now(),
  primary key(message_id,user_id)
);
alter table public.student_room_message_reactions enable row level security;
drop policy if exists srmr_read_v181 on public.student_room_message_reactions;
create policy srmr_read_v181 on public.student_room_message_reactions for select to authenticated using(true);
drop policy if exists srmr_own_v181 on public.student_room_message_reactions;
create policy srmr_own_v181 on public.student_room_message_reactions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,delete,update on public.student_room_message_reactions to authenticated;

create or replace function public.student_set_room_message_reaction_v181(p_message uuid,p_emoji text)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if not exists(select 1 from public.student_social_room_messages where id=p_message) then raise exception 'message_not_found'; end if;
  delete from public.student_room_message_reactions where message_id=p_message and user_id=uid;
  if nullif(trim(coalesce(p_emoji,'')),'') is not null then
    insert into public.student_room_message_reactions(message_id,user_id,emoji)
    values(p_message,uid,left(trim(p_emoji),16))
    on conflict(message_id,user_id) do update set emoji=excluded.emoji,created_at=now();
  end if;
end $$;
grant execute on function public.student_set_room_message_reaction_v181(uuid,text) to authenticated;

-- ------------------------------------------------------------------
-- 2) Money purchases: in-app confirmation + admin notification
-- ------------------------------------------------------------------
create table if not exists public.student_store_payment_confirmations(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  card_last4 text not null,
  confirmed_at timestamptz not null default now(),
  unique(order_id,user_id)
);
alter table public.student_store_payment_confirmations enable row level security;
drop policy if exists sspc_own_read_v181 on public.student_store_payment_confirmations;
create policy sspc_own_read_v181 on public.student_store_payment_confirmations for select to authenticated using(user_id=auth.uid() or public.current_user_is_admin());
grant select on public.student_store_payment_confirmations to authenticated;

create or replace function public.student_confirm_store_money_payment_v181(p_order uuid,p_sender_name text,p_card_last4 text)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); product_title text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if trim(coalesce(p_sender_name,''))='' then raise exception 'sender_name_required'; end if;
  if coalesce(p_card_last4,'') !~ '^[0-9]{4}$' then raise exception 'invalid_card_last4'; end if;

  select product_name into product_title
  from public.store_orders
  where id=p_order and user_id=uid and lower(coalesce(payment_method,''))='money'
  limit 1;
  if product_title is null then raise exception 'order_not_found'; end if;

  insert into public.student_store_payment_confirmations(order_id,user_id,sender_name,card_last4)
  values(p_order,uid,left(trim(p_sender_name),80),p_card_last4)
  on conflict(order_id,user_id) do update set sender_name=excluded.sender_name,card_last4=excluded.card_last4,confirmed_at=now();

  insert into public.notifications(user_id,actor_id,title,body,kind,link,audience,is_broadcast,is_read,metadata)
  values(
    null,uid,'تأكيد تحويل جديد',
    'تم تأكيد تحويل طلب: '||coalesce(product_title,'طلب متجر'),
    'store_order_admin','store/order/'||p_order::text,'admin',true,false,
    jsonb_build_object('target_type','store_order','target_id',p_order::text,'order_id',p_order::text,'sender_name',left(trim(p_sender_name),80),'card_last4',p_card_last4)
  );
end $$;
grant execute on function public.student_confirm_store_money_payment_v181(uuid,text,text) to authenticated;

-- ------------------------------------------------------------------
-- 3) Three-character usernames are paid entitlements; normal users need 4+
-- ------------------------------------------------------------------
create table if not exists public.student_short_username_entitlements(
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  source_order_id uuid
);
alter table public.student_short_username_entitlements enable row level security;
drop policy if exists ssue_own_read_v181 on public.student_short_username_entitlements;
create policy ssue_own_read_v181 on public.student_short_username_entitlements for select to authenticated using(user_id=auth.uid() or public.current_user_is_admin());
grant select on public.student_short_username_entitlements to authenticated;

create or replace function public.student_can_use_short_username_v181()
returns boolean language sql security definer set search_path=public stable as $$
  select public.current_user_is_admin() or exists(select 1 from public.student_short_username_entitlements where user_id=auth.uid());
$$;
grant execute on function public.student_can_use_short_username_v181() to authenticated;

create or replace function public.student_guard_profile_username_v181()
returns trigger language plpgsql security definer set search_path=public as $$
declare uname text:=lower(trim(both '@' from coalesce(new.username,''))); allowed boolean:=false;
begin
  if uname='' then return new; end if;
  if uname !~ '^[a-z0-9_]{3,30}$' then raise exception 'username_invalid'; end if;
  if length(uname)=3 and (tg_op='INSERT' or old.username is distinct from new.username) then
    select public.current_user_is_admin() or exists(select 1 from public.student_short_username_entitlements where user_id=new.id) into allowed;
    if not allowed then raise exception 'username_minimum_4'; end if;
  end if;
  new.username:=uname;
  return new;
end $$;
drop trigger if exists trg_student_guard_profile_username_v181 on public.profiles;
create trigger trg_student_guard_profile_username_v181 before insert or update of username on public.profiles
for each row execute function public.student_guard_profile_username_v181();

-- Keep the premium product available to Admin Store management without exposing
-- an arbitrary price to users. Admin sets its price and activates it.
insert into public.store_products(name,description,product_type,price_money,price_diamonds,allow_money,allow_diamonds,is_active)
select 'اسم مستخدم ثلاثي','اسم مستخدم مميز من ثلاثة أحرف','username3',0,0,true,true,false
where not exists(select 1 from public.store_products where lower(product_type)='username3');

create or replace function public.student_activate_diamond_entitlement_v181(p_order uuid,p_product uuid)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); ptype text; pname text; order_name text; pay text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select lower(product_type),name into ptype,pname from public.store_products where id=p_product and is_active=true limit 1;
  if ptype is null then raise exception 'product_not_found'; end if;
  select product_name,lower(coalesce(payment_method,'')) into order_name,pay from public.store_orders where id=p_order and user_id=uid limit 1;
  if order_name is null or pay<>'diamonds' or lower(order_name)<>lower(pname) then raise exception 'order_mismatch'; end if;
  if ptype='verification' then
    update public.profiles set is_verified=true,verification_color=case when role='teacher' then 'red' when role='admin' then 'orange' else 'blue' end where id=uid;
  elsif ptype='username3' then
    insert into public.student_short_username_entitlements(user_id,source_order_id) values(uid,p_order)
    on conflict(user_id) do update set source_order_id=excluded.source_order_id,granted_at=now();
  end if;
end $$;
grant execute on function public.student_activate_diamond_entitlement_v181(uuid,uuid) to authenticated;

create or replace function public.student_finalize_store_special_product_v181()
returns trigger language plpgsql security definer set search_path=public as $$
declare ptype text;
begin
  if lower(coalesce(new.status,'')) not in ('confirmed','completed','approved') then return new; end if;
  select lower(product_type) into ptype from public.store_products where lower(name)=lower(new.product_name) limit 1;
  if ptype='verification' then
    update public.profiles set is_verified=true,verification_color=case when role='teacher' then 'red' when role='admin' then 'orange' else 'blue' end where id=new.user_id;
  elsif ptype='username3' then
    insert into public.student_short_username_entitlements(user_id,source_order_id) values(new.user_id,new.id)
    on conflict(user_id) do update set source_order_id=excluded.source_order_id,granted_at=now();
  end if;
  return new;
end $$;
drop trigger if exists trg_student_finalize_store_special_product_v181 on public.store_orders;
create trigger trg_student_finalize_store_special_product_v181 after insert or update on public.store_orders
for each row execute function public.student_finalize_store_special_product_v181();
