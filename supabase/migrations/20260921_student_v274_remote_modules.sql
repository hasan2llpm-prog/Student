begin;

-- Remote module registry: admins can add/hide/reorder/update home modules without a new APK.
-- Targets reuse the app's safe deep-link/router grammar (messages, store, reels, rooms,
-- education, profile, community, translate, etc.) or an https:// URL.
create table if not exists public.student_remote_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique check (length(trim(module_key)) between 1 and 80),
  title text not null check (length(trim(title)) between 1 and 80),
  subtitle text null check (subtitle is null or length(subtitle) <= 180),
  icon_key text not null default 'apps' check (length(icon_key) <= 40),
  target text not null check (length(trim(target)) between 1 and 500),
  enabled boolean not null default true,
  sort_order integer not null default 100 check (sort_order between -10000 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

alter table public.student_remote_modules enable row level security;

drop policy if exists student_remote_modules_read on public.student_remote_modules;
create policy student_remote_modules_read
on public.student_remote_modules for select
to authenticated
using (enabled = true);

-- Admin writes only. The role check is server-side; ordinary users cannot mutate modules.
drop policy if exists student_remote_modules_admin_write on public.student_remote_modules;
create policy student_remote_modules_admin_write
on public.student_remote_modules for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(coalesce(p.role, '')) = 'admin'
  )
);

create index if not exists idx_student_remote_modules_enabled_sort
on public.student_remote_modules(enabled, sort_order, title);

create or replace function public.student_remote_modules_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_student_remote_modules_touch on public.student_remote_modules;
create trigger trg_student_remote_modules_touch
before update on public.student_remote_modules
for each row execute function public.student_remote_modules_touch_updated_at();

-- Safe examples. They can be edited/deleted later directly from Supabase.
insert into public.student_remote_modules(module_key, title, subtitle, icon_key, target, enabled, sort_order)
values
  ('rooms_shortcut', 'الغرف', 'غرف الصوت', 'rooms', 'rooms', true, 10),
  ('translation_shortcut', 'الترجمة', 'Student AI', 'translate', 'translate', true, 20),
  ('messages_shortcut', 'الرسائل', 'المحادثات والقنوات', 'messages', 'messages', true, 30)
on conflict (module_key) do update
set title = excluded.title,
    subtitle = excluded.subtitle,
    icon_key = excluded.icon_key,
    target = excluded.target,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;

-- Extend existing runtime config without replacing admin-customized values.
update public.student_native_runtime_config
set config = jsonb_set(
               jsonb_set(
                 jsonb_set(
                   jsonb_set(config, '{home,show_remote_modules}', coalesce(config #> '{home,show_remote_modules}', 'true'::jsonb), true),
                   '{home,remote_modules_top_space_dp}', coalesce(config #> '{home,remote_modules_top_space_dp}', '10'::jsonb), true
                 ),
                 '{home,remote_modules_padding_dp}', coalesce(config #> '{home,remote_modules_padding_dp}', '10'::jsonb), true
               ),
               '{home,remote_module_width_dp}', coalesce(config #> '{home,remote_module_width_dp}', '130'::jsonb), true
             ),
    updated_at = now()
where id = 1;

update public.student_native_runtime_config
set config = jsonb_set(config, '{home,remote_modules_refresh_seconds}', coalesce(config #> '{home,remote_modules_refresh_seconds}', '30'::jsonb), true),
    updated_at = now()
where id = 1;

commit;
