-- ============================================================
-- Student - TEACHER ADMIN BUTTON APK SIGNATURE FIX
-- NO APK REQUIRED
--
-- Current APK calls exactly:
-- student_admin_review_teacher_request(
--   p_request_id,
--   p_approve,
--   p_note
-- )
-- ============================================================

begin;

-- PostgreSQL does not allow renaming an input parameter with CREATE OR REPLACE,
-- so drop only this compatibility wrapper and recreate it with the exact APK names.
drop function if exists public.student_admin_review_teacher_request(uuid, boolean, text);

create function public.student_admin_review_teacher_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path=public, pg_temp
as $$
begin
  if coalesce(p_approve,false) then
    perform public.student_admin_approve_teacher(p_request_id);
  else
    perform public.student_admin_reject_teacher(
      p_request_id,
      nullif(trim(coalesce(p_note,'')), '')
    );
  end if;
end;
$$;

revoke all on function public.student_admin_review_teacher_request(uuid,boolean,text)
from public, anon;

grant execute on function public.student_admin_review_teacher_request(uuid,boolean,text)
to authenticated;

-- Force PostgREST/Supabase to refresh the RPC schema cache.
notify pgrst, 'reload schema';

commit;

-- Verify exact names expected by the installed APK.
select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='student_admin_review_teacher_request';
