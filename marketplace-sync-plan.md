# Marketplace Order Sync Foundation

## Scope

This milestone documents the existing marketplace architecture and the safe implementation boundary for live order ingestion. It does not create duplicate fulfillment, inventory, SKU mapping, or cashier-shift functionality.

## Existing reusable flow

Marketplace channel -> external_orders -> external_order_items -> product_channel_mappings -> stock reservation -> existing fulfillment -> inventory/sales/COGS.

## Required sync stages

1. Authenticate the configured marketplace connection.
2. Fetch orders using the marketplace's supported API/webhook mechanism.
3. Normalize each order into the existing `external_orders` shape.
4. Normalize line items into `external_order_items`.
5. Resolve marketplace SKUs through `product_channel_mappings`.
6. Upsert idempotently using the existing external order identity.
7. Reserve stock through the existing reservation RPC only when the order reaches the existing reservable state.
8. Let the existing fulfillment RPC perform physical stock deduction and sales/COGS creation.
9. Record sync failures without corrupting existing POS/inventory data.

## No-cost validation stage

`marketplace-mock-provider.js` provides deterministic demo orders and an idempotency key without calling Shopee, Lazada, TikTok, or any paid provider. It is a test/demo fixture only; it does not write to Supabase and contains no credentials. The live adapter must remain responsible for fetching, authorization, normalization, and persistence.

## Non-goals

- No duplicate marketplace fulfillment component.
- No duplicate SKU mapping table.
- No duplicate stock reservation engine.
- No changes to Cashier Shift.
- No live marketplace credentials stored in frontend code.
- No unofficial marketplace scraping or API workarounds.

## Implementation gate

Before enabling a live marketplace connector, verify its current API authentication, webhook/order endpoint, rate limits, payload format, and required credentials. Each connector should be implemented behind a server-side Edge Function with JWT/authentication and secrets stored in Supabase/Vercel environment configuration, not in the client bundle.
