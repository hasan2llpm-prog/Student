-- Student v2.6.0: Rooms chat/reactions, custom backgrounds, secure 3-way gift split.
begin;

alter table if exists public.student_voice_rooms
  add column if not exists custom_background_url text;

alter table if exists public.student_voice_room_feed
  add column if not exists reply_to_id uuid references public.student_voice_room_feed(id) on delete set null;

create table if not exists public.student_voice_room_reactions(
  feed_id uuid not null references public.student_voice_room_feed(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check(reaction in ('❤️','👍','😂','🔥','👏')),
  created_at timestamptz not null default now(),
  primary key(feed_id,user_id)
);
alter table public.student_voice_room_reactions enable row level security;
revoke all on public.student_voice_room_reactions from anon,authenticated;

create table if not exists public.student_app_diamond_treasury(
  id smallint primary key default 1 check(id=1),
  balance bigint not null default 0 check(balance>=0),
  updated_at timestamptz not null default now()
);
insert into public.student_app_diamond_treasury(id,balance) values(1,0) on conflict(id) do nothing;
alter table public.student_app_diamond_treasury enable row level security;
revoke all on public.student_app_diamond_treasury from anon,authenticated;

create table if not exists public.student_voice_room_gift_distributions(
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  room_id uuid not null references public.student_voice_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  beneficiary_type text not null check(beneficiary_type in ('recipient','room_owner','app')),
  beneficiary_user_id uuid references auth.users(id) on delete set null,
  diamonds integer not null check(diamonds>=0),
  created_at timestamptz not null default now()
);
create index if not exists student_voice_gift_dist_room_idx on public.student_voice_room_gift_distributions(room_id,created_at desc);
alter table public.student_voice_room_gift_distributions enable row level security;
revoke all on public.student_voice_room_gift_distributions from anon,authenticated;

create or replace function public.student_voice_rooms_list_v26(p_query text default '',p_limit integer default 80)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
   select r.id,r.title,r.description,r.owner_id,coalesce(p.full_name,'مستخدم') owner_name,p.avatar_url owner_avatar_url,
          (select count(*)::int from public.student_voice_room_members m where m.room_id=r.id) member_count,
          r.capacity,r.is_locked,r.is_active,r.created_at,r.unlocked_mics,
          coalesce(nullif(r.custom_background_url,''),b.image_url) background_url,
          exists(select 1 from public.student_voice_room_saved s where s.room_id=r.id and s.user_id=auth.uid()) is_saved
   from public.student_voice_rooms r
   left join public.profiles p on p.id=r.owner_id
   left join public.student_voice_room_backgrounds b on b.id=r.background_id
   where r.is_active=true and (coalesce(p_query,'')='' or r.title ilike '%'||p_query||'%' or r.description ilike '%'||p_query||'%')
   order by r.created_at desc limit greatest(1,least(coalesce(p_limit,80),200))
 ) x
$$;

create or replace function public.student_voice_room_message_v26(p_room_id uuid,p_message text,p_reply_to_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare msg text:=trim(coalesce(p_message,''));
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 if length(msg)<1 or length(msg)>500 then raise exception 'invalid_message'; end if;
 if not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=auth.uid()) then raise exception 'not_room_member'; end if;
 if exists(select 1 from public.student_voice_room_feed where room_id=p_room_id and user_id=auth.uid() and kind='message' and created_at>now()-interval '700 milliseconds') then raise exception 'slow_down'; end if;
 if p_reply_to_id is not null and not exists(select 1 from public.student_voice_room_feed where id=p_reply_to_id and room_id=p_room_id and kind='message') then raise exception 'invalid_reply'; end if;
 insert into public.student_voice_room_feed(room_id,user_id,kind,message,reply_to_id) values(p_room_id,auth.uid(),'message',msg,p_reply_to_id);
end $$;

create or replace function public.student_voice_room_react_v26(p_room_id uuid,p_feed_id uuid,p_reaction text)
returns void language plpgsql security definer set search_path=public as $$
declare existing text;
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 if p_reaction not in ('❤️','👍','😂','🔥','👏') then raise exception 'invalid_reaction'; end if;
 if not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=auth.uid()) then raise exception 'not_room_member'; end if;
 if not exists(select 1 from public.student_voice_room_feed where id=p_feed_id and room_id=p_room_id and kind='message') then raise exception 'message_not_found'; end if;
 select reaction into existing from public.student_voice_room_reactions where feed_id=p_feed_id and user_id=auth.uid();
 if existing=p_reaction then
   delete from public.student_voice_room_reactions where feed_id=p_feed_id and user_id=auth.uid();
 else
   insert into public.student_voice_room_reactions(feed_id,user_id,reaction) values(p_feed_id,auth.uid(),p_reaction)
   on conflict(feed_id,user_id) do update set reaction=excluded.reaction,created_at=now();
 end if;
