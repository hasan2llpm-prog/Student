-- Student v1.5 Beta stability + room administration + Ask AI
create extension if not exists pgcrypto;

alter table if exists public.student_social_rooms add column if not exists username text;
create unique index if not exists student_social_rooms_username_uidx
on public.student_social_rooms ((lower(username))) where username is not null and btrim(username) <> '';

create or replace function public.student_room_admin_required(p_room uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.student_social_room_members where room_id=p_room and user_id=auth.uid() and member_role in ('owner','admin'));
$$;
grant execute on function public.student_room_admin_required(uuid) to authenticated;

create or replace function public.student_update_social_room(p_room uuid,p_name text,p_username text,p_description text,p_avatar_url text,p_public boolean)
returns void language plpgsql security definer set search_path=public as $$
declare uname text:=lower(trim(both '@' from coalesce(p_username,'')));
begin
 if not public.student_room_admin_required(p_room) then raise exception 'room_admin_required'; end if;
 if length(trim(coalesce(p_name,'')))<2 then raise exception 'room_name_required'; end if;
 if uname<>'' and uname !~ '^[a-z0-9_]{3,30}$' then raise exception 'room_username_invalid'; end if;
 update public.student_social_rooms set
   name=left(trim(p_name),100), username=nullif(uname,''), description=left(coalesce(p_description,''),1000),
   avatar_url=nullif(trim(coalesce(p_avatar_url,'')),''), is_public=coalesce(p_public,true), updated_at=now()
 where id=p_room;
end; $$;
grant execute on function public.student_update_social_room(uuid,text,text,text,text,boolean) to authenticated;

create or replace function public.student_set_social_room_member_role(p_room uuid,p_username text,p_role text)
returns void language plpgsql security definer set search_path=public as $$
declare target uuid; caller_role text;
begin
 select member_role into caller_role from public.student_social_room_members where room_id=p_room and user_id=auth.uid();
 if caller_role not in ('owner','admin') then raise exception 'room_admin_required'; end if;
 if lower(p_role) not in ('admin','member') then raise exception 'role_invalid'; end if;
 select id into target from public.profiles where lower(username)=lower(trim(both '@' from trim(p_username))) limit 1;
 if target is null then raise exception 'user_not_found'; end if;
 if exists(select 1 from public.student_social_room_members where room_id=p_room and user_id=target and member_role='owner') then raise exception 'owner_role_locked'; end if;
 update public.student_social_room_members set member_role=lower(p_role) where room_id=p_room and user_id=target;
 if not found then raise exception 'user_not_room_member'; end if;
end; $$;
grant execute on function public.student_set_social_room_member_role(uuid,text,text) to authenticated;

create or replace function public.student_remove_social_room_member(p_room uuid,p_username text)
returns void language plpgsql security definer set search_path=public as $$
declare target uuid; caller_role text;
begin
 select member_role into caller_role from public.student_social_room_members where room_id=p_room and user_id=auth.uid();
 if caller_role<>'owner' then raise exception 'room_owner_required'; end if;
 select id into target from public.profiles where lower(username)=lower(trim(both '@' from trim(p_username))) limit 1;
 if target is null then raise exception 'user_not_found'; end if;
 if target=auth.uid() then raise exception 'owner_cannot_remove_self'; end if;
 delete from public.student_social_room_members where room_id=p_room and user_id=target;
end; $$;
grant execute on function public.student_remove_social_room_member(uuid,text) to authenticated;

create or replace function public.student_transfer_social_room_ownership(p_room uuid,p_username text)
returns void language plpgsql security definer set search_path=public as $$
declare target uuid; old_owner uuid:=auth.uid();
begin
 if not exists(select 1 from public.student_social_rooms where id=p_room and owner_id=old_owner) then raise exception 'room_owner_required'; end if;
 select id into target from public.profiles where lower(username)=lower(trim(both '@' from trim(p_username))) limit 1;
 if target is null then raise exception 'user_not_found'; end if;
 if not exists(select 1 from public.student_social_room_members where room_id=p_room and user_id=target) then raise exception 'target_must_be_member'; end if;
 update public.student_social_room_members set member_role='member' where room_id=p_room and user_id=old_owner;
 update public.student_social_room_members set member_role='owner' where room_id=p_room and user_id=target;
 update public.student_social_rooms set owner_id=target,updated_at=now() where id=p_room;
end; $$;
grant execute on function public.student_transfer_social_room_ownership(uuid,text) to authenticated;

create table if not exists public.student_ai_settings(
 id integer primary key default 1 check(id=1),
 is_enabled boolean not null default true,
 free_daily_limit integer not null default 20 check(free_daily_limit>=0),
 free_model text not null default 'openrouter/free',
 updated_at timestamptz not null default now()
);
insert into public.student_ai_settings(id,is_enabled,free_daily_limit,free_model)
values(1,true,20,'openrouter/free') on conflict(id) do update set is_enabled=true;

create table if not exists public.student_ai_usage(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 mode text not null default 'ask',
 created_at timestamptz not null default now()
);
create index if not exists student_ai_usage_user_day_idx on public.student_ai_usage(user_id,created_at desc);
alter table public.student_ai_usage enable row level security;
drop policy if exists student_ai_usage_read_own on public.student_ai_usage;
create policy student_ai_usage_read_own on public.student_ai_usage for select to authenticated using(user_id=auth.uid());
grant select on public.student_ai_usage to authenticated;
grant select on public.student_ai_settings to authenticated;

insert into public.student_feature_controls(feature_key,enabled) values('ask_ai',true)
on conflict(feature_key) do update set enabled=excluded.enabled;
