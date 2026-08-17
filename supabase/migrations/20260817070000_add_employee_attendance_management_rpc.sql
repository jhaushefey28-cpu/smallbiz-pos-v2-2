create or replace function public.create_attendance_employee(
  p_business_id uuid,
  p_employee_no text,
  p_full_name text,
  p_position text default null,
  p_department text default null,
  p_hire_date date default null
)
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  created_employee public.employees;
  normalized_no text := nullif(trim(coalesce(p_employee_no,'')), '');
  normalized_name text := nullif(trim(coalesce(p_full_name,'')), '');
begin
  select * into actor
  from public.profiles
  where id = auth.uid()
    and business_id = p_business_id
    and active = true;

  if actor.id is null or actor.role not in ('owner','admin','manager') then
    raise exception 'Only Owner, Admin, or Manager can create employees.';
  end if;

  if normalized_name is null then
    raise exception 'Employee name is required.';
  end if;

  if normalized_no is not null and exists (
    select 1 from public.employees
    where business_id = p_business_id and lower(employee_no) = lower(normalized_no)
  ) then
    raise exception 'Employee No. already exists.';
  end if;

  insert into public.employees (
    business_id, employee_no, full_name, position, department,
    employment_status, active, hire_date
  ) values (
    p_business_id,
    normalized_no,
    normalized_name,
    nullif(trim(coalesce(p_position,'')), ''),
    nullif(trim(coalesce(p_department,'')), ''),
    'active', true, p_hire_date
  )
  returning * into created_employee;

  return created_employee;
end;
$$;

grant execute on function public.create_attendance_employee(uuid,text,text,text,text,date) to authenticated;