end $$;

create or replace function public.student_voice_room_feed_v26(p_room_id uuid,p_limit integer default 80)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from (
   select f.id,f.kind,f.user_id,coalesce(p.full_name,'مستخدم') user_name,f.target_user_id,coalesce(tp.full_name,'') target_name,
          f.message,f.gift_emoji,f.created_at,f.reply_to_id,
          coalesce(rp.full_name,'') reply_to_name,coalesce(rf.message,'') reply_to_message,
          coalesce((select jsonb_object_agg(z.reaction,z.cnt) from (select reaction,count(*)::int cnt from public.student_voice_room_reactions rr where rr.feed_id=f.id group by reaction) z),'{}'::jsonb) reactions,
          (select rr.reaction from public.student_voice_room_reactions rr where rr.feed_id=f.id and rr.user_id=auth.uid()) my_reaction
   from public.student_voice_room_feed f
   left join public.profiles p on p.id=f.user_id
   left join public.profiles tp on tp.id=f.target_user_id
   left join public.student_voice_room_feed rf on rf.id=f.reply_to_id
   left join public.profiles rp on rp.id=rf.user_id
   where f.room_id=p_room_id
     and exists(select 1 from public.student_voice_room_members mm where mm.room_id=p_room_id and mm.user_id=auth.uid())
   order by f.created_at desc limit greatest(1,least(coalesce(p_limit,80),120))
 ) x
$$;

create or replace function public.student_voice_room_background_custom_v26(p_room_id uuid,p_image_url text default null)
returns void language plpgsql security definer set search_path=public as $$
declare u text:=nullif(trim(coalesce(p_image_url,'')),'');
begin
 if auth.uid() is null then raise exception 'auth_required'; end if;
 if not exists(select 1 from public.student_voice_rooms where id=p_room_id and owner_id=auth.uid()) then raise exception 'owner_required'; end if;
 if u is not null and u !~ '^https://' then raise exception 'invalid_background_url'; end if;
 update public.student_voice_rooms set custom_background_url=u,background_id=case when u is null then background_id else null end,updated_at=now() where id=p_room_id;
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
 update public.student_voice_rooms set background_id=p_background_id,custom_background_url=null,updated_at=now() where id=p_room_id;
end $$;

