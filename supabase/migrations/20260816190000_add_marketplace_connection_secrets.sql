create table if not exists public.marketplace_connection_secrets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  channel_connection_id uuid not null unique references public.channel_connections(id) on delete cascade,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_type text,
  scope text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_connection_secrets_business_id
  on public.marketplace_connection_secrets(business_id);

alter table public.marketplace_connection_secrets enable row level security;
revoke all on public.marketplace_connection_secrets from anon, authenticated;

drop policy if exists marketplace_connection_secrets_no_client_access on public.marketplace_connection_secrets;

create or replace function public.touch_marketplace_connection_secrets_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_marketplace_connection_secrets_updated_at on public.marketplace_connection_secrets;
create trigger trg_marketplace_connection_secrets_updated_at
before update on public.marketplace_connection_secrets
for each row execute function public.touch_marketplace_connection_secrets_updated_at();
