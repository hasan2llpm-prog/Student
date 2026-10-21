-- ============================================================
-- Student - TEACHER APPROVE / REJECT FIX
-- NO APK REQUIRED
-- Replaces the existing admin approval flow with a robust version.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Approve teacher request
-- Exact existing RPC name preserved for current APK.
-- ------------------------------------------------------------
create or replace function public.student_admin_approve_teacher(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path=public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  req public.teacher_verification_requests%rowtype;
  v_now timestamptz := now();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if not (
    public.current_user_is_admin()
    or public.is_student_admin()
  ) then
    raise exception 'admin_only';
  end if;

  select *
  into req
  from public.teacher_verification_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'teacher_request_not_found';
  end if;

  if lower(coalesce(req.status,'')) <> 'pending' then
    raise exception 'teacher_request_already_reviewed';
  end if;

  -- Mark request approved.
  update public.teacher_verification_requests
  set
    status = 'approved',
    rejection_reason = null,
    reviewed_by = uid,
    reviewed_at = v_now,
    updated_at = v_now
  where id = req.id;

  -- Ensure teacher profile exists and is approved/visible.
  insert into public.teacher_profiles(
    user_id,
    specialization,
    qualifications,
    experience_years,
    verification_status,
    rejection_reason,
    verified_at,
    verified_by,
    is_visible,
    is_active,
    created_at,
    updated_at
  )
  values(
    req.teacher_id,
    req.specialization,
    req.qualifications,
    coalesce(req.experience_years,0),
    'approved',
    null,
    v_now,
    uid,
    true,
    true,
    v_now,
    v_now
  )
  on conflict(user_id)
  do update set
    specialization = excluded.specialization,
    qualifications = excluded.qualifications,
    experience_years = excluded.experience_years,
    verification_status = 'approved',
    rejection_reason = null,
    verified_at = v_now,
    verified_by = uid,
    is_visible = true,
    is_active = true,
    updated_at = v_now;

  -- Convert account to teacher + red verification.
  -- Since the authenticated caller is admin, the existing profile privilege
  -- trigger should permit this trusted admin change.
  update public.profiles
  set
    role = 'teacher',
    is_verified = true,
    verification_color = 'red',
    verification_source = 'admin',
    verified_at = coalesce(verified_at, v_now)
  where id = req.teacher_id;

  -- Direct notification; do not depend on another helper RPC.
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
    values(
      req.teacher_id,
      uid,
      'تم قبول طلب المدرس',
      'تمت الموافقة على طلبك وأصبح حسابك حساب مدرس موثق في Student.',
      'teacher_approved',
      'profile',
      false,
      false,
      jsonb_build_object(
        'request_id', req.id,
        'teacher_id', req.teacher_id,
        'status', 'approved'
      ),
      v_now
    );
  end if;
end;
$$;

revoke all on function public.student_admin_approve_teacher(uuid)
from public, anon;

grant execute on function public.student_admin_approve_teacher(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 2) Reject teacher request
-- ------------------------------------------------------------
create or replace function public.student_admin_reject_teacher(
  p_request_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path=public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  req public.teacher_verification_requests%rowtype;
  v_now timestamptz := now();
  v_reason text := nullif(trim(coalesce(p_reason,'')), '');
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if not (
    public.current_user_is_admin()
    or public.is_student_admin()
  ) then
    raise exception 'admin_only';
  end if;

  select *
  into req
  from public.teacher_verification_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'teacher_request_not_found';
  end if;

  if lower(coalesce(req.status,'')) <> 'pending' then
    raise exception 'teacher_request_already_reviewed';
  end if;

  update public.teacher_verification_requests
  set
    status = 'rejected',
    rejection_reason = v_reason,
    reviewed_by = uid,
    reviewed_at = v_now,
    updated_at = v_now
  where id = req.id;

  update public.teacher_profiles
  set
    verification_status = 'rejected',
    rejection_reason = v_reason,
    is_visible = false,
    updated_at = v_now
  where user_id = req.teacher_id;

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
    values(
      req.teacher_id,
      uid,
      'تمت مراجعة طلب المدرس',
      case
        when v_reason is null then 'لم تتم الموافقة على طلب المدرس حاليًا.'
        else 'لم تتم الموافقة على طلب المدرس. السبب: ' || v_reason
      end,
      'teacher_rejected',
      'profile',
      false,
      false,
      jsonb_build_object(
        'request_id', req.id,
        'teacher_id', req.teacher_id,
        'status', 'rejected',
        'reason', v_reason
      ),
      v_now
    );
  end if;
end;
$$;

revoke all on function public.student_admin_reject_teacher(uuid,text)
from public, anon;

grant execute on function public.student_admin_reject_teacher(uuid,text)
to authenticated;


-- ------------------------------------------------------------
-- 3) Compatibility review RPC for APK variants
-- ------------------------------------------------------------
create or replace function public.student_admin_review_teacher_request(
  p_request_id uuid,
  p_approve boolean,
  p_reason text default null
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
    perform public.student_admin_reject_teacher(p_request_id,p_reason);
  end if;
end;
$$;

revoke all on function public.student_admin_review_teacher_request(uuid,boolean,text)
from public, anon;

grant execute on function public.student_admin_review_teacher_request(uuid,boolean,text)
to authenticated;

notify pgrst, 'reload schema';

commit;

-- Verification
select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'student_admin_approve_teacher',
    'student_admin_reject_teacher',
    'student_admin_review_teacher_request'
  )
order by p.proname;