create or replace function public.student_voice_room_send_gift_v26(p_room_id uuid,p_pack_id uuid,p_recipient_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 uid uuid:=auth.uid(); price integer; bal integer; enabled boolean; em text; gift_name text; room_owner uuid;
 recipient_share integer; owner_share integer; app_share integer; n integer; each_share integer; remainder integer; txid uuid;
 r record;
begin
 if uid is null then raise exception 'auth_required'; end if;
 if not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=uid) then raise exception 'not_room_member'; end if;
 select r.owner_id into room_owner from public.student_voice_rooms r where id=p_room_id and is_active=true for update;
 if room_owner is null then raise exception 'room_not_found'; end if;
 select gifts_enabled into enabled from public.student_voice_room_settings where id=1; if not enabled then raise exception 'gifts_disabled'; end if;
 select diamonds,icon_key,name into price,em,gift_name from public.student_voice_room_gift_packs where id=p_pack_id and is_active=true; if price is null then raise exception 'gift_not_found'; end if;
 if p_recipient_id=uid then raise exception 'cannot_gift_self'; end if;
 if p_recipient_id is not null and not exists(select 1 from public.student_voice_room_members where room_id=p_room_id and user_id=p_recipient_id) then raise exception 'recipient_not_in_room'; end if;
 insert into public.store_user_diamonds(user_id,balance) values(uid,0) on conflict(user_id) do nothing;
 select balance into bal from public.store_user_diamonds where user_id=uid for update;
 if bal<price then raise exception 'insufficient_diamonds'; end if;
 update public.store_user_diamonds set balance=balance-price where user_id=uid;
 recipient_share:=price/3; owner_share:=price/3; app_share:=price-recipient_share-owner_share;
 insert into public.student_voice_room_transactions(user_id,room_id,kind,diamonds,target_user_id,metadata)
 values(uid,p_room_id,'gift',price,p_recipient_id,jsonb_build_object('pack_id',p_pack_id,'scope',case when p_recipient_id is null then 'all' else 'user' end,'recipient_share',recipient_share,'owner_share',owner_share,'app_share',app_share)) returning id into txid;

 if owner_share>0 then
   insert into public.store_user_diamonds(user_id,balance) values(room_owner,owner_share)
   on conflict(user_id) do update set balance=public.store_user_diamonds.balance+excluded.balance;
   insert into public.student_voice_room_gift_distributions(transaction_id,room_id,sender_id,beneficiary_type,beneficiary_user_id,diamonds)
   values(txid,p_room_id,uid,'room_owner',room_owner,owner_share);
 end if;

 if p_recipient_id is not null then
   if recipient_share>0 then
     insert into public.store_user_diamonds(user_id,balance) values(p_recipient_id,recipient_share)
     on conflict(user_id) do update set balance=public.store_user_diamonds.balance+excluded.balance;
     insert into public.student_voice_room_gift_distributions(transaction_id,room_id,sender_id,beneficiary_type,beneficiary_user_id,diamonds)
     values(txid,p_room_id,uid,'recipient',p_recipient_id,recipient_share);
   end if;
 else
   select count(*) into n from public.student_voice_room_members where room_id=p_room_id and user_id<>uid;
   if n<=0 then raise exception 'no_recipients'; end if;
   each_share:=recipient_share/n; remainder:=recipient_share-(each_share*n); app_share:=app_share+remainder;
   if each_share>0 then
     for r in select user_id from public.student_voice_room_members where room_id=p_room_id and user_id<>uid loop
       insert into public.store_user_diamonds(user_id,balance) values(r.user_id,each_share)
       on conflict(user_id) do update set balance=public.store_user_diamonds.balance+excluded.balance;
       insert into public.student_voice_room_gift_distributions(transaction_id,room_id,sender_id,beneficiary_type,beneficiary_user_id,diamonds)
       values(txid,p_room_id,uid,'recipient',r.user_id,each_share);
     end loop;
   end if;
 end if;

 if app_share>0 then
   update public.student_app_diamond_treasury set balance=balance+app_share,updated_at=now() where id=1;
   insert into public.student_voice_room_gift_distributions(transaction_id,room_id,sender_id,beneficiary_type,beneficiary_user_id,diamonds)
   values(txid,p_room_id,uid,'app',null,app_share);
 end if;
 update public.student_voice_room_transactions
 set metadata=metadata||jsonb_build_object('recipient_share',recipient_share,'owner_share',owner_share,'app_share',app_share)
 where id=txid;
 insert into public.student_voice_room_feed(room_id,user_id,kind,target_user_id,message,gift_emoji) values(p_room_id,uid,'gift',p_recipient_id,gift_name,em);
 return jsonb_build_object('price',price,'recipient_share',recipient_share,'owner_share',owner_share,'app_share',app_share);
end $$;

create or replace function public.student_app_diamond_treasury_v26()
returns bigint language plpgsql stable security definer set search_path=public as $$
begin
 if not public.current_user_is_admin() then raise exception 'admin_required'; end if;
 return (select balance from public.student_app_diamond_treasury where id=1);
end $$;

revoke all on function public.student_voice_rooms_list_v26(text,integer),public.student_voice_room_message_v26(uuid,text,uuid),public.student_voice_room_react_v26(uuid,uuid,text),public.student_voice_room_feed_v26(uuid,integer),public.student_voice_room_background_custom_v26(uuid,text),public.student_voice_room_send_gift_v26(uuid,uuid,uuid) from public,anon;
grant execute on function public.student_voice_rooms_list_v26(text,integer),public.student_voice_room_message_v26(uuid,text,uuid),public.student_voice_room_react_v26(uuid,uuid,text),public.student_voice_room_feed_v26(uuid,integer),public.student_voice_room_background_custom_v26(uuid,text),public.student_voice_room_send_gift_v26(uuid,uuid,uuid) to authenticated;
revoke all on function public.student_app_diamond_treasury_v26() from public,anon,authenticated;
grant execute on function public.student_app_diamond_treasury_v26() to authenticated;

commit;
