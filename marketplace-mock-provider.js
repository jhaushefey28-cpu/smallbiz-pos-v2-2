// No-cost marketplace sync fixture/provider used for local/demo validation only.
// It deliberately has no network, Supabase, or marketplace credentials.
// Live providers must normalize into the same shape before writing to external_orders.

const DEMO_PREFIX = "SB-DEMO-";

export function buildMockMarketplaceOrder({
  businessId,
  channelCode = "shopee",
  productId = null,
  sku = "DEMO-SKU-001",
  productName = "Demo Marketplace Product",
  quantity = 2,
  unitPrice = 250,
  sequence = 1,
} = {}) {
  if (!businessId) throw new Error("businessId is required");
  const qty = Math.max(1, Number(quantity) || 1);
  const price = Math.max(0, Number(unitPrice) || 0);
  const externalOrderNo = `${DEMO_PREFIX}${String(channelCode).toUpperCase()}-${String(sequence).padStart(4, "0")}`;

  return {
    order: {
      business_id: businessId,
      external_order_no: externalOrderNo,
      customer_name: "Demo Customer",
      payment_method: "cod",
      subtotal: qty * price,
      discount: 0,
      platform_fee: 0,
      shipping_fee: 0,
      total: qty * price,
      order_status: "unpaid",
      fulfillment_status: "new",
      ordered_at: new Date().toISOString(),
      source: "mock",
    },
    items: [
      {
        product_id: productId,
        external_sku: sku,
        external_product_id: `DEMO-PRODUCT-${String(sequence).padStart(4, "0")}`,
        product_name: productName,
        quantity: qty,
        unit_price: price,
        line_total: qty * price,
      },
    ],
    idempotencyKey: `${businessId}:${channelCode}:${externalOrderNo}`,
  };
}

export function isMockMarketplaceOrder(orderNo) {
  return String(orderNo || "").startsWith(DEMO_PREFIX);
}

export function normalizeMockMarketplaceBatch({ businessId, channelCode = "shopee", products = [] } = {}) {
  const product = products[0] || {};
  return [
    buildMockMarketplaceOrder({
      businessId,
      channelCode,
      productId: product.id || null,
      sku: product.sku || "DEMO-SKU-001",
      productName: product.name || "Demo Marketplace Product",
      quantity: 2,
      unitPrice: Number(product.price || 250),
      sequence: 1,
    }),
    buildMockMarketplaceOrder({
      businessId,
      channelCode,
      productId: product.id || null,
      sku: product.sku || "DEMO-SKU-001",
      productName: product.name || "Demo Marketplace Product",
      quantity: 1,
      unitPrice: Number(product.price || 250),
      sequence: 2,
    }),
  ];
}
