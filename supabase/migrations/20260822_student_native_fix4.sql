-- Student Native FIX4 backend additions
-- Run once in Supabase SQL Editor before testing the new Native screens.
begin;

create extension if not exists pgcrypto;

-- Independent admin helper used only by this migration/policies.
create or replace function public.student_native_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = (select auth.uid()) and lower(coalesce(role,'')) = 'admin'
    );
$$;
revoke all on function public.student_native_is_admin() from public, anon;
grant execute on function public.student_native_is_admin() to authenticated;

-- Ensure verification columns used by Native exist.
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists verification_color text;
alter table public.profiles add column if not exists verified_at timestamptz;

-- Remember registration intent without granting teacher privileges.
alter table public.profiles add column if not exists requested_role text;
update public.profiles set requested_role = coalesce(requested_role, 'student') where requested_role is null;
alter table public.profiles alter column requested_role set default 'student';

create or replace function public.student_capture_requested_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.profiles
       set requested_role = case
           when lower(coalesce(new.raw_user_meta_data ->> 'requested_role','student')) = 'teacher' then 'teacher'
           else 'student'
       end
     where id = new.id;
    return new;
end;
$$;
drop trigger if exists zz_student_capture_requested_role on auth.users;
create trigger zz_student_capture_requested_role
after insert on auth.users
for each row execute function public.student_capture_requested_role();

-- Teacher requests: intent != permission. Admin approval is atomic through RPC.
create table if not exists public.teacher_verification_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    full_name text not null default '',
    subject text not null default '',
    education_stage text not null default '',
    experience text not null default '',
    note text not null default '',
    status text not null default 'pending',
    admin_note text,
    reviewed_by uuid references auth.users(id) on delete set null,
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.teacher_verification_requests add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.teacher_verification_requests add column if not exists full_name text not null default '';
alter table public.teacher_verification_requests add column if not exists subject text not null default '';
alter table public.teacher_verification_requests add column if not exists education_stage text not null default '';
alter table public.teacher_verification_requests add column if not exists experience text not null default '';
alter table public.teacher_verification_requests add column if not exists note text not null default '';
alter table public.teacher_verification_requests add column if not exists status text not null default 'pending';
alter table public.teacher_verification_requests add column if not exists admin_note text;
alter table public.teacher_verification_requests add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.teacher_verification_requests add column if not exists reviewed_at timestamptz;
alter table public.teacher_verification_requests add column if not exists created_at timestamptz not null default now();
alter table public.teacher_verification_requests add column if not exists updated_at timestamptz not null default now();
create index if not exists teacher_verification_requests_user_created_idx on public.teacher_verification_requests(user_id, created_at desc);
alter table public.teacher_verification_requests enable row level security;
drop policy if exists student_native_teacher_read on public.teacher_verification_requests;
create policy student_native_teacher_read on public.teacher_verification_requests for select to authenticated
using (user_id = (select auth.uid()) or public.student_native_is_admin());
drop policy if exists student_native_teacher_insert on public.teacher_verification_requests;
create policy student_native_teacher_insert on public.teacher_verification_requests for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists student_native_teacher_admin on public.teacher_verification_requests;
create policy student_native_teacher_admin on public.teacher_verification_requests for update to authenticated
using (public.student_native_is_admin()) with check (public.student_native_is_admin());
grant select, insert, update on public.teacher_verification_requests to authenticated;

