-- ============================================================
-- Student - TEACHER APPLICATION APK COMPATIBILITY FIX
-- NO APK REQUIRED
--
-- Exact RPC signature requested by current APK:
-- student_submit_teacher_request(
--   p_education_stage,
--   p_experience,
--   p_full_name,
--   p_note,
--   p_subject
-- )
-- ============================================================

begin;

-- Keep the previous newer overload intact.
-- Add the exact overload required by the installed APK.
create or replace function public.student_submit_teacher_request(
  p_education_stage text,
  p_experience text,
  p_full_name text,
  p_note text,
  p_subject text
)
returns uuid
language plpgsql
security definer
set search_path=public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  rid uuid;
  v_experience integer := 0;
  v_name text;
  v_stage text := nullif(trim(coalesce(p_education_stage,'')), '');
  v_subject text := nullif(trim(coalesce(p_subject,'')), '');
  v_note text := nullif(trim(coalesce(p_note,'')), '');
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  v_name := nullif(trim(coalesce(p_full_name,'')), '');

  if v_name is null then
    raise exception 'full_name_required';
  end if;

  if v_subject is null then
    raise exception 'subject_required';
  end if;

  begin
    v_experience := greatest(0, least(80, trim(coalesce(p_experience,'0'))::integer));
  exception when others then
    raise exception 'invalid_experience';
  end;

  if exists (
    select 1
    from public.teacher_verification_requests
    where teacher_id = uid
      and status = 'pending'
  ) then
    raise exception 'teacher_request_pending';
  end if;

  -- Keep profile name synchronized with the submitted teacher name only
  -- when a valid profile already exists.
  update public.profiles
  set full_name = v_name
  where id = uid;

  -- Create/update the teacher profile.
  insert into public.teacher_profiles(
    user_id,
    specialization,
    bio,
    qualifications,
    experience_years,
    verification_status,
    rejection_reason,
    is_visible,
    is_active,
    updated_at
  )
  values(
    uid,
    v_subject,
    v_note,
    v_stage,
    v_experience,
    'pending',
    null,
    false,
    true,
    now()
  )
  on conflict(user_id)
  do update set
    specialization = excluded.specialization,
    bio = excluded.bio,
    qualifications = excluded.qualifications,
    experience_years = excluded.experience_years,
    verification_status = 'pending',
    rejection_reason = null,
    is_visible = false,
    is_active = true,
    updated_at = now();

  -- Create the actual admin-review request.
  insert into public.teacher_verification_requests(
    teacher_id,
    specialization,
    qualifications,
    experience_years,
    document_url,
    notes,
    status,
    rejection_reason,
    reviewed_by,
    reviewed_at,
    created_at,
    updated_at
  )
  values(
    uid,
    v_subject,
    v_stage,
    v_experience,
    null,
    v_note,
    'pending',
    null,
    null,
    null,
    now(),
    now()
  )
  returning id into rid;

  -- Notify admins directly.
  if to_regclass('public.notifications') is not null then
    insert into public.notifications(
      user_id,
      actor_id,
      title,
      body,
      kind,
      link,
      is_broadcast,
      is_read,
      metadata,
      created_at
    )
    select
      p.id,
      uid,
      'طلب مدرس جديد',
      v_name || ' — ' || v_subject ||
      case when v_stage is not null then ' — ' || v_stage else '' end,
      'teacher_request',
      'admin/teacher-requests',
      false,
      false,
      jsonb_build_object(
        'request_id', rid,
        'teacher_id', uid,
        'full_name', v_name,
        'subject', v_subject,
        'education_stage', v_stage,
        'experience', v_experience,
        'note', v_note
      ),
      now()
    from public.profiles p
    where lower(coalesce(p.role,'')) = 'admin';
  end if;

  return rid;
end;
$$;

revoke all on function public.student_submit_teacher_request(text,text,text,text,text)
from public, anon;

grant execute on function public.student_submit_teacher_request(text,text,text,text,text)
to authenticated;

-- Ask PostgREST to reload its schema cache immediately.
notify pgrst, 'reload schema';

commit;

-- Verify the exact APK-compatible signature now exists.
select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'student_submit_teacher_request'
order by pg_get_function_arguments(p.oid);
