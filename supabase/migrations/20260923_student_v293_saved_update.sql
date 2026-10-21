begin;

-- v2.9.3: Repair missing remote module registry independently of older migrations.
-- Existing v2.9.2 student_saved_items and RPCs must already be installed.
create table if not exists public.student_remote_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique check (length(trim(module_key)) between 1 and 80),
  title text not null check (length(trim(title)) between 1 and 80),
  subtitle text check (subtitle is null or length(subtitle) <= 180),
  icon_key text not null default 'apps' check (length(icon_key) <= 40),
  target text not null check (length(trim(target)) between 1 and 500),
  enabled boolean not null default true,
  sort_order integer not null default 100 check (sort_order between -10000 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_student_remote_modules_enabled_sort
  on public.student_remote_modules(enabled, sort_order, title);

alter table public.student_remote_modules enable row level security;

drop policy if exists student_remote_modules_read on public.student_remote_modules;
create policy student_remote_modules_read on public.student_remote_modules
for select to authenticated using(enabled = true);

drop policy if exists student_remote_modules_admin_write on public.student_remote_modules;
create policy student_remote_modules_admin_write on public.student_remote_modules
for all to authenticated
using(public.current_user_is_admin())
with check(public.current_user_is_admin());

grant select on public.student_remote_modules to authenticated;

-- Local menu access is available immediately on v2.9.3.
-- Keep the remote Home shortcut disabled during mixed-version rollout:
-- v2.9.2 cannot route 'saved', while v2.9.3 can. Admin may enable later.
insert into public.student_remote_modules
  (module_key,title,subtitle,icon_key,target,enabled,sort_order)
values
  ('saved_shortcut','المحفوظات','راجع الكلمات والدروس والعناصر المحفوظة',
   'saved','saved',false,15)
on conflict(module_key) do update set
  title=excluded.title,
  subtitle=excluded.subtitle,
  icon_key=excluded.icon_key,
  target=excluded.target,
  sort_order=excluded.sort_order,
  updated_at=now();

commit;

-- AFTER most users install versionCode 43 or later, enable the optional Home tile:
-- update public.student_remote_modules set enabled=true, updated_at=now()
-- where module_key='saved_shortcut';