create or replace function public.student_submit_teacher_request(
    p_full_name text,
    p_subject text,
    p_education_stage text,
    p_experience text default '',
    p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
    rid uuid;
begin
    if uid is null then raise exception 'يجب تسجيل الدخول أولًا.'; end if;
    if coalesce(trim(p_full_name),'') = '' or coalesce(trim(p_subject),'') = '' or coalesce(trim(p_education_stage),'') = '' then
        raise exception 'أكمل بيانات طلب المدرس.';
    end if;
    if exists(select 1 from public.teacher_verification_requests where user_id=uid and status='pending') then
        raise exception 'لديك طلب مدرس قيد المراجعة بالفعل.';
    end if;
    insert into public.teacher_verification_requests(user_id,full_name,subject,education_stage,experience,note,status)
    values(uid,trim(p_full_name),trim(p_subject),trim(p_education_stage),left(coalesce(p_experience,''),1000),left(coalesce(p_note,''),1000),'pending')
    returning id into rid;
    update public.profiles set requested_role='teacher' where id=uid;
    return rid;
end;
$$;
revoke all on function public.student_submit_teacher_request(text,text,text,text,text) from public, anon;
grant execute on function public.student_submit_teacher_request(text,text,text,text,text) to authenticated;

create or replace function public.student_admin_review_teacher_request(
    p_request_id uuid,
    p_approve boolean,
    p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    r public.teacher_verification_requests%rowtype;
begin
    if not public.student_native_is_admin() then raise exception 'هذه العملية للأدمن فقط.'; end if;
    select * into r from public.teacher_verification_requests where id=p_request_id for update;
    if not found then raise exception 'طلب المدرس غير موجود.'; end if;
    if r.status <> 'pending' then raise exception 'تمت مراجعة هذا الطلب مسبقًا.'; end if;

    update public.teacher_verification_requests
       set status=case when p_approve then 'approved' else 'rejected' end,
           admin_note=nullif(trim(coalesce(p_note,'')),''), reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
     where id=p_request_id;

    if p_approve then
        update public.profiles
           set role='teacher', requested_role='teacher', is_verified=true,
               verification_color='red', verified_at=coalesce(verified_at,now())
         where id=r.user_id;
    end if;
end;
$$;
revoke all on function public.student_admin_review_teacher_request(uuid,boolean,text) from public, anon;
grant execute on function public.student_admin_review_teacher_request(uuid,boolean,text) to authenticated;

-- Teachers and admins publish education content dynamically; students cannot invoke this RPC.
create or replace function public.student_publish_education_material(
    p_subject_id uuid,
    p_title text,
    p_description text default '',
    p_material_type text default 'text',
    p_external_url text default null,
    p_university_level_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
    uid uuid := auth.uid();
    user_role text;
    material_id uuid;
begin
    if uid is null then raise exception 'يجب تسجيل الدخول أولًا.'; end if;
    select lower(coalesce(role,'student')) into user_role from public.profiles where id=uid;
    if user_role not in ('teacher','admin') then raise exception 'النشر التعليمي متاح للمدرس أو الأدمن فقط.'; end if;
    if coalesce(trim(p_title),'')='' then raise exception 'عنوان الدرس مطلوب.'; end if;
    if p_material_type not in ('text','link','video','pdf') then raise exception 'نوع المحتوى غير صالح.'; end if;

    insert into public.education_materials(
        subject_id,title,description,material_type,file_url,external_url,created_by,status,education_type,university_level_id
    ) values (
        p_subject_id,trim(p_title),coalesce(p_description,''),p_material_type,null,nullif(trim(coalesce(p_external_url,'')),''),uid,'published',
        case when p_university_level_id is null then 'school' else 'university' end,p_university_level_id
    ) returning id into material_id;
    return material_id;
end;
$$;
revoke all on function public.student_publish_education_material(uuid,text,text,text,text,uuid) from public, anon;
grant execute on function public.student_publish_education_material(uuid,text,text,text,text,uuid) to authenticated;

-- Learn English: dynamic content controlled by admin.
create table if not exists public.learn_english_content (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    english_text text not null,
    arabic_text text not null default '',
    category text not null default 'عام',
    level text not null default 'all',
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.learn_english_content enable row level security;
drop policy if exists student_native_english_read on public.learn_english_content;
create policy student_native_english_read on public.learn_english_content for select to authenticated
using (is_active = true or public.student_native_is_admin());
drop policy if exists student_native_english_admin on public.learn_english_content;
create policy student_native_english_admin on public.learn_english_content for all to authenticated
using (public.student_native_is_admin()) with check (public.student_native_is_admin());
grant select, insert, update, delete on public.learn_english_content to authenticated;

-- User feedback/suggestions reaching admin.
create table if not exists public.student_feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category text not null default 'اقتراح',
    title text not null,
    body text not null,
    status text not null default 'pending',
    admin_note text,
    reviewed_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists student_feedback_user_created_idx on public.student_feedback(user_id,created_at desc);
alter table public.student_feedback enable row level security;
drop policy if exists student_native_feedback_read on public.student_feedback;
create policy student_native_feedback_read on public.student_feedback for select to authenticated
using (user_id=(select auth.uid()) or public.student_native_is_admin());
drop policy if exists student_native_feedback_insert on public.student_feedback;
create policy student_native_feedback_insert on public.student_feedback for insert to authenticated
with check (user_id=(select auth.uid()));
drop policy if exists student_native_feedback_admin on public.student_feedback;
create policy student_native_feedback_admin on public.student_feedback for update to authenticated
using (public.student_native_is_admin()) with check (public.student_native_is_admin());
grant select, insert, update on public.student_feedback to authenticated;

-- Student AI history. AI key remains only in Edge Function secret.
create table if not exists public.student_ai_messages (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check(role in ('user','assistant')),
    content text not null,
    mode text not null default 'ask' check(mode in ('ask','translate')),
    created_at timestamptz not null default now()
);
create index if not exists student_ai_messages_user_created_idx on public.student_ai_messages(user_id,created_at desc);
alter table public.student_ai_messages enable row level security;
drop policy if exists student_native_ai_own on public.student_ai_messages;
create policy student_native_ai_own on public.student_ai_messages for all to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
grant select, insert, delete on public.student_ai_messages to authenticated;

-- Normalize home_ads while preserving any existing data.
create table if not exists public.home_ads (
    id uuid primary key default gen_random_uuid(),
    title text not null default 'Student',
    body text not null default '',
    image_url text,
    action_url text,
    is_active boolean not null default true,
    starts_at timestamptz,
    ends_at timestamptz,
    sort_order integer not null default 0,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.home_ads add column if not exists title text not null default 'Student';
alter table public.home_ads add column if not exists body text not null default '';
alter table public.home_ads add column if not exists image_url text;
alter table public.home_ads add column if not exists action_url text;
alter table public.home_ads add column if not exists is_active boolean not null default true;
alter table public.home_ads add column if not exists starts_at timestamptz;
alter table public.home_ads add column if not exists ends_at timestamptz;
alter table public.home_ads add column if not exists sort_order integer not null default 0;
alter table public.home_ads add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.home_ads add column if not exists created_at timestamptz not null default now();
alter table public.home_ads add column if not exists updated_at timestamptz not null default now();
alter table public.home_ads enable row level security;
drop policy if exists student_native_home_ads_read on public.home_ads;
create policy student_native_home_ads_read on public.home_ads for select to authenticated
using (
    public.student_native_is_admin()
    or (
        is_active=true
        and (starts_at is null or starts_at<=now())
        and (ends_at is null or ends_at>=now())
    )
);
drop policy if exists student_native_home_ads_admin on public.home_ads;
create policy student_native_home_ads_admin on public.home_ads for all to authenticated
using (public.student_native_is_admin()) with check (public.student_native_is_admin());
grant select, insert, update, delete on public.home_ads to authenticated;



-- Native account blocking. Blocking is reversible and removes existing follow edges.
create table if not exists public.user_blocks (
    blocker_id uuid not null references auth.users(id) on delete cascade,
    blocked_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id),
    check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
drop policy if exists student_native_blocks_own on public.user_blocks;
create policy student_native_blocks_own on public.user_blocks for all to authenticated
using (blocker_id=(select auth.uid())) with check (blocker_id=(select auth.uid()));
grant select, insert, delete on public.user_blocks to authenticated;

create or replace function public.student_is_blocked_with(p_other_user uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
    select exists(
        select 1 from public.user_blocks
        where (blocker_id=(select auth.uid()) and blocked_id=p_other_user)
           or (blocker_id=p_other_user and blocked_id=(select auth.uid()))
    );
$$;
revoke all on function public.student_is_blocked_with(uuid) from public, anon;
grant execute on function public.student_is_blocked_with(uuid) to authenticated;

create or replace function public.student_block_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare uid uuid := auth.uid();
begin
    if uid is null then raise exception 'يجب تسجيل الدخول أولًا.'; end if;
    if p_user is null or p_user=uid then raise exception 'لا يمكن حظر هذا الحساب.'; end if;
    insert into public.user_blocks(blocker_id,blocked_id) values(uid,p_user) on conflict do nothing;
    if to_regclass('public.follows') is not null then
        delete from public.follows
        where (follower_id=uid and following_id=p_user) or (follower_id=p_user and following_id=uid);
    end if;
end;
$$;
revoke all on function public.student_block_user(uuid) from public, anon;
grant execute on function public.student_block_user(uuid) to authenticated;

create or replace function public.student_unblock_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
    delete from public.user_blocks where blocker_id=auth.uid() and blocked_id=p_user;
end;
$$;
revoke all on function public.student_unblock_user(uuid) from public, anon;
grant execute on function public.student_unblock_user(uuid) to authenticated;

-- Native messages listen to Postgres changes through Supabase Realtime.
do $$
begin
    if to_regclass('public.chat_messages') is not null
       and not exists (
          select 1 from pg_publication_tables
          where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages'
       ) then
        alter publication supabase_realtime add table public.chat_messages;
    end if;
end $$;

commit;
