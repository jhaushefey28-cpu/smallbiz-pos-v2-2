create table if not exists public.marketplace_oauth_states (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sales_channel_id uuid not null references public.sales_channels(id) on delete cascade,
  provider text not null,
  state_hash text not null unique,
  redirect_uri text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists marketplace_oauth_states_business_idx on public.marketplace_oauth_states(business_id);
create index if not exists marketplace_oauth_states_expiry_idx on public.marketplace_oauth_states(expires_at);

alter table public.marketplace_oauth_states enable row level security;
revoke all on public.marketplace_oauth_states from anon, authenticated;

create or replace function public.cleanup_expired_marketplace_oauth_states()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  delete from public.marketplace_oauth_states where expires_at < now() or used_at is not null;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke execute on function public.cleanup_expired_marketplace_oauth_states() from public, anon, authenticated;
