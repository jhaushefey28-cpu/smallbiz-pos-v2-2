alter table public.attendance
  add column if not exists photo_data text;

alter table public.attendance
  drop constraint if exists attendance_photo_data_size_check;

alter table public.attendance
  add constraint attendance_photo_data_size_check
  check (photo_data is null or length(photo_data) <= 300000);

drop function if exists public.list_attendance(uuid,date,date);

create function public.list_attendance(
  p_business_id uuid,
  p_start_date date default current_date,
  p_end_date date default current_date
)
returns table(
  id uuid,
  employee_id uuid,
  employee_no text,
  employee_name text,
  branch_id uuid,
  attendance_date date,
  time_in timestamptz,
  time_out timestamptz,
  regular_hours numeric,
  overtime_hours numeric,
  status text,
  recognition_method text,
  recognition_distance numeric,
  liveness_score numeric,
  device_id text,
  photo_data text
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.employee_id,
    e.employee_no,
    e.full_name,
    a.branch_id,
    a.attendance_date,
    a.time_in,
    a.time_out,
    a.regular_hours,
    a.overtime_hours,
    a.status,
    a.recognition_method,
    a.recognition_distance,
    a.liveness_score,
    a.device_id,
    a.photo_data
  from public.attendance a
  join public.employees e on e.id = a.employee_id
  where a.business_id = p_business_id
    and a.attendance_date between p_start_date and p_end_date
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.business_id = p_business_id
        and p.active = true
        and lower(coalesce(p.role,'')) in ('owner','admin','manager')
    )
  order by a.attendance_date desc, a.time_in desc;
$$;

grant execute on function public.list_attendance(uuid,date,date) to authenticated;

drop function if exists public.record_face_attendance(uuid,vector,text,numeric,uuid,text);

create function public.record_face_attendance(
  p_business_id uuid,
  p_face_embedding vector,
  p_action text,
  p_liveness_score numeric default null,
  p_branch_id uuid default null,
  p_device_id text default null,
  p_photo_data text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_employee_id uuid;
  v_employee_name text;
  v_distance numeric;
  v_attendance_id uuid;
  v_now timestamptz := now();
  v_date date := current_date;
  v_action text := lower(trim(p_action));
  v_existing public.attendance%rowtype;
  v_hours numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select lower(coalesce(role,'')) into v_role
  from public.profiles
  where id = auth.uid() and business_id = p_business_id and active = true;
  if v_role is null then raise exception 'Unauthorized business access'; end if;
  if p_face_embedding is null then raise exception 'Face embedding is required'; end if;
  if v_action not in ('time_in','time_out') then raise exception 'Action must be time_in or time_out'; end if;
  if p_liveness_score is null or p_liveness_score < 0.80 then raise exception 'Liveness verification failed'; end if;
  if p_photo_data is not null and length(p_photo_data) > 300000 then raise exception 'Attendance photo is too large'; end if;
  if p_branch_id is not null and not exists(
    select 1 from public.business_branches where id=p_branch_id and business_id=p_business_id and active=true
  ) then raise exception 'Invalid branch'; end if;

  select ef.employee_id,e.full_name,(ef.face_embedding <=> p_face_embedding)::numeric
  into v_employee_id,v_employee_name,v_distance
  from public.employee_face_profiles ef
  join public.employees e on e.id=ef.employee_id and e.business_id=ef.business_id and e.active=true
  where ef.business_id=p_business_id and ef.active=true
  order by ef.face_embedding <=> p_face_embedding
  limit 1;
  if v_employee_id is null then raise exception 'No enrolled face found'; end if;
  if v_distance > 0.45 then raise exception 'Face not recognized'; end if;

  select * into v_existing
  from public.attendance
  where business_id=p_business_id and employee_id=v_employee_id and attendance_date=v_date
  for update;

  if v_action='time_in' then
    if found and v_existing.time_in is not null and v_existing.time_out is null then
      update public.attendance
      set photo_data=coalesce(p_photo_data, photo_data),
          recognition_method='face',
          recognition_distance=v_distance,
          liveness_score=p_liveness_score,
          device_id=p_device_id,
          verified_at=v_now,
          updated_at=v_now
      where id=v_existing.id;
      return jsonb_build_object('success',true,'already_recorded',true,'action','time_in','employee_id',v_employee_id,'employee_name',v_employee_name,'attendance_id',v_existing.id,'time_in',v_existing.time_in,'distance',v_distance);
    end if;
    if found and v_existing.time_out is not null then raise exception 'Attendance for today is already completed'; end if;
    insert into public.attendance(
      business_id,employee_id,branch_id,attendance_date,time_in,status,recognition_method,
      recognition_distance,liveness_score,device_id,verified_at,photo_data
    ) values(
      p_business_id,v_employee_id,p_branch_id,v_date,v_now,'present','face',v_distance,
      p_liveness_score,p_device_id,v_now,p_photo_data
    ) returning id into v_attendance_id;
    return jsonb_build_object('success',true,'action','time_in','employee_id',v_employee_id,'employee_name',v_employee_name,'attendance_id',v_attendance_id,'time_in',v_now,'distance',v_distance);
  end if;

  if not found or v_existing.time_in is null then raise exception 'No time-in record found for today'; end if;
  if v_existing.time_out is not null then
    update public.attendance
    set photo_data=coalesce(p_photo_data, photo_data),
        recognition_distance=v_distance,
        liveness_score=p_liveness_score,
        device_id=p_device_id,
        verified_at=v_now,
        updated_at=v_now
    where id=v_existing.id;
    return jsonb_build_object('success',true,'already_recorded',true,'action','time_out','employee_id',v_employee_id,'employee_name',v_employee_name,'attendance_id',v_existing.id,'time_out',v_existing.time_out,'distance',v_distance);
  end if;

  v_hours:=round(extract(epoch from (v_now-v_existing.time_in))/3600.0,2);
  update public.attendance
  set time_out=v_now,
      regular_hours=least(v_hours,8),
      overtime_hours=greatest(v_hours-8,0),
      recognition_method='face',
      recognition_distance=v_distance,
      liveness_score=p_liveness_score,
      device_id=p_device_id,
      verified_at=v_now,
      updated_at=v_now,
      photo_data=coalesce(p_photo_data, photo_data)
  where id=v_existing.id
  returning id into v_attendance_id;

  return jsonb_build_object(
    'success',true,'action','time_out','employee_id',v_employee_id,'employee_name',v_employee_name,
    'attendance_id',v_attendance_id,'time_in',v_existing.time_in,'time_out',v_now,
    'regular_hours',least(v_hours,8),'overtime_hours',greatest(v_hours-8,0),'distance',v_distance
  );
end;
$$;

grant execute on function public.record_face_attendance(uuid,vector,text,numeric,uuid,text,text) to authenticated;
