-- Marketplace connection foundation: keep connection state compatible with the UI
-- and allow the same marketplace channel to be connected by multiple businesses.
--
-- The live database has already received this migration. The IF EXISTS guards make
-- this file safe to replay when the repository is used to provision another environment.

ALTER TABLE public.channel_connections
  DROP CONSTRAINT IF EXISTS channel_connections_channel_uk;

ALTER TABLE public.channel_connections
  DROP CONSTRAINT IF EXISTS channel_connections_status_ck;

-- The intended tenant-scoped uniqueness is already represented by this index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_connections_business_channel
  ON public.channel_connections (business_id, sales_channel_id);

-- Keep the supported connection states explicit, including the state used by the
-- existing Marketplace Connections UI during authorization setup.
ALTER TABLE public.channel_connections
  DROP CONSTRAINT IF EXISTS channel_connections_connection_status_check;

ALTER TABLE public.channel_connections
  ADD CONSTRAINT channel_connections_connection_status_check
  CHECK (connection_status = ANY (ARRAY[
    'not_connected'::text,
    'pending_authorization'::text,
    'connected'::text,
    'expired'::text,
    'error'::text
  ]));